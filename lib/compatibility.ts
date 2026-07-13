import { supabase } from "@/lib/supabase";

export type Match = {
  ingredient_name: string;
  score: number;
  rating: "good" | "neutral" | "caution" | "avoid" | string;
};

export type ScoreResult = {
  normalizedScore: number;
  matches: Match[];
};

export function parseIngredients(text: string): string[] {
  return Array.from(
    new Set(
      text
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => s.toLowerCase())
    )
  );
}

function normalizeScalpCondition(value: string | null): string | null {
  if (!value) return null;
  return value === "dandruff-prone" ? "dandruff" : value;
}

export function scoreTier(score: number): "green" | "amber" | "red" {
  if (score >= 70) return "green";
  if (score >= 40) return "amber";
  return "red";
}

export const TIER_CLASSES: Record<"green" | "amber" | "red", string> = {
  green: "bg-green text-dark",
  amber: "bg-amber text-dark",
  red: "bg-red text-cream",
};

export const RATING_DOT_CLASSES: Record<string, string> = {
  good: "bg-green",
  neutral: "bg-muted",
  caution: "bg-amber",
  avoid: "bg-red",
};

type IngredientRow = {
  id: string;
  inci_name: string;
  common_name: string;
};

function firstWord(s: string): string {
  return s.trim().split(/\s+/)[0] ?? "";
}

// Counts shared whitespace-separated tokens between two strings, used to
// pick the most plausible candidate when a fuzzy tier matches more than
// one ingredient (e.g. "Citrus" alone would otherwise match every
// Citrus-species ingredient in the table).
function wordOverlapScore(a: string, b: string): number {
  const aWords = a.toLowerCase().split(/\s+/);
  const bWords = new Set(b.toLowerCase().split(/\s+/));
  return aWords.filter((w) => bWords.has(w)).length;
}

function bestByOverlap(
  name: string,
  candidates: IngredientRow[]
): IngredientRow {
  return candidates.reduce((best, candidate) => {
    const candidateScore = Math.max(
      wordOverlapScore(name, candidate.inci_name),
      wordOverlapScore(name, candidate.common_name)
    );
    const bestScore = Math.max(
      wordOverlapScore(name, best.inci_name),
      wordOverlapScore(name, best.common_name)
    );
    return candidateScore > bestScore ? candidate : best;
  });
}

// Real ingredient labels (Open Beauty Facts included) almost always embed
// the common name inside the INCI name -- e.g. "Cocos Nucifera (Coconut)
// Oil" -- while our ingredients table stores the botanical and common
// names as separate columns with no parenthetical form at all. An exact
// match against either column alone misses most real-world labels, so
// this tries progressively looser tiers: exact -> first word -> substring.
export function findBestIngredientMatch(
  productIngredientName: string,
  allIngredients: IngredientRow[]
): IngredientRow | null {
  const name = productIngredientName.trim().toLowerCase();
  if (!name) return null;

  const exact = allIngredients.find(
    (ing) =>
      ing.inci_name.trim().toLowerCase() === name ||
      ing.common_name.trim().toLowerCase() === name
  );
  if (exact) return exact;

  const nameFirstWord = firstWord(name);
  if (nameFirstWord) {
    const firstWordCandidates = allIngredients.filter(
      (ing) =>
        firstWord(ing.inci_name.toLowerCase()) === nameFirstWord ||
        firstWord(ing.common_name.toLowerCase()) === nameFirstWord
    );
    if (firstWordCandidates.length === 1) return firstWordCandidates[0];
    if (firstWordCandidates.length > 1) {
      return bestByOverlap(name, firstWordCandidates);
    }
  }

  const containsCandidates = allIngredients.filter((ing) => {
    const inci = ing.inci_name.trim().toLowerCase();
    const common = ing.common_name.trim().toLowerCase();
    return (
      (inci.length > 0 && (name.includes(inci) || inci.includes(name))) ||
      (common.length > 0 && (name.includes(common) || common.includes(name)))
    );
  });
  if (containsCandidates.length === 1) return containsCandidates[0];
  if (containsCandidates.length > 1) return bestByOverlap(name, containsCandidates);

  return null;
}

export async function scoreIngredientsText(
  ingredientsText: string
): Promise<{ error?: string; result?: ScoreResult }> {
  const profileId = localStorage.getItem("hair_profile_id");
  if (!profileId) {
    return {
      error: "No hair profile found. Save a profile on My Profile first.",
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("hair_profiles")
    .select("curl_type, porosity, scalp_condition, strand_thickness")
    .eq("id", profileId)
    .single();

  if (profileError || !profile) {
    return { error: "Couldn't load your hair profile." };
  }

  // porosity is never null in compatibility_scores -- default unknown
  // ("not sure") profiles to medium rather than a filter that would
  // never match anything.
  const porosity =
    profile.porosity === "not sure" || profile.porosity === "not_sure" || !profile.porosity
      ? "medium"
      : profile.porosity;
  const scalpCondition = normalizeScalpCondition(profile.scalp_condition);

  const ingredientNames = parseIngredients(ingredientsText);

  const { data: allIngredients, error: ingredientsError } = await supabase
    .from("ingredients")
    .select("id, inci_name, common_name");

  if (ingredientsError || !allIngredients) {
    return { error: "Couldn't load ingredient data." };
  }

  const matched = new Map<string, IngredientRow>();
  for (const name of ingredientNames) {
    const match = findBestIngredientMatch(name, allIngredients);
    if (match) matched.set(match.id, match);
  }

  if (matched.size === 0) {
    return { result: { normalizedScore: 0, matches: [] } };
  }

  const { data: scoreRows, error: scoreError } = await supabase
    .from("compatibility_scores")
    .select("ingredient_id, scalp_condition, score, rating")
    .in("ingredient_id", Array.from(matched.keys()))
    .eq("porosity", porosity);

  if (scoreError) {
    return { error: scoreError.message };
  }

  // Generic (scalp_condition = null) rows first, then let a row scoped to
  // the user's specific scalp condition override it if one exists.
  const bestRowPerIngredient = new Map<string, { score: number; rating: string }>();
  for (const row of scoreRows ?? []) {
    if (row.scalp_condition === null) {
      bestRowPerIngredient.set(row.ingredient_id, {
        score: row.score,
        rating: row.rating,
      });
    }
  }
  if (scalpCondition) {
    for (const row of scoreRows ?? []) {
      if (row.scalp_condition === scalpCondition) {
        bestRowPerIngredient.set(row.ingredient_id, {
          score: row.score,
          rating: row.rating,
        });
      }
    }
  }

  const matchList: Match[] = [];
  Array.from(matched.entries()).forEach(([id, ingredient]) => {
    const scored = bestRowPerIngredient.get(id);
    if (!scored) return;
    matchList.push({
      ingredient_name: ingredient.common_name || ingredient.inci_name,
      score: scored.score,
      rating: scored.rating,
    });
  });

  const sum = matchList.reduce((acc, m) => acc + m.score, 0);
  const normalizedScore =
    matchList.length === 0
      ? 0
      : Math.round((sum / (matchList.length * 10)) * 100);

  return { result: { normalizedScore, matches: matchList } };
}
