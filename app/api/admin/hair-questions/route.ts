import { NextResponse } from "next/server";
import { isAuthorizedAdmin } from "@/lib/adminAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// Aggregated view of the home page hair Q&A: one row per distinct question
// (with intent and curl type), how often it was asked, and the share of
// those asks that led to a feature tap. A tap counts when a
// hair_question_click shares the same session_id and question.
export const dynamic = "force-dynamic";

const PAGE_SIZE = 1000;
const MAX_PAGES = 10; // up to 10,000 events - enough for a few weeks of traffic

type Row = {
  event_type: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

async function fetchEvents(): Promise<Row[]> {
  const admin = getSupabaseAdmin();
  const rows: Row[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await admin
      .from("ml_events")
      .select("event_type, created_at, metadata")
      .in("event_type", ["hair_question", "hair_question_click"])
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as Row[]));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}

const str = (v: unknown) => (typeof v === "string" ? v : null);

export async function GET(request: Request) {
  if (!isAuthorizedAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const events = await fetchEvents();

    const clickKeys = new Set<string>();
    for (const e of events) {
      if (e.event_type !== "hair_question_click") continue;
      const session = str(e.metadata?.session_id);
      const question = str(e.metadata?.question);
      if (session && question) clickKeys.add(`${session}\u0000${question}`);
    }

    type Group = { question: string; intent: string | null; curl_type: string | null; asked: number; clicked: number };
    const groups = new Map<string, Group>();
    let totalAsked = 0;
    let totalClicked = 0;

    for (const e of events) {
      if (e.event_type !== "hair_question") continue;
      const question = str(e.metadata?.question) ?? "";
      const intent = str(e.metadata?.intent);
      const curl = str(e.metadata?.curl_type);
      const session = str(e.metadata?.session_id) ?? "";
      const key = `${question}\u0000${intent ?? ""}\u0000${curl ?? ""}`;

      const clicked = clickKeys.has(`${session}\u0000${question}`);
      const group = groups.get(key) ?? { question, intent, curl_type: curl, asked: 0, clicked: 0 };
      group.asked += 1;
      totalAsked += 1;
      if (clicked) {
        group.clicked += 1;
        totalClicked += 1;
      }
      groups.set(key, group);
    }

    const rows = Array.from(groups.values())
      .sort((a, b) => b.asked - a.asked)
      .slice(0, 100)
      .map((g) => ({
        question: g.question,
        intent: g.intent,
        curl_type: g.curl_type,
        times_asked: g.asked,
        click_through_rate: g.asked ? Math.round((g.clicked / g.asked) * 100) : 0,
      }));

    return NextResponse.json({
      rows,
      totals: {
        asked: totalAsked,
        clicked: totalClicked,
        click_through_rate: totalAsked ? Math.round((totalClicked / totalAsked) * 100) : 0,
        events_scanned: events.length,
      },
    });
  } catch (error) {
    console.error("[admin/hair-questions] failed:", error);
    return NextResponse.json({ error: "Couldn't load questions." }, { status: 500 });
  }
}
