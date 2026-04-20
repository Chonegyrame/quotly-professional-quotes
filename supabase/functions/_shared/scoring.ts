// Weighted lexical scoring for Quotly's Layer 2 keyword matching.
//
// Tokens that contain an underscore are verb+noun phrases (e.g. "byta_element")
// and count as weight 2. Plain nouns (e.g. "element") count as weight 1.
// Old noun-only keywords from pre-rollout quotes are handled naturally — they
// just never contribute a phrase-weight match.

export function scoreSharedKeywords(a: string[], b: string[]): number {
  const setB = new Set(b);
  let score = 0;
  for (const t of new Set(a)) {
    if (!setB.has(t)) continue;
    score += t.includes("_") ? 2 : 1;
  }
  return score;
}
