"use client";

import { useState, useEffect, useCallback } from "react";
import { KIT_STEP_ORDER, KIT_STEP_LABEL, type KitItem, type KitStep } from "@/lib/kitItems";
import { logMlEvent } from "@/lib/mlEvents";

// ─── helpers ────────────────────────────────────────────────────────────────

function formatPrice(cents: number | null): string {
  if (cents == null) return "";
  return `$${cents.toFixed(2)}`;
}

function retailerLabel(retailer: string): string {
  const r = retailer.toLowerCase();
  if (r === "amazon") return "amazon";
  if (r === "qoyl seller") return "qoyl";
  if (r === "target") return "target";
  if (r === "sally beauty") return "sally beauty";
  return r;
}

// ─── sub-components ─────────────────────────────────────────────────────────

function CompatDot({ score }: { score: number }) {
  const color =
    score >= 70 ? "#22c55e" : score >= 45 ? "#f59e0b" : "#ef4444";
  return (
    <span
      className="inline-block h-1.5 w-1.5 rounded-full"
      style={{ background: color }}
    />
  );
}

function KitItemRow({
  item,
  toggled,
  onToggle,
  onBuyClick,
}: {
  item: KitItem;
  toggled: boolean;
  onToggle: (id: string) => void;
  onBuyClick: (item: KitItem) => void;
}) {
  return (
    <div
      className={`flex gap-3 border-b border-[#e8e8e8] py-4 transition-opacity ${
        toggled ? "opacity-40" : ""
      }`}
    >
      {/* image placeholder / product initial */}
      <div className="relative shrink-0">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt={item.name}
            className="h-14 w-14 object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center bg-[#f5f5f5]">
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#aaa]">
              {item.productType === "tool" ? "tool" : item.brand?.slice(0, 3) ?? "—"}
            </span>
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        {/* name + brand */}
        <p className="font-sans text-[13px] font-medium lowercase leading-snug text-dark">
          {item.name}
        </p>
        {item.brand && (
          <p className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-[#aaa]">
            {item.brand}
          </p>
        )}

        {/* why */}
        <p className="mt-1 font-sans text-[11px] leading-relaxed text-dark/60">
          {item.why}
        </p>

        {/* meta row */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {item.compatScore != null && (
            <span className="flex items-center gap-1">
              <CompatDot score={item.compatScore} />
              <span className="font-mono text-[9px] text-dark/50">
                {item.compatScore}
              </span>
            </span>
          )}
          {item.unitPrice != null && (
            <span className="font-mono text-[10px] text-dark/70">
              {formatPrice(item.unitPrice)}
              {item.qty > 1 && (
                <span className="text-dark/40"> × {item.qty}</span>
              )}
            </span>
          )}
          <span className="font-mono text-[9px] uppercase tracking-wider text-[#bbb]">
            {retailerLabel(item.retailer)}
          </span>
        </div>
      </div>

      {/* right column: buy + have-it */}
      <div className="flex shrink-0 flex-col items-end gap-2">
        {!toggled && (
          <a
            href={item.productUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onBuyClick(item)}
            className="whitespace-nowrap bg-dark px-3 py-1.5 font-mono text-[10px] lowercase text-white transition-colors hover:bg-[#333]"
          >
            buy →
          </a>
        )}
        <button
          type="button"
          onClick={() => onToggle(item.id)}
          className={`whitespace-nowrap border px-2 py-1 font-mono text-[9px] lowercase transition-colors ${
            toggled
              ? "border-dark bg-dark text-white"
              : "border-[#d0d0d0] text-[#aaa] hover:border-dark hover:text-dark"
          }`}
        >
          {toggled ? "i have this ✓" : "i have this"}
        </button>
      </div>
    </div>
  );
}

function StepSection({
  step,
  items,
  toggledIds,
  onToggle,
  onBuyClick,
}: {
  step: KitStep;
  items: KitItem[];
  toggledIds: Set<string>;
  onToggle: (id: string) => void;
  onBuyClick: (item: KitItem) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mb-8">
      <p className="mb-3 font-mono text-[9px] uppercase tracking-[0.18em] text-[#aaa]">
        {KIT_STEP_LABEL[step]}
      </p>
      {items.map((item) => (
        <KitItemRow
          key={item.id}
          item={item}
          toggled={toggledIds.has(item.id)}
          onToggle={onToggle}
          onBuyClick={onBuyClick}
        />
      ))}
    </div>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

type KitProps = {
  briefId: string;
  styleName: string;
  referenceImageUrl: string | null;
  paletteColors: string[];
  items: KitItem[];
  src?: string;
};

export default function MyLookKit({
  briefId,
  styleName,
  referenceImageUrl,
  paletteColors,
  items,
  src,
}: KitProps) {
  const [toggledIds, setToggledIds] = useState<Set<string>>(new Set());
  const [shareState, setShareState] = useState<"idle" | "copied">("idle");

  // Log kit view on mount
  useEffect(() => {
    logMlEvent("kit_view", {
      entityId: briefId,
      entityType: "kit",
      metadata: { src: src ?? null },
    }).catch(() => {});
  }, [briefId, src]);

  // Persist toggles in localStorage so they survive a page reload
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`kit-toggles-${briefId}`);
      if (saved) setToggledIds(new Set(JSON.parse(saved) as string[]));
    } catch {
      // localStorage unavailable - fine, toggles just won't persist
    }
  }, [briefId]);

  const handleToggle = useCallback(
    (id: string) => {
      setToggledIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        try {
          localStorage.setItem(`kit-toggles-${briefId}`, JSON.stringify(Array.from(next)));
        } catch {
          // ignore
        }
        logMlEvent("kit_have_it_toggle", {
          entityId: briefId,
          entityType: "kit",
          metadata: { item_id: id, src: src ?? null },
        }).catch(() => {});
        return next;
      });
    },
    [briefId, src]
  );

  const handleBuyClick = useCallback(
    (item: KitItem) => {
      logMlEvent("kit_item_click", {
        entityId: briefId,
        entityType: "kit",
        metadata: {
          item_id: item.id,
          item_name: item.name,
          retailer: item.retailer,
          src: src ?? null,
        },
      }).catch(() => {});
    },
    [briefId, src]
  );

  const handleBuyAll = useCallback(() => {
    const toBuy = items.filter(
      (i) => !toggledIds.has(i.id) && i.productType !== "hair"
    );
    logMlEvent("kit_buy_all_click", {
      entityId: briefId,
      entityType: "kit",
      metadata: { item_count: toBuy.length, src: src ?? null },
    }).catch(() => {});
    for (const item of toBuy) {
      window.open(item.productUrl, "_blank", "noopener,noreferrer");
    }
  }, [items, toggledIds, briefId, src]);

  const handleBookStylist = useCallback(() => {
    logMlEvent("kit_book_stylist_click", {
      entityId: briefId,
      entityType: "kit",
      metadata: { src: src ?? null },
    }).catch(() => {});
  }, [briefId, src]);

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // fallback: select text
    }
    setShareState("copied");
    setTimeout(() => setShareState("idle"), 2000);
  }, []);

  // Totals (exclude toggled-off items)
  const activeItems = items.filter((i) => !toggledIds.has(i.id));
  const knownTotal = activeItems.reduce(
    (sum, i) => sum + (i.unitPrice ?? 0) * i.qty,
    0
  );
  const hasPrice = activeItems.some((i) => i.unitPrice != null);
  const activeCount = activeItems.length;

  // Group items by step
  const byStep = new Map<KitStep, KitItem[]>();
  for (const step of KIT_STEP_ORDER) byStep.set(step, []);
  for (const item of items) {
    byStep.get(item.step)?.push(item);
  }

  return (
    <div className="min-h-screen bg-white font-sans text-dark">
      {/* ── Header ── */}
      <div className="border-b border-dark px-5 pb-6 pt-8">
        {referenceImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={referenceImageUrl}
            alt={styleName}
            className="mb-5 h-48 w-full object-cover"
          />
        )}
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#aaa]">
          my look kit
        </p>
        <h1
          className="mt-1 font-sans font-bold lowercase text-dark"
          style={{ fontSize: "26px", letterSpacing: "-0.5px", lineHeight: 1.1 }}
        >
          {styleName}
        </h1>

        {paletteColors.length > 0 && (
          <div className="mt-3 flex gap-1.5">
            {paletteColors.map((color, i) => (
              <div
                key={i}
                className="h-5 w-5 rounded-sm border border-[#e8e8e8]"
                style={{ background: color }}
                title={color}
              />
            ))}
          </div>
        )}

        <p className="mt-3 font-mono text-[11px] lowercase text-dark/50">
          {items.length} item{items.length !== 1 ? "s" : ""} · sourced for your hair
        </p>
      </div>

      {/* ── Item list ── */}
      <div className="px-5 pt-6">
        {KIT_STEP_ORDER.map((step) => (
          <StepSection
            key={step}
            step={step}
            items={byStep.get(step) ?? []}
            toggledIds={toggledIds}
            onToggle={handleToggle}
            onBuyClick={handleBuyClick}
          />
        ))}
      </div>

      {/* ── Book a stylist CTA ── */}
      <div className="mx-5 mb-8 border border-[#e8e8e8] p-5">
        <p className="font-sans text-[13px] font-medium lowercase text-dark">
          rather have a pro do it?
        </p>
        <p className="mt-1 font-sans text-[11px] leading-relaxed text-dark/60">
          find a stylist in your city who specializes in this look
        </p>
        <a
          href={`/style-match?tab=stylists&style=${encodeURIComponent(styleName)}`}
          onClick={handleBookStylist}
          className="mt-3 inline-block bg-dark px-4 py-2 font-mono text-[10px] lowercase text-white hover:bg-[#333]"
        >
          book a stylist →
        </a>
      </div>

      {/* ── Sticky footer ── */}
      <div className="sticky bottom-0 left-0 right-0 border-t border-dark bg-white px-5 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] lowercase text-dark/50">
              {activeCount} item{activeCount !== 1 ? "s" : ""} left
              {hasPrice && (
                <span className="ml-2 text-dark font-medium">
                  {knownTotal > 0 ? formatPrice(knownTotal) : ""}
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleShare}
              className="border border-dark px-3 py-2 font-mono text-[10px] lowercase text-dark hover:bg-[#f5f5f5]"
            >
              {shareState === "copied" ? "copied ✓" : "share"}
            </button>
            <button
              type="button"
              onClick={handleBuyAll}
              className="bg-dark px-4 py-2 font-mono text-[10px] lowercase text-white hover:bg-[#333]"
            >
              buy all →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
