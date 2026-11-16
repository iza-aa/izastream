import { notFound, redirect } from "next/navigation";
import { DetailView } from "@/app/components/DetailView";
import { EpisodePicker } from "@/app/components/EpisodePicker";
import { PosterCard } from "@/app/components/Rails";
import { findOrFetchContent, getCatalog } from "@/lib/data";
import { resolvePlayback } from "@/lib/playback";

export default async function SeriesPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ play?: string; episode?: string }>;
}) {
  const { slug } = await params;
  const { play, episode } = await searchParams;
  let entry = await findOrFetchContent(slug, "tv_series");
  if (!entry || entry.contentType !== "tv_series") {
    const asMovie = await findOrFetchContent(slug, "movie");
    if (asMovie && asMovie.contentType === "movie") {
      redirect(`/movie/${slug}`);
    }
    notFound();
  }

  const playback = resolvePlayback(slug);
  const playbackNote =
    playback.mode === "real" && playback.expiresAt
      ? `Signed Pentos stream aktif hingga ${new Date(playback.expiresAt * 1000).toLocaleString("id-ID")}.`
      : undefined;
  const currentGenres = new Set((entry.content.genres ?? []).map((g) => g.name));
  let relatedEntries = getCatalog()
    .filter((item) => item.content.slug !== slug && (item.content.genres ?? []).some((g) => currentGenres.has(g.name)))
    .slice(0, 10);
  if (relatedEntries.length < 6) {
    const existingSlugs = new Set([slug, ...relatedEntries.map((r) => r.content.slug)]);
    const fallback = getCatalog()
      .filter((item) => !existingSlugs.has(item.content.slug))
      .slice(0, 10 - relatedEntries.length);
    relatedEntries = [...relatedEntries, ...fallback];
  }

  return (
    <>
      <DetailView
        entry={entry}
        play={play === "1"}
        playbackSrc={playback.src}
        playbackMode={playback.mode}
        playbackNote={playbackNote}
        subtitles={playback.subtitles}
        relatedEntries={[]}
      />
      <div className="page" style={{ paddingTop: 0 }}>
        {/* Episodes & Cast (matching Image 2) */}
        <EpisodePicker
          slug={slug}
          activeEpisodeId={episode}
          backdropFallback={entry.content.backdropPath ?? entry.content.posterPath}
        />

        {/* More Like This (matching Image 3) */}
        {relatedEntries.length > 0 ? (
          <section className="more-like-this-section">
            <div className="section-header-simple">
              <h2 className="section-title">More Like This</h2>
            </div>
            <div className="rail-track">
              {relatedEntries.map((rel) => (
                <PosterCard key={`rel-${rel.id}`} entry={rel} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}
