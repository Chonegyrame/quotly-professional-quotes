import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ============================================================
// Helpers
// ============================================================

function normalizeMaterialName(name: string): string {
  return name.trim().toLowerCase();
}

// Note: jaccardSimilarity was previously used for material-based clustering.
// Replaced by keyword-based clustering (countSharedKeywords) which forms
// patterns faster and handles material variation between similar job types.

// ============================================================
// Types
// ============================================================

interface QuoteWithMaterials {
  id: string;
  keywords: string[];
  fingerprint: string[];
  materials: { name: string; quantity: number; unit_price: number; unit: string }[];
  items: { description: string; unit_price: number }[];
  total_labor: number;
}

interface PatternData {
  pattern_keywords: string[];
  occurrence_count: number;
  common_materials: {
    name: string;
    frequency: number;
    avg_quantity: number;
    avg_unit_price: number;
  }[];
  typical_line_items: {
    description: string;
    frequency: number;
    avg_labor: number;
  }[];
  avg_total_labor: number;
}

// ============================================================
// Layer 1: Compute trade profile
// ============================================================

function computeTradeProfile(quotes: QuoteWithMaterials[]) {
  const total = quotes.length;
  if (total === 0) {
    return {
      total_quotes: 0,
      common_materials: [],
      typical_labor_min: 0,
      typical_labor_max: 0,
      typical_labor_avg: 0,
    };
  }

  // Count material frequency across all quotes
  const materialStats = new Map<
    string,
    { count: number; totalQty: number; totalPrice: number }
  >();

  for (const q of quotes) {
    // Deduplicate materials within a single quote
    const seen = new Set<string>();
    for (const m of q.materials) {
      const key = normalizeMaterialName(m.name);
      if (seen.has(key)) continue;
      seen.add(key);

      const existing = materialStats.get(key) ?? {
        count: 0,
        totalQty: 0,
        totalPrice: 0,
      };
      existing.count++;
      existing.totalQty += m.quantity;
      existing.totalPrice += m.unit_price;
      materialStats.set(key, existing);
    }
  }

  // Materials appearing in >30% of quotes
  const threshold = total * 0.3;
  const commonMaterials = [...materialStats.entries()]
    .filter(([_, data]) => data.count >= threshold)
    .map(([name, data]) => ({
      name,
      frequency: Math.round((data.count / total) * 100) / 100,
      avg_quantity: Math.round((data.totalQty / data.count) * 10) / 10,
      avg_unit_price: Math.round(data.totalPrice / data.count),
    }))
    .sort((a, b) => b.frequency - a.frequency);

  // Labor statistics — percentile-based to exclude outliers
  const laborValues = quotes.map((q) => q.total_labor).filter((v) => v > 0).sort((a, b) => a - b);
  const laborAvg =
    laborValues.length > 0
      ? Math.round(laborValues.reduce((s, v) => s + v, 0) / laborValues.length)
      : 0;

  // 10th and 90th percentile for stable range
  const percentile = (sorted: number[], p: number): number => {
    if (sorted.length === 0) return 0;
    if (sorted.length === 1) return sorted[0];
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sorted[lower];
    return Math.round(sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower));
  };

  const laborP10 = percentile(laborValues, 10);
  const laborP90 = percentile(laborValues, 90);
  // Keep min/max for backward compatibility but use percentiles as primary
  const laborMin = laborValues.length > 0 ? Math.min(...laborValues) : 0;
  const laborMax = laborValues.length > 0 ? Math.max(...laborValues) : 0;

  return {
    total_quotes: total,
    common_materials: commonMaterials,
    typical_labor_min: laborMin,
    typical_labor_max: laborMax,
    typical_labor_avg: laborAvg,
    typical_labor_p10: laborP10,
    typical_labor_p90: laborP90,
  };
}

// ============================================================
// Layer 2: Detect job patterns via keyword similarity
// Clusters quotes by shared keywords (job type), then aggregates
// material and labor data from each cluster.
// ============================================================

function countSharedKeywords(a: string[], b: string[]): number {
  const setB = new Set(b);
  return a.filter((kw) => setB.has(kw)).length;
}

function detectPatterns(quotes: QuoteWithMaterials[]): PatternData[] {
  if (quotes.length < 2) return [];

  const patterns: PatternData[] = [];
  const assigned = new Set<string>();

  // Sort by keyword count descending — quotes with more keywords as seeds
  const sorted = [...quotes]
    .filter((q) => (q.keywords ?? []).length > 0)
    .sort((a, b) => (b.keywords ?? []).length - (a.keywords ?? []).length);

  for (const seed of sorted) {
    if (assigned.has(seed.id)) continue;
    const seedKw = seed.keywords ?? [];
    if (seedKw.length === 0) continue;

    // Find all quotes that share 2+ keywords with this seed
    const group: QuoteWithMaterials[] = [seed];
    for (const candidate of sorted) {
      if (candidate.id === seed.id || assigned.has(candidate.id)) continue;
      const candidateKw = candidate.keywords ?? [];
      if (candidateKw.length === 0) continue;
      if (countSharedKeywords(seedKw, candidateKw) >= 2) {
        group.push(candidate);
      }
    }

    // Only keep groups of 2+ (lowered from 3 — keyword clustering is
    // more reliable so we can form patterns earlier)
    if (group.length < 2) continue;

    for (const q of group) assigned.add(q.id);

    // Build pattern from group
    const groupSize = group.length;

    // Keywords appearing in >40% of group quotes
    const kwCounts = new Map<string, number>();
    for (const q of group) {
      for (const kw of q.keywords ?? []) {
        kwCounts.set(kw, (kwCounts.get(kw) ?? 0) + 1);
      }
    }
    const kwThreshold = groupSize * 0.4;
    const patternKeywords = [...kwCounts.entries()]
      .filter(([_, count]) => count >= kwThreshold)
      .map(([kw]) => kw);

    // Materials appearing in >30% of group quotes (lowered from 50%
    // because keyword-based groups are larger and more varied —
    // a 30% threshold still means the material shows up consistently)
    const matCounts = new Map<
      string,
      { count: number; totalQty: number; totalPrice: number }
    >();
    for (const q of group) {
      const seen = new Set<string>();
      for (const m of q.materials) {
        const key = normalizeMaterialName(m.name);
        if (seen.has(key)) continue;
        seen.add(key);
        const existing = matCounts.get(key) ?? {
          count: 0,
          totalQty: 0,
          totalPrice: 0,
        };
        existing.count++;
        existing.totalQty += m.quantity;
        existing.totalPrice += m.unit_price;
        matCounts.set(key, existing);
      }
    }
    const matThreshold = groupSize * 0.3;
    const commonMaterials = [...matCounts.entries()]
      .filter(([_, data]) => data.count >= matThreshold)
      .map(([name, data]) => ({
        name,
        frequency: Math.round((data.count / groupSize) * 100) / 100,
        avg_quantity: Math.round((data.totalQty / data.count) * 10) / 10,
        avg_unit_price: Math.round(data.totalPrice / data.count),
      }))
      .sort((a, b) => b.frequency - a.frequency);

    // Line items appearing in >30% of group quotes
    const itemCounts = new Map<string, { count: number; totalLabor: number }>();
    for (const q of group) {
      for (const item of q.items) {
        const key = item.description.trim().toLowerCase();
        const existing = itemCounts.get(key) ?? { count: 0, totalLabor: 0 };
        existing.count++;
        existing.totalLabor += item.unit_price;
        itemCounts.set(key, existing);
      }
    }
    const itemThreshold = groupSize * 0.3;
    const typicalItems = [...itemCounts.entries()]
      .filter(([_, data]) => data.count >= itemThreshold)
      .map(([description, data]) => ({
        description,
        frequency: Math.round((data.count / groupSize) * 100) / 100,
        avg_labor: Math.round(data.totalLabor / data.count),
      }))
      .sort((a, b) => b.frequency - a.frequency);

    const avgLabor = Math.round(
      group.reduce((s, q) => s + q.total_labor, 0) / groupSize
    );

    patterns.push({
      pattern_keywords: patternKeywords,
      occurrence_count: groupSize,
      common_materials: commonMaterials,
      typical_line_items: typicalItems,
      avg_total_labor: avgLabor,
    });
  }

  return patterns;
}

// ============================================================
// Layer 4: Diff AI suggestions vs final saved materials
// ============================================================

function computeCorrections(
  aiSuggestions: { items: { materials: { name: string }[] }[] },
  savedMaterials: { name: string }[]
): { additions: string[]; removals: string[] } {
  // Collect all material names the AI originally suggested
  const aiNames = new Set<string>();
  for (const item of aiSuggestions.items ?? []) {
    for (const m of item.materials ?? []) {
      aiNames.add(normalizeMaterialName(m.name));
    }
  }

  // Collect all material names the user actually saved
  const savedNames = new Set<string>();
  for (const m of savedMaterials) {
    savedNames.add(normalizeMaterialName(m.name));
  }

  // Additions = in saved but not in AI suggestions (user added these)
  const additions: string[] = [];
  for (const name of savedNames) {
    if (!aiNames.has(name)) {
      additions.push(name);
    }
  }

  // Removals = in AI suggestions but not in saved (user rejected these)
  const removals: string[] = [];
  for (const name of aiNames) {
    if (!savedNames.has(name)) {
      removals.push(name);
    }
  }

  return { additions, removals };
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
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { quote_id, company_id, trade } = (await req.json()) as {
      quote_id: string;
      company_id: string;
      trade: string;
    };

    if (!company_id || !trade) {
      return new Response(
        JSON.stringify({ error: "Missing company_id or trade" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --------------------------------------------------------
    // Fetch all sent quotes for this user + trade
    // --------------------------------------------------------
    const { data: allQuotes } = await supabase
      .from("quotes")
      .select(
        "id, keywords, ai_suggestions, quote_items(description, unit_price, quote_item_materials(name, quantity, unit_price, unit))"
      )
      .eq("company_id", company_id)
      .eq("trade", trade)
      .eq("status", "sent")
      .order("created_at", { ascending: false });

    const quotesWithMaterials: QuoteWithMaterials[] = (allQuotes ?? []).map(
      (q: any) => {
        const allMaterials: {
          name: string;
          quantity: number;
          unit_price: number;
          unit: string;
        }[] = [];
        const items: { description: string; unit_price: number }[] = [];
        let totalLabor = 0;

        for (const item of q.quote_items ?? []) {
          items.push({
            description: item.description,
            unit_price: item.unit_price,
          });
          totalLabor += item.unit_price;
          for (const m of item.quote_item_materials ?? []) {
            allMaterials.push({
              name: m.name,
              quantity: m.quantity,
              unit_price: m.unit_price,
              unit: m.unit ?? "st",
            });
          }
        }

        const fingerprint = [
          ...new Set(allMaterials.map((m) => normalizeMaterialName(m.name))),
        ].sort();

        return {
          id: q.id,
          keywords: q.keywords ?? [],
          fingerprint,
          materials: allMaterials,
          items,
          total_labor: totalLabor,
        };
      }
    );

    // Also include accepted and completed quotes in the dataset
    const { data: otherQuotes } = await supabase
      .from("quotes")
      .select(
        "id, keywords, ai_suggestions, quote_items(description, unit_price, quote_item_materials(name, quantity, unit_price, unit))"
      )
      .eq("company_id", company_id)
      .eq("trade", trade)
      .in("status", ["accepted", "completed"])
      .order("created_at", { ascending: false });

    for (const q of otherQuotes ?? []) {
      // Skip if already in the set
      if (quotesWithMaterials.some((existing) => existing.id === q.id)) continue;

      const allMaterials: {
        name: string;
        quantity: number;
        unit_price: number;
        unit: string;
      }[] = [];
      const items: { description: string; unit_price: number }[] = [];
      let totalLabor = 0;

      for (const item of (q as any).quote_items ?? []) {
        items.push({
          description: item.description,
          unit_price: item.unit_price,
        });
        totalLabor += item.unit_price;
        for (const m of item.quote_item_materials ?? []) {
          allMaterials.push({
            name: m.name,
            quantity: m.quantity,
            unit_price: m.unit_price,
            unit: m.unit ?? "st",
          });
        }
      }

      const fingerprint = [
        ...new Set(allMaterials.map((m) => normalizeMaterialName(m.name))),
      ].sort();

      quotesWithMaterials.push({
        id: (q as any).id,
        keywords: (q as any).keywords ?? [],
        fingerprint,
        materials: allMaterials,
        items,
        total_labor: totalLabor,
      });
    }

    // --------------------------------------------------------
    // Layer 1: Compute and upsert trade profile
    // --------------------------------------------------------
    const profile = computeTradeProfile(quotesWithMaterials);

    await supabase.from("user_trade_profiles").upsert(
      {
        user_id: user.id,
        trade,
        total_quotes: profile.total_quotes,
        common_materials: profile.common_materials,
        typical_labor_min: profile.typical_labor_min,
        typical_labor_max: profile.typical_labor_max,
        typical_labor_avg: profile.typical_labor_avg,
        typical_labor_p10: profile.typical_labor_p10,
        typical_labor_p90: profile.typical_labor_p90,
        last_computed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,trade" }
    );

    // --------------------------------------------------------
    // Layer 2: Detect patterns and replace stored patterns
    // --------------------------------------------------------
    const patterns = detectPatterns(quotesWithMaterials);

    // Delete old patterns for this user+trade, then insert fresh
    await supabase
      .from("user_job_patterns")
      .delete()
      .eq("user_id", user.id)
      .eq("trade", trade);

    if (patterns.length > 0) {
      await supabase.from("user_job_patterns").insert(
        patterns.map((p) => ({
          user_id: user.id,
          trade,
          pattern_keywords: p.pattern_keywords,
          occurrence_count: p.occurrence_count,
          common_materials: p.common_materials,
          typical_line_items: p.typical_line_items,
          avg_total_labor: p.avg_total_labor,
          last_updated_at: new Date().toISOString(),
        }))
      );
    }

    // --------------------------------------------------------
    // Update material fingerprint on the specific quote
    // --------------------------------------------------------
    if (quote_id) {
      const thisQuote = quotesWithMaterials.find((q) => q.id === quote_id);
      if (thisQuote) {
        await supabase
          .from("quotes")
          .update({ material_fingerprint: thisQuote.fingerprint })
          .eq("id", quote_id);
      }
    }

    // --------------------------------------------------------
    // Layer 4: Diff AI suggestions vs saved (if AI-generated)
    // Tracks both additions (user added) and removals (user rejected)
    // --------------------------------------------------------
    if (quote_id) {
      const sourceQuote = (allQuotes ?? []).find(
        (q: any) => q.id === quote_id
      ) ?? (otherQuotes ?? []).find((q: any) => q.id === quote_id);

      if (sourceQuote && (sourceQuote as any).ai_suggestions) {
        const aiSuggestions = (sourceQuote as any).ai_suggestions;
        const savedMaterials: { name: string }[] = [];
        for (const item of (sourceQuote as any).quote_items ?? []) {
          for (const m of item.quote_item_materials ?? []) {
            savedMaterials.push({ name: m.name });
          }
        }

        const { additions, removals } = computeCorrections(aiSuggestions, savedMaterials);
        const quoteKeywords = (sourceQuote as any).keywords ?? [];

        const learningRows: {
          user_id: string;
          trade: string;
          job_keywords: string[];
          material_name: string;
          learning_type: string;
          added_at: string;
        }[] = [];

        for (const materialName of additions) {
          learningRows.push({
            user_id: user.id,
            trade,
            job_keywords: quoteKeywords,
            material_name: materialName,
            learning_type: "addition",
            added_at: new Date().toISOString(),
          });
        }

        for (const materialName of removals) {
          learningRows.push({
            user_id: user.id,
            trade,
            job_keywords: quoteKeywords,
            material_name: materialName,
            learning_type: "removal",
            added_at: new Date().toISOString(),
          });
        }

        if (learningRows.length > 0) {
          await supabase.from("user_material_learnings").insert(learningRows);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, patterns_found: patterns.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("recompute-user-profile error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
