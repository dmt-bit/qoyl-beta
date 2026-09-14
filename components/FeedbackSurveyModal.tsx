"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

const Q1_OPTIONS = [
  "Search for it on Amazon or Google",
  "Go directly to the brand's website",
  "Check Sephora or Ulta",
  "I don't usually buy right away",
  "Other",
];

const Q2_OPTIONS = [
  "Yes, absolutely - that would be really convenient",
  "Maybe, depending on price and shipping",
  "No preference - I don't mind going to another site",
  "No - I prefer to shop on retailer sites I already trust",
];

function OptionButton({
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
      className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
        selected
          ? "border-bronze bg-bronze/20 text-cream"
          : "border-bronze/40 text-dark/80 hover:border-bronze"
      }`}
    >
      {label}
    </button>
  );
}

export default function FeedbackSurveyModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [q1, setQ1] = useState<string | null>(null);
  const [q2, setQ2] = useState<string | null>(null);
  const [q3, setQ3] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!submitted) return;
    const timeoutId = setTimeout(onClose, 2000);
    return () => clearTimeout(timeoutId);
  }, [submitted, onClose]);

  function dismiss() {
    localStorage.setItem("feedback_submitted", "true");
    onClose();
  }

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);

    const { error: insertError } = await supabase.from("user_feedback").insert({
      user_id: user?.id ?? null,
      q1_response: q1,
      q2_response: q2,
      q3_response: q3.trim() || null,
    });

    setSubmitting(false);

    if (insertError) {
      setError("Couldn't submit your feedback. Please try again.");
      return;
    }

    localStorage.setItem("feedback_submitted", "true");
    setSubmitted(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-white/70 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Qoyl feedback survey"
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-bronze/30 bg-white p-6 sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-serif text-xl font-semibold text-dark sm:text-2xl">
            {submitted ? "Thank you" : "Help us build what's next for Qoyl"}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={dismiss}
            className="text-lg leading-none text-dark/50 transition-colors hover:text-dark"
          >
            ✕
          </button>
        </div>

        {submitted ? (
          <p className="mt-4 text-sm text-dark/80">
            Thank you - this genuinely shapes what we build next.
          </p>
        ) : (
          <div className="mt-4 space-y-6">
            <div>
              <p className="text-sm text-dark/80">
                When Qoyl recommends a product that scores well for your
                hair, what do you do next?
              </p>
              <div className="mt-3 space-y-2">
                {Q1_OPTIONS.map((opt) => (
                  <OptionButton
                    key={opt}
                    label={opt}
                    selected={q1 === opt}
                    onClick={() => setQ1(opt)}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm text-dark/80">
                Would you want to buy recommended products directly on Qoyl
                in one checkout - without leaving the app?
              </p>
              <div className="mt-3 space-y-2">
                {Q2_OPTIONS.map((opt) => (
                  <OptionButton
                    key={opt}
                    label={opt}
                    selected={q2 === opt}
                    onClick={() => setQ2(opt)}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm text-dark/80">
                Anything else you&apos;d want from Qoyl? We read every
                response.
              </p>
              <textarea
                value={q3}
                onChange={(e) => setQ3(e.target.value)}
                placeholder="Tell us what would make this more useful for you..."
                rows={4}
                className="mt-3 w-full border border-bronze/40 bg-transparent px-4 py-3 text-sm text-dark placeholder:text-dark/40 focus:border-bronze focus:outline-none"
              />
            </div>

            {error && <p className="text-sm text-red">{error}</p>}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-bronze py-3 text-sm font-semibold text-cream transition-colors hover:bg-bronze2 disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit feedback →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
