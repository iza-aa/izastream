import { notFound } from "next/navigation";
import { CatalogGrid } from "@/app/components/CatalogGrid";
import { getCollectionSections, slugify } from "@/lib/data";

export default async function CollectionDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const section = getCollectionSections().find((item) => (item.slug || slugify(item.title)) === slug);
  if (!section) notFound();
  return <CatalogGrid title={section.title} subtitle={section.description ?? undefined} entries={section.data} />;
}
