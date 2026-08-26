"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import PostCard, { Post } from "@/components/PostCard";
import UpgradePrompt from "@/components/UpgradePrompt";
import { useAuth } from "@/lib/auth-context";
import { formatAdultAgeRange } from "@/lib/ageRange";
import { getChildSafetyNote } from "@/lib/childSafety";
import { scoreTier, TIER_CLASSES } from "@/lib/compatibility";
import {
  BABY_AGE_RANGE_LABELS,
  BABY_TEXTURE_LABELS,
  CHILD_AGE_RANGE_LABELS,
  fetchBabyProfilesByUserId,
  fetchChildProfilesByUserId,
  type BabyProfile,
  type ChildProfile,
} from "@/lib/familyProfiles";
import { EXTENSION_TYPE_LABELS, fetchLatestExtensionProfileByUserId, type ExtensionProfile } from "@/lib/extensionProfiles";
import StyleMatchFollowUp, { type FollowUpCandidate } from "@/components/StyleMatchFollowUp";
import {
  protectiveStyleTypeFromExtensionType,
  PROTECTIVE_STYLE_LABEL,
} from "@/lib/protectiveStyleRoutine";
import { getBasicRoutineSteps, RoutineStep } from "@/lib/routine";
import { supabase } from "@/lib/supabase";

type RecentSearch = {
  id: string;
  product_name: string | null;
  compatibility_score: number | null;
  searched_at: string;
};

type TravelKitSummary = {
  id: string;
  destination: string;
  departure_date: string | null;
  return_date: string | null;
  travel_month: string | null;
};

type StyleMatchSummary = {
  id: string;
  detected_style: string | null;
  detected_details: { style_description?: string; maintenance_tips?: string } | null;
  created_at: string;
};

type SavedStyle = {
  id: string;
  style_name: string;
  created_at: string;
};

function formatMatchDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTravelDate(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const SCALP_LABELS: Record<string, string> = {
  normal: "Normal scalp",
  dry: "Dry scalp",
  oily: "Oily scalp",
  sensitive: "Sensitive scalp",
  "dandruff-prone": "Dandruff-prone scalp",
};

type DayStripStatus = "completed" | "rest" | "missed" | "future" | "scheduled";
type DayStripEntry = { date: string; status: DayStripStatus };

// Small habit-tracker strip - not importing lib/routineCompletions.ts
// directly here (it pulls in getSupabaseAdmin, service-role only) so
// this fetches through /api/routine/completions like every other
// server-computed value on this page.
function RecentCompletionsStrip({ userId }: { userId: string }) {
  const [dayStrip, setDayStrip] = useState<DayStripEntry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/routine/completions?user_id=${userId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setDayStrip(data?.dayStrip ?? null);
      })
      .catch(() => {
        if (!cancelled) setDayStrip(null);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!dayStrip) return null;

  function circleClass(status: DayStripStatus): string {
    switch (status) {
      case "completed":
        return "bg-bronze border-bronze";
      case "rest":
        return "border-bronze/40"; // filled via the inner dot below
      case "missed":
        return "border-bronze/30 bg-transparent";
      case "scheduled":
        return "border-bronze bg-transparent";
      case "future":
      default:
        return "border-cream/15 bg-cream/5";
    }
  }

  return (
    <div className="print-hide mt-6 border-t border-bronze/20 pt-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-bronze2">
        Recent completions
      </p>
      <div className="mt-3 flex items-center justify-between gap-2">
        {dayStrip.map((entry) => {
          const weekday = new Date(`${entry.date}T00:00:00`).toLocaleDateString("en-US", {
            weekday: "narrow",
          });
          return (
            <div key={entry.date} className="flex flex-col items-center gap-1.5">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full border-2 ${circleClass(entry.status)}`}
              >
                {entry.status === "rest" && <span className="h-1.5 w-1.5 rounded-full bg-bronze" />}
              </div>
              <span className="text-[10px] text-cream/40">{weekday}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-cream/40">
        <span>● Completed</span>
        <span>· Rest day</span>
        <span>○ Missed</span>
        <span>○ Future</span>
      </div>
    </div>
  );
}

function routineFocusChipLabel(
  routineFocus: string | null,
  extensionType: string[] | null
): string | null {
  if (routineFocus === "natural_hair") return "Natural hair focus";
  if (routineFocus === "both") return "Both routines";
  if (routineFocus === "extensions") {
    const styleType = protectiveStyleTypeFromExtensionType(extensionType);
    return styleType ? `${PROTECTIVE_STYLE_LABEL[styleType]} care focus` : "Protective style focus";
  }
  return null;
}

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
    formatAdultAgeRange(hairProfile.adult_age_range),
    routineFocusChipLabel(hairProfile.routine_focus, hairProfile.extension_type),
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

function SparkleIcon() {
  return (
    <svg className="h-6 w-6 text-bronze2" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2l1.8 5.4L19 9l-5.2 1.6L12 16l-1.8-5.4L5 9l5.2-1.6L12 2zM19 14l.9 2.6L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.4L19 14zM5 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z" />
    </svg>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      className={`h-5 w-5 ${filled ? "text-bronze" : "text-cream/50"}`}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
      />
    </svg>
  );
}

function QuickActions() {
  return (
    <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Link
        href="/style-match"
        className="rounded-xl border border-bronze/30 p-6 transition-colors hover:border-bronze"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-bronze/40 bg-bronze/10">
          <SparkleIcon />
        </div>
        <p className="mt-4 font-serif text-xl font-semibold text-cream">
          Style Match
        </p>
        <p className="mt-1 text-sm text-cream/70">
          Upload a photo or describe a style - get matching tutorials, a
          scored shopping list, and a local stylist if one&apos;s available.
        </p>
        <span className="mt-3 inline-block text-sm font-semibold text-bronze2">
          Try Style Match →
        </span>
      </Link>

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
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [entitlementLoading, setEntitlementLoading] = useState(true);

  const [babyProfiles, setBabyProfiles] = useState<BabyProfile[]>([]);
  const [childProfiles, setChildProfiles] = useState<ChildProfile[]>([]);
  const [familyProfilesLoading, setFamilyProfilesLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setFamilyProfilesLoading(true);
    Promise.all([fetchBabyProfilesByUserId(user.id), fetchChildProfilesByUserId(user.id)]).then(
      ([babies, children]) => {
        if (cancelled) return;
        setBabyProfiles(babies);
        setChildProfiles(children);
        setFamilyProfilesLoading(false);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [user]);

  const [extensionProfile, setExtensionProfile] = useState<ExtensionProfile | null>(null);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetchLatestExtensionProfileByUserId(user.id).then((data) => {
      if (!cancelled) setExtensionProfile(data);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

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
          setIsAdminUser(Boolean(data.isAdmin));
        }
      } catch {
        // Fail closed - treat as not subscribed.
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

  const [travelKits, setTravelKits] = useState<TravelKitSummary[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function loadTravelKits() {
      const { data } = await supabase
        .from("travel_kits")
        .select("id, destination, departure_date, return_date, travel_month")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .order("departure_date", { ascending: true });
      if (!cancelled) setTravelKits(data ?? []);
    }

    loadTravelKits();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const [recentStyleMatches, setRecentStyleMatches] = useState<StyleMatchSummary[]>([]);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function loadRecentStyleMatches() {
      const { data } = await supabase
        .from("style_matches")
        .select("id, detected_style, detected_details, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(3);
      if (!cancelled) setRecentStyleMatches(data ?? []);
    }

    loadRecentStyleMatches();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // "Did you do this style?" prompt candidates (Part 3) - any match at
  // least 7 days old with no follow-through recorded yet. Separate from
  // recentStyleMatches above, which is capped at 3 and not filtered by
  // age - a style matched 8 days ago could easily have scrolled out of
  // that list already but still be waiting on a follow-up prompt.
  const [followUpCandidates, setFollowUpCandidates] = useState<FollowUpCandidate[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function loadFollowUpCandidates() {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("style_matches")
        .select("id, detected_style, created_at")
        .eq("user_id", user!.id)
        .eq("followed_through", false)
        .lte("created_at", sevenDaysAgo)
        .order("created_at", { ascending: false })
        .limit(5);
      if (!cancelled) setFollowUpCandidates(data ?? []);
    }

    loadFollowUpCandidates();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const [savedStyles, setSavedStyles] = useState<SavedStyle[]>([]);
  const [savedStylesLoaded, setSavedStylesLoaded] = useState(false);

  async function loadSavedStyles() {
    if (!user) return;
    const { data } = await supabase
      .from("saved_styles")
      .select("id, style_name, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setSavedStyles(data ?? []);
    setSavedStylesLoaded(true);
  }

  useEffect(() => {
    if (!user) return;
    loadSavedStyles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function handleUnsaveStyle(id: string) {
    setSavedStyles((prev) => prev.filter((s) => s.id !== id));
    const { error } = await supabase.from("saved_styles").delete().eq("id", id);
    if (error) {
      console.error("Failed to unsave style:", error);
      loadSavedStyles();
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

        {!entitlementLoading && hasRoutineSubscription && (
          <span className="mt-3 inline-block rounded-full bg-bronze px-3 py-1 text-xs font-semibold text-dark">
            Monthly Routine
          </span>
        )}

        {user?.email && (
          <p className="mt-3 flex items-center gap-2 text-xs text-cream/50">
            {user.email}
            {!entitlementLoading && isAdminUser && (
              <span className="rounded-full bg-bronze px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-dark">
                Admin
              </span>
            )}
          </p>
        )}

        <ProfileChips />

        {childSafetyNote && (
          <p className="mt-4 rounded-lg border border-bronze/40 bg-warm/10 px-4 py-3 text-sm text-cream/90">
            {childSafetyNote}
          </p>
        )}

        {paymentStatus === "success" && (
          <p className="mt-4 rounded-lg border border-green/40 bg-green/10 px-4 py-3 text-sm text-green">
            You&apos;re all set - your{" "}
            {hasRoutineSubscription ? "monthly routine" : "purchase"} is
            ready.
          </p>
        )}
        {paymentStatus === "cancelled" && (
          <p className="print-hide mt-4 rounded-lg border border-bronze/40 bg-bronze/10 px-4 py-3 text-sm text-cream/80">
            No worries - you can unlock this anytime.
          </p>
        )}

        <div className="print-hide">
          <QuickActions />
        </div>

        {savedStylesLoaded && (
          <section className="print-hide mt-10">
            <h2 className="font-serif text-2xl font-semibold text-cream">My Style Inspo</h2>

            {savedStyles.length === 0 ? (
              <Link
                href="/style-match"
                className="mt-4 flex items-center gap-3 rounded-xl border border-bronze/30 px-5 py-6 transition-colors hover:border-bronze"
              >
                <HeartIcon filled={false} />
                <span className="text-sm text-cream/70">
                  Save styles you love and build your inspiration board. →
                </span>
              </Link>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {savedStyles.map((style) => (
                  <div key={style.id} className="rounded-xl border border-bronze/30 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-serif text-base leading-tight text-cream">{style.style_name}</p>
                      <button
                        type="button"
                        onClick={() => handleUnsaveStyle(style.id)}
                        aria-label="Unsave style"
                        className="shrink-0"
                      >
                        <HeartIcon filled />
                      </button>
                    </div>
                    <span className="mt-2 inline-block rounded-full border border-bronze/40 px-2 py-0.5 text-[10px] font-medium text-bronze2">
                      {formatMatchDate(style.created_at)}
                    </span>
                    <Link
                      href={`/style-match?prefill=${encodeURIComponent(style.style_name)}`}
                      className="mt-3 block text-xs font-semibold text-bronze2 underline underline-offset-2 hover:text-cream"
                    >
                      Match this style →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

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
                <>
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
                  {user && <RecentCompletionsStrip userId={user.id} />}
                </>
              ) : (
                !entitlementLoading &&
                user && (
                  <div className="print-hide mt-6 border-t border-bronze/20 pt-6">
                    <UpgradePrompt userId={user.id} userEmail={user.email} />
                  </div>
                )
              )}
            </div>
          </section>
        )}

        {extensionProfile && (
          <section className="print-hide mt-10">
            <h2 className="font-serif text-2xl font-semibold text-cream">
              My extensions &amp; wig care
            </h2>
            <div className="mt-4 rounded-xl border border-bronze/30 bg-dark p-5">
              <div className="flex flex-wrap gap-2">
                {Array.from(
                  new Set((extensionProfile.extension_types ?? []).map((t) => EXTENSION_TYPE_LABELS[t] ?? t))
                ).map((label) => (
                  <span
                    key={label}
                    className="rounded-full border border-bronze/40 px-3 py-1 text-xs font-medium text-bronze2"
                  >
                    {label}
                  </span>
                ))}
                {(extensionProfile.extension_types ?? []).length === 0 && (
                  <span className="rounded-full border border-bronze/40 px-3 py-1 text-xs font-medium text-bronze2">
                    Protective style only
                  </span>
                )}
                {extensionProfile.natural_curl_type && (
                  <span className="rounded-full border border-bronze/40 px-3 py-1 text-xs font-medium text-bronze2">
                    Natural: {extensionProfile.natural_curl_type === "not_sure" ? "Not sure" : extensionProfile.natural_curl_type}
                  </span>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href={`/routine/extension/${extensionProfile.id}`}
                  className="rounded-lg bg-bronze px-4 py-2 text-sm font-semibold text-dark transition-colors hover:bg-bronze2"
                >
                  View my extension routine →
                </Link>
                {extensionProfile.needs_blending && (
                  <Link
                    href={`/routine/extension/${extensionProfile.id}?tab=blending`}
                    className="rounded-lg border border-bronze/40 px-4 py-2 text-sm font-semibold text-cream transition-colors hover:border-bronze"
                  >
                    Blending guide →
                  </Link>
                )}
              </div>
            </div>
          </section>
        )}

        {!familyProfilesLoading && (babyProfiles.length > 0 || childProfiles.length > 0) && (
          <section className="print-hide mt-10">
            <h2 className="font-serif text-2xl font-semibold text-cream">Family profiles</h2>
            <div className="mt-4 space-y-3">
              {babyProfiles.map((baby) => (
                <div key={baby.id} className="rounded-xl border border-bronze/30 bg-dark p-5">
                  <p className="font-serif text-lg text-cream">{baby.name || "Baby"}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {baby.age_range && (
                      <span className="rounded-full border border-bronze/40 px-3 py-1 text-xs font-medium text-bronze2">
                        {BABY_AGE_RANGE_LABELS[baby.age_range] ?? baby.age_range}
                      </span>
                    )}
                    {baby.hair_texture && (
                      <span className="rounded-full border border-bronze/40 px-3 py-1 text-xs font-medium text-bronze2">
                        {BABY_TEXTURE_LABELS[baby.hair_texture] ?? baby.hair_texture}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex gap-4">
                    <Link
                      href={`/routine/baby/${baby.id}`}
                      className="text-sm font-medium text-bronze2 underline underline-offset-2 hover:text-cream"
                    >
                      View routine →
                    </Link>
                    <Link
                      href={`/profile?editBaby=${baby.id}`}
                      className="text-sm font-medium text-cream/60 underline underline-offset-2 hover:text-cream"
                    >
                      Edit profile →
                    </Link>
                  </div>
                </div>
              ))}

              {childProfiles.map((child) => (
                <div key={child.id} className="rounded-xl border border-bronze/30 bg-dark p-5">
                  <p className="font-serif text-lg text-cream">{child.name || "Child"}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {child.age_range && (
                      <span className="rounded-full border border-bronze/40 px-3 py-1 text-xs font-medium text-bronze2">
                        {CHILD_AGE_RANGE_LABELS[child.age_range] ?? child.age_range}
                      </span>
                    )}
                    {child.curl_type && (
                      <span className="rounded-full border border-bronze/40 px-3 py-1 text-xs font-medium text-bronze2">
                        {child.curl_type === "not_sure" ? "Not sure" : child.curl_type}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex gap-4">
                    <Link
                      href={`/routine/child/${child.id}`}
                      className="text-sm font-medium text-bronze2 underline underline-offset-2 hover:text-cream"
                    >
                      View routine →
                    </Link>
                    <Link
                      href={`/profile?editChild=${child.id}`}
                      className="text-sm font-medium text-cream/60 underline underline-offset-2 hover:text-cream"
                    >
                      Edit profile →
                    </Link>
                  </div>
                </div>
              ))}

              <Link
                href="/profile?addFamily=1"
                className="block rounded-xl border border-dashed border-bronze/40 px-5 py-4 text-center text-sm font-medium text-bronze2 transition-colors hover:border-bronze"
              >
                Add another child&apos;s profile +
              </Link>
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

        {recentStyleMatches.length > 0 && (
          <section className="print-hide mt-10">
            <h2 className="font-serif text-2xl font-semibold text-cream">
              Recent Style Matches
            </h2>
            {user && <StyleMatchFollowUp candidates={followUpCandidates} userId={user.id} />}
            <ul className="mt-4 space-y-2">
              {recentStyleMatches.map((match) => {
                const expanded = expandedMatchId === match.id;
                return (
                  <li
                    key={match.id}
                    className="rounded-lg border border-bronze/30 px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm text-cream">
                          {match.detected_style || "Unknown style"}
                        </p>
                        <p className="mt-0.5 text-xs text-cream/50">
                          {formatMatchDate(match.created_at)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedMatchId(expanded ? null : match.id)
                        }
                        className="shrink-0 text-xs text-bronze2 underline underline-offset-2 hover:text-cream"
                      >
                        {expanded ? "Hide" : "View →"}
                      </button>
                    </div>
                    {expanded && match.detected_details && (
                      <div className="mt-3 border-t border-bronze/20 pt-3">
                        {match.detected_details.style_description && (
                          <p className="text-sm text-cream/70">
                            {match.detected_details.style_description}
                          </p>
                        )}
                        {match.detected_details.maintenance_tips && (
                          <p className="mt-2 text-xs text-cream/50">
                            {match.detected_details.maintenance_tips}
                          </p>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            <Link
              href="/style-match"
              className="mt-4 inline-block text-sm text-bronze2 underline underline-offset-2 hover:text-cream"
            >
              Try another style →
            </Link>
          </section>
        )}

        {travelKits.length > 0 && (
          <section className="print-hide mt-10">
            <h2 className="font-serif text-2xl font-semibold text-cream">
              My Travel Kits
            </h2>
            <ul className="mt-4 space-y-2">
              {travelKits.map((kit) => {
                const isUpcoming = kit.departure_date
                  ? new Date(`${kit.departure_date}T00:00:00`) >= new Date(new Date().toDateString())
                  : true;
                return (
                  <li
                    key={kit.id}
                    className="flex items-center justify-between gap-4 rounded-lg border border-bronze/30 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-cream">{kit.destination}</p>
                      <p className="mt-0.5 text-xs text-cream/50">
                        {kit.travel_month
                          ? kit.travel_month
                          : `${formatTravelDate(kit.departure_date)} – ${formatTravelDate(kit.return_date)}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          isUpcoming
                            ? "bg-green/20 text-green"
                            : "bg-bronze/20 text-bronze2"
                        }`}
                      >
                        {isUpcoming ? "Upcoming" : "Past"}
                      </span>
                      <Link
                        href={`/travel?kit=${kit.id}`}
                        className="text-xs text-bronze2 underline underline-offset-2 hover:text-cream"
                      >
                        View kit →
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
            <Link
              href="/travel?new=true"
              className="mt-4 inline-block text-sm text-bronze2 underline underline-offset-2 hover:text-cream"
            >
              Plan another trip →
            </Link>
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
