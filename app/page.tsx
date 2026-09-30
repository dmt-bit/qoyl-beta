import Link from "next/link";
import HomeHero from "@/components/HomeHero";
import { getHomeStats, getFeaturedScoreExample } from "@/lib/homeStats";
import { getPublicEvents, eventCta, eventLocationLabel } from "@/lib/events";

export const dynamic = "force-dynamic";

const TIER_SYMBOL: Record<"green" | "amber" | "red", string> = {
  green: "✓",
  amber: "⚠",
  red: "✗",
};
const TIER_TEXT_CLASS: Record<"green" | "amber" | "red", string> = {
  green: "text-green",
  amber: "text-amber",
  red: "text-red",
};

function CurlIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-dark">
      <path
        strokeLinecap="round"
        d="M5 19c0-6 3-9 3-13a3 3 0 116 0c0 5-6 5-6 10a3 3 0 006 0"
      />
    </svg>
  );
}

function ClimateIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-dark">
      <circle cx="12" cy="8" r="4" />
      <path strokeLinecap="round" d="M12 1v2M12 13v2M4.5 8h2M17.5 8h2M6.5 2.5l1.4 1.4M16.1 3.9l1.4-1.4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 19h12a3 3 0 000-6 4 4 0 00-7.5-1.5A3.5 3.5 0 006 19z" />
    </svg>
  );
}

function PorosityIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-dark">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2s6 7.5 6 12a6 6 0 11-12 0c0-4.5 6-12 6-12z" />
    </svg>
  );
}

// Static "how the score works" explainer (section 3) - the request's
// replacement for a live feed. The only thing that needs updating month
// to month is FEATURED_PRODUCT_NAME/FEATURED_BRAND_NAME in
// lib/homeStats.ts; the three scores shown are always computed live
// against the real scoring engine for whichever product is featured, so
// they're never stale or hand-typed.
function ScoreExplainerSection({
  example,
}: {
  example: Awaited<ReturnType<typeof getFeaturedScoreExample>>;
}) {
  return (
    <section className="border-t border-dark/10 px-4 py-14 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <h2 className="text-center font-serif text-2xl font-semibold leading-tight text-dark sm:text-3xl">
          the same product.
          <br />
          three different scores.
        </h2>

        {example && (
          <div className="mx-auto mt-8 max-w-md border border-dark/15">
            <p className="border-b border-dark/15 px-4 py-3 font-sans text-sm font-medium text-dark">
              {example.productName} — {example.brandName}
            </p>
            {example.rows.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-3 border-b border-dark/10 px-4 py-2.5 last:border-b-0"
              >
                <span className="font-sans text-[13px] text-dark/70">{row.label}</span>
                <span className={`font-mono text-sm font-bold ${TIER_TEXT_CLASS[row.tier]}`}>
                  {row.score} {TIER_SYMBOL[row.tier]}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="mx-auto mt-10 grid max-w-2xl grid-cols-1 gap-6 sm:grid-cols-3">
          {[
            { Icon: CurlIcon, title: "your curl type", body: "Formulas that work on 4c hair can weigh down 2a hair completely." },
            { Icon: ClimateIcon, title: "your climate", body: "Humidity and dry air change how the same ingredients behave on your hair." },
            { Icon: PorosityIcon, title: "your porosity", body: "How well your cuticle absorbs and holds moisture changes what actually helps." },
          ].map(({ Icon, title, body }) => (
            <Link key={title} href="/how-we-score" className="block text-center sm:text-left">
              <Icon />
              <p className="mt-2 font-sans text-sm font-semibold text-dark">{title}</p>
              <p className="mt-1 font-sans text-[13px] font-light leading-relaxed text-dark/60">{body}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default async function Home() {
  const [stats, featuredExample, events] = await Promise.all([
    getHomeStats(),
    getFeaturedScoreExample(),
    getPublicEvents(),
  ]);

  // First upcoming (non-past) published/sold-out event, if any -
  // getPublicEvents() already sorts upcoming-first.
  const upcomingEvent = events.find((e) => e.status !== "past" && e.status !== "cancelled") ?? null;

  return (
    <main className="min-h-screen bg-white font-sans text-dark">
      {/* ---- Hero (above the fold) ---- */}
      <HomeHero />

      {/* ---- Section 2: social proof ---- */}
      <section className="border-t border-dark/10 px-4 py-10 sm:px-6">
        <div className="mx-auto grid max-w-2xl grid-cols-3 gap-4 text-center">
          <div>
            <p className="font-mono text-2xl font-bold text-dark sm:text-3xl">{stats.productCount}+</p>
            <p className="mt-1 font-mono text-[10px] lowercase text-muted">products scored</p>
          </div>
          <div>
            <p className="font-mono text-2xl font-bold text-dark sm:text-3xl">{stats.ingredientCount}+</p>
            <p className="mt-1 font-mono text-[10px] lowercase text-muted">ingredients analyzed</p>
          </div>
          <div>
            <p className="font-mono text-2xl font-bold text-dark sm:text-3xl">8</p>
            <p className="mt-1 font-mono text-[10px] lowercase text-muted">variables per score</p>
          </div>
        </div>
      </section>

      {/* ---- Section 3: how the score works ---- */}
      <ScoreExplainerSection example={featuredExample} />

      {/* ---- Section 4: Style Match CTA ---- */}
      <section className="bg-dark px-4 py-14 text-center sm:px-6">
        <div className="mx-auto max-w-lg">
          <h2 className="font-serif text-2xl font-semibold text-white sm:text-3xl">
            upload a photo. get a complete hair plan.
          </h2>
          <p className="mt-2 font-sans text-sm text-white/70">
            tutorials, shopping list, and a stylist near you.
          </p>
          <Link
            href="/style-match"
            className="mt-6 inline-block bg-white px-6 py-3 font-sans text-sm font-semibold lowercase text-dark transition-colors hover:bg-white/90"
          >
            try style match →
          </Link>
        </div>
      </section>

      {/* ---- Section 6: events (hidden entirely if none upcoming) ---- */}
      {upcomingEvent && (
        <section className="px-4 py-10 sm:px-6">
          <div className="mx-auto max-w-2xl">
            <Link
              href={`/events/${upcomingEvent.slug}`}
              className="flex items-stretch gap-5 border border-dark bg-white p-5 transition-colors hover:bg-warm/40"
            >
              <div className="shrink-0 text-center">
                <p className="font-mono text-[11px] uppercase text-muted">
                  {new Date(upcomingEvent.event_date).toLocaleDateString("en-US", { month: "short" })}
                </p>
                <p className="font-mono text-3xl font-bold leading-none text-dark">
                  {new Date(upcomingEvent.event_date).getDate()}
                </p>
              </div>
              <div className="min-w-0 flex-1 border-l border-dark/15 pl-5">
                <p className="font-sans text-base font-semibold text-dark">{upcomingEvent.title}</p>
                <p className="mt-1 font-mono text-[10px] lowercase text-muted">
                  {eventLocationLabel(upcomingEvent)}
                </p>
                <p className="mt-2 font-sans text-sm font-medium text-bronze2">
                  {eventCta(upcomingEvent, "short").label}
                </p>
              </div>
            </Link>
          </div>
        </section>
      )}
      {/* Newsletter + expanded links live in the shared Footer (rendered
          globally by app/layout.tsx below every page, including this
          one) - see components/Footer.tsx, rather than duplicating a
          second footer-shaped section here. */}
    </main>
  );
}
