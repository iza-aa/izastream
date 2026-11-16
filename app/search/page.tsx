import { CatalogGrid } from "@/app/components/CatalogGrid";
import { searchContent } from "@/lib/data";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const results = searchContent(q);
  return (
    <CatalogGrid
      title={q ? `Search: ${q}` : "Search"}
      subtitle="Original SPA uses /search?q= and records queries through /api/search/track."
      entries={results}
    />
  );
}
