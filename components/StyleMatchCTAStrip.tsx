import Link from "next/link";

export default function StyleMatchCTAStrip() {
  return (
    <section className="bg-dark px-5 py-12 text-center">
      <h2
        className="mx-auto max-w-lg lowercase text-white"
        style={{
          fontFamily: "var(--font-space-grotesk), 'Space Grotesk', sans-serif",
          fontWeight: 700,
          fontSize: "clamp(24px, 7vw, 36px)",
          letterSpacing: "-1.5px",
          lineHeight: 1.0,
        }}
      >
        upload a photo. get a complete hair plan.
      </h2>
      <p
        className="font-sans font-light text-[#888]"
        style={{ fontSize: "13px", marginTop: "10px", marginBottom: "28px" }}
      >
        tutorials · shopping list · stylist near you
      </p>
      <Link
        href="/style-match"
        className="inline-block bg-white lowercase text-dark"
        style={{
          fontFamily: "var(--font-space-grotesk), 'Space Grotesk', sans-serif",
          fontSize: "13px",
          fontWeight: 600,
          letterSpacing: "0.05em",
          padding: "13px 28px",
        }}
      >
        try style match →
      </Link>
    </section>
  );
}
