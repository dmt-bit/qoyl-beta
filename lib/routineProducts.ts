import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getAffiliateLink } from "@/lib/affiliateLinks";
import {
  buildScoringProfile,
  curlFamily,
  scoreCatalogProductsForProfile,
  type CurlFamily,
} from "@/lib/compatibility";
import type { ProductWeight } from "@/lib/productWeight";

// Real product recommendations for the routine (paid /routine page + its
// email, see app/api/routine/route.ts and lib/sendRoutineEmail.ts).
//
// This used to rank raw *ingredients* from compatibility_scores and
// display the winning ingredient name as if it were a shoppable product
// (there was no real product/brand catalog when it was first built).
// catalog_products/catalog_brands/catalog_product_ingredients exist now
// (the same tables /search, travel kits, and the home feed's product
// spotlight cards already score against) -- this reuses that exact
// scoring engine (scoreCatalogProductsForProfile) instead of duplicating
// it, and returns real product + brand names.

type RoutineCategorySlot = {
  slug: string;
  label: string;
  // "Mousse or Light Hold Gel" / "Curl Cream or Styler" -- if the primary
  // slug has zero ranked candidates, try this slug instead before giving
  // up on the slot entirely. Primary and fallback are never combined into
  // one query: whichever one actually produces results supplies BOTH the
  // primary and alternate pick, so the two are always the same category.
  fallbackSlug?: string;
  fallbackLabel?: string;
  // Only include this slot for the given profile -- e.g. coily's Butter
  // slot only makes sense for high porosity hair.
  include?: (ctx: { porosity: string }) => boolean;
};

// Used only when curl_type is unset/unrecognized (curlFamily() returns
// null) -- every real family below has its own fully custom list.
const FALLBACK_CATEGORIES: RoutineCategorySlot[] = [
  { slug: "shampoo", label: "Shampoo" },
  { slug: "conditioner", label: "Conditioner" },
  { slug: "deep-conditioner", label: "Deep Conditioner" },
  { slug: "leave-in", label: "Leave-In Conditioner" },
  { slug: "styler", label: "Styler" },
  { slug: "oil", label: "Oil" },
];

// Curl-family-specific recommendation lists -- straight/wavy no longer
// share the coily-centric "Sealing Oil"/"Styler"/curl-cream categories
// that never applied to them; curly/coily keep the categories that
// actually match how those textures are cared for.
const FAMILY_ROUTINE_CATEGORIES: Record<CurlFamily, RoutineCategorySlot[]> = {
  straight: [
    { slug: "shampoo", label: "Shampoo" },
    { slug: "dry-shampoo", label: "Dry Shampoo" },
    { slug: "conditioner", label: "Conditioner" },
    { slug: "deep-conditioner", label: "Deep Conditioner" },
    { slug: "heat-protectant", label: "Heat Protectant" },
    // Replaces "Sealing Oil" entirely -- see isProductAllowed below for
    // the lightweight-only (ultralight/light) filter that goes with it.
    { slug: "oil", label: "Finishing Serum" },
  ],
  wavy: [
    { slug: "shampoo", label: "Shampoo" },
    { slug: "co-wash", label: "Co-Wash" },
    { slug: "conditioner", label: "Conditioner" },
    { slug: "deep-conditioner", label: "Deep Conditioner" },
    { slug: "leave-in", label: "Leave-In Conditioner" },
    { slug: "mousse", label: "Mousse", fallbackSlug: "gel", fallbackLabel: "Light Hold Gel" },
    { slug: "heat-protectant", label: "Heat Protectant" },
  ],
  curly: [
    { slug: "shampoo", label: "Shampoo" },
    { slug: "conditioner", label: "Conditioner" },
    { slug: "deep-conditioner", label: "Deep Conditioner" },
    { slug: "leave-in", label: "Leave-In Conditioner" },
    { slug: "curl-cream", label: "Curl Cream", fallbackSlug: "styler", fallbackLabel: "Styler" },
    { slug: "gel", label: "Gel" },
    { slug: "oil", label: "Oil" },
  ],
  coily: [
    { slug: "shampoo", label: "Shampoo" },
    { slug: "deep-conditioner", label: "Deep Conditioner" },
    { slug: "leave-in", label: "Leave-In Conditioner" },
    { slug: "curl-cream", label: "Curl Cream", fallbackSlug: "styler", fallbackLabel: "Styler" },
    { slug: "gel", label: "Gel" },
    { slug: "oil", label: "Sealing Oil" },
    { slug: "butter", label: "Butter", include: ({ porosity }) => porosity === "high" },
  ],
};

function routineCategoriesForFamily(
  family: CurlFamily | null,
  porosity: string
): RoutineCategorySlot[] {
  const slots = family ? FAMILY_ROUTINE_CATEGORIES[family] : FALLBACK_CATEGORIES;
  return slots.filter((slot) => !slot.include || slot.include({ porosity }));
}

// Candidate pool size per category -- large enough to give the scorer a
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
  // ShopButton's logic) -- the web page instead renders <ShopButton
  // productName brandName /> directly, which resolves the same link.
  affiliateLink: string | null;
};

export type RoutineProductPick = {
  category: string; // slug, e.g. "deep-conditioner"
  categoryLabel: string;
  primary: RoutineProductCandidate | null;
  alternate: RoutineProductCandidate | null;
  // True when this category has no catalog products with scoreable
  // ingredient data yet -- the UI/email should show the ingredient-
  // guidance placeholder (see CATEGORY_INGREDIENT_TIPS below) instead of
  // product cards.
  noProductsYet: boolean;
};

// Ingredient-guidance placeholder content lives in lib/categoryGuidance.ts
// (no Supabase imports) instead of here, so client components can import
// it without pulling this file's getSupabaseAdmin() dependency into the
// client bundle. Re-exported for convenience for any server-side caller
// that already imports from this module.
export { getCategoryGuidanceTips } from "@/lib/categoryGuidance";

// Format words that mean "this is a cream/butter/yogurt," independent of
// how the product happens to be filed in the category table -- catalog
// curation can lag or miscategorize (see Almond Jai Twisting Butter,
// filed under "styler" until this was reported), so the name check is a
// backstop for the category-based exclusion below, not a substitute.
const HEAVY_FORMAT_NAME_PATTERN = /butter|pudding|souffl[eé]|whip|yogurt|yoghurt|groyogurt/i;
// Growth-oriented/heavy-format products specifically to steer away from
// for thinning hair, on top of the general weight-based exclusions below.
const THINNING_EXCLUDE_NAME_PATTERN = /growth cream|groyogurt|hair food/i;

// Hard weight/format exclusions layered on top of the scoring modifier in
// lib/compatibility.ts's getWeightModifier -- a heavy product can still
// out-score lighter alternatives on ingredients alone, so these override
// scoring entirely rather than leaving it to compete.
function isProductAllowed(
  candidate: { weight: ProductWeight; categorySlug: string; productName: string },
  family: CurlFamily | null,
  hairConcerns: string[] | null
): boolean {
  const { weight, categorySlug, productName } = candidate;
  const isHeavyFormat = HEAVY_FORMAT_NAME_PATTERN.test(productName);

  // Thinning hair overrides curl-type rules entirely -- never very_heavy
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
  // from everywhere but deep-conditioner for wavy -- so the weight-based
  // halves of "deep-conditioner AND very_heavy" / "leave-in or styler AND
  // heavy-or-very_heavy" are already covered by those per-family rules
  // further down. What's left to add here is the category/name backstop.
  if (family === "straight" || family === "wavy") {
    if (categorySlug === "butter" || categorySlug === "curl-cream") return false;
    if (isHeavyFormat) return false;
  }

  // Straight's "oil" slot is relabeled "Finishing Serum" and is meant to
  // read as shine/frizz control, not moisture sealing -- so it's
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
    if (weight === "heavy" && categorySlug !== "deep-conditioner") return false;
    return true;
  }

  // curly: very_heavy is only excluded from shampoo/leave-in -- deep
  // conditioner and styler/curl-cream allow any weight (styler even
  // prefers heavier formulas for definition, via the scoring modifier).
  if (weight === "very_heavy" && (categorySlug === "shampoo" || categorySlug === "leave-in")) {
    return false;
  }
  return true;
}

// Product-type + hair-type aware, not a generic ingredient blurb.
// Rewritten as a real switch (was cascading ifs) specifically so every
// category has its own explicit branch and a miss is loud (the default
// branch below logs a warning) instead of silently falling through to
// another category's copy.
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
    case "heat-protectant":
      return `Essential for ${curlTypeLabel} hair before any heat styling. Apply evenly to damp hair before blow drying or flat ironing. Look for silicones or film-formers that create a barrier between your hair and the heat tool.`;

    case "dry-shampoo":
      if (hasThinning) {
        return `Lightweight formula to absorb scalp oil between washes without adding weight to thinning strands. Apply only at the roots, never mid-length or ends.`;
      }
      return `Extends your style between wash days by absorbing scalp oil at the roots. Apply to roots only, massage in, then brush or shake out excess.`;

    // "oil" is relabeled "Finishing Serum" for straight (see
    // FAMILY_ROUTINE_CATEGORIES) but the underlying category_id/slug is
    // still "oil" -- "finishing-serum" is kept as an alias in case a
    // distinct category slug is ever added.
    case "finishing-serum":
    case "oil":
      if (family === "straight") {
        return `Finishing serum for ${curlTypeLabel} hair — apply 1-2 drops to dry hair at ends only for shine and frizz control. Avoid roots entirely.`;
      }
      if (family === "curly") {
        return `Lightweight oil for ${porosity} porosity ${curlTypeLabel} hair — apply to ends for shine and to smooth flyaways without weighing curls down.`;
      }
      if (hasThinning) {
        return `Scalp-nourishing formula — massage into scalp to stimulate circulation. Lightweight enough to use without weighing down thinning strands.`;
      }
      return `Sealing oil appropriate for ${porosity} porosity ${curlTypeLabel} hair — apply to ends after styling to lock in moisture.`;

    case "conditioner":
      if (family === "straight") {
        return `Apply to mid-lengths and ends only on ${curlTypeLabel} hair — never at the roots. Rinse thoroughly. Conditioner at the scalp causes the flat, oily look within hours on straight hair.`;
      }
      return `Recommended for ${porosity} porosity ${curlTypeLabel} hair — use weekly for 10-15 minutes then rinse thoroughly. The formula weight is appropriate for occasional deep treatment without risking buildup on fine strands.`;

    case "deep-conditioner":
      if (family === "straight") {
        return `Use once a month on ${curlTypeLabel} hair — not weekly. Apply to mid-lengths and ends only, leave for 10-15 minutes under a shower cap, rinse thoroughly. Monthly deep conditioning prevents damage without over-softening fine strands.`;
      }
      if (family === "wavy") {
        return `Recommended for ${porosity} porosity ${curlTypeLabel} hair — use monthly for 10-15 minutes then rinse thoroughly. The formula weight is appropriate for occasional deep treatment without risking buildup on wavy strands.`;
      }
      return `Strong match for ${porosity} porosity ${curlTypeLabel} hair — apply generously and use heat for maximum penetration.`;

    case "leave-in":
      if (hasThinning) {
        return `Lightweight enough for thinning ${curlTypeLabel} hair — won't weigh down fine strands while providing moisture. Apply sparingly to mid-lengths and ends only, avoid roots.`;
      }
      if (family === "straight") {
        return `Appropriate weight for ${curlTypeLabel} straight hair — apply to damp hair focusing on ends only to avoid root heaviness.`;
      }
      return `Scores well for ${porosity} porosity ${curlTypeLabel} hair based on ingredient compatibility and formula weight.`;

    case "shampoo":
      return `Gentle enough for regular use on ${porosity} porosity ${curlTypeLabel} hair without stripping natural oils.`;

    case "co-wash":
      return `Cleansing conditioner appropriate for ${porosity} porosity ${curlTypeLabel} hair — cleanses gently without sulfates, ideal for a lighter wash day.`;

    case "styler":
    case "gel":
    case "curl-cream":
    case "mousse":
      if (family === "straight") {
        return `Lightweight hold appropriate for ${curlTypeLabel} fine hair — provides structure without weighing strands down.`;
      }
      return `Good hold and definition for ${curlTypeLabel} ${porosity} porosity hair.`;

    case "butter":
      return `Rich sealing formula for ${porosity} porosity ${curlTypeLabel} hair — apply to ends to lock in moisture and protect against breakage.`;

    default:
      console.warn(
        `generateWhyCopy: no specific copy branch for category "${category}" -- using generic fallback.`
      );
      return `Scores well for ${porosity} porosity ${curlTypeLabel} hair based on ingredient compatibility and formula weight.`;
  }
}

type CandidateRow = {
  id: string;
  name: string;
  catalog_brands: { name: string } | { name: string }[] | null;
};

function brandNameOf(row: CandidateRow): string {
  const brand = Array.isArray(row.catalog_brands) ? row.catalog_brands[0] : row.catalog_brands;
  return brand?.name ?? "Unknown brand";
}

// Shared by getRoutineProductPicks (primary + alternate, /routine page)
// and getRoutineProducts (primary only, routine email) so both stay in
// sync with a single query/scoring pass per category. Always returns
// candidates from exactly one category_id -- callers building a pick from
// this result get primary/alternate from the same category by
// construction, never mixed.
async function rankCategoryProducts(
  categorySlug: string,
  categoryId: string,
  porosity: string,
  curlType: string | null,
  hairConcerns: string[] | null
): Promise<RoutineProductCandidate[]> {
  const admin = getSupabaseAdmin();

  const { data: candidates } = await admin
    .from("catalog_products")
    .select("id, name, catalog_brands(name)")
    .eq("category_id", categoryId)
    .order("created_at", { ascending: false })
    .limit(CANDIDATE_POOL_SIZE);

  if (!candidates || candidates.length === 0) return [];

  const profile = buildScoringProfile({
    curl_type: curlType,
    porosity,
    scalp_condition: null,
    climate: null,
    water_hardness: null,
    hair_concerns: hairConcerns,
  });

  const scores = await scoreCatalogProductsForProfile(
    candidates.map((c) => c.id),
    profile
  );

  const family = curlFamily(curlType);

  return candidates
    .map((row) => {
      const result = scores[row.id]?.result;
      // No linked ingredient data for this product yet -- can't produce a
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
      return {
        productName: row.name,
        brandName,
        score: result.normalizedScore,
        weight: result.productWeight,
        why: generateWhyCopy(
          row.name,
          categorySlug,
          curlType,
          profile.porosity,
          result.productWeight,
          hairConcerns
        ),
        affiliateLink: getAffiliateLink(row.name, brandName),
      };
    })
    .filter((c): c is RoutineProductCandidate => c !== null)
    .sort((a, b) => b.score - a.score);
}

async function loadCategoryIds(slugs: string[]): Promise<Map<string, string>> {
  const admin = getSupabaseAdmin();
  const { data } = await admin.from("categories").select("id, slug").in("slug", slugs);

  return new Map((data ?? []).map((row) => [row.slug as string, row.id as string]));
}

export async function getRoutineProductPicks(
  porosity: string | null,
  curlType: string | null = null,
  hairConcerns: string[] | null = null
): Promise<RoutineProductPick[]> {
  const normalizedPorosity = porosity ?? "medium";
  const family = curlFamily(curlType);
  const slots = routineCategoriesForFamily(family, normalizedPorosity);

  const allSlugs = Array.from(
    new Set(slots.flatMap((s) => [s.slug, s.fallbackSlug].filter((x): x is string => Boolean(x))))
  );
  const categoryIds = await loadCategoryIds(allSlugs);

  // Categories x a candidates fetch + a scoring pass each -- run
  // concurrently rather than one at a time, both for responsiveness and
  // to stay well under Vercel Hobby's ~10s function timeout.
  const results = await Promise.all(
    slots.map(async (slot) => {
      const primaryId = categoryIds.get(slot.slug);
      let ranked = primaryId
        ? await rankCategoryProducts(slot.slug, primaryId, normalizedPorosity, curlType, hairConcerns)
        : [];
      let usedSlug = slot.slug;
      let usedLabel = slot.label;

      // Primary category came up empty -- try the fallback (e.g. "Mousse"
      // -> "Light Hold Gel"). Primary and alternate always end up coming
      // from whichever one slug actually produced results, never mixed.
      if (ranked.length === 0 && slot.fallbackSlug) {
        const fallbackId = categoryIds.get(slot.fallbackSlug);
        const fallbackRanked = fallbackId
          ? await rankCategoryProducts(
              slot.fallbackSlug,
              fallbackId,
              normalizedPorosity,
              curlType,
              hairConcerns
            )
          : [];
        if (fallbackRanked.length > 0) {
          ranked = fallbackRanked;
          usedSlug = slot.fallbackSlug;
          usedLabel = slot.fallbackLabel ?? slot.fallbackSlug;
        }
      }

      return {
        category: usedSlug,
        categoryLabel: usedLabel,
        primary: ranked[0] ?? null,
        alternate: ranked[1] ?? null,
        noProductsYet: ranked.length === 0,
      };
    })
  );

  return results;
}

// Single-pick version for the routine email -- same ranking, just the
// top product per category instead of primary + alternate.
export async function getRoutineProducts(
  porosity: string | null,
  curlType: string | null = null,
  hairConcerns: string[] | null = null
): Promise<RoutineProductPick[]> {
  return getRoutineProductPicks(porosity, curlType, hairConcerns);
}

export type AvoidIngredient = {
  ingredientName: string;
  score: number; // 0-100
  reason: string | null;
};

// Lowest-scoring ingredients for the user's porosity -- unrelated to the
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
