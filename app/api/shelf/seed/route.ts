import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getRoutineProductPicks } from "@/lib/routineProducts";
import { amazonSearch } from "@/lib/styleShoppingList";
import type { CartItem } from "@/lib/styleCart";

// Seeds the user's standalone shelf with their routine product picks.
// Called on first visit to /dashboard when the shelf is empty.
// Idempotent: if the shelf already has items, this is a no-op.
//
// Two-pass strategy:
//  1. Run getRoutineProductPicks (scored, profile-personalised).
//     Collect product names for every pick that has a primary.
//  2. For any routine category whose scored pick returned no primary
//     (noProductsYet), fall back to the top-rated catalog product in
//     that category by average_score.
//  This guarantees the shelf always populates for a complete profile.

const CORE_SLUGS = [
  { slug: "shampoo",        label: "Shampoo" },
  { slug: "conditioner",    label: "Conditioner" },
  { slug: "deep-conditioner", label: "Deep Conditioner" },
  { slug: "leave-in",       label: "Leave-In" },
  { slug: "styler",         label: "Styler" },
  { slug: "oil",            label: "Oil" },
];

type CatalogRow = {
  id: string;
  name: string;
  category_id: string;
  processed_image_url: string | null;
  image_url: string | null;
  price_usd: number | null;
  average_score: number | null;
  catalog_brands: { name: string } | null;
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const userId: string | undefined = body?.user_id;

  if (!userId) {
    return NextResponse.json({ error: "user_id is required." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  // If the shelf already has items, return them immediately
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

  // Fetch the user's hair profile
  const { data: profile } = await admin
    .from("hair_profiles")
    .select("porosity, curl_type, hair_concerns, color_treated, budget_range")
    .eq("user_id", userId)
    .maybeSingle();

  // ── Pass 1: scored picks ──────────────────────────────────────────────────
  // Run for any profile; falls back gracefully to null picks when scoring
  // has no data. We always run pass 1 so scored picks show when available.
  let scoredPicks: Awaited<ReturnType<typeof getRoutineProductPicks>> = [];
  if (profile) {
    const colorTreated =
      profile.color_treated === true || profile.color_treated === "yes";
    try {
      scoredPicks = await getRoutineProductPicks(
        profile.porosity ?? null,
        profile.curl_type ?? null,
        profile.hair_concerns ?? null,
        colorTreated,
        profile.budget_range ?? null
      );
    } catch {
      // scoring pipeline failed — fall through to direct catalog query
    }
  }

  // Collect product names from picks that have a primary
  const scoredNames = scoredPicks
    .filter((p) => p.primary !== null)
    .map((p) => ({ name: p.primary!.productName, label: p.categoryLabel }));

  // Track which category slugs are already covered by a scored pick
  const coveredSlugs = new Set(
    scoredPicks.filter((p) => p.primary !== null).map((p) => p.searchCategorySlug)
  );

  // ── Pass 2: direct fallback for uncovered categories ─────────────────────
  const uncoveredSlugs = CORE_SLUGS.filter((s) => !coveredSlugs.has(s.slug));

  let fallbackRows: CatalogRow[] = [];
  if (uncoveredSlugs.length > 0) {
    const { data: catRows } = await admin
      .from("categories")
      .select("id, slug")
      .in("slug", uncoveredSlugs.map((s) => s.slug));

    const catIdBySlug = new Map<string, string>(
      (catRows ?? []).map((r) => [r.slug as string, r.id as string])
    );
    const categoryIds = Array.from(catIdBySlug.values());

    if (categoryIds.length > 0) {
      const { data: directProducts } = await admin
        .from("catalog_products")
        .select("id, name, category_id, processed_image_url, image_url, price_usd, average_score, catalog_brands(name)")
        .in("category_id", categoryIds)
        .order("average_score", { ascending: false, nullsFirst: false })
        .limit(30);

      // Pick the best product per category in slug order
      const slugToCatId = catIdBySlug;
      const seenCats = new Set<string>();
      for (const slugEntry of uncoveredSlugs) {
        const catId = slugToCatId.get(slugEntry.slug);
        if (!catId || seenCats.has(catId)) continue;
        const best = (directProducts ?? []).find((p) => p.category_id === catId);
        if (best) {
          fallbackRows.push({
            ...best,
            catalog_brands: best.catalog_brands && !Array.isArray(best.catalog_brands)
              ? best.catalog_brands as { name: string }
              : null,
          });
          seenCats.add(catId);
        }
      }
    }
  }

  // ── Build CartItems ───────────────────────────────────────────────────────
  // Only need catalog lookup for scored picks (fallback rows already have full data)
  let catalogByName = new Map<string, CatalogRow>();
  if (scoredNames.length > 0) {
    const { data: catalogRows } = await admin
      .from("catalog_products")
      .select("id, name, category_id, processed_image_url, image_url, price_usd, average_score, catalog_brands(name)")
      .in("name", scoredNames.map((n) => n.name));

    for (const row of catalogRows ?? []) {
      catalogByName.set(row.name, {
        ...row,
        catalog_brands: row.catalog_brands && !Array.isArray(row.catalog_brands)
          ? row.catalog_brands as { name: string }
          : null,
      });
    }
  }

  const items: CartItem[] = [];

  // Add scored picks first (they're personalised)
  for (const pick of scoredPicks) {
    if (!pick.primary) continue;
    const candidate = pick.primary;
    const catalogRow = catalogByName.get(candidate.productName);
    if (!catalogRow) continue;

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

  // Build a map from category_id → CORE_SLUGS label for fallback rows
  const catIdToLabel = new Map<string, string>();
  if (uncoveredSlugs.length > 0) {
    const { data: catRows2 } = await admin
      .from("categories")
      .select("id, slug")
      .in("slug", uncoveredSlugs.map((s) => s.slug));
    for (const r of catRows2 ?? []) {
      const entry = CORE_SLUGS.find((s) => s.slug === r.slug);
      if (entry) catIdToLabel.set(r.id as string, entry.label);
    }
  }

  // Add fallback picks for uncovered categories
  for (const row of fallbackRows) {
    const brandName = row.catalog_brands?.name ?? "";
    const label = catIdToLabel.get(row.category_id) ?? "Product";
    const amazonUrl = amazonSearch(`${brandName} ${row.name}`.trim());
    items.push({
      product_id: row.id,
      product_name: row.name,
      product_type: "product",
      seller_type: "amazon",
      seller_url: amazonUrl,
      affiliate_url: amazonUrl,
      price_estimate: row.price_usd ?? null,
      compat_score: row.average_score ?? null,
      quantity: 1,
      status: "pending",
      image_url: row.processed_image_url ?? row.image_url ?? null,
      secondary_category_labels: [label],
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
