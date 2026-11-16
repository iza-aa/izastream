import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { HeroCarousel } from "./components/HeroCarousel";
import {
  ContinueWatchingRail,
  DropdownOption,
  DropdownRail,
  EpisodeRail,
  Rail,
  Top10Rail
} from "./components/Rails";
import {
  contentHref,
  getCatalog,
  getFeatured,
  getFeaturedItems,
  getSections,
  imageUrl,
  yearOf,
  type FeedEntry
} from "@/lib/data";

export default function HomePage() {
  const featured = getFeatured();
  const featuredItems = getFeaturedItems();
  const allSections = getSections();
  const catalog = getCatalog();
  const hero = featured?.content;

  // Separate sections
  const episodesSection = allSections.find((s) => s.type === "latest_episodes");
  const trendingNowSection = allSections.find((s) => s.title === "Trending Now" || (s.type === "trending" && !s.trendingCountryName));

  const standardSections = allSections.filter(
    (s) =>
      s.type !== "featured" &&
      s.type !== "latest_episodes" &&
      s.type !== "network" &&
      s.type !== "tmdb_trending" &&
      s.title !== "Trending Now" &&
      s.title !== "Trending in Indonesia" &&
      s.trendingCountryName !== "Indonesia" &&
      s !== trendingNowSection &&
      Boolean(s.title && s.title.trim())
  );
  // Network Originals options matching Image 1
  const networkOptions: DropdownOption[] = [
    { id: "disney-plus", label: "Disney+ Originals", category: "Disney+", suffix: "Originals", color: "#00D6FF", href: "/network/disney-plus" },
    { id: "netflix", label: "Netflix Originals", category: "Netflix", suffix: "Originals", color: "#E50914", href: "/network/netflix" },
    { id: "hbo", label: "HBO Originals", category: "HBO", suffix: "Originals", color: "#9933FF", href: "/network/hbo" },
    { id: "prime-video", label: "Prime Video Originals", category: "Prime Video", suffix: "Originals", color: "#00A8E1", href: "/network/prime-video" },
    { id: "apple-tv-plus", label: "Apple TV+ Originals", category: "Apple TV+", suffix: "Originals", color: "#A1A1AA", href: "/network/apple-tv-plus" }
  ];

  // Load custom network originals data
  const customNetworks: Record<string, FeedEntry[]> = {};
  try {
    const netFile = path.join(process.cwd(), "data", "networks.json");
    if (fs.existsSync(netFile)) {
      const rawNets = JSON.parse(fs.readFileSync(netFile, "utf8")) as Record<string, { data?: Record<string, unknown>[] }>;
      for (const [key, obj] of Object.entries(rawNets)) {
        if (Array.isArray(obj.data)) {
          customNetworks[key] = obj.data.map((raw) => {
            const isMovie = raw.contentType === "movie" || (!raw.firstAirDate && Boolean(raw.releaseDate));
            return {
              id: String(raw.id || raw.slug),
              contentType: isMovie ? ("movie" as const) : ("tv_series" as const),
              content: {
                id: String(raw.id || raw.slug),
                title: String(raw.title || "Untitled"),
                slug: String(raw.slug || raw.id),
                posterPath: typeof raw.posterPath === "string" ? raw.posterPath : null,
                backdropPath: typeof raw.backdropPath === "string" ? raw.backdropPath : null,
                voteAverage: typeof raw.voteAverage === "number" || typeof raw.voteAverage === "string" ? raw.voteAverage : null,
                firstAirDate: typeof raw.firstAirDate === "string" ? raw.firstAirDate : null,
                releaseDate: typeof raw.releaseDate === "string" ? raw.releaseDate : null,
                country: typeof raw.country === "string" ? raw.country : null,
                numberOfSeasons: typeof raw.numberOfSeasons === "number" ? raw.numberOfSeasons : null,
                commentCount: typeof raw.commentCount === "number" ? raw.commentCount : null
              }
            };
          });
        }
      }
    }
  } catch {}

  // Regional & Asian Drama pre-calculated lightweight entries
  const customDramas: Record<string, FeedEntry[]> = {
    korean: catalog.filter((e) => e.content.country === "KR").slice(0, 15),
    anime: catalog.filter((e) => (e.content.genres || []).some((g) => /anim/i.test(g.name))).slice(0, 15),
    chinese: catalog.filter((e) => e.content.country === "CN" || e.content.country === "TW").slice(0, 15),
    japanese: catalog.filter((e) => e.content.country === "JP" && !(e.content.genres || []).some((g) => /anim/i.test(g.name))).slice(0, 15),
    thai: catalog.filter((e) => e.content.country === "TH").slice(0, 15)
  };

  // Regional & Asian Drama options matching Image 2
  const dramaOptions: DropdownOption[] = [
    { id: "korean", label: "Korean Drama", category: "Korean", suffix: "Drama", color: "#3B82F6", href: "/country/korean" },
    { id: "anime", label: "Anime", category: "Anime", color: "#F59E0B", href: "/genre/animation" },
    { id: "chinese", label: "Chinese Drama", category: "Chinese", suffix: "Drama", color: "#EF4444", href: "/country/chinese" },
    { id: "japanese", label: "Japanese Drama", category: "Japanese", suffix: "Drama", color: "#EC4899", href: "/country/japanese" },
    { id: "thai", label: "Thai Drama", category: "Thai", suffix: "Drama", color: "#10B981", href: "/country/thai" }
  ];

  return (
    <>
      <HeroCarousel items={featuredItems.length > 0 ? featuredItems : featured ? [featured] : []} />

      <div className="page">
        {/* Continue watching rail if user has local history */}
        <ContinueWatchingRail />

        {/* Network Originals Dropdown Switcher matching Image 1 */}
        <DropdownRail
          defaultId="disney-plus"
          options={networkOptions}
          allEntries={[]}
          customEntries={customNetworks}
          viewAllHref="/network/disney-plus"
        />

        {/* Asian Drama / Regional Category Switcher matching Image 2 */}
        <DropdownRail
          defaultId="korean"
          options={dramaOptions}
          allEntries={[]}
          customEntries={customDramas}
          viewAllHref="/country/korean"
        />
        {/* Recently Added Episodes 16:9 Landscape Layout matching Image 4 */}
        {episodesSection ? (
          <EpisodeRail title="Recently Added Episodes" entries={episodesSection.data} />
        ) : null}
        {/* Top 10: Trending Now (matching Image 1 & 2) */}
        {trendingNowSection?.data?.length ? (
          <Top10Rail title="Trending Now" entries={trendingNowSection.data} />
        ) : null}

        {/* Remaining Standard Rails (without redundant notes) */}
        {standardSections.map((section, index) => (
          <Rail
            key={`${section.type}-${section.id ?? section.title ?? index}`}
            title={section.title || section.type}
            entries={section.data}
          />
        ))}
      </div>
    </>
  );
}
