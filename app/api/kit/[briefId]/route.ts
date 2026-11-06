import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { buildKitItems } from "@/lib/kitItems";
import type { StyleShoppingList } from "@/lib/styleShoppingList";
import type { DetectedStyleDetails } from "@/lib/styleMatchSummary";

// Public - no auth required. Reads from style_matches, assembles kit
// items, and returns everything the MyLookKit component needs.
// briefId is a style_matches.id (UUID).
export async function GET(
  _request: Request,
  { params }: { params: { briefId: string } }
) {
  const admin = getSupabaseAdmin();

  const { data: match, error } = await admin
    .from("style_matches")
    .select(
      "id, user_id, detected_style, detected_details, shopping_list, tutorials, color_match"
    )
    .eq("id", params.briefId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!match) return NextResponse.json({ error: "Kit not found." }, { status: 404 });

  const shoppingList = match.shopping_list as StyleShoppingList | null;
  const detectedDetails = (match.detected_details ?? {}) as DetectedStyleDetails;
  const styleName = match.detected_style ?? detectedDetails.style_name ?? "your look";

  if (!shoppingList) {
    return NextResponse.json({ error: "No shopping list for this match." }, { status: 404 });
  }

  // Fetch prices for catalog products (same lookup as /api/style-cart)
  const productIds = shoppingList.hairCare.map((c) => c.catalogProductId);
  const priceById = new Map<string, number>();
  if (productIds.length > 0) {
    const { data: priceRows } = await admin
      .from("catalog_products")
      .select("id, price_usd")
      .in("id", productIds);
    for (const row of priceRows ?? []) {
      if (row.price_usd != null) priceById.set(row.id, row.price_usd);
    }
  }

  const items = buildKitItems({
    shoppingList,
    detectedDetails,
    styleName,
    priceById,
  });

  // Fetch the style reference image from detected_details if present
  const referenceImageUrl = detectedDetails.image_url ?? null;

  // Fetch palette from the user's hair profile (color_match flag +
  // photo analysis). We surface whatever detected_details carries today;
  // a richer palette lives in the photo analysis but isn't worth a
  // second DB round-trip just for display.
  const paletteColors: string[] = [];

  return NextResponse.json({
    briefId: match.id,
    styleName,
    detectedDetails,
    referenceImageUrl,
    paletteColors,
    items,
    colorMatch: Boolean(match.color_match),
  });
}
