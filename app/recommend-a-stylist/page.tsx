"use client";

import StylistRecommendationBlock from "@/components/StylistRecommendationBlock";
import { useAuth } from "@/lib/auth-context";

// Standalone, shareable version of the same recommendation form embedded
// in Style Match's "book a stylist" empty state (components/
// StylistRecommendationBlock.tsx) - doesn't require going through Style
// Match first. showInstagramSuggestion is off here since there's no
// "no stylists matched for this style" context to react to.
export default function RecommendAStylistPage() {
  const { user, hairProfile } = useAuth();

  return (
    <main className="min-h-screen bg-white px-4 py-16 font-sans text-dark sm:px-6">
      <div className="mx-auto max-w-md">
        <h1
          className="lowercase text-dark"
          style={{ fontWeight: 700, fontSize: "28px", letterSpacing: "-1px", marginBottom: "8px" }}
        >
          recommend a stylist
        </h1>
        <p className="font-light text-[#666]" style={{ fontSize: "14px", marginBottom: "32px" }}>
          know someone great? we&apos;ll reach out and invite them to list on qoyl.
        </p>

        <StylistRecommendationBlock
          userId={user?.id ?? null}
          curlType={hairProfile?.curl_type ?? null}
          city={null}
          styleSpecialty={null}
          showInstagramSuggestion={false}
        />
      </div>
    </main>
  );
}
