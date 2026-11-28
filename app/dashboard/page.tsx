"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import BathroomShelf from "@/components/BathroomShelf";
import { useAuth } from "@/lib/auth-context";
import type { CartItem } from "@/lib/styleCart";
import { formatAdultAgeRange } from "@/lib/ageRange";
import { getChildSafetyNote } from "@/lib/childSafety";
import {
  protectiveStyleTypeFromExtensionType,
  PROTECTIVE_STYLE_LABEL,
} from "@/lib/protectiveStyleRoutine";
import { getBasicRoutineSteps, RoutineStep } from "@/lib/routine";
import { supabase } from "@/lib/supabase";
import PushOptIn from "@/components/PushOptIn";

const SCALP_LABELS: Record<string, string> = {
  normal: "Normal scalp",
  dry: "Dry scalp",
  oily: "Oily scalp",
  sensitive: "Sensitive scalp",
  "dandruff-prone": "Dandruff-prone scalp",
};

function routineFocusChipLabel(
  routineFocus: string | null,
  extensionType: string[] | null
): string | null {
  if (routineFocus === "natural_hair") return "Natural hair focus";
  if (routineFocus === "both") return "Both routines";
  if (routineFocus === "extensions") {
    const styleType = protectiveStyleTypeFromExtensionType(extensionType);
    return styleType ? `${PROTECTIVE_STYLE_LABEL[styleType]} care focus` : "Protective style focus";
  }
  return null;
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, hairProfile } = useAuth();

  const [checkedAccess, setCheckedAccess] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [entitlementLoading, setEntitlementLoading] = useState(true);

  const paymentStatus = searchParams.get("payment");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/auth");
      return;
    }
    setCheckedAccess(true);
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function loadEntitlement() {
      setEntitlementLoading(true);
      try {
        const res = await fetch(`/api/purchases?user_id=${user!.id}`);
        const data = await res.json();
        if (!cancelled) {
          setIsAdminUser(Boolean(data.isAdmin));
        }
      } catch {
        // Fail closed - treat as not subscribed.
      } finally {
        if (!cancelled) setEntitlementLoading(false);
      }
    }

    loadEntitlement();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const [steps, setSteps] = useState<RoutineStep[]>([]);

  useEffect(() => {
    if (!hairProfile) return;
    setSteps(getBasicRoutineSteps(hairProfile));
  }, [hairProfile]);

  // Standalone shelf (style_cart rows where style_match_id IS NULL)
  const [shelfCartId, setShelfCartId] = useState<string | null>(null);
  const [shelfItems, setShelfItems] = useState<CartItem[]>([]);
  const [shelfLoaded, setShelfLoaded] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    // Always call seed first. The seed endpoint is idempotent — it returns
    // the existing shelf immediately when it's already populated with
    // profile-aware categories, and re-seeds when the shelf is empty or
    // was seeded with the old generic 6-category approach.
    fetch("/api/shelf/seed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user.id }),
    })
      .then((res) => res.json())
      .then((seeded) => {
        if (cancelled) return;
        if (seeded.cart_id && Array.isArray(seeded.items) && seeded.items.length > 0) {
          setShelfCartId(seeded.cart_id);
          setShelfItems(seeded.items);
          setShelfLoaded(true);
          return;
        }
        // Seed returned empty (catalog gap) — fall back to a direct shelf GET
        return fetch(`/api/shelf?user_id=${user.id}`)
          .then((r) => r.json())
          .then((json) => {
            if (cancelled) return;
            setShelfCartId(json.cart_id ?? null);
            setShelfItems(json.items ?? []);
            setShelfLoaded(true);
          });
      })
      .catch(() => {
        if (!cancelled) setShelfLoaded(true);
      });
    return () => { cancelled = true; };
  }, [user]);

  if (!checkedAccess) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white font-sans">
        <p className="text-sm text-dark/60">Loading...</p>
      </main>
    );
  }

  const isChildOrBabyProfile =
    hairProfile?.profile_for === "child" || hairProfile?.profile_for === "baby";

  const greeting = hairProfile?.first_name
    ? isChildOrBabyProfile
      ? `Here's ${hairProfile.first_name}'s routine`
      : `Welcome back, ${hairProfile.first_name}`
    : "Welcome to Qoyl";

  const childSafetyNote = getChildSafetyNote(hairProfile?.profile_for ?? null);

  const profileChips = hairProfile ? [
    hairProfile.curl_type && hairProfile.curl_type !== "not_sure" ? `Curl type ${hairProfile.curl_type}` : null,
    hairProfile.porosity && hairProfile.porosity !== "not sure" ? `${hairProfile.porosity} porosity` : null,
    hairProfile.scalp_condition ? SCALP_LABELS[hairProfile.scalp_condition] ?? hairProfile.scalp_condition : null,
    formatAdultAgeRange(hairProfile.adult_age_range),
    routineFocusChipLabel(hairProfile.routine_focus, hairProfile.extension_type),
  ].filter((c): c is string => Boolean(c)) : [];

  return (
    <>
    <main className="min-h-screen bg-white font-sans text-dark">
      {/* Minimal top bar */}
      <div className="flex items-center justify-between px-4 py-4 sm:px-6">
        <span className="font-serif text-xl font-semibold tracking-tight text-dark">qoyl</span>
        <div className="flex items-center gap-4">
          {!entitlementLoading && isAdminUser && (
            <Link href="/admin/products" className="text-xs font-semibold uppercase tracking-wide text-bronze2 hover:text-dark">
              Admin
            </Link>
          )}
          <button
            onClick={async () => { await supabase.auth.signOut(); router.push("/"); }}
            className="text-xs text-dark/40 hover:text-dark/70"
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 pb-16 sm:px-6">
        {childSafetyNote && (
          <p className="mb-4 border border-bronze/40 bg-warm/10 px-4 py-3 text-sm text-dark/90">
            {childSafetyNote}
          </p>
        )}

        {paymentStatus === "success" && (
          <p className="mb-4 rounded-lg border border-green/40 bg-green/10 px-4 py-3 text-sm text-green">
            You&apos;re all set - your travel kit is ready.
          </p>
        )}
        {paymentStatus === "cancelled" && (
          <p className="print-hide mb-4 border border-bronze/40 bg-bronze/10 px-4 py-3 text-sm text-cream/80">
            No worries - you can unlock this anytime.
          </p>
        )}

        {/* Shelf — the whole home */}
        {shelfLoaded && (
          <BathroomShelf
            cartId={shelfCartId ?? ""}
            items={shelfItems}
            greeting={greeting}
            profileChips={profileChips}
            routineSteps={steps}
          />
        )}

        {!shelfLoaded && (
          <p className="mt-16 text-center text-sm text-dark/40">Loading your shelf...</p>
        )}
      </div>
    </main>
    <PushOptIn autoPrompt={true} />
    </>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardContent />
    </Suspense>
  );
}
