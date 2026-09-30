export type ProductWeight = "ultralight" | "light" | "medium" | "heavy" | "very_heavy";

const WEIGHT_RANK: Record<ProductWeight, number> = {
  ultralight: 0,
  light: 1,
  medium: 2,
  heavy: 3,
  very_heavy: 4,
};
const RANK_TO_WEIGHT: ProductWeight[] = ["ultralight", "light", "medium", "heavy", "very_heavy"];

// ---- Step 1: product-name signals -----------------------------------------
//
// Checked most-severe first, since a name can plausibly match more than
// one list (e.g. "Deep Treatment" contains "treatment"). A match either
// floors the result at a minimum tier (ingredients can still push it
// higher), forces an exact tier (ultralight product types), or caps it at
// a maximum tier (ingredients can still pull it lower). This runs before
// step 2/3's ingredient counting because that step, driven purely by
// top-8 label position, can miss a product entirely - e.g. Camille
// Rose's Almond Jai Twisting Butter has no classically "heavy"
// ingredient inside its top 8 (Olive Oil and Castor Oil sit at label
// positions 11 and 14), so without this, ingredient counting alone would
// call it "ultralight".
const VERY_HEAVY_NAME_KEYWORDS = [
  "butter",
  "whip",
  "pudding",
  "soufflé",
  "souffle",
  "grease",
  "pomade",
  "wax",
  "beeswax",
  // "Yogurt"/"groyogurt" formulas in this catalog (e.g. As I Am's Long &
  // Luxe Groyogurt) run heavier than a "heavy" floor alone accounts for:
  // their real top-8 ingredients are humectants/proteins/extracts, with
  // the actual butters/oils positioned past the top 8, so nothing in
  // step 2/3 pushes a "heavy" floor any higher on its own.
  "yogurt",
  "yoghurt",
  "groyogurt",
];
const HEAVY_NAME_KEYWORDS = [
  "masque",
  "mask",
  "cream",
  "creme",
  "growth cream",
  "curl cream",
  "hair cream",
  "nourishing cream",
  "deep treatment",
  "reconstructor",
  "intensive",
  "ultra hydrating",
  "moisture bomb",
];
// Bare "conditioner"/"treatment" need carve-outs below since they'd
// otherwise steal the match from more specific phrases in other tiers
// ("Leave-In Conditioner" is lighter than a rinse-out conditioner
// despite the word match; "Oil Treatment" is a light-tier phrase that
// happens to contain "treatment").
const MEDIUM_NAME_KEYWORDS = ["deep conditioner", "co-wash", "cowash", "cleansing conditioner"];
const ULTRALIGHT_NAME_KEYWORDS = ["dry shampoo", "scalp spray", "refresher", "setting spray"];
const LIGHT_NAME_KEYWORDS = [
  "mist",
  "spray",
  "water",
  "milk",
  "serum",
  "elixir",
  "oil treatment",
  "hair oil",
  "drops",
  "essence",
];

// Word-boundary match, not raw substring - plain .includes() lets short
// phrases like "hair oil" false-positive inside an unrelated word (found
// during testing: "Long & Luxe Groh**air oil**" contains "hair oil" as a
// substring purely by coincidence, which wrongly capped a very_heavy oil
// at "light"). \b prevents that without needing an exclusion list for
// every possible collision.
function containsPhrase(name: string, phrase: string): boolean {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(name);
}

function matchesMediumSignal(name: string): boolean {
  if (MEDIUM_NAME_KEYWORDS.some((k) => containsPhrase(name, k))) return true;
  if (containsPhrase(name, "treatment") && !containsPhrase(name, "oil treatment")) return true;
  return containsPhrase(name, "conditioner") && !containsPhrase(name, "leave-in");
}

type NameSignal =
  | { kind: "floor"; tier: ProductWeight }
  | { kind: "force"; tier: ProductWeight }
  | { kind: "ceiling"; tier: ProductWeight }
  | null;

function nameSignal(productName: string): NameSignal {
  const name = productName.toLowerCase();

  if (VERY_HEAVY_NAME_KEYWORDS.some((k) => containsPhrase(name, k))) {
    return { kind: "floor", tier: "very_heavy" };
  }
  if (HEAVY_NAME_KEYWORDS.some((k) => containsPhrase(name, k))) {
    return { kind: "floor", tier: "heavy" };
  }
  if (matchesMediumSignal(name)) {
    return { kind: "floor", tier: "medium" };
  }
  // Checked before the generic light-tier list below - "Setting Spray"/
  // "Dry Shampoo" are more specific than the bare "spray"/"water" words
  // there and must win the match.
  if (ULTRALIGHT_NAME_KEYWORDS.some((k) => containsPhrase(name, k))) {
    return { kind: "force", tier: "ultralight" };
  }
  if (LIGHT_NAME_KEYWORDS.some((k) => containsPhrase(name, k))) {
    return { kind: "ceiling", tier: "light" };
  }
  return null;
}

// ---- Step 2/3: position-weighted heavy-ingredient count in the top 8 -----

const HEAVY_INGREDIENTS = [
  // Bare "butter" catches any named butter (shea, cocoa, mango, almond,
  // avocado, murumuru, mafura, ...) without needing to enumerate every
  // botanical source by name; the INCI alternates below cover the common
  // ones in case a label spells the ingredient out without the word
  // "butter" appearing (e.g. some INCI-only ingredient rows).
  "butter",
  "butyrospermum parkii",
  "theobroma cacao",
  "mangifera indica",
  "castor oil",
  "ricinus communis",
  "olive oil",
  "olea europaea",
  "petrolatum",
  "mineral oil",
  "lanolin",
  "beeswax",
  "cera alba",
  "carnauba wax",
  "candelilla wax",
];

// Full-fat coconut oil is heavy; fractionated coconut oil (INCI:
// Caprylic/Capric Triglyceride) is a distinct, lightweight ingredient and
// must not be counted here even though some labels still say "coconut."
function isFractionatedCoconut(name: string): boolean {
  return name.includes("fraction") || name.includes("caprylic");
}

function isHeavyIngredient(name: string): boolean {
  const lower = name.toLowerCase();
  const mentionsCoconut = lower.includes("coconut oil") || lower.includes("cocos nucifera");
  if (mentionsCoconut) return !isFractionatedCoconut(lower);
  return HEAVY_INGREDIENTS.some((h) => lower.includes(h));
}

// Position 1-3 -> 2x weight, 4-6 -> 1.5x, 7-8 -> 1x. Rank is the
// 1-based position within the top-8 slice (array index + 1), not the raw
// DB `position` column - catalog_product_ingredients rows can have gaps
// (an ingredient dropped during curation leaves its position number
// unused), so counting by array order is the more faithful reading of
// "top 8 ingredients" than filtering on `position <= 8`.
function positionWeightFactor(rank: number): number {
  if (rank <= 3) return 2;
  if (rank <= 6) return 1.5;
  return 1;
}

function weightedHeavyCount(ingredientList: string[]): number {
  return ingredientList
    .slice(0, 8)
    .reduce((total, name, index) => (isHeavyIngredient(name) ? total + positionWeightFactor(index + 1) : total), 0);
}

// Full label length matters when the top 8 has zero heavy-keyword hits:
// a short, simple label (roughly a dozen ingredients or fewer) with
// nothing heavy up front is a genuinely minimal, watery formula (e.g.
// Giovanni Direct Leave-In's ~10-ingredient label - "ultralight"). A
// longer label with nothing heavy in the top 8 more often just means the
// named oils/butters are further down the list, diluted by humectants
// and extracts ahead of them (e.g. Mielle's Pomegranate & Honey Leave-In,
// 30 ingredients, with named oils starting at position 8) - "light" is
// the more honest default there than the single most extreme tier.
const SIMPLE_FORMULA_MAX_INGREDIENTS = 12;

function tierFromWeightedCount(count: number, totalIngredientCount: number): ProductWeight {
  if (count >= 4) return "very_heavy";
  if (count >= 2.5) return "heavy";
  if (count >= 1.5) return "medium";
  if (count >= 0.5) return "light";
  return totalIngredientCount <= SIMPLE_FORMULA_MAX_INGREDIENTS ? "ultralight" : "light";
}

// ---- Step 2 (part 2 of this rewrite): category weight floor/ceiling ------
//
// A product can never be classified lighter than its category structurally
// implies (a deep conditioner/masque is always at least medium) or, for
// the two capped categories, heavier than the category allows (mousse is
// always lightweight by nature). This is the final, most-authoritative
// constraint - applied after both ingredient counting and the name
// signal above, so it can override either.
const CATEGORY_WEIGHT_FLOOR: Partial<Record<string, ProductWeight>> = {
  butter: "very_heavy",
  "deep-conditioner": "medium",
  // Intentionally rich - oils/butters/thick conditioners applied to dry
  // hair, rinsed out completely during shampooing. See
  // RINSE_OUT_TREATMENT_CATEGORIES in lib/compatibility.ts for why this
  // heavy classification doesn't get penalized for straight/wavy hair
  // the way a leave-in/styler's would.
  "pre-shampoo": "heavy",
  // Intensive treatment masks are structurally heavier than a rinse-out
  // deep conditioner - never light/medium regardless of name keywords.
  // For straight/fine hair (where heavy formulas are penalized by
  // getWeightModifier) that's the intended outcome: masks aren't daily
  // products.
  "hair-mask": "heavy",
  conditioner: "light",
  oil: "light",
  treatment: "medium",
};
const CATEGORY_WEIGHT_CEILING: Partial<Record<string, ProductWeight>> = {
  mousse: "light",
  // A film-forming, alcohol-based finishing product that evaporates -
  // never heavy regardless of hold strength. This is a ceiling (never
  // heavier than), not a floor: "ultralight" is already the lowest tier,
  // so a floor at it would do nothing.
  hairspray: "ultralight",
  "scalp-treatment": "medium",
  // Not in the original spec, added to close a real gap found while
  // testing against Camille Rose's Curl Maker: a gel with castor +
  // coconut oil blended in for shine/hold reads as "heavy" by pure
  // ingredient count, but a gel's water/humectant-thickened base means
  // it never actually behaves as heavy on hair the way a cream or
  // butter of the same ingredient count would.
  gel: "medium",
};

export function classifyProductWeight(
  ingredientList: string[],
  category: string,
  productName: string = ""
): ProductWeight {
  let rank = WEIGHT_RANK[tierFromWeightedCount(weightedHeavyCount(ingredientList), ingredientList.length)];

  const signal = nameSignal(productName);
  if (signal?.kind === "floor") rank = Math.max(rank, WEIGHT_RANK[signal.tier]);
  if (signal?.kind === "ceiling") rank = Math.min(rank, WEIGHT_RANK[signal.tier]);
  if (signal?.kind === "force") rank = WEIGHT_RANK[signal.tier];

  const floor = CATEGORY_WEIGHT_FLOOR[category];
  if (floor) rank = Math.max(rank, WEIGHT_RANK[floor]);
  const ceiling = CATEGORY_WEIGHT_CEILING[category];
  if (ceiling) rank = Math.min(rank, WEIGHT_RANK[ceiling]);

  return RANK_TO_WEIGHT[rank];
}

// ---- UI: pill label/classes ------------------------------------------

export const WEIGHT_PILL_LABEL: Record<ProductWeight, string> = {
  ultralight: "Ultralight formula",
  light: "Lightweight formula",
  medium: "Medium weight",
  heavy: "Rich formula",
  very_heavy: "Very rich formula - best for coily hair",
};

// A hair mask keeps its real weight classification (heavy/very_heavy -
// scoring, filtering, and the warning tier are unchanged) but is shown as
// "Intensive treatment" rather than "Rich formula", which reads as an
// odd descriptor for a product that's meant to be an occasional
// intensive treatment, not a daily product.
export function weightPillLabel(weight: ProductWeight, categorySlug?: string | null): string {
  if (categorySlug === "hair-mask" && (weight === "heavy" || weight === "very_heavy")) {
    return "Intensive treatment";
  }
  return WEIGHT_PILL_LABEL[weight];
}

export const WEIGHT_PILL_CLASSES: Record<ProductWeight, string> = {
  ultralight: "bg-green/15 text-green",
  light: "bg-green/15 text-green",
  medium: "bg-bronze/20 text-bronze2",
  heavy: "bg-amber/20 text-amber",
  very_heavy: "bg-[#C4703A]/20 text-[#C4703A]",
};

// On /search (not routine recommendations, which are already pre-filtered
// - see lib/routineProducts.ts), a medium-or-heavier product shown to a
// straight/wavy user gets a warning badge instead of the plain weight
// pill, since a well-scoring individual product can still be a bad
// formulation-weight match for that hair type.
type CurlFamilyLike = "straight" | "wavy" | "curly" | "coily";

export function isWeightWarningTier(weight: ProductWeight, family: CurlFamilyLike | null): boolean {
  if (family !== "straight" && family !== "wavy") return false;
  return WEIGHT_RANK[weight] >= WEIGHT_RANK.medium;
}

export const WEIGHT_WARNING_LABEL = "May be heavy for your hair type";
export const WEIGHT_WARNING_CLASSES = "bg-amber/20 text-amber";

// Loosely mirrors getWeightModifier's sign in lib/compatibility.ts (a
// negative modifier means "not a great fit") without importing CurlFamily
// from there - compatibility.ts already imports this module, and a
// reverse import would create a cycle. Used only to decide whether the
// score-explanation sentence below needs a fit caveat at all.
const WEIGHT_FIT: Record<CurlFamilyLike, Record<ProductWeight, boolean>> = {
  straight: { ultralight: true, light: true, medium: true, heavy: false, very_heavy: false },
  wavy: { ultralight: true, light: true, medium: true, heavy: false, very_heavy: false },
  curly: { ultralight: true, light: true, medium: true, heavy: true, very_heavy: false },
  coily: { ultralight: true, light: true, medium: true, heavy: true, very_heavy: true },
};

// Only returns a sentence when the product's weight is a poor fit for the
// user's curl family - a good fit needs no caveat beyond the score itself.
export function weightFitNote(
  weight: ProductWeight,
  family: CurlFamilyLike | null,
  curlType: string | null,
  porosity: string | null
): string | null {
  if (!family || WEIGHT_FIT[family][weight]) return null;

  const porosityPhrase =
    porosity && porosity !== "not sure" && porosity !== "not_sure" ? `${porosity} porosity` : null;
  const hairTypePhrase = curlType && curlType !== "not_sure" ? `${curlType} ${family}` : family;
  const weightWord = weight === "very_heavy" ? "very heavy" : weight;

  return porosityPhrase
    ? `This product scores well for your ${porosityPhrase} hair but is classified as ${weightWord} - which may not be ideal for your ${hairTypePhrase} hair.`
    : `This product is classified as ${weightWord} - which may not be ideal for your ${hairTypePhrase} hair.`;
}
