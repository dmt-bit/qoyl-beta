"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ScoreResultView } from "@/components/CompatibilityScore";
import FeedbackSurveyModal from "@/components/FeedbackSurveyModal";
import ShopButton from "@/components/ShopButton";
import { useAuth } from "@/lib/auth-context";
import { ScoreResult, scoreIngredientsText } from "@/lib/compatibility";
import { supabase } from "@/lib/supabase";

type Product = {
  code: string;
  name: string;
  brand: string;
  ingredientsText: string;
};

type OpenBeautyFactsProduct = {
  code?: string;
  _id?: string;
  product_name?: string;
  brands?: string;
  ingredients_text?: string;
  categories_tags?: string[];
};

// Unambiguously non-hair-care categories, safe to exclude outright even
// though the rest of this filtering is deliberately permissive.
const EXCLUDED_CATEGORIES = [
  "en:deodorants",
  "en:face-care",
  "en:makeup",
  "en:nail-care",
  "en:perfumes",
];

// Open Beauty Facts' category tagging is too inconsistent to filter the
// search itself on -- real hair products (Camille Rose's whole catalog,
// among others) often carry no hair-related category tag at all. Rather
// than requiring a category match, a result is only excluded if it has
// BOTH no ingredient list AND no hair-related word in its name --
// permissive by design, so real products don't get hidden over a
// tagging gap in OBF's own data.
const HAIR_KEYWORDS = [
  "hair", "curl", "shampoo", "conditioner", "leave-in", "styler", "scalp",
  "moisturize", "moisture", "oil", "butter", "wash", "rinse", "gel",
  "mousse", "serum", "treatment", "natural", "frizz", "wave", "coil",
  "braid", "loc", "weave", "growth", "strand", "porosity", "texture",
];

function isLikelyIrrelevant(product: OpenBeautyFactsProduct): boolean {
  const hasIngredients = Boolean(product.ingredients_text?.trim());
  if (hasIngredients) return false;

  const name = (product.product_name ?? "").toLowerCase();
  const hasHairKeyword = HAIR_KEYWORDS.some((word) => name.includes(word));
  return !hasHairKeyword;
}

function isExcludedCategory(product: OpenBeautyFactsProduct): boolean {
  return (product.categories_tags ?? []).some((tag) =>
    EXCLUDED_CATEGORIES.includes(tag)
  );
}

async function fetchObfProducts(
  query: string,
  signal: AbortSignal
): Promise<OpenBeautyFactsProduct[]> {
  const res = await fetch(
    `https://world.openbeautyfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
      query
    )}&json=true&page_size=20`,
    { signal }
  );
  const data: { products?: OpenBeautyFactsProduct[] } = await res.json();
  return data.products ?? [];
}

function toProduct(p: OpenBeautyFactsProduct): Product | null {
  if (!p.product_name || !p.ingredients_text) return null;
  return {
    code: p.code ?? p._id ?? p.product_name,
    name: p.product_name,
    brand: p.brands ?? "Unknown brand",
    ingredientsText: p.ingredients_text,
  };
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

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(
    null
  );
  const [manualIngredients, setManualIngredients] = useState("");

  const [scoring, setScoring] = useState(false);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [showSurvey, setShowSurvey] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

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

  useEffect(() => {
    if (query.trim() === "") {
      setResults([]);
      setHasSearched(false);
      setSearchError(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setSearchError(null);

      try {
        const obfProducts = await fetchObfProducts(query, controller.signal);

        const relevant = obfProducts.filter(
          (p) => !isLikelyIrrelevant(p) && !isExcludedCategory(p)
        );
        const relevantProducts = relevant
          .map(toProduct)
          .filter((p): p is Product => p !== null);

        // Fewer than 3 usable results after filtering -- the filter is
        // doing more harm than good here, so show everything rather than
        // leave the user with an empty or near-empty list.
        const products =
          relevantProducts.length >= 3
            ? relevantProducts
            : obfProducts.map(toProduct).filter((p): p is Product => p !== null);

        setResults(products);
        setHasSearched(true);
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          setSearchError("Couldn't reach the product search. Try again.");
          setHasSearched(true);
        }
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

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

  async function runScoring(ingredientsText: string, product?: Product) {
    setScoring(true);
    setScoreError(null);
    setScoreResult(null);

    const outcome = await scoreIngredientsText(ingredientsText);

    setScoring(false);

    if (outcome.error || !outcome.result) {
      setScoreError(outcome.error ?? "Something went wrong.");
      return;
    }

    setScoreResult(outcome.result);
    recordSearchCompletion();

    if (product) {
      logProductSearch(product, outcome.result.normalizedScore);
    }
  }

  function selectProduct(product: Product) {
    setSelectedProduct(product);
    setManualIngredients("");
    runScoring(product.ingredientsText, product);
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSelectedProduct(null);
    runScoring(manualIngredients);
  }

  const showManualFallback =
    !loading && hasSearched && results.length === 0 && !searchError;

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
          <>
            <ul className="mt-6 space-y-2">
              {results.map((product) => (
                <li key={product.code}>
                  <button
                    type="button"
                    onClick={() => selectProduct(product)}
                    className={`w-full rounded-lg border px-4 py-3 text-left transition-colors ${
                      selectedProduct?.code === product.code
                        ? "border-bronze bg-bronze/10"
                        : "border-bronze/30 hover:border-bronze"
                    }`}
                  >
                    <p className="font-serif text-base text-cream">
                      {product.name}
                    </p>
                    <p className="text-xs text-bronze2">{product.brand}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-cream/50">
                      {product.ingredientsText}
                    </p>
                  </button>
                </li>
              ))}
            </ul>

            <Link
              href={`/request?product=${encodeURIComponent(query)}`}
              className="mt-4 inline-block text-xs text-cream/50 underline underline-offset-2 hover:text-cream/70"
            >
              Don&apos;t see what you&apos;re looking for? Request a product
              evaluation →
            </Link>
          </>
        )}

        {showManualFallback && (
          <div className="mt-6 space-y-6">
            <div className="rounded-lg border border-bronze/30 p-4">
              <p className="text-sm text-cream/80">
                Don&apos;t see your product? Submit it and we&apos;ll
                evaluate it personally.
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
                  disabled={!manualIngredients.trim() || scoring}
                  className="w-full rounded-lg bg-bronze py-3 text-sm font-semibold text-dark transition-colors hover:bg-bronze2 disabled:opacity-50"
                >
                  Check Compatibility
                </button>
              </form>
            </div>
          </div>
        )}

        {scoring && (
          <p className="mt-6 text-sm text-cream/50">
            Checking compatibility...
          </p>
        )}

        {scoreError && <p className="mt-6 text-sm text-red">{scoreError}</p>}

        {scoreResult && <ScoreResultView result={scoreResult} />}

        {scoreResult && selectedProduct && (
          <div className="mt-4 text-center">
            <ShopButton
              productName={selectedProduct.name}
              brandName={selectedProduct.brand}
              className="inline-block rounded-lg bg-bronze px-6 py-3 text-sm font-semibold text-dark transition-colors hover:bg-bronze2"
            />
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
