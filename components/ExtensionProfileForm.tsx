"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CurlTypeSelector from "@/components/CurlTypeSelector";
import {
  AmberCallout,
  BronzeCallout,
  FieldLabel,
  SelectPill,
  TextInput,
  YesNoToggle,
} from "@/components/FamilyProfileFormUI";
import {
  ADHESIVE_TYPE_OPTIONS,
  adhesiveMethodsImplyAdhesive,
  BLEND_METHOD_LABELS,
  EXTENSION_SCALP_CONDITION_LABELS,
  EXTENSION_TEXTURE_LABELS,
  fromDbAdhesiveType,
  HEAT_BLEND_METHODS,
  INSTALL_DURATION_OPTIONS,
  LEAVE_OUT_AMOUNT_LABELS,
  NATURAL_HAIR_LENGTH_LABELS,
  WEAR_SCHEDULE_LABELS,
  type ExtensionProfile,
} from "@/lib/extensionProfiles";
import { classifyClimateFromZip } from "@/lib/climateData";
import { CLIMATE_LABELS, WATER_HARDNESS_LABELS } from "@/lib/locationFactors";
import { waterHardnessFromZip } from "@/lib/waterHardnessData";

const POROSITY_OPTIONS = ["low", "medium", "high", "not sure"] as const;

// ---- icons -----------------------------------------------------------

function WigIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="text-bronze">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 13c0-4.5 3.5-8 8-8s8 3.5 8 8v3H4v-3z" />
      <path strokeLinecap="round" d="M4 16c0 3 2 5 3 5M20 16c0 3-2 5-3 5M9 9c-1 1-1.5 2.5-1.5 4M15 9c1 1 1.5 2.5 1.5 4" />
    </svg>
  );
}

function StrandIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="text-bronze">
      <path strokeLinecap="round" d="M8 3c-1 4 2 5 1 9s-3 5-2 9M13 3c-1 4 2 5 1 9s-3 5-2 9M18 3c-1 4 2 5 1 9s-3 5-2 9" />
      <circle cx="8" cy="3" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="13" cy="3" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="18" cy="3" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function BraidIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="text-bronze">
      <path strokeLinecap="round" d="M12 2c2 2-2 3 0 5s-2 3 0 5-2 3 0 5-2 3 0 5" />
    </svg>
  );
}

function ClipIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="text-bronze">
      <rect x="6" y="4" width="12" height="6" rx="2" />
      <path strokeLinecap="round" d="M9 10v10M15 10v10" />
    </svg>
  );
}

function HaloIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="text-bronze">
      <ellipse cx="12" cy="7" rx="7" ry="2.5" />
      <path strokeLinecap="round" d="M6 8c0 6 2 11 6 13s6-7 6-13" />
    </svg>
  );
}

function NaturalIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="text-bronze">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21c4-3 6-7 6-11a6 6 0 10-12 0c0 4 2 8 6 11z" />
    </svg>
  );
}

const EXTENSION_TYPE_OPTIONS: {
  value: string;
  description: string;
  icon: () => React.ReactElement;
}[] = [
  { value: "wig_lace_front", description: "Lace at the hairline, secured with adhesive, clips, or elastic band", icon: WigIcon },
  { value: "wig_full_lace_360", description: "Lace all around, most versatile parting options", icon: WigIcon },
  { value: "wig_glueless", description: "No adhesive needed - secured with combs, clips, and elastic band", icon: WigIcon },
  { value: "crochet", description: "Synthetic or human hair looped through a braided base", icon: BraidIcon },
  { value: "tape_in", description: "Adhesive weft attached close to the scalp - most affected by wrong products", icon: StrandIcon },
  { value: "k_tip", description: "Keratin bond individual strands - oil dissolves the bond", icon: StrandIcon },
  { value: "i_tip", description: "Bead or loop attachment - no adhesive but product causes matting", icon: StrandIcon },
  { value: "clip_in", description: "Temporary - removed daily for washing", icon: ClipIcon },
  { value: "sew_in_weave", description: "Weft sewn onto braided cornrow base", icon: BraidIcon },
  { value: "halo", description: "Wire-based temporary extension that sits on top of natural hair", icon: HaloIcon },
  { value: "protective_style_only", description: "No added hair - just my natural hair in a protective style", icon: NaturalIcon },
];

// UI-facing labels/eligibility, distinct from lib/extensionProfiles.ts's
// EXTENSION_TYPE_LABELS (which is keyed by the real DB values) - this form
// shows one combined "Full Lace / 360 Wig" card and one "Protective style
// only" card that don't correspond 1:1 to allowed DB values (see
// toDbExtensionTypes/fromDbExtensionTypes below).
const UI_TYPE_LABELS: Record<string, string> = {
  wig_lace_front: "Lace Front Wig",
  wig_full_lace_360: "Full Lace / 360 Wig",
  wig_glueless: "Glueless Wig",
  crochet: "Crochet Hair",
  tape_in: "Tape-In Extensions",
  k_tip: "K-Tip / Fusion Extensions",
  i_tip: "I-Tip / Micro Bead / Loop",
  clip_in: "Clip-In Extensions",
  sew_in_weave: "Sew-In Weave",
  halo: "Halo Extension",
  protective_style_only: "Protective style only (braids/twists/locs)",
};

const UI_WIG_TYPES = ["wig_lace_front", "wig_full_lace_360", "wig_glueless"];
const UI_BLENDING_ELIGIBLE_TYPES = [...UI_WIG_TYPES, "sew_in_weave", "clip_in"];
const UI_ADHESIVE_ELIGIBLE_TYPES = [...UI_WIG_TYPES, "tape_in"];

// extension_profiles.extension_types has a pre-existing CHECK constraint
// (discovered by probing live inserts - not visible via the PostgREST
// schema) that allows: wig_lace_front, wig_full_lace, wig_360,
// wig_glueless, crochet, tape_in, k_tip, i_tip, clip_in, sew_in_weave,
// halo. It has no allowed value for "protective style only" - an empty
// array is what it accepts for that case, which conveniently also
// matches every routine/product generator's existing empty-array
// fallback path.
function toDbExtensionTypes(uiTypes: string[]): string[] {
  const result: string[] = [];
  for (const t of uiTypes) {
    if (t === "protective_style_only") continue;
    if (t === "wig_full_lace_360") {
      result.push("wig_full_lace", "wig_360");
      continue;
    }
    result.push(t);
  }
  return result;
}

function fromDbExtensionTypes(dbTypes: string[]): string[] {
  const rest = dbTypes.filter((t) => t !== "wig_full_lace" && t !== "wig_360");
  if (dbTypes.includes("wig_full_lace") || dbTypes.includes("wig_360")) {
    rest.push("wig_full_lace_360");
  }
  if (dbTypes.length === 0) rest.push("protective_style_only");
  return rest;
}

function ExtensionTypeCard({
  label,
  description,
  Icon,
  selected,
  onClick,
}: {
  label: string;
  description: string;
  Icon: () => React.ReactElement;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex flex-col items-start gap-2 rounded-xl p-4 text-left transition-colors ${
        selected ? "border-2 border-bronze bg-bronze/10" : "border border-[#e8e8e8] hover:border-bronze/50"
      }`}
    >
      <Icon />
      <span className="font-serif text-base font-semibold text-dark">{label}</span>
      <span className="text-xs leading-relaxed text-dark/60">{description}</span>
    </button>
  );
}

export default function ExtensionProfileForm({
  userId,
  initialData,
  onSaved,
}: {
  userId: string;
  initialData?: ExtensionProfile;
  onSaved?: (id: string) => void;
}) {
  const router = useRouter();

  // fromDbExtensionTypes([]) treats "no types" as "protective style only"
  // (see its comment) - correct when editing a profile that was genuinely
  // saved that way, but wrong for a brand-new form where initialData is
  // undefined and nothing has been chosen yet.
  const [extensionTypes, setExtensionTypes] = useState<string[]>(() =>
    initialData ? fromDbExtensionTypes(initialData.extension_types ?? []) : []
  );
  const [naturalCurlType, setNaturalCurlType] = useState<string | null>(initialData?.natural_curl_type ?? null);
  const [naturalPorosity, setNaturalPorosity] = useState<string | null>(initialData?.natural_porosity ?? null);
  const [naturalHairLength, setNaturalHairLength] = useState<string | null>(
    initialData?.natural_hair_length ?? null
  );
  const [scalpCondition, setScalpCondition] = useState<string | null>(initialData?.scalp_condition ?? null);
  const [extensionTexture, setExtensionTexture] = useState<string | null>(initialData?.extension_texture ?? null);
  const [needsBlending, setNeedsBlending] = useState<boolean | null>(initialData?.needs_blending ?? null);
  const [blendMethod, setBlendMethod] = useState<string | null>(initialData?.blend_method ?? null);
  const [leaveOutAmount, setLeaveOutAmount] = useState<string | null>(initialData?.leave_out_amount ?? null);
  const [wearSchedule, setWearSchedule] = useState<string | null>(initialData?.wear_schedule ?? null);
  const [installDurationWeeks, setInstallDurationWeeks] = useState<number | null>(
    initialData?.install_duration_weeks ?? null
  );
  const [adhesiveMethods, setAdhesiveMethods] = useState<string[]>(() =>
    fromDbAdhesiveType(initialData?.adhesive_type ?? null)
  );
  const [zipCode, setZipCode] = useState(initialData?.zip_code ?? "");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isPlausibleZip = /^\d{5}$/.test(zipCode.trim());
  const climate = useMemo(
    () => (isPlausibleZip ? classifyClimateFromZip(zipCode) : null),
    [isPlausibleZip, zipCode]
  );
  const waterHardness = useMemo(
    () => (isPlausibleZip ? waterHardnessFromZip(zipCode) : null),
    [isPlausibleZip, zipCode]
  );

  const showBlendingSection = extensionTypes.some((t) => UI_BLENDING_ELIGIBLE_TYPES.includes(t));
  const showAdhesiveSection = extensionTypes.some((t) => UI_ADHESIVE_ELIGIBLE_TYPES.includes(t));

  // "Protective style only" means no added hair at all - selecting it
  // clears every other selection, and selecting anything else clears it
  // right back out, since the two are mutually exclusive by definition.
  function toggleExtensionType(value: string) {
    setExtensionTypes((prev) => {
      if (value === "protective_style_only") {
        return prev.includes(value) ? [] : ["protective_style_only"];
      }
      const withoutProtectiveOnly = prev.filter((v) => v !== "protective_style_only");
      return withoutProtectiveOnly.includes(value)
        ? withoutProtectiveOnly.filter((v) => v !== value)
        : [...withoutProtectiveOnly, value];
    });
  }

  function toggleAdhesiveMethod(value: string) {
    setAdhesiveMethods((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/family-profiles/extension", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: initialData?.id,
          user_id: userId,
          extension_types: toDbExtensionTypes(extensionTypes),
          natural_curl_type: naturalCurlType,
          natural_porosity: naturalPorosity,
          natural_hair_length: naturalHairLength,
          scalp_condition: scalpCondition,
          extension_texture: extensionTexture,
          needs_blending: showBlendingSection ? Boolean(needsBlending) : false,
          blend_method: blendMethod,
          leave_out_amount: leaveOutAmount,
          wear_schedule: wearSchedule,
          install_duration_weeks: installDurationWeeks,
          adhesive_methods: showAdhesiveSection ? adhesiveMethods : [],
          zip_code: zipCode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setSuccess(true);
      if (onSaved) {
        onSaved(data.id);
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-8">
      <BronzeCallout>
        Extension and wig care is one of the most misunderstood areas of hair care. The wrong
        products can dissolve bonds, cause slippage, and permanently damage expensive installs.
        Qoyl will build you a routine that protects your investment and your natural hair
        underneath.
      </BronzeCallout>

      {/* Section 1 */}
      <div role="group" aria-labelledby="extension-types-label">
        <p id="extension-types-label" className="font-serif text-lg text-bronze2">
          What type of extensions or hair do you wear?
        </p>
        <FieldLabel>
          <span className="text-sm text-dark/60">Select all that apply:</span>
        </FieldLabel>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {EXTENSION_TYPE_OPTIONS.map((option) => (
            <ExtensionTypeCard
              key={option.value}
              label={UI_TYPE_LABELS[option.value]}
              description={option.description}
              Icon={option.icon}
              selected={extensionTypes.includes(option.value)}
              onClick={() => toggleExtensionType(option.value)}
            />
          ))}
        </div>
      </div>

      {/* Section 2 */}
      <div>
        <p className="font-serif text-lg text-bronze2">Your natural hair underneath:</p>
        <p className="mt-1 text-sm text-dark/60">
          This determines how we protect and maintain your hair during the install.
        </p>

        <div className="mt-4">
          <p className="font-serif text-base text-bronze2">Curl Type</p>
          <div className="mt-3">
            <CurlTypeSelector value={naturalCurlType} onChange={setNaturalCurlType} />
          </div>
        </div>

        <div className="mt-6" role="group" aria-labelledby="natural-porosity-label">
          <p id="natural-porosity-label" className="font-serif text-base text-bronze2">
            Porosity
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {POROSITY_OPTIONS.map((option) => (
              <SelectPill
                key={option}
                label={option}
                selected={naturalPorosity === option}
                onClick={() => setNaturalPorosity(option)}
              />
            ))}
          </div>
        </div>

        <div className="mt-6" role="group" aria-labelledby="natural-length-label">
          <p id="natural-length-label" className="font-serif text-base text-bronze2">
            Natural hair length
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Object.entries(NATURAL_HAIR_LENGTH_LABELS).map(([value, label]) => (
              <SelectPill
                key={value}
                label={label}
                selected={naturalHairLength === value}
                onClick={() => setNaturalHairLength(value)}
              />
            ))}
          </div>
        </div>

        <div className="mt-6" role="group" aria-labelledby="extension-scalp-label">
          <p id="extension-scalp-label" className="font-serif text-base text-bronze2">
            Scalp condition during wear
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Object.entries(EXTENSION_SCALP_CONDITION_LABELS).map(([value, label]) => (
              <SelectPill
                key={value}
                label={label}
                selected={scalpCondition === value}
                onClick={() => setScalpCondition(value)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Section 3 */}
      <div role="group" aria-labelledby="extension-texture-label">
        <p id="extension-texture-label" className="font-serif text-lg text-bronze2">
          What is your extension or wig hair?
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Object.entries(EXTENSION_TEXTURE_LABELS).map(([value, label]) => (
            <SelectPill
              key={value}
              label={label}
              selected={extensionTexture === value}
              onClick={() => setExtensionTexture(value)}
            />
          ))}
        </div>
        {extensionTexture === "synthetic" && (
          <div className="mt-3">
            <BronzeCallout>
              Synthetic hair cannot be heat styled (unless heat-resistant). Many products
              designed for natural hair cause synthetic hair to mat and become unmanageable. We
              will recommend synthetic-safe products only.
            </BronzeCallout>
          </div>
        )}
        {extensionTexture && extensionTexture.startsWith("human_") && (
          <div className="mt-3">
            <BronzeCallout>
              Human hair extensions respond to products similarly to natural hair but receive no
              natural oils from your scalp. They need regular moisturizing and conditioning.
            </BronzeCallout>
          </div>
        )}
      </div>

      {/* Section 4 */}
      {showBlendingSection && (
        <div role="group" aria-labelledby="blending-toggle-label">
          <p id="blending-toggle-label" className="font-serif text-lg text-bronze2">
            Do you blend your natural hair with your extensions?
          </p>
          <YesNoToggle value={needsBlending} onChange={setNeedsBlending} />

          {needsBlending === true && (
            <div className="mt-6 space-y-6">
              <div role="group" aria-labelledby="blend-method-label">
                <p id="blend-method-label" className="font-serif text-base text-bronze2">
                  How do you blend your edges or leave-out?
                </p>
                <div className="mt-3 grid grid-cols-1 gap-3">
                  {Object.entries(BLEND_METHOD_LABELS).map(([value, label]) => (
                    <SelectPill
                      key={value}
                      label={label}
                      selected={blendMethod === value}
                      onClick={() => setBlendMethod(value)}
                    />
                  ))}
                </div>
                {blendMethod && HEAT_BLEND_METHODS.includes(blendMethod) && (
                  <div className="mt-3">
                    <AmberCallout>
                      Blending with heat on natural hair that is already textured carries risk of
                      heat damage over time. We will include heat protectants and recommend
                      techniques to minimize damage to your natural curl pattern during blending.
                    </AmberCallout>
                  </div>
                )}
              </div>

              <div role="group" aria-labelledby="leave-out-label">
                <p id="leave-out-label" className="font-serif text-base text-bronze2">
                  How much natural hair do you leave out?
                </p>
                <div className="mt-3 grid grid-cols-1 gap-3">
                  {Object.entries(LEAVE_OUT_AMOUNT_LABELS).map(([value, label]) => (
                    <SelectPill
                      key={value}
                      label={label}
                      selected={leaveOutAmount === value}
                      onClick={() => setLeaveOutAmount(value)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Section 5 */}
      <div role="group" aria-labelledby="wear-schedule-label">
        <p id="wear-schedule-label" className="font-serif text-lg text-bronze2">
          How often do you wear this style?
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Object.entries(WEAR_SCHEDULE_LABELS).map(([value, label]) => (
            <SelectPill
              key={value}
              label={label}
              selected={wearSchedule === value}
              onClick={() => setWearSchedule(value)}
            />
          ))}
        </div>
      </div>

      <div role="group" aria-labelledby="install-duration-label">
        <p id="install-duration-label" className="font-serif text-lg text-bronze2">
          How long do you keep this install?
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {INSTALL_DURATION_OPTIONS.map((option) => (
            <SelectPill
              key={option.value}
              label={option.label}
              selected={installDurationWeeks === option.value}
              onClick={() => setInstallDurationWeeks(option.value)}
            />
          ))}
        </div>
      </div>

      {/* Section 6 */}
      {showAdhesiveSection && (
        <div role="group" aria-labelledby="adhesive-label">
          <p id="adhesive-label" className="font-serif text-lg text-bronze2">
            How do you secure your wig or tape-ins?
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {ADHESIVE_TYPE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`flex items-center gap-2 rounded-lg border px-3 py-3 text-sm transition-colors ${
                  adhesiveMethods.includes(option.value)
                    ? "border-bronze bg-bronze/20 text-cream"
                    : "border-bronze/40 text-dark/80 hover:border-bronze"
                }`}
              >
                <input
                  type="checkbox"
                  checked={adhesiveMethods.includes(option.value)}
                  onChange={() => toggleAdhesiveMethod(option.value)}
                  className="accent-bronze"
                />
                {option.label}
              </label>
            ))}
          </div>
          {adhesiveMethodsImplyAdhesive(adhesiveMethods) && (
            <div className="mt-3">
              <AmberCallout>
                Wig adhesive and glue require a specific removal routine to prevent hairline
                damage and alopecia. We will include adhesive remover in your product
                recommendations and show you how to remove safely.
              </AmberCallout>
            </div>
          )}
        </div>
      )}

      {/* Section 7 */}
      <fieldset>
        <label htmlFor="extension-zip" className="font-serif text-lg text-bronze2">
          Zip Code
        </label>
        <TextInput id="extension-zip" value={zipCode} onChange={setZipCode} placeholder="e.g. 90210" />
        {climate && (
          <p className="mt-2 text-xs text-dark/50">Detected climate: {CLIMATE_LABELS[climate]}</p>
        )}
        {waterHardness && (
          <p className="mt-1 text-xs text-dark/50">
            Detected water hardness: {WATER_HARDNESS_LABELS[waterHardness]}
          </p>
        )}
      </fieldset>

      {error && <p className="text-sm text-red">{error}</p>}
      {success && <p className="text-sm text-green">Extension routine saved!</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-bronze py-3 text-sm font-semibold text-cream transition-colors hover:bg-bronze2 disabled:opacity-50"
      >
        {submitting ? "Saving..." : "Build my extension routine →"}
      </button>
    </form>
  );
}
