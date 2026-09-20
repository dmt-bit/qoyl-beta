import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isAuthorizedAdmin } from "@/lib/adminAuth";
import { matchIngredientNames } from "@/lib/adminProducts";
import { generateScoresForIngredientIds } from "@/lib/ingredientScoring";

export async function POST(request: Request) {
  if (!isAuthorizedAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { product_id, obf_ingredients }: { product_id?: string; obf_ingredients?: string[] } = body;

  if (!product_id || !Array.isArray(obf_ingredients) || obf_ingredients.length === 0) {
    return NextResponse.json({ error: "product_id and obf_ingredients are required." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  // matchIngredientNames does the real matching work (same tiered
  // ingredients+aliases matcher the live scoring flow uses) and creates a
  // minimal ingredients row for anything unmatched - see lib/adminProducts.ts.
  // Its returned positions are 1-based within obf_ingredients, so they're
  // offset below by this product's current max position rather than
  // overwriting its existing ingredient list.
  const { linkRows, createdCount, createdNames } = await matchIngredientNames(obf_ingredients);

  const { data: existing } = await admin
    .from("catalog_product_ingredients")
    .select("position")
    .eq("product_id", product_id)
    .order("position", { ascending: false })
    .limit(1);
  const basePosition = existing?.[0]?.position ?? 0;

  const rowsToLink = linkRows.map((row) => ({
    product_id,
    ingredient_id: row.ingredient_id,
    position: basePosition + row.position,
  }));

  // upsert + ignoreDuplicates against the real unique(product_id,
  // ingredient_id) constraint on this table - an OBF ingredient that
  // matches something already linked to this product is silently skipped
  // rather than erroring or creating a duplicate link. Only rows actually
  // inserted come back in `linked` (Postgres's ON CONFLICT DO NOTHING
  // doesn't return skipped rows).
  const { data: linked, error: linkError } = await admin
    .from("catalog_product_ingredients")
    .upsert(rowsToLink, { onConflict: "product_id,ingredient_id", ignoreDuplicates: true })
    .select("ingredient_id");

  if (linkError) {
    return NextResponse.json({ error: linkError.message }, { status: 500 });
  }

  const { ingredientsScored } = await generateScoresForIngredientIds(
    rowsToLink.map((r) => r.ingredient_id)
  );

  return NextResponse.json({
    added: createdCount,
    linked: linked?.length ?? 0,
    autoScored: ingredientsScored,
    createdNames,
  });
}
