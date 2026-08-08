"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import FeedbackSurveyModal from "@/components/FeedbackSurveyModal";
import ShopButton from "@/components/ShopButton";
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
};

type QoylProductRow = {
  id: string;
  name: string;
  barcode: string | null;
  image_url: string | null;
  catalog_brands: { name: string } | null;
};

// catalog_products/catalog_brands -- not "products"/"brands" -- since
// this Supabase project is shared with qoyl-business, which already has
// its own brands/products tables for its B2B dashboard with a completely
// different schema. Keeping qoyl-beta's consumer catalog on separate
// tables avoids colliding with that.
const QOYL_PRODUCT_SELECT = "id, name, barcode, image_url, catalog_brands(name)";

function toQoylProduct(p: QoylProductRow): Product {
  return {
    code: p.id,
    name: p.name,
    brand: p.catalog_brands?.name ?? "Unknown brand",
    catalogProductId: p.id,
    imageUrl: p.image_url,
  };
}

// Searches Qoyl's own curated catalog_products table only -- by product
// name and by brand name via the catalog_brands join. Two separate
// queries merged client-side rather than a single .or() filter across
// the join, since PostgREST's embedded-resource filter syntax is easy to
// get subtly wrong with arbitrary user input.
async function fetchQoylProducts(query: string): Promise<Product[]> {
  const term = `%${query}%`;

  const [{ data: byName }, { data: matchingBrands }] = await Promise.all([
    supabase
      .from("catalog_products")
      .select(QOYL_PRODUCT_SELECT)
      .ilike("name", term)
      .limit(20),
    supabase.from("catalog_brands").select("id").ilike("name", term),
  ]);

  const brandIds = (matchingBrands ?? []).map((b) => b.id);
  const { data: byBrand } = brandIds.length
    ? await supabase
        .from("catalog_products")
        .select(QOYL_PRODUCT_SELECT)
        .in("brand_id", brandIds)
        .limit(20)
    : { data: [] as QoylProductRow[] };

  const merged = new Map<string, QoylProductRow>();
  for (const row of [...(byName ?? []), ...(byBrand ?? [])]) {
    merged.set(row.id, row as unknown as QoylProductRow);
  }

  return Array.from(merged.values()).map(toQoylProduct);
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
              <span
                className={`mt-1 inline-block rounded-full px-2 py-0.5 font-sans text-[11px] font-semibold ${TIER_CLASSES[tier]}`}
              >
                {scoreState.result.normalizedScore} · {TIER_LABELS[tier]}
              </span>
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

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, hairProfile } = useAuth();
  const [checkedAccess, setCheckedAccess] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    const hasLocalProfile = Boolean(localStorage.getItem("hair_profile_id"));
    if (!user && !hasLocalProfile) {
      router.replace("/auth");
      return;
    }
    setCheckedAccess(true);
  }, [user, authLoading, router]);

  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
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

  const latestQueryRef = useRef("");

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

  async function scoreResults(products: Product[], forQuery: string) {
    setScoresByCode((prev) => {
      const next = { ...prev };
      for (const p of products) next[p.code] = { status: "loading" };
      return next;
    });

    const idByCode = new Map(products.map((p) => [p.catalogProductId, p.code]));
    const outcomes = await scoreCatalogProducts(
      products.map((p) => p.catalogProductId)
    );

    if (latestQueryRef.current !== forQuery) return; // stale search, ignore

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

  useEffect(() => {
    if (query.trim() === "") {
      latestQueryRef.current = "";
      setResults([]);
      setHasSearched(false);
      setSearchError(null);
      setScoresByCode({});
      setExpandedCardCode(null);
      setIngredientsExpanded(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      const thisQuery = query;
      latestQueryRef.current = thisQuery;

      setLoading(true);
      setSearchError(null);

      try {
        const qoylProducts = await fetchQoylProducts(thisQuery);
        if (latestQueryRef.current !== thisQuery) return;

        setResults(qoylProducts);
        setHasSearched(true);
        setExpandedCardCode(null);
        setIngredientsExpanded(false);
        setScoresByCode({});

        if (qoylProducts.length > 0) {
          scoreResults(qoylProducts, thisQuery);
        }
      } catch {
        if (latestQueryRef.current === thisQuery) {
          setSearchError("Couldn't reach the product search. Try again.");
          setHasSearched(true);
        }
      } finally {
        if (latestQueryRef.current === thisQuery) setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

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
        <h1 className="font-serif text-3xl font-semibold text-cream sm:text-4xl">
          Search a Product
        </h1>
        <p className="mt-2 text-sm text-cream/70">
          Find a product to check its compatibility with your hair profile.
        </p>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by product name..."
          className="mt-6 w-full rounded-lg border border-bronze/40 bg-transparent px-4 py-3 text-sm text-cream placeholder:text-cream/40 focus:border-bronze focus:outline-none"
        />

        {loading && (
          <p className="mt-4 text-sm text-cream/50">Searching...</p>
        )}

        {searchError && (
          <p className="mt-4 text-sm text-red">{searchError}</p>
        )}

        {!loading && results.length > 0 && (
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
