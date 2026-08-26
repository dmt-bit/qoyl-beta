import { generateRoutineStepsByWashType, type WashDaySteps } from "@/lib/routineSteps";

// TAB 2 ("My Natural Hair Underneath") - reuses the same curl-family wash
// routine adults get (generateRoutineStepsByWashType), then layers on the
// protective-style-context adaptations from the spec: a different intro
// line, a different recommended wash frequency, and a short list of
// extra notes specific to what's covering the scalp.

export type ExtensionNaturalHairRoutine = {
  intro: string;
  washFrequency: string;
  washDays: WashDaySteps[];
  extraNotes: string[];
};

const WIG_TYPES = new Set(["wig_lace_front", "wig_full_lace", "wig_360", "wig_glueless"]);
const BOND_TYPES = new Set(["tape_in", "k_tip"]);
const BRAID_BASE_TYPES = new Set(["sew_in_weave", "crochet", "i_tip"]);
const REMOVED_DAILY_TYPES = new Set(["clip_in", "halo"]);

export function generateExtensionNaturalHairRoutine(profile: {
  extension_types: string[];
  natural_curl_type: string | null;
}): ExtensionNaturalHairRoutine {
  const types = profile.extension_types ?? [];
  const washDays = generateRoutineStepsByWashType(profile.natural_curl_type);

  if (types.some((t) => WIG_TYPES.has(t))) {
    return {
      intro: "Your natural hair maintenance routine while wearing your wig:",
      washFrequency: "Every 1-2 weeks (more frequent than non-wig wearers because the scalp is covered and sweats more)",
      washDays,
      extraNotes: [
        "Scalp detox: use a scalp scrub or clarifying shampoo on your natural hair every 2 weeks to remove the buildup from adhesive, sweat, and products.",
        "Daily scalp care: if wearing a wig daily, apply a lightweight scalp oil to your natural hair at the scalp 3-4 times per week using an applicator bottle or dropper.",
        "Give your scalp breathing days: if possible take 1-2 days per week without the wig to allow scalp to breathe and recover.",
      ],
    };
  }

  if (types.some((t) => BOND_TYPES.has(t))) {
    return {
      intro: "Protective measures for your natural hair during the install period:",
      washFrequency: "Every 2-3 weeks maximum - overwashing weakens the bond integrity",
      washDays,
      extraNotes: [
        "Scalp massage between washes: use an applicator bottle with diluted leave-in to moisturize scalp between wash days without getting bonds wet.",
      ],
    };
  }

  if (types.some((t) => BRAID_BASE_TYPES.has(t))) {
    return {
      intro: "Standard protective style natural hair maintenance routine:",
      washFrequency: "Every 1-2 weeks, keeping the scalp clean under the braid base",
      washDays,
      extraNotes: [],
    };
  }

  if (types.some((t) => REMOVED_DAILY_TYPES.has(t))) {
    return {
      intro: "Since this style is removed daily, your natural hair follows its normal routine with no special adaptation needed:",
      washFrequency: "Your normal wash schedule",
      washDays,
      extraNotes: [],
    };
  }

  return {
    intro: "Standard protective style natural hair maintenance routine:",
    washFrequency: "Every 1-2 weeks",
    washDays,
    extraNotes: [],
  };
}
