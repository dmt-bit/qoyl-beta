import { getResend } from "@/lib/resend";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { curlFamily } from "@/lib/compatibility";
import {
  formatStartDateLabel,
  generateWashCalendar,
  getWashFrequencyDays,
} from "@/lib/routineCalendar";
import { generateRoutineSteps } from "@/lib/routineSteps";
import { getRoutineProducts } from "@/lib/routineProducts";
import { generateSeasonalNote } from "@/lib/routineSeasonalNote";
import { lookupCityState } from "@/lib/zipLookup";
import { renderRoutineEmailHtml } from "@/emails/routine-template";

const FROM_ADDRESS = "Qoyl <hey@qoyl.live>";
const DASHBOARD_URL = "qoyl-beta-alpha.vercel.app/dashboard";
const SEARCH_URL = "https://qoyl.live/search";

// All 12 real curl types -- was `["4a","4b","4c"]` from when this system
// only served coily subscribers, which silently blanked curlTypeLabel
// (and everything derived from it: chips, the weekly/list view choice)
// for every straight/wavy/curly subscriber.
const VALID_CURL_TYPES = new Set([
  "1a", "1b", "1c",
  "2a", "2b", "2c",
  "3a", "3b", "3c",
  "4a", "4b", "4c",
]);
const VALID_POROSITIES = new Set(["low", "medium", "high"]);

export type SendRoutineEmailResult =
  | { sent: true; id: string | null }
  | { sent: false; reason: "no_api_key" }
  | { sent: false; reason: "no_profile" }
  | {
      sent: false;
      reason: "api_error";
      error: { message: string; name: string; statusCode: number | null };
    }
  | { sent: false; reason: "threw"; error: unknown };

export async function sendRoutineEmail(
  userId: string,
  recipientEmail: string
): Promise<SendRoutineEmailResult> {
  const resend = getResend();
  if (!resend) {
    console.warn("RESEND_API_KEY is not set; skipping routine email.");
    return { sent: false, reason: "no_api_key" };
  }

  const admin = getSupabaseAdmin();
  const { data: profile, error } = await admin
    .from("hair_profiles")
    .select(
      "first_name, curl_type, porosity, scalp_condition, zip_code, water_hardness, adult_age_range, hair_concerns"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !profile) {
    console.error(
      "Couldn't load hair profile for routine email:",
      userId,
      error
    );
    return { sent: false, reason: "no_profile" };
  }

  const now = new Date();
  const startDateLabel = formatStartDateLabel(now);
  const family = curlFamily(profile.curl_type);
  const washFrequency = getWashFrequencyDays(
    profile.curl_type,
    profile.porosity,
    profile.scalp_condition
  );

  const [calendarDays, cityState, products] = await Promise.all([
    Promise.resolve(
      generateWashCalendar(now, profile.curl_type, profile.porosity, profile.scalp_condition)
    ),
    lookupCityState(profile.zip_code),
    getRoutineProducts(profile.porosity, profile.curl_type, profile.hair_concerns),
  ]);

  const steps = generateRoutineSteps(
    profile.curl_type,
    profile.porosity,
    profile.water_hardness,
    null,
    null,
    null,
    null,
    profile.adult_age_range,
    profile.hair_concerns
  );
  const seasonalNote = generateSeasonalNote(profile.zip_code, now);

  const firstName = profile.first_name?.trim() || "there";

  const html = renderRoutineEmailHtml({
    firstName,
    startDateLabel,
    curlTypeLabel: VALID_CURL_TYPES.has(profile.curl_type) ? profile.curl_type : null,
    family,
    porosityLabel: VALID_POROSITIES.has(profile.porosity) ? profile.porosity : null,
    scalpConditionLabel: profile.scalp_condition ?? null,
    washFrequency,
    cityStateLabel: cityState
      ? `${cityState.city}, ${cityState.stateAbbreviation}`
      : null,
    waterHardnessLabel:
      profile.water_hardness === "hard" ? "hard water" : null,
    calendarDays,
    steps,
    products,
    seasonalNote,
    dashboardUrl: DASHBOARD_URL,
    searchUrl: SEARCH_URL,
  });

  try {
    const { data, error: sendError } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: recipientEmail,
      subject: `Your Qoyl routine is ready, ${firstName}`,
      html,
    });

    if (sendError) {
      console.error("Resend API rejected routine email:", userId, sendError);
      return { sent: false, reason: "api_error", error: sendError };
    }

    return { sent: true, id: data?.id ?? null };
  } catch (err) {
    console.error("Failed to send routine email:", userId, err);
    return { sent: false, reason: "threw", error: err };
  }
}
