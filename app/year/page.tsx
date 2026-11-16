import Link from "next/link";
import { uniqueYears } from "@/lib/data";

export default function YearIndexPage() {
  const years = uniqueYears();

  return (
    <div className="page">
      <div className="page-heading">
        <span className="eyebrow">Arsip Rilis</span>
        <h1 style={{ margin: "6px 0 4px", fontSize: "clamp(26px, 3.5vw, 42px)", fontWeight: 900 }}>Tahun Rilis</h1>
        <p className="muted small">Telusuri koleksi film dan serial televisi berdasarkan tahun pertama kali ditayangkan.</p>
      </div>

      <div className="hub-grid">
        {years.map((year) => (
          <Link key={year} href={`/year/${year}`} className="hub-card">
            <div>
              <div className="hub-card-title">{year}</div>
              <p className="hub-card-sub" style={{ marginTop: "4px" }}>Rilis Tahun {year}</p>
            </div>
            <span className="hub-card-badge">Lihat Koleksi →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
