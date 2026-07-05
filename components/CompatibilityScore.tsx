import {
  RATING_DOT_CLASSES,
  ScoreResult,
  TIER_CLASSES,
  scoreTier,
} from "@/lib/compatibility";

export function ScoreBadge({ score }: { score: number }) {
  const tier = scoreTier(score);
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl px-6 py-4 ${TIER_CLASSES[tier]}`}
    >
      <span className="font-serif text-4xl font-semibold">{score}</span>
      <span className="text-xs font-medium uppercase tracking-wide">
        Compatibility
      </span>
    </div>
  );
}

export function ScoreResultView({ result }: { result: ScoreResult }) {
  if (result.matches.length === 0) {
    return (
      <p className="mt-4 text-sm text-cream/70">
        No compatibility data found yet for these ingredients.
      </p>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex justify-center">
        <ScoreBadge score={result.normalizedScore} />
      </div>
      <ul className="mt-6 space-y-2">
        {result.matches.map((match, i) => (
          <li
            key={`${match.ingredient_name}-${i}`}
            className="flex items-center justify-between rounded-lg border border-bronze/30 px-4 py-3"
          >
            <span className="text-sm capitalize text-cream">
              {match.ingredient_name}
            </span>
            <span className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  RATING_DOT_CLASSES[match.rating] ?? "bg-muted"
                }`}
              />
              <span className="text-xs capitalize text-cream/70">
                {match.rating}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
