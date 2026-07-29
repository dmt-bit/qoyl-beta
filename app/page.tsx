import Link from "next/link";
import PostFilterGrid from "@/components/PostFilterGrid";
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
  { name: "Behentrimonium Methosulfate", rating: "Good", dotClass: "bg-green", textClass: "text-green" },
  { name: "Shea Butter", rating: "Good", dotClass: "bg-green", textClass: "text-green" },
  { name: "Glycerin", rating: "Caution for dry climates", dotClass: "bg-amber", textClass: "text-amber" },
];

function StarIcon() {
  return (
    <svg className="h-4 w-4 text-bronze" fill="currentColor" viewBox="0 0 20 20">
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

export default async function Home() {
  const { data: posts } = await supabase
    .from("posts")
    .select(
      "slug, title, category, hero_image_url, excerpt, published_at, hair_type, body, content_type, source_creator, source_creator_url, source_platform, video_url"
    )
    .order("published_at", { ascending: false });

  return (
    <main className="min-h-screen bg-dark font-sans text-cream">
      <section className="bg-warm px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-medium uppercase tracking-wide text-dark/60">
            Free · No brand bias · Built on real hair science
          </p>
          <h2 className="mt-3 font-serif text-3xl font-semibold text-dark sm:text-4xl">
            Finally know what your hair actually needs.
          </h2>
          <p className="mt-3 max-w-xl text-sm text-dark/70">
            Build your free hair profile in 90 seconds — tell us your
            texture, porosity, scalp, and climate. Then search any product
            and get a score built specifically for your hair. Not a general
            rating. Yours.
          </p>
          <Link
            href="/profile"
            className="mt-6 flex w-full items-center justify-center rounded-lg bg-dark px-6 py-4 text-center text-sm font-semibold text-cream transition-colors hover:bg-dark/90 sm:inline-flex sm:w-auto"
          >
            Build my hair profile — it&apos;s free →
          </Link>
          <div>
            <Link
              href="/search"
              className="mt-3 inline-block text-sm font-medium text-bronze transition-colors hover:text-dark"
            >
              Already have a profile? Search a product →
            </Link>
          </div>
        </div>
      </section>

      <div className="border-b border-bronze/20 px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-bronze">
            From the Qoyl feed
          </p>
          <p className="mt-2 text-sm text-cream/70">
            Ingredient breakdowns, product evaluations, and hair science for
            every texture.
          </p>

          <div className="mt-6">
            <PostFilterGrid posts={posts ?? []} />
          </div>
        </div>
      </div>

      <section className="border-b border-bronze/20 bg-dark px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-6">
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

      <section className="border-b border-bronze/20 bg-dark px-4 py-16 text-center sm:px-6">
        <div className="mx-auto max-w-2xl">
          <p className="font-serif text-2xl font-medium leading-snug text-cream sm:text-3xl">
            &quot;The hair science your curls — and waves, and coils — have
            always deserved.&quot;
          </p>
          <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-bronze2">
            Free forever · No brand partnerships · No paid placements · Just
            the science
          </p>
        </div>
      </section>

      <section className="bg-dark px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto grid max-w-5xl grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-bronze">
              Free ingredient evaluation
            </p>
            <h2 className="mt-3 font-serif text-3xl font-semibold text-cream sm:text-4xl">
              Is that product actually right for your hair?
            </h2>
            <p className="mt-4 text-sm text-cream/70 sm:text-base">
              Search any shampoo, conditioner, leave-in, or styler. Get a
              personalized compatibility score built from your curl type,
              porosity, scalp condition, and climate. Takes 10 seconds.
            </p>
            <Link
              href="/search"
              className="mt-6 flex w-full items-center justify-center rounded-lg bg-bronze px-6 py-4 text-center text-sm font-semibold text-dark transition-colors hover:bg-bronze2 sm:inline-flex sm:w-auto"
            >
              Search a product now →
            </Link>
          </div>

          <div className="rounded-xl border border-bronze/30 bg-warm/[0.03] p-6">
            <p className="text-xs uppercase tracking-wide text-cream/50">
              Curl Defining Cream
            </p>
            <div className="mt-3 flex items-center gap-3">
              <span className="rounded-full bg-green px-3 py-1 text-sm font-semibold text-dark">
                87 / 100
              </span>
              <span className="text-xs text-cream/50">
                Compatibility score
              </span>
            </div>
            <div className="mt-5 space-y-2">
              {SCORE_EXAMPLE_ROWS.map((row) => (
                <div key={row.name} className="flex items-center gap-2 text-sm">
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${row.dotClass}`}
                  />
                  <span className="text-cream/80">{row.name}</span>
                  <span className="text-cream/30">·</span>
                  <span className={`font-medium ${row.textClass}`}>
                    {row.rating}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-cream/40">
              Example score — yours will be personalized to your hair.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-dark px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-bronze">
            What the community is saying
          </p>
          <h2 className="mt-3 font-serif text-3xl font-semibold text-cream sm:text-4xl">
            Real hair. Real results.
          </h2>

          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="rounded-xl bg-[#2C2420] p-6">
                <div className="flex gap-1">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <StarIcon key={i} />
                  ))}
                </div>
                <p className="mt-4 text-sm text-cream">&quot;{t.review}&quot;</p>
                <p className="mt-4 text-sm font-medium text-muted">{t.name}</p>
                <p className="text-xs text-muted">{t.hairType}</p>
              </div>
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
    </main>
  );
}
