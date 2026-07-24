import { supabase } from "@/lib/supabase";

export type TravelClimate =
  | "humid"
  | "dry"
  | "cold_dry"
  | "tropical"
  | "similar_to_home";

export const TRAVEL_CLIMATES: { value: TravelClimate; label: string }[] = [
  { value: "humid", label: "Humid" },
  { value: "dry", label: "Dry" },
  { value: "cold_dry", label: "Cold & Dry" },
  { value: "tropical", label: "Tropical" },
  { value: "similar_to_home", label: "Similar to Home" },
];

type CategoryConfig = {
  key: string;
  label: string;
  // Matched against both inci_name and common_name -- a starter curated
  // list per category, not a full product catalog. Easy to expand as
  // more ingredients are added to compatibility_scores.
  candidates: string[];
};

export const TRAVEL_KIT_CATEGORIES: CategoryConfig[] = [
  {
    key: "shampoo",
    label: "Shampoo",
    candidates: [
      "Cocamidopropyl Betaine",
      "Decyl Glucoside",
      "Sodium Lauryl Sulfate",
      "Sodium Laureth Sulfate",
    ],
  },
  {
    key: "conditioner",
    label: "Conditioner",
    candidates: [
      "Behentrimonium Chloride",
      "Behentrimonium Methosulfate",
      "Cetyl Alcohol",
      "Cetearyl Alcohol",
    ],
  },
  {
    key: "leave_in",
    label: "Leave-In",
    candidates: [
      "Glycerin",
      "Panthenol",
      "Aloe Barbadensis Leaf Juice",
      "Propanediol",
    ],
  },
  {
    key: "gel",
    label: "Gel",
    candidates: [
      "PVP",
      "Hydroxyethylcellulose",
      "Polyquaternium-37",
      "Polyquaternium-10",
    ],
  },
  {
    key: "curl_refresher",
    label: "Curl Refresher",
    candidates: ["Glycerin", "Honey", "Aloe Barbadensis Leaf Juice", "Panthenol"],
  },
];

export type TravelKitItem = {
  category: string;
  categoryLabel: string;
  ingredientName: string | null;
  score: number | null;
  rating: string | null;
  reason: string | null;
};

function climateAdjustedScore(
  baseScore: number,
  climateModifier: string | null,
  climate: TravelClimate
): number {
  if (!climateModifier || climateModifier === "none") return baseScore;

  const isHumid = climate === "humid" || climate === "tropical";
  const isDry = climate === "dry" || climate === "cold_dry";

  if (climateModifier === "humid_boost" && isHumid) {
    return Math.min(10, baseScore + 2);
  }
  if (climateModifier === "humid_boost" && isDry) {
    return Math.max(0, baseScore - 2);
  }
  if (climateModifier === "arid_downgrade" && isDry) {
    return Math.max(0, baseScore - 2);
  }
  if (climateModifier === "arid_downgrade" && isHumid) {
    return Math.min(10, baseScore + 1);
  }

  return baseScore;
}

export async function getTravelKit(
  porosity: string | null,
  climate: TravelClimate
): Promise<TravelKitItem[]> {
  const normalizedPorosity = porosity === "not sure" ? null : porosity;

  const results: TravelKitItem[] = [];

  for (const category of TRAVEL_KIT_CATEGORIES) {
    const nameList = category.candidates.join(",");

    let query = supabase
      .from("compatibility_scores")
      .select(
        "score, rating, reason, climate_modifier, ingredients!inner(inci_name, common_name)"
      )
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
          adjustedScore: climateAdjustedScore(
            row.score,
            row.climate_modifier,
            climate
          ),
        };
      })
      .sort((a, b) => b.adjustedScore - a.adjustedScore)[0];

    results.push({
      category: category.key,
      categoryLabel: category.label,
      ingredientName: best.ingredientName,
      score: best.adjustedScore,
      rating: best.rating,
      reason: best.reason,
    });
  }

  return results;
}
