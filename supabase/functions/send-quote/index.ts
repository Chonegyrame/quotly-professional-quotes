import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  authenticate,
  checkIpRateLimit,
  corsHeaders,
  jsonResponse,
} from "../_shared/auth.ts";

const FUNCTION_NAME = "send-quote";
const IP_LIMIT_PER_HOUR = 20;

type SendQuotePayload = {
  quoteId: string;
  recipient: string;
  method: string;
  message?: string;
};

function textToHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed. Use POST." }, 405);
    }

    const resendApiKeyRaw = Deno.env.get("RESEND_API_KEY") ?? "";
    const resendApiKey = resendApiKeyRaw.trim().replace(/^['"]|['"]$/g, "");
    if (!resendApiKey) {
      return jsonResponse({ error: "Missing RESEND_API_KEY" }, 500);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseAnonKey) {
      return jsonResponse({ error: "Missing SUPABASE_URL or SUPABASE_ANON_KEY" }, 500);
    }

    const auth = await authenticate(req, FUNCTION_NAME);
    if (!auth.ok) return auth.response;
    const { ip, authClient, adminClient } = auth;

    const ipResp = await checkIpRateLimit(
      adminClient,
      ip,
      FUNCTION_NAME,
      IP_LIMIT_PER_HOUR,
      60,
    );
    if (ipResp) return ipResp;

    const { quoteId, recipient, method, message }: SendQuotePayload = await req.json();
    if (!quoteId || !recipient || !method) {
      return jsonResponse(
        { error: "Invalid payload. Required: quoteId, recipient, method." },
        400,
      );
    }

    if (method === "sms") {
      return jsonResponse({ error: "SMS ar inte konfigurerat annu." }, 400);
    }

    if (method !== "email") {
      return jsonResponse({ error: `Unknown method: ${method}. Use email or sms.` }, 400);
    }

    const { data: quote, error: quoteError } = await authClient
      .from("quotes")
      .select("id, quote_number, customer_name, valid_until")
      .eq("id", quoteId)
      .single();

    if (quoteError || !quote) {
      return jsonResponse(
        { error: "Kunde inte hitta offerten.", details: quoteError?.message },
        404,
      );
    }

    const siteUrl = Deno.env.get("SITE_URL") ?? "";
    const publicQuoteUrl = siteUrl
      ? `${siteUrl.replace(/\/$/, "")}/q/${quote.id}`
      : `/q/${quote.id}`;

    const subject = "Din offert ar klar";

    // Build email body: use custom message if provided, otherwise fallback
    const messageHtml = message?.trim()
      ? textToHtml(message.trim())
      : `Hej ${quote.customer_name || ""},<br><br>Din offert ar klar.${
          quote.valid_until ? `<br><strong>Giltig till:</strong> ${quote.valid_until}` : ""
        }`;

    const html = `
      ${messageHtml}
      <br><br>
      <a href="${publicQuoteUrl}" style="display:inline-block;padding:10px 24px;background:#1e3a5f;color:#ffffff;border-radius:6px;text-decoration:none;font-weight:600;">Öppna offerten</a>
    `;

    // Quotes are sent link-only. The customer view at /q/:id offers a "Ladda ner som PDF"
    // button if the recipient wants to save a copy locally. Removing the email attachment
    // ensures we capture an "opened" event when the customer actually views the quote
    // (a PDF-only customer would otherwise be invisible to our tracking).

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev",
        to: recipient.trim(),
        subject,
        html,
      }),
    });

    const resendRaw = await resendRes.text();
    let resendBody: unknown = resendRaw;
    try {
      resendBody = JSON.parse(resendRaw);
    } catch {
      // keep raw body if not JSON
    }

    if (!resendRes.ok) {
      const errMsg =
        typeof resendBody === "object" &&
        resendBody !== null &&
        "message" in resendBody
          ? String((resendBody as { message?: unknown }).message ?? "Resend request failed")
          : "Resend request failed";

      return jsonResponse(
        {
          error: errMsg,
          status: resendRes.status,
          statusText: resendRes.statusText,
          resend: resendBody,
        },
        resendRes.status,
      );
    }

    return jsonResponse({ success: true, resend: resendBody }, 200);
  } catch (error) {
    console.error(`[${FUNCTION_NAME}] unexpected:`, error);
    const errMessage = error instanceof Error ? error.message : String(error);

    return jsonResponse(
      { error: "Unexpected error while sending quote", message: errMessage },
      500,
    );
  }
});
