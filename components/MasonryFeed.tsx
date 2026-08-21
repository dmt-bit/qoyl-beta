"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Masonry from "react-masonry-css";
import { COMMUNITY_PREFILL_KEY } from "@/components/CommunityGrid";
import type { Post } from "@/components/PostCard";
import {
  ActionSheet,
  AuthGateSheet,
  ScrollGateCard,
  consumeSavedFeedScrollPosition,
  hideCardType,
  CommunityMasonryCard,
  EditorialMasonryCard,
  ProductMasonryCard,
  StyleMasonryCard,
  getHiddenCardTypes,
  saveLocalBookmark,
  type CommunityPhoto,
  type FeedCard,
  type ScoredProduct,
  type SheetTarget,
  type StyleRow,
} from "@/components/MasonryCards";
import { useAuth } from "@/lib/auth-context";
import { getAffiliateLink } from "@/lib/affiliateLinks";
import { buildScoringProfile, curlFamily, scoreCatalogProductsForProfile } from "@/lib/compatibility";
import { supabase } from "@/lib/supabase";

type TabKey =
  | "all"
  | "ingredients"
  | "straight"
  | "wavy"
  | "curly"
  | "coily"
  | "extensions"
  | "mens"
  | "baby"
  | "community"
  | "shop";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "ingredients", label: "Ingredients" },
  { key: "straight", label: "Straight" },
  { key: "wavy", label: "Wavy" },
  { key: "curly", label: "Curly" },
  { key: "coily", label: "Coily" },
  { key: "extensions", label: "Extensions" },
  { key: "mens", label: "Men's" },
  { key: "baby", label: "Baby" },
  { key: "community", label: "Community" },
  { key: "shop", label: "Shop" },
];

const HAIR_TYPE_TABS = new Set<TabKey>(["straight", "wavy", "curly", "coily"]);
const PAGE_SIZE = 12;
const BREAKPOINT_COLUMNS = { default: 2, 640: 2, 480: 2 };

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function matchesPostTab(post: Post, tab: TabKey): boolean {
  if (tab === "ingredients") return post.category === "ingredient-evaluation";
  if (tab === "coily") return post.hair_type === "coily" || post.hair_type === "all";
  return post.hair_type === tab;
}

function matchesPostSearch(post: Post, term: string): boolean {
  return (
    post.title.toLowerCase().includes(term) ||
    post.excerpt.toLowerCase().includes(term) ||
    (post.body ?? "").toLowerCase().includes(term) ||
    (post.hair_type ?? "").toLowerCase().includes(term) ||
    post.category.toLowerCase().includes(term)
  );
}

function matchesProductSearch(product: ScoredProduct, term: string): boolean {
  return product.name.toLowerCase().includes(term) || product.brand.toLowerCase().includes(term);
}

function matchesStyleSearch(style: StyleRow, term: string): boolean {
  return style.name.toLowerCase().includes(term) || (style.description ?? "").toLowerCase().includes(term);
}

// Builds the mixed feed for the active tab: interleaves product/community/
// style cards into the editorial post stream at fixed intervals (every 4th
// post gets a product, every 6th a community photo, every 8th a style
// card), or - for the two dedicated tabs - returns just that one card
// type as a browsable feed of its own. Cards whose type has been marked
// "not interested" (see MasonryCards.tsx's localStorage helpers) are
// dropped before interleaving, not just visually hidden.
function buildComposedFeed({
  posts,
  activeTab,
  search,
  products,
  communityPhotos,
  styles,
  hiddenTypes,
}: {
  posts: Post[];
  activeTab: TabKey;
  search: string;
  products: ScoredProduct[];
  communityPhotos: CommunityPhoto[];
  styles: StyleRow[];
  hiddenTypes: Set<string>;
}): FeedCard[] {
  const term = search.trim().toLowerCase();

  if (activeTab === "community") {
    if (hiddenTypes.has("community")) return [];
    // No searchable title/caption surfaced on these cards - a search
    // term simply empties this tab rather than pretending to match.
    if (term) return [];
    return communityPhotos.map((photo) => ({ feedId: `community-${photo.id}`, type: "community", photo }));
  }

  if (activeTab === "shop") {
    if (hiddenTypes.has("product")) return [];
    const list = term ? products.filter((p) => matchesProductSearch(p, term)) : products;
    return list.map((product) => ({ feedId: `product-${product.id}`, type: "product", product }));
  }

  let editorialPosts = hiddenTypes.has("editorial")
    ? []
    : activeTab === "all"
    ? posts
    : posts.filter((p) => matchesPostTab(p, activeTab));
  if (term) editorialPosts = editorialPosts.filter((p) => matchesPostSearch(p, term));

  let sideCommunity = hiddenTypes.has("community") ? [] : communityPhotos;
  if (HAIR_TYPE_TABS.has(activeTab)) {
    sideCommunity = sideCommunity.filter((p) => curlFamily(p.curlType) === activeTab);
  }
  if (term) sideCommunity = [];

  let sideProducts = hiddenTypes.has("product") ? [] : products;
  if (term) sideProducts = sideProducts.filter((p) => matchesProductSearch(p, term));

  let sideStyles = hiddenTypes.has("style") ? [] : styles;
  if (term) sideStyles = sideStyles.filter((s) => matchesStyleSearch(s, term));

  const productQueue = [...sideProducts];
  const communityQueue = [...sideCommunity];
  const styleQueue = [...sideStyles];

  const composed: FeedCard[] = [];
  let editorialCount = 0;

  for (const post of editorialPosts) {
    composed.push({ feedId: `post-${post.slug}`, type: "editorial", post });
    editorialCount += 1;

    if (editorialCount % 4 === 0 && productQueue.length > 0) {
      const product = productQueue.shift()!;
      composed.push({ feedId: `product-${product.id}`, type: "product", product });
    }
    if (editorialCount % 6 === 0 && communityQueue.length > 0) {
      const photo = communityQueue.shift()!;
      composed.push({ feedId: `community-${photo.id}`, type: "community", photo });
    }
    if (editorialCount % 8 === 0 && styleQueue.length > 0) {
      const style = styleQueue.shift()!;
      composed.push({ feedId: `style-${style.id}`, type: "style", style });
    }
  }

  return composed;
}

function SearchIcon() {
  return (
    <svg className="h-4 w-4 text-bronze" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

function LoadingDots() {
  return (
    <div className="flex justify-center gap-2 py-8">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 animate-bounce rounded-full bg-bronze"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}

// Cards visible before a signed-out (or profile-less) user hits the
// scroll gate - comfortably inside the first infinite-scroll page, so
// the gate never has to wait on a network round trip to appear.
const SCROLL_GATE_AFTER = 8;

export default function MasonryFeed({ posts }: { posts: Post[] }) {
  const { user, loading: authLoading, hairProfile, hairProfileLoading } = useAuth();
  const router = useRouter();

  // Mirrors the resolvingAccess pattern used on /style-match and
  // elsewhere: don't decide gating until we actually know whether
  // there's a session, and (if so) whether its hair profile has loaded -
  // otherwise a genuinely signed-in user flashes a gate for a frame on
  // every load.
  //
  // The two gates key off different conditions - #9 (tap gate) is
  // titled "login required," so it only fires for a genuinely signed-out
  // visitor; a signed-in user with no hair profile yet can still read
  // and tap around normally. #10 (scroll gate) explicitly covers both
  // signed-out AND signed-in-without-a-profile as its own case with
  // different copy, so it uses the broader "fully set up" check.
  const resolvingAuth = authLoading || (Boolean(user) && hairProfileLoading);
  const isSignedOut = !resolvingAuth && !user;
  const isFullyAuthed = Boolean(user) && Boolean(hairProfile);
  const needsScrollGate = !resolvingAuth && !isFullyAuthed;

  const [showAuthGateSheet, setShowAuthGateSheet] = useState(false);

  // Restores the scroll position saved when the user left for /profile or
  // /auth from a gate CTA, once they're back here and actually past the
  // gate - not on every mount, so a still-gated user (e.g. bounced back
  // without finishing sign-up) doesn't get scrolled past content they
  // can't see yet.
  useEffect(() => {
    if (resolvingAuth || !isFullyAuthed) return;
    const y = consumeSavedFeedScrollPosition();
    if (y !== null) {
      requestAnimationFrame(() => window.scrollTo(0, y));
    }
  }, [resolvingAuth, isFullyAuthed]);

  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [hasScrolledTabs, setHasScrolledTabs] = useState(false);
  const tabScrollRef = useRef<HTMLDivElement>(null);

  const [communityPhotos, setCommunityPhotos] = useState<CommunityPhoto[]>([]);
  const [scoredProducts, setScoredProducts] = useState<ScoredProduct[]>([]);
  const [styleRows, setStyleRows] = useState<StyleRow[]>([]);
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set());

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const [sheetTarget, setSheetTarget] = useState<SheetTarget | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [openPhoto, setOpenPhoto] = useState<CommunityPhoto | null>(null);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 2200);
  }

  useEffect(() => {
    setHiddenTypes(getHiddenCardTypes());
  }, []);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  // Community photos - most recent 20 public uploads, shuffled once per
  // load so the handful mixed into the main feed aren't always the same
  // few. The dedicated Community tab still shows the full fetched set.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/hair-photos/community?limit=20")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setCommunityPhotos(shuffle(data.photos ?? []));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Style inspo - the curated public library (not saved_styles, which
  // holds individual users' own uploaded match photos and isn't meant to
  // be shown to other users). Capped to 3 here per the "2-3 cards" spec.
  useEffect(() => {
    let cancelled = false;
    supabase
      .from("styles")
      .select("id, name, slug, description, hair_types_compatible")
      .then(({ data }) => {
        if (!cancelled) setStyleRows(shuffle((data as StyleRow[]) ?? []).slice(0, 3));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Product spotlights - a pool of verified catalog products, ranked by
  // compatibility score for the signed-in user's porosity (same scoring
  // engine as /search and travel kits). Signed-out or no saved profile
  // falls back to the most recently added verified products.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: candidates } = await supabase
        .from("catalog_products")
        .select("id, name, image_url, catalog_brands(name)")
        .eq("is_verified", true)
        .order("created_at", { ascending: false })
        .limit(24);

      if (cancelled || !candidates || candidates.length === 0) return;

      const base: ScoredProduct[] = candidates.map((c) => ({
        id: c.id as string,
        name: c.name as string,
        brand: (c.catalog_brands as unknown as { name: string } | null)?.name ?? "Unknown brand",
        imageUrl: (c.image_url as string | null) ?? null,
      }));

      if (!hairProfile) {
        if (!cancelled) setScoredProducts(base);
        return;
      }

      const profile = buildScoringProfile(hairProfile);
      const scores = await scoreCatalogProductsForProfile(
        candidates.map((c) => c.id as string),
        profile
      );
      const ranked = [...base].sort(
        (a, b) => (scores[b.id]?.result?.normalizedScore ?? -1) - (scores[a.id]?.result?.normalizedScore ?? -1)
      );
      if (!cancelled) setScoredProducts(ranked);
    })();
    return () => {
      cancelled = true;
    };
  }, [hairProfile]);

  const composedFeed = useMemo(
    () =>
      buildComposedFeed({
        posts,
        activeTab,
        search: debouncedSearch,
        // Only the top 4 feed the "every 4th post" interleave - the
        // Shop tab below still gets the full ranked list.
        products: activeTab === "shop" ? scoredProducts : scoredProducts.slice(0, 4),
        communityPhotos,
        styles: styleRows,
        hiddenTypes,
      }),
    [posts, activeTab, debouncedSearch, scoredProducts, communityPhotos, styleRows, hiddenTypes]
  );

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeTab, debouncedSearch]);

  // Once a gated user has scrolled past SCROLL_GATE_AFTER cards, the feed
  // stops revealing more entirely - capped right there regardless of
  // visibleCount/infinite scroll, with the gate card taking the place of
  // card #9 onward until they sign in (or, if signed in, finish their
  // hair profile).
  const showScrollGate = needsScrollGate && composedFeed.length > SCROLL_GATE_AFTER;
  const visibleCards = showScrollGate
    ? composedFeed.slice(0, SCROLL_GATE_AFTER)
    : composedFeed.slice(0, visibleCount);
  const hasMore = !showScrollGate && visibleCount < composedFeed.length;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setLoadingMore(true);
          setTimeout(() => {
            setVisibleCount((c) => c + PAGE_SIZE);
            setLoadingMore(false);
          }, 300);
        }
      },
      { rootMargin: "300px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore]);

  async function handleSaveStyle(style: StyleRow) {
    if (!user) {
      saveLocalBookmark("community", style.id); // signed out - local only, still gets a "Saved" toast
      return;
    }
    await supabase.from("saved_styles").insert({
      user_id: user.id,
      style_name: style.name,
    });
  }

  const [sendingCommunityMatch, setSendingCommunityMatch] = useState(false);

  // Mirrors CommunityGrid.tsx's own handler exactly - same sessionStorage
  // bridge (there's no File object for a community photo, it's downloaded
  // server-side as base64) and the same "?fromCommunity=1" flag that
  // app/style-match/page.tsx already reads on mount.
  async function handleStyleMatchThis(photo: CommunityPhoto) {
    setSendingCommunityMatch(true);
    try {
      const res = await fetch(`/api/hair-photos/community/${photo.id}/image`);
      if (!res.ok) return;
      const image = await res.json();
      sessionStorage.setItem(COMMUNITY_PREFILL_KEY, JSON.stringify(image));
      router.push("/style-match?fromCommunity=1");
    } finally {
      setSendingCommunityMatch(false);
    }
  }

  return (
    <div>
      <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-bronze">The feed</p>

      {/* Search - Pinterest-style pill, sits above the sticky tabs */}
      <div className="relative mt-4">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">
          <SearchIcon />
        </span>
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          placeholder="Search hair tips, styles, ingredients..."
          className={`h-10 w-full rounded-full bg-[#2C2420] pl-10 pr-4 font-sans text-sm text-cream placeholder:text-cream/40 focus:outline-none ${
            searchFocused ? "ring-1 ring-bronze" : ""
          }`}
        />
      </div>

      {/* Filter tabs - sticky under the nav (52px) while scrolling */}
      <div className="sticky top-[52px] z-20 -mx-4 mt-4 bg-dark px-4 py-2 sm:mx-0 sm:px-0">
        <div className="relative">
          <div
            ref={tabScrollRef}
            onScroll={() => setHasScrolledTabs(true)}
            className="no-scrollbar flex gap-1 overflow-x-auto"
          >
            {TABS.map((tab) => {
              const isActive = tab.key === activeTab;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1 font-sans text-[11px] font-medium uppercase tracking-[0.08em] transition-colors ${
                    isActive ? "bg-[#1C1612] text-cream" : "text-muted hover:text-bronze2"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex w-10 items-center justify-end bg-gradient-to-r from-transparent to-dark">
            {!hasScrolledTabs && <span className="tab-scroll-hint pr-1 text-lg leading-none text-bronze">›</span>}
          </div>
        </div>
      </div>

      {/* Grid */}
      {composedFeed.length > 0 ? (
        <div className="mt-4">
          <Masonry
            breakpointCols={BREAKPOINT_COLUMNS}
            className="flex w-auto gap-1"
            columnClassName="flex flex-col gap-1 bg-clip-padding"
          >
            {visibleCards.map((card) => {
              const onGateTap = () => setShowAuthGateSheet(true);
              if (card.type === "editorial") {
                return (
                  <EditorialMasonryCard
                    key={card.feedId}
                    post={card.post}
                    onLongPress={setSheetTarget}
                    gated={isSignedOut}
                    onGateTap={onGateTap}
                  />
                );
              }
              if (card.type === "community") {
                return (
                  <CommunityMasonryCard
                    key={card.feedId}
                    photo={card.photo}
                    onOpen={setOpenPhoto}
                    onLongPress={setSheetTarget}
                    gated={isSignedOut}
                    onGateTap={onGateTap}
                  />
                );
              }
              if (card.type === "product") {
                const link =
                  getAffiliateLink(card.product.name, card.product.brand) ??
                  `/search?q=${encodeURIComponent(card.product.name)}`;
                return (
                  <ProductMasonryCard
                    key={card.feedId}
                    product={card.product}
                    affiliateLink={link}
                    onLongPress={setSheetTarget}
                    gated={isSignedOut}
                    onGateTap={onGateTap}
                  />
                );
              }
              return (
                <StyleMasonryCard
                  key={card.feedId}
                  style={card.style}
                  onLongPress={setSheetTarget}
                  onSaveStyle={handleSaveStyle}
                  gated={isSignedOut}
                  onGateTap={onGateTap}
                />
              );
            })}
          </Masonry>

          {showScrollGate ? (
            <ScrollGateCard needsProfileOnly={Boolean(user) && !hairProfile} />
          ) : (
            <>
              <div ref={sentinelRef} />
              {loadingMore && <LoadingDots />}
            </>
          )}
        </div>
      ) : debouncedSearch ? (
        <p className="mt-8 text-sm text-cream/50">
          No results for &apos;{debouncedSearch}&apos; - try a different search or browse a tab above.
        </p>
      ) : activeTab === "community" ? (
        <p className="mt-8 text-sm text-cream/50">
          Be the first to share your hair journey. Add public photos on your profile page →
        </p>
      ) : (
        <p className="mt-8 text-sm text-cream/50">No posts yet for this tab - check back soon.</p>
      )}

      <ActionSheet
        target={sheetTarget}
        onClose={() => setSheetTarget(null)}
        showToast={showToast}
        onNotInterested={(cardType) => {
          hideCardType(cardType);
          setHiddenTypes((prev) => new Set(prev).add(cardType));
        }}
      />

      <AuthGateSheet open={showAuthGateSheet} onClose={() => setShowAuthGateSheet(false)} />

      {/* Community photo full-screen modal + toast - portaled to
          document.body for the same reason as the sheets in
          MasonryCards.tsx: the feed's .fade-up-block ancestor runs a
          transform-based CSS animation, which makes it the containing
          block for any un-portaled `position: fixed` descendant instead
          of the real viewport. */}
      {typeof document !== "undefined" &&
        createPortal(
          <>
            {openPhoto && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
                onClick={() => setOpenPhoto(null)}
              >
                <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
                  <div className="relative h-[360px] w-full overflow-hidden rounded-xl bg-[#1C1612]">
                    <Image src={openPhoto.url} alt="Community hair photo" fill className="object-cover" />
                  </div>
                  {openPhoto.caption && <p className="mt-3 text-sm text-cream/80">{openPhoto.caption}</p>}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {openPhoto.curlType && (
                      <span className="rounded-full border border-bronze/40 px-2 py-0.5 text-[10px] uppercase tracking-wide text-bronze2">
                        {openPhoto.curlType}
                      </span>
                    )}
                    {openPhoto.porosity && (
                      <span className="rounded-full border border-bronze/40 px-2 py-0.5 text-[10px] capitalize text-bronze2">
                        {openPhoto.porosity} porosity
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleStyleMatchThis(openPhoto)}
                    disabled={sendingCommunityMatch}
                    className="mt-4 w-full rounded-lg bg-bronze py-3 text-sm font-semibold text-dark transition-colors hover:bg-bronze2 disabled:opacity-50"
                  >
                    {sendingCommunityMatch ? "Loading..." : "Style Match this →"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpenPhoto(null)}
                    className="mt-2 w-full text-center text-xs text-cream/50 underline"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {toast && (
              <div className="fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-[#1C1612] px-4 py-2 text-xs text-cream shadow-lg">
                {toast}
              </div>
            )}
          </>,
          document.body
        )}
    </div>
  );
}
