import { NextResponse } from "next/server";
import { activateTravelKit } from "@/lib/activateTravelKit";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// Travel kits are free: /travel calls this directly after the survey is
// saved (app/api/travel-kits/route.ts), and it generates, activates, and
// emails the kit in one request. Replaces the Stripe checkout + webhook
// path and the admin-only bypass that used to sit beside it.
//
// The caller's user_id comes from the request body, the same trust model
// as app/api/travel-kits/route.ts. The row ownership check below stops a
// caller from generating someone else's kit by id, but it does not verify
// the caller's identity.
export async function POST(request: Request) {
  const body = await request.json();
  const { user_id, travel_kit_id }: { user_id?: string; travel_kit_id?: string } = body;

  if (!user_id || !travel_kit_id) {
    return NextResponse.json(
      { error: "user_id and travel_kit_id are required." },
      { status: 400 }
    );
  }

  const admin = getSupabaseAdmin();

  const { data: kitRow, error: kitError } = await admin
    .from("travel_kits")
    .select("user_id, status")
    .eq("id", travel_kit_id)
    .maybeSingle();

  if (kitError || !kitRow || kitRow.user_id !== user_id) {
    return NextResponse.json({ error: "Travel kit not found." }, { status: 404 });
  }

  // Already generated (e.g. a retried submit) - don't regenerate or send
  // the confirmation email a second time.
  if (kitRow.status === "active") {
    return NextResponse.json({ ok: true, alreadyActive: true });
  }

  const { data: userData, error: userError } = await admin.auth.admin.getUserById(user_id);
  const recipientEmail = userError ? null : userData.user?.email ?? null;

  const result = await activateTravelKit({
    travelKitId: travel_kit_id,
    userId: user_id,
    recipientEmail,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: "Couldn't build this travel kit. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
