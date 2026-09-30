"use client";

import { useState } from "react";

// Footer newsletter signup - "the qoyl feed" (see components/Footer.tsx,
// rendered globally so this appears on every page including the new
// home page - PART 8 in the latest home redesign describes this exact
// section, so Footer.tsx was updated in place to match rather than
// building a separate home-only "NewsletterFooter" component that would
// have duplicated it). Posts to the Beehiiv-backed
// /api/newsletter/subscribe route. `source` tags which form submitted
// it, in case more than one ever exists.
export default function NewsletterSignup({ source = "footer" }: { source?: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your email"
          className="w-full min-w-0 flex-1 appearance-none rounded-none border border-dark bg-white px-[11px] py-[7px] text-dark placeholder:text-[#bbb] focus:outline-none"
          style={{ fontFamily: "var(--font-space-grotesk), 'Space Grotesk', sans-serif", fontSize: "16px" }}
        />
        <button
          type="submit"
          disabled={status === "submitting"}
          className="shrink-0 whitespace-nowrap bg-dark px-[14px] py-2 text-[11px] font-medium lowercase text-white disabled:opacity-50"
          style={{ fontFamily: "var(--font-space-grotesk), 'Space Grotesk', sans-serif" }}
        >
          {status === "done" ? "subscribed ✓" : status === "error" ? "try again" : "subscribe →"}
        </button>
      </form>
    </div>
  );
}
