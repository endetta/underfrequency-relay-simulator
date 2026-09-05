# F1 — Garis feeder tersambung ke kotak (hilangkan gap 8 px)

> **Status: ✅ DIEKSEKUSI & SELESAI** (2026-09-05, commit `HEAD` sesi-10; log:
> `design-plans/sesi-2026-09-05-10-…`). Sebelumnya DRAF — hasil audit improve-ui
> (temuan F1, dipilih user bersama F2 & F3).
> Written against: `4f480a1` (K3 plotSpace — SLD masih: garis feeder `y2="392"`, kotak `y="400"`)
> Eksekusi TDD merah→hijau + gate penuh (lihat Validation) — bukti: sld 24 lulus,
> 8 suite (156 asersi) hijau, shoot bersih (sldScale 1,11), probe CDP gap=0 ×5.
> Lanjutan: plan-05 (F2) & plan-06 (F3) masih DRAF.

## Evidence chain

- Surface: hero SLD (`#sld`, viewBox 700×520) — `underfrequency_relay_simulator.html`, renderer `renderSld` (seksi §13a, blok "feeder beban (BAWAH bus, M8)").
- Problem: kelima garis feeder vertikal berhenti di `y=392`, sedangkan kotak feeder dimulai di `y=400` → **garis menggantung 8 px di atas kotak** (terukur probe CDP di Chrome nyata, 2 skenario: lineBottom 392 → boxTop 400 = 8,0 px × 5). Kontras dengan koneksi lain yang menyentuh simpul (gen 192→lingkaran = 0 px; impor 252→CB = 2 px).
- Design evidence: permintaan user sesi ini — "linenya terhubung masuk akal semua"; komentar tes M8 sendiri ("garis tiap feeder harus turun dari bus (260) ke kotak") menyiratkan garis harus MENCAPAI kotak; `sesi-2026-09-05-04` (M8) tidak menyebut alasan jeda 8 px.
- Owner: `renderSld` (garis feeder) + `tools/sld.test.js` (3 literal `y2="392"`).
- Scope and affected surfaces: `underfrequency_relay_simulator.html` (renderSld), `tools/sld.test.js` (blok M8), gate `tools/shoot.js` (sldScale/minSvgFont tak berubah).
- Uncertainty: none — angka terukur & deterministik; koreksi satu nilai.

## Design decision

Perpanjang garis feeder dari `y2="392"` menjadi `y2="400"` sehingga garis **menyentuh tepi atas kotak feeder** (kotak tetap di `y=400`). Ini menyamakan perilaku koneksi dengan pasangan simpul lain di kanvas: garis berhenti tepat di tepi elemen tujuan. Panah aliran (330/365), CB (268–280), dan label TERBUKA (298) tidak tersentuh.

## Reuse

- Simbol & palet: `var(--green)` / `var(--teal)` per feeder — tidak berubah.
- Kotak feeder M9: `(x−48, 400, 96×52)` — tidak berubah.
- Contoh koneksi menyentuh simpul: garis generator `y2="192"` = tepi bawah lingkaran (cy 170 + r 22) — pola yang sama diterapkan ke feeder.

## Changes

1. `underfrequency_relay_simulator.html` — `renderSld`, loop feeder:
   - Change: `<line x1="…" y1="260" x2="…" y2="392"` → `y2="400"` (5 feeder; vital tetap `stroke="var(--teal)"`).
   - Preserve: semua koordinat lain (bus 260, CB y=268, panah, kotak y=400, label dua baris, font ≥ 10, tanpa dasharray).
   - Verify: output SVG memuat `y1="260"` … `y2="400"` untuk kelima feeder; tidak ada lagi `y2="392"` di renderSld.
2. `tools/sld.test.js` — blok M8 (TDD **merah dulu**, sebelum langkah 1):
   - Change: **2 asersi** yang memuat `y2="392"` (baris 65 vital-literal `'x1="540" y1="260" x2="540" y2="392" stroke="var(--teal)"'` dan baris 150 `count(s, 'y2="392"') !== 5`) → `y2="400"`; komentar dalam pesan error baris 150 ("garis tiap feeder harus turun dari bus (260) ke kotak (y2=392)") → "(y2=400 — menyentuh tepi kotak, F1)".
   - Preserve: seluruh asersi lain (jumlah CB, kotak 96 @ pitch 105, cy=170, dll.).
   - Verify: setelah update 2 asersi + komentar + sebelum ubah renderer → `node tools/sld.test.js` **gagal** (red); setelah ubah renderer → hijau (green).
3. `tools/shoot.js` tidak berubah; `tools/charts/ui/model/timeline/snapshot/sim/plot` tidak berubah.

## Scope

- Inherit: `renderSldInto` (memanggil renderSld — otomatis), semua skenario & state playhead.
- Verify: `sld.test.js` penuh (24 asersi; 3 literal berubah), `shoot.js` (sldScale ≥ 1,0, minSvgFont ≥ 9,5, bodyScroll=0, overflow none, consoleErrors=0), scan probe gap = 0.
- Exclude: F2 (spasi band generator) & F3 (void vertikal) — plan terpisah; jangan ubah posisi kotak/garis lain di plan ini.

## Validation

- Product: di browser, setiap feeder tampak tersambung dari bus → CB → panah → kotak tanpa garis "putus" di atas kotak.
- Interface: 5 skenario (seimbang, impor-lepas, lepas-G1/G2, blok-G3, +beban) × playhead awal/tengah/akhir; viewport 1500×1000 & 1280×720.
- System: pola koneksi kini seragam (simpul = tepi elemen); tanpa primitif baru.
- Repository:
  ```bash
  node tools/sld.test.js          # 24 asersi (3 literal baru) hijau
  for t in model timeline sld charts ui snapshot sim plot; do node tools/$t.test.js; done  # 156 asersi hijau
  node tools/shoot.js             # bersih: sldScale ≥ 1,0, font ≥ 9,5, bodyScroll=0, consoleErrors=0
  ```
  Probe CDP (pola sesi-05/audit): untuk tiap feeder, `lineBottom == boxTop` (gap 0).

## Stop conditions

- Stop jika tes M8 lain ikut gagal di luar 3 literal `y2="392"` (berarti ada kontrak geometri lain yang bergantung — periksa & laporkan, jangan paksa).
- Stop jika `shoot.js` melaporkan regresi (sldScale < 1,0 / font efektif < 9,5 / overflow) — batalkan perubahan, kembalikan tes.

## Design documentation

- Setelah diterima & tervalidasi: tambah bullet **M11** di CLAUDE.md (F1: garis feeder menyentuh kotak y2=400 — hilangkan gap 8 px, TDD), catat di `design-plans/sesi-2026-09-05-10-…` (atau nomor sesi berikutnya), perbarui hitungan asersi di README/overview bila sld.test bertambah, dan log eksekusi plan ini (status DIEKSEKUSI → SELESAI).