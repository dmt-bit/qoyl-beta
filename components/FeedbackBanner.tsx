"use client";

import { useEffect, useRef, useState } from "react";

// Lightweight yes/no ask, fixed above the bottom nav - never a modal.
// Purely presentational: it owns its own auto-dismiss timer and the
// "don't appear mid-interaction" delay, but NOT persistence (no
// localStorage here) - the 7-day-snooze/once-per-session bookkeeping
// stays with whichever feature renders this (e.g. StyleMatchFollowUp's
// existing isSnoozed/snooze), since that's feature-specific and this
// component is meant to be reused by unrelated prompts.
export default function FeedbackBanner({
  question,
  yesLabel = "yes",
  noLabel = "not yet",
  onYes,
  onNo,
  onDismiss,
  autoDismissMs = 8000,
}: {
  question: string;
  yesLabel?: string;
  noLabel?: string;
  onYes: () => void;
  onNo: () => void;
  onDismiss: () => void;
  autoDismissMs?: number;
}) {
  // Held back from rendering while the user is mid-scroll or mid-type so
  // it never pops up under a moving thumb - shows as soon as things go
  // quiet for IDLE_MS.
  const IDLE_MS = 500;
  const [visible, setVisible] = useState(false);
  const dismissedRef = useRef(false);

  useEffect(() => {
    let idleTimer: ReturnType<typeof setTimeout> | null = null;

    function isTyping() {
      const el = document.activeElement;
      return el instanceof HTMLElement && (el.tagName === "INPUT" || el.tagName === "TEXTAREA");
    }

    function armIdleTimer() {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        if (!isTyping()) setVisible(true);
        else armIdleTimer();
      }, IDLE_MS);
    }

    function onActivity() {
      if (dismissedRef.current) return;
      setVisible(false);
      armIdleTimer();
    }

    armIdleTimer();
    window.addEventListener("scroll", onActivity, { passive: true });
    window.addEventListener("focusin", onActivity);
    window.addEventListener("focusout", onActivity);
    return () => {
      if (idleTimer) clearTimeout(idleTimer);
      window.removeEventListener("scroll", onActivity);
      window.removeEventListener("focusin", onActivity);
      window.removeEventListener("focusout", onActivity);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!visible) return;
    const timeoutId = setTimeout(() => {
      dismissedRef.current = true;
      onDismiss();
    }, autoDismissMs);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, autoDismissMs]);

  if (!visible) return null;

  function handle(action: () => void) {
    dismissedRef.current = true;
    action();
  }

  return (
    <div
      role="status"
      className="fixed left-3 right-3 z-40 flex items-start gap-3 border border-dark bg-white px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
      style={{ bottom: "60px" }}
    >
      <p className="line-clamp-2 flex-1 font-sans text-[13px] leading-snug text-dark">{question}</p>
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={() => handle(onYes)}
          className="bg-dark px-3.5 py-1.5 font-sans text-[11px] font-medium lowercase text-white"
        >
          {yesLabel}
        </button>
        <button
          type="button"
          onClick={() => handle(onNo)}
          className="border border-[#e0e0e0] px-3.5 py-1.5 font-sans text-[11px] font-normal lowercase text-dark/60"
        >
          {noLabel}
        </button>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => handle(onDismiss)}
          className="ml-0.5 flex h-4 w-4 shrink-0 items-center justify-center text-[#888]"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
