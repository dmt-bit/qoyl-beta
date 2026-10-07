import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { logMlEvent } from "@/lib/mlEvents";

// Logged once per tab session when the app is detected running in
// standalone (home screen) mode - see components/HomeScreenPrompt.tsx.
// user_id is optional: an anonymous visitor can still have the app
// installed, and that's worth counting even with no profile to update.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const userId = typeof body.user_id === "string" ? body.user_id : null;
  const sessionId = typeof body.session_id === "string" ? body.session_id : null;

  await logMlEvent("launched_standalone", {
    userId,
    metadata: { session_id: sessionId, timestamp: new Date().toISOString() },
  });

  if (userId) {
    const admin = getSupabaseAdmin();
    const { data: profile } = await admin
      .from("hair_profiles")
      .select("launched_standalone_count")
      .eq("user_id", userId)
      .maybeSingle();
    if (profile) {
      const { error } = await admin
        .from("hair_profiles")
        .update({ launched_standalone_count: (profile.launched_standalone_count ?? 0) + 1 })
        .eq("user_id", userId);
      if (error) console.error("[log-standalone] count update failed:", error.message);
    }
  }

  return NextResponse.json({ ok: true });
}
