# Sesi 2026-09-05-08 — Refactor arsitektur #2: fasilitas run `sim` (satu pintu param → run, anti-stale)

> Aturan root "Log sesi wajib" (CLAUDE.md poin 8 — self-contained). Proses: skill
> implement (K2 dari laporan arsitektur di temp `tools/.tmp-arch/`) → grilling 1
> ronde (semua jawaban user = rekomendasi) → implementasi TDD merah→hijau →
> code-review → commit + push.

- **Mulai:** ~19:40 · **Commit sebelum:** e878a00 (K1 snapshot) · **Repo:** endetta/underfrequency-relay-simulator @ main
- **Mandat user:** hasil review arsitektur — pilih K2 "Facade Sim" dengan jawaban:
  Q1=A fingerprint otomatis (`sim.run()` bandingkan `JSON.stringify(paramP())` → recompute
  + clamp hanya bila berubah; kelas bug "lupa tandai berubah" mati permanen), Q2=A fasilitas
  run ter-scope (`sim.run()/p()/restart()`, `computeRun()` delegasi kompat, migrasi ~6 handler,
  `S.run` tetap mirror), Q3=A suite baru `tools/sim.test.js`, Q4=ya (gerbang 7 suite + shoot,
  sinkronisasi dokumen, log sesi, code-review, commit + push).
- **Fakta yang dikumpulkan sebelum grilling:** permukaan mutasi parameter nyatanya kecil —
  6 situs recompute (`computeRun()` di reset, preset, slider impor, loadStep aktif, chip
  skenario, AGC + init); `paramP()` assembler P; `computeRun()` sudah memegang klausa clamp
  playhead (`tNow > run.tMax → 0`). `renderGenList`/`renderStageList` read-only (unit/tahap
  bukan kontrol editable) → scope lebih kecil dari kartu K2 semula.
- **Dikerjakan & hasil:**
  - **Merah:** suite baru `tools/sim.test.js` (6 asersi numerik) — `A.sim is not a function`.
  - **Hijau:** modul **`sim`** di seksi **12a** (sebelum computeRun, baris 893+):
    `sim.p()` (assembler P), `sim.run()` (cache run; fingerprint `JSON.stringify(paramP())` —
    recompute + clamp `tNow > tMax` hanya saat param berubah; `S.run` mirror), `sim.restart()`
    (reset playhead + run segar); `computeRun()` = `sim.run()` (delegasi kompat — tes lama /
    reset tak berubah). Handler UI di-rewire ke `sim.restart()`/`render()`; `render()` memang
    memanggil `sim.run()` di depan → run tak pernah basi walau handler lupa tandai berubah.
  - **Bukti:** 145 asersi hijau — model 33 · timeline 21 · sld 24 · charts 19 · ui 34 ·
    snapshot 8 · **sim 6** (suite lama tak berubah apa adanya → parity). shoot.js bersih
    (bodyScroll=0 desktop, overflow none, consoleErrors=0, playcheck PASS).
  - **Code-review (skill code-review):** diff kecil & fokus (modul 12a + delegasi + 4 situs
    handler); tidak ada pelanggaran standar repo; fixture tes menyentuh S.run/sim.run via API.
- **Dokumen tersinkron:** CONTEXT.md (istilah "fasilitas run (sim)" + Avoid facade/store) ·
  CLAUDE.md (bullet refactor #2, riwayat log, daftar suite + gotcha "lewat sim") ·
  overview & README (145 asersi, 7 suite) · implementation-plan (§4 tabel baris `sim` + catatan
  header) · log ini.
- **Status:** SELESAI — kelas bug run-basi (M7/M8: lupa hitung ulang, playhead lewat ujung)
  mengerucut di satu modul; pintu param→run kini satu & teruji.
- **Langkah berikutnya (untuk sesi/AI baru):** refactor ter-commit & ter-push. Bila lanjut:
  mulai dari CLAUDE.md proyek → log ini. File kunci: `underfrequency_relay_simulator.html`
  (sim §12a baris 893+; snapshot §12b; renderSld/renderSide/renderSldInto),
  `tools/sim.test.js`. Kandidat tersisa K3 (plotSpace) masih di temp `tools/.tmp-arch/` —
  hapus bila tak dipakai.
