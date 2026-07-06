"use client";

import { useEffect, useState } from "react";
import InfoTooltip from "@/components/InfoTooltip";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

const CURL_TYPES = [
  { value: "4a", label: "4a" },
  { value: "4b", label: "4b" },
  { value: "4c", label: "4c" },
  { value: "not_sure", label: "Not sure" },
];
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
];

function SelectButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-4 py-3 text-sm font-medium capitalize transition-colors ${
        selected
          ? "border-bronze bg-bronze text-dark"
          : "border-bronze/40 bg-transparent text-cream hover:border-bronze"
      }`}
    >
      {label}
    </button>
  );
}

export default function ProfilePage() {
  const { user, hairProfile, hairProfileLoading, refreshHairProfile } =
    useAuth();

  const [curlType, setCurlType] = useState<string | null>(null);
  const [porosity, setPorosity] = useState<string | null>(null);
  const [scalpCondition, setScalpCondition] = useState("");
  const [strandThickness, setStrandThickness] = useState<string | null>(null);
  const [zipCode, setZipCode] = useState("");
  const [hairConcerns, setHairConcerns] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [hydratedFromProfileId, setHydratedFromProfileId] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (!hairProfile || hydratedFromProfileId === hairProfile.id) return;
    setCurlType(hairProfile.curl_type);
    setPorosity(hairProfile.porosity);
    setScalpCondition(hairProfile.scalp_condition ?? "");
    setStrandThickness(hairProfile.strand_thickness);
    setZipCode(hairProfile.zip_code ?? "");
    setHairConcerns(hairProfile.hair_concerns ?? []);
    setHydratedFromProfileId(hairProfile.id);
  }, [hairProfile, hydratedFromProfileId]);

  function toggleConcern(value: string) {
    setHairConcerns((prev) =>
      prev.includes(value)
        ? prev.filter((c) => c !== value)
        : [...prev, value]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const payload = {
      curl_type: curlType,
      porosity,
      scalp_condition: scalpCondition,
      strand_thickness: strandThickness,
      zip_code: zipCode,
      hair_concerns: hairConcerns,
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
      if (user) await refreshHairProfile();
    }
  }

  return (
    <main className="min-h-screen bg-dark px-4 py-10 font-sans text-cream sm:px-6">
      <div className="mx-auto max-w-md">
        <h1 className="font-serif text-3xl font-semibold text-cream sm:text-4xl">
          Hair Profile
        </h1>
        <p className="mt-2 text-sm text-cream/70">
          Tell us about your hair so we can personalize your routine.
        </p>

        {user && hairProfileLoading && (
          <p className="mt-4 text-sm text-cream/50">
            Loading your saved profile...
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-8">
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
            <div className="mt-3 grid grid-cols-2 gap-3">
              {CURL_TYPES.map((type) => (
                <SelectButton
                  key={type.value}
                  label={type.label}
                  selected={curlType === type.value}
                  onClick={() => setCurlType(type.value)}
                />
              ))}
            </div>
          </div>

          <div role="group" aria-labelledby="porosity-label">
            <p
              id="porosity-label"
              className="flex items-center gap-2 font-serif text-lg text-bronze2"
            >
              Porosity
              <InfoTooltip
                label="Porosity"
                illustrationSrc="/illustrations/porosity_guide.svg"
                description="Do the float test — drop a clean strand in water. Floats = low porosity. Sinks slowly = medium. Sinks fast = high porosity."
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
                description="Pull out one strand and hold it between your fingers. Compare it to a piece of thread — thinner, same, or thicker?"
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
          </fieldset>

          <div role="group" aria-labelledby="hair-concerns-label">
            <p
              id="hair-concerns-label"
              className="flex items-center gap-2 font-serif text-lg text-bronze2"
            >
              Hair Concerns
              <InfoTooltip
                label="Hair Concerns"
                description="Select everything that applies — the more you tell us, the more specific your evaluations will be."
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
      </div>
    </main>
  );
}
