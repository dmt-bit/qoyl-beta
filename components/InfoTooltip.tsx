"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function InfoTooltip({
  label,
  illustrationSrc,
  description,
}: {
  label: string;
  illustrationSrc?: string;
  description: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;

    document.body.style.overflow = "hidden";
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label={`More info about ${label}`}
        onClick={() => setOpen(true)}
        onMouseEnter={() => {
          if (window.matchMedia("(hover: hover)").matches) setOpen(true);
        }}
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-bronze/50 text-[11px] leading-none text-bronze2 transition-colors hover:border-bronze hover:text-dark"
      >
        ℹ
      </button>

      {open &&
        mounted &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-white/70 sm:items-center sm:p-4"
            onClick={() => setOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={label}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-bronze/30 bg-white p-6 sm:rounded-2xl"
            >
              <div className="flex items-start justify-between gap-4">
                <h3 className="font-serif text-xl font-semibold text-dark">
                  {label}
                </h3>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setOpen(false)}
                  className="text-lg leading-none text-dark/50 transition-colors hover:text-dark"
                >
                  ✕
                </button>
              </div>

              {illustrationSrc && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={illustrationSrc}
                  alt={`${label} illustration`}
                  className="mt-4 w-full rounded-lg"
                />
              )}

              <p className="mt-4 text-sm leading-relaxed text-dark/80">
                {description}
              </p>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
