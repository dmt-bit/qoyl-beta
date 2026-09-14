"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

type HairPhoto = {
  id: string;
  url: string;
  caption: string | null;
  hairLength: string | null;
  isPublic: boolean;
  takenAt: string;
};

// hair_photos.hair_length has a live CHECK constraint accepting only
// these lowercase/snake_case values - confirmed by testing against the
// live table (not visible via schema introspection, which only shows
// column types/defaults, not check constraints). Labels are what's
// actually shown to the user.
const HAIR_LENGTH_OPTIONS: { value: string; label: string }[] = [
  { value: "twa", label: "TWA" },
  { value: "short", label: "Short" },
  { value: "medium", label: "Medium" },
  { value: "long", label: "Long" },
  { value: "very_long", label: "Very Long" },
];
const LONG_PRESS_MS = 500;

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

function PlusIcon() {
  return (
    <svg className="h-6 w-6 text-bronze" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function PhotoTile({
  photo,
  onExpand,
  onTogglePublic,
  onDelete,
}: {
  photo: HairPhoto;
  onExpand: () => void;
  onTogglePublic: () => void;
  onDelete: () => void;
}) {
  const [showDelete, setShowDelete] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function startPress() {
    timerRef.current = setTimeout(() => setShowDelete(true), LONG_PRESS_MS);
  }
  function endPress(triggerTap: boolean) {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      if (triggerTap && !showDelete) onExpand();
    }
  }

  return (
    <div
      className="relative aspect-square overflow-hidden rounded-md bg-[#f5f5f5]"
      onPointerDown={startPress}
      onPointerUp={() => endPress(true)}
      onPointerLeave={() => endPress(false)}
    >
      <Image src={photo.url} alt={photo.caption ?? "Hair photo"} fill sizes="150px" className="object-cover" />

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onTogglePublic();
        }}
        className="absolute right-1 top-1 rounded-full bg-white/80 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-bronze2"
      >
        {photo.isPublic ? "Public" : "Private"}
      </button>

      {showDelete && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/85">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
              setShowDelete(false);
            }}
            className="rounded-full bg-red px-3 py-1 text-[10px] font-semibold text-dark"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowDelete(false);
            }}
            className="text-[10px] text-dark/60 underline"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

export default function HairJourneySection({ userId }: { userId: string }) {
  const [photos, setPhotos] = useState<HairPhoto[]>([]);
  const [loaded, setLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [hairLength, setHairLength] = useState<string | null>(null);
  const [keepPrivate, setKeepPrivate] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [expandedPhoto, setExpandedPhoto] = useState<HairPhoto | null>(null);

  async function loadPhotos() {
    const res = await fetch(`/api/hair-photos?user_id=${userId}`);
    const data = await res.json();
    setPhotos(data.photos ?? []);
    setLoaded(true);
  }

  useEffect(() => {
    loadPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setPendingPreviewUrl(URL.createObjectURL(file));
    setCaption("");
    setHairLength(null);
    setKeepPrivate(true);
    setUploadError(null);
  }

  function cancelPending() {
    setPendingFile(null);
    setPendingPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSavePhoto() {
    if (!pendingFile) return;
    setUploading(true);
    setUploadError(null);
    try {
      const { base64, mediaType } = await fileToBase64(pendingFile);
      const res = await fetch("/api/hair-photos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          image_base64: base64,
          image_media_type: mediaType,
          filename: pendingFile.name,
          caption: caption.trim() || null,
          hair_length: hairLength,
          is_public: !keepPrivate,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setUploadError(data.error ?? "Couldn't save photo. Please try again.");
        return;
      }
      cancelPending();
      await loadPhotos();
    } catch {
      setUploadError("Couldn't save photo. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleTogglePublic(photo: HairPhoto) {
    setPhotos((prev) => prev.map((p) => (p.id === photo.id ? { ...p, isPublic: !p.isPublic } : p)));
    const res = await fetch(`/api/hair-photos/${photo.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ user_id: userId, is_public: !photo.isPublic }),
    });
    if (!res.ok) {
      // Roll back on failure.
      setPhotos((prev) => prev.map((p) => (p.id === photo.id ? { ...p, isPublic: photo.isPublic } : p)));
    }
  }

  async function handleDelete(photo: HairPhoto) {
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    const res = await fetch(`/api/hair-photos/${photo.id}?user_id=${userId}`, { method: "DELETE" });
    if (!res.ok) await loadPhotos();
  }

  return (
    <div>
      <p className="font-serif text-lg text-bronze2">My Hair Journey</p>
      <p className="mt-1 text-sm text-dark/60">
        Add photos of your hair over time. Your most recent photo helps Style Match
        understand your current length and texture.
      </p>

      {loaded && photos.length === 0 && !pendingFile && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex aspect-square items-center justify-center rounded-md border border-dashed border-bronze/50"
            >
              <PlusIcon />
            </button>
          ))}
        </div>
      )}

      {photos.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {photos.map((photo) => (
            <PhotoTile
              key={photo.id}
              photo={photo}
              onExpand={() => setExpandedPhoto(photo)}
              onTogglePublic={() => handleTogglePublic(photo)}
              onDelete={() => handleDelete(photo)}
            />
          ))}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {!pendingFile ? (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="mt-4 w-full border border-bronze py-3 text-sm font-semibold text-bronze transition-colors hover:bg-bronze/10"
        >
          Add a hair photo +
        </button>
      ) : (
        <div className="mt-4 rounded-lg border border-bronze/30 p-4">
          {pendingPreviewUrl && (
            <div className="relative mx-auto h-40 w-40 overflow-hidden rounded-lg bg-[#f5f5f5]">
              <Image src={pendingPreviewUrl} alt="Selected photo" fill className="object-cover" />
            </div>
          )}

          <label htmlFor="hair-photo-caption" className="mt-4 block text-xs font-medium text-dark/70">
            Add a note (optional)
          </label>
          <input
            id="hair-photo-caption"
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="6 months post big chop"
            className="mt-1.5 w-full border border-bronze/40 bg-transparent px-3 py-2 text-sm text-dark placeholder:text-dark/40 focus:border-bronze focus:outline-none"
          />

          <p className="mt-4 text-xs font-medium text-dark/70">Hair length</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {HAIR_LENGTH_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setHairLength(option.value)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  hairLength === option.value
                    ? "border-bronze bg-bronze text-cream"
                    : "border-bronze/40 text-dark/80 hover:border-bronze"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <p className="mt-4 text-xs font-medium text-dark/70">Privacy</p>
          <div className="mt-1.5 flex gap-2">
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

          {uploadError && <p className="mt-3 text-xs text-red">{uploadError}</p>}

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={handleSavePhoto}
              disabled={uploading}
              className="flex-1 bg-bronze py-2.5 text-sm font-semibold text-cream transition-colors hover:bg-bronze2 disabled:opacity-50"
            >
              {uploading ? "Saving..." : "Save photo"}
            </button>
            <button
              type="button"
              onClick={cancelPending}
              disabled={uploading}
              className="border border-bronze/40 px-4 py-2.5 text-sm font-semibold text-dark/80"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {expandedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setExpandedPhoto(null)}
        >
          <div className="relative h-full max-h-[80vh] w-full max-w-lg">
            <Image
              src={expandedPhoto.url}
              alt={expandedPhoto.caption ?? "Hair photo"}
              fill
              className="object-contain"
            />
          </div>
          {expandedPhoto.caption && (
            <p className="absolute bottom-6 left-0 right-0 text-center text-sm text-dark">
              {expandedPhoto.caption}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
