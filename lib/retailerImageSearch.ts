// Retailer image search using internal JSON search APIs
// No browser required — each retailer's own site search endpoint.
// Returns the best product image URL found, or null.

export type RetailerMatch = {
  image_url: string;
  product_name: string;
  brand: string;
  source: string;
};

// ─── Ulta ────────────────────────────────────────────────────────────────────
// Ulta uses a Bazaarvoice/Coveo-powered search that returns JSON
async function searchUlta(name: string, brand: string): Promise<RetailerMatch | null> {
  const q = encodeURIComponent(`${brand} ${name}`.trim());
  try {
    const res = await fetch(
      `https://www.ulta.com/api/catalog/v2/search?search=${q}&pageSize=5&pageNumber=0`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; product-image-fetch/1.0)",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    // Ulta response shape: { searchResults: { products: [ { displayName, brandName, images: [{ altText, xlImage }] } ] } }
    const products: Array<{
      displayName?: string;
      brandName?: string;
      images?: Array<{ xlImage?: string; largeImage?: string; image?: string }>;
    }> = data?.searchResults?.products ?? data?.products ?? [];
    for (const p of products) {
      const img =
        p.images?.[0]?.xlImage ??
        p.images?.[0]?.largeImage ??
        p.images?.[0]?.image ??
        null;
      if (img && img.startsWith("https://")) {
        return {
          image_url: img,
          product_name: p.displayName ?? name,
          brand: p.brandName ?? brand,
          source: "ulta",
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Sephora ─────────────────────────────────────────────────────────────────
// Sephora has a public search API used by their site
async function searchSephora(name: string, brand: string): Promise<RetailerMatch | null> {
  const q = encodeURIComponent(`${brand} ${name}`.trim());
  try {
    const res = await fetch(
      `https://www.sephora.com/api/catalog/search?keyword=${q}&pageSize=5&currentPage=1`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; product-image-fetch/1.0)",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    // Sephora response shape: { products: [ { displayName, brandName, heroImage } ] }
    const products: Array<{
      displayName?: string;
      brandName?: string;
      heroImage?: string;
      imageAlt?: string;
    }> = data?.products ?? data?.data?.products ?? [];
    for (const p of products) {
      const img = p.heroImage ?? null;
      if (img && img.startsWith("https://")) {
        return {
          image_url: img,
          product_name: p.displayName ?? name,
          brand: p.brandName ?? brand,
          source: "sephora",
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Target ──────────────────────────────────────────────────────────────────
// Target's Redsky API — same one their app uses
async function searchTarget(name: string, brand: string): Promise<RetailerMatch | null> {
  const q = encodeURIComponent(`${brand} ${name}`.trim());
  try {
    const res = await fetch(
      `https://redsky.target.com/redsky_aggregations/v1/web/plp_search_v2?keyword=${q}&count=5&offset=0&channel=WEB&country=US&default_purchasability_filter=true&include_sponsored=false`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; product-image-fetch/1.0)",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    // Target response: { data: { search: { products: [ { item: { product_description: { title }, primary_brand: { name }, enrichment: { images: { primary_image_url } } } } ] } } }
    const products: Array<{
      item?: {
        product_description?: { title?: string };
        primary_brand?: { name?: string };
        enrichment?: { images?: { primary_image_url?: string } };
      };
    }> = data?.data?.search?.products ?? [];
    for (const p of products) {
      const img = p.item?.enrichment?.images?.primary_image_url ?? null;
      if (img && img.startsWith("https://")) {
        return {
          image_url: img,
          product_name: p.item?.product_description?.title ?? name,
          brand: p.item?.primary_brand?.name ?? brand,
          source: "target",
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Walmart ─────────────────────────────────────────────────────────────────
// Walmart's internal search API
async function searchWalmart(name: string, brand: string): Promise<RetailerMatch | null> {
  const q = encodeURIComponent(`${brand} ${name}`.trim());
  try {
    const res = await fetch(
      `https://www.walmart.com/search/api/preso?q=${q}&page=1&prg=desktop`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; product-image-fetch/1.0)",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    // Walmart response: { items: [ { title, brand, imageUrl } ] }
    const items: Array<{
      title?: string;
      brand?: string;
      imageUrl?: string;
      image?: string;
    }> = data?.items ?? data?.payload?.items ?? [];
    for (const item of items) {
      const img = item.imageUrl ?? item.image ?? null;
      if (img) {
        const full = img.startsWith("https://") ? img : `https://i5.walmartimages.com/${img}`;
        return {
          image_url: full,
          product_name: item.title ?? name,
          brand: item.brand ?? brand,
          source: "walmart",
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Main export ─────────────────────────────────────────────────────────────
// Tries retailers in order, returns first match found.
export async function searchRetailersForImage(
  name: string,
  brand: string
): Promise<RetailerMatch | null> {
  const sources = [
    () => searchUlta(name, brand),
    () => searchSephora(name, brand),
    () => searchTarget(name, brand),
    () => searchWalmart(name, brand),
  ];

  for (const search of sources) {
    const result = await search();
    if (result) return result;
  }

  return null;
}
