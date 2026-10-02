"use client";

import { useEffect, useState } from "react";

const INPUT_CLASS =
  "w-full rounded-lg border border-bronze/40 bg-transparent px-4 py-3 text-sm text-dark placeholder:text-dark/40 focus:border-bronze focus:outline-none";

type Recommendation = {
  id: string;
  stylist_name: string;
  stylist_instagram: string | null;
  stylist_city: string | null;
  stylist_website: string | null;
  stylist_booking_url: string | null;
  why_recommend: string | null;
  style_specialty: string | null;
  recommender_curl_type: string | null;
  recommender_city: string | null;
  status: "pending" | "contacted" | "applied" | "live";
  created_at: string;
};

const STATUS_CHIP_CLASS: Record<Recommendation["status"], string> = {
  pending: "border border-dark/40 text-dark/60",
  contacted: "bg-amber/20 text-amber",
  applied: "bg-bronze/20 text-bronze2",
  live: "bg-green/20 text-green",
};

const FILTER_TABS = [
  { key: "all", label: "all" },
  { key: "pending", label: "pending" },
  { key: "contacted", label: "contacted" },
] as const;

function outreachDm(name: string): string {
  return `hey ${name}! a qoyl user recommended you as a stylist they love. qoyl is a hair intelligence platform where clients come to you having already matched their style and built their shopping list. listing is $35/month — no booking fees, no commission. interested? business.qoyl.live/stylists`;
}

export default function AdminStylistsPage() {
  const [password, setPassword] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [checkingStoredAuth, setCheckingStoredAuth] = useState(true);

  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<(typeof FILTER_TABS)[number]["key"]>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function loadRecommendations(pw: string): Promise<boolean> {
    setLoading(true);
    setAuthError(null);
    const res = await fetch("/api/admin/stylist-recommendations", { headers: { "x-admin-password": pw } });
    setLoading(false);
    if (res.status === 401) {
      setAuthError("Incorrect password.");
      return false;
    }
    if (!res.ok) {
      setAuthError("Couldn't load recommendations. Try again.");
      return false;
    }
    const data = await res.json();
    setRecommendations(data.recommendations ?? []);
    return true;
  }

  useEffect(() => {
    const stored = sessionStorage.getItem("admin_password");
    if (!stored) {
      setCheckingStoredAuth(false);
      return;
    }
    loadRecommendations(stored).then((ok) => {
      if (ok) {
        setPassword(stored);
        setAuthorized(true);
      } else {
        sessionStorage.removeItem("admin_password");
      }
      setCheckingStoredAuth(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    const ok = await loadRecommendations(password);
    if (ok) {
      sessionStorage.setItem("admin_password", password);
      setAuthorized(true);
    }
  }

  async function markContacted(rec: Recommendation) {
    await fetch(`/api/admin/stylist-recommendations/${rec.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify({ status: "contacted" }),
    });
    loadRecommendations(password);
  }

  async function dismiss(rec: Recommendation) {
    if (!confirm(`Dismiss the recommendation for "${rec.stylist_name}"? It stays in the database.`)) return;
    await fetch(`/api/admin/stylist-recommendations/${rec.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify({ dismiss: true }),
    });
    loadRecommendations(password);
  }

  async function copyDm(rec: Recommendation) {
    try {
      await navigator.clipboard.writeText(outreachDm(rec.stylist_name));
      setCopiedId(rec.id);
      setTimeout(() => setCopiedId((id) => (id === rec.id ? null : id)), 2000);
    } catch {
      // Clipboard API can be blocked (permissions, non-secure context) -
      // not worth a hard error for a convenience copy button.
    }
  }

  if (checkingStoredAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white font-sans">
        <p className="text-sm text-dark/60">Loading...</p>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-4 font-sans text-dark">
        <form onSubmit={handleUnlock} className="w-full max-w-sm rounded-xl border border-bronze/30 p-6">
          <h1 className="font-serif text-2xl font-semibold text-dark">Admin access</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin password"
            required
            className={`mt-4 ${INPUT_CLASS}`}
          />
          {authError && <p className="mt-2 text-sm text-red">{authError}</p>}
          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full bg-bronze py-3 text-sm font-semibold text-cream transition-colors hover:bg-bronze2 disabled:opacity-50"
          >
            {loading ? "Checking..." : "Unlock"}
          </button>
        </form>
      </main>
    );
  }

  const total = recommendations.length;
  const contactedCount = recommendations.filter((r) => r.status === "contacted" || r.status === "applied").length;
  const joinedCount = recommendations.filter((r) => r.status === "live").length;

  const filtered = recommendations.filter((r) => {
    if (filter === "all") return true;
    if (filter === "pending") return r.status === "pending";
    if (filter === "contacted") return r.status === "contacted" || r.status === "applied";
    return true;
  });

  return (
    <main className="min-h-screen bg-white px-4 py-10 font-sans text-dark sm:px-6">
      <div className="mx-auto max-w-5xl">
        <h1 className="font-serif text-3xl font-semibold text-dark sm:text-4xl">Stylists</h1>
        <p className="mt-1 font-mono text-[10px] lowercase text-muted">
          {total} recommendations · {contactedCount} contacted · {joinedCount} joined
        </p>

        <div className="mt-6 flex gap-4 border-b border-bronze/20">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`pb-3 font-mono text-[11px] lowercase transition-colors ${
                filter === tab.key ? "border-b-2 border-bronze text-dark" : "text-dark/50 hover:text-dark/80"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading && <p className="mt-4 text-sm text-dark/50">Loading...</p>}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-dark/20 font-sans text-[11px] text-dark/50">
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 pr-3 font-medium">Stylist</th>
                <th className="py-2 pr-3 font-medium">Instagram</th>
                <th className="py-2 pr-3 font-medium">City</th>
                <th className="py-2 pr-3 font-medium">Recommended by</th>
                <th className="py-2 pr-3 font-medium">Style context</th>
                <th className="py-2 pr-3 font-medium">Why</th>
                <th className="py-2 pr-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((rec) => (
                <tr key={rec.id} className="border-b border-dark/10 align-top">
                  <td className="py-3 pr-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 font-mono text-[10px] lowercase ${STATUS_CHIP_CLASS[rec.status]}`}
                    >
                      {rec.status}
                    </span>
                  </td>
                  <td className="py-3 pr-3">
                    <p className="font-sans text-[13px] font-medium text-dark">{rec.stylist_name}</p>
                    {rec.stylist_booking_url && (
                      <a
                        href={rec.stylist_booking_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[9px] text-bronze2 underline underline-offset-2 hover:text-dark"
                      >
                        booking link →
                      </a>
                    )}
                  </td>
                  <td className="py-3 pr-3 font-mono text-[11px] text-dark">
                    {rec.stylist_instagram ? `@${rec.stylist_instagram}` : "—"}
                  </td>
                  <td className="py-3 pr-3 font-mono text-[11px] text-dark">{rec.stylist_city ?? "—"}</td>
                  <td className="py-3 pr-3 font-mono text-[10px] text-muted">
                    {rec.recommender_curl_type || rec.recommender_city
                      ? [rec.recommender_curl_type, rec.recommender_city].filter(Boolean).join(" · ")
                      : "—"}
                  </td>
                  <td className="py-3 pr-3 font-sans text-[12px] text-dark/70">{rec.style_specialty ?? "—"}</td>
                  <td className="max-w-[220px] py-3 pr-3 font-sans text-[12px] text-dark/70">
                    {rec.why_recommend ?? "—"}
                  </td>
                  <td className="py-3 pr-3">
                    <div className="flex flex-wrap gap-2 font-mono text-[10px]">
                      {rec.status === "pending" && (
                        <button
                          type="button"
                          onClick={() => markContacted(rec)}
                          className="text-bronze2 underline underline-offset-2 hover:text-dark"
                        >
                          mark contacted
                        </button>
                      )}
                      {rec.stylist_instagram && (
                        <a
                          href={`https://instagram.com/${rec.stylist_instagram}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-bronze2 underline underline-offset-2 hover:text-dark"
                        >
                          view instagram →
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => copyDm(rec)}
                        className="text-bronze2 underline underline-offset-2 hover:text-dark"
                      >
                        {copiedId === rec.id ? "copied ✓" : "copy DM"}
                      </button>
                      <button
                        type="button"
                        onClick={() => dismiss(rec)}
                        className="text-red underline underline-offset-2 hover:text-dark"
                      >
                        dismiss
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="py-6 text-center font-sans text-sm text-dark/50">
                    No recommendations in this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
