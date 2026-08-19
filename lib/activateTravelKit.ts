import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { sendNotificationEmail } from "@/lib/notify";
import { generateTravelKitProducts } from "@/lib/travelKitGenerator";
import { sendTravelKitEmail } from "@/lib/sendTravelKitEmail";

// Shared by the real Stripe webhook (app/api/stripe/webhook/route.ts)
// and the admin bypass (app/api/travel-kits/admin-activate/route.ts) --
// same generation/activation/notification logic either way, so the two
// paths can't quietly drift apart. `source` only changes what shows up
// in the internal notification email, not the kit itself.
export async function activateTravelKit({
  travelKitId,
  userId,
  recipientEmail,
  stripeSessionId,
  stripeCustomerId,
  source,
}: {
  travelKitId: string;
  userId: string;
  recipientEmail: string | null;
  stripeSessionId: string | null;
  stripeCustomerId: string | null;
  source: "stripe" | "admin_bypass";
}): Promise<{ ok: boolean }> {
  const admin = getSupabaseAdmin();

  const { data: travelKitRow, error: fetchError } = await admin
    .from("travel_kits")
    .select(
      "destination, departure_date, return_date, climate, swimming, protective_style, hair_priority"
    )
    .eq("id", travelKitId)
    .single();

  if (fetchError || !travelKitRow) {
    console.error("Couldn't load travel_kits row for generation:", travelKitId, fetchError);
    return { ok: false };
  }

  const products = await generateTravelKitProducts({
    userId,
    climate: travelKitRow.climate,
    swimming: travelKitRow.swimming,
    protectiveStyle: travelKitRow.protective_style,
    hairPriority: travelKitRow.hair_priority,
  });

  const { error: updateError } = await admin
    .from("travel_kits")
    .update({
      status: "active",
      products,
      stripe_session_id: stripeSessionId,
    })
    .eq("id", travelKitId);

  if (updateError) {
    console.error("Failed to update travel_kits row after activation:", travelKitId, updateError);
  }

  const { data: travelProfile } = await admin
    .from("hair_profiles")
    .select("curl_type, porosity, scalp_condition, zip_code")
    .eq("user_id", userId)
    .maybeSingle();

  let travelEmailStatus = "Confirmation email sent to customer.";

  if (!recipientEmail) {
    console.error("Missing recipient email for travel kit email:", travelKitId);
    travelEmailStatus = "Confirmation email NOT sent — no recipient email available.";
  } else {
    try {
      await sendTravelKitEmail({
        recipientEmail,
        destination: travelKitRow.destination,
        departureDate: travelKitRow.departure_date,
        returnDate: travelKitRow.return_date,
        climate: travelKitRow.climate,
        swimming: travelKitRow.swimming,
        protectiveStyle: travelKitRow.protective_style,
        products,
      });
    } catch (emailError) {
      console.error("Failed to send travel kit email:", travelKitId, emailError);
      travelEmailStatus = "Confirmation email FAILED to send — see server logs.";
    }
  }

  const subjectPrefix = source === "admin_bypass" ? "[Admin bypass] " : "";
  const amountLine = source === "admin_bypass" ? "Amount: $0 (admin bypass, no payment)" : "Amount: $4.99";

  await sendNotificationEmail(
    `${subjectPrefix}Travel kit purchased — ${travelKitRow.destination}`,
    `Travel kit ${source === "admin_bypass" ? "generated via admin bypass (no payment)" : "purchased and generated"} — ${travelKitRow.destination} for ${userId}.

User ID: ${userId}
Customer email: ${recipientEmail ?? "Unknown"}
Destination: ${travelKitRow.destination}
Departure: ${travelKitRow.departure_date ?? "Not set"}
Return: ${travelKitRow.return_date ?? "Not set"}
Stripe customer: ${stripeCustomerId ?? "none"}
${amountLine}

Curl type: ${travelProfile?.curl_type ?? "Not set"}
Porosity: ${travelProfile?.porosity ?? "Not set"}
Scalp condition: ${travelProfile?.scalp_condition ?? "Not set"}
Zip code: ${travelProfile?.zip_code ?? "Not set"}

Products generated: ${products.length}
${travelEmailStatus}

View this travel_kits row (id: ${travelKitId}) in Supabase:
https://app.supabase.com/project/cqpxiassldkmusngqorx/editor`
  );

  return { ok: true };
}
