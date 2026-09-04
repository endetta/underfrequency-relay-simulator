# ADR-0003 — Topologi satu-area koheren: satu frekuensi, SLD sebagai kanvas

Status: accepted (2026-09-05, Round 1 grill)

Simulator memakai model **satu-area generator-coherent**: satu frekuensi sistem
skalar `f(t)` untuk seluruh unit yang ONLINE (bukan frekuensi per-bus — itu tidak
fisis untuk area koheren). Kanvas utama = **diagram satu garis (SLD)** (istilah
user: "SLT", dimaknai SLD).

Isi default SLD (semua dapat diedit):

- **3 unit pembangkit** G1–G3, nilai awal meniru preset LEVEL 3 U01:
  G1 Thermal 600 MW (MVA 700, H 5.0 s, R 0.05, 2 kutub, govMax 640, output 500),
  G2 Hydro 400 MW (MVA 450, H 4.0 s, R 0.04, 4 kutub, govMax 430, output 350),
  G3 Gas 300 MW (MVA 330, H 4.5 s, R 0.05, 2 kutub, govMax 320, output 250).
  Total output = beban awal = **1100 MW** (setimbang).
- **Satu bus** penghubung.
- **Feeder beban** = satu feeder per tahap UFLS (Tahap 1..4) + **satu beban vital**
  yang tidak pernah dilepas. Pada nilai default, MW tiap feeder menyamai fraksi
  lepas tahapnya terhadap beban pra-gangguan (55 / 110 / 165 / 220 MW, vital 550 MW);
  saat trip, yang dilepas adalah **MW nyata feeder** (jika user mengubah ukuran
  feeder, MW lepas aktual = MW feeder, bukan % tabel — tabel adalah target,
  SLD menunjukkan kenyataan).

Narasi pelepasan divisualkan di SLD: pemutus feeder tahap terbuka berurutan
(prioritas waktu), aliran berhenti, dan urutannya tampil di kartu kanan.

Konsekuensi: karena hanya ada satu bus, tegangan terminal semua unit identik →
kurva tegangan adalah **satu kurva tegangan bus** (bukan per unit); lihat ADR
model tegangan ilustratif.
