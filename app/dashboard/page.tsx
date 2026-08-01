"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import PostCard, { Post } from "@/components/PostCard";
import { useAuth } from "@/lib/auth-context";
import { getChildSafetyNote } from "@/lib/childSafety";
import { scoreTier, TIER_CLASSES } from "@/lib/compatibility";
import { getBasicRoutineSteps, RoutineStep } from "@/lib/routine";
import { supabase } from "@/lib/supabase";

type RecentSearch = {
  id: string;
  product_name: string | null;
  compatibility_score: number | null;
  searched_at: string;
};

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
  const isChildOrBabyProfile =
    hairProfile?.profile_for === "child" || hairProfile?.profile_for === "baby";

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

  useEffect(() => {
    if (!hairProfile) return;
    setSteps(getBasicRoutineSteps(hairProfile));
  }, [hairProfile]);

  const [recentPosts, setRecentPosts] = useState<Post[]>([]);

  useEffect(() => {
    if (hairProfileLoading) return;
    let cancelled = false;

    async function loadPosts() {
      const columns =
        "slug, title, category, hero_image_url, excerpt, published_at";

      // Pre-select the "Baby & Kids" feed content for child/baby profiles
      // (same hair_type tag the home page's filter tabs use). Falls back
      // to the general feed if there aren't 3 matching posts yet, rather
      // than showing a near-empty section.
      if (isChildOrBabyProfile) {
        const { data } = await supabase
          .from("posts")
          .select(columns)
          .eq("hair_type", "baby")
          .order("published_at", { ascending: false })
          .limit(3);
        if (data && data.length === 3) {
          if (!cancelled) setRecentPosts(data);
          return;
        }
      }

      const { data } = await supabase
        .from("posts")
        .select(columns)
        .order("published_at", { ascending: false })
        .limit(3);
      if (!cancelled) setRecentPosts(data ?? []);
    }

    loadPosts();
    return () => {
      cancelled = true;
    };
  }, [hairProfileLoading, isChildOrBabyProfile]);

  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function loadRecentSearches() {
      const { data } = await supabase
        .from("product_searches")
        .select("id, product_name, compatibility_score, searched_at")
        .eq("user_id", user!.id)
        .order("searched_at", { ascending: false })
        .limit(5);
      if (!cancelled) setRecentSearches(data ?? []);
    }

    loadRecentSearches();
    return () => {
      cancelled = true;
    };
  }, [user]);

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
    ? isChildOrBabyProfile
      ? `Here's ${hairProfile.first_name}'s routine`
      : `Welcome back, ${hairProfile.first_name}`
    : "Welcome to Qoyl";
  const childSafetyNote = getChildSafetyNote(hairProfile?.profile_for ?? null);

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

        {childSafetyNote && (
          <p className="mt-4 rounded-lg border border-bronze/40 bg-warm/10 px-4 py-3 text-sm text-cream/90">
            {childSafetyNote}
          </p>
        )}

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
                  <Link
                    href="/routine"
                    className="print-hide flex items-center justify-between rounded-xl border border-bronze/40 bg-bronze/10 px-5 py-4 transition-colors hover:border-bronze"
                  >
                    <div>
                      <p className="font-serif text-lg text-cream">
                        Your routine is ready →
                      </p>
                      <p className="mt-1 text-sm text-cream/60">
                        Full wash calendar, personalized steps, and curated
                        products for this month.
                      </p>
                    </div>
                  </Link>
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

        {recentSearches.length > 0 && (
          <section className="print-hide mt-10">
            <h2 className="font-serif text-2xl font-semibold text-cream">
              Recently searched
            </h2>
            <ul className="mt-4 space-y-2">
              {recentSearches.map((search) => {
                const score = search.compatibility_score;
                return (
                  <li
                    key={search.id}
                    className="flex items-center justify-between gap-4 rounded-lg border border-bronze/30 px-4 py-3"
                  >
                    <span className="text-sm text-cream">
                      {search.product_name || "Unknown product"}
                    </span>
                    <div className="flex shrink-0 items-center gap-3">
                      {score !== null && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            TIER_CLASSES[scoreTier(score)]
                          }`}
                        >
                          {score}
                        </span>
                      )}
                      <Link
                        href={`/search?q=${encodeURIComponent(
                          search.product_name ?? ""
                        )}`}
                        className="text-xs text-bronze2 underline underline-offset-2 hover:text-cream"
                      >
                        Search again →
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
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
