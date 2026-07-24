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
  if (!link) return null;

  const label = link.includes("shopper.com")
    ? "Shop at Shopper →"
    : link.includes("ulta.com")
    ? "Shop at Ulta →"
    : "Shop this product →";

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {label}
    </a>
  );
}
