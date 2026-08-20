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

const ROUTINE_CATEGORIES: { slug: string; label: string }[] = [
  { slug: "shampoo", label: "Shampoo" },
  { slug: "conditioner", label: "Conditioner" },
  { slug: "deep-conditioner", label: "Deep Conditioner" },
  { slug: "leave-in", label: "Leave-In Conditioner" },
  { slug: "styler", label: "Styler" },
  { slug: "oil", label: "Sealing Oil" },
];

// Extra category per curl family, inserted right after shampoo: straight
// hair gets dry shampoo as a between-full-wash-day option; wavy, curly,
// and coily all get co-wash as a lighter/primary cleansing alternative to
// a full shampoo.
const FAMILY_EXTRA_CATEGORY: Record<CurlFamily, { slug: string; label: string }> = {
  straight: { slug: "dry-shampoo", label: "Dry Shampoo" },
  wavy: { slug: "co-wash", label: "Co-Wash" },
  curly: { slug: "co-wash", label: "Co-Wash" },
  coily: { slug: "co-wash", label: "Co-Wash" },
};

function routineCategoriesForFamily(family: CurlFamily | null): { slug: string; label: string }[] {
  if (!family) return ROUTINE_CATEGORIES;
  const [shampoo, ...rest] = ROUTINE_CATEGORIES;
  return [shampoo, FAMILY_EXTRA_CATEGORY[family], ...rest];
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
  // ingredient data yet -- the UI/email should show a "still building
  // this category" link to /search instead of product cards.
  noProductsYet: boolean;
};

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
  // conditioner and styler allow any weight (styler even prefers heavier
  // formulas for definition, via the scoring modifier).
  if (weight === "very_heavy" && (categorySlug === "shampoo" || categorySlug === "leave-in")) {
    return false;
  }
  return true;
}

// Product-type + hair-type aware, not a generic ingredient blurb --
// replaces the old version's "BTMS near the top of the ingredient list"
// style copy, which didn't say anything about whether the product's
// actual weight/format made sense for this category or hair type.
// productName/weight aren't referenced in every branch below, but are
// kept in the signature for a consistent shape across all of them.
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

  if (category === "deep-conditioner" || category === "conditioner") {
    if (family === "straight" || family === "wavy") {
      return `Recommended for ${porosity} porosity ${curlTypeLabel} hair — use weekly for 10-15 minutes then rinse thoroughly. The formula weight is appropriate for occasional deep treatment without risking buildup on fine strands.`;
    }
    return `Strong match for ${porosity} porosity ${curlTypeLabel} hair — apply generously and use heat for maximum penetration.`;
  }

  if (category === "leave-in") {
    if (hasThinning) {
      return `Lightweight enough for thinning ${curlTypeLabel} hair — won't weigh down fine strands while providing moisture. Apply sparingly to mid-lengths and ends only, avoid roots.`;
    }
    if (family === "straight") {
      return `Appropriate weight for ${curlTypeLabel} straight hair — apply to damp hair focusing on ends only to avoid root heaviness.`;
    }
  }

  if (category === "shampoo") {
    return `Gentle enough for regular use on ${porosity} porosity ${curlTypeLabel} hair without stripping natural oils.`;
  }

  if (category === "styler" || category === "gel") {
    if (family === "straight") {
      return `Lightweight hold appropriate for ${curlTypeLabel} fine hair — provides structure without weighing strands down.`;
    }
    return `Good hold and definition for ${curlTypeLabel} ${porosity} porosity hair.`;
  }

  if (category === "oil") {
    if (hasThinning) {
      return `Scalp-nourishing formula — massage into scalp to stimulate circulation. Lightweight enough to use without weighing down thinning strands.`;
    }
    return `Sealing oil appropriate for ${porosity} porosity ${curlTypeLabel} hair — apply to ends after styling to lock in moisture.`;
  }

  // Generic fallback -- still better than "BTMS near the top."
  return `Scores well for ${porosity} porosity ${curlTypeLabel} hair based on ingredient compatibility and formula weight.`;
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
// sync with a single query/scoring pass per category.
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
  const categories = routineCategoriesForFamily(family);
  const categoryIds = await loadCategoryIds(categories.map((c) => c.slug));

  // Categories x a candidates fetch + a scoring pass each -- run
  // concurrently rather than one at a time, both for responsiveness and
  // to stay well under Vercel Hobby's ~10s function timeout.
  const results = await Promise.all(
    categories.map(async (category) => {
      const categoryId = categoryIds.get(category.slug);
      const ranked = categoryId
        ? await rankCategoryProducts(category.slug, categoryId, normalizedPorosity, curlType, hairConcerns)
        : [];

      return {
        category: category.slug,
        categoryLabel: category.label,
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
