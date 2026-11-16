"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { contentHref, imageUrl, yearOf, type FeedEntry } from "@/lib/format";

function getYouTubeId(url?: string | null): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? match[1] : null;
}

function formatDuration(mins?: number | null): string {
  if (!mins) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0) return `${h}j ${m}m`;
  return `${m} menit`;
}

export function HeroCarousel({ items }: { items: FeedEntry[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const previewTimerRef = useRef<NodeJS.Timeout | null>(null);

  const total = items.length;
  const current = items[currentIndex] ?? items[0];

  // Auto-advance slide every 7.5 seconds when not hovered and preview not unmuted
  useEffect(() => {
    if (total <= 1 || isHovered || !isMuted) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % total);
      setShowPreview(false);
    }, 7500);

    return () => clearInterval(interval);
  }, [total, isHovered, isMuted]);

  // Reset preview when slide changes
  useEffect(() => {
    setShowPreview(false);
  }, [currentIndex]);

  if (!current) return null;

  const c = current.content;
  const isMovie = current.contentType === "movie";
  const kindLabel = isMovie ? "Film" : "Serial";
  const trailerId = getYouTubeId(c.trailerUrl);

  const rating = Number(c.voteAverage) ? Number(c.voteAverage).toFixed(1) : "6.4";
  const year = yearOf(current) || "2026";
  const durationOrSeasons = isMovie
    ? formatDuration(c.runtime)
    : c.numberOfSeasons
      ? `${c.numberOfSeasons} Musim`
      : "";

  const genreNames = (c.genres || [])
    .map((g) => g.name)
    .filter(Boolean)
    .slice(0, 3)
    .join(", ");

  const watchUrl = `${contentHref(current)}?play=1#player`;

  return (
    <section
      className="hero-carousel"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label="Sorotan Utama izastream"
    >
      {/* 1. Full-bleed background layer with high-res backdrop image */}
      <div
        key={`backdrop-${current.id || c.slug}`}
        className="hero-carousel-backdrop"
        style={{
          backgroundImage: `url(${imageUrl(c.backdropPath ?? c.posterPath, "w1280")})`
        }}
      />

      {/* 2. Video Preview Layer (Ambient YouTube teaser in background) */}
      {showPreview && trailerId ? (
        <div className="hero-preview-wrapper">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${trailerId}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&loop=1&playlist=${trailerId}&modestbranding=1&rel=0&iv_load_policy=3&disablekb=1&showinfo=0`}
            title={c.title}
            className="hero-preview-iframe"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            tabIndex={-1}
          />
        </div>
      ) : null}

      {/* 3. Cinematic Vignette Gradient Overlay */}
      <div className="hero-carousel-vignette" />

      {/* 4. Left-Aligned Content matching our Typography & Brand */}
      <div className="hero-carousel-content">
        {/* Signature Eyebrow: Sorotan Utama · Film / Serial */}
        <div className="hero-badge-wrap">
          <span className="hero-eyebrow-pill">
            Sorotan Utama · {kindLabel}
          </span>
        </div>

        {/* Tagline in Italics */}
        {c.tagline ? (
          <p className="hero-carousel-tagline">
            <em>“{c.tagline}”</em>
          </p>
        ) : null}

        {/* Title Logo or Typography */}
        <div className="hero-carousel-title-wrap">
          {c.logoPath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl(c.logoPath, "w500")}
              alt={c.title}
              className="hero-carousel-logo"
              loading="eager"
            />
          ) : (
            <h1 className="hero-carousel-heading">{c.title}</h1>
          )}
        </div>

        {/* Metadata Row: ★ 6.4 · 2026 · 114 menit · Mystery, Thriller */}
        <div className="hero-carousel-meta">
          <span className="hero-meta-star">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="#fbbf24">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span>{rating}</span>
          </span>
          <span className="hero-meta-dot">·</span>
          <span>{year}</span>
          {durationOrSeasons ? (
            <>
              <span className="hero-meta-dot">·</span>
              <span>{durationOrSeasons}</span>
            </>
          ) : null}
          {genreNames ? (
            <>
              <span className="hero-meta-dot">·</span>
              <span>{genreNames}</span>
            </>
          ) : null}
          {c.country ? (
            <>
              <span className="hero-meta-dot">·</span>
              <span>{c.country}</span>
            </>
          ) : null}
        </div>

        {/* Overview Paragraph with our typography */}
        <p className="hero-carousel-overview">
          {c.overview || "Sinopsis untuk judul ini belum tersedia."}
        </p>

        {/* Action Buttons with our Signature Palette: Cobalt #0F42C0 & Glass Secondary */}
        <div className="hero-carousel-actions">
          <Link className="hero-primary-btn" href={watchUrl}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            <span>Nonton Sekarang</span>
          </Link>

          {trailerId ? (
            <button
              type="button"
              className={`hero-secondary-btn ${showPreview ? "active" : ""}`}
              onClick={() => setShowPreview(!showPreview)}
              title={showPreview ? "Tutup Cuplikan Video" : "Putar Cuplikan Video"}
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
                <line x1="7" y1="2" x2="7" y2="22" />
                <line x1="17" y1="2" x2="17" y2="22" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <line x1="2" y1="7" x2="7" y2="7" />
                <line x1="2" y1="17" x2="7" y2="17" />
                <line x1="17" y1="17" x2="22" y2="17" />
                <line x1="17" y1="7" x2="22" y2="7" />
              </svg>
              <span>{showPreview ? "Tutup Cuplikan" : "Tonton Cuplikan"}</span>
            </button>
          ) : null}

          <Link className="hero-secondary-btn" href="/collection">
            Jelajahi Koleksi
          </Link>
        </div>

        {/* 5. Carousel Indicators with our signature neon-yellow / sky accent */}
        {total > 1 ? (
          <div className="hero-carousel-indicators" role="tablist" aria-label="Slide Sorotan Utama">
            {items.map((it, idx) => {
              const isActive = idx === currentIndex;
              return (
                <button
                  key={it.content.slug || idx}
                  type="button"
                  className={`hero-indicator ${isActive ? "active" : ""}`}
                  onClick={() => {
                    setCurrentIndex(idx);
                    setShowPreview(false);
                  }}
                  aria-label={`Slide ${idx + 1}: ${it.content.title}`}
                  aria-selected={isActive}
                />
              );
            })}
          </div>
        ) : null}
      </div>

      {/* Floating Sound Toggle Button (Bottom Right) */}
      {showPreview && trailerId ? (
        <div className="hero-floating-sound">
          <button
            type="button"
            className="hero-sound-toggle-btn"
            onClick={() => setIsMuted(!isMuted)}
            title={isMuted ? "Bunyikan Suara Cuplikan" : "Bisukan Suara"}
            aria-label="Kendali Suara Cuplikan"
          >
            {isMuted ? (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            )}
          </button>
        </div>
      ) : null}
    </section>
  );
}
