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
// Two-stage routing:
//   1. Trigger-keyword match (case-insensitive substring) — instant,
//      free, deterministic. Custom firm templates win over globals
//      when both have a hit.
//   2. AI classification with Claude Haiku as a fallback when no
//      keyword matched.
// Final fallback is the firm's general/allman template.
//
// Returns { template: { id, name, description, sub_type, trade,
//   form_schema, red_flag_rules }, method: "keyword"|"ai"|"fallback",
//   matched_keywords?: string[] }
// ============================================================

type Source = "global" | "custom";

type Candidate = {
  id: string;
  name: string;
  description: string | null;
  sub_type: string;
  trade: string;
  form_schema: unknown;
  red_flag_rules: unknown;
  trigger_keywords: string[];
  source: Source;
  based_on_template_id?: string | null;
};

type KeywordMatch = { tpl: Candidate; matched: string[] };

function findKeywordMatches(
  freeText: string,
  candidates: Candidate[],
): KeywordMatch[] {
  const lowerText = freeText.toLowerCase();
  const matches: KeywordMatch[] = [];
  for (const tpl of candidates) {
    const matched: string[] = [];
    for (const kw of tpl.trigger_keywords ?? []) {
      if (!kw) continue;
      if (lowerText.includes(kw.toLowerCase())) matched.push(kw);
    }
    if (matched.length > 0) matches.push({ tpl, matched });
  }
  matches.sort((a, b) => {
    // Custom always wins over global
    if (a.tpl.source !== b.tpl.source) {
      return a.tpl.source === "custom" ? -1 : 1;
    }
    // Then more matched keywords = better
    return b.matched.length - a.matched.length;
  });
  return matches;
}

async function classifyWithHaiku(
  freeText: string,
  candidates: Candidate[],
  anthropicApiKey: string,
): Promise<string | null> {
  // Use a stable handle the model can return — sub_type may collide between
  // global and custom templates after we relaxed the unique constraint, so
  // prefix custom rows to disambiguate.
  const handleFor = (c: Candidate, i: number) =>
    c.source === "custom" ? `c${i}_${c.sub_type}` : c.sub_type;

  const templateList = candidates
    .map(
      (c, i) =>
        `${i + 1}. id="${handleFor(c, i)}" (${c.trade}) — ${c.name}${
          c.description ? `: ${c.description}` : ""
        }`,
    )
    .join("\n");

  const prompt =
    "Du hjälper en hantverksfirma att ta emot kundförfrågningar. " +
    "Klassificera kundens korta beskrivning till EN av firmans mallar.\n\n" +
    `Firmans mallar:\n${templateList}\n\n` +
    `Kundens beskrivning:\n"${freeText.slice(0, 500)}"\n\n` +
    "Svara med exakt ett värde från id-kolumnen ovan. " +
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
    const raw = (data.content?.[0]?.text ?? "").trim().toLowerCase().replace(
      /^"|"$/g,
      "",
    );
    if (!raw || raw === "none") return null;
    // Resolve handle back to candidate id
    for (let i = 0; i < candidates.length; i++) {
      if (handleFor(candidates[i], i) === raw) return candidates[i].id;
    }
    return null;
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

  // Pull global library + per-firm custom templates in parallel
  const [globalRes, customRes] = await Promise.all([
    adminClient
      .from("form_templates")
      .select(
        "id, name, description, sub_type, trade, form_schema, red_flag_rules, trigger_keywords",
      )
      .in("trade", trades)
      .eq("is_active", true),
    adminClient
      .from("company_form_templates")
      .select(
        "id, name, description, sub_type, trade, form_schema, red_flag_rules, trigger_keywords, based_on_template_id",
      )
      .eq("company_id", firm.id)
      .in("trade", trades)
      .eq("is_active", true),
  ]);

  if (globalRes.error) {
    console.error(`[${FUNCTION_NAME}] global-fetch-error: ${globalRes.error.message}`);
    return jsonResponse({ error: "Database error" }, 500);
  }
  if (customRes.error) {
    console.error(`[${FUNCTION_NAME}] custom-fetch-error: ${customRes.error.message}`);
    return jsonResponse({ error: "Database error" }, 500);
  }

  const customs = (customRes.data ?? []) as any[];
  const overriddenIds = new Set(
    customs.map((c) => c.based_on_template_id).filter(Boolean),
  );

  const visibleGlobals = ((globalRes.data ?? []) as any[])
    .filter((g) => !overriddenIds.has(g.id))
    .map((g): Candidate => ({
      id: g.id,
      name: g.name,
      description: g.description,
      sub_type: g.sub_type,
      trade: g.trade,
      form_schema: g.form_schema,
      red_flag_rules: g.red_flag_rules,
      trigger_keywords: g.trigger_keywords ?? [],
      source: "global",
    }));

  const customCandidates: Candidate[] = customs.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    sub_type: c.sub_type,
    trade: c.trade,
    form_schema: c.form_schema,
    red_flag_rules: c.red_flag_rules,
    trigger_keywords: c.trigger_keywords ?? [],
    source: "custom",
    based_on_template_id: c.based_on_template_id,
  }));

  // Customs first so they win on iteration ties
  const candidates: Candidate[] = [...customCandidates, ...visibleGlobals];

  if (candidates.length === 0) {
    return jsonResponse({ error: "Firman har inga aktiva mallar" }, 500);
  }

  // 1) Keyword match — instant, no AI cost
  const keywordMatches = findKeywordMatches(freeText, candidates);

  let chosen: Candidate | null = null;
  let method: "keyword" | "ai" | "fallback" = "fallback";
  let matchedKeywords: string[] | undefined;

  if (keywordMatches.length > 0) {
    const top = keywordMatches[0];
    // "Tied" = same source AND same hit count as the leader. The custom>global
    // and more-hits-wins ordering already happened in findKeywordMatches.
    const tied = keywordMatches.filter(
      (m) =>
        m.tpl.source === top.tpl.source &&
        m.matched.length === top.matched.length,
    );

    if (tied.length === 1) {
      // Single clear winner — no AI needed.
      chosen = top.tpl;
      method = "keyword";
      matchedKeywords = top.matched;
    } else if (anthropicApiKey) {
      // Multiple forms tied on (source, hit count). Let AI disambiguate
      // among only the tied set so we don't reopen the field to all candidates.
      await adminClient.from("ai_ip_usage").insert({
        ip,
        function_name: FUNCTION_NAME,
      });
      const aiId = await classifyWithHaiku(
        freeText,
        tied.map((t) => t.tpl),
        anthropicApiKey,
      );
      if (aiId) {
        const found = tied.find((t) => t.tpl.id === aiId);
        if (found) {
          chosen = found.tpl;
          method = "ai";
          matchedKeywords = found.matched;
        }
      }
      // AI returned nothing usable → fall back to the first tied (deterministic).
      if (!chosen) {
        chosen = top.tpl;
        method = "keyword";
        matchedKeywords = top.matched;
      }
    } else {
      // No AI configured → first tied wins.
      chosen = top.tpl;
      method = "keyword";
      matchedKeywords = top.matched;
    }
  }

  // 2) AI fallback only when no keyword matched at all
  if (!chosen && anthropicApiKey) {
    await adminClient.from("ai_ip_usage").insert({
      ip,
      function_name: FUNCTION_NAME,
    });
    const aiId = await classifyWithHaiku(freeText, candidates, anthropicApiKey);
    if (aiId) {
      const found = candidates.find((c) => c.id === aiId);
      if (found) {
        chosen = found;
        method = "ai";
      }
    }
  }

  // 3) Final fallback — general/allman, then anything
  if (!chosen) {
    chosen =
      candidates.find((c) => c.trade === "general" && c.sub_type === "allman") ??
      candidates[0];
    method = "fallback";
  }

  // Strip internal `source` + `based_on_template_id` from the response so the
  // public endpoint shape stays identical to the original contract.
  const { source: _s, based_on_template_id: _b, ...publicTemplate } = chosen;

  return jsonResponse(
    { template: publicTemplate, method, matched_keywords: matchedKeywords },
    200,
  );
});
