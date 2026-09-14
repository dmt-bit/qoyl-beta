import Image from "next/image";

// Real hair photography spanning straight through coily, so it reads as
// "every texture" - shared between the home hero and the /search page's
// header strip so both use the exact same photo set. No client-only
// hooks/state here, so this renders fine from either a Server Component
// (the home page) or a Client Component (the /search page).
export const HAIR_TYPE_STRIP_IMAGES = [
  "https://images.pexels.com/photos/4257489/pexels-photo-4257489.jpeg",
  "https://images.pexels.com/photos/7956110/pexels-photo-7956110.jpeg",
  "https://images.pexels.com/photos/4584409/pexels-photo-4584409.jpeg",
  "https://images.pexels.com/photos/6101922/pexels-photo-6101922.jpeg",
  "https://images.pexels.com/photos/6945691/pexels-photo-6945691.jpeg",
  "https://images.pexels.com/photos/6616645/pexels-photo-6616645.jpeg",
];

// Infinite horizontal scroll: the image list is duplicated in the markup
// and the shared `.hair-type-strip-track` keyframe (app/globals.css)
// translates by exactly -50%, so the loop is seamless regardless of tile
// size. `tileSize` controls both the square tile dimensions and, since
// there's no extra chrome around the tiles, the strip's total height.
export default function HairTypeStrip({
  tileSize = 160,
  className = "",
}: {
  tileSize?: number;
  className?: string;
}) {
  return (
    <div className={`w-full overflow-hidden ${className}`}>
      <div className="hair-type-strip-track flex w-max gap-4">
        {[...HAIR_TYPE_STRIP_IMAGES, ...HAIR_TYPE_STRIP_IMAGES].map((src, i) => (
          <div
            key={`${src}-${i}`}
            className="relative shrink-0 bg-[#f5f5f5]"
            style={{ height: tileSize, width: tileSize }}
          >
            <Image
              src={src}
              alt=""
              fill
              unoptimized={true}
              sizes={`${tileSize}px`}
              className="object-cover object-top"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
