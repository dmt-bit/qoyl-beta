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

function IconBox({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-[#e8e8e8] text-sm text-dark">
      {children}
    </span>
  );
}

function StepRow({ icon, text, sub }: { icon: React.ReactNode; text: string; sub: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-[#f5f5f5] py-2.5 last:border-b-0">
      <IconBox>{icon}</IconBox>
      <div>
        <p className="font-sans text-[13px] text-dark">{text}</p>
        <p className="font-mono text-[9px] text-[#888]">{sub}</p>
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
                <StepRow icon="↑" text="tap the share button" sub="at the bottom of safari" />
                <StepRow icon="+" text="tap 'add to home screen'" sub="scroll down to find it" />
                <StepRow icon="✓" text="tap 'add'" sub="qoyl will appear on your home screen" />
              </div>
            )}
            {platform === "android" && (
              <div>
                <StepRow icon="⋮" text="tap the menu" sub="top right of chrome" />
                <StepRow icon="+" text="tap 'add to home screen'" sub="it's in the menu list" />
                <StepRow icon="✓" text="tap 'install'" sub="qoyl will appear on your home screen" />
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
