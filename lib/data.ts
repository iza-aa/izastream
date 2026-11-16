import fs from "node:fs";
import path from "node:path";
import {
  type ContentItem,
  type ContentKind,
  type FeedEntry,
  type Genre,
  type HomeSection,
  type Homepage
} from "./format";

export * from "./format";

let cached: Homepage | null = null;

function normalizeEntry(raw: Record<string, unknown>): FeedEntry {
  if (raw.content && typeof raw.content === "object") return raw as unknown as FeedEntry;
  const isMovie = raw.contentType === "movie" || (!raw.numberOfSeasons && Boolean(raw.releaseDate));
  const contentType: ContentKind = isMovie ? "movie" : "tv_series";
  const seriesObj = typeof raw.series === "object" && raw.series !== null ? (raw.series as Record<string, unknown>) : null;
  const seasonObj = typeof raw.season === "object" && raw.season !== null ? (raw.season as Record<string, unknown>) : null;
  const seriesSlug = typeof seriesObj?.slug === "string" ? seriesObj.slug : "";
  const seasonNum = typeof seasonObj?.seasonNumber === "number" ? seasonObj.seasonNumber : 1;
  const episodeNum = typeof raw.episodeNumber === "number" ? raw.episodeNumber : 1;
  const fallbackSlug = seriesSlug ? `${seriesSlug}-s${seasonNum}-e${episodeNum}` : String(raw.id ?? "item");
  const slug = typeof raw.slug === "string" && raw.slug ? raw.slug : fallbackSlug;
  const title = String(raw.title || raw.name || "Untitled");

  return {
    id: String(raw.id ?? slug),
    contentType,
    title,
    description: typeof raw.overview === "string" ? raw.overview : null,
    content: {
      id: String(raw.id ?? slug),
      title,
      slug,
      originalTitle: typeof raw.originalTitle === "string" ? raw.originalTitle : undefined,
      overview: typeof raw.overview === "string" ? raw.overview : undefined,
      stillPath: typeof raw.stillPath === "string" ? raw.stillPath : null,
      seasonNumber: seasonNum,
      episodeNumber: episodeNum,
      seriesTitle: typeof seriesObj?.title === "string" ? seriesObj.title : null,
      seriesSlug: seriesSlug || null,
      commentCount: typeof raw.commentCount === "number" ? raw.commentCount : 0,
      posterPath:
        typeof raw.posterPath === "string"
          ? raw.posterPath
          : typeof raw.stillPath === "string"
            ? raw.stillPath
            : null,
      backdropPath:
        typeof raw.backdropPath === "string"
          ? raw.backdropPath
          : typeof raw.stillPath === "string"
            ? raw.stillPath
            : null,
      logoPath: typeof raw.logoPath === "string" ? raw.logoPath : null,
      voteAverage:
        typeof raw.voteAverage === "number" || typeof raw.voteAverage === "string"
          ? raw.voteAverage
          : null,
      firstAirDate:
        typeof raw.firstAirDate === "string"
          ? raw.firstAirDate
          : typeof seriesObj?.firstAirDate === "string"
            ? seriesObj.firstAirDate
            : null,
      releaseDate: typeof raw.releaseDate === "string" ? raw.releaseDate : null,
      numberOfSeasons: typeof raw.numberOfSeasons === "number" ? raw.numberOfSeasons : null,
      numberOfEpisodes: typeof raw.numberOfEpisodes === "number" ? raw.numberOfEpisodes : null,
      country: typeof raw.country === "string" ? raw.country : null,
      originalLanguage: typeof raw.originalLanguage === "string" ? raw.originalLanguage : null,
      status: typeof raw.status === "string" ? raw.status : null,
      tagline: typeof raw.tagline === "string" ? raw.tagline : null,
      trailerUrl: typeof raw.trailerUrl === "string" ? raw.trailerUrl : null,
      watchlistCount: typeof raw.watchlistCount === "number" ? raw.watchlistCount : null,
      favouriteCount: typeof raw.favouriteCount === "number" ? raw.favouriteCount : null,
      shareCount: typeof raw.shareCount === "number" ? raw.shareCount : null,
      createdBy: Array.isArray(raw.createdBy) ? (raw.createdBy as Array<{ name: string }>) : undefined,
      productionCompanies: Array.isArray(raw.productionCompanies) ? (raw.productionCompanies as Array<{ name?: string; logo_path?: string | null }>) : [],
      genres: Array.isArray(raw.genres) ? (raw.genres as Genre[]) : [],
      networks: Array.isArray(raw.networks) ? (raw.networks as Array<{ name?: string }>) : []
    }
  };
}

export function getHomepage(): Homepage {
  if (cached) return cached;
  const file = path.join(process.cwd(), "data", "homepage.json");
  const raw = JSON.parse(fs.readFileSync(file, "utf8")) as Homepage;
  const mapSection = (sec: HomeSection) => ({
    ...sec,
    data: (sec.data || [])
      .map((e) => normalizeEntry(e as unknown as Record<string, unknown>))
      .filter((e) => Boolean(e.content?.slug))
  });
  cached = {
    ...raw,
    above: (raw.above || []).map(mapSection),
    below: (raw.below || []).map(mapSection)
  };
  return cached;
}

export function getSections(): HomeSection[] {
  const home = getHomepage();
  return [...home.above, ...home.below].filter((section) => (section.data?.length ?? 0) > 0);
}

export function getFeatured(): FeedEntry | undefined {
  return getHomepage().above.find((section) => section.type === "featured")?.data?.[0];
}

export function getFeaturedItems(): FeedEntry[] {
  return getHomepage().above.find((section) => section.type === "featured")?.data ?? [];
}
export function getCatalog(): FeedEntry[] {
  const seen = new Map<string, FeedEntry>();
  for (const section of getSections()) {
    for (const entry of section.data) {
      if (entry.content?.slug && !seen.has(entry.content.slug)) seen.set(entry.content.slug, entry);
      const seriesSlug = entry.content?.seriesSlug;
      const seriesTitle = entry.content?.seriesTitle;
      if (seriesSlug && seriesTitle && !seen.has(seriesSlug)) {
        seen.set(seriesSlug, {
          id: seriesSlug,
          contentType: "tv_series",
          title: seriesTitle,
          content: {
            id: seriesSlug,
            title: seriesTitle,
            slug: seriesSlug,
            posterPath: entry.content.posterPath,
            backdropPath: entry.content.backdropPath,
            firstAirDate: entry.content.firstAirDate,
            genres: entry.content.genres
          }
        });
      }
    }
  }

  try {
    const moviesFile = path.join(process.cwd(), "data", "catalog_movies.json");
    if (fs.existsSync(moviesFile)) {
      const extraMovies = JSON.parse(fs.readFileSync(moviesFile, "utf8")) as Record<string, unknown>[];
      for (const raw of extraMovies) {
        const entry = normalizeEntry({ ...raw, contentType: "movie" });
        if (entry.content?.slug && !seen.has(entry.content.slug)) {
          seen.set(entry.content.slug, entry);
        }
      }
    }
  } catch {}

  try {
    const seriesFile = path.join(process.cwd(), "data", "catalog_series.json");
    if (fs.existsSync(seriesFile)) {
      const extraSeries = JSON.parse(fs.readFileSync(seriesFile, "utf8")) as Record<string, unknown>[];
      for (const raw of extraSeries) {
        const entry = normalizeEntry({ ...raw, contentType: "tv_series" });
        if (entry.content?.slug && !seen.has(entry.content.slug)) {
          seen.set(entry.content.slug, entry);
        }
      }
    }
  } catch {}
  try {
    const netFile = path.join(process.cwd(), "data", "networks.json");
    if (fs.existsSync(netFile)) {
      const nets = JSON.parse(fs.readFileSync(netFile, "utf8")) as Record<string, { data?: Record<string, unknown>[] }>;
      for (const [, obj] of Object.entries(nets)) {
        for (const raw of obj.data ?? []) {
          const kind: ContentKind =
            raw.contentType === "movie" || (!raw.firstAirDate && Boolean(raw.releaseDate))
              ? "movie"
              : "tv_series";
          const entry = normalizeEntry({ ...raw, contentType: kind });
          if (entry.content?.slug && !seen.has(entry.content.slug)) {
            seen.set(entry.content.slug, entry);
          }
        }
      }
    }
  } catch {}

  try {
    const sDir = path.join(process.cwd(), "data", "series");
    if (fs.existsSync(sDir)) {
      for (const f of fs.readdirSync(sDir)) {
        if (f.endsWith(".json")) {
          const m = JSON.parse(fs.readFileSync(path.join(sDir, f), "utf8"));
          if (m.slug) {
            const prev = seen.get(m.slug);
            const prevContent = prev?.content ?? {};
            seen.set(m.slug, normalizeEntry({ ...prevContent, ...m, contentType: "tv_series" }));
          }
        }
      }
    }
  } catch {}

  try {
    const mDir = path.join(process.cwd(), "data", "movies");
    if (fs.existsSync(mDir)) {
      for (const f of fs.readdirSync(mDir)) {
        if (f.endsWith(".json")) {
          const m = JSON.parse(fs.readFileSync(path.join(mDir, f), "utf8"));
          if (m.slug) {
            const prev = seen.get(m.slug);
            const prevContent = prev?.content ?? {};
            seen.set(m.slug, normalizeEntry({ ...prevContent, ...m, contentType: "movie" }));
          }
        }
      }
    }
  } catch {}

  return [...seen.values()];
}

export function findContent(slug: string): FeedEntry | undefined {
  return getCatalog().find((entry) => entry.content.slug === slug);
}

export async function findOrFetchContent(slug: string, kind?: ContentKind): Promise<FeedEntry | undefined> {
  const existing = findContent(slug);
  const hasFullDetails = Boolean(existing && existing.content?.overview && existing.content.overview.trim().length > 0);
  if (existing && hasFullDetails) {
    if (!kind || existing.contentType === kind) return existing;
  }
  try {
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const execFileAsync = promisify(execFile);
    const script = path.join(process.cwd(), "scripts", "refresh-playback.mjs");
    const firstTarget = kind === "movie" ? "movie" : "series";
    await execFileAsync(process.execPath, [script, slug, firstTarget, "--episodes-only"], {
      cwd: process.cwd(),
      timeout: 30000,
      env: process.env
    });

    let found = findContent(slug);
    if (found) return found;

    const secondTarget = firstTarget === "movie" ? "series" : "movie";
    await execFileAsync(process.execPath, [script, slug, secondTarget, "--episodes-only"], {
      cwd: process.cwd(),
      timeout: 30000,
      env: process.env
    });
  } catch {}

  return findContent(slug);
}
export function findByKind(kind: ContentKind): FeedEntry[] {
  return getCatalog().filter((entry) => entry.contentType === kind);
}

export function searchContent(query: string): FeedEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return getCatalog().filter((entry) => {
    const c = entry.content;
    return [c.title, c.originalTitle, c.overview]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(q));
  });
}

export function uniqueGenres(): string[] {
  const names = new Set<string>();
  for (const entry of getCatalog()) {
    for (const genre of entry.content.genres ?? []) if (genre.name) names.add(genre.name);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

export function uniqueYears(): string[] {
  const years = new Set<string>();
  for (const entry of getCatalog()) {
    const date = entry.content.releaseDate ?? entry.content.firstAirDate;
    if (date) years.add(String(date).slice(0, 4));
  }
  return [...years].sort((a, b) => b.localeCompare(a));
}

export function uniqueCountries(): string[] {
  const values = new Set<string>();
  for (const entry of getCatalog()) if (entry.content.country) values.add(entry.content.country);
  return [...values].sort((a, b) => a.localeCompare(b));
}

export function findByGenreSlug(slug: string): FeedEntry[] {
  return getCatalog().filter((entry) =>
    (entry.content.genres ?? []).some((genre) => genre.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") === slug)
  );
}
export function findByNetworkSlug(slug: string): FeedEntry[] {
  const norm = slug.toLowerCase().replace(/[^a-z0-9]+/g, "");
  // Check if network key matches in data/networks.json
  const fromJsonSlugs = new Set<string>();
  try {
    const netFile = path.join(process.cwd(), "data", "networks.json");
    if (fs.existsSync(netFile)) {
      const rawNets = JSON.parse(fs.readFileSync(netFile, "utf8")) as Record<string, { data?: Array<{ slug?: string }> }>;
      for (const [k, v] of Object.entries(rawNets)) {
        const kNorm = k.toLowerCase().replace(/[^a-z0-9]+/g, "");
        if (kNorm.includes(norm) || norm.includes(kNorm)) {
          for (const item of v.data || []) {
            if (item.slug) fromJsonSlugs.add(item.slug);
          }
        }
      }
    }
  } catch {}

  return getCatalog().filter((entry) => {
    const c = entry.content;
    if (fromJsonSlugs.has(c.slug)) return true;
    const hasNet = (c.networks ?? []).some((n) => (n.name ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "").includes(norm) || norm.includes((n.name ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "")));
    const hasProd = (c.productionCompanies ?? []).some((p) => (p.name ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "").includes(norm) || norm.includes((p.name ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "")));
    if (hasNet || hasProd) return true;

    if (norm === "netflix" && (c.networks ?? []).some((n) => /netflix/i.test(n.name || ""))) return true;
    if ((norm === "hbo" || norm === "hbomax") && (c.networks ?? []).some((n) => /hbo/i.test(n.name || ""))) return true;
    if (norm.includes("disney") && ((c.networks ?? []).some((n) => /disney/i.test(n.name || "")) || (c.productionCompanies ?? []).some((p) => /disney/i.test(p.name || "")))) return true;
    if ((norm.includes("prime") || norm.includes("amazon")) && ((c.networks ?? []).some((n) => /prime|amazon/i.test(n.name || "")) || (c.productionCompanies ?? []).some((p) => /prime|amazon/i.test(p.name || "")))) return true;
    if (norm.includes("apple") && ((c.networks ?? []).some((n) => /apple/i.test(n.name || "")) || (c.productionCompanies ?? []).some((p) => /apple/i.test(p.name || "")))) return true;
    return false;
  });
}

export function findByCountrySlug(slug: string): FeedEntry[] {
  const s = slug.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const codeMap: Record<string, string[]> = {
    korean: ["kr", "south-korea", "korea-selatan", "korea"],
    "korea-selatan": ["kr", "south-korea", "korean", "korea"],
    kr: ["korean", "korea-selatan", "south-korea"],
    anime: ["jp", "japan", "jepang", "japanese"],
    japanese: ["jp", "japan", "jepang"],
    jepang: ["jp", "japan", "japanese"],
    jp: ["japanese", "jepang", "japan"],
    chinese: ["cn", "china", "tw", "taiwan", "hong-kong", "hk"],
    china: ["cn", "chinese"],
    cn: ["chinese", "china"],
    thai: ["th", "thailand"],
    thailand: ["th", "thai"],
    th: ["thai", "thailand"],
    us: ["united-states", "usa"],
    "united-states": ["us", "usa"]
  };
  const targets = new Set([s, ...(codeMap[s] ?? [])]);

  return getCatalog().filter((entry) => {
    const c = entry.content.country?.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "";
    return targets.has(c);
  });
}
export function findByYear(year: string): FeedEntry[] {
  return getCatalog().filter((entry) => {
    const date = entry.content.releaseDate ?? entry.content.firstAirDate;
    return date ? String(date).slice(0, 4) === year : false;
  });
}

export function getCollectionSections(): HomeSection[] {
  return getSections().filter((section) => section.type === "collection");
}
