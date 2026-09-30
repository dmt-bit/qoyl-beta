"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import AnonymousProfileBanner from "@/components/AnonymousProfileBanner";
import FeedbackSurveyModal from "@/components/FeedbackSurveyModal";
import HairTypeStrip from "@/components/HairTypeStrip";
import ShopButton from "@/components/ShopButton";
import { useAuth } from "@/lib/auth-context";
import {
  curlFamily,
  INGREDIENT_FUNCTION_LABELS,
  isColorTreatedYes,
  isSulfate,
  Match,
  nameKeywordBadgeLabel,
  RATING_BORDER_CLASSES,
  ScoreResult,
  TIER_CLASSES,
  scoreCatalogProducts,
  scoreIngredientsText,
  scoreTier,
} from "@/lib/compatibility";
import { CATEGORY_LABEL_BY_SLUG, PRODUCT_CATEGORIES } from "@/lib/productCategories";
import {
  isBudgetActive,
  PRICE_TIER_CLASSES,
  PRICE_TIER_LABEL,
  priceTierFor,
} from "@/lib/priceContext";
import {
  isWeightWarningTier,
  WEIGHT_PILL_CLASSES,
  weightPillLabel,
  WEIGHT_WARNING_CLASSES,
  WEIGHT_WARNING_LABEL,
  weightFitNote,
} from "@/lib/productWeight";
import { supabase } from "@/lib/supabase";
import { classifySearchEvent, logMlEvent } from "@/lib/mlEvents";
import {
  EXTENSION_SEARCH_FILTERS,
  EXTENSION_TYPE_LABELS,
  fetchLatestExtensionProfileByUserId,
  isProductSafeForExtensionFilter,
  type ExtensionProfile,
  type ExtensionSearchFilterKey,
} from "@/lib/extensionProfiles";

const TIER_LABELS: Record<"green" | "amber" | "red", string> = {
  green: "Good match",
  amber: "Check ingredients",
  red: "Not recommended",
};

type Product = {
  code: string;
  name: string;
  brand: string;
  catalogProductId: string;
  imageUrl: string | null;
  categorySlug: string | null;
  priceUsd: number | null;
  // General (non-personalized) score, from catalog_products.average_score -
  // null until supabase/add_brand_directory.sql has been run, or if that
  // migration genuinely hasn't scored this product yet. Shown to
  // anonymous/no-profile visitors as "avg match" (see ResultCard) since
  // scoreCatalogProducts can't produce a real score without a profile.
  averageScore: number | null;
};

type QoylProductRow = {
  id: string;
  name: string;
  barcode: string | null;
  image_url: string | null;
  catalog_brands: { name: string } | null;
  categories: { slug: string } | null;
  price_usd: number | null;
  average_score?: number | null;
};

// catalog_products/catalog_brands - not "products"/"brands" - since
// this Supabase project is shared with qoyl-business, which already has
// its own brands/products tables for its B2B dashboard with a completely
// different schema. Keeping qoyl-beta's consumer catalog on separate
// tables avoids colliding with that.
const QOYL_PRODUCT_SELECT_BASE =
  "id, name, barcode, image_url, catalog_brands(name), categories(slug), price_usd";

// catalog_products.average_score doesn't exist until
// supabase/add_brand_directory.sql has been run - naming it explicitly in
// a select errors the WHOLE query out (Postgrest "column does not
// exist"), not just that field. Probed once and cached for the rest of
// the session rather than a try/fallback on every single fetch call
// (there are several below, all needing average_score now that anonymous
// visitors can see it as "avg match" - see ResultCard).
let averageScoreColumnExistsCache: boolean | null = null;
async function averageScoreColumnExists(): Promise<boolean> {
  if (averageScoreColumnExistsCache !== null) return averageScoreColumnExistsCache;
  const { error } = await supabase.from("catalog_products").select("average_score").limit(1);
  averageScoreColumnExistsCache = !error;
  return averageScoreColumnExistsCache;
}
async function qoylProductSelect(): Promise<string> {
  return (await averageScoreColumnExists()) ? `${QOYL_PRODUCT_SELECT_BASE}, average_score` : QOYL_PRODUCT_SELECT_BASE;
}

function toQoylProduct(p: QoylProductRow): Product {
  return {
    code: p.id,
    name: p.name,
    brand: p.catalog_brands?.name ?? "Unknown brand",
    catalogProductId: p.id,
    imageUrl: p.image_url,
    categorySlug: p.categories?.slug ?? null,
    priceUsd: p.price_usd,
    averageScore: p.average_score ?? null,
  };
}

// Searches Qoyl's own curated catalog_products table only - by product
// name and by brand name via the catalog_brands join. Two separate
// queries merged client-side rather than a single .or() filter across
// the join, since PostgREST's embedded-resource filter syntax is easy to
// get subtly wrong with arbitrary user input. categoryId, when given,
// narrows both queries - e.g. "Leave-In" selected + "Mielle" typed shows
// only Mielle leave-ins, not every Mielle product.
async function fetchQoylProducts(
  query: string,
  categoryId: string | null
): Promise<Product[]> {
  const term = `%${query}%`;
  const select = await qoylProductSelect();

  let byNameQuery = supabase
    .from("catalog_products")
    .select(select)
    .ilike("name", term);
  if (categoryId) byNameQuery = byNameQuery.eq("category_id", categoryId);

  const [{ data: byName }, { data: matchingBrands }] = await Promise.all([
    byNameQuery.limit(20),
    supabase.from("catalog_brands").select("id").ilike("name", term),
  ]);

  const brandIds = (matchingBrands ?? []).map((b) => b.id);
  let byBrand: QoylProductRow[] = [];
  if (brandIds.length) {
    let byBrandQuery = supabase
      .from("catalog_products")
      .select(select)
      .in("brand_id", brandIds);
    if (categoryId) byBrandQuery = byBrandQuery.eq("category_id", categoryId);
    const { data } = await byBrandQuery.limit(20);
    byBrand = (data ?? []) as unknown as QoylProductRow[];
  }

  const byNameRows = (byName ?? []) as unknown as QoylProductRow[];
  const merged = new Map<string, QoylProductRow>();
  for (const row of [...byNameRows, ...byBrand]) {
    merged.set(row.id, row);
  }

  return Array.from(merged.values()).map(toQoylProduct);
}

// Category browse with no search term - every product in the category,
// ordered by brand then product name (not relevance, since there's no
// search term to rank against).
async function fetchProductsByCategory(categoryId: string): Promise<Product[]> {
  const select = await qoylProductSelect();
  const { data } = await supabase
    .from("catalog_products")
    .select(select)
    .eq("category_id", categoryId)
    .order("name", { foreignTable: "catalog_brands" })
    .order("name");

  return ((data ?? []) as unknown as QoylProductRow[]).map(toQoylProduct);
}

type ScoreState =
  | { status: "loading" }
  | { status: "done"; result: ScoreResult }
  | { status: "error"; error: string };

function IngredientRow({ match }: { match: Match }) {
  const borderClass = RATING_BORDER_CLASSES[match.rating] ?? "border-muted";
  const label =
    match.rating.charAt(0).toUpperCase() + match.rating.slice(1);
  const functionLabel = match.primaryFunction
    ? INGREDIENT_FUNCTION_LABELS[match.primaryFunction] ?? null
    : null;

  return (
    <div className={`border-l-4 py-1.5 pl-2.5 ${borderClass}`}>
      <span className="font-sans text-[12px] text-dark">
        {match.ingredient_name}
      </span>
      {match.scoredFromFunction && (
        <span className="ml-1 font-mono text-[8px] text-[#bbb]">est.</span>
      )}
      {match.scoredNeutral && (
        <span className="ml-1 font-mono text-[8px] text-[#e0e0e0]">unscored</span>
      )}
      <span className="ml-1.5 font-sans text-[10px] text-muted">{label}</span>
      {functionLabel && (
        <span className="ml-1.5 inline-block rounded-full border border-bronze/40 px-1.5 py-0.5 font-sans text-[8px] font-medium text-bronze2">
          {functionLabel}
        </span>
      )}
    </div>
  );
}

function ResultCard({
  product,
  scoreState,
  cardExpanded,
  onToggleCard,
  ingredientsExpanded,
  onToggleIngredients,
  curlType,
  porosity,
  budgetRange,
  colorTreated,
  isProfiled,
}: {
  product: Product;
  scoreState: ScoreState | undefined;
  cardExpanded: boolean;
  onToggleCard: () => void;
  ingredientsExpanded: boolean;
  onToggleIngredients: (e: React.MouseEvent) => void;
  curlType: string | null;
  porosity: string | null;
  budgetRange: string | null;
  colorTreated: boolean;
  // Whether the viewer has a real hair profile (signed-in or local) -
  // when false, scoreState is never populated (scoreCatalogProducts can't
  // produce anything without a profile - see SearchPageContent), and the
  // always-visible score block below falls back to
  // product.averageScore, labeled "avg match" instead of "your match".
  isProfiled: boolean;
}) {
  const matches = scoreState?.status === "done" ? scoreState.result.matches : [];
  const preview = matches.slice(0, 4);
  const rest = matches.slice(4);
  const tier =
    scoreState?.status === "done" ? scoreTier(scoreState.result.normalizedScore) : null;
  const productWeight = scoreState?.status === "done" ? scoreState.result.productWeight : null;
  const family = curlFamily(curlType);
  const fitNote = productWeight ? weightFitNote(productWeight, family, curlType, porosity) : null;
  // Straight/wavy searchers get a blunter warning instead of the plain
  // weight label once a product is medium or heavier - a good ingredient
  // score doesn't mean the formulation weight is a good fit. Routine
  // recommendations don't need this: lib/routineProducts.ts already
  // hard-excludes these before they'd ever be picked.
  const showWeightWarning = productWeight ? isWeightWarningTier(productWeight, family) : false;
  const budgetActive = isBudgetActive(budgetRange);
  const priceTier = product.priceUsd != null ? priceTierFor(product.priceUsd) : null;
  const containsSulfates =
    scoreState?.status === "done" ? matches.some((m) => isSulfate(m.ingredient_name)) : false;

  // Always-visible glance score (item 3) - "your match" for a profiled
  // viewer (real per-user score, once scoring finishes), "avg match" for
  // an anonymous one (catalog_products.average_score, not personalized -
  // scoreCatalogProducts can't run without a profile at all). Replaces
  // the old "tap to see compatibility score" gate entirely; tapping the
  // card now only reveals the ingredient-level breakdown below.
  const displayScore = isProfiled
    ? scoreState?.status === "done"
      ? scoreState.result.normalizedScore
      : null
    : product.averageScore;
  const displayLabel = isProfiled ? "your match" : "avg match";

  return (
    <li className="border-b border-[#e8e8e8]">
      <div
        role="button"
        tabIndex={0}
        onClick={onToggleCard}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggleCard();
          }
        }}
        className="cursor-pointer px-4 py-3"
      >
        <div className="flex items-start gap-3">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[#f5f5f5]">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt=""
                fill
                sizes="48px"
                className="object-cover"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-bronze/30 to-dark" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
              <span className="font-sans text-[13px] font-medium text-dark">
                {product.name}
              </span>
              <span className="font-sans text-[11px] text-muted">
                {product.brand}
              </span>
              <span className="shrink-0 rounded-full border border-bronze/40 px-1.5 py-0.5 font-sans text-[8px] font-medium text-bronze2">
                Verified by Qoyl ✓
              </span>
              {product.categorySlug && (
                <span className="shrink-0 rounded-full bg-white px-2 py-1 font-sans text-[8px] font-medium uppercase tracking-wide text-bronze">
                  {CATEGORY_LABEL_BY_SLUG[product.categorySlug] ?? product.categorySlug}
                </span>
              )}
            </div>

            <div className="mt-1.5">
              {displayScore !== null ? (
                <>
                  <span className="font-mono text-[28px] font-bold leading-none text-dark">
                    {displayScore}
                  </span>
                  <div className="my-1 h-px w-8 bg-[#e8e8e8]" />
                  <p className="font-mono text-[8px] lowercase text-[#aaa]" style={{ letterSpacing: "0.08em" }}>
                    {displayLabel}
                  </p>
                </>
              ) : isProfiled && scoreState?.status === "loading" ? (
                <p className="font-sans text-[10px] text-dark/50">Scoring...</p>
              ) : isProfiled && scoreState?.status === "error" ? (
                <p className="font-sans text-[10px] text-red">Couldn&apos;t score this product.</p>
              ) : (
                <p className="font-sans text-[10px] text-dark/30">Not yet scored</p>
              )}
              {!cardExpanded && (
                <p className="mt-1 font-sans text-[11px] text-bronze">
                  Tap for full ingredient breakdown →
                </p>
              )}
            </div>

            {cardExpanded && tier && scoreState?.status === "done" && productWeight && (
              <>
                {scoreState.result.formaldehydeReleasersPresent.length > 0 && (
                  <div className="mt-1">
                    <p className="font-sans text-[12px] font-medium text-red">
                      ⚠ contains formaldehyde-releasing preservative
                    </p>
                    <p className="font-mono text-[10px] text-red">
                      {scoreState.result.formaldehydeReleasersPresent.join(", ")}
                    </p>
                  </div>
                )}
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 font-sans text-[11px] font-semibold ${TIER_CLASSES[tier]}`}
                  >
                    {scoreState.result.normalizedScore} · {TIER_LABELS[tier]}
                  </span>
                  {nameKeywordBadgeLabel(scoreState.result) && (
                    <span className="inline-block rounded-full border border-bronze px-2 py-0.5 font-sans text-[9px] font-medium text-bronze2">
                      {nameKeywordBadgeLabel(scoreState.result)}
                    </span>
                  )}
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 font-sans text-[10px] font-medium ${
                      showWeightWarning ? WEIGHT_WARNING_CLASSES : WEIGHT_PILL_CLASSES[productWeight]
                    }`}
                  >
                    {showWeightWarning ? WEIGHT_WARNING_LABEL : weightPillLabel(productWeight, product.categorySlug)}
                  </span>
                  {budgetActive && priceTier && (
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 font-sans text-[10px] font-medium ${PRICE_TIER_CLASSES[priceTier]}`}
                    >
                      {PRICE_TIER_LABEL[priceTier]}
                    </span>
                  )}
                </div>
                {product.categorySlug === "hairspray" && (
                  <p className="mt-1.5 font-sans text-[11px] leading-snug text-dark/60">
                    hairsprays are finishing products — apply after styling, not before. daily use on high porosity hair may cause dryness over time.
                  </p>
                )}
                {fitNote && (
                  <p className="mt-1.5 font-sans text-[11px] leading-snug text-dark/60">
                    {fitNote}
                  </p>
                )}
                {colorTreated && containsSulfates && (
                  <p className="mt-1.5 rounded-md bg-amber/10 px-2 py-1.5 font-sans text-[11px] leading-snug text-amber">
                    Contains sulfates - may fade color faster. Consider a sulfate-free alternative.
                  </p>
                )}
                {scoreState.result.unscoredIngredientCount > 0 && (
                  <p className="mt-1.5 font-mono text-[9px] text-muted">
                    {scoreState.result.unscoredIngredientCount} ingredient
                    {scoreState.result.unscoredIngredientCount === 1 ? "" : "s"} in this formula
                    {" "}are not yet in our database - scored as estimates (marked &quot;est.&quot; or &quot;unscored&quot; below)
                  </p>
                )}
                {scoreState.result.interactionsDetected.length > 0 && (
                  <div className="mt-1.5">
                    <p className="font-mono text-[9px] font-medium text-bronze">
                      Formula interactions detected
                    </p>
                    <div className="mt-0.5 space-y-0.5">
                      {scoreState.result.interactionsDetected.map((interaction) => (
                        <p
                          key={interaction.interactionId}
                          className="font-sans text-[12px] font-light text-bronze2"
                        >
                          {interaction.explanation}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <Link
                    href="/how-we-score"
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1 inline-block font-sans text-[10px] text-bronze hover:text-bronze2"
                  >
                    How is this score calculated? →
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>

        {cardExpanded && preview.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {preview.map((m, i) => (
              <IngredientRow key={`${m.ingredient_name}-${i}`} match={m} />
            ))}

            {rest.length > 0 && (
              <>
                <div
                  className={`space-y-1.5 overflow-hidden transition-[max-height] duration-500 ease-in-out ${
                    ingredientsExpanded ? "max-h-[1000px]" : "max-h-0"
                  }`}
                >
                  {rest.map((m, i) => (
                    <IngredientRow key={`${m.ingredient_name}-${i + 4}`} match={m} />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={onToggleIngredients}
                  className="font-sans text-[11px] text-bronze2 hover:text-dark"
                >
                  {ingredientsExpanded
                    ? "Hide ingredients ↑"
                    : `See all ${matches.length} ingredients →`}
                </button>
              </>
            )}

            <div className="pt-1" onClick={(e) => e.stopPropagation()}>
              <ShopButton
                productName={product.name}
                brandName={product.brand}
                className="font-sans text-[11px] text-bronze2 hover:text-dark"
              />
            </div>
          </div>
        )}
      </div>
    </li>
  );
}

// Idle-state default for /search (no query, no category selected) -
// used to be its own "trending products this week" section on the home
// page (components/MasonryFeed.tsx, no longer rendered anywhere - see
// app/page.tsx's redesign); ported here rather than left orphaned, per
// the request's "move this INTO search as a default state." The old
// section wasn't really "trending" by any popularity signal (no such
// data exists) - it showed recently-added verified catalog products,
// personally scored when a profile exists. Same behavior here, just
// relocated.
function TrendingProductsSection({
  isProfiled,
  curlType,
  porosity,
  budgetRange,
  colorTreated,
}: {
  isProfiled: boolean;
  curlType: string | null;
  porosity: string | null;
  budgetRange: string | null;
  colorTreated: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [scoresByCode, setScoresByCode] = useState<Record<string, ScoreState>>({});
  const [expandedCardCode, setExpandedCardCode] = useState<string | null>(null);
  const [ingredientsExpanded, setIngredientsExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const select = await qoylProductSelect();
      const { data } = await supabase
        .from("catalog_products")
        .select(select)
        .eq("is_verified", true)
        .order("created_at", { ascending: false })
        .limit(8);
      if (cancelled) return;
      const mapped = ((data ?? []) as unknown as QoylProductRow[]).map(toQoylProduct);
      setProducts(mapped);
      setLoading(false);

      if (isProfiled && mapped.length > 0) {
        const outcomes = await scoreCatalogProducts(mapped.map((p) => p.catalogProductId));
        if (cancelled) return;
        const idByCode = new Map(mapped.map((p) => [p.catalogProductId, p.code]));
        const next: Record<string, ScoreState> = {};
        for (const [productId, outcome] of Object.entries(outcomes)) {
          const code = idByCode.get(productId);
          if (!code) continue;
          next[code] =
            outcome.error || !outcome.result
              ? { status: "error", error: outcome.error ?? "Something went wrong." }
              : { status: "done", result: outcome.result };
        }
        setScoresByCode(next);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isProfiled]);

  if (loading) return <p className="mt-6 text-sm text-dark/50">Loading...</p>;
  if (products.length === 0) return null;

  const sorted = [...products].sort((a, b) => {
    const stateA = scoresByCode[a.code];
    const stateB = scoresByCode[b.code];
    const scoreA = stateA?.status === "done" ? stateA.result.normalizedScore : a.averageScore ?? -1;
    const scoreB = stateB?.status === "done" ? stateB.result.normalizedScore : b.averageScore ?? -1;
    return scoreB - scoreA;
  });

  return (
    <div className="mt-6">
      <p className="font-mono text-[10px] lowercase text-muted">trending now</p>
      <ul className="mt-2">
        {sorted.map((product) => (
          <ResultCard
            key={product.code}
            product={product}
            scoreState={scoresByCode[product.code]}
            cardExpanded={expandedCardCode === product.code}
            onToggleCard={() => {
              setExpandedCardCode((prev) => (prev === product.code ? null : product.code));
              setIngredientsExpanded(false);
            }}
            ingredientsExpanded={ingredientsExpanded}
            onToggleIngredients={(e) => {
              e.stopPropagation();
              setIngredientsExpanded((v) => !v);
            }}
            curlType={curlType}
            porosity={porosity}
            budgetRange={budgetRange}
            colorTreated={colorTreated}
            isProfiled={isProfiled}
          />
        ))}
      </ul>
    </div>
  );
}

function DisclaimerBanner() {
  return (
    <div
      className="mb-6 border-l-[3px] border-bronze bg-warm px-4 py-3 font-sans text-[12px] text-dark"
    >
      Qoyl provides cosmetic ingredient compatibility scores only - not
      medical advice. Results are based on your hair profile and our
      ingredient database. Individual results may vary. Search is free and
      unlimited for everyone.
    </div>
  );
}

// ---- Brand directory + brand catalog page --------------------------------
//
// catalog_brands is missing logo_url/description until
// supabase/add_brand_directory.sql is run - selected with "*" rather than
// an explicit column list so this doesn't error out pre-migration, and
// read defensively below.
type CatalogBrandRow = {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  description?: string | null;
  website?: string | null;
};

type BrandDirectoryEntry = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  productCount: number;
  // From catalog_products.average_score, when the migration has run -
  // null otherwise. Only ever shown if a per-user best-match score isn't
  // available (see bestScoreByBrand below).
  avgScore: number | null;
};

function BrandLogoOrInitial({ name, logoUrl, size = 32 }: { name: string; logoUrl: string | null; size?: number }) {
  if (logoUrl) {
    return (
      <div className="relative shrink-0 overflow-hidden" style={{ width: size, height: size }}>
        <Image src={logoUrl} alt="" fill sizes={`${size}px`} className="object-contain" />
      </div>
    );
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center bg-dark font-sans font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.44 }}
    >
      {name.trim().charAt(0).toUpperCase()}
    </div>
  );
}

function bestMatchTierClass(score: number): string {
  return TIER_CLASSES[scoreTier(score)];
}

async function fetchAllCatalogProductsWithAverageScore(): Promise<
  { id: string; brand_id: string | null; average_score: number | null }[]
> {
  const hasScore = await averageScoreColumnExists();
  if (hasScore) {
    const { data } = await supabase.from("catalog_products").select("id, brand_id, average_score");
    return (data ?? []).map((r) => ({ ...r, average_score: r.average_score ?? null }));
  }
  const { data } = await supabase.from("catalog_products").select("id, brand_id");
  return (data ?? []).map((r) => ({ ...r, average_score: null }));
}

// Dismissible, shown-once explainer for the "avg match" score anonymous
// visitors see (item 3) - localStorage-gated, one flag shared by every
// page that shows product cards (main search + brand catalog), since
// it's explaining the same score concept everywhere.
const SCORE_EXPLAINER_DISMISSED_KEY = "qoyl_score_explainer_dismissed";

function ScoreExplainerBanner() {
  // Defaults to hidden until the localStorage check resolves, rather than
  // flashing the banner in on every load before the check runs.
  const [dismissed, setDismissed] = useState(true);
  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(SCORE_EXPLAINER_DISMISSED_KEY) === "true");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (dismissed) return null;

  return (
    <div className="mt-3 flex items-start justify-between gap-3 border border-[#e8e8e8] bg-white px-4 py-2.5">
      <p className="font-sans text-[12px] font-light leading-relaxed text-[#666]">
        these scores show how well each product works across all hair types. create a profile to see
        your personal score.
      </p>
      <button
        type="button"
        onClick={() => {
          try {
            localStorage.setItem(SCORE_EXPLAINER_DISMISSED_KEY, "true");
          } catch {
            // Best-effort - if storage is blocked, the banner just
            // reappears next load, which is a fine fallback.
          }
          setDismissed(true);
        }}
        aria-label="Dismiss"
        className="shrink-0 font-sans text-sm leading-none text-dark/40 hover:text-dark"
      >
        ×
      </button>
    </div>
  );
}

// Anonymous/no-profile teaser gate. CSS blur only, per the request: the
// data is already fetched (not a server-side gate - nothing sensitive to
// protect, and it'd add latency for no security benefit); the goal is
// conversion, not protection, so a determined visitor inspecting the DOM
// is fine. Shown once per GROUP of blurred cards, not once per card.
function BlurGateCard({
  title,
  description,
  placement,
  brandSlug,
  userId,
}: {
  title: string;
  description: React.ReactNode;
  placement: "brand_catalog" | "search";
  brandSlug?: string;
  // Only ever set for a signed-in user with no hair profile yet (the
  // "no-profile" half of canSearch) - a genuinely anonymous visitor has
  // none, and that's the common case this gate exists for.
  userId?: string | null;
}) {
  function fireEvent(eventType: "blur_gate_cta_tapped" | "blur_gate_signin_tapped") {
    logMlEvent(eventType, {
      userId: userId ?? null,
      metadata: brandSlug ? { placement, brand_slug: brandSlug } : { placement },
    });
  }

  return (
    <div
      className="absolute left-1/2 top-1/2 z-20 w-[calc(100%-32px)] max-w-[320px] -translate-x-1/2 -translate-y-1/2 border border-dark bg-white p-6 text-center"
    >
      <p className="mb-2 font-sans text-[16px] font-bold lowercase text-dark" style={{ letterSpacing: "-0.3px" }}>
        {title}
      </p>
      <p className="mb-4 font-sans text-[12px] font-light leading-[1.75] text-[#666]">{description}</p>
      <Link
        href="/profile"
        onClick={() => fireEvent("blur_gate_cta_tapped")}
        className="block w-full bg-dark py-3 font-sans text-[12px] font-medium lowercase text-white transition-colors hover:bg-bronze2"
      >
        create free profile →
      </Link>
      <p className="mt-3 font-mono text-[10px] text-muted">
        already have an account?{" "}
        <Link
          href="/auth"
          onClick={() => fireEvent("blur_gate_signin_tapped")}
          className="underline underline-offset-2 hover:text-dark"
        >
          sign in
        </Link>
      </p>
    </div>
  );
}

function BlurredResultsGroup({
  gateTitle,
  gateDescription,
  placement,
  brandSlug,
  userId,
  productsShownBeforeGate,
  children,
}: {
  gateTitle: string;
  gateDescription: React.ReactNode;
  placement: "brand_catalog" | "search";
  brandSlug?: string;
  userId?: string | null;
  productsShownBeforeGate: number;
  children: React.ReactNode;
}) {
  // Fires once when this group of blurred cards mounts (i.e. once per
  // brand/search view an anonymous visitor lands on with 5+ results) -
  // the primary anonymous -> profiled conversion metric.
  useEffect(() => {
    logMlEvent("blur_gate_shown", {
      userId: userId ?? null,
      metadata: brandSlug
        ? { placement, brand_slug: brandSlug, products_shown_before_gate: productsShownBeforeGate }
        : { placement, products_shown_before_gate: productsShownBeforeGate },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative mt-2 overflow-hidden">
      <ul aria-hidden="true" className="pointer-events-none select-none" style={{ filter: "blur(4px)" }}>
        {children}
      </ul>
      <div
        className="absolute inset-0 z-10"
        style={{
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          background: "rgba(255,255,255,0.4)",
        }}
      />
      <BlurGateCard
        title={gateTitle}
        description={gateDescription}
        placement={placement}
        brandSlug={brandSlug}
        userId={userId}
      />
    </div>
  );
}

// Qualitative word next to the anonymous bar viz (item 1) - no raw
// number shown to anonymous visitors, just the bar plus a tier-derived
// word. scoreTier's thresholds (70/40) match the bar/word pairing here.
function overallScoreLabel(score: number): string {
  if (score >= 70) return "good overall";
  if (score >= 40) return "fair overall";
  return "below average overall";
}

// Brand directory - "brands" tab on /search. Fetches every catalog_brands
// row with at least one catalog_products row, groups by first letter.
// Anonymous/no-profile visitors are shown the bar viz (average_score) and
// never trigger the whole-catalog scoring batch below; a real profile
// (signed-in or local) gets each brand's best-matching score instead.
function BrandDirectoryView({
  isProfiled,
  onSelectBrand,
  onBack,
}: {
  isProfiled: boolean;
  onSelectBrand: (slug: string) => void;
  onBack: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [brands, setBrands] = useState<BrandDirectoryEntry[]>([]);
  const [bestScoreByBrand, setBestScoreByBrand] = useState<Record<string, number>>({});
  const [scoring, setScoring] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      const [{ data: brandRows }, productRows] = await Promise.all([
        supabase.from("catalog_brands").select("*").order("name"),
        fetchAllCatalogProductsWithAverageScore(),
      ]);
      if (cancelled) return;

      const countByBrand = new Map<string, number>();
      const productIdToBrand = new Map<string, string>();
      const scoreSumByBrand = new Map<string, { sum: number; n: number }>();
      for (const row of productRows) {
        if (!row.brand_id) continue;
        countByBrand.set(row.brand_id, (countByBrand.get(row.brand_id) ?? 0) + 1);
        productIdToBrand.set(row.id, row.brand_id);
        if (typeof row.average_score === "number") {
          const agg = scoreSumByBrand.get(row.brand_id) ?? { sum: 0, n: 0 };
          agg.sum += row.average_score;
          agg.n += 1;
          scoreSumByBrand.set(row.brand_id, agg);
        }
      }

      const entries: BrandDirectoryEntry[] = ((brandRows ?? []) as CatalogBrandRow[])
        .map((b) => {
          const productCount = countByBrand.get(b.id) ?? 0;
          if (productCount === 0) return null;
          const agg = scoreSumByBrand.get(b.id);
          return {
            id: b.id,
            name: b.name,
            slug: b.slug,
            logoUrl: b.logo_url ?? null,
            productCount,
            avgScore: agg ? Math.round(agg.sum / agg.n) : null,
          };
        })
        .filter((e): e is BrandDirectoryEntry => e !== null);

      if (!cancelled) {
        setBrands(entries);
        setLoading(false);
      }

      // Best-match score, scored in the background against the current
      // profile. Anonymous/no-profile visitors get the bar viz (avgScore,
      // above) instead - scoreCatalogProducts can't resolve a profile to
      // score against for them, so skip the heavy whole-catalog batch call
      // entirely rather than firing one that's guaranteed to error.
      if (!isProfiled) return;
      const allIds = productRows.map((r) => r.id);
      if (allIds.length === 0) return;
      setScoring(true);
      const outcomes = await scoreCatalogProducts(allIds);
      if (cancelled) return;
      const bestByBrand = new Map<string, number>();
      for (const [productId, outcome] of Object.entries(outcomes)) {
        if (!outcome.result) continue;
        const brandId = productIdToBrand.get(productId);
        if (!brandId) continue;
        const current = bestByBrand.get(brandId) ?? -1;
        if (outcome.result.normalizedScore > current) {
          bestByBrand.set(brandId, outcome.result.normalizedScore);
        }
      }
      setBestScoreByBrand(Object.fromEntries(bestByBrand));
      setScoring(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [isProfiled]);

  const filtered = searchTerm.trim()
    ? brands.filter((b) => b.name.toLowerCase().includes(searchTerm.trim().toLowerCase()))
    : brands;

  const grouped = new Map<string, BrandDirectoryEntry[]>();
  for (const b of filtered) {
    const letter = b.name.trim().charAt(0).toUpperCase();
    const list = grouped.get(letter) ?? [];
    list.push(b);
    grouped.set(letter, list);
  }
  const letters = Array.from(grouped.keys()).sort();

  return (
    <main className="min-h-screen bg-white font-sans text-dark">
      <HairTypeStrip tileSize={120} />
      <div className="px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-md">
          <button
            type="button"
            onClick={onBack}
            className="font-mono text-[10px] lowercase text-muted hover:text-dark"
          >
            ← all products
          </button>

          <h1 className="mt-3 font-serif text-3xl font-semibold text-dark sm:text-4xl">Brands</h1>
          <p className="mt-2 text-sm text-dark/70">
            Browse the full Qoyl catalog by brand{scoring ? " - scoring your matches..." : ""}.
          </p>

          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="search brands..."
            className="mt-4 w-full border border-bronze/40 bg-transparent px-4 py-3 text-sm text-dark placeholder:text-dark/40 focus:border-bronze focus:outline-none"
          />

          {loading && <p className="mt-6 text-sm text-dark/50">Loading brands...</p>}

          {!loading && filtered.length === 0 && (
            <p className="mt-6 text-sm text-dark/50">No brands match &quot;{searchTerm}&quot;.</p>
          )}

          {!loading &&
            letters.map((letter) => {
              const list = grouped.get(letter) ?? [];
              return (
                <div key={letter} className="mt-6">
                  <div className="flex items-baseline gap-2 border-b border-[#e8e8e8] pb-1.5">
                    <span className="font-mono text-[11px] font-bold tracking-wide text-dark">
                      {letter}
                    </span>
                    <span className="font-mono text-[9px] text-muted">({list.length})</span>
                  </div>
                  {list.map((b) => {
                    const bestScore = bestScoreByBrand[b.id];
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => onSelectBrand(b.slug)}
                        className="group flex w-full items-center gap-4 border-b border-[#f0f0f0] py-3.5 text-left"
                      >
                        <BrandLogoOrInitial name={b.name} logoUrl={b.logoUrl} />
                        <div className="min-w-0 flex-1">
                          <p className="font-sans text-[14px] font-medium lowercase text-dark">{b.name}</p>
                          <p className="font-mono text-[9px] text-muted">{b.productCount} products</p>

                          {isProfiled ? (
                            typeof bestScore === "number" && (
                              <p className={`mt-1 font-mono text-[16px] font-bold ${bestMatchTierClass(bestScore)}`}>
                                {bestScore} best match
                              </p>
                            )
                          ) : (
                            typeof b.avgScore === "number" && (
                              <>
                                <div className="mt-1.5 flex items-center gap-1.5">
                                  <div className="h-[3px] w-[80px] bg-[#e8e8e8]">
                                    <div
                                      className="h-full bg-dark"
                                      style={{ width: `${Math.max(0, Math.min(100, b.avgScore))}%` }}
                                    />
                                  </div>
                                  <span className="font-mono text-[9px] text-muted">
                                    {overallScoreLabel(b.avgScore)}
                                  </span>
                                </div>
                                <p className="mt-1 block font-mono text-[8px] text-[#aaa] sm:hidden sm:group-hover:block">
                                  create a free profile to see your personal match score
                                </p>
                              </>
                            )
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })}
        </div>
      </div>
    </main>
  );
}

// Brand catalog page - /search?brand=[slug]. Reuses ResultCard (the same
// product card as the main search results) for the grid.
function BrandCatalogView({
  slug,
  user,
  isProfiled,
  curlType,
  porosity,
  budgetRange,
  colorTreated,
  onBack,
}: {
  slug: string;
  user: { id: string } | null;
  isProfiled: boolean;
  curlType: string | null;
  porosity: string | null;
  budgetRange: string | null;
  colorTreated: boolean;
  onBack: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [brand, setBrand] = useState<CatalogBrandRow | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [scoresByCode, setScoresByCode] = useState<Record<string, ScoreState>>({});
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [expandedCardCode, setExpandedCardCode] = useState<string | null>(null);
  const [ingredientsExpanded, setIngredientsExpanded] = useState(false);
  const loggedViewRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setCategoryFilter(null);

    (async () => {
      const { data: brandRow } = await supabase
        .from("catalog_brands")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (cancelled) return;
      if (!brandRow) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setBrand(brandRow as CatalogBrandRow);

      const select = await qoylProductSelect();
      const { data: productRows } = await supabase
        .from("catalog_products")
        .select(select)
        .eq("brand_id", brandRow.id)
        .order("name");

      if (cancelled) return;
      const mapped = ((productRows ?? []) as unknown as QoylProductRow[]).map(toQoylProduct);
      setProducts(mapped);
      setLoading(false);

      // Anonymous/no-profile visitors never get real per-user scores -
      // scoreCatalogProducts can't resolve a profile to score against for
      // them at all (see loadScoringProfile in lib/compatibility.ts), so
      // skip the call and let ResultCard fall back to each product's own
      // averageScore ("avg match") instead of firing a batch of
      // guaranteed-to-error requests.
      if (isProfiled && mapped.length > 0) {
        const outcomes = await scoreCatalogProducts(mapped.map((p) => p.catalogProductId));
        if (cancelled) return;
        const idByCode = new Map(mapped.map((p) => [p.catalogProductId, p.code]));
        const next: Record<string, ScoreState> = {};
        for (const [productId, outcome] of Object.entries(outcomes)) {
          const code = idByCode.get(productId);
          if (!code) continue;
          next[code] =
            outcome.error || !outcome.result
              ? { status: "error", error: outcome.error ?? "Something went wrong." }
              : { status: "done", result: outcome.result };
        }
        setScoresByCode(next);
      }
    })();

    return () => {
      cancelled = true;
    };
    // isProfiled included so this re-scores if a visitor creates a
    // profile while already viewing this brand page.
  }, [slug, isProfiled]);

  // Logged once per brand actually loaded, not once per re-render.
  useEffect(() => {
    if (!brand || loggedViewRef.current === brand.id) return;
    loggedViewRef.current = brand.id;
    const scores = Object.values(scoresByCode)
      .filter((s): s is { status: "done"; result: ScoreResult } => s.status === "done")
      .map((s) => s.result.normalizedScore);
    const topScore = scores.length > 0 ? Math.max(...scores) : null;
    logMlEvent("brand_catalog_view", {
      userId: user?.id ?? null,
      metadata: {
        brand_name: brand.name,
        product_count: products.length,
        curl_type: curlType,
        porosity,
        top_score: topScore,
      },
    });
    // Only re-fires if the brand identity changes (guarded above) - scores
    // still trickle in after this first fire, which is fine, the event is
    // a "did they open this brand" signal, not a perfectly final score.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand]);

  if (notFound) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-white px-4 font-sans text-dark">
        <p className="text-sm text-dark/60">Couldn&apos;t find that brand.</p>
        <button type="button" onClick={onBack} className="mt-3 font-mono text-[10px] lowercase text-muted hover:text-dark">
          ← all brands
        </button>
      </main>
    );
  }

  const scoreForSort = (p: Product): number => {
    const state = scoresByCode[p.code];
    if (state?.status === "done") return state.result.normalizedScore;
    return p.averageScore ?? -1;
  };

  const availableCategorySlugs = Array.from(
    new Set(products.map((p) => p.categorySlug).filter((s): s is string => Boolean(s)))
  );
  const availableCategories = PRODUCT_CATEGORIES.filter((c) => availableCategorySlugs.includes(c.slug));

  const filtered = (categoryFilter ? products.filter((p) => p.categorySlug === categoryFilter) : products)
    .slice()
    .sort((a, b) => scoreForSort(b) - scoreForSort(a));

  const bestProduct = products.length
    ? products
        .map((p) => {
          const state = scoresByCode[p.code];
          return { p, score: state?.status === "done" ? state.result.normalizedScore : -1 };
        })
        .filter((x) => x.score >= 0)
        .sort((a, b) => b.score - a.score)[0]
    : undefined;

  return (
    <main className="min-h-screen bg-white font-sans text-dark">
      <HairTypeStrip tileSize={120} />
      <div className="px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-md">
          <button type="button" onClick={onBack} className="font-mono text-[10px] lowercase text-muted hover:text-dark">
            ← all brands
          </button>

          {loading && !brand && <p className="mt-6 text-sm text-dark/50">Loading...</p>}

          {brand && (
            <div className="mt-4 flex items-start justify-between gap-4 border-b border-dark pb-6">
              <div className="min-w-0">
                <BrandLogoOrInitial name={brand.name} logoUrl={brand.logo_url ?? null} size={48} />
                <h1
                  className="mt-3 font-sans text-2xl font-bold lowercase text-dark"
                  style={{ letterSpacing: "-0.8px" }}
                >
                  {brand.name}
                </h1>
                <p className="mt-1 font-mono text-[10px] text-muted">
                  {products.length} product{products.length === 1 ? "" : "s"} in the qoyl catalog
                </p>
              </div>
              {isProfiled && bestProduct && (
                <div className="shrink-0 text-right">
                  <p className="font-mono text-[9px] text-muted">your best match</p>
                  <p className={`font-mono text-[32px] font-bold leading-none ${bestMatchTierClass(bestProduct.score)}`}>
                    {bestProduct.score}
                  </p>
                  <p className="mt-1 max-w-[140px] font-sans text-[11px] font-light text-muted">
                    {bestProduct.p.name}
                  </p>
                </div>
              )}
              {!isProfiled && products.length > 0 && (
                <div className="shrink-0 text-right">
                  <p className="font-sans text-[14px] font-medium text-dark">
                    {products.length} product{products.length === 1 ? "" : "s"} scored
                  </p>
                  <Link href="/profile" className="mt-1 inline-block font-mono text-[10px] text-muted hover:text-dark">
                    see how they match your hair →
                  </Link>
                </div>
              )}
            </div>
          )}

          {brand && availableCategories.length > 0 && (
            <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setCategoryFilter(null)}
                className={`shrink-0 whitespace-nowrap rounded-full border border-bronze px-3 py-1.5 font-sans text-xs font-medium transition-colors ${
                  categoryFilter === null ? "bg-dark text-white" : "bg-transparent text-bronze hover:bg-bronze/10"
                }`}
              >
                all
              </button>
              {availableCategories.map((c) => (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => setCategoryFilter(c.slug)}
                  className={`shrink-0 whitespace-nowrap rounded-full border border-bronze px-3 py-1.5 font-sans text-xs font-medium transition-colors ${
                    categoryFilter === c.slug ? "bg-dark text-white" : "bg-transparent text-bronze hover:bg-bronze/10"
                  }`}
                >
                  {c.label.toLowerCase()}
                </button>
              ))}
            </div>
          )}

          {brand && isProfiled && filtered.length >= 20 && (
            <p className="sticky top-0 z-10 mt-3 bg-white py-1.5 font-mono text-[9px] lowercase text-muted">
              showing {filtered.length} of {products.length}
            </p>
          )}

          {brand && filtered.length === 0 && !loading && (
            <p className="mt-6 text-sm text-dark/50">No products in this category yet.</p>
          )}

          {brand && filtered.length > 0 && !isProfiled && <ScoreExplainerBanner />}

          {brand && filtered.length > 0 && (
            <>
              <ul className="mt-2">
                {(isProfiled ? filtered : filtered.slice(0, 4)).map((product) => (
                  <ResultCard
                    key={product.code}
                    product={product}
                    scoreState={scoresByCode[product.code]}
                    cardExpanded={expandedCardCode === product.code}
                    onToggleCard={() => {
                      setExpandedCardCode((prev) => (prev === product.code ? null : product.code));
                      setIngredientsExpanded(false);
                    }}
                    ingredientsExpanded={ingredientsExpanded}
                    onToggleIngredients={(e) => {
                      e.stopPropagation();
                      setIngredientsExpanded((v) => !v);
                    }}
                    curlType={curlType}
                    porosity={porosity}
                    budgetRange={budgetRange}
                    colorTreated={colorTreated}
                    isProfiled={isProfiled}
                  />
                ))}
              </ul>

              {!isProfiled && filtered.length > 4 && (
                <BlurredResultsGroup
                  gateTitle="your scores. not averages."
                  gateDescription={
                    <>
                      create a free profile — takes 2 minutes — to see exactly how every {brand?.name}{" "}
                      product scores for your specific curl type, porosity, and climate.
                    </>
                  }
                  placement="brand_catalog"
                  brandSlug={slug}
                  userId={user?.id}
                  productsShownBeforeGate={4}
                >
                  {filtered.slice(4, 8).map((product) => (
                    <ResultCard
                      key={product.code}
                      product={product}
                      scoreState={undefined}
                      cardExpanded={false}
                      onToggleCard={() => {}}
                      ingredientsExpanded={false}
                      onToggleIngredients={() => {}}
                      curlType={curlType}
                      porosity={porosity}
                      budgetRange={budgetRange}
                      colorTreated={colorTreated}
                      isProfiled={false}
                    />
                  ))}
                </BlurredResultsGroup>
              )}

              {!isProfiled && filtered.length > 8 && (
                <p className="mt-4 text-center font-mono text-[10px] text-muted">
                  + {filtered.length - 8} more products — visible with a free profile
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}

// Main search results' blur gate (item 6) has no real session/location to
// draw a live example from for an anonymous visitor - rotates between a
// few generic profiles instead, matching the request's "just use a common
// profile... rotates between a few examples."
const EXAMPLE_PROFILE_LINES = [
  "4c high porosity in atlanta",
  "3b low porosity in denver",
  "4a medium porosity in houston",
  "2c fine hair in seattle",
];

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, hairProfile, hairProfileLoading } =
    useAuth();

  const [extensionProfile, setExtensionProfile] = useState<ExtensionProfile | null>(null);
  const [extensionFilter, setExtensionFilter] = useState<ExtensionSearchFilterKey | null>(null);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetchLatestExtensionProfileByUserId(user.id).then((profile) => {
      if (!cancelled) setExtensionProfile(profile);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Anonymous visitors who built a profile without an account (no login,
  // just a hair_profile_id in localStorage) keep the existing "no account
  // required to try" path - checked once on mount since localStorage
  // isn't available during the initial server render.
  const [hasLocalProfile, setHasLocalProfile] = useState(false);
  const [localProfileChecked, setLocalProfileChecked] = useState(false);
  // Only needed for the weight-pill fit note on product cards (Part 5) -
  // signed-in users already get porosity/curl_type from useAuth's
  // hairProfile, but anonymous visitors with a localStorage-only profile
  // have no other source for it at the page level.
  const [localProfileHairInfo, setLocalProfileHairInfo] = useState<{
    porosity: string | null;
    curl_type: string | null;
    budget_range: string | null;
    // Really a Postgres boolean - see isColorTreatedYes.
    color_treated: string | boolean | null;
  } | null>(null);

  useEffect(() => {
    const profileId = localStorage.getItem("hair_profile_id");
    setHasLocalProfile(Boolean(profileId));
    setLocalProfileChecked(true);

    if (profileId) {
      supabase
        .from("hair_profiles")
        .select("porosity, curl_type, budget_range, color_treated")
        .eq("id", profileId)
        .single()
        .then(({ data }) => {
          if (data) setLocalProfileHairInfo(data);
        });
    }
  }, []);

  // True until we know both whether the visitor is signed in and, if so,
  // whether they have a saved hair profile.
  const resolvingAccess =
    authLoading || (Boolean(user) && hairProfileLoading) || !localProfileChecked;

  // A plain spinner is fine for a brief check, but must never hang
  // indefinitely - after 1s of still resolving, switch to a skeleton
  // that at least shows the page's shape instead of an open-ended spinner.
  const [showAccessSkeleton, setShowAccessSkeleton] = useState(false);

  useEffect(() => {
    if (!resolvingAccess) {
      setShowAccessSkeleton(false);
      return;
    }
    const timeoutId = setTimeout(() => setShowAccessSkeleton(true), 1000);
    return () => clearTimeout(timeoutId);
  }, [resolvingAccess]);

  const canSearch = Boolean((user && hairProfile) || (!user && hasLocalProfile));

  // Subtle "consider adding a pre-shampoo" nudge for 3c-4c users - the
  // most skipped step and one of the most impactful for coily hair (see
  // lib/routineSteps.ts's PRE_SHAMPOO_STEP). Checked server-side via
  // hasPreShampooPick since "in their routine" means the same algorithmic
  // pick /routine shows, not something tracked client-side.
  const resolvedCurlType = user ? hairProfile?.curl_type ?? null : localProfileHairInfo?.curl_type ?? null;
  const resolvedPorosity = user ? hairProfile?.porosity ?? null : localProfileHairInfo?.porosity ?? null;
  const isCoilyPreShampooCandidate = ["3c", "4a", "4b", "4c"].includes(resolvedCurlType ?? "");
  const [showPreShampooTip, setShowPreShampooTip] = useState(false);

  useEffect(() => {
    if (!isCoilyPreShampooCandidate) {
      setShowPreShampooTip(false);
      return;
    }
    let cancelled = false;
    const params = new URLSearchParams();
    if (resolvedCurlType) params.set("curl_type", resolvedCurlType);
    if (resolvedPorosity) params.set("porosity", resolvedPorosity);
    fetch(`/api/pre-shampoo-check?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setShowPreShampooTip(!data.hasPick);
      })
      .catch(() => {
        if (!cancelled) setShowPreShampooTip(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCoilyPreShampooCandidate, resolvedCurlType, resolvedPorosity]);

  // Every search is unlimited and free -- no daily count, no
  // subscription entitlement, no anonymous localStorage tracking.
  const readyToSearch = true;

  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [categorySlug, setCategorySlug] = useState(
    () => searchParams.get("category") ?? null
  );
  // categories.id per slug, fetched once - catalog_products only stores
  // category_id (a FK), so the slug from the URL/pill has to be resolved
  // to a real id before it can be used to filter a query.
  const [categoryIdBySlug, setCategoryIdBySlug] = useState<Record<string, string>>({});
  const categoryId = categorySlug ? categoryIdBySlug[categorySlug] ?? null : null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("categories").select("id, slug");
      if (cancelled || !data) return;
      setCategoryIdBySlug(
        Object.fromEntries(data.map((c) => [c.slug, c.id as string]))
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleCategoryTap(slug: string) {
    setCategorySlug((prev) => (prev === slug ? null : slug));
    setQuery("");
  }

  // Brand directory/catalog (see BrandDirectoryView/BrandCatalogView
  // above) are their own URL-driven views on this same route, read fresh
  // from searchParams rather than component state. Deliberately NOT
  // clearing categorySlug/query state when navigating into them - doing
  // that in the same tick as router.push raced against the URL-sync
  // effect below (whose deps are query/categorySlug): clearing them would
  // re-fire that effect before searchParams reflects the new URL,
  // occasionally clobbering the brand/view param it had just pushed.
  // Leaving this state untouched means neither fetch effect below
  // re-runs during the transition (their deps don't change), so they
  // just sit idle/stale underneath the brand view - and a user's
  // previous category selection is still there if they navigate back.
  const brandSlugParam = searchParams.get("brand");
  const isBrandsDirectory = !brandSlugParam && searchParams.get("view") === "brands";

  function goToBrandsDirectory() {
    router.push("/search?view=brands", { scroll: false });
  }

  function goToBrand(slug: string) {
    router.push(`/search?brand=${slug}`, { scroll: false });
  }

  // "← all brands" from the brand catalog page - always the directory,
  // scroll preserved (not a reset-to-top navigation) per the request.
  function backToBrandsDirectory() {
    router.push("/search?view=brands", { scroll: false });
  }

  // "← all products" from the brand directory, back to plain search.
  function backToSearch() {
    router.push("/search", { scroll: false });
  }

  // Lightweight brand list for the main search bar's brand suggestions
  // (item 4) - name/slug/count only, fetched once regardless of which
  // view is active, separate from BrandDirectoryView's own fuller fetch
  // (which also needs logos/scores and only runs once that view mounts).
  const [brandsLite, setBrandsLite] = useState<{ id: string; name: string; slug: string; productCount: number }[]>(
    []
  );
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: brandRows }, { data: productRows }] = await Promise.all([
        supabase.from("catalog_brands").select("id, name, slug"),
        supabase.from("catalog_products").select("brand_id"),
      ]);
      if (cancelled) return;
      const countByBrand = new Map<string, number>();
      for (const row of productRows ?? []) {
        if (!row.brand_id) continue;
        countByBrand.set(row.brand_id, (countByBrand.get(row.brand_id) ?? 0) + 1);
      }
      setBrandsLite(
        (brandRows ?? [])
          .map((b) => ({ ...b, productCount: countByBrand.get(b.id) ?? 0 }))
          .filter((b) => b.productCount > 0)
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const brandMatches = query.trim()
    ? brandsLite
        .filter((b) => b.name.toLowerCase().includes(query.trim().toLowerCase()))
        .slice(0, 3)
    : [];

  // Best-effort brand_search ml_event, debounced with the same 300ms as
  // the product search below so typing doesn't spam an event per
  // keystroke - only fires once brand matches actually settle for the
  // query the user is still on.
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const timeoutId = setTimeout(() => {
      const matches = brandsLite.filter((b) => b.name.toLowerCase().includes(trimmed.toLowerCase()));
      if (matches.length === 0) return;
      logMlEvent("brand_search", {
        userId: user?.id ?? null,
        metadata: { query: trimmed, brand_matched: matches[0].name },
      });
    }, 300);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, brandsLite]);

  // Picked once per mount, not re-rolled on every render - see
  // EXAMPLE_PROFILE_LINES above.
  const [exampleProfileLine] = useState(
    () => EXAMPLE_PROFILE_LINES[Math.floor(Math.random() * EXAMPLE_PROFILE_LINES.length)]
  );

  const [hasScrolledCategories, setHasScrolledCategories] = useState(false);
  // Weight filter pills, item 6 - "Lightweight"/"Medium"/"Rich" split the
  // 5 internal ProductWeight tiers into 3 non-overlapping buckets (the
  // request's own wording for what "Rich" filters to overlapped with
  // "Medium," so this uses the non-overlapping partition implied by the
  // 3-pill layout instead: Lightweight = ultralight+light, Medium =
  // medium, Rich = heavy+very_heavy).
  const [weightFilter, setWeightFilter] = useState<"all" | "light" | "medium" | "rich">("all");

  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [scoresByCode, setScoresByCode] = useState<Record<string, ScoreState>>({});
  // Only one result card can be expanded at a time - expandedCardCode is
  // that product's code, or null if every card is collapsed.
  // ingredientsExpanded is the "see all ingredients" sub-toggle inside
  // whichever card is currently expanded; resets whenever the expanded
  // card changes.
  const [expandedCardCode, setExpandedCardCode] = useState<string | null>(null);
  const [ingredientsExpanded, setIngredientsExpanded] = useState(false);

  const [manualIngredients, setManualIngredients] = useState("");
  const [manualScoring, setManualScoring] = useState(false);
  const [manualScoreError, setManualScoreError] = useState<string | null>(null);
  const [manualScoreResult, setManualScoreResult] = useState<ScoreResult | null>(
    null
  );
  const [showSurvey, setShowSurvey] = useState(false);

  const latestRequestRef = useRef("");

  // Only counts completed searches for signed-in users, and only until
  // the survey has been submitted or dismissed once - after that
  // localStorage flag is set, this is a no-op forever.
  function recordSearchCompletion() {
    if (!user) return;
    if (localStorage.getItem("feedback_submitted") === "true") return;

    const count =
      parseInt(localStorage.getItem("product_search_count") ?? "0", 10) + 1;
    localStorage.setItem("product_search_count", String(count));

    if (count === 2) {
      setShowSurvey(true);
    }
  }

  // Drives AnonymousProfileBanner (item 10) - a separate per-device
  // counter from product_search_count above, since that one is
  // signed-in-only and reset by the feedback flag. This one only ever
  // grows, purely to know when an anonymous visitor has tried the
  // product enough times (3+) for the profile nudge to be worth showing.
  const [anonSearchCount, setAnonSearchCount] = useState(0);
  useEffect(() => {
    const stored = parseInt(localStorage.getItem("qoyl_anon_search_count") ?? "0", 10);
    setAnonSearchCount(Number.isFinite(stored) ? stored : 0);
  }, []);

  function recordAnonSearchCompletion() {
    if (user) return;
    const next = anonSearchCount + 1;
    setAnonSearchCount(next);
    localStorage.setItem("qoyl_anon_search_count", String(next));
  }

  // Best-effort analytics logging - a failure here must never surface to
  // the user or interrupt the actual search/scoring flow.
  async function logProductSearch(product: Product, score: number) {
    try {
      let porosity: string | null = null;
      let curlType: string | null = null;

      if (user && hairProfile) {
        porosity = hairProfile.porosity;
        curlType = hairProfile.curl_type;
      } else {
        const profileId = localStorage.getItem("hair_profile_id");
        if (profileId) {
          const { data } = await supabase
            .from("hair_profiles")
            .select("porosity, curl_type")
            .eq("id", profileId)
            .single();
          if (data) {
            porosity = data.porosity;
            curlType = data.curl_type;
          }
        }
      }

      await supabase.from("product_searches").insert({
        user_id: user?.id ?? null,
        product_name: product.name,
        brand_name: product.brand,
        barcode: product.code,
        compatibility_score: score,
        hair_profile_porosity: porosity,
        hair_profile_curl_type: curlType,
      });

      // Now that every search is free, this anonymous/no-profile/profiled
      // split is the main signal for how well the profile-creation funnel
      // is converting, and which searches are actually worth training on.
      logMlEvent(classifySearchEvent(Boolean(user), curlType), {
        userId: user?.id ?? null,
        metadata: { product_name: product.name, score },
      });
    } catch (err) {
      console.error("Failed to log product search:", err);
    }
  }

  async function scoreResults(products: Product[], forRequest: string) {
    setScoresByCode((prev) => {
      const next = { ...prev };
      for (const p of products) next[p.code] = { status: "loading" };
      return next;
    });

    const idByCode = new Map(products.map((p) => [p.catalogProductId, p.code]));
    const outcomes = await scoreCatalogProducts(
      products.map((p) => p.catalogProductId)
    );

    if (latestRequestRef.current !== forRequest) return; // stale search, ignore

    setScoresByCode((prev) => {
      const next = { ...prev };
      for (const [productId, outcome] of Object.entries(outcomes)) {
        const code = idByCode.get(productId);
        if (!code) continue;
        next[code] =
          outcome.error || !outcome.result
            ? { status: "error", error: outcome.error ?? "Something went wrong." }
            : { status: "done", result: outcome.result };
      }
      return next;
    });

    for (const p of products) {
      const outcome = outcomes[p.catalogProductId];
      if (outcome?.result) {
        logProductSearch(p, outcome.result.normalizedScore);
      }
    }

    recordSearchCompletion();
    recordAnonSearchCompletion();
  }

  // Keeps the URL in sync with category/query state (item 6) - runs
  // immediately, separately from the debounced fetch below, so the URL
  // reflects what's typed/selected even before the fetch settles.
  useEffect(() => {
    // Brand directory/catalog (view=brands / brand=[slug]) are a separate
    // URL-driven view (see goToBrandsDirectory/goToBrand/backTo* above) -
    // this effect only owns category/q, so it bails while either brand
    // param is present rather than stripping it out on every
    // category/query state change.
    if (searchParams.get("brand") || searchParams.get("view") === "brands") return;
    const params = new URLSearchParams();
    if (categorySlug) params.set("category", categorySlug);
    if (query.trim()) params.set("q", query);
    const qs = params.toString();
    router.replace(qs ? `/search?${qs}` : "/search", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, categorySlug]);

  useEffect(() => {
    const trimmed = query.trim();

    // Neither a category nor a search term - idle state, no fetch, no
    // search consumed. Keyed on categorySlug (the UI selection), not
    // categoryId (which only resolves once the categories fetch above
    // completes) - otherwise tapping a pill before that fetch finishes
    // would be wrongly treated as idle.
    if (!categorySlug && trimmed === "") {
      latestRequestRef.current = "";
      setResults([]);
      setHasSearched(false);
      setSearchError(null);
      setScoresByCode({});
      setExpandedCardCode(null);
      setIngredientsExpanded(false);
      setWeightFilter("all");
      return;
    }

    // A category is selected but its id hasn't resolved yet - wait
    // rather than fetching with a null categoryId (which would silently
    // run an unfiltered search). Re-fires once categoryIdBySlug loads.
    if (categorySlug && !categoryId) return;

    // Entitlement/search-state haven't loaded yet - wait rather than
    // checking the limit against stale defaults. The effect re-runs once
    // readyToSearch flips true.
    if (!readyToSearch) return;

    const timeoutId = setTimeout(async () => {
      const thisRequest = `${categoryId ?? ""}::${trimmed}`;
      latestRequestRef.current = thisRequest;

      setLoading(true);
      setSearchError(null);

      try {
        const qoylProducts =
          categoryId && trimmed === ""
            ? await fetchProductsByCategory(categoryId)
            : await fetchQoylProducts(trimmed, categoryId);
        if (latestRequestRef.current !== thisRequest) return;

        setResults(qoylProducts);
        setHasSearched(true);
        setExpandedCardCode(null);
        setIngredientsExpanded(false);
        setScoresByCode({});
        setWeightFilter("all");

        // Anonymous/no-profile visitors never get real per-user scores -
        // see the identical note in BrandCatalogView. They fall back to
        // each product's own averageScore ("avg match" in ResultCard)
        // instead of firing a batch that's guaranteed to error.
        if (qoylProducts.length > 0 && canSearch) {
          scoreResults(qoylProducts, thisRequest);
        }
      } catch {
        if (latestRequestRef.current === thisRequest) {
          setSearchError("Couldn't reach the product search. Try again.");
          setHasSearched(true);
        }
      } finally {
        if (latestRequestRef.current === thisRequest) setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, categorySlug, categoryId, readyToSearch]);

  function toggleCard(code: string) {
    setExpandedCardCode((prev) => (prev === code ? null : code));
    setIngredientsExpanded(false);
  }

  function toggleIngredients(e: React.MouseEvent) {
    e.stopPropagation();
    setIngredientsExpanded((prev) => !prev);
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    setManualScoring(true);
    setManualScoreError(null);
    setManualScoreResult(null);

    const outcome = await scoreIngredientsText(manualIngredients);

    setManualScoring(false);

    if (outcome.error || !outcome.result) {
      setManualScoreError(outcome.error ?? "Something went wrong.");
      return;
    }

    setManualScoreResult(outcome.result);
  }

  const showNoResults = !loading && hasSearched && results.length === 0 && !searchError;

  if (resolvingAccess) {
    if (showAccessSkeleton) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-white px-4 font-sans sm:px-6">
          <div className="w-full max-w-md">
            <div className="h-12 w-full animate-pulse rounded-lg bg-[#f5f5f5]" />
          </div>
        </main>
      );
    }
    return (
      <main className="flex min-h-screen items-center justify-center bg-white font-sans">
        <p className="text-sm text-dark/60">Loading...</p>
      </main>
    );
  }

  // canSearch used to hard-block the entire page behind SearchAuthGate for
  // anyone with no hair profile at all. That's been replaced by the
  // anonymous teaser + blur-gate experience below (see BlurredResultsGroup) -
  // everyone can browse now, "isProfiled" just decides real per-user
  // scores vs. average_score, and whether results past the first 4 are
  // blurred. SearchAuthGate itself is left in place (unused here) rather
  // than deleted, since removing a whole component isn't this task's ask.
  const isProfiled = canSearch;

  if (brandSlugParam) {
    return (
      <BrandCatalogView
        slug={brandSlugParam}
        user={user ?? null}
        isProfiled={isProfiled}
        curlType={resolvedCurlType}
        porosity={resolvedPorosity}
        budgetRange={user ? hairProfile?.budget_range ?? null : localProfileHairInfo?.budget_range ?? null}
        colorTreated={isColorTreatedYes(
          user ? hairProfile?.color_treated ?? null : localProfileHairInfo?.color_treated ?? null
        )}
        onBack={backToBrandsDirectory}
      />
    );
  }

  if (isBrandsDirectory) {
    return <BrandDirectoryView isProfiled={isProfiled} onSelectBrand={goToBrand} onBack={backToSearch} />;
  }

  // Browsing a category with no search term - sort by compatibility score
  // highest first, same as a category tap/URL-preselect/category switch
  // (all of these just change categorySlug, which this reads live on
  // every render, so no extra effect/state is needed to keep the sort in
  // sync with taps, browser back/forward, or a future "load more").
  // Text search (query.trim() !== "") is left alone - it has its own
  // name/brand relevance order from fetchQoylProducts and should never be
  // silently re-sorted by score.
  //
  // UPDATE: an anonymous/no-profile "no reachable case" note used to live
  // here - no longer true. canSearch/isProfiled no longer hard-blocks the
  // page (see the blur-gate work above), so an anonymous visitor really
  // does land on category browse with an empty scoresByCode, and
  // scoreForSort below now falls back to catalog_products.average_score
  // for them, same as BrandCatalogView/BrandDirectoryView.
  const isPureCategoryBrowse = Boolean(categorySlug) && query.trim() === "";
  const scoreForSort = (p: Product): number => {
    const state = scoresByCode[p.code];
    if (state?.status === "done") return state.result.normalizedScore;
    // Anonymous/no-profile visitors never populate scoresByCode (see the
    // canSearch guard around scoreResults above) - fall back to the
    // catalog-wide average, same as BrandCatalogView's scoreForSort.
    return p.averageScore ?? -1;
  };
  const categorySortedResults = isPureCategoryBrowse
    ? [...results].sort((a, b) => scoreForSort(b) - scoreForSort(a))
    : results;

  const sortLabelCurlType =
    resolvedCurlType && resolvedCurlType !== "not_sure" ? resolvedCurlType : null;
  const sortLabelPorosity =
    resolvedPorosity && resolvedPorosity !== "not_sure" ? `${resolvedPorosity} porosity ` : "";
  const sortNoticeText = !canSearch
    ? "sorted by average compatibility"
    : sortLabelCurlType
    ? `sorted by match for your ${sortLabelCurlType} ${sortLabelPorosity}hair`
    : "sorted by compatibility with your hair profile";

  let filteredResults =
    weightFilter === "all"
      ? categorySortedResults
      : categorySortedResults.filter((product) => {
          const state = scoresByCode[product.code];
          if (state?.status !== "done") return false;
          const w = state.result.productWeight;
          if (weightFilter === "light") return w === "ultralight" || w === "light";
          if (weightFilter === "medium") return w === "medium";
          return w === "heavy" || w === "very_heavy";
        });

  // Extension quick filters (item 7) - "adhesive remover" is a literal
  // product search (surface anything named like a remover first), the
  // rest reorder to surface ingredient-safe products first rather than
  // hard-filtering, since a small catalog could otherwise show zero
  // results for a legitimate safety concern.
  if (extensionFilter === "adhesive_remover") {
    const isRemover = (p: Product) => /remover|isopropyl|adhesive/i.test(p.name);
    filteredResults = [...filteredResults].sort(
      (a, b) => Number(isRemover(b)) - Number(isRemover(a))
    );
  } else if (extensionFilter) {
    const isSafe = (p: Product) => {
      const state = scoresByCode[p.code];
      const names = state?.status === "done" ? state.result.matches.map((m) => m.ingredient_name) : [];
      return isProductSafeForExtensionFilter(names, extensionFilter);
    };
    filteredResults = [...filteredResults].sort((a, b) => Number(isSafe(b)) - Number(isSafe(a)));
  }

  return (
    <main className="min-h-screen bg-white font-sans text-dark">
      <HairTypeStrip tileSize={120} />

      <div className="px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-md">
        <DisclaimerBanner />

        {!user && <AnonymousProfileBanner searchCount={anonSearchCount} />}

        <h1 className="font-serif text-3xl font-semibold text-dark sm:text-4xl">
          Search a Product
        </h1>
        <p className="mt-2 text-sm text-dark/70">
          Find a product to check its compatibility with your hair profile.
        </p>

        {extensionProfile && (
          <div className="mt-5 border border-bronze/40 bg-bronze/10 px-4 py-3">
            <p className="text-sm font-medium text-dark">
              Products safe for your{" "}
              {(extensionProfile.extension_types ?? [])
                .map((t) => EXTENSION_TYPE_LABELS[t])
                .filter(Boolean)
                .join(", ") || "extensions"}
              :
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {EXTENSION_SEARCH_FILTERS.map((filter) => {
                const isActive = extensionFilter === filter.key;
                return (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setExtensionFilter(isActive ? null : filter.key)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      isActive
                        ? "border-bronze bg-bronze text-cream"
                        : "border-bronze/40 text-bronze2 hover:border-bronze"
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="relative -mx-4 mt-6 px-4 sm:mx-0 sm:px-0">
          <div
            onScroll={() => setHasScrolledCategories(true)}
            className="no-scrollbar flex gap-2 overflow-x-auto pb-1"
          >
            {PRODUCT_CATEGORIES.map((c) => {
              const isActive = c.slug === categorySlug;
              return (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => handleCategoryTap(c.slug)}
                  className={`shrink-0 whitespace-nowrap rounded-full border border-bronze px-3 py-1.5 font-sans text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-white text-dark"
                      : "bg-transparent text-bronze hover:bg-bronze/10"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={goToBrandsDirectory}
              className="shrink-0 whitespace-nowrap rounded-full border border-dark bg-dark px-3 py-1.5 font-sans text-xs font-medium text-white transition-colors hover:bg-bronze2"
            >
              brands
            </button>
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex w-10 items-center justify-end bg-gradient-to-r from-transparent to-dark">
            {!hasScrolledCategories && (
              <span className="pr-1 text-lg leading-none text-bronze">›</span>
            )}
          </div>
        </div>

        {isPureCategoryBrowse && (
          <p className="mt-2 font-mono text-[9px] lowercase text-muted">{sortNoticeText}</p>
        )}

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by product name or brand..."
          className="mt-4 w-full border border-bronze/40 bg-transparent px-4 py-3 text-sm text-dark placeholder:text-dark/40 focus:border-bronze focus:outline-none"
        />

        {brandMatches.length > 0 && (
          <div className="mt-2 border border-bronze/20">
            {brandMatches.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => goToBrand(b.slug)}
                className="flex w-full items-center gap-2 border-b border-bronze/10 px-3 py-2 text-left last:border-b-0 hover:bg-warm"
              >
                <span className="inline-flex h-5 shrink-0 items-center justify-center bg-dark px-1.5 font-mono text-[9px] text-white">
                  brand
                </span>
                <span className="min-w-0 flex-1 truncate font-sans text-[13px] font-medium lowercase text-dark">
                  {b.name}
                </span>
                <span className="shrink-0 font-mono text-[9px] text-muted">
                  {b.productCount} product{b.productCount === 1 ? "" : "s"} →
                </span>
              </button>
            ))}
          </div>
        )}

        {showPreShampooTip && (
          <p className="mt-3 font-sans text-[12px] font-light text-[#666]">
            consider adding a pre-shampoo to your routine — it&apos;s the most skipped step and one
            of the most impactful for coily hair.{" "}
            <button
              type="button"
              onClick={() => {
                handleCategoryTap("pre-shampoo");
                setShowPreShampooTip(false);
              }}
              className="underline underline-offset-2 hover:text-dark"
            >
              search pre-shampoos →
            </button>
          </p>
        )}

        {!categorySlug && query.trim() === "" && (
          <p className="mt-2 font-sans text-[11px] text-dark/40">
            Or browse by category above ↑
          </p>
        )}

        {!categorySlug && query.trim() === "" && !hasSearched && (
          <TrendingProductsSection
            isProfiled={canSearch}
            curlType={resolvedCurlType}
            porosity={resolvedPorosity}
            budgetRange={user ? hairProfile?.budget_range ?? null : localProfileHairInfo?.budget_range ?? null}
            colorTreated={isColorTreatedYes(
              user ? hairProfile?.color_treated : localProfileHairInfo?.color_treated
            )}
          />
        )}

        {loading && (
          <p className="mt-4 text-sm text-dark/50">Searching...</p>
        )}

        {searchError && (
          <p className="mt-4 text-sm text-red">{searchError}</p>
        )}

        {!loading &&
          hasSearched &&
          categorySlug &&
          query.trim() === "" && (
            <p className="mt-6 text-sm text-dark/70">
              All {CATEGORY_LABEL_BY_SLUG[categorySlug] ?? categorySlug}s in
              the Qoyl catalog ({results.length} products)
            </p>
          )}

        {/* Weight classification comes from real per-product scoring
            (classifyProductWeight, run inside scoreCatalogProducts) -
            anonymous/no-profile visitors never get that, so these pills
            would just filter every result down to zero. */}
        {!loading && results.length > 0 && canSearch && (
          <div className="mt-3 flex flex-wrap gap-2">
            {(
              [
                { key: "all", label: "All weights" },
                { key: "light", label: "Lightweight" },
                { key: "medium", label: "Medium" },
                { key: "rich", label: "Rich" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setWeightFilter(opt.key)}
                className={`shrink-0 whitespace-nowrap rounded-full border border-bronze2/50 px-3 py-1 font-sans text-[11px] font-medium transition-colors ${
                  weightFilter === opt.key
                    ? "bg-bronze2 text-cream"
                    : "bg-transparent text-bronze2 hover:bg-bronze2/10"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {!loading && results.length > 0 && !canSearch && <ScoreExplainerBanner />}

        {!loading && results.length > 0 && (
          <>
            <ul className="mt-2">
              {filteredResults.length === 0 && (
                <p className="mt-4 font-sans text-[12px] text-dark/50">
                  No results match this weight filter yet - results are still scoring, or none of
                  these products match.
                </p>
              )}
              {(canSearch ? filteredResults : filteredResults.slice(0, 4)).map((product) => (
                <ResultCard
                  key={product.code}
                  product={product}
                  scoreState={scoresByCode[product.code]}
                  cardExpanded={expandedCardCode === product.code}
                  onToggleCard={() => toggleCard(product.code)}
                  ingredientsExpanded={ingredientsExpanded}
                  onToggleIngredients={toggleIngredients}
                  curlType={user ? hairProfile?.curl_type ?? null : localProfileHairInfo?.curl_type ?? null}
                  porosity={user ? hairProfile?.porosity ?? null : localProfileHairInfo?.porosity ?? null}
                  budgetRange={user ? hairProfile?.budget_range ?? null : localProfileHairInfo?.budget_range ?? null}
                  colorTreated={isColorTreatedYes(
                    user ? hairProfile?.color_treated : localProfileHairInfo?.color_treated
                  )}
                  isProfiled={canSearch}
                />
              ))}
            </ul>

            {!canSearch && filteredResults.length > 4 && (
              <BlurredResultsGroup
                gateTitle="your scores. not averages."
                gateDescription={
                  <>
                    these are average scores across all hair types.
                    <br />
                    {exampleProfileLine} scores differently.
                    <br />
                    create a free profile to see your exact match.
                  </>
                }
                placement="search"
                userId={user?.id}
                productsShownBeforeGate={4}
              >
                {filteredResults.slice(4).map((product) => (
                  <ResultCard
                    key={product.code}
                    product={product}
                    scoreState={undefined}
                    cardExpanded={false}
                    onToggleCard={() => {}}
                    ingredientsExpanded={false}
                    onToggleIngredients={() => {}}
                    curlType={null}
                    porosity={null}
                    budgetRange={null}
                    colorTreated={false}
                    isProfiled={false}
                  />
                ))}
              </BlurredResultsGroup>
            )}
          </>
        )}

        {showNoResults && (
          <div className="mt-6 space-y-6">
            <div className="rounded-lg border border-bronze/30 p-4">
              <p className="text-sm text-dark/80">
                We don&apos;t have &quot;{query}&quot; in our database yet.
                Request an evaluation and we&apos;ll score it for you within
                48 hours.
              </p>
              <Link
                href={`/request?product=${encodeURIComponent(query)}`}
                className="mt-3 inline-flex w-full items-center justify-center bg-bronze py-3 text-sm font-semibold text-cream transition-colors hover:bg-bronze2"
              >
                Request an evaluation
              </Link>
            </div>

            <div>
              <p className="text-sm text-dark/70">
                Or paste an ingredient list to check compatibility instead.
              </p>
              <form onSubmit={handleManualSubmit} className="mt-3 space-y-3">
                <textarea
                  value={manualIngredients}
                  onChange={(e) => setManualIngredients(e.target.value)}
                  placeholder="Aqua, Cetyl Alcohol, Glycerin, ..."
                  rows={5}
                  className="w-full border border-bronze/40 bg-transparent px-4 py-3 text-sm text-dark placeholder:text-dark/40 focus:border-bronze focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!manualIngredients.trim() || manualScoring}
                  className="w-full bg-bronze py-3 text-sm font-semibold text-cream transition-colors hover:bg-bronze2 disabled:opacity-50"
                >
                  {manualScoring ? "Checking..." : "Check Compatibility"}
                </button>
              </form>

              {manualScoreError && (
                <p className="mt-3 text-sm text-red">{manualScoreError}</p>
              )}

              {manualScoreResult && (
                <div className="mt-4 space-y-1.5">
                  {manualScoreResult.formaldehydeReleasersPresent.length > 0 && (
                    <div>
                      <p className="font-sans text-[12px] font-medium text-red">
                        ⚠ contains formaldehyde-releasing preservative
                      </p>
                      <p className="font-mono text-[10px] text-red">
                        {manualScoreResult.formaldehydeReleasersPresent.join(", ")}
                      </p>
                    </div>
                  )}
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 font-sans text-[11px] font-semibold ${
                      TIER_CLASSES[scoreTier(manualScoreResult.normalizedScore)]
                    }`}
                  >
                    {manualScoreResult.normalizedScore} ·{" "}
                    {TIER_LABELS[scoreTier(manualScoreResult.normalizedScore)]}
                  </span>
                  <div className="mt-2 space-y-1.5">
                    {manualScoreResult.matches.map((m, i) => (
                      <IngredientRow key={`${m.ingredient_name}-${i}`} match={m} />
                    ))}
                  </div>
                  {manualScoreResult.unscoredIngredientCount > 0 && (
                    <p className="font-mono text-[9px] text-muted">
                      {manualScoreResult.unscoredIngredientCount} ingredient
                      {manualScoreResult.unscoredIngredientCount === 1 ? "" : "s"} in this formula
                      {" "}are not yet in our database - scored as estimates (marked &quot;est.&quot; or &quot;unscored&quot; below)
                    </p>
                  )}
                  {manualScoreResult.interactionsDetected.length > 0 && (
                    <div>
                      <p className="font-mono text-[9px] font-medium text-bronze">
                        Formula interactions detected
                      </p>
                      <div className="mt-0.5 space-y-0.5">
                        {manualScoreResult.interactionsDetected.map((interaction) => (
                          <p
                            key={interaction.interactionId}
                            className="font-sans text-[12px] font-light text-bronze2"
                          >
                            {interaction.explanation}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="pt-1 text-[10px] text-bronze">
                    Scores reflect cosmetic ingredient compatibility only - not medical advice.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      </div>

      {showSurvey && (
        <FeedbackSurveyModal onClose={() => setShowSurvey(false)} />
      )}
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchPageContent />
    </Suspense>
  );
}
