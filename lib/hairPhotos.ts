import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const BUCKET = "hair-photos";
const SIGNED_URL_TTL_SECONDS = 3600;

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

export function mimeForPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXTENSION[ext] ?? "image/jpeg";
}

// hair-photos is a private bucket -- every read and write goes through
// server-side routes using the service-role key rather than a storage
// RLS policy (see supabase/hair_photos.sql for why). photo_url in the
// hair_photos table stores this raw storage path, not a URL -- signed
// URLs are generated on demand since they expire.
export async function uploadHairPhoto(
  userId: string,
  base64: string,
  mediaType: string,
  originalFilename: string
): Promise<string | null> {
  const extension = EXTENSION_BY_MIME[mediaType] ?? originalFilename.split(".").pop() ?? "jpg";
  const safeName = originalFilename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${userId}/${Date.now()}_${safeName || `photo.${extension}`}`;

  const buffer = Buffer.from(base64, "base64");
  const { error } = await getSupabaseAdmin()
    .storage.from(BUCKET)
    .upload(path, buffer, { contentType: mediaType });

  if (error) {
    console.error("[hairPhotos] Failed to upload:", error);
    return null;
  }
  return path;
}

export async function getSignedHairPhotoUrl(path: string): Promise<string | null> {
  const { data, error } = await getSupabaseAdmin()
    .storage.from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (error) {
    console.error("[hairPhotos] Failed to sign URL:", error);
    return null;
  }
  return data.signedUrl;
}

export async function deleteHairPhotoObject(path: string): Promise<void> {
  const { error } = await getSupabaseAdmin().storage.from(BUCKET).remove([path]);
  if (error) console.error("[hairPhotos] Failed to delete storage object:", error);
}

// Used by Style Match (Part 2) to pull the user's most recent hair
// photo into the Anthropic Vision call as base64.
export async function downloadHairPhotoAsBase64(
  path: string
): Promise<{ base64: string; mediaType: string } | null> {
  const { data, error } = await getSupabaseAdmin().storage.from(BUCKET).download(path);
  if (error || !data) {
    console.error("[hairPhotos] Failed to download for analysis:", error);
    return null;
  }
  const arrayBuffer = await data.arrayBuffer();
  return {
    base64: Buffer.from(arrayBuffer).toString("base64"),
    mediaType: mimeForPath(path),
  };
}

export async function getMostRecentHairPhoto(
  userId: string
): Promise<{ path: string; caption: string | null } | null> {
  const { data } = await getSupabaseAdmin()
    .from("hair_photos")
    .select("photo_url, caption")
    .eq("user_id", userId)
    .order("taken_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return { path: data.photo_url, caption: data.caption };
}
