import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const execFileAsync = promisify(execFile);

let lastSyncTime = 0;
let syncPromise: Promise<void> | null = null;

export async function GET() {
  return handleSync();
}

export async function POST() {
  return handleSync();
}

async function handleSync() {
  const now = Date.now();
  // Prevent sync spam: at most once every 60 seconds
  if (now - lastSyncTime < 60000) {
    return NextResponse.json({
      ok: true,
      message: "Sync was recently performed. Skipped to prevent rate limit.",
      lastSync: new Date(lastSyncTime).toISOString()
    });
  }

  if (!syncPromise) {
    const script = path.join(process.cwd(), "scripts", "sync-catalog.mjs");
    syncPromise = execFileAsync(process.execPath, [script], {
      cwd: process.cwd(),
      timeout: 120000,
      env: process.env
    })
      .then(() => {
        lastSyncTime = Date.now();
      })
      .finally(() => {
        syncPromise = null;
      });
  }

  try {
    await syncPromise;
    return NextResponse.json({
      ok: true,
      message: "Catalog, homepage, and new releases successfully synced!",
      syncedAt: new Date(lastSyncTime).toISOString()
    });
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    return NextResponse.json({ error: "Sync failed", detail }, { status: 500 });
  }
}
