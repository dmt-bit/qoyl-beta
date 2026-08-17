"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

type Mode = "sign-in" | "sign-up" | "forgot-password";

export default function AuthPage() {
  const router = useRouter();
  const { user, loading, hairProfile, hairProfileLoading } = useAuth();

  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const [resetEmail, setResetEmail] = useState("");
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

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

      // Fire-and-forget -- never awaited, never shown to the user, and
      // must not delay the info message/redirect below. Server-side
      // bridge (see app/api/notify/new-signup/route.ts) since this is a
      // client component and can't import lib/sendWelcomeEmail.ts /
      // lib/notify.ts (and RESEND_API_KEY) directly.
      if (data.user) {
        fetch("/api/notify/new-signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }).catch((err) =>
          console.warn("[auth] Signup notification request failed:", err)
        );
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

  async function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResetError(null);
    setResetSubmitting(true);

    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(
      resetEmail,
      { redirectTo: "https://qoyl-beta-alpha.vercel.app/auth/reset" }
    );

    setResetSubmitting(false);

    if (resetErr) {
      setResetError(resetErr.message);
      return;
    }
    setResetSent(true);
  }

  function toggleMode() {
    setMode((prev) => (prev === "sign-in" ? "sign-up" : "sign-in"));
    setError(null);
    setInfoMessage(null);
  }

  function showForgotPassword() {
    setMode("forgot-password");
    setError(null);
    setInfoMessage(null);
    setResetError(null);
    setResetSent(false);
    setResetEmail(email);
  }

  function backToSignIn() {
    setMode("sign-in");
    setResetError(null);
    setResetSent(false);
  }

  if (mode === "forgot-password") {
    return (
      <main className="min-h-screen bg-dark px-4 py-10 font-sans text-cream sm:px-6">
        <div className="mx-auto max-w-sm">
          <h1 className="font-serif text-3xl font-semibold text-cream sm:text-4xl">
            Reset Password
          </h1>
          <p className="mt-2 text-sm text-cream/70">
            Enter your email and we&apos;ll send you a link to reset your
            password.
          </p>

          {resetSent ? (
            <p className="mt-8 text-sm text-green">
              Check your email — we sent you a password reset link.
            </p>
          ) : (
            <form onSubmit={handleResetSubmit} className="mt-8 space-y-5">
              <div>
                <label
                  htmlFor="reset-email"
                  className="font-serif text-lg text-bronze2"
                >
                  Email
                </label>
                <input
                  id="reset-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="mt-3 w-full rounded-lg border border-bronze/40 bg-transparent px-4 py-3 text-sm text-cream placeholder:text-cream/40 focus:border-bronze focus:outline-none"
                />
              </div>

              {resetError && <p className="text-sm text-red">{resetError}</p>}

              <button
                type="submit"
                disabled={resetSubmitting}
                className="w-full rounded-lg bg-bronze py-3 text-sm font-semibold text-dark transition-colors hover:bg-bronze2 disabled:opacity-50"
              >
                {resetSubmitting ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          )}

          <button
            type="button"
            onClick={backToSignIn}
            className="mt-6 text-sm text-bronze2 underline underline-offset-2"
          >
            Back to sign in
          </button>
        </div>
      </main>
    );
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
            {mode === "sign-in" && (
              <button
                type="button"
                onClick={showForgotPassword}
                className="mt-3 text-sm text-bronze2 underline underline-offset-2"
              >
                Forgot password?
              </button>
            )}
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

          {mode === "sign-up" && (
            <p className="text-center text-xs text-cream/50">
              By creating an account you agree to our{" "}
              <Link
                href="/privacy"
                className="text-bronze2 underline underline-offset-2 hover:text-cream"
              >
                Privacy Policy
              </Link>
              .
            </p>
          )}
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
