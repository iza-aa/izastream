import { CatalogGrid } from "@/app/components/CatalogGrid";
import { findByKind } from "@/lib/data";

export default function SeriesListPage() {
  return (
    <CatalogGrid
      title="Serial Televisi"
      subtitle="Koleksi serial televisi, drama Asia, dan anime terlengkap."
      entries={findByKind("tv_series")}
    />
  );
}
