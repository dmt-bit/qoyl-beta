"use client";

import { useState } from "react";

export default function StylistRsvpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/stylist-rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, businessName, instagramHandle }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "something went wrong. please try again.");
        return;
      }

      setSuccess(true);
    } catch {
      setError("couldn't reach the server. please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <main className="min-h-screen bg-white px-4 py-16 font-sans text-dark sm:px-6">
        <div className="mx-auto max-w-md">
          <h1
            className="lowercase text-dark"
            style={{ fontWeight: 700, fontSize: "28px", letterSpacing: "-1px", marginBottom: "8px" }}
          >
            you&apos;re on the list
          </h1>
          <p className="font-light text-[#666]" style={{ fontSize: "14px" }}>
            we&apos;ll be in touch with details ahead of the event.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white px-4 py-16 font-sans text-dark sm:px-6">
      <div className="mx-auto max-w-md">
        <h1
          className="lowercase text-dark"
          style={{ fontWeight: 700, fontSize: "28px", letterSpacing: "-1px", marginBottom: "8px" }}
        >
          attend free as a stylist
        </h1>
        <p className="font-light text-[#666]" style={{ fontSize: "14px", marginBottom: "32px" }}>
          meet clients looking for your expertise. free for stylists.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="font-serif text-lg lowercase text-bronze2">
              name
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-3 w-full border border-bronze/40 bg-transparent px-4 py-3 text-sm text-dark placeholder:text-dark/40 focus:border-bronze focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="email" className="font-serif text-lg lowercase text-bronze2">
              email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-3 w-full border border-bronze/40 bg-transparent px-4 py-3 text-sm text-dark placeholder:text-dark/40 focus:border-bronze focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="business-name" className="font-serif text-lg lowercase text-bronze2">
              salon/business name (optional)
            </label>
            <input
              id="business-name"
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="mt-3 w-full border border-bronze/40 bg-transparent px-4 py-3 text-sm text-dark placeholder:text-dark/40 focus:border-bronze focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="instagram" className="font-serif text-lg lowercase text-bronze2">
              instagram handle (optional)
            </label>
            <input
              id="instagram"
              type="text"
              value={instagramHandle}
              onChange={(e) => setInstagramHandle(e.target.value)}
              placeholder="@yoursalon"
              className="mt-3 w-full border border-bronze/40 bg-transparent px-4 py-3 text-sm text-dark placeholder:text-dark/40 focus:border-bronze focus:outline-none"
            />
          </div>

          {error && <p className="text-sm text-red lowercase">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-bronze py-3 text-sm font-semibold lowercase text-cream transition-colors hover:bg-bronze2 disabled:opacity-50"
          >
            {submitting ? "saving..." : "save my spot"}
          </button>
        </form>
      </div>
    </main>
  );
}
