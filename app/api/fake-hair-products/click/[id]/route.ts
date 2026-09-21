import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// "Shop →" on a matched hair seller product routes through here: logs a
// click_through row, then redirects. The destination is looked up
// server-side (never taken from the query string) so this can't be used as
// an open redirect. Mirrors /api/brand-products/click/[id].
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(request.url);
  const admin = getSupabaseAdmin();

  const { data: product } = await admin
    .from("fake_hair_products")
    .select("id, brand_id, product_url, amazon_asin, fake_hair_brand_accounts(tier)")
    .eq("id", params.id)
    .maybeSingle();

  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });

  const target =
    product.product_url ?? (product.amazon_asin ? `https://www.amazon.com/dp/${product.amazon_asin}` : null);
  if (!target) return NextResponse.json({ error: "No destination URL for this product." }, { status: 404 });

  const seller = product.fake_hair_brand_accounts as unknown as { tier: string | null } | null;
  const { error } = await admin.from("style_match_product_impressions").insert({
    style_match_id: searchParams.get("style_match_id"),
    appeared_in: "shopping_list",
    impression_type: "click_through",
    fake_hair_product_id: product.id,
    hair_seller_id: product.brand_id,
    was_featured: seller?.tier === "featured",
    color_matched: searchParams.get("color_matched") === "true",
    matched_color: searchParams.get("matched_color"),
    curl_type: searchParams.get("curl_type"),
    hair_preference: searchParams.get("hair_preference"),
  });
  if (error) console.error("[fake-hair-products/click] click insert failed:", error);

  return NextResponse.redirect(target, 307);
}
