import { isAuthorizedAdmin } from "@/lib/adminAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// Streaming batch background-removal endpoint.
// POST — streams NDJSON progress lines while processing all products
//        that have image_url but no processed_image_url.
//
// Each line is one of:
//   {"type":"progress","done":N,"total":N,"product_id":"...","name":"...","ok":true,"processed_image_url":"..."}
//   {"type":"progress","done":N,"total":N,"product_id":"...","name":"...","ok":false,"error":"..."}
//   {"type":"done","done":N,"total":N,"failed":N}
//   {"type":"error","error":"..."}
//
// ?redo=1 reprocesses everything (even products that already have processed_image_url).

export const maxDuration = 300; // Vercel Pro: up to 5 min; adjust to your plan

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
    throw new Error(`fal.ai ${res.status}: ${text.slice(0, 200)}`);
  }

  const result = await res.json();
  const url: string | null =
    result?.image?.url ?? result?.images?.[0]?.url ?? null;

  if (!url) throw new Error("Unexpected fal.ai response shape");
  return url;
}

export async function POST(request: Request) {
  if (!isAuthorizedAdmin(request)) {
    return new Response(JSON.stringify({ type: "error", error: "Unauthorized." }) + "\n", {
      status: 401,
      headers: { "Content-Type": "application/x-ndjson" },
    });
  }

  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    return new Response(
      JSON.stringify({ type: "error", error: "FAL_KEY is not configured." }) + "\n",
      { status: 503, headers: { "Content-Type": "application/x-ndjson" } }
    );
  }

  const url = new URL(request.url);
  const redo = url.searchParams.get("redo") === "1";

  const admin = getSupabaseAdmin();

  // Fetch all products that need processing
  let query = admin
    .from("catalog_products")
    .select("id, name, image_url")
    .not("image_url", "is", null)
    .order("created_at", { ascending: true });

  if (!redo) {
    query = query.is("processed_image_url", null);
  }

  const { data, error } = await query;

  if (error) {
    return new Response(
      JSON.stringify({ type: "error", error: error.message }) + "\n",
      { status: 500, headers: { "Content-Type": "application/x-ndjson" } }
    );
  }

  type ProductRow = { id: string; name: string; image_url: string };
  const products = (data ?? []) as ProductRow[];
  const total = products.length;

  // Stream results back as NDJSON
  const encoder = new TextEncoder();
  let done = 0;
  let failed = 0;

  const stream = new ReadableStream({
    async start(controller) {
      for (const product of products) {
        try {
          // ~500ms pacing to be a good API citizen
          await new Promise((r) => setTimeout(r, 400));

          const processedUrl = await removeBg(product.image_url, falKey);

          await admin
            .from("catalog_products")
            .update({
              processed_image_url: processedUrl,
              updated_at: new Date().toISOString(),
            })
            .eq("id", product.id);

          done++;
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                type: "progress",
                done,
                total,
                product_id: product.id,
                name: product.name,
                ok: true,
                processed_image_url: processedUrl,
              }) + "\n"
            )
          );
        } catch (err) {
          done++;
          failed++;
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                type: "progress",
                done,
                total,
                product_id: product.id,
                name: product.name,
                ok: false,
                error: err instanceof Error ? err.message : "Unknown error",
              }) + "\n"
            )
          );
        }
      }

      controller.enqueue(
        encoder.encode(
          JSON.stringify({ type: "done", done: total, total, failed }) + "\n"
        )
      );
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Transfer-Encoding": "chunked",
      "X-Accel-Buffering": "no", // disable Nginx/Vercel buffering
      "Cache-Control": "no-cache",
    },
  });
}
