import { getAffiliateLink } from "@/lib/affiliateLinks";

export default function ShopButton({
  productName,
  brandName,
  className = "mt-2 inline-block text-xs text-bronze2 underline",
}: {
  productName: string;
  brandName?: string;
  className?: string;
}) {
  const link = getAffiliateLink(productName, brandName);

  if (link) {
    return (
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        Visit brand site →
      </a>
    );
  }

  // No brand site on file — route to the qoyl store so the user stays
  // in the ecosystem rather than bouncing to Google.
  const searchQuery = [productName, brandName].filter(Boolean).join(" ");

  return (
    <a
      href={`/store?q=${encodeURIComponent(searchQuery)}`}
      className={className}
    >
      Find in store →
    </a>
  );
}
