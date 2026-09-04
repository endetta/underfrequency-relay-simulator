# ADR-0005 — SLD v1: satu bus + jalur impor (interkoneksi), tanpa pan/zoom

Status: accepted (2026-09-05, Round 3 grill)

User menanyakan mana yang lebih baik untuk belajar UFR: satu bus dengan banyak
unit/beban, atau SLD interkoneksi lebar (butuh pan/zoom). Keputusan: **satu bus**
(lihat ADR-0003) — frekuensi adalah besaran sistem (satu-area coherent), dan SLD
interkoneksi multi-area akan menyiratkan frekuensi per-area yang tidak dimodelkan.
Narasi interkoneksi dipertahankan lewat **satu jalur impor** di SLD berlabel
`Impor … MW`: peristiwa **"Lepas interkoneksi"** (kehilangan impor) menciptakan
defisit seperti *islanding* — mengajarkan mengapa jaringan sehat bisa tiba-tiba
underfrequency tanpa memodelkan area lain. SLD tetap ringkas, **tanpa pan/zoom di
v1** (fitur itu bisa menyusul bila SLD melebar di versi berikutnya).

Keputusan terkait yang ikut dikunci Round 3:
- Kartu kanan **dua halaman** (toggle): `Kondisi sistem` (real-time: kondisi,
  f, beban, pembangkitan, dukungan & headroom governor) dan `Urutan pelepasan`
  (daftar peristiwa + beban sistem sesudah tiap lepas).
- Chip generator di SLD = **hanya RPM + MW live** (tanpa pengulangan
  governorMax/headroom di kartu parameter — info dobel dihindari; agregat
  supply/dukungan/headroom cukup di halaman Kondisi sistem).
- Kecepatan main: **0,5× / 1× / 2×**; peristiwa gangguan pada t = 1,0 s; skenario
  preset (tanpa event-at-playhead di v1).
- Grafik frekuensi y = 47–52 Hz dengan garis panduan ambang + penanda peristiwa;
  header, pakem visual, dan catatan ambar PLN mengikuti referensi Differential.
- Repo + GitHub: **setelah PRD draf disetujui** (bukan sekarang).
