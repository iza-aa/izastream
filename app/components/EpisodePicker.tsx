"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { imageUrl } from "@/lib/format";

interface CastMember {
  id: string;
  name: string;
  character?: string;
  profilePath?: string | null;
  order?: number;
}

interface Episode {
  id: string;
  seasonNumber: number;
  episodeNumber: number;
  name: string;
  overview?: string;
  runtime?: number | null;
  stillPath?: string | null;
  airDate?: string | null;
  hasVideo?: boolean;
}

interface Season {
  id: string;
  seasonNumber: number;
  name?: string;
  episodeCount?: number | null;
}

interface SeriesMeta {
  slug: string;
  title: string;
  backdropPath?: string | null;
  posterPath?: string | null;
  seasons: Season[];
  episodes: Episode[];
  cast?: CastMember[];
}

function formatAirDate(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const day = d.getDate();
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const month = months[d.getMonth()];
    const yr = String(d.getFullYear()).slice(-2);
    return `${day} ${month} ${yr}`;
  } catch {
    return "";
  }
}

export function EpisodePicker({
  slug,
  activeEpisodeId,
  backdropFallback
}: {
  slug: string;
  activeEpisodeId?: string;
  backdropFallback?: string | null;
}) {
  const [meta, setMeta] = useState<SeriesMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSeason, setActiveSeason] = useState<number>(1);
  const [sortOrder, setSortOrder] = useState<"oldest" | "newest">("oldest");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(`/api/series/${encodeURIComponent(slug)}/episodes`);
        if (!response.ok) throw new Error(`Status ${response.status}`);
        const data = (await response.json()) as SeriesMeta;
        if (cancelled) return;
        setMeta(data);
        if (data.seasons?.length) {
          if (activeEpisodeId) {
            const found = data.episodes?.find((ep) => ep.id === activeEpisodeId);
            if (found) {
              setActiveSeason(found.seasonNumber);
              setLoading(false);
              return;
            }
          }
          setActiveSeason(data.seasons[0].seasonNumber);
        }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, activeEpisodeId]);

  const seasons = useMemo(() => meta?.seasons ?? [], [meta]);

  const currentEpisodes = useMemo(() => {
    if (!meta?.episodes) return [];
    const list = meta.episodes.filter((ep) => ep.seasonNumber === activeSeason);
    return list.sort((a, b) => {
      return sortOrder === "oldest"
        ? a.episodeNumber - b.episodeNumber
        : b.episodeNumber - a.episodeNumber;
    });
  }, [meta, activeSeason, sortOrder]);

  if (loading) {
    return (
      <div className="episodes-section">
        <div className="episodes-header">
          <h2 className="section-title">Episodes</h2>
          <span className="muted small">Memuat episode...</span>
        </div>
        <div className="episodes-rail-skeleton">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="episode-landscape-skeleton" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !meta || !meta.episodes?.length) {
    return null;
  }

  return (
    <div className="series-media-sections">
      {/* 1. Episodes Section matching Image 2 */}
      <section className="episodes-section">
        <div className="episodes-header">
          <div className="episodes-header-left">
            <h2 className="section-title">Episodes</h2>
            {seasons.length > 1 ? (
              <div className="season-pills">
                {seasons.map((season) => (
                  <button
                    key={season.seasonNumber}
                    type="button"
                    className={`season-pill ${activeSeason === season.seasonNumber ? "active" : ""}`}
                    onClick={() => setActiveSeason(season.seasonNumber)}
                  >
                    Season {season.seasonNumber} {season.episodeCount ? `(${season.episodeCount})` : ""}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="episodes-header-right">
            <button
              type="button"
              className="sort-toggle-btn"
              onClick={() => setSortOrder(sortOrder === "oldest" ? "newest" : "oldest")}
              title="Urutkan Episode"
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 15l5 5 5-5M7 9l5-5 5 5" />
              </svg>
              <span>{sortOrder === "oldest" ? "Oldest" : "Newest"}</span>
            </button>
          </div>
        </div>

        {/* Horizontal Rail of 16:9 Landscape Episode Cards */}
        <div className="episodes-track">
          {currentEpisodes.map((ep) => {
            const isActive = activeEpisodeId === ep.id;
            const sNum = String(ep.seasonNumber || 1).padStart(2, "0");
            const eNum = String(ep.episodeNumber || 1).padStart(2, "0");
            const badgeCode = `S${sNum}E${eNum}`;
            const airDate = formatAirDate(ep.airDate);
            const runtime = ep.runtime ? `${ep.runtime}m` : null;
            const thumb = ep.stillPath
              ? imageUrl(ep.stillPath, "w500")
              : backdropFallback
                ? imageUrl(backdropFallback, "w500")
                : meta.backdropPath
                  ? imageUrl(meta.backdropPath, "w500")
                  : null;

            return (
              <Link
                key={ep.id}
                href={`/watch/series/${slug}?episode=${ep.id}&season=${ep.seasonNumber}&ep=${ep.episodeNumber}`}
                className={`episode-landscape-card ${isActive ? "active-episode" : ""}`}
                onMouseEnter={() => {
                  if (typeof window !== "undefined") {
                    void fetch("/api/playback/ensure", {
                      method: "POST",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({ slug, episodeId: ep.id })
                    }).catch(() => {});
                  }
                }}
              >
                <div className="episode-thumb-container">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt={ep.name || `Episode ${ep.episodeNumber}`} loading="lazy" />
                  ) : (
                    <div className="episode-thumb-placeholder">
                      <span>{badgeCode}</span>
                    </div>
                  )}

                  {/* Top-Left: S01E01 Badge */}
                  <span className="badge-episode-code">{badgeCode}</span>

                  {/* Top-Right: Air Date Badge */}
                  {airDate ? <span className="badge-air-date">{airDate}</span> : null}

                  {/* Bottom-Right: Duration Badge */}
                  {runtime ? <span className="badge-runtime">{runtime}</span> : null}

                  {/* Play overlay on hover */}
                  <div className="episode-play-overlay">
                    <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                      <polygon points="6 4 20 12 6 20 6 4" />
                    </svg>
                  </div>
                </div>

                <div className="episode-details">
                  <h3 className="episode-title-heading" title={ep.name}>
                    Episode {ep.episodeNumber}
                    {ep.name && ep.name !== `Episode ${ep.episodeNumber}` ? ` · ${ep.name}` : ""}
                  </h3>
                  <p className="episode-synopsis">
                    {ep.overview || "Sinopsis untuk episode ini belum tersedia."}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 2. Cast Section matching Image 2 */}
      {meta.cast && meta.cast.length > 0 ? (
        <section className="cast-section">
          <div className="cast-header">
            <h2 className="section-title">Cast</h2>
          </div>
          <div className="cast-rail">
            {meta.cast.map((actor) => (
              <div key={actor.id || actor.name} className="cast-item">
                <div className="cast-avatar-circle">
                  {actor.profilePath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageUrl(actor.profilePath, "w342")}
                      alt={actor.name}
                      loading="lazy"
                    />
                  ) : (
                    <div className="cast-avatar-initials">
                      {actor.name.slice(0, 1)}
                    </div>
                  )}
                </div>
                <div className="cast-actor-name" title={actor.name}>
                  {actor.name}
                </div>
                <div className="cast-character-role" title={actor.character || ""}>
                  {actor.character || "—"}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
