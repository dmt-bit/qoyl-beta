"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Footer() {
  // The public Style Match summary page (app/style-match/summary/[id])
  // is a standalone shareable document, not a page within the app shell
  // - it has its own footer, and showing this one too would be a
  // confusing double-footer for a stylist who has no Qoyl account.
  const pathname = usePathname();
  if (pathname.startsWith("/style-match/summary/")) return null;

  return (
    <footer className="print-hide border-t border-bronze/20 bg-dark px-4 py-6 font-sans sm:px-6">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-2 text-xs text-cream/50 sm:flex-row sm:justify-between">
        <p>© {new Date().getFullYear()} Qoyl</p>
        <div className="flex items-center gap-4">
          <Link
            href="/how-we-score"
            className="text-cream/50 underline underline-offset-2 hover:text-cream/70"
          >
            How we score →
          </Link>
          <Link
            href="/privacy"
            className="text-cream/50 underline underline-offset-2 hover:text-cream/70"
          >
            Privacy Policy
          </Link>
        </div>
      </div>
      <p className="mt-2 text-center text-[10px] text-cream/40">
        Qoyl provides cosmetic hair care information only. Not a substitute
        for professional medical advice.
      </p>
    </footer>
  );
}
