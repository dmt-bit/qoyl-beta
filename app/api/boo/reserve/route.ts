import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { MAX_BASKETS_PER_ORDER, TOOLS_INCLUDED, type SizeId, type ToolId } from "@/lib/boo/config";

// Public-facing reservation route - no admin auth. isAuthorizedAdmin
// doesn't apply here (see lib/adminAuth.ts's x-admin-password check,
// which only gates /admin/* tooling). Sign-in is still required to
// reach this point in practice (app/boo/page.tsx gates BooBuilder on
// a real user), but this route doesn't re-check that itself - it's
// just creating pending order rows, not charging anything.

type OrderPayload = {
  user_id?: string | null;
  size: "boo" | "bigboo";
  size_price_cents: number;
  location: "logan_square" | "hyde_park";
  bonnet_color: string;
  tools: ToolId[];
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
};

export async function POST(request: Request) {
  const body: RequestBody = await request.json();
  const { orders } = body;

  if (!orders || orders.length === 0) {
    return NextResponse.json({ error: "At least one basket is required." }, { status: 400 });
  }
  if (orders.length > MAX_BASKETS_PER_ORDER) {
    return NextResponse.json(
      { error: `A maximum of ${MAX_BASKETS_PER_ORDER} baskets per order.` },
      { status: 400 }
    );
  }
  for (const order of orders) {
    if (!order.size || !order.location || !order.bonnet_color || !order.tools?.length) {
      return NextResponse.json({ error: "Each basket is missing a required field." }, { status: 400 });
    }
    const toolMax = TOOLS_INCLUDED[order.size as SizeId];
    if (order.tools.length !== toolMax) {
      return NextResponse.json({ error: `Each ${order.size} basket needs exactly ${toolMax} tools.` }, { status: 400 });
    }
    if (order.is_gift && !order.gift_recipient_name?.trim()) {
      return NextResponse.json({ error: "Gift orders need a recipient name." }, { status: 400 });
    }
  }

  // No PaymentIntent here anymore - the $15 deposit is collected on
  // Stripe's hosted Payment Link page (see BOO_STRIPE_PAYMENT_LINK),
  // which this route's caller redirects to after getting orderIds back.
  // reservation_paid stays false until a webhook reconciles payment by
  // client_reference_id - not built yet, matching this request's file
  // scope (no new API route was asked for here).
  try {
    const admin = getSupabaseAdmin();
    const rows = orders.map((order) => ({
      user_id: order.user_id ?? null,
      size: order.size,
      size_price_cents: order.size_price_cents,
      location: order.location,
      bonnet_color: order.bonnet_color,
      tools: order.tools,
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
      // boo_orders.payment_method is NOT NULL with a CHECK constraint -
      // widened to allow this value, see
      // supabase/boo_orders_stripe_link.sql (not yet run live).
      payment_method: "stripe_link",
      reservation_paid: false,
    }));

    const { data: inserted, error } = await admin.from("boo_orders").insert(rows).select("id");
    if (error || !inserted) {
      return NextResponse.json({ error: error?.message ?? "Failed to save order." }, { status: 500 });
    }

    return NextResponse.json({ orderIds: inserted.map((r) => r.id) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Failed to create Boo Basket reservation:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
