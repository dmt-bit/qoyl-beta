import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { scoreCatalogProductsForProfile, type ScoringProfile } from "@/lib/compatibility";
import { matchesHairTypeCategory, type HairAdditionPreference } from "@/lib/hairAdditionPreference";

// brand_catalog_products/brand_accounts are shared with qoyl-business
// (the indie brand dashboard at business.qoyl.live lives there, not in
// this repo). Reading them here with the service-role client, the same
// way app/api/style-match/stylists/route.ts reads stylist_accounts,
// means Style Match/Travel Kit/Routine never need an RLS policy or
// GRANT on these shared tables - and it lets us hand back only the
// fields these surfaces actually need (brand_accounts also has email/
// stripe IDs that have no business reaching the client).
export type BrandCatalogItem = {
  id: string;
  name: string;
  description: string | null;
  priceUsd: number | null;
  imageUrl: string | null;
  productUrl: string;
  shopperUrl: string | null;
  category: string;
  isFeatured: boolean;
  brandName: string;
  subscriptionTier: string | null;
  score: number | null;
};

export const ALL_STYLES_SENTINEL = "all-styles";

export function slugifyStyleName(styleName: string): string {
  return styleName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type BrandProductRow = {
  id: string;
  name: string;
  description: string | null;
  price_usd: number | null;
  image_url: string | null;
  product_url: string;
  shopper_url: string | null;
  category: string;
  is_featured: boolean;
  hair_type_category: string | null;
  brand_accounts: { company_name: string | null; subscription_tier: string | null } | null;
};

const BRAND_PRODUCT_SELECT =
  "id, name, description, price_usd, image_url, product_url, shopper_url, category, is_featured, hair_type_category, brand_accounts(company_name, subscription_tier)";

function isFeaturedTier(row: BrandProductRow): boolean {
  const tier = row.brand_accounts?.subscription_tier ?? null;
  return row.is_featured === true || tier === "featured" || tier === "premium";
}

// Ingredient data lives on catalog_products (the main products table),
// not on brand_catalog_products - there's no ingredient column there at
// all. A brand product only gets a compatibility score if its name
// matches a catalog_products row exactly (case-insensitive), reusing
// the same scoring engine every other surface in the app funnels
// through rather than a second scoring implementation.
async function scoreBrandProductsByName(
  admin: ReturnType<typeof getSupabaseAdmin>,
  rows: { id: string; name: string }[],
  profile: ScoringProfile | null
): Promise<Record<string, number | null>> {
  if (!profile || rows.length === 0) return {};

  const { data: matches } = await admin
    .from("catalog_products")
    .select("id, name")
    .in(
      "name",
      rows.map((r) => r.name)
    );
  if (!matches || matches.length === 0) return {};

  const catalogIdByBrandProductId = new Map<string, string>();
  for (const row of rows) {
    const match = matches.find((m) => m.name.toLowerCase() === row.name.toLowerCase());
    if (match) catalogIdByBrandProductId.set(row.id, match.id);
  }
  const catalogIds = Array.from(catalogIdByBrandProductId.values());
  if (catalogIds.length === 0) return {};

  const scored = await scoreCatalogProductsForProfile(catalogIds, profile);
  const result: Record<string, number | null> = {};
  for (const [brandProductId, catalogId] of Array.from(catalogIdByBrandProductId.entries())) {
    result[brandProductId] = scored[catalogId]?.result?.normalizedScore ?? null;
  }
  return result;
}

function toItem(row: BrandProductRow, score: number | null): BrandCatalogItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    priceUsd: row.price_usd,
    imageUrl: row.image_url,
    productUrl: row.product_url,
    shopperUrl: row.shopper_url,
    category: row.category,
    isFeatured: isFeaturedTier(row),
    brandName: row.brand_accounts?.company_name ?? "Qoyl Partner Brand",
    subscriptionTier: row.brand_accounts?.subscription_tier ?? null,
    score,
  };
}

// Used by the Style Match shopping list (via the /api/style-match/
// brand-products bridge, since that pipeline runs client-side) - one
// active, style-relevant brand product per requested category, ordered
// featured-first then oldest-first (matches the request's own ordering:
// is_featured desc, created_at asc).
export async function fetchBrandProductsForCategories(
  categorySlugs: string[],
  styleSlug: string | null,
  profile: ScoringProfile | null,
  limitPerCategory = 3,
  hairAdditionPreference: HairAdditionPreference | null = null
): Promise<Record<string, BrandCatalogItem[]>> {
  if (categorySlugs.length === 0) return {};
  const admin = getSupabaseAdmin();

  let query = admin
    .from("brand_catalog_products")
    .select(BRAND_PRODUCT_SELECT)
    .eq("is_active", true)
    .in("category", categorySlugs);

  if (styleSlug) {
    query = query.overlaps("style_relevance", [styleSlug, ALL_STYLES_SENTINEL]);
  }

  const { data, error } = await query
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: true });

  if (error || !data) {
    console.error("[brandCatalogProducts] category query failed:", error);
    return {};
  }

  // Item 6 - filtered in JS rather than a WHERE clause since a product
  // with no hair_type_category set (true for every row until
  // qoyl-business's brand form starts asking for it) must still pass
  // through, and a NULL-inclusive OR is awkward to express through the
  // Supabase query builder across every preference branch.
  const rows = (data as unknown as BrandProductRow[]).filter((row) =>
    matchesHairTypeCategory(hairAdditionPreference, row.hair_type_category)
  );
  const scoreByProductId = await scoreBrandProductsByName(admin, rows, profile);

  const byCategory: Record<string, BrandCatalogItem[]> = {};
  for (const row of rows) {
    const bucket = (byCategory[row.category] ??= []);
    if (bucket.length >= limitPerCategory) continue;
    bucket.push(toItem(row, scoreByProductId[row.id] ?? null));
  }
  return byCategory;
}

// Used by the Travel Kit generator - active brand products whose
// hair_types_served overlaps the traveler's curl type/family, with
// climate_tags (see supabase/brand_catalog_climate_tags.sql) overlapping
// the trip's destination climate given priority via sort, not as a hard
// filter (an untagged product still shows, just not boosted).
export async function fetchBrandProductsForTravel(
  categorySlugs: string[],
  hairTypeTags: string[],
  climate: string | null,
  profile: ScoringProfile | null,
  limitPerCategory = 1
): Promise<Record<string, BrandCatalogItem[]>> {
  if (categorySlugs.length === 0) return {};
  const admin = getSupabaseAdmin();

  let query = admin
    .from("brand_catalog_products")
    .select(`${BRAND_PRODUCT_SELECT}, climate_tags`)
    .eq("is_active", true)
    .in("category", categorySlugs);

  if (hairTypeTags.length > 0) {
    query = query.overlaps("hair_types_served", hairTypeTags);
  }

  const { data, error } = await query.order("is_featured", { ascending: false });
  if (error || !data) {
    console.error("[brandCatalogProducts] travel query failed:", error);
    return {};
  }

  const rows = data as unknown as (BrandProductRow & { climate_tags: string[] | null })[];
  const scoreByProductId = await scoreBrandProductsByName(admin, rows, profile);

  // Climate match first (within is_featured groups already applied by
  // the DB order above), then keep the featured-first ordering.
  const sorted = [...rows].sort((a, b) => {
    const aFeatured = isFeaturedTier(a) ? 1 : 0;
    const bFeatured = isFeaturedTier(b) ? 1 : 0;
    if (aFeatured !== bFeatured) return bFeatured - aFeatured;
    const aClimate = climate && (a.climate_tags ?? []).includes(climate) ? 1 : 0;
    const bClimate = climate && (b.climate_tags ?? []).includes(climate) ? 1 : 0;
    return bClimate - aClimate;
  });

  const byCategory: Record<string, BrandCatalogItem[]> = {};
  for (const row of sorted) {
    const bucket = (byCategory[row.category] ??= []);
    if (bucket.length >= limitPerCategory) continue;
    bucket.push(toItem(row, scoreByProductId[row.id] ?? null));
  }
  return byCategory;
}

// Used by the Routine page's "From Qoyl partner brands" section - not
// slotted into a specific category, just the best 2-3 active products
// tagged for this curl type, featured-first.
export async function fetchBrandProductsForCurlType(
  curlType: string | null,
  curlFamilyTag: string | null,
  profile: ScoringProfile | null,
  limit = 3
): Promise<BrandCatalogItem[]> {
  const tags = [curlType, curlFamilyTag].filter((t): t is string => Boolean(t));
  if (tags.length === 0) return [];

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("brand_catalog_products")
    .select(BRAND_PRODUCT_SELECT)
    .eq("is_active", true)
    .overlaps("hair_types_served", tags)
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error || !data) {
    console.error("[brandCatalogProducts] curl-type query failed:", error);
    return [];
  }

  const rows = data as unknown as BrandProductRow[];
  const scoreByProductId = await scoreBrandProductsByName(admin, rows, profile);
  return rows.map((row) => toItem(row, scoreByProductId[row.id] ?? null));
}

// Item 5 step 3 - fire-and-forget impression tracking for the Style
// Match shopping list only (the only surface this was actually asked
// for). style_match_id/brand_catalog_product_id are both nullable FKs
// on style_match_product_impressions, so this never blocks on schema.
export async function recordShoppingListImpressions(
  styleMatchId: string | null,
  productIds: string[]
): Promise<void> {
  if (!styleMatchId || productIds.length === 0) return;
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("style_match_product_impressions").insert(
    productIds.map((id) => ({
      style_match_id: styleMatchId,
      brand_catalog_product_id: id,
      appeared_in: "shopping_list",
    }))
  );
  if (error) {
    console.error("[brandCatalogProducts] impression insert failed:", error);
  }
}
