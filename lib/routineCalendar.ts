export type WashDayType = "chelate" | "wash" | "protein";

export type WashDay = {
  date: string; // ISO yyyy-mm-dd
  weekday: number; // 0 = Sunday .. 6 = Saturday
  washType: WashDayType;
};

const WINDOW_DAYS = 30;

// high porosity's gappy cuticle needs frequent washing to stay balanced;
// low porosity resists moisture loss and can go long stretches between
// washes without buildup becoming a problem.
export function getWashIntervalDays(porosity: string | null): number {
  if (porosity === "high") return 7;
  if (porosity === "low") return 14;
  return 10; // medium, "not sure", or unset
}

// Occurrence 1 = chelating (clear buildup at the start of the cycle),
// occurrence 3 = protein (mid-cycle strengthening), occurrences 2 and 4
// are regular washes. Repeats if the 30-day window produces more than 4
// wash days (only possible for the 7-day/high-porosity interval).
const WASH_TYPE_CYCLE: WashDayType[] = ["chelate", "wash", "protein", "wash"];

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Rolling 30-day window starting from `startDate` (today, in practice) --
// replaces the old calendar-month grid, which showed wash days for
// whatever the current month happened to be (nearly empty right after
// the 1st, and showing days already in the past) instead of what's
// actually coming up next. The first wash day is startDate itself, not
// the next Saturday -- a subscriber wants to know "when's my next wash
// day from right now," not which Saturdays fall in this calendar month.
export function generateWashCalendar(
  startDate: Date,
  porosity: string | null
): WashDay[] {
  const interval = getWashIntervalDays(porosity);
  const washDays: WashDay[] = [];

  let occurrence = 0;
  for (let offset = 0; offset < WINDOW_DAYS; offset += interval) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + offset);
    washDays.push({
      date: toIsoDate(date),
      weekday: date.getDay(),
      washType: WASH_TYPE_CYCLE[occurrence % WASH_TYPE_CYCLE.length],
    });
    occurrence++;
  }

  return washDays;
}

// "Wednesday, September 3" -- no year, matching the spec's example
// format (the 30-day window never spans far enough to need one).
export function formatWashDayLabel(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

// "September 3, 2026" -- used for the "starting <date>" header, which
// does need the year since it's read out of context from any specific
// wash day.
export function formatStartDateLabel(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
