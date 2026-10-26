import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// Public, no auth - this is the data source for both the embedded
// "your complete look" section and the public /look/[id] share page
// (item 5 - readable by anyone, no login required). Nothing sensitive
// is stored here (see supabase/style_cart.sql's RLS comment).
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { data: cart, error } = await getSupabaseAdmin()
    .from("style_cart")
    .select("id, created_at, items, checkout_status, style_match_id")
    .eq("id", params.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!cart) return NextResponse.json({ error: "Cart not found." }, { status: 404 });

  return NextResponse.json({ cart });
}

// Marks checkout_status: "shared" (item 5) or "purchased" - a plain
// status flip, no payment is ever processed here (every purchase
// happens off-platform on the seller's own site/Amazon/YouTube).
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();
  const status = body.checkout_status;
  if (status !== "shared" && status !== "purchased") {
    return NextResponse.json({ error: "checkout_status must be 'shared' or 'purchased'." }, { status: 400 });
  }

  const { error } = await getSupabaseAdmin().from("style_cart").update({ checkout_status: status }).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
