import { notFound } from "next/navigation";
import { CatalogGrid } from "@/app/components/CatalogGrid";
import { findByCountrySlug } from "@/lib/data";

export default async function CountryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entries = findByCountrySlug(slug);
  if (!entries.length) notFound();
  return <CatalogGrid title={slug.replace(/-/g, " ")} subtitle="Country filter reconstructed from captured metadata." entries={entries} />;
}
