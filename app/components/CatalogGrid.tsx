"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PosterCard } from "./Rails";
import type { FeedEntry } from "@/lib/format";

const countryNames: Record<string, string> = {
  KR: "Korea Selatan",
  JP: "Jepang",
  US: "Amerika Serikat",
  CN: "Tiongkok",
  TH: "Thailand",
  GB: "Inggris",
  FR: "Prancis",
  DE: "Jerman",
  ES: "Spanyol",
  IT: "Italia",
  DK: "Denmark",
  MY: "Malaysia"
};

export function CatalogGrid({
  title,
  subtitle,
  entries
}: {
  title: string;
  subtitle?: string;
  entries: FeedEntry[];
}) {
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [selectedYear, setSelectedYear] = useState("all");
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [sortBy, setSortBy] = useState<"default" | "rating" | "latest" | "az">("default");

  // Dropdown popover open states
  const [openDropdown, setOpenDropdown] = useState<"year" | "country" | "sort" | null>(null);
  const filterBarRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!filterBarRef.current?.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  // Derive unique filter options
  const genres = useMemo(() => {
    const set = new Set<string>();
    for (const item of entries) {
      for (const g of item.content.genres ?? []) if (g.name) set.add(g.name);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [entries]);

  const years = useMemo(() => {
    const set = new Set<string>();
    for (const item of entries) {
      const d = item.content.releaseDate ?? item.content.firstAirDate;
      if (d) set.add(String(d).slice(0, 4));
    }
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [entries]);

  const countries = useMemo(() => {
    const set = new Set<string>();
    for (const item of entries) {
      if (item.content.country) set.add(item.content.country);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [entries]);

  // Filter and sort items
  const filteredEntries = useMemo(() => {
    let result = entries.filter((item) => {
      const c = item.content;
      if (selectedGenre !== "all" && !(c.genres ?? []).some((g) => g.name === selectedGenre)) {
        return false;
      }
      if (selectedYear !== "all") {
        const y = (c.releaseDate ?? c.firstAirDate ?? "").slice(0, 4);
        if (y !== selectedYear) return false;
      }
      if (selectedCountry !== "all" && c.country !== selectedCountry) {
        return false;
      }
      return true;
    });

    if (sortBy === "rating") {
      result = [...result].sort((a, b) => Number(b.content.voteAverage || 0) - Number(a.content.voteAverage || 0));
    } else if (sortBy === "latest") {
      result = [...result].sort((a, b) => {
        const da = a.content.releaseDate || a.content.firstAirDate || "";
        const db = b.content.releaseDate || b.content.firstAirDate || "";
        return db.localeCompare(da);
      });
    } else if (sortBy === "az") {
      result = [...result].sort((a, b) => a.content.title.localeCompare(b.content.title));
    }

    return result;
  }, [entries, selectedGenre, selectedYear, selectedCountry, sortBy]);

  const hasActiveFilters = selectedGenre !== "all" || selectedYear !== "all" || selectedCountry !== "all";

  function resetAllFilters() {
    setSelectedGenre("all");
    setSelectedYear("all");
    setSelectedCountry("all");
    setSortBy("default");
    setOpenDropdown(null);
  }

  const sortLabels = {
    default: "Rekomendasi",
    rating: "Rating Tertinggi",
    latest: "Rilis Terbaru",
    az: "Abjad (A - Z)"
  };

  return (
    <div className="page">
      <div className="page-heading">
        <span className="eyebrow">Katalog Konten</span>
        <h1 style={{ margin: "6px 0 4px", fontSize: "clamp(26px, 3.5vw, 42px)", fontWeight: 900 }}>{title}</h1>
        {subtitle ? <p className="muted small">{subtitle}</p> : null}
      </div>

      {/* Row 1: Quick Genre Filter Pills */}
      {genres.length > 0 ? (
        <div className="catalog-genre-pills">
          <button
            type="button"
            className={`catalog-genre-pill ${selectedGenre === "all" ? "active" : ""}`}
            onClick={() => setSelectedGenre("all")}
          >
            Semua
          </button>
          {genres.map((genre) => (
            <button
              key={genre}
              type="button"
              className={`catalog-genre-pill ${selectedGenre === genre ? "active" : ""}`}
              onClick={() => setSelectedGenre(genre)}
            >
              {genre}
            </button>
          ))}
        </div>
      ) : null}

      {/* Row 2: Sleek Filter & Sort Toolbar */}
      <div className="catalog-toolbar" ref={filterBarRef}>
        <div className="catalog-toolbar-left">
          {/* Year Filter Popover */}
          {years.length > 0 ? (
            <div className="catalog-popover-container">
              <button
                type="button"
                className={`catalog-filter-btn ${selectedYear !== "all" ? "active" : ""}`}
                onClick={() => setOpenDropdown(openDropdown === "year" ? null : "year")}
              >
                <span>{selectedYear === "all" ? "Tahun" : `Tahun: ${selectedYear}`}</span>
                <svg viewBox="0 0 24 24" className={`caret-icon ${openDropdown === "year" ? "open" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {openDropdown === "year" ? (
                <div className="catalog-popover-menu" role="menu">
                  <div className="catalog-popover-header">Pilih Tahun</div>
                  <div className="catalog-popover-list">
                    <button
                      type="button"
                      className={`catalog-popover-item ${selectedYear === "all" ? "active" : ""}`}
                      onClick={() => {
                        setSelectedYear("all");
                        setOpenDropdown(null);
                      }}
                    >
                      Semua Tahun
                    </button>
                    {years.map((y) => (
                      <button
                        key={y}
                        type="button"
                        className={`catalog-popover-item ${selectedYear === y ? "active" : ""}`}
                        onClick={() => {
                          setSelectedYear(y);
                          setOpenDropdown(null);
                        }}
                      >
                        {y}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Country Filter Popover */}
          {countries.length > 0 ? (
            <div className="catalog-popover-container">
              <button
                type="button"
                className={`catalog-filter-btn ${selectedCountry !== "all" ? "active" : ""}`}
                onClick={() => setOpenDropdown(openDropdown === "country" ? null : "country")}
              >
                <span>{selectedCountry === "all" ? "Negara" : `Negara: ${countryNames[selectedCountry] || selectedCountry}`}</span>
                <svg viewBox="0 0 24 24" className={`caret-icon ${openDropdown === "country" ? "open" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {openDropdown === "country" ? (
                <div className="catalog-popover-menu" role="menu">
                  <div className="catalog-popover-header">Pilih Negara</div>
                  <div className="catalog-popover-list">
                    <button
                      type="button"
                      className={`catalog-popover-item ${selectedCountry === "all" ? "active" : ""}`}
                      onClick={() => {
                        setSelectedCountry("all");
                        setOpenDropdown(null);
                      }}
                    >
                      Semua Negara
                    </button>
                    {countries.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={`catalog-popover-item ${selectedCountry === c ? "active" : ""}`}
                        onClick={() => {
                          setSelectedCountry(c);
                          setOpenDropdown(null);
                        }}
                      >
                        {countryNames[c] || c}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Reset button if any filter is active */}
          {hasActiveFilters ? (
            <button type="button" className="catalog-reset-btn" onClick={resetAllFilters}>
              Reset Filter
            </button>
          ) : null}
        </div>

        {/* Right side: Results count and Sort Popover */}
        <div className="catalog-toolbar-right">
          <span className="catalog-count-badge">{filteredEntries.length} Judul</span>

          {/* Sort Popover */}
          <div className="catalog-popover-container">
            <button
              type="button"
              className="catalog-filter-btn"
              onClick={() => setOpenDropdown(openDropdown === "sort" ? null : "sort")}
            >
              <span className="muted" style={{ marginRight: 4 }}>Urutkan:</span>
              <span>{sortLabels[sortBy]}</span>
              <svg viewBox="0 0 24 24" className={`caret-icon ${openDropdown === "sort" ? "open" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {openDropdown === "sort" ? (
              <div className="catalog-popover-menu right-aligned" role="menu">
                <div className="catalog-popover-header">Urutkan Berdasarkan</div>
                <div className="catalog-popover-list">
                  {(["default", "rating", "latest", "az"] as const).map((key) => (
                    <button
                      key={key}
                      type="button"
                      className={`catalog-popover-item ${sortBy === key ? "active" : ""}`}
                      onClick={() => {
                        setSortBy(key);
                        setOpenDropdown(null);
                      }}
                    >
                      {sortLabels[key]}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Grid of Results */}
      {filteredEntries.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", background: "var(--card)", borderRadius: "14px", border: "1px solid var(--border)", marginTop: "24px" }}>
          <p className="muted" style={{ margin: 0, fontSize: "14px" }}>
            Tidak ada film atau serial yang cocok dengan filter yang dipilih.
          </p>
          <button type="button" className="secondary-button" onClick={resetAllFilters} style={{ marginTop: "14px" }}>
            Hapus Filter
          </button>
        </div>
      ) : (
        <div className="catalog-grid">
          {filteredEntries.map((entry) => (
            <PosterCard key={`${entry.contentType}-${entry.content.slug}`} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
