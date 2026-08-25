"use client";

import { useEffect, useState } from "react";
import ChildRoutine from "@/components/ChildRoutine";
import type { ChildWashDaySteps } from "@/lib/childRoutineSteps";

type RoutineData = {
  name: string | null;
  washDays: ChildWashDaySteps[];
  easierWashDayTips: string[] | null;
};

export default function ChildRoutinePage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [data, setData] = useState<RoutineData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/routine/child?id=${id}`)
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
          <ChildRoutine name={data.name} washDays={data.washDays} easierWashDayTips={data.easierWashDayTips} />
        )}
      </div>
    </main>
  );
}
