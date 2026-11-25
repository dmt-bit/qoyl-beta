"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { CartItem } from "@/lib/styleCart";

const BathroomScene3D = dynamic(() => import("./BathroomScene3D"), { ssr: false });

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
  const [items, setItems]         = useState(initialItems);
  const [openPanel, setOpenPanel] = useState<"shower" | "vanity" | null>(null);

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

      {/* ═══ 3D ROOM — full page ═══ */}
      <div style={{
        position: "fixed", inset: 0,
        width: "100%", height: "100%",
        overflow: "hidden",
        zIndex: 100,
      }}>
        <BathroomScene3D
          onHotspot={(id) => setOpenPanel(id)}
          fullViewport
          hud={purchasable.length > 0 ? {
            total,
            hasPrice,
            checkedCount: purchasedIds.size,
            totalCount: purchasable.length,
            onShare: handleShare,
            onShopAll: handleShopAll,
          } : undefined}
        />
      </div>

      {/* ═══ PANELS (sit above the fixed room) ═══ */}
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
    </>
  );
}
