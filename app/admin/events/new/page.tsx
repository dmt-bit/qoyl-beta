"use client";

import { useEffect, useState } from "react";
import EventForm from "@/components/EventForm";

const INPUT_CLASS =
  "w-full rounded-lg border border-bronze/40 bg-transparent px-4 py-3 text-sm text-dark placeholder:text-dark/40 focus:border-bronze focus:outline-none";

export default function NewEventPage() {
  const [password, setPassword] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [checkingStoredAuth, setCheckingStoredAuth] = useState(true);

  async function verify(pw: string): Promise<boolean> {
    const res = await fetch("/api/admin/events", { headers: { "x-admin-password": pw } });
    return res.ok;
  }

  useEffect(() => {
    const stored = sessionStorage.getItem("admin_password");
    if (!stored) {
      setCheckingStoredAuth(false);
      return;
    }
    verify(stored).then((ok) => {
      if (ok) {
        setPassword(stored);
        setAuthorized(true);
      } else {
        sessionStorage.removeItem("admin_password");
      }
      setCheckingStoredAuth(false);
    });
  }, []);

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    const ok = await verify(password);
    if (ok) {
      sessionStorage.setItem("admin_password", password);
      setAuthorized(true);
    } else {
      setAuthError("Incorrect password.");
    }
  }

  if (checkingStoredAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white font-sans">
        <p className="text-sm text-dark/60">Loading...</p>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-4 font-sans text-dark">
        <form onSubmit={handleUnlock} className="w-full max-w-sm rounded-xl border border-bronze/30 p-6">
          <h1 className="font-serif text-2xl font-semibold text-dark">Admin access</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin password"
            required
            className={`mt-4 ${INPUT_CLASS}`}
          />
          {authError && <p className="mt-2 text-sm text-red">{authError}</p>}
          <button type="submit" className="mt-4 w-full bg-bronze py-3 text-sm font-semibold text-cream transition-colors hover:bg-bronze2">
            Unlock
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white px-4 py-10 font-sans text-dark sm:px-6">
      <EventForm password={password} />
    </main>
  );
}
