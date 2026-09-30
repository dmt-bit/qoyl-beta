import Link from "next/link";

// Static explainer below the collage hero (not auto-scrolled to - see
// app/page.tsx). Row data is the request's own literal example numbers,
// rendered as-is rather than computed live against the real scoring
// engine - a deliberate change from the previous home page redesign
// (lib/homeStats.ts's getFeaturedScoreExample, still present but unused
// by this page now), since this request gives an exact table to render
// rather than asking for it to be computed/kept live.
const ROWS: { label: string; score: number }[] = [
  { label: "4a · high porosity · atlanta", score: 91 },
  { label: "2b · low porosity · chicago", score: 58 },
  { label: "1b · fine · dry climate", score: 31 },
];

function scoreColor(score: number): string {
  if (score >= 70) return "#2D7A3D";
  if (score >= 40) return "#C4831A";
  return "#B03030";
}

const CARDS = [
  {
    label: "01 · curl type",
    title: "your curl pattern changes everything",
    body: "1b and 4c hair need completely different formulas. qoyl scores both.",
  },
  {
    label: "02 · climate",
    title: "where you live matters",
    body: "glycerin works beautifully in atlanta. it pulls moisture out of your hair in chicago in january.",
  },
  {
    label: "03 · porosity",
    title: "how your hair absorbs moisture",
    body: "low porosity hair resists absorption. high porosity loses moisture fast. the same product scores differently for each.",
  },
];

export default function ScoreExplainerSection() {
  return (
    <section className="border-t border-dark bg-white px-5 py-10">
      <h2
        className="lowercase text-dark"
        style={{
          fontFamily: "var(--font-space-grotesk), 'Space Grotesk', sans-serif",
          fontWeight: 700,
          fontSize: "clamp(22px, 6vw, 32px)",
          letterSpacing: "-1px",
          marginBottom: "6px",
        }}
      >
        the same product. three different scores.
      </h2>
      <p className="font-mono text-[10px] text-muted" style={{ marginBottom: "28px" }}>
        your hair profile changes everything
      </p>

      <div>
        {ROWS.map((row) => (
          <div
            key={row.label}
            className="flex items-center gap-3 border-b border-[#f0f0f0] py-3"
          >
            <span className="font-sans text-[12px] font-light text-[#666]">{row.label}</span>
            <span className="h-[2px] flex-1 bg-[#e8e8e8]">
              <span
                className="block h-full bg-dark"
                style={{ width: `${row.score}%` }}
              />
            </span>
            <span className="font-mono text-[18px] font-bold" style={{ color: scoreColor(row.score) }}>
              {row.score}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-4 text-center font-mono text-[10px] italic text-muted">
        curl maker · camille rose
      </p>

      <p className="mt-4 text-center">
        <Link
          href="/profile"
          className="font-sans text-[13px] font-medium text-dark underline underline-offset-2"
        >
          create your profile to see your score →
        </Link>
      </p>

      <div
        className="mt-7 grid grid-cols-1 gap-px border-t border-dark bg-dark sm:grid-cols-3"
      >
        {CARDS.map((card) => (
          <Link key={card.label} href="/how-we-score" className="block bg-white px-4 py-5">
            <p className="font-mono text-[8px] text-muted">{card.label}</p>
            <p className="mt-1.5 font-sans text-sm font-semibold text-dark">{card.title}</p>
            <p className="mt-1.5 font-sans text-xs font-light leading-[1.65] text-[#666]">
              {card.body}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
