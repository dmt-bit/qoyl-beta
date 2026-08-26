"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Collapse from "@/components/Collapse";
import ShopButton from "@/components/ShopButton";
import { useAuth } from "@/lib/auth-context";
import { getAffiliateLink } from "@/lib/affiliateLinks";
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
import type { RoutineStepDetail, WashDayKey, WashDaySteps } from "@/lib/routineSteps";
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
  stepsByWashType: WashDaySteps[];
  additionalNotes: RoutineStep[];
  products: ProductPick[];
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

const SCALP_LABELS: Record<string, string> = {
  normal: "Normal scalp",
  dry: "Dry scalp",
  oily: "Oily scalp",
  sensitive: "Sensitive scalp",
  "dandruff-prone": "Dandruff-prone scalp",
};

// Same color coding as the calendar's DayCell/CalendarLegend below, so a
// user can see e.g. a green-bordered date and know exactly which product
// section to scroll to. Labels/order come from lib/categoryGuidance.ts,
// the shared source of truth also used by emails/routine-template.ts;
// only the Tailwind dot styling is web-specific and stays local.
const SECTION_DOT_CLASS: Record<RoutineSection, string> = {
  clarify: "border-2 border-bronze bg-dark",
  regular: "bg-dark",
  protein: "border-2 border-green bg-dark",
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

const FREQUENCY_EXPLANATION: Record<CurlFamily, string> = {
  straight:
    "Sebum travels faster down straight hair strands - more frequent washing keeps your scalp healthy and hair looking fresh. This is normal for your hair type.",
  wavy:
    "Sebum travels fairly quickly down wavy strands, just not as fast as straight hair - washing every few days keeps your scalp balanced without stripping your wave pattern. This is normal for your hair type.",
  curly:
    "Your curl pattern slows sebum travel down the hair shaft compared to straighter textures - going longer between washes protects your curls' natural moisture. Focus your between-wash routine on sealing and protecting.",
  coily:
    "Your curl pattern slows sebum travel down the hair shaft - less frequent washing protects your hair's natural moisture. Focus your between-wash routine on sealing and protecting.",
};

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
function washDayCellStyle(type: WashDayType, family: CurlFamily | null): WashCellStyle {
  if (type === "chelate" || type === "clarify") {
    return {
      kind: "filled",
      cellClass: "cal-cell-clarify bg-dark border-2 border-bronze",
      numberClass: "text-cream",
      label: "Clarify",
      labelClass: "text-bronze",
    };
  }
  if (type === "protein") {
    return {
      kind: "filled",
      cellClass: "cal-cell-protein bg-dark border-2 border-green",
      numberClass: "text-cream",
      label: "Protein",
      labelClass: "text-green",
    };
  }
  if (type === "refresh") {
    if (family === "straight") return { kind: "dot", dotClass: "bg-muted" };
    return {
      kind: "filled",
      cellClass: "cal-cell-refresh bg-[#2C2420]",
      numberClass: "text-bronze2",
      label: "Refresh",
      labelClass: "text-bronze2",
    };
  }
  if (family === "straight") return { kind: "dot", dotClass: "bg-bronze" };
  return {
    kind: "filled",
    cellClass: "cal-cell-wash bg-dark",
    numberClass: "text-cream",
    label: "Wash",
    labelClass: "text-cream/50",
  };
}

function DayCell({
  cell,
  washDay,
  isToday,
  isWithinWindow,
  family,
}: {
  cell: DayCellData;
  washDay: WashDay | undefined;
  isToday: boolean;
  isWithinWindow: boolean;
  family: CurlFamily | null;
}) {
  const todayMarker = isToday ? (
    <span className="absolute left-1/2 top-0.5 h-1 w-1 -translate-x-1/2 rounded-full bg-bronze2" />
  ) : null;

  if (washDay) {
    const style = washDayCellStyle(washDay.washType, family);
    if (style.kind === "dot") {
      return (
        <div className="relative flex min-h-[40px] flex-col items-center justify-center rounded-md">
          {todayMarker}
          <span className="font-sans text-xs text-cream/70">{cell.day}</span>
          <span className={`mt-0.5 h-1 w-1 rounded-full ${style.dotClass}`} />
        </div>
      );
    }
    return (
      <div
        className={`relative flex min-h-[40px] flex-col items-center justify-center rounded-md ${style.cellClass}`}
      >
        {todayMarker}
        <span className={`font-sans text-xs ${style.numberClass}`}>{cell.day}</span>
        <span className={`font-sans text-[7px] sm:text-[8px] ${style.labelClass}`}>
          {style.label}
        </span>
      </div>
    );
  }

  if (!isWithinWindow) {
    return (
      <div className="flex min-h-[40px] items-center justify-center rounded-md opacity-30">
        <span className="font-sans text-xs text-muted">{cell.day}</span>
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
  family,
}: {
  meta: MonthMeta;
  washDayByDate: Map<string, WashDay>;
  todayIso: string;
  windowStartIso: string;
  windowEndIso: string;
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
  family,
}: {
  calendarDays: WashDay[];
  family: CurlFamily | null;
}) {
  if (calendarDays.length === 0) return null;

  const washDayByDate = new Map(calendarDays.map((d) => [d.date, d]));
  const todayIso = calendarDays[0].date; // offset 0 is always today, see generateWashCalendar
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
          <p className="font-serif text-base text-cream">
            We&apos;re adding {labelLower} products to our catalog
          </p>
          <p className="mt-1 text-sm text-cream/60">
            In the meantime, look for these key ingredients when shopping for{" "}
            {articleFor(labelLower)} {labelLower}:
          </p>
        </div>
      </div>
      <ul className="mt-3 space-y-1.5">
        {tips.map((tip) => (
          <li key={tip} className="text-xs leading-relaxed text-cream/70">
            • {tip}
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        <Link
          href={`/search?category=${encodeURIComponent(pick.searchCategorySlug)}${
            pick.searchQuery ? `&q=${encodeURIComponent(pick.searchQuery)}` : ""
          }`}
          className="print-hide text-sm font-medium text-bronze2 underline underline-offset-2 hover:text-cream"
        >
          Search our catalog →
        </Link>
        <Link
          href={`/request?product=${encodeURIComponent(pick.categoryLabel)}`}
          className="print-hide text-sm font-medium text-bronze2 underline underline-offset-2 hover:text-cream"
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
        <p className="mt-1.5 rounded-md bg-bronze/10 px-2.5 py-1.5 text-xs leading-relaxed text-bronze2">
          {note}
        </p>
      )}

      {pick.noProductsYet || !primary ? (
        <PlaceholderCard pick={pick} />
      ) : (
        <>
          <div className="mt-3 flex items-start justify-between gap-3">
            <div>
              <p className="font-serif text-lg text-cream">{primary.productName}</p>
              <p className="text-xs text-cream/50">{primary.brandName}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  TIER_CLASSES[scoreTier(primary.score)]
                }`}
              >
                {primary.score}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${WEIGHT_PILL_CLASSES[primary.weight]}`}
              >
                {WEIGHT_PILL_LABEL[primary.weight]}
              </span>
              {budgetActive && <PriceTierChip priceUsd={primary.priceUsd} />}
            </div>
          </div>
          <p className="mt-1 text-sm text-cream/70">{primary.why}</p>
          {fitNote && <p className="mt-1 text-xs text-cream/50">{fitNote}</p>}
          {colorTreated && primary.containsSulfates && (
            <p className="mt-1.5 rounded-md bg-amber/10 px-2.5 py-1.5 text-xs leading-relaxed text-amber">
              Contains sulfates - may fade color faster. Consider a sulfate-free alternative.
            </p>
          )}
          <ShopButton
            productName={primary.productName}
            brandName={primary.brandName}
            className="print-hide mt-3 inline-block text-sm font-medium text-bronze2 underline underline-offset-2 hover:text-cream"
          />

          {alternate && (
            <div className="mt-4 border-t border-bronze/20 pt-3">
              <p className="text-xs text-cream/50">
                Alternate pick:{" "}
                <span className="text-cream/80">
                  {alternate.productName} · {alternate.brandName}
                </span>
                <span className="ml-2 text-cream/50">{alternate.score}/100</span>
              </p>
            </div>
          )}

          {budgetActive && budgetAlternate && (
            <div className="mt-4 border-t border-bronze/20 pt-3">
              <p className="text-xs text-cream/70">
                This scores highest for your hair. For a budget-friendly alternative:
              </p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-xs text-cream/80">
                  {budgetAlternate.productName} · {budgetAlternate.brandName}
                  <span className="ml-2 text-cream/50">{budgetAlternate.score}/100</span>
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
  return (
    <div className="col-span-full mt-6 flex items-center gap-2 first:mt-0">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-bronze" />
      <span className="shrink-0 font-sans text-[10px] font-semibold uppercase tracking-wide text-bronze">
        {SECTION_META[section].label}
      </span>
      <span className="h-px flex-1 bg-bronze/20" />
    </div>
  );
}

// "What to use today" - checks today's entry in the generated wash
// calendar (always calendarDays[0], see generateWashCalendar) and shows
// only the product(s) relevant to that specific day, so a user doesn't
// have to scroll the full list every morning.
function TodayProducts({ data }: { data: RoutineData }) {
  const todayWash = data.calendarDays[0];

  if (!todayWash) {
    return (
      <div className="print-hide mb-10 rounded-xl border border-bronze/30 bg-bronze/5 p-5">
        <span className="inline-block rounded-full bg-bronze px-3 py-1 text-xs font-semibold text-dark">
          Today is a rest day
        </span>
        <p className="mt-3 text-sm text-cream/60">No wash products needed today.</p>
      </div>
    );
  }

  const label = todayLabelForWashType(todayWash.washType);
  const relevantSections = sectionsForWashType(todayWash.washType);
  const todaysPicks = data.products.filter((pick) => relevantSections.includes(pick.section));

  return (
    <div className="print-hide mb-10 rounded-xl border border-bronze/30 bg-bronze/5 p-5">
      <span className="inline-block rounded-full bg-bronze px-3 py-1 text-xs font-semibold text-dark">
        Today is a {label}
      </span>
      <p className="mt-3 text-sm font-medium text-cream/80">Your products for today:</p>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {todaysPicks.map((pick) => (
          <ProductCard
            key={`today-${pick.category}`}
            pick={pick}
            curlType={data.curlType}
            porosity={data.porosity}
            budgetRange={data.budgetRange}
            colorTreated={data.colorTreated === "yes"}
          />
        ))}
      </div>
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
    moisturize: "border-bronze/30 text-cream/60",
    retwist: "border-green text-green",
  };

  return (
    <div className="mt-4 space-y-1.5">
      {days.map((day) => (
        <div
          key={`${day.date}-${day.dayType}`}
          className={`flex items-center justify-between rounded-md border-l-4 bg-[#2C2420] px-3 py-2 ${DAY_TYPE_CLASSES[day.dayType]}`}
        >
          <span className="text-sm text-cream">
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
        <h2 className="font-serif text-2xl font-semibold text-cream">
          Your {style.styleLabel.toLowerCase()} care routine
        </h2>

        {style.frequency && (
          <span className="mt-3 inline-block rounded-full bg-bronze/20 px-3 py-1 text-xs font-medium text-bronze2">
            Wash every {style.frequency.min}-{style.frequency.max} days
          </span>
        )}
        {style.wigWashNote && (
          <p className="mt-3 text-sm text-cream/70">{style.wigWashNote}</p>
        )}
        {style.routineNote && (
          <p className="mt-4 rounded-lg border-l-2 border-bronze bg-warm/10 px-4 py-3 text-sm leading-relaxed text-cream/90">
            {style.routineNote}
          </p>
        )}
        {style.wigScalpCareNote && (
          <p className="mt-4 rounded-lg border-l-2 border-bronze bg-warm/10 px-4 py-3 text-sm leading-relaxed text-cream/90">
            {style.wigScalpCareNote}
          </p>
        )}

        <ProtectiveStyleCalendarList days={style.calendarDays} />
      </section>

      <section className="print-page-break mt-12">
        <h2 className="font-serif text-2xl font-semibold text-cream">
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
                <p className="mt-3 font-serif text-lg text-cream">{accessory.label}</p>
                <p className="mt-1 text-sm text-cream/70">{accessory.note}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function ClockIcon() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0 text-bronze" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5V12l3 2" />
    </svg>
  );
}

// Colors/icons mirror SECTION_META/CalendarLegend above, so a wash
// day's color reads the same whether it's the calendar, the product
// list dividers, or this accordion header. border is a left-accent
// (paired with border-l-4 in WashDayAccordion below), not a full
// perimeter border.
const WASH_DAY_ACCORDION_STYLE: Record<
  WashDayKey,
  { border: string; label: string; icon: () => React.ReactElement; cadenceTypes: WashDayType[]; cadenceUnit: "weeks" | "washes" | null }
> = {
  clarifying: { border: "border-l-bronze", label: "text-bronze", icon: SmallCalendarIcon, cadenceTypes: ["chelate", "clarify"], cadenceUnit: "weeks" },
  regular: { border: "border-l-cream", label: "text-cream", icon: DropIcon, cadenceTypes: [], cadenceUnit: null },
  protein: { border: "border-l-green", label: "text-green", icon: LeafIcon, cadenceTypes: ["protein"], cadenceUnit: "washes" },
  between: { border: "border-l-[#3D2E22]", label: "text-cream/60", icon: MoonIcon, cadenceTypes: [], cadenceUnit: null },
};

// One step within a wash-day accordion - bronze-filled numbered circle,
// DM Sans title/body, an optional timer line (clock icon), an optional
// bronze "why" callout, and - when the step names a product category
// the user has a curated pick for - a direct link to that pick so they
// don't have to scroll down to SECTION 4 to find it.
function StepDetailRow({
  step,
  index,
  products,
}: {
  step: RoutineStepDetail;
  index: number;
  products: ProductPick[];
}) {
  const pick = step.productCategory
    ? products.find((p) => p.category === step.productCategory) ?? null
    : null;
  const primary = pick?.primary ?? null;
  const viewLink = primary ? getAffiliateLink(primary.productName, primary.brandName) : null;

  return (
    <div className="flex gap-4">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bronze font-sans text-xs font-semibold text-cream">
        {index + 1}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-sans text-sm font-semibold text-cream">{step.title}</p>
        <p className="mt-1 text-[13px] leading-relaxed text-[#9C8070]">{step.body}</p>

        {step.timerMinutes && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-bronze2">
            <ClockIcon />
            Set a timer for {step.timerMinutes}
          </p>
        )}

        {step.why && (
          <p className="mt-2 rounded-md border-l-2 border-bronze bg-[#2C2420] px-2.5 py-1.5 text-xs italic leading-relaxed text-[#9C8070]">
            {step.why}
          </p>
        )}

        {pick && primary && (
          <p className="mt-2 text-xs text-cream/60">
            Your {pick.categoryLabel.toLowerCase()}: {primary.productName} - {primary.score}/100 for your profile
            {viewLink && (
              <>
                {" "}
                <a
                  href={viewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="print-hide font-medium text-bronze2 underline underline-offset-2 hover:text-cream"
                >
                  View product →
                </a>
              </>
            )}
          </p>
        )}

        {/* Detangler is new enough to the catalog that "no real pick
            yet" is a live case worth its own message, rather than
            silently showing nothing - other product-linked steps keep
            the silent fallback above. */}
        {step.productCategory === "detangler" && pick && !primary && (
          <p className="mt-2 text-xs text-cream/60">
            No detangler in your list yet -{" "}
            <Link
              href={`/search?category=${encodeURIComponent(pick.searchCategorySlug)}${
                pick.searchQuery ? `&q=${encodeURIComponent(pick.searchQuery)}` : ""
              }`}
              className="print-hide font-medium text-bronze2 underline underline-offset-2 hover:text-cream"
            >
              search our catalog
            </Link>{" "}
            or{" "}
            <Link
              href={`/request?product=${encodeURIComponent(pick.categoryLabel)}`}
              className="print-hide font-medium text-bronze2 underline underline-offset-2 hover:text-cream"
            >
              request an evaluation →
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

function WashDayAccordion({
  washDay,
  products,
  calendarDays,
  defaultOpen,
}: {
  washDay: WashDaySteps;
  products: ProductPick[];
  calendarDays: WashDay[];
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const style = WASH_DAY_ACCORDION_STYLE[washDay.key];
  const Icon = style.icon;
  const cadence =
    washDay.key === "regular"
      ? "Most common"
      : style.cadenceUnit
      ? computeCadenceLabel(calendarDays, style.cadenceTypes, style.cadenceUnit)
      : null;

  return (
    <div className={`rounded-xl border-l-4 p-5 transition-colors ${style.border} ${open ? "bg-dark" : "bg-[#2C2420]/40"}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="flex items-center gap-2">
          <Icon />
          <span className={`font-serif text-xl font-semibold ${style.label}`}>{washDay.label}</span>
        </span>
        <span className="flex shrink-0 items-center gap-3">
          {cadence && (
            <span className="whitespace-nowrap rounded-full border border-bronze/30 px-2.5 py-1 text-[10px] font-medium text-cream/70">
              {cadence}
            </span>
          )}
          <span className={`text-sm transition-transform ${open ? "rotate-180" : ""} text-cream/50`}>▼</span>
        </span>
      </button>
      <Collapse show={open}>
        {washDay.steps.map((step, i) => (
          <StepDetailRow key={`${washDay.key}-${step.title}`} step={step} index={i} products={products} />
        ))}
      </Collapse>
    </div>
  );
}

// ---- Visual redesign additions (nav/hero/calendar/steps/products) -----
// Purely presentational - no change to how routine data is computed or
// what functionality exists, per the request.

function DropIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 text-cream" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3s6.5 7.09 6.5 11.5a6.5 6.5 0 11-13 0C5.5 10.09 12 3 12 3z" />
    </svg>
  );
}
function LeafIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 text-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 4S6 5 6 15a6 6 0 006 6C22 21 20 4 20 4z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 20c0-6 2-11 9-15" />
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 text-[#9C8070]" fill="currentColor" viewBox="0 0 24 24">
      <path d="M20.4 14.7A8.5 8.5 0 019.3 3.6a.75.75 0 00-.9-1 10 10 0 1013 13 .75.75 0 00-1-.9z" />
    </svg>
  );
}
function SmallCalendarIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 text-bronze" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <rect x="3.75" y="5.25" width="16.5" height="15" rx="1.5" />
      <path strokeLinecap="round" d="M3.75 9.75h16.5M8.25 3v3.75M15.75 3v3.75" />
    </svg>
  );
}
function ChevronDownIcon() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

// SECTION - Hero: the profile's most personal, at-a-glance summary,
// large curl type acting as the page's visual anchor.
function RoutineHero({
  curlType,
  porosity,
  cityLabel,
}: {
  curlType: string | null;
  porosity: string | null;
  cityLabel: string | null;
}) {
  const showCurl = Boolean(curlType && curlType !== "not_sure");
  const porosityLabel =
    porosity && porosity !== "not sure" ? `${capitalize(porosity)} Porosity` : null;
  const subline = [porosityLabel, cityLabel].filter(Boolean).join(" · ");

  return (
    <div
      id="routine-hero"
      className="flex h-[220px] w-full flex-col items-center justify-center bg-[#1C1612] px-4 text-center sm:h-[260px]"
    >
      <p className="font-serif text-[64px] italic leading-none text-bronze sm:text-[80px]">
        {showCurl ? curlType : "Your Hair"}
      </p>
      {subline && <p className="mt-3 font-sans text-[11px] text-muted">{subline}</p>}
      <p className="mt-2 font-serif text-lg text-cream">Your personalized 30-day routine</p>
    </div>
  );
}

// SECTION - "What to use today" teaser: the single most actionable
// thing on the page, so it sits immediately below the hero with no
// scrolling required. Distinct from TodayProducts further down (which
// shows the actual product cards) - this is a compact pointer to it.
function TodayTeaserCard({ data }: { data: RoutineData }) {
  const todayWash = data.calendarDays[0];
  const todayLabel = todayWash ? todayLabelForWashType(todayWash.washType) : "Rest day";
  const todayDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  function scrollToProducts() {
    document.getElementById("section-products")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function scrollToCalendar() {
    document.getElementById("section-calendar")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div id="section-today" className="px-4 sm:px-6">
      <div className="mx-auto -mt-6 max-w-3xl">
        <div className="rounded-lg border-l-4 border-bronze bg-[#2C2420] px-5 py-4 shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-bronze">Today</p>
              <p className="mt-0.5 font-sans text-[11px] text-muted">{todayDate}</p>
              <p className="mt-1.5 font-serif text-[22px] leading-tight text-cream">{todayLabel}</p>
              {todayWash ? (
                <button
                  type="button"
                  onClick={scrollToProducts}
                  className="mt-2 text-sm font-medium text-bronze2 underline underline-offset-2 hover:text-cream"
                >
                  Your products for today →
                </button>
              ) : (
                <p className="mt-2 text-sm text-cream/60">No wash products needed today.</p>
              )}
            </div>
            <button
              type="button"
              onClick={scrollToCalendar}
              aria-label="View full calendar"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-bronze/40"
            >
              <SmallCalendarIcon />
            </button>
          </div>
        </div>

        <ScrollTeaser />
      </div>
    </div>
  );
}

// Gentle bounce, tells the user exactly what's below the fold - stops
// once they've actually started scrolling (100px) so it doesn't nag
// forever.
function ScrollTeaser() {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    function onScroll() {
      if (window.scrollY > 100) setDismissed(true);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (dismissed) return null;

  return (
    <div className="print-hide flex flex-col items-center gap-1 py-6 text-center">
      <p className="font-sans text-[10px] text-muted">Your calendar · Your routine · Your products</p>
      <span className="routine-bounce text-bronze2">
        <ChevronDownIcon />
      </span>
    </div>
  );
}

// SECTION - full-bleed photo strip, a visual breath between the
// data-heavy calendar and the step-by-step routine. No "hero carousel"
// component exists elsewhere in this app to reuse (checked), so this
// pulls from the same Cloudinary stock set already used by the curl
// type selector on /profile, picked by the user's curl family for
// visual continuity with their profile.
const PHOTO_STRIP_IMAGES: Record<CurlFamily | "default", string[]> = {
  straight: [
    "https://res.cloudinary.com/kumxntij/image/upload/f_auto,q_auto/pexels-photo-35267456",
    "https://res.cloudinary.com/kumxntij/image/upload/f_auto,q_auto/pexels-fall-maple-1195057-2325807",
    "https://res.cloudinary.com/kumxntij/image/upload/f_auto,q_auto/pexels-photo-3356211",
  ],
  wavy: [
    "https://res.cloudinary.com/kumxntij/image/upload/f_auto,q_auto/pexels-ulrick-t-16207701",
    "https://res.cloudinary.com/kumxntij/image/upload/f_auto,q_auto/pexels-aibek-skakov-418917601-27679976",
    "https://res.cloudinary.com/kumxntij/image/upload/f_auto,q_auto/pexels-olga-somek-147015162-17889750",
  ],
  curly: [
    "https://res.cloudinary.com/kumxntij/image/upload/f_auto,q_auto/pexels-vlada-karpovich-4668513",
    "https://res.cloudinary.com/kumxntij/image/upload/f_auto,q_auto/pexels-soufianlafnesh-34579409",
    "https://res.cloudinary.com/kumxntij/image/upload/f_auto,q_auto/pexels-eddson-lens-748406628-28172264",
  ],
  coily: [
    "https://res.cloudinary.com/kumxntij/image/upload/f_auto,q_auto/pexels-polina-tankilevitch-7382918",
    "https://res.cloudinary.com/kumxntij/image/upload/f_auto,q_auto/pexels-jordy-toscano-712212447-27596675",
    "https://res.cloudinary.com/kumxntij/image/upload/f_auto,q_auto/pexels-praise-nnadozie-1081270006-38284790",
  ],
  default: [
    "https://res.cloudinary.com/kumxntij/image/upload/f_auto,q_auto/pexels-vlada-karpovich-4668513",
    "https://res.cloudinary.com/kumxntij/image/upload/f_auto,q_auto/pexels-polina-tankilevitch-7382918",
    "https://res.cloudinary.com/kumxntij/image/upload/f_auto,q_auto/pexels-aibek-skakov-418917601-27679976",
  ],
};

function PhotoStripDivider({ family }: { family: CurlFamily | null }) {
  const images = PHOTO_STRIP_IMAGES[family ?? "default"];
  return (
    <div className="-mx-4 grid h-[120px] grid-cols-3 sm:-mx-6">
      {images.map((src) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={src} src={src} alt="" className="h-full w-full object-cover" />
      ))}
    </div>
  );
}

// SECTION - warm-background title divider, used between routine steps
// and the product list. Serves as both the visual break and the section
// heading at once.
function WarmSectionTitle({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <div id={id} className="-mx-4 bg-warm px-4 py-8 text-center sm:-mx-6 sm:px-6">
      <p className="font-serif text-2xl italic text-dark">{children}</p>
    </div>
  );
}

// Cadence chips ("Every N weeks" / "Every N washes") derived from the
// already-computed 30-day calendar - no new data/API needed. Returns
// null when there isn't enough data in-window to infer a cadence
// (e.g. a type that only occurs once, or not at all, in 30 days).
function computeCadenceLabel(
  calendarDays: WashDay[],
  types: WashDayType[],
  unit: "weeks" | "washes"
): string | null {
  const matches = calendarDays
    .map((d, i) => ({ d, i }))
    .filter(({ d }) => types.includes(d.washType));
  if (matches.length < 2) return null;

  if (unit === "weeks") {
    const days = Math.round(
      (new Date(`${matches[1].d.date}T00:00:00`).getTime() -
        new Date(`${matches[0].d.date}T00:00:00`).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    const weeks = Math.max(1, Math.round(days / 7));
    return `Every ${weeks} week${weeks === 1 ? "" : "s"}`;
  }

  const washes = matches[1].i - matches[0].i;
  return `Every ${washes} wash${washes === 1 ? "" : "es"}`;
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
  { id: "section-today", label: "Today" },
  { id: "section-calendar", label: "Calendar" },
  { id: "section-routine", label: "Routine" },
  { id: "section-products", label: "Products" },
];

// Sticky mini-nav: hidden until the hero scrolls out of view, then
// tracks which of the four sections is currently in view (scroll-spy)
// and lets a tap jump straight to any of them.
function RoutineMiniNav() {
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState(MINI_NAV_SECTIONS[0].id);

  useEffect(() => {
    const hero = document.getElementById("routine-hero");
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
      { rootMargin: "-100px 0px -60% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, []);

  function goTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (!visible) return null;

  return (
    <div className="print-hide sticky top-0 z-40 border-b border-bronze/20 bg-[#1C1612]/95 backdrop-blur-md">
      <div className="no-scrollbar mx-auto flex max-w-3xl gap-1 overflow-x-auto px-4 sm:px-6">
        {MINI_NAV_SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => goTo(s.id)}
            className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-3 text-xs font-medium transition-colors ${
              active === s.id ? "border-bronze text-cream" : "border-transparent text-cream/50 hover:text-cream/80"
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
  // Hero subline ("Medium Porosity · Chicago") - resolved client-side
  // since /api/routine only returns the raw zip code.
  const [cityLabel, setCityLabel] = useState<string | null>(null);

  const showWelcome = searchParams.get("welcome") === "true" && !welcomeDismissed;

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/auth");
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/routine?user_id=${user!.id}`);
        if (res.status === 403) {
          if (!cancelled) router.replace("/dashboard");
          return;
        }
        if (!res.ok) throw new Error("Failed to load routine.");
        const json = await res.json();
        if (!cancelled) {
          setData(json);
          setStatus("ready");
        }
      } catch {
        if (!cancelled) router.replace("/dashboard");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
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
      <main className="flex min-h-screen items-center justify-center bg-dark font-sans">
        <p className="text-sm text-cream/60">Loading your routine...</p>
      </main>
    );
  }

  const firstName = data.firstName || "there";
  const family = curlFamily(data.curlType);
  const isChildOrBaby = data.profileFor === "child" || data.profileFor === "baby";
  const headerText = isChildOrBaby
    ? `Here's ${firstName}'s routine.`
    : `Your next 30 days, ${firstName}.`;
  const chips = [
    data.curlType && data.curlType !== "not_sure" ? `Curl type ${data.curlType}` : null,
    data.porosity && data.porosity !== "not sure" ? `${data.porosity} porosity` : null,
    data.scalpCondition
      ? SCALP_LABELS[data.scalpCondition] ?? data.scalpCondition
      : null,
    data.zipCode || null,
  ].filter((chip): chip is string => Boolean(chip));
  const hasPlaceholderCards = data.products.some((pick) => pick.noProductsYet);

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
    <main className="min-h-screen bg-dark font-sans text-cream">
      <RoutineHero curlType={data.curlType} porosity={data.porosity} cityLabel={cityLabel} />
      <TodayTeaserCard data={data} />
      <RoutineMiniNav />

      <div className="px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="hidden print:mb-8 print:block">
          <p className="font-serif text-2xl text-dark">
            Q<span className="italic">oyl</span>
          </p>
        </div>

        {showWelcome && (
          <div className="print-hide mb-6 flex items-start justify-between gap-4 rounded-lg bg-bronze px-4 py-3">
            <p className="text-sm text-dark">
              Your routine is ready. We will send your personalized monthly
              routine to your email within 24 hours. Bookmark this page - it
              updates every month.
            </p>
            <button
              type="button"
              onClick={() => setWelcomeDismissed(true)}
              className="shrink-0 text-sm text-dark/70 hover:text-dark"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        )}

        {/* SECTION 1 - Personal header */}
        <section>
          <div className="flex items-start justify-between gap-4">
            <h1 className="font-serif text-3xl font-semibold text-cream sm:text-4xl">
              {headerText}
            </h1>
            <Link
              href="/profile"
              className="print-hide mt-2 shrink-0 text-xs text-cream/50 underline underline-offset-2 hover:text-cream/70"
            >
              Edit my profile
            </Link>
          </div>

          {chips.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {chips.map((chip) => (
                <span
                  key={chip}
                  className="inline-block rounded-full border border-bronze/40 px-3 py-1 text-xs font-medium capitalize text-bronze2"
                >
                  {chip}
                </span>
              ))}
            </div>
          )}

          <p className="mt-4 text-sm text-cream/50">
            Updated monthly based on your hair profile and seasonal climate
            changes.
          </p>

          {hasPlaceholderCards && (
            <p className="mt-4 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-cream/90">
              We are actively expanding our product catalog. Some categories show
              ingredient guidance while we add more products. Check back soon - or{" "}
              <Link
                href="/request"
                className="print-hide underline underline-offset-2 hover:text-cream"
              >
                request a specific product evaluation
              </Link>
              .
            </p>
          )}

          {data.childSafetyNote && (
            <p className="mt-4 rounded-lg border border-bronze/40 bg-warm/10 px-4 py-3 text-sm text-cream/90">
              {data.childSafetyNote}
            </p>
          )}

          {data.focusNote && (
            <p className="mt-4 rounded-lg border border-bronze/40 bg-warm/10 px-4 py-3 text-sm text-cream/90">
              {data.focusNote}
            </p>
          )}
        </section>

        {isBothFocus && data.protectiveStyle && (
          <div className="print-hide mt-8 flex gap-2 border-b border-bronze/20">
            <button
              type="button"
              onClick={() => setActiveTab("natural")}
              className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "natural"
                  ? "border-bronze text-cream"
                  : "border-transparent text-cream/50 hover:text-cream/80"
              }`}
            >
              My Natural Hair
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("protective")}
              className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "protective"
                  ? "border-bronze text-cream"
                  : "border-transparent text-cream/50 hover:text-cream/80"
              }`}
            >
              My {data.protectiveStyle.styleLabel} Care
            </button>
          </div>
        )}

        {showNaturalRoutine && (
        <>
        {/* SECTION 2 - 30-day wash calendar. Full-bleed warm-cream
            section (edge to edge on mobile via negative margins that
            cancel the parent's px-4/sm:px-6 padding) - the dark wash-day
            cells inside pop against it instead of blending into the
            rest of the page. */}
        <section id="section-calendar" className="print-page-break -mx-4 mt-12 bg-warm px-4 py-6 sm:-mx-6 sm:px-6">
          <p className="text-center font-sans text-[9px] font-semibold uppercase tracking-[0.2em] text-bronze">
            Your 30-Day Calendar
          </p>
          <h2 className="mt-2 font-serif text-2xl font-semibold text-dark">
            Your next 30 days - starting {data.startDateLabel}
          </h2>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="inline-block rounded-full bg-dark px-3 py-1 text-xs font-medium text-cream">
              Your hair: wash every {data.washFrequency.min}-{data.washFrequency.max} days
            </span>
          </div>
          {family && (
            <p className="mt-2 text-sm text-dark/70">{FREQUENCY_EXPLANATION[family]}</p>
          )}

          <WashCalendarGrid calendarDays={data.calendarDays} family={family} />
        </section>

        <PhotoStripDivider family={family} />

        {/* SECTION 3 - Your wash day routine: four collapsible sequences,
            one per wash-day type. Regular is open by default since it's
            the day the user will hit most often. */}
        <section id="section-routine" className="print-page-break mt-12">
          <h2 className="font-serif text-2xl font-semibold text-cream">
            Your wash day routine
          </h2>
          <div className="mt-4 space-y-4">
            {data.stepsByWashType.map((washDay) => (
              <WashDayAccordion
                key={washDay.key}
                washDay={washDay}
                products={data.products}
                calendarDays={data.calendarDays}
                defaultOpen={washDay.key === "regular"}
              />
            ))}
          </div>

          {data.additionalNotes.length > 0 && (
            <div className="mt-6 space-y-4">
              {data.additionalNotes.map((note) => (
                <div key={note.title} className="rounded-xl border border-bronze/30 p-5">
                  <p className="font-serif text-lg text-cream">{note.title}</p>
                  <p className="mt-1 text-sm text-cream/70">{note.body}</p>
                  <p className="mt-2 text-xs text-cream/50">{note.why}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* SECTION 4 - Curated product list. The warm divider above acts
            as both the visual break from the routine steps and this
            section's title. */}
        <WarmSectionTitle id="section-products">Your curated product list</WarmSectionTitle>
        <section className="print-page-break mt-8">
          <div className="mt-4">
            <TodayProducts data={data} />
          </div>

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

          {data.avoidIngredients.length > 0 && (
            <div className="mt-8">
              <h3 className="font-serif text-xl font-semibold text-cream">
                Ingredients to avoid for your profile
              </h3>
              {data.profileFor === "baby" && (
                <p className="mt-1 text-sm text-cream/70">
                  Extra caution for an infant profile - these are flagged
                  more broadly than for an adult profile.
                </p>
              )}
              <ul className="mt-3 space-y-2">
                {data.avoidIngredients.map((ing) => (
                  <li
                    key={ing.ingredientName}
                    className={`rounded-lg border bg-red/5 px-4 py-3 ${
                      data.profileFor === "baby"
                        ? "border-red/60"
                        : "border-red/30"
                    }`}
                  >
                    <p className="text-sm font-medium text-red">
                      🚩 {ing.ingredientName}
                    </p>
                    {ing.reason && (
                      <p className="mt-1 text-xs text-cream/60">{ing.reason}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Link
            href="/how-we-score"
            className="print-hide mt-6 inline-block text-xs text-cream/50 underline underline-offset-2 hover:text-cream/70"
          >
            How is this score calculated? →
          </Link>
        </section>
        </>
        )}

        {showProtectiveRoutine && <ProtectiveStyleSection data={data} />}

        {/* SECTION 5 - Download */}
        <section className="print-hide mt-12">
          <button
            type="button"
            onClick={() => window.print()}
            className="w-full rounded-lg bg-bronze py-3 text-sm font-semibold text-dark transition-colors hover:bg-bronze2 sm:w-auto sm:px-8"
          >
            Download my routine →
          </button>
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

        <div className="print-hide mt-12 border-t border-bronze/20 pt-6">
          <button
            type="button"
            onClick={() => setShowDisclaimer((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-cream/50 transition-colors hover:text-cream/70"
          >
            About these recommendations
            <span
              className={`text-[10px] transition-transform ${
                showDisclaimer ? "rotate-180" : ""
              }`}
            >
              ▼
            </span>
          </button>
          <Collapse show={showDisclaimer}>
            <p className="text-xs leading-relaxed text-cream/50">
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
