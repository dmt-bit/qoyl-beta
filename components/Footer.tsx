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
    <footer className="print-hide border-t border-dark bg-white px-5 py-10 font-sans">
      <div className="mx-auto max-w-md">
        <h2
          className="lowercase text-dark"
          style={{ fontWeight: 700, fontSize: "20px", letterSpacing: "-0.5px", marginBottom: "6px" }}
        >
          the qoyl feed
        </h2>
        <p className="font-light text-[#666]" style={{ fontSize: "13px", lineHeight: 1.65, marginBottom: "20px" }}>
          monthly hair intelligence — ingredient deep dives, product alerts, and event
          announcements.
        </p>
        <NewsletterSignup source="footer" />

        <div className="mt-7 flex flex-wrap gap-4 border-t border-[#e8e8e8] pt-5 font-mono text-[10px] text-muted">
          <Link href="/how-we-score" className="hover:text-dark">
            how we score
          </Link>
          <Link href="/events" className="hover:text-dark">
            events
          </Link>
          <Link href="/for-brands" className="hover:text-dark">
            for brands
          </Link>
          <Link href="/for-stylists" className="hover:text-dark">
            for stylists
          </Link>
          <Link href="/privacy" className="hover:text-dark">
            privacy
          </Link>
          <a href="https://www.instagram.com/clubqoyl" target="_blank" rel="noopener noreferrer" className="hover:text-dark">
            @clubqoyl
          </a>
        </div>

        <p className="mt-6 text-[10px] text-dark/40">
          © {new Date().getFullYear()} Qoyl. Cosmetic hair care information only - not a substitute
          for professional medical advice.
        </p>
      </div>
    </footer>
  );
}
