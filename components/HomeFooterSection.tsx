"use client";

import { useState } from "react";
import Link from "next/link";

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
      <NewsletterSection />
      <FooterLinksSection />
    </>
  );
}
