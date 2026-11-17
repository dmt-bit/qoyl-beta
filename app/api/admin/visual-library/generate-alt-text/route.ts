import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isAuthorizedAdmin } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";
// Allow up to 60s for a full library pass — each image is one vision call.
export const maxDuration = 60;

const ANTHROPIC_MODEL = "claude-haiku-4-5";

// Fetches each image that has no alt_text, describes it with the vision
// API, and writes the result back. Returns a summary of what changed.
// Hit POST /api/admin/visual-library/generate-alt-text once to run.
// Safe to re-run: only processes rows where alt_text IS NULL.
export async function POST(request: Request) {
  if (!isAuthorizedAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not set." }, { status: 500 });
  }

  const admin = getSupabaseAdmin();

  // Fetch all active images missing alt text
  const { data: rows, error: fetchError } = await admin
    .from("visual_library")
    .select("id, image_url, hair_types, categories")
    .is("alt_text", null)
    .eq("is_active", true);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const images = rows ?? [];
  if (images.length === 0) {
    return NextResponse.json({ message: "All images already have alt text.", updated: 0 });
  }

  const results: { id: string; alt_text: string | null; error?: string }[] = [];

  for (const image of images) {
    try {
      // Fetch the image as a base64 blob so we can send it to the vision API
      const imageRes = await fetch(image.image_url);
      if (!imageRes.ok) {
        results.push({ id: image.id, alt_text: null, error: `Could not fetch image (${imageRes.status})` });
        continue;
      }

      const contentType = imageRes.headers.get("content-type") ?? "image/jpeg";
      const mediaType = contentType.startsWith("image/") ? contentType : "image/jpeg";
      const arrayBuffer = await imageRes.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");

      // Build a context hint from the tags we do have
      const hairHint = image.hair_types?.length
        ? `Hair types in this image may include: ${image.hair_types.join(", ")}.`
        : "";
      const categoryHint = image.categories?.length
        ? `Image category: ${image.categories.join(", ")}.`
        : "";

      const prompt = `Describe this hair photo in one concise sentence for use as an image alt text. Focus on: the hairstyle name or type, the hair texture/curl pattern if visible, and the overall look. Be specific and descriptive. Do not start with "A photo of" or "An image of". Max 120 characters. ${hairHint} ${categoryHint}`.trim();

      const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: ANTHROPIC_MODEL,
          max_tokens: 150,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: { type: "base64", media_type: mediaType, data: base64 },
                },
                { type: "text", text: prompt },
              ],
            },
          ],
        }),
      });

      if (!anthropicRes.ok) {
        const errBody = await anthropicRes.text();
        results.push({ id: image.id, alt_text: null, error: `Vision API error: ${errBody.slice(0, 100)}` });
        continue;
      }

      const anthropicData = await anthropicRes.json();
      const rawText: string = anthropicData?.content?.[0]?.text ?? "";
      const altText = rawText.trim().slice(0, 200) || null;

      if (altText) {
        await admin
          .from("visual_library")
          .update({ alt_text: altText })
          .eq("id", image.id);
      }

      results.push({ id: image.id, alt_text: altText });
    } catch (err) {
      results.push({
        id: image.id,
        alt_text: null,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  const updated = results.filter((r) => r.alt_text !== null).length;
  const failed = results.filter((r) => r.error).length;

  return NextResponse.json({ updated, failed, results });
}
