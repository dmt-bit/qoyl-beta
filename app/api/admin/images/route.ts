import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isAuthorizedAdmin } from "@/lib/adminAuth";
import {
  calculateMatchConfidence,
  fetchOBFByBarcode,
  getOBFImageUrl,
  searchOBFByName,
} from "@/lib/openBeautyFacts";

// Admin image backfill tool.
// GET  -- returns stats: how many products are missing image_url
// POST -- scans up to `limit` products without an image, looks each up
//         on OBF, and returns candidate image URLs for admin review
// PUT  -- accepts { product_id, image_url } and writes it to the DB

type ProductRow = {
  id: string;
  name: string;
  barcode: string | null;
  catalog_brands: { name: string } | null;
};

async function fetchProductsMissingImages(): Promise<ProductRow[]> {
  const admin = getSupabaseAdmin();
  let all: ProductRow[] = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data } = await admin
      .from("catalog_products")
      .select("id, name, barcode, catalog_brands(name)")
      .is("image_url", null)
      .range(from, from + pageSize - 1);
    all = all.concat((data ?? []) as unknown as ProductRow[]);
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

export async function GET(request: Request) {
  if (!isAuthorizedAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const admin = getSupabaseAdmin();
    const [{ count: total }, { count: missing }] = await Promise.all([
      admin.from("catalog_products").select("*", { count: "exact", head: true }),
      admin.from("catalog_products").select("*", { count: "exact", head: true }).is("image_url", null),
    ]);

    return NextResponse.json({
      totalProducts: total ?? 0,
      missingImages: missing ?? 0,
      hasImages: (total ?? 0) - (missing ?? 0),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load stats." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!isAuthorizedAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const limit = typeof body.limit === "number" && body.limit > 0 ? Math.min(body.limit, 30) : 15;
  const useBarcode = body.useBarcode !== false; // default true

  const products = await fetchProductsMissingImages();
  const batch = products.slice(0, limit);

  const results = [];

  for (const product of batch) {
    const brandName = product.catalog_brands?.name ?? "";
    let obfMatch = null;

    if (useBarcode && product.barcode) {
      obfMatch = await fetchOBFByBarcode(product.barcode);
    }

    if (!obfMatch) {
      obfMatch = await searchOBFByName(product.name, brandName);
    }

    if (!obfMatch) continue;

    const imageUrl = getOBFImageUrl(obfMatch);
    if (!imageUrl) continue;

    const confidence = calculateMatchConfidence(
      { name: product.name, brand: brandName },
      obfMatch
    );

    results.push({
      product_id: product.id,
      product_name: product.name,
      brand: brandName,
      barcode: product.barcode,
      obf_product_name: obfMatch.product_name,
      obf_brand: obfMatch.brands,
      image_url: imageUrl,
      confidence,
    });
  }

  return NextResponse.json({ results, scanned: batch.length });
}

export async function PUT(request: Request) {
  if (!isAuthorizedAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { product_id, image_url } = body as { product_id?: string; image_url?: string };

  if (!product_id || !image_url) {
    return NextResponse.json({ error: "product_id and image_url are required." }, { status: 400 });
  }

  // Validate it looks like an https URL before writing.
  if (!image_url.startsWith("https://")) {
    return NextResponse.json({ error: "image_url must be an https:// URL." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("catalog_products")
    .update({ image_url, updated_at: new Date().toISOString() })
    .eq("id", product_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
