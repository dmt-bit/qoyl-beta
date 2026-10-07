// Home screen install prompt helpers, shared by HomeScreenPrompt
// (components/HomeScreenPrompt.tsx, mounted in the root layout) and the
// admin stats section (app/admin/page.tsx).
//
// The prompt trigger is login-count + database state (hair_profiles.
// login_count/home_screen_prompted_at - see app/api/track-login) - the
// localStorage keys below are only for instant, no-await reads (the
// current count for display, the standalone flag for other components,
// a once-per-tab guard on the standalone log) and are never the source
// of truth for whether to show the prompt.

export type HomeScreenPlatform = "ios" | "android" | "desktop";

export const LOGIN_COUNT_KEY = "qoyl_login_count"; // localStorage, instant local counter
export const IS_STANDALONE_KEY = "qoyl_is_standalone"; // localStorage, read synchronously elsewhere
export const STANDALONE_LOGGED_KEY = "qoyl_standalone_logged"; // sessionStorage, once-per-tab guard
export const QOYL_URL = "https://qoyl.live";

export function detectPlatform(userAgent: string): HomeScreenPlatform {
  if (/iPad|iPhone|iPod/.test(userAgent)) return "ios";
  if (/android/i.test(userAgent)) return "android";
  return "desktop";
}

// Already running as an installed app - nothing to prompt for.
export function isInstalledApp(): boolean {
  if (typeof window === "undefined") return false;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia("(display-mode: standalone)").matches;
}
