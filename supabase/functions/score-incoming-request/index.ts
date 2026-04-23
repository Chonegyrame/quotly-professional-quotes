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
// Scoring engine: reads an incoming_requests row, scores it via
// Claude Sonnet with forced tool-use (score_lead), post-processes
// for evidence/arithmetic/tier consistency, and writes results
// back to the row.
//
// Trigger: invoked synchronously from submit-intake-request right
// after insert. Phase 4 (Inbox UI) reads the resulting ai_verdict.
// ============================================================

// ---------- Tier thresholds ----------
const TIER_THRESHOLDS = {
  Hett: 75,
  Ljummet: 45,
  Kallt: 0,
} as const;

type Tier = keyof typeof TIER_THRESHOLDS;

function tierForScore(score: number): Tier {
  if (score >= TIER_THRESHOLDS.Hett) return "Hett";
  if (score >= TIER_THRESHOLDS.Ljummet) return "Ljummet";
  return "Kallt";
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
      score: {
        type: "integer",
        minimum: 0,
        maximum: 100,
        description:
          "Övergripande poäng, viktat: 0.45 * fit + 0.35 * intent + 0.20 * clarity. Avrunda till heltal.",
      },
      tier: {
        type: "string",
        enum: ["Hett", "Ljummet", "Kallt"],
        description:
          "Tier baserat på score: 75-100=Hett, 45-74=Ljummet, 0-44=Kallt.",
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
      "score",
      "tier",
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
Produce en strukturerad bedömning via verktyget score_lead. Fältet "reasoning" kommer FÖRST i schemat — tänk där, sedan ge siffrorna. Bedömningen ska:
1. Vara kalibrerad mot rubriken nedan.
2. Ha evidence för VARJE röd flagga (ordagrant citat ur kundens förfrågan).
3. Matcha tier mot score enligt gränser.
4. Sänka confidence till "låg" vid gles eller tvetydig information.

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

TIER (utifrån score)
- Hett: 75–100
- Ljummet: 45–74
- Kallt: 0–44

SAMMANRÄKNING
score = round(0.45 * fit_score + 0.35 * intent_score + 0.20 * clarity_score)

BILD-SIGNAL
Photo_count (antal bifogade bilder) påverkar clarity_score positivt:
- 0 bilder: ingen bonus
- 1–2 bilder: +5 till clarity om de är relevanta för uppdraget
- 3+ bilder: +10 till clarity
Observera att vissa mallar kräver bild — då är det förväntat, inte bonus.

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
- skapa_offert: tier = Hett eller Ljummet OCH confidence != låg
- artigt_avböj: tier = Kallt ELLER score < 30 ELLER jobbet ligger helt utanför firmans bransch/område
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

type Verdict = {
  reasoning: string;
  parsed_fields: Record<string, unknown> & { photo_count?: number };
  fit_score: number;
  intent_score: number;
  clarity_score: number;
  score: number;
  tier: Tier;
  summary: string;
  green_flags: Array<{ label: string; evidence: string }>;
  red_flags: Array<{ label: string; evidence: string; severity: string }>;
  next_step: { action: string; suggested_message?: string | null };
  confidence: "hög" | "medel" | "låg";
  needs_human_review: boolean;
};

function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.,;:!?"'()[\]{}]/g, "")
    .trim();
}

function stripUnverifiableRedFlags(
  verdict: Verdict,
  submissionText: string,
): { verdict: Verdict; removed: number } {
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

function enforceArithmetic(verdict: Verdict): { verdict: Verdict; adjusted: boolean } {
  const expected = Math.round(
    0.45 * verdict.fit_score +
      0.35 * verdict.intent_score +
      0.20 * verdict.clarity_score,
  );
  const diff = Math.abs(expected - verdict.score);
  if (diff <= 5) return { verdict, adjusted: false };
  return { verdict: { ...verdict, score: expected }, adjusted: true };
}

function enforceTierConsistency(
  verdict: Verdict,
): { verdict: Verdict; adjusted: boolean } {
  const expected = tierForScore(verdict.score);
  if (expected === verdict.tier) return { verdict, adjusted: false };
  return { verdict: { ...verdict, tier: expected }, adjusted: true };
}

function applyConfidenceCap(
  verdict: Verdict,
): { verdict: Verdict; adjusted: boolean } {
  if (verdict.confidence !== "låg") return { verdict, adjusted: false };
  if (verdict.tier === "Hett") {
    return {
      verdict: { ...verdict, tier: "Ljummet" as Tier },
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
): Promise<Verdict | null> {
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
    return toolUse.input as Verdict;
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
  let verdict = await callClaude(anthropicApiKey, firmBlock, submissionBlock);
  if (!verdict) {
    await adminClient.from("ai_ip_usage").insert({
      ip,
      function_name: FUNCTION_NAME,
    });
    return jsonResponse({ error: "Claude-anrop misslyckades" }, 502);
  }

  // --- Post-processing ---
  let adjustedAny = false;

  const { verdict: v1, removed } = stripUnverifiableRedFlags(verdict, submissionText);
  if (removed > 0) adjustedAny = true;
  verdict = v1;

  const arith = enforceArithmetic(verdict);
  if (arith.adjusted) adjustedAny = true;
  verdict = arith.verdict;

  const tierCons = enforceTierConsistency(verdict);
  if (tierCons.adjusted) adjustedAny = true;
  verdict = tierCons.verdict;

  const confCap = applyConfidenceCap(verdict);
  if (confCap.adjusted) adjustedAny = true;
  verdict = confCap.verdict;

  // needs_human_review: respect the model's own flag + auto-raise if any
  // guardrail triggered corrections.
  const needsReview = verdict.needs_human_review || adjustedAny;

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
      adjusted: adjustedAny,
    },
    200,
  );
});
