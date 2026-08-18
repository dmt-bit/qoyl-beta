import { NextResponse } from "next/server";
import { getStripe, ProductType, STRIPE_PRODUCTS } from "@/lib/stripe";

export async function POST(request: Request) {
  const body = await request.json();
  const {
    product_type,
    user_id,
    email,
    travel_kit_id,
  }: {
    product_type?: ProductType;
    user_id?: string;
    email?: string;
    travel_kit_id?: string;
  } = body;

  if (!product_type || !user_id || !email) {
    return NextResponse.json(
      { error: "product_type, user_id, and email are required." },
      { status: 400 }
    );
  }

  if (product_type === "travel_kit" && !travel_kit_id) {
    return NextResponse.json(
      { error: "travel_kit_id is required for travel_kit checkout." },
      { status: 400 }
    );
  }

  const product = STRIPE_PRODUCTS[product_type];
  if (!product) {
    return NextResponse.json(
      { error: "Invalid product_type." },
      { status: 400 }
    );
  }

  if (!product.priceId) {
    return NextResponse.json(
      {
        error: `Missing Stripe price ID for "${product_type}". Set the corresponding env var.`,
      },
      { status: 500 }
    );
  }

  const origin = request.headers.get("origin") ?? new URL(request.url).origin;

  // routine_subscription lands the user on their new routine directly;
  // travel_kit lands back on /travel showing the kit that was just
  // generated (see the webhook, which populates travel_kits.products
  // before this redirect happens); anything else still lands on the
  // dashboard.
  const successUrl =
    product_type === "routine_subscription"
      ? `${origin}/routine?welcome=true`
      : product_type === "travel_kit"
      ? `${origin}/travel?kit=${travel_kit_id}&welcome=true`
      : `${origin}/dashboard?payment=success`;

  const cancelUrl =
    product_type === "travel_kit"
      ? `${origin}/travel?payment=cancelled`
      : `${origin}/dashboard?payment=cancelled`;

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: product.mode,
      customer_email: email,
      line_items: [{ price: product.priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        user_id,
        product_type,
        ...(travel_kit_id ? { travel_kit_id } : {}),
      },
      ...(product.mode === "subscription"
        ? { subscription_data: { metadata: { user_id, product_type } } }
        : {}),
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Failed to create checkout session." },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Failed to create Stripe checkout session:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
