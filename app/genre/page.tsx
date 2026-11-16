import Link from "next/link";
import { slugify, uniqueGenres } from "@/lib/data";

export default function GenreIndexPage() {
  const genres = uniqueGenres();

  return (
    <div className="page">
      <div className="page-heading">
        <span className="eyebrow">Klasifikasi</span>
        <h1 style={{ margin: "6px 0 4px", fontSize: "clamp(26px, 3.5vw, 42px)", fontWeight: 900 }}>Daftar Genre</h1>
        <p className="muted small">Pilih kategori genre film atau serial televisi yang ingin Anda tonton.</p>
      </div>

      <div className="hub-grid">
        {genres.map((genre) => (
          <Link key={genre} href={`/genre/${slugify(genre)}`} className="hub-card">
            <div>
              <div className="hub-card-title">{genre}</div>
              <p className="hub-card-sub" style={{ marginTop: "4px" }}>Film & Serial {genre}</p>
            </div>
            <span className="hub-card-badge">Jelajahi →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
