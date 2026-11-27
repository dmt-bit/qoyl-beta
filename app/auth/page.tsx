"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

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
  const redirectParam = searchParams.get("redirect");
  const fromExtension = searchParams.get("from") === "extension";
  const { user, loading, hairProfile, hairProfileLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect already-signed-in users
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

    try {
      const res = await fetch("/api/auth/admin-signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          // When coming from the extension, redirect to the callback page
          // so the session gets relayed to chrome.storage.local.
          ...(fromExtension ? { redirectTo: "/auth/extension-callback" } : {}),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.confirmUrl) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }

      // Navigate to Supabase's verify endpoint — establishes the session
      // and redirects back to the app. No email, no link to click.
      window.location.href = data.confirmUrl;
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-white px-4 py-10 font-sans text-dark sm:px-6">
      <div className="mx-auto max-w-sm">
        <h1 className="font-serif text-3xl font-semibold text-dark sm:text-4xl">
          Sign In
        </h1>
        <p className="mt-2 text-sm text-dark/70">
          Enter your email to get started.
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

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-bronze py-3 text-sm font-semibold text-cream transition-colors hover:bg-bronze2 disabled:opacity-50"
          >
            {submitting ? "Signing in…" : "Sign In"}
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
