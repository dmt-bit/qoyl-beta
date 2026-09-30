"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Fixed bottom bar, above the bottom nav. bottom-[60px] - this app's real
// measured bottom nav height (see components/Nav.tsx's h-[60px] and the
// matching 60px reservation in app/globals.css), not the request's own
// 56px assumption. sm:bottom-0 on desktop, where there's no fixed bottom
// nav to stack above.
export default function HomeSearchStrip() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="fixed inset-x-0 bottom-[60px] z-[80] flex h-[54px] items-center gap-2 border-t border-dark bg-white px-[14px] py-[9px] sm:bottom-0"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="search a product or brand..."
        className="flex-1 appearance-none rounded-none border border-dark bg-white px-[11px] py-[7px] text-dark placeholder:text-[#bbb] focus:outline-none"
        style={{ fontFamily: "var(--font-space-grotesk), 'Space Grotesk', sans-serif", fontSize: "16px" }}
      />
      <button
        type="submit"
        className="shrink-0 whitespace-nowrap bg-dark px-[14px] py-2 text-[11px] font-medium lowercase text-white"
        style={{ fontFamily: "var(--font-space-grotesk), 'Space Grotesk', sans-serif" }}
      >
        search →
      </button>
    </form>
  );
}
