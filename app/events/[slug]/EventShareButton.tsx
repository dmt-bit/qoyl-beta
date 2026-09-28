"use client";

import { useState } from "react";

export default function EventShareButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(`https://qoyl.live/events/${slug}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard permission can be denied - fail quietly, nothing to
      // recover from client-side.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="mt-2 border border-dark px-4 py-2 font-mono text-[11px] lowercase text-dark transition-colors hover:bg-[#f5f5f5]"
    >
      {copied ? "copied ✓" : "copy link →"}
    </button>
  );
}
