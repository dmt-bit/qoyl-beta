import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isAuthorizedAdmin } from "@/lib/adminAuth";
import { findBestIngredientMatch, IngredientRow } from "@/lib/compatibility";

// Splits a raw ingredient list on commas and normalizes each entry's
// capitalization to Title Case, while leaving likely acronyms (BTMS,
// BTMS-50, DL-Panthenol's "DL") alone -- title-casing those would turn
// them into unrecognizable strings.
function normalizeIngredientName(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!trimmed) return trimmed;

  return trimmed
    .split(" ")
    .map((word) => {
      const isLikelyAcronym = word.length > 1 && word === word.toUpperCase();
      if (isLikelyAcronym) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

export function parseIngredientListRaw(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => normalizeIngredientName(s))
    .filter(Boolean);
}

// Matches each normalized ingredient name against the ingredients +
// aliases tables (same tiered matcher used by the live scoring flow in
// lib/compatibility.ts). Returns the rows to insert into
// product_ingredients plus the list of names that matched nothing, for
// the admin UI to flag as needing a new ingredients row.
export async function matchIngredientNames(
  names: string[]
): Promise<{
  matchedRows: { ingredient_id: string; position: number }[];
  unmatched: string[];
}> {
  const admin = getSupabaseAdmin();

  const [{ data: allIngredients }, { data: aliasRows }] = await Promise.all([
    admin.from("ingredients").select("id, inci_name, common_name"),
    admin.from("aliases").select("alias, ingredient_id"),
  ]);

  const aliasMap = new Map<string, string>();
  for (const row of aliasRows ?? []) {
    aliasMap.set(row.alias.trim().toLowerCase(), row.ingredient_id);
  }

  const positionById = new Map<string, number>();
  const unmatched: string[] = [];

  names.forEach((name, index) => {
    const match = findBestIngredientMatch(
      name,
      (allIngredients ?? []) as IngredientRow[],
      aliasMap
    );
    if (match) {
      if (!positionById.has(match.id)) {
        positionById.set(match.id, index + 1);
      }
    } else {
      unmatched.push(name);
    }
  });

  const matchedRows = Array.from(positionById.entries()).map(
    ([ingredient_id, position]) => ({ ingredient_id, position })
  );

  return { matchedRows, unmatched };
}

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
      .from("products")
      .select(
        "id, name, barcode, size, image_url, country, is_verified, source, ingredient_list_raw, ingredient_list_normalized, brand_id, category_id, created_at, updated_at, brands(name), categories(name)"
      )
      .order("created_at", { ascending: false }),
    admin.from("brands").select("id, name").order("name"),
    admin.from("categories").select("id, name").order("name"),
    admin.from("product_ingredients").select("product_id, ingredient_id"),
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
        (p.brands as unknown as { name: string } | null)?.name ?? null,
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
    .from("products")
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

  let unmatched: string[] = [];

  if (normalizedNames.length > 0) {
    const matchResult = await matchIngredientNames(normalizedNames);
    unmatched = matchResult.unmatched;

    if (matchResult.matchedRows.length > 0) {
      await admin.from("product_ingredients").insert(
        matchResult.matchedRows.map((row) => ({
          product_id: product.id,
          ingredient_id: row.ingredient_id,
          position: row.position,
        }))
      );
    }
  }

  return NextResponse.json({ product, unmatched });
}
