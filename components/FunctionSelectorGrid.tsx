"use client";

// Visual card grid for picking an ingredient's primary_function, used by
// the ingredient-tagging tool on the Coverage tab (app/admin/products/page.tsx).
// Deliberately covers only the 16 functions FUNCTION_DEFAULT_SCORES knows
// how to auto-score (lib/compatibility.ts) - 4 more values exist in
// INGREDIENT_FUNCTION_LABELS (emulsifier, colorant, penetration_enhancer,
// antifungal) that aren't represented here because there's no default-score
// table for them yet. Ingredients already tagged with one of those 4 keep
// their tag (nothing here overwrites it), they just can't be *newly*
// assigned one of those 4 through this grid.

export type IngredientFunction =
  | "humectant"
  | "emollient"
  | "occlusive"
  | "protein"
  | "surfactant"
  | "film_former"
  | "conditioning_agent"
  | "preservative"
  | "fragrance"
  | "ph_adjuster"
  | "chelating_agent"
  | "thickener"
  | "antioxidant"
  | "scalp_active"
  | "bond_builder"
  | "solvent";

export const FUNCTION_CARDS: {
  value: IngredientFunction;
  description: string;
  scores: { low: number; medium: number; high: number };
}[] = [
  { value: "humectant", description: "Draws moisture from environment into hair shaft. Works best in humid climates.", scores: { low: 6, medium: 7, high: 8 } },
  { value: "emollient", description: "Softens and smooths the hair cuticle. Lightweight oils and esters.", scores: { low: 8, medium: 7, high: 6 } },
  { value: "occlusive", description: "Creates a barrier on hair shaft to prevent moisture loss. Heavy butters and silicones.", scores: { low: 7, medium: 6, high: 5 } },
  { value: "protein", description: "Strengthens the hair shaft structure. Can cause buildup on low porosity hair.", scores: { low: 4, medium: 7, high: 8 } },
  { value: "surfactant", description: "Cleansing agent. Removes oil and buildup from the scalp and hair.", scores: { low: 6, medium: 6, high: 6 } },
  { value: "film_former", description: "Creates a flexible film on the hair shaft for hold and definition.", scores: { low: 7, medium: 7, high: 7 } },
  { value: "conditioning_agent", description: "Improves slip, detangling, and softness.", scores: { low: 6, medium: 7, high: 8 } },
  { value: "preservative", description: "Prevents microbial growth in the formula. Necessary for safety.", scores: { low: 6, medium: 6, high: 6 } },
  { value: "fragrance", description: "Scent component. Can irritate sensitive scalps.", scores: { low: 5, medium: 5, high: 5 } },
  { value: "ph_adjuster", description: "Maintains formula pH at the correct range for hair (4.5-5.5).", scores: { low: 7, medium: 7, high: 7 } },
  { value: "chelating_agent", description: "Binds hard water minerals that block other ingredients from working.", scores: { low: 7, medium: 7, high: 7 } },
  { value: "thickener", description: "Gives the product its texture and viscosity. No direct hair benefit.", scores: { low: 6, medium: 6, high: 6 } },
  { value: "antioxidant", description: "Prevents ingredient oxidation in the formula. Minor scalp benefits.", scores: { low: 7, medium: 7, high: 7 } },
  { value: "scalp_active", description: "Active ingredient targeting scalp health, growth, or dandruff.", scores: { low: 7, medium: 7, high: 7 } },
  { value: "bond_builder", description: "Repairs broken disulfide bonds in chemically processed or damaged hair.", scores: { low: 8, medium: 8, high: 8 } },
  { value: "solvent", description: "Dissolves other ingredients. Volatile solvents evaporate after application.", scores: { low: 6, medium: 6, high: 6 } },
];

export function FunctionSelectorGrid({
  value,
  onSelect,
}: {
  value: IngredientFunction | null;
  onSelect: (fn: IngredientFunction) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {FUNCTION_CARDS.map((card) => {
        const selected = value === card.value;
        return (
          <button
            key={card.value}
            type="button"
            onClick={() => onSelect(card.value)}
            className={`rounded-lg border p-3 text-left transition-colors ${
              selected ? "border-dark bg-dark text-white" : "border-bronze/30 hover:border-bronze"
            }`}
          >
            <p className="font-sans text-[12px] font-bold lowercase">{card.value}</p>
            <p className={`mt-1 font-sans text-[11px] font-light ${selected ? "text-white/70" : "text-dark/50"}`}>
              {card.description}
            </p>
            <p className={`mt-1.5 font-mono text-[9px] ${selected ? "text-white/60" : "text-dark/40"}`}>
              low: {card.scores.low} · med: {card.scores.medium} · high: {card.scores.high}
            </p>
          </button>
        );
      })}
    </div>
  );
}
