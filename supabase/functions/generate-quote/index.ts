import {
  authenticate,
  checkGlobalAiCeiling,
  checkIpRateLimit,
  corsHeaders,
  jsonResponse,
} from "../_shared/auth.ts";
import { scoreSharedKeywords } from "../_shared/scoring.ts";

const FUNCTION_NAME = "generate-quote";
const DAILY_LIMIT = 20;
const IP_LIMIT_PER_HOUR = 10;
const GLOBAL_AI_CEILING_24H = 500;

const TRADE_LABELS: Record<string, string> = {
  bygg: "bygg",
  el: "el",
  vvs: "VVS",
  general: "hantverks",
};

async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  const bytes = new Uint8Array(buf);
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}

// ============================================================
// Keyword extraction (Haiku) — dual-token: verb+noun phrases + standalone nouns.
// Keep this prompt in sync with supabase/functions/extract-keywords/index.ts.
// ============================================================

async function extractKeywords(
  text: string | undefined,
  image: string | undefined,
  anthropicApiKey: string,
): Promise<string[]> {
  const extractionPrompt =
    "Extrahera jobbspecifika nyckelord från denna kundförfrågan.\n\n" +
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

  const content = image
    ? [
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } },
        { type: "text", text: extractionPrompt },
      ]
    : [{ type: "text", text: `${extractionPrompt}\n\nFörfrågan: ${text}` }];

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
      messages: [{ role: "user", content }],
    }),
  });

  if (!res.ok) return [];

  try {
    const data = await res.json();
    let raw: string = data.content?.[0]?.text ?? "[]";
    raw = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((k: any) => String(k).toLowerCase()) : [];
  } catch {
    return [];
  }
}

// ============================================================
// Prompt builders for each layer
// ============================================================

function buildLayer1Section(profile: any): string {
  if (!profile || profile.total_quotes === 0) return "";

  const materials = (profile.common_materials ?? [])
    .slice(0, 10)
    .map((m: any) => `- ${m.name} (${Math.round(m.frequency * 100)}% av offerter, snitt ${m.avg_quantity} ${m.unit ?? "st"} à ${m.avg_unit_price} kr)`)
    .join("\n");

  if (!materials) return "";

  const laborMin = profile.typical_labor_p10 ?? profile.typical_labor_min;
  const laborMax = profile.typical_labor_p90 ?? profile.typical_labor_max;

  return `--- ANVÄNDARPROFIL (${profile.total_quotes} offerter) ---
Material som denna användare ofta inkluderar:
${materials}
Typiskt arbetsintervall: ${laborMin}–${laborMax} kr (snitt: ${profile.typical_labor_avg} kr)
`;
}

function buildSingleLayer2Block(pattern: any, includeUnscaledLabel: boolean = false): string {
  const materialSuffix = includeUnscaledLabel ? " (historiskt snitt, ej storleksjusterad)" : "";
  const laborSuffix = includeUnscaledLabel ? " (historiskt snitt)" : "";
  const trailingNote = includeUnscaledLabel
    ? "\n(För storleksjusterad prissättning, se STORLEKSJUSTERAD REFERENS nedan.)"
    : "";

  const materials = (pattern.common_materials ?? [])
    .slice(0, 8)
    .map((m: any) => `- ${m.name}: ${Math.round(m.frequency * 100)}% av jobb, snitt ${m.avg_quantity} ${m.unit ?? "st"} à ${m.avg_unit_price} kr${materialSuffix}`)
    .join("\n");

  const items = (pattern.typical_line_items ?? [])
    .slice(0, 6)
    .map((i: any) => `- ${i.description} (snitt ${i.avg_labor} kr arbete)`)
    .join("\n");

  const strength = pattern.occurrence_count >= 8
    ? "välkänd jobbtyp"
    : pattern.occurrence_count >= 5
      ? "känd jobbtyp"
      : "igenkänd jobbtyp";

  return `--- JOBBMÖNSTER (${strength}, utfört ${pattern.occurrence_count} gånger) ---
${pattern.occurrence_count >= 5
    ? "Reproducera denna struktur nära, anpassa efter kundens specifika önskemål."
    : "Använd som referens, inte som strikt mall."}
${items ? `Typiska arbetsrader:\n${items}` : ""}
${materials ? `Vanliga material:\n${materials}` : ""}
Snitt totalt arbete: ${pattern.avg_total_labor} kr${laborSuffix}${trailingNote}
`;
}

function buildLayer2Section(patterns: any[], opts: { includeUnscaledLabel?: boolean } = {}): string {
  if (!patterns || patterns.length === 0) {
    return `--- INGEN LIKNANDE TIDIGARE OFFERT HITTADES ---
Inga tillräckligt liknande tidigare jobb i användarens historik. Använd branschstandard och inputen som enda grund.
`;
  }
  const includeUnscaledLabel = opts.includeUnscaledLabel ?? false;
  return patterns.map((p) => buildSingleLayer2Block(p, includeUnscaledLabel)).join("\n");
}

function buildLayer4Section(
  additions: { material_name: string; keyword_count: number; trade_count: number }[],
  removals: { material_name: string; keyword_count: number; trade_count: number }[],
  tradeDenominator: number,
  keywordDenominator: number,
): string {
  // --- Additions (materials user consistently adds) ---
  const addKeywordSpecific: string[] = [];
  const addTradeWide: string[] = [];

  for (const l of additions) {
    const keywordRatio = keywordDenominator > 0 ? l.keyword_count / keywordDenominator : 0;
    const tradeRatio = tradeDenominator > 0 ? l.trade_count / tradeDenominator : 0;

    if (keywordRatio >= 0.4 && l.keyword_count >= 2) {
      addKeywordSpecific.push(
        `- ${l.material_name} — tillagt i ${l.keyword_count} av ${keywordDenominator} liknande jobb (${Math.round(keywordRatio * 100)}%)`
      );
    } else if (tradeRatio >= 0.15 && l.trade_count >= 3) {
      addTradeWide.push(
        `- ${l.material_name} — tillagt i ${l.trade_count} av ${tradeDenominator} jobb (${Math.round(tradeRatio * 100)}%)`
      );
    }
  }

  // --- Removals (materials user consistently rejects) ---
  const removeKeywordSpecific: string[] = [];
  const removeTradeWide: string[] = [];

  for (const l of removals) {
    const keywordRatio = keywordDenominator > 0 ? l.keyword_count / keywordDenominator : 0;
    const tradeRatio = tradeDenominator > 0 ? l.trade_count / tradeDenominator : 0;

    if (keywordRatio >= 0.4 && l.keyword_count >= 2) {
      removeKeywordSpecific.push(
        `- ${l.material_name} — borttagen i ${l.keyword_count} av ${keywordDenominator} liknande jobb (${Math.round(keywordRatio * 100)}%)`
      );
    } else if (tradeRatio >= 0.15 && l.trade_count >= 3) {
      removeTradeWide.push(
        `- ${l.material_name} — borttagen i ${l.trade_count} av ${tradeDenominator} jobb (${Math.round(tradeRatio * 100)}%)`
      );
    }
  }

  // Cap at 5 per tier
  const addKw = addKeywordSpecific.slice(0, 5);
  const addTw = addTradeWide.slice(0, 5);
  const remKw = removeKeywordSpecific.slice(0, 5);
  const remTw = removeTradeWide.slice(0, 5);

  const hasAdditions = addKw.length > 0 || addTw.length > 0;
  const hasRemovals = remKw.length > 0 || remTw.length > 0;

  if (!hasAdditions && !hasRemovals) return "";

  let section = `--- ANVÄNDARKORREKTIONER ---\n`;

  if (hasAdditions) {
    section += `Följande material har lagts till manuellt av denna användare efter AI-generering.\nInkludera bara om det passar aktuellt jobb — behandla som erfaren-kollega-råd.\n`;
    if (addKw.length > 0) section += `\nJobbspecifika tillägg:\n${addKw.join("\n")}\n`;
    if (addTw.length > 0) section += `\nGenerella tillägg:\n${addTw.join("\n")}\n`;
  }

  if (hasRemovals) {
    section += `\nFöljande material har tagits bort upprepade gånger av denna användare.\nUNDVIK dessa material för denna typ av jobb om det inte är tydligt motiverat.\n`;
    if (remKw.length > 0) section += `\nJobbspecifika borttagningar:\n${remKw.join("\n")}\n`;
    if (remTw.length > 0) section += `\nGenerella borttagningar:\n${remTw.join("\n")}\n`;
  }

  return section;
}

// ============================================================
// Layer 5 (size-scaled ratios) + keyword sub-aggregate helpers.
// Both operate on raw cluster member rows fetched at generate time.
// ============================================================

function scopeMembersToPattern(members: any[], pattern: any): any[] {
  const memberIds: string[] | null = Array.isArray(pattern.member_quote_ids)
    ? pattern.member_quote_ids
    : null;
  if (memberIds && memberIds.length > 0) {
    const idSet = new Set(memberIds);
    return members.filter((m: any) => idSet.has(m.id));
  }
  // Legacy fallback: pre-migration rows have NULL member_quote_ids.
  // Rebuild membership via keyword score until the user's next send
  // repopulates the column.
  console.warn("[generate-quote] legacy pattern fallback — no member_quote_ids");
  const patternKw: string[] = pattern.pattern_keywords ?? [];
  if (patternKw.length === 0) return [];
  return members.filter((m: any) => {
    const memKw: string[] = m.keywords ?? [];
    return scoreSharedKeywords(patternKw, memKw) >= 3;
  });
}

function sumMemberLabor(m: any): number {
  let sum = 0;
  for (const it of m.quote_items ?? []) sum += Number(it.unit_price ?? 0);
  return sum;
}

function aggregateMemberMaterials(
  m: any,
): Map<string, { quantity: number; unit: string; unit_price: number }> {
  const map = new Map<string, { quantity: number; unit: string; unit_price: number }>();
  for (const it of m.quote_items ?? []) {
    for (const mat of it.quote_item_materials ?? []) {
      const key = String(mat.name ?? "").trim().toLowerCase();
      if (!key) continue;
      const qty = Number(mat.quantity ?? 0);
      const unit = String(mat.unit ?? "st");
      const price = Number(mat.unit_price ?? 0);
      const existing = map.get(key);
      if (existing) {
        existing.quantity += qty;
      } else {
        map.set(key, { quantity: qty, unit, unit_price: price });
      }
    }
  }
  return map;
}

function buildLayer5Section(
  _pattern: any,
  scopedMembers: any[],
  input: { job_size?: number | null; job_size_unit?: string | null },
): string {
  const size = typeof input.job_size === "number" ? input.job_size : 0;
  const unit = input.job_size_unit;
  if (!size || size <= 0 || !unit) return "";

  const candidates = scopedMembers.filter(
    (m: any) =>
      typeof m.job_size === "number" &&
      m.job_size > 0 &&
      m.job_size_unit === unit,
  );

  const smaller = candidates
    .filter((m: any) => m.job_size < size)
    .sort((a: any, b: any) => b.job_size - a.job_size)
    .slice(0, 2);
  const larger = candidates
    .filter((m: any) => m.job_size > size)
    .sort((a: any, b: any) => a.job_size - b.job_size)
    .slice(0, 2);

  // Prefer strong tier (2 + 2 bracketed). Fall back to weak tier when
  // only one side has ≥2 neighbors (input is larger/smaller than all
  // history). Weak tier skips the CV filter because a 2-point variance
  // isn't meaningful signal.
  let neighbors: any[];
  let isWeakTier = false;
  let weakSide: "mindre" | "större" | "" = "";
  if (smaller.length >= 2 && larger.length >= 2) {
    neighbors = [...smaller, ...larger];
  } else if (smaller.length >= 2) {
    neighbors = smaller;
    isWeakTier = true;
    weakSide = "mindre";
  } else if (larger.length >= 2) {
    neighbors = larger;
    isWeakTier = true;
    weakSide = "större";
  } else {
    return "";
  }

  const perMember = neighbors.map((m: any) => ({
    size: Number(m.job_size),
    materials: aggregateMemberMaterials(m),
  }));

  const allNames = new Set<string>();
  for (const pm of perMember) for (const name of pm.materials.keys()) allNames.add(name);

  const materialLines: string[] = [];
  for (const name of allNames) {
    const appearances: { qty: number; size: number; unit: string }[] = [];
    let firstUnit = "";
    let inconsistentUnit = false;
    for (const pm of perMember) {
      const entry = pm.materials.get(name);
      if (!entry) continue;
      if (!firstUnit) {
        firstUnit = entry.unit;
      } else if (firstUnit !== entry.unit) {
        inconsistentUnit = true;
        break;
      }
      appearances.push({ qty: entry.quantity, size: pm.size, unit: entry.unit });
    }
    if (inconsistentUnit) continue;
    if (appearances.length < 2) continue;

    const ratios = appearances.map((a) => a.qty / a.size);
    const mean = ratios.reduce((s, v) => s + v, 0) / ratios.length;
    if (mean === 0) continue;
    if (!isWeakTier) {
      const variance = ratios.reduce((s, v) => s + (v - mean) ** 2, 0) / ratios.length;
      const cv = Math.sqrt(variance) / mean;
      if (cv >= 0.3) continue;
    }

    const ratioFmt = Math.round(mean * 100) / 100;
    const absFmt = Math.round(mean * size * 10) / 10;
    materialLines.push(`- ${name}: ${ratioFmt} ${firstUnit} per ${unit} → ~${absFmt} ${firstUnit}`);
  }

  const laborRatios = neighbors.map(
    (m: any) => sumMemberLabor(m) / Number(m.job_size),
  );
  const avgLaborRatio = laborRatios.reduce((s, v) => s + v, 0) / laborRatios.length;
  const multipliedLabor = Math.round(avgLaborRatio * size);
  const laborQualifies = avgLaborRatio > 0 && multipliedLabor > 0;

  if (materialLines.length === 0 && !laborQualifies) return "";

  const neighborSizes = neighbors.map((m: any) => m.job_size).join("/");
  const headerDetail = isWeakTier
    ? `baserad på 2 ${weakSide} jobb: ${neighborSizes} — extrapolerad`
    : `4 jämförbara jobb: ${neighborSizes}`;
  let block = `--- STORLEKSJUSTERAD REFERENS (${size} ${unit}, ${headerDetail}) ---\n`;
  if (materialLines.length > 0) block += materialLines.join("\n") + "\n";
  if (laborQualifies) {
    block += `Arbete: ${Math.round(avgLaborRatio)} kr per ${unit} → ~${multipliedLabor} kr\n`;
  }
  return block;
}

function buildSingleSubAggregateBlock(
  keyword: string,
  filtered: any[],
  totalInCluster: number,
  topAvgLabor: number,
): string {
  const groupSize = filtered.length;

  const matCounts = new Map<
    string,
    { count: number; totalQty: number; totalPrice: number; units: Map<string, number> }
  >();
  for (const m of filtered) {
    const seen = new Set<string>();
    for (const it of m.quote_items ?? []) {
      for (const mat of it.quote_item_materials ?? []) {
        const name = String(mat.name ?? "").trim().toLowerCase();
        if (!name || seen.has(name)) continue;
        seen.add(name);
        const existing = matCounts.get(name) ?? {
          count: 0,
          totalQty: 0,
          totalPrice: 0,
          units: new Map<string, number>(),
        };
        existing.count++;
        existing.totalQty += Number(mat.quantity ?? 0);
        existing.totalPrice += Number(mat.unit_price ?? 0);
        const u = String(mat.unit ?? "st");
        existing.units.set(u, (existing.units.get(u) ?? 0) + 1);
        matCounts.set(name, existing);
      }
    }
  }
  const matThreshold = groupSize * 0.3;
  const commonMaterials = [...matCounts.entries()]
    .filter(([_, d]) => d.count >= matThreshold)
    .map(([name, d]) => {
      let bestUnit = "st";
      let bestCount = -1;
      for (const [u, c] of d.units) {
        if (c > bestCount) { bestUnit = u; bestCount = c; }
      }
      return {
        name,
        frequency: Math.round((d.count / groupSize) * 100),
        avg_quantity: Math.round((d.totalQty / d.count) * 10) / 10,
        avg_unit_price: Math.round(d.totalPrice / d.count),
        unit: bestUnit,
      };
    })
    .sort((a, b) => b.frequency - a.frequency);

  const itemCounts = new Map<string, { count: number; totalLabor: number }>();
  for (const m of filtered) {
    for (const it of m.quote_items ?? []) {
      const key = String(it.description ?? "").trim().toLowerCase();
      if (!key) continue;
      const existing = itemCounts.get(key) ?? { count: 0, totalLabor: 0 };
      existing.count++;
      existing.totalLabor += Number(it.unit_price ?? 0);
      itemCounts.set(key, existing);
    }
  }
  const itemThreshold = groupSize * 0.3;
  const typicalItems = [...itemCounts.entries()]
    .filter(([_, d]) => d.count >= itemThreshold)
    .map(([description, d]) => ({
      description,
      frequency: Math.round((d.count / groupSize) * 100),
      avg_labor: Math.round(d.totalLabor / d.count),
    }))
    .sort((a, b) => b.frequency - a.frequency);

  const subAvgLabor = Math.round(
    filtered.reduce((s: number, m: any) => s + sumMemberLabor(m), 0) / groupSize,
  );

  const addCounts = new Map<string, number>();
  const remCounts = new Map<string, number>();
  for (const m of filtered) {
    const ai = m.ai_suggestions;
    if (!ai || !Array.isArray(ai.items)) continue;
    const aiNames = new Set<string>();
    for (const it of ai.items) {
      for (const mat of it.materials ?? []) {
        const n = String(mat.name ?? "").trim().toLowerCase();
        if (n) aiNames.add(n);
      }
    }
    const savedNames = new Set<string>();
    for (const it of m.quote_items ?? []) {
      for (const mat of it.quote_item_materials ?? []) {
        const n = String(mat.name ?? "").trim().toLowerCase();
        if (n) savedNames.add(n);
      }
    }
    for (const n of savedNames) {
      if (!aiNames.has(n)) addCounts.set(n, (addCounts.get(n) ?? 0) + 1);
    }
    for (const n of aiNames) {
      if (!savedNames.has(n)) remCounts.set(n, (remCounts.get(n) ?? 0) + 1);
    }
  }
  const corrThreshold = Math.max(2, Math.ceil(groupSize * 0.4));
  const additions = [...addCounts.entries()]
    .filter(([_, c]) => c >= corrThreshold)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const removals = [...remCounts.entries()]
    .filter(([_, c]) => c >= corrThreshold)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const tinySampleCaveat =
    groupSize === 2 && totalInCluster > 0 && groupSize / totalInCluster < 0.05
      ? ", litet urval, använd som vägledning"
      : "";
  let block = `--- SPECIFIKT FÖR ${keyword.toUpperCase()} (${groupSize} jobb av ${totalInCluster}${tinySampleCaveat}) ---\n`;

  if (commonMaterials.length > 0) {
    block += `Vanliga material (endast dessa jobb):\n`;
    for (const mat of commonMaterials.slice(0, 8)) {
      block += `- ${mat.name}: ${mat.frequency}% av dessa jobb, snitt ${mat.avg_quantity} ${mat.unit ?? "st"} à ${mat.avg_unit_price} kr\n`;
    }
  }

  if (typicalItems.length > 0) {
    block += `Typiska arbetsrader:\n`;
    for (const it of typicalItems.slice(0, 6)) {
      block += `- ${it.description} (snitt ${it.avg_labor} kr arbete)\n`;
    }
  }

  block += `Snitt totalt arbete: ${subAvgLabor} kr (top-level var ${topAvgLabor} kr)\n`;

  if (additions.length > 0 || removals.length > 0) {
    block += `Användarkorrektioner:\n`;
    if (additions.length > 0) {
      block += `  Tillägg:\n`;
      for (const [name, count] of additions) {
        block += `  - ${name} — tillagt i ${count} av ${groupSize} jobb\n`;
      }
    }
    if (removals.length > 0) {
      block += `  Borttagningar:\n`;
      for (const [name, count] of removals) {
        block += `  - ${name} — borttaget i ${count} av ${groupSize} jobb\n`;
      }
    }
  }

  return block;
}

function buildSubAggregateSections(
  pattern: any,
  scopedMembers: any[],
  inputKeywords: string[],
): string {
  if (scopedMembers.length === 0 || inputKeywords.length === 0) return "";
  const patternKwSet = new Set<string>(pattern.pattern_keywords ?? []);
  const totalInCluster = scopedMembers.length;
  const topAvgLabor = Number(pattern.avg_total_labor ?? 0);

  const candidates: { keyword: string; members: any[] }[] = [];
  for (const kw of inputKeywords) {
    if (patternKwSet.has(kw)) continue;
    const filtered = scopedMembers.filter((m: any) =>
      Array.isArray(m.keywords) && m.keywords.includes(kw),
    );
    if (filtered.length < 2) continue;
    candidates.push({ keyword: kw, members: filtered });
  }

  if (candidates.length === 0) return "";

  candidates.sort((a, b) => b.members.length - a.members.length);
  const kept = candidates.slice(0, 2);

  const blocks: string[] = [];
  for (const cand of kept) {
    const block = buildSingleSubAggregateBlock(
      cand.keyword,
      cand.members,
      totalInCluster,
      topAvgLabor,
    );
    if (block) blocks.push(block);
  }

  return blocks.join("\n");
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
    const { userId, ip, authClient, adminClient } = auth;

    // Global circuit breaker for AI cost.
    const ceilingResp = await checkGlobalAiCeiling(
      adminClient,
      GLOBAL_AI_CEILING_24H,
      FUNCTION_NAME,
    );
    if (ceilingResp) return ceilingResp;

    // Per-IP rate limit.
    const ipResp = await checkIpRateLimit(
      adminClient,
      ip,
      FUNCTION_NAME,
      IP_LIMIT_PER_HOUR,
      60,
    );
    if (ipResp) return ipResp;

    // --- Parse body ---
    const { text, image, company_id, trade, job_size, job_size_unit, request_id } = await req.json() as {
      text?: string;
      image?: string;
      company_id: string;
      trade: "bygg" | "el" | "vvs" | "general";
      job_size?: number | null;
      job_size_unit?: "kvm" | "m" | "m3" | null;
      request_id?: string;
    };

    if (!company_id || !trade) {
      return jsonResponse({ error: "Missing required fields: company_id, trade" }, 400);
    }

    if (!text && !image) {
      return jsonResponse({ error: "Provide either text or image" }, 400);
    }

    // --- Idempotency: hash the inputs so retries only return the cached
    //     response if the payload actually matches. ---
    const inputHash = await sha256Hex(
      JSON.stringify({
        text: text ?? null,
        image: image ?? null,
        company_id,
        trade,
        job_size: job_size ?? null,
        job_size_unit: job_size_unit ?? null,
      }),
    );

    if (request_id) {
      const cutoff = new Date(Date.now() - 60_000).toISOString();
      const { data: cached } = await adminClient
        .from("ai_idempotency_cache")
        .select("response, input_hash, created_at")
        .eq("user_id", userId)
        .eq("request_id", request_id)
        .gte("created_at", cutoff)
        .maybeSingle();
      if (cached && (cached as any).input_hash === inputHash) {
        return new Response(
          JSON.stringify((cached as any).response),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // Per-user daily limit — atomic claim via advisory-lock RPC so
    // concurrent requests can't exceed DAILY_LIMIT.
    const { data: claimOk, error: claimErr } = await adminClient.rpc("claim_ai_usage_slot", {
      p_user_id: userId,
      p_daily_limit: DAILY_LIMIT,
    });
    if (claimErr) {
      console.error("[generate-quote] claim_ai_usage_slot error:", claimErr);
      return jsonResponse({ error: "Internt serverfel, försök igen" }, 500);
    }
    if (claimOk === false) {
      return jsonResponse(
        { error: "Daglig gräns nådd (20 genereringar per dag)" },
        429,
      );
    }

    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicApiKey) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // --- Step 1: Extract keywords ---
    const inputKeywords = await extractKeywords(text, image, anthropicApiKey);

    // --- Step 2: Parallel data fetching ---
    const [
      tradeProfileResult,
      jobPatternsResult,
      tradeMaterialsResult,
      companyMaterialsResult,
      learningsResult,
      keywordDenominatorResult,
      clusterMembersResult,
    ] = await Promise.all([
      // Layer 1: Firm trade profile (Chunk B — pooled across all members)
      authClient
        .from("company_trade_profiles")
        .select("*")
        .eq("company_id", company_id)
        .eq("trade", trade)
        .maybeSingle(),

      // Layer 2: Matching job patterns (firm-scoped)
      inputKeywords.length > 0
        ? authClient
            .from("company_job_patterns")
            .select("*")
            .eq("company_id", company_id)
            .eq("trade", trade)
            .overlaps("pattern_keywords", inputKeywords)
        : Promise.resolve({ data: [] }),

      // Global trade materials
      authClient
        .from("trade_materials")
        .select("name, unit, unit_price, purchase_price, markup_percent")
        .eq("category", trade)
        .eq("is_active", true)
        .order("name"),

      // User's own company materials
      authClient
        .from("materials")
        .select("name, unit, unit_price, purchase_price, markup_percent")
        .eq("company_id", company_id)
        .eq("is_deleted", false)
        .order("name"),

      // Layer 4: All correction learnings for this trade (firm-scoped —
      // additions + removals from every member's quotes)
      authClient
        .from("company_material_learnings")
        .select("material_name, job_keywords, learning_type")
        .eq("company_id", company_id)
        .eq("trade", trade),

      // Layer 4: Keyword denominator (quotes with overlapping keywords)
      inputKeywords.length > 0
        ? authClient
            .from("quotes")
            .select("*", { count: "exact", head: true })
            .eq("company_id", company_id)
            .eq("trade", trade)
            .in("status", ["sent", "accepted", "completed"])
            .overlaps("keywords", inputKeywords)
        : Promise.resolve({ count: 0 }),

      // Layer 5 + sub-aggregates: raw cluster-member rows (quote_items +
      // materials + ai_suggestions). Scoped later per selected pattern.
      inputKeywords.length > 0
        ? authClient
            .from("quotes")
            .select(
              "id, keywords, job_size, job_size_unit, ai_suggestions, quote_items(description, unit_price, quote_item_materials(name, quantity, unit, unit_price))"
            )
            .eq("company_id", company_id)
            .eq("trade", trade)
            .in("status", ["sent", "accepted", "completed"])
            .overlaps("keywords", inputKeywords)
        : Promise.resolve({ data: [] }),
    ]);

    const tradeProfile = tradeProfileResult.data;
    const jobPatterns = (jobPatternsResult as any).data ?? [];
    const tradeMaterials = tradeMaterialsResult.data ?? [];
    const companyMaterials = companyMaterialsResult.data ?? [];
    const allLearnings = learningsResult.data ?? [];
    const keywordDenominator = (keywordDenominatorResult as any).count ?? 0;
    const tradeDenominator = tradeProfile?.total_quotes ?? 0;
    const clusterMembers = (clusterMembersResult as any).data ?? [];

    // --- Step 3: Find top-2 Layer 2 pattern matches (weighted scoring) ---
    // Score = sum of shared token weights (phrase=2, noun=1).
    // Each pattern passes the tier gate independently:
    //   Strong:   score ≥ 4 AND ≥1 phrase token matched, OR score ≥ 5 (nouns only).
    //   Moderate: score ≥ 3.
    //   Skip:     below 3.
    const selectedPatterns: any[] = [];
    if (jobPatterns.length > 0 && inputKeywords.length > 0) {
      const inputSet = new Set(inputKeywords);
      const scored = jobPatterns
        .map((p: any) => {
          const patternKw: string[] = p.pattern_keywords ?? [];
          const score = scoreSharedKeywords(patternKw, inputKeywords);
          const hasPhraseMatch = patternKw.some(
            (t) => t.includes("_") && inputSet.has(t),
          );
          return { ...p, _score: score, _hasPhrase: hasPhraseMatch };
        })
        .sort((a: any, b: any) => b._score - a._score);

      for (const p of scored.slice(0, 2)) {
        const isStrong = (p._score >= 4 && p._hasPhrase) || p._score >= 5;
        const isModerate = p._score >= 3;
        if (isStrong || isModerate) selectedPatterns.push(p);
      }
    }

    // --- Step 4: Aggregate Layer 4 learnings (additions + removals separately) ---
    const additionAgg = new Map<string, { keyword_count: number; trade_count: number }>();
    const removalAgg = new Map<string, { keyword_count: number; trade_count: number }>();

    for (const l of allLearnings) {
      const name = (l as any).material_name;
      const type = (l as any).learning_type ?? "addition";
      const agg = type === "removal" ? removalAgg : additionAgg;

      const existing = agg.get(name) ?? { keyword_count: 0, trade_count: 0 };
      existing.trade_count++;
      const lkw = (l as any).job_keywords ?? [];
      if (inputKeywords.length > 0 && lkw.some((kw: string) => inputKeywords.includes(kw))) {
        existing.keyword_count++;
      }
      agg.set(name, existing);
    }

    const aggregatedAdditions = [...additionAgg.entries()].map(([material_name, counts]) => ({
      material_name,
      ...counts,
    }));
    const aggregatedRemovals = [...removalAgg.entries()].map(([material_name, counts]) => ({
      material_name,
      ...counts,
    }));

    // --- Step 5: Merge material catalogs (user materials take priority) ---
    const companyNameSet = new Set(
      companyMaterials.map((m: any) => m.name.trim().toLowerCase())
    );
    const mergedMaterials = [
      ...companyMaterials,
      ...tradeMaterials.filter(
        (m: any) => !companyNameSet.has(m.name.trim().toLowerCase())
      ),
    ];

    const materialsList = mergedMaterials.length > 0
      ? mergedMaterials
          .map((m: any) => `- ${m.name}, ${m.unit_price} kr/${m.unit}`)
          .join("\n")
      : "Inga specifika material tillgängliga — använd din kunskap om svenska marknadspriser.";

    // --- Step 6: Build prompt ---
    const tradeLabel = TRADE_LABELS[trade] ?? trade;

    const layer1Section = buildLayer1Section(tradeProfile);

    // Layer 5 + sub-aggregates: per-pattern scoped member sets, built once.
    const perPatternMembers = selectedPatterns.map((p) =>
      scopeMembersToPattern(clusterMembers, p),
    );
    const layer5Blocks = selectedPatterns.map((p, i) =>
      buildLayer5Section(p, perPatternMembers[i], { job_size, job_size_unit }),
    );
    const subAggBlocks = selectedPatterns.map((p, i) =>
      buildSubAggregateSections(p, perPatternMembers[i], inputKeywords),
    );
    const shouldReframeLayer2 = layer5Blocks.some((s) => s !== "");

    const layer2Section = buildLayer2Section(selectedPatterns, {
      includeUnscaledLabel: shouldReframeLayer2,
    });
    const layer5Joined = layer5Blocks.filter(Boolean).join("\n");
    const subAggJoined = subAggBlocks.filter(Boolean).join("\n");
    const layer4Section = buildLayer4Section(
      aggregatedAdditions,
      aggregatedRemovals,
      tradeDenominator,
      keywordDenominator,
    );

    const jobSizeLine =
      typeof job_size === "number" && job_size > 0 && job_size_unit
        ? `OMFATTNING: ${job_size} ${job_size_unit}\n\n`
        : "";

    const promptText = `Du är en offertassistent för en svensk ${tradeLabel}-hantverkare.
Svara ALLTID på svenska. Alla priser i SEK.

${layer1Section}${layer2Section}${layer5Joined}${subAggJoined}${layer4Section}TILLGÄNGLIGA MATERIAL (prioritera dessa för prissättning):
${materialsList}

${jobSizeLine}KUNDENS FÖRFRÅGAN:
${text ?? "[Se bifogad bild]"}

INSTRUKTIONER:
- Dela upp arbetet i logiska poster (items) baserat på förfrågan
- labor_price = totalt arbetspris för den posten i SEK (inte timpris)
- Var konservativ med materialkvantiteter — hellre lite för lite än för mycket
- customer_name: extrahera från förfrågan om tydligt angivet, annars null
- customer_address: extrahera från förfrågan om tydligt angivet, annars null
- notes: en kort sammanfattning av jobbet på svenska
- include_vat: sätt till true som standard
- keywords: extrahera jobbspecifika nyckelord. ABSOLUT REGEL: skapa en verb+substantiv-fras (verb_substantiv med understreck, verbet i infinitiv, substantivet i singular obestämd) ENDAST om verbet står ordagrant som ett ord i texten. Gissa aldrig ett verb. Exempel: "byta element i köket" → ["byta_element","element","kök"] (byta finns). "Badrumsrenovering med nytt kakel" → ["renovering","badrum","kakel"] (inga verb i texten — inga fraser, inte ens lägga_kakel). När en fras emitteras, inkludera också substantivet separat. Substantiv utan verb (platser, jobbtyper som "renovering") inkluderas ensamma. Dela svenska sammansättningar (badrumsrenovering → renovering + badrum). Singular obestämd. Uteslut vaga ord. Returnera [] om inga relevanta nyckelord finns.
- Använd material från listan ovan när möjligt. Om ett material saknas, lägg till det med rimliga svenska marknadspriser.

Returnera ENBART giltig JSON utan markdown, kodblock eller kommentarer:
{
  "customer_name": string | null,
  "customer_address": string | null,
  "notes": string,
  "keywords": string[],
  "items": [
    {
      "description": string,
      "labor_price": number,
      "include_vat": boolean,
      "materials": [
        {
          "name": string,
          "quantity": number,
          "unit": string,
          "unit_price": number,
          "purchase_price": number,
          "markup_percent": number
        }
      ]
    }
  ]
}`;

    // --- Step 7: Call Claude ---
    const messageContent = image
      ? [
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } },
          { type: "text", text: promptText },
        ]
      : [{ type: "text", text: promptText }];

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        messages: [{ role: "user", content: messageContent }],
      }),
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      console.error("Claude API error:", errText);
      return new Response(
        JSON.stringify({ error: "AI-tjänsten svarade inte korrekt, försök igen" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const claudeData = await claudeRes.json();
    let raw: string = claudeData.content?.[0]?.text ?? "";
    raw = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.error("Failed to parse Claude response:", raw, e);
      return new Response(
        JSON.stringify({ error: "AI kunde inte generera ett korrekt svar, försök igen" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!parsed.items || !Array.isArray(parsed.items) || parsed.items.length === 0) {
      return new Response(
        JSON.stringify({ error: "AI kunde inte tolka förfrågan, försök med mer detaljer" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Clean keywords
    parsed.keywords = Array.isArray(parsed.keywords)
      ? parsed.keywords.map((k: any) => String(k).toLowerCase()).filter(Boolean)
      : [];

    // Merge input keywords with Claude-generated keywords (deduplicated)
    const allKeywords = [...new Set([...inputKeywords, ...parsed.keywords])];
    parsed.keywords = allKeywords;

    if (request_id) {
      await adminClient.from("ai_idempotency_cache").insert({
        user_id: userId,
        request_id,
        input_hash: inputHash,
        response: parsed,
      });
    }

    return new Response(
      JSON.stringify(parsed),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internt serverfel, försök igen" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
