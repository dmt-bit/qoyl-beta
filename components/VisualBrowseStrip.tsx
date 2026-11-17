"use client";

import { useEffect, useRef, useState } from "react";

type BrowseImage = {
  id: string;
  image_url: string;
  alt_text: string | null;
  hair_types: string[];
  categories: string[];
  mood: string | null;
};

type Props = {
  gender: string | null;
  onSelectImage: (image: BrowseImage) => void;
};

export default function VisualBrowseStrip({ gender, onSelectImage }: Props) {
  const [images, setImages] = useState<BrowseImage[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const params = new URLSearchParams({ limit: "40" });
    if (gender === "male") params.set("gender", "male");

    fetch(`/api/visual-library/browse?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => setImages(data.images ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [gender]);

  if (loading) {
    // Skeleton: same height as real strip, shimmer cards
    return (
      <div className="relative">
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-52 w-36 shrink-0 animate-pulse rounded-none bg-[#f0ece8]"
              style={{ animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (images.length === 0) return null;

  return (
    <div className="relative bg-white">
      {/* Section label */}
      <div className="flex items-center justify-between px-4 pt-5 pb-2">
        <p className="font-sans font-bold lowercase text-dark" style={{ fontSize: "13px", letterSpacing: "0.02em" }}>
          browse looks
        </p>
        <p className="font-mono lowercase text-dark/40" style={{ fontSize: "10px" }}>
          tap to match
        </p>
      </div>

      {/* Horizontal scroll strip */}
      <div
        ref={scrollRef}
        className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-5"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {images.map((image) => (
          <button
            key={image.id}
            type="button"
            onClick={() => onSelectImage(image)}
            className="group relative h-52 w-36 shrink-0 overflow-hidden bg-[#f0ece8] focus:outline-none"
            aria-label={image.alt_text ?? "Browse this look"}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.image_url}
              alt={image.alt_text ?? ""}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {/* Subtle bottom scrim for readability */}
            <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-dark/40 to-transparent" />
          </button>
        ))}
      </div>
    </div>
  );
}

// Modal shown when user taps a photo in the browse strip.
// Emphasises the two outcomes: products cart + stylist booking.
export function BrowseImageModal({
  image,
  onClose,
  onMatch,
}: {
  image: BrowseImage;
  onClose: () => void;
  onMatch: (image: BrowseImage) => void;
}) {
  // Close on backdrop click
  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[300] flex items-end justify-center bg-dark/60 backdrop-blur-sm sm:items-center"
      onClick={handleBackdrop}
    >
      <div className="relative w-full max-w-sm overflow-hidden bg-white sm:rounded-none">
        {/* Photo */}
        <div className="relative h-72 w-full bg-[#f0ece8] sm:h-80">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.image_url}
            alt={image.alt_text ?? ""}
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center bg-dark/50 text-white"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-5">
          <h2
            className="font-sans font-bold lowercase text-dark"
            style={{ fontSize: "20px", letterSpacing: "-0.3px", lineHeight: "1.2" }}
          >
            want this look?
          </h2>
          <p className="mt-1 font-sans lowercase text-dark/60" style={{ fontSize: "14px" }}>
            match it in seconds.
          </p>

          {/* Outcome pills */}
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="flex items-center gap-1.5 border border-bronze/40 px-3 py-1.5 font-sans lowercase text-bronze2" style={{ fontSize: "12px" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
              </svg>
              your complete product list
            </span>
            <span className="flex items-center gap-1.5 border border-bronze/40 px-3 py-1.5 font-sans lowercase text-bronze2" style={{ fontSize: "12px" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
              </svg>
              book a local stylist
            </span>
          </div>

          <button
            type="button"
            onClick={() => onMatch(image)}
            className="mt-5 w-full bg-dark py-4 font-sans font-bold lowercase text-white transition-colors hover:bg-[#333]"
            style={{ fontSize: "15px" }}
          >
            match this style →
          </button>

          <button
            type="button"
            onClick={onClose}
            className="mt-2 w-full py-2 font-mono lowercase text-dark/40"
            style={{ fontSize: "11px" }}
          >
            keep browsing
          </button>
        </div>
      </div>
    </div>
  );
}
