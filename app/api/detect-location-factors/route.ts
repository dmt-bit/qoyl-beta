import { NextResponse } from "next/server";
import {
  CLIMATE_LABELS,
  WATER_HARDNESS_LABELS,
  classifyClimate,
  stateFromZipCode,
  waterHardnessFromState,
} from "@/lib/locationFactors";

type WttrResponse = {
  current_condition?: { humidity?: string; temp_C?: string }[];
  weather?: { avgtempC?: string }[];
};

// Best-effort enrichment, called from the profile form as the user types
// their zip code -- server-side (rather than calling wttr.in directly
// from the browser) since browser CORS support for wttr.in isn't
// guaranteed, and this keeps the external dependency swappable without
// a client change. Never a hard failure: any problem (bad zip, network
// error, timeout) just returns nulls so the profile form can quietly
// skip the chips rather than blocking the save.
export async function POST(request: Request) {
  const body = await request.json();
  const zipCode: string | undefined = body?.zip_code;

  if (!zipCode || !/^\d{5}$/.test(zipCode.trim())) {
    return NextResponse.json({ climate: null, waterHardness: null });
  }

  const state = stateFromZipCode(zipCode);
  const waterHardness = waterHardnessFromState(state);

  let climate: string | null = null;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(
      `https://wttr.in/${encodeURIComponent(zipCode.trim())}?format=j1`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data: WttrResponse = await res.json();
      const humidity = Number(data.current_condition?.[0]?.humidity);
      const avgTempC = Number(data.weather?.[0]?.avgtempC);

      if (Number.isFinite(humidity) && Number.isFinite(avgTempC)) {
        climate = classifyClimate(humidity, avgTempC);
      }
    }
  } catch (err) {
    console.error("Climate detection failed for zip", zipCode, err);
  }

  return NextResponse.json({
    climate,
    climateLabel: climate
      ? CLIMATE_LABELS[climate as keyof typeof CLIMATE_LABELS]
      : null,
    waterHardness,
    waterHardnessLabel: WATER_HARDNESS_LABELS[waterHardness],
  });
}
