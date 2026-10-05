import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  formatStartDateLabel,
  generateWashCalendar,
  getWashFrequencyDays,
  toIsoDate,
} from "@/lib/routineCalendar";
import { calculateStreak, computeMissedDates, fetchCompletedDays } from "@/lib/routineCompletions";
import {
  generateAdditionalRoutineNotes,
  generateRefreshDaySteps,
  generateRoutineStepsByWashType,
  REFRESH_SCALP_CHECK_STEP,
  shouldShowScalpCheckStep,
} from "@/lib/routineSteps";
import {
  getRoutineProductPicks,
  getDailyRefreshProducts,
  getProtectiveStyleProductPicks,
  getIngredientsToAvoid,
  PROTECTIVE_STYLE_ACCESSORIES,
} from "@/lib/routineProducts";
import { getChildSafetyNote, isChildSafetyProfile } from "@/lib/childSafety";
import { buildScoringProfile, curlFamily, isColorTreatedYes } from "@/lib/compatibility";
import { analyzeRoutineInteractions } from "@/lib/routineInteractions";
import { CLIMATE_ZONES } from "@/lib/locationFactors";
import { fetchBrandProductsForCurlType } from "@/lib/brandCatalogProducts";
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
// client component, so it can't read
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

  // Routine is free for every signed-in user with a hair profile -- no
  // subscription check. (Previously gated behind hasRoutineSubscription.)
  const { data: profile } = await getSupabaseAdmin()
    .from("hair_profiles")
    .select(
      "first_name, curl_type, porosity, scalp_condition, zip_code, water_hardness, climate, extensions, extension_type, extension_care, profile_for, adult_age_range, hair_concerns, color_treated, budget_range, routine_focus, routine_start_date"
    )
    .eq("user_id", userId)
    .maybeSingle();

  const now = new Date();
  const startDateLabel = formatStartDateLabel(now);
  // Anchors the wash cycle to when the routine subscription was actually
  // activated (set in the Stripe webhook) rather than "today" - see
  // lib/routineCalendar.ts's generateWashCalendar for why that mattered.
  // Falls back to today only for a profile with no persisted value at
  // all (shouldn't happen post-migration, but a null here would silently
  // reproduce the old bug rather than error, so it's an explicit guard).
  const routineStartDate = profile?.routine_start_date
    ? new Date(`${profile.routine_start_date}T00:00:00`)
    : now;

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
  const family = curlFamily(curlType);
  // Item 8 - "From Qoyl partner brands" section, only meaningful with a
  // real profile row to score against (buildScoringProfile needs
  // climate/water_hardness, so this stays null for the no-profile edge
  // case rather than guessing).
  const scoringProfile = profile ? buildScoringProfile(profile) : null;

  const hairConcerns = profile?.hair_concerns ?? null;

  const [calendarDaysRaw, stepsByWashType, products, avoidIngredients, completedDays, brandProducts, refreshDailyProducts] =
    await Promise.all([
      Promise.resolve(generateWashCalendar(now, curlType, porosity, scalpCondition, routineStartDate)),
      Promise.resolve(generateRoutineStepsByWashType(curlType)),
      getRoutineProductPicks(
        porosity,
        curlType,
        hairConcerns,
        colorTreated === "yes",
        budgetRange
      ),
      getIngredientsToAvoid(porosity, avoidLimit),
      fetchCompletedDays(userId, toIsoDate(routineStartDate)),
      fetchBrandProductsForCurlType(curlType, family, scoringProfile, 3),
      // Every day now has a routine, wash or not (see
      // lib/routineCalendar.ts) - these are the refresh-day products,
      // computed once here rather than per calendar day since the
      // category list itself doesn't vary by date, only which day shows
      // them (client-side, by washType === "refresh").
      getDailyRefreshProducts(porosity, curlType, hairConcerns, scalpCondition, colorTreated === "yes", budgetRange),
    ]);

  // Routine-level interactions across the primary picks (how the products
  // work together, not individually) - see lib/routineInteractions.ts.
  // Computed here rather than in the client because the ingredient data
  // lives on the server-side picks.
  const routineFlags = analyzeRoutineInteractions(
    products
      .filter((p) => p.primary && !p.noProductsYet)
      .map((p) => ({
        name: p.primary!.productName,
        category: p.category,
        ingredients: p.primary!.ingredients,
      })),
    { porosity, family: curlFamily(curlType), colorTreated: colorTreated === "yes" },
    CLIMATE_ZONES.find((z) => z === profile?.climate) ?? null
  );

  if (routineFlags.length > 0) {
    const { error: flagsEventError } = await getSupabaseAdmin().from("ml_events").insert({
      event_type: "routine_flags_generated",
      user_id: userId,
      metadata: {
        flag_count: routineFlags.length,
        warning_count: routineFlags.filter((f) => f.type === "warning").length,
        flag_types: routineFlags.map((f) => f.title),
        curl_type: curlType,
        porosity,
        climate: profile?.climate ?? null,
        product_count: products.filter((p) => p.primary && !p.noProductsYet).length,
      },
    });
    if (flagsEventError) {
      console.error("Failed to log routine_flags_generated ml_event:", flagsEventError.message);
    }
  }

  // Attaches whether each refresh day's conditional "scalp check" step
  // applies (see lib/routineSteps.ts's shouldShowScalpCheckStep) - kept
  // per-day rather than a single profile-level flag because the
  // days-since-last-wash half of that condition genuinely varies by date.
  const calendarDays = calendarDaysRaw.map((day) =>
    day.washType === "refresh"
      ? { ...day, showScalpCheck: shouldShowScalpCheckStep(scalpCondition, hairConcerns, day.daysSinceLastWash ?? null) }
      : day
  );

  const refreshStepsBase = generateRefreshDaySteps(curlType, routineFocus, false);

  // Informs which product categories to surface more prominently in
  // search (see the request this responds to) - fires on every load
  // where the user has no leave-in pick yet, so this will accumulate one
  // row per load rather than once per user; worth a lightweight dedup
  // (e.g. once per user per day) if this turns out to be noisy in
  // practice.
  const leaveInPick = refreshDailyProducts.find((p) => p.category === "daily-leave-in");
  if (leaveInPick?.noProductsYet) {
    const { error: mlEventError } = await getSupabaseAdmin().from("ml_events").insert({
      event_type: "missing_daily_product",
      user_id: userId,
      metadata: { category: "leave_in", shown_prompt: true },
    });
    if (mlEventError) {
      console.error("Failed to log missing_daily_product ml_event:", mlEventError.message);
    }
  }

  // Daily check-off system (streak, calendar completed/missed
  // indicators) - see lib/routineCompletions.ts. todayIso is computed
  // explicitly rather than read off calendarDays[0] because that array
  // no longer always contains an entry for today (a genuine rest day
  // has none at all - see generateWashCalendar).
  const todayIso = toIsoDate(now);
  const completedIsoDates = new Set(completedDays.keys());
  const interval = getWashFrequencyDays(curlType, porosity, scalpCondition).recommended;
  const streak = calculateStreak(now, routineStartDate, family, interval, completedIsoDates);
  const missedDates = computeMissedDates(now, routineStartDate, family, interval, completedIsoDates, 7);
  const todayCompletion = completedDays.get(todayIso) ?? null;

  const additionalNotes = generateAdditionalRoutineNotes(
    profile?.extensions ?? null,
    profile?.extension_type ?? null,
    profile?.extension_care ?? null,
    profileFor,
    profile?.adult_age_range ?? null,
    profile?.hair_concerns ?? null,
    colorTreated
  );

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
    todayIso,
    streak,
    missedDates,
    todayCompletion,
    stepsByWashType,
    refreshStepsBase,
    refreshScalpCheckStep: REFRESH_SCALP_CHECK_STEP,
    additionalNotes,
    products,
    routineFlags,
    refreshDailyProducts,
    brandProducts,
    avoidIngredients,
    colorTreated,
    budgetRange,
    routineFocus,
    protectiveStyleType,
    focusNote,
    protectiveStyle,
  });
}
