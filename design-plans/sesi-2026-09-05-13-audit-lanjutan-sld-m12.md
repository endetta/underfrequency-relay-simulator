# Sesi 2026-09-05-13 — M12: audit lanjutan SLD (3 temuan terukur: AGC tag, garis impor, margin Beban)

> Aturan root "Log sesi wajib" (CLAUDE.md poin 8 — self-contained). Lanjutan sesi-12
> (M11 F1–F3 tuntas). Proses: audit terukur (probe CDP 5 skenario) → scope disetujui
> user (A+B+C) → TDD merah→hijau → gate penuh.

- **Mulai:** ~00:20 · **Commit sebelum:** f7cab71 (M11 F3) · **Repo:** endetta/underfrequency-relay-simulator @ main
- **Mandat user:** review & audit SLD — lebih mudah dilihat/nyaman/professional/informatif/estetik; tanpa overlap, kesalahan line, ketidakkonsistenan spacing. (Skill tdd: seam dikonfirmasi — `sld.test.js` + probe CDP + gate.)
- **Audit (probe CDP, 5 skenario: seimbang+impor400 / impor-lepas t=2 / lepas-G1 t=25 / blok-G3 t=20 / +beban200 AGC t=30):**
  - **A (defect overlap nyata):** teks "AGC" meluber 0,7 px di atas tag-nya — bbox teks y 85,3–98,6 vs tag y 86–99 (area 228 ×3 tag, 3 skenario). Laten sejak sebelum F3 (offset baseline 9,5 sama); terukur sekarang.
  - **B (kesalahan line):** garis impor berhenti y=252, CB mulai y=254 → gap 2 px; tidak konsisten dengan pola sentuh-simpul lain (gen 0, feeder 0).
  - **C (ketidakkonsistenan margin):** label "Beban" margin kanan 9,8 px (x=690) vs chip 32 px.
  - Bersih (non-temuan): zero-overlap selain A; sambungan gen/feeder sempurna; bus 70–590 ∥ feeder 72–588; TERBUKA/AGC count; font ≥ 10; label G1 × impor aman (7×0).
- **Scope user:** A+B+C saja (tanpa panah aliran tambahan).
- **Dikerjakan & hasil:**
  - **Merah:** `sld.test.js` — blok F3 dimodifikasi (AGC `y="84" h="15"` + cek absen `86×13`) + 2 asersi baru M12-B (impor `y2="254"` + cek absen `252`) & M12-C (`x="668"`). → **28 lulus, 3 gagal**.
  - **Hijau:** `renderSld` — (A) agctag `y=86 h=13` → `y=84 h=15` (teks bbox 13,3 muat penuh; celah 1 px ke chip y=100 tetap); (B) garis impor `y2=252` → `254`; (C) label Beban `x=690` → `668`. → sld **31 lulus, 0 gagal**.
  - **Gerbang:** 8 suite hijau (**163 asersi** — model 33 · timeline 21 · sld **31** · charts 19 · ui 34 · snapshot 8 · sim 6 · plot 11). `shoot.js` bersih (9× overflow none · consoleErrors=0 · sldScale **1.11** · minSvgFont 11.11 · playcheck PASS · stop-bersih). **Probe ulang (5 skenario):** impLine→CB gap **0** (semua); loadTxt marginR **31,7–31,8** (≈ chip 32); teks AGC **muat penuh** di tag; overlap non-intentional **TIDAK ADA** (flag agctag×text lama hilang).
- **Dokumen tersinkron:** CLAUDE.md (bullet **M12** + riwayat log; 163 asersi, sld 31) · README/overview (163 asersi, sld 31) · log ini.
- **Status:** SELESAI — overlap AGC hilang, pola sentuh-simpul seragam (gen 0 · impor 0 · feeder 0), margin kanan konsisten (32 px).
- **Langkah berikutnya (untuk sesi/AI baru):** SLD audited penuh (F1–F3 + M12). Bila lanjut: mulai dari CLAUDE.md → log ini. Kandidat di luar lingkup SLD (kartu kanan, params, grafik) menunggu permintaan user.