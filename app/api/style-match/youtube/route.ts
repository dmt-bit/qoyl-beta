import { NextResponse } from "next/server";

export type YouTubeVideoResult = {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
};

// Server-side proxy -- YOUTUBE_API_KEY must never reach the browser
// bundle, so /style-match calls this route instead of the YouTube Data
// API directly.
export async function GET(request: Request) {
  console.log("[style-match/youtube] route hit");

  if (!process.env.YOUTUBE_API_KEY) {
    console.warn("[style-match/youtube] YOUTUBE_API_KEY is not set");
    return NextResponse.json({ videos: [] });
  }

  const { searchParams } = new URL(request.url);
  const styleName = searchParams.get("style_name");
  const curlType = searchParams.get("curl_type");

  if (!styleName) {
    return NextResponse.json(
      { error: "style_name is required." },
      { status: 400 }
    );
  }

  const query = [styleName, "tutorial", curlType, "hair"]
    .filter(Boolean)
    .join(" ");

  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("q", query);
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", "6");
  url.searchParams.set("key", process.env.YOUTUBE_API_KEY);

  try {
    const res = await fetch(url.toString());

    if (!res.ok) {
      const errorBody = await res.text();
      console.error("[style-match/youtube] YouTube API error:", res.status, errorBody);
      return NextResponse.json({ videos: [] });
    }

    const data = await res.json();
    const videos: YouTubeVideoResult[] = (data.items ?? [])
      .filter((item: { id?: { videoId?: string } }) => item.id?.videoId)
      .map((item: {
        id: { videoId: string };
        snippet: { title: string; channelTitle: string; thumbnails?: { medium?: { url: string }; default?: { url: string } } };
      }) => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        channelTitle: item.snippet.channelTitle,
        thumbnailUrl:
          item.snippet.thumbnails?.medium?.url ??
          item.snippet.thumbnails?.default?.url ??
          "",
      }));

    console.log("[style-match/youtube] found videos:", videos.length);
    return NextResponse.json({ videos });
  } catch (err) {
    console.error("[style-match/youtube] Failed to reach YouTube API:", err);
    return NextResponse.json({ videos: [] });
  }
}
