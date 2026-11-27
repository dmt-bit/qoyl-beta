"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { PRODUCT_CATEGORIES } from "@/lib/productCategories";
import { FunctionSelectorGrid, FUNCTION_CARDS, type IngredientFunction } from "@/components/FunctionSelectorGrid";

type Brand = { id: string; name: string };
type Category = { id: string; name: string };

type AdminProduct = {
  id: string;
  name: string;
  barcode: string | null;
  size: string | null;
  image_url: string | null;
  processed_image_url: string | null;
  is_verified: boolean;
  ingredient_list_raw: string | null;
  ingredient_list_normalized: string[] | null;
  brand_id: string | null;
  category_id: string | null;
  brand_name: string | null;
  category_name: string | null;
  match_rate: number | null;
  created_at: string;
};

type MatchSummary = {
  totalCount: number;
  matchedCount: number;
  createdCount: number;
  createdNames: string[];
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function IngredientCountBadge({ count }: { count: number }) {
  if (count === 0) {
    return (
      <span className="inline-block rounded-full bg-red/10 px-2 py-0.5 font-mono text-[9px] font-medium text-red">
        none
      </span>
    );
  }
  if (count <= 4) {
    return (
      <span className="inline-block rounded-full bg-amber/10 px-2 py-0.5 font-mono text-[9px] font-medium text-amber">
        partial {count}
      </span>
    );
  }
  if (count <= 14) {
    return (
      <span className="inline-block rounded-full bg-dark/5 px-2 py-0.5 font-mono text-[9px] font-medium text-dark/60">
        {count}
      </span>
    );
  }
  return (
    <span className="inline-block rounded-full bg-green/10 px-2 py-0.5 font-mono text-[9px] font-medium text-green">
      {count}
    </span>
  );
}

type ProductFormValues = {
  name: string;
  brand_id: string;
  custom_brand_name: string;
  category_id: string;
  barcode: string;
  size: string;
  image_url: string;
  ingredient_list_raw: string;
};

const EMPTY_FORM: ProductFormValues = {
  name: "",
  brand_id: "",
  custom_brand_name: "",
  category_id: "",
  barcode: "",
  size: "",
  image_url: "",
  ingredient_list_raw: "",
};

// Curated display order (lib/productCategories.ts) rather than the API's
// alphabetical order, so e.g. "hair-mask" sits right after
// "deep-conditioner" in the category dropdown. Anything not in that
// curated list (e.g. "butter") falls to the end, alphabetically.
const CATEGORY_DISPLAY_INDEX = new Map(PRODUCT_CATEGORIES.map((c, i) => [c.slug, i]));
function compareCategoriesForDisplay(a: { name: string }, b: { name: string }): number {
  const ai = CATEGORY_DISPLAY_INDEX.get(a.name) ?? Infinity;
  const bi = CATEGORY_DISPLAY_INDEX.get(b.name) ?? Infinity;
  if (ai !== bi) return ai - bi;
  return a.name.localeCompare(b.name);
}

const OTHER_BRAND_VALUE = "__other__";

// Blank means "no brand selected," which is allowed - only "Other" with
// nothing typed is a real validation error.
function getBrandValidationError(values: ProductFormValues): string | null {
  if (values.brand_id === OTHER_BRAND_VALUE && !values.custom_brand_name.trim()) {
    return "Please enter a brand name.";
  }
  return null;
}

const INPUT_CLASS =
  "w-full rounded-lg border border-bronze/40 bg-transparent px-4 py-3 text-sm text-dark placeholder:text-dark/40 focus:border-bronze focus:outline-none";

function MatchSummaryBox({
  title,
  summary,
}: {
  title: string;
  summary: MatchSummary;
}) {
  return (
    <div className="mt-4 rounded-lg border border-bronze/30 bg-bronze/5 p-3">
      <p className="text-xs font-medium text-dark/80">
        {title} {summary.matchedCount} of {summary.totalCount} ingredients
        matched. {summary.createdCount} new ingredient
        {summary.createdCount === 1 ? "" : "s"} created.
      </p>
      {summary.createdNames.length > 0 && (
        <>
          <p className="mt-2 text-xs font-medium text-amber">
            Review these newly-created ingredients:
          </p>
          <p className="mt-1 text-xs text-dark/70">
            {summary.createdNames.join(", ")}
          </p>
        </>
      )}
    </div>
  );
}

type OBFLookupState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "not_found" }
  | { status: "found"; productName: string; brand: string; ingredients: string[] }
  | { status: "error"; message: string };

function BarcodeLookup({
  barcode,
  password,
  onImport,
}: {
  barcode: string;
  password: string;
  onImport: (ingredientsText: string) => void;
}) {
  const [state, setState] = useState<OBFLookupState>({ status: "idle" });

  async function handleLookup() {
    const trimmed = barcode.trim();
    if (!trimmed) return;
    setState({ status: "loading" });

    const res = await fetch(`/api/admin/enrichment/lookup?barcode=${encodeURIComponent(trimmed)}`, {
      headers: { "x-admin-password": password },
    });
    const data = await res.json();

    if (!res.ok) {
      setState({ status: "error", message: data.error ?? "Lookup failed." });
      return;
    }
    if (!data.found) {
      setState({ status: "not_found" });
      return;
    }
    setState({
      status: "found",
      productName: data.productName ?? "",
      brand: data.brand ?? "",
      ingredients: data.ingredients ?? [],
    });
  }

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={handleLookup}
        disabled={!barcode.trim() || state.status === "loading"}
        className="font-sans text-[11px] text-bronze2 underline underline-offset-2 hover:text-dark disabled:opacity-40"
      >
        {state.status === "loading" ? "Looking up..." : "Lookup ingredients →"}
      </button>
      <p className="mt-0.5 font-mono text-[9px] text-dark/40">
        Adding a barcode enables automatic ingredient lookup
      </p>

      {state.status === "not_found" && (
        <p className="mt-1 font-sans text-[11px] text-dark/50">Nothing found on Open Beauty Facts for this barcode.</p>
      )}
      {state.status === "error" && <p className="mt-1 font-sans text-[11px] text-red">{state.message}</p>}
      {state.status === "found" && (
        <div className="mt-2 rounded-lg border border-bronze/30 bg-bronze/5 p-3">
          <p className="font-sans text-[12px] text-dark">
            Found {state.ingredients.length} ingredients on Open Beauty Facts
            {state.productName ? ` (matched: "${state.productName}"${state.brand ? ` - ${state.brand}` : ""})` : ""}. Import them?
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => {
                onImport(state.ingredients.join(", "));
                setState({ status: "idle" });
              }}
              className="bg-bronze px-3 py-1.5 font-sans text-[11px] font-semibold text-cream transition-colors hover:bg-bronze2"
            >
              Import ingredients
            </button>
            <button
              type="button"
              onClick={() => setState({ status: "idle" })}
              className="border border-bronze/40 px-3 py-1.5 font-sans text-[11px] text-dark transition-colors hover:border-bronze"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ImagePanel ───────────────────────────────────────────────────────────────
// Self-contained image management UI for a single product: preview, OBF
// auto-fetch, manual URL entry, and bg-removal trigger.

type OBFCandidate = {
  image_url: string;
  source: string;
};

type ImagePanelState =
  | { status: "idle" }
  | { status: "searching" }
  | { status: "found"; candidates: OBFCandidate[] }
  | { status: "not_found" }
  | { status: "removing_bg" }
  | { status: "bg_done"; processed_image_url: string }
  | { status: "error"; message: string };

function ImagePanel({
  productId,
  productName,
  barcode,
  imageUrl,
  processedImageUrl,
  password,
  onImageUrlChange,
  onProcessedUrlChange,
}: {
  productId: string | null;
  productName: string;
  barcode: string;
  imageUrl: string;
  processedImageUrl: string | null;
  password: string;
  onImageUrlChange: (url: string) => void;
  onProcessedUrlChange?: (url: string) => void;
}) {
  const [state, setState] = useState<ImagePanelState>({ status: "idle" });
  const [manualUrl, setManualUrl] = useState(imageUrl);
  const [previewError, setPreviewError] = useState(false);
  const prevImageUrl = useRef(imageUrl);

  // Sync manual URL input when parent changes imageUrl (e.g. after save)
  useEffect(() => {
    if (imageUrl !== prevImageUrl.current) {
      setManualUrl(imageUrl);
      setPreviewError(false);
      prevImageUrl.current = imageUrl;
    }
  }, [imageUrl]);

  const displayUrl = processedImageUrl ?? imageUrl;
  const hasImage = !!imageUrl;

  async function handleAutoFind() {
    setState({ status: "searching" });
    try {
      const res = await fetch("/api/admin/images/find", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": password },
        body: JSON.stringify({ name: productName, barcode: barcode || null }),
      });
      const data = await res.json();
      const candidates: OBFCandidate[] = data.candidates ?? [];
      if (candidates.length > 0) {
        setState({ status: "found", candidates });
      } else {
        setState({ status: "not_found" });
      }
    } catch {
      setState({ status: "error", message: "Auto-fetch failed." });
    }
  }

  function pickCandidate(url: string) {
    onImageUrlChange(url);
    setManualUrl(url);
    setPreviewError(false);
    setState({ status: "idle" });
  }

  function handleManualSave() {
    const trimmed = manualUrl.trim();
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      onImageUrlChange(trimmed);
      setPreviewError(false);
    }
  }

  async function handleRemoveBg() {
    if (!productId || !imageUrl) return;
    setState({ status: "removing_bg" });
    try {
      const res = await fetch("/api/admin/product-photos", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": password },
        body: JSON.stringify({ product_id: productId }),
      });
      const data = await res.json();
      if (res.ok && data.processed_image_url) {
        onProcessedUrlChange?.(data.processed_image_url);
        setState({ status: "bg_done", processed_image_url: data.processed_image_url });
      } else {
        setState({ status: "error", message: data.error ?? "BG removal failed." });
      }
    } catch {
      setState({ status: "error", message: "BG removal failed." });
    }
  }

  return (
    <div className="rounded-lg border border-bronze/30 bg-cream/40 p-3">
      <p className="mb-2 font-sans text-[11px] font-semibold uppercase tracking-wide text-dark/50">
        Product image
      </p>

      <div className="flex gap-3">
        {/* Preview */}
        <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded border border-dark/10 bg-white">
          {displayUrl && !previewError ? (
            <Image
              src={displayUrl}
              alt={productName || "Product"}
              fill
              className="object-contain"
              sizes="80px"
              unoptimized
              onError={() => setPreviewError(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="text-2xl opacity-30">🧴</span>
            </div>
          )}
          {processedImageUrl && (
            <span className="absolute bottom-0.5 right-0.5 rounded bg-green/80 px-1 font-mono text-[8px] text-white">
              BG
            </span>
          )}
        </div>

        {/* Controls */}
        <div className="min-w-0 flex-1 space-y-2">
          {/* Manual URL input */}
          <div className="flex gap-1.5">
            <input
              type="url"
              value={manualUrl}
              onChange={(e) => { setManualUrl(e.target.value); setPreviewError(false); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleManualSave(); } }}
              placeholder="Paste image URL…"
              className="min-w-0 flex-1 rounded border border-bronze/30 bg-white px-2.5 py-1.5 font-mono text-[11px] text-dark placeholder:text-dark/30 focus:border-bronze focus:outline-none"
            />
            {manualUrl.trim() !== imageUrl && manualUrl.trim().startsWith("http") && (
              <button
                type="button"
                onClick={handleManualSave}
                className="flex-shrink-0 rounded bg-bronze px-2.5 py-1.5 font-sans text-[11px] font-semibold text-cream hover:bg-bronze2"
              >
                Set
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={handleAutoFind}
              disabled={state.status === "searching" || (!barcode.trim() && !productName.trim())}
              className="rounded border border-bronze/40 px-2.5 py-1 font-sans text-[11px] text-dark/70 hover:border-bronze hover:text-dark disabled:opacity-40"
            >
              {state.status === "searching" ? "Searching…" : "Auto-find image"}
            </button>

            {productId && hasImage && !processedImageUrl && (
              <button
                type="button"
                onClick={handleRemoveBg}
                disabled={state.status === "removing_bg"}
                className="rounded border border-bronze/40 px-2.5 py-1 font-sans text-[11px] text-dark/70 hover:border-bronze hover:text-dark disabled:opacity-40"
              >
                {state.status === "removing_bg" ? "Processing…" : "Remove BG"}
              </button>
            )}

            {processedImageUrl && (
              <span className="rounded bg-green/10 px-2.5 py-1 font-sans text-[11px] text-green">
                BG removed
              </span>
            )}
          </div>

          {/* Status messages */}
          {state.status === "not_found" && (
            <p className="font-sans text-[11px] text-dark/50">No image found on Open Beauty Facts.</p>
          )}
          {state.status === "error" && (
            <p className="font-sans text-[11px] text-red">{state.message}</p>
          )}
          {state.status === "bg_done" && (
            <p className="font-sans text-[11px] text-green">Background removed.</p>
          )}
        </div>
      </div>

      {/* OBF candidates */}
      {state.status === "found" && state.candidates.length > 0 && (
        <div className="mt-3 border-t border-bronze/20 pt-3">
          <p className="mb-2 font-sans text-[11px] text-dark/60">
            Found {state.candidates.length} candidate{state.candidates.length !== 1 ? "s" : ""}. Pick one:
          </p>
          <div className="flex flex-wrap gap-2">
            {state.candidates.map((c, i) => (
              <button
                key={i}
                type="button"
                onClick={() => pickCandidate(c.image_url)}
                className="group relative h-16 w-16 overflow-hidden rounded border-2 border-bronze/20 bg-white hover:border-bronze"
                title={c.source}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.image_url} alt={`Candidate ${i + 1}`} className="h-full w-full object-contain" />
                <span className="absolute inset-0 flex items-center justify-center bg-dark/60 opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="font-sans text-[10px] font-semibold text-white">Use</span>
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setState({ status: "idle" })}
              className="self-center font-sans text-[11px] text-dark/40 hover:text-dark"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductForm({
  values,
  brands,
  categories,
  submitting,
  submitLabel,
  password,
  productId,
  processedImageUrl,
  onChange,
  onSubmit,
  onCancel,
  onProcessedUrlChange,
}: {
  values: ProductFormValues;
  brands: Brand[];
  categories: Category[];
  submitting: boolean;
  submitLabel: string;
  password: string;
  productId?: string | null;
  processedImageUrl?: string | null;
  onChange: (values: ProductFormValues) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel?: () => void;
  onProcessedUrlChange?: (url: string) => void;
}) {
  // Re-sort on every render rather than trusting callers/the API to
  // hand back an already-sorted list - cheap for a brand-count list
  // this small, and guarantees newly-added brands slot in alphabetically
  // instead of trailing at the end.
  const sortedBrands = [...brands].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input
        type="text"
        value={values.name}
        onChange={(e) => onChange({ ...values, name: e.target.value })}
        placeholder="Product name"
        required
        className={INPUT_CLASS}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <select
            value={values.brand_id}
            onChange={(e) =>
              onChange({ ...values, brand_id: e.target.value })
            }
            className={INPUT_CLASS}
          >
            <option value="" className="text-dark">
              Select brand
            </option>
            {sortedBrands.map((b) => (
              <option key={b.id} value={b.id} className="text-dark">
                {b.name}
              </option>
            ))}
            <option value={OTHER_BRAND_VALUE} className="text-dark">
              Other (type your own)
            </option>
          </select>

          {values.brand_id === OTHER_BRAND_VALUE && (
            <input
              type="text"
              value={values.custom_brand_name}
              onChange={(e) =>
                onChange({ ...values, custom_brand_name: e.target.value })
              }
              placeholder="Brand name"
              className={`mt-3 ${INPUT_CLASS}`}
            />
          )}
        </div>

        <select
          value={values.category_id}
          onChange={(e) => onChange({ ...values, category_id: e.target.value })}
          className={INPUT_CLASS}
        >
          <option value="" className="text-dark">
            Select category
          </option>
          {[...categories].sort(compareCategoriesForDisplay).map((c) => (
            <option key={c.id} value={c.id} className="text-dark">
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="font-sans text-[13px] text-dark/70">Barcode (UPC/EAN)</label>
          <input
            type="text"
            value={values.barcode}
            onChange={(e) => onChange({ ...values, barcode: e.target.value })}
            placeholder="e.g. 012345678901"
            className={`mt-1 ${INPUT_CLASS}`}
          />
          <BarcodeLookup
            barcode={values.barcode}
            password={password}
            onImport={(ingredientsText) => onChange({ ...values, ingredient_list_raw: ingredientsText })}
          />
        </div>
        <input
          type="text"
          value={values.size}
          onChange={(e) => onChange({ ...values, size: e.target.value })}
          placeholder="Size (e.g. 12 oz)"
          className={INPUT_CLASS}
        />
      </div>

      <ImagePanel
        productId={productId ?? null}
        productName={values.name}
        barcode={values.barcode}
        imageUrl={values.image_url}
        processedImageUrl={processedImageUrl ?? null}
        password={password}
        onImageUrlChange={(url) => onChange({ ...values, image_url: url })}
        onProcessedUrlChange={onProcessedUrlChange}
      />

      <textarea
        value={values.ingredient_list_raw}
        onChange={(e) =>
          onChange({ ...values, ingredient_list_raw: e.target.value })
        }
        placeholder="Aqua, Cetyl Alcohol, Glycerin, ..."
        rows={4}
        className={INPUT_CLASS}
      />

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting || !values.name.trim()}
          className="flex-1 bg-bronze py-3 text-sm font-semibold text-cream transition-colors hover:bg-bronze2 disabled:opacity-50"
        >
          {submitting ? "Saving..." : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="border border-bronze/40 px-4 py-3 text-sm font-medium text-dark transition-colors hover:border-bronze"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

type CoverageStats = {
  totalIngredients: number;
  haveDbScores: number;
  haveFunctionTags: number;
  completelyUnscored: number;
  breakdown: { function: string; ingredients: number; haveDbScores: number; autoScoreable: number }[];
};

type GeneratePreview = {
  ingredientCount: number;
  rowCount: number;
  sample: {
    inciName: string;
    primaryFunction: string;
    scores: { low: number; medium: number; high: number };
    ratings: { low: string; medium: string; high: string };
  }[];
};

type AdminIngredient = { id: string; inci_name: string; common_name: string | null; primary_function: string | null };

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-dark bg-white p-4">
      <p className="font-mono text-[28px] font-bold text-dark">{value}</p>
      <p className="mt-1 font-sans text-[11px] font-light text-dark/50">{label}</p>
    </div>
  );
}

function IngredientTaggingTool({ password, onTagged }: { password: string; onTagged: () => void }) {
  const [ingredients, setIngredients] = useState<AdminIngredient[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<AdminIngredient | null>(null);
  const [selectedFn, setSelectedFn] = useState<IngredientFunction | null>(null);
  const [scores, setScores] = useState({ low: 6, medium: 6, high: 6 });
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  async function loadIngredients() {
    const res = await fetch("/api/admin/ingredients", { headers: { "x-admin-password": password } });
    if (res.ok) {
      const data = await res.json();
      setIngredients(data.ingredients ?? []);
    }
    setLoaded(true);
  }

  useEffect(() => {
    if (!loaded) loadIngredients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const matches =
    query.trim().length > 1
      ? ingredients.filter((i) => i.inci_name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 15)
      : [];

  function selectIngredient(ing: AdminIngredient) {
    setSelected(ing);
    setSaveMessage(null);
    const fn = (ing.primary_function as IngredientFunction | null) ?? null;
    setSelectedFn(fn);
    const card = FUNCTION_CARDS.find((c) => c.value === fn);
    setScores(card ? { ...card.scores } : { low: 6, medium: 6, high: 6 });
  }

  function selectFunction(fn: IngredientFunction) {
    setSelectedFn(fn);
    const card = FUNCTION_CARDS.find((c) => c.value === fn);
    if (card) setScores({ ...card.scores });
  }

  async function handleSave() {
    if (!selected || !selectedFn) return;
    setSaving(true);
    setSaveMessage(null);

    const res = await fetch(`/api/admin/ingredients/${selected.id}/tag`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify({ primary_function: selectedFn, scores }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setSaveMessage(data.error ?? "Failed to save.");
      return;
    }
    setSaveMessage(`Saved. ${data.rowsInserted} score row(s) added.`);
    setIngredients((prev) =>
      prev.map((i) => (i.id === selected.id ? { ...i, primary_function: selectedFn } : i))
    );
    loadIngredients();
    onTagged();
  }

  return (
    <div className="mt-6 rounded-xl border border-bronze/30 p-6">
      <h3 className="font-serif text-lg font-semibold text-dark">Tag an ingredient</h3>
      <p className="mt-1 font-sans text-[12px] text-dark/50">
        Search for an ingredient, assign its function, review the default scores, then save.
      </p>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search ingredients by name..."
        className={`mt-3 ${INPUT_CLASS}`}
      />

      {matches.length > 0 && !selected && (
        <ul className="mt-2 max-h-52 overflow-y-auto rounded-lg border border-bronze/20">
          {matches.map((ing) => (
            <li key={ing.id}>
              <button
                type="button"
                onClick={() => selectIngredient(ing)}
                className="flex w-full items-center justify-between px-3 py-2 text-left font-sans text-[12px] hover:bg-bronze/5"
              >
                <span>{ing.common_name || ing.inci_name}</span>
                <span className="font-mono text-[9px] text-dark/40">
                  {ing.primary_function ?? "untagged"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <p className="font-sans text-[13px] font-medium text-dark">{selected.inci_name}</p>
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setQuery("");
              }}
              className="font-sans text-[11px] text-bronze2 underline underline-offset-2 hover:text-dark"
            >
              Change
            </button>
          </div>

          <div className="mt-3">
            <FunctionSelectorGrid value={selectedFn} onSelect={selectFunction} />
          </div>

          {selectedFn && (
            <div className="mt-3 rounded-lg border border-bronze/20 bg-bronze/5 p-3">
              <p className="font-sans text-[12px] font-medium text-dark">Scores that will be auto-generated:</p>
              <div className="mt-2 flex gap-3">
                {(["low", "medium", "high"] as const).map((porosity) => (
                  <label key={porosity} className="flex-1">
                    <span className="block font-sans text-[10px] capitalize text-dark/50">
                      {porosity} porosity
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={scores[porosity]}
                      onChange={(e) =>
                        setScores((prev) => ({ ...prev, [porosity]: Number(e.target.value) }))
                      }
                      className="mt-1 w-full rounded border border-bronze/40 px-2 py-1 text-sm"
                    />
                  </label>
                ))}
              </div>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="mt-3 bg-bronze px-4 py-2 font-sans text-[12px] font-semibold text-cream transition-colors hover:bg-bronze2 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save ingredient"}
              </button>
              {saveMessage && <p className="mt-2 font-sans text-[11px] text-dark/60">{saveMessage}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CoverageTab({ password }: { password: string }) {
  const [stats, setStats] = useState<CoverageStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [preview, setPreview] = useState<GeneratePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateMessage, setGenerateMessage] = useState<string | null>(null);

  async function loadStats() {
    setStatsLoading(true);
    const res = await fetch("/api/admin/ingredients/coverage", { headers: { "x-admin-password": password } });
    if (res.ok) setStats(await res.json());
    setStatsLoading(false);
  }

  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handlePreview() {
    setPreviewLoading(true);
    setGenerateMessage(null);
    const res = await fetch("/api/admin/ingredients/generate-scores", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify({ mode: "preview" }),
    });
    setPreviewLoading(false);
    if (res.ok) setPreview(await res.json());
  }

  async function handleRunGeneration() {
    setGenerating(true);
    const res = await fetch("/api/admin/ingredients/generate-scores", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify({ mode: "execute" }),
    });
    const data = await res.json();
    setGenerating(false);

    if (!res.ok) {
      setGenerateMessage(data.error ?? "Generation failed.");
      return;
    }
    setGenerateMessage(
      `Added ${data.rowsInserted} score rows for ${data.ingredientsScored} ingredients. Coverage: ${data.before.haveDbScores}/${data.before.totalIngredients} -> ${data.after.haveDbScores}/${data.after.totalIngredients}.`
    );
    setPreview(null);
    loadStats();
  }

  if (statsLoading || !stats) {
    return <p className="mt-8 font-sans text-sm text-dark/50">Loading coverage stats...</p>;
  }

  return (
    <div className="mt-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="total ingredients" value={stats.totalIngredients} />
        <StatCard label="have DB scores" value={stats.haveDbScores} />
        <StatCard label="have function tags" value={stats.haveFunctionTags} />
        <StatCard label="completely unscored" value={stats.completelyUnscored} />
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full border-collapse text-left font-sans text-[12px]">
          <thead>
            <tr className="border-b border-dark/20 text-dark/50">
              <th className="py-2 pr-3 font-medium">Function</th>
              <th className="py-2 pr-3 font-medium">Ingredients</th>
              <th className="py-2 pr-3 font-medium">Have DB scores</th>
              <th className="py-2 pr-3 font-medium">Auto-scoreable</th>
            </tr>
          </thead>
          <tbody>
            {stats.breakdown.map((row) => (
              <tr key={row.function} className="border-b border-dark/10">
                <td className="py-2 pr-3">{row.function}</td>
                <td className="py-2 pr-3">{row.ingredients}</td>
                <td className="py-2 pr-3">{row.haveDbScores}</td>
                <td className="py-2 pr-3">{row.autoScoreable}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 rounded-xl border border-bronze/30 p-6">
        <h3 className="font-serif text-lg font-semibold text-dark">Generate scores from function tags</h3>
        <p className="mt-2 font-sans text-[12px] text-dark/60">
          This will add approximately {stats.breakdown.reduce((acc, r) => acc + r.autoScoreable, 0)} rows to
          compatibility_scores for ingredients that have function tags but no DB scores. These are estimates -
          flagged for review.
        </p>
        <div className="mt-3 flex gap-3">
          <button
            type="button"
            onClick={handlePreview}
            disabled={previewLoading}
            className="border border-bronze/40 px-4 py-2 font-sans text-[12px] font-medium text-dark transition-colors hover:border-bronze disabled:opacity-50"
          >
            {previewLoading ? "Loading..." : "Preview"}
          </button>
          <button
            type="button"
            onClick={handleRunGeneration}
            disabled={generating}
            className="bg-bronze px-4 py-2 font-sans text-[12px] font-semibold text-cream transition-colors hover:bg-bronze2 disabled:opacity-50"
          >
            {generating ? "Running..." : "Run generation"}
          </button>
        </div>

        {preview && (
          <div className="mt-4 rounded-lg border border-bronze/20 bg-bronze/5 p-3">
            <p className="font-sans text-[12px] text-dark">
              {preview.ingredientCount} ingredients / {preview.rowCount} rows would be added. Sample:
            </p>
            <ul className="mt-2 space-y-1">
              {preview.sample.map((s) => (
                <li key={s.inciName} className="font-mono text-[10px] text-dark/60">
                  {s.inciName} ({s.primaryFunction}) - low: {s.scores.low}/{s.ratings.low}, medium:{" "}
                  {s.scores.medium}/{s.ratings.medium}, high: {s.scores.high}/{s.ratings.high}
                </li>
              ))}
            </ul>
          </div>
        )}

        {generateMessage && <p className="mt-3 font-sans text-[12px] text-dark/70">{generateMessage}</p>}
      </div>

      <IngredientTaggingTool password={password} onTagged={loadStats} />
    </div>
  );
}

type AdminBrand = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  website: string | null;
  product_count: number;
  avg_score: number | null;
};

type BrandFormValues = {
  name: string;
  slug: string;
  description: string;
  logo_url: string;
  website_url: string;
};

const EMPTY_BRAND_FORM: BrandFormValues = {
  name: "",
  slug: "",
  description: "",
  logo_url: "",
  website_url: "",
};

function brandToFormValues(b: AdminBrand): BrandFormValues {
  return {
    name: b.name,
    slug: b.slug,
    description: b.description ?? "",
    logo_url: b.logo_url ?? "",
    website_url: b.website ?? "",
  };
}

function BrandFormFields({
  values,
  onChange,
}: {
  values: BrandFormValues;
  onChange: (values: BrandFormValues) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className="block">
        <span className="text-xs font-medium text-dark/60">Brand name</span>
        <input
          type="text"
          value={values.name}
          onChange={(e) => onChange({ ...values, name: e.target.value })}
          className="mt-1 w-full rounded-lg border border-bronze/40 bg-transparent px-3 py-2 text-sm text-dark focus:border-bronze focus:outline-none"
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-dark/60">Slug</span>
        <input
          type="text"
          value={values.slug}
          onChange={(e) => onChange({ ...values, slug: e.target.value })}
          placeholder="auto-generated if left blank"
          className="mt-1 w-full rounded-lg border border-bronze/40 bg-transparent px-3 py-2 text-sm text-dark placeholder:text-dark/30 focus:border-bronze focus:outline-none"
        />
      </label>
      <label className="block sm:col-span-2">
        <span className="text-xs font-medium text-dark/60">Description</span>
        <textarea
          value={values.description}
          onChange={(e) => onChange({ ...values, description: e.target.value })}
          rows={2}
          className="mt-1 w-full rounded-lg border border-bronze/40 bg-transparent px-3 py-2 text-sm text-dark focus:border-bronze focus:outline-none"
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-dark/60">Logo URL (Cloudinary)</span>
        <input
          type="text"
          value={values.logo_url}
          onChange={(e) => onChange({ ...values, logo_url: e.target.value })}
          className="mt-1 w-full rounded-lg border border-bronze/40 bg-transparent px-3 py-2 text-sm text-dark focus:border-bronze focus:outline-none"
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-dark/60">Website URL</span>
        <input
          type="text"
          value={values.website_url}
          onChange={(e) => onChange({ ...values, website_url: e.target.value })}
          className="mt-1 w-full rounded-lg border border-bronze/40 bg-transparent px-3 py-2 text-sm text-dark focus:border-bronze focus:outline-none"
        />
      </label>
      {values.logo_url && (
        <div className="flex items-center gap-2 sm:col-span-2">
          <span className="text-xs text-dark/40">preview:</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={values.logo_url} alt="" className="h-8 w-8 object-contain" />
        </div>
      )}
    </div>
  );
}

function BrandsTab({ password }: { password: string }) {
  const [brands, setBrands] = useState<AdminBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<BrandFormValues>(EMPTY_BRAND_FORM);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<BrandFormValues>(EMPTY_BRAND_FORM);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  async function loadBrands() {
    setLoading(true);
    setLoadError(null);
    const res = await fetch("/api/admin/brands", { headers: { "x-admin-password": password } });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setLoadError(data.error ?? "Failed to load brands.");
      return;
    }
    setBrands(data.brands ?? []);
  }

  useEffect(() => {
    loadBrands();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startEdit(b: AdminBrand) {
    setEditingId(b.id);
    setEditForm(brandToFormValues(b));
    setEditError(null);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setEditSubmitting(true);
    setEditError(null);
    const res = await fetch(`/api/admin/brands/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify(editForm),
    });
    const data = await res.json();
    setEditSubmitting(false);
    if (!res.ok) {
      setEditError(data.error ?? "Failed to save brand.");
      return;
    }
    setEditingId(null);
    loadBrands();
  }

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAddSubmitting(true);
    setAddError(null);
    const res = await fetch("/api/admin/brands", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify(addForm),
    });
    const data = await res.json();
    setAddSubmitting(false);
    if (!res.ok) {
      setAddError(data.error ?? "Failed to add brand.");
      return;
    }
    setShowAddForm(false);
    setAddForm(EMPTY_BRAND_FORM);
    loadBrands();
  }

  if (loading) {
    return <p className="mt-8 font-sans text-sm text-dark/50">Loading brands...</p>;
  }

  return (
    <div className="mt-8">
      {loadError && (
        <p className="mb-4 rounded-md bg-red/10 px-3 py-2 text-sm text-red">
          {loadError} - logo_url/description need supabase/add_brand_directory.sql run first.
        </p>
      )}

      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] lowercase text-muted">{brands.length} brands</p>
        <button
          type="button"
          onClick={() => setShowAddForm((v) => !v)}
          className="rounded-lg border border-bronze px-3 py-1.5 text-xs font-medium text-bronze2 hover:bg-bronze/10"
        >
          {showAddForm ? "cancel" : "+ add brand"}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddSubmit} className="mt-4 rounded-xl border border-bronze/30 p-4">
          <BrandFormFields values={addForm} onChange={setAddForm} />
          {addError && <p className="mt-2 text-sm text-red">{addError}</p>}
          <button
            type="submit"
            disabled={addSubmitting}
            className="mt-3 rounded-lg bg-bronze px-4 py-2 text-sm font-semibold text-cream hover:bg-bronze2 disabled:opacity-50"
          >
            {addSubmitting ? "Adding..." : "Add brand"}
          </button>
        </form>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-left font-sans text-[12px]">
          <thead>
            <tr className="border-b border-dark/20 text-dark/50">
              <th className="py-2 pr-3 font-medium">Logo</th>
              <th className="py-2 pr-3 font-medium">Brand name</th>
              <th className="py-2 pr-3 font-medium">Products</th>
              <th className="py-2 pr-3 font-medium">Avg score</th>
              <th className="py-2 pr-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {brands.map((b) => (
              <Fragment key={b.id}>
                <tr className="border-b border-dark/10 align-middle">
                  <td className="py-2 pr-3">
                    {b.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={b.logo_url} alt="" className="h-8 w-8 object-contain" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center bg-dark text-[11px] font-bold text-white">
                        {b.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-dark">{b.name}</td>
                  <td className="py-2 pr-3 text-dark">{b.product_count}</td>
                  <td className="py-2 pr-3 text-dark">{b.avg_score ?? "—"}</td>
                  <td className="py-2 pr-3">
                    <button
                      type="button"
                      onClick={() => (editingId === b.id ? setEditingId(null) : startEdit(b))}
                      className="text-bronze2 underline underline-offset-2 hover:text-dark"
                    >
                      {editingId === b.id ? "close" : "edit"}
                    </button>
                  </td>
                </tr>
                {editingId === b.id && (
                  <tr key={`${b.id}-edit`} className="border-b border-dark/10">
                    <td colSpan={5} className="bg-warm/40 p-4">
                      <form onSubmit={handleEditSubmit}>
                        <BrandFormFields values={editForm} onChange={setEditForm} />
                        {editError && <p className="mt-2 text-sm text-red">{editError}</p>}
                        <button
                          type="submit"
                          disabled={editSubmitting}
                          className="mt-3 rounded-lg bg-bronze px-4 py-2 text-sm font-semibold text-cream hover:bg-bronze2 disabled:opacity-50"
                        >
                          {editSubmitting ? "Saving..." : "Save"}
                        </button>
                      </form>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Shared product row (used in both flat and grouped views) ───────────────

function ProductRow({
  product,
  brands,
  categories,
  password,
  isEditing,
  editForm,
  editProcessedUrl,
  editSubmitting,
  editError,
  editSummary,
  onStartEdit,
  onCancelEdit,
  onEditFormChange,
  onEditProcessedUrlChange,
  onEditSubmit,
  onMarkVerified,
  onDelete,
}: {
  product: AdminProduct;
  brands: Brand[];
  categories: Category[];
  password: string;
  isEditing: boolean;
  editForm: ProductFormValues;
  editProcessedUrl: string | null;
  editSubmitting: boolean;
  editError: string | null;
  editSummary: MatchSummary | null;
  onStartEdit: (p: AdminProduct) => void;
  onCancelEdit: () => void;
  onEditFormChange: (v: ProductFormValues) => void;
  onEditProcessedUrlChange: (url: string) => void;
  onEditSubmit: (e: React.FormEvent) => void;
  onMarkVerified: (id: string, e: React.MouseEvent) => void;
  onDelete: (id: string) => void;
}) {
  const ingredientCount = product.ingredient_list_normalized?.length ?? 0;
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <li className="rounded-lg border border-bronze/30 p-4">
      {isEditing ? (
        <>
          <ProductForm
            values={editForm}
            brands={brands}
            categories={categories}
            submitting={editSubmitting}
            submitLabel="Save changes"
            password={password}
            productId={product.id}
            processedImageUrl={editProcessedUrl}
            onChange={onEditFormChange}
            onProcessedUrlChange={onEditProcessedUrlChange}
            onSubmit={onEditSubmit}
            onCancel={onCancelEdit}
          />
          {editError && <p className="mt-3 text-sm text-red">{editError}</p>}
          {editSummary && (
            <MatchSummaryBox title="Product updated." summary={editSummary} />
          )}
          <div className="mt-4 border-t border-dark/10 pt-4">
            {confirmDelete ? (
              <div className="flex items-center gap-3">
                <p className="text-sm text-dark/70">Delete &ldquo;{product.name}&rdquo;? This cannot be undone.</p>
                <button
                  type="button"
                  onClick={() => onDelete(product.id)}
                  className="rounded bg-red px-3 py-1.5 text-xs font-semibold text-white hover:opacity-80"
                >
                  Yes, delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="text-xs text-dark/50 underline underline-offset-2 hover:text-dark"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="text-xs text-dark/40 underline underline-offset-2 hover:text-red"
              >
                Delete product
              </button>
            )}
          </div>
        </>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => onStartEdit(product)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onStartEdit(product);
            }
          }}
          className="flex cursor-pointer items-start justify-between gap-4"
        >
          <div>
            <div className="flex items-center gap-2">
              <p className="font-serif text-base text-dark">{product.name}</p>
              {product.is_verified && (
                <span className="inline-block rounded-full border border-bronze/40 px-2 py-0.5 text-[10px] font-medium text-bronze2">
                  Verified
                </span>
              )}
            </div>
            <p className="text-xs text-bronze2">
              {product.brand_name ?? "No brand"}
              {product.category_name ? ` · ${product.category_name}` : ""}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-dark/50">
              <IngredientCountBadge count={ingredientCount} />
              <span>
                · Match rate:{" "}
                {product.match_rate === null ? "-" : `${product.match_rate}%`} · Added{" "}
                {formatDate(product.created_at)}
              </span>
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            {/* Image status pill */}
            {product.processed_image_url ? (
              <span className="rounded-full bg-green/10 px-2 py-0.5 font-mono text-[9px] text-green">img+BG</span>
            ) : product.image_url ? (
              <span className="rounded-full bg-dark/5 px-2 py-0.5 font-mono text-[9px] text-dark/50">img</span>
            ) : (
              <span className="rounded-full bg-amber/10 px-2 py-0.5 font-mono text-[9px] text-amber">no img</span>
            )}
            {!product.is_verified && (
              <button
                type="button"
                onClick={(e) => onMarkVerified(product.id, e)}
                className="text-xs text-bronze2 underline underline-offset-2 hover:text-dark"
              >
                Mark verified
              </button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

// ─── Brand group accordion ────────────────────────────────────────────────────

function BrandGroup({
  brandName,
  products,
  brands,
  categories,
  password,
  editingId,
  editForm,
  editProcessedUrl,
  editSubmitting,
  editError,
  editSummary,
  onStartEdit,
  onCancelEdit,
  onEditFormChange,
  onEditProcessedUrlChange,
  onEditSubmit,
  onMarkVerified,
  onDelete,
}: {
  brandName: string;
  products: AdminProduct[];
  brands: Brand[];
  categories: Category[];
  password: string;
  editingId: string | null;
  editForm: ProductFormValues;
  editProcessedUrl: string | null;
  editSubmitting: boolean;
  editError: string | null;
  editSummary: MatchSummary | null;
  onStartEdit: (p: AdminProduct) => void;
  onCancelEdit: () => void;
  onEditFormChange: (v: ProductFormValues) => void;
  onEditProcessedUrlChange: (url: string) => void;
  onEditSubmit: (e: React.FormEvent) => void;
  onMarkVerified: (id: string, e: React.MouseEvent) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  // Auto-expand if a product in this group is being edited
  const hasEditing = products.some((p) => p.id === editingId);
  const isOpen = open || hasEditing;

  return (
    <div className="rounded-lg border border-bronze/30">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-bronze/5"
      >
        <span className="font-serif text-base font-semibold text-dark">
          {brandName}
        </span>
        <span className="flex items-center gap-3">
          <span className="font-mono text-[10px] lowercase text-muted">
            {products.length} product{products.length !== 1 ? "s" : ""}
          </span>
          <span className="text-xs text-dark/40">{isOpen ? "▲" : "▼"}</span>
        </span>
      </button>

      {isOpen && (
        <div className="border-t border-bronze/20 px-4 pb-4 pt-3">
          <ul className="space-y-3">
            {products.map((product) => (
              <ProductRow
                key={product.id}
                product={product}
                brands={brands}
                categories={categories}
                password={password}
                isEditing={editingId === product.id}
                editForm={editForm}
                editProcessedUrl={editProcessedUrl}
                editSubmitting={editSubmitting}
                editError={editError}
                editSummary={editSummary}
                onStartEdit={onStartEdit}
                onCancelEdit={onCancelEdit}
                onEditFormChange={onEditFormChange}
                onEditProcessedUrlChange={onEditProcessedUrlChange}
                onEditSubmit={onEditSubmit}
                onMarkVerified={onMarkVerified}
                onDelete={onDelete}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Product list section (flat or by-brand) ─────────────────────────────────

type ProductListSectionProps = {
  products: AdminProduct[];
  brands: Brand[];
  categories: Category[];
  loading: boolean;
  password: string;
  editingId: string | null;
  editForm: ProductFormValues;
  editProcessedUrl: string | null;
  editSubmitting: boolean;
  editError: string | null;
  editSummary: MatchSummary | null;
  onStartEdit: (p: AdminProduct) => void;
  onCancelEdit: () => void;
  onEditFormChange: (v: ProductFormValues) => void;
  onEditProcessedUrlChange: (url: string) => void;
  onEditSubmit: (e: React.FormEvent) => void;
  onMarkVerified: (id: string, e: React.MouseEvent) => void;
  onDelete: (id: string) => void;
};

function ProductListSection({
  products,
  brands,
  categories,
  loading,
  password,
  editingId,
  editForm,
  editProcessedUrl,
  editSubmitting,
  editError,
  editSummary,
  onStartEdit,
  onCancelEdit,
  onEditFormChange,
  onEditProcessedUrlChange,
  onEditSubmit,
  onMarkVerified,
  onDelete,
}: ProductListSectionProps) {
  const [viewMode, setViewMode] = useState<"flat" | "by-brand">("flat");
  const [brandFilter, setBrandFilter] = useState("");

  // Build brand groups (sorted alphabetically; "No brand" always last)
  const brandGroups: { name: string; products: AdminProduct[] }[] =
    viewMode === "by-brand"
      ? (() => {
          const map = new Map<string, AdminProduct[]>();
          for (const p of products) {
            const key = p.brand_name ?? "No brand";
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(p);
          }
          return Array.from(map.entries())
            .sort(([a], [b]) => {
              if (a === "No brand") return 1;
              if (b === "No brand") return -1;
              return a.localeCompare(b);
            })
            .map(([name, prods]) => ({ name, products: prods }));
        })()
      : [];

  // Filter for flat view
  const filteredFlat = brandFilter
    ? products.filter(
        (p) =>
          (p.brand_name ?? "No brand")
            .toLowerCase()
            .includes(brandFilter.toLowerCase())
      )
    : products;

  // Filter groups for by-brand view
  const filteredGroups = brandFilter
    ? brandGroups.filter((g) =>
        g.name.toLowerCase().includes(brandFilter.toLowerCase())
      )
    : brandGroups;

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-xl font-semibold text-dark">
          All products ({products.length})
        </h2>

        <div className="flex items-center gap-3">
          <input
            type="text"
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
            placeholder="Filter by brand..."
            className="rounded-lg border border-bronze/40 bg-transparent px-3 py-1.5 text-sm text-dark placeholder:text-dark/40 focus:border-bronze focus:outline-none"
          />

          <div className="flex overflow-hidden rounded-lg border border-bronze/40">
            <button
              type="button"
              onClick={() => setViewMode("flat")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === "flat"
                  ? "bg-bronze text-cream"
                  : "text-dark/60 hover:text-dark"
              }`}
            >
              List
            </button>
            <button
              type="button"
              onClick={() => setViewMode("by-brand")}
              className={`border-l border-bronze/40 px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === "by-brand"
                  ? "bg-bronze text-cream"
                  : "text-dark/60 hover:text-dark"
              }`}
            >
              By brand
            </button>
          </div>
        </div>
      </div>

      {loading && <p className="mt-4 text-sm text-dark/50">Loading...</p>}

      {viewMode === "flat" && (
        <ul className="mt-4 space-y-3">
          {filteredFlat.map((product) => (
            <ProductRow
              key={product.id}
              product={product}
              brands={brands}
              categories={categories}
              password={password}
              isEditing={editingId === product.id}
              editForm={editForm}
              editProcessedUrl={editProcessedUrl}
              editSubmitting={editSubmitting}
              editError={editError}
              editSummary={editSummary}
              onStartEdit={onStartEdit}
              onCancelEdit={onCancelEdit}
              onEditFormChange={onEditFormChange}
              onEditProcessedUrlChange={onEditProcessedUrlChange}
              onEditSubmit={onEditSubmit}
              onMarkVerified={onMarkVerified}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}

      {viewMode === "by-brand" && (
        <div className="mt-4 space-y-3">
          {filteredGroups.map((group) => (
            <BrandGroup
              key={group.name}
              brandName={group.name}
              products={group.products}
              brands={brands}
              categories={categories}
              password={password}
              editingId={editingId}
              editForm={editForm}
              editProcessedUrl={editProcessedUrl}
              editSubmitting={editSubmitting}
              editError={editError}
              editSummary={editSummary}
              onStartEdit={onStartEdit}
              onCancelEdit={onCancelEdit}
              onEditFormChange={onEditFormChange}
              onEditProcessedUrlChange={onEditProcessedUrlChange}
              onEditSubmit={onEditSubmit}
              onMarkVerified={onMarkVerified}
              onDelete={onDelete}
            />
          ))}
          {filteredGroups.length === 0 && !loading && (
            <p className="text-sm text-dark/50">No brands match that filter.</p>
          )}
        </div>
      )}
    </section>
  );
}

// ─── Images bulk tab ──────────────────────────────────────────────────────────
// Consolidates the old /admin/images page inline here.

type ImagesTabProduct = {
  id: string;
  name: string;
  brand: string | null;
  barcode: string | null;
  image_url: string | null;
  processed_image_url: string | null;
};

type ImagesTab2 = "missing" | "all" | "needs_bg";

function ImagesTab({ password }: { password: string }) {
  const [tab, setTab] = useState<ImagesTab2>("missing");
  const [products, setProducts] = useState<ImagesTabProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{ totalProducts: number; missingImages: number; hasImages: number } | null>(null);
  const [search, setSearch] = useState("");
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchLog, setBatchLog] = useState<string[]>([]);
  const [savedCount, setSavedCount] = useState(0);

  async function loadData(mode: ImagesTab2) {
    setLoading(true);
    try {
      const [statsRes, productsRes] = await Promise.all([
        fetch("/api/admin/images", { headers: { "x-admin-password": password } }),
        fetch(`/api/admin/images/missing?mode=${mode === "all" ? "all" : "missing"}`, { headers: { "x-admin-password": password } }),
      ]);
      const statsData = await statsRes.json();
      const productsData = await productsRes.json();
      if (!statsData.error) setStats(statsData);
      if (productsData.products) setProducts(productsData.products as ImagesTabProduct[]);
    } catch { /* ignore */ }
    setLoading(false);
  }

  useEffect(() => { loadData(tab); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSaved(id: string, newUrl: string) {
    setSavedCount((n) => n + 1);
    setStats((s) => s ? { ...s, missingImages: Math.max(0, s.missingImages - 1), hasImages: s.hasImages + 1 } : s);
    setProducts((ps) => ps.map((p) => p.id === id ? { ...p, image_url: newUrl } : p));
  }

  async function handleBatchBgRemove() {
    setBatchRunning(true);
    setBatchLog(["Starting batch BG removal..."]);
    try {
      const res = await fetch("/api/admin/product-photos/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": password },
        body: JSON.stringify({}),
      });
      if (!res.body) { setBatchLog(["No response body."]); setBatchRunning(false); return; }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (data.product_name) {
              setBatchLog((prev) => [...prev, `${data.ok ? "✓" : "✗"} ${data.product_name}`]);
            } else if (data.done) {
              setBatchLog((prev) => [...prev, `Done. ${data.processed}/${data.total} processed.`]);
            }
          } catch { /* skip */ }
        }
      }
    } catch (e) {
      setBatchLog((prev) => [...prev, `Error: ${e instanceof Error ? e.message : "Unknown"}`]);
    }
    setBatchRunning(false);
    loadData(tab);
  }

  const needsBg = products.filter((p) => p.image_url && !p.processed_image_url);
  const filtered = products.filter((p) => {
    if (tab === "missing" && p.image_url) return false;
    if (tab === "needs_bg" && !(p.image_url && !p.processed_image_url)) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.brand ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="mt-8">
      {/* Stats */}
      {stats && (
        <div className="mb-6 flex flex-wrap gap-6 border-b border-dark/10 pb-5">
          <div>
            <p className="font-mono text-[22px] font-bold text-dark">{Math.max(0, stats.missingImages - savedCount)}</p>
            <p className="font-sans text-[11px] text-dark/50">missing image</p>
          </div>
          <div>
            <p className="font-mono text-[22px] font-bold text-dark">{stats.hasImages + savedCount}</p>
            <p className="font-sans text-[11px] text-dark/50">have image</p>
          </div>
          <div>
            <p className="font-mono text-[22px] font-bold text-dark">{needsBg.length}</p>
            <p className="font-sans text-[11px] text-dark/50">need BG removal</p>
          </div>
          <div>
            <p className="font-mono text-[22px] font-bold text-dark">{stats.totalProducts}</p>
            <p className="font-sans text-[11px] text-dark/50">total</p>
          </div>
        </div>
      )}

      {/* Sub-tabs */}
      <div className="mb-4 flex gap-0 border-b border-dark/10">
        {([["missing", "Missing images"], ["needs_bg", "Need BG removal"], ["all", "All products"]] as [ImagesTab2, string][]).map(([t, label]) => (
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

      {/* Batch BG remove */}
      {tab === "needs_bg" && (
        <div className="mb-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleBatchBgRemove}
            disabled={batchRunning || needsBg.length === 0}
            className="self-start rounded-lg bg-dark px-4 py-2 font-sans text-sm font-semibold text-cream disabled:opacity-40"
          >
            {batchRunning ? "Processing…" : `Remove BG for all ${needsBg.length} products`}
          </button>
          {batchLog.length > 0 && (
            <div className="max-h-40 overflow-y-auto rounded border border-dark/10 bg-dark/5 p-3">
              {batchLog.map((line, i) => (
                <p key={i} className="font-mono text-[11px] text-dark/70">{line}</p>
              ))}
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
        </div>
      )}

      {loading && <p className="font-mono text-[11px] text-dark/40">Loading…</p>}

      {!loading && products.length === 0 && (
        <p className="font-sans text-sm text-dark/50">
          {tab === "missing" ? "All products have images." : tab === "needs_bg" ? "All products with images have BG removed." : "No products found."}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {filtered.map((p) => (
          <ImagesBulkCard
            key={p.id}
            product={p}
            password={password}
            onSaved={handleSaved}
          />
        ))}
      </div>
    </div>
  );
}

function ImagesBulkCard({
  product,
  password,
  onSaved,
}: {
  product: ImagesTabProduct;
  password: string;
  onSaved: (id: string, newUrl: string) => void;
}) {
  const [editing, setEditing] = useState(!product.image_url);
  const [url, setUrl] = useState(product.image_url ?? "");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [previewError, setPreviewError] = useState(false);
  const [searching, setSearching] = useState(false);
  const [candidates, setCandidates] = useState<{ image_url: string; source: string }[]>([]);

  const hasImage = !!product.image_url;
  const displayUrl = product.processed_image_url ?? product.image_url ?? url;
  const isValidUrl = url.trim().startsWith("https://");

  async function save(newUrl: string) {
    setSaveStatus("saving");
    const res = await fetch("/api/admin/images", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify({ product_id: product.id, image_url: newUrl }),
    });
    if (res.ok) {
      setSaveStatus("saved");
      setEditing(false);
      onSaved(product.id, newUrl);
      setTimeout(() => setSaveStatus("idle"), 2000);
    } else {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 2000);
    }
  }

  async function autoFind() {
    setSearching(true);
    setCandidates([]);
    try {
      const res = await fetch("/api/admin/images/find", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": password },
        body: JSON.stringify({ name: product.name, barcode: product.barcode }),
      });
      const data = await res.json();
      setCandidates(data.candidates ?? []);
    } catch { /* ignore */ }
    setSearching(false);
  }

  return (
    <div className="border border-dark/10 bg-white p-3">
      <div className="flex gap-3">
        {/* Image preview */}
        <div className="relative flex h-16 w-16 flex-shrink-0 items-center justify-center border border-dark/10 bg-cream">
          {displayUrl && !previewError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={displayUrl} alt={product.name} className="h-full w-full object-contain" onError={() => setPreviewError(true)} />
          ) : (
            <span className="font-mono text-[9px] text-dark/20">no img</span>
          )}
          {product.processed_image_url && (
            <span className="absolute bottom-0.5 right-0.5 rounded bg-green/80 px-0.5 font-mono text-[7px] text-white">BG</span>
          )}
        </div>

        {/* Product info + controls */}
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
                onKeyDown={(e) => { if (e.key === "Enter") save(url.trim()); if (e.key === "Escape" && hasImage) setEditing(false); }}
                className="min-w-0 flex-1 rounded-none border border-dark/20 bg-transparent px-2.5 py-1.5 font-mono text-[11px] text-dark placeholder:text-dark/30 focus:border-dark focus:outline-none"
              />
              <button
                type="button"
                onClick={() => save(url.trim())}
                disabled={!isValidUrl || saveStatus === "saving"}
                className="flex-shrink-0 bg-dark px-3 py-1.5 font-sans text-[11px] font-semibold text-cream disabled:opacity-30"
              >
                {saveStatus === "saving" ? "…" : saveStatus === "error" ? "err" : saveStatus === "saved" ? "✓" : "Save"}
              </button>
              {hasImage && (
                <button type="button" onClick={() => setEditing(false)} className="flex-shrink-0 border border-dark/20 px-2.5 py-1.5 font-sans text-[11px] text-dark/50">
                  Cancel
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="min-w-0 flex-1 truncate font-mono text-[10px] text-dark/30">{product.image_url}</p>
              <button type="button" onClick={() => setEditing(true)} className="flex-shrink-0 border border-dark/20 px-2.5 py-1 font-sans text-[11px] text-dark/60 hover:text-dark">
                Edit
              </button>
            </div>
          )}

          <div className="mt-1.5 flex gap-2">
            <button
              type="button"
              onClick={autoFind}
              disabled={searching}
              className="font-sans text-[11px] text-bronze2 underline underline-offset-2 hover:text-dark disabled:opacity-50"
            >
              {searching ? "Searching…" : "Auto-find image"}
            </button>
          </div>
        </div>
      </div>

      {/* Candidates */}
      {candidates.length > 0 && (
        <div className="mt-3 border-t border-dark/10 pt-3">
          <div className="flex flex-wrap gap-2">
            {candidates.map((c, i) => (
              <button
                key={i}
                type="button"
                onClick={() => { setUrl(c.image_url); save(c.image_url); setCandidates([]); }}
                className="group relative h-14 w-14 overflow-hidden border border-dark/10 bg-cream hover:border-bronze"
                title={c.source}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.image_url} alt="" className="h-full w-full object-contain" />
                <span className="absolute inset-0 flex items-center justify-center bg-dark/60 opacity-0 group-hover:opacity-100">
                  <span className="font-sans text-[9px] font-bold text-white">Use</span>
                </span>
              </button>
            ))}
            <button type="button" onClick={() => setCandidates([])} className="self-center font-sans text-[11px] text-dark/40 hover:text-dark">Dismiss</button>
          </div>
        </div>
      )}
      {candidates.length === 0 && searching === false && url === (product.image_url ?? "") && !hasImage && (
        null // quiet
      )}
    </div>
  );
}

export default function AdminProductsPage() {
  const [activeTab, setActiveTab] = useState<"products" | "coverage" | "brands" | "images">("products");
  const [password, setPassword] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [checkingStoredAuth, setCheckingStoredAuth] = useState(true);

  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(false);

  const [addForm, setAddForm] = useState<ProductFormValues>(EMPTY_FORM);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSummary, setAddSummary] = useState<MatchSummary | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ProductFormValues>(EMPTY_FORM);
  const [editProcessedUrl, setEditProcessedUrl] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSummary, setEditSummary] = useState<MatchSummary | null>(null);

  async function loadProducts(pw: string): Promise<boolean> {
    setLoading(true);
    setAuthError(null);

    const res = await fetch("/api/admin/products", {
      headers: { "x-admin-password": pw },
    });

    setLoading(false);

    if (res.status === 401) {
      setAuthError("Incorrect password.");
      return false;
    }
    if (!res.ok) {
      setAuthError("Couldn't load products. Try again.");
      return false;
    }

    const data = await res.json();
    setBrands(data.brands ?? []);
    setCategories(data.categories ?? []);
    setProducts(data.products ?? []);
    return true;
  }

  useEffect(() => {
    const stored = sessionStorage.getItem("admin_password");
    if (!stored) {
      setCheckingStoredAuth(false);
      return;
    }
    loadProducts(stored).then((ok) => {
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
    const ok = await loadProducts(password);
    if (ok) {
      sessionStorage.setItem("admin_password", password);
      setAuthorized(true);
    }
  }

  function toProductPayload(values: ProductFormValues) {
    const isOtherBrand = values.brand_id === OTHER_BRAND_VALUE;
    return {
      name: values.name.trim(),
      brand_id: isOtherBrand ? null : values.brand_id || null,
      new_brand_name: isOtherBrand ? values.custom_brand_name.trim() : null,
      category_id: values.category_id || null,
      barcode: values.barcode.trim() || null,
      size: values.size.trim() || null,
      image_url: values.image_url.trim() || null,
      ingredient_list_raw: values.ingredient_list_raw.trim() || null,
    };
  }

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();

    const brandError = getBrandValidationError(addForm);
    if (brandError) {
      setAddError(brandError);
      return;
    }

    setAddSubmitting(true);
    setAddError(null);
    setAddSummary(null);

    const res = await fetch("/api/admin/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-password": password,
      },
      body: JSON.stringify(toProductPayload(addForm)),
    });

    const data = await res.json();
    setAddSubmitting(false);

    if (!res.ok) {
      setAddError(data.error ?? "Failed to add product.");
      return;
    }

    setProducts((prev) => [
      { ...data.product, brand_name: null, category_name: null, match_rate: null },
      ...prev,
    ]);
    setAddSummary({
      totalCount: data.totalCount ?? 0,
      matchedCount: data.matchedCount ?? 0,
      createdCount: data.createdCount ?? 0,
      createdNames: data.createdNames ?? [],
    });
    setAddForm(EMPTY_FORM);
    // Brand/category names on the new row aren't returned by POST -
    // refresh from the list endpoint so they render correctly.
    loadProducts(password);
  }

  function startEdit(product: AdminProduct) {
    setEditingId(product.id);
    setEditError(null);
    setEditSummary(null);
    setEditProcessedUrl(product.processed_image_url ?? null);
    setEditForm({
      name: product.name,
      brand_id: product.brand_id ?? "",
      custom_brand_name: "",
      category_id: product.category_id ?? "",
      barcode: product.barcode ?? "",
      size: product.size ?? "",
      image_url: product.image_url ?? "",
      ingredient_list_raw: product.ingredient_list_raw ?? "",
    });
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;

    const brandError = getBrandValidationError(editForm);
    if (brandError) {
      setEditError(brandError);
      return;
    }

    setEditSubmitting(true);
    setEditError(null);
    setEditSummary(null);

    const res = await fetch(`/api/admin/products/${editingId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-admin-password": password,
      },
      body: JSON.stringify(toProductPayload(editForm)),
    });

    const data = await res.json();
    setEditSubmitting(false);

    if (!res.ok) {
      setEditError(data.error ?? "Failed to update product.");
      return;
    }

    setEditSummary({
      totalCount: data.totalCount ?? 0,
      matchedCount: data.matchedCount ?? 0,
      createdCount: data.createdCount ?? 0,
      createdNames: data.createdNames ?? [],
    });
    // Stay open (rather than collapsing back to view mode) so the match
    // summary below the form is visible - same pattern as Add.
    loadProducts(password);
  }

  async function markVerified(productId: string, e: React.MouseEvent) {
    e.stopPropagation();
    await fetch(`/api/admin/products/${productId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-admin-password": password,
      },
      body: JSON.stringify({ is_verified: true }),
    });
    loadProducts(password);
  }

  async function handleDelete(productId: string) {
    await fetch(`/api/admin/products/${productId}`, {
      method: "DELETE",
      headers: { "x-admin-password": password },
    });
    setEditingId(null);
    setProducts((prev) => prev.filter((p) => p.id !== productId));
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
        <form
          onSubmit={handleUnlock}
          className="w-full max-w-sm rounded-xl border border-bronze/30 p-6"
        >
          <h1 className="font-serif text-2xl font-semibold text-dark">
            Admin access
          </h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin password"
            required
            className={`mt-4 ${INPUT_CLASS}`}
          />
          {authError && (
            <p className="mt-2 text-sm text-red">{authError}</p>
          )}
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
      <div className="mx-auto max-w-2xl">
        <h1 className="font-serif text-3xl font-semibold text-dark sm:text-4xl">
          Manage products
        </h1>

        <div className="mt-6 flex gap-6 border-b border-bronze/20">
          {(["products", "images", "coverage", "brands"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`pb-3 font-sans text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? "border-b-2 border-bronze text-dark"
                  : "text-dark/50 hover:text-dark/80"
              }`}
            >
              {tab === "products" ? "Products" : tab === "images" ? "Images" : tab === "coverage" ? "Coverage" : "Brands"}
            </button>
          ))}
        </div>

        {activeTab === "coverage" && <CoverageTab password={password} />}

        {activeTab === "brands" && <BrandsTab password={password} />}

        {activeTab === "images" && <ImagesTab password={password} />}

        {activeTab === "products" && (
        <>
        <section className="mt-8 rounded-xl border border-bronze/30 p-6">
          <h2 className="font-serif text-xl font-semibold text-dark">
            Add a product
          </h2>
          <div className="mt-4">
            <ProductForm
              values={addForm}
              brands={brands}
              categories={categories}
              submitting={addSubmitting}
              submitLabel="Add product"
              password={password}
              productId={null}
              processedImageUrl={null}
              onChange={setAddForm}
              onSubmit={handleAddSubmit}
            />
          </div>
          {addError && <p className="mt-3 text-sm text-red">{addError}</p>}
          {addSummary && (
            <MatchSummaryBox title="Product added." summary={addSummary} />
          )}
        </section>

        <ProductListSection
          products={products}
          brands={brands}
          categories={categories}
          loading={loading}
          password={password}
          editingId={editingId}
          editForm={editForm}
          editProcessedUrl={editProcessedUrl}
          editSubmitting={editSubmitting}
          editError={editError}
          editSummary={editSummary}
          onStartEdit={startEdit}
          onCancelEdit={() => setEditingId(null)}
          onEditFormChange={setEditForm}
          onEditProcessedUrlChange={setEditProcessedUrl}
          onEditSubmit={handleEditSubmit}
          onMarkVerified={markVerified}
          onDelete={handleDelete}
        />
        </>
        )}
      </div>
    </main>
  );
}
