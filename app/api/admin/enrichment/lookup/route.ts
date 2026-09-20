import { NextResponse } from "next/server";
import { isAuthorizedAdmin } from "@/lib/adminAuth";
import { fetchOBFByBarcode, parseOBFIngredients } from "@/lib/openBeautyFacts";

// Backs the "Lookup ingredients ->" button next to the barcode field on
// the admin product entry form (app/admin/products/page.tsx) - a single
// barcode lookup, not the batch search flow in ../search/route.ts.
export async function GET(request: Request) {
  if (!isAuthorizedAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const barcode = new URL(request.url).searchParams.get("barcode")?.trim();
  if (!barcode) {
    return NextResponse.json({ error: "barcode query param is required." }, { status: 400 });
  }

  const product = await fetchOBFByBarcode(barcode);
  if (!product) {
    return NextResponse.json({ found: false });
  }

  const ingredients = parseOBFIngredients(product);
  if (ingredients.length === 0) {
    return NextResponse.json({ found: false });
  }

  return NextResponse.json({
    found: true,
    productName: product.product_name,
    brand: product.brands,
    ingredients,
  });
}
