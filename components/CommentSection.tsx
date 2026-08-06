"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

export type PostComment = {
  id: string;
  display_name: string;
  body: string;
  created_at: string;
};

function timeAgo(isoDate: string): string {
  const seconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000)
  );

  const units: [string, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];

  for (const [label, secondsPerUnit] of units) {
    const value = Math.floor(seconds / secondsPerUnit);
    if (value >= 1) return `${value} ${label}${value === 1 ? "" : "s"} ago`;
  }

  return "just now";
}

export default function CommentSection({
  postSlug,
  postTitle,
  initialComments,
}: {
  postSlug: string;
  postTitle: string;
  initialComments: PostComment[];
}) {
  const { user, hairProfile } = useAuth();
  const [comments, setComments] = useState(initialComments);
  const [name, setName] = useState(
    hairProfile
      ? [hairProfile.first_name, hairProfile.last_name].filter(Boolean).join(" ")
      : ""
  );
  const [email, setEmail] = useState(hairProfile?.email ?? user?.email ?? "");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim()) {
      setError("Name and email are required.");
      return;
    }
    if (body.trim().length < 10) {
      setError("Comment must be at least 10 characters.");
      return;
    }

    setSubmitting(true);

    const { data, error: insertError } = await supabase
      .from("post_comments")
      .insert({
        post_slug: postSlug,
        user_id: user?.id ?? null,
        display_name: name.trim(),
        email: email.trim(),
        body: body.trim(),
      })
      .select("id, display_name, body, created_at")
      .single();

    setSubmitting(false);

    if (insertError || !data) {
      setError("Couldn't post your comment. Please try again.");
      return;
    }

    setComments((prev) => [...prev, data]);
    setBody("");
    setSubmitted(true);

    // Fire-and-forget -- never shown to the user, never blocks the UI.
    fetch("/api/notify/new-comment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        post_title: postTitle,
        post_slug: postSlug,
        display_name: data.display_name,
        email: email.trim(),
        comment_body: data.body,
      }),
    }).catch(() => {});
  }

  return (
    <section className="mt-12 border-t border-bronze/20 pt-8">
      <h2 className="font-serif text-2xl font-semibold text-cream">
        Join the conversation
      </h2>

      {comments.length > 0 && (
        <div className="mt-6 space-y-5">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="rounded-lg border border-bronze/20 bg-warm/[0.03] p-4"
            >
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-semibold text-cream">
                  {comment.display_name}
                </p>
                <p className="text-xs text-cream/40">
                  {timeAgo(comment.created_at)}
                </p>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-cream/80">
                {comment.body}
              </p>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            required
            className="w-full rounded-lg border border-bronze/40 bg-transparent px-4 py-3 text-sm text-cream placeholder:text-cream/40 focus:border-bronze focus:outline-none"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email (not displayed publicly)"
            required
            className="w-full rounded-lg border border-bronze/40 bg-transparent px-4 py-3 text-sm text-cream placeholder:text-cream/40 focus:border-bronze focus:outline-none"
          />
        </div>

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Share your thoughts..."
          rows={4}
          required
          minLength={10}
          className="w-full rounded-lg border border-bronze/40 bg-transparent px-4 py-3 text-sm text-cream placeholder:text-cream/40 focus:border-bronze focus:outline-none"
        />

        {error && <p className="text-sm text-red">{error}</p>}
        {submitted && (
          <p className="text-sm text-bronze2">Your comment was posted</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-bronze px-6 py-3 text-sm font-semibold text-dark transition-colors hover:bg-bronze2 disabled:opacity-50"
        >
          {submitting ? "Posting..." : "Post comment →"}
        </button>
      </form>
    </section>
  );
}
