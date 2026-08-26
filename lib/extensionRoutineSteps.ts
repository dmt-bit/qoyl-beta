// TAB 1 content generator ("My Extensions / Wig Care") - see
// ExtensionRoutine.tsx for TAB 2 (natural hair underneath) and TAB 3
// (blending), which live in extensionNaturalHairRoutine.ts and
// extensionBlendingRoutine.ts respectively since each is a fairly
// self-contained content set.

export type ExtensionRoutineStep = {
  title: string;
  body: string;
  why?: string;
};

export type RoutineBlock =
  | { type: "steps"; heading: string; frequency?: string; steps: ExtensionRoutineStep[] }
  | { type: "note"; heading: string; body: string }
  | { type: "warning"; heading: string; items: string[] };

type ExtensionCareProfile = {
  extension_types: string[];
  extension_texture: string | null;
  uses_adhesive: boolean;
};

const WIG_TYPES = new Set(["wig_lace_front", "wig_full_lace", "wig_360", "wig_glueless"]);

function isSyntheticTexture(texture: string | null): boolean {
  return texture === "synthetic";
}
function isHumanTexture(texture: string | null): boolean {
  return texture === "human_straight" || texture === "human_wavy" || texture === "human_curly";
}

// ---- Wigs -------------------------------------------------------------

function wigWashSteps(texture: string | null): ExtensionRoutineStep[] {
  const synthetic = isSyntheticTexture(texture);
  const human = isHumanTexture(texture) || texture === "blended" || texture === "heat_resistant_synthetic";

  const steps: ExtensionRoutineStep[] = [
    {
      title: "Detangle before washing",
      body: "Before getting the wig wet, gently detangle with a wide tooth comb or wig brush starting from ends and working toward the cap. Never detangle a wet synthetic wig - it stretches and damages the fibers permanently.",
    },
    {
      title: "Fill sink with cool water",
      body: "Use cool or lukewarm water - never hot. Hot water loosens lace knots and can cause shedding. Add a small amount of wig shampoo or gentle sulfate-free shampoo.",
    },
    {
      title: "Wash in one direction",
      body: synthetic
        ? "Submerge the wig and gently squeeze water through in one direction - from cap to ends. Never scrub, rub, or use circular motions - this causes tangling and matting that cannot be undone. Synthetic fibers melt with heat and tangle with friction - gentle is everything."
        : "Submerge the wig and gently squeeze water through in one direction - from cap to ends. Never scrub, rub, or use circular motions - this causes tangling and matting that cannot be undone. Massage shampoo gently into the hair following the hair shaft direction.",
    },
    {
      title: "Rinse thoroughly",
      body: "Hold the wig under cool running water and rinse in one direction from cap to ends until water runs completely clear. Product residue left behind causes dullness and matting.",
    },
  ];

  if (human) {
    steps.push({
      title: "Condition (human hair only)",
      body: "Apply conditioner from mid-length to ends only - never on the lace or knots. Leave 5-10 minutes. Rinse completely.",
    });
  } else {
    steps.push({
      title: "Condition (human hair only)",
      body: "NEVER condition synthetic hair - conditioner causes synthetic fibers to become permanently limp and lose their style pattern.",
    });
  }

  steps.push(
    {
      title: "Pat dry gently",
      body: "Gently squeeze excess water out - never wring or twist. Lay flat on a clean towel and pat dry. Never rub with a towel.",
    },
    {
      title: "Air dry on a wig stand",
      body: synthetic
        ? "Place on a wig stand to maintain the shape of the cap while drying. Never use a hair dryer on synthetic hair."
        : "Place on a wig stand to maintain the shape of the cap while drying. Human hair can be blow dried on low heat only after applying heat protectant.",
    }
  );

  return steps;
}

function wigBlocks(texture: string | null, usesAdhesive: boolean): RoutineBlock[] {
  const synthetic = isSyntheticTexture(texture);
  const blocks: RoutineBlock[] = [
    {
      type: "steps",
      heading: "Wig washing routine",
      frequency: synthetic ? "Every 15-20 wears" : "Every 7-14 wears",
      steps: wigWashSteps(texture),
    },
    {
      type: "note",
      heading: "Daily wig care",
      body: "Between washes: store on a wig stand or mannequin head when not wearing - never stuff in a bag or drawer. Gently brush or finger style each morning. Apply a light wig shine spray or serum to human hair only for luster.",
    },
  ];

  if (usesAdhesive) {
    blocks.push({
      type: "steps",
      heading: "Adhesive removal routine",
      steps: [
        {
          title: "Apply adhesive remover",
          body: "Apply wig adhesive remover or 99% isopropyl alcohol to a cotton pad. Press against the lace where adhesive is bonded - let it dissolve for 30-60 seconds. Never pull the wig off with adhesive still active.",
          why: "Pulling a glued wig causes traction alopecia - the repeated tension pulls out hairline follicles over time. This is one of the most common causes of hairline thinning in wig wearers.",
        },
        {
          title: "Peel slowly from the front",
          body: "Once adhesive is dissolved, peel the lace slowly from the front to back. If you feel resistance, apply more remover and wait.",
        },
        {
          title: "Clean lace and scalp",
          body: "Use adhesive remover on a cotton pad to clean residual glue from the lace. Clean scalp and hairline with a gentle cleanser to remove all adhesive residue before reapplying.",
        },
      ],
    });
  }

  return blocks;
}

// ---- Tape-in ------------------------------------------------------------

function tapeInBlocks(): RoutineBlock[] {
  return [
    {
      type: "steps",
      heading: "Wash routine",
      frequency: "Every 2-3 weeks maximum",
      steps: [
        {
          title: "Brush thoroughly before washing",
          body: "Section hair and brush through completely before getting wet. Wet tangled tape-in hair creates knots around the tape tabs that are impossible to remove without damage.",
        },
        {
          title: "Apply shampoo avoiding tape tabs",
          body: "Dilute shampoo with water (1:3 ratio) in an applicator bottle. Apply to scalp and lengths, avoiding the tape tab attachment points by at least 2 inches. Never apply product directly on tape tabs.",
          why: "Shampoo surfactants break down the adhesive polymer matrix. Direct contact dissolves the bond.",
        },
        {
          title: "Rinse in downward motion only",
          body: "Rinse with hair hanging straight down - never flip hair upside down. Rinse thoroughly ensuring no shampoo remains near the tape tabs.",
        },
        {
          title: "Conditioner on ends only",
          body: "Apply conditioner ONLY from mid-shaft to ends - at least 3-4 inches below the tape tabs. Never apply conditioner to the attachment zone.",
          why: "Conditioner oils and emollients migrate toward the tape tabs and dissolve the adhesive over time, causing slippage between appointments.",
        },
        {
          title: "Cool rinse",
          body: "Rinse a final time with cool water to help seal the cuticle and keep the tabs secure.",
        },
        {
          title: "Gentle squeeze dry",
          body: "Squeeze water out gently - never rub near tape tabs. Pat the attachment area dry carefully.",
        },
        {
          title: "Blow dry tape tabs carefully",
          body: "Use a blow dryer on low heat to dry the tape tab attachment areas completely before styling. Wet tape tabs have reduced adhesion.",
        },
      ],
    },
    {
      type: "note",
      heading: "Daily tape-in care",
      body: "Never sleep with wet hair - moisture weakens adhesive overnight causing slippage and tangling. Sleep with hair in a loose braid to prevent tangling around the bonds. Use only oil-free or tape-in-safe styling products.",
    },
    {
      type: "warning",
      heading: "Products to NEVER use near your bonds",
      items: [
        "Any oil-based products near roots",
        "Heavy conditioners near roots",
        "Coconut oil (migrates to bonds)",
        "Argan oil at roots",
        "Any product containing mineral oil at attachment area",
      ],
    },
  ];
}

// ---- K-tip / fusion -------------------------------------------------------

function kTipBlocks(): RoutineBlock[] {
  return [
    {
      type: "steps",
      heading: "Wash routine",
      frequency: "Every 2-3 weeks",
      steps: [
        {
          title: "Brush thoroughly before washing",
          body: "Section hair and brush through completely before getting wet, starting below the bonds.",
        },
        {
          title: "Shampoo around the bonds, not through them",
          body: "Keep ALL oil-based products and oil-containing conditioners away from the keratin bond attachment point. Oils dissolve the keratin protein matrix that holds the bond to your hair. You can gently massage shampoo around the bond attachment but never soak or scrub the bond itself. Use a clarifying or extension-safe shampoo only.",
          why: "Oils dissolve the keratin protein matrix that holds the bond to your hair.",
        },
        {
          title: "Rinse in downward motion only",
          body: "Rinse with hair hanging straight down, ensuring no shampoo residue is left sitting against the bonds.",
        },
        {
          title: "Conditioner on ends only",
          body: "Apply conditioner ONLY from mid-shaft to ends, well below the bonds. Never apply conditioner to the attachment zone.",
        },
        {
          title: "Gentle squeeze dry",
          body: "Squeeze water out gently - never rub near the bonds. Pat the attachment area dry carefully.",
        },
      ],
    },
    {
      type: "note",
      heading: "Daily care",
      body: "Brush from below the bonds first using a loop extension brush - never brush from the roots through the bonds. This causes the bond to slide down the hair shaft.",
    },
  ];
}

// ---- I-tip / micro bead / loop --------------------------------------------

function iTipBlocks(): RoutineBlock[] {
  return [
    {
      type: "steps",
      heading: "Wash routine",
      frequency: "Every 2-3 weeks",
      steps: [
        {
          title: "Brush thoroughly before washing",
          body: "Section hair and brush through completely before getting wet, starting below the beads or loops. Wet tangled hair mats around bead/loop attachments quickly.",
        },
        {
          title: "Shampoo gently, avoiding heavy scrubbing at the beads",
          body: "Apply shampoo to scalp and lengths and rinse thoroughly. There's no adhesive to dissolve here, but aggressive scrubbing or twisting near the beads causes matting around the attachment point.",
        },
        {
          title: "Conditioner on ends only",
          body: "Apply conditioner from mid-shaft to ends, avoiding heavy product buildup right at the bead or loop.",
        },
        {
          title: "Gentle squeeze dry",
          body: "Squeeze water out gently rather than rubbing - friction while wet is what causes matting around bead/loop attachments.",
        },
      ],
    },
    {
      type: "note",
      heading: "Daily care",
      body: "Brush from below the beads or loops first, working upward - never brush straight through from the roots. This prevents hair from matting or felting around each attachment point.",
    },
  ];
}

// ---- Crochet ----------------------------------------------------------

function crochetBlocks(texture: string | null): RoutineBlock[] {
  const synthetic = isSyntheticTexture(texture);
  return [
    {
      type: "steps",
      heading: "Scalp and braid base care routine",
      frequency: "Weekly while installed",
      steps: [
        {
          title: "Diluted shampoo application",
          body: "Mix sulfate-free shampoo with water (1:4 ratio) in an applicator bottle. Apply directly to scalp in sections by inserting the nozzle through the crochet hair to reach the braid base. Massage scalp gently.",
          why: "The braid base and scalp must be kept clean during a crochet install to prevent product buildup, odor, and scalp inflammation.",
        },
        {
          title: "Rinse carefully",
          body: "Rinse with lukewarm water letting it run through the crochet hair. Squeeze water out of the crochet hair gently - the braid base underneath must dry completely to prevent mildew.",
        },
        {
          title: "Condition the crochet hair ends",
          body: synthetic
            ? "Apply a small amount of leave-in conditioner or detangling spray to the ends of the crochet hair only - not the braid base or roots. Use only synthetic-safe products - most conditioners cause synthetic frizz and matting."
            : "Apply a small amount of leave-in conditioner or detangling spray to the ends of the crochet hair only - not the braid base or roots.",
        },
        {
          title: "Dry completely",
          body: "Sit under a hooded dryer for 20-30 minutes to ensure the braid base underneath is fully dry. Damp braid bases cause mildew smell that is very difficult to remove.",
        },
      ],
    },
    {
      type: "note",
      heading: "Daily crochet care",
      body: "Spray the crochet hair with a light moisture spray or diluted leave-in conditioner for synthetic, or any leave-in for human hair. At night: wear a large satin bonnet over the entire style or sleep on a satin pillowcase.",
    },
  ];
}

// ---- Sew-in weave -----------------------------------------------------
//
// Same underlying mechanic as crochet (a weft attached to a braided
// cornrow base) - spec doesn't give sew-in its own Tab 1 routine, so this
// adapts the crochet base-care routine's structure to weave-specific
// wording rather than inventing unrelated content.

function sewInBlocks(): RoutineBlock[] {
  return [
    {
      type: "steps",
      heading: "Scalp and braid base care routine",
      frequency: "Weekly while installed",
      steps: [
        {
          title: "Diluted shampoo application",
          body: "Mix sulfate-free shampoo with water (1:4 ratio) in an applicator bottle. Apply directly to scalp in sections by inserting the nozzle through the weave to reach the braid base underneath. Massage scalp gently.",
          why: "The braid base and scalp must be kept clean during a sew-in to prevent product buildup, odor, and scalp inflammation.",
        },
        {
          title: "Rinse carefully",
          body: "Rinse with lukewarm water letting it run through the weft. Squeeze water out gently - the braid base underneath must dry completely to prevent mildew.",
        },
        {
          title: "Condition the weft ends only",
          body: "Apply a small amount of leave-in conditioner or detangling spray to the ends of the weave only - not the braid base or roots.",
        },
        {
          title: "Dry completely",
          body: "Sit under a hooded dryer until the braid base underneath is fully dry. Damp braid bases cause mildew smell that is very difficult to remove.",
        },
      ],
    },
    {
      type: "note",
      heading: "Daily sew-in care",
      body: "Spray the weave with a light moisture spray or leave-in conditioner as needed. At night: wear a satin bonnet over the entire style or sleep on a satin pillowcase.",
    },
  ];
}

// ---- Clip-ins -----------------------------------------------------------

function clipInBlocks(): RoutineBlock[] {
  return [
    {
      type: "steps",
      heading: "Clip-in washing routine",
      frequency: "Every 15-20 wears",
      steps: [
        {
          title: "Remove clips and detangle",
          body: "Detangle before washing using a wide tooth comb from ends up.",
        },
        {
          title: "Lay flat in sink",
          body: "Lay clip-ins flat in a sink of cool water with a small amount of sulfate-free shampoo or wig shampoo. Never wash clip-ins vertically - the clips can damage the track seam.",
        },
        {
          title: "Gently wash in one direction",
          body: "Squeeze water and shampoo through the hair in one direction, from track to ends - never scrub or use circular motions.",
        },
        {
          title: "Rinse and condition ends",
          body: "Rinse thoroughly, then apply conditioner from mid-length to ends only, avoiding the track.",
        },
        {
          title: "Lay flat on towel to dry",
          body: "Never hang clip-ins to dry - gravity stretches the track.",
        },
        {
          title: "Store on hanger or flat storage",
          body: "Once fully dry, store on a clip-in hanger or flat in its original packaging to keep the track shape intact.",
        },
      ],
    },
  ];
}

// ---- Halo extension -----------------------------------------------------
//
// No adhesive/bonds and removed daily like clip-ins, so this reuses that
// same low-maintenance structure with halo-specific wording.

function haloBlocks(): RoutineBlock[] {
  return [
    {
      type: "steps",
      heading: "Halo extension washing routine",
      frequency: "Every 15-20 wears",
      steps: [
        {
          title: "Detangle before washing",
          body: "Detangle before washing using a wide tooth comb, starting from the ends and working up toward the wire.",
        },
        {
          title: "Lay flat in sink",
          body: "Lay the halo flat in a sink of cool water with a small amount of sulfate-free shampoo. Never wash vertically - the wire can bend under water weight.",
        },
        {
          title: "Gently wash in one direction",
          body: "Squeeze water and shampoo through the hair in one direction - never scrub or twist around the wire.",
        },
        {
          title: "Rinse and condition ends",
          body: "Rinse thoroughly, then apply conditioner from mid-length to ends only, avoiding the wire itself.",
        },
        {
          title: "Lay flat on towel to dry",
          body: "Never hang the halo to dry - the wire can warp out of shape under the hair's wet weight.",
        },
      ],
    },
    {
      type: "note",
      heading: "Daily halo care",
      body: "Store flat or on a wig stand between wears. Gently brush before each wear to prevent tangles from building up.",
    },
  ];
}

// ---- Protective style only (no added hair) --------------------------------

function protectiveStyleOnlyBlocks(): RoutineBlock[] {
  return [
    {
      type: "steps",
      heading: "Protective style maintenance",
      frequency: "Weekly while installed",
      steps: [
        {
          title: "Cleanse the scalp",
          body: "Mix sulfate-free shampoo with water (1:4 ratio) in an applicator bottle and apply directly to the scalp between sections. Massage gently and rinse thoroughly.",
        },
        {
          title: "Moisturize the style",
          body: "Apply a light leave-in conditioner or moisturizing spray to the length of the style, focusing on the ends.",
        },
        {
          title: "Dry completely",
          body: "Allow the style and scalp to dry fully before covering for the night - trapped moisture against the scalp causes odor and buildup.",
        },
      ],
    },
    {
      type: "note",
      heading: "Daily care",
      body: "Apply a light oil or moisturizer to the scalp as needed. At night: wear a satin bonnet or sleep on a satin pillowcase to reduce friction and frizz.",
    },
  ];
}

// ---- Dispatch -----------------------------------------------------------
//
// A user can select multiple extension_types (Section 1 is multi-select).
// Priority order below shows the most product-sensitive / highest-risk
// type's routine as the primary Tab 1 content when more than one is
// selected, since the spec doesn't define a combined-routine behavior -
// wigs/tape-ins/k-tips carry the most product-damage risk described
// throughout the spec, so they take priority over lower-risk types.
export function generateExtensionCareBlocks(profile: ExtensionCareProfile): {
  tabLabel: string;
  blocks: RoutineBlock[];
} {
  const types = profile.extension_types ?? [];

  if (types.some((t) => WIG_TYPES.has(t))) {
    return { tabLabel: "My Wig Care", blocks: wigBlocks(profile.extension_texture, profile.uses_adhesive) };
  }
  if (types.includes("tape_in")) {
    return { tabLabel: "My Tape-In Care", blocks: tapeInBlocks() };
  }
  if (types.includes("k_tip")) {
    return { tabLabel: "My K-Tip Care", blocks: kTipBlocks() };
  }
  if (types.includes("i_tip")) {
    return { tabLabel: "My I-Tip / Bead Care", blocks: iTipBlocks() };
  }
  if (types.includes("crochet")) {
    return { tabLabel: "My Crochet Care", blocks: crochetBlocks(profile.extension_texture) };
  }
  if (types.includes("sew_in_weave")) {
    return { tabLabel: "My Sew-In Care", blocks: sewInBlocks() };
  }
  if (types.includes("clip_in")) {
    return { tabLabel: "My Clip-In Care", blocks: clipInBlocks() };
  }
  if (types.includes("halo")) {
    return { tabLabel: "My Halo Extension Care", blocks: haloBlocks() };
  }
  return { tabLabel: "My Protective Style Care", blocks: protectiveStyleOnlyBlocks() };
}
