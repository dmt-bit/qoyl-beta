"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { amazonSearch } from "@/lib/styleShoppingList";

type Product = {
  id: string;
  name: string;
  brand: string | null;
  brand_slug: string | null;
  category: string | null;
  category_name: string | null;
  image_url: string | null;
  price_usd: number | null;
  average_score: number | null;
};

const CATEGORIES: { slug: string; label: string }[] = [
  { slug: "", label: "All" },
  { slug: "shampoo", label: "Shampoo" },
  { slug: "conditioner", label: "Conditioner" },
  { slug: "deep-conditioner", label: "Deep Conditioner" },
  { slug: "leave-in", label: "Leave-In" },
  { slug: "styler", label: "Styler" },
  { slug: "oil", label: "Oil" },
  { slug: "treatment", label: "Treatment" },
  { slug: "hair-mask", label: "Hair Mask" },
];

function ScoreDot({ score }: { score: number }) {
  const pct = Math.round(score);
  const color =
    pct >= 70 ? "bg-[#2d7a3d] text-[#2d7a3d]" : pct >= 40 ? "bg-[#c4831a] text-[#c4831a]" : "bg-[#b03030] text-[#b03030]";
  const [bg] = color.split(" ");
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`h-1.5 w-1.5 rounded-full ${bg}`} />
      <span className={`font-mono text-[10px] font-bold ${color.split(" ")[1]}`}>{pct}</span>
    </span>
  );
}

function ProductCard({ product }: { product: Product }) {
  const [imgErr, setImgErr] = useState(false);
  const buyUrl = amazonSearch(`${product.brand ?? ""} ${product.name}`.trim());

  return (
    <a
      href={buyUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col border border-dark/10 bg-white transition-shadow hover:shadow-md"
    >
      {/* Image */}
      <div className="relative aspect-square w-full overflow-hidden bg-[#f5f5f5]">
        {product.image_url && !imgErr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-contain p-3 transition-transform group-hover:scale-[1.03]"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="font-mono text-[9px] text-dark/20">no image</span>
          </div>
        )}
        {product.category_name && (
          <span className="absolute left-2 top-2 border border-dark/10 bg-white px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wide text-dark/50">
            {product.category_name}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-1 p-3">
        {product.brand && (
          <p className="font-mono text-[10px] uppercase tracking-wide text-dark/40">{product.brand}</p>
        )}
        <p className="font-sans text-[13px] font-medium leading-tight text-dark line-clamp-2">{product.name}</p>

        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            {product.average_score != null && <ScoreDot score={product.average_score} />}
            {product.price_usd != null && (
              <span className="font-mono text-[11px] text-dark/60">${product.price_usd.toFixed(2)}</span>
            )}
          </div>
          <span className="font-mono text-[9px] text-dark/30 group-hover:text-dark/60">amazon →</span>
        </div>
      </div>
    </a>
  );
}

export default function StorePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const LIMIT = 48;

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  const fetchProducts = useCallback(async (cat: string, q: string, currentOffset: number, append: boolean) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(LIMIT),
        offset: String(currentOffset),
      });
      if (cat) params.set("category", cat);
      if (q) params.set("q", q);

      const res = await fetch(`/api/store/products?${params}`);
      if (!res.ok) throw new Error("Failed to load products");
      const data = await res.json();
      const incoming: Product[] = data.products ?? [];

      setProducts((prev) => append ? [...prev, ...incoming] : incoming);
      setHasMore(incoming.length === LIMIT);
    } catch {
      // fail silently — empty state handles it
    }
    setLoading(false);
  }, []);

  // Reset + refetch when filter/search changes
  useEffect(() => {
    setOffset(0);
    fetchProducts(category, debouncedSearch, 0, false);
  }, [category, debouncedSearch, fetchProducts]);

  function loadMore() {
    const nextOffset = offset + LIMIT;
    setOffset(nextOffset);
    fetchProducts(category, debouncedSearch, nextOffset, true);
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] font-sans text-dark">

      {/* Header */}
      <div className="border-b border-dark/10 bg-white px-6 py-8 sm:py-10">
        <div className="mx-auto max-w-5xl">
          <h1 className="font-serif text-3xl font-bold lowercase text-dark sm:text-4xl">the qoyl store</h1>
          <p className="mt-2 font-mono text-[11px] text-dark/50">
            curated haircare · scored for your hair type · links to amazon
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="sticky top-0 z-10 border-b border-dark/10 bg-white">
        <div className="mx-auto max-w-5xl px-4">
          {/* Search */}
          <div className="flex items-center gap-3 border-b border-dark/10 py-3">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="shrink-0 text-dark/40">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              placeholder="Search products…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent font-sans text-sm text-dark placeholder:text-dark/30 focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="font-mono text-[10px] text-dark/40 hover:text-dark"
              >
                clear
              </button>
            )}
          </div>

          {/* Category pills */}
          <div className="flex gap-2 overflow-x-auto py-2.5 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.slug}
                type="button"
                onClick={() => setCategory(cat.slug)}
                className={`shrink-0 border px-3 py-1 font-sans text-[11px] transition-colors ${
                  category === cat.slug
                    ? "border-dark bg-dark text-cream"
                    : "border-dark/20 bg-white text-dark/60 hover:border-dark/40 hover:text-dark"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Product grid */}
      <div className="mx-auto max-w-5xl px-4 py-6">
        {loading && products.length === 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="animate-pulse border border-dark/10 bg-white">
                <div className="aspect-square bg-[#f0f0f0]" />
                <div className="p-3 space-y-2">
                  <div className="h-2 w-16 rounded bg-[#e8e8e8]" />
                  <div className="h-3 w-full rounded bg-[#e8e8e8]" />
                  <div className="h-3 w-3/4 rounded bg-[#e8e8e8]" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && products.length === 0 && (
          <div className="py-20 text-center">
            <p className="font-sans text-sm text-dark/40">
              {search || category ? "No products match your filters." : "No products yet."}
            </p>
            {(search || category) && (
              <button
                type="button"
                onClick={() => { setSearch(""); setCategory(""); }}
                className="mt-3 font-mono text-[11px] text-dark/50 underline underline-offset-2 hover:text-dark"
              >
                clear filters
              </button>
            )}
          </div>
        )}

        {products.length > 0 && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="font-mono text-[10px] text-dark/40">
                {products.length} product{products.length !== 1 ? "s" : ""}
                {category ? ` · ${CATEGORIES.find((c) => c.slug === category)?.label ?? category}` : ""}
                {search ? ` · "${search}"` : ""}
              </p>
              <p className="font-mono text-[9px] text-dark/30">sorted by qoyl score</p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>

            {hasMore && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loading}
                  className="border border-dark/30 px-6 py-2.5 font-mono text-[11px] text-dark/60 transition-colors hover:border-dark hover:text-dark disabled:opacity-40"
                >
                  {loading ? "loading…" : "load more"}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer note */}
      <div className="border-t border-dark/10 px-6 py-6 text-center">
        <p className="font-mono text-[9px] text-dark/30">
          product links go to amazon · qoyl earns affiliate commissions · prices may vary
        </p>
      </div>
    </div>
  );
}
