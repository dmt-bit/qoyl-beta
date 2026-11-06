import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { buildKitItems } from "@/lib/kitItems";
import type { StyleShoppingList } from "@/lib/styleShoppingList";
import type { DetectedStyleDetails } from "@/lib/styleMatchSummary";
import MyLookKit from "@/components/MyLookKit";

export const dynamic = "force-dynamic";

// /kit/[briefId]?src=event-dec6
// Public, no login required. briefId is a style_matches.id.
// The QR code at /kit/[briefId]/qr.png points here.
export default async function KitPage({
  params,
  searchParams,
}: {
  params: { briefId: string };
  searchParams: { src?: string };
}) {
  const admin = getSupabaseAdmin();

  const { data: match } = await admin
    .from("style_matches")
    .select(
      "id, detected_style, detected_details, shopping_list, color_match"
    )
    .eq("id", params.briefId)
    .maybeSingle();

  if (!match) notFound();

  const shoppingList = match.shopping_list as StyleShoppingList | null;
  const detectedDetails = (match.detected_details ?? {}) as DetectedStyleDetails;
  const styleName =
    match.detected_style ?? detectedDetails.style_name ?? "your look";

  if (!shoppingList) notFound();

  // Price lookup for catalog products
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

  return (
    <MyLookKit
      briefId={match.id}
      styleName={styleName}
      referenceImageUrl={detectedDetails.image_url ?? null}
      paletteColors={[]}
      items={items}
      src={searchParams.src}
    />
  );
}
