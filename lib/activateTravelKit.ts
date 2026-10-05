import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { sendNotificationEmail } from "@/lib/notify";
import { generateTravelKitProducts } from "@/lib/travelKitGenerator";
import { sendTravelKitEmail } from "@/lib/sendTravelKitEmail";
import { formatTripDatesForNotification } from "@/lib/tripDates";

// Generates, activates, and emails a travel kit. Called from
// app/api/travel-kits/generate/route.ts on form submit - travel kits are
// free, so there is no payment step that gates this anymore.
export async function activateTravelKit({
  travelKitId,
  userId,
  recipientEmail,
}: {
  travelKitId: string;
  userId: string;
  recipientEmail: string | null;
}): Promise<{ ok: boolean }> {
  const admin = getSupabaseAdmin();

  const { data: travelKitRow, error: fetchError } = await admin
    .from("travel_kits")
    .select(
      "destination, departure_date, return_date, travel_month, climate, swimming, protective_style, hair_priority"
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
    travelEmailStatus = "Confirmation email NOT sent - no recipient email available.";
  } else {
    try {
      await sendTravelKitEmail({
        recipientEmail,
        destination: travelKitRow.destination,
        departureDate: travelKitRow.departure_date,
        returnDate: travelKitRow.return_date,
        travelMonth: travelKitRow.travel_month,
        climate: travelKitRow.climate,
        swimming: travelKitRow.swimming,
        protectiveStyle: travelKitRow.protective_style,
        products,
      });
    } catch (emailError) {
      console.error("Failed to send travel kit email:", travelKitId, emailError);
      travelEmailStatus = "Confirmation email FAILED to send - see server logs.";
    }
  }

  await sendNotificationEmail(
    `Travel kit generated - ${travelKitRow.destination}`,
    `Travel kit generated (free) - ${travelKitRow.destination} for ${userId}.

User ID: ${userId}
Customer email: ${recipientEmail ?? "Unknown"}
Destination: ${travelKitRow.destination}
${formatTripDatesForNotification(travelKitRow.departure_date, travelKitRow.return_date, travelKitRow.travel_month)}

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
