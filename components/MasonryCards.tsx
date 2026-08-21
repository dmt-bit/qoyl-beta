"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import type { Post } from "@/components/PostCard";

export type ScoredProduct = {
  id: string;
  name: string;
  brand: string;
  imageUrl: string | null;
};

export type CommunityPhoto = {
  id: string;
  url: string;
  caption: string | null;
  curlType: string | null;
  porosity: string | null;
};

export type StyleRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  hair_types_compatible: string[] | null;
};

export type FeedCard =
  | { feedId: string; type: "editorial"; post: Post }
  | { feedId: string; type: "product"; product: ScoredProduct }
  | { feedId: string; type: "community"; photo: CommunityPhoto }
  | { feedId: string; type: "style"; style: StyleRow };

// What the long-press action sheet needs to act on, regardless of which
// card type triggered it - keeps the sheet itself (and its save/share
// logic) in one place in MasonryFeed rather than duplicated per card.
export type SheetTarget = {
  cardType: FeedCard["type"];
  title: string;
  shareUrl: string;
  onSave: () => void | Promise<void>;
};

// ---- long-press + auth-gate tap detection ---------------------------------
//
// Registers a capture-phase click interceptor that handles two cases
// before the card's own bubble-phase click/nav handler (Next's <Link>
// attaches its client-side navigation the same way) ever sees the click:
//   1. The hold timer fired (long press) - stop the click outright so it
//      never also triggers a normal tap.
//   2. The tap is otherwise gated (signed out, or signed in with no hair
//      profile) - stop the click and open the auth gate sheet instead of
//      navigating. Long presses are NOT gated - only normal taps are, per
//      spec - so this check only runs once the long-press branch above
//      has ruled itself out.
// A pointer move cancels the hold timer, since a drag/scroll shouldn't be
// mistaken for a hold.
const LONG_PRESS_MS = 500;

export function useCardTap({
  onLongPress,
  gated,
  onGateTap,
}: {
  onLongPress: () => void;
  gated: boolean;
  onGateTap: () => void;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggeredRef = useRef(false);

  function clearTimer() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }

  return {
    // Anchors are natively draggable - a held press that the browser
    // interprets as the start of a drag gesture cancels the pending
    // pointerup/click sequence outright, which silently ate the long
    // press on external (target="_blank") product-card links during
    // testing. Disabling drag on these cards costs nothing (they're not
    // meant to be draggable) and makes the hold reliable everywhere.
    draggable: false,
    onDragStart: (e: React.DragEvent) => e.preventDefault(),
    onPointerDown: () => {
      triggeredRef.current = false;
      clearTimer();
      timerRef.current = setTimeout(() => {
        triggeredRef.current = true;
        onLongPress();
      }, LONG_PRESS_MS);
    },
    onPointerUp: clearTimer,
    onPointerLeave: clearTimer,
    onPointerCancel: clearTimer,
    onPointerMove: clearTimer,
    onClickCapture: (e: React.MouseEvent) => {
      if (triggeredRef.current) {
        e.preventDefault();
        e.stopPropagation();
        triggeredRef.current = false;
        return;
      }
      if (gated) {
        e.preventDefault();
        e.stopPropagation();
        onGateTap();
      }
    },
  };
}

// ---- icons ----------------------------------------------------------------

function HeartOutlineIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
      />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg className="h-5 w-5 text-dark" fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg className="h-6 w-6 text-bronze" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="5" y="10.5" width="14" height="9" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10.5V7a4 4 0 118 0v3.5" />
    </svg>
  );
}

// ---- shared card chrome -----------------------------------------------

const CARD_CLASS =
  "group relative block w-full overflow-hidden rounded-xl bg-[#1C1612] text-left";

function BottomTitleOverlay({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-t from-black/70 to-transparent" />
      <p className="absolute bottom-0 left-0 right-0 line-clamp-2 p-2.5 font-sans text-[12px] font-medium leading-tight text-cream">
        {children}
      </p>
    </>
  );
}

function TextPin({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-[#1C1612] to-[#2C2420] p-5 text-center">
      <p className="font-serif text-lg leading-snug text-cream">{title}</p>
      {subtitle && <p className="text-xs text-bronze2">{subtitle}</p>}
    </div>
  );
}

function HairTypeChip({ label }: { label: string }) {
  return (
    <span className="absolute right-1.5 top-1.5 rounded-full bg-[#1C1612]/80 px-2 py-1.5 text-[9px] font-medium uppercase tracking-wide text-cream">
      {label}
    </span>
  );
}

// ---- TYPE 1: editorial post cards -----------------------------------------

export function EditorialMasonryCard({
  post,
  onLongPress,
  gated,
  onGateTap,
}: {
  post: Post;
  onLongPress: (target: SheetTarget) => void;
  gated: boolean;
  onGateTap: () => void;
}) {
  const isVideo = post.content_type === "original-video";
  const isRepost = post.content_type === "repost";

  const longPress = useCardTap({
    onLongPress: () =>
      onLongPress({
        cardType: "editorial",
        title: post.title,
        shareUrl: `${window.location.origin}/posts/${post.slug}`,
        onSave: () => saveLocalBookmark("post", post.slug),
      }),
    gated,
    onGateTap,
  });

  return (
    <Link href={`/posts/${post.slug}`} className={CARD_CLASS} {...longPress}>
      {post.hero_image_url ? (
        <>
          {/* Plain <img>, not next/image - masonry needs the browser's
              natural intrinsic aspect ratio per image, and next/image
              requires a known width/height (or a sized ancestor for
              `fill`) that this feed doesn't have ahead of render. */}
          <img
            src={post.hero_image_url}
            alt={post.title}
            loading="lazy"
            className="block w-full h-auto"
          />
          <BottomTitleOverlay>{post.title}</BottomTitleOverlay>
        </>
      ) : (
        <TextPin title={post.title} />
      )}

      {(isVideo || isRepost) && (
        <span className="absolute left-1.5 top-1.5 rounded-full bg-bronze px-2 py-1 text-[9px] font-semibold text-dark">
          {isVideo ? "▶ Video" : "↗ Repost"}
        </span>
      )}
      {post.hair_type && <HairTypeChip label={post.hair_type} />}
      {isVideo && post.video_url && post.hero_image_url && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cream/90">
            <PlayIcon />
          </div>
        </div>
      )}
    </Link>
  );
}

// ---- TYPE 2: community hair photo cards -----------------------------------

export function CommunityMasonryCard({
  photo,
  onOpen,
  onLongPress,
  gated,
  onGateTap,
}: {
  photo: CommunityPhoto;
  onOpen: (photo: CommunityPhoto) => void;
  onLongPress: (target: SheetTarget) => void;
  gated: boolean;
  onGateTap: () => void;
}) {
  const longPress = useCardTap({
    onLongPress: () =>
      onLongPress({
        cardType: "community",
        title: "Community hair photo",
        shareUrl: photo.url,
        onSave: () => saveLocalBookmark("community", photo.id),
      }),
    gated,
    onGateTap,
  });

  return (
    <button type="button" onClick={() => onOpen(photo)} className={CARD_CLASS} {...longPress}>
      <img src={photo.url} alt="Community hair photo" loading="lazy" className="block w-full h-auto" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[35%] bg-gradient-to-t from-black/70 to-transparent" />
      <span
        role="button"
        aria-label="Save to inspo"
        onClick={(e) => {
          e.stopPropagation();
          saveLocalBookmark("community", photo.id);
        }}
        className="absolute right-1.5 top-1.5 text-bronze2 transition-transform hover:scale-110"
      >
        <HeartOutlineIcon />
      </span>
      <div className="absolute bottom-1.5 left-1.5 flex flex-wrap gap-1">
        {photo.curlType && (
          <span className="rounded-full bg-dark/80 px-2 py-1 text-[9px] font-medium uppercase tracking-wide text-bronze">
            {photo.curlType}
          </span>
        )}
        {photo.porosity && (
          <span className="rounded-full bg-dark/80 px-2 py-1 text-[9px] font-medium capitalize text-bronze2">
            {photo.porosity} porosity
          </span>
        )}
      </div>
    </button>
  );
}

// ---- TYPE 3: product spotlight cards --------------------------------------

export function ProductMasonryCard({
  product,
  affiliateLink,
  onLongPress,
  gated,
  onGateTap,
}: {
  product: ScoredProduct;
  affiliateLink: string;
  onLongPress: (target: SheetTarget) => void;
  gated: boolean;
  onGateTap: () => void;
}) {
  const isExternal = affiliateLink.startsWith("http");

  const longPress = useCardTap({
    onLongPress: () =>
      onLongPress({
        cardType: "product",
        title: product.name,
        shareUrl: affiliateLink,
        onSave: () => saveLocalBookmark("product", product.id),
      }),
    gated,
    onGateTap,
  });

  const body = (
    <>
      {product.imageUrl ? (
        <>
          <img src={product.imageUrl} alt={product.name} loading="lazy" className="block w-full h-auto" />
          <BottomTitleOverlay>
            {product.name} · {product.brand}
          </BottomTitleOverlay>
        </>
      ) : (
        <TextPin title={product.name} subtitle={product.brand} />
      )}
      <span className="absolute left-1.5 top-1.5 rounded-full bg-bronze px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-dark">
        Shop
      </span>
    </>
  );

  // No affiliate link resolved for this brand yet (see
  // lib/affiliateLinks.ts's curated fallback table) - rather than a dead
  // tap, route into the existing product search instead of leaving the
  // card unclickable.
  if (isExternal) {
    return (
      <a href={affiliateLink} target="_blank" rel="noopener noreferrer sponsored" className={CARD_CLASS} {...longPress}>
        {body}
      </a>
    );
  }
  return (
    <Link href={affiliateLink} className={CARD_CLASS} {...longPress}>
      {body}
    </Link>
  );
}

// ---- TYPE 4: Style Match inspo cards ---------------------------------------

export function StyleMasonryCard({
  style,
  onLongPress,
  onSaveStyle,
  gated,
  onGateTap,
}: {
  style: StyleRow;
  onLongPress: (target: SheetTarget) => void;
  onSaveStyle: (style: StyleRow) => void | Promise<void>;
  gated: boolean;
  onGateTap: () => void;
}) {
  const href = `/style-match?prefill=${encodeURIComponent(style.name)}`;

  const longPress = useCardTap({
    onLongPress: () =>
      onLongPress({
        cardType: "style",
        title: style.name,
        shareUrl: `${window.location.origin}${href}`,
        onSave: () => onSaveStyle(style),
      }),
    gated,
    onGateTap,
  });

  return (
    <Link href={href} className={CARD_CLASS} {...longPress}>
      <div className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#1C1612] to-[#2C2420] p-5 text-center">
        <p className="font-serif text-xl italic leading-snug text-cream">{style.name}</p>
        {style.description && (
          <p className="line-clamp-2 text-xs text-cream/60">{style.description}</p>
        )}
        <p className="mt-2 text-xs font-medium text-bronze2">Style Match this →</p>
      </div>
    </Link>
  );
}

// ---- long-press action sheet -----------------------------------------------

export function ActionSheet({
  target,
  onClose,
  showToast,
  onNotInterested,
}: {
  target: SheetTarget | null;
  onClose: () => void;
  showToast: (message: string) => void;
  // Owned by the caller (MasonryFeed), not this component - hideCardType()
  // alone only persists to localStorage; the caller also needs to update
  // its own hiddenTypes state so the change takes effect immediately
  // instead of only after a reload re-reads localStorage.
  onNotInterested: (cardType: FeedCard["type"]) => void;
}) {
  // A real long-press-then-release also dispatches a trailing synthetic
  // click at the same screen point once the sheet is open - without
  // this, that click lands on the backdrop below and immediately closes
  // the sheet it just opened. Ignoring backdrop clicks for a brief
  // window after mount absorbs that click-through.
  const openedAtRef = useRef(0);
  useEffect(() => {
    if (target) openedAtRef.current = Date.now();
  }, [target]);

  if (!target) return null;

  function handleBackdropClick() {
    if (Date.now() - openedAtRef.current < 350) return;
    onClose();
  }

  async function handleSave() {
    await target!.onSave();
    showToast("Saved to inspo");
    onClose();
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: target!.title, url: target!.shareUrl });
      } catch {
        // User cancelled the native share sheet - not an error.
      }
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(target!.shareUrl);
      showToast("Link copied");
    }
    onClose();
  }

  function handleNotInterested() {
    onNotInterested(target!.cardType);
    showToast("You'll see less of this");
    onClose();
  }

  // Portaled to document.body - the feed section's ancestor .fade-up-block
  // (see globals.css) runs a scroll-triggered CSS animation on `transform`,
  // which per spec makes it the containing block for any `position: fixed`
  // descendant. Left un-portaled, this sheet renders "fixed" relative to
  // that (large, scrolled) ancestor box instead of the real viewport -
  // visually broken/mispositioned rather than covering the screen.
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60" onClick={handleBackdropClick}>
      <div
        className="slide-up-sheet w-full max-w-md rounded-t-2xl bg-[#1C1612] pb-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-cream/20" />
        <div className="mt-2 divide-y divide-cream/10">
          <button
            type="button"
            onClick={handleSave}
            className="flex w-full items-center gap-3 px-5 py-4 text-sm text-cream"
          >
            <HeartOutlineIcon /> Save to inspo
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="flex w-full items-center gap-3 px-5 py-4 text-sm text-cream"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7.5 10.5L12 6m0 0l4.5 4.5M12 6v12"
              />
            </svg>
            Share
          </button>
          <button
            type="button"
            onClick={handleNotInterested}
            className="flex w-full items-center gap-3 px-5 py-4 text-sm text-cream/60"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Not interested
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-1 w-full py-3 text-center text-sm text-cream/50"
        >
          Cancel
        </button>
      </div>
    </div>,
    document.body
  );
}

// ---- content gate: bottom sheet shown when a signed-out user taps a card ---
//
// Swipe-down-to-dismiss: tracks the drag delta on the sheet itself and
// translates it live; releasing past the threshold closes the sheet,
// otherwise it snaps back. A tap outside the sheet (the backdrop) also
// dismisses it - unlike ActionSheet, there's no long-press-release race
// here (this sheet only ever opens from a single ordinary tap, never a
// held one), so no opened-at debounce is needed on the backdrop.

const SWIPE_DISMISS_THRESHOLD = 80;
const FEED_SCROLL_POS_KEY = "qoyl_feed_scroll_y";

// Both gates' CTAs navigate away to /profile or /auth - MasonryFeed
// fully unmounts on that route change and remounts fresh on the way
// back, which would otherwise drop the user at the top of the feed
// instead of back near the gate they just cleared.
function saveFeedScrollPosition() {
  sessionStorage.setItem(FEED_SCROLL_POS_KEY, String(window.scrollY));
}

export function consumeSavedFeedScrollPosition(): number | null {
  const raw = sessionStorage.getItem(FEED_SCROLL_POS_KEY);
  if (raw === null) return null;
  sessionStorage.removeItem(FEED_SCROLL_POS_KEY);
  const y = Number(raw);
  return Number.isFinite(y) ? y : null;
}

export function AuthGateSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dragStartY = useRef<number | null>(null);
  const [dragY, setDragY] = useState(0);

  useEffect(() => {
    if (open) setDragY(0);
  }, [open]);

  if (!open) return null;

  function handlePointerDown(e: React.PointerEvent) {
    dragStartY.current = e.clientY;
  }
  function handlePointerMove(e: React.PointerEvent) {
    if (dragStartY.current === null) return;
    const delta = e.clientY - dragStartY.current;
    if (delta > 0) setDragY(delta);
  }
  function endDrag() {
    if (dragY > SWIPE_DISMISS_THRESHOLD) {
      onClose();
    } else {
      setDragY(0);
    }
    dragStartY.current = null;
  }

  // Portaled to document.body for the same reason as ActionSheet above -
  // otherwise this "fixed" backdrop is positioned relative to the feed's
  // animated .fade-up-block ancestor instead of the real viewport.
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className={dragY === 0 ? "slide-up-sheet w-full max-w-md rounded-t-[20px] bg-[#1C1612] px-6 pb-8 pt-3" : "w-full max-w-md rounded-t-[20px] bg-[#1C1612] px-6 pb-8 pt-3"}
        style={{ transform: `translateY(${dragY}px)`, transition: dragY === 0 ? "transform 0.2s ease-out" : "none" }}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div className="mx-auto h-1 w-10 rounded-full bg-bronze" />
        <p className="mt-4 text-center font-serif text-lg text-cream">
          Q<span className="italic text-bronze2">oyl</span>
        </p>
        <h2 className="mt-4 text-center font-serif text-2xl text-cream">Join Qoyl to keep reading.</h2>
        <p className="mt-2 text-center font-sans text-[13px] leading-relaxed text-muted">
          Free forever. Build your hair profile and get personalized scores, style matches, and a
          feed tailored to your hair.
        </p>
        <Link
          href="/profile"
          onClick={saveFeedScrollPosition}
          className="mt-6 block w-full rounded-lg bg-bronze py-3 text-center text-sm font-semibold text-dark transition-colors hover:bg-bronze2"
        >
          Create my free profile →
        </Link>
        <Link
          href="/auth"
          onClick={saveFeedScrollPosition}
          className="mt-3 block w-full rounded-lg border border-bronze/40 py-3 text-center text-sm font-semibold text-cream transition-colors hover:border-bronze"
        >
          Sign in →
        </Link>
        <p className="mt-4 text-center text-xs text-cream/40">
          No credit card. No commitment. Just your hair.
        </p>
      </div>
    </div>,
    document.body
  );
}

// ---- scroll gate: full-width card inserted after 8 cards for a signed- ----
// out user, or a signed-in user with no hair profile yet.

export function ScrollGateCard({ needsProfileOnly }: { needsProfileOnly: boolean }) {
  return (
    <div className="mt-1 flex h-[280px] w-full flex-col items-center justify-center rounded-xl border border-bronze/30 bg-gradient-to-b from-[#1C1612] to-[#2C2420] px-6 text-center">
      <LockIcon />
      <h3 className="mt-3 font-serif text-[22px] leading-snug text-cream">
        {needsProfileOnly ? "One more step - tell us about your hair." : "Your feed is waiting."}
      </h3>
      {!needsProfileOnly && (
        <p className="mt-2 font-sans text-[12px] leading-relaxed text-muted">
          Create a free profile to unlock your full personalized feed - product scores, style
          inspo, and hair tips matched to your specific texture.
        </p>
      )}
      <Link
        href="/profile"
        onClick={saveFeedScrollPosition}
        className="mt-4 w-full max-w-xs rounded-lg bg-bronze py-3 text-sm font-semibold text-dark transition-colors hover:bg-bronze2"
      >
        {needsProfileOnly ? "Complete my profile →" : "Build my free profile →"}
      </Link>
      {!needsProfileOnly && (
        <Link
          href="/auth"
          onClick={saveFeedScrollPosition}
          className="mt-3 text-xs text-bronze2 underline underline-offset-2 hover:text-cream"
        >
          Already have an account? Sign in →
        </Link>
      )}
    </div>
  );
}

// ---- localStorage-backed "save" / "not interested" -------------------------
//
// No bookmarks table exists for posts/products (only saved_styles does,
// used for real style-card saves below) - see the SQL note in the PR/
// commit for why this stays client-only rather than adding one for what
// was scoped as a presentation-layer change.

const BOOKMARK_KEY = "qoyl_feed_saved";
const HIDDEN_TYPES_KEY = "qoyl_feed_hidden_types";

function readLocalSet(key: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(key);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function writeLocalSet(key: string, set: Set<string>) {
  localStorage.setItem(key, JSON.stringify(Array.from(set)));
}

export function saveLocalBookmark(kind: "post" | "product" | "community", id: string) {
  const set = readLocalSet(BOOKMARK_KEY);
  set.add(`${kind}:${id}`);
  writeLocalSet(BOOKMARK_KEY, set);
}

export function hideCardType(type: FeedCard["type"]) {
  const set = readLocalSet(HIDDEN_TYPES_KEY);
  set.add(type);
  writeLocalSet(HIDDEN_TYPES_KEY, set);
}

export function getHiddenCardTypes(): Set<string> {
  return readLocalSet(HIDDEN_TYPES_KEY);
}
