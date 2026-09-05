# ADR-0006 — Hierarki kendali frekuensi: governor droop → AGC sekunder → UFLS

Status: accepted (2026-09-05, plan-03)

Revisi besar setelah user melihat player tidak terasa hidup & menyadari operasi nyata
governor/AGC berjalan dalam orde **puluhan detik**, bukan satuan detik. Keputusan
(disetujui user): simulator memakai **tiga lapisan kendali frekuensi** dengan urutan
narasi seperti praktik operasi:

1. **Governor (droop, primer)** — bekerja otomatis, f-driven (PRD §5.4, tidak berubah).
2. **AGC sekunder (BARU)** — setelah droop setimbang dan f masih di bawah pita
   `49,95 Hz` (`AGC_BAND = ±0,05`), setpoint unit **dinaikkan dalam langkah diskret**:
   tiap `agcInterval` (default **2 s**) sebesar `agcRate` (default **40 MW/s** total),
   dibagi **proporsional headroom** unit online. Langkah dijepit ke defisit efektif
   segmen (`agcDeficitNow`) agar tidak over-dispatch; berhenti saat f kembali ke pita,
   reserve habis, run RUNTUH, atau `agcOn=false`. Dispatch AGC **menggeser `P0` unit**
   → kurva f berbentuk **tangga** (ciri kendali sekunder).
3. **UFLS (garis terakhir)** — tetap bekerja seperti §5.7; AGC **dijeda 2 s** setelah
   tiap trip UFLS (pelepasan beban adalah garis terakhir PLN; AGC tidak melawan di
   tengah cascade).

Konsekuensi yang dikunci:

- **Skenario +Beban 200 MW (mandiri)**: dulu DEFISIT 49,686 tanpa trip; kini AGC
  **memulihkan f ke 50,00 tanpa UFLS** — kasus showcase lapisan governor→AGC.
- `agcOn=false` (toggle OFF di kartu *Kendali frekuensi*) mempertahankan **perilaku
  lama** utuh untuk perbandingan (literal 49,686 tetap diuji).
- Run mengekspos `run.agcDispatch`, `run.agcStep`, `run.agcSteps[{t,mw,fAfter,cum}]`
  (cum = kumulatif per unit), `run.agcActive`, `run.agcRecovered`; renderer memakai
  `agcSteps[].cum` untuk menampilkan chip MW + label kecil **AGC** di SLD dan baris
  `Dukungan AGC +x MW` + indikator fase `GOVERNOR → AGC → UFLS` di kartu kanan.
- **Jendela waktu 0–30 s** (dulu 0–12 s) agar governor/AGC/shedding selesai terlihat;
  `x(t) = 38 + t/30·628`, label sumbu 0/5/…/30 s (PRD §7 item 3 diamendemen).
- **Player real-time**: `tick()` berbasis **waktu dinding**
  (`dt = clamp(ΔrAF, 0, 0,1) × speed`; 1× = real-time); render berat (grafik f/V +
  kartu kanan) di-throttle ke ~10 fps saat play (chip SLD + playhead tiap frame);
  **klik skenario = auto-play**; skenario "Lepas interkoneksi" **memaksa preset
  berimpor** agar selalu punya efek.
- Kode AGC hidup di `ufTimeline()` (PRD §5.4b); angka `agcRate`/`agcInterval` label
  ambar PLN (belum diverifikasi ke pedoman resmi) — ditandai di kartu UI.
