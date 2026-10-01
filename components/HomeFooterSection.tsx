"use client";

import { useState } from "react";
import Link from "next/link";
import Script from "next/script";

// Replaces the old "the qoyl feed" section (heading + copy + newsletter
// + footer links, previously living in the shared Footer - see
// components/Footer.tsx, reverted to its plain pre-newsletter state).
// This section is home-page-only now: an Instagram embed is too heavy/
// out of place to show on every single page (admin, privacy, etc.), and
// the request's own instructions point at app/page.tsx specifically.

const BEHOLD_FEED_ID = process.env.NEXT_PUBLIC_BEHOLD_FEED_ID;

// <behold-widget> is a third-party custom element (defined by the script
// below once it loads) with no React/TS typings of its own - this
// augments JSX.IntrinsicElements just for it, a more durable fix than an
// inline type-suppression comment would be.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "behold-widget": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & { "feed-id": string },
        HTMLElement
      >;
    }
  }
}

function InstagramEmbedSection() {
  if (!BEHOLD_FEED_ID) {
    return (
      <div className="border-t border-dark px-5 py-10 text-center font-mono text-[10px] lowercase tracking-[0.1em] text-[#aaa]">
        instagram feed loading — connect @clubqoyl at behold.so
      </div>
    );
  }

  return (
    <div className="border-t border-dark bg-white">
      <Script src="https://w.behold.so/widget.js" type="module" strategy="lazyOnload" />
      {/* Behold's own CSS parts API is used where supported (see the
          behold-widget rules in app/globals.css); this wrapper border is
          the documented fallback for when ::part() selectors don't take
          effect, so the embed still reads as "on brand" either way. */}
      <div className="overflow-hidden border border-dark">
        <behold-widget feed-id={BEHOLD_FEED_ID} />
      </div>
    </div>
  );
}

type Status = "idle" | "submitting" | "done" | "error";

function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="border-t border-dark px-5 py-8">
      <div className="mx-auto max-w-[400px]">
        <h2
          className="font-sans font-bold lowercase text-dark"
          style={{ fontSize: "20px", letterSpacing: "-0.5px", marginBottom: "20px" }}
        >
          join our newsletter
        </h2>

        {status === "done" ? (
          <p className="font-sans text-[13px] text-green">subscribed ✓</p>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your email address"
                className="flex-1 appearance-none rounded-none border border-dark bg-white px-[14px] py-[10px] font-sans text-[16px] text-dark placeholder:text-[#bbb] focus:outline-none"
              />
              <button
                type="submit"
                disabled={status === "submitting"}
                className="shrink-0 whitespace-nowrap bg-dark px-[18px] py-[10px] font-sans text-[12px] font-medium tracking-[0.05em] lowercase text-white disabled:opacity-50"
              >
                subscribe →
              </button>
            </form>
            {status === "error" && (
              <p className="mt-2 font-sans text-[13px] text-red">something went wrong — try again</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const FOOTER_LINKS = [
  { href: "/how-we-score", label: "how we score" },
  { href: "/events", label: "events" },
  { href: "/for-brands", label: "for brands" },
  { href: "/for-stylists", label: "for stylists" },
  { href: "/privacy", label: "privacy" },
  // Public but not prominently surfaced (see app/ai/page.tsx) - same
  // weight as every other link here, nothing calling extra attention.
  { href: "/ai", label: "built with ai" },
];

function FooterLinksSection() {
  return (
    <div className="flex flex-wrap justify-center gap-4 border-t border-[#e8e8e8] px-5 pb-8 pt-5">
      {FOOTER_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="font-mono text-[10px] tracking-[0.08em] lowercase text-[#aaa] hover:text-dark"
        >
          {link.label}
        </Link>
      ))}
      <a
        href="https://www.instagram.com/clubqoyl"
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-[10px] tracking-[0.08em] lowercase text-[#aaa] hover:text-dark"
      >
        @clubqoyl
      </a>
    </div>
  );
}

export default function HomeFooterSection() {
  return (
    <>
      <InstagramEmbedSection />
      <NewsletterSection />
      <FooterLinksSection />
    </>
  );
}
