import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { buildScoringProfile } from "@/lib/compatibility";
import {
  fetchBrandProductsForCategories,
  recordShoppingListImpressions,
  slugifyStyleName,
} from "@/lib/brandCatalogProducts";

// Server-only bridge: lib/styleShoppingList.ts runs client-side (it's
// called from the "use client" style-match page), so brand_catalog_
// products/brand_accounts/hair_profiles all need to go through a
// service-role route rather than the anon client - same reasoning as
// app/api/style-match/stylists/route.ts.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const categoriesParam = searchParams.get("categories");
  const styleName = searchParams.get("style_name");
  const userId = searchParams.get("user_id");
  const matchId = searchParams.get("match_id");

  if (!categoriesParam) {
    return NextResponse.json({ productsByCategory: {} });
  }

  const categories = categoriesParam
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
  const styleSlug = styleName ? slugifyStyleName(styleName) : null;

  let profile = null;
  if (userId) {
    const { data: profileRow } = await getSupabaseAdmin()
      .from("hair_profiles")
      .select(
        "curl_type, porosity, scalp_condition, climate, water_hardness, hair_concerns, adult_age_range, color_treated"
      )
      .eq("user_id", userId)
      .maybeSingle();
    if (profileRow) profile = buildScoringProfile(profileRow);
  }

  const productsByCategory = await fetchBrandProductsForCategories(categories, styleSlug, profile);

  if (matchId) {
    const allIds = Object.values(productsByCategory).flatMap((items) => items.map((i) => i.id));
    await recordShoppingListImpressions(matchId, allIds);
  }

  return NextResponse.json({ productsByCategory });
}
