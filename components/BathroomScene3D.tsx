"use client";

import { useState } from "react";
import Image from "next/image";

export interface SceneProps {
  onHotspot: (id: "shower" | "vanity" | "dashboard") => void;
  fullViewport?: boolean;
  wallInfo?: { greeting: string; chips: string[]; routineLines: string[] };
  hud?: {
    total: number;
    hasPrice: boolean;
    checkedCount: number;
    totalCount: number;
    onShare: () => void;
    onShopAll: () => void;
  };
}

// Hotspot positions as percentage of image dimensions (left%, top%)
// Tuned for the wide-angle luxury bathroom photo (1024×1024):
//   - Vanity with vessel sinks: far right
//   - Glass shower enclosure: back-left
//   - Freestanding tub: front-left (use as routine/dashboard anchor)
const HOTSPOTS: { id: "shower" | "vanity" | "dashboard"; label: string; left: string; top: string }[] = [
  { id: "vanity",    label: "Vanity",    left: "82%", top: "58%" },
  { id: "shower",   label: "Shower",    left: "24%", top: "52%" },
  { id: "dashboard", label: "Routine",  left: "52%", top: "38%" },
];

export default function BathroomScene3D({ onHotspot, fullViewport, hud }: SceneProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: fullViewport ? "100%" : "100%",
        overflow: "hidden",
        background: "#1A1510",
      }}
    >
      {/* Full-bleed photo */}
      <Image
        src="/bathroom-bg.jpg"
        alt="Luxury bathroom"
        fill
        priority
        sizes="100vw"
        style={{ objectFit: "cover", objectPosition: "center center" }}
        draggable={false}
      />

      {/* Subtle dark vignette to help hotspots read */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.28) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Hotspot buttons */}
      {HOTSPOTS.map(({ id, label, left, top }) => {
        const isHovered = hovered === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onHotspot(id)}
            onMouseEnter={() => setHovered(id)}
            onMouseLeave={() => setHovered(null)}
            style={{
              position: "absolute",
              left,
              top,
              transform: "translate(-50%, -50%)",
              cursor: "pointer",
              background: "none",
              border: "none",
              padding: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
            }}
            aria-label={`Open ${label}`}
          >
            {/* Ring + dot */}
            <div style={{ position: "relative", width: 52, height: 52 }}>
              {/* Outer pulse ring */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  border: "1.5px solid rgba(200,168,106,0.55)",
                  animation: "hsRing 2.4s ease-out infinite",
                  transform: isHovered ? "scale(1.3)" : "scale(1)",
                  opacity: isHovered ? 0 : 1,
                  transition: "opacity 0.2s",
                }}
              />
              {/* Middle ring */}
              <div
                style={{
                  position: "absolute",
                  inset: 10,
                  borderRadius: "50%",
                  border: `1.5px solid rgba(200,168,106,${isHovered ? "0.95" : "0.72"})`,
                  boxShadow: isHovered
                    ? "0 0 18px 4px rgba(200,168,106,0.35)"
                    : "0 0 8px 2px rgba(200,168,106,0.18)",
                  transition: "all 0.2s ease",
                  backdropFilter: "blur(2px)",
                }}
              />
              {/* Center dot */}
              <div
                style={{
                  position: "absolute",
                  inset: "50%",
                  transform: "translate(-50%,-50%)",
                  width: isHovered ? 14 : 10,
                  height: isHovered ? 14 : 10,
                  borderRadius: "50%",
                  background: isHovered
                    ? "rgba(200,168,106,1)"
                    : "rgba(200,168,106,0.9)",
                  boxShadow: isHovered
                    ? "0 0 12px 4px rgba(200,168,106,0.6)"
                    : "0 0 6px 2px rgba(200,168,106,0.35)",
                  transition: "all 0.2s ease",
                }}
              />
            </div>

            {/* Label chip */}
            <div
              style={{
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: isHovered ? "#F0D890" : "rgba(240,216,144,0.85)",
                background: isHovered
                  ? "rgba(28,20,12,0.72)"
                  : "rgba(28,20,12,0.52)",
                backdropFilter: "blur(8px)",
                padding: "4px 10px",
                borderRadius: 100,
                border: `1px solid rgba(200,168,106,${isHovered ? "0.55" : "0.3"})`,
                fontFamily: "'DM Sans', sans-serif",
                transition: "all 0.2s ease",
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </div>
          </button>
        );
      })}

      {/* Hint bar at top */}
      <div
        style={{
          position: "absolute",
          bottom: hud ? 90 : 20,
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: 11,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "rgba(240,216,144,0.75)",
          textShadow: "0 1px 8px rgba(0,0,0,0.6)",
          pointerEvents: "none",
          fontFamily: "'DM Sans', sans-serif",
          whiteSpace: "nowrap",
        }}
      >
        tap a glowing ring to open
      </div>

      {/* HUD */}
      {hud && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "20px 28px 32px",
            background:
              "linear-gradient(to top, rgba(14,10,6,0.82) 0%, rgba(14,10,6,0.0) 100%)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div>
            {hud.hasPrice && (
              <div
                style={{
                  fontSize: 30,
                  fontWeight: 300,
                  color: "#F8F3EC",
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  letterSpacing: "0.02em",
                  lineHeight: 1,
                  textShadow: "0 2px 12px rgba(0,0,0,0.6)",
                }}
              >
                ${hud.total.toFixed(2)}
              </div>
            )}
            <div
              style={{
                fontSize: 11,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "rgba(220,205,175,0.85)",
                marginTop: 5,
                fontFamily: "'DM Sans', sans-serif",
                textShadow: "0 1px 6px rgba(0,0,0,0.6)",
              }}
            >
              {hud.checkedCount} of {hud.totalCount} checked off
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={hud.onShare}
              style={{
                padding: "11px 24px",
                borderRadius: 100,
                border: "1.5px solid rgba(255,255,255,0.22)",
                background: "rgba(255,255,255,0.09)",
                backdropFilter: "blur(14px)",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 500,
                letterSpacing: "0.07em",
                fontFamily: "'DM Sans', sans-serif",
                color: "#F8F3EC",
                whiteSpace: "nowrap",
              }}
            >
              Share shelf
            </button>
            <button
              type="button"
              onClick={hud.onShopAll}
              style={{
                padding: "11px 24px",
                borderRadius: 100,
                border: "none",
                background: "rgba(200,168,106,0.9)",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 500,
                letterSpacing: "0.07em",
                fontFamily: "'DM Sans', sans-serif",
                color: "#1A1410",
                whiteSpace: "nowrap",
              }}
            >
              Shop all
            </button>
          </div>
        </div>
      )}

      {/* Keyframe for pulse ring animation */}
      <style>{`
        @keyframes hsRing {
          0%   { transform: scale(0.9); opacity: 0.7; }
          70%  { transform: scale(1.6); opacity: 0; }
          100% { transform: scale(1.6); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
