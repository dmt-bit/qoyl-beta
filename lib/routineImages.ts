// Editorial image breaks on /routine, matched to the user's curl type.
// Images are sourced from Pexels (free to use, no sign-in required for display).

type RoutineImagePair = { break1: string; break2: string };

// Pexels image URLs sized to 800w for fast loading.
// Coily (4a-4c): tight coils, TWAs, natural texture
// Curly (3a-3c): defined curls, wash-and-gos
// Wavy (2a-2c): beachy waves, loose curls
// Straight (1a-1c): sleek, blowouts
const ROUTINE_IMAGES: Record<string, RoutineImagePair> = {
  // Coily 4a-4c
  "4a": {
    break1: "https://images.pexels.com/photos/3738382/pexels-photo-3738382.jpeg?auto=compress&cs=tinysrgb&w=800",
    break2: "https://images.pexels.com/photos/3755706/pexels-photo-3755706.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  "4b": {
    break1: "https://images.pexels.com/photos/3755706/pexels-photo-3755706.jpeg?auto=compress&cs=tinysrgb&w=800",
    break2: "https://images.pexels.com/photos/8961546/pexels-photo-8961546.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  "4c": {
    break1: "https://images.pexels.com/photos/8961546/pexels-photo-8961546.jpeg?auto=compress&cs=tinysrgb&w=800",
    break2: "https://images.pexels.com/photos/3738382/pexels-photo-3738382.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  // Curly 3a-3c
  "3a": {
    break1: "https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg?auto=compress&cs=tinysrgb&w=800",
    break2: "https://images.pexels.com/photos/3785079/pexels-photo-3785079.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  "3b": {
    break1: "https://images.pexels.com/photos/3785079/pexels-photo-3785079.jpeg?auto=compress&cs=tinysrgb&w=800",
    break2: "https://images.pexels.com/photos/4350095/pexels-photo-4350095.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  "3c": {
    break1: "https://images.pexels.com/photos/4350095/pexels-photo-4350095.jpeg?auto=compress&cs=tinysrgb&w=800",
    break2: "https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  // Wavy 2a-2c
  "2a": {
    break1: "https://images.pexels.com/photos/2065195/pexels-photo-2065195.jpeg?auto=compress&cs=tinysrgb&w=800",
    break2: "https://images.pexels.com/photos/3812745/pexels-photo-3812745.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  "2b": {
    break1: "https://images.pexels.com/photos/3812745/pexels-photo-3812745.jpeg?auto=compress&cs=tinysrgb&w=800",
    break2: "https://images.pexels.com/photos/2065195/pexels-photo-2065195.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  "2c": {
    break1: "https://images.pexels.com/photos/3812745/pexels-photo-3812745.jpeg?auto=compress&cs=tinysrgb&w=800",
    break2: "https://images.pexels.com/photos/2065195/pexels-photo-2065195.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  // Straight 1a-1c
  "1a": {
    break1: "https://images.pexels.com/photos/3373737/pexels-photo-3373737.jpeg?auto=compress&cs=tinysrgb&w=800",
    break2: "https://images.pexels.com/photos/2065195/pexels-photo-2065195.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  "1b": {
    break1: "https://images.pexels.com/photos/3373737/pexels-photo-3373737.jpeg?auto=compress&cs=tinysrgb&w=800",
    break2: "https://images.pexels.com/photos/3812745/pexels-photo-3812745.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  "1c": {
    break1: "https://images.pexels.com/photos/3373737/pexels-photo-3373737.jpeg?auto=compress&cs=tinysrgb&w=800",
    break2: "https://images.pexels.com/photos/2065195/pexels-photo-2065195.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
};

// Fallback for an unknown or missing curl type.
const DEFAULT_IMAGES: RoutineImagePair = {
  break1: "https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg?auto=compress&cs=tinysrgb&w=800",
  break2: "https://images.pexels.com/photos/3738382/pexels-photo-3738382.jpeg?auto=compress&cs=tinysrgb&w=800",
};

// URLs are already plain image URLs; this is kept for API compatibility.
export function toPosterUrl(url: string): string {
  return url;
}

export function getRoutineImages(curlType: string | null | undefined): RoutineImagePair {
  const pair = (curlType && ROUTINE_IMAGES[curlType]) || DEFAULT_IMAGES;
  return { break1: pair.break1, break2: pair.break2 };
}
