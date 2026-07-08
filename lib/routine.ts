import { supabase } from "@/lib/supabase";

export type HairProfileForRoutine = {
  curl_type: string | null;
  porosity: string | null;
  scalp_condition: string | null;
  strand_thickness: string | null;
  hair_concerns: string[] | null;
};

export type RoutineStep = {
  title: string;
  description: string;
};

// A simple rules-based routine generator -- a first-pass placeholder
// algorithm, not a curated content system. Easy to swap out for
// something more sophisticated later without touching callers.
export function getBasicRoutineSteps(
  profile: HairProfileForRoutine
): RoutineStep[] {
  const porosity = profile.porosity ?? "medium";
  const concerns = profile.hair_concerns ?? [];

  const cleanse =
    porosity === "low"
      ? "Clarify every 2-3 washes to prevent buildup on tightly-bound cuticles."
      : porosity === "high"
      ? "Use a moisturizing, sulfate-free cleanser -- open cuticles lose moisture fast."
      : "A gentle sulfate-free cleanser works well at this porosity.";

  const condition =
    porosity === "low"
      ? "Deep condition with heat (a warm cap or hooded dryer) to help product penetrate resistant cuticles."
      : porosity === "high"
      ? "Alternate moisture and protein deep conditioners -- gappy cuticles need both hydration and reinforcement."
      : "A weekly deep conditioner keeps moisture balanced.";

  const moisturize =
    porosity === "low"
      ? "Layer light, water-based leave-ins -- heavy creams and butters tend to sit on top rather than absorb."
      : porosity === "high"
      ? "Seal with a rich butter or oil right after your leave-in to lock moisture into the open cuticle."
      : "The LOC or LCO method (liquid, oil/cream, cream/oil) works well here.";

  const style = concerns.includes("frizz")
    ? "Style on soaking wet hair with a strong-hold gel to fight frizz as it dries."
    : concerns.includes("shrinkage")
    ? "Stretch your style (banding, braid-outs, or a diffuser on low heat) to manage shrinkage."
    : "Apply your styler on soaking wet hair and let it air dry or diffuse on low heat.";

  return [
    { title: "1. Cleanse", description: cleanse },
    { title: "2. Condition", description: condition },
    { title: "3. Moisturize & Seal", description: moisturize },
    { title: "4. Style", description: style },
  ];
}

export type CalendarDay = {
  day: number;
  isWashDay: boolean;
  note: string;
};

function getWashInterval(profile: HairProfileForRoutine): number {
  const porosity = profile.porosity ?? "medium";
  const thickness = profile.strand_thickness ?? "medium";

  if (porosity === "low" && thickness === "fine") return 4;
  if (porosity === "high" || thickness === "coarse") return 6;
  return 5;
}

export function generateCalendar(
  profile: HairProfileForRoutine,
  totalDays: number
): CalendarDay[] {
  const interval = getWashInterval(profile);
  const days: CalendarDay[] = [];

  for (let day = 1; day <= totalDays; day++) {
    const isWashDay = (day - 1) % interval === 0;
    days.push({
      day,
      isWashDay,
      note: isWashDay
        ? "Full wash day -- cleanse, condition, moisturize, seal, and style."
        : "Refresh day -- mist with water or a diluted leave-in and re-seal ends.",
    });
  }

  return days;
}

export type RecommendedIngredient = {
  name: string;
  score: number;
  rating: string;
  reason: string | null;
};

// Reuses the same ingredients/compatibility_scores tables the product
// scorer draws from. There's no separate "products" catalog in this
// app, so this surfaces well-scoring ingredients to look for rather
// than branded products.
export async function getRecommendedIngredients(
  profile: HairProfileForRoutine,
  limit = 20
): Promise<RecommendedIngredient[]> {
  const porosity = profile.porosity === "not sure" ? null : profile.porosity;

  let query = supabase
    .from("compatibility_scores")
    .select("score, rating, reason, ingredients(inci_name, common_name)")
    .eq("rating", "good")
    .order("score", { ascending: false })
    .limit(limit);

  if (porosity) {
    query = query.or(`porosity.is.null,porosity.eq.${porosity}`);
  }

  const { data, error } = await query;

  if (error || !data) {
    console.error("Failed to fetch recommended ingredients:", error);
    return [];
  }

  return data.map((row) => {
    const ingredient = Array.isArray(row.ingredients)
      ? row.ingredients[0]
      : row.ingredients;
    return {
      name: ingredient?.common_name ?? ingredient?.inci_name ?? "Unknown",
      score: row.score,
      rating: row.rating,
      reason: row.reason,
    };
  });
}
