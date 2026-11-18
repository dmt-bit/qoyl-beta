"use client";

import { useEffect, useState } from "react";

type Stats = { totalProducts: number; missingImages: number; hasImages: number };

type Confidence = "high" | "medium" | "low";

type ImageResult = {
  product_id: string;
  product_name: string;
  brand: string;
  barcode: string | null;
  obf_product_name: string;
  obf_brand: string;
  image_url: string;
  confidence: Confidence;
};

type RowStatus = "pending" | "accepted" | "rejected";

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

function ImageResultRow({
  result,
  password,
  onResolved,
}: {
  result: ImageResult;
  password: string;
  onResolved: (id: string) => void;
}) {
  const [status, setStatus] = useState<RowStatus>("pending");
  const [busy, setBusy] = useState(false);

  async function accept() {
    setBusy(true);
    const res = await fetch("/api/admin/images", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify({ product_id: result.product_id, image_url: result.image_url }),
    });
    setBusy(false);
    if (!res.ok) return;
    setStatus("accepted");
    onResolved(result.product_id);
  }

  function reject() {
    setStatus("rejected");
    onResolved(result.product_id);
  }

  if (status === "accepted") {
    return (
      <tr className="border-b border-dark/10">
        <td colSpan={5} className="py-3">
          <p className="font-mono text-[10px] text-green">✓ Image saved for {result.product_name}</p>
        </td>
      </tr>
    );
  }
  if (status === "rejected") return null;

  return (
    <tr className="border-b border-dark/10 align-top">
      {/* Product image preview */}
      <td className="py-3 pr-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={result.image_url}
          alt={result.obf_product_name}
          className="h-20 w-20 rounded border border-dark/10 object-contain bg-white"
        />
      </td>
      {/* Our product */}
      <td className="py-3 pr-4">
        <p className="font-sans text-[12px] font-medium text-dark">{result.product_name}</p>
        <p className="font-sans text-[11px] text-dark/50">{result.brand}</p>
        {result.barcode && (
          <p className="font-mono text-[9px] text-dark/30">{result.barcode}</p>
        )}
      </td>
      {/* OBF match */}
      <td className="py-3 pr-4">
        <p className="font-sans text-[12px] text-dark">{result.obf_product_name}</p>
        <p className="font-sans text-[11px] text-dark/50">{result.obf_brand}</p>
        <p className="mt-1 font-mono text-[9px] text-dark/30 break-all max-w-[200px]">{result.image_url}</p>
      </td>
      {/* Confidence */}
      <td className="py-3 pr-4">
        <ConfidenceBadge confidence={result.confidence} />
      </td>
      {/* Actions */}
      <td className="py-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={accept}
            disabled={busy}
            className="bg-bronze px-3 py-1.5 font-sans text-[11px] font-semibold text-cream transition-colors hover:bg-bronze2 disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            onClick={reject}
            className="border border-bronze/40 px-3 py-1.5 font-sans text-[11px] text-dark transition-colors hover:border-bronze"
          >
            Skip
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function AdminImagesPage() {
  const [password, setPassword] = useState(() =>
    typeof window !== "undefined" ? sessionStorage.getItem("admin_password") ?? "" : ""
  );
  const [stats, setStats] = useState<Stats | null>(null);
  const [results, setResults] = useState<ImageResult[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState<number | null>(null);
  const [resolved, setResolved] = useState(0);
  const [limit, setLimit] = useState(15);

  useEffect(() => {
    if (!password) return;
    sessionStorage.setItem("admin_password", password);
    fetch("/api/admin/images", { headers: { "x-admin-password": password } })
      .then((r) => r.json())
      .then((d) => { if (!d.error) setStats(d); })
      .catch(() => {});
  }, [password]);

  async function handleScan() {
    if (!password) return;
    setScanning(true);
    setResults([]);
    setScanned(null);
    setResolved(0);
    const res = await fetch("/api/admin/images", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify({ limit }),
    });
    const data = await res.json();
    setScanning(false);
    if (data.results) {
      setResults(data.results);
      setScanned(data.scanned);
    }
  }

  function handleResolved(id: string) {
    setResolved((n) => n + 1);
    setStats((s) => s ? { ...s, missingImages: Math.max(0, s.missingImages - 1), hasImages: s.hasImages + 1 } : s);
  }

  return (
    <div className="min-h-screen bg-cream p-6 font-sans text-dark">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <h1 className="font-serif text-2xl font-bold text-dark">Product Image Backfill</h1>
          <p className="mt-1 text-sm text-dark/60">
            Finds catalog products with no image, matches them on Open Beauty Facts, and
            lets you approve each photo before it&apos;s saved.
          </p>
        </div>

        {/* Password */}
        <div className="mb-6">
          <input
            type="password"
            placeholder="Admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-72 rounded-none border border-dark/30 bg-transparent px-4 py-2 text-sm text-dark placeholder:text-dark/40 focus:border-dark focus:outline-none"
          />
        </div>

        {/* Stats */}
        {stats && (
          <div className="mb-8 grid grid-cols-3 gap-3">
            <StatCard label="Total products" value={stats.totalProducts} />
            <StatCard label="Have an image" value={stats.hasImages} />
            <StatCard label="Missing image" value={stats.missingImages} />
          </div>
        )}

        {/* Scan controls */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="font-mono text-[11px] text-dark/60">Batch size</label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="rounded-none border border-dark/30 bg-transparent px-2 py-1 text-sm text-dark focus:border-dark focus:outline-none"
            >
              {[5, 10, 15, 20, 30].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleScan}
            disabled={!password || scanning}
            className="bg-dark px-5 py-2.5 font-sans text-sm font-semibold text-cream transition-colors hover:bg-dark/80 disabled:opacity-50"
          >
            {scanning ? "Scanning OBF..." : "Find images →"}
          </button>
          {scanned !== null && (
            <p className="font-mono text-[11px] text-dark/50">
              Scanned {scanned} products &middot; found {results.length} with images
              {resolved > 0 && ` · ${resolved} resolved`}
            </p>
          )}
        </div>

        {/* Results table */}
        {results.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-dark text-left">
                  <th className="pb-2 pr-4 font-mono text-[9px] font-medium uppercase tracking-widest text-dark/50">Preview</th>
                  <th className="pb-2 pr-4 font-mono text-[9px] font-medium uppercase tracking-widest text-dark/50">Our Product</th>
                  <th className="pb-2 pr-4 font-mono text-[9px] font-medium uppercase tracking-widest text-dark/50">OBF Match</th>
                  <th className="pb-2 pr-4 font-mono text-[9px] font-medium uppercase tracking-widest text-dark/50">Confidence</th>
                  <th className="pb-2 font-mono text-[9px] font-medium uppercase tracking-widest text-dark/50">Action</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <ImageResultRow
                    key={r.product_id}
                    result={r}
                    password={password}
                    onResolved={handleResolved}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {scanned !== null && results.length === 0 && !scanning && (
          <p className="font-sans text-sm text-dark/50">
            No OBF image matches found in this batch. Try scanning again to check the next batch.
          </p>
        )}
      </div>
    </div>
  );
}
