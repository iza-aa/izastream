"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getLocalWatchlist, toggleWatchlist, type StoredMediaItem } from "@/lib/storage";

export default function WatchlistPage() {
  const [items, setItems] = useState<StoredMediaItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setItems(getLocalWatchlist());
    const onStorage = () => setItems(getLocalWatchlist());
    window.addEventListener("izastream_storage_updated", onStorage);
    return () => window.removeEventListener("izastream_storage_updated", onStorage);
  }, []);

  function handleRemove(item: StoredMediaItem) {
    toggleWatchlist(item);
    setItems(getLocalWatchlist());
  }

  if (!mounted) {
    return (
      <div className="page">
        <h1>Watchlist Saya</h1>
        <p className="muted">Memuat daftar simpanan...</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="rail-heading-row">
        <div>
          <span className="eyebrow">Koleksi Pribadi</span>
          <h1 style={{ margin: "6px 0 4px", fontSize: "clamp(26px, 3.5vw, 42px)", fontWeight: 900 }}>Watchlist Saya</h1>
          <p className="muted small">Tersimpan di browser Anda tanpa perlu akun atau login.</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 20px", background: "var(--card)", borderRadius: "16px", border: "1px solid var(--border)", marginTop: "20px" }}>
          <h2 style={{ fontSize: "20px", margin: "0 0 10px" }}>Watchlist Anda Masih Kosong</h2>
          <p className="muted" style={{ maxWidth: "420px", margin: "0 auto 24px" }}>
            Klik tombol &quot;+ Tambah ke Watchlist&quot; di halaman detail film atau serial apa saja untuk menyimpannya di sini.
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <Link className="primary-button" href="/movie">
              Jelajahi Film
            </Link>
            <Link className="secondary-button" href="/series">
              Jelajahi Serial
            </Link>
          </div>
        </div>
      ) : (
        <div className="catalog-grid">
          {items.map((item) => {
            const href = `/${item.contentType === "movie" ? "movie" : "series"}/${item.slug}`;
            const year = (item.releaseDate || item.firstAirDate || "").slice(0, 4);
            const posterUrl = item.posterPath ? `https://image.tmdb.org/t/p/w342${item.posterPath}` : "";
            return (
              <div key={item.slug} className="poster-card" style={{ position: "relative" }}>
                <Link href={href}>
                  <div className="poster-frame">
                    {posterUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={posterUrl} alt={item.title} loading="lazy" />
                    ) : (
                      <div className="poster-placeholder">{item.title.slice(0, 1)}</div>
                    )}
                    <span className="poster-kind">{item.contentType === "movie" ? "FILM" : "SERIAL"}</span>
                    {Number(item.voteAverage) > 0 ? (
                      <span className="poster-rating">{Number(item.voteAverage).toFixed(1)}</span>
                    ) : null}
                  </div>
                  <div className="poster-title">{item.title}</div>
                  <div className="poster-meta">{year || "—"}</div>
                </Link>
                <button
                  type="button"
                  onClick={() => handleRemove(item)}
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    background: "rgba(0,0,0,0.75)",
                    color: "#ff6b81",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: "50%",
                    width: 26,
                    height: 26,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: 800
                  }}
                  title="Hapus dari Watchlist"
                  aria-label="Hapus dari Watchlist"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
