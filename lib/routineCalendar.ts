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

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function atMidnight(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

// Which wash occurrence (1st, 2nd, 3rd wash since the user's routine
// started) a given date falls on, given the wash interval. This is the
// piece that used to be a local counter reset to 1 every time the
// calendar was generated (i.e. every page load), which made "today"
// always land on occurrence 1 -> always the first entry of whatever
// cycle array (chelate/clarify) regardless of the actual date. Anchoring
// to a persisted routineStartDate instead means occurrence - and so
// today's wash type - only advances with real elapsed days.
function occurrenceForDate(date: Date, routineStartDate: Date, interval: number): number {
  const daysSinceStart = Math.floor(
    (atMidnight(date).getTime() - atMidnight(routineStartDate).getTime()) / MS_PER_DAY
  );
  const washDayNumber = Math.floor(Math.max(0, daysSinceStart) / interval);
  return washDayNumber + 1; // 1-indexed, matching washTypeForOccurrence's convention
}

// Rolling 30-day window starting from `startDate` (today, in practice).
// The first entry is always startDate itself (offset 0), regardless of
// curl type or interval. `routineStartDate` (hair_profiles.routine_start_date -
// the date the user's routine subscription was activated) anchors which
// occurrence of the wash cycle each date falls on; defaults to
// `startDate` only if the caller has no persisted start date at all.
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

  for (let offset = 0; offset < WINDOW_DAYS; offset += interval) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + offset);
    const occurrence = occurrenceForDate(date, routineStartDate, interval);
    washDays.push({
      date: toIsoDate(date),
      weekday: date.getDay(),
      washType: washTypeForOccurrence(family, occurrence),
    });

    // Straight and wavy hair's wash-cadence interval (1-5 days) can leave
    // real gap days that need their own guidance - fill with `interval -
    // 1` refresh days between each wash (zero when interval is 1, i.e. a
    // daily washer, so no refresh days show up for them at all). Curly and
    // coily intervals run 4-21 days and deliberately have no refresh
    // entries - their non-wash days render as plain rest/seal-ends dots
    // instead (see app/routine/page.tsx's DayCell).
    if (family === "straight" || family === "wavy") {
      for (
        let gapOffset = offset + 1;
        gapOffset < Math.min(offset + interval, WINDOW_DAYS);
        gapOffset++
      ) {
        const gapDate = new Date(startDate);
        gapDate.setDate(gapDate.getDate() + gapOffset);
        washDays.push({
          date: toIsoDate(gapDate),
          weekday: gapDate.getDay(),
          washType: "refresh",
        });
      }
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
