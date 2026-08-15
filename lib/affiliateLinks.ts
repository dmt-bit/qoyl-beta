const BRAND_FALLBACKS: Record<string, string> = {
  'camille rose': 'https://www.camillerose.com',
  'mielle': 'https://www.mielleorganics.com',
  'mielle organics': 'https://www.mielleorganics.com',
  'as i am': 'https://asiamnaturally.com',
  'cantu': 'https://www.cantubeauty.com',
  'sheamoisture': 'https://www.sheamoisture.com',
  'shea moisture': 'https://www.sheamoisture.com',
  'tgin': 'https://tginaturals.com',
  'thank god its natural': 'https://tginaturals.com',
  "carol's daughter": 'https://www.carolsdaughter.com',
  'carols daughter': 'https://www.carolsdaughter.com',
  "aunt jackie's": 'https://auntjackiescurlsandcoils.com',
  'aunt jackies': 'https://auntjackiescurlsandcoils.com',
  'ecoslay': 'https://ecoslay.com',
  'alikay naturals': 'https://alikaynaturals.com',
  'adwoa beauty': 'https://adwoabeauty.com',
  'tropic isle living': 'https://tropicisleliving.com',
  'kinky curly': 'https://kinkycurly.com',
  'giovanni': 'https://www.giovannihaircare.com',
  "africa's best": 'https://www.africasbest.com',
  'africas best': 'https://www.africasbest.com',
  "miss jessie's": 'https://missjessies.com',
  'miss jessies': 'https://missjessies.com',
  'eco style': 'https://ecostyleproducts.com',
  'ecostyle': 'https://ecostyleproducts.com',
  'design essentials': 'https://www.designessentials.com',
  'pattern beauty': 'https://patternbeauty.com',
  'briogeo': 'https://www.briogeohair.com',
  'malibu c': 'https://www.malibuc.com',
  'olaplex': 'https://olaplex.com',
  'k18': 'https://k18hair.com',
  'ouai': 'https://theouai.com',
  'redken': 'https://www.redken.com',
  'moroccanoil': 'https://www.moroccanoil.com',
};

export function getAffiliateLink(productName: string, brandName?: string): string | null {
  // Normalize brand name and check fallback table
  if (brandName) {
    const normalizedBrand = brandName.toLowerCase().trim();

    // Exact brand match
    if (BRAND_FALLBACKS[normalizedBrand]) {
      return BRAND_FALLBACKS[normalizedBrand];
    }

    // Partial brand match
    for (const [key, url] of Object.entries(BRAND_FALLBACKS)) {
      if (normalizedBrand.includes(key) || key.includes(normalizedBrand)) {
        return url;
      }
    }
  }

  // No match — return null
  return null;
}
