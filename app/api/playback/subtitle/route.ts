import { NextResponse } from "next/server";
import { authorizePlaybackUrl, isSessionFresh, playbackUpstreamHeaders, readPlaybackSession } from "@/lib/playback";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const target = new URL(request.url).searchParams.get("u");
  if (!target) return NextResponse.json({ error: "missing u" }, { status: 400 });

  const session = readPlaybackSession();
  // Subtitle files are public on Pentos, but include the token when a session exists
  // so the same proxy keeps working if the CDN tightens authorization.
  const upstream = session && isSessionFresh(session) ? authorizePlaybackUrl(target, session.token) : new URL(target);
  const response = await fetch(upstream, { headers: playbackUpstreamHeaders(), cache: "no-store" });
  if (!response.ok) {
    return NextResponse.json({ error: `Upstream subtitle failed: ${response.status}` }, { status: 502 });
  }
  const body = await response.text();
  return new NextResponse(body, {
    status: 200,
    headers: {
      "content-type": "text/vtt; charset=utf-8",
      "cache-control": "private, max-age=300"
    }
  });
}
