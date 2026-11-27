"use client";

// Registers /sw.js once on mount. Keeps this in a tiny dedicated component
// so it doesn't add any state or effects to the main RootLayout.

import { useEffect } from "react";

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          console.debug("[SW] registered:", reg.scope);
        })
        .catch((err) => {
          console.error("[SW] registration failed:", err);
        });
    }
  }, []);

  return null;
}
