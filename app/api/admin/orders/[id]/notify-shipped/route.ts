import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isAuthorizedAdmin } from "@/lib/adminAuth";
import { sendOrderShippedEmail } from "@/lib/sendOrderShippedEmail";

// POST /api/admin/orders/[id]/notify-shipped
// Called by the admin orders page when an order is marked shipped.
// Looks up the order + customer email, then sends the shipped notification.

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  if (!isAuthorizedAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const orderId = params.id;
  const admin = getSupabaseAdmin();

  // Load the order
  const { data: order, error: orderErr } = await admin
    .from("store_orders")
    .select("id, user_id, status, shipping_address, tracking_number")
    .eq("id", orderId)
    .single();

  if (orderErr || !order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  // Look up the user's email + first name from auth.users / hair_profiles
  const { data: { user }, error: userErr } = await admin.auth.admin.getUserById(order.user_id);
  if (userErr || !user?.email) {
    console.error("[notify-shipped] Could not load user email:", order.user_id, userErr);
    return NextResponse.json({ error: "Could not look up customer email." }, { status: 500 });
  }

  const { data: profile } = await admin
    .from("hair_profiles")
    .select("first_name")
    .eq("user_id", order.user_id)
    .maybeSingle();

  const result = await sendOrderShippedEmail({
    recipientEmail: user.email,
    firstName: profile?.first_name ?? null,
    orderId,
    trackingNumber: order.tracking_number ?? null,
    shippingAddress: order.shipping_address ?? null,
  });

  if (!result.sent) {
    console.error("[notify-shipped] Email failed:", orderId, result);
    return NextResponse.json(
      { error: `Failed to send email: ${result.reason}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ sent: true, emailId: result.id });
}
