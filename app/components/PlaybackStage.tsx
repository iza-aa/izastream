"use client";

import { useEffect, useState } from "react";
import { VideoPlayer } from "./VideoPlayer";

interface SubtitleTrack {
  lang: string;
  label: string;
  path: string;
}

interface PlaybackStageProps {
  slug: string;
  kind: "movie" | "tv_series";
  title: string;
  poster?: string;
  episodeId?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  nextEpisodeHref?: string;
  initialSrc?: string;
  initialMode?: "demo" | "real";
  initialSubtitles?: SubtitleTrack[];
  initialNote?: string;
}

type Phase = "preparing" | "ready" | "error";

interface EnsureResponse {
  status?: string;
  src?: string;
  subtitles?: SubtitleTrack[];
  expiresAt?: number;
  title?: string;
  episode?: { id?: string; seasonNumber?: number | null; episodeNumber?: number | null } | null;
  error?: string;
  detail?: string;
}

export function PlaybackStage({
  slug,
  kind,
  title: initialTitle,
  poster,
  episodeId,
  seasonNumber,
  episodeNumber,
  nextEpisodeHref,
  initialSrc,
  initialMode = "demo",
  initialSubtitles = [],
  initialNote
}: PlaybackStageProps) {
  const [phase, setPhase] = useState<Phase>(initialMode === "real" && initialSrc && !episodeId ? "ready" : "preparing");
  const [src, setSrc] = useState(initialMode === "real" && !episodeId ? (initialSrc ?? "") : "");
  const [subtitles, setSubtitles] = useState<SubtitleTrack[]>(initialSubtitles);
  const [note, setNote] = useState(initialNote);
  const [title, setTitle] = useState(initialTitle);
  const [error, setError] = useState("");
  const [, setDetail] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (phase !== "preparing") return;
    let cancelled = false;
    setElapsed(0);
    const timer = setInterval(() => setElapsed((value) => value + 1), 1000);

    void (async () => {
      try {
        const response = await fetch("/api/playback/ensure", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ slug, kind: kind === "movie" ? "movie" : "series", episodeId })
        });
        const body = (await response.json()) as EnsureResponse;
        if (cancelled) return;
        if (!response.ok || body.status !== "ready" || !body.src) {
          setSrc("/media/hls/demo.m3u8");
          setSubtitles([]);
          setNote("Mode Demonstrasi Aktif · Upstream Pentos CDN memerlukan sesi aktif.");
          setPhase("ready");
          return;
        }
        setSrc(body.src);
        setSubtitles(body.subtitles ?? []);
        if (body.episode?.seasonNumber != null && body.episode?.episodeNumber != null) {
          setTitle(`${initialTitle} · S${body.episode.seasonNumber}E${body.episode.episodeNumber}`);
        }
        setNote(
          body.expiresAt
            ? `Stream aktif otomatis hingga ${new Date(body.expiresAt * 1000).toLocaleString("id-ID")}.`
            : "Stream aktif."
        );
        setPhase("ready");
      } catch (cause) {
        if (!cancelled) {
          setSrc("/media/hls/demo.m3u8");
          setSubtitles([]);
          setNote("Mode Demonstrasi Aktif · Upstream Pentos CDN memerlukan sesi aktif.");
          setPhase("ready");
        }
      } finally {
        clearInterval(timer);
      }
    })();

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [phase, slug, kind, episodeId, attempt, initialTitle]);

  if (phase === "ready") {
    return (
      <VideoPlayer
        key={`${src}-${episodeId ?? "default"}`}
        src={src}
        mode="real"
        subtitles={subtitles}
        note={note}
        fallbackSrc="/media/flower.mp4"
        poster={poster}
        title={title}
        slug={slug}
        contentType={kind}
        episodeId={episodeId}
        seasonNumber={seasonNumber}
        episodeNumber={episodeNumber}
        nextEpisodeHref={nextEpisodeHref}
        autoPlay={true}
      />
    );
  }

  if (phase === "error") {
    return (
      <div className="player-shell">
        <div className="player-cinema-viewport">
          {poster ? (
            <div className="player-cinema-backdrop" style={{ backgroundImage: `url(${poster})` }} />
          ) : null}
          <div className="cinema-error-box">
            <h3>Gagal Memuat Tayangan</h3>
            <p>{error || "Koneksi ke server streaming terputus atau sesi telah kedaluwarsa."}</p>
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                setError("");
                setDetail("");
                setAttempt((v) => v + 1);
                setPhase("preparing");
              }}
            >
              Coba Lagi
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Cinema-Grade Loading Viewport (Netflix / Disney+ style)
  return (
    <div className="player-shell">
      <div className="player-cinema-viewport">
        {poster ? (
          <div className="player-cinema-backdrop" style={{ backgroundImage: `url(${poster})` }} />
        ) : null}
        <div className="player-vignette-top" style={{ opacity: 1 }} />
        <div className="player-vignette-bottom" style={{ opacity: 1 }} />

        <div className="player-cinema-loading-overlay">
          <div className="cinema-spinner" aria-hidden="true" />
          <div className="cinema-loading-title">Menyiapkan Pemutaran...</div>
          <div className="cinema-loading-sub">{title}</div>
          <div className="cinema-progress-bar">
            <span style={{ width: `${Math.min(95, 12 + elapsed * 5)}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
