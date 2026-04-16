import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============================================================
// Keyword extraction (Haiku) — same prompt as generate-quote
// ============================================================

async function extractKeywords(
  text: string,
  anthropicApiKey: string,
): Promise<string[]> {
  const extractionPrompt =
    "Extrahera jobbspecifika nyckelord från denna arbetsbeskrivning. " +
    "Returnera ENBART ett JSON-array med substantiv i grundform som beskriver specifika material, komponenter eller installationer. " +
    "Inkludera även nyckelord som beskriver typen av jobb (t.ex. 'renovering', 'nyinstallation', 'reparation'). " +
    "Uteslut verb, adjektiv och vaga ord som 'problem', 'byta', 'trasig', 'gammal'. " +
    "Om inga relevanta nyckelord finns, returnera []. " +
    "Returnera ENBART JSON-arrayen, inget annat.";

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": anthropicApiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      messages: [{ role: "user", content: `${extractionPrompt}\n\nArbetsbeskrivning:\n${text}` }],
    }),
  });

  if (!res.ok) return [];

  try {
    const data = await res.json();
    let raw: string = data.content?.[0]?.text ?? "[]";
    raw = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((k: any) => String(k).toLowerCase()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

// ============================================================
// Main handler
// ============================================================

Deno.serve(async (req: Request) => {
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

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { quote_id, text, trade } = (await req.json()) as {
      quote_id: string;
      text: string;
      trade?: string;
    };

    if (!quote_id || !text?.trim()) {
      return new Response(
        JSON.stringify({ error: "Missing quote_id or text" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicApiKey) {
      return new Response(
        JSON.stringify({ error: "Missing API key" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Extract keywords
    const keywords = await extractKeywords(text, anthropicApiKey);

    // Update the quote row with keywords (and trade if provided)
    const updates: Record<string, any> = { keywords };
    if (trade) {
      updates.trade = trade;
    }

    const { error: updateError } = await supabase
      .from("quotes")
      .update(updates)
      .eq("id", quote_id);

    if (updateError) {
      console.error("Failed to update quote keywords:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update quote" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, keywords }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("extract-keywords error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
