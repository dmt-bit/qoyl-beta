"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { CartItem } from "@/lib/styleCart";
import type { RoutineStep } from "@/lib/routine";
import { storeCart } from "@/lib/storeCart";

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
  onAddToCart,
}: {
  item: CartItem;
  checked: boolean;
  onToggle: () => void;
  onAddToCart: (item: CartItem) => void;
}) {
  const catLabel = (() => {
    const l = item.secondary_category_labels?.[0];
    if (!l) return "Hair Care";
    return l.charAt(0).toUpperCase() + l.slice(1).replace(/-/g, " ");
  })();
  const [t, b] = getBottleColor(item.secondary_category_labels);
  const [added, setAdded] = useState(false);

  function handleAdd(e: React.MouseEvent) {
    e.stopPropagation();
    onAddToCart(item);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

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

      {/* Add to Qoyl Store cart */}
      <button
        type="button"
        onClick={handleAdd}
        style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          fontSize: 10, fontWeight: 500, letterSpacing: "0.05em",
          color: added ? "#3A6A4A" : "#1A1410",
          background: added ? "rgba(126,155,138,0.18)" : "rgba(200,168,106,0.18)",
          border: `1px solid ${added ? "rgba(126,155,138,0.5)" : "rgba(200,168,106,0.4)"}`,
          borderRadius: 100,
          padding: "5px 10px", cursor: "pointer",
          fontFamily: "inherit",
          marginTop: 2,
          transition: "all 0.2s ease",
        }}
      >
        {added ? (
          <>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M1.5 5l2.5 2.5 4.5-4.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Added!
          </>
        ) : (
          <>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="3.5" cy="8.5" r="0.75" fill="currentColor"/>
              <circle cx="7.5" cy="8.5" r="0.75" fill="currentColor"/>
              <path d="M1 1h1.5l1 4.5h4L9 3H3"/>
            </svg>
            Add to Qoyl cart
          </>
        )}
      </button>
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
  onAddToCart,
  cartCount,
}: {
  open: boolean;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  items: CartItem[];
  purchasedIds: Set<string>;
  onToggle: (productId: string | null) => void;
  onClose: () => void;
  onAddToCart: (item: CartItem) => void;
  cartCount: number;
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
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        }}>
          <div>
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
          {/* Cart badge — taps through to checkout */}
          <a href="/store/checkout" style={{ textDecoration: "none", flexShrink: 0 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 12px", borderRadius: 100,
              background: cartCount > 0 ? "rgba(200,168,106,0.15)" : "rgba(220,210,195,0.3)",
              border: `1px solid ${cartCount > 0 ? "rgba(200,168,106,0.5)" : "rgba(220,210,195,0.6)"}`,
              transition: "all 0.2s",
            }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={cartCount > 0 ? "#A8863A" : "#B4A898"} strokeWidth="1.4">
                <circle cx="4.5" cy="12" r="1" fill="currentColor" stroke="none"/>
                <circle cx="10.5" cy="12" r="1" fill="currentColor" stroke="none"/>
                <path d="M1 1h2l1.5 7h6L12 4H4"/>
              </svg>
              <span style={{ fontSize: 11, fontWeight: 600, color: cartCount > 0 ? "#A8863A" : "#B4A898" }}>
                {cartCount > 0 ? `${cartCount} in cart` : "Cart"}
              </span>
            </div>
          </a>
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
                  onAddToCart={onAddToCart}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}


// ─── Dashboard slide-up panel ─────────────────────────────────────────────
function DashboardPanel({
  open,
  greeting,
  chips,
  routineSteps,
  onClose,
}: {
  open: boolean;
  greeting: string;
  chips: string[];
  routineSteps: RoutineStep[];
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
        aria-label="Your routine"
        style={{
          position: "fixed", left: "50%", bottom: 0,
          transform: open ? "translateX(-50%) translateY(0)" : "translateX(-50%) translateY(100%)",
          width: "min(640px, 100vw)",
          maxHeight: "85vh",
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
          }}>
            {greeting}
          </div>
          {chips.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {chips.map((chip) => (
                <span key={chip} style={{
                  fontSize: 11, fontWeight: 500,
                  border: "1px solid rgba(200,168,106,0.5)",
                  borderRadius: 100, padding: "3px 10px",
                  color: "#B4985A", letterSpacing: "0.03em",
                  textTransform: "capitalize",
                }}>
                  {chip}
                </span>
              ))}
            </div>
          )}
        </div>
        {/* Scroll content */}
        <div style={{ overflowY: "auto", flex: 1, padding: "20px 24px 36px" }}>
          {/* Routine steps */}
          {routineSteps.length > 0 && (
            <div>
              <p style={{
                fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase",
                color: "#B4A898", marginBottom: 14, fontWeight: 600,
              }}>Your Routine</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {routineSteps.map((step) => (
                  <div key={step.title} style={{ borderLeft: "2px solid rgba(200,168,106,0.4)", paddingLeft: 14 }}>
                    <p style={{
                      fontFamily: "'Cormorant Garamond', Georgia, serif",
                      fontSize: 17, color: "#B4985A", margin: 0, lineHeight: 1.2,
                    }}>{step.title}</p>
                    <p style={{ fontSize: 13, color: "rgba(42,36,32,0.65)", margin: "4px 0 0", lineHeight: 1.5 }}>
                      {step.description}
                    </p>
                  </div>
                ))}
              </div>
              <Link
                href="/routine"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  marginTop: 20, fontSize: 12, fontWeight: 600,
                  letterSpacing: "0.07em", color: "#2A2420",
                  background: "rgba(200,168,106,0.15)",
                  border: "1px solid rgba(200,168,106,0.4)",
                  borderRadius: 100, padding: "9px 18px",
                  textDecoration: "none",
                }}
              >
                Full routine calendar →
              </Link>
            </div>
          )}

          {/* Quick links */}
          <div style={{ marginTop: routineSteps.length > 0 ? 28 : 0 }}>
            <p style={{
              fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase",
              color: "#B4A898", marginBottom: 12, fontWeight: 600,
            }}>Quick actions</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { href: "/style-match", label: "Style Match", desc: "Upload a photo, get matched styles" },
                { href: "/search",      label: "Search product", desc: "Check any product's compatibility" },
                { href: "/travel",      label: "Travel kit",    desc: "5 products for your destination" },
                { href: "/profile",     label: "My profile",    desc: "Edit your hair profile" },
              ].map(({ href, label, desc }) => (
                <Link key={href} href={href} style={{
                  display: "block", padding: "14px 14px",
                  borderRadius: 14, border: "1px solid rgba(200,168,106,0.3)",
                  background: "rgba(255,251,245,0.8)", textDecoration: "none",
                  transition: "border-color 0.2s",
                }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#2A2420", margin: 0 }}>{label}</p>
                  <p style={{ fontSize: 11, color: "rgba(42,36,32,0.55)", margin: "3px 0 0", lineHeight: 1.4 }}>{desc}</p>
                </Link>
              ))}
            </div>
          </div>
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
  greeting,
  profileChips,
  routineSteps,
}: {
  cartId: string;
  items: CartItem[];
  greeting?: string;
  profileChips?: string[];
  routineSteps?: RoutineStep[];
}) {
  const router = useRouter();
  const [items, setItems]         = useState(initialItems);
  const [openPanel, setOpenPanel] = useState<"shower" | "vanity" | "dashboard" | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [shelfOpen, setShelfOpen] = useState(false);

  // Sync cart count from localStorage on mount and after adds
  useEffect(() => { setCartCount(storeCart.count()); }, []);

  const handleAddToCart = useCallback((item: CartItem) => {
    storeCart.add(item);
    setCartCount(storeCart.count());
  }, []);

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

  const [shareToast, setShareToast] = useState(false);

  async function handleShare() {
    const url = `${window.location.origin}/cart/${cartId}`;
    try { await navigator.clipboard.writeText(url); } catch {}
    setShareToast(true);
    setTimeout(() => setShareToast(false), 2200);
  }

  function handleShopAll() {
    // Route to the internal Qoyl Store checkout instead of opening external tabs.
    // The checkout page fetches the full shelf directly from /api/shelf.
    router.push("/store/checkout");
  }

  const showerItems = items.filter((i) => getShelfZone(i) === "shower" && i.product_type !== "tutorial");
  const vanityItems = items.filter((i) => getShelfZone(i) === "vanity" && i.product_type !== "tutorial");
  const purchasable = items.filter((i) => i.product_type !== "tutorial");
  const total = purchasable.reduce((s, i) => s + (i.price_estimate ?? 0) * (i.quantity ?? 1), 0);
  const hasPrice = purchasable.some((i) => i.price_estimate != null);

  const wallInfo = {
    greeting: greeting ?? "Your routine",
    chips: profileChips ?? [],
    routineLines: (routineSteps ?? []).map((s) => `${s.title}: ${s.description}`),
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />

      {/* ═══ COLLAPSED SHELF CARD — shown when shelfOpen is false ═══ */}
      {!shelfOpen && (
        <button
          type="button"
          onClick={() => setShelfOpen(true)}
          style={{
            display: "block",
            width: "100%",
            border: "none",
            padding: 0,
            background: "none",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <div style={{
            position: "relative",
            width: "100%",
            height: 220,
            borderRadius: 12,
            overflow: "hidden",
            background: "#1A1510",
          }}>
            <img
              src="/bathroom-bg.jpg"
              alt="My Shelf"
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", display: "block" }}
            />
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(to top, rgba(20,16,12,0.72) 0%, rgba(20,16,12,0.1) 60%)",
            }} />
            <div style={{ position: "absolute", bottom: 20, left: 20, right: 20 }}>
              <p style={{ margin: 0, color: "#F5EDE0", fontFamily: "serif", fontSize: 22, fontWeight: 600, lineHeight: 1.2 }}>
                My Shelf
              </p>
              <p style={{ margin: "4px 0 0", color: "rgba(245,237,224,0.7)", fontSize: 13 }}>
                {purchasable.length > 0
                  ? `${purchasable.length} products · tap to open your bathroom`
                  : "Tap to open your bathroom shelf"}
              </p>
            </div>
            <div style={{
              position: "absolute", top: 16, right: 16,
              background: "rgba(245,237,224,0.15)", backdropFilter: "blur(6px)",
              borderRadius: 20, padding: "6px 14px",
              color: "#F5EDE0", fontSize: 12, fontWeight: 600,
            }}>
              Open →
            </div>
          </div>
        </button>
      )}

      {/* ═══ 3D ROOM — full page, only when shelfOpen ═══ */}
      {shelfOpen && <div style={{
        position: "fixed", inset: 0,
        width: "100%", height: "100%",
        overflow: "hidden",
        zIndex: 100,
      }}>
        <BathroomScene3D
          onHotspot={(id) => setOpenPanel(id)}
          onExit={() => { setShelfOpen(false); setOpenPanel(null); }}
          fullViewport
          wallInfo={wallInfo}
          hud={purchasable.length > 0 ? {
            total,
            hasPrice,
            checkedCount: purchasedIds.size,
            totalCount: purchasable.length,
            onShare: handleShare,
            onShopAll: handleShopAll,
          } : undefined}
        />
      </div>}

      {/* ═══ PANELS + TOAST — only when shelf is open ═══ */}
      {shelfOpen && <>
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
          onAddToCart={handleAddToCart}
          cartCount={cartCount}
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
          onAddToCart={handleAddToCart}
          cartCount={cartCount}
        />
        <DashboardPanel
          open={openPanel === "dashboard"}
          greeting={greeting ?? "Your routine"}
          chips={profileChips ?? []}
          routineSteps={routineSteps ?? []}
          onClose={() => setOpenPanel(null)}
        />

        {/* Share toast */}
        {shareToast && (
          <div
            style={{
              position: "fixed",
              bottom: 100,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 200,
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "11px 20px",
              borderRadius: 100,
              background: "rgba(14,10,6,0.88)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(200,168,106,0.35)",
              color: "#F8F3EC",
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: "0.06em",
              fontFamily: "'DM Sans', sans-serif",
              whiteSpace: "nowrap",
              pointerEvents: "none",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="rgba(200,168,106,0.9)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2.5 7.5l3 3 6-6" />
            </svg>
            Link copied
          </div>
        )}
      </>}
    </>
  );
}
