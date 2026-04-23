import { createClient } from "npm:@supabase/supabase-js@2";
import {
  corsHeaders,
  getClientIp,
  jsonResponse,
} from "../_shared/auth.ts";

const FUNCTION_NAME = "classify-intake-request";
const IP_LIMIT_PER_HOUR = 30;

// ============================================================
// Public (anonymous) endpoint: given a firm's slug and a 1-sentence
// description from the customer, picks the best-fitting form template
// for that firm.
//
// Returns { template: { id, name, description, sub_type, trade,
//   form_schema, red_flag_rules } } — or template=null if no good match,
// in which case the caller should fall back to the generic template.
// ============================================================

type Template = {
  id: string;
  name: string;
  description: string | null;
  sub_type: string;
  trade: string;
  form_schema: unknown;
  red_flag_rules: unknown;
};

async function classifyWithHaiku(
  freeText: string,
  templates: Template[],
  anthropicApiKey: string,
): Promise<string | null> {
  const templateList = templates
    .map(
      (t, i) =>
        `${i + 1}. id="${t.sub_type}" (${t.trade}) — ${t.name}${t.description ? `: ${t.description}` : ""}`,
    )
    .join("\n");

  const prompt =
    "Du hjälper en hantverksfirma att ta emot kundförfrågningar. " +
    "Klassificera kundens korta beskrivning till EN av firmans mallar.\n\n" +
    `Firmans mallar:\n${templateList}\n\n` +
    `Kundens beskrivning:\n"${freeText.slice(0, 500)}"\n\n` +
    "Svara med exakt ett värde från id-kolumnen ovan (t.ex. \"laddbox\" eller \"badrum\"). " +
    "Om ingen mall passar väl, svara \"none\". " +
    "Svara enbart med id:t, inget annat.";

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": anthropicApiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 32,
      temperature: 0,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    console.error(`[${FUNCTION_NAME}] anthropic-${res.status}`);
    return null;
  }

  try {
    const data = await res.json();
    const raw = (data.content?.[0]?.text ?? "").trim().toLowerCase().replace(/^"|"$/g, "");
    if (!raw || raw === "none") return null;
    // Must match one of the sub_types we offered.
    const match = templates.find((t) => t.sub_type === raw);
    return match?.id ?? null;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
  const adminClient = createClient(url, serviceRoleKey);
  const ip = getClientIp(req);

  // Per-IP rate limit (30/hour). Light enough to not frustrate anons.
  const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await adminClient
    .from("ai_ip_usage")
    .select("*", { count: "exact", head: true })
    .eq("ip", ip)
    .eq("function_name", FUNCTION_NAME)
    .gte("used_at", windowStart);

  if ((count ?? 0) >= IP_LIMIT_PER_HOUR) {
    console.error(`[${FUNCTION_NAME}] 429 ip-rate-limit ip=${ip}`);
    return jsonResponse(
      { error: "För många förfrågningar, försök igen om en timme" },
      429,
    );
  }

  let payload: { firmSlug?: string; freeText?: string };
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const firmSlug = (payload.firmSlug ?? "").trim();
  const freeText = (payload.freeText ?? "").trim();
  if (!firmSlug || !freeText) {
    return jsonResponse({ error: "firmSlug och freeText krävs" }, 400);
  }

  // Resolve firm
  const { data: firmRows, error: firmErr } = await adminClient.rpc(
    "get_company_by_slug",
    { slug: firmSlug },
  );
  if (firmErr || !firmRows?.[0]) {
    console.error(`[${FUNCTION_NAME}] firm-not-found slug=${firmSlug}`);
    return jsonResponse({ error: "Firman hittades inte" }, 404);
  }
  const firm = firmRows[0] as {
    id: string;
    primary_trade: string;
    secondary_trades: string[];
  };

  const trades = Array.from(
    new Set([firm.primary_trade, ...(firm.secondary_trades ?? []), "general"]),
  );

  // Fetch active templates for these trades (global library).
  const { data: templates, error: tErr } = await adminClient
    .from("form_templates")
    .select("id, name, description, sub_type, trade, form_schema, red_flag_rules")
    .in("trade", trades)
    .eq("is_active", true);

  if (tErr) {
    console.error(`[${FUNCTION_NAME}] template-fetch-error: ${tErr.message}`);
    return jsonResponse({ error: "Database error" }, 500);
  }

  const list = (templates ?? []) as Template[];
  if (!list.length) {
    return jsonResponse(
      { error: "Firman har inga aktiva mallar" },
      500,
    );
  }

  // Record rate-limit usage before calling Anthropic (so retries hit the cap).
  await adminClient.from("ai_ip_usage").insert({
    ip,
    function_name: FUNCTION_NAME,
  });

  // Classify with Haiku. Fall back to generic if classifier returns null.
  let chosenId: string | null = null;
  if (anthropicApiKey) {
    chosenId = await classifyWithHaiku(freeText, list, anthropicApiKey);
  }
  if (!chosenId) {
    chosenId = list.find((t) => t.trade === "general" && t.sub_type === "allman")?.id
      ?? list[0].id;
  }

  const chosen = list.find((t) => t.id === chosenId) ?? list[0];

  return jsonResponse({ template: chosen }, 200);
});
