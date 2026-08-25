import type { ChildWashDaySteps } from "@/lib/childRoutineSteps";

export default function ChildRoutine({
  name,
  washDays,
  easierWashDayTips,
}: {
  name: string | null;
  washDays: ChildWashDaySteps[];
  easierWashDayTips: string[] | null;
}) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-cream sm:text-4xl">
          {name ? `${name}'s routine` : "Routine"}
        </h1>
        <p className="mt-2 text-sm text-cream/70">
          Here&apos;s a wash-day routine tailored for {name || "their"} hair - written for parents,
          not stylists.
        </p>
      </div>

      {easierWashDayTips && (
        <div className="rounded-lg border-l-2 border-bronze bg-amber/10 px-4 py-3 text-sm leading-relaxed text-cream/90">
          <p className="font-semibold text-bronze2">Tips for an easier wash day</p>
          <p className="mt-2">Try: {easierWashDayTips.join(", ")}.</p>
        </div>
      )}

      {washDays.map((day) => (
        <section key={day.key}>
          <h2 className="font-serif text-2xl font-semibold text-cream">{day.label}</h2>
          <div className="mt-4 space-y-4">
            {day.steps.map((step) => (
              <div key={step.title} className="rounded-xl border border-bronze/30 p-5">
                <p className="font-serif text-lg text-bronze2">{step.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-cream/80">{step.body}</p>
                {step.why && <p className="mt-2 text-xs text-cream/50">{step.why}</p>}
                {step.sensoryNote && (
                  <p className="mt-3 rounded-lg bg-amber/10 px-3 py-2 text-xs leading-relaxed text-cream/80">
                    {step.sensoryNote}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
