import fs from "node:fs";
import path from "node:path";
import Link from "next/link";

interface ShortItem {
  id: string;
  title: string;
  poster?: string;
  durationSec?: number;
  viewCount?: number;
  likeCount?: number;
  author?: {
    username?: string;
    displayName?: string;
  };
  tags?: Array<{
    type: string;
    title: string;
    slug: string;
    posterPath?: string;
  }>;
}

export default function ShortsPage() {
  let shorts: ShortItem[] = [];
  try {
    const file = path.join(process.cwd(), "data", "shorts.json");
    if (fs.existsSync(file)) {
      shorts = JSON.parse(fs.readFileSync(file, "utf8"));
    }
  } catch {
    shorts = [];
  }

  return (
    <div className="page">
      <div className="page-heading">
        <span className="eyebrow">Video Singkat</span>
        <h1 style={{ margin: "6px 0 4px", fontSize: "clamp(26px, 3.5vw, 42px)", fontWeight: 900 }}>Shorts</h1>
        <p className="muted small">Cuplikan adegan terbaik dan klip pendek dari film serta serial favorit.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "20px", marginTop: "24px" }}>
        {shorts.map((item) => {
          const primaryTag = item.tags?.[0];
          const href = primaryTag
            ? `/${primaryTag.type === "movie" ? "movie" : "series"}/${primaryTag.slug}`
            : "#";
          const bgImg = primaryTag?.posterPath
            ? `https://image.tmdb.org/t/p/w500${primaryTag.posterPath}`
            : "";

          return (
            <Link
              key={item.id}
              href={href}
              style={{
                position: "relative",
                aspectRatio: "9 / 16",
                borderRadius: "14px",
                overflow: "hidden",
                background: "var(--card)",
                border: "1px solid var(--border)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                padding: "16px",
                color: "#fff",
                textShadow: "0 2px 8px rgba(0,0,0,0.8)"
              }}
            >
              {bgImg ? (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    backgroundImage: `linear-gradient(180deg, transparent 40%, rgba(7,9,19,0.92) 100%), url(${bgImg})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center"
                  }}
                />
              ) : null}

              <div style={{ position: "relative", zIndex: 10 }}>
                <span className="hub-card-badge" style={{ marginBottom: "8px" }}>
                  {item.durationSec ? `${item.durationSec}s` : "Klip"}
                </span>
                <h3 style={{ fontSize: "14px", fontWeight: 700, margin: "6px 0 2px", lineHeight: 1.3 }}>{item.title}</h3>
                <p className="muted small" style={{ margin: 0, color: "#cbd5e1" }}>
                  {item.author?.displayName || item.author?.username ? `@${item.author.displayName || item.author.username}` : "izastream"} · {item.viewCount ? `${item.viewCount} tontonan` : ""}
                </p>
                {primaryTag ? (
                  <p style={{ margin: "6px 0 0", fontSize: "11px", color: "var(--c-contrast)", fontWeight: 700 }}>
                    {primaryTag.title}
                  </p>
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
