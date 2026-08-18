import { getResend } from "@/lib/resend";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { generateWashCalendar } from "@/lib/routineCalendar";
import { generateRoutineSteps } from "@/lib/routineSteps";
import { getRoutineProducts } from "@/lib/routineProducts";
import { generateSeasonalNote } from "@/lib/routineSeasonalNote";
import { lookupCityState } from "@/lib/zipLookup";
import { renderRoutineEmailHtml } from "@/emails/routine-template";

const FROM_ADDRESS = "Qoyl <hey@qoyl.live>";
const DASHBOARD_URL = "qoyl-beta-alpha.vercel.app/dashboard";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const VALID_CURL_TYPES = new Set(["4a", "4b", "4c"]);
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
      "first_name, curl_type, porosity, scalp_condition, zip_code, water_hardness"
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
  const monthShort = MONTH_NAMES[now.getMonth()];
  const monthLabel = `${monthShort} ${now.getFullYear()}`;

  const [calendarDays, cityState, products] = await Promise.all([
    Promise.resolve(
      generateWashCalendar(now.getFullYear(), now.getMonth() + 1, profile.porosity)
    ),
    lookupCityState(profile.zip_code),
    getRoutineProducts(profile.porosity),
  ]);

  const steps = generateRoutineSteps(
    profile.curl_type,
    profile.porosity,
    profile.water_hardness
  );
  const seasonalNote = generateSeasonalNote(profile.zip_code, now);

  const firstName = profile.first_name?.trim() || "there";

  const html = renderRoutineEmailHtml({
    firstName,
    monthLabel,
    monthShort,
    curlTypeLabel: VALID_CURL_TYPES.has(profile.curl_type) ? profile.curl_type : null,
    porosityLabel: VALID_POROSITIES.has(profile.porosity) ? profile.porosity : null,
    scalpConditionLabel: profile.scalp_condition ?? null,
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
  });

  try {
    const { data, error: sendError } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: recipientEmail,
      subject: `Your Qoyl routine for ${monthLabel} is ready, ${firstName}`,
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
