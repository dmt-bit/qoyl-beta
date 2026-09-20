"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type RankedItem = { label: string; count: number };

type StyleMatchAnalytics = {
  totalThisWeek: number;
  totalThisMonth: number;
  mostMatchedStyles: RankedItem[];
  fakeHairTypes: RankedItem[];
  citiesWithMostMatches: RankedItem[];
  conversion: { rate: number; followedThroughCount: number; totalCount: number };
};

const INPUT_CLASS =
  "w-full rounded-lg border border-bronze/40 bg-transparent px-4 py-3 text-sm text-dark placeholder:text-dark/40 focus:border-bronze focus:outline-none";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-bronze/30 p-4">
      <p className="text-2xl font-semibold text-dark">{value}</p>
      <p className="mt-1 text-xs text-dark/60">{label}</p>
    </div>
  );
}

function RankedList({ title, items, emptyLabel }: { title: string; items: RankedItem[]; emptyLabel: string }) {
  return (
    <div className="rounded-xl border border-bronze/30 p-5">
      <h3 className="font-serif text-lg text-dark">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-3 text-xs text-dark/50">{emptyLabel}</p>
      ) : (
        <ol className="mt-3 space-y-2">
          {items.map((item, i) => (
            <li key={item.label} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-dark/80">
                <span className="mr-2 text-bronze2">{i + 1}.</span>
                {item.label}
              </span>
              <span className="shrink-0 rounded-full border border-bronze/40 px-2 py-0.5 text-[11px] font-semibold text-bronze2">
                {item.count}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [checkingStoredAuth, setCheckingStoredAuth] = useState(true);

  const [analytics, setAnalytics] = useState<StyleMatchAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  async function loadAnalytics(pw: string): Promise<boolean> {
    setLoading(true);
    setAuthError(null);
    setLoadError(null);

    const res = await fetch("/api/admin/style-match-analytics", {
      headers: { "x-admin-password": pw },
    });

    setLoading(false);

    if (res.status === 401) {
      setAuthError("Incorrect password.");
      return false;
    }
    if (!res.ok) {
      setLoadError("Couldn't load analytics. Try again.");
      return false;
    }

    setAnalytics(await res.json());
    return true;
  }

  useEffect(() => {
    const stored = sessionStorage.getItem("admin_password");
    if (!stored) {
      setCheckingStoredAuth(false);
      return;
    }
    loadAnalytics(stored).then((ok) => {
      if (ok) {
        setPassword(stored);
        setAuthorized(true);
      } else {
        sessionStorage.removeItem("admin_password");
      }
      setCheckingStoredAuth(false);
    });
    // Only ever runs once on mount to check for a stored session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    const ok = await loadAnalytics(password);
    if (ok) {
      sessionStorage.setItem("admin_password", password);
      setAuthorized(true);
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
          {loadError && <p className="mt-2 text-sm text-red">{loadError}</p>}
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

  return (
    <main className="min-h-screen bg-white px-4 py-10 font-sans text-dark sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-serif text-3xl font-semibold text-dark sm:text-4xl">Admin</h1>
          <div className="flex items-center gap-4">
            <Link href="/admin/products" className="text-sm text-bronze2 underline underline-offset-2 hover:text-dark">
              Manage products →
            </Link>
            <Link href="/admin/enrichment" className="text-sm text-bronze2 underline underline-offset-2 hover:text-dark">
              Enrichment →
            </Link>
            <Link href="/admin/visuals" className="text-sm text-bronze2 underline underline-offset-2 hover:text-dark">
              Visual library →
            </Link>
            <Link href="/admin/posts" className="text-sm text-bronze2 underline underline-offset-2 hover:text-dark">
              Posts →
            </Link>
          </div>
        </div>

        <section className="mt-8">
          <h2 className="font-serif text-2xl font-semibold text-dark">Style Match analytics</h2>
          <p className="mt-1 text-sm text-dark/60">
            Last {90} days. This is the data behind Qoyl&apos;s B2B pitch to brands and stylists -
            which styles are trending, what fake hair users actually need, and where demand is
            concentrated by city.
          </p>

          {loading && <p className="mt-4 text-sm text-dark/50">Loading...</p>}
          {loadError && <p className="mt-4 text-sm text-red">{loadError}</p>}

          {analytics && (
            <>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard label="Matches this week" value={analytics.totalThisWeek} />
                <StatCard label="Matches this month" value={analytics.totalThisMonth} />
                <StatCard
                  label="Conversion (matched → did it)"
                  value={`${analytics.conversion.rate}%`}
                />
                <StatCard
                  label="Followed through"
                  value={`${analytics.conversion.followedThroughCount} / ${analytics.conversion.totalCount}`}
                />
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <RankedList
                  title="Most matched styles"
                  items={analytics.mostMatchedStyles}
                  emptyLabel="No style matches yet."
                />
                <RankedList
                  title="Most common fake hair needed"
                  items={analytics.fakeHairTypes}
                  emptyLabel="No fake-hair styles matched yet."
                />
                <RankedList
                  title="Cities with most matches"
                  items={analytics.citiesWithMostMatches}
                  emptyLabel="No zip codes on file for matched users yet."
                />
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
