const SCORE_EXAMPLE_ROWS = [
  { name: "Behentrimonium Methosulfate", rating: "Good", borderClass: "border-green" },
  { name: "Aloe Barbadensis", rating: "Good", borderClass: "border-green" },
  { name: "Glycerin", rating: "Caution in dry climates", borderClass: "border-amber" },
];

// The mock "Curl Defining Cream, 87" score card - shown wherever we want
// to preview what a personalized score looks like before the user has
// one (home page hero, and the /search sign-up gate). "light" is for
// placement on a white/cream section (home page's product search CTA);
// "dark" (the original styling) is for placement on a dark section and
// stays the default so existing callers are unaffected.
export default function ScoreExampleCard({
  variant = "dark",
}: {
  variant?: "dark" | "light";
}) {
  if (variant === "light") {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
        <p className="font-serif text-[16px] text-dark">Curl Defining Cream</p>
        <p className="mt-4 text-center font-serif text-[64px] leading-none text-dark">
          87
        </p>
        <p className="text-center font-sans text-[9px] tracking-[0.15em] text-bronze">
          COMPATIBILITY
        </p>
        <div className="mt-5">
          {SCORE_EXAMPLE_ROWS.map((row) => (
            <div
              key={row.name}
              className={`border-b border-l-4 border-b-[#f5f5f5] py-3 pl-3 pr-1 font-sans text-[12px] text-dark ${row.borderClass}`}
            >
              {row.name} · {row.rating}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.6)]">
      <p className="font-serif text-[16px] text-dark">Curl Defining Cream</p>
      <p className="mt-4 text-center font-serif text-[64px] leading-none text-dark">
        87
      </p>
      <p className="text-center font-sans text-[9px] tracking-[0.15em] text-bronze">
        COMPATIBILITY
      </p>
      <div className="mt-5">
        {SCORE_EXAMPLE_ROWS.map((row) => (
          <div
            key={row.name}
            className={`border-b border-l-4 border-b-[#e8e8e8] py-3 pl-3 pr-1 font-sans text-[12px] text-dark ${row.borderClass}`}
          >
            {row.name} · {row.rating}
          </div>
        ))}
      </div>
    </div>
  );
}
