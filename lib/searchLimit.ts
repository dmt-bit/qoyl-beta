// Shared logic for the 5-searches-per-24h free limit. The same reset
// rule applies to both storage backends (hair_profiles columns for
// signed-in users, localStorage for anonymous ones): the window resets
// 24h after a user's first search in it, not at midnight, so
// "resetAt" doubles as "when the current window started."

export const DAILY_SEARCH_LIMIT = 5;
const RESET_WINDOW_MS = 24 * 60 * 60 * 1000;
const ANON_STORAGE_KEY = "qoyl_daily_searches";

export type SearchLimitState = {
  count: number;
  resetAt: string | null;
};

function isStale(resetAt: string | null): boolean {
  if (!resetAt) return true;
  const started = new Date(resetAt).getTime();
  if (Number.isNaN(started)) return true;
  return Date.now() - started > RESET_WINDOW_MS;
}

// The count/resetAt as stored may be from a previous 24h window -
// this returns what they effectively are right now, without writing
// anything back. Reads use this so an expired window shows as reset
// even before the next search triggers the actual write.
export function effectiveSearchState(state: SearchLimitState): SearchLimitState {
  return isStale(state.resetAt) ? { count: 0, resetAt: null } : state;
}

// Returns the state to persist after consuming one search, or null if
// the limit is already reached (effective state must be passed in).
export function consumeSearch(
  effective: SearchLimitState
): SearchLimitState | null {
  if (effective.count >= DAILY_SEARCH_LIMIT) return null;
  return {
    count: effective.count + 1,
    resetAt: effective.resetAt ?? new Date().toISOString(),
  };
}

export function msUntilReset(resetAt: string | null): number | null {
  if (!resetAt) return null;
  const started = new Date(resetAt).getTime();
  if (Number.isNaN(started)) return null;
  const remaining = RESET_WINDOW_MS - (Date.now() - started);
  return remaining > 0 ? remaining : null;
}

// "6h 23m" / "23m" - matches the upgrade wall's countdown format.
export function formatCountdown(ms: number): string {
  const totalMinutes = Math.max(1, Math.ceil(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export function readAnonSearchState(): SearchLimitState {
  if (typeof window === "undefined") return { count: 0, resetAt: null };
  try {
    const raw = localStorage.getItem(ANON_STORAGE_KEY);
    if (!raw) return { count: 0, resetAt: null };
    const parsed = JSON.parse(raw);
    return {
      count: typeof parsed.count === "number" ? parsed.count : 0,
      resetAt: typeof parsed.reset_at === "string" ? parsed.reset_at : null,
    };
  } catch {
    return { count: 0, resetAt: null };
  }
}

export function writeAnonSearchState(state: SearchLimitState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    ANON_STORAGE_KEY,
    JSON.stringify({ count: state.count, reset_at: state.resetAt })
  );
}
