# ADR-0002 — Rantai model fisika diambil dari spesifikasi U01

Status: accepted (2026-09-05, Round 1 grill)

Model inti simulator mengadopsi **rantai U01** dari
`LEVEL 3 - PROTECTION SYSTEM SIMULATOR/docs/engineering-specs/underfrequency-relay.md`
sebagai sumber persamaan:

1. titik operasi pra-gangguan (output & headroom tiap unit),
2. peristiwa gangguan — **GENERATOR_LOSS / LOAD_STEP / GENERATOR_BLOCK** → defisit D₀,
3. ROCOF awal dari persamaan ayunan `2H·df/dt = (P_m − P_e)/S_base`,
4. respons governor/droop per unit (tak jenuh → jenuh oleh headroom) → kekakuan β,
5. Δf kesetimbangan bentuk-tertutup (dengan saturasi: solusi piecewise-linear; bila
   tak terselesaikan → **COLLAPSE / DEFICIT_EXCEEDS_AVAILABLE_GENERATION**),
6. **UFLS berjenjang**: pickup ketat `f < ambang && !nearlyEqual`, tunda waktu
   disengaja (timer reset bila f naik sebelum jeda habis), trip **terkunci (latched)**,
   lepas = `fraksi × beban pra-gangguan`, berurutan per tahap,
7. presentasi f(t), RPM unit, urutan pelepasan.

Konvensi angka: sistem 50 Hz khas PLN; tabel tahap default
**49.50 / 49.00 / 48.50 / 48.00 Hz** dengan fraksi lepas **5 / 10 / 15 / 20%** dari
beban pra-gangguan dan tunda 0.2–0.5 s — angka **praktik global tipikal**, bukan
kode grid PLN resmi, sehingga UI wajib menampilkan catatan ambar
`plnVerificationRequired` (sama seperti modul LEVEL 3). RPM unit = `N = 120·f/poles`
adalah transformasi presentasi, bukan persamaan relai.

Pertimbangan alternatif: model heuristik sederhana buatan sendiri (ditolak — kurang
terdefendable secara edukasi & menyimpang dari dokumen yang sudah di-review);
menyalin kode engine LEVEL 3 (ditolak, lihat ADR-0001).

Konsekuensi: PRD proyek ini (nanti) menuliskan ulang rantai ini dengan persamaan
lengkap versinya sendiri; dokumen U01 tetap rujukan; bagian yang di luar U01
(tegangan, lihat ADR tegangan) diberi label ilustratif eksplisit.
