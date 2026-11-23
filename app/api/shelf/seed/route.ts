import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getRoutineProducts } from "@/lib/routineProducts";
import { amazonSearch } from "@/lib/styleShoppingList";
import type { CartItem } from "@/lib/styleCart";

// Seeds the user's standalone shelf with their top routine product picks.
// Called on first visit to /dashboard when the shelf is empty.
// Idempotent: if the shelf already has items, this is a no-op.

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const userId: string | undefined = body?.user_id;

  if (!userId) {
    return NextResponse.json({ error: "user_id is required." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  // Check if the shelf already has items — if so, skip seeding
  const { data: existing } = await admin
    .from("style_cart")
    .select("id, items")
    .eq("user_id", userId)
    .is("style_match_id", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing && Array.isArray(existing.items) && existing.items.length > 0) {
    return NextResponse.json({ cart_id: existing.id, items: existing.items, seeded: false });
  }

  // Fetch the user's hair profile
  const { data: profile } = await admin
    .from("hair_profiles")
    .select("porosity, curl_type, hair_concerns, color_treated, budget_range")
    .eq("user_id", userId)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "Hair profile not found." }, { status: 404 });
  }

  const colorTreated =
    profile.color_treated === true ||
    profile.color_treated === "yes";

  // Get top routine picks for this user's hair profile
  const picks = await getRoutineProducts(
    profile.porosity ?? null,
    profile.curl_type ?? null,
    profile.hair_concerns ?? null,
    colorTreated,
    profile.budget_range ?? null
  );

  // Collect the product names we want to look up
  const productNames: string[] = [];
  for (const pick of picks) {
    if (pick.primary) productNames.push(pick.primary.productName);
  }

  if (productNames.length === 0) {
    return NextResponse.json({ cart_id: null, items: [], seeded: false });
  }

  // Look up catalog_product_id by name (name is the unique identifier we have)
  const { data: catalogRows } = await admin
    .from("catalog_products")
    .select("id, name, processed_image_url, image_url, price_usd, catalog_brands(name)")
    .in("name", productNames);

  const catalogByName = new Map<string, { id: string; image_url: string | null; processed_image_url: string | null; price_usd: number | null; brand: string | null }>();
  for (const row of catalogRows ?? []) {
    const brand =
      row.catalog_brands && !Array.isArray(row.catalog_brands)
        ? (row.catalog_brands as { name: string }).name
        : null;
    catalogByName.set(row.name, {
      id: row.id,
      image_url: row.image_url ?? null,
      processed_image_url: row.processed_image_url ?? null,
      price_usd: row.price_usd ?? null,
      brand,
    });
  }

  // Build CartItem array from matched picks
  const items: CartItem[] = [];
  for (const pick of picks) {
    if (!pick.primary) continue;
    const candidate = pick.primary;
    const catalogRow = catalogByName.get(candidate.productName);
    if (!catalogRow) continue; // name didn't match anything in DB (shouldn't happen)

    const amazonUrl = amazonSearch(`${candidate.brandName} ${candidate.productName}`.trim());
    items.push({
      product_id: catalogRow.id,
      product_name: candidate.productName,
      product_type: "product",
      seller_type: "amazon",
      seller_url: candidate.affiliateLink ?? amazonUrl,
      affiliate_url: candidate.affiliateLink ?? amazonUrl,
      price_estimate: catalogRow.price_usd ?? candidate.priceUsd ?? null,
      compat_score: candidate.score ?? null,
      quantity: 1,
      status: "pending",
      image_url: catalogRow.processed_image_url ?? catalogRow.image_url ?? null,
      secondary_category_labels: [pick.categoryLabel],
    });
  }

  if (items.length === 0) {
    return NextResponse.json({ cart_id: null, items: [], seeded: false });
  }

  // Create or update the shelf
  if (existing) {
    // Shelf row exists but was empty — update it
    await admin
      .from("style_cart")
      .update({ items })
      .eq("id", existing.id);
    return NextResponse.json({ cart_id: existing.id, items, seeded: true });
  }

  // Create a new standalone shelf
  const { data: created, error: createError } = await admin
    .from("style_cart")
    .insert({
      user_id: userId,
      style_match_id: null,
      items,
      checkout_status: "draft",
    })
    .select("id")
    .single();

  if (createError || !created) {
    return NextResponse.json(
      { error: createError?.message ?? "Failed to create shelf." },
      { status: 500 }
    );
  }

  return NextResponse.json({ cart_id: created.id, items, seeded: true });
}
