"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

export default function UpgradePrompt({
  feature,
  price,
  title,
  description,
}: {
  feature: "routine_subscription" | "travel_kit";
  price: string;
  title: string;
  description: string;
}) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUnlock() {
    if (!user) {
      setError("Please sign in first.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_type: feature,
          user_id: user.id,
          email: user.email,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.url) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      window.location.href = data.url;
    } catch {
      setError("Couldn't reach the server. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-bronze/30 p-6 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-bronze/40 bg-bronze/10">
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
            d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
          />
        </svg>
      </div>

      <h3 className="mt-4 font-serif text-xl font-semibold text-cream">
        {title}
      </h3>
      <p className="mt-2 text-sm text-cream/70">{description}</p>
      <p className="mt-4 font-serif text-2xl font-semibold text-bronze2">
        {price}
      </p>

      {error && <p className="mt-3 text-sm text-red">{error}</p>}

      <button
        type="button"
        onClick={handleUnlock}
        disabled={loading}
        className="mt-5 w-full rounded-lg bg-bronze py-3 text-sm font-semibold text-dark transition-colors hover:bg-bronze2 disabled:opacity-50"
      >
        {loading ? "Redirecting..." : "Unlock"}
      </button>
    </div>
  );
}
