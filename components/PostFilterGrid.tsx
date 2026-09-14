"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import CommunityGrid from "@/components/CommunityGrid";
import PostCard, { Post } from "@/components/PostCard";
import { useAuth } from "@/lib/auth-context";
import { isAdultAgeAtLeast } from "@/lib/ageRange";
import { TABS, TabKey } from "@/lib/postTabs";

// Tabs that filter on a specific hair_type value - "coming soon" messaging
// (below) only applies to these, not to "all" or "ingredients".
const HAIR_TYPE_TABS = new Set<TabKey>([
  "straight",
  "wavy",
  "curly",
  "coily",
  "extensions",
  "mens",
  "baby",
]);

const DEFAULT_LIMIT = 9;

function matchesTab(post: Post, tab: TabKey): boolean {
  if (tab === "all") return true;
  if (tab === "ingredients") return post.category === "ingredient-evaluation";
  if (tab === "coily") return post.hair_type === "coily" || post.hair_type === "all";
  return post.hair_type === tab;
}

// Keyword surface for "does this post matter for aging-hair users" - no
// dedicated post category exists for this, so it's a simple free-text
// scan rather than a new schema field for what's meant to be a light
// feed-ordering nudge, not a hard filter.
const AGE_RELEVANT_KEYWORDS = [
  "thinning",
  "hormonal",
  "scalp health",
  "aging hair",
  "hair loss",
  "menopause",
];

function isAgeRelevantPost(post: Post): boolean {
  const haystack = `${post.title} ${post.excerpt} ${post.body ?? ""}`.toLowerCase();
  return AGE_RELEVANT_KEYWORDS.some((keyword) => haystack.includes(keyword));
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

export default function PostFilterGrid({
  posts,
  initialTab = "all",
  // null means no cap (the /posts library page); the home page preview
  // keeps the default 9.
  limit = DEFAULT_LIMIT,
  showSeeAllLinks = true,
}: {
  posts: Post[];
  initialTab?: TabKey;
  limit?: number | null;
  showSeeAllLinks?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [hasScrolledTabs, setHasScrolledTabs] = useState(false);
  const tabScrollRef = useRef<HTMLDivElement>(null);

  // Pre-select "Baby & Kids" for child/baby profiles - but only once, and
  // only if the caller didn't already ask for a specific tab (an explicit
  // initialTab, e.g. from /posts?type=, or a tab the user has since picked
  // themselves) is left alone. Multi-profile support (a single account
  // with more than one hair_profiles row) would need this to key off the
  // currently-selected profile rather than the one-per-user hairProfile
  // from useAuth() - this is where that branch would go.
  const { hairProfile } = useAuth();
  const hasAutoSelectedTab = useRef(false);

  useEffect(() => {
    // Wait for a real (non-null) profile rather than gating on
    // hairProfileLoading - that flag starts false before the auth check
    // even begins, so gating on it fired this effect (and permanently
    // marked it done) before the actual fetch ever completed. Signed-out
    // users / users with no saved profile never populate hairProfile, so
    // this simply never fires for them, which is correct.
    if (hasAutoSelectedTab.current || !hairProfile) return;
    hasAutoSelectedTab.current = true;

    if (
      activeTab === "all" &&
      (hairProfile.profile_for === "child" || hairProfile.profile_for === "baby")
    ) {
      setActiveTab("baby");
    }
  }, [hairProfile, activeTab]);

  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  const unorderedMatchingPosts = useMemo(
    () =>
      posts.filter(
        (post) =>
          matchesTab(post, activeTab) &&
          (!debouncedSearch || matchesSearch(post, debouncedSearch))
      ),
    [posts, activeTab, debouncedSearch]
  );

  // For signed-in users 36+ , surface the newest age-relevant post (see
  // AGE_RELEVANT_KEYWORDS) first in the "All" feed, labeled "For you" -
  // rather than creating dedicated posts, this just reorders what's
  // already there. Scoped to the unfiltered "All" tab with no active
  // search so it doesn't fight the user's own tab/search choice.
  const showAgeRelevantSection =
    activeTab === "all" &&
    !debouncedSearch &&
    isAdultAgeAtLeast(hairProfile?.adult_age_range ?? null, "36_45");

  const { matchingPosts, ageRelevantSlug } = useMemo(() => {
    if (!showAgeRelevantSection) {
      return { matchingPosts: unorderedMatchingPosts, ageRelevantSlug: null as string | null };
    }
    const idx = unorderedMatchingPosts.findIndex(isAgeRelevantPost);
    if (idx <= 0) {
      return {
        matchingPosts: unorderedMatchingPosts,
        ageRelevantSlug: idx === 0 ? unorderedMatchingPosts[0].slug : null,
      };
    }
    const target = unorderedMatchingPosts[idx];
    const reordered = [
      target,
      ...unorderedMatchingPosts.slice(0, idx),
      ...unorderedMatchingPosts.slice(idx + 1),
    ];
    return { matchingPosts: reordered, ageRelevantSlug: target.slug };
  }, [unorderedMatchingPosts, showAgeRelevantSection]);

  // posts is already ordered by published_at descending, so this keeps the
  // newest - overall for "All", or the newest matching the active tab
  // (aside from the age-relevant reorder above, when it applies).
  const filteredPosts =
    limit === null ? matchingPosts : matchingPosts.slice(0, limit);
  const showForYouLabel =
    ageRelevantSlug !== null && filteredPosts[0]?.slug === ageRelevantSlug;

  const activeTabLabel = TABS.find((tab) => tab.key === activeTab)?.label;
  const showComingSoon =
    !debouncedSearch &&
    HAIR_TYPE_TABS.has(activeTab) &&
    limit !== null &&
    filteredPosts.length > 0 &&
    filteredPosts.length < limit;

  const showSeeAllLink =
    showSeeAllLinks &&
    !debouncedSearch &&
    limit !== null &&
    ((activeTab === "all" && filteredPosts.length === limit) ||
      (activeTab !== "all" && filteredPosts.length > 0));

  return (
    <div>
      <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-bronze">
        The feed
      </p>

      {activeTab !== "community" && (
        <div className="relative mt-4">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
            <SearchIcon />
          </span>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search the feed - try 'glycerin' or 'porosity'"
            className="w-full border border-bronze/40 bg-white py-3 pl-10 pr-10 text-sm text-dark placeholder:text-dark/40 focus:border-bronze focus:outline-none"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-dark/40 transition-colors hover:text-dark"
            >
              ✕
            </button>
          )}
        </div>
      )}

      <div className="relative -mx-4 mt-4 px-4 sm:mx-0 sm:px-0">
        <div
          ref={tabScrollRef}
          onScroll={() => setHasScrolledTabs(true)}
          style={{
            WebkitOverflowScrolling: "touch",
            scrollSnapType: "x mandatory",
          }}
          className="no-scrollbar flex gap-5 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible"
        >
          {TABS.map((tab) => {
            const isActive = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                style={{ scrollSnapAlign: "start" }}
                className={`shrink-0 whitespace-nowrap border-b-2 px-0.5 pb-2 font-sans text-[10px] font-medium uppercase tracking-wide transition-colors ${
                  isActive
                    ? "border-bronze text-dark"
                    : "border-transparent text-bronze/70 hover:text-bronze"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex w-12 items-center justify-end bg-gradient-to-r from-transparent to-dark pb-1 sm:hidden">
          {!hasScrolledTabs && (
            <span className="tab-scroll-hint pr-1 text-xl leading-none text-bronze">
              ›
            </span>
          )}
        </div>
      </div>

      {activeTab === "community" ? (
        <CommunityGrid />
      ) : filteredPosts.length > 0 ? (
        <>
          {showForYouLabel && (
            <p className="mt-8 text-[9px] font-semibold uppercase tracking-[0.15em] text-bronze">
              For you
            </p>
          )}
          <div
            className={`-mx-4 grid grid-cols-2 gap-px bg-[#ffffff] sm:mx-0 sm:grid-cols-3 ${
              showForYouLabel ? "mt-3" : "mt-8"
            }`}
          >
            {filteredPosts.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
          {showComingSoon && (
            <p className="mt-6 text-sm text-dark/50">
              More {activeTabLabel} posts coming soon →
            </p>
          )}
          {showSeeAllLink && (
            <p className="mt-6 text-sm">
              <Link
                href={activeTab === "all" ? "/posts" : `/posts?type=${activeTab}`}
                className="text-bronze2 underline underline-offset-2 hover:text-dark"
              >
                {activeTab === "all"
                  ? "See all posts →"
                  : `See all ${activeTabLabel} posts →`}
              </Link>
            </p>
          )}
        </>
      ) : debouncedSearch ? (
        <p className="mt-8 text-sm text-dark/50">
          No posts found for &apos;{debouncedSearch}&apos; - try a different
          search or browse all posts above.
        </p>
      ) : (
        <p className="mt-8 text-sm text-dark/50">
          No posts yet for this hair type - check back soon. In the
          meantime,{" "}
          <Link
            href="/search"
            className="text-bronze2 underline underline-offset-2 hover:text-dark"
          >
            search a product →
          </Link>
        </p>
      )}
    </div>
  );
}
