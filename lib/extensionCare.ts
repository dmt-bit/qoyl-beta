// Shared by lib/routine.ts (dashboard's free routine preview) and
// lib/routineSteps.ts (the paid /routine page) so both surfaces give the
// same extension-care guidance rather than maintaining two versions of it.
export function getExtensionCareGuidance(
  extensionType: string[] | null,
  extensionCareNotes: string | null
): { title: string; body: string; why: string } {
  const hasWig = (extensionType ?? []).includes("wigs");

  const body = hasWig
    ? "Cleanse your scalp and natural hair on wig-off days with your regular routine, and wash/condition the wig itself separately on its own schedule. Keep your natural hair moisturized under the wig cap so it isn't drying out unseen."
    : "Cleanse your scalp directly at the part lines with a diluted shampoo, and focus moisture and sealing on your natural hair and edges rather than the extension hair itself. Avoid excess tension at the hairline, and don't leave a style in longer than recommended for your extension type.";

  const why = hasWig
    ? "Why: it's easy to neglect the hair underneath a wig since it's out of sight - your natural hair still needs the same moisture and cleansing it always did."
    : "Why: braids, weaves, and locs put continuous tension on the hairline and can hide buildup at the scalp - protecting the edges and keeping the scalp clean prevents breakage and traction alopecia.";

  return {
    title: "Extension & Protective Style Care",
    body: extensionCareNotes?.trim()
      ? `${body} Your notes: ${extensionCareNotes.trim()}`
      : body,
    why,
  };
}
