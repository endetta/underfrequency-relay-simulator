# F2 — Spasi band generator lega & seimbang (gap ≥ 20 px, margin kanan ≥ 30 px)

> **Status: ✅ DIEKSEKUSI & SELESAI** (2026-09-05, commit `HEAD` sesi-11; log:
> `design-plans/sesi-2026-09-05-11-…`). Sebelumnya DRAF — hasil audit improve-ui
> (temuan F2, dipilih user bersama F1 & F3).
> Written against: `4f480a1` (K3 — SLD masih: chip `(x+34, 148, 118×44)` @ pitch 180, gx=[170,350,530])
> Eksekusi TDD merah→hijau + gate penuh — bukti: sld 27 lulus, 8 suite (159 asersi)
> hijau, shoot bersih (sldScale 1,11), probe CDP gap 20/20, marginR 32, teks
> `· maks gov` (bbox 102) muat di 104. **Koreksi saat eksekusi:** font baris MW
> aktual `11` (bukan 10,5 seperti tertulis di plan) → perubahannya 11 → 10.
> F1 (plan-04) SELESAI; F3 (plan-06) masih DRAF.

## Evidence chain

- Surface: hero SLD (`#sld`, viewBox 700×520) — `underfrequency_relay_simulator.html`, renderer `renderSld` (seksi §13a, blok "generator (ATAS bus)").
- Problem: band generator rapat & tidak seimbang — **gap chip→lingkaran tetangga hanya 6,0 px** (G1-chip 204–322 vs lingkaran G2 328; G2-chip 384–502 vs lingkaran G3 508) dan **margin kanan 18,0 px** (chip G3 berakhir 682) vs **margin kiri 60 px** (blok impor). Terukur probe CDP (2 skenario). Konten terdorong ke kanan; celah 6 px ≈ 6–7 px layar — elemen tampak saling menempel (kesan "rapat"/overlap semu), melawan permintaan "spacingnya terlihat".
- Design evidence: permintaan user sesi ini ("spacingnya terlihat"); anchor plan-02 §4.3 memberi kebebasan koordinat ("eksekutor bebas menyetel untuk hindari tabrakan label"); tes M8 tidak mengunci lebar chip/pitch (hanya cy=170, y2=192, CB, kotak feeder).
- Owner: `renderSld` (blok generator: lebar chip, teks chipmw) + `tools/sld.test.js` (asersi numerik baru).
- Scope and affected surfaces: `underfrequency_relay_simulator.html` (renderSld), `tools/sld.test.js`, gate `tools/shoot.js`.
- Uncertainty: lebar teks terpanjang chip ("`125 MW · maks gov`", 17 glyph JetBrains Mono) — kepastian muat di lebar chip baru harus diverifikasi scan overflow (probe) & shoot.

## Design decision

Re-layout band generator dengan **dua parameter kunci** (terbukti dari aritmetika: dengan lebar chip 118, tidak ada pitch yang memenuhi gap ≥ 20 DAN margin kanan ≥ 30 sekaligus — kontradiksi, jadi lebar chip WAJIB turun):

- **Lebar chip: 118 → 104** (offset tetap `x+34`; lingkaran G1→chip sendiri tetap berjarak 12 px).
- **Pitch: tetap 180** (gx = [170, 350, 530]) → gap chip→lingkaran tetangga = 180 − 56 − 104 = **20 px**; margin kanan = 700 − (530+138) = **32 px**.
- **Font baris MW chip: 11 → 10** (aktual di kode adalah 11, bukan 10,5; tetap ≥ 10, floor plan-02 §4.4) agar "`125 MW · maks gov`" muat di 104 px (17 glyph × ~6,0 px ≈ 102 px). Baris RPM/TRIP tetap 12.
- Koordinat vertikal TIDAK berubah (F3 yang menggeser vertikal — plan terpisah, urut setelah plan ini).

Hasil: celah ≥ 20 px (3× lebih lega), margin kanan 32 px (mendekati kiri 60), zero-overlap terjaga, font floor tetap.

## Reuse

- Palet chip: `var(--green-soft)/var(--green)`, `var(--copper-soft)/var(--copper)`, `var(--bg)/var(--off)` — tidak berubah.
- Teks chip: format `RPM n` / `TRIP` / `n MW` / `n MW · maks gov` — tidak berubah (tes mengunci string).
- Pola pengukuran: probe CDP bounding-box (sesi-05) untuk verifikasi gap/margin/overflow.

## Changes

1. `underfrequency_relay_simulator.html` — `renderSld`, blok generator:
   - Change: rect chip `width="118"` → `width="104"` (posisi `x="(x+34)"`, `y="148"`, `height="44"` tetap); baris MW `font-size="10.5"` → `font-size="10"` (class `chipmw`).
   - Preserve: gx=[170,350,530], cy=170, r=22, salib ×, label id y=140, chip y=148, AGC tag (cx−16, y=134), format teks, warna semantik.
   - Verify: output memuat `width="104" height="44"` ×3 dan tidak ada `width="118"`; `font-size="10"` pada class chipmw; gap & margin sesuai target.
2. `tools/sld.test.js` — blok baru (TDD **merah dulu**, sebelum langkah 1):
   - Change: tambah asersi numerik (mis. blok "F2: band generator lega & seimbang"):
     - parse rect chip (`/class="chip" cx-chip="…" x="…" y="148" width="104" height="44"/` → 3), pastikan `width="118"` tidak ada;
     - untuk tiap i: `gap = gx[i+1] − 22 − (chip[i].x + 104) ≥ 20`; `marginR = 700 − (chip[2].x + 104) ≥ 30`;
     - pastikan `font-size="10"` ada di teks `chipmw` dan tidak ada `font-size="10.5"` pada baris MW.
   - Preserve: seluruh asersi lama (cy=170, y2=192, CB, kotak feeder, font floor ≥ 10 — tetap terpenuhi karena min 10).
   - Verify: `node tools/sld.test.js` **gagal** sebelum ubah renderer (red); hijau setelahnya (green).
3. Gate `tools/shoot.js`: minSvgFont efektif ≥ 9,5 (teks MW kini 10 viewBox × skala ≥ 1,0 → ≥ 10 efektif) — wajib cek.

## Scope

- Inherit: `renderSldInto`, semua skenario & state playhead; chip TRIP/maks gov/AGC (format sama, hanya lebih sempit).
- Verify: `sld.test.js` (24 + asersi baru), suite penuh (156 + baru), `shoot.js` bersih, probe (gap 20 / marginR 32 / **tidak ada teks meluber dari chip**).
- Exclude: F1 (garis feeder) & F3 (vertikal) — plan terpisah; jangan ubah y chip di plan ini.

## Validation

- Product: di browser, tiga chip generator terlihat berjarak lega dari lingkaran tetangga; kanan tidak menempel tepi kanvas; teks `· maks gov` tidak terpotong.
- Interface: skenario seimbang + blok-G3 (`100 MW · maks gov` — teks terpanjang) + lepas-G1 (TRIP); viewport 1500×1000 & 1280×720.
- System: tanpa primitif baru; satu resep lebar chip; font floor dipertahankan.
- Repository:
  ```bash
  node tools/sld.test.js          # hijau (asersi F2 baru)
  for t in model timeline sld charts ui snapshot sim plot; do node tools/$t.test.js; done  # semua hijau
  node tools/shoot.js             # bersih (sldScale ≥ 1,0; minSvgFont ≥ 9,5; bodyScroll=0; consoleErrors=0)
  ```
  Probe: gap chip→lingkaran = 20,0; marginR = 32,0; scan overlap antar elemen area > 4 → hanya pasangan intentional (salib/teks-dalam-kotak).

## Stop conditions

- Stop jika teks `125 MW · maks gov` meluber dari chip 104 (cek probe/shoot) — naikkan lebar chip HANYA jika perlu; font MW tidak boleh turun di bawah floor 10.
- Stop jika ada asersi lama sld.test yang gagal di luar blok F2 (kontrak tak terduga) — laporkan, jangan paksa.
- Stop jika shoot melaporkan regresi font efektif < 9,5.

## Design documentation

- Setelah diterima & tervalidasi: catat di bullet **M11** CLAUDE.md (F2: chip 104 @ pitch 180 → gap 20 px & margin kanan 32 px; font MW 10), `design-plans/sesi-2026-09-05-10-…`, perbarui hitungan asersi README/overview, log status plan ini (DIEKSEKUSI → SELESAI).