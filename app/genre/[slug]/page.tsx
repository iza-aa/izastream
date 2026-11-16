import { notFound } from "next/navigation";
import { CatalogGrid } from "@/app/components/CatalogGrid";
import { findByGenreSlug } from "@/lib/data";

export default async function GenrePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entries = findByGenreSlug(slug);
  if (!entries.length) notFound();
  return <CatalogGrid title={slug.replace(/-/g, " ")} subtitle="Genre filter reconstructed from captured metadata." entries={entries} />;
}
