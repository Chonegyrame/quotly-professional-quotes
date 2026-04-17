import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type SendQuotePayload = {
  quoteId: string;
  recipient: string;
  method: string;
  attachPdf?: boolean;
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
      return new Response(
        JSON.stringify({ error: "Method not allowed. Use POST." }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const resendApiKeyRaw = Deno.env.get("RESEND_API_KEY") ?? "";
    const resendApiKey = resendApiKeyRaw.trim().replace(/^['"]|['"]$/g, "");
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "Missing RESEND_API_KEY" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_ANON_KEY" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { quoteId, recipient, method, attachPdf, message }: SendQuotePayload = await req.json();
    if (!quoteId || !recipient || !method) {
      return new Response(
        JSON.stringify({ error: "Invalid payload. Required: quoteId, recipient, method." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (method === "sms") {
      return new Response(
        JSON.stringify({ error: "SMS ar inte konfigurerat annu." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (method !== "email") {
      return new Response(
        JSON.stringify({ error: `Unknown method: ${method}. Use email or sms.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: quote, error: quoteError } = await supabase
      .from("quotes")
      .select("id, quote_number, customer_name, valid_until")
      .eq("id", quoteId)
      .single();

    if (quoteError || !quote) {
      return new Response(
        JSON.stringify({ error: "Kunde inte hitta offerten.", details: quoteError?.message }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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

    // Optionally generate and attach PDF
    let attachments: Array<{ filename: string; content: string }> = [];
    if (attachPdf) {
      try {
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        const pdfRes = await fetch(
          `${supabaseUrl}/functions/v1/generate-pdf`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${serviceRoleKey}`,
              apikey: supabaseAnonKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ quoteId }),
          },
        );
        if (pdfRes.ok) {
          const pdfBuffer = await pdfRes.arrayBuffer();
          const bytes = new Uint8Array(pdfBuffer);
          let binary = "";
          for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          attachments = [{
            filename: `Offert-${(quote.customer_name || "offert").replace(/[^a-zA-Z0-9 _-]/g, "")}.pdf`,
            content: btoa(binary),
          }];
        } else {
          const errBody = await pdfRes.text().catch(() => "(could not read body)");
          console.error(`generate-pdf failed: ${pdfRes.status} ${pdfRes.statusText}`, errBody);
          return new Response(
            JSON.stringify({
              error: "Kunde inte generera PDF-bilaga",
              pdfStatus: pdfRes.status,
              pdfError: errBody,
            }),
            { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      } catch (pdfErr) {
        console.error("PDF attachment generation threw:", pdfErr);
        return new Response(
          JSON.stringify({
            error: "Kunde inte generera PDF-bilaga",
            details: pdfErr instanceof Error ? pdfErr.message : String(pdfErr),
          }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

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
        ...(attachments.length > 0 ? { attachments } : {}),
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

      return new Response(
        JSON.stringify({
          error: errMsg,
          status: resendRes.status,
          statusText: resendRes.statusText,
          resend: resendBody,
        }),
        {
          status: resendRes.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({ success: true, resend: resendBody }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Unexpected error while sending quote", error);
    const errMessage = error instanceof Error ? error.message : String(error);

    return new Response(
      JSON.stringify({ error: "Unexpected error while sending quote", message: errMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
