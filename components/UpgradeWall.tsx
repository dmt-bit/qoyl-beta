"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCountdown, msUntilReset } from "@/lib/searchLimit";

function LockIcon() {
  return (
    <svg
      className="mx-auto h-8 w-8 text-bronze"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 118 0v4" />
    </svg>
  );
}

export default function UpgradeWall({
  resetAt,
  userId,
  userEmail,
}: {
  resetAt: string | null;
  userId: string | null;
  userEmail: string | null | undefined;
}) {
  // Re-renders every minute so the countdown text stays current without
  // a per-second timer.
  const [, forceTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = msUntilReset(resetAt);
  const countdown = remaining !== null ? formatCountdown(remaining) : "soon";

  async function handleUnlock() {
    if (!userId) return;
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
    <div className="mt-6 rounded-xl border border-bronze/30 bg-dark px-6 py-10 text-center">
      <LockIcon />
      <p className="mt-4 font-serif text-2xl font-semibold text-cream">
        You&apos;ve used your 5 free searches today.
      </p>
      <p className="mt-2 text-[13px] text-cream/60">
        Your searches reset in {countdown}. Upgrade to search unlimited
        products anytime.
      </p>

      {error && <p className="mt-3 text-sm text-red">{error}</p>}

      <div className="mt-6 space-y-3">
        {userId ? (
          <button
            type="button"
            onClick={handleUnlock}
            disabled={loading}
            className="w-full rounded-lg bg-bronze py-3 text-sm font-semibold text-dark transition-colors hover:bg-bronze2 disabled:opacity-50"
          >
            {loading ? "Redirecting..." : "Unlock unlimited searches →"}
          </button>
        ) : (
          <Link
            href="/auth"
            className="block w-full rounded-lg bg-bronze py-3 text-sm font-semibold text-dark transition-colors hover:bg-bronze2"
          >
            Unlock unlimited searches →
          </Link>
        )}
        <p className="text-[11px] text-cream/50">
          Includes unlimited product searches, Style Match, and your
          personalized monthly routine
        </p>

        {!userId && (
          <Link
            href="/auth"
            className="block w-full rounded-lg border border-bronze/40 py-3 text-sm font-semibold text-cream transition-colors hover:border-bronze"
          >
            Sign in to continue
          </Link>
        )}
      </div>

      <p className="mt-4 text-[11px] text-cream/40">
        Or come back tomorrow — your 5 free searches reset every 24 hours.
      </p>
    </div>
  );
}
