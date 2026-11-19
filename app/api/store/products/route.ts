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
  average_score: number | null;
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

  let query = admin
    .from("catalog_products")
    .select(
      "id, name, barcode, image_url, processed_image_url, price_usd, average_score, catalog_brands(name, slug, website_domain), categories(slug, name)"
    )
    .not("image_url", "is", null) // only show products with images in the store
    .order("average_score", { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (category) {
    query = query.eq("category_id", category);
  }

  if (q) {
    // ilike on name - simple keyword match for now
    query = query.ilike("name", `%${q}%`);
  }

  const { data, error } = await query;

  if (error) {
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
    average_score: row.average_score,
  }));

  return NextResponse.json({ products, total: products.length, offset, limit });
}
