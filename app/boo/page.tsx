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

  if (!user) {
    return (
      <main className="min-h-screen bg-white px-4 py-10 font-sans text-dark sm:px-6">
        <div className="mx-auto max-w-lg py-20 text-center">
          <h2 className="font-serif text-2xl font-semibold text-dark">sign in to build your basket</h2>
          <p className="mt-2 font-sans text-sm text-dark/60">
            your Qoyl profile tells us which products to include for your hair type.
          </p>
          {/* /auth/sign-in doesn't exist in this app - the real route is
              /auth (see app/auth/page.tsx). Its ?redirect= is honored
              only once that page has a hair profile to work with -
              see the comment there. */}
          <a
            href="/auth?redirect=/boo"
            className="mt-6 inline-block bg-bronze px-6 py-3 text-sm font-semibold text-cream hover:bg-bronze2"
          >
            sign in →
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen font-sans text-dark">
      {/* background */}
      <div
        className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('https://res.cloudinary.com/kumxntij/image/upload/v1792163990/pexels-jetkerim-11742984.jpg')" }}
      />
      {/* overlay */}
      <div className="fixed inset-0 -z-10 bg-white/70" />

      <div className="px-4 py-10 sm:px-6">
        <BooBuilder userId={user.id} profile={hairProfile} />
      </div>
    </main>
  );
}
