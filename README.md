# Simulator Underfrequency Relay (ANSI 81U)

Simulator edukasi **relay underfrequency + pelepasan beban bertahap (UFLS)** untuk
sistem satu-area koheren — satu file HTML vanilla, tanpa build, tanpa framework.

## Cara menjalankan

Buka `underfrequency_relay_simulator.html` langsung di browser (Chrome/Edge/Firefox
terbaru), atau:

```bash
python -m http.server 8000
# lalu buka http://localhost:8000/underfrequency_relay_simulator.html
```

Tidak ada instalasi, tidak ada build. Semua model & UI ada di satu file.

## Fitur

- **Layout desktop satu layar**: splash auto, switch `SLD|Grafik`, kolom params &
  kartu kanan scroll internal; layar kecil = tumpuk dengan kartu collapse `.card-b-i`.
- **SLD interaktif** — 3 generator (simbol lingkaran+salib, **di atas bus**, chip
  RPM/MW live: online / *maks gov* saat headroom habis / TRIP), 5 feeder beban
  (T1–T4 + beban vital teal, **di bawah bus**) sebagai kotak label dua-baris yang
  tidak saling tumpuk, jalur interkoneksi yang bisa lepas, pemutus kotak 12×12
  lurus vs miring 45° + label TERBUKA; chip AGC saat kendali sekunder bekerja.
- **8 chip skenario** (peristiwa dipicu t=1,0 s, klik = auto-play): Seimbang ·
  Lepas G1 · Lepas G2 · Lepas G3 · Lepas interkoneksi · +Beban [MW] (slider) ·
  Blok G3 (maks 100 MW) · +Beban besar (→ RUNTUH).
- **Transport real-time**: ▶/❚❚, kecepatan 0,5×/1×/2× (1× = 1 s simulasi per
  detik dinding), scrubber 0–30 s, Reset.
- **Grafik frekuensi** 0–30 s / 47–52 Hz: pita normal ±0,2 Hz, garis 50 Hz,
  ambang UFLS T1–T4 putus-putus, penanda peristiwa & trip; **indikator batang
  gradien** hijau→copper→merah dengan penunjuk & nilai. Kartu grafik **mengisi
  penuh tinggi kolom** (svg diukur & digambar ulang 1:1 — tanpa ruang kosong bawah).
- **Grafik tegangan** (ilustratif — bukan hasil aliran daya): lekukan & pemulihan
  eksponensial, lantai 0,85 pu saat runtuh.
- **Kartu status 2 tab**: Kondisi sistem (pill status + fase kendali, f, ROCOF,
  beban, pembangkitan, dukungan governor, dukungan AGC, headroom, defisit) &
  Urutan pelepasan (urutan trip, −MW nyata, beban sebelum→sesudah, total lepas).
- **Model**: hierarki kendali frekuensi tiga lapis **governor → AGC sekunder →
  UFLS** (ADR-0006); swing equation satu-area (ROCOF), governor droop dengan
  saturasi headroom, solver piecewise + timeline deterministik (parity < 1e-6),
  UFLS berjenjang (arm ketat, timer reset, latch, shed MW nyata feeder), status
  SEIMBANG/DEFISIT/PELEPASAN BEBAN/PEMULIHAN/RUNTUH.

## Validasi

```bash
node tools/model.test.js     # model murni (literal U01 §12 + hitung tangan)
node tools/timeline.test.js  # determinisme, urutan trip, parity, RUNTUH
node tools/sld.test.js       # geometri SLD
node tools/charts.test.js    # skala grafik/gauge/tegangan
node tools/ui.test.js        # seam desain & perilaku UI
node tools/shoot.js          # screenshot semua view → tools/shots/
```

131 asersi, hijau di Node ≥ 22 (tanpa dependensi) — model 33 · timeline 21 · sld 24 ·
charts 19 · ui 34. Detail: `docs/overview.md`, `docs/PRD.md` (model),
`docs/implementation-plan.md` (kontrak).

## Catatan

- Ambang & porsi UFLS = praktik tipikal global; **belum diverifikasi ke pedoman
  resmi PLN** (catatan ambar di UI, lihat `docs/research/pln-underfrequency-practice.md`).
- Kurva tegangan bersifat **ilustratif**, bukan hasil aliran daya.
- Proyek referensi: [Differential Relay Simulator](https://github.com/endetta/differential-relay-simulator),
  [Distance Relay Simulator](https://github.com/endetta/distance-relay-simulator).
  Rantai model mengacu spesifikasi U01 (modul React `endetta/protection-relay-simulator`),
  diimplementasikan ulang secara mandiri (ADR-0001/0002).