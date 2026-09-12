import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { sendNotificationEmail } from "@/lib/notify";
import { buildStyleMatchSummary } from "@/lib/styleMatchSummary";

// Public, unauthenticated - the whole point of this route is that a
// client can hand the URL to any stylist, on or off Qoyl, with no login.
// The style_matches.id itself (an unguessable uuid) is the access
// control, same trust model as e.g. a "anyone with the link" doc share -
// see supabase/style_match_summary.sql. Only a hand-picked, non-PII-ish
// subset of the client's data is exposed (lib/styleMatchSummary.ts) -
// no name/email, and a matched stylist's phone/contact is deliberately
// left out too, matching the existing privacy boundary already drawn in
// app/api/style-match/stylists/route.ts.
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const summary = await buildStyleMatchSummary(params.id);
  if (!summary) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  // First-view notification (item 7) - a high-intent signal that a
  // client is actively preparing to book. Gated on summary_generated_at
  // so a stylist reloading the link later doesn't re-notify every time.
  const admin = getSupabaseAdmin();
  const { data: current } = await admin
    .from("style_matches")
    .select("summary_generated_at")
    .eq("id", params.id)
    .maybeSingle();

  if (current && !current.summary_generated_at) {
    const now = new Date().toISOString();
    await admin.from("style_matches").update({ summary_generated_at: now }).eq("id", params.id);

    const city = summary.clientProfile.cityState ?? "an unknown city";
    const curlType = summary.clientProfile.curlType ?? "an unspecified curl type";
    const summaryUrl = `https://qoyl.live/style-match/summary/${params.id}`;

    sendNotificationEmail(
      `Style Match summary generated - ${summary.detectedStyle} for ${curlType} in ${city}`,
      `Style: ${summary.detectedStyle}
Client curl type: ${curlType}
City: ${city}
Stylist matched: ${summary.matchedStylist ? summary.matchedStylist.displayName : "None"}
Summary URL: ${summaryUrl}`
    ).catch((err) => console.error("[style-match/summary] notification failed:", err));
  }

  return NextResponse.json(summary);
}
