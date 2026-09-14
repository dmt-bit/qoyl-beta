import BabyMedicalDisclaimer from "@/components/BabyMedicalDisclaimer";
import type { BabyRoutineStep } from "@/lib/babyRoutineSteps";

export default function BabyRoutine({
  name,
  washFrequencyLabel,
  washDaySteps,
  dailyCare,
}: {
  name: string | null;
  washFrequencyLabel: string | null;
  washDaySteps: BabyRoutineStep[];
  dailyCare: string;
}) {
  return (
    <div className="space-y-8">
      <BabyMedicalDisclaimer />

      <div>
        <h1 className="font-serif text-3xl font-semibold text-dark sm:text-4xl">
          {name ? `${name}'s wash day routine` : "Wash day routine"}
        </h1>
        {washFrequencyLabel && (
          <p className="mt-2 text-sm text-dark/70">Recommended wash frequency: {washFrequencyLabel}</p>
        )}
      </div>

      <section>
        <h2 className="font-serif text-2xl font-semibold text-dark">Wash day steps</h2>
        <div className="mt-4 space-y-4">
          {washDaySteps.map((step, i) => (
            <div key={step.title} className="rounded-xl border border-bronze/30 p-5">
              <p className="font-serif text-lg text-bronze2">
                Step {i + 1} - {step.title}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-dark/80">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-serif text-2xl font-semibold text-dark">Daily care (non-wash days)</h2>
        <div className="mt-4 rounded-xl border border-bronze/30 p-5">
          <p className="text-sm leading-relaxed text-dark/80">{dailyCare}</p>
        </div>
      </section>
    </div>
  );
}
