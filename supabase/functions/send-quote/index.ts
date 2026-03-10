import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type SendQuotePayload = {
  quoteId?: string;
  recipient?: string;
  method?: "email" | "sms" | string;
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed. Use POST." }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendApiKeyRaw = Deno.env.get("RESEND_API_KEY") ?? "";
    const resendApiKey = resendApiKeyRaw.trim().replace(/^['"]|['"]$/g, "");

    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "Missing RESEND_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_ANON_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { quoteId, recipient, method }: SendQuotePayload = await req.json();

    if (!quoteId || !recipient || !method) {
      return new Response(JSON.stringify({ error: "Invalid payload. Required: quoteId, recipient, method." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (method !== "email") {
      return new Response(JSON.stringify({ error: "SMS är inte konfigurerat ännu." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
        JSON.stringify({
          error: "Could not load quote for email",
          details: quoteError?.message ?? "Quote not found",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const siteUrl = Deno.env.get("SITE_URL") ?? "";
    const publicQuoteUrl = siteUrl ? `${siteUrl.replace(/\/$/, "")}/q/${quote.id}` : `/q/${quote.id}`;

    const subject = `Quote ${quote.quote_number} is ready`;
    const text = [
      `Hi ${quote.customer_name || "there"},`,
      "",
      `Your quote ${quote.quote_number} is ready.`,
      quote.valid_until ? `Valid until: ${quote.valid_until}` : "",
      `Open quote: ${publicQuoteUrl}`,
    ]
      .filter(Boolean)
      .join("\n");

    const html = `
      <p>Hi ${quote.customer_name || "there"},</p>
      <p>Your quote <strong>${quote.quote_number}</strong> is ready.</p>
      ${quote.valid_until ? `<p><strong>Valid until:</strong> ${quote.valid_until}</p>` : ""}
      <p><a href="${publicQuoteUrl}">Open your quote</a></p>
    `;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev",
        to: recipient,
        subject,
        text,
        html,
      }),
    });

    const resendRaw = await resendResponse.text();
    let resendBody: unknown = resendRaw;

    try {
      resendBody = JSON.parse(resendRaw);
    } catch {
      // keep raw body if not JSON
    }

    if (!resendResponse.ok) {
      const message =
        typeof resendBody === "object" &&
        resendBody !== null &&
        "message" in resendBody
          ? String((resendBody as { message?: unknown }).message ?? "Resend request failed")
          : "Resend request failed";

      return new Response(
        JSON.stringify({
          error: message,
          status: resendResponse.status,
          statusText: resendResponse.statusText,
          resend: resendBody,
        }),
        {
          status: resendResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify({ success: true, resend: resendBody }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error while sending quote", error);

    const message = error instanceof Error ? error.message : String(error);

    return new Response(JSON.stringify({ error: "Unexpected error while sending quote", message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
