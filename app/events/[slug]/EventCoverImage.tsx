"use client";

// Extracted from EventDetailPage (a server component - no hooks
// allowed there) purely to catch a failed image load and swap in a
// plain placeholder instead of a silently blank <Image>.
//
// Originally added when cover_image_url pointed at Cloudinary, which
// had gone account-wide 401 (free-tier limit exceeded). All Cloudinary
// media has since been migrated to Supabase Storage (see the "media"
// bucket) - find-your-stylist's cover_image_url now points there. Kept
// this component anyway: a failed load (storage outage, a future bad
// URL) should still degrade to this placeholder rather than a blank box.

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
