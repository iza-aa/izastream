#!/usr/bin/env node
/**
 * Refresh a real Pentos playback session for a movie or one series episode.
 *
 * When IDLIX_MASTER_USER and IDLIX_MASTER_PASS are provided (or stored in
 * data/master_account.json), the script automatically authenticates the master
 * account in the browser session, upgrading the stream to Regular tier (1080p).
 *
 * Usage:
 *   node scripts/refresh-playback.mjs <slug> [movie|series] [--episode UUID] [--cdp URL]
 */
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const flag = (name, fallback = "") => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};
const cdp = flag("--cdp", process.env.IDLIX_CDP ?? "http://127.0.0.1:9333");
const episodeArg = flag("--episode", "");
const episodesOnly = args.includes("--episodes-only");
const positional = args.filter((value, index) => {
  if (value.startsWith("--")) return false;
  const previous = args[index - 1];
  return previous !== "--cdp" && previous !== "--episode";
});
const slug = positional[0];
const kindArg = positional[1] ?? "movie";
if (!slug) {
  console.error("usage: node scripts/refresh-playback.mjs <slug> [movie|series] [--episode UUID] [--cdp URL]");
  process.exit(1);
}

const ROOT = path.resolve(import.meta.dirname, "..");
const homepage = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "homepage.json"), "utf8"));
const wantedType = kindArg === "series" || kindArg === "tv_series" ? "tv_series" : "movie";
const entries = [];
for (const section of [...homepage.above, ...homepage.below]) {
  for (const item of section.data ?? []) {
    const content = item.content ?? item;
    if (content?.slug) entries.push({ slug: content.slug, id: content.id, type: item.contentType ?? content.contentType });
    if (item.series?.slug) {
      entries.push({ slug: item.series.slug, id: item.series.id || item.series.slug, type: "tv_series" });
    }
  }
}
try {
  const cms = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "catalog_movies.json"), "utf8"));
  for (const m of cms) entries.push({ slug: m.slug, id: m.id, type: "movie" });
} catch {}
try {
  const css = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "catalog_series.json"), "utf8"));
  for (const s of css) entries.push({ slug: s.slug, id: s.id, type: "tv_series" });
} catch {}
try {
  const netFile = path.join(ROOT, "data", "networks.json");
  if (fs.existsSync(netFile)) {
    const nets = JSON.parse(fs.readFileSync(netFile, "utf8"));
    for (const [, obj] of Object.entries(nets)) {
      for (const item of (obj?.data ?? [])) {
        if (item.slug && item.id) {
          const itemType = item.contentType === "movie" || (!item.firstAirDate && Boolean(item.releaseDate)) ? "movie" : "tv_series";
          entries.push({ slug: item.slug, id: item.id, type: itemType });
        }
      }
    }
  }
} catch {}
try {
  const sDir = path.join(ROOT, "data", "series");
  if (fs.existsSync(sDir)) {
    for (const f of fs.readdirSync(sDir)) {
      if (f.endsWith(".json")) {
        const m = JSON.parse(fs.readFileSync(path.join(sDir, f), "utf8"));
        if (m.slug && m.id) entries.push({ slug: m.slug, id: m.id, type: "tv_series" });
      }
    }
  }
} catch {}
try {
  const mDir = path.join(ROOT, "data", "movies");
  if (fs.existsSync(mDir)) {
    for (const f of fs.readdirSync(mDir)) {
      if (f.endsWith(".json")) {
        const m = JSON.parse(fs.readFileSync(path.join(mDir, f), "utf8"));
        if (m.slug && m.id) entries.push({ slug: m.slug, id: m.id, type: "movie" });
      }
    }
  }
} catch {}

let target =
  entries.find((entry) => entry.slug === slug && entry.type === wantedType) ??
  entries.find((entry) => entry.slug === slug);
if (!target) {
  target = { slug, id: slug, type: wantedType };
}
async function getJson(url, init) {
  const response = await fetch(url, init);
  return response.json();
}

function resolveChromeBinary() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/snap/bin/chromium"
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return candidates[0];
}

const CHROME_PATH = resolveChromeBinary();
const CHROME_PROFILE = process.env.IDLIX_CHROME_PROFILE ?? path.join(ROOT, "data", "browser_profile");

async function cdpReady() {
  try {
    await getJson(`${cdp}/json/version`);
    return true;
  } catch {
    return false;
  }
}

async function ensureChrome() {
  if (await cdpReady()) return;
  if (!fs.existsSync(CHROME_PATH)) {
    throw new Error(`Chrome/Chromium binary not found at ${CHROME_PATH}; set CHROME_PATH to the browser binary.`);
  }
  const { spawn } = await import("node:child_process");
  const chromeFlags = [
    "--remote-debugging-port=9333",
    `--user-data-dir=${CHROME_PROFILE}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-blink-features=AutomationControlled",
    "--headless=new",
    "--ignore-certificate-errors",
    "--disable-gpu",
    '--host-rules=MAP z2.idlixku.com 104.26.5.185, MAP idlixku.com 104.26.5.185',
    "--dns-over-https-mode=secure",
    "--dns-over-https-templates=https://dns.google/dns-query",
    '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    "--window-size=1440,900"
  ];
  if (process.platform === "linux") {
    chromeFlags.push("--no-sandbox", "--disable-dev-shm-usage");
  }

  const child = spawn(CHROME_PATH, chromeFlags, { detached: true, stdio: "ignore" });
  child.unref();
  const deadline = Date.now() + 25000;
  while (Date.now() < deadline) {
    if (await cdpReady()) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Chrome CDP did not start at ${cdp}`);
}

async function ensurePage() {
  await ensureChrome();
  const list = await getJson(`${cdp}/json/list`);
  const page = list.find((item) => item.type === "page" && item.url.includes("idlixku.com"));
  if (page) return page;
  const pathPrefix = wantedType === "movie" ? "movie" : "series";
  return getJson(`${cdp}/json/new?${encodeURIComponent(`https://z2.idlixku.com/${pathPrefix}/${slug}`)}`, { method: "PUT" });
}

const page = await ensurePage();
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.onopen = resolve;
  ws.onerror = reject;
});
let nextId = 1;
const pending = new Map();
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const entry = pending.get(message.id);
    pending.delete(message.id);
    message.error ? entry.reject(new Error(JSON.stringify(message.error))) : entry.resolve(message.result);
  }
};
const send = (method, params) =>
  new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });

await send("Runtime.enable", {});
const evaluate = async (expression) => {
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  return result.result?.value;
};

for (let attempt = 0; attempt < 45; attempt++) {
  const state = await evaluate(`({ title: document.title, href: location.href })`);
  if (state?.href?.includes("idlixku.com") && !/just a moment|attention required/i.test(state.title)) break;
  await new Promise((resolve) => setTimeout(resolve, 2000));
}

// Master account automated authentication (shared service session)
const masterUser =
  process.env.IDLIX_MASTER_USER ||
  (function () {
    try {
      return JSON.parse(fs.readFileSync(path.join(ROOT, "data", "master_account.json"), "utf8")).username;
    } catch {
      return "";
    }
  })();
const masterPass =
  process.env.IDLIX_MASTER_PASS ||
  (function () {
    try {
      return JSON.parse(fs.readFileSync(path.join(ROOT, "data", "master_account.json"), "utf8")).password;
    } catch {
      return "";
    }
  })();

if (masterUser && masterPass) {
  const authState = await evaluate(`(async () => {
    try {
      const meRes = await fetch('/api/auth/me');
      if (meRes.ok) {
        const me = await meRes.json();
        if (me?.user) return { loggedIn: true, user: me.user.username, tier: me.user.tier };
      }
    } catch {}
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ identifier: ${JSON.stringify(masterUser)}, password: ${JSON.stringify(masterPass)} })
      });
      if (res.ok) {
        const j = await res.json();
        return { loggedIn: true, tier: j?.user?.tier };
      }
    } catch {}
    return { loggedIn: false };
  })()`);
  if (authState?.loggedIn) {
    console.log(`Master account authenticated: ${masterUser} (tier: ${authState.tier ?? "regular"})`);
  }
}

let playType = wantedType === "movie" ? "movie" : "episode";
let contentId = target.id;
let episodeMeta = null;

if (playType === "episode") {
  const payload = await evaluate(`(async () => {
    const slug = ${JSON.stringify(slug)};
    const response = await fetch('/api/series/' + encodeURIComponent(slug), { headers: { accept: 'application/json' } });
    if (!response.ok) {
      let err; try { err = await response.json(); } catch { err = await response.text(); }
      return { status: response.status, error: err };
    }
    const series = await response.json();
    const collected = [];
    for (const season of series.seasons ?? []) {
      let seasonEpisodes = season.episodes;
      if (!Array.isArray(seasonEpisodes) || seasonEpisodes.length === 0) {
        try {
          const detail = await (await fetch('/api/series/' + encodeURIComponent(slug) + '/season/' + season.seasonNumber, { headers: { accept: 'application/json' } })).json();
          seasonEpisodes = detail.season?.episodes ?? [];
        } catch {
          seasonEpisodes = [];
        }
      }
      for (const episode of seasonEpisodes) {
        collected.push({
          id: episode.id,
          seasonId: episode.seasonId,
          seasonNumber: season.seasonNumber,
          episodeNumber: episode.episodeNumber,
          name: episode.name,
          overview: episode.overview,
          runtime: episode.runtime,
          stillPath: episode.stillPath,
          airDate: episode.airDate,
          hasVideo: Boolean(episode.hasVideo),
          isPublished: Boolean(episode.isPublished)
        });
      }
    }
    return {
      status: 200,
      series: {
        id: series.id,
        title: series.title,
        originalTitle: series.originalTitle,
        overview: series.overview,
        tagline: series.tagline,
        genres: series.genres,
        createdBy: series.createdBy,
        productionCompanies: series.productionCompanies,
        logoPath: series.logoPath,
        posterPath: series.posterPath,
        backdropPath: series.backdropPath,
        numberOfSeasons: series.numberOfSeasons,
        numberOfEpisodes: series.numberOfEpisodes,
        firstAirDate: series.firstAirDate,
        status: series.status,
        watchlistCount: series.watchlistCount,
        favouriteCount: series.favouriteCount,
        shareCount: series.shareCount,
        country: series.country,
        originalLanguage: series.originalLanguage,
        voteAverage: series.voteAverage,
        trailerUrl: series.trailerUrl,
        seasons: (series.seasons ?? []).map((s) => ({
          id: s.id,
          seasonNumber: s.seasonNumber,
          name: s.name,
          episodeCount: s.episodeCount ?? (s.episodes ? s.episodes.length : null)
        })),
        cast: (series.cast ?? []).map((c) => ({
          id: c.id,
          name: c.name,
          character: c.character,
          profilePath: c.profilePath,
          order: c.order
        }))
      },
      episodes: collected
    };
  })()`);

  if (payload?.status !== 200) {
    console.error(`series lookup failed: ${payload?.status} ${JSON.stringify(payload?.error)?.slice(0, 300)}`);
    ws.close();
    process.exit(1);
  }

  const { series, episodes } = payload;
  const seriesDir = path.join(ROOT, "data", "series");
  fs.mkdirSync(seriesDir, { recursive: true });
  const metaFile = path.join(seriesDir, `${slug}.json`);
  const tmpMeta = `${metaFile}.${process.pid}.tmp`;
  fs.writeFileSync(tmpMeta, JSON.stringify({ slug, ...series, episodes, savedAt: new Date().toISOString() }, null, 2));
  fs.renameSync(tmpMeta, metaFile);
  console.log(`Saved series metadata: data/series/${slug}.json (${episodes.length} episodes across ${series.seasons.length} seasons)`);

  if (episodesOnly) {
    ws.close();
    console.log(`--episodes-only requested; exiting without playback token exchange.`);
    process.exit(0);
  }

  const picked = episodeArg
    ? episodes.find((episode) => episode.id === episodeArg)
    : episodes.find((episode) => episode.hasVideo && episode.isPublished) ?? episodes.find((episode) => episode.hasVideo) ?? episodes[0];
  if (!picked?.id) {
    console.error(`no playable episode found for ${slug}`);
    ws.close();
    process.exit(1);
  }
  contentId = picked.id;
  episodeMeta = {
    episodeId: picked.id,
    episodeNumber: picked.episodeNumber,
    seasonNumber: picked.seasonNumber,
    seriesSlug: slug
  };
  console.log(`Selected ${slug} S${picked.seasonNumber}E${picked.episodeNumber} (${picked.id})`);
}

if (playType === "movie") {
  const moviePayload = await evaluate(`(async () => {
    const slug = ${JSON.stringify(slug)};
    try {
      const res = await fetch('/api/movies/' + encodeURIComponent(slug), { headers: { accept: 'application/json' } });
      if (!res.ok) return { status: res.status };
      const movie = await res.json();
      return { status: 200, movie };
    } catch (e) {
      return { status: 500, error: String(e) };
    }
  })()`);

  if (moviePayload?.status === 200 && moviePayload.movie) {
    const moviesDir = path.join(ROOT, "data", "movies");
    fs.mkdirSync(moviesDir, { recursive: true });
    const metaFile = path.join(moviesDir, `${slug}.json`);
    fs.writeFileSync(metaFile, JSON.stringify({ slug, ...moviePayload.movie, savedAt: new Date().toISOString() }, null, 2));
    console.log(`Saved movie metadata: data/movies/${slug}.json`);
  }

  if (episodesOnly) {
    ws.close();
    console.log(`--episodes-only requested for movie; exiting without playback token exchange.`);
    process.exit(0);
  }
}
console.log(`Exchanging playback tokens for ${slug} (${playType}, ${contentId})...`);
const exchange = await evaluate(`(async () => {
  const contentId = ${JSON.stringify(contentId)};
  const playType = ${JSON.stringify(playType)};
  const infoRes = await fetch('/api/watch/play-info/' + playType + '/' + contentId, { headers: { accept: 'application/json' } });
  const info = await infoRes.json();
  if (!infoRes.ok) return { stage: 'play-info', status: infoRes.status, body: info };
  await new Promise(resolve => setTimeout(resolve, Math.max(0, (info.unlockAt ?? info.serverNow) - info.serverNow + 150)));
  const claimRes = await fetch('/api/watch/session/claim', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ gateToken: info.gateToken })
  });
  const claim = await claimRes.json();
  if (!claimRes.ok) return { stage: 'claim', status: claimRes.status, body: claim };
  const redeemRes = await fetch(claim.redeemUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ claim: claim.claim, mode: 'browser' })
  });
  const redeem = await redeemRes.json();
  if (!redeemRes.ok || redeem.code !== 'ok') return { stage: 'redeem', status: redeemRes.status, body: redeem };
  return { stage: 'ok', info, claim, redeem };
})()`);

if (exchange?.stage !== "ok") {
  console.error("Playback exchange failed:", JSON.stringify(exchange, null, 2).slice(0, 3000));
  ws.close();
  process.exit(1);
}

const playlist = new URL(exchange.redeem.url);
const session = {
  slug,
  kind: wantedType,
  playType,
  contentId,
  title: exchange.claim.title,
  videoId: exchange.redeem.videoId,
  playlistUrl: exchange.redeem.url,
  token: playlist.searchParams.get("t"),
  expiresAt: exchange.redeem.expiresAt,
  claimExpiresAt: exchange.claim.claimExpiresAt,
  renewalToken: exchange.claim.renewalToken,
  subtitles: exchange.redeem.subtitles ?? [],
  ...(episodeMeta ?? {}),
  savedAt: new Date().toISOString()
};

const sessionsFile = path.join(ROOT, "data", "playback_sessions.json");
let store = {};
try {
  store = JSON.parse(fs.readFileSync(sessionsFile, "utf8"));
} catch {
  try {
    const legacy = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "playback_session.json"), "utf8"));
    if (legacy?.slug) store[legacy.slug] = legacy;
  } catch {
    store = {};
  }
}
store[slug] = session;
fs.mkdirSync(path.dirname(sessionsFile), { recursive: true });
const tempFile = `${sessionsFile}.${process.pid}.tmp`;
fs.writeFileSync(tempFile, JSON.stringify(store, null, 2));
fs.renameSync(tempFile, sessionsFile);
ws.close();
console.log(`Saved data/playback_sessions.json["${slug}"] (expires ${new Date(session.expiresAt * 1000).toISOString()})`);
console.log(`Subtitles: ${session.subtitles.map((item) => item.lang).join(", ") || "none"}`);
