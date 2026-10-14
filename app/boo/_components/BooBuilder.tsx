"use client";

import { useMemo, useState } from "react";
import { curlFamily, type CurlFamily } from "@/lib/compatibility";
import type { HairProfile } from "@/lib/hairProfile";
import {
  BEANIE_ADDON_MAX,
  BEANIE_ADDON_PRICE_CENTS,
  BEANIE_COLORS,
  BONNET_COLORS,
  BOO_EVENT,
  EXTRA_MINI_MAX,
  EXTRA_MINI_PRICE_CENTS,
  GIFT_HAIR_TYPE_OPTIONS,
  GIFT_NOTE_MAX_CHARS,
  GIFT_POROSITY_OPTIONS,
  LOCATIONS,
  MAX_BASKETS_PER_ORDER,
  MINIS_BY_HAIR_TYPE,
  SIZES,
  TOOLS,
  type BooLocationId,
  type GiftHairType,
  type GiftPorosity,
  type SizeId,
  type ToolId,
} from "@/lib/boo/config";

const INPUT_CLASS =
  "w-full rounded-lg border border-bronze/40 bg-transparent px-4 py-3 text-sm text-dark placeholder:text-dark/40 focus:border-bronze focus:outline-none";
const SECTION_LABEL_CLASS = "font-mono text-[9px] uppercase tracking-wide text-muted";
const STEP_LABELS = ["Pickup", "For who", "Size", "Products", "Details", "Review"];

type OrderDraft = {
  location: BooLocationId | null;
  isGift: boolean;
  giftRecipientName: string;
  giftHairType: GiftHairType | null;
  giftPorosity: GiftPorosity | null;
  giftNote: string;
  size: SizeId | null;
  minis: string[];
  extraMinis: number;
  fullSizeProduct: string | null;
  bonnetColor: string | null;
  tool: ToolId | null;
  beanieAddon: boolean;
  beanieColor: string | null;
  candy: boolean;
};

function emptyDraft(): OrderDraft {
  return {
    location: null,
    isGift: false,
    giftRecipientName: "",
    giftHairType: null,
    giftPorosity: null,
    giftNote: "",
    size: null,
    minis: [],
    extraMinis: 0,
    fullSizeProduct: null,
    bonnetColor: null,
    tool: null,
    beanieAddon: false,
    beanieColor: null,
    candy: true,
  };
}

function priceForDraft(draft: OrderDraft): number {
  if (!draft.size) return 0;
  let cents = SIZES[draft.size].totalCents;
  cents += draft.extraMinis * EXTRA_MINI_PRICE_CENTS;
  if (draft.size === "boo" && draft.beanieAddon) cents += BEANIE_ADDON_PRICE_CENTS;
  return cents;
}

// Full ordered mini catalog with the relevant hair-type family's picks
// first (see MINIS_BY_HAIR_TYPE's comment on why this is CurlFamily, not
// a literal "hair_type" column). familyForSort is the signed-in user's
// own family for a "for me" order, or the gift recipient's stated hair
// type for a gift order - null (no profile/not_sure/no selection yet)
// falls back to the unsorted generic pool order.
function minisInOrder(familyForSort: CurlFamily | null): string[] {
  const families: CurlFamily[] = ["straight", "wavy", "curly", "coily"];
  const ordered = familyForSort
    ? [familyForSort, ...families.filter((f) => f !== familyForSort)]
    : families;
  const seen = new Set<string>();
  const result: string[] = [];
  for (const family of ordered) {
    for (const name of MINIS_BY_HAIR_TYPE[family]) {
      if (!seen.has(name)) {
        seen.add(name);
        result.push(name);
      }
    }
  }
  for (const name of MINIS_BY_HAIR_TYPE.generic) {
    if (!seen.has(name)) {
      seen.add(name);
      result.push(name);
    }
  }
  return result;
}

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {STEP_LABELS.map((label, i) => (
        <div key={label} className="flex-1">
          <div className={`h-1 rounded-full ${i + 1 <= step ? "bg-bronze" : "bg-[#e8e8e8]"}`} />
          <p className={`mt-1 font-mono text-[8px] lowercase ${i + 1 === step ? "text-dark" : "text-dark/30"}`}>
            {label}
          </p>
        </div>
      ))}
    </div>
  );
}

function OptionCard({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border p-4 text-left transition-colors ${
        selected ? "border-dark bg-dark text-cream" : "border-bronze/30 text-dark hover:border-bronze"
      }`}
    >
      {children}
    </button>
  );
}

export default function BooBuilder({
  userId,
  profile,
}: {
  userId: string | null;
  profile: HairProfile | null;
}) {
  const [completedBaskets, setCompletedBaskets] = useState<OrderDraft[]>([]);
  const [draft, setDraft] = useState<OrderDraft>(emptyDraft());
  const [step, setStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<"auto_charge" | "tap_to_pay" | null>(null);
  const [guestEmail, setGuestEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ orderIds: string[] } | null>(null);

  const ownFamily = useMemo(() => curlFamily(profile?.curl_type ?? null), [profile]);
  const minisForDraft = useMemo(
    () => minisInOrder(draft.isGift ? (draft.giftHairType === "not_sure" ? null : (draft.giftHairType as CurlFamily | null)) : ownFamily),
    [draft.isGift, draft.giftHairType, ownFamily]
  );

  function set<K extends keyof OrderDraft>(key: K, value: OrderDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function toggleMini(name: string) {
    setDraft((d) => {
      if (d.minis.includes(name)) return { ...d, minis: d.minis.filter((m) => m !== name) };
      if (d.minis.length >= 2) return d;
      return { ...d, minis: [...d.minis, name] };
    });
  }

  function stepError(): string | null {
    if (step === 1) return draft.location ? null : "Pick a pickup location.";
    if (step === 2) {
      if (draft.isGift && !draft.giftRecipientName.trim()) return "Enter the recipient's name.";
      return null;
    }
    if (step === 3) return draft.size ? null : "Pick a size.";
    if (step === 4) {
      if (draft.minis.length !== 2) return "Pick exactly 2 minis.";
      if (draft.size === "bigboo" && !draft.fullSizeProduct) return "Pick a full-size product.";
      return null;
    }
    if (step === 5) {
      if (!draft.bonnetColor) return "Pick a bonnet color.";
      if (!draft.tool) return "Pick a tool.";
      if (draft.size === "bigboo" && !draft.beanieColor) return "Pick a beanie color.";
      if (draft.size === "boo" && draft.beanieAddon && !draft.beanieColor) return "Pick a beanie color.";
      return null;
    }
    return null;
  }

  function goNext() {
    const err = stepError();
    if (err) return setError(err);
    setError(null);
    setStep((s) => Math.min(6, s + 1));
  }
  function goBack() {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  }

  function addAnotherBasket() {
    const err = stepError();
    if (err) return setError(err);
    setCompletedBaskets((b) => [...b, draft]);
    setDraft(emptyDraft());
    setStep(1);
  }

  async function reserve() {
    const err = stepError();
    if (err) return setError(err);
    if (!paymentMethod) return setError("Pick a payment method.");
    if (!userId && !guestEmail.trim()) return setError("Enter an email so we can reach you about pickup.");

    setError(null);
    setSubmitting(true);

    const allBaskets = [...completedBaskets, draft];
    const orders = allBaskets.map((b) => ({
      user_id: userId,
      guest_email: userId ? null : guestEmail.trim(),
      size: b.size as SizeId,
      size_price_cents: priceForDraft(b),
      location: b.location as BooLocationId,
      bonnet_color: b.bonnetColor as string,
      tool: b.tool as ToolId,
      candy: b.candy,
      beanie: b.size === "bigboo" || b.beanieAddon,
      beanie_color: b.beanieColor,
      minis: b.minis,
      extra_minis: b.extraMinis,
      full_size_product: b.fullSizeProduct,
      is_gift: b.isGift,
      gift_recipient_name: b.giftRecipientName.trim() || null,
      gift_note: b.giftNote.trim() || null,
      gift_hair_type: b.giftHairType,
      gift_porosity: b.giftPorosity,
    }));

    const res = await fetch("/api/boo/reserve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orders, paymentMethod }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to reserve. Try again.");
      return;
    }
    setSuccess({ orderIds: data.orderIds ?? [] });
  }

  const allBasketsForReview = [...completedBaskets, draft];
  const totalCents = allBasketsForReview.reduce((sum, b) => sum + priceForDraft(b), 0);
  const totalReservationCents = BOO_EVENT.reservationCents * allBasketsForReview.length;

  if (success) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="text-5xl">🎃</p>
        <h1 className="mt-4 font-serif text-3xl font-semibold text-dark">reserved!</h1>
        <p className="mt-2 font-sans text-sm text-dark/70">
          {success.orderIds.length} basket{success.orderIds.length > 1 ? "s" : ""} reserved for{" "}
          {BOO_EVENT.pickupDateLabel}. We&apos;ll text the exact address the night before.
        </p>
        <p className="mt-6 rounded-xl border border-amber/40 bg-amber/10 p-4 font-sans text-sm text-dark">
          🎟️ 3 lucky bags hold a golden ticket to Find Your Stylist - you won&apos;t know until you open it.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg pb-16">
      <h1 className="font-serif text-3xl font-semibold text-dark sm:text-4xl">🎃 build your boo basket</h1>
      <p className="mt-1 font-sans text-sm text-dark/60">pickup {BOO_EVENT.pickupDateLabel}</p>

      <div className="mt-6">
        <ProgressBar step={step} />
      </div>

      {completedBaskets.length > 0 && step < 6 && (
        <p className="mt-3 font-mono text-[9px] text-muted">
          basket {completedBaskets.length + 1} of up to {MAX_BASKETS_PER_ORDER}
        </p>
      )}

      {error && <p className="mt-4 text-sm text-red">{error}</p>}

      {/* ---- STEP 1: pickup location ---- */}
      {step === 1 && (
        <section className="mt-6 space-y-3">
          <p className={SECTION_LABEL_CLASS}>pickup location</p>
          {LOCATIONS.map((loc) => (
            <OptionCard key={loc.id} selected={draft.location === loc.id} onClick={() => set("location", loc.id)}>
              <p className="font-sans text-sm font-medium">{loc.label}</p>
              <p className="mt-0.5 font-mono text-[10px] opacity-70">{loc.window}</p>
            </OptionCard>
          ))}
          <p className="mt-2 font-sans text-[12px] text-dark/50">
            every product is scored for your hair and Chicago&apos;s fall climate. exact address texted the
            night before.
          </p>
        </section>
      )}

      {/* ---- STEP 2: who is this for ---- */}
      {step === 2 && (
        <section className="mt-6 space-y-3">
          <p className={SECTION_LABEL_CLASS}>who is this for?</p>
          <div className="grid grid-cols-2 gap-3">
            <OptionCard selected={!draft.isGift} onClick={() => set("isGift", false)}>
              <p className="font-sans text-sm font-medium">for me</p>
            </OptionCard>
            <OptionCard selected={draft.isGift} onClick={() => set("isGift", true)}>
              <p className="font-sans text-sm font-medium">as a gift</p>
            </OptionCard>
          </div>
          {draft.isGift && (
            <div className="space-y-3">
              <input
                type="text"
                value={draft.giftRecipientName}
                onChange={(e) => set("giftRecipientName", e.target.value)}
                placeholder="Recipient's name"
                className={INPUT_CLASS}
              />
              <div>
                <p className="mb-1.5 font-mono text-[9px] text-muted">their hair type</p>
                <div className="grid grid-cols-2 gap-2">
                  {GIFT_HAIR_TYPE_OPTIONS.map((opt) => (
                    <OptionCard
                      key={opt.value}
                      selected={draft.giftHairType === opt.value}
                      onClick={() => set("giftHairType", opt.value)}
                    >
                      <p className="font-sans text-xs">{opt.label}</p>
                    </OptionCard>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1.5 font-mono text-[9px] text-muted">their porosity</p>
                <div className="grid grid-cols-2 gap-2">
                  {GIFT_POROSITY_OPTIONS.map((opt) => (
                    <OptionCard
                      key={opt.value}
                      selected={draft.giftPorosity === opt.value}
                      onClick={() => set("giftPorosity", opt.value)}
                    >
                      <p className="font-sans text-xs">{opt.label}</p>
                    </OptionCard>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ---- STEP 3: size ---- */}
      {step === 3 && (
        <section className="mt-6 space-y-3">
          <p className={SECTION_LABEL_CLASS}>size</p>
          {(Object.keys(SIZES) as SizeId[]).map((id) => {
            const s = SIZES[id];
            return (
              <OptionCard key={id} selected={draft.size === id} onClick={() => set("size", id)}>
                <div className="flex items-baseline justify-between">
                  <p className="font-sans text-sm font-medium">{s.label}</p>
                  <p className="font-mono text-xs">
                    ${(s.totalCents / 100).toFixed(0)} · ${(BOO_EVENT.reservationCents / 100).toFixed(0)} now, $
                    {(s.remainderCents / 100).toFixed(0)} at pickup
                  </p>
                </div>
                <ul className="mt-2 space-y-0.5">
                  {s.includes.map((item) => (
                    <li key={item} className="font-mono text-[10px] opacity-70">
                      · {item}
                    </li>
                  ))}
                </ul>
              </OptionCard>
            );
          })}
        </section>
      )}

      {/* ---- STEP 4: products (minis / extra minis / full-size) ---- */}
      {step === 4 && (
        <section className="mt-6 space-y-4">
          <div>
            <p className={SECTION_LABEL_CLASS}>pick 2 minis ({draft.minis.length}/2)</p>
            <div className="mt-2 grid grid-cols-1 gap-2">
              {minisForDraft.map((name) => (
                <OptionCard key={name} selected={draft.minis.includes(name)} onClick={() => toggleMini(name)}>
                  <p className="font-sans text-xs">{name}</p>
                </OptionCard>
              ))}
            </div>
          </div>

          <div>
            <p className={SECTION_LABEL_CLASS}>
              extra minis (+${(EXTRA_MINI_PRICE_CENTS / 100).toFixed(0)} each, max {EXTRA_MINI_MAX})
            </p>
            <div className="mt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => set("extraMinis", Math.max(0, draft.extraMinis - 1))}
                className="h-8 w-8 border border-bronze/40 text-dark hover:border-bronze"
              >
                −
              </button>
              <span className="font-mono text-sm text-dark">{draft.extraMinis}</span>
              <button
                type="button"
                onClick={() => set("extraMinis", Math.min(EXTRA_MINI_MAX, draft.extraMinis + 1))}
                className="h-8 w-8 border border-bronze/40 text-dark hover:border-bronze"
              >
                +
              </button>
            </div>
          </div>

          {draft.size === "bigboo" && (
            <div>
              <p className={SECTION_LABEL_CLASS}>pick 1 full-size product</p>
              <div className="mt-2 grid grid-cols-1 gap-2">
                {minisForDraft.map((name) => (
                  <OptionCard
                    key={name}
                    selected={draft.fullSizeProduct === name}
                    onClick={() => set("fullSizeProduct", name)}
                  >
                    <p className="font-sans text-xs">{name}</p>
                  </OptionCard>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ---- STEP 5: details ---- */}
      {step === 5 && (
        <section className="mt-6 space-y-5">
          <div>
            <p className={SECTION_LABEL_CLASS}>bonnet color</p>
            <div className="mt-2 flex flex-wrap gap-3">
              {BONNET_COLORS.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => set("bonnetColor", c.label)}
                  className="flex flex-col items-center gap-1"
                >
                  <span
                    className="h-9 w-9 rounded-full border-2"
                    style={{ backgroundColor: c.hex, borderColor: draft.bonnetColor === c.label ? "#0a0a0a" : "transparent" }}
                  />
                  <span className="font-mono text-[8px] text-dark/60">{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className={SECTION_LABEL_CLASS}>pick your tool</p>
            <div className="mt-2 space-y-2">
              {TOOLS.map((t) => (
                <OptionCard key={t.val} selected={draft.tool === t.val} onClick={() => set("tool", t.val)}>
                  <p className="font-sans text-sm font-medium">
                    {t.emoji} {t.label}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] opacity-70">{t.desc}</p>
                </OptionCard>
              ))}
            </div>
          </div>

          <div>
            <p className={SECTION_LABEL_CLASS}>satin-lined beanie</p>
            {draft.size === "bigboo" ? (
              <p className="mt-1 font-mono text-[10px] text-muted">included with Big Boo - pick a color:</p>
            ) : (
              <label className="mt-2 flex items-center gap-2 font-sans text-sm text-dark">
                <input
                  type="checkbox"
                  checked={draft.beanieAddon}
                  onChange={(e) => set("beanieAddon", e.target.checked)}
                />
                add a satin-lined beanie (+${(BEANIE_ADDON_PRICE_CENTS / 100).toFixed(0)}, max {BEANIE_ADDON_MAX})
              </label>
            )}
            {(draft.size === "bigboo" || draft.beanieAddon) && (
              <div className="mt-2 flex flex-wrap gap-3">
                {BEANIE_COLORS.map((c) => (
                  <button
                    key={c.label}
                    type="button"
                    onClick={() => set("beanieColor", c.label)}
                    className="flex flex-col items-center gap-1"
                  >
                    <span
                      className="h-9 w-9 rounded-full border-2"
                      style={{ backgroundColor: c.hex, borderColor: draft.beanieColor === c.label ? "#0a0a0a" : "transparent" }}
                    />
                    <span className="font-mono text-[8px] text-dark/60">{c.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className={SECTION_LABEL_CLASS}>halloween candy</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <OptionCard selected={draft.candy} onClick={() => set("candy", true)}>
                <p className="font-sans text-sm">yes 🍬</p>
              </OptionCard>
              <OptionCard selected={!draft.candy} onClick={() => set("candy", false)}>
                <p className="font-sans text-sm">no</p>
              </OptionCard>
            </div>
          </div>

          {draft.isGift && (
            <div>
              <p className={SECTION_LABEL_CLASS}>gift note (optional)</p>
              <textarea
                value={draft.giftNote}
                onChange={(e) => set("giftNote", e.target.value.slice(0, GIFT_NOTE_MAX_CHARS))}
                rows={3}
                placeholder="A short note for the recipient"
                className={`mt-2 ${INPUT_CLASS}`}
              />
              <p className="mt-1 font-mono text-[9px] text-muted">
                {draft.giftNote.length} / {GIFT_NOTE_MAX_CHARS}
              </p>
            </div>
          )}
        </section>
      )}

      {/* ---- STEP 6: review & reserve ---- */}
      {step === 6 && (
        <section className="mt-6 space-y-5">
          <p className={SECTION_LABEL_CLASS}>order summary</p>
          {allBasketsForReview.map((b, i) => (
            <div key={i} className="rounded-xl border border-bronze/30 p-4">
              <p className="font-sans text-sm font-semibold text-dark">
                basket {i + 1}: {b.size ? SIZES[b.size].label : "—"}
              </p>
              <p className="font-mono text-[10px] text-dark/60">
                {b.location ? LOCATIONS.find((l) => l.id === b.location)?.label : "—"} ·{" "}
                {b.isGift ? `gift for ${b.giftRecipientName || "—"}` : "for me"}
              </p>
              <p className="mt-1 font-mono text-[10px] text-dark/60">
                bonnet: {b.bonnetColor ?? "—"} · tool: {b.tool ?? "—"} · beanie:{" "}
                {b.size === "bigboo" || b.beanieAddon ? b.beanieColor ?? "—" : "no"} · candy: {b.candy ? "yes" : "no"}
              </p>
              <p className="mt-1 font-mono text-[10px] text-dark/60">
                minis: {b.minis.join(", ") || "—"}
                {b.extraMinis > 0 && ` (+${b.extraMinis} extra)`}
                {b.fullSizeProduct && ` · full-size: ${b.fullSizeProduct}`}
              </p>
              <p className="mt-2 font-mono text-sm font-bold text-dark">${(priceForDraft(b) / 100).toFixed(2)}</p>
            </div>
          ))}

          {completedBaskets.length + 1 < MAX_BASKETS_PER_ORDER && (
            <button
              type="button"
              onClick={addAnotherBasket}
              className="w-full border border-bronze/40 py-2.5 text-sm font-medium text-dark transition-colors hover:border-bronze"
            >
              + add another basket
            </button>
          )}

          {!userId && (
            <div>
              <p className={SECTION_LABEL_CLASS}>your email</p>
              <input
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="you@email.com"
                className={`mt-2 ${INPUT_CLASS}`}
              />
              <p className="mt-1 font-mono text-[9px] text-muted">for pickup details and the Oct 25 charge/reminder</p>
            </div>
          )}

          <div>
            <p className={SECTION_LABEL_CLASS}>payment method</p>
            <div className="mt-2 space-y-2">
              <OptionCard selected={paymentMethod === "auto_charge"} onClick={() => setPaymentMethod("auto_charge")}>
                <p className="font-sans text-sm font-medium">auto-charge</p>
                <p className="mt-0.5 font-mono text-[10px] opacity-70">{BOO_EVENT.autoChargeLabel}</p>
              </OptionCard>
              <OptionCard selected={paymentMethod === "tap_to_pay"} onClick={() => setPaymentMethod("tap_to_pay")}>
                <p className="font-sans text-sm font-medium">tap to pay</p>
                <p className="mt-0.5 font-mono text-[10px] opacity-70">pay the remainder in person at pickup</p>
              </OptionCard>
            </div>
          </div>

          <div className="flex items-baseline justify-between border-t border-bronze/20 pt-4">
            <p className="font-sans text-sm text-dark/70">
              {allBasketsForReview.length} basket{allBasketsForReview.length > 1 ? "s" : ""} · total $
              {(totalCents / 100).toFixed(2)}
            </p>
            <p className="font-mono text-xs text-dark/60">
              due now: ${(totalReservationCents / 100).toFixed(2)}
            </p>
          </div>

          <button
            type="button"
            onClick={reserve}
            disabled={submitting}
            className="w-full bg-bronze py-3.5 text-sm font-semibold text-cream transition-colors hover:bg-bronze2 disabled:opacity-50"
          >
            {submitting ? "reserving..." : `reserve for $${(totalReservationCents / 100).toFixed(2)} now →`}
          </button>
        </section>
      )}

      {/* ---- nav buttons (steps 1-5) ---- */}
      {step < 6 && (
        <div className="mt-8 flex gap-3">
          {step > 1 && (
            <button
              type="button"
              onClick={goBack}
              className="flex-1 border border-bronze/40 py-2.5 text-sm font-medium text-dark transition-colors hover:border-bronze"
            >
              back
            </button>
          )}
          <button
            type="button"
            onClick={goNext}
            className="flex-1 bg-bronze py-2.5 text-sm font-semibold text-cream transition-colors hover:bg-bronze2"
          >
            next →
          </button>
        </div>
      )}
      {step === 6 && (
        <button type="button" onClick={goBack} className="mt-4 font-mono text-[10px] text-dark/50 underline underline-offset-2 hover:text-dark">
          ← back
        </button>
      )}
    </div>
  );
}
