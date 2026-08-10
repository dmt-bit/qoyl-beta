"use client";

import { useEffect, useState } from "react";

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

const OTHER_BRAND_VALUE = "__other__";

// Blank means "no brand selected," which is allowed -- only "Other" with
// nothing typed is a real validation error.
function getBrandValidationError(values: ProductFormValues): string | null {
  if (values.brand_id === OTHER_BRAND_VALUE && !values.custom_brand_name.trim()) {
    return "Please enter a brand name.";
  }
  return null;
}

const INPUT_CLASS =
  "w-full rounded-lg border border-bronze/40 bg-transparent px-4 py-3 text-sm text-cream placeholder:text-cream/40 focus:border-bronze focus:outline-none";

function MatchSummaryBox({
  title,
  summary,
}: {
  title: string;
  summary: MatchSummary;
}) {
  return (
    <div className="mt-4 rounded-lg border border-bronze/30 bg-bronze/5 p-3">
      <p className="text-xs font-medium text-cream/80">
        {title} {summary.matchedCount} of {summary.totalCount} ingredients
        matched. {summary.createdCount} new ingredient
        {summary.createdCount === 1 ? "" : "s"} created.
      </p>
      {summary.createdNames.length > 0 && (
        <>
          <p className="mt-2 text-xs font-medium text-amber">
            Review these newly-created ingredients:
          </p>
          <p className="mt-1 text-xs text-cream/70">
            {summary.createdNames.join(", ")}
          </p>
        </>
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
  onChange,
  onSubmit,
  onCancel,
}: {
  values: ProductFormValues;
  brands: Brand[];
  categories: Category[];
  submitting: boolean;
  submitLabel: string;
  onChange: (values: ProductFormValues) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel?: () => void;
}) {
  // Re-sort on every render rather than trusting callers/the API to
  // hand back an already-sorted list -- cheap for a brand-count list
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
          {categories.map((c) => (
            <option key={c.id} value={c.id} className="text-dark">
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          type="text"
          value={values.barcode}
          onChange={(e) => onChange({ ...values, barcode: e.target.value })}
          placeholder="Barcode"
          className={INPUT_CLASS}
        />
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
          className="flex-1 rounded-lg bg-bronze py-3 text-sm font-semibold text-dark transition-colors hover:bg-bronze2 disabled:opacity-50"
        >
          {submitting ? "Saving..." : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-bronze/40 px-4 py-3 text-sm font-medium text-cream transition-colors hover:border-bronze"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export default function AdminProductsPage() {
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
    // Brand/category names on the new row aren't returned by POST --
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
    // summary below the form is visible -- same pattern as Add.
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
      <main className="flex min-h-screen items-center justify-center bg-dark font-sans">
        <p className="text-sm text-cream/60">Loading...</p>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-dark px-4 font-sans text-cream">
        <form
          onSubmit={handleUnlock}
          className="w-full max-w-sm rounded-xl border border-bronze/30 p-6"
        >
          <h1 className="font-serif text-2xl font-semibold text-cream">
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
            className="mt-4 w-full rounded-lg bg-bronze py-3 text-sm font-semibold text-dark transition-colors hover:bg-bronze2 disabled:opacity-50"
          >
            {loading ? "Checking..." : "Unlock"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-dark px-4 py-10 font-sans text-cream sm:px-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-serif text-3xl font-semibold text-cream sm:text-4xl">
          Manage products
        </h1>

        <section className="mt-8 rounded-xl border border-bronze/30 p-6">
          <h2 className="font-serif text-xl font-semibold text-cream">
            Add a product
          </h2>
          <div className="mt-4">
            <ProductForm
              values={addForm}
              brands={brands}
              categories={categories}
              submitting={addSubmitting}
              submitLabel="Add product"
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
          <h2 className="font-serif text-xl font-semibold text-cream">
            All products ({products.length})
          </h2>

          {loading && (
            <p className="mt-4 text-sm text-cream/50">Loading...</p>
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
                          <p className="font-serif text-base text-cream">
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
                        <p className="mt-1 text-xs text-cream/50">
                          {ingredientCount} ingredient
                          {ingredientCount === 1 ? "" : "s"} · Match rate:{" "}
                          {product.match_rate === null
                            ? "—"
                            : `${product.match_rate}%`}{" "}
                          · Added {formatDate(product.created_at)}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        {!product.is_verified && (
                          <button
                            type="button"
                            onClick={(e) => markVerified(product.id, e)}
                            className="text-xs text-bronze2 underline underline-offset-2 hover:text-cream"
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
      </div>
    </main>
  );
}
