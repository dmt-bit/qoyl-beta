"use client";

import { useEffect, useState } from "react";

// Shared by Style Match's "book a stylist" empty state (results page +
// summary document) and the standalone app/recommend-a-stylist/page.tsx -
// one form, one API route (app/api/stylist-recommendations/route.ts),
// reused everywhere it's asked for rather than three copies drifting
// apart.
//
// PART A (the "existing fix from last prompt" the request says to keep)
// isn't actually present anywhere in this codebase - no prior turn
// added Instagram search suggestions to either empty state. Built fresh
// here as a plain "search Instagram directly" link, disclosed rather
// than silently invented as if it already existed.
type Props = {
  userId?: string | null;
  curlType?: string | null;
  city?: string | null;
  styleSpecialty?: string | null;
  // Full-page variant (app/recommend-a-stylist/page.tsx) skips PART A
  // entirely - there's no "no stylists matched" context to react to
  // outside Style Match.
  showInstagramSuggestion?: boolean;
};

type Status = "idle" | "submitting" | "done" | "error";

export default function StylistRecommendationBlock({
  userId = null,
  curlType = null,
  city = null,
  styleSpecialty = null,
  showInstagramSuggestion = true,
}: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [stylistName, setStylistName] = useState("");
  const [instagram, setInstagram] = useState("");
  const [recommendCity, setRecommendCity] = useState(city ?? "");
  const [why, setWhy] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (city) setRecommendCity(city);
  }, [city]);

  useEffect(() => {
    if (status !== "done") return;
    const timer = setTimeout(() => setDismissed(true), 4000);
    return () => clearTimeout(timer);
  }, [status]);

  if (dismissed) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stylistName.trim()) return;
    setStatus("submitting");
    setError(null);
    try {
      const res = await fetch("/api/stylist-recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recommended_by: userId,
          stylist_name: stylistName,
          stylist_instagram: instagram,
          stylist_city: recommendCity,
          why_recommend: why,
          style_specialty: styleSpecialty,
          recommender_curl_type: curlType,
          recommender_city: city,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Couldn't save your recommendation. Try again.");
        setStatus("error");
        return;
      }
      setStatus("done");
    } catch {
      setError("Couldn't reach the server. Try again.");
      setStatus("error");
    }
  }

  const instagramSearchQuery = [styleSpecialty, "stylist", city].filter(Boolean).join(" ");

  return (
    <div>
      {showInstagramSuggestion && (
        <div className="border border-dark/15 bg-white p-4">
          <p className="font-sans text-[13px] text-dark/80">
            No Qoyl stylists in your area yet{styleSpecialty ? ` for ${styleSpecialty}` : ""}. Try
            searching Instagram directly:
          </p>
          <a
            href={`https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(instagramSearchQuery)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block font-mono text-[11px] text-bronze2 underline underline-offset-2 hover:text-dark"
          >
            search instagram: &quot;{instagramSearchQuery}&quot; →
          </a>
        </div>
      )}

      {showInstagramSuggestion && <div style={{ borderTop: "1px solid #e8e8e8", margin: "20px 0" }} />}

      {status === "done" ? (
        <div className="relative">
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss"
            className="absolute right-0 top-0 font-sans text-sm text-dark/40 hover:text-dark"
          >
            ×
          </button>
          <p className="pr-6 font-sans text-sm text-dark" style={{ marginBottom: "8px" }}>
            thank you — we&apos;ll reach out to {stylistName} and invite them to list on qoyl.
          </p>
          <p className="font-sans text-xs font-light text-muted">if they join, we&apos;ll let you know.</p>
        </div>
      ) : (
        <div>
          <p
            className="font-sans font-bold lowercase text-dark"
            style={{ fontSize: "16px", letterSpacing: "-0.3px", marginBottom: "6px" }}
          >
            know a great stylist?
          </p>
          <p
            className="font-sans font-light text-[#666]"
            style={{ fontSize: "13px", lineHeight: 1.65, marginBottom: "16px" }}
          >
            recommend someone you trust — we&apos;ll reach out and invite them to list on qoyl.
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block">
              <span className="font-mono text-[9px] text-muted">their name</span>
              <input
                type="text"
                required
                value={stylistName}
                onChange={(e) => setStylistName(e.target.value)}
                placeholder="e.g. Jade at Curl Studio"
                className="mt-1 w-full border border-dark bg-white px-[11px] py-[7px] text-sm text-dark placeholder:text-[#bbb] focus:outline-none"
              />
            </label>

            <label className="block">
              <span className="font-mono text-[9px] text-muted">their instagram</span>
              <div className="mt-1 flex items-center">
                <span className="flex items-center border-r border-[#e8e8e8] py-[7px] pl-3 pr-2 font-sans text-sm text-muted">
                  @
                </span>
                <input
                  type="text"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value.replace(/^@/, ""))}
                  placeholder="handle"
                  className="flex-1 border border-l-0 border-dark py-[7px] pl-2 text-sm text-dark placeholder:text-[#bbb] focus:outline-none"
                />
              </div>
            </label>

            <label className="block">
              <span className="font-mono text-[9px] text-muted">their city</span>
              <input
                type="text"
                value={recommendCity}
                onChange={(e) => setRecommendCity(e.target.value)}
                className="mt-1 w-full border border-dark bg-white px-[11px] py-[7px] text-sm text-dark placeholder:text-[#bbb] focus:outline-none"
              />
            </label>

            <label className="block">
              <span className="font-mono text-[9px] text-muted">why you love them</span>
              <textarea
                rows={2}
                value={why}
                onChange={(e) => setWhy(e.target.value)}
                placeholder="she did my knotless braids perfectly, great with 4c hair, always on time..."
                className="mt-1 w-full border border-dark bg-white px-[11px] py-[7px] text-sm text-dark placeholder:text-[#bbb] focus:outline-none"
              />
            </label>

            {error && <p className="text-xs text-red">{error}</p>}

            <button
              type="submit"
              disabled={status === "submitting"}
              className="w-full bg-dark py-3 font-sans text-[13px] font-medium lowercase text-white transition-colors hover:bg-bronze2 disabled:opacity-50"
            >
              {status === "submitting" ? "sending…" : "recommend this stylist →"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
