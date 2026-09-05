# F3 — Komposisi vertikal: isi void 90 px di kiri-atas (pita atas/bawah ≥ 24)

> **Status: ✅ DIEKSEKUSI & SELESAI** (2026-09-05, commit `HEAD` sesi-12; log:
> `design-plans/sesi-2026-09-05-12-…`). Sebelumnya DRAF — hasil audit improve-ui
> (temuan F3, dipilih user bersama F1 & F2).
> Written against: `4f480a1` (K3 — SLD masih: blok impor y=24–58, gen cy=170, void 90 px)
> **Urut setelah plan-04 (F1) & plan-05 (F2)** — koordinat vertikal di plan ini mengasumsikan chip 104 px dari F2.
> Eksekusi TDD merah→hijau + gate penuh — bukti: sld 29 lulus, 8 suite (161 asersi)
> hijau, shoot bersih (sldScale 1,11), probe CDP void = 38 px, label G1 aman
> (overlap 7×0), zero-overlap non-intentional. Koordinat final sesuai kandidat plan
> (impor y=48, cy=142, chip y=100, label 112, RPM 119, MW 135, AGC 86).
> F1 (plan-04) & F2 (plan-05) SELESAI — seluruh temuan audit tuntas.

## Evidence chain

- Surface: hero SLD (`#sld`, viewBox 700×520) — `underfrequency_relay_simulator.html`, renderer `renderSld` (seksi §13a).
- Problem: **void vertikal 90,0 px** antara blok interkoneksi (bawah y=58) dan band generator (atas lingkaran y=148) — terukur probe CDP (2 skenario); hanya garis impor x=115 yang melaluinya. Konten keseluruhan 24–489 (pita atas 24, pita bawah 31) tetapi koridor internal 90 px membuat komposisi tampak "kosong/timpang" di kiri-atas — melawan permintaan "spacingnya terlihat".
- Design evidence: permintaan user sesi ini; anchor plan-02 §4.3 memberikan kebebasan koordinat selama tidak tabrakan & font ≥ 10; tes M8 mengunci posisi lama (cy=170, y2=192, chip y=148, label y=140, AGC y=134, impor y=24).
- Owner: `renderSld` (blok impor + blok generator) + `tools/sld.test.js` (literal M8 yang bergeser).
- Scope and affected surfaces: `underfrequency_relay_simulator.html`, `tools/sld.test.js`, gate `tools/shoot.js` (minSvgFont efektif — font tidak berubah, skala bisa berubah sedikit).
- Uncertainty: koordinat akhir fleksibel selama memenuhi kontrak (void ≤ 40, pita ≥ 24) — kandidat di bawah, eksekutor boleh menyetel untuk hindari tabrakan label.

## Design decision

Naikkan band generator & turunkan blok interkoneksi sehingga void internal menyusut 90 → ≤ 40 px, dengan pita atas & bawah ≥ 24 px. Kandidat (nomor final = kebebasan eksekutor dalam kontrak):

- **Blok interkoneksi turun**: rect (60, **48**, 110, 34) — teks "INTERKONEKSI" y 48+14=**62**, MW y=**76**; garis impor x=115 dari **82** → 252; CB (109, 254, 12×12) TETAP (koneksi ke bus tidak berubah).
- **Band generator naik**: lingkaran cy 170 → **142** (r=22 → 120–164); garis gen y2 192 → **164** (= tepi bawah lingkaran — pola sentuh-simpul F1); label id y 140 → **112**; chip y 148 → **100** (100–144, lebar 104 dari F2); baris RPM y 167 → **119**; baris MW y 183 → **135**; AGC tag y 134 → **86** (86–99, chip top 100 → celah 1 px).
- Hasil: void = 120 − 82 = **38 px** (≤ 40 ✓); pita atas = 48; pita bawah = 520 − 489 = 31 (≥ 24 ✓).
- **Trade-off eksplisit (dari temuan "pita atas ≈ pita bawah"):** kendala void ≤ 40 memaksa blok impor turun ke bottom ≥ 82, sehingga pita atas (48) tidak benar-benar ≈ pita bawah (31, selisih ±17). Diterima — prioritas temuan adalah menghilangkan koridor kosong 90 px sambil menjaga keduanya ≥ 24; eksekutor boleh menggeser koordinat dalam kontrak untuk mendekatkan selisih (mis. gen cy 142→145 & impor y 48→52) tanpa melanggar void ≤ 40 / pita ≥ 24.
- Bus 260, feeder (CB 268, panah 330/365, kotak 400–452, label beban 486) TIDAK berubah (F1 menyentuh y2 feeder 392→400 — selesaikan F1 dulu).

## Reuse

- Palet & simbol: lingkaran+salib, chip, AGC tag, blok impor — semua elemen lama, hanya koordinat.
- Pola sentuh-simpul (dari F1): garis berhenti tepat di tepi lingkaran (y2 = cy + 22).
- Verifikasi: probe CDP bounding-box (sesi-05/audit) untuk void & tabrakan.

## Changes

1. `underfrequency_relay_simulator.html` — `renderSld`, blok impor & blok generator (TDD **merah dulu**):
   - Change: koordinat per kandidat di atas (rect impor y 24→48, teks impor, garis impor y1 58→82; cy 170→142, y2 192→164, label id 140→112, chip y 148→100, RPM 167→119, MW 183→135, AGC 134→86).
   - Preserve: semua x (gx, impor 115, CB, feeder), lebar chip 104 (F2), font ≥ 10, warna semantik, tanpa dasharray.
   - Verify: output SVG memuat koordinat baru; **tidak ada tabrakan baru** (label G1 x=170 vs blok impor x=60–170: label y 100–112 vs impor 48–82 → aman; AGC G1 x≈247 vs label G1 x=170 → aman).
2. `tools/sld.test.js` — blok M8 yang bergeser (TDD merah):
   - Change: `cy="170"` → `cy="142"` (count 3); `y2="192"` → `y2="164"` (count 3); tambah/mutasi asersi posisi chip (`y="100"`), label (`y="112"`), AGC (`y="86"`), impor rect (`y="48"`); komentar M8 disesuaikan; tambah asersi void: `minY(gen top) − maxY(impor bottom) ≤ 40` (parse rect/circle).
   - Preserve: asersi lain (CB 12×12, kotak feeder 96 @ pitch 105, font floor ≥ 10, tanpa dasharray, tanpa `y="296"`/`y="364"`).
   - Verify: `node tools/sld.test.js` gagal sebelum ubah renderer (red) → hijau setelahnya (green).
3. Gate `tools/shoot.js`: sldScale & minSvgFont efektif harus tetap bersih (komposisi lebih padat → skala bisa sedikit naik; font ≥ 10 viewBox × skala ≥ 1,0).

## Scope

- Inherit: `renderSldInto`, semua skenario; chip AGC (label kecil ikut naik), TRIP/maks gov.
- Verify: `sld.test.js`, suite penuh (156 + asersi F1/F2/F3), `shoot.js`, probe (void ≤ 40; scan overlap area > 4 → hanya pasangan intentional; label tak menabrak blok impor).
- Exclude: F1 & F2 (jangan sentuh garis feeder y2 / lebar chip di plan ini); model & grafik tak tersentuh.

## Validation

- Product: di browser, tidak ada lagi koridor kosong mencolok di kiri-atas; generator dan blok impor membentuk komposisi padat dengan ritme vertikal jelas; tidak ada label tertabrak.
- Interface: 5 skenario × playhead awal/tengah/akhir; viewport 1500×1000 & 1280×720; perhatian khusus saat G1 TRIP (simbol abu) & saat AGC aktif (tag di 86–99).
- System: tanpa elemen baru; hanya koordinat; konsistensi pola sentuh-simpul dari F1.
- Repository:
  ```bash
  node tools/sld.test.js          # hijau (asersi M8 baru)
  for t in model timeline sld charts ui snapshot sim plot; do node tools/$t.test.js; done  # semua hijau
  node tools/shoot.js             # bersih (sldScale ≥ 1,0; minSvgFont ≥ 9,5; bodyScroll=0; consoleErrors=0)
  ```
  Probe: void internal ≤ 40,0; pita atas ≥ 24; scan zero-overlap non-intentional.

## Stop conditions

- Stop jika ada tabrakan label baru (mis. label G1 vs blok impor di viewport sempit) — sesuaikan koordinat dalam kontrak (bukan di luar kontrak).
- Stop jika skala efektif turun di bawah 1,0 (shoot `sldScale < 1,0`) — komposisi terlalu tinggi; turunkan cy/sesuaikan hingga ≥ 1,0.
- Stop jika asersi di luar M8 gagal — laporkan, jangan paksa.

## Design documentation

- Setelah diterima & tervalidasi: catat di bullet **M11** CLAUDE.md (F3: komposisi vertikal — void 90→38 px, blok impor y=48, gen cy=142), `design-plans/sesi-2026-09-05-10-…`, hitungan asersi README/overview, log status plan ini (DIEKSEKUSI → SELESAI).