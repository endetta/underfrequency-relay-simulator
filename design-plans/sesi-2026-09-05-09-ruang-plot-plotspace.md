# Sesi 2026-09-05-09 — Refactor arsitektur #3: ruang plot `plotSpace` (satu sumber skala & margin)

> Aturan root "Log sesi wajib" (CLAUDE.md poin 8 — self-contained). Proses: skill
> implement (K3 dari laporan arsitektur di temp `tools/.tmp-arch/`) → grilling 1
> ronde (semua jawaban user = rekomendasi) → implementasi TDD merah→hijau →
> code-review → commit + push.

- **Mulai:** ~20:40 · **Commit sebelum:** 4018abc (K2 sim) · **Repo:** endetta/underfrequency-relay-simulator @ main
- **Mandat user:** hasil review arsitektur — pilih K3 "plotSpace" (kandidat SPECULATIVE
  dari laporan; user lanjutkan) dengan jawaban: Q1=A modul penuh (tabel margin + tabel
  kotak desain + pemetaan + `sizeSvg`), Q2=A `fitSld` di-rewire behavior-neutral, Q3=A
  suite baru `tools/plot.test.js`, Q4=ya (gerbang 8 suite + shoot, sinkronisasi dokumen,
  log sesi, code-review, commit + push).
- **Fakta yang dikumpulkan sebelum grilling:** dua resep pengukuran berdampingan —
  grafik (M10) `svgBox(el,dw,dh)` → `clientWidth/Height` → viewBox dinamis 1:1 px vs
  SLD `fitSld()` → `getBoundingClientRect` `#viewSld` → skala min(w/h) terhadap viewBox
  tetap 700×520 via atribut width/height. Konstanta tersebar: margin 12/24/26/38/14 +
  kotak 680×250/74×250/680×190/700×520 di renderer, PRD §7, CLAUDE.md, charts.test.js.
  `#viewSld` = `overflow:hidden` tanpa border → `clientWidth == getBoundingClientRect().width`
  (rewire ke `sizeSvg` identik). API ekspor `fToY/tToX` (bukan voltY/svgBox/fitSld);
  shoot.js cek sldScale = width/700 ≥ 1,0 (fitSld wajib tetap set width/height).
- **Dikerjakan & hasil:**
  - **Merah:** suite baru `tools/plot.test.js` (11 asersi numerik + rewiring source) —
    `A.plotSpace is not a function` (11 gagal; suite lama tetap hijau).
  - **Hijau:** modul **`plotSpace`** di seksi **12c** (baris 1073+): `M = {top:12,
    left:38, right:14, bottomF:24, bottomV:26}`, `box = {freq 680×250, gauge 74×250,
    volt 680×190, sld 700×520}`, `fToY/tToX/voltY` membaca M (tanpa argumen = kotak
    desain → literal suite charts tak berubah), `dims` fallback, `sizeSvg(el,dw,dh)`
    guard default. `fToY/tToX/plotDims/voltY` jadi delegasi; renderFreq/renderGauge/
    renderVolt baca `plotSpace.box.*`; `render*Into` pakai `plotSpace.sizeSvg` +
    `plotSpace.box.*` (svgBox dihapus); `fitSld` baca `plotSpace.box.sld` + sizeSvg
    (padding 28/66 & resep min-fit tetap). API ekspor `plotSpace`.
  - **Bukti:** 156 asersi hijau — model 33 · timeline 21 · sld 24 · charts 19 · ui 34 ·
    snapshot 8 · sim 6 · **plot 11** (suite lama tak berubah apa adanya → parity).
    shoot.js bersih: 9 view, bodyScroll=0, overflow none, consoleErrors=0, **sldScale
    1.11** (≥ 1,0), minSvgFont efektif 11.11 (fitSld behavior-neutral terbukti).
- **Code-review (skill code-review):** diff kecil & fokus (modul 12c + delegasi 4 fungsi
  + 6 situs baca box + fitSld + ekspor API); tidak ada pelanggaran standar repo; tidak
  menyentuh ADR (K3 internal satu file).
- **Dokumen tersinkron:** CONTEXT.md (istilah "ruang plot (plotSpace)" + Avoid) ·
  CLAUDE.md (bullet refactor #3, riwayat log, daftar suite, gotcha "baca dari
  plotSpace") · overview & README (156 asersi, 8 suite) · PRD §7 (catatan sumber kode
  plotSpace, jangan ubah literal tanpa amendemen serentak) · implementation-plan
  (§4 tabel baris plotSpace + catatan header) · log ini.
- **Status:** SELESAI — dua resep pengukuran kini satu modul; konstanta margin/kotak
  tak bocor ke 4 tempat; renderer & fitSld hanya membaca.
- **Langkah berikutnya (untuk sesi/AI baru):** refactor ter-commit & ter-push. Bila
  lanjut: mulai dari CLAUDE.md proyek → log ini. File kunci:
  `underfrequency_relay_simulator.html` (plotSpace §12c baris 1073+; renderer §13b;
  fitSld), `tools/plot.test.js`. Kandidat arsitektur lain sudah habis (K1–K3);
  laporan sekali pakai `tools/.tmp-arch/` boleh dihapus.