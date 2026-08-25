"use client";

import { useEffect, useState } from "react";
import BabyRoutine from "@/components/BabyRoutine";
import type { BabyRoutineStep } from "@/lib/babyRoutineSteps";

type RoutineData = {
  name: string | null;
  washFrequencyLabel: string | null;
  washDaySteps: BabyRoutineStep[];
  dailyCare: string;
};

export default function BabyRoutinePage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [data, setData] = useState<RoutineData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/routine/baby?id=${id}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (json.error) {
          setError(json.error);
        } else {
          setData(json);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load this routine. Please try again.");
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <main className="min-h-screen bg-dark px-4 py-10 font-sans text-cream sm:px-6">
      <div className="mx-auto max-w-2xl">
        {error && <p className="text-sm text-red">{error}</p>}
        {!data && !error && <p className="text-sm text-cream/60">Loading...</p>}
        {data && (
          <BabyRoutine
            name={data.name}
            washFrequencyLabel={data.washFrequencyLabel}
            washDaySteps={data.washDaySteps}
            dailyCare={data.dailyCare}
          />
        )}
      </div>
    </main>
  );
}
