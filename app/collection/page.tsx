import Link from "next/link";
import { getCollectionSections, slugify } from "@/lib/data";

export default function CollectionPage() {
  const sections = getCollectionSections();

  return (
    <div className="page">
      <div className="page-heading">
        <span className="eyebrow">Kurasi Khusus</span>
        <h1 style={{ margin: "6px 0 4px", fontSize: "clamp(26px, 3.5vw, 42px)", fontWeight: 900 }}>Koleksi Tematik</h1>
        <p className="muted small">Daftar waralaba film dan serial pilihan yang disusun secara tematik.</p>
      </div>

      <div className="collection-grid">
        {sections.map((section) => (
          <div className="collection-card" key={section.id ?? section.title}>
            <h2>{section.title}</h2>
            <p className="muted small">{section.description || "Koleksi kurasi film dan serial populer."}</p>
            <div className="chip-row">
              {section.data.slice(0, 6).map((entry) => (
                <span className="chip" key={entry.content.slug}>
                  {entry.content.title}
                </span>
              ))}
            </div>
            <Link className="text-link" href={`/collection/${section.slug || slugify(section.title)}`}>
              Buka Koleksi Lengkap →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
