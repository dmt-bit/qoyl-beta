import Image from "next/image";
import Link from "next/link";
import MasonryFeed from "@/components/MasonryFeed";
import ScoreExampleCard from "@/components/ScoreExampleCard";
import Testimonials from "@/components/Testimonials";
import { PRODUCT_CATEGORIES } from "@/lib/productCategories";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function SparkleIcon() {
  return (
    <svg className="h-10 w-10 text-bronze" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2l1.8 5.4L19 9l-5.2 1.6L12 16l-1.8-5.4L5 9l5.2-1.6L12 2zM19 14l.9 2.6L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.4L19 14zM5 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z" />
    </svg>
  );
}

const HOW_IT_WORKS_STEPS = [
  {
    title: "Tell us about your hair",
    description:
      "Curl type, porosity, scalp condition, climate, and more. Takes 90 seconds. The more you tell us, the more accurate your scores.",
  },
  {
    title: "Search any product",
    description:
      "Type in any hair care product. We pull the real ingredient list and score every ingredient against your specific profile.",
  },
  {
    title: "Get your personalized score",
    description:
      "See exactly which ingredients work for your hair, which ones are risky, and why — based on your variables, not someone else's.",
  },
];

const MISSION_PILLS = [
  "Free forever",
  "No brand partnerships",
  "No paid placements",
  "Just the science",
];

const STYLE_MATCH_FEATURE_PILLS = ["Tutorials", "Shopping list", "Stylist match"];

// Real hair photography for the hero's scrolling strip, spanning
// straight through coily so it reads as "every texture," not just a
// handful of curl types.
const HAIR_TYPE_STRIP = [
  "https://images.pexels.com/photos/4257489/pexels-photo-4257489.jpeg",
  "https://images.pexels.com/photos/7956110/pexels-photo-7956110.jpeg",
  "https://images.pexels.com/photos/4584409/pexels-photo-4584409.jpeg",
  "https://images.pexels.com/photos/6101922/pexels-photo-6101922.jpeg",
  "https://images.pexels.com/photos/6945691/pexels-photo-6945691.jpeg",
  "https://images.pexels.com/photos/6616645/pexels-photo-6616645.jpeg",
];

// Home isn't instantiated with props by anything (it's a route, not a
// reusable component), so this stands in for the "prop that defaults to
// null" ask -- swap in a real Cloudinary URL here once one exists, and
// the placeholder below is replaced automatically.
const STYLE_MATCH_IMAGE_URL: string | null = null;

export default async function Home() {
  const { data: posts } = await supabase
    .from("posts")
    .select(
      "slug, title, category, hero_image_url, excerpt, published_at, hair_type, body, content_type, source_creator, source_creator_url, source_platform, video_url"
    )
    .order("published_at", { ascending: false });

  return (
    <main className="min-h-screen bg-dark font-sans text-cream">
      {/* 1. HERO -- unchanged */}
      <section className="relative flex h-[85vh] flex-col items-center justify-center overflow-hidden bg-dark px-4 sm:h-[90vh]">
        <div className="hero-anim-wordmark flex flex-col items-center">
          <h1 className="text-center font-serif text-5xl italic text-cream sm:text-6xl">
            Qoyl
          </h1>
          <div className="mt-3 h-px w-10 bg-bronze" />
        </div>

        <div className="hero-anim-strip mt-12 w-full overflow-hidden sm:mt-16">
          <div className="hair-type-strip-track flex w-max gap-4">
            {[...HAIR_TYPE_STRIP, ...HAIR_TYPE_STRIP].map((src, i) => (
              <div
                key={`${src}-${i}`}
                className="relative h-[160px] w-[160px] shrink-0 bg-[#2C2420]"
              >
                <Image
                  src={src}
                  alt=""
                  fill
                  unoptimized={true}
                  sizes="160px"
                  className="object-cover object-top"
                />
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

      {/* 2. STYLE MATCH PROMO -- warm cream, full contrast from the hero */}
      <section className="fade-up-block bg-warm px-4 py-[60px] sm:px-6 sm:py-24">
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-10 lg:flex-row lg:items-center lg:gap-16">
          <div className="w-full text-left lg:w-1/2">
            <span className="inline-block rounded-full border border-bronze px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-bronze">
              New
            </span>
            <h2 className="mt-4 font-serif text-[36px] italic leading-[1.15] text-dark">
              Show us the style.
              <br />
              We will build your plan.
            </h2>
            <p className="mt-4 text-sm leading-[1.8] text-[#5A4A3A]">
              Upload any photo of a hairstyle you want. Style Match finds tutorials,
              builds your complete shopping list, and connects you with a local stylist —
              all matched to your hair profile.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {STYLE_MATCH_FEATURE_PILLS.map((pill) => (
                <span
                  key={pill}
                  className="rounded-full bg-[#1C1612] px-3 py-1.5 text-xs font-medium text-cream"
                >
                  {pill}
                </span>
              ))}
            </div>

            <Link
              href="/style-match"
              className="mt-8 flex h-[52px] w-full items-center justify-center rounded-full bg-bronze px-8 text-center font-sans text-sm font-semibold text-dark transition-colors hover:bg-bronze2 sm:w-auto"
            >
              Try Style Match →
            </Link>
          </div>

          <div className="mx-auto w-full max-w-[280px] lg:mx-0 lg:w-1/2">
            <div className="relative h-[320px] w-[280px] max-w-full overflow-hidden rounded-2xl bg-[#1C1612]">
              {STYLE_MATCH_IMAGE_URL ? (
                <Image
                  src={STYLE_MATCH_IMAGE_URL}
                  alt="Style Match example"
                  fill
                  sizes="280px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <SparkleIcon />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 3. THE FEED -- dark returns after the cream Style Match section.
          MasonryFeed already renders its own "The feed" eyebrow. */}
      <div className="fade-up-block border-b border-bronze/20 bg-dark px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <MasonryFeed posts={posts ?? []} />
        </div>
      </div>

      {/* 4. PRODUCT SEARCH CTA -- pure white, maximum contrast */}
      <section className="fade-up-block bg-white px-4 py-12 text-center sm:px-6 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-bronze">
            Free ingredient evaluation
          </p>
          <h2 className="mx-auto mt-3 max-w-sm font-serif text-[32px] leading-tight text-dark sm:max-w-none">
            Is that product actually right for your hair?
          </h2>
          <p className="mx-auto mt-4 max-w-xs text-sm text-dark/70 sm:max-w-sm sm:text-base">
            Search any shampoo, conditioner, leave-in, or styler and get a
            personalized compatibility score built from your curl type,
            porosity, scalp condition, and climate.
          </p>

          <div className="mx-auto mt-10 w-full max-w-[280px]">
            <ScoreExampleCard variant="light" />
          </div>

          <Link
            href="/search"
            className="mx-auto mt-10 flex h-[52px] w-full max-w-xs items-center justify-center rounded-full bg-bronze px-6 text-center font-sans text-sm font-semibold text-dark transition-colors hover:bg-bronze2 sm:w-auto"
          >
            Score a product →
          </Link>
          <p className="mt-3 text-center text-xs text-dark/50">
            Free · No account required to try
          </p>

          <div className="relative mt-12">
            <p className="text-left text-[9px] font-semibold uppercase tracking-[0.15em] text-bronze">
              Browse the catalog
            </p>
            <div className="relative mt-4">
              <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
                {PRODUCT_CATEGORIES.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/search?category=${c.slug}`}
                    className="shrink-0 whitespace-nowrap rounded-full border border-bronze bg-transparent px-3 py-1.5 font-sans text-xs font-medium text-bronze transition-colors hover:bg-bronze/10"
                  >
                    {c.label}
                  </Link>
                ))}
              </div>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex w-10 items-center justify-end bg-gradient-to-r from-transparent to-white" />
            </div>
          </div>
        </div>
      </section>

      {/* 5. HOW IT WORKS -- lighter cream, single timeline (no duplicate mobile/desktop blocks) */}
      <section className="fade-up-block bg-cream px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-2xl">
          <div className="relative space-y-10 pl-8">
            <div className="absolute bottom-2 left-[7px] top-2 w-px bg-bronze/40" />
            {HOW_IT_WORKS_STEPS.map((step) => (
              <div key={step.title} className="relative">
                <span className="absolute -left-8 top-1 h-3.5 w-3.5 rounded-full border-2 border-cream bg-bronze" />
                <h3 className="font-serif text-[18px] font-semibold text-dark">
                  {step.title}
                </h3>
                <p className="mt-2 text-[13px] text-muted">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. MISSION STRIP -- unchanged, back to dark */}
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

      {/* 7. REVIEWS -- cream (Testimonials.tsx), final contrast before the dark footer */}
      <Testimonials />
    </main>
  );
}
