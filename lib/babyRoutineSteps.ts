// Baby wash-day routine generator - deliberately separate from
// lib/routineSteps.ts's curl-family dispatch (adult routines), since a
// baby routine isn't curl-type-driven at all: it's built from
// hair_texture/scalp_condition/wash_frequency_preference on baby_profiles.

export type BabyRoutineStep = {
  title: string;
  body: string;
};

export const BABY_WASH_FREQUENCY_LABELS: Record<string, string> = {
  every_2_days: "Every 2 days",
  every_3_4_days: "Every 3-4 days",
  weekly: "Once a week",
  every_2_weeks_or_less: "Every 2 weeks or less",
};

type BabyRoutineProfile = {
  hair_texture: string | null;
  scalp_condition: string | null;
  wash_frequency_preference: string | null;
};

export function generateBabyRoutineSteps(profile: BabyRoutineProfile): {
  washFrequencyLabel: string | null;
  washDaySteps: BabyRoutineStep[];
  dailyCare: string;
} {
  const texture = profile.hair_texture ?? "";
  const isCurlyOrCoily = texture.includes("curly") || texture.includes("coily");
  const isCoily = texture.includes("coily");
  const isDrySclap = profile.scalp_condition === "dry";
  const hasCradleCap = profile.scalp_condition === "cradle_cap";

  const steps: BabyRoutineStep[] = [
    {
      title: "Prep",
      body: "Fill the bath or sink with warm (not hot) water. Test on your wrist - it should feel comfortable, not hot. Have everything within reach before starting.",
    },
    {
      title: "Wet hair gently",
      body: "Using a cup or gentle spray, wet baby's hair with warm water. Support their head at all times.",
    },
    {
      title: "Baby shampoo (if washing scalp)",
      body: hasCradleCap
        ? "Apply a small amount of fragrance-free, tear-free baby shampoo to the scalp only. Massage very gently with fingertip pads - never nails. Rinse thoroughly. For cradle cap: after washing, gently massage a small amount of mineral oil or pure coconut oil into the scalp. Leave for a few minutes then gently comb out the flakes with a soft baby brush. Never pick or scratch."
        : "Apply a small amount of fragrance-free, tear-free baby shampoo to the scalp only. Massage very gently with fingertip pads - never nails. Rinse thoroughly.",
    },
  ];

  if (isCurlyOrCoily) {
    steps.push({
      title: "Conditioner",
      body: "Apply a small amount of fragrance-free conditioner to hair length. Gently detangle with fingers or a wide tooth baby comb. Rinse thoroughly.",
    });
  }

  steps.push({
    title: "Pat dry (never rub)",
    body: "Gently pat hair dry with a soft towel or microfiber towel. Never rub - rubbing causes friction and frizz on curly baby hair.",
  });

  if (isDrySclap || isCoily) {
    steps.push({
      title: "Moisturize",
      body: "Apply a tiny amount of fragrance-free baby lotion or pure natural oil (jojoba or coconut) to hair and scalp while still slightly damp.",
    });
  }

  return {
    washFrequencyLabel: profile.wash_frequency_preference
      ? BABY_WASH_FREQUENCY_LABELS[profile.wash_frequency_preference] ?? null
      : null,
    washDaySteps: steps,
    dailyCare:
      "Between washes: if scalp looks dry, apply a small amount of fragrance-free oil with fingertips. Protect hair during sleep with a satin bonnet if baby tolerates it, or use a satin pillowcase.",
  };
}
