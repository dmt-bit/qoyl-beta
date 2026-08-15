const SCORE_EXAMPLE_ROWS = [
  { name: "Behentrimonium Methosulfate", rating: "Good", borderClass: "border-green" },
  { name: "Aloe Barbadensis", rating: "Good", borderClass: "border-green" },
  { name: "Glycerin", rating: "Caution in dry climates", borderClass: "border-amber" },
];

// The mock "Curl Defining Cream, 87" score card -- shown wherever we want
// to preview what a personalized score looks like before the user has
// one (home page hero, and the /search sign-up gate).
export default function ScoreExampleCard() {
  return (
    <div className="rounded-2xl bg-dark p-6 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.6)]">
      <p className="font-serif text-[16px] text-cream">Curl Defining Cream</p>
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
  );
}
