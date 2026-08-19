import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { sendNotificationEmail } from "@/lib/notify";
import { lookupCityState } from "@/lib/zipLookup";

type CompleteRequestBody = {
  match_id?: string;
  user_id?: string;
  detected_style?: string;
  tutorials?: unknown;
  shopping_list?: unknown;
  stylist_id?: string | null;
  choice?: "diy" | "stylist";
};

// Updates the row app/api/style-match/create/route.ts already inserted
// (see that file for why match creation and completion are two separate
// calls) with the results data and DIY/stylist choice, then sends the
// hey@qoyl.live notification. user_id is trusted from the request body
// rather than a validated session -- same trust model as
// app/api/purchases/route.ts.
export async function POST(request: Request) {
  console.log("[style-match/complete] route hit");

  const body: CompleteRequestBody = await request.json();
  const {
    match_id,
    user_id,
    detected_style,
    tutorials,
    shopping_list,
    stylist_id,
    choice,
  } = body;

  if (!match_id || !user_id || !detected_style) {
    return NextResponse.json(
      { error: "match_id, user_id, and detected_style are required." },
      { status: 400 }
    );
  }

  const admin = getSupabaseAdmin();

  const { data: row, error } = await admin
    .from("style_matches")
    .update({
      tutorials: tutorials ?? null,
      shopping_list: shopping_list ?? null,
      stylist_id: stylist_id ?? null,
    })
    .eq("id", match_id)
    .select()
    .single();

  if (error || !row) {
    console.error("[style-match/complete] Failed to update style_matches row:", error);
    return NextResponse.json(
      { error: "Couldn't save this style match. Please try again." },
      { status: 500 }
    );
  }

  const { data: profile } = await admin
    .from("hair_profiles")
    .select("curl_type, porosity, scalp_condition, zip_code")
    .eq("user_id", user_id)
    .maybeSingle();

  const city = profile?.zip_code
    ? (await lookupCityState(profile.zip_code))?.city ?? "Unknown"
    : "Unknown";

  const notifyResult = await sendNotificationEmail(
    `New style match — ${detected_style} for ${profile?.curl_type ?? "unknown curl type"}`,
    `Detected style: ${detected_style}
Input type: ${row.input_type}

Hair profile:
Curl type: ${profile?.curl_type ?? "Not set"}
Porosity: ${profile?.porosity ?? "Not set"}
Scalp condition: ${profile?.scalp_condition ?? "Not set"}
City: ${city}

Choice: ${choice === "stylist" ? "Booking a stylist" : "DIY"}
${stylist_id ? `Stylist ID: ${stylist_id}` : ""}

View this style_matches row (id: ${row.id}) in Supabase:
https://app.supabase.com/project/cqpxiassldkmusngqorx/editor`
  );

  if (!notifyResult.sent) {
    console.error("[style-match/complete] Notification email not sent:", notifyResult);
  }

  return NextResponse.json({ id: row.id });
}
