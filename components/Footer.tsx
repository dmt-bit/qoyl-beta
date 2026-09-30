"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import NewsletterSignup from "@/components/NewsletterSignup";

export default function Footer() {
  // The public Style Match summary page (app/style-match/summary/[id])
  // is a standalone shareable document, not a page within the app shell
  // - it has its own footer, and showing this one too would be a
  // confusing double-footer for a stylist who has no Qoyl account.
  const pathname = usePathname();
  if (pathname.startsWith("/style-match/summary/")) return null;

  return (
    <footer className="print-hide border-t border-bronze/20 bg-white px-4 py-10 font-sans sm:px-6">
      <div className="mx-auto max-w-md text-center">
        <h2 className="font-serif text-xl font-semibold text-dark">the qoyl feed</h2>
        <p className="mt-1.5 text-sm text-dark/60">
          monthly hair intelligence — ingredient deep dives, product alerts, and event
          announcements.
        </p>
        <div className="mt-4">
          <NewsletterSignup source="footer" />
        </div>
      </div>

      <div className="mx-auto mt-10 flex max-w-3xl flex-col items-center gap-2 text-xs text-dark/50 sm:flex-row sm:justify-between">
        <p>© {new Date().getFullYear()} Qoyl</p>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <Link href="/how-we-score" className="text-dark/50 underline underline-offset-2 hover:text-dark/70">
            How we score
          </Link>
          <Link href="/events" className="text-dark/50 underline underline-offset-2 hover:text-dark/70">
            Events
          </Link>
          <Link href="/for-brands" className="text-dark/50 underline underline-offset-2 hover:text-dark/70">
            For Brands
          </Link>
          <Link href="/for-stylists" className="text-dark/50 underline underline-offset-2 hover:text-dark/70">
            For Stylists
          </Link>
          <Link href="/privacy" className="text-dark/50 underline underline-offset-2 hover:text-dark/70">
            Privacy Policy
          </Link>
          <a
            href="https://instagram.com/clubqoyl"
            target="_blank"
            rel="noopener noreferrer"
            className="text-dark/50 underline underline-offset-2 hover:text-dark/70"
          >
            @clubqoyl
          </a>
        </div>
      </div>
      <p className="mt-3 text-center text-[10px] text-dark/40">
        Qoyl provides cosmetic hair care information only. Not a substitute
        for professional medical advice.
      </p>
    </footer>
  );
}
