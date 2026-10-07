import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// Called once per authenticated page load (see components/HomeScreenPrompt.tsx).
// Increments hair_profiles.login_count/last_login_at and returns the
// updated count plus the row's existing home_screen_prompted_at, so the
// caller can decide whether to show the prompt without a second request.
//
// Not atomic (read, then write count+1) - acceptable for this analytics
// counter (a single user's own page loads are effectively sequential),
// not something to build a financial feature on.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const userId = typeof body.user_id === "string" ? body.user_id : null;
  if (!userId) {
    return NextResponse.json({ error: "user_id is required." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data: profile, error: fetchError } = await admin
    .from("hair_profiles")
    .select("login_count, home_screen_prompted_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError || !profile) {
    // No hair_profiles row yet (e.g. signed in, no profile saved) -
    // nothing to track against. Not an error from the caller's side.
    return NextResponse.json({ login_count: 0, home_screen_prompted_at: null, has_profile: false });
  }

  const nextCount = (profile.login_count ?? 0) + 1;
  const { error: updateError } = await admin
    .from("hair_profiles")
    .update({ login_count: nextCount, last_login_at: new Date().toISOString() })
    .eq("user_id", userId);

  if (updateError) {
    console.error("[track-login] update failed:", updateError.message);
  }

  return NextResponse.json({
    login_count: nextCount,
    home_screen_prompted_at: profile.home_screen_prompted_at,
    has_profile: true,
  });
}
