import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { amazonSearch } from "@/lib/styleShoppingList";
import type { CartItem } from "@/lib/styleCart";

// Standalone shelf route — carts where style_match_id IS NULL.
// One shelf per user; upserted on first add.
// Passes user_id as a query param (GET) or body field (POST),
// consistent with the existing style-cart route pattern.

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("user_id");
  if (!userId) {
    return NextResponse.json({ error: "user_id is required." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("style_cart")
    .select("id, items")
    .eq("user_id", userId)
    .is("style_match_id", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    cart_id: data?.id ?? null,
    items: (data?.items as CartItem[]) ?? [],
  });
}

type AddBody = {
  user_id: string;
  catalog_product_id: string;
  product_name: string;
  brand_name?: string;
  image_url?: string | null;
  price_usd?: number | null;
  compat_score?: number | null;
  secondary_category_labels?: string[];
};

export async function POST(request: Request) {
  const body: AddBody = await request.json();
  const {
    user_id,
    catalog_product_id,
    product_name,
    brand_name,
    image_url,
    price_usd,
    compat_score,
    secondary_category_labels,
  } = body;

  if (!user_id || !catalog_product_id || !product_name) {
    return NextResponse.json({ error: "user_id, catalog_product_id and product_name are required." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  // Find or create the user's standalone shelf
  const { data: existing } = await admin
    .from("style_cart")
    .select("id, items")
    .eq("user_id", user_id)
    .is("style_match_id", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const currentItems: CartItem[] = (existing?.items as CartItem[]) ?? [];

  // Don't add duplicates
  if (currentItems.some((item) => item.product_id === catalog_product_id)) {
    return NextResponse.json({
      cart_id: existing!.id,
      items: currentItems,
      already_added: true,
    });
  }

  const amazonUrl = amazonSearch(`${brand_name ?? ""} ${product_name}`.trim());
  const newItem: CartItem = {
    product_id: catalog_product_id,
    product_name,
    product_type: "product",
    seller_type: "amazon",
    seller_url: amazonUrl,
    affiliate_url: amazonUrl,
    price_estimate: price_usd ?? null,
    compat_score: compat_score ?? null,
    quantity: 1,
    status: "pending",
    image_url: image_url ?? null,
    secondary_category_labels: secondary_category_labels ?? [],
  };

  const updatedItems = [...currentItems, newItem];

  if (existing) {
    await admin
      .from("style_cart")
      .update({ items: updatedItems })
      .eq("id", existing.id);
    return NextResponse.json({ cart_id: existing.id, items: updatedItems });
  }

  // Create a new standalone shelf
  const { data: created, error: createError } = await admin
    .from("style_cart")
    .insert({
      user_id,
      style_match_id: null,
      items: updatedItems,
      checkout_status: "draft",
    })
    .select("id")
    .single();

  if (createError || !created) {
    return NextResponse.json({ error: createError?.message ?? "Failed to create shelf." }, { status: 500 });
  }

  return NextResponse.json({ cart_id: created.id, items: updatedItems });
}
