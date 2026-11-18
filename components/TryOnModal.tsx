"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  referenceImageUrl: string;
  onClose: () => void;
};

export default function TryOnModal({ referenceImageUrl, onClose }: Props) {
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setResultUrl(null);
    setError(null);
    const reader = new FileReader();
    reader.onload = (ev) => setSelfiePreview(ev.target?.result as string ?? null);
    reader.readAsDataURL(file);
  }

  async function handleGenerate() {
    if (!selfiePreview) return;
    setLoading(true);
    setError(null);
    setResultUrl(null);
    try {
      const res = await fetch("/api/style-match/tryon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selfieBase64: selfiePreview, referenceImageUrl }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? "Try-on failed. Please try again.");
      } else {
        setResultUrl(data.imageUrl);
      }
    } catch {
      setError("Try-on failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function resetSelfie() {
    setSelfiePreview(null);
    setResultUrl(null);
    setError(null);
  }

  return (
    <div
      className="fixed inset-0 z-[500] flex items-end justify-center bg-dark/60 backdrop-blur-sm sm:items-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-sm overflow-hidden bg-white sm:rounded-none">
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center bg-dark/10 text-dark hover:bg-dark/20"
          aria-label="Close"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        {/* Header */}
        <div className="border-b border-dark/10 px-5 pt-5 pb-4">
          <h2 className="font-sans font-bold lowercase text-dark" style={{ fontSize: "18px", letterSpacing: "-0.3px" }}>
            see it on you
          </h2>
          <p className="mt-0.5 font-mono lowercase text-dark/50" style={{ fontSize: "10px" }}>
            AI-generated preview -- for inspiration only
          </p>
        </div>

        <div className="px-5 py-5">
          {/* Side by side: reference + selfie */}
          <div className="flex gap-3">
            {/* Reference style */}
            <div className="flex-1">
              <p className="mb-1 font-mono lowercase text-dark/40" style={{ fontSize: "9px", letterSpacing: "0.08em" }}>
                the style
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={referenceImageUrl}
                alt="Reference style"
                className="h-32 w-full object-cover"
              />
            </div>

            {/* Selfie upload */}
            <div className="flex-1">
              <p className="mb-1 font-mono lowercase text-dark/40" style={{ fontSize: "9px", letterSpacing: "0.08em" }}>
                your selfie
              </p>
              {selfiePreview ? (
                <div className="relative h-32">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selfiePreview} alt="Your selfie" className="h-32 w-full object-cover" />
                  <button
                    type="button"
                    onClick={resetSelfie}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center bg-dark/60 text-white"
                    aria-label="Remove selfie"
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex h-32 w-full flex-col items-center justify-center border border-dashed border-bronze/50 bg-warm/20 transition-colors hover:bg-warm/40"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-bronze" aria-hidden="true">
                    <circle cx="12" cy="8" r="4" />
                    <path strokeLinecap="round" d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                  </svg>
                  <span className="mt-2 font-mono lowercase text-bronze" style={{ fontSize: "10px" }}>
                    tap to upload
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Result */}
          {resultUrl && (
            <div className="mt-4">
              <p className="mb-1 font-mono lowercase text-dark/40" style={{ fontSize: "9px", letterSpacing: "0.08em" }}>
                AI preview
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={resultUrl} alt="Virtual try-on result" className="w-full object-cover" />
              <p className="mt-1 font-mono lowercase text-dark/30" style={{ fontSize: "9px" }}>
                for inspiration only -- results vary
              </p>
            </div>
          )}

          {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={handleFileChange}
          />

          {!resultUrl ? (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!selfiePreview || loading}
              className="mt-4 w-full bg-dark py-3.5 font-sans font-bold lowercase text-white transition-colors hover:bg-[#333] disabled:opacity-50"
              style={{ fontSize: "14px" }}
            >
              {loading ? "generating preview..." : "generate preview →"}
            </button>
          ) : (
            <button
              type="button"
              onClick={resetSelfie}
              className="mt-3 w-full border border-dark py-3 font-sans font-bold lowercase text-dark transition-colors hover:bg-dark/5"
              style={{ fontSize: "14px" }}
            >
              try a different selfie
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="mt-2 w-full py-2 font-mono lowercase text-dark/40"
            style={{ fontSize: "11px" }}
          >
            close
          </button>
        </div>
      </div>
    </div>
  );
}
