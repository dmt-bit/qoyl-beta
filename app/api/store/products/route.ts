import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// Public, no auth required. Powers the /store page and future
// personalized store views from style match results.
//
// ?category=shampoo     — filter by category slug
// ?q=olaplex            — name/brand search
// ?limit=48             — page size (default 48, max 96)
// ?offset=0             — pagination offset

type ProductRow = {
  id: string;
  name: string;
  barcode: string | null;
  image_url: string | null;
  processed_image_url: string | null;
  price_usd: number | null;
  average_score?: number | null;
  catalog_brands: { name: string; slug: string; website_domain: string | null } | null;
  categories: { slug: string; name: string } | null;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") ?? null;
  const q = searchParams.get("q") ?? null;
  const rawLimit = parseInt(searchParams.get("limit") ?? "48", 10);
  const limit = isNaN(rawLimit) ? 48 : Math.min(rawLimit, 96);
  const rawOffset = parseInt(searchParams.get("offset") ?? "0", 10);
  const offset = isNaN(rawOffset) ? 0 : rawOffset;

  const admin = getSupabaseAdmin();

  // Check whether average_score column exists (added in a migration;
  // may not be present in all environments).
  const { error: scoreColErr } = await admin
    .from("catalog_products")
    .select("average_score")
    .limit(1);
  const hasAverageScore = !scoreColErr;

  const selectFields = hasAverageScore
    ? "id, name, barcode, image_url, processed_image_url, price_usd, average_score, catalog_brands(name, slug, website_domain), categories(slug, name)"
    : "id, name, barcode, image_url, processed_image_url, price_usd, catalog_brands(name, slug, website_domain), categories(slug, name)";

  // If filtering by category slug, resolve it to a UUID first.
  // catalog_products.category_id is a UUID FK, not the slug string.
  let categoryId: string | null = null;
  if (category) {
    const { data: catRow } = await admin
      .from("categories")
      .select("id")
      .eq("slug", category)
      .maybeSingle();
    categoryId = catRow?.id ?? null;
    // If category slug not found, return empty rather than querying all products
    if (!categoryId) {
      return NextResponse.json({ products: [], total: 0, offset, limit });
    }
  }

  let query = admin
    .from("catalog_products")
    .select(selectFields)
    .range(offset, offset + limit - 1);

  if (hasAverageScore) {
    query = query.order("average_score", { ascending: false, nullsFirst: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  if (q) {
    query = query.ilike("name", `%${q}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[store/products] query error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const products = (data as unknown as ProductRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    brand: row.catalog_brands?.name ?? null,
    brand_slug: row.catalog_brands?.slug ?? null,
    category: row.categories?.slug ?? null,
    category_name: row.categories?.name ?? null,
    image_url: row.processed_image_url ?? row.image_url,
    price_usd: row.price_usd,
    average_score: row.average_score ?? null,
  }));

  return NextResponse.json({ products, total: products.length, offset, limit });
}
