// Brand-name to website-domain lookup for logo display.
// Used by BrandLogo via the Google favicon API.
//
// Exact matches first (case-insensitive brand name trim → domain).
// Fallback: strip punctuation/spaces and append .com.
//
// Add entries here whenever a new brand partner is onboarded so their
// logo shows immediately on the shopping list without a Supabase schema
// migration.

const KNOWN_BRAND_DOMAINS: Record<string, string> = {
  // Hair care -- natural/textured
  "as i am": "asiam.com",
  "cantu": "cantunaturals.com",
  "shea moisture": "sheamoisture.com",
  "sheamoisture": "sheamoisture.com",
  "mielle": "mielleorganics.com",
  "mielle organics": "mielleorganics.com",
  "camille rose": "camillerosenatural.com",
  "camille rose naturals": "camillerosenatural.com",
  "tgin": "tginaturals.com",
  "aunt jackie's": "auntjackiescurlsandcoils.com",
  "aunt jackies": "auntjackiescurlsandcoils.com",
  "pattern beauty": "patternbeauty.com",
  "pattern": "patternbeauty.com",
  "naturelle": "naturelle.com",
  "briogeo": "briogeohair.com",
  "curlsmith": "curlsmith.com",
  "curl smith": "curlsmith.com",
  "kinky curly": "kinkycurly.com",
  "kinky-curly": "kinkycurly.com",
  "ouidad": "ouidad.com",
  "mixed chicks": "mixedchicks.net",
  "deva curl": "devacurl.com",
  "devacurl": "devacurl.com",
  "carol's daughter": "carolsdaughter.com",
  "carols daughter": "carolsdaughter.com",
  "ecostyler": "ecostyler.com",
  "eco styler": "ecostyler.com",
  "eden bodyworks": "edenbodyworks.com",
  "olaplex": "olaplex.com",
  "living proof": "livingproof.com",
  "redken": "redken.com",
  "kerastase": "kerastase.com",
  "kérastase": "kerastase.com",
  "loreal": "lorealparisusa.com",
  "l'oreal": "lorealparisusa.com",
  "loreal paris": "lorealparisusa.com",
  "garnier": "garnier.com",
  "dove": "dove.com",
  "pantene": "pantene.com",
  "herbal essences": "herbalessences.com",
  "tresemme": "tresemme.com",
  "tresemmé": "tresemme.com",
  "suave": "suave.com",
  "paul mitchell": "paulmitchell.com",
  "matrix": "matrix.com",
  "wella": "wella.com",
  "kenra": "kenra.com",
  "pureology": "pureology.com",
  "moroccan oil": "moroccanoil.com",
  "moroccanoil": "moroccanoil.com",
  "bumble and bumble": "bumbleandbumble.com",
  "bumble & bumble": "bumbleandbumble.com",
  "igk": "igkhair.com",
  "not your mother's": "notyourmothers.com",
  "not your mothers": "notyourmothers.com",
  "giovanni": "giovannicosmetics.com",
  "giovanni cosmetics": "giovannicosmetics.com",
  "aussie": "aussie.com",
  "neutrogena": "neutrogena.com",
  "head & shoulders": "headandshoulders.com",
  "head and shoulders": "headandshoulders.com",
  // Braiding/protective style specific
  "xpression": "xpression.com",
  "Janet collection": "janetcollection.com",
  "janet collection": "janetcollection.com",
  "sensationnel": "sensationnel.com",
  "freetress equal": "freetress.com",
  "freetress": "freetress.com",
  "outre": "outre.com",
  "bobbi boss": "bobbiboss.com",
  "darling": "darlinghair.com",
  "marley twist": "amazon.com",
};

/**
 * Returns the best-guess website domain for a brand name.
 * Returns null when the brand name is empty or clearly unknown.
 */
export function brandNameToDomain(brandName: string | null | undefined): string | null {
  if (!brandName) return null;
  const key = brandName.trim().toLowerCase();
  if (!key || key === "unknown brand" || key === "qoyl partner brand") return null;

  // Exact lookup first
  const exact = KNOWN_BRAND_DOMAINS[key];
  if (exact) return exact;

  // Fallback: lowercase, strip punctuation and spaces, append .com
  // e.g. "As I Am" -> "asiam.com", "Shea Moisture" -> "sheamoisture.com"
  const derived = key
    .replace(/[''`]/g, "")       // apostrophes
    .replace(/[^a-z0-9]/g, "")   // everything else non-alphanumeric
    .replace(/\s+/g, "");
  if (derived.length < 2) return null;
  return `${derived}.com`;
}
