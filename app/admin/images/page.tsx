"use client";

import { useEffect, useState, useCallback } from "react";

type Stats = { totalProducts: number; missingImages: number; hasImages: number };

type Product = {
  id: string;
  name: string;
  brand: string | null;
  barcode: string | null;
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

function ProductCard({
  product,
  password,
  onSaved,
}: {
  product: Product;
  password: string;
  onSaved: () => void;
}) {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [previewError, setPreviewError] = useState(false);

  const trimmedUrl = url.trim();
  const isValidUrl = trimmedUrl.startsWith("http://") || trimmedUrl.startsWith("https://");
  const showPreview = isValidUrl && !previewError;

  async function save() {
    if (!isValidUrl || status === "saving") return;
    setStatus("saving");
    const res = await fetch("/api/admin/images", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify({ product_id: product.id, image_url: trimmedUrl }),
    });
    if (res.ok) {
      setStatus("saved");
      onSaved();
    } else {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2000);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") save();
  }

  if (status === "saved") {
    return (
      <div className="flex items-center gap-3 border border-dark/10 bg-white p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={trimmedUrl} alt={product.name} className="h-14 w-14 flex-shrink-0 object-contain" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-sans text-[12px] font-medium text-dark">{product.name}</p>
          <p className="font-mono text-[10px] text-green-600">✓ saved</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-dark/10 bg-white p-3">
      <div className="flex gap-3">
        {/* Image preview or placeholder */}
        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center border border-dark/10 bg-cream">
          {showPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={trimmedUrl}
              alt={product.name}
              className="h-full w-full object-contain"
              onError={() => setPreviewError(true)}
            />
          ) : (
            <span className="font-mono text-[9px] text-dark/20">no img</span>
          )}
        </div>

        {/* Product info + input */}
        <div className="min-w-0 flex-1">
          <p className="font-sans text-[13px] font-medium leading-tight text-dark">{product.name}</p>
          <p className="mb-2 font-sans text-[11px] text-dark/50">{product.brand ?? "—"}</p>
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="Paste image URL…"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setPreviewError(false); }}
              onKeyDown={handleKeyDown}
              className="min-w-0 flex-1 rounded-none border border-dark/20 bg-transparent px-2.5 py-1.5 font-mono text-[11px] text-dark placeholder:text-dark/30 focus:border-dark focus:outline-none"
            />
            <button
              type="button"
              onClick={save}
              disabled={!isValidUrl || status === "saving"}
              className="flex-shrink-0 bg-dark px-3 py-1.5 font-sans text-[11px] font-semibold text-cream transition-colors hover:bg-dark/80 disabled:opacity-30"
            >
              {status === "saving" ? "…" : status === "error" ? "error" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminImagesPage() {
  const [password, setPassword] = useState(() =>
    typeof window !== "undefined" ? sessionStorage.getItem("admin_password") ?? "" : ""
  );
  const [stats, setStats] = useState<Stats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [savedCount, setSavedCount] = useState(0);

  const loadData = useCallback(async (pw: string) => {
    if (!pw) return;
    setLoading(true);
    try {
      const [statsRes, productsRes] = await Promise.all([
        fetch("/api/admin/images", { headers: { "x-admin-password": pw } }),
        fetch("/api/admin/images/missing", { headers: { "x-admin-password": pw } }),
      ]);
      const statsData = await statsRes.json();
      const productsData = await productsRes.json();
      if (!statsData.error) setStats(statsData);
      if (productsData.products) setProducts(productsData.products);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!password) return;
    sessionStorage.setItem("admin_password", password);
    loadData(password);
  }, [password, loadData]);

  function handleSaved() {
    setSavedCount((n) => n + 1);
    setStats((s) => s ? { ...s, missingImages: Math.max(0, s.missingImages - 1), hasImages: s.hasImages + 1 } : s);
  }

  const filtered = products.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.brand ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-cream p-6 font-sans text-dark">
      <div className="mx-auto max-w-3xl">

        {/* Header */}
        <div className="mb-6">
          <h1 className="font-serif text-2xl font-bold text-dark">Product Images</h1>
          <p className="mt-1 text-sm text-dark/50">
            Find an image URL anywhere on the web, paste it, save. Press Enter to save quickly.
          </p>
        </div>

        {/* Password */}
        {!password && (
          <div className="mb-6">
            <input
              type="password"
              placeholder="Admin password"
              onBlur={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") setPassword((e.target as HTMLInputElement).value); }}
              className="w-72 rounded-none border border-dark/30 bg-transparent px-4 py-2 text-sm text-dark placeholder:text-dark/40 focus:border-dark focus:outline-none"
            />
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="mb-6 flex gap-6 border-b border-dark/10 pb-6">
            <div>
              <p className="font-mono text-[22px] font-bold text-dark">{stats.missingImages - savedCount}</p>
              <p className="font-sans text-[11px] text-dark/50">missing</p>
            </div>
            <div>
              <p className="font-mono text-[22px] font-bold text-dark">{stats.hasImages + savedCount}</p>
              <p className="font-sans text-[11px] text-dark/50">have image</p>
            </div>
            <div>
              <p className="font-mono text-[22px] font-bold text-dark">{stats.totalProducts}</p>
              <p className="font-sans text-[11px] text-dark/50">total</p>
            </div>
            {savedCount > 0 && (
              <div>
                <p className="font-mono text-[22px] font-bold text-green-600">+{savedCount}</p>
                <p className="font-sans text-[11px] text-dark/50">this session</p>
              </div>
            )}
          </div>
        )}

        {/* Search */}
        {products.length > 0 && (
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search by name or brand…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-none border border-dark/20 bg-transparent px-4 py-2.5 text-sm text-dark placeholder:text-dark/30 focus:border-dark focus:outline-none"
            />
            {search && (
              <p className="mt-1.5 font-mono text-[10px] text-dark/40">
                {filtered.length} of {products.length} products
              </p>
            )}
          </div>
        )}

        {/* Product list */}
        {loading && (
          <p className="font-mono text-[11px] text-dark/40">Loading products…</p>
        )}

        {!loading && products.length === 0 && password && (
          <p className="font-sans text-sm text-dark/50">All products have images.</p>
        )}

        <div className="flex flex-col gap-2">
          {filtered.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              password={password}
              onSaved={handleSaved}
            />
          ))}
        </div>

      </div>
    </div>
  );
}
