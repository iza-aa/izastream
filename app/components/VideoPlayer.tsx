"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Hls from "hls.js";
import { getProgressFor, saveWatchProgress } from "@/lib/storage";

interface SubtitleTrack {
  lang: string;
  label: string;
  path: string;
}

interface VideoQualityLevel {
  id: number;
  label: string;
  height?: number;
  bitrate?: number;
}

interface PlayerProps {
  src: string;
  poster?: string;
  title: string;
  fallbackSrc?: string;
  mode?: "demo" | "real";
  note?: string;
  subtitles?: SubtitleTrack[];
  slug?: string;
  contentType?: "movie" | "tv_series";
  episodeId?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  nextEpisodeHref?: string;
  autoPlay?: boolean;
}

type PlayerStatus = "loading" | "ready" | "native" | "error";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
  const s = Math.floor(seconds);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hrs > 0) {
    return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function VideoPlayer({
  src,
  poster,
  title,
  fallbackSrc,
  mode = "demo",
  note,
  subtitles = [],
  slug,
  contentType,
  episodeId,
  seasonNumber,
  episodeNumber,
  nextEpisodeHref,
  autoPlay = true
}: PlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const lastSaveTimeRef = useRef(0);

  const [status, setStatus] = useState<PlayerStatus>("loading");
  const [error, setError] = useState("");
  const [usingFallback, setUsingFallback] = useState(false);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedPercent, setBufferedPercent] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [resumeNotice, setResumeNotice] = useState<string | null>(null);
  const [isBuffering, setIsBuffering] = useState(false);

  // Quality / Resolution state
  const [levels, setLevels] = useState<VideoQualityLevel[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number>(-1); // -1 = Auto
  const [activeLevelIndex, setActiveLevelIndex] = useState<number>(-1);
  const [nativeResolution, setNativeResolution] = useState<string>("");
  const [isResolutionMenuOpen, setIsResolutionMenuOpen] = useState(false);
  const [isSpeedMenuOpen, setIsSpeedMenuOpen] = useState(false);

  // Subtitle state
  const [activeSubtitleLang, setActiveSubtitleLang] = useState<string>("id");
  const [isSubtitleMenuOpen, setIsSubtitleMenuOpen] = useState(false);

  // Smart Skip Intro computation
  const isAnime = useMemo(() => {
    return /anime|cyberpunk|clover|dragon|blue-box/i.test(`${slug || ""} ${title || ""}`);
  }, [slug, title]);

  const introStartTime = 15;
  const introEndTime = isAnime ? 105 : 95;
  const isInsideIntro = currentTime >= introStartTime && currentTime < introEndTime;
  const remainingIntroSeconds = Math.max(1, Math.round(introEndTime - currentTime));

  const isNearEnd = duration > 180 && duration - currentTime <= 85 && Boolean(nextEpisodeHref);
  const remainingOutroSeconds = Math.max(1, Math.round(duration - currentTime));

  // Initialize playback (HLS / Native)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || usingFallback) return;

    const userAgent = navigator.userAgent;
    const isSafari = /Safari/i.test(userAgent) && !/Chrome|Chromium|CriOS|Edg|OPR/i.test(userAgent);
    const nativeHls = video.canPlayType("application/vnd.apple.mpegurl") !== "";

    const attemptAutoPlay = () => {
      if (!autoPlay) return;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(() => {
            // If browser gesture policy blocks unmuted autoplay, start muted
            video.muted = true;
            setIsMuted(true);
            video.play().then(() => setIsPlaying(true)).catch(() => {});
          });
      }
    };

    if (isSafari && nativeHls) {
      video.src = src;
      setStatus("native");
      const onLoadedMeta = () => {
        if (video.videoHeight) setNativeResolution(`${video.videoHeight}p`);
        setDuration(video.duration || 0);
        checkResumeProgress(video);
        attemptAutoPlay();
      };
      video.addEventListener("loadedmetadata", onLoadedMeta);
      return () => {
        video.removeEventListener("loadedmetadata", onLoadedMeta);
        video.removeAttribute("src");
        video.load();
      };
    }

    if (!Hls.isSupported()) {
      if (nativeHls) {
        video.src = src;
        setStatus("native");
        attemptAutoPlay();
        return () => {
          video.removeAttribute("src");
          video.load();
        };
      }
      setError("Browser ini tidak mendukung pemutaran HLS.");
      setStatus("error");
      return;
    }

    const hls = new Hls({ enableWorker: true, lowLatencyMode: false });
    hlsRef.current = hls;
    hls.loadSource(src);
    hls.attachMedia(video);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      setStatus("ready");
      const parsedLevels: VideoQualityLevel[] = hls.levels.map((lvl, index) => {
        const label = lvl.name || (lvl.height ? `${lvl.height}p` : `Level ${index + 1}`);
        return {
          id: index,
          label,
          height: lvl.height,
          bitrate: lvl.bitrate
        };
      });
      setLevels(parsedLevels);
      checkResumeProgress(video);
      attemptAutoPlay();
    });

    hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
      setActiveLevelIndex(data.level);
    });

    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (data.fatal) {
        setError(data.details ?? "HLS stream error");
        setStatus("error");
      }
    });

    return () => {
      hls.destroy();
      hlsRef.current = null;
    };
  }, [src, usingFallback, autoPlay]);

  function checkResumeProgress(video: HTMLVideoElement) {
    if (!slug) return;
    const saved = getProgressFor(slug, episodeId);
    if (saved && saved.currentTime > 15 && saved.percent < 92) {
      video.currentTime = saved.currentTime;
      setCurrentTime(saved.currentTime);
      setResumeNotice(`Melanjutkan dari ${formatTime(saved.currentTime)}`);
      setTimeout(() => setResumeNotice(null), 4000);
    }
  }

  // Track video progress, buffering, and time
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      setDuration(video.duration || 0);

      // Compute buffer percent
      if (video.buffered.length > 0 && video.duration > 0) {
        for (let i = video.buffered.length - 1; i >= 0; i--) {
          if (video.buffered.start(i) <= video.currentTime) {
            const end = video.buffered.end(i);
            setBufferedPercent(Math.min(100, (end / video.duration) * 100));
            break;
          }
        }
      }

      // Save watch progress every 5 seconds
      const now = Date.now();
      if (slug && video.duration > 0 && now - lastSaveTimeRef.current > 5000) {
        lastSaveTimeRef.current = now;
        saveWatchProgress({
          slug,
          contentType: contentType || "movie",
          title,
          posterPath: poster,
          currentTime: video.currentTime,
          duration: video.duration,
          episodeId,
          seasonNumber,
          episodeNumber
        });
      }
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onWaiting = () => setIsBuffering(true);
    const onPlaying = () => setIsBuffering(false);
    const onEnded = () => {
      setIsPlaying(false);
      // Auto-navigate to next episode if available when video finishes
      if (nextEpisodeHref) {
        window.location.href = nextEpisodeHref;
      }
    };

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("ended", onEnded);

    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("ended", onEnded);
    };
  }, [slug, contentType, title, poster, episodeId, seasonNumber, episodeNumber, nextEpisodeHref]);

  // Fullscreen change listener (Cross-platform True OS Fullscreen)
  useEffect(() => {
    const onFsChange = () => {
      const doc = document as any;
      const isFs = Boolean(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement ||
        (videoRef.current as any)?.webkitDisplayingFullscreen
      );
      setIsFullscreen(isFs);
    };

    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);
    document.addEventListener("mozfullscreenchange", onFsChange);
    document.addEventListener("MSFullscreenChange", onFsChange);

    const video = videoRef.current;
    if (video) {
      video.addEventListener("webkitbeginfullscreen", () => setIsFullscreen(true));
      video.addEventListener("webkitendfullscreen", () => setIsFullscreen(false));
    }

    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange);
      document.removeEventListener("mozfullscreenchange", onFsChange);
      document.removeEventListener("MSFullscreenChange", onFsChange);
    };
  }, []);

  // Keyboard controls (Space, F, M, Left/Right arrows, Up/Down arrows)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable) return;
      const video = videoRef.current;
      if (!video) return;

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          skipTime(-10);
          break;
        case "ArrowRight":
          e.preventDefault();
          skipTime(10);
          break;
        case "ArrowUp": {
          e.preventDefault();
          const newVol = Math.min(1, Math.round((video.volume + 0.1) * 10) / 10);
          video.volume = newVol;
          video.muted = false;
          setVolume(newVol);
          setIsMuted(false);
          handleUserActivity();
          break;
        }
        case "ArrowDown": {
          e.preventDefault();
          const newVol = Math.max(0, Math.round((video.volume - 0.1) * 10) / 10);
          video.volume = newVol;
          video.muted = newVol === 0;
          setVolume(newVol);
          setIsMuted(newVol === 0);
          handleUserActivity();
          break;
        }
        case " ":
          e.preventDefault();
          togglePlay();
          break;
        case "f":
        case "F":
          e.preventDefault();
          void toggleFullscreen();
          break;
        case "m":
        case "M":
          e.preventDefault();
          toggleMute();
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [duration]);

  function handleUserActivity() {
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (isPlaying && !isResolutionMenuOpen && !isSubtitleMenuOpen && !isSpeedMenuOpen) {
        setControlsVisible(false);
      }
    }, 2800);
  }

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
    handleUserActivity();
  }

  function skipTime(delta: number) {
    const video = videoRef.current;
    if (!video) return;
    const target = Math.max(0, Math.min(video.duration || 0, video.currentTime + delta));
    video.currentTime = target;
    setCurrentTime(target);
    handleUserActivity();
  }

  function toggleMute() {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
    handleUserActivity();
  }

  function handleVolumeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const video = videoRef.current;
    if (!video) return;
    const val = Number(e.target.value);
    video.volume = val;
    video.muted = val === 0;
    setVolume(val);
    setIsMuted(val === 0);
    handleUserActivity();
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const video = videoRef.current;
    if (!video) return;
    const target = Number(e.target.value);
    video.currentTime = target;
    setCurrentTime(target);
    handleUserActivity();
  }

  // Cross-platform True OS Fullscreen for macOS (Safari/Chrome) and Windows (Chrome/Edge/Firefox)
  function toggleFullscreen() {
    const container = viewportRef.current;
    const video = videoRef.current;
    if (!container) return;

    const doc = document as any;
    const isCurrentlyFs = Boolean(
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement ||
      (video as any)?.webkitDisplayingFullscreen
    );

    if (isCurrentlyFs) {
      if (doc.exitFullscreen) {
        doc.exitFullscreen().catch(() => {});
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        doc.msExitFullscreen();
      } else if (video && (video as any).webkitExitFullscreen) {
        (video as any).webkitExitFullscreen();
      }
      setIsFullscreen(false);
    } else {
      try {
        if (container.requestFullscreen) {
          container.requestFullscreen({ navigationUI: "hide" }).catch(() => {
            if (video && (video as any).webkitEnterFullscreen) {
              (video as any).webkitEnterFullscreen();
            } else if (document.documentElement.requestFullscreen) {
              document.documentElement.requestFullscreen().catch(() => {});
            }
          });
        } else if ((container as any).webkitRequestFullscreen) {
          (container as any).webkitRequestFullscreen();
        } else if ((container as any).mozRequestFullScreen) {
          (container as any).mozRequestFullScreen();
        } else if ((container as any).msRequestFullscreen) {
          (container as any).msRequestFullscreen();
        } else if (video && (video as any).webkitEnterFullscreen) {
          (video as any).webkitEnterFullscreen();
        }
        setIsFullscreen(true);
      } catch {
        if (video && (video as any).webkitEnterFullscreen) {
          (video as any).webkitEnterFullscreen();
        }
      }
    }
  }

  async function togglePictureInPicture() {
    const video = videoRef.current;
    if (!video) return;
    try {
      const doc = document as any;
      if (doc.pictureInPictureElement) {
        await doc.exitPictureInPicture();
      } else if (doc.pictureInPictureEnabled && video.requestPictureInPicture) {
        await video.requestPictureInPicture();
      }
    } catch {}
  }

  function selectResolution(levelId: number) {
    setCurrentLevel(levelId);
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelId;
    }
    setIsResolutionMenuOpen(false);
  }

  function selectSubtitle(lang: string) {
    setActiveSubtitleLang(lang);
    const video = videoRef.current;
    if (video && video.textTracks) {
      for (let i = 0; i < video.textTracks.length; i++) {
        const track = video.textTracks[i];
        if (lang === "off") {
          track.mode = "disabled";
        } else {
          track.mode = track.language === lang ? "showing" : "disabled";
        }
      }
    }
    setIsSubtitleMenuOpen(false);
  }

  const resolvedResolutionText = useMemo(() => {
    if (currentLevel === -1) {
      if (activeLevelIndex >= 0 && levels[activeLevelIndex]) {
        return `Auto (${levels[activeLevelIndex].label})`;
      }
      return "Auto (1080p)";
    }
    const found = levels.find((l) => l.id === currentLevel);
    return found ? found.label : nativeResolution || "1080p";
  }, [currentLevel, activeLevelIndex, levels, nativeResolution]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="player-shell">
      <div
        ref={viewportRef}
        className={`player-cinema-viewport ${isFullscreen ? "fullscreen-active" : ""}`}
        onMouseMove={handleUserActivity}
        onMouseLeave={() => {
          if (isPlaying && !isResolutionMenuOpen && !isSubtitleMenuOpen && !isSpeedMenuOpen) {
            setControlsVisible(false);
          }
        }}
      >
        {/* Subtle Vignettes for High Contrast UI */}
        <div className={`player-vignette-top ${controlsVisible ? "visible" : ""}`} />
        <div className={`player-vignette-bottom ${controlsVisible ? "visible" : ""}`} />

        {/* Top Header Bar Overlay */}
        <div className={`player-top-header ${controlsVisible ? "visible" : ""}`}>
          <div className="player-title-info">
            <span className="player-title-heading">{title}</span>
            {seasonNumber && episodeNumber ? (
              <span className="player-episode-badge">S{seasonNumber}E{episodeNumber}</span>
            ) : null}
          </div>
          <div className="player-top-badges">
            <span className="player-hd-badge">Full HD 1080p</span>
          </div>
        </div>

        {/* Center Loading Spinner (during buffering) */}
        {isBuffering ? (
          <div className="player-buffering-indicator">
            <div className="cinema-spinner" />
          </div>
        ) : null}

        {/* Center Pause/Play Ripple Trigger */}
        {!isPlaying && status !== "loading" ? (
          <button
            type="button"
            className="player-center-play-trigger"
            onClick={togglePlay}
            aria-label="Putar Video"
          >
            <div className="center-play-circle">
              <svg viewBox="0 0 24 24" width="36" height="36" fill="currentColor">
                <polygon points="6 4 20 12 6 20 6 4" />
              </svg>
            </div>
          </button>
        ) : null}

        {/* Resume notification toast */}
        {resumeNotice ? (
          <div className="player-resume-toast animate-fade-in">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>{resumeNotice}</span>
          </div>
        ) : null}

        {/* Smart Skip Intro Button with dynamic countdown */}
        {isInsideIntro ? (
          <button
            type="button"
            className="smart-skip-intro-btn animate-fade-in"
            onClick={(e) => {
              e.stopPropagation();
              if (videoRef.current) {
                videoRef.current.currentTime = introEndTime;
                setCurrentTime(introEndTime);
              }
            }}
            title="Lewati Intro"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M4 18l8.5-6L4 6v12zM12.5 18l8.5-6-8.5-6v12z" />
            </svg>
            <span>Lewati Intro (+{remainingIntroSeconds}s)</span>
          </button>
        ) : null}

        {/* Smart Next Episode Button (Credits Outro) */}
        {isNearEnd && nextEpisodeHref ? (
          <Link
            href={nextEpisodeHref}
            className="smart-next-ep-btn animate-fade-in"
            title="Episode Selanjutnya"
          >
            <span>Episode Selanjutnya ({remainingOutroSeconds}s)</span>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
            </svg>
          </Link>
        ) : null}

        {/* Native Video Element */}
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          ref={videoRef}
          className="player-video"
          poster={poster}
          controls={false}
          playsInline
          preload="auto"
          crossOrigin="anonymous"
          onClick={togglePlay}
          onDoubleClick={toggleFullscreen}
        >
          {subtitles.map((track) => (
            <track
              key={track.lang}
              kind="subtitles"
              src={`/api/playback/subtitle?u=${encodeURIComponent(track.path)}`}
              srcLang={track.lang}
              label={track.label}
              default={track.lang === "id"}
            />
          ))}
        </video>

        {/* Bottom Control Bar Overlay */}
        <div className={`custom-control-bar ${controlsVisible || !isPlaying || isResolutionMenuOpen || isSubtitleMenuOpen || isSpeedMenuOpen ? "visible" : ""}`}>
          {/* Enhanced Seek Bar with Buffered Visualization */}
          <div className="control-progress-row">
            <div className="seek-bar-track">
              <div className="seek-bar-buffered" style={{ width: `${bufferedPercent}%` }} />
              <div className="seek-bar-played" style={{ width: `${progressPercent}%` }} />
            </div>
            <input
              type="range"
              className="control-seek-bar"
              min="0"
              max={duration || 100}
              step="0.1"
              value={currentTime}
              onChange={handleSeek}
              aria-label="Seek Video"
            />
          </div>

          <div className="control-buttons-row">
            {/* Left Controls: Play, -10s, +10s, Volume, Time */}
            <div className="control-group-left">
              {/* Play / Pause */}
              <button
                type="button"
                className="ctrl-btn-modern play-pause-btn"
                onClick={togglePlay}
                aria-label={isPlaying ? "Jeda (Spasi)" : "Putar (Spasi)"}
                title={isPlaying ? "Jeda (Spasi)" : "Putar (Spasi)"}
              >
                {isPlaying ? (
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" rx="1.5" />
                    <rect x="14" y="4" width="4" height="16" rx="1.5" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                    <polygon points="6 4 20 12 6 20 6 4" />
                  </svg>
                )}
              </button>

              {/* Rewind 10s (Clean Modern Circular Vector matching Image 2) */}
              <button
                type="button"
                className="ctrl-btn-modern"
                onClick={() => skipTime(-10)}
                aria-label="Mundur 10 detik"
                title="Mundur 10 detik"
              >
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4.5 12a7.5 7.5 0 1 1 2.2 5.3" />
                  <polyline points="4.5 7 4.5 12 9.5 12" />
                  <text x="12" y="14.5" fontSize="7" fontWeight="800" textAnchor="middle" fill="currentColor" stroke="none" fontFamily="ui-sans-serif, system-ui, sans-serif">10</text>
                </svg>
              </button>

              {/* Forward 10s (Clean Modern Circular Vector matching Image 2) */}
              <button
                type="button"
                className="ctrl-btn-modern"
                onClick={() => skipTime(10)}
                aria-label="Maju 10 detik"
                title="Maju 10 detik"
              >
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19.5 12a7.5 7.5 0 1 0-2.2 5.3" />
                  <polyline points="19.5 7 19.5 12 14.5 12" />
                  <text x="12" y="14.5" fontSize="7" fontWeight="800" textAnchor="middle" fill="currentColor" stroke="none" fontFamily="ui-sans-serif, system-ui, sans-serif">10</text>
                </svg>
              </button>
              {/* Volume Group */}
              <div className="control-volume-wrapper" title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}>
                <button
                  type="button"
                  className="ctrl-btn-modern"
                  onClick={toggleMute}
                  aria-label={isMuted ? "Bunyikan Suara (M)" : "Bisukan Suara (M)"}
                >
                  {isMuted || volume === 0 ? (
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
                      <line x1="23" y1="9" x2="17" y2="15" />
                      <line x1="17" y1="9" x2="23" y2="15" />
                    </svg>
                  ) : volume < 0.5 ? (
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                    </svg>
                  )}
                </button>
                <input
                  type="range"
                  className="volume-slider-modern"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  aria-label="Atur Volume"
                />
              </div>

              {/* Timestamp */}
              <div className="control-timestamp">
                <span className="time-curr">{formatTime(currentTime)}</span>
                <span className="time-sep">/</span>
                <span className="time-total">{formatTime(duration)}</span>
              </div>
            </div>

            {/* Right Controls: Next Ep, Speed, CC, Quality, PiP, Fullscreen */}
            <div className="control-group-right">
              {/* Next Episode Button */}
              {nextEpisodeHref ? (
                <Link
                  href={nextEpisodeHref}
                  className="ctrl-btn-modern"
                  aria-label="Episode Selanjutnya"
                  title="Episode Selanjutnya"
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                  </svg>
                </Link>
              ) : null}

              {/* Speed Popover */}
              <div className="ctrl-popover-anchor">
                <button
                  type="button"
                  className={`ctrl-pill-btn ${isSpeedMenuOpen ? "active" : ""}`}
                  onClick={() => {
                    setIsSpeedMenuOpen((prev) => !prev);
                    setIsResolutionMenuOpen(false);
                    setIsSubtitleMenuOpen(false);
                  }}
                  title="Kecepatan Putar"
                >
                  {playbackRate === 1 ? "1x" : `${playbackRate}x`}
                </button>

                {isSpeedMenuOpen ? (
                  <div className="inplayer-bottom-popup" role="menu">
                    <div className="inplayer-menu-header">
                      <span>Kecepatan</span>
                    </div>
                    <div className="inplayer-menu-list">
                      {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          className={`inplayer-menu-item ${playbackRate === rate ? "active" : ""}`}
                          onClick={() => {
                            if (videoRef.current) videoRef.current.playbackRate = rate;
                            setPlaybackRate(rate);
                            setIsSpeedMenuOpen(false);
                          }}
                        >
                          <span>{rate === 1 ? "1x (Normal)" : `${rate}x`}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Subtitles (CC) Popover */}
              {subtitles.length > 0 ? (
                <div className="ctrl-popover-anchor">
                  <button
                    type="button"
                    className={`ctrl-pill-btn ${isSubtitleMenuOpen ? "active" : ""}`}
                    onClick={() => {
                      setIsSubtitleMenuOpen((prev) => !prev);
                      setIsResolutionMenuOpen(false);
                      setIsSpeedMenuOpen(false);
                    }}
                    title="Pilihan Subtitle"
                  >
                    CC
                  </button>

                  {isSubtitleMenuOpen ? (
                    <div className="inplayer-bottom-popup" role="menu">
                      <div className="inplayer-menu-header">
                        <span>Subtitle</span>
                      </div>
                      <div className="inplayer-menu-list">
                        <button
                          type="button"
                          className={`inplayer-menu-item ${activeSubtitleLang === "off" ? "active" : ""}`}
                          onClick={() => selectSubtitle("off")}
                        >
                          <span>Nonaktif</span>
                        </button>
                        {subtitles.map((track) => (
                          <button
                            key={track.lang}
                            type="button"
                            className={`inplayer-menu-item ${activeSubtitleLang === track.lang ? "active" : ""}`}
                            onClick={() => selectSubtitle(track.lang)}
                          >
                            <span>{track.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* Quality / Resolution Popover */}
              <div className="ctrl-popover-anchor">
                <button
                  type="button"
                  className={`ctrl-pill-btn ${isResolutionMenuOpen ? "active" : ""}`}
                  onClick={() => {
                    setIsResolutionMenuOpen((prev) => !prev);
                    setIsSubtitleMenuOpen(false);
                    setIsSpeedMenuOpen(false);
                  }}
                  title="Kualitas Video"
                >
                  <span>{resolvedResolutionText}</span>
                </button>

                {isResolutionMenuOpen ? (
                  <div className="inplayer-bottom-popup" role="menu">
                    <div className="inplayer-menu-header">
                      <span>Resolusi Video</span>
                    </div>
                    <div className="inplayer-menu-list">
                      {levels.length > 0 ? (
                        <>
                          <button
                            type="button"
                            className={`inplayer-menu-item ${currentLevel === -1 ? "active" : ""}`}
                            onClick={() => selectResolution(-1)}
                          >
                            <span>Auto (Adaptif)</span>
                          </button>
                          {levels.map((lvl) => (
                            <button
                              key={lvl.id}
                              type="button"
                              className={`inplayer-menu-item ${currentLevel === lvl.id ? "active" : ""}`}
                              onClick={() => selectResolution(lvl.id)}
                            >
                              <span>{lvl.label}</span>
                            </button>
                          ))}
                        </>
                      ) : (
                        <div className="inplayer-menu-item active">
                          <span>{nativeResolution || "1080p Full HD"}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Picture in Picture Button */}
              <button
                type="button"
                className="ctrl-btn-modern"
                onClick={togglePictureInPicture}
                title="Picture in Picture"
                aria-label="Picture in Picture"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <rect x="12" y="10" width="8" height="6" rx="1" fill="currentColor" fillOpacity="0.3" />
                </svg>
              </button>

              {/* Fullscreen Button (Cross-platform True OS Fullscreen for macOS & Windows) */}
              <button
                type="button"
                className="ctrl-btn-modern"
                onClick={toggleFullscreen}
                aria-label={isFullscreen ? "Keluar Layar Penuh (F)" : "Layar Penuh (F)"}
                title={isFullscreen ? "Keluar Layar Penuh (F)" : "Layar Penuh (F)"}
              >
                {isFullscreen ? (
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="4 14 10 14 10 20" />
                    <polyline points="20 10 14 10 14 4" />
                    <line x1="14" y1="10" x2="21" y2="3" />
                    <line x1="3" y1="21" x2="10" y2="14" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 3 21 3 21 9" />
                    <polyline points="9 21 3 21 3 15" />
                    <line x1="21" y1="3" x2="14" y2="10" />
                    <line x1="3" y1="21" x2="10" y2="14" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
