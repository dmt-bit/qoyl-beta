"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const DISMISS_KEY = "qoyl_anon_profile_banner_dismissed_at";
const RESHOW_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

function isDismissed(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const dismissedAt = Number(raw);
    if (!Number.isFinite(dismissedAt)) return false;
    return Date.now() - dismissedAt < RESHOW_AFTER_MS;
  } catch {
    return false;
  }
}

// Replaces the old paywall gate with a value-based nudge - shown to
// anonymous searchers only after their 3rd search (let them experience the
// product first), dismissible, and quiet about it for 7 days once
// dismissed. No urgency, no pressure, just "here's what a profile gets you."
export default function AnonymousProfileBanner({ searchCount }: { searchCount: number }) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(isDismissed());
  }, []);

  if (searchCount < 3 || dismissed) return null;

  function handleDismiss() {
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // Storage unavailable - just hide it for this session.
    }
    setDismissed(true);
  }

  return (
    <div className="mb-4 flex items-center justify-between gap-3 border border-dark bg-white px-4 py-2.5">
      <p className="font-sans text-xs text-dark">
        Get scores personalized to your hair type —{" "}
        <Link href="/profile" className="font-medium underline underline-offset-2">
          create free profile →
        </Link>
      </p>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss"
        className="shrink-0 font-sans text-xs text-dark/50 hover:text-dark"
      >
        ✕
      </button>
    </div>
  );
}
