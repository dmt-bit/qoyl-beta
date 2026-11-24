import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { amazonSearch } from "@/lib/styleShoppingList";
import type { CartItem } from "@/lib/styleCart";

// Seeds the user's standalone shelf with their routine product picks.
// Called on first visit to /dashboard when the shelf is empty.
// Idempotent: if the shelf already has items, this is a no-op.
//
// Strategy: query catalog_products directly for each core category,
// ordered by average_score DESC (NULLs last). This is fast, reliable,
// and guaranteed to return products as long as the catalog has them.
// No dependency on the scoring pipeline (which can time out on cold starts).

const CORE_SLUGS = [
  { slug: "shampoo",          label: "Shampoo" },
  { slug: "conditioner",      label: "Conditioner" },
  { slug: "deep-conditioner", label: "Deep Conditioner" },
  { slug: "leave-in",         label: "Leave-In" },
  { slug: "styler",           label: "Styler" },
  { slug: "oil",              label: "Oil" },
];

type CatalogRow = {
  id: string;
  name: string;
  category_id: string;
  processed_image_url: string | null;
  image_url: string | null;
  price_usd: number | null;
  average_score?: number | null;
  catalog_brands: { name: string } | { name: string }[] | null;
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const userId: string | undefined = body?.user_id;

  if (!userId) {
    return NextResponse.json({ error: "user_id is required." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  // If the shelf already has items, return them immediately (idempotent)
  const { data: existing } = await admin
    .from("style_cart")
    .select("id, items")
    .eq("user_id", userId)
    .is("style_match_id", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing && Array.isArray(existing.items) && (existing.items as unknown[]).length > 0) {
    console.log(`[shelf/seed] Shelf already populated for user ${userId}: ${(existing.items as unknown[]).length} items`);
    return NextResponse.json({ cart_id: existing.id, items: existing.items, seeded: false });
  }

  // Look up all core category IDs in one query
  const coreSlugs = CORE_SLUGS.map((s) => s.slug);
  const { data: catRows, error: catError } = await admin
    .from("categories")
    .select("id, slug")
    .in("slug", coreSlugs);

  if (catError) {
    console.error("[shelf/seed] Failed to fetch categories:", catError.message);
    return NextResponse.json({ cart_id: null, items: [], seeded: false });
  }

  const catIdBySlug = new Map<string, string>(
    (catRows ?? []).map((r) => [r.slug as string, r.id as string])
  );

  console.log(`[shelf/seed] Found ${catIdBySlug.size}/${coreSlugs.length} core categories`);

  if (catIdBySlug.size === 0) {
    console.error("[shelf/seed] No categories found — catalog may be empty");
    return NextResponse.json({ cart_id: null, items: [], seeded: false });
  }

  const categoryIds = Array.from(catIdBySlug.values());

  // Check whether average_score column exists (it was added in a migration
  // and may not exist in all environments yet - mirrors the same guard in
  // app/search/page.tsx to avoid a hard failure on the select).
  const { error: scoreColCheckErr } = await admin
    .from("catalog_products")
    .select("average_score")
    .limit(1);
  const hasAverageScore = !scoreColCheckErr;

  console.log(`[shelf/seed] average_score column exists: ${hasAverageScore}`);

  // Fetch the top products per category in one query.
  // Order: products with average_score first (descending), then NULLs.
  // Fetch up to 5 per category so we always get at least one per slot.
  const selectFields = hasAverageScore
    ? "id, name, category_id, processed_image_url, image_url, price_usd, average_score, catalog_brands(name)"
    : "id, name, category_id, processed_image_url, image_url, price_usd, catalog_brands(name)";

  let productQuery = admin
    .from("catalog_products")
    .select(selectFields)
    .in("category_id", categoryIds)
    .limit(50);

  if (hasAverageScore) {
    productQuery = productQuery.order("average_score", { ascending: false, nullsFirst: false });
  } else {
    productQuery = productQuery.order("created_at", { ascending: false });
  }

  const { data: products, error: prodError } = await productQuery;

  if (prodError) {
    console.error("[shelf/seed] Failed to fetch catalog products:", prodError.message);
    return NextResponse.json({ cart_id: null, items: [], seeded: false });
  }

  console.log(`[shelf/seed] Fetched ${products?.length ?? 0} catalog products across ${categoryIds.length} categories`);

  if (!products || products.length === 0) {
    console.error("[shelf/seed] Catalog returned 0 products");
    return NextResponse.json({ cart_id: null, items: [], seeded: false });
  }

  // Pick the best product per category slug (in CORE_SLUGS order for consistent ordering)
  const usedProductIds = new Set<string>();
  const items: CartItem[] = [];

  for (const slugEntry of CORE_SLUGS) {
    const catId = catIdBySlug.get(slugEntry.slug);
    if (!catId) {
      console.log(`[shelf/seed] No category ID found for slug: ${slugEntry.slug}`);
      continue;
    }

    // Find first product in this category that hasn't been used yet
    const best = (products as unknown as CatalogRow[]).find(
      (p) => p.category_id === catId && !usedProductIds.has(p.id)
    );

    if (!best) {
      console.log(`[shelf/seed] No product found for category: ${slugEntry.slug}`);
      continue;
    }

    usedProductIds.add(best.id);
    const brandObj = Array.isArray(best.catalog_brands)
      ? best.catalog_brands[0]
      : best.catalog_brands;
    const brandName = brandObj?.name ?? "";
    const amazonUrl = amazonSearch(`${brandName} ${best.name}`.trim());

    items.push({
      product_id: best.id,
      product_name: best.name,
      product_type: "product",
      seller_type: "amazon",
      seller_url: amazonUrl,
      affiliate_url: amazonUrl,
      price_estimate: best.price_usd ?? null,
      compat_score: best.average_score ?? null,
      quantity: 1,
      status: "pending",
      image_url: best.processed_image_url ?? best.image_url ?? null,
      secondary_category_labels: [slugEntry.label],
    });
  }

  console.log(`[shelf/seed] Built ${items.length} shelf items for user ${userId}`);

  if (items.length === 0) {
    console.error("[shelf/seed] No items produced despite having catalog products — category ID mismatch?");
    return NextResponse.json({ cart_id: null, items: [], seeded: false });
  }

  // Update existing empty shelf or create a new one
  if (existing) {
    const { error: updateError } = await admin
      .from("style_cart")
      .update({ items })
      .eq("id", existing.id);
    if (updateError) {
      console.error("[shelf/seed] Failed to update existing shelf:", updateError.message);
      return NextResponse.json({ cart_id: null, items: [], seeded: false });
    }
    console.log(`[shelf/seed] Updated existing shelf ${existing.id} with ${items.length} items`);
    return NextResponse.json({ cart_id: existing.id, items, seeded: true });
  }

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
    console.error("[shelf/seed] Failed to create shelf:", createError?.message);
    return NextResponse.json(
      { error: createError?.message ?? "Failed to create shelf." },
      { status: 500 }
    );
  }

  console.log(`[shelf/seed] Created new shelf ${created.id} with ${items.length} items`);
  return NextResponse.json({ cart_id: created.id, items, seeded: true });
}
