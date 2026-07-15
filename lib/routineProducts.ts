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

export async function getRoutineProducts(
  porosity: string | null
): Promise<RoutineProduct[]> {
  const normalizedPorosity = porosity === "not sure" ? null : porosity;
  const admin = getSupabaseAdmin();
  const results: RoutineProduct[] = [];

  for (const category of ROUTINE_PRODUCT_CATEGORIES) {
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

    if (error || !data || data.length === 0) {
      results.push({
        category: category.key,
        categoryLabel: category.label,
        ingredientName: null,
        score: null,
        rating: null,
        reason: null,
        affiliateLink: "#",
      });
      continue;
    }

    const best = data
      .map((row) => {
        const ingredient = Array.isArray(row.ingredients)
          ? row.ingredients[0]
          : row.ingredients;
        return {
          ingredientName: ingredient?.common_name ?? ingredient?.inci_name ?? null,
          rating: row.rating,
          reason: row.reason,
          score: row.score,
        };
      })
      .sort((a, b) => b.score - a.score)[0];

    results.push({
      category: category.key,
      categoryLabel: category.label,
      ingredientName: best.ingredientName,
      score: best.score !== null ? best.score * 10 : null,
      rating: best.rating,
      reason: best.reason,
      affiliateLink: "#",
    });
  }

  return results;
}
