import fs from "node:fs";
import path from "node:path";

export interface PlaybackSession {
  slug: string;
  kind: string;
  contentId: string;
  playType: string;
  title: string;
  videoId: string;
  playlistUrl: string;
  token: string;
  expiresAt: number;
  claimExpiresAt: number;
  renewalToken: string;
  subtitles: Array<{ lang: string; label: string; path: string }>;
  episodeId?: string;
  episodeNumber?: number;
  seasonNumber?: number;
  seriesSlug?: string;
  savedAt: string;
}

export interface ResolvedPlayback {
  src: string;
  mode: "real" | "demo";
  label: string;
  expiresAt?: number;
  subtitles: Array<{ lang: string; label: string; path: string }>;
}

const DEMO_SRC = "/media/hls/demo.m3u8";
const SESSIONS_FILE = path.join(process.cwd(), "data", "playback_sessions.json");
const LEGACY_FILE = path.join(process.cwd(), "data", "playback_session.json");

function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

export function readPlaybackSessions(): Record<string, PlaybackSession> {
  const store = readJson<Record<string, PlaybackSession>>(SESSIONS_FILE, {});
  const legacy = readJson<PlaybackSession | null>(LEGACY_FILE, null);
  if (legacy?.slug && !store[legacy.slug]) store[legacy.slug] = legacy;
  return store;
}

export function readPlaybackSession(slug?: string): PlaybackSession | null {
  const store = readPlaybackSessions();
  if (slug) return store[slug] ?? null;
  const sessions = Object.values(store);
  if (!sessions.length) return null;
  return sessions.sort((a, b) => b.expiresAt - a.expiresAt)[0];
}

export function isSessionFresh(session: PlaybackSession | null, skewSeconds = 30): session is PlaybackSession {
  return Boolean(session && session.expiresAt * 1000 > Date.now() + skewSeconds * 1000);
}

export function resolvePlayback(slug: string): ResolvedPlayback {
  const session = readPlaybackSession(slug);
  if (isSessionFresh(session)) {
    return {
      src: `/api/playback/master?slug=${encodeURIComponent(slug)}`,
      mode: "real",
      label: session.kind === "movie" ? "PENTOS · MOVIE" : "PENTOS · EPISODE",
      expiresAt: session.expiresAt,
      subtitles: session.subtitles ?? []
    };
  }
  return { src: DEMO_SRC, mode: "demo", label: "LOCAL DEMO HLS", subtitles: [] };
}

export function sessionForSlug(slug: string): PlaybackSession | null {
  const session = readPlaybackSession(slug);
  return isSessionFresh(session) ? session : null;
}

/** Add the signed path token required by every Pentos manifest/segment request. */
export function authorizePlaybackUrl(rawUrl: string, token: string): URL {
  const url = new URL(rawUrl);
  url.searchParams.set("t", token);
  url.searchParams.set("pm", "browser");
  return url;
}

export function playbackUpstreamHeaders(extra: Record<string, string> = {}): HeadersInit {
  return {
    accept: "*/*",
    referer: "https://z2.idlixku.com/",
    "user-agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36",
    ...extra
  };
}
