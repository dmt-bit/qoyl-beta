"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { COMMUNITY_PREFILL_KEY } from "@/components/CommunityGrid";
import PostCard, { Post } from "@/components/PostCard";
import ShopButton from "@/components/ShopButton";
import { useAuth } from "@/lib/auth-context";
import { TIER_CLASSES, curlFamily, scoreTier } from "@/lib/compatibility";
import {
  StyleShoppingList,
  buildStyleShoppingList,
} from "@/lib/styleShoppingList";
import { supabase } from "@/lib/supabase";
import { lookupCityState } from "@/lib/zipLookup";

type DetectedStyle = {
  style_name: string;
  style_description: string;
  hair_length: string;
  requires_fake_hair: boolean;
  fake_hair_type: string | null;
  accessories_visible: string[];
  estimated_time: string;
  difficulty: string;
  compatible_hair_types: string[];
  maintenance_tips: string;
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

type Stylist = {
  id: string;
  displayName: string;
  salonName: string | null;
  photoUrl: string | null;
  bookingUrl: string | null;
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
};

type MatchMode = "quick" | "deep";
type LengthDifference = "same" | "longer" | "shorter";
type InvolvesExtensions = "none" | "braiding_hair" | "sew_in" | "wig" | "not_sure";

type PageState =
  | "landing"
  | "inspo"
  | "deepSurvey"
  | "analyzing"
  | "confirm"
  | "results";
type ResultTab = "tutorials" | "color" | "shopping" | "stylist";

// Vibe/length tags for the inspo browse filters (Part 5). The `styles`
// table has no vibe/length columns -- this is editorial curation keyed
// by slug, not a derived/algorithmic attribute, so it's kept as a small
// local map rather than pretending it's a real database filter. Falls
// back to an empty tag set (never filtered out) for any style not in
// this list, e.g. ones added to the table later.
const VIBE_TAGS_BY_SLUG: Record<string, string[]> = {
  "bantu-knots": ["Protective", "Editorial", "Defined Curls"],
  "box-braids": ["Protective", "Low Maintenance"],
  "braid-out": ["Defined Curls", "Big and Voluminous"],
  "faux-locs": ["Protective", "Editorial", "Low Maintenance"],
  "goddess-braids": ["Protective", "Editorial", "Big and Voluminous"],
  "high-puff": ["Sleek and Smooth", "Low Maintenance"],
  "knotless-braids": ["Protective", "Low Maintenance"],
  locs: ["Protective", "Low Maintenance", "Editorial"],
  "passion-twists": ["Protective", "Big and Voluminous", "Editorial"],
  "silk-press": ["Sleek and Smooth"],
  "twist-out": ["Defined Curls", "Big and Voluminous"],
  "wash-and-go": ["Defined Curls", "Low Maintenance"],
};

const LENGTH_TAG_BY_SLUG: Record<string, string> = {
  "bantu-knots": "Short",
  "box-braids": "Long",
  "braid-out": "Medium",
  "faux-locs": "Long",
  "goddess-braids": "Medium",
  "high-puff": "Short",
  "knotless-braids": "Long",
  locs: "Long",
  "passion-twists": "Long",
  "silk-press": "Medium",
  "twist-out": "Medium",
  "wash-and-go": "Medium",
};

const VIBE_OPTIONS = [
  "Protective",
  "Defined Curls",
  "Sleek and Smooth",
  "Big and Voluminous",
  "Editorial",
  "Low Maintenance",
  "Colorful",
];
const LENGTH_OPTIONS = ["Short", "Medium", "Long"];

// Matches supabase/create_style_match.sql's seeded rows exactly, so the
// browse experience is identical whether or not the styles table has
// data -- this is only the true fallback if that table is ever emptied.
const STATIC_STYLES: StyleRow[] = [
  { id: "static-box-braids", name: "Box Braids", slug: "box-braids", description: "Classic protective braided style.", hair_types_compatible: ["3c", "4a", "4b", "4c"], requires_fake_hair: true, estimated_time: "4-8 hours", difficulty: "intermediate" },
  { id: "static-knotless-braids", name: "Knotless Braids", slug: "knotless-braids", description: "Braids without the tension of a knot base.", hair_types_compatible: ["3c", "4a", "4b", "4c"], requires_fake_hair: true, estimated_time: "5-9 hours", difficulty: "intermediate" },
  { id: "static-wash-and-go", name: "Wash and Go", slug: "wash-and-go", description: "Low-manipulation style enhancing natural curls.", hair_types_compatible: ["2c", "3a", "3b", "3c", "4a"], requires_fake_hair: false, estimated_time: "30-60 minutes", difficulty: "beginner" },
  { id: "static-twist-out", name: "Twist Out", slug: "twist-out", description: "Defined curls from unraveled twists.", hair_types_compatible: ["3a", "3b", "3c", "4a", "4b", "4c"], requires_fake_hair: false, estimated_time: "2-4 hours", difficulty: "beginner" },
  { id: "static-braid-out", name: "Braid Out", slug: "braid-out", description: "Defined waves/curls from unraveled braids.", hair_types_compatible: ["3b", "3c", "4a", "4b", "4c"], requires_fake_hair: false, estimated_time: "2-4 hours", difficulty: "beginner" },
  { id: "static-bantu-knots", name: "Bantu Knots", slug: "bantu-knots", description: "Coiled knots, worn as-is or unraveled for curls.", hair_types_compatible: ["3c", "4a", "4b", "4c"], requires_fake_hair: false, estimated_time: "1-2 hours", difficulty: "beginner" },
  { id: "static-faux-locs", name: "Faux Locs", slug: "faux-locs", description: "Temporary locs wrapped over natural hair.", hair_types_compatible: ["3c", "4a", "4b", "4c"], requires_fake_hair: true, estimated_time: "6-10 hours", difficulty: "advanced" },
  { id: "static-passion-twists", name: "Passion Twists", slug: "passion-twists", description: "Bohemian-textured protective twists.", hair_types_compatible: ["3c", "4a", "4b", "4c"], requires_fake_hair: true, estimated_time: "4-7 hours", difficulty: "intermediate" },
  { id: "static-goddess-braids", name: "Goddess Braids", slug: "goddess-braids", description: "Thick, raised cornrow-style braids.", hair_types_compatible: ["3c", "4a", "4b", "4c"], requires_fake_hair: true, estimated_time: "2-4 hours", difficulty: "intermediate" },
  { id: "static-high-puff", name: "High Puff", slug: "high-puff", description: "Sleek gathered puff at the crown.", hair_types_compatible: ["3b", "3c", "4a", "4b", "4c"], requires_fake_hair: false, estimated_time: "15-30 minutes", difficulty: "beginner" },
  { id: "static-locs", name: "Locs", slug: "locs", description: "Permanent coiled/matted rope-like strands.", hair_types_compatible: ["4a", "4b", "4c"], requires_fake_hair: false, estimated_time: "Months to years", difficulty: "advanced" },
  { id: "static-silk-press", name: "Silk Press", slug: "silk-press", description: "Heat-straightened natural hair.", hair_types_compatible: ["3a", "3b", "3c", "4a", "4b", "4c"], requires_fake_hair: false, estimated_time: "1-3 hours", difficulty: "intermediate" },
];

function CameraIcon() {
  return (
    <svg className="h-6 w-6 text-bronze2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.132.175C3.098 7.58 2.25 8.507 2.25 9.605v9.145c0 1.152.938 2.25 2.25 2.25h15c1.313 0 2.25-1.098 2.25-2.25V9.605c0-1.098-.848-2.026-1.803-2.2a41.03 41.03 0 00-1.132-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.235 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
    </svg>
  );
}
function PencilIcon() {
  return (
    <svg className="h-6 w-6 text-bronze2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
  );
}
function CompassIcon() {
  return (
    <svg className="h-6 w-6 text-bronze2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 9l-3.5 1.5L10 14l3.5-1.5L15 9z" />
    </svg>
  );
}
function LightningIcon() {
  return (
    <svg className="h-6 w-6 text-bronze2" fill="currentColor" viewBox="0 0 24 24">
      <path d="M13 2L3 14h7l-1 8 11-14h-7l0-6z" />
    </svg>
  );
}
function SparkleIcon() {
  return (
    <svg className="h-6 w-6 text-bronze2" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2l1.8 5.4L19 9l-5.2 1.6L12 16l-1.8-5.4L5 9l5.2-1.6L12 2zM19 14l.9 2.6L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.4L19 14zM5 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z" />
    </svg>
  );
}
function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      className={`h-6 w-6 transition-colors ${filled ? "text-bronze" : "text-cream/50"}`}
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

function CheckListIcon() {
  return (
    <svg className="h-6 w-6 text-bronze2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg className="h-6 w-6 text-cream/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 8.25L12 3.75 7.5 8.25M12 3.75v12" />
    </svg>
  );
}

function DemoSection() {
  return (
    <div className="mt-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-bronze">How it works</p>
      <h2 className="mt-2 font-serif text-2xl font-semibold text-cream">
        Your complete style plan in under 30 seconds
      </h2>

      <div className="no-scrollbar -mx-4 mt-5 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
        <div className="w-[85%] shrink-0 snap-center rounded-xl bg-[#2C2420] p-5 sm:w-auto">
          <div className="flex items-center justify-between">
            <span className="font-serif text-2xl text-bronze">1</span>
            <CameraIcon />
          </div>
          <p className="mt-3 text-sm text-cream/80">
            Upload a photo of the style you want or describe it in words
          </p>
          <div className="mt-4 flex h-28 items-center justify-center rounded-2xl border-2 border-cream/20">
            <UploadIcon />
          </div>
        </div>

        <div className="w-[85%] shrink-0 snap-center rounded-xl bg-[#2C2420] p-5 sm:w-auto">
          <div className="flex items-center justify-between">
            <span className="font-serif text-2xl text-bronze">2</span>
            <SparkleIcon />
          </div>
          <p className="mt-3 text-sm text-cream/80">
            Claude identifies the style, difficulty, time required, and what you need
          </p>
          <div className="mt-4 rounded-lg bg-dark p-3">
            <p className="font-serif text-sm text-cream">Knotless Braids</p>
            <div className="mt-2 flex gap-1.5">
              <span className="rounded-full border border-bronze/40 px-2 py-0.5 text-[9px] text-bronze2">Intermediate</span>
              <span className="rounded-full border border-bronze/40 px-2 py-0.5 text-[9px] text-bronze2">5-9 hrs</span>
            </div>
          </div>
        </div>

        <div className="w-[85%] shrink-0 snap-center rounded-xl bg-[#2C2420] p-5 sm:w-auto">
          <div className="flex items-center justify-between">
            <span className="font-serif text-2xl text-bronze">3</span>
            <CheckListIcon />
          </div>
          <p className="mt-3 text-sm text-cream/80">
            Tutorials from real creators, a shopping list scored for your hair, and a local
            stylist if available
          </p>
          <div className="mt-4 flex gap-1.5">
            {["Tutorials", "Shopping List", "Stylist"].map((label) => (
              <div key={label} className="flex-1 rounded-lg bg-dark px-1.5 py-3 text-center">
                <p className="text-[9px] font-medium text-cream/70">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalyzingOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-dark/95 font-sans">
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-3 w-3 animate-bounce rounded-full bg-bronze" style={{ animationDelay: `${i * 150}ms` }} />
        ))}
      </div>
      <p className="mt-6 font-serif text-xl text-cream">Analyzing your style...</p>
      <p className="mt-2 text-sm text-cream/60">This takes about 10 seconds</p>
    </div>
  );
}

function Toast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-bronze px-4 py-2 text-sm font-semibold text-dark shadow-lg">
      {message}
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
      <span className="block text-sm font-medium text-cream">{label}</span>
      {subtext && <span className="mt-1 block text-xs leading-snug text-cream/60">{subtext}</span>}
    </button>
  );
}

function fileToBase64(file: File): Promise<{ base64: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] ?? "";
      resolve({ base64, mediaType: file.type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function UpgradeWallContent({ userId, userEmail }: { userId: string; userEmail: string | null | undefined }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUnlock() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_type: "routine_subscription", user_id: userId, email: userEmail }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Couldn't reach the server. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="font-serif text-[28px] font-semibold text-cream">Unlock unlimited Style Match</h1>
      <p className="mt-2 text-sm text-cream/70">
        Your first match is free. Upgrade to the Qoyl routine subscription for unlimited style
        matches, your personalized monthly routine, and a curated product list — all in one.
      </p>
      <p className="mt-3 text-sm text-cream/70">
        Add your hair photos to your profile and Style Match will use them to show you
        exactly what any style would take starting from your current hair.
      </p>

      <ul className="mt-6 space-y-2.5">
        {[
          "Unlimited Style Match — photo or text, any style, any time",
          "30-day personalized wash day calendar",
          "Monthly curated product list scored for your hair",
        ].map((b) => (
          <li key={b} className="flex items-start gap-2 text-sm text-cream/80">
            <span className="mt-0.5 text-bronze2">✓</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>

      {error && <p className="mt-3 text-sm text-red">{error}</p>}

      <button
        type="button"
        onClick={handleUnlock}
        disabled={loading}
        className="mt-6 w-full rounded-lg bg-bronze py-4 text-base font-semibold text-dark transition-colors hover:bg-bronze2 disabled:opacity-50"
      >
        {loading ? "Redirecting..." : "Unlock for $7.99/month →"}
      </button>

      <Link href="/auth" className="mt-4 block text-center text-xs text-cream/50 underline underline-offset-2 hover:text-cream/70">
        Already subscribed? Sign in to access Style Match →
      </Link>
    </div>
  );
}

function StyleMatchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, hairProfile, hairProfileLoading, refreshHairProfile } = useAuth();

  const resolvingAccess = authLoading || (Boolean(user) && hairProfileLoading);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/auth");
      return;
    }
    if (hairProfileLoading) return;
    if (!hairProfile) {
      router.replace("/profile");
    }
  }, [user, authLoading, hairProfile, hairProfileLoading, router]);

  // Entitlement (Part 1 paywall)
  const [subscribed, setSubscribed] = useState(false);
  const [entitlementLoaded, setEntitlementLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/purchases?user_id=${user.id}`);
        const data = await res.json();
        if (!cancelled) setSubscribed(Boolean(data.hasRoutineSubscription));
      } catch {
        // Fail closed -- treat as not subscribed.
      } finally {
        if (!cancelled) setEntitlementLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const styleMatchCount = hairProfile?.style_match_count ?? 0;
  const canRunMatch = subscribed || styleMatchCount < 1;
  const showUpgradeWall = entitlementLoaded && !resolvingAccess && !canRunMatch;
  const [justUsedFreeMatch, setJustUsedFreeMatch] = useState(false);

  // Part 2: whether the user has any hair photo on file -- drives the
  // "add a hair photo" nudge on the landing screen. The analyze route
  // does its own lookup regardless of this; this is just for the UI hint.
  const [hasHairPhoto, setHasHairPhoto] = useState<boolean | null>(null);
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

  // Landing input state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [textDescription, setTextDescription] = useState("");
  const [matchMode, setMatchMode] = useState<MatchMode>("quick");

  // Pre-fill from a saved style ("Match this style ->", Part 4) -- fills
  // the text input but doesn't auto-submit, unlike inspo cards below.
  useEffect(() => {
    const prefill = searchParams.get("prefill");
    if (prefill) setTextDescription(prefill);
  }, [searchParams]);

  // Pre-fill from a community photo's "Style Match this ->" button --
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
      setPrefilledImage(parsed);
      setImagePreviewUrl(`data:${parsed.mediaType};base64,${parsed.base64}`);
    } catch {
      // Malformed/stale sessionStorage value -- ignore, user can still
      // upload a photo normally.
    }
  }, [searchParams]);

  // Deep Match survey state (Part 2)
  const [deepStep, setDeepStep] = useState(1);
  const [colorMatch, setColorMatch] = useState<boolean | null>(null);
  const [lengthDifference, setLengthDifference] = useState<LengthDifference | null>(null);
  const [wantsLengthExtensions, setWantsLengthExtensions] = useState(true);
  const [involvesExtensions, setInvolvesExtensions] = useState<InvolvesExtensions | null>(null);
  const [translateForHairType, setTranslateForHairType] = useState<boolean | null>(null);

  const [detected, setDetected] = useState<DetectedStyle | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [savedStyleId, setSavedStyleId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

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
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [stylistsLoading, setStylistsLoading] = useState(false);

  const completedRef = useRef(false);
  const [savingChoice, setSavingChoice] = useState<"diy" | "stylist" | null>(null);
  const [savedChoice, setSavedChoice] = useState<"diy" | "stylist" | null>(null);

  // Inspo mode state (Part 5)
  const [inspoStyles, setInspoStyles] = useState<StyleRow[]>([]);
  const [inspoLoading, setInspoLoading] = useState(false);
  const [selectedVibes, setSelectedVibes] = useState<string[]>([]);
  const [selectedLength, setSelectedLength] = useState<string | null>(null);

  function resetToLanding() {
    setPageState("landing");
    setDetected(null);
    setError(null);
    setImageFile(null);
    setImagePreviewUrl(null);
    setTextDescription("");
    setMatchMode("quick");
    setDeepStep(1);
    setColorMatch(null);
    setLengthDifference(null);
    setWantsLengthExtensions(true);
    setInvolvesExtensions(null);
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
    setJustUsedFreeMatch(false);
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  }

  async function analyze(body: Record<string, unknown>, inputType: "photo" | "text") {
    if (!canRunMatch) {
      setPageState("landing");
      return;
    }

    setError(null);
    setPageState("analyzing");

    try {
      const res = await fetch("/api/style-match/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        // user_id lets the route pull in the user's most recent hair
        // photo (Part 2) -- harmless to always send, the route just
        // falls back to the single-image/text flow if there's no photo.
        body: JSON.stringify({ ...body, user_id: user?.id }),
      });
      const data = await res.json();

      if (!res.ok) {
        // data.detail is server debug info (see app/api/style-match/
        // analyze/route.ts) -- appended when present so the actual
        // failure is visible without needing to check server logs.
        const base = data.error ?? "Couldn't analyze this style. Please try again.";
        setError(data.detail ? `${base} (${data.detail})` : base);
        setPageState("landing");
        return;
      }

      setDetected(data as DetectedStyle);

      // Free-match gate: only the first match for a non-subscriber
      // consumes/increments the counter. Mirrors app/search/page.tsx's
      // daily_search_count update -- a direct client-side update against
      // the signed-in user's own hair_profiles row.
      if (!subscribed && styleMatchCount < 1 && user) {
        setJustUsedFreeMatch(true);
        const { error: incrementError } = await supabase
          .from("hair_profiles")
          .update({ style_match_count: styleMatchCount + 1 })
          .eq("user_id", user.id);
        if (incrementError) console.error("Failed to increment style_match_count:", incrementError);
        else await refreshHairProfile();
      }

      // Create the style_matches row now (not only once the user saves/
      // books) so the heart/save button on the confirm screen has a real
      // id to attach to -- see app/api/style-match/create/route.ts.
      if (user) {
        try {
          const createRes = await fetch("/api/style-match/create", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              user_id: user.id,
              input_type: inputType,
              input_text: inputType === "text" ? (body.text as string) : null,
              image_url: (data as DetectedStyle).image_url ?? null,
              detected_style: (data as DetectedStyle).style_name,
              detected_details: data,
              match_mode: matchMode,
              color_match: Boolean(colorMatch),
              length_difference: lengthDifference,
              involves_extensions: involvesExtensions,
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
    } catch {
      setError("Couldn't reach the style analysis service. Please try again.");
      setPageState("landing");
    }
  }

  async function handleSubmitPhoto() {
    if (!imageFile && !prefilledImage) return;
    const { base64, mediaType } = imageFile ? await fileToBase64(imageFile) : prefilledImage!;
    const deepFields =
      matchMode === "deep"
        ? {
            color_match: colorMatch === true,
            translate_for_hair_type: translateForHairType === true,
            curl_type: hairProfile?.curl_type ?? null,
          }
        : {};
    analyze({ input_type: "photo", image_base64: base64, image_media_type: mediaType, ...deepFields }, "photo");
  }

  async function handleSubmitText(overrideText?: string, forceQuick?: boolean) {
    const value = overrideText ?? textDescription;
    if (!value.trim()) return;
    const mode = forceQuick ? "quick" : matchMode;
    const deepFields =
      mode === "deep"
        ? {
            color_match: colorMatch === true,
            translate_for_hair_type: translateForHairType === true,
            curl_type: hairProfile?.curl_type ?? null,
          }
        : {};
    analyze({ input_type: "text", text: value, ...deepFields }, "text");
  }

  // Called by the Photo/Text submit buttons -- routes to the deep survey
  // instead of straight to analysis when Deep Match is selected.
  function handlePrimarySubmit(kind: "photo" | "text") {
    if (matchMode === "deep") {
      setDeepStep(1);
      setPageState("deepSurvey");
      return;
    }
    if (kind === "photo") handleSubmitPhoto();
    else handleSubmitText();
  }

  function handleDeepSurveyFinish() {
    if (imageFile || prefilledImage) handleSubmitPhoto();
    else handleSubmitText();
  }

  // Results tab data loading -- unchanged from before, plus the new
  // Color tab's YouTube search + "find a colorist" Maps link.
  useEffect(() => {
    if (pageState !== "results" || !detected || !hairProfile) return;

    let cancelled = false;
    const curlType = hairProfile.curl_type ?? "";

    async function loadTutorials() {
      setTutorialsLoading(true);
      try {
        const family = curlFamily(curlType);
        const postsParams = new URLSearchParams({ style_name: detected!.style_name });
        if (family) postsParams.set("hair_type_family", family);

        const [postsRes, ytRes] = await Promise.all([
          fetch(`/api/style-match/tutorials?${postsParams.toString()}`),
          fetch(
            `/api/style-match/youtube?${new URLSearchParams({
              style_name: detected!.style_name,
              curl_type: curlType,
            }).toString()}`
          ),
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

    async function loadShoppingList() {
      setShoppingLoading(true);
      try {
        const list = await buildStyleShoppingList({
          styleName: detected!.style_name,
          styleDescription: detected!.style_description,
          requiresFakeHair: detected!.requires_fake_hair,
          fakeHairType: detected!.fake_hair_type,
          accessoriesVisible: detected!.accessories_visible ?? [],
          wantsLengthExtensions: lengthDifference === "longer" && wantsLengthExtensions,
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
        const params = new URLSearchParams({ city: cityState.city, curl_type: curlType });
        const res = await fetch(`/api/style-match/stylists?${params.toString()}`);
        const data = await res.json();
        if (!cancelled) setStylists(data.stylists ?? []);
      } finally {
        if (!cancelled) setStylistsLoading(false);
      }
    }

    loadTutorials();
    loadColorTab();
    loadShoppingList();
    loadStylists();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageState, detected, hairProfile]);

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

  // Heart/save button (Part 4) -- available as soon as matchId exists
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

  // Inspo mode (Part 5)
  async function loadInspoStyles() {
    setInspoLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from("styles")
        .select("id, name, slug, description, hair_types_compatible, requires_fake_hair, estimated_time, difficulty");

      const rows = !fetchError && data && data.length > 0 ? (data as StyleRow[]) : STATIC_STYLES;
      const curlType = hairProfile?.curl_type ?? null;
      const filtered = curlType
        ? rows.filter((s) => (s.hair_types_compatible ?? []).includes(curlType))
        : rows;
      setInspoStyles(filtered);
    } finally {
      setInspoLoading(false);
    }
  }

  function openInspoMode() {
    setPageState("inspo");
    loadInspoStyles();
  }

  function toggleVibe(vibe: string) {
    setSelectedVibes((prev) => (prev.includes(vibe) ? prev.filter((v) => v !== vibe) : [...prev, vibe]));
  }

  const visibleInspoStyles = inspoStyles.filter((s) => {
    const vibes = VIBE_TAGS_BY_SLUG[s.slug] ?? [];
    const length = LENGTH_TAG_BY_SLUG[s.slug] ?? null;
    const vibeOk = selectedVibes.length === 0 || selectedVibes.some((v) => vibes.includes(v));
    const lengthOk = !selectedLength || length === selectedLength;
    return vibeOk && lengthOk;
  });

  // Tapping an inspo card runs Quick Match automatically (per spec),
  // unlike the saved-styles "Match this style" flow which only pre-fills.
  function handleInspoCardTap(style: StyleRow) {
    setMatchMode("quick");
    setTextDescription(style.name);
    setPageState("landing");
    handleSubmitText(style.name, true);
  }

  if (resolvingAccess || (user && !hairProfile)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-dark font-sans">
        <p className="text-sm text-cream/60">Loading...</p>
      </main>
    );
  }

  if (pageState === "analyzing") return <AnalyzingOverlay />;

  if (showUpgradeWall && pageState === "landing") {
    return (
      <main className="min-h-screen bg-dark px-4 py-10 font-sans text-cream sm:px-6">
        <div className="mx-auto max-w-md">
          <UpgradeWallContent userId={user!.id} userEmail={user!.email} />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-dark px-4 py-10 font-sans text-cream sm:px-6">
      <div className="mx-auto max-w-2xl">
        {pageState === "landing" && (
          <>
            <h1 className="font-serif text-[28px] font-semibold text-cream">Style Match</h1>
            <p className="mt-2 text-sm text-cream/70">
              Upload a photo or describe a hairstyle you want, and we&apos;ll match it to
              tutorials, a shopping list scored for your hair, and a local stylist if one is
              available in your city.
            </p>

            <DemoSection />

            {error && <p className="mt-4 text-sm text-red">{error}</p>}

            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-bronze/30 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-bronze/40 bg-bronze/10">
                  <CameraIcon />
                </div>
                <p className="mt-4 font-serif text-xl font-semibold text-cream">Upload a photo</p>
                <p className="mt-1 text-sm text-cream/70">Snap or upload a picture of the style you want.</p>

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handlePhotoChange}
                  className="mt-4 block w-full text-xs text-cream/70 file:mr-3 file:rounded-full file:border file:border-bronze/40 file:bg-transparent file:px-3 file:py-1.5 file:text-xs file:text-bronze2"
                />

                {imagePreviewUrl && (
                  <div className="relative mt-3 h-40 w-full overflow-hidden rounded-lg bg-[#2C2420]">
                    <Image src={imagePreviewUrl} alt="Selected style" fill className="object-cover" />
                  </div>
                )}
                {prefilledImage && !imageFile && (
                  <p className="mt-2 text-xs text-bronze2">Using the community photo you picked →</p>
                )}

                <button
                  type="button"
                  onClick={() => handlePrimarySubmit("photo")}
                  disabled={!imageFile && !prefilledImage}
                  className="mt-4 w-full rounded-lg bg-bronze py-3 text-sm font-semibold text-dark transition-colors hover:bg-bronze2 disabled:opacity-40"
                >
                  Analyze this style →
                </button>
              </div>

              <div className="rounded-xl border border-bronze/30 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-bronze/40 bg-bronze/10">
                  <PencilIcon />
                </div>
                <p className="mt-4 font-serif text-xl font-semibold text-cream">Describe it</p>
                <p className="mt-1 text-sm text-cream/70">Tell us about the hairstyle you&apos;re picturing.</p>

                <textarea
                  value={textDescription}
                  onChange={(e) => setTextDescription(e.target.value)}
                  placeholder="Knotless box braids, medium length, with a middle part..."
                  rows={4}
                  className="mt-4 w-full rounded-lg border border-bronze/40 bg-transparent px-3 py-2 text-sm text-cream placeholder:text-cream/40 focus:border-bronze focus:outline-none"
                />

                <button
                  type="button"
                  onClick={() => handlePrimarySubmit("text")}
                  disabled={!textDescription.trim()}
                  className="mt-4 w-full rounded-lg bg-bronze py-3 text-sm font-semibold text-dark transition-colors hover:bg-bronze2 disabled:opacity-40"
                >
                  Find this style →
                </button>
              </div>

              <button
                type="button"
                onClick={openInspoMode}
                className="rounded-xl border border-bronze/30 p-6 text-left transition-colors hover:border-bronze"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-bronze/40 bg-bronze/10">
                  <CompassIcon />
                </div>
                <p className="mt-4 font-serif text-xl font-semibold text-cream">Show me inspo</p>
                <p className="mt-1 text-sm text-cream/70">
                  Not sure what you want? Browse styles for your hair type.
                </p>
              </button>
            </div>

            {(imageFile || prefilledImage || textDescription.trim()) && (
              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <SelectableCard
                  icon={<LightningIcon />}
                  label="Quick Match"
                  subtext="Get your tutorials and shopping list in under 30 seconds."
                  selected={matchMode === "quick"}
                  onClick={() => setMatchMode("quick")}
                />
                <SelectableCard
                  icon={<SparkleIcon />}
                  label="Deep Match"
                  subtext="Tell us more about what you want — color, length, extensions. More detail, more personalized results."
                  selected={matchMode === "deep"}
                  onClick={() => setMatchMode("deep")}
                />
              </div>
            )}

            {hasHairPhoto === false && (
              <Link
                href="/profile"
                className="mt-6 block text-sm text-bronze2 underline underline-offset-2 hover:text-cream"
              >
                Add a hair photo to your profile for a more personalized style analysis →
              </Link>
            )}
          </>
        )}

        {pageState === "inspo" && (
          <div>
            <button
              type="button"
              onClick={() => setPageState("landing")}
              className="text-xs text-cream/50 underline underline-offset-2 hover:text-cream/70"
            >
              ← Back
            </button>
            <h1 className="mt-3 font-serif text-[28px] font-semibold text-cream">Find your next style</h1>

            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-bronze">Vibe</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {VIBE_OPTIONS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => toggleVibe(v)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      selectedVibes.includes(v)
                        ? "border-bronze bg-bronze text-dark"
                        : "border-bronze/40 text-bronze2 hover:bg-bronze/10"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-bronze">Length</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {["Any length", ...LENGTH_OPTIONS].map((l) => {
                  const isAny = l === "Any length";
                  const selected = isAny ? !selectedLength : selectedLength === l;
                  return (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setSelectedLength(isAny ? null : l)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        selected
                          ? "border-bronze bg-bronze text-dark"
                          : "border-bronze/40 text-bronze2 hover:bg-bronze/10"
                      }`}
                    >
                      {l}
                    </button>
                  );
                })}
              </div>
            </div>

            {inspoLoading && <p className="mt-8 text-sm text-cream/50">Loading styles...</p>}

            {!inspoLoading && (
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {visibleInspoStyles.map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => handleInspoCardTap(style)}
                    className="rounded-xl border border-bronze/30 p-4 text-left transition-colors hover:border-bronze"
                  >
                    <p className="font-serif text-lg text-cream">{style.name}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {style.difficulty && (
                        <span className="rounded-full border border-bronze/40 px-2 py-0.5 text-[10px] font-medium capitalize text-bronze2">
                          {style.difficulty}
                        </span>
                      )}
                      {style.estimated_time && (
                        <span className="rounded-full border border-bronze/40 px-2 py-0.5 text-[10px] font-medium text-bronze2">
                          {style.estimated_time}
                        </span>
                      )}
                      {style.requires_fake_hair && (
                        <span className="rounded-full bg-dark px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-bronze">
                          Fake hair
                        </span>
                      )}
                    </div>
                  </button>
                ))}
                {visibleInspoStyles.length === 0 && (
                  <p className="col-span-full text-sm text-cream/50">No styles match those filters yet.</p>
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
              className="text-xs text-cream/50 underline underline-offset-2 hover:text-cream/70"
            >
              ← Back
            </button>
            <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-bronze">Step {deepStep} of 4</p>

            {deepStep === 1 && (
              <div className="mt-4">
                <h2 className="font-serif text-2xl font-semibold text-cream">
                  Are you trying to achieve the hair color in this photo too?
                </h2>
                <div className="mt-4 space-y-3">
                  <SelectableCard label="Yes — include color tutorials" selected={colorMatch === true} onClick={() => setColorMatch(true)} />
                  <SelectableCard label="No — just the style" selected={colorMatch === false} onClick={() => setColorMatch(false)} />
                </div>
                {colorMatch === true && (
                  <p className="mt-4 rounded-lg border-l-2 border-bronze bg-amber/10 px-4 py-3 text-sm leading-relaxed text-cream/90">
                    Color work — especially bleaching or significant color changes — can cause
                    serious damage without professional help. We will include color tutorial
                    videos in your results, but we strongly recommend consulting a licensed
                    colorist for any chemical color services.
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => setDeepStep(2)}
                  disabled={colorMatch === null}
                  className="mt-6 w-full rounded-lg bg-bronze py-3 text-sm font-semibold text-dark transition-colors hover:bg-bronze2 disabled:opacity-40"
                >
                  Continue →
                </button>
              </div>
            )}

            {deepStep === 2 && (
              <div className="mt-4">
                <h2 className="font-serif text-2xl font-semibold text-cream">
                  How does this length compare to your current hair?
                </h2>
                <div className="mt-4 space-y-3">
                  <SelectableCard label="About the same length" selected={lengthDifference === "same"} onClick={() => setLengthDifference("same")} />
                  <SelectableCard label="Longer than my current hair" selected={lengthDifference === "longer"} onClick={() => setLengthDifference("longer")} />
                  <SelectableCard label="Shorter than my current hair" selected={lengthDifference === "shorter"} onClick={() => setLengthDifference("shorter")} />
                </div>
                {lengthDifference === "longer" && (
                  <div className="mt-4 rounded-lg border-l-2 border-bronze bg-warm/10 px-4 py-3">
                    <p className="text-sm leading-relaxed text-cream/90">
                      Achieving this length on your natural hair takes time. We can include
                      extension options to achieve this look now.
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setWantsLengthExtensions(true)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                          wantsLengthExtensions ? "border-bronze bg-bronze text-dark" : "border-bronze/40 text-bronze2"
                        }`}
                      >
                        Yes, include extension options
                      </button>
                      <button
                        type="button"
                        onClick={() => setWantsLengthExtensions(false)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                          !wantsLengthExtensions ? "border-bronze bg-bronze text-dark" : "border-bronze/40 text-bronze2"
                        }`}
                      >
                        No, I want to grow my hair to this length
                      </button>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setDeepStep(3)}
                  disabled={lengthDifference === null}
                  className="mt-6 w-full rounded-lg bg-bronze py-3 text-sm font-semibold text-dark transition-colors hover:bg-bronze2 disabled:opacity-40"
                >
                  Continue →
                </button>
              </div>
            )}

            {deepStep === 3 && (
              <div className="mt-4">
                <h2 className="font-serif text-2xl font-semibold text-cream">Does this style involve added hair?</h2>
                <div className="mt-4 space-y-3">
                  <SelectableCard label="No — natural hair only" selected={involvesExtensions === "none"} onClick={() => setInvolvesExtensions("none")} />
                  <SelectableCard label="Braiding hair" selected={involvesExtensions === "braiding_hair"} onClick={() => setInvolvesExtensions("braiding_hair")} />
                  <SelectableCard label="Sew-in or weave" selected={involvesExtensions === "sew_in"} onClick={() => setInvolvesExtensions("sew_in")} />
                  <SelectableCard label="Wig" selected={involvesExtensions === "wig"} onClick={() => setInvolvesExtensions("wig")} />
                  <SelectableCard label="Not sure — help me figure it out" selected={involvesExtensions === "not_sure"} onClick={() => setInvolvesExtensions("not_sure")} />
                </div>
                <button
                  type="button"
                  onClick={() => setDeepStep(4)}
                  disabled={involvesExtensions === null}
                  className="mt-6 w-full rounded-lg bg-bronze py-3 text-sm font-semibold text-dark transition-colors hover:bg-bronze2 disabled:opacity-40"
                >
                  Continue →
                </button>
              </div>
            )}

            {deepStep === 4 && (
              <div className="mt-4">
                <h2 className="font-serif text-2xl font-semibold text-cream">
                  The hair in this photo may look different from yours. How would you like your results?
                </h2>
                <div className="mt-4 space-y-3">
                  <SelectableCard
                    label="Show me exactly how to achieve this on MY hair type"
                    selected={translateForHairType === true}
                    onClick={() => setTranslateForHairType(true)}
                  />
                  <SelectableCard
                    label="Show me this style as it is — I understand it may look different on my hair"
                    selected={translateForHairType === false}
                    onClick={() => setTranslateForHairType(false)}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleDeepSurveyFinish}
                  disabled={translateForHairType === null}
                  className="mt-6 w-full rounded-lg bg-bronze py-3 text-sm font-semibold text-dark transition-colors hover:bg-bronze2 disabled:opacity-40"
                >
                  See my results →
                </button>
              </div>
            )}
          </div>
        )}

        {pageState === "confirm" && detected && (
          <div>
            <div className="flex items-start justify-between gap-4">
              <h2 className="font-serif text-2xl font-semibold text-cream">{detected.style_name}</h2>
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
            <p className="mt-2 text-sm text-cream/70">{detected.style_description}</p>

            {justUsedFreeMatch && !subscribed && (
              <p className="mt-3 text-xs text-bronze2">
                1 free style match used. Upgrade to routine subscription for unlimited matches.
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-bronze/40 px-3 py-1 text-xs font-medium capitalize text-bronze2">
                {detected.hair_length} length
              </span>
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
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {(detected.compatible_hair_types ?? []).map((t) => (
                <span key={t} className="rounded-full bg-dark px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-bronze">
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

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setPageState("results")}
                className="flex-1 rounded-lg bg-bronze py-3 text-sm font-semibold text-dark transition-colors hover:bg-bronze2"
              >
                Yes, this is it →
              </button>
              <button
                type="button"
                onClick={resetToLanding}
                className="flex-1 rounded-lg border border-bronze/40 py-3 text-sm font-semibold text-cream/80 transition-colors hover:border-bronze"
              >
                Not quite — try again
              </button>
            </div>
          </div>
        )}

        {pageState === "results" && detected && (
          <div>
            <div className="flex items-start justify-between gap-4">
              <h2 className="font-serif text-2xl font-semibold text-cream">{detected.style_name}</h2>
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
            <p className="mt-1 text-sm text-cream/60">{detected.maintenance_tips}</p>

            {justUsedFreeMatch && !subscribed && (
              <p className="mt-2 text-xs text-bronze2">
                1 free style match used. Upgrade to routine subscription for unlimited matches.
              </p>
            )}

            {translateForHairType === true && detected.hair_type_translation && (
              <div className="mt-4 rounded-lg border-l-2 border-bronze bg-warm/10 px-4 py-3">
                <p className="text-sm leading-relaxed text-cream/90">
                  Style adapted for your {hairProfile?.curl_type ?? ""} hair: {detected.hair_type_translation}
                </p>
              </div>
            )}

            {detected.current_to_desired_translation && (
              <div className="mt-4 rounded-lg border-l-2 border-bronze bg-warm/10 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-bronze">
                  From your current hair to this style
                </p>
                <p className="mt-2 text-sm leading-relaxed text-cream/90">
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
                      <li key={step} className="text-xs text-cream/70">
                        • {step}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-2 border-b border-bronze/20">
              {(["tutorials", "color", "shopping", "stylist"] as ResultTab[])
                .filter((tab) => tab !== "color" || colorMatch === true)
                .filter((tab) => tab !== "stylist" || stylistsLoading || stylists.length > 0)
                .map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                      activeTab === tab ? "border-b-2 border-bronze text-cream" : "text-cream/50 hover:text-cream/80"
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
                {tutorialsLoading && <p className="text-sm text-cream/50">Loading tutorials...</p>}

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
                          <div className="relative h-28 w-full bg-[#2C2420]">
                            {v.thumbnailUrl && <Image src={v.thumbnailUrl} alt={v.title} fill className="object-cover" />}
                          </div>
                          <div className="flex flex-1 flex-col gap-1 p-4">
                            <p className="line-clamp-2 font-serif text-sm text-cream">{v.title}</p>
                            <p className="text-xs text-cream/50">{v.channelTitle}</p>
                            <span className="mt-1 text-xs text-bronze2">Watch on YouTube →</span>
                          </div>
                        </a>
                      ))}
                    </div>
                    <p className="mt-3 text-[10px] text-cream/40">Videos from YouTube — not affiliated with Qoyl.</p>
                  </div>
                )}

                {!tutorialsLoading && internalTutorials.length === 0 && youtubeVideos.length === 0 && (
                  <p className="text-sm text-cream/50">No tutorials found for this style yet.</p>
                )}
              </div>
            )}

            {activeTab === "color" && (
              <div className="mt-6 space-y-6">
                <div className="rounded-lg border-l-[3px] border-bronze bg-amber/10 px-4 py-3">
                  <p className="text-sm font-medium leading-relaxed text-cream/90">
                    Professional recommendation: Color services — especially lightening or
                    bleaching — should be done by a licensed colorist. DIY color on textured hair
                    carries significant risk of damage. The tutorials below are for reference.
                    Please consult a professional.
                  </p>
                </div>

                {colorMapsUrl && (
                  <a
                    href={colorMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block rounded-lg border border-bronze/40 px-4 py-2 text-sm font-semibold text-cream transition-colors hover:border-bronze"
                  >
                    Find a colorist near me →
                  </a>
                )}

                {colorVideosLoading && <p className="text-sm text-cream/50">Loading color tutorials...</p>}

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
                        <div className="relative h-28 w-full bg-[#2C2420]">
                          {v.thumbnailUrl && <Image src={v.thumbnailUrl} alt={v.title} fill className="object-cover" />}
                        </div>
                        <div className="flex flex-1 flex-col gap-1 p-4">
                          <p className="line-clamp-2 font-serif text-sm text-cream">{v.title}</p>
                          <p className="text-xs text-cream/50">{v.channelTitle}</p>
                          <span className="mt-1 text-xs text-bronze2">Watch on YouTube →</span>
                        </div>
                      </a>
                    ))}
                  </div>
                )}

                {!colorVideosLoading && colorVideos.length === 0 && (
                  <p className="text-sm text-cream/50">No color tutorials found yet.</p>
                )}
              </div>
            )}

            {activeTab === "shopping" && (
              <div className="mt-6 space-y-8">
                {shoppingLoading && <p className="text-sm text-cream/50">Building your shopping list...</p>}

                {!shoppingLoading && shoppingList && (
                  <>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-bronze">Hair Care Products</p>
                      <ul className="mt-3 space-y-2">
                        {shoppingList.hairCare.map((item) => (
                          <li key={item.catalogProductId} className="rounded-lg border border-bronze/30 px-4 py-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm text-cream">{item.name}</p>
                                <p className="text-xs text-cream/50">
                                  {item.brand} · {item.categoryLabel}
                                </p>
                              </div>
                              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${TIER_CLASSES[scoreTier(item.score)]}`}>
                                {item.score}
                              </span>
                            </div>
                            <ShopButton productName={item.name} brandName={item.brand} className="mt-2 inline-block text-xs text-bronze2 underline" />
                          </li>
                        ))}
                        {shoppingList.hairCare.length === 0 && <p className="text-sm text-cream/50">No matching products found yet.</p>}
                      </ul>
                    </div>

                    {shoppingList.showFakeHairSection && shoppingList.fakeHair.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-bronze">Fake Hair Needed</p>
                        {shoppingList.fakeHairNote && <p className="mt-1 text-xs text-cream/50">{shoppingList.fakeHairNote}</p>}
                        <ul className="mt-3 space-y-2">
                          {shoppingList.fakeHair.map((item) => (
                            <li key={item.name} className="flex items-center justify-between rounded-lg border border-bronze/30 px-4 py-3">
                              <span className="text-sm text-cream">{item.name}</span>
                              <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-bronze2 underline">
                                {item.retailer} →
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
                          <li key={item.name} className="flex items-center justify-between rounded-lg border border-bronze/30 px-4 py-3">
                            <span className="text-sm text-cream">{item.name}</span>
                            <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-bronze2 underline">
                              {item.retailer} →
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {shoppingList.accessories.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-bronze">Accessories</p>
                        <ul className="mt-3 space-y-2">
                          {shoppingList.accessories.map((item) => (
                            <li key={item.name} className="flex items-center justify-between rounded-lg border border-bronze/30 px-4 py-3">
                              <span className="text-sm text-cream">{item.name}</span>
                              <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-bronze2 underline">
                                {item.retailer} →
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => handleComplete("diy", null)}
                      disabled={savingChoice === "diy" || savedChoice !== null || !matchId}
                      className="w-full rounded-lg bg-bronze py-3 text-sm font-semibold text-dark transition-colors hover:bg-bronze2 disabled:opacity-60"
                    >
                      {savedChoice ? "Saved to your profile ✓" : savingChoice === "diy" ? "Saving..." : "Save this shopping list to my profile →"}
                    </button>
                  </>
                )}
              </div>
            )}

            {activeTab === "stylist" && (
              <div className="mt-6 space-y-4">
                {stylistsLoading && <p className="text-sm text-cream/50">Finding stylists near you...</p>}

                {!stylistsLoading &&
                  stylists.map((stylist) => (
                    <div key={stylist.id} className="rounded-xl border border-bronze/30 p-5">
                      <div className="flex items-start gap-4">
                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-[#2C2420]">
                          {stylist.photoUrl && <Image src={stylist.photoUrl} alt={stylist.displayName} fill className="object-cover" />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-serif text-lg text-cream">{stylist.displayName}</p>
                          {stylist.salonName && <p className="text-sm text-cream/60">{stylist.salonName}</p>}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          handleComplete("stylist", stylist.id);
                          if (stylist.bookingUrl) window.open(stylist.bookingUrl, "_blank", "noopener,noreferrer");
                        }}
                        disabled={savingChoice === "stylist" || !matchId}
                        className="mt-4 w-full rounded-lg bg-bronze py-3 text-sm font-semibold text-dark transition-colors hover:bg-bronze2 disabled:opacity-60"
                      >
                        {savedChoice === "stylist" ? "Booking request sent ✓" : "Book an appointment →"}
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>

      {toast && <Toast message={toast} />}
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
