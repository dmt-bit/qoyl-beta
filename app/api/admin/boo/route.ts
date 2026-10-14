import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isAuthorizedAdmin } from "@/lib/adminAuth";

export async function GET(request: Request) {
  if (!isAuthorizedAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const { data: orders, error } = await admin
    .from("boo_orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // boo_orders doesn't denormalize a name - batched lookup against
  // hair_profiles for the "name/email" column, same pattern as the
  // stylist dashboard's recent-matches batching (lib/stylistData.ts in
  // qoyl-business). Guest orders (no user_id) fall back to guest_email
  // in the client, so this map only needs to cover signed-in orders.
  const userIds = Array.from(new Set((orders ?? []).map((o) => o.user_id).filter(Boolean)));
  const namesByUserId: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await admin
      .from("hair_profiles")
      .select("user_id, first_name, last_name, email")
      .in("user_id", userIds);
    for (const p of profiles ?? []) {
      const name = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
      namesByUserId[p.user_id] = name || p.email || p.user_id;
    }
  }

  return NextResponse.json({ orders: orders ?? [], namesByUserId });
}
