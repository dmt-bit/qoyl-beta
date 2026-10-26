"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import StylistRecommendationBlock from "@/components/StylistRecommendationBlock";
import type { StyleMatchSummaryData } from "@/lib/styleMatchSummary";

const LENGTH_DIFFERENCE_LABELS: Record<string, string> = {
  same: "About the same length as current hair",
  longer: "Longer than current hair",
  shorter: "Shorter than current hair",
};

const INVOLVES_EXTENSIONS_LABELS: Record<string, string> = {
  none: "No - natural hair only",
  braiding_hair: "Yes - braiding hair",
  sew_in: "Yes - sew-in or weave",
  wig: "Yes - wig",
  not_sure: "Not sure",
};

const CURRENCY = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-full border border-bronze/50 px-3 py-1 text-xs font-medium text-bronze2">
      {children}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest text-bronze2">{children}</p>
  );
}

function ChecklistGroup({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-dark/60">{title}</p>
      <ul className="mt-2 space-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-dark/80">
            <span aria-hidden className="mt-0.5 text-dark/40">☐</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function StyleMatchSummaryContent({ id }: { id: string }) {
  const [data, setData] = useState<StyleMatchSummaryData | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [notes, setNotes] = useState("");
  const [notesSaved, setNotesSaved] = useState(true);
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/style-match/summary/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then((json: StyleMatchSummaryData) => {
        if (cancelled) return;
        setData(json);
        setNotes(json.notes ?? "");
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleSaveNotes() {
    setSavingNotes(true);
    try {
      await fetch(`/api/style-match/summary/${id}/notes`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      setNotesSaved(true);
    } finally {
      setSavingNotes(false);
    }
  }

  if (status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream font-sans">
        <p className="text-sm text-dark/50">Loading summary...</p>
      </main>
    );
  }

  if (status === "error" || !data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream px-6 text-center font-sans">
        <p className="text-sm text-dark/60">
          This summary couldn&apos;t be found. The link may be incorrect or the style match may
          have been removed.
        </p>
      </main>
    );
  }

  const shareUrl = `https://qoyl.live/style-match/summary/${id}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=8&data=${encodeURIComponent(shareUrl)}`;
  const details = data.detectedDetails;

  const hairCareItems = (data.shoppingList?.hairCare ?? []).map(
    (item) => `${item.name} (${item.brand})`
  );
  const toolItems = [
    ...(data.shoppingList?.tools ?? []).map((t) => t.name),
    ...(data.shoppingList?.accessories ?? []).map((t) => t.name),
  ];
  const fakeHairItems = (data.shoppingList?.fakeHair ?? []).map(
    (item) => `${item.name} (${item.packsNeeded})`
  );

  return (
    <main className="min-h-screen bg-cream font-sans text-dark">
      {/* HEADER */}
      <div className="print-hide bg-white px-6 py-8 text-center sm:px-10">
        <p className="font-serif text-2xl font-bold lowercase text-dark">qoyl</p>
        <p className="mt-2 font-serif text-sm text-bronze2">Style Match Summary</p>
        <p className="mt-1 text-[10px] text-dark/50">Created {formatDate(data.createdAt)}</p>
        <p className="mt-3 break-all text-[11px] text-dark/60">{shareUrl}</p>
      </div>
      {/* Print-only compact header - the dark block above is hidden when
          printing (main * forces black-on-white anyway), this keeps the
          essentials visible on a printed page. */}
      <div className="hidden px-6 pt-6 text-center print:block">
        <p className="font-serif text-xl">Qoyl — Style Match Summary</p>
        <p className="mt-1 text-[10px] text-dark/50">Created {formatDate(data.createdAt)}</p>
      </div>

      <div className="mx-auto max-w-2xl px-6 py-10 sm:px-10">
        {/* SECTION 1 - The Style */}
        <section>
          <h1 className="font-serif text-[28px] font-semibold leading-tight text-dark">
            {data.detectedStyle}
          </h1>

          {details.image_url && (
            <div className="relative mt-4 h-[200px] w-[200px] overflow-hidden rounded-lg bg-white/5">
              <Image src={details.image_url} alt={data.detectedStyle} fill className="object-cover" />
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {details.difficulty && <Chip>Difficulty: {capitalize(details.difficulty)}</Chip>}
            {details.estimated_time && <Chip>Est. time: {details.estimated_time}</Chip>}
            <Chip>
              Requires added hair:{" "}
              {details.requires_fake_hair ? `Yes${details.fake_hair_type ? ` - ${details.fake_hair_type}` : ""}` : "No"}
            </Chip>
          </div>

          {details.style_description && (
            <p className="mt-4 text-sm leading-relaxed text-dark/70">{details.style_description}</p>
          )}
        </section>

        {/* SECTION 1.5 - Install Details (item 5) - only shown when this
            style needed added hair, so a natural-hair style's brief stays
            unchanged. */}
        {details.requires_fake_hair && (
          <section className="mt-10">
            <SectionLabel>Install details</SectionLabel>
            <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <div className="flex justify-between border-b border-dark/10 py-1.5 sm:justify-start sm:gap-2">
                <dt className="text-dark/50">Install method</dt>
                <dd className="font-medium capitalize text-dark">
                  {data.survey.installTypeLabel ?? "Not yet chosen"}
                </dd>
              </div>
              <div className="flex justify-between border-b border-dark/10 py-1.5 sm:justify-start sm:gap-2">
                <dt className="text-dark/50">Doing this</dt>
                <dd className="font-medium text-dark">
                  {data.matchedStylist
                    ? `With ${data.matchedStylist.displayName}${data.matchedStylist.salonName ? ` (${data.matchedStylist.salonName})` : ""}`
                    : "Themselves (DIY) or not yet decided"}
                </dd>
              </div>
            </dl>

            {(data.shoppingList?.fakeHairCatalogMatches?.length ?? 0) > 0 ? (
              (() => {
                const match = data.shoppingList!.fakeHairCatalogMatches[0];
                return (
                  <a
                    href={match.click_path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-dark/10 p-3 transition-colors hover:border-dark/30"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-dark">
                        {match.brand_name} — {match.product_name}
                      </span>
                      <span className="mt-0.5 block text-xs text-dark/50">
                        {[match.hair_type, match.matched_color, match.packs_length_label].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-green/20 px-2.5 py-1 text-xs font-semibold text-green">
                      {match.score}
                    </span>
                  </a>
                );
              })()
            ) : (
              <p className="mt-3 text-xs text-dark/50">No hair product matched yet for this client&apos;s texture.</p>
            )}

            {data.tutorials[0] && (
              <a
                href={`https://www.youtube.com/watch?v=${data.tutorials[0].videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 block text-xs font-medium text-dark/70 underline underline-offset-2 hover:text-dark"
              >
                Reference tutorial: {data.tutorials[0].title} →
              </a>
            )}
          </section>
        )}

        {/* SECTION 2 - Client Hair Profile */}
        <section className="mt-10">
          <SectionLabel>About this client&apos;s hair</SectionLabel>
          <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {data.clientProfile.curlType && (
              <div className="flex justify-between border-b border-dark/10 py-1.5 sm:justify-start sm:gap-2">
                <dt className="text-dark/50">Curl type</dt>
                <dd className="font-medium">{data.clientProfile.curlType}</dd>
              </div>
            )}
            {data.clientProfile.porosity && (
              <div className="flex justify-between border-b border-dark/10 py-1.5 sm:justify-start sm:gap-2">
                <dt className="text-dark/50">Porosity</dt>
                <dd className="font-medium">{capitalize(data.clientProfile.porosity)}</dd>
              </div>
            )}
            {data.clientProfile.currentLengthLabel && (
              <div className="flex justify-between border-b border-dark/10 py-1.5 sm:justify-start sm:gap-2">
                <dt className="text-dark/50">Current length</dt>
                <dd className="font-medium">{data.clientProfile.currentLengthLabel}</dd>
              </div>
            )}
            {data.clientProfile.scalpCondition && (
              <div className="flex justify-between border-b border-dark/10 py-1.5 sm:justify-start sm:gap-2">
                <dt className="text-dark/50">Scalp</dt>
                <dd className="font-medium">{capitalize(data.clientProfile.scalpCondition)}</dd>
              </div>
            )}
            {(data.clientProfile.cityState || data.clientProfile.zipCode) && (
              <div className="flex justify-between border-b border-dark/10 py-1.5 sm:justify-start sm:gap-2">
                <dt className="text-dark/50">Location</dt>
                <dd className="font-medium">
                  {data.clientProfile.cityState ?? "-"}
                  {data.clientProfile.zipCode ? ` (zip ${data.clientProfile.zipCode})` : ""}
                </dd>
              </div>
            )}
            {data.clientProfile.waterHardness && (
              <div className="flex justify-between border-b border-dark/10 py-1.5 sm:justify-start sm:gap-2">
                <dt className="text-dark/50">Water type</dt>
                <dd className="font-medium">{capitalize(data.clientProfile.waterHardness)} water area</dd>
              </div>
            )}
            {data.clientProfile.climate && (
              <div className="flex justify-between border-b border-dark/10 py-1.5 sm:justify-start sm:gap-2">
                <dt className="text-dark/50">Climate</dt>
                <dd className="font-medium">{capitalize(data.clientProfile.climate)}</dd>
              </div>
            )}
          </dl>

          {data.howToAchieve && (
            <div className="mt-5 border-l-2 border-dark pl-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-dark/60">
                About achieving this style
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-dark/80">{data.howToAchieve}</p>
            </div>
          )}

          <p className="mt-5 text-[11px] font-semibold uppercase tracking-wide text-dark/60">
            From their style survey
          </p>
          <ul className="mt-2 space-y-1.5 text-sm text-dark/80">
            <li>
              Color match requested: {data.survey.colorMatch ? "Yes - matching this color too" : "No - style only"}
            </li>
            {data.survey.lengthDifference && (
              <li>
                Length goal: {LENGTH_DIFFERENCE_LABELS[data.survey.lengthDifference] ?? data.survey.lengthDifference}
              </li>
            )}
            {data.survey.involvesExtensions && (
              <li>
                Extensions needed:{" "}
                {INVOLVES_EXTENSIONS_LABELS[data.survey.involvesExtensions] ?? data.survey.involvesExtensions}
              </li>
            )}
            <li>
              Adapted for their hair type: {data.survey.translatedForHairType ? "Yes" : "No - shown as-is"}
            </li>
          </ul>
        </section>

        {/* SECTION 3 - Style Reference Tutorials */}
        {data.tutorials.length > 0 && (
          <section className="mt-10">
            <SectionLabel>Style references this client loves</SectionLabel>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {data.tutorials.map((video) => (
                <div key={video.videoId} className="overflow-hidden rounded-lg border border-dark/10">
                  <div className="relative h-24 w-full bg-white/5">
                    {video.thumbnailUrl && (
                      <Image src={video.thumbnailUrl} alt={video.title} fill className="object-cover" />
                    )}
                  </div>
                  <div className="p-3">
                    <p className="line-clamp-2 text-xs font-medium text-dark">{video.title}</p>
                    <p className="mt-1 text-[11px] text-dark/50">{video.channelTitle}</p>
                    <a
                      href={`https://www.youtube.com/watch?v=${video.videoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="print-hide mt-1 inline-block text-[11px] font-medium text-bronze2 underline underline-offset-2"
                    >
                      Watch →
                    </a>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs italic text-dark/50">
              These tutorials reflect the aesthetic the client is going for - please review before
              the appointment.
            </p>
          </section>
        )}

        {/* SECTION 4 - Shopping List */}
        {data.shoppingList && (
          <section className="mt-10">
            <SectionLabel>Products and supplies</SectionLabel>
            {data.survey.hairAdditionPreferenceLabel && (
              <p className="mt-2">
                <span className="inline-block rounded-full border border-bronze/60 bg-warm/40 px-3 py-1 text-xs font-medium text-dark">
                  Hair preference: {data.survey.hairAdditionPreferenceLabel}
                </span>
              </p>
            )}
            <ChecklistGroup title="Added hair needed" items={fakeHairItems} />
            <ChecklistGroup title="Hair care products client is using" items={hairCareItems} />
            <ChecklistGroup title="Tools" items={toolItems} />
            {hairCareItems.length > 0 && (
              <p className="mt-3 text-xs italic text-dark/50">
                These are what the client has been recommended - stylist can advise on
                pre-appointment prep.
              </p>
            )}
          </section>
        )}

        {/* SECTION 5 - Service estimate */}
        <section className="mt-10">
          <SectionLabel>Service estimate</SectionLabel>

          {data.matchedStylist?.service ? (
            <div className="mt-3 rounded-lg border border-bronze/40 bg-warm/40 p-4">
              <p className="text-sm font-semibold text-dark">
                {data.matchedStylist.displayName}
                {data.matchedStylist.salonName ? ` · ${data.matchedStylist.salonName}` : ""}
                {data.matchedStylist.city ? ` · ${data.matchedStylist.city}` : ""}
              </p>
              <p className="mt-2 text-sm text-dark/80">Service: {data.matchedStylist.service.name}</p>
              {data.matchedStylist.service.duration_min != null && (
                <p className="text-sm text-dark/80">
                  Estimated time: {data.matchedStylist.service.duration_min}-
                  {data.matchedStylist.service.duration_max} hours
                </p>
              )}
              {data.matchedStylist.service.price_min != null && (
                <p className="text-sm text-dark/80">
                  Price: {CURRENCY.format(data.matchedStylist.service.price_min)}-
                  {CURRENCY.format(data.matchedStylist.service.price_max ?? data.matchedStylist.service.price_min)}
                </p>
              )}
              {data.matchedStylist.service.deposit_required && (
                <p className="text-sm text-dark/80">
                  Deposit: {data.matchedStylist.service.deposit_amount != null
                    ? CURRENCY.format(data.matchedStylist.service.deposit_amount)
                    : "Required"}{" "}
                  to book
                </p>
              )}
              {data.matchedStylist.bookingUrl && (
                <a
                  href={data.matchedStylist.bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="print-hide mt-2 inline-block text-sm font-medium text-bronze2 underline underline-offset-2"
                >
                  Book at: {data.matchedStylist.bookingUrl} →
                </a>
              )}
              {data.matchedStylist.service.notes && (
                <p className="mt-2 text-xs italic text-dark/50">{data.matchedStylist.service.notes}</p>
              )}
            </div>
          ) : data.marketEstimate ? (
            <div className="mt-3 rounded-lg border border-dark/15 bg-white p-4">
              <p className="text-sm font-semibold text-dark">
                General market rate for {data.marketEstimate.styleName}:
              </p>
              <p className="mt-2 text-sm text-dark/80">
                Estimated time: {data.marketEstimate.durationMin}-{data.marketEstimate.durationMax} hours
              </p>
              <p className="text-sm text-dark/80">
                Typical price range: {CURRENCY.format(data.marketEstimate.priceMin)}-
                {CURRENCY.format(data.marketEstimate.priceMax)}
              </p>
              {data.marketEstimate.priceNotes && (
                <p className="mt-2 text-xs text-dark/60">{data.marketEstimate.priceNotes}</p>
              )}
              {data.marketEstimate.factors.length > 0 && (
                <>
                  <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-dark/60">
                    Factors that affect your price
                  </p>
                  <ul className="mt-1.5 space-y-1">
                    {data.marketEstimate.factors.map((f) => (
                      <li key={f} className="text-xs text-dark/70">
                        - {f}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <p className="mt-3 text-xs italic text-dark/50">
                Always confirm price and deposit requirements before booking. Prices shown are
                market estimates only.
              </p>
              <p className="mt-1 text-xs italic text-dark/50">
                Note for stylist: this estimate is generated by Qoyl based on market averages -
                your actual pricing takes precedence.
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-dark/50">No pricing estimate available for this style yet.</p>
          )}

          {!data.matchedStylist?.service && (
            <div className="print-hide mt-4">
              <StylistRecommendationBlock
                curlType={data.clientProfile.curlType}
                city={data.clientProfile.cityState}
                styleSpecialty={data.detectedStyle}
              />
            </div>
          )}
        </section>

        {/* SECTION 6 - Notes */}
        <section className="mt-10 print-page-break">
          <SectionLabel>Client notes for stylist (optional)</SectionLabel>
          <p className="mt-2 text-sm text-dark/70">Additional notes:</p>
          <textarea
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setNotesSaved(false);
            }}
            rows={4}
            placeholder="Anything else your stylist should know..."
            className="print-hide mt-2 w-full border border-dark/20 bg-white px-3 py-2 text-sm text-dark placeholder:text-dark/30 focus:border-bronze focus:outline-none"
          />
          <p className="hidden whitespace-pre-wrap text-sm text-dark/80 print:block">
            {notes || "-"}
          </p>
          <button
            type="button"
            onClick={handleSaveNotes}
            disabled={notesSaved || savingNotes}
            className="print-hide mt-2 bg-bronze px-4 py-2 text-xs font-semibold text-cream transition-colors hover:bg-bronze2 disabled:opacity-50"
          >
            {savingNotes ? "Saving..." : notesSaved ? "Saved ✓" : "Save notes"}
          </button>
        </section>
      </div>

      {/* FOOTER */}
      <div className="border-t border-dark/10 px-6 py-10 text-center sm:px-10">
        <p className="text-sm font-medium text-dark/70">Generated by Qoyl — qoyl.live</p>
        <p className="mx-auto mt-2 max-w-md text-xs text-dark/50">
          Scores and estimates are based on market data and are for reference only. Individual
          stylist pricing and availability may vary.
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrCodeUrl} alt="QR code linking to this summary" className="mx-auto mt-5 h-32 w-32" />
      </div>
    </main>
  );
}

export default function StyleMatchSummaryPage({ params }: { params: { id: string } }) {
  return <StyleMatchSummaryContent id={params.id} />;
}
