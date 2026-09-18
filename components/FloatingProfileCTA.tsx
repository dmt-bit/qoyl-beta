"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

// Home has no hero/CTA anymore (feed-only), so signed-out visitors (and
// signed-in users who haven't built a hair profile yet) need some other
// path into /profile. Shrinks to a bare "+" circle once the user has
// scrolled past the top of the feed, so it doesn't sit on top of cards
// indefinitely - full pill again once they scroll back up. Hidden
// entirely once a real profile exists.
export default function FloatingProfileCTA() {
  const { user, loading, hairProfile, hairProfileLoading } = useAuth();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 200);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const resolving = loading || (Boolean(user) && hairProfileLoading);
  if (resolving) return null;
  // Signed in with a real profile - no CTA needed at all.
  if (user && hairProfile) return null;

  // Signed-in-without-a-profile never dismisses/shrinks, per spec -
  // only the signed-out visitor's button shrinks on scroll.
  const canShrink = !user;
  const showShrunk = canShrink && scrolled;

  return (
    <button
      type="button"
      onClick={() => router.push("/profile")}
      aria-label="Build my free profile"
      // Mobile's persistent bottom nav (components/Nav.tsx) is fixed,
      // h-[60px] + safe-area, at z-[100] - bottom-6 alone would sit
      // underneath it (and behind its higher z-index) on phones, making
      // this button unreachable. sm:bottom-6 restores the original offset
      // once BottomNav is sm:hidden.
      className="print-hide fixed left-1/2 z-[90] -translate-x-1/2 rounded-full bg-bronze font-sans font-medium text-cream shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200 min-[360px]:left-[calc(40px+50%)] sm:left-1/2 bottom-[calc(76px+env(safe-area-inset-bottom))] sm:bottom-6"
      style={
        showShrunk
          ? { width: 44, height: 44, padding: 0, fontSize: 0 }
          : { padding: "12px 24px", fontSize: 13 }
      }
    >
      {showShrunk ? (
        <span className="flex h-full w-full items-center justify-center text-xl leading-none text-dark">+</span>
      ) : (
        "Build my free profile →"
      )}
    </button>
  );
}
