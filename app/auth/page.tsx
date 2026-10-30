"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthPageContent />
    </Suspense>
  );
}

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Only honored for a user who already has a hair profile (see the
  // redirect effect below) - someone without one yet still goes to
  // /profile first, since app/boo/page.tsx's whole point in requiring
  // sign-in is a personalized basket, which needs that profile to exist.
  const redirectParam = searchParams.get("redirect");
  const { user, loading, hairProfile, hairProfileLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (loading || hairProfileLoading || !user) return;
    if (hairProfile && redirectParam) {
      router.replace(redirectParam);
      return;
    }
    router.replace(hairProfile ? "/" : "/profile");
  }, [user, loading, hairProfile, hairProfileLoading, router, redirectParam]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: process.env.NEXT_PUBLIC_SITE_URL || window.location.origin,
      },
    });
    setSubmitting(false);

    if (otpError) {
      setError(otpError.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <main className="min-h-screen bg-white px-4 py-10 font-sans text-dark sm:px-6">
        <div className="mx-auto max-w-sm">
          <h1 className="font-serif text-3xl font-semibold text-dark sm:text-4xl">
            Check your email
          </h1>
          <p className="mt-4 text-sm text-dark/70">
            check your email — we sent you a link to <span className="text-dark">{email}</span>.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white px-4 py-10 font-sans text-dark sm:px-6">
      <div className="mx-auto max-w-sm">
        <h1 className="font-serif text-3xl font-semibold text-dark sm:text-4xl">
          Sign In
        </h1>
        <p className="mt-2 text-sm text-dark/70">
          Enter your email and we&apos;ll send you a link - no password
          needed.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="email" className="font-serif text-lg text-bronze2">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-3 w-full border border-bronze/40 bg-transparent px-4 py-3 text-sm text-dark placeholder:text-dark/40 focus:border-bronze focus:outline-none"
            />
          </div>

          {error && <p className="text-sm text-red">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-bronze py-3 text-sm font-semibold text-cream transition-colors hover:bg-bronze2 disabled:opacity-50"
          >
            {submitting ? "Sending..." : "Send My Link"}
          </button>

          <p className="text-center text-xs text-dark/50">
            By continuing you agree to our{" "}
            <Link
              href="/privacy"
              className="text-bronze2 underline underline-offset-2 hover:text-dark"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </form>
      </div>
    </main>
  );
}
