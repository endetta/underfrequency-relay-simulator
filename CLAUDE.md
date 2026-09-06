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
- Keputusan desain: `docs/adr/0001–0006`, glosarium `CONTEXT.md`, riset PLN
  `docs/research/pln-underfrequency-practice.md` (angka UFLS = praktik tipikal,
  berlabel ambar — belum diverifikasi ke pedoman resmi PLN).
- Rencana implementasi (kontrak milestone): `docs/implementation-plan.md` — M0–M4
  sudah selesai & ter-push; §7 PRD ditutup (ramp gauge, konstanta tegangan, jendela x).
- **M5 (2026-09-05, plan-02)**: rombak layout desktop — satu layar terkunci
  (seam Differential/Distance), splash AUTO, switch tengah `SLD|Grafik`, SLD
  komposisi 700×520 + font SVG ≥ 10, gauge hijau HANYA di pita 50,2–49,8, params
  kart-dalam-kart. Eksekusi & plan di `design-plans/plan-02-…`; log sesi di
  `design-plans/sesi-2026-09-05-01-…`.
- **M6 (2026-09-05, plan-03 + ADR-0006)**: hierarki kendali f tiga lapis
  **governor → AGC sekunder → UFLS** (AGC: +40 MW/s tiap 2 s, target pita 49,95,
  proporsional headroom, langkah tangga; `agcOn` toggle OFF = perilaku lama); player
  **real-time waktu-dinding** (1× = 1 s sim/s dinding) + throttle render berat ~10 fps
  + auto-play saat klik skenario + skenario `imp` paksa preset berimpor; jendela
  grafik **0–30 s** (`x=38+t/30·628`); chip SLD label AGC + baris `Dukungan AGC` +
  indikator fase di kartu kanan. Plan: `design-plans/plan-03-…`.
- **M7 (2026-09-05, temuan code-review)**: skenario lengkap PRD §4.2/§5.10 — **Lepas
  G2**, **Blok G3 (maks 100 MW)**, **beban tambahan [MW]** (slider `#loadStepSlider`,
  dipakai chip '+ Beban'); perbaikan **GENERATOR_BLOCK** (output unit dijepit ke
  govMax → defisit nyata, PRD §5.3); interpretasi skenario disatukan ke satu sumber
  (`scenarioDelta`/`applyScenario`/`effGens` — 4 situs duplikat dihapus) + `collapseAt`
  (2 loop duplikat); warna renderer lewat **`var(--*)`** (var baru `--grid`/`--off`);
  dokumen basi disinkronkan (PRD §4.4, overview, implementation-plan §5).
- **M8 (2026-09-05, bug play + rombak SLD)**: **BUG play** — run pendek (Seimbang
  t≈0,05 s; berperistiwa ~14 s; RUNTUH) membuat ▶ langsung berhenti; `ufTimeline`
  kini **disampling sampai ujung jendela TMAX** (f diam di fss / terpaku 47 saat
  RUNTUH; `dt` dijepit ke ujung jendela). SLD dirombak: **generator DI ATAS bus,
  beban DI BAWAH**; label feeder **dua baris** (id baris 1, MW baris 2 — tanpa
  overlap); pemutus  (CB) **12×12** (sebelumnya 8×8); spasi **transport ↔ kartu SLD**
  (`margin-top:10px`). Log: `design-plans/sesi-2026-09-05-04-…`.
- **M9 (2026-09-05, audit overlap SLD)**: temuan scan bounding-box Chrome (5 skenario)
  — 5 kotak feeder 110 lebar @ pitch 105 **saling tumpuk 5 px** (sudut rx terpotong,
  border bersilang); diperbaiki → kotak **96 lebar** (celah 9 px; strip 72–588 sejajar
  bus 70–590). Tes M9 baru di sld.test (24 asersi). Log:
  `design-plans/sesi-2026-09-05-05-…`.
- **M13 (2026-09-05, ciut-semua mepet ke atas)**: kartu param yang diciutkan semua
  tadinya **dipusatkan vertikal** via `padding-top` inline (`syncCollapsedCentering`
  + `collapsedStackH`, seam anti-blink) → tumpukan mengambang di tengah kolom yang
  tinggi; kini **mepet ke atas** (flex-start) — mesin centering + kelas `all-collapsed`
  + CSS transition `padding-top` dihapus; ui.test 34 asersi tetap (2 seam ditulis
  ulang). Log: `design-plans/sesi-2026-09-05-14-…`.
- **M10 (2026-09-05, grafik mengisi kolom)**: kartu grafik flex bertumpuk mengisi
  **penuh tinggi kolom tengah** (sebelumnya void ±190–230 px @layar tinggi). Renderer
  grafik kini menerima **dims `{w,h}`** (ukur `clientWidth/Height` → `viewBox`
  dinamis → gambar **1:1 px**): `fToY(f,H)=12+(52−f)/5·(H−36)`, `tToX(t,W)=38+
  t/30·(W−52)`, gauge & volt ikut (gauge `viewBox 74×H`; volt margin bawah 26).
  `fToY/tToX` tanpa dims = kotak desain lama → literal suite charts M2 **tetap**;
  guard default kotak desain saat tersembunyi/stub (kini `plotSpace.sizeSvg`, K3);
  re-render saat resize (`rg` observe `#viewGraf`) & saat switch ke Grafik. Tes M10:
  charts 19 · ui 34 (total 131). Log: `design-plans/sesi-2026-09-05-06-…`.
- **M11 F1 (2026-09-05, eksekusi plan-04)**: garis feeder kini **menyentuh tepi
  atas kotak** (`y2="400"`, sebelumnya 392 → garis menggantung 8 px); 2 asersi
  M8 di sld.test diperbarui via TDD (merah→hijau); probe CDP gap=0 di semua
  5 feeder. Log: `design-plans/sesi-2026-09-05-10-…`.
- **Refactor arsitektur (2026-09-05, hasil review arsitektur)**: modul dalam
  **`snapshot(p, run, t)`** (§12b) = SATU-SATUNYA interpretasi keadaan sesaat untuk
  presentasi: f, status, fase kendali (governor→AGC→UFLS), trips/shedTotal, loadNow,
  impNow/impLost, deficit, agcDisp, rocof0, gov, `gen[]` (state online/maks gov
  via `satDevOf`/TRIP + `mwFinal` + `agcMw`). `renderSld`, `renderSide`, tag
  `#sldTag` kini hanya memformat — **jangan menghitung ulang turunan ini di
  renderer** (duplikasi = pola bug M7; renderer lama menulis ulang kondisi saturasi
  ad hoc). Nol perubahan perilaku (suite lama tetap literal); suite baru
  `tools/snapshot.test.js` (8 asersi numerik). Total 139 asersi. Log:
  `design-plans/sesi-2026-09-05-07-…`.
- **Refactor arsitektur #2 (2026-09-05, K2)**: fasilitas run **`sim`** (§12a) —
  satu pintu (param → run) dengan cache + **anti-stale via fingerprint**
  `JSON.stringify(paramP())` (recompute + clamp `tNow > tMax` HANYA saat param
  berubah); `computeRun()` jadi delegasi kompat; handler UI memakai
  `sim.restart()`/`render()` (render memanggil `sim.run()` di depan) — kelas bug
  M7/M8 (run basi, playhead lewat ujung) mati permanen. Jangan panggil
  `ufTimeline`/`paramP` langsung di handler UI — lewat `sim`. Suite baru
  `tools/sim.test.js` (6 asersi). Total 145 asersi. Log:
  `design-plans/sesi-2026-09-05-08-…`.
- **Refactor arsitektur #3 (2026-09-05, K3)**: modul **`plotSpace`** (§12c) =
  satu sumber skala & margin untuk SLD + grafik: tabel `M` (12/38/14/24/26),
  tabel `box` (freq 680×250, gauge 74×250, volt 680×190, sld 700×520), pemetaan
  `fToY/tToX/voltY` konsisten dengan M, `sizeSvg(el,dw,dh)` (ukur → dims, guard
  default). `fToY/tToX/plotDims/voltY` jadi delegasi; renderer baca
  `plotSpace.box.*`; `fitSld` baca `plotSpace.box.sld` + `sizeSvg` — perilaku
  identik (sldScale ≥ 1,0 tetap teruji shoot). **Jangan tulis ulang angka
  margin/kotak di tempat lain** — baca dari plotSpace. Suite baru
  `tools/plot.test.js` (11 asersi). Total 156 asersi. Log:
  `design-plans/sesi-2026-09-05-09-…`.
- **M11 F2 (2026-09-05, eksekusi plan-05)**: band generator lega & seimbang —
  chip **118 → 104 px** @ pitch 180 → **gap chip→lingkaran tetangga 6 → 20 px**,
  **margin kanan 18 → 32 px** (vs kiri 60); `cx` pusat chip 93→86; font baris MW
  **11 → 10** (tetap ≥ floor 10) agar `· maks gov` (bbox 102 px) muat di 104.
  Tes F2 baru di sld.test (27 asersi). Total 159 asersi. Log:
  `design-plans/sesi-2026-09-05-11-…`.
- **M11 F3 (2026-09-05, eksekusi plan-06)**: komposisi vertikal seimbang — blok
  impor turun (y=48, teks 62/76, garis 82→252, digenapkan ke tepi CB 254 di
  M12-B), band generator naik (cy=142,
  garis y2=164, chip y=100, label 112, RPM 119, MW 135, AGC 86) → **void
  impor→gen 90 → 38 px** (pita atas 48, bawah 31). Pola sentuh-simpul tetap
  (garis = tepi lingkaran). Tes F3 baru di sld.test (**29 asersi**). Total
  **161 asersi**. Log: `design-plans/sesi-2026-09-05-12-…`.
  Seluruh temuan audit improve-ui (F1–F3) SELESAI.
- **M12 (2026-09-05, audit lanjutan SLD — 3 temuan terukur)**: probe 5 skenario
  menemukan: (A) teks "AGC" meluber 0,7 px di atas tag (bbox 13,3 > tag 13) → tag
  `y=84 h=15` (teks muat penuh, celah 1 px ke chip tetap); (B) garis impor berhenti
  2 px di atas CB → `y2=254` (pola sentuh-simpul seragam: gen 0 · impor 0 · feeder
  0); (C) label Beban margin kanan 9,8 px → `x=668` (31,8 px ≈ konsisten dengan
  chip 32). Tes M12 baru di sld.test (**31 asersi**). Total **163 asersi**. Log:
  `design-plans/sesi-2026-09-05-13-…`.
- **M14 (2026-09-05, teks grafik terpotong)**: audit CDP view Grafik — 10 teks
  melewati tepi kanan viewBox SVG (terpotong `overflow:hidden`): tick gauge 52–47
  start di `x=64` (→ 76 > viewBox 74, potong 2 px) & label tahap T1–T4 di `x=W−10`
  (→ W+3, potong 2,6–3,3 px). Perbaiki: `text-anchor="end"` — gauge `x=72`, label
  tahap `x=W−2`. Tes M14 baru di charts.test (**21 asersi**). Total **165 asersi**.
  Log: `design-plans/sesi-2026-09-05-15-…`.
- **M15 (2026-09-05, eksekusi temuan code-review)**: tepi plot renderer grafik kini dibaca dari
  `plotSpace.M` (`renderFreq`: `R = W−M.right`, `B = H−M.bottomF`; `renderVolt`: `R = W−M.right`
  — literal margin 14/24 dibuang, K3 utuh: drift `M` → renderer mustahil); `sim.p()` tanpa
  pemanggil dihapus (kode + CONTEXT.md + implementation-plan); dokumen disinkronkan — Riwayat
  CLAUDE kini memuat sesi-14/15, `svgBox()` (tak pernah ada di kode) dikoreksi jadi
  `plotSpace.sizeSvg`, hitungan skenario overview 6 → 8. Tes M15 baru di plot.test (**13
  asersi**). Total **167 asersi**. Log: `design-plans/sesi-2026-09-05-16-…`.
- **M16 (2026-09-05, TDD user-request SLD)**: busbar digambar **terakhir** = layer
  paling atas (tak tertindih feeder hijau/teal/impor); CB **14×14** menjauh dari bus
  (feeder y=270, gap 6,5 px; impor **DI ATAS** bus y=236 dgn garis y2=236 & TERBUKA
  y=230 — rotate(45 115 243)); label feeder **font 13/12** (dari 11/10,5). sld.test
  31→**34** asersi (M16-A/B/C; literal M8/M12-B dilampirkan). Total **170 asersi**.
  Log: `design-plans/sesi-2026-09-05-18-…`.

## Aturan umum workspace — SELF-CONTAINED (tidak perlu membaca CLAUDE.md/AGENTS.md di luar folder ini)

Folder ini = **repo git sendiri** (`endetta/underfrequency-relay-simulator`, branch
`main`, identitas git **repo-lokal**: `user.name=endetta`,
`user.email=endetta@users.noreply.github.com` — ulangi dua baris `git config` itu bila
`.git/config` hilang). Bekerja HANYA di dalam folder ini; root library bukan repo git.
Berikut saripati aturan root `CLAUDE.md` (aslinya tetap ada untuk proyek lain):

1. **Satu perubahan = satu proyek.** Jangan mencampur edit lintas proyek dalam satu
   commit; jangan `git add` dari root. Commit + push `origin/main` dari folder ini di
   sesi yang sama (warning LF→CRLF saat `git add` di Windows benign — abaikan).
2. **Bahasa.** UI, dokumentasi, pesan commit = Bahasa Indonesia; istilah teknis
   proteksi tidak diterjemahkan. Komentar kode boleh Indonesia.
3. **Tidak ada build.** Jalankan `underfrequency_relay_simulator.html` langsung di
   browser / `python -m http.server` / `npx serve`. Validasi = Node (harness
   stub-DOM `tools/lens-harness.js` + `tools/*.test.js`) + `node tools/shoot.js`
   (butuh Chrome + Node ≥ 22).
4. **Jangan mengubah nama/path yang di-hard-code.** Tes & `shoot.js` meng-hard-code
   nama file HTML dan id DOM (daftar lengkap di bagian *Gotcha*) — update semua
   referensi bila rename.
5. **Windows + Git Bash.** Perintah POSIX (`ls`, `mv`, `rm`, `git`); jangan
   `del`/`move`/`dir`.
6. **Verifikasi sebelum selesai.** Perubahan non-sepele: semua suite hijau (lihat
   *Tes & validasi* di bawah) + `shoot.js` bersih (bodyScroll=0 desktop, sldScale
   ≥ 1,0, font efektif ≥ 9,5, consoleErrors=0, overflow none, playcheck PASS).
7. **Log sesi wajib** — lihat bagian berikut.

**Peta library (tetangga — jangan diedit lintas proyek):** root berisi
`LEVEL 1 - *.html` (kalkulator mandiri), `LEVEL 2 - DIFFERENTIAL RELAY SIMULATOR` &
`LEVEL 2 - DISTANCE RELAY SIMULATOR` (saudara satu-file vanilla; seam desain di sini
diwarisi dari mereka), dan `LEVEL 3 - PROTECTION SYSTEM SIMULATOR` (platform React —
modul Differential R10 **FROZEN**, jangan sentuh; modul underfrequency U01 = referensi
persamaan saja, ADR-0001). Nama folder resmi ber-spasi/caps — **jangan di-rename**.
Dua implementasi differential (LEVEL 2 vs LEVEL 3) sengaja berbeda — jangan
disinkronkan membabi buta. `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html`
jangan diedit tanpa izin. Bila ragu proyek mana yang dimaksud user: tanyakan.

## Log sesi & sinkronisasi dokumen (WAJIB — aturan umum poin 7)

- Tiap perubahan non-sepele dicatat di `design-plans/sesi-YYYY-MM-DD-NN-*.md`
  (template `design-plans/sesi-TEMPLATE.md`): waktu mulai + commit sebelum → kegiatan
  & hasil (ringkas, dgn bukti tes/angka) → status → langkah berikutnya. Perbarui juga
  status header `design-plans/plan-*.md` yang dipakai (DRAF → DIEKSEKUSI → SELESAI).
- Riwayat terbaru: `sesi-2026-09-05-18` (M16: bus layer atas + CB 14×14 + font feeder) →
  `sesi-2026-09-05-17` (perbaikan white screen — SyntaxError `scenarioDelta`
  dari edit manual yang belum di-commit; file dikembalikan ke HEAD via stash, 8 suite + shoot
  hijau) → `sesi-2026-09-05-16` (M15: eksekusi temuan code-review) → `sesi-2026-09-05-15` (M14: teks grafik terpotong) → `sesi-2026-09-05-14` (M13: ciut-semua mepet ke atas) → `sesi-2026-09-05-13` (M12: audit lanjutan SLD) → `sesi-2026-09-05-12` (M11 F3: komposisi vertikal) → `sesi-2026-09-05-11` (M11 F2: spasi band generator) → `sesi-2026-09-05-10` (M11 F1: garis feeder tersambung) → `sesi-2026-09-05-09` (K3: plotSpace) → `sesi-2026-09-05-08` (K2: fasilitas run sim) → `sesi-2026-09-05-07` (refactor snapshot keadaan sesaat) → `sesi-2026-09-05-06` (M10: grafik mengisi kolom — renderer adaptif dims) → `sesi-2026-09-05-05` (M9: audit overlap SLD — kotak feeder tak lagi tumpuk) → `sesi-2026-09-05-04` (M8: bug play + rombak SLD) → `sesi-2026-09-05-03` (M7: temuan code-review) → `sesi-2026-09-05-02` (plan-03 M6: AGC + player real-time + jendela 30 s).
  Sebelumnya: `sesi-2026-09-05-01` (audit improve-ui → eksekusi M5, plan-02 SELESAI).
- **Sesi/AI baru mulai dari:** file ini → log sesi terbaru → plan ber-status DRAF/BELUM
  → kerjakan lanjutannya. Riwayat & arah tersimpan di file — jangan eksplorasi ulang.

## Pintu masuk

| File | Peran |
|---|---|
| `underfrequency_relay_simulator.html` | Produk satu-file (script: §1–11 mesin murni, §12+ state/UI/renderer) |
| `docs/PRD.md` | Sumber kebenaran MODEL (persamaan §5) + keputusan prototipe §7 |
| `docs/implementation-plan.md` | Kontrak implementasi + spesifikasi UI §5 |
| `design-plans/` | Plan (status DRAF/DIEKSEKUSI/SELESAI) + log sesi (`sesi-*.md`) + `sesi-TEMPLATE.md` |
| `tools/lens-harness.js` | Stub DOM untuk menjalankan `<script>` di Node |
| `tools/*.test.js` | 5 suite tes Node (lihat bawah) |
| `tools/shoot.js` | Screenshot headless Chrome (CDP, tanpa dependensi) |
| `prototype.html` | Arsip prototipe layout — di branch `prototype-v1`, TIDAK di main |

## Seam & konvensi desain (warisan Differential/Distance)

- **Layout desktop (M5)**: satu layar terkunci (`html,body{height:100%;overflow:hidden}`
  + `.layout{flex:1;min-height:0;grid-template-rows:minmax(0,1fr)}`); kolom params &
  kartu kanan scroll INTERNAL; tengah = `#vswitch` (`SLD|Grafik`) + satu hero per waktu
  (`S.ui.view`, `setView`/`syncViewDom`, view tak aktif `display:none` — state run/playhead
  aman); SLD `viewBox 700 520` + `fitSld()` skala min(w,h) → ≥ 1,0; splash AUTO
  (20/1350/1860 ms, klik=skip, `prefers-reduced-motion`=skip langsung).
- **Jangan regresi**: splash krem (#FDFAF3→#F8EFE1) dengan huruf S H E V A; judul
  bergantian `.tt-a` ↔ `.tt-b` (kilau `ttShine`, copper lembut #8A6B4D); kartu
  collapse `.card-b-i` (grid 1fr→0fr, BUKAN `display:none`); kartu ciut mepet ke
  atas (flex-start) — TANPA centering vertikal saat semua ciut (seam: jangan
  `justify-content:center`/`padding-top` inline → tumpukan mengambang); scrollbar tipis global;
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

## Model — persamaan di sumbernya, bukan di sini

- Persamaan lengkap: **`docs/PRD.md` §5** (rantai) + spesifikasi **U01 §7–8** (LEVEL 3,
  baca-saja) — engine memakai persis itu (tes literal U01 §12). JANGAN duplikasi di sini.
- Gotcha yang sering menggigit (tidak di PRD):
  - `pct` tahap UFLS = **fraksi** (0,05), bukan persen.
  - RPM unit `n = 120·f/kutub` (2 kutub @50 Hz = 3000).
  - UFLS strict: arm `f < ambang` (bukan ≤); trip = MW nyata feeder; **latch**.
  - Saturasi governor: D=290 SETTLED / D=291 COLLAPSE (default) — batas eksak teruji.
  - `ufTimeline` deterministik; parity statis↔timeline < 1e-6 (U01 §13.1).
  - V ilustratif (ADR-0004): lantai 0,85; label "ilustratif — bukan hasil aliran daya" WAJIB.

## Tes & validasi

```bash
node tools/model.test.js     # literal model (U01 §12 + hitung tangan)
node tools/timeline.test.js  # determinisme, urutan trip, parity, RUNTUH
node tools/sld.test.js       # geometri SLD (salib, solid, vital teal, pemutus)
node tools/charts.test.js    # skala grafik/gauge/tegangan (literal)
node tools/ui.test.js        # seam desain + transport kompak + kartu kanan
node tools/snapshot.test.js  # snapshot keadaan sesaat (numerik, lintas-permukaan)
node tools/sim.test.js       # fasilitas run sim (cache, anti-stale, clamp playhead)
node tools/plot.test.js      # ruang plot plotSpace (margin, kotak, sizeSvg)
node tools/shoot.js          # screenshot semua view → tools/shots/ + report.txt
```

Gerbang perubahan non-sepele: semua suite hijau + `shoot.js` bersih (tanpa overflow
> 2 px, tanpa exception, font OK) + smoke browser manual (preset & 8 skenario,
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
- Skala grafik: rumus `y(f)=12+(52−f)/5·214`, `x(t)=38+t/30·628` (jendela 0–30 s)
  = **desain/nominal** kotak 680×250 (PRD §7) — literal suite charts; renderer M10
  menerima dims `{w,h}` → plot mengisi tinggi kartu (`fToY(f,H)`, `tToX(t,W)`;
  margin atas 12 / bawah 24, volt 26). Gauge stops (M5): 0/36/38/44/62/100%
  (copper/copper/hijau/hijau/copper/merah — hijau HANYA pita 50,2–49,8, over-frekuensi
  copper) — tes memakai literal.
- **Player (M6)**: `tick()` memakai `S.ui.lastT/lastHeavy/heavyN` — jangan balik ke
  langkah tetap 0,05 s/frame. Klik skenario auto-play (`play()`); render berat
  (grafik + kartu kanan) di-throttle ≥ 100 ms saat main — SLD/transport tiap frame.
- **AGC (M6/ADR-0006)**: `run.agcSteps[].cum` = kumulatif per unit (dipakai chip SLD +
  badge AGC); default produk `agcOn:true, agcRate:40, agcInterval:2`; `setAgc(on)`
  recompute run penuh; `agcOn=false` harus tetap menghasilkan perilaku pra-ADR-0006
  (literal 49,686 diuji). Jangan ubah tanpa amendemen PRD §5.4b/ADR-0006.
