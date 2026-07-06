"use client";

import { useEffect, useState } from "react";
import Collapse from "@/components/Collapse";
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

  function toggleConcern(value: string) {
    setHairConcerns((prev) =>
      prev.includes(value)
        ? prev.filter((c) => c !== value)
        : [...prev, value]
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

    const payload = {
      curl_type: curlType,
      porosity,
      scalp_condition: scalpCondition,
      strand_thickness: strandThickness,
      zip_code: zipCode,
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
      </div>
    </main>
  );
}
