"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

type PushState = "idle" | "loading" | "granted" | "denied" | "unsupported";

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output.buffer as ArrayBuffer;
}

async function getToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function registerAndSubscribe(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;

  const token = await getToken();
  if (!token) return null;

  const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  await reg.update();

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });

  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ subscription: subscription.toJSON() }),
  });

  return subscription;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function usePushOptIn() {
  const { user } = useAuth();
  const [state, setState] = useState<PushState>("idle");

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (!user) return;
    setState("loading");
    try {
      const sub = await registerAndSubscribe();
      setState(sub ? "granted" : "denied");
    } catch (err) {
      console.error("[PushOptIn] subscribe error:", err);
      setState("denied");
    }
  }, [user]);

  return { subscribe, state };
}

// ── Auto-prompt component ─────────────────────────────────────────────────────

interface PushOptInProps {
  autoPrompt?: boolean;
}

export default function PushOptIn({ autoPrompt }: PushOptInProps) {
  const { user } = useAuth();
  const { subscribe, state } = usePushOptIn();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("qoyl_push_dismissed")) setDismissed(true);
    } catch { /* ignore */ }
  }, []);

  // Don't prompt if already subscribed.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        if (sub) setDismissed(true);
      });
    });
  }, []);

  if (!autoPrompt) return null;
  if (!user) return null;
  if (dismissed || state === "granted" || state === "denied" || state === "unsupported") return null;

  function dismiss() {
    setDismissed(true);
    try { sessionStorage.setItem("qoyl_push_dismissed", "1"); } catch { /* ignore */ }
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: "env(safe-area-inset-bottom, 0px)",
        left: 0,
        right: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        padding: "14px max(16px, env(safe-area-inset-left, 0px))",
        background: "#0a0a0a",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        fontFamily: "var(--font-space-grotesk, 'Space Grotesk', sans-serif)",
      }}
    >
      <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.75)", lineHeight: 1.4 }}>
        get notified when your routine updates are ready
      </span>
      <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
        <button
          onClick={dismiss}
          style={{
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "rgba(255,255,255,0.5)",
            padding: "7px 14px",
            fontSize: "11px",
            letterSpacing: "0.05em",
            fontFamily: "inherit",
            cursor: "pointer",
            borderRadius: "4px",
          }}
        >
          not now
        </button>
        <button
          onClick={subscribe}
          disabled={state === "loading"}
          style={{
            background: "#ffffff",
            border: "none",
            color: "#0a0a0a",
            padding: "7px 16px",
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.05em",
            fontFamily: "inherit",
            cursor: "pointer",
            borderRadius: "4px",
            opacity: state === "loading" ? 0.6 : 1,
          }}
        >
          {state === "loading" ? "…" : "turn on"}
        </button>
      </div>
    </div>
  );
}
