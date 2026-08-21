"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Status = "checking" | "ready" | "invalid";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [status, setStatus] = useState<Status>("checking");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Supabase's client parses the recovery token out of the URL hash and
    // establishes a session automatically (detectSessionInUrl); we just
    // need to wait for that to land before trusting updateUser() will work.
    supabase.auth.getSession().then(({ data }) => {
      setStatus(data.session ? "ready" : "invalid");
    });
  }, []);

  useEffect(() => {
    if (!success) return;
    const timeoutId = setTimeout(() => {
      router.replace("/dashboard");
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [success, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });
    setSubmitting(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    setSuccess(true);
  }

  return (
    <main className="min-h-screen bg-dark px-4 py-10 font-sans text-cream sm:px-6">
      <div className="mx-auto max-w-sm">
        <h1 className="font-serif text-3xl font-semibold text-cream sm:text-4xl">
          Reset Password
        </h1>

        {status === "checking" && (
          <p className="mt-8 text-sm text-cream/50">Loading...</p>
        )}

        {status === "invalid" && (
          <div className="mt-8 space-y-4">
            <p className="text-sm text-red">
              This reset link is invalid or has expired.
            </p>
            <a
              href="/auth"
              className="inline-block text-sm text-bronze2 underline underline-offset-2"
            >
              Back to sign in
            </a>
          </div>
        )}

        {status === "ready" && (
          <>
            <p className="mt-2 text-sm text-cream/70">
              Choose a new password for your account.
            </p>

            {success ? (
              <p className="mt-8 text-sm text-green">
                Password updated - you&apos;re all set.
              </p>
            ) : (
              <form
                onSubmit={handleSubmit}
                noValidate
                className="mt-8 space-y-5"
              >
                <div>
                  <label
                    htmlFor="new-password"
                    className="font-serif text-lg text-bronze2"
                  >
                    New password
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="mt-3 w-full rounded-lg border border-bronze/40 bg-transparent px-4 py-3 text-sm text-cream placeholder:text-cream/40 focus:border-bronze focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="confirm-password"
                    className="font-serif text-lg text-bronze2"
                  >
                    Confirm new password
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="mt-3 w-full rounded-lg border border-bronze/40 bg-transparent px-4 py-3 text-sm text-cream placeholder:text-cream/40 focus:border-bronze focus:outline-none"
                  />
                </div>

                {error && <p className="text-sm text-red">{error}</p>}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-lg bg-bronze py-3 text-sm font-semibold text-dark transition-colors hover:bg-bronze2 disabled:opacity-50"
                >
                  {submitting ? "Updating..." : "Update Password"}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </main>
  );
}
