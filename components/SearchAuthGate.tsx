import Link from "next/link";
import ScoreExampleCard from "@/components/ScoreExampleCard";

type SearchAuthGateVariant = "anonymous" | "no-profile";

const COPY: Record<
  SearchAuthGateVariant,
  { headline: string; subheadline: string }
> = {
  anonymous: {
    headline: "Your score is waiting.",
    subheadline:
      "Qoyl scores products against your specific hair profile — curl type, porosity, scalp condition, and climate. Build your free profile first and every search result becomes personal.",
  },
  "no-profile": {
    headline: "One more step before you search.",
    subheadline:
      "You're signed in — now tell us about your hair so we can personalize your scores.",
  },
};

// Shown in place of the search UI whenever there's no hair profile to
// score against yet -- for a signed-out visitor (variant "anonymous") or
// a signed-in user who hasn't saved a profile (variant "no-profile").
// Both funnel to /profile; the anonymous variant also offers a sign-in
// path for a returning user who already has an account.
export default function SearchAuthGate({
  variant,
}: {
  variant: SearchAuthGateVariant;
}) {
  const { headline, subheadline } = COPY[variant];

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-dark px-4 py-12 font-sans text-cream sm:px-6">
      <div className="mx-auto w-full max-w-sm text-center">
        <h1 className="font-serif text-3xl italic text-cream">Qoyl</h1>

        <div className="mx-auto mt-8 max-w-[260px]">
          <ScoreExampleCard />
        </div>

        <h2 className="mt-8 font-serif text-[28px] leading-tight text-cream">
          {headline}
        </h2>
        <p className="mt-3 font-sans text-sm leading-relaxed text-muted">
          {subheadline}
        </p>

        <div className="mt-6 space-y-3">
          <Link
            href="/profile"
            className="flex h-[52px] w-full items-center justify-center rounded-full bg-bronze px-6 text-center font-sans text-sm font-semibold text-cream transition-colors hover:bg-bronze2"
          >
            {variant === "anonymous"
              ? "Build my free hair profile →"
              : "Complete my hair profile →"}
          </Link>

          {variant === "anonymous" && (
            <Link
              href="/auth"
              className="flex h-[52px] w-full items-center justify-center rounded-full border border-bronze bg-transparent px-6 text-center font-sans text-sm font-semibold text-bronze transition-colors hover:bg-bronze/10"
            >
              Already have an account? Sign in →
            </Link>
          )}
        </div>

        <p className="mt-4 font-sans text-[11px] text-muted">
          Free forever · Takes 90 seconds · No credit card
        </p>
      </div>
    </main>
  );
}
