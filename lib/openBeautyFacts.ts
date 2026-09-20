// Server-only client for the Open Beauty Facts public API - used by the
// admin ingredient-enrichment tools (app/api/admin/enrichment/**) to pull
// ingredient lists for catalog products that are missing them. Never
// imported from a "use client" component.

// Two different bases, not one: the versioned JSON REST API
// (/api/v0/product/{barcode}.json) is what fetchOBFByBarcode below uses,
// but the free-text search feature is a legacy CGI script served from the
// site root, NOT under /api/v0 - confirmed live: requesting
// {API_BASE}/cgi/search.pl returns a bogus barcode-lookup error
// ({"status":0,"status_verbose":"no code or invalid code"}) instead of
// search results, while the bare-root URL below returns the real
// {count, products: [...]} shape.
const OBF_API_BASE_URL = "https://world.openbeautyfacts.org/api/v0";
const OBF_SITE_ROOT = "https://world.openbeautyfacts.org";

// OBF's API usage policy asks for a descriptive User-Agent identifying the
// app and a contact channel - an unidentified default fetch UA risks
// throttling. See https://openbeautyfacts.org for the project this is
// querying.
const OBF_USER_AGENT = "Qoyl-HairCareApp/1.0 (contact: dailydiortwine@gmail.com)";

export interface OBFProduct {
  product_name: string;
  brands: string;
  ingredients_text: string;
  ingredients: Array<{
    id: string;
    text: string;
    rank: number;
  }>;
  code: string;
}

export async function searchOBFByName(
  productName: string,
  brandName: string
): Promise<OBFProduct | null> {
  // OBF has no documented hard rate limit, but hammering a shared public
  // API from a batch admin action without any pacing is bad citizenship -
  // this delay runs once per candidate product in the enrichment search
  // loop (see app/api/admin/enrichment/search/route.ts).
  await new Promise((r) => setTimeout(r, 500));

  const query = encodeURIComponent(`${productName} ${brandName}`);

  try {
    const response = await fetch(
      `${OBF_SITE_ROOT}/cgi/search.pl?` +
        `search_terms=${query}&search_simple=1&` +
        `action=process&json=1&page_size=5`,
      { headers: { "User-Agent": OBF_USER_AGENT }, next: { revalidate: 86400 } }
    );

    if (!response.ok) return null;
    const data = await response.json();
    if (!data.products?.length) return null;

    const products = data.products as OBFProduct[];

    // Score each result by name/brand similarity.
    const scored = products.map((p) => {
      let score = 0;
      const pName = p.product_name?.toLowerCase() || "";
      const pBrand = p.brands?.toLowerCase() || "";
      const targetName = productName.toLowerCase();
      const targetBrand = brandName.toLowerCase();

      if (pName.includes(targetName) || targetName.includes(pName)) score += 2;
      if (pBrand.includes(targetBrand) || targetBrand.includes(pBrand)) score += 2;
      // Partial word matches.
      const nameWords = targetName.split(" ");
      const matchedWords = nameWords.filter((w) => pName.includes(w) && w.length > 3);
      score += matchedWords.length * 0.5;

      return { product: p, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];

    // Only return if reasonably confident.
    if (best.score < 1) return null;
    return best.product;
  } catch {
    return null;
  }
}

export async function fetchOBFByBarcode(barcode: string): Promise<OBFProduct | null> {
  try {
    const response = await fetch(`${OBF_API_BASE_URL}/product/${barcode}.json`, {
      headers: { "User-Agent": OBF_USER_AGENT },
      next: { revalidate: 86400 },
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (data.status !== 1) return null;
    return data.product as OBFProduct;
  } catch {
    return null;
  }
}

export function parseOBFIngredients(product: OBFProduct): string[] {
  if (product.ingredients?.length) {
    return product.ingredients
      .sort((a, b) => (a.rank || 0) - (b.rank || 0))
      .map((i) => i.text?.trim())
      .filter(Boolean) as string[];
  }

  if (product.ingredients_text) {
    return product.ingredients_text
      .split(/[,;]/)
      .map((i) =>
        i
          .trim()
          .replace(/^\*+/, "")
          .replace(/\([^)]*\)/g, "")
          .trim()
      )
      .filter((i) => i.length > 1);
  }

  return [];
}

export function calculateMatchConfidence(
  ourProduct: { name: string; brand: string },
  obfProduct: OBFProduct
): "high" | "medium" | "low" {
  const pName = obfProduct.product_name?.toLowerCase() || "";
  const pBrand = obfProduct.brands?.toLowerCase() || "";
  const ourName = ourProduct.name.toLowerCase();
  const ourBrand = ourProduct.brand.toLowerCase();

  const nameMatch = pName.includes(ourName) || ourName.includes(pName);
  const brandMatch = pBrand.includes(ourBrand) || ourBrand.includes(pBrand);

  if (nameMatch && brandMatch) return "high";
  if (nameMatch || brandMatch) return "medium";
  return "low";
}
