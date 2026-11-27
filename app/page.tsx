import EventStrip, { getNextPublishedEvent } from "@/components/EventStrip";
import HeroCollage from "@/components/HeroCollage";
import HomeFooterSection from "@/components/HomeFooterSection";
import HomeSearchStrip from "@/components/HomeSearchStrip";
import AuthRedirect from "@/components/AuthRedirect";

export const dynamic = "force-dynamic";

export default async function Home() {
  const event = await getNextPublishedEvent();

  return (
    <>
      {/* Logged-in users go straight to their dashboard. */}
      <AuthRedirect to="/dashboard" />

      {event && <EventStrip event={event} />}

      <HeroCollage hasEventStrip={Boolean(event)} />
      <HomeSearchStrip />

      <div className="pb-[54px] sm:pb-0">
        <HomeFooterSection />
      </div>
    </>
  );
}
