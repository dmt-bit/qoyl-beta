"use client";

import { useState } from "react";

// Footer newsletter signup - "the qoyl feed" (see components/Footer.tsx).
// The request said "Beehiiv embed or form" - no Beehiiv publication
// ID/API key exists in this project, so this is the plain-form path: a
// real newsletter_subscribers table + /api/newsletter/subscribe route,
// not a mailto stub. `source` just tags which form submitted it, in case
// more than one ever exists.
export default function NewsletterSignup({ source = "footer" }: { source?: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't subscribe right now.");
        setStatus("error");
        return;
      }
      setStatus("done");
    } catch {
      setError("Couldn't reach the server. Try again.");
      setStatus("error");
    }
  }

  if (status === "done") {
    return <p className="font-sans text-sm text-dark/70">You&apos;re in. Watch for the first issue.</p>;
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your email"
          className="w-full min-w-0 flex-1 border border-bronze/40 bg-transparent px-4 py-2.5 text-sm text-dark placeholder:text-dark/40 focus:border-bronze focus:outline-none"
        />
        <button
          type="submit"
          disabled={status === "submitting"}
          className="shrink-0 bg-dark px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-bronze2 disabled:opacity-50"
        >
          {status === "submitting" ? "subscribing..." : "subscribe"}
        </button>
      </form>
      {error && <p className="mt-1.5 text-xs text-red">{error}</p>}
    </div>
  );
}
