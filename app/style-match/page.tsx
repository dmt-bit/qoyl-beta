"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { COMMUNITY_PREFILL_KEY } from "@/components/CommunityGrid";
import TryOnModal from "@/components/TryOnModal";
import PostCard, { Post } from "@/components/PostCard";
import ShopButton from "@/components/ShopButton";
import BrandLogo from "@/components/BrandLogo";
import StylistRecommendationBlock from "@/components/StylistRecommendationBlock";
import { useAuth } from "@/lib/auth-context";
import { TIER_CLASSES, curlFamily, scoreTier, type CurlFamily } from "@/lib/compatibility";
import {
  StyleShoppingList,
  buildStyleShoppingList,
} from "@/lib/styleShoppingList";
import { supabase } from "@/lib/supabase";
import { logMlEvent } from "@/lib/mlEvents";
import { lookupCityState } from "@/lib/zipLookup";
import {
  type DeepMatchHairAdditionPreference,
  type HairAdditionPreference,
} from "@/lib/hairAdditionPreference";
import type { StyleTranslation } from "@/lib/styleTranslations";
import { installOptionsFor, installTypeLabel, type InstallType } from "@/lib/installTypes";
import {
  resolveRequiresFakeHair,
  tutorialSearchFallbackUrl,
  tutorialSearchQuery,
} from "@/lib/installTypeContent";
import type { CartItem } from "@/lib/styleCart";
import { storeCart } from "@/lib/storeCart";
import CompleteYourLookCart from "@/components/CompleteYourLookCart";
import VisualBrowseStrip, { BrowseImageModal } from "@/components/VisualBrowseStrip";

type BangLength = "above-eyebrow" | "at-eyebrow" | "below-eyebrow" | "cheekbone-length";
type ApproximateLength = "twa" | "short" | "medium" | "long" | "waist" | "hip";
type LocType = "starter" | "traditional" | "sisterlocks" | "faux" | "butterfly" | "boho";
type BraidType =
  | "box"
  | "knotless"
  | "cornrow"
  | "goddess"
  | "tribal"
  | "micro"
  | "senegalese-twist"
  | "passion-twist"
  | "marley-twist"
  | "spring-twist";

type DetectedStyle = {
  style_name: string;
  style_description: string;
  // Absent on an older cached style_matches.detected_details row (from
  // before this field existed) - treated as "high" wherever read below,
  // same as a fresh high-confidence result, so old matches don't
  // suddenly show a disambiguation prompt they never went through.
  confidence?: "high" | "medium" | "low";
  confidence_reason?: string | null;
  alternative_style?: string | null;
  hair_length: string;
  approximate_length?: ApproximateLength | null;
  bang_length?: BangLength | null;
  style_is_cut?: boolean;
  has_color_treatment?: boolean;
  color_type?: string | null;
  loc_type?: LocType | null;
  braid_type?: BraidType | null;
  is_protective_style?: boolean;
  requires_fake_hair: boolean;
  fake_hair_type: string | null;
  accessories_visible: string[];
  estimated_time: string;
  difficulty: string;
  compatible_hair_types: string[];
  maintenance_tips?: string;
  face_shape?: "oval" | "round" | "square" | "heart" | "diamond" | "oblong" | "unknown" | null;
  natural_hair_color?: string | null;
  detected_color?: string | null;
  hair_type_translation?: string | null;
  image_url?: string | null;
  current_to_desired_translation?: string | null;
  length_gap?: string | null;
  prep_needed?: string[];
};

type YouTubeVideo = {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
};

type StructuredService = {
  name: string;
  price_min: number | null;
  price_max: number | null;
  duration_min: number | null;
  duration_max: number | null;
  deposit_required: boolean;
  deposit_amount: number | null;
  hair_addition_types?: string[];
  notes: string | null;
};

type Stylist = {
  id: string;
  displayName: string;
  salonName: string | null;
  photoUrl: string | null;
  bookingUrl: string | null;
  matchedService: StructuredService | null;
  hasAnyServices: boolean;
  otherServiceNames: string[];
};

type MarketEstimate = {
  styleName: string;
  priceMin: number;
  priceMax: number;
  durationMin: number;
  durationMax: number;
  priceNotes: string | null;
  factors: string[];
};

type StyleRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  hair_types_compatible: string[] | null;
  requires_fake_hair: boolean;
  estimated_time: string | null;
  difficulty: string | null;
  image_url?: string | null;
  // Install method(s) this style is actually done with (item 1/4) - null on
  // a style that hasn't been backfilled yet, or one with no fixed method.
  install_types?: string[] | null;
  // Soft ranking signal (see visibleInspoStyles) - empty/missing = universal.
  face_shapes_flattering?: string[] | null;
  // Resolved once in loadInspoStyles() for any row with no image_url -
  // never re-fetched per render (see lib/visualLibrary.ts).
  fallback_image_url?: string | null;
};

type LengthDifference = "same" | "longer" | "shorter";
type InvolvesExtensions = "none" | "braiding_hair" | "sew_in" | "wig" | "not_sure";

type PageState =
  | "landing"
  | "inspo"
  | "deepSurvey"
  | "analyzing"
  | "disambiguate"
  | "braidDisambiguate"
  | "cutRouting"
  | "locWarning"
  | "confirm"
  | "installType"
  | "results";
type ResultTab = "tutorials" | "color" | "shopping" | "stylist";

// Vibe tags for the inspo browse filters. The `styles` table has no
// vibe column - this is editorial curation keyed by slug, not a
// derived/algorithmic attribute, so it's kept as a small local map
// rather than pretending it's a real database filter. Falls back to no
// tags (only ever shown under "all") for any style not in this list,
// e.g. ones added to the table later.
const VIBE_OPTIONS = [
  "all",
  "protective",
  "defined",
  "sleek",
  "voluminous",
  "low maintenance",
  "bold",
  "natural texture",
];

const VIBE_TAGS_BY_SLUG: Record<string, string[]> = {
  // protective
  "box-braids": ["protective", "low maintenance"],
  "knotless-braids": ["protective", "low maintenance"],
  "faux-locs": ["protective", "low maintenance"],
  "passion-twists": ["protective", "low maintenance"],
  crochet: ["protective", "low maintenance"],
  cornrows: ["protective", "bold"],
  wigs: ["protective", "low maintenance"],
  // defined
  "wash-and-go": ["defined", "natural texture"],
  "diffused-waves": ["defined", "natural texture"],
  "twist-out": ["defined", "natural texture"],
  "braid-out": ["defined", "natural texture"],
  "flexi-rod-set": ["defined"],
  "flat-twist-out": ["defined"],
  "bantu-knots": ["defined", "bold"],
  // sleek
  "silk-press": ["sleek"],
  blowout: ["sleek", "voluminous"],
  "textured-blowout": ["sleek", "voluminous"],
  "sleek-straight": ["sleek"],
  "sleek-bun": ["sleek"],
  "sleek-ponytail": ["sleek", "low maintenance"],
  // voluminous
  "beach-waves": ["voluminous", "natural texture"],
  "half-up-wavy": ["voluminous", "natural texture"],
  "high-puff": ["voluminous", "low maintenance", "natural texture"],
  "curtain-bangs": ["voluminous"],
  // bold
  "goddess-braids": ["bold", "protective"],
  // low maintenance / natural texture
  "pineapple-updo": ["low maintenance", "natural texture"],
  locs: ["low maintenance"],
  twa: ["natural texture", "low maintenance"],
};

// Four curl-type families driving the inspo tabs (item 1-3) - reuses
// lib/compatibility.ts's curlFamily() (already imported for scoring
// elsewhere on this page) rather than a second code->family mapping.
const FAMILY_CODES: Record<CurlFamily, string[]> = {
  straight: ["1a", "1b", "1c"],
  wavy: ["2a", "2b", "2c"],
  curly: ["3a", "3b", "3c"],
  coily: ["4a", "4b", "4c"],
};

const FAMILY_TAB_LABEL: Record<CurlFamily, string> = {
  straight: "type 1",
  wavy: "type 2",
  curly: "type 3",
  coily: "type 4",
};

const FAMILY_SUBTITLE: Record<CurlFamily, string> = {
  straight: "straight — 1a · 1b · 1c",
  wavy: "wavy — 2a · 2b · 2c",
  curly: "curly — 3a · 3b · 3c",
  coily: "coily — 4a · 4b · 4c",
};

const FAMILY_ORDER: CurlFamily[] = ["straight", "wavy", "curly", "coily"];

// Matches supabase/create_style_match.sql's seeded rows exactly, so the
// browse experience is identical whether or not the styles table has
// data - this is only the true fallback if that table is ever emptied.
const STATIC_STYLES: StyleRow[] = [
  // --- type 1 (straight) ---
  { id: "static-sleek-straight", name: "Sleek Straight", slug: "sleek-straight", description: "Polished, smooth straight hair with shine.", hair_types_compatible: ["1a", "1b", "1c", "2a"], requires_fake_hair: false, estimated_time: "30-60 minutes", difficulty: "beginner" },
  { id: "static-blowout", name: "Blowout", slug: "blowout", description: "Voluminous, smooth blowout finish.", hair_types_compatible: ["1a", "1b", "1c", "2a", "2b", "3a", "3b", "3c", "4a", "4b", "4c"], requires_fake_hair: false, estimated_time: "30-60 minutes", difficulty: "beginner" },
  { id: "static-curtain-bangs", name: "Curtain Bangs", slug: "curtain-bangs", description: "Soft, face-framing bangs parted in the center.", hair_types_compatible: ["1a", "1b", "1c", "2a", "2b"], requires_fake_hair: false, estimated_time: "15-30 minutes", difficulty: "beginner" },
  { id: "static-sleek-ponytail", name: "Sleek Ponytail", slug: "sleek-ponytail", description: "Smooth, high or low ponytail pulled tight.", hair_types_compatible: ["1a", "1b", "1c", "2a", "2b", "2c", "3a"], requires_fake_hair: false, estimated_time: "10-20 minutes", difficulty: "beginner" },
  { id: "static-beachy-blowout", name: "Textured Blowout", slug: "textured-blowout", description: "Lived-in blowout with movement and body.", hair_types_compatible: ["1b", "1c", "2a", "2b"], requires_fake_hair: false, estimated_time: "30-45 minutes", difficulty: "beginner" },
  // --- type 2 (wavy) ---
  { id: "static-beach-waves", name: "Beach Waves", slug: "beach-waves", description: "Effortless, tousled waves with a sun-dried feel.", hair_types_compatible: ["2a", "2b", "2c", "1c"], requires_fake_hair: false, estimated_time: "20-45 minutes", difficulty: "beginner" },
  { id: "static-wash-and-go", name: "Wash and Go", slug: "wash-and-go", description: "Low-manipulation style that enhances natural curl pattern.", hair_types_compatible: ["2b", "2c", "3a", "3b", "3c", "4a"], requires_fake_hair: false, estimated_time: "30-60 minutes", difficulty: "beginner" },
  { id: "static-diffused-waves", name: "Diffused Waves", slug: "diffused-waves", description: "Defined, frizz-free waves using a diffuser attachment.", hair_types_compatible: ["2a", "2b", "2c", "3a"], requires_fake_hair: false, estimated_time: "20-40 minutes", difficulty: "beginner" },
  { id: "static-half-up-wavy", name: "Half-Up Style", slug: "half-up-wavy", description: "Top section pulled back while waves fall free.", hair_types_compatible: ["2a", "2b", "2c", "3a", "3b"], requires_fake_hair: false, estimated_time: "10-15 minutes", difficulty: "beginner" },
  // --- type 3 (curly) ---
  { id: "static-twist-out", name: "Twist Out", slug: "twist-out", description: "Defined curls from unraveled two-strand twists.", hair_types_compatible: ["3a", "3b", "3c", "4a", "4b", "4c"], requires_fake_hair: false, estimated_time: "2-4 hours", difficulty: "beginner" },
  { id: "static-braid-out", name: "Braid Out", slug: "braid-out", description: "Stretched, defined waves from unraveled braids.", hair_types_compatible: ["3a", "3b", "3c", "4a", "4b", "4c"], requires_fake_hair: false, estimated_time: "2-4 hours", difficulty: "beginner" },
  { id: "static-box-braids", name: "Box Braids", slug: "box-braids", description: "Classic three-strand protective braided style.", hair_types_compatible: ["3c", "4a", "4b", "4c"], requires_fake_hair: true, estimated_time: "4-8 hours", difficulty: "intermediate" },
  { id: "static-knotless-braids", name: "Knotless Braids", slug: "knotless-braids", description: "Lightweight braids without the tension of a knot base.", hair_types_compatible: ["3c", "4a", "4b", "4c"], requires_fake_hair: true, estimated_time: "5-9 hours", difficulty: "intermediate" },
  { id: "static-silk-press", name: "Silk Press", slug: "silk-press", description: "Heat-straightened natural hair with a silky finish.", hair_types_compatible: ["3a", "3b", "3c", "4a", "4b", "4c"], requires_fake_hair: false, estimated_time: "1-3 hours", difficulty: "intermediate" },
  { id: "static-high-puff", name: "High Puff", slug: "high-puff", description: "Sleek gathered puff sitting at the crown.", hair_types_compatible: ["3b", "3c", "4a", "4b", "4c"], requires_fake_hair: false, estimated_time: "15-30 minutes", difficulty: "beginner" },
  // --- type 4 (coily) ---
  { id: "static-bantu-knots", name: "Bantu Knots", slug: "bantu-knots", description: "Coiled knots worn as-is or unraveled for curls.", hair_types_compatible: ["3c", "4a", "4b", "4c"], requires_fake_hair: false, estimated_time: "1-2 hours", difficulty: "beginner" },
  { id: "static-faux-locs", name: "Faux Locs", slug: "faux-locs", description: "Temporary locs wrapped over natural hair.", hair_types_compatible: ["3c", "4a", "4b", "4c"], requires_fake_hair: true, estimated_time: "6-10 hours", difficulty: "advanced" },
  { id: "static-passion-twists", name: "Passion Twists", slug: "passion-twists", description: "Bohemian-textured spring curls in a protective twist.", hair_types_compatible: ["3c", "4a", "4b", "4c"], requires_fake_hair: true, estimated_time: "4-7 hours", difficulty: "intermediate" },
  { id: "static-goddess-braids", name: "Goddess Braids", slug: "goddess-braids", description: "Thick, raised cornrow-style braids with a regal look.", hair_types_compatible: ["3c", "4a", "4b", "4c"], requires_fake_hair: true, estimated_time: "2-4 hours", difficulty: "intermediate" },
  { id: "static-locs", name: "Locs", slug: "locs", description: "Permanent coiled rope-like strands over time.", hair_types_compatible: ["4a", "4b", "4c"], requires_fake_hair: false, estimated_time: "Months to years", difficulty: "advanced" },
  { id: "static-twa", name: "TWA", slug: "twa", description: "Teeny weeny afro — close-cropped natural style.", hair_types_compatible: ["4a", "4b", "4c"], requires_fake_hair: false, estimated_time: "15-30 minutes", difficulty: "beginner" },
];

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      className={`h-6 w-6 transition-colors ${filled ? "text-bronze" : "text-dark/50"}`}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
      />
    </svg>
  );
}

// Bang-length visual check on the confirm screen (item 3) - a face
// outline with a horizontal line at the detected position, so the user
// can confirm at a glance rather than parsing the "above-eyebrow"/
// "at-eyebrow" label alone. Positions are illustrative, not to scale.
// Bang style names that should show the bang-length note.
// Only pure bang styles qualify -- compound names like "X with Blunt Bangs"
// are excluded because bang_length on those is almost always a hallucination.
const BANG_STYLE_SLUGS = new Set([
  "baby bangs", "micro bangs", "curtain bangs", "blunt bangs",
  "side swept bangs", "wispy bangs", "side-swept bangs",
  "baby-bangs", "micro-bangs", "curtain-bangs", "blunt-bangs",
  "side-swept-bangs", "wispy-bangs",
]);
function isBangStyle(styleName: string | undefined | null): boolean {
  if (!styleName) return false;
  return BANG_STYLE_SLUGS.has(styleName.toLowerCase().trim());
}

const BANG_LENGTH_Y: Record<BangLength, number> = {
  "above-eyebrow": 50,
  "at-eyebrow": 68,
  "below-eyebrow": 86,
  "cheekbone-length": 108,
};
const BANG_LENGTH_LABEL: Record<BangLength, string> = {
  "above-eyebrow": "above",
  "at-eyebrow": "at",
  "below-eyebrow": "below",
  "cheekbone-length": "well below",
};
const EYEBROW_Y = 68;

function BangLengthDiagram({ bangLength }: { bangLength: BangLength }) {
  return (
    <svg width="72" height="150" viewBox="0 0 72 150" fill="none" aria-hidden>
      <ellipse cx="36" cy="80" rx="26" ry="40" stroke="#0a0a0a" strokeWidth="1.5" />
      <line x1="12" y1={EYEBROW_Y} x2="60" y2={EYEBROW_Y} stroke="#bbb" strokeWidth="1" strokeDasharray="2 2" />
      <line x1="10" y1={BANG_LENGTH_Y[bangLength]} x2="62" y2={BANG_LENGTH_Y[bangLength]} stroke="#0a0a0a" strokeWidth="2.5" />
    </svg>
  );
}

function AnalyzingOverlay() {
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-white/95 font-sans">
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-3 w-3 animate-bounce rounded-full bg-bronze" style={{ animationDelay: `${i * 150}ms` }} />
        ))}
      </div>
      <p className="mt-6 font-serif text-xl text-dark">Identifying your style...</p>
      <p className="mt-2 text-sm text-dark/60">This takes about 5 seconds</p>
    </div>
  );
}

function Toast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-6 left-1/2 z-[210] -translate-x-1/2 rounded-full bg-bronze px-4 py-2 text-sm font-semibold text-cream shadow-lg">
      {message}
    </div>
  );
}

// Full-width bronze-bordered card above the results tabs (item 5),
// consolidating the "Share with your stylist" flow (items 1 and 3) into
// one place: opening the public summary page, and the three sharing
// mechanisms for it. compact renders a smaller version for re-use at
// the top of the Book a Stylist tab (item 1's second placement).
function ShareWithStylistCard({
  matchId,
  onShowToast,
  compact = false,
}: {
  matchId: string | null;
  onShowToast: (message: string) => void;
  compact?: boolean;
}) {
  if (!matchId) return null;
  const summaryUrl = typeof window !== "undefined" ? `${window.location.origin}/style-match/summary/${matchId}` : "";

  function openSummary() {
    window.open(`/style-match/summary/${matchId}`, "_blank", "noopener,noreferrer");
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(summaryUrl);
      onShowToast("Copied!");
    } catch {
      onShowToast("Couldn't copy - long-press the link instead");
    }
  }

  function handleDownloadPdf() {
    // Opens the print-optimized public summary with ?autoprint=1, which
    // tells the summary page to call window.print() automatically once
    // the content has loaded. This is more reliable than attaching a
    // "load" listener to the opened window from here, which browsers
    // block in several cross-origin and popup contexts.
    window.open(`/style-match/summary/${matchId}?autoprint=1`, "_blank", "noopener,noreferrer");
  }

  async function handleShareText() {
    const text = `Here is my style reference for our appointment: ${summaryUrl}`;
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch {
        // User cancelled the share sheet - not an error.
      }
    } else {
      await handleCopyLink();
    }
  }

  return (
    <div className={`rounded-xl border border-bronze/40 bg-bronze/5 ${compact ? "p-4" : "p-5"}`}>
      <p className={`font-serif text-dark ${compact ? "text-base" : "text-xl font-semibold"}`}>
        Share this style with your stylist →
      </p>
      {!compact && (
        <p className="mt-1 text-sm text-dark/70">
          Send your stylist a summary of this style, your hair profile, and service estimate
          before you book.
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={openSummary}
          className="bg-bronze px-4 py-2 text-xs font-semibold text-cream transition-colors hover:bg-bronze2"
        >
          Generate summary →
        </button>
        <button
          type="button"
          onClick={handleCopyLink}
          className="border border-bronze/40 px-4 py-2 text-xs font-medium text-dark/80 transition-colors hover:border-bronze"
        >
          Copy link →
        </button>
        <button
          type="button"
          onClick={handleDownloadPdf}
          className="border border-bronze/40 px-4 py-2 text-xs font-medium text-dark/80 transition-colors hover:border-bronze"
        >
          Download as PDF →
        </button>
        <button
          type="button"
          onClick={handleShareText}
          className="border border-bronze/40 px-4 py-2 text-xs font-medium text-dark/80 transition-colors hover:border-bronze"
        >
          Share via text →
        </button>
      </div>
    </div>
  );
}

// Same selectable-card style as ProfileForOption on the profile form.
function SelectableCard({
  label,
  subtext,
  selected,
  onClick,
  icon,
}: {
  label: string;
  subtext?: string | null;
  selected: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-lg border px-4 py-3 text-left transition-colors ${
        selected ? "border-bronze bg-bronze/20" : "border-bronze/40 bg-transparent hover:border-bronze"
      }`}
    >
      {icon && <span className="mb-1.5 block">{icon}</span>}
      <span className="block text-sm font-medium text-dark">{label}</span>
      {subtext && <span className="mt-1 block text-xs leading-snug text-dark/60">{subtext}</span>}
    </button>
  );
}

// Pulls the video id out of any of the common YouTube URL shapes an admin
// might paste into styles.tutorial_url (watch?v=, youtu.be/, /embed/).
function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{6,})/);
  return match ? match[1] : null;
}

// Resizes to maxSize on the longest side and re-encodes as JPEG at 0.8
// quality before the image ever leaves the browser - a smaller request
// body is a direct, sizable chunk of the analyze route's total time
// (upload + Anthropic's own image processing both scale with size).
// Always outputs image/jpeg regardless of the source format.
function resizeImageToBase64(
  file: File,
  maxSize: number = 800
): Promise<{ base64: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const canvas = document.createElement("canvas");
    // window.Image, not the next/image import shadowing `Image` in this
    // file - this needs the real DOM constructor.
    const img = new window.Image();
    img.onload = () => {
      const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Couldn't get canvas context"));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
      resolve({ base64: dataUrl.split(",")[1] ?? "", mediaType: "image/jpeg" });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Couldn't load the selected image"));
    };
    img.src = objectUrl;
  });
}

function ProfileRequiredPrompt({ href }: { href: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4 font-sans sm:px-6">
      <div className="mx-auto max-w-sm text-center">
        <h1 className="font-serif text-2xl font-semibold text-dark">
          Create your free profile to use Style Match
        </h1>
        <p className="mt-2 text-sm text-dark/60">Takes 2 minutes.</p>
        <Link
          href={href}
          className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-bronze py-4 text-sm font-semibold text-cream transition-colors hover:bg-bronze2"
        >
          Create profile →
        </Link>
      </div>
    </main>
  );
}

function StyleMatchContent() {
  const searchParams = useSearchParams();
  const { user, loading: authLoading, hairProfile, hairProfileLoading } = useAuth();

  const resolvingAccess = authLoading || (Boolean(user) && hairProfileLoading);

  // Style Match is free and unlimited for anyone with a hair profile -
  // no subscription check. It still requires being signed in with
  // curl_type set (a real hair profile, not just an account) - logged
  // once, the first time the gate is actually shown to a given session,
  // so profile-shown/profile-created can be compared as a funnel.
  const needsProfile = !resolvingAccess && (!user || !hairProfile?.curl_type);
  const profileGateLoggedRef = useRef(false);
  useEffect(() => {
    if (!needsProfile || profileGateLoggedRef.current) return;
    profileGateLoggedRef.current = true;
    logMlEvent("style_match_profile_gate_shown", { userId: user?.id ?? null });
  }, [needsProfile, user]);

  // Whether the user has any hair photo on file - drives the "add a
  // hair photo" nudge on the landing screen, and whether the background
  // translation call fires after analyze() resolves (see analyze()
  // below). The analyze call itself never touches hair photos anymore -
  // that used to slow down every request with a current photo attached,
  // which is the whole reason it moved to a separate, optional,
  // image-free follow-up call.
  const [hasHairPhoto, setHasHairPhoto] = useState<boolean | null>(null);
  const [translationLoading, setTranslationLoading] = useState(false);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetch(`/api/hair-photos?user_id=${user.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setHasHairPhoto((data.photos ?? []).length > 0);
      })
      .catch(() => {
        if (!cancelled) setHasHairPhoto(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const [pageState, setPageState] = useState<PageState>("landing");
  const [error, setError] = useState<string | null>(null);

  // Visual browse strip modal
  const [browseModalImage, setBrowseModalImage] = useState<{ id: string; image_url: string; alt_text: string | null; hair_types: string[]; categories: string[]; mood: string | null } | null>(null);

  // Reference photo shown on the confirm screen - set to either the
  // user's uploaded image preview or the browse-strip library photo
  // they tapped. Cleared on resetToLanding.
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);

  // Landing input state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [textDescription, setTextDescription] = useState("");

  // Pre-fill from a saved style ("Match this style ->", Part 4). The
  // "Describe it" card this used to fill (and wait for the user to press
  // "Find this style" on) no longer exists, so this now jumps straight
  // into the deep survey - same behavior as tapping an inspo card below.
  useEffect(() => {
    const prefill = searchParams.get("prefill");
    if (prefill) {
      setTextDescription(prefill);
      setDeepStep(1);
      setPageState("deepSurvey");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Pre-fill from a community photo's "Style Match this ->" button -
  // there's no File object for these (the image came from another
  // user's storage object, downloaded server-side as base64), so it's
  // carried across the navigation via sessionStorage instead.
  const [prefilledImage, setPrefilledImage] = useState<{ base64: string; mediaType: string } | null>(null);
  useEffect(() => {
    if (searchParams.get("fromCommunity") !== "1") return;
    const raw = sessionStorage.getItem(COMMUNITY_PREFILL_KEY);
    if (!raw) return;
    sessionStorage.removeItem(COMMUNITY_PREFILL_KEY);
    try {
      const parsed = JSON.parse(raw) as { base64: string; mediaType: string };
      const dataUrl = `data:${parsed.mediaType};base64,${parsed.base64}`;
      setPrefilledImage(parsed);
      setImagePreviewUrl(dataUrl);
      setReferenceImageUrl(dataUrl);
    } catch {
      // Malformed/stale sessionStorage value - ignore, user can still
      // upload a photo normally.
    }
  }, [searchParams]);

  // Style survey state - every match goes through this now (Part 2)
  const [deepStep, setDeepStep] = useState(1);
  const [colorMatch, setColorMatch] = useState<boolean | null>(null);
  const [lengthDifference, setLengthDifference] = useState<LengthDifference | null>(null);
  const [wantsLengthExtensions, setWantsLengthExtensions] = useState(true);
  const [involvesExtensions, setInvolvesExtensions] = useState<InvolvesExtensions | null>(null);
  const [deepMatchHairPreference, setDeepMatchHairPreference] =
    useState<DeepMatchHairAdditionPreference | null>(null);
  const [translateForHairType, setTranslateForHairType] = useState<boolean | null>(null);

  const [detected, setDetected] = useState<DetectedStyle | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [savedStyleId, setSavedStyleId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Install type (item 1): which physical install method the user wants for
  // this style, asked only when the style needs added hair. matchedCatalogStyle
  // is the catalog styles row for this style name, if one exists - narrows the
  // question to that style's real install_types and supplies tutorial_url for
  // the tutorial card (item 3).
  const [selectedInstallType, setSelectedInstallType] = useState<InstallType | null>(null);
  const [matchedCatalogStyle, setMatchedCatalogStyle] = useState<{
    install_types: string[] | null;
    tutorial_url: string | null;
    fake_hair_type: string | null;
  } | null>(null);

  useEffect(() => {
    if (!detected?.style_name) {
      setMatchedCatalogStyle(null);
      return;
    }
    let cancelled = false;
    supabase
      .from("styles")
      .select("install_types, tutorial_url, fake_hair_type")
      .ilike("name", detected.style_name)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setMatchedCatalogStyle(data ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [detected?.style_name]);

  // "Yes, this is it ->" on the confirm screen: ask the install-type question
  // first when this style needs added hair and nothing's been picked yet,
  // otherwise go straight to results (unchanged behavior for every style that
  // doesn't need it).
  function confirmAndContinue() {
    if (detected?.requires_fake_hair && !selectedInstallType) {
      setPageState("installType");
    } else {
      setPageState("results");
    }
  }

  async function chooseInstallType(value: InstallType) {
    setSelectedInstallType(value);
    if (matchId) {
      try {
        await fetch("/api/style-match/install-type", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ match_id: matchId, install_type: value }),
        });
      } catch (err) {
        console.error("[style-match] failed to save install type:", err);
      }
    }
    setPageState("results");
  }

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  }

  // Results state
  const [activeTab, setActiveTab] = useState<ResultTab>("tutorials");
  const [internalTutorials, setInternalTutorials] = useState<Post[]>([]);
  const [youtubeVideos, setYoutubeVideos] = useState<YouTubeVideo[]>([]);
  const [tutorialsLoading, setTutorialsLoading] = useState(false);
  const [colorVideos, setColorVideos] = useState<YouTubeVideo[]>([]);
  const [colorVideosLoading, setColorVideosLoading] = useState(false);
  const [colorMapsUrl, setColorMapsUrl] = useState<string | null>(null);
  const [shoppingList, setShoppingList] = useState<StyleShoppingList | null>(null);
  const [shoppingLoading, setShoppingLoading] = useState(false);
  // "Complete your look" cart (lib/styleCart.ts) - assembled once the
  // shopping list is ready and (for styles that need added hair) an
  // install type is picked. cartBuiltRef guards against re-creating a
  // second cart if this effect's deps change again later in the session.
  const [cartId, setCartId] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const cartBuiltRef = useRef(false);
  // Qoyl store cart count — updated whenever user adds a hairCare item
  const [storeCartCount, setStoreCartCount] = useState(0);
  // Track which product IDs the user has already added to avoid duplicate adds
  const [addedProductIds, setAddedProductIds] = useState<Set<string>>(new Set());
  // Hair-type-aware style translation (see lib/styleTranslations.ts) -
  // null whenever no style_translations row exists for this detected
  // style + the viewer's hair family, which is most styles/most users
  // at launch (only beach-waves/wash-and-go/silk-press are seeded).
  const [styleTranslation, setStyleTranslation] = useState<StyleTranslation | null>(null);
  const [stylists, setStylists] = useState<Stylist[]>([]);
  // Item 8 - filters to stylists whose matched service lists
  // "human_hair_only" in hair_addition_types. That field isn't
  // collected by the (separate, out-of-scope) qoyl-business stylist
  // form yet, so this currently shows nothing for any real stylist -
  // the toggle is wired and ready for when that data starts flowing in.
  const [humanHairOnlyFilter, setHumanHairOnlyFilter] = useState(false);
  const [stylistsLoading, setStylistsLoading] = useState(false);
  const [marketEstimate, setMarketEstimate] = useState<MarketEstimate | null>(null);
  // City resolved inside loadStylists below - kept in state too so the
  // "recommend a stylist" empty state (components/StylistRecommendationBlock.tsx)
  // can pre-fill its city field without re-resolving the zip lookup itself.
  const [stylistCityLabel, setStylistCityLabel] = useState<string | null>(null);

  // Virtual hair try-on
  const [tryOnOpen, setTryOnOpen] = useState(false);

  const completedRef = useRef(false);
  const [savingChoice, setSavingChoice] = useState<"diy" | "stylist" | null>(null);
  const [savedChoice, setSavedChoice] = useState<"diy" | "stylist" | null>(null);

  // Inspo mode state (Part 5)
  const [inspoStyles, setInspoStyles] = useState<StyleRow[]>([]);
  const [inspoLoading, setInspoLoading] = useState(false);
  const [selectedVibe, setSelectedVibe] = useState<string>("all");
  const [selectedFamily, setSelectedFamily] = useState<CurlFamily>("curly");
  // True only until the user taps a tab themselves - drives the
  // "showing styles for your hair type" note (item 3), which only
  // makes sense while the pre-selected tab hasn't been overridden.
  const [familyAutoSelected, setFamilyAutoSelected] = useState(false);

  function resetToLanding() {
    setPageState("landing");
    setDetected(null);
    setError(null);
    setImageFile(null);
    setImagePreviewUrl(null);
    setTextDescription("");
    setDeepStep(1);
    setColorMatch(null);
    setLengthDifference(null);
    setWantsLengthExtensions(true);
    setInvolvesExtensions(null);
    setDeepMatchHairPreference(null);
    setTranslateForHairType(null);
    setActiveTab("tutorials");
    setInternalTutorials([]);
    setYoutubeVideos([]);
    setColorVideos([]);
    setShoppingList(null);
    setStylists([]);
    setMatchId(null);
    setSavedStyleId(null);
    completedRef.current = false;
    setSavedChoice(null);
    setPendingMatchInput(null);
    setBraidRoutingResolved(false);
    setCutRoutingResolved(false);
    setLocRoutingResolved(false);
    setSelectedBraidType(null);
    setReferenceImageUrl(null);
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const objectUrl = URL.createObjectURL(file);
    setImagePreviewUrl(objectUrl);
    setReferenceImageUrl(objectUrl);
  }

  // Holds the inputType/text from the analyze() call that's currently
  // pending a disambiguation choice - the create-match-row/translate/
  // free-match-counter work in finalizeMatch below needs them, but by
  // the time the user taps a disambiguation option that work is
  // happening well outside analyze()'s own closure.
  const [pendingMatchInput, setPendingMatchInput] = useState<{
    inputType: "photo" | "text";
    text?: string;
  } | null>(null);

  // Everything that used to run unconditionally right after a successful
  // analyze() call - now shared between the direct (confidence: high)
  // path and the disambiguation screen's "yes, this one" handler, since
  // both need to fire the translation call, the free-match counter, and
  // create the style_matches row for whichever style the user actually
  // confirmed.
  async function finalizeMatch(finalStyle: DetectedStyle, inputType: "photo" | "text", bodyText?: string) {
    setDetected(finalStyle);

    // If no reference image was set by a user photo upload, use the catalog
    // image for this style so the confirm/results screens show something.
    if (!referenceImageUrl && finalStyle.image_url) {
      setReferenceImageUrl(finalStyle.image_url);
    }

    // Fired after the fast, image-only analyze call above resolves -
    // not awaited, so it never delays showing results. Only when a
    // hair photo is on file, since that's the only thing this
    // translation is for. Updates `detected` in place when it lands,
    // which re-renders the translation banner with no page reload.
    if (hasHairPhoto && finalStyle.style_name) {
      setTranslationLoading(true);
      fetch("/api/style-match/translate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          style_name: finalStyle.style_name,
          curl_type: hairProfile?.curl_type ?? null,
          porosity: hairProfile?.porosity ?? null,
        }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((translation) => {
          if (translation) {
            setDetected((prev) => (prev ? { ...prev, ...translation } : prev));
          }
        })
        .catch((err) => console.error("[style-match] background translation failed:", err))
        .finally(() => setTranslationLoading(false));
    }

    // Create the style_matches row now (not only once the user saves/
    // books) so the heart/save button on the confirm screen has a real
    // id to attach to - see app/api/style-match/create/route.ts.
    if (user) {
      try {
        const createRes = await fetch("/api/style-match/create", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            user_id: user.id,
            input_type: inputType,
            input_text: inputType === "text" ? bodyText ?? null : null,
            image_url: finalStyle.image_url ?? null,
            detected_style: finalStyle.style_name,
            detected_details: finalStyle,
            face_shape: finalStyle.face_shape ?? null,
            natural_hair_color: finalStyle.natural_hair_color ?? null,
            match_mode: "deep",
            color_match: Boolean(colorMatch),
            length_difference: lengthDifference,
            involves_extensions: involvesExtensions,
            hair_addition_preference:
              involvesExtensions && involvesExtensions !== "none" ? deepMatchHairPreference : null,
            translated_for_hair_type: Boolean(translateForHairType),
          }),
        });
        const createData = await createRes.json();
        if (createRes.ok) setMatchId(createData.id);
      } catch (err) {
        console.error("Failed to create style_matches row:", err);
      }
    }

    setPageState("confirm");
  }

  // Tracks which of the box/knotless-braid, haircut, and starter-loc
  // routing decisions have already been made for the current match, so
  // proceedPastRouting doesn't re-show a screen the user already
  // resolved (e.g. after picking "faux locs instead" and looping back
  // through the queue). Reset in resetToLanding.
  const [braidRoutingResolved, setBraidRoutingResolved] = useState(false);
  const [selectedBraidType, setSelectedBraidType] = useState<"box" | "knotless" | null>(null);
  const [cutRoutingResolved, setCutRoutingResolved] = useState(false);
  const [locRoutingResolved, setLocRoutingResolved] = useState(false);

  // Runs after the style itself is settled (confidence disambiguation,
  // if any, already resolved) - checks the remaining routing decisions
  // in priority order and shows the first unresolved one, or finalizes
  // the match once none apply. Each routing screen's own handler below
  // marks its flag resolved and calls this again to continue down the
  // chain, so multiple conditions (e.g. a colored haircut) each still
  // get their turn rather than only the first one ever being asked.
  //
  // justResolved is passed explicitly rather than relying on
  // braidRoutingResolved/etc. state - setBraidRoutingResolved(true)
  // called by the same handler just before this doesn't take effect
  // until the next render, so reading the state var here would still
  // see the stale pre-update value and re-show the same screen forever.
  function proceedPastRouting(
    style: DetectedStyle,
    inputType: "photo" | "text",
    bodyText?: string,
    justResolved?: "braid" | "cut" | "loc"
  ) {
    setDetected(style);

    if (
      justResolved !== "braid" &&
      !braidRoutingResolved &&
      (style.braid_type === "box" || style.braid_type === "knotless")
    ) {
      setPageState("braidDisambiguate");
      return;
    }
    if (justResolved !== "cut" && !cutRoutingResolved && style.style_is_cut) {
      setPageState("cutRouting");
      return;
    }
    if (
      justResolved !== "loc" &&
      !locRoutingResolved &&
      (style.loc_type === "starter" || style.loc_type === "traditional")
    ) {
      setPageState("locWarning");
      return;
    }

    finalizeMatch(style, inputType, bodyText);
  }

  // Swaps in the alternative style the disambiguation screen offered -
  // only style_name is known to differ; every other field (hair_length,
  // difficulty, etc.) was computed by the model around its top guess and
  // may not perfectly fit the alternative, but re-analyzing to get a
  // second full breakdown would reintroduce the exact per-call latency
  // this route's fields were deliberately kept short to avoid.
  function chooseAlternativeStyle() {
    if (!detected?.alternative_style || !pendingMatchInput) return;
    const swapped: DetectedStyle = { ...detected, style_name: detected.alternative_style };
    proceedPastRouting(swapped, pendingMatchInput.inputType, pendingMatchInput.text);
  }

  function confirmDetectedStyle() {
    if (!detected || !pendingMatchInput) return;
    proceedPastRouting(detected, pendingMatchInput.inputType, pendingMatchInput.text);
  }

  // ---- box vs. knotless braids (item 5) - shown regardless of
  // confidence whenever either is detected, since the two are
  // financially/physically distinct enough that a wrong guess matters
  // even when the model is otherwise sure.
  function chooseBraidType(type: "box" | "knotless") {
    if (!detected || !pendingMatchInput) return;
    const label = type === "box" ? "Box Braids" : "Knotless Braids";
    const resolved: DetectedStyle = { ...detected, style_name: label, braid_type: type };
    setBraidRoutingResolved(true);
    proceedPastRouting(resolved, pendingMatchInput.inputType, pendingMatchInput.text, "braid");
  }

  // ---- cut vs. style-on-existing-hair (item 2) ----
  function confirmWantsCut() {
    if (!detected || !pendingMatchInput) return;
    setCutRoutingResolved(true);
    proceedPastRouting(detected, pendingMatchInput.inputType, pendingMatchInput.text, "cut");
  }
  function declineCut() {
    if (!detected || !pendingMatchInput) return;
    // User wants to style their existing hair like this look - proceed
    // as a normal style match with style_is_cut cleared so the rest of
    // the flow treats it as a styling brief, not a cut recommendation.
    const asStyle: DetectedStyle = { ...detected, style_is_cut: false };
    setCutRoutingResolved(true);
    proceedPastRouting(asStyle, pendingMatchInput.inputType, pendingMatchInput.text, "cut");
  }

  // ---- starter/traditional locs commitment warning (item 4) ----
  function confirmLocJourney() {
    if (!detected || !pendingMatchInput) return;
    setLocRoutingResolved(true);
    proceedPastRouting(detected, pendingMatchInput.inputType, pendingMatchInput.text, "loc");
  }
  function chooseFauxLocsInstead() {
    if (!detected || !pendingMatchInput) return;
    setLocRoutingResolved(true);
    const swapped: DetectedStyle = { ...detected, style_name: "Faux Locs", loc_type: "faux" };
    proceedPastRouting(swapped, pendingMatchInput.inputType, pendingMatchInput.text, "loc");
  }

  async function analyze(body: Record<string, unknown>, inputType: "photo" | "text") {
    setError(null);
    setPageState("analyzing");
    setPendingMatchInput({ inputType, text: inputType === "text" ? (body.text as string) : undefined });

    try {
      const res = await fetch("/api/style-match/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        // data.detail is server debug info (see app/api/style-match/
        // analyze/route.ts) - appended when present so the actual
        // failure is visible without needing to check server logs.
        const base = data.error ?? "Couldn't analyze this style. Please try again.";
        setError(data.detail ? `${base} (${data.detail})` : base);
        setPageState("landing");
        return;
      }

      const detectedStyle = data as DetectedStyle;

      // A style with no alternative_style has nothing to disambiguate
      // against regardless of what confidence says - straight to
      // confirm either way. Absent confidence (older behavior/anything
      // unexpected) also defaults to the direct path.
      if (
        (detectedStyle.confidence === "medium" || detectedStyle.confidence === "low") &&
        detectedStyle.alternative_style
      ) {
        setDetected(detectedStyle);
        setPageState("disambiguate");
        return;
      }

      proceedPastRouting(detectedStyle, inputType, inputType === "text" ? (body.text as string) : undefined);
    } catch (err) {
      // A bare network failure and a Vercel platform-level timeout
      // (function killed mid-request, no response body) look identical
      // to fetch() - both just throw. Logging the actual error at
      // least tells us which one it was next time this happens.
      console.error("[style-match] analyze request failed:", err);
      setError("Couldn't reach the style analysis service. Please try again.");
      setPageState("landing");
    }
  }

  async function handleSubmitPhoto() {
    if (!imageFile && !prefilledImage) return;
    const { base64, mediaType } = imageFile
      ? await resizeImageToBase64(imageFile, 800)
      : prefilledImage!;
    const deepFields = {
      color_match: colorMatch === true,
      translate_for_hair_type: translateForHairType === true,
      curl_type: hairProfile?.curl_type ?? null,
    };
    analyze({ input_type: "photo", image_base64: base64, image_media_type: mediaType, ...deepFields }, "photo");
  }

  async function handleSubmitText() {
    if (!textDescription.trim()) return;
    const deepFields = {
      color_match: colorMatch === true,
      translate_for_hair_type: translateForHairType === true,
      curl_type: hairProfile?.curl_type ?? null,
    };
    analyze({ input_type: "text", text: textDescription, ...deepFields }, "text");
  }

  // Every style match now goes through the full survey - always route
  // to it instead of analyzing directly.
  function handlePrimarySubmit() {
    setDeepStep(1);
    setPageState("deepSurvey");
  }

  function handleDeepSurveyFinish() {
    if (imageFile || prefilledImage) handleSubmitPhoto();
    else handleSubmitText();
  }

  // Results tab data loading - unchanged from before, plus the new
  // Color tab's YouTube search + "find a colorist" Maps link.
  useEffect(() => {
    if (pageState !== "results" || !detected || !hairProfile) return;

    let cancelled = false;
    const curlType = hairProfile.curl_type ?? "";

    // Resolves once, ahead of loadTutorials/loadShoppingList below,
    // since both use it (youtube_search_override and products_needed/
    // tools_needed respectively) - fetched here rather than read back
    // from state in the same tick, since a setStyleTranslation() call
    // wouldn't be visible to sibling closures until the next render.
    async function loadStyleTranslation(): Promise<StyleTranslation | null> {
      try {
        const params = new URLSearchParams({ style_name: detected!.style_name });
        if (curlType) params.set("curl_type", curlType);
        if (user?.id) params.set("user_id", user.id);
        const res = await fetch(`/api/style-match/translation?${params.toString()}`);
        const data = await res.json();
        const translation: StyleTranslation | null = data.translation ?? null;
        if (!cancelled) setStyleTranslation(translation);
        return translation;
      } catch {
        return null;
      }
    }

    async function loadTutorials(translation: StyleTranslation | null) {
      setTutorialsLoading(true);
      try {
        const family = curlFamily(curlType);
        const postsParams = new URLSearchParams({ style_name: detected!.style_name });
        if (family) postsParams.set("hair_type_family", family);

        const ytParams = new URLSearchParams({
          style_name: detected!.style_name,
          curl_type: curlType,
        });
        // Bug fix: the user's install-type pick now drives the tutorial
        // search (lib/installTypeContent.ts) ahead of the style's own
        // style_translations override, which itself used to be the only
        // thing that could ever beat the generic style-name search -
        // selectedInstallType never reached this query at all before.
        if (selectedInstallType) {
          ytParams.set("query_override", tutorialSearchQuery(selectedInstallType, curlType));
        } else if (translation?.youtube_search_override) {
          ytParams.set("query_override", translation.youtube_search_override);
        }

        const [postsRes, ytRes] = await Promise.all([
          fetch(`/api/style-match/tutorials?${postsParams.toString()}`),
          fetch(`/api/style-match/youtube?${ytParams.toString()}`),
        ]);
        const postsData = await postsRes.json();
        const ytData = await ytRes.json();
        if (!cancelled) {
          setInternalTutorials(postsData.posts ?? []);
          setYoutubeVideos(ytData.videos ?? []);
        }
      } finally {
        if (!cancelled) setTutorialsLoading(false);
      }
    }

    async function loadColorTab() {
      if (!colorMatch) return;
      setColorVideosLoading(true);
      try {
        const params = new URLSearchParams({
          mode: "color",
          color: detected!.detected_color || detected!.style_name,
          curl_type: curlType,
        });
        const [ytRes, cityState] = await Promise.all([
          fetch(`/api/style-match/youtube?${params.toString()}`),
          lookupCityState(hairProfile!.zip_code),
        ]);
        const ytData = await ytRes.json();
        if (!cancelled) {
          setColorVideos(ytData.videos ?? []);
          const city = cityState?.city ?? null;
          setColorMapsUrl(
            `https://www.google.com/maps/search/${encodeURIComponent(
              `hair colorist near ${city ?? ""}`.trim()
            )}`
          );
        }
      } finally {
        if (!cancelled) setColorVideosLoading(false);
      }
    }

    async function loadShoppingList(translation: StyleTranslation | null) {
      setShoppingLoading(true);
      try {
        // The survey's own answer (specific to this style) wins over the
        // profile-level default, since a client might prefer human hair
        // generally but pick synthetic for one particular style.
        const resolvedHairPreference: HairAdditionPreference | null =
          deepMatchHairPreference ??
          (hairProfile?.hair_addition_preference as HairAdditionPreference | null) ??
          null;

        const list = await buildStyleShoppingList({
          styleName: detected!.style_name,
          styleDescription: detected!.style_description,
          // Bug fix: the user's own install-type pick now takes
          // priority over the style's own default - picking "wig" on a
          // style the detector didn't flag as needing fake hair still
          // pulls in the fake hair section/matches, not just whatever
          // the style's own requires_fake_hair said.
          requiresFakeHair: resolveRequiresFakeHair(detected!.requires_fake_hair, selectedInstallType),
          fakeHairType: detected!.fake_hair_type,
          installType: selectedInstallType,
          accessoriesVisible: detected!.accessories_visible ?? [],
          wantsLengthExtensions: lengthDifference === "longer" && wantsLengthExtensions,
          userId: user?.id ?? null,
          matchId,
          hairAdditionPreference: resolvedHairPreference,
          translationProductsNeeded: translation?.products_needed ?? undefined,
          translationToolsNeeded: translation?.tools_needed ?? undefined,
          curlType: curlType || null,
          heatRequired: translation?.heat_required ?? undefined,
          // natural_hair_color is the fallback: a real color word from the
          // photo ("dark brown"), unlike hair_profiles.color_type, which is
          // a color *treatment* type (permanent/highlights/henna/...), not
          // an actual color - see lib/styleShoppingList.ts.
          detectedColor: detected!.detected_color ?? detected!.natural_hair_color ?? null,
          naturalHairColor: detected!.natural_hair_color ?? null,
          hairLength: detected!.hair_length ?? null,
        });
        if (!cancelled) setShoppingList(list);
      } finally {
        if (!cancelled) setShoppingLoading(false);
      }
    }

    async function loadStylists() {
      setStylistsLoading(true);
      try {
        const cityState = await lookupCityState(hairProfile!.zip_code);
        if (!cityState) {
          if (!cancelled) setStylists([]);
          return;
        }
        if (!cancelled) setStylistCityLabel(cityState.city);
        const params = new URLSearchParams({
          city: cityState.city,
          curl_type: curlType,
          style_name: detected!.style_name,
        });
        const res = await fetch(`/api/style-match/stylists?${params.toString()}`);
        const data = await res.json();
        const fetchedStylists: Stylist[] = data.stylists ?? [];
        if (!cancelled) setStylists(fetchedStylists);

        // No Qoyl stylist in this city at all - fall back to the market
        // rate estimate for the "Book a Stylist" tab (item 6's third
        // case) rather than leaving it empty.
        if (fetchedStylists.length === 0) {
          const estimateRes = await fetch(
            `/api/style-match/price-estimate?style_name=${encodeURIComponent(detected!.style_name)}`
          );
          const estimateData = await estimateRes.json();
          if (!cancelled) setMarketEstimate(estimateData.estimate ?? null);
        } else if (!cancelled) {
          setMarketEstimate(null);
        }
      } finally {
        if (!cancelled) setStylistsLoading(false);
      }
    }

    loadStyleTranslation().then((translation) => {
      loadTutorials(translation);
      loadShoppingList(translation);
    });
    loadColorTab();
    loadStylists();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageState, detected, hairProfile]);

  // "Complete your look" cart (lib/styleCart.ts) - assembles once per
  // match, from the shopping list this same screen already built.
  // Gated on an install type only for styles that need added hair,
  // matching confirmAndContinue()'s own gating above; everything else
  // (which never visits "installType") assembles as soon as the
  // shopping list is ready. Sends the already-computed shoppingList/
  // youtubeVideos rather than having the API route re-read
  // style_matches.shopping_list, which isn't saved until handleComplete
  // runs (sign-in required, a separate, later step).
  useEffect(() => {
    if (cartBuiltRef.current || !shoppingList || !matchId) return;
    if (detected?.requires_fake_hair && !selectedInstallType) return;

    cartBuiltRef.current = true;
    fetch("/api/style-cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        match_id: matchId,
        user_id: user?.id ?? null,
        shopping_list: shoppingList,
        tutorial: youtubeVideos[0] ?? null,
        install_type: selectedInstallType,
        requires_fake_hair: resolveRequiresFakeHair(detected?.requires_fake_hair ?? false, selectedInstallType),
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        setCartId(data.cart_id);
        setCartItems(data.items ?? []);
      })
      .catch((err) => console.error("[style-match] cart assembly failed:", err));
  }, [shoppingList, matchId, detected, selectedInstallType, user, youtubeVideos]);

  async function handleComplete(choice: "diy" | "stylist", stylistId: string | null) {
    if (!user || !detected || !matchId || completedRef.current) return;
    completedRef.current = true;
    setSavingChoice(choice);

    try {
      const res = await fetch("/api/style-match/complete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          match_id: matchId,
          user_id: user.id,
          detected_style: detected.style_name,
          tutorials: { posts: internalTutorials.map((p) => p.slug), youtube: youtubeVideos },
          shopping_list: shoppingList,
          stylist_id: stylistId,
          choice,
        }),
      });
      if (res.ok) setSavedChoice(choice);
      else completedRef.current = false;
    } catch {
      completedRef.current = false;
    } finally {
      setSavingChoice(null);
    }
  }

  // Heart/save button (Part 4) - available as soon as matchId exists
  // (right after confirm), independent of the DIY/stylist "complete"
  // action above.
  async function handleToggleSave() {
    if (!user || !detected) return;

    if (savedStyleId) {
      const { error: delError } = await supabase.from("saved_styles").delete().eq("id", savedStyleId);
      if (!delError) {
        setSavedStyleId(null);
        showToast("Removed from My Style Inspo");
      }
      return;
    }

    const { data, error: insError } = await supabase
      .from("saved_styles")
      .insert({
        user_id: user.id,
        style_match_id: matchId,
        style_name: detected.style_name,
        detected_details: detected,
        image_url: detected.image_url ?? null,
      })
      .select("id")
      .single();

    if (!insError && data) {
      setSavedStyleId(data.id);
      showToast("Saved to My Style Inspo ✓");
    }
  }

  // Inspo mode - fetches every style once (no family/vibe filter at the
  // query level, same "fetch once, filter client-side" pattern the vibe
  // filter already used before this change) and resolves a visual
  // library fallback image for any row missing image_url, once here
  // rather than per card render.
  async function loadInspoStyles() {
    setInspoLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from("styles")
        .select(
          "id, name, slug, description, hair_types_compatible, requires_fake_hair, estimated_time, difficulty, image_url, install_types, face_shapes_flattering"
        )
        .order("name", { ascending: true });

      const rows = !fetchError && data && data.length > 0 ? (data as StyleRow[]) : STATIC_STYLES;

      const withFallback = await Promise.all(
        rows.map(async (style) => {
          if (style.image_url) return style;
          const params = new URLSearchParams({ category: "style" });
          if (style.slug) params.set("slug", style.slug);
          if (style.hair_types_compatible?.length) {
            params.set("hair_types", style.hair_types_compatible.join(","));
          }
          try {
            const res = await fetch(`/api/visual-library/fallback?${params.toString()}`);
            const json = await res.json();
            return { ...style, fallback_image_url: json.url ?? null };
          } catch {
            return style;
          }
        })
      );

      setInspoStyles(withFallback);
    } finally {
      setInspoLoading(false);
    }
  }

  // Pre-selects the tab matching the signed-in user's curl_type (item
  // 3), defaulting to curly (most content, most common searches) with
  // no profile or an unrecognized curl_type.
  function openInspoMode() {
    setSelectedFamily(curlFamily(hairProfile?.curl_type ?? null) ?? "curly");
    setFamilyAutoSelected(true);
    setSelectedVibe("all");
    setPageState("inspo");
    loadInspoStyles();
  }

  function selectFamilyTab(family: CurlFamily) {
    setSelectedFamily(family);
    setFamilyAutoSelected(false);
  }

  // Soft rank by face shape, never a filter - a style with no
  // face_shapes_flattering (or an empty one) is universal and ranks
  // the same as a match. Array.prototype.sort is stable, so ties keep
  // their existing (alphabetical, from the query's .order("name")) order.
  const userFaceShape =
    hairProfile?.face_shape && hairProfile.face_shape !== "unknown" ? hairProfile.face_shape : null;

  const visibleInspoStyles = inspoStyles
    .filter((s) => {
      const codes = s.hair_types_compatible ?? [];
      const familyOk = codes.some((c) => FAMILY_CODES[selectedFamily].includes(c));
      const vibes = VIBE_TAGS_BY_SLUG[s.slug] ?? [];
      const vibeOk = selectedVibe === "all" || vibes.includes(selectedVibe);
      return familyOk && vibeOk;
    })
    .sort((a, b) => {
      if (!userFaceShape) return 0;
      const flatters = (s: StyleRow) =>
        !s.face_shapes_flattering?.length || s.face_shapes_flattering.includes(userFaceShape);
      const aFlatters = flatters(a);
      const bFlatters = flatters(b);
      if (aFlatters === bFlatters) return 0;
      return aFlatters ? -1 : 1;
    });

  // Tapping an inspo card pre-fills the style name and jumps straight
  // into the same survey every other match goes through, unlike the
  // saved-styles "Match this style" flow which only pre-fills the text
  // box and leaves the user to submit it themselves.
  function handleInspoCardTap(style: StyleRow) {
    setTextDescription(style.name);
    setDeepStep(1);
    setPageState("deepSurvey");
  }

  if (resolvingAccess) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white font-sans">
        <p className="text-sm text-dark/60">Loading...</p>
      </main>
    );
  }

  if (needsProfile) {
    return <ProfileRequiredPrompt href={user ? "/profile?from=style-match" : "/auth"} />;
  }

  if (pageState === "analyzing") return <AnalyzingOverlay />;

  const isLanding = pageState === "landing";

  return (
    <main className="font-sans text-dark" style={{ minHeight: "100vh", background: isLanding ? "transparent" : "white" }}>

      {/* ── Full-page salon photo background (landing only) ── */}
      {isLanding && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 0,
          backgroundImage: "url('/salon-bg.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center 30%",
        }} aria-hidden="true">
          {/* subtle dark vignette at bottom so panel reads cleanly */}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to bottom, rgba(10,8,6,0.35) 0%, rgba(10,8,6,0.1) 40%, rgba(10,8,6,0.65) 100%)",
          }} />
        </div>
      )}

      {/* ── Landing UI: upload card + browse strip ── */}
      {isLanding && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 10,
          display: "flex", flexDirection: "column",
          justifyContent: "space-between",
          pointerEvents: "none",
        }}>

          {/* Upload photo card — upper area, overlaid on photo */}
          <div style={{
            pointerEvents: "auto",
            margin: "auto 0",
            marginTop: "clamp(80px, 22vh, 140px)",
            padding: "0 20px",
            width: "min(600px, 100vw)",
            alignSelf: "center",
          }}>
            <label style={{
              display: "flex", alignItems: "center", gap: 14,
              background: "rgba(15,12,9,0.55)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid rgba(200,168,106,0.3)",
              borderRadius: 20, padding: "16px 18px", cursor: "pointer",
            }}>
              <div style={{ width: 42, height: 42, borderRadius: "50%", background: "rgba(200,168,106,0.15)", border: "1px solid rgba(200,168,106,0.35)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C8A86A" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.132.175C3.098 7.58 2.25 8.507 2.25 9.605v9.145c0 1.152.938 2.25 2.25 2.25h15c1.313 0 2.25-1.098 2.25-2.25V9.605c0-1.098-.848-2.026-1.803-2.2a41.03 41.03 0 00-1.132-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.235 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 500, color: "rgba(255,248,235,0.95)" }}>Upload a photo</p>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "rgba(200,185,160,0.7)" }}>
                  {imageFile ? imageFile.name : (prefilledImage ? "Community photo ready →" : "A picture of the style you want")}
                </p>
              </div>
              {imagePreviewUrl && (
                <div style={{ width: 48, height: 48, borderRadius: 10, overflow: "hidden", flexShrink: 0, position: "relative" }}>
                  <Image src={imagePreviewUrl} alt="Selected" fill style={{ objectFit: "cover" }} sizes="48px" />
                </div>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handlePhotoChange}
                style={{ position: "absolute", width: 1, height: 1, opacity: 0 }}
              />
            </label>

            {/* Analyze button — appears once a photo is chosen */}
            {(imageFile || prefilledImage) && (
              <button
                type="button"
                onClick={handlePrimarySubmit}
                style={{
                  marginTop: 10, width: "100%",
                  padding: "13px 0", borderRadius: 100, border: "none",
                  background: "linear-gradient(135deg,#C8A86A,#A8863A)",
                  color: "#1A1510", fontFamily: "inherit",
                  fontSize: 14, fontWeight: 600, letterSpacing: "0.06em", cursor: "pointer",
                }}
              >
                Analyze this style →
              </button>
            )}

            {error && (
              <p style={{ margin: "8px 0 0", fontSize: 12, color: "#F87171", textAlign: "center" }}>{error}</p>
            )}
          </div>

          {/* Browse styles strip — anchored to bottom */}
          <div style={{ pointerEvents: "auto", width: "100%" }}>
            {/* label */}
            <div style={{ padding: "0 20px 10px", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(200,185,160,0.65)", fontWeight: 500 }}>
                Browse styles
              </span>
              <div style={{ flex: 1, height: 1, background: "rgba(200,168,106,0.2)" }} />
              <button
                type="button"
                onClick={openInspoMode}
                style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(200,168,106,0.8)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
              >
                See all →
              </button>
            </div>
            <VisualBrowseStrip
              gender={hairProfile?.gender ?? null}
              onSelectImage={(img) => setBrowseModalImage(img)}
            />
          </div>
        </div>
      )}

      {/* wordmark overlay on the photo */}
      {isLanding && (
        <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 11 }}>
          <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 28, fontWeight: 700, color: "white", letterSpacing: "0.08em", margin: 0, textShadow: "0 1px 8px rgba(0,0,0,0.4)" }}>
            qoyl
          </p>
        </div>
      )}

      {browseModalImage && (
        <BrowseImageModal
          image={browseModalImage}
          onClose={() => setBrowseModalImage(null)}
          onMatch={(img) => {
            setBrowseModalImage(null);
            setReferenceImageUrl(img.image_url);
            // Treat the library image as a text description prefill —
            // use the alt text if available, otherwise a generic prompt
            // that will go through the deep survey just like any other match.
            setTextDescription(img.alt_text ?? "this hairstyle look");
            setDeepStep(1);
            setPageState("deepSurvey");
          }}
        />
      )}

      <div className="px-4 py-10 sm:px-6" style={{ display: isLanding ? "none" : undefined }}>
      <div className="mx-auto max-w-2xl">
        {pageState === "inspo" && (
          <div>
            <button
              type="button"
              onClick={() => setPageState("landing")}
              className="text-xs text-dark/50 underline underline-offset-2 hover:text-dark/70"
            >
              ← Back
            </button>
            <h1 className="mt-3 font-serif text-[28px] font-semibold text-dark">Find your next style</h1>

            {/* Hair-family tabs (items 1-3) */}
            <div className="mt-6 grid grid-cols-4 border border-dark">
              {FAMILY_ORDER.map((family) => (
                <button
                  key={family}
                  type="button"
                  onClick={() => selectFamilyTab(family)}
                  className={`border-r border-dark py-2 text-center font-sans font-bold lowercase transition-colors last:border-r-0 ${
                    selectedFamily === family ? "bg-dark text-white" : "bg-white text-dark"
                  }`}
                  style={{ fontSize: "12px" }}
                >
                  {FAMILY_TAB_LABEL[family]}
                </button>
              ))}
            </div>
            <p className="mt-2 font-mono lowercase text-muted" style={{ fontSize: "9px" }}>
              {FAMILY_SUBTITLE[selectedFamily]}
            </p>
            {familyAutoSelected && hairProfile?.curl_type && (
              <p className="mt-1 font-mono lowercase text-muted" style={{ fontSize: "9px" }}>
                showing styles for your hair type ({hairProfile.curl_type}) — tap another tab to browse
              </p>
            )}

            {/* Vibe filter row (item 6) */}
            <div className="mt-4 -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
              {VIBE_OPTIONS.map((vibe) => (
                <button
                  key={vibe}
                  type="button"
                  onClick={() => setSelectedVibe(vibe)}
                  className={`shrink-0 border px-2.5 py-1 font-mono lowercase transition-colors ${
                    selectedVibe === vibe
                      ? "border-dark bg-dark text-white"
                      : "border-dark/40 bg-white text-muted"
                  }`}
                  style={{ fontSize: "9px" }}
                >
                  {vibe}
                </button>
              ))}
            </div>

            {inspoLoading && <p className="mt-8 text-sm text-dark/50">Loading styles...</p>}

            {!inspoLoading && (
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {visibleInspoStyles.map((style) => {
                  const imageUrl = style.image_url || style.fallback_image_url || null;
                  return (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => handleInspoCardTap(style)}
                      className="flex flex-col overflow-hidden border border-dark bg-white text-left"
                    >
                      <div className="relative aspect-square w-full overflow-hidden">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={style.name}
                            loading="lazy"
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a1a] p-3 text-center">
                            <p className="font-sans font-bold lowercase text-white" style={{ fontSize: "13px" }}>
                              {style.name}
                            </p>
                          </div>
                        )}
                        {style.requires_fake_hair && (
                          <span className="absolute left-1.5 top-1.5 bg-dark px-2 py-1 font-mono lowercase text-white" style={{ fontSize: "8px" }}>
                            + fake hair
                          </span>
                        )}
                      </div>
                      <div className="p-2.5">
                        <p className="font-sans font-bold lowercase leading-tight text-dark" style={{ fontSize: "11px" }}>
                          {style.name}
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {style.estimated_time && (
                            <span className="font-mono lowercase text-muted" style={{ fontSize: "9px" }}>
                              {style.estimated_time}
                            </span>
                          )}
                          {style.difficulty && (
                            <span className="border border-dark/40 px-1.5 py-0.5 font-mono lowercase text-muted" style={{ fontSize: "9px" }}>
                              {style.difficulty}
                            </span>
                          )}
                        </div>
                        {style.install_types?.[0] && (
                          <div className="mt-1">
                            <span className="border border-[#d0d0d0] px-[3px] py-0.5 font-mono lowercase text-muted" style={{ fontSize: "6px" }}>
                              {installTypeLabel(style.install_types[0])}
                            </span>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
                {visibleInspoStyles.length === 0 && (
                  <p className="col-span-full text-sm text-dark/50">No styles match those filters yet.</p>
                )}
              </div>
            )}
          </div>
        )}

        {pageState === "deepSurvey" && (
          <div>
            <button
              type="button"
              onClick={() => (deepStep === 1 ? setPageState("landing") : setDeepStep((s) => s - 1))}
              className="text-xs text-dark/50 underline underline-offset-2 hover:text-dark/70"
            >
              ← Back
            </button>
            <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-bronze">Step {deepStep} of 3</p>

            {deepStep === 1 && (
              <div className="mt-4">
                <h2 className="font-serif text-2xl font-semibold text-dark">
                  How do you want your results?
                </h2>
                <p className="mt-2 text-sm text-dark/60">
                  We can adapt this look for your specific hair type, or show you how to recreate it as-is.
                </p>
                <div className="mt-4 space-y-3">
                  <SelectableCard
                    label="Adapt it for my hair type"
                    subtext="Show me how to get this look on MY hair"
                    selected={translateForHairType === true}
                    onClick={() => setTranslateForHairType(true)}
                  />
                  <SelectableCard
                    label="Show it as-is"
                    subtext="I understand it may look different on my hair"
                    selected={translateForHairType === false}
                    onClick={() => setTranslateForHairType(false)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setDeepStep(2)}
                  disabled={translateForHairType === null}
                  className="mt-6 w-full bg-bronze py-3 text-sm font-semibold text-cream transition-colors hover:bg-bronze2 disabled:opacity-40"
                >
                  Continue →
                </button>
              </div>
            )}

            {deepStep === 2 && (
              <div className="mt-4">
                <h2 className="font-serif text-2xl font-semibold text-dark">
                  Are you going for the color too?
                </h2>
                <div className="mt-4 space-y-3">
                  <SelectableCard label="Yes - include color tutorials" selected={colorMatch === true} onClick={() => setColorMatch(true)} />
                  <SelectableCard label="No - just the style" selected={colorMatch === false} onClick={() => setColorMatch(false)} />
                </div>
                {colorMatch === true && (
                  <p className="mt-4 border-l-2 border-bronze bg-amber/10 px-4 py-3 text-sm leading-relaxed text-dark/90">
                    Color work - especially bleaching or significant changes - can cause serious
                    damage without professional help. We will include color tutorials, but strongly
                    recommend consulting a licensed colorist for any chemical services.
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => setDeepStep(3)}
                  disabled={colorMatch === null}
                  className="mt-6 w-full bg-bronze py-3 text-sm font-semibold text-cream transition-colors hover:bg-bronze2 disabled:opacity-40"
                >
                  Continue →
                </button>
              </div>
            )}

            {deepStep === 3 && (
              <div className="mt-4">
                <h2 className="font-serif text-2xl font-semibold text-dark">
                  How does this length compare to your current hair?
                </h2>
                <div className="mt-4 space-y-3">
                  <SelectableCard label="About the same" selected={lengthDifference === "same"} onClick={() => setLengthDifference("same")} />
                  <SelectableCard label="Longer than mine" selected={lengthDifference === "longer"} onClick={() => setLengthDifference("longer")} />
                  <SelectableCard label="Shorter than mine" selected={lengthDifference === "shorter"} onClick={() => setLengthDifference("shorter")} />
                </div>
                {lengthDifference === "longer" && (
                  <div className="mt-4 border-l-2 border-bronze bg-warm/10 px-4 py-3">
                    <p className="text-sm leading-relaxed text-dark/90">
                      Growing to this length takes time. Want us to include extension options to get the look now?
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setWantsLengthExtensions(true)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                          wantsLengthExtensions ? "border-bronze bg-bronze text-cream" : "border-bronze/40 text-bronze2"
                        }`}
                      >
                        Yes, include extensions
                      </button>
                      <button
                        type="button"
                        onClick={() => setWantsLengthExtensions(false)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                          !wantsLengthExtensions ? "border-bronze bg-bronze text-cream" : "border-bronze/40 text-bronze2"
                        }`}
                      >
                        No, I want to grow it out
                      </button>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleDeepSurveyFinish}
                  disabled={lengthDifference === null}
                  className="mt-6 w-full bg-bronze py-3 text-sm font-semibold text-cream transition-colors hover:bg-bronze2 disabled:opacity-40"
                >
                  See my results →
                </button>
              </div>
            )}
          </div>
        )}

        {pageState === "disambiguate" && detected && (
          <div>
            {referenceImageUrl && (
              <div className="relative mb-5 h-64 w-full overflow-hidden bg-[#f0ece8] sm:h-72">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={referenceImageUrl}
                  alt="Your style reference"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-dark/50 to-transparent" />
                <p className="absolute bottom-3 left-4 font-mono lowercase text-white/80" style={{ fontSize: "10px" }}>
                  your reference photo
                </p>
              </div>
            )}
            <h2 className="font-serif text-2xl font-semibold text-dark">
              We think this is {detected.style_name} — does one of these match better?
            </h2>
            {detected.confidence === "low" && (
              <p className="mt-2 text-sm text-dark/60">
                We&apos;re not fully sure on this one - pick whichever looks right, or browse styles yourself.
              </p>
            )}

            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={confirmDetectedStyle}
                className="w-full border border-bronze/40 p-4 text-left transition-colors hover:border-bronze"
              >
                <p className="font-serif text-lg text-dark">{detected.style_name}</p>
                <p className="mt-1 text-sm text-dark/70">{detected.style_description}</p>
                {detected.confidence_reason && (
                  <p className="mt-2 font-mono text-[9px] uppercase tracking-wide text-bronze2">
                    {detected.confidence_reason}
                  </p>
                )}
              </button>

              {detected.alternative_style && (
                <button
                  type="button"
                  onClick={chooseAlternativeStyle}
                  className="w-full border border-bronze/40 p-4 text-left transition-colors hover:border-bronze"
                >
                  <p className="font-serif text-lg text-dark">{detected.alternative_style}</p>
                  <p className="mt-2 font-mono text-[9px] uppercase tracking-wide text-bronze2">
                    tap if this looks more accurate →
                  </p>
                </button>
              )}
            </div>

            {detected.confidence === "low" && (
              <button
                type="button"
                onClick={() => setPageState("inspo")}
                className="mt-4 w-full border border-bronze/40 p-4 text-center text-sm font-medium text-dark/70 transition-colors hover:border-bronze"
              >
                None of these - let me browse styles →
              </button>
            )}

            <button
              type="button"
              onClick={resetToLanding}
              className="mt-6 text-xs text-dark/50 underline underline-offset-2 hover:text-dark/70"
            >
              Start over
            </button>
          </div>
        )}

        {pageState === "braidDisambiguate" && detected && (
          <div>
            <h2 className="font-serif text-2xl font-semibold text-dark lowercase">
              box braids or knotless braids?
            </h2>
            <p className="mt-2 text-sm text-dark/60">
              These are the two most commonly confused braid styles — the difference matters for price and comfort.
            </p>

            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={() => setSelectedBraidType("box")}
                className={`w-full border p-4 text-left transition-colors ${
                  selectedBraidType === "box" ? "border-dark bg-dark text-cream" : "border-bronze/40 text-dark"
                }`}
              >
                <p className="font-serif text-lg">Box Braids</p>
                <p className={`mt-1 text-sm ${selectedBraidType === "box" ? "text-cream/80" : "text-dark/70"}`}>
                  Knot at the root. More tension on scalp. Typically $50-100 less than knotless. Slightly faster
                  install.
                </p>
                <p
                  className={`mt-2 font-mono text-[9px] uppercase tracking-wide ${
                    selectedBraidType === "box" ? "text-cream/60" : "text-bronze2"
                  }`}
                >
                  root: visible bump/knot
                </p>
              </button>

              <button
                type="button"
                onClick={() => setSelectedBraidType("knotless")}
                className={`w-full border p-4 text-left transition-colors ${
                  selectedBraidType === "knotless" ? "border-dark bg-dark text-cream" : "border-bronze/40 text-dark"
                }`}
              >
                <p className="font-serif text-lg">Knotless Braids</p>
                <p className={`mt-1 text-sm ${selectedBraidType === "knotless" ? "text-cream/80" : "text-dark/70"}`}>
                  Feed-in technique. No knot at root. Less tension and pain. More natural look at root. Higher price
                  point.
                </p>
                <p
                  className={`mt-2 font-mono text-[9px] uppercase tracking-wide ${
                    selectedBraidType === "knotless" ? "text-cream/60" : "text-bronze2"
                  }`}
                >
                  root: flat and clean
                </p>
              </button>
            </div>

            <button
              type="button"
              onClick={() => selectedBraidType && chooseBraidType(selectedBraidType)}
              disabled={!selectedBraidType}
              className="mt-6 w-full bg-bronze py-3 text-sm font-semibold text-cream transition-colors hover:bg-bronze2 disabled:opacity-40"
            >
              This is right →
            </button>

            <Link
              href="/posts?q=box+braids+vs+knotless+braids"
              className="mt-4 block text-center text-xs text-dark/50 underline underline-offset-2 hover:text-dark/70"
            >
              Not sure? →
            </Link>
          </div>
        )}

        {pageState === "cutRouting" && detected && (
          <div>
            <h2 className="font-serif text-2xl font-semibold text-dark">This looks like a haircut, not a style</h2>
            <p className="mt-2 text-sm text-dark/70">
              {detected.style_name} is a haircut that requires a professional trim — it changes your actual hair
              length rather than just how existing length is styled.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={confirmWantsCut}
                className="flex-1 bg-bronze py-3 text-sm font-semibold text-cream transition-colors hover:bg-bronze2"
              >
                Yes - I want this cut →
              </button>
              <button
                type="button"
                onClick={declineCut}
                className="flex-1 border border-bronze/40 py-3 text-sm font-semibold text-dark/80 transition-colors hover:border-bronze"
              >
                No - I want to style my existing hair like this →
              </button>
            </div>
          </div>
        )}

        {pageState === "locWarning" && detected && (
          <div>
            <h2 className="font-serif text-2xl font-semibold text-dark">Locs are a permanent style</h2>
            <p className="mt-2 text-sm text-dark/70">
              Starter locs are a multi-year commitment — your hair will permanently loc over time and cannot be
              easily reversed.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={confirmLocJourney}
                className="flex-1 bg-bronze py-3 text-sm font-semibold text-cream transition-colors hover:bg-bronze2"
              >
                Yes - I want to start my loc journey →
              </button>
              <button
                type="button"
                onClick={chooseFauxLocsInstead}
                className="flex-1 border border-bronze/40 py-3 text-sm font-semibold text-dark/80 transition-colors hover:border-bronze"
              >
                I want temporary locs (faux locs) →
              </button>
            </div>
          </div>
        )}

        {pageState === "confirm" && detected && (
          <div>
            {referenceImageUrl && (
              <div className="relative mb-5 h-64 w-full overflow-hidden bg-[#f0ece8] sm:h-72">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={referenceImageUrl}
                  alt="Your style reference"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-dark/50 to-transparent" />
                <p className="absolute bottom-3 left-4 font-mono lowercase text-white/80" style={{ fontSize: "10px" }}>
                  your reference photo
                </p>
              </div>
            )}
            <div className="flex items-start justify-between gap-4">
              <h2 className="font-serif text-2xl font-semibold text-dark">{detected.style_name}</h2>
              <button
                type="button"
                onClick={handleToggleSave}
                disabled={!matchId}
                aria-label={savedStyleId ? "Unsave style" : "Save style"}
                className="shrink-0 disabled:opacity-40"
              >
                <HeartIcon filled={Boolean(savedStyleId)} />
              </button>
            </div>
            <p className="mt-2 text-sm text-dark/70">{detected.style_description}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-bronze/40 px-3 py-1 text-xs font-medium capitalize text-bronze2">
                {detected.hair_length} length
              </span>
              {detected.approximate_length && (
                <span className="rounded-full border border-bronze/40 px-3 py-1 text-xs font-medium capitalize text-bronze2">
                  detected length: {detected.approximate_length}
                </span>
              )}
              <span className="rounded-full border border-bronze/40 px-3 py-1 text-xs font-medium capitalize text-bronze2">
                {detected.difficulty}
              </span>
              <span className="rounded-full border border-bronze/40 px-3 py-1 text-xs font-medium capitalize text-bronze2">
                {detected.estimated_time}
              </span>
              {detected.requires_fake_hair && (
                <span className="rounded-full border border-bronze/40 px-3 py-1 text-xs font-medium capitalize text-bronze2">
                  {detected.fake_hair_type ?? "Fake hair needed"}
                </span>
              )}
              {(selectedInstallType || matchedCatalogStyle?.install_types?.[0]) && (
                <span className="rounded-full border border-bronze/40 px-3 py-1 text-xs font-medium capitalize text-bronze2">
                  {installTypeLabel(selectedInstallType ?? matchedCatalogStyle?.install_types?.[0])}
                </span>
              )}
            </div>

            {/* Length gap (item 6) - lengthDifference is already collected
                in the deep survey (step 2, "how does this length compare
                to your current hair?"), same question the spec's length-
                gap alert would otherwise re-ask, so this surfaces what
                was already decided rather than asking it twice. */}
            {lengthDifference === "longer" && (
              <p className="mt-2 text-xs text-dark/50">
                {wantsLengthExtensions
                  ? "This style is longer than your current hair - extension options are included in your shopping list."
                  : "This style is longer than your current hair - tutorials will focus on achieving this length naturally."}
              </p>
            )}

            {detected.has_color_treatment && (
              <div className="mt-4 rounded-xl border border-bronze/30 p-4">
                <p className="text-sm text-dark/80">
                  This style includes{" "}
                  <strong className="capitalize">{(detected.color_type ?? "color").replace(/_/g, " ")}</strong> -
                  color services are separate from the hairstyle itself.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("color");
                    setPageState("results");
                  }}
                  className="mt-2 text-xs text-bronze2 underline underline-offset-2 hover:text-dark"
                >
                  I only want the color →
                </button>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {(detected.compatible_hair_types ?? []).map((t) => (
                <span key={t} className="rounded-full bg-white px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-bronze">
                  {t}
                </span>
              ))}
            </div>

            {hairProfile?.curl_type && (detected.compatible_hair_types ?? []).includes(hairProfile.curl_type) ? (
              <span className="mt-4 inline-block rounded-full bg-green/20 px-3 py-1 text-xs font-semibold text-green">
                Great match for your hair
              </span>
            ) : (
              <span className="mt-4 inline-block rounded-full bg-amber/20 px-3 py-1 text-xs font-semibold text-amber">
                May need modifications
              </span>
            )}

            {detected.bang_length && isBangStyle(detected.style_name) && (
              <div className="mt-6 flex items-center gap-4 rounded-xl border border-bronze/30 p-4">
                <BangLengthDiagram bangLength={detected.bang_length} />
                <div className="min-w-0">
                  <p className="text-sm text-dark/80">
                    We detected bangs ending <strong>{BANG_LENGTH_LABEL[detected.bang_length]}</strong> the eyebrow —
                    this is key to finding the right tutorials and stylist.
                  </p>
                  <button
                    type="button"
                    onClick={() => (detected.alternative_style ? setPageState("disambiguate") : resetToLanding())}
                    className="mt-2 text-xs text-bronze2 underline underline-offset-2 hover:text-dark"
                  >
                    Not quite →
                  </button>
                </div>
              </div>
            )}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={confirmAndContinue}
                className="flex-1 bg-bronze py-3 text-sm font-semibold text-cream transition-colors hover:bg-bronze2"
              >
                Yes, this is it →
              </button>
              <button
                type="button"
                onClick={resetToLanding}
                className="flex-1 border border-bronze/40 py-3 text-sm font-semibold text-dark/80 transition-colors hover:border-bronze"
              >
                Not quite - try again
              </button>
            </div>
          </div>
        )}

        {pageState === "installType" && detected && (
          <div>
            <h2 className="font-serif text-2xl font-semibold text-dark">How do you want to install this look?</h2>
            <p className="mt-2 text-sm text-dark/60">
              This style needs added hair - we&apos;ll match the right product and tutorial to how you&apos;re
              installing it.
            </p>
            <div className="mt-6 space-y-3">
              {installOptionsFor(matchedCatalogStyle?.install_types).map((option) => (
                <SelectableCard
                  key={option.value}
                  label={option.label}
                  selected={selectedInstallType === option.value}
                  onClick={() => setSelectedInstallType(option.value)}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => selectedInstallType && chooseInstallType(selectedInstallType)}
              disabled={!selectedInstallType}
              className="mt-6 w-full bg-bronze py-3 text-sm font-semibold text-cream transition-colors hover:bg-bronze2 disabled:opacity-40"
            >
              Continue →
            </button>
          </div>
        )}

        {pageState === "results" && detected && (
          <>
          <div>
            <div className="flex items-start justify-between gap-4">
              <h2 className="font-serif text-2xl font-semibold text-dark">{detected.style_name}</h2>
              <button
                type="button"
                onClick={handleToggleSave}
                disabled={!matchId}
                aria-label={savedStyleId ? "Unsave style" : "Save style"}
                className="shrink-0 disabled:opacity-40"
              >
                <HeartIcon filled={Boolean(savedStyleId)} />
              </button>
            </div>
            {detected.maintenance_tips && (
              <p className="mt-1 text-sm text-dark/60">{detected.maintenance_tips}</p>
            )}

            {/* Wrong match button */}
            <button
              type="button"
              onClick={resetToLanding}
              className="mt-3 flex items-center gap-1.5 font-mono lowercase text-dark/40 transition-colors hover:text-dark/70"
              style={{ fontSize: "11px" }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              this match is wrong
            </button>

            {/* Virtual try-on CTA */}
            {referenceImageUrl && (
              <button
                type="button"
                onClick={() => setTryOnOpen(true)}
                className="group mt-5 w-full overflow-hidden transition-opacity hover:opacity-90 active:opacity-80"
                style={{
                  background: "linear-gradient(135deg, #C8A86A 0%, #A07840 50%, #C8A86A 100%)",
                  backgroundSize: "200% 200%",
                }}
              >
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex flex-col items-start gap-0.5 text-left">
                    <span className="font-sans font-bold lowercase text-white" style={{ fontSize: "15px", letterSpacing: "-0.2px" }}>
                      see it on you
                    </span>
                    <span className="font-mono lowercase text-white/70" style={{ fontSize: "10px" }}>
                      try this style with your photo
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span
                      className="font-mono uppercase text-white/60"
                      style={{ fontSize: "9px", letterSpacing: "0.1em" }}
                    >
                      AI preview
                    </span>
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      className="opacity-80"
                    >
                      <path d="M12 3c-1 2.5-3.5 4-6 4 0 5 2.5 9.5 6 11 3.5-1.5 6-6 6-11-2.5 0-5-1.5-6-4z" />
                      <path d="M9 12l2 2 4-4" />
                    </svg>
                  </div>
                </div>
              </button>
            )}

            {translateForHairType === true && detected.hair_type_translation && (
              <div className="mt-4 border-l-2 border-bronze bg-warm/10 px-4 py-3">
                <p className="text-sm leading-relaxed text-dark/90">
                  Style adapted for your {hairProfile?.curl_type ?? ""} hair: {detected.hair_type_translation}
                </p>
              </div>
            )}

            {translationLoading && !detected.current_to_desired_translation && (
              <p className="mt-4 text-xs text-dark/50">Personalizing for your hair...</p>
            )}

            {detected.current_to_desired_translation && (
              <div className="mt-4 border-l-2 border-bronze bg-warm/10 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-bronze">
                  From your current hair to this style
                </p>
                <p className="mt-2 text-sm leading-relaxed text-dark/90">
                  {detected.current_to_desired_translation}
                </p>
                {detected.length_gap && (
                  <span className="mt-2 inline-block rounded-full border border-bronze/40 px-2.5 py-0.5 text-[11px] font-medium capitalize text-bronze2">
                    Length gap: {detected.length_gap}
                  </span>
                )}
                {detected.prep_needed && detected.prep_needed.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {detected.prep_needed.map((step) => (
                      <li key={step} className="text-xs text-dark/70">
                        • {step}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Time/difficulty chips - translation values (specific to
                this style + the viewer's hair family) override the
                generic detected ones when a style_translations row
                exists (item 4's "time and difficulty" section). */}
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-bronze/40 px-3 py-1 text-xs font-medium capitalize text-bronze2">
                {styleTranslation?.difficulty_for_family ?? detected.difficulty}
              </span>
              <span className="rounded-full border border-bronze/40 px-3 py-1 text-xs font-medium capitalize text-bronze2">
                {styleTranslation?.time_estimate ?? detected.estimated_time}
              </span>
              {styleTranslation?.heat_required && (
                <span className="rounded-full bg-dark px-3 py-1 text-xs font-semibold lowercase text-white">
                  heat required
                </span>
              )}
              {styleTranslation?.fake_hair_required && (
                <span className="rounded-full bg-dark px-3 py-1 text-xs font-semibold lowercase text-white">
                  fake hair needed
                </span>
              )}
            </div>

            {/* "How to get there" - a style_translations row's
                technique guidance for this exact hair family, shown
                before the tabs so it sets expectations up front. */}
            {styleTranslation && (
              <div className="mt-4 border border-dark bg-white p-4">
                <p className="font-mono uppercase tracking-widest text-muted" style={{ fontSize: "9px" }}>
                  how to get there
                </p>
                <p className="mt-2 font-sans font-normal leading-[1.7] text-[#444444]" style={{ fontSize: "13px" }}>
                  {styleTranslation.how_to_achieve}
                </p>
                <div className="mt-3 border-l-2 border-dark pl-3">
                  <p className="font-sans font-light text-muted" style={{ fontSize: "12px" }}>
                    {styleTranslation.key_difference}
                  </p>
                </div>
              </div>
            )}

            {resolveRequiresFakeHair(detected.requires_fake_hair, selectedInstallType) && (
              <div className="mt-6 border-2 border-[#0a0a0a] bg-[#0a0a0a] p-4 text-white">
                <p className="font-mono text-[10px] uppercase tracking-widest text-bronze">
                  this style needs fake hair
                </p>
                <p className="mt-1 text-lg font-bold lowercase">we found your match</p>
                {shoppingLoading ? (
                  <p className="mt-3 text-sm text-white/60">matching your texture...</p>
                ) : (shoppingList?.fakeHairCatalogMatches?.length ?? 0) > 0 ? (
                  (() => {
                    const match = shoppingList!.fakeHairCatalogMatches[0];
                    return (
                      <a
                        href={match.click_path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 flex items-center justify-between gap-3 border border-white/30 bg-white/5 p-3 transition-colors hover:border-white/60"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">
                            {match.brand_name} — {match.product_name}
                          </span>
                          <span className="mt-0.5 block text-xs text-white/60">
                            {[match.hair_type, match.matched_color, match.packs_length_label]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </span>
                        <span className="shrink-0 rounded-full bg-green/20 px-2.5 py-1 text-xs font-semibold text-green">
                          {match.score}
                        </span>
                      </a>
                    );
                  })()
                ) : (
                  <div className="mt-3">
                    <p className="text-sm text-white/70">we&apos;re sourcing this for your texture - check back soon</p>
                    <a
                      href={`mailto:hey@qoyl.live?subject=${encodeURIComponent(
                        `Notify me: ${detected.style_name} hair product`
                      )}&body=${encodeURIComponent(
                        `Please let me know when a ${detected.fake_hair_type ?? detected.style_name} product match is available.`
                      )}`}
                      className="mt-2 inline-block border border-white/40 px-4 py-2 text-xs font-medium transition-colors hover:border-white"
                    >
                      notify me →
                    </a>
                  </div>
                )}
              </div>
            )}

            {(detected.requires_fake_hair || selectedInstallType) && (
              <div className="mt-4 border border-dark bg-white p-4">
                <p className="font-mono uppercase tracking-widest text-muted" style={{ fontSize: "9px" }}>
                  best install tutorial for your hair type
                </p>
                {(() => {
                  // Bug fix: the style's own tutorial_url only wins when
                  // the user either hasn't picked an install type yet, or
                  // picked one the style's own catalog row actually lists -
                  // picking "wig" on a style whose catalog default is a
                  // wash-and-go tutorial no longer shows that wash-and-go
                  // video. selectedInstallType's own search (ytParams
                  // above, already live-fetched into youtubeVideos) wins
                  // once the user has picked something off-catalog.
                  const styleOwnTutorialApplies =
                    !selectedInstallType || (matchedCatalogStyle?.install_types ?? []).includes(selectedInstallType);
                  const overrideId =
                    styleOwnTutorialApplies && matchedCatalogStyle?.tutorial_url
                      ? extractYouTubeId(matchedCatalogStyle.tutorial_url)
                      : null;
                  const video = overrideId
                    ? { videoId: overrideId, title: "Recommended install tutorial" }
                    : youtubeVideos[0]
                    ? { videoId: youtubeVideos[0].videoId, title: youtubeVideos[0].title }
                    : null;
                  if (tutorialsLoading && !video) {
                    return <p className="mt-2 text-sm text-dark/50">Loading tutorial...</p>;
                  }
                  if (!video) {
                    return selectedInstallType ? (
                      <a
                        href={tutorialSearchFallbackUrl(selectedInstallType, hairProfile?.curl_type ?? null)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block font-mono text-bronze2 underline underline-offset-2 hover:text-dark"
                        style={{ fontSize: "11px" }}
                      >
                        search youtube for a {installTypeLabel(selectedInstallType)} tutorial →
                      </a>
                    ) : (
                      <p className="mt-2 font-mono text-dark/40" style={{ fontSize: "11px" }}>
                        tutorial coming soon
                      </p>
                    );
                  }
                  return (
                    <a
                      href={`https://www.youtube.com/watch?v=${video.videoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 flex items-center gap-3"
                    >
                      <img
                        src={`https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`}
                        alt={video.title}
                        className="h-16 w-28 shrink-0 object-cover"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-dark">{video.title}</span>
                        <span className="mt-1 block text-xs font-semibold text-bronze2 underline underline-offset-2">
                          watch on youtube →
                        </span>
                      </span>
                    </a>
                  );
                })()}
              </div>
            )}

            <div className="mt-6">
              <ShareWithStylistCard matchId={matchId} onShowToast={showToast} />
            </div>

            <div className="mt-6 flex flex-wrap gap-2 border-b border-bronze/20">
              {(["tutorials", "color", "shopping", "stylist"] as ResultTab[])
                .filter((tab) => tab !== "color" || colorMatch === true)
                .map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                      activeTab === tab ? "border-b-2 border-bronze text-dark" : "text-dark/50 hover:text-dark/80"
                    }`}
                  >
                    {tab === "tutorials"
                      ? "Tutorials"
                      : tab === "color"
                      ? "Color"
                      : tab === "shopping"
                      ? "Shopping List"
                      : "Book a Stylist"}
                  </button>
                ))}
            </div>

            {activeTab === "tutorials" && (
              <div className="mt-6 space-y-8">
                {styleTranslation && (
                  <div className="border-b-2 border-dark bg-white pb-4">
                    <p className="font-sans font-bold lowercase text-dark" style={{ fontSize: "14px" }}>
                      {detected.style_name.toLowerCase()} on {styleTranslation.hair_family} hair means{" "}
                      {styleTranslation.translation_headline.toLowerCase()}
                    </p>
                  </div>
                )}

                {tutorialsLoading && <p className="text-sm text-dark/50">Loading tutorials...</p>}

                {!tutorialsLoading && internalTutorials.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-bronze">From Qoyl</p>
                    <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {internalTutorials.map((post) => (
                        <PostCard key={post.slug} post={post} compact />
                      ))}
                    </div>
                  </div>
                )}

                {!tutorialsLoading && youtubeVideos.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-bronze">From YouTube</p>
                    <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {youtubeVideos.map((v) => (
                        <a
                          key={v.videoId}
                          href={`https://www.youtube.com/watch?v=${v.videoId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-col overflow-hidden rounded-xl border border-bronze/30 transition-colors hover:border-bronze"
                        >
                          <div className="relative h-28 w-full bg-[#f5f5f5]">
                            {v.thumbnailUrl && <Image src={v.thumbnailUrl} alt={v.title} fill className="object-cover" />}
                          </div>
                          <div className="flex flex-1 flex-col gap-1 p-4">
                            <p className="line-clamp-2 font-serif text-sm text-dark">{v.title}</p>
                            <p className="text-xs text-dark/50">{v.channelTitle}</p>
                            <span className="mt-1 text-xs text-bronze2">Watch on YouTube →</span>
                          </div>
                        </a>
                      ))}
                    </div>
                    <p className="mt-3 text-[10px] text-dark/40">Videos from YouTube - not affiliated with Qoyl.</p>
                  </div>
                )}

                {!tutorialsLoading && internalTutorials.length === 0 && youtubeVideos.length === 0 && (
                  <p className="text-sm text-dark/50">No tutorials found for this style yet.</p>
                )}
              </div>
            )}

            {activeTab === "color" && (
              <div className="mt-6 space-y-6">
                <div className="border-l-[3px] border-bronze bg-amber/10 px-4 py-3">
                  <p className="text-sm font-medium leading-relaxed text-dark/90">
                    Professional recommendation: Color services - especially lightening or
                    bleaching - should be done by a licensed colorist. DIY color on textured hair
                    carries significant risk of damage. The tutorials below are for reference.
                    Please consult a professional.
                  </p>
                </div>

                {colorMapsUrl && (
                  <a
                    href={colorMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block border border-bronze/40 px-4 py-2 text-sm font-semibold text-dark transition-colors hover:border-bronze"
                  >
                    Find a colorist near me →
                  </a>
                )}

                {colorVideosLoading && <p className="text-sm text-dark/50">Loading color tutorials...</p>}

                {!colorVideosLoading && colorVideos.length > 0 && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {colorVideos.map((v) => (
                      <a
                        key={v.videoId}
                        href={`https://www.youtube.com/watch?v=${v.videoId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col overflow-hidden rounded-xl border border-bronze/30 transition-colors hover:border-bronze"
                      >
                        <div className="relative h-28 w-full bg-[#f5f5f5]">
                          {v.thumbnailUrl && <Image src={v.thumbnailUrl} alt={v.title} fill className="object-cover" />}
                        </div>
                        <div className="flex flex-1 flex-col gap-1 p-4">
                          <p className="line-clamp-2 font-serif text-sm text-dark">{v.title}</p>
                          <p className="text-xs text-dark/50">{v.channelTitle}</p>
                          <span className="mt-1 text-xs text-bronze2">Watch on YouTube →</span>
                        </div>
                      </a>
                    ))}
                  </div>
                )}

                {!colorVideosLoading && colorVideos.length === 0 && (
                  <p className="text-sm text-dark/50">No color tutorials found yet.</p>
                )}
              </div>
            )}

            {activeTab === "shopping" && (
              <div className="mt-6 space-y-8">
                {shoppingLoading && <p className="text-sm text-dark/50">Building your shopping list...</p>}

                {!shoppingLoading && shoppingList && (
                  <>
                    {shoppingList.showFakeHairSection && shoppingList.fakeHairCatalogMatches.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-bronze">What you will need</p>
                        <ul className="mt-3 space-y-3">
                          {shoppingList.fakeHairCatalogMatches.map((item) => (
                            <li key={item.id} className="border border-bronze/30 px-4 py-3">
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-serif text-base text-dark">{item.brand_name}</p>
                                {item.is_featured && (
                                  <span className="rounded-full border border-bronze/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-bronze2">
                                    Featured
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-sm text-dark">{item.product_name}</p>
                              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-dark/60">
                                {item.color_matched && (
                                  <span className="text-green">
                                    Color matched to your hair{item.matched_color ? ` (${item.matched_color})` : ""}
                                  </span>
                                )}
                                {item.packs_recommended !== null && (
                                  <span>
                                    {item.packs_recommended} pack{item.packs_recommended === 1 ? "" : "s"} for{" "}
                                    {item.packs_length_label}
                                  </span>
                                )}
                                {item.price_per_pack_usd !== null && <span>${item.price_per_pack_usd} per pack</span>}
                              </div>
                              <a
                                href={item.click_path}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 inline-block text-xs text-bronze2 underline"
                              >
                                Shop →
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {shoppingList.showFakeHairSection &&
                      shoppingList.fakeHairCatalogMatches.length === 0 &&
                      shoppingList.fakeHair.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold uppercase tracking-widest text-bronze">What you will need</p>
                          {shoppingList.fakeHairPreferenceWarning && (
                            <span className="rounded-full border border-red/50 px-2 py-0.5 text-[10px] font-medium text-red">
                              {shoppingList.fakeHairPreferenceWarning}
                            </span>
                          )}
                        </div>
                        {shoppingList.fakeHairPreferenceNote && (
                          <p className="mt-2 text-xs text-dark/70">{shoppingList.fakeHairPreferenceNote}</p>
                        )}
                        <ul className="mt-3 space-y-3">
                          {shoppingList.fakeHair.map((item) => (
                            <li key={item.name} className="border border-bronze/30 px-4 py-3">
                              <p className="text-sm text-dark">{item.name}</p>
                              <p className="mt-1 text-xs text-dark/60">{item.description}</p>
                              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-dark/50">
                                <span>{item.packsNeeded}</span>
                                <span>{item.priceRange}</span>
                              </div>
                              <div className="mt-2 flex items-center gap-2">
                                <span className="rounded-full border border-bronze/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-bronze2">
                                  {item.retailer}
                                </span>
                                <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-bronze2 underline">
                                  Shop on Amazon →
                                </a>
                              </div>
                            </li>
                          ))}
                        </ul>
                        {shoppingList.fakeHairPricingNote && (
                          <p className="mt-3 text-xs text-amber">{shoppingList.fakeHairPricingNote}</p>
                        )}
                        {shoppingList.fakeHairPreferenceTip && (
                          <p className="mt-2 text-xs text-bronze2">Tip: {shoppingList.fakeHairPreferenceTip}</p>
                        )}
                        <a
                          href={shoppingList.fakeHairGenericSearchUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-block text-xs text-bronze2 underline"
                        >
                          search amazon →
                        </a>
                        <p className="mt-1 text-xs text-dark/50">
                          no matched brands yet for this style — generic search shown
                        </p>
                        {shoppingList.fakeHairColorNote && (
                          <p className="mt-2 font-mono text-[9px] lowercase text-[#888]">
                            {shoppingList.fakeHairColorNote}
                          </p>
                        )}
                        {shoppingList.fakeHairNote && <p className="mt-3 text-xs text-dark/50">{shoppingList.fakeHairNote}</p>}
                        {shoppingList.fakeHairTip && (
                          <p className="mt-2 text-xs text-bronze2">Tip: {shoppingList.fakeHairTip}</p>
                        )}
                      </div>
                    )}

                    {shoppingList.naturalHairAlternativeNote && (
                      <div className="border border-bronze/30 bg-warm/10 px-4 py-3">
                        <p className="text-sm text-dark/90">{shoppingList.naturalHairAlternativeNote}</p>
                        {shoppingList.naturalHairAlternativeStyles.length > 0 && (
                          <ul className="mt-2 flex flex-wrap gap-2">
                            {shoppingList.naturalHairAlternativeStyles.map((style) => (
                              <li
                                key={style}
                                className="rounded-full border border-bronze/40 px-3 py-1 text-xs text-bronze2"
                              >
                                {style}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}

                    {shoppingList.lengthExtensionOptions.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-bronze">Additional Length Options</p>
                        <ul className="mt-3 space-y-2">
                          {shoppingList.lengthExtensionOptions.map((item) => (
                            <li key={item.name} className="flex items-center justify-between border border-bronze/30 px-4 py-3">
                              <span className="text-sm text-dark">{item.name}</span>
                              <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-bronze2 underline">
                                {item.retailer} →
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {shoppingList.brandProducts.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-bronze">Qoyl Partner Brands</p>
                        <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {shoppingList.brandProducts.map((item) => (
                            <li
                              key={item.id}
                              className="border border-bronze/40 bg-cream px-4 py-3 shadow-sm"
                            >
                              <div className="flex items-start gap-3">
                                {item.imageUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={item.imageUrl}
                                    alt={item.name}
                                    className="h-14 w-14 shrink-0 rounded-md border border-bronze/20 object-cover"
                                  />
                                ) : (
                                  <BrandLogo
                                    brandName={item.brandName}
                                    domain={item.brandDomain}
                                    size={56}
                                    className="shrink-0"
                                  />
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="font-sans text-[13px] font-medium text-dark">{item.name}</p>
                                    {item.priceUsd != null && (
                                      <span className="shrink-0 text-sm font-semibold text-bronze">
                                        ${item.priceUsd}
                                      </span>
                                    )}
                                  </div>
                                  <p className="mt-0.5 text-[11px] text-dark/50">{item.brandName}</p>
                                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                    {item.isFeatured && (
                                      <span className="rounded-full border border-[#B08D57] bg-[#B08D57]/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#8A6D3B]">
                                        Qoyl Partner Brand
                                      </span>
                                    )}
                                    {item.score != null ? (
                                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${TIER_CLASSES[scoreTier(item.score)]}`}>
                                        {item.score}/100
                                      </span>
                                    ) : (
                                      <Link href="/search" className="text-[10px] text-bronze2 underline">
                                        Add to your Qoyl profile for a compatibility score →
                                      </Link>
                                    )}
                                  </div>
                                  <div className="mt-2 flex flex-wrap gap-3">
                                    <a
                                      href={`/api/brand-products/click/${item.id}?via=brand${matchId ? `&style_match_id=${matchId}` : ""}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs font-medium text-bronze2 underline"
                                    >
                                      Shop at {item.brandName} →
                                    </a>
                                    {item.shopperUrl && (
                                      <a
                                        href={`/api/brand-products/click/${item.id}?via=shopper${matchId ? `&style_match_id=${matchId}` : ""}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs font-medium text-bronze2 underline"
                                      >
                                        Shop at Shopper →
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-bronze">Hair Care Products</p>
                      <ul className="mt-3 space-y-2">
                        {shoppingList.hairCare.map((item) => (
                          <li key={item.catalogProductId} className="border border-bronze/30 px-4 py-3">
                            <div className="flex items-start gap-3">
                              <BrandLogo
                                brandName={item.brand}
                                domain={item.brandDomain}
                                size={40}
                                className="mt-0.5 shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-sm text-dark">{item.name}</p>
                                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${TIER_CLASSES[scoreTier(item.score)]}`}>
                                    {item.score}
                                  </span>
                                </div>
                                <p className="text-xs text-dark/50">
                                  {item.brand} · {item.categoryLabel}
                                </p>
                                {addedProductIds.has(item.catalogProductId) ? (
                                  <span className="mt-2 inline-flex items-center gap-1 text-xs text-bronze font-medium">
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6l3 3 5-5"/></svg>
                                    Added to cart
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-cream bg-bronze px-2.5 py-1 hover:bg-bronze2 transition-colors"
                                    onClick={() => {
                                      const cartItem: CartItem = {
                                        product_id: item.catalogProductId,
                                        product_name: item.name,
                                        product_type: "product",
                                        seller_type: "amazon",
                                        seller_url: `https://www.amazon.com/s?k=${encodeURIComponent(`${item.brand} ${item.name}`)}`,
                                        affiliate_url: null,
                                        price_estimate: item.price_usd ?? null,
                                        compat_score: item.score,
                                        quantity: 1,
                                        status: "pending",
                                        image_url: item.image_url ?? null,
                                        secondary_category_labels: item.secondary_category_labels,
                                      };
                                      storeCart.add(cartItem);
                                      setStoreCartCount(storeCart.count());
                                      setAddedProductIds((prev) => { const next = new Set(prev); next.add(item.catalogProductId); return next; });
                                    }}
                                  >
                                    + Add to cart
                                  </button>
                                )}
                              </div>
                            </div>
                          </li>
                        ))}
                        {shoppingList.hairCare.length === 0 && shoppingList.brandProducts.length === 0 && (
                          <p className="text-sm text-dark/50">No matching products found yet.</p>
                        )}
                      </ul>
                    </div>

                    {shoppingList.amazonFallback.length > 0 && (
                      <div>
                        <ul className="mt-1 space-y-1.5">
                          {shoppingList.amazonFallback.map((item) => (
                            <li
                              key={item.name}
                              className="flex items-center justify-between rounded-lg border border-cream/10 bg-white/40 px-3 py-2"
                            >
                              <div>
                                <p className="text-xs text-dark/70">{item.name}</p>
                                <p className="text-[10px] uppercase tracking-wide text-dark/30">Search Amazon</p>
                              </div>
                              <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-dark/50 underline shrink-0">
                                View →
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-bronze">Tools</p>
                      <ul className="mt-3 space-y-2">
                        {shoppingList.tools.map((item) => (
                          <li key={item.name} className="border border-bronze/30 px-4 py-3 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-dark">{item.name}</span>
                              {item.catalogProductId ? (
                                <a href={item.url} className="shrink-0 ml-3 bg-bronze px-2.5 py-1 font-sans font-semibold lowercase text-cream transition-colors hover:bg-bronze2" style={{ fontSize: "11px" }}>
                                  qoyl store →
                                </a>
                              ) : (
                                <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-bronze2 underline shrink-0 ml-3">
                                  {item.retailer} →
                                </a>
                              )}
                            </div>
                            {item.whyItMatters && (
                              <p className="text-xs text-dark/60 leading-relaxed">{item.whyItMatters}</p>
                            )}
                            {item.priceRange && (
                              <p className="text-xs text-dark/40">{item.priceRange}</p>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {shoppingList.accessories.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-bronze">Accessories</p>
                        <ul className="mt-3 space-y-2">
                          {shoppingList.accessories.map((item) => (
                            <li key={item.name} className="flex items-center justify-between border border-bronze/30 px-4 py-3">
                              <span className="text-sm text-dark">{item.name}</span>
                              {item.catalogProductId ? (
                                <a href={item.url} className="shrink-0 ml-3 bg-bronze px-2.5 py-1 font-sans font-semibold lowercase text-cream transition-colors hover:bg-bronze2" style={{ fontSize: "11px" }}>
                                  qoyl store →
                                </a>
                              ) : (
                                <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-bronze2 underline">
                                  {item.retailer} →
                                </a>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Store CTA */}
                    <a
                      href="/store"
                      className="flex items-center justify-between border border-bronze/30 bg-cream/60 px-4 py-3 text-sm text-dark hover:bg-cream"
                    >
                      <span>Browse the qoyl store for all recommended products</span>
                      <span className="font-mono text-[11px] text-bronze2">shop →</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => handleComplete("diy", null)}
                      disabled={savingChoice === "diy" || savedChoice !== null || !matchId}
                      className="w-full bg-bronze py-3 text-sm font-semibold text-cream transition-colors hover:bg-bronze2 disabled:opacity-60"
                    >
                      {savedChoice ? "Saved to your profile ✓" : savingChoice === "diy" ? "Saving..." : "Save this shopping list to my profile →"}
                    </button>
                  </>
                )}
              </div>
            )}

            {activeTab === "stylist" && (
              <div className="mt-6 space-y-4">
                <ShareWithStylistCard matchId={matchId} onShowToast={showToast} compact />

                {stylistsLoading && <p className="text-sm text-dark/50">Finding stylists near you...</p>}

                {!stylistsLoading && stylists.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setHumanHairOnlyFilter((prev) => !prev)}
                    aria-pressed={humanHairOnlyFilter}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      humanHairOnlyFilter
                        ? "border-bronze bg-bronze/20 text-cream"
                        : "border-bronze/40 text-dark/70 hover:border-bronze"
                    }`}
                  >
                    Human hair installs only
                  </button>
                )}

                {!stylistsLoading &&
                  humanHairOnlyFilter &&
                  stylists.filter((s) => s.matchedService?.hair_addition_types?.includes("human_hair_only"))
                    .length === 0 && (
                    <p className="text-xs text-dark/50">
                      No stylists have marked human hair services for this style yet.
                    </p>
                  )}

                {!stylistsLoading &&
                  stylists
                    .filter(
                      (s) =>
                        !humanHairOnlyFilter ||
                        s.matchedService?.hair_addition_types?.includes("human_hair_only")
                    )
                    .map((stylist) => (
                    <div key={stylist.id} className="rounded-xl border border-bronze/30 p-5">
                      <div className="flex items-start gap-4">
                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-[#f5f5f5]">
                          {stylist.photoUrl && <Image src={stylist.photoUrl} alt={stylist.displayName} fill className="object-cover" />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-serif text-lg text-dark">{stylist.displayName}</p>
                          {stylist.salonName && <p className="text-sm text-dark/60">{stylist.salonName}</p>}
                        </div>
                      </div>

                      {stylist.matchedService ? (
                        <div className="mt-3 bg-bronze/10 px-3 py-2.5">
                          <p className="text-sm font-medium text-dark">
                            {stylist.matchedService.name}
                            {stylist.matchedService.price_min != null &&
                              `: $${stylist.matchedService.price_min}-${stylist.matchedService.price_max ?? stylist.matchedService.price_min}`}
                            {stylist.matchedService.duration_min != null &&
                              ` · ${stylist.matchedService.duration_min}-${stylist.matchedService.duration_max} hours`}
                          </p>
                          {stylist.matchedService.deposit_required && (
                            <p className="mt-1 text-xs text-dark/60">
                              Deposit: {stylist.matchedService.deposit_amount != null ? `$${stylist.matchedService.deposit_amount}` : "Required"} to book
                            </p>
                          )}
                        </div>
                      ) : stylist.hasAnyServices ? (
                        <div className="mt-3 bg-bronze/10 px-3 py-2.5">
                          <p className="text-sm text-dark/80">
                            Contact for pricing on {detected?.style_name}
                          </p>
                          {stylist.otherServiceNames.length > 0 && (
                            <p className="mt-1 text-xs text-dark/50">
                              Other services: {stylist.otherServiceNames.join(", ")}
                            </p>
                          )}
                        </div>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => {
                          handleComplete("stylist", stylist.id);
                          if (stylist.bookingUrl) window.open(stylist.bookingUrl, "_blank", "noopener,noreferrer");
                        }}
                        disabled={savingChoice === "stylist" || !matchId}
                        className="mt-4 w-full bg-bronze py-3 text-sm font-semibold text-cream transition-colors hover:bg-bronze2 disabled:opacity-60"
                      >
                        {savedChoice === "stylist" ? "Booking request sent ✓" : "Book →"}
                      </button>
                    </div>
                  ))}

                {!stylistsLoading && stylists.length === 0 && (
                  <div className="rounded-xl border border-bronze/30 p-5">
                    <p className="text-sm text-dark/80">
                      No Qoyl stylists in your area yet for this style. Here is what to expect
                      when booking locally:
                    </p>

                    {marketEstimate ? (
                      <div className="mt-4 bg-bronze/10 px-4 py-3">
                        <p className="text-sm font-medium text-dark">
                          General market rate for {marketEstimate.styleName}
                        </p>
                        <p className="mt-1 text-sm text-dark/70">
                          ${marketEstimate.priceMin}-{marketEstimate.priceMax} ·{" "}
                          {marketEstimate.durationMin}-{marketEstimate.durationMax} hours
                        </p>
                        {marketEstimate.priceNotes && (
                          <p className="mt-1 text-xs text-dark/50">{marketEstimate.priceNotes}</p>
                        )}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-dark/50">
                        No market estimate available for this style yet.
                      </p>
                    )}

                    <div className="mt-4">
                      <StylistRecommendationBlock
                        userId={user?.id ?? null}
                        curlType={hairProfile?.curl_type ?? null}
                        city={stylistCityLabel}
                        styleSpecialty={detected?.style_name ?? null}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {cartId && cartItems.length > 0 && (
            <div className="-mx-6">
              <CompleteYourLookCart cartId={cartId} items={cartItems} />
            </div>
          )}
          </>
        )}
      </div>
      </div>

      {toast && <Toast message={toast} />}

      {tryOnOpen && referenceImageUrl && (
        <TryOnModal
          referenceImageUrl={referenceImageUrl}
          onClose={() => setTryOnOpen(false)}
        />
      )}

      {/* Floating cart bar — appears when user has added items to Qoyl store cart */}
      {storeCartCount > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "12px 20px 12px 16px",
            borderRadius: 100,
            background: "rgba(14,10,6,0.92)",
            backdropFilter: "blur(16px)",
            border: "1.5px solid rgba(200,168,106,0.35)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.38)",
            fontFamily: "'DM Sans', sans-serif",
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ fontSize: 13, color: "rgba(248,243,236,0.75)", letterSpacing: "0.02em" }}>
            {storeCartCount} {storeCartCount === 1 ? "item" : "items"} in your cart
          </span>
          <a
            href="/store/checkout"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 18px",
              borderRadius: 100,
              background: "rgba(200,168,106,0.92)",
              color: "#1A1410",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textDecoration: "none",
              transition: "background 0.15s",
            }}
          >
            Checkout
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2.5 6h7M6.5 3l3 3-3 3"/>
            </svg>
          </a>
        </div>
      )}
    </main>
  );
}

export default function StyleMatchPage() {
  return (
    <Suspense fallback={null}>
      <StyleMatchContent />
    </Suspense>
  );
}
