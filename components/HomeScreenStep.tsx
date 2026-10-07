"use client";

import { useEffect, useRef, useState } from "react";
import HomeScreenInstructions from "@/components/HomeScreenInstructions";
import { logMlEvent } from "@/lib/mlEvents";
import {
  detectPlatform,
  isInstalledApp,
  PROMPT_SHOWN_KEY,
  type HomeScreenPlatform,
} from "@/lib/homeScreen";

// Final profile step: "add qoyl to your home screen". Shown after the
// profile saves and before the redirect. Skippable at the top right and
// at the bottom. Already-installed visitors go straight through.
export default function HomeScreenStep({
  userId,
  onDone,
}: {
  userId: string | null;
  onDone: () => void;
}) {
  const [platform, setPlatform] = useState<HomeScreenPlatform | null>(null);
  const shownLogged = useRef(false);

  useEffect(() => {
    if (isInstalledApp()) {
      onDone();
      return;
    }
    const detected = detectPlatform(navigator.userAgent);
    setPlatform(detected);
    try {
      localStorage.setItem(PROMPT_SHOWN_KEY, "true");
    } catch {
      // Best-effort - the banner may show once more if storage is blocked.
    }
    if (!shownLogged.current) {
      shownLogged.current = true;
      logMlEvent("home_screen_prompt_shown", {
        userId,
        metadata: {
          platform: detected,
          is_ios: detected === "ios",
          is_android: detected === "android",
          is_desktop: detected === "desktop",
        },
      });
    }
    // Runs once on mount; the callback and user id are read at that point.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function finish(event: "home_screen_added" | "home_screen_skipped") {
    if (platform) {
      logMlEvent(event, { userId, metadata: { platform } });
    }
    onDone();
  }

  if (!platform) return null;

  return (
    <main className="mx-auto flex min-h-[100svh] max-w-md flex-col px-6 py-10 font-sans text-dark">
      <div className="flex items-start justify-between">
        <span className="text-[28px]" aria-hidden="true">📱</span>
        <button
          type="button"
          onClick={() => finish("home_screen_skipped")}
          className="font-mono text-[10px] lowercase text-[#888] hover:text-dark"
        >
          skip →
        </button>
      </div>

      <h1
        className="mt-6 font-sans text-[24px] font-bold lowercase text-dark"
        style={{ letterSpacing: "-0.8px" }}
      >
        add qoyl to your home screen
      </h1>
      <p className="mb-8 mt-2 font-sans text-[14px] font-light text-[#666]">open qoyl like an app - no app store needed.</p>

      <HomeScreenInstructions platform={platform} />

      <button
        type="button"
        onClick={() => finish("home_screen_added")}
        className="mt-10 w-full bg-dark py-3.5 font-sans text-[13px] font-medium lowercase text-white"
      >
        i added it →
      </button>
      <button
        type="button"
        onClick={() => finish("home_screen_skipped")}
        className="mt-4 self-center font-mono text-[10px] lowercase text-[#888] hover:text-dark"
      >
        skip for now →
      </button>
    </main>
  );
}
