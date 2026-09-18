"use client";

import { useState } from "react";
import Image from "next/image";
import FeedbackBanner from "@/components/FeedbackBanner";

export type FollowUpCandidate = {
  id: string;
  detected_style: string | null;
  created_at: string;
};

const SNOOZE_DAYS = 7;
const SNOOZE_KEY_PREFIX = "qoyl_style_match_followup_snooze_";

function isSnoozed(matchId: string): boolean {
  if (typeof window === "undefined") return false;
  const raw = window.localStorage.getItem(SNOOZE_KEY_PREFIX + matchId);
  if (!raw) return false;
  const until = Number(raw);
  return Number.isFinite(until) && Date.now() < until;
}

function snooze(matchId: string) {
  const until = Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000;
  window.localStorage.setItem(SNOOZE_KEY_PREFIX + matchId, String(until));
}

function fileToBase64(file: File): Promise<{ base64: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve({ base64: result.split(",")[1] ?? "", mediaType: file.type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

type CardState = "prompt" | "uploading" | "success";

function FollowUpCard({
  match,
  userId,
  onDismiss,
}: {
  match: FollowUpCandidate;
  userId: string;
  onDismiss: () => void;
}) {
  const [state, setState] = useState<CardState>("prompt");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  const [keepPrivate, setKeepPrivate] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedPhotoId, setUploadedPhotoId] = useState<string | null>(null);

  const styleName = match.detected_style || "this style";

  function handleNotYet() {
    snooze(match.id);
    onDismiss();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setPendingPreviewUrl(URL.createObjectURL(file));
    setError(null);
  }

  async function handleSave() {
    if (!pendingFile) return;
    setSaving(true);
    setError(null);
    try {
      const { base64, mediaType } = await fileToBase64(pendingFile);
      const photoRes = await fetch("/api/hair-photos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          image_base64: base64,
          image_media_type: mediaType,
          filename: pendingFile.name,
          caption: `Did the ${styleName}`,
          is_public: !keepPrivate,
        }),
      });
      const photoData = await photoRes.json();
      if (!photoRes.ok || !photoData.photo) {
        setError(photoData.error ?? "Couldn't save photo. Please try again.");
        return;
      }

      const followUpRes = await fetch("/api/style-match/follow-up", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          match_id: match.id,
          user_id: userId,
          hair_photo_id: photoData.photo.id,
        }),
      });
      if (!followUpRes.ok) {
        setError("Couldn't save this. Please try again.");
        return;
      }

      setUploadedPhotoId(photoData.photo.id);
      setState("success");
    } catch {
      setError("Couldn't save photo. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleTogglePublic() {
    if (!uploadedPhotoId) return;
    const nextPublic = keepPrivate;
    setKeepPrivate(!nextPublic);
    await fetch(`/api/hair-photos/${uploadedPhotoId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ user_id: userId, is_public: nextPublic }),
    });
  }

  if (state === "success") {
    return (
      <div className="mt-4 border border-bronze/40 bg-bronze/10 px-4 py-3">
        <p className="text-sm text-dark">
          Added to your hair journey! Share your look with the community →
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={handleTogglePublic}
            className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
              keepPrivate ? "border-bronze/40 text-cream/70" : "border-bronze bg-bronze/20 text-cream"
            }`}
          >
            {keepPrivate ? "Private - tap to share to community" : "Shared to community ✓"}
          </button>
        </div>
      </div>
    );
  }

  if (state === "prompt") {
    return (
      <FeedbackBanner
        question={`did you try ${styleName.toLowerCase()}? let us know how it turned out`}
        yesLabel="yes, I did it"
        noLabel="not yet"
        onYes={() => setState("uploading")}
        onNo={handleNotYet}
        onDismiss={handleNotYet}
      />
    );
  }

  return (
    <div className="mt-4 border border-bronze/40 bg-bronze/10 px-4 py-3">
      <p className="text-sm text-dark">
        Did you try {styleName}? Let us know how it turned out →
      </p>

      {state === "uploading" && (
        <div className="mt-3">
          {pendingPreviewUrl && (
            <div className="relative mx-auto h-32 w-32 overflow-hidden rounded-lg bg-[#f5f5f5]">
              <Image src={pendingPreviewUrl} alt="Selected photo" fill className="object-cover" />
            </div>
          )}

          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="mt-3 block w-full text-xs text-dark/70 file:mr-3 file:rounded-full file:border file:border-bronze/40 file:bg-transparent file:px-3 file:py-1.5 file:text-xs file:text-bronze2"
          />

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setKeepPrivate(true)}
              className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                keepPrivate ? "border-bronze bg-bronze/20 text-cream" : "border-bronze/40 text-cream/70"
              }`}
            >
              Keep private
            </button>
            <button
              type="button"
              onClick={() => setKeepPrivate(false)}
              className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                !keepPrivate ? "border-bronze bg-bronze/20 text-cream" : "border-bronze/40 text-cream/70"
              }`}
            >
              Share to community
            </button>
          </div>

          {error && <p className="mt-2 text-xs text-red">{error}</p>}

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={!pendingFile || saving}
              className="flex-1 bg-bronze py-2 text-xs font-semibold text-cream transition-colors hover:bg-bronze2 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save photo"}
            </button>
            <button
              type="button"
              onClick={() => setState("prompt")}
              disabled={saving}
              className="border border-bronze/40 px-4 py-2 text-xs font-medium text-dark/80"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// No scheduled-job infrastructure exists in this app (see the "OR
// simpler approach" carve-out in the spec this implements), so this
// renders directly on the dashboard for any style match old enough to
// prompt on, rather than sending a 7-day-later email via a cron job.
export default function StyleMatchFollowUp({
  candidates,
  userId,
}: {
  candidates: FollowUpCandidate[];
  userId: string;
}) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Only the single oldest still-eligible candidate renders at a time -
  // the banner (FeedbackBanner, used by FollowUpCard's "prompt" state)
  // must never stack per the redesign spec. Once it's dismissed/snoozed/
  // answered, the next candidate takes its place on the next render.
  const current = candidates.find((c) => !dismissedIds.has(c.id) && !isSnoozed(c.id));
  if (!current) return null;

  return (
    <FollowUpCard
      key={current.id}
      match={current}
      userId={userId}
      onDismiss={() => setDismissedIds((prev) => new Set(prev).add(current.id))}
    />
  );
}
