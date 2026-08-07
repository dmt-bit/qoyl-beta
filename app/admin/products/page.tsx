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
};

type ProductFormValues = {
  name: string;
  brand_id: string;
  category_id: string;
  barcode: string;
  size: string;
  image_url: string;
  ingredient_list_raw: string;
};

const EMPTY_FORM: ProductFormValues = {
  name: "",
  brand_id: "",
  category_id: "",
  barcode: "",
  size: "",
  image_url: "",
  ingredient_list_raw: "",
};

const INPUT_CLASS =
  "w-full rounded-lg border border-bronze/40 bg-transparent px-4 py-3 text-sm text-cream placeholder:text-cream/40 focus:border-bronze focus:outline-none";

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
        <select
          value={values.brand_id}
          onChange={(e) => onChange({ ...values, brand_id: e.target.value })}
          className={INPUT_CLASS}
        >
          <option value="" className="text-dark">
            Select brand
          </option>
          {brands.map((b) => (
            <option key={b.id} value={b.id} className="text-dark">
              {b.name}
            </option>
          ))}
        </select>

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
  const [addUnmatched, setAddUnmatched] = useState<string[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ProductFormValues>(EMPTY_FORM);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editUnmatched, setEditUnmatched] = useState<string[]>([]);

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
    return {
      name: values.name.trim(),
      brand_id: values.brand_id || null,
      category_id: values.category_id || null,
      barcode: values.barcode.trim() || null,
      size: values.size.trim() || null,
      image_url: values.image_url.trim() || null,
      ingredient_list_raw: values.ingredient_list_raw.trim() || null,
    };
  }

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAddSubmitting(true);
    setAddError(null);
    setAddUnmatched([]);

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
    setAddUnmatched(data.unmatched ?? []);
    setAddForm(EMPTY_FORM);
    // Brand/category names on the new row aren't returned by POST --
    // refresh from the list endpoint so they render correctly.
    loadProducts(password);
  }

  function startEdit(product: AdminProduct) {
    setEditingId(product.id);
    setEditError(null);
    setEditUnmatched([]);
    setEditForm({
      name: product.name,
      brand_id: product.brand_id ?? "",
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

    setEditSubmitting(true);
    setEditError(null);
    setEditUnmatched([]);

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

    setEditUnmatched(data.unmatched ?? []);
    setEditingId(null);
    loadProducts(password);
  }

  async function markVerified(productId: string) {
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
          {addUnmatched.length > 0 && (
            <div className="mt-4 rounded-lg border border-amber/40 bg-amber/10 p-3">
              <p className="text-xs font-medium text-amber">
                These ingredients didn&apos;t match anything in the
                ingredients table and need to be added:
              </p>
              <p className="mt-1 text-xs text-cream/70">
                {addUnmatched.join(", ")}
              </p>
            </div>
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
            {products.map((product) => (
              <li
                key={product.id}
                className="rounded-lg border border-bronze/30 p-4"
              >
                {editingId === product.id ? (
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
                    {editUnmatched.length > 0 && (
                      <div className="mt-4 rounded-lg border border-amber/40 bg-amber/10 p-3">
                        <p className="text-xs font-medium text-amber">
                          These ingredients didn&apos;t match anything and
                          need to be added:
                        </p>
                        <p className="mt-1 text-xs text-cream/70">
                          {editUnmatched.join(", ")}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-start justify-between gap-4">
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
                        Match rate:{" "}
                        {product.match_rate === null
                          ? "—"
                          : `${product.match_rate}%`}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(product)}
                        className="text-xs text-cream/70 underline underline-offset-2 hover:text-cream"
                      >
                        Edit
                      </button>
                      {!product.is_verified && (
                        <button
                          type="button"
                          onClick={() => markVerified(product.id)}
                          className="text-xs text-bronze2 underline underline-offset-2 hover:text-cream"
                        >
                          Mark verified
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
