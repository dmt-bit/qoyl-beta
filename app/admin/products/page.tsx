"use client";

import { useEffect, useState } from "react";
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

function ProductForm({
  values,
  brands,
  categories,
  submitting,
  submitLabel,
  password,
  onChange,
  onSubmit,
  onCancel,
}: {
  values: ProductFormValues;
  brands: Brand[];
  categories: Category[];
  submitting: boolean;
  submitLabel: string;
  password: string;
  onChange: (values: ProductFormValues) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel?: () => void;
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

      <input
        type="text"
        value={values.image_url}
        onChange={(e) => onChange({ ...values, image_url: e.target.value })}
        placeholder="Image URL"
        className={INPUT_CLASS}
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

export default function AdminProductsPage() {
  const [activeTab, setActiveTab] = useState<"products" | "coverage">("products");
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
          {(["products", "coverage"] as const).map((tab) => (
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
              {tab === "products" ? "Products" : "Coverage"}
            </button>
          ))}
        </div>

        {activeTab === "coverage" && <CoverageTab password={password} />}

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
              onChange={setAddForm}
              onSubmit={handleAddSubmit}
            />
          </div>
          {addError && <p className="mt-3 text-sm text-red">{addError}</p>}
          {addSummary && (
            <MatchSummaryBox title="Product added." summary={addSummary} />
          )}
        </section>

        <section className="mt-8">
          <h2 className="font-serif text-xl font-semibold text-dark">
            All products ({products.length})
          </h2>

          {loading && (
            <p className="mt-4 text-sm text-dark/50">Loading...</p>
          )}

          <ul className="mt-4 space-y-3">
            {products.map((product) => {
              const isEditing = editingId === product.id;
              const ingredientCount = product.ingredient_list_normalized?.length ?? 0;

              return (
                <li
                  key={product.id}
                  className="rounded-lg border border-bronze/30 p-4"
                >
                  {isEditing ? (
                    <>
                      <ProductForm
                        values={editForm}
                        brands={brands}
                        categories={categories}
                        submitting={editSubmitting}
                        submitLabel="Save changes"
                        password={password}
                        onChange={setEditForm}
                        onSubmit={handleEditSubmit}
                        onCancel={() => setEditingId(null)}
                      />
                      {editError && (
                        <p className="mt-3 text-sm text-red">{editError}</p>
                      )}
                      {editSummary && (
                        <MatchSummaryBox
                          title="Product updated."
                          summary={editSummary}
                        />
                      )}
                    </>
                  ) : (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => startEdit(product)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          startEdit(product);
                        }
                      }}
                      className="flex cursor-pointer items-start justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-serif text-base text-dark">
                            {product.name}
                          </p>
                          {product.is_verified && (
                            <span className="inline-block rounded-full border border-bronze/40 px-2 py-0.5 text-[10px] font-medium text-bronze2">
                              Verified
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-bronze2">
                          {product.brand_name ?? "No brand"}
                          {product.category_name
                            ? ` · ${product.category_name}`
                            : ""}
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
                        {!product.is_verified && (
                          <button
                            type="button"
                            onClick={(e) => markVerified(product.id, e)}
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
            })}
          </ul>
        </section>
        </>
        )}
      </div>
    </main>
  );
}
