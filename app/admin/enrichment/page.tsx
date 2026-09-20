"use client";

import { useEffect, useState } from "react";

type EnrichmentStats = { totalProducts: number; complete: number; partial: number; empty: number };
type CoverageStats = { totalIngredients: number; haveDbScores: number };

type Confidence = "high" | "medium" | "low";

type EnrichmentResult = {
  our_product_id: string;
  our_product_name: string;
  our_brand: string;
  our_ingredient_count: number;
  obf_product_name: string;
  obf_brand: string;
  obf_ingredient_count: number;
  obf_ingredients: string[];
  confidence: Confidence;
};

type RowStatus = "pending" | "accepted" | "rejected";

const INPUT_CLASS =
  "w-full rounded-lg border border-bronze/40 bg-transparent px-4 py-3 text-sm text-dark placeholder:text-dark/40 focus:border-bronze focus:outline-none";

function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  if (confidence === "high") {
    return (
      <span className="inline-block rounded-full bg-dark px-2 py-0.5 font-mono text-[9px] font-medium text-white">
        high
      </span>
    );
  }
  if (confidence === "medium") {
    return (
      <span className="inline-block rounded-full border border-dark/40 px-2 py-0.5 font-mono text-[9px] font-medium text-dark/70">
        medium
      </span>
    );
  }
  return (
    <span className="inline-block rounded-full border border-amber px-2 py-0.5 font-mono text-[9px] font-medium text-amber">
      low
    </span>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-dark bg-white p-4">
      <p className="font-mono text-[28px] font-bold text-dark">{value}</p>
      <p className="mt-1 font-sans text-[11px] font-light text-dark/50">{label}</p>
    </div>
  );
}

function ResultRow({
  result,
  password,
  onResolved,
}: {
  result: EnrichmentResult;
  password: string;
  onResolved: (id: string, outcome: { added: number; linked: number; autoScored: number }) => void;
}) {
  const [status, setStatus] = useState<RowStatus>("pending");
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function accept() {
    setBusy(true);
    const res = await fetch("/api/admin/enrichment/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify({ product_id: result.our_product_id, obf_ingredients: result.obf_ingredients }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return;

    setStatus("accepted");
    setSuccessMsg(`${data.added} ingredients added · ${data.linked} linked · ${data.autoScored} auto-scored`);
    onResolved(result.our_product_id, data);
  }

  function reject() {
    setStatus("rejected");
  }

  if (status === "accepted") {
    return (
      <tr className="border-b border-dark/10">
        <td colSpan={7} className="py-3">
          <p className="font-mono text-[10px] text-green">✓ {successMsg}</p>
        </td>
      </tr>
    );
  }
  if (status === "rejected") {
    return null;
  }

  return (
    <>
      <tr className="border-b border-dark/10 align-top">
        <td className="py-3 pr-3">
          <p className="font-sans text-[12px] font-medium text-dark">{result.our_product_name}</p>
          <p className="font-sans text-[11px] text-dark/50">{result.our_brand}</p>
        </td>
        <td className="py-3 pr-3 font-mono text-[9px] text-dark/50">{result.our_ingredient_count} ingredients</td>
        <td className="py-3 pr-3">
          <p className="font-sans text-[12px] text-dark">{result.obf_product_name}</p>
          <p className="font-sans text-[11px] text-dark/50">{result.obf_brand}</p>
        </td>
        <td className="py-3 pr-3">
          <ConfidenceBadge confidence={result.confidence} />
        </td>
        <td className="py-3 pr-3 font-mono text-[9px] text-dark/50">{result.obf_ingredient_count} ingredients</td>
        <td className="py-3 pr-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={accept}
              disabled={busy}
              className="bg-bronze px-3 py-1.5 font-sans text-[11px] font-semibold text-cream transition-colors hover:bg-bronze2 disabled:opacity-50"
            >
              Accept
            </button>
            <button
              type="button"
              onClick={reject}
              className="border border-bronze/40 px-3 py-1.5 font-sans text-[11px] text-dark transition-colors hover:border-bronze"
            >
              Reject
            </button>
          </div>
        </td>
        <td className="py-3 pr-3">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="font-sans text-[11px] text-bronze2 underline underline-offset-2 hover:text-dark"
          >
            View diff {expanded ? "↑" : "↓"}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-dark/10">
          <td colSpan={7} className="py-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-mono text-[9px] font-medium text-dark/50">your ingredients</p>
                <p className="mt-1 font-sans text-[11px] text-dark/40">
                  ({result.our_ingredient_count} on file - not re-listed here)
                </p>
              </div>
              <div>
                <p className="font-mono text-[9px] font-medium text-dark/50">OBF ingredients</p>
                <ol className="mt-1 space-y-0.5">
                  {result.obf_ingredients.map((ing, i) => (
                    <li key={i} className="rounded bg-amber/10 px-1.5 py-0.5 font-sans text-[11px] text-dark">
                      {i + 1}. {ing}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
            <p className="mt-2 font-sans text-[11px] text-dark/50">
              These {result.obf_ingredients.length} ingredients will be added when you accept.
            </p>
          </td>
        </tr>
      )}
    </>
  );
}

export default function AdminEnrichmentPage() {
  const [password, setPassword] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [checkingStoredAuth, setCheckingStoredAuth] = useState(true);

  const [stats, setStats] = useState<EnrichmentStats | null>(null);
  const [coverage, setCoverage] = useState<CoverageStats | null>(null);

  const [useBarcode, setUseBarcode] = useState(true);
  const [maxProducts, setMaxProducts] = useState(20);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<EnrichmentResult[]>([]);

  async function loadStats(pw: string) {
    const [statsRes, coverageRes] = await Promise.all([
      fetch("/api/admin/enrichment/search", { headers: { "x-admin-password": pw } }),
      fetch("/api/admin/ingredients/coverage", { headers: { "x-admin-password": pw } }),
    ]);
    if (statsRes.ok) setStats(await statsRes.json());
    if (coverageRes.ok) setCoverage(await coverageRes.json());
  }

  async function unlock(pw: string): Promise<boolean> {
    const res = await fetch("/api/admin/enrichment/search", { headers: { "x-admin-password": pw } });
    if (res.status === 401) {
      setAuthError("Incorrect password.");
      return false;
    }
    if (!res.ok) {
      setAuthError("Couldn't load enrichment stats.");
      return false;
    }
    setStats(await res.json());
    const coverageRes = await fetch("/api/admin/ingredients/coverage", { headers: { "x-admin-password": pw } });
    if (coverageRes.ok) setCoverage(await coverageRes.json());
    return true;
  }

  useEffect(() => {
    const stored = sessionStorage.getItem("admin_password");
    if (!stored) {
      setCheckingStoredAuth(false);
      return;
    }
    unlock(stored).then((ok) => {
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
    const ok = await unlock(password);
    if (ok) {
      sessionStorage.setItem("admin_password", password);
      setAuthorized(true);
    }
  }

  async function handleSearch() {
    setSearching(true);
    setSearchError(null);
    const res = await fetch("/api/admin/enrichment/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify({ limit: maxProducts, useBarcode }),
    });
    const data = await res.json();
    setSearching(false);

    if (!res.ok) {
      setSearchError(data.error ?? "Search failed.");
      return;
    }
    setResults(data.results ?? []);
  }

  function handleResolved() {
    if (password) loadStats(password);
  }

  function removeById(ids: Set<string>) {
    setResults((prev) => prev.filter((r) => !ids.has(r.our_product_id)));
  }

  async function acceptAllHighConfidence() {
    const targets = results.filter((r) => r.confidence === "high");
    for (const target of targets) {
      await fetch("/api/admin/enrichment/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": password },
        body: JSON.stringify({ product_id: target.our_product_id, obf_ingredients: target.obf_ingredients }),
      });
    }
    removeById(new Set(targets.map((r) => r.our_product_id)));
    handleResolved();
  }

  function rejectAllLowConfidence() {
    removeById(new Set(results.filter((r) => r.confidence === "low").map((r) => r.our_product_id)));
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
            className="mt-4 w-full bg-bronze py-3 text-sm font-semibold text-cream transition-colors hover:bg-bronze2"
          >
            Unlock
          </button>
        </form>
      </main>
    );
  }

  const coveragePct =
    coverage && coverage.totalIngredients > 0
      ? Math.round((coverage.haveDbScores / coverage.totalIngredients) * 100)
      : 0;

  return (
    <main className="min-h-screen bg-white px-4 py-10 font-sans text-dark sm:px-6">
      <div className="mx-auto max-w-4xl">
        <h1 className="font-serif text-3xl font-semibold text-dark sm:text-4xl">ingredient enrichment</h1>
        <p className="mt-1 font-mono text-[10px] text-dark/50">
          pull ingredient data from Open Beauty Facts to complete missing ingredient lists
        </p>

        {stats && (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="total catalog products" value={stats.totalProducts} />
            <StatCard label="complete (5+ ingredients)" value={stats.complete} />
            <StatCard label="partial (1-4 ingredients)" value={stats.partial} />
            <StatCard label="empty (0 ingredients)" value={stats.empty} />
          </div>
        )}

        {coverage && (
          <div className="mt-6">
            <p className="font-mono text-[9px] text-dark/50">ingredient coverage</p>
            <div className="mt-1 h-3 w-full bg-dark/10">
              <div className="h-3 bg-dark" style={{ width: `${coveragePct}%` }} />
            </div>
            <p className="mt-1 font-mono text-[14px] font-bold text-dark">{coveragePct}%</p>
          </div>
        )}

        <div className="mt-8 rounded-xl border border-bronze/30 p-6">
          <div className="flex flex-wrap items-end gap-4">
            <button
              type="button"
              onClick={handleSearch}
              disabled={searching}
              className="bg-bronze px-5 py-3 font-sans text-sm font-semibold text-cream transition-colors hover:bg-bronze2 disabled:opacity-50"
            >
              {searching ? "Searching..." : "Search Open Beauty Facts →"}
            </button>
            <label className="flex items-center gap-2 font-sans text-[12px] text-dark/70">
              <input type="checkbox" checked={useBarcode} onChange={(e) => setUseBarcode(e.target.checked)} />
              Use barcodes where available
            </label>
            <label className="flex items-center gap-2 font-sans text-[12px] text-dark/70">
              Max products per run:
              <input
                type="number"
                min={1}
                max={50}
                value={maxProducts}
                onChange={(e) => setMaxProducts(Number(e.target.value))}
                className="w-16 rounded border border-bronze/40 px-2 py-1 text-sm"
              />
            </label>
          </div>
          {searching && (
            <p className="mt-3 font-sans text-[11px] text-dark/50">
              This can take a minute - each product is looked up individually with a short delay between calls.
            </p>
          )}
          {searchError && <p className="mt-3 font-sans text-sm text-red">{searchError}</p>}
        </div>

        {results.length > 0 && (
          <>
            <div className="mt-6 overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-dark/20 font-sans text-[11px] text-dark/50">
                    <th className="py-2 pr-3 font-medium">Your Product</th>
                    <th className="py-2 pr-3 font-medium">Our Data</th>
                    <th className="py-2 pr-3 font-medium">OBF Match</th>
                    <th className="py-2 pr-3 font-medium">Confidence</th>
                    <th className="py-2 pr-3 font-medium">OBF Data</th>
                    <th className="py-2 pr-3 font-medium">Action</th>
                    <th className="py-2 pr-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <ResultRow key={r.our_product_id} result={r} password={password} onResolved={handleResolved} />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={acceptAllHighConfidence}
                className="bg-bronze px-4 py-2 font-sans text-[12px] font-semibold text-cream transition-colors hover:bg-bronze2"
              >
                Accept all high confidence →
              </button>
              <button
                type="button"
                onClick={rejectAllLowConfidence}
                className="px-4 py-2 font-sans text-[12px] text-dark/60 transition-colors hover:text-dark"
              >
                Reject all low confidence
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
