import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// Nightly cron: remove background from any catalog_products that have
// image_url but no processed_image_url yet.
//
// Vercel Cron calls this with the CRON_SECRET header.
// Schedule is set in vercel.json: "0 3 * * *" (3 AM UTC daily).
//
// Processes up to 100 products per run to stay within the 60s function
// limit on Vercel Hobby/Pro. New products added during the day are
// caught on the next nightly run.

export const maxDuration = 60;

async function removeBg(imageUrl: string, falKey: string): Promise<string> {
  const res = await fetch("https://fal.run/fal-ai/birefnet", {
    method: "POST",
    headers: {
      Authorization: `Key ${falKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      image_url: imageUrl,
      model: "General Use (Light)",
      operating_on_foreground: false,
      output_format: "png",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`fal ${res.status}: ${text.slice(0, 150)}`);
  }

  const result = await res.json();
  const url: string | null =
    result?.image?.url ?? result?.images?.[0]?.url ?? null;

  if (!url) throw new Error("Unexpected birefnet response");
  return url;
}

export async function GET(request: Request) {
  // Vercel Cron sends Authorization: Bearer <CRON_SECRET>
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
  }

  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    return NextResponse.json({ error: "FAL_KEY not configured." }, { status: 503 });
  }

  const admin = getSupabaseAdmin();

  const { data, error } = await admin
    .from("catalog_products")
    .select("id, name, image_url")
    .not("image_url", "is", null)
    .is("processed_image_url", null)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type ProductRow = { id: string; name: string; image_url: string };
  const products = (data ?? []) as ProductRow[];

  let succeeded = 0;
  let failed = 0;

  for (const product of products) {
    try {
      await new Promise((r) => setTimeout(r, 400));
      const processedUrl = await removeBg(product.image_url, falKey);
      await admin
        .from("catalog_products")
        .update({
          processed_image_url: processedUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", product.id);
      succeeded++;
    } catch (err) {
      console.error(`cron bg-removal failed for ${product.id}:`, err);
      failed++;
    }
  }

  const remaining = products.length === 100 ? "possibly more" : "none";

  return NextResponse.json({
    processed: succeeded,
    failed,
    total: products.length,
    remaining,
  });
}
