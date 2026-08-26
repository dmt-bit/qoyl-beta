"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import ExtensionRoutine from "@/components/ExtensionRoutine";
import { fetchExtensionProfileById, type ExtensionProfile } from "@/lib/extensionProfiles";

function ExtensionRoutineContent({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  const [profile, setProfile] = useState<ExtensionProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchExtensionProfileById(id).then((data) => {
      if (cancelled) return;
      if (!data) {
        setError("Couldn't find this extension profile.");
      } else {
        setProfile(data);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <>
      {error && <p className="text-sm text-red">{error}</p>}
      {!profile && !error && <p className="text-sm text-cream/60">Loading...</p>}
      {profile && <ExtensionRoutine profile={profile} initialTab={tab === "blending" ? "blending" : "extensions"} />}
    </>
  );
}

export default function ExtensionRoutinePage({ params }: { params: { id: string } }) {
  return (
    <main className="min-h-screen bg-dark px-4 py-10 font-sans text-cream sm:px-6">
      <div className="mx-auto max-w-2xl">
        <Suspense fallback={<p className="text-sm text-cream/60">Loading...</p>}>
          <ExtensionRoutineContent id={params.id} />
        </Suspense>
      </div>
    </main>
  );
}
