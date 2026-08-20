import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { hasRoutineSubscription } from "@/lib/purchases";
import { generateWashCalendar } from "@/lib/routineCalendar";
import { generateRoutineSteps } from "@/lib/routineSteps";
import {
  getRoutineProductPicks,
  getIngredientsToAvoid,
} from "@/lib/routineProducts";
import { getChildSafetyNote, isChildSafetyProfile } from "@/lib/childSafety";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Server-only bridge (mirrors /api/purchases): the /routine page is a
// client component, so it can't call hasRoutineSubscription() or read
// hair_profiles.water_hardness (needed by generateRoutineSteps, but not
// part of the client-facing HairProfile type) directly. This route does
// the entitlement check and all the routine computation with the
// service-role client, and returns only display-ready data.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("user_id");

  if (!userId) {
    return NextResponse.json({ error: "user_id is required." }, { status: 400 });
  }

  const subscribed = await hasRoutineSubscription(userId);
  if (!subscribed) {
    return NextResponse.json(
      { error: "No active routine subscription." },
      { status: 403 }
    );
  }

  const { data: profile } = await getSupabaseAdmin()
    .from("hair_profiles")
    .select(
      "first_name, curl_type, porosity, scalp_condition, zip_code, water_hardness, extensions, extension_type, extension_care, profile_for, adult_age_range, hair_concerns"
    )
    .eq("user_id", userId)
    .maybeSingle();

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthLabel = `${MONTH_NAMES[now.getMonth()]} ${year}`;

  const curlType = profile?.curl_type ?? null;
  const porosity = profile?.porosity ?? null;
  const profileFor = profile?.profile_for ?? null;
  // Caution/avoid-rated ingredients matter more for a baby profile, so
  // surface more of them rather than the usual top 5.
  const avoidLimit = isChildSafetyProfile(profileFor) ? 10 : 5;

  const [calendarDays, steps, products, avoidIngredients] = await Promise.all([
    Promise.resolve(generateWashCalendar(year, month, porosity)),
    Promise.resolve(
      generateRoutineSteps(
        curlType,
        porosity,
        profile?.water_hardness ?? null,
        profile?.extensions ?? null,
        profile?.extension_type ?? null,
        profile?.extension_care ?? null,
        profileFor,
        profile?.adult_age_range ?? null,
        profile?.hair_concerns ?? null
      )
    ),
    getRoutineProductPicks(porosity, curlType, profile?.hair_concerns ?? null),
    getIngredientsToAvoid(porosity, avoidLimit),
  ]);

  return NextResponse.json({
    firstName: profile?.first_name?.trim() || null,
    curlType,
    porosity,
    scalpCondition: profile?.scalp_condition ?? null,
    zipCode: profile?.zip_code ?? null,
    monthLabel,
    profileFor,
    childSafetyNote: getChildSafetyNote(profileFor),
    calendarDays,
    steps,
    products,
    avoidIngredients,
  });
}
