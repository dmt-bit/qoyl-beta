"use client";

import { Fragment, Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Collapse from "@/components/Collapse";
import HairJourneySection from "@/components/HairJourneySection";
import HairTypeStrip from "@/components/HairTypeStrip";
import InfoTooltip from "@/components/InfoTooltip";
import { useAuth } from "@/lib/auth-context";
import { ADULT_AGE_RANGE_OPTIONS, formatAdultAgeRange } from "@/lib/ageRange";
import { classifyClimateFromZip } from "@/lib/climateData";
import { CLIMATE_LABELS, WATER_HARDNESS_LABELS } from "@/lib/locationFactors";
import { waterHardnessFromZip } from "@/lib/waterHardnessData";
import { supabase } from "@/lib/supabase";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function labelFor(
  options: { value: string; label: string }[],
  value: string | null
): string {
  if (!value) return "Not set";
  return options.find((o) => o.value === value)?.label ?? value;
}

function Chip({ label }: { label: string }) {
  return (
    <span className="inline-block rounded-full border border-bronze/40 px-3 py-1 text-xs font-medium capitalize text-bronze2">
      {label}
    </span>
  );
}

function ReadOnlyField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="font-serif text-lg text-bronze2">{label}</p>
      <div className="mt-3 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function ConfirmUpdateModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-dark/70 sm:items-center sm:p-4"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Confirm profile update"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-2xl border border-bronze/30 bg-dark p-6 sm:rounded-2xl"
      >
        <p className="text-sm leading-relaxed text-cream/90">
          Are you sure you want to update your hair profile? Updating will
          recalculate all your compatibility scores and may change your
          routine recommendations. You can update your profile once every 30
          days.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse">
          <button
            type="button"
            onClick={onConfirm}
            className="w-full rounded-lg bg-bronze py-3 text-sm font-semibold text-dark transition-colors hover:bg-bronze2"
          >
            Yes, update my profile
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full rounded-lg border border-bronze/40 py-3 text-sm font-medium text-cream transition-colors hover:border-bronze"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

type Purchase = {
  id: string;
  product_type: "routine_subscription" | "travel_kit";
  stripe_subscription_id: string | null;
  status: string;
  created_at: string;
};

function MyPurchases({ userId }: { userId: string }) {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  async function loadPurchases() {
    setLoading(true);
    try {
      const res = await fetch(`/api/purchases?user_id=${userId}`);
      const data = await res.json();
      setPurchases(data.purchases ?? []);
    } catch {
      setPurchases([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPurchases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const routineSubscription = purchases.find(
    (p) => p.product_type === "routine_subscription"
  );
  const travelKit = purchases.find((p) => p.product_type === "travel_kit");

  async function handleCancel() {
    if (!routineSubscription?.stripe_subscription_id) return;
    setCancelError(null);
    setCancelling(true);

    try {
      const res = await fetch("/api/stripe/cancel-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriptionId: routineSubscription.stripe_subscription_id,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setCancelError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      await loadPurchases();
    } catch {
      setCancelError("Couldn't reach the server. Please try again.");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="mx-auto mt-12 max-w-md">
      <h2 className="font-serif text-2xl font-semibold text-cream">
        My Purchases
      </h2>

      {loading ? (
        <p className="mt-3 text-sm text-cream/50">Loading...</p>
      ) : !routineSubscription && !travelKit ? (
        <p className="mt-3 text-sm text-cream/70">No active purchases yet.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {routineSubscription && (
            <div className="rounded-lg border border-bronze/30 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-cream">Monthly Routine</p>
                <span className="text-xs uppercase tracking-wide text-green">
                  {routineSubscription.status}
                </span>
              </div>
              {cancelError && (
                <p className="mt-2 text-sm text-red">{cancelError}</p>
              )}
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className="mt-3 text-xs text-cream/50 underline underline-offset-2 hover:text-cream/70 disabled:opacity-50"
              >
                {cancelling ? "Cancelling..." : "Cancel subscription"}
              </button>
            </div>
          )}

          {travelKit && (
            <div className="flex items-center justify-between rounded-lg border border-bronze/30 p-4">
              <p className="text-sm text-cream">Travel Kit</p>
              <span className="text-xs uppercase tracking-wide text-green">
                {travelKit.status}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type CurlTypeOption = {
  value: string;
  label: string;
  group: string;
  type: string;
  descriptor: string;
  image: string;
};

// Image URLs are Cloudinary-hosted (f_auto,q_auto - format/quality
// auto-negotiated per request, no explicit extension needed).
const CURL_TYPE_OPTIONS: CurlTypeOption[] = [
  {
    value: "1a",
    label: "1a",
    group: "Straight",
    type: "Straight",
    descriptor: "Very straight, fine and silky. No bend or wave at all.",
    image:
      "https://res.cloudinary.com/kumxntij/image/upload/f_auto,q_auto/pexels-photo-35267456",
  },
  {
    value: "1b",
    label: "1b",
    group: "Straight",
    type: "Straight",
    descriptor: "Straight with slight body. Minimal bend at ends only.",
    image:
      "https://res.cloudinary.com/kumxntij/image/upload/f_auto,q_auto/pexels-fall-maple-1195057-2325807",
  },
  {
    value: "1c",
    label: "1c",
    group: "Straight",
    type: "Straight",
    descriptor: "Straight but coarse or thick. Resistant to any curl.",
    image:
      "https://res.cloudinary.com/kumxntij/image/upload/f_auto,q_auto/pexels-photo-3356211",
  },
  {
    value: "2a",
    label: "2a",
    group: "Wavy",
    type: "Wavy",
    descriptor: "Loose S-wave, fine texture. Slight wave through the length.",
    image:
      "https://res.cloudinary.com/kumxntij/image/upload/f_auto,q_auto/pexels-ulrick-t-16207701",
  },
  {
    value: "2b",
    label: "2b",
    group: "Wavy",
    type: "Wavy",
    descriptor: "Defined S-wave, medium texture. Wave pattern throughout.",
    image:
      "https://res.cloudinary.com/kumxntij/image/upload/f_auto,q_auto/pexels-aibek-skakov-418917601-27679976",
  },
  {
    value: "2c",
    label: "2c",
    group: "Wavy",
    type: "Wavy",
    descriptor: "Strong wave, coarser texture. Thick, frizz-prone waves.",
    image:
      "https://res.cloudinary.com/kumxntij/image/upload/f_auto,q_auto/pexels-olga-somek-147015162-17889750",
  },
  {
    value: "3a",
    label: "3a",
    group: "Curly",
    type: "Curly",
    descriptor: "Loose spiral curls. Big, bouncy, defined ringlets.",
    image:
      "https://res.cloudinary.com/kumxntij/image/upload/f_auto,q_auto/pexels-vlada-karpovich-4668513",
  },
  {
    value: "3b",
    label: "3b",
    group: "Curly",
    type: "Curly",
    descriptor: "Springy ringlets, medium-tight spiral. Lots of volume.",
    image:
      "https://res.cloudinary.com/kumxntij/image/upload/f_auto,q_auto/pexels-soufianlafnesh-34579409",
  },
  {
    value: "3c",
    label: "3c",
    group: "Curly",
    type: "Curly",
    descriptor: "Tight corkscrew curls. Dense, voluminous, well-defined.",
    image:
      "https://res.cloudinary.com/kumxntij/image/upload/f_auto,q_auto/pexels-eddson-lens-748406628-28172264",
  },
  {
    value: "4a",
    label: "4a",
    group: "Coily",
    type: "Coily",
    descriptor: "Defined S-coils. Tight but visible S-pattern when stretched.",
    image:
      "https://res.cloudinary.com/kumxntij/image/upload/f_auto,q_auto/pexels-polina-tankilevitch-7382918",
  },
  {
    value: "4b",
    label: "4b",
    group: "Coily",
    type: "Coily",
    descriptor: "Z-pattern with sharp angles. Less definition, more shrinkage.",
    image:
      "https://res.cloudinary.com/kumxntij/image/upload/f_auto,q_auto/pexels-jordy-toscano-712212447-27596675",
  },
  {
    value: "4c",
    label: "4c",
    group: "Coily",
    type: "Coily",
    descriptor: "Tightest coils, most shrinkage. Pattern less visible when dry.",
    image:
      "https://res.cloudinary.com/kumxntij/image/upload/f_auto,q_auto/pexels-praise-nnadozie-1081270006-38284790",
  },
];

const CURL_TYPE_GROUPS = ["Straight", "Wavy", "Curly", "Coily"];
const POROSITY_OPTIONS = ["low", "medium", "high", "not sure"] as const;
const THICKNESS_OPTIONS = [
  { value: "fine", label: "Fine" },
  { value: "medium", label: "Medium" },
  { value: "coarse", label: "Coarse" },
  { value: "not_sure", label: "Not sure" },
];
const SCALP_OPTIONS = [
  { value: "normal", label: "Normal" },
  { value: "dry", label: "Dry" },
  { value: "oily", label: "Oily" },
  { value: "sensitive", label: "Sensitive" },
  { value: "dandruff-prone", label: "Dandruff-prone" },
];
const CONCERN_OPTIONS = [
  { value: "dryness", label: "Dryness" },
  { value: "breakage", label: "Breakage" },
  { value: "shrinkage", label: "Shrinkage" },
  { value: "scalp", label: "Scalp" },
  { value: "frizz", label: "Frizz" },
  { value: "growth", label: "Growth" },
  { value: "thinning", label: "Thinning hair" },
];
const YES_NO_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];
const SHOWER_FILTER_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "not_sure", label: "Not sure" },
];
const COLOR_TYPE_OPTIONS = [
  { value: "permanent", label: "Permanent color" },
  { value: "semi_permanent", label: "Semi-permanent" },
  { value: "highlights_or_bleach", label: "Highlights or bleach" },
  { value: "henna", label: "Henna" },
  { value: "other", label: "Other" },
];
const EXTENSION_TYPE_OPTIONS = [
  { value: "braids", label: "Braids" },
  { value: "box_braids", label: "Box braids" },
  { value: "weave", label: "Weave" },
  { value: "tape_in", label: "Tape-in" },
  { value: "clip_in", label: "Clip-in" },
  { value: "loc_extensions", label: "Loc extensions" },
  { value: "wigs", label: "Wigs" },
  { value: "other", label: "Other" },
];
const BUDGET_OPTIONS = [
  { value: "under_30", label: "Under $30/month" },
  { value: "30_60", label: "$30-60/month" },
  { value: "60_100", label: "$60-100/month" },
  { value: "100_plus", label: "$100+/month" },
];
const PROFILE_FOR_OPTIONS = [
  { value: "myself", label: "Myself", subtext: null },
  {
    value: "child",
    label: "My child",
    subtext: "We'll tailor recommendations for children's hair",
  },
  {
    value: "baby",
    label: "My baby",
    subtext: "Safe, gentle recommendations for infants and toddlers",
  },
];
const AGE_RANGE_OPTIONS = [
  { value: "0-12 months", label: "0-12 months" },
  { value: "1-3 years", label: "1-3 years" },
  { value: "4-8 years", label: "4-8 years" },
  { value: "9-12 years", label: "9-12 years" },
  { value: "13+", label: "13+" },
];
const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Prefer not to say" },
];
const HAIR_GOALS_OPTIONS = [
  { value: "scalp_health", label: "Scalp health" },
  { value: "hair_growth", label: "Hair growth" },
  { value: "moisture_definition", label: "Moisture and definition" },
  { value: "beard_care", label: "Beard and facial hair care" },
  { value: "all", label: "All of the above" },
];

function SelectButton({
  label,
  selected,
  onClick,
  fullWidth = false,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  fullWidth?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${fullWidth ? "w-full" : ""} rounded-lg border px-4 py-3 text-sm font-medium capitalize transition-colors ${
        selected
          ? "border-bronze bg-bronze text-dark"
          : "border-bronze/40 bg-transparent text-cream hover:border-bronze"
      }`}
    >
      {label}
    </button>
  );
}

function ProfileForOption({
  label,
  subtext,
  selected,
  onClick,
}: {
  label: string;
  subtext: string | null;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-4 py-3 text-left transition-colors ${
        selected
          ? "border-bronze bg-bronze/20"
          : "border-bronze/40 bg-transparent hover:border-bronze"
      }`}
    >
      <span className="block text-sm font-medium text-cream">{label}</span>
      {subtext && (
        <span className="mt-1 block text-xs leading-snug text-cream/60">
          {subtext}
        </span>
      )}
    </button>
  );
}

function CurlTypeCard({
  option,
  selected,
  onClick,
}: {
  option: CurlTypeOption;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex flex-col overflow-hidden rounded-xl text-left transition-colors ${
        selected ? "border-2 border-bronze" : "border border-[#2C2420]"
      }`}
    >
      <div className="relative aspect-[4/5] w-full shrink-0">
        <Image
          src={option.image}
          alt={`${option.label} ${option.type} curl pattern`}
          fill
          sizes="(min-width: 640px) 33vw, 50vw"
          className={`object-cover object-top ${selected ? "brightness-110" : ""}`}
        />
        {selected && (
          <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-dark text-[11px] font-semibold text-bronze">
            ✓
          </span>
        )}
      </div>
      <div className="bg-dark px-2.5 py-2">
        <span className="block font-serif text-[18px] font-semibold text-cream">
          {option.label}
        </span>
        <span className="block font-sans text-[11px] text-bronze">
          {option.type}
        </span>
        <span className="mt-0.5 line-clamp-2 block font-sans text-[10px] leading-[1.4] text-muted">
          {option.descriptor}
        </span>
      </div>
    </button>
  );
}

function CurlGroupDivider({ label }: { label: string }) {
  return (
    <div className="col-span-2 mt-4 flex items-center gap-3 sm:col-span-3">
      <span className="h-px flex-1 bg-bronze/60" />
      <span className="font-sans text-[9px] font-semibold uppercase tracking-[0.15em] text-bronze">
        {label}
      </span>
      <span className="h-px flex-1 bg-bronze/60" />
    </div>
  );
}

function NotSureCurlCard({
  selected,
  onClick,
}: {
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`col-span-2 flex flex-col items-center justify-center gap-1 rounded-xl bg-dark px-4 py-6 text-center transition-colors sm:col-span-3 ${
        selected ? "border-2 border-bronze" : "border border-[#2C2420]"
      }`}
    >
      <span className="font-serif text-[32px] leading-none text-bronze">?</span>
      <span className="mt-1 font-serif text-[18px] font-semibold text-cream">
        Not sure yet
      </span>
      <span className="max-w-xs font-sans text-[10px] leading-[1.4] text-muted">
        We&apos;ll use your other answers to make our best recommendation.
      </span>
    </button>
  );
}

function ProfileForm() {
  const router = useRouter();
  const { user, hairProfile, hairProfileLoading, refreshHairProfile } =
    useAuth();

  // A saved profile (hairProfile is only ever populated for signed-in
  // users - see auth-context.tsx) opens in a read-only view. "unlocked"
  // flips to true only after the 30-day check in handleConfirmUpdate
  // passes, which is what actually reveals the editable form below.
  const [unlocked, setUnlocked] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [lockMessage, setLockMessage] = useState<string | null>(null);

  const showForm = !hairProfile || unlocked;

  // isAdmin() (lib/isAdmin.ts) reads ADMIN_EMAILS, which has no
  // NEXT_PUBLIC_ prefix and is deliberately server-only - calling it
  // directly from this client component would just always return false.
  // /api/purchases already does this exact check server-side (via
  // isAdminUserId, which looks the email up itself rather than trusting
  // a client-supplied one) and returns an `isAdmin` flag - same bridge
  // app/travel/page.tsx uses for its own admin bypass.
  const [isAdminUser, setIsAdminUser] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsAdminUser(false);
      return;
    }
    let cancelled = false;
    fetch(`/api/purchases?user_id=${user.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setIsAdminUser(Boolean(data.isAdmin));
      })
      .catch(() => {
        if (!cancelled) setIsAdminUser(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  function handleUpdateClick() {
    setLockMessage(null);

    // Admins skip the confirmation modal and the 30-day cooldown
    // entirely - straight to the editable form.
    if (isAdminUser) {
      setUnlocked(true);
      return;
    }

    setShowConfirmModal(true);
  }

  function handleConfirmUpdate() {
    setShowConfirmModal(false);

    if (!hairProfile?.updated_at) {
      setUnlocked(true);
      return;
    }

    const updatedAt = new Date(hairProfile.updated_at);
    const elapsedMs = Date.now() - updatedAt.getTime();

    if (elapsedMs < THIRTY_DAYS_MS) {
      const nextEligible = new Date(updatedAt.getTime() + THIRTY_DAYS_MS);
      setLockMessage(
        `You recently updated your profile. You can make changes again on ${formatDate(
          nextEligible
        )}.`
      );
      return;
    }

    setUnlocked(true);
  }

  const [profileFor, setProfileFor] = useState("myself");
  const [ageRange, setAgeRange] = useState<string | null>(null);
  const [adultAgeRange, setAdultAgeRange] = useState<string | null>(null);
  const [gender, setGender] = useState<string | null>(null);
  const [hairGoals, setHairGoals] = useState<string[]>([]);
  const [curlType, setCurlType] = useState<string | null>(null);
  const [porosity, setPorosity] = useState<string | null>(null);
  const [scalpCondition, setScalpCondition] = useState("");
  const [strandThickness, setStrandThickness] = useState<string | null>(null);
  const [zipCode, setZipCode] = useState("");
  const [hairConcerns, setHairConcerns] = useState<string[]>([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [showerFilter, setShowerFilter] = useState<string | null>(null);
  const [colorTreated, setColorTreated] = useState<string | null>(null);
  const [colorType, setColorType] = useState("");
  const [extensions, setExtensions] = useState<string | null>(null);
  const [extensionType, setExtensionType] = useState<string[]>([]);
  const [extensionCare, setExtensionCare] = useState("");
  const [budget, setBudget] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [hydratedFromProfileId, setHydratedFromProfileId] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (!hairProfile || hydratedFromProfileId === hairProfile.id) return;
    setProfileFor(hairProfile.profile_for ?? "myself");
    setAgeRange(hairProfile.age_range);
    setAdultAgeRange(hairProfile.adult_age_range);
    setGender(hairProfile.gender);
    setHairGoals(hairProfile.hair_goals ?? []);
    setCurlType(hairProfile.curl_type);
    setPorosity(hairProfile.porosity);
    setScalpCondition(hairProfile.scalp_condition ?? "");
    setStrandThickness(hairProfile.strand_thickness);
    setZipCode(hairProfile.zip_code ?? "");
    setHairConcerns(hairProfile.hair_concerns ?? []);
    setFirstName(hairProfile.first_name ?? "");
    setLastName(hairProfile.last_name ?? "");
    setEmail(hairProfile.email ?? "");
    setShowerFilter(hairProfile.shower_filter);
    setColorTreated(hairProfile.color_treated);
    setColorType(hairProfile.color_type ?? "");
    setExtensions(hairProfile.extensions);
    setExtensionType(hairProfile.extension_type ?? []);
    setExtensionCare(hairProfile.extension_care ?? "");
    setBudget(hairProfile.budget);
    setNotes(hairProfile.notes ?? "");
    setHydratedFromProfileId(hairProfile.id);
  }, [hairProfile, hydratedFromProfileId]);

  useEffect(() => {
    if (!user || hairProfile || hairProfileLoading) return;
    setEmail((prev) => prev || user.email || "");
  }, [user, hairProfile, hairProfileLoading]);

  // Both are pure, static, offline lookups keyed off the zip code - no
  // network call, so no loading state or debounce needed. Recomputed
  // live as the user types; null (hides the chips) until zipCode is a
  // plausible 5-digit value.
  const isPlausibleZip = /^\d{5}$/.test(zipCode.trim());
  const climate = useMemo(
    () => (isPlausibleZip ? classifyClimateFromZip(zipCode) : null),
    [isPlausibleZip, zipCode]
  );
  const waterHardness = useMemo(
    () => (isPlausibleZip ? waterHardnessFromZip(zipCode) : null),
    [isPlausibleZip, zipCode]
  );

  function toggleConcern(value: string) {
    setHairConcerns((prev) =>
      prev.includes(value)
        ? prev.filter((c) => c !== value)
        : [...prev, value]
    );
  }

  function toggleHairGoal(value: string) {
    setHairGoals((prev) =>
      prev.includes(value) ? prev.filter((g) => g !== value) : [...prev, value]
    );
  }

  function toggleExtensionType(value: string) {
    setExtensionType((prev) =>
      prev.includes(value)
        ? prev.filter((t) => t !== value)
        : [...prev, value]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    // Captured before the save below - hairProfile reflects the profile
    // as it existed prior to this submission, so this is only true for a
    // genuine first-time save, not the 30-day-locked "update my profile"
    // flow (which reuses this same handler via upsert).
    const isNewProfile = !hairProfile;

    const isChildOrBaby = profileFor === "child" || profileFor === "baby";
    const showHairGoals = profileFor === "myself" && gender === "male";

    const showAdultAgeRange = profileFor === "myself";

    const payload = {
      profile_for: profileFor,
      age_range: isChildOrBaby ? ageRange : null,
      adult_age_range:
        showAdultAgeRange && adultAgeRange !== "prefer_not_to_say"
          ? adultAgeRange
          : null,
      gender,
      hair_goals: showHairGoals ? hairGoals : [],
      curl_type: curlType,
      porosity,
      scalp_condition: scalpCondition,
      strand_thickness: strandThickness,
      zip_code: zipCode,
      climate,
      water_hardness: waterHardness,
      hair_concerns: hairConcerns,
      first_name: firstName,
      last_name: lastName,
      email,
      shower_filter: showerFilter,
      color_treated: colorTreated,
      color_type: colorTreated === "yes" ? colorType : null,
      extensions,
      extension_type: extensions === "yes" ? extensionType : [],
      extension_care: extensions === "yes" ? extensionCare : "",
      budget,
      notes,
      updated_at: new Date().toISOString(),
    };

    const { data, error: saveError } = user
      ? await supabase
          .from("hair_profiles")
          .upsert({ ...payload, user_id: user.id }, { onConflict: "user_id" })
          .select("id")
          .single()
      : await supabase
          .from("hair_profiles")
          .insert(payload)
          .select("id")
          .single();

    setSubmitting(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    if (data?.id) {
      localStorage.setItem("hair_profile_id", data.id);
      setSuccess(true);

      if (isNewProfile) {
        // Fire-and-forget - never awaited, never shown to the user, and
        // must not delay the redirect below.
        fetch("/api/notify/new-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            curl_type: curlType,
            porosity,
            scalp_condition: scalpCondition,
            strand_thickness: strandThickness,
            zip_code: zipCode,
            profile_for: profileFor,
            extensions,
            color_treated: colorTreated,
            budget,
          }),
        }).catch(() => {});
      }

      if (user) await refreshHairProfile();
      router.push("/dashboard");
    }
  }

  if (user && hairProfileLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-dark font-sans">
        <p className="text-sm text-cream/60">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-dark font-sans text-cream">
      <HairTypeStrip tileSize={160} />

      <div className="px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-md">
        <h1 className="font-serif text-3xl font-semibold text-cream sm:text-4xl">
          {showForm ? "Hair Profile" : "Your Hair Profile"}
        </h1>
        <p className="mt-2 text-sm text-cream/70">
          {showForm
            ? "Tell us about your hair so we can personalize your routine."
            : "This is what we're using to personalize your scores and routine."}
        </p>

        {isAdminUser && (
          <span className="mt-3 inline-block rounded-full bg-bronze px-3 py-1 text-xs font-semibold text-dark">
            Admin - unlimited edits
          </span>
        )}

        {!showForm && hairProfile && (
          <div className="mt-8 space-y-8">
            <ReadOnlyField label="Who is this profile for?">
              <Chip label={labelFor(PROFILE_FOR_OPTIONS, hairProfile.profile_for)} />
            </ReadOnlyField>

            {(hairProfile.profile_for === "child" ||
              hairProfile.profile_for === "baby") &&
              hairProfile.age_range && (
                <ReadOnlyField label="Age Range">
                  <Chip label={hairProfile.age_range} />
                </ReadOnlyField>
              )}

            {hairProfile.profile_for === "myself" &&
              formatAdultAgeRange(hairProfile.adult_age_range) && (
                <ReadOnlyField label="Age Range">
                  <Chip label={formatAdultAgeRange(hairProfile.adult_age_range)!} />
                </ReadOnlyField>
              )}

            {hairProfile.gender && (
              <ReadOnlyField label="Gender">
                <Chip label={labelFor(GENDER_OPTIONS, hairProfile.gender)} />
              </ReadOnlyField>
            )}

            {hairProfile.profile_for === "myself" &&
              hairProfile.gender === "male" &&
              hairProfile.hair_goals &&
              hairProfile.hair_goals.length > 0 && (
                <ReadOnlyField label="Hair Goals">
                  {hairProfile.hair_goals.map((g) => (
                    <Chip key={g} label={labelFor(HAIR_GOALS_OPTIONS, g)} />
                  ))}
                </ReadOnlyField>
              )}

            <ReadOnlyField label="Curl Type">
              <Chip
                label={
                  hairProfile.curl_type === "not_sure" || !hairProfile.curl_type
                    ? "Not sure"
                    : hairProfile.curl_type
                }
              />
            </ReadOnlyField>

            <ReadOnlyField label="Porosity">
              <Chip label={hairProfile.porosity ?? "Not sure"} />
            </ReadOnlyField>

            <ReadOnlyField label="Scalp Condition">
              <Chip label={hairProfile.scalp_condition ?? "Not set"} />
            </ReadOnlyField>

            <ReadOnlyField label="Strand Thickness">
              <Chip
                label={labelFor(THICKNESS_OPTIONS, hairProfile.strand_thickness)}
              />
            </ReadOnlyField>

            <ReadOnlyField label="Zip Code">
              <Chip label={hairProfile.zip_code || "Not set"} />
            </ReadOnlyField>

            <ReadOnlyField label="Hair Concerns">
              {hairProfile.hair_concerns && hairProfile.hair_concerns.length > 0 ? (
                hairProfile.hair_concerns.map((c) => <Chip key={c} label={c} />)
              ) : (
                <Chip label="None selected" />
              )}
            </ReadOnlyField>

            <ReadOnlyField label="Name">
              <Chip
                label={
                  [hairProfile.first_name, hairProfile.last_name]
                    .filter(Boolean)
                    .join(" ") || "Not set"
                }
              />
            </ReadOnlyField>

            <ReadOnlyField label="Email">
              <Chip label={hairProfile.email || "Not set"} />
            </ReadOnlyField>

            <ReadOnlyField label="Shower Filter">
              <Chip
                label={labelFor(SHOWER_FILTER_OPTIONS, hairProfile.shower_filter)}
              />
            </ReadOnlyField>

            <ReadOnlyField label="Color Treated">
              <Chip label={hairProfile.color_treated === "yes" ? "Yes" : "No"} />
              {hairProfile.color_treated === "yes" && hairProfile.color_type && (
                <Chip label={labelFor(COLOR_TYPE_OPTIONS, hairProfile.color_type)} />
              )}
            </ReadOnlyField>

            <ReadOnlyField label="Extensions / Protective Styles">
              <Chip label={hairProfile.extensions === "yes" ? "Yes" : "No"} />
              {hairProfile.extensions === "yes" &&
                hairProfile.extension_type?.map((t) => (
                  <Chip key={t} label={labelFor(EXTENSION_TYPE_OPTIONS, t)} />
                ))}
            </ReadOnlyField>

            {hairProfile.extensions === "yes" && hairProfile.extension_care && (
              <div>
                <p className="font-serif text-lg text-bronze2">
                  Extension Care
                </p>
                <p className="mt-3 text-sm text-cream/80">
                  {hairProfile.extension_care}
                </p>
              </div>
            )}

            <ReadOnlyField label="Monthly Budget">
              <Chip label={labelFor(BUDGET_OPTIONS, hairProfile.budget)} />
            </ReadOnlyField>

            {hairProfile.notes && (
              <div>
                <p className="font-serif text-lg text-bronze2">Notes</p>
                <p className="mt-3 text-sm text-cream/80">
                  {hairProfile.notes}
                </p>
              </div>
            )}

            {lockMessage && (
              <p className="text-sm text-amber">{lockMessage}</p>
            )}

            <button
              type="button"
              onClick={handleUpdateClick}
              className="w-full rounded-lg border border-bronze/40 py-3 text-sm font-semibold text-cream transition-colors hover:border-bronze"
            >
              Update my profile
            </button>
          </div>
        )}

        {showConfirmModal && (
          <ConfirmUpdateModal
            onConfirm={handleConfirmUpdate}
            onCancel={() => setShowConfirmModal(false)}
          />
        )}

        {showForm && (
        <form onSubmit={handleSubmit} className="mt-8 space-y-8">
          <div role="group" aria-labelledby="profile-for-label">
            <p
              id="profile-for-label"
              className="font-serif text-lg text-bronze2"
            >
              Who is this profile for?
            </p>
            <div className="mt-3 grid grid-cols-1 gap-3">
              {PROFILE_FOR_OPTIONS.map((option) => (
                <ProfileForOption
                  key={option.value}
                  label={option.label}
                  subtext={option.subtext}
                  selected={profileFor === option.value}
                  onClick={() => setProfileFor(option.value)}
                />
              ))}
            </div>
          </div>

          <div className="rounded-lg border-l-2 border-bronze bg-warm/10 px-4 py-3 text-xs leading-relaxed text-cream/70">
            Qoyl provides cosmetic hair care recommendations only. We do not
            address medical conditions, serious scalp disorders, or hair
            loss related to health conditions (such as alopecia,
            trichotillomania, or scalp infections). If you are experiencing
            significant hair loss, scalp pain, lesions, or other medical
            symptoms, please consult a licensed dermatologist or healthcare
            provider. Our recommendations are for general cosmetic hair
            care only.
          </div>

          {(profileFor === "child" || profileFor === "baby") && (
            <div className="rounded-lg border border-bronze/40 bg-warm/10 px-4 py-3 text-sm leading-relaxed text-cream/90">
              You&apos;re building a profile for a child. We&apos;ll
              prioritize gentle, age-appropriate ingredients and flag
              anything that may be too harsh for young scalps.
            </div>
          )}

          <Collapse show={profileFor === "myself"}>
            <div role="group" aria-labelledby="adult-age-range-label">
              <p
                id="adult-age-range-label"
                className="font-serif text-lg text-bronze2"
              >
                What is your age range?
              </p>
              <p className="mt-1 text-xs text-cream/60">
                Age affects hair texture, thickness, and scalp health. This
                helps us give you more accurate recommendations.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {ADULT_AGE_RANGE_OPTIONS.map((option) => (
                  <SelectButton
                    key={option.value}
                    label={option.label}
                    selected={adultAgeRange === option.value}
                    onClick={() => setAdultAgeRange(option.value)}
                  />
                ))}
                <SelectButton
                  label="Prefer not to say"
                  selected={adultAgeRange === "prefer_not_to_say"}
                  onClick={() => setAdultAgeRange("prefer_not_to_say")}
                />
              </div>
            </div>
          </Collapse>

          <div role="group" aria-labelledby="gender-label">
            <p
              id="gender-label"
              className="flex items-center gap-2 font-serif text-lg text-bronze2"
            >
              Gender
              <span className="text-xs font-normal normal-case text-cream/50">
                (optional)
              </span>
            </p>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {GENDER_OPTIONS.map((option) => (
                <SelectButton
                  key={option.value}
                  label={option.label}
                  selected={gender === option.value}
                  onClick={() =>
                    setGender(gender === option.value ? null : option.value)
                  }
                />
              ))}
            </div>
          </div>

          <Collapse show={profileFor === "myself" && gender === "male"}>
            <div role="group" aria-labelledby="hair-goals-label">
              <p
                id="hair-goals-label"
                className="font-serif text-lg text-bronze2"
              >
                What best describes your hair goals?
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {HAIR_GOALS_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-3 text-sm transition-colors ${
                      hairGoals.includes(option.value)
                        ? "border-bronze bg-bronze/20 text-cream"
                        : "border-bronze/40 text-cream/80 hover:border-bronze"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={hairGoals.includes(option.value)}
                      onChange={() => toggleHairGoal(option.value)}
                      className="accent-bronze"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>
          </Collapse>

          <div role="group" aria-labelledby="curl-type-label">
            <p
              id="curl-type-label"
              className="flex items-center gap-2 font-serif text-lg text-bronze2"
            >
              Curl Type
              <InfoTooltip
                label="Curl Type"
                illustrationSrc="/illustrations/curl_type_guide.svg"
                description="Look at your natural hair when dry with no products. Match your pattern to the image above."
              />
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {CURL_TYPE_GROUPS.map((group) => (
                <Fragment key={group}>
                  <CurlGroupDivider label={group} />
                  {CURL_TYPE_OPTIONS.filter((option) => option.group === group).map(
                    (option) => (
                      <CurlTypeCard
                        key={option.value}
                        option={option}
                        selected={curlType === option.value}
                        onClick={() => setCurlType(option.value)}
                      />
                    )
                  )}
                </Fragment>
              ))}
              <NotSureCurlCard
                selected={curlType === "not_sure"}
                onClick={() => setCurlType("not_sure")}
              />
            </div>
          </div>

          <Collapse show={profileFor === "child" || profileFor === "baby"}>
            <div role="group" aria-labelledby="age-range-label">
              <p
                id="age-range-label"
                className="font-serif text-lg text-bronze2"
              >
                Age range
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
                {AGE_RANGE_OPTIONS.map((option) => (
                  <SelectButton
                    key={option.value}
                    label={option.label}
                    selected={ageRange === option.value}
                    onClick={() => setAgeRange(option.value)}
                  />
                ))}
              </div>
            </div>
          </Collapse>

          <div role="group" aria-labelledby="porosity-label">
            <p
              id="porosity-label"
              className="flex items-center gap-2 font-serif text-lg text-bronze2"
            >
              Porosity
              <InfoTooltip
                label="Porosity"
                illustrationSrc="/illustrations/porosity_guide.svg"
                description="Do the float test - drop a clean strand in water. Floats = low porosity. Sinks slowly = medium. Sinks fast = high porosity. For straight hair, porosity affects how well your hair holds color and responds to treatments - not just moisture."
              />
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {POROSITY_OPTIONS.map((option) => (
                <SelectButton
                  key={option}
                  label={option}
                  selected={porosity === option}
                  onClick={() => setPorosity(option)}
                />
              ))}
            </div>
          </div>

          <fieldset>
            <label
              htmlFor="scalp-condition"
              className="flex items-center gap-2 font-serif text-lg text-bronze2"
            >
              Scalp Condition
              <InfoTooltip
                label="Scalp Condition"
                illustrationSrc="/illustrations/scalp_condition_guide.svg"
                description="Think about how your scalp behaves between wash days without any products."
              />
            </label>
            <select
              id="scalp-condition"
              value={scalpCondition}
              onChange={(e) => setScalpCondition(e.target.value)}
              className="mt-3 w-full rounded-lg border border-bronze/40 bg-transparent px-4 py-3 text-sm text-cream focus:border-bronze focus:outline-none"
            >
              <option value="" disabled className="text-dark">
                Select an option
              </option>
              {SCALP_OPTIONS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  className="text-dark"
                >
                  {option.label}
                </option>
              ))}
            </select>
          </fieldset>

          <div role="group" aria-labelledby="strand-thickness-label">
            <p
              id="strand-thickness-label"
              className="flex items-center gap-2 font-serif text-lg text-bronze2"
            >
              Strand Thickness
              <InfoTooltip
                label="Strand Thickness"
                illustrationSrc="/illustrations/strand_thickness_guide.svg"
                description="Pull out one strand and hold it between your fingers. Compare it to a piece of thread - thinner, same, or thicker?"
              />
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {THICKNESS_OPTIONS.map((option) => (
                <SelectButton
                  key={option.value}
                  label={option.label}
                  selected={strandThickness === option.value}
                  onClick={() => setStrandThickness(option.value)}
                />
              ))}
            </div>
          </div>

          <fieldset>
            <label
              htmlFor="zip-code"
              className="flex items-center gap-2 font-serif text-lg text-bronze2"
            >
              Zip Code
              <InfoTooltip
                label="Zip Code"
                description="We use this to determine your local climate and water hardness, which changes which ingredients work best for your hair."
              />
            </label>
            <input
              id="zip-code"
              type="text"
              inputMode="numeric"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              placeholder="e.g. 90210"
              className="mt-3 w-full rounded-lg border border-bronze/40 bg-transparent px-4 py-3 text-sm text-cream placeholder:text-cream/40 focus:border-bronze focus:outline-none"
            />

            {climate && (
              <div className="mt-3">
                <Chip label={`Detected climate: ${CLIMATE_LABELS[climate]}`} />
                <p className="mt-1.5 text-xs text-cream/50">
                  Based on your region&apos;s 30-year climate patterns.
                </p>
              </div>
            )}

            {waterHardness && (
              <div className="mt-3">
                <Chip
                  label={`Detected water hardness: ${WATER_HARDNESS_LABELS[waterHardness]}`}
                />
                <p className="mt-1.5 text-xs text-cream/50">
                  Based on published municipal water quality data for
                  your region. Actual hardness may vary by
                  neighborhood.
                </p>
              </div>
            )}
          </fieldset>

          <div role="group" aria-labelledby="hair-concerns-label">
            <p
              id="hair-concerns-label"
              className="flex items-center gap-2 font-serif text-lg text-bronze2"
            >
              Hair Concerns
              <InfoTooltip
                label="Hair Concerns"
                description="Select everything that applies - the more you tell us, the more specific your evaluations will be."
              />
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {CONCERN_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-3 text-sm capitalize transition-colors ${
                    hairConcerns.includes(option.value)
                      ? "border-bronze bg-bronze/20 text-cream"
                      : "border-bronze/40 text-cream/80 hover:border-bronze"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={hairConcerns.includes(option.value)}
                    onChange={() => toggleConcern(option.value)}
                    className="accent-bronze"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="font-serif text-lg text-bronze2">Name</p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                type="text"
                aria-label="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                className="w-full rounded-lg border border-bronze/40 bg-transparent px-4 py-3 text-sm text-cream placeholder:text-cream/40 focus:border-bronze focus:outline-none"
              />
              <input
                type="text"
                aria-label="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                className="w-full rounded-lg border border-bronze/40 bg-transparent px-4 py-3 text-sm text-cream placeholder:text-cream/40 focus:border-bronze focus:outline-none"
              />
            </div>
          </div>

          <fieldset>
            <label htmlFor="email" className="font-serif text-lg text-bronze2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-3 w-full rounded-lg border border-bronze/40 bg-transparent px-4 py-3 text-sm text-cream placeholder:text-cream/40 focus:border-bronze focus:outline-none"
            />
          </fieldset>

          <div role="group" aria-labelledby="shower-filter-label">
            <p
              id="shower-filter-label"
              className="flex items-center gap-2 font-serif text-lg text-bronze2"
            >
              Do you use a shower filter?
              <InfoTooltip
                label="Shower Filter"
                description="Shower filters remove chlorine and minerals that can dry out type 4 hair. This affects which cleansing ingredients we recommend."
              />
            </p>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {SHOWER_FILTER_OPTIONS.map((option) => (
                <SelectButton
                  key={option.value}
                  label={option.label}
                  selected={showerFilter === option.value}
                  onClick={() => setShowerFilter(option.value)}
                />
              ))}
            </div>
          </div>

          <div role="group" aria-labelledby="color-treated-label">
            <p
              id="color-treated-label"
              className="font-serif text-lg text-bronze2"
            >
              Is your hair color treated?
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {YES_NO_OPTIONS.map((option) => (
                <SelectButton
                  key={option.value}
                  label={option.label}
                  selected={colorTreated === option.value}
                  onClick={() => setColorTreated(option.value)}
                />
              ))}
            </div>

            <Collapse show={colorTreated === "yes"}>
              <div>
                <label
                  htmlFor="color-type"
                  className="font-serif text-lg text-bronze2"
                >
                  What type of color treatment?
                </label>
                <select
                  id="color-type"
                  value={colorType}
                  onChange={(e) => setColorType(e.target.value)}
                  className="mt-3 w-full rounded-lg border border-bronze/40 bg-transparent px-4 py-3 text-sm text-cream focus:border-bronze focus:outline-none"
                >
                  <option value="" disabled className="text-dark">
                    Select an option
                  </option>
                  {COLOR_TYPE_OPTIONS.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                      className="text-dark"
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </Collapse>
          </div>

          <div role="group" aria-labelledby="extensions-label">
            <p
              id="extensions-label"
              className="font-serif text-lg text-bronze2"
            >
              Do you wear extensions or protective styles?
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {YES_NO_OPTIONS.map((option) => (
                <SelectButton
                  key={option.value}
                  label={option.label}
                  selected={extensions === option.value}
                  onClick={() => setExtensions(option.value)}
                />
              ))}
            </div>

            <Collapse show={extensions === "yes"}>
              <div>
                <p className="font-serif text-lg text-bronze2">What type?</p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {EXTENSION_TYPE_OPTIONS.map((option) => (
                    <SelectButton
                      key={option.value}
                      label={option.label}
                      selected={extensionType.includes(option.value)}
                      onClick={() => toggleExtensionType(option.value)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label
                  htmlFor="extension-care"
                  className="font-serif text-lg text-bronze2"
                >
                  How do you care for your hair while in extensions?
                </label>
                <textarea
                  id="extension-care"
                  value={extensionCare}
                  onChange={(e) => setExtensionCare(e.target.value)}
                  placeholder="e.g. I moisturize my scalp weekly and wash every 2-3 weeks."
                  rows={4}
                  className="mt-3 w-full rounded-lg border border-bronze/40 bg-transparent px-4 py-3 text-sm text-cream placeholder:text-cream/40 focus:border-bronze focus:outline-none"
                />
              </div>
            </Collapse>
          </div>

          <div role="group" aria-labelledby="budget-label">
            <p
              id="budget-label"
              className="flex items-center gap-2 font-serif text-lg text-bronze2"
            >
              Monthly hair care budget.
              <InfoTooltip
                label="Budget"
                description="We use this to prioritize affordable product recommendations within your range."
              />
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {BUDGET_OPTIONS.map((option) => (
                <SelectButton
                  key={option.value}
                  label={option.label}
                  selected={budget === option.value}
                  onClick={() => setBudget(option.value)}
                />
              ))}
            </div>
          </div>

          <fieldset>
            <label htmlFor="notes" className="font-serif text-lg text-bronze2">
              Anything else we should know about your hair?
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tell us anything that might help us understand your hair better."
              rows={4}
              className="mt-3 w-full rounded-lg border border-bronze/40 bg-transparent px-4 py-3 text-sm text-cream placeholder:text-cream/40 focus:border-bronze focus:outline-none"
            />
          </fieldset>

          {error && <p className="text-sm text-red">{error}</p>}
          {success && (
            <p className="text-sm text-green">
              Profile saved! You&apos;re all set.
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-bronze py-3 text-sm font-semibold text-dark transition-colors hover:bg-bronze2 disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save Profile"}
          </button>
        </form>
        )}

        {/* Deliberately outside the showForm/summary split above - hair
            photos aren't part of the 30-day-locked profile fields, so
            they must stay reachable regardless of whether the rest of
            the profile is currently editable. */}
        {user && <HairJourneySection userId={user.id} />}
      </div>

      {user && <MyPurchases userId={user.id} />}
      </div>
    </main>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={null}>
      <ProfileForm />
    </Suspense>
  );
}
