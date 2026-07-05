"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ScoreResultView } from "@/components/CompatibilityScore";
import { useAuth } from "@/lib/auth-context";
import { ScoreResult, scoreIngredientsText } from "@/lib/compatibility";

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
};

export default function SearchPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
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

  const [query, setQuery] = useState("");
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

  const abortRef = useRef<AbortController | null>(null);

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
        const res = await fetch(
          `https://world.openbeautyfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
            query
          )}&json=true&page_size=20`,
          { signal: controller.signal }
        );
        const data: { products?: OpenBeautyFactsProduct[] } = await res.json();
        const products: Product[] = (data.products ?? [])
          .filter(
            (p): p is OpenBeautyFactsProduct & {
              product_name: string;
              ingredients_text: string;
            } => Boolean(p.product_name && p.ingredients_text)
          )
          .map((p) => ({
            code: p.code ?? p._id ?? p.product_name,
            name: p.product_name,
            brand: p.brands ?? "Unknown brand",
            ingredientsText: p.ingredients_text,
          }));
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

  async function runScoring(ingredientsText: string) {
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
  }

  function selectProduct(product: Product) {
    setSelectedProduct(product);
    setManualIngredients("");
    runScoring(product.ingredientsText);
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
        )}

        {showManualFallback && (
          <div className="mt-6">
            <p className="text-sm text-cream/70">
              No products found for &quot;{query}&quot;. Paste an ingredient
              list to check compatibility instead.
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
        )}

        {scoring && (
          <p className="mt-6 text-sm text-cream/50">
            Checking compatibility...
          </p>
        )}

        {scoreError && <p className="mt-6 text-sm text-red">{scoreError}</p>}

        {scoreResult && <ScoreResultView result={scoreResult} />}
      </div>
    </main>
  );
}
