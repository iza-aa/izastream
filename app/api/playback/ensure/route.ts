import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import { findContent } from "@/lib/data";
import { isSessionFresh, readPlaybackSession } from "@/lib/playback";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

const execFileAsync = promisify(execFile);

type LockStore = typeof globalThis & { __idlixProvisionLocks?: Map<string, Promise<void>> };
const locks = ((globalThis as LockStore).__idlixProvisionLocks ??= new Map<string, Promise<void>>());

function sessionPayload(slug: string, episodeId?: string) {
  const session = readPlaybackSession(slug);
  if (!isSessionFresh(session)) return null;
  if (episodeId && session.episodeId !== episodeId) return null;
  return {
    status: "ready" as const,
    slug,
    kind: session.kind,
    title: session.title,
    src: `/api/playback/master?slug=${encodeURIComponent(slug)}`,
    expiresAt: session.expiresAt,
    subtitles: session.subtitles ?? [],
    episode:
      session.episodeId != null
        ? {
            id: session.episodeId,
            seasonNumber: session.seasonNumber ?? null,
            episodeNumber: session.episodeNumber ?? null
          }
        : null
  };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const bodyObj = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const slug = typeof bodyObj.slug === "string" ? bodyObj.slug : "";
  const episodeId = typeof bodyObj.episodeId === "string" && bodyObj.episodeId ? bodyObj.episodeId : undefined;
  if (!slug) return NextResponse.json({ error: "missing slug" }, { status: 400 });

  const entry = findContent(slug);
  if (!entry) return NextResponse.json({ error: `unknown title: ${slug}` }, { status: 404 });

  const existing = sessionPayload(slug, episodeId);
  if (existing) return NextResponse.json(existing);

  const kind = entry.contentType === "movie" ? "movie" : "series";
  const lockKey = `${slug}:${kind}:${episodeId ?? "default"}`;
  let pending = locks.get(lockKey);
  if (!pending) {
    const script = path.join(process.cwd(), "scripts", "refresh-playback.mjs");
    const scriptArgs = [script, slug, kind, ...(episodeId ? ["--episode", episodeId] : [])];
    pending = execFileAsync(process.execPath, scriptArgs, {
      cwd: process.cwd(),
      timeout: 150000,
      maxBuffer: 4 * 1024 * 1024,
      env: process.env
    })
      .then(() => undefined)
      .finally(() => locks.delete(lockKey));
    locks.set(lockKey, pending);
  }

  try {
    await pending;
  } catch (cause) {
    const detail =
      cause && typeof cause === "object" && "stderr" in cause && typeof cause.stderr === "string"
        ? cause.stderr.slice(-1200)
        : cause instanceof Error
          ? cause.message
          : String(cause);
    return NextResponse.json({ error: "playback provisioning failed", detail }, { status: 502 });
  }

  const payload = sessionPayload(slug, episodeId);
  if (!payload) {
    return NextResponse.json({ error: "provisioning completed but no fresh session was written for episode" }, { status: 502 });
  }
  return NextResponse.json(payload);
}
