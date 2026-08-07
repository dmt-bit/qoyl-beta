import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isAuthorizedAdmin } from "@/lib/adminAuth";
import { matchIngredientNames, parseIngredientListRaw } from "@/lib/adminProducts";

export async function GET(request: Request) {
  if (!isAuthorizedAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const admin = getSupabaseAdmin();

  const [
    { data: products, error: productsError },
    { data: brands },
    { data: categories },
    { data: productIngredients },
    { data: scoredRows },
  ] = await Promise.all([
    admin
      .from("catalog_products")
      .select(
        "id, name, barcode, size, image_url, country, is_verified, source, ingredient_list_raw, ingredient_list_normalized, brand_id, category_id, created_at, updated_at, catalog_brands(name), categories(name)"
      )
      .order("created_at", { ascending: false }),
    admin.from("catalog_brands").select("id, name").order("name"),
    admin.from("categories").select("id, name").order("name"),
    admin.from("catalog_product_ingredients").select("product_id, ingredient_id"),
    admin.from("compatibility_scores").select("ingredient_id"),
  ]);

  if (productsError || !products) {
    return NextResponse.json(
      { error: productsError?.message ?? "Failed to load products." },
      { status: 500 }
    );
  }

  const scoredIngredientIds = new Set(
    (scoredRows ?? []).map((r) => r.ingredient_id)
  );

  const matchedIdsByProduct = new Map<string, string[]>();
  for (const row of productIngredients ?? []) {
    const list = matchedIdsByProduct.get(row.product_id) ?? [];
    list.push(row.ingredient_id);
    matchedIdsByProduct.set(row.product_id, list);
  }

  const productsWithMatchRate = products.map((p) => {
    const total = p.ingredient_list_normalized?.length ?? 0;
    const matchedIds = matchedIdsByProduct.get(p.id) ?? [];
    const scoredCount = matchedIds.filter((id) =>
      scoredIngredientIds.has(id)
    ).length;

    return {
      ...p,
      brand_name:
        (p.catalog_brands as unknown as { name: string } | null)?.name ?? null,
      category_name:
        (p.categories as unknown as { name: string } | null)?.name ?? null,
      match_rate: total > 0 ? Math.round((scoredCount / total) * 100) : null,
    };
  });

  return NextResponse.json({
    products: productsWithMatchRate,
    brands: brands ?? [],
    categories: categories ?? [],
  });
}

export async function POST(request: Request) {
  if (!isAuthorizedAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json();
  const {
    brand_id,
    category_id,
    name,
    barcode,
    size,
    image_url,
    ingredient_list_raw,
  }: {
    brand_id?: string | null;
    category_id?: string | null;
    name?: string;
    barcode?: string | null;
    size?: string | null;
    image_url?: string | null;
    ingredient_list_raw?: string | null;
  } = body;

  if (!name || !name.trim()) {
    return NextResponse.json(
      { error: "Product name is required." },
      { status: 400 }
    );
  }

  const normalizedNames = ingredient_list_raw
    ? parseIngredientListRaw(ingredient_list_raw)
    : [];

  const admin = getSupabaseAdmin();

  const { data: product, error: insertError } = await admin
    .from("catalog_products")
    .insert({
      brand_id: brand_id || null,
      category_id: category_id || null,
      name: name.trim(),
      barcode: barcode?.trim() || null,
      size: size?.trim() || null,
      image_url: image_url?.trim() || null,
      source: "manual",
      ingredient_list_raw: ingredient_list_raw?.trim() || null,
      ingredient_list_normalized: normalizedNames,
    })
    .select()
    .single();

  if (insertError || !product) {
    return NextResponse.json(
      { error: insertError?.message ?? "Failed to create product." },
      { status: 500 }
    );
  }

  let matchSummary = {
    totalCount: 0,
    matchedCount: 0,
    createdCount: 0,
    createdNames: [] as string[],
  };

  if (normalizedNames.length > 0) {
    const { linkRows, ...summary } = await matchIngredientNames(normalizedNames);
    matchSummary = summary;

    if (linkRows.length > 0) {
      await admin.from("catalog_product_ingredients").insert(
        linkRows.map((row) => ({
          product_id: product.id,
          ingredient_id: row.ingredient_id,
          position: row.position,
        }))
      );
    }
  }

  return NextResponse.json({ product, ...matchSummary });
}
