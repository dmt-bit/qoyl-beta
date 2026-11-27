import { NextResponse } from "next/server";
import { isAuthorizedAdmin } from "@/lib/adminAuth";
import {
  fetchOBFByBarcode,
  getOBFImageUrl,
  searchOBFByName,
} from "@/lib/openBeautyFacts";
import { searchRetailersForImage } from "@/lib/retailerImageSearch";

// Single-product image candidate finder.
// POST { name, barcode? } -> { candidates: { image_url, source }[] }
// Used by the ImagePanel component on the admin/products form.

export async function POST(request: Request) {
  if (!isAuthorizedAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { name, barcode } = body as { name?: string; barcode?: string | null };

  if (!name) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }

  const candidates: { image_url: string; source: string }[] = [];

  // Try barcode first (most precise)
  if (barcode) {
    const obfMatch = await fetchOBFByBarcode(barcode);
    if (obfMatch) {
      const url = getOBFImageUrl(obfMatch);
      if (url) candidates.push({ image_url: url, source: "obf-barcode" });
    }
  }

  // Name search if barcode didn't find anything
  if (candidates.length === 0) {
    const obfMatch = await searchOBFByName(name, "");
    if (obfMatch) {
      const url = getOBFImageUrl(obfMatch);
      if (url) candidates.push({ image_url: url, source: "obf-name" });
    }
  }

  // Retailer image search as additional candidates
  const retailerMatch = await searchRetailersForImage(name, "");
  if (retailerMatch?.image_url) {
    // Only add if it's a different URL from what we already have
    if (!candidates.some((c) => c.image_url === retailerMatch.image_url)) {
      candidates.push({ image_url: retailerMatch.image_url, source: retailerMatch.source });
    }
  }

  return NextResponse.json({ candidates });
}
