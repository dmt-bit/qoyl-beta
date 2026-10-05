import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getAffiliateLink } from "@/lib/affiliateLinks";
import {
  buildScoringProfile,
  curlFamily,
  isSulfate,
  nameKeywordBadgeLabel,
  nameKeywordWhyCopyAddendum,
  scoreCatalogProductsForProfile,
  type CurlFamily,
} from "@/lib/compatibility";
import { budgetMaxUsd, isBudgetActive } from "@/lib/priceContext";
import type { ProtectiveStyleType } from "@/lib/protectiveStyleRoutine";
import type { ProductWeight } from "@/lib/productWeight";
import type { RoutineIngredient } from "@/lib/routineInteractions";

// Real product recommendations for the routine (paid /routine page + its
// email, see app/api/routine/route.ts and lib/sendRoutineEmail.ts).
//
// This used to rank raw *ingredients* from compatibility_scores and
// display the winning ingredient name as if it were a shoppable product
// (there was no real product/brand catalog when it was first built).
// catalog_products/catalog_brands/catalog_product_ingredients exist now
// (the same tables /search, travel kits, and the home feed's product
// spotlight cards already score against) - this reuses that exact
// scoring engine (scoreCatalogProductsForProfile) instead of duplicating
// it, and returns real product + brand names.

// Groups routine categories the same way the calendar groups wash days,
// so the product list can be displayed under matching section dividers
// (and so "what to use today" can pick the right section for the day's
// wash type).
export type RoutineSection = "clarify" | "regular" | "protein" | "between" | "styling";

type CandidateFilter = {
  // Keep only candidates whose name contains one of these substrings
  // (case-insensitive) or whose brand exactly matches one of `brands`.
  nameKeywords?: string[];
  brands?: string[];
};

type RoutineCategorySlot = {
  slug: string; // real categories.slug used for the DB query
  label: string;
  section: RoutineSection;
  // Overrides the identifier used for RoutineProductPick.category (the
  // guidance-lookup / grouping key) when it needs to differ from the
  // real DB slug -- e.g. "clarifying-shampoo" and regular "shampoo" both
  // query category_id="shampoo" but need to read as separate categories
  // everywhere else (guidance placeholder, section grouping, why-copy).
  pickCategory?: string;
  // Free-text query appended to the placeholder card's "search our
  // catalog" link, since pickCategory itself isn't a real, searchable
  // category slug for these two.
  searchQuery?: string;
  // "Mousse or Light Hold Gel" / "Curl Cream or Styler" - if the primary
  // slug has zero ranked candidates, try this slug instead before giving
  // up on the slot entirely. Primary and fallback are never combined into
  // one query: whichever one actually produces results supplies BOTH the
  // primary and alternate pick, so the two are always the same category.
  fallbackSlug?: string;
  fallbackLabel?: string;
  // Only include this slot for the given profile - e.g. coily's Butter
  // slot only makes sense for high porosity hair.
  include?: (ctx: { porosity: string }) => boolean;
  // Restricts the candidate pool to (nameKeywords OR brands) before
  // scoring/ranking -- used for "Clarifying Shampoo" (a name-filtered
  // view of the shampoo category, not its own DB category).
  onlyMatching?: CandidateFilter;
  // Excludes candidates matching (nameKeywords OR brands) -- used so
  // "Shampoo (regular)" doesn't also surface the clarifying shampoos
  // that "Clarifying Shampoo" already claimed.
  excludeMatching?: CandidateFilter;
  // Soft ranking nudge, not a hard filter -- brands to surface first
  // among otherwise similar scores (e.g. Aphogee/Olaplex for protein
  // treatments). Doesn't change the displayed score, only sort order.
  priorityBrand?: (name: string, brand: string) => boolean;
};

const CLARIFY_NAME_KEYWORDS = ["clarif", "chelat", "detox", "cleanse", "purif", "reset", "deep clean"];
const CLARIFY_BRANDS = ["malibu c"];

const PROTEIN_NAME_KEYWORDS = [
  "protein",
  "bond",
  "repair",
  "reconstruct",
  "strengthen",
  "keratin",
  "peptide",
];
// "SheaMoisture Manuka Honey line" specifically, not every SheaMoisture
// product -- everything else in the priority list is brand-wide.
function isPriorityProteinBrand(productName: string, brandName: string): boolean {
  const brand = brandName.toLowerCase();
  if (["aphogee", "olaplex", "briogeo", "joico"].includes(brand)) return true;
  return brand === "sheamoisture" && productName.toLowerCase().includes("manuka");
}

// Optional dry-hair, pre-wash treatment - most catalogs will have thin
// coverage here, so like HAIR_MASK_SLOT/HAIRSPRAY_SLOT below,
// getRoutineProductPicks drops this slot entirely when it has no
// products rather than showing an empty placeholder prompting the user
// to add one (see withPreShampooStep in app/routine/page.tsx, which only
// inserts the Step 0 pre-shampoo instructions when a real pick exists
// here). Positioned first in every family's list - pre-shampoo comes
// before shampoo in the actual wash-day order.
const PRE_SHAMPOO_SLOT: RoutineCategorySlot = {
  slug: "pre-shampoo",
  label: "Pre-Shampoo",
  section: "clarify",
};

const CLARIFYING_SHAMPOO_SLOT: RoutineCategorySlot = {
  slug: "shampoo",
  pickCategory: "clarifying-shampoo",
  label: "Clarifying / Chelating Shampoo",
  section: "clarify",
  searchQuery: "clarifying",
  onlyMatching: { nameKeywords: CLARIFY_NAME_KEYWORDS, brands: CLARIFY_BRANDS },
};

function regularShampooSlot(): RoutineCategorySlot {
  return {
    slug: "shampoo",
    label: "Shampoo",
    section: "regular",
    excludeMatching: { nameKeywords: CLARIFY_NAME_KEYWORDS, brands: CLARIFY_BRANDS },
  };
}

const PROTEIN_TREATMENT_SLOT: RoutineCategorySlot = {
  slug: "treatment",
  pickCategory: "protein-treatment",
  label: "Protein Treatment",
  section: "protein",
  searchQuery: "protein",
  onlyMatching: { nameKeywords: PROTEIN_NAME_KEYWORDS },
  priorityBrand: isPriorityProteinBrand,
};

// Intensive treatment mask - a separate category from deep-conditioner
// (thicker/more concentrated, weekly or bi-weekly rather than every wash
// day). Which wash days it's shown on depends on whether the user also
// has a deep conditioner pick - that rule is day-specific, so it lives
// client-side with the rest of the per-day product filtering (see
// getProductsForDay in app/routine/page.tsx). getRoutineProductPicks
// drops this slot's pick entirely when the category has no products,
// rather than showing an empty placeholder card for a category most
// catalogs won't have covered yet.
const HAIR_MASK_SLOT: RoutineCategorySlot = {
  slug: "hair-mask",
  label: "Hair Mask",
  section: "regular",
};

// Finishing hairspray - styling step on any day for straight/wavy; for
// curly/coily only surfaced when the user actually has products for it
// (getRoutineProductPicks drops empty hairspray picks for every family
// rather than showing an empty placeholder). Whether a coily/curly
// user's style for a given day needs hold (twist-out/braid-out) isn't
// something the app tracks, so having a pick is the only gate there.
const HAIRSPRAY_SLOT: RoutineCategorySlot = {
  slug: "hairspray",
  label: "Hairspray",
  section: "styling",
};

// Used only when curl_type is unset/unrecognized (curlFamily() returns
// null) - every real family below has its own fully custom list.
const FALLBACK_CATEGORIES: RoutineCategorySlot[] = [
  PRE_SHAMPOO_SLOT,
  { slug: "shampoo", label: "Shampoo", section: "regular" },
  { slug: "conditioner", label: "Conditioner", section: "regular" },
  { slug: "deep-conditioner", label: "Deep Conditioner", section: "regular" },
    HAIR_MASK_SLOT,
  { slug: "leave-in", label: "Leave-In Conditioner", section: "styling" },
  { slug: "styler", label: "Styler", section: "styling" },
  { slug: "oil", label: "Oil", section: "styling" },
  HAIRSPRAY_SLOT,
];

// Curl-family-specific recommendation lists, grouped into the same five
// sections the calendar's wash days fall into (clarify/regular/protein/
// between/styling) so the product list reads as one system with the
// calendar above it, not an unrelated grid of cards.
const FAMILY_ROUTINE_CATEGORIES: Record<CurlFamily, RoutineCategorySlot[]> = {
  straight: [
    PRE_SHAMPOO_SLOT,
    CLARIFYING_SHAMPOO_SLOT,
    regularShampooSlot(),
    { slug: "conditioner", label: "Conditioner", section: "regular" },
    { slug: "deep-conditioner", label: "Deep Conditioner", section: "regular" },
    HAIR_MASK_SLOT,
    PROTEIN_TREATMENT_SLOT,
    { slug: "dry-shampoo", label: "Dry Shampoo", section: "between" },
    { slug: "heat-protectant", label: "Heat Protectant", section: "styling" },
    HAIRSPRAY_SLOT,
    // Replaces "Sealing Oil" entirely - see isProductAllowed below for
    // the lightweight-only (ultralight/light) filter that goes with it.
    { slug: "oil", label: "Finishing Serum", section: "styling" },
  ],
  wavy: [
    PRE_SHAMPOO_SLOT,
    CLARIFYING_SHAMPOO_SLOT,
    regularShampooSlot(),
    { slug: "conditioner", label: "Conditioner", section: "regular" },
    // Optional for wavy (unlike curly/coily, where it's required) - see
    // the "Optional" framing baked into its categoryNote copy in
    // lib/categoryGuidance.ts.
    { slug: "detangler", label: "Detangler", section: "regular" },
    { slug: "deep-conditioner", label: "Deep Conditioner", section: "regular" },
    HAIR_MASK_SLOT,
    PROTEIN_TREATMENT_SLOT,
    { slug: "co-wash", label: "Co-Wash", section: "between" },
    {
      slug: "mousse",
      label: "Mousse",
      fallbackSlug: "gel",
      fallbackLabel: "Light Hold Gel",
      section: "styling",
    },
    { slug: "heat-protectant", label: "Heat Protectant", section: "styling" },
    HAIRSPRAY_SLOT,
    { slug: "oil", label: "Finishing Serum", section: "styling" },
  ],
  curly: [
    PRE_SHAMPOO_SLOT,
    CLARIFYING_SHAMPOO_SLOT,
    regularShampooSlot(),
    { slug: "conditioner", label: "Conditioner", section: "regular" },
    // Required for curly (detangling happens during/after conditioning)
    // - positioned between conditioner and deep conditioner.
    { slug: "detangler", label: "Detangler", section: "regular" },
    { slug: "deep-conditioner", label: "Deep Conditioner", section: "regular" },
    HAIR_MASK_SLOT,
    PROTEIN_TREATMENT_SLOT,
    { slug: "leave-in", label: "Leave-In Conditioner", section: "styling" },
    {
      slug: "curl-cream",
      label: "Curl Cream",
      fallbackSlug: "styler",
      fallbackLabel: "Styler",
      section: "styling",
    },
    { slug: "oil", label: "Oil", section: "styling" },
    HAIRSPRAY_SLOT,
  ],
  coily: [
    PRE_SHAMPOO_SLOT,
    CLARIFYING_SHAMPOO_SLOT,
    regularShampooSlot(),
    // One of the most critical product types for 4c hair - positioned
    // right after the shampoo slots, prominently ahead of everything
    // else.
    { slug: "detangler", label: "Detangler", section: "regular" },
    { slug: "deep-conditioner", label: "Deep Conditioner", section: "regular" },
    HAIR_MASK_SLOT,
    PROTEIN_TREATMENT_SLOT,
    { slug: "leave-in", label: "Leave-In Conditioner", section: "styling" },
    {
      slug: "curl-cream",
      label: "Curl Cream",
      fallbackSlug: "styler",
      fallbackLabel: "Styler",
      section: "styling",
    },
    { slug: "gel", label: "Gel", section: "styling" },
    { slug: "oil", label: "Sealing Oil", section: "styling" },
    HAIRSPRAY_SLOT,
    {
      slug: "butter",
      label: "Butter",
      section: "styling",
      include: ({ porosity }) => porosity === "high",
    },
  ],
};

function routineCategoriesForFamily(
  family: CurlFamily | null,
  porosity: string
): RoutineCategorySlot[] {
  const slots = family ? FAMILY_ROUTINE_CATEGORIES[family] : FALLBACK_CATEGORIES;
  return slots.filter((slot) => !slot.include || slot.include({ porosity }));
}

// Candidate pool size per category - large enough to give the scorer a
// real spread to rank without fetching the entire catalog on every
// routine load.
const CANDIDATE_POOL_SIZE = 25;

export type RoutineProductCandidate = {
  productName: string;
  brandName: string;
  score: number; // 0-100
  weight: ProductWeight;
  why: string;
  // Precomputed for the email (plain HTML, no client component to run
  // ShopButton's logic) - the web page instead renders <ShopButton
  // productName brandName /> directly, which resolves the same link.
  affiliateLink: string | null;
  priceUsd: number | null;
  // True if any of the product's scored ingredients matched
  // lib/compatibility.ts's isSulfate() - drives the color-treated
  // sulfate warning on the product card, independent of the score
  // itself (a sulfate can still score fine overall while being worth
  // flagging specifically for color-treated hair).
  containsSulfates: boolean;
  // "Matches your volume goal" etc. - see
  // lib/compatibility.ts's nameKeywordBadgeLabel. Null unless the
  // product name's keyword modifier is significant (>= 6).
  nameKeywordBadge: string | null;
  // Scored ingredient matches (INCI name, 1-based position, primary
  // function) - feeds analyzeRoutineInteractions in app/api/routine.
  ingredients: RoutineIngredient[];
};

export type RoutineProductPick = {
  category: string; // display/guidance key, e.g. "clarifying-shampoo"
  categoryLabel: string;
  section: RoutineSection;
  // Real categories.slug + optional free-text query for the "search our
  // catalog" link -- category above isn't always a real, searchable slug
  // (clarifying-shampoo/protein-treatment aren't).
  searchCategorySlug: string;
  searchQuery: string | null;
  primary: RoutineProductCandidate | null;
  alternate: RoutineProductCandidate | null;
  // True when this category has no catalog products with scoreable
  // ingredient data yet - the UI/email should show the ingredient-
  // guidance placeholder (see lib/categoryGuidance.ts) instead of
  // product cards.
  noProductsYet: boolean;
  // Set only when budget filtering is active (see lib/priceContext.ts)
  // and `primary` costs more than the user's budget ceiling - the
  // highest-scoring candidate that IS within budget, shown alongside
  // primary rather than replacing it (primary always stays the top
  // pick regardless of price, per spec).
  budgetAlternate: RoutineProductCandidate | null;
};

// Ingredient-guidance placeholder content lives in lib/categoryGuidance.ts
// (no Supabase imports) instead of here, so client components can import
// it without pulling this file's getSupabaseAdmin() dependency into the
// client bundle. Re-exported for convenience for any server-side caller
// that already imports from this module.
export { getCategoryGuidanceTips } from "@/lib/categoryGuidance";

// Format words that mean "this is a cream/butter/yogurt," independent of
// how the product happens to be filed in the category table - catalog
// curation can lag or miscategorize (see Almond Jai Twisting Butter,
// filed under "styler" until this was reported), so the name check is a
// backstop for the category-based exclusion below, not a substitute.
const HEAVY_FORMAT_NAME_PATTERN = /butter|pudding|souffl[eé]|whip|yogurt|yoghurt|groyogurt/i;
// Growth-oriented/heavy-format products specifically to steer away from
// for thinning hair, on top of the general weight-based exclusions below.
const THINNING_EXCLUDE_NAME_PATTERN = /growth cream|groyogurt|hair food/i;

// Hard weight/format exclusions layered on top of the scoring modifier in
// lib/compatibility.ts's getWeightModifier - a heavy product can still
// out-score lighter alternatives on ingredients alone, so these override
// scoring entirely rather than leaving it to compete.
function isProductAllowed(
  candidate: { weight: ProductWeight; categorySlug: string; productName: string },
  family: CurlFamily | null,
  hairConcerns: string[] | null
): boolean {
  const { weight, categorySlug, productName } = candidate;
  const isHeavyFormat = HEAVY_FORMAT_NAME_PATTERN.test(productName);

  // Thinning hair overrides curl-type rules entirely - never very_heavy
  // anywhere, never heavy in a leave-in or styler, and a styler pick must
  // be a gel/mousse/light-spray, never a cream/butter/yogurt formula,
  // regardless of hair type.
  if (hairConcerns?.includes("thinning")) {
    if (weight === "very_heavy") return false;
    if ((categorySlug === "leave-in" || categorySlug === "styler") && weight === "heavy") {
      return false;
    }
    if (categorySlug === "styler" && isHeavyFormat) return false;
    if (THINNING_EXCLUDE_NAME_PATTERN.test(productName)) return false;
  }

  // very_heavy is already excluded everywhere for straight/wavy below,
  // and heavy is already excluded from leave-in/styler for straight and
  // from everywhere but deep-conditioner for wavy - so the weight-based
  // halves of "deep-conditioner AND very_heavy" / "leave-in or styler AND
  // heavy-or-very_heavy" are already covered by those per-family rules
  // further down. What's left to add here is the category/name backstop.
  if (family === "straight" || family === "wavy") {
    if (categorySlug === "butter" || categorySlug === "curl-cream") return false;
    if (isHeavyFormat) return false;
  }

  // Straight's "oil" slot is relabeled "Finishing Serum" and is meant to
  // read as shine/frizz control, not moisture sealing - so it's
  // restricted to ultralight/light formulas only, not just preferred via
  // scoring.
  if (family === "straight" && categorySlug === "oil") {
    if (weight !== "ultralight" && weight !== "light") return false;
  }

  if (!family || family === "coily") return true;

  if (family === "straight") {
    if (weight === "very_heavy") return false;
    if (weight === "heavy" && (categorySlug === "leave-in" || categorySlug === "styler")) {
      return false;
    }
    return true;
  }

  if (family === "wavy") {
    if (weight === "very_heavy") return false;
    if (weight === "heavy" && categorySlug !== "deep-conditioner" && categorySlug !== "hair-mask") return false;
    return true;
  }

  // curly: very_heavy is only excluded from shampoo/leave-in - deep
  // conditioner and styler/curl-cream allow any weight (styler even
  // prefers heavier formulas for definition, via the scoring modifier).
  if (weight === "very_heavy" && (categorySlug === "shampoo" || categorySlug === "leave-in")) {
    return false;
  }
  return true;
}

// Product-type + hair-type aware, not a generic ingredient blurb.
// Keyed by pickCategory (not the raw DB slug), so "clarifying-shampoo"
// and "protein-treatment" get their own dedicated copy instead of
// reusing regular shampoo's "gentle enough for regular use" framing,
// which would be actively wrong advice for a chelating shampoo.
function generateWhyCopy(
  productName: string,
  category: string,
  curlType: string | null,
  porosity: string,
  weight: ProductWeight,
  hairConcerns: string[] | null
): string {
  const family = curlFamily(curlType);
  const hasThinning = hairConcerns?.includes("thinning") ?? false;
  const curlTypeLabel = curlType && curlType !== "not_sure" ? curlType : "your";

  switch (category) {
    case "clarifying-shampoo":
      return `Clarifying formula for ${porosity} porosity ${curlTypeLabel} hair - use only on your chelating wash day, not every wash. Removes buildup and hard water minerals that block your other products from working.`;

    case "protein-treatment":
      return `Strengthening treatment for ${porosity} porosity ${curlTypeLabel} hair - use only on your designated protein day. Overuse causes brittleness.`;

    // Protective-style picks (braids/locs/wigs) aren't porosity-driven,
    // so their copy skips the porosity/curl-type framing every other
    // case here uses.
    case "diluted-leave-in":
      return `A diluted leave-in in an applicator bottle reaches your scalp through the style without disturbing it - apply directly to the scalp between braids or twists.`;
    case "braid-spray":
      return `A lightweight water-based spray for daily moisture - mist your scalp and the length of your braids or twists without saturating them.`;
    case "loc-shampoo":
      return `Residue-free formula - buildup from a regular shampoo can trap moisture inside a loc and lead to mildew or "loc rot," so a clarifying or residue-free wash matters more here than for loose hair.`;
    case "wig-shampoo":
      return `Formulated specifically for wig fibers rather than a scalp - sulfate-free for human hair wigs, gentle enough for synthetic fibers too.`;
    case "wig-conditioner":
      return `For human hair wigs only - synthetic fibers don't absorb conditioner the way human hair does and can end up looking greasy or matted instead.`;
    case "wig-detangler":
      return `A leave-in detangling spray keeps wig fibers slipping smoothly through a comb, reducing shedding and fiber damage between wears.`;

    case "heat-protectant":
      return `Essential for ${curlTypeLabel} hair before any heat styling. Apply evenly to damp hair before blow drying or flat ironing. Look for silicones or film-formers that create a barrier between your hair and the heat tool.`;

    case "dry-shampoo":
      if (hasThinning) {
        return `Lightweight formula to absorb scalp oil between washes without adding weight to thinning strands. Apply only at the roots, never mid-length or ends.`;
      }
      return `Extends your style between wash days by absorbing scalp oil at the roots. Apply to roots only, massage in, then brush or shake out excess.`;

    // "oil" is relabeled "Finishing Serum" for straight/wavy (see
    // FAMILY_ROUTINE_CATEGORIES) but the underlying category_id/slug is
    // still "oil" - "finishing-serum" is kept as an alias in case a
    // distinct category slug is ever added.
    case "finishing-serum":
    case "oil":
      if (family === "straight" || family === "wavy") {
        return `Finishing serum for ${curlTypeLabel} hair - apply 1-2 drops to dry hair at ends only for shine and frizz control. Avoid roots entirely.`;
      }
      if (family === "curly") {
        return `Lightweight oil for ${porosity} porosity ${curlTypeLabel} hair - apply to ends for shine and to smooth flyaways without weighing curls down.`;
      }
      if (hasThinning) {
        return `Scalp-nourishing formula - massage into scalp to stimulate circulation. Lightweight enough to use without weighing down thinning strands.`;
      }
      return `Sealing oil appropriate for ${porosity} porosity ${curlTypeLabel} hair - apply to ends after styling to lock in moisture.`;

    case "conditioner":
      if (family === "straight") {
        return `Apply to mid-lengths and ends only on ${curlTypeLabel} hair - never at the roots. Rinse thoroughly. Conditioner at the scalp causes the flat, oily look within hours on straight hair.`;
      }
      return `Recommended for ${porosity} porosity ${curlTypeLabel} hair - use weekly for 10-15 minutes then rinse thoroughly. The formula weight is appropriate for occasional deep treatment without risking buildup on fine strands.`;

    case "deep-conditioner":
      if (family === "straight") {
        return `Use once a month on ${curlTypeLabel} hair - not weekly. Apply to mid-lengths and ends only, leave for 10-15 minutes under a shower cap, rinse thoroughly. Monthly deep conditioning prevents damage without over-softening fine strands.`;
      }
      if (family === "wavy") {
        return `Recommended for ${porosity} porosity ${curlTypeLabel} hair - use monthly for 10-15 minutes then rinse thoroughly. The formula weight is appropriate for occasional deep treatment without risking buildup on wavy strands.`;
      }
      return `Strong match for ${porosity} porosity ${curlTypeLabel} hair - apply generously and use heat for maximum penetration.`;

    case "hairspray":
      return `A finishing product for ${curlTypeLabel} hair - apply after styling, not before, from 6-8 inches away. Its alcohol evaporates rather than conditioning, so it never adds weight; use flexible hold for natural movement and strong hold for styles that need to last.`;

    case "hair-mask":
      if (family === "straight") {
        return `An intensive treatment, not an everyday product - use occasionally on ${curlTypeLabel} hair, on mid-lengths and ends only, and rinse thoroughly. Rich formulas can weigh down fine straight strands if used too often.`;
      }
      return `Intensive treatment for ${porosity} porosity ${curlTypeLabel} hair - use weekly or bi-weekly for 15-30 minutes, ideally with a heated cap for maximum penetration.`;

    case "leave-in":
      if (hasThinning) {
        return `Lightweight enough for thinning ${curlTypeLabel} hair - won't weigh down fine strands while providing moisture. Apply sparingly to mid-lengths and ends only, avoid roots.`;
      }
      if (family === "straight") {
        return `Appropriate weight for ${curlTypeLabel} straight hair - apply to damp hair focusing on ends only to avoid root heaviness.`;
      }
      return `Scores well for ${porosity} porosity ${curlTypeLabel} hair based on ingredient compatibility and formula weight.`;

    case "shampoo":
      return `Gentle enough for regular use on ${porosity} porosity ${curlTypeLabel} hair without stripping natural oils.`;

    case "co-wash":
      return `Cleansing conditioner appropriate for ${porosity} porosity ${curlTypeLabel} hair - cleanses gently without sulfates, ideal for a lighter wash day.`;

    case "styler":
    case "gel":
    case "curl-cream":
    case "mousse":
      if (family === "straight") {
        return `Lightweight hold appropriate for ${curlTypeLabel} fine hair - provides structure without weighing strands down.`;
      }
      return `Good hold and definition for ${curlTypeLabel} ${porosity} porosity hair.`;

    case "butter":
      return `Rich sealing formula for ${porosity} porosity ${curlTypeLabel} hair - apply to ends to lock in moisture and protect against breakage.`;

    default:
      console.warn(
        `generateWhyCopy: no specific copy branch for category "${category}" - using generic fallback.`
      );
      return `Scores well for ${porosity} porosity ${curlTypeLabel} hair based on ingredient compatibility and formula weight.`;
  }
}

type CandidateRow = {
  id: string;
  name: string;
  catalog_brands: { name: string } | { name: string }[] | null;
  price_usd: number | null;
};

function brandNameOf(row: CandidateRow): string {
  const brand = Array.isArray(row.catalog_brands) ? row.catalog_brands[0] : row.catalog_brands;
  return brand?.name ?? "Unknown brand";
}

function matchesFilter(name: string, brandName: string, filter: CandidateFilter): boolean {
  const n = name.toLowerCase();
  const b = brandName.toLowerCase();
  if (filter.nameKeywords?.some((k) => n.includes(k))) return true;
  if (filter.brands?.some((br) => b === br)) return true;
  return false;
}

// Shared by getRoutineProductPicks (primary + alternate, /routine page)
// and getRoutineProducts (primary only, routine email) so both stay in
// sync with a single query/scoring pass per category. Always returns
// candidates from exactly one category_id - callers building a pick from
// this result get primary/alternate from the same category by
// construction, never mixed.
async function rankCategoryProducts(
  categorySlug: string,
  categoryId: string,
  pickCategory: string,
  porosity: string,
  curlType: string | null,
  hairConcerns: string[] | null,
  slot: RoutineCategorySlot,
  colorTreated: boolean
): Promise<RoutineProductCandidate[]> {
  const admin = getSupabaseAdmin();

  const { data: rawCandidates, error: candidatesError } = await admin
    .from("catalog_products")
    .select("id, name, catalog_brands(name), price_usd")
    .eq("category_id", categoryId)
    .order("created_at", { ascending: false })
    .limit(CANDIDATE_POOL_SIZE);

  // A query error here (e.g. price_usd not existing yet in a given
  // environment) used to silently produce an empty candidate list -
  // every category would show "no products yet" for every user with no
  // way to tell why. Logging loudly so a schema drift like that is
  // immediately visible in server logs instead of looking like an empty
  // catalog.
  if (candidatesError) {
    console.error(
      `[routineProducts] catalog_products query failed for category "${categorySlug}":`,
      candidatesError.message
    );
  }

  let candidates = rawCandidates ?? [];
  if (slot.onlyMatching) {
    candidates = candidates.filter((row) =>
      matchesFilter(row.name, brandNameOf(row), slot.onlyMatching!)
    );
  }
  if (slot.excludeMatching) {
    candidates = candidates.filter(
      (row) => !matchesFilter(row.name, brandNameOf(row), slot.excludeMatching!)
    );
  }

  if (candidates.length === 0) return [];

  const profile = buildScoringProfile({
    curl_type: curlType,
    porosity,
    scalp_condition: null,
    climate: null,
    water_hardness: null,
    hair_concerns: hairConcerns,
    color_treated: colorTreated ? "yes" : "no",
  });

  const scores = await scoreCatalogProductsForProfile(
    candidates.map((c) => c.id),
    profile
  );

  const family = curlFamily(curlType);

  return candidates
    .map((row) => {
      const result = scores[row.id]?.result;
      // No linked ingredient data for this product yet - can't produce a
      // real score or a grounded "why," so it's not a usable candidate
      // rather than a false 0.
      if (!result || result.matches.length === 0) return null;
      if (
        !isProductAllowed(
          { weight: result.productWeight, categorySlug, productName: row.name },
          family,
          hairConcerns
        )
      ) {
        return null;
      }

      const brandName = brandNameOf(row);
      const baseWhy = generateWhyCopy(
        row.name,
        pickCategory,
        curlType,
        profile.porosity,
        result.productWeight,
        hairConcerns
      );
      const nameKeywordAddendum = nameKeywordWhyCopyAddendum(result.nameKeywordMatch);
      return {
        productName: row.name,
        brandName,
        score: result.normalizedScore,
        weight: result.productWeight,
        why: nameKeywordAddendum ? `${baseWhy} ${nameKeywordAddendum}` : baseWhy,
        affiliateLink: getAffiliateLink(row.name, brandName),
        priceUsd: row.price_usd ?? null,
        containsSulfates: result.matches.some((m) => isSulfate(m.ingredient_name)),
        nameKeywordBadge: nameKeywordBadgeLabel(result),
        ingredients: result.matches.map((m) => ({
          inciName: m.inciName,
          position: m.position,
          primaryFunction: m.primaryFunction,
        })),
      };
    })
    .filter((c): c is RoutineProductCandidate => c !== null)
    .sort((a, b) => {
      // Priority brands sort first among themselves by score, then
      // everyone else by score -- a soft nudge, not a hard override, and
      // the displayed score itself is never altered.
      const aPriority = slot.priorityBrand?.(a.productName, a.brandName) ?? false;
      const bPriority = slot.priorityBrand?.(b.productName, b.brandName) ?? false;
      if (aPriority !== bPriority) return aPriority ? -1 : 1;
      return b.score - a.score;
    });
}

async function loadCategoryIds(slugs: string[]): Promise<Map<string, string>> {
  const admin = getSupabaseAdmin();
  const { data } = await admin.from("categories").select("id, slug").in("slug", slugs);

  return new Map((data ?? []).map((row) => [row.slug as string, row.id as string]));
}

export async function getRoutineProductPicks(
  porosity: string | null,
  curlType: string | null = null,
  hairConcerns: string[] | null = null,
  colorTreated: boolean = false,
  budgetRange: string | null = null
): Promise<RoutineProductPick[]> {
  const budgetActive = isBudgetActive(budgetRange);
  const maxUsd = budgetMaxUsd(budgetRange);
  const normalizedPorosity = porosity ?? "medium";
  const family = curlFamily(curlType);
  const slots = routineCategoriesForFamily(family, normalizedPorosity);

  const allSlugs = Array.from(
    new Set(slots.flatMap((s) => [s.slug, s.fallbackSlug].filter((x): x is string => Boolean(x))))
  );
  const categoryIds = await loadCategoryIds(allSlugs);

  // Categories x a candidates fetch + a scoring pass each - run
  // concurrently rather than one at a time, both for responsiveness and
  // to stay well under Vercel Hobby's ~10s function timeout.
  const results = await Promise.all(
    slots.map(async (slot) => {
      const pickCategory = slot.pickCategory ?? slot.slug;
      const primaryId = categoryIds.get(slot.slug);
      let ranked = primaryId
        ? await rankCategoryProducts(
            slot.slug,
            primaryId,
            pickCategory,
            normalizedPorosity,
            curlType,
            hairConcerns,
            slot,
            colorTreated
          )
        : [];
      let usedSlug = slot.slug;
      let usedLabel = slot.label;

      // Primary category came up empty - try the fallback (e.g. "Mousse"
      // -> "Light Hold Gel"). Primary and alternate always end up coming
      // from whichever one slug actually produced results, never mixed.
      if (ranked.length === 0 && slot.fallbackSlug) {
        const fallbackId = categoryIds.get(slot.fallbackSlug);
        const fallbackRanked = fallbackId
          ? await rankCategoryProducts(
              slot.fallbackSlug,
              fallbackId,
              slot.fallbackSlug,
              normalizedPorosity,
              curlType,
              hairConcerns,
              slot,
              colorTreated
            )
          : [];
        if (fallbackRanked.length > 0) {
          ranked = fallbackRanked;
          usedSlug = slot.fallbackSlug;
          usedLabel = slot.fallbackLabel ?? slot.fallbackSlug;
        }
      }

      const primary = ranked[0] ?? null;
      // Highest-scoring candidate within budget, only when primary is
      // both priced and over the user's ceiling - ranked is already
      // score-sorted, so the first match here is also the highest-
      // scoring in-budget option. Never replaces primary; the spec is
      // explicit that the top score always shows regardless of price.
      const budgetAlternate =
        budgetActive && primary?.priceUsd != null && primary.priceUsd > maxUsd
          ? ranked.find((c) => c.priceUsd != null && c.priceUsd <= maxUsd) ?? null
          : null;

      return {
        category: usedSlug === slot.slug ? pickCategory : usedSlug,
        categoryLabel: usedLabel,
        section: slot.section,
        searchCategorySlug: usedSlug,
        searchQuery: usedSlug === slot.slug ? slot.searchQuery ?? null : null,
        primary,
        alternate: ranked[1] ?? null,
        noProductsYet: ranked.length === 0,
        budgetAlternate,
      };
    })
  );

  // A hair mask/hairspray/pre-shampoo with no products yet is dropped
  // rather than shown as an empty placeholder - see HAIR_MASK_SLOT,
  // HAIRSPRAY_SLOT, PRE_SHAMPOO_SLOT.
  return results.filter(
    (pick) =>
      !(
        (pick.category === "hair-mask" || pick.category === "hairspray" || pick.category === "pre-shampoo") &&
        pick.noProductsYet
      )
  );
}

// Cheap single-category existence check for /search's "consider adding a
// pre-shampoo" recommendation card (see app/api/pre-shampoo-check/route.ts)
// - reuses rankCategoryProducts for just the one slot instead of running
// the full getRoutineProductPicks pipeline (calendar/all-categories/brand
// products/etc.) that a real /routine page load needs.
export async function hasPreShampooPick(
  porosity: string | null,
  curlType: string | null
): Promise<boolean> {
  const normalizedPorosity = porosity ?? "medium";
  const categoryIds = await loadCategoryIds(["pre-shampoo"]);
  const categoryId = categoryIds.get("pre-shampoo");
  if (!categoryId) return false;
  const ranked = await rankCategoryProducts(
    "pre-shampoo",
    categoryId,
    "pre-shampoo",
    normalizedPorosity,
    curlType,
    null,
    PRE_SHAMPOO_SLOT,
    false
  );
  return ranked.length > 0;
}

// Single-pick version for the routine email - same ranking, just the
// top product per category instead of primary + alternate.
export async function getRoutineProducts(
  porosity: string | null,
  curlType: string | null = null,
  hairConcerns: string[] | null = null,
  colorTreated: boolean = false,
  budgetRange: string | null = null
): Promise<RoutineProductPick[]> {
  return getRoutineProductPicks(porosity, curlType, hairConcerns, colorTreated, budgetRange);
}

// ---- Daily refresh-day products -----------------------------------------
//
// Every day now has a routine (see lib/routineCalendar.ts's scheduledWashType
// - non-wash days used to have no calendar entry at all for curly/coily
// families, and no product recommendations for anyone). These are the
// categories a refresh day actually needs, always with something to show
// per category (a real pick or the existing noProductsYet upsell) rather
// than the day silently having nothing - reuses the exact same
// rankCategoryProducts/loadCategoryIds machinery as getRoutineProductPicks
// above against the same real DB categories (leave-in/oil/dry-shampoo/
// styler), just under refresh-day-specific labels and rationale copy.
export type DailyRefreshProductPick = RoutineProductPick & {
  dailyLabel: string;
  dailyWhy: string;
};

// scalp_condition values other than "normal"/null, or the real
// hair_concerns values 'scalp'/'thinning', count as a scalp concern here -
// there is no 'dry_scalp'/'oily_scalp'/'dandruff' hair_concerns value in
// this app (those concepts live on scalp_condition instead; see
// app/profile/page.tsx's SCALP_OPTIONS/CONCERN_OPTIONS).
function hasDailyScalpConcern(scalpCondition: string | null, hairConcerns: string[] | null): boolean {
  return (
    (scalpCondition !== null && scalpCondition !== "normal") ||
    Boolean(hairConcerns?.includes("scalp")) ||
    Boolean(hairConcerns?.includes("thinning"))
  );
}

function scalpConcernLabel(scalpCondition: string | null, hairConcerns: string[] | null): string {
  if (scalpCondition === "dandruff-prone") return "flaking";
  if (scalpCondition === "dry") return "dryness";
  if (scalpCondition === "oily") return "excess oil";
  if (scalpCondition === "sensitive") return "sensitivity";
  if (hairConcerns?.includes("thinning")) return "thinning";
  return "scalp health";
}

export async function getDailyRefreshProducts(
  porosity: string | null,
  curlType: string | null,
  hairConcerns: string[] | null,
  scalpCondition: string | null,
  colorTreated: boolean = false,
  budgetRange: string | null = null
): Promise<DailyRefreshProductPick[]> {
  const family = curlFamily(curlType);
  const isStraightOrWavy = family === "straight" || family === "wavy";
  const hasScalpConcern = hasDailyScalpConcern(scalpCondition, hairConcerns);

  type Slot = { slot: RoutineCategorySlot; dailyLabel: string; dailyWhy: string };
  const slots: Slot[] = [
    {
      slot: { slug: "leave-in", pickCategory: "daily-leave-in", label: "Leave-In Conditioner", section: "between" },
      dailyLabel: "daily moisture",
      dailyWhy: "applied every day to maintain the moisture your hair lost overnight and throughout the day",
    },
    {
      slot: { slug: "oil", pickCategory: "daily-sealant", label: "Sealant", section: "between" },
      dailyLabel: "end sealant",
      dailyWhy: "seals moisture into the hair shaft and prevents ends from drying out between wash days",
    },
  ];
  if (isStraightOrWavy) {
    slots.push({
      slot: { slug: "dry-shampoo", pickCategory: "daily-dry-shampoo", label: "Dry Shampoo", section: "between" },
      dailyLabel: "root refresh",
      dailyWhy: "absorbs excess oil at the roots between wash days without stripping moisture from the lengths",
    });
  }
  if (hasScalpConcern) {
    slots.push({
      slot: { slug: "oil", pickCategory: "daily-scalp-oil", label: "Scalp Oil", section: "between" },
      dailyLabel: "scalp treatment",
      dailyWhy: `daily scalp oil supports circulation and addresses your ${scalpConcernLabel(scalpCondition, hairConcerns)}`,
    });
  }
  if (isStraightOrWavy) {
    slots.push({
      slot: { slug: "hairspray", pickCategory: "daily-hairspray", label: "Hairspray", section: "between" },
      dailyLabel: "finishing hold",
      dailyWhy: "a light mist after styling keeps your finish in place all day without adding weight",
    });
  }
  slots.push({
    slot: { slug: "styler", pickCategory: "daily-styling", label: "Edge Control / Styling Cream", section: "between" },
    dailyLabel: "styling",
    dailyWhy: "smooths flyaways and keeps your style secure between wash days",
  });

  const normalizedPorosity = porosity ?? "medium";
  const budgetActive = isBudgetActive(budgetRange);
  const maxUsd = budgetMaxUsd(budgetRange);
  const allSlugs = Array.from(new Set(slots.map((s) => s.slot.slug)));
  const categoryIds = await loadCategoryIds(allSlugs);

  const results = await Promise.all(
    slots.map(async ({ slot, dailyLabel, dailyWhy }) => {
      const pickCategory = slot.pickCategory ?? slot.slug;
      const categoryId = categoryIds.get(slot.slug);
      // Passes the real slug (not the "daily-*" pickCategory) into
      // rankCategoryProducts so its internal generateWhyCopy() call finds
      // a real copy branch (dry-shampoo/oil/styler/leave-in all already
      // have one) instead of falling through to its generic-fallback
      // logging - the returned candidate's `why` field isn't shown
      // anywhere for these picks (dailyWhy is, see the /routine page),
      // but there's no reason to let it log a false "unrecognized
      // category" warning on every load either.
      const ranked = categoryId
        ? await rankCategoryProducts(
            slot.slug,
            categoryId,
            slot.slug,
            normalizedPorosity,
            curlType,
            hairConcerns,
            slot,
            colorTreated
          )
        : [];

      const primary = ranked[0] ?? null;
      // Same rule as getRoutineProductPicks above: primary always stays
      // the top pick regardless of price, this only adds an in-budget
      // alternative alongside it.
      const budgetAlternate =
        budgetActive && primary?.priceUsd != null && primary.priceUsd > maxUsd
          ? ranked.find((c) => c.priceUsd != null && c.priceUsd <= maxUsd) ?? null
          : null;

      return {
        category: pickCategory,
        categoryLabel: slot.label,
        section: slot.section,
        searchCategorySlug: slot.slug,
        searchQuery: slot.searchQuery ?? null,
        primary,
        alternate: ranked[1] ?? null,
        noProductsYet: ranked.length === 0,
        budgetAlternate,
        dailyLabel,
        dailyWhy,
      };
    })
  );

  // Same as the main routine list: no empty hairspray placeholder.
  return results.filter((pick) => !(pick.category === "daily-hairspray" && pick.noProductsYet));
}

// ---- Protective-style product picks (braids/locs/wigs) -----------------
//
// Reuses the exact same ranking/scoring/placeholder machinery as the
// natural-hair categories above (rankCategoryProducts/loadCategoryIds),
// against a different slot list keyed by protective style type instead
// of curl family, and against real *existing* categories (shampoo,
// conditioner, leave-in, oil, gel, styler) with name-keyword filters
// rather than inventing a dozen new single-purpose categories that
// would start out with zero tagged products either way.
//
// For wigs this only covers the wig-care section - the natural-hair-
// under-wig section is just the ordinary getRoutineProductPicks output
// (same curl-type/porosity routine as any other profile), composed by
// the caller (app/api/routine/route.ts).
const PROTECTIVE_STYLE_CATEGORIES: Record<ProtectiveStyleType, RoutineCategorySlot[]> = {
  braids: [
    {
      slug: "leave-in",
      pickCategory: "diluted-leave-in",
      label: "Diluted Leave-In (Applicator Bottle)",
      section: "regular",
      searchQuery: "leave-in",
      excludeMatching: { nameKeywords: ["spray"] },
    },
    {
      slug: "leave-in",
      pickCategory: "braid-spray",
      label: "Braid Spray",
      section: "styling",
      searchQuery: "spray",
      onlyMatching: { nameKeywords: ["spray"] },
    },
    {
      slug: "oil",
      label: "Lightweight Scalp Oil",
      section: "regular",
      onlyMatching: { nameKeywords: ["jojoba", "grapeseed"] },
    },
    {
      slug: "shampoo",
      label: "Sulfate-Free Scalp Shampoo",
      section: "regular",
      onlyMatching: { nameKeywords: ["sulfate-free", "sulfate free"] },
    },
    {
      slug: "styler",
      label: "Edge Control",
      section: "styling",
      onlyMatching: { nameKeywords: ["edge"] },
    },
  ],
  locs: [
    {
      slug: "shampoo",
      pickCategory: "loc-shampoo",
      label: "Residue-Free Shampoo",
      section: "regular",
      searchQuery: "residue-free",
      onlyMatching: { nameKeywords: ["residue-free", "residue free", "clarif"] },
    },
    // Doubles as both "scalp oil for between wash days" and "lightweight
    // loc oil" from the spec - there's no ingredient-level signal to
    // meaningfully split those into two distinct picks from the same
    // underlying "oil" category.
    { slug: "oil", label: "Loc & Scalp Oil", section: "regular" },
    { slug: "gel", label: "Retwist Gel/Cream", section: "styling" },
  ],
  wigs: [
    {
      slug: "shampoo",
      pickCategory: "wig-shampoo",
      label: "Wig Shampoo",
      section: "regular",
      searchQuery: "wig",
      onlyMatching: { nameKeywords: ["wig"] },
    },
    {
      slug: "conditioner",
      pickCategory: "wig-conditioner",
      label: "Wig Conditioner",
      section: "regular",
      searchQuery: "wig",
      onlyMatching: { nameKeywords: ["wig"] },
    },
    {
      slug: "leave-in",
      pickCategory: "wig-detangler",
      label: "Wig Detangler Spray",
      section: "styling",
      searchQuery: "detangler",
      onlyMatching: { nameKeywords: ["detangl"] },
    },
  ],
};

// Accessories aren't real scored catalog products (no ingredients to
// score), so they're a flat static list instead of going through
// rankCategoryProducts.
export const PROTECTIVE_STYLE_ACCESSORIES: Record<
  ProtectiveStyleType,
  { label: string; note: string }[]
> = {
  braids: [
    {
      label: "Satin Bonnet or Pillowcase",
      note: "Protects your braids and scalp moisture overnight.",
    },
  ],
  locs: [],
  wigs: [
    {
      label: "Wig Stand",
      note: "Keeps your wig's shape between wears and makes it easier to detangle and style.",
    },
  ],
};

export async function getProtectiveStyleProductPicks(
  styleType: ProtectiveStyleType,
  colorTreated: boolean = false,
  budgetRange: string | null = null
): Promise<RoutineProductPick[]> {
  const slots = PROTECTIVE_STYLE_CATEGORIES[styleType];
  const budgetActive = isBudgetActive(budgetRange);
  const maxUsd = budgetMaxUsd(budgetRange);

  const allSlugs = Array.from(new Set(slots.map((s) => s.slug)));
  const categoryIds = await loadCategoryIds(allSlugs);

  const results = await Promise.all(
    slots.map(async (slot) => {
      const pickCategory = slot.pickCategory ?? slot.slug;
      const categoryId = categoryIds.get(slot.slug);
      // Protective-style picks aren't porosity/curl-type driven - "medium"
      // is just the porosity fetchScoreRows needs to run at all, not a
      // real signal about the wearer's natural hair.
      const ranked = categoryId
        ? await rankCategoryProducts(
            slot.slug,
            categoryId,
            pickCategory,
            "medium",
            null,
            null,
            slot,
            colorTreated
          )
        : [];

      const primary = ranked[0] ?? null;
      const budgetAlternate =
        budgetActive && primary?.priceUsd != null && primary.priceUsd > maxUsd
          ? ranked.find((c) => c.priceUsd != null && c.priceUsd <= maxUsd) ?? null
          : null;

      return {
        category: pickCategory,
        categoryLabel: slot.label,
        section: slot.section,
        searchCategorySlug: slot.slug,
        searchQuery: slot.searchQuery ?? null,
        primary,
        alternate: ranked[1] ?? null,
        noProductsYet: ranked.length === 0,
        budgetAlternate,
      };
    })
  );

  return results;
}

export type AvoidIngredient = {
  ingredientName: string;
  score: number; // 0-100
  reason: string | null;
};

// Lowest-scoring ingredients for the user's porosity - unrelated to the
// product-recommendation bug above (this has always been legitimately
// ingredient-based: "avoid ingredients," not "here's a product"). Left
// as-is.
export async function getIngredientsToAvoid(
  porosity: string | null,
  limit = 5
): Promise<AvoidIngredient[]> {
  const normalizedPorosity = porosity === "not sure" ? null : porosity;
  const admin = getSupabaseAdmin();

  let query = admin
    .from("compatibility_scores")
    .select("score, reason, ingredients!inner(inci_name, common_name)")
    .order("score", { ascending: true })
    .limit(limit * 3); // over-fetch since porosity/name filtering happens client-side below

  if (normalizedPorosity) {
    query = query.or(`porosity.is.null,porosity.eq.${normalizedPorosity}`);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  const byIngredient = new Map<string, AvoidIngredient>();
  for (const row of data) {
    const ingredient = Array.isArray(row.ingredients)
      ? row.ingredients[0]
      : row.ingredients;
    const name = ingredient?.common_name ?? ingredient?.inci_name;
    if (!name || byIngredient.has(name)) continue;
    byIngredient.set(name, {
      ingredientName: name,
      score: row.score * 10,
      reason: row.reason,
    });
  }

  return Array.from(byIngredient.values())
    .sort((a, b) => a.score - b.score)
    .slice(0, limit);
}
