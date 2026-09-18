import { curlFamily } from "@/lib/compatibility";
import { getExtensionCareGuidance } from "@/lib/extensionCare";
import { getChildSafetyStep } from "@/lib/childSafety";
import { isAdultAgeAtLeast } from "@/lib/ageRange";

// Legacy flat-list shape - still used by the additive notes below
// (age-aware/thinning/color-treated/child-safety/extension-care), which
// apply regardless of which wash day the user is looking at and are
// shown separately from the four wash-day accordions rather than forced
// into one of them.
export type RoutineStep = {
  title: string;
  body: string;
  why: string;
};

// One step within a wash-day sequence. `why` and `timerMinutes` are
// optional - most steps in the spec this was built from only have body
// text, a handful add a one-sentence rationale, and only protein/deep-
// conditioner steps carry a processing time. `productCategory` matches
// RoutineProductPick.category (see lib/routineProducts.ts) so the
// /routine page can link a step directly to the user's actual curated
// pick for that category ("Your deep conditioner: [product] - X/100").
// `toolIds` matches HairTool.id (see lib/toolsData.ts) the same way, for
// steps that call for a specific tool (a hooded dryer, a wide tooth
// comb) - only populated for coily steps so far (see COILY_* below).
export type RoutineStepDetail = {
  title: string;
  body: string;
  why: string | null;
  timerMinutes: string | null;
  productCategory: string | null;
  toolIds: string[] | null;
};

export type WashDayKey = "clarifying" | "regular" | "protein" | "between";

export type WashDaySteps = {
  key: WashDayKey;
  label: string;
  steps: RoutineStepDetail[];
};

function step(
  title: string,
  body: string,
  why: string | null = null,
  timerMinutes: string | null = null,
  productCategory: string | null = null,
  toolIds: string[] | null = null
): RoutineStepDetail {
  return { title, body, why, timerMinutes, productCategory, toolIds };
}

// ---- Straight (1a/1b/1c) --------------------------------------------------

const STRAIGHT_CLARIFYING: RoutineStepDetail[] = [
  step(
    "Clarifying shampoo",
    "Apply clarifying or chelating shampoo to wet scalp and lengths. Massage thoroughly for 2-3 minutes. Rinse completely. This removes hard water minerals, product buildup, and anything blocking your other products from working. Use only on your designated clarifying day.",
    "Hard water and product buildup coat the hair shaft and prevent conditioners and treatments from penetrating.",
    null,
    "clarifying-shampoo"
  ),
  step(
    "Conditioner",
    "Apply conditioner from mid-lengths to ends only. Never apply to roots or scalp on straight hair - this causes the flat, oily look within hours. Leave 3-5 minutes, rinse thoroughly.",
    "Straight hair distributes scalp oil quickly - conditioner at the roots adds unnecessary weight and grease.",
    null,
    "conditioner"
  ),
  step(
    "Heat protectant",
    "Apply heat protectant evenly to damp hair before any heat tool. Look for silicones or film-forming agents that create a barrier. For fine 1b hair use a spray formula - creams add weight.",
    "Fine straight hair burns at lower temperatures than coily hair. Always protect before blow drying or flat ironing.",
    null,
    "heat-protectant"
  ),
  step(
    "Blow dry or air dry",
    "For volume: rough dry with a brush lifting at the roots. For smooth finish: use a round brush pulling tension downward. Keep dryer moving - never hold in one spot.",
    "Tension while drying is what creates smoothness on straight hair."
  ),
  step(
    "Finishing serum",
    "Apply 1-2 drops of lightweight finishing serum or oil to DRY hair at ends only. Run through ends to add shine and control static. Never apply to roots.",
    "Serum on roots causes immediate grease. Ends need the most moisture as the oldest part of the hair.",
    null,
    "oil"
  ),
];

const STRAIGHT_REGULAR: RoutineStepDetail[] = [
  step(
    "Shampoo - scalp focus",
    "Apply shampoo to wet scalp, not lengths. Massage scalp with fingertip pads for 60 seconds. Let product rinse through lengths - do not scrub lengths directly.",
    "Straight hair lengths are fragile when wet. Scalp is where oil and buildup accumulate.",
    null,
    "shampoo"
  ),
  { ...STRAIGHT_CLARIFYING[1], title: "Conditioner - ends to mid-lengths only" },
  STRAIGHT_CLARIFYING[2],
  step(
    "Style",
    "Style as desired. For volume: blow dry with round brush or volumizing mousse. For sleek: blow dry with tension downward. For waves: scrunch in texturizing spray while damp and air dry."
  ),
  STRAIGHT_CLARIFYING[4],
];

const STRAIGHT_PROTEIN: RoutineStepDetail[] = [
  step(
    "Clarifying shampoo first",
    "Always clarify before a protein treatment - buildup prevents protein from penetrating the hair shaft.",
    null,
    null,
    "clarifying-shampoo"
  ),
  step(
    "Protein treatment application",
    "Apply protein treatment from roots to ends on clean damp hair. For fine straight hair choose a lightweight protein treatment (Olaplex No.3, bond repair treatments) rather than a heavy reconstructor. Process for the time specified on the product - usually 10-30 minutes.",
    "Fine straight hair is prone to protein overload - use lighter protein treatments and never exceed the recommended processing time.",
    "10-30 minutes",
    "protein-treatment"
  ),
  step(
    "Rinse thoroughly",
    "Rinse protein treatment completely with warm water. Incomplete rinsing causes stiffness and breakage."
  ),
  step(
    "Deep conditioner immediately after (non-negotiable)",
    "ALWAYS follow protein with moisture. Apply deep conditioner immediately after rinsing protein treatment. Process 15-20 minutes. Protein without immediate moisture causes brittleness.",
    "Protein temporarily contracts the hair shaft - moisture restores elasticity so hair doesn't snap.",
    "15-20 minutes",
    "deep-conditioner"
  ),
  step(
    "Heat protectant and style as usual",
    "Apply heat protectant and style as you would on a regular wash day.",
    null,
    null,
    "heat-protectant"
  ),
];

const STRAIGHT_BETWEEN: RoutineStepDetail[] = [
  step(
    "Dry shampoo at roots",
    "Apply dry shampoo only at roots - hold can 6-8 inches away and spray in sections. Massage in with fingertips, wait 2 minutes for absorption, then brush or shake out excess.",
    "Roots are where oil accumulates on straight hair. Dry shampoo absorbs oil and adds volume without getting the hair wet.",
    null,
    "dry-shampoo"
  ),
  step(
    "Refresh ends",
    "Apply 1 drop of lightweight serum or oil to ends only to prevent static and maintain shine.",
    null,
    null,
    "oil"
  ),
  step(
    "Restyle",
    "Curl with a large barrel iron for waves, re-straighten any pieces that have fallen, or pull into a style. Second-day straight hair often holds styles better than freshly washed hair."
  ),
];

// ---- Wavy (2a/2b/2c) -------------------------------------------------------

const WAVY_CLARIFYING: RoutineStepDetail[] = [
  step(
    "Clarifying shampoo",
    "Wet hair thoroughly. Apply clarifying shampoo to scalp and lengths. Scrub scalp well - wavy hair accumulates silicone buildup from styling products that blocks wave definition over time.",
    "Silicones in mousses and gels build up and make waves go limp. Monthly clarifying removes this.",
    null,
    "clarifying-shampoo"
  ),
  step(
    "Conditioner - detangle in shower",
    "Apply conditioner generously to soaking wet hair. Using a wide tooth comb or fingers, detangle gently from ends to roots while conditioner is in. Rinse with cool water.",
    "Wavy hair tangles easily when wet. Detangling with conditioner in provides slip and prevents breakage.",
    null,
    "conditioner"
  ),
  step(
    "Leave-in on soaking wet hair",
    "Do not towel dry. Apply leave-in conditioner to soaking wet hair by scrunching upward. The water in your hair is part of the styling process - it activates your wave pattern.",
    "Wavy hair must be styled soaking wet. Damp or dry application kills the wave pattern.",
    null,
    "leave-in"
  ),
  step(
    "Mousse or light hold gel",
    "Scrunch mousse or light hold gel upward into soaking wet hair in sections. Use more product than you think you need - it dries down significantly.",
    "Mousse and light hold gel define the wave pattern and prevent frizz as hair dries.",
    null,
    "mousse"
  ),
  step(
    "Diffuse or air dry (no touching)",
    "Diffuse on low heat with a diffuser attachment scrunching upward. Or air dry completely without touching. Touching wavy hair while wet causes frizz.",
    "Wave pattern forms as hair dries. Any friction disrupts the curl clumping."
  ),
  step(
    "Scrunch out the cast",
    "Once hair is COMPLETELY dry, scrunch firmly upward with hands to break the product cast and release soft defined waves.",
    "The stiff cast from gel/mousse protects waves as they dry. Breaking it after drying reveals soft waves, not hard crunchy ones."
  ),
];

const WAVY_REGULAR: RoutineStepDetail[] = [
  step(
    "Sulfate-free shampoo or co-wash",
    "Wet hair thoroughly. Apply sulfate-free shampoo or co-wash to scalp and lengths. Scrub scalp well.",
    "Sulfate-free cleansing removes buildup and oil without stripping the moisture your wave pattern needs.",
    null,
    "shampoo"
  ),
  WAVY_CLARIFYING[1],
  WAVY_CLARIFYING[2],
  WAVY_CLARIFYING[3],
  WAVY_CLARIFYING[4],
  WAVY_CLARIFYING[5],
];

const WAVY_PROTEIN: RoutineStepDetail[] = [
  step(
    "Clarifying shampoo",
    "Apply clarifying shampoo to scalp and lengths, then rinse completely. Always clarify before a protein treatment - buildup prevents protein from penetrating the hair shaft.",
    null,
    null,
    "clarifying-shampoo"
  ),
  step(
    "Protein treatment - 20-30 min",
    "For 2a-2c wavy hair: use a lightweight protein treatment. Wavy hair is easily over-proteined causing stiffness. Olaplex or a hydrolyzed silk protein treatment works better than a heavy reconstructor.",
    null,
    "20-30 minutes",
    "protein-treatment"
  ),
  step("Rinse", "Rinse protein treatment completely with warm water."),
  step(
    "Deep conditioner immediately",
    "Apply deep conditioner immediately after rinsing the protein treatment. Protein without immediate moisture causes brittleness and stiffness.",
    null,
    null,
    "deep-conditioner"
  ),
  step(
    "Style with mousse as usual",
    "Style with mousse or light hold gel as you would on a regular wash day.",
    null,
    null,
    "mousse"
  ),
];

const WAVY_BETWEEN: RoutineStepDetail[] = [
  step("Mist with water", "Lightly mist hair with water in sections."),
  step(
    "Scrunch in leave-in or refresher",
    "Scrunch a small amount of leave-in conditioner or curl refresher spray upward. Do not rake through.",
    null,
    null,
    "leave-in"
  ),
  step(
    "Diffuse briefly or air dry",
    "Diffuse for 5-10 minutes on low to revive the wave pattern. Or air dry."
  ),
];

// ---- Curly (3a/3b/3c) ------------------------------------------------------

const CURLY_CHELATING: RoutineStepDetail[] = [
  step(
    "Chelating shampoo in sections",
    "Divide hair into 4 sections. Apply chelating shampoo to scalp and lengths of each section. Massage thoroughly. Rinse each section before moving to the next.",
    "Working in sections on curly hair prevents severe tangling during washing.",
    null,
    "clarifying-shampoo"
  ),
  step(
    "Detangle - critical step",
    "Apply detangler or conditioner generously to one section of wet hair. Using a wide tooth comb, detangle from ends to roots - never from roots to ends. Work through each knot gently. Repeat for all sections.",
    "Curly hair tangles significantly when wet. Detangling with conditioner slip prevents breakage. Always ends to roots - starting at roots causes knots to pack tighter.",
    null,
    "detangler"
  ),
  step(
    "Deep conditioner with heat",
    "Apply deep conditioner generously to all sections. Cover with a plastic cap and sit under a hooded dryer or heated cap for 30 minutes.",
    "Heat opens the cuticle and forces moisture into the hair shaft. Curly hair loses moisture faster than straight hair and needs this regularly.",
    "30 minutes",
    "deep-conditioner"
  ),
  step(
    "Cool rinse",
    "Rinse with the coolest water you can tolerate. The cool water temporarily seals the cuticle and helps define curl clumping."
  ),
  step(
    "Leave-in on soaking wet hair",
    "Apply leave-in conditioner to soaking wet sectioned hair. Use the prayer hands method - smooth product over the hair shaft rather than scrunching. This reduces frizz on 3a-3c hair.",
    null,
    null,
    "leave-in"
  ),
  step(
    "Curl cream",
    "Apply curl cream over the leave-in in sections, scrunching upward to encourage curl clumping.",
    null,
    null,
    "curl-cream"
  ),
  step(
    "Gel to seal",
    "Apply gel over curl cream in each section, scrunching upward. The gel creates a cast that protects curl definition as hair dries.",
    null,
    null,
    "gel"
  ),
  step(
    "Diffuse or air dry",
    "Diffuse on low heat using a diffuser attachment, scrunching sections upward. Or air dry completely without touching."
  ),
];

const CURLY_REGULAR: RoutineStepDetail[] = [
  step(
    "Sulfate-free shampoo or co-wash in sections",
    "Divide hair into 4 sections. Apply sulfate-free shampoo or co-wash to scalp and lengths of each section. Massage thoroughly. Rinse each section before moving to the next.",
    "Sulfate-free cleansing removes buildup and oil without stripping the moisture curly hair depends on.",
    null,
    "shampoo"
  ),
  CURLY_CHELATING[1],
  CURLY_CHELATING[2],
  CURLY_CHELATING[3],
  CURLY_CHELATING[4],
  CURLY_CHELATING[5],
  CURLY_CHELATING[6],
  CURLY_CHELATING[7],
];

const CURLY_PROTEIN: RoutineStepDetail[] = [
  step(
    "Chelating shampoo",
    "Divide hair into sections and apply chelating shampoo to scalp and lengths, rinsing each section before moving to the next.",
    null,
    null,
    "clarifying-shampoo"
  ),
  step(
    "Detangle in sections",
    "Apply conditioner to one wet section at a time and detangle from ends to roots with a wide tooth comb before moving to the next section.",
    null,
    null,
    "conditioner"
  ),
  step(
    "Protein treatment - 20-30 min with heat",
    "Apply protein treatment generously to all sections under a plastic cap. Use a heated cap or sit under a hooded dryer for 20-30 minutes for maximum penetration.",
    null,
    "20-30 minutes",
    "protein-treatment"
  ),
  step("Rinse thoroughly", "Rinse protein treatment completely with warm water."),
  step(
    "Deep conditioner immediately (non-negotiable)",
    "ALWAYS follow protein with a deep conditioning treatment on curly hair. Process 30 minutes with heat.",
    "Protein stiffens the curl pattern temporarily. Immediate deep conditioning restores softness and elasticity so curls don't break.",
    "30 minutes",
    "deep-conditioner"
  ),
  step("Cool rinse", "Rinse with cool water to seal the cuticle and lock in moisture."),
  step(
    "Style with LCO method as usual",
    "Style with the LCO method (leave-in, cream, oil) as you would on a regular wash day.",
    null,
    null,
    "leave-in"
  ),
];

const CURLY_BETWEEN: RoutineStepDetail[] = [
  step(
    "Pineapple or protect overnight",
    "At night: gather curls into a loose high puff (pineapple) secured with a scrunchie. Cover with a satin bonnet or sleep on a satin pillowcase."
  ),
  step(
    "Morning refresh",
    "Release the pineapple. Mist curls with water mixed with a small amount of leave-in conditioner.",
    null,
    null,
    "leave-in"
  ),
  step(
    "Scrunch and reshape",
    "Scrunch upward to reshape curls. Apply a small amount of gel to any frizzy areas.",
    null,
    null,
    "gel"
  ),
  step("Diffuse briefly or air dry", "Diffuse briefly on low heat, or air dry."),
];

// ---- Coily (4a/4b/4c) ------------------------------------------------------

const COILY_CHELATING: RoutineStepDetail[] = [
  step(
    "Pre-poo",
    "Apply a generous amount of oil (castor oil, olive oil, or a pre-poo conditioner) to dry hair in sections. Cover with a plastic cap and leave for 30 minutes minimum - up to overnight.",
    "The oil barrier prevents moisture loss during shampooing and reduces the harshness of the cleanser on coily hair. This is the most protective step in a 4c routine.",
    "30 minutes minimum"
  ),
  step(
    "Chelating shampoo in sections",
    "Section hair into 4-6 sections with large clips before getting in the shower. Apply chelating shampoo to scalp and lengths of one section at a time. Massage thoroughly. Rinse before moving to the next section.",
    "Working in sections on 4c hair prevents severe knot formation during washing.",
    null,
    "clarifying-shampoo",
    ["sectioning-clips"]
  ),
  step(
    "Sulfate-free shampoo second pass (optional)",
    "A second pass with a gentle sulfate-free shampoo after chelating removes any remaining chelating shampoo residue and adds a conditioning boost.",
    null,
    null,
    "shampoo"
  ),
  step(
    "Detangle in sections - critical",
    "Apply conditioner or detangler generously to one wet section. Start with fingers to separate large knots, then a wide tooth comb, then a detangling brush if needed. Always ends to roots. Never dry. Work through knots patiently - never force a comb through a knot. Repeat for all sections.",
    "4b and 4c hair has the tightest curl pattern and shrinks significantly when wet, causing severe tangling. This step prevents the breakage that causes slow hair growth.",
    null,
    "detangler",
    ["wide-tooth-comb", "detangling-brush"]
  ),
  step(
    "Deep conditioner with heat",
    "Apply deep conditioner generously to all sections. Cover with a plastic cap and use a hooded dryer or heated cap for 30-45 minutes for maximum penetration. No hooded dryer? A heated cap works just as well.",
    "4c hair has the most tightly closed cuticle of any hair type. Heat is essential to force moisture into the shaft - without heat, conditioner sits on top without penetrating.",
    "30-45 minutes",
    "deep-conditioner",
    ["hooded-dryer", "heated-cap"]
  ),
  step(
    "Cool rinse",
    "Rinse with cool water to temporarily seal the cuticle and lock in moisture from the deep conditioner."
  ),
  step(
    "LCO method on soaking wet hair",
    "Apply in this exact sequence on soaking wet sectioned hair: Leave-in conditioner - apply generously, smooth over hair shaft with hands. Cream moisturizer - apply over leave-in, seal in the moisture layer. Sealing oil - apply last, seals everything underneath and prevents moisture evaporation.",
    "The LCO method creates three moisture barriers instead of one. The oil must go last - applied first it blocks water and other products from absorbing. This is the single most impactful styling technique for high porosity 4c hair.",
    null,
    "leave-in"
  ),
  step(
    "Styler - gel or curl cream",
    "Apply gel or curl cream over the LCO in sections, scrunching upward or shingling for definition.",
    null,
    null,
    "curl-cream"
  ),
  step(
    "Dry under hooded dryer or diffuse",
    "Sit under a hooded dryer for 45-60 minutes OR diffuse on low heat. 4c hair takes significantly longer to dry than other types - patience prevents frizz from touching wet hair.",
    null,
    "45-60 minutes"
  ),
];

const COILY_REGULAR: RoutineStepDetail[] = [
  {
    ...COILY_CHELATING[0],
    title: "Pre-poo (optional but recommended)",
  },
  step(
    "Sulfate-free shampoo in sections",
    "Section hair into 4-6 sections with large clips before getting in the shower. Apply sulfate-free shampoo to scalp and lengths of one section at a time. Massage thoroughly. Rinse before moving to the next section.",
    "Regular wash days use a gentle sulfate-free cleanser instead of a chelating one, since there's no heavy buildup to strip yet.",
    null,
    "shampoo",
    ["sectioning-clips"]
  ),
  COILY_CHELATING[3],
  COILY_CHELATING[4],
  COILY_CHELATING[5],
  COILY_CHELATING[6],
  COILY_CHELATING[7],
  COILY_CHELATING[8],
];

const COILY_PROTEIN: RoutineStepDetail[] = [
  COILY_CHELATING[0],
  step(
    "Clarifying shampoo",
    "Section hair into 4-6 sections with large clips before getting in the shower. Apply clarifying shampoo to scalp and lengths of each section, rinsing before moving to the next.",
    null,
    null,
    "clarifying-shampoo",
    ["sectioning-clips"]
  ),
  step(
    "Detangle in sections",
    "Apply conditioner or detangler generously to one wet section. Start with fingers to separate large knots, then a wide tooth comb, then a detangling brush if needed. Always ends to roots. Never dry. Repeat for all sections.",
    null,
    null,
    "conditioner",
    ["wide-tooth-comb", "detangling-brush"]
  ),
  step(
    "Protein treatment - 30-45 min with heat",
    "Apply protein treatment to all sections. Cover with plastic cap under hooded dryer for 30-45 min. For 4c hair experiencing breakage use a stronger protein treatment (Aphogee Two Step) quarterly.",
    null,
    "30-45 minutes",
    "protein-treatment",
    ["hooded-dryer"]
  ),
  step("Rinse", "Rinse protein treatment completely with warm water."),
  step(
    "Deep conditioner immediately - non-negotiable",
    "This step cannot be skipped on 4b and 4c hair. Apply deep conditioner immediately after rinsing protein and use a hooded dryer or heated cap for 30-45 minutes for maximum penetration. No hooded dryer? A heated cap works just as well.",
    "4c hair is the most protein-sensitive of all curl types. Protein without immediate and thorough moisture causes severe brittleness and snapping. This is the most common cause of 4c hair damage.",
    "30-45 minutes",
    "deep-conditioner",
    ["hooded-dryer", "heated-cap"]
  ),
  step("Cool rinse", "Rinse with cool water to seal the cuticle and lock in moisture."),
  COILY_CHELATING[6],
  step(
    "Style",
    "Apply gel or curl cream to style as you would on a regular wash day.",
    null,
    null,
    "curl-cream"
  ),
];

const COILY_BETWEEN: RoutineStepDetail[] = [
  step(
    "Satin protection every night",
    "Before bed: loose pineapple, two-strand twist, or flat twist your hair. Cover with a satin bonnet. Sleep on a satin pillowcase as backup.",
    "Cotton pillowcases absorb moisture from 4c hair overnight causing dryness. Satin reduces friction and retains moisture."
  ),
  step(
    "Seal ends every morning",
    "Every morning apply a small amount of sealing oil to your ends. This is the single most important length retention habit for 4c hair.",
    "Ends are the oldest and driest part of the hair. Daily sealing is the difference between retaining length and constantly trimming.",
    null,
    "oil"
  ),
  step(
    "Moisture check",
    "Press a small section of hair between your fingers. If it feels dry or crunchy, mist lightly with water and apply a small amount of leave-in conditioner."
  ),
  step(
    "Refresh if needed",
    "For defined styles: mist with water, scrunch in curl cream or refresher, re-seal with oil.",
    null,
    null,
    "curl-cream"
  ),
];

const WASH_DAY_LABELS: Record<WashDayKey, string> = {
  clarifying: "Clarifying/Chelating wash day",
  regular: "Regular wash day",
  protein: "Protein treatment day",
  between: "Between wash days",
};

function buildWashDaySteps(
  clarifying: RoutineStepDetail[],
  regular: RoutineStepDetail[],
  protein: RoutineStepDetail[],
  between: RoutineStepDetail[]
): WashDaySteps[] {
  return [
    { key: "clarifying", label: WASH_DAY_LABELS.clarifying, steps: clarifying },
    { key: "regular", label: WASH_DAY_LABELS.regular, steps: regular },
    { key: "protein", label: WASH_DAY_LABELS.protein, steps: protein },
    { key: "between", label: WASH_DAY_LABELS.between, steps: between },
  ];
}

const STRAIGHT_WASH_DAYS = buildWashDaySteps(
  STRAIGHT_CLARIFYING,
  STRAIGHT_REGULAR,
  STRAIGHT_PROTEIN,
  STRAIGHT_BETWEEN
);
const WAVY_WASH_DAYS = buildWashDaySteps(WAVY_CLARIFYING, WAVY_REGULAR, WAVY_PROTEIN, WAVY_BETWEEN);
const CURLY_WASH_DAYS = buildWashDaySteps(
  CURLY_CHELATING,
  CURLY_REGULAR,
  CURLY_PROTEIN,
  CURLY_BETWEEN
);
const COILY_WASH_DAYS = buildWashDaySteps(
  COILY_CHELATING,
  COILY_REGULAR,
  COILY_PROTEIN,
  COILY_BETWEEN
);

// Texture-agnostic fallback for "not sure"/unset curl types - one
// generic sequence reused for all four wash-day slots, since there's no
// curl-type signal to differentiate clarifying/protein/between routines
// meaningfully.
const GENERIC_FALLBACK_STEPS: RoutineStepDetail[] = [
  step("Cleanse", "Focus on moisture and gentle cleansing.", null, null, "shampoo"),
  step("Deep condition - weekly", "Deep condition weekly.", null, null, "deep-conditioner"),
  step("Apply products on wet hair", "Apply leave-in and styling products on wet hair.", null, null, "leave-in"),
  step("Seal ends - nightly", "Seal ends nightly with a lightweight oil.", null, null, "oil"),
];
const GENERIC_FALLBACK_WASH_DAYS = buildWashDaySteps(
  GENERIC_FALLBACK_STEPS,
  GENERIC_FALLBACK_STEPS,
  GENERIC_FALLBACK_STEPS,
  GENERIC_FALLBACK_STEPS
);

// Main entry point - four full step sequences (clarifying/regular/
// protein/between), one per wash-day type, for the profile's curl
// family. Replaces the old single flat list entirely.
export function generateRoutineStepsByWashType(curlType: string | null): WashDaySteps[] {
  const family = curlFamily(curlType);
  if (family === "straight") return STRAIGHT_WASH_DAYS;
  if (family === "wavy") return WAVY_WASH_DAYS;
  if (family === "curly") return CURLY_WASH_DAYS;
  if (family === "coily") return COILY_WASH_DAYS;
  return GENERIC_FALLBACK_WASH_DAYS;
}

// ---- Additive profile-level notes -----------------------------------------
//
// These apply regardless of which wash day the user is looking at (age/
// thinning/color-treated/child-safety/extension-care), so they're kept
// as their own list shown once above the four wash-day accordions
// rather than folded into one specific day's sequence.

// Additive - appends age-aware notes on top of the underlying routine.
// Each threshold's note stacks on top of the ones below it (a 65_plus
// profile gets all three), since each addresses a different, still-
// relevant concern as hair continues to change with age.
export function getAgeAwareRoutineStep(
  ageRange: string | null
): RoutineStep | null {
  const notes: string[] = [];

  if (isAdultAgeAtLeast(ageRange, "36_45")) {
    notes.push(
      "As hair changes with age, pay attention to signs of thinning or texture changes. Scalp massage during wash day stimulates circulation. Consider adding rosemary oil to your routine - clinical studies show it performs comparably to minoxidil for some types of hair thinning."
    );
  }
  if (isAdultAgeAtLeast(ageRange, "46_55")) {
    notes.push(
      "Hormonal changes can significantly affect hair texture, density, and scalp oil production. If you're noticing significant changes, consider consulting a trichologist or dermatologist alongside your Qoyl routine."
    );
  }
  if (ageRange === "65_plus") {
    notes.push(
      "Hair becomes more fragile with age - avoid harsh physical manipulation, use a wide-tooth comb only, and prioritize moisture and ceramide-rich products. Protective styling reduces mechanical stress on fragile strands."
    );
  }

  if (notes.length === 0) return null;

  return {
    title: "Age-Aware Care",
    body: notes.join(" "),
    why: "Why: hair texture, density, and scalp health shift with age - these adjustments help your routine keep pace.",
  };
}

// Additive - appended when "thinning" is one of the user's selected
// hair_concerns (see CONCERN_OPTIONS in app/profile/page.tsx),
// regardless of curl type or age.
export function getThinningHairRoutineStep(
  hairConcerns: string[] | null
): RoutineStep | null {
  if (!hairConcerns?.includes("thinning")) return null;

  return {
    title: "Thinning Hair Care",
    body: "Scalp massage for 4 minutes during wash day has clinical evidence supporting hair growth stimulation. Use the pads of your fingers, not your nails.",
    why: "Why: massage increases blood flow to hair follicles, which is linked to improved hair growth in clinical studies.",
  };
}

// Additive - appended when color_treated is "yes" (see
// app/profile/page.tsx's colorTreated state), regardless of curl type
// or porosity. The scoring-side effects of color treatment (the
// porosity override and per-ingredient nudges) live in
// lib/compatibility.ts; this is just the routine-step guidance half.
export function getColorTreatedRoutineStep(
  colorTreated: string | null
): RoutineStep | null {
  if (colorTreated !== "yes") return null;

  return {
    title: "Color-Treated Hair Care",
    body: "Wash with cool or cold water only - hot water opens the cuticle and accelerates color fade. Use a color-safe sulfate-free shampoo exclusively. Deep condition every wash day, not weekly - color treatment removes moisture and protein with every process.",
    why: "Why: color treatment chemically opens the cuticle, so color-treated hair loses moisture and protein - and fades - faster than your natural state.",
  };
}

// Collects every additive note that applies to this profile, in a
// stable order. Returned separately from generateRoutineStepsByWashType
// - see app/api/routine/route.ts and app/routine/page.tsx for how the
// two are combined on the page.
export function generateAdditionalRoutineNotes(
  extensions: string | null,
  extensionType: string[] | null,
  extensionCare: string | null,
  profileFor: string | null,
  adultAgeRange: string | null,
  hairConcerns: string[] | null,
  colorTreated: string | null
): RoutineStep[] {
  const notes: RoutineStep[] = [];

  if (extensions === "yes") {
    notes.push(getExtensionCareGuidance(extensionType, extensionCare));
  }

  const childSafetyStep = getChildSafetyStep(profileFor);
  if (childSafetyStep) notes.push(childSafetyStep);

  const ageAwareStep = getAgeAwareRoutineStep(adultAgeRange);
  if (ageAwareStep) notes.push(ageAwareStep);

  const thinningHairStep = getThinningHairRoutineStep(hairConcerns);
  if (thinningHairStep) notes.push(thinningHairStep);

  const colorTreatedStep = getColorTreatedRoutineStep(colorTreated);
  if (colorTreatedStep) notes.push(colorTreatedStep);

  return notes;
}
