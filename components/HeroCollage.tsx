"use client";

const DESKTOP_VIDEO =
  "https://cqpxiassldkmusngqorx.supabase.co/storage/v1/object/public/media/homepage-desktop.mp4";
const MOBILE_VIDEO =
  "https://cqpxiassldkmusngqorx.supabase.co/storage/v1/object/public/media/homepage-mobile.mp4";

export default function HeroCollage({ hasEventStrip }: { hasEventStrip: boolean }) {

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
    </div>
  );
}
