# Rencana Implementasi — Simulator Underfrequency Relay (81U)

> **Status:** SELESAI — seluruh milestone M0–M4 dikerjakan, diuji, dan di-push
> ke `origin/main` (lihat riwayat commit; PRD §7 ditutup). Dokumen ini tetap
> sebagai kontrak implementasi & catatan proses.
> **Sumber masukan:** `docs/PRD.md` (§5 = sumber kebenaran model), `docs/adr/0001–0005`,
> `CONTEXT.md`, `docs/research/pln-underfrequency-practice.md`, `prototype.html`
> (disetujui dengan revisi, lihat §2), `tools/shoot-proto.js` (harness screenshot).
> **Sasaran:** satu file `underfrequency_relay_simulator.html` vanilla (tanpa build,
> Bahasa Indonesia) + suite tes Node + repo `endetta/underfrequency-relay-simulator`.

---

## 1. Ringkasan

Mengubah PRD + prototipe menjadi produk: simulator edukasi underfrequency/UFLS
satu-area koheren dengan SLD interaktif, grafik frekuensi + indikator batang gradien,
grafik tegangan (ilustratif), kartu status dua halaman, transport kompak, skenario
preset, dan model numerik deterministik (rantai U01). Semua keputusan teknis di bawah
menjadi kontrak implementasi; bila ada konflik dengan dokumen lain, PRD §5 menang,
dan perbedaan dicatat.

## 2. Revisi prototipe yang DITERIMA (dari review user)

1. **SLD topology diperbaiki**: simbol generator = lingkaran + salib (×) standar +
   label (G1/G2/G3), bukan simbol lama; **semua garis solid** — tidak ada garis
   putus-putus misterius; **beban vital tersambung jelas ke bus bar** (warna teal
   `#13697A` + latar `--teal-soft`); pemutus = kotak lurus (tertutup) vs kotak miring
   45° (terbuka) + label `TERBUKA`; status interkoneksi lewat label
   (`400 MW` / `0 MW · LEPAS`) + pemutus, bukan lewat gaya garis.
2. **Warna legend dibedakan**: ONLINE (hijau) · TRIP/terbuka (merah) · batas governor
   (copper) · beban vital (**teal**) · pemutus terbuka (kotak miring). Bukan dua item
   copper yang mirip.
3. **Transport kompak**: satu baris ramping (tinggi ≤ 40 px) — ▶ · kecepatan
   0,5×/1×/2× · scrubber · t · Reset; tanpa sisa ruang besar.
4. Sisanya (layout varian A, kartu kanan 2 tab, indikator gradien, kartu kiri,
   catatan ambar PLN, skenario @ t=1,0 s) **disetujui tanpa perubahan**.

Keputusan varian: **varian A (tumpuk, sesuai PRD §4) menjadi satu-satunya layout
produk v1**; varian B (sisi-ke-sisi) opsional menyusul karena hanya beda CSS grid-area.

## 3. Bentuk & struktur produk

Satu file `underfrequency_relay_simulator.html` — markup + CSS + satu blok `<script>`,
disusun mengikuti pola Differential/Distance (urutan wajib):

1. **Helper**: `fmt`, `clamp`, `niceCeil/niceStep` (grid 1-2-5), `nearlyEqual`.
2. **State global `S`** — `S.param` (`P`): `gens[]` (per unit: `mva, p0, h, rPu,
   poles, govMax, online`), `loadMw`, `importMw`, `stages[]` (`{id,thrHz,delaySec,
   shedPct,enabled}`), `presetId`, `scenarioId`; `S.ui`: `collapsed` (kartu),
   `sideTab`, `playing`, `speed`, `tNow`; hasil run di `S.run` (time-series + log).
   Semua kontrol menulis ke `S`; tidak ada state lain.
3. **Model murni** (lihat §4) — tanpa DOM/SVG; bisa diuji dengan objek sintetis.
4. **Binding kontrol** → `render()` / loop main.
5. **Renderer murni per bagian** — `renderSld`, `renderFreq` (+ `renderGauge`),
   `renderVolt`, `renderSide`, `renderParams`, `renderTransport`.
6. **`render()` master** — fase-1 hitung `S.run` bila input berubah, fase-2 gambar;
   saat main: update ringan (kurva/chip/readout) tanpa render ulang penuh.
7. **Splash IIFE** + `fitPlane()` (ResizeObserver) — seam referensi.
8. **Registry `const API`** di akhir script (ekspor utk tes; harness hanya menambah
   `;global.__pub=API;`).

Repositori juga berisi: `tools/lens-harness.js` (port dari Differential/Distance),
`tools/*.test.js` (§6), `tools/shoot.js` (port `shoot-proto.js` + mode `--check`),
`CLAUDE.md`, `docs/overview.md`, `README.md`, `docs/PRD.md`, `CONTEXT.md`,
`docs/adr/`, `docs/research/`.

Prototipe interaktif `prototype.html` (model tiruan, untuk review layout) TIDAK
masuk `main` — diarsip di branch `prototype-v1` (aturan skill prototype; revisi
hasil review sudah masuk §2).

## 4. Modul model murni (kandidat nama & kontrak)

| Modul | Isi & fungsi kunci |
|---|---|
| `ufParam` | Invariant & normalisasi parameter (gens 1–4, H 0,5–15, R 2–10%, kutub genap 2–8, govMax ≥ p0; tahap 1–8, ambang turun ketat & interval ≥0,1, tunda ≥0,1, porsi 0–100%; load ≥ 0; impor ≥ 0; feeder v1: diturunkan dari beban dasar × fraksi tahap + beban vital). |
| `ufAggregates(m)` | `S_base`, `H_sys`, `P_gen0`, `reserve`, `betaPu` (Σ MVA/R) — murni. |
| `ufGovernor(m, f)` | `resp_i` per unit = `max(0, −Δf·(MVA_i/(R_i·f_nom)))` dijepit headroom; `supply_i = clamp(p0_i + resp_i, 0, govMax_i)`; agregat `sup`, `gov`, `head`. |
| `ufUfls(m, f, t, state)` | Arm ketat `f < thr && !nearlyEqual`; timer naik saat di bawah, reset bila naik; trip saat timer ≥ delay → shed **MW nyata feeder** (default fraksi × beban pra-gangguan), **latch**; event log. |
| `ufDynamics(m, event)` | Simulasi event-driven: ROCOF awal `−(f_nom/(2·H_sys))·(D0/S_base)`; integrasi segmen bentuk-tertutup per "interval konstan" (detail U01 §8); peristiwa = unit jenuh, tahap trip, dsb.; **deterministik**; klip f ≥ 47,0; status `COLLAPSE` bila tak ada kesetimbangan. |
| `ufVoltage(m, run)` | Model ilustratif: lekukan `min(0,15, 0,5·D0/S)` saat peristiwa, turun τ≈0,2 s, pulih τ≈3 s setelah arrested, lantai 0,85 saat RUNTUH; label wajib. |
| `ufStatus(m, f, shedInfo)` | 5 status + warna semantik (SEIMBANG/DEFISIT/PELEPASAN BEBAN/PEMULIHAN/RUNTUH). |
| `ufTimeline(m)` | Menjalankan rantai penuh → `{ts[], fs[], vs[], out[], ev[]}` + `tripSeq` (urutan pelepasan + beban akhir). Satu-satunya penulis data run. |
| `ufPresets` | 2 preset (Mandiri / Berimpor 400 MW) + 6 skenario peristiwa (Seimbang, Lepas G1/G3, Lepas interkoneksi, +Beban 200, +Beban besar→runtuh); semua `plnVerificationRequired:true`. |
| `SL`-style modul tahap? | Tidak perlu — `ufParam` cukup (tidak ada slope dinamis di sini). |

Konvensi keputusan (wajib): `M <= 1` no-pickup analog → **UFLS strict**
`f < thr && !nearlyEqual`; shed `MW` nyata feeder; timer reset bila f naik sebelum
tunda habis; tahap yang trip **terkunci**; dasar fraksi = beban **pra-gangguan**.

## 5. UI — spesifikasi implementasi (dari prototipe + revisi)

- **Layout (varian A)**: grid `296px minmax(0,1fr) 336px`, area
  `params sld side / params tr side / params fch side / params vch side`;
  desktop lock ≥921×600 (hanya kolom yang scroll internal); ≤1240px = stack satu kolom.
- **SLD** (spesifikasi revisi §2): bus tebal y=70; interkoneksi kiri-atas (kotak
  label + pemutus); 3 generator simbol lingkaran+salib di bawah bus, chip RPM+MW
  (hijau online / copper maks-gov / abu trip); feeder T1–T4 hijau + beban vital teal
  tersambung solid; pemutus kotak (lurus/miring); legenda 5 item warna dibedakan.
- **Transport kompak**: satu baris ramping; ▶/❚❚, spd 0,5×/1×/2×, scrubber 0–12 s,
  `t` live, Reset.
- **Grafik frekuensi**: y 47–52 Hz (grid 0,5 Hz + pita normal ±0,2 hijau lembut +
  garis 50 dipertegas), garis ambang putus-putus copper berlabel T1–T4, penanda
  peristiwa & trip, x 0–12 s; **indikator batang gradien** hijau→merah 47–52 + penunjuk
  + nilai (stops ramp final di M3).
- **Grafik tegangan**: pu 0,85–1,05, label permanen "ilustratif — bukan hasil aliran
  daya", kV di foot.
- **Kartu kanan 2 tab**: `Kondisi sistem` (pill status, f, ROCOF, beban, pembangkitan,
  dukungan governor, headroom, defisit) & `Urutan pelepasan` (minus MW, t, f saat trip,
  beban akhir tiap tahap, total lepas). Kartu kiri: unit pembangkit, beban & tahap UFLS
  (+ catatan ambar PLN), skenario, tentang.
- **Interaksi**: play/pause (requestAnimationFrame, 1 s eng = 0,25 s dinding @1×),
  speed, scrub (jeda), reset, slider impor (reset run), chip skenario (reset), tab,
  collapse `.card-b-i`, tooltip ikon "?" (`#qTip`), halo SVG, scrollbar tipis.
- Bahasa UI = **Indonesia**; status = warna semantik.

## 6. Tes & validasi (gerbang per milestone)

| File | Fokus (assertion tematik) |
|---|---|
| `tools/model.test.js` | Literal §5: agregat, ROCOF contoh (D0=400 → ≈ −1,47 Hz/s), droop resp & headroom, saturasi, UFLS pickup ketat (f == thr tidak arm), timer reset, latch, shed = MW feeder nyata, dasar beban pra-gangguan, COLLAPSE, V ilustratif (lekukan/τ/lantai), status transisi. |
| `tools/timeline.test.js` | Determinisme (2× run = idem), urutan trip oleh waktu, event log konsisten, batas f ≥ 47. |
| `tools/sld.test.js` | Geometri SLD: simbol salib hadir (`line` diagonal ganda per gen), garis bus solid, vital teal terhubung ke bus, pemutus miring saat terbuka + label TERBUKA, legenda warna berbeda (5 item), TANPA `stroke-dasharray` pada jalur feeder/impor. |
| `tools/ui.test.js` | Seam desain (splash, tt-a/tt-b, collapse, halo, tooltip "?", scrollbar) + perilaku: transport kompak (tinggi ≤ 44 px), tab kanan, chip skenario, slider impor, status pill, indikator gauge (gradien stops + penunjuk posisi f), kartu kanan tanpa duplikat (`.r-sum`/KaTeX absen). |
| `tools/shoot.js` | Screenshot view (init/mid/runtuh/collapsed/mobile) + `--check` (collapse anti-blink; port pola Differential). |

Gerbang tiap milestone: **semua test file yang relevan hijau** + `shoot.js` report
bersih (no overflow > 2 px, no exception konsol, fonts OK). Tidak ada build; jalankan
dengan membuka HTML langsung.

## 7. Milestone (urutan implementasi & kriteria selesai)

- **M0 — Kerangka & model inti**: skeleton HTML (header, kartu, splash kosong),
  `ufParam`, `ufAggregates`, `ufGovernor`, `ufUfls`, `ufDynamics`, `ufTimeline`,
  `ufPresets`, harness `lens-harness.js`, `model.test.js` + `timeline.test.js`.
  *Selesai:* kedua test hijau.
- **M1 — SLD + transport**: `renderSld` (spesifikasi §5), `renderTransport` kompak,
  `sld.test.js`, `ui.test.js` (bagian transport/SLD). *Selesai:* test hijau + shoot
  view SLD bersih.
- **M2 — Grafik**: `renderFreq` + `renderGauge` + `renderVolt` (+ `ufVoltage`),
  uji literal posisi penanda/gauge. *Selesai:* test hijau + shoot view grafik.
- **M3 — Kartu kanan & interaksi penuh**: 2 tab, readout live, skenario chips,
  slider impor, play/speed/scrub/reset, `qTip`, collapse, status pill.
  *Selesai:* `ui.test.js` penuh + `shoot.js --check` hijau.
- **M4 — Polish & rilis**: splash + header bergantian (24 s ±3), reduced-motion,
  scrollbar tipis, `CLAUDE.md`, `docs/overview.md`, `README.md`, PRD §7 ditutup
  (ramp warna & konstanta tegangan dikunci), validasi penuh.
  *Selesai:* seluruh suite hijau + smoke browser + `shoot.js` semua view.

## 8. Konvensi & gotcha (jangan diregresi — dari proyek referensi)

- Satu perubahan = satu commit; pesan Bahasa Indonesia, conventional; **commit &
  push `origin/main` tiap milestone di sesi yang sama** (repo sudah ada:
  `endetta/underfrequency-relay-simulator`, identitas git repo-lokal `endetta`).
- Jangan simpan status titik/run yang bisa basi — hitung ulang dari parameter;
  `S.run` dibuang & dihitung ulang setiap input berubah (deterministik).
- Ekspor tes lewat `const API` (harness tidak menduplikasi daftar nama).
- SVG: label ber-halo (`paint-order:stroke` + `stroke:var(--surface)`); dekorasi
  `pointer-events:none`; warna lewat variabel `:root`.
- Status warna semantik (hijau/copper/merah/teal) jangan dipakai dekoratif.
- File tes meng-hard-code nama HTML — jangan rename tanpa update.
- `tools/shots/` & `tools/.tmp-chrome/` gitignored.
- Modul LEVEL 3 (React underfrequency U01) **tidak disentuh** (ADR-0001).

## 9. Risiko & keputusan terbuka

- **Angka PLN** tetap "praktik tipikal" berlabel ambar sampai pedoman resmi disuplai
  (PRD §2; riset di `docs/research/`).
- **Konstanta tegangan ilustratif** (k_V=0,5; τ 0,2/3 s) dikunci di M4 setelah
  prototipe disetujui; bisa digeser tanpa mengubah model keputusan.
- **Ukuran run & perf**: 12 s × 5 ms = 2.400 titik/run; render per frame OK; jika
  lambat, kurangi sampling kurva saat main (sudah dilakukan di prototipe).
- **Feeder ↔ fraksi**: default feeder = beban dasar × fraksi; user mengubah MW feeder
  → shed aktual = MW feeder (tabel tetap target). Invariant di `ufParam`.
- **Varian B** tidak masuk v1 (keputusan §2); CSS grid-area sudah siap bila diminta.

## 10. Kriteria rilis v1 (definition of done)

1. Semua tes (`model`, `timeline`, `sld`, `ui`) hijau di Node ≥ 22.
2. `tools/shoot.js` semua view: PNG + report bersih (tanpa overflow/exception/font fail).
3. Smoke browser manual: preset & 6 skenario; play/speed/scrub/reset; tab kanan;
   collapse; reset semua kartu → tidak ada blink; bahasa Indonesia konsisten.
4. PRD §5, `CLAUDE.md`, `docs/overview.md`, `README.md` sinkron dengan implementasi;
   konten ambar PLN & label ilustratif tegangan tampil.
5. Semua milestone ter-commit & ter-push ke `origin/main`.

## 11. Catatan proses

- Mulai dengan **M0** setelah rencana ini disetujui. Tiap milestone berakhir dengan
  commit + push + laporan singkat (file, tes, screenshot).
- User boleh menyela antar-milestone (contoh: revisi SLD sudah diterima & masuk M1).