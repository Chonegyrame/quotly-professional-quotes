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
    if (typeof quoteId !== "string" || !quoteId.trim()) {
      return jsonResponse({ error: "Saknar quoteId." }, 400);
    }

    // Quote lookup is RLS-scoped — non-members can't sync someone else's
    // quote even with a guessed UUID. We also fetch company_id so we can
    // verify it matches the caller's membership before touching any
    // external API or token row (defense in depth: even if the
    // one-firm-per-user constraint is ever relaxed, the wrong firm's
    // Fortnox can't be used to push another firm's quote).
    const { data: quote, error: quoteError } = await authClient
      .from("quotes")
      .select(`
        id, company_id, status, customer_name, customer_email, customer_phone,
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

    // Membership scoped to the quote's company. Combined with one-firm-per-user
    // this row is unique, but the explicit company_id eq is what guarantees
    // we use the RIGHT firm's tokens — never a different firm's.
    const { data: membership, error: membershipError } = await authClient
      .from("company_memberships")
      .select("company_id")
      .eq("user_id", userId)
      .eq("company_id", quote.company_id)
      .maybeSingle();

    if (membershipError || !membership) {
      return jsonResponse(
        { error: "Du har inte behörighet till den här offerten." },
        403,
      );
    }

    if (quote.status !== "accepted") {
      return jsonResponse(
        { error: "Endast accepterade offerter kan skickas till Fortnox." },
        400,
      );
    }

    if (quote.fortnox_invoice_number || quote.fortnox_synced_at) {
      return jsonResponse(
        {
          error: quote.fortnox_invoice_number
            ? `Offerten är redan synkad till Fortnox (#${quote.fortnox_invoice_number}).`
            : "Offerten håller redan på att synkas. Försök igen om en stund.",
        },
        409,
      );
    }

    // ────────── Atomic claim ──────────
    // Set fortnox_synced_at to a sentinel timestamp BEFORE any external
    // API call. The conditional update only succeeds for one caller; a
    // concurrent click ends up with claimed.length === 0 and is rejected.
    // On failure later, we roll the claim back to NULL so the firm can
    // retry. On success, we overwrite both columns with the real values.
    const claimSentinel = new Date().toISOString();
    const { data: claimed, error: claimError } = await adminClient
      .from("quotes")
      .update({ fortnox_synced_at: claimSentinel })
      .eq("id", quoteId)
      .is("fortnox_invoice_number", null)
      .is("fortnox_synced_at", null)
      .select("id");

    if (claimError) {
      console.error(`[${FUNCTION_NAME}] claim-error`, claimError);
      return jsonResponse({ error: "Kunde inte synka offerten just nu." }, 500);
    }
    if (!claimed || claimed.length === 0) {
      return jsonResponse(
        { error: "Offerten håller redan på att synkas eller är redan synkad." },
        409,
      );
    }

    // From here on, every error path must roll back the claim so the firm
    // can retry. Customer-creation that succeeds before the invoice fails
    // also gets best-effort cleanup so we don't leave orphaned PRIVATE
    // customers in their Fortnox catalog.
    const rollbackClaim = async (): Promise<void> => {
      const { error: rbError } = await adminClient
        .from("quotes")
        .update({ fortnox_synced_at: null })
        .eq("id", quoteId)
        .eq("fortnox_synced_at", claimSentinel);
      if (rbError) {
        console.error(`[${FUNCTION_NAME}] claim-rollback-failed`, rbError);
      }
    };

    let accessToken: string;
    try {
      accessToken = await getAccessToken(adminClient, membership.company_id);
    } catch (err) {
      console.error(`[${FUNCTION_NAME}] token-fetch-failed`, err);
      await rollbackClaim();
      return jsonResponse(
        { error: "Kunde inte hämta giltig Fortnox-anslutning. Anslut igen i Inställningar." },
        502,
      );
    }

    // ────────── 1. Customer find-or-create ──────────
    // Fortnox customer matching: prefer email, fall back to creating a new
    // customer record. Customer numbers are Fortnox-assigned strings.
    // TODO(fortnox-spike): Verify the exact filter syntax for /3/customers.
    let customerNumber: string | null = null;
    let customerWasCreated = false; // tracked for rollback on later failure

    try {
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
          throw new Error("Fortnox returnerade inget CustomerNumber.");
        }
        customerWasCreated = true;
      }
    } catch (err) {
      console.error(`[${FUNCTION_NAME}] customer-step-failed`, err);
      await rollbackClaim();
      return jsonResponse(
        { error: "Kunde inte synka kunden till Fortnox. Försök igen om en stund." },
        502,
      );
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

    let documentNumber: string | number | undefined;
    try {
      const invoiceRes = await fortnoxFetch(accessToken, "/invoices", {
        method: "POST",
        body: JSON.stringify(invoicePayload),
      });
      const invoiceJson = await invoiceRes.json();
      documentNumber = invoiceJson?.Invoice?.DocumentNumber;
      if (!documentNumber) {
        throw new Error("Fortnox returnerade inget DocumentNumber.");
      }
    } catch (err) {
      console.error(`[${FUNCTION_NAME}] invoice-post-failed`, err);
      // Best-effort cleanup: delete the customer we just created so the firm
      // doesn't get an orphaned PRIVATE record in their Fortnox catalog every
      // time invoice creation fails. Pre-existing customers stay untouched.
      if (customerWasCreated && customerNumber) {
        try {
          await fortnoxFetch(accessToken, `/customers/${encodeURIComponent(customerNumber)}`, {
            method: "DELETE",
          });
        } catch (cleanupErr) {
          console.error(
            `[${FUNCTION_NAME}] customer-cleanup-failed CustomerNumber=${customerNumber}`,
            cleanupErr,
          );
        }
      }
      await rollbackClaim();
      return jsonResponse(
        { error: "Kunde inte skapa fakturan i Fortnox. Försök igen om en stund." },
        502,
      );
    }

    // ────────── 4. Persist sync state on the quote ──────────
    // Conditional update via fortnox_synced_at = claimSentinel so we only
    // overwrite our own claim. If something else cleared the claim while
    // we were calling Fortnox (shouldn't happen, but defensive) we'd see 0
    // rows updated and surface that as a reconcile-manually error.
    const { data: persisted, error: updateError } = await adminClient
      .from("quotes")
      .update({
        fortnox_invoice_number: String(documentNumber),
        fortnox_synced_at: new Date().toISOString(),
      })
      .eq("id", quoteId)
      .eq("fortnox_synced_at", claimSentinel)
      .select("id");

    if (updateError || !persisted || persisted.length === 0) {
      // Invoice exists in Fortnox but we couldn't save the link locally.
      // Don't roll back the claim — better to leave it set than risk a
      // duplicate sync. The user is told to reconcile manually.
      console.error(
        `[${FUNCTION_NAME}] persist-failed quoteId=${quoteId} documentNumber=${documentNumber}`,
        updateError,
      );
      return jsonResponse(
        {
          error:
            `Faktura skapad i Fortnox (#${documentNumber}) men Quotly kunde inte spara länken. Kontakta support.`,
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
    console.error(`[${FUNCTION_NAME}] unhandled-error`, err);
    return jsonResponse(
      { error: "Något gick fel vid synk till Fortnox. Försök igen om en stund." },
      500,
    );
  }
});
