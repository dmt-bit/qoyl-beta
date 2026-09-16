"use client";

import { useEffect, useState } from "react";

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

const HAIR_TYPE_OPTIONS = [
  "all",
  "1a", "1b", "1c",
  "2a", "2b", "2c",
  "3a", "3b", "3c",
  "4a", "4b", "4c",
  "extensions", "mens", "baby",
];

const CATEGORY_OPTIONS = ["ingredients", "product", "lifestyle", "texture", "style", "scalp", "routine"];

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

export default function AdminVisualsPage() {
  const [password, setPassword] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [checkingStoredAuth, setCheckingStoredAuth] = useState(true);

  const [images, setImages] = useState<VisualImage[]>([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState<AddFormValues>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  async function loadImages(pw: string): Promise<boolean> {
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
  }

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
    // Only ever runs once on mount to check for a stored session.
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

  async function handleDelete(image: VisualImage) {
    if (!window.confirm("Delete this image from the visual library? This can't be undone.")) return;
    setImages((prev) => prev.filter((i) => i.id !== image.id));
    await fetch(`/api/admin/visual-library/${image.id}`, {
      method: "DELETE",
      headers: { "x-admin-password": password },
    });
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

  const activeCount = images.filter((i) => i.is_active).length;

  return (
    <main className="min-h-screen bg-white px-4 py-10 font-sans text-dark sm:px-6">
      <div className="mx-auto max-w-4xl">
        <h1 className="font-sans font-bold lowercase text-dark" style={{ fontSize: "28px" }}>
          visual library
        </h1>
        <p className="mt-1 font-mono lowercase text-muted" style={{ fontSize: "10px" }}>
          {images.length} images · {activeCount} active
        </p>

        <section className="mt-8 border border-dark p-6">
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

                <div className="mt-2 flex flex-wrap gap-1">
                  {image.hair_types.map((t) => (
                    <span key={t} className="border border-dark px-1.5 py-0.5 font-mono lowercase text-dark" style={{ fontSize: "9px" }}>
                      {t}
                    </span>
                  ))}
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {image.categories.map((c) => (
                    <span key={c} className="bg-[#f5f5f5] px-1.5 py-0.5 font-mono lowercase text-muted" style={{ fontSize: "9px" }}>
                      {c}
                    </span>
                  ))}
                </div>

                <p className="mt-2 font-mono lowercase text-muted" style={{ fontSize: "9px" }}>
                  used {image.used_count} time{image.used_count === 1 ? "" : "s"}
                </p>

                <div className="mt-3 flex items-center justify-between gap-2">
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
    </main>
  );
}
