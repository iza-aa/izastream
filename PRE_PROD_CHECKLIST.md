# PRE-PRODUCTION READINESS CHECKLIST - izastream

Dokumen status kesiapan rilis produksi platform streaming **izastream**.

---

## 1. Penyederhanaan Rel Trending (SELESAI - SESUAI PERMINTAAN TERAKHIR)

- [x] **Rel Tunggal Top 10 "Trending Now"**:
  - Rel *Trending in Indonesia* dan teks redundan *"24h Indonesia"* telah **dihapus total** dari beranda agar tidak ada duplikasi konten.
  - Rel **`Trending Now`** menjadi satu-satunya rel Top 10 utama di beranda, menyajikan 10 tayangan paling hangat dengan format angka peringkat raksasa bergaris luar (*giant outlined rank numbers 1–10*) dan spanduk *New Episode / Watch Now*.
  - Susunan halaman langsung bersambung rapi ke rel *Collections*, *Recently Added Movies*, dan *Recently Added Series*.

---

## 2. Desain Dropdown Jaringan Minimalis & Non-Alay (SELESAI)

- [x] **Format Judul Header**:
  - Hanya kata merek yang berwarna: `Disney+` berwarna cyan (`#00D6FF`), `Netflix` berwarna merah (`#E50914`), dst.
  - Kata `Originals` berwarna putih bersih (di Dark Mode) atau hitam (di Light Mode).
  - Ikon panah chevron menghadap ke atas (`^`) saat menu terbuka, dan menghadap ke bawah (`v`) saat tertutup.
- [x] **Menu Pilihan Bersih & Minimalis**:
  - Seluruh titik warna (*brand dots*) di dalam menu telah dihapus total.
  - Teks di dalam menu menggunakan warna netral seragam tanpa pelangi warna.
  - Pilihan aktif disorot menggunakan kartu kapsul abu-abu gelap membulat (*pill* berlatar `rgba(255, 255, 255, 0.14)`) dan teks tebal putih (`#ffffff`).
- [x] **Pembersihan Subtitle "Lanjutkan Menonton"**:
  - Teks deskripsi *"Tersimpan di browser Anda"* di bawah judul rel **Lanjutkan Menonton** telah dihapus bersih.

---

## 3. Pemutar Video Sinematik Tingkat Lanjut (SELESAI)

- [x] **Pembaruan Total Desain UI & Ikon Pemutar**:
  - Ikon lompat mundur dan maju 10 detik berupa busur melingkar (*circular arc*) modern dengan angka 10 berada di tengah bersih.
  - Menu resolusi video bersih tanpa tulisan `2 VARIAN` dan tanpa ikon centang.
  - Layar penuh sejati seluruh monitor (*True OS Desktop Space Fullscreen*) yang meluas ke 100vw x 100vh di macOS dan Windows.
  - Dukungan ketuk dua kali (*double-click*) pada video untuk fullscreen.
  - Pemutaran otomatis seketika saat memilih episode baru (*Auto-Play on Next Episode*).
  - Smart "Lewati Intro" dinamis dengan hitungan mundur detik (*countdown*) real-time.

---

## 4. Hero Carousel Sinematik & Video Preview Ambient (SELESAI)

- [x] Format Carousel 10 judul sorotan utama dengan lencana resmi `SOROTAN UTAMA · FILM`, tombol `Nonton Sekarang` biru kobalt, tombol `Tonton Cuplikan`, dan slider indicator kuning-neon.
- [x] Cuplikan video ambient berjalan di latar belakang saat tombol `Tonton Cuplikan` diaktifkan, disertai tombol audio mengambang (**🔊 / 🔇**).

---

## 5. Identitas Brand & Footer Resmi (SELESAI)

- [x] Format Footer Horizontal Minimalis dengan logo resmi `izastream` (warna gradasi resmi navbar `.brand-mark`), latar belakang tema platform, teks pernyataan hosting pihak ketiga, dan 3 tombol squircle (Chat, Discord, Telegram) yang sejajar 28px dengan konten.

---

## 6. Resolusi Sinopsis Instan Pada Klik Pertama (*Instant First-Hit Enrichment*) (SELESAI)

- [x] Judul yang baru pertama kali dibuka langsung menyajikan 100% sinopsis utuh, genre, tagline, dan kreator pada klik pertama tanpa perlu refresh.

---

## 7. Banner Sinematik Detail Hero (SELESAI)

- [x] Layout full-bleed backdrop dengan vignette gradient, logo grafis resmi, baris genre middot, tombol aksi lengkap, lencana status `ENDED` / `ONGOING`, dan logo rumah produksi tanpa garis pembatas horizontal.

---

## 8. Sistem Auto-Update Konten Baru (SELESAI)

- [x] Sinkronisasi katalog otomatis via `scripts/sync-catalog.mjs` (`npm run sync`) dan endpoint `/api/sync`.

---

## 9. Eliminasi Total Error 404 & Perlindungan Rute Lintas-Kategori (SELESAI)

- [x] Pengalihan pintar lintas-kategori aktif otomatis. 225 pengujian HTTP menghasilkan 0 error 404 (100% 200 OK).

---

## 10. Kesiapan Deployment Server (SELESAI)

- [x] `Dockerfile` multi-stage build siap pakai untuk server Linux / VPS.
- [x] `docker-compose.yml` dengan persistent storage volume `/data`.
- [x] `.env.example` terdokumentasi lengkap.
- [x] Proteksi gitignore terhadap kredensial dan cache runtime.
