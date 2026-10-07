"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import FeedbackSurveyModal from "@/components/FeedbackSurveyModal";
import { useAuth } from "@/lib/auth-context";
import { logMlEvent } from "@/lib/mlEvents";

// Feedback survey, time based: it opens 10 minutes after the visitor's first
// interaction in this app. Shown at most once per device - the shown flag is
// set when it opens, and submitting or dismissing the survey also suppresses
// it (feedback_submitted, set by FeedbackSurveyModal).
//
// Mounted once in the root layout, so it runs on every page. A visit to a
// suppressed path (style match, profile intake, travel kit) doesn't cancel
// the survey - it waits and checks again.

const SURVEY_DELAY_MS = 10 * 60 * 1000;
const SUPPRESSED_RECHECK_MS = 2 * 60 * 1000;
const SHOWN_KEY = "qoyl_feedback_shown";
const SUBMITTED_KEY = "feedback_submitted"; // set by FeedbackSurveyModal
const SESSION_ID_KEY = "qoyl_session_id"; // sessionStorage: one id per tab session
const ACTIVITY_EVENTS = ["click", "scroll", "keydown", "touchstart"] as const;

// Paths where the survey would interrupt a task in progress. The profile
// intake lives at /profile (there is no /profile/new or /onboarding).
const SUPPRESSED_PATHS = ["/style-match", "/profile", "/travel"];

function isSuppressed(pathname: string): boolean {
  return SUPPRESSED_PATHS.some((p) => pathname.startsWith(p));
}

function alreadyShown(): boolean {
  try {
    return Boolean(localStorage.getItem(SHOWN_KEY) || localStorage.getItem(SUBMITTED_KEY));
  } catch {
    return false;
  }
}

function sessionId(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_ID_KEY);
    if (existing) return existing;
    const created = crypto.randomUUID();
    sessionStorage.setItem(SESSION_ID_KEY, created);
    return created;
  } catch {
    return "no-session-storage";
  }
}

export default function FeedbackSurveyTrigger() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [showSurvey, setShowSurvey] = useState(false);

  // Read inside the timer callbacks, which are set up once, so they see the
  // current values rather than the ones from mount.
  const pathnameRef = useRef(pathname);
  const userIdRef = useRef<string | null>(user?.id ?? null);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);
  useEffect(() => {
    userIdRef.current = user?.id ?? null;
  }, [user]);

  useEffect(() => {
    if (alreadyShown()) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    let started = false;

    const removeActivityListeners = () => {
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, onFirstActivity));
    };

    const attempt = () => {
      if (alreadyShown()) return;
      if (isSuppressed(pathnameRef.current)) {
        timer = setTimeout(attempt, SUPPRESSED_RECHECK_MS);
        return;
      }
      try {
        localStorage.setItem(SHOWN_KEY, new Date().toISOString());
      } catch {
        // Storage blocked - the survey can reappear next visit.
      }
      logMlEvent("feedback_survey_shown", {
        userId: userIdRef.current,
        metadata: {
          trigger: "time_based",
          minutes_active: 10,
          pathname: pathnameRef.current,
          session_id: sessionId(),
        },
      });
      setShowSurvey(true);
    };

    function onFirstActivity() {
      if (started) return;
      started = true;
      removeActivityListeners();
      timer = setTimeout(attempt, SURVEY_DELAY_MS);
    }

    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, onFirstActivity, { passive: true, once: true })
    );

    return () => {
      clearTimeout(timer);
      removeActivityListeners();
    };
  }, []);

  const close = useCallback(() => setShowSurvey(false), []);

  if (!showSurvey) return null;
  return <FeedbackSurveyModal onClose={close} />;
}
