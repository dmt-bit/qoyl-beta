// TAB 3 ("Blending") - only shown when needs_blending = true.

export type BlendingStep = {
  title: string;
  body: string;
  why?: string;
};

const HEAT_METHODS = new Set(["heat_flat_iron", "blow_dry_tension"]);
const NO_HEAT_METHODS = new Set(["no_heat_banding", "no_heat_rollers"]);

function flatIronTempRange(curlType: string | null): string {
  if (!curlType || curlType === "not_sure") return "320-360°F";
  if (["1a", "1b", "1c", "2a", "2b", "2c"].includes(curlType)) return "280-320°F";
  if (["3a", "3b"].includes(curlType)) return "320-360°F";
  if (["3c", "4a"].includes(curlType)) return "360-400°F";
  if (["4b", "4c"].includes(curlType)) return "380-420°F";
  return "320-360°F";
}

function heatBlendingSteps(curlType: string | null): BlendingStep[] {
  return [
    {
      title: "Prep natural hair for heat blending",
      body: "Apply a generous amount of heat protectant to your natural leave-out before any heat tool. On natural hair this is non-negotiable - heat damage to your natural hair is permanent and cannot be reversed.",
    },
    {
      title: "Stretch before flat ironing",
      body: "Stretch your natural leave-out first using the banding method or blow dry on low heat before flat ironing. Starting with stretched hair means less direct heat passes needed to achieve the blend.",
      why: "Each pass of a flat iron at high temperature permanently alters the protein structure of your natural curl. Fewer passes = less cumulative damage.",
    },
    {
      title: "Flat iron at the RIGHT temperature",
      body: `Based on your natural curl type, stay at or below ${flatIronTempRange(curlType)} maximum. Never exceed this - fine straight textures burn at lower temperatures, coily textures need more heat to temporarily relax.`,
    },
    {
      title: "One pass rule",
      body: "Aim for one deliberate pass per section rather than multiple fast passes. A slow deliberate single pass causes less cumulative damage than multiple quick passes.",
    },
    {
      title: "Protect the blend at night",
      body: "Before bed wrap or pin your blended leave-out flat against your head under your wig or satin scarf. This maintains the blend without needing to re-apply heat every morning.",
    },
  ];
}

function noHeatBlendingSteps(): BlendingStep[] {
  return [
    {
      title: "Banding method",
      body: "On freshly washed damp natural leave-out: apply leave-in conditioner. Wrap hair ties or bands down the length of the leave-out starting close to the root. As hair dries under tension it elongates and straightens without heat.",
    },
    {
      title: "Smooth and blend when dry",
      body: "Once fully dry remove the bands. The leave-out should be elongated and smooth enough to blend with straight or wavy extensions without any heat. Use a little edge control or smoothing serum to finish.",
    },
    {
      title: "Maintain without re-wetting",
      body: "Avoid getting the banded section wet - this causes reversion and you would need to repeat the process.",
    },
  ];
}

export function generateExtensionBlendingContent(profile: {
  blend_method: string | null;
  natural_curl_type: string | null;
}): {
  showHeatMethod: boolean;
  showNoHeatMethod: boolean;
  heatSteps: BlendingStep[];
  noHeatSteps: BlendingStep[];
  preservingCurlPattern: { body: string; signs: string[] };
} {
  const method = profile.blend_method;
  const showHeatMethod = method ? HEAT_METHODS.has(method) : true;
  const showNoHeatMethod = method ? NO_HEAT_METHODS.has(method) : true;

  return {
    showHeatMethod,
    showNoHeatMethod,
    heatSteps: heatBlendingSteps(profile.natural_curl_type),
    noHeatSteps: noHeatBlendingSteps(),
    preservingCurlPattern: {
      body: "Deep condition your natural leave-out every week to restore moisture removed by heat. On days you are not wearing the wig, wash and allow your natural hair to revert to its curl pattern - this gives follicles a break from the repeated straightening cycle.",
      signs: [
        "Your hair is taking longer to revert after washing",
        "Your edges feel thin or sparse",
        "You see more shed hair than usual",
        "Your curl pattern looks looser in the blended section than before",
      ],
    },
  };
}
