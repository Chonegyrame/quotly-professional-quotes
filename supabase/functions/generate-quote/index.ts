import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DAILY_LIMIT = 20;

const TRADE_LABELS: Record<string, string> = {
  bygg: "bygg",
  el: "el",
  vvs: "VVS",
  general: "hantverks",
};

// ============================================================
// Keyword extraction (Haiku) — purely literal, no inference
// ============================================================

async function extractKeywords(
  text: string | undefined,
  image: string | undefined,
  anthropicApiKey: string,
): Promise<string[]> {
  const extractionPrompt =
    "Extrahera jobbspecifika nyckelord från denna kundförfrågan. " +
    "Returnera ENBART ett JSON-array med substantiv i grundform som beskriver specifika material, komponenter eller installationer. " +
    "Inkludera endast konkreta fysiska objekt — exempelvis ['element', 'kopparrör', 'elcentral', 'golvbrunn']. " +
    "Uteslut verb, adjektiv och vaga ord som 'problem', 'byta', 'trasig', 'gammal'. " +
    "Om inga relevanta nyckelord finns, returnera []. " +
    "Returnera ENBART JSON-arrayen, inget annat.";

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
    .map((m: any) => `- ${m.name} (${Math.round(m.frequency * 100)}% av offerter, snitt ${m.avg_quantity} ${m.avg_unit_price} kr)`)
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

function buildLayer2Section(pattern: any): string {
  if (!pattern) return "";

  const materials = (pattern.common_materials ?? [])
    .slice(0, 8)
    .map((m: any) => `- ${m.name}: ${Math.round(m.frequency * 100)}% av jobb, snitt ${m.avg_quantity} st à ${m.avg_unit_price} kr`)
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
Snitt totalt arbete: ${pattern.avg_total_labor} kr
`;
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

    // --- Auth ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // --- Parse body ---
    const { text, image, company_id, trade } = await req.json() as {
      text?: string;
      image?: string;
      company_id: string;
      trade: "bygg" | "el" | "vvs" | "general";
    };

    if (!company_id || !trade) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: company_id, trade" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!text && !image) {
      return new Response(
        JSON.stringify({ error: "Provide either text or image" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // --- Rate limit ---
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);

    const { count } = await supabase
      .from("ai_usage")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("used_at", dayStart.toISOString());

    if ((count ?? 0) >= DAILY_LIMIT) {
      return new Response(
        JSON.stringify({ error: "Daglig gräns nådd (20 genereringar per dag)" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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
    ] = await Promise.all([
      // Layer 1: User trade profile
      supabase
        .from("user_trade_profiles")
        .select("*")
        .eq("user_id", user.id)
        .eq("trade", trade)
        .maybeSingle(),

      // Layer 2: Matching job patterns
      inputKeywords.length > 0
        ? supabase
            .from("user_job_patterns")
            .select("*")
            .eq("user_id", user.id)
            .eq("trade", trade)
            .overlaps("pattern_keywords", inputKeywords)
        : Promise.resolve({ data: [] }),

      // Global trade materials
      supabase
        .from("trade_materials")
        .select("name, unit, unit_price, purchase_price, markup_percent")
        .eq("category", trade)
        .eq("is_active", true)
        .order("name"),

      // User's own company materials
      supabase
        .from("materials")
        .select("name, unit, unit_price, purchase_price, markup_percent")
        .eq("company_id", company_id)
        .eq("is_deleted", false)
        .order("name"),

      // Layer 4: All correction learnings for this trade (additions + removals)
      supabase
        .from("user_material_learnings")
        .select("material_name, job_keywords, learning_type")
        .eq("user_id", user.id)
        .eq("trade", trade),

      // Layer 4: Keyword denominator (quotes with overlapping keywords)
      inputKeywords.length > 0
        ? supabase
            .from("quotes")
            .select("*", { count: "exact", head: true })
            .eq("company_id", company_id)
            .eq("trade", trade)
            .in("status", ["sent", "accepted", "completed"])
            .overlaps("keywords", inputKeywords)
        : Promise.resolve({ count: 0 }),
    ]);

    const tradeProfile = tradeProfileResult.data;
    const jobPatterns = (jobPatternsResult as any).data ?? [];
    const tradeMaterials = tradeMaterialsResult.data ?? [];
    const companyMaterials = companyMaterialsResult.data ?? [];
    const allLearnings = learningsResult.data ?? [];
    const keywordDenominator = (keywordDenominatorResult as any).count ?? 0;
    const tradeDenominator = tradeProfile?.total_quotes ?? 0;

    // --- Step 3: Find best Layer 2 pattern match ---
    // Patterns are now keyword-clustered (minimum 2 quotes per pattern).
    // Match by keyword overlap count, with tiered confidence thresholds.
    let bestPattern: any = null;
    if (jobPatterns.length > 0 && inputKeywords.length > 0) {
      // Rank by keyword overlap count
      bestPattern = jobPatterns
        .map((p: any) => {
          const overlap = (p.pattern_keywords ?? []).filter((kw: string) =>
            inputKeywords.includes(kw)
          ).length;
          return { ...p, _overlap: overlap };
        })
        .sort((a: any, b: any) => b._overlap - a._overlap)[0];

      // Minimum thresholds for injection:
      // Strong: 3+ keyword overlap OR 2+ overlap with 4+ occurrences
      // Moderate: 2+ keyword overlap with 2+ occurrences
      if (bestPattern) {
        const isStrong = bestPattern._overlap >= 3 || (bestPattern._overlap >= 2 && bestPattern.occurrence_count >= 4);
        const isModerate = bestPattern._overlap >= 2 && bestPattern.occurrence_count >= 2;
        if (!isStrong && !isModerate) bestPattern = null;
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
    const layer2Section = buildLayer2Section(bestPattern);
    const layer4Section = buildLayer4Section(
      aggregatedAdditions,
      aggregatedRemovals,
      tradeDenominator,
      keywordDenominator,
    );

    const promptText = `Du är en offertassistent för en svensk ${tradeLabel}-hantverkare.
Svara ALLTID på svenska. Alla priser i SEK.

${layer1Section}${layer2Section}${layer4Section}TILLGÄNGLIGA MATERIAL (prioritera dessa för prissättning):
${materialsList}

KUNDENS FÖRFRÅGAN:
${text ?? "[Se bifogad bild]"}

INSTRUKTIONER:
- Dela upp arbetet i logiska poster (items) baserat på förfrågan
- labor_price = totalt arbetspris för den posten i SEK (inte timpris)
- Var konservativ med materialkvantiteter — hellre lite för lite än för mycket
- customer_name: extrahera från förfrågan om tydligt angivet, annars null
- customer_address: extrahera från förfrågan om tydligt angivet, annars null
- notes: en kort sammanfattning av jobbet på svenska
- include_vat: sätt till true som standard
- keywords: extrahera jobbspecifika nyckelord i grundform — endast substantiv som beskriver specifika material, komponenter eller installationer. Uteslut verb och vaga ord. Returnera [] om inga relevanta nyckelord finns.
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

    await supabase.from("ai_usage").insert({ user_id: user.id });

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
