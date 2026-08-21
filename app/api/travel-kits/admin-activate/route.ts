import { NextResponse } from "next/server";
import { activateTravelKit } from "@/lib/activateTravelKit";
import { isAdmin } from "@/lib/isAdmin";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// Admin-only bypass for the travel kit paywall - skips Stripe checkout
// entirely and runs the exact same activation logic the webhook runs
// after a real payment (see lib/activateTravelKit.ts). Verifies admin
// status server-side from the user's actual account (not a client-
// supplied email) before doing anything.
export async function POST(request: Request) {
  const body = await request.json();
  const { user_id, travel_kit_id }: { user_id?: string; travel_kit_id?: string } = body;

  if (!user_id || !travel_kit_id) {
    return NextResponse.json(
      { error: "user_id and travel_kit_id are required." },
      { status: 400 }
    );
  }

  const { data: userData, error: userError } =
    await getSupabaseAdmin().auth.admin.getUserById(user_id);

  if (userError || !userData.user || !isAdmin(userData.user.email)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const result = await activateTravelKit({
    travelKitId: travel_kit_id,
    userId: user_id,
    recipientEmail: userData.user.email ?? null,
    stripeSessionId: null,
    stripeCustomerId: null,
    source: "admin_bypass",
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: "Couldn't activate this travel kit. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
