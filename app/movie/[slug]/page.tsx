import { notFound, redirect } from "next/navigation";
import { DetailView } from "@/app/components/DetailView";
import { findContent, findOrFetchContent, getCatalog } from "@/lib/data";
import { resolvePlayback } from "@/lib/playback";

export default async function MoviePage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ play?: string }>;
}) {
  const { slug } = await params;
  const { play } = await searchParams;
  let entry = await findOrFetchContent(slug, "movie");
  if (!entry || entry.contentType !== "movie") {
    const asSeries = await findOrFetchContent(slug, "tv_series");
    if (asSeries && asSeries.contentType === "tv_series") {
      redirect(`/series/${slug}`);
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
    <DetailView
      entry={entry}
      play={play === "1"}
      playbackSrc={playback.src}
      playbackMode={playback.mode}
      playbackNote={playbackNote}
      subtitles={playback.subtitles}
      relatedEntries={relatedEntries}
    />
  );
}
