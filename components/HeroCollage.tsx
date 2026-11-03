"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const BG_VIDEOS = [
  "https://cqpxiassldkmusngqorx.supabase.co/storage/v1/object/public/media/6502872-hd_1080_1920_30fps.mp4",
  "https://cqpxiassldkmusngqorx.supabase.co/storage/v1/object/public/media/6599340-hd_1080_1920_25fps.mp4",
  "https://cqpxiassldkmusngqorx.supabase.co/storage/v1/object/public/media/6922998-uhd_2160_3840_24fps.mp4",
  "https://cqpxiassldkmusngqorx.supabase.co/storage/v1/object/public/media/6940165-uhd_2560_1440_25fps.mp4",
  "https://cqpxiassldkmusngqorx.supabase.co/storage/v1/object/public/media/7020172-hd_1080_1920_25fps.mp4",
  "https://cqpxiassldkmusngqorx.supabase.co/storage/v1/object/public/media/7306713-uhd_4096_2160_25fps.mp4",
  "https://cqpxiassldkmusngqorx.supabase.co/storage/v1/object/public/media/7575519-uhd_2160_3840_24fps.mp4",
  "https://cqpxiassldkmusngqorx.supabase.co/storage/v1/object/public/media/7710694-uhd_4096_2160_25fps.mp4",
  "https://cqpxiassldkmusngqorx.supabase.co/storage/v1/object/public/media/8343868-hd_1080_1920_25fps.mp4",
];

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

const STATEMENT_DURATION = 2500;

export default function HeroCollage({ hasEventStrip }: { hasEventStrip: boolean }) {
  const [bgIdx, setBgIdx] = useState(0);
  const [statementIdx, setStatementIdx] = useState(0);
  const [statementVisible, setStatementVisible] = useState(true);
  const progressBarRef = useRef<HTMLDivElement | null>(null);

  const runProgressBar = () => {
    const el = progressBarRef.current;
    if (!el) return;
    el.style.transition = "none";
    el.style.width = "0%";
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!progressBarRef.current) return;
        progressBarRef.current.style.transition = `width ${STATEMENT_DURATION}ms linear`;
        progressBarRef.current.style.width = "100%";
      });
    });
  };

  useEffect(() => {
    runProgressBar();
    const timer = setInterval(() => {
      setStatementVisible(false);
      setTimeout(() => {
        setStatementIdx((i) => (i + 1) % STATEMENTS.length);
        setStatementVisible(true);
        runProgressBar();
      }, 350);
    }, STATEMENT_DURATION);
    return () => clearInterval(timer);
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
      {/* Background videos */}
      {BG_VIDEOS.map((src, i) => (
        <video
          key={src}
          src={src}
          autoPlay
          muted
          loop
          playsInline
          preload={i === 0 ? "auto" : "metadata"}
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-1000"
          style={{ opacity: i === bgIdx ? 1 : 0 }}
          onEnded={() => setBgIdx((prev) => (prev + 1) % BG_VIDEOS.length)}
        />
      ))}

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Centered content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 px-6 z-10">
        {/* Cycling statement */}
        <p
          className="lowercase text-center pointer-events-none"
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
          {STATEMENTS[statementIdx]}
        </p>

        {/* Start here CTA */}
        <Link
          href="/profile"
          className="lowercase"
          style={{
            fontFamily: "var(--font-space-grotesk), 'Space Grotesk', sans-serif",
            fontSize: "clamp(13px, 2vw, 15px)",
            fontWeight: 500,
            letterSpacing: "0.08em",
            color: "#ffffff",
            background: "rgba(255,255,255,0.12)",
            border: "1px solid rgba(255,255,255,0.35)",
            borderRadius: "999px",
            padding: "10px 28px",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            transition: "background 0.2s ease, border-color 0.2s ease",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.22)";
            (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.6)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.12)";
            (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.35)";
          }}
        >
          start here
        </Link>
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
