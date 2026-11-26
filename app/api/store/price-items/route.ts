import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { CartItem } from "@/lib/styleCart";
import { resolvePrice } from "@/lib/itemPricing";

// POST /api/store/price-items
// Resolves prices for cart items that have price_estimate: null.
// Called by the checkout page on load so users see real totals before
// clicking "Continue to payment".
//
// Body:  { items: CartItem[] }
// Reply: { prices: { product_id: string | null; product_name: string; price: number | null }[] }

export async function POST(request: Request) {
  const { items }: { items: CartItem[] } = await request.json();
  if (!Array.isArray(items) || !items.length) {
    return NextResponse.json({ prices: [] });
  }

  // Batch-fetch catalog prices for items that need them
  const needLookup = items.filter((i) => i.product_id && i.price_estimate == null);
  const priceById = new Map<string, number>();

  if (needLookup.length > 0) {
    const admin = getSupabaseAdmin();
    const { data: rows } = await admin
      .from("catalog_products")
      .select("id, price_usd")
      .in("id", needLookup.map((i) => i.product_id as string));
    for (const row of rows ?? []) {
      if (row.price_usd != null) priceById.set(row.id, row.price_usd);
    }
  }

  const prices = items.map((item) => ({
    product_id: item.product_id,
    product_name: item.product_name,
    price: resolvePrice(item, priceById),
  }));

  return NextResponse.json({ prices });
}
