"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PostCard, { Post } from "@/components/PostCard";

type TabKey =
  | "all"
  | "ingredients"
  | "straight"
  | "wavy"
  | "curly"
  | "coily"
  | "extensions";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "ingredients", label: "Ingredients" },
  { key: "straight", label: "Straight" },
  { key: "wavy", label: "Wavy" },
  { key: "curly", label: "Curly" },
  { key: "coily", label: "Coily" },
  { key: "extensions", label: "Extensions & Wigs" },
];

function matchesTab(post: Post, tab: TabKey): boolean {
  if (tab === "all") return true;
  if (tab === "ingredients") return post.category === "ingredient-evaluation";
  if (tab === "coily") return post.hair_type === "coily" || post.hair_type === "all";
  return post.hair_type === tab;
}

function matchesSearch(post: Post, term: string): boolean {
  const t = term.toLowerCase();
  return (
    post.title.toLowerCase().includes(t) ||
    post.excerpt.toLowerCase().includes(t) ||
    (post.body ?? "").toLowerCase().includes(t) ||
    (post.hair_type ?? "").toLowerCase().includes(t) ||
    post.category.toLowerCase().includes(t)
  );
}

function SearchIcon() {
  return (
    <svg
      className="h-4 w-4 text-bronze"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
      />
    </svg>
  );
}

export default function HomePostFilter({ posts }: { posts: Post[] }) {
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  const filteredPosts = useMemo(
    () =>
      posts.filter(
        (post) =>
          matchesTab(post, activeTab) &&
          (!debouncedSearch || matchesSearch(post, debouncedSearch))
      ),
    [posts, activeTab, debouncedSearch]
  );

  return (
    <div>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
          <SearchIcon />
        </span>
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search the feed — try 'glycerin' or 'porosity'"
          className="w-full rounded-lg border border-bronze/40 bg-dark py-3 pl-10 pr-10 text-sm text-cream placeholder:text-cream/40 focus:border-bronze focus:outline-none"
        />
        {searchInput && (
          <button
            type="button"
            onClick={() => setSearchInput("")}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-cream/40 transition-colors hover:text-cream"
          >
            ✕
          </button>
        )}
      </div>

      <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {TABS.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "border-bronze2 bg-dark text-cream"
                  : "border-bronze bg-transparent text-bronze hover:text-bronze2"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {filteredPosts.length > 0 ? (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPosts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      ) : debouncedSearch ? (
        <p className="mt-8 text-sm text-cream/50">
          No posts found for &apos;{debouncedSearch}&apos; — try a different
          search or browse all posts above.
        </p>
      ) : (
        <p className="mt-8 text-sm text-cream/50">
          No posts yet for this hair type — check back soon. In the
          meantime,{" "}
          <Link
            href="/search"
            className="text-bronze2 underline underline-offset-2 hover:text-cream"
          >
            search a product →
          </Link>
        </p>
      )}
    </div>
  );
}
