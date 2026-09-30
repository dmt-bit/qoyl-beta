import EventStrip, { getNextPublishedEvent } from "@/components/EventStrip";
import HeroCollage from "@/components/HeroCollage";
import HomeSearchStrip from "@/components/HomeSearchStrip";
import ReturningUserBar from "@/components/ReturningUserBar";
import ScoreExplainerSection from "@/components/ScoreExplainerSection";
import StyleMatchCTAStrip from "@/components/StyleMatchCTAStrip";

export const dynamic = "force-dynamic";

// Video collage hero replacing the old feed-based home page entirely.
// HeroCollage/HomeSearchStrip/ReturningUserBar are all self-positioning
// (fixed, or sized via their own hasEventStrip-aware className) - no
// extra wrapper/height math needed here. Newsletter signup + footer
// links live in the shared Footer (app/layout.tsx renders it on every
// page, including this one) rather than a separate section here - see
// components/Footer.tsx.
export default async function Home() {
  const event = await getNextPublishedEvent();

  return (
    <>
      {event && <EventStrip event={event} />}

      <HeroCollage hasEventStrip={Boolean(event)} />
      <HomeSearchStrip />
      <ReturningUserBar />

      <ScoreExplainerSection />
      <StyleMatchCTAStrip />
    </>
  );
}
