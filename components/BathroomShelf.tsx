"use client";

import { useState } from "react";
import type { CartItem } from "@/lib/styleCart";

// ─── Zone classification ───────────────────────────────────────────────────
const IN_SHOWER_SET  = new Set(["shampoo","conditioner","deep-conditioner","deep conditioner","co-wash","cleanser"]);
const OUT_SHOWER_SET = new Set(["leave-in","styler","oil","serum","cream","gel","mousse","spray"]);

function getShelfZone(item: CartItem): "shower" | "vanity" {
  if (item.product_type === "fake_hair" || item.product_type === "tool") return "vanity";
  const labels = (item.secondary_category_labels ?? []).map((l) => l.toLowerCase());
  for (const l of labels) {
    if (IN_SHOWER_SET.has(l))  return "shower";
    if (OUT_SHOWER_SET.has(l)) return "vanity";
  }
  const name = item.product_name.toLowerCase();
  if (/shampoo|wash|cleanser/.test(name))       return "shower";
  if (/conditioner|mask|treatment/.test(name))  return "shower";
  return "vanity";
}

// ─── Fallback bottle colors ────────────────────────────────────────────────
const BOTTLE_PALETTE: Record<string, [string, string]> = {
  "shampoo":            ["#B4CAD0","#8BADB5"],
  "conditioner":        ["#D4B8D0","#B089AA"],
  "deep-conditioner":   ["#C8D4B0","#9AB580"],
  "deep conditioner":   ["#C8D4B0","#9AB580"],
  "treatment":          ["#D0C4A8","#B0A07A"],
  "co-wash":            ["#C5D5D8","#8DADB2"],
  "leave-in":           ["#D0BFC0","#B09098"],
  "styler":             ["#B8C8D8","#7898B0"],
  "oil":                ["#D8C8A8","#B0A070"],
  "serum":              ["#C8D0D8","#90A0B0"],
  "gel":                ["#B8D0C0","#7AADA0"],
  "mousse":             ["#D8C8D0","#B0909A"],
  "default":            ["#C8C0B8","#A09890"],
};
function getBottleColor(labels: string[] = []): [string, string] {
  for (const l of labels) {
    const c = BOTTLE_PALETTE[l.toLowerCase()];
    if (c) return c;
  }
  return BOTTLE_PALETTE.default;
}

// ─── Product card in panel ────────────────────────────────────────────────
function ProductCard({
  item,
  checked,
  onToggle,
}: {
  item: CartItem;
  checked: boolean;
  onToggle: () => void;
}) {
  const catLabel = (() => {
    const l = item.secondary_category_labels?.[0];
    if (!l) return "Hair Care";
    return l.charAt(0).toUpperCase() + l.slice(1).replace(/-/g, " ");
  })();
  const [t, b] = getBottleColor(item.secondary_category_labels);
  const shopUrl = item.affiliate_url ?? item.seller_url;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); }}}
      style={{
        background: "white",
        borderRadius: 14,
        padding: "14px 10px 12px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 7,
        cursor: "pointer",
        border: `1.5px solid ${checked ? "rgba(126,155,138,0.5)" : "transparent"}`,
        transition: "border-color 0.2s, box-shadow 0.2s, transform 0.2s",
        position: "relative",
        boxShadow: "0 2px 10px rgba(42,36,32,0.06)",
        opacity: checked ? 0.6 : 1,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)";
        (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(42,36,32,0.12)";
        (e.currentTarget as HTMLElement).style.borderColor = "#C8A86A";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "";
        (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 10px rgba(42,36,32,0.06)";
        (e.currentTarget as HTMLElement).style.borderColor = checked ? "rgba(126,155,138,0.5)" : "transparent";
      }}
    >
      {checked && (
        <span style={{
          position: "absolute", top: 8, right: 8,
          width: 18, height: 18,
          background: "#7E9B8A", color: "white",
          borderRadius: "50%", fontSize: 10,
          lineHeight: "18px", textAlign: "center",
          fontFamily: "inherit", fontWeight: 500,
        }}>✓</span>
      )}

      {/* Bottle */}
      <div style={{ width: 56, height: 72, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
        {item.image_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={item.image_url} alt={item.product_name}
            style={{ maxWidth: 56, maxHeight: 72, objectFit: "contain", filter: "drop-shadow(0 4px 8px rgba(42,36,32,0.2))" }}
            loading="lazy"
          />
        ) : (
          <div style={{
            width: 40, height: 64,
            background: `linear-gradient(165deg, ${t} 0%, ${b} 100%)`,
            borderRadius: "5px 5px 4px 4px",
            position: "relative",
            boxShadow: "2px 4px 10px rgba(42,36,32,0.2)",
          }}>
            {/* Cap */}
            <div style={{
              position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)",
              width: 14, height: 12,
              background: `linear-gradient(165deg, ${t} 0%, ${b} 100%)`,
              borderRadius: "3px 3px 0 0", filter: "brightness(1.08)",
            }} />
            {/* Highlight */}
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(135deg, rgba(255,255,255,0.35) 0%, transparent 55%)",
              borderRadius: "inherit",
            }} />
          </div>
        )}
      </div>

      {/* Category label */}
      <div style={{ fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "#C8A86A" }}>
        {catLabel}
      </div>

      {/* Product name */}
      <div style={{
        fontSize: 11, fontWeight: 400, textAlign: "center",
        lineHeight: 1.3, color: "#2A2420",
        display: "-webkit-box",
        WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
        overflow: "hidden",
      }}>
        {item.product_name}
      </div>

      {/* Price */}
      {item.price_estimate != null && (
        <div style={{ fontSize: 12, fontWeight: 500, color: "#7A6E64", fontVariantNumeric: "tabular-nums" }}>
          ${item.price_estimate.toFixed(2)}
        </div>
      )}

      {/* Shop link */}
      {shopUrl && (
        <a href={shopUrl} target="_blank" rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            fontSize: 10, fontWeight: 500, letterSpacing: "0.05em",
            color: "#2A2420", background: "#F0EBE4",
            border: "none", borderRadius: 100,
            padding: "5px 10px", cursor: "pointer",
            fontFamily: "inherit", textDecoration: "none",
            marginTop: 2,
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M1.5 5h7M5 1.5l3.5 3.5L5 8.5"/>
          </svg>
          Shop
        </a>
      )}
    </div>
  );
}

// ─── Slide-up panel ───────────────────────────────────────────────────────
function ShelfPanel({
  open,
  title,
  subtitle,
  icon,
  items,
  purchasedIds,
  onToggle,
  onClose,
}: {
  open: boolean;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  items: CartItem[];
  purchasedIds: Set<string>;
  onToggle: (productId: string | null) => void;
  onClose: () => void;
}) {
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: open ? "rgba(42,36,32,0.55)" : "rgba(42,36,32,0)",
          backdropFilter: open ? "blur(4px)" : "none",
          zIndex: 200,
          pointerEvents: open ? "all" : "none",
          transition: "background 0.4s, backdrop-filter 0.4s",
        }}
        aria-hidden="true"
      />
      {/* Panel — positioned at the bottom of the page flow, not fixed to viewport */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          position: "fixed", left: "50%", bottom: 0,
          transform: open ? "translateX(-50%) translateY(0)" : "translateX(-50%) translateY(100%)",
          width: "min(640px, 100vw)",
          maxHeight: "80vh",
          background: "#F8F5F0",
          borderRadius: "24px 24px 0 0",
          display: "flex", flexDirection: "column",
          transition: "transform 0.45s cubic-bezier(0.32,0.72,0,1)",
          zIndex: 201,
          boxShadow: "0 -12px 60px rgba(42,36,32,0.25)",
          overflow: "hidden",
        }}
        onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
        tabIndex={-1}
      >
        {/* Handle */}
        <div style={{
          width: 36, height: 4, background: "rgba(180,168,152,0.5)",
          borderRadius: 2, margin: "14px auto 0", flexShrink: 0,
        }} />
        {/* Header */}
        <div style={{
          padding: "16px 24px 12px",
          borderBottom: "1px solid rgba(220,210,195,0.6)",
          flexShrink: 0,
        }}>
          <div style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: 24, fontWeight: 400, fontStyle: "italic",
            color: "#2A2420",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            {icon}
            {title}
          </div>
          <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "#B4A898", marginTop: 2 }}>
            {subtitle}
          </div>
        </div>
        {/* Scroll content */}
        <div style={{ overflowY: "auto", flex: 1, padding: "20px 24px 32px", WebkitOverflowScrolling: "touch" as React.CSSProperties["WebkitOverflowScrolling"] }}>
          {items.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 20px", color: "#B4A898" }}>
              <p style={{ fontSize: 14, lineHeight: 1.6 }}>
                Your {title.toLowerCase()} products<br />will appear here
              </p>
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
              gap: 14,
            }}>
              {items.map((item) => (
                <ProductCard
                  key={item.product_id ?? item.product_name}
                  item={item}
                  checked={item.product_id != null && purchasedIds.has(item.product_id)}
                  onToggle={() => onToggle(item.product_id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Hotspot pulse ring ───────────────────────────────────────────────────
function HotspotRing({ label }: { label: string }) {
  return (
    <div style={{ position: "relative", display: "inline-flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{
        width: 36, height: 36, borderRadius: "50%",
        background: "rgba(200,168,106,0.2)",
        border: "1.5px solid #C8A86A",
        animation: "bs-ring-pulse 2.4s ease-in-out infinite",
      }} />
      <div style={{
        fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase",
        color: "#C8A86A", whiteSpace: "nowrap", fontWeight: 500,
        marginTop: 6,
        textShadow: "0 1px 4px rgba(255,255,255,0.8)",
      }}>
        {label}
      </div>
    </div>
  );
}

// ─── Global styles (keyframes etc.) ──────────────────────────────────────
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap');
@keyframes bs-ring-pulse {
  0%,100% { transform: scale(1);   opacity: 0.9; }
  50%      { transform: scale(1.2); opacity: 0.5; }
}
@media (prefers-reduced-motion: reduce) {
  [style*="bs-ring-pulse"] { animation: none !important; }
}
`;

// ─── Main component ────────────────────────────────────────────────────────
export default function BathroomShelf({
  cartId,
  items: initialItems,
}: {
  cartId: string;
  items: CartItem[];
}) {
  const [items, setItems]           = useState(initialItems);
  const [openPanel, setOpenPanel]   = useState<"shower" | "vanity" | null>(null);
  const [showerHover, setShowerHover] = useState(false);
  const [vanityHover, setVanityHover] = useState(false);

  const purchasedIds = new Set<string>(
    items
      .filter((i) => i.status === "purchased" && i.product_id != null)
      .map((i) => i.product_id as string)
  );

  function toggleItem(productId: string | null) {
    if (!productId) return;
    setItems((prev) =>
      prev.map((item) =>
        item.product_id === productId
          ? { ...item, status: item.status === "purchased" ? "pending" : "purchased" }
          : item
      )
    );
  }

  async function handleShare() {
    const url = `${window.location.origin}/cart/${cartId}`;
    try { await navigator.clipboard.writeText(url); } catch {}
  }

  function handleShopAll() {
    const remaining = items.filter(
      (i) => i.product_type !== "tutorial" && i.product_id != null && !purchasedIds.has(i.product_id as string)
    );
    for (const item of remaining) {
      const url = item.affiliate_url ?? item.seller_url;
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  const showerItems = items.filter((i) => getShelfZone(i) === "shower" && i.product_type !== "tutorial");
  const vanityItems = items.filter((i) => getShelfZone(i) === "vanity" && i.product_type !== "tutorial");
  const purchasable = items.filter((i) => i.product_type !== "tutorial");
  const total = purchasable.reduce((s, i) => s + (i.price_estimate ?? 0) * (i.quantity ?? 1), 0);
  const hasPrice = purchasable.some((i) => i.price_estimate != null);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />

      {/* ═══ ROOM SCENE ═══ */}
      <div style={{ position: "relative", width: "100%", maxWidth: 1100, margin: "0 auto", userSelect: "none" }}>
        <svg
          viewBox="0 0 1100 580"
          xmlns="http://www.w3.org/2000/svg"
          style={{ display: "block", width: "100%", height: "auto" }}
          aria-hidden="true"
        >
          <defs>
            {/* Marble patterns */}
            <pattern id="bs-marble-floor" patternUnits="userSpaceOnUse" width="130" height="130">
              <rect width="130" height="130" fill="#EDE8DF"/>
              <path d="M0 32 Q32 26 65 38 Q98 50 130 42" stroke="rgba(182,165,142,0.5)" strokeWidth="1.1" fill="none"/>
              <path d="M0 88 Q40 80 80 92 Q105 100 130 86" stroke="rgba(168,148,122,0.38)" strokeWidth="0.8" fill="none"/>
              <path d="M18 0 Q24 45 16 85 Q12 108 20 130" stroke="rgba(178,160,135,0.3)" strokeWidth="0.7" fill="none"/>
              <path d="M80 0 Q84 38 76 78 Q72 102 80 130" stroke="rgba(172,154,128,0.22)" strokeWidth="0.5" fill="none"/>
              <line x1="0"   y1="0" x2="0"   y2="130" stroke="rgba(205,195,178,0.75)" strokeWidth="1.5"/>
              <line x1="130" y1="0" x2="130" y2="130" stroke="rgba(205,195,178,0.75)" strokeWidth="1.5"/>
              <line x1="0" y1="0"   x2="130" y2="0"   stroke="rgba(205,195,178,0.75)" strokeWidth="1.5"/>
              <line x1="0" y1="130" x2="130" y2="130" stroke="rgba(205,195,178,0.75)" strokeWidth="1.5"/>
            </pattern>
            <pattern id="bs-marble-wall" patternUnits="userSpaceOnUse" width="220" height="180">
              <rect width="220" height="180" fill="#F3EFE9"/>
              <path d="M0 52 Q55 42 110 60 Q165 78 220 66" stroke="rgba(175,155,128,0.52)" strokeWidth="1.3" fill="none"/>
              <path d="M0 128 Q65 116 130 130 Q175 140 220 122" stroke="rgba(165,145,118,0.38)" strokeWidth="0.95" fill="none"/>
              <path d="M32 0 Q40 68 28 128 Q24 155 34 180" stroke="rgba(178,160,135,0.28)" strokeWidth="1" fill="none"/>
              <path d="M145 0 Q152 55 140 115 Q136 148 144 180" stroke="rgba(172,152,126,0.2)" strokeWidth="0.72" fill="none"/>
              <path d="M0 86 Q50 80 100 90 Q155 100 220 84" stroke="rgba(190,175,152,0.22)" strokeWidth="0.5" fill="none"/>
              <line x1="0" y1="90"  x2="220" y2="90"  stroke="rgba(200,190,172,0.5)" strokeWidth="0.8"/>
              <line x1="110" y1="0" x2="110" y2="180" stroke="rgba(200,190,172,0.4)" strokeWidth="0.8"/>
            </pattern>

            {/* Gradients */}
            <linearGradient id="bs-brass-h" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#7A5C28"/>
              <stop offset="28%"  stopColor="#C4A462"/>
              <stop offset="55%"  stopColor="#E8D090"/>
              <stop offset="80%"  stopColor="#C4A462"/>
              <stop offset="100%" stopColor="#9A7238"/>
            </linearGradient>
            <linearGradient id="bs-brass-v" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%"   stopColor="#E8D090"/>
              <stop offset="45%"  stopColor="#C4A462"/>
              <stop offset="100%" stopColor="#7A5C28"/>
            </linearGradient>
            <linearGradient id="bs-ceiling" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%"   stopColor="#FEFCF8"/>
              <stop offset="100%" stopColor="#F2EDE4"/>
            </linearGradient>
            {/* Left wall (vanity side) — slightly warmer, lit from center */}
            <linearGradient id="bs-left-wall-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="rgba(42,36,32,0.18)"/>
              <stop offset="40%"  stopColor="rgba(42,36,32,0.04)"/>
              <stop offset="100%" stopColor="rgba(42,36,32,0.0)"/>
            </linearGradient>
            {/* Right wall (tub side) */}
            <linearGradient id="bs-right-wall-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="rgba(42,36,32,0.0)"/>
              <stop offset="60%"  stopColor="rgba(42,36,32,0.04)"/>
              <stop offset="100%" stopColor="rgba(42,36,32,0.2)"/>
            </linearGradient>
            <radialGradient id="bs-chandelier-glow" cx="50%" cy="0%" r="55%">
              <stop offset="0%"   stopColor="rgba(255,248,218,0.72)"/>
              <stop offset="50%"  stopColor="rgba(255,248,218,0.18)"/>
              <stop offset="100%" stopColor="rgba(255,248,218,0)"/>
            </radialGradient>
            <radialGradient id="bs-floor-glow" cx="50%" cy="10%" r="70%">
              <stop offset="0%"   stopColor="rgba(255,252,242,0.6)"/>
              <stop offset="100%" stopColor="rgba(220,210,192,0)"/>
            </radialGradient>
            <linearGradient id="bs-glass" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="rgba(195,218,228,0.07)"/>
              <stop offset="22%"  stopColor="rgba(218,235,242,0.19)"/>
              <stop offset="50%"  stopColor="rgba(228,242,248,0.28)"/>
              <stop offset="78%"  stopColor="rgba(210,228,236,0.15)"/>
              <stop offset="100%" stopColor="rgba(195,215,225,0.06)"/>
            </linearGradient>
            <linearGradient id="bs-glass-sheen" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%"   stopColor="rgba(255,255,255,0.22)"/>
              <stop offset="35%"  stopColor="rgba(255,255,255,0.08)"/>
              <stop offset="100%" stopColor="rgba(255,255,255,0.02)"/>
            </linearGradient>
            <linearGradient id="bs-tub" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%"   stopColor="#FFFFFF"/>
              <stop offset="40%"  stopColor="#F8F6F2"/>
              <stop offset="80%"  stopColor="#EDEAE4"/>
              <stop offset="100%" stopColor="#D6D0C6"/>
            </linearGradient>
            <linearGradient id="bs-mirror-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="rgba(228,238,245,0.55)"/>
              <stop offset="38%"  stopColor="rgba(205,220,232,0.22)"/>
              <stop offset="65%"  stopColor="rgba(215,228,238,0.3)"/>
              <stop offset="100%" stopColor="rgba(220,232,240,0.5)"/>
            </linearGradient>
            <linearGradient id="bs-cabinet" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%"   stopColor="#EAE4DA"/>
              <stop offset="100%" stopColor="#CEC6BA"/>
            </linearGradient>
            <pattern id="bs-flute" patternUnits="userSpaceOnUse" width="11" height="1">
              <rect width="11" height="1" fill="#D4CCC0"/>
              <rect x="0"   width="1.5" height="1" fill="rgba(255,255,255,0.32)"/>
              <rect x="4.5" width="2"   height="1" fill="rgba(0,0,0,0.07)"/>
            </pattern>

            {/* Filters */}
            <filter id="bs-glow">
              <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="rgba(228,201,138,0.65)"/>
            </filter>
            <filter id="bs-soft-shadow">
              <feDropShadow dx="0" dy="5" stdDeviation="10" floodColor="rgba(42,36,32,0.18)"/>
            </filter>
            <filter id="bs-deep-shadow">
              <feDropShadow dx="0" dy="8" stdDeviation="16" floodColor="rgba(42,36,32,0.25)"/>
            </filter>

            {/* Clip paths */}
            <clipPath id="bs-left-wall-clip">
              {/* Left wall polygon: top-left corner to vanishing point center */}
              <polygon points="0,0 340,0 340,580 0,580"/>
            </clipPath>
            <clipPath id="bs-shower-glass-clip">
              <rect x="390" y="82" width="310" height="298"/>
            </clipPath>
          </defs>

          {/* ════════════════════════════════════════════════
              PANORAMIC ROOM — two-point perspective
              Vanishing point left ~x=340, right ~x=760
              Horizon line y≈200
              Left wall: vanity + mirror (x 0–340)
              Back wall: shower (x 340–700)
              Right wall: tub + plant (x 700–1100)
          ════════════════════════════════════════════════ */}

          {/* ── CEILING ── */}
          <rect x="0" y="0" width="1100" height="160" fill="url(#bs-ceiling)"/>
          {/* Crown moulding */}
          <line x1="0" y1="155" x2="1100" y2="155" stroke="#E0D8CE" strokeWidth="6"/>
          <line x1="0" y1="159" x2="1100" y2="159" stroke="rgba(175,160,138,0.4)" strokeWidth="1"/>
          {/* Left wall ceiling edge (recedes from top-left to vanishing point) */}
          <line x1="0" y1="0" x2="340" y2="40" stroke="rgba(200,190,172,0.4)" strokeWidth="1"/>
          {/* Right wall ceiling edge */}
          <line x1="1100" y1="0" x2="760" y2="40" stroke="rgba(200,190,172,0.4)" strokeWidth="1"/>

          {/* Chandelier */}
          <rect x="546" y="0" width="8" height="38" fill="url(#bs-brass-v)"/>
          <ellipse cx="550" cy="40" rx="20" ry="9" fill="url(#bs-brass-h)" filter="url(#bs-glow)"/>
          <line x1="550" y1="40" x2="400" y2="72" stroke="url(#bs-brass-h)" strokeWidth="4"/>
          <line x1="550" y1="40" x2="700" y2="72" stroke="url(#bs-brass-h)" strokeWidth="4"/>
          <line x1="550" y1="40" x2="470" y2="84" stroke="url(#bs-brass-h)" strokeWidth="3"/>
          <line x1="550" y1="40" x2="630" y2="84" stroke="url(#bs-brass-h)" strokeWidth="3"/>
          <line x1="550" y1="40" x2="550" y2="80" stroke="url(#bs-brass-v)" strokeWidth="4"/>
          <g filter="url(#bs-glow)">
            <circle cx="400" cy="80" r="11" fill="#FFF8E8" stroke="#C8A86A" strokeWidth="1.5"/>
            <circle cx="700" cy="80" r="11" fill="#FFF8E8" stroke="#C8A86A" strokeWidth="1.5"/>
            <circle cx="470" cy="92" r="9"  fill="#FFF8E8" stroke="#C8A86A" strokeWidth="1.5"/>
            <circle cx="630" cy="92" r="9"  fill="#FFF8E8" stroke="#C8A86A" strokeWidth="1.5"/>
            <circle cx="550" cy="88" r="10" fill="#FFF8E8" stroke="#C8A86A" strokeWidth="1.5"/>
          </g>
          {/* Warm ceiling glow from chandelier */}
          <ellipse cx="550" cy="0" rx="420" ry="210" fill="url(#bs-chandelier-glow)"/>

          {/* ── BACK WALL (straight on, x 340–700) ── */}
          <rect x="340" y="40" width="360" height="380" fill="url(#bs-marble-wall)"/>

          {/* ── LEFT WALL (receding, x 0–340) ── */}
          {/* Left wall recedes from floor-level corner at (340,420) up to ceiling at (340,40) */}
          <polygon points="0,0 340,40 340,420 0,580" fill="url(#bs-marble-wall)"/>
          {/* Shading to emphasize it's a different plane */}
          <polygon points="0,0 340,40 340,420 0,580" fill="url(#bs-left-wall-grad)"/>

          {/* ── RIGHT WALL (receding, x 700–1100) ── */}
          <polygon points="700,40 1100,0 1100,580 700,420" fill="url(#bs-marble-wall)"/>
          <polygon points="700,40 1100,0 1100,580 700,420" fill="url(#bs-right-wall-grad)"/>

          {/* ── FLOOR ── */}
          {/* Floor trapezoid with perspective */}
          <polygon points="0,580 1100,580 700,420 340,420" fill="url(#bs-marble-floor)"/>
          {/* Floor perspective lines converging to back corners */}
          <line x1="0"    y1="580" x2="340" y2="420" stroke="rgba(198,185,165,0.5)" strokeWidth="1.2"/>
          <line x1="1100" y1="580" x2="700" y2="420" stroke="rgba(198,185,165,0.5)" strokeWidth="1.2"/>
          <line x1="220"  y1="580" x2="340" y2="420" stroke="rgba(198,185,165,0.3)" strokeWidth="0.8"/>
          <line x1="880"  y1="580" x2="700" y2="420" stroke="rgba(198,185,165,0.3)" strokeWidth="0.8"/>
          {/* Floor glow */}
          <ellipse cx="550" cy="500" rx="440" ry="90" fill="url(#bs-floor-glow)"/>
          {/* Wall-floor junction lines */}
          <line x1="340" y1="420" x2="700" y2="420" stroke="rgba(192,180,160,0.6)" strokeWidth="1.5"/>
          <line x1="0"   y1="580" x2="340" y2="420" stroke="rgba(188,175,155,0.5)" strokeWidth="1.2"/>
          <line x1="700" y1="420" x2="1100" y2="580" stroke="rgba(188,175,155,0.5)" strokeWidth="1.2"/>

          {/* ══════════════════════
              LEFT WALL — VANITY
          ══════════════════════ */}

          {/* Mirror on left wall — large, brass-framed, foreshortened */}
          {/* Mirror face (foreshortened trapezoid) */}
          <polygon points="30,65 275,82 275,268 30,255" fill="url(#bs-mirror-grad)"/>
          {/* Mirror reflection streak */}
          <polygon points="45,68 80,70 72,250 38,248" fill="rgba(255,255,255,0.14)"/>
          {/* Brass frame */}
          <polygon points="30,65 275,82 275,268 30,255" fill="none" stroke="url(#bs-brass-h)" strokeWidth="5"/>
          {/* Inner bevel */}
          <polygon points="38,70 268,86 268,263 38,251" fill="none" stroke="rgba(228,205,152,0.3)" strokeWidth="1.5"/>
          {/* Sconce left of mirror */}
          <line x1="22" y1="135" x2="28" y2="137" stroke="url(#bs-brass-h)" strokeWidth="3"/>
          <ellipse cx="20" cy="134" rx="7" ry="9" fill="rgba(255,250,220,0.65)" stroke="#C8A86A" strokeWidth="1"/>
          <ellipse cx="20" cy="134" rx="5" ry="7" fill="rgba(255,252,232,0.9)" filter="url(#bs-glow)"/>

          {/* Vanity counter — foreshortened, on left wall */}
          {/* Counter top (marble slab) */}
          <polygon points="0,310 310,282 310,298 0,328" fill="url(#bs-marble-wall)"/>
          <polygon points="0,308 310,280 310,284 0,312" fill="rgba(255,255,255,0.45)"/>
          {/* Cabinet body */}
          <polygon points="0,328 310,298 310,390 0,420" fill="url(#bs-cabinet)"/>
          <polygon points="0,328 310,298 310,390 0,420" fill="url(#bs-flute)"/>
          {/* Hover highlight on vanity */}
          <polygon points="0,308 310,280 310,390 0,420"
            fill={vanityHover ? "rgba(200,168,106,0.09)" : "rgba(200,168,106,0)"}
            style={{ transition: "fill 0.3s", pointerEvents: "none" }}
          />
          {/* Cabinet door gap */}
          <line x1="155" y1="298" x2="155" y2="389" stroke="rgba(185,172,152,0.65)" strokeWidth="1.2"/>
          {/* Cabinet pulls */}
          <line x1="68"  y1="336" x2="90"  y2="335" stroke="url(#bs-brass-h)" strokeWidth="3.5" strokeLinecap="round"/>
          <line x1="195" y1="332" x2="217" y2="331" stroke="url(#bs-brass-h)" strokeWidth="3.5" strokeLinecap="round"/>
          {/* Bottom edge brass strip */}
          <polygon points="0,420 310,390 312,395 0,425" fill="url(#bs-brass-h)" opacity="0.6"/>
          {/* Cabinet legs */}
          <rect x="8"   y="420" width="9" height="22" rx="3" fill="url(#bs-brass-v)"/>
          <rect x="286" y="393" width="9" height="20" rx="3" fill="url(#bs-brass-v)"/>

          {/* Vessel sink (on counter) */}
          <ellipse cx="175" cy="289" rx="44" ry="10" fill="#CBC4BA"/>
          <ellipse cx="175" cy="287" rx="42" ry="8"  fill="#EDE8E0"/>
          <ellipse cx="175" cy="286" rx="36" ry="6"  fill="rgba(195,220,235,0.22)"/>
          {/* Faucet */}
          <rect x="172" y="260" width="5" height="27" rx="2" fill="url(#bs-brass-v)" filter="url(#bs-soft-shadow)"/>
          <rect x="166" y="260" width="17" height="4" rx="2" fill="url(#bs-brass-h)"/>

          {/* Accessories on counter */}
          <rect x="40"  y="300" width="11" height="17" rx="2" fill="#2A3832"/>
          <rect x="43"  y="295" width="8"  height="7"  rx="2" fill="#2A3832"/>
          <rect x="58"  y="302" width="10" height="14" rx="2" fill="#2A3832" opacity="0.9"/>
          <ellipse cx="260" cy="290" rx="8" ry="3" fill="#D0C8B8" stroke="#C8A86A" strokeWidth="1"/>

          {/* ══════════════════════
              BACK WALL — SHOWER
          ══════════════════════ */}

          {/* Shower alcove recess */}
          <rect x="368" y="60" width="304" height="368" fill="rgba(42,36,32,0.1)"/>
          <rect x="372" y="64" width="296" height="362" fill="#EDE8DF"/>
          {/* Interior marble */}
          <rect x="374" y="66" width="292" height="356" fill="url(#bs-marble-wall)" opacity="0.82"/>

          {/* Shower glass — 3 panes, full height from rail to floor */}
          {/* Top brass rail */}
          <rect x="372" y="64" width="296" height="8" fill="url(#bs-brass-h)" opacity="0.95"/>
          {/* Panel 1 */}
          <rect x="372" y="72" width="97"  height="348" fill="url(#bs-glass)"/>
          <rect x="372" y="72" width="97"  height="348" fill="url(#bs-glass-sheen)"/>
          <line x1="468" y1="72"  x2="468" y2="420" stroke="rgba(255,255,255,0.65)" strokeWidth="1.5"/>
          <rect x="372" y="72" width="97"  height="348" fill="none" stroke="url(#bs-brass-v)" strokeWidth="2"/>
          {/* Panel 2 */}
          <rect x="471" y="72" width="97"  height="348" fill="url(#bs-glass)"/>
          <rect x="471" y="72" width="97"  height="348" fill="url(#bs-glass-sheen)"/>
          <line x1="567" y1="72"  x2="567" y2="420" stroke="rgba(255,255,255,0.65)" strokeWidth="1.5"/>
          <rect x="471" y="72" width="97"  height="348" fill="none" stroke="url(#bs-brass-v)" strokeWidth="2"/>
          {/* Panel 3 */}
          <rect x="570" y="72" width="97"  height="348" fill="url(#bs-glass)"/>
          <rect x="570" y="72" width="97"  height="348" fill="url(#bs-glass-sheen)"/>
          <line x1="666" y1="72"  x2="666" y2="420" stroke="rgba(255,255,255,0.55)" strokeWidth="1.2"/>
          <rect x="570" y="72" width="97"  height="348" fill="none" stroke="url(#bs-brass-v)" strokeWidth="2"/>

          {/* Door handles */}
          <rect x="460" y="220" width="10" height="50" rx="5" fill="url(#bs-brass-v)" filter="url(#bs-glow)"/>
          <rect x="559" y="220" width="10" height="50" rx="5" fill="url(#bs-brass-v)" filter="url(#bs-glow)"/>

          {/* Hover highlight on shower */}
          <rect x="372" y="64" width="296" height="356"
            fill={showerHover ? "rgba(200,168,106,0.08)" : "rgba(200,168,106,0)"}
            style={{ transition: "fill 0.3s", pointerEvents: "none" }}
          />

          {/* Plants inside shower (clipped to glass) */}
          <g opacity="0.45" clipPath="url(#bs-shower-glass-clip)">
            <ellipse cx="420" cy="250" rx="24" ry="50" fill="#6A8858" transform="rotate(7,420,250)"/>
            <ellipse cx="405" cy="230" rx="15" ry="36" fill="#5A7848" transform="rotate(-8,405,230)"/>
            <ellipse cx="635" cy="245" rx="22" ry="46" fill="#648050" transform="rotate(-9,635,245)"/>
            <line x1="420" y1="420" x2="420" y2="265" stroke="#4A6038" strokeWidth="2.5"/>
            <line x1="635" y1="420" x2="635" y2="262" stroke="#4A6038" strokeWidth="2"/>
          </g>

          {/* Niche shelf inside shower */}
          <rect x="490" y="128" width="68" height="96" fill="#D8D2C8"/>
          <rect x="492" y="130" width="64" height="92" fill="#EAE4DC"/>
          <rect x="492" y="130" width="64" height="92" fill="none" stroke="rgba(196,165,100,0.55)" strokeWidth="1.5"/>
          <rect x="492" y="170" width="64" height="3" fill="url(#bs-brass-h)" filter="url(#bs-glow)"/>
          <rect x="492" y="206" width="64" height="3" fill="url(#bs-brass-h)" filter="url(#bs-glow)"/>
          {/* Product silhouettes */}
          <rect x="500" y="148" width="8"  height="22" rx="2" fill="rgba(180,196,205,0.75)"/>
          <rect x="512" y="144" width="10" height="26" rx="2" fill="rgba(195,180,205,0.75)"/>
          <rect x="527" y="150" width="8"  height="20" rx="2" fill="rgba(195,210,200,0.75)"/>
          <rect x="500" y="184" width="8"  height="22" rx="2" fill="rgba(205,195,170,0.75)"/>
          <rect x="514" y="181" width="10" height="25" rx="2" fill="rgba(180,196,205,0.75)"/>
          <rect x="530" y="185" width="8"  height="21" rx="2" fill="rgba(195,180,205,0.75)"/>

          {/* Rain shower head */}
          <rect x="502" y="72"  width="34" height="8" rx="3" fill="url(#bs-brass-h)"/>
          <rect x="517" y="80"  width="4"  height="22" rx="2" fill="url(#bs-brass-v)"/>
          <ellipse cx="519" cy="106" rx="17" ry="5" fill="url(#bs-brass-h)" opacity="0.95" filter="url(#bs-glow)"/>
          {[0,1,2,3,4,5,6,7,8].map(i => (
            <line key={i} x1={508+i*4} y1="111" x2={508+i*4} y2="119"
              stroke="rgba(195,218,228,0.38)" strokeWidth="0.8"/>
          ))}

          {/* Abstract art — left of shower on back wall */}
          <rect x="344" y="78"  width="22" height="2" fill="url(#bs-brass-h)" opacity="0.6"/>
          <rect x="344" y="78"  width="2"  height="310" fill="url(#bs-brass-v)" opacity="0.6"/>
          <rect x="344" y="386" width="22" height="2" fill="url(#bs-brass-h)" opacity="0.6"/>

          {/* ══════════════════════
              RIGHT WALL — BATHTUB
          ══════════════════════ */}

          {/* Freestanding tub — foreshortened on right wall */}
          {/* Shadow on floor */}
          <ellipse cx="895" cy="525" rx="145" ry="22" fill="rgba(42,36,32,0.11)"/>
          {/* Tub outer rim */}
          <ellipse cx="895" cy="488" rx="148" ry="48" fill="#C8C2B8"/>
          {/* Tub body */}
          <ellipse cx="895" cy="484" rx="146" ry="46" fill="url(#bs-tub)" filter="url(#bs-soft-shadow)"/>
          {/* Inner lip */}
          <ellipse cx="895" cy="480" rx="132" ry="36" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="2.5"/>
          {/* Water tint */}
          <ellipse cx="895" cy="484" rx="128" ry="34" fill="rgba(205,222,232,0.16)"/>
          {/* Specular highlight */}
          <path d="M758 474 Q830 466 895 470 Q960 474 1032 470" stroke="rgba(255,255,255,0.5)" strokeWidth="2" fill="none"/>
          {/* End caps */}
          <ellipse cx="750" cy="488" rx="18" ry="44" fill="#DDD8CE"/>
          <ellipse cx="1040" cy="488" rx="18" ry="44" fill="#DDD8CE"/>
          {/* Floor-mount filler (matte black) */}
          <rect x="1030" y="444" width="10" height="52" rx="5" fill="#1E1A18"/>
          <rect x="1024" y="444" width="22" height="7"  rx="3" fill="#1E1A18"/>
          <path d="M1040 448 Q1052 448 1055 462 Q1057 475 1047 482" stroke="#1E1A18" strokeWidth="7" fill="none" strokeLinecap="round"/>
          <path d="M1040 448 Q1052 448 1055 462 Q1057 475 1047 482" stroke="#2E2A28" strokeWidth="3" fill="none" strokeLinecap="round"/>
          <circle cx="1047" cy="482" r="5" fill="#1E1A18" stroke="rgba(200,168,106,0.6)" strokeWidth="1.5"/>

          {/* Tall plant in right corner */}
          <ellipse cx="1070" cy="528" rx="22" ry="8" fill="#B8B0A5"/>
          <line x1="1072" y1="522" x2="1068" y2="340" stroke="#6A7858" strokeWidth="4"/>
          <ellipse cx="1055" cy="358" rx="26" ry="11" fill="#7A9068" transform="rotate(-28,1055,358)"/>
          <ellipse cx="1090" cy="375" rx="28" ry="12" fill="#6A8458" transform="rotate(22,1090,375)"/>
          <ellipse cx="1050" cy="400" rx="24" ry="10" fill="#8A9C72" transform="rotate(-32,1050,400)"/>
          <ellipse cx="1092" cy="418" rx="26" ry="11" fill="#7A8C60" transform="rotate(18,1092,418)"/>
          <ellipse cx="1055" cy="440" rx="22" ry="10" fill="#708858" transform="rotate(-20,1055,440)"/>

          {/* Corner junction line left-to-back wall */}
          <line x1="340" y1="40" x2="340" y2="420" stroke="rgba(188,175,155,0.65)" strokeWidth="2"/>
          {/* Corner junction right-to-back wall */}
          <line x1="700" y1="40" x2="700" y2="420" stroke="rgba(188,175,155,0.65)" strokeWidth="2"/>
        </svg>

        {/* ═══ HOTSPOT BUTTONS ═══ */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          {/* Shower hotspot — back wall, center */}
          <button
            type="button"
            aria-label="Open shower shelf"
            onClick={() => setOpenPanel("shower")}
            onMouseEnter={() => setShowerHover(true)}
            onMouseLeave={() => setShowerHover(false)}
            style={{
              position: "absolute",
              left: "34%", top: "12%", width: "27%", height: "62%",
              pointerEvents: "all", cursor: "pointer",
              background: "none", border: "none", padding: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <HotspotRing label="tap to open" />
          </button>
          {/* Vanity hotspot — left wall */}
          <button
            type="button"
            aria-label="Open vanity cabinet"
            onClick={() => setOpenPanel("vanity")}
            onMouseEnter={() => setVanityHover(true)}
            onMouseLeave={() => setVanityHover(false)}
            style={{
              position: "absolute",
              left: "0%", top: "48%", width: "28%", height: "36%",
              pointerEvents: "all", cursor: "pointer",
              background: "none", border: "none", padding: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <HotspotRing label="tap to open" />
          </button>
        </div>
      </div>

      {/* ═══ PANELS ═══ */}
      <ShelfPanel
        open={openPanel === "shower"}
        title="In the shower"
        subtitle="shampoo · conditioner · treatments"
        icon={
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3">
            <path d="M4 16 Q4 8 10 6 Q16 4 16 10"/>
            <line x1="4" y1="16" x2="16" y2="16"/>
            <circle cx="10" cy="4" r="1.5"/>
          </svg>
        }
        items={showerItems}
        purchasedIds={purchasedIds}
        onToggle={toggleItem}
        onClose={() => setOpenPanel(null)}
      />
      <ShelfPanel
        open={openPanel === "vanity"}
        title="At the vanity"
        subtitle="leave-in · stylers · oils"
        icon={
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3">
            <rect x="3" y="10" width="14" height="7" rx="1"/>
            <rect x="6" y="3" width="8" height="7" rx="0.5"/>
          </svg>
        }
        items={vanityItems}
        purchasedIds={purchasedIds}
        onToggle={toggleItem}
        onClose={() => setOpenPanel(null)}
      />

      {/* ═══ FOOTER ═══ */}
      {purchasable.length > 0 && (
        <div style={{
          marginTop: 20,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: 12,
          padding: "16px 20px",
          background: "rgba(42,36,32,0.03)",
          borderRadius: 14,
        }}>
          <div>
            {hasPrice && (
              <div style={{ fontSize: 20, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
                ${total.toFixed(2)}
              </div>
            )}
            <div style={{ fontSize: 12, color: "#7A6E64" }}>
              {purchasedIds.size} of {purchasable.length} products checked off
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button" onClick={handleShare}
              style={{
                padding: "10px 20px", borderRadius: 100,
                border: "1.5px solid rgba(120,110,100,0.3)",
                background: "none", cursor: "pointer",
                fontSize: 13, fontWeight: 500, fontFamily: "inherit",
                color: "inherit",
              }}
            >
              Share shelf
            </button>
            <button
              type="button" onClick={handleShopAll}
              style={{
                padding: "10px 20px", borderRadius: 100,
                border: "none",
                background: "#2A2420", color: "#F8F5F0",
                cursor: "pointer", fontSize: 13, fontWeight: 500, fontFamily: "inherit",
              }}
            >
              Shop all
            </button>
          </div>
        </div>
      )}
    </>
  );
}
