export type ContentKind = "movie" | "tv_series";

export interface Genre {
  id?: string;
  name: string;
  slug?: string;
}

export interface ContentItem {
  id: string;
  tmdbId?: number;
  imdbId?: string | null;
  title: string;
  slug: string;
  originalTitle?: string;
  overview?: string;
  tagline?: string | null;
  posterPath?: string | null;
  backdropPath?: string | null;
  logoPath?: string | null;
  firstAirDate?: string | null;
  releaseDate?: string | null;
  numberOfSeasons?: number | null;
  numberOfEpisodes?: number | null;
  voteAverage?: number | string | null;
  popularity?: number | null;
  originalLanguage?: string | null;
  country?: string | null;
  status?: string | null;
  runtime?: number | null;
  networks?: Array<{ name?: string }>;
  productionCompanies?: Array<{ name?: string; logo_path?: string | null }>;
  createdBy?: Array<{ id?: number | string; name: string }>;
  watchlistCount?: number | null;
  favouriteCount?: number | null;
  shareCount?: number | null;
  genres?: Genre[];
  trailerUrl?: string | null;
  stillPath?: string | null;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  seriesTitle?: string | null;
  seriesSlug?: string | null;
  commentCount?: number | null;
}

export interface FeedEntry {
  id: string;
  contentType: ContentKind;
  content: ContentItem;
  title?: string;
  description?: string | null;
  backdropOverride?: string | null;
}

export interface HomeSection {
  id?: string;
  type: string;
  title: string;
  slug?: string;
  description?: string | null;
  sortOrder?: number;
  showAds?: boolean;
  adIds?: string[];
  data: FeedEntry[];
  trendingPeriod?: string;
  trendingCountryName?: string;
}

export interface Homepage {
  above: HomeSection[];
  below: HomeSection[];
  ads: Array<{ id: string; name?: string; imageUrl?: string; targetUrl?: string }>;
  promoModals: Array<Record<string, unknown>>;
}

export function imageUrl(
  filePath: string | null | undefined,
  size: "w92" | "w342" | "w500" | "w780" | "w1280" | "original" = "w500"
): string {
  if (!filePath) return "";
  if (/^https?:\/\//.test(filePath)) return filePath;
  return `https://image.tmdb.org/t/p/${size}${filePath}`;
}

export function contentHref(entry: FeedEntry): string {
  return `/${entry.contentType === "movie" ? "movie" : "series"}/${entry.content.slug}`;
}

export function yearOf(entry: FeedEntry): string {
  const date = entry.content.releaseDate ?? entry.content.firstAirDate;
  return date ? String(date).slice(0, 4) : "";
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
