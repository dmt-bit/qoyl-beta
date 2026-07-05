"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

type Mode = "sign-in" | "sign-up";

export default function AuthPage() {
  const router = useRouter();
  const { user, loading, hairProfile, hairProfileLoading } = useAuth();

  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  useEffect(() => {
    if (loading || hairProfileLoading || !user) return;
    router.replace(hairProfile ? "/" : "/profile");
  }, [user, loading, hairProfile, hairProfileLoading, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setSubmitting(true);

    if (mode === "sign-up") {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      setSubmitting(false);

      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      if (!data.session) {
        setInfoMessage(
          "Check your email to confirm your account, then sign in."
        );
        setMode("sign-in");
      }
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setSubmitting(false);

    if (signInError) {
      setError(signInError.message);
    }
  }

  function toggleMode() {
    setMode((prev) => (prev === "sign-in" ? "sign-up" : "sign-in"));
    setError(null);
    setInfoMessage(null);
  }

  return (
    <main className="min-h-screen bg-dark px-4 py-10 font-sans text-cream sm:px-6">
      <div className="mx-auto max-w-sm">
        <h1 className="font-serif text-3xl font-semibold text-cream sm:text-4xl">
          {mode === "sign-in" ? "Sign In" : "Create Account"}
        </h1>
        <p className="mt-2 text-sm text-cream/70">
          {mode === "sign-in"
            ? "Sign in to save and access your hair profile."
            : "Create an account to save your hair profile across visits."}
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
              className="mt-3 w-full rounded-lg border border-bronze/40 bg-transparent px-4 py-3 text-sm text-cream placeholder:text-cream/40 focus:border-bronze focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="font-serif text-lg text-bronze2"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete={
                mode === "sign-in" ? "current-password" : "new-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-3 w-full rounded-lg border border-bronze/40 bg-transparent px-4 py-3 text-sm text-cream placeholder:text-cream/40 focus:border-bronze focus:outline-none"
            />
          </div>

          {error && <p className="text-sm text-red">{error}</p>}
          {infoMessage && <p className="text-sm text-green">{infoMessage}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-bronze py-3 text-sm font-semibold text-dark transition-colors hover:bg-bronze2 disabled:opacity-50"
          >
            {submitting
              ? "Please wait..."
              : mode === "sign-in"
              ? "Sign In"
              : "Sign Up"}
          </button>
        </form>

        <button
          type="button"
          onClick={toggleMode}
          className="mt-6 text-sm text-bronze2 underline underline-offset-2"
        >
          {mode === "sign-in"
            ? "Don't have an account? Sign up"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </main>
  );
}
