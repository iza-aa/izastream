"use client";

import { useState } from "react";
import Link from "next/link";

interface PublicParty {
  id: string;
  roomName: string;
  title: string;
  type: "movie" | "series";
  slug: string;
  host: string;
  membersCount: number;
}

export default function WatchPartyPage() {
  const [roomCode, setRoomCode] = useState("");
  const [createdNotice, setCreatedNotice] = useState<string | null>(null);

  const activeParties: PublicParty[] = [
    {
      id: "WP-CYBER",
      roomName: "Anime Night: Cyberpunk Ep.2",
      title: "Cyberpunk: Edgerunners",
      type: "series",
      slug: "cyberpunk-edgerunners-2022?episode=32050e32-76f6-4e53-9730-35ffa5459a9c&season=1&ep=2",
      host: "haikal",
      membersCount: 18
    },
    {
      id: "WP-HOPE",
      roomName: "Nonton Bareng Film Hope (2026)",
      title: "Hope (2026)",
      type: "movie",
      slug: "hope-2026",
      host: "aditya",
      membersCount: 9
    },
    {
      id: "WP-BC17",
      roomName: "Maraton Black Clover Ep.1",
      title: "Black Clover",
      type: "series",
      slug: "black-clover-2017",
      host: "kurnia",
      membersCount: 14
    },
    {
      id: "WP-WIRE",
      roomName: "The Wire Crime Investigation Club",
      title: "The Wire",
      type: "series",
      slug: "the-wire-2002",
      host: "dimas",
      membersCount: 7
    }
  ];

  function handleCreateRoom(e: React.FormEvent) {
    e.preventDefault();
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setCreatedNotice(`Ruang berhasil dibuat dengan kode: ${code}. Bagikan kode ini ke teman Anda.`);
  }

  return (
    <div className="page">
      <div className="page-heading">
        <span className="eyebrow">Nonton Bareng</span>
        <h1 style={{ margin: "6px 0 4px", fontSize: "clamp(26px, 3.5vw, 42px)", fontWeight: 900 }}>Watch Party</h1>
        <p className="muted small">Tonton film dan serial bersama teman dengan sinkronisasi waktu pemutaran otomatis.</p>
      </div>

      {createdNotice ? (
        <div style={{ background: "rgba(15, 66, 192, 0.15)", border: "1px solid var(--c-sky)", borderRadius: "12px", padding: "14px 18px", margin: "20px 0", color: "#fff", fontSize: "14px", fontWeight: 600 }}>
          {createdNotice}
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px", marginTop: "24px" }}>
        {/* Create Room Card */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "24px", display: "grid", gap: "14px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 800, margin: 0 }}>Buat Ruang Baru</h2>
          <p className="muted small" style={{ margin: 0 }}>
            Pilih film atau serial, lalu bagikan kode ruang ke teman untuk nonton bareng.
          </p>
          <form onSubmit={handleCreateRoom} style={{ display: "grid", gap: "12px" }}>
            <input
              placeholder="Nama Ruang (misal: Nobar Malam Minggu)"
              required
              style={{ background: "var(--bg-soft)", border: "1px solid var(--border)", borderRadius: "10px", padding: "11px 14px", color: "var(--text)", fontSize: "13px", outline: "none" }}
            />
            <button type="submit" className="primary-button" style={{ justifyContent: "center" }}>
              Buat Ruang Sekarang
            </button>
          </form>
        </div>

        {/* Join Room Card */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "24px", display: "grid", gap: "14px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 800, margin: 0 }}>Gabung ke Ruang</h2>
          <p className="muted small" style={{ margin: 0 }}>
            Masukkan kode 6 digit yang diberikan oleh host pembuat ruang.
          </p>
          <div style={{ display: "flex", gap: "10px" }}>
            <input
              placeholder="KODE RUANG"
              maxLength={8}
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              style={{ flex: 1, background: "var(--bg-soft)", border: "1px solid var(--border)", borderRadius: "10px", padding: "11px 14px", color: "var(--text)", fontSize: "13px", outline: "none", letterSpacing: "0.1em", fontWeight: 700 }}
            />
            <Link
              href={roomCode ? `/watch/series/cyberpunk-edgerunners-2022?party=${roomCode}` : "#"}
              className="primary-button"
              style={{ padding: "0 20px" }}
            >
              Gabung
            </Link>
          </div>
        </div>
      </div>

      {/* Active Public Rooms */}
      <div style={{ marginTop: "44px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 800, margin: "0 0 16px" }}>Ruang Tontonan Komunitas Aktif</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
          {activeParties.map((p) => (
            <div key={p.id} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "14px", padding: "18px", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "14px" }}>
              <div>
                <span className="hub-card-badge">{p.membersCount} Penonton Aktif</span>
                <h3 style={{ fontSize: "15px", fontWeight: 700, margin: "10px 0 4px" }}>{p.roomName}</h3>
                <p className="muted small" style={{ margin: 0 }}>Judul: {p.title} · Host: @{p.host}</p>
              </div>
              <Link className="secondary-button" href={`/watch/${p.type === "movie" ? "movie" : "series"}/${p.slug}`} style={{ textAlign: "center", display: "block" }}>
                Masuk Ruang
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
