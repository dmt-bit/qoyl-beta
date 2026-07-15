export type WashDayType = "chelate" | "wash" | "protein";

export type CalendarDay = {
  day: number; // 1-indexed day of month
  weekday: number; // 0 = Sunday .. 6 = Saturday
  washType: WashDayType | null;
};

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
// are regular washes. Repeats if a porosity/month combination produces
// more than 4 wash days.
const WASH_TYPE_CYCLE: WashDayType[] = ["chelate", "wash", "protein", "wash"];

export function generateWashCalendar(
  year: number,
  month: number, // 1-indexed: January = 1
  porosity: string | null
): CalendarDay[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const interval = getWashIntervalDays(porosity);

  // Anchor the first wash day to the month's first Saturday -- a
  // conventional wash day that keeps the schedule on weekends.
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const daysUntilFirstSaturday = (6 - firstWeekday + 7) % 7;
  const firstWashDay = 1 + daysUntilFirstSaturday;

  const washDays = new Map<number, WashDayType>();
  let occurrence = 0;
  for (let day = firstWashDay; day <= daysInMonth; day += interval) {
    washDays.set(day, WASH_TYPE_CYCLE[occurrence % WASH_TYPE_CYCLE.length]);
    occurrence++;
  }

  const days: CalendarDay[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    days.push({
      day,
      weekday: new Date(year, month - 1, day).getDay(),
      washType: washDays.get(day) ?? null,
    });
  }
  return days;
}
