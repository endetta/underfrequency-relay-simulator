# PRD — Simulator Underfrequency Relay (ANSI 81U)

> **Status:** DRAF 0.1 untuk persetujuan — 2026-09-05.
> **Bentuk produk:** satu file HTML vanilla mandiri (`underfrequency_relay_simulator.html`),
> tanpa build, Bahasa Indonesia — saudara kandung proyek
> `LEVEL 2 - DIFFERENTIAL RELAY SIMULATOR` & `LEVEL 2 - DISTANCE RELAY SIMULATOR`.
> **Dokumen pendamping:** keputusan arsitektur di `docs/adr/` (0001–0006), riset PLN di
> `docs/research/pln-underfrequency-practice.md`, terminologi baku di `CONTEXT.md`.
> **Bagian 5 dokumen ini = sumber kebenaran model** — ubah rumus inti hanya bersama dokumen ini.

---

## 1. Ringkasan produk

Simulator edukasi untuk **relai underfrequency (ANSI 81U)** dan skema **pelepasan beban
otomatis (UFLS)**. Pengguna mengamati sistem tenaga satu-area yang seimbang, memicu satu
peristiwa gangguan (unit lepas / tambah beban / interkoneksi lepas / unit terblok), lalu
menyaksikan urutan fisiologis proteksi frekuensi:

1. **Inersia** menahan frekuensi (ROCOF awal dari persamaan ayunan);
2. **Governor** menambah output unit (droop statis, dibatasi headroom) — garis pertama;
3. Bila masih turun, **tahap UFLS** bekerja berurutan (ambang + tunda) memutus feeder —
   garis terakhir; setiap pelepasan terlihat di SLD (pemutus terbuka, aliran terputus)
   dan tercatat di kartu urutan;
4. Sistem **pulih** ke kesetimbangan baru, atau **runtuh** (COLLAPSE) bila defisit tak
   tertahankan.

Tujuan edukasi: *mengapa* frekuensi turun, *apa* yang dilakukan governor, *beban mana*
yang diputus lebih dulu, dan *kapan* sistem tak tertahankan. Bukan emulasi relai vendor,
bukan simulasi stabilitas multi-mesin, bukan aliran daya.

## 2. Konteks & batasan proyek

- **Dua implementasi underfrequency by design** (ADR-0001): modul React LEVEL 3
  (`/simulator/underfrequency`, spesifikasi U01) **tidak disentuh**; proyek ini mandiri.
  Spesifikasi U01 hanya dipakai sebagai **referensi persamaan** — §5 menulis ulang
  rantai yang sama dalam versi proyek ini.
- **Pakem visual** = port seam Differential/Distance (splash ivory/krem, header
  `.tt-a↔.tt-b`, tema `--ink/--copper/--blue/--teal`, kartu collapse `.card-b-i`,
  label SVG ber-halo, tooltip ikon "?", scrollbar tipis). Jangan regresi seam itu.
- **Angka PLN**: pita normal 50 ± 0,2 Hz; ambang & porsi lepas default = **praktik
  tipikal global** (49,50/49,00/48,50/48,00 Hz; 5/10/15/20%; tunda 0,2–0,5 s) —
  **belum diverifikasi ke pedoman resmi PLN** → UI wajib menampilkan catatan ambar
  `plnVerificationRequired`. Konteks riset: `docs/research/`.
- **Model tegangan = ilustratif berlabel** (ADR-0004), bukan hasil aliran daya.
- **Dikecualikan** (ikuti U01 & konvensi library): aliran daya/reaktif penuh, multi-area
  & ayunan rotor per-mesin, under-voltage load shedding, ROCOF sebagai elemen trip,
  restorasi beban otomatis, ketergantungan beban pada frekuensi (defisit D konstan),
  deadband/lag governor, unit commitment, kompensator/SVC/baterai/HVDC.

## 3. Topologi & skenario (ringkas)

Lihat ADR-0003 & ADR-0005 untuk alasan. Nilai default:

| Entitas | Nilai default |
|---|---|
| G1 — Thermal 600 MW | MVA 700 · H 5,0 s · R 5% · 2 kutub · govMax 640 · output 500 MW |
| G2 — Hydro 400 MW | MVA 450 · H 4,0 s · R 4% · 4 kutub · govMax 430 · output 350 MW |
| G3 — Gas 300 MW | MVA 330 · H 4,5 s · R 5% · 2 kutub · govMax 320 · output 250 MW |
| Beban dasar (mandiri) | **1100 MW** = Σ output (setimbang) |
| Feeder tahap 1..4 | 55 / 110 / 165 / 220 MW (sama dengan 5/10/15/20% beban dasar) |
| Beban vital | 550 MW (tidak pernah dilepas) |
| Impor (interkoneksi) | 0 MW default (preset berimpor: 400 MW, beban jadi 1500 MW) |
| Tahap UFLS | T1 49,50 Hz/0,20 s/5% · T2 49,00/0,30/10% · T3 48,50/0,40/15% · T4 48,00/0,50/20% |

Aturan kejujuran feeder: MW feeder default **diturunkan dari beban dasar × fraksi
tahap**; bila user mengubah MW feeder, yang dilepas saat trip = **MW nyata feeder**
(tabel % hanyalah rencana/target, SLD menunjukkan kenyataan).

Peristiwa (skenario): **GENERATOR_LOSS** (unit pilihan lepas), **LOAD_STEP** (tambah
beban MW — beban tambahan bersifat *dapat dilepas*, feeder maya ekstra), **IMPORT_LOSS**
(Lepas interkoneksi, hanya bermakna saat impor > 0), **GENERATOR_BLOCK** (batas governor
unit diturunkan → jenuh). Peristiwa diterapkan pada **t = 1,0 s** setelah ▶ (v1 tanpa
event-at-playhead).

## 4. Fitur & tata letak UI

Layout desktop terkunci satu layar (≥921×600) ala proyek referensi; layar kecil = scroll
biasa dengan kartu menumpuk (collapse `.card-b-i`).

```
┌──────────────────── topbar (judul bergantian + kilau) ────────────────────┐
│ KOLOM KIRI (params)  │  KOLOM TENGAH                       │ KOLOM KANAN   │
│ • Unit pembangkit    │  ┌─ SLD (hero) ───────────────────┐ │ ┌─ Status &   │
│   (slider+angka per  │  │ G1 G2 G3 ── bus ── feeder T1..T4│ │ │  pelepasan ─┤
│   unit: MVA, output, │  │ chip RPM+MW live · Impor X MW  │ │ │ Tab 1 Kondisi│
│   H, R, kutub, govMax│  │ pemutus · aliran MW · vital    │ │ │ sistem      │
│   + jalur impor MW)  │  └────────────────────────────────┘ │ │ Tab 2 Urutan │
│ • Beban & tahap UFLS │  ┌─ transport: ▶ ⏸ | 0,5× 1× 2×   ┐│ │ pelepasan   │
│   (ambang/tunda/% +  │  │──── scrubber t ──── Reset────── ││ └─────────────┘
│   MW feeder + vital) │  └────────────────────────────────┘│
│ • Skenario           │  ┌─ Grafik frekuensi ─────┬── indikator batang gradien ┐
│ • Tentang (info/PLN) │  │ kurva f(t) 47–52 Hz    │  vertikal 47–52 Hz, hijau→│
└──────────────────────┘  │ garis ambang 49,5/49,0… │  merah, penunjuk + nilai f│
                          │ penanda peristiwa       │  └─────────────────────────┘
                          ├─ Grafik tegangan (pu 0,85–1,05, label "ilustratif") ─┤
                          └───────────────────────────────────────────────────────┘
```

### 4.1 SLD (hero)
- 3 kotak unit G1–G3: status ONLINE/TRIP (abu-abu saat trip), **chip live RPM + MW**
  saja (keputusan Round 3: tanpa pengulangan governorMax/headroom di kartu kiri).
- Bus tunggal; **jalur impor** dengan label `Impor … MW` (sembunyi otomatis bila 0 MW);
  feeder **Tahap 1..4** + **Beban vital** masing-masing ber-pemutus berlabel tahap.
- Aliran MW digambar tipis dengan panah (gaya Distance) + panah berhenti di titik
  pemutusan; saat UFLS bekerja: pemutus feeder terbuka **berurutan**, aliran feeder itu
  hilang, chip feeder memudar.
- Semua teks ber-halo `paint-order:stroke`; warna lewat variabel `:root`.

### 4.2 Kartu kiri
- **Unit pembangkit**: kontrol per unit (MVA, output awal, H, R %, kutub, govMax).
- **Beban & tahap UFLS**: MW feeder T1–T4 + vital; tiap tahap: ambang Hz, tunda s,
  fraksi %; catatan ambar PLN di kartu ini.
- **Skenario**: pilih preset sistem (Mandiri / Berimpor 400 MW) → pilih peristiwa
  (Lepas G1/G2/G3 · Tambah beban [angka MW] · Lepas interkoneksi · Blok G3) → ▶.
- **Tentang**: modal (sumber, batasan, label ilustratif).

### 4.3 Kartu kanan — dua halaman (toggle)
- **Tab 1 "Kondisi sistem"** (live): pill kondisi sistem (SEIMBANG/DEFISIT/PELEPASAN
  BEBAN/PEMULIHAN/RUNTUH + warna semantik), frekuensi sekarang (Hz), beban total
  sekarang (MW), pembangkitan sekarang (MW), dukungan governor (MW), headroom tersisa (MW).
- **Tab 2 "Urutan pelepasan"**: daftar berurutan, mis.
  `1. Tahap 1 → Beban T1 (−55 MW) @ t 1,32 s · f 49,48 Hz — beban 1100 → 1045 MW`,
  dst. + baris total terlepas. Tidak ada ringkasan/kotak edukasi dobel (konvensi
  kartu kanan = nilai langsung).

### 4.4 Grafik & indikator
- **Kartu grafik mengisi kolom tengah (M10)**: kartu flex bertumpuk menempati
  seluruh tinggi kolom; setiap SVG diukur (`clientWidth/Height`) lalu digambar
  ulang **1:1 px** ke kotak itu (`viewBox` dinamis; `renderFreq/renderGauge/
  renderVolt` menerima `{w,h}`) — skala vertikal menyesuaikan tinggi kartu sehingga
  tidak ada ruang kosong besar di bawah saat layar tinggi. Formula di §7 item 3–4
  = skala **desain/nominal** (kotak 680×250/74×250/680×190), tetap dipakai tes.
- **Grafik frekuensi**: x = waktu engineering (s, jendela 0–30 s — §7 item 3 / ADR-0006), y = 47–52 Hz;
  kurva `f(t)`; **garis panduan putus-putus** di 49,5/49,0/48,5/48,0 berlabel tahap;
  penanda peristiwa; penanda trip tahap bila perlu. Pita normal 50 ±0,2 Hz diberi
  latar hijau lembut.
- **Indikator frekuensi global** (keputusan Round 4 = batang gradien + penunjuk):
  batang vertikal 47–52 Hz di sisi kanan kartu grafik frekuensi; latar gradien
  **hijau (50 Hz) → kuning/amber → merah (47 Hz)**; penunjuk horizontal + nilai f
  live; goresan halus di tiap ambang tahap. Skema warna ramp disepakati pada prototipe.
- **Grafik tegangan**: sumbu x sama; y = 0,85–1,05 pu (kV nominal di tooltip); label
  permanen kecil **"model ilustratif — bukan hasil aliran daya"**.

### 4.5 Perilaku & bahasa
- Teks UI **Bahasa Indonesia** (istilah teknis proteksi tetap, e.g. governor, droop).
- Tooltip hover elemen plot + panduan ikon "?" (`#qTip`) — tanpa teks panduan permanen.
- Status = warna semantik (hijau/amber→copper/merah) — jangan dipakai dekoratif.
- Angka diformat rapi (Hz 2 desimal, MW 0–1 desimal, t 2 desimal).

## 5. Model — sumber kebenaran

> Rantai perilaku mengikuti spesifikasi U01 LEVEL 3 (§2.2, §5–§10) yang ditulis ulang
> di sini; detail integrasi segmen bentuk-tertutup mengacu U01 §8. Bila dokumen ini dan
> U01 berselisih, dokumen ini menang untuk proyek ini, dan perbedaan wajib dicatat.

### 5.1 Kuantitas, satuan, konvensi tanda
| Kuantitas | Simbol/unit |
|---|---|
| Frekuensi nominal | `f_nom` Hz (default **50**) |
| Frekuensi sesaat | `f(t)` Hz; deviasi `Δf = f − f_nom` (turun ⇒ Δf < 0) |
| Rating MVA unit i | `MVA_i`; output awal `P0_i` MW; govMax `G_i` MW |
| Inersia | `H_i` s; droop `R_i` pu; kutub `p_i` |
| Beban pra-gangguan | `P_load` MW; defisit `D` MW (>0 = pembangkitan kurang) |
| Kekakuan sistem | `β` MW/Hz |
| RPM | `N = 120·f/poles` (presentasi) |

**Shedding**: `MW_lepas_tahap = (fraksi/100) · P_load_praGangguan`; pickup UFLS **ketat**:
bekerja hanya jika `f < ambang` dan `!nearlyEqual(f, ambang)`.

### 5.2 Agregat (himpunan ONLINE)
```
S_base = Σ_online MVA_i                      [MVA]
H_sys  = Σ_online (H_i · MVA_i) / S_base     [s]
P_gen0 = Σ_online P0_i                        [MW]
Reserve = Σ_online (G_i − P0_i)               [MW]
```
Keseimbangan awal v1: `P_gen0 = P_load` (mandiri) atau `P_gen0 + Impor = P_load`.

### 5.3 Peristiwa & defisit awal
- GENERATOR_LOSS: unit keluar himpunan ONLINE; `D₀ += output unit` saat itu.
- LOAD_STEP(+MW): `P_load += MW`; beban tambahan = feeder maya yang bisa dilepas.
- IMPORT_LOSS: `D₀ += Impor`; Impor jadi 0.
- GENERATOR_BLOCK: `G_i` diturunkan ke nilai baru; output unit dijepit ke nilai itu.
Defisit bersih tiap saat:
```
D(t) = P_load(t) − Σ_online P_i(t)          (P_i termasuk respons governor)
D₀    = nilai D segera setelah peristiwa, respons governor = 0
```

### 5.4 Respon governor (droop statis, headroom)
Setiap unit ONLINE menambah output saat frekuensi rendah:
```
resp_i = max(0, −Δf · (P_mb_i / (R_i · f_nom)))        [MW per Hz droop law]
P_i(t) = clamp(P0_i + resp_i, 0, G_i)                  (saturasi headroom)
```
`P_mb_i` = basis unit (pakai MVA_i); respon tak pernah negatif pada underfrequency.
Kekakuan agregat (tak jenuh): `β_pu = Σ_online MVA_i/R_i`; dengan saturasi, β efektif
turun per unit yang mencapai `G_i` — diselesaikan piecewise (lihat 5.6).

### 5.4b AGC sekunder — kendali #2 antara governor & UFLS (ADR-0006, plan-03)
Setelah governor setimbang dan f masih di bawah pita kendali sekunder
(`AGC_BAND = ±0,05 Hz` → target 49,95), AGC menaikkan setpoint unit dalam langkah
**diskret terjadwal**: tiap `agcInterval` s (default **2 s**) sebesar `agcRate` MW/s
total (default **40 MW/s**), dibagi **proporsional headroom** (`govMax − P0`) unit
online; `P0` unit ikut dinaikkan sehingga kurva f berbentuk **tangga** (ciri kendali
sekunder). Besar langkah dijepit ke defisit efektif segmen saat itu (tidak
over-dispatch). AGC berhenti bila: f kembali ke pita ≥ 49,95 · reserve habis ·
terjadi UFLS (dijeda 2 s setelah tiap trip) · run RUNTUH · `agcOn=false`.

### 5.5 ROCOF & integrasi waktu (persamaan ayunan)
```
ROCOF awal: df/dt|₀ = −(f_nom/(2·H_sys)) · (D₀/S_base)          [Hz/s]
2H·(df/dt) = (P_m − P_e)/S_base   →   f(t) per segmen
```
Antara dua "kejadian" (peristiwa / unit jenuh / tahap UFLS trip), defisit efektif dan β
konstan → `f(t)` mengecil/naik **bentuk-tertutup eksponensial** menuju
`f_ss = f_nom − D_eff/β_eff` (bila ada), waktu tunda dihitung eksak per segmen
(detail integrasi U01 §8). Urutan kejadian ditentukan deterministik dari waktu
terselesaikan (bukan langkah waktu tetap). Langkah AGC (5.4b) diperlakukan sebagai
"kejadian" terjadwal pada waktunya sendiri (sama deterministik). Playback memakai
**waktu dinding**: 1× = 1 s engineering per 1 s nyata (0,5×/2× proporsional),
sehingga operasi governor/AGC 0–30 s terlihat seperti waktu nyata (ADR-0006).

### 5.6 Keadaan mantap & RUNTUH
- Bila dengan semua unit jenuh (ΣG_i < beban efektif) tetap ada defisit, dan/atau
  solver piecewise tak menemukan titik kesetimbangan → **RUNTUH (COLLAPSE)**;
  `f` terus turun (klip presentasi), status `RUNTUH`, V menuju lantai (5.8).
- Bila kesetimbangan tercapai di atas ambang tahap terendah yang belum trip → **PULIH**
  ke `f_ss` baru (bisa < 50 Hz selama defisit residual ditahan governor/shedding).
  Bila reserve AGC masih cukup, AGC sekunder (5.4b) membawa f **kembali ke pita
  49,95–50 Hz** (status PEMULIHAN 50,00) — beda utama vs perilaku pra-ADR-0006.

### 5.7 UFLS berjenjang
- Tiap tahap s: `ambang_s`, `tunda_s` (disengaja), `fraksi_s`.
- **Arming**: `f < ambang_s && !nearlyEqual` (persis di ambang = belum).
- **Timer**: berjalan selama f di bawah ambang; **reset ke 0** bila f naik melewati
  ambang sebelum tunda habis.
- **Trip** saat timer ≥ tunda: feeder tahap s terbuka, `MW_lepas = MW feeder nyata`
  (default = fraksi × beban pra-gangguan), tahap **terkunci (latched)** untuk run ini;
  `D_eff` berkurang → segmen baru.
- Dasar perhitungan fraksi = **beban pra-gangguan** (dihitung sekali di awal run),
  bukan beban post-fault.
- Pemutusan dilakukan berurutan oleh waktu trip (bukan urutan tabel).

### 5.8 Model tegangan (ilustratif, ADR-0004)
`V` mulai 1,00 pu; peristiwa penambah defisit menimbulkan lekukan:
```
V_min = max(0,85 , 1 − k_V · D₀/S_base)        k_V = 0,5 (dikunci PRD v1)
```
V turun eksponensial (τ≈0,2 s) ke V_min, lalu **pulih eksponensial τ≈3 s** ke 1,00
setelah sistem arrested (defisit terselesaikan/shedding bekerja); pada run RUNTUH,
V terus turun menuju lantai 0,85. Label wajib: *ilustratif — bukan hasil aliran daya*.

### 5.9 Kondisi sistem (status & warna)
| Status | Kondisi | Warna |
|---|---|---|
| SEIMBANG | \|Δf\| ≤ 0,2 Hz (pita normal) | hijau |
| DEFISIT | f turun di bawah 49,8, governor bekerja, belum ada trip | amber/copper |
| PELEPASAN BEBAN | ≥ 1 tahap UFLS telah trip | copper→merah |
| PEMULIHAN | f naik kembali menuju pita normal setelah lembah | hijau (transisi) |
| RUNTUH | solver gagal / f tak berhenti turun | merah |

### 5.10 Preset & studi v1
1. **Sistem mandiri** (Impor 0): beban 1100 MW, setimbang.
2. **Dengan interkoneksi**: Impor 400 MW, beban 1500 MW, setimbang.
Skenario peristiwa (diterapkan t = 1,0 s): Lepas G1 · Lepas G2 · Lepas G3 · Tambah
beban (+angka) · Lepas interkoneksi (preset 2) · Blok G3. Semua preset membawa catatan
`plnVerificationRequired: true` + catatan ambar.

## 6. Validasi & tooling (rencana)

Mengikuti pola proyek referensi: harness stub-DOM `tools/lens-harness.js` + registry
`const API` di akhir script + tes Node murni:
- `tools/model.test.js` — literal rantai §5 (ROCOF, droop, saturasi, UFLS pickup
  ketat/timer/reset/latch, shed MW, COLLAPSE, V ilustratif, status).
- `tools/timeline.test.js` — determinisme, urutan trip, parity statis↔dinamis (< 1e-6),
  batas f ≥ 47, RUNTUH.
- `tools/sld.test.js` — geometri SLD (simbol lingkaran+salib, bus solid, vital teal,
  pemutus miring + TERBUKA, TANPA stroke-dasharray).
- `tools/charts.test.js` — literal skala grafik (fToY/tToX), ambang, gauge, tegangan.
- `tools/ui.test.js` — seam desain & perilaku UI (mirror Differential) + kartu kanan.
- `tools/shoot.js` — screenshot headless Chrome (CDP, tanpa dependensi) + zoom ASCII.

Tidak ada auth/Clerk di v1 (keputusan Round 1). Bahasa UI/dokumen = Indonesia.

## 7. Keputusan prototipe → DITUTUP (dikunci saat implementasi M1–M3)

1. **Indikator batang gradien (dipilih user: "batang gradien + penunjuk")**:
   kartu grafik frekuensi memuat kolom gauge 74×250 px; batang 18×214 px dengan
   `linearGradient` stops (revisi M5/plan-02 §4.4b — hijau HANYA di pita normal):
   `0% #B5651D` (52 Hz over-frekuensi), `36% #B5651D`, `38% #2E7D46` (hijau mulai),
   `44% #2E7D46` (49,8 Hz), `62% #B5651D`, `100% #C0392B` (47 Hz merah); penunjuk
   garis kiri pada y(f), tick 47–52, nilai f di bawah gauge.
2. **Konstanta tegangan ilustratif DIKUNCI**: `k_V = 0,5`, τ turun ≈0,2 s,
   τ pulih ≈3 s, lantai 0,85 pu — sesuai §5.8 (diverifikasi via timeline tests
   + screenshots; dip aksen di SLD & kurva).
3. **Jendela x grafik DIKUNCI 0–30 s** (ADR-0006/plan-03 P1, dulu 0–12 s): skala
   `x(t) = 38 + t/30·628`, label 0/5/…/30 s; sampel run di luar 30 s ter-klip;
   scrubber mengikuti `tMax` run (= 30 s di UI).
4. Skala frekuensi DIKUNCI 47–52 Hz (`y(f) = 12 + (52−f)/5·214`), grid 0,5 Hz,
   pita normal ±0,2 Hz, ambang UFLS putus-putus copper berlabel T1–T4, penanda
   peristiwa (t = 1,0 s) & trip (lingkaran merah) sampai playhead. Nilai = skala
   **desain** kotak 680×250; renderer (M10) menskalakan vertikal ke tinggi kartu
   nyata (margin tetap: atas 12 / bawah 24 Hz, 26 V), lihat §4.4. Sumber angka
   di KODE = modul `plotSpace` (§12c, diuji `tools/plot.test.js`) — jangan
   mengubah literal di sini tanpa amendemen PRD + plotSpace serentak.
