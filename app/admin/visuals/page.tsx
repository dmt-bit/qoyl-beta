"use client";

import { useCallback, useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

type VisualImage = {
  id: string;
  image_url: string;
  alt_text: string | null;
  hair_types: string[];
  categories: string[];
  mood: string | null;
  card_types: string[];
  is_active: boolean;
  used_count: number;
  created_at: string;
};

type ProductPhoto = {
  id: string;
  name: string;
  brand: string | null;
  image_url: string | null;
  processed_image_url: string | null;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HAIR_TYPE_OPTIONS = [
  "all",
  "1a", "1b", "1c",
  "2a", "2b", "2c",
  "3a", "3b", "3c",
  "4a", "4b", "4c",
  "extensions", "mens", "baby",
];

const CATEGORY_OPTIONS = ["ingredients", "product", "product_category", "lifestyle", "texture", "style", "scalp", "routine"];

const MOOD_OPTIONS = ["dark_editorial", "light_clean", "warm_neutral", "bold_contrast", "texture_closeup"];

const INPUT_CLASS =
  "w-full border border-dark bg-white px-4 py-3 font-sans text-sm text-dark placeholder:text-dark/40 focus:outline-none";

type AddFormValues = {
  image_url: string;
  alt_text: string;
  hair_types: string[];
  categories: string[];
  mood: string;
};

const EMPTY_FORM: AddFormValues = {
  image_url: "",
  alt_text: "",
  hair_types: [],
  categories: [],
  mood: "",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toggleInArray(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function CheckboxGrid({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div>
      <p className="font-sans font-bold lowercase text-dark" style={{ fontSize: "12px" }}>
        {label}
      </p>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
        {options.map((opt) => (
          <label key={opt} className="flex items-center gap-1.5 font-mono lowercase text-dark" style={{ fontSize: "11px" }}>
            <input
              type="checkbox"
              checked={selected.includes(opt)}
              onChange={() => onToggle(opt)}
              className="accent-dark"
            />
            {opt}
          </label>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Product Photos tab
// ---------------------------------------------------------------------------

type BatchLine =
  | { type: "progress"; done: number; total: number; product_id: string; name: string; ok: true; processed_image_url: string }
  | { type: "progress"; done: number; total: number; product_id: string; name: string; ok: false; error: string }
  | { type: "done"; done: number; total: number; failed: number }
  | { type: "error"; error: string };

function ProductPhotosTab({ password }: { password: string }) {
  const [products, setProducts] = useState<ProductPhoto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<"all" | "done" | "pending">("all");

  // Batch state
  const [batching, setBatching] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number; failed: number } | null>(null);
  const [batchLog, setBatchLog] = useState<string[]>([]);
  const [batchDone, setBatchDone] = useState(false);
  const abortRef = useCallback(() => {}, []); // placeholder; real abort via AbortController below
  const abortCtrlRef = useState<AbortController | null>(null);

  const PAGE_SIZE = 30;

  const load = useCallback(
    async (p: number) => {
      setLoading(true);
      const res = await fetch(`/api/admin/product-photos?page=${p}`, {
        headers: { "x-admin-password": password },
      });
      setLoading(false);
      if (!res.ok) return;
      const data = await res.json();
      setProducts(data.products ?? []);
      setTotal(data.total ?? 0);
    },
    [password]
  );

  useEffect(() => {
    load(page);
  }, [load, page]);

  async function handleRemoveBg(product: ProductPhoto) {
    setProcessingId(product.id);
    setErrors((e) => ({ ...e, [product.id]: "" }));

    const res = await fetch("/api/admin/product-photos", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify({ product_id: product.id }),
    });

    const data = await res.json();
    setProcessingId(null);

    if (!res.ok) {
      setErrors((e) => ({ ...e, [product.id]: data.error ?? "Failed." }));
      return;
    }

    setProducts((prev) =>
      prev.map((p) =>
        p.id === product.id ? { ...p, processed_image_url: data.processed_image_url } : p
      )
    );
  }

  async function handleBatch(redo = false) {
    setBatching(true);
    setBatchProgress(null);
    setBatchLog([]);
    setBatchDone(false);

    const ctrl = new AbortController();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (abortCtrlRef as any)[0] = ctrl;

    try {
      const res = await fetch(
        `/api/admin/product-photos/batch${redo ? "?redo=1" : ""}`,
        {
          method: "POST",
          headers: { "x-admin-password": password },
          signal: ctrl.signal,
        }
      );

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        setBatchLog([(data as { error?: string }).error ?? "Batch failed."]);
        setBatching(false);
        return;
      }

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const msg: BatchLine = JSON.parse(line);
            if (msg.type === "progress") {
              setBatchProgress({ done: msg.done, total: msg.total, failed: 0 });
              if (!msg.ok) {
                setBatchLog((l) => [`✗ ${msg.name}: ${msg.error}`, ...l].slice(0, 50));
              }
              // Update processed_image_url in grid if product is on current page
              if (msg.ok) {
                setProducts((prev) =>
                  prev.map((p) =>
                    p.id === msg.product_id
                      ? { ...p, processed_image_url: msg.processed_image_url }
                      : p
                  )
                );
              }
            } else if (msg.type === "done") {
              setBatchProgress({ done: msg.done, total: msg.total, failed: msg.failed });
              setBatchDone(true);
              setBatching(false);
              // Reload current page to reflect any new done counts
              load(page);
            } else if (msg.type === "error") {
              setBatchLog((l) => [msg.error, ...l]);
              setBatching(false);
            }
          } catch {
            // malformed line, skip
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setBatchLog((l) => ["Connection lost. Refresh and check progress.", ...l]);
      }
      setBatching(false);
    }
  }

  function handleStopBatch() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (abortCtrlRef as any)[0]?.abort();
    setBatching(false);
  }

  const doneCount = products.filter((p) => p.processed_image_url).length;

  const visible = products.filter((p) => {
    if (filter === "done") return !!p.processed_image_url;
    if (filter === "pending") return !p.processed_image_url;
    return true;
  });

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Progress bar pct
  const pct = batchProgress
    ? Math.round((batchProgress.done / Math.max(batchProgress.total, 1)) * 100)
    : 0;

  return (
    <div>
      {/* ── Batch controls ── */}
      <div className="mb-6 border border-dark p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <p className="font-sans font-bold lowercase text-dark" style={{ fontSize: "13px" }}>
              process all
            </p>
            <p className="font-mono lowercase text-dark/50" style={{ fontSize: "9px" }}>
              removes bg from every product that has an image but no processed version yet
            </p>
          </div>
          <div className="ml-auto flex gap-2">
            {batching ? (
              <button
                type="button"
                onClick={handleStopBatch}
                className="border border-dark px-3 py-1.5 font-mono lowercase text-dark hover:bg-[#f5f5f5]"
                style={{ fontSize: "10px" }}
              >
                stop
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleBatch(false)}
                  disabled={batching}
                  className="bg-dark px-4 py-1.5 font-mono lowercase text-white hover:bg-[#444444] disabled:opacity-50"
                  style={{ fontSize: "10px" }}
                >
                  process pending →
                </button>
                <button
                  type="button"
                  onClick={() => handleBatch(true)}
                  disabled={batching}
                  className="border border-dark px-3 py-1.5 font-mono lowercase text-dark hover:bg-[#f5f5f5] disabled:opacity-50"
                  style={{ fontSize: "10px" }}
                >
                  redo all
                </button>
              </>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {batchProgress && (
          <div className="mt-3">
            <div className="flex items-center justify-between">
              <span className="font-mono lowercase text-dark/60" style={{ fontSize: "9px" }}>
                {batchProgress.done} / {batchProgress.total}
                {batchProgress.failed > 0 && ` · ${batchProgress.failed} failed`}
                {batchDone && " · done"}
              </span>
              <span className="font-mono text-dark/60" style={{ fontSize: "9px" }}>{pct}%</span>
            </div>
            <div className="mt-1 h-1.5 w-full bg-[#f0f0f0]">
              <div
                className="h-full bg-dark transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        {/* Error log */}
        {batchLog.length > 0 && (
          <div className="mt-3 max-h-24 overflow-y-auto">
            {batchLog.map((line, i) => (
              <p key={i} className="font-mono lowercase text-red/80" style={{ fontSize: "8px" }}>
                {line}
              </p>
            ))}
          </div>
        )}

        {!batching && !batchProgress && (
          <p className="mt-2 font-mono lowercase text-dark/30" style={{ fontSize: "9px" }}>
            also runs automatically every night at 3 AM UTC to catch new products
          </p>
        )}
      </div>

      {/* ── Grid header ── */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono lowercase text-muted" style={{ fontSize: "10px" }}>
          {total} products with images · {doneCount} bg removed this page
        </p>
        <div className="flex gap-1">
          {(["all", "done", "pending"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-2 py-1 font-mono lowercase ${
                filter === f ? "bg-dark text-white" : "border border-dark text-dark hover:bg-[#f5f5f5]"
              }`}
              style={{ fontSize: "9px" }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <p className="py-8 text-center font-mono lowercase text-dark/50" style={{ fontSize: "11px" }}>
          loading...
        </p>
      )}

      {!loading && (
        <div className="grid grid-cols-2 gap-px border border-dark bg-dark sm:grid-cols-3 md:grid-cols-4">
          {visible.map((product) => (
            <div key={product.id} className="bg-white p-3">
              {/* Image comparison: original left, processed right */}
              <div className="grid grid-cols-2 gap-1">
                {/* Original */}
                <div>
                  <p className="mb-1 font-mono lowercase text-dark/40" style={{ fontSize: "8px" }}>original</p>
                  <div className="relative aspect-square w-full overflow-hidden bg-[#f5f5f5]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={product.image_url ?? ""}
                      alt={product.name}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-contain"
                    />
                  </div>
                </div>
                {/* Processed */}
                <div>
                  <p className="mb-1 font-mono lowercase text-dark/40" style={{ fontSize: "8px" }}>no bg</p>
                  <div
                    className="relative aspect-square w-full overflow-hidden"
                    style={{ backgroundImage: "repeating-conic-gradient(#e5e5e5 0% 25%, white 0% 50%) 0 0 / 12px 12px" }}
                  >
                    {product.processed_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.processed_image_url}
                        alt={`${product.name} no background`}
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-contain"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="font-mono lowercase text-dark/20" style={{ fontSize: "8px" }}>empty</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Product info */}
              <p className="mt-2 truncate font-sans font-medium text-dark" style={{ fontSize: "11px" }}>
                {product.name}
              </p>
              {product.brand && (
                <p className="truncate font-mono lowercase text-dark/50" style={{ fontSize: "9px" }}>
                  {product.brand}
                </p>
              )}

              {/* Error */}
              {errors[product.id] && (
                <p className="mt-1 font-mono lowercase text-red" style={{ fontSize: "8px" }}>
                  {errors[product.id]}
                </p>
              )}

              {/* Action */}
              <button
                type="button"
                onClick={() => handleRemoveBg(product)}
                disabled={processingId === product.id || batching}
                className={`mt-2 w-full py-1.5 font-mono lowercase disabled:opacity-50 ${
                  product.processed_image_url
                    ? "border border-dark text-dark hover:bg-[#f5f5f5]"
                    : "bg-dark text-white hover:bg-[#444444]"
                }`}
                style={{ fontSize: "9px" }}
              >
                {processingId === product.id
                  ? "removing bg..."
                  : product.processed_image_url
                  ? "redo"
                  : "remove bg"}
              </button>
            </div>
          ))}
        </div>
      )}

      {!loading && visible.length === 0 && (
        <p className="mt-6 text-center font-mono lowercase text-dark/40" style={{ fontSize: "11px" }}>
          no products to show
        </p>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="border border-dark px-3 py-1.5 font-mono lowercase text-dark disabled:opacity-30 hover:bg-[#f5f5f5]"
            style={{ fontSize: "10px" }}
          >
            prev
          </button>
          <span className="font-mono lowercase text-dark/50" style={{ fontSize: "10px" }}>
            {page + 1} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="border border-dark px-3 py-1.5 font-mono lowercase text-dark disabled:opacity-30 hover:bg-[#f5f5f5]"
            style={{ fontSize: "10px" }}
          >
            next
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Visual Library tab (original content)
// ---------------------------------------------------------------------------

function VisualLibraryTab({
  password,
  images,
  setImages,
  loading,
  loadImages,
}: {
  password: string;
  images: VisualImage[];
  setImages: React.Dispatch<React.SetStateAction<VisualImage[]>>;
  loading: boolean;
  loadImages: (pw: string) => Promise<boolean>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ hair_types: string[]; categories: string[]; alt_text: string } | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [form, setForm] = useState<AddFormValues>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [generatingAlt, setGeneratingAlt] = useState(false);
  const [altGenResult, setAltGenResult] = useState<string | null>(null);

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setAddError(null);

    const res = await fetch("/api/admin/visual-library", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify({
        image_url: form.image_url.trim(),
        alt_text: form.alt_text.trim() || null,
        hair_types: form.hair_types,
        categories: form.categories,
        mood: form.mood || null,
        card_types: [],
      }),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setAddError(data.error ?? "Failed to add image.");
      return;
    }

    setImages((prev) => [data.image, ...prev]);
    setForm(EMPTY_FORM);
  }

  async function handleToggleActive(image: VisualImage) {
    setImages((prev) => prev.map((i) => (i.id === image.id ? { ...i, is_active: !i.is_active } : i)));
    await fetch(`/api/admin/visual-library/${image.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify({ is_active: !image.is_active }),
    });
  }

  function startEditing(image: VisualImage) {
    setEditingId(image.id);
    setEditDraft({ hair_types: [...image.hair_types], categories: [...image.categories], alt_text: image.alt_text ?? "" });
    setEditError(null);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditDraft(null);
    setEditError(null);
  }

  async function handleSaveTags(image: VisualImage) {
    if (!editDraft) return;
    setEditSaving(true);
    setEditError(null);

    const res = await fetch(`/api/admin/visual-library/${image.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify({
        hair_types: editDraft.hair_types,
        categories: editDraft.categories,
        alt_text: editDraft.alt_text.trim() || null,
      }),
    });

    setEditSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setEditError(data.error ?? "Failed to save.");
      return;
    }

    setImages((prev) =>
      prev.map((i) =>
        i.id === image.id
          ? { ...i, hair_types: editDraft.hair_types, categories: editDraft.categories, alt_text: editDraft.alt_text.trim() || null }
          : i
      )
    );
    cancelEditing();
  }

  async function handleDelete(image: VisualImage) {
    if (!window.confirm("Delete this image from the visual library? This can't be undone.")) return;
    setImages((prev) => prev.filter((i) => i.id !== image.id));
    await fetch(`/api/admin/visual-library/${image.id}`, {
      method: "DELETE",
      headers: { "x-admin-password": password },
    });
  }

  const activeCount = images.filter((i) => i.is_active).length;

  return (
    <div>
      <p className="mb-4 font-mono lowercase text-muted" style={{ fontSize: "10px" }}>
        {images.length} images · {activeCount} active
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={generatingAlt}
          onClick={async () => {
            setGeneratingAlt(true);
            setAltGenResult("running batch...");
            let totalUpdated = 0;
            let totalFailed = 0;
            for (let i = 0; i < 20; i++) {
              const res = await fetch("/api/admin/visual-library/generate-alt-text", {
                method: "POST",
                headers: { "x-admin-password": password },
              });
              const data = await res.json();
              if (!res.ok) {
                setAltGenResult(`Error: ${data.error ?? "Failed."}`);
                break;
              }
              totalUpdated += data.updated ?? 0;
              totalFailed += data.failed ?? 0;
              const remaining = data.remaining ?? 0;
              setAltGenResult(`Updated ${totalUpdated} · ${totalFailed} failed · ${remaining} remaining...`);
              if (remaining === 0 || data.updated === 0) break;
            }
            setAltGenResult((prev) => (prev ? prev.replace("...", " done") : "done"));
            await loadImages(password);
            setGeneratingAlt(false);
          }}
          className="border border-dark px-3 py-1.5 font-mono lowercase text-dark hover:bg-[#f5f5f5] disabled:opacity-50"
          style={{ fontSize: "10px" }}
        >
          {generatingAlt ? "generating..." : "auto-generate missing alt text"}
        </button>
        {altGenResult && (
          <span className="font-mono lowercase text-muted" style={{ fontSize: "10px" }}>{altGenResult}</span>
        )}
      </div>

      <section className="mt-6 border border-dark p-6">
        <h2 className="font-sans font-bold lowercase text-dark" style={{ fontSize: "16px" }}>
          add image
        </h2>
        <form onSubmit={handleAddSubmit} className="mt-4 space-y-4">
          <input
            type="text"
            value={form.image_url}
            onChange={(e) => setForm({ ...form, image_url: e.target.value })}
            placeholder="Image URL"
            required
            className={INPUT_CLASS}
          />
          <input
            type="text"
            value={form.alt_text}
            onChange={(e) => setForm({ ...form, alt_text: e.target.value })}
            placeholder="Alt text"
            className={INPUT_CLASS}
          />

          <CheckboxGrid
            label="hair types"
            options={HAIR_TYPE_OPTIONS}
            selected={form.hair_types}
            onToggle={(v) => setForm({ ...form, hair_types: toggleInArray(form.hair_types, v) })}
          />
          <CheckboxGrid
            label="categories"
            options={CATEGORY_OPTIONS}
            selected={form.categories}
            onToggle={(v) => setForm({ ...form, categories: toggleInArray(form.categories, v) })}
          />

          <div>
            <p className="font-sans font-bold lowercase text-dark" style={{ fontSize: "12px" }}>
              mood
            </p>
            <select
              value={form.mood}
              onChange={(e) => setForm({ ...form, mood: e.target.value })}
              className={`mt-2 ${INPUT_CLASS}`}
            >
              <option value="">select mood</option>
              {MOOD_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {addError && <p className="text-sm text-red">{addError}</p>}

          <button
            type="submit"
            disabled={submitting || !form.image_url.trim()}
            className="w-full bg-dark py-3 text-sm font-bold lowercase text-white transition-colors hover:bg-[#444444] disabled:opacity-50"
          >
            {submitting ? "adding..." : "add to library"}
          </button>
        </form>
      </section>

      <section className="mt-8">
        {loading && <p className="text-sm text-dark/50">Loading...</p>}

        <div className="grid grid-cols-1 gap-px border border-dark bg-dark sm:grid-cols-3">
          {images.map((image) => (
            <div key={image.id} className="bg-white p-3">
              <div className="relative aspect-square w-full overflow-hidden bg-[#f5f5f5]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.image_url}
                  alt={image.alt_text ?? ""}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </div>

              {editingId === image.id && editDraft ? (
                <div className="mt-2 space-y-3 border-t border-dark pt-3">
                  <input
                    type="text"
                    value={editDraft.alt_text}
                    onChange={(e) => setEditDraft({ ...editDraft, alt_text: e.target.value })}
                    placeholder="Alt text"
                    className="w-full border border-dark bg-white px-2 py-1.5 font-sans text-dark placeholder:text-dark/40 focus:outline-none"
                    style={{ fontSize: "11px" }}
                  />
                  <CheckboxGrid
                    label="hair types"
                    options={HAIR_TYPE_OPTIONS}
                    selected={editDraft.hair_types}
                    onToggle={(v) => setEditDraft({ ...editDraft, hair_types: toggleInArray(editDraft.hair_types, v) })}
                  />
                  <CheckboxGrid
                    label="categories"
                    options={CATEGORY_OPTIONS}
                    selected={editDraft.categories}
                    onToggle={(v) => setEditDraft({ ...editDraft, categories: toggleInArray(editDraft.categories, v) })}
                  />
                  {editError && <p className="font-mono lowercase text-red" style={{ fontSize: "9px" }}>{editError}</p>}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleSaveTags(image)}
                      disabled={editSaving}
                      className="border border-dark bg-dark px-2 py-1 font-mono lowercase text-white disabled:opacity-50"
                      style={{ fontSize: "9px" }}
                    >
                      {editSaving ? "saving..." : "save"}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditing}
                      disabled={editSaving}
                      className="border border-dark px-2 py-1 font-mono lowercase text-dark"
                      style={{ fontSize: "9px" }}
                    >
                      cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {image.hair_types.map((t) => (
                      <span key={t} className="border border-dark px-1.5 py-0.5 font-mono lowercase text-dark" style={{ fontSize: "9px" }}>
                        {t}
                      </span>
                    ))}
                    {image.hair_types.length === 0 && (
                      <span className="font-mono lowercase text-dark/30" style={{ fontSize: "9px" }}>no hair types</span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {image.categories.map((c) => (
                      <span key={c} className="bg-[#f5f5f5] px-1.5 py-0.5 font-mono lowercase text-muted" style={{ fontSize: "9px" }}>
                        {c}
                      </span>
                    ))}
                    {image.categories.length === 0 && (
                      <span className="font-mono lowercase text-dark/30" style={{ fontSize: "9px" }}>no categories</span>
                    )}
                  </div>
                </>
              )}

              <p className="mt-2 font-mono lowercase text-muted" style={{ fontSize: "9px" }}>
                used {image.used_count} time{image.used_count === 1 ? "" : "s"}
              </p>

              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(image)}
                    className={`border border-dark px-2 py-1 font-mono lowercase ${
                      image.is_active ? "bg-dark text-white" : "bg-white text-dark"
                    }`}
                    style={{ fontSize: "9px" }}
                  >
                    {image.is_active ? "active" : "inactive"}
                  </button>
                  {editingId !== image.id && (
                    <button
                      type="button"
                      onClick={() => startEditing(image)}
                      className="border border-dark px-2 py-1 font-mono lowercase text-dark hover:bg-[#f5f5f5]"
                      style={{ fontSize: "9px" }}
                    >
                      edit tags
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(image)}
                  className="font-mono lowercase text-red underline underline-offset-2"
                  style={{ fontSize: "9px" }}
                >
                  delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {!loading && images.length === 0 && (
          <p className="mt-4 text-sm text-dark/50">No images in the library yet.</p>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page root
// ---------------------------------------------------------------------------

type Tab = "library" | "product-photos";

export default function AdminVisualsPage() {
  const [password, setPassword] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [checkingStoredAuth, setCheckingStoredAuth] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("library");

  const [images, setImages] = useState<VisualImage[]>([]);
  const [loading, setLoading] = useState(false);

  const loadImages = useCallback(async (pw: string): Promise<boolean> => {
    setLoading(true);
    setAuthError(null);

    const res = await fetch("/api/admin/visual-library", {
      headers: { "x-admin-password": pw },
    });

    setLoading(false);

    if (res.status === 401) {
      setAuthError("Incorrect password.");
      return false;
    }
    if (!res.ok) {
      setAuthError("Couldn't load the visual library. Try again.");
      return false;
    }

    const data = await res.json();
    setImages(data.images ?? []);
    return true;
  }, []);

  useEffect(() => {
    const stored = sessionStorage.getItem("admin_password");
    if (!stored) {
      setCheckingStoredAuth(false);
      return;
    }
    loadImages(stored).then((ok) => {
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
    const ok = await loadImages(password);
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
        <form onSubmit={handleUnlock} className="w-full max-w-sm border border-dark p-6">
          <h1 className="font-sans font-bold lowercase text-dark" style={{ fontSize: "20px" }}>
            admin access
          </h1>
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
            className="mt-4 w-full bg-dark py-3 text-sm font-bold lowercase text-white transition-colors hover:bg-[#444444] disabled:opacity-50"
          >
            {loading ? "checking..." : "unlock"}
          </button>
        </form>
      </main>
    );
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: "library", label: "visual library" },
    { id: "product-photos", label: "product photos" },
  ];

  return (
    <main className="min-h-screen bg-white px-4 py-10 font-sans text-dark sm:px-6">
      <div className="mx-auto max-w-4xl">
        <h1 className="font-sans font-bold lowercase text-dark" style={{ fontSize: "28px" }}>
          visuals
        </h1>

        {/* Tab bar */}
        <div className="mt-4 flex border-b border-dark">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 font-mono lowercase transition-colors ${
                activeTab === tab.id
                  ? "border-b-2 border-dark bg-white font-bold text-dark"
                  : "text-dark/50 hover:text-dark"
              }`}
              style={{ fontSize: "11px", marginBottom: activeTab === tab.id ? "-1px" : "0" }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {activeTab === "library" && (
            <VisualLibraryTab
              password={password}
              images={images}
              setImages={setImages}
              loading={loading}
              loadImages={loadImages}
            />
          )}
          {activeTab === "product-photos" && (
            <ProductPhotosTab password={password} />
          )}
        </div>
      </div>
    </main>
  );
}
