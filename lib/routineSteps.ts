import { curlFamily } from "@/lib/compatibility";
import { getExtensionCareGuidance } from "@/lib/extensionCare";

export type RoutineStep = {
  title: string;
  body: string;
  why: string;
};

type Porosity = "low" | "medium" | "high";
type CurlType = "4a" | "4b" | "4c";

function normalizePorosity(porosity: string | null): Porosity {
  if (porosity === "low" || porosity === "high") return porosity;
  return "medium";
}

function normalizeCurlType(curlType: string | null): CurlType {
  if (curlType === "4a" || curlType === "4c") return curlType;
  return "4b";
}

const CURL_TYPE_DETANGLE: Record<CurlType, string> = {
  "4a": "Finger-detangle or use a wide-tooth comb from ends to roots -- your looser coil pattern separates fairly easily.",
  "4b": "Finger-detangle first, then follow with a wide-tooth comb from ends to roots to avoid disrupting your curl pattern.",
  "4c": "Finger-detangle in small sections before reaching for a comb -- your tighter zigzag pattern is the most prone to breakage at this step, so patience here saves length.",
};

const CURL_TYPE_DEFINITION: Record<CurlType, string> = {
  "4a": "A little product goes a long way on your looser curl pattern -- start light and layer up if you need more hold.",
  "4b": "Use a medium amount of product and distribute it in sections to reach every curl without overloading your roots.",
  "4c": "Your curl pattern shrinks the most, so apply product generously in small sections while hair is still soaking wet, before shrinkage locks moisture out.",
};

function chelateBody(waterHardness: string | null): string {
  if (waterHardness === "hard") {
    return "Use a chelating shampoo first, then your regular shampoo. Hard water leaves mineral deposits that build up on the hair shaft every wash -- clearing them monthly keeps your other products working the way they're supposed to.";
  }
  return "Use a chelating or clarifying shampoo first, then your regular shampoo. This clears product buildup and environmental residue that a regular shampoo alone won't fully remove.";
}

function chelateWhy(waterHardness: string | null): string {
  if (waterHardness === "hard") {
    return "Why: mineral buildup from hard water coats the cuticle and blocks moisture from getting in -- chelating removes it.";
  }
  return "Why: buildup coats the cuticle over time and blocks moisture from getting in -- a monthly chelating wash clears the slate.";
}

const POROSITY_PRE_POO: Record<Porosity, RoutineStep> = {
  low: {
    title: "Pre-poo -- 20 minutes before washing",
    body: "Apply a lightweight oil like jojoba or grapeseed to dry hair in sections. Cover with a plastic cap and gentle heat if you have it (a warm towel works). Your cuticle resists moisture, so warmth helps the oil get past that resistant outer layer.",
    why: "Why: low porosity hair's tight cuticle resists absorption -- a light oil and a little heat give the shampoo something to work with instead of just sitting on top.",
  },
  medium: {
    title: "Pre-poo -- 20-30 minutes before washing",
    body: "Apply a light-to-medium oil like sweet almond or grapeseed oil to dry hair in sections. Cover with a plastic cap. No heat needed -- your cuticle is balanced enough to let it absorb on its own.",
    why: "Why: a short pre-poo protects your baseline moisture during cleansing without the extra step of adding heat.",
  },
  high: {
    title: "Pre-poo -- 30 minutes before washing",
    body: "Apply Jamaican black castor oil or olive oil to dry hair in sections. Cover with a plastic cap. The oil barrier prevents moisture loss during cleansing.",
    why: "Why: high porosity cuticles strip easily during shampoo -- pre-pooing protects your baseline moisture.",
  },
};

const POROSITY_DEEP_CONDITION: Record<Porosity, RoutineStep> = {
  low: {
    title: "Deep condition -- with heat, every wash day",
    body: "Apply generously to soaking wet hair. Cover with a plastic cap and sit under a hooded dryer or heated cap for 20-30 minutes. Rinse with warm, not cold, water.",
    why: "Why: heat is what opens your resistant cuticle enough to let moisture in at all -- skip it and most of the product just sits on the surface.",
  },
  medium: {
    title: "Deep condition -- every wash day",
    body: "Apply generously to soaking wet hair. Cover with a plastic cap for 15-20 minutes; add heat if you have it on hand, but it isn't essential. Rinse with cool water to help hold moisture in.",
    why: "Why: your cuticle absorbs and retains moisture fairly evenly, so a shorter deep condition is enough most weeks.",
  },
  high: {
    title: "Deep condition -- with heat, every wash day",
    body: "Apply generously to soaking wet hair. Cover with a plastic cap and sit under a hooded dryer or heated cap for 30 minutes. Rinse with cool water.",
    why: "Why: heat forces moisture into high porosity gaps. The cool rinse temporarily seals the cuticle to hold it in.",
  },
};

const POROSITY_LEAVE_IN: Record<Porosity, { method: string; body: string; why: string }> = {
  low: {
    method: "LOC method",
    body: "Leave-in conditioner first, then a lightweight oil, then a cream moisturizer last. For low porosity hair, LOC works better than LCO -- the oil traps the liquid underneath before the heavier cream seals everything on top.",
    why: "Why: your cuticle is tight and slow to let anything in, so sealing in what little moisture gets through matters more than layering in more product.",
  },
  medium: {
    method: "LOC method",
    body: "Leave-in conditioner first, then a light oil, then a cream moisturizer to seal. This order works well for a balanced cuticle that neither resists moisture nor loses it too quickly.",
    why: "Why: layering liquid, then oil, then cream gives you moisture plus a stable seal without overloading your strands.",
  },
  high: {
    method: "LCO method",
    body: "Leave-in conditioner first, then cream moisturizer, then sealing oil last. For high porosity hair, LCO is more effective than LOC -- the cream fills cuticle gaps before the oil seals.",
    why: "Why: layering in this order creates three moisture barriers instead of one.",
  },
};

const POROSITY_SEAL_OIL: Record<Porosity, string> = {
  low: "a small amount of jojoba or grapeseed oil",
  medium: "a small amount of sweet almond oil or shea butter",
  high: "castor oil or shea butter",
};

// Coily (4a/4b/4c) routine -- the original porosity + curl-type + water-
// hardness driven generator this file was built around. Kept exactly as
// it was; only the entry point below now routes to it by curl family
// instead of always running it.
function generateCoilySteps(
  curlType: string | null,
  porosity: string | null,
  waterHardness: string | null
): RoutineStep[] {
  const p = normalizePorosity(porosity);
  const c = normalizeCurlType(curlType);

  const prePoo = POROSITY_PRE_POO[p];
  const deepCondition = POROSITY_DEEP_CONDITION[p];
  const leaveIn = POROSITY_LEAVE_IN[p];

  return [
    prePoo,
    {
      title: "Clarify or chelate -- Week 1 only",
      body: chelateBody(waterHardness),
      why: chelateWhy(waterHardness),
    },
    {
      title: deepCondition.title,
      body: `${deepCondition.body} ${CURL_TYPE_DETANGLE[c]}`,
      why: deepCondition.why,
    },
    {
      title: `Leave-in -- ${leaveIn.method} on soaking wet hair`,
      body: `${leaveIn.body} ${CURL_TYPE_DEFINITION[c]}`,
      why: leaveIn.why,
    },
    {
      title: "Seal ends -- every single night",
      body: `Apply ${POROSITY_SEAL_OIL[p]} to your ends before bed. Cover with a satin bonnet or satin pillowcase. This is your most important length retention habit.`,
      why: "Why: ends are the oldest, driest part of your hair. Nightly sealing is the difference between retaining length and constantly trimming.",
    },
  ];
}

// Straight/wavy/curly (types 1-3) and the "not sure" fallback are fixed
// step lists rather than porosity/water-hardness driven -- unlike coily,
// no per-porosity or per-water-hardness copy was specified for these, so
// each family gets one routine. Every step in a family shares that
// family's single key-principle "why," since that's the only rationale
// given for these lists (coily's per-step "why" copy doesn't apply here).

const STRAIGHT_WHY =
  "Why: straight hair is prone to looking flat and greasy -- everything should be lightweight and applied away from the scalp.";

const STRAIGHT_STEPS: RoutineStep[] = [
  {
    title: "Clarify -- every 1-2 weeks",
    body: "Clarifying shampoo every 1-2 weeks to prevent buildup.",
    why: STRAIGHT_WHY,
  },
  {
    title: "Condition -- mid-length to ends only",
    body: "Lightweight conditioner from mid-length to ends only -- avoid the roots.",
    why: STRAIGHT_WHY,
  },
  {
    title: "Deep condition -- only if needed",
    body: "Skip deep conditioning unless your hair is heat-damaged or color-treated.",
    why: STRAIGHT_WHY,
  },
  {
    title: "Dry & style",
    body: "Air dry, or blow dry on low heat with a round brush for volume.",
    why: STRAIGHT_WHY,
  },
  {
    title: "Refresh -- dry shampoo at the roots",
    body: "Use dry shampoo at the roots between washes to extend your style.",
    why: STRAIGHT_WHY,
  },
  {
    title: "Finish -- shine serum on ends",
    body: "Finish with a lightweight shine serum on ends only.",
    why: STRAIGHT_WHY,
  },
];

const WAVY_WHY =
  "Why: wavy hair needs moisture to form its pattern but goes limp with heavy products -- lightweight is everything, and technique matters as much as products.";

const WAVY_STEPS: RoutineStep[] = [
  {
    title: "Cleanse -- co-wash or gentle shampoo",
    body: "Co-wash or use a gentle, sulfate-free shampoo.",
    why: WAVY_WHY,
  },
  {
    title: "Condition -- scrunched in soaking wet",
    body: "Apply a lightweight conditioner, scrunching it in while hair is soaking wet.",
    why: WAVY_WHY,
  },
  {
    title: "Style -- curl cream or mousse, soaking wet",
    body: "Apply a curl cream or mousse while hair is soaking wet -- not just damp, soaking.",
    why: WAVY_WHY,
  },
  {
    title: "Scrunch out excess water",
    body: "Scrunch out excess water with a microfiber towel.",
    why: WAVY_WHY,
  },
  {
    title: "Dry -- diffuse or air dry",
    body: "Diffuse on low heat, or air dry without touching your hair.",
    why: WAVY_WHY,
  },
  {
    title: "Scrunch out the cast",
    body: "Once fully dry, scrunch out the cast.",
    why: WAVY_WHY,
  },
];

const CURLY_WHY =
  "Why: curly hair needs consistent moisture and definition -- the wash day technique determines how curls clump and how long the style lasts.";

const CURLY_STEPS: RoutineStep[] = [
  {
    title: "Cleanse -- sulfate-free or co-wash",
    body: "Sulfate-free shampoo or co-wash to cleanse.",
    why: CURLY_WHY,
  },
  {
    title: "Condition & detangle in the shower",
    body: "Apply a generous conditioner and finger-detangle in the shower.",
    why: CURLY_WHY,
  },
  {
    title: "Deep condition -- weekly",
    body: "Deep condition weekly.",
    why: CURLY_WHY,
  },
  {
    title: "Style -- leave-in and curl cream, soaking wet",
    body: "Apply leave-in and curl cream on soaking wet hair, working in sections.",
    why: CURLY_WHY,
  },
  {
    title: "Smooth with the praying hands method",
    body: "Use the praying hands method to smooth products through each section.",
    why: CURLY_WHY,
  },
  {
    title: "Dry -- diffuse or air dry",
    body: "Diffuse or air dry.",
    why: CURLY_WHY,
  },
  {
    title: "Refresh -- day 2-3",
    body: "Refresh with water and a small amount of leave-in on day 2-3.",
    why: CURLY_WHY,
  },
];

// Used when curl_type is "not sure"/"not_sure", unset, or unrecognized --
// curlFamily() returns null in all of those cases. Medium-porosity,
// texture-agnostic guidance rather than a full 5-7 step routine, since
// there's no curl-type or porosity signal to personalize further.
const GENERIC_FALLBACK_WHY =
  "Why: without a known curl type, this keeps your routine safe and balanced for any hair texture.";

const GENERIC_FALLBACK_STEPS: RoutineStep[] = [
  {
    title: "Cleanse",
    body: "Focus on moisture and gentle cleansing.",
    why: GENERIC_FALLBACK_WHY,
  },
  {
    title: "Deep condition -- weekly",
    body: "Deep condition weekly.",
    why: GENERIC_FALLBACK_WHY,
  },
  {
    title: "Apply products on wet hair",
    body: "Apply products on wet hair.",
    why: GENERIC_FALLBACK_WHY,
  },
  {
    title: "Seal ends -- nightly",
    body: "Seal ends nightly.",
    why: GENERIC_FALLBACK_WHY,
  },
];

export function generateRoutineSteps(
  curlType: string | null,
  porosity: string | null,
  waterHardness: string | null,
  extensions: string | null = null,
  extensionType: string[] | null = null,
  extensionCare: string | null = null
): RoutineStep[] {
  const family = curlFamily(curlType);

  let steps: RoutineStep[];
  if (family === "straight") steps = STRAIGHT_STEPS;
  else if (family === "wavy") steps = WAVY_STEPS;
  else if (family === "curly") steps = CURLY_STEPS;
  else if (family === "coily") steps = generateCoilySteps(curlType, porosity, waterHardness);
  else steps = GENERIC_FALLBACK_STEPS;

  if (extensions === "yes") {
    steps = [...steps, getExtensionCareGuidance(extensionType, extensionCare)];
  }

  return steps;
}
