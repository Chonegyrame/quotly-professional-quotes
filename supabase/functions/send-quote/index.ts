import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { quoteId, recipient, method } = await req.json();

    if (!quoteId || !recipient || !method) {
      return new Response(
        JSON.stringify({ error: "Missing quoteId, recipient, or method" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch quote details
    const { data: quote, error: quoteError } = await supabase
      .from("quotes")
      .select("*, quote_items(*, quote_item_materials(*)), companies(*)")
      .eq("id", quoteId)
      .single();

    if (quoteError || !quote) {
      return new Response(
        JSON.stringify({ error: "Quote not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const company = quote.companies;
    const publicLink = `${req.headers.get("origin") || "https://cimixmdgcyozwmzboxfk.lovable.app"}/q/${quoteId}`;

    // Calculate total
    const items = quote.quote_items || [];
    const subtotal = items.reduce((s: number, i: any) => s + i.quantity * i.unit_price, 0);
    const vat = items.reduce((s: number, i: any) => s + i.quantity * i.unit_price * (i.vat_rate / 100), 0);
    const total = subtotal + vat;
    const formattedTotal = new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK" }).format(total);

    if (method === "email") {
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      if (!RESEND_API_KEY) {
        return new Response(
          JSON.stringify({ error: "Email service not configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Offert från ${company?.name || "oss"}</h2>
          <p>Hej ${quote.customer_name},</p>
          <p>Du har fått en offert${quote.quote_number ? ` (${quote.quote_number})` : ""}.</p>
          <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 4px 0;"><strong>Totalbelopp:</strong> ${formattedTotal}</p>
            ${quote.valid_until ? `<p style="margin: 4px 0;"><strong>Giltig till:</strong> ${quote.valid_until}</p>` : ""}
          </div>
          <a href="${publicLink}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Visa offert</a>
          <p style="margin-top: 24px; color: #666; font-size: 14px;">Med vänliga hälsningar,<br/>${company?.name || ""}</p>
        </div>
      `;

      const fromEmail = company?.email ? `${company.name} <${company.email}>` : "Offert <onboarding@resend.dev>";

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [recipient],
          subject: `Offert ${quote.quote_number || ""} från ${company?.name || ""}`,
          html: emailHtml,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        console.error("Resend error:", resData);
        return new Response(
          JSON.stringify({ error: resData.message || "Failed to send email" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Log send event
      await supabase.from("quote_events").insert({
        quote_id: quoteId,
        event_type: "email_sent",
      });

      return new Response(
        JSON.stringify({ success: true, method: "email" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (method === "sms") {
      // SMS placeholder - for now just log the event
      // TODO: Integrate with SMS provider (e.g. 46elks, Twilio)
      console.log(`SMS would be sent to ${recipient}: Offert ${quote.quote_number} - ${publicLink}`);

      await supabase.from("quote_events").insert({
        quote_id: quoteId,
        event_type: "sms_sent",
      });

      return new Response(
        JSON.stringify({ success: true, method: "sms", note: "SMS integration not yet configured. Event logged." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid method. Use 'email' or 'sms'" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-quote error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
