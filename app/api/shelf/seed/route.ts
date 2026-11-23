import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { amazonSearch } from "@/lib/styleShoppingList";
import type { CartItem } from "@/lib/styleCart";

// Seeds the user's standalone shelf with their routine product picks.
// Called on first visit to /dashboard when the shelf is empty.
// Idempotent: if the shelf already has items, this is a no-op.
//
// Strategy: query catalog_products directly for each routine category slug,
// ordered by average_score DESC, pick the top product per category.
// This guarantees real products appear on the shelf even when ingredient-
// scoring data is sparse — no dependency on the full scoring pipeline.

const CORE_ROUTINE_SLUGS = [
  "shampoo",
  "conditioner",
  "deep-conditioner",
  "leave-in",
  "styler",
  "oil",
];

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

  if (existing && Array.isArray(existing.items) && (existing.items as unknown[]).length > 0) {
    return NextResponse.json({ cart_id: existing.id, items: existing.items, seeded: false });
  }

  // Look up category IDs for the core routine slugs
  const { data: catRows } = await admin
    .from("categories")
    .select("id, slug")
    .in("slug", CORE_ROUTINE_SLUGS);

  if (!catRows || catRows.length === 0) {
    return NextResponse.json({ cart_id: null, items: [], seeded: false });
  }

  const catIdBySlug = new Map<string, string>(
    catRows.map((r) => [r.slug as string, r.id as string])
  );
  const categoryIds = Array.from(catIdBySlug.values());

  // Fetch top 3 products per category in one query, ordered by average_score
  const { data: products } = await admin
    .from("catalog_products")
    .select("id, name, category_id, processed_image_url, image_url, price_usd, average_score, catalog_brands(name)")
    .in("category_id", categoryIds)
    .order("average_score", { ascending: false })
    .limit(50);

  if (!products || products.length === 0) {
    return NextResponse.json({ cart_id: null, items: [], seeded: false });
  }

  // Pick the top product per category (preserving routine order)
  const seenCategories = new Set<string>();
  const slugOrder = CORE_ROUTINE_SLUGS.filter((s) => catIdBySlug.has(s));
  const slugById = new Map<string, string>(
    Array.from(catIdBySlug.entries()).map(([slug, id]) => [id, slug])
  );
  const categoryLabels: Record<string, string> = {
    shampoo: "Shampoo",
    conditioner: "Conditioner",
    "deep-conditioner": "Deep Conditioner",
    "leave-in": "Leave-In",
    styler: "Styler",
    oil: "Sealant Oil",
  };

  // Build a map: categoryId → best product
  const bestPerCategory = new Map<string, typeof products[0]>();
  for (const p of products) {
    if (!bestPerCategory.has(p.category_id)) {
      bestPerCategory.set(p.category_id, p);
    }
  }

  const items: CartItem[] = [];
  for (const slug of slugOrder) {
    const catId = catIdBySlug.get(slug);
    if (!catId) continue;
    if (seenCategories.has(catId)) continue;
    seenCategories.add(catId);

    const product = bestPerCategory.get(catId);
    if (!product) continue;

    const brandName =
      product.catalog_brands && !Array.isArray(product.catalog_brands)
        ? (product.catalog_brands as { name: string }).name
        : "";

    const amazonUrl = amazonSearch(`${brandName} ${product.name}`.trim());

    items.push({
      product_id: product.id,
      product_name: product.name,
      product_type: "product",
      seller_type: "amazon",
      seller_url: amazonUrl,
      affiliate_url: amazonUrl,
      price_estimate: product.price_usd ?? null,
      compat_score: product.average_score ?? null,
      quantity: 1,
      status: "pending",
      image_url: product.processed_image_url ?? product.image_url ?? null,
      secondary_category_labels: [categoryLabels[slug] ?? slug],
    });
  }

  if (items.length === 0) {
    return NextResponse.json({ cart_id: null, items: [], seeded: false });
  }

  // Create or fill the shelf
  if (existing) {
    await admin.from("style_cart").update({ items }).eq("id", existing.id);
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
    return NextResponse.json(
      { error: createError?.message ?? "Failed to create shelf." },
      { status: 500 }
    );
  }

  return NextResponse.json({ cart_id: created.id, items, seeded: true });
}
