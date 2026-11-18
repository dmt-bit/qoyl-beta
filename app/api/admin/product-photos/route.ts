import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isAuthorizedAdmin } from "@/lib/adminAuth";

// Admin product-photos tool.
// GET  -- returns paginated catalog_products that have image_url set,
//         with their processed_image_url if already done
// POST -- calls fal.ai birefnet to remove background from a product's
//         image_url and saves the result to processed_image_url

export async function GET(request: Request) {
  if (!isAuthorizedAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const page = Math.max(0, parseInt(url.searchParams.get("page") ?? "0", 10));
  const pageSize = 30;

  const admin = getSupabaseAdmin();

  const { data, error, count } = await admin
    .from("catalog_products")
    .select(
      "id, name, image_url, processed_image_url, catalog_brands(name)",
      { count: "exact" }
    )
    .not("image_url", "is", null)
    .order("updated_at", { ascending: false })
    .range(page * pageSize, page * pageSize + pageSize - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type Row = {
    id: string;
    name: string;
    image_url: string | null;
    processed_image_url: string | null;
    catalog_brands: { name: string } | null;
  };

  const products = (data as unknown as Row[]).map((row) => ({
    id: row.id,
    name: row.name,
    brand: row.catalog_brands?.name ?? null,
    image_url: row.image_url,
    processed_image_url: row.processed_image_url,
  }));

  return NextResponse.json({ products, total: count ?? 0, page, pageSize });
}

export async function POST(request: Request) {
  if (!isAuthorizedAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    return NextResponse.json(
      { error: "FAL_KEY is not configured." },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const { product_id } = body as { product_id?: string };

  if (!product_id) {
    return NextResponse.json({ error: "product_id is required." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  // Fetch the source image URL
  const { data: product, error: fetchError } = await admin
    .from("catalog_products")
    .select("id, image_url")
    .eq("id", product_id)
    .single();

  if (fetchError || !product) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  if (!product.image_url) {
    return NextResponse.json({ error: "Product has no image_url to process." }, { status: 400 });
  }

  // fal.ai birefnet — background removal
  // Docs: https://fal.ai/models/fal-ai/birefnet
  const falRes = await fetch("https://fal.run/fal-ai/birefnet", {
    method: "POST",
    headers: {
      Authorization: `Key ${falKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      image_url: product.image_url,
      model: "General Use (Light)",
      operating_on_foreground: false,
      output_format: "png",
    }),
  });

  if (!falRes.ok) {
    const errText = await falRes.text();
    console.error("fal.ai birefnet error:", falRes.status, errText);
    return NextResponse.json(
      { error: "Background removal failed. Try again." },
      { status: 502 }
    );
  }

  const result = await falRes.json();

  // birefnet returns { image: { url: "..." } }
  const processedUrl: string | null =
    result?.image?.url ?? result?.images?.[0]?.url ?? null;

  if (!processedUrl) {
    console.error("fal.ai birefnet unexpected response:", JSON.stringify(result).slice(0, 500));
    return NextResponse.json(
      { error: "Background removal failed — unexpected response." },
      { status: 502 }
    );
  }

  // Save back to DB
  const { error: updateError } = await admin
    .from("catalog_products")
    .update({ processed_image_url: processedUrl, updated_at: new Date().toISOString() })
    .eq("id", product_id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ processed_image_url: processedUrl });
}
