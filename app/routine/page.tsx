"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Collapse from "@/components/Collapse";
import ShopButton from "@/components/ShopButton";
import { useAuth } from "@/lib/auth-context";
import { curlFamily, CurlFamily, scoreTier, TIER_CLASSES } from "@/lib/compatibility";
import { ProductWeight, WEIGHT_PILL_CLASSES, WEIGHT_PILL_LABEL, weightFitNote } from "@/lib/productWeight";
import { WashDay, WashDayType } from "@/lib/routineCalendar";
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
import type { WashDayKey, WashDaySteps } from "@/lib/routineSteps";
import { lookupCityState } from "@/lib/zipLookup";

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
  additionalNotes: RoutineStep[];
  products: ProductPick[];
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

function todayLabelForWashType(type: WashDayType): string {
  if (type === "chelate" || type === "clarify") return "Clarifying wash day";
  if (type === "protein") return "Protein treatment day";
  if (type === "refresh") return "Between wash day";
  return "Regular wash day";
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
}: {
  cell: DayCellData;
  washDay: WashDay | undefined;
  isToday: boolean;
  isWithinWindow: boolean;
  isCompleted: boolean;
  isMissed: boolean;
  family: CurlFamily | null;
}) {
  const todayMarker = isToday ? (
    <span className="absolute left-1/2 top-0.5 h-1 w-1 -translate-x-1/2 rounded-full bg-bronze2" />
  ) : null;

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
        <div className="relative flex min-h-[40px] flex-col items-center justify-center rounded-md">
          {todayMarker}
          <span className="font-sans text-xs text-dark/70">{cell.day}</span>
          {isCompleted && !isRefresh ? (
            <TinyCheckIcon />
          ) : (
            <span
              className={`mt-0.5 h-1 w-1 rounded-full ${isCompleted ? "bg-bronze" : style.dotClass}`}
            />
          )}
        </div>
      );
    }
    return (
      <div
        className={`relative flex min-h-[40px] flex-col items-center justify-center rounded-md ${style.cellClass}`}
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
      </div>
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

  // Within the window but not a wash day - coily's routine explicitly
  // calls for nightly ends-sealing on every non-wash day (see
  // lib/routineSteps.ts's "Seal ends - every single night" step), so
  // that family gets a bronze "seal ends" dot; no other family's
  // between-wash days are tied to one mandatory nightly action, so they
  // read as a plain muted rest-day dot.
  const dotClass = family === "coily" ? "bg-bronze" : "bg-muted";
  return (
    <div className="relative flex min-h-[40px] flex-col items-center justify-center rounded-md">
      {todayMarker}
      <span className="font-sans text-xs text-muted">{cell.day}</span>
      <span className={`mt-0.5 h-1 w-1 rounded-full ${dotClass}`} />
    </div>
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
}: {
  meta: MonthMeta;
  washDayByDate: Map<string, WashDay>;
  todayIso: string;
  windowStartIso: string;
  windowEndIso: string;
  completedIso: string | null;
  missedIsoDates: Set<string>;
  family: CurlFamily | null;
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
    family === "coily"
      ? { swatchClass: "bg-bronze", label: "Seal ends tonight", dot: true }
      : { swatchClass: "bg-muted", label: "Rest day", dot: true },
  ];
  if (family === "straight" || family === "wavy") {
    items.push({ swatchClass: SECTION_META.between.dotClass, label: SECTION_META.between.label, dot: true });
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
}: {
  calendarDays: WashDay[];
  todayIso: string;
  completedIso: string | null;
  missedDates: string[];
  family: CurlFamily | null;
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
                {WEIGHT_PILL_LABEL[primary.weight]}
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
const WASH_PILL_CLASSES: Record<WashDayType, string> = {
  chelate: "bg-dark text-white",
  clarify: "bg-dark text-white",
  wash: "bg-white text-dark border border-dark",
  protein: "bg-green text-white",
  refresh: "bg-[#d9d9d9] text-dark",
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
      <div className="relative mt-4">
        <div className="flex h-11 w-full items-center justify-between bg-dark px-4">
          <span className="font-sans text-[13px] font-medium lowercase text-white">completed today ✓</span>
          <button
            type="button"
            onClick={handleUndo}
            disabled={undoing}
            className="font-mono text-[9px] text-white/60 underline underline-offset-2 hover:text-white disabled:opacity-50"
          >
            {undoing ? "…" : "undo"}
          </button>
        </div>
        <p className="mt-1.5 font-mono text-[9px] text-muted">
          completed at {formatCheckOffTime(localCompletedAt)}
        </p>
        {showConfetti && <ConfettiBurst />}
      </div>
    );
  }

  return (
    <div className="relative mt-4">
      <button
        type="button"
        onClick={handleCheckOff}
        disabled={saving}
        className="flex h-11 w-full items-center justify-center border border-dark bg-white font-sans text-[13px] font-medium lowercase text-dark transition-colors hover:bg-[#f5f5f5] disabled:opacity-60"
      >
        {saving ? "saving…" : "mark today as complete →"}
      </button>
      {error && <p className="mt-1.5 text-xs text-red">{error}</p>}
    </div>
  );
}

// SECTION 1 - Hero: curl type, porosity/city, today's wash-type pill,
// streak, and the check-off button. Full-width, not scrollable.
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
  const todayWash = data.calendarDays.find((d) => d.date === data.todayIso);

  return (
    <div id="section-today" className="w-full border-b border-dark bg-white px-5 pb-5 pt-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-[72px] font-bold leading-none text-dark">
            {showCurl ? data.curlType : "—"}
          </p>
          <p className="mt-2 font-mono text-[10px] text-muted">{subline || "your hair"}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end pt-1 text-right">
          <span
            className={`whitespace-nowrap px-3 py-1.5 font-mono text-[11px] font-bold lowercase ${
              todayWash ? WASH_PILL_CLASSES[todayWash.washType] : "bg-[#d9d9d9] text-dark"
            }`}
          >
            {todayWash ? WASH_PILL_LABEL[todayWash.washType] : "rest day"}
          </span>
          <p className="mt-2 whitespace-nowrap font-mono text-[10px]">
            {data.streak >= 3 ? (
              <span className="text-dark">🔥 {data.streak}-day streak</span>
            ) : (
              <span className="text-muted">start your streak today</span>
            )}
          </p>
        </div>
      </div>

      <TodayCheckOffButton
        userId={userId}
        todayIso={data.todayIso}
        washType={todayWash?.washType ?? null}
        todayCompletion={data.todayCompletion}
        onChanged={onChanged}
      />
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

function UpcomingDayCard({
  day,
  state,
}: {
  day: WashDay;
  state: "today" | "completed" | "missed" | "future";
}) {
  const d = new Date(`${day.date}T00:00:00`);
  const dayName = d.toLocaleDateString("en-US", { weekday: "short" }).toLowerCase();
  const dateNum = d.getDate();

  if (state === "today") {
    return (
      <div className="flex h-[88px] w-[72px] shrink-0 flex-col justify-between border-2 border-dark bg-dark p-2">
        <span className="font-sans text-[9px] lowercase text-white/70">{dayName}</span>
        <span className="font-mono text-[22px] font-bold leading-none text-white">{dateNum}</span>
        <span className="self-start bg-white px-1.5 py-0.5 font-mono text-[8px] font-bold lowercase text-dark">
          {WASH_PILL_LABEL[day.washType]}
        </span>
      </div>
    );
  }

  return (
    <div className="relative flex h-[88px] w-[72px] shrink-0 flex-col justify-between border border-[#e0e0e0] bg-white p-2">
      <span className="font-sans text-[9px] lowercase text-muted">{dayName}</span>
      <span className={`font-mono text-[22px] font-bold leading-none ${state === "completed" ? "text-muted" : "text-dark"}`}>
        {dateNum}
      </span>
      <span className={`self-start px-1.5 py-0.5 font-mono text-[8px] font-bold lowercase ${WASH_PILL_CLASSES[day.washType]}`}>
        {WASH_PILL_LABEL[day.washType]}
      </span>
      {state === "completed" && <span className="absolute right-1 top-1 text-[10px] leading-none text-dark">✓</span>}
      {state === "missed" && <span className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-amber" />}
    </div>
  );
}

function UpcomingSection({ data, onViewCalendar }: { data: RoutineData; onViewCalendar: () => void }) {
  const todayDate = new Date(`${data.todayIso}T00:00:00`);
  const cutoffIso = toIsoLocal(addDays(todayDate, -7));
  const visibleDays = data.calendarDays.filter((d) => d.date >= cutoffIso);

  return (
    <div id="section-upcoming" className="w-full border-b border-dark bg-white">
      <div className="flex items-center justify-between px-5 pt-4">
        <span className="font-mono text-[10px] lowercase text-muted">upcoming</span>
        <button type="button" onClick={onViewCalendar} className="font-mono text-[10px] lowercase text-muted">
          view full calendar ↓
        </button>
      </div>
      {visibleDays.length > 0 ? (
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto px-5 pb-4">
          {visibleDays.map((day) => (
            <UpcomingDayCard key={day.date} day={day} state={dayCompletionState(day, data.todayIso, data.missedDates)} />
          ))}
        </div>
      ) : (
        <p className="px-5 pb-4 pt-3 font-sans text-[13px] text-dark/60">No wash days in this window.</p>
      )}
    </div>
  );
}

// SECTION 3 - Steps: one horizontally scrollable, scroll-snapping card
// per step of today's wash-day sequence (reusing stepsByWashType exactly
// as computed server-side), plus any additionalNotes appended as trailing
// cards so that content isn't lost by the restructure.
function StepCard({
  step,
  index,
  products,
  onViewProduct,
}: {
  step: { title: string; body: string; why: string | null; timerMinutes: string | null; productCategory: string | null };
  index: number;
  products: ProductPick[];
  onViewProduct: () => void;
}) {
  const [showWhy, setShowWhy] = useState(false);
  const pick = step.productCategory ? products.find((p) => p.category === step.productCategory) ?? null : null;
  const primary = pick?.primary ?? null;

  return (
    <div
      className="flex min-h-[160px] w-[calc(100vw-56px)] max-w-[340px] shrink-0 flex-col border border-dark bg-white p-5"
      style={{ scrollSnapAlign: "start" }}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="font-mono text-[11px] font-bold text-muted">step {String(index + 1).padStart(2, "0")}</span>
        <span className="font-sans text-[15px] font-bold lowercase text-dark">{step.title}</span>
      </div>
      <p className="mt-2 flex-1 font-sans text-[13px] font-light leading-[1.7] text-[#444]">{step.body}</p>

      <div className="mt-3 flex items-center justify-between gap-2">
        {step.why ? (
          <button type="button" onClick={() => setShowWhy((v) => !v)} className="font-mono text-[9px] text-[#bbb]">
            why
          </button>
        ) : (
          <span />
        )}
        {step.timerMinutes && (
          <span className="font-mono text-[9px] text-muted">set timer · {step.timerMinutes}</span>
        )}
      </div>
      {showWhy && step.why && (
        <p className="mt-2 border-l-2 border-dark bg-[#f5f5f5] px-2.5 py-1.5 text-xs italic leading-relaxed text-[#444]">
          {step.why}
        </p>
      )}

      {primary && (
        <button
          type="button"
          onClick={onViewProduct}
          className="mt-3 self-start border border-dark bg-white px-2.5 py-1 font-mono text-[10px] lowercase text-dark"
        >
          {primary.productName.length > 26 ? `${primary.productName.slice(0, 26)}…` : primary.productName} →
        </button>
      )}
    </div>
  );
}

function StepsSection({ data }: { data: RoutineData }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const todayWash = data.calendarDays.find((d) => d.date === data.todayIso);
  const key = todayWash ? washDayKeyForType(todayWash.washType) : null;
  const washDaySteps = key ? data.stepsByWashType.find((w) => w.key === key) ?? null : null;
  const steps = washDaySteps?.steps ?? [];
  const total = steps.length + data.additionalNotes.length;

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
    document.getElementById("section-products")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (!todayWash) {
    return (
      <div id="section-steps" className="w-full border-b border-dark bg-white px-5 py-6">
        <span className="font-mono text-[10px] lowercase text-muted">today&apos;s routine</span>
        <p className="mt-2 font-sans text-[13px] text-[#444]">Rest day — no routine steps today.</p>
      </div>
    );
  }

  return (
    <div id="section-steps" className="w-full border-b border-dark bg-white pt-4">
      <div className="px-5">
        <span className="font-mono text-[10px] lowercase text-muted">today&apos;s routine</span>
        <p className="mt-0.5 font-mono text-[9px] text-[#bbb]">
          {todayLabelForWashType(todayWash.washType).toLowerCase()} · {total} step{total === 1 ? "" : "s"}
        </p>
      </div>
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="no-scrollbar mt-3 flex gap-3 overflow-x-auto px-5 pb-4"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {steps.map((step, i) => (
          <StepCard key={step.title} step={step} index={i} products={data.products} onViewProduct={scrollToProducts} />
        ))}
        {data.additionalNotes.map((note, i) => (
          <StepCard
            key={note.title}
            step={{ title: note.title, body: note.body, why: note.why, timerMinutes: null, productCategory: null }}
            index={steps.length + i}
            products={data.products}
            onViewProduct={scrollToProducts}
          />
        ))}
      </div>
      {total > 0 && (
        <div className="flex flex-col items-center gap-2 pb-4">
          <p className="font-mono text-[9px] text-muted">
            step {current + 1} of {total}
          </p>
          <div className="flex gap-1.5">
            {Array.from({ length: total }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full ${i === current ? "bg-dark" : "border border-dark"}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// SECTION 4 - Products: today's wash-type-relevant picks (reusing
// sectionsForWashType exactly as TodayProducts used to), as compact
// horizontal cards, plus a collapsed "see all products" list that
// reuses the existing full-detail ProductCard/SectionDivider and folds
// in the brand-products/avoid-ingredients blocks that used to live in
// the always-visible product section.
function CompactProductCard({ pick }: { pick: ProductPick }) {
  const [showWhy, setShowWhy] = useState(false);
  const { primary } = pick;

  if (pick.noProductsYet || !primary) {
    return (
      <div
        className="flex min-h-[140px] w-[calc(100vw-56px)] max-w-[340px] shrink-0 flex-col justify-between border border-dark bg-white p-5"
        style={{ scrollSnapAlign: "start" }}
      >
        <span className="font-mono text-[9px] uppercase tracking-wide text-muted">{pick.categoryLabel}</span>
        <p className="mt-3 font-sans text-sm text-dark/60">No pick yet for this category.</p>
        <Link
          href={`/search?category=${encodeURIComponent(pick.searchCategorySlug)}`}
          className="mt-2 font-mono text-[9px] text-dark"
        >
          search catalog →
        </Link>
      </div>
    );
  }

  const dotClass = pick.section === "protein" ? "bg-green" : pick.section === "clarify" ? "bg-[#B08D57]" : "bg-dark";

  return (
    <div
      className="flex min-h-[140px] w-[calc(100vw-56px)] max-w-[340px] shrink-0 flex-col border border-dark bg-white p-5"
      style={{ scrollSnapAlign: "start" }}
    >
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-[9px] uppercase tracking-wide text-muted">{pick.categoryLabel}</span>
        <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
      </div>
      <p className="mt-2 font-sans text-base font-bold lowercase tracking-[-0.3px] text-dark">{primary.productName}</p>
      <p className="font-sans text-xs font-light text-muted">{primary.brandName}</p>

      <div className="mt-2 flex items-baseline gap-1">
        <span className="font-mono text-[32px] font-bold text-dark">{primary.score}</span>
        <span className="font-mono text-[10px] text-muted">/ 100</span>
      </div>
      <span className={`mt-1 inline-block self-start px-1.5 py-0.5 font-mono text-[8px] ${WEIGHT_PILL_CLASSES[primary.weight]}`}>
        {WEIGHT_PILL_LABEL[primary.weight]}
      </span>

      <div className="mt-auto flex items-center justify-between pt-3">
        <button type="button" onClick={() => setShowWhy((v) => !v)} className="font-mono text-[9px] text-muted">
          why this was picked →
        </button>
        <ShopButton productName={primary.productName} brandName={primary.brandName} className="font-mono text-[9px] text-dark" />
      </div>
      {showWhy && <p className="mt-2 text-xs leading-relaxed text-[#444]">{primary.why}</p>}
    </div>
  );
}

function ProductsSection({ data }: { data: RoutineData }) {
  const [showAll, setShowAll] = useState(false);
  const todayWash = data.calendarDays.find((d) => d.date === data.todayIso);
  const todaysPicks = todayWash
    ? data.products.filter((pick) => sectionsForWashType(todayWash.washType).includes(pick.section))
    : [];

  return (
    <div id="section-products" className="w-full border-b border-dark bg-white pt-4">
      <div className="px-5">
        <span className="font-mono text-[10px] lowercase text-muted">your products</span>
        <p className="mt-0.5 font-mono text-[9px] text-[#bbb]">
          {todayWash ? `for today's ${todayLabelForWashType(todayWash.washType).toLowerCase()}` : "for your routine"}
        </p>
      </div>

      {todaysPicks.length > 0 ? (
        <div
          className="no-scrollbar mt-3 flex gap-3 overflow-x-auto px-5 pb-4"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {todaysPicks.map((pick) => (
            <CompactProductCard key={pick.category} pick={pick} />
          ))}
        </div>
      ) : (
        <p className="px-5 pb-4 pt-3 font-sans text-[13px] text-dark/60">No wash products needed today.</p>
      )}

      <div className="px-5 pb-4">
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
}: {
  data: RoutineData;
  family: CurlFamily | null;
  expanded: boolean;
  onToggle: () => void;
}) {
  const months = getMonthsInWindow(new Date(`${data.todayIso}T00:00:00`));
  const monthLabel = months.map((m) => m.label).join(" + ");

  return (
    <div id="section-calendar" className="w-full bg-[#f5f0ea] px-5 py-5">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-3 text-left">
        <div>
          <p className="font-mono text-[10px] lowercase text-muted">full 30-day calendar</p>
          <p className="mt-0.5 font-mono text-[9px] text-[#bbb]">{monthLabel}</p>
        </div>
        <span className="shrink-0 font-mono text-[10px] lowercase text-muted">{expanded ? "collapse ↑" : "expand ↓"}</span>
      </button>
      <Collapse show={expanded}>
        <div className="mt-4">
          <WashCalendarGrid
            calendarDays={data.calendarDays}
            todayIso={data.todayIso}
            completedIso={data.todayCompletion ? data.todayIso : null}
            missedDates={data.missedDates}
            family={family}
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
  "clarifying-shampoo": "border-l-4 border-l-bronze",
  shampoo: "border-l-4 border-l-cream",
  "protein-treatment": "border-l-4 border-l-green",
  "deep-conditioner": "border-l-4 border-l-cream",
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
  { id: "section-today", label: "today" },
  { id: "section-upcoming", label: "upcoming" },
  { id: "section-steps", label: "steps" },
  { id: "section-products", label: "products" },
  { id: "section-calendar", label: "calendar" },
];

// Sticky mini-nav: hidden until the hero scrolls out of view, then
// tracks which of the five sections is currently in view (scroll-spy)
// and lets a tap jump straight to any of them.
function RoutineMiniNav() {
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState(MINI_NAV_SECTIONS[0].id);

  useEffect(() => {
    const hero = document.getElementById("section-today");
    if (!hero) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const targets = MINI_NAV_SECTIONS.map((s) => document.getElementById(s.id)).filter(
      (el): el is HTMLElement => Boolean(el)
    );
    if (targets.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter((e) => e.isIntersecting);
        if (visibleEntries.length === 0) return;
        const top = visibleEntries.sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        setActive(top.target.id);
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, []);

  function goTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (!visible) return null;

  return (
    <div className="print-hide sticky top-0 z-40 w-full border-b border-dark bg-white">
      <div className="flex w-full">
        {MINI_NAV_SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => goTo(s.id)}
            className={`flex-1 border-b-2 py-3 font-mono text-[9px] lowercase transition-colors ${
              active === s.id ? "border-dark text-dark" : "border-transparent text-muted"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
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
      document.getElementById("section-calendar")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
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

      <HeroSection data={data} cityLabel={cityLabel} userId={user!.id} onChanged={() => loadRoutine(user!.id)} />

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

      <RoutineMiniNav />

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
          <UpcomingSection data={data} onViewCalendar={expandAndScrollToCalendar} />
          <StepsSection data={data} />
          <ProductsSection data={data} />
          <CalendarAccordionSection
            data={data}
            family={family}
            expanded={calendarExpanded}
            onToggle={() => setCalendarExpanded((v) => !v)}
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
