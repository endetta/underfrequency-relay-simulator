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
- Riwayat terbaru: `sesi-2026-09-05-02` (eksekusi plan-03 M6: AGC + player real-time + jendela 30 s).
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
- Konstanta skala grafik dikunci (PRD §7 + ADR-0006): `y(f)=12+(52−f)/5·214`,
  `x(t)=38+t/30·628` (jendela 0–30 s); gauge stops (M5): 0/36/38/44/62/100%
  (copper/copper/hijau/hijau/copper/merah — hijau HANYA pita 50,2–49,8, over-frekuensi
  copper) — tes memakai literal.
- **Player (M6)**: `tick()` memakai `S.ui.lastT/lastHeavy/heavyN` — jangan balik ke
  langkah tetap 0,05 s/frame. Klik skenario auto-play (`play()`); render berat
  (grafik + kartu kanan) di-throttle ≥ 100 ms saat main — SLD/transport tiap frame.
- **AGC (M6/ADR-0006)**: `run.agcSteps[].cum` = kumulatif per unit (dipakai chip SLD +
  badge AGC); default produk `agcOn:true, agcRate:40, agcInterval:2`; `setAgc(on)`
  recompute run penuh; `agcOn=false` harus tetap menghasilkan perilaku pra-ADR-0006
  (literal 49,686 diuji). Jangan ubah tanpa amendemen PRD §5.4b/ADR-0006.
