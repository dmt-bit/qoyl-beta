import { type CurlFamily } from "@/lib/compatibility";

// Ingredient-guidance placeholder content, shown instead of a blank/error
// card whenever a routine category has zero scoreable candidates for a
// profile - either because the catalog genuinely has nothing in that
// category yet, or because every candidate got filtered out by
// isProductAllowed in lib/routineProducts.ts. Split into its own module
// (no Supabase imports) so both that server-only file and client
// components like app/routine/page.tsx can import it safely - importing
// lib/routineProducts.ts itself from a "use client" file would pull its
// getSupabaseAdmin() (service-role) dependency into the client bundle.
//
export const CATEGORY_INGREDIENT_TIPS: Record<string, string[]> = {
  "clarifying-shampoo": [
    "Look for: EDTA, Citric Acid, or Sodium Phytate as chelating agents.",
    "Malibu C Hard Water Wellness Shampoo is the gold standard for hard water cities like Chicago.",
  ],
  "protein-treatment": [
    "Look for: Hydrolyzed Keratin, Hydrolyzed Wheat Protein, or Hydrolyzed Silk as active protein ingredients.",
    "Avoid products where protein is the last ingredient - it needs to be in the top 10 to be effective.",
  ],
  "dry-shampoo": [
    "Starch (Tapioca, Rice, or Corn) - absorbs oil without residue",
    "Kaolin Clay - gentle oil absorption for fine hair",
    "Avoid: Talc and heavy silicones - can cause buildup on fine strands",
  ],
  "co-wash": [
    "Cetearyl Alcohol - conditioning cleansing agent",
    "Behentrimonium Methosulfate (BTMS) - gentle cleanser and conditioner",
    "Avoid: Sulfates - co-washes should never contain SLS or SLES",
  ],
  detangler: [
    "Slip agents: Cetrimonium Chloride or BTMS-50 - provide the slip needed to move a comb through knots without breakage",
    "Humectants: Glycerin or Panthenol - add moisture to the hair while detangling, reducing friction",
    "Avoid: Drying alcohols (Alcohol Denat, Isopropyl Alcohol) - strip moisture and cause more tangling",
    "Popular options to search: Kinky-Curly Knot Today, Tgin Moisture Rich Sulfate Free Conditioner, Mielle Mongongo Oil Hydrating Conditioner",
  ],
  "heat-protectant": [
    "Look for: silicones (Dimethicone, Cyclomethicone) or film-forming agents (PVP, Amodimethicone) that create a protective barrier. For fine straight hair, choose a spray formula over a cream - creams can weigh hair down.",
    "Avoid: heavy oils as the only heat protection - oils alone do not protect against heat damage above 300°F.",
  ],
  // Extrapolated in the same style as the four categories above, so "no
  // empty states" holds even if one of the original categories ever
  // legitimately turns up zero candidates for a given profile.
  shampoo: [
    "Sulfate-free surfactants: Cocamidopropyl Betaine or Sodium Cocoyl Isethionate - cleanses without stripping",
    "Glycerin or Panthenol - retains moisture during cleansing",
    "Avoid: Sodium Lauryl Sulfate (SLS) - can be overly drying, especially for curly or coily textures",
  ],
  conditioner: [
    "Cetyl Alcohol or Cetearyl Alcohol - softens and detangles",
    "Behentrimonium Chloride - conditioning agent that smooths the cuticle",
    "Avoid: high alcohol content (Isopropyl, Ethanol) near the top of the list - can dry out strands",
  ],
  "deep-conditioner": [
    "Hydrolyzed proteins (Wheat, Silk, or Keratin) - strengthens weakened strands",
    "Shea Butter or Ceramides - deep moisture and cuticle repair",
    "Avoid: mineral oil as the primary ingredient - can coat hair without real penetration",
  ],
  "leave-in": [
    "Glycerin or Aloe Vera - lightweight, ongoing hydration",
    "Behentrimonium Methosulfate - eases detangling without buildup",
    "Avoid: high alcohol content near the top of the ingredient list - can be drying over the day",
  ],
  styler: [
    "Polyquaternium or PVP - hold without stiffness",
    "Flaxseed Extract or Xanthan Gum - natural definition and curl clumping",
    "Avoid: heavy waxes near the top of the ingredient list - can weigh down fine or fragile strands",
  ],
  oil: [
    "Jojoba Oil or Argan Oil - lightweight sealing without heaviness",
    "Vitamin E (Tocopherol) - antioxidant protection for the hair shaft",
    "Avoid: Mineral Oil or Petrolatum as the primary ingredient - seals moisture out rather than in",
  ],
  gel: [
    "PVP or Polyquaternium - strong hold without flaking",
    "Aloe Vera or Flaxseed Extract as a base - hold with less dryness",
    "Avoid: high alcohol content near the top of the list - can be drying and cause flaking",
  ],
  "curl-cream": [
    "Shea Butter or Mango Butter - definition and moisture for curls",
    "Glycerin - everyday hydration",
    "Avoid: mineral oil or petrolatum as the primary ingredient on fine or low-porosity hair - can weigh curls down",
  ],
  butter: [
    "Shea Butter or Mango Butter as the base - rich sealing for high-porosity hair",
    "A lightweight oil blended in (Jojoba, Grapeseed) - eases application",
    "Avoid: using butter as a leave-in on low-porosity or fine hair - too heavy without a humectant first",
  ],
  mousse: [
    "PVP or Polyquaternium - volumizing hold without residue",
    "Panthenol - body and softness",
    "Avoid: heavy silicones - can flatten volume over the course of the day",
  ],
};

const GENERIC_INGREDIENT_TIPS = [
  "Look for ingredients suited to your porosity and curl pattern - humectants for moisture, proteins for strength.",
  "Avoid: heavy silicones or sulfates high on the ingredient list if you're prone to buildup.",
];

export function getCategoryGuidanceTips(categorySlug: string): string[] {
  return CATEGORY_INGREDIENT_TIPS[categorySlug] ?? GENERIC_INGREDIENT_TIPS;
}

// Mirrors lib/routineProducts.ts's RoutineSection - redefined locally
// (rather than imported) for the same reason as CATEGORY_INGREDIENT_TIPS
// above: this module must stay free of the getSupabaseAdmin() import
// chain so "use client" components can pull it in safely. Order and
// wording here are the single source of truth for both the web page's
// section dividers/calendar legend and the email template's grouping.
export type RoutineSection = "clarify" | "regular" | "protein" | "between" | "styling";

export const ROUTINE_SECTION_ORDER: RoutineSection[] = [
  "clarify",
  "regular",
  "protein",
  "between",
  "styling",
];

export const ROUTINE_SECTION_LABEL: Record<RoutineSection, string> = {
  clarify: "Clarifying wash day",
  regular: "Regular wash day",
  protein: "Protein treatment day",
  between: "Between wash days",
  styling: "Styling",
};

// Fixed contextual copy for the two "use only on this specific day"
// categories -- shown in addition to each product's own generated why-
// copy, not instead of it. Shared by app/routine/page.tsx and
// emails/routine-template.ts so the web and email framing stay in sync.
export function categoryNote(category: string, family: CurlFamily | null): string | null {
  if (category === "clarifying-shampoo") {
    return "Use this only on your chelating wash day - not every wash. It removes buildup and hard water minerals that block your other products from working.";
  }
  if (category === "protein-treatment") {
    if (family === "straight" || family === "wavy") {
      return "Fine straight and wavy hair needs lighter protein treatments - look for hydrolyzed proteins rather than heavy reconstructors. Olaplex No. 3 or a bond repair treatment works better than a thick protein masque for 1a-2c hair.";
    }
    if (family === "coily") {
      return "4a-4c coily hair benefits from stronger protein treatments quarterly. Aphogee Two Step Protein Treatment is the most effective option for significantly damaged or color-treated coily hair.";
    }
    // curly isn't called out explicitly in the spec this copy is based
    // on -- a middle ground between straight/wavy's "lighter" note and
    // coily's "stronger, quarterly" note.
    return "3a-3c curly hair does well with a balanced protein treatment monthly - not as light as straight/wavy needs, not as intensive as coily requires.";
  }
  if (category === "detangler") {
    // Leads with the short "label" framing from the spec this was built
    // from, then the full usage instructions - one bronze note box
    // rather than two separate UI elements, since every other category
    // note here is a single string too (this module is shared with the
    // email template, which renders these as plain text).
    if (family === "curly") {
      return "For detangling on wash day. Apply to wet hair in sections before or during conditioning. Work from ends to roots with a wide tooth comb. Never detangle dry curly hair.";
    }
    if (family === "coily") {
      return "Essential for wash day detangling. Apply generously to wet sectioned hair. Use fingers first to separate large knots, then a wide tooth comb from ends to roots. Never skip this step - detangling dry coily hair causes significant breakage.";
    }
    if (family === "wavy") {
      return "Optional - use on wash day if you experience tangles during conditioning.";
    }
    return null;
  }
  return null;
}
