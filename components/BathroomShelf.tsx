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
      <div style={{ position: "relative", width: "100%", maxWidth: 900, margin: "0 auto", userSelect: "none" }}>
        <svg
          viewBox="0 0 900 560"
          xmlns="http://www.w3.org/2000/svg"
          style={{ display: "block", width: "100%", height: "auto" }}
          aria-hidden="true"
        >
          <defs>
            {/* ── Marble floor with grout lines ── */}
            <pattern id="bs-marble-floor" patternUnits="userSpaceOnUse" width="140" height="140" patternTransform="skewX(-6)">
              <rect width="140" height="140" fill="#EEE8DF"/>
              {/* Primary veining */}
              <path d="M0 35 Q28 28 56 42 Q84 55 112 46 Q126 42 140 48" stroke="rgba(185,168,145,0.5)" strokeWidth="1.2" fill="none"/>
              <path d="M0 95 Q35 85 70 100 Q100 112 140 98" stroke="rgba(170,150,125,0.4)" strokeWidth="0.9" fill="none"/>
              <path d="M20 0 Q28 50 18 90 Q14 115 22 140" stroke="rgba(180,162,138,0.35)" strokeWidth="0.8" fill="none"/>
              <path d="M85 0 Q90 40 80 80 Q76 105 84 140" stroke="rgba(175,158,132,0.25)" strokeWidth="0.6" fill="none"/>
              {/* Secondary fine veins */}
              <path d="M0 60 Q40 55 80 65 Q110 72 140 62" stroke="rgba(200,185,165,0.2)" strokeWidth="0.5" fill="none"/>
              {/* Grout lines */}
              <line x1="0" y1="0" x2="0" y2="140" stroke="rgba(210,200,185,0.8)" strokeWidth="1.5"/>
              <line x1="140" y1="0" x2="140" y2="140" stroke="rgba(210,200,185,0.8)" strokeWidth="1.5"/>
              <line x1="0" y1="0" x2="140" y2="0" stroke="rgba(210,200,185,0.8)" strokeWidth="1.5"/>
              <line x1="0" y1="140" x2="140" y2="140" stroke="rgba(210,200,185,0.8)" strokeWidth="1.5"/>
            </pattern>
            {/* ── Marble wall with richer veining ── */}
            <pattern id="bs-marble-wall" patternUnits="userSpaceOnUse" width="220" height="180">
              <rect width="220" height="180" fill="#F4F0EB"/>
              {/* Bold primary vein */}
              <path d="M0 55 Q55 44 110 62 Q165 80 220 68" stroke="rgba(178,158,130,0.55)" strokeWidth="1.4" fill="none"/>
              {/* Medium veins */}
              <path d="M0 125 Q65 112 130 128 Q175 138 220 122" stroke="rgba(168,148,120,0.4)" strokeWidth="1" fill="none"/>
              <path d="M35 0 Q42 70 30 130 Q26 158 36 180" stroke="rgba(182,164,138,0.3)" strokeWidth="1.1" fill="none"/>
              <path d="M140 0 Q148 55 136 115 Q132 148 140 180" stroke="rgba(175,155,128,0.22)" strokeWidth="0.8" fill="none"/>
              {/* Fine hairline veins */}
              <path d="M0 88 Q50 82 100 92 Q155 102 220 88" stroke="rgba(195,180,158,0.25)" strokeWidth="0.5" fill="none"/>
              <path d="M0 20 Q30 16 60 22 Q90 28 110 20" stroke="rgba(188,172,148,0.2)" strokeWidth="0.4" fill="none"/>
              {/* Slab joint lines */}
              <line x1="0" y1="90" x2="220" y2="90" stroke="rgba(205,195,178,0.6)" strokeWidth="0.8"/>
              <line x1="110" y1="0" x2="110" y2="180" stroke="rgba(205,195,178,0.5)" strokeWidth="0.8"/>
            </pattern>
            {/* ── Gradients ── */}
            <radialGradient id="bs-floor-light" cx="45%" cy="20%" r="65%">
              <stop offset="0%" stopColor="rgba(255,252,242,0.7)"/>
              <stop offset="60%" stopColor="rgba(240,232,218,0.2)"/>
              <stop offset="100%" stopColor="rgba(220,208,190,0)"/>
            </radialGradient>
            <radialGradient id="bs-chandelier-glow" cx="50%" cy="0%" r="55%">
              <stop offset="0%" stopColor="rgba(255,248,218,0.75)"/>
              <stop offset="50%" stopColor="rgba(255,248,218,0.2)"/>
              <stop offset="100%" stopColor="rgba(255,248,218,0)"/>
            </radialGradient>
            <radialGradient id="bs-room-ambient" cx="50%" cy="40%" r="55%">
              <stop offset="0%" stopColor="rgba(255,250,235,0.3)"/>
              <stop offset="100%" stopColor="rgba(255,250,235,0)"/>
            </radialGradient>
            <linearGradient id="bs-left-shadow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(42,36,32,0.18)"/>
              <stop offset="100%" stopColor="rgba(42,36,32,0)"/>
            </linearGradient>
            <linearGradient id="bs-right-shadow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(42,36,32,0)"/>
              <stop offset="100%" stopColor="rgba(42,36,32,0.14)"/>
            </linearGradient>
            <linearGradient id="bs-ceiling-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FDFAF6"/>
              <stop offset="100%" stopColor="#F5F0E8"/>
            </linearGradient>
            <linearGradient id="bs-brass-h" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#7A5C28"/>
              <stop offset="25%"  stopColor="#C4A462"/>
              <stop offset="55%"  stopColor="#E8D090"/>
              <stop offset="80%"  stopColor="#C4A462"/>
              <stop offset="100%" stopColor="#9A7238"/>
            </linearGradient>
            <linearGradient id="bs-brass-v" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%"   stopColor="#E8D090"/>
              <stop offset="40%"  stopColor="#C4A462"/>
              <stop offset="100%" stopColor="#7A5C28"/>
            </linearGradient>
            <linearGradient id="bs-tub" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%"   stopColor="#FFFFFF"/>
              <stop offset="35%"  stopColor="#F8F6F2"/>
              <stop offset="75%"  stopColor="#EDEAE4"/>
              <stop offset="100%" stopColor="#D8D2C8"/>
            </linearGradient>
            <linearGradient id="bs-tub-side" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"  stopColor="#E0DAD0"/>
              <stop offset="100%" stopColor="#C8C2B8"/>
            </linearGradient>
            <linearGradient id="bs-mirror" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"  stopColor="rgba(228,238,245,0.55)"/>
              <stop offset="35%" stopColor="rgba(205,220,232,0.22)"/>
              <stop offset="65%" stopColor="rgba(215,228,238,0.3)"/>
              <stop offset="100%" stopColor="rgba(220,232,240,0.45)"/>
            </linearGradient>
            {/* Glass: subtle blue-grey tint with vertical highlight streak */}
            <linearGradient id="bs-glass" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="rgba(195,218,228,0.08)"/>
              <stop offset="20%"  stopColor="rgba(218,235,242,0.18)"/>
              <stop offset="45%"  stopColor="rgba(228,242,248,0.26)"/>
              <stop offset="70%"  stopColor="rgba(210,228,236,0.14)"/>
              <stop offset="100%" stopColor="rgba(195,215,225,0.07)"/>
            </linearGradient>
            <linearGradient id="bs-glass-sheen" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%"   stopColor="rgba(255,255,255,0.18)"/>
              <stop offset="30%"  stopColor="rgba(255,255,255,0.08)"/>
              <stop offset="100%" stopColor="rgba(255,255,255,0.03)"/>
            </linearGradient>
            <linearGradient id="bs-cabinet" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%"   stopColor="#EAE4DA"/>
              <stop offset="100%" stopColor="#CEC6BA"/>
            </linearGradient>
            <pattern id="bs-flute" patternUnits="userSpaceOnUse" width="11" height="1">
              <rect width="11" height="1" fill="#D6CEC2"/>
              <rect x="0" width="1.5" height="1" fill="rgba(255,255,255,0.32)"/>
              <rect x="4.5" width="2" height="1" fill="rgba(0,0,0,0.07)"/>
            </pattern>
            <filter id="bs-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="10"/>
              <feOffset dx="0" dy="8"/>
              <feComposite in2="SourceGraphic"/>
              <feBlend in="SourceGraphic" mode="normal"/>
              <feDropShadow dx="0" dy="8" stdDeviation="14" floodColor="rgba(42,36,32,0.22)"/>
            </filter>
            <filter id="bs-soft-shadow">
              <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="rgba(42,36,32,0.15)"/>
            </filter>
            <filter id="bs-brass-glow">
              <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="rgba(228,201,138,0.6)"/>
            </filter>
            {/* Clip path for shower glass interior */}
            <clipPath id="bs-shower-clip">
              <rect x="244" y="110" width="292" height="246"/>
            </clipPath>
          </defs>

          {/* ── Ceiling ── */}
          <rect x="0" y="0" width="900" height="150" fill="url(#bs-ceiling-grad)"/>
          {/* Crown moulding */}
          <rect x="0" y="145" width="900" height="6" fill="#E8E2D8"/>
          <rect x="0" y="149" width="900" height="2" fill="rgba(180,165,142,0.5)"/>

          {/* ── Back wall (Calacatta marble) ── */}
          <rect x="0" y="0" width="900" height="360" fill="url(#bs-marble-wall)"/>
          {/* Ambient chandelier glow on wall */}
          <ellipse cx="450" cy="0" rx="380" ry="200" fill="url(#bs-chandelier-glow)"/>
          {/* Room ambient fill */}
          <ellipse cx="450" cy="200" rx="380" ry="220" fill="url(#bs-room-ambient)"/>
          {/* Left edge darkening (perspective corner shadow) */}
          <rect x="0" y="0" width="80" height="560" fill="url(#bs-left-shadow)"/>
          {/* Right edge darkening */}
          <rect x="820" y="0" width="80" height="560" fill="url(#bs-right-shadow)"/>

          {/* ── Floor (perspective marble tiles) ── */}
          <polygon points="0,352 900,352 900,560 0,560" fill="url(#bs-marble-floor)"/>
          {/* Floor perspective: tiles appear to converge */}
          <line x1="450" y1="352" x2="0"   y2="560" stroke="rgba(200,188,170,0.35)" strokeWidth="1"/>
          <line x1="450" y1="352" x2="225"  y2="560" stroke="rgba(200,188,170,0.25)" strokeWidth="0.8"/>
          <line x1="450" y1="352" x2="675"  y2="560" stroke="rgba(200,188,170,0.25)" strokeWidth="0.8"/>
          <line x1="450" y1="352" x2="900"  y2="560" stroke="rgba(200,188,170,0.35)" strokeWidth="1"/>
          {/* Horizontal floor grout lines receding */}
          <line x1="0" y1="395" x2="900" y2="395" stroke="rgba(205,195,178,0.4)" strokeWidth="0.8"/>
          <line x1="0" y1="445" x2="900" y2="445" stroke="rgba(205,195,178,0.4)" strokeWidth="0.8"/>
          <line x1="0" y1="500" x2="900" y2="500" stroke="rgba(205,195,178,0.4)" strokeWidth="0.8"/>
          {/* Floor light pool from chandelier */}
          <ellipse cx="450" cy="455" rx="380" ry="100" fill="url(#bs-floor-light)"/>
          {/* Baseboard — continuous strip; shower glass sits in front of it */}
          <rect x="0" y="348" width="900" height="8" fill="#E0D8CE"/>
          <rect x="0" y="354" width="900" height="3" fill="url(#bs-brass-h)" opacity="0.45"/>

          {/* Chandelier */}
          <rect x="446" y="0" width="8" height="40" fill="url(#bs-brass-v)"/>
          <ellipse cx="450" cy="42" rx="18" ry="8" fill="url(#bs-brass-h)" filter="url(#bs-brass-glow)"/>
          <line x1="450" y1="42" x2="310" y2="75" stroke="url(#bs-brass-h)" strokeWidth="4"/>
          <line x1="450" y1="42" x2="590" y2="75" stroke="url(#bs-brass-h)" strokeWidth="4"/>
          <line x1="450" y1="42" x2="380" y2="88" stroke="url(#bs-brass-h)" strokeWidth="3"/>
          <line x1="450" y1="42" x2="520" y2="88" stroke="url(#bs-brass-h)" strokeWidth="3"/>
          <line x1="450" y1="42" x2="450" y2="82" stroke="url(#bs-brass-v)" strokeWidth="4"/>
          <g filter="url(#bs-brass-glow)">
            <circle cx="310" cy="82" r="10" fill="#FFF8E8" stroke="#C8A86A" strokeWidth="1.5"/>
            <circle cx="590" cy="82" r="10" fill="#FFF8E8" stroke="#C8A86A" strokeWidth="1.5"/>
            <circle cx="380" cy="96" r="8"  fill="#FFF8E8" stroke="#C8A86A" strokeWidth="1.5"/>
            <circle cx="520" cy="96" r="8"  fill="#FFF8E8" stroke="#C8A86A" strokeWidth="1.5"/>
            <circle cx="450" cy="90" r="9"  fill="#FFF8E8" stroke="#C8A86A" strokeWidth="1.5"/>
          </g>

          {/* Artwork */}
          <rect x="30" y="80" width="160" height="210" fill="#2A2420" rx="2"/>
          <rect x="34" y="84" width="152" height="202" fill="#D4B8A8"/>
          <path d="M34 84 Q80 110 110 90 Q140 70 186 100 L186 180 Q150 160 110 185 Q70 210 34 190 Z" fill="#C4A898" opacity="0.7"/>
          <path d="M60 130 Q95 115 130 135 Q160 150 186 140 L186 240 Q155 225 120 245 Q80 260 34 240 L34 180 Z" fill="#B89888" opacity="0.5"/>
          <ellipse cx="100" cy="150" rx="45" ry="60" fill="rgba(220,180,170,0.4)"/>
          <path d="M85 110 Q95 105 110 115 Q118 130 112 155 Q105 175 95 180 Q85 175 80 155 Q75 135 85 110" fill="rgba(210,175,165,0.5)"/>
          <ellipse cx="160" cy="100" rx="20" ry="15" fill="rgba(100,130,100,0.3)" transform="rotate(-20,160,100)"/>
          <rect x="30" y="80" width="160" height="210" fill="none" stroke="url(#bs-brass-h)" strokeWidth="4" rx="2"/>

          {/* ── Shower alcove ── */}
          {/* Alcove recess shadow around opening */}
          <rect x="238" y="98" width="306" height="258" fill="rgba(42,36,32,0.14)" rx="2"/>
          <rect x="242" y="102" width="298" height="254" fill="#EDE8DF"/>
          {/* Interior marble wall fills full alcove height */}
          <rect x="244" y="104" width="292" height="252" fill="url(#bs-marble-wall)" opacity="0.85"/>
          {/* Steam / humidity haze */}
          <rect x="244" y="110" width="292" height="246" fill="rgba(228,238,245,0.08)"/>

          {/* ── Shower glass panels — run full height, no floor track ── */}
          {/* Panel 1 */}
          <rect x="244" y="110" width="96" height="246" fill="url(#bs-glass)"/>
          <rect x="244" y="110" width="96" height="246" fill="url(#bs-glass-sheen)"/>
          <line x1="339" y1="110" x2="339" y2="356" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"/>
          <rect x="244" y="110" width="96" height="246" fill="none" stroke="url(#bs-brass-v)" strokeWidth="2"/>
          {/* Panel 2 */}
          <rect x="342" y="110" width="96" height="246" fill="url(#bs-glass)"/>
          <rect x="342" y="110" width="96" height="246" fill="url(#bs-glass-sheen)"/>
          <line x1="437" y1="110" x2="437" y2="356" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"/>
          <rect x="342" y="110" width="96" height="246" fill="none" stroke="url(#bs-brass-v)" strokeWidth="2"/>
          {/* Panel 3 */}
          <rect x="440" y="110" width="96" height="246" fill="url(#bs-glass)"/>
          <rect x="440" y="110" width="96" height="246" fill="url(#bs-glass-sheen)"/>
          <line x1="535" y1="110" x2="535" y2="356" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2"/>
          <rect x="440" y="110" width="96" height="246" fill="none" stroke="url(#bs-brass-v)" strokeWidth="2"/>
          {/* Top brass rail only */}
          <rect x="242" y="104" width="296" height="8" fill="url(#bs-brass-h)" opacity="0.95" rx="1"/>

          {/* Hover highlight on shower */}
          <rect x="244" y="110" width="292" height="246"
            fill={showerHover ? "rgba(200,168,106,0.09)" : "rgba(200,168,106,0)"}
            style={{ transition: "fill 0.3s", pointerEvents: "none" }}
          />

          {/* ── Door handles ── */}
          <rect x="334" y="210" width="9" height="44" rx="4" fill="url(#bs-brass-v)" filter="url(#bs-brass-glow)"/>
          <rect x="432" y="210" width="9" height="44" rx="4" fill="url(#bs-brass-v)" filter="url(#bs-brass-glow)"/>

          {/* ── Plants inside shower (visible through glass) ── */}
          <g opacity="0.5" clipPath="url(#bs-shower-clip)">
            <ellipse cx="302" cy="235" rx="26" ry="52" fill="#6A8858" transform="rotate(6,302,235)"/>
            <ellipse cx="285" cy="215" rx="16" ry="38" fill="#5A7848" transform="rotate(-8,285,215)"/>
            <ellipse cx="460" cy="228" rx="22" ry="48" fill="#648050" transform="rotate(-10,460,228)"/>
            <ellipse cx="478" cy="248" rx="14" ry="30" fill="#587248" transform="rotate(5,478,248)"/>
            <line x1="302" y1="356" x2="302" y2="255" stroke="#4A6038" strokeWidth="2.5"/>
            <line x1="460" y1="356" x2="460" y2="262" stroke="#4A6038" strokeWidth="2"/>
          </g>

          {/* ── Marble niche shelf inside ── */}
          {/* Niche recess */}
          <rect x="356" y="150" width="68" height="96" fill="#D8D2C8" rx="1"/>
          <rect x="358" y="152" width="64" height="92" fill="#EAE4DC" rx="1"/>
          <rect x="358" y="152" width="64" height="92" fill="none" stroke="rgba(196,165,100,0.6)" strokeWidth="1.5" rx="1"/>
          {/* Niche shelves */}
          <rect x="358" y="192" width="64" height="3" rx="1" fill="url(#bs-brass-h)" filter="url(#bs-brass-glow)"/>
          <rect x="358" y="228" width="64" height="3" rx="1" fill="url(#bs-brass-h)" filter="url(#bs-brass-glow)"/>
          {/* Product silhouettes on niche shelves */}
          <rect x="366" y="170" width="8" height="22" rx="2" fill="rgba(180,196,205,0.7)"/>
          <rect x="378" y="166" width="10" height="26" rx="2" fill="rgba(195,180,205,0.7)"/>
          <rect x="393" y="172" width="8" height="20" rx="2" fill="rgba(195,210,200,0.7)"/>
          <rect x="366" y="207" width="8" height="21" rx="2" fill="rgba(205,195,170,0.7)"/>
          <rect x="380" y="204" width="10" height="24" rx="2" fill="rgba(180,196,205,0.7)"/>
          <rect x="396" y="208" width="8" height="20" rx="2" fill="rgba(195,180,205,0.7)"/>

          {/* ── Rain shower head (ceiling-mount, sits at top rail level) ── */}
          <rect x="375" y="112" width="30" height="8" rx="3" fill="url(#bs-brass-h)" filter="url(#bs-soft-shadow)"/>
          <rect x="388" y="120" width="4" height="20" rx="2" fill="url(#bs-brass-v)"/>
          <ellipse cx="390" cy="143" rx="16" ry="5" fill="url(#bs-brass-h)" opacity="0.95" filter="url(#bs-brass-glow)"/>
          {/* Rain drops */}
          {[0,1,2,3,4,5,6,7].map(i => (
            <line key={i} x1={380+i*4} y1="148" x2={380+i*4} y2="156"
              stroke="rgba(195,218,228,0.4)" strokeWidth="0.8"/>
          ))}

          {/* ── Freestanding Bathtub ── */}
          {/* Cast shadow on floor */}
          <ellipse cx="390" cy="435" rx="168" ry="18" fill="rgba(42,36,32,0.12)"/>
          {/* Tub outer body — base rim and sides */}
          <ellipse cx="390" cy="395" rx="170" ry="54" fill="#CBC4BA"/>
          {/* Tub outer shape (slight offset for thickness) */}
          <ellipse cx="390" cy="390" rx="168" ry="52" fill="url(#bs-tub)" filter="url(#bs-soft-shadow)"/>
          {/* Tub inner lip highlight */}
          <ellipse cx="390" cy="386" rx="155" ry="42" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="2.5"/>
          {/* Interior water fill (slight blue tint) */}
          <ellipse cx="390" cy="390" rx="152" ry="40" fill="rgba(205,222,232,0.18)"/>
          {/* Specular highlight on tub rim */}
          <path d="M240 376 Q310 368 390 372 Q470 376 540 374" stroke="rgba(255,255,255,0.5)" strokeWidth="2" fill="none"/>
          {/* End caps */}
          <ellipse cx="223" cy="392" rx="20" ry="48" fill="url(#bs-tub-side)"/>
          <ellipse cx="557" cy="392" rx="20" ry="48" fill="url(#bs-tub-side)"/>
          {/* Foot silhouette (subtle) */}
          <ellipse cx="265" cy="440" rx="16" ry="5" fill="rgba(42,36,32,0.15)"/>
          <ellipse cx="515" cy="440" rx="16" ry="5" fill="rgba(42,36,32,0.15)"/>
          {/* Drain */}
          <ellipse cx="390" cy="395" rx="12" ry="5" fill="rgba(42,36,32,0.12)"/>
          <ellipse cx="390" cy="395" rx="10" ry="4" fill="none" stroke="rgba(180,165,140,0.6)" strokeWidth="1"/>
          {/* Floor-mount filler (matte black) */}
          <rect x="542" y="348" width="11" height="58" rx="5" fill="#1E1A18"/>
          <rect x="537" y="348" width="21" height="7" rx="3" fill="#1E1A18"/>
          <path d="M553 352 Q565 350 568 364 Q570 376 560 383" stroke="#1E1A18" strokeWidth="7" fill="none" strokeLinecap="round"/>
          <path d="M553 352 Q565 350 568 364 Q570 376 560 383" stroke="#3A3330" strokeWidth="3" fill="none" strokeLinecap="round"/>
          {/* Water spout highlight */}
          <circle cx="560" cy="383" r="5" fill="#2A2520" stroke="rgba(200,168,106,0.6)" strokeWidth="1.5"/>

          {/* ── Vanity ── */}
          {/* Cabinet shadow on wall */}
          <rect x="612" y="285" width="292" height="92" rx="2" fill="rgba(42,36,32,0.08)"/>
          {/* Marble counter top */}
          <rect x="615" y="278" width="288" height="22" rx="2" fill="url(#bs-marble-wall)"/>
          <rect x="615" y="278" width="288" height="5" rx="1" fill="#EDE8E0"/>
          {/* Counter top highlight edge */}
          <rect x="615" y="278" width="288" height="2" fill="rgba(255,255,255,0.5)"/>
          {/* Cabinet body — fluted panels */}
          <rect x="618" y="298" width="282" height="58" fill="url(#bs-cabinet)"/>
          <rect x="618" y="298" width="282" height="58" fill="url(#bs-flute)"/>
          {/* Hover highlight on cabinet */}
          <rect x="612" y="278" width="292" height="84"
            fill={vanityHover ? "rgba(200,168,106,0.09)" : "rgba(200,168,106,0)"}
            style={{ transition: "fill 0.3s", pointerEvents: "none" }}
          />
          {/* Cabinet bottom edge brass strip */}
          <rect x="618" y="354" width="282" height="4" rx="1" fill="url(#bs-brass-h)" opacity="0.65"/>
          {/* Cabinet legs */}
          <rect x="628" y="356" width="10" height="26" rx="4" fill="url(#bs-brass-v)"/>
          <rect x="880" y="356" width="10" height="26" rx="4" fill="url(#bs-brass-v)"/>
          {/* Door gap line + pulls */}
          <line x1="762" y1="298" x2="762" y2="354" stroke="rgba(188,175,155,0.7)" strokeWidth="1.2"/>
          <rect x="746" y="320" width="13" height="4" rx="2" fill="url(#bs-brass-h)"/>
          <rect x="765" y="320" width="13" height="4" rx="2" fill="url(#bs-brass-h)"/>
          {/* Vessel sink */}
          <ellipse cx="715" cy="287" rx="52" ry="11" fill="#D0C8BE"/>
          <ellipse cx="715" cy="285" rx="50" ry="9" fill="#EDE8E0"/>
          <ellipse cx="715" cy="284" rx="44" ry="7" fill="rgba(195,220,235,0.25)"/>
          <ellipse cx="715" cy="284" rx="44" ry="7" fill="none" stroke="rgba(180,165,142,0.4)" strokeWidth="1"/>
          {/* Tall wall-mount faucet */}
          <rect x="712" y="255" width="6" height="30" rx="3" fill="url(#bs-brass-v)" filter="url(#bs-soft-shadow)"/>
          <rect x="706" y="255" width="18" height="5" rx="2" fill="url(#bs-brass-h)"/>
          <ellipse cx="715" cy="253" rx="8" ry="3" fill="url(#bs-brass-h)" opacity="0.9"/>
          {/* Mirror (larger, grander) */}
          <rect x="622" y="72" width="272" height="202" fill="rgba(240,245,250,0.12)"/>
          <rect x="622" y="72" width="272" height="202" fill="url(#bs-mirror)"/>
          {/* Mirror reflections — bright streaks */}
          <path d="M632 76 L658 76 L648 230" stroke="rgba(255,255,255,0.3)" strokeWidth="1.8" fill="none"/>
          <path d="M855 90 L870 76 L876 100" stroke="rgba(255,255,255,0.18)" strokeWidth="1.2" fill="none"/>
          {/* Mirror brass frame */}
          <rect x="622" y="72" width="272" height="202" fill="none" stroke="url(#bs-brass-h)" strokeWidth="5" rx="1"/>
          {/* Frame inner bevel */}
          <rect x="627" y="77" width="262" height="192" fill="none" stroke="rgba(230,205,155,0.3)" strokeWidth="1.5" rx="1"/>
          {/* Accessories on counter */}
          <rect x="840" y="260" width="16" height="22" rx="3" fill="#2A3832"/>
          <rect x="843" y="254" width="10" height="8" rx="2" fill="#2A3832"/>
          <rect x="844" y="253" width="8" height="3" rx="1" fill="#C8A86A"/>
          <rect x="862" y="263" width="14" height="19" rx="3" fill="#2A3832" opacity="0.9"/>
          <ellipse cx="885" cy="278" rx="10" ry="4" fill="#D0C8B8" stroke="#C8A86A" strokeWidth="1"/>
          <rect x="834" y="276" width="60" height="6" rx="2" fill="url(#bs-brass-h)" opacity="0.7"/>
          {/* Sconce */}
          <rect x="746" y="62" width="4" height="20" fill="url(#bs-brass-v)"/>
          <ellipse cx="748" cy="58" rx="8" ry="10" fill="rgba(255,250,225,0.6)" stroke="#C8A86A" strokeWidth="1"/>
          <ellipse cx="748" cy="58" rx="6" ry="8" fill="rgba(255,252,235,0.9)" filter="url(#bs-brass-glow)"/>
          {/* Plant */}
          <path d="M590 390 Q600 410 580 420 Q570 425 560 420 Q545 410 555 390 Z" fill="#C8C0B0"/>
          <line x1="572" y1="390" x2="572" y2="310" stroke="#6A7858" strokeWidth="3"/>
          <ellipse cx="558" cy="320" rx="22" ry="10" fill="#7A9068" transform="rotate(-25,558,320)"/>
          <ellipse cx="590" cy="335" rx="24" ry="11" fill="#6A8458" transform="rotate(20,590,335)"/>
          <ellipse cx="555" cy="355" rx="20" ry="9" fill="#8A9C72" transform="rotate(-30,555,355)"/>
          <ellipse cx="592" cy="368" rx="22" ry="10" fill="#7A8C60" transform="rotate(15,592,368)"/>
        </svg>

        {/* ═══ HOTSPOT BUTTONS ═══ */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          {/* Shower hotspot */}
          <button
            type="button"
            aria-label="Open shower shelf"
            onClick={() => setOpenPanel("shower")}
            onMouseEnter={() => setShowerHover(true)}
            onMouseLeave={() => setShowerHover(false)}
            style={{
              position: "absolute",
              left: "27%", top: "20%", width: "32%", height: "41%",
              pointerEvents: "all", cursor: "pointer",
              background: "none", border: "none", padding: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <HotspotRing label="tap to open" />
          </button>
          {/* Vanity hotspot */}
          <button
            type="button"
            aria-label="Open vanity cabinet"
            onClick={() => setOpenPanel("vanity")}
            onMouseEnter={() => setVanityHover(true)}
            onMouseLeave={() => setVanityHover(false)}
            style={{
              position: "absolute",
              right: "2%", top: "38%", width: "22%", height: "38%",
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
