export type ProductWeight = "ultralight" | "light" | "medium" | "heavy" | "very_heavy";

// Heavy indicators -- presence in top 10 ingredients increases weight score
const HEAVY_INGREDIENTS = [
  "shea butter", "butyrospermum parkii",
  "cocoa butter", "theobroma cacao",
  "mango butter", "mangifera indica",
  "castor oil", "ricinus communis",
  "coconut oil", "cocos nucifera",
  "beeswax", "cera alba",
  "carnauba wax",
  "candelilla wax",
  "petrolatum",
  "mineral oil",
  "lanolin",
  "avocado oil", "persea gratissima",
  "olive oil", "olea europaea",
];

// Lightweight indicators
const LIGHT_INGREDIENTS = [
  "argan oil", "argania spinosa",
  "jojoba oil", "simmondsia chinensis",
  "grapeseed oil", "vitis vinifera",
  "cyclopentasiloxane",
  "cyclomethicone",
  "dimethicone", // lightweight silicone
  "water", "aqua",
  "aloe vera", "aloe barbadensis",
  "glycerin",
  "panthenol",
];

export function classifyProductWeight(
  ingredientList: string[],
  category: string
): ProductWeight {
  // Count heavy vs light ingredients in top 10
  const top10 = ingredientList.slice(0, 10).map((i) => i.toLowerCase());

  let heavyScore = 0;
  let lightScore = 0;

  for (const ingredient of top10) {
    for (const heavy of HEAVY_INGREDIENTS) {
      if (ingredient.includes(heavy)) heavyScore++;
    }
    for (const light of LIGHT_INGREDIENTS) {
      if (ingredient.includes(light)) lightScore++;
    }
  }

  // Category adjustments -- butters and oils are inherently heavier
  if (category === "butter" || category === "oil") heavyScore += 1;
  if (category === "leave-in" || category === "mousse") lightScore += 1;

  const weightScore = heavyScore - lightScore;

  if (weightScore >= 4) return "very_heavy";
  if (weightScore >= 2) return "heavy";
  if (weightScore >= 0) return "medium";
  if (weightScore >= -2) return "light";
  return "ultralight";
}

// Part 5 UI: 5 internal weights collapse to 4 display labels (ultralight
// and light both read as "Lightweight" to the user).
export const WEIGHT_PILL_LABEL: Record<ProductWeight, string> = {
  ultralight: "Lightweight",
  light: "Lightweight",
  medium: "Medium",
  heavy: "Heavy",
  very_heavy: "Rich",
};

export const WEIGHT_PILL_CLASSES: Record<ProductWeight, string> = {
  ultralight: "bg-green/15 text-green",
  light: "bg-green/15 text-green",
  medium: "bg-bronze/20 text-bronze2",
  heavy: "bg-amber/20 text-amber",
  very_heavy: "bg-[#C4703A]/20 text-[#C4703A]",
};

type CurlFamilyLike = "straight" | "wavy" | "curly" | "coily";

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
