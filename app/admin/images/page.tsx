"use client";

import { useEffect, useState, useCallback } from "react";

type Stats = { totalProducts: number; missingImages: number; hasImages: number };

type Product = {
  id: string;
  name: string;
  brand: string | null;
  barcode: string | null;
  image_url: string | null;
};

type SaveStatus = "idle" | "saving" | "saved" | "error";
type Tab = "missing" | "all";

function ProductCard({
  product,
  password,
  onSaved,
}: {
  product: Product;
  password: string;
  onSaved: (id: string, newUrl: string) => void;
}) {
  const hasImage = !!product.image_url;
  const [editing, setEditing] = useState(!hasImage);
  const [url, setUrl] = useState(product.image_url ?? "");
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [previewError, setPreviewError] = useState(false);

  const trimmedUrl = url.trim();
  const isValidUrl = trimmedUrl.startsWith("http://") || trimmedUrl.startsWith("https://");
  const previewUrl = editing ? trimmedUrl : (product.image_url ?? "");
  const showPreview = (previewUrl.startsWith("http://") || previewUrl.startsWith("https://")) && !previewError;

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
      setEditing(false);
      onSaved(product.id, trimmedUrl);
      setTimeout(() => setStatus("idle"), 2000);
    } else {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2000);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") save();
    if (e.key === "Escape" && hasImage) { setEditing(false); setUrl(product.image_url ?? ""); }
  }

  function startEdit() {
    setUrl(product.image_url ?? "");
    setPreviewError(false);
    setEditing(true);
  }

  return (
    <div className="border border-dark/10 bg-white p-3">
      <div className="flex gap-3">
        {/* Image preview */}
        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center border border-dark/10 bg-cream">
          {showPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt={product.name}
              className="h-full w-full object-contain"
              onError={() => setPreviewError(true)}
            />
          ) : (
            <span className="font-mono text-[9px] text-dark/20">no img</span>
          )}
        </div>

        {/* Product info */}
        <div className="min-w-0 flex-1">
          <p className="font-sans text-[13px] font-medium leading-tight text-dark">{product.name}</p>
          <p className="mb-2 font-sans text-[11px] text-dark/50">{product.brand ?? "—"}</p>

          {editing ? (
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="Paste image URL…"
                value={url}
                autoFocus
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
                {status === "saving" ? "…" : status === "error" ? "error" : status === "saved" ? "✓" : "Save"}
              </button>
              {hasImage && (
                <button
                  type="button"
                  onClick={() => { setEditing(false); setUrl(product.image_url ?? ""); }}
                  className="flex-shrink-0 border border-dark/20 px-2.5 py-1.5 font-sans text-[11px] text-dark/50 hover:border-dark/40"
                >
                  Cancel
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="min-w-0 flex-1 truncate font-mono text-[10px] text-dark/30">{product.image_url}</p>
              <button
                type="button"
                onClick={startEdit}
                className="flex-shrink-0 border border-dark/20 px-2.5 py-1 font-sans text-[11px] text-dark/60 hover:border-dark hover:text-dark"
              >
                Edit
              </button>
            </div>
          )}
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
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<Tab>("missing");

  const loadData = useCallback(async (pw: string, mode: Tab) => {
    if (!pw) return;
    setLoading(true);
    try {
      const [statsRes, productsRes] = await Promise.all([
        fetch("/api/admin/images", { headers: { "x-admin-password": pw } }),
        fetch(`/api/admin/images/missing?mode=${mode === "all" ? "all" : "missing"}`, { headers: { "x-admin-password": pw } }),
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
    loadData(password, tab);
  }, [password, tab, loadData]);

  function handleSaved(id: string, newUrl: string) {
    setSavedCount((n) => n + 1);
    setSavedIds((s) => { const next = new Set(s); next.add(id); return next; });
    setStats((s) => s ? { ...s, missingImages: Math.max(0, s.missingImages - 1), hasImages: s.hasImages + 1 } : s);
    setProducts((ps) => ps.map((p) => p.id === id ? { ...p, image_url: newUrl } : p));
  }

  const filtered = products.filter((p) => {
    // On missing tab: show products that either have no image OR were saved this session
    if (tab === "missing" && p.image_url && !savedIds.has(p.id)) return false;
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
            Paste an image URL to assign it. Press Enter to save quickly.
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
          <div className="mb-6 flex gap-6 border-b border-dark/10 pb-5">
            <div>
              <p className="font-mono text-[22px] font-bold text-dark">{Math.max(0, stats.missingImages - savedCount)}</p>
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

        {/* Tabs */}
        {password && (
          <div className="mb-4 flex gap-0 border-b border-dark/10">
            {([["missing", "Missing images"], ["all", "All products"]] as [Tab, string][]).map(([t, label]) => (
              <button
                key={t}
                type="button"
                onClick={() => { setTab(t); setSearch(""); setProducts([]); }}
                className={`px-4 py-2 font-sans text-[12px] transition-colors ${tab === t ? "border-b-2 border-dark font-semibold text-dark" : "text-dark/40 hover:text-dark/70"}`}
              >
                {label}
              </button>
            ))}
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
          <p className="font-mono text-[11px] text-dark/40">Loading…</p>
        )}

        {!loading && products.length === 0 && password && (
          <p className="font-sans text-sm text-dark/50">
            {tab === "missing" ? "All products have images." : "No products found."}
          </p>
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
