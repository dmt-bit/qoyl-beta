// Canonical install methods for a style match result. Shared by the new
// install-type question, the style card badge, and the stylist brief.
export type InstallType =
  | "sew_in"
  | "glue_tape_wig"
  | "u_part_wig"
  | "closure_frontal_install"
  | "clip_ins"
  | "crochet"
  | "no_sew"
  | "diy_at_home";

export const INSTALL_TYPE_OPTIONS: { value: InstallType; label: string }[] = [
  { value: "sew_in", label: "sew-in" },
  { value: "glue_tape_wig", label: "glue/tape wig" },
  { value: "u_part_wig", label: "u-part wig" },
  { value: "closure_frontal_install", label: "closure/frontal install" },
  { value: "clip_ins", label: "clip-ins" },
  { value: "crochet", label: "crochet" },
  { value: "no_sew", label: "no-sew (braid down only)" },
  { value: "diy_at_home", label: "i'll do it myself / at-home" },
];

const LABEL_BY_VALUE = new Map(INSTALL_TYPE_OPTIONS.map((o) => [o.value, o.label]));

export function installTypeLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return LABEL_BY_VALUE.get(value as InstallType) ?? value.replace(/_/g, " ");
}

// Options to show for the question: the style's own catalog install_types
// when it has any (narrowed, on-topic choices), else every option (a
// freshly photo-detected style with no catalog match behind it).
export function installOptionsFor(catalogInstallTypes: string[] | null | undefined) {
  if (!catalogInstallTypes || catalogInstallTypes.length === 0) return INSTALL_TYPE_OPTIONS;
  const allowed = new Set(catalogInstallTypes);
  const narrowed = INSTALL_TYPE_OPTIONS.filter((o) => allowed.has(o.value));
  return narrowed.length > 0 ? narrowed : INSTALL_TYPE_OPTIONS;
}
