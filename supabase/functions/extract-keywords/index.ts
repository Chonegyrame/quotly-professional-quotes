import {
  authenticate,
  checkGlobalAiCeiling,
  checkIpRateLimit,
  corsHeaders,
  jsonResponse,
} from "../_shared/auth.ts";

const FUNCTION_NAME = "extract-keywords";
const IP_LIMIT_PER_HOUR = 80;
const GLOBAL_AI_CEILING_24H = 500;

// ============================================================
// Keyword extraction (Haiku) — dual-token: verb+noun phrases + standalone nouns.
// Same prompt used in generate-quote; keep them in sync.
// ============================================================

async function extractKeywords(
  text: string,
  anthropicApiKey: string,
): Promise<string[]> {
  const extractionPrompt =
    "Extrahera jobbspecifika nyckelord från denna arbetsbeskrivning.\n\n" +
    "ABSOLUT REGEL (överordnad alla andra):\n" +
    "Skapa ENDAST en verb+substantiv-fras om verbet står ORDAGRANT skrivet som ett ord i texten. " +
    "Gissa aldrig ett verb — även om sammanhanget gör det uppenbart vad som ska göras. " +
    "Om verbet inte finns ordagrant, emittera ENDAST substantivet.\n\n" +
    "Exempel:\n" +
    "- \"Byta element i köket\" → [\"byta_element\",\"element\",\"kök\"]\n" +
    "  (verbet \"byta\" finns i texten → fras tillåten)\n" +
    "- \"Badrumsrenovering med nytt kakel och ny dusch\" → [\"renovering\",\"badrum\",\"kakel\",\"dusch\"]\n" +
    "  (inga verb i texten → INGA fraser, inte ens \"lägga_kakel\" eller \"installera_dusch\")\n" +
    "- \"Måla vardagsrum\" → [\"måla_vardagsrum\",\"vardagsrum\"]\n" +
    "  (verbet \"måla\" finns i texten → fras tillåten)\n\n" +
    "Format:\n" +
    "1. Fraser: verb_substantiv, understreck, verbet i infinitiv, substantivet i singular obestämd.\n" +
    "2. Substantiv i grundform (singular, obestämd).\n" +
    "3. När en fras emitteras, inkludera också substantivet separat.\n\n" +
    "Övriga regler:\n" +
    "- Dela svenska sammansättningar (badrumsrenovering → renovering + badrum).\n" +
    "- Tvinga singular obestämd (elkablar → elkabel; garaget → garage).\n" +
    "- Platser (kök, badrum, garage) → endast substantiv.\n" +
    "- Jobbtyper utan verb (renovering, nyinstallation, reparation) → endast substantiv.\n" +
    "- Uteslut vaga ord (problem, trasig, gammal, sönder).\n" +
    "- Om inga relevanta nyckelord finns, returnera [].\n" +
    "- Returnera ENBART ett JSON-array med strängar i små bokstäver. Inget annat.";

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
      temperature: 0,
      messages: [{ role: "user", content: `${extractionPrompt}\n\nArbetsbeskrivning:\n${text}` }],
    }),
  });

  if (!res.ok) return [];

  try {
    const data = await res.json();
    let raw: string = data.content?.[0]?.text ?? "[]";
    raw = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((k: any) => String(k).toLowerCase()).filter(Boolean).sort() : [];
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
      return jsonResponse({ error: "Method not allowed. Use POST." }, 405);
    }

    const auth = await authenticate(req, FUNCTION_NAME);
    if (!auth.ok) return auth.response;
    const { ip, authClient, adminClient } = auth;

    const ceilingResp = await checkGlobalAiCeiling(
      adminClient,
      GLOBAL_AI_CEILING_24H,
      FUNCTION_NAME,
    );
    if (ceilingResp) return ceilingResp;

    const ipResp = await checkIpRateLimit(
      adminClient,
      ip,
      FUNCTION_NAME,
      IP_LIMIT_PER_HOUR,
      60,
    );
    if (ipResp) return ipResp;

    const { quote_id, text, trade } = (await req.json()) as {
      quote_id: string;
      text: string;
      trade?: string;
    };

    if (!quote_id || !text?.trim()) {
      return jsonResponse({ error: "Missing quote_id or text" }, 400);
    }

    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicApiKey) {
      return jsonResponse({ error: "Missing API key" }, 500);
    }

    const keywords = await extractKeywords(text, anthropicApiKey);

    const updates: Record<string, any> = { keywords };
    if (trade) {
      updates.trade = trade;
    }

    const { error: updateError } = await authClient
      .from("quotes")
      .update(updates)
      .eq("id", quote_id);

    if (updateError) {
      console.error(`[${FUNCTION_NAME}] update-failed: ${updateError.message}`);
      return jsonResponse({ error: "Failed to update quote" }, 500);
    }

    return jsonResponse({ success: true, keywords }, 200);
  } catch (err) {
    console.error(`[${FUNCTION_NAME}] unexpected:`, err);
    return jsonResponse({ error: "Internal error" }, 500);
  }
});
