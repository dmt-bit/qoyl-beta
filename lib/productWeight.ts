export type ProductWeight = "ultralight" | "light" | "medium" | "heavy" | "very_heavy";

const WEIGHT_RANK: Record<ProductWeight, number> = {
  ultralight: 0,
  light: 1,
  medium: 2,
  heavy: 3,
  very_heavy: 4,
};
const RANK_TO_WEIGHT: ProductWeight[] = ["ultralight", "light", "medium", "heavy", "very_heavy"];

// ---- Step 1: product-name override ---------------------------------------
//
// A "Twisting Butter" or "Whip" is heavy/rich by formulation regardless of
// how its ingredient list happens to be ordered -- checked first because
// step 2/3 below, driven purely by top-8 ingredient position, can miss a
// product like Camille Rose's Almond Jai Twisting Butter entirely: its
// only classically "heavy" ingredients (Olive Oil, Castor Oil) sit at
// label positions 11 and 14, outside the top 8, diluted by seven named
// carrier oils ahead of them. Name-based heavy keywords floor the result
// at "heavy" (ingredients can still push it to "very_heavy"); light
// keywords cap it at "light" (ingredients can still pull it to
// "ultralight"). Heavy is checked first when a name matches both lists.
const HEAVY_NAME_KEYWORDS = [
  "butter",
  "whip",
  "pudding",
  "soufflé",
  "souffle",
  "cream butter",
  "twisting butter",
  "curl butter",
  "hair butter",
];
const LIGHT_NAME_KEYWORDS = ["mist", "spray", "water", "milk", "serum", "mousse", "foam"];

function nameSignal(productName: string): "heavy" | "light" | null {
  const name = productName.toLowerCase();
  if (HEAVY_NAME_KEYWORDS.some((k) => name.includes(k))) return "heavy";
  if (LIGHT_NAME_KEYWORDS.some((k) => name.includes(k))) return "light";
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
// DB `position` column -- catalog_product_ingredients rows can have gaps
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

function tierFromWeightedCount(count: number): ProductWeight {
  if (count >= 4) return "very_heavy";
  if (count >= 2.5) return "heavy";
  if (count >= 1.5) return "medium";
  if (count >= 0.5) return "light";
  return "ultralight";
}

// `category` is accepted for call-site/API stability (every scoring entry
// point in lib/compatibility.ts already fetches and passes it) but isn't
// used in the tier computation -- the rewritten classifier is name +
// ingredient-position driven only, per spec.
export function classifyProductWeight(
  ingredientList: string[],
  _category: string,
  productName: string = ""
): ProductWeight {
  const ingredientRank = WEIGHT_RANK[tierFromWeightedCount(weightedHeavyCount(ingredientList))];

  const signal = nameSignal(productName);
  let rank = ingredientRank;
  if (signal === "heavy") rank = Math.max(rank, WEIGHT_RANK.heavy);
  if (signal === "light") rank = Math.min(rank, WEIGHT_RANK.light);

  return RANK_TO_WEIGHT[rank];
}

// ---- UI: pill label/classes ------------------------------------------

export const WEIGHT_PILL_LABEL: Record<ProductWeight, string> = {
  ultralight: "Ultralight formula",
  light: "Lightweight formula",
  medium: "Medium weight",
  heavy: "Rich formula",
  very_heavy: "Very rich formula — best for coily hair",
};

export const WEIGHT_PILL_CLASSES: Record<ProductWeight, string> = {
  ultralight: "bg-green/15 text-green",
  light: "bg-green/15 text-green",
  medium: "bg-bronze/20 text-bronze2",
  heavy: "bg-amber/20 text-amber",
  very_heavy: "bg-[#C4703A]/20 text-[#C4703A]",
};

// On /search (not routine recommendations, which are already pre-filtered
// -- see lib/routineProducts.ts), a medium-or-heavier product shown to a
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
// from there -- compatibility.ts already imports this module, and a
// reverse import would create a cycle. Used only to decide whether the
// score-explanation sentence below needs a fit caveat at all.
const WEIGHT_FIT: Record<CurlFamilyLike, Record<ProductWeight, boolean>> = {
  straight: { ultralight: true, light: true, medium: true, heavy: false, very_heavy: false },
  wavy: { ultralight: true, light: true, medium: true, heavy: false, very_heavy: false },
  curly: { ultralight: true, light: true, medium: true, heavy: true, very_heavy: false },
  coily: { ultralight: true, light: true, medium: true, heavy: true, very_heavy: true },
};

// Only returns a sentence when the product's weight is a poor fit for the
// user's curl family -- a good fit needs no caveat beyond the score itself.
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
    ? `This product scores well for your ${porosityPhrase} hair but is classified as ${weightWord} — which may not be ideal for your ${hairTypePhrase} hair.`
    : `This product is classified as ${weightWord} — which may not be ideal for your ${hairTypePhrase} hair.`;
}
