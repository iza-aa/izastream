import { notFound } from "next/navigation";
import { CatalogGrid } from "@/app/components/CatalogGrid";
import { findByNetworkSlug } from "@/lib/data";

const networkMeta: Record<string, { title: string; subtitle: string }> = {
  "disney-plus": {
    title: "Disney+ Originals",
    subtitle: "Koleksi tayangan orisinal dan blockbuster eksklusif dari Disney+, Marvel, dan Pixar."
  },
  "disney": {
    title: "Disney+ Originals",
    subtitle: "Koleksi tayangan orisinal dan blockbuster eksklusif dari Disney+, Marvel, dan Pixar."
  },
  "netflix": {
    title: "Netflix Originals",
    subtitle: "Serial televisi orisinal, anime eksklusif, dan film blockbuster terpopuler dari Netflix."
  },
  "hbo": {
    title: "HBO Originals",
    subtitle: "Koleksi serial drama prestisius dan tayangan orisinal legendaris dari HBO dan Max."
  },
  "prime-video": {
    title: "Prime Video Originals",
    subtitle: "Tayangan orisinal aksi, thriller, dan film drama pilihan dari Amazon Studios."
  },
  "prime": {
    title: "Prime Video Originals",
    subtitle: "Tayangan orisinal aksi, thriller, dan film drama pilihan dari Amazon Studios."
  },
  "apple-tv-plus": {
    title: "Apple TV+ Originals",
    subtitle: "Serial fiksi ilmiah, drama premium, dan film sinematik orisinal Apple TV+."
  },
  "apple": {
    title: "Apple TV+ Originals",
    subtitle: "Serial fiksi ilmiah, drama premium, dan film sinematik orisinal Apple TV+."
  }
};

export default async function NetworkSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entries = findByNetworkSlug(slug);
  if (!entries.length) notFound();

  const meta = networkMeta[slug.toLowerCase()] || {
    title: `${slug.replace(/-/g, " ").toUpperCase()} Originals`,
    subtitle: "Koleksi tayangan orisinal hasil kurasi jaringan streaming."
  };

  return <CatalogGrid title={meta.title} subtitle={meta.subtitle} entries={entries} />;
}
