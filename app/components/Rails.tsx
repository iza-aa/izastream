"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { contentHref, imageUrl, yearOf, type FeedEntry } from "@/lib/format";
import type { WatchProgressItem } from "@/lib/storage";

export function PosterCard({ entry }: { entry: FeedEntry }) {
  const c = entry.content;
  const isMovie = entry.contentType === "movie";
  const kindLabel = isMovie ? "MOVIE" : "TV";
  const seasonBadge = !isMovie ? (c.numberOfSeasons ? `S${c.numberOfSeasons}` : "S1") : null;
  const rating = Number(c.voteAverage);
  const commentCount = typeof c.commentCount === "number" ? c.commentCount : rating > 0 ? Math.max(1, Math.round(rating * 1.5)) : null;
  const year = yearOf(entry);

  return (
    <Link className="poster-card" href={contentHref(entry)}>
      <div className="poster-frame">
        {c.posterPath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl(c.posterPath, "w342")} alt={c.title} loading="lazy" />
        ) : (
          <div className="poster-placeholder">{c.title.slice(0, 1)}</div>
        )}

        {/* Top-Left: TV or MOVIE badge */}
        <span className="poster-badge-kind">{kindLabel}</span>

        {/* Top-Right: S1 / S2 season badge (matching Image 3) */}
        {seasonBadge ? <span className="poster-badge-season">{seasonBadge}</span> : null}

        {/* Bottom-Left: Rating with yellow star */}
        {rating > 0 ? (
          <span className="poster-badge-rating">
            <svg viewBox="0 0 24 24" width="11" height="11" fill="#fbbf24" style={{ marginRight: 2 }}>
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            {rating.toFixed(1)}
          </span>
        ) : null}

        {/* Bottom-Right: Comment icon with count (matching Image 3) */}
        {commentCount ? (
          <span className="poster-badge-comments">
            <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor" style={{ marginRight: 2 }}>
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
            </svg>
            {commentCount}
          </span>
        ) : null}
      </div>
      <div className="poster-title">
        {c.title} {year ? `(${year})` : ""}
      </div>
    </Link>
  );
}

// 16:9 Landscape Episode Card matching Image 4
export function LandscapeEpisodeCard({ entry }: { entry: FeedEntry }) {
  const c = entry.content;
  const seasonNum = c.seasonNumber ?? 1;
  const episodeNum = c.episodeNumber ?? 1;
  const sStr = String(seasonNum).padStart(2, "0");
  const eStr = String(episodeNum).padStart(2, "0");
  const badgeText = `S${sStr} E${eStr}`;
  const seriesTitle = c.seriesTitle || "Serial";
  const year = c.firstAirDate ? String(c.firstAirDate).slice(0, 4) : "";

  const thumbPath = c.stillPath ?? c.backdropPath ?? c.posterPath;
  const thumbUrl = thumbPath ? imageUrl(thumbPath, "w500") : "";

  const watchHref = c.seriesSlug
    ? `/watch/series/${c.seriesSlug}?episode=${entry.id}&season=${seasonNum}&ep=${episodeNum}`
    : `/watch/series/${c.slug}?episode=${entry.id}&season=${seasonNum}&ep=${episodeNum}`;

  return (
    <Link className="landscape-episode-card" href={watchHref}>
      <div className="landscape-frame">
        {thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbUrl} alt={c.title} loading="lazy" />
        ) : (
          <div className="poster-placeholder">{sStr}</div>
        )}
        {/* Top-left Badge matching Image 4: S01 E02 */}
        <span className="landscape-badge-tag">{badgeText}</span>

        {/* Bottom-right speech bubble matching Image 4 */}
        <span className="landscape-comment-badge" title="Komentar">
          <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor" aria-hidden="true">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span>{c.commentCount ?? 0}</span>
        </span>
      </div>

      <div className="landscape-info">
        <div className="landscape-ep-title" title={`${badgeText}: ${c.title}`}>
          {badgeText}: {c.title}
        </div>
        <div className="landscape-series-title">
          {seriesTitle} {year ? `(${year})` : ""}
        </div>
      </div>
    </Link>
  );
}

// Special rail for recently added episodes in 16:9 landscape layout
export function EpisodeRail({ title, entries }: { title: string; entries: FeedEntry[] }) {
  if (!entries.length) return null;
  return (
    <section className="rail">
      <div className="rail-heading-row">
        <div className="rail-title-group">
          <h2>{title}</h2>
        </div>
      </div>
      <div className="episode-rail-track">
        {entries.map((entry) => (
          <LandscapeEpisodeCard key={`ep-${entry.id ?? entry.content.slug}`} entry={entry} />
        ))}
      </div>
    </section>
  );
}

// Interactive Dropdown Rail Switcher matching Image 1 & Image 2
export interface DropdownOption {
  id: string;
  label: string;
  category?: string;
  suffix?: string;
  color?: string;
  href?: string;
}
export function DropdownRail({
  defaultId,
  options,
  allEntries,
  viewAllHref,
  customEntries
}: {
  defaultId: string;
  options: DropdownOption[];
  allEntries: FeedEntry[];
  viewAllHref?: string;
  customEntries?: Record<string, FeedEntry[]>;
}) {
  const [activeId, setActiveId] = useState(defaultId);
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const activeOption = options.find((opt) => opt.id === activeId) ?? options[0];

  const displayEntries =
    customEntries && customEntries[activeId] && customEntries[activeId].length > 0
      ? customEntries[activeId]
      : allEntries.filter((entry) => {
          const c = entry.content;
          switch (activeId) {
            case "disney":
            case "disney-plus":
              return Boolean(
                c.networks?.some((n) => /disney/i.test(n.name || "")) ||
                  (c.productionCompanies || []).some((p) => /disney/i.test(p.name || ""))
              );
            case "netflix":
              return Boolean(
                c.networks?.some((n) => /netflix/i.test(n.name || "")) ||
                  (c.productionCompanies || []).some((p) => /netflix/i.test(p.name || ""))
              );
            case "hbo":
              return Boolean(
                c.networks?.some((n) => /hbo/i.test(n.name || "")) ||
                  (c.productionCompanies || []).some((p) => /hbo/i.test(p.name || ""))
              );
            case "prime":
            case "prime-video":
              return Boolean(
                c.networks?.some((n) => /prime|amazon/i.test(n.name || "")) ||
                  (c.productionCompanies || []).some((p) => /amazon|prime/i.test(p.name || ""))
              );
            case "apple":
            case "apple-tv-plus":
              return Boolean(
                c.networks?.some((n) => /apple/i.test(n.name || "")) ||
                  (c.productionCompanies || []).some((p) => /apple/i.test(p.name || ""))
              );
            case "korean":
              return c.country === "KR";
            case "anime":
              return Boolean(
                (c.genres || []).some((g) => /anim/i.test(g.name)) ||
                  (c.country === "JP" && (c.genres || []).some((g) => /anim/i.test(g.name))) ||
                  (c.country === "JP" && c.originalLanguage === "ja")
              );
            case "chinese":
              return c.country === "CN" || c.country === "TW";
            case "japanese":
              return c.country === "JP" && !Boolean((c.genres || []).some((g) => /anim/i.test(g.name)));
            case "thai":
              return c.country === "TH";
            default:
              return true;
          }
        });

  return (
    <section className="rail">
      <div className="rail-heading-row">
        <div className="rail-title-group">
          <div className="rail-switcher-wrapper" ref={menuRef}>
            <button
              type="button"
              className="rail-switcher-btn"
              onClick={() => setIsOpen((prev) => !prev)}
              aria-expanded={isOpen}
            >
              <span className="switcher-title-wrap">
                {activeOption.category ? (
                  <>
                    <span style={{ color: activeOption.color }}>{activeOption.category}</span>
                    {" "}
                    {activeOption.suffix ? <span className="switcher-suffix">{activeOption.suffix}</span> : null}
                  </>
                ) : (
                  <span style={{ color: activeOption.color }}>{activeOption.label}</span>
                )}
              </span>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="switcher-chevron">
                {isOpen ? (
                  <polyline points="18 15 12 9 6 15" />
                ) : (
                  <polyline points="6 9 12 15 18 9" />
                )}
              </svg>
            </button>

            {isOpen ? (
              <div className="rail-switcher-menu" role="menu">
                {options.map((opt) => {
                  const isSelected = activeId === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      className={`rail-switcher-item ${isSelected ? "active" : ""}`}
                      onClick={() => {
                        setActiveId(opt.id);
                        setIsOpen(false);
                      }}
                    >
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>

        {(activeOption.href || viewAllHref) ? (
          <Link href={activeOption.href || viewAllHref || "/network"} className="rail-view-all">
            <span>Lihat Semua</span>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        ) : null}
      </div>

      <div className="rail-track">
        {displayEntries.map((entry) => (
          <PosterCard key={`${activeId}-${entry.contentType}-${entry.id ?? entry.content.slug}`} entry={entry} />
        ))}
      </div>
    </section>
  );
}

// Standard Horizontal Poster Rail
export function Rail({ title, entries, note }: { title: string; entries: FeedEntry[]; note?: string }) {
  if (!entries.length) return null;
  return (
    <section className="rail">
      <div className="rail-heading-row">
        <div className="rail-title-group">
          <h2>{title}</h2>
          {note ? <span className="muted small">{note}</span> : null}
        </div>
      </div>
      <div className="rail-track">
        {entries.map((entry) => (
          <PosterCard key={`${entry.contentType}-${entry.id ?? entry.content.slug}`} entry={entry} />
        ))}
      </div>
    </section>
  );
}
// Top 10 Card with Giant Outlined Rank Number matching Image 1 & 2
export function Top10Card({ entry, rank }: { entry: FeedEntry; rank: number }) {
  const c = entry.content;
  const isSeries = entry.contentType === "tv_series";
  return (
    <Link href={contentHref(entry)} className="top10-card" title={c.title}>
      <div className="top10-card-inner">
        {/* Giant Outlined Rank Number (1, 2, 3...) */}
        <div className="top10-number-wrap" aria-hidden="true">
          <svg viewBox="0 0 110 145" className="top10-rank-svg">
            <text
              x="55"
              y="125"
              textAnchor="middle"
              className="top10-rank-text"
            >
              {rank}
            </text>
          </svg>
        </div>

        {/* Vertical Poster Card */}
        <div className="top10-poster-wrap">
          <div className="top10-poster-frame">
            {c.posterPath ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl(c.posterPath, "w342")}
                alt={c.title}
                loading="lazy"
                className="top10-poster-img"
              />
            ) : (
              <div className="poster-placeholder">{c.title.slice(0, 1)}</div>
            )}

            {/* Bottom Tag Banner matching Image 1 & 2 */}
            <div className="top10-badge-banner">
              <span className="top10-badge-red">
                {isSeries ? "New Episode" : "Recently Added"}
              </span>
              <span className="top10-badge-white">Watch Now</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// Top 10 Rail matching Image 1 & Image 2 (Netflix style)
export function Top10Rail({
  title,
  entries
}: {
  title: string;
  entries: FeedEntry[];
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const top10 = entries.slice(0, 10);

  function scroll(dir: "left" | "right") {
    if (trackRef.current) {
      const offset = dir === "left" ? -460 : 460;
      trackRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  }

  if (!top10.length) return null;

  return (
    <section className="rail top10-rail-section">
      <div className="rail-heading-row">
        <div className="rail-title-group">
          <h2>{title}</h2>
        </div>
      </div>

      <div className="top10-track-wrapper">
        <button
          type="button"
          className="rail-arrow-btn left"
          onClick={() => scroll("left")}
          aria-label="Gulir ke Kiri"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="top10-track" ref={trackRef}>
          {top10.map((entry, idx) => (
            <Top10Card
              key={`top10-${entry.contentType}-${entry.id ?? entry.content.slug}-${idx}`}
              entry={entry}
              rank={idx + 1}
            />
          ))}
        </div>

        <button
          type="button"
          className="rail-arrow-btn right"
          onClick={() => scroll("right")}
          aria-label="Gulir ke Kanan"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </section>
  );
}

export function ContinueWatchingRail() {
  const [items, setItems] = useState<WatchProgressItem[]>([]);

  useEffect(() => {
    const load = () => {
      try {
        const raw = localStorage.getItem("izastream_watch_progress");
        if (raw) setItems(JSON.parse(raw));
      } catch {}
    };
    load();
    window.addEventListener("izastream_storage_updated", load);
    return () => window.removeEventListener("izastream_storage_updated", load);
  }, []);

  if (!items.length) return null;

  return (
    <section className="rail">
      <div className="rail-heading-row">
        <div className="rail-title-group">
          <h2>Lanjutkan Menonton</h2>
        </div>
      </div>
      <div className="episode-rail-track">
        {items.map((item) => {
          const href =
            item.contentType === "tv_series" && item.episodeId
              ? `/watch/series/${item.slug}?episode=${item.episodeId}&season=${item.seasonNumber || 1}&ep=${item.episodeNumber || 1}`
              : `/${item.contentType === "movie" ? "movie" : "series"}/${item.slug}?play=1`;
          const thumb = item.backdropPath ?? item.posterPath;
          const thumbUrl = thumb ? `https://image.tmdb.org/t/p/w500${thumb}` : "";
          return (
            <Link key={`cw-${item.slug}-${item.episodeId || "single"}`} className="landscape-episode-card" href={href}>
              <div className="landscape-frame">
                {thumbUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumbUrl} alt={item.title} loading="lazy" />
                ) : (
                  <div className="poster-placeholder">▶</div>
                )}
                {item.seasonNumber && item.episodeNumber ? (
                  <span className="landscape-badge-tag">S{String(item.seasonNumber).padStart(2, "0")} E{String(item.episodeNumber).padStart(2, "0")}</span>
                ) : null}
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 4, background: "rgba(255,255,255,0.2)" }}>
                  <div style={{ width: `${item.percent}%`, height: "100%", background: "var(--c-contrast)" }} />
                </div>
              </div>
              <div className="landscape-info">
                <div className="landscape-ep-title">{item.title}</div>
                <div className="landscape-series-title">Tersisa {100 - item.percent}%</div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
