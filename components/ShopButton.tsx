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

  // No brand site to link to - always give the user a working path to
  // find the product rather than a dead end.
  const searchQuery = [productName, brandName].filter(Boolean).join(" ");

  return (
    <a
      href={`https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      Search for this product →
    </a>
  );
}
