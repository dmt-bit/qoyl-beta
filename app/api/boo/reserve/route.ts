import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { BOO_EVENT, MAX_BASKETS_PER_ORDER } from "@/lib/boo/config";

// Public-facing reservation route - no admin auth. isAuthorizedAdmin
// doesn't apply here (see lib/adminAuth.ts's x-admin-password check,
// which only gates /admin/* tooling).

type OrderPayload = {
  user_id?: string | null;
  guest_email?: string | null;
  size: "boo" | "bigboo";
  size_price_cents: number;
  location: "logan_square" | "hyde_park";
  bonnet_color: string;
  tool: "scalp_massager" | "detangling_comb" | "satin_headband";
  candy: boolean;
  beanie: boolean;
  beanie_color?: string | null;
  minis: string[];
  extra_minis: number;
  full_size_product?: string | null;
  is_gift: boolean;
  gift_recipient_name?: string | null;
  gift_note?: string | null;
  gift_hair_type?: string | null;
  gift_porosity?: string | null;
};

type RequestBody = {
  orders?: OrderPayload[];
  paymentMethod?: "auto_charge" | "tap_to_pay";
};

export async function POST(request: Request) {
  const body: RequestBody = await request.json();
  const { orders, paymentMethod } = body;

  if (!orders || orders.length === 0) {
    return NextResponse.json({ error: "At least one basket is required." }, { status: 400 });
  }
  if (orders.length > MAX_BASKETS_PER_ORDER) {
    return NextResponse.json(
      { error: `A maximum of ${MAX_BASKETS_PER_ORDER} baskets per order.` },
      { status: 400 }
    );
  }
  if (paymentMethod !== "auto_charge" && paymentMethod !== "tap_to_pay") {
    return NextResponse.json({ error: "A valid payment method is required." }, { status: 400 });
  }
  for (const order of orders) {
    if (!order.size || !order.location || !order.bonnet_color || !order.tool) {
      return NextResponse.json({ error: "Each basket is missing a required field." }, { status: 400 });
    }
    if (order.is_gift && !order.gift_recipient_name?.trim()) {
      return NextResponse.json({ error: "Gift orders need a recipient name." }, { status: 400 });
    }
  }

  const totalReservationCents = BOO_EVENT.reservationCents * orders.length;

  // TODO: for auto_charge, also create a SetupIntent here (and collect
  // the card via its client secret alongside this PaymentIntent's) so a
  // card is on file to charge automatically the morning of pickup. Not
  // implemented yet - tap_to_pay orders settle the remainder in person
  // regardless, so this only blocks auto_charge's actual Oct 25 charge,
  // not today's $15 reservation below.
  let clientSecret: string;
  try {
    const paymentIntent = await getStripe().paymentIntents.create({
      amount: totalReservationCents,
      currency: "usd",
      metadata: {
        product: "boo_basket",
        basket_count: String(orders.length),
        payment_method: paymentMethod,
      },
      description: `Boo Basket reservation (${orders.length} basket${orders.length > 1 ? "s" : ""})`,
    });
    if (!paymentIntent.client_secret) {
      return NextResponse.json({ error: "Failed to create payment intent." }, { status: 500 });
    }
    clientSecret = paymentIntent.client_secret;

    const admin = getSupabaseAdmin();
    const rows = orders.map((order) => ({
      user_id: order.user_id ?? null,
      guest_email: order.guest_email ?? null,
      size: order.size,
      size_price_cents: order.size_price_cents,
      location: order.location,
      bonnet_color: order.bonnet_color,
      tool: order.tool,
      candy: order.candy,
      beanie: order.beanie,
      beanie_color: order.beanie ? order.beanie_color ?? null : null,
      minis: order.minis,
      extra_minis: order.extra_minis,
      full_size_product: order.full_size_product ?? null,
      is_gift: order.is_gift,
      gift_recipient_name: order.is_gift ? order.gift_recipient_name ?? null : null,
      gift_note: order.is_gift ? order.gift_note ?? null : null,
      gift_hair_type: order.is_gift ? order.gift_hair_type ?? null : null,
      gift_porosity: order.is_gift ? order.gift_porosity ?? null : null,
      payment_method: paymentMethod,
      stripe_payment_intent_id: paymentIntent.id,
      reservation_paid: false,
    }));

    const { data: inserted, error } = await admin.from("boo_orders").insert(rows).select("id");
    if (error || !inserted) {
      return NextResponse.json({ error: error?.message ?? "Failed to save order." }, { status: 500 });
    }

    return NextResponse.json({ clientSecret, orderIds: inserted.map((r) => r.id) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Failed to create Boo Basket reservation:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
