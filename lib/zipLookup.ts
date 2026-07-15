export type CityState = {
  city: string;
  stateAbbreviation: string;
};

// Best-effort only -- this runs inside a webhook handler, so a slow or
// down external API must never block or fail the email send. Falls back
// to null on any error, timeout, or missing zip code.
export async function lookupCityState(
  zipCode: string | null
): Promise<CityState | null> {
  if (!zipCode) return null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`https://api.zippopotam.us/us/${zipCode}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) return null;

    const data = await res.json();
    const place = data.places?.[0];
    if (!place) return null;

    return {
      city: place["place name"],
      stateAbbreviation: place["state abbreviation"],
    };
  } catch {
    return null;
  }
}
