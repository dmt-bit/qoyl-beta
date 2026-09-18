"use client";

import { useEffect } from "react";

// Locks background scroll while a bottom sheet / modal is open, toggling
// the global .modal-open rule in globals.css (position: fixed; overflow:
// hidden) - prevents the page behind a sheet from scrolling on iOS,
// which otherwise fights with the sheet's own touch-drag handling.
export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    document.body.classList.add("modal-open");
    return () => {
      document.body.classList.remove("modal-open");
    };
  }, [active]);
}
