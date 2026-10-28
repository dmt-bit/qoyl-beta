import type { InstallType } from "@/lib/installTypes";

// Fixes a real bug: once a user picked an install type, nothing
// downstream (buildStyleShoppingList's requiresFakeHair, the YouTube
// tutorial search, the fake-hair callout card, the cart's
// requires_fake_hair) ever read selectedInstallType - all three kept
// using detected.requires_fake_hair (the style's own default) and the
// generic style-name YouTube search, both computed once up front and
// never revisited after the install-type question answered. Confirmed
// by reading app/style-match/page.tsx directly - this isn't a guess.

// Which install types imply added hair regardless of what the detected
// style itself defaults to. diy_at_home is deliberately excluded - it
// answers "who's doing it," not "what's being done," so it can't by
// itself imply added hair.
const FAKE_HAIR_INSTALL_TYPES = new Set<InstallType>([
  "sew_in",
  "glue_tape_wig",
  "u_part_wig",
  "closure_frontal_install",
  "clip_ins",
  "crochet",
  "no_sew",
]);

export function installTypeImpliesFakeHair(installType: InstallType | null): boolean {
  return Boolean(installType && FAKE_HAIR_INSTALL_TYPES.has(installType));
}

// The user's selection always wins once made - it only ever broadens
// "does this need added hair," never narrows a style's own true
// default when nothing's been picked yet.
export function resolveRequiresFakeHair(
  styleDefault: boolean,
  installType: InstallType | null
): boolean {
  return styleDefault || installTypeImpliesFakeHair(installType);
}

// YouTube search query per install type, with the viewer's curl type
// folded in the same way the existing generic search already does
// (lib/compatibility.ts's curl_type values, e.g. "3c" - the live
// YouTube Data API query, not a hardcoded video). This is what
// actually fixes "tutorial videos should match a wig install, not a
// wash and go" - real, current search results beat a single frozen
// video id, which would eventually 404 or go private with no way to
// notice. Passed through app/api/style-match/youtube's existing
// query_override param, same mechanism style_translations already uses.
export function tutorialSearchQuery(installType: InstallType, curlType: string | null): string {
  const hairType = curlType ? `${curlType} hair` : "hair";
  const QUERIES: Record<InstallType, string> = {
    glue_tape_wig: `lace front wig install tutorial ${hairType}`,
    u_part_wig: `u-part wig install tutorial ${hairType}`,
    closure_frontal_install: `frontal wig install tutorial ${hairType}`,
    sew_in: `sew-in install tutorial ${hairType}`,
    clip_ins: `clip-in extensions tutorial ${hairType}`,
    crochet: `crochet braid install tutorial ${hairType}`,
    no_sew: `braid down protective style tutorial ${hairType}`,
    diy_at_home: `wash and go tutorial ${hairType}`,
  };
  return QUERIES[installType];
}

// Fallback when the live search comes back empty (YOUTUBE_API_KEY
// unset, quota exhausted, zero results) - a search RESULTS url, not a
// single hardcoded video id. The request asked for "one reliable
// YouTube URL per install type" as a hardcoded fallback; a frozen
// video id is exactly the kind of link that silently rots (deleted,
// privated, region-blocked) with nothing here to notice - matches the
// same "never a dead link" principle lib/styleShoppingList.ts already
// uses for its Amazon/Target search links instead of fabricated
// product pages.
export function tutorialSearchFallbackUrl(installType: InstallType, curlType: string | null): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(
    tutorialSearchQuery(installType, curlType)
  )}`;
}

// Real categories.slug values only (confirmed live - see the earlier
// diagnostic audit in this session; "wig-care"/"adhesives" aren't real
// catalog_products categories, brand_catalog_products' own
// protective-style taxonomy is the closest thing and isn't reachable
// from here). Spliced to the FRONT of pickCategoriesForStyle's output
// so a wig install's relevant categories get queried/shown first,
// rather than hard-removing wash-day categories a wig wearer's real
// hair underneath still periodically needs.
export const INSTALL_TYPE_PRIORITY_CATEGORIES: Partial<Record<InstallType, string[]>> = {
  glue_tape_wig: ["styler", "oil", "scalp-treatment"],
  u_part_wig: ["styler", "scalp-treatment", "oil"],
  closure_frontal_install: ["styler", "oil", "scalp-treatment"],
  sew_in: ["scalp-treatment", "oil"],
  clip_ins: ["styler", "heat-protectant", "oil"],
  crochet: ["scalp-treatment", "oil", "leave-in"],
  no_sew: ["scalp-treatment", "oil", "gel"],
};

export function prioritizeCategoriesForInstallType(
  categories: string[],
  installType: InstallType | null
): string[] {
  const priority = installType ? INSTALL_TYPE_PRIORITY_CATEGORIES[installType] : undefined;
  if (!priority || priority.length === 0) return categories;
  const prioritySet = new Set(priority);
  const rest = categories.filter((c) => !prioritySet.has(c));
  // Keep only priority slugs that were already in the original list
  // (pickCategoriesForStyle already scoped it to this style) - this
  // reorders, it doesn't introduce categories the style wasn't already
  // getting.
  const front = priority.filter((c) => categories.includes(c));
  return [...front, ...rest];
}

// True "fully covered" installs only (wig variants + a sew-in weave) -
// crochet/no_sew are braid-adjacent, with natural hair still exposed/
// managed differently, so they're deliberately not included here even
// though they're also "added hair." leave-in/curl-cream/gel are real
// categories.slug values genuinely aimed at styling exposed natural
// hair/curl pattern, which a wig/weave install doesn't expose - unlike
// the priority reordering above, this actually removes them rather
// than just ranking them lower, since the request specifically called
// out not surfacing them at all for these install types.
const INSTALL_TYPE_EXCLUDED_CATEGORIES: Partial<Record<InstallType, string[]>> = {
  glue_tape_wig: ["leave-in", "curl-cream", "gel"],
  u_part_wig: ["leave-in", "curl-cream", "gel"],
  closure_frontal_install: ["leave-in", "curl-cream", "gel"],
  sew_in: ["leave-in", "curl-cream", "gel"],
};

export function excludeCategoriesForInstallType(
  categories: string[],
  installType: InstallType | null
): string[] {
  const excluded = installType ? INSTALL_TYPE_EXCLUDED_CATEGORIES[installType] : undefined;
  if (!excluded || excluded.length === 0) return categories;
  const excludedSet = new Set(excluded);
  return categories.filter((c) => !excludedSet.has(c));
}
