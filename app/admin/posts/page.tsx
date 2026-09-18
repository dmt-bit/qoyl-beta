"use client";

import { useEffect, useState } from "react";

type AdminPost = {
  slug: string;
  title: string;
  category: string;
  hero_image_url: string | null;
  hair_type: string | null;
  published_at: string;
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

const INPUT_CLASS =
  "w-full border border-dark bg-white px-4 py-3 font-sans text-sm text-dark placeholder:text-dark/40 focus:outline-none";

function toggleInArray(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function SaveToVisualLibraryModal({
  post,
  password,
  onClose,
  onSaved,
}: {
  post: AdminPost;
  password: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [hairTypes, setHairTypes] = useState<string[]>(post.hair_type ? [post.hair_type] : []);
  const [categories, setCategories] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/admin/visual-library", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify({
        image_url: post.hero_image_url,
        alt_text: post.title,
        hair_types: hairTypes,
        categories,
        mood: null,
        card_types: ["post"],
      }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to save.");
      return;
    }

    onSaved();
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-sm border border-dark bg-white p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-sans font-bold lowercase text-dark" style={{ fontSize: "16px" }}>
          save to visual library
        </h2>
        <div className="relative mt-3 aspect-square w-full overflow-hidden bg-[#f5f5f5]">
          {post.hero_image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.hero_image_url} alt={post.title} className="absolute inset-0 h-full w-full object-cover" />
          )}
        </div>

        <div className="mt-4">
          <p className="font-sans font-bold lowercase text-dark" style={{ fontSize: "12px" }}>
            hair types
          </p>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-2">
            {HAIR_TYPE_OPTIONS.map((opt) => (
              <label key={opt} className="flex items-center gap-1.5 font-mono lowercase text-dark" style={{ fontSize: "11px" }}>
                <input
                  type="checkbox"
                  checked={hairTypes.includes(opt)}
                  onChange={() => setHairTypes(toggleInArray(hairTypes, opt))}
                  className="accent-dark"
                />
                {opt}
              </label>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <p className="font-sans font-bold lowercase text-dark" style={{ fontSize: "12px" }}>
            categories
          </p>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-2">
            {CATEGORY_OPTIONS.map((opt) => (
              <label key={opt} className="flex items-center gap-1.5 font-mono lowercase text-dark" style={{ fontSize: "11px" }}>
                <input
                  type="checkbox"
                  checked={categories.includes(opt)}
                  onChange={() => setCategories(toggleInArray(categories, opt))}
                  className="accent-dark"
                />
                {opt}
              </label>
            ))}
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red">{error}</p>}

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={submitting}
            className="flex-1 bg-dark py-3 text-sm font-bold lowercase text-white transition-colors hover:bg-[#444444] disabled:opacity-50"
          >
            {submitting ? "saving..." : "save"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="border border-dark px-4 py-3 text-sm font-bold lowercase text-dark"
          >
            cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPostsPage() {
  const [password, setPassword] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [checkingStoredAuth, setCheckingStoredAuth] = useState(true);

  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingPost, setSavingPost] = useState<AdminPost | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  async function loadPosts(pw: string): Promise<boolean> {
    setLoading(true);
    setAuthError(null);

    const res = await fetch("/api/admin/posts", {
      headers: { "x-admin-password": pw },
    });

    setLoading(false);

    if (res.status === 401) {
      setAuthError("Incorrect password.");
      return false;
    }
    if (!res.ok) {
      setAuthError("Couldn't load posts. Try again.");
      return false;
    }

    const data = await res.json();
    setPosts(data.posts ?? []);
    return true;
  }

  useEffect(() => {
    const stored = sessionStorage.getItem("admin_password");
    if (!stored) {
      setCheckingStoredAuth(false);
      return;
    }
    loadPosts(stored).then((ok) => {
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
    const ok = await loadPosts(password);
    if (ok) {
      sessionStorage.setItem("admin_password", password);
      setAuthorized(true);
    }
  }

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 2200);
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

  return (
    <main className="min-h-screen bg-white px-4 py-10 font-sans text-dark sm:px-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-sans font-bold lowercase text-dark" style={{ fontSize: "28px" }}>
          posts
        </h1>
        <p className="mt-1 font-mono lowercase text-muted" style={{ fontSize: "10px" }}>
          {posts.length} posts
        </p>
        <p className="mt-3 text-sm text-dark/60">
          Posts are added via SQL, same as before - this is a read-only list. Use the shortcut below
          to add a post&apos;s hero image to the visual library.
        </p>

        {loading && <p className="mt-4 text-sm text-dark/50">Loading...</p>}

        <ul className="mt-6 divide-y divide-dark border-y border-dark">
          {posts.map((post) => (
            <li key={post.slug} className="flex items-center gap-4 py-4">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden bg-[#f5f5f5]">
                {post.hero_image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={post.hero_image_url} alt={post.title} className="absolute inset-0 h-full w-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-sans font-medium text-dark">{post.title}</p>
                <p className="font-mono lowercase text-muted" style={{ fontSize: "10px" }}>
                  {post.category} · {formatDate(post.published_at)}
                </p>
              </div>
              {post.hero_image_url && (
                <button
                  type="button"
                  onClick={() => setSavingPost(post)}
                  className="shrink-0 border border-dark px-3 py-1.5 font-mono lowercase text-dark"
                  style={{ fontSize: "10px" }}
                >
                  + save to visual library
                </button>
              )}
            </li>
          ))}
        </ul>

        {!loading && posts.length === 0 && <p className="mt-4 text-sm text-dark/50">No posts yet.</p>}
      </div>

      {savingPost && (
        <SaveToVisualLibraryModal
          post={savingPost}
          password={password}
          onClose={() => setSavingPost(null)}
          onSaved={() => {
            setSavingPost(null);
            showToast("Saved to visual library");
          }}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[210] -translate-x-1/2 bg-dark px-4 py-2 text-sm text-white">
          {toast}
        </div>
      )}
    </main>
  );
}
