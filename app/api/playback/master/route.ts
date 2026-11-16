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

function rewritePlaylist(text: string, baseUrl: string, slug: string): string {
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
        if (trimmed.startsWith("#EXT-X-MEDIA") || trimmed.startsWith("#EXT-X-I-FRAME-STREAM-INF")) {
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
  const slug = new URL(request.url).searchParams.get("slug") ?? "";
  const session = readPlaybackSession(slug || undefined);
  if (!isSessionFresh(session)) {
    return NextResponse.json(
      { error: `No fresh playback session for ${slug || "any title"}. Run \`node scripts/refresh-playback.mjs ${slug || "<slug>"}\` first.` },
      { status: 409 }
    );
  }

  const upstream = authorizePlaybackUrl(session.playlistUrl, session.token);
  const response = await fetch(upstream, { headers: playbackUpstreamHeaders(), cache: "no-store" });
  if (!response.ok) {
    return NextResponse.json(
      { error: `Upstream master failed: ${response.status}`, upstream: upstream.origin + upstream.pathname },
      { status: 502 }
    );
  }
  const text = await response.text();
  return new NextResponse(rewritePlaylist(text, session.playlistUrl, session.slug), {
    status: 200,
    headers: {
      "content-type": "application/vnd.apple.mpegurl; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}
