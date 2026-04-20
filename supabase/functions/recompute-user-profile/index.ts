import {
  authenticate,
  checkIpRateLimit,
  corsHeaders,
  jsonResponse,
} from "../_shared/auth.ts";
import { scoreSharedKeywords } from "../_shared/scoring.ts";

const FUNCTION_NAME = "recompute-user-profile";
const IP_LIMIT_PER_HOUR = 30;

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
    unit: string;
  }[];
  typical_line_items: {
    description: string;
    frequency: number;
    avg_labor: number;
  }[];
  avg_total_labor: number;
  member_quote_ids: string[];
}

// Pick the most-common unit for a material; first-seen wins on ties.
function pickDominantUnit(units: Map<string, number>): string {
  let best = "st";
  let bestCount = -1;
  for (const [unit, count] of units) {
    if (count > bestCount) {
      best = unit;
      bestCount = count;
    }
  }
  return best;
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
    { count: number; totalQty: number; totalPrice: number; units: Map<string, number> }
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
        units: new Map<string, number>(),
      };
      existing.count++;
      existing.totalQty += m.quantity;
      existing.totalPrice += m.unit_price;
      const unitKey = m.unit ?? "st";
      existing.units.set(unitKey, (existing.units.get(unitKey) ?? 0) + 1);
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
      unit: pickDominantUnit(data.units),
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
// Layer 2: Detect job patterns via keyword similarity.
// Builds a graph where an edge between two quotes exists when their
// weighted keyword score (phrase=2, noun=1) is ≥ 3, then takes
// connected components as clusters. Order-independent — same input
// produces the same clusters regardless of array order.
// ============================================================

function detectPatterns(quotes: QuoteWithMaterials[]): PatternData[] {
  if (quotes.length < 2) return [];

  const patterns: PatternData[] = [];

  // Only quotes with keywords can participate in clustering.
  const eligible = quotes.filter((q) => (q.keywords ?? []).length > 0);
  if (eligible.length < 2) return [];

  // Union-Find over eligible quotes.
  const parent: number[] = eligible.map((_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };
  const union = (i: number, j: number): void => {
    const ri = find(i);
    const rj = find(j);
    if (ri !== rj) parent[ri] = rj;
  };

  // Edges: every unordered pair with weighted score ≥ 3.
  for (let i = 0; i < eligible.length; i++) {
    for (let j = i + 1; j < eligible.length; j++) {
      if (scoreSharedKeywords(eligible[i].keywords, eligible[j].keywords) >= 3) {
        union(i, j);
      }
    }
  }

  // Collect components, preserving the original quote order within each.
  const components = new Map<number, QuoteWithMaterials[]>();
  for (let i = 0; i < eligible.length; i++) {
    const root = find(i);
    const existing = components.get(root) ?? [];
    existing.push(eligible[i]);
    components.set(root, existing);
  }

  // Deterministic iteration order: sort components by their smallest
  // member's id so output does not depend on Map insertion order.
  const sortedComponents = [...components.values()].sort((a, b) => {
    const aMin = a.map((q) => q.id).sort()[0];
    const bMin = b.map((q) => q.id).sort()[0];
    return aMin < bMin ? -1 : aMin > bMin ? 1 : 0;
  });

  for (const group of sortedComponents) {
    // Minimum cluster size is 3 — 2-member clusters are too noisy to
    // emit as a recurring pattern.
    if (group.length < 3) continue;

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
      { count: number; totalQty: number; totalPrice: number; units: Map<string, number> }
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
          units: new Map<string, number>(),
        };
        existing.count++;
        existing.totalQty += m.quantity;
        existing.totalPrice += m.unit_price;
        const unitKey = m.unit ?? "st";
        existing.units.set(unitKey, (existing.units.get(unitKey) ?? 0) + 1);
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
        unit: pickDominantUnit(data.units),
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
      member_quote_ids: group.map((q) => q.id),
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
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const auth = await authenticate(req, FUNCTION_NAME);
    if (!auth.ok) return auth.response;
    const { userId, ip, authClient, adminClient } = auth;

    const ipResp = await checkIpRateLimit(
      adminClient,
      ip,
      FUNCTION_NAME,
      IP_LIMIT_PER_HOUR,
      60,
    );
    if (ipResp) return ipResp;

    const { quote_id, company_id, trade } = (await req.json()) as {
      quote_id: string;
      company_id: string;
      trade: string;
    };

    if (!company_id || !trade) {
      return jsonResponse({ error: "Missing company_id or trade" }, 400);
    }

    // --------------------------------------------------------
    // Fetch all sent quotes for this user + trade
    // --------------------------------------------------------
    const { data: allQuotes } = await adminClient
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
    const { data: otherQuotes } = await adminClient
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

    await authClient.from("user_trade_profiles").upsert(
      {
        user_id: userId,
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
    await adminClient
      .from("user_job_patterns")
      .delete()
      .eq("user_id", userId)
      .eq("trade", trade);

    if (patterns.length > 0) {
      await authClient.from("user_job_patterns").insert(
        patterns.map((p) => ({
          user_id: userId,
          trade,
          pattern_keywords: p.pattern_keywords,
          occurrence_count: p.occurrence_count,
          common_materials: p.common_materials,
          typical_line_items: p.typical_line_items,
          avg_total_labor: p.avg_total_labor,
          member_quote_ids: p.member_quote_ids,
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
        await adminClient
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
          quote_id: string;
        }[] = [];

        for (const materialName of additions) {
          learningRows.push({
            user_id: userId,
            trade,
            job_keywords: quoteKeywords,
            material_name: materialName,
            learning_type: "addition",
            added_at: new Date().toISOString(),
            quote_id,
          });
        }

        for (const materialName of removals) {
          learningRows.push({
            user_id: userId,
            trade,
            job_keywords: quoteKeywords,
            material_name: materialName,
            learning_type: "removal",
            added_at: new Date().toISOString(),
            quote_id,
          });
        }

        // Dedupe on re-send: remove any existing learnings for this
        // quote, then upsert with ignoreDuplicates so concurrent
        // recomputes don't crash on the partial unique index.
        await adminClient
          .from("user_material_learnings")
          .delete()
          .eq("quote_id", quote_id);

        if (learningRows.length > 0) {
          await authClient
            .from("user_material_learnings")
            .upsert(learningRows, {
              onConflict: "quote_id,material_name,learning_type",
              ignoreDuplicates: true,
            });
        }

        // Stash material-level edit counts on the quote row for
        // AI-offertkvalitet stats. Purely observational — nothing reads
        // these columns outside the Analytics page.
        await adminClient
          .from("quotes")
          .update({
            ai_materials_added: additions.length,
            ai_materials_removed: removals.length,
          })
          .eq("id", quote_id);
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
