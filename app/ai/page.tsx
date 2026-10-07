import Link from "next/link";

export const metadata = {
  title: "AI & Generative AI at Qoyl",
  description:
    "A product case study — how AI is embedded into every layer of the Qoyl hair intelligence platform.",
};

// Standalone portfolio document - no global Nav/Footer/BottomNav (see
// the /ai exclusion added to components/Nav.tsx and components/Footer.tsx,
// same pattern already used for /style-match/summary/[id]). This page
// builds its own minimal header and footer directly, per the request.

type Stat = { number: string; label: string };
const STATS: Stat[] = [
  { number: "852", label: "ingredients scored" },
  { number: "8", label: "scoring variables" },
  { number: "400+", label: "products cataloged" },
  { number: "82%", label: "ingredient coverage" },
];

type Block = { type: "p" | "callout" | "list"; text?: string; items?: string[] };
type System = { name: string; badge: string; blocks: Block[] };

const SYSTEMS: System[] = [
  {
    name: "Style Match Vision Pipeline",
    badge: "claude vision api · anthropic",
    blocks: [
      {
        type: "p",
        text:
          "Style Match is Qoyl's generative AI feature. Users upload a photo of a hairstyle they want — either their own selfie or an inspiration image — and Claude Vision identifies the style, detects face shape, and generates a complete hair plan: tutorials matched to their hair type, a scored shopping list, and a stylist match.",
      },
      {
        type: "p",
        text:
          "The Vision API prompt is structured to return a JSON object with 20 fields including style_name, confidence, alternative_style, bang_length, requires_fake_hair, approximate_length, has_color_treatment, style_is_cut, loc_type, face_shape (added after an audit of this page's own claims), and natural_hair_color. Each field drives a downstream product decision.",
      },
      {
        type: "callout",
        text:
          "The confidence field drives a disambiguation UI rather than returning a wrong answer. When confidence is medium or low, the user is shown 2-3 visual options and selects the correct style before the plan is built. This was a deliberate product choice: an AI feature that admits uncertainty is more trustworthy than one that always answers.",
      },
      {
        type: "p",
        text:
          "Style translations — the same style generates different instructions, YouTube search queries, tools, and shopping lists depending on the user's hair family (straight, wavy, curly, coily, extensions). Beach waves on 1b straight hair requires a curling iron and texturizing spray. Beach waves on 4c coily hair requires a 2-4 hour silk press process. The same style name produces 5 completely different product experiences.",
      },
      {
        type: "p",
        text:
          "Privacy: selfie images are analyzed and immediately discarded. They are never stored in the database. Natural hair color detected from the selfie is stored as a text field for color matching, not as an image.",
      },
    ],
  },
  {
    name: "Ingredient Compatibility Scoring",
    badge: "rule-based · ml-ready · domain-knowledge system",
    blocks: [
      {
        type: "p",
        text:
          "Qoyl's core algorithm scores product ingredients against user hair profiles using a weighted mean of per-ingredient compatibility scores, modified by 8 variables: porosity, curl type, scalp condition, climate (seasonal), water hardness, age range, hair concerns, and product weight classification.",
      },
      {
        type: "p",
        text:
          "The algorithm processes 10,391 ingredient-product links across the catalog. Ingredient coverage grew from 26.5% to 82.2% during development through a combination of manual scoring, function-tag auto-scoring, and Open Beauty Facts API enrichment.",
      },
      {
        type: "callout",
        text:
          "Unscored ingredients initially returned a flat neutral score of 5/10, which inflated scores for products with many novel ingredients. The fix: unscored ingredients now fall back to function-aware defaults — a tagged humectant scores 6/7/8 by porosity, a tagged protein scores 4/7/8. This single change dropped the Mielle Rosemary Mint Scalp Oil score from 92 to 76 — a more accurate reflection of the formula's actual compatibility for medium porosity profiles.",
      },
      {
        type: "p",
        text:
          "Five ingredient interaction patterns are detected and scored as whole-product modifiers: multiple humectants in dry climates (−3), protein + humectant overload on low porosity (−4), sulfate + fragrance on sensitive scalp (−3), bond builder + protein synergy (+3), and LCO layering order present (+2). Formaldehyde-releasing preservatives are hard-overridden to avoid regardless of database row.",
      },
      {
        type: "p",
        text:
          "Seasonal climate scoring: a static zip code lookup table maps 50+ city prefixes × 12 months to a climate zone (cold-dry, transitional, humid, tropical). A Chicago user's glycerin score in January differs from their score in July. This runs on every product fetch and updates the stored seasonal_climate field weekly.",
      },
    ],
  },
  {
    name: "Style Disambiguation System",
    badge: "claude vision api · structured output",
    blocks: [
      {
        type: "p",
        text:
          "The Vision API prompt returns a confidence field (high/medium/low) and an alternative_style field. When confidence is not high, a disambiguation UI renders before the plan is built.",
      },
      {
        type: "p",
        text:
          "Disambiguation is implemented for: bang subtypes (baby, curtain, blunt, micro, wispy, side swept), braid types (box vs knotless vs cornrow vs goddess), loc types (starter vs faux vs traditional vs sisterlocks vs butterfly), and twist types (senegalese vs passion vs marley).",
      },
      {
        type: "p",
        text: "Additional routing decisions trigger from structured fields:",
      },
      {
        type: "list",
        items: [
          "style_is_cut: true routes to a salon-preparation flow rather than a styling tutorial flow",
          "has_color_treatment: true surfaces a color routing decision (style only, style + color, or color only)",
          "loc_type: starter or traditional triggers a commitment warning before proceeding — locs are a multi-year decision, not a style appointment",
        ],
      },
    ],
  },
  {
    name: "Face Shape Detection",
    badge: "claude vision api · selfie analysis",
    blocks: [
      {
        type: "p",
        text:
          "When a user uploads a selfie, Claude Vision detects face shape from the structured prompt response. Six face shapes are detected: oval, round, square, heart, diamond, and oblong.",
      },
      {
        type: "p",
        text:
          "The detected face shape feeds into style filtering — styles that are universally flattering for that face shape are surfaced first in the inspo grid. The user's natural hair color is also detected from the selfie and stored as a text field, used downstream for fake hair color matching.",
      },
      {
        type: "p",
        text:
          "The uploaded photo is stored in Supabase Storage, and a public URL is saved to the style_matches row for reference in the summary document. Face shape and natural hair color are extracted from the image and stored as text fields - the image itself is retained for the session summary.",
      },
    ],
  },
  {
    name: "ML Events Infrastructure",
    badge: "data layer · ml-ready",
    blocks: [
      {
        type: "p",
        text:
          "An ml_events table logs every meaningful user action with structured metadata — event_type, entity_id, entity_type, session_id, and a jsonb metadata field containing profile context at the time of the event.",
      },
      {
        type: "p",
        text:
          "Event types logged: product_search, product_save, product_thumbs_up, product_thumbs_down, style_match, style_followed_through, routine_completed, travel_kit_purchased, brand_catalog_view, blur_gate_shown, blur_gate_cta_tapped, affiliate_click, missing_daily_product.",
      },
      {
        type: "p",
        text:
          "This infrastructure was designed before ML models are trained — the data collection runs now so that when volume justifies it, the training dataset already exists. The planned model pipeline: scikit-learn for compatibility score validation, Prophet for demand forecasting, statsmodels for segment regression analysis powering the B2B dashboard.",
      },
    ],
  },
  {
    name: "Open Beauty Facts Enrichment Pipeline",
    badge: "third-party api · admin tooling",
    blocks: [
      {
        type: "p",
        text:
          "An admin enrichment pipeline at /admin/enrichment queries the Open Beauty Facts API by product name or barcode. Results are returned with a match confidence score (high/medium/low) based on name similarity. A diff view shows the admin the ingredient differences between the Qoyl catalog entry and the OBF record before accepting changes.",
      },
      {
        type: "p",
        text:
          "On acceptance: new ingredients are added to the ingredients table, linked to the product via catalog_product_ingredients, and auto-scored from function tags if a primary_function is set. The pipeline is rate-limited to 500ms between requests and caches responses for 24 hours via Next.js fetch cache.",
      },
    ],
  },
];

type Decision = { number: string; title: string; body: string };
const DECISIONS: Decision[] = [
  {
    number: "01",
    title: "Paywall removal for data volume",
    body:
      "The consumer subscription ($7.99/month) was removed to eliminate constraints on user behavior data. A gated product produces gated data — the ML pipeline needs unrestricted behavioral signals to train meaningful models. Revenue shifted entirely to B2B: brand intelligence subscriptions ($35–$760/mo), stylist listings ($35/mo), and hair seller placements ($35/mo). Affiliate commissions on the free consumer product replace subscription revenue at scale.",
  },
  {
    number: "02",
    title: "Confidence-based disambiguation over false precision",
    body:
      "The Style Match Vision prompt returns a confidence field. Rather than always returning the top prediction, medium and low confidence detections trigger a disambiguation UI. This adds one step to the user flow but eliminates the far worse failure mode: a user who receives tutorials and a shopping list for the wrong hairstyle and loses trust in the product entirely.",
  },
  {
    number: "03",
    title: "Function-aware neutral scoring over silent exclusion",
    body:
      "Unscored ingredients were originally excluded from the weighted mean entirely — they contributed nothing to the numerator or denominator. This inflated scores for products with many novel or uncommon ingredients. The fix scores unscored ingredients at a function-aware default (humectant: 6/7/8 by porosity; protein: 4/7/8) rather than excluding them. A single scoring correction moved the Mielle Rosemary Mint Scalp Oil from 92 → 76 for medium porosity profiles — from inflated to accurate.",
  },
  {
    number: "04",
    title: "Hair-type translation layer over generic recommendations",
    body:
      "The same style generates different tutorials, different YouTube search queries, different products, and different instructions depending on the user's hair family. This required a style_translations table with unique rows per style_slug × hair_family combination. The YouTube search override field was the most impactful single column: a 1b straight user searching 'beach waves' gets 'beach waves tutorial straight fine hair curling iron' — not the 4c natural hair content that ranked highest in generic search results.",
  },
  {
    number: "05",
    title: "Seasonal climate over static annual average",
    body:
      "Hair product compatibility with humectants changes with dew point. A static annual climate classification for Chicago would score glycerin the same in January and July — which is wrong. A zip code prefix × month lookup table returns the correct seasonal climate zone, and the humectant scoring adjusts accordingly. The table covers 50+ major US cities across 12 months with three dew point tiers: high (>55°F), moderate (35–55°F), and low (<35°F).",
  },
  {
    number: "06",
    title: "Loc commitment warning as a product safety feature",
    body:
      "When Style Match detects starter locs or traditional locs, the user sees a commitment warning before the plan is built: locs are a multi-year process that cannot be easily reversed. This adds friction intentionally — a user who wants faux locs (temporary) and accidentally commits to a starter loc plan receives tutorials and stylist recommendations for a permanently life-changing hair decision. The warning is a product safety feature, not a conversion optimization.",
  },
  {
    number: "07",
    title: "B2B intelligence as the primary revenue model",
    body:
      "The consumer product generates data. The B2B product sells intelligence derived from that data. Brand intelligence dashboards show brands which segments their formula wins with, which ingredient is costing them customers, and where their product performs by geography. This model only works if the consumer product is used freely at scale — which is why the paywall was removed. The B2B pitch is stronger with a larger unconstrained user base producing more behavioral data.",
  },
];

type TimelineRow = { phase: string; tool: string; application: string; trigger: string };
const TIMELINE: TimelineRow[] = [
  { phase: "Now", tool: "statsmodels", application: "Segment percentile ranking for B2B dashboard", trigger: "Live — data exists" },
  { phase: "Month 3-6", tool: "Prophet", application: "Demand forecasting by hair type segment", trigger: "3 months ml_events data" },
  { phase: "Month 6-9", tool: "scikit-learn", application: "Compatibility score validation against user behavior", trigger: "200+ save/thumbs-up events" },
  { phase: "Month 9-12", tool: "scikit-learn", application: "Churn prediction for B2B signal", trigger: "6 months subscription data" },
  { phase: "Month 12+", tool: "TensorFlow", application: "Style classifier to reduce Claude Vision API cost at scale", trigger: "1,000+ high-confidence style matches" },
];

const STACK_CONSUMER: { label: string; value: string }[] = [
  { label: "Framework", value: "Next.js 14 App Router" },
  { label: "Database", value: "Supabase (PostgreSQL)" },
  { label: "Auth", value: "Supabase Auth" },
  { label: "Payments", value: "Stripe" },
  { label: "Email", value: "Resend" },
  { label: "Storage", value: "Cloudinary" },
  { label: "Deployment", value: "Vercel" },
  { label: "Affiliate", value: "Impact.com, Amazon Associates, Shopper.com" },
];

const STACK_AI: { label: string; value: string }[] = [
  { label: "Vision AI", value: "Anthropic Claude (claude-sonnet-4-6)" },
  { label: "Ingredient DB", value: "Open Beauty Facts API" },
  { label: "Demand signals", value: "Prophet (planned)" },
  { label: "Score validation", value: "scikit-learn (planned)" },
  { label: "Segment analysis", value: "statsmodels (planned)" },
  { label: "Event logging", value: "ml_events (PostgreSQL)" },
  { label: "Search", value: "Full-text + category + brand filtering (PostgreSQL)" },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#aaa]">{children}</p>
  );
}

function Block({ block }: { block: Block }) {
  if (block.type === "callout") {
    return (
      <blockquote className="my-4 border-l-2 border-[#0a0a0a] pl-4 font-sans text-[13px] italic font-light leading-[1.85] text-[#666]">
        {block.text}
      </blockquote>
    );
  }
  if (block.type === "list") {
    return (
      <ul className="my-3 space-y-1.5">
        {block.items?.map((item) => (
          <li key={item} className="font-sans text-[13px] font-light leading-[1.85] text-[#444]">
            — {item}
          </li>
        ))}
      </ul>
    );
  }
  return <p className="font-sans text-[13px] font-light leading-[1.85] text-[#444]">{block.text}</p>;
}

function SystemSection({ system, isLast }: { system: System; isLast: boolean }) {
  return (
    <div className={isLast ? "" : "mb-8 border-b border-[#f0f0f0] pb-8"}>
      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        <h3 className="font-sans text-xl font-bold lowercase text-dark" style={{ letterSpacing: "-0.5px" }}>
          {system.name}
        </h3>
        <span className="inline-block bg-dark px-2 py-[3px] font-mono text-[9px] text-white">
          {system.badge}
        </span>
      </div>
      <div className="space-y-3">
        {system.blocks.map((block, i) => (
          <Block key={i} block={block} />
        ))}
      </div>
    </div>
  );
}

export default function AiCaseStudyPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-[720px] px-6">
        {/* ---- Minimal header / "top nav" ---- */}
        <div className="mb-12 border-b border-[#e8e8e8] py-4">
          <Link href="/" className="font-sans text-sm font-bold lowercase text-dark">
            qoyl
          </Link>
        </div>

        {/* ---- Section 1: header ---- */}
        <header>
          <h1
            className="font-sans text-[32px] font-bold lowercase text-dark"
            style={{ letterSpacing: "-1.5px", marginBottom: "8px" }}
          >
            AI & Generative AI at Qoyl
          </h1>
          <p className="font-sans text-sm font-light leading-[1.75] text-[#666]" style={{ marginBottom: "8px" }}>
            A product case study — how AI is embedded into every layer of the Qoyl hair
            intelligence platform.
          </p>
          <p className="font-mono text-[10px] tracking-wide text-[#aaa]">
            built by d. thomas · founder & product lead · qoyl.live · 2025–2026
          </p>
        </header>
        <hr className="border-[#e8e8e8]" style={{ margin: "28px 0" }} />

        {/* ---- Section 2: platform overview ---- */}
        <section>
          <Eyebrow>the platform</Eyebrow>
          <div className="space-y-4 font-sans text-sm font-light leading-[1.85] text-[#444]">
            <p>
              Qoyl is a hair intelligence platform that scores hair care products against
              personalized consumer profiles — curl type, porosity, scalp condition, climate,
              water hardness, age range, and hair concerns. The scoring system covers 852
              ingredients across a catalog of 400+ products.
            </p>
            <p>
              The consumer product is free. Revenue comes from B2B brand intelligence
              subscriptions, stylist directory listings, and fake hair seller placements — all
              powered by data generated from consumer AI interactions.
            </p>
          </div>

          <div className="my-7 grid grid-cols-2 border border-[#e8e8e8] sm:grid-cols-4">
            {STATS.map((stat, i) => (
              <div
                key={stat.label}
                className={`p-4 ${i < STATS.length - 1 ? "border-r border-[#e8e8e8]" : ""}`}
              >
                <p className="font-mono text-2xl font-bold text-dark">{stat.number}</p>
                <p className="mt-1 font-mono text-[9px] lowercase tracking-wide text-[#aaa]">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ---- Section 3: ai systems built ---- */}
        <section className="mt-2">
          <Eyebrow>ai systems built</Eyebrow>
          <div className="mt-4">
            {SYSTEMS.map((system, i) => (
              <SystemSection key={system.name} system={system} isLast={i === SYSTEMS.length - 1} />
            ))}
          </div>
        </section>

        {/* ---- Section 4: key product decisions ---- */}
        <section className="mt-4">
          <Eyebrow>key product decisions</Eyebrow>
          <div className="mt-4">
            {DECISIONS.map((decision, i) => (
              <div
                key={decision.number}
                className={i < DECISIONS.length - 1 ? "mb-6 border-b border-[#f0f0f0] pb-6" : ""}
              >
                <p className="font-mono text-[10px] text-[#aaa]">{decision.number}</p>
                <p className="mt-1 font-sans text-[15px] font-semibold text-dark">{decision.title}</p>
                <p className="mt-1.5 font-sans text-[13px] font-light leading-[1.8] text-[#666]">
                  {decision.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ---- Section 5: ml roadmap ---- */}
        <section className="mt-4">
          <Eyebrow>ml roadmap</Eyebrow>
          <p className="mt-4 font-sans text-sm font-light leading-[1.85] text-[#444]">
            The data infrastructure is live. The models are not trained yet — volume justifies
            training at approximately 1,000+ profiled users with 6+ months of behavioral events.
          </p>

          <div className="mt-5 overflow-x-auto border border-[#e8e8e8]">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#e8e8e8]">
                  {["Phase", "Tool", "Application", "Trigger"].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2.5 font-mono text-[9px] font-normal uppercase tracking-wide text-[#aaa]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIMELINE.map((row, i) => (
                  <tr
                    key={row.phase}
                    className="border-b border-[#f5f5f5]"
                    style={{ background: i % 2 === 0 ? "#fafafa" : "#ffffff" }}
                  >
                    <td className="px-3 py-2.5 font-sans text-xs font-light text-[#666]">{row.phase}</td>
                    <td className="px-3 py-2.5 font-sans text-xs font-light text-[#666]">{row.tool}</td>
                    <td className="px-3 py-2.5 font-sans text-xs font-light text-[#666]">{row.application}</td>
                    <td className="px-3 py-2.5 font-sans text-xs font-light text-[#666]">{row.trigger}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ---- Section 6: technical foundation ---- */}
        <section className="mt-9">
          <Eyebrow>technical foundation</Eyebrow>
          <div className="mt-4 grid grid-cols-1 border border-[#e8e8e8] sm:grid-cols-2">
            {[
              { heading: "consumer platform", items: STACK_CONSUMER },
              { heading: "ai & data", items: STACK_AI },
            ].map((col, colIdx) => (
              <div
                key={col.heading}
                className={colIdx === 0 ? "border-b border-[#e8e8e8] sm:border-b-0 sm:border-r" : ""}
              >
                <p className="border-b border-[#e8e8e8] px-4 py-2.5 font-mono text-[9px] lowercase tracking-wide text-[#aaa]">
                  {col.heading}
                </p>
                <div>
                  {col.items.map((item) => (
                    <div
                      key={item.label}
                      className="flex flex-wrap gap-x-1.5 border-b border-[#f5f5f5] px-4 py-2.5 last:border-b-0"
                    >
                      <span className="font-sans text-xs font-medium text-dark">{item.label}</span>
                      <span className="font-sans text-xs font-light text-[#666]">· {item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ---- Section 7: footer ---- */}
        <footer
          className="mt-9 flex flex-wrap items-center justify-between gap-4 border-t border-[#e8e8e8]"
          style={{ padding: "32px 0" }}
        >
          <div>
            <p className="font-sans text-[13px] font-medium text-dark">qoyl.live</p>
            <p className="font-mono text-[10px] text-[#888]">hey@qoyl.live</p>
          </div>
          <Link
            href="/"
            className="inline-block bg-dark px-5 py-2.5 font-sans text-xs font-medium text-white transition-colors hover:bg-bronze2"
          >
            view the live product →
          </Link>
        </footer>
      </div>
    </main>
  );
}
