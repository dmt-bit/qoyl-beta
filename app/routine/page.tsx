"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { scoreTier, TIER_CLASSES } from "@/lib/compatibility";
import { WashDayType } from "@/lib/routineCalendar";

type CalendarDay = {
  day: number;
  weekday: number;
  washType: WashDayType | null;
};

type RoutineStep = {
  title: string;
  body: string;
  why: string;
};

type ProductCandidate = {
  ingredientName: string | null;
  score: number | null;
  rating: string | null;
  reason: string | null;
};

type ProductPick = {
  category: string;
  categoryLabel: string;
  primary: ProductCandidate | null;
  alternate: ProductCandidate | null;
  affiliateLink: string;
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
  monthLabel: string;
  calendarDays: CalendarDay[];
  steps: RoutineStep[];
  products: ProductPick[];
  avoidIngredients: AvoidIngredient[];
};

const SCALP_LABELS: Record<string, string> = {
  normal: "Normal scalp",
  dry: "Dry scalp",
  oily: "Oily scalp",
  sensitive: "Sensitive scalp",
  "dandruff-prone": "Dandruff-prone scalp",
};

const WASH_TYPE_LABEL: Record<WashDayType, string> = {
  chelate: "Chelating",
  wash: "Regular wash",
  protein: "Protein",
};

const WASH_TYPE_MINI_ROUTINE: Record<WashDayType, string> = {
  chelate: "Chelate → Shampoo → Deep condition → LCO",
  wash: "Pre-poo → Shampoo → Deep condition → LCO",
  protein: "Pre-poo → Shampoo → Protein → Deep condition → LCO",
};

const WASH_TYPE_CELL_CLASSES: Record<WashDayType, string> = {
  chelate: "border-2 border-bronze bg-dark",
  wash: "border border-dark bg-dark",
  protein: "border-2 border-green bg-dark",
};

function stepProductCategory(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("pre-poo")) return "Pre-poo treatment";
  if (t.includes("clarify") || t.includes("chelate")) return "Chelating shampoo";
  if (t.includes("deep condition")) return "Deep conditioner";
  if (t.includes("leave-in")) return "Leave-in conditioner";
  if (t.includes("seal")) return "Sealing oil";
  return "Styling product";
}

function DayCell({ day }: { day: CalendarDay }) {
  if (!day.washType) {
    return (
      <div
        className="flex min-h-[64px] flex-col items-center justify-between rounded-md border border-warm/30 bg-warm/15 p-1.5 sm:min-h-[80px]"
        title="Refresh day -- mist and re-seal your ends tonight."
      >
        <span className="text-[10px] font-semibold text-cream/70">{day.day}</span>
        <span className="mb-0.5 h-1.5 w-1.5 rounded-full bg-sand" />
      </div>
    );
  }

  return (
    <div
      className={`flex min-h-[64px] flex-col rounded-md p-1.5 sm:min-h-[80px] ${WASH_TYPE_CELL_CLASSES[day.washType]}`}
    >
      <span className="text-[10px] font-semibold text-cream">{day.day}</span>
      <span className="mt-0.5 text-[8px] font-semibold uppercase tracking-wide text-bronze2">
        {WASH_TYPE_LABEL[day.washType]}
      </span>
      <span className="mt-0.5 text-[7px] leading-tight text-cream/60 sm:text-[8px]">
        {WASH_TYPE_MINI_ROUTINE[day.washType]}
      </span>
    </div>
  );
}

function ProductCard({ pick }: { pick: ProductPick }) {
  const { primary, alternate } = pick;

  return (
    <div className="rounded-xl border border-bronze/30 p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-bronze2">
        {pick.categoryLabel}
      </p>

      {!primary || !primary.ingredientName || primary.score === null ? (
        <p className="mt-3 text-sm text-cream/50">
          No match found yet for this category.
        </p>
      ) : (
        <>
          <div className="mt-3 flex items-start justify-between gap-3">
            <p className="font-serif text-lg text-cream">{primary.ingredientName}</p>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                TIER_CLASSES[scoreTier(primary.score)]
              }`}
            >
              {primary.score}
            </span>
          </div>
          {primary.reason && (
            <p className="mt-1 text-sm text-cream/70">{primary.reason}</p>
          )}
          <a
            href={pick.affiliateLink}
            className="print-hide mt-3 inline-block text-sm font-medium text-bronze2 underline underline-offset-2 hover:text-cream"
          >
            Shop this →
          </a>

          {alternate?.ingredientName && (
            <div className="mt-4 border-t border-bronze/20 pt-3">
              <p className="text-xs text-cream/50">
                Alternate pick:{" "}
                <span className="text-cream/80">{alternate.ingredientName}</span>
                {alternate.score !== null && (
                  <span className="ml-2 text-cream/50">{alternate.score}/100</span>
                )}
              </p>
            </div>
          )}
        </>
      )}
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

  if (status !== "ready" || !data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-dark font-sans">
        <p className="text-sm text-cream/60">Loading your routine...</p>
      </main>
    );
  }

  const firstName = data.firstName || "there";
  const chips = [
    data.curlType && data.curlType !== "not_sure" ? `Curl type ${data.curlType}` : null,
    data.porosity && data.porosity !== "not sure" ? `${data.porosity} porosity` : null,
    data.scalpCondition
      ? SCALP_LABELS[data.scalpCondition] ?? data.scalpCondition
      : null,
    data.zipCode || null,
  ].filter((chip): chip is string => Boolean(chip));

  const leadingEmpty = data.calendarDays[0]?.weekday ?? 0;
  const trailingEmpty = (7 - ((leadingEmpty + data.calendarDays.length) % 7)) % 7;

  return (
    <main className="min-h-screen bg-dark px-4 py-10 font-sans text-cream sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="hidden print:mb-8 print:block">
          <p className="font-serif text-2xl text-dark">
            Q<span className="italic">oyl</span>
          </p>
        </div>

        {showWelcome && (
          <div className="print-hide mb-6 flex items-start justify-between gap-4 rounded-lg border border-green/40 bg-green/10 px-4 py-3">
            <p className="text-sm text-green">
              Your routine is ready. Bookmark this page — it updates every
              month.
            </p>
            <button
              type="button"
              onClick={() => setWelcomeDismissed(true)}
              className="shrink-0 text-sm text-green/70 hover:text-green"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        )}

        {/* SECTION 1 -- Personal header */}
        <section>
          <div className="flex items-start justify-between gap-4">
            <h1 className="font-serif text-3xl font-semibold text-cream sm:text-4xl">
              Your {data.monthLabel} routine, {firstName}.
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
        </section>

        {/* SECTION 2 -- 30-day wash day calendar */}
        <section className="print-page-break mt-12">
          <h2 className="font-serif text-2xl font-semibold text-cream">
            {data.monthLabel} wash day calendar
          </h2>
          <div className="mt-4 grid grid-cols-7 gap-1.5 sm:gap-2">
            {["S", "M", "T", "W", "T", "F", "S"].map((label, i) => (
              <div
                key={i}
                className="text-center text-[10px] font-semibold uppercase tracking-wide text-cream/50"
              >
                {label}
              </div>
            ))}
            {Array.from({ length: leadingEmpty }).map((_, i) => (
              <div key={`lead-${i}`} />
            ))}
            {data.calendarDays.map((day) => (
              <DayCell key={day.day} day={day} />
            ))}
            {Array.from({ length: trailingEmpty }).map((_, i) => (
              <div key={`trail-${i}`} />
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-xs text-cream/60">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm border-2 border-bronze bg-dark" />
              Chelating wash
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-dark" />
              Regular wash
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm border-2 border-green bg-dark" />
              Protein treatment
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-sand" />
              Seal ends nightly
            </span>
          </div>
        </section>

        {/* SECTION 3 -- Personalized routine steps */}
        <section className="print-page-break mt-12">
          <h2 className="font-serif text-2xl font-semibold text-cream">
            Your personalized routine
          </h2>
          <div className="mt-4 space-y-6">
            {data.steps.map((step, i) => (
              <div key={step.title} className="flex gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bronze font-serif text-sm font-semibold text-dark">
                  {i + 1}
                </div>
                <div>
                  <p className="font-serif text-lg text-cream">{step.title}</p>
                  <p className="mt-1 text-sm text-cream/70">{step.body}</p>
                  <p className="mt-2 text-xs text-cream/50">{step.why}</p>
                  <span className="mt-2 inline-block rounded-full border border-bronze/40 px-2.5 py-0.5 text-[11px] text-bronze2">
                    {stepProductCategory(step.title)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 4 -- Curated product list */}
        <section className="print-page-break mt-12">
          <h2 className="font-serif text-2xl font-semibold text-cream">
            Your curated product list
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {data.products.map((pick) => (
              <ProductCard key={pick.category} pick={pick} />
            ))}
          </div>

          {data.avoidIngredients.length > 0 && (
            <div className="mt-8">
              <h3 className="font-serif text-xl font-semibold text-cream">
                Ingredients to avoid for your profile
              </h3>
              <ul className="mt-3 space-y-2">
                {data.avoidIngredients.map((ing) => (
                  <li
                    key={ing.ingredientName}
                    className="rounded-lg border border-red/30 bg-red/5 px-4 py-3"
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
        </section>

        {/* SECTION 5 -- Download */}
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
