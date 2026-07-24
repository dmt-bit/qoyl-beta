"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import PostCard, { Post } from "@/components/PostCard";

type TabKey = "all" | "ingredients" | "straight" | "wavy" | "curly" | "coily";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "ingredients", label: "Ingredients" },
  { key: "straight", label: "Straight" },
  { key: "wavy", label: "Wavy" },
  { key: "curly", label: "Curly" },
  { key: "coily", label: "Coily" },
];

function matchesTab(post: Post, tab: TabKey): boolean {
  if (tab === "all") return true;
  if (tab === "ingredients") return post.category === "ingredient-evaluation";
  if (tab === "coily") return post.hair_type === "coily" || post.hair_type === "all";
  return post.hair_type === tab;
}

export default function HomePostFilter({ posts }: { posts: Post[] }) {
  const [activeTab, setActiveTab] = useState<TabKey>("all");

  const filteredPosts = useMemo(
    () => posts.filter((post) => matchesTab(post, activeTab)),
    [posts, activeTab]
  );

  return (
    <div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
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
