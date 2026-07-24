const AFFILIATE_LINKS: Record<string, string> = {
  // Mielle — Shopper.com affiliate links
  "mielle pomegranate honey twisting souffle": "https://www.shopper.com/p/RsiZ/r",
  "mielle pomegranate and honey twisting souffle": "https://www.shopper.com/p/RsiZ/r",
  "mielle pomegranate & honey twisting souffle": "https://www.shopper.com/p/RsiZ/r",
  "mielle pomegranate honey leave in conditioner": "https://www.shopper.com/p/yJZT/r",
  "mielle pomegranate and honey leave in": "https://www.shopper.com/p/yJZT/r",
  "mielle pomegranate & honey leave-in conditioner": "https://www.shopper.com/p/yJZT/r",
  "mielle babassu oil mint deep conditioner": "https://www.shopper.com/p/SXw6/r",
  "mielle babassu oil and mint deep conditioner": "https://www.shopper.com/p/SXw6/r",
  "mielle babassu oil & mint deep conditioner": "https://www.shopper.com/p/SXw6/r",
  "mielle white peony leave in conditioner": "https://www.shopper.com/p/AnIb/r",
  "mielle white peony leave-in conditioner": "https://www.shopper.com/p/AnIb/r",
  "mielle rosemary mint scalp hair strengthening oil": "https://www.shopper.com/p/Xwu1/r",
  "mielle rosemary mint scalp and hair strengthening oil": "https://www.shopper.com/p/Xwu1/r",
  "mielle rosemary mint scalp & hair strengthening oil": "https://www.shopper.com/p/Xwu1/r",
  "mielle rosemary mint oil": "https://www.shopper.com/p/Xwu1/r",
};

export function getAffiliateLink(productName: string, brandName?: string): string | null {
  const normalized = productName.toLowerCase()
    .replace(/[&]/g, 'and')
    .replace(/[-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Check exact match first
  if (AFFILIATE_LINKS[normalized]) return AFFILIATE_LINKS[normalized];

  // Check partial match — if any key is contained in the product name
  for (const [key, url] of Object.entries(AFFILIATE_LINKS)) {
    if (normalized.includes(key) || key.includes(normalized)) return url;
  }

  // Fallback: if brand is Mielle but no specific link, go to Ulta search
  if (brandName?.toLowerCase().includes('mielle')) {
    return `https://www.ulta.com/search?query=${encodeURIComponent(productName)}`;
  }

  // Generic fallback for all other brands — Ulta search
  return `https://www.ulta.com/search?query=${encodeURIComponent(productName)}`;
}
