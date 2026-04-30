// create-fortnox-invoice
// -----------------------
// Pushes an accepted Quotly quote into the firm's Fortnox as a draft
// invoice (Sent: false). Triggered manually from the QuoteDetail
// "Skicka till Fortnox" button — never on quote acceptance, since
// accidental invoices are painful to undo.
//
// Flow:
//   1. Auth caller → resolve company → load quote (RLS-scoped).
//   2. Refuse if quote isn't accepted, or has already been synced.
//   3. Get a fresh Fortnox access_token (refreshes if near expiry).
//   4. Find or create the Fortnox Customer for this quote's customer.
//   5. Build invoice rows from quote_items + their child quote_item_materials.
//   6. POST /3/invoices with Sent: false → save the returned
//      DocumentNumber on the quote row so it's idempotent next time.
//
// Field shapes follow Fortnox v3 docs (developer.fortnox.se). Marked
// TODO(fortnox-spike) where the exact JSON layout needs to be verified
// against a live test environment before going to prod.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  authenticate,
  corsHeaders,
  jsonResponse,
} from "../_shared/auth.ts";
import {
  fortnoxFetch,
  getAccessToken,
} from "../_shared/fortnox.ts";

const FUNCTION_NAME = "create-fortnox-invoice";

type Payload = { quoteId: string };

// ROT type per trade. Fortnox's HouseWorkType enum drives which Skatteverket
// code the labor rows are tagged with. Verify enum strings against current
// Fortnox docs in the spike — these are best-guess defaults.
// TODO(fortnox-spike): confirm exact HouseWorkType strings.
const ROT_TYPE_BY_TRADE: Record<string, string> = {
  bygg: "CONSTRUCTION",
  el: "ELECTRICITY",
  vvs: "HVAC",
  general: "CONSTRUCTION",
};

// Quotly stores labor + materials together in one quote_item. Heuristic
// borrowed from Analytics.tsx: a row's labor is the part billed for time
// (item.unit_price when description matches "arbet*"), materials are the
// children rows.
function isLaborDescription(description: string | null | undefined): boolean {
  return !!description && description.toLowerCase().includes("arbet");
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const auth = await authenticate(req, FUNCTION_NAME);
    if (!auth.ok) return auth.response;
    const { authClient, adminClient, userId } = auth;

    const { quoteId }: Payload = await req.json();
    if (!quoteId) {
      return jsonResponse({ error: "Saknar quoteId." }, 400);
    }

    // Membership lookup so we know which company the connection belongs to.
    const { data: membership, error: membershipError } = await authClient
      .from("company_memberships")
      .select("company_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (membershipError || !membership) {
      return jsonResponse({ error: "Inget företag kopplat till kontot." }, 404);
    }

    // Quote lookup is RLS-scoped — non-members can't sync someone else's
    // quote even with a guessed UUID.
    const { data: quote, error: quoteError } = await authClient
      .from("quotes")
      .select(`
        id, status, customer_name, customer_email, customer_phone,
        customer_address, valid_until, notes, trade,
        rot_eligible, rot_discount_amount, customer_rot_remaining_at_quote,
        fortnox_invoice_number, fortnox_synced_at,
        quote_items(
          id, description, quantity, unit_price, vat_rate, sort_order,
          quote_item_materials(id, name, quantity, unit_price, unit, vat_rate)
        )
      `)
      .eq("id", quoteId)
      .single();

    if (quoteError || !quote) {
      return jsonResponse({ error: "Kunde inte hitta offerten." }, 404);
    }

    if (quote.status !== "accepted") {
      return jsonResponse(
        { error: "Endast accepterade offerter kan skickas till Fortnox." },
        400,
      );
    }

    if (quote.fortnox_invoice_number) {
      return jsonResponse(
        {
          error: `Offerten är redan synkad till Fortnox (#${quote.fortnox_invoice_number}).`,
        },
        409,
      );
    }

    const accessToken = await getAccessToken(adminClient, membership.company_id);

    // ────────── 1. Customer find-or-create ──────────
    // Fortnox customer matching: prefer email, fall back to creating a new
    // customer record. Customer numbers are Fortnox-assigned strings.
    // TODO(fortnox-spike): Verify the exact filter syntax for /3/customers.
    let customerNumber: string | null = null;

    if (quote.customer_email) {
      const lookupRes = await fortnoxFetch(
        accessToken,
        `/customers?email=${encodeURIComponent(quote.customer_email)}`,
      );
      const lookupJson = await lookupRes.json();
      const candidates = lookupJson?.Customers ?? [];
      if (candidates.length > 0) {
        customerNumber = candidates[0]?.CustomerNumber ?? null;
      }
    }

    if (!customerNumber) {
      // Create a new private customer in Fortnox. Type "PRIVATE" matches
      // homeowners who buy ROT-eligible work; firms would be "COMPANY".
      // Quotly's customer model doesn't currently distinguish, so default
      // to PRIVATE and let the user adjust in Fortnox if needed.
      // TODO(fortnox-spike): expose a Type toggle on the quote when we have
      // real users billing both private and corporate customers.
      const createRes = await fortnoxFetch(accessToken, "/customers", {
        method: "POST",
        body: JSON.stringify({
          Customer: {
            Name: quote.customer_name,
            Email: quote.customer_email ?? undefined,
            Phone1: quote.customer_phone ?? undefined,
            Address1: quote.customer_address ?? undefined,
            CountryCode: "SE",
            Type: "PRIVATE",
          },
        }),
      });
      const createJson = await createRes.json();
      customerNumber = createJson?.Customer?.CustomerNumber ?? null;
      if (!customerNumber) {
        return jsonResponse(
          { error: "Fortnox returnerade inget CustomerNumber vid skapande." },
          502,
        );
      }
    }

    // ────────── 2. Build invoice rows ──────────
    // One row per quote_item (the labor / line description) + one row per
    // material child. Material rows are non-ROT-eligible by definition.
    const houseWorkType = quote.rot_eligible
      ? ROT_TYPE_BY_TRADE[quote.trade ?? "general"] ?? "CONSTRUCTION"
      : null;

    type InvoiceRow = {
      Description: string;
      DeliveredQuantity: string;
      Price: number;
      VAT: number;
      Unit?: string;
      HouseWork?: boolean;
      HouseWorkType?: string;
      HouseWorkHoursToReport?: number;
    };

    const rows: InvoiceRow[] = [];
    const items = (quote.quote_items ?? []).slice().sort(
      (a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
    );

    for (const item of items) {
      const itemIsLabor = isLaborDescription(item.description);
      // Parent row: typically the labor / "arbete" line.
      if (item.unit_price > 0) {
        rows.push({
          Description: item.description ?? "Arbete",
          DeliveredQuantity: String(item.quantity ?? 1),
          Price: Number(item.unit_price),
          VAT: Number(item.vat_rate ?? 25),
          HouseWork: !!(quote.rot_eligible && itemIsLabor),
          HouseWorkType:
            quote.rot_eligible && itemIsLabor && houseWorkType
              ? houseWorkType
              : undefined,
        });
      }
      for (const mat of (item.quote_item_materials ?? [])) {
        rows.push({
          Description: mat.name ?? "Material",
          DeliveredQuantity: String(mat.quantity ?? 1),
          Price: Number(mat.unit_price ?? 0),
          VAT: Number(mat.vat_rate ?? item.vat_rate ?? 25),
          Unit: mat.unit ?? undefined,
          HouseWork: false,
        });
      }
    }

    if (rows.length === 0) {
      return jsonResponse(
        { error: "Offerten har inga rader att fakturera." },
        400,
      );
    }

    // ────────── 3. POST the invoice ──────────
    const invoiceDate = new Date().toISOString().slice(0, 10);
    const dueDate = quote.valid_until
      ? new Date(quote.valid_until).toISOString().slice(0, 10)
      : new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);

    // TODO(fortnox-spike): Confirm InvoiceType ("INVOICE" / "CASHINVOICE")
    // and whether DueDate is required for drafts.
    const invoicePayload: Record<string, unknown> = {
      Invoice: {
        CustomerNumber: customerNumber,
        InvoiceDate: invoiceDate,
        DueDate: dueDate,
        InvoiceType: "INVOICE",
        Sent: false,
        Comments: quote.notes ?? undefined,
        InvoiceRows: rows,
        ...(quote.rot_eligible
          ? { HouseWork: true }
          : {}),
      },
    };

    const invoiceRes = await fortnoxFetch(accessToken, "/invoices", {
      method: "POST",
      body: JSON.stringify(invoicePayload),
    });
    const invoiceJson = await invoiceRes.json();
    const documentNumber = invoiceJson?.Invoice?.DocumentNumber;

    if (!documentNumber) {
      return jsonResponse(
        { error: "Fortnox returnerade inget DocumentNumber." },
        502,
      );
    }

    // ────────── 4. Persist sync state on the quote ──────────
    const { error: updateError } = await adminClient
      .from("quotes")
      .update({
        fortnox_invoice_number: String(documentNumber),
        fortnox_synced_at: new Date().toISOString(),
      })
      .eq("id", quoteId);

    if (updateError) {
      // Invoice exists in Fortnox but we couldn't save the link locally.
      // Surface a clear error so the user knows to reconcile manually
      // before re-syncing — re-syncing would create a duplicate invoice.
      return jsonResponse(
        {
          error:
            `Faktura skapad i Fortnox (#${documentNumber}) men Quotly kunde inte spara länken: ${updateError.message}`,
          fortnox_invoice_number: String(documentNumber),
        },
        500,
      );
    }

    return jsonResponse(
      {
        ok: true,
        fortnox_invoice_number: String(documentNumber),
      },
      200,
    );
  } catch (err) {
    console.error(`[${FUNCTION_NAME}] error`, err);
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
