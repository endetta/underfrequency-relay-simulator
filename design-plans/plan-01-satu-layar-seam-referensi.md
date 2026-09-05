# Plan-01 — Kembalikan seam referensi: satu layar, splash auto, teks terbaca, switch tampilan

> **Status: DIGANTI oleh `plan-02-rombak-layout-ux-satu-layar.md`** (2026-09-05, sesi audit lanjutan
> dengan mandat perubahan besar dari user). Temuan A/B/C dokumen ini terangkum di plan-02 §1; eksekutor
> harap mengikuti plan-02. Dokumen ini dipertahankan sebagai jejak audit awal.
> (Aslinya: DRAF untuk persetujuan user 2026-09-05.)
> **Produk:** `underfrequency_relay_simulator.html` (repo `endetta/underfrequency-relay-simulator`).
> **Sumber bukti:** referensi `LEVEL 2 - DIFFERENTIAL RELAY SIMULATOR/differential_relay_simulator.html`
> (baris 228–245 kunci desktop; baris 1739–1754 splash) & `LEVEL 2 - DISTANCE RELAY SIMULATOR/
> distance_relay_simulator.html` (baris 1605–1619 splash; CLAUDE.md baris 94–97). Komit
> referensi saat audit: Differential `main`, Distance `main`.

## 1. Keadaan sekarang (bukti audit)

| # | Gejala (laporan user) | Bukti |
|---|---|---|
| A | Splash harus diklik dulu sebelum pergi | IIFE splash kita hanya: `setTimeout(add 'go', 120)` + click → `.out`/`.ready`. Referensi (identik di Differential & Distance): `'go'` @20ms → `'out'`+`ready` @1350ms → `skip()` (hapus elemen) @1860ms; klik = skip; `prefers-reduced-motion` = langsung skip; guard `gone`. |
| B | Layout sulit dibaca, teks SLD & kurva kecil; layar tidak dikunci | Kita: `@media(min-width:921px)...{ .l-p{position:sticky;max-height:100vh} .l-side{sticky} }` — tanpa `html,body{overflow:hidden}`, tanpa `.wrap{height:100%;display:flex}`, tanpa `.layout{flex:1;min-height:0;grid-template-rows:minmax(0,1fr)}`. Hasil shoot: doc **1500×1251** pada viewport 1500×1000 → body scroll 251 px; kolom tengah memaksa tumpuk SLD(279)+transport(40)+fch(297)+vch(260). SLD viewBox 940 dirender ~760 px (skala **0,81×**) dengan teks SVG 7,5–11 px → efektif **~6–9 px**; label grafik 8,5–10 px di viewBox 680 (~1:1). Referensi: `html,body{height:100%;overflow:hidden}` + `.layout{flex:1;min-height:0}` + kanvas `viewBox="0 0 640 440" width="100%"` (teks plot 9,5–11 px membesar ~1,25× pada kartu ~800 px → efektif ≥ 12 px). |
| C | Semua panel dipaksa tampil; user minta switch/button utk layout berbeda | Kolom tengah = 4 kartu bertumpuk tanpa kontrol. Referensi: satu kanvas hero (tinggi penuh viewport) + kolom analisis; tidak ada tumpukan paksa. |

## 2. Target (definisi "benar")

Setelah perubahan, di desktop (≥ 921×600):

1. **Satu layar**: `documentElement.scrollHeight == innerHeight` (body TIDAK scroll); hanya kolom params & isi kanan yang scroll internal.
2. **Splash otomatis**: tirai masuk → keluar → terhapus tanpa interaksi (≤ 1,9 s); klik = skip; reduced-motion = langsung ke halaman.
3. **Teks terbaca**: semua teks SVG di SLD & grafik ≥ 10 px dalam koordinat viewBox, dan skala render viewBox → layar ≥ 0,95 (efektif ≥ ~9,5 px, target ≥ 10 px); label & chip minimal 10,5 px efektif.
4. **Switch tampilan tengah**: kontrol segmented `SLD ↔ Grafik`; tiap view memakai seluruh tinggi kolom tengah; state run/playhead tidak hilang saat berpindah.
5. Seam lain TIDAK diregresi: `tt-a/tt-b`, collapse anti-blink, tooltip `?`, scrollbar tipis, pill semantik, transport kompak ≤ 40 px.

## 3. Perubahan spesifik

### 3.1 Splash (port IIFE referensi, sesuaikan nama helper)
Ganti IIFE `splash()` kita dengan port verbatim pola Differential/Distance:
- `setTimeout(()=>sp.classList.add('go'),20)`; `setTimeout(()=>{ sp.classList.add('out'); root.classList.add('ready'); },1350)`; `setTimeout(skip,1860)`; `sp.addEventListener('click',skip)`; guard `gone`; `skip()` membersihkan timer, tambah `ready`, lalu `sp.remove()`.
- `prefers-reduced-motion: reduce` → langsung `skip()`.
- Pertahankan CSS splash & `.wrap{opacity:0}` + `#root.ready .wrap` (jangan hapus).
- Catatan: `tools/shoot.js` `waitReady` tetap perlu skip manual (dismiss deterministik utk screenshot) — tidak berubah.

### 3.2 Kunci satu layar (port blok CSS referensi, adaptasi grid 3 kolom kita)
Ganti media query desktop kita dengan pola Differential (baris 228–245):
```css
@media (min-width:921px) and (min-height:600px){
  html,body{height:100%;overflow:hidden;}
  #root{height:100%;}
  .wrap{height:100%;padding:10px 22px 12px;display:flex;flex-direction:column;}
  .topbar{flex:none;}
  .layout{flex:1;min-height:0;grid-template-columns:300px minmax(0,1fr) 320px;
    grid-template-rows:minmax(0,1fr);gap:14px;align-items:stretch;
    grid-template-areas:"params center side";}
  .l-p{grid-area:params;min-height:0;overflow:hidden;display:flex;flex-direction:column;}
  .params-panel{flex:1;min-height:0;}
  .l-c{grid-area:center;min-height:0;overflow:hidden;display:flex;flex-direction:column;}
  .l-side{grid-area:side;min-height:0;overflow:hidden;display:flex;flex-direction:column;}
  .side-card{flex:1;min-height:0;}
}
```
Kolom tengah `.l-c` = flex column: **baris switch tampilan** (flex:none) → **badan view** (flex:1, min-height:0, overflow:hidden) → **transport** (flex:none, 40 px). Hapus `position:sticky` lama. ≤ 920 px / mobile: kembali ke tumpuk satu kolom (perilaku lama tetap, scroll normal).

### 3.3 Switch tampilan tengah (`SLD ↔ Grafik`)
- Markup baru di kolom tengah: `<div class="vswitch"><button data-view="sld" class="active">SLD</button><button data-view="graf">Grafik</button></div>` (gaya `#spdGroup`/tab yang sudah ada).
- View `sld`: kartu SLD (hero penuh tinggi kolom) + legenda; `fitSld()` disesuaikan agar viewBox 940×248 diskalakan terhadap TINGGI badan (bukan lebar) sehingga skala ≥ 0,95 dan teks membesar.
- View `graf`: grafik frekuensi + gauge (flex:1) di atas grafik tegangan (flex:none ≈ 170 px).
- State `S.ui.view = 'sld'|'graf'`; ganti view tidak mengubah `S.run`/`S.ui.tNow`; `render()` tetap menggambar semua (hidden via CSS `display:none` pada badan view yang tak aktif) — jangan pakai rebuild.
- Kelas tes: `.vswitch`, `[data-view]`, `.view-sld`, `.view-graf`.

### 3.4 Tipografi kanvas (floor keterbacaan)
Di `renderSld`, `renderFreq`, `renderGauge`, `renderVolt` — naikkan SEMUA `font-size` SVG agar **≥ 10** dalam koordinat viewBox, dan naikkan yang saat ini 7,5–9,5:
- SLD: `openlab` 7,5→10; label `TERBUKA`/impor 8,5→10; feeder/gen 9,5–10→11–12; chip 9,5/11→11,5/13; label beban 11→12.
- Grafik: label sumbu 8,5–10→10–11; label ambang/peristiwa/lantai 8,5–9→10–10,5; nilai f playhead 9→10,5.
- Sesuaikan posisi `y` bila perlu (label tetap tidak bertabrakan). Jangan ubah skala `fToY`/`tToX` (dikunci PRD §7, diuji literal).

## 4. Test kit (penambahan/ekstensi — TDD: tulis dulu, merah, lalu implementasi)

### 4.1 `tools/ui.test.js` — section baru "M4.2 seam layar tunggal & splash"
- Splash: `src` memuat `setTimeout(()=>sp.classList.add('go'),20)`, `,1350)`, `setTimeout(skip,1860)`, `sp.addEventListener('click',skip)`, `prefers-reduced-motion` + `return skip()`, `sp.remove()`.
- Kunci layar: `src` memuat `html,body{height:100%;overflow:hidden;}`, `.layout{flex:1;min-height:0`, `grid-template-rows:minmax(0,1fr)`, `.params-panel{flex:1`, `overflow:hidden` pada kolom; dan `position:sticky` TIDAK lagi dipakai untuk `.l-p`/`.l-side` di media desktop.
- Switch: `src` memuat `data-view="sld"` & `data-view="graf"`; perilaku: `setView('graf')` → `S.ui.view==='graf'` dan `syncViewDom()` menandai `.view-sld` nonaktif; ganti view tidak menyentuh `S.run`.
- TIDAK ada regresi: semua check lama tetap hijau.

### 4.2 `tools/sld.test.js` & `tools/charts.test.js` — floor font kanvas
- Scan output `renderSld`/`renderFreq`/`renderGauge`/`renderVolt`: TIDAK boleh ada `font-size` < 10 (regex `font-size="([0-9.]+)"` → semua ≥ 10). Dua-duanya jadi gate keterbacaan.
- Literal geometri lama (119.0, 140.4, dst.) TIDAK berubah (skala dikunci).

### 4.3 `tools/shoot.js` — metrik & view baru
- Metrik `bodyScroll = docH − innerH` (harus 0 di desktop) + `sldScale = sldRenderedW/940` (≥ 0,95) + `minSvgFont` (eval: scan teks SVG SLD/grafik, ukuran efektif terendah via `getComputedTextLength`/`font-size` dari elemen `<text>` yang dirender, ≥ 9,5).
- View baru: `view-graf` (klik switch `data-view="graf"` → doc tetap == viewport, grafik memenuhi kolom tengah) dan `splash-skip` (muat ulang, tanpa klik: splash hilang ≤ 1,9 s → `document.getElementById('splash')` null/display none).

## 5. Definisi selesai (DoD) — "kapan bisa dibilang bagus/benar"

1. Semua suite lama **tetap hijau** (86 asersi: model/timeline/sld/charts/ui) + suite baru di atas hijau (Node ≥ 22, tanpa dependensi).
2. `shoot.js` desktop: `bodyScroll == 0` untuk SEMUA view; `sldScale ≥ 0,95`; font kanvas efektif terendah ≥ 9,5 px.
3. Splash: tanpa klik, elemen `#splash` hilang ≤ 1,9 s setelah load; klik = skip; `prefers-reduced-motion: reduce` (probe CDP) → langsung hilang.
4. Switch `SLD ↔ Grafik`: tiap view memakai tinggi penuh kolom tengah; playhead/run tidak reset; transport & kartu kanan tetap terlihat.
5. `tools/shoot.js` semua view bersih: tanpa overflow > 2 px, tanpa exception konsol, font Google loaded.
6. Bahasa Indonesia konsisten; seam lain (tt-a/tt-b, collapse, qTip, scrollbar, pill) tidak diregresi (ui.test lama).
7. Komit satu perubahan (pesan conventional, Indonesia) + push `origin/main`.

## 6. Langkah eksekusi (urutan TDD)

1. Tulis dulu assertion baru di `ui.test.js`/`sld.test.js`/`charts.test.js` (4.1–4.2) → jalankan → merah (fungsi/class belum ada).
2. Implementasi 3.1 (splash) → hijau.
3. Implementasi 3.2 (kunci layar) + 3.3 (switch + `S.ui.view` + `syncViewDom`/`setView`) → hijau.
4. Implementasi 3.4 (font kanvas) + sesuaikan `fitSld` → hijau (literal geometri lama tak berubah).
5. Perbarui `shoot.js` (4.3) → jalankan semua view; iterasi ukuran font/viewBox sampai DoD 2–3 terpenuhi.
6. Smoke browser manual: splash auto, klik skip, switch, play/scrub di kedua view, collapse, tab kanan.
7. Komit + push `origin/main`; lapor ringkas (file, tes, screenshot).

## 7. Risiko & mitigasi

- **viewBox 940 SLD di hero ~860–900 px** → skala ~0,92–0,96; jika font efektif < 9,5 px setelah kenaikan font, ganti `fitSld()` menjadi adaptif penuh (pola `fitPlane` referensi: viewBox = ukuran elemen) ATAU kurangi lebar viewBox (mis. 900) — ukur di shoot, jangan menebak.
- **Kartu kanan 320 px vs 336 px sekarang**: kolom kanan dijadikan 320 px agar kolom tengah lebih lebar; cek `ui.test.js` tidak meng-hard-code 336 (verifikasi saat eksekusi; jika ada, perbarui assertion—bukan literatur produk).
- **fch+vch di view Grafik**: tinggi badan kolom tengah = viewport − topbar − switch − transport; grafik f flex:1 + tegangan 170 px; jika sempit di 921×600, izinkan scroll internal badan view (overflow-y:auto) — keputusan diukur saat eksekusi.
- **Jangan menyentuh**: skala `fToY`/`tToX`, konstanta gauge, id/kelas yang di-hard-code tes lama (`#sld`, `#fSvg`, `#gauge`, `#vSvg`, `#sidePh`, `#scenGroup`, `.card[data-card]`, `#sldTag`), kontrak model PRD §5.