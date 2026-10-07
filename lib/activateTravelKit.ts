import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { sendNotificationEmail } from "@/lib/notify";
import { generateTravelKitProducts } from "@/lib/travelKitGenerator";
import { sendTravelKitEmail } from "@/lib/sendTravelKitEmail";
import { formatTripDatesForNotification } from "@/lib/tripDates";
import {
  HAIR_SITUATION_LABEL,
  type HairSituation,
  type TravelSurveyData,
} from "@/lib/travelSurvey";

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
      "destination, departure_date, return_date, travel_month, climate, swimming, protective_style, hair_situation, under_wig, wig_type, wig_adhesive, extension_type, natural_under_extensions, style_age, wash_plan, wash_access, wash_frequency, trip_length, concerns"
    )
    .eq("id", travelKitId)
    .single();

  if (fetchError || !travelKitRow) {
    console.error("Couldn't load travel_kits row for generation:", travelKitId, fetchError);
    return { ok: false };
  }

  const survey: TravelSurveyData = {
    trip_length: (travelKitRow.trip_length as TravelSurveyData["trip_length"]) ?? null,
    hair_situation: (travelKitRow.hair_situation as TravelSurveyData["hair_situation"]) ?? null,
    under_wig: (travelKitRow.under_wig as TravelSurveyData["under_wig"]) ?? null,
    wig_type: (travelKitRow.wig_type as TravelSurveyData["wig_type"]) ?? null,
    wig_adhesive: (travelKitRow.wig_adhesive as TravelSurveyData["wig_adhesive"]) ?? null,
    extension_type: (travelKitRow.extension_type as TravelSurveyData["extension_type"]) ?? null,
    natural_under_extensions:
      (travelKitRow.natural_under_extensions as TravelSurveyData["natural_under_extensions"]) ?? null,
    style_age: (travelKitRow.style_age as TravelSurveyData["style_age"]) ?? null,
    wash_plan: (travelKitRow.wash_plan as TravelSurveyData["wash_plan"]) ?? null,
    wash_access: (travelKitRow.wash_access as TravelSurveyData["wash_access"]) ?? null,
    wash_frequency: (travelKitRow.wash_frequency as TravelSurveyData["wash_frequency"]) ?? null,
    swimming: travelKitRow.swimming,
    concerns: (travelKitRow.concerns as TravelSurveyData["concerns"]) ?? [],
  };

  const products = await generateTravelKitProducts({
    userId,
    climate: travelKitRow.climate,
    survey,
  });

  // A kit with no products is a failed kit, not an empty active one - this
  // happens when the user has no hair profile or the catalog has nothing
  // usable for their answers.
  if (products.length === 0) {
    await admin
      .from("travel_kits")
      .update({ status: "failed", error_message: "We couldn't find products for this trip yet." })
      .eq("id", travelKitId)
      .neq("status", "active");
    return { ok: false };
  }

  const { error: updateError } = await admin
    .from("travel_kits")
    .update({
      status: "active",
      products,
      error_message: null,
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
        hairSituation: travelKitRow.hair_situation
          ? HAIR_SITUATION_LABEL[travelKitRow.hair_situation as HairSituation] ?? null
          : null,
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
