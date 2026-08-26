"use client";

import { useState } from "react";
import { generateExtensionBlendingContent } from "@/lib/extensionBlendingRoutine";
import { generateExtensionNaturalHairRoutine } from "@/lib/extensionNaturalHairRoutine";
import { generateExtensionCareBlocks, type RoutineBlock } from "@/lib/extensionRoutineSteps";
import { getBlendingProductRecommendations, getExtensionProductRecommendations } from "@/lib/extensionProducts";
import { EXTENSION_TYPE_LABELS, type ExtensionProfile } from "@/lib/extensionProfiles";

function RoutineBlockCard({ block }: { block: RoutineBlock }) {
  if (block.type === "note") {
    return (
      <div className="rounded-xl border border-bronze/30 p-5">
        <p className="font-serif text-lg text-bronze2">{block.heading}</p>
        <p className="mt-2 text-sm leading-relaxed text-cream/80">{block.body}</p>
      </div>
    );
  }
  if (block.type === "warning") {
    return (
      <div className="rounded-xl border border-red/40 bg-red/5 p-5">
        <p className="font-serif text-lg text-red">{block.heading}</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-cream/80">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    );
  }
  return (
    <section>
      <h3 className="font-serif text-xl font-semibold text-cream">{block.heading}</h3>
      {block.frequency && <p className="mt-1 text-sm text-cream/60">{block.frequency}</p>}
      <div className="mt-4 space-y-4">
        {block.steps.map((step, i) => (
          <div key={step.title} className="rounded-xl border border-bronze/30 p-5">
            <p className="font-serif text-lg text-bronze2">
              Step {i + 1} - {step.title}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-cream/80">{step.body}</p>
            {step.why && <p className="mt-2 text-xs text-cream/50">Why: {step.why}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

function ProductList({ title, products }: { title: string; products: { name: string; note?: string; accessory?: boolean }[] }) {
  return (
    <div className="rounded-xl border border-bronze/30 p-5">
      <p className="font-serif text-lg text-bronze2">{title}</p>
      <ul className="mt-3 space-y-2">
        {products.map((p) => (
          <li key={p.name} className="text-sm text-cream/80">
            <span className="font-medium text-cream">{p.name}</span>
            {p.accessory && <span className="ml-1.5 text-xs text-bronze2">(accessory)</span>}
            {p.note && <span className="block text-xs text-cream/50">{p.note}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

type TabKey = "extensions" | "natural" | "blending";

export default function ExtensionRoutine({
  profile,
  initialTab = "extensions",
}: {
  profile: ExtensionProfile;
  initialTab?: TabKey;
}) {
  const showBlendingTab = profile.needs_blending;
  const [activeTab, setActiveTab] = useState<TabKey>(
    initialTab === "blending" && !showBlendingTab ? "extensions" : initialTab
  );

  // extension_types is nullable at the DB level (never populated for a
  // fresh row) - the generators below all expect a plain array.
  const normalized = { ...profile, extension_types: profile.extension_types ?? [] };

  const care = generateExtensionCareBlocks(normalized);
  const naturalHair = generateExtensionNaturalHairRoutine(normalized);
  const blending = showBlendingTab ? generateExtensionBlendingContent(normalized) : null;
  const productRecs = getExtensionProductRecommendations(normalized);
  const blendingProducts = getBlendingProductRecommendations();

  const primaryTypeLabel =
    (profile.extension_types ?? []).map((t) => EXTENSION_TYPE_LABELS[t]).filter(Boolean)[0] ?? "extensions";

  const tabs: { key: TabKey; label: string }[] = [
    { key: "extensions", label: care.tabLabel },
    { key: "natural", label: "My Natural Hair Underneath" },
    ...(showBlendingTab ? ([{ key: "blending", label: "Blending" }] as { key: TabKey; label: string }[]) : []),
  ];

  return (
    <div>
      <h1 className="font-serif text-3xl font-semibold text-cream sm:text-4xl">
        Your {primaryTypeLabel} routine
      </h1>

      <div className="mt-6 flex gap-2 overflow-x-auto border-b border-bronze/20 pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "border-bronze text-cream"
                : "border-transparent text-cream/50 hover:text-cream/80"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "extensions" && (
        <div className="mt-6 space-y-8">
          {care.blocks.map((block, i) => (
            <RoutineBlockCard key={i} block={block} />
          ))}
          {productRecs.avoidWarning && (
            <div className="rounded-xl border border-red/40 bg-red/5 p-5">
              <p className="text-sm leading-relaxed text-red">
                Products to NEVER use near your bonds: keep oils, heavy conditioners, and
                anything containing mineral oil away from the attachment points.
              </p>
            </div>
          )}
          <ProductList title="Recommended products" products={productRecs.products} />
        </div>
      )}

      {activeTab === "natural" && (
        <div className="mt-6 space-y-6">
          <p className="text-sm leading-relaxed text-cream/80">{naturalHair.intro}</p>
          <p className="text-sm text-cream/60">Wash frequency: {naturalHair.washFrequency}</p>

          {naturalHair.extraNotes.map((note) => (
            <div key={note} className="rounded-xl border border-bronze/30 p-5">
              <p className="text-sm leading-relaxed text-cream/80">{note}</p>
            </div>
          ))}

          {naturalHair.washDays.map((day) => (
            <section key={day.key}>
              <h3 className="font-serif text-xl font-semibold text-cream">{day.label}</h3>
              <div className="mt-4 space-y-4">
                {day.steps.map((step) => (
                  <div key={step.title} className="rounded-xl border border-bronze/30 p-5">
                    <p className="font-serif text-lg text-bronze2">{step.title}</p>
                    <p className="mt-2 text-sm leading-relaxed text-cream/80">{step.body}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {activeTab === "blending" && blending && (
        <div className="mt-6 space-y-8">
          <p className="text-sm leading-relaxed text-cream/80">
            Blending your natural hair with your extensions - protecting your curl pattern.
          </p>

          {blending.showHeatMethod && (
            <section>
              <h3 className="font-serif text-xl font-semibold text-cream">Blending method: heat (flat iron / blow dry)</h3>
              <div className="mt-4 space-y-4">
                {blending.heatSteps.map((step, i) => (
                  <div key={step.title} className="rounded-xl border border-bronze/30 p-5">
                    <p className="font-serif text-lg text-bronze2">
                      Step {i + 1} - {step.title}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-cream/80">{step.body}</p>
                    {step.why && <p className="mt-2 text-xs text-cream/50">Why: {step.why}</p>}
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-xl border border-bronze/30 p-5">
                <p className="font-serif text-lg text-bronze2">Preserving your curl pattern during the install</p>
                <p className="mt-2 text-sm leading-relaxed text-cream/80">{blending.preservingCurlPattern.body}</p>
                <p className="mt-3 text-sm font-medium text-cream">Signs your natural hair needs a break from heat blending:</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-cream/80">
                  {blending.preservingCurlPattern.signs.map((sign) => (
                    <li key={sign}>{sign}</li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {blending.showNoHeatMethod && (
            <section>
              <h3 className="font-serif text-xl font-semibold text-cream">Blending method: no heat (banding or rollers)</h3>
              <div className="mt-4 space-y-4">
                {blending.noHeatSteps.map((step, i) => (
                  <div key={step.title} className="rounded-xl border border-bronze/30 p-5">
                    <p className="font-serif text-lg text-bronze2">
                      Step {i + 1} - {step.title}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-cream/80">{step.body}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <ProductList title="Blending products" products={blendingProducts} />
        </div>
      )}
    </div>
  );
}
