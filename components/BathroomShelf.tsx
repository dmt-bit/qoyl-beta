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
      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          position: "fixed", left: 0, right: 0, bottom: 0,
          maxHeight: "85vh",
          background: "#F8F5F0",
          borderRadius: "24px 24px 0 0",
          display: "flex", flexDirection: "column",
          transform: open ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.45s cubic-bezier(0.32,0.72,0,1)",
          zIndex: 201,
          boxShadow: "0 -12px 60px rgba(42,36,32,0.2)",
          maxWidth: 640, margin: "0 auto",
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
            <pattern id="bs-marble-floor" patternUnits="userSpaceOnUse" width="120" height="120" patternTransform="skewX(-8)">
              <rect width="120" height="120" fill="#F0EBE2"/>
              <path d="M0 40 Q30 35 60 50 Q90 65 120 55" stroke="rgba(190,175,155,0.4)" strokeWidth="0.8" fill="none"/>
              <path d="M0 80 Q40 72 80 85 Q100 90 120 80" stroke="rgba(170,155,135,0.3)" strokeWidth="0.5" fill="none"/>
              <path d="M20 0 Q25 40 15 80 Q12 100 20 120" stroke="rgba(185,170,148,0.25)" strokeWidth="0.6" fill="none"/>
              <rect x="0" y="0" width="120" height="120" fill="none" stroke="rgba(220,210,195,0.6)" strokeWidth="0.5"/>
            </pattern>
            <pattern id="bs-marble-wall" patternUnits="userSpaceOnUse" width="200" height="160">
              <rect width="200" height="160" fill="#F5F1EC"/>
              <path d="M0 50 Q50 42 100 60 Q150 78 200 65" stroke="rgba(185,165,140,0.4)" strokeWidth="1" fill="none"/>
              <path d="M0 110 Q60 100 120 115 Q160 125 200 110" stroke="rgba(175,155,130,0.3)" strokeWidth="0.7" fill="none"/>
              <path d="M30 0 Q35 60 25 120 Q20 145 30 160" stroke="rgba(190,170,145,0.2)" strokeWidth="0.8" fill="none"/>
              <line x1="0" y1="80" x2="200" y2="80" stroke="rgba(210,200,185,0.5)" strokeWidth="0.5"/>
              <line x1="100" y1="0" x2="100" y2="160" stroke="rgba(210,200,185,0.4)" strokeWidth="0.5"/>
            </pattern>
            <radialGradient id="bs-floor-light" cx="50%" cy="30%" r="70%">
              <stop offset="0%" stopColor="rgba(255,252,245,0.5)"/>
              <stop offset="100%" stopColor="rgba(220,210,195,0)"/>
            </radialGradient>
            <radialGradient id="bs-chandelier-glow" cx="50%" cy="0%" r="60%">
              <stop offset="0%" stopColor="rgba(255,248,225,0.6)"/>
              <stop offset="100%" stopColor="rgba(255,248,225,0)"/>
            </radialGradient>
            <linearGradient id="bs-brass-h" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#8A6830"/>
              <stop offset="30%"  stopColor="#C8A86A"/>
              <stop offset="60%"  stopColor="#E4C98A"/>
              <stop offset="100%" stopColor="#A07840"/>
            </linearGradient>
            <linearGradient id="bs-brass-v" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%"   stopColor="#E4C98A"/>
              <stop offset="50%"  stopColor="#C8A86A"/>
              <stop offset="100%" stopColor="#8A6830"/>
            </linearGradient>
            <linearGradient id="bs-tub" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%"   stopColor="#FFFFFF"/>
              <stop offset="60%"  stopColor="#F0EDE8"/>
              <stop offset="100%" stopColor="#DDD8D0"/>
            </linearGradient>
            <linearGradient id="bs-mirror" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"  stopColor="rgba(220,230,238,0.5)"/>
              <stop offset="40%" stopColor="rgba(200,215,225,0.2)"/>
              <stop offset="100%" stopColor="rgba(215,225,232,0.4)"/>
            </linearGradient>
            <linearGradient id="bs-glass" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="rgba(215,230,235,0.12)"/>
              <stop offset="50%"  stopColor="rgba(230,240,245,0.22)"/>
              <stop offset="100%" stopColor="rgba(205,220,228,0.1)"/>
            </linearGradient>
            <linearGradient id="bs-cabinet" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%"   stopColor="#E8E2D8"/>
              <stop offset="100%" stopColor="#D0C8BC"/>
            </linearGradient>
            <pattern id="bs-flute" patternUnits="userSpaceOnUse" width="10" height="1">
              <rect width="10" height="1" fill="#D8D0C4"/>
              <rect x="0" width="1" height="1" fill="rgba(255,255,255,0.3)"/>
              <rect x="4" width="2" height="1" fill="rgba(0,0,0,0.06)"/>
            </pattern>
            <filter id="bs-shadow">
              <feDropShadow dx="0" dy="6" stdDeviation="12" floodColor="rgba(42,36,32,0.18)"/>
            </filter>
            <filter id="bs-brass-glow">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="rgba(228,201,138,0.5)"/>
            </filter>
          </defs>

          {/* Ceiling */}
          <rect x="0" y="0" width="900" height="140" fill="#FDFAF6"/>
          <rect x="0" y="0" width="900" height="4" fill="rgba(255,250,235,0.8)"/>
          {/* Back wall */}
          <rect x="0" y="0" width="900" height="400" fill="url(#bs-marble-wall)"/>
          <ellipse cx="450" cy="0" rx="350" ry="180" fill="url(#bs-chandelier-glow)"/>
          {/* Floor */}
          <polygon points="0,350 900,350 900,560 0,560" fill="url(#bs-marble-floor)"/>
          <ellipse cx="450" cy="440" rx="420" ry="120" fill="url(#bs-floor-light)"/>
          <line x1="0" y1="350" x2="900" y2="350" stroke="rgba(200,185,165,0.5)" strokeWidth="1"/>
          <rect x="0" y="346" width="900" height="6" fill="url(#bs-brass-h)" opacity="0.6"/>

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

          {/* Shower alcove */}
          <rect x="240" y="100" width="300" height="260" fill="#EDE8DF"/>
          <rect x="244" y="104" width="292" height="252" fill="url(#bs-marble-wall)" opacity="0.8"/>
          {/* Shower glass doors */}
          <rect x="244" y="104" width="96" height="250" fill="url(#bs-glass)"/>
          <rect x="244" y="104" width="96" height="250" fill="none" stroke="url(#bs-brass-v)" strokeWidth="2.5"/>
          <rect x="246" y="104" width="4" height="250" fill="rgba(255,255,255,0.15)"/>
          <rect x="342" y="104" width="96" height="250" fill="url(#bs-glass)"/>
          <rect x="342" y="104" width="96" height="250" fill="none" stroke="url(#bs-brass-v)" strokeWidth="2.5"/>
          <rect x="344" y="104" width="4" height="250" fill="rgba(255,255,255,0.15)"/>
          <rect x="440" y="104" width="96" height="250" fill="url(#bs-glass)"/>
          <rect x="440" y="104" width="96" height="250" fill="none" stroke="url(#bs-brass-v)" strokeWidth="2.5"/>
          <rect x="442" y="104" width="4" height="250" fill="rgba(255,255,255,0.15)"/>
          {/* Hover highlight on shower */}
          <rect x="244" y="104" width="292" height="250"
            fill={showerHover ? "rgba(200,168,106,0.07)" : "rgba(200,168,106,0)"}
            style={{ transition: "fill 0.3s", pointerEvents: "none" }}
          />
          {/* Door handles */}
          <rect x="332" y="210" width="12" height="40" rx="4" fill="url(#bs-brass-v)" filter="url(#bs-brass-glow)"/>
          <rect x="430" y="210" width="12" height="40" rx="4" fill="url(#bs-brass-v)" filter="url(#bs-brass-glow)"/>
          {/* Plants behind glass */}
          <ellipse cx="300" cy="230" rx="28" ry="55" fill="rgba(85,110,80,0.18)" transform="rotate(5,300,230)"/>
          <ellipse cx="320" cy="210" rx="18" ry="40" fill="rgba(80,100,75,0.14)" transform="rotate(-5,320,210)"/>
          <ellipse cx="460" cy="225" rx="24" ry="50" fill="rgba(85,110,80,0.16)" transform="rotate(-8,460,225)"/>
          {/* Niche shelf inside */}
          <rect x="358" y="155" width="62" height="85" fill="#EAE4DC"/>
          <rect x="358" y="155" width="62" height="85" fill="none" stroke="rgba(200,168,106,0.5)" strokeWidth="1.5"/>
          <rect x="358" y="195" width="62" height="2" fill="url(#bs-brass-h)" opacity="0.8"/>
          <rect x="358" y="225" width="62" height="2" fill="url(#bs-brass-h)" opacity="0.8"/>
          {/* Rain shower head */}
          <rect x="378" y="104" width="24" height="6" rx="2" fill="url(#bs-brass-h)"/>
          <rect x="384" y="110" width="2" height="20" fill="url(#bs-brass-v)"/>
          <ellipse cx="385" cy="134" rx="14" ry="4" fill="url(#bs-brass-h)" opacity="0.9"/>

          {/* Bathtub */}
          <ellipse cx="390" cy="425" rx="175" ry="20" fill="rgba(42,36,32,0.08)"/>
          <ellipse cx="390" cy="390" rx="168" ry="52" fill="#D8D2C8"/>
          <ellipse cx="390" cy="385" rx="165" ry="48" fill="url(#bs-tub)" filter="url(#bs-shadow)"/>
          <ellipse cx="390" cy="385" rx="165" ry="48" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2"/>
          <ellipse cx="225" cy="390" rx="22" ry="50" fill="url(#bs-tub)"/>
          <ellipse cx="555" cy="390" rx="22" ry="50" fill="url(#bs-tub)"/>
          <path d="M460 370 Q475 368 490 374 Q500 380 495 395 Q490 408 475 410 Q462 408 458 396 Q455 384 460 370" fill="#C0A898" opacity="0.8"/>
          <rect x="550" y="345" width="10" height="52" rx="4" fill="#2A2420"/>
          <rect x="545" y="345" width="20" height="6" rx="3" fill="#2A2420"/>
          <path d="M560 348 Q570 348 572 360 Q574 372 565 378" stroke="#2A2420" strokeWidth="6" fill="none" strokeLinecap="round"/>

          {/* Vanity */}
          <rect x="618" y="280" width="282" height="18" rx="2" fill="url(#bs-marble-wall)"/>
          <rect x="616" y="278" width="284" height="6" rx="1" fill="#E8E0D4"/>
          <rect x="618" y="295" width="278" height="58" fill="url(#bs-cabinet)"/>
          <rect x="618" y="295" width="278" height="58" fill="url(#bs-flute)"/>
          {/* Hover highlight on cabinet */}
          <rect x="616" y="278" width="284" height="80"
            fill={vanityHover ? "rgba(200,168,106,0.07)" : "rgba(200,168,106,0)"}
            style={{ transition: "fill 0.3s", pointerEvents: "none" }}
          />
          <rect x="618" y="350" width="282" height="4" rx="1" fill="url(#bs-brass-h)" opacity="0.6"/>
          <rect x="630" y="354" width="8" height="22" rx="3" fill="url(#bs-brass-v)"/>
          <rect x="882" y="354" width="8" height="22" rx="3" fill="url(#bs-brass-v)"/>
          <line x1="760" y1="295" x2="760" y2="354" stroke="rgba(200,185,165,0.6)" strokeWidth="1"/>
          <rect x="744" y="318" width="12" height="4" rx="2" fill="url(#bs-brass-h)"/>
          <rect x="762" y="318" width="12" height="4" rx="2" fill="url(#bs-brass-h)"/>
          <ellipse cx="720" cy="285" rx="52" ry="10" fill="url(#bs-marble-wall)"/>
          <ellipse cx="720" cy="285" rx="50" ry="8" fill="#E8E0D4"/>
          <rect x="716" y="262" width="8" height="24" rx="3" fill="url(#bs-brass-v)"/>
          <rect x="710" y="262" width="20" height="4" rx="2" fill="url(#bs-brass-h)"/>
          {/* Mirror */}
          <rect x="626" y="80" width="260" height="195" fill="url(#bs-mirror)"/>
          <rect x="626" y="80" width="260" height="195" fill="none" stroke="url(#bs-brass-h)" strokeWidth="4"/>
          <path d="M636 85 L660 85 L648 220" stroke="rgba(255,255,255,0.25)" strokeWidth="2" fill="none"/>
          {/* Accessories on counter */}
          <rect x="840" y="260" width="16" height="22" rx="3" fill="#2A3832"/>
          <rect x="843" y="254" width="10" height="8" rx="2" fill="#2A3832"/>
          <rect x="844" y="253" width="8" height="3" rx="1" fill="#C8A86A"/>
          <rect x="862" y="263" width="14" height="19" rx="3" fill="#2A3832" opacity="0.9"/>
          <circle cx="885" cy="270" r="12" fill="#E8E0D4" stroke="#C8A86A" strokeWidth="2"/>
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
              left: "27%", top: "22%", width: "20%", height: "46%",
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
