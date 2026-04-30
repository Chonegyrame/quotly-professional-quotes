import { createClient } from "npm:@supabase/supabase-js@2";
import {
  corsHeaders,
  getClientIp,
  jsonResponse,
} from "../_shared/auth.ts";

const FUNCTION_NAME = "score-incoming-request";
const IP_LIMIT_PER_HOUR = 30;
const GLOBAL_CEILING_24H = 500;

// ============================================================
// Scoring engine: reads an incoming_requests row, has Claude Sonnet
// produce three sub-scores via forced tool-use (score_lead), then
// computes the final score + tier deterministically from those
// sub-scores. Strips unverifiable red flags and caps tier when
// confidence is låg.
//
// Trigger: invoked synchronously from submit-intake-request right
// after insert. Phase 4 (Inbox UI) reads the resulting ai_verdict.
// ============================================================

// ---------- Tier thresholds ----------
const TIER_THRESHOLDS = {
  "Mycket stark": 85,
  Stark: 70,
  Mellan: 50,
  Svag: 0,
} as const;

type Tier = keyof typeof TIER_THRESHOLDS;

function tierForScore(score: number): Tier {
  if (score >= TIER_THRESHOLDS["Mycket stark"]) return "Mycket stark";
  if (score >= TIER_THRESHOLDS.Stark) return "Stark";
  if (score >= TIER_THRESHOLDS.Mellan) return "Mellan";
  return "Svag";
}

// ---------- Tool schema for Claude ----------
const SCORE_LEAD_TOOL = {
  name: "score_lead",
  description:
    "Score an incoming lead for a Swedish tradesperson firm. Produce structured reasoning BEFORE scores, cite evidence for every red flag, and stay calibrated to the rubric.",
  input_schema: {
    type: "object",
    properties: {
      reasoning: {
        type: "string",
        description:
          "Privat resonemang i 2-4 meningar på svenska. Förklara hur du viktar fit, intent och clarity för just denna förfrågan innan du ger sub-poäng.",
      },
      parsed_fields: {
        type: "object",
        properties: {
          job_type: { type: "string" },
          budget: { type: ["integer", "null"] },
          budget_bucket: {
            type: "string",
            enum: [
              "under_20k",
              "20k_50k",
              "50k_100k",
              "100k_300k",
              "300k_plus",
              "vet_ej",
            ],
          },
          timeframe: { type: "string" },
          timeframe_bucket: {
            type: "string",
            enum: ["akut", "snart", "flexibel"],
          },
          property_type: { type: "string" },
          location: { type: ["string", "null"] },
          distance_km: {
            type: ["number", "null"],
            description: "Avstånd från firmans bas till jobbet (om vi vet)",
          },
          rot_eligible: { type: ["boolean", "null"] },
          photo_count: { type: "integer" },
        },
        required: [
          "job_type",
          "budget_bucket",
          "timeframe_bucket",
          "property_type",
          "photo_count",
        ],
      },
      fit_score: {
        type: "integer",
        minimum: 0,
        maximum: 100,
        description:
          "Hur väl jobbet passar firman: bransch, specialitet, geografi, min_ticket.",
      },
      intent_score: {
        type: "integer",
        minimum: 0,
        maximum: 100,
        description:
          "Kundens allvar: konkret tidsram, definierad budget, bygglov/godkännande, kontaktuppgifter, snabbt svar önskas.",
      },
      clarity_score: {
        type: "integer",
        minimum: 0,
        maximum: 100,
        description:
          "Hur väl förfrågan är ifylld: beskrivning, bilder, alla fält besvarade, ingen 'vet ej'.",
      },
      summary: {
        type: "string",
        maxLength: 160,
        description:
          "En kort mening (max 160 tecken) på svenska som beskriver leaden. Avsedd för inbox-kort.",
      },
      green_flags: {
        type: "array",
        items: {
          type: "object",
          properties: {
            label: { type: "string" },
            evidence: {
              type: "string",
              description:
                "En kort fras (<15 ord) som ORDAGRANT finns i kundens förfrågan och styrker flaggan.",
            },
          },
          required: ["label", "evidence"],
        },
      },
      red_flags: {
        type: "array",
        items: {
          type: "object",
          properties: {
            label: { type: "string" },
            evidence: {
              type: "string",
              description:
                "En kort fras (<15 ord) som ORDAGRANT finns i kundens förfrågan och styrker flaggan. OBS: skriv EXAKT som i texten, inga parafraser.",
            },
            severity: { type: "string", enum: ["low", "medium", "high"] },
          },
          required: ["label", "evidence", "severity"],
        },
      },
      next_step: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["skapa_offert", "artigt_avböj"],
          },
          suggested_message: {
            type: ["string", "null"],
            description:
              "Endast vid artigt_avböj: ett kort utkast på svenska som firman kan skicka till kunden.",
          },
        },
        required: ["action"],
      },
      confidence: {
        type: "string",
        enum: ["hög", "medel", "låg"],
        description:
          "Hur säker är du på bedömningen? Välj 'låg' vid gles information eller tvetydiga signaler.",
      },
      needs_human_review: {
        type: "boolean",
        description:
          "Sätt true om leaden är svår att bedöma automatiskt eller om du ser signaler som kräver manuell kontroll.",
      },
    },
    required: [
      "reasoning",
      "parsed_fields",
      "fit_score",
      "intent_score",
      "clarity_score",
      "summary",
      "green_flags",
      "red_flags",
      "next_step",
      "confidence",
      "needs_human_review",
    ],
  },
};

// ---------- Static role + rubric (cacheable) ----------
const STATIC_SYSTEM_PROMPT = `
Du är en scoringmotor som bedömer inkommande kundförfrågningar åt svenska hantverksfirmor.

DIN UPPGIFT
Produce en strukturerad bedömning via verktyget score_lead. Fältet "reasoning" kommer FÖRST i schemat — tänk där, sedan ge sub-poängen. Bedömningen ska:
1. Vara kalibrerad mot rubriken nedan.
2. Ha evidence för VARJE röd flagga (ordagrant citat ur kundens förfrågan).
3. Sänka confidence till "låg" vid gles eller tvetydig information.

OBS: Du ska INTE producera någon övergripande "score" eller "tier" — systemet beräknar dessa automatiskt från dina tre sub-poäng (fit, intent, clarity). Fokusera på att kalibrera sub-poängen rätt.

RUBRIKEN (0–100 per sub-score, avrunda till heltal)

fit_score — hur väl jobbet passar firman
- 90–100: inom firmans huvudspecialitet, inom serviceområdet, över min_ticket
- 70–89: inom bransch men inte firmans kärnspecialitet
- 50–69: passar någon sekundär bransch ELLER ligger precis utanför serviceområdet
- 20–49: fel bransch men kan rekommenderas, ELLER långt utanför area
- 0–19: tydligt fel firma (helt fel bransch, orimligt avstånd)

intent_score — kundens allvar
- 90–100: konkret tidsram + definierad budget + tydlig fastighet + minst en kontaktväg + känsla av beslutsamhet
- 70–89: tre av ovan
- 50–69: två av ovan
- 30–49: ett av ovan; mycket "vet ej"
- 0–29: vaga ord, "kolla", "undra om", ingen tidsram/budget

clarity_score — hur väl förfrågan är ifylld
- 90–100: alla obligatoriska fält ifyllda med specifika svar, minst en bild bifogad, konkret platsinfo
- 70–89: alla obligatoriska fält ifyllda men få detaljer ELLER inga bilder när de förväntas
- 50–69: ett till två "vet ej" eller korta svar
- 30–49: flera tomma/vaga fält
- 0–29: nästan ingen information, bara fritextsvepning

BILDER
Bifogade bilder är ett positivt signalvärde för clarity, men en utförlig text utan bilder kan vara lika stark. Tomma eller obesvarade fält är negativt oavsett om bilder bifogats. Räkna inte bilder mekaniskt — väg in dem som en av flera signaler i clarity_score.

EVIDENCE-REGELN (kritisk)
Varje röd flagga MÅSTE ha "evidence" som är ett ORDAGRANT citat ur kundens förfrågan. Inga parafraser, ingen tolkning. Om du inte kan hitta ett citat — nämn inte flaggan. Det är bättre att missa en flagga än att hitta på en.

FÖRETAGSPROFIL-REGELN
Om firmans business_profile inkluderar en specialitet som matchar kundens jobb → lägg till grön flagga "Matchar firmans specialitet". Om kundens adress är långt utanför service_radius_km → lägg till röd flagga med severity="medium".

CONFIDENCE-REGEL
Sätt "låg" om:
- Kundens fritext är <20 ord OCH inga formfält är ifyllda
- Flera motstridiga signaler (t.ex. akut + "vet ej" på allt)
- Obestämd bransch där kundens text inte matchar någon mall tydligt

Sätt "hög" när förfrågan är utförlig, bifogade bilder matchar uppdraget, och alla obligatoriska fält är konkreta.

NEXT_STEP
- artigt_avböj: fit_score < 30 ELLER jobbet ligger helt utanför firmans bransch/område ELLER (intent_score < 30 OCH clarity_score < 30).
- skapa_offert: i alla andra fall där confidence inte är "låg".
- Vid artigt_avböj, skriv en kort suggested_message (2–3 meningar) på svenska som firman kan klistra in och skicka.
`.trim();

// ---------- Helpers ----------

type IncomingRow = {
  id: string;
  company_id: string;
  form_template_id: string | null;
  free_text: string | null;
  submitted_answers: Record<string, unknown>;
  submitter_name: string | null;
  submitter_email: string | null;
  submitter_phone: string | null;
  submitter_address: string | null;
  submitter_lat: number | null;
  submitter_lng: number | null;
  photos: string[];
};

type FirmContext = {
  id: string;
  name: string;
  primary_trade: string;
  secondary_trades: string[];
  specialties: string[];
  base_address: string | null;
  base_lat: number | null;
  base_lng: number | null;
  service_radius_km: number | null;
  min_ticket_sek: number | null;
};

type Template = {
  id: string;
  name: string;
  trade: string;
  sub_type: string;
  description: string | null;
  red_flag_rules: unknown;
};

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function buildSubmissionText(row: IncomingRow): string {
  const parts: string[] = [];
  if (row.free_text) parts.push(`Fritext: ${row.free_text}`);
  for (const [k, v] of Object.entries(row.submitted_answers ?? {})) {
    if (v == null || v === "") continue;
    const rendered = Array.isArray(v) ? v.join(", ") : String(v);
    parts.push(`${k}: ${rendered}`);
  }
  if (row.submitter_address)
    parts.push(`Adress: ${row.submitter_address}`);
  return parts.join("\n");
}

function buildFirmBlock(
  firm: FirmContext,
  templates: Template[],
  distanceKm: number | null,
): string {
  const templateLines = templates
    .map((t) => `- ${t.sub_type} (${t.trade}): ${t.name}${t.description ? ` — ${t.description}` : ""}`)
    .join("\n");

  return [
    "=== FIRMANS PROFIL ===",
    `Namn: ${firm.name}`,
    `Huvudbransch: ${firm.primary_trade}`,
    firm.secondary_trades.length
      ? `Sekundära branscher: ${firm.secondary_trades.join(", ")}`
      : "Sekundära branscher: (inga)",
    firm.specialties.length
      ? `Specialiteter: ${firm.specialties.join(", ")}`
      : "Specialiteter: (inga)",
    firm.base_address ? `Bas: ${firm.base_address}` : "Bas: (ej angiven)",
    firm.service_radius_km
      ? `Serviceradie: ${firm.service_radius_km} km`
      : "Serviceradie: (ej angiven)",
    firm.min_ticket_sek
      ? `Minsta jobb: ${firm.min_ticket_sek} kr`
      : "Minsta jobb: (ej angivet)",
    distanceKm != null
      ? `Avstånd till kundens adress: ${distanceKm.toFixed(1)} km`
      : "Avstånd till kundens adress: (okänt)",
    "",
    "Tillgängliga mallar för denna firma:",
    templateLines || "(inga)",
  ].join("\n");
}

// Post-processing --------------------------------------------------

type ClaudeOutput = {
  reasoning: string;
  parsed_fields: Record<string, unknown> & { photo_count?: number };
  fit_score: number;
  intent_score: number;
  clarity_score: number;
  summary: string;
  green_flags: Array<{ label: string; evidence: string }>;
  red_flags: Array<{ label: string; evidence: string; severity: string }>;
  next_step: { action: string; suggested_message?: string | null };
  confidence: "hög" | "medel" | "låg";
  needs_human_review: boolean;
};

type Verdict = ClaudeOutput & { score: number; tier: Tier };

function computeFinalScore(o: ClaudeOutput): { score: number; tier: Tier } {
  const score = Math.round(
    0.45 * o.fit_score + 0.35 * o.intent_score + 0.20 * o.clarity_score,
  );
  return { score, tier: tierForScore(score) };
}

function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.,;:!?"'()[\]{}]/g, "")
    .trim();
}

function stripUnverifiableRedFlags<T extends { red_flags: ClaudeOutput["red_flags"] }>(
  verdict: T,
  submissionText: string,
): { verdict: T; removed: number } {
  const haystack = normalizeForMatch(submissionText);
  let removed = 0;
  const kept = verdict.red_flags.filter((f) => {
    const needle = normalizeForMatch(f.evidence);
    if (!needle) {
      removed++;
      return false;
    }
    if (haystack.includes(needle)) return true;
    // Fallback: allow if the evidence contains a recognizable substring
    // of 8+ chars that's present verbatim.
    for (let i = 0; i + 8 <= needle.length; i++) {
      if (haystack.includes(needle.slice(i, i + 8))) return true;
    }
    removed++;
    return false;
  });
  return { verdict: { ...verdict, red_flags: kept }, removed };
}

function applyConfidenceCap(
  verdict: Verdict,
): { verdict: Verdict; adjusted: boolean } {
  if (verdict.confidence !== "låg") return { verdict, adjusted: false };
  if (verdict.tier === "Mycket stark" || verdict.tier === "Stark") {
    // Demote to Mellan and recompute score to the top of that band so the
    // displayed score matches the tier.
    const cappedScore = Math.min(verdict.score, TIER_THRESHOLDS.Stark - 1);
    return {
      verdict: { ...verdict, tier: "Mellan" as Tier, score: cappedScore },
      adjusted: true,
    };
  }
  return { verdict, adjusted: false };
}

// Anthropic API --------------------------------------------------

async function callClaude(
  apiKey: string,
  firmBlock: string,
  submissionBlock: string,
): Promise<ClaudeOutput | null> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      temperature: 0,
      system: [
        {
          type: "text",
          text: STATIC_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
        {
          type: "text",
          text: firmBlock,
          cache_control: { type: "ephemeral" },
        },
      ],
      tools: [SCORE_LEAD_TOOL],
      tool_choice: { type: "tool", name: "score_lead" },
      messages: [
        {
          role: "user",
          content: `=== KUNDENS FÖRFRÅGAN ===\n${submissionBlock}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[${FUNCTION_NAME}] anthropic-${res.status}: ${body.slice(0, 500)}`);
    return null;
  }

  try {
    const data = await res.json();
    const toolUse = (data.content ?? []).find(
      (b: { type?: string; name?: string }) =>
        b.type === "tool_use" && b.name === "score_lead",
    );
    if (!toolUse) {
      console.error(`[${FUNCTION_NAME}] no-tool-use`);
      return null;
    }
    return toolUse.input as ClaudeOutput;
  } catch (e) {
    console.error(`[${FUNCTION_NAME}] parse-error: ${(e as Error).message}`);
    return null;
  }
}

// Main handler --------------------------------------------------

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

  // Per-IP rate limit
  const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: ipCount } = await adminClient
    .from("ai_ip_usage")
    .select("*", { count: "exact", head: true })
    .eq("ip", ip)
    .eq("function_name", FUNCTION_NAME)
    .gte("used_at", windowStart);
  if ((ipCount ?? 0) >= IP_LIMIT_PER_HOUR) {
    return jsonResponse({ error: "IP rate limit" }, 429);
  }

  // Global 24h ceiling
  const day = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: globalCount } = await adminClient
    .from("ai_ip_usage")
    .select("*", { count: "exact", head: true })
    .eq("function_name", FUNCTION_NAME)
    .gte("used_at", day);
  if ((globalCount ?? 0) >= GLOBAL_CEILING_24H) {
    return jsonResponse({ error: "Global ceiling" }, 503);
  }

  let payload: { requestId?: string };
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }
  const requestId = (payload.requestId ?? "").trim();
  if (!requestId) return jsonResponse({ error: "requestId krävs" }, 400);

  // Load the incoming request row
  const { data: row, error: rowErr } = await adminClient
    .from("incoming_requests")
    .select(
      "id, company_id, form_template_id, free_text, submitted_answers, submitter_name, submitter_email, submitter_phone, submitter_address, submitter_lat, submitter_lng, photos",
    )
    .eq("id", requestId)
    .maybeSingle();

  if (rowErr || !row) {
    return jsonResponse({ error: "Förfrågan hittades inte" }, 404);
  }
  const inc = row as IncomingRow;

  // Load firm context
  const { data: companyRow } = await adminClient
    .from("companies")
    .select("id, name")
    .eq("id", inc.company_id)
    .maybeSingle();
  const { data: profileRow } = await adminClient
    .from("company_business_profile")
    .select(
      "primary_trade, secondary_trades, specialties, base_address, base_lat, base_lng, service_radius_km, min_ticket_sek",
    )
    .eq("company_id", inc.company_id)
    .maybeSingle();

  const firm: FirmContext = {
    id: inc.company_id,
    name: (companyRow as { name?: string } | null)?.name ?? "Okänd firma",
    primary_trade:
      (profileRow as { primary_trade?: string } | null)?.primary_trade ?? "general",
    secondary_trades:
      (profileRow as { secondary_trades?: string[] } | null)?.secondary_trades ?? [],
    specialties:
      (profileRow as { specialties?: string[] } | null)?.specialties ?? [],
    base_address:
      (profileRow as { base_address?: string } | null)?.base_address ?? null,
    base_lat: (profileRow as { base_lat?: number } | null)?.base_lat ?? null,
    base_lng: (profileRow as { base_lng?: number } | null)?.base_lng ?? null,
    service_radius_km:
      (profileRow as { service_radius_km?: number } | null)?.service_radius_km ?? null,
    min_ticket_sek:
      (profileRow as { min_ticket_sek?: number } | null)?.min_ticket_sek ?? null,
  };

  // Firm's templates (subset by trade)
  const trades = Array.from(
    new Set([firm.primary_trade, ...firm.secondary_trades, "general"]),
  );
  const { data: tmplRows } = await adminClient
    .from("form_templates")
    .select("id, name, trade, sub_type, description, red_flag_rules")
    .in("trade", trades)
    .eq("is_active", true);
  const templates = (tmplRows ?? []) as Template[];

  // Compute distance if possible
  let distanceKm: number | null = null;
  if (
    firm.base_lat != null &&
    firm.base_lng != null &&
    inc.submitter_lat != null &&
    inc.submitter_lng != null
  ) {
    distanceKm = haversineKm(
      firm.base_lat,
      firm.base_lng,
      inc.submitter_lat,
      inc.submitter_lng,
    );
  }

  const photoCount = Array.isArray(inc.photos) ? inc.photos.length : 0;
  const submissionText = buildSubmissionText(inc);
  const submissionBlock = [
    submissionText,
    "",
    `Antal bifogade bilder: ${photoCount}`,
  ].join("\n");

  const firmBlock = buildFirmBlock(firm, templates, distanceKm);

  if (!anthropicApiKey) {
    return jsonResponse({ error: "ANTHROPIC_API_KEY saknas" }, 500);
  }

  // Call Claude
  const claudeOutput = await callClaude(anthropicApiKey, firmBlock, submissionBlock);
  if (!claudeOutput) {
    await adminClient.from("ai_ip_usage").insert({
      ip,
      function_name: FUNCTION_NAME,
    });
    return jsonResponse({ error: "Claude-anrop misslyckades" }, 502);
  }

  // --- Post-processing ---
  // 1. Strip red flags whose evidence isn't actually in the submission.
  const { verdict: stripped, removed } = stripUnverifiableRedFlags(
    claudeOutput,
    submissionText,
  );

  // 2. Compute final score + tier deterministically from sub-scores.
  const { score, tier } = computeFinalScore(stripped);
  let verdict: Verdict = { ...stripped, score, tier };

  // 3. Cap tier when confidence is låg.
  const confCap = applyConfidenceCap(verdict);
  verdict = confCap.verdict;

  // needs_human_review: respect the model's own flag + raise if we stripped
  // red flags or the confidence cap demoted the tier.
  const needsReview =
    verdict.needs_human_review || removed > 0 || confCap.adjusted;

  // Persist
  const { error: updateErr } = await adminClient
    .from("incoming_requests")
    .update({
      ai_score: verdict.score,
      ai_tier: verdict.tier,
      ai_confidence: verdict.confidence,
      ai_verdict: verdict,
      needs_human_review: needsReview,
    })
    .eq("id", inc.id);

  if (updateErr) {
    console.error(`[${FUNCTION_NAME}] update-error: ${updateErr.message}`);
  }

  await adminClient.from("ai_ip_usage").insert({
    ip,
    function_name: FUNCTION_NAME,
  });

  return jsonResponse(
    {
      id: inc.id,
      score: verdict.score,
      tier: verdict.tier,
      confidence: verdict.confidence,
      adjusted: needsReview,
    },
    200,
  );
});
