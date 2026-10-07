"use client";

import { useState } from "react";

// Brand logo from the brand's website domain. Clearbit's logo API is no
// longer reachable (its host doesn't resolve), so this uses Google's favicon
// service instead: it returns the site's icon for a domain, and a generic
// globe for unknown ones. Only the domain is sent - no user data.
//
// Anything that can't load (no domain, unknown site, network error) falls back
// to the brand's initial, so there is never a broken image.
export function brandLogoUrl(domain: string, size: number): string {
  // Ask for 128px when the logo is large; the service returns the closest size it has.
  const sz = size > 32 ? 128 : 64;
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${sz}`;
}

export function BrandLogo({
  brandName,
  domain,
  size = 32,
  className,
}: {
  brandName: string;
  domain?: string | null;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const logoUrl = domain && !failed ? brandLogoUrl(domain, size) : null;
  const initial = brandName?.trim().charAt(0).toUpperCase() || "?";

  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- third-party favicon URL, sized by us
      <img
        src={logoUrl}
        alt={`${brandName} logo`}
        width={size}
        height={size}
        onError={() => setFailed(true)}
        className={className}
        style={{ width: size, height: size, objectFit: "contain", display: "block", background: "#f5f5f5", flexShrink: 0 }}
      />
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center bg-dark font-sans font-bold text-white ${className ?? ""}`}
      style={{ width: size, height: size, fontSize: size * 0.44 }}
      aria-label={`${brandName} logo`}
    >
      {initial}
    </div>
  );
}

export default BrandLogo;
