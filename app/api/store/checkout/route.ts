import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { CartItem } from "@/lib/styleCart";
import { resolvePrice } from "@/lib/itemPricing";

// POST /api/store/checkout
// Creates a Stripe Checkout session for the user's shelf items.
// Qoyl purchases the items on the user's behalf after payment.
//
// Body: { user_id, email, cart_id, items: CartItem[], shipping_address? }

export type StoreCheckoutBody = {
  user_id: string;
  email: string;
  cart_id?: string;
  items: CartItem[];
  shipping_address?: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
};

export async function POST(request: Request) {
  const body: StoreCheckoutBody = await request.json();
  const { user_id, email, cart_id, items, shipping_address } = body;

  if (!user_id || !email || !items?.length) {
    return NextResponse.json(
      { error: "user_id, email, and items are required." },
      { status: 400 }
    );
  }

  const admin = getSupabaseAdmin();

  // Auto-fill missing prices. Items added from the style-match page or the
  // bathroom shelf may arrive with price_estimate: null when the catalog row
  // has no price or when the client couldn't fetch it. We handle two cases:
  //
  // 1. Items with a product_id — look up price_usd from catalog_products.
  // 2. Items with no product_id (tools, generic amazon items) — use a
  //    category-based estimate derived from the item type and name heuristic.
  //
  // Items that remain at $0 or null after enrichment are tutorials or
  // placeholders — they're excluded from Stripe rather than blocking checkout.
  const catalogIds = items
    .filter((i) => i.product_id && i.price_estimate == null)
    .map((i) => i.product_id as string);

  const priceById = new Map<string, number>();
  if (catalogIds.length > 0) {
    const { data: priceRows } = await admin
      .from("catalog_products")
      .select("id, price_usd")
      .in("id", catalogIds);
    for (const row of priceRows ?? []) {
      if (row.price_usd != null) priceById.set(row.id, row.price_usd);
    }
  }

  // Only include purchasable items; skip tutorials and zero-priced items.
  // resolvePrice applies: existing price_estimate → DB lookup → keyword fallback.
  const purchasable = items
    .filter((i) => i.product_type !== "tutorial")
    .map((i) => ({ ...i, price_estimate: resolvePrice(i, priceById) }))
    .filter((i) => i.price_estimate != null && i.price_estimate > 0);

  if (!purchasable.length) {
    return NextResponse.json(
      { error: "No purchasable items in cart." },
      { status: 400 }
    );
  }

  const origin = request.headers.get("origin") ?? new URL(request.url).origin;

  // Build Stripe line items from shelf products (dynamic price_data, no
  // pre-created price IDs needed — each product is bought ad-hoc by Qoyl).
  const lineItems = purchasable.map((item) => ({
    price_data: {
      currency: "usd",
      unit_amount: Math.round((item.price_estimate ?? 0) * 100), // cents
      product_data: {
        name: item.product_name,
        images: item.image_url ? [item.image_url] : [],
      },
    },
    quantity: item.quantity ?? 1,
  }));

  // Service fee line item (Qoyl's fulfillment/handling fee — 10%)
  const subtotal = purchasable.reduce(
    (s, i) => s + (i.price_estimate ?? 0) * (i.quantity ?? 1),
    0
  );
  const serviceFee = Math.round(subtotal * 0.1 * 100); // 10% in cents
  if (serviceFee > 0) {
    lineItems.push({
      price_data: {
        currency: "usd",
        unit_amount: serviceFee,
        product_data: {
          name: "Qoyl Fulfillment Service — We shop, pack, and ship your products to you",
          images: [],
        },
      },
      quantity: 1,
    });
  }

  // Insert a pending store_order row before creating the Stripe session so
  // we have an order ID to pass in metadata (the webhook updates it to
  // "paid" when payment completes).
  const { data: order, error: orderErr } = await admin
    .from("store_orders")
    .insert({
      user_id,
      cart_id: cart_id || user_id,
      status: "pending_payment",
      items: purchasable,
      subtotal_usd: subtotal,
      service_fee_usd: serviceFee / 100,
      total_usd: subtotal + serviceFee / 100,
      shipping_address: shipping_address ?? null,
    })
    .select("id")
    .single();

  if (orderErr || !order) {
    console.error("[store/checkout] Failed to insert store_order:", orderErr);
    return NextResponse.json(
      { error: "Failed to create order record." },
      { status: 500 }
    );
  }

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      line_items: lineItems,
      shipping_address_collection: shipping_address
        ? undefined
        : { allowed_countries: ["US", "CA", "GB"] },
      success_url: `${origin}/store/order-confirmed?order_id=${order.id}`,
      cancel_url: `${origin}/dashboard?store=cancelled`,
      metadata: {
        user_id,
        cart_id: cart_id ?? null,
        order_id: order.id,
        product_type: "store_order",
      },
      payment_intent_data: {
        metadata: {
          user_id,
          cart_id: cart_id ?? null,
          order_id: order.id,
        },
      },
    });

    // Stamp the session ID on the order row for reconciliation
    await admin
      .from("store_orders")
      .update({ stripe_session_id: session.id })
      .eq("id", order.id);

    return NextResponse.json({ url: session.url, order_id: order.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[store/checkout] Stripe session creation failed:", err);
    // Clean up the pending order if Stripe failed
    await admin.from("store_orders").delete().eq("id", order.id);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
