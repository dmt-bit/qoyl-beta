import Link from "next/link";

export const metadata = {
  title: "Qoyl for Stylists",
  description: "Get matched with clients who are searching for a stylist like you.",
};

// Minimal - a footer link (see components/Footer.tsx) needed a real
// destination and none existed. No application form or CRM integration
// here since neither was asked for; a mailto keeps this honest about
// what actually happens on submit.
export default function ForStylistsPage() {
  return (
    <main className="min-h-screen bg-white px-4 py-16 font-sans text-dark sm:px-6">
      <div className="mx-auto max-w-lg">
        <h1 className="font-serif text-3xl font-semibold text-dark sm:text-4xl">For Stylists</h1>
        <p className="mt-4 text-sm leading-relaxed text-dark/70">
          Style Match sends users a complete hair plan built from a photo — tutorials, a shopping
          list, and a stylist near them. If you specialize in a technique or hair type Qoyl users
          are searching for, we&apos;d like to include you in those results.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-dark/70">
          Tell us your specialty, location, and booking link, and we&apos;ll reach out about
          getting you listed.
        </p>
        <a
          href="mailto:hey@qoyl.live?subject=Qoyl%20for%20Stylists"
          className="mt-6 inline-block bg-dark px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-bronze2"
        >
          get in touch →
        </a>

        {/* Secondary CTA (item 6) - the request asked for this on
            business.qoyl.live/stylists, a separate app/repo this
            session has no access to (same boundary already documented
            in lib/brandCatalogProducts.ts/lib/styleShoppingList.ts).
            Added here instead, on qoyl-beta's own stylists page, which
            serves the same purpose. */}
        <p className="mt-6 font-mono text-[10px] text-muted">
          know a stylist who should be here?{" "}
          <Link href="/recommend-a-stylist" className="text-dark underline underline-offset-2 hover:text-bronze2">
            recommend them →
          </Link>
        </p>

        <p className="mt-8 text-xs text-dark/40">
          <Link href="/" className="underline underline-offset-2 hover:text-dark/70">
            ← back to qoyl
          </Link>
        </p>
      </div>
    </main>
  );
}
