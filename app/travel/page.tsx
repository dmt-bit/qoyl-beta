"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import UpgradePrompt from "@/components/UpgradePrompt";
import { useAuth } from "@/lib/auth-context";
import { scoreTier, TIER_CLASSES } from "@/lib/compatibility";
import {
  getTravelKit,
  TRAVEL_CLIMATES,
  TravelClimate,
  TravelKitItem,
} from "@/lib/travelKit";

export default function TravelPage() {
  const router = useRouter();
  const { user, loading: authLoading, hairProfile } = useAuth();

  const [checkedAccess, setCheckedAccess] = useState(false);
  const [hasTravelKit, setHasTravelKit] = useState(false);
  const [entitlementLoading, setEntitlementLoading] = useState(true);

  const [climate, setClimate] = useState<TravelClimate | null>(null);
  const [kit, setKit] = useState<TravelKitItem[]>([]);
  const [kitLoading, setKitLoading] = useState(false);

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
  }, [user]);

  async function handleSelectClimate(value: TravelClimate) {
    setClimate(value);
    setKitLoading(true);
    const result = await getTravelKit(hairProfile?.porosity ?? null, value);
    setKit(result);
    setKitLoading(false);
  }

  if (!checkedAccess) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-dark font-sans">
        <p className="text-sm text-cream/60">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-dark px-4 py-10 font-sans text-cream sm:px-6">
      <div className="mx-auto max-w-md">
        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl">
          <Image
            src="/travel/hero.webp"
            alt="Don't let vacation ruin your hair progress"
            fill
            sizes="(min-width: 768px) 448px, 100vw"
            className="object-cover"
            priority
          />
        </div>

        <h1 className="mt-6 font-serif text-3xl font-semibold text-cream sm:text-4xl">
          Your hair, your destination.
        </h1>
        <p className="mt-2 text-sm text-cream/70">
          Tell us where you&apos;re going — we&apos;ll build a personalized
          list of 5 products matched to your hair profile and your
          destination climate, with direct shopping links for each one.
        </p>

        {!entitlementLoading && !hasTravelKit && (
          <div className="mt-8">
            <UpgradePrompt
              feature="travel_kit"
              price="$4.99 one-time"
              title="Travel Kit"
              description="A personalized list of 5 products matched to your hair profile and your destination climate, with direct shopping links for each one."
              ctaLabel="Get my personalized kit list →"
            />

            <div className="relative mt-6 aspect-[4/5] w-full overflow-hidden rounded-xl">
              <Image
                src="/travel/kit-products.webp"
                alt="5 products, your hair, your destination climate"
                fill
                sizes="(min-width: 768px) 448px, 100vw"
                className="object-cover"
              />
            </div>
          </div>
        )}

        {!entitlementLoading && hasTravelKit && (
          <div className="mt-8">
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
                            <p className="font-serif text-lg text-cream">
                              {item.ingredientName}
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
                  purchase directly from the brand or retailer. All products
                  are independently evaluated by Qoyl with no brand
                  partnerships influencing recommendations.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
