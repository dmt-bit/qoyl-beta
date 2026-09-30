"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Plain sitewide footer - the newsletter/Instagram/link-list treatment
// that used to live here moved to components/HomeFooterSection.tsx
// (home-page-only now: an Instagram embed and a newsletter form aren't
// appropriate on every single page, e.g. admin or privacy). This footer
// keeps the essentials reachable from anywhere - the home page's richer
// footer section covers Events/For Brands/For Stylists/@clubqoyl.
export default function Footer() {
  // The public Style Match summary page (app/style-match/summary/[id])
  // is a standalone shareable document, not a page within the app shell
  // - it has its own footer, and showing this one too would be a
  // confusing double-footer for a stylist who has no Qoyl account.
  const pathname = usePathname();
  if (pathname.startsWith("/style-match/summary/")) return null;

  return (
    <footer className="print-hide border-t border-bronze/20 bg-white px-4 py-6 font-sans sm:px-6">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-2 text-xs text-dark/50 sm:flex-row sm:justify-between">
        <p>© {new Date().getFullYear()} Qoyl</p>
        <div className="flex items-center gap-4">
          <Link
            href="/how-we-score"
            className="text-dark/50 underline underline-offset-2 hover:text-dark/70"
          >
            How we score →
          </Link>
          <Link
            href="/privacy"
            className="text-dark/50 underline underline-offset-2 hover:text-dark/70"
          >
            Privacy Policy
          </Link>
        </div>
      </div>
      <p className="mt-2 text-center text-[10px] text-dark/40">
        Qoyl provides cosmetic hair care information only. Not a substitute
        for professional medical advice.
      </p>
    </footer>
  );
}
