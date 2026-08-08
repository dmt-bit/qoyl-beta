import Link from "next/link";
import PostFilterGrid from "@/components/PostFilterGrid";
import Testimonials from "@/components/Testimonials";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function ProfileIcon() {
  return (
    <svg
      className="h-8 w-8 text-bronze2"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      className="h-8 w-8 text-bronze2"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
      />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg
      className="h-8 w-8 text-bronze2"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
      />
    </svg>
  );
}

const HOW_IT_WORKS_STEPS = [
  {
    icon: ProfileIcon,
    title: "Tell us about your hair",
    description:
      "Curl type, porosity, scalp condition, climate, and more. Takes 90 seconds. The more you tell us, the more accurate your scores.",
  },
  {
    icon: SearchIcon,
    title: "Search any product",
    description:
      "Type in any hair care product. We pull the real ingredient list and score every ingredient against your specific profile.",
  },
  {
    icon: ChartIcon,
    title: "Get your personalized score",
    description:
      "See exactly which ingredients work for your hair, which ones are risky, and why — based on your variables, not someone else's.",
  },
];

const SCORE_EXAMPLE_ROWS = [
  { name: "Behentrimonium Methosulfate", rating: "Good", borderClass: "border-green" },
  { name: "Aloe Barbadensis", rating: "Good", borderClass: "border-green" },
  { name: "Glycerin", rating: "Caution in dry climates", borderClass: "border-amber" },
];

const MISSION_PILLS = [
  "Free forever",
  "No brand partnerships",
  "No paid placements",
  "Just the science",
];

// Placeholder squares for the hero's hair-type strip -- real photography
// per texture comes later. Six codes spanning straight through coily so
// the strip reads as "every texture," not just a handful of curl types.
const HAIR_TYPE_STRIP = ["1a", "2b", "3a", "3c", "4a", "4c"];

export default async function Home() {
  const { data: posts } = await supabase
    .from("posts")
    .select(
      "slug, title, category, hero_image_url, excerpt, published_at, hair_type, body, content_type, source_creator, source_creator_url, source_platform, video_url"
    )
    .order("published_at", { ascending: false });

  return (
    <main className="min-h-screen bg-dark font-sans text-cream">
      <section className="relative flex h-[85vh] flex-col items-center justify-center overflow-hidden bg-dark px-4 sm:h-[90vh]">
        <div className="hero-anim-wordmark flex flex-col items-center">
          <h1 className="text-center font-serif text-5xl italic text-cream sm:text-6xl">
            Qoyl
          </h1>
          <div className="mt-3 h-px w-10 bg-bronze" />
        </div>

        <div className="hero-anim-strip mt-12 w-full overflow-hidden sm:mt-16">
          <div className="hair-type-strip-track flex w-max gap-4">
            {[...HAIR_TYPE_STRIP, ...HAIR_TYPE_STRIP].map((code, i) => (
              <div
                key={`${code}-${i}`}
                className="relative h-[160px] w-[160px] shrink-0 bg-[#2C2420]"
              >
                <span className="absolute bottom-2 left-2 font-sans text-[10px] text-bronze">
                  {code}
                </span>
              </div>
            ))}
          </div>
        </div>

        <h2 className="hero-anim-headline mt-12 max-w-xs text-center font-serif text-[28px] italic leading-[1.2] text-cream sm:mt-16 sm:max-w-md sm:text-4xl">
          Finally know what your hair actually needs.
        </h2>

        <Link
          href="/profile"
          className="hero-anim-cta mx-4 mt-8 flex h-[52px] w-[calc(100%-32px)] items-center justify-center rounded-full bg-bronze px-6 text-center font-sans text-sm font-semibold text-cream transition-colors hover:bg-bronze2 sm:mt-10 sm:w-auto sm:px-10"
        >
          Build my free hair profile →
        </Link>
      </section>

      <section className="fade-up-block bg-warm px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto flex max-w-5xl flex-col items-center text-center lg:grid lg:grid-cols-2 lg:items-center lg:gap-16 lg:text-left">
          <div className="lg:order-1">
            <h2 className="max-w-sm font-serif text-[32px] leading-tight text-dark sm:text-4xl lg:max-w-none">
              Is that product actually right for your hair?
            </h2>
            <p className="mx-auto mt-4 max-w-xs text-sm text-dark/70 sm:max-w-sm sm:text-base lg:mx-0">
              Search any shampoo, conditioner, leave-in, or styler and get a
              personalized compatibility score built from your curl type,
              porosity, scalp condition, and climate.
            </p>
          </div>

          <div className="order-first mb-10 w-full max-w-[280px] lg:order-2 lg:mb-0 lg:row-span-2">
            <div className="rounded-2xl bg-dark p-6 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.6)]">
              <p className="font-serif text-[16px] text-cream">
                Curl Defining Cream
              </p>
              <p className="mt-4 text-center font-serif text-[64px] leading-none text-cream">
                87
              </p>
              <p className="text-center font-sans text-[9px] tracking-[0.15em] text-bronze">
                COMPATIBILITY
              </p>
              <div className="mt-5">
                {SCORE_EXAMPLE_ROWS.map((row) => (
                  <div
                    key={row.name}
                    className={`border-b border-l-4 border-b-[#2C2420] py-3 pl-3 pr-1 font-sans text-[12px] text-cream ${row.borderClass}`}
                  >
                    {row.name} · {row.rating}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="w-full max-w-xs lg:order-3 lg:max-w-none">
            <Link
              href="/search"
              className="flex h-[52px] w-full items-center justify-center rounded-full bg-bronze px-6 text-center font-sans text-sm font-semibold text-dark transition-colors hover:bg-bronze2 lg:w-auto lg:px-10"
            >
              Score a product on your shelf →
            </Link>
            <p className="mt-3 text-center text-xs text-dark/50 lg:text-left">
              Free · No account required to try
            </p>
          </div>
        </div>
      </section>

      <div className="fade-up-block border-b border-bronze/20 px-4 pb-10 pt-14 sm:px-6 sm:pt-10">
        <div className="mx-auto max-w-5xl">
          <PostFilterGrid posts={posts ?? []} />
        </div>
      </div>

      <section className="fade-up-block border-b border-bronze/20 bg-warm px-4 py-14 sm:bg-dark sm:px-6 sm:py-12">
        <div className="mx-auto max-w-5xl">
          {/* Mobile: vertical timeline */}
          <div className="relative space-y-10 pl-8 sm:hidden">
            <div className="absolute bottom-2 left-[7px] top-2 w-px bg-bronze/40" />
            {HOW_IT_WORKS_STEPS.map((step) => (
              <div key={step.title} className="relative">
                <span className="absolute -left-8 top-1 h-3.5 w-3.5 rounded-full border-2 border-warm bg-bronze" />
                <h3 className="font-serif text-2xl font-semibold text-dark">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-dark/70">{step.description}</p>
              </div>
            ))}
          </div>

          {/* Desktop: original 3-column layout */}
          <div className="hidden grid-cols-3 gap-6 sm:grid">
            {HOW_IT_WORKS_STEPS.map((step, i) => (
              <div key={step.title} className="flex flex-col items-start">
                <step.icon />
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-bronze2">
                  Step {i + 1}
                </p>
                <h3 className="mt-1 font-serif text-xl font-semibold text-cream">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-cream/70">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="fade-up-block relative overflow-hidden border-b border-bronze/20 bg-dark px-4 py-16 text-center sm:px-6">
        <span
          aria-hidden
          className="pointer-events-none absolute -left-4 -top-16 z-0 select-none font-serif text-[12rem] leading-none text-bronze/10 sm:text-[16rem]"
        >
          &quot;
        </span>
        <div className="relative z-10 mx-auto max-w-2xl">
          <p className="font-serif text-lg italic leading-snug text-cream sm:text-3xl sm:not-italic sm:font-medium">
            &quot;The hair science your curls — and waves, and coils — have
            always deserved.&quot;
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {MISSION_PILLS.map((pill) => (
              <span
                key={pill}
                className="rounded-full border border-bronze/40 bg-dark px-3 py-1 text-xs font-semibold uppercase tracking-wide text-bronze2"
              >
                {pill}
              </span>
            ))}
          </div>
        </div>
      </section>

      <Testimonials />
    </main>
  );
}
