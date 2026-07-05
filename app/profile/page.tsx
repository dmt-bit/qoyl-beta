"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

const CURL_TYPES = ["4a", "4b", "4c"] as const;
const POROSITY_OPTIONS = ["low", "medium", "high", "not sure"] as const;
const THICKNESS_OPTIONS = ["fine", "medium", "coarse"] as const;
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
  const [curlType, setCurlType] = useState<string | null>(null);
  const [porosity, setPorosity] = useState<string | null>(null);
  const [scalpCondition, setScalpCondition] = useState("");
  const [strandThickness, setStrandThickness] = useState<string | null>(null);
  const [zipCode, setZipCode] = useState("");
  const [hairConcerns, setHairConcerns] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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

    const { data, error: insertError } = await supabase
      .from("hair_profiles")
      .insert({
        curl_type: curlType,
        porosity,
        scalp_condition: scalpCondition,
        strand_thickness: strandThickness,
        zip_code: zipCode,
        hair_concerns: hairConcerns,
      })
      .select("id")
      .single();

    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    if (data?.id) {
      localStorage.setItem("hair_profile_id", data.id);
      setSuccess(true);
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

        <form onSubmit={handleSubmit} className="mt-8 space-y-8">
          <fieldset>
            <legend className="font-serif text-lg text-bronze2">
              Curl Type
            </legend>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {CURL_TYPES.map((type) => (
                <SelectButton
                  key={type}
                  label={type}
                  selected={curlType === type}
                  onClick={() => setCurlType(type)}
                />
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="font-serif text-lg text-bronze2">
              Porosity
            </legend>
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
          </fieldset>

          <fieldset>
            <label
              htmlFor="scalp-condition"
              className="font-serif text-lg text-bronze2"
            >
              Scalp Condition
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

          <fieldset>
            <legend className="font-serif text-lg text-bronze2">
              Strand Thickness
            </legend>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {THICKNESS_OPTIONS.map((option) => (
                <SelectButton
                  key={option}
                  label={option}
                  selected={strandThickness === option}
                  onClick={() => setStrandThickness(option)}
                />
              ))}
            </div>
          </fieldset>

          <fieldset>
            <label htmlFor="zip-code" className="font-serif text-lg text-bronze2">
              Zip Code
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

          <fieldset>
            <legend className="font-serif text-lg text-bronze2">
              Hair Concerns
            </legend>
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
      </div>
    </main>
  );
}
