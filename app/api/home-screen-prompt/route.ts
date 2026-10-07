import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { logMlEvent } from "@/lib/mlEvents";

type Action = "shown" | "added" | "skipped";
const ACTIONS: Action[] = ["shown", "added", "skipped"];

// One route for all three home-screen-prompt events (see
// components/HomeScreenPrompt.tsx). "shown" also marks
// hair_profiles.home_screen_prompted_at, which is what makes the prompt
// never show again - idempotent (IS NULL guard), so a retried request
// can't stomp an earlier timestamp.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const action = body.action as Action;
  const userId = typeof body.user_id === "string" ? body.user_id : null;
  const loginCount = typeof body.login_count === "number" ? body.login_count : null;
  const platform = typeof body.platform === "string" ? body.platform : null;

  if (!ACTIONS.includes(action) || !userId) {
    return NextResponse.json({ error: "action and user_id are required." }, { status: 400 });
  }

  if (action === "shown") {
    const { error } = await getSupabaseAdmin()
      .from("hair_profiles")
      .update({ home_screen_prompted_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("home_screen_prompted_at", null);
    if (error) console.error("[home-screen-prompt] prompted_at update failed:", error.message);
  }

  const eventType = action === "shown" ? "home_screen_prompt_shown" : action === "added" ? "home_screen_added" : "home_screen_skipped";
  await logMlEvent(eventType, { userId, metadata: { login_count: loginCount, platform } });

  return NextResponse.json({ ok: true });
}
