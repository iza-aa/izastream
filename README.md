# IDLIX (z2.idlixku.com) — Rekonstruksi & Reverse Engineering Proyek Web

Dokumen ini merangkum hasil investigasi reverse engineering, deobfuskasi, de-minifikasi, unbundling, dan rekonstruksi penuh terhadap web application streaming **IDLIX** (`https://z2.idlixku.com`) menggunakan rangkaian perangkat analitik **REA (Reverse Engineering Assistant) v6.7.0**.

Proyek ini telah direkonstruksi ke dalam format **Next.js 16 (App Router)** yang valid dan siap dijalankan secara lokal secara mandiri (*offline-first*), lengkap dengan unbundled source modules, de-minified chunk inventory, manifest aset web, serta katalog endpoint API dan route frontend.

---

## 1. Ringkasan Eksekutif & Karakteristik Target

| Parameter | Nilai Observasi / Temuan REA |
|---|---|
| **URL Target** | `https://z2.idlixku.com` (cermin aktif jaringan IDLIX) |
| **Waktu Observasi** | 24 Oktober 2026 |
| **Proteksi Perimeter** | Cloudflare WAF, Bot Management, Turnstile challenge (`307` temporary redirect diikuti verifikasi interaktif, kemudian clearance cookie) |
| **Framework Frontend** | **Next.js 16.4.2** (Turbopack bundler, React Server Components hydration stream `self.__next_f`) |
| **Runtime UI** | **React 19.3.0** (`react`, `react-dom`) |
| **Styling Engine** | **Tailwind CSS v4** (utilitas compiled dengan modern `@property`, `@supports`, CSS variables `--tw-*`) |
| **State & HTTP Layer** | Client HTTP tersentralisasi (`module_39611.js`) dengan cache invalidation listener (`cache-invalidated`) dan session renewal |
| **Telemetri / Third-Party** | Google Analytics 4 (`G-EY0V76TSLQ`), Cloudflare Web Analytics / Insights, XYZ Chat customer widget (`org_id: 1066`) |
| **Media Pipeline** | Metadata disinkronkan ke The Movie Database (TMDB) dan IMDb; alur streaming diamankan token Pentos / session claim |
| **Jalur Admin Terselubung** | Jalur admin dikonfigurasi melalui fallback `NEXT_PUBLIC_ADMIN_PATH \|\| "/bajalapis"` untuk mengelabui deteksi otomatis |

---

## 2. Arsitektur Aplikasi & Rekayasa Balik Bundel

### 2.1 Arsitektur Next.js & Turbopack
Bundle target dikemas menggunakan **Turbopack** (Next.js 16). Seluruh modul dimuat melalui array dinamis global:
```javascript
(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([
  scriptRef,
  moduleId,
  (requireFn, initFn, exports) => { ... }
]);
```
- Total **26 unique chunks** terekam dan diekspor (3.8 MB kode JavaScript).
- Seluruh 26 chunks telah di-beautify dan diuraikan melalui AST parser (`acorn`) ke dalam **332 modul terpisah** yang tersimpan di direktori `src/modules/`.
- Setiap modul dilengkapi anotasi header berisi metadata: *chunk asal*, *module ID numerik*, *ekspor terdeteksi*, serta *relasi dependensi internal* (`e.r(...)` untuk require dan `e.i(...)` untuk import).

### 2.2 Client Data & Lapisan API Tersentralisasi (`module_39611.js`)
Pemeriksaan AST mendalam pada chunk `2r8ab1h3v6k7l.js` mengungkap modul klien utama (`module_39611.js`, 118 KB) yang mendefinisikan seluruh antarmuka komunikasi ke backend:
- **`eA(path, options)`**: Helper wrapper utama pemanggilan `fetch` dengan penanganan header sesi otomatis, interceptor HTTP 401, serta trigger auto-renewal ke `/api/auth/session/renew`.
- **`eL(path, cacheKey, options)`**: Wrapper pembacaan ber-cache (*read-through cache*) untuk kueri katalog, koleksi, dan homepage.
- **Cache Invalidation Channel**: Menggunakan CustomEvent browser `cache-invalidated` untuk memicu refresh parsial saat ada mutasi komentar, playlist, atau profil.

---

## 3. Daftar Lengkap Route Halaman Frontend

Berikut adalah pemetaan lengkap rute halaman frontend yang teridentifikasi dari navigasi utama (`module_42277.js`), tautan DOM HTML, dan handler perutean client-side:

| Rute Halaman | Tipe / Hak Akses | Status Rekonstruksi Lokal | Deskripsi Fungsionalitas |
|---|---|---|---|
| `/` | Publik | **Aktif** (`app/page.tsx`) | Halaman beranda dengan hero Featured, rail Trending, Network Originals, Collections, dan Recently Added. |
| `/movie` | Publik | **Aktif** (`app/movie/page.tsx`) | Katalog film terkurasi dengan filter dan pagination. |
| `/movie/[slug]` | Publik | **Aktif** (`app/movie/[slug]/page.tsx`) | Halaman detail film: backdrop, sinopsis, rating, tagar genre, TMDB/IMDb link, dan tombol pemutar. |
| `/series` | Publik | **Aktif** (`app/series/page.tsx`) | Katalog serial televisi dan anime. |
| `/series/[slug]` | Publik | **Aktif** (`app/series/[slug]/page.tsx`) | Halaman detail serial TV: jumlah season, daftar episode, dan status tayang. |
| `/series/[slug]/season/[seasonNumber]/episode/[episodeNumber]` | Publik | Rute Didokumentasikan | Halaman pemutar spesifik per episode serial TV. |
| `/shorts` | Publik | **Aktif** (`app/shorts/page.tsx`) | Feed video format vertikal (*short-form video*) dengan counter engagement dan sistem likes. |
| `/genre` | Publik | **Aktif** (`app/genre/page.tsx`) | Indeks seluruh kategori genre konten yang tersedia di platform. |
| `/genre/[slug]` | Publik | **Aktif** (`app/genre/[slug]/page.tsx`) | Filter katalog berdasarkan genre tertentu (misal: `/genre/action`, `/genre/drama`). |
| `/country` | Publik | **Aktif** (`app/country/page.tsx`) | Indeks navigasi berdasarkan negara asal produksi. |
| `/country/[slug]` | Publik | **Aktif** (`app/country/[slug]/page.tsx`) | Filter katalog berdasarkan negara produksi (misal: `/country/south-korea`, `/country/japan`). |
| `/year` | Publik | **Aktif** (`app/year/page.tsx`) | Indeks arsip rilis tahunan. |
| `/year/[year]` | Publik | **Aktif** (`app/year/[year]/page.tsx`) | Filter katalog berdasarkan tahun rilis spesifik (misal: `/year/2026`, `/year/2022`). |
| `/collection` | Publik | **Aktif** (`app/collection/page.tsx`) | Daftar kurasi koleksi tematik (Marvel, Studio Ghibli, dsb.). |
| `/collection/[slug]` | Publik | **Aktif** (`app/collection/[slug]/page.tsx`) | Detail koleksi beserta seluruh judul yang termasuk di dalamnya. |
| `/network` | Publik | **Aktif** (`app/network/page.tsx`) | Eksplorasi tayangan berdasarkan jaringan orisinal (HBO, Netflix, Disney+, dsb.). |
| `/watch-party` | Publik / Member | **Aktif** (`app/watch-party/page.tsx`) | Beranda fitur nonton bareng (Watch Party) tersinkronisasi. |
| `/watch-parties/[id]` | Member | Rute Didokumentasikan | Ruang sesi Watch Party aktif dengan kontrol host dan websocket sinkronisasi. |
| `/search` | Publik | **Aktif** (`app/search/page.tsx`) | Pencarian konten instan berdasarkan judul, judul orisinal, atau sinopsis. |
| `/auth/login` | Publik | **Aktif** (`app/auth/login/page.tsx`) | Form autentikasi member menggunakan identifier (email/username) dan password. |
| `/auth/register` | Publik | **Aktif** (`app/auth/register/page.tsx`) | Form pendaftaran akun baru dilengkapi validasi ketersediaan username instan. |
| `/settings` | Member | **Aktif** (`app/settings/page.tsx`) | Pengaturan profil pengguna, preferensi audio/subtitle player, dan sesi login aktif. |
| `/notifications` | Member | **Aktif** (`app/notifications/page.tsx`) | Pusat notifikasi aktivitas akun, balasan komentar, dan rilis serial favorit. |
| `/watchlist` | Member | **Aktif** (`app/watchlist/page.tsx`) | Daftar judul yang disimpan untuk ditonton di kemudian hari. |
| `/watch-progress` | Member | **Aktif** (`app/watch-progress/page.tsx`) | Daftar progres tayangan yang sedang berlangsung (*Continue Watching*). |
| `/plans` | Publik / Member | **Aktif** (`app/plans/page.tsx`) | Katalog tingkatan langganan premium beserta metode gerbang pembayaran. |
| `/coins` & `/balance` | Member | **Aktif** (`app/coins/page.tsx`, `/balance/page.tsx`) | Dompet koin pengguna, klaim harian (*daily check-in*), dan histori transaksi. |
| `/leaderboard` | Publik | **Aktif** (`app/leaderboard/page.tsx`) | Papan peringkat pemegang koin terbanyak di komunitas. |
| `/request` | Member | **Aktif** (`app/request/page.tsx`) | Permintaan penambahan judul film atau serial baru ke pustaka. |
| `/changelog` | Publik | **Aktif** (`app/changelog/page.tsx`) | Catatan versi dan pembaruan rilis klien web (versi klien saat ini: `1.7.1`). |
| `/app` | Publik | **Aktif** (`app/app/page.tsx`) | Unduhan aplikasi seluler dan instruksi pairing ke perangkat smart TV. |
| `/user/[username]` | Publik | **Aktif** (`app/user/[username]/page.tsx`) | Profil publik pengguna dengan tab Watchlist, Favourites, Reviews, dan Shorts. |
| `/bajalapis` | Admin | **Aktif** (`app/bajalapis/page.tsx`) | **Konsol Administrasi Terselubung** (`NEXT_PUBLIC_ADMIN_PATH`). |

---

## 4. Katalog Endpoint API Backend

Seluruh endpoint backend berada di bawah base path `/api`. Berdasarkan analisis sintaks AST pada modul klien, terdeteksi **318 endpoint unik**:
- **GET**: 163 endpoint
- **POST**: 92 endpoint
- **PATCH**: 28 endpoint
- **DELETE**: 27 endpoint
- **PUT**: 8 endpoint

Katalog lengkap tersimpan di berkas `analysis_api_catalog.json`. Di bawah ini adalah ringkasan modul API utama beserta contoh payload terekam:

### 4.1 Modul Publik & Konten
| Metode | Endpoint Path | Nama Operasi Client | Keterangan & Parameter |
|---|---|---|---|
| `GET` | `/api/homepage` | `getData` | Mengambil seluruh blok layout beranda (`above`, `below`, `ads`). |
| `GET` | `/api/homepage/featured` | `getFeatured` | Mengambil daftar sorotan utama slider beranda. |
| `GET` | `/api/homepage/modules` | `getModules` | Mengambil urutan modul konfigurasi beranda. |
| `GET` | `/api/movies` | `list` | Daftar film dengan kueri `?page=`, `?limit=`, `?genre=`, `?year=`. |
| `GET` | `/api/movies/${slug}` | `getBySlug` | Mengambil metadata lengkap satu film. |
| `GET` | `/api/movies/${slug}/related` | `getRelated` | Rekomendasi film terkait berdasarkan kesamaan genre/aktor. |
| `GET` | `/api/series` | `list` | Daftar serial TV dengan pagination dan filter. |
| `GET` | `/api/series/${slug}` | `getBySlug` | Metadata serial TV beserta struktur season. |
| `GET` | `/api/series/${slug}/season/${num}` | `getSeason` | Detail episode dalam satu season. |
| `GET` | `/api/genres` | `list` | Mengembalikan seluruh daftar genre yang terdaftar. |
| `GET` | `/api/browse/countries` | `countries` | Mengembalikan daftar negara asal produksi. |
| `GET` | `/api/browse/years` | `years` | Mengembalikan daftar tahun arsip konten. |
| `GET` | `/api/search` | `search` | Kueri pencarian multi-tipe `?q=`. |
| `POST` | `/api/search/track` | `track` | Melacak analitik kata kunci yang dicari pengguna. |
| `GET` | `/api/search/trending` | `getTrending` | Mengambil daftar kata kunci dan judul yang sedang populer dicari. |

### 4.2 Modul Autentikasi & Akun (`/api/auth/*`)
| Metode | Endpoint Path | Nama Operasi Client | Keterangan |
|---|---|---|---|
| `POST` | `/api/auth/login` | `login` | Login sesi dengan payload `{ identifier, password }` dan header perangkat. |
| `POST` | `/api/auth/register` | `register` | Pendaftaran akun baru `{ username, email, password }`. |
| `POST` | `/api/auth/logout` | `logout` | Logout sesi lokal atau seluruh perangkat (`scope: "everywhere"`). |
| `GET` | `/api/auth/me` | `getMe` | Memeriksa identitas sesi aktif pengguna (mengembalikan 401 jika unauthenticated). |
| `PATCH` | `/api/auth/me` | `updateProfile` | Memperbarui nama tampilan, bio, atau avatar pengguna. |
| `PATCH` | `/api/auth/me/player-preferences` | `updatePlayerPreferences` | Menyimpan preferensi default audio dan subtitle. |
| `POST` | `/api/auth/session/renew` | `renewSession` | Memperpanjang token sesi sebelum kedaluwarsa. |
| `GET` | `/api/auth/sessions` | `getSessions` | Menampilkan seluruh perangkat yang sedang login. |
| `POST` | `/api/auth/sessions/revoke` | `revokeSession` | Mencabut sesi perangkat tertentu. |
| `GET` | `/api/auth/availability` | `checkAvailability` | Memeriksa ketersediaan email atau username saat pendaftaran. |

### 4.3 Modul Pemutaran & Streaming (`/api/watch/*`)
| Metode | Endpoint Path | Nama Operasi Client | Keterangan |
|---|---|---|---|
| `GET` | `/api/watch/play-info/${type}/${slug}` | `getPlayInfo` | Mengambil manifest HLS, URL CDN, dan daftar audio/subtitle. |
| `POST` | `/api/watch/session/claim` | `claimSession` | Mengklaim tiket sesi pemutaran token Pentos. |
| `POST` | `/api/watch/session/refresh-claim` | `refreshClaim` | Me-refresh token streaming yang sedang berjalan. |
| `POST` | `/api/watch/player-events/summary` | `reportSummary` | Telemetri pemutaran: buffer duration, bitrate, dan resolusi. |
| `GET` | `/api/watch-progress` | `listProgress` | Mengambil progres waktu tonton pengguna saat ini. |
| `PUT` | `/api/watch-progress/${type}/${id}` | `updateProgress` | Menyimpan checkpoint detik pemutaran terakhir. |
| `DELETE` | `/api/auth/me/watch-history` | `clearWatchHistory` | Menghapus seluruh riwayat tontonan akun. |

### 4.4 Modul Interaksi, Komunitas & Rewards
| Metode | Endpoint Path | Nama Operasi Client | Keterangan |
|---|---|---|---|
| `GET` | `/api/comments` | `list` | Mengambil daftar komentar dengan sorting (`best`, `newest`). |
| `POST` | `/api/comments` | `create` | Mengirimkan komentar baru pada judul film/serial. |
| `POST` | `/api/comments/${id}/vote` | `like` | Memberikan upvote/downvote pada komentar. |
| `GET` | `/api/watchlist` | `list` | Mengambil daftar film/serial yang ditandai pengguna. |
| `POST` | `/api/watchlist` | `add` | Menambahkan judul ke dalam watchlist. |
| `DELETE` | `/api/watchlist/${id}` | `remove` | Menghapus judul dari watchlist. |
| `GET` | `/api/coins/balance` | `getBalance` | Mengambil saldo koin pengguna. |
| `POST` | `/api/coins/daily/claim` | `claimDaily` | Klaim hadiah koin harian. |
| `GET` | `/api/coins/leaderboard/holders` | `getLeaderboardHolders` | Peringkat publik komunitas pengguna koin. |
| `GET` | `/api/requests` | `list` | Daftar request film/serial dari komunitas. |
| `POST` | `/api/requests/${id}/vote` | `vote` | Memberikan vote agar request diprioritaskan tim konten. |

### 4.5 Modul Watch Party & Video Shorts
| Metode | Endpoint Path | Nama Operasi Client | Keterangan |
|---|---|---|---|
| `GET` | `/api/watch-parties/policy` | `getPolicy` | Kebijakan dan terms sesi Watch Party bersama. |
| `POST` | `/api/watch-parties` | `createParty` | Membuka room watch party baru sebagai host. |
| `POST` | `/api/watch-parties/connection-reservations` | `reserveConnection` | Menyiapkan handshake websocket untuk sinkronisasi video. |
| `GET` | `/api/shorts/feed` | `getFeed` | Mengambil daftar video vertikal dengan kursor pagination. |
| `POST` | `/api/shorts/${id}/like` | `likeShort` | Menyukai video short. |
| `POST` | `/api/shorts/upload` | `uploadShort` | Endpoint upload klip video pendek oleh pengguna. |

### 4.6 Modul Konsol Admin (`/api/admin/*` — Akses melalui `/bajalapis`)
| Metode | Endpoint Path | Nama Operasi Client | Keterangan |
|---|---|---|---|
| `GET` | `/api/admin/analytics/overview` | `overview` | Ringkasan metrik tayang, pencarian, dan pengguna baru harian. |
| `GET` | `/api/admin/health` | `getHealth` | Status operasional database, cache Redis, dan upstream CDN. |
| `POST` | `/api/admin/cache/flush` | `flush` | Membersihkan cache Redis frontend secara global. |
| `POST` | `/api/admin/cache/pentos-content` | `refreshPentosContent` | Re-fetch dan re-cache metadata token stream Pentos. |
| `GET` | `/api/admin/database/overview` | `databaseOverview` | Ukuran tabel dan status indeks database PostgreSQL. |
| `POST` | `/api/admin/database/vacuum` | `vacuum` | Menjalankan vacuum database maintenance. |
| `GET` | `/api/admin/domain` | `getDomainStatus` | Status sertifikat SSL dan rotasi domain mirror cadangan. |
| `POST` | `/api/admin/comments/approve-bulk` | `approveBulk` | Moderasi persetujuan komentar yang masuk antrean hold. |
| `POST` | `/api/admin/users/${id}/ban` | `banUser` | Memblokir akun atau memblokir fingerprint perangkat pengguna. |

---

### 4.7 Sampel Struktur Respons Nyata (Hasil Live Capture)

#### A. Sampel `GET /api/homepage` (Status 200, ringkasan struktur)
```json
{
  "above": [
    {
      "id": "2095c14e-0b3c-4539-ac77-861545adee27",
      "type": "featured",
      "title": "Featured",
      "slug": "featured",
      "data": [
        {
          "id": "781cd016-678a-42ef-b312-098a6f33022c",
          "contentType": "tv_series",
          "content": {
            "id": "c12f3da3-0071-468d-bbd2-0648c325d1f2",
            "tmdbId": 105248,
            "imdbId": "tt12590266",
            "title": "Cyberpunk: Edgerunners",
            "slug": "cyberpunk-edgerunners-2022",
            "originalTitle": "サイバーパンク: エッジランナーズ",
            "overview": "In a dystopia riddled with corruption and cybernetic implants...",
            "tagline": "Just keep running.",
            "posterPath": "/tGwHJVf9dYJjHlvyOqbGq3Y1Wpc.jpg",
            "backdropPath": "/bknKZO7DWVYKeByuJMnGI46PFZg.jpg",
            "logoPath": "/2wgUnrYEGtbcpZCl83ta2hS8d6J.png",
            "firstAirDate": "2022-09-13",
            "numberOfSeasons": 1,
            "numberOfEpisodes": 10,
            "voteAverage": 8.47,
            "originalLanguage": "ja",
            "country": "JP",
            "genres": [
              { "name": "Animation" },
              { "name": "Sci-Fi & Fantasy" },
              { "name": "Action & Adventure" }
            ]
          }
        }
      ]
    }
  ],
  "below": [
    { "type": "trending", "title": "Trending Now", "data": [ ... ] },
    { "type": "trending", "title": "Trending in Indonesia", "data": [ ... ] },
    { "type": "network", "title": "Network Originals", "data": [ ... ] },
    { "type": "collection", "title": "Collections", "data": [ ... ] },
    { "type": "latest_movies", "title": "Recently Added Movies", "data": [ ... ] },
    { "type": "latest_series", "title": "Recently Added Series", "data": [ ... ] }
  ],
  "ads": [
    {
      "id": "787b67a7-8673-4ab4-8c4a-344030e99be8",
      "name": "QQ724",
      "imageUrl": "https://blogger.googleusercontent.com/...",
      "targetUrl": "https://..."
    }
  ],
  "promoModals": []
}
```

#### B. Sampel `GET /api/movies?page=1&limit=2` (Status 200)
```json
{
  "data": [
    {
      "id": "e2da19f5-7e27-4a0b-8d76-e172a5ba8501",
      "title": "Bad Apples",
      "slug": "bad-apples-2026",
      "posterPath": "/1a2b3c...jpg",
      "releaseDate": "2026-03-12",
      "voteAverage": 7.1,
      "contentType": "movie"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 2,
    "total": 18,
    "totalPages": 9
  }
}
```

#### C. Sampel `GET /api/auth/me` (Status 401 — Unauthenticated)
```json
{
  "error": "Unauthorized"
}
```

---

## 5. Panduan Struktur Folder Proyek Rekonstruksi

Struktur direktori proyek lokal di `/Users/username/Desktop/proyek_web_target`:

```text
proyek_web_target/
├── README.md                          # Dokumentasi teknis komprehensif ini
├── package.json                       # Konfigurasi dependensi Next 16, React 19, TS
├── tsconfig.json                      # Konfigurasi TypeScript Next.js
├── next.config.ts                     # Konfigurasi Next.js runtime
├── evidence_bundle.json               # Bukti analisis kanonikal REA Evidence bundle
├── analysis_api_catalog.json          # Katalog lengkap 318 endpoint API hasil AST parsing
├── analysis_routes_endpoints.json     # Pemetaan rute frontend & URL eksternal
├── analysis_vendors.json              # Hasil fingerprinting library & dependensi
│
├── app/                               # Aplikasi Next.js 16 runnable (App Router)
│   ├── layout.tsx                     # Root layout, dark-theme html, header & footer
│   ├── page.tsx                       # Halaman beranda (hero featured + multi-rail)
│   ├── globals.css                    # Stylesheet dark streaming terintegrasi
│   ├── components/
│   │   ├── SiteChrome.tsx             # Header navigasi & footer platform
│   │   ├── Rails.tsx                  # Komponen horizontal scroll rail & poster card
│   │   ├── DetailView.tsx             # Komponen tampilan detail film/serial
│   │   ├── CatalogGrid.tsx            # Komponen grid multi-kolom katalog
│   │   └── StubPage.tsx               # Komponen informasi rute sub-sistem platform
│   ├── movie/
│   │   ├── page.tsx                   # Rute katalog film (/movie)
│   │   └── [slug]/page.tsx            # Rute detail film (/movie/[slug])
│   ├── series/
│   │   ├── page.tsx                   # Rute katalog serial TV (/series)
│   │   └── [slug]/page.tsx            # Rute detail serial TV (/series/[slug])
│   ├── genre/
│   │   ├── page.tsx                   # Rute indeks genre (/genre)
│   │   └── [slug]/page.tsx            # Filter rute per genre (/genre/[slug])
│   ├── country/
│   │   ├── page.tsx                   # Rute indeks negara (/country)
│   │   └── [slug]/page.tsx            # Filter rute per negara (/country/[slug])
│   ├── year/
│   │   ├── page.tsx                   # Rute indeks tahun rilis (/year)
│   │   └── [year]/page.tsx            # Filter rute per tahun (/year/[year])
│   ├── collection/
│   │   ├── page.tsx                   # Rute indeks koleksi (/collection)
│   │   └── [slug]/page.tsx            # Detail koleksi (/collection/[slug])
│   ├── search/page.tsx                # Rute pencarian konten (/search)
│   ├── shorts/page.tsx                # Rute video vertikal Shorts (/shorts)
│   ├── watch-party/page.tsx           # Rute Watch Party (/watch-party)
│   ├── settings/page.tsx              # Rute pengaturan pengguna (/settings)
│   ├── notifications/page.tsx         # Rute inbox notifikasi (/notifications)
│   ├── watchlist/page.tsx             # Rute simpanan judul (/watchlist)
│   ├── watch-progress/page.tsx        # Rute lanjutkan nonton (/watch-progress)
│   ├── plans/page.tsx                 # Rute paket premium (/plans)
│   ├── coins/page.tsx                 # Rute koin rewards (/coins)
│   ├── balance/page.tsx               # Rute saldo koin (/balance)
│   ├── leaderboard/page.tsx           # Rute ranking komunitas (/leaderboard)
│   ├── request/page.tsx               # Rute request konten (/request)
│   ├── changelog/page.tsx             # Rute catatan rilis (/changelog)
│   ├── app/page.tsx                   # Rute landing mobile app (/app)
│   ├── bajalapis/page.tsx             # Rute konsol admin terselubung (/bajalapis)
│   ├── user/[username]/page.tsx       # Rute profil pengguna (/user/[username])
│   ├── auth/
│   │   ├── login/page.tsx             # Form masuk (/auth/login)
│   │   └── register/page.tsx          # Form daftar (/auth/register)
│   └── api/                           # Endpoint API offline lokal
│       ├── homepage/route.ts          # Mock /api/homepage dari snapshot
│       ├── movies/route.ts            # Mock /api/movies katalog
│       ├── genres/route.ts            # Mock /api/genres daftar genre
│       ├── search/route.ts            # Mock /api/search kueri
│       └── auth/me/route.ts           # Mock /api/auth/me (status 401 unauthenticated)
│
├── lib/
│   └── data.ts                        # Data layer: parser & normalizer JSON beranda
│
├── data/
│   └── homepage.json                  # Snapshot data 100 KB payload /api/homepage
│
├── src/                               # Artefak reverse engineering & deobfuskasi
│   ├── manifest.json                  # Manifest digest SHA-256 asli dari REA export
│   ├── files/                         # Berkas JS asli hasil ekspor REA export_web_scripts
│   ├── chunks/                        # 26 chunk Turbopack yang telah di-beautify
│   ├── chunks_raw/                    # 26 chunk mentah persis wire-bytes asli
│   └── modules/                       # 332 module individu hasil unbundling AST
│       ├── index.json                 # Peta indeks dependensi antar module numerik
│       ├── 063al_q720fkj/             # 26 modul sub-sistem bootstrap
│       ├── 0v2azvilwavbo/             # 75 modul core vendor & runtime
│       ├── 2r8ab1h3v6k7l/             # 6 modul API client (termasuk module_39611.js)
│       └── ...                        # Modul UI card, player, modal, dan taxonomy
│
└── assets/                            # Aset web mentah yang terekam
    ├── html/index.html                # Dokumen HTML lengkap beranda (128 KB)
    ├── css/                           # Stylesheet Tailwind CSS asli (429 KB)
    ├── js/                            # Skrip browser utama
    └── api/                           # Respons API mentah terekam (/api/homepage, dsb.)
```

---

## 6. Panduan Menjalankan Proyek Secara Lokal

Proyek ini telah dikompilasi dan divalidasi dengan `next build`. Anda dapat langsung menjalankannya secara lokal:

### 6.1 Prasyarat
- **Node.js**: Versi 20.9.0 atau yang lebih baru (teruji di Node.js v24.22.1).
- **Package Manager**: npm atau yarn atau pnpm.

### 6.2 Menjalankan Development Server
```bash
cd /Users/username/Desktop/proyek_web_target
npm run dev
```
Buka browser pada alamat [http://localhost:3000](http://localhost:3000). Seluruh konten beranda, navigasi rail, halaman detail film, pencarian, dan tautan rute katalog akan tampil langsung secara responsif menggunakan data lokal.

### 6.3 Menjalankan Mode Production Build
```bash
cd /Users/username/Desktop/proyek_web_target
npm run build
npm start
```

---

## 7. Rincian Bukti Analisis REA (*Evidence Provenance*)

Seluruh bukti analisis kanonikal telah divalidasi dan diintegrasikan ke dalam berkas `evidence_bundle.json`. Rincian rekam jejak analitik:
- **`ev_0f9aa1ab8189c3cef3609097380ca55226222b176ac107d34c404efe4a774f7d`**:
  Operasi `capture_browser_scenario` merekam skenario navigasi Chrome CDP pada `https://z2.idlixku.com`, merekam 622 event browser, 125 transaksi jaringan HTTP/HTTPS, serta response body dokumen HTML dan JavaScript chunks.
- **`ev_25f6cd31f843ace374184dbe0b2434c3f3542facd23366e649c54cf067cc859b`**:
  Operasi `export_web_scripts` mengekstrak seluruh skrip web terekam dan menghasilkan manifest verifikasi integritas SHA-256 pada sub-direktori `src/`.
- **`ev_65d9e9cdc729430fd2ddcecbd9984b6e3ec40a07bea94b43045e21e3d85e1564`**:
  Operasi `analyze_javascript_application` menganalisis graph statis 48 berkas JavaScript (3,8 MB teks), mengeksplorasi 807.194 AST nodes, 60.000 semantic graph nodes, dan 74.831 relasi aliran data.
- **`ev_7cbac1af7320b0b3927cf3a1ccb9327f2fed51d25a2f629b4ada4ffde7c899f4`**:
  Operasi `analyze_web_bundle` melakukan pemetaan pasif terhadap 26 skrip aktif pada konteks CDP Chrome, mengonfirmasi fingerprint framework Next.js dan runtime React.

---

## 8. Playback Otomatis (Stream Asli, Tanpa Demo)

Setiap judul di proyek ini memakai **stream Pentos asli** dan mengambil token secara otomatis saat halaman dibuka. Tidak perlu menjalankan script manual.

### Alur otomatis

```text
Buka /movie/[slug]?play=1 atau /watch/[type]/[slug]
        ↓
GET /api/playback/status?slug=...        (sesi masih segar?)
        ↓ belum ada / kedaluwarsa
POST /api/playback/ensure { slug, kind }
        ↓  server menjalankan provisioner
scripts/refresh-playback.mjs
  ├─ auto-launch Chrome CDP (profil Cloudflare-cleared)
  ├─ GET  /api/watch/play-info/{type}/{contentId}   → gateToken
  ├─ tunggu unlock 15 detik
  ├─ POST /api/watch/session/claim { gateToken }    → claim + renew
  ├─ POST https://e2e.majorplay.net/api/play         → signed HLS
  └─ simpan data/playback_sessions.json[slug]
        ↓
Player memakai /api/playback/master?slug=...
  ├─ /api/playback/manifest  (rewrite varian + audio)
  ├─ /api/playback/segment   (proxy fMP4 + sniff MIME)
  └─ /api/playback/subtitle  (WebVTT Indonesia/Inggris)
```

- **Movie:** `contentType = movie`, `contentId = UUID film`.
- **Series:** `contentType = episode`; provisioner membaca `/api/series/{slug}/season/{n}` dan memilih episode pertama yang punya video (atau `--episode UUID`).
- **Multi-judul:** sesi disimpan per slug, jadi banyak film/serial dapat aktif bersamaan (token berlaku ±1 jam; refresh otomatis saat kedaluwarsa).
- **Subtitle:** WebVTT diproksikan lewat `/api/playback/subtitle`; trek **Indonesia aktif otomatis**, Inggris tersedia di menu CC bilah kontrol.
- **Bilah Kontrol Bawah:** Pemutar dilengkapi bilah kontrol kustom terpadu di bagian bawah layar video: tombol Putar/Jeda, Bisukan, slider durasi, penunjuk waktu (00:00 / 00:00), tombol CC, **tombol Resolusi (Auto / 720p / 360p)**, dan tombol Layar Penuh.
- **Posisi Pengatur Resolusi:** Ditempatkan di pojok kanan bawah bilah kontrol tepat di sebelah kiri tombol Layar Penuh. Menu pilihan resolusi muncul mengarah ke atas dari bilah kontrol.
- **UI:** `PlaybackStage` menampilkan status "OBTAINING PENTOS TOKEN" selama 20–30 detik pertama, lalu `VideoPlayer` memutar stream asli. Tidak ada fallback demo di jalur normal.

### Konfigurasi opsional

```bash
CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
IDLIX_CHROME_PROFILE=/tmp/rea-chrome-profile
IDLIX_CDP=http://127.0.0.1:9333
```

### Verifikasi (PASS)

| Judul | Cara | Durasi | Subtitle | Kontrol Bilah Bawah |
|---|---|---|---|---|
| Cyberpunk S01E02 | Pemilih episode + menu resolusi bawah | 1.534 s | ID aktif, 301 cues | Resolusi di sebelah Fullscreen terverifikasi ganti ke 360p |
| The Djinn’s Curse 2 | UI auto-provision (judul baru) | 5.823 s | ID aktif, 924 cues | Auto Pentos stream |
| The Wire S01E01 | `ensure` series otomatis | 3.727 s | ID aktif, 965 cues | Auto Pentos stream |
| Hope, Bad Apples | Multi-session tersimpan | 9.421 / 6.204 s | ID + EN | Auto Pentos stream |

Screenshot: `reports/bottom_bar_resolution_popup.webp`, `reports/bottom_bar_switched_360.webp`, `reports/episode_grid_cards.webp`.
