import { supabase } from "@/lib/supabase";
import { classifyProductWeight, ProductWeight } from "@/lib/productWeight";

export type Match = {
  ingredient_name: string;
  // INCI name specifically (ingredient_name above prefers common_name) -
  // needed by detectIngredientInteractions below for name-based checks
  // (e.g. isSulfate) that must match on the chemical name, not whatever
  // display name a caller happens to see.
  inciName: string;
  score: number;
  rating: "good" | "neutral" | "caution" | "avoid" | string;
  position: number;
  weight: number;
  // ingredients.primary_function (see supabase/ingredient_function_tags.sql) -
  // null for ingredients not yet tagged. Drives both the function-aware
  // scoring modifiers below and the ingredient-breakdown badge on /search.
  primaryFunction: string | null;
  // Added alongside primaryFunction for interaction detection and name-
  // keyword evidence scoring below, both of which need to recognize e.g.
  // a secondary-protein ingredient the same way applyIngredientFunctionAdjustment
  // already does.
  secondaryFunction: string | null;
  // false when this ingredient had no compatibility_scores row at the
  // resolved porosity and was scored as a neutral 5/10 fallback instead
  // of excluded from the weighted mean - see resolveScoreResult.
  scoredFromDb: boolean;
};

// Human-readable labels for ingredients.primary_function, shared by the
// /search ingredient-breakdown badge (item 4) and anywhere else a
// function tag needs display text.
export const INGREDIENT_FUNCTION_LABELS: Record<string, string> = {
  humectant: "Humectant",
  emollient: "Emollient",
  emulsifier: "Emulsifier",
  surfactant: "Surfactant",
  conditioning_agent: "Conditioning",
  film_former: "Film Former",
  protein: "Protein",
  preservative: "Preservative",
  fragrance: "Fragrance",
  colorant: "Colorant",
  chelating_agent: "Chelating",
  ph_adjuster: "pH Adjuster",
  thickener: "Thickener",
  penetration_enhancer: "Penetration Enhancer",
  antifungal: "Antifungal",
  occlusive: "Occlusive",
  solvent: "Solvent",
  antioxidant: "Antioxidant",
  scalp_active: "Scalp Active",
  bond_builder: "Bond Builder",
};

export type ScoreResult = {
  normalizedScore: number;
  matches: Match[];
  productWeight: ProductWeight;
  // Product-name keyword scoring (see getNameKeywordModifiers below) -
  // nameKeywordModifier is already folded into normalizedScore;
  // nameKeywordMatch is only set when the modifier is significant enough
  // (>4 positive or <-4 negative) to surface as why-copy/a badge, and is
  // null otherwise even if smaller keyword matches contributed to the
  // score.
  nameKeywordModifier: number;
  nameKeywordMatch: (NameKeywordMatch & { direction: "positive" | "negative" }) | null;
  // Ingredients with no compatibility_scores row at the resolved porosity -
  // scored as a neutral 5/10 fallback (see resolveScoreResult) rather than
  // silently excluded, surfaced here so the UI can disclose it.
  unscoredIngredientCount: number;
  unscoredIngredientNames: string[];
  // Whole-formula patterns detected across multiple ingredients at once -
  // see detectIngredientInteractions. Each modifier is already folded
  // into normalizedScore.
  interactionsDetected: IngredientInteraction[];
  // INCI names of any formaldehyde-releasing preservative present -
  // see applyFormaldehydeReleaserOverride. Empty array (not null) when none.
  formaldehydeReleasersPresent: string[];
};

export type IngredientInteraction = {
  interactionId: string;
  modifier: number;
  explanation: string;
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
// up - an ingredient at position 2 matters far more than the same
// ingredient at position 22. position is 1-based.
export function positionWeight(position: number): number {
  if (position <= 5) return 1.3;
  if (position <= 10) return 1.0;
  if (position <= 20) return 0.8;
  return 0.6;
}

// Redesign item 8 - score badges dropped their background fill; the
// number itself now carries the tier color, set in Space Mono.
export const TIER_CLASSES: Record<"green" | "amber" | "red", string> = {
  green: "font-mono font-bold text-green",
  amber: "font-mono font-bold text-amber",
  red: "font-mono font-bold text-red",
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
  // Nullable in the DB - ingredients auto-created from an unmatched
  // label (see lib/adminProducts.ts's matchIngredientNames) only get an
  // inci_name, not a curated common_name.
  common_name: string | null;
  // Optional (not selected by every caller - e.g. lib/adminProducts.ts's
  // ingredient-matching query has no need for them) rather than required,
  // so existing selects that omit these columns still satisfy the type.
  primary_function?: string | null;
  secondary_function?: string | null;
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
// the common name inside the INCI name - e.g. "Cocos Nucifera (Coconut)
// Oil" - while our ingredients table stores the botanical and common
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

  // Minimum length for either side of a containment check - short
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
// - a small set of category rules (silicones, heavy butters, sulfates,
// etc.) nudge the porosity-resolved score/rating for straight/wavy/curly
// hair. Coily (type 4) is never adjusted - it's the original, already-
// calibrated baseline this whole table was built around.
//
// Ingredients added specifically for types 1-3 (see the section-3 seed
// SQL) carry a real hair_type value on their own compatibility_scores
// rows instead, which take precedence over these generic rules - see
// the hairTypeOverridden set in scoreIngredientsText.

export type CurlFamily = "straight" | "wavy" | "curly" | "coily";

// hair_profiles.color_treated is a real Postgres boolean column, but
// the profile form's local state (and every hand-written check across
// the app, including the client-side `hairProfile.color_treated ===
// "yes"` reads in app/search/page.tsx) treats it as a "yes"/"no" string
// - that convention works fine while the value only ever lives in
// React state between button clicks, but breaks the instant it round-
// trips through a real Supabase select, which returns an actual JS
// boolean. This tolerates both representations everywhere color_treated
// is read from a live DB row.
export function isColorTreatedYes(value: string | boolean | null | undefined): boolean {
  return value === "yes" || value === true;
}

export function curlFamily(curlType: string | null): CurlFamily | null {
  if (!curlType) return null;
  const t = curlType.trim().toLowerCase();
  if (t.startsWith("1")) return "straight";
  if (t.startsWith("2")) return "wavy";
  if (t.startsWith("3")) return "curly";
  if (t.startsWith("4")) return "coily";
  return null; // "not_sure" or unrecognized - no adjustment
}

// ---- Product-weight scoring modifier -----------------------------------
//
// Unlike every adjustment above, this isn't a per-ingredient nudge - it's
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
    heavy: -20,
    very_heavy: -35,
  },
  wavy: {
    ultralight: 3,
    light: 2,
    medium: 0,
    heavy: -15,
    very_heavy: -25,
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
  if (!family) return 0; // "not_sure" or unrecognized curl type - no adjustment
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
// Panthenol, Hydrolyzed Silk - "increase score for fine straight hair."
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

// Common humectants - ingredients that work by attracting ambient
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
// regardless of curl family or hairTypeOverridden - climate physics
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
    // No ambient moisture to draw in - the humectant can instead pull
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
// matter more in hard water areas - in soft/moderate water there's
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
// "0-12 months" - see supabase/add_adult_age_range.sql). These
// adjustments apply on top of whatever score porosity/curl-type/climate/
// water-hardness already produced, same layering as
// applyClimateAdjustment and applyWaterHardnessAdjustment above.
//
// 18_25 and 26_35 are "peak hair health years" - no modifiers, standard
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

// The 46_55 rule set, at "one tier" strength - 56_65/65_plus reuse this
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
// CONCERN_OPTIONS in app/profile/page.tsx) - "thinning" is the value
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

// ---- Color-treated hair scoring adjustments -----------------------------
//
// color_treated on hair_profiles is a "yes"/"no" string, not a real
// boolean (matches app/profile/page.tsx's form state). The porosity
// override that makes color-treated hair score against a higher-porosity
// tier's compatibility_scores rows lives in buildScoringProfile above -
// this section is only the additional per-ingredient nudges layered on
// top of that, same pattern as applyAgeAdjustment/
// applyThinningHairAdjustment.
//
// Reuses SULFATE_FREE_CLEANSERS, CERAMIDES, and PANTHENOL from earlier
// sections rather than redefining narrower duplicate sets - those already
// cover (and slightly exceed) the specific ingredients named in the spec
// this was built from.
const BOND_REPAIR_INGREDIENTS = new Set([
  "bis-aminopropyl dimethicone",
  "maleic acid",
  "crotonyl-vinyl pyrrolidone",
]);
const OLAPLEX_ACTIVE = new Set(["bis-aminopropyl diglycol dimaleate"]);
// SLS/SLES are the existing SULFATES set; ALS (Ammonium Lauryl Sulfate)
// only matters for this color-fade rule, so it's added on top rather
// than widening SULFATES itself (which other sections key off for their
// own, unrelated reasons).
const COLOR_FADING_SULFATES = new Set(
  Array.from(SULFATES).concat("ammonium lauryl sulfate")
);
// No pH field exists anywhere in the ingredients table - this is a
// curated set of common high-pH/alkaline haircare ingredients (the kind
// used as pH adjusters or in chemical processing) rather than a derived
// value, since none is available.
const HIGH_PH_INGREDIENTS = new Set([
  "ammonium hydroxide",
  "sodium hydroxide",
  "potassium hydroxide",
  "guanidine carbonate",
  "triethanolamine",
]);
// Direct-dye/color-depositing pigments (e.g. purple-shampoo actives) -
// penalized for any color-treated user here, since there's no product
// metadata anywhere describing which specific shade a product deposits
// to compare against the user's own color_type.
const COLOR_DEPOSITING_PIGMENTS = new Set([
  "hc blue no. 2",
  "basic blue 99",
  "acid violet 43",
]);

function isHydrolyzedProtein(name: string): boolean {
  return name.startsWith("hydrolyzed");
}

export function isSulfate(inciName: string): boolean {
  return COLOR_FADING_SULFATES.has(inciName.trim().toLowerCase());
}

function applyColorTreatedAdjustment(
  inciName: string,
  colorTreated: boolean,
  alreadyHighPorosity: boolean,
  score: number,
  rating: string
): { score: number; rating: string } {
  if (!colorTreated) return { score, rating };

  const name = inciName.trim().toLowerCase();
  let delta = 0;

  if (
    SULFATE_FREE_CLEANSERS.has(name) ||
    BOND_REPAIR_INGREDIENTS.has(name) ||
    OLAPLEX_ACTIVE.has(name) ||
    isHydrolyzedProtein(name) ||
    CERAMIDES.has(name) ||
    PANTHENOL.has(name)
  ) {
    delta += 2;
  }

  // "If high -> keep as high but increase the penalty on ingredients
  // that cause further damage" - there's no higher porosity tier left
  // to bump to, so the damage-causing ingredients (sulfates/high-pH) get
  // an extra point of penalty instead, on top of the standard -2.
  const damagePenalty = alreadyHighPorosity ? 3 : 2;
  if (COLOR_FADING_SULFATES.has(name)) delta -= damagePenalty;
  if (HIGH_PH_INGREDIENTS.has(name)) delta -= damagePenalty;
  if (COLOR_DEPOSITING_PIGMENTS.has(name)) delta -= 2;

  if (delta === 0) return { score, rating };
  const adjusted = clampScore(score + delta);
  return { score: adjusted, rating: ratingForScore(adjusted) };
}

// ---- Formaldehyde-releasing preservative override -----------------------
//
// These release small amounts of formaldehyde over time as they break
// down, which is the actual irritant/sensitizer/carcinogen-classified
// exposure - the preservative itself isn't the concern, what it releases
// is. That's categorically different from every other adjustment in this
// file (which nudge a score up or down) - this overrides the score
// outright, the same pattern applyBabySafetyAdjustment below uses for its
// own hard-avoid list, and runs last (after every other per-ingredient
// adjustment) so nothing upstream can soften it.
//
// Dropped Butylated Hydroxytoluene (BHT) from an earlier draft of this
// list - it's a synthetic antioxidant, not a formaldehyde releaser, and
// including it here would have been a real inaccuracy in a safety-
// education feature. Bronopol (2-Bromo-2-Nitropropane-1,3-Diol) is
// arguably a 6th member of this family but wasn't in the original list
// this was scoped from, so it's left out rather than silently expanded.
const FORMALDEHYDE_RELEASERS = new Set([
  "dmdm hydantoin",
  "quaternium-15",
  "imidazolidinyl urea",
  "diazolidinyl urea",
  "sodium hydroxymethylglycinate",
]);

function applyFormaldehydeReleaserOverride(
  inciName: string,
  score: number,
  rating: string
): { score: number; rating: string } {
  const name = inciName.trim().toLowerCase();
  if (!FORMALDEHYDE_RELEASERS.has(name)) return { score, rating };
  return { score: 3, rating: "avoid" };
}

// ---- Baby-safety and child-safety scoring adjustments ---------------------
//
// Baby scoring (item 6 of the family-profiles spec) is safety-first, not
// compatibility-based: a handful of ingredient categories are hard-avoid
// for infant scalps regardless of porosity/curl-type/anything else, and a
// handful of gentle ingredients score higher. This intentionally
// overrides (not just deltas) score/rating for the avoid list, since
// "avoid regardless of hair type" is a stronger claim than every other
// adjustment in this file makes.

const BABY_AVOID_FRAGRANCE = new Set(["parfum", "fragrance"]);
const BABY_AVOID_ESSENTIAL_OILS = new Set([
  "mentha piperita oil", // Peppermint Oil
  "eucalyptus globolus (eucalyptus) leaf oil", // Eucalyptus Oil
  "melaleuca alternifolia leaf oil", // Tea Tree Oil
  "lavandula angustifolia (lavender) oil", // Lavender Oil
  "rosmarinus officinalis leaf oil", // Rosemary Oil
]);
const BABY_AVOID_SURFACTANTS = new Set(["sodium lauryl sulfate"]);
const BABY_AVOID_PARABENS = new Set([
  "methylparaben",
  "propylparaben",
  "butylparaben",
  "ethylparaben",
]);
const BABY_AVOID_PHTHALATES = new Set(["dibutyl phthalate", "diethyl phthalate"]);
const BABY_AVOID_FORMALDEHYDE_RELEASERS = new Set(["dmdm hydantoin", "imidazolidinyl urea"]);
const BABY_AVOID_OTHER = new Set(["retinol", "salicylic acid", "alcohol denat"]);

const BABY_GENTLE_BOOST: Record<string, number> = {
  "cocamidopropyl betaine": 3,
  "decyl glucoside": 3,
  glycerin: 2,
  "aloe barbadensis leaf juice": 2, // Aloe Vera
  panthenol: 2,
  "calendula officinalis flower extract": 2,
  "chamomilla recutita (matricaria) flower extract": 2, // Chamomile Extract
};

function isBabyAvoidIngredient(name: string): boolean {
  return (
    BABY_AVOID_FRAGRANCE.has(name) ||
    BABY_AVOID_ESSENTIAL_OILS.has(name) ||
    BABY_AVOID_SURFACTANTS.has(name) ||
    BABY_AVOID_PARABENS.has(name) ||
    BABY_AVOID_PHTHALATES.has(name) ||
    BABY_AVOID_FORMALDEHYDE_RELEASERS.has(name) ||
    BABY_AVOID_OTHER.has(name)
  );
}

function applyBabySafetyAdjustment(
  inciName: string,
  babySafety: boolean,
  score: number,
  rating: string
): { score: number; rating: string } {
  if (!babySafety) return { score, rating };

  const name = inciName.trim().toLowerCase();
  if (isBabyAvoidIngredient(name)) return { score: 0, rating: "avoid" };

  const boost = BABY_GENTLE_BOOST[name];
  if (!boost) return { score, rating };
  const adjusted = clampScore(score + boost);
  return { score: adjusted, rating: ratingForScore(adjusted) };
}

// Child scoring reuses the normal curl-type/scalp-condition pipeline (it's
// "same as adult BUT..." per spec, not a from-scratch safety-first mode
// like babies), with two extra ingredient-level cautions layered on top.
function applyChildSafetyAdjustment(
  inciName: string,
  childSafety: { ageRange: string | null; sensorySensitive: boolean } | undefined,
  score: number,
  rating: string
): { score: number; rating: string } {
  if (!childSafety) return { score, rating };

  const name = inciName.trim().toLowerCase();
  const isUnder8 =
    childSafety.ageRange === "2-4" || childSafety.ageRange === "5-7";

  if (FRAGRANCE.has(name)) {
    // Sensory-sensitive children get the harder "avoid" treatment; everyone
    // else just gets a one-point caution, not a hard avoid.
    if (childSafety.sensorySensitive) return { score: 0, rating: "avoid" };
    const adjusted = clampScore(score - 1);
    return { score: adjusted, rating: ratingForScore(adjusted) };
  }

  if (isUnder8 && YOUTH_ESSENTIAL_OILS.has(name)) {
    const adjusted = clampScore(score - 1);
    return { score: adjusted, rating: ratingForScore(adjusted) };
  }

  return { score, rating };
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

// ---- Product-name keyword scoring ---------------------------------------
//
// A second, independent signal on top of the ingredient score above: what
// a brand calls a product ("Volume & Lift Shampoo", "Curl Defining
// Custard") is a real, if noisy, indicator of intended use that
// ingredient analysis alone can miss - two products with near-identical
// INCI lists can be marketed and formulated for opposite hair goals via
// small differences in surfactant ratios, silicone load, etc. that don't
// show up as a difference in *which* ingredients are present.
//
// Deliberately capped at +/-15 (see NAME_KEYWORD_CAP below) so this can
// nudge the score but never override what the ingredient list itself
// says - a product called "Curl Defining Cream" with three drying
// alcohols near the top of its ingredient list should still score poorly
// overall.
export type NameKeywordMatch = {
  category: string;
  label: string;
  delta: number;
};

const NAME_KEYWORD_CAP = 15;

type KeywordContext = {
  hairConcerns: string[];
  family: CurlFamily | null;
  porosity: string;
  scalpCondition: string | null;
  colorTreated: boolean;
};

function hasAny(text: string, keywords: string[]): boolean {
  return keywords.some((k) => text.includes(k));
}

function hasConcern(concerns: string[], ...names: string[]): boolean {
  return names.some((n) => concerns.includes(n));
}

// Each entry mirrors one section of the request's keyword spec - the
// keyword list that gates it, and a scorer producing this category's
// delta plus (when it fires) the label used in why-copy/badges.
const NAME_KEYWORD_CATEGORIES: {
  category: string;
  label: string;
  keywords: string[];
  score: (ctx: KeywordContext) => number;
}[] = [
  {
    category: "volume",
    label: "volume and lift",
    keywords: ["volume", "volumiz", "lift", "body", "thicken", "plump"],
    score: ({ hairConcerns, family }) => {
      let d = 0;
      // No dedicated "lacks volume"/"limp" concern exists in this app's
      // real CONCERN_OPTIONS (see app/profile/page.tsx) - "thinning" is
      // the closest real signal that volume-boosting copy is relevant.
      if (hasConcern(hairConcerns, "thinning")) d += 8;
      if (family === "straight" || family === "wavy") d += 5;
      if (family === "coily") d -= 3;
      return d;
    },
  },
  {
    category: "moisture",
    label: "moisture and hydration",
    keywords: ["moisture", "hydrat", "quench", "thirst", "drench", "replenish"],
    score: ({ hairConcerns, porosity }) => {
      let d = 0;
      // "brittleness" isn't a real concern value here - "dryness" is.
      if (hasConcern(hairConcerns, "dryness")) d += 6;
      if (porosity === "high") d += 4;
      if (porosity === "low") d -= 2;
      return d;
    },
  },
  {
    category: "curl_definition",
    label: "curl definition",
    keywords: ["curl", "coil", "define", "definition", "pattern", "enhance"],
    score: ({ family }) => {
      let d = 0;
      if (family === "curly" || family === "coily") d += 6;
      if (family === "straight") d -= 8;
      if (family === "wavy") d += 2;
      return d;
    },
  },
  {
    category: "scalp",
    label: "scalp health",
    keywords: ["scalp", "root", "follicle", "growth", "stimulat"],
    // "scalp" and "growth" (not "scalp_issues"/"slow_growth") are this
    // app's real concern values.
    score: ({ hairConcerns }) =>
      hasConcern(hairConcerns, "scalp", "thinning", "growth") ? 8 : 2,
  },
  {
    category: "strengthening",
    label: "strengthening and repair",
    keywords: [
      "strength", "strengthen", "fortif", "bond", "repair", "restore",
      "reconstruct", "resilience", "reinforc",
    ],
    // "damage" isn't a real concern value here - "breakage" is the real
    // analog.
    score: ({ hairConcerns }) =>
      hasConcern(hairConcerns, "breakage", "thinning") ? 8 : 3,
  },
  {
    category: "frizz_control",
    label: "frizz control",
    keywords: [
      "frizz", "smooth", "sleek", "anti-frizz", "anti frizz", "tame", "control",
    ],
    score: ({ hairConcerns, family }) => {
      let d = 0;
      if (hasConcern(hairConcerns, "frizz")) d += 8;
      if (family === "wavy") d += 4;
      if (family === "straight") d += 3;
      return d;
    },
  },
  {
    category: "protein",
    label: "protein",
    keywords: ["protein", "keratin", "peptide", "amino", "silk", "collagen"],
    score: ({ porosity, hairConcerns }) => {
      let d = 0;
      if (porosity === "high") d += 6;
      if (porosity === "low") d -= 4;
      // "damage" isn't a real concern value here - "breakage" is.
      if (hasConcern(hairConcerns, "breakage")) d += 5;
      return d;
    },
  },
  {
    category: "clarifying",
    label: "clarifying",
    keywords: ["clarif", "detox", "cleanse", "purif", "reset", "chelat"],
    // Everyone benefits a little; water-hardness scoring (see
    // applyWaterHardnessAdjustment) is what actually drives the bulk of
    // this recommendation for hard-water users.
    score: () => 2,
  },
  {
    category: "color_treated",
    label: "color-treated hair",
    keywords: [
      "color", "colour", "color-safe", "color safe", "color protect", "vibrancy", "fade",
    ],
    // Color-treated status is a real boolean field on the profile
    // (hair_profiles.color_treated), not a hair_concerns value - there
    // is no "color_treated"/"color-treated" concern in this app.
    score: ({ colorTreated }) => (colorTreated ? 8 : -2),
  },
  {
    category: "sensitive_scalp",
    label: "gentle, sensitive-scalp care",
    keywords: ["sensitive", "gentle", "sooth", "calm", "relief", "itch", "comfort"],
    // "itchy" isn't a real scalp_condition value here - "sensitive" is.
    score: ({ scalpCondition }) => (scalpCondition === "sensitive" ? 8 : 1),
  },
  {
    category: "natural",
    label: "natural, clean ingredients",
    keywords: ["natural", "organic", "botanical", "plant-based", "clean"],
    score: () => 2,
  },
  {
    category: "heat_protection",
    label: "heat protection",
    keywords: ["heat", "thermal", "blowout", "blow dry", "flat iron", "hot tool"],
    score: ({ family }) => (family === "straight" || family === "wavy" ? 6 : 3),
  },
  {
    category: "protective_styling",
    label: "protective styling",
    keywords: ["braid", "loc", "twist", "protective", "extension"],
    // No "protective_styling" concern exists in this app - family alone
    // (coily hair being the most common protective-styling wearer) is
    // the only real signal available here.
    score: ({ family }) => (family === "coily" ? 6 : 0),
  },
  {
    category: "anti_dandruff",
    label: "anti-dandruff care",
    keywords: ["dandruff", "flake", "seborrheic", "pyrithione", "zinc"],
    // normalizeScalpCondition maps the raw "dandruff-prone" DB value to
    // "dandruff" - there is no "dandruff_prone" in a built ScoringProfile.
    score: ({ scalpCondition }) => (scalpCondition === "dandruff" ? 10 : -3),
  },
  {
    category: "wavy",
    label: "wave-enhancing",
    keywords: ["wave", "wavy", "beach wave", "sea salt"],
    score: ({ family }) => {
      if (family === "wavy") return 8;
      if (family === "straight") return 3;
      if (family === "coily") return -5;
      return 0;
    },
  },
];


// ---- Name-keyword validation against real ingredients --------------------
//
// A product name is a claim ("Scalp Strengthening"); the ingredient list
// is the evidence for that claim. Without this, the name-keyword modifier
// could swing a score as much as an entire category of real ingredient
// chemistry (audit finding: +15 on Test C from name alone). This scales
// each matching category's delta by how well the SCORED ingredients back
// up that specific category's claim before it's summed into the total.
//
// Each category maps to the ingredient function(s) that would genuinely
// support its claim - e.g. "Scalp Strengthening" is only as credible as
// the scalp_active/bond_builder ingredients actually in the formula.
// "volume" is position-based rather than function-based per its own
// definition (lightweight = early-position ingredients, not a function
// tag). "natural" has no ingredient-function analog at all (nothing in
// ingredients.primary_function means "natural") - exempted rather than
// forced through a made-up mapping, so it always applies at full
// strength like every category did before this existed.
const NAME_KEYWORD_EVIDENCE_FUNCTIONS: Partial<Record<string, string[]>> = {
  moisture: ["humectant"],
  curl_definition: ["film_former", "conditioning_agent", "humectant"],
  scalp: ["scalp_active", "bond_builder"],
  strengthening: ["scalp_active", "bond_builder", "protein"],
  frizz_control: ["film_former", "conditioning_agent"],
  protein: ["protein"],
  clarifying: ["chelating_agent", "surfactant"],
  color_treated: ["bond_builder"],
  sensitive_scalp: ["scalp_active"],
  heat_protection: ["film_former"],
  protective_styling: ["occlusive", "emollient"],
  anti_dandruff: ["scalp_active"],
  wavy: ["humectant", "conditioning_agent"],
};
const NAME_KEYWORD_EVIDENCE_EXEMPT = new Set(["natural"]);

// 0-1: what proportion of this product's scored ingredients back up the
// given category's claim. "volume" checks position instead of function
// (its own definition); categories in NAME_KEYWORD_EVIDENCE_EXEMPT or with
// no mapping return 1 (full strength) rather than silently zeroing out a
// category nobody has defined evidence for yet.
function computeIngredientEvidence(category: string, matches: Match[]): number {
  if (NAME_KEYWORD_EVIDENCE_EXEMPT.has(category)) return 1;
  if (matches.length === 0) return 0;

  if (category === "volume") {
    const supporting = matches.filter((m) => m.position <= 5 && m.score >= 7).length;
    return supporting / matches.length;
  }

  const qualifyingFunctions = NAME_KEYWORD_EVIDENCE_FUNCTIONS[category];
  if (!qualifyingFunctions) return 1;

  const supporting = matches.filter(
    (m) =>
      m.score >= 7 &&
      ((m.primaryFunction && qualifyingFunctions.includes(m.primaryFunction)) ||
        (m.secondaryFunction && qualifyingFunctions.includes(m.secondaryFunction)))
  ).length;
  return supporting / matches.length;
}

// Scales a category's raw delta down when the ingredients don't back up
// what the name claims - applies to negative deltas too (a "curl
// defining" claim mismatched with straight hair's ingredients is just as
// unvalidated as a positive claim would be), per the same evidence check.
function getValidatedNameKeywordModifier(rawNameModifier: number, ingredientEvidence: number): number {
  if (ingredientEvidence > 0.7) return rawNameModifier;
  if (ingredientEvidence > 0.4) return Math.round(rawNameModifier * 0.6);
  return Math.round(rawNameModifier * 0.3);
}

// Sums every matching category's VALIDATED delta (see above), capped to
// +/-15 - the total is what stacks onto the ingredient score.
// topPositive/topNegative (the single largest contributor in each
// direction, post-validation) drive the why-copy addendum and search/
// routine badge, so a product with several small matching categories
// still gets one clear, specific reason surfaced rather than a vague
// blend of all of them. ingredientMatches defaults to [] for any caller
// that hasn't been updated to pass the scored ingredient list - every
// category then falls back to 0 evidence (30% strength) rather than
// throwing, since "unknown ingredient support" is a safer default than
// "assume full support."
export function getNameKeywordModifiers(
  productName: string,
  hairConcerns: string[] | null,
  family: CurlFamily | null,
  porosity: string,
  scalpCondition: string | null,
  colorTreated: boolean = false,
  ingredientMatches: Match[] = []
): { modifier: number; topPositive: NameKeywordMatch | null; topNegative: NameKeywordMatch | null } {
  const name = productName.toLowerCase();
  const ctx: KeywordContext = { hairConcerns: hairConcerns ?? [], family, porosity, scalpCondition, colorTreated };

  let total = 0;
  let topPositive: NameKeywordMatch | null = null;
  let topNegative: NameKeywordMatch | null = null;

  for (const entry of NAME_KEYWORD_CATEGORIES) {
    if (!hasAny(name, entry.keywords)) continue;
    const rawDelta = entry.score(ctx);
    if (rawDelta === 0) continue;

    const evidence = computeIngredientEvidence(entry.category, ingredientMatches);
    const delta = getValidatedNameKeywordModifier(rawDelta, evidence);
    if (delta === 0) continue;
    total += delta;

    const match: NameKeywordMatch = { category: entry.category, label: entry.label, delta };
    if (delta > 0 && (!topPositive || delta > topPositive.delta)) topPositive = match;
    if (delta < 0 && (!topNegative || delta < topNegative.delta)) topNegative = match;
  }

  return {
    modifier: Math.max(-NAME_KEYWORD_CAP, Math.min(NAME_KEYWORD_CAP, total)),
    topPositive,
    topNegative,
  };
}

// Short "Matches your X" badge text, keyed by category - shown on
// product cards (search results, routine picks) whenever
// ScoreResult.nameKeywordModifier >= 6, per the request. Only ever
// looked up for a positive match (see nameKeywordBadgeLabel below), so
// there's no negative-direction entry needed here.
const NAME_KEYWORD_BADGE_TEXT: Record<string, string> = {
  volume: "Matches your volume goal",
  moisture: "Matches your moisture needs",
  curl_definition: "Matches your curl goals",
  scalp: "Matches your scalp concern",
  strengthening: "Matches your strengthening goals",
  frizz_control: "Matches your frizz concern",
  protein: "Matches your protein needs",
  clarifying: "Matches your clarifying needs",
  color_treated: "Matches your color-treated hair",
  sensitive_scalp: "Matches your sensitive scalp needs",
  natural: "Matches your clean ingredient preference",
  heat_protection: "Matches your heat styling needs",
  protective_styling: "Matches your protective style needs",
  anti_dandruff: "Matches your scalp concern",
  wavy: "Matches your wave goals",
};

// Bronze "Matches your X" badge text for a scored product, or null when
// the name-keyword modifier isn't significant enough (>= 6) to call out.
export function nameKeywordBadgeLabel(result: {
  nameKeywordModifier: number;
  nameKeywordMatch: (NameKeywordMatch & { direction: "positive" | "negative" }) | null;
}): string | null {
  if (result.nameKeywordModifier < 6) return null;
  const match = result.nameKeywordMatch;
  if (!match || match.direction !== "positive") return null;
  return NAME_KEYWORD_BADGE_TEXT[match.category] ?? `Matches your ${match.label} goal`;
}

// Extra why-copy sentence reflecting a significant name-keyword match
// (positive: >4, negative: <-4 - see resolveScoreResult). Returns null
// when there's nothing significant enough to call out.
export function nameKeywordWhyCopyAddendum(
  match: (NameKeywordMatch & { direction: "positive" | "negative" }) | null
): string | null {
  if (!match) return null;
  if (match.direction === "negative") {
    return `Note: this product is formulated for ${match.label} which differs from your profile - consider it a secondary option.`;
  }
  if (match.category === "protein") {
    return `This product's protein-forward formula is well suited for your hair.`;
  }
  if (match.category === "color_treated") {
    return `This product is specifically formulated for color-treated hair - a strong match for your color-treated profile.`;
  }
  return `This product is specifically formulated for ${match.label} - which aligns with your hair goals.`;
}

// ---- Ingredient-function-aware scoring modifiers ------------------------
//
// A third, independent layer (alongside the curl-type/climate/etc.
// per-ingredient adjustments above and the product-name keyword modifier
// above that) - this one keyed off ingredients.primary_function/
// secondary_function (see supabase/ingredient_function_tags.sql) rather
// than a hardcoded ingredient-name Set, and the first one to use
// ingredient *position* as a concentration proxy for a function-level
// judgment ("is this humectant the star of the formula, or a trace
// amount near the end of the list?").
//
// This deliberately overlaps with a few existing Set-based rules
// (HUMECTANTS in applyClimateAdjustment, CHELATING_AGENTS in
// applyWaterHardnessAdjustment) rather than replacing them - same
// "stack, don't merge" approach as getNameKeywordModifiers above. The
// two signals answer different questions (climate physics vs. formula
// prominence) and an ingredient tagged by both isn't being double-
// counted for the same reason, just penalized/boosted twice for two
// related-but-distinct ones.
//
// hairConcerns/scalpCondition values below are this app's REAL values
// (see CONCERN_OPTIONS/SCALP_OPTIONS in app/profile/page.tsx and
// normalizeScalpCondition above) - there is no "damage",
// "color_treated", or "dandruff_prone" concern/scalp value in this app.
// "damage" is treated as this app's "breakage" concern; "color-treated"
// as profile.colorTreated (a real boolean field, not a concern);
// "dandruff_prone" as the normalized "dandruff" scalp value.
const SALICYLIC_ACID = new Set(["salicylic acid"]);
const ZINC_PYRITHIONE = new Set(["zinc pyrithione"]);

function isGentleSurfactant(name: string): boolean {
  return name.includes("betaine") || name.includes("glucoside");
}

function applyIngredientFunctionAdjustment(
  ingredient: PositionedIngredient,
  profile: ScoringProfile,
  score: number,
  rating: string
): { score: number; rating: string } {
  const name = ingredient.inci_name.trim().toLowerCase();
  const { primary_function: primaryFn, secondary_function: secondaryFn, position } = ingredient;
  const { climate, porosity, family, scalpCondition, waterHardness, hairConcerns, colorTreated } = profile;
  const hasBreakageConcern = hairConcerns?.includes("breakage") ?? false;
  let delta = 0;

  if (primaryFn === "humectant") {
    if (isDryClimate(climate)) {
      // Most specific (top-3, "major humectant") wins over the broader
      // top-5 case rather than stacking both penalties on the same
      // ingredient.
      if (position <= 3) delta -= 5;
      else if (position <= 5) delta -= 3;
    }
    if (isHumidClimate(climate) && porosity === "high") delta += 2;
  }

  if (primaryFn === "protein" || secondaryFn === "protein") {
    if (porosity === "low") {
      delta += primaryFn === "protein" && position <= 5 ? -4 : secondaryFn === "protein" ? -1 : 0;
    }
    if (porosity === "high" && hasBreakageConcern) delta += 4;
  }

  if (primaryFn === "occlusive") {
    if (family === "straight" && position <= 5) delta -= 5;
    else if (family === "coily" && position <= 3) delta += 3;
    // family === "coily" && position >= 8 -> explicitly no adjustment
    // (a trace occlusive is fine for coily hair) - already the default.
  }

  if (primaryFn === "surfactant") {
    if (scalpCondition === "sensitive" && name.includes("sulfate")) delta -= 4;
    if (scalpCondition === "oily" && isGentleSurfactant(name)) delta += 2;
  }

  if (primaryFn === "chelating_agent") {
    if (waterHardness === "hard") delta += 4;
    else if (waterHardness === "soft") delta += 1;
  }

  if (primaryFn === "bond_builder") {
    delta += colorTreated || hasBreakageConcern ? 5 : 2;
  }

  if (primaryFn === "scalp_active") {
    if (hairConcerns?.includes("thinning") && (ROSEMARY.has(name) || CAFFEINE.has(name) || SAW_PALMETTO.has(name))) {
      delta += 4;
    }
    if (scalpCondition === "sensitive" && (SALICYLIC_ACID.has(name) || ZINC_PYRITHIONE.has(name))) {
      delta -= 2;
    }
    if (scalpCondition === "dandruff" && ZINC_PYRITHIONE.has(name)) {
      delta += 6;
    }
  }

  if (delta === 0) return { score, rating };
  const adjusted = clampScore(score + delta);
  return { score: adjusted, rating: ratingForScore(adjusted) };
}

export type ScoringProfile = {
  climate: string | null;
  waterHardness: string | null;
  porosity: string;
  scalpCondition: string | null;
  family: CurlFamily | null;
  ageRange: string | null;
  hairConcerns: string[] | null;
  colorTreated: boolean;
  // True only when color-treated AND the profile's own selected porosity
  // (before the one-level-up override below) was already "high" - used
  // to apply an extra ingredient penalty for further-damaging
  // ingredients, since there's no higher tier left to bump to. See
  // applyColorTreatedAdjustment.
  colorTreatedAlreadyHighPorosity: boolean;
  // Set only by buildBabyScoringProfile/buildChildScoringProfile (see
  // below) - undefined/false for every ordinary adult profile, so this
  // is fully additive and changes nothing for the existing scoring paths.
  babySafety?: boolean;
  childSafety?: { ageRange: string | null; sensorySensitive: boolean };
};

// ---- Whole-formula ingredient interactions --------------------------------
//
// Everything above judges one ingredient at a time. Some real problems
// (and some real synergies) only show up from how several ingredients sit
// together in the same formula - a single humectant in a dry climate is
// fine, three of them near the top of the label is a different formula
// entirely. These run once per product, after the per-ingredient matches
// are final, and stack as flat whole-product modifiers alongside the
// weight/name-keyword modifiers.
function isHumectantMatch(m: Match): boolean {
  return m.primaryFunction === "humectant" || m.secondaryFunction === "humectant";
}
function isProteinMatch(m: Match): boolean {
  return m.primaryFunction === "protein" || m.secondaryFunction === "protein";
}
function isOcclusiveMatch(m: Match): boolean {
  return m.primaryFunction === "occlusive" || m.secondaryFunction === "occlusive";
}
function isBondBuilderMatch(m: Match): boolean {
  return m.primaryFunction === "bond_builder" || m.secondaryFunction === "bond_builder";
}

function detectIngredientInteractions(matches: Match[], profile: ScoringProfile): IngredientInteraction[] {
  const { climate, porosity, family, scalpCondition, hairConcerns, colorTreated } = profile;
  const interactions: IngredientInteraction[] = [];

  // 1 - multiple humectants in a dry climate compound the moisture-
  // drawing problem each one already has individually.
  if (isDryClimate(climate)) {
    const humectantsInTop8 = matches.filter((m) => m.position <= 8 && isHumectantMatch(m)).length;
    if (humectantsInTop8 >= 2) {
      interactions.push({
        interactionId: "multiple_humectants_dry_climate",
        modifier: -3,
        explanation: "Multiple humectants compound the moisture-drawing problem in dry climates.",
      });
    }
  }

  // 2 - protein-heavy + humectant-heavy formulas cause buildup on low
  // porosity hair, which already struggles to absorb either on its own.
  if (porosity === "low") {
    const proteinsInTop10 = matches.filter((m) => m.position <= 10 && isProteinMatch(m)).length;
    const humectantsInTop5 = matches.filter((m) => m.position <= 5 && isHumectantMatch(m)).length;
    if (proteinsInTop10 >= 2 && humectantsInTop5 >= 2) {
      interactions.push({
        interactionId: "protein_humectant_overload_low_porosity",
        modifier: -4,
        explanation: "Protein-heavy + humectant-heavy formulas cause significant buildup on low porosity hair.",
      });
    }
  }

  // 3 - the most common real-world cause of scalp irritation is these two
  // together, not either alone.
  if (scalpCondition === "sensitive") {
    const hasSulfateInTop10 = matches.some((m) => m.position <= 10 && isSulfate(m.inciName));
    const hasFragranceInTop10 = matches.some((m) => m.position <= 10 && FRAGRANCE.has(m.inciName.trim().toLowerCase()));
    if (hasSulfateInTop10 && hasFragranceInTop10) {
      interactions.push({
        interactionId: "sulfate_fragrance_sensitive_scalp",
        modifier: -3,
        explanation: "Sulfates and fragrance together are the most common cause of scalp irritation.",
      });
    }
  }

  // 4 - "damage"/"color_treated" per the originating spec map onto this
  // app's real fields: hair_concerns has no "damage" value (breakage is
  // the closest real analog, same substitution used throughout this file -
  // see applyThinningHairAdjustment's comment), and color-treated is
  // profile.colorTreated, a real boolean field, not a concern string.
  const hasBreakageOrColorTreated = Boolean(hairConcerns?.includes("breakage")) || colorTreated;
  if (hasBreakageOrColorTreated) {
    const hasBondBuilderInTop15 = matches.some((m) => m.position <= 15 && isBondBuilderMatch(m));
    const hasProteinInTop15 = matches.some((m) => m.position <= 15 && isProteinMatch(m));
    if (hasBondBuilderInTop15 && hasProteinInTop15) {
      interactions.push({
        interactionId: "bond_builder_protein_synergy",
        modifier: 3,
        explanation: "Bond builder + protein together provide more complete repair than either alone.",
      });
    }
  }

  // 5 - a humectant earlier in the ingredient list than an occlusive is
  // the LCO (Leave-in, Cream, Oil) method's moisture-then-seal order
  // baked into the formulation itself, not just a styling technique.
  if (family === "coily") {
    const humectantPositions = matches.filter(isHumectantMatch).map((m) => m.position);
    const occlusivePositions = matches.filter(isOcclusiveMatch).map((m) => m.position);
    const hasLcoOrder = humectantPositions.some((hp) => occlusivePositions.some((op) => op > hp));
    if (hasLcoOrder) {
      interactions.push({
        interactionId: "lco_layering_order_coily",
        modifier: 2,
        explanation: "Humectant then occlusive is the correct LCO order - the formula itself supports good layering technique.",
      });
    }
  }

  return interactions;
}

type ProfileRow = {
  curl_type: string | null;
  porosity: string | null;
  scalp_condition: string | null;
  climate: string | null;
  water_hardness: string | null;
  // Optional - not every caller's select includes it (e.g.
  // lib/travelKitGenerator.ts doesn't apply age-based or concern-based
  // scoring), so these just fall back to no adjustment rather than
  // requiring every caller to be updated.
  adult_age_range?: string | null;
  hair_concerns?: string[] | null;
  // Really a Postgres boolean in the DB, but the profile form's local
  // state passes "yes"/"no" strings - see isColorTreatedYes above.
  color_treated?: string | boolean | null;
};

// low -> medium -> high, one step up. Bleached/color-treated hair is
// almost always more porous than the user's natural starting point
// (the cuticle is chemically opened during processing), so scoring runs
// against the *next* porosity tier's compatibility_scores rows entirely
// - not just a flat ingredient bump - since porosity drives which DB
// row is fetched in the first place (see fetchScoreRows below).
function bumpPorosityForColorTreatment(porosity: string): string {
  if (porosity === "low") return "medium";
  if (porosity === "medium") return "high";
  return "high"; // already high - nowhere higher to go
}

// Shared by loadScoringProfile (browser, localStorage-driven) and any
// server-side caller that already has a hair_profiles row in hand (e.g.
// travel kit generation in the Stripe webhook, which has no browser
// session/localStorage to read) - so both paths apply the exact same
// porosity-default/normalization rules instead of two copies drifting
// apart. climate is intentionally overridable by the caller (e.g. a
// travel kit scores against the destination's climate, not the user's
// home climate) via the optional climateOverride param.
export function buildScoringProfile(
  row: ProfileRow,
  climateOverride?: string | null
): ScoringProfile {
  // porosity is never null in compatibility_scores - default unknown
  // ("not sure") profiles to medium rather than a filter that would
  // never match anything.
  const naturalPorosity =
    row.porosity === "not sure" || row.porosity === "not_sure" || !row.porosity
      ? "medium"
      : row.porosity;

  const colorTreated = isColorTreatedYes(row.color_treated);
  const porosity = colorTreated
    ? bumpPorosityForColorTreatment(naturalPorosity)
    : naturalPorosity;

  return {
    climate: climateOverride !== undefined ? climateOverride : row.climate,
    waterHardness: row.water_hardness,
    porosity,
    scalpCondition: normalizeScalpCondition(row.scalp_condition),
    family: curlFamily(row.curl_type),
    ageRange: row.adult_age_range ?? null,
    hairConcerns: row.hair_concerns ?? null,
    colorTreated,
    colorTreatedAlreadyHighPorosity: colorTreated && naturalPorosity === "high",
  };
}

type BabyProfileRow = {
  hair_texture: string | null;
  scalp_condition: string | null;
};

// Baby scoring is safety-first (see applyBabySafetyAdjustment above), so
// porosity/family here just pick a reasonable base DB row to start
// from - the avoid/boost overrides are what actually drive the result,
// not curl-type compatibility.
export function buildBabyScoringProfile(row: BabyProfileRow): ScoringProfile {
  const texture = row.hair_texture ?? "";
  const family: CurlFamily | null = texture.includes("straight")
    ? "straight"
    : texture.includes("wavy")
      ? "wavy"
      : texture.includes("curly")
        ? "curly"
        : texture.includes("coily")
          ? "coily"
          : null;

  return {
    climate: null,
    waterHardness: null,
    porosity: "medium",
    scalpCondition: row.scalp_condition === "cradle_cap" ? "dry" : row.scalp_condition,
    family,
    ageRange: null,
    hairConcerns: null,
    colorTreated: false,
    colorTreatedAlreadyHighPorosity: false,
    babySafety: true,
  };
}

const CHILD_SCALP_CONDITION_MAP: Record<string, string> = {
  normal: "normal",
  dry_flaky: "dry",
  sensitive_irritated: "sensitive",
  oily: "oily",
  dandruff_prone: "dandruff",
};

type ChildProfileRow = {
  curl_type: string | null;
  scalp_condition: string | null;
  age_range: string | null;
  sensory_sensitive: boolean;
  zip_code?: string | null;
  climate?: string | null;
  water_hardness?: string | null;
};

// "Same scoring as adult profiles for their curl type and scalp condition
// BUT..." per spec - reuses the ordinary porosity-keyed pipeline (child
// profiles don't collect porosity, so this defaults to medium the same
// way an adult's "not sure" answer does) and layers applyChildSafetyAdjustment
// on top via the childSafety field.
export function buildChildScoringProfile(row: ChildProfileRow): ScoringProfile {
  return {
    climate: row.climate ?? null,
    waterHardness: row.water_hardness ?? null,
    porosity: "medium",
    scalpCondition: row.scalp_condition ? CHILD_SCALP_CONDITION_MAP[row.scalp_condition] ?? null : null,
    family: curlFamily(row.curl_type),
    ageRange: null,
    hairConcerns: null,
    colorTreated: false,
    colorTreatedAlreadyHighPorosity: false,
    childSafety: { ageRange: row.age_range, sensorySensitive: row.sensory_sensitive },
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
      "curl_type, porosity, scalp_condition, strand_thickness, climate, water_hardness, adult_age_range, hair_concerns, color_treated"
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
  primary_function: string | null;
  secondary_function: string | null;
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

// Pure - given an already-fetched set of compatibility_scores rows
// (which may cover more ingredients than just this product's, when
// called from the batch path below), resolves the specificity tiers,
// applies the curl-type adjustment, and computes the position-weighted
// score. No I/O, so this is shared by every scoring entry point in this
// file regardless of how the ingredient list or score rows were gathered.
function resolveScoreResult(
  ingredients: PositionedIngredient[],
  scoreRows: ScoreRow[],
  profile: ScoringProfile,
  category: string | null = null,
  productName: string | null = null
): ScoreResult {
  const {
    scalpCondition,
    family,
    climate,
    waterHardness,
    porosity,
    ageRange,
    hairConcerns,
    colorTreated,
    colorTreatedAlreadyHighPorosity,
    babySafety,
    childSafety,
  } = profile;

  if (ingredients.length === 0) {
    return {
      normalizedScore: 0,
      matches: [],
      productWeight: classifyProductWeight([], category ?? "", productName ?? ""),
      nameKeywordModifier: 0,
      nameKeywordMatch: null,
      unscoredIngredientCount: 0,
      unscoredIngredientNames: [],
      interactionsDetected: [],
      formaldehydeReleasersPresent: [],
    };
  }

  // Generic (scalp_condition/hair_type both null) rows first, then a row
  // scoped to the user's scalp condition, then - most specific - a row
  // scoped to their curl-type family (only present for ingredients seeded
  // with real hair_type data). hairTypeOverridden tracks which
  // ingredients got that most-specific row, since those should skip the
  // generic runtime adjustment below - the DB value is already precise.
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
  const unscoredIngredientNames: string[] = [];
  const formaldehydeReleasersPresent: string[] = [];

  for (const ingredient of ingredients) {
    const scored = bestRowPerIngredient.get(ingredient.id);
    // No compatibility_scores row for this ingredient at the resolved
    // porosity - scored as a neutral 5/10 with its normal position
    // weight rather than excluded from the weighted mean entirely. A
    // product with several unscored ingredients used to score as if it
    // only had the scored ones, which is artificially high whenever the
    // missing ones would have scored poorly.
    const scoredFromDb = Boolean(scored);
    if (!scored) unscoredIngredientNames.push(ingredient.common_name || ingredient.inci_name);
    const base = scored ?? { score: 5, rating: "neutral" };

    let { score, rating } = hairTypeOverridden.has(ingredient.id)
      ? base
      : applyCurlTypeAdjustment(
          ingredient.inci_name,
          family,
          base.score,
          base.rating
        );

    // Climate and water hardness are independent of curl-type/hair-type
    // scoping - they apply on top regardless of whether the score above
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
    ({ score, rating } = applyColorTreatedAdjustment(
      ingredient.inci_name,
      colorTreated,
      colorTreatedAlreadyHighPorosity,
      score,
      rating
    ));
    ({ score, rating } = applyBabySafetyAdjustment(
      ingredient.inci_name,
      Boolean(babySafety),
      score,
      rating
    ));
    ({ score, rating } = applyChildSafetyAdjustment(
      ingredient.inci_name,
      childSafety,
      score,
      rating
    ));
    ({ score, rating } = applyIngredientFunctionAdjustment(ingredient, profile, score, rating));

    // Runs last, deliberately - an override, not an adjustment, so
    // nothing above can soften it. See applyFormaldehydeReleaserOverride.
    const beforeFormaldehydeCheck = score;
    ({ score, rating } = applyFormaldehydeReleaserOverride(ingredient.inci_name, score, rating));
    if (score !== beforeFormaldehydeCheck) {
      formaldehydeReleasersPresent.push(ingredient.common_name || ingredient.inci_name);
    }

    matchList.push({
      ingredient_name: ingredient.common_name || ingredient.inci_name,
      inciName: ingredient.inci_name,
      score,
      rating,
      position: ingredient.position,
      weight: positionWeight(ingredient.position),
      primaryFunction: ingredient.primary_function,
      secondaryFunction: ingredient.secondary_function,
      scoredFromDb,
    });
  }

  // Weighted mean instead of a simple mean - an ingredient at position 2
  // (weight 1.3) counts for more of the final score than the same
  // ingredient would at position 22 (weight 0.6). Still lands on the same
  // 0-100 scale as before since both the numerator and denominator carry
  // the weight. Capped defensively at 100 - the weighted mean can't
  // mathematically exceed it, but the cap makes that guarantee explicit.
  const weightedSum = matchList.reduce((acc, m) => acc + m.score * m.weight, 0);
  const weightTotal = matchList.reduce((acc, m) => acc + m.weight, 0);
  const baseScore =
    weightTotal === 0
      ? 0
      : Math.min(100, Math.round((weightedSum / (weightTotal * 10)) * 100));

  // Product-weight modifier - see getWeightModifier above. Applied once
  // here, after aggregation, rather than per-ingredient like every other
  // adjustment in this function: it's a judgment about the product's
  // overall formulation, not about any single ingredient's score.
  const orderedIngredientNames = [...ingredients]
    .sort((a, b) => a.position - b.position)
    .map((i) => i.inci_name);
  const productWeight = classifyProductWeight(orderedIngredientNames, category ?? "", productName ?? "");
  const weightModifier = getWeightModifier(productWeight, family);
  const scoreBeforeNameKeywords = Math.min(100, Math.max(0, baseScore + weightModifier));

  // Product-name keyword scoring - a second, independent signal stacked
  // on top of the ingredient score (see getNameKeywordModifiers above).
  // Only meaningful with a real product name; scoreIngredientsText (raw
  // pasted label text, no catalog row) passes null and gets a no-op 0
  // here, same as before this existed. matchList is passed through so
  // each matching category's delta is validated against the ingredients
  // that actually back up its claim (see computeIngredientEvidence).
  const { modifier: nameKeywordModifier, topPositive, topNegative } = productName
    ? getNameKeywordModifiers(productName, hairConcerns, family, porosity, scalpCondition, colorTreated, matchList)
    : { modifier: 0, topPositive: null, topNegative: null };
  const scoreBeforeInteractions = Math.min(100, Math.max(0, scoreBeforeNameKeywords + nameKeywordModifier));

  // Whole-formula interaction patterns (see detectIngredientInteractions) -
  // the last whole-product step before clamping to the final score.
  const interactionsDetected = detectIngredientInteractions(matchList, profile);
  const interactionModifierTotal = interactionsDetected.reduce((acc, i) => acc + i.modifier, 0);
  const normalizedScore = Math.min(100, Math.max(0, scoreBeforeInteractions + interactionModifierTotal));

  // Thresholds match the request: >4 surfaces a positive reason, <-4 a
  // caution - a modifier that landed in between (or exactly at a
  // threshold) is real but too marginal to call out specifically.
  const nameKeywordMatch: ScoreResult["nameKeywordMatch"] =
    nameKeywordModifier > 4 && topPositive
      ? { ...topPositive, direction: "positive" }
      : nameKeywordModifier < -4 && topNegative
      ? { ...topNegative, direction: "negative" }
      : null;

  return {
    normalizedScore,
    matches: matchList,
    productWeight,
    nameKeywordModifier,
    nameKeywordMatch,
    unscoredIngredientCount: unscoredIngredientNames.length,
    unscoredIngredientNames,
    interactionsDetected,
    formaldehydeReleasersPresent,
  };
}

// Shared by the single-product scoring entry points below - fetches
// compatibility_scores for just this ingredient list, then resolves it.
async function scorePositionedIngredients(
  ingredients: PositionedIngredient[],
  profile: ScoringProfile,
  category: string | null = null,
  productName: string | null = null
): Promise<{ error?: string; result?: ScoreResult }> {
  if (ingredients.length === 0) {
    return {
      result: {
        normalizedScore: 0,
        matches: [],
        productWeight: classifyProductWeight([], category ?? "", productName ?? ""),
        nameKeywordModifier: 0,
        nameKeywordMatch: null,
        unscoredIngredientCount: 0,
        unscoredIngredientNames: [],
        interactionsDetected: [],
        formaldehydeReleasersPresent: [],
      },
    };
  }

  const { data: scoreRows, error } = await fetchScoreRows(
    ingredients.map((i) => i.id),
    profile.porosity
  );
  if (error) return { error };

  return {
    result: resolveScoreResult(ingredients, scoreRows ?? [], profile, category, productName),
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
      supabase
        .from("ingredients")
        .select("id, inci_name, common_name, primary_function, secondary_function"),
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
  // the (already deduped) parsed list - labels list ingredients in
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
      primary_function: ingredient.primary_function ?? null,
      secondary_function: ingredient.secondary_function ?? null,
    })
  );

  return scorePositionedIngredients(positioned, profile, null);
}

// For products from Qoyl's own curated catalog - reads
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
      .select("position, ingredients(id, inci_name, common_name, primary_function, secondary_function)")
      .eq("product_id", productId)
      .order("position"),
    supabase
      .from("catalog_products")
      .select("name, categories(slug)")
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
        primary_function: ingredient.primary_function ?? null,
        secondary_function: ingredient.secondary_function ?? null,
      };
    })
    .filter((i): i is PositionedIngredient => i !== null);

  const categorySlug =
    (productRow?.categories as unknown as { slug: string } | { slug: string }[] | null) ?? null;
  const category = Array.isArray(categorySlug) ? categorySlug[0]?.slug : categorySlug?.slug;

  return scorePositionedIngredients(positioned, profile, category ?? null, productRow?.name ?? null);
}

// Batch version of scoreCatalogProduct, for scoring an entire search
// results list at once (e.g. every result on /search, shown inline
// without a per-product tap). Loads the hair profile once and fetches
// catalog_product_ingredients + compatibility_scores in two queries
// covering every requested product, instead of N round trips each -
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
// (e.g. travel kit generation in the Stripe webhook - no
// localStorage/user session exists there, so the caller fetches the
// hair_profiles row itself via the service-role client and builds the
// profile with buildScoringProfile()). catalog_products/
// catalog_product_ingredients/compatibility_scores are all
// anon-readable, so the plain supabase client works fine server-side
// for these reads - only the hair_profiles fetch itself needs the
// service role, and that happens before this function is called.
export async function scoreCatalogProductsForProfile(
  productIds: string[],
  profile: ScoringProfile
): Promise<Record<string, { error?: string; result?: ScoreResult }>> {
  if (productIds.length === 0) return {};

  const [{ data: rows, error: piError }, { data: categoryRows }] = await Promise.all([
    supabase
      .from("catalog_product_ingredients")
      .select("product_id, position, ingredients(id, inci_name, common_name, primary_function, secondary_function)")
      .in("product_id", productIds)
      .order("position"),
    supabase.from("catalog_products").select("id, name, categories(slug)").in("id", productIds),
  ]);

  if (piError) {
    return Object.fromEntries(
      productIds.map((id) => [id, { error: piError.message }])
    );
  }

  const categoryByProduct = new Map<string, string | null>();
  const nameByProduct = new Map<string, string | null>();
  for (const row of categoryRows ?? []) {
    const categories = row.categories as unknown as
      | { slug: string }
      | { slug: string }[]
      | null;
    const slug = Array.isArray(categories) ? categories[0]?.slug : categories?.slug;
    categoryByProduct.set(row.id, slug ?? null);
    nameByProduct.set(row.id, row.name ?? null);
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
      primary_function: ingredient.primary_function ?? null,
      secondary_function: ingredient.secondary_function ?? null,
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
        categoryByProduct.get(id) ?? null,
        nameByProduct.get(id) ?? null
      ),
    };
  }
  return results;
}
