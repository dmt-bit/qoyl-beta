"use client";

import { useState } from "react";
import { scoreTier, TIER_CLASSES } from "@/lib/compatibility";
import type { CartItem } from "@/lib/styleCart";

const BADGE_CLASS = "font-mono text-[7px] border border-[#d0d0d0] px-1 text-dark/60";
const SELLER_LABEL: Record<CartItem["seller_type"], string> = {
  qoyl_seller: "qoyl seller",
  amazon: "amazon",
  brand_direct: "brand direct",
  youtube: "youtube",
};

function youtubeVideoId(tutorialUrl: string): string | null {
  try {
    return new URL(tutorialUrl).searchParams.get("v");
  } catch {
    return null;
  }
}

function CompatDot({ score }: { score: number }) {
  const tier = scoreTier(score);
  const dotClass = { green: "bg-green", amber: "bg-amber", red: "bg-red" }[tier];
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
      <span className={`font-mono text-[10px] font-bold ${TIER_CLASSES[tier]}`}>{score}</span>
    </span>
  );
}

function CartRow({ item }: { item: CartItem }) {
  const isFakeHair = item.product_type === "fake_hair";
  const isTutorial = item.product_type === "tutorial";

  if (isTutorial) {
    const videoId = youtubeVideoId(item.tutorial_url ?? item.seller_url);
    return (
      <div className="flex items-start gap-3 border border-[#e8e8e8] p-3">
        {videoId && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
            alt=""
            className="h-14 w-24 shrink-0 object-cover"
          />
        )}
        <div className="flex-1">
          <p className="font-sans text-[13px] font-medium text-dark">{item.product_name}</p>
          <div className="mt-1 flex items-center gap-2">
            <span className={BADGE_CLASS}>{SELLER_LABEL[item.seller_type]}</span>
            <a
              href={item.tutorial_url ?? item.seller_url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[10px] text-bronze2 underline underline-offset-2 hover:text-dark"
            >
              watch free →
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-between gap-3 border p-3 ${
        isFakeHair ? "border-2 border-[#0a0a0a]" : "border-[#e8e8e8]"
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="font-sans text-[13px] font-medium text-dark">{item.product_name}</p>
        <div className="mt-1 flex items-center gap-2">
          {item.compat_score != null && <CompatDot score={item.compat_score} />}
          {item.price_estimate != null && (
            <span className="font-mono text-[10px] text-dark/70">${item.price_estimate.toFixed(2)}</span>
          )}
          <span className={BADGE_CLASS}>{SELLER_LABEL[item.seller_type]}</span>
        </div>
      </div>
    </div>
  );
}

const GROUP_ORDER: { type: CartItem["product_type"]; label: string }[] = [
  { type: "fake_hair", label: "fake hair" },
  { type: "product", label: "products" },
  { type: "tool", label: "tools" },
  { type: "tutorial", label: "tutorial" },
];

export default function CompleteYourLookCart({ cartId, items }: { cartId: string; items: CartItem[] }) {
  const [shareState, setShareState] = useState<"idle" | "copied">("idle");

  const purchasable = items.filter((i) => i.product_type !== "tutorial");
  const total = items.reduce((sum, i) => sum + (i.price_estimate ?? 0) * i.quantity, 0);
  const hasKnownPrice = items.some((i) => i.price_estimate != null);

  function getEverything() {
    if (purchasable.length === 0) return;
    const confirmed = window.confirm(
      `this will open ${purchasable.length} tab${purchasable.length > 1 ? "s" : ""} - one for each item in your look. continue?`
    );
    if (!confirmed) return;
    for (const item of purchasable) {
      window.open(item.affiliate_url ?? item.seller_url, "_blank", "noopener,noreferrer");
    }
  }

  async function shareThisLook() {
    const url = `${window.location.origin}/look/${cartId}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareState("copied");
      setTimeout(() => setShareState("idle"), 2000);
    } catch {
      // Clipboard permission can be denied - fail quietly.
    }
    fetch(`/api/style-cart/${cartId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checkout_status: "shared" }),
    }).catch(() => {});
  }

  return (
    <section className="w-full border-t border-dark bg-white px-6 py-10">
      <h2 className="font-sans text-2xl font-bold lowercase text-dark sm:text-3xl">your complete look</h2>
      <p className="mt-1 font-mono text-[10px] lowercase text-muted">everything you need · sourced for your hair</p>

      <div className="mt-6 space-y-6">
        {GROUP_ORDER.map(({ type, label }) => {
          const groupItems = items.filter((i) => i.product_type === type);
          if (groupItems.length === 0) return null;
          return (
            <div key={type}>
              <p className="font-mono text-[9px] uppercase tracking-wide text-muted">{label}</p>
              <div className="mt-2 space-y-2">
                {groupItems.map((item, i) => (
                  <CartRow key={`${type}-${i}`} item={item} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 border-t border-dark/20 pt-4">
        <p className="font-mono text-xs text-dark/70">
          {hasKnownPrice ? `$${total.toFixed(2)}` : "—"}{" "}
          <span className="text-dark/40">estimated total · prices may vary</span>
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={getEverything}
          className="flex-1 bg-dark py-3.5 text-center font-mono text-[12px] lowercase text-white transition-colors hover:bg-bronze2"
        >
          get everything →
        </button>
        <button
          type="button"
          onClick={shareThisLook}
          className="flex-1 border border-dark py-3.5 text-center font-mono text-[12px] lowercase text-dark transition-colors hover:bg-[#f5f5f5]"
        >
          {shareState === "copied" ? "link copied ✓" : "share this look →"}
        </button>
      </div>
    </section>
  );
}
