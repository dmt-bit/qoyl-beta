"use client";

// Extracted from EventDetailPage (a server component - no hooks
// allowed there) purely to catch a failed external image load and
// swap in a plain placeholder instead of a silently blank <Image>.
//
// Diagnosed, not guessed: cover_image_url for find-your-stylist is a
// real, well-formed, non-null Cloudinary URL - the <Image> was already
// correctly wired to it, and res.cloudinary.com is already allowlisted
// in next.config's remotePatterns. The actual cause is external: that
// URL (and other Cloudinary assets under this same cloud that worked
// earlier) now return a flat 401 from Cloudinary itself, not from this
// app. That's a Cloudinary account/delivery-settings issue (most likely
// "restricted media types" or strict/authenticated delivery turned on,
// or the account/trial lapsing) - nothing here can fetch a 401'd image
// successfully, so this component only keeps a failed load from
// rendering as an empty dark box. Fix the actual photo by checking the
// Cloudinary dashboard's delivery/access settings for this cloud name.

import { useState } from "react";
import Image from "next/image";

export default function EventCoverImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="font-mono text-[10px] text-white/40">photo unavailable</p>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="100vw"
      className="object-cover"
      priority
      onError={() => setFailed(true)}
    />
  );
}
