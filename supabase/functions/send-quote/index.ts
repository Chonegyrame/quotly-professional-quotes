import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const { quoteId, recipient, method } = await req.json();

    if (!quoteId || !recipient || !method) {
      return new Response(
        JSON.stringify({ error: "Saknar obligatoriska fält: quoteId, recipient, method." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (method === "sms") {
      return new Response(
        JSON.stringify({ error: "SMS är inte konfigurerat ännu. Använd e-post istället." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (method !== "email") {
      return new Response(
        JSON.stringify({ error: `Okänd metod: "${method}". Använd "email" eller "sms".` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY saknas i serverinställningarna." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Build Supabase client with caller's auth
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
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

    const subject = `Offert ${quote.quote_number} är klar`;
    const html = `
      <p>Hej ${quote.customer_name || ""},</p>
      <p>Din offert <strong>${quote.quote_number}</strong> är klar.</p>
      ${quote.valid_until ? `<p><strong>Giltig till:</strong> ${quote.valid_until}</p>` : ""}
      <p><a href="${publicQuoteUrl}">Öppna offerten</a></p>
    `;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev",
        to: recipient,
        subject,
        html,
      }),
    });

    const resendRaw = await resendRes.text();
    let resendBody: unknown = resendRaw;
    try { resendBody = JSON.parse(resendRaw); } catch { /* keep raw */ }

    if (!resendRes.ok) {
      console.error("Resend error body:", resendBody);
      return new Response(
        JSON.stringify({
          error: "E-post kunde inte skickas via Resend.",
          status: resendRes.status,
          resend: resendBody,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, resend: resendBody }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("send-quote unexpected error:", message);
    return new Response(
      JSON.stringify({ error: "Oväntat serverfel.", message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
