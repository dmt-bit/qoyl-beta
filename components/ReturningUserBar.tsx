"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

// Slim bar above the search strip, shown only when signed in with a real
// hair profile (curl_type set) - hidden entirely otherwise, so the
// collage extends all the way down to the search strip. Reads auth state
// via useAuth() (this app's established client-side pattern - see
// components/HomeHero.tsx/components/Nav.tsx) rather than a `session`
// prop from a server parent, since nothing in this app does server-side
// session reading.
//
// bottom-[114px] (60px bottom nav + 54px search strip - this app's real
// measured heights, not the request's own 56/110px assumptions).
// sm:bottom-[54px] on desktop, where there's no bottom nav to stack
// above the search strip.
export default function ReturningUserBar() {
  const { user, hairProfile } = useAuth();

  if (!user || !hairProfile?.curl_type) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-[114px] z-[79] flex items-center justify-between border-t border-[#e8e8e8] bg-white/95 px-4 py-2 sm:bottom-[54px]"
    >
      <div>
        <p className="font-mono text-[9px] tracking-wide text-muted">welcome back</p>
        <p className="font-sans text-[12px] font-medium text-dark">
          {hairProfile.curl_type}
          {hairProfile.porosity ? ` · ${hairProfile.porosity} porosity` : ""}
        </p>
      </div>
      <div className="flex items-center gap-1.5 font-mono text-[9px] text-muted">
        <Link href="/routine" className="hover:text-dark">
          routine →
        </Link>
        <span aria-hidden>|</span>
        <Link href="/style-match" className="hover:text-dark">
          style match →
        </Link>
        <span aria-hidden>|</span>
        <Link href="/profile" className="hover:text-dark">
          profile →
        </Link>
      </div>
    </div>
  );
}
