import { NextResponse } from "next/server";
import { isSessionFresh, readPlaybackSession, readPlaybackSessions } from "@/lib/playback";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug");
  if (slug) {
    const session = readPlaybackSession(slug);
    return NextResponse.json({
      active: isSessionFresh(session),
      slug,
      kind: session?.kind ?? null,
      title: session?.title ?? null,
      expiresAt: session?.expiresAt ?? null,
      secondsRemaining: session ? Math.max(0, session.expiresAt - Math.floor(Date.now() / 1000)) : 0,
      subtitles: session?.subtitles ?? []
    });
  }

  const sessions = Object.values(readPlaybackSessions())
    .sort((a, b) => b.expiresAt - a.expiresAt)
    .map((session) => ({
      slug: session.slug,
      active: isSessionFresh(session),
      kind: session.kind,
      playType: session.playType,
      episodeId: session.episodeId ?? null,
      seasonNumber: session.seasonNumber ?? null,
      episodeNumber: session.episodeNumber ?? null,
      title: session.title,
      expiresAt: session.expiresAt,
      secondsRemaining: Math.max(0, session.expiresAt - Math.floor(Date.now() / 1000)),
      subtitles: session.subtitles ?? []
    }));
  return NextResponse.json({ activeCount: sessions.filter((s) => s.active).length, sessions });
}
