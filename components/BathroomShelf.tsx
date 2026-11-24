"use client";

import { useState } from "react";
import type { CartItem } from "@/lib/styleCart";

// ─── Zone classification (mirrors ShowerShelfCart logic) ───────────────────
function getShelfZone(item: CartItem): "in" | "out" | "other" {
  if (item.product_type === "fake_hair") return "out";
  if (item.product_type === "tool") return "out";
  if (item.product_type === "tutorial") return "other";
  const labels = (item.secondary_category_labels ?? []).map((l) => l.toLowerCase());
  if (labels.some((l) => ["shampoo", "conditioner", "deep-conditioner", "deep conditioner", "co-wash"].includes(l))) return "in";
  if (labels.some((l) => ["leave-in", "styler", "oil", "serum", "cream", "gel", "mousse", "spray"].includes(l))) return "out";
  const name = item.product_name.toLowerCase();
  if (name.includes("shampoo") || name.includes("wash") || name.includes("cleanser")) return "in";
  if (name.includes("conditioner") || name.includes("mask") || name.includes("treatment")) return "in";
  return "out";
}

// ─── Fallback bottle colors by category ───────────────────────────────────
const BOTTLE_PALETTE: Record<string, [string, string]> = {
  shampoo:            ["#B4CAD0", "#8BADB5"],
  conditioner:        ["#D4B8D0", "#B089AA"],
  "deep-conditioner": ["#C8D4B0", "#9AB580"],
  "deep conditioner": ["#C8D4B0", "#9AB580"],
  treatment:          ["#D0C4A8", "#B0A07A"],
  "co-wash":          ["#C5D5D8", "#8DADB2"],
  "leave-in":         ["#D0BFC0", "#B09098"],
  styler:             ["#B8C8D8", "#7898B0"],
  oil:                ["#D8C8A8", "#B0A070"],
  serum:              ["#C8D0D8", "#90A0B0"],
  gel:                ["#B8D0C0", "#7AADA0"],
  mousse:             ["#D8C8D0", "#B0909A"],
  default:            ["#C8C0B8", "#A09890"],
};

function getBottleColor(labels: string[] = []): [string, string] {
  for (const lbl of labels) {
    const key = lbl.toLowerCase();
    if (BOTTLE_PALETTE[key]) return BOTTLE_PALETTE[key];
  }
  return BOTTLE_PALETTE.default;
}

// ─── Sub-components ────────────────────────────────────────────────────────

function BottleShape({ item }: { item: CartItem }) {
  const [top, bot] = getBottleColor(item.secondary_category_labels);
  if (item.image_url) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={item.image_url}
        alt={item.product_name}
        style={{ maxWidth: 44, maxHeight: 60, objectFit: "contain", filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.2))" }}
        loading="lazy"
      />
    );
  }
  return (
    <div style={{
      width: 32, height: 56,
      background: `linear-gradient(160deg, ${top} 0%, ${bot} 100%)`,
      borderRadius: "4px 4px 3px 3px",
      position: "relative",
      boxShadow: "2px 3px 8px rgba(0,0,0,0.2)",
    }}>
      {/* cap */}
      <div style={{
        position: "absolute", top: -6, left: "50%", transform: "translateX(-50%)",
        width: 12, height: 10,
        background: `linear-gradient(160deg, ${top} 0%, ${bot} 100%)`,
        borderRadius: "2px 2px 0 0",
        filter: "brightness(1.1)",
      }} />
      {/* highlight */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 60%)",
        borderRadius: "inherit",
      }} />
    </div>
  );
}

function ProductBottle({
  item,
  onClick,
  purchased,
}: {
  item: CartItem;
  onClick: () => void;
  purchased: boolean;
}) {
  const itemKey = item.product_id ?? item.product_name;
  void itemKey; // used externally as key
  const shortName = item.product_name.length > 18
    ? item.product_name.slice(0, 16) + "…"
    : item.product_name;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        cursor: "pointer",
        background: "none",
        border: "none",
        padding: "0 4px",
        flexShrink: 0,
        position: "relative",
        transition: "transform 0.25s cubic-bezier(0.34,1.56,0.64,1)",
        transformOrigin: "bottom center",
        opacity: purchased ? 0.55 : 1,
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-6px) scale(1.05)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "none"; }}
      aria-label={`${item.product_name} — tap for details`}
    >
      {purchased && (
        <span style={{
          position: "absolute", top: 0, right: 0,
          width: 16, height: 16,
          background: "#7E9B8A",
          color: "white",
          borderRadius: "50%",
          fontSize: 9, lineHeight: "16px", textAlign: "center",
          fontFamily: "inherit",
          zIndex: 1,
        }}>✓</span>
      )}
      <div style={{ width: 44, height: 60, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
        <BottleShape item={item} />
      </div>
      <div style={{
        fontSize: 9, color: "#7A6E66",
        textAlign: "center", maxWidth: 50,
        lineHeight: 1.2,
        overflow: "hidden",
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical",
      }}>
        {shortName}
      </div>
    </button>
  );
}

function ShelfRow({ items, onClick, purchasedIds }: {
  items: CartItem[];
  onClick: (item: CartItem) => void;
  purchasedIds: Set<string>;
}) {
  if (!items.length) return null;
  return (
    <div style={{
      position: "absolute", left: 0, right: 0,
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      gap: 6, padding: "0 8%",
    }}>
      {items.map((item, idx) => (
        <ProductBottle
          key={item.product_id ?? `item-${idx}`}
          item={item}
          onClick={() => onClick(item)}
          purchased={item.product_id != null && purchasedIds.has(item.product_id)}
        />
      ))}
    </div>
  );
}

// ─── Product Detail Drawer ─────────────────────────────────────────────────
function ProductDrawer({ item, onClose }: { item: CartItem | null; onClose: () => void }) {
  const open = item !== null;

  const catLabel = (() => {
    const lbl = item?.secondary_category_labels?.[0];
    if (!lbl) return "Hair Care";
    return lbl.charAt(0).toUpperCase() + lbl.slice(1).replace(/-/g, " ");
  })();

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: open ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0)",
          zIndex: 100,
          pointerEvents: open ? "all" : "none",
          transition: "background 0.3s",
        }}
        aria-hidden="true"
      />
      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={item?.product_name ?? "Product detail"}
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          maxWidth: 520, margin: "0 auto",
          background: "var(--bs-surface, #fff)",
          borderRadius: "20px 20px 0 0",
          padding: "0 24px 32px",
          transform: open ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.35s cubic-bezier(0.32,0.72,0,1)",
          zIndex: 101,
          boxShadow: "0 -8px 40px rgba(0,0,0,0.15)",
        }}
        onKeyDown={e => { if (e.key === "Escape") onClose(); }}
        tabIndex={-1}
      >
        {/* Handle */}
        <div style={{
          width: 36, height: 4,
          background: "rgba(100,90,80,0.3)",
          borderRadius: 2,
          margin: "14px auto 20px",
        }} />

        {item && (
          <div style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
            {/* Product image / fallback */}
            <div style={{
              width: 80, height: 100, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(0,0,0,0.04)", borderRadius: 10, overflow: "hidden",
            }}>
              {item.image_url
                ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={item.image_url} alt={item.product_name} style={{ maxWidth: 80, maxHeight: 100, objectFit: "contain" }} />
                : <BottleShape item={item} />
              }
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#7E9B8A", marginBottom: 4 }}>
                {catLabel}
              </div>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 22, fontWeight: 400, lineHeight: 1.2, marginBottom: 4 }}>
                {item.product_name}
              </div>
              {/* brand_name not on CartItem; skip */}
              {item.price_estimate != null && (
                <div style={{ fontSize: 20, fontWeight: 500, marginBottom: 16 }}>
                  ${item.price_estimate.toFixed(2)}
                </div>
              )}
              {(item.affiliate_url ?? item.seller_url) && (
                <a
                  href={item.affiliate_url ?? item.seller_url ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    background: "#2C2825", color: "#F7F4F0",
                    border: "none", borderRadius: 100,
                    padding: "12px 22px",
                    fontSize: 13, fontWeight: 500,
                    textDecoration: "none",
                    cursor: "pointer",
                    letterSpacing: "0.03em",
                    fontFamily: "'DM Sans', system-ui, sans-serif",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M2 7h10M7 2l5 5-5 5"/>
                  </svg>
                  Shop on Amazon
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Marble Niche (shower) ────────────────────────────────────────────────
function ShowerNiche({ items, onProductClick, purchasedIds }: {
  items: CartItem[];
  onProductClick: (item: CartItem) => void;
  purchasedIds: Set<string>;
}) {
  const row1 = items.slice(0, 2);
  const row2 = items.slice(2, 4);

  return (
    <div style={{
      position: "absolute", left: "50%", top: "16%",
      transform: "translateX(-50%)",
      width: "62%", height: "66%",
      background: "linear-gradient(180deg, #F2EDE6 0%, #EDE5DC 100%)",
      borderRadius: "4px 4px 2px 2px",
      boxShadow: [
        "inset 0 1px 0 rgba(255,255,255,0.8)",
        "inset 2px 0 6px rgba(0,0,0,0.06)",
        "inset -2px 0 6px rgba(0,0,0,0.06)",
        "inset 0 -3px 8px rgba(0,0,0,0.08)",
        "0 2px 16px rgba(0,0,0,0.12)",
      ].join(","),
      overflow: "visible",
    }}>
      {/* Marble vein texture overlay */}
      <div style={{
        position: "absolute", inset: 0, overflow: "hidden", borderRadius: "inherit",
        background: [
          "repeating-linear-gradient(170deg, transparent 0, transparent 20px, rgba(180,160,135,0.1) 20px, rgba(180,160,135,0.1) 21px)",
          "repeating-linear-gradient(80deg, transparent 0, transparent 35px, rgba(160,140,120,0.08) 35px, rgba(160,140,120,0.08) 36px)",
        ].join(","),
        pointerEvents: "none",
      }} />
      {/* Niche outer frame */}
      <div style={{
        position: "absolute", inset: -4,
        border: "4px solid",
        borderColor: "#D8D0C4 #BFB5A6 #BFB5A6 #D8D0C4",
        borderRadius: 5, pointerEvents: "none",
      }} />

      {/* Top shelf bar */}
      <div style={{ position: "absolute", top: "35%", left: 0, right: 0, height: 3,
        background: "linear-gradient(90deg, rgba(185,170,148,0.6), rgba(220,205,180,1) 50%, rgba(185,170,148,0.6))",
        boxShadow: "0 2px 4px rgba(0,0,0,0.12), 0 1px 0 rgba(255,255,255,0.4)",
      }} />
      {/* Bottom shelf bar */}
      <div style={{ position: "absolute", top: "68%", left: 0, right: 0, height: 3,
        background: "linear-gradient(90deg, rgba(185,170,148,0.6), rgba(220,205,180,1) 50%, rgba(185,170,148,0.6))",
        boxShadow: "0 2px 4px rgba(0,0,0,0.12), 0 1px 0 rgba(255,255,255,0.4)",
      }} />

      {/* Products */}
      {row1.length > 0 && (
        <div style={{ position: "absolute", top: "35%", left: 0, right: 0, transform: "translateY(-100%)" }}>
          <ShelfRow items={row1} onClick={onProductClick} purchasedIds={purchasedIds} />
        </div>
      )}
      {row2.length > 0 && (
        <div style={{ position: "absolute", top: "68%", left: 0, right: 0, transform: "translateY(-100%)" }}>
          <ShelfRow items={row2} onClick={onProductClick} purchasedIds={purchasedIds} />
        </div>
      )}

      {/* Empty state */}
      {items.length === 0 && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          pointerEvents: "none",
        }}>
          <p style={{ fontSize: 11, color: "#B0A89E", textAlign: "center", maxWidth: 100, lineHeight: 1.4 }}>
            Your in-shower products will appear here
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Vanity Unit (out-of-shower) ───────────────────────────────────────────
function VanityUnit({ items, onProductClick, purchasedIds }: {
  items: CartItem[];
  onProductClick: (item: CartItem) => void;
  purchasedIds: Set<string>;
}) {
  return (
    <div style={{
      position: "absolute", left: "10%", right: "10%", bottom: 0, height: "72%",
      background: "linear-gradient(180deg, #F5F0E8 0%, #EEE7DC 100%)",
      borderRadius: "8px 8px 0 0",
      boxShadow: "0 -2px 12px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9)",
    }}>
      {/* Counter edge */}
      <div style={{
        position: "absolute", top: 0, left: -4, right: -4, height: 10,
        background: "linear-gradient(90deg, #E8E0D2, #EDE5D8, #E8E0D2)",
        borderRadius: "3px 3px 0 0",
        boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
      }} />
      {/* Mirror */}
      <div style={{
        position: "absolute", top: "-53%", left: "15%", right: "15%", height: "50%",
        background: "linear-gradient(135deg, rgba(230,235,240,0.5) 0%, rgba(210,218,225,0.3) 50%, rgba(225,230,235,0.4) 100%)",
        border: "2px solid rgba(200,185,165,0.5)",
        borderRadius: 2,
        boxShadow: "0 4px 20px rgba(0,0,0,0.08), inset 0 0 40px rgba(255,255,255,0.1)",
        overflow: "hidden",
      }}>
        {/* Mirror gold outer frame */}
        <div style={{
          position: "absolute", inset: -4,
          border: "1px solid rgba(200,169,110,0.4)",
          borderRadius: 3, pointerEvents: "none",
        }} />
        {/* Mirror highlight */}
        <div style={{
          position: "absolute", top: "8%", left: "6%",
          width: "25%", height: "70%",
          background: "linear-gradient(135deg, rgba(255,255,255,0.3), transparent)",
          borderRadius: 1,
        }} />
      </div>
      {/* Gold accent line */}
      <div style={{
        position: "absolute", top: 10, left: 16, right: 16, height: 1,
        background: "linear-gradient(90deg, transparent, rgba(200,169,110,0.5), transparent)",
        pointerEvents: "none",
      }} />
      {/* Shelf bar */}
      <div style={{
        position: "absolute", top: "20%", left: 0, right: 0, height: 3,
        background: "linear-gradient(90deg, rgba(185,170,148,0.6), rgba(220,205,180,1) 50%, rgba(185,170,148,0.6))",
        boxShadow: "0 2px 4px rgba(0,0,0,0.12), 0 1px 0 rgba(255,255,255,0.4)",
      }} />

      {/* Products */}
      {items.length > 0 && (
        <div style={{ position: "absolute", top: "20%", left: 0, right: 0, transform: "translateY(-100%)",
          paddingLeft: "12%", paddingRight: "12%" }}>
          <ShelfRow items={items} onClick={onProductClick} purchasedIds={purchasedIds} />
        </div>
      )}

      {/* Empty state */}
      {items.length === 0 && (
        <div style={{
          position: "absolute", top: "15%", left: 0, right: 0, height: "25%",
          display: "flex", alignItems: "center", justifyContent: "center",
          pointerEvents: "none",
        }}>
          <p style={{ fontSize: 11, color: "#B0A89E", textAlign: "center", maxWidth: 110, lineHeight: 1.4 }}>
            Your styling products will appear here
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Shelf Zone scene wrapper ──────────────────────────────────────────────
function ZoneScene({ zone, children }: { zone: "shower" | "vanity"; children: React.ReactNode }) {
  const isShower = zone === "shower";
  const bg = isShower
    ? [
        "linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)",
        "repeating-linear-gradient(0deg, rgba(180,160,140,0.25) 0, rgba(180,160,140,0.25) 1px, transparent 1px, transparent 60px)",
        "repeating-linear-gradient(90deg, rgba(180,160,140,0.25) 0, rgba(180,160,140,0.25) 1px, transparent 1px, transparent 80px)",
        "linear-gradient(180deg, #E8E2DA 0%, #DDD5CA 40%, #D5CCC0 100%)",
      ].join(",")
    : [
        "repeating-linear-gradient(0deg, rgba(200,185,165,0.15) 0, rgba(200,185,165,0.15) 1px, transparent 1px, transparent 50px)",
        "repeating-linear-gradient(90deg, rgba(200,185,165,0.15) 0, rgba(200,185,165,0.15) 1px, transparent 1px, transparent 60px)",
        "linear-gradient(180deg, #EDE5DA 0%, #E5DBCE 50%, #DDD0C2 100%)",
      ].join(",");

  return (
    <div style={{
      position: "relative", width: "100%", aspectRatio: "3/4",
      overflow: "hidden", background: bg,
    }}>
      {isShower && (
        /* Steam particles — pure CSS animation via inline keyframes in global style */
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
          {[0, 2.5, 5].map((delay, i) => (
            <div key={i} style={{
              position: "absolute",
              width: 80, height: 80,
              borderRadius: "50%",
              background: "rgba(200,215,225,0.18)",
              filter: "blur(20px)",
              left: `${[20, 55, 35][i]}%`,
              top: `${[60, 70, 50][i]}%`,
              animation: `bs-steam 8s ease-in-out infinite`,
              animationDelay: `${delay}s`,
            }} />
          ))}
        </div>
      )}
      {children}
    </div>
  );
}

// ─── Summary bar (bottom) ─────────────────────────────────────────────────
function SummaryBar({
  items,
  cartId,
}: {
  items: CartItem[];
  cartId: string;
}) {
  const [shareState, setShareState] = useState<"idle" | "copied">("idle");
  const purchasable = items.filter((i) => i.product_type !== "tutorial");
  const purchased = purchasable.filter((i) => i.status === "purchased");
  const total = purchasable.reduce((s, i) => s + (i.price_estimate ?? 0) * i.quantity, 0);
  const hasPrice = purchasable.some((i) => i.price_estimate != null);

  function handleGetEverything() {
    const remaining = purchasable.filter((i) => i.status !== "purchased");
    for (const item of remaining) {
      window.open(item.affiliate_url ?? item.seller_url, "_blank", "noopener,noreferrer");
    }
  }

  async function handleShare() {
    const url = window.location.origin + "/cart/" + cartId;
    try { await navigator.clipboard.writeText(url); } catch { /* denied */ }
    setShareState("copied");
    setTimeout(() => setShareState("idle"), 2200);
  }

  if (purchasable.length === 0) return null;

  return (
    <div style={{
      marginTop: 24,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      flexWrap: "wrap", gap: 12,
      padding: "16px 20px",
      background: "rgba(0,0,0,0.03)",
      borderRadius: 14,
    }}>
      <div>
        {hasPrice && (
          <div style={{ fontSize: 20, fontWeight: 500 }}>
            ${total.toFixed(2)}
          </div>
        )}
        <div style={{ fontSize: 12, color: "#7A6E66" }}>
          {purchased.length} of {purchasable.length} products checked off
        </div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button
          type="button"
          onClick={handleShare}
          style={{
            padding: "10px 18px", borderRadius: 100,
            border: "1px solid rgba(0,0,0,0.12)",
            background: "none", cursor: "pointer",
            fontSize: 13, fontWeight: 500, fontFamily: "inherit",
            color: "inherit",
          }}
        >
          {shareState === "copied" ? "Copied!" : "Share shelf"}
        </button>
        <button
          type="button"
          onClick={handleGetEverything}
          style={{
            padding: "10px 18px", borderRadius: 100,
            border: "none",
            background: "#2C2825", color: "#F7F4F0",
            cursor: "pointer", fontSize: 13, fontWeight: 500, fontFamily: "inherit",
          }}
        >
          Shop all
        </button>
      </div>
    </div>
  );
}

// ─── Global keyframes (injected once) ─────────────────────────────────────
const GLOBAL_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');
@keyframes bs-steam {
  0%   { transform: translateY(0) scale(1);     opacity: 0; }
  20%  { opacity: 1; }
  80%  { opacity: 0.7; }
  100% { transform: translateY(-60px) scale(1.4); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  [style*="bs-steam"] { animation: none !important; opacity: 0.3; }
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
  const [items, setItems] = useState(initialItems);
  const [activeProduct, setActiveProduct] = useState<CartItem | null>(null);

  function toggleItem(productId: string | null) {
    if (!productId) return;
    setItems((prev) =>
      prev.map((item) => {
        if (item.product_id !== productId) return item;
        return { ...item, status: item.status === "purchased" ? "pending" : "purchased" };
      })
    );
  }

  const inItems  = items.filter((i) => getShelfZone(i) === "in"  && i.product_type !== "tutorial");
  const outItems = items.filter((i) => getShelfZone(i) === "out" && i.product_type !== "tutorial");

  const purchasedIds = new Set<string>(
    items
      .filter((i) => i.status === "purchased" && i.product_id != null)
      .map((i) => i.product_id as string)
  );

  function handleProductClick(item: CartItem) {
    setActiveProduct(item);
  }

  function handleDrawerClose() {
    setActiveProduct(null);
  }

  return (
    <>
      {/* Inject global keyframes once */}
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_STYLES }} />

      {/* Room scene */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: 20,
      }}>
        {/* ── Shower zone ── */}
        <div style={{
          borderRadius: 20, overflow: "hidden",
          background: "white", boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
        }}>
          <ZoneScene zone="shower">
            <ShowerNiche
              items={inItems}
              onProductClick={handleProductClick}
              purchasedIds={purchasedIds}
            />
          </ZoneScene>
          <div style={{
            padding: "16px 20px 14px",
            borderTop: "1px solid rgba(0,0,0,0.06)",
            display: "flex", alignItems: "baseline", gap: 10,
          }}>
            <h2 style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 20, fontWeight: 400, fontStyle: "italic",
            }}>
              in the shower
            </h2>
            <span style={{ fontSize: 11, color: "#B0A89E", letterSpacing: "0.06em" }}>
              shampoo · conditioner · treatments
            </span>
          </div>
        </div>

        {/* ── Vanity zone ── */}
        <div style={{
          borderRadius: 20, overflow: "hidden",
          background: "white", boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
        }}>
          <ZoneScene zone="vanity">
            <VanityUnit
              items={outItems}
              onProductClick={handleProductClick}
              purchasedIds={purchasedIds}
            />
          </ZoneScene>
          <div style={{
            padding: "16px 20px 14px",
            borderTop: "1px solid rgba(0,0,0,0.06)",
            display: "flex", alignItems: "baseline", gap: 10,
          }}>
            <h2 style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 20, fontWeight: 400, fontStyle: "italic",
            }}>
              outside the shower
            </h2>
            <span style={{ fontSize: 11, color: "#B0A89E", letterSpacing: "0.06em" }}>
              leave-in · stylers · oils
            </span>
          </div>
        </div>
      </div>

      {/* Summary bar */}
      <SummaryBar items={items} cartId={cartId} />

      {/* Product detail drawer */}
      <ProductDrawer
        item={activeProduct}
        onClose={handleDrawerClose}
      />
    </>
  );
}
