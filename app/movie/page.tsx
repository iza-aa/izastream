import { CatalogGrid } from "@/app/components/CatalogGrid";
import { findByKind } from "@/lib/data";

export default function MoviesPage() {
  return (
    <CatalogGrid
      title="Film Bioskop"
      subtitle="Koleksi film bioskop box office terbaru berkualitas HD."
      entries={findByKind("movie")}
    />
  );
}
