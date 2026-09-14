"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import CurlTypeSelector from "@/components/CurlTypeSelector";
import {
  AmberCallout,
  FieldHelper,
  FieldLabel,
  SelectPill,
  TextAreaInput,
  TextInput,
  YesNoToggle,
} from "@/components/FamilyProfileFormUI";
import { classifyClimateFromZip } from "@/lib/climateData";
import { CLIMATE_LABELS, WATER_HARDNESS_LABELS } from "@/lib/locationFactors";
import { waterHardnessFromZip } from "@/lib/waterHardnessData";
import type { ChildProfile } from "@/lib/familyProfiles";

const AGE_OPTIONS = ["2-4", "5-7", "8-10", "11-12", "13+"];
const AGE_LABELS: Record<string, string> = {
  "2-4": "2-4 years",
  "5-7": "5-7 years",
  "8-10": "8-10 years",
  "11-12": "11-12 years",
  "13+": "13+",
};

const DENSITY_OPTIONS = [
  { value: "fine", label: "Fine" },
  { value: "medium", label: "Medium" },
  { value: "thick", label: "Thick" },
];

const SCALP_OPTIONS = [
  { value: "normal", label: "Normal" },
  { value: "dry_flaky", label: "Dry or flaky" },
  { value: "sensitive_irritated", label: "Sensitive or easily irritated" },
  { value: "oily", label: "Oily" },
  { value: "dandruff_prone", label: "Prone to dandruff" },
];

const CONCERN_OPTIONS = [
  { value: "dryness", label: "Dryness" },
  { value: "tangling_knots", label: "Tangling and knots" },
  { value: "breakage", label: "Breakage" },
  { value: "slow_growth", label: "Slow growth" },
  { value: "scalp_itchiness", label: "Scalp itchiness" },
  { value: "edges_hairline", label: "Edges or hairline concerns" },
  { value: "transitioning_relaxer", label: "Transitioning from relaxer" },
  { value: "none", label: "None currently" },
];

const WASH_FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "every_2_3_days", label: "Every 2-3 days" },
  { value: "weekly", label: "Weekly" },
  { value: "every_2_weeks", label: "Every 2 weeks" },
];

const COOPERATIVE_OPTIONS = [
  { value: "parent_easy", label: "I do it - they sit still well" },
  { value: "parent_difficult", label: "I do it - it can be a challenge" },
  { value: "learning", label: "They are learning to do it themselves" },
  { value: "independent", label: "They mostly do it themselves" },
];

export default function ChildProfileForm({
  userId,
  initialData,
  onSaved,
}: {
  userId: string;
  initialData?: ChildProfile;
  onSaved?: (id: string) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialData?.name ?? "");
  const [ageRange, setAgeRange] = useState<string | null>(initialData?.age_range ?? null);
  const [curlType, setCurlType] = useState<string | null>(initialData?.curl_type ?? null);
  const [hairDensity, setHairDensity] = useState<string | null>(initialData?.hair_density ?? null);
  const [scalpCondition, setScalpCondition] = useState<string | null>(initialData?.scalp_condition ?? null);
  const [hairConcerns, setHairConcerns] = useState<string[]>(initialData?.hair_concerns ?? []);
  const [washFrequency, setWashFrequency] = useState<string | null>(initialData?.wash_frequency ?? null);
  const [cooperativeLevel, setCooperativeLevel] = useState<string | null>(
    initialData?.cooperative_level ?? null
  );
  const [sensorySensitive, setSensorySensitive] = useState<boolean | null>(
    initialData?.sensory_sensitive ?? null
  );
  const [usesProtectiveStyles, setUsesProtectiveStyles] = useState<boolean | null>(
    initialData?.uses_protective_styles ?? null
  );
  const [protectiveStylesUseExtensions, setProtectiveStylesUseExtensions] = useState<boolean | null>(
    initialData?.protective_styles_use_extensions ?? null
  );
  const [heatToolsUsed, setHeatToolsUsed] = useState<boolean | null>(initialData?.heat_tools_used ?? null);
  const [zipCode, setZipCode] = useState(initialData?.zip_code ?? "");
  const [notes, setNotes] = useState(initialData?.notes ?? "");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const displayName = name.trim();

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
    setHairConcerns((prev) => (prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/family-profiles/child", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: initialData?.id,
          user_id: userId,
          name: displayName,
          age_range: ageRange,
          curl_type: curlType,
          hair_density: hairDensity,
          scalp_condition: scalpCondition,
          hair_concerns: hairConcerns,
          wash_frequency: washFrequency,
          cooperative_level: cooperativeLevel,
          sensory_sensitive: sensorySensitive ?? false,
          uses_protective_styles: usesProtectiveStyles ?? false,
          protective_styles_use_extensions: protectiveStylesUseExtensions ?? false,
          heat_tools_used: heatToolsUsed ?? false,
          zip_code: zipCode,
          climate,
          water_hardness: waterHardness,
          notes,
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
      <div className="border border-bronze/40 bg-warm/10 px-4 py-3 text-sm leading-relaxed text-dark/90">
        Building a hair profile for your child. These recommendations are tailored for
        children&apos;s hair and prioritize gentle, age-appropriate products.
      </div>

      <fieldset>
        <label htmlFor="child-name" className="font-serif text-lg text-bronze2">
          What is your child&apos;s name? (optional)
        </label>
        <TextInput id="child-name" value={name} onChange={setName} placeholder="Child's name" />
        <FieldHelper>We use this to personalize their profile</FieldHelper>
      </fieldset>

      <div role="group" aria-labelledby="child-age-label">
        <FieldLabel>
          <span id="child-age-label">How old are they?</span>
        </FieldLabel>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {AGE_OPTIONS.map((value) => (
            <SelectPill
              key={value}
              label={AGE_LABELS[value]}
              selected={ageRange === value}
              onClick={() => setAgeRange(value)}
            />
          ))}
        </div>
        {ageRange === "13+" && (
          <div className="mt-3 border-l-2 border-bronze bg-amber/10 px-4 py-3 text-sm leading-relaxed text-dark/90">
            For teens we recommend using our standard adult profile for more detailed
            personalization →{" "}
            <Link href="/profile" className="underline underline-offset-2 hover:text-dark">
              Go to adult profile
            </Link>
          </div>
        )}
      </div>

      <div role="group" aria-labelledby="child-curl-label">
        <p id="child-curl-label" className="font-serif text-lg text-bronze2">
          Curl Type
        </p>
        <div className="mt-3">
          <CurlTypeSelector value={curlType} onChange={setCurlType} />
        </div>
      </div>

      <div role="group" aria-labelledby="child-density-label">
        <FieldLabel>
          <span id="child-density-label">How would you describe their hair density?</span>
        </FieldLabel>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {DENSITY_OPTIONS.map((option) => (
            <SelectPill
              key={option.value}
              label={option.label}
              selected={hairDensity === option.value}
              onClick={() => setHairDensity(option.value)}
            />
          ))}
        </div>
      </div>

      <div role="group" aria-labelledby="child-scalp-label">
        <FieldLabel>
          <span id="child-scalp-label">How does their scalp look and feel?</span>
        </FieldLabel>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {SCALP_OPTIONS.map((option) => (
            <SelectPill
              key={option.value}
              label={option.label}
              selected={scalpCondition === option.value}
              onClick={() => setScalpCondition(option.value)}
            />
          ))}
        </div>
      </div>

      <div role="group" aria-labelledby="child-concerns-label">
        <FieldLabel>
          <span id="child-concerns-label">Select any concerns that apply:</span>
        </FieldLabel>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {CONCERN_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex items-center gap-2 rounded-lg border px-3 py-3 text-sm transition-colors ${
                hairConcerns.includes(option.value)
                  ? "border-bronze bg-bronze/20 text-cream"
                  : "border-bronze/40 text-dark/80 hover:border-bronze"
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

      <div role="group" aria-labelledby="child-wash-label">
        <FieldLabel>
          <span id="child-wash-label">How often do you wash their hair?</span>
        </FieldLabel>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {WASH_FREQUENCY_OPTIONS.map((option) => (
            <SelectPill
              key={option.value}
              label={option.label}
              selected={washFrequency === option.value}
              onClick={() => setWashFrequency(option.value)}
            />
          ))}
        </div>
      </div>

      <div role="group" aria-labelledby="child-cooperative-label">
        <FieldLabel>
          <span id="child-cooperative-label">Who handles their hair care?</span>
        </FieldLabel>
        <div className="mt-3 grid grid-cols-1 gap-3">
          {COOPERATIVE_OPTIONS.map((option) => (
            <SelectPill
              key={option.value}
              label={option.label}
              selected={cooperativeLevel === option.value}
              onClick={() => setCooperativeLevel(option.value)}
            />
          ))}
        </div>
        {cooperativeLevel === "parent_difficult" && (
          <div className="mt-3">
            <AmberCallout>
              We will prioritize quick-dry products, detanglers with maximum slip, and
              protective styles that last longer between wash days - making hair care easier
              for both of you.
            </AmberCallout>
          </div>
        )}
      </div>

      <div role="group" aria-labelledby="child-sensory-label">
        <FieldLabel>
          <span id="child-sensory-label">
            Does your child have sensory sensitivities that affect hair care?
          </span>
        </FieldLabel>
        <YesNoToggle value={sensorySensitive} onChange={setSensorySensitive} />
        {sensorySensitive === true && (
          <div className="mt-3">
            <AmberCallout>
              We will avoid products with strong scents, cooling or tingling sensations, and
              sticky textures.
            </AmberCallout>
          </div>
        )}
      </div>

      <div role="group" aria-labelledby="child-protective-label">
        <FieldLabel>
          <span id="child-protective-label">
            Do you use protective styles (braids, twists, cornrows)?
          </span>
        </FieldLabel>
        <YesNoToggle value={usesProtectiveStyles} onChange={setUsesProtectiveStyles} />
        {usesProtectiveStyles === true && (
          <div className="mt-4" role="group" aria-labelledby="child-extensions-label">
            <FieldLabel>
              <span id="child-extensions-label">Do the protective styles use added hair?</span>
            </FieldLabel>
            <YesNoToggle value={protectiveStylesUseExtensions} onChange={setProtectiveStylesUseExtensions} />
          </div>
        )}
      </div>

      <div role="group" aria-labelledby="child-heat-label">
        <FieldLabel>
          <span id="child-heat-label">Do you use heat tools on their hair?</span>
        </FieldLabel>
        <YesNoToggle value={heatToolsUsed} onChange={setHeatToolsUsed} />
        {heatToolsUsed === true && (
          <div className="mt-3">
            <AmberCallout>
              We recommend limiting heat tool use on children&apos;s hair to special occasions.
              Children&apos;s hair is more vulnerable to heat damage than adult hair. We will
              include heat protectant in recommendations.
            </AmberCallout>
          </div>
        )}
      </div>

      <fieldset>
        <label htmlFor="child-zip" className="font-serif text-lg text-bronze2">
          Zip Code
        </label>
        <TextInput id="child-zip" value={zipCode} onChange={setZipCode} placeholder="e.g. 90210" />
        {climate && (
          <p className="mt-2 text-xs text-dark/50">Detected climate: {CLIMATE_LABELS[climate]}</p>
        )}
        {waterHardness && (
          <p className="mt-1 text-xs text-dark/50">
            Detected water hardness: {WATER_HARDNESS_LABELS[waterHardness]}
          </p>
        )}
      </fieldset>

      <fieldset>
        <label htmlFor="child-notes" className="font-serif text-lg text-bronze2">
          Anything else we should know?
        </label>
        <TextAreaInput
          id="child-notes"
          value={notes}
          onChange={setNotes}
          placeholder="Any additional details about your child's hair or scalp"
        />
      </fieldset>

      {error && <p className="text-sm text-red">{error}</p>}
      {success && <p className="text-sm text-green">Profile saved!</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-bronze py-3 text-sm font-semibold text-cream transition-colors hover:bg-bronze2 disabled:opacity-50"
      >
        {submitting
          ? "Saving..."
          : displayName
            ? `Save ${displayName}'s profile →`
            : "Save child's profile →"}
      </button>
    </form>
  );
}
