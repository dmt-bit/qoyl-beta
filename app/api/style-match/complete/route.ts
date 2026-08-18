import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { sendNotificationEmail } from "@/lib/notify";
import { lookupCityState } from "@/lib/zipLookup";

type CompleteRequestBody = {
  user_id?: string;
  input_type?: "photo" | "text";
  input_text?: string | null;
  image_url?: string | null;
  detected_style?: string;
  detected_details?: Record<string, unknown>;
  tutorials?: unknown;
  shopping_list?: unknown;
  stylist_id?: string | null;
  choice?: "diy" | "stylist";
};

// Trusts user_id from the request body rather than validating a session
// server-side -- same trust model as app/api/purchases/route.ts, the
// only other existing example of a client-triggered server route keyed
// by user id in this codebase.
export async function POST(request: Request) {
  console.log("[style-match/complete] route hit");

  const body: CompleteRequestBody = await request.json();
  const {
    user_id,
    input_type,
    input_text,
    image_url,
    detected_style,
    detected_details,
    tutorials,
    shopping_list,
    stylist_id,
    choice,
  } = body;

  if (!user_id || !input_type || !detected_style) {
    return NextResponse.json(
      { error: "user_id, input_type, and detected_style are required." },
      { status: 400 }
    );
  }

  const admin = getSupabaseAdmin();

  const { data: row, error } = await admin
    .from("style_matches")
    .insert({
      user_id,
      input_type,
      input_text: input_text ?? null,
      image_url: image_url ?? null,
      detected_style,
      detected_details: detected_details ?? null,
      tutorials: tutorials ?? null,
      shopping_list: shopping_list ?? null,
      stylist_id: stylist_id ?? null,
    })
    .select()
    .single();

  if (error || !row) {
    console.error("[style-match/complete] Failed to insert style_matches row:", error);
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
Input type: ${input_type}

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
