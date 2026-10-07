import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { sanitizeRoute } from "@/lib/hairQuestion";

// Logs a tap on a hair Q&A feature link, before the client navigates. The
// gap between hair_question and hair_question_click events is the response
// quality signal (see the admin questions view).
export const dynamic = "force-dynamic";

function str(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, max);
  return t || null;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const sessionId = str(body.session_id, 64);
  const question = str(body.question, 500);
  const route = sanitizeRoute(body.route_clicked, true);
  if (!sessionId || !question || !route) {
    return NextResponse.json({ error: "session_id, question and a valid route_clicked are required." }, { status: 400 });
  }

  await getSupabaseAdmin()
    .from("ml_events")
    .insert({
      event_type: "hair_question_click",
      user_id: null,
      metadata: {
        session_id: sessionId,
        question,
        intent: str(body.intent, 40),
        route_clicked: route,
        had_secondary: Boolean(body.had_secondary),
      },
    })
    .then(({ error }) => {
      if (error) console.error("[hair-question/click] ml_events insert failed:", error.message);
    });

  return NextResponse.json({ ok: true });
}
