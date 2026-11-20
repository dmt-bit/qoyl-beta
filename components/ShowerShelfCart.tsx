"use client";

import { useState } from "react";
import type { CartItem } from "@/lib/styleCart";

// ─── Shelf zones ────────────────────────────────────────────────────────────
// In-shower: rinse-out products (used while water is running)
// Out-of-shower: leave-in, styling, tools (applied to damp/dry hair)
function getShelfZone(item: CartItem): "in" | "out" | "other" {
  if (item.product_type === "fake_hair") return "out";
  if (item.product_type === "tool") return "out";
  if (item.product_type === "tutorial") return "other";
  // For products, infer from product_name keywords as fallback
  const name = item.product_name.toLowerCase();
  if (name.includes("shampoo") || name.includes("wash")) return "in";
  if (name.includes("conditioner") || name.includes("mask") || name.includes("treatment")) return "in";
  if (name.includes("leave") || name.includes("styler") || name.includes("gel") ||
      name.includes("oil") || name.includes("cream") || name.includes("mousse") ||
      name.includes("spray") || name.includes("serum")) return "out";
  return "out"; // default styling products to out-of-shower
}

// ─── Shelf item card ─────────────────────────────────────────────────────────
function ShelfItem({ item, onToggle }: { item: CartItem; onToggle: () => void }) {
  const isPurchased = item.status === "purchased";
  const isFakeHair = item.product_type === "fake_hair";
  const isTool = item.product_type === "tool";
  const buyUrl = item.affiliate_url ?? item.seller_url;

  // Bottle icon varies by type
  const BottleShape = isTool ? ToolIcon : isFakeHair ? FakeHairIcon : BottleIcon;

  return (
    <div
      className={`shelf-item group relative flex flex-col items-center transition-opacity ${
        isPurchased ? "opacity-40" : "opacity-100"
      }`}
    >
      {/* The bottle / product visual */}
      <a
        href={buyUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col items-center"
        aria-label={`Buy ${item.product_name}`}
      >
        <BottleShape score={item.compat_score} purchased={isPurchased} />
        <div className="mt-1.5 w-16 text-center">
          <p
            className="product-label leading-tight"
            style={{ fontSize: "9px", letterSpacing: "0.01em" }}
          >
            {item.product_name.length > 22
              ? item.product_name.slice(0, 20) + "…"
              : item.product_name}
          </p>
          {item.price_estimate != null && (
            <p className="price-label mt-0.5" style={{ fontSize: "8px" }}>
              ${item.price_estimate.toFixed(2)}
            </p>
          )}
        </div>
      </a>

      {/* Check-off button */}
      <button
        type="button"
        onClick={onToggle}
        aria-label={isPurchased ? "Mark not purchased" : "Mark purchased"}
        className={`mt-1 flex h-4 w-4 items-center justify-center rounded-full border transition-colors ${
          isPurchased
            ? "border-[#7BA7BC] bg-[#7BA7BC] text-white"
            : "border-[#C4BEB4] bg-transparent text-transparent hover:border-[#1A1A1A]"
        }`}
        style={{ fontSize: "8px" }}
      >
        ✓
      </button>
    </div>
  );
}

// ─── Visual shelf icons ──────────────────────────────────────────────────────
function BottleIcon({ score, purchased }: { score: number | null; purchased: boolean }) {
  const fill = purchased ? "#D4CFC8" : score != null && score >= 70 ? "#B8D4C0" : score != null && score >= 40 ? "#D4C8A8" : "#C4BEB4";
  return (
    <svg width="28" height="52" viewBox="0 0 28 52" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Cap */}
      <rect x="9" y="0" width="10" height="7" rx="2" fill="#1A1A1A" opacity={purchased ? 0.3 : 0.7} />
      {/* Neck */}
      <rect x="11" y="6" width="6" height="6" fill={fill} />
      {/* Body */}
      <rect x="4" y="11" width="20" height="36" rx="3" fill={fill} />
      {/* Label strip */}
      <rect x="6" y="18" width="16" height="18" rx="1" fill="white" fillOpacity="0.45" />
      {/* Score pip */}
      {score != null && (
        <circle
          cx="14"
          cy="27"
          r="4"
          fill={score >= 70 ? "#2d7a3d" : score >= 40 ? "#c4831a" : "#b03030"}
          fillOpacity={purchased ? 0.4 : 0.9}
        />
      )}
    </svg>
  );
}

function ToolIcon({ purchased }: { score: number | null; purchased: boolean }) {
  const fill = purchased ? "#D4CFC8" : "#1A1A1A";
  const opacity = purchased ? 0.3 : 0.6;
  return (
    <svg width="28" height="52" viewBox="0 0 28 52" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Handle */}
      <rect x="10" y="30" width="8" height="22" rx="4" fill={fill} opacity={opacity} />
      {/* Head */}
      <ellipse cx="14" cy="20" rx="10" ry="12" fill={fill} opacity={opacity} />
      {/* Bristles hint */}
      <rect x="8" y="8" width="2" height="8" rx="1" fill="white" opacity={purchased ? 0.1 : 0.3} />
      <rect x="13" y="6" width="2" height="10" rx="1" fill="white" opacity={purchased ? 0.1 : 0.3} />
      <rect x="18" y="8" width="2" height="8" rx="1" fill="white" opacity={purchased ? 0.1 : 0.3} />
    </svg>
  );
}

function FakeHairIcon({ purchased }: { score: number | null; purchased: boolean }) {
  const fill = purchased ? "#D4CFC8" : "#1A1A1A";
  const opacity = purchased ? 0.3 : 0.75;
  return (
    <svg width="28" height="52" viewBox="0 0 28 52" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Package box */}
      <rect x="3" y="12" width="22" height="30" rx="2" fill={fill} opacity={opacity} />
      {/* Lid */}
      <rect x="1" y="8" width="26" height="8" rx="2" fill={fill} opacity={opacity * 1.1} />
      {/* Ribbon */}
      <rect x="12" y="8" width="4" height="34" fill="white" opacity={purchased ? 0.1 : 0.2} />
      <rect x="1" y="20" width="26" height="4" fill="white" opacity={purchased ? 0.1 : 0.2} />
    </svg>
  );
}

// ─── A single shelf band ─────────────────────────────────────────────────────
function Shelf({
  label,
  sublabel,
  items,
  zone,
  onToggle,
}: {
  label: string;
  sublabel: string;
  items: CartItem[];
  zone: "in" | "out";
  onToggle: (key: string) => void;
}) {
  if (items.length === 0) return null;

  const shelfBg = zone === "in"
    ? "linear-gradient(to bottom, #EAE8E5, #E0DDD8)"
    : "linear-gradient(to bottom, #F0EDEA, #E8E5E0)";

  const edgeShadow = zone === "in"
    ? "0 4px 0 #B8B2AB, 0 6px 12px rgba(0,0,0,0.12)"
    : "0 4px 0 #C4BEB4, 0 6px 12px rgba(0,0,0,0.08)";

  return (
    <div className="shelf-zone">
      {/* Zone label */}
      <div className="zone-header mb-2 flex items-baseline gap-2 px-1">
        <p className="zone-label">{label}</p>
        <p className="zone-sublabel">{sublabel}</p>
      </div>

      {/* Shelf board */}
      <div
        className="shelf-board relative overflow-x-auto"
        style={{ padding: "16px 20px 8px", borderRadius: "4px", background: shelfBg, boxShadow: edgeShadow }}
      >
        {/* Gripper texture line */}
        <div
          className="pointer-events-none absolute left-0 right-0 top-2"
          style={{
            height: "1px",
            background: "repeating-linear-gradient(90deg, transparent, transparent 6px, rgba(255,255,255,0.4) 6px, rgba(255,255,255,0.4) 7px)",
          }}
        />

        {/* Product row */}
        <div className="flex gap-4 pb-2">
          {items.map((item, i) => (
            <ShelfItem
              key={`${item.product_name}-${i}`}
              item={item}
              onToggle={() => onToggle(`${item.product_name}-${i}`)}
            />
          ))}
        </div>
      </div>

      {/* Under-shelf drip edge */}
      <div
        style={{
          height: "2px",
          borderRadius: "0 0 2px 2px",
          background: zone === "in" ? "#A8A29A" : "#B8B2AB",
          margin: "0 4px",
        }}
      />
    </div>
  );
}

// ─── Tutorials section ───────────────────────────────────────────────────────
function TutorialRow({ item }: { item: CartItem }) {
  const videoId = (() => {
    try { return new URL(item.tutorial_url ?? item.seller_url).searchParams.get("v"); }
    catch { return null; }
  })();

  return (
    <a
      href={item.tutorial_url ?? item.seller_url}
      target="_blank"
      rel="noopener noreferrer"
      className="tutorial-row group flex items-center gap-3"
    >
      {videoId && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
          alt=""
          className="h-10 w-16 shrink-0 rounded object-cover"
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="tutorial-title truncate">{item.product_name}</p>
        <p className="tutorial-label mt-0.5">watch free on youtube →</p>
      </div>
    </a>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function ShowerShelfCart({
  cartId,
  items: initialItems,
}: {
  cartId: string;
  items: CartItem[];
}) {
  const [items, setItems] = useState(initialItems);
  const [shareState, setShareState] = useState<"idle" | "copied">("idle");

  function toggleItem(key: string) {
    setItems((prev) =>
      prev.map((item, i) => {
        const k = `${item.product_name}-${i}`;
        if (k !== key) return item;
        return { ...item, status: item.status === "purchased" ? "pending" : "purchased" };
      })
    );
  }

  function getKeyForItem(item: CartItem, i: number) {
    return `${item.product_name}-${i}`;
  }

  const tutorialItems = items.filter((item) => item.product_type === "tutorial");

  const purchasable = items.filter((i) => i.product_type !== "tutorial");
  const purchased = items.filter((i) => i.status === "purchased" && i.product_type !== "tutorial");
  const total = purchasable.reduce((s, i) => s + (i.price_estimate ?? 0) * i.quantity, 0);
  const hasPrice = purchasable.some((i) => i.price_estimate != null);

  function handleGetEverything() {
    const remaining = purchasable.filter((i) => i.status !== "purchased");
    if (remaining.length === 0) return;
    for (const item of remaining) {
      window.open(item.affiliate_url ?? item.seller_url, "_blank", "noopener,noreferrer");
    }
  }

  async function handleShare() {
    const url = `${window.location.origin}/cart/${cartId}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareState("copied");
      setTimeout(() => setShareState("idle"), 2000);
    } catch { /* denied */ }
    fetch(`/api/style-cart/${cartId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checkout_status: "shared" }),
    }).catch(() => {});
  }

  // Build a stable toggle handler keyed by index
  function makeToggle(i: number) {
    return () => toggleItem(getKeyForItem(items[i], i));
  }

  const inShowerWithIndex = items
    .map((item, i) => ({ item, i }))
    .filter(({ item }) => getShelfZone(item) === "in" && item.product_type !== "tutorial");

  const outShowerWithIndex = items
    .map((item, i) => ({ item, i }))
    .filter(({ item }) => getShelfZone(item) === "out" && item.product_type !== "tutorial");

  return (
    <div className="shower-shelf-cart">
      <style>{`
        .shower-shelf-cart {
          font-family: var(--font-dm-sans, 'DM Sans', system-ui, sans-serif);
          background: #F7F5F2;
          min-height: 100vh;
          padding: 0 0 80px;
        }

        /* Header */
        .shelf-header {
          background: #1A1A1A;
          color: #F7F5F2;
          padding: 28px 24px 24px;
        }
        .shelf-title {
          font-family: var(--font-lora, 'Lora', Georgia, serif);
          font-size: 24px;
          font-weight: 600;
          letter-spacing: -0.02em;
          line-height: 1.2;
          color: #F7F5F2;
        }
        .shelf-subtitle {
          font-size: 11px;
          color: #888;
          margin-top: 4px;
          font-weight: 400;
        }

        /* Progress row */
        .progress-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 16px;
        }
        .progress-bar-track {
          flex: 1;
          height: 2px;
          background: rgba(255,255,255,0.15);
          border-radius: 1px;
          overflow: hidden;
        }
        .progress-bar-fill {
          height: 100%;
          background: #7BA7BC;
          border-radius: 1px;
          transition: width 0.4s ease;
        }
        .progress-label {
          font-size: 10px;
          color: #888;
          white-space: nowrap;
        }

        /* Wall tiles area */
        .shelf-wall {
          background: #EDEBE7;
          padding: 24px 20px;
          display: flex;
          flex-direction: column;
          gap: 32px;
          /* subtle tile texture via repeating gradient */
          background-image: repeating-linear-gradient(
            0deg, transparent, transparent 39px, rgba(0,0,0,0.04) 39px, rgba(0,0,0,0.04) 40px
          ), repeating-linear-gradient(
            90deg, transparent, transparent 39px, rgba(0,0,0,0.04) 39px, rgba(0,0,0,0.04) 40px
          );
        }

        /* Zone labels */
        .zone-label {
          font-family: var(--font-lora, 'Lora', Georgia, serif);
          font-size: 11px;
          font-weight: 600;
          color: #1A1A1A;
          letter-spacing: 0.01em;
        }
        .zone-sublabel {
          font-size: 9px;
          color: #888;
          font-weight: 400;
        }

        /* Shelf items */
        .product-label {
          font-size: 9px;
          color: #2A2825;
          text-align: center;
          word-break: break-word;
          hyphens: auto;
          line-height: 1.3;
        }
        .price-label {
          font-size: 8px;
          color: #888;
          text-align: center;
          font-variant-numeric: tabular-nums;
        }

        /* Tutorials */
        .tutorial-section {
          padding: 20px 20px 0;
        }
        .tutorial-section-label {
          font-family: var(--font-lora, 'Lora', Georgia, serif);
          font-size: 11px;
          font-weight: 600;
          color: #1A1A1A;
          margin-bottom: 10px;
        }
        .tutorial-row {
          padding: 10px 0;
          border-bottom: 1px solid rgba(0,0,0,0.07);
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .tutorial-title {
          font-size: 12px;
          color: #1A1A1A;
          font-weight: 500;
        }
        .tutorial-label {
          font-size: 9px;
          color: #888;
        }

        /* Total + actions */
        .cart-footer {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: white;
          border-top: 1px solid #E8E5E0;
          padding: 12px 20px;
          display: flex;
          align-items: center;
          gap: 10px;
          z-index: 20;
        }
        .footer-price {
          font-family: var(--font-lora, 'Lora', Georgia, serif);
          font-size: 15px;
          font-weight: 600;
          color: #1A1A1A;
          flex: 1;
          white-space: nowrap;
        }
        .footer-price-note {
          display: block;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 9px;
          font-weight: 400;
          color: #AAA;
          margin-top: 1px;
        }
        .btn-primary {
          background: #1A1A1A;
          color: #F7F5F2;
          border: none;
          padding: 10px 18px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          border-radius: 2px;
          white-space: nowrap;
          transition: background 0.15s;
          text-decoration: none;
          display: inline-block;
        }
        .btn-primary:hover { background: #333; }
        .btn-secondary {
          background: transparent;
          color: #1A1A1A;
          border: 1px solid #C4BEB4;
          padding: 10px 14px;
          font-size: 11px;
          font-weight: 500;
          cursor: pointer;
          border-radius: 2px;
          white-space: nowrap;
          transition: border-color 0.15s;
        }
        .btn-secondary:hover { border-color: #1A1A1A; }

        /* Divider between in/out */
        .zone-divider {
          height: 1px;
          background: rgba(0,0,0,0.1);
          margin: 0 -20px;
        }

        @media (prefers-reduced-motion: reduce) {
          .progress-bar-fill { transition: none; }
        }
      `}</style>

      {/* Header */}
      <header className="shelf-header">
        <h1 className="shelf-title">your shelf</h1>
        <p className="shelf-subtitle">tap each item to mark as got it · links open to buy</p>

        {purchasable.length > 0 && (
          <div className="progress-row">
            <div className="progress-bar-track">
              <div
                className="progress-bar-fill"
                style={{ width: `${(purchased.length / purchasable.length) * 100}%` }}
              />
            </div>
            <span className="progress-label">
              {purchased.length}/{purchasable.length} got
            </span>
          </div>
        )}
      </header>

      {/* Shelf wall */}
      <div className="shelf-wall">
        {/* In-shower shelf */}
        {inShowerWithIndex.length > 0 && (
          <Shelf
            label="in shower"
            sublabel="shampoo · conditioner · treatments"
            items={inShowerWithIndex.map(({ item }) => item)}
            zone="in"
            onToggle={(key) => {
              const match = inShowerWithIndex.find(
                ({ item, i }) => `${item.product_name}-${i}` === key
              );
              if (match) makeToggle(match.i)();
            }}
          />
        )}

        {inShowerWithIndex.length > 0 && outShowerWithIndex.length > 0 && (
          <div className="zone-divider" />
        )}

        {/* Out-of-shower shelf */}
        {outShowerWithIndex.length > 0 && (
          <Shelf
            label="outside the shower"
            sublabel="leave-in · stylers · tools"
            items={outShowerWithIndex.map(({ item }) => item)}
            zone="out"
            onToggle={(key) => {
              const match = outShowerWithIndex.find(
                ({ item, i }) => `${item.product_name}-${i}` === key
              );
              if (match) makeToggle(match.i)();
            }}
          />
        )}
      </div>

      {/* Tutorials */}
      {tutorialItems.length > 0 && (
        <div className="tutorial-section">
          <p className="tutorial-section-label">tutorials</p>
          {tutorialItems.map((item, i) => (
            <TutorialRow key={i} item={item} />
          ))}
        </div>
      )}

      {/* Store link */}
      <div style={{ padding: "20px 20px 0" }}>
        <a
          href="/store"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            border: "1px solid #E8E5E0",
            padding: "12px 16px",
            textDecoration: "none",
            backgroundColor: "white",
          }}
        >
          <span style={{ fontSize: "11px", color: "#1A1A1A" }}>browse the full qoyl store</span>
          <span style={{ fontSize: "10px", color: "#7BA7BC" }}>shop →</span>
        </a>
      </div>

      {/* Fixed footer */}
      <div className="cart-footer">
        <div className="footer-price">
          {hasPrice ? `$${total.toFixed(2)}` : "—"}
          <span className="footer-price-note">estimated · varies</span>
        </div>
        <button type="button" className="btn-secondary" onClick={handleShare}>
          {shareState === "copied" ? "copied ✓" : "share"}
        </button>
        <button type="button" className="btn-primary" onClick={handleGetEverything}>
          get remaining →
        </button>
      </div>
    </div>
  );
}
