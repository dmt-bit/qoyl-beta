"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Collapse from "@/components/Collapse";
import ShopButton from "@/components/ShopButton";
import { useAuth } from "@/lib/auth-context";
import { curlFamily, CurlFamily, scoreTier, TIER_CLASSES } from "@/lib/compatibility";
import { ProductWeight, WEIGHT_PILL_CLASSES, weightFitNote, weightPillLabel } from "@/lib/productWeight";
import { WashDay, WashDayType } from "@/lib/routineCalendar";
import { logMlEvent } from "@/lib/mlEvents";
import type { RoutineFlag } from "@/lib/routineInteractions";
import {
  categoryNote,
  getCategoryGuidanceTips,
  ROUTINE_SECTION_LABEL,
  ROUTINE_SECTION_ORDER,
  type RoutineSection,
} from "@/lib/categoryGuidance";
import {
  isBudgetActive,
  PRICE_TIER_CLASSES,
  PRICE_TIER_LABEL,
  priceTierFor,
} from "@/lib/priceContext";
import { PROTECTIVE_STYLE_DAY_LABEL } from "@/lib/protectiveStyleRoutine";
import { markRoutineVisited } from "@/lib/routineVisit";
import {
  estimateRefreshDayMinutes,
  estimateWashDayMinutes,
  getPreShampooStep,
  type RoutineStepDetail,
  type WashDayKey,
  type WashDaySteps,
} from "@/lib/routineSteps";
import { lookupCityState } from "@/lib/zipLookup";
import { getToolsForProfile } from "@/lib/getToolsForProfile";
import { findTool, type HairTool } from "@/lib/toolsData";

type RoutineStep = {
  title: string;
  body: string;
  why: string;
};

type ProductCandidate = {
  productName: string;
  brandName: string;
  score: number;
  weight: ProductWeight;
  why: string;
  affiliateLink: string | null;
  priceUsd: number | null;
  containsSulfates: boolean;
  nameKeywordBadge: string | null;
};

type ProductPick = {
  category: string;
  categoryLabel: string;
  section: RoutineSection;
  searchCategorySlug: string;
  searchQuery: string | null;
  primary: ProductCandidate | null;
  alternate: ProductCandidate | null;
  noProductsYet: boolean;
  budgetAlternate: ProductCandidate | null;
};

// Mirrors lib/routineProducts.ts's DailyRefreshProductPick - defined
// locally (not imported) since that module pulls in getSupabaseAdmin,
// which must never reach this client bundle.
type DailyProductPick = ProductPick & {
  dailyLabel: string;
  dailyWhy: string;
};

type AvoidIngredient = {
  ingredientName: string;
  score: number;
  reason: string | null;
};

type RoutineBrandProduct = {
  id: string;
  name: string;
  description: string | null;
  priceUsd: number | null;
  imageUrl: string | null;
  productUrl: string;
  shopperUrl: string | null;
  category: string;
  isFeatured: boolean;
  brandName: string;
  subscriptionTier: string | null;
  score: number | null;
};

type RoutineData = {
  firstName: string | null;
  curlType: string | null;
  porosity: string | null;
  scalpCondition: string | null;
  zipCode: string | null;
  startDateLabel: string;
  washFrequency: { min: number; max: number; recommended: number };
  profileFor: string | null;
  childSafetyNote: string | null;
  calendarDays: WashDay[];
  todayIso: string;
  streak: number;
  missedDates: string[];
  todayCompletion: { washType: string; completedAt: string; notes: string | null } | null;
  stepsByWashType: WashDaySteps[];
  // Refresh day (every non-wash day) content - see lib/routineSteps.ts.
  // refreshStepsBase is always 4 steps (moisturize/seal/style/protect-
  // tonight); refreshScalpCheckStep is spliced in after "seal" whenever a
  // given WashDay's showScalpCheck is true (see getStepsForDay below).
  refreshStepsBase: RoutineStepDetail[];
  refreshScalpCheckStep: RoutineStepDetail;
  additionalNotes: RoutineStep[];
  products: ProductPick[];
  routineFlags: RoutineFlag[];
  refreshDailyProducts: DailyProductPick[];
  brandProducts: RoutineBrandProduct[];
  avoidIngredients: AvoidIngredient[];
  colorTreated: string | null;
  budgetRange: string | null;
  routineFocus: string | null;
  protectiveStyleType: string | null;
  focusNote: string | null;
  protectiveStyle: ProtectiveStyleData | null;
};

type ProtectiveStyleDay = {
  date: string;
  weekday: number;
  dayType: "scalp_wash" | "moisturize" | "retwist";
};

type ProtectiveStyleData = {
  styleType: "braids" | "locs" | "wigs";
  styleLabel: string;
  frequency: { min: number; max: number; recommended: number } | null;
  calendarDays: ProtectiveStyleDay[];
  products: ProductPick[];
  accessories: { label: string; note: string }[];
  routineNote: string | null;
  wigWashNote: string | null;
  wigScalpCareNote: string | null;
};

// Same color coding as the calendar's DayCell/CalendarLegend below, so a
// user can see e.g. a green-bordered date and know exactly which product
// section to scroll to. Labels/order come from lib/categoryGuidance.ts,
// the shared source of truth also used by emails/routine-template.ts;
// only the Tailwind dot styling is web-specific and stays local.
const SECTION_DOT_CLASS: Record<RoutineSection, string> = {
  clarify: "border-2 border-bronze bg-white",
  regular: "bg-white",
  protein: "border-2 border-green bg-white",
  between: "bg-bronze",
  styling: "bg-bronze2",
};
const SECTION_META: Record<RoutineSection, { label: string; dotClass: string }> =
  Object.fromEntries(
    ROUTINE_SECTION_ORDER.map((section) => [
      section,
      { label: ROUTINE_SECTION_LABEL[section], dotClass: SECTION_DOT_CLASS[section] },
    ])
  ) as Record<RoutineSection, { label: string; dotClass: string }>;
const SECTION_ORDER = ROUTINE_SECTION_ORDER;

// Every day now has a routine (wash or refresh) - these helpers pick the
// right step/product list for ANY WashDay, reused by the hero, steps, and
// products sections rather than each recomputing the wash-vs-refresh
// branch and the conditional-scalp-check splice separately.
const HAIRSPRAY_STYLING_COPY =
  " Finish with a light mist of hairspray 6-8 inches from the hair. Flexible hold for natural movement, strong hold for styles that need to last all day.";

// Straight/wavy users who have a hairspray pick get the finishing line
// appended to that day's styling step (wash or refresh day alike).
function withHairsprayCopy(data: RoutineData, steps: RoutineStepDetail[]): RoutineStepDetail[] {
  const family = curlFamily(data.curlType);
  if (family !== "straight" && family !== "wavy") return steps;
  const hasHairspray =
    data.products.some((p) => p.category === "hairspray") ||
    data.refreshDailyProducts.some((p) => p.category === "daily-hairspray");
  if (!hasHairspray) return steps;
  let idx = -1;
  steps.forEach((st, i) => {
    if (/style/i.test(st.title)) idx = i;
  });
  if (idx === -1) return steps;
  return steps.map((st, i) => (i === idx ? { ...st, body: st.body + HAIRSPRAY_STYLING_COPY } : st));
}

// Users who have a pre-shampoo product get it inserted as Step 0, before
// shampoo, on every wash day (regular/clarifying/protein). Not shown on
// refresh days (no shampooing to protect against) and not shown at all if
// the user has no pre-shampoo pick - unlike hairspray's copy-append above,
// a missing pre-shampoo product means no step, not a placeholder prompt.
function hasPreShampooProduct(data: RoutineData): boolean {
  return data.products.some((p) => p.category === "pre-shampoo" && !p.noProductsYet);
}

function withPreShampooStep(data: RoutineData, steps: RoutineStepDetail[]): RoutineStepDetail[] {
  if (!hasPreShampooProduct(data)) return steps;
  return [getPreShampooStep(data.curlType), ...steps];
}

function getStepsForDay(data: RoutineData, washDay: WashDay): RoutineStepDetail[] {
  if (washDay.washType === "refresh") {
    const base = data.refreshStepsBase;
    const steps = washDay.showScalpCheck
      ? [base[0], base[1], data.refreshScalpCheckStep, base[2], base[3]]
      : base;
    return withHairsprayCopy(data, steps);
  }
  const key = washDayKeyForType(washDay.washType);
  const washSteps = data.stepsByWashType.find((w) => w.key === key)?.steps ?? [];
  return withPreShampooStep(data, withHairsprayCopy(data, washSteps));
}

const HAIRSPRAY_CARD_NOTE =
  "hairsprays are finishing products — apply after styling, not before. daily use on high porosity hair may cause dryness over time.";

function getMinutesForDay(steps: RoutineStepDetail[], washDay: WashDay): number {
  if (washDay.washType === "refresh") return estimateRefreshDayMinutes(steps.length);
  return estimateWashDayMinutes(steps);
}

function getProductsForDay(data: RoutineData, washDay: WashDay): (ProductPick | DailyProductPick)[] {
  if (washDay.washType === "refresh") return data.refreshDailyProducts;
  const base = data.products.filter(
    (pick) =>
      pick.category !== "hair-mask" &&
      pick.category !== "pre-shampoo" &&
      sectionsForWashType(washDay.washType).includes(pick.section)
  );
  // Pre-shampoo, like Step 0 above, shows on every wash day (regular,
  // clarifying, protein alike) rather than being gated to a single
  // RoutineSection - it protects against the same shampoo exposure
  // regardless of which wash type that exposure is.
  const preShampoo = data.products.find((pick) => pick.category === "pre-shampoo" && !pick.noProductsYet);
  const withPreShampoo = preShampoo ? [preShampoo, ...base] : base;
  const mask = data.products.find((pick) => pick.category === "hair-mask" && !pick.noProductsYet);
  if (!mask) return withPreShampoo;

  // Hair masks (weekly/bi-weekly intensive treatments) and deep
  // conditioners (every wash day) are separate categories:
  // - mask only: the mask is the conditioning step on every wash day, so
  //   an empty deep-conditioner placeholder is hidden.
  // - both: deep conditioner on regular wash days, mask on the more
  //   intensive protein/chelating days.
  const deep = data.products.find((pick) => pick.category === "deep-conditioner");
  const hasDeepConditioner = Boolean(deep && !deep.noProductsYet);
  if (!hasDeepConditioner) {
    return [...withPreShampoo.filter((pick) => pick.category !== "deep-conditioner"), mask];
  }
  const isTreatmentDay = washDay.washType !== "wash";
  return isTreatmentDay ? [...withPreShampoo, mask] : withPreShampoo;
}

const HAIR_MASK_TREATMENT_NOTE =
  "use in place of your deep conditioner on treatment days — apply for 15-30 minutes with a heated cap for maximum penetration";

// "tuesday · regular wash" / "wednesday · refresh day" - the day-header
// format the calendar/steps/products sections all share once a specific
// day (not just "today") can be selected.
function washTypeShortLabel(type: WashDayType): string {
  if (type === "chelate" || type === "clarify") return "clarifying wash";
  if (type === "protein") return "protein wash";
  if (type === "refresh") return "refresh day";
  return "regular wash";
}

function dayHeaderLabel(iso: string, washType: WashDayType): string {
  const weekday = new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
  return `${weekday} · ${washTypeShortLabel(washType)}`;
}

// Maps a calendar wash day directly onto the product section(s) relevant
// to it -- styling products apply after any actual wash, so wash days
// pull in the styling section too; a between-wash day (dry
// shampoo/co-wash) stands alone.
function sectionsForWashType(type: WashDayType): RoutineSection[] {
  if (type === "chelate" || type === "clarify") return ["clarify", "styling"];
  if (type === "protein") return ["protein", "styling"];
  if (type === "refresh") return ["between"];
  return ["regular", "styling"];
}


// ---- Calendar grid (Part 2: restores a real month-grid visual instead
// of the rolling list) -----------------------------------------------
//
// Wash-date math itself is untouched - this only changes how the
// already-computed WashDay[] is displayed, mapping each entry onto
// full calendar-month grids instead of a flat list.

function toIsoLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

const CALENDAR_WINDOW_DAYS = 30;

type MonthMeta = { year: number; month: number; label: string };

// Mirrors the given month-detection snippet (today -> today+30) - used
// only to decide which month grid(s) to render. Which individual days
// fall inside the real 30-day wash window is a separate, day-accurate
// check (windowStartIso/windowEndIso in WashCalendarGrid below).
function getMonthsInWindow(today: Date): MonthMeta[] {
  const endDate = addDays(today, 30);
  const months: MonthMeta[] = [];
  const seen = new Set<string>();
  for (const d of [today, endDate]) {
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    months.push({
      year: d.getFullYear(),
      month: d.getMonth(),
      label: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    });
  }
  return months;
}

type DayCellData = { day: number; iso: string; weekday: number };

function buildMonthCells(year: number, month: number): DayCellData[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: DayCellData[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    cells.push({ day, iso: toIsoLocal(date), weekday: date.getDay() });
  }
  return cells;
}

type WashCellStyle =
  | { kind: "filled"; cellClass: string; numberClass: string; label: string; labelClass: string }
  | { kind: "dot"; dotClass: string };

// "clarify"/"chelate" render identically (bronze border - clarifying
// and chelating washes read the same on the calendar), as does "protein"
// (green border) - these are the notable, infrequent events for every
// family and always get the full filled-cell treatment.
//
// Straight hair washes near-daily, so its "wash"/"refresh" days would
// otherwise paint the whole grid solid dark - those two render as a
// small dot instead (bronze for an actual wash, muted for a refresh),
// letting the clarify/protein cells actually stand out. Every other
// family keeps the original filled-cell "wash"/"refresh" treatment.
// `completed` tints a wash-type (non-refresh) cell's background
// from white to a light gray - the checkmark overlay itself is drawn by
// DayCell, not here, since it's the same brightened background either
// way and only DayCell knows about the todayCompletion/missed props.
function washDayCellStyle(type: WashDayType, family: CurlFamily | null, completed: boolean): WashCellStyle {
  const washBg = completed ? "bg-[#f5f5f5]" : "bg-white";
  if (type === "chelate" || type === "clarify") {
    return {
      kind: "filled",
      cellClass: `cal-cell-clarify ${washBg} border-2 border-bronze`,
      numberClass: "text-dark",
      label: "Clarify",
      labelClass: "text-bronze",
    };
  }
  if (type === "protein") {
    return {
      kind: "filled",
      cellClass: `cal-cell-protein ${washBg} border-2 border-green`,
      numberClass: "text-dark",
      label: "Protein",
      labelClass: "text-green",
    };
  }
  if (type === "refresh") {
    if (family === "straight") return { kind: "dot", dotClass: "bg-muted" };
    return {
      kind: "filled",
      cellClass: "cal-cell-refresh bg-[#f5f5f5]",
      numberClass: "text-bronze2",
      label: "Refresh",
      labelClass: "text-bronze2",
    };
  }
  if (family === "straight") return { kind: "dot", dotClass: "bg-bronze" };
  return {
    kind: "filled",
    cellClass: `cal-cell-wash ${washBg}`,
    numberClass: "text-dark",
    label: "Wash",
    labelClass: "text-dark/50",
  };
}

// Tiny white checkmark for a completed wash-type cell - deliberately
// not reusing CheckListIcon/etc. from elsewhere in this file, all of
// which are sized for buttons/badges, not an 8-10px overlay.
function TinyCheckIcon() {
  return (
    <svg className="h-2.5 w-2.5 text-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function DayCell({
  cell,
  washDay,
  isToday,
  isWithinWindow,
  isCompleted,
  isMissed,
  family,
  isSelected,
  onSelect,
}: {
  cell: DayCellData;
  washDay: WashDay | undefined;
  isToday: boolean;
  isWithinWindow: boolean;
  isCompleted: boolean;
  isMissed: boolean;
  family: CurlFamily | null;
  isSelected: boolean;
  onSelect: (iso: string) => void;
}) {
  const todayMarker = isToday ? (
    <span className="absolute left-1/2 top-0.5 h-1 w-1 -translate-x-1/2 rounded-full bg-bronze2" />
  ) : null;
  // Every day within the window now has a real WashDay entry (see
  // lib/routineCalendar.ts - non-wash days are "refresh" instead of
  // simply absent), so tapping is always meaningful here; the button
  // wrapper works identically for a wash cell, a refresh cell, or the
  // dot-kind cells below.
  const handleClick = () => onSelect(cell.iso);
  // "Highlight the tapped day with black background white text" -
  // overrides whatever the cell's own wash-type styling would otherwise
  // show, applied identically across all three render branches below.
  const selectedOverride = isSelected ? "!bg-dark [&_*]:!text-white" : "";

  if (washDay) {
    const style = washDayCellStyle(washDay.washType, family, isCompleted);
    const isRefresh = washDay.washType === "refresh";
    if (style.kind === "dot") {
      // Completed dot-kind cells (straight/wavy's daily wash shown as a
      // small dot rather than a full filled cell): a wash dot becomes a
      // tiny checkmark, a refresh dot turns bronze - same two
      // completed treatments as the filled cells below, just scaled
      // down to fit the dot presentation.
      return (
        <button
          type="button"
          onClick={handleClick}
          className={`relative flex min-h-[40px] w-full flex-col items-center justify-center rounded-md ${selectedOverride}`}
        >
          {todayMarker}
          <span className="font-sans text-xs text-dark/70">{cell.day}</span>
          {isCompleted && !isRefresh ? (
            <TinyCheckIcon />
          ) : (
            <span
              className={`mt-0.5 h-1 w-1 rounded-full ${isCompleted ? "bg-bronze" : style.dotClass}`}
            />
          )}
        </button>
      );
    }
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`relative flex min-h-[40px] w-full flex-col items-center justify-center rounded-md ${style.cellClass} ${selectedOverride}`}
      >
        {todayMarker}
        {isCompleted && isRefresh && (
          <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-bronze" />
        )}
        <span className={`font-sans text-xs ${style.numberClass}`}>{cell.day}</span>
        {isCompleted && !isRefresh ? (
          <TinyCheckIcon />
        ) : (
          <span className={`font-sans text-[7px] sm:text-[8px] ${style.labelClass}`}>
            {style.label}
          </span>
        )}
      </button>
    );
  }

  if (!isWithinWindow) {
    return (
      <div className="relative flex min-h-[40px] items-center justify-center rounded-md">
        <span className="font-sans text-xs text-muted opacity-30">{cell.day}</span>
        {isMissed && (
          <span
            aria-label="Missed"
            className="absolute bottom-0.5 right-1 h-1.5 w-1.5 rounded-full bg-amber"
          />
        )}
      </div>
    );
  }

  // Defensive fallback only - every date within the window now has a
  // washDay entry (every day has a routine, wash or refresh), so this
  // branch should be unreachable in practice.
  const dotClass = family === "coily" ? "bg-bronze" : "bg-muted";
  return (
    <button
      type="button"
      onClick={handleClick}
      className={`relative flex min-h-[40px] w-full flex-col items-center justify-center rounded-md ${selectedOverride}`}
    >
      {todayMarker}
      <span className="font-sans text-xs text-muted">{cell.day}</span>
      <span className={`mt-0.5 h-1 w-1 rounded-full ${dotClass}`} />
    </button>
  );
}

function MonthCalendar({
  meta,
  washDayByDate,
  todayIso,
  windowStartIso,
  windowEndIso,
  completedIso,
  missedIsoDates,
  family,
  selectedIso,
  onSelect,
}: {
  meta: MonthMeta;
  washDayByDate: Map<string, WashDay>;
  todayIso: string;
  windowStartIso: string;
  windowEndIso: string;
  completedIso: string | null;
  missedIsoDates: Set<string>;
  family: CurlFamily | null;
  selectedIso: string;
  onSelect: (iso: string) => void;
}) {
  const cells = buildMonthCells(meta.year, meta.month);
  const leadingEmpty = cells[0]?.weekday ?? 0;

  return (
    <div>
      <h3 className="font-serif text-base text-dark">{meta.label}</h3>
      <div className="mt-2 grid grid-cols-7 gap-1">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div
            key={i}
            className="text-center font-sans text-[9px] uppercase tracking-wide text-muted"
          >
            {d}
          </div>
        ))}
        {Array.from({ length: leadingEmpty }).map((_, i) => (
          <div key={`lead-${i}`} />
        ))}
        {cells.map((cell) => (
          <DayCell
            key={cell.iso}
            cell={cell}
            washDay={washDayByDate.get(cell.iso)}
            isToday={cell.iso === todayIso}
            isWithinWindow={cell.iso >= windowStartIso && cell.iso <= windowEndIso}
            isCompleted={cell.iso === completedIso}
            isMissed={missedIsoDates.has(cell.iso)}
            family={family}
            isSelected={cell.iso === selectedIso}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

// Matches the product list's section-divider colors/wording 1:1 (see
// SECTION_META above) -- a green-bordered date on the calendar should
// point straight at the "Protein treatment day" section below it.
function CalendarLegend({ family }: { family: CurlFamily | null }) {
  const items: { swatchClass: string; label: string; dot?: boolean }[] = [
    { swatchClass: SECTION_META.clarify.dotClass, label: SECTION_META.clarify.label },
    { swatchClass: SECTION_META.regular.dotClass, label: SECTION_META.regular.label },
    { swatchClass: SECTION_META.protein.dotClass, label: SECTION_META.protein.label },
  ];
  // Every family gets a refresh day on every non-wash date now (see
  // lib/routineCalendar.ts) - straight's is shown as a small dot (it
  // washes near-daily, so a filled cell would paint the whole grid
  // solid), every other family gets the same filled "Refresh" treatment
  // as regular wash days.
  if (family === "straight") {
    items.push({ swatchClass: "bg-muted", label: "Refresh (daily)", dot: true });
  } else {
    items.push({ swatchClass: SECTION_META.between.dotClass, label: "Refresh day", dot: true });
  }

  return (
    <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
      {items.map((item) => (
        <span
          key={item.label}
          className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-dark/15 bg-cream px-3 py-1.5 text-xs font-medium text-dark"
        >
          <span
            className={`h-2.5 w-2.5 shrink-0 ${item.dot ? "rounded-full" : "rounded-sm"} ${item.swatchClass}`}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function WashCalendarGrid({
  calendarDays,
  todayIso,
  completedIso,
  missedDates,
  family,
  selectedIso,
  onSelect,
}: {
  calendarDays: WashDay[];
  todayIso: string;
  completedIso: string | null;
  missedDates: string[];
  family: CurlFamily | null;
  selectedIso: string;
  onSelect: (iso: string) => void;
}) {
  const washDayByDate = new Map(calendarDays.map((d) => [d.date, d]));
  const missedIsoDates = new Set(missedDates);
  const today = new Date(`${todayIso}T00:00:00`);
  const windowEndIso = toIsoLocal(addDays(today, CALENDAR_WINDOW_DAYS - 1));
  const months = getMonthsInWindow(today);

  return (
    <div className="cal-grid-container mt-4">
      <div
        className={`grid grid-cols-1 gap-x-8 gap-y-8 ${
          months.length > 1 ? "sm:grid-cols-2 sm:divide-x sm:divide-bronze/20" : ""
        }`}
      >
        {months.map((meta, i) => (
          <div key={`${meta.year}-${meta.month}`} className={i > 0 ? "sm:pl-8" : ""}>
            <MonthCalendar
              meta={meta}
              washDayByDate={washDayByDate}
              todayIso={todayIso}
              windowStartIso={todayIso}
              windowEndIso={windowEndIso}
              completedIso={completedIso}
              missedIsoDates={missedIsoDates}
              family={family}
              selectedIso={selectedIso}
              onSelect={onSelect}
            />
          </div>
        ))}
      </div>
      <CalendarLegend family={family} />
    </div>
  );
}

// Small bronze bottle/flask outline - no icon library in this project,
// so a minimal inline SVG rather than pulling one in for a single glyph.
// Wide-tooth comb, specifically for the detangler placeholder - every
// other category keeps the generic bottle/flask icon below.
function CombIcon() {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bronze/15">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="h-5 w-5 text-bronze"
      >
        <path
          d="M4 3v18M4 3h13a3 3 0 0 1 3 3v0"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M7 8h13M7 12h13M7 16h13"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

function CategoryIcon({ category }: { category?: string }) {
  if (category === "detangler") return <CombIcon />;

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bronze/15">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="h-5 w-5 text-bronze"
      >
        <path
          d="M9 2h6M10 2v5.5L5.5 15a3 3 0 0 0 2.6 4.5h7.8a3 3 0 0 0 2.6-4.5L14 7.5V2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function articleFor(word: string): string {
  return /^[aeiou]/i.test(word) ? "an" : "a";
}

// Shown instead of a blank/error card when a category has zero scoreable
// candidates for this profile - see lib/categoryGuidance.ts for the
// per-category ingredient tips.
function PlaceholderCard({ pick }: { pick: ProductPick }) {
  const labelLower = pick.categoryLabel.toLowerCase();
  const tips = getCategoryGuidanceTips(pick.category);

  return (
    <>
      <div className="mt-3 flex items-start gap-3">
        <CategoryIcon category={pick.category} />
        <div>
          <p className="font-serif text-base text-dark">
            We&apos;re adding {labelLower} products to our catalog
          </p>
          <p className="mt-1 text-sm text-dark/60">
            In the meantime, look for these key ingredients when shopping for{" "}
            {articleFor(labelLower)} {labelLower}:
          </p>
        </div>
      </div>
      <ul className="mt-3 space-y-1.5">
        {tips.map((tip) => (
          <li key={tip} className="text-xs leading-relaxed text-dark/70">
            • {tip}
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        <Link
          href={`/search?category=${encodeURIComponent(pick.searchCategorySlug)}${
            pick.searchQuery ? `&q=${encodeURIComponent(pick.searchQuery)}` : ""
          }`}
          className="print-hide text-sm font-medium text-bronze2 underline underline-offset-2 hover:text-dark"
        >
          Search our catalog →
        </Link>
        <Link
          href={`/request?product=${encodeURIComponent(pick.categoryLabel)}`}
          className="print-hide text-sm font-medium text-bronze2 underline underline-offset-2 hover:text-dark"
        >
          Request {articleFor(labelLower)} {labelLower} evaluation →
        </Link>
      </div>
    </>
  );
}

// Price-tier chip + score/weight pills for a single candidate - shared
// between the primary pick and the budget-friendly alternate below it.
function PriceTierChip({ priceUsd }: { priceUsd: number | null }) {
  if (priceUsd == null) return null;
  const tier = priceTierFor(priceUsd);
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${PRICE_TIER_CLASSES[tier]}`}>
      {PRICE_TIER_LABEL[tier]}
    </span>
  );
}

function ProductCard({
  pick,
  curlType,
  porosity,
  budgetRange,
  colorTreated,
}: {
  pick: ProductPick;
  curlType: string | null;
  porosity: string | null;
  budgetRange: string | null;
  colorTreated: boolean;
}) {
  const { primary, alternate, budgetAlternate } = pick;
  const fitNote = primary
    ? weightFitNote(primary.weight, curlFamily(curlType), curlType, porosity)
    : null;
  const note = categoryNote(pick.category, curlFamily(curlType));
  const budgetActive = isBudgetActive(budgetRange);
  const accentClass = productAccentClass(pick);

  return (
    <div className={`rounded-xl border border-bronze/30 p-5 ${accentClass}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-bronze2">
        {pick.categoryLabel}
      </p>
      {pick.category === "pre-shampoo" && (
        <p className="mt-0.5 font-mono text-[9px] lowercase text-muted">step 0 · before washing</p>
      )}
      {note && (
        <p className="mt-1.5 bg-bronze/10 px-2.5 py-1.5 text-xs leading-relaxed text-bronze2">
          {note}
        </p>
      )}

      {pick.noProductsYet || !primary ? (
        <PlaceholderCard pick={pick} />
      ) : (
        <>
          <div className="mt-3 flex items-start justify-between gap-3">
            <div>
              <p className="font-serif text-lg text-dark">{primary.productName}</p>
              <p className="text-xs text-dark/50">{primary.brandName}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  TIER_CLASSES[scoreTier(primary.score)]
                }`}
              >
                {primary.score}
              </span>
              {primary.nameKeywordBadge && (
                <span className="rounded-full border border-bronze px-2 py-0.5 text-right font-sans text-[9px] font-medium text-bronze2">
                  {primary.nameKeywordBadge}
                </span>
              )}
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${WEIGHT_PILL_CLASSES[primary.weight]}`}
              >
                {weightPillLabel(primary.weight, pick.category)}
              </span>
              {budgetActive && <PriceTierChip priceUsd={primary.priceUsd} />}
            </div>
          </div>
          <p className="mt-1 text-sm text-dark/70">{primary.why}</p>
          {fitNote && <p className="mt-1 text-xs text-dark/50">{fitNote}</p>}
          {colorTreated && primary.containsSulfates && (
            <p className="mt-1.5 rounded-md bg-amber/10 px-2.5 py-1.5 text-xs leading-relaxed text-amber">
              Contains sulfates - may fade color faster. Consider a sulfate-free alternative.
            </p>
          )}
          <ShopButton
            productName={primary.productName}
            brandName={primary.brandName}
            className="print-hide mt-3 inline-block text-sm font-medium text-bronze2 underline underline-offset-2 hover:text-dark"
          />

          {alternate && (
            <div className="mt-4 border-t border-bronze/20 pt-3">
              <p className="text-xs text-dark/50">
                Alternate pick:{" "}
                <span className="text-dark/80">
                  {alternate.productName} · {alternate.brandName}
                </span>
                <span className="ml-2 text-dark/50">{alternate.score}/100</span>
              </p>
            </div>
          )}

          {budgetActive && budgetAlternate && (
            <div className="mt-4 border-t border-bronze/20 pt-3">
              <p className="text-xs text-dark/70">
                This scores highest for your hair. For a budget-friendly alternative:
              </p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-xs text-dark/80">
                  {budgetAlternate.productName} · {budgetAlternate.brandName}
                  <span className="ml-2 text-dark/50">{budgetAlternate.score}/100</span>
                </span>
                <PriceTierChip priceUsd={budgetAlternate.priceUsd} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Bronze label + hairline rule between product-list groups - wording and
// color match SECTION_META / CalendarLegend above 1:1.
function SectionDivider({ section }: { section: RoutineSection }) {
  const dotClass = section === "protein" ? "bg-green" : "bg-bronze";
  const textClass = section === "protein" ? "text-green" : "text-bronze";
  const lineClass = section === "protein" ? "bg-green/20" : "bg-bronze/20";
  return (
    <div className="col-span-full mt-6 flex items-center gap-2 first:mt-0">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`} />
      <span className={`shrink-0 font-sans text-[10px] font-semibold uppercase tracking-wide ${textClass}`}>
        {SECTION_META[section].label}
      </span>
      <span className={`h-px flex-1 ${lineClass}`} />
    </div>
  );
}


// Braids/locs get a simple date list rather than the natural-hair
// month-grid calendar - the day types (scalp wash/moisturize/retwist)
// aren't porosity-driven and don't need the same visual treatment as
// the wash-type calendar above. Wigs have no calendar at all - cadence
// is wear-based, not date-based (see wigWashNote).
function ProtectiveStyleCalendarList({ days }: { days: ProtectiveStyleDay[] }) {
  if (days.length === 0) return null;

  const DAY_TYPE_CLASSES: Record<ProtectiveStyleDay["dayType"], string> = {
    scalp_wash: "border-bronze text-bronze2",
    moisturize: "border-bronze/30 text-dark/60",
    retwist: "border-green text-green",
  };

  return (
    <div className="mt-4 space-y-1.5">
      {days.map((day) => (
        <div
          key={`${day.date}-${day.dayType}`}
          className={`flex items-center justify-between rounded-md border-l-4 bg-[#f5f5f5] px-3 py-2 ${DAY_TYPE_CLASSES[day.dayType]}`}
        >
          <span className="text-sm text-dark">
            {new Date(`${day.date}T00:00:00`).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </span>
          <span className="text-xs font-medium">{PROTECTIVE_STYLE_DAY_LABEL[day.dayType]}</span>
        </div>
      ))}
    </div>
  );
}

function ProtectiveStyleSection({ data }: { data: RoutineData }) {
  const style = data.protectiveStyle;
  if (!style) return null;

  return (
    <>
      <section className="print-page-break mt-12">
        <h2 className="font-serif text-2xl font-semibold text-dark">
          Your {style.styleLabel.toLowerCase()} care routine
        </h2>

        {style.frequency && (
          <span className="mt-3 inline-block rounded-full bg-bronze/20 px-3 py-1 text-xs font-medium text-bronze2">
            Wash every {style.frequency.min}-{style.frequency.max} days
          </span>
        )}
        {style.wigWashNote && (
          <p className="mt-3 text-sm text-dark/70">{style.wigWashNote}</p>
        )}
        {style.routineNote && (
          <p className="mt-4 border-l-2 border-bronze bg-warm/10 px-4 py-3 text-sm leading-relaxed text-dark/90">
            {style.routineNote}
          </p>
        )}
        {style.wigScalpCareNote && (
          <p className="mt-4 border-l-2 border-bronze bg-warm/10 px-4 py-3 text-sm leading-relaxed text-dark/90">
            {style.wigScalpCareNote}
          </p>
        )}

        <ProtectiveStyleCalendarList days={style.calendarDays} />
      </section>

      <section className="print-page-break mt-12">
        <h2 className="font-serif text-2xl font-semibold text-dark">
          {style.styleLabel} products
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {style.products.map((pick) => (
            <ProductCard
              key={pick.category}
              pick={pick}
              curlType={data.curlType}
              porosity={data.porosity}
              budgetRange={data.budgetRange}
              colorTreated={data.colorTreated === "yes"}
            />
          ))}
        </div>

        {style.accessories.length > 0 && (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {style.accessories.map((accessory) => (
              <div key={accessory.label} className="rounded-xl border border-bronze/30 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-bronze2">
                  Accessory
                </p>
                <p className="mt-3 font-serif text-lg text-dark">{accessory.label}</p>
                <p className="mt-1 text-sm text-dark/70">{accessory.note}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

// ---- Horizontal-swipe redesign (hero/upcoming/steps/products/calendar) --
// Purely presentational - no change to how routine data is computed or
// what functionality exists, per the request. sectionsForWashType/
// todayLabelForWashType (above) and WashCalendarGrid (below) are reused
// as-is; only the surrounding layout/markup is new.

function washDayKeyForType(type: WashDayType): WashDayKey {
  if (type === "chelate" || type === "clarify") return "clarifying";
  if (type === "protein") return "protein";
  if (type === "refresh") return "between";
  return "regular";
}

const WASH_PILL_LABEL: Record<WashDayType, string> = {
  chelate: "chelating wash",
  clarify: "chelating wash",
  wash: "regular wash",
  protein: "protein treatment",
  refresh: "refresh day",
};

function formatCheckOffTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// CSS-only confetti - a handful of bronze dots scattering outward from
// the button and fading, no animation library. Each dot's travel vector
// is set via CSS custom properties consumed by the .routine-confetti-dot
// keyframe in globals.css.
const CONFETTI_VECTORS = [
  { x: -34, y: -22 }, { x: 26, y: -30 }, { x: -14, y: -38 }, { x: 38, y: -8 },
  { x: -38, y: 6 }, { x: 16, y: -42 }, { x: 2, y: -46 }, { x: -22, y: -10 },
];
function ConfettiBurst() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {CONFETTI_VECTORS.map((v, i) => (
        <span
          key={i}
          className="routine-confetti-dot absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-bronze"
          style={{ "--dx": `${v.x}px`, "--dy": `${v.y}px`, animationDelay: `${i * 20}ms` } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

// The check-off control itself - idle "Mark today as complete" button,
// a saving state, a completed badge with time + undo, and the confetti
// burst on a fresh completion. washType is null on a genuine rest day
// (no calendarDays entry for today), in which case there's nothing to
// check off at all.
function TodayCheckOffButton({
  userId,
  todayIso,
  washType,
  todayCompletion,
  onChanged,
}: {
  userId: string;
  todayIso: string;
  washType: string | null;
  todayCompletion: { washType: string; completedAt: string; notes: string | null } | null;
  onChanged: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Optimistic local mirror of todayCompletion - flips instantly on tap
  // rather than waiting on onChanged's round trip through /api/routine,
  // per "Button immediately changes to filled state."
  const [localCompletedAt, setLocalCompletedAt] = useState<string | null>(
    todayCompletion?.completedAt ?? null
  );

  useEffect(() => {
    setLocalCompletedAt(todayCompletion?.completedAt ?? null);
  }, [todayCompletion]);

  if (!washType) return null;

  async function handleCheckOff() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/routine/check-off", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ user_id: userId, completed_date: todayIso, wash_type: washType }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Couldn't save. Please try again.");
        return;
      }
      setLocalCompletedAt(json.completedAt);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 900);
      onChanged();
    } catch {
      setError("Couldn't save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUndo() {
    setUndoing(true);
    try {
      await fetch(
        `/api/routine/check-off?user_id=${userId}&completed_date=${todayIso}`,
        { method: "DELETE" }
      );
      setLocalCompletedAt(null);
      onChanged();
    } finally {
      setUndoing(false);
    }
  }

  if (localCompletedAt) {
    return (
      <div className="relative mt-5">
        <div className="flex min-h-[44px] w-full flex-col justify-center gap-1 bg-dark px-4 py-2.5">
          <div className="flex w-full items-center justify-between">
            <span
              className="font-sans text-[12px] font-medium lowercase text-white"
              style={{ letterSpacing: "0.04em" }}
            >
              completed today ✓
            </span>
            <button
              type="button"
              onClick={handleUndo}
              disabled={undoing}
              className="font-mono text-[9px] text-white/60 underline underline-offset-2 hover:text-white disabled:opacity-50"
            >
              {undoing ? "…" : "undo"}
            </button>
          </div>
          <p className="w-full font-mono text-[9px]" style={{ color: "rgba(255,255,255,0.5)" }}>
            completed at {formatCheckOffTime(localCompletedAt)}
          </p>
        </div>
        {showConfetti && <ConfettiBurst />}
      </div>
    );
  }

  return (
    <div className="relative mt-5">
      <button
        type="button"
        onClick={handleCheckOff}
        disabled={saving}
        className="flex h-11 w-full items-center justify-center border border-dark bg-white font-sans text-[12px] font-medium lowercase text-dark transition-colors hover:bg-[#f5f5f5] disabled:opacity-60"
        style={{ letterSpacing: "0.04em" }}
      >
        {saving ? "saving…" : "mark today as complete →"}
      </button>
      {error && <p className="mt-1.5 text-xs text-red">{error}</p>}
    </div>
  );
}

// Hero's wash-type badge colors - wash day black/white, refresh day
// white/black-border, protein green, chelating amber. Streak now lives
// only in RoutineTopBar above (Part 1), not duplicated here.
function heroBadgeClass(type: WashDayType): string {
  if (type === "chelate" || type === "clarify") return "bg-[#C4831A] text-white";
  if (type === "protein") return "bg-green text-white";
  if (type === "refresh") return "bg-white text-dark border border-dark";
  return "bg-dark text-white"; // wash
}

// SECTION 1 - Hero: curl type, porosity/city, today's wash-type badge,
// and the check-off button. Full-width, not scrollable.
function HeroSection({
  data,
  cityLabel,
  userId,
  onChanged,
}: {
  data: RoutineData;
  cityLabel: string | null;
  userId: string;
  onChanged: () => void;
}) {
  const showCurl = Boolean(data.curlType && data.curlType !== "not_sure");
  const porosityLabel = data.porosity && data.porosity !== "not sure" ? `${data.porosity} porosity` : null;
  const subline = [porosityLabel, cityLabel].filter(Boolean).join(" · ");
  // Every day now has a calendarDays entry (wash or refresh - see
  // lib/routineCalendar.ts), so this is never undefined anymore. Curl
  // type/porosity/streak (left side + bottom of the right side) stay
  // exactly as they were; only the pill above the streak changes, from a
  // small wash-type label to a real heading with step count/duration -
  // "today" only, never affected by tapping a different day elsewhere on
  // the page (see selectedIso in StepsSection/ProductsSection below).
  const todayWash = data.calendarDays.find((d) => d.date === data.todayIso) as WashDay;
  const todaySteps = getStepsForDay(data, todayWash);
  const todayMinutes = getMinutesForDay(todaySteps, todayWash);

  return (
    <div id="today" className="w-full border-b border-dark bg-white px-4 pt-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-[64px] font-bold leading-none text-dark" style={{ letterSpacing: "-3px" }}>
            {showCurl ? data.curlType : "—"}
          </p>
          <p className="mt-2 font-mono text-[9px] tracking-[0.06em] text-muted">{subline || "your hair"}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end pt-1 text-right">
          <span
            className={`whitespace-nowrap px-3 py-[5px] font-mono text-[9px] lowercase tracking-wide ${heroBadgeClass(
              todayWash.washType
            )}`}
          >
            {WASH_PILL_LABEL[todayWash.washType]}
          </span>
          <p className="mt-1.5 whitespace-nowrap font-mono text-[9px] text-muted">
            {todaySteps.length} steps · est. {todayMinutes} min
          </p>
        </div>
      </div>

      <TodayCheckOffButton
        userId={userId}
        todayIso={data.todayIso}
        washType={todayWash.washType}
        todayCompletion={data.todayCompletion}
        onChanged={onChanged}
      />
    </div>
  );
}

// ---- Routine interaction flags (lib/routineInteractions.ts, computed in
// /api/routine) ----------------------------------------------------------

const FLAG_DISMISS_KEY_PREFIX = "routine_flag_dismissed:";
const FLAG_DISMISS_MS = 7 * 24 * 60 * 60 * 1000;
const FLAG_BODY_COLLAPSIBLE_OVER = 80;

const FLAG_COLORS: Record<RoutineFlag["type"], { border: string; dot: string; title: string }> = {
  warning: { border: "#B03030", dot: "#B03030", title: "#0a0a0a" },
  tip: { border: "#C4831A", dot: "#C4831A", title: "#0a0a0a" },
  positive: { border: "#2D7A3D", dot: "#2D7A3D", title: "#2D7A3D" },
};

// Dismissal is per flag title (one entry per flag type), for 7 days.
// Reads and writes are wrapped - storage can be blocked (private windows).
function isFlagDismissed(title: string): boolean {
  try {
    const raw = localStorage.getItem(FLAG_DISMISS_KEY_PREFIX + title);
    return raw !== null && Date.now() - Number(raw) < FLAG_DISMISS_MS;
  } catch {
    return false;
  }
}

function markFlagDismissed(title: string): void {
  try {
    localStorage.setItem(FLAG_DISMISS_KEY_PREFIX + title, String(Date.now()));
  } catch {
    // Dismissed for this session only if storage is unavailable.
  }
}

function RoutineFlagsSection({ flags, userId }: { flags: RoutineFlag[]; userId: string }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setDismissed(new Set(flags.filter((f) => isFlagDismissed(f.title)).map((f) => f.title)));
    setHydrated(true);
  }, [flags]);

  // Rendered only after localStorage is read, so a dismissed flag never
  // flashes on screen before it hides.
  const visible = flags.filter((f) => !dismissed.has(f.title));
  if (!hydrated || visible.length === 0) return null;

  function toggleCollapsed(flag: RoutineFlag) {
    if (flag.body.length <= FLAG_BODY_COLLAPSIBLE_OVER) return;
    const wasCollapsed = collapsed.has(flag.title);
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(flag.title)) next.delete(flag.title);
      else next.add(flag.title);
      return next;
    });
    if (wasCollapsed) {
      logMlEvent("routine_flag_read", {
        userId,
        metadata: { flag_title: flag.title, flag_type: flag.type },
      });
    }
  }

  function dismiss(flag: RoutineFlag) {
    markFlagDismissed(flag.title);
    setDismissed((prev) => new Set(prev).add(flag.title));
    logMlEvent("routine_flag_dismissed", { userId, metadata: { flag_title: flag.title } });
  }

  return (
    <section id="routine-flags" className="print-hide w-full border-b border-dark bg-white px-5 py-6">
      <p className="mb-3 font-mono text-[9px] lowercase text-[#888]" style={{ letterSpacing: "0.1em" }}>
        routine analysis
      </p>

      {visible.map((flag) => {
        const colors = FLAG_COLORS[flag.type];
        const isCollapsed = collapsed.has(flag.title);
        const collapsible = flag.body.length > FLAG_BODY_COLLAPSIBLE_OVER;
        return (
          <div
            key={flag.title}
            className="relative mb-1.5 border border-[#e8e8e8] bg-white py-3.5 pl-4 pr-9"
            style={{ borderLeft: `3px solid ${colors.border}` }}
          >
            <button
              type="button"
              onClick={() => toggleCollapsed(flag)}
              disabled={!collapsible}
              aria-expanded={collapsible ? !isCollapsed : undefined}
              className="block w-full text-left disabled:cursor-default"
            >
              <span className="flex items-center gap-2">
                <span className="h-[5px] w-[5px] shrink-0 rounded-full" style={{ background: colors.dot }} />
                <span className="font-sans text-[13px] font-medium lowercase" style={{ color: colors.title }}>
                  {flag.title}
                </span>
              </span>
              {!isCollapsed && (
                <span className="mt-1 block font-sans font-light text-[#666]" style={{ fontSize: "12px", lineHeight: "1.65" }}>
                  {flag.body}
                </span>
              )}
            </button>
            {!isCollapsed && flag.affected_products && flag.affected_products.length > 0 && (
              <p className="mt-1.5 font-mono text-[9px] text-[#888]">
                affects: {flag.affected_products.join(" · ")}
              </p>
            )}
            <button
              type="button"
              onClick={() => dismiss(flag)}
              aria-label={`dismiss ${flag.title}`}
              className="absolute right-2 top-2 font-mono text-[10px] text-[#ccc] hover:text-dark"
            >
              ×
            </button>
          </div>
        );
      })}
    </section>
  );
}

// "how it works with your other products" - the per-product slice of the
// routine flags, shown under "why picked" (see CompactProductCard).
function ProductInteractionNote({ flags, productName }: { flags: RoutineFlag[]; productName: string }) {
  const relevant = flags.filter((f) => f.affected_products?.includes(productName));
  return (
    <div>
      <p className="mb-1 font-mono text-[9px] lowercase text-[#888]" style={{ marginTop: "12px", letterSpacing: "0.1em" }}>
        how it works with your other products
      </p>
      {relevant.length === 0 ? (
        <p className="font-sans text-xs font-light text-[#888]">no interactions detected with your other routine products</p>
      ) : (
        relevant.map((f) => (
          <p key={f.title} className="mt-1 font-sans text-xs leading-relaxed" style={{ color: FLAG_COLORS[f.type].dot }}>
            {f.body}
          </p>
        ))
      )}
    </div>
  );
}

// Wash-day application order, and the refresh-day subset. Only categories
// the user actually has a pick for are shown (see buildSequenceChips).
const WASH_SEQUENCE = [
  "pre-shampoo",
  "clarifying-shampoo",
  "shampoo",
  "co-wash",
  "conditioner",
  "deep-conditioner",
  "protein-treatment",
  "leave-in",
  "curl-cream",
  "styler",
  "oil",
  "gel",
];
const REFRESH_SEQUENCE = ["leave-in", "styler", "oil"];
const DAILY_SEQUENCE_KEY: Record<string, string> = {
  "daily-leave-in": "leave-in",
  "daily-sealant": "oil",
  "daily-styling": "styler",
};

function buildSequenceChips(picks: (ProductPick | DailyProductPick)[], refreshDay: boolean): string[] {
  const present = new Set(
    picks
      .filter((p) => p.primary && !p.noProductsYet)
      .map((p) => DAILY_SEQUENCE_KEY[p.category] ?? p.category)
  );
  return (refreshDay ? REFRESH_SEQUENCE : WASH_SEQUENCE).filter((key) => present.has(key));
}

function SequenceStrip({ chips }: { chips: string[] }) {
  // A single chip isn't a sequence.
  if (chips.length < 2) return null;
  return (
    <div className="px-4 pb-4">
      <p className="font-mono text-[9px] lowercase text-[#888]" style={{ letterSpacing: "0.1em" }}>
        apply in this order
      </p>
      <div className="no-scrollbar mt-2 flex items-center gap-1.5 overflow-x-auto">
        {chips.map((chip, i) => (
          <span key={chip} className="flex shrink-0 items-center gap-1.5">
            {i > 0 && <span className="font-mono text-[8px] text-[#ccc]">→</span>}
            <span className="whitespace-nowrap border border-[#e8e8e8] px-2.5 py-1 font-mono text-[8px] lowercase text-dark">
              {chip}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

// SECTION 2 - Upcoming: a horizontal row of every date in the 30-day
// wash calendar from 7 days ago through the end of the window, each
// carrying today/completed/missed state derived entirely from existing
// calendarDays/todayIso/missedDates - no new data needed.
function dayCompletionState(
  day: WashDay,
  todayIso: string,
  missedDates: string[]
): "today" | "completed" | "missed" | "future" {
  if (day.date === todayIso) return "today";
  if (day.date < todayIso) return missedDates.includes(day.date) ? "missed" : "completed";
  return "future";
}

// Wash indicator dot colors (Part 4) - regular wash filled black, refresh
// outlined gray, protein filled green, chelating filled amber. A
// completed day replaces this dot with a small green checkmark instead
// (handled in UpcomingDayCard directly, not here).
function washDotClass(type: WashDayType): string {
  if (type === "chelate" || type === "clarify") return "bg-[#C4831A]";
  if (type === "protein") return "bg-green";
  if (type === "refresh") return "border border-[#e8e8e8] bg-transparent";
  return "bg-dark";
}

function UpcomingDayCard({
  day,
  state,
  isSelected,
  onSelect,
}: {
  day: WashDay;
  state: "today" | "completed" | "missed" | "future";
  isSelected: boolean;
  onSelect: (iso: string) => void;
}) {
  const d = new Date(`${day.date}T00:00:00`);
  const dayName = d.toLocaleDateString("en-US", { weekday: "short" }).toLowerCase();
  const dateNum = d.getDate();
  const isToday = state === "today";
  const isCompleted = state === "completed";
  const isMissed = state === "missed";
  const isDark = isToday || isSelected;

  return (
    <button
      type="button"
      onClick={() => onSelect(day.date)}
      className={`relative flex w-[60px] shrink-0 flex-col items-center border px-1.5 py-2 text-center ${
        isToday ? "border-2 border-dark bg-dark" : isSelected ? "border-dark bg-dark" : "border-[#e8e8e8] bg-white"
      }`}
    >
      <span className={`font-mono text-[7px] lowercase ${isDark ? "text-[#666]" : "text-muted"}`}>{dayName}</span>
      <span
        className={`mt-0.5 font-mono text-[20px] font-bold leading-none ${
          isDark ? "text-white" : isCompleted ? "text-muted" : "text-dark"
        }`}
        style={{ marginBottom: "6px" }}
      >
        {dateNum}
      </span>
      {isCompleted ? (
        <span className={`font-mono text-[8px] ${isDark ? "text-white" : "text-green"}`}>✓</span>
      ) : (
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            isDark ? (day.washType === "refresh" ? "border border-white" : "bg-white") : washDotClass(day.washType)
          }`}
        />
      )}
      {isMissed && <span className="absolute bottom-1 right-1 h-1 w-1 rounded-full bg-[#C4831A]" />}
    </button>
  );
}

function UpcomingSection({
  data,
  onViewCalendar,
  selectedIso,
  onSelect,
}: {
  data: RoutineData;
  onViewCalendar: () => void;
  selectedIso: string;
  onSelect: (iso: string) => void;
}) {
  const todayDate = new Date(`${data.todayIso}T00:00:00`);
  const cutoffIso = toIsoLocal(addDays(todayDate, -7));
  const visibleDays = data.calendarDays.filter((d) => d.date >= cutoffIso);

  return (
    <div id="upcoming" className="w-full border-b border-dark bg-white">
      <div className="flex items-center justify-between px-4 pb-2.5 pt-5">
        <span className="font-mono text-[9px] lowercase text-muted">upcoming</span>
        <button type="button" onClick={onViewCalendar} className="font-mono text-[8px] lowercase text-[#bbb]">
          view full calendar ↓
        </button>
      </div>
      {visibleDays.length > 0 ? (
        <div className="no-scrollbar flex gap-[6px] overflow-x-auto px-4 pb-4">
          {visibleDays.map((day) => (
            <UpcomingDayCard
              key={day.date}
              day={day}
              state={dayCompletionState(day, data.todayIso, data.missedDates)}
              isSelected={day.date === selectedIso}
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : (
        <p className="px-5 pb-4 pt-3 font-sans text-[13px] text-dark/60">No wash days in this window.</p>
      )}
    </div>
  );
}

// Editorial image break (Parts 5 and 8) - pulls a real visual_library
// image via the same public bridge MasonryFeed.tsx already uses
// (getFallbackImage can't be called directly from a "use client" file -
// it needs the service role). Cleanly renders nothing if no image comes
// back, rather than an empty placeholder box.
function EditorialImageBreak({
  heightPx,
  hairTypes,
  category,
  label,
}: {
  heightPx: number;
  hairTypes: string[];
  category: string;
  label: string;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const hairTypesKey = hairTypes.join(",");

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ category });
    if (hairTypesKey) params.set("hair_types", hairTypesKey);
    fetch(`/api/visual-library/fallback?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) setImageUrl(json.url ?? null);
      })
      .catch(() => {
        if (!cancelled) setImageUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [category, hairTypesKey]);

  if (!imageUrl) return null;

  return (
    <div className="relative w-full overflow-hidden border-y border-dark" style={{ height: heightPx }}>
      <Image src={imageUrl} alt="" fill sizes="100vw" className="object-cover" />
      <div className="absolute inset-x-0 bottom-0 border-t-[1.5px] border-dark bg-white px-4 py-2">
        <p className="font-mono text-[9px] lowercase tracking-[0.08em] text-dark">{label}</p>
      </div>
    </div>
  );
}

// SECTION 3 - Steps: one horizontally scrollable, scroll-snapping card
// per step of today's wash-day sequence (reusing stepsByWashType exactly
// as computed server-side), plus any additionalNotes appended as trailing
// cards so that content isn't lost by the restructure.
// Fuzzy title match against the step-type icon set (Part 7) - steps are
// generated copy, not a fixed enum, so there's no productCategory-style
// exact key to switch on; a generic dot covers anything that doesn't
// match one of the known step types.
function stepIcon(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("pre-shampoo") || t.includes("pre shampoo")) return "◐";
  if (t.includes("shampoo")) return "🚿";
  if (t.includes("deep condition")) return "⬡";
  if (t.includes("condition")) return "○";
  if (t.includes("detangle")) return "⟠";
  if (t.includes("moisturize")) return "💧";
  if (t.includes("seal")) return "✦";
  if (t.includes("scalp")) return "◎";
  if (t.includes("style") || t.includes("styling")) return "◈";
  if (t.includes("protect")) return "🌙";
  return "•";
}

function StepCard({
  step,
  index,
  total,
  products,
  onViewProduct,
  onViewTool,
}: {
  step: {
    title: string;
    body: string;
    why: string | null;
    timerMinutes: string | null;
    productCategory: string | null;
    toolIds?: string[] | null;
  };
  index: number;
  total: number;
  products: (ProductPick | DailyProductPick)[];
  onViewProduct: () => void;
  onViewTool: (toolId: string) => void;
}) {
  const [showWhy, setShowWhy] = useState(false);
  const pick = step.productCategory ? products.find((p) => p.category === step.productCategory) ?? null : null;
  const primary = pick?.primary ?? null;
  const tools = (step.toolIds ?? []).map(findTool).filter((t): t is HairTool => Boolean(t));

  return (
    <div
      className="flex min-h-[200px] w-[calc(100vw-48px)] max-w-[340px] shrink-0 flex-col border-r border-dark bg-white p-5"
      style={{ scrollSnapAlign: "start" }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex h-8 w-8 items-center justify-center border border-dark text-sm">{stepIcon(step.title)}</div>
        <span className="font-mono text-[8px] tracking-wide text-[#bbb]">
          step {String(index + 1).padStart(2, "0")} of {String(total).padStart(2, "0")}
        </span>
      </div>
      <p className="mt-2 font-sans text-sm font-semibold lowercase text-dark" style={{ letterSpacing: "-0.3px" }}>
        {step.title}
      </p>
      <p className="mt-2 flex-1 font-sans text-xs font-light leading-[1.7] text-[#666]">{step.body}</p>

      <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-[#f0f0f0] pt-2.5">
        {step.why ? (
          <button
            type="button"
            onClick={() => setShowWhy((v) => !v)}
            className="font-mono text-[8px] tracking-wide text-[#bbb]"
          >
            why this matters →
          </button>
        ) : (
          <span />
        )}
        {step.timerMinutes && (
          <span className="bg-[#f5f5f5] px-2 py-[3px] font-mono text-[8px] text-muted">⏱ {step.timerMinutes}</span>
        )}
      </div>
      {showWhy && step.why && (
        <p className="mt-2 border-l-2 border-dark bg-[#f5f5f5] px-2.5 py-1.5 text-xs italic leading-relaxed text-[#444]">
          {step.why}
        </p>
      )}

      {tools.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {tools.map((tool) => (
            <button
              key={tool.id}
              type="button"
              onClick={() => onViewTool(tool.id)}
              className="border border-dark bg-white px-2 py-1 font-mono text-[9px] lowercase text-dark"
            >
              {tool.name.toLowerCase()} →
            </button>
          ))}
        </div>
      )}

      {primary && (
        <button
          type="button"
          onClick={onViewProduct}
          className="mt-2 flex w-full items-center justify-between border border-[#e8e8e8] px-2.5 py-1.5 font-mono text-[8px] lowercase text-muted"
        >
          <span>{primary.productName.length > 20 ? `${primary.productName.slice(0, 20)}…` : primary.productName}</span>
          <span>→</span>
        </button>
      )}
    </div>
  );
}

// Shared chapter-heading treatment for Steps/Products/Tools (Parts 6, 9,
// 11) - the "flat text label" headers these three sections used before
// are replaced by this everywhere; Upcoming/Calendar keep their own
// simpler label rows (never given a chapter number by the request).
function ChapterHeading({ number, title, sub }: { number: string; title: string; sub: string }) {
  return (
    <div className="px-4 pt-7">
      <p className="font-mono text-[9px] tracking-[0.14em] text-[#ccc]" style={{ marginBottom: "4px" }}>
        {number}
      </p>
      <h2
        className="font-sans font-bold lowercase leading-none text-dark"
        style={{ fontSize: "clamp(22px, 6vw, 28px)", letterSpacing: "-1px", marginBottom: "4px" }}
      >
        {title}
      </h2>
      <p className="font-mono text-[9px] tracking-wide text-muted" style={{ marginBottom: "20px" }}>
        {sub}
      </p>
    </div>
  );
}

function StepsSection({
  data,
  onViewTool,
  selectedIso,
}: {
  data: RoutineData;
  onViewTool: (toolId: string) => void;
  selectedIso: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  // Every date in the 30-day window now has a calendarDays entry (see
  // lib/routineCalendar.ts), so selectedWash is only undefined if
  // selectedIso somehow falls outside that window - defensive, not
  // expected in practice since selectedIso only ever comes from tapping
  // a real calendar/upcoming cell.
  const selectedWash = data.calendarDays.find((d) => d.date === selectedIso);
  const steps = selectedWash ? getStepsForDay(data, selectedWash) : [];
  // Additional profile-level notes (age/thinning/color-treated/extension
  // care) apply regardless of which day is selected, same as before.
  const total = steps.length + data.additionalNotes.length;
  const productsForDay = selectedWash ? getProductsForDay(data, selectedWash) : [];
  // Wash-day steps link to their "deep-conditioner" category; when a
  // hair mask is standing in as that day's conditioning step (no deep
  // conditioner shown that day), point that step's product link at it.
  const productsForSteps = productsForDay.some((p) => p.category === "deep-conditioner")
    ? productsForDay
    : productsForDay.map((p) => (p.category === "hair-mask" ? { ...p, category: "deep-conditioner" } : p));
  const dayState = selectedWash ? dayCompletionState(selectedWash, data.todayIso, data.missedDates) : "today";

  function handleScroll() {
    const el = scrollerRef.current;
    if (!el) return;
    const containerLeft = el.getBoundingClientRect().left;
    let closest = 0;
    let closestDist = Infinity;
    Array.from(el.children).forEach((child, i) => {
      const dist = Math.abs(child.getBoundingClientRect().left - containerLeft);
      if (dist < closestDist) {
        closestDist = dist;
        closest = i;
      }
    });
    setCurrent(closest);
  }

  function scrollToProducts() {
    document.getElementById("products")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (!selectedWash) {
    return (
      <div id="steps" className="w-full border-b border-dark bg-white px-5 py-6">
        <span className="font-mono text-[10px] lowercase text-muted">routine</span>
        <p className="mt-2 font-sans text-[13px] text-[#444]">No routine data for this date.</p>
      </div>
    );
  }

  const minutes = getMinutesForDay(steps, selectedWash);
  const porosityLabel = data.porosity && data.porosity !== "not sure" ? `${data.porosity} porosity` : null;
  const curlLabel = data.curlType && data.curlType !== "not_sure" ? data.curlType : null;

  return (
    <>
      <EditorialImageBreak
        heightPx={160}
        hairTypes={curlLabel ? [curlLabel] : []}
        category="lifestyle"
        label={`today's steps · ${washTypeShortLabel(selectedWash.washType)}${
          curlLabel ? ` · ${curlLabel}${porosityLabel ? ` ${porosityLabel}` : ""}` : ""
        }`}
      />
      <div id="steps" className="w-full border-b border-dark bg-white">
        <ChapterHeading
          number="01 · steps"
          title="today's routine"
          sub={`${washTypeShortLabel(selectedWash.washType)} · ${total} step${total === 1 ? "" : "s"} · est. ${minutes} min`}
        />
        <div className="-mt-5 flex items-center gap-2 px-4 pb-2">
          <span className="font-mono text-[9px] lowercase text-[#bbb]">
            {dayHeaderLabel(selectedIso, selectedWash.washType)}
          </span>
          {dayState === "completed" && (
            <span className="rounded-full bg-dark px-1.5 py-0.5 font-mono text-[8px] lowercase text-white">
              completed ✓
            </span>
          )}
          {dayState === "future" && (
            <span className="rounded-full border border-muted px-1.5 py-0.5 font-mono text-[8px] lowercase text-muted">
              upcoming
            </span>
          )}
        </div>
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="no-scrollbar step-scroll mt-1 flex gap-3 overflow-x-auto border-t border-dark px-4 pb-4 pt-4"
      >
        {steps.map((step, i) => (
          <StepCard
            key={step.title}
            step={step}
            index={i}
            total={total}
            products={productsForSteps}
            onViewProduct={scrollToProducts}
            onViewTool={onViewTool}
          />
        ))}
        {data.additionalNotes.map((note, i) => (
          <StepCard
            key={note.title}
            step={{ title: note.title, body: note.body, why: note.why, timerMinutes: null, productCategory: null, toolIds: null }}
            index={steps.length + i}
            total={total}
            products={productsForSteps}
            onViewProduct={scrollToProducts}
            onViewTool={onViewTool}
          />
        ))}
      </div>
      {total > 0 && (
        <div className="flex flex-col items-center gap-2 border-b border-[#e8e8e8] px-4 py-2.5">
          <div className="flex gap-1">
            {Array.from({ length: total }).map((_, i) => (
              <span
                key={i}
                className="h-1 w-1 rounded-full transition-transform"
                style={
                  i === current
                    ? { background: "#0a0a0a", transform: "scale(1.3)" }
                    : { background: "#e8e8e8" }
                }
              />
            ))}
          </div>
          <p className="font-mono text-[9px] text-muted">
            step {current + 1} of {total}
          </p>
        </div>
      )}
      </div>
    </>
  );
}

// SECTION 4 - Products: today's wash-type-relevant picks (reusing
// sectionsForWashType exactly as TodayProducts used to), as compact
// horizontal cards, plus a collapsed "see all products" list that
// reuses the existing full-detail ProductCard/SectionDivider and folds
// in the brand-products/avoid-ingredients blocks that used to live in
// the always-visible product section.
function isDailyPick(pick: ProductPick | DailyProductPick): pick is DailyProductPick {
  return "dailyLabel" in pick;
}

// Top color bar (Part 10) - keyed on the same RoutineSection the rest of
// the page already colors by (SECTION_META/CalendarLegend above), not a
// new parallel category system.
function productTopBarClass(section: RoutineSection): string {
  if (section === "clarify") return "bg-[#C4831A]"; // chelating product
  if (section === "protein") return "bg-green"; // protein treatment product
  if (section === "between") return "bg-[#888888]"; // refresh day product
  if (section === "styling") return "bg-[#e8e8e8]"; // every wash product
  return "bg-[#0a0a0a]"; // regular wash day product
}

// Weight tag (Part 10) - a simpler scheme than WEIGHT_PILL_CLASSES' full
// 5-tier color set: lightweight/medium are unstyled text, heavy/very_heavy
// get a plain border, and a hair-mask's "Intensive treatment" label gets
// the one accent color.
function weightTagClass(weight: ProductWeight, categorySlug?: string | null): string {
  const isIntensive = categorySlug === "hair-mask" && (weight === "heavy" || weight === "very_heavy");
  if (isIntensive) return "border border-[#C4831A] text-[#C4831A]";
  if (weight === "heavy" || weight === "very_heavy") return "border border-[#888] text-muted";
  return "text-muted";
}

function CompactProductCard({
  pick,
  note,
  flags,
}: {
  pick: ProductPick | DailyProductPick;
  note?: string;
  flags: RoutineFlag[];
}) {
  const [showWhy, setShowWhy] = useState(false);
  const { primary } = pick;
  const daily = isDailyPick(pick) ? pick : null;
  const headerLabel = daily?.dailyLabel ?? pick.categoryLabel;
  const isHairspray = pick.category === "hairspray" || pick.category === "daily-hairspray";
  const shownNote = note ?? (isHairspray ? HAIRSPRAY_CARD_NOTE : undefined);

  if (pick.noProductsYet || !primary) {
    return (
      <div
        className="flex min-h-[140px] w-[calc(100vw-48px)] max-w-[340px] shrink-0 flex-col justify-between overflow-hidden border-r border-dark bg-white"
        style={{ scrollSnapAlign: "start" }}
      >
        <div className={`h-[3px] w-full ${productTopBarClass(pick.section)}`} />
        <div className="flex flex-1 flex-col justify-between p-4">
          <span className="font-mono text-[8px] lowercase tracking-[0.1em] text-muted">{headerLabel}</span>
          {daily ? (
            <p className="mt-3 font-sans text-sm text-dark/60">
              add a {pick.categoryLabel.toLowerCase()} to your routine to complete your daily refresh
            </p>
          ) : (
            <p className="mt-3 font-sans text-sm text-dark/60">No pick yet for this category.</p>
          )}
          <Link
            href={`/search?category=${encodeURIComponent(pick.searchCategorySlug)}`}
            className="mt-2 font-mono text-[9px] text-dark"
          >
            search catalog →
          </Link>
        </div>
      </div>
    );
  }

  const tier = scoreTier(primary.score);

  return (
    <div
      className="flex w-[calc(100vw-48px)] max-w-[340px] shrink-0 flex-col overflow-hidden border-r border-dark bg-white"
      style={{ scrollSnapAlign: "start" }}
    >
      <div className={`h-[3px] w-full ${productTopBarClass(pick.section)}`} />
      <div className="p-4">
        <span className="font-mono text-[8px] lowercase tracking-[0.1em] text-muted">{headerLabel}</span>
        <p
          className="mt-2 font-sans text-[15px] font-semibold lowercase text-dark"
          style={{ letterSpacing: "-0.4px", marginBottom: "2px" }}
        >
          {primary.productName}
        </p>
        <p className="font-mono text-[9px] text-muted" style={{ marginBottom: "12px" }}>
          {primary.brandName}
        </p>

        <div className="flex items-baseline gap-1">
          <span className={`text-[36px] leading-none ${TIER_CLASSES[tier]}`}>{primary.score}</span>
          <span className="font-mono text-xs text-[#bbb]">/ 100</span>
        </div>
        <p className="font-mono text-[8px] tracking-wide text-muted">your match</p>
        <span
          className={`mt-1.5 inline-block px-1.5 py-0.5 font-mono text-[8px] ${weightTagClass(
            primary.weight,
            pick.category
          )}`}
        >
          {weightPillLabel(primary.weight, pick.category)}
        </span>

        {/* Daily refresh picks always show their rationale inline (see
            the request's "always have something to show" for these 5
            categories) rather than hiding it behind the "why picked"
            toggle used for wash-day products. */}
        {daily && <p className="mt-2 text-xs leading-relaxed text-[#444]">{daily.dailyWhy}</p>}
        {shownNote && (
          <p className="mt-2 border-l-2 border-dark bg-[#f5f5f5] px-2.5 py-1.5 text-xs italic leading-relaxed text-[#444]">
            {shownNote}
          </p>
        )}
        {!daily && showWhy && <p className="mt-2 text-xs leading-relaxed text-[#444]">{primary.why}</p>}
        {!daily && showWhy && <ProductInteractionNote flags={flags} productName={primary.productName} />}

        <div className="mt-2.5 flex gap-2 border-t border-[#f0f0f0] pt-2.5">
          {!daily && (
            <button
              type="button"
              onClick={() => setShowWhy((v) => !v)}
              className="flex-1 border border-[#e8e8e8] bg-white px-1 py-[7px] font-mono text-[8px] lowercase tracking-wide text-muted"
            >
              why picked →
            </button>
          )}
          <ShopButton
            productName={primary.productName}
            brandName={primary.brandName}
            className={`flex items-center justify-center bg-dark px-1 py-[7px] font-mono text-[8px] lowercase tracking-wide text-white ${
              daily ? "w-full" : "flex-1"
            }`}
          />
        </div>
      </div>
    </div>
  );
}

function ProductsSection({ data, selectedIso }: { data: RoutineData; selectedIso: string }) {
  const [showAll, setShowAll] = useState(false);
  const selectedWash = data.calendarDays.find((d) => d.date === selectedIso);
  // Refresh days always have something to show (leave-in/sealant/styling
  // at minimum - see lib/routineProducts.ts's getDailyRefreshProducts),
  // so the "nothing needed" fallback below should be unreachable for
  // them in practice; kept as a defensive fallback for the same reason
  // as StepsSection's equivalent.
  const selectedPicks = selectedWash ? getProductsForDay(data, selectedWash) : [];
  const curlLabel = data.curlType && data.curlType !== "not_sure" ? data.curlType : null;
  const categoryList = selectedPicks.map((p) => (isDailyPick(p) ? p.dailyLabel : p.categoryLabel).toLowerCase()).join(" · ");

  return (
    <>
      <EditorialImageBreak
        heightPx={120}
        hairTypes={curlLabel ? [curlLabel] : []}
        category="product"
        label={`your products · today's ${selectedWash ? washTypeShortLabel(selectedWash.washType) : "routine"}`}
      />
      <div id="products" className="w-full border-b border-dark bg-white">
        <ChapterHeading number="02 · products" title="use today" sub={categoryList || "no products needed today"} />

        {selectedPicks.length > 0 ? (
          <div className="no-scrollbar product-scroll -mt-5 flex gap-3 overflow-x-auto border-t border-dark px-4 pb-4 pt-4">
          {selectedPicks.map((pick) => (
            <CompactProductCard
              key={pick.category}
              pick={pick}
              flags={data.routineFlags}
              note={
                pick.category === "hair-mask" && selectedPicks.every((p) => p.category !== "deep-conditioner") &&
                data.products.some((p) => p.category === "deep-conditioner" && !p.noProductsYet)
                  ? HAIR_MASK_TREATMENT_NOTE
                  : undefined
              }
            />
          ))}
          </div>
        ) : (
          <p className="border-t border-dark px-4 pb-4 pt-3 font-sans text-[13px] text-dark/60">
            No wash products needed today.
          </p>
        )}

        {selectedPicks.length > 0 && (
          <SequenceStrip chips={buildSequenceChips(selectedPicks, selectedWash?.washType === "refresh")} />
        )}

        <div className="px-4 pb-4">
          <button type="button" onClick={() => setShowAll((v) => !v)} className="font-mono text-[10px] lowercase text-muted">
            {showAll ? "hide all products ↑" : "see all products ↓"}
          </button>
        </div>

      <Collapse show={showAll}>
        <div className="px-5 pb-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {SECTION_ORDER.map((section) => {
              const picks = data.products.filter((pick) => pick.section === section);
              if (picks.length === 0) return null;
              return (
                <div key={section} className="col-span-full grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <SectionDivider section={section} />
                  {picks.map((pick) => (
                    <ProductCard
                      key={pick.category}
                      pick={pick}
                      curlType={data.curlType}
                      porosity={data.porosity}
                      budgetRange={data.budgetRange}
                      colorTreated={data.colorTreated === "yes"}
                    />
                  ))}
                </div>
              );
            })}
          </div>

          {data.brandProducts.length > 0 && (
            <div className="mt-8">
              <h3 className="font-serif text-xl font-semibold text-dark">From Qoyl partner brands</h3>
              <p className="mt-1 text-sm text-dark/70">
                Recommended by Qoyl partner brands for your{" "}
                {data.curlType && data.curlType !== "not_sure" ? data.curlType : ""} hair:
              </p>
              <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {data.brandProducts.map((item) => (
                  <li key={item.id} className="rounded-lg border border-[#B08D57]/50 bg-cream/5 px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-serif text-lg text-dark">{item.name}</p>
                      {item.priceUsd != null && (
                        <span className="shrink-0 text-sm font-semibold text-bronze">${item.priceUsd}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted">{item.brandName}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {item.isFeatured && (
                        <span className="rounded-full border border-[#B08D57] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#B08D57]">
                          Qoyl Partner Brand
                        </span>
                      )}
                      {item.score != null && (
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${TIER_CLASSES[scoreTier(item.score)]}`}>
                          {item.score}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3">
                      <a
                        href={`/api/brand-products/click/${item.id}?via=brand`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-bronze2 underline underline-offset-2 hover:text-dark"
                      >
                        Shop at {item.brandName} →
                      </a>
                      {item.shopperUrl && (
                        <a
                          href={`/api/brand-products/click/${item.id}?via=shopper`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-bronze2 underline underline-offset-2 hover:text-dark"
                        >
                          Shop at Shopper →
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.avoidIngredients.length > 0 && (
            <div className="mt-8">
              <h3 className="font-serif text-xl font-semibold text-dark">Ingredients to avoid for your profile</h3>
              {data.profileFor === "baby" && (
                <p className="mt-1 text-sm text-dark/70">
                  Extra caution for an infant profile - these are flagged more broadly than for an adult profile.
                </p>
              )}
              <ul className="mt-3 space-y-2">
                {data.avoidIngredients.map((ing) => (
                  <li
                    key={ing.ingredientName}
                    className={`rounded-lg border bg-red/5 px-4 py-3 ${
                      data.profileFor === "baby" ? "border-red/60" : "border-red/30"
                    }`}
                  >
                    <p className="text-sm font-medium text-red">🚩 {ing.ingredientName}</p>
                    {ing.reason && <p className="mt-1 text-xs text-dark/60">{ing.reason}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Link
            href="/how-we-score"
            className="print-hide mt-6 inline-block text-xs text-dark/50 underline underline-offset-2 hover:text-dark/70"
          >
            How is this score calculated? →
          </Link>
        </div>
      </Collapse>
      </div>
    </>
  );
}

// SECTION - Tools: hair-type-specific styling tools (lib/toolsData.ts),
// filtered by curl family via getToolsForProfile(). Essential tools show
// first as a horizontal scroll; recommended tools are collapsed behind a
// toggle in the same card format. Card anatomy mirrors CompactProductCard
// above (same dimensions/scroll-snap) so the two sections read as one
// family of cards. id={`tool-${tool.id}`} is the scroll/highlight target
// tapped tool chips in StepCard (above) jump to.
const TOOL_ICON: Record<string, string> = {
  accessories: "◆",
  application: "✦",
  detangling: "⟠",
  drying: "☼",
  heat: "▲",
  protective: "◉",
  styling: "◈",
};

// Priority label color (Part 11) - essential bold black, recommended
// gray, optional (unused by the current tool data, but a real HairTool
// priority value) lightest gray.
function toolPriorityClass(priority: string): string {
  if (priority === "essential") return "font-bold text-dark";
  if (priority === "recommended") return "text-[#888]";
  return "text-[#bbb]";
}

// Compact 110px card by default (Part 11) - tapping it expands inline to
// the full existing detail (description, why it matters/what to look
// for toggles, price, amazon link, avoid_if) rather than dropping any of
// that real tool data to fit the new compact exterior.
function RoutineToolCard({ tool, highlighted }: { tool: HairTool; highlighted: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [detailTab, setDetailTab] = useState<"why" | "lookFor" | null>(null);

  // A tool chip tapped from a StepCard scrolls here and highlights this
  // card briefly (see scrollToTool in RoutineContent) - auto-expanding it
  // too so that still actually shows the tool's detail, now that cards
  // are collapsed by default (Part 11), rather than just pointing at a
  // closed card.
  useEffect(() => {
    if (highlighted) setExpanded(true);
  }, [highlighted]);

  return (
    <div
      id={`tool-${tool.id}`}
      className={`shrink-0 bg-white transition-colors ${
        highlighted ? "border-2 border-dark bg-[#f5f5f5]" : "border border-dark"
      } ${expanded ? "w-[calc(100vw-48px)] max-w-[340px] p-5" : "w-[110px] p-3"}`}
      style={{ scrollSnapAlign: "start" }}
    >
      <button type="button" onClick={() => setExpanded((v) => !v)} className="block w-full text-left">
        <div className="flex h-8 w-8 items-center justify-center border border-[#e8e8e8] text-base" style={{ marginBottom: "8px" }}>
          {TOOL_ICON[tool.category] ?? "•"}
        </div>
        <p
          className="font-sans text-[11px] font-medium lowercase text-dark"
          style={{ letterSpacing: "-0.2px", marginBottom: "2px" }}
        >
          {tool.name}
        </p>
        <p className={`font-mono text-[7px] lowercase tracking-wide ${toolPriorityClass(tool.priority)}`}>
          {tool.priority}
        </p>
      </button>

      {expanded && (
        <div className="mt-3">
          <p className="font-sans text-[13px] font-light leading-[1.7] text-[#444]">{tool.description}</p>

          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setDetailTab((v) => (v === "why" ? null : "why"))}
              className="font-mono text-[9px] text-[#bbb]"
            >
              why it matters →
            </button>
            <button
              type="button"
              onClick={() => setDetailTab((v) => (v === "lookFor" ? null : "lookFor"))}
              className="font-mono text-[9px] text-[#bbb]"
            >
              what to look for →
            </button>
          </div>
          {detailTab && (
            <p className="mt-2 border-l-2 border-dark bg-[#f5f5f5] px-2.5 py-1.5 text-xs italic leading-relaxed text-[#444]">
              {detailTab === "why" ? tool.why_it_matters : tool.what_to_look_for}
            </p>
          )}

          <div className="mt-3 flex items-center justify-between">
            <span className="font-mono text-[13px] font-bold text-dark">{tool.price_range}</span>
            <a
              href={`https://www.amazon.com/s?k=${encodeURIComponent(tool.amazon_search)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[9px] text-muted"
            >
              shop on amazon →
            </a>
          </div>

          {tool.avoid_if && (
            <p className="mt-2 text-[11px] leading-relaxed text-amber">
              <span className="font-mono text-[8px] text-muted">note: </span>
              {tool.avoid_if}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ToolsSection({
  data,
  highlightedToolId,
  showRecommended,
  onToggleRecommended,
}: {
  data: RoutineData;
  highlightedToolId: string | null;
  showRecommended: boolean;
  onToggleRecommended: () => void;
}) {
  const hasExtensions = data.routineFocus === "extensions" || Boolean(data.protectiveStyle);
  const { essential, recommended } = getToolsForProfile({
    curlType: data.curlType,
    routineFocus: data.routineFocus,
    hasExtensions,
  });

  if (essential.length === 0 && recommended.length === 0) return null;

  return (
    <div id="tools" className="w-full border-b border-dark bg-white">
      <ChapterHeading number="03 · tools" title="your tools" sub="essential · recommended" />

      {essential.length > 0 && (
        <div className="no-scrollbar step-scroll -mt-5 flex gap-2 overflow-x-auto border-t border-dark px-4 pb-4 pt-4">
          {essential.map((tool) => (
            <RoutineToolCard key={tool.id} tool={tool} highlighted={tool.id === highlightedToolId} />
          ))}
        </div>
      )}

      {recommended.length > 0 && (
        <>
          <div className="px-4 pb-4">
            <button type="button" onClick={onToggleRecommended} className="font-mono text-[10px] lowercase text-muted">
              {showRecommended ? "hide recommended tools ↑" : "+ show recommended tools"}
            </button>
          </div>
          <Collapse show={showRecommended}>
            <div className="no-scrollbar step-scroll flex gap-2 overflow-x-auto px-4 pb-6">
              {recommended.map((tool) => (
                <RoutineToolCard key={tool.id} tool={tool} highlighted={tool.id === highlightedToolId} />
              ))}
            </div>
          </Collapse>
        </>
      )}
    </div>
  );
}

// SECTION 5 - Calendar: collapsed by default, wraps the existing
// WashCalendarGrid (month cells, legend, wash-day styling) exactly as
// already built - only the surrounding accordion shell is new.
function CalendarAccordionSection({
  data,
  family,
  expanded,
  onToggle,
  selectedIso,
  onSelect,
}: {
  data: RoutineData;
  family: CurlFamily | null;
  expanded: boolean;
  onToggle: () => void;
  selectedIso: string;
  onSelect: (iso: string) => void;
}) {
  const months = getMonthsInWindow(new Date(`${data.todayIso}T00:00:00`));
  const monthLabel = months.map((m) => m.label).join(" + ");

  return (
    <div id="calendar" className="w-full bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center justify-between gap-3 border-t border-dark px-4 py-4 text-left"
      >
        <div>
          <p className="font-mono text-[9px] lowercase text-muted">full 30-day calendar</p>
          <p className="mt-0.5 font-mono text-[9px] text-[#bbb]">{monthLabel}</p>
        </div>
        <span className="shrink-0 font-mono text-[9px] lowercase text-muted">{expanded ? "collapse ↑" : "expand ↓"}</span>
      </button>
      <Collapse show={expanded}>
        <div className="border-b border-dark bg-[#fafafa] px-4 py-4">
          <WashCalendarGrid
            calendarDays={data.calendarDays}
            todayIso={data.todayIso}
            completedIso={data.todayCompletion ? data.todayIso : null}
            missedDates={data.missedDates}
            family={family}
            selectedIso={selectedIso}
            onSelect={onSelect}
          />
        </div>
      </Collapse>
    </div>
  );
}

// Product card left-accent color, connecting the product list visually
// back to the calendar's color coding. Explicit category slugs match
// the request's literal examples; every other category falls back to
// its RoutineSection's color (regular/styling/between/clarify/protein).
// border-l-{color} (not border-{color}, which would also recolor the
// card's existing all-side border-bronze/30) so this only tints the
// left edge.
const CATEGORY_ACCENT_OVERRIDE: Record<string, string> = {
  "pre-shampoo": "border-l-4 border-l-amber",
  "clarifying-shampoo": "border-l-4 border-l-bronze",
  shampoo: "border-l-4 border-l-cream",
  "protein-treatment": "border-l-4 border-l-green",
  "deep-conditioner": "border-l-4 border-l-cream",
  "hair-mask": "border-l-4 border-l-cream",
  "leave-in": "border-l-4 border-l-[#9C8070]",
  styler: "",
};
const SECTION_ACCENT: Record<RoutineSection, string> = {
  clarify: "border-l-4 border-l-bronze",
  regular: "border-l-4 border-l-cream",
  protein: "border-l-4 border-l-green",
  between: "border-l-4 border-l-[#9C8070]",
  styling: "",
};
function productAccentClass(pick: ProductPick): string {
  return CATEGORY_ACCENT_OVERRIDE[pick.category] ?? SECTION_ACCENT[pick.section] ?? "";
}

const MINI_NAV_SECTIONS: { id: string; label: string }[] = [
  { id: "today", label: "today" },
  { id: "upcoming", label: "upcoming" },
  { id: "steps", label: "steps" },
  { id: "products", label: "products" },
  { id: "tools", label: "tools" },
  { id: "calendar", label: "calendar" },
];

// "my routine" + today's day/wash-type + streak - the page's own
// persistent header, separate from (and sitting above) the mini-nav
// below. Fixed height (h-12 = 48px) so the mini-nav's sticky top value
// has a real, exact number to stack under - same reasoning as other
// pages this session giving a nav bar an explicit height for a sibling's
// calc/sticky math to depend on.
function RoutineTopBar({ data }: { data: RoutineData }) {
  const todayWash = data.calendarDays.find((d) => d.date === data.todayIso) as WashDay;
  const weekday = new Date(`${data.todayIso}T00:00:00`)
    .toLocaleDateString("en-US", { weekday: "long" })
    .toLowerCase();

  return (
    <div className="print-hide sticky top-0 z-[95] flex h-12 w-full items-center justify-between border-b border-dark bg-white px-4">
      <div>
        <p className="font-sans text-[11px] font-bold lowercase text-dark" style={{ letterSpacing: "-0.3px" }}>
          my routine
        </p>
        <p className="font-mono text-[8px] tracking-wide text-muted">
          {weekday} · {washTypeShortLabel(todayWash.washType)}
        </p>
      </div>
      {data.streak >= 1 && <p className="font-mono text-[10px] font-bold text-dark">🔥 {data.streak}</p>}
    </div>
  );
}

// Sticky mini-nav, always visible right below RoutineTopBar (not gated
// on scroll position) - tracks which of the six sections is in view
// (scroll-spy via IntersectionObserver) and lets a tap jump straight to
// any of them.
function RoutineMiniNav() {
  const [active, setActive] = useState(MINI_NAV_SECTIONS[0].id);

  useEffect(() => {
    const targets = MINI_NAV_SECTIONS.map((s) => document.getElementById(s.id)).filter(
      (el): el is HTMLElement => Boolean(el)
    );
    if (targets.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { threshold: 0.3, rootMargin: "-48px 0px 0px 0px" }
    );
    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, []);

  function goTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="no-scrollbar print-hide sticky top-12 z-[90] flex w-full overflow-x-auto border-b border-dark bg-white">
      {MINI_NAV_SECTIONS.map((s, i) => (
        <button
          key={s.id}
          type="button"
          onClick={() => goTo(s.id)}
          className={`shrink-0 whitespace-nowrap px-[14px] py-[9px] font-mono text-[8px] lowercase tracking-[0.1em] transition-colors ${
            i < MINI_NAV_SECTIONS.length - 1 ? "border-r border-[#e8e8e8]" : ""
          } ${active === s.id ? "border-b-2 border-dark text-dark" : "border-b-2 border-transparent text-muted"}`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

function RoutineContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const [data, setData] = useState<RoutineData | null>(null);
  const [status, setStatus] = useState<"loading" | "ready">("loading");
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  // Only meaningful when routineFocus === "both" - the natural-hair and
  // protective-style routines are then shown as two tabs instead of both
  // stacked on one page.
  const [activeTab, setActiveTab] = useState<"natural" | "protective">("natural");
  // Hero subline ("medium porosity · Chicago") - resolved client-side
  // since /api/routine only returns the raw zip code.
  const [cityLabel, setCityLabel] = useState<string | null>(null);
  // Section 5's accordion - collapsed by default, force-expanded (and
  // scrolled to) by Section 2's "view full calendar" link.
  const [calendarExpanded, setCalendarExpanded] = useState(false);
  // Tools section - recommended tools collapsed by default; tapping a
  // tool-name chip on a step card (StepCard) both scrolls to and
  // highlights the matching tool card, auto-expanding this if the
  // target tool lives in the recommended (not essential) group.
  const [showRecommendedTools, setShowRecommendedTools] = useState(false);
  const [highlightedToolId, setHighlightedToolId] = useState<string | null>(null);
  // The calendar/upcoming strip's selected date - drives StepsSection/
  // ProductsSection (see getStepsForDay/getProductsForDay above), while
  // HeroSection stays fixed to data.todayIso regardless. Starts null and
  // is set to data.todayIso exactly once below, the first time data
  // loads - NOT reset on every subsequent loadRoutine() refresh (e.g.
  // after a check-off), which would otherwise snap the user's tapped
  // selection back to today every time they check something off.
  const [selectedIso, setSelectedIso] = useState<string | null>(null);

  const showWelcome = searchParams.get("welcome") === "true" && !welcomeDismissed;

  // Reused both for the initial load and to refresh after a check-off/
  // undo (see TodayTeaserCard) - re-fetching rather than recomputing the
  // streak client-side keeps that math in exactly one place (the API
  // route/lib/routineCompletions.ts).
  async function loadRoutine(userId: string): Promise<void> {
    try {
      const res = await fetch(`/api/routine?user_id=${userId}`);
      if (res.status === 403) {
        router.replace("/dashboard");
        return;
      }
      if (!res.ok) throw new Error("Failed to load routine.");
      const json = await res.json();
      setData(json);
      setStatus("ready");
    } catch {
      router.replace("/dashboard");
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/auth");
      return;
    }
    loadRoutine(user.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, router]);

  // Marks this as the user's last routine visit (see lib/routineVisit.ts)
  // so the nav's re-engagement dot clears, and resolves the hero's city
  // subline - both only once the routine has actually loaded.
  useEffect(() => {
    if (data && selectedIso === null) setSelectedIso(data.todayIso);
    // Deliberately omits selectedIso from deps - this should only ever
    // fire once, on first load; including it would make the effect
    // depend on its own setter's result.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  useEffect(() => {
    if (status !== "ready" || !data || !user) return;
    markRoutineVisited(user.id);
    let cancelled = false;
    lookupCityState(data.zipCode).then((cityState) => {
      if (!cancelled) setCityLabel(cityState?.city ?? null);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, data, user]);

  if (status !== "ready" || !data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white font-sans">
        <p className="text-sm text-dark/60">Loading your routine...</p>
      </main>
    );
  }

  const family = curlFamily(data.curlType);
  const hasPlaceholderCards = data.products.some((pick) => pick.noProductsYet);

  function expandAndScrollToCalendar() {
    setCalendarExpanded(true);
    requestAnimationFrame(() => {
      document.getElementById("calendar")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  // "Tap any day, see that day's routine" - the calendar/upcoming strip
  // both call this. Scrolls to the Steps section since that (plus
  // Products, right below it) is what actually changes on tap - the hero
  // stays fixed to today, per the request.
  function handleSelectDay(iso: string) {
    setSelectedIso(iso);
    requestAnimationFrame(() => {
      document.getElementById("steps")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function scrollToTool(toolId: string) {
    const tool = findTool(toolId);
    if (tool && tool.priority !== "essential") setShowRecommendedTools(true);
    setHighlightedToolId(toolId);
    requestAnimationFrame(() => {
      document.getElementById(`tool-${toolId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    setTimeout(() => setHighlightedToolId((id) => (id === toolId ? null : id)), 2500);
  }

  // Visibility rules for the natural-hair vs. protective-style routine
  // content, per routine_focus:
  // - 'natural_hair' (or unset): natural only.
  // - 'extensions': protective-style only, EXCEPT wigs, which always
  //   pairs wig care with the natural-hair-under-wig section (same data
  //   as the ordinary natural routine) - not a tab, both stacked.
  // - 'both': both routines exist, but only one shows at a time via
  //   the activeTab toggle rendered below.
  const isBothFocus = data.routineFocus === "both";
  const isExtensionsOnlyFocus = data.routineFocus === "extensions";
  const isWigUnderExtensions = isExtensionsOnlyFocus && data.protectiveStyleType === "wigs";
  const naturalRoutineApplies = !isExtensionsOnlyFocus || isWigUnderExtensions;
  const protectiveRoutineApplies = Boolean(data.protectiveStyle);
  const showNaturalRoutine = isBothFocus ? activeTab === "natural" : naturalRoutineApplies;
  const showProtectiveRoutine = isBothFocus ? activeTab === "protective" : protectiveRoutineApplies;

  return (
    <main className="min-h-screen bg-white font-sans text-dark">
      <div className="hidden print:block print:px-6 print:pt-6">
        <p className="font-serif text-2xl text-dark">
          Q<span className="italic">oyl</span>
        </p>
      </div>

      <RoutineTopBar data={data} />
      <RoutineMiniNav />

      <HeroSection data={data} cityLabel={cityLabel} userId={user!.id} onChanged={() => loadRoutine(user!.id)} />

      <RoutineFlagsSection flags={data.routineFlags} userId={user!.id} />

      {(showWelcome || hasPlaceholderCards || data.childSafetyNote || data.focusNote) && (
        <div className="print-hide w-full border-b border-dark bg-white px-5 py-4">
          {showWelcome && (
            <div className="mb-3 flex items-start justify-between gap-4">
              <p className="font-sans text-[13px] leading-relaxed text-dark">
                Your routine is ready. We will send your personalized monthly routine to your email within 24
                hours. Bookmark this page - it updates every month.
              </p>
              <button
                type="button"
                onClick={() => setWelcomeDismissed(true)}
                className="shrink-0 text-sm text-dark/50 hover:text-dark"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          )}
          {hasPlaceholderCards && (
            <p className="mb-2 font-sans text-[12px] leading-relaxed text-dark/70">
              We are actively expanding our product catalog. Some categories show ingredient guidance while we
              add more products. Check back soon - or{" "}
              <Link href="/request" className="underline underline-offset-2 hover:text-dark">
                request a specific product evaluation
              </Link>
              .
            </p>
          )}
          {data.childSafetyNote && (
            <p className="mb-2 font-sans text-[12px] leading-relaxed text-dark/90">{data.childSafetyNote}</p>
          )}
          {data.focusNote && <p className="font-sans text-[12px] leading-relaxed text-dark/90">{data.focusNote}</p>}
        </div>
      )}

      {isBothFocus && data.protectiveStyle && (
        <div className="print-hide flex w-full gap-2 border-b border-dark bg-white px-5">
          <button
            type="button"
            onClick={() => setActiveTab("natural")}
            className={`border-b-2 py-3 font-mono text-[10px] lowercase transition-colors ${
              activeTab === "natural" ? "border-dark text-dark" : "border-transparent text-muted"
            }`}
          >
            my natural hair
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("protective")}
            className={`border-b-2 py-3 font-mono text-[10px] lowercase transition-colors ${
              activeTab === "protective" ? "border-dark text-dark" : "border-transparent text-muted"
            }`}
          >
            my {data.protectiveStyle.styleLabel.toLowerCase()} care
          </button>
        </div>
      )}

      {showNaturalRoutine && (
        <>
          <UpcomingSection
            data={data}
            onViewCalendar={expandAndScrollToCalendar}
            selectedIso={selectedIso ?? data.todayIso}
            onSelect={handleSelectDay}
          />
          <StepsSection data={data} onViewTool={scrollToTool} selectedIso={selectedIso ?? data.todayIso} />
          <ProductsSection data={data} selectedIso={selectedIso ?? data.todayIso} />
          <ToolsSection
            data={data}
            highlightedToolId={highlightedToolId}
            showRecommended={showRecommendedTools}
            onToggleRecommended={() => setShowRecommendedTools((v) => !v)}
          />
          <CalendarAccordionSection
            data={data}
            family={family}
            expanded={calendarExpanded}
            onToggle={() => setCalendarExpanded((v) => !v)}
            selectedIso={selectedIso ?? data.todayIso}
            onSelect={handleSelectDay}
          />
        </>
      )}

      <div className="px-5 py-10">
        <div className="mx-auto max-w-3xl">
          {showProtectiveRoutine && <ProtectiveStyleSection data={data} />}

          <section className="print-hide mt-4 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => window.print()}
              className="border border-dark bg-white px-6 py-3 font-mono text-[11px] lowercase text-dark transition-colors hover:bg-[#f5f5f5]"
            >
              download my routine →
            </button>
            <Link href="/profile" className="font-mono text-[11px] lowercase text-muted underline underline-offset-2 hover:text-dark">
              edit my profile
            </Link>
          </section>

          <div className="mt-12 hidden print:block">
            <p className="text-xs text-muted">
              Generated by Qoyl · qoyl.live ·{" "}
              {new Date().toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>

          <div className="print-hide mt-8 border-t border-dark/20 pt-6">
            <button
              type="button"
              onClick={() => setShowDisclaimer((v) => !v)}
              className="flex items-center gap-1.5 font-mono text-[10px] lowercase text-muted transition-colors hover:text-dark"
            >
              about these recommendations
              <span className={`text-[10px] transition-transform ${showDisclaimer ? "rotate-180" : ""}`}>▼</span>
            </button>
            <Collapse show={showDisclaimer}>
              <p className="mt-2 text-xs leading-relaxed text-dark/50">
                Qoyl provides cosmetic hair care recommendations only. We do
                not address medical conditions, serious scalp disorders, or
                hair loss related to health conditions (such as alopecia,
                trichotillomania, or scalp infections). If you are
                experiencing significant hair loss, scalp pain, lesions, or
                other medical symptoms, please consult a licensed
                dermatologist or healthcare provider. Our recommendations are
                for general cosmetic hair care only.
              </p>
            </Collapse>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function RoutinePage() {
  return (
    <Suspense fallback={null}>
      <RoutineContent />
    </Suspense>
  );
}
