import type { CurlFamily } from "@/lib/compatibility";
import type { ClimateZone } from "@/lib/locationFactors";

// Routine-level interaction analysis: how the user's full set of routine
// products work together, not how each one scores on its own (that's
// lib/compatibility.ts). Pure - no Supabase imports - so it runs
// server-side in /api/routine, where the routine picks and their
// ingredient positions already exist.

export type RoutineIngredient = {
  inciName: string;
  // 1-based position on the product's ingredient list.
  position: number;
  // ingredients.primary_function (e.g. 'protein', 'humectant', 'occlusive').
  // Null for ingredients not yet tagged.
  primaryFunction: string | null;
};

export type RoutineProduct = {
  name: string;
  // Routine pick category key, e.g. 'leave-in', 'curl-cream', 'oil'.
  category: string;
  ingredients: RoutineIngredient[];
};

// The subset of ScoringProfile (lib/compatibility.ts) this analysis reads.
export type RoutineAnalysisProfile = {
  porosity: string | null;
  family: CurlFamily | null;
  colorTreated: boolean;
};

export type RoutineFlag = {
  type: "warning" | "positive" | "tip";
  title: string;
  body: string;
  // Product names involved in the flag (matches RoutineProduct.name).
  affected_products?: string[];
  priority: "high" | "medium" | "low";
};

const HUMECTANT_NAMES = new Set([
  "glycerin",
  "glycerol",
  "propylene glycol",
  "propanediol",
  "sodium hyaluronate",
  "hyaluronic acid",
  "sorbitol",
  "panthenol",
  "aloe",
]);

const SULFATES = new Set([
  "sodium lauryl sulfate",
  "sodium laureth sulfate",
  "ammonium lauryl sulfate",
  "ammonium laureth sulfate",
]);

const HEAVY_SILICONES = new Set([
  "dimethicone",
  "dimethiconol",
  "cyclopentasiloxane",
  "amodimethicone",
]);

function hasTopIngredient(
  product: RoutineProduct,
  names: Set<string>,
  maxPosition: number
): boolean {
  return product.ingredients.some(
    (i) => i.position <= maxPosition && names.has(i.inciName.toLowerCase())
  );
}

function hasTopFunction(product: RoutineProduct, fn: string, maxPosition: number): boolean {
  return product.ingredients.some((i) => i.primaryFunction === fn && i.position <= maxPosition);
}

export function analyzeRoutineInteractions(
  routineProducts: RoutineProduct[],
  profile: RoutineAnalysisProfile,
  climate: ClimateZone | null
): RoutineFlag[] {
  const flags: RoutineFlag[] = [];
  const isCurlyOrCoily = profile.family === "curly" || profile.family === "coily";
  const porosityLabel = profile.porosity ?? "your";

  // ---- CHECK 1 - protein balance -----------------------------------------

  const proteinProducts = routineProducts.filter((p) => hasTopFunction(p, "protein", 8));

  if (proteinProducts.length >= 3 && profile.porosity === "low") {
    flags.push({
      type: "warning",
      priority: "high",
      title: "protein overload risk",
      body: `your routine has ${proteinProducts.length} products with protein in the top ingredients. low porosity hair already resists absorption - stacking protein products causes buildup, stiffness, and breakage over time.`,
      affected_products: proteinProducts.map((p) => p.name),
    });
  } else if (proteinProducts.length >= 3 && profile.porosity === "high") {
    flags.push({
      type: "tip",
      priority: "medium",
      title: "protein-heavy routine",
      body: "three protein products suits high porosity hair well. watch for stiffness - if your hair starts to feel brittle, reduce to two protein products and add a deep moisture treatment.",
      affected_products: proteinProducts.map((p) => p.name),
    });
  } else if (proteinProducts.length === 0 && profile.porosity === "high") {
    flags.push({
      type: "tip",
      priority: "medium",
      title: "no protein in routine",
      body: "high porosity hair benefits from at least one protein product per routine - it temporarily fills gaps in the cuticle and reduces moisture loss. consider adding a protein treatment or protein-containing conditioner.",
      affected_products: [],
    });
  }

  // ---- CHECK 2 - humectant stacking in dry climate ------------------------

  const humectantProducts = routineProducts.filter((p) => hasTopIngredient(p, HUMECTANT_NAMES, 5));

  if ((climate === "cold-dry" || climate === "dry") && humectantProducts.length >= 3) {
    flags.push({
      type: "warning",
      priority: "high",
      title: "humectant stacking in dry climate",
      body: `${humectantProducts.length} of your routine products have humectants near the top of their ingredient list. in ${climate.replace("-", " ")} conditions, stacked humectants draw moisture out of hair rather than in. consider sealing with a heavier oil or butter after your humectant-rich products.`,
      affected_products: humectantProducts.map((p) => p.name),
    });
  }

  // ---- CHECK 3 - missing sealant ------------------------------------------

  const hasLeaveIn = routineProducts.some((p) => p.category === "leave-in");
  const hasCurlCream = routineProducts.some((p) => p.category === "curl-cream" || p.category === "styler");
  const hasSealant = routineProducts.some(
    (p) =>
      p.category === "oil" ||
      p.category === "butter" ||
      p.category === "hair-butter" ||
      hasTopFunction(p, "occlusive", 3)
  );

  if ((hasLeaveIn || hasCurlCream) && !hasSealant && isCurlyOrCoily) {
    flags.push({
      type: "warning",
      priority: "high",
      title: "missing sealant",
      body: `your routine has a leave-in or curl cream but no sealing oil or butter. without a sealant the moisture from your leave-in evaporates within hours - especially for ${porosityLabel} porosity hair. add a light oil (jojoba, grapeseed) for wavy/curly or a heavier butter (shea, mango) for coily hair as your final step.`,
      affected_products: [],
    });
  }

  // ---- CHECK 4 - missing clarifier with heavy protein use -----------------

  const hasProteinTreatment = routineProducts.some(
    (p) =>
      p.category === "protein-treatment" ||
      (p.category === "deep-conditioner" && hasTopFunction(p, "protein", 3))
  );
  const hasClarifyingShampoo = routineProducts.some(
    (p) => p.category === "clarifying-shampoo" || p.category === "chelating-shampoo"
  );

  if (hasProteinTreatment && !hasClarifyingShampoo) {
    flags.push({
      type: "tip",
      priority: "medium",
      title: "add a monthly clarifying wash",
      body: "your routine includes a protein treatment. protein builds up on the hair shaft over time even when it's initially beneficial. a monthly clarifying or chelating shampoo removes accumulated protein and product buildup so your other products can penetrate properly.",
      affected_products: [],
    });
  }

  // ---- CHECK 5 - sulfate shampoo with color-treated hair ------------------

  const sulfateShampoo = routineProducts.find(
    (p) => p.category === "shampoo" && hasTopIngredient(p, SULFATES, 5)
  );

  if (sulfateShampoo && profile.colorTreated) {
    flags.push({
      type: "warning",
      priority: "high",
      title: "sulfate shampoo with color-treated hair",
      body: `${sulfateShampoo.name} contains a sulfate surfactant in the top ingredients. sulfates strip color pigment and accelerate fade on color-treated hair. consider swapping to a sulfate-free shampoo for your regular wash days and using this one only for monthly clarifying washes.`,
      affected_products: [sulfateShampoo.name],
    });
  }

  // ---- CHECK 6 - silicone buildup without a sulfate to remove it ----------

  const siliconeProducts = routineProducts.filter(
    (p) => p.category !== "shampoo" && hasTopIngredient(p, HEAVY_SILICONES, 5)
  );
  const hasSulfateShampoo = routineProducts.some(
    (p) => p.category === "shampoo" && hasTopIngredient(p, SULFATES, 5)
  );

  if (siliconeProducts.length >= 2 && !hasSulfateShampoo && isCurlyOrCoily) {
    flags.push({
      type: "warning",
      priority: "medium",
      title: "silicone buildup risk",
      body: `${siliconeProducts.length} of your products contain heavy silicones but your routine has no sulfate shampoo to remove them. silicones build up on curly and coily hair over time and prevent moisture from penetrating. include a clarifying wash every 4-6 weeks.`,
      affected_products: siliconeProducts.map((p) => p.name),
    });
  }

  // ---- CHECK 7 - LCO vs LOC order -----------------------------------------

  const hasOil = routineProducts.some((p) => p.category === "oil");

  if (hasLeaveIn && hasOil && profile.porosity === "high") {
    flags.push({
      type: "positive",
      priority: "low",
      title: "lco layering: leave-in → cream → oil",
      body: "your routine has a leave-in and an oil - ideal for high porosity hair. apply in this order: leave-in first to add moisture, cream to define, oil last to seal. applying oil first blocks the leave-in from absorbing.",
      affected_products: [],
    });
  }

  if (hasLeaveIn && hasOil && profile.porosity === "low") {
    flags.push({
      type: "tip",
      priority: "medium",
      title: "loc layering: leave-in → oil → cream",
      body: "for low porosity hair, try LOC order instead of LCO: leave-in first, then a light oil to help products penetrate the resistant cuticle, then a cream to define and hold. this helps low porosity hair absorb moisture it would otherwise repel.",
      affected_products: [],
    });
  }

  // ---- CHECK 8 - positive: balanced routine -------------------------------

  const hasCleanser = routineProducts.some((p) => p.category === "shampoo" || p.category === "co-wash");
  const hasConditioner = routineProducts.some(
    (p) => p.category === "conditioner" || p.category === "deep-conditioner"
  );

  if (
    hasCleanser &&
    hasConditioner &&
    hasLeaveIn &&
    hasSealant &&
    flags.every((f) => f.type !== "warning")
  ) {
    flags.push({
      type: "positive",
      priority: "low",
      title: "well-balanced routine",
      body: "your routine covers all four essentials - cleanse, condition, moisturize, and seal. no major interaction issues detected between your current products.",
      affected_products: [],
    });
  }

  // Warnings first, then by priority.
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return flags.sort((a, b) => {
    const aWarning = a.type === "warning" ? 0 : 1;
    const bWarning = b.type === "warning" ? 0 : 1;
    if (aWarning !== bWarning) return aWarning - bWarning;
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}
