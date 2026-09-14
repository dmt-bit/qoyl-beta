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

type DateMode = "exact" | "month";

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

const HAIR_PRIORITY_OPTIONS: { value: string; label: string }[] = [
  { value: "low_maintenance", label: "Low maintenance - keep it simple" },
  {
    value: "moisture",
    label: "Moisture retention - my hair gets dry when I travel",
  },
  {
    value: "definition",
    label: "Definition and styling - I want my hair to look great",
  },
  {
    value: "scalp_health",
    label: "Scalp health - focus on keeping my scalp fresh",
  },
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

// ---- STATE A: landing ----

function LandingView({
  onBuildClick,
  error,
  cancelled,
}: {
  onBuildClick: () => void;
  error: string | null;
  cancelled: boolean;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4 py-16 font-sans text-dark sm:px-6">
      <div className="mx-auto max-w-xl text-center">
        <h1 className="font-serif text-4xl font-semibold leading-tight text-dark sm:text-5xl">
          Your hair goes where you go.
        </h1>
        <p className="mx-auto mt-5 max-w-lg text-base text-dark/70">
          Different climates, different water, different routines. Tell us
          where you&apos;re headed and we will build you a personalized list
          of 5 products matched to your hair profile and your destination.
        </p>

        {cancelled && (
          <p className="mt-4 text-sm text-dark/60">
            No worries - you can build your kit anytime.
          </p>
        )}
        {error && <p className="mt-4 text-sm text-red">{error}</p>}

        <button
          type="button"
          onClick={onBuildClick}
          className="mx-auto mt-8 flex h-[52px] w-full max-w-sm items-center justify-center rounded-full bg-bronze px-6 text-sm font-semibold text-cream transition-colors hover:bg-bronze2 sm:w-auto sm:px-10"
        >
          Build my travel kit - $4.99 →
        </button>

        <p className="mt-4 text-xs text-dark/50">
          One-time purchase. Yours to keep and shop from before you leave.
        </p>
      </div>
    </main>
  );
}

// ---- STATE B: survey ----

function SurveyView({
  step,
  totalSteps,
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
  swimming,
  setSwimming,
  protectiveStyle,
  setProtectiveStyle,
  hairPriority,
  setHairPriority,
  onNext,
  onBack,
  onSubmit,
  submitting,
  submitError,
}: {
  step: number;
  totalSteps: number;
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
  swimming: string | null;
  setSwimming: (v: string) => void;
  protectiveStyle: string | null;
  setProtectiveStyle: (v: string) => void;
  hairPriority: string | null;
  setHairPriority: (v: string) => void;
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
  const step2Valid = Boolean(swimming);
  const step3Valid = Boolean(protectiveStyle) && Boolean(hairPriority);

  return (
    <main className="min-h-screen bg-white px-4 py-10 font-sans text-dark sm:px-6">
      <div className="mx-auto max-w-md">
        <ProgressBar step={step} totalSteps={totalSteps} />

        <div key={step} className="fade-step mt-8">
          {step === 1 && (
            <div>
              <h2 className="font-serif text-2xl font-semibold text-dark">
                Where are you headed?
              </h2>
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
              <h2 className="font-serif text-2xl font-semibold text-dark">
                Will you be swimming or in water?
              </h2>
              <div className="mt-4 space-y-2.5">
                {SWIMMING_OPTIONS.map((option) => (
                  <Pill
                    key={option.value}
                    label={option.label}
                    selected={swimming === option.value}
                    onClick={() => setSwimming(option.value)}
                  />
                ))}
              </div>
              <p className="mt-4 text-xs text-dark/50">
                Chlorine, salt water, and minerals affect your hair
                differently. This helps us include the right protective and
                clarifying products.
              </p>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="font-serif text-2xl font-semibold text-dark">
                Are you planning a protective style for this trip?
              </h2>
              <div className="mt-4 space-y-2.5">
                {PROTECTIVE_STYLE_OPTIONS.map((option) => (
                  <Pill
                    key={option.value}
                    label={option.label}
                    selected={protectiveStyle === option.value}
                    onClick={() => setProtectiveStyle(option.value)}
                  />
                ))}
              </div>

              <h2 className="mt-8 font-serif text-2xl font-semibold text-dark">
                What&apos;s your hair priority on this trip?
              </h2>
              <div className="mt-4 space-y-2.5">
                {HAIR_PRIORITY_OPTIONS.map((option) => (
                  <Pill
                    key={option.value}
                    label={option.label}
                    selected={hairPriority === option.value}
                    onClick={() => setHairPriority(option.value)}
                  />
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 className="font-serif text-2xl font-semibold text-dark">
                Review your trip
              </h2>
              <p className="mt-3 text-sm text-dark/80">
                Your trip to {destination || "-"} ·{" "}
                {dateMode === "exact"
                  ? formatTripDateRange(departureDate || null, returnDate || null, null)
                  : formatTripDateRange(null, null, travelMonthInput ? formatMonthInputValue(travelMonthInput) : null)}{" "}
                ·{" "}
                {CLIMATE_LABELS[climate ?? ""] ?? "-"} ·{" "}
                {labelFor(SWIMMING_OPTIONS, swimming)} ·{" "}
                {labelFor(PROTECTIVE_STYLE_OPTIONS, protectiveStyle)}
              </p>
              <p className="mt-4 text-sm text-dark/70">
                Based on your profile and trip details we will build you a
                personalized list of 5 products. Ready?
              </p>

              {submitError && (
                <p className="mt-4 text-sm text-red">{submitError}</p>
              )}

              <button
                type="button"
                onClick={onSubmit}
                disabled={submitting}
                className="mt-6 w-full rounded-lg bg-bronze py-4 text-sm font-semibold text-cream transition-colors hover:bg-bronze2 disabled:opacity-50"
              >
                {submitting ? "Please wait..." : "Get my travel kit - $4.99 →"}
              </button>
            </div>
          )}
        </div>

        {step < 4 && (
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
              disabled={
                (step === 1 && !step1Valid) ||
                (step === 2 && !step2Valid) ||
                (step === 3 && !step3Valid)
              }
              className="bg-bronze px-6 py-3 text-sm font-semibold text-cream transition-colors hover:bg-bronze2 disabled:opacity-50"
            >
              Next →
            </button>
          </div>
        )}
        {step === 4 && (
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
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-4 font-sans text-dark">
      <h1 className="font-serif text-2xl font-bold lowercase text-dark">qoyl</h1>
      <div className="mt-8 flex gap-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2.5 w-2.5 animate-bounce rounded-full bg-bronze"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
      <p className="mt-8 font-serif text-xl text-dark">
        Building your kit for {destination}...
      </p>
    </main>
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

  return (
    <main className="min-h-screen bg-white px-4 py-10 font-sans text-dark sm:px-6">
      <div className="mx-auto max-w-md">
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

function TravelPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const kitIdParam = searchParams.get("kit");
  const paymentStatus = searchParams.get("payment");
  const welcome = searchParams.get("welcome") === "true";
  const forceNewParam = searchParams.get("new") === "true";

  const [view, setView] = useState<View>("landing");
  const [resolvingKit, setResolvingKit] = useState(true);
  const [kit, setKit] = useState<TravelKitRow | null>(null);
  const [activeKits, setActiveKits] = useState<
    { id: string; destination: string; created_at: string }[]
  >([]);
  const [landingError, setLandingError] = useState<string | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsAdminUser(false);
      return;
    }
    let cancelled = false;
    fetch(`/api/purchases?user_id=${user.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setIsAdminUser(Boolean(data.isAdmin));
      })
      .catch(() => {
        if (!cancelled) setIsAdminUser(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Set right before an explicit "start a new trip" action (Plan another
  // trip / Build my travel kit) so the auto-detection effect below never
  // fights that choice - e.g. clearing ?kit= from the URL after clicking
  // "Plan another trip" would otherwise re-trigger this effect, which
  // would then re-select the most recent active kit and silently bounce
  // the user right back to the kit view they just tried to leave.
  const skipAutoKitRef = useRef(false);

  // Resolves which kit (if any) to show. Two cases:
  // - ?kit=<id> present (dashboard's "View kit" link, the Stripe success
  //    redirect, or the trip switcher below): load that exact row
  //    regardless of status - right after the Stripe redirect the
  //    webhook may not have flipped it to 'active' yet, and KitView
  //    already renders a "still being generated" note for that case.
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

  // Right after the Stripe success redirect, the webhook that flips
  // status to 'active' and fills in products may not have landed yet -
  // without this, the page just sits on "still being generated" forever
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
  const [swimming, setSwimming] = useState<string | null>(null);
  const [protectiveStyle, setProtectiveStyle] = useState<string | null>(null);
  const [hairPriority, setHairPriority] = useState<string | null>(null);
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

  function resetSurvey() {
    setStep(1);
    setDestination("");
    setClimate(null);
    setDateMode("exact");
    setDepartureDate("");
    setReturnDate("");
    setTravelMonthInput("");
    setSwimming(null);
    setProtectiveStyle(null);
    setHairPriority(null);
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

    try {
      let travelKitId = pendingKitId;

      if (!travelKitId) {
        // Single server-side route saves the row (service role client,
        // never subject to a client RLS session) and sends the admin
        // notification atomically - see app/api/travel-kits/route.ts.
        // Awaited, since the returned id is required for Stripe
        // checkout below, unlike a pure side-effect notification.
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
            swimming,
            protective_style: protectiveStyle,
            hair_priority: hairPriority,
          }),
        });
        const saveData = await saveRes.json();

        if (!saveRes.ok || !saveData.id) {
          setSubmitError(
            saveData.error ?? "Couldn't save your trip details. Please try again."
          );
          setSubmitting(false);
          return;
        }

        travelKitId = saveData.id;
        setPendingKitId(travelKitId);
      }

      setView("generating");
      await new Promise((resolve) => setTimeout(resolve, 2000));

      if (isAdminUser) {
        // Admin bypass - runs the exact same activation logic Stripe's
        // webhook would run after payment, just without Stripe. See
        // app/api/travel-kits/admin-activate/route.ts.
        const activateRes = await fetch("/api/travel-kits/admin-activate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: user.id, travel_kit_id: travelKitId }),
        });
        const activateData = await activateRes.json();

        if (!activateRes.ok) {
          setSubmitError(
            activateData.error ?? "Something went wrong. Please try again."
          );
          setSubmitting(false);
          setView("survey");
          return;
        }

        router.push(`/travel?kit=${travelKitId}&welcome=true`);
        return;
      }

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_type: "travel_kit",
          user_id: user.id,
          email: user.email,
          travel_kit_id: travelKitId,
        }),
      });
      const checkoutData = await res.json();

      if (!res.ok || !checkoutData.url) {
        setSubmitError(
          checkoutData.error ?? "Something went wrong. Please try again."
        );
        setSubmitting(false);
        setView("survey");
        return;
      }

      window.location.href = checkoutData.url;
    } catch {
      setSubmitError("Couldn't reach the server. Please try again.");
      setSubmitting(false);
      setView("survey");
    }
  }

  if (authLoading || resolvingKit) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white font-sans">
        <p className="text-sm text-dark/60">Loading...</p>
      </main>
    );
  }

  if (view === "kit" && kit) {
    return (
      <KitView
        kit={kit}
        welcome={welcome}
        activeKits={activeKits}
        onSwitchKit={handleSwitchKit}
        onBuildAnother={handleBuildAnother}
        pollExhausted={pollExhausted}
      />
    );
  }

  if (view === "generating") {
    return <GeneratingView destination={destination} />;
  }

  if (view === "survey") {
    return (
      <SurveyView
        step={step}
        totalSteps={4}
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
        swimming={swimming}
        setSwimming={setSwimming}
        protectiveStyle={protectiveStyle}
        setProtectiveStyle={setProtectiveStyle}
        hairPriority={hairPriority}
        setHairPriority={setHairPriority}
        onNext={() => setStep((s) => Math.min(4, s + 1))}
        onBack={() => setStep((s) => Math.max(1, s - 1))}
        onSubmit={handleSurveySubmit}
        submitting={submitting}
        submitError={submitError}
      />
    );
  }

  return (
    <LandingView
      onBuildClick={handleBuildClick}
      error={landingError}
      cancelled={paymentStatus === "cancelled"}
    />
  );
}

export default function TravelPage() {
  return (
    <Suspense fallback={null}>
      <TravelPageContent />
    </Suspense>
  );
}
