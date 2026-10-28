"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type VideoItem = { src: string; text: string };
type Placement = { x: number; y: number; w: number; h: number; r: number };

const VIDEOS: VideoItem[] = [
  {
    src: "https://cqpxiassldkmusngqorx.supabase.co/storage/v1/object/public/media/videos/6940165-uhd_2560_1440_25fps.mp4",
    text: "my hair is breaking off at the ends.",
  },
  {
    src: "https://cqpxiassldkmusngqorx.supabase.co/storage/v1/object/public/media/videos/8467535-hd_1080_1920_30fps.mp4",
    text: "i want a better hairstyle for my face shape.",
  },
  {
    src: "https://cqpxiassldkmusngqorx.supabase.co/storage/v1/object/public/media/7477170-uhd_2160_3840_24fps.mp4",
    text: "i don't know how to style my hair at this length.",
  },
  {
    src: "https://cqpxiassldkmusngqorx.supabase.co/storage/v1/object/public/media/videos/7306713-uhd_4096_2160_25fps.mp4",
    text: "i need more volume.",
  },
  {
    src: "https://cqpxiassldkmusngqorx.supabase.co/storage/v1/object/public/media/store%20shelf.mp4",
    text: "i don't know what products are right for my hair.",
  },
  {
    src: "https://cqpxiassldkmusngqorx.supabase.co/storage/v1/object/public/media/videos/6922998-uhd_2160_3840_24fps.mp4",
    text: "i don't know how to care for my fake hair.",
  },
  {
    src: "https://cqpxiassldkmusngqorx.supabase.co/storage/v1/object/public/media/blonde%20in%20bowl.mp4",
    text: "i need a stylist to achieve the look i want.",
  },
  {
    src: "https://cqpxiassldkmusngqorx.supabase.co/storage/v1/object/public/media/videos/7710694-uhd_4096_2160_25fps.mp4",
    text: "my hair feels thin.",
  },
  {
    src: "https://cqpxiassldkmusngqorx.supabase.co/storage/v1/object/public/media/videos/6502872-hd_1080_1920_30fps.mp4",
    text: "i'm looking for a new stylist.",
  },
  {
    src: "https://cqpxiassldkmusngqorx.supabase.co/storage/v1/object/public/media/videos/8343868-hd_1080_1920_25fps.mp4",
    text: "i don't know how to care for a loved one's hair.",
  },
  {
    src: "https://cqpxiassldkmusngqorx.supabase.co/storage/v1/object/public/media/videos/7020172-hd_1080_1920_25fps.mp4",
    text: "i colored my hair and now my products don't work the same.",
  },
  {
    src: "https://cqpxiassldkmusngqorx.supabase.co/storage/v1/object/public/media/blue%20braid%20for%20stylist%20page%20.mp4",
    text: "i want to try something new.",
  },
  {
    src: "https://cqpxiassldkmusngqorx.supabase.co/storage/v1/object/public/media/videos/6381013-uhd_2160_3840_24fps.mp4",
    text: "i want to prioritize my hair health.",
  },
];

const PLACEMENTS: Placement[] = [
  { x: 1.5, y: 1.2, w: 23, h: 22, r: -2.5 },
  { x: 27, y: 0.8, w: 19, h: 15, r: 1.8 },
  { x: 49, y: 1.1, w: 25, h: 17, r: -1.2 },
  { x: 77, y: 0.9, w: 21.5, h: 20, r: 2.2 },
  { x: 1.3, y: 25, w: 20.5, h: 18, r: 2.0 },
  { x: 24, y: 17.5, w: 26, h: 13.5, r: -1.8 },
  { x: 52, y: 20, w: 22.5, h: 19, r: 1.5 },
  { x: 77, y: 23, w: 21, h: 16.5, r: -2.0 },
  { x: 2, y: 45, w: 24, h: 22, r: -1.5 },
  { x: 29, y: 33, w: 21, h: 20, r: 2.2 },
  { x: 52.5, y: 41, w: 26, h: 16, r: -1.0 },
  { x: 81, y: 41, w: 18, h: 19.5, r: 1.8 },
  { x: 13, y: 68, w: 73.5, h: 17, r: -0.5 },
];

const TILE_COUNT = PLACEMENTS.length; // 13
const DURATION = 2500; // ms per video

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

type Statement = { text: string; x: number; y: number };

// Mobile height math (see the className below) uses this app's real
// measured nav heights (52px mobile top bar, 60px bottom nav - see
// components/Nav.tsx and the 60px reservation in app/globals.css), not
// the request's own 48px/56px assumptions. The 54px subtracted for the
// search strip matches HomeSearchStrip's own real height. Desktop's
// HomeDesktopNav is given a matching explicit h-16 (64px) in Nav.tsx so
// this has a real number to calc against there too - the request's pixel
// math is otherwise mobile-only and doesn't address desktop at all.

export default function HeroCollage({ hasEventStrip }: { hasEventStrip: boolean }) {
  // null until mounted - avoids an SSR/client shuffle mismatch (the
  // request's own "video src should only be set after mount" note,
  // extended to the whole shuffle since it's Math.random()-based).
  const [shuffledItems, setShuffledItems] = useState<VideoItem[] | null>(null);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [queuePos, setQueuePos] = useState(0);
  const [statement, setStatement] = useState<Statement | null>(null);
  const [statementVisible, setStatementVisible] = useState(false);

  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const playQueueRef = useRef<number[]>([]);
  const queuePosRef = useRef(0);
  const activeIdxRef = useRef<number | null>(null);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statementTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);

  // Runs the progress bar 0% -> 100% over DURATION via a CSS transition
  // triggered across two rAFs (the standard reliable way to force a
  // transition to actually play after a synchronous style reset) -
  // smoother and far cheaper than driving width from per-frame React
  // state, while still being "requestAnimationFrame-driven" as asked.
  const runProgressBar = useCallback(() => {
    const el = progressBarRef.current;
    if (!el) return;
    el.style.transition = "none";
    el.style.width = "0%";
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!progressBarRef.current) return;
        progressBarRef.current.style.transition = `width ${DURATION}ms linear`;
        progressBarRef.current.style.width = "100%";
      });
    });
  }, []);

  const activateTile = useCallback(
    (idx: number, items: VideoItem[]) => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
      if (statementTimerRef.current) clearTimeout(statementTimerRef.current);

      activeIdxRef.current = idx;
      setActiveIdx(idx);

      videoRefs.current.forEach((video, i) => {
        if (!video) return;
        if (i === idx) {
          try {
            video.currentTime = 0;
          } catch {
            // Not yet seekable (metadata still loading) - play() below
            // still works once it is; not worth blocking on.
          }
          video.muted = true;
          video.loop = true;
          video.playsInline = true;
          video.play().catch(() => {
            // Autoplay can be rejected before the user's first
            // interaction on some mobile browsers - the tile still
            // shows its poster frame/last frame, not a crash.
          });
        } else {
          video.pause();
        }
      });

      const placement = PLACEMENTS[idx];
      const cx = placement.x + placement.w / 2;
      const rawX = cx > 50 ? placement.x - 46 : placement.x + placement.w + 2;
      const sx = clamp(rawX, 1, 54);
      const sy = clamp(placement.y, 1, 72);

      setStatementVisible(false);
      statementTimerRef.current = setTimeout(() => {
        setStatement({ text: items[idx].text, x: sx, y: sy });
        setStatementVisible(true);
      }, 80);

      runProgressBar();

      advanceTimerRef.current = setTimeout(() => {
        let nextPos = queuePosRef.current + 1;
        if (nextPos >= TILE_COUNT) {
          const reshuffled = shuffle(Array.from({ length: TILE_COUNT }, (_, i) => i));
          if (reshuffled[0] === activeIdxRef.current) {
            [reshuffled[0], reshuffled[1]] = [reshuffled[1], reshuffled[0]];
          }
          playQueueRef.current = reshuffled;
          nextPos = 0;
        }
        queuePosRef.current = nextPos;
        setQueuePos(nextPos);
        activateTile(playQueueRef.current[nextPos], items);
      }, DURATION);
    },
    [runProgressBar]
  );

  // Shuffle only - deliberately NOT calling activateTile here. This used
  // to shuffle and activate in the same synchronous effect, but the
  // <video> elements for the freshly-shuffled items don't exist in the
  // DOM yet at that point (shuffledItems was still null on the render
  // that just finished) - videoRefs.current was empty, so the very first
  // activateTile() call silently did nothing to any real video element.
  // The bug that produced: every tile showing solid black/no video on
  // first load, correcting itself only once the natural DURATION timeout
  // fired and called activateTile again for tile 2 - by which point refs
  // existed. That's "exactly how it looked on the second cycle."
  useEffect(() => {
    const items = shuffle(VIDEOS);

    // Always open on the breakage video (VIDEOS[0] - "my hair is
    // breaking off at the ends.") regardless of which tile it landed on
    // after the shuffle above. Only pinned for this initial queue - once
    // a full 13-tile cycle completes and the queue reshuffles (see
    // activateTile's advance logic), breakage goes back into random
    // rotation like every other tile.
    const breakageTileIdx = items.findIndex((item) => item.src === VIDEOS[0].src);
    const remainingTiles = Array.from({ length: TILE_COUNT }, (_, i) => i).filter(
      (i) => i !== breakageTileIdx
    );
    const queue =
      breakageTileIdx === -1
        ? shuffle(Array.from({ length: TILE_COUNT }, (_, i) => i))
        : [breakageTileIdx, ...shuffle(remainingTiles)];

    playQueueRef.current = queue;
    queuePosRef.current = 0;
    setQueuePos(0);
    setShuffledItems(items);
  }, []);

  // Fires once shuffledItems is set and the <video> elements it produced
  // have actually mounted (so videoRefs.current is populated) - calls
  // .load() on every tile simultaneously first, so every blurred
  // (inactive) tile has real first-frame video data to show through the
  // blur instead of a black box, then activates the first queue entry
  // against a real video element.
  useEffect(() => {
    if (!shuffledItems) return;
    videoRefs.current.forEach((video) => video?.load());
    activateTile(playQueueRef.current[0], shuffledItems);

    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
      if (statementTimerRef.current) clearTimeout(statementTimerRef.current);
    };
    // Only re-fires if shuffledItems identity changes, which after the
    // effect above only happens once (mount) - activateTile is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shuffledItems]);

  function handleTileClick(idx: number) {
    if (!shuffledItems || idx === activeIdxRef.current) return;
    const posInQueue = playQueueRef.current.indexOf(idx);
    queuePosRef.current = posInQueue >= 0 ? posInQueue : queuePosRef.current;
    setQueuePos(queuePosRef.current);
    activateTile(idx, shuffledItems);
  }

  return (
    <div
      className={`relative overflow-hidden ${
        hasEventStrip
          ? "h-[calc(100svh-52px-36px-54px)] sm:h-[calc(100svh-64px-54px)]"
          : "h-[calc(100svh-52px-54px)] sm:h-[calc(100svh-64px-54px)]"
      }`}
      style={{ transform: "translateZ(0)", touchAction: "pan-y" }}
    >
      {PLACEMENTS.map((placement, idx) => {
        const item = shuffledItems?.[idx];
        // activeIdx is null until the second effect above activates the
        // first tile, so every tile's filter is "blurred" (never "none")
        // on the very first paint already - this was always a plain
        // inline style computed from state on every render, never a CSS
        // class toggled after mount. What was missing was real video
        // frame data to show through that blur (see the .load() fix
        // above) - a blurred tile with nothing loaded under it still
        // looks solid black.
        const isActive = activeIdx === idx;
        return (
          <button
            key={idx}
            type="button"
            onClick={() => handleTileClick(idx)}
            aria-label={item ? `Show: ${item.text}` : "Hair video"}
            className="absolute overflow-hidden bg-[#111]"
            style={{
              left: `${placement.x}%`,
              top: `${placement.y}%`,
              width: `${placement.w}%`,
              height: `${placement.h}%`,
              transform: `rotate(${placement.r}deg)`,
              willChange: "filter",
              filter: isActive
                ? "none"
                : "blur(2.5px) brightness(0.45) saturate(0.5)",
              transition: "filter 0.5s ease",
              zIndex: isActive ? 35 : 10,
              border: isActive ? "2px solid #0a0a0a" : "none",
            }}
          >
            {item && (
              <video
                ref={(el) => {
                  videoRefs.current[idx] = el;
                }}
                src={item.src}
                muted
                playsInline
                loop
                preload="metadata"
                className="h-full w-full object-cover"
              />
            )}
          </button>
        );
      })}

      {statement && (
        <div
          className="absolute z-50 pointer-events-none"
          style={{
            left: `${statement.x}%`,
            top: `${statement.y}%`,
            maxWidth: "45%",
            opacity: statementVisible ? 1 : 0,
            transition: "opacity 0.35s ease",
          }}
        >
          <p
            className="lowercase"
            style={{
              fontFamily: "var(--font-space-grotesk), 'Space Grotesk', sans-serif",
              fontSize: "clamp(18px, 5.5vw, 26px)",
              fontWeight: 700,
              color: "#ffffff",
              lineHeight: 0.93,
              letterSpacing: "-1px",
              textShadow:
                "0 1px 8px rgba(0,0,0,0.95), 0 0 28px rgba(0,0,0,0.8), 0 2px 2px rgba(0,0,0,0.95)",
            }}
          >
            {statement.text}
          </p>
        </div>
      )}

      <div
        ref={progressBarRef}
        className="pointer-events-none absolute bottom-0 left-0 z-[61] h-[2px]"
        style={{ width: "0%", background: "rgba(255,255,255,0.7)" }}
      />

      <div className="absolute inset-x-0 bottom-[calc(120px_+_env(safe-area-inset-bottom))] z-[60] flex justify-center gap-[5px] sm:bottom-[60px]">
        {Array.from({ length: TILE_COUNT }).map((_, i) => (
          <span
            key={i}
            className="h-1 w-1 rounded-full bg-white/35 transition-all duration-300"
            style={
              i === queuePos
                ? { background: "#ffffff", transform: "scale(1.4)" }
                : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}
