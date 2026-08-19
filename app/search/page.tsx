"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import FeedbackSurveyModal from "@/components/FeedbackSurveyModal";
import SearchAuthGate from "@/components/SearchAuthGate";
import ShopButton from "@/components/ShopButton";
import UpgradeWall from "@/components/UpgradeWall";
import { useAuth } from "@/lib/auth-context";
import {
  Match,
  RATING_BORDER_CLASSES,
  ScoreResult,
  TIER_CLASSES,
  scoreCatalogProducts,
  scoreIngredientsText,
  scoreTier,
} from "@/lib/compatibility";
import { CATEGORY_LABEL_BY_SLUG, PRODUCT_CATEGORIES } from "@/lib/productCategories";
import {
  DAILY_SEARCH_LIMIT,
  SearchLimitState,
  consumeSearch,
  effectiveSearchState,
  readAnonSearchState,
  writeAnonSearchState,
} from "@/lib/searchLimit";
import { supabase } from "@/lib/supabase";

const TIER_LABELS: Record<"green" | "amber" | "red", string> = {
  green: "Good match",
  amber: "Check ingredients",
  red: "Not recommended",
};

type Product = {
  code: string;
  name: string;
  brand: string;
  catalogProductId: string;
  imageUrl: string | null;
  categorySlug: string | null;
};

type QoylProductRow = {
  id: string;
  name: string;
  barcode: string | null;
  image_url: string | null;
  catalog_brands: { name: string } | null;
  categories: { slug: string } | null;
};

// catalog_products/catalog_brands -- not "products"/"brands" -- since
// this Supabase project is shared with qoyl-business, which already has
// its own brands/products tables for its B2B dashboard with a completely
// different schema. Keeping qoyl-beta's consumer catalog on separate
// tables avoids colliding with that.
const QOYL_PRODUCT_SELECT =
  "id, name, barcode, image_url, catalog_brands(name), categories(slug)";

function toQoylProduct(p: QoylProductRow): Product {
  return {
    code: p.id,
    name: p.name,
    brand: p.catalog_brands?.name ?? "Unknown brand",
    catalogProductId: p.id,
    imageUrl: p.image_url,
    categorySlug: p.categories?.slug ?? null,
  };
}

// Searches Qoyl's own curated catalog_products table only -- by product
// name and by brand name via the catalog_brands join. Two separate
// queries merged client-side rather than a single .or() filter across
// the join, since PostgREST's embedded-resource filter syntax is easy to
// get subtly wrong with arbitrary user input. categoryId, when given,
// narrows both queries -- e.g. "Leave-In" selected + "Mielle" typed shows
// only Mielle leave-ins, not every Mielle product.
async function fetchQoylProducts(
  query: string,
  categoryId: string | null
): Promise<Product[]> {
  const term = `%${query}%`;

  let byNameQuery = supabase
    .from("catalog_products")
    .select(QOYL_PRODUCT_SELECT)
    .ilike("name", term);
  if (categoryId) byNameQuery = byNameQuery.eq("category_id", categoryId);

  const [{ data: byName }, { data: matchingBrands }] = await Promise.all([
    byNameQuery.limit(20),
    supabase.from("catalog_brands").select("id").ilike("name", term),
  ]);

  const brandIds = (matchingBrands ?? []).map((b) => b.id);
  let byBrand: QoylProductRow[] = [];
  if (brandIds.length) {
    let byBrandQuery = supabase
      .from("catalog_products")
      .select(QOYL_PRODUCT_SELECT)
      .in("brand_id", brandIds);
    if (categoryId) byBrandQuery = byBrandQuery.eq("category_id", categoryId);
    const { data } = await byBrandQuery.limit(20);
    byBrand = (data ?? []) as unknown as QoylProductRow[];
  }

  const merged = new Map<string, QoylProductRow>();
  for (const row of [...(byName ?? []), ...byBrand]) {
    merged.set(row.id, row as unknown as QoylProductRow);
  }

  return Array.from(merged.values()).map(toQoylProduct);
}

// Category browse with no search term -- every product in the category,
// ordered by brand then product name (not relevance, since there's no
// search term to rank against).
async function fetchProductsByCategory(categoryId: string): Promise<Product[]> {
  const { data } = await supabase
    .from("catalog_products")
    .select(QOYL_PRODUCT_SELECT)
    .eq("category_id", categoryId)
    .order("name", { foreignTable: "catalog_brands" })
    .order("name");

  return ((data ?? []) as unknown as QoylProductRow[]).map(toQoylProduct);
}

type ScoreState =
  | { status: "loading" }
  | { status: "done"; result: ScoreResult }
  | { status: "error"; error: string };

function IngredientRow({ match }: { match: Match }) {
  const borderClass = RATING_BORDER_CLASSES[match.rating] ?? "border-muted";
  const label =
    match.rating.charAt(0).toUpperCase() + match.rating.slice(1);

  return (
    <div className={`border-l-4 py-1.5 pl-2.5 ${borderClass}`}>
      <span className="font-sans text-[12px] text-cream">
        {match.ingredient_name}
      </span>
      <span className="ml-1.5 font-sans text-[10px] text-muted">{label}</span>
    </div>
  );
}

function ResultCard({
  product,
  scoreState,
  cardExpanded,
  onToggleCard,
  ingredientsExpanded,
  onToggleIngredients,
}: {
  product: Product;
  scoreState: ScoreState | undefined;
  cardExpanded: boolean;
  onToggleCard: () => void;
  ingredientsExpanded: boolean;
  onToggleIngredients: (e: React.MouseEvent) => void;
}) {
  const matches = scoreState?.status === "done" ? scoreState.result.matches : [];
  const preview = matches.slice(0, 4);
  const rest = matches.slice(4);
  const tier =
    scoreState?.status === "done" ? scoreTier(scoreState.result.normalizedScore) : null;

  return (
    <li className="border-b border-[#2C2420]">
      <div
        role="button"
        tabIndex={0}
        onClick={onToggleCard}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggleCard();
          }
        }}
        className="cursor-pointer px-4 py-3"
      >
        <div className="flex items-start gap-3">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[#2C2420]">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt=""
                fill
                sizes="48px"
                className="object-cover"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-bronze/30 to-dark" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
              <span className="font-sans text-[13px] font-medium text-cream">
                {product.name}
              </span>
              <span className="font-sans text-[11px] text-muted">
                {product.brand}
              </span>
              <span className="shrink-0 rounded-full border border-bronze/40 px-1.5 py-0.5 font-sans text-[8px] font-medium text-bronze2">
                Verified by Qoyl ✓
              </span>
              {product.categorySlug && (
                <span className="shrink-0 rounded-full bg-dark px-2 py-1 font-sans text-[8px] font-medium uppercase tracking-wide text-bronze">
                  {CATEGORY_LABEL_BY_SLUG[product.categorySlug] ?? product.categorySlug}
                </span>
              )}
            </div>

            {!cardExpanded && (
              <p className="mt-1 font-sans text-[11px] text-bronze">
                Tap to see compatibility score →
              </p>
            )}

            {cardExpanded && scoreState?.status === "loading" && (
              <p className="mt-1 font-sans text-[10px] text-cream/50">
                Scoring...
              </p>
            )}
            {cardExpanded && scoreState?.status === "error" && (
              <p className="mt-1 font-sans text-[10px] text-red">
                Couldn&apos;t score this product.
              </p>
            )}
            {cardExpanded && tier && scoreState?.status === "done" && (
              <>
                <span
                  className={`mt-1 inline-block rounded-full px-2 py-0.5 font-sans text-[11px] font-semibold ${TIER_CLASSES[tier]}`}
                >
                  {scoreState.result.normalizedScore} · {TIER_LABELS[tier]}
                </span>
                <div>
                  <Link
                    href="/how-we-score"
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1 inline-block font-sans text-[10px] text-bronze hover:text-bronze2"
                  >
                    How is this score calculated? →
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>

        {cardExpanded && preview.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {preview.map((m, i) => (
              <IngredientRow key={`${m.ingredient_name}-${i}`} match={m} />
            ))}

            {rest.length > 0 && (
              <>
                <div
                  className={`space-y-1.5 overflow-hidden transition-[max-height] duration-500 ease-in-out ${
                    ingredientsExpanded ? "max-h-[1000px]" : "max-h-0"
                  }`}
                >
                  {rest.map((m, i) => (
                    <IngredientRow key={`${m.ingredient_name}-${i + 4}`} match={m} />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={onToggleIngredients}
                  className="font-sans text-[11px] text-bronze2 hover:text-cream"
                >
                  {ingredientsExpanded
                    ? "Hide ingredients ↑"
                    : `See all ${matches.length} ingredients →`}
                </button>
              </>
            )}

            <div className="pt-1" onClick={(e) => e.stopPropagation()}>
              <ShopButton
                productName={product.name}
                brandName={product.brand}
                className="font-sans text-[11px] text-bronze2 hover:text-cream"
              />
            </div>
          </div>
        )}
      </div>
    </li>
  );
}

function DisclaimerBanner() {
  return (
    <div
      className="mb-6 border-l-[3px] border-bronze bg-warm px-4 py-3 font-sans text-[12px] text-dark"
    >
      Qoyl provides cosmetic ingredient compatibility scores only — not
      medical advice. Results are based on your hair profile and our
      ingredient database. Individual results may vary. Free users get 5
      product searches per day. Unlock unlimited searches and Style Match
      with a{" "}
      <Link href="/dashboard" className="underline underline-offset-2">
        Qoyl subscription
      </Link>
      .
    </div>
  );
}

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, hairProfile, hairProfileLoading } =
    useAuth();

  // Anonymous visitors who built a profile without an account (no login,
  // just a hair_profile_id in localStorage) keep the existing "no account
  // required to try" path -- checked once on mount since localStorage
  // isn't available during the initial server render.
  const [hasLocalProfile, setHasLocalProfile] = useState(false);
  const [localProfileChecked, setLocalProfileChecked] = useState(false);

  useEffect(() => {
    setHasLocalProfile(Boolean(localStorage.getItem("hair_profile_id")));
    setLocalProfileChecked(true);
  }, []);

  // True until we know both whether the visitor is signed in and, if so,
  // whether they have a saved hair profile.
  const resolvingAccess =
    authLoading || (Boolean(user) && hairProfileLoading) || !localProfileChecked;

  // A plain spinner is fine for a brief check, but must never hang
  // indefinitely -- after 1s of still resolving, switch to a skeleton
  // that at least shows the page's shape instead of an open-ended spinner.
  const [showAccessSkeleton, setShowAccessSkeleton] = useState(false);

  useEffect(() => {
    if (!resolvingAccess) {
      setShowAccessSkeleton(false);
      return;
    }
    const timeoutId = setTimeout(() => setShowAccessSkeleton(true), 1000);
    return () => clearTimeout(timeoutId);
  }, [resolvingAccess]);

  const canSearch = Boolean((user && hairProfile) || (!user && hasLocalProfile));

  // Search-limit tracking. subscribed/entitlementLoaded cover the
  // "unlimited for active subscribers" carve-out (only ever true for
  // signed-in users -- checkout requires a user_id, so anonymous users
  // can never hold a subscription). searchState is the raw stored
  // count/resetAt (DB-backed for signed-in users, localStorage for
  // anonymous); it's read through effectiveSearchState() everywhere it's
  // displayed or checked, so an expired 24h window always shows as reset
  // even before the next search writes that reset back to storage.
  const [subscribed, setSubscribed] = useState(false);
  const [entitlementLoaded, setEntitlementLoaded] = useState(false);
  const [searchState, setSearchState] = useState<SearchLimitState>({
    count: 0,
    resetAt: null,
  });
  const [searchStateLoaded, setSearchStateLoaded] = useState(false);
  const [limitReached, setLimitReached] = useState(false);

  useEffect(() => {
    if (!user) {
      setSubscribed(false);
      setEntitlementLoaded(true);
      return;
    }
    let cancelled = false;
    setEntitlementLoaded(false);

    (async () => {
      try {
        const res = await fetch(`/api/purchases?user_id=${user.id}`);
        const data = await res.json();
        if (!cancelled) setSubscribed(Boolean(data.hasRoutineSubscription));
      } catch {
        // Fail closed -- treat as not subscribed.
      } finally {
        if (!cancelled) setEntitlementLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user) {
      setSearchState(readAnonSearchState());
      setSearchStateLoaded(true);
      return;
    }
    if (hairProfileLoading) return;
    if (hairProfile) {
      setSearchState({
        count: hairProfile.daily_search_count ?? 0,
        resetAt: hairProfile.daily_search_reset_at,
      });
    } else {
      // Signed in but hasn't saved a hair profile yet -- there's no row
      // to track the count on, so fall back to the same per-device
      // localStorage tracking anonymous users get until they have one.
      setSearchState(readAnonSearchState());
    }
    setSearchStateLoaded(true);
  }, [user, hairProfile, hairProfileLoading]);

  // Gates the search-triggering effect below so it never runs against
  // stale defaults (e.g. treating a subscriber as unsubscribed, or a
  // user who's already at their limit as having zero searches used)
  // while entitlement/search-state are still loading.
  const readyToSearch = entitlementLoaded && searchStateLoaded;

  // Checks the current limit and, if allowed, persists the incremented
  // count. Returns whether the caller may proceed with the search.
  async function consumeOneSearch(): Promise<boolean> {
    if (subscribed) return true;

    const effective = effectiveSearchState(searchState);
    const next = consumeSearch(effective);
    if (!next) {
      setLimitReached(true);
      return false;
    }

    setSearchState(next);
    setLimitReached(false);

    if (user && hairProfile) {
      const { error } = await supabase
        .from("hair_profiles")
        .update({
          daily_search_count: next.count,
          daily_search_reset_at: next.resetAt,
        })
        .eq("user_id", user.id);
      if (error) console.error("Failed to update search count:", error);
    } else {
      writeAnonSearchState(next);
    }

    return true;
  }

  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [categorySlug, setCategorySlug] = useState(
    () => searchParams.get("category") ?? null
  );
  // categories.id per slug, fetched once -- catalog_products only stores
  // category_id (a FK), so the slug from the URL/pill has to be resolved
  // to a real id before it can be used to filter a query.
  const [categoryIdBySlug, setCategoryIdBySlug] = useState<Record<string, string>>({});
  const categoryId = categorySlug ? categoryIdBySlug[categorySlug] ?? null : null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("categories").select("id, slug");
      if (cancelled || !data) return;
      setCategoryIdBySlug(
        Object.fromEntries(data.map((c) => [c.slug, c.id as string]))
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleCategoryTap(slug: string) {
    setCategorySlug((prev) => (prev === slug ? null : slug));
    setQuery("");
  }

  const [hasScrolledCategories, setHasScrolledCategories] = useState(false);

  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [scoresByCode, setScoresByCode] = useState<Record<string, ScoreState>>({});
  // Only one result card can be expanded at a time -- expandedCardCode is
  // that product's code, or null if every card is collapsed.
  // ingredientsExpanded is the "see all ingredients" sub-toggle inside
  // whichever card is currently expanded; resets whenever the expanded
  // card changes.
  const [expandedCardCode, setExpandedCardCode] = useState<string | null>(null);
  const [ingredientsExpanded, setIngredientsExpanded] = useState(false);

  const [manualIngredients, setManualIngredients] = useState("");
  const [manualScoring, setManualScoring] = useState(false);
  const [manualScoreError, setManualScoreError] = useState<string | null>(null);
  const [manualScoreResult, setManualScoreResult] = useState<ScoreResult | null>(
    null
  );
  const [showSurvey, setShowSurvey] = useState(false);

  const latestRequestRef = useRef("");

  // Only counts completed searches for signed-in users, and only until
  // the survey has been submitted or dismissed once -- after that
  // localStorage flag is set, this is a no-op forever.
  function recordSearchCompletion() {
    if (!user) return;
    if (localStorage.getItem("feedback_submitted") === "true") return;

    const count =
      parseInt(localStorage.getItem("product_search_count") ?? "0", 10) + 1;
    localStorage.setItem("product_search_count", String(count));

    if (count === 2) {
      setShowSurvey(true);
    }
  }

  // Best-effort analytics logging -- a failure here must never surface to
  // the user or interrupt the actual search/scoring flow.
  async function logProductSearch(product: Product, score: number) {
    try {
      let porosity: string | null = null;
      let curlType: string | null = null;

      if (user && hairProfile) {
        porosity = hairProfile.porosity;
        curlType = hairProfile.curl_type;
      } else {
        const profileId = localStorage.getItem("hair_profile_id");
        if (profileId) {
          const { data } = await supabase
            .from("hair_profiles")
            .select("porosity, curl_type")
            .eq("id", profileId)
            .single();
          if (data) {
            porosity = data.porosity;
            curlType = data.curl_type;
          }
        }
      }

      await supabase.from("product_searches").insert({
        user_id: user?.id ?? null,
        product_name: product.name,
        brand_name: product.brand,
        barcode: product.code,
        compatibility_score: score,
        hair_profile_porosity: porosity,
        hair_profile_curl_type: curlType,
      });
    } catch (err) {
      console.error("Failed to log product search:", err);
    }
  }

  async function scoreResults(products: Product[], forRequest: string) {
    setScoresByCode((prev) => {
      const next = { ...prev };
      for (const p of products) next[p.code] = { status: "loading" };
      return next;
    });

    const idByCode = new Map(products.map((p) => [p.catalogProductId, p.code]));
    const outcomes = await scoreCatalogProducts(
      products.map((p) => p.catalogProductId)
    );

    if (latestRequestRef.current !== forRequest) return; // stale search, ignore

    setScoresByCode((prev) => {
      const next = { ...prev };
      for (const [productId, outcome] of Object.entries(outcomes)) {
        const code = idByCode.get(productId);
        if (!code) continue;
        next[code] =
          outcome.error || !outcome.result
            ? { status: "error", error: outcome.error ?? "Something went wrong." }
            : { status: "done", result: outcome.result };
      }
      return next;
    });

    for (const p of products) {
      const outcome = outcomes[p.catalogProductId];
      if (outcome?.result) {
        logProductSearch(p, outcome.result.normalizedScore);
      }
    }

    recordSearchCompletion();
  }

  // Keeps the URL in sync with category/query state (item 6) -- runs
  // immediately, separately from the debounced fetch below, so the URL
  // reflects what's typed/selected even before the fetch settles.
  useEffect(() => {
    const params = new URLSearchParams();
    if (categorySlug) params.set("category", categorySlug);
    if (query.trim()) params.set("q", query);
    const qs = params.toString();
    router.replace(qs ? `/search?${qs}` : "/search", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, categorySlug]);

  useEffect(() => {
    const trimmed = query.trim();

    // Neither a category nor a search term -- idle state, no fetch, no
    // search consumed. Keyed on categorySlug (the UI selection), not
    // categoryId (which only resolves once the categories fetch above
    // completes) -- otherwise tapping a pill before that fetch finishes
    // would be wrongly treated as idle.
    if (!categorySlug && trimmed === "") {
      latestRequestRef.current = "";
      setResults([]);
      setHasSearched(false);
      setSearchError(null);
      setScoresByCode({});
      setExpandedCardCode(null);
      setIngredientsExpanded(false);
      setLimitReached(false);
      return;
    }

    // A category is selected but its id hasn't resolved yet -- wait
    // rather than fetching with a null categoryId (which would silently
    // run an unfiltered search). Re-fires once categoryIdBySlug loads.
    if (categorySlug && !categoryId) return;

    // Entitlement/search-state haven't loaded yet -- wait rather than
    // checking the limit against stale defaults. The effect re-runs once
    // readyToSearch flips true.
    if (!readyToSearch) return;

    const timeoutId = setTimeout(async () => {
      const thisRequest = `${categoryId ?? ""}::${trimmed}`;
      latestRequestRef.current = thisRequest;

      const allowed = await consumeOneSearch();
      if (latestRequestRef.current !== thisRequest) return;
      if (!allowed) {
        setResults([]);
        setHasSearched(false);
        setSearchError(null);
        setScoresByCode({});
        return;
      }

      setLoading(true);
      setSearchError(null);

      try {
        const qoylProducts =
          categoryId && trimmed === ""
            ? await fetchProductsByCategory(categoryId)
            : await fetchQoylProducts(trimmed, categoryId);
        if (latestRequestRef.current !== thisRequest) return;

        setResults(qoylProducts);
        setHasSearched(true);
        setExpandedCardCode(null);
        setIngredientsExpanded(false);
        setScoresByCode({});

        if (qoylProducts.length > 0) {
          scoreResults(qoylProducts, thisRequest);
        }
      } catch {
        if (latestRequestRef.current === thisRequest) {
          setSearchError("Couldn't reach the product search. Try again.");
          setHasSearched(true);
        }
      } finally {
        if (latestRequestRef.current === thisRequest) setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, categorySlug, categoryId, readyToSearch]);

  function toggleCard(code: string) {
    setExpandedCardCode((prev) => (prev === code ? null : code));
    setIngredientsExpanded(false);
  }

  function toggleIngredients(e: React.MouseEvent) {
    e.stopPropagation();
    setIngredientsExpanded((prev) => !prev);
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    setManualScoring(true);
    setManualScoreError(null);
    setManualScoreResult(null);

    const outcome = await scoreIngredientsText(manualIngredients);

    setManualScoring(false);

    if (outcome.error || !outcome.result) {
      setManualScoreError(outcome.error ?? "Something went wrong.");
      return;
    }

    setManualScoreResult(outcome.result);
  }

  const showNoResults = !loading && hasSearched && results.length === 0 && !searchError;

  if (resolvingAccess) {
    if (showAccessSkeleton) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-dark px-4 font-sans sm:px-6">
          <div className="w-full max-w-md">
            <div className="h-12 w-full animate-pulse rounded-lg bg-[#2C2420]" />
          </div>
        </main>
      );
    }
    return (
      <main className="flex min-h-screen items-center justify-center bg-dark font-sans">
        <p className="text-sm text-cream/60">Loading...</p>
      </main>
    );
  }

  if (!canSearch) {
    return <SearchAuthGate variant={user ? "no-profile" : "anonymous"} />;
  }

  const effectiveSearches = effectiveSearchState(searchState);

  return (
    <main className="min-h-screen bg-dark px-4 py-10 font-sans text-cream sm:px-6">
      <div className="mx-auto max-w-md">
        <DisclaimerBanner />

        <h1 className="font-serif text-3xl font-semibold text-cream sm:text-4xl">
          Search a Product
        </h1>
        <p className="mt-2 text-sm text-cream/70">
          Find a product to check its compatibility with your hair profile.
        </p>

        <div className="relative -mx-4 mt-6 px-4 sm:mx-0 sm:px-0">
          <div
            onScroll={() => setHasScrolledCategories(true)}
            className="no-scrollbar flex gap-2 overflow-x-auto pb-1"
          >
            {PRODUCT_CATEGORIES.map((c) => {
              const isActive = c.slug === categorySlug;
              return (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => handleCategoryTap(c.slug)}
                  className={`shrink-0 whitespace-nowrap rounded-full border border-bronze px-3 py-1.5 font-sans text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-dark text-cream"
                      : "bg-transparent text-bronze hover:bg-bronze/10"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex w-10 items-center justify-end bg-gradient-to-r from-transparent to-dark">
            {!hasScrolledCategories && (
              <span className="pr-1 text-lg leading-none text-bronze">›</span>
            )}
          </div>
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by product name or brand..."
          className="mt-4 w-full rounded-lg border border-bronze/40 bg-transparent px-4 py-3 text-sm text-cream placeholder:text-cream/40 focus:border-bronze focus:outline-none"
        />

        {!categorySlug && query.trim() === "" && (
          <p className="mt-2 font-sans text-[11px] text-cream/40">
            Or browse by category above ↑
          </p>
        )}

        {readyToSearch && subscribed && (
          <p className="mt-2 font-sans text-[10px] font-medium text-bronze">
            Unlimited searches · Subscriber
          </p>
        )}
        {readyToSearch && !subscribed && !limitReached && (
          <p className="mt-2 font-sans text-[10px] text-bronze/70">
            {effectiveSearches.count} of {DAILY_SEARCH_LIMIT} free searches
            used today
          </p>
        )}

        {limitReached && (
          <UpgradeWall
            resetAt={searchState.resetAt}
            userId={user?.id ?? null}
            userEmail={user?.email}
          />
        )}

        {!limitReached && !categorySlug && query.trim() === "" && !hasSearched && (
          <p className="mt-6 text-sm text-cream/50">
            Search a product or browse by category above
          </p>
        )}

        {!limitReached && loading && (
          <p className="mt-4 text-sm text-cream/50">Searching...</p>
        )}

        {!limitReached && searchError && (
          <p className="mt-4 text-sm text-red">{searchError}</p>
        )}

        {!limitReached &&
          !loading &&
          hasSearched &&
          categorySlug &&
          query.trim() === "" && (
            <p className="mt-6 text-sm text-cream/70">
              All {CATEGORY_LABEL_BY_SLUG[categorySlug] ?? categorySlug}s in
              the Qoyl catalog ({results.length} products)
            </p>
          )}

        {!limitReached && !loading && results.length > 0 && (
          <ul className="mt-2">
            {results.map((product) => (
              <ResultCard
                key={product.code}
                product={product}
                scoreState={scoresByCode[product.code]}
                cardExpanded={expandedCardCode === product.code}
                onToggleCard={() => toggleCard(product.code)}
                ingredientsExpanded={ingredientsExpanded}
                onToggleIngredients={toggleIngredients}
              />
            ))}
          </ul>
        )}

        {showNoResults && (
          <div className="mt-6 space-y-6">
            <div className="rounded-lg border border-bronze/30 p-4">
              <p className="text-sm text-cream/80">
                We don&apos;t have &quot;{query}&quot; in our database yet.
                Request an evaluation and we&apos;ll score it for you within
                48 hours.
              </p>
              <Link
                href={`/request?product=${encodeURIComponent(query)}`}
                className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-bronze py-3 text-sm font-semibold text-dark transition-colors hover:bg-bronze2"
              >
                Request an evaluation
              </Link>
            </div>

            <div>
              <p className="text-sm text-cream/70">
                Or paste an ingredient list to check compatibility instead.
              </p>
              <form onSubmit={handleManualSubmit} className="mt-3 space-y-3">
                <textarea
                  value={manualIngredients}
                  onChange={(e) => setManualIngredients(e.target.value)}
                  placeholder="Aqua, Cetyl Alcohol, Glycerin, ..."
                  rows={5}
                  className="w-full rounded-lg border border-bronze/40 bg-transparent px-4 py-3 text-sm text-cream placeholder:text-cream/40 focus:border-bronze focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!manualIngredients.trim() || manualScoring}
                  className="w-full rounded-lg bg-bronze py-3 text-sm font-semibold text-dark transition-colors hover:bg-bronze2 disabled:opacity-50"
                >
                  {manualScoring ? "Checking..." : "Check Compatibility"}
                </button>
              </form>

              {manualScoreError && (
                <p className="mt-3 text-sm text-red">{manualScoreError}</p>
              )}

              {manualScoreResult && (
                <div className="mt-4 space-y-1.5">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 font-sans text-[11px] font-semibold ${
                      TIER_CLASSES[scoreTier(manualScoreResult.normalizedScore)]
                    }`}
                  >
                    {manualScoreResult.normalizedScore} ·{" "}
                    {TIER_LABELS[scoreTier(manualScoreResult.normalizedScore)]}
                  </span>
                  <div className="mt-2 space-y-1.5">
                    {manualScoreResult.matches.map((m, i) => (
                      <IngredientRow key={`${m.ingredient_name}-${i}`} match={m} />
                    ))}
                  </div>
                  <p className="pt-1 text-[10px] text-bronze">
                    Scores reflect cosmetic ingredient compatibility only —
                    not medical advice.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showSurvey && (
        <FeedbackSurveyModal onClose={() => setShowSurvey(false)} />
      )}
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchPageContent />
    </Suspense>
  );
}
