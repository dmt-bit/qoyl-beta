"use client";

import { useState } from "react";

const FEATURES = [
  "Unlimited product searches",
  "Personalized monthly wash-day routine",
  "Curated product picks for your hair profile",
];

export default function UpgradePrompt({
  userId,
  userEmail,
  headline = "Unlock unlimited searches + your full routine",
  ctaLabel = "Unlock unlimited searches →",
}: {
  userId: string;
  userEmail: string | null | undefined;
  headline?: string;
  ctaLabel?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_type: "routine_subscription",
          user_id: userId,
          email: userEmail,
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
    <div>
      <p className="font-serif text-lg text-cream">{headline}</p>
      <ul className="mt-3 space-y-1.5">
        {FEATURES.map((feature) => (
          <li
            key={feature}
            className="flex items-start gap-2 text-sm text-cream/80"
          >
            <span className="mt-0.5 text-bronze2">✓</span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {error && <p className="mt-3 text-sm text-red">{error}</p>}

      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="mt-4 w-full rounded-lg bg-bronze py-3 text-sm font-semibold text-dark transition-colors hover:bg-bronze2 disabled:opacity-50"
      >
        {loading ? "Redirecting..." : ctaLabel}
      </button>
      <p className="mt-2 text-center text-[11px] text-cream/50">
        $7.99/month · cancel anytime
      </p>
    </div>
  );
}
