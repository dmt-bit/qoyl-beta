import EventStrip, { getNextPublishedEvent } from "@/components/EventStrip";
import HeroCollage from "@/components/HeroCollage";
import HomeFooterSection from "@/components/HomeFooterSection";
import HomeSearchStrip from "@/components/HomeSearchStrip";

export const dynamic = "force-dynamic";

export default async function Home() {
  const event = await getNextPublishedEvent();

  return (
    <>
      {event && <EventStrip event={event} />}

      <HeroCollage hasEventStrip={Boolean(event)} />
      <HomeSearchStrip />

      <div className="pb-[54px] sm:pb-0">
        <HomeFooterSection />
      </div>
    </>
  );
}
