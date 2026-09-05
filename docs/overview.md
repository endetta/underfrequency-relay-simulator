# Ringkasan — Simulator Underfrequency Relay (ANSI 81U)

Simulator edukasi **relay underfrequency + pelepasan beban bertahap (UFLS)** untuk
sistem satu-area koheren, dalam satu file HTML vanilla (`underfrequency_relay_simulator.html`)
— tanpa build, tanpa framework, Bahasa Indonesia. Pola struktur & seam desain diwarisi
dari proyek referensi (Differential & Distance Relay), sedangkan **rantai model diambil
dari spesifikasi U01** (modul React LEVEL 3, ADR-0002) — tapi implementasi ini
sepenuhnya berdiri sendiri (ADR-0001).

## Yang dilihat user (layout varian A, PRD §4)

```
┌────────────────────┬──────────────────────────────┬────────────────────┐
│  Unit pembangkit   │  SLD (diagram satu garis)    │  Kartu status      │
│  Beban & tahap UFLS│  ─ transport kompak ─        │  (2 tab):          │
│  Skenario          │  Grafik frekuensi + gauge    │  Kondisi sistem /  │
│  Tentang           │  Grafik tegangan (ilustratif)│  Urutan pelepasan  │
└────────────────────┴──────────────────────────────┴────────────────────┘
```

- **SLD**: bus tebal, interkoneksi kiri-atas (label MW + pemutus), 3 generator simbol
  lingkaran+salib (×) dengan **chip RPM/MW live** (hijau online / copper "maks gov"
  saat jenuh / abu TRIP), 5 feeder beban (T1–T4 hijau + **beban vital teal**)
  tersambung solid; pemutus kotak lurus (tertutup) vs **miring 45° + label TERBUKA**
  (terbuka); legenda 5 item warna dibedakan. TIDAK ada garis putus-putus di jalur daya.
- **Transport kompak** (≤ 40 px): ▶/❚❚ · 0,5×/1×/2× · scrubber · t · Reset.
- **Grafik frekuensi** (0–30 s, 47–52 Hz): pita normal ±0,2 Hz hijau, garis 50 Hz,
  ambang UFLS putus-putus copper berlabel T1–T4, penanda peristiwa (t=1,0 s) & trip,
  nilai f di playhead; di sampingnya **indikator batang gradien** hijau→copper→merah
  (50 Hz masih hijau, 47 Hz merah) + penunjuk + nilai.
- **Grafik tegangan** (pu 0,85–1,05): label permanen *"ilustratif — bukan hasil
  aliran daya"*, lantai 0,85, nominal 20 kV.
- **Kartu kanan 2 tab**: *Kondisi sistem* (pill status semantik, f, ROCOF awal,
  beban, pembangkitan, dukungan governor, headroom, defisit) & *Urutan pelepasan*
  (baris tiap trip: −MW nyata, t & f, beban sebelum→sesudah, total lepas).
- Kartu kiri: preset sistem (mandiri / berimpor 400 MW), slider impor, ringkasan
  generator & tahap UFLS + **catatan ambar PLN**, chip skenario (6 peristiwa di
  t=1,0 s), tentang model.

## Rantai model (PRD §5; detail U01 §7–8)

1. **Agregat** online → `S_base`, `H_sys`, `P_gen0`, `β=Σ MVA/R`, `reserve`.
2. **Governor droop** per unit `resp_i = max(0, −Δf/50·MVA_i/R_i)` dijepit headroom;
   saturasi saat `Δf ≤ −50·headroom·R/MVA` (headroom habis).
3. **ROCOF awal** `−(50/(2H_sys))·(D₀/S_base)`.
4. **Solver piecewise** (statis) & **timeline deterministik** (integrasi segmen
   bentuk-tertutup, event-driven, lantai 47 Hz) — saling parity < 1e-6.
5. **UFLS berjenjang**: arm ketat `f < ambang && !nearlyEqual`, timer reset,
   trip = MW feeder nyata (fraksi × beban pra-gangguan), latch.
6. **Tegangan ilustratif**: lekukan ∝ D₀, pulih τ≈3 s, lantai 0,85 saat RUNTUH.
7. **Status** 5 kondisi + warna semantik (SEIMBANG/DEFISIT/PELEPASAN BEBAN/
   PEMULIHAN/RUNTUH).

Peristiwa yang dipicu t=1,0 s: Lepas G1/G3 · Lepas interkoneksi (preset berimpor) ·
+Beban 200 MW · +Beban besar (→ RUNTUH) · Seimbang (tanpa peristiwa).

## Validasi

```bash
node tools/model.test.js     # 33 asersi literal (U01 §12 + hitung tangan)
node tools/timeline.test.js  # 18 asersi (determinisme, parity, RUNTUH)
node tools/sld.test.js       # 18 asersi geometri SLD
node tools/charts.test.js    # 14 asersi skala grafik/gauge/tegangan
node tools/ui.test.js        # 30 asersi seam desain & perilaku
node tools/shoot.js          # screenshot 9 view → tools/shots/ (+ zoom ASCII SLD)
```

Total **113 asersi**, semuanya hijau di Node ≥ 22 (tanpa dependensi). `tools/shoot.js`
mengikuti pola CDP tanpa-npm proyek Differential (Chrome otomatis / `CHROME=/path`).

## Sumber & keputusan

`docs/PRD.md` (§5 model, §7 keputusan dikunci) · `docs/adr/0001–0005` · `CONTEXT.md`
(glosarium) · `docs/research/pln-underfrequency-practice.md` (angka UFLS = praktik
tipikal, belum diverifikasi PLN) · `docs/implementation-plan.md` (kontrak M0–M4,
selesai). Prototipe layout diarsip di branch `prototype-v1`.