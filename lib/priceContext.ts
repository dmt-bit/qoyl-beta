// Price-tier chip shown on product cards once a user has set a
// budget_range preference (see hair_profiles.budget_range) - purely
// informational context on every card, independent of which budget
// bucket the user actually picked. Shared between /routine and /search
// so both render identical chips.
export type PriceTier = "budget" | "mid" | "premium";

export function priceTierFor(priceUsd: number): PriceTier {
  if (priceUsd < 15) return "budget";
  if (priceUsd <= 35) return "mid";
  return "premium";
}

export const PRICE_TIER_LABEL: Record<PriceTier, string> = {
  budget: "Budget pick",
  mid: "Mid range",
  premium: "Premium",
};

export const PRICE_TIER_CLASSES: Record<PriceTier, string> = {
  budget: "bg-green/20 text-green",
  mid: "bg-bronze/20 text-bronze2",
  premium: "bg-amber/20 text-amber",
};

// Budget filtering (chips + the "budget-friendly alternative" note) is
// on at all once a real preference is set - "no preference" and unset
// both mean off.
export function isBudgetActive(budgetRange: string | null): boolean {
  return Boolean(budgetRange) && budgetRange !== "no_preference";
}

// under_25/25_50/50_100 are real ceilings; over_100 has no ceiling to
// enforce (a user who says "over $100" isn't excluding anything by
// price) - Infinity so nothing is ever flagged out of budget for them,
// distinct from budget filtering being off entirely (see
// isBudgetActive above).
export function budgetMaxUsd(budgetRange: string | null): number {
  if (budgetRange === "under_25") return 25;
  if (budgetRange === "25_50") return 50;
  if (budgetRange === "50_100") return 100;
  return Infinity; // over_100 (or filtering inactive - caller checks isBudgetActive first)
}
