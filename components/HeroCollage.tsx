"use client";

import { useEffect, useRef, useState } from "react";

const DESKTOP_VIDEO =
  "https://cqpxiassldkmusngqorx.supabase.co/storage/v1/object/public/media/homepage-desktop.mp4";
const MOBILE_VIDEO =
  "https://cqpxiassldkmusngqorx.supabase.co/storage/v1/object/public/media/homepage-mobile.mp4";

const STATEMENTS = [
  "my hair is breaking off at the ends.",
  "i want a better hairstyle for my face shape.",
  "i don't know how to style my hair at this length.",
  "i need more volume.",
  "i don't know what products are right for my hair.",
  "i don't know how to care for my fake hair.",
  "i need a stylist to achieve the look i want.",
  "my hair feels thin.",
  "i'm looking for a new stylist.",
  "i don't know how to care for a loved one's hair.",
  "i colored my hair and now my products don't work the same.",
  "i want to try something new.",
  "i want to prioritize my hair health.",
];

const DURATION = 2500;

export default function HeroCollage({ hasEventStrip }: { hasEventStrip: boolean }) {
  const [statementIdx, setStatementIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    runProgressBar();

    const advance = () => {
      setVisible(false);
      setTimeout(() => {
        setStatementIdx((i) => (i + 1) % STATEMENTS.length);
        setVisible(true);
        runProgressBar();
      }, 350);
    };

    timerRef.current = setInterval(advance, DURATION);
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
      {/* Desktop video */}
      <video
        className="absolute inset-0 h-full w-full object-cover hidden sm:block"
        src={DESKTOP_VIDEO}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
      />

      {/* Mobile video */}
      <video
        className="absolute inset-0 h-full w-full object-cover block sm:hidden"
        src={MOBILE_VIDEO}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
      />

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Cycling statement */}
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
            opacity: visible ? 1 : 0,
            transition: "opacity 0.35s ease",
            maxWidth: "700px",
          }}
        >
          {STATEMENTS[statementIdx]}
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
