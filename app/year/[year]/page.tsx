import { notFound } from "next/navigation";
import { CatalogGrid } from "@/app/components/CatalogGrid";
import { findByYear } from "@/lib/data";

export default async function YearPage({ params }: { params: Promise<{ year: string }> }) {
  const { year } = await params;
  const entries = findByYear(year);
  if (!entries.length) notFound();
  return <CatalogGrid title={`Released in ${year}`} entries={entries} />;
}
