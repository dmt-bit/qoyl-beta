"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  IS_STANDALONE_KEY,
  LOGIN_COUNT_KEY,
  STANDALONE_LOGGED_KEY,
  detectPlatform,
  isInstalledApp,
  type HomeScreenPlatform,
} from "@/lib/homeScreen";

// Mounted once in the root layout (every authenticated page load runs this).
// Shows a bottom sheet from the 3rd login onward, using the database as the
// source of truth (hair_profiles.login_count/home_screen_prompted_at) -
// localStorage only makes the local counter instant, it never decides
// whether to show the prompt (a second device could be on login #1 while
// the database is already past 3).
//
// Routes used: /api/track-login (increments the count, returns the current
// DB state), /api/log-standalone (once per tab, when running installed),
// /api/home-screen-prompt (marks prompted_at and logs each of the three events).

// /profile/new and /onboarding don't exist in this app (the intake is
// /profile); /apply and /business belong to the separate qoyl-business app.
const SUPPRESSED_PATHS = ["/style-match", "/profile", "/travel"];

function isSuppressed(pathname: string): boolean {
  return SUPPRESSED_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function tabSessionId(): string {
  try {
    const existing = sessionStorage.getItem("qoyl_tab_session_id");
    if (existing) return existing;
    const created = crypto.randomUUID();
    sessionStorage.setItem("qoyl_tab_session_id", created);
    return created;
  } catch {
    return `tab-${Math.random().toString(36).slice(2, 10)}`;
  }
}

// ---- Step icons (inline SVG - no icon library in this app) --------------

function ShareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="3" y="7" width="12" height="9" rx="0" stroke="#0a0a0a" strokeWidth="1.5" />
      <path d="M9 1 L9 10 M6 4 L9 1 L12 4" stroke="#0a0a0a" strokeWidth="1.5" strokeLinecap="square" />
    </svg>
  );
}

function AddToHomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="14" height="14" rx="0" stroke="#0a0a0a" strokeWidth="1.5" />
      <path d="M9 5 L9 13 M5 9 L13 9" stroke="#0a0a0a" strokeWidth="1.5" strokeLinecap="square" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M3 9 L7 13 L15 5" stroke="#0a0a0a" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" />
    </svg>
  );
}

function KebabIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="3" r="1.5" fill="#0a0a0a" />
      <circle cx="9" cy="9" r="1.5" fill="#0a0a0a" />
      <circle cx="9" cy="15" r="1.5" fill="#0a0a0a" />
    </svg>
  );
}

// ---- Visual hints ---------------------------------------------------------
// The scroll is where most people give up, thinking the option doesn't
// exist - these two hints (a mock share-sheet/menu list, and a pointer at
// the three-dot menu) are the most useful part of this whole prompt.

function ScrollHint() {
  return (
    <div className="mt-2">
      <div className="flex items-center gap-1.5">
        <div
          className="flex flex-col gap-[3px] border border-[#e8e8e8] px-2.5 py-1.5 font-mono text-[10px] leading-none text-[#aaa]"
        >
          <span>airdrop</span>
          <span>messages</span>
          <span>safari</span>
          <span className="text-[#bbb]">· · ·</span>
          <span className="flex items-center gap-1 font-bold text-dark">← add to home screen</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[18px] leading-none">↓</span>
          <span className="mt-0.5 font-mono text-[8px] text-[#888]">scroll</span>
        </div>
      </div>
      <div className="mt-1.5 font-mono text-[9px] tracking-[0.06em] text-amber">⚠ it&apos;s at the very bottom of the list</div>
    </div>
  );
}

function KebabHint() {
  return (
    <div className="mt-2 flex items-center justify-between border border-[#e8e8e8] px-2.5 py-2">
      <span className="font-mono text-[9px] text-[#bbb]">qoyl.live</span>
      <div className="relative flex flex-col items-center gap-0.5">
        <span className="absolute -top-4 right-0 whitespace-nowrap font-mono text-[8px] font-bold text-green">
          tap here ↓
        </span>
        <div className="flex flex-col gap-0.5 border-[1.5px] border-dark px-[5px] py-1">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-[3px] w-[3px] rounded-full bg-dark" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ---- Step row ---------------------------------------------------------

function StepRow({
  icon,
  title,
  sub,
  hint,
  last,
}: {
  icon: React.ReactNode;
  title: React.ReactNode;
  sub: string;
  hint?: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div className={`flex items-start gap-3.5 py-3.5 ${last ? "" : "border-b border-[#f5f5f5]"}`}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-dark">{icon}</span>
      <div className="flex-1">
        <p className="mb-0.5 font-sans text-[13px] font-medium text-dark">{title}</p>
        <p className="font-mono text-[9px] leading-[1.5] text-[#888]">{sub}</p>
        {hint}
      </div>
    </div>
  );
}

export default function HomeScreenPrompt() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<HomeScreenPlatform>("desktop");
  const [loginCount, setLoginCount] = useState(0);
  const [added, setAdded] = useState(false);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (!user || checkedRef.current) return;
    checkedRef.current = true;

    // Layer 1: instant local counter, never awaited, never the gating value.
    try {
      const local = parseInt(localStorage.getItem(LOGIN_COUNT_KEY) ?? "0", 10) + 1;
      localStorage.setItem(LOGIN_COUNT_KEY, String(local));
    } catch {
      // Non-fatal - the database count below is what actually gates the prompt.
    }

    const standalone = isInstalledApp();
    if (standalone) {
      try {
        localStorage.setItem(IS_STANDALONE_KEY, "true");
      } catch {
        // Fine - nothing downstream currently depends on this surviving.
      }
      try {
        if (!sessionStorage.getItem(STANDALONE_LOGGED_KEY)) {
          sessionStorage.setItem(STANDALONE_LOGGED_KEY, "true");
          fetch("/api/log-standalone", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: user.id, session_id: tabSessionId() }),
          }).catch(() => {});
        }
      } catch {
        // sessionStorage blocked - skip the dedupe, still fine to not log twice here.
      }
      // Already installed - nothing to prompt for.
      return;
    }

    // Layer 2: the database count is the real gate.
    fetch("/api/track-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user.id }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((result: { login_count: number; home_screen_prompted_at: string | null } | null) => {
        if (!result) return;
        setLoginCount(result.login_count);
        if (result.login_count < 3) return;
        if (result.home_screen_prompted_at) return;
        if (isSuppressed(pathname)) return;

        const detected = detectPlatform(navigator.userAgent);
        setPlatform(detected);
        setVisible(true);
        fetch("/api/home-screen-prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "shown", user_id: user.id, login_count: result.login_count, platform: detected }),
        }).catch(() => {});
      })
      .catch(() => {});
    // Runs once per mount (checkedRef), reading user/pathname as they are then.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  function logAction(action: "added" | "skipped") {
    if (!user) return;
    fetch("/api/home-screen-prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, user_id: user.id, login_count: loginCount, platform }),
    }).catch(() => {});
  }

  function handleAdded() {
    logAction("added");
    setAdded(true);
    setTimeout(() => setVisible(false), 1500);
  }

  function handleSkip() {
    logAction("skipped");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <>
      <div className="fixed inset-0 z-[199] bg-black/40" onClick={handleSkip} />
      <div
        className="fixed inset-x-0 bottom-0 z-[200] border-t border-dark bg-white"
        style={{
          padding: "24px 20px calc(24px + env(safe-area-inset-bottom))",
          maxHeight: "70vh",
          overflowY: "auto",
        }}
      >
        <div className="mx-auto mb-5 h-[3px] w-8 rounded-full bg-[#e8e8e8]" />

        {added ? (
          <p className="py-6 text-center font-sans text-base text-dark">nice — see you on the home screen. 🖤</p>
        ) : (
          <>
            <h2
              className="font-sans font-bold lowercase text-dark"
              style={{ fontSize: "22px", letterSpacing: "-0.8px", marginBottom: "6px" }}
            >
              get the full experience
            </h2>
            <p className="mb-6 font-sans text-[13px] font-light leading-[1.65] text-[#666]">
              add qoyl to your home screen. opens like an app, no app store needed.
            </p>

            {platform === "ios" && (
              <div>
                <StepRow
                  icon={<ShareIcon />}
                  title="tap the share button"
                  sub="the box with the arrow — at the bottom center of safari"
                />
                <StepRow
                  icon={<AddToHomeIcon />}
                  title={
                    <>
                      <strong>scroll down</strong> and tap &apos;add to home screen&apos;
                    </>
                  }
                  sub="it's at the bottom of the share menu — you'll need to scroll down to find it"
                  hint={<ScrollHint />}
                />
                <StepRow icon={<CheckIcon />} title="tap 'add'" sub="top right of the screen" last />
              </div>
            )}
            {platform === "android" && (
              <div>
                <StepRow
                  icon={<KebabIcon />}
                  title="tap the three dots"
                  sub="top right corner of chrome"
                  hint={<KebabHint />}
                />
                <StepRow
                  icon={<AddToHomeIcon />}
                  title={
                    <>
                      <strong>scroll down</strong> and tap &apos;add to home screen&apos;
                    </>
                  }
                  sub="it's further down the menu — scroll past the other options to find it"
                  hint={<ScrollHint />}
                />
                <StepRow
                  icon={<CheckIcon />}
                  title="tap 'install'"
                  sub="chrome may say 'install' instead of 'add'"
                  last
                />
              </div>
            )}
            {platform === "desktop" && (
              <p className="py-2 font-sans text-[13px] font-light text-[#888]">
                open qoyl on your phone for the best experience
              </p>
            )}

            <button
              type="button"
              onClick={handleAdded}
              className="mt-6 h-12 w-full bg-dark font-sans text-sm font-medium lowercase text-white"
            >
              i added it →
            </button>
            <button
              type="button"
              onClick={handleSkip}
              className="mt-3 block w-full text-center font-mono text-[10px] lowercase text-[#888] hover:text-dark"
            >
              maybe later
            </button>
          </>
        )}
      </div>
    </>
  );
}
