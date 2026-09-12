import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// Every "Shop at [brand]"/"Shop at Shopper" button routes through here
// instead of a plain <a href> - it's the only place a click on a brand
// product actually happens anywhere in the app, so it's also the only
// place click_count/style_match_product_impressions.was_clicked can
// ever get populated (both already exist on the shared schema; nothing
// upstream of this route was writing to them). Looks up the target
// server-side rather than trusting a client-supplied redirect URL, to
// avoid turning this into an open redirect.
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(request.url);
  const via = searchParams.get("via") === "shopper" ? "shopper" : "brand";
  const styleMatchId = searchParams.get("style_match_id");

  const admin = getSupabaseAdmin();
  const { data: product } = await admin
    .from("brand_catalog_products")
    .select("id, product_url, shopper_url, click_count")
    .eq("id", params.id)
    .maybeSingle();

  if (!product) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  const target =
    (via === "shopper" ? product.shopper_url : product.product_url) ??
    product.product_url ??
    product.shopper_url;

  if (!target) {
    return NextResponse.json({ error: "No destination URL for this product." }, { status: 404 });
  }

  await admin
    .from("brand_catalog_products")
    .update({ click_count: (product.click_count ?? 0) + 1 })
    .eq("id", params.id);

  if (styleMatchId) {
    const { data: impression } = await admin
      .from("style_match_product_impressions")
      .select("id")
      .eq("style_match_id", styleMatchId)
      .eq("brand_catalog_product_id", params.id)
      .eq("was_clicked", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (impression) {
      await admin
        .from("style_match_product_impressions")
        .update({ was_clicked: true, clicked_at: new Date().toISOString() })
        .eq("id", impression.id);
    }
  }

  return NextResponse.redirect(target, 302);
}
