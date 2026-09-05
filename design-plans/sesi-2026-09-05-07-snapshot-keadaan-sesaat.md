# Sesi 2026-09-05-07 — Refactor arsitektur: snapshot keadaan sesaat (satu interpretasi presentasi)

> Aturan root "Log sesi wajib" (CLAUDE.md poin 8 — self-contained). Proses: skill
> improve-codebase-architecture (laporan HTML di temp) → kandidat K1 dipilih user →
> grilling (4 ronde, semua jawaban user) → implementasi TDD merah→hijau.

- **Mulai:** ~17:50 · **Commit sebelum:** a094ccf (M10) · **Repo:** endetta/underfrequency-relay-simulator @ main
- **Mandat user:** hasil review arsitektur — pilih K1 "Scene SLD" (diperluas saat grilling menjadi **snapshot keadaan sesaat bersama**) dengan jawaban: Q1=A cakupan bersama (SLD + tag + kartu kanan), Q2=semantik engine via `satDevOf` (bukan ad hoc), Q3=satu fungsi satu objek, Q4=A refactor hijau minimum, Q5=semantik saja (RPM/peta feeder di renderer), Q6=`snapshot(p, run, t)` + entri CONTEXT, Q7=suite baru `tools/snapshot.test.js`.
- **Dikerjakan & hasil:**
  - **Temuan (fakta, bukan dugaan):** turunan "keadaan sesaat (p, run, t)" diduplikasi di **3 situs** — `renderSld` (open/shed/loadNow/gov/chip sat ad hoc), `renderSldInto` (tag `#sldTag`: f/trips/collapse/status), `renderSide` (pill status, beban, gov, agcDisp, **fase kendali**, deficit). Saturasi di renderSld ditulis ulang ad hoc (`resp ≥ govMax−p0 && f<50`) padahal mesin punya `satDevOf` — pola bug M7 yang tersisa di lapisan tampilan.
  - **Merah:** suite baru `tools/snapshot.test.js` (8 asersi numerik) — `A.snapshot is not a function` (7 gagal pertama; lalu asumsi tes dikoreksi: (a) delta skenario tampil di loadNow sejak t=0 — parity perilaku UI lama; (b) lepas G1 di t=1,5 sudah shed T1 55 MW → loadNow 1045).
  - **Hijau:** `snapshot(p, run, t)` di seksi **12b** (sesudah computeRun, sebelum renderer §13): `{f, status, phase, collapse, trips, shedTotal, loadNow, impNow, impLost, deficit, agcDisp, rocof0, gov, gen[]}` — `gen[]` = {id, poles, off, sat (via gov.resp==headroom, ekuivalen batas `satDevOf`), agcMw, mwFinal}. Semua semantik dari mesin (`scenarioDelta/effGens/ufGovernorAt/ufStatus/collapseAt/fAt`). Ekspor di `API`.
  - **Rewiring (nol perubahan perilaku):** `renderSld` (head + loop gen pakai `snap.gen`), `renderSide` (pill/row/fase dari snapshot), `renderSldInto` (tag dari snapshot). Asersi string lama **tetap hijau apa adanya** → parity terbukti.
  - **Bukti:** 139 asersi hijau — model 33 · timeline 21 · sld 24 · charts 19 · ui 34 · **snapshot 8**. shoot.js bersih (bodyScroll=0 desktop, overflow none, consoleErrors=0, playcheck PASS).
- **Dokumen tersinkron:** CONTEXT.md (istilah "keadaan sesaat (snapshot)" + Avoid) · CLAUDE.md (bullet refactor, riwayat log, daftar suite, gotcha jangan derivasi ulang) · overview & README (139 asersi, 6 suite, bullet interpretasi satu sumber) · implementation-plan (§4 tabel + catatan header) · log ini.
- **Status:** SELESAI — duplikasi interpretasi presentasi terhapus; renderer kini hanya memformat.
- **Langkah berikutnya (untuk sesi/AI baru):** refactor ter-commit & ter-push. Bila lanjut: mulai dari CLAUDE.md proyek → log ini. File kunci: `underfrequency_relay_simulator.html` (snapshot §12b baris 902+; renderSld/renderSide/renderSldInto), `tools/snapshot.test.js`; laporan kandidat lain (K2 facade Sim, K3 plotSpace) masih di temp `tools/.tmp-arch/` — hapus bila tak dipakai.
