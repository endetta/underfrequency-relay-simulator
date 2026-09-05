# Sesi 2026-09-05-15 — Teks grafik terpotong (tick gauge & label tahap)

- **Mulai:** 16:55 · **Commit sebelum:** d341515 · **Repo:** endetta/underfrequency-relay-simulator @ main
- **Mandat user:** screenshot view Grafik — "banyak teks yg terpotong di sini, perbaiki"
  (skala tick gauge & label tahap di tepi kanan kartu).
- **Dikerjakan & hasil (TDD merah → hijau):**
  - Audit CDP (probe bbox `<text>` vs rect svg induk, 2 keadaan): **10 teks melewati
    tepi kanan viewBox** → terpotong oleh `overflow:hidden` svg root:
    tick gauge 52–47 (6) start-anchored `x=64` → glyph s.d. x=76 > viewBox 74
    (potong 2,0 px tiap angka) · label tahap T1–T4 (4) start-anchored `x=W−10` →
    s.d. W+3,3 (potong 2,6–3,3 px).
  - Merah: 2 asersi M14 baru di charts.test (tick gauge wajib `x="72"`
    `text-anchor="end"` ×6 & tanpa `x="64"`; label tahap wajib `x="678"`
    `text-anchor="end"` ×4 & tanpa `x="670"`) → 19 lulus, 2 gagal.
  - Hijau: renderGauge tick `x=64` → `x=72` + `text-anchor="end"`; renderFreq label
    tahap `x=(W−10)` → `x=(W−2)` + `text-anchor="end"` → charts 21 lulus.
  - Bukti: 8 suite hijau **165 asersi** (charts 19→21); shoot.js bersih (9 view,
    bodyScroll=0, overflow none, consoleErrors=0, sldScale 1.11, playcheck PASS);
    probe ulang → **0 teks melewati tepi svg** di kedua keadaan.
- **Dokumen tersinkron:** CLAUDE.md (bullet M14 + 165 asersi) · README/overview
  (21 asersi charts) · log ini.
- **Status:** SELESAI.
- **Langkah berikutnya:** — (lanjut temuan audit lain bila ada; lihat log berikutnya).
