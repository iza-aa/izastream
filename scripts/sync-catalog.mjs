import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const CDP_PORT = process.env.CDP_PORT || "9333";
const CHROME_PROFILE = process.env.CHROME_PROFILE || path.join(ROOT, "data", "browser_profile");
const MASTER_ACCOUNT_FILE = path.join(ROOT, "data", "master_account.json");

async function getJson(url, init) {
  const res = await fetch(url, init);
  return res.json();
}

async function findOrLaunchCdp() {
  try {
    const list = await getJson(`http://127.0.0.1:${CDP_PORT}/json/list`);
    const page = list.find((t) => t.type === "page" && t.url.includes("idlixku.com"));
    if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
  } catch {}

  // If not running, launch chrome headless
  const { spawn } = await import("node:child_process");
  const candidates = [
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium"
  ].filter(Boolean);

  let chromePath = null;
  for (const c of candidates) {
    if (c && fs.existsSync(c)) { chromePath = c; break; }
  }

  if (!chromePath) throw new Error("Google Chrome executable not found for CDP sync.");

  const flags = [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${CHROME_PROFILE}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-blink-features=AutomationControlled",
    "--headless=new",
    "--ignore-certificate-errors",
    '--host-rules=MAP z2.idlixku.com 104.26.5.185, MAP idlixku.com 104.26.5.185',
    "--dns-over-https-mode=secure",
    "--dns-over-https-templates=https://dns.google/dns-query",
    "--no-sandbox",
    "--disable-gpu",
    "https://z2.idlixku.com"
  ];

  spawn(chromePath, flags, { detached: true, stdio: "ignore" }).unref();

  const deadline = Date.now() + 25000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 800));
    try {
      const list = await getJson(`http://127.0.0.1:${CDP_PORT}/json/list`);
      const page = list.find((t) => t.type === "page" && t.url.includes("idlixku.com"));
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {}
  }

  throw new Error("CDP Chrome did not become ready for sync.");
}

async function main() {
  console.log("[izastream-sync] Starting auto-updater sync from target API...");
  const wsUrl = await findOrLaunchCdp();
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  let nextId = 1;
  function evaluate(expr) {
    const id = nextId++;
    return new Promise((resolve) => {
      const handler = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.id === id) {
            ws.removeEventListener("message", handler);
            resolve(msg.result?.result?.value);
          }
        } catch {}
      };
      ws.addEventListener("message", handler);
      ws.send(JSON.stringify({ id, method: "Runtime.evaluate", params: { expression: expr, awaitPromise: true, returnByValue: true } }));
    });
  }

  // 1. Sync Homepage
  console.log("[izastream-sync] Fetching latest homepage feeds...");
  const homepage = await evaluate(`(async () => {
    try {
      const r = await fetch('/api/homepage', { headers: { accept: 'application/json' } });
      if (!r.ok) return { status: r.status };
      return { status: 200, data: await r.json() };
    } catch (e) {
      return { status: 500, error: String(e) };
    }
  })()`);

  if (homepage?.status === 200 && homepage.data) {
    const hpFile = path.join(ROOT, "data", "homepage.json");
    fs.writeFileSync(`${hpFile}.tmp`, JSON.stringify(homepage.data, null, 2));
    fs.renameSync(`${hpFile}.tmp`, hpFile);
    const sectionsCount = (homepage.data.above?.length || 0) + (homepage.data.below?.length || 0);
    console.log(`[izastream-sync] Successfully updated data/homepage.json (${sectionsCount} sections synced).`);
  } else {
    console.warn("[izastream-sync] Homepage fetch returned status:", homepage?.status);
  }

  // 2. Sync Movies (first 3 pages to catch newest additions)
  console.log("[izastream-sync] Fetching latest movies pages 1-3...");
  const moviesRes = await evaluate(`(async () => {
    const all = [];
    for (let p = 1; p <= 3; p++) {
      try {
        const r = await fetch('/api/movies?page=' + p, { headers: { accept: 'application/json' } });
        if (r.ok) {
          const j = await r.json();
          if (Array.isArray(j.data)) all.push(...j.data);
        }
      } catch {}
    }
    return all;
  })()`);

  if (Array.isArray(moviesRes) && moviesRes.length > 0) {
    const moviesFile = path.join(ROOT, "data", "catalog_movies.json");
    let existing = [];
    try { existing = JSON.parse(fs.readFileSync(moviesFile, "utf8")); } catch {}
    const existingSlugs = new Set(existing.map((m) => m.slug));
    let newCount = 0;
    for (const m of moviesRes) {
      if (m.slug && !existingSlugs.has(m.slug)) {
        existing.unshift(m);
        existingSlugs.add(m.slug);
        newCount++;
      }
    }
    fs.writeFileSync(`${moviesFile}.tmp`, JSON.stringify(existing, null, 2));
    fs.renameSync(`${moviesFile}.tmp`, moviesFile);
    console.log(`[izastream-sync] catalog_movies.json updated (${newCount} new movies added, total: ${existing.length}).`);
  }

  // 3. Sync Series (first 3 pages to catch newest additions)
  console.log("[izastream-sync] Fetching latest series pages 1-3...");
  const seriesRes = await evaluate(`(async () => {
    const all = [];
    for (let p = 1; p <= 3; p++) {
      try {
        const r = await fetch('/api/series?page=' + p, { headers: { accept: 'application/json' } });
        if (r.ok) {
          const j = await r.json();
          if (Array.isArray(j.data)) all.push(...j.data);
        }
      } catch {}
    }
    return all;
  })()`);

  if (Array.isArray(seriesRes) && seriesRes.length > 0) {
    const seriesFile = path.join(ROOT, "data", "catalog_series.json");
    let existing = [];
    try { existing = JSON.parse(fs.readFileSync(seriesFile, "utf8")); } catch {}
    const existingSlugs = new Set(existing.map((s) => s.slug));
    let newCount = 0;
    for (const s of seriesRes) {
      if (s.slug && !existingSlugs.has(s.slug)) {
        existing.unshift(s);
        existingSlugs.add(s.slug);
        newCount++;
      }
    }
    fs.writeFileSync(`${seriesFile}.tmp`, JSON.stringify(existing, null, 2));
    fs.renameSync(`${seriesFile}.tmp`, seriesFile);
    console.log(`[izastream-sync] catalog_series.json updated (${newCount} new series added, total: ${existing.length}).`);
  }

  ws.close();
  console.log("[izastream-sync] Auto-update sync completed successfully!");
}

main().catch((err) => {
  console.error("[izastream-sync] Sync failed:", err.message);
  process.exit(1);
});
