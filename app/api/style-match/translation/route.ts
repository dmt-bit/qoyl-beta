import { NextResponse } from "next/server";
import { getStyleTranslation, resolveHairFamilyForTranslation } from "@/lib/styleTranslations";

// Client-side bridge (app/style-match/page.tsx is "use client") for
// style_translations + the extension_profiles check inside
// resolveHairFamilyForTranslation, both of which need the service role.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const styleName = searchParams.get("style_name");
  const curlType = searchParams.get("curl_type");
  const userId = searchParams.get("user_id");

  if (!styleName) {
    return NextResponse.json({ translation: null, hairFamily: null });
  }

  const hairFamily = await resolveHairFamilyForTranslation(userId, curlType);
  const translation = await getStyleTranslation(styleName, hairFamily);

  return NextResponse.json({ translation, hairFamily });
}
