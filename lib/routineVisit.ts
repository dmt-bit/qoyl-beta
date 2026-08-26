// Tracks when a user last actually looked at /routine, purely
// client-side (localStorage, no schema change) - used to show a gentle
// re-engagement nudge (a small dot on the nav's person icon) for
// subscribers who haven't been back in a while. Never blocks anything;
// worst case (localStorage unavailable/cleared) is just "no nudge shown."
const KEY_PREFIX = "qoyl_last_routine_visit_";
const NUDGE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export function markRoutineVisited(userId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY_PREFIX + userId, String(Date.now()));
  } catch {
    // Storage unavailable (private browsing, quota, etc.) - non-critical.
  }
}

export function shouldShowRoutineNudge(userId: string | null, hasRoutineSubscription: boolean): boolean {
  if (!userId || !hasRoutineSubscription || typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(KEY_PREFIX + userId);
    if (!raw) return true; // Subscriber who has never visited - nudge them in.
    const last = Number(raw);
    if (!Number.isFinite(last)) return true;
    return Date.now() - last > NUDGE_AFTER_MS;
  } catch {
    return false;
  }
}
