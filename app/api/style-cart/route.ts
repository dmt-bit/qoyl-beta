import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { buildCartItems } from "@/lib/styleCart";
import type { StyleShoppingList } from "@/lib/styleShoppingList";
import type { YouTubeVideoSummary } from "@/lib/styleMatchSummary";
import type { InstallType } from "@/lib/installTypes";

// Public-facing - style match (and this cart) works for anonymous
// visitors too, same as every other style-match route. Takes the
// already-computed shopping list/tutorial from the client (the results
// screen already has both in state) rather than re-reading
// style_matches.shopping_list server-side, which isn't guaranteed to be
// saved yet at this point in the flow - that save only happens later,
// in handleComplete, and only for signed-in users.
type Body = {
  match_id?: string;
  user_id?: string | null;
  shopping_list?: StyleShoppingList;
  tutorial?: YouTubeVideoSummary | null;
  install_type?: InstallType | null;
  requires_fake_hair?: boolean;
};

export async function POST(request: Request) {
  const body: Body = await request.json();
  const { match_id, user_id, shopping_list, tutorial, install_type, requires_fake_hair } = body;

  if (!match_id || !shopping_list) {
    return NextResponse.json({ error: "match_id and shopping_list are required." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  // catalog_products has a real price_usd column that
  // lib/styleShoppingList.ts's ScoredHairCareItem doesn't carry - this
  // one extra lookup is what lets the cart's "estimated total" actually
  // add up to something instead of every product showing "price
  // unknown."
  const productIds = shopping_list.hairCare.map((c) => c.catalogProductId);
  const priceByProductId = new Map<string, number>();
  if (productIds.length > 0) {
    const { data: priceRows } = await admin.from("catalog_products").select("id, price_usd").in("id", productIds);
    for (const row of priceRows ?? []) {
      if (row.price_usd != null) priceByProductId.set(row.id, row.price_usd);
    }
  }

  const items = buildCartItems({
    shoppingList: shopping_list,
    tutorial: tutorial ?? null,
    installType: install_type ?? null,
    requiresFakeHair: Boolean(requires_fake_hair),
    priceByProductId,
  });

  const { data, error } = await admin
    .from("style_cart")
    .insert({
      user_id: user_id ?? null,
      style_match_id: match_id,
      items,
      checkout_status: "draft",
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[style-cart] create failed:", error?.message);
    return NextResponse.json({ error: error?.message ?? "Failed to create cart." }, { status: 500 });
  }

  return NextResponse.json({ cart_id: data.id, items });
}
