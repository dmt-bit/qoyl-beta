import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { buildScoringProfile, curlFamily, scoreCatalogProductsForProfile } from "@/lib/compatibility";
import { CATEGORY_LABEL_BY_SLUG } from "@/lib/productCategories";
import { fetchBrandProductsForTravel, type BrandCatalogItem } from "@/lib/brandCatalogProducts";

export type TravelKitProduct = {
  catalogProductId: string;
  name: string;
  brand: string;
  categorySlug: string;
  categoryLabel: string;
  score: number;
  reason: string;
  // Set only for a Qoyl Partner Brand pick (item 7) - lets the caller
  // (the Stripe webhook's PDF/email generation) badge it distinctly
  // from a regular catalog_products pick.
  isBrandProduct?: boolean;
  brandProductUrl?: string;
  brandShopperUrl?: string | null;
};

export type GenerateTravelKitInput = {
  userId: string;
  climate: string | null; // ClimateZone value, or "similar_to_home"
  swimming: string | null;
  protectiveStyle: string | null;
  hairPriority: string | null;
};

// Deterministic category selection so the kit always covers the trip's
// actual needs instead of a fixed generic 5 - a base of
// shampoo/conditioner/leave-in (every trip needs these), then up to two
// more slots driven by swimming exposure, protective style, and hair
// priority, backfilled with sensible defaults if fewer than 5 signals
// fire.
function pickCategories(input: GenerateTravelKitInput): string[] {
  const categories = new Set<string>(["shampoo", "conditioner", "leave-in"]);

  // Chlorine/salt water calls for a clarifying/chelating product -
  // "treatment" is where those ingredients (citric acid, EDTA, sodium
  // phytate) live in the catalog, same as the hard-water scoring boost
  // elsewhere in the app.
  if (input.swimming && input.swimming !== "no_swimming") {
    categories.add("treatment");
  }

  if (
    input.protectiveStyle &&
    input.protectiveStyle !== "none" &&
    input.protectiveStyle !== "not_sure"
  ) {
    categories.add("scalp-treatment");
  }

  const priorityCategory: Record<string, string> = {
    low_maintenance: "styler",
    moisture: "oil",
    definition: "curl-cream",
    scalp_health: "scalp-treatment",
  };
  const fromPriority = input.hairPriority
    ? priorityCategory[input.hairPriority]
    : undefined;
  if (fromPriority) categories.add(fromPriority);

  const fallbackOrder = [
    "oil",
    "styler",
    "curl-cream",
    "gel",
    "scalp-treatment",
    "treatment",
    "deep-conditioner",
  ];
  for (const cat of fallbackOrder) {
    if (categories.size >= 5) break;
    categories.add(cat);
  }

  return Array.from(categories).slice(0, 5);
}

const CLIMATE_REASON: Record<string, string> = {
  humid: "Humidity control for your destination - helps fight frizz without weighing hair down.",
  tropical: "Built for tropical humidity and heat - lightweight moisture without buildup.",
  dry: "Extra sealing for a dry climate - locks in moisture your hair will lose faster there.",
  "cold-dry": "Protein and sealant support for cold, dry air - helps prevent breakage.",
};

function buildReason(
  categorySlug: string,
  climate: string | null,
  swimming: string | null,
  protectiveStyle: string | null
): string {
  const parts: string[] = [];

  if (categorySlug === "treatment" && swimming && swimming !== "no_swimming") {
    parts.push(
      "Clarifying/chelating pick to counter chlorine and mineral buildup from swimming on this trip."
    );
  } else if (
    categorySlug === "scalp-treatment" &&
    protectiveStyle &&
    protectiveStyle !== "none" &&
    protectiveStyle !== "not_sure"
  ) {
    parts.push("Keeps your scalp fresh underneath your protective style for the trip.");
  } else if (climate && CLIMATE_REASON[climate]) {
    parts.push(CLIMATE_REASON[climate]);
  }

  if (parts.length === 0) {
    parts.push("Matched to your hair profile for this trip.");
  }

  return parts.join(" ");
}

function brandItemToTravelKitProduct(
  item: BrandCatalogItem,
  categorySlug: string,
  climate: string | null,
  swimming: string | null,
  protectiveStyle: string | null
): TravelKitProduct {
  return {
    catalogProductId: item.id,
    name: item.name,
    brand: item.brandName,
    categorySlug,
    categoryLabel: CATEGORY_LABEL_BY_SLUG[categorySlug] ?? categorySlug,
    score: item.score ?? 0,
    reason: buildReason(categorySlug, climate, swimming, protectiveStyle),
    isBrandProduct: true,
    brandProductUrl: item.productUrl,
    brandShopperUrl: item.shopperUrl,
  };
}

// Server-side only - fetches the user's hair profile via the service
// role client (no browser session/localStorage exists in the Stripe
// webhook this runs from), scores real catalog products against it
// (climate overridden to the trip's destination climate rather than the
// user's home climate), and picks the single best-scoring product per
// selected category. Returns fewer than 5 items only if the catalog has
// no products in some selected category yet.
export async function generateTravelKitProducts(
  input: GenerateTravelKitInput
): Promise<TravelKitProduct[]> {
  const admin = getSupabaseAdmin();

  const { data: profileRow, error: profileError } = await admin
    .from("hair_profiles")
    .select("curl_type, porosity, scalp_condition, climate, water_hardness, color_treated")
    .eq("user_id", input.userId)
    .maybeSingle();

  if (profileError || !profileRow) {
    console.error(
      "[travel-kit-generator] Couldn't load hair profile:",
      input.userId,
      profileError
    );
    return [];
  }

  const tripClimate = input.climate === "similar_to_home" ? undefined : input.climate;
  const scoringProfile = buildScoringProfile(profileRow, tripClimate);

  const categorySlugs = pickCategories(input);

  // Item 7 - brand_catalog_products checked first, per category, before
  // the main catalog_products table. hair_types_served is matched
  // loosely (both the specific curl type and its family, e.g. "4c" and
  // "coily") since brands may tag either granularity; climate_tags
  // overlapping the trip's destination climate is used to break ties
  // within the featured-first ordering, not as a hard filter.
  const family = curlFamily(profileRow.curl_type);
  const hairTypeTags = [profileRow.curl_type, family].filter(
    (t): t is string => Boolean(t)
  );
  const brandByCategory = await fetchBrandProductsForTravel(
    categorySlugs,
    hairTypeTags,
    tripClimate ?? null,
    scoringProfile
  );

  const results: TravelKitProduct[] = [];
  const usedProductIds = new Set<string>();

  for (const [slug, items] of Object.entries(brandByCategory)) {
    const best = items[0];
    if (!best) continue;
    results.push(brandItemToTravelKitProduct(best, slug, input.climate, input.swimming, input.protectiveStyle));
  }

  const remainingSlugs = categorySlugs.filter((slug) => !brandByCategory[slug]?.length);

  const { data: categoryRows } = await admin
    .from("categories")
    .select("id, slug")
    .in("slug", remainingSlugs);
  const categoryIdBySlug = new Map(
    (categoryRows ?? []).map((c) => [c.slug as string, c.id as string])
  );

  for (const slug of remainingSlugs) {
    const categoryId = categoryIdBySlug.get(slug);
    if (!categoryId) continue;

    const { data: candidates } = await admin
      .from("catalog_products")
      .select("id, name, catalog_brands(name)")
      .eq("category_id", categoryId)
      .limit(15);

    const pool = (candidates ?? []).filter((c) => !usedProductIds.has(c.id));
    if (pool.length === 0) continue;

    const scores = await scoreCatalogProductsForProfile(
      pool.map((c) => c.id),
      scoringProfile
    );

    const best = pool
      .map((c) => ({
        product: c,
        score: scores[c.id]?.result?.normalizedScore ?? -1,
      }))
      .sort((a, b) => b.score - a.score)[0];

    if (!best || best.score < 0) continue;

    usedProductIds.add(best.product.id);
    const brandName =
      (best.product.catalog_brands as unknown as { name: string } | null)?.name ??
      "Unknown brand";

    results.push({
      catalogProductId: best.product.id,
      name: best.product.name,
      brand: brandName,
      categorySlug: slug,
      categoryLabel: CATEGORY_LABEL_BY_SLUG[slug] ?? slug,
      score: best.score,
      reason: buildReason(slug, input.climate, input.swimming, input.protectiveStyle),
    });
  }

  return results;
}
