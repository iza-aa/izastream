"use client";

export interface StoredMediaItem {
  id: string;
  slug: string;
  contentType: "movie" | "tv_series";
  title: string;
  posterPath?: string | null;
  backdropPath?: string | null;
  voteAverage?: number | string | null;
  releaseDate?: string | null;
  firstAirDate?: string | null;
  savedAt: number;
}

export interface WatchProgressItem {
  slug: string;
  contentType: "movie" | "tv_series";
  title: string;
  posterPath?: string | null;
  backdropPath?: string | null;
  currentTime: number;
  duration: number;
  percent: number;
  updatedAt: number;
  episodeId?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  episodeName?: string;
}

const WATCHLIST_KEY = "izastream_watchlist";
const PROGRESS_KEY = "izastream_watch_progress";
const FAVOURITES_KEY = "izastream_favourites";

function safeGet<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeSet(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event("izastream_storage_updated"));
  } catch {
    // quota exceeded fallback
  }
}

export function getLocalWatchlist(): StoredMediaItem[] {
  return safeGet<StoredMediaItem[]>(WATCHLIST_KEY, []);
}

export function isInWatchlist(slug: string): boolean {
  return getLocalWatchlist().some((item) => item.slug === slug);
}

export function toggleWatchlist(item: StoredMediaItem): boolean {
  const current = getLocalWatchlist();
  const exists = current.some((i) => i.slug === item.slug);
  let updated: StoredMediaItem[];
  if (exists) {
    updated = current.filter((i) => i.slug !== item.slug);
  } else {
    updated = [{ ...item, savedAt: Date.now() }, ...current];
  }
  safeSet(WATCHLIST_KEY, updated);
  return !exists;
}

export function getLocalProgressList(): WatchProgressItem[] {
  return safeGet<WatchProgressItem[]>(PROGRESS_KEY, []);
}

export function getProgressFor(slug: string, episodeId?: string): WatchProgressItem | undefined {
  const list = getLocalProgressList();
  if (episodeId) {
    return list.find((p) => p.slug === slug && p.episodeId === episodeId);
  }
  return list.find((p) => p.slug === slug);
}

export function saveWatchProgress(item: Omit<WatchProgressItem, "updatedAt" | "percent">) {
  if (!item.duration || item.duration < 10) return;
  const percent = Math.min(100, Math.round((item.currentTime / item.duration) * 100));
  const fullItem: WatchProgressItem = {
    ...item,
    percent,
    updatedAt: Date.now()
  };
  const current = getLocalProgressList();
  const filtered = current.filter((i) => !(i.slug === item.slug && (item.episodeId ? i.episodeId === item.episodeId : true)));
  // If finished (>95%), don't clutter continue watching
  if (percent >= 95) {
    safeSet(PROGRESS_KEY, filtered);
    return;
  }
  safeSet(PROGRESS_KEY, [fullItem, ...filtered].slice(0, 30));
}
