import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { curlFamily } from "@/lib/compatibility";
import { getWashFrequencyDays, toIsoDate } from "@/lib/routineCalendar";
import { buildDayStrip, fetchCompletedDays } from "@/lib/routineCompletions";

// Lightweight companion to /api/routine, used only by the dashboard's
// "Recent completions" 7-day habit-tracker strip - avoids pulling in
// that route's much heavier payload (full 30-day calendar, product
// picks, routine steps) just to render 7 small circles.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("user_id");

  if (!userId) {
    return NextResponse.json({ error: "user_id is required." }, { status: 400 });
  }

  // Free for every signed-in user now -- no subscription check.
  const { data: profile } = await getSupabaseAdmin()
    .from("hair_profiles")
    .select("curl_type, porosity, scalp_condition, routine_start_date")
    .eq("user_id", userId)
    .maybeSingle();

  const now = new Date();
  const routineStartDate = profile?.routine_start_date
    ? new Date(`${profile.routine_start_date}T00:00:00`)
    : now;
  const family = curlFamily(profile?.curl_type ?? null);
  const interval = getWashFrequencyDays(
    profile?.curl_type ?? null,
    profile?.porosity ?? null,
    profile?.scalp_condition ?? null
  ).recommended;

  // The strip only ever looks 3 days back - a few days of headroom
  // beyond that is plenty without pulling the user's whole history.
  const sinceDate = new Date(now);
  sinceDate.setDate(sinceDate.getDate() - 7);
  const completedDays = await fetchCompletedDays(userId, toIsoDate(sinceDate));

  const dayStrip = buildDayStrip(
    now,
    routineStartDate,
    family,
    interval,
    new Set(completedDays.keys())
  );

  return NextResponse.json({ dayStrip });
}
