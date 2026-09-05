# Plan-03 — Player andal + waktu nyata 0–30 s + hierarki kendali f: governor → AGC sekunder → UFLS

> **Status:** ✅ **DIEKSEKUSI & SELESAI** 2026-09-05 (commit `HEAD` terbaru, lihat §7). **Produk:**
> `underfrequency_relay_simulator.html` (repo `endetta/underfrequency-relay-simulator`).
> Sebelumnya DISETUJUI user (keputusan §0b dikunci).
> **Metode:** TDD (tes merah dulu, seam dikonfirmasi user), gate `tools/shoot.js`, satu commit + push,
> log sesi per aturan CLAUDE.md poin 8.
> **Sumber:** PRD §5 (model), ADR-0002 (rantai U01), ADR-0003 (gens), riset PLN
> (`docs/research/pln-underfrequency-practice.md` — AGC = secondary di Jawa-Madura-Bali; droop 3–5%;
> pita normal 49,8–50,2; UFLS garis TERAKHIR; tunda UFLS 0,1–0,5 s).

## 0. Mandat user (2026-09-05)

1. **Player tidak bisa di-start** (fatal) → harus andal + tidak ada error.
2. Waktu play **lebih lama & real-time**: horizon operasi governor ≈ **0–30 s** (bukan 0–20 s / kurva 0–12 s).
3. Urutan kendali yang ingin terlihat: peristiwa (PLTU trip) → **governor droop menaikkan output** (kedua
   generator terlihat menyuplai lebih besar) → bila f **masih di bawah standar** setelah governor →
   **AGC (secondary)** → baru **UFLS / load shedding** bila f tetap turun.
4. Boleh revisi besar (SLD/sistem); **pastikan tidak ada error lagi**.

### 0b. Keputusan user (dikunci 2026-09-05, jawaban ask_user)
1. **AGC default ON** (skenario ringan otomatis menunjukkan pemulihan ke 50 tanpa UFLS).
2. **Auto-play ON**: klik skenario → run langsung berjalan (pause = ▶ lagi).
3. **agcRate 40 MW/s, agcInterval 2 s** (80 MW per langkah).
4. **Kurva f/V jendela TETAP 0–30 s** (tidak mengikuti tMax run).

## 1. Diagnosis player (bukti, 2026-09-05 — probe CDP headless)

- Klik ▶ di headless: `playing=true`, `tNow` 0 → 2,40 → 5,45 dalam ±1,8 s, tanpa exception. **Tombol tidak
  mati total.** Dugaan penyebab di mesin user:
  - **Berat/macet**: `tick()` me-render ulang SELURUH SVG tiap frame — grafik f (polyline ribuan titik),
    volt, SLD, kartu kanan, @60 rAF → CPU tinggi → tampak "tidak jalan". Akan makin parah bila jendela
    diperpanjang ke 30 s.
  - Skenario tanpa efek: preset `mandiri` (impor 0) + skenario "Lepas interkoneksi" = defisit 0 → layar
    statis → user mengira player rusak.
  - Klik pertama bisa tertelan splash (menutup layar sampai ~1,86 s).
- **Perbaikan P0** (lihat §4): throttle render grafik saat play + auto-play saat skenario dipilih + gate
  regresi play di `shoot.js` + pastikan tiap pilihan skenario **selalu menghasilkan gerakan** (kunci preset
  sesuai skenario: `imp` memaksa preset berimpor).

## 2. Keputusan model yang DIAJUKAN (amendemen PRD §5 → ADR-0006)

Rantai U01 saat ini (ADR-0002): droop statis (f-driven) → UFLS. Tidak ada AGC. Amendemen:
**masukkan lapisan AGC (secondary) di antara governor & UFLS**, tanpa mengubah backbone solver
(segmen bentuk-tertutup, deterministik, parity statis↔timeline).

1. **Governor droop** — TETAP seperti sekarang (PRD §5.4): resp f-driven, dijepit headroom. Respons primer
   sudah tampil sebagai lekukan & pemulihan f di kurva + chip MW mengikuti f tiap tick.
2. **AGC (baru, PRD §5.4b)** — bekerja SETELAH governor mencapai kesetimbangan & f masih di luar pita
   (f_ss < 49,98), BILA `agcOn=true` dan masih ada **AGC reserve** = Σ_online (govMax − suplai saat itu):
   - AGC menaikkan setpoint unit (p0_eff) secara **langkah diskret**: tiap `agcInterval` s (default 2 s),
     naik total `agcRate` MW/s × interval (default 40 MW/s dibagi proporsional per kapasitas), lalu solver
     menyelesaikan f_ss baru → ulangi sampai `f_ss ≥ 49,99` ATAU reserve habis ATAU UFLS mulai.
   - Skenario ringan (defisit ≤ reserve): **AGC memulihkan f → 50 dalam ±10–20 s, tanpa UFLS** (chip MW
     naik bertahap, kurva f tangga naik — khas kendali sekunder diskret).
   - Skenario berat (defisit > reserve total): AGC jenuh, f tetap turun → **UFLS jalan seperti hari ini**
     (ambang + tunda 0,2–0,5 s; PLN: UFLS = garis terakhir & jauh lebih cepat dari AGC).
   - `agcOn` **toggle** di kartu kiri (default ON) — OFF = perilaku lama murni droop+UFLS (utk mengajar
     peran tiap lapis).
3. **Waktu**: `tMax` 20 → **30 s** (paramP & scrubber); kurva f/V x = **0–30 s** (skala `tToX` baru,
   amendemen PRD §7; label 0,5,10,…,30 s). `tEvent` tetap 1,0 s.
4. **Slider impor & preset**: skenario `imp` (Lepas interkoneksi) **memaksa preset berimpor** saat dipilih
   (kalau preset mandiri → otomatis ganti ke berimpor), sehingga tak ada lagi pilihan skenario tanpa efek.
5. **Tidak berubah**: persamaan droop/ayunan/UFLS strict/latch/V ilustratif, konstanta gauge, fToY,
   status 5-pill. Dua implementasi differential FROZEN LEVEL 3 TIDAK disentuh.

### Perkiraan dampak ke hasil skenario (dihitung tangan, menjadi literal tes baru)

| Skenario | Sekarang | Baru (agcOn ON) |
|---|---|---|
| Seimbang | SEIMBANG 50 | SEIMBANG 50 (AGC idle) |
| Lepas G1 (mandiri) | UFLS T1..T4, 550 MW lepas | AGC tak mampu (reserve < defisit 500) → urutan UFLS bisa berubah jumlah/urutan karena AGC ikut menahan selama kaskade → **literal diturunkan ulang dari hitung tangan** |
| Lepas interkoneksi (berimpor) | UFLS 225 MW → PEMULIHAN | AGC menahan sebagian → kemungkinan trip lebih sedikit → literal diturunkan ulang |
| + Beban 200 MW | DEFISIT 49,686 (tanpa trip) | **AGC memulihkan → 50, PEMULIHAN, tanpa UFLS** (kasus showcase AGC) |
| + Beban besar | RUNTUH 47, UFLS semua | AGC tak mampu → RUNTUH tetap (regresi: sama) |
| agcOn OFF + Beban 200 | — | DEFISIT 49,686 (perilaku lama dipertahankan utk perbandingan) |

## 3. UI & SLD (revisi)

1. **Kartu kiri — kartu "Kendali frekuensi"** (baru): toggle **AGC sekunder ON/OFF** + baca nilai
   `agcRate`/interval (angka label ambar PLN). Chip skenario tetap di kartu Skenario.
2. **SLD**: chip unit tetap RPM/MW live. Saat AGC aktif & menaik: label kecil **"AGC"** di sisi chip/bus
   (copper) pada unit yang menerima setpoint + MW naik bertahap (karena `tNow` jalan, MW render ulang tiap
   tick → animasi suplai naik terlihat). Legenda +1 item bila perlu.
3. **Side card (Kondisi sistem)**: baris `Dukungan AGC +x MW` (0 saat off) + indikator fase: keterangan
   kecil `fase: GOVERNOR → AGC → UFLS` dengan yang sedang aktif ditebalkan (dari event log run).
4. **Transport & play**:
   - `tick()` berbasis **waktu dinding**: `dt = clamp(ΔrAF, 0, 0,1) × speed` → **1× = real-time**, 0,5×/2×
     proporsional (bukan 0,05 s/frame).
   - **Auto-play**: klik skenario → run langsung main (jeda untuk inspeksi = ▶ lagi). Reset tetap ada.
   - **Throttle render**: selama play, chip SLD + nilai f + playhead tiap frame; **grafik f/V & kartu kanan
     tiap ±6 frame (~10 fps)** — hilangkan beban render penuh @60 fps.
   - Scrub saat jeda tetap render penuh (seperti sekarang).
5. Transport kompak ≤ 44 px & switch SLD/Grafik TETAP.

## 4. Seam & test kit (TDD — diminta konfirmasi user)

Tes lewat `const API` (lens-harness) + gate headless (`shoot.js`). Seam yang diuji:

- **S1 — model** (`model.test.js`): literal baru — agregat tak berubah; AGC: kasus ringan (+200, agcOn)
  → akhir f=50±1e-9, tanpa trip, event log memuat fase AGC; agcOn OFF → 49,686 (literal lama TETAP);
  kasus berat RUNTUH tak berubah; `agcRate`/`agcInterval` dijepit valid (ufValidate).
- **S2 — timeline** (`timeline.test.js`): determinisme (2× run idem); urutan fase per run
  (`governor → agc → ufls` sesuai kedalaman defisit); severe-case urutan & total diturunkan ulang (hitung
  tangan) bila berubah; parity statis↔timeline tetap < 1e-6.
- **S3 — renderer** (`sld/charts/ui.test.js`): tToX window 0–30 literal baru (`x(0)=38`, `x(15)=…`,
  `x(30)=666`); label sumbu 0/5/10/…/30 s; tombol/toggle AGC hadir & toggle mengubah run; side card baris
  AGC; chip "AGC" muncul saat fase agc; font ≥ 10 tetap.
- **S4 — player** (`shoot.js` view `playcheck`): klik skenario → `playing=true` & `tNow` **naik monoton**
  ≥ 1 sim-s per ≤1,4 wall-s @1× (headless); ▶ jeda → berhenti; scrub → set; **consoleErrors=0**; render
  grafik ≤ ~10/s selama play (hitung via counter API bila perlu).
- **S5 — semua view lama** hijau: bodyScroll=0, sldScale ≥ 1,0, font efektif ≥ 9,5, splash auto.

## 5. Definisi selesai (DoD)

1. S1–S4 hijau (semua suite + playcheck), suite lama tetap hijau kecuali literal yang memang berubah
   sesuai spec baru (didokumentasikan di commit).
2. Player: skenario apa pun → auto-play → kejadian TERLIHAT (chip MW naik, breaker, pill, kurva) tanpa
   macet; pause/resume/scrub/reset normal.
3. Urutan narasi benar: governor dulu → AGC bila perlu → UFLS hanya bila f tetap di bawah ambang;
   agcOn OFF = perilaku lama tersedia.
4. Jendela 0–30 s: governor/AGC/shedding selesai terlihat dalam kurva; parity & determinisme terjaga.
5. `shoot.js` semua view bersih (bodyScroll=0, consoleErrors=0, overflow none) + playcheck PASS.
6. Bahasa Indonesia; dokumen tersinkron: **PRD §5 amendemen (5.4b AGC, 5.5 waktu, §7 skala x) + ADR-0006** +
   CLAUDE.md status + log sesi; satu commit + push `origin/main`.

## 6. Urutan eksekusi (irisan vertikal TDD)

1. P0: tulis S4 playcheck (merah) + throttle + auto-play + wall-clock tick + kunci preset skenario `imp`
   → hijau (tanpa menyentuh model).
2. P1: tMax 30 + `tToX` window 30 + label + scrubber → update literal S3 (merah→hijau).
3. P2 model: PRD/ADR draft dulu → tulis S1–S2 literatur hitung tangan (merah) → implementasi AGC di
   `ufTimeline` (+`agcOn`/`agcRate`/`agcInterval` di paramP) → hijau.
4. P3 UI: toggle AGC + baris side + chip AGC + fase narasi → S3 hijau.
5. shoot semua view + playcheck + smoke browser → DoD → dokumen (PRD/ADR/CLAUDE.md/log sesi) → commit+push.

## 7. Risiko & mitigasi

- **Literal timeline berubah** (skenario AGC ringan → PEMULIHAN; berat bisa beda urutan): diturunkan ulang
  dari hitung tangan + hitung silang dengan run lama (agcOn OFF) — jangan menebak.
- **Auto-play mengubah UX tes lama** (chip skenario klik → sekarang langsung main): update ui.test bila
  menyangkut perilaku; ID/kelas tidak berubah.
- **Performa 30 s**: throttle render (P0) + polyline tetap satu elemen; ukur di playcheck (DoD 4).
- **Jangan sentuh**: `fToY`, gauge stops, ambang UFLS (49,5/49,0/48,5/48,0), kontrak feeder/vital,
  model LEVEL 3 FROZEN. Angka AGC tetap label ambar PLN (bukan angka resmi).
- Keputusan yang perlu konfirmasi user: AGC default ON?; auto-play saat pilih skenario?; jendela kurva
  TETAP 0–30 s (bukan mengikuti run)?; `agcRate` 40 MW/s & interval 2 s boleh?

## 8. Hasil eksekusi (2026-09-05, sesi-2026-09-05-02)

Semua tahap hijau. Bukti akhir di `tools/shots/report.txt`:

| DoD | Hasil | Bukti |
|---|---|---|
| S1 model | 31/31 | agcOn OFF literal 49,686 lama tetap; +200 agcOn → 50,00 tanpa trip |
| S2 timeline | 15/15 | fase & determinisme; lepasG3 AGC 195 MW → 50,00; importLoss 175 MW → 50,00; runtuh tak berubah |
| S3 renderer | sld 16 · charts 14 · ui 28 | tToX window 30 (x15=352, x30=666); chip/badge AGC; baris Dukungan AGC + fase ph-on |
| S4 player | **playcheck PASS** | played · spanSim 1,48 s/wallS 1,61 s (rasio 0,92 ≥ 0,7) · monoton · stop bersih · heavyN 16 (~10 fps) · consoleErrors=0 |
| S5 view lama | semua bersih | bodyScroll=0 (8 view desktop), sldScale 1,11, font efektif 11,11/10, overflow none |
| Dokumen | PRD §5.4b/§5.5/§5.6 + §7 (jendela 30 s, gauge mutakhir) · ADR-0006 · CLAUDE.md · log sesi | satu commit + push |

Catatan eksekusi penting:
- Bug halus yang ditemukan saat TDD: `agcDeficitNow()` lama memakai respon droop linear tak jenuh
  (inkonsisten dgn segmen timeline) → AGC berhenti prematur; diperbaiki memakai `seg().Deff`.
- Stop AGC hanya saat **f aktual** di pita (bukan f_ss prediksi) → hindari macet di 49,937.
- `renderSld` chip MW = droop + kumulatif AGC (`run.agcSteps[].cum`), cap di govMax + badge kecil `AGC`.
- UI: kartu `Kendali frekuensi` (toggle ON/OFF via `setAgc`), legenda +1 (`AGC aktif`), CARD_ORDER 5 kartu.
