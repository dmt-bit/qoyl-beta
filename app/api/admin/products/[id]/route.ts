import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isAuthorizedAdmin } from "@/lib/adminAuth";
import { matchIngredientNames, parseIngredientListRaw } from "@/app/api/admin/products/route";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
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
    is_verified,
  }: {
    brand_id?: string | null;
    category_id?: string | null;
    name?: string;
    barcode?: string | null;
    size?: string | null;
    image_url?: string | null;
    ingredient_list_raw?: string | null;
    is_verified?: boolean;
  } = body;

  const admin = getSupabaseAdmin();

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (brand_id !== undefined) updates.brand_id = brand_id || null;
  if (category_id !== undefined) updates.category_id = category_id || null;
  if (name !== undefined) updates.name = name.trim();
  if (barcode !== undefined) updates.barcode = barcode?.trim() || null;
  if (size !== undefined) updates.size = size?.trim() || null;
  if (image_url !== undefined) updates.image_url = image_url?.trim() || null;
  if (is_verified !== undefined) updates.is_verified = is_verified;

  let unmatched: string[] = [];

  // Re-parsing the ingredient list replaces product_ingredients entirely
  // rather than merging -- positions shift whenever the list changes, so
  // a partial merge would leave stale/incorrect position values behind.
  if (ingredient_list_raw !== undefined) {
    const normalizedNames = ingredient_list_raw
      ? parseIngredientListRaw(ingredient_list_raw)
      : [];
    updates.ingredient_list_raw = ingredient_list_raw?.trim() || null;
    updates.ingredient_list_normalized = normalizedNames;

    await admin.from("product_ingredients").delete().eq("product_id", params.id);

    if (normalizedNames.length > 0) {
      const matchResult = await matchIngredientNames(normalizedNames);
      unmatched = matchResult.unmatched;

      if (matchResult.matchedRows.length > 0) {
        await admin.from("product_ingredients").insert(
          matchResult.matchedRows.map((row) => ({
            product_id: params.id,
            ingredient_id: row.ingredient_id,
            position: row.position,
          }))
        );
      }
    }
  }

  const { data: product, error } = await admin
    .from("products")
    .update(updates)
    .eq("id", params.id)
    .select()
    .single();

  if (error || !product) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to update product." },
      { status: 500 }
    );
  }

  return NextResponse.json({ product, unmatched });
}
