import { NextResponse } from "next/server";
import {
  authorizePlaybackUrl,
  isSessionFresh,
  playbackUpstreamHeaders,
  readPlaybackSession
} from "@/lib/playback";

export const dynamic = "force-dynamic";

function proxied(kind: "manifest" | "segment", absolute: string, slug: string): string {
  return `/api/playback/${kind}?s=${encodeURIComponent(slug)}&u=${encodeURIComponent(absolute)}`;
}

function rewrite(text: string, baseUrl: string, slug: string): string {
  const isMaster = text.includes("#EXT-X-STREAM-INF");
  return text
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      if (trimmed.startsWith("#")) {
        if (trimmed.startsWith("#EXT-X-MAP") || trimmed.startsWith("#EXT-X-KEY")) {
          return line.replace(/URI="([^"]+)"/g, (_match, uri: string) => `URI="${proxied("segment", new URL(uri, baseUrl).href, slug)}"`);
        }
        if (trimmed.startsWith("#EXT-X-MEDIA")) {
          return line.replace(/URI="([^"]+)"/g, (_match, uri: string) => `URI="${proxied("manifest", new URL(uri, baseUrl).href, slug)}"`);
        }
        return line;
      }
      const absolute = new URL(trimmed, baseUrl).href;
      const isPlaylist = isMaster || /\.(m3u8|json)(\?|$)/i.test(absolute);
      return proxied(isPlaylist ? "manifest" : "segment", absolute, slug);
    })
    .join("\n");
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const target = params.get("u");
  const slug = params.get("s") ?? "";
  const session = readPlaybackSession(slug || undefined);
  if (!target) return NextResponse.json({ error: "missing u" }, { status: 400 });
  if (!isSessionFresh(session)) {
    return NextResponse.json({ error: "playback session expired; refresh it" }, { status: 409 });
  }

  const upstream = authorizePlaybackUrl(target, session.token);
  const response = await fetch(upstream, { headers: playbackUpstreamHeaders(), cache: "no-store" });
  if (!response.ok) {
    return NextResponse.json(
      { error: `Upstream manifest failed: ${response.status}`, upstream: upstream.origin + upstream.pathname },
      { status: 502 }
    );
  }
  const text = await response.text();
  return new NextResponse(rewrite(text, upstream.href, session.slug), {
    status: 200,
    headers: {
      "content-type": "application/vnd.apple.mpegurl; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}
