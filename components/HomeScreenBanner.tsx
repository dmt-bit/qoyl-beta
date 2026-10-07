"use client";

import { useEffect, useState } from "react";
import HomeScreenInstructions from "@/components/HomeScreenInstructions";
import {
  BANNER_MIN_SESSIONS,
  PROMPT_DISMISSED_KEY,
  PROMPT_SHOWN_KEY,
  SESSION_COUNT_KEY,
  SESSION_COUNTED_KEY,
  detectPlatform,
  isInstalledApp,
  type HomeScreenPlatform,
} from "@/lib/homeScreen";

// Home page banner for returning visitors (session 3+) who haven't installed
// the app. Counted per tab session, not per page load, so refreshing doesn't
// inflate the count. Shown once: the shown flag is set when it appears, and
// the × dismisses it for good.

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

function readCount(): number {
  try {
    return Number(localStorage.getItem(SESSION_COUNT_KEY) ?? "0");
  } catch {
    return 0;
  }
}

function writeFlag(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Best-effort - storage blocked means the banner may reappear.
  }
}

export default function HomeScreenBanner() {
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<HomeScreenPlatform>("desktop");
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    // Count this tab session once.
    try {
      if (!sessionStorage.getItem(SESSION_COUNTED_KEY)) {
        sessionStorage.setItem(SESSION_COUNTED_KEY, "true");
        const count = Number(localStorage.getItem(SESSION_COUNT_KEY) ?? "0") + 1;
        writeFlag(SESSION_COUNT_KEY, String(count));
      }
    } catch {
      // Storage blocked - the banner just won't count sessions.
    }

    const count = readCount();

    if (count < BANNER_MIN_SESSIONS) return;
    if (isInstalledApp()) return;
    if (readFlag(PROMPT_DISMISSED_KEY) || readFlag(PROMPT_SHOWN_KEY)) return;

    setPlatform(detectPlatform(navigator.userAgent));
    writeFlag(PROMPT_SHOWN_KEY, "true");
    setVisible(true);
  }, []);

  function dismiss() {
    writeFlag(PROMPT_DISMISSED_KEY, "true");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <>
      <div
        className="flex w-full items-center justify-between gap-3 px-4 py-2"
        style={{ background: "rgba(0,0,0,0.6)" }}
      >
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="text-left font-mono text-[9px] lowercase tracking-[0.08em] text-white"
        >
          add qoyl to your home screen for the full experience →
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="dismiss"
          className="shrink-0 font-mono text-[12px] leading-none text-white/70 hover:text-white"
        >
          ×
        </button>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setModalOpen(false)}>
          <div
            role="dialog"
            aria-label="add qoyl to your home screen"
            className="relative w-full max-w-md border border-dark bg-white p-6 font-sans text-dark"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              aria-label="close"
              className="absolute right-3 top-2 font-mono text-[14px] text-[#888] hover:text-dark"
            >
              ×
            </button>
            <p className="font-sans text-[20px] font-bold lowercase" style={{ letterSpacing: "-0.6px" }}>
              add qoyl to your home screen
            </p>
            <p className="mb-6 mt-1 font-sans text-[13px] font-light text-[#666]">open qoyl like an app - no app store needed.</p>
            <HomeScreenInstructions platform={platform} />
          </div>
        </div>
      )}
    </>
  );
}
