"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

// Curated subset for the homepage's quick-category row - not the full
// PRODUCT_CATEGORIES list (see lib/productCategories.ts), matching the
// request's own shorter list. "styling" isn't a real categories.slug on
// its own (styler/gel/mousse/curl-cream are separate categories there) -
// mapped to "styler", the closest single match.
const QUICK_CATEGORIES: { slug: string; label: string }[] = [
  { slug: "shampoo", label: "shampoo" },
  { slug: "conditioner", label: "conditioner" },
  { slug: "leave-in", label: "leave-in" },
  { slug: "curl-cream", label: "curl cream" },
  { slug: "oil", label: "oil" },
  { slug: "deep-conditioner", label: "deep conditioner" },
  { slug: "hair-mask", label: "hair mask" },
  { slug: "styler", label: "styling" },
];

type RecentSearch = { product_name: string; searched_at: string };

// The whole hero (search bar + quick categories + personalization) has
// to be a client component - it needs useAuth() for the logged-in
// greeting/quick-links and useRouter() to submit the search - but
// app/page.tsx around it stays a server component so the rest of the
// home page (stats, featured example, events) is still server-rendered
// for a fast, crawlable root URL.
export default function HomeHero() {
  const router = useRouter();
  const { user, hairProfile } = useAuth();
  const [query, setQuery] = useState("");
  const [recentSearch, setRecentSearch] = useState<RecentSearch | null>(null);

  useEffect(() => {
    if (!user) {
      setRecentSearch(null);
      return;
    }
    let cancelled = false;
    supabase
      .from("product_searches")
      .select("product_name, searched_at")
      .eq("user_id", user.id)
      .order("searched_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setRecentSearch(data ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search");
  }

  const firstName = hairProfile?.first_name?.trim() || null;

  return (
    <div className="mx-auto max-w-2xl px-4 pb-10 pt-12 text-center sm:px-6 sm:pt-16">
      {user ? (
        <>
          <h1 className="font-serif text-3xl font-semibold leading-tight text-dark sm:text-4xl">
            welcome back{firstName ? `, ${firstName}` : ""}.
          </h1>
          <p className="mt-2 font-sans text-base text-dark/70">what are you searching today?</p>
        </>
      ) : (
        <>
          <h1 className="font-serif text-3xl font-semibold leading-tight text-dark sm:text-4xl">
            does this product work
            <br />
            for your hair?
          </h1>
          <p className="mt-2 font-sans text-base text-dark/70">search any product. get a score.</p>
        </>
      )}

      <form onSubmit={handleSubmit} className="mt-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="search a product or brand..."
          className="w-full border border-bronze bg-white px-5 py-4 text-base text-dark placeholder:text-dark/40 focus:border-dark focus:outline-none"
        />
      </form>

      <div className="no-scrollbar mt-4 flex justify-center gap-2 overflow-x-auto pb-1">
        {QUICK_CATEGORIES.map((c) => (
          <Link
            key={c.slug}
            href={`/search?category=${c.slug}`}
            className="shrink-0 whitespace-nowrap rounded-full border border-bronze px-3 py-1.5 font-sans text-xs font-medium text-bronze transition-colors hover:bg-bronze/10"
          >
            {c.label}
          </Link>
        ))}
      </div>

      {user && (
        <div className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-1 font-mono text-[10px] text-muted">
          <Link href="/routine" className="hover:text-dark">
            your routine →
          </Link>
          {recentSearch && (
            <Link
              href={`/search?q=${encodeURIComponent(recentSearch.product_name)}`}
              className="hover:text-dark"
            >
              your last search →
            </Link>
          )}
          <Link href="/style-match" className="hover:text-dark">
            style match →
          </Link>
        </div>
      )}
    </div>
  );
}
