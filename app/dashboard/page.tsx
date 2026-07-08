"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import UpgradePrompt from "@/components/UpgradePrompt";
import { useAuth } from "@/lib/auth-context";
import {
  CalendarDay,
  generateCalendar,
  getBasicRoutineSteps,
  getRecommendedIngredients,
  RecommendedIngredient,
  RoutineStep,
} from "@/lib/routine";

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, hairProfile, hairProfileLoading } =
    useAuth();

  const [checkedAccess, setCheckedAccess] = useState(false);
  const [hasRoutineSubscription, setHasRoutineSubscription] = useState(false);
  const [entitlementLoading, setEntitlementLoading] = useState(true);

  const paymentStatus = searchParams.get("payment");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/auth");
      return;
    }
    setCheckedAccess(true);
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function loadEntitlement() {
      setEntitlementLoading(true);
      try {
        const res = await fetch(`/api/purchases?user_id=${user!.id}`);
        const data = await res.json();
        if (!cancelled) {
          setHasRoutineSubscription(Boolean(data.hasRoutineSubscription));
        }
      } catch {
        // Fail closed -- treat as not subscribed.
      } finally {
        if (!cancelled) setEntitlementLoading(false);
      }
    }

    loadEntitlement();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const [steps, setSteps] = useState<RoutineStep[]>([]);
  const [calendar30, setCalendar30] = useState<CalendarDay[]>([]);
  const [ingredients, setIngredients] = useState<RecommendedIngredient[]>([]);
  const [ingredientsLoading, setIngredientsLoading] = useState(false);

  useEffect(() => {
    if (!hairProfile) return;
    setSteps(getBasicRoutineSteps(hairProfile));
    setCalendar30(generateCalendar(hairProfile, 30));
  }, [hairProfile]);

  useEffect(() => {
    if (!hairProfile || !hasRoutineSubscription) return;
    let cancelled = false;
    setIngredientsLoading(true);

    getRecommendedIngredients(hairProfile).then((result) => {
      if (!cancelled) {
        setIngredients(result);
        setIngredientsLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [hairProfile, hasRoutineSubscription]);

  function handleDownloadPdf() {
    window.print();
  }

  if (!checkedAccess) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-dark font-sans">
        <p className="text-sm text-cream/60">Loading...</p>
      </main>
    );
  }

  const calendarToShow = hasRoutineSubscription
    ? calendar30
    : calendar30.slice(0, 7);

  return (
    <main className="min-h-screen bg-dark px-4 py-10 font-sans text-cream sm:px-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-serif text-3xl font-semibold text-cream sm:text-4xl">
          Your Routine
        </h1>

        {paymentStatus === "success" && (
          <p className="mt-4 rounded-lg border border-green/40 bg-green/10 px-4 py-3 text-sm text-green">
            You&apos;re all set — your{" "}
            {hasRoutineSubscription ? "monthly routine" : "purchase"} is
            ready.
          </p>
        )}
        {paymentStatus === "cancelled" && (
          <p className="print-hide mt-4 rounded-lg border border-bronze/40 bg-bronze/10 px-4 py-3 text-sm text-cream/80">
            No worries — you can unlock this anytime.
          </p>
        )}

        {hairProfileLoading && (
          <p className="mt-4 text-sm text-cream/50">
            Loading your profile...
          </p>
        )}

        {!hairProfileLoading && !hairProfile && (
          <p className="mt-4 text-sm text-cream/70">
            Save a{" "}
            <a href="/profile" className="underline">
              hair profile
            </a>{" "}
            first so we can personalize your routine.
          </p>
        )}

        {hairProfile && (
          <>
            <section className="mt-8">
              <h2 className="font-serif text-2xl font-semibold text-cream">
                Your 4-Step Routine
              </h2>
              <div className="mt-4 space-y-4">
                {steps.map((step) => (
                  <div
                    key={step.title}
                    className="rounded-lg border border-bronze/30 p-4"
                  >
                    <p className="font-serif text-lg text-bronze2">
                      {step.title}
                    </p>
                    <p className="mt-1 text-sm text-cream/70">
                      {step.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-8">
              <h2 className="font-serif text-2xl font-semibold text-cream">
                {hasRoutineSubscription
                  ? "30-Day Wash Day Calendar"
                  : "7-Day Preview"}
              </h2>
              <div className="mt-4 grid grid-cols-7 gap-2">
                {calendarToShow.map((day) => (
                  <div
                    key={day.day}
                    className={`rounded-lg border p-2 text-center text-xs ${
                      day.isWashDay
                        ? "border-bronze bg-bronze/20 text-cream"
                        : "border-bronze/20 text-cream/50"
                    }`}
                    title={day.note}
                  >
                    <p className="font-semibold">Day {day.day}</p>
                    <p className="mt-1">{day.isWashDay ? "Wash" : "Refresh"}</p>
                  </div>
                ))}
              </div>
            </section>

            {hasRoutineSubscription && (
              <section className="mt-8">
                <h2 className="font-serif text-2xl font-semibold text-cream">
                  Recommended Ingredients
                </h2>
                <p className="mt-1 text-sm text-cream/60">
                  Ingredients that score well for your porosity — look for
                  these on labels.
                </p>
                {ingredientsLoading ? (
                  <p className="mt-4 text-sm text-cream/50">Loading...</p>
                ) : (
                  <ul className="mt-4 space-y-2">
                    {ingredients.map((ing, i) => (
                      <li
                        key={`${ing.name}-${i}`}
                        className="flex items-center justify-between rounded-lg border border-bronze/30 px-4 py-3"
                      >
                        <span className="text-sm text-cream">{ing.name}</span>
                        <span className="text-xs text-green">
                          {ing.score}/10
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="print-hide mt-6 w-full rounded-lg bg-bronze py-3 text-sm font-semibold text-dark transition-colors hover:bg-bronze2"
                >
                  Download PDF
                </button>
              </section>
            )}

            {!entitlementLoading && !hasRoutineSubscription && (
              <section className="print-hide mt-8">
                <UpgradePrompt
                  feature="routine_subscription"
                  price="$7.99/month"
                  title="Your full monthly routine"
                  description="30-day wash day calendar, complete product list, and downloadable PDF — personalized to your hair profile"
                />
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardContent />
    </Suspense>
  );
}
