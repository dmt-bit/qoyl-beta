"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import PostCard, { Post } from "@/components/PostCard";
import { useAuth } from "@/lib/auth-context";
import {
  CalendarDay,
  generateCalendar,
  getBasicRoutineSteps,
  getRecommendedIngredients,
  RecommendedIngredient,
  RoutineStep,
} from "@/lib/routine";
import { supabase } from "@/lib/supabase";

const SCALP_LABELS: Record<string, string> = {
  normal: "Normal scalp",
  dry: "Dry scalp",
  oily: "Oily scalp",
  sensitive: "Sensitive scalp",
  "dandruff-prone": "Dandruff-prone scalp",
};

function ProfileChips() {
  const { hairProfile } = useAuth();
  if (!hairProfile) return null;

  const chips = [
    hairProfile.curl_type && hairProfile.curl_type !== "not_sure"
      ? `Curl type ${hairProfile.curl_type}`
      : null,
    hairProfile.porosity && hairProfile.porosity !== "not sure"
      ? `${hairProfile.porosity} porosity`
      : null,
    hairProfile.scalp_condition
      ? SCALP_LABELS[hairProfile.scalp_condition] ?? hairProfile.scalp_condition
      : null,
    hairProfile.zip_code || null,
  ].filter((chip): chip is string => Boolean(chip));

  if (chips.length === 0) return null;

  return (
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
  );
}

function SearchIcon() {
  return (
    <svg
      className="h-6 w-6 text-bronze2"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
      />
    </svg>
  );
}

function TravelIcon() {
  return (
    <svg
      className="h-6 w-6 text-bronze2"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 15.75l-2.489 2.489m0 0a3.375 3.375 0 104.773 4.773 3.375 3.375 0 00-4.774-4.774zm10.94-14.94l3.63 3.63m0 0l3.63 3.63m-3.63-3.63l-3.63 3.63m3.63-3.63L21 8.25M4.5 12l7.5-7.5 7.5 7.5-7.5 7.5-7.5-7.5z"
      />
    </svg>
  );
}

function QuickActions() {
  return (
    <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Link
        href="/search"
        className="rounded-xl border border-bronze/30 p-6 transition-colors hover:border-bronze"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-bronze/40 bg-bronze/10">
          <SearchIcon />
        </div>
        <p className="mt-4 font-serif text-xl font-semibold text-cream">
          Search a product
        </p>
        <p className="mt-1 text-sm text-cream/70">
          Check any product&apos;s compatibility with your hair.
        </p>
      </Link>

      <Link
        href="/travel"
        className="rounded-xl border border-bronze/30 p-6 transition-colors hover:border-bronze"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-bronze/40 bg-bronze/10">
          <TravelIcon />
        </div>
        <p className="mt-4 font-serif text-xl font-semibold text-cream">
          Get your travel kit
        </p>
        <p className="mt-1 text-sm text-cream/70">
          5 products matched to your destination climate.
        </p>
      </Link>
    </div>
  );
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, hairProfile, hairProfileLoading } =
    useAuth();

  const [checkedAccess, setCheckedAccess] = useState(false);
  const [hasRoutineSubscription, setHasRoutineSubscription] = useState(false);
  const [entitlementLoading, setEntitlementLoading] = useState(true);
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);

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

  const [recentPosts, setRecentPosts] = useState<Post[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadPosts() {
      const { data } = await supabase
        .from("posts")
        .select("slug, title, category, hero_image_url, excerpt, published_at")
        .order("published_at", { ascending: false })
        .limit(3);
      if (!cancelled) setRecentPosts(data ?? []);
    }

    loadPosts();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleDownloadPdf() {
    window.print();
  }

  async function handleUnlockClick() {
    if (!user) return;
    setUnlockError(null);
    setUnlockLoading(true);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_type: "routine_subscription",
          user_id: user.id,
          email: user.email,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.url) {
        setUnlockError(data.error ?? "Something went wrong. Please try again.");
        setUnlockLoading(false);
        return;
      }

      window.location.href = data.url;
    } catch {
      setUnlockError("Couldn't reach the server. Please try again.");
      setUnlockLoading(false);
    }
  }

  if (!checkedAccess) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-dark font-sans">
        <p className="text-sm text-cream/60">Loading...</p>
      </main>
    );
  }

  const greeting = hairProfile?.first_name
    ? `Welcome back, ${hairProfile.first_name}`
    : "Welcome to Qoyl";

  return (
    <main className="min-h-screen bg-dark px-4 py-10 font-sans text-cream sm:px-6">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-start justify-between gap-4">
          <h1 className="font-serif text-3xl font-semibold text-cream sm:text-4xl">
            {greeting}
          </h1>
          <Link
            href="/profile"
            className="print-hide mt-2 shrink-0 text-xs text-cream/50 underline underline-offset-2 hover:text-cream/70"
          >
            View my profile
          </Link>
        </div>

        <ProfileChips />

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

        <div className="print-hide">
          <QuickActions />
        </div>

        {hairProfileLoading && (
          <p className="mt-8 text-sm text-cream/50">
            Loading your profile...
          </p>
        )}

        {!hairProfileLoading && !hairProfile && (
          <p className="mt-8 text-sm text-cream/70">
            Save a{" "}
            <Link href="/profile" className="underline">
              hair profile
            </Link>{" "}
            first so we can personalize your routine.
          </p>
        )}

        {hairProfile && (
          <section className="mt-10">
            <h2 className="font-serif text-2xl font-semibold text-cream">
              Your Routine
            </h2>
            <div className="mt-4 rounded-xl border border-bronze/30 bg-dark p-6">
              <div className="space-y-4">
                {steps.map((step) => (
                  <div key={step.title}>
                    <p className="font-serif text-lg text-bronze2">
                      {step.title}
                    </p>
                    <p className="mt-1 text-sm text-cream/70">
                      {step.description}
                    </p>
                  </div>
                ))}
              </div>

              {hasRoutineSubscription ? (
                <div className="mt-6 border-t border-bronze/20 pt-6">
                  <h3 className="font-serif text-xl font-semibold text-cream">
                    30-Day Wash Day Calendar
                  </h3>
                  <div className="mt-4 grid grid-cols-7 gap-2">
                    {calendar30.map((day) => (
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
                        <p className="mt-1">
                          {day.isWashDay ? "Wash" : "Refresh"}
                        </p>
                      </div>
                    ))}
                  </div>

                  <h3 className="mt-6 font-serif text-xl font-semibold text-cream">
                    Recommended Ingredients
                  </h3>
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
                          <span className="text-sm text-cream">
                            {ing.name}
                          </span>
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
                </div>
              ) : (
                !entitlementLoading && (
                  <div className="print-hide mt-6 border-t border-bronze/20 pt-4">
                    {unlockError && (
                      <p className="mb-2 text-sm text-red">{unlockError}</p>
                    )}
                    <button
                      type="button"
                      onClick={handleUnlockClick}
                      disabled={unlockLoading}
                      className="text-sm text-bronze2 underline underline-offset-2 hover:text-cream disabled:opacity-50"
                    >
                      {unlockLoading
                        ? "Redirecting..."
                        : "Unlock your full 30-day calendar →"}
                    </button>
                  </div>
                )
              )}
            </div>
          </section>
        )}

        {recentPosts.length > 0 && (
          <section className="print-hide mt-10">
            <h2 className="font-serif text-2xl font-semibold text-cream">
              From the Qoyl feed.
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {recentPosts.map((post) => (
                <PostCard key={post.slug} post={post} compact />
              ))}
            </div>
          </section>
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
