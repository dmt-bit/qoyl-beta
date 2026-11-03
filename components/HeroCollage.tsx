"use client";

import { useEffect, useRef, useState } from "react";

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

const DURATION = 2500;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function HeroCollage({ hasEventStrip }: { hasEventStrip: boolean }) {
  const [shuffledItems, setShuffledItems] = useState<VideoItem[] | null>(null);
  const [statementIdx, setStatementIdx] = useState(0);
  const [statementVisible, setStatementVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);

  const runProgressBar = () => {
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
  };

  useEffect(() => {
    setShuffledItems(shuffle(VIDEOS));
    runProgressBar();

    timerRef.current = setInterval(() => {
      setStatementVisible(false);
      setTimeout(() => {
        setStatementIdx((i) => (i + 1) % VIDEOS.length);
        setStatementVisible(true);
        runProgressBar();
      }, 350);
    }, DURATION);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <div
      className={`relative overflow-hidden ${
        hasEventStrip
          ? "h-[calc(100svh-52px-36px-54px)] sm:h-[calc(100svh-64px-54px)]"
          : "h-[calc(100svh-52px-54px)] sm:h-[calc(100svh-64px-54px)]"
      }`}
      style={{ transform: "translateZ(0)" }}
    >
      {/* Blurred video tiles — always blurred, purely aesthetic */}
      {shuffledItems &&
        PLACEMENTS.map((placement, idx) => {
          const item = shuffledItems[idx];
          return (
            <div
              key={idx}
              className="absolute overflow-hidden bg-[#111]"
              style={{
                left: `${placement.x}%`,
                top: `${placement.y}%`,
                width: `${placement.w}%`,
                height: `${placement.h}%`,
                transform: `rotate(${placement.r}deg)`,
                filter: "blur(3px) brightness(0.4) saturate(0.6)",
              }}
            >
              {item && (
                <video
                  src={item.src}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  className="h-full w-full object-cover"
                />
              )}
            </div>
          );
        })}

      {/* Overall dark overlay */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Cycling statement — centered, always visible */}
      <div className="absolute inset-0 flex items-center justify-center px-6 z-10 pointer-events-none">
        <p
          className="lowercase text-center"
          style={{
            fontFamily: "var(--font-space-grotesk), 'Space Grotesk', sans-serif",
            fontSize: "clamp(22px, 6vw, 48px)",
            fontWeight: 700,
            color: "#ffffff",
            lineHeight: 0.93,
            letterSpacing: "-1px",
            textShadow:
              "0 1px 8px rgba(0,0,0,0.95), 0 0 28px rgba(0,0,0,0.8), 0 2px 2px rgba(0,0,0,0.95)",
            opacity: statementVisible ? 1 : 0,
            transition: "opacity 0.35s ease",
            maxWidth: "700px",
          }}
        >
          {shuffledItems?.[statementIdx]?.text ?? VIDEOS[0].text}
        </p>
      </div>

      {/* Progress bar */}
      <div
        ref={progressBarRef}
        className="pointer-events-none absolute bottom-0 left-0 z-[61] h-[2px]"
        style={{ width: "0%", background: "rgba(255,255,255,0.7)" }}
      />
    </div>
  );
}
