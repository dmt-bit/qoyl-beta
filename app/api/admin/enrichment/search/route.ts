import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isAuthorizedAdmin } from "@/lib/adminAuth";
import {
  calculateMatchConfidence,
  fetchOBFByBarcode,
  parseOBFIngredients,
  searchOBFByName,
} from "@/lib/openBeautyFacts";

type ProductRow = {
  id: string;
  name: string;
  barcode: string | null;
  catalog_brands: { name: string } | null;
  catalog_product_ingredients: { count: number }[];
};

// Paginated defensively - PostgREST caps an unpaginated select() at 1000
// rows, and catalog_products will eventually cross that (see the same fix
// in lib/ingredientScoring.ts, applied after that exact truncation caused a
// real bug there).
async function fetchProductsWithCounts(): Promise<ProductRow[]> {
  const admin = getSupabaseAdmin();
  let all: ProductRow[] = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data } = await admin
      .from("catalog_products")
      .select("id, name, barcode, catalog_brands(name), catalog_product_ingredients(count)")
      .range(from, from + pageSize - 1);
    all = all.concat((data ?? []) as unknown as ProductRow[]);
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

function ingredientCount(p: ProductRow): number {
  return p.catalog_product_ingredients?.[0]?.count ?? 0;
}

// Stats for the enrichment page's header cards + coverage bar.
export async function GET(request: Request) {
  if (!isAuthorizedAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const products = await fetchProductsWithCounts();
    const complete = products.filter((p) => ingredientCount(p) >= 5).length;
    const partial = products.filter((p) => {
      const c = ingredientCount(p);
      return c >= 1 && c <= 4;
    }).length;
    const empty = products.filter((p) => ingredientCount(p) === 0).length;

    return NextResponse.json({ totalProducts: products.length, complete, partial, empty });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load enrichment stats." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!isAuthorizedAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const limit = typeof body.limit === "number" && body.limit > 0 ? Math.min(body.limit, 50) : 20;
  const useBarcode = Boolean(body.useBarcode);

  const products = await fetchProductsWithCounts();
  const incomplete = products
    .filter((p) => ingredientCount(p) < 5)
    .slice(0, limit);

  const results = [];

  for (const product of incomplete) {
    const brandName = product.catalog_brands?.name ?? "";
    let obfMatch = null;

    if (useBarcode && product.barcode) {
      obfMatch = await fetchOBFByBarcode(product.barcode);
    }

    if (!obfMatch) {
      obfMatch = await searchOBFByName(product.name, brandName);
    }

    if (!obfMatch) continue;

    const confidence = calculateMatchConfidence({ name: product.name, brand: brandName }, obfMatch);
    const obfIngredients = parseOBFIngredients(obfMatch);
    if (obfIngredients.length === 0) continue;

    results.push({
      our_product_id: product.id,
      our_product_name: product.name,
      our_brand: brandName,
      our_ingredient_count: ingredientCount(product),
      obf_product_name: obfMatch.product_name,
      obf_brand: obfMatch.brands,
      obf_ingredient_count: obfIngredients.length,
      obf_ingredients: obfIngredients,
      confidence,
    });
  }

  return NextResponse.json({ results });
}
