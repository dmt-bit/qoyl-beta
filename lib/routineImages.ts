// Editorial image breaks on /routine, matched to the user's curl type.
//
// The archive files are Cloudinary *videos*, so they can't be used as <img>
// sources directly: the image/upload path returns 404 for them. The poster
// frame is served from the video/upload path (so_2.0 = the frame 2 seconds
// in, usually more representative than frame 0) as a .jpg - see toPosterUrl.

type RoutineImagePair = { break1: string; break2: string };

const ROUTINE_IMAGES: Record<string, RoutineImagePair> = {
  // Coily 4a-4c
  "4a": {
    break1: "https://cqpxiassldkmusngqorx.supabase.co/storage/v1/object/public/media/video-posters/6940165.jpeg",
    break2: "https://res.cloudinary.com/kumxntij/image/upload/f_auto,q_auto/v1790791837/7710694-uhd_4096_2160_25fps.jpg",
  },
  "4b": {
    break1: "https://cqpxiassldkmusngqorx.supabase.co/storage/v1/object/public/media/video-posters/8343868.jpeg",
    break2: "https://cqpxiassldkmusngqorx.supabase.co/storage/v1/object/public/media/video-posters/6381013.jpeg",
  },
  "4c": {
    break1: "https://res.cloudinary.com/kumxntij/image/upload/f_auto,q_auto/v1790791837/7710694-uhd_4096_2160_25fps.jpg",
    break2: "https://cqpxiassldkmusngqorx.supabase.co/storage/v1/object/public/media/video-posters/6381013.jpeg",
  },
  // Curly 3a-3c
  "3a": {
    break1: "https://cqpxiassldkmusngqorx.supabase.co/storage/v1/object/public/media/video-posters/7020172.jpeg",
    break2: "https://res.cloudinary.com/kumxntij/image/upload/f_auto,q_auto/v1790791795/6599340-hd_1080_1920_25fps.jpg",
  },
  "3b": {
    break1: "https://cqpxiassldkmusngqorx.supabase.co/storage/v1/object/public/media/video-posters/7020172.jpeg",
    break2: "https://cqpxiassldkmusngqorx.supabase.co/storage/v1/object/public/media/video-posters/5891307.jpeg",
  },
  "3c": {
    break1: "https://cqpxiassldkmusngqorx.supabase.co/storage/v1/object/public/media/video-posters/6663336.jpeg",
    break2: "https://res.cloudinary.com/kumxntij/image/upload/f_auto,q_auto/v1790791795/6599340-hd_1080_1920_25fps.jpg",
  },
  // Wavy 2a-2c
  "2a": {
    break1: "https://cqpxiassldkmusngqorx.supabase.co/storage/v1/object/public/media/video-posters/7306713.jpeg",
    break2: "https://res.cloudinary.com/kumxntij/image/upload/f_auto,q_auto/v1790791795/6599340-hd_1080_1920_25fps.jpg",
  },
  "2b": {
    break1: "https://cqpxiassldkmusngqorx.supabase.co/storage/v1/object/public/media/video-posters/7306713.jpeg",
    break2: "https://cqpxiassldkmusngqorx.supabase.co/storage/v1/object/public/media/video-posters/7020172.jpeg",
  },
  "2c": {
    break1: "https://cqpxiassldkmusngqorx.supabase.co/storage/v1/object/public/media/video-posters/6663336.jpeg",
    break2: "https://res.cloudinary.com/kumxntij/image/upload/f_auto,q_auto/v1790791795/6599340-hd_1080_1920_25fps.jpg",
  },
  // Straight 1a-1c
  "1a": {
    break1: "https://cqpxiassldkmusngqorx.supabase.co/storage/v1/object/public/media/video-posters/6502872.jpeg",
    break2: "https://res.cloudinary.com/kumxntij/image/upload/f_auto,q_auto/v1790791795/6599340-hd_1080_1920_25fps.jpg",
  },
  "1b": {
    break1: "https://cqpxiassldkmusngqorx.supabase.co/storage/v1/object/public/media/video-posters/6502872.jpeg",
    break2: "https://cqpxiassldkmusngqorx.supabase.co/storage/v1/object/public/media/video-posters/7020172.jpeg",
  },
  "1c": {
    break1: "https://cqpxiassldkmusngqorx.supabase.co/storage/v1/object/public/media/video-posters/6502872.jpeg",
    break2: "https://cqpxiassldkmusngqorx.supabase.co/storage/v1/object/public/media/video-posters/6663336.jpeg",
  },
};

// Fallback for an unknown or missing curl type.
const DEFAULT_IMAGES: RoutineImagePair = {
  break1: "https://cqpxiassldkmusngqorx.supabase.co/storage/v1/object/public/media/video-posters/6381013.jpeg",
  break2: "https://cqpxiassldkmusngqorx.supabase.co/storage/v1/object/public/media/video-posters/8343868.jpeg",
};

// Turns an archive video URL (image/upload or video/upload, any extension)
// into its poster-frame .jpg. Idempotent: a URL that's already a poster
// frame comes back unchanged.
export function toPosterUrl(url: string): string {
  let out = url;
  if (out.includes("/image/upload/")) {
    out = out.replace("/image/upload/", "/video/upload/");
  }
  if (out.includes("/video/upload/") && !out.includes("/video/upload/so_")) {
    out = out.replace("/video/upload/", "/video/upload/so_2.0/");
  }
  return out.replace(/\.(mp4|jpe?g|png|webp)$/i, "") + ".jpg";
}

export function getRoutineImages(curlType: string | null | undefined): RoutineImagePair {
  const pair = (curlType && ROUTINE_IMAGES[curlType]) || DEFAULT_IMAGES;
  return { break1: toPosterUrl(pair.break1), break2: toPosterUrl(pair.break2) };
}
