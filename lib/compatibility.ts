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

// ---- Curl-type scoring adjustments -----------------------------------
//
// compatibility_scores has always been porosity-driven; curl_type was
// fetched but never used. Rather than requiring a new database row for
// every ingredient x curl-type-family combination, this applies the same
// kind of relative adjustment already used for climate in lib/travelKit.ts
// -- a small set of category rules (silicones, heavy butters, sulfates,
// etc.) nudge the porosity-resolved score/rating for straight/wavy/curly
// hair. Coily (type 4) is never adjusted -- it's the original, already-
// calibrated baseline this whole table was built around.
//
// Ingredients added specifically for types 1-3 (see the section-3 seed
// SQL) carry a real hair_type value on their own compatibility_scores
// rows instead, which take precedence over these generic rules -- see
// the hairTypeOverridden set in scoreIngredientsText.

export type CurlFamily = "straight" | "wavy" | "curly" | "coily";

export function curlFamily(curlType: string | null): CurlFamily | null {
  if (!curlType) return null;
  const t = curlType.trim().toLowerCase();
  if (t.startsWith("1")) return "straight";
  if (t.startsWith("2")) return "wavy";
  if (t.startsWith("3")) return "curly";
  if (t.startsWith("4")) return "coily";
  return null; // "not_sure" or unrecognized -- no adjustment
}

function ratingForScore(score: number): "good" | "neutral" | "caution" | "avoid" {
  if (score >= 8) return "good";
  if (score >= 5) return "neutral";
  if (score >= 2) return "caution";
  return "avoid";
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(10, score));
}

const SILICONES = new Set([
  "dimethicone",
  "amodimethicone",
  "cyclomethicone",
  "cyclohexasiloxane",
  "cyclopentasiloxane",
]);
// Dimethicone and Cyclomethicone each carry their own section-3 verdict
// ("good" for straight/wavy, more specific than the generic silicone
// caution->neutral bump the rest of the category gets).
const EXPLICITLY_GOOD_SILICONES = new Set(["dimethicone", "cyclomethicone"]);
const HEAVY_BUTTERS = new Set([
  "butyrospermum parkii butter",
  "theobroma cacao seed butter",
  "mangifera indica seed butter",
]);
const SULFATES = new Set(["sodium lauryl sulfate", "sodium laureth sulfate"]);
// Panthenol, Hydrolyzed Silk -- "increase score for fine straight hair."
const BODY_BOOSTERS = new Set(["panthenol", "hydrolyzed silk"]);
const LIGHT_OILS = new Set([
  "vitis vinifera seed oil", // Grapeseed Oil
  "simmondsia chinensis seed oil", // Jojoba Oil
  "argania spinosa kernel oil", // Argan Oil
]);
// Flaxseed only exists in the table as the oil, not a separate gel/extract.
const DEFINING_AGENTS = new Set([
  "pectin",
  "xanthan gum",
  "linum usitatissimum seed oil", // Flaxseed Oil
]);
const SULFATE_FREE_CLEANSERS = new Set([
  "cocamidopropyl betaine",
  "decyl glucoside",
  "sodium cocoyl isethionate",
  "sodium lauroyl isethionate",
]);

// "climate" is a real hair_profiles column but nothing in the profile
// form collects it today, so it's always null in practice -- these two
// checks (and the glycerin rules that use them) are effectively dormant
// until a climate field exists. Implemented now so the rule is correct
// the moment that data shows up, rather than silently missing.
function isHumidClimate(climate: string | null): boolean {
  if (!climate) return false;
  const c = climate.toLowerCase();
  return c.includes("humid") || c.includes("tropical");
}
function isDryClimate(climate: string | null): boolean {
  if (!climate) return false;
  const c = climate.toLowerCase();
  return c.includes("dry") || c.includes("arid");
}

function applyCurlTypeAdjustment(
  inciName: string,
  family: CurlFamily | null,
  score: number,
  rating: string,
  climate: string | null
): { score: number; rating: string } {
  if (!family || family === "coily") return { score, rating };

  const name = inciName.trim().toLowerCase();
  let adjustedScore = score;

  if (family === "straight") {
    if (EXPLICITLY_GOOD_SILICONES.has(name)) {
      // More specific than the general silicone rule below: Dimethicone
      // and Cyclomethicone each have their own section-3 guidance calling
      // straight/wavy hair "good," not just tolerable (lightweight, adds
      // shine).
      adjustedScore = 8;
    } else if (SILICONES.has(name) && rating === "caution") {
      adjustedScore = clampScore(score + 3); // caution -> neutral
    } else if (HEAVY_BUTTERS.has(name)) {
      adjustedScore = clampScore(score - 2); // too heavy, causes limpness
    } else if (SULFATES.has(name)) {
      adjustedScore = clampScore(score + 2); // more resilient than type 4
    } else if (BODY_BOOSTERS.has(name)) {
      adjustedScore = clampScore(score + 2); // adds body to fine straight hair
    } else if (name === "pvp") {
      adjustedScore = clampScore(score + 3); // caution -> neutral (hold, not flaking)
    }
  } else if (family === "wavy") {
    if (EXPLICITLY_GOOD_SILICONES.has(name)) {
      adjustedScore = 8;
    } else if (SILICONES.has(name) && (rating === "caution" || rating === "avoid")) {
      adjustedScore = clampScore(score + 3); // frizz control benefit
    } else if (LIGHT_OILS.has(name)) {
      adjustedScore = clampScore(score + 2); // enhances wave without weighing down
    } else if (
      HEAVY_BUTTERS.has(name) &&
      (rating === "good" || rating === "neutral")
    ) {
      adjustedScore = Math.min(score, 4); // weighs down wave pattern
    } else if (SULFATE_FREE_CLEANSERS.has(name)) {
      adjustedScore = clampScore(score + 1); // benefits from gentler cleansing
    } else if (name === "glycerin" && isHumidClimate(climate)) {
      adjustedScore = Math.min(score, 4); // causes frizz in humid climates
    }
  } else if (family === "curly") {
    if (name === "dimethicone") {
      adjustedScore = Math.min(score, 4); // caution for curly per its specific profile
    } else if (SILICONES.has(name) && rating !== "caution" && rating !== "avoid") {
      adjustedScore = Math.min(score, 4); // buildup in curl pattern
    } else if (DEFINING_AGENTS.has(name)) {
      adjustedScore = Math.max(score, 8); // enhance curl definition
    } else if (name === "glycerin" && isDryClimate(climate)) {
      adjustedScore = Math.min(score, 4); // caution in dry climates
    }
  }

  if (adjustedScore === score) return { score, rating };
  return { score: adjustedScore, rating: ratingForScore(adjustedScore) };
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
    .select("curl_type, porosity, scalp_condition, strand_thickness, climate")
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
  const family = curlFamily(profile.curl_type);

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
    .select("ingredient_id, scalp_condition, hair_type, score, rating")
    .in("ingredient_id", Array.from(matched.keys()))
    .eq("porosity", porosity);

  if (scoreError) {
    return { error: scoreError.message };
  }

  // Generic (scalp_condition/hair_type both null) rows first, then a row
  // scoped to the user's scalp condition, then -- most specific -- a row
  // scoped to their curl-type family (only present for ingredients seeded
  // with real hair_type data). hairTypeOverridden tracks which
  // ingredients got that most-specific row, since those should skip the
  // generic runtime adjustment below -- the DB value is already precise.
  const bestRowPerIngredient = new Map<string, { score: number; rating: string }>();
  const hairTypeOverridden = new Set<string>();

  for (const row of scoreRows ?? []) {
    if (row.scalp_condition === null && row.hair_type === null) {
      bestRowPerIngredient.set(row.ingredient_id, {
        score: row.score,
        rating: row.rating,
      });
    }
  }
  if (scalpCondition) {
    for (const row of scoreRows ?? []) {
      if (row.scalp_condition === scalpCondition && row.hair_type === null) {
        bestRowPerIngredient.set(row.ingredient_id, {
          score: row.score,
          rating: row.rating,
        });
      }
    }
  }
  if (family) {
    for (const row of scoreRows ?? []) {
      if (
        row.hair_type === family &&
        (row.scalp_condition === null || row.scalp_condition === scalpCondition)
      ) {
        bestRowPerIngredient.set(row.ingredient_id, {
          score: row.score,
          rating: row.rating,
        });
        hairTypeOverridden.add(row.ingredient_id);
      }
    }
  }

  const matchList: Match[] = [];
  Array.from(matched.entries()).forEach(([id, ingredient]) => {
    const scored = bestRowPerIngredient.get(id);
    if (!scored) return;

    const { score, rating } = hairTypeOverridden.has(id)
      ? scored
      : applyCurlTypeAdjustment(
          ingredient.inci_name,
          family,
          scored.score,
          scored.rating,
          profile.climate
        );

    matchList.push({
      ingredient_name: ingredient.common_name || ingredient.inci_name,
      score,
      rating,
    });
  });

  const sum = matchList.reduce((acc, m) => acc + m.score, 0);
  const normalizedScore =
    matchList.length === 0
      ? 0
      : Math.round((sum / (matchList.length * 10)) * 100);

  return { result: { normalizedScore, matches: matchList } };
}
