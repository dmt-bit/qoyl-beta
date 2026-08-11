import Link from "next/link";

export const metadata = {
  title: "How Qoyl Scores Products",
  description:
    "No black box. No brand bias. Here's exactly how your compatibility score is calculated.",
};

const SCORE_RANGES = [
  {
    range: "70–100",
    label: "Strong match",
    borderClass: "border-green",
    badgeClass: "bg-green text-dark",
    body: "This product's ingredient profile aligns well with your hair's needs. The key ingredients score positively for your porosity level and hair type, and we didn't flag anything that commonly causes problems for your specific profile. This doesn't mean it will work perfectly — individual responses vary — but the ingredient science supports it.",
  },
  {
    range: "40–69",
    label: "Proceed with caution",
    borderClass: "border-amber",
    badgeClass: "bg-amber text-dark",
    body: "This product has a mixed ingredient profile for your hair. Some ingredients score well, others are flagged as potential concerns for your porosity or hair type. Read the ingredient breakdown before purchasing — the caution flags will tell you exactly what to watch for.",
  },
  {
    range: "0–39",
    label: "Not recommended for your profile",
    borderClass: "border-red",
    badgeClass: "bg-red text-cream",
    body: "Several ingredients in this product are flagged as problematic for your specific hair profile. That doesn't mean the product is bad — it may work beautifully for someone with different porosity or curl type. But the ingredient science suggests it's worth exploring other options first.",
  },
];

const SCORE_VARIABLES = [
  {
    title: "Curl type (1a–4c)",
    body: "Your curl pattern affects how products distribute through your hair, how much tension and manipulation your hair can handle, and which hold agents and stylers work best. Tight coils need different slip and moisture-sealing than loose waves.",
  },
  {
    title: "Porosity",
    body: "Porosity is the single most important variable in our scoring. It determines whether an ingredient actually enters your hair shaft or sits on top of it. Low porosity hair resists absorption — heavy humectants and butters can build up. High porosity hair absorbs quickly but loses moisture just as fast — it needs sealants and protein to hold moisture in.",
  },
  {
    title: "Scalp condition",
    body: "Your scalp condition affects which cleansing agents, preservatives, and active ingredients we flag. Sensitive scalps get stronger warnings on fragrance, essential oils, and harsh surfactants. Dandruff-prone scalps get different guidance on antifungal ingredients.",
  },
  {
    title: "Climate (from your zip code)",
    body: "Climate changes everything about how humectants behave. Glycerin in humid Miami pulls moisture into your hair. Glycerin in dry Phoenix pulls moisture OUT of your hair. We factor in your local humidity and temperature data to adjust humectant scoring accordingly.",
  },
  {
    title: "Strand thickness",
    body: "Fine strands can be weighed down by ingredients that work beautifully on coarse strands. We adjust scoring for heavy butters, oils, and film-forming polymers based on your strand thickness.",
  },
  {
    title: "Water hardness (from your zip code)",
    body: "Hard water deposits calcium and magnesium on the hair shaft, blocking moisture and making products less effective. We factor your local water hardness into how we score chelating agents and clarifying ingredients — if you're in a hard water city, we weight those ingredients more favorably.",
  },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest text-bronze">
      {children}
    </p>
  );
}

export default function HowWeScorePage() {
  return (
    <main className="min-h-screen bg-dark px-4 py-10 font-sans text-cream sm:px-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-serif text-3xl font-semibold text-cream sm:text-4xl">
          How Qoyl Scores Products
        </h1>
        <p className="mt-3 text-sm text-cream/70 sm:text-base">
          No black box. No brand bias. Here&apos;s exactly how your
          compatibility score is calculated.
        </p>

        {/* SECTION 1 -- What the score means */}
        <section className="mt-14">
          <SectionLabel>What the score means</SectionLabel>
          <h2 className="mt-3 font-serif text-2xl font-semibold leading-snug text-cream sm:text-3xl">
            Your score is personal. Someone else&apos;s 4c high porosity hair
            in Houston will get a different score on the same product than
            your 2b low porosity hair in Chicago. That&apos;s the point.
          </h2>

          <div className="mt-8 space-y-4">
            {SCORE_RANGES.map((tier) => (
              <div
                key={tier.range}
                className={`rounded-lg border-l-4 bg-warm/[0.03] p-4 ${tier.borderClass}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${tier.badgeClass}`}
                  >
                    {tier.range}
                  </span>
                  <p className="font-serif text-lg text-cream">{tier.label}</p>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-cream/70">
                  {tier.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 2 -- What goes into your score */}
        <section className="mt-14">
          <SectionLabel>What goes into your score</SectionLabel>
          <h2 className="mt-3 font-serif text-2xl font-semibold text-cream sm:text-3xl">
            Six variables. One score.
          </h2>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            {SCORE_VARIABLES.map((variable, i) => (
              <div
                key={variable.title}
                className="rounded-lg border border-bronze/30 p-3 sm:p-4"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide text-bronze2">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <p className="mt-1 font-serif text-base leading-tight text-cream sm:text-lg">
                  {variable.title}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-cream/70">
                  {variable.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 3 -- How ingredient scores are calculated */}
        <section className="mt-14">
          <SectionLabel>How ingredient scores are calculated</SectionLabel>
          <h2 className="mt-3 font-serif text-2xl font-semibold text-cream sm:text-3xl">
            Every ingredient has a score. Your profile determines which ones
            matter most.
          </h2>

          <div className="mt-5 space-y-4 text-sm leading-relaxed text-cream/80">
            <p>
              Qoyl maintains a database of hair care ingredients, each scored
              on a 0–10 scale for low, medium, and high porosity hair
              separately. A score of 8–10 means the ingredient is
              well-suited for that porosity level. A score of 4–7 is
              neutral — present but not a significant help or harm. A score
              of 0–3 means the ingredient is commonly problematic for that
              porosity level.
            </p>
            <p>
              Your product&apos;s compatibility score is calculated by
              matching every ingredient in the product against our database,
              applying your porosity score to each match, and weighting by
              ingredient position — an ingredient listed first is present in
              higher concentration than one listed last, so it carries more
              weight in the final score.
            </p>
            <p>
              The final 0–100 score is a weighted average across all matched
              ingredients, scaled to reflect both the concentration of each
              ingredient and its compatibility with your specific porosity
              level.
            </p>
          </div>
        </section>

        {/* SECTION 4 -- What our scores don't tell you */}
        <section className="mt-14">
          <SectionLabel>What our scores don&apos;t tell you</SectionLabel>
          <h2 className="mt-3 font-serif text-2xl font-semibold text-cream sm:text-3xl">
            Honest limitations.
          </h2>

          <div className="mt-5 space-y-4 text-sm leading-relaxed text-cream/80">
            <p>
              Qoyl scores cosmetic compatibility — not medical outcomes. Our
              scores reflect ingredient-level data and hair science, not
              clinical trials or guaranteed results. Individual responses to
              ingredients vary based on factors we don&apos;t capture:
              medication, hormonal changes, water temperature, application
              technique, and more.
            </p>
            <p>
              A high score means the ingredient profile aligns with your
              hair&apos;s needs. It doesn&apos;t guarantee the product will
              work for you. A low score means the ingredient profile raises
              concerns for your profile — it doesn&apos;t mean the product
              is dangerous or won&apos;t work for anyone.
            </p>
            <p>
              We do not address medical hair loss, scalp conditions
              requiring medical treatment, or any health-related concerns.
              If you are experiencing significant hair loss, scalp pain, or
              other symptoms, please consult a licensed dermatologist.
            </p>
          </div>
        </section>

        {/* SECTION 5 -- Our commitment to independence */}
        <section className="mt-14">
          <SectionLabel>Our commitment to independence</SectionLabel>
          <h2 className="mt-3 font-serif text-2xl font-semibold text-cream sm:text-3xl">
            No brand pays to improve their score.
          </h2>

          <div className="mt-5 space-y-4 text-sm leading-relaxed text-cream/80">
            <p>
              Every score on Qoyl is generated by our algorithm from the
              product&apos;s ingredient list and your hair profile. Brand
              partners who access our B2B dashboard see their scores — they
              don&apos;t influence them. Affiliate relationships with
              retailers do not affect compatibility scores. A product that
              scores 34 will always score 34 for your profile, regardless of
              whether we have an affiliate relationship with the brand.
            </p>
            <p>
              If we ever change our scoring methodology, we will document
              the change and explain why.
            </p>
          </div>
        </section>

        <div className="mt-14 border-t border-bronze/20 pt-6">
          <p className="text-xs text-cream/40">Last updated August 10, 2026</p>
          <Link
            href="/search"
            className="mt-4 inline-block text-sm text-bronze2 underline underline-offset-2 hover:text-cream"
          >
            ← Back to product search
          </Link>
        </div>
      </div>
    </main>
  );
}
