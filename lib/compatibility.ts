import { supabase } from "@/lib/supabase";
import { classifyProductWeight, ProductWeight } from "@/lib/productWeight";

export type Match = {
  ingredient_name: string;
  score: number;
  rating: "good" | "neutral" | "caution" | "avoid" | string;
  position: number;
  weight: number;
};

export type ScoreResult = {
  normalizedScore: number;
  matches: Match[];
  productWeight: ProductWeight;
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

// Ingredients are listed on a label in descending order of concentration,
// so position is a proxy for how much of the product it actually makes
// up -- an ingredient at position 2 matters far more than the same
// ingredient at position 22. position is 1-based.
export function positionWeight(position: number): number {
  if (position <= 5) return 1.3;
  if (position <= 10) return 1.0;
  if (position <= 20) return 0.8;
  return 0.6;
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

export const RATING_BORDER_CLASSES: Record<string, string> = {
  good: "border-green",
  neutral: "border-muted",
  caution: "border-amber",
  avoid: "border-red",
};

export type IngredientRow = {
  id: string;
  inci_name: string;
  // Nullable in the DB -- ingredients auto-created from an unmatched
  // label (see lib/adminProducts.ts's matchIngredientNames) only get an
  // inci_name, not a curated common_name.
  common_name: string | null;
};

function firstWord(s: string): string {
  return s.trim().split(/\s+/)[0] ?? "";
}

function normalized(s: string | null): string {
  return s ? s.trim().toLowerCase() : "";
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
      wordOverlapScore(name, normalized(candidate.common_name))
    );
    const bestScore = Math.max(
      wordOverlapScore(name, best.inci_name),
      wordOverlapScore(name, normalized(best.common_name))
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
  allIngredients: IngredientRow[],
  aliasMap?: Map<string, string>
): IngredientRow | null {
  const name = productIngredientName.trim().toLowerCase();
  if (!name) return null;

  if (aliasMap) {
    const aliasedId = aliasMap.get(name);
    if (aliasedId) {
      const byAlias = allIngredients.find((ing) => ing.id === aliasedId);
      if (byAlias) return byAlias;
    }
  }

  const exact = allIngredients.find(
    (ing) =>
      ing.inci_name.trim().toLowerCase() === name ||
      normalized(ing.common_name) === name
  );
  if (exact) return exact;

  const nameFirstWord = firstWord(name);
  if (nameFirstWord) {
    const firstWordCandidates = allIngredients.filter(
      (ing) =>
        firstWord(ing.inci_name.toLowerCase()) === nameFirstWord ||
        firstWord(normalized(ing.common_name)) === nameFirstWord
    );
    if (firstWordCandidates.length === 1) return firstWordCandidates[0];
    if (firstWordCandidates.length > 1) {
      return bestByOverlap(name, firstWordCandidates);
    }
  }

  // Minimum length for either side of a containment check -- short
  // strings (e.g. "TEA", a common_name for Triethanolamine) will
  // coincidentally appear inside unrelated names (e.g. "CeTEAreth-25"),
  // producing a confident-looking but wrong single-candidate match.
  const MIN_SUBSTRING_LENGTH = 4;
  const containsCandidates = allIngredients.filter((ing) => {
    const inci = ing.inci_name.trim().toLowerCase();
    const common = normalized(ing.common_name);
    return (
      (inci.length >= MIN_SUBSTRING_LENGTH &&
        (name.includes(inci) || inci.includes(name))) ||
      (common.length >= MIN_SUBSTRING_LENGTH &&
        (name.includes(common) || common.includes(name)))
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

// ---- Product-weight scoring modifier -----------------------------------
//
// Unlike every adjustment above, this isn't a per-ingredient nudge -- it's
// a single product-level modifier applied once, after the weighted-mean
// ingredient score is aggregated (see resolveScoreResult below). A product
// classified as "very_heavy" (see lib/productWeight.ts) is a strong
// formulation-level mismatch for fine straight hair regardless of how well
// any individual ingredient scores, and the reverse is true for coily hair
// needing more moisture/hold than a lightweight formula can deliver.
const WEIGHT_MODIFIERS: Record<CurlFamily, Record<ProductWeight, number>> = {
  straight: {
    ultralight: 5,
    light: 3,
    medium: 0,
    heavy: -10,
    very_heavy: -20,
  },
  wavy: {
    ultralight: 3,
    light: 2,
    medium: 0,
    heavy: -7,
    very_heavy: -15,
  },
  curly: {
    ultralight: 0,
    light: 2,
    medium: 3,
    heavy: 0,
    very_heavy: -5,
  },
  coily: {
    ultralight: -2,
    light: 0,
    medium: 3,
    heavy: 5,
    very_heavy: 3,
  },
};

export function getWeightModifier(
  weight: ProductWeight,
  family: CurlFamily | null
): number {
  if (!family) return 0; // "not_sure" or unrecognized curl type -- no adjustment
  return WEIGHT_MODIFIERS[family][weight];
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

// climate is auto-detected from the user's zip code (see
// lib/locationFactors.ts and /api/detect-location-factors) and stored as
// one of exactly four values: "humid", "tropical", "dry", "cold-dry".
function isHumidClimate(climate: string | null): boolean {
  return climate === "humid" || climate === "tropical";
}
function isDryClimate(climate: string | null): boolean {
  return climate === "dry" || climate === "cold-dry";
}

// Common humectants -- ingredients that work by attracting ambient
// moisture into the hair. That mechanism is climate-dependent: humid air
// gives them moisture to draw in; dry air has none, so the humectant can
// instead pull moisture back out of the hair and into the (drier)
// surrounding air.
const HUMECTANTS = new Set([
  "glycerin",
  "propanediol",
  "sodium hyaluronate",
  "hyaluronic acid",
  "sorbitol",
]);

// Climate + porosity adjustment for humectants, applied on top of
// whatever score the DB/curl-type steps already produced. Runs
// regardless of curl family or hairTypeOverridden -- climate physics
// isn't curl-pattern-specific the way the section-3 rules above are, and
// a DB row scoped to hair_type doesn't already account for it.
function applyClimateAdjustment(
  inciName: string,
  climate: string | null,
  porosity: string,
  score: number,
  rating: string
): { score: number; rating: string } {
  const name = inciName.trim().toLowerCase();
  if (!HUMECTANTS.has(name)) return { score, rating };

  let adjustedScore = score;

  if (isHumidClimate(climate)) {
    adjustedScore = clampScore(score + 2); // ambient moisture for the humectant to draw in
  } else if (isDryClimate(climate)) {
    // No ambient moisture to draw in -- the humectant can instead pull
    // moisture out of the hair shaft. Worse for high porosity hair,
    // which already struggles to retain moisture once it's in.
    const penalty = porosity === "high" ? 4 : porosity === "medium" ? 2 : 1;
    adjustedScore = clampScore(score - penalty);
  }

  if (adjustedScore === score) return { score, rating };
  return { score: adjustedScore, rating: ratingForScore(adjustedScore) };
}

// Chelating agents bind the calcium/magnesium ions hard water deposits on
// the hair shaft; clarifying surfactants (reusing the existing SULFATES
// set) help strip that same mineral buildup during cleansing. Both
// matter more in hard water areas -- in soft/moderate water there's
// little buildup to address, so they're left at their DB-resolved score
// rather than penalized (they're still fine ingredients, just not doing
// extra work).
const CHELATING_AGENTS = new Set([
  "citric acid",
  "tetrasodium edta",
  "disodium edta",
  "sodium phytate",
]);

function applyWaterHardnessAdjustment(
  inciName: string,
  waterHardness: string | null,
  score: number,
  rating: string
): { score: number; rating: string } {
  if (waterHardness !== "hard") return { score, rating };

  const name = inciName.trim().toLowerCase();
  let adjustedScore = score;

  if (CHELATING_AGENTS.has(name)) {
    adjustedScore = clampScore(score + 3);
  } else if (SULFATES.has(name)) {
    adjustedScore = clampScore(score + 2);
  }

  if (adjustedScore === score) return { score, rating };
  return { score: adjustedScore, rating: ratingForScore(adjustedScore) };
}

// ---- Age-range scoring adjustments -------------------------------------
//
// adult_age_range lives on hair_profiles as its own column, separate from
// the pre-existing age_range column (child/baby brackets like
// "0-12 months" -- see supabase/add_adult_age_range.sql). These
// adjustments apply on top of whatever score porosity/curl-type/climate/
// water-hardness already produced, same layering as
// applyClimateAdjustment and applyWaterHardnessAdjustment above.
//
// 18_25 and 26_35 are "peak hair health years" -- no modifiers, standard
// scoring applies. 46_55's rule set is the base tier that 56_65/65_plus
// double via midlifeModifier(), plus their own additional rules.

const FRAGRANCE = new Set(["parfum"]);
const YOUTH_ESSENTIAL_OILS = new Set([
  "mentha piperita oil", // Peppermint Oil
  "melaleuca alternifolia leaf oil", // Tea Tree Oil
  "eucalyptus globolus (eucalyptus) leaf oil", // Eucalyptus Oil
]);
const ROSEMARY = new Set([
  "rosmarinus officinalis leaf oil",
  "rosmarinus officinalis leaf extract",
]);
const BIOTIN = new Set(["biotin"]);
const SAW_PALMETTO = new Set(["serenoa serrulata fruit extract"]);
const PUMPKIN_SEED_OIL = new Set(["cucurbita pepo seed oil"]);
const CAFFEINE = new Set(["caffeine"]);
const HEAVY_SILICONES = new Set(["dimethicone", "amodimethicone"]);
const HEAVY_SULFATE = new Set(["sodium lauryl sulfate"]);
const HYDROLYZED_KERATIN = "hydrolyzed keratin";
const CERAMIDES = new Set(["ceramide np", "ceramide eop", "ceramide ap"]);
const PANTHENOL = new Set(["panthenol"]);
const LOW_CONC_STIMULANTS = new Set(["menthol", "mentha piperita oil"]);

function isPeptide(name: string): boolean {
  return name.includes("peptide");
}

// The 46_55 rule set, at "one tier" strength -- 56_65/65_plus reuse this
// doubled rather than duplicating each rule.
function midlifeModifier(name: string, position: number): number {
  let delta = 0;
  if (ROSEMARY.has(name)) delta += 1;
  if (BIOTIN.has(name)) delta += 1;
  if (SAW_PALMETTO.has(name)) delta += 1;
  if (PUMPKIN_SEED_OIL.has(name)) delta += 1;
  if (CAFFEINE.has(name)) delta += 1;
  if (name === HYDROLYZED_KERATIN && position <= 5) delta -= 1;
  if (HEAVY_SULFATE.has(name)) delta -= 2;
  if (FRAGRANCE.has(name)) delta -= 1;
  if (LIGHT_OILS.has(name)) delta += 1;
  return delta;
}

function applyAgeAdjustment(
  inciName: string,
  ageRange: string | null,
  porosity: string,
  position: number,
  score: number,
  rating: string
): { score: number; rating: string } {
  if (!ageRange || ageRange === "prefer_not_to_say") return { score, rating };

  const name = inciName.trim().toLowerCase();
  let delta = 0;

  if (ageRange === "under_18") {
    if (FRAGRANCE.has(name)) delta -= 2;
    if (YOUTH_ESSENTIAL_OILS.has(name)) delta -= 1;
    if (SULFATES.has(name)) delta -= 1;
  } else if (ageRange === "36_45") {
    if (ROSEMARY.has(name)) delta += 1;
    if (BIOTIN.has(name)) delta += 1;
    if (SAW_PALMETTO.has(name)) delta += 1;
    if (CAFFEINE.has(name)) delta += 1;
    if (HEAVY_SILICONES.has(name) && porosity === "low") delta -= 1;
  } else if (ageRange === "46_55") {
    delta += midlifeModifier(name, position);
  } else if (ageRange === "56_65" || ageRange === "65_plus") {
    delta += midlifeModifier(name, position) * 2;
    if (HEAVY_BUTTERS.has(name) && position <= 5) delta -= 1;
    if (CERAMIDES.has(name)) delta += 2;
    if (isPeptide(name)) delta += 2;
    if (PANTHENOL.has(name)) delta += 1;
    if (LOW_CONC_STIMULANTS.has(name)) delta += 1;
  }
  // 18_25 and 26_35: no modifiers.

  if (delta === 0) return { score, rating };
  const adjusted = clampScore(score + delta);
  return { score: adjusted, rating: ratingForScore(adjusted) };
}

// ---- Hair-concern scoring adjustments (thinning hair) --------------------
//
// hair_concerns is a free-text array on hair_profiles (see
// CONCERN_OPTIONS in app/profile/page.tsx) -- "thinning" is the value
// behind the "Thinning hair" checkbox. Applies on top of whatever score
// porosity/curl-type/climate/water-hardness/age already produced, same
// layering as applyAgeAdjustment above. Reuses several of that section's
// ingredient sets (ROSEMARY, BIOTIN, CAFFEINE, SAW_PALMETTO,
// PUMPKIN_SEED_OIL, SULFATES, isPeptide) since thinning-hair care and
// midlife hair care target a lot of the same ingredients.

const NIACINAMIDE = new Set(["niacinamide"]);
const CASTOR_OIL = new Set(["ricinus communis seed oil"]);

function applyThinningHairAdjustment(
  inciName: string,
  hairConcerns: string[] | null,
  position: number,
  score: number,
  rating: string
): { score: number; rating: string } {
  if (!hairConcerns?.includes("thinning")) return { score, rating };

  const name = inciName.trim().toLowerCase();
  let delta = 0;

  if (ROSEMARY.has(name)) delta += 2;
  if (BIOTIN.has(name)) delta += 2;
  if (CAFFEINE.has(name)) delta += 2;
  if (SAW_PALMETTO.has(name)) delta += 2;
  if (PUMPKIN_SEED_OIL.has(name)) delta += 2;
  if (NIACINAMIDE.has(name)) delta += 1;
  if (isPeptide(name)) delta += 2;
  if (CASTOR_OIL.has(name)) delta += 1;
  if (SULFATES.has(name)) delta -= 2;
  if (name === "dimethicone" && position <= 5) delta -= 1;

  if (delta === 0) return { score, rating };
  const adjusted = clampScore(score + delta);
  return { score: adjusted, rating: ratingForScore(adjusted) };
}

function applyCurlTypeAdjustment(
  inciName: string,
  family: CurlFamily | null,
  score: number,
  rating: string
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
    }
  } else if (family === "curly") {
    if (name === "dimethicone") {
      adjustedScore = Math.min(score, 4); // caution for curly per its specific profile
    } else if (SILICONES.has(name) && rating !== "caution" && rating !== "avoid") {
      adjustedScore = Math.min(score, 4); // buildup in curl pattern
    } else if (DEFINING_AGENTS.has(name)) {
      adjustedScore = Math.max(score, 8); // enhance curl definition
    }
  }

  if (adjustedScore === score) return { score, rating };
  return { score: adjustedScore, rating: ratingForScore(adjustedScore) };
}

export type ScoringProfile = {
  climate: string | null;
  waterHardness: string | null;
  porosity: string;
  scalpCondition: string | null;
  family: CurlFamily | null;
  ageRange: string | null;
  hairConcerns: string[] | null;
};

type ProfileRow = {
  curl_type: string | null;
  porosity: string | null;
  scalp_condition: string | null;
  climate: string | null;
  water_hardness: string | null;
  // Optional -- not every caller's select includes it (e.g.
  // lib/travelKitGenerator.ts doesn't apply age-based or concern-based
  // scoring), so these just fall back to no adjustment rather than
  // requiring every caller to be updated.
  adult_age_range?: string | null;
  hair_concerns?: string[] | null;
};

// Shared by loadScoringProfile (browser, localStorage-driven) and any
// server-side caller that already has a hair_profiles row in hand (e.g.
// travel kit generation in the Stripe webhook, which has no browser
// session/localStorage to read) -- so both paths apply the exact same
// porosity-default/normalization rules instead of two copies drifting
// apart. climate is intentionally overridable by the caller (e.g. a
// travel kit scores against the destination's climate, not the user's
// home climate) via the optional climateOverride param.
export function buildScoringProfile(
  row: ProfileRow,
  climateOverride?: string | null
): ScoringProfile {
  // porosity is never null in compatibility_scores -- default unknown
  // ("not sure") profiles to medium rather than a filter that would
  // never match anything.
  const porosity =
    row.porosity === "not sure" || row.porosity === "not_sure" || !row.porosity
      ? "medium"
      : row.porosity;

  return {
    climate: climateOverride !== undefined ? climateOverride : row.climate,
    waterHardness: row.water_hardness,
    porosity,
    scalpCondition: normalizeScalpCondition(row.scalp_condition),
    family: curlFamily(row.curl_type),
    ageRange: row.adult_age_range ?? null,
    hairConcerns: row.hair_concerns ?? null,
  };
}

async function loadScoringProfile(): Promise<
  { error: string } | { profile: ScoringProfile }
> {
  const profileId = localStorage.getItem("hair_profile_id");
  if (!profileId) {
    return {
      error: "No hair profile found. Save a profile on My Profile first.",
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("hair_profiles")
    .select(
      "curl_type, porosity, scalp_condition, strand_thickness, climate, water_hardness, adult_age_range, hair_concerns"
    )
    .eq("id", profileId)
    .single();

  if (profileError || !profile) {
    return { error: "Couldn't load your hair profile." };
  }

  return { profile: buildScoringProfile(profile) };
}

type PositionedIngredient = {
  id: string;
  inci_name: string;
  common_name: string | null;
  position: number;
};

type ScoreRow = {
  ingredient_id: string;
  scalp_condition: string | null;
  hair_type: string | null;
  score: number;
  rating: string;
};

async function fetchScoreRows(
  ingredientIds: string[],
  porosity: string
): Promise<{ data?: ScoreRow[]; error?: string }> {
  if (ingredientIds.length === 0) return { data: [] };

  const { data, error } = await supabase
    .from("compatibility_scores")
    .select("ingredient_id, scalp_condition, hair_type, score, rating")
    .in("ingredient_id", ingredientIds)
    .eq("porosity", porosity);

  if (error) return { error: error.message };
  return { data: data ?? [] };
}

// Pure -- given an already-fetched set of compatibility_scores rows
// (which may cover more ingredients than just this product's, when
// called from the batch path below), resolves the specificity tiers,
// applies the curl-type adjustment, and computes the position-weighted
// score. No I/O, so this is shared by every scoring entry point in this
// file regardless of how the ingredient list or score rows were gathered.
function resolveScoreResult(
  ingredients: PositionedIngredient[],
  scoreRows: ScoreRow[],
  profile: ScoringProfile,
  category: string | null = null
): ScoreResult {
  const { scalpCondition, family, climate, waterHardness, porosity, ageRange, hairConcerns } =
    profile;

  if (ingredients.length === 0) {
    return {
      normalizedScore: 0,
      matches: [],
      productWeight: classifyProductWeight([], category ?? ""),
    };
  }

  // Generic (scalp_condition/hair_type both null) rows first, then a row
  // scoped to the user's scalp condition, then -- most specific -- a row
  // scoped to their curl-type family (only present for ingredients seeded
  // with real hair_type data). hairTypeOverridden tracks which
  // ingredients got that most-specific row, since those should skip the
  // generic runtime adjustment below -- the DB value is already precise.
  const bestRowPerIngredient = new Map<string, { score: number; rating: string }>();
  const hairTypeOverridden = new Set<string>();

  for (const row of scoreRows) {
    if (row.scalp_condition === null && row.hair_type === null) {
      bestRowPerIngredient.set(row.ingredient_id, {
        score: row.score,
        rating: row.rating,
      });
    }
  }
  if (scalpCondition) {
    for (const row of scoreRows) {
      if (row.scalp_condition === scalpCondition && row.hair_type === null) {
        bestRowPerIngredient.set(row.ingredient_id, {
          score: row.score,
          rating: row.rating,
        });
      }
    }
  }
  if (family) {
    for (const row of scoreRows) {
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
  for (const ingredient of ingredients) {
    const scored = bestRowPerIngredient.get(ingredient.id);
    if (!scored) continue;

    let { score, rating } = hairTypeOverridden.has(ingredient.id)
      ? scored
      : applyCurlTypeAdjustment(
          ingredient.inci_name,
          family,
          scored.score,
          scored.rating
        );

    // Climate and water hardness are independent of curl-type/hair-type
    // scoping -- they apply on top regardless of whether the score above
    // came from a hair-type-specific DB row or the generic curl-type
    // adjustment.
    ({ score, rating } = applyClimateAdjustment(
      ingredient.inci_name,
      climate,
      porosity,
      score,
      rating
    ));
    ({ score, rating } = applyWaterHardnessAdjustment(
      ingredient.inci_name,
      waterHardness,
      score,
      rating
    ));
    ({ score, rating } = applyAgeAdjustment(
      ingredient.inci_name,
      ageRange,
      porosity,
      ingredient.position,
      score,
      rating
    ));
    ({ score, rating } = applyThinningHairAdjustment(
      ingredient.inci_name,
      hairConcerns,
      ingredient.position,
      score,
      rating
    ));

    matchList.push({
      ingredient_name: ingredient.common_name || ingredient.inci_name,
      score,
      rating,
      position: ingredient.position,
      weight: positionWeight(ingredient.position),
    });
  }

  // Weighted mean instead of a simple mean -- an ingredient at position 2
  // (weight 1.3) counts for more of the final score than the same
  // ingredient would at position 22 (weight 0.6). Still lands on the same
  // 0-100 scale as before since both the numerator and denominator carry
  // the weight. Capped defensively at 100 -- the weighted mean can't
  // mathematically exceed it, but the cap makes that guarantee explicit.
  const weightedSum = matchList.reduce((acc, m) => acc + m.score * m.weight, 0);
  const weightTotal = matchList.reduce((acc, m) => acc + m.weight, 0);
  const baseScore =
    weightTotal === 0
      ? 0
      : Math.min(100, Math.round((weightedSum / (weightTotal * 10)) * 100));

  // Product-weight modifier -- see getWeightModifier above. Applied once
  // here, after aggregation, rather than per-ingredient like every other
  // adjustment in this function: it's a judgment about the product's
  // overall formulation, not about any single ingredient's score.
  const orderedIngredientNames = [...ingredients]
    .sort((a, b) => a.position - b.position)
    .map((i) => i.inci_name);
  const productWeight = classifyProductWeight(orderedIngredientNames, category ?? "");
  const weightModifier = getWeightModifier(productWeight, family);
  const normalizedScore = Math.min(100, Math.max(0, baseScore + weightModifier));

  return { normalizedScore, matches: matchList, productWeight };
}

// Shared by the single-product scoring entry points below -- fetches
// compatibility_scores for just this ingredient list, then resolves it.
async function scorePositionedIngredients(
  ingredients: PositionedIngredient[],
  profile: ScoringProfile,
  category: string | null = null
): Promise<{ error?: string; result?: ScoreResult }> {
  if (ingredients.length === 0) {
    return {
      result: {
        normalizedScore: 0,
        matches: [],
        productWeight: classifyProductWeight([], category ?? ""),
      },
    };
  }

  const { data: scoreRows, error } = await fetchScoreRows(
    ingredients.map((i) => i.id),
    profile.porosity
  );
  if (error) return { error };

  return {
    result: resolveScoreResult(ingredients, scoreRows ?? [], profile, category),
  };
}

export async function scoreIngredientsText(
  ingredientsText: string
): Promise<{ error?: string; result?: ScoreResult }> {
  const ctx = await loadScoringProfile();
  if ("error" in ctx) return { error: ctx.error };
  const { profile } = ctx;

  const ingredientNames = parseIngredients(ingredientsText);

  const [{ data: allIngredients, error: ingredientsError }, { data: aliasRows }] =
    await Promise.all([
      supabase.from("ingredients").select("id, inci_name, common_name"),
      supabase.from("aliases").select("alias, ingredient_id"),
    ]);

  if (ingredientsError || !allIngredients) {
    return { error: "Couldn't load ingredient data." };
  }

  const aliasMap = new Map<string, string>();
  for (const row of aliasRows ?? []) {
    aliasMap.set(row.alias.trim().toLowerCase(), row.ingredient_id);
  }

  // position is the 1-based index of the ingredient's first appearance in
  // the (already deduped) parsed list -- labels list ingredients in
  // descending concentration order, so this doubles as a concentration
  // proxy for positionWeight below.
  const matched = new Map<string, IngredientRow>();
  const positionById = new Map<string, number>();
  ingredientNames.forEach((name, index) => {
    const match = findBestIngredientMatch(name, allIngredients, aliasMap);
    if (match) {
      matched.set(match.id, match);
      if (!positionById.has(match.id)) {
        positionById.set(match.id, index + 1);
      }
    }
  });

  const positioned: PositionedIngredient[] = Array.from(matched.entries()).map(
    ([id, ingredient]) => ({
      id,
      inci_name: ingredient.inci_name,
      common_name: ingredient.common_name,
      position: positionById.get(id) ?? Number.MAX_SAFE_INTEGER,
    })
  );

  return scorePositionedIngredients(positioned, profile, null);
}

// For products from Qoyl's own curated catalog -- reads
// catalog_product_ingredients directly instead of re-parsing label text,
// so scoring uses the exact ingredient links and positions set during
// curation (via /admin/products) rather than re-deriving them at score
// time. More accurate, and immune to any future drift in the text-based
// matcher above.
export async function scoreCatalogProduct(
  productId: string
): Promise<{ error?: string; result?: ScoreResult }> {
  const ctx = await loadScoringProfile();
  if ("error" in ctx) return { error: ctx.error };
  const { profile } = ctx;

  const [{ data: rows, error }, { data: productRow }] = await Promise.all([
    supabase
      .from("catalog_product_ingredients")
      .select("position, ingredients(id, inci_name, common_name)")
      .eq("product_id", productId)
      .order("position"),
    supabase
      .from("catalog_products")
      .select("categories(slug)")
      .eq("id", productId)
      .maybeSingle(),
  ]);

  if (error) {
    return { error: error.message };
  }

  const positioned: PositionedIngredient[] = (rows ?? [])
    .map((row) => {
      const ingredient = row.ingredients as unknown as IngredientRow | null;
      if (!ingredient) return null;
      return {
        id: ingredient.id,
        inci_name: ingredient.inci_name,
        common_name: ingredient.common_name,
        position: row.position,
      };
    })
    .filter((i): i is PositionedIngredient => i !== null);

  const categorySlug =
    (productRow?.categories as unknown as { slug: string } | { slug: string }[] | null) ?? null;
  const category = Array.isArray(categorySlug) ? categorySlug[0]?.slug : categorySlug?.slug;

  return scorePositionedIngredients(positioned, profile, category ?? null);
}

// Batch version of scoreCatalogProduct, for scoring an entire search
// results list at once (e.g. every result on /search, shown inline
// without a per-product tap). Loads the hair profile once and fetches
// catalog_product_ingredients + compatibility_scores in two queries
// covering every requested product, instead of N round trips each --
// important now that scoring runs eagerly for a whole result list
// rather than lazily for one selected product.
export async function scoreCatalogProducts(
  productIds: string[]
): Promise<Record<string, { error?: string; result?: ScoreResult }>> {
  if (productIds.length === 0) return {};

  const ctx = await loadScoringProfile();
  if ("error" in ctx) {
    return Object.fromEntries(productIds.map((id) => [id, { error: ctx.error }]));
  }

  return scoreCatalogProductsForProfile(productIds, ctx.profile);
}

// Same as scoreCatalogProducts, but for callers that already have a
// ScoringProfile in hand instead of a browser session to load one from
// (e.g. travel kit generation in the Stripe webhook -- no
// localStorage/user session exists there, so the caller fetches the
// hair_profiles row itself via the service-role client and builds the
// profile with buildScoringProfile()). catalog_products/
// catalog_product_ingredients/compatibility_scores are all
// anon-readable, so the plain supabase client works fine server-side
// for these reads -- only the hair_profiles fetch itself needs the
// service role, and that happens before this function is called.
export async function scoreCatalogProductsForProfile(
  productIds: string[],
  profile: ScoringProfile
): Promise<Record<string, { error?: string; result?: ScoreResult }>> {
  if (productIds.length === 0) return {};

  const [{ data: rows, error: piError }, { data: categoryRows }] = await Promise.all([
    supabase
      .from("catalog_product_ingredients")
      .select("product_id, position, ingredients(id, inci_name, common_name)")
      .in("product_id", productIds)
      .order("position"),
    supabase.from("catalog_products").select("id, categories(slug)").in("id", productIds),
  ]);

  if (piError) {
    return Object.fromEntries(
      productIds.map((id) => [id, { error: piError.message }])
    );
  }

  const categoryByProduct = new Map<string, string | null>();
  for (const row of categoryRows ?? []) {
    const categories = row.categories as unknown as
      | { slug: string }
      | { slug: string }[]
      | null;
    const slug = Array.isArray(categories) ? categories[0]?.slug : categories?.slug;
    categoryByProduct.set(row.id, slug ?? null);
  }

  const ingredientsByProduct = new Map<string, PositionedIngredient[]>();
  const allIngredientIds = new Set<string>();
  for (const row of rows ?? []) {
    const ingredient = row.ingredients as unknown as IngredientRow | null;
    if (!ingredient) continue;
    const list = ingredientsByProduct.get(row.product_id) ?? [];
    list.push({
      id: ingredient.id,
      inci_name: ingredient.inci_name,
      common_name: ingredient.common_name,
      position: row.position,
    });
    ingredientsByProduct.set(row.product_id, list);
    allIngredientIds.add(ingredient.id);
  }

  const { data: scoreRows, error: scoreError } = await fetchScoreRows(
    Array.from(allIngredientIds),
    profile.porosity
  );
  if (scoreError) {
    return Object.fromEntries(productIds.map((id) => [id, { error: scoreError }]));
  }

  const results: Record<string, { error?: string; result?: ScoreResult }> = {};
  for (const id of productIds) {
    results[id] = {
      result: resolveScoreResult(
        ingredientsByProduct.get(id) ?? [],
        scoreRows ?? [],
        profile,
        categoryByProduct.get(id) ?? null
      ),
    };
  }
  return results;
}
