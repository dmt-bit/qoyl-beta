import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { CurlFamily } from "@/lib/compatibility";
import { atMidnight, scheduledWashType, toIsoDate, type WashDayType } from "@/lib/routineCalendar";

export type CompletedDay = {
  washType: string;
  completedAt: string; // full timestamptz, for "Marked complete at 2:34 PM"
  notes: string | null;
};

// Server-only (service-role) - both the check-off route and /api/routine
// import this, never a client component directly.
export async function fetchCompletedDays(
  userId: string,
  sinceIso: string
): Promise<Map<string, CompletedDay>> {
  const { data, error } = await getSupabaseAdmin()
    .from("completed_routine_days")
    .select("completed_date, wash_type, notes, created_at")
    .eq("user_id", userId)
    .gte("completed_date", sinceIso);

  if (error) {
    console.error("[routineCompletions] Failed to fetch completed days:", error);
    return new Map();
  }

  const map = new Map<string, CompletedDay>();
  for (const row of data ?? []) {
    map.set(row.completed_date, {
      washType: row.wash_type,
      completedAt: row.created_at,
      notes: row.notes,
    });
  }
  return map;
}

// Whether userId has EVER completed a routine day at all - used only to
// decide whether a check-off is the user's first ever (see the
// notification rules in app/api/routine/check-off/route.ts). A targeted
// count query rather than reusing fetchCompletedDays, since "ever" has
// no sinceIso bound.
export async function hasAnyCompletion(userId: string): Promise<boolean> {
  const { count, error } = await getSupabaseAdmin()
    .from("completed_routine_days")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) {
    console.error("[routineCompletions] Failed to check for any completion:", error);
    return true; // fail closed - never worth risking a duplicate "first completion" email
  }
  return (count ?? 0) > 0;
}

const MAX_STREAK_LOOKBACK_DAYS = 400;

// Walks backward from today, counting consecutive qualifying days: a
// scheduled wash/refresh day is only "qualifying" if it has a
// completed_routine_days row; a genuine rest day (scheduledWashType
// returns null) always qualifies with no action needed. Stops the first
// time it hits a scheduled day, strictly before today, with no
// completion - that's a missed day, and the streak doesn't extend past
// it. Today itself never *breaks* the streak if unfinished (the day
// isn't over yet) - it just doesn't add to the count until checked off.
export function calculateStreak(
  today: Date,
  routineStartDate: Date,
  family: CurlFamily | null,
  interval: number,
  completedIsoDates: Set<string>
): number {
  let streak = 0;
  const cursor = atMidnight(today);
  const start = atMidnight(routineStartDate);

  const todayType = scheduledWashType(cursor, family, interval, start);
  const todayQualifies = todayType === null || completedIsoDates.has(toIsoDate(cursor));
  if (todayQualifies) streak++;

  cursor.setDate(cursor.getDate() - 1);
  for (let i = 0; i < MAX_STREAK_LOOKBACK_DAYS && cursor.getTime() >= start.getTime(); i++) {
    const type = scheduledWashType(cursor, family, interval, start);
    if (type === null) {
      streak++;
    } else if (completedIsoDates.has(toIsoDate(cursor))) {
      streak++;
    } else {
      break;
    }
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

// Past-7-days "missed" indicator dates for the calendar (per the
// request: "Only show missed indicators for the past 7 days - not the
// entire history"). Strictly before today - today is never "missed"
// since it's still in progress.
export function computeMissedDates(
  today: Date,
  routineStartDate: Date,
  family: CurlFamily | null,
  interval: number,
  completedIsoDates: Set<string>,
  lookbackDays = 7
): string[] {
  const missed: string[] = [];
  const start = atMidnight(routineStartDate);
  const cursor = atMidnight(today);
  cursor.setDate(cursor.getDate() - 1);

  for (let i = 0; i < lookbackDays && cursor.getTime() >= start.getTime(); i++) {
    const type = scheduledWashType(cursor, family, interval, start);
    if (type !== null && !completedIsoDates.has(toIsoDate(cursor))) {
      missed.push(toIsoDate(cursor));
    }
    cursor.setDate(cursor.getDate() - 1);
  }

  return missed;
}

export type DayStripStatus = "completed" | "rest" | "missed" | "future" | "scheduled";

export type DayStripEntry = {
  date: string;
  status: DayStripStatus;
};

// Dashboard's 7-day habit-tracker strip - centered on today (3 days
// back, today, 3 days ahead) rather than a strictly backward-looking
// window, so "future day" (explicitly one of the four states the
// request asks for) has real dates to apply to.
export function buildDayStrip(
  today: Date,
  routineStartDate: Date,
  family: CurlFamily | null,
  interval: number,
  completedIsoDates: Set<string>
): DayStripEntry[] {
  const start = atMidnight(routineStartDate);
  const todayMid = atMidnight(today);
  const entries: DayStripEntry[] = [];

  for (let offset = -3; offset <= 3; offset++) {
    const date = new Date(todayMid);
    date.setDate(date.getDate() + offset);
    const iso = toIsoDate(date);

    if (date.getTime() > todayMid.getTime()) {
      entries.push({ date: iso, status: "future" });
      continue;
    }

    const type: WashDayType | null =
      date.getTime() < start.getTime() ? null : scheduledWashType(date, family, interval, start);

    if (type === null) {
      entries.push({ date: iso, status: "rest" });
    } else if (completedIsoDates.has(iso)) {
      entries.push({ date: iso, status: "completed" });
    } else if (date.getTime() === todayMid.getTime()) {
      entries.push({ date: iso, status: "scheduled" }); // today, due, not yet checked off
    } else {
      entries.push({ date: iso, status: "missed" });
    }
  }

  return entries;
}
