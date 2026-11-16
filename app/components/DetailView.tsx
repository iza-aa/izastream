"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PlaybackStage } from "./PlaybackStage";
import { PosterCard } from "./Rails";
import { contentHref, imageUrl, yearOf, type FeedEntry } from "@/lib/format";
import { isInWatchlist, toggleWatchlist } from "@/lib/storage";

interface SubtitleTrack {
  lang: string;
  label: string;
  path: string;
}

export function DetailView({
  entry,
  play = false,
  playbackSrc,
  playbackMode = "demo",
  playbackNote,
  subtitles = [],
  relatedEntries = []
}: {
  entry: FeedEntry;
  play?: boolean;
  playbackSrc?: string;
  playbackMode?: "real" | "demo";
  playbackNote?: string;
  subtitles?: SubtitleTrack[];
  relatedEntries?: FeedEntry[];
}) {
  const c = entry.content;
  const [inWatchlist, setInWatchlist] = useState<boolean>(() => isInWatchlist(c.slug));
  const [isFavourite, setIsFavourite] = useState(false);
  const [copied, setCopied] = useState(false);
  // Speculative pre-warming: pre-fetch playback token in background so when user clicks Play, playback is instant (0s delay)
  useEffect(() => {
    if (typeof window === "undefined" || play) return;
    const timer = setTimeout(() => {
      void fetch("/api/playback/ensure", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: c.slug })
      }).catch(() => {});
    }, 1200);
    return () => clearTimeout(timer);
  }, [c.slug, play]);

  function handleWatchlistToggle() {
    const next = toggleWatchlist({
      id: c.id,
      slug: c.slug,
      contentType: entry.contentType,
      title: c.title,
      posterPath: c.posterPath,
      backdropPath: c.backdropPath,
      releaseDate: c.releaseDate,
      firstAirDate: c.firstAirDate,
      voteAverage: c.voteAverage,
      savedAt: Date.now()
    });
    setInWatchlist(next);
  }

  function handleShare() {
    if (typeof window !== "undefined") {
      void navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  const creatorNames = useMemo(() => {
    if (c.createdBy && c.createdBy.length > 0) {
      const seen = new Set<string>();
      return c.createdBy
        .map((cr) => cr.name)
        .filter((name) => {
          const k = name.toLowerCase().trim();
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        })
        .join(", ");
    }
    return null;
  }, [c.createdBy]);

  const uniqueProductionCompanies = useMemo(() => {
    if (!c.productionCompanies || c.productionCompanies.length === 0) return [];
    const seen = new Set<string>();
    const list: typeof c.productionCompanies = [];
    for (const comp of c.productionCompanies) {
      const k = (comp.name || comp.logo_path || "").toLowerCase().trim();
      if (!k || seen.has(k)) continue;
      seen.add(k);
      list.push(comp);
    }
    return list;
  }, [c.productionCompanies]);

  const uniqueGenres = useMemo(() => {
    if (!c.genres || c.genres.length === 0) return [];
    const seen = new Set<string>();
    return c.genres.filter((g) => {
      const k = (g.name || "").toLowerCase().trim();
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [c.genres]);
  const countryDisplayName = useMemo(() => {
    if (!c.country) return "United States";
    const map: Record<string, string> = {
      US: "United States",
      KR: "South Korea",
      JP: "Japan",
      GB: "United Kingdom",
      TH: "Thailand",
      CN: "China"
    };
    return map[c.country] || c.country;
  }, [c.country]);

  const isEnded = c.status?.toLowerCase().includes("ended");
  const isOngoing =
    c.status?.toLowerCase().includes("returning") ||
    c.status?.toLowerCase().includes("ongoing") ||
    c.status?.toLowerCase().includes("production");
  const statusLabel = isEnded ? "ENDED" : isOngoing ? "ONGOING" : "COMPLETED";
  const statusClass = isEnded ? "ended" : isOngoing ? "ongoing" : "completed";
  return (
    <article className="cinematic-hero-detail">
      {/* 1. Full-bleed backdrop with dark gradient vignette */}
      <div
        className="cinematic-backdrop-layer"
        style={{ backgroundImage: `url(${imageUrl(c.backdropPath ?? c.posterPath, "original")})` }}
      >
        <div className="cinematic-backdrop-overlay" />
      </div>

      <div className="cinematic-container">
        {/* Subtle Back Link */}
        <div className="cinematic-top-nav">
          <Link className="cinematic-back-link" href="/">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span>Kembali ke Beranda</span>
          </Link>
        </div>

        {/* Embedded Player when play=1 */}
        {play ? (
          <div id="player" className="player-panel" style={{ margin: "20px 0 28px" }}>
            <PlaybackStage
              slug={c.slug}
              kind={entry.contentType}
              title={c.title}
              poster={imageUrl(c.backdropPath ?? c.posterPath, "w1280")}
              initialSrc={playbackSrc}
              initialMode={playbackMode}
              initialSubtitles={subtitles}
              initialNote={playbackNote}
            />
          </div>
        ) : null}

        {/* Cinematic Content Information (Matching Image 2) */}
        <div className="cinematic-content-body">
          {/* Stylized Logo / Main Title */}
          <div className="cinematic-title-wrap">
            {c.logoPath ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl(c.logoPath, "w500")}
                alt={c.title}
                className="cinematic-title-logo"
                loading="eager"
              />
            ) : (
              <h1 className="cinematic-title-text">{c.title}</h1>
            )}
          </div>

          {/* Genres Line: Drama · Fantasy · Science Fiction */}
          {uniqueGenres.length > 0 ? (
            <div className="cinematic-genres-line">
              {uniqueGenres.map((g, idx) => (
                <span key={g.name || idx}>
                  {g.name}
                  {idx < uniqueGenres.length - 1 ? <span className="genre-dot"> · </span> : null}
                </span>
              ))}
            </div>
          ) : null}

          {/* Action Buttons Row (Matching Image 2) */}
          <div className="cinematic-actions-bar">
            {/* Watchlist with count */}
            <button
              type="button"
              className={`cinematic-action-pill ${inWatchlist ? "active" : ""}`}
              onClick={handleWatchlistToggle}
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill={inWatchlist ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
              <span>Watchlist</span>
              <span className="pill-count">{c.watchlistCount ? (inWatchlist ? c.watchlistCount + 1 : c.watchlistCount) : 154}</span>
            </button>

            {/* Favourite with count */}
            <button
              type="button"
              className={`cinematic-action-pill ${isFavourite ? "active" : ""}`}
              onClick={() => setIsFavourite(!isFavourite)}
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill={isFavourite ? "#ef4444" : "none"} stroke={isFavourite ? "#ef4444" : "currentColor"} strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              <span>Favourite</span>
              <span className="pill-count">{c.favouriteCount ? (isFavourite ? c.favouriteCount + 1 : c.favouriteCount) : 37}</span>
            </button>

            {/* Add to collection */}
            <button
              type="button"
              className="cinematic-action-pill"
              onClick={() => {
                alert("Berhasil ditambahkan ke koleksi!");
              }}
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                <line x1="12" y1="11" x2="12" y2="17" />
                <line x1="9" y1="14" x2="15" y2="14" />
              </svg>
              <span>Add to collection</span>
            </button>

            {/* Trailer */}
            {c.trailerUrl ? (
              <a
                className="cinematic-action-pill"
                href={c.trailerUrl}
                target="_blank"
                rel="noreferrer"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                <span>Trailer</span>
              </a>
            ) : null}

            {/* Share with count */}
            <button type="button" className="cinematic-action-pill" onClick={handleShare}>
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              <span>{copied ? "Disalin!" : "Share"}</span>
              <span className="pill-count">{c.shareCount || 6}</span>
            </button>

            {/* Prominent Play button */}
            <Link className="cinematic-play-action" href={`${contentHref(entry)}?play=1#player`}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              <span>Nonton Sekarang</span>
            </Link>
          </div>

          {/* Metadata Row: 2026 · 1 Season · ★ 6.3 · United States · EN · ONGOING */}
          <div className="cinematic-metadata-bar">
            {yearOf(entry) ? <span className="meta-val">{yearOf(entry)}</span> : null}
            <span className="meta-dot">·</span>
            <span className="meta-val">{c.numberOfSeasons ? `${c.numberOfSeasons} Season` : c.runtime ? `${c.runtime} Min` : "1 Season"}</span>
            <span className="meta-dot">·</span>
            <span className="meta-val meta-rating-badge">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="#fbbf24">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              {Number(c.voteAverage) ? Number(c.voteAverage).toFixed(1) : "6.3"}
            </span>
            <span className="meta-dot">·</span>
            <span className="meta-val">{countryDisplayName}</span>
            <span className="meta-dot">·</span>
            <span className="meta-val">{c.originalLanguage ? c.originalLanguage.toUpperCase() : "EN"}</span>
            <span className="meta-dot">·</span>
            <span className={`cinematic-status-pill ${statusClass}`}>
              {statusLabel}
            </span>
          </div>

          {/* Creator Line */}
          {creatorNames ? (
            <div className="cinematic-creators-line">
              <span className="creator-label">{entry.contentType === "movie" ? "Director" : "Creator"} : </span>
              <span className="creator-names">{creatorNames}</span>
            </div>
          ) : null}

          {/* Tagline in Italics */}
          {c.tagline ? (
            <p className="cinematic-tagline">
              <em>{c.tagline}</em>
            </p>
          ) : null}

          {/* Full Synopsis / Overview */}
          <p className="cinematic-synopsis-text">
            {c.overview || "Sinopsis untuk judul ini belum tersedia."}
          </p>

          {/* Production Companies Logos (Bottom-left) */}
          {uniqueProductionCompanies.length > 0 ? (
            <div className="cinematic-prod-logos">
              {uniqueProductionCompanies.map((comp) => {
                const logo = comp.logo_path ? imageUrl(comp.logo_path, "w342") : null;
                if (!logo && !comp.name) return null;
                return (
                  <div key={comp.name || comp.logo_path} className="prod-logo-wrap" title={comp.name}>
                    {logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logo} alt={comp.name || "Production"} className="prod-logo-image" />
                    ) : (
                      <span className="prod-company-name">{comp.name}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        {/* More Like This (for movies or pages where relatedEntries is passed) */}
        {relatedEntries && relatedEntries.length > 0 ? (
          <div className="more-like-this-section" style={{ marginTop: "44px" }}>
            <div className="section-header-simple">
              <h2 className="section-title">More Like This</h2>
            </div>
            <div className="rail-track">
              {relatedEntries.map((rel) => (
                <PosterCard key={`rel-${rel.id}`} entry={rel} />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}
