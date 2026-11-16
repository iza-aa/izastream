import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EpisodePicker } from "@/app/components/EpisodePicker";
import { PlaybackStage } from "@/app/components/PlaybackStage";
import { contentHref, findContent, findOrFetchContent, imageUrl, yearOf } from "@/lib/data";
import { resolvePlayback } from "@/lib/playback";

interface SeriesEpisodeMeta {
  id: string;
  seasonNumber: number;
  episodeNumber: number;
}

export default async function WatchPage({
  params,
  searchParams
}: {
  params: Promise<{ type: string; slug: string }>;
  searchParams: Promise<{ episode?: string; season?: string; ep?: string }>;
}) {
  const { type, slug } = await params;
  const { episode, season, ep } = await searchParams;
  if (type !== "movie" && type !== "series") {
    if (type === "tv" || type === "tv_series") {
      redirect(`/watch/series/${slug}${episode ? `?episode=${episode}` : ""}`);
    }
    notFound();
  }
  const expected = type === "movie" ? "movie" : "tv_series";
  let entry = await findOrFetchContent(slug, expected);
  if (!entry || entry.contentType !== expected) {
    const altKind = expected === "movie" ? "tv_series" : "movie";
    const alt = await findOrFetchContent(slug, altKind);
    if (alt) {
      const targetRoute = alt.contentType === "movie" ? "movie" : "series";
      redirect(`/watch/${targetRoute}/${slug}`);
    }
    notFound();
  }
  const playback = resolvePlayback(slug);
  const note =
    playback.mode === "real" && playback.expiresAt
      ? `Signed Pentos stream aktif hingga ${new Date(playback.expiresAt * 1000).toLocaleString("id-ID")}.`
      : undefined;

  let nextEpisodeHref: string | undefined;
  if (type === "series") {
    try {
      const file = path.join(process.cwd(), "data", "series", `${slug}.json`);
      if (fs.existsSync(file)) {
        const seriesData = JSON.parse(fs.readFileSync(file, "utf8")) as { episodes: SeriesEpisodeMeta[] };
        const eps = seriesData.episodes || [];
        const currentIdx = episode ? eps.findIndex((item) => item.id === episode) : 0;
        if (currentIdx >= 0 && currentIdx < eps.length - 1) {
          const next = eps[currentIdx + 1];
          nextEpisodeHref = `/watch/series/${slug}?episode=${next.id}&season=${next.seasonNumber}&ep=${next.episodeNumber}`;
        }
      }
    } catch {
      // ignore
    }
  }

  const episodeLabel = season && ep ? ` · S${season}E${ep}` : "";

  return (
    <div className="page">
      <Link className="back-link" href={contentHref(entry)}>
        ← Kembali ke detail
      </Link>
      <div className="watch-heading">
        <span className="eyebrow">{type === "movie" ? "Film" : "Serial"} · Pemutaran{episodeLabel}</span>
        <h1>
          {entry.content.title}
          {episodeLabel}
        </h1>
        <p className="muted">
          {yearOf(entry)} {entry.content.country ? `· ${entry.content.country}` : ""}
        </p>
      </div>

      <PlaybackStage
        slug={slug}
        kind={entry.contentType}
        episodeId={episode}
        seasonNumber={season ? Number(season) : undefined}
        episodeNumber={ep ? Number(ep) : undefined}
        nextEpisodeHref={nextEpisodeHref}
        title={`${entry.content.title}${episodeLabel}`}
        poster={imageUrl(entry.content.backdropPath ?? entry.content.posterPath, "w1280")}
        initialSrc={playback.src}
        initialMode={playback.mode}
        initialSubtitles={playback.subtitles}
        initialNote={note}
      />

      {type === "series" ? <EpisodePicker slug={slug} activeEpisodeId={episode} /> : null}
    </div>
  );
}
