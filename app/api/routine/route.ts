import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { hasRoutineSubscription } from "@/lib/purchases";
import {
  formatStartDateLabel,
  generateWashCalendar,
  getWashFrequencyDays,
} from "@/lib/routineCalendar";
import { generateRoutineSteps } from "@/lib/routineSteps";
import {
  getRoutineProductPicks,
  getProtectiveStyleProductPicks,
  getIngredientsToAvoid,
  PROTECTIVE_STYLE_ACCESSORIES,
} from "@/lib/routineProducts";
import { getChildSafetyNote, isChildSafetyProfile } from "@/lib/childSafety";
import { isColorTreatedYes } from "@/lib/compatibility";
import {
  generateProtectiveStyleCalendar,
  getProtectiveStyleFrequency,
  protectiveStyleTypeFromExtensionType,
  PROTECTIVE_STYLE_LABEL,
  LOCS_BUILDUP_NOTE,
  WIG_WASH_NOTE,
  WIG_SCALP_CARE_NOTE,
} from "@/lib/protectiveStyleRoutine";

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
      "first_name, curl_type, porosity, scalp_condition, zip_code, water_hardness, extensions, extension_type, extension_care, profile_for, adult_age_range, hair_concerns, color_treated, budget_range, routine_focus"
    )
    .eq("user_id", userId)
    .maybeSingle();

  const now = new Date();
  const startDateLabel = formatStartDateLabel(now);

  const curlType = profile?.curl_type ?? null;
  const porosity = profile?.porosity ?? null;
  const scalpCondition = profile?.scalp_condition ?? null;
  const profileFor = profile?.profile_for ?? null;
  // hair_profiles.color_treated is a real Postgres boolean - normalized
  // here to the "yes"/"no" string convention the rest of the app (and
  // the JSON response below) uses, via isColorTreatedYes (see
  // lib/compatibility.ts for why this exists).
  const colorTreated = isColorTreatedYes(profile?.color_treated) ? "yes" : "no";
  const budgetRange = profile?.budget_range ?? null;
  const routineFocus = profile?.routine_focus ?? null;
  const protectiveStyleType = protectiveStyleTypeFromExtensionType(
    profile?.extension_type ?? null
  );
  // Caution/avoid-rated ingredients matter more for a baby profile, so
  // surface more of them rather than the usual top 5.
  const avoidLimit = isChildSafetyProfile(profileFor) ? 10 : 5;

  // The natural-hair routine is computed regardless of routine_focus -
  // needed outright for 'natural_hair'/'both', and for a wig-focused
  // 'extensions' profile the "natural hair under wig" section is just
  // this same routine (see spec: "Same as natural hair routine based on
  // their curl type and porosity").
  const [calendarDays, steps, products, avoidIngredients] = await Promise.all([
    Promise.resolve(generateWashCalendar(now, curlType, porosity, scalpCondition)),
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
        profile?.hair_concerns ?? null,
        colorTreated
      )
    ),
    getRoutineProductPicks(
      porosity,
      curlType,
      profile?.hair_concerns ?? null,
      colorTreated === "yes",
      budgetRange
    ),
    getIngredientsToAvoid(porosity, avoidLimit),
  ]);

  // Only fetched when the protective-style routine actually needs to be
  // shown ('extensions' or 'both') - 'natural_hair' and unset profiles
  // never touch this.
  let protectiveStyle: {
    styleType: string;
    styleLabel: string;
    frequency: { min: number; max: number; recommended: number } | null;
    calendarDays: ReturnType<typeof generateProtectiveStyleCalendar>;
    products: Awaited<ReturnType<typeof getProtectiveStyleProductPicks>>;
    accessories: { label: string; note: string }[];
    routineNote: string | null;
    wigWashNote: string | null;
    wigScalpCareNote: string | null;
  } | null = null;

  if (
    protectiveStyleType &&
    (routineFocus === "extensions" || routineFocus === "both")
  ) {
    const protectiveProducts = await getProtectiveStyleProductPicks(
      protectiveStyleType,
      colorTreated === "yes",
      budgetRange
    );
    protectiveStyle = {
      styleType: protectiveStyleType,
      styleLabel: PROTECTIVE_STYLE_LABEL[protectiveStyleType],
      frequency: getProtectiveStyleFrequency(protectiveStyleType),
      calendarDays: generateProtectiveStyleCalendar(now, protectiveStyleType),
      products: protectiveProducts,
      accessories: PROTECTIVE_STYLE_ACCESSORIES[protectiveStyleType],
      routineNote: protectiveStyleType === "locs" ? LOCS_BUILDUP_NOTE : null,
      wigWashNote: protectiveStyleType === "wigs" ? WIG_WASH_NOTE : null,
      wigScalpCareNote: protectiveStyleType === "wigs" ? WIG_SCALP_CARE_NOTE : null,
    };
  }

  const focusNote =
    routineFocus === "natural_hair" && protectiveStyleType
      ? "This routine focuses on your natural hair health during your protective style."
      : null;

  return NextResponse.json({
    firstName: profile?.first_name?.trim() || null,
    curlType,
    porosity,
    scalpCondition,
    zipCode: profile?.zip_code ?? null,
    startDateLabel,
    washFrequency: getWashFrequencyDays(curlType, porosity, scalpCondition),
    profileFor,
    childSafetyNote: getChildSafetyNote(profileFor),
    calendarDays,
    steps,
    products,
    avoidIngredients,
    colorTreated,
    budgetRange,
    routineFocus,
    protectiveStyleType,
    focusNote,
    protectiveStyle,
  });
}
