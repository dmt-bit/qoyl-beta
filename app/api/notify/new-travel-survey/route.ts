import { NextResponse } from "next/server";
import { sendNotificationEmail } from "@/lib/notify";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// /travel is a client component, so it can't import lib/notify.ts (and
// RESEND_API_KEY) directly -- this route is the server-side bridge,
// called fire-and-forget right after a successful travel_kits insert
// (status 'pending_payment'), before the user is redirected to Stripe.
export async function POST(request: Request) {
  console.log("[notify/new-travel-survey] route hit");

  const body = await request.json();
  const {
    user_id,
    destination,
    departure_date,
    return_date,
    climate,
    swimming,
    protective_style,
    hair_priority,
  }: Record<string, string | null> = body;

  console.log("[notify/new-travel-survey] request body:", JSON.stringify(body));

  const admin = getSupabaseAdmin();

  // Best-effort enrichment -- a lookup failure here must never block the
  // notification itself. Everything the recipient needs to manually
  // build the kit if automation hasn't run yet: who the user is, their
  // hair profile, and the full survey.
  let userEmail = "Unknown (lookup failed)";
  if (user_id) {
    try {
      const { data, error } = await admin.auth.admin.getUserById(user_id);
      if (!error && data.user?.email) userEmail = data.user.email;
    } catch (err) {
      console.error("[notify/new-travel-survey] Failed to look up user email:", err);
    }
  }

  let profileSummary = "No hair profile found for this user.";
  if (user_id) {
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
      console.error("[notify/new-travel-survey] Failed to look up hair profile:", err);
    }
  }

  const notifyResult = await sendNotificationEmail(
    `New travel kit survey submitted — ${destination}`,
    `New travel kit survey submitted on Qoyl.

=== User ===
User ID: ${user_id}
Email: ${userEmail}

=== Hair Profile ===
${profileSummary}

=== Trip Details ===
Destination: ${destination}
Departure: ${departure_date ?? "Not set"}
Return: ${return_date ?? "Not set"}
Climate: ${climate ?? "Not set"}
Swimming: ${swimming ?? "Not set"}
Protective style: ${protective_style ?? "Not set"}
Hair priority: ${hair_priority ?? "Not set"}

Submitted at: ${new Date().toISOString()}

=== Payment status ===
Pending — payment not yet completed. User is being directed to Stripe
now. If this notification arrives without a follow-up "Travel kit
purchased and generated" email, use the details above to build their
kit manually.`
  );

  console.log(
    "[notify/new-travel-survey] sendNotificationEmail result:",
    notifyResult
  );

  return NextResponse.json({ ok: true });
}
