import { NextResponse } from "next/server";
import {
  authorizePlaybackUrl,
  isSessionFresh,
  playbackUpstreamHeaders,
  readPlaybackSession
} from "@/lib/playback";

export const dynamic = "force-dynamic";

/**
 * Pentos serves CMAF/fMP4 fragments behind disguised extensions (.html, .js, .webp)
 * with `application/octet-stream`. Sniff the container so native HLS players and
 * Hls.js receive a media type they accept.
 */
function sniffMediaType(bytes: Buffer, fallback: string | null): string {
  if (bytes.length >= 6 && bytes.subarray(0, 6).toString("ascii") === "WEBVTT") return "text/vtt; charset=utf-8";
  if (bytes.length >= 8) {
    const box = bytes.subarray(4, 8).toString("ascii");
    if (box === "ftyp" || box === "styp" || box === "moof" || box === "sidx") return "video/mp4";
    if (bytes[0] === 0x47) return "video/mp2t";
  }
  if (bytes.length >= 3 && bytes.subarray(0, 3).toString("ascii") === "ID3") return "audio/aac";
  return fallback && fallback !== "application/octet-stream" ? fallback : "video/mp4";
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
  const range = request.headers.get("range");
  const response = await fetch(upstream, {
    headers: playbackUpstreamHeaders(range ? { range } : {}),
    cache: "no-store"
  });
  if (!response.ok) {
    return NextResponse.json(
      { error: `Upstream segment failed: ${response.status}`, upstream: upstream.origin + upstream.pathname },
      { status: 502 }
    );
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  const headers = new Headers();
  headers.set("content-type", sniffMediaType(bytes, response.headers.get("content-type")));
  headers.set("content-length", String(bytes.length));
  headers.set("accept-ranges", "bytes");
  headers.set("cache-control", "private, max-age=60");
  const contentRange = response.headers.get("content-range");
  if (contentRange) headers.set("content-range", contentRange);

  return new NextResponse(new Uint8Array(bytes), { status: response.status, headers });
}
