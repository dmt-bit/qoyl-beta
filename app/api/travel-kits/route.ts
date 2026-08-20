import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { sendNotificationEmail } from "@/lib/notify";
import { formatTripDatesForNotification } from "@/lib/tripDates";

// /travel is a client component, so it can't import lib/supabaseAdmin.ts
// (service role key) or lib/notify.ts (RESEND_API_KEY) directly. This
// route is the server-side bridge for the survey step: it saves the
// trip details and sends the admin notification as one atomic
// server-side action, using the service role client so the insert never
// depends on the caller's RLS session -- eliminates the "notified but
// not saved" split that a client-side insert + separate notify call
// could previously drift into (e.g. a stale cached bundle only doing
// one half of the flow).
export async function POST(request: Request) {
  console.log("[travel-kits] route hit");

  const body = await request.json();
  const {
    user_id,
    destination,
    departure_date,
    return_date,
    travel_month,
    climate,
    swimming,
    protective_style,
    hair_priority,
  }: Record<string, string | null> = body;

  console.log("[travel-kits] request body:", JSON.stringify(body));

  if (!user_id || !destination) {
    return NextResponse.json(
      { error: "user_id and destination are required." },
      { status: 400 }
    );
  }

  const admin = getSupabaseAdmin();

  const { data, error } = await admin
    .from("travel_kits")
    .insert({
      user_id,
      destination,
      departure_date,
      return_date,
      travel_month,
      climate,
      swimming,
      protective_style,
      hair_priority,
      status: "pending_payment",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[travel-kit] Supabase insert failed:", JSON.stringify(error));
    return NextResponse.json(
      { error: "Couldn't save your trip details. Please try again." },
      { status: 500 }
    );
  }

  console.log("[travel-kit] Saved to travel_kits:", data);

  const travelKitId = data.id;

  // Best-effort enrichment -- a lookup failure here must never block the
  // notification itself. Everything the recipient needs to manually
  // build the kit if automation hasn't run yet: who the user is, their
  // hair profile, and the full survey.
  let userEmail = "Unknown (lookup failed)";
  try {
    const { data: userLookup, error: userLookupError } =
      await admin.auth.admin.getUserById(user_id);
    if (!userLookupError && userLookup.user?.email) {
      userEmail = userLookup.user.email;
    }
  } catch (err) {
    console.error("[travel-kits] Failed to look up user email:", err);
  }

  let profileSummary = "No hair profile found for this user.";
  try {
    const { data: profile } = await admin
      .from("hair_profiles")
      .select("curl_type, porosity, scalp_condition, zip_code")
      .eq("user_id", user_id)
      .maybeSingle();

    if (profile) {
      profileSummary =
        `Curl type: ${profile.curl_type ?? "Not set"}\n` +
        `Porosity: ${profile.porosity ?? "Not set"}\n` +
        `Scalp condition: ${profile.scalp_condition ?? "Not set"}\n` +
        `Zip code: ${profile.zip_code ?? "Not set"}`;
    }
  } catch (err) {
    console.error("[travel-kits] Failed to look up hair profile:", err);
  }

  const notifyResult = await sendNotificationEmail(
    `New travel kit survey submitted — ${destination}`,
    `New travel kit survey submitted on Qoyl.

=== Travel Kit Row ===
travel_kits.id: ${travelKitId}

=== User ===
User ID: ${user_id}
Email: ${userEmail}

=== Hair Profile ===
${profileSummary}

=== Trip Details ===
Destination: ${destination}
${formatTripDatesForNotification(departure_date, return_date, travel_month)}
Climate: ${climate ?? "Not set"}
Swimming: ${swimming ?? "Not set"}
Protective style: ${protective_style ?? "Not set"}
Hair priority: ${hair_priority ?? "Not set"}

Submitted at: ${new Date().toISOString()}

=== Payment status ===
Pending — payment not yet completed. User is being directed to Stripe
now. If this notification arrives without a follow-up "Travel kit
purchased and generated" email, look up travel_kits.id ${travelKitId}
in Supabase and use the details above to build their kit manually.`
  );

  console.log("[travel-kits] sendNotificationEmail result:", notifyResult);

  return NextResponse.json({ id: travelKitId });
}
