import Link from "next/link";

export const metadata = {
  title: "Qoyl for Stylists",
  description: "Get matched with clients who are actively searching for your specialty. Join the Qoyl stylist network.",
};

export default function ForStylistsPage() {
  return (
    <main className="min-h-screen bg-[#0E0A06] font-sans text-[#F8F3EC]">

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 border-b border-[rgba(200,168,106,0.18)]">
        <Link href="/" className="font-serif text-lg tracking-[0.18em] uppercase text-[#F8F3EC]">Qoyl</Link>
        <a
          href="mailto:hey@qoyl.live?subject=Stylist%20Listing"
          className="text-[11px] font-medium tracking-[0.1em] uppercase border border-[rgba(200,168,106,0.6)] text-[#C8A86A] px-5 py-2 hover:bg-[#C8A86A] hover:text-[#0E0A06] transition-colors"
        >
          Get listed
        </a>
      </nav>

      {/* Hero */}
      <section className="px-6 py-20 max-w-2xl mx-auto text-center">
        <div className="inline-block text-[10px] font-medium tracking-[0.22em] uppercase text-[#C8A86A] border border-[rgba(200,168,106,0.35)] px-3 py-1 mb-8">
          Stylist network
        </div>
        <h1 className="font-serif text-4xl sm:text-6xl font-light leading-tight text-[#F8F3EC] mb-6">
          Clients who already know<br />
          <span className="italic text-[#C8A86A]">what they want.</span>
        </h1>
        <p className="text-[#F8F3EC]/65 text-base leading-relaxed mb-10 max-w-lg mx-auto">
          Qoyl users come to you after the AI has already matched them to a style, built their shopping
          list, and confirmed they&apos;re ready to book. You get clients who are prepared — not just browsing.
        </p>
        <a
          href="mailto:hey@qoyl.live?subject=Stylist%20Listing"
          className="inline-block bg-[#C8A86A] text-[#0E0A06] text-xs font-semibold tracking-[0.1em] uppercase px-10 py-4 hover:opacity-85 transition-opacity"
        >
          Apply to get listed
        </a>
      </section>

      {/* How it works */}
      <section className="px-6 pb-20 max-w-3xl mx-auto">
        <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-[#C8A86A] mb-5">How it works</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px border border-[rgba(200,168,106,0.18)] bg-[rgba(200,168,106,0.18)]">
          {[
            {
              n: "01",
              title: "Client gets matched",
              body: "Qoyl's AI analyzes a photo and recommends a style — box braids, silk press, wash-and-go. They see exactly what their hair could look like.",
            },
            {
              n: "02",
              title: "Your name appears",
              body: "If you specialize in that style and are in their area, you're surfaced as a recommended stylist at the end of their style match results.",
            },
            {
              n: "03",
              title: "They book with you",
              body: "Your booking link is right there. They arrive having already researched the style, bought their products, and committed to the look.",
            },
          ].map((step) => (
            <div key={step.n} className="bg-[#16110C] p-8">
              <div className="font-serif text-5xl font-light text-[rgba(200,168,106,0.25)] mb-4">{step.n}</div>
              <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-[#F8F3EC] mb-2">{step.title}</h3>
              <p className="text-sm text-[#F8F3EC]/60 leading-relaxed">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What we need from you */}
      <section className="px-6 pb-20 max-w-2xl mx-auto">
        <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-[#C8A86A] mb-5">What we need from you</p>
        <div className="border border-[rgba(200,168,106,0.18)] bg-[#16110C] divide-y divide-[rgba(200,168,106,0.12)]">
          {[
            { label: "Your specialty", detail: "The styles and techniques you do best — braids, locs, natural styles, silk press, color, etc." },
            { label: "Location", detail: "City and neighborhood. We surface stylists within a client's searchable area." },
            { label: "Booking link", detail: "Wherever you take appointments — Booksy, Square, your own site, Instagram DM." },
            { label: "Portfolio photos", detail: "Optional but helpful. Clients come through style match — they respond to visuals." },
          ].map((item) => (
            <div key={item.label} className="px-6 py-5 flex gap-4 items-start">
              <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-[#C8A86A] shrink-0" />
              <div>
                <p className="text-sm font-medium text-[#F8F3EC] mb-0.5">{item.label}</p>
                <p className="text-xs text-[#F8F3EC]/50 leading-relaxed">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-24 max-w-lg mx-auto text-center">
        <div className="border border-[rgba(200,168,106,0.25)] bg-[#16110C] p-10">
          <h2 className="font-serif text-3xl font-light text-[#F8F3EC] mb-3">Get in the network</h2>
          <p className="text-sm text-[#F8F3EC]/55 mb-8 leading-relaxed">
            Send us your specialty, location, and booking link. We&apos;ll follow up within a few days.
          </p>
          <a
            href="mailto:hey@qoyl.live?subject=Stylist%20Listing"
            className="inline-block bg-[#C8A86A] text-[#0E0A06] text-xs font-semibold tracking-[0.1em] uppercase px-10 py-4 hover:opacity-85 transition-opacity"
          >
            Email hey@qoyl.live
          </a>
          <p className="text-[11px] text-[#F8F3EC]/30 mt-5">
            Know a stylist who should be here?{" "}
            <Link href="/recommend-a-stylist" className="underline underline-offset-2 hover:text-[#F8F3EC]/60 transition-colors">
              Recommend them →
            </Link>
          </p>
        </div>
      </section>

      {/* Footer */}
      <div className="border-t border-[rgba(200,168,106,0.18)] px-6 py-8 text-center">
        <Link href="/" className="text-xs text-[#F8F3EC]/30 hover:text-[#F8F3EC]/60 transition-colors">
          ← back to qoyl
        </Link>
      </div>
    </main>
  );
}
