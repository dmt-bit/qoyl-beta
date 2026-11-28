import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { amazonSearch } from "@/lib/styleShoppingList";
import { curlFamily } from "@/lib/compatibility";
import { getToolsForProfile } from "@/lib/getToolsForProfile";
import type { CartItem } from "@/lib/styleCart";

// Seeds the user's standalone shelf with their routine product picks.
// Called on first visit to /dashboard when the shelf is empty.
// Profile-aware: uses the same curl-family slot logic as the /routine page,
// so the shelf always reflects the user's actual routine categories
// (prepoo, detangler, curl cream, tools, etc.) rather than a generic 6-item list.

// Core category slugs per curl family — mirrors FAMILY_ROUTINE_CATEGORIES
// in lib/routineProducts.ts without pulling in the heavyweight scoring engine.
// Order reflects the wash-day sequence (prepoo → cleanse → condition → style).
function routineSlugsForProfile(params: {
  curlType: string | null;
  porosity: string | null;
  extensions: string | null;
  routineFocus: string | null;
  extensionType: string[] | null;
}): Array<{ slug: string; label: string }> {
  const family = curlFamily(params.curlType);
  const porosity = params.porosity ?? "medium";

  // Build the slot list by family, matching the same logic as
  // FAMILY_ROUTINE_CATEGORIES in lib/routineProducts.ts so the shelf
  // categories align with what the /routine page actually recommends.
  const slots: Array<{ slug: string; label: string }> = [];

  // Pre-shampoo (all families)
  slots.push({ slug: "pre-shampoo", label: "Pre-Shampoo" });

  // Shampoo (all families)
  slots.push({ slug: "shampoo", label: "Shampoo" });

  // Dry shampoo (straight + wavy between-wash days)
  if (family === "straight" || family === "wavy") {
    slots.push({ slug: "dry-shampoo", label: "Dry Shampoo" });
  }

  // Co-wash (wavy between-wash days)
  if (family === "wavy") {
    slots.push({ slug: "co-wash", label: "Co-Wash" });
  }

  // Conditioner (all families)
  slots.push({ slug: "conditioner", label: "Conditioner" });

  // Detangler (wavy optional, curly + coily essential)
  if (family === "wavy" || family === "curly" || family === "coily" || !family) {
    slots.push({ slug: "detangler", label: "Detangler" });
  }

  // Deep conditioner (all families)
  slots.push({ slug: "deep-conditioner", label: "Deep Conditioner" });

  // Hair mask (all families)
  slots.push({ slug: "hair-mask", label: "Hair Mask" });

  // Protein treatment (all families)
  slots.push({ slug: "treatment", label: "Protein Treatment" });

  // Leave-in (curly, coily, fallback; wavy uses lighter alternatives)
  if (family === "curly" || family === "coily" || !family) {
    slots.push({ slug: "leave-in", label: "Leave-In Conditioner" });
  } else {
    // Straight/wavy still benefit from a light leave-in
    slots.push({ slug: "leave-in", label: "Leave-In" });
  }

  // Stylers — family-specific
  if (family === "straight") {
    slots.push({ slug: "heat-protectant", label: "Heat Protectant" });
    slots.push({ slug: "oil", label: "Finishing Serum" });
    slots.push({ slug: "hairspray", label: "Hairspray" });
  } else if (family === "wavy") {
    slots.push({ slug: "mousse", label: "Mousse" });
    slots.push({ slug: "heat-protectant", label: "Heat Protectant" });
    slots.push({ slug: "oil", label: "Finishing Serum" });
    slots.push({ slug: "hairspray", label: "Hairspray" });
  } else if (family === "curly") {
    slots.push({ slug: "curl-cream", label: "Curl Cream" });
    slots.push({ slug: "oil", label: "Oil" });
    slots.push({ slug: "gel", label: "Gel" });
  } else {
    // coily + fallback
    slots.push({ slug: "curl-cream", label: "Curl Cream" });
    slots.push({ slug: "gel", label: "Gel" });
    slots.push({ slug: "oil", label: "Sealing Oil" });
    // Butter only for high-porosity coily
    if (porosity === "high") {
      slots.push({ slug: "butter", label: "Butter" });
    }
  }

  // Scalp treatment — added for anyone with a scalp concern or thinning concern
  // (the seed doesn't have concern data, but we can still add it as a slot
  // since the catalog lookup will just return a product if one exists)
  slots.push({ slug: "scalp-treatment", label: "Scalp Treatment" });

  return slots;
}

// The old generic seed used exactly these 6 slugs. We re-seed any shelf
// whose items only cover this exact set, since it means it was seeded
// before profile-awareness was added.
const OLD_GENERIC_SLUGS = new Set([
  "shampoo", "conditioner", "deep-conditioner", "leave-in", "styler", "oil",
]);

function isOldGenericShelf(items: CartItem[]): boolean {
  if (items.length === 0 || items.length > 8) return false;
  const slugsInShelf = new Set(
    items.flatMap((i) => i.secondary_category_labels ?? []).map((l) => l.toLowerCase())
  );
  // If the shelf has items but they all come from the old 6-category set
  // (by label), treat it as the old generic seed and re-seed.
  const oldLabels = new Set(["Shampoo", "Conditioner", "Deep Conditioner", "Leave-In", "Styler", "Oil"]);
  const allOld = items.every((i) =>
    (i.secondary_category_labels ?? []).every((l) => oldLabels.has(l))
  );
  return allOld && slugsInShelf.size <= 6;
}

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

  // Fetch the existing shelf (if any)
  const { data: existing } = await admin
    .from("style_cart")
    .select("id, items")
    .eq("user_id", userId)
    .is("style_match_id", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const existingItems: CartItem[] = Array.isArray(existing?.items)
    ? (existing!.items as CartItem[])
    : [];

  // If the shelf is already populated with a non-generic seed, return early.
  if (existingItems.length > 0 && !isOldGenericShelf(existingItems)) {
    console.log(`[shelf/seed] Shelf already populated (profile-aware) for user ${userId}: ${existingItems.length} items`);
    return NextResponse.json({ cart_id: existing!.id, items: existingItems, seeded: false });
  }

  // Fetch the user's hair profile so we can pick the right categories
  const { data: profile } = await admin
    .from("hair_profiles")
    .select("curl_type, porosity, extensions, routine_focus, extension_type")
    .eq("user_id", userId)
    .maybeSingle();

  const curlType = profile?.curl_type ?? null;
  const porosity = profile?.porosity ?? null;
  const extensions = profile?.extensions ?? null;
  const routineFocus = profile?.routine_focus ?? null;
  const extensionType = profile?.extension_type ?? null;

  console.log(`[shelf/seed] Profile for ${userId}: curl_type=${curlType}, porosity=${porosity}, extensions=${extensions}`);

  const slots = routineSlugsForProfile({ curlType, porosity, extensions, routineFocus, extensionType });
  const slugs = Array.from(new Set(slots.map((s) => s.slug)));

  console.log(`[shelf/seed] Slots (${slots.length}): ${slots.map((s) => s.slug).join(", ")}`);

  // Look up all relevant category IDs in one query
  const { data: catRows, error: catError } = await admin
    .from("categories")
    .select("id, slug")
    .in("slug", slugs);

  if (catError) {
    console.error("[shelf/seed] Failed to fetch categories:", catError.message);
    return NextResponse.json({ cart_id: null, items: [], seeded: false });
  }

  const catIdBySlug = new Map<string, string>(
    (catRows ?? []).map((r) => [r.slug as string, r.id as string])
  );

  console.log(`[shelf/seed] Found ${catIdBySlug.size}/${slugs.length} categories`);

  // Check whether average_score column exists
  const { error: scoreColCheckErr } = await admin
    .from("catalog_products")
    .select("average_score")
    .limit(1);
  const hasAverageScore = !scoreColCheckErr;

  const categoryIds = Array.from(catIdBySlug.values());

  if (categoryIds.length === 0) {
    console.error("[shelf/seed] No categories found — catalog may be empty");
    return NextResponse.json({ cart_id: null, items: [], seeded: false });
  }

  // Fetch top products across all relevant categories in one query
  const selectFields = hasAverageScore
    ? "id, name, category_id, processed_image_url, image_url, price_usd, average_score, catalog_brands(name)"
    : "id, name, category_id, processed_image_url, image_url, price_usd, catalog_brands(name)";

  let productQuery = admin
    .from("catalog_products")
    .select(selectFields)
    .in("category_id", categoryIds)
    .limit(500);

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

  if (!products || products.length === 0) {
    console.error("[shelf/seed] Catalog returned 0 products");
    return NextResponse.json({ cart_id: null, items: [], seeded: false });
  }

  const allProducts = products as unknown as CatalogRow[];

  // Pick the best product per slot, in routine order, deduplicating
  const usedProductIds = new Set<string>();
  const items: CartItem[] = [];

  for (const slot of slots) {
    const catId = catIdBySlug.get(slot.slug);

    // Find the best product in this category not already used
    const best = catId
      ? allProducts.find((p) => p.category_id === catId && !usedProductIds.has(p.id))
      : null;

    if (!best) {
      console.log(`[shelf/seed] No product for slot: ${slot.slug} (${slot.label})`);
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
      compat_score: (hasAverageScore ? (best as CatalogRow & { average_score?: number | null }).average_score : null) ?? null,
      quantity: 1,
      status: "pending",
      image_url: best.processed_image_url ?? best.image_url ?? null,
      secondary_category_labels: [slot.label],
    });
  }

  // Add essential + recommended tools for this profile as shelf items
  // (tools live in lib/toolsData.ts, not the DB catalog — no image available,
  // so they link out to Amazon searches instead)
  const { essential: essentialTools, recommended: recommendedTools } = getToolsForProfile({
    curlType,
    routineFocus,
    hasExtensions: extensions === "yes",
  });

  for (const tool of [...essentialTools, ...recommendedTools]) {
    items.push({
      product_id: `tool:${tool.id}`,
      product_name: tool.name,
      product_type: "tool",
      seller_type: "amazon",
      seller_url: amazonSearch(tool.amazon_search),
      affiliate_url: amazonSearch(tool.amazon_search),
      price_estimate: null,
      compat_score: null,
      quantity: 1,
      status: "pending",
      image_url: null,
      secondary_category_labels: [tool.category === "heat" ? "Heat Tools" : tool.category === "detangling" ? "Detangling Tools" : "Tools"],
    });
  }

  console.log(`[shelf/seed] Built ${items.length} shelf items (${items.filter(i => i.product_type !== "tool").length} products + ${items.filter(i => i.product_type === "tool").length} tools) for user ${userId}`);

  if (items.length === 0) {
    console.error("[shelf/seed] No items produced");
    return NextResponse.json({ cart_id: null, items: [], seeded: false });
  }

  // Update existing shelf (including old generic shelves we're re-seeding) or create a new one
  if (existing) {
    const { error: updateError } = await admin
      .from("style_cart")
      .update({ items })
      .eq("id", existing.id);
    if (updateError) {
      console.error("[shelf/seed] Failed to update shelf:", updateError.message);
      return NextResponse.json({ cart_id: null, items: [], seeded: false });
    }
    console.log(`[shelf/seed] Updated shelf ${existing.id} with ${items.length} items`);
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

  console.log(`[shelf/seed] Created shelf ${created.id} with ${items.length} items`);
  return NextResponse.json({ cart_id: created.id, items, seeded: true });
}
