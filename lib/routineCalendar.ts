import { curlFamily, type CurlFamily } from "@/lib/compatibility";

export type WashDayType =
  | "chelate"
  | "wash"
  | "protein"
  | "clarify"
  | "full_wash"
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

  // Porosity modifier - adjusts within the curl-type range.
  let porosityModifier = 0;
  if (porosity === "high") porosityModifier = -1; // wash more often
  if (porosity === "low") porosityModifier = 1; // wash less often

  // Scalp modifier.
  let scalpModifier = 0;
  if (scalpCondition === "oily") scalpModifier = -1;
  if (scalpCondition === "dry") scalpModifier = 1;

  const recommended = Math.round(
    (base.min + base.max) / 2 + porosityModifier + scalpModifier
  );

  return {
    min: Math.max(1, base.min + porosityModifier + scalpModifier),
    max: base.max + porosityModifier + scalpModifier,
    recommended: Math.max(1, recommended),
  };
}

// occurrence is 1-indexed (1st activity day, 2nd, ...), matching "every
// 8th"/"every 4th" the way a person would actually count.
function washTypeForOccurrence(
  family: CurlFamily | null,
  occurrence: number
): WashDayType {
  switch (family) {
    case "straight":
      // Interval is already ~daily/every-other-day for straight hair, so
      // each activity day IS the wash-count occurrence - clarify every
      // ~8th (within the 7-10 range), a real full wash roughly every
      // 4th, everything else a co-wash/dry-shampoo refresh.
      if (occurrence % 8 === 0) return "clarify";
      if (occurrence % 4 === 0) return "full_wash";
      return "refresh";
    case "wavy":
      // Between-day refresh entries are inserted separately in
      // generateWashCalendar below - this only classifies the actual
      // wash-cadence days.
      return occurrence % 3 === 0 ? "clarify" : "wash";
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

// Rolling 30-day window starting from `startDate` (today, in practice).
// The first entry is always startDate itself (offset 0), regardless of
// curl type or interval.
export function generateWashCalendar(
  startDate: Date,
  curlType: string | null,
  porosity: string | null,
  scalpCondition: string | null = null
): WashDay[] {
  const family = curlFamily(curlType);
  const { recommended: interval } = getWashFrequencyDays(
    curlType,
    porosity,
    scalpCondition
  );

  const washDays: WashDay[] = [];
  let occurrence = 0;

  for (let offset = 0; offset < WINDOW_DAYS; offset += interval) {
    occurrence++;
    const date = new Date(startDate);
    date.setDate(date.getDate() + offset);
    washDays.push({
      date: toIsoDate(date),
      weekday: date.getDay(),
      washType: washTypeForOccurrence(family, occurrence),
    });

    // Wavy hair's wash-cadence interval (2-5 days) leaves real gap days
    // that need their own guidance - unlike straight, whose interval is
    // already effectively daily/every-other-day (see
    // washTypeForOccurrence above), so there's no meaningful gap to fill.
    if (family === "wavy") {
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
