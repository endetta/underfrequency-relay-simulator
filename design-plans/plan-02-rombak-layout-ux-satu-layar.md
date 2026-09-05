# Plan-02 — Rombak layout desktop: satu layar, hero SLD, switch tampilan, tipografi terbaca

> **Status: DIEKSEKUSI & SELESAI (2026-09-05, commit M5 di `main`).** User menyetujui setelah
> melihat gambaran layout + revisi gauge; eksekusi TDD merah→hijau (92 asersi) + gate shoot
> (bodyScroll=0, sldScale≥1,0, font efektif ≥ 9,5, splash auto ≤ 1,9 s).
> **Menggantikan** `plan-01-satu-layar-seam-referensi.md`
> (plan-01 dikumpulkan ke dokumen ini — lihat §0). Eksekutor = agen/sesi berikutnya; dokumen ini mandiri
> (tanpa konteks audit/percakapan). **Produk:** `underfrequency_relay_simulator.html` (repo
> `endetta/underfrequency-relay-simulator`, branch `main`, HEAD saat audit: `687d418`).
> **Sumber bukti:** referensi `LEVEL 2 - DIFFERENTIAL RELAY SIMULATOR/differential_relay_simulator.html`
> (kunci desktop baris 228–245; splash baris 1739–1754; kanvas `viewBox="0 0 640 440"` width 100%) &
> `LEVEL 2 - DISTANCE RELAY SIMULATOR/distance_relay_simulator.html` (splash baris 1605–1619).
> Bukti render dihasilkan oleh `tools/shoot.js` proyek ini & proyek Differential (artefak di `tools/shots/`).

## 0. Mandat user (ringkas)

User menyetujui **perubahan besar** (layout/struktur boleh dirombak) dengan standar: *tampilan bagus, enak
dilihat, user paham mana yang dikontrol dan mana hasilnya*. Poin eksplisit user:
1. Splash harus keluar **tanpa diklik** (kini harus diklik — beda dari Differential/Distance).
2. Teks SLD & kurva **terlalu kecil**; layar tidak dikunci desktop (referensi = satu layar, kolom scroll internal).
3. Jangan paksa semua panel tampil — sediakan **switch/button** untuk tampilan lain.
4. Panel kiri "Unit pembangkit" boleh jadi **kart dalam kart** (grup visual per generator).
5. Setiap sesi: **dokumentasi** (log sesi di `design-plans/sesi-*.md`) supaya sesi/AI berikutnya tidak bingung.
6. **Revisi gauge (2026-09-05)**: hijau harus di 50 Hz — over-frekuensi (52→50,2) TIDAK boleh hijau (kini stop 0% hijau → salah).
7. **Kartu "Tentang" terpotong** di panel kiri → panel kiri harus scroll internal dengan padding bawah cukup.
8. **Struktur tengah = satu hero per waktu** via switch (user bertanya: terlalu banyak info → tampilkan satu per satu).

## 1. Keadaan sekarang (bukti audit, diukur 2026-09-05 via shoot.js)

| # | Gejala | Bukti terukur |
|---|---|---|
| A | **Splash harus diklik** | IIFE kita (baris 1204–1216): hanya `setTimeout('go',120)` + `click → out/ready`. Referensi (identik Differential & Distance): `'go'`@20ms → `'out'`+`ready`@1350ms → hapus elemen@1860ms; klik=skip; `prefers-reduced-motion`=langsung; guard `gone`. |
| B | **Layar tidak dikunci; teks kecil; kolom kanan kosong** | Kita pakai `position:sticky` saja (baris 97–103) — tanpa `html,body{overflow:hidden}` + `.layout{flex:1;min-height:0}`. Hasil shoot desktop 1500×1000: **doc 1500×1251** (body scroll 251 px); `side-card` hanya **301 px** di kolom kanan (sisa ~700 px kosong); kolom tengah = tumpukan SLD(279)+transport(40)+fch(297)+vch(260). SLD viewBox 940×248 dirender **762×201 (skala 0,81×)** → font SVG 7,5–11 jadi **efektif ~6–9 px**; label grafik 8,5–10 (~1:1). Referensi: doc == viewport (scroll 0), plane hero 686×659 di kartu 722×718, `side-card` **full tinggi** 343.9×717.6, params `scroll 1635px (client 950) → internal`. |
| C | **Semua panel dipaksa tampil** (tidak ada kontrol fokus) | Kolom tengah = 4 kartu bertumpuk tanpa switch; `fitSld()` diskalakan ke LEBAR kartu (762 px) padahal tinggi tersedia ~850 px → diagram gepeng, ruang vertikal terbuang. |
| D | Panel kiri datar | `renderGenList()` = deretan `.field` tanpa pemisah visual antar generator (tidak ada hierarki "kart dalam kart"). |

Tes lama **tidak** meng-hard-code geometri layout (hanya model U01 §12 `7625/1760`, dan kontrak `renderSld` —
koordinat & kelas — lihat §5.2). Layout boleh dirombak tanpa merusak 86 asersi lama **kecuali** literal
geometri SLD (akan diperbarui terlebih dahulu, lihat §4.3 & §5.2).

## 2. Target — definisi "benar" (desktop ≥ 921×600)

1. **Satu layar**: `documentElement.scrollHeight == innerHeight` (body TIDAK scroll); hanya kolom params &
   isi kanan yang scroll internal. Doc == viewport di SEMUA view.
2. **Splash otomatis**: tirai masuk → keluar → terhapus tanpa interaksi ≤ 1,9 s; klik = skip; reduced-motion = langsung.
3. **Teks terbaca**: semua font SVG SLD/gauge/grafik **≥ 10** dalam koordinat viewBox DAN skala render ≥ 1,0
   (efektif ≥ ~10–12 px). SLD mengisi tinggi kolom tengah (hero), bukan strip gepeng.
4. **Switch tampilan tengah** `SLD ↔ Grafik`: tiap view memakai seluruh tinggi kolom tengah; state run/playhead
   TIDAK hilang saat berpindah.
5. **Kontrol vs hasil jelas**: kiri = kontrol (scroll internal), tengah = hasil (hero + grafik), kanan = status
   (full tinggi). Panel kiri "Unit pembangkit" = kart-dalam-kart per generator.
6. Seam lain TIDAK diregresi: `tt-a/tt-b`, collapse anti-blink, tooltip `?`, scrollbar tipis, pill semantik,
   transport kompak 40 px, tab kanan.

## 3. Struktur layout baru (desktop)

```
┌ topbar (flex:none) ────────────────────────────────────────┐
│ judul ····················· Ciutkan semua · Buka semua     │
├──────────────┬───────────────────────────┬─────────────────┤
│ params 300px │ vswitch [SLD|Grafik]      │ side-card 320px │
│ scroll       ├───────────────────────────┤ flex:1 ·        │
│ internal     │ view-sld: SLD hero        │ scroll internal │
│ (params-     │   (SVG skala ≥1,0)        │ (2 tab, M3)     │
│ panel flex:1)│ view-graf: fch (flex:1)   │                 │
│              │            + vch (~170px) │                 │
│              ├───────────────────────────┤                 │
│              │ transport (flex:none 40px)│                 │
└──────────────┴───────────────────────────┴─────────────────┘
```

## 4. Perubahan spesifik

### 4.1 Kunci satu layar (port blok CSS referensi, adaptasi grid 3 kolom)
Ganti media query `@media(min-width:921px) and (min-height:600px)` (baris 97–103) dengan pola Differential
(baris 228–245) + grid 3 kolom milik kita:
```css
@media (min-width:921px) and (min-height:600px){
  html,body{height:100%;overflow:hidden;}
  #root{height:100%;}
  .wrap{height:100%;padding:10px 22px 12px;display:flex;flex-direction:column;}
  .topbar{flex:none;}
  .layout{flex:1;min-height:0;display:grid;grid-template-columns:300px minmax(0,1fr) 320px;
    grid-template-rows:minmax(0,1fr);gap:14px;align-items:stretch;
    grid-template-areas:"params center side";}
  .l-p{grid-area:params;min-height:0;overflow:hidden;display:flex;flex-direction:column;}
  .l-c{grid-area:center;min-height:0;overflow:hidden;display:flex;flex-direction:column;}
  .l-side{grid-area:side;min-height:0;overflow:hidden;display:flex;flex-direction:column;}
  .params-panel{flex:1;min-height:0;}   /* scroll internal tetap */
  .side-card{flex:1;min-height:0;}      /* isi kartu penuh tinggi kolom */
  .transport{flex:none;}
}
```
- **Hapus** `position:sticky` untuk `.l-p`/`.l-side` (desktop). Kolom kanan tidak lagi menyisakan ruang kosong.
- **Perbaiki "Tentang terpotong"**: `.params-panel` butuh `padding:2px 3px 14px 0` (padding bawah ≥ 12 px)
  + `scrollbar-gutter:stable` tetap — kartu terakhir (Tentang) harus bisa digulir penuh & tak menempel tepi bawah.
- `.l-c` (kontainer baru): `vswitch` (flex:none) → `.view` (flex:1;min-height:0;overflow:hidden) → `.transport` (flex:none).
- **Tidak boleh ada** `html,body` lock di ≤ 920 px: mobile tetap tumpuk satu kolom, scroll normal (perilaku lama dipertahankan).
- `.wrap` lama punya `padding:14px 22px 40px;max-width:1560px` — pertahankan `max-width` & `margin:0 auto`, ganti padding di breakpoint desktop.

### 4.2 Switch tampilan tengah (`SLD ↔ Grafik`)
- Markup baru di dalam `.l-c` (sebelum badan view):
  `<div class="vswitch" id="vswitch"><button data-view="sld" class="active">SLD</button><button data-view="graf">Grafik</button></div>`
  Gaya = reuse tab kartu kanan / `#spdGroup` (`.active` = biru). Tinggi ~32–36 px.
- Struktur badan: `<div class="view view-sld" id="viewSld">` berisi kartu SLD (`#sldCard` + legenda);
  `<div class="view view-graf" id="viewGraf">` berisi kartu fch (`#fSvg`+gauge) & vch (`#vSvg`).
  View tak aktif disembunyikan via CSS (`display:none`) — **jangan rebuild innerHTML** → state run/playhead aman.
- State: `S.ui.view = 'sld' | 'graf'` (default `'sld'`). API baru: `setView(v)` + `syncViewDom()` (toggle
  `.active` & `.view-*`). Ganti view TIDAK menyentuh `S.run`/`S.ui.tNow`; saat pindah ke `sld` panggil `fitSld()`.
- Binding: delegasi klik di `#vswitch` (pola delegasi `#scenGroup` yang sudah ada).

### 4.3 SLD: komposisi lebih TINGGI + skala ke tinggi (viewBox baru)
Akar masalah: aspect 940×248 (3,79:1) dalam kolom ~808×850 → skala dibatasi lebar (0,81–0,88) dan ~600 px
tinggi terbuang. Solusi: **komposisi ulang ke aspect ~1,35:1** (topologi & simbol DIREVISI USER TETAP —
lingkaran+salib, bus solid, vital teal, pemutus miring + TERBUKA, tanpa dasharray):
- **viewBox baru `0 0 700 520`** → skala hero = min(808/700, ~810/520) = min(1,15, 1,56) = **≈1,15** →
  font ≥ 10 efektif ≥ 11,5 px. (Ukur di shoot; jika < 1,0 turunkan lebar viewBox ke 660.)
- **Anchors komposisi** (koordinat viewBox; eksekutor bebas menyetel untuk hindari tabrakan label, wajib font ≥ 10):
  - Bus: garis horizontal `y=260`, `x1=70 → x2=590`, stroke-width 7, `class="bus"`.
  - Interkoneksi: kotak label (60,150,110,34) "INTERKONEKSI" (10–11px) + baris MW (11–12px); vertikal `x=115`
    dari kotak ke bus; pemutus `(111,252,8,8)` + `rotate(45 115 256)` saat lepas; label TERBUKA ≥ 10 px saat lepas.
  - Feeder (5): `x = [120, 225, 330, 435, 540]`; kotak label (x−55, 36, 110, 36) 11 px; vertikal `y 72→252`
    warna hijau/teal (vital di x=540, teal, label "VITAL · … MW"); pemutus `(x−4, 244, 8, 8)`; panah aliran
    di antara y 140–220; label TERBUKA ≥ 10 px saat terbuka.
  - Generator (3): `x = [170, 350, 530]`; vertikal `y 260→300`; simbol lingkaran r=22 `cy=322` + salib ×;
    id 12 px `y=362`; **chip di samping kanan simbol** (bukan di bawah): rect (x+34, 296, 118, 44), teks
    RPM/TRIP 12 px `y=316`, MW 11 px `y=332`; chip abu saat TRIP, copper saat maks gov.
  - Label beban: kanan-atas bus `x=690` anchor end, 11,5 px ("Beban N MW · lepas M").
- **`fitSld()` baru**: skala = `Math.min(availW/700, availH/520)` dari kotak view `#viewSld`
  (ukuran = lebar kolom, tinggi = badan view dikurangi judul kartu & legenda); set `width=700·s`, `height=520·s`.
  ResizeObserver pindah ke `#viewSld`. Jangan ubah model/koordinat listrik — hanya koordinat GAMBAR.

### 4.4 Floor tipografi kanvas
Di `renderSld`, `renderFreq`, `renderGauge`, `renderVolt`: naikkan SEMUA `font-size` SVG agar **≥ 10**
dalam koordinat viewBox (yang 7,5–9,5 → 10–11; yang 10–11,5 → 11–12,5). **Jangan ubah** skala
`fToY`/`tToX`/gauge (dikunci PRD §7 — literal `119.0`, `140.4`, dst. di charts.test.js TIDAK berubah).

### 4.4b Gauge: hijau HANYA di zona 50 Hz (revisi user)
`renderGauge` kini: stop 0% hijau, 40% hijau, 55% copper, 100% merah → over-frekuensi ikut hijau (SALAH).
Baru — hijau tepat di pita normal ±0,2 Hz (50,2→49,8, sama dengan `.band` di grafik f); atasnya (over-frekuensi)
copper; bawahnya fade copper→merah:
```
stop offset="0%"  #B5651D   (52 Hz  — over-frekuensi, copper)
stop offset="36%" #B5651D   (50,2 Hz — batas atas pita normal)
stop offset="38%" #2E7D46   (≈50,1 Hz — hijau mulai)
stop offset="44%" #2E7D46   (49,8 Hz — batas bawah pita normal)
stop offset="62%" #B5651D   (≈48,0 Hz — transisi ke merah)
stop offset="100%" #C0392B (47 Hz  — merah)
```
- Geometri penunjuk & tick TIDAK berubah (`y(50)=97,6`, `y(49,5)=119`, tick 47–52, nilai f tertulis).
- Posisi stop dihitung dari `fToY` (dikunci PRD §7): `y(50,2)=89,04` = 36% dari bar 12→226; `y(49,8)=106,16` = 44%.
- Warna over-frekuensi = copper (warna warning proyek, konsisten dgn ambang UFLS); bila user mau warna lain,
  cukup ganti 2 stop pertama (satu-satunya tempat yang perlu diubah).

### 4.5 Splash otomatis (port IIFE referensi)
Ganti IIFE `splash()` (baris 1204–1216) dengan pola Differential/Distance:
`setTimeout('go',20)` → `setTimeout('out'+'ready',1350)` → `setTimeout(skip,1860)`; `click=skip`; guard `gone`;
`skip()` bersihkan timer + tambah `ready` + `sp.remove()`; `prefers-reduced-motion: reduce` → `skip()` langsung.
Pertahankan CSS splash + `.wrap{opacity:0}` + `#root.ready .wrap` (jangan hapus). `tools/shoot.js waitReady`
tetap skip manual (screenshot deterministik).

### 4.6 Panel kiri: kart-dalam-kart "Unit pembangkit"
`renderGenList()` dirombak: tiap generator = sub-kartu `.gencard` (border + radius 9, padding 9, latar `--bg`)
dengan:
- Header: dot status warna (biru = online default; abu saat skenario G offline) + `G1 — <label>` (12px, bold)
  + badge MW (`<b>500 MW</b>` kanan).
- Isi: baris spec 10,5–11 px mono ("H 6,0 s · droop 4% · kutub 2 · maks gov 140 MW").
Sub-kartu memakai `margin-bottom:8px`. Kelas baru `.gencard` — tes cukup mengecek keberadaan kelas + jumlah
sub-kartu == `S.param.gens.length`. (Visual grouping saja; TIDAK menambah kontrol edit baru di luar yang ada.)

## 4.7 Hasil eksekusi (ringkas, diverifikasi 2026-09-05)

- Semua suite hijau: 92 asersi (31 model + 10 timeline + 13 sld + 14 charts + 24 ui).
- shoot.js (8 view + mobile + splash-auto): `bodyScroll=0` semua view desktop, `sldScale=1,11`,
  `minSvgFont` efektif 11,11 (SLD) / 10 (Grafik), transport 40 px, `overflow none · consoleErrors=0`.
- Splash auto terverifikasi CDP: `go` → `go out` → terhapus dari DOM di t≈1,8 s TANPA klik.
- Mobile tetap tumpuk + scroll normal (bukan target gate desktop).
- Catatan implementasi: bug nyata ditemukan & diperbaiki — (1) `fitSld` lama diskalakan ke lebar
  (0,81×); (2) CSS `.vswitch` base menimpa media query mobile → `display:none!important`;
  (3) regex `\s+` di template literal shoot.js termakan escape Node (`/s+/`) → metrik font salah;
  (4) splash lama butuh klik.

## 5. Test kit (TDD: tulis dulu → MERAH → implementasi → hijau)

### 5.1 `tools/ui.test.js` — section baru "M5: satu layar, splash auto, switch view"
- **Splash auto (src)**: memuat `setTimeout(()=>sp.classList.add('go'),20)`, `,1350)`, `setTimeout(skip,1860)`,
  `sp.addEventListener('click',skip)`, `prefers-reduced-motion` + panggilan skip, `sp.remove()`.
  (Harness stub-DOM tidak menjalankan timer → cek string + API, bukan perilaku waktu.)
- **Kunci layar (src)**: memuat `html,body{height:100%;overflow:hidden;}`, `.layout{flex:1;min-height:0`,
  `grid-template-rows:minmax(0,1fr)`, `.params-panel{flex:1;min-height:0`, `.side-card{flex:1;min-height:0`,
  dan `position:sticky` TIDAK dipakai untuk `.l-p`/`.l-side` di blok desktop.
- **Switch (API)**: `A.setView('graf')` → `A.S.ui.view==='graf'`; `syncViewDom()` menandai `.view-sld` nonaktif &
  tombol `.active` pindah; `A.S.run` dan `A.S.ui.tNow` TIDAK berubah; `A.setView('sld')` mengembalikan.
- **Kart-dalam-kart (API)**: `renderGenList()` menghasilkan `.gencard` sebanyak `S.param.gens.length`.
- Semua check lama TETAP hijau (tidak ada regresi).

### 5.2 `tools/sld.test.js` — perbarui literal koordinat (perilaku TIDAK berubah)
Literal berikut menyesuaikan komposisi baru §4.3 (nilai lama → baru):
- bus `stroke-width="6"` → `"7"` (tetap `class="bus"`, 1 buah).
- feeder vital `x1="750" y1="120" x2="750" y2="82" stroke="#13697A"` → koordinat baru `x=540` (`y 72→252`).
- pemutus impor `rotate(45 80 116)` → `rotate(45 115 256)`; `TERBUKA` tetap berlabel saat terbuka.
- jumlah pemutus tetap 6 (`class="brk"`), `data-open`/`TERBUKA`/`maks gov`/`TRIP`/`RPM` count TIDAK berubah.
- **Tambahan gate font**: scan output `renderSld` → TIDAK ada `font-size="…"` < 10 (regex).
- PERTAHANKAN: 3 lingkaran `.gen` + 6 garis `.xc`, tanpa `stroke-dasharray`, `Beban … MW` label, `VITAL · 550 MW`.

### 5.3 `tools/charts.test.js` — gate font + revisi literal gauge
- Scan `renderFreq`/`renderGauge`/`renderVolt`: semua `font-size` ≥ 10.
- **Literal gauge BERUBAH (merah dulu)**: check `'gauge: gradien … stop 0/40/55/100%'` dirombak →
  `offset="0%"` memuat `#B5651D` (puncak copper, BUKAN hijau), `offset="100%"` memuat `#C0392B` (merah),
  dan `#2E7D46` hadir di stop sekitar 40% (zona 50 Hz). Ini tes lama yang MENG-ENCODE bug
  ("puncak harus hijau") — perbarui sesuai kontrak baru §4.4b.
- Literal geometri lain TIDAK berubah: `119.0`, `140.4`, `161.8`, `183.2`, band 89.04–106.16,
  penunjuk `y(50)=97,6` / `y(49,5)=119`, tick 47–52.

### 5.4 `tools/shoot.js` — metrik & view baru
- Metrik: `bodyScroll = docH − innerH` (harus 0 di desktop semua view); `sldScale = sldW/700` (≥ 1,0);
  `minSvgFont` (evaluasi di halaman: `min(font-size × (renderedW/viewBoxW))` utk elemen `<text>` SLD & grafik, ≥ 9,5);
  rect `#viewSld`/`#viewGraf`/`#vswitch`; sesuaikan crop `*-sld.ascii` ke rect SVG baru.
- View baru: `view-graf` (klik `data-view="graf"` → doc == viewport, grafik memenuhi kolom tengah, transport &
  side tetap terlihat) dan `splash-auto` (load baru TANPA klik: `#splash` hilang/display none ≤ 1,9 s).

## 6. Urutan eksekusi (TDD)

1. Tulis assertion baru 5.1–5.3 + perbarui literal 5.2 → jalankan → MERAH.
2. Implementasi 4.5 (splash auto) → hijau.
3. Implementasi 4.1 (kunci layar) + 4.2 (switch + `S.ui.view`/`setView`/`syncViewDom`) → hijau.
4. Implementasi 4.3 (komposisi SLD + `fitSld`) + 4.4 (font floor) → hijau (literal model tak berubah).
5. Implementasi 4.6 (kart-dalam-kart params) → hijau.
6. Perbarui `shoot.js` (5.4) → jalankan SEMUA view; iterasi viewBox/ukuran font sampai DoD 2–3 terpenuhi.
7. Smoke browser manual: splash auto + klik skip, switch di tengah play/scrub, collapse, tab kanan, mobile.
8. Komit satu perubahan (conventional, Indonesia) + push `origin/main`; tulis log sesi (§8).

## 7. Definisi selesai (DoD) — "kapan bisa dibilang bagus/benar"

1. Semua suite lama hijau (86 asersi: model/timeline/sld/charts/ui) + assertion baru di atas hijau (Node ≥ 22, tanpa dependensi).
2. `shoot.js` desktop: `bodyScroll == 0` untuk SEMUA view (init/mid/runtuh/g1-end/collapsed/view-graf); `sldScale ≥ 1,0`; font kanvas efektif terendah ≥ 9,5 px.
3. Splash: tanpa klik, `#splash` hilang ≤ 1,9 s; klik = skip; reduced-motion (probe CDP) = langsung hilang.
4. Switch `SLD ↔ Grafik`: tiap view memakai tinggi penuh kolom tengah; playhead/run TIDAK reset saat pindah; transport & kartu kanan tetap terlihat.
5. `shoot.js` semua view bersih: tanpa overflow > 2 px, tanpa exception konsol, font Google loaded.
6. Bahasa Indonesia konsisten; seam lain (tt-a/tt-b, collapse anti-blink, qTip, scrollbar, pill, transport 40 px, tab kanan) tidak diregresi (ui.test lama).
7. Komit satu perubahan + push `origin/main`; log sesi diperbarui; `CLAUDE.md` proyek dicatat (status layout + lokasi plan/log).

## 8. Log sesi & kelanjutan

- Audit & plan: sesi 2026-09-05-01 (lihat `design-plans/sesi-2026-09-05-01-audit-rombak-layout.md`).
- HEAD saat audit: `687d418` (main, bersih; `design-plans/` belum di-commit).
- Setelah user menyetujui plan ini → eksekusi §6; tiap milestone commit + push; tutup log sesi.

## 9. Risiko & mitigasi

- **Skala SLD** di 921×600 (kolom tengah lebih sempit): jika `sldScale < 1,0`, perkecil lebar viewBox (700→660)
  atau naikkan font floor SLD ke 11–12 — ukur di shoot, jangan menebak.
- **view-graf di 921×600 sempit**: fch flex:1 + vch ~170 px; jika badan view < 420 px, izinkan scroll internal
  badan view (`overflow-y:auto`) — keputusan diukur saat eksekusi.
- **Literal sld.test.js**: hanya koordinat GAMBAR yang berubah; pastikan count perilaku (pemutus, TERBUKA,
  maks gov, TRIP, RPM, vital teal, tanpa dasharray) tetap sama — baca test lama sebelum mengedit.
- **Jangan sentuh**: model PRD §5 (`ufTimeline`, droop, UFLS), skala `fToY`/`tToX`, konstanta gauge,
  id/kelas yang di-hard-code tes lama (`#sld`, `#fSvg`, `#gauge`, `#vSvg`, `#sidePh`, `#scenGroup`,
  `.card[data-card]`, `#sldTag`, `#playBtn`, `#scrub`, `#resetBtn`, `#tNow`, `#spdGroup`, `#presetSel`, `#impSlider`).