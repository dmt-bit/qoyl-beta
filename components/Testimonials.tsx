"use client";

import { useRef, useState } from "react";
import Link from "next/link";

function StarIcon() {
  return (
    <svg className="h-5 w-5 text-bronze" fill="currentColor" viewBox="0 0 20 20">
      <path d="M10 1.5l2.59 5.25 5.79.84-4.19 4.08.99 5.77L10 14.77l-5.18 2.67.99-5.77-4.19-4.08 5.79-.84L10 1.5z" />
    </svg>
  );
}

const TESTIMONIALS = [
  {
    stars: 5,
    review:
      "I've been natural for 6 years and never understood why products would work for a few weeks and then stop. Qoyl told me it was the glycerin in my leave-in — I live in Chicago and it was pulling moisture out during winter. Game changer.",
    name: "Amara T.",
    hairType: "4b, high porosity · Chicago",
  },
  {
    stars: 5,
    review:
      "As a 2c wavy, most natural hair content isn't for me. Qoyl actually evaluated products for MY hair type and told me which silicones were fine vs which ones would weigh my waves down. Finally.",
    name: "Jordan K.",
    hairType: "2c wavy, low porosity · Seattle",
  },
  {
    stars: 5,
    review:
      "I searched my holy grail conditioner and got a 91/100. Then I searched the one that's been making my hair feel like straw — 34/100. I literally screamed. This is exactly what we needed.",
    name: "Nadia R.",
    hairType: "4a, medium porosity · Atlanta",
  },
  {
    stars: 5,
    review:
      "My daughter has 3c curls and I've been guessing at products for years. Qoyl built her a profile and now I know exactly what to look for on ingredient labels. Worth every second.",
    name: "Keisha M.",
    hairType: "3c curly (child) · Houston",
  },
];

function TestimonialCard({ t }: { t: (typeof TESTIMONIALS)[number] }) {
  return (
    <div className="rounded-xl bg-[#2C2420] p-6">
      <div className="flex gap-1">
        {Array.from({ length: t.stars }).map((_, i) => (
          <StarIcon key={i} />
        ))}
      </div>
      <p className="mt-4 font-serif text-lg italic text-cream">
        &quot;{t.review}&quot;
      </p>
      <p
        className="mt-4 text-sm font-medium text-muted"
        style={{ fontVariant: "small-caps" }}
      >
        {t.name}
      </p>
      <p className="text-xs text-muted" style={{ fontVariant: "small-caps" }}>
        {t.hairType}
      </p>
    </div>
  );
}

export default function Testimonials() {
  const [activeIndex, setActiveIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  function handleScroll() {
    const el = carouselRef.current;
    if (!el) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    setActiveIndex(Math.min(TESTIMONIALS.length - 1, Math.max(0, index)));
  }

  return (
    <section className="bg-dark px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-bronze">
          What the community is saying
        </p>
        <h2 className="mt-3 font-serif text-3xl font-semibold text-cream sm:text-4xl">
          Real hair. Real results.
        </h2>

        {/* Mobile: swipeable carousel */}
        <div className="mt-10 sm:hidden">
          <div
            ref={carouselRef}
            onScroll={handleScroll}
            style={{ WebkitOverflowScrolling: "touch" }}
            className="no-scrollbar scroll-smooth -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2"
          >
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="w-full shrink-0 snap-center">
                <TestimonialCard t={t} />
              </div>
            ))}
          </div>
          <div className="mt-5 flex justify-center gap-2">
            {TESTIMONIALS.map((t, i) => (
              <span
                key={t.name}
                className={`h-2 w-2 rounded-full transition-colors ${
                  i === activeIndex ? "bg-bronze" : "bg-cream/20"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Desktop: 2x2 grid */}
        <div className="mt-10 hidden grid-cols-2 gap-6 sm:grid">
          {TESTIMONIALS.map((t) => (
            <TestimonialCard key={t.name} t={t} />
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/profile"
            className="inline-flex items-center justify-center rounded-lg bg-bronze px-6 py-4 text-sm font-semibold text-dark transition-colors hover:bg-bronze2"
          >
            Try Qoyl free — no credit card needed →
          </Link>
        </div>
      </div>
    </section>
  );
}
