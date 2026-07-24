"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { scoreTier, TIER_CLASSES } from "@/lib/compatibility";
import {
  getTravelKit,
  TRAVEL_CLIMATES,
  TravelClimate,
  TravelKitItem,
} from "@/lib/travelKit";

// ---- Icons -- outline style matching the rest of the app (stroke,
// 24x24 viewBox, strokeWidth 1.5, currentColor) ----

function DropletIcon() {
  return (
    <svg className="h-7 w-7 text-bronze" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.25S6 9.5 6 13.5a6 6 0 0012 0c0-4-6-11.25-6-11.25z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg className="h-7 w-7 text-bronze" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-6.364-.386l1.591-1.591M3 12h2.25m.386-6.364l1.591 1.591M16.5 12a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
    </svg>
  );
}

function SnowflakeIcon() {
  return (
    <svg className="h-7 w-7 text-bronze" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.5v19M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07M2.5 12h19M8 5l4-2.5L16 5M8 19l4 2.5L16 19M5 8l-2.5 4L5 16M19 8l2.5 4L19 16" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg className="h-7 w-7 text-bronze" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75l2.25 2.25L15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg className="h-5 w-5 text-bronze2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12M8.25 17.25h12M4.5 6.75h.008v.008H4.5V6.75zM4.5 12h.008v.008H4.5V12zm0 5.25h.008v.008H4.5v-.008z" />
    </svg>
  );
}

function BeakerIcon() {
  return (
    <svg className="h-5 w-5 text-bronze2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5m4.75-11.396a24.301 24.301 0 014.5 0M14.25 3.104v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M9.75 3.104c1.499-.137 3.001-.137 4.5 0M5 14.5l1.35.35a9.065 9.065 0 006.23-.693 9.065 9.065 0 016.23-.693l1.35.35M5 14.5l-1.402 1.402c-1.232 1.232-.65 3.318 1.067 3.611A48.309 48.309 0 0012 20c2.773 0 5.491-.235 8.135-.687 1.718-.293 2.3-2.379 1.067-3.61L19.8 15.3" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg className="h-5 w-5 text-bronze2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg className="h-5 w-5 text-bronze2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
    </svg>
  );
}

const CLIMATE_PROBLEM_CARDS = [
  {
    icon: DropletIcon,
    title: "Humidity zones",
    examples: "Miami, Houston, Southeast Asia",
    description:
      "High humidity causes frizz and hygral fatigue for most hair types. You need lighter products and frizz control — not your usual heavy routine.",
  },
  {
    icon: SunIcon,
    title: "Dry climates",
    examples: "Phoenix, Las Vegas, Denver, desert climates",
    description:
      "Low humidity pulls moisture out of your hair faster than normal. Humectants like glycerin work against you here. Your routine needs heavier sealants and less water-attracting ingredients.",
  },
  {
    icon: SnowflakeIcon,
    title: "Cold & dry",
    examples: "Chicago in January, NYC, Northern Europe",
    description:
      "Cold air holds less moisture and indoor heating strips what's left. Hair gets brittle and breaks more easily. Your kit needs more protein protection and occlusive sealing.",
  },
  {
    icon: CheckCircleIcon,
    title: "Similar climate",
    examples: null,
    description:
      "If your destination has a similar climate to home, your existing routine mostly works — but hard water differences can still affect how your products perform.",
  },
];

const FEATURE_ROWS = [
  {
    icon: ListIcon,
    title: "5 personalized product recommendations",
    description:
      "Not generic travel picks. Products matched to your curl type, porosity, and your destination climate specifically.",
  },
  {
    icon: BeakerIcon,
    title: "Climate-specific ingredient guidance",
    description:
      "We flag which ingredients in your usual products will work against you at your destination, and what to look for instead.",
  },
  {
    icon: LinkIcon,
    title: "Direct shopping links",
    description:
      "Every recommendation links directly to where you can buy it. Shop before you pack.",
  },
  {
    icon: SparklesIcon,
    title: "Works for every hair type",
    description:
      "Whether you have 1a pin-straight hair or 4c tight coils, the kit is built from your specific profile. Waves, curls, coils, straight — all textures covered.",
  },
];

const STATS = [
  {
    stat: "6 variables",
    description:
      "We score products against your curl type, porosity, scalp, climate, strand thickness, and water type",
  },
  {
    stat: "200+ ingredients",
    description:
      "In our database — scored for every hair type and climate combination",
  },
  {
    stat: "10 seconds",
    description: "To get your personalized travel kit once your profile is built",
  },
];

// No real product/brand catalog exists yet (Phase 1) -- these render as
// guidance ("look for a cleanser with X") rather than a specific product
// name, so nothing implies a real shoppable item that doesn't exist.
const CATEGORY_NOUN: Record<string, string> = {
  shampoo: "cleanser",
  conditioner: "conditioner",
  leave_in: "leave-in conditioner",
  gel: "styler",
  curl_refresher: "curl refresher",
};

export default function TravelPage() {
  const router = useRouter();
  const { user, loading: authLoading, hairProfile } = useAuth();

  const [hasTravelKit, setHasTravelKit] = useState(false);
  const [entitlementLoading, setEntitlementLoading] = useState(true);

  const [climate, setClimate] = useState<TravelClimate | null>(null);
  const [kit, setKit] = useState<TravelKitItem[]>([]);
  const [kitLoading, setKitLoading] = useState(false);

  const [buildLoading, setBuildLoading] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setHasTravelKit(false);
      setEntitlementLoading(false);
      return;
    }
    let cancelled = false;

    async function loadEntitlement() {
      setEntitlementLoading(true);
      try {
        const res = await fetch(`/api/purchases?user_id=${user!.id}`);
        const data = await res.json();
        if (!cancelled) setHasTravelKit(Boolean(data.hasTravelKit));
      } catch {
        // Fail closed -- treat as not purchased.
      } finally {
        if (!cancelled) setEntitlementLoading(false);
      }
    }

    loadEntitlement();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  async function handleSelectClimate(value: TravelClimate) {
    setClimate(value);
    setKitLoading(true);
    const result = await getTravelKit(hairProfile?.porosity ?? null, value);
    setKit(result);
    setKitLoading(false);
  }

  async function handleBuildClick() {
    if (!user) {
      router.push("/auth");
      return;
    }

    setBuildError(null);
    setBuildLoading(true);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_type: "travel_kit",
          user_id: user.id,
          email: user.email,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.url) {
        setBuildError(data.error ?? "Something went wrong. Please try again.");
        setBuildLoading(false);
        return;
      }

      window.location.href = data.url;
    } catch {
      setBuildError("Couldn't reach the server. Please try again.");
      setBuildLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-dark font-sans text-cream">
      {/* SECTION 1 -- Hero (no login required) */}
      <section className="border-b border-bronze/20 px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-bronze">
            Travel hair intelligence
          </p>
          <h1 className="mt-4 font-serif text-4xl font-semibold leading-tight text-cream sm:text-5xl">
            Your hair doesn&apos;t know you&apos;re on vacation.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-cream/70">
            Humidity in Miami. Dry heat in Phoenix. Hard water in London.
            Every destination changes what your hair needs — and most
            people find out the hard way mid-trip. Qoyl builds you a
            personalized product list before you leave.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CLIMATE_PROBLEM_CARDS.map((card) => (
            <div
              key={card.title}
              className="rounded-xl border border-bronze/30 p-6"
            >
              <card.icon />
              <h3 className="mt-4 font-serif text-xl font-semibold text-cream">
                {card.title}
              </h3>
              {card.examples && (
                <p className="mt-1 text-xs text-cream/40">{card.examples}</p>
              )}
              <p className="mt-2 text-sm text-cream/70">{card.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 2 -- What you get (no login required) */}
      <section className="border-b border-bronze/20 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-serif text-3xl font-semibold text-cream sm:text-4xl">
            What&apos;s in your travel kit
          </h2>

          <div className="mt-10 space-y-8">
            {FEATURE_ROWS.map((row) => (
              <div key={row.title} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-bronze/40 bg-bronze/10">
                  <row.icon />
                </div>
                <div>
                  <p className="font-serif text-lg font-semibold text-cream">
                    {row.title}
                  </p>
                  <p className="mt-1 text-sm text-cream/70">{row.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3 -- Social proof strip */}
      <section className="bg-bronze px-4 py-12 sm:px-6">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 text-center sm:grid-cols-3 sm:text-left">
          {STATS.map((s) => (
            <div key={s.stat}>
              <p className="font-serif text-3xl font-semibold text-dark">
                {s.stat}
              </p>
              <p className="mt-2 text-sm text-dark/70">{s.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 4 -- Paywall / CTA, or the climate selector + kit */}
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-md">
          {authLoading || entitlementLoading ? (
            <p className="text-sm text-cream/50">Loading...</p>
          ) : !hasTravelKit ? (
            <div className="rounded-xl border border-bronze/30 p-8 text-center">
              <h2 className="font-serif text-2xl font-semibold text-cream sm:text-3xl">
                Get your personalized travel kit — $4.99
              </h2>
              <p className="mt-3 text-sm text-cream/70">
                One-time purchase. Tell us where you&apos;re going and we
                build your kit. Yours to keep and shop from before you
                leave.
              </p>

              {buildError && (
                <p className="mt-3 text-sm text-red">{buildError}</p>
              )}

              <button
                type="button"
                onClick={handleBuildClick}
                disabled={buildLoading}
                className="mt-6 w-full rounded-lg bg-bronze py-4 text-sm font-semibold text-dark transition-colors hover:bg-bronze2 disabled:opacity-50"
              >
                {buildLoading ? "Redirecting..." : "Build my travel kit →"}
              </button>

              <p className="mt-4 text-xs text-cream/50">
                Already have a hair profile? Your kit uses your existing
                profile data — no re-entering anything.
              </p>
            </div>
          ) : (
            <div>
              <p className="font-serif text-lg text-bronze2">
                Where are you headed?
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {TRAVEL_CLIMATES.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelectClimate(option.value)}
                    className={`rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                      climate === option.value
                        ? "border-bronze bg-bronze text-dark"
                        : "border-bronze/40 text-cream hover:border-bronze"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {kitLoading && (
                <p className="mt-6 text-sm text-cream/50">
                  Building your kit...
                </p>
              )}

              {!kitLoading && kit.length > 0 && (
                <>
                  <p className="mt-8 font-serif text-xl font-semibold text-cream">
                    Your travel kit for{" "}
                    {TRAVEL_CLIMATES.find((c) => c.value === climate)?.label}
                  </p>

                  <ul className="mt-4 space-y-3">
                    {kit.map((item) => (
                      <li
                        key={item.category}
                        className="rounded-lg border border-bronze/30 p-4"
                      >
                        <p className="text-xs uppercase tracking-wide text-bronze2">
                          {item.categoryLabel}
                        </p>
                        {item.ingredientName ? (
                          <>
                            <div className="mt-1 flex items-center justify-between gap-3">
                              <p className="text-sm text-cream">
                                Look for a{" "}
                                {CATEGORY_NOUN[item.category] ?? "product"} with{" "}
                                <span className="font-serif text-lg">
                                  {item.ingredientName}
                                </span>{" "}
                                as a primary ingredient.
                              </p>
                              {item.score !== null && (
                                <span
                                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                                    TIER_CLASSES[scoreTier(item.score * 10)]
                                  }`}
                                >
                                  {item.score}/10
                                </span>
                              )}
                            </div>
                            {item.reason && (
                              <p className="mt-1 text-xs text-cream/60">
                                {item.reason}
                              </p>
                            )}
                            <a
                              href={item.affiliateLink}
                              className="mt-2 inline-block text-xs text-bronze2 underline"
                            >
                              Shop this product →
                            </a>
                          </>
                        ) : (
                          <p className="mt-1 text-sm text-cream/50">
                            No match found yet for this category.
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>

                  <p className="mt-4 text-xs text-cream/50">
                    Your kit is a curated digital guide — click each link to
                    purchase directly from the brand or retailer. All
                    products are independently evaluated by Qoyl with no
                    brand partnerships influencing recommendations.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
