// Protective-style routine generation - a deliberately separate system
// from lib/routineCalendar.ts/lib/routineProducts.ts's natural-hair
// wash-day machinery rather than an extension of it. The day types
// (scalp wash/moisturize/retwist) and the whole premise (frequency
// isn't porosity-driven, wig wash cadence is measured in wears not
// days) are different enough that bolting them onto WashDayType would
// mean every existing consumer of that union (the calendar grid, the
// email template, "what to use today") would need to learn to ignore
// cases that don't apply to it. A parallel, narrower type is simpler to
// reason about even though it duplicates a little date-math.

export type ProtectiveStyleType = "braids" | "locs" | "wigs";

// extension_type is a multi-select (see app/profile/page.tsx's
// EXTENSION_TYPE_OPTIONS) - a user could pick both "Braids" and "Wigs."
// The routine can only actually be built around one style, so this uses
// the first selected type as the "primary" one, generic-labeled in the
// UI rather than named, per the multi-type handling decision made for
// this feature.
export function protectiveStyleTypeFromExtensionType(
  extensionType: string[] | null
): ProtectiveStyleType | null {
  if (!extensionType || extensionType.length === 0) return null;
  const first = extensionType[0];
  if (first === "loc_extensions") return "locs";
  if (first === "wigs") return "wigs";
  // braids, box_braids, weave, tape_in, clip_in, other - "other" falls
  // back to the braids/twists/weave bucket as the most general
  // protective-style category rather than being unhandled.
  return "braids";
}

export const PROTECTIVE_STYLE_LABEL: Record<ProtectiveStyleType, string> = {
  braids: "Braids",
  locs: "Locs",
  wigs: "Wig",
};

export type ProtectiveStyleDayType = "scalp_wash" | "moisturize" | "retwist";

export type ProtectiveStyleDay = {
  date: string; // ISO yyyy-mm-dd
  weekday: number;
  dayType: ProtectiveStyleDayType;
};

const WINDOW_DAYS = 30;

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export type ProtectiveStyleFrequency = { min: number; max: number; recommended: number };

// Not porosity-driven, per spec - the protective style itself sets the
// cadence regardless of the wearer's curl type/porosity.
export function getProtectiveStyleFrequency(
  styleType: ProtectiveStyleType
): ProtectiveStyleFrequency | null {
  if (styleType === "braids") return { min: 14, max: 21, recommended: 17 }; // every 2-3 weeks
  if (styleType === "locs") return { min: 14, max: 28, recommended: 21 }; // every 2-4 weeks
  return null; // wigs - cadence is wear-based, not calendar-based (see WIG_WASH_NOTE below)
}

// Braids/twists/weave: scalp wash on the main interval, with a
// moisturize day partway between each (roughly the midpoint - daily
// moisture is what the braid spray/product list is for, this is just
// the reminder cadence for the calendar itself).
function generateBraidsCalendar(startDate: Date): ProtectiveStyleDay[] {
  const { recommended: interval } = getProtectiveStyleFrequency("braids")!;
  const days: ProtectiveStyleDay[] = [];

  for (let offset = 0; offset < WINDOW_DAYS; offset += interval) {
    const washDate = new Date(startDate);
    washDate.setDate(washDate.getDate() + offset);
    days.push({ date: toIsoDate(washDate), weekday: washDate.getDay(), dayType: "scalp_wash" });

    const moisturizeOffset = offset + Math.round(interval / 2);
    if (moisturizeOffset < WINDOW_DAYS) {
      const moisturizeDate = new Date(startDate);
      moisturizeDate.setDate(moisturizeDate.getDate() + moisturizeOffset);
      days.push({
        date: toIsoDate(moisturizeDate),
        weekday: moisturizeDate.getDay(),
        dayType: "moisturize",
      });
    }
  }

  return days;
}

// Locs: wash on the main interval; a retwist reminder every other wash
// (roughly every 4-6 weeks) - the spec gives no exact retwist cadence
// beyond "wash days and retwist reminder days," so this doubles the
// wash interval as a reasonable middle-ground default.
function generateLocsCalendar(startDate: Date): ProtectiveStyleDay[] {
  const { recommended: interval } = getProtectiveStyleFrequency("locs")!;
  const days: ProtectiveStyleDay[] = [];
  let washCount = 0;

  for (let offset = 0; offset < WINDOW_DAYS; offset += interval) {
    washCount++;
    const date = new Date(startDate);
    date.setDate(date.getDate() + offset);
    days.push({
      date: toIsoDate(date),
      weekday: date.getDay(),
      dayType: washCount % 2 === 0 ? "retwist" : "scalp_wash",
    });
  }

  return days;
}

export function generateProtectiveStyleCalendar(
  startDate: Date,
  styleType: ProtectiveStyleType
): ProtectiveStyleDay[] {
  if (styleType === "braids") return generateBraidsCalendar(startDate);
  if (styleType === "locs") return generateLocsCalendar(startDate);
  return []; // wigs - no calendar, see getProtectiveStyleFrequency
}

export const PROTECTIVE_STYLE_DAY_LABEL: Record<ProtectiveStyleDayType, string> = {
  scalp_wash: "Scalp wash",
  moisturize: "Moisturize",
  retwist: "Retwist reminder",
};

export const WIG_WASH_NOTE =
  "Human hair wigs: wash every 7-14 wears. Synthetic wigs: wash every 15-20 wears.";

export const LOCS_BUILDUP_NOTE =
  "Heavy products in locs cause buildup that can lead to loc rot. Always choose residue-free and lightweight formulas.";

export const WIG_SCALP_CARE_NOTE =
  "Scalp care under wig: apply lightweight oil to scalp 2-3 times per week. Remove wig daily if possible to let scalp breathe.";
