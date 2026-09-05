# Sesi 2026-09-05-05 — Audit overlap SLD (M9): kotak feeder tak lagi saling tumpuk

> Aturan root "Log sesi wajib" (CLAUDE.md poin 8 — self-contained). Verifikasi
> berbasis ukur: scan bounding-box di Chrome nyata (CDP) — bukan tebakan visual.

- **Mulai:** ~15:50 · **Commit sebelum:** bd4a86c (M7 — M8 masih di working tree) · **Repo:** endetta/underfrequency-relay-simulator @ main
- **Mandat user:** "screenshot SLD, anda improve SLD-nya. SLD tidak enak dilihat karena banyak komponen yg overlap." — potret SLD lalu perbaiki komponen yang tumpang-tindih.
- **Dikerjakan & hasil:**
  - **Screenshot:** `node tools/shoot.js` → 9 view + peta ASCII zoom SLD (agen membaca PNG via `.ascii.txt` + peta resolusi-tinggi buatan `tools/.tmp-overlap/`, dihapus setelah dipakai).
  - **Ukur overlap (bukan kira-kira):** skrip CDP sementara menghitung bounding-box (`getBBox`) semua elemen `#sld` di **5 skenario** (seimbang / impor-lepas t=2,2 / lepas-G1 t=25 / blok-G3 t=20 / +beban 200 t=20). Hasil konsisten di semua skenario:
    - **4 × RECT×RECT area 260** — 5 kotak feeder (T1–T4, VITAL) lebar **110 @ pitch 105 saling tumpuk 5 px** sepanjang tinggi kotak → sudut rx=7 terpotong kotak tetangga, border bersilang (sumber utama kesan "overlap").
    - TEXT×TEXT area 57–107 di kotak interkoneksi = **1,3 px overlap bbox metrik font** (ascent/descent), bukan tinta (semua kapital/digit tanpa descender → celah tinta ~5 px) — kosmetik, tak terlihat.
    - Tidak ada teks meluber dari chip/kotak, tak ada tabrakan label TERBUKA/AGC/salib.
  - **Fix (M9):** lebar kotak feeder 110 → **96** (`x−48..x+48`), pitch tetap 105 → celah antar kotak **9 px**; strip jadi 72–588, **sejajar bus 70–590** (sebelumnya 65–595 menjorok keluar ujung bus).
  - **Bukti:** 123 asersi hijau — model 33 · timeline 21 · sld **24** (tes M9 baru: 5 kotak y=400 lebar 96, pitch 105, tanpa `width="110"`) · charts 14 · ui 31. Scan ulang: RECT×RECT = **0** di semua skenario; shoot 9 view bersih (bodyScroll=0 desktop, overflow none, consoleErrors=0, sldScale 1,11, font efektif 11,11, playcheck PASS rasio 0,92). Peta ASCII: 5 kotak terpisah dengan celah & sudut utuh.
- **Dokumen tersinkron:** CLAUDE.md (bullet M9 + riwayat log) · overview.md (123 asersi, sld 24, kotak terpisah) · implementation-plan §5 (SLD: kotak 96 @ pitch 105, celah 9) · log ini. PRD tidak berubah.
- **Status:** SELESAI — overlap nyata terhapus & teruji; sisa flag scan hanya overlap metrik font (tak terlihat) di kotak interkoneksi.
- **Langkah berikutnya (untuk sesi/AI baru):** M9 di working tree bersama M8 (sesi-04) — **commit batch M8+M9 + push `origin/main`** menyusul di sesi yang sama (belum diminta user). Bila user lanjut: mulai dari CLAUDE.md proyek → log ini. File kunci: `underfrequency_relay_simulator.html` (renderSld §13, blok feeder), `tools/sld.test.js` (blok M9), `tools/shoot.js`.
