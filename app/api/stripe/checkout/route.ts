import { NextResponse } from "next/server";
import { getStripe, ProductType, STRIPE_PRODUCTS } from "@/lib/stripe";

export async function POST(request: Request) {
  const body = await request.json();
  const {
    product_type,
    user_id,
    email,
  }: { product_type?: ProductType; user_id?: string; email?: string } = body;

  if (!product_type || !user_id || !email) {
    return NextResponse.json(
      { error: "product_type, user_id, and email are required." },
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

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: product.mode,
      customer_email: email,
      line_items: [{ price: product.priceId, quantity: 1 }],
      success_url: `${origin}/dashboard?payment=success`,
      cancel_url: `${origin}/dashboard?payment=cancelled`,
      metadata: { user_id, product_type },
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
