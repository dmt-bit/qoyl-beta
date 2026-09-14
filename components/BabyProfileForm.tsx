"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import BabyMedicalDisclaimer from "@/components/BabyMedicalDisclaimer";
import {
  AmberCallout,
  BronzeCallout,
  FieldHelper,
  FieldLabel,
  SelectPill,
  TextAreaInput,
  TextInput,
  TextureCard,
  YesNoToggle,
} from "@/components/FamilyProfileFormUI";
import type { BabyProfile } from "@/lib/familyProfiles";

const AGE_OPTIONS = ["0-3_months", "3-6_months", "6-12_months", "12-18_months", "18-24_months"];
const AGE_LABELS: Record<string, string> = {
  "0-3_months": "0-3 months",
  "3-6_months": "3-6 months",
  "6-12_months": "6-12 months",
  "12-18_months": "12-18 months",
  "18-24_months": "18-24 months",
};

const TEXTURE_OPTIONS = [
  { value: "fine_straight", label: "Fine and straight" },
  { value: "fine_wavy", label: "Fine and wavy" },
  { value: "fine_curly", label: "Fine and curly" },
  { value: "fine_coily", label: "Fine and coily" },
  { value: "coarse_straight", label: "Coarse and straight" },
  { value: "coarse_wavy", label: "Coarse and wavy" },
  { value: "coarse_curly", label: "Coarse and curly" },
  { value: "coarse_coily", label: "Coarse and coily" },
  { value: "not_sure", label: "Not sure yet" },
];

const DENSITY_OPTIONS = [
  { value: "sparse", label: "Just getting started (sparse)" },
  { value: "normal", label: "A normal amount" },
  { value: "thick", label: "A lot of hair (thick)" },
];

const SCALP_OPTIONS = [
  { value: "normal", label: "Normal - healthy and comfortable" },
  { value: "dry", label: "Dry - flaky or tight" },
  { value: "cradle_cap", label: "Cradle cap - yellowish scaly patches" },
  { value: "sensitive", label: "Sensitive - easily irritated or red" },
];

const WASH_FREQUENCY_OPTIONS = [
  { value: "every_2_days", label: "Every 2 days" },
  { value: "every_3_4_days", label: "Every 3-4 days" },
  { value: "weekly", label: "Once a week" },
  { value: "every_2_weeks_or_less", label: "Every 2 weeks or less" },
];

export default function BabyProfileForm({
  userId,
  initialData,
  onSaved,
}: {
  userId: string;
  initialData?: BabyProfile;
  onSaved?: (id: string) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialData?.name ?? "");
  const [ageRange, setAgeRange] = useState<string | null>(initialData?.age_range ?? null);
  const [hairTexture, setHairTexture] = useState<string | null>(initialData?.hair_texture ?? null);
  const [hairDensity, setHairDensity] = useState<string | null>(initialData?.hair_density ?? null);
  const [scalpCondition, setScalpCondition] = useState<string | null>(initialData?.scalp_condition ?? null);
  const [allergiesNotes, setAllergiesNotes] = useState(initialData?.allergies_notes ?? "");
  const [washFrequency, setWashFrequency] = useState<string | null>(
    initialData?.wash_frequency_preference ?? null
  );
  const [sensorySensitive, setSensorySensitive] = useState<boolean | null>(
    initialData?.sensory_sensitive ?? null
  );
  const [notes, setNotes] = useState(initialData?.notes ?? "");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const displayName = name.trim();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/family-profiles/baby", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: initialData?.id,
          user_id: userId,
          name: displayName,
          age_range: ageRange,
          hair_texture: hairTexture,
          hair_density: hairDensity,
          scalp_condition: scalpCondition,
          allergies_notes: allergiesNotes,
          wash_frequency_preference: washFrequency,
          sensory_sensitive: sensorySensitive ?? false,
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
      <BronzeCallout>
        Qoyl recommends only the gentlest ingredients for babies. All suggestions prioritize
        scalp safety and avoid essential oils, synthetic fragrance, and harsh surfactants.
      </BronzeCallout>

      <BabyMedicalDisclaimer />

      <fieldset>
        <label htmlFor="baby-name" className="font-serif text-lg text-bronze2">
          What is your baby&apos;s name? (optional)
        </label>
        <TextInput id="baby-name" value={name} onChange={setName} placeholder="Baby's name" />
        <FieldHelper>We use this to personalize their profile</FieldHelper>
      </fieldset>

      <div role="group" aria-labelledby="baby-age-label">
        <FieldLabel>
          <span id="baby-age-label">How old is your baby?</span>
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
      </div>

      <div role="group" aria-labelledby="baby-texture-label">
        <FieldLabel>
          <span id="baby-texture-label">How would you describe their hair texture?</span>
        </FieldLabel>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {TEXTURE_OPTIONS.map((option) => (
            <TextureCard
              key={option.value}
              label={option.label}
              selected={hairTexture === option.value}
              onClick={() => setHairTexture(option.value)}
            />
          ))}
        </div>
      </div>

      <div role="group" aria-labelledby="baby-density-label">
        <FieldLabel>
          <span id="baby-density-label">How much hair do they have?</span>
        </FieldLabel>
        <div className="mt-3 grid grid-cols-1 gap-3">
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

      <div role="group" aria-labelledby="baby-scalp-label">
        <FieldLabel>
          <span id="baby-scalp-label">How does their scalp look and feel?</span>
        </FieldLabel>
        <div className="mt-3 grid grid-cols-1 gap-3">
          {SCALP_OPTIONS.map((option) => (
            <SelectPill
              key={option.value}
              label={option.label}
              selected={scalpCondition === option.value}
              onClick={() => setScalpCondition(option.value)}
            />
          ))}
        </div>
        {scalpCondition === "cradle_cap" && (
          <div className="mt-3">
            <AmberCallout>
              Cradle cap is very common in babies and usually resolves on its own. We will
              recommend gentle approaches. If it persists or spreads, please consult your
              pediatrician.
            </AmberCallout>
          </div>
        )}
      </div>

      <fieldset>
        <label htmlFor="baby-allergies" className="font-serif text-lg text-bronze2">
          Any known allergies or skin sensitivities?
        </label>
        <TextAreaInput
          id="baby-allergies"
          value={allergiesNotes}
          onChange={setAllergiesNotes}
          placeholder="e.g. sensitive to fragrance, nut allergy, eczema-prone skin"
        />
        <FieldHelper>This helps us flag ingredients that may cause reactions</FieldHelper>
      </fieldset>

      <div role="group" aria-labelledby="baby-wash-label">
        <FieldLabel>
          <span id="baby-wash-label">How often do you currently wash their hair?</span>
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

      <div role="group" aria-labelledby="baby-sensory-label">
        <FieldLabel>
          <span id="baby-sensory-label">
            Does your baby seem sensitive to touch or textures on their scalp?
          </span>
        </FieldLabel>
        <YesNoToggle value={sensorySensitive} onChange={setSensorySensitive} />
        {sensorySensitive === true && (
          <div className="mt-3">
            <AmberCallout>
              We will prioritize unscented products with gentle textures and avoid tingling or
              cooling ingredients like menthol and peppermint.
            </AmberCallout>
          </div>
        )}
      </div>

      <fieldset>
        <label htmlFor="baby-notes" className="font-serif text-lg text-bronze2">
          Anything else we should know?
        </label>
        <TextAreaInput
          id="baby-notes"
          value={notes}
          onChange={setNotes}
          placeholder="Any additional details about your baby's hair or scalp"
        />
      </fieldset>

      {error && <p className="text-sm text-red">{error}</p>}
      {success && (
        <p className="text-sm text-green">
          Profile saved. See {displayName ? `${displayName}'s` : "your baby's"} personalized
          recommendations →
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-bronze py-3 text-sm font-semibold text-cream transition-colors hover:bg-bronze2 disabled:opacity-50"
      >
        {submitting
          ? "Saving..."
          : displayName
            ? `Save ${displayName}'s profile →`
            : "Save baby's profile →"}
      </button>
    </form>
  );
}
