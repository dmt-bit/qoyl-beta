import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export type RoutineProduct = {
  category: string;
  categoryLabel: string;
  // No real product/brand catalog exists yet -- this is the best-matching
  // *ingredient* for the category, not a real shoppable product name.
  ingredientName: string | null;
  score: number | null; // 0-100, for display consistency with the template
  rating: string | null;
  reason: string | null;
  affiliateLink: string;
};

type CategoryConfig = {
  key: string;
  label: string;
  candidates: string[];
};

const ROUTINE_PRODUCT_CATEGORIES: CategoryConfig[] = [
  {
    key: "chelating_shampoo",
    label: "Chelating Shampoo",
    candidates: ["Sodium Phytate", "Disodium EDTA", "Tetrasodium EDTA", "Citric Acid"],
  },
  {
    key: "regular_shampoo",
    label: "Regular Shampoo",
    candidates: [
      "Cocamidopropyl Betaine",
      "Decyl Glucoside",
      "Sodium Cocoyl Isethionate",
      "Sodium Lauroyl Isethionate",
    ],
  },
  {
    key: "deep_conditioner",
    label: "Deep Conditioner",
    candidates: [
      "Behentrimonium Chloride",
      "Behentrimonium Methosulfate",
      "Hydrolyzed Keratin",
      "Hydrolyzed Silk",
    ],
  },
  {
    key: "leave_in",
    label: "Leave-In Conditioner",
    candidates: ["Glycerin", "Panthenol", "Aloe Barbadensis Leaf Juice", "Propanediol"],
  },
  {
    key: "styler",
    label: "Cream Moisturizer / Styler",
    candidates: ["PVP", "Hydroxyethylcellulose", "Polyquaternium-37", "Polyquaternium-10"],
  },
  {
    key: "sealing_oil",
    label: "Sealing Oil",
    candidates: [
      "Ricinus Communis Seed Oil",
      "Jamaican Black Castor Oil",
      "Simmondsia Chinensis Seed Oil",
      "Butyrospermum Parkii Butter",
    ],
  },
];

type CategoryCandidate = {
  ingredientName: string | null;
  score: number | null; // 0-100
  rating: string | null;
  reason: string | null;
};

// Shared by getRoutineProducts (top pick only, used by the routine email)
// and getRoutineProductPicks (top + alternate, used by the /routine page)
// so both stay in sync with a single query/sort implementation.
async function queryCategoryCandidates(
  category: CategoryConfig,
  normalizedPorosity: string | null
): Promise<CategoryCandidate[]> {
  const admin = getSupabaseAdmin();
  const nameList = category.candidates.join(",");

  let query = admin
    .from("compatibility_scores")
    .select("score, rating, reason, ingredients!inner(inci_name, common_name)")
    .or(`inci_name.in.(${nameList}),common_name.in.(${nameList})`, {
      foreignTable: "ingredients",
    });

  if (normalizedPorosity) {
    query = query.or(`porosity.is.null,porosity.eq.${normalizedPorosity}`);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return data
    .map((row) => {
      const ingredient = Array.isArray(row.ingredients)
        ? row.ingredients[0]
        : row.ingredients;
      return {
        ingredientName: ingredient?.common_name ?? ingredient?.inci_name ?? null,
        rating: row.rating,
        reason: row.reason,
        score: row.score !== null ? row.score * 10 : null,
      };
    })
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
}

export async function getRoutineProducts(
  porosity: string | null
): Promise<RoutineProduct[]> {
  const normalizedPorosity = porosity === "not sure" ? null : porosity;
  const results: RoutineProduct[] = [];

  for (const category of ROUTINE_PRODUCT_CATEGORIES) {
    const candidates = await queryCategoryCandidates(category, normalizedPorosity);
    const best = candidates[0];

    results.push({
      category: category.key,
      categoryLabel: category.label,
      ingredientName: best?.ingredientName ?? null,
      score: best?.score ?? null,
      rating: best?.rating ?? null,
      reason: best?.reason ?? null,
      affiliateLink: "#",
    });
  }

  return results;
}

export type RoutineProductPick = {
  category: string;
  categoryLabel: string;
  primary: CategoryCandidate | null;
  alternate: CategoryCandidate | null;
};

// Same category/candidate logic as getRoutineProducts, but surfaces the
// second-best match too -- the /routine page shows a primary pick plus an
// alternate per category, unlike the single-pick routine email.
export async function getRoutineProductPicks(
  porosity: string | null
): Promise<RoutineProductPick[]> {
  const normalizedPorosity = porosity === "not sure" ? null : porosity;
  const results: RoutineProductPick[] = [];

  for (const category of ROUTINE_PRODUCT_CATEGORIES) {
    const candidates = await queryCategoryCandidates(category, normalizedPorosity);

    results.push({
      category: category.key,
      categoryLabel: category.label,
      primary: candidates[0] ?? null,
      alternate: candidates[1] ?? null,
    });
  }

  return results;
}

export type AvoidIngredient = {
  ingredientName: string;
  score: number; // 0-100
  reason: string | null;
};

// Lowest-scoring ingredients for the user's porosity -- the inverse of
// getRoutineProductPicks. Not scoped to the six product categories above,
// since "avoid" guidance is useful regardless of product type.
export async function getIngredientsToAvoid(
  porosity: string | null,
  limit = 5
): Promise<AvoidIngredient[]> {
  const normalizedPorosity = porosity === "not sure" ? null : porosity;
  const admin = getSupabaseAdmin();

  let query = admin
    .from("compatibility_scores")
    .select("score, reason, ingredients!inner(inci_name, common_name)")
    .order("score", { ascending: true })
    .limit(limit * 3); // over-fetch since porosity/name filtering happens client-side below

  if (normalizedPorosity) {
    query = query.or(`porosity.is.null,porosity.eq.${normalizedPorosity}`);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  const byIngredient = new Map<string, AvoidIngredient>();
  for (const row of data) {
    const ingredient = Array.isArray(row.ingredients)
      ? row.ingredients[0]
      : row.ingredients;
    const name = ingredient?.common_name ?? ingredient?.inci_name;
    if (!name || byIngredient.has(name)) continue;
    byIngredient.set(name, {
      ingredientName: name,
      score: row.score * 10,
      reason: row.reason,
    });
  }

  return Array.from(byIngredient.values())
    .sort((a, b) => a.score - b.score)
    .slice(0, limit);
}
