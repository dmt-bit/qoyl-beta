"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

type CommunityPhoto = {
  id: string;
  url: string;
  caption: string | null;
  curlType: string | null;
  porosity: string | null;
};

// Bridges a tapped community photo into Style Match's photo-input flow
// across a full page navigation (sessionStorage, read on mount by
// app/style-match/page.tsx) - simpler than adding a global store for a
// single one-shot value.
export const COMMUNITY_PREFILL_KEY = "styleMatchCommunityPrefill";

function CommunityCard({ photo, onOpen }: { photo: CommunityPhoto; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative block aspect-square w-full overflow-hidden bg-[#ffffff] text-left"
    >
      <Image
        src={photo.url}
        alt="Community hair photo"
        fill
        sizes="(min-width: 1024px) 33vw, 50vw"
        className="object-cover transition-transform duration-300 group-hover:scale-105"
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[35%] bg-gradient-to-t from-black/75 to-transparent" />
      <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
        {photo.curlType && (
          <span className="rounded-full bg-white/80 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-bronze">
            {photo.curlType}
          </span>
        )}
        {photo.porosity && (
          <span className="rounded-full bg-white/80 px-2 py-0.5 text-[9px] font-medium capitalize text-bronze2">
            {photo.porosity} porosity
          </span>
        )}
      </div>
    </button>
  );
}

export default function CommunityGrid() {
  const router = useRouter();
  const [photos, setPhotos] = useState<CommunityPhoto[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<CommunityPhoto | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/hair-photos/community")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setPhotos(data.photos ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleStyleMatchThis(photo: CommunityPhoto) {
    setSending(true);
    try {
      const res = await fetch(`/api/hair-photos/community/${photo.id}/image`);
      if (!res.ok) return;
      const image = await res.json();
      sessionStorage.setItem(COMMUNITY_PREFILL_KEY, JSON.stringify(image));
      router.push("/style-match?fromCommunity=1");
    } finally {
      setSending(false);
    }
  }

  if (!loaded) {
    return <p className="mt-8 text-sm text-dark/50">Loading community photos...</p>;
  }

  if (photos.length === 0) {
    return (
      <p className="mt-8 text-sm text-dark/50">
        Be the first to share your hair journey.{" "}
        <Link href="/profile" className="text-bronze2 underline underline-offset-2 hover:text-dark">
          Add photos on your profile page →
        </Link>
      </p>
    );
  }

  return (
    <>
      <div className="-mx-4 mt-8 grid grid-cols-2 gap-px bg-[#ffffff] sm:mx-0 sm:grid-cols-3">
        {photos.map((photo) => (
          <CommunityCard key={photo.id} photo={photo} onOpen={() => setSelected(photo)} />
        ))}
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setSelected(null)}
        >
          <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="relative h-[360px] w-full overflow-hidden rounded-xl bg-[#ffffff]">
              <Image src={selected.url} alt="Community hair photo" fill className="object-cover" />
            </div>
            {selected.caption && (
              <p className="mt-3 text-sm text-dark/80">{selected.caption}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {selected.curlType && (
                <span className="rounded-full border border-bronze/40 px-2 py-0.5 text-[10px] uppercase tracking-wide text-bronze2">
                  {selected.curlType}
                </span>
              )}
              {selected.porosity && (
                <span className="rounded-full border border-bronze/40 px-2 py-0.5 text-[10px] capitalize text-bronze2">
                  {selected.porosity} porosity
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => handleStyleMatchThis(selected)}
              disabled={sending}
              className="mt-4 w-full bg-bronze py-3 text-sm font-semibold text-cream transition-colors hover:bg-bronze2 disabled:opacity-50"
            >
              {sending ? "Loading..." : "Style Match this →"}
            </button>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="mt-2 w-full text-center text-xs text-dark/50 underline"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
