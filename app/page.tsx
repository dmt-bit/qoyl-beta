import EventStrip, { getNextPublishedEvent } from "@/components/EventStrip";
import HeroCollage from "@/components/HeroCollage";
import HomeScreenBanner from "@/components/HomeScreenBanner";
import HomeFooterSection from "@/components/HomeFooterSection";
import HomeSearchStrip from "@/components/HomeSearchStrip";
import ScoreExplainerSection from "@/components/ScoreExplainerSection";
import StyleMatchCTAStrip from "@/components/StyleMatchCTAStrip";

export const dynamic = "force-dynamic";

// Video collage hero replacing the old feed-based home page entirely.
// HeroCollage and HomeSearchStrip are self-positioning
// (fixed, or sized via their own hasEventStrip-aware className) - no
// extra wrapper/height math needed here. HomeFooterSection (Instagram
// embed + newsletter + footer links) replaces what used to be "the qoyl
// feed" section in the shared Footer - that section moved here since an
// Instagram embed shouldn't show on every page (admin, privacy, etc.);
// the shared Footer (app/layout.tsx, every page including this one) is
// back to its plain copyright/how-we-score/privacy state underneath it.
export default async function Home() {
  const event = await getNextPublishedEvent();

  return (
    <>
      {event && <EventStrip event={event} />}

      <HomeScreenBanner />
      <HeroCollage hasEventStrip={Boolean(event)} />
      <HomeSearchStrip />

      {/* The fixed search strip covers 54px above the bottom nav; this keeps
          the last section scrollable above it on mobile. */}
      <div className="pb-[54px] sm:pb-0">
        <ScoreExplainerSection />
        <StyleMatchCTAStrip />
        <HomeFooterSection />
      </div>
    </>
  );
}
