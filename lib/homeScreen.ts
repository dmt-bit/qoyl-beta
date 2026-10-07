// Home screen install prompt helpers, shared by the profile step
// (components/HomeScreenStep.tsx) and the home page banner
// (components/HomeScreenBanner.tsx).

export type HomeScreenPlatform = "ios" | "android" | "desktop";

export const SESSION_COUNT_KEY = "qoyl_session_count";
export const SESSION_COUNTED_KEY = "qoyl_session_counted"; // sessionStorage: this tab already counted
export const PROMPT_SHOWN_KEY = "qoyl_home_prompt_shown";
export const PROMPT_DISMISSED_KEY = "qoyl_home_prompt_dismissed";
export const BANNER_MIN_SESSIONS = 3;
export const QOYL_URL = "https://qoyl.live";

export function detectPlatform(userAgent: string): HomeScreenPlatform {
  if (/iPad|iPhone|iPod/.test(userAgent)) return "ios";
  if (/Android/.test(userAgent)) return "android";
  return "desktop";
}

// Already running as an installed app - nothing to prompt for.
export function isInstalledApp(): boolean {
  if (typeof window === "undefined") return false;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia("(display-mode: standalone)").matches;
}
