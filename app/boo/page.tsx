"use client";

// Deviates from the original spec's "server component reading the user
// from cookies" - this codebase has no SSR/cookie-based auth session
// anywhere (every other page, including app/routine/page.tsx and
// app/profile/page.tsx, is "use client" + useAuth()'s client-side
// Supabase session). useAuth() already exposes hairProfile/
// hairProfileLoading directly (lib/auth-context.tsx), so this reads
// those instead of re-fetching.

import { useAuth } from "@/lib/auth-context";
import BooBuilder from "./_components/BooBuilder";

export default function BooPage() {
  const { user, loading, hairProfile, hairProfileLoading } = useAuth();

  if (loading || hairProfileLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white font-sans">
        <p className="text-sm text-dark/60">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white px-4 py-10 font-sans text-dark sm:px-6">
      <BooBuilder userId={user?.id ?? null} profile={hairProfile} />
    </main>
  );
}
