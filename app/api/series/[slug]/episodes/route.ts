import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import { findContent } from "@/lib/data";

export const dynamic = "force-dynamic";

const execFileAsync = promisify(execFile);

type LockStore = typeof globalThis & { __idlixSeriesMetaLocks?: Map<string, Promise<void>> };
const locks = ((globalThis as LockStore).__idlixSeriesMetaLocks ??= new Map<string, Promise<void>>());

function metaFileFor(slug: string) {
  return path.join(process.cwd(), "data", "series", `${slug}.json`);
}

function readCachedMeta(slug: string, maxAgeHours = 24) {
  const file = metaFileFor(slug);
  try {
    const stats = fs.statSync(file);
    if (Date.now() - stats.mtimeMs > maxAgeHours * 3600 * 1000) return null;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const entry = findContent(slug);
  if (!entry || entry.contentType !== "tv_series") {
    return NextResponse.json({ error: `Series not found in local catalog: ${slug}` }, { status: 404 });
  }

  const cached = readCachedMeta(slug);
  if (cached) return NextResponse.json(cached);

  let pending = locks.get(slug);
  if (!pending) {
    const script = path.join(process.cwd(), "scripts", "refresh-playback.mjs");
    pending = execFileAsync(process.execPath, [script, slug, "series", "--episodes-only"], {
      cwd: process.cwd(),
      timeout: 60000,
      env: process.env
    })
      .then(() => undefined)
      .finally(() => locks.delete(slug));
    locks.set(slug, pending);
  }

  try {
    await pending;
  } catch (cause) {
    const detail =
      cause && typeof cause === "object" && "stderr" in cause && typeof cause.stderr === "string"
        ? cause.stderr.slice(-800)
        : cause instanceof Error
          ? cause.message
          : String(cause);
    return NextResponse.json({ error: "Failed to fetch series episodes from target", detail }, { status: 502 });
  }

  const fresh = readCachedMeta(slug, 1);
  if (!fresh) {
    return NextResponse.json({ error: "Episodes script ran but wrote no metadata file" }, { status: 502 });
  }
  return NextResponse.json(fresh);
}
