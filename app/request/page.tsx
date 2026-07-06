"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

function RequestForm() {
  const { user } = useAuth();
  const searchParams = useSearchParams();

  const [productName, setProductName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [wherePurchased, setWherePurchased] = useState("");
  const [ingredientList, setIngredientList] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const prefill = searchParams.get("product");
    if (prefill) setProductName(prefill);
  }, [searchParams]);

  useEffect(() => {
    if (user?.email) setEmail((prev) => prev || user.email || "");
  }, [user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/product-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName,
          brandName,
          wherePurchased,
          ingredientList,
          email,
          userId: user?.id ?? null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setSuccess(true);
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <main className="min-h-screen bg-dark px-4 py-10 font-sans text-cream sm:px-6">
        <div className="mx-auto max-w-md">
          <h1 className="font-serif text-3xl font-semibold text-cream sm:text-4xl">
            Request received
          </h1>
          <p className="mt-4 text-sm text-cream/70">
            Got it — we&apos;ll evaluate{" "}
            <span className="text-cream">{productName}</span> and email you
            the results within 48 hours.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-dark px-4 py-10 font-sans text-cream sm:px-6">
      <div className="mx-auto max-w-md">
        <h1 className="font-serif text-3xl font-semibold text-cream sm:text-4xl">
          Request a Product Evaluation
        </h1>
        <p className="mt-2 text-sm text-cream/70">
          Don&apos;t see your product in our search? Send us the details and
          we&apos;ll evaluate it personally.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label
              htmlFor="product-name"
              className="font-serif text-lg text-bronze2"
            >
              Product name
            </label>
            <input
              id="product-name"
              type="text"
              required
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g. Curl Love Moisture Milk"
              className="mt-3 w-full rounded-lg border border-bronze/40 bg-transparent px-4 py-3 text-sm text-cream placeholder:text-cream/40 focus:border-bronze focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="brand-name"
              className="font-serif text-lg text-bronze2"
            >
              Brand name
            </label>
            <input
              id="brand-name"
              type="text"
              required
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="e.g. Camille Rose"
              className="mt-3 w-full rounded-lg border border-bronze/40 bg-transparent px-4 py-3 text-sm text-cream placeholder:text-cream/40 focus:border-bronze focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="where-purchased"
              className="font-serif text-lg text-bronze2"
            >
              Where did you buy it?
            </label>
            <input
              id="where-purchased"
              type="text"
              value={wherePurchased}
              onChange={(e) => setWherePurchased(e.target.value)}
              placeholder="e.g. Target, Amazon, Sally Beauty"
              className="mt-3 w-full rounded-lg border border-bronze/40 bg-transparent px-4 py-3 text-sm text-cream placeholder:text-cream/40 focus:border-bronze focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="ingredient-list"
              className="font-serif text-lg text-bronze2"
            >
              Paste the ingredient list if you have it — this helps us
              evaluate faster
            </label>
            <textarea
              id="ingredient-list"
              value={ingredientList}
              onChange={(e) => setIngredientList(e.target.value)}
              placeholder="Aqua, Cetyl Alcohol, Glycerin, ..."
              rows={5}
              className="mt-3 w-full rounded-lg border border-bronze/40 bg-transparent px-4 py-3 text-sm text-cream placeholder:text-cream/40 focus:border-bronze focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="email" className="font-serif text-lg text-bronze2">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-3 w-full rounded-lg border border-bronze/40 bg-transparent px-4 py-3 text-sm text-cream placeholder:text-cream/40 focus:border-bronze focus:outline-none"
            />
          </div>

          <p className="text-sm text-cream/50">
            We&apos;ll email you a personalized evaluation within 48 hours.
            Free.
          </p>

          {error && <p className="text-sm text-red">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-bronze py-3 text-sm font-semibold text-dark transition-colors hover:bg-bronze2 disabled:opacity-50"
          >
            {submitting ? "Sending..." : "Request an evaluation"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function RequestPage() {
  return (
    <Suspense fallback={null}>
      <RequestForm />
    </Suspense>
  );
}
