# CLAUDE.md — Simulator Underfrequency Relay (81U)

Panduan untuk agen coding (Claude Code / Codebuff / Freebuff CLI) saat bekerja di
**repo ini** — satu file HTML vanilla, tanpa build, Bahasa Indonesia.

## Ringkasan

Simulator edukasi **relay underfrequency (ANSI 81U)** + **pelepasan beban bertahap
(UFLS)** untuk sistem satu-area koheren. Satu file `underfrequency_relay_simulator.html`
(markup + CSS + satu `<script>`), tanpa framework/build — jalankan dengan membuka HTML
langsung di browser atau `python -m http.server`.

- Repo: `endetta/underfrequency-relay-simulator`, branch `main`.
- Sumber kebenaran model: **`docs/PRD.md` §5** (rantai persamaan) + spesifikasi U01
  (module React LEVEL 3, `docs/engineering-specs/underfrequency-relay.md` — hanya
  dibaca sebagai referensi persamaan, TIDAK disentuh).
- Keputusan desain: `docs/adr/0001–0005`, glosarium `CONTEXT.md`, riset PLN
  `docs/research/pln-underfrequency-practice.md` (angka UFLS = praktik tipikal,
  berlabel ambar — belum diverifikasi ke pedoman resmi PLN).
- Rencana implementasi (kontrak milestone): `docs/implementation-plan.md` — M0–M4
  sudah selesai & ter-push; §7 PRD ditutup (ramp gauge, konstanta tegangan, jendela x).

## Pintu masuk

| File | Peran |
|---|---|
| `underfrequency_relay_simulator.html` | Produk satu-file (script: §1–11 mesin murni, §12+ state/UI/renderer) |
| `docs/PRD.md` | Sumber kebenaran MODEL (persamaan §5) + keputusan prototipe §7 |
| `docs/implementation-plan.md` | Kontrak implementasi + spesifikasi UI §5 |
| `tools/lens-harness.js` | Stub DOM untuk menjalankan `<script>` di Node |
| `tools/*.test.js` | 5 suite tes Node (lihat bawah) |
| `tools/shoot.js` | Screenshot headless Chrome (CDP, tanpa dependensi) |
| `prototype.html` | Arsip prototipe layout — di branch `prototype-v1`, TIDAK di main |

## Seam & konvensi desain (warisan Differential/Distance)

- **Jangan regresi**: splash krem (#FDFAF3→#F8EFE1) dengan huruf S H E V A; judul
  bergantian `.tt-a` ↔ `.tt-b` (kilau `ttShine`, copper lembut #8A6B4D); kartu
  collapse `.card-b-i` (grid 1fr→0fr, BUKAN `display:none`); centering semua-ciut
  via `padding-top` inline (`syncCollapsedCentering` + `collapsedStackH`) — jangan
  `justify-content:center` (tidak animatable → blink); scrollbar tipis global;
  tooltip `#qTip` untuk ikon `?` (`span.q[data-tip]`, delegasi `pointerover/out`,
  JANGAN pakai attr `hidden` — CSS `display` menimpanya).
- Status warna semantik: hijau = normal/online/pemulihan, copper/amber = defisit/
  ambang/maks gov, merah = trip/runtuh/terbuka, teal = beban vital. Jangan dipakai
  dekoratif.
- Renderer murni → string SVG/HTML: `renderSld(p, t, run)`, `renderFreq/Gauge/Volt`,
  `renderSide(p, run, t, tab)`, `renderTransport()`. `render()` master memanggil
  `render*Into()`; saat main (`tick`) hanya refresh ringan. Ekspor tes lewat
  **`const API`** di akhir script (harness menambah `;global.__pub=API;`).
- Bahasa UI/dokumen/pesan commit = **Indonesia**; istilah proteksi tak diterjemahkan.
  Pesan commit conventional (feat:/fix:/docs:).

## Model (ringkas — PRD §5 & U01 §7–8)

- Agregat online: `S_base`, `H_sys`, `P_gen0`, `β = Σ MVA/R`, `reserve`.
- Droop: `resp_i = max(0, −Δf/50 · MVA_i/R_i)` dijepit headroom; saturasi saat
  `Δf ≤ Δf_i,sat = −50·headroom·R/MVA`.
- ROCOF awal: `−(50/(2·H_sys))·(D₀/S_base)`.
- Solver piecewise (`solveSteadyState`): saturasi berurutan → `SETTLED`/`COLLAPSE`
  (β→0 & defisit tak ter-cover). D=290 SETTLED / D=291 COLLAPSE (default).
- Timeline (`ufTimeline`): integrasi segmen bentuk-tertutup
  `Δf(t+Δt) = Δf_ss + (Δf−Δf_ss)·e^(−K·Δt)`, event-driven (unit jenuh, trip UFLS,
  lantai 47 Hz), **deterministik**, parity statis↔timeline < 1e-6 (U01 §13.1).
- UFLS strict: arm `f < ambang && !nearlyEqual`; timer reset bila f naik; trip saat
  timer ≥ tunda → **MW nyata feeder** (fraksi × beban pra-gangguan), **latch**.
- Tegangan: ilustratif (ADR-0004) — lekukan `min(0,15, 0,5·D₀/S)`, τ 0,2/3 s,
  lantai 0,85; label "ilustratif — bukan hasil aliran daya" WAJIB.
- RPM unit: `n = 120·f/kutub` (2 kutub @50 Hz = 3000).

## Tes & validasi

```bash
node tools/model.test.js     # literal model (U01 §12 + hitung tangan)
node tools/timeline.test.js  # determinisme, urutan trip, parity, RUNTUH
node tools/sld.test.js       # geometri SLD (salib, solid, vital teal, pemutus)
node tools/charts.test.js    # skala grafik/gauge/tegangan (literal)
node tools/ui.test.js        # seam desain + transport kompak + kartu kanan
node tools/shoot.js          # screenshot semua view → tools/shots/ + report.txt
```

Gerbang perubahan non-sepele: semua suite hijau + `shoot.js` bersih (tanpa overflow
> 2 px, tanpa exception, font OK) + smoke browser manual (preset & 6 skenario,
play/speed/scrub/reset, tab kanan, collapse). Tidak ada build.

## Gotcha (jangan diregresi)

- **Jangan sentuh modul React LEVEL 3** (`LEVEL 3 - PROTECTION SYSTEM SIMULATOR`,
  Differential R10 FROZEN; modul underfrequency U01 di sana = referensi persamaan,
  bukan sumber sinkronisasi) — ADR-0001.
- Nama file & id di-hard-code oleh tes (`fs.readFileSync`, `#sld`, `#fSvg`, `#gauge`,
  `#vSvg`, `#sidePh`, `#scenGroup`, `#sldTag`, `.card[data-card]`). Rename = update
  semua tes + shoot.js.
- Jangan menyimpan status titik/run yang basi — hitung ulang dari parameter
  (`computeRun()` deterministik); `S.run` dibuang tiap input berubah.
- Chip skenario pakai **delegasi** di `#scenGroup` (tombol di-render ulang → listener
  di tombol hilang).
- `pct` tahap UFLS = **fraksi** (0,05), bukan persen (5) — konversi `× beban dasar`.
- `tools/shots/` & `tools/.tmp-*/` gitignored (artefak).
- Prototipe `prototype.html` hidup di branch `prototype-v1` (aturan skill prototype).
- Konstanta skala grafik dikunci (PRD §7): `y(f)=12+(52−f)/5·214`, `x(t)=38+t/12·628`,
  gauge stops 0/40/55/100% (#2E7D46/#2E7D46/#B5651D/#C0392B) — tes memakai literal.
- Windows + Git Bash: perintah POSIX (`ls`, `mv`, `rm`); warning LF→CRLF benign.