"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import ShopButton from "@/components/ShopButton";
import { useAuth } from "@/lib/auth-context";
import { scoreTier, TIER_CLASSES } from "@/lib/compatibility";
import { classifyClimateFromDestination } from "@/lib/destinationClimate";
import type { ClimateZone } from "@/lib/locationFactors";
import { supabase } from "@/lib/supabase";
import type { TravelKitProduct } from "@/lib/travelKitGenerator";
import {
  EMPTY_SURVEY,
  HAIR_SITUATION_LABEL,
  hairSituationComplete,
  legacyProtectiveStyle,
  type Concern,
  type HairSituation,
  type ExtensionType,
  type NaturalUnderExtensions,
  type StyleAge,
  type TravelSurveyData,
  type TripLength,
  type UnderWig,
  type WashAccess,
  type WashFrequency,
  type WashPlan,
  type WigAdhesive,
  type WigType,
} from "@/lib/travelSurvey";

type DateMode = "exact" | "month";

const TRAVEL_TOOLS: { name: string; why: string; price: string; search: string }[] = [
  {
    name: "Mini Travel Diffuser",
    why: "A universal-fit collapsible diffuser so you can dry curls and waves without frizz in any hotel room.",
    price: "$8–18",
    search: "travel diffuser universal fit collapsible blow dryer",
  },
  {
    name: "TSA-Safe Spray Bottle (3.4 oz)",
    why: "Refresh and reactivate products on travel days. The small size passes through airport security.",
    price: "$5–10",
    search: "TSA spray bottle 3.4oz fine mist travel",
  },
  {
    name: "Wide Tooth Comb",
    why: "Detangle without breakage — works on wet or dry hair anywhere. Never leave home without one.",
    price: "$3–8",
    search: "wide tooth comb travel pocket seamless",
  },
  {
    name: "Microfiber Hair Towel",
    why: "Packs flat. Dries hair faster than a hotel bath towel and prevents the frizz terrycloth causes.",
    price: "$8–15",
    search: "microfiber hair towel turban travel lightweight",
  },
  {
    name: "Satin Bonnet or Travel Pillowcase",
    why: "Hotel pillowcases are always cotton — one night is enough to dry out and frizz your hair. Pack both.",
    price: "$8–20",
    search: "satin bonnet travel silk pillowcase case",
  },
];

const CLIMATE_LABELS: Record<string, string> = {
  humid: "Humid",
  tropical: "Tropical",
  dry: "Dry",
  "cold-dry": "Cold & dry",
};

const SWIMMING_OPTIONS: { value: string; label: string }[] = [
  { value: "no_swimming", label: "No swimming" },
  { value: "pool", label: "Pool swimming" },
  { value: "ocean", label: "Ocean or open water" },
  { value: "hot_tub", label: "Hot tub" },
  { value: "multiple", label: "Multiple (pool + ocean etc)" },
];

const PROTECTIVE_STYLE_OPTIONS: { value: string; label: string }[] = [
  { value: "none", label: "No - wearing my natural hair" },
  { value: "braids_twists", label: "Braids or twists" },
  { value: "weave_sew_in", label: "Weave or sew-in" },
  { value: "wig", label: "Wig" },
  { value: "locs", label: "Locs" },
  { value: "not_sure", label: "Not sure yet" },
];

function labelFor(options: { value: string; label: string }[], value: string | null) {
  return options.find((o) => o.value === value)?.label ?? value ?? "-";
}

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// <input type="month"> gives "2026-10" - converts to the human-readable
// "October 2026" that's actually stored/displayed.
function formatMonthInputValue(value: string): string {
  const d = new Date(`${value}-01T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// Single source of truth for "exact dates or month" display, used by
// both the Step 4 review line and the saved kit's header line.
function formatTripDateRange(
  departureDate: string | null,
  returnDate: string | null,
  travelMonth: string | null
): string {
  if (travelMonth) return travelMonth;
  if (!departureDate && !returnDate) return "-";
  return `${formatDate(departureDate)} to ${formatDate(returnDate)}`;
}

type TravelKitRow = {
  id: string;
  destination: string;
  departure_date: string | null;
  return_date: string | null;
  travel_month: string | null;
  climate: string | null;
  swimming: string | null;
  protective_style: string | null;
  hair_priority: string | null;
  status: string;
  products: TravelKitProduct[] | null;
};

function Pill({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full border px-4 py-3 text-left text-sm font-medium transition-colors ${
        selected
          ? "border-bronze bg-bronze text-cream"
          : "border-bronze/40 text-dark hover:border-bronze"
      }`}
    >
      {label}
    </button>
  );
}

function ProgressBar({ step, totalSteps }: { step: number; totalSteps: number }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-bronze">
        Step {step} of {totalSteps}
      </p>
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-bronze/20">
        <div
          className="h-full rounded-full bg-bronze transition-all duration-300 ease-out"
          style={{ width: `${(step / totalSteps) * 100}%` }}
        />
      </div>
    </div>
  );
}

function TravelKitProductCard({ item }: { item: TravelKitProduct }) {
  const tier = scoreTier(item.score);
  return (
    <li className={`rounded-lg border p-4 ${item.isBrandProduct ? "border-[#B08D57]/60 bg-cream/5" : "border-bronze/30"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-serif text-lg text-dark">{item.name}</p>
          <p className="text-xs text-muted">{item.brand}</p>
        </div>
        {item.score > 0 && (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${TIER_CLASSES[tier]}`}
          >
            {item.score}
          </span>
        )}
      </div>
      {item.isBrandProduct && (
        <span className="mt-1 inline-block rounded-full border border-[#B08D57] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#B08D57]">
          Qoyl Partner Brand
        </span>
      )}
      <p className="mt-2 text-sm text-dark/70">{item.reason}</p>
      <div className="mt-2 flex flex-wrap gap-3">
        {item.isBrandProduct ? (
          <>
            <a
              href={item.brandProductUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-bronze2 underline underline-offset-2 hover:text-dark"
            >
              Shop at {item.brand} →
            </a>
            {item.brandShopperUrl && (
              <a
                href={item.brandShopperUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-bronze2 underline underline-offset-2 hover:text-dark"
              >
                Shop at Shopper →
              </a>
            )}
          </>
        ) : (
          <ShopButton
            productName={item.name}
            brandName={item.brand}
            className="text-xs text-bronze2 underline underline-offset-2 hover:text-dark"
          />
        )}
      </div>
    </li>
  );
}

// ---- Shared backdrop ----
// Full-bleed photo behind every /travel view. Photo and overlay are fixed
// layers (z-0, z-1); view content sits in a z-2 wrapper above both. The
// bottom nav (z-[100]) stays above all of it.
const TRAVEL_BACKGROUND_URL =
  "https://cqpxiassldkmusngqorx.supabase.co/storage/v1/object/public/media/photos/12309587.jpeg";

function TravelShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-[100svh] overflow-x-hidden">
      <div className="fixed inset-0 z-0 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary already optimizes this (f_auto,q_auto); next/image would re-proxy it */}
        <img
          src={TRAVEL_BACKGROUND_URL}
          alt=""
          className="h-full w-full object-cover object-center"
        />
      </div>
      <div className="fixed inset-0 z-[1] bg-black/55" />
      <div className="relative z-[2]">{children}</div>
    </div>
  );
}

// ---- STATE A: landing ----

function LandingView({
  onBuildClick,
  error,
}: {
  onBuildClick: () => void;
  error: string | null;
}) {
  return (
    <main className="flex min-h-[100svh] items-center justify-center px-4 py-16 font-sans sm:px-6">
      <div className="mx-auto max-w-xl text-center">
        <h1
          className="font-sans font-bold lowercase text-white"
          style={{
            fontSize: "clamp(28px, 7vw, 48px)",
            letterSpacing: "-1.5px",
            lineHeight: 1.1,
            textShadow: "0 1px 8px rgba(0,0,0,0.8)",
          }}
        >
          pack right for your hair.
        </h1>
        <p
          className="mx-auto mt-5 max-w-lg font-sans font-light text-white/80"
          style={{ fontSize: "14px", marginBottom: "28px" }}
        >
          tell us where you&apos;re going — we&apos;ll build your travel kit.
        </p>

        {error && <p className="mt-4 text-sm text-red">{error}</p>}

        <button
          type="button"
          onClick={onBuildClick}
          className="mx-auto mt-2 flex h-[52px] w-full max-w-sm items-center justify-center rounded-full bg-bronze px-6 text-sm font-semibold text-cream transition-colors hover:bg-bronze2 sm:w-auto sm:px-10"
        >
          build my travel kit →
        </button>

        <p className="mt-4 text-xs text-white/70">
          Free. Yours to keep and shop from before you leave.
        </p>
      </div>
    </main>
  );
}

// ---- STATE B: survey ----

// Five steps: destination + dates, trip length, hair situation (with its
// follow-ups on the same step), water and concerns, review.
const TOTAL_SURVEY_STEPS = 5;

const TRIP_LENGTH_OPTIONS: { value: TripLength; label: string }[] = [
  { value: "short", label: "1-3 days" },
  { value: "week", label: "4-7 days" },
  { value: "two_weeks", label: "1-2 weeks" },
  { value: "extended", label: "2+ weeks" },
];

const HAIR_SITUATION_OPTIONS: { value: HairSituation; label: string; sub: string }[] = [
  { value: "natural", label: "my natural hair", sub: "styling day to day" },
  { value: "protective", label: "protective style installed", sub: "braids, twists, or locs already done" },
  { value: "wig", label: "wig", sub: "bringing one or more wigs" },
  { value: "extensions", label: "extensions", sub: "clip-ins, tape-ins, or sew-in" },
  { value: "mix", label: "mix", sub: "wig some days, natural others" },
];

const UNDER_WIG_OPTIONS: { value: UnderWig; label: string }[] = [
  { value: "full_hair", label: "full natural hair - I need products for both" },
  { value: "cornrows", label: "cornrows or braids - minimal" },
  { value: "minimal", label: "very short or shaved - scalp care only" },
];

const WIG_TYPE_OPTIONS: { value: WigType; label: string }[] = [
  { value: "human", label: "human hair" },
  { value: "synthetic", label: "synthetic" },
];

const WIG_ADHESIVE_OPTIONS: { value: WigAdhesive; label: string }[] = [
  { value: "glue", label: "glue or adhesive" },
  { value: "got2b", label: "got2b or freeze spray" },
  { value: "grip", label: "wig grip or band - no adhesive" },
];

const EXTENSION_TYPE_OPTIONS: { value: ExtensionType; label: string }[] = [
  { value: "clip_in", label: "clip-ins - I remove them nightly" },
  { value: "permanent", label: "tape-ins or sew-in - permanent for the trip" },
  { value: "braiding_hair", label: "braiding hair or faux locs already installed" },
];

const NATURAL_UNDER_EXTENSIONS_OPTIONS: { value: NaturalUnderExtensions; label: string }[] = [
  { value: "full", label: "full natural hair needing care" },
  { value: "minimal", label: "low maintenance - minimal needed" },
];

const STYLE_AGE_OPTIONS: { value: StyleAge; label: string }[] = [
  { value: "fresh", label: "fresh - just done" },
  { value: "recent", label: "1-2 weeks ago" },
  { value: "older", label: "3+ weeks - may need refreshing" },
];

const WASH_PLAN_OPTIONS: { value: WashPlan; label: string }[] = [
  { value: "none", label: "no - refresh only" },
  { value: "once", label: "yes - once" },
  { value: "multiple", label: "yes - multiple times" },
];

const WASH_ACCESS_OPTIONS: { value: WashAccess; label: string }[] = [
  { value: "full", label: "yes - full bathroom" },
  { value: "limited", label: "limited - hotel sink only" },
  { value: "minimal", label: "minimal - camping or similar" },
];

const WASH_FREQUENCY_OPTIONS: { value: WashFrequency; label: string }[] = [
  { value: "none", label: "not at all - refresh only" },
  { value: "once", label: "once during the trip" },
  { value: "regular", label: "every few days" },
];

const CONCERN_OPTIONS: { value: Concern; label: string }[] = [
  { value: "humidity", label: "humidity and frizz" },
  { value: "dry_climate", label: "dry climate - moisture retention" },
  { value: "color", label: "color protection" },
  { value: "scalp", label: "scalp concerns" },
  { value: "activity", label: "heavy sweating or activity" },
];

const HAIR_SITUATION_REVIEW_LABEL: Record<HairSituation, string> = HAIR_SITUATION_LABEL;

function SubQuestion<T extends string>({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <div className="mt-6">
      <p className="font-serif text-lg text-bronze2">{title}</p>
      <div className="mt-3 space-y-2.5">
        {options.map((option) => (
          <Pill
            key={option.value}
            label={option.label}
            selected={value === option.value}
            onClick={() => onChange(option.value)}
          />
        ))}
      </div>
    </div>
  );
}

function SurveyView({
  step,
  destination,
  setDestination,
  climate,
  dateMode,
  setDateMode,
  departureDate,
  setDepartureDate,
  returnDate,
  setReturnDate,
  travelMonthInput,
  setTravelMonthInput,
  survey,
  setSurveyField,
  onToggleConcern,
  onNext,
  onBack,
  onSubmit,
  submitting,
  submitError,
}: {
  step: number;
  destination: string;
  setDestination: (v: string) => void;
  climate: ClimateZone | null;
  dateMode: DateMode;
  setDateMode: (v: DateMode) => void;
  departureDate: string;
  setDepartureDate: (v: string) => void;
  returnDate: string;
  setReturnDate: (v: string) => void;
  travelMonthInput: string;
  setTravelMonthInput: (v: string) => void;
  survey: TravelSurveyData;
  setSurveyField: <K extends keyof TravelSurveyData>(key: K, value: TravelSurveyData[K]) => void;
  onToggleConcern: (c: Concern) => void;
  onNext: () => void;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
  submitError: string | null;
}) {
  const step1Valid =
    destination.trim().length > 0 &&
    Boolean(climate) &&
    (dateMode === "exact"
      ? Boolean(departureDate) && Boolean(returnDate) && returnDate >= departureDate
      : Boolean(travelMonthInput));
  const step2Valid = Boolean(survey.trip_length);
  const step3Valid = Boolean(survey.hair_situation) && hairSituationComplete(survey);
  const step4Valid = Boolean(survey.swimming);
  const stepValid = [step1Valid, step2Valid, step3Valid, step4Valid][step - 1] ?? false;

  return (
    <main className="min-h-[100svh] px-4 py-10 font-sans text-dark sm:px-6">
      <div className="mx-auto max-w-[480px] border border-dark bg-white p-7">
        <ProgressBar step={step} totalSteps={TOTAL_SURVEY_STEPS} />

        <div key={step} className="fade-step mt-8">
          {step === 1 && (
            <div>
              <h2 className="font-serif text-2xl font-semibold text-dark">Where are you headed?</h2>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Miami, FL or Paris, France"
                className="mt-4 w-full border border-bronze/40 bg-transparent px-4 py-3 text-sm text-dark placeholder:text-dark/40 focus:border-bronze focus:outline-none"
              />

              {climate && (
                <div className="mt-3">
                  <span className="inline-block rounded-full border border-bronze/40 px-3 py-1 text-xs font-medium text-bronze2">
                    Detected climate: {CLIMATE_LABELS[climate]}
                  </span>
                </div>
              )}

              <p className="mt-6 font-serif text-lg text-bronze2">Travel dates</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Pill
                  label="I know my exact dates"
                  selected={dateMode === "exact"}
                  onClick={() => setDateMode("exact")}
                />
                <Pill
                  label="I just know the month"
                  selected={dateMode === "month"}
                  onClick={() => setDateMode("month")}
                />
              </div>

              {dateMode === "exact" ? (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="departure-date" className="text-xs font-medium text-dark/70">
                      Departure date
                    </label>
                    <input
                      id="departure-date"
                      type="date"
                      value={departureDate}
                      onChange={(e) => setDepartureDate(e.target.value)}
                      className="mt-1.5 w-full border border-bronze/40 bg-transparent px-3 py-2.5 text-sm text-dark focus:border-bronze focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="return-date" className="text-xs font-medium text-dark/70">
                      Return date
                    </label>
                    <input
                      id="return-date"
                      type="date"
                      value={returnDate}
                      min={departureDate || undefined}
                      onChange={(e) => setReturnDate(e.target.value)}
                      className="mt-1.5 w-full border border-bronze/40 bg-transparent px-3 py-2.5 text-sm text-dark focus:border-bronze focus:outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-4">
                  <label htmlFor="travel-month" className="text-xs font-medium text-dark/70">
                    Month of travel
                  </label>
                  <input
                    id="travel-month"
                    type="month"
                    value={travelMonthInput}
                    onChange={(e) => setTravelMonthInput(e.target.value)}
                    className="mt-1.5 w-full border border-bronze/40 bg-transparent px-3 py-2.5 text-sm text-dark focus:border-bronze focus:outline-none"
                  />
                </div>
              )}

              <div className="mt-4 border-l-2 border-bronze bg-warm px-4 py-3">
                <p className="text-[12px] leading-relaxed text-dark/80">
                  Why we ask for your travel dates: if you have a Qoyl routine subscription, we
                  will send you updated routine reminders specific to your destination climate
                  during your trip dates. If you only know the month, we will use that as the
                  reference window instead.
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="font-serif text-2xl font-semibold text-dark">How long is your trip?</h2>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {TRIP_LENGTH_OPTIONS.map((option) => (
                  <Pill
                    key={option.value}
                    label={option.label}
                    selected={survey.trip_length === option.value}
                    onClick={() => setSurveyField("trip_length", option.value)}
                  />
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="font-serif text-2xl font-semibold text-dark">
                What will your hair be doing on this trip?
              </h2>
              <div className="mt-4 space-y-2.5">
                {HAIR_SITUATION_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSurveyField("hair_situation", option.value)}
                    className={`w-full border px-4 py-3 text-left transition-colors ${
                      survey.hair_situation === option.value
                        ? "border-bronze bg-bronze text-cream"
                        : "border-bronze/40 text-dark hover:border-bronze"
                    }`}
                  >
                    <span className="block text-sm font-medium">{option.label}</span>
                    <span
                      className={`block text-xs ${
                        survey.hair_situation === option.value ? "text-cream/80" : "text-dark/60"
                      }`}
                    >
                      {option.sub}
                    </span>
                  </button>
                ))}
              </div>

              {survey.hair_situation === "wig" && (
                <div className="fade-step">
                  <SubQuestion
                    title="what's under the wig?"
                    options={UNDER_WIG_OPTIONS}
                    value={survey.under_wig}
                    onChange={(v) => setSurveyField("under_wig", v)}
                  />
                  <SubQuestion
                    title="what type of wig?"
                    options={WIG_TYPE_OPTIONS}
                    value={survey.wig_type}
                    onChange={(v) => setSurveyField("wig_type", v)}
                  />
                  <SubQuestion
                    title="how do you secure it?"
                    options={WIG_ADHESIVE_OPTIONS}
                    value={survey.wig_adhesive}
                    onChange={(v) => setSurveyField("wig_adhesive", v)}
                  />
                </div>
              )}

              {survey.hair_situation === "extensions" && (
                <div className="fade-step">
                  <SubQuestion
                    title="what type of extensions?"
                    options={EXTENSION_TYPE_OPTIONS}
                    value={survey.extension_type}
                    onChange={(v) => setSurveyField("extension_type", v)}
                  />
                  <SubQuestion
                    title="what's your natural hair underneath like?"
                    options={NATURAL_UNDER_EXTENSIONS_OPTIONS}
                    value={survey.natural_under_extensions}
                    onChange={(v) => setSurveyField("natural_under_extensions", v)}
                  />
                </div>
              )}

              {survey.hair_situation === "protective" && (
                <div className="fade-step">
                  <SubQuestion
                    title="when was it installed?"
                    options={STYLE_AGE_OPTIONS}
                    value={survey.style_age}
                    onChange={(v) => setSurveyField("style_age", v)}
                  />
                  <SubQuestion
                    title="will you wash it on this trip?"
                    options={WASH_PLAN_OPTIONS}
                    value={survey.wash_plan}
                    onChange={(v) => setSurveyField("wash_plan", v)}
                  />
                </div>
              )}

              {(survey.hair_situation === "natural" || survey.hair_situation === "mix") && (
                <div className="fade-step">
                  <SubQuestion
                    title="will you have washing access?"
                    options={WASH_ACCESS_OPTIONS}
                    value={survey.wash_access}
                    onChange={(v) => setSurveyField("wash_access", v)}
                  />
                  <SubQuestion
                    title="how often will you wash?"
                    options={WASH_FREQUENCY_OPTIONS}
                    value={survey.wash_frequency}
                    onChange={(v) => setSurveyField("wash_frequency", v)}
                  />
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 className="font-serif text-2xl font-semibold text-dark">
                Will you be swimming or in water?
              </h2>
              <div className="mt-4 space-y-2.5">
                {SWIMMING_OPTIONS.map((option) => (
                  <Pill
                    key={option.value}
                    label={option.label}
                    selected={survey.swimming === option.value}
                    onClick={() => setSurveyField("swimming", option.value)}
                  />
                ))}
              </div>

              <p className="mt-8 font-serif text-lg text-bronze2">anything specific to pack for?</p>
              <p className="mt-1 text-xs text-dark/60">select all that apply</p>
              <div className="mt-3 space-y-2.5">
                {CONCERN_OPTIONS.map((option) => (
                  <Pill
                    key={option.value}
                    label={option.label}
                    selected={survey.concerns.includes(option.value)}
                    onClick={() => onToggleConcern(option.value)}
                  />
                ))}
              </div>
            </div>
          )}

          {step === 5 && (
            <div>
              <h2 className="font-serif text-2xl font-semibold text-dark">Review your trip</h2>
              <div className="mt-4 border border-bronze/40 p-4 text-sm leading-relaxed text-dark/80">
                <p>
                  <span className="font-medium text-dark">{destination}</span>
                  {climate ? ` · ${CLIMATE_LABELS[climate]}` : ""}
                </p>
                <p>{labelFor(TRIP_LENGTH_OPTIONS, survey.trip_length)}</p>
                <p>
                  {survey.hair_situation ? HAIR_SITUATION_REVIEW_LABEL[survey.hair_situation] : "-"}
                  {survey.hair_situation === "wig" && survey.wig_type ? ` · ${survey.wig_type} wig` : ""}
                </p>
                <p>{labelFor(SWIMMING_OPTIONS, survey.swimming)}</p>
                {survey.concerns.length > 0 && (
                  <p>{survey.concerns.map((c) => labelFor(CONCERN_OPTIONS, c)).join(" · ")}</p>
                )}
              </div>
              <p className="mt-4 text-sm text-dark/70">
                Based on your profile and trip details we will build you a personalized list of
                products. Ready?
              </p>

              {submitError && <p className="mt-4 text-sm text-red">{submitError}</p>}

              <button
                type="button"
                onClick={onSubmit}
                disabled={submitting}
                className="mt-6 w-full rounded-lg bg-bronze py-4 text-sm font-semibold text-cream transition-colors hover:bg-bronze2 disabled:opacity-50"
              >
                {submitting ? "Please wait..." : "build my travel kit →"}
              </button>
            </div>
          )}
        </div>

        {step < TOTAL_SURVEY_STEPS && (
          <div className="mt-8 flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={onBack}
                className="text-sm text-bronze2 underline underline-offset-2 hover:text-dark"
              >
                ← Back
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={onNext}
              disabled={!stepValid}
              className="bg-bronze px-6 py-3 text-sm font-semibold text-cream transition-colors hover:bg-bronze2 disabled:opacity-50"
            >
              Next →
            </button>
          </div>
        )}
        {step === TOTAL_SURVEY_STEPS && (
          <div className="mt-6">
            <button
              type="button"
              onClick={onBack}
              className="text-sm text-bronze2 underline underline-offset-2 hover:text-dark"
            >
              ← Back
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

// ---- Loading transition ----

function GeneratingView({ destination }: { destination: string }) {
  return (
    <TravelShell>
      <main className="flex min-h-[100svh] flex-col items-center justify-center px-4 font-sans text-white">
        <h1
          className="font-serif text-2xl font-bold lowercase text-white"
          style={{ textShadow: "0 1px 8px rgba(0,0,0,0.8)" }}
        >
          qoyl
        </h1>
        <div className="mt-8 flex gap-2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-2.5 w-2.5 animate-bounce rounded-full bg-bronze"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
        <p
          className="mt-8 font-serif text-xl text-white"
          style={{ textShadow: "0 1px 8px rgba(0,0,0,0.8)" }}
        >
          Building your kit for {destination}...
        </p>
      </main>
    </TravelShell>
  );
}

// ---- STATE C: kit ready ----

function KitView({
  kit,
  welcome,
  activeKits,
  onSwitchKit,
  onBuildAnother,
  pollExhausted,
}: {
  kit: TravelKitRow;
  welcome: boolean;
  activeKits: { id: string; destination: string; created_at: string }[];
  onSwitchKit: (id: string) => void;
  onBuildAnother: () => void;
  pollExhausted: boolean;
}) {
  const products = kit.products ?? [];
  const otherKits = activeKits.filter((k) => k.id !== kit.id);
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const ready = isKitReady(kit);

  // Pre-shampoo is excluded from every travel kit (see pickCategories in
  // lib/travelKitGenerator.ts - it's simply never one of the categories a
  // kit draws from) - not practical to pack and use on a trip. Shown only
  // as a note when the user's own /routine actually has a pre-shampoo
  // pick, via the same lightweight check /search uses.
  const { hairProfile } = useAuth();
  const [showPreShampooExcludedNote, setShowPreShampooExcludedNote] = useState(false);
  useEffect(() => {
    if (!hairProfile) {
      setShowPreShampooExcludedNote(false);
      return;
    }
    let cancelled = false;
    const params = new URLSearchParams();
    if (hairProfile.curl_type) params.set("curl_type", hairProfile.curl_type);
    if (hairProfile.porosity) params.set("porosity", hairProfile.porosity);
    fetch(`/api/pre-shampoo-check?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setShowPreShampooExcludedNote(Boolean(data.hasPick));
      })
      .catch(() => {
        if (!cancelled) setShowPreShampooExcludedNote(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hairProfile]);

  return (
    <main className="min-h-[100svh] px-4 py-10 font-sans text-dark sm:px-6">
      <div className="mx-auto max-w-md border border-dark bg-white/[0.97] p-7">
        {welcome && ready && !welcomeDismissed && (
          <div className="mb-4 flex items-start justify-between gap-4 bg-bronze px-4 py-3">
            <p className="text-sm text-dark">
              Your travel kit for {kit.destination} is ready. Shop each
              product before you pack.
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

        <div className="flex items-start justify-between gap-4">
          <h1 className="font-serif text-3xl font-semibold text-dark">
            Your travel kit
          </h1>
          {otherKits.length > 0 && (
            <select
              value=""
              onChange={(e) => e.target.value && onSwitchKit(e.target.value)}
              aria-label="View a different trip"
              className="shrink-0 border border-bronze/40 bg-white px-2 py-1.5 text-xs text-dark/70 focus:border-bronze focus:outline-none"
            >
              <option value="">View a different trip →</option>
              {otherKits.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.destination}
                </option>
              ))}
            </select>
          )}
        </div>
        <p className="mt-1 text-sm font-medium text-bronze2">
          {kit.destination} ·{" "}
          {formatTripDateRange(kit.departure_date, kit.return_date, kit.travel_month)}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {kit.climate && (
            <span className="rounded-full border border-bronze/40 px-3 py-1 text-xs font-medium text-bronze2">
              {CLIMATE_LABELS[kit.climate] ?? kit.climate}
            </span>
          )}
          {kit.swimming && (
            <span className="rounded-full border border-bronze/40 px-3 py-1 text-xs font-medium text-bronze2">
              {labelFor(SWIMMING_OPTIONS, kit.swimming)}
            </span>
          )}
          {kit.protective_style && (
            <span className="rounded-full border border-bronze/40 px-3 py-1 text-xs font-medium text-bronze2">
              {labelFor(PROTECTIVE_STYLE_OPTIONS, kit.protective_style)}
            </span>
          )}
        </div>

        {!ready && (
          <div className="mt-6 flex items-center gap-3 border border-bronze/30 px-4 py-3">
            {!pollExhausted && (
              <div className="flex shrink-0 gap-1.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-bronze"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            )}
            <p className="text-sm text-dark/70">
              {pollExhausted
                ? "Your kit is being prepared - check back in a moment or refresh this page. We have also sent your kit to your email."
                : kit.status === "pending_payment"
                ? "Building your kit..."
                : "Finalizing your kit..."}
            </p>
          </div>
        )}

        {products.length > 0 && (
          <ul className="mt-6 space-y-3">
            {products.map((item) => (
              <TravelKitProductCard key={item.catalogProductId} item={item} />
            ))}
          </ul>
        )}

        {products.length > 0 && showPreShampooExcludedNote && (
          <p className="mt-4 font-sans text-[12px] font-light text-[#666]">
            pre-shampoo excluded from your travel kit — not practical for travel. continue your
            regular pre-shampoo routine when you return.
          </p>
        )}

        {ready && products.length < 5 && (
          <p className="mt-4 text-sm text-dark/60">
            We found {products.length} product
            {products.length === 1 ? "" : "s"} for your trip.{" "}
            <Link
              href="/request"
              className="text-bronze2 underline underline-offset-2 hover:text-dark"
            >
              Request a product evaluation
            </Link>{" "}
            to add more →
          </p>
        )}

        {ready && (
          <div className="mt-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-bronze">
              Essential Travel Tools
            </p>
            <ul className="mt-3 space-y-2">
              {TRAVEL_TOOLS.map((tool) => (
                <li key={tool.name} className="border border-bronze/30 px-4 py-3 space-y-1">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm font-medium text-dark">{tool.name}</span>
                    <a
                      href={`https://www.amazon.com/s?k=${encodeURIComponent(tool.search)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-bronze2 underline shrink-0"
                    >
                      Amazon →
                    </a>
                  </div>
                  <p className="text-xs text-dark/60 leading-relaxed">{tool.why}</p>
                  <p className="text-xs text-dark/40">{tool.price}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-6 text-xs text-dark/50">
          Your kit is a curated digital guide - click each link to purchase
          directly from the brand or retailer. All products are
          independently evaluated by Qoyl with no brand partnerships
          influencing recommendations.
        </p>

        <button
          type="button"
          onClick={onBuildAnother}
          className="mt-8 w-full border border-bronze/40 py-3 text-sm font-semibold text-dark transition-colors hover:border-bronze"
        >
          Plan another trip →
        </button>
      </div>
    </main>
  );
}

// ---- Root component / state machine ----

type View = "landing" | "survey" | "generating" | "kit";

const KIT_ROW_COLUMNS =
  "id, destination, departure_date, return_date, travel_month, climate, swimming, protective_style, hair_priority, status, products";

const KIT_POLL_INTERVAL_MS = 2000;
const KIT_POLL_MAX_ATTEMPTS = 10;

function isKitReady(row: Pick<TravelKitRow, "status" | "products"> | null): boolean {
  return Boolean(row) && row!.status === "active" && row!.products !== null;
}

// Client side of kit generation: the kit row is the source of truth, so we
// poll it instead of trusting the generate request to come back. The
// timeout sits a little above the server's own 25s limit, so the server's
// 'failed' row usually arrives first.
const KIT_BUILD_TIMEOUT_MS = 28_000;

type KitBuildOutcome = { status: "active" } | { status: "failed"; message: string };

async function waitForKit(travelKitId: string): Promise<KitBuildOutcome> {
  const started = Date.now();
  while (Date.now() - started < KIT_BUILD_TIMEOUT_MS) {
    await new Promise((resolve) => setTimeout(resolve, KIT_POLL_INTERVAL_MS));
    const { data } = await supabase
      .from("travel_kits")
      .select("status, error_message")
      .eq("id", travelKitId)
      .maybeSingle();
    if (data?.status === "active") return { status: "active" };
    if (data?.status === "failed") {
      return { status: "failed", message: data.error_message || "Something went wrong. Please try again." };
    }
  }
  return {
    status: "failed",
    message: "This is taking longer than expected. Please try again.",
  };
}

function TravelPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const kitIdParam = searchParams.get("kit");
  const welcome = searchParams.get("welcome") === "true";
  const forceNewParam = searchParams.get("new") === "true";

  const [view, setView] = useState<View>("landing");
  const [resolvingKit, setResolvingKit] = useState(true);
  const [kit, setKit] = useState<TravelKitRow | null>(null);
  const [activeKits, setActiveKits] = useState<
    { id: string; destination: string; created_at: string }[]
  >([]);
  const [landingError, setLandingError] = useState<string | null>(null);

  // Set right before an explicit "start a new trip" action (Plan another
  // trip / Build my travel kit) so the auto-detection effect below never
  // fights that choice - e.g. clearing ?kit= from the URL after clicking
  // "Plan another trip" would otherwise re-trigger this effect, which
  // would then re-select the most recent active kit and silently bounce
  // the user right back to the kit view they just tried to leave.
  const skipAutoKitRef = useRef(false);

  // Resolves which kit (if any) to show. Two cases:
  // - ?kit=<id> present (dashboard's "View kit" link, the post-submit
  //    redirect, or the trip switcher below): load that exact row
  //    regardless of status - KitView already renders a "still being
  //    generated" note if it isn't 'active' yet.
  // - No ?kit= (a bare /travel visit): look up the user's active kits
  //    and default to the most recent one by created_at, so a returning
  //    user sees their kit immediately instead of the landing page.
  // Either way, the full list of active kits is loaded too, so the "view
  // a different trip" switcher works regardless of which path launched
  // the kit view.
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setResolvingKit(false);
      return;
    }
    // ?new=true (the dashboard's "Plan another trip" link) always starts
    // a fresh survey, bypassing auto-detection entirely - same intent
    // as clicking "Plan another trip" from the kit view itself.
    if (forceNewParam) {
      skipAutoKitRef.current = true;
      setView("survey");
      setResolvingKit(false);
      return;
    }
    if (skipAutoKitRef.current) {
      setResolvingKit(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setResolvingKit(true);

      const { data: kitsList } = await supabase
        .from("travel_kits")
        .select("id, destination, created_at")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (cancelled) return;
      setActiveKits(kitsList ?? []);

      const targetId = kitIdParam ?? kitsList?.[0]?.id ?? null;
      if (!targetId) {
        setResolvingKit(false);
        return;
      }

      const { data } = await supabase
        .from("travel_kits")
        .select(KIT_ROW_COLUMNS)
        .eq("id", targetId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;
      if (data) {
        setKit(data as TravelKitRow);
        setView("kit");
      }
      setResolvingKit(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [kitIdParam, user, authLoading, forceNewParam]);

  // The submit handler awaits generation before redirecting, so the row
  // is normally ready on arrival - but a slow or refreshed load can still
  // land on a row that isn't active yet. Without this, the page would sit
  // on "still being generated" forever
  // until the user manually refreshes. Polls the same row every 2s (up
  // to 10 tries) while it's showing but not ready, and updates `kit` in
  // place as soon as it is. Also covers the "active but products still
  // null" gap defensively, even though activateTravelKit currently sets
  // both fields in the same update.
  const [pollExhausted, setPollExhausted] = useState(false);
  const kitReady = isKitReady(kit);

  useEffect(() => {
    if (!kit || view !== "kit" || kitReady) {
      setPollExhausted(false);
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const intervalId = setInterval(async () => {
      attempts += 1;
      const { data } = await supabase
        .from("travel_kits")
        .select(KIT_ROW_COLUMNS)
        .eq("id", kit.id)
        .maybeSingle();

      if (cancelled) return;

      const row = (data as TravelKitRow | null) ?? null;
      if (row) setKit(row);

      if (isKitReady(row) || attempts >= KIT_POLL_MAX_ATTEMPTS) {
        clearInterval(intervalId);
        if (!isKitReady(row)) setPollExhausted(true);
      }
    }, KIT_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kit?.id, kitReady, view]);

  // ---- survey state ----
  const [step, setStep] = useState(1);
  const [destination, setDestination] = useState("");
  const [climate, setClimate] = useState<ClimateZone | null>(null);
  const [dateMode, setDateMode] = useState<DateMode>("exact");
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [travelMonthInput, setTravelMonthInput] = useState("");
  const [survey, setSurvey] = useState<TravelSurveyData>(EMPTY_SURVEY);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pendingKitId, setPendingKitId] = useState<string | null>(null);

  // Climate is fully auto-detected from the destination text now - no
  // manual override exists, so this is the single source of truth for
  // `climate` rather than just a suggestion. Falls back to "humid" (the
  // most common classification, per classifyClimateFromState's own
  // default) when the destination doesn't match a known state code or
  // curated international city, so the survey never gets stuck with no
  // climate value and nothing for the user to pick instead.
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!destination.trim()) {
        setClimate(null);
        return;
      }
      setClimate(classifyClimateFromDestination(destination) ?? "humid");
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [destination]);

  function setSurveyField<K extends keyof TravelSurveyData>(key: K, value: TravelSurveyData[K]) {
    setSurvey((prev) => ({ ...prev, [key]: value }));
  }

  function toggleConcern(concern: Concern) {
    setSurvey((prev) => ({
      ...prev,
      concerns: prev.concerns.includes(concern)
        ? prev.concerns.filter((c) => c !== concern)
        : [...prev.concerns, concern],
    }));
  }

  function resetSurvey() {
    setStep(1);
    setDestination("");
    setClimate(null);
    setDateMode("exact");
    setDepartureDate("");
    setReturnDate("");
    setTravelMonthInput("");
    setSurvey(EMPTY_SURVEY);
    setSubmitError(null);
    setPendingKitId(null);
  }

  function handleBuildClick() {
    if (!user) {
      router.push("/auth");
      return;
    }
    setLandingError(null);
    resetSurvey();
    setView("survey");
  }

  function handleBuildAnother() {
    skipAutoKitRef.current = true;
    resetSurvey();
    setKit(null);
    router.replace("/travel", { scroll: false });
    setView("survey");
  }

  function handleSwitchKit(id: string) {
    router.push(`/travel?kit=${id}`);
  }

  async function handleSurveySubmit() {
    if (!user) {
      router.push("/auth");
      return;
    }
    setSubmitError(null);
    setSubmitting(true);

    // A failed build clears pendingKitId (see failSurvey), so the next submit
    // saves a fresh row with the answers as they are now - a retry never
    // silently reuses an old row with stale answers.
    const failSurvey = (message: string) => {
      setSubmitError(message);
      setSubmitting(false);
      setPendingKitId(null);
      setView("survey");
    };

    try {
      let travelKitId = pendingKitId;

      if (!travelKitId) {
        // Single server-side route saves the row (service role client) and
        // sends the admin notification - see app/api/travel-kits/route.ts.
        const saveRes = await fetch("/api/travel-kits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: user.id,
            destination: destination.trim(),
            departure_date: dateMode === "exact" ? departureDate || null : null,
            return_date: dateMode === "exact" ? returnDate || null : null,
            travel_month:
              dateMode === "month" && travelMonthInput
                ? formatMonthInputValue(travelMonthInput)
                : null,
            climate,
            swimming: survey.swimming,
            // Legacy column, still read by KitView and older email paths.
            protective_style: legacyProtectiveStyle(survey),
            hair_priority: null,
            trip_length: survey.trip_length,
            hair_situation: survey.hair_situation,
            under_wig: survey.under_wig,
            wig_type: survey.wig_type,
            wig_adhesive: survey.wig_adhesive,
            extension_type: survey.extension_type,
            natural_under_extensions: survey.natural_under_extensions,
            style_age: survey.style_age,
            wash_plan: survey.wash_plan,
            wash_access: survey.wash_access,
            wash_frequency: survey.wash_frequency,
            concerns: survey.concerns,
          }),
        });
        const saveData = await saveRes.json();

        if (!saveRes.ok || !saveData.id) {
          failSurvey(saveData.error ?? "Couldn't save your trip details. Please try again.");
          return;
        }

        travelKitId = saveData.id;
        setPendingKitId(travelKitId);
      }

      if (!travelKitId) throw new Error("No travel kit id after save.");
      setView("generating");

      // Fire the build; the outcome comes from the kit row. The response is
      // only read for an early failure, so a slow response can't hold the
      // screen open.
      const generatePromise = fetch("/api/travel-kits/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, travel_kit_id: travelKitId }),
      })
        .then(async (res) => ({ ok: res.ok, body: await res.json().catch(() => ({})) }))
        .catch(() => null);

      const earlyFailure = generatePromise.then((result) =>
        result && !result.ok && result.body?.status === "failed"
          ? (result.body.error as string) ?? "Something went wrong. Please try again."
          : null
      );

      const outcome = await Promise.race([
        waitForKit(travelKitId),
        earlyFailure.then((message) =>
          message ? ({ status: "failed", message } as KitBuildOutcome) : new Promise<never>(() => {})
        ),
      ]);

      if (outcome.status === "active") {
        router.push(`/travel?kit=${travelKitId}&welcome=true`);
        return;
      }
      failSurvey(outcome.message);
    } catch {
      failSurvey("Couldn't reach the server. Please try again.");
    }
  }

  if (authLoading || resolvingKit) {
    return (
      <TravelShell>
        <main className="flex min-h-[100svh] items-center justify-center font-sans">
          <p className="text-sm text-white/80">Loading...</p>
        </main>
      </TravelShell>
    );
  }

  if (view === "kit" && kit) {
    return (
      <TravelShell>
        <KitView
          kit={kit}
          welcome={welcome}
          activeKits={activeKits}
          onSwitchKit={handleSwitchKit}
          onBuildAnother={handleBuildAnother}
          pollExhausted={pollExhausted}
        />
      </TravelShell>
    );
  }

  if (view === "generating") {
    return <GeneratingView destination={destination} />;
  }

  if (view === "survey") {
    return (
      <TravelShell>
        <SurveyView
          step={step}
          destination={destination}
          setDestination={setDestination}
          climate={climate}
          dateMode={dateMode}
          setDateMode={setDateMode}
          departureDate={departureDate}
          setDepartureDate={setDepartureDate}
          returnDate={returnDate}
          setReturnDate={setReturnDate}
          travelMonthInput={travelMonthInput}
          setTravelMonthInput={setTravelMonthInput}
          survey={survey}
          setSurveyField={setSurveyField}
          onToggleConcern={toggleConcern}
          onNext={() => setStep((s) => Math.min(TOTAL_SURVEY_STEPS, s + 1))}
          onBack={() => setStep((s) => Math.max(1, s - 1))}
          onSubmit={handleSurveySubmit}
          submitting={submitting}
          submitError={submitError}
        />
      </TravelShell>
    );
  }

  return (
    <TravelShell>
      <LandingView onBuildClick={handleBuildClick} error={landingError} />
    </TravelShell>
  );
}

export default function TravelPage() {
  return (
    <Suspense fallback={null}>
      <TravelPageContent />
    </Suspense>
  );
}
