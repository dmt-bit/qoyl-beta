import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isAuthorizedAdmin } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";
// 60s max — process up to BATCH_SIZE images per call, re-run to continue.
export const maxDuration = 60;

// Match the model used elsewhere in the app.
const ANTHROPIC_MODEL = "claude-sonnet-4-5";
// Keep each invocation well under the timeout. Re-run to process more.
const BATCH_SIZE = 10;

// Describes images that have no alt_text using the vision API, then writes
// the result back. Safe to re-run: only processes rows where alt_text IS NULL.
// Processes up to BATCH_SIZE images per call to stay within the timeout.
export async function POST(request: Request) {
  if (!isAuthorizedAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not set." }, { status: 500 });
  }

  const admin = getSupabaseAdmin();

  // Fetch a batch of active images missing alt text
  const { data: rows, error: fetchError } = await admin
    .from("visual_library")
    .select("id, image_url, hair_types, categories")
    .is("alt_text", null)
    .eq("is_active", true)
    .limit(BATCH_SIZE);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const images = rows ?? [];
  if (images.length === 0) {
    return NextResponse.json({ message: "All images already have alt text.", updated: 0, remaining: 0 });
  }

  // Count total remaining so the UI can show "X more to process"
  const { count: totalRemaining } = await admin
    .from("visual_library")
    .select("id", { count: "exact", head: true })
    .is("alt_text", null)
    .eq("is_active", true);

  const results: { id: string; alt_text: string | null; error?: string }[] = [];

  for (const image of images) {
    try {
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
                  source: { type: "url", url: image.image_url },
                },
                { type: "text", text: prompt },
              ],
            },
          ],
        }),
      });

      if (!anthropicRes.ok) {
        const errBody = await anthropicRes.text();
        results.push({ id: image.id, alt_text: null, error: `Vision API error: ${errBody.slice(0, 200)}` });
        continue;
      }

      const anthropicData = await anthropicRes.json();
      const rawText: string = anthropicData?.content?.[0]?.text ?? "";
      const altText = rawText.trim().slice(0, 200) || null;

      if (altText) {
        const { error: updateError } = await admin
          .from("visual_library")
          .update({ alt_text: altText })
          .eq("id", image.id);
        if (updateError) {
          results.push({ id: image.id, alt_text: null, error: `DB update failed: ${updateError.message}` });
          continue;
        }
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
  // Remaining after this batch (totalRemaining was counted before we updated)
  const remaining = Math.max(0, (totalRemaining ?? 0) - updated);

  return NextResponse.json({ updated, failed, remaining, results });
}
