"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

// Fixed bottom bar, above the bottom nav. bottom-[60px] - this app's real
// measured bottom nav height (see components/Nav.tsx's h-[60px] and the
// matching 60px reservation in app/globals.css), not the request's own
// 56px assumption. sm:bottom-0 on desktop, where there's no fixed bottom
// nav to stack above.
//
// Two modes: "ask a question" (default - hair Q&A via /api/hair-question)
// and "search products" (the original catalog search).

type Mode = "search" | "ask";

const PLACEHOLDERS = [
  "my ends keep breaking off...",
  "need a gel that doesn't crunch...",
  "what works for my baby's hair...",
  "i want to try something new...",
  "my scalp is always itchy...",
  "products stopped working after i colored my hair...",
  "how do i care for my locs while traveling...",
  "what is porosity and do i have it...",
];

const SUGGESTIONS = [
  "my ends keep breaking off",
  "i need a gel that doesn't crunch",
  "what helps with heat damage",
  "my hair feels dry after washing",
  "what is porosity",
  "best products for 4c hair",
  "how do i care for my scalp",
  "products for colored hair",
  "my hair stopped growing",
  "what causes protein overload",
];

const PLACEHOLDER_ROTATE_MS = 3000;
const PLACEHOLDER_FADE_MS = 300;
const SESSION_KEY = "qoyl_hair_session";

type Answer = {
  question: string;
  answer: string;
  route: string | null;
  routeLabel: string | null;
  secondaryRoute: string | null;
  secondaryLabel: string | null;
  intent: string;
};

// Anonymous per-browser id for rate limiting and click tracking. Stored in
// localStorage; if storage is blocked it falls back to a per-page id.
function getSessionId(): string {
  try {
    const existing = localStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const created = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, created);
    return created;
  } catch {
    return `page-${Math.random().toString(36).slice(2, 12)}`;
  }
}

function pickThree(items: string[]): string[] {
  return [...items].sort(() => Math.random() - 0.5).slice(0, 3);
}

export default function HomeSearchStrip() {
  const router = useRouter();
  const { user, hairProfile } = useAuth();
  const [mode, setMode] = useState<Mode>("ask");
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  // Placeholder rotation (ask mode). The visible text is an overlay span so
  // it can fade; a native placeholder would just jump.
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [placeholderShown, setPlaceholderShown] = useState(true);

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [cardShown, setCardShown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasProfile = Boolean(user && hairProfile?.curl_type);
  const profileCurl = hasProfile ? hairProfile?.curl_type ?? null : null;
  const profilePorosity = hasProfile ? hairProfile?.porosity ?? null : null;

  // Suggestions are picked after mount so server and client render the same markup.
  useEffect(() => {
    setSuggestions(pickThree(SUGGESTIONS));
  }, []);

  // Rotate the placeholder every few seconds with a fade. Skipped for a
  // signed-in user with a profile, who gets a fixed personal prompt.
  useEffect(() => {
    if (mode !== "ask" || hasProfile) return;
    const interval = setInterval(() => {
      setPlaceholderShown(false);
      setTimeout(() => {
        setPlaceholderIndex((i) => (i + 1) % PLACEHOLDERS.length);
        setPlaceholderShown(true);
      }, PLACEHOLDER_FADE_MS);
    }, PLACEHOLDER_ROTATE_MS);
    return () => clearInterval(interval);
  }, [mode, hasProfile]);

  // Slide-up: the card mounts hidden, then flips to shown on the next frame.
  useEffect(() => {
    if (!answer) {
      setCardShown(false);
      return;
    }
    const frame = requestAnimationFrame(() => setCardShown(true));
    return () => cancelAnimationFrame(frame);
  }, [answer]);

  async function authHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`;
    } catch {
      // Anonymous is fine.
    }
    return headers;
  }

  async function askQuestion(text: string) {
    const question = text.trim();
    if (!question || asking) return;
    setAsking(true);
    setAnswer(null);
    try {
      const res = await fetch("/api/hair-question", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({
          question,
          session_id: getSessionId(),
          curl_type: profileCurl ?? undefined,
          porosity: profilePorosity ?? undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "failed");
      setAnswer({
        question,
        answer: json.answer,
        route: json.route ?? null,
        routeLabel: json.route_label ?? null,
        secondaryRoute: json.secondary_route ?? null,
        secondaryLabel: json.secondary_label ?? null,
        intent: json.intent ?? "general",
      });
    } catch {
      setAnswer({
        question,
        answer: "we couldn't answer that right now - try again in a moment.",
        route: null,
        routeLabel: null,
        secondaryRoute: null,
        secondaryLabel: null,
        intent: "error",
      });
    } finally {
      setAsking(false);
    }
  }

  // Logs the tap, then navigates. keepalive so the log survives the page change.
  function followRoute(route: string) {
    if (!answer) return;
    fetch("/api/hair-question/click", {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: getSessionId(),
        question: answer.question,
        intent: answer.intent,
        route_clicked: route,
        had_secondary: Boolean(answer.secondaryRoute),
      }),
    }).catch(() => {});
    setAnswer(null);
    setQuery("");
    router.push(route);
  }

  function closeAnswer() {
    setAnswer(null);
    setQuery("");
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (mode === "ask") {
      askQuestion(query);
      return;
    }
    const trimmed = query.trim();
    router.push(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search");
  }

  const placeholderText = hasProfile
    ? `ask me anything about your ${profileCurl} hair...`
    : PLACEHOLDERS[placeholderIndex];

  const showChips = mode === "ask" && focused && !query && !answer && !asking && suggestions.length > 0;

  return (
    <>
      {/* Mode tabs - sit on top of the strip */}
      <div className="fixed inset-x-0 bottom-[114px] z-[80] flex h-[22px] items-end gap-5 bg-white px-[14px] sm:bottom-[54px]">
        {(["ask", "search"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setAnswer(null);
            }}
            className={`pb-0.5 font-mono text-[9px] lowercase tracking-[0.08em] ${
              mode === m ? "border-b-2 border-dark text-dark" : "text-[#888]"
            }`}
          >
            {m === "ask" ? "ask a question" : "search products"}
          </button>
        ))}
      </div>

      {/* Suggestion chips (ask mode, focused, empty) */}
      {showChips && (
        <div
          className="fixed bottom-[140px] left-4 right-4 z-[70] flex gap-1.5 overflow-x-auto sm:bottom-[80px]"
          style={{ scrollbarWidth: "none" }}
        >
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setQuery(s);
                askQuestion(s);
              }}
              className="shrink-0 whitespace-nowrap border border-[#e8e8e8] bg-white/90 px-3 py-1.5 font-mono text-[9px] lowercase text-[#888]"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Answer card - slides up above the tabs */}
      {answer && (
        <div
          role="dialog"
          aria-label="hair question answer"
          className="fixed inset-x-0 bottom-[140px] z-[79] max-h-[320px] overflow-y-auto border-t border-dark bg-white/[0.97] px-4 py-5 transition-transform duration-300 ease-out sm:bottom-[80px]"
          style={{ transform: cardShown ? "translateY(0)" : "translateY(24px)", opacity: cardShown ? 1 : 0 }}
        >
          <button
            type="button"
            onClick={closeAnswer}
            aria-label="close"
            className="absolute right-3 top-2 font-mono text-[12px] text-[#ccc] hover:text-dark"
          >
            ×
          </button>
          <p className="pr-6 font-sans text-[13px] font-light leading-[1.85] text-[#444]">{answer.answer}</p>

          {answer.route && answer.routeLabel && (
            <button
              type="button"
              onClick={() => followRoute(answer.route!)}
              className="mt-4 block w-full border border-dark px-3.5 py-2.5 text-left font-sans text-[12px] font-medium lowercase text-dark"
            >
              → {answer.routeLabel}
            </button>
          )}
          {answer.secondaryRoute && answer.secondaryLabel && (
            <button
              type="button"
              onClick={() => followRoute(answer.secondaryRoute!)}
              className="mt-2 block font-mono text-[10px] lowercase text-[#888] underline underline-offset-2"
            >
              or → {answer.secondaryLabel}
            </button>
          )}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="fixed inset-x-0 bottom-[60px] z-[80] flex h-[54px] items-center gap-2 border-t border-dark bg-white px-[14px] py-[9px] sm:bottom-0"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={mode === "search" ? "search a product or brand..." : ""}
            disabled={asking}
            className="w-full appearance-none rounded-none border border-dark bg-white px-[11px] py-[7px] text-dark placeholder:text-[#bbb] focus:outline-none"
            style={{ fontFamily: "var(--font-space-grotesk), 'Space Grotesk', sans-serif", fontSize: "16px" }}
          />
          {mode === "ask" && !query && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-[11px] right-[11px] top-1/2 -translate-y-1/2 truncate text-[#bbb] transition-opacity duration-300"
              style={{
                opacity: placeholderShown ? 1 : 0,
                fontFamily: "var(--font-space-grotesk), 'Space Grotesk', sans-serif",
                fontSize: "16px",
              }}
            >
              {placeholderText}
            </span>
          )}
        </div>

        {mode === "ask" && asking ? (
          <div className="flex shrink-0 items-center gap-1.5" aria-live="polite">
            <span className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#888]"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </span>
            <span className="font-mono text-[9px] text-[#888]">thinking...</span>
          </div>
        ) : (
          <button
            type="submit"
            className="shrink-0 whitespace-nowrap bg-dark px-[14px] py-2 text-[11px] font-medium lowercase text-white"
            style={{ fontFamily: "var(--font-space-grotesk), 'Space Grotesk', sans-serif" }}
          >
            {mode === "ask" ? "ask →" : "search →"}
          </button>
        )}
      </form>
    </>
  );
}
