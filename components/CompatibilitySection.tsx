"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ScoreResultView } from "@/components/CompatibilityScore";
import { ScoreResult, scoreIngredientsText } from "@/lib/compatibility";

export default function CompatibilitySection({
  productName,
}: {
  productName: string;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      setScoreResult(null);

      try {
        const res = await fetch(
          `https://world.openbeautyfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
            productName
          )}&json=true&page_size=1`
        );
        const data = await res.json();
        const product = (data.products ?? [])[0];

        if (cancelled) return;

        if (!product?.ingredients_text) {
          setLoading(false);
          setError(`Couldn't find ingredient data for "${productName}".`);
          return;
        }

        const outcome = await scoreIngredientsText(product.ingredients_text);

        if (cancelled) return;
        setLoading(false);

        if (outcome.error || !outcome.result) {
          setError(outcome.error ?? "Something went wrong.");
          return;
        }

        setScoreResult(outcome.result);
      } catch {
        if (!cancelled) {
          setLoading(false);
          setError("Couldn't reach the product search. Try again later.");
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [productName]);

  return (
    <section className="mt-10 border-t border-bronze/20 pt-8">
      <h2 className="font-serif text-2xl font-semibold text-cream">
        How this scores
      </h2>
      <p className="mt-1 text-sm text-cream/70">
        Live compatibility for {productName}, based on your hair profile.
      </p>

      {loading && (
        <p className="mt-4 text-sm text-cream/50">Checking compatibility...</p>
      )}

      {error && (
        <p className="mt-4 text-sm text-red">
          {error}{" "}
          {error.startsWith("No hair profile") && (
            <Link href="/profile" className="underline">
              Go to My Profile
            </Link>
          )}
        </p>
      )}

      {scoreResult && <ScoreResultView result={scoreResult} />}
    </section>
  );
}
