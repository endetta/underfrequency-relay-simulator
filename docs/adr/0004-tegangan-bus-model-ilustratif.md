# ADR-0004 — Tegangan bus: model ilustratif berlabel, bukan aliran daya

Status: accepted (2026-09-05, Round 1–2 grill)

Karena topologi satu-area satu bus (ADR-0003), tegangan terminal semua unit identik
→ yang digambar adalah **satu kurva "Tegangan bus"**. Scope library & U01
mengecualikan aliran daya / keseimbangan reaktif, jadi dipilih model sederhana yang
wajib berlabel **"model tegangan ilustratif — bukan hasil aliran daya"**:

- V mulai **1.00 pu** (nominal, mis. 20 kV tampil di tooltip);
- setiap peristiwa yang **menambah defisit** (GENERATOR_LOSS, LOAD_STEP positif,
  GENERATOR_BLOCK) menimbulkan lekukan V ∝ D₀/ΣMVA_online (diskala, lantai 0.85 pu);
- pemulihan **eksponensial τ ≈ 3 s** setelah defisit berhenti / sistem arrested;
- pada run yang berakhir **RUNTUH**, V terus turun menuju lantai 0.85 pu;
- sumbu y grafik: pu 0.85–1.05.

Konsekuensi: agen lain dilarang "memperbaiki" kurva ini menjadi aliran daya reaktif
penuh; label ilustratifnya tidak boleh dihapus dari UI (kalau dihapus, kurva tampak
seolah hasil perhitungan kelistrikan yang valid).
