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
  lingkaran+salib (×) **di atas bus** dengan **chip RPM/MW live** (hijau online /
  copper "maks gov" saat jenuh / abu TRIP), 5 feeder beban (T1–T4 hijau + **beban
  vital teal**) tersambung solid **di bawah bus** sebagai kotak label dua-baris
  **terpisah (tanpa tumpuk, M9)**; pemutus kotak **12×12** lurus (tertutup) vs
  **miring 45° + label TERBUKA** (terbuka); chip AGC saat kendali sekunder bekerja;
  legenda 5 item warna dibedakan. TIDAK ada garis putus-putus di jalur daya.
- **Transport kompak** (≤ 40 px): ▶/❚❚ · 0,5×/1×/2× · scrubber · t · Reset.
- **Grafik frekuensi** (0–30 s, 47–52 Hz): pita normal ±0,2 Hz hijau, garis 50 Hz,
  ambang UFLS putus-putus copper berlabel T1–T4, penanda peristiwa (t=1,0 s) & trip,
  nilai f di playhead; di sampingnya **indikator batang gradien** hijau→copper→merah
  (50 Hz masih hijau, 47 Hz merah) + penunjuk + nilai. **Kartu grafik mengisi penuh
  tinggi kolom tengah (M10)** — tiap SVG diukur lalu digambar ulang 1:1 px (skala
  vertikal menyesuaikan kartu), tanpa ruang kosong bawah saat layar tinggi.
- **Grafik tegangan** (pu 0,85–1,05): label permanen *"ilustratif — bukan hasil
  aliran daya"*, lantai 0,85, nominal 20 kV.
- **Kartu kanan 2 tab**: *Kondisi sistem* (pill status semantik + fase kendali
  governor/AGC/UFLS, f, ROCOF awal, beban, pembangkitan, dukungan governor &
  AGC, headroom, defisit) & *Urutan pelepasan*
  (baris tiap trip: −MW nyata, t & f, beban sebelum→sesudah, total lepas).
- Kartu kiri: preset sistem (mandiri / berimpor 400 MW), slider impor, ringkasan
  generator & tahap UFLS + **catatan ambar PLN**, chip skenario (6 peristiwa di
  t=1,0 s), tentang model.

## Rantai model (PRD §5; detail U01 §7–8)

Kendali frekuensi berjenjang tiga lapis (ADR-0006): **governor (droop) → AGC
sekunder → UFLS**.

1. **Agregat** online → `S_base`, `H_sys`, `P_gen0`, `β=Σ MVA/R`, `reserve`.
2. **Governor droop** per unit `resp_i = max(0, −Δf/50·MVA_i/R_i)` dijepit headroom;
   saturasi saat `Δf ≤ −50·headroom·R/MVA` (headroom habis).
3. **AGC sekunder** (setelah governor setimbang & f masih < 49,95): setpoint unit
   dinaikkan dalam langkah diskret tiap 2 s (total 40 MW/s, proporsional headroom)
   → kurva f bertangga; berhenti di pita ≥ 49,95 / reserve habis / saat UFLS.
4. **ROCOF awal** `−(50/(2H_sys))·(D₀/S_base)`.
5. **Solver piecewise** (statis) & **timeline deterministik** (integrasi segmen
   bentuk-tertutup, event-driven, lantai 47 Hz) — saling parity < 1e-6.
6. **UFLS berjenjang**: arm ketat `f < ambang && !nearlyEqual`, timer reset,
   trip = MW feeder nyata (fraksi × beban pra-gangguan), latch.
7. **Tegangan ilustratif**: lekukan ∝ D₀, pulih τ≈3 s, lantai 0,85 saat RUNTUH.
8. **Status** 5 kondisi + warna semantik (SEIMBANG/DEFISIT/PELEPASAN BEBAN/
   PEMULIHAN/RUNTUH).

Peristiwa yang dipicu t=1,0 s: Lepas G1/G2/G3 · Blok G3 · Lepas interkoneksi
(preset berimpor) · +Beban [MW] · +Beban besar (→ RUNTUH) · Seimbang (tanpa peristiwa).

## Validasi

```bash
node tools/model.test.js     # 33 asersi literal (U01 §12 + hitung tangan)
node tools/timeline.test.js  # 21 asersi (determinisme, parity, RUNTUH, jendela 0–30 s)
node tools/sld.test.js       # 24 asersi geometri SLD (gen atas / beban bawah / CB 12×12 / kotak tak tumpuk)
node tools/charts.test.js    # 19 asersi skala grafik/gauge/tegangan (incl. M10 adaptif tinggi)
node tools/ui.test.js        # 34 asersi seam desain & perilaku (incl. spasi transport↔SLD, M10 flex)
node tools/shoot.js          # screenshot 9 view → tools/shots/ (+ zoom ASCII SLD)
```

Total **131 asersi**, semuanya hijau di Node ≥ 22 (tanpa dependensi). `tools/shoot.js`
mengikuti pola CDP tanpa-npm proyek Differential (Chrome otomatis / `CHROME=/path`).

## Sumber & keputusan

`docs/PRD.md` (§5 model, §7 keputusan dikunci) · `docs/adr/0001–0006` · `CONTEXT.md`
(glosarium) · `docs/research/pln-underfrequency-practice.md` (angka UFLS = praktik
tipikal, belum diverifikasi PLN) · `docs/implementation-plan.md` (kontrak M0–M4,
selesai). Prototipe layout diarsip di branch `prototype-v1`.