import { supabase } from "@/lib/supabase";
import { curlFamily } from "@/lib/compatibility";
import { getExtensionCareGuidance } from "@/lib/extensionCare";
import { getChildSafetyStep } from "@/lib/childSafety";

export type HairProfileForRoutine = {
  curl_type: string | null;
  porosity: string | null;
  scalp_condition: string | null;
  strand_thickness: string | null;
  hair_concerns: string[] | null;
  extensions?: string | null;
  extension_type?: string[] | null;
  extension_care?: string | null;
  profile_for?: string | null;
};

export type RoutineStep = {
  title: string;
  description: string;
};

const STRAIGHT_ROUTINE: RoutineStep[] = [
  {
    title: "1. Cleanse",
    description:
      "Clarify regularly -- straight hair's flat cuticle lets oil travel down the shaft fast, so buildup shows up sooner than on other textures.",
  },
  {
    title: "2. Condition",
    description:
      "Apply a lightweight conditioner from mid-length to ends only -- conditioner at the root just adds weight and can flatten volume.",
  },
  {
    title: "3. Moisturize & Seal",
    description:
      "Avoid heavy products at the roots -- anything rich enough to seal moisture on other textures will usually look greasy and limp on straight hair.",
  },
  {
    title: "4. Style",
    description:
      "Air dry or diffuse on low heat to preserve whatever natural body and movement your hair has.",
  },
];

const WAVY_ROUTINE: RoutineStep[] = [
  {
    title: "1. Cleanse",
    description:
      "A sulfate-free shampoo cleans without stripping the light oils that help your wave pattern hold together.",
  },
  {
    title: "2. Condition",
    description:
      "A lightweight conditioner adds slip and softness without weighing down the wave.",
  },
  {
    title: "3. Moisturize & Seal",
    description:
      "Scrunch in a curl cream or mousse while hair is soaking wet -- this is what actually shapes and holds the wave pattern as it dries.",
  },
  {
    title: "4. Style",
    description:
      "Diffuse or air dry without touching -- disturbing wavy hair as it dries is one of the most common causes of frizz.",
  },
];

const CURLY_ROUTINE: RoutineStep[] = [
  {
    title: "1. Cleanse",
    description:
      "Co-wash or use a gentle, sulfate-free shampoo -- curly hair is naturally drier than straighter textures and tolerates less stripping.",
  },
  {
    title: "2. Condition",
    description:
      "Deep condition weekly to keep curls elastic and reduce breakage at the point of detangling.",
  },
  {
    title: "3. Moisturize & Seal",
    description:
      "Apply your styler on soaking wet hair -- curls hold definition best when product goes on before any water evaporates.",
  },
  {
    title: "4. Style",
    description:
      "Diffuse or air dry -- minimal disturbance while drying keeps the curl pattern intact and reduces frizz.",
  },
];

// A simple rules-based routine generator -- a first-pass placeholder
// algorithm, not a curated content system. Easy to swap out for
// something more sophisticated later without touching callers.
//
// Straight/wavy/curly (types 1-3) get their own fixed routines, since
// what matters most for those textures is the overall approach, not
// porosity-driven variation. Coily (type 4) and unset/"not sure" curl
// types keep the original porosity-driven logic below completely
// unchanged -- that's the well-calibrated, original behavior this
// function was built around.
function withExtensionCare(
  steps: RoutineStep[],
  profile: HairProfileForRoutine
): RoutineStep[] {
  if (profile.extensions !== "yes") return steps;

  const guidance = getExtensionCareGuidance(
    profile.extension_type ?? null,
    profile.extension_care ?? null
  );
  return [
    ...steps,
    {
      title: `${steps.length + 1}. ${guidance.title}`,
      description: `${guidance.body} ${guidance.why}`,
    },
  ];
}

function withChildSafety(
  steps: RoutineStep[],
  profile: HairProfileForRoutine
): RoutineStep[] {
  const step = getChildSafetyStep(profile.profile_for ?? null);
  if (!step) return steps;

  return [
    ...steps,
    {
      title: `${steps.length + 1}. ${step.title}`,
      description: `${step.body} ${step.why}`,
    },
  ];
}

function withThinningHairNote(
  steps: RoutineStep[],
  profile: HairProfileForRoutine
): RoutineStep[] {
  if (!profile.hair_concerns?.includes("thinning")) return steps;

  return [
    ...steps,
    {
      title: `${steps.length + 1}. Thinning Hair Care`,
      description:
        "Scalp massage for 4 minutes during wash day has clinical evidence supporting hair growth stimulation. Use the pads of your fingers, not your nails.",
    },
  ];
}

function withAdditionalGuidance(
  steps: RoutineStep[],
  profile: HairProfileForRoutine
): RoutineStep[] {
  return withThinningHairNote(withChildSafety(withExtensionCare(steps, profile), profile), profile);
}

export function getBasicRoutineSteps(
  profile: HairProfileForRoutine
): RoutineStep[] {
  const family = curlFamily(profile.curl_type);
  if (family === "straight") return withAdditionalGuidance(STRAIGHT_ROUTINE, profile);
  if (family === "wavy") return withAdditionalGuidance(WAVY_ROUTINE, profile);
  if (family === "curly") return withAdditionalGuidance(CURLY_ROUTINE, profile);

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

  return withAdditionalGuidance(
    [
      { title: "1. Cleanse", description: cleanse },
      { title: "2. Condition", description: condition },
      { title: "3. Moisturize & Seal", description: moisturize },
      { title: "4. Style", description: style },
    ],
    profile
  );
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
