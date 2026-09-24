import { curlFamily, type CurlFamily } from "@/lib/compatibility";

export type WashDayType =
  | "chelate"
  | "wash"
  | "protein"
  | "clarify"
  | "refresh";

export type WashDay = {
  date: string; // ISO yyyy-mm-dd
  weekday: number; // 0 = Sunday .. 6 = Saturday
  washType: WashDayType;
  // Only meaningful when washType === "refresh" - how many days have
  // elapsed since the most recent real wash day (0 would mean the day
  // itself is a wash day, which never happens here since this field is
  // only set on refresh days). Drives the refresh-day "scalp check" step
  // (lib/routineSteps.ts), which should show once it's been a few days
  // since the last wash regardless of curl family.
  daysSinceLastWash?: number;
  // Only meaningful when washType === "refresh" - whether that day's
  // conditional "scalp check" step should show (see
  // lib/routineSteps.ts's shouldShowScalpCheckStep). Not computed in this
  // file (which has no access to hair_concerns) - set by
  // app/api/routine/route.ts after generating the base calendar.
  showScalpCheck?: boolean;
};

const WINDOW_DAYS = 30;

// Curl type is the primary driver of wash frequency - sebum takes far
// longer to travel down a coily strand's twists and turns than a
// straight one, so the *shape* of the hair matters more than porosity
// alone (porosity/scalp condition now only nudge the curl-type baseline,
// they don't set it).
const BASE_FREQUENCY: Record<string, { min: number; max: number }> = {
  "1a": { min: 1, max: 2 },
  "1b": { min: 1, max: 2 },
  "1c": { min: 2, max: 3 },
  "2a": { min: 2, max: 4 },
  "2b": { min: 2, max: 4 },
  "2c": { min: 3, max: 5 },
  "3a": { min: 5, max: 7 },
  "3b": { min: 5, max: 7 },
  "3c": { min: 7, max: 10 },
  "4a": { min: 7, max: 14 },
  "4b": { min: 10, max: 14 },
  "4c": { min: 14, max: 21 },
};

export function getWashFrequencyDays(
  curlType: string | null,
  porosity: string | null,
  scalpCondition: string | null
): { min: number; max: number; recommended: number } {
  const base = (curlType && BASE_FREQUENCY[curlType]) || { min: 7, max: 10 };

  // Porosity modifier - adjusts the recommended interval only.
  let porosityModifier = 0;
  if (porosity === "high") porosityModifier = -1; // wash more often
  if (porosity === "low") porosityModifier = 1; // wash less often

  // Scalp modifier - also recommended-only.
  let scalpModifier = 0;
  if (scalpCondition === "oily") scalpModifier = -1;
  if (scalpCondition === "dry") scalpModifier = 1;

  // min/max are the displayed curl-type base range and never shift with
  // porosity/scalp - applying the modifier to both used to be able to
  // collapse the range to a single number (e.g. 1b + oily produced
  // "every 1-1 days"). Only `recommended` (the actual interval used to
  // generate the calendar below) is nudged, clamped to a real minimum of
  // one day.
  const recommended = Math.max(
    1,
    Math.round((base.min + base.max) / 2 + porosityModifier + scalpModifier)
  );

  return {
    min: base.min,
    max: base.max,
    recommended,
  };
}

// Straight hair washes most/every day, so its cycle counts actual washes
// (not calendar days) - clarify every 7th wash, protein every 14th, wash
// otherwise. Previously this used occurrence % 8 / % 4 against calendar-day
// offsets, which mislabeled most daily wash days as "refresh" and never
// produced a protein day at all.
const STRAIGHT_WASH_CYCLE: WashDayType[] = [
  "wash", "wash", "wash", "wash", "wash", "wash",
  "clarify",
  "wash", "wash", "wash", "wash", "wash", "wash",
  "protein",
];

// Same idea for wavy, just less frequent: clarify every 5th wash, protein
// every 10th.
const WAVY_WASH_CYCLE: WashDayType[] = [
  "wash", "wash", "wash", "wash",
  "clarify",
  "wash", "wash", "wash", "wash",
  "protein",
];

// occurrence is 1-indexed (1st wash, 2nd wash, ...), matching "every
// 7th"/"every 4th" the way a person would actually count washes.
function washTypeForOccurrence(
  family: CurlFamily | null,
  occurrence: number
): WashDayType {
  switch (family) {
    case "straight":
      return STRAIGHT_WASH_CYCLE[(occurrence - 1) % STRAIGHT_WASH_CYCLE.length];
    case "wavy":
      return WAVY_WASH_CYCLE[(occurrence - 1) % WAVY_WASH_CYCLE.length];
    case "curly":
      if (occurrence % 4 === 0) return "chelate";
      if (occurrence % 3 === 0) return "protein";
      return "wash";
    case "coily":
    default: {
      // Unchanged from the original cycle: week 1 chelate, week 2
      // regular, week 3 protein, week 4 regular.
      const cycle: WashDayType[] = ["chelate", "wash", "protein", "wash"];
      return cycle[(occurrence - 1) % cycle.length];
    }
  }
}

export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function atMidnight(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export const MS_PER_DAY = 1000 * 60 * 60 * 24;

// Whether `date` is a real, scheduled routine-action day given the
// user's routine start date and wash interval - and if so, which type.
// Returns null only for a date before the routine existed; every other
// non-wash date is a "refresh" day regardless of curl family - every day
// gets a routine, wash or not (previously curly/coily families got no
// entry at all on non-wash days, which is the bug this fixes: refresh-day
// steps/products now apply to every hair type, not just straight/wavy).
//
// This replaced a local "occurrence" counter that reset to 1 every time
// the calendar was generated (i.e. every page load with startDate=today),
// which had two compounding bugs: (1) "today" always landed on
// occurrence 1 regardless of the actual date, and (2) even after
// anchoring occurrence to a persisted routineStartDate, the *day itself*
// was still unconditionally forced to be "a wash day" (the loop always
// started at offset 0 = today), so the app would ask a coily user to
// wash every single day instead of only on their real ~10-14 day
// schedule. Exported (not just used internally) because the streak/
// missed-day/check-off system introduced alongside this needs to ask
// "was this arbitrary past or present date actually due?" independent
// of the forward-looking display window below.
export function scheduledWashType(
  date: Date,
  family: CurlFamily | null,
  interval: number,
  routineStartDate: Date
): WashDayType | null {
  const daysSinceStart = Math.floor(
    (atMidnight(date).getTime() - atMidnight(routineStartDate).getTime()) / MS_PER_DAY
  );
  if (daysSinceStart < 0) return null; // before the routine existed

  if (daysSinceStart % interval === 0) {
    const occurrence = daysSinceStart / interval + 1; // 1-indexed
    return washTypeForOccurrence(family, occurrence);
  }
  return "refresh";
}

// How many days have elapsed since the most recent real (non-refresh)
// wash day, looked up by walking backward from `date` - used to decide
// whether a refresh day's "scalp check" step should show (see
// lib/routineSteps.ts). Returns null if no wash day is found within one
// full window (e.g. `date` is within `interval` days of routineStartDate
// itself, before any wash has occurred yet).
export function daysSinceLastWashDay(
  date: Date,
  family: CurlFamily | null,
  interval: number,
  routineStartDate: Date
): number | null {
  for (let back = 1; back <= WINDOW_DAYS; back++) {
    const d = new Date(date);
    d.setDate(d.getDate() - back);
    const type = scheduledWashType(d, family, interval, routineStartDate);
    if (type && type !== "refresh") return back;
  }
  return null;
}

// Rolling 30-day window starting from `startDate` (today, in practice) -
// one entry per date that's actually due per the real schedule; dates
// that aren't due (curly/coily rest days) simply have no entry, so
// `calendarDays[0]` is NOT guaranteed to be today anymore - callers that
// need "today's" entry specifically should match on date (see
// data.todayIso from /api/routine) rather than assuming array position.
// `routineStartDate` (hair_profiles.routine_start_date - the date the
// user's routine subscription was activated) anchors the schedule;
// defaults to `startDate` only if the caller has no persisted start
// date at all.
export function generateWashCalendar(
  startDate: Date,
  curlType: string | null,
  porosity: string | null,
  scalpCondition: string | null = null,
  routineStartDate: Date = startDate
): WashDay[] {
  const family = curlFamily(curlType);
  const { recommended: interval } = getWashFrequencyDays(
    curlType,
    porosity,
    scalpCondition
  );

  const washDays: WashDay[] = [];

  for (let offset = 0; offset < WINDOW_DAYS; offset++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + offset);
    const washType = scheduledWashType(date, family, interval, routineStartDate);
    if (washType) {
      const daysSinceLastWash =
        washType === "refresh"
          ? daysSinceLastWashDay(date, family, interval, routineStartDate) ?? undefined
          : undefined;
      washDays.push({
        date: toIsoDate(date),
        weekday: date.getDay(),
        washType,
        ...(daysSinceLastWash !== undefined ? { daysSinceLastWash } : {}),
      });
    }
  }

  return washDays;
}

// "Wednesday, September 3" - no year, matching the spec's example
// format (the 30-day window never spans far enough to need one).
export function formatWashDayLabel(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

// "September 3, 2026" - used for the "starting <date>" header, which
// does need the year since it's read out of context from any specific
// wash day.
export function formatStartDateLabel(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
