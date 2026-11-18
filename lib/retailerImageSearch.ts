// Product image search via Google Custom Search API
// Requires two env vars:
//   GOOGLE_CSE_API_KEY  — from https://console.cloud.google.com/apis/credentials
//   GOOGLE_CSE_ID       — from https://programmablesearchengine.google.com
//
// Free tier: 100 queries/day. Each product scan uses 1 query per product.

export type RetailerMatch = {
  image_url: string;
  product_name: string;
  brand: string;
  source: string;
};

export async function searchRetailersForImage(
  name: string,
  brand: string
): Promise<RetailerMatch | null> {
  const apiKey = process.env.GOOGLE_CSE_API_KEY;
  const cseId = process.env.GOOGLE_CSE_ID;

  if (!apiKey || !cseId) return null;

  const q = encodeURIComponent(`${brand} ${name} haircare product`);

  try {
    const res = await fetch(
      `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cseId}&q=${q}&searchType=image&num=5&imgType=photo&imgSize=large&safe=active`,
      { signal: AbortSignal.timeout(8000) }
    );

    if (!res.ok) {
      console.error("Google CSE error:", res.status, await res.text().then(t => t.slice(0, 200)));
      return null;
    }

    const data = await res.json();
    const items: Array<{ link?: string; title?: string }> = data?.items ?? [];

    for (const item of items) {
      const img = item.link;
      if (img && img.startsWith("https://")) {
        return {
          image_url: img,
          product_name: item.title ?? name,
          brand,
          source: "google",
        };
      }
    }

    return null;
  } catch (e) {
    console.error("Google CSE fetch error:", e);
    return null;
  }
}
