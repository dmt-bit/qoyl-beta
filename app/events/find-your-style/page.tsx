import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Find Your Style – Qoyl Events",
  description:
    "A live hair consultation experience in Chicago. Walk away with a personalized look kit built for your hair.",
};

const STRIPE_LINK = "https://buy.stripe.com/28EbJ24mp18H92E8Yk3ks0f";

const WHAT_YOU_GET = [
  {
    heading: "a one-on-one hair consultation",
    body: "Sit down with a hair specialist who will assess your hair type, texture, and goals.",
  },
  {
    heading: "your personalized look kit",
    body: "Leave with a curated list of products, tools, and tutorials selected specifically for your hair — ready to shop.",
  },
  {
    heading: "product recommendations you can actually trust",
    body: "No guessing. Every recommendation is matched to your hair profile.",
  },
  {
    heading: "access to qoyl",
    body: "Your look kit lives on qoyl.live so you can reference it, share it, and shop it anytime.",
  },
];

export default function FindYourStylePage() {
  return (
    <main className="min-h-screen bg-white font-sans text-dark">
      {/* Hero */}
      <div className="border-b border-[#e8e8e8] px-5 py-14 sm:py-20">
        <div className="mx-auto max-w-xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#aaa]">
            nov 15 · chicago, il · in person
          </p>
          <h1
            className="mt-3 font-sans font-bold lowercase text-dark"
            style={{ fontSize: "clamp(36px, 8vw, 60px)", letterSpacing: "-1.5px", lineHeight: 0.95 }}
          >
            find your style.
          </h1>
          <p className="mt-5 font-sans text-[15px] leading-relaxed text-[#555]">
            A live hair consultation experience hosted by qoyl. Walk away knowing exactly what your hair needs
            and how to get the look you want.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href={STRIPE_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-dark px-8 py-4 text-center font-sans text-[13px] font-medium lowercase tracking-wide text-white transition-colors hover:bg-[#444]"
            >
              reserve your spot — $75
            </a>
            <p className="font-mono text-[10px] lowercase text-[#aaa]">limited spots available</p>
          </div>
        </div>
      </div>

      {/* What you get */}
      <div className="border-b border-[#e8e8e8] px-5 py-12">
        <div className="mx-auto max-w-xl">
          <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#aaa]">what you get</p>
          <div className="mt-6 space-y-6">
            {WHAT_YOU_GET.map((item, i) => (
              <div key={i} className="flex gap-4">
                <span className="mt-0.5 font-mono text-[10px] text-[#ccc]">0{i + 1}</span>
                <div>
                  <p className="font-sans text-[14px] font-semibold lowercase text-dark">{item.heading}</p>
                  <p className="mt-1 font-sans text-[13px] leading-relaxed text-[#666]">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Event details */}
      <div className="border-b border-[#e8e8e8] px-5 py-12">
        <div className="mx-auto max-w-xl">
          <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#aaa]">event details</p>
          <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-3">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-wide text-[#aaa]">date</p>
              <p className="mt-1 font-sans text-[14px] font-medium text-dark">november 15, 2026</p>
            </div>
            <div>
              <p className="font-mono text-[9px] uppercase tracking-wide text-[#aaa]">location</p>
              <p className="mt-1 font-sans text-[14px] font-medium text-dark">chicago, il</p>
            </div>
            <div>
              <p className="font-mono text-[9px] uppercase tracking-wide text-[#aaa]">ticket</p>
              <p className="mt-1 font-sans text-[14px] font-medium text-dark">$75</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="px-5 py-14">
        <div className="mx-auto max-w-xl text-center">
          <p className="font-sans text-[15px] text-[#555]">spots are limited. grab yours before they&apos;re gone.</p>
          <a
            href={STRIPE_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-block bg-dark px-10 py-4 font-sans text-[13px] font-medium lowercase tracking-wide text-white transition-colors hover:bg-[#444]"
          >
            reserve your spot — $75
          </a>
          <p className="mt-6 font-mono text-[10px] lowercase text-[#aaa]">
            questions?{" "}
            <Link href="/search" className="underline underline-offset-2 hover:text-dark">
              ask qoyl
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
