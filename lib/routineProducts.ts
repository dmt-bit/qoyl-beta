import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getAffiliateLink } from "@/lib/affiliateLinks";
import {
  buildScoringProfile,
  curlFamily,
  scoreCatalogProductsForProfile,
  type Match,
} from "@/lib/compatibility";

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

// Candidate pool size per category -- large enough to give the scorer a
// real spread to rank without fetching the entire catalog on every
// routine load.
const CANDIDATE_POOL_SIZE = 25;

export type RoutineProductCandidate = {
  productName: string;
  brandName: string;
  score: number; // 0-100
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

const SULFATE_NAME_PATTERN = /sulfate|\bsls\b|\bsles\b/i;

// One sentence, grounded in the actual scored ingredient matches for
// THIS product -- not a generic ingredient blurb. Shampoo gets a
// dedicated sulfate-free check since that's the single most common
// "why this cleanser" reason; every other category falls back to
// naming whichever well-rated ingredient carried the most weight in the
// score, or a plainer profile-match statement if nothing stood out.
function generateWhyCopy(
  categorySlug: string,
  matches: Match[],
  normalizedScore: number,
  porosity: string,
  curlType: string | null
): string {
  const family = curlFamily(curlType);
  const profileDescriptor = porosity && porosity !== "not sure" && porosity !== "not_sure"
    ? `${porosity} porosity${family ? ` ${curlType}` : ""} hair`
    : family
    ? `${family} hair`
    : "your hair profile";

  if (categorySlug === "shampoo") {
    const hasSulfates = matches.some((m) => SULFATE_NAME_PATTERN.test(m.ingredient_name));
    if (!hasSulfates) {
      return family
        ? `Sulfate-free cleanser that won't strip your natural ${family} texture.`
        : "Sulfate-free cleanser that cleanses without stripping natural oils.";
    }
  }

  const topGoodMatch = [...matches]
    .filter((m) => m.rating === "good" && m.position <= 10)
    .sort((a, b) => b.weight * b.score - a.weight * a.score)[0];

  if (topGoodMatch) {
    return `Scores well for ${profileDescriptor} — ${topGoodMatch.ingredient_name} near the top of the ingredient list is a strong match for your profile.`;
  }

  return `Scores ${normalizedScore}/100 for ${profileDescriptor} based on its full ingredient list.`;
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

  return candidates
    .map((row) => {
      const result = scores[row.id]?.result;
      // No linked ingredient data for this product yet -- can't produce a
      // real score or a grounded "why," so it's not a usable candidate
      // rather than a false 0.
      if (!result || result.matches.length === 0) return null;

      const brandName = brandNameOf(row);
      return {
        productName: row.name,
        brandName,
        score: result.normalizedScore,
        why: generateWhyCopy(categorySlug, result.matches, result.normalizedScore, profile.porosity, curlType),
        affiliateLink: getAffiliateLink(row.name, brandName),
      };
    })
    .filter((c): c is RoutineProductCandidate => c !== null)
    .sort((a, b) => b.score - a.score);
}

async function loadCategoryIds(): Promise<Map<string, string>> {
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("categories")
    .select("id, slug")
    .in("slug", ROUTINE_CATEGORIES.map((c) => c.slug));

  return new Map((data ?? []).map((row) => [row.slug as string, row.id as string]));
}

export async function getRoutineProductPicks(
  porosity: string | null,
  curlType: string | null = null,
  hairConcerns: string[] | null = null
): Promise<RoutineProductPick[]> {
  const normalizedPorosity = porosity ?? "medium";
  const categoryIds = await loadCategoryIds();

  // Six categories x a candidates fetch + a scoring pass each -- run
  // concurrently rather than one at a time, both for responsiveness and
  // to stay well under Vercel Hobby's ~10s function timeout.
  const results = await Promise.all(
    ROUTINE_CATEGORIES.map(async (category) => {
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
