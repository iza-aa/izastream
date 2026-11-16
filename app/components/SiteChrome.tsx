"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SearchResult {
  title: string;
  slug: string;
  contentType: "movie" | "tv_series";
  posterPath?: string | null;
  releaseDate?: string | null;
  firstAirDate?: string | null;
  voteAverage?: number | string | null;
}

export function SiteHeader() {
  const pathname = usePathname();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const moreRef = useRef<HTMLDivElement>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  // Sync theme on mount
  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme") || "dark";
    setTheme(current === "light" ? "light" : "dark");
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!moreRef.current?.contains(target)) setIsMoreOpen(false);
      if (!searchBoxRef.current?.contains(target)) setIsSearchOpen(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("izastream-theme", next);
    } catch {
      // ignore
    }
  }

  function handleSearchInput(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setSearchQuery(q);
    clearTimeout(searchTimeoutRef.current);
    if (!q.trim()) {
      setSearchResults([]);
      setIsSearchOpen(false);
      return;
    }
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
        const data = await res.json();
        setSearchResults((data.data || []).slice(0, 6));
        setIsSearchOpen(true);
      } catch {
        setSearchResults([]);
      }
    }, 250);
  }

  const moreItems = [
    { href: "/shorts", label: "Shorts", icon: "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" },
    { href: "/collection", label: "Collections", icon: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" },
    { href: "/genre", label: "Genres", icon: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" },
    { href: "/watch-party", label: "Watch Party", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
    { href: "/country", label: "Country", icon: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
    { href: "/year", label: "Year", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
    { href: "/network", label: "Network", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" }
  ];

  return (
    <header className="site-header">
      <div className="header-inner">
        {/* Logo */}
        <Link className="brand" href="/">
          <span className="brand-mark">izastream</span>
        </Link>

        {/* Navigation items (Image 5 style) */}
        <nav className="main-nav" aria-label="Navigasi Utama">
          <Link href="/" className={`nav-pill ${pathname === "/" ? "active" : ""}`}>
            <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Home</span>
          </Link>

          <Link href="/movie" className={`nav-pill ${pathname === "/movie" ? "active" : ""}`}>
            <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
              <line x1="7" y1="2" x2="7" y2="22" />
              <line x1="17" y1="2" x2="17" y2="22" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <line x1="2" y1="7" x2="7" y2="7" />
              <line x1="2" y1="17" x2="7" y2="17" />
              <line x1="17" y1="17" x2="22" y2="17" />
              <line x1="17" y1="7" x2="22" y2="7" />
            </svg>
            <span>Movies</span>
          </Link>

          <Link href="/series" className={`nav-pill ${pathname === "/series" ? "active" : ""}`}>
            <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="7" width="20" height="15" rx="2" ry="2" />
              <polyline points="17 2 12 7 7 2" />
            </svg>
            <span>TV Series</span>
          </Link>

          {/* More Dropdown */}
          <div ref={moreRef} className="nav-dropdown-wrapper">
            <button
              type="button"
              className={`nav-pill ${isMoreOpen ? "active" : ""}`}
              onClick={() => setIsMoreOpen((prev) => !prev)}
              aria-expanded={isMoreOpen}
              aria-label="Menu Lainnya"
            >
              <span>More</span>
              <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {isMoreOpen ? (
              <div className="nav-dropdown-menu" role="menu">
                {moreItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="nav-dropdown-item"
                    onClick={() => setIsMoreOpen(false)}
                  >
                    <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d={item.icon} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </nav>

        {/* Right side actions */}
        <div className="header-actions">
          {/* Live Search */}
          <div ref={searchBoxRef} className="search-box-wrapper">
            <form action="/search" className="search-form" role="search">
              <input
                name="q"
                value={searchQuery}
                onChange={handleSearchInput}
                onFocus={() => {
                  if (searchResults.length > 0) setIsSearchOpen(true);
                }}
                placeholder="Cari film, serial..."
                aria-label="Cari Film"
                autoComplete="off"
              />
              <button type="submit" aria-label="Submit Cari">
                Cari
              </button>
            </form>

            {isSearchOpen && searchResults.length > 0 ? (
              <div className="search-results-dropdown" role="listbox">
                {searchResults.map((item) => {
                  const href = `/${item.contentType === "movie" ? "movie" : "series"}/${item.slug}`;
                  const year = (item.releaseDate || item.firstAirDate || "").slice(0, 4);
                  const thumb = item.posterPath ? `https://image.tmdb.org/t/p/w92${item.posterPath}` : "";
                  return (
                    <Link
                      key={item.slug}
                      href={href}
                      className="search-result-item"
                      onClick={() => setIsSearchOpen(false)}
                    >
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb} alt={item.title} className="search-result-thumb" />
                      ) : (
                        <div className="search-result-thumb" />
                      )}
                      <div>
                        <div className="search-result-title">{item.title}</div>
                        <div className="search-result-meta">
                          {item.contentType === "movie" ? "Film" : "Serial"} {year ? `(${year})` : ""} {item.voteAverage ? `· ★ ${Number(item.voteAverage).toFixed(1)}` : ""}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>

          {/* Theme Switcher Button */}
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Ganti ke Mode Terang" : "Ganti ke Mode Gelap"}
            title={theme === "dark" ? "Mode Terang" : "Mode Gelap"}
          >
            {theme === "dark" ? (
              // Sun icon for switching to light
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              // Moon icon for switching to dark
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="izastream-footer">
      <div className="izastream-footer-container">
        {/* Left: izastream Logo matching Navbar */}
        <div className="izastream-footer-brand">
          <Link className="brand" href="/">
            <span className="brand-mark">izastream</span>
          </Link>
        </div>

        {/* Center: Disclaimer Text */}
        <p className="izastream-footer-disclaimer">
          izastream does not host, store, or distribute any media files. All content is automatically grabbed from third-party providers on the Internet.
        </p>
        {/* Right: Social / Feedback Icons */}
        <div className="idlix-footer-actions">
          <button
            type="button"
            className="idlix-footer-btn"
            title="Chat & Feedback"
            aria-label="Chat & Feedback"
            onClick={() => {
              alert("Fitur Feedback / Chat aktif.");
            }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              <line x1="8" y1="12" x2="16" y2="12" />
              <line x1="8" y1="9" x2="13" y2="9" />
            </svg>
          </button>

          <a
            href="https://discord.gg"
            target="_blank"
            rel="noreferrer"
            className="idlix-footer-btn"
            title="Discord Community"
            aria-label="Discord Community"
          >
            <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
          </a>

          <a
            href="https://t.me"
            target="_blank"
            rel="noreferrer"
            className="idlix-footer-btn"
            title="Telegram Channel"
            aria-label="Telegram Channel"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
}
