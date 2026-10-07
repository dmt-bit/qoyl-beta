import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isAuthorizedAdmin } from "@/lib/adminAuth";

// Proxy metric for installed users (Part 6 of the home screen prompt spec) -
// not perfect (standalone mode can't be checked outside a page load, so
// someone who installed but hasn't reopened the app in 30 days won't show
// here), but meaningful.
export async function GET(request: Request) {
  if (!isAuthorizedAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: standaloneEvents }, { data: promptEvents }, { data: addedEvents }, { data: skippedEvents }] =
    await Promise.all([
      admin.from("ml_events").select("user_id").eq("event_type", "launched_standalone").gte("created_at", since30d),
      admin.from("ml_events").select("id").eq("event_type", "home_screen_prompt_shown"),
      admin.from("ml_events").select("id").eq("event_type", "home_screen_added"),
      admin.from("ml_events").select("id").eq("event_type", "home_screen_skipped"),
    ]);

  const standaloneUsers = new Set((standaloneEvents ?? []).map((e) => e.user_id).filter(Boolean)).size;
  const promptedCount = promptEvents?.length ?? 0;
  const addedCount = addedEvents?.length ?? 0;
  const skippedCount = skippedEvents?.length ?? 0;

  return NextResponse.json({
    standaloneUsers30d: standaloneUsers,
    standaloneSessions30d: standaloneEvents?.length ?? 0,
    promptedCount,
    addedCount,
    skippedCount,
    installRate: promptedCount > 0 ? Math.round((addedCount / promptedCount) * 100) : null,
  });
}
