# Konteks — Simulator Underfrequency Relay (81U)

Simulator edukasi mandiri satu-file (vanilla HTML, tanpa build) untuk proteksi
frekuensi rendah ANSI 81U dan pelepasan beban otomatis (UFLS), mengikuti pakem
visual & struktur proyek Differential Relay dan Distance Relay di LEVEL 2.

## Bahasa

**Relai underfrequency (81U)**:
Relai proteksi yang mendeteksi frekuensi sistem turun di bawah ambang dan memicu
pelepasan beban bertahap.
_Avoid_: relay frekuensi, under-frequency relay

**Pelepasan beban / UFLS (underfrequency load shedding)**:
Skema kendali darurat berjenjang yang memutus beban (feeder) bertahap saat
frekuensi rendah agar sistem berhenti jatuh dan pulih.
_Avoid_: load shedding, pemadaman bergilir, pelepasan beban manual

**Tahap UFLS (UFLS stage)**:
Satu anak tangga skema pelepas beban: pasangan ambang frekuensi + tunda waktu
disengaja + fraksi beban yang dilepas.
_Avoid_: stage, step, langkah pelepasan

**Ambang frekuensi (threshold)**:
Batas frekuensi (Hz) tempat sebuah tahap mulai mempertimbangkan trip. Pickup
bersifat ketat: `f < ambang` (sama persis dengan ambang = belum bekerja).
_Avoid_: setelan, threshold pickup

**Tunda waktu disengaja (intentional delay)**:
Jeda waktu (detik) sejak frekuensi berada di bawah ambang hingga tahap benar-benar
trip; timer kembali nol bila frekuensi naik di atas ambang sebelum jeda habis.
_Avoid_: delay, tunda reset

**Fraksi lepas (shed fraction)**:
Persentase dari beban pra-gangguan yang dilepas sebuah tahap saat trip.
_Avoid_: persen lepas

**Beban pra-gangguan (pre-disturbance load)**:
Total beban (MW) sesaat sebelum peristiwa gangguan; satu-satunya dasar perhitungan
MW yang dilepas sebuah tahap.
_Avoid_: base load, beban dasar

**Defisit (net deficit, D)**:
Kelebihan beban atas pembangkitan (MW); bernilai positif saat pembangkitan kurang,
mendorong frekuensi turun.
_Avoid_: kekurangan daya, imbalance

**Pembangkitan (supply)** :
Total MW yang dipasok unit online pada satu saat = output awal + respons governor
(≤ Σ governorMax); pembanding langsung terhadap beban total.
_Avoid_: suplai, supply

**Konstanta inersia (H)**:
Konstanta inersia unit pembangkit (detik); bersama MVA menentukan respons inersia
sistem terhadap defisit.
_Avoid_: inertia

**Droop governor (R)**:
Karakteristik statis governor sebuah unit (pu, mis. 0.05 = 5%); menentukan
tambahan output unit per Hz penurunan frekuensi.
_Avoid_: droop saja, peraturan governor

**Headroom governor**:
Sisa kemampuan output unit: `governorMax − output saat ini` (MW); membatasi respons
governor (saturasi).
_Avoid_: cadangan, reserve

**Kekakuan sistem (β)**:
Respons governor agregat sistem (MW/Hz) terhadap deviasi frekuensi.
_Avoid_: stiffness

**ROCOF (rate of change of frequency)**:
Laju perubahan frekuensi `df/dt` (Hz/s) sesaat; dihitung & ditampilkan, tidak
dipakai sebagai elemen trip pada rilis ini.
_Avoid_: laju frekuensi

**Terkunci (latched)**:
Keadaan tahap UFLS yang sudah trip: tidak dapat bekerja lagi dalam run yang sama,
walau frekuensi turun lagi setelah sempat naik.
_Avoid_: latch, mengunci

**Runtuh / COLLAPSE**:
Hasil solver saat defisit tak tertahankan: tidak ada titik kesetimbangan, frekuensi
terus turun tanpa henti.
_Avoid_: collapse, blackout

**Kondisi sistem**:
Keadaan sistem pada satu saat: **SEIMBANG** (f dalam pita normal 50 ±0,2 Hz),
**DEFISIT** (f turun, governor bekerja menahan), **PELEPASAN BEBAN** (satu atau
lebih tahap UFLS telah bekerja), **PEMULIHAN** (f naik kembali menuju pita normal),
atau **RUNTUH** (tak tertahankan). Ditampilkan dengan warna semantik di kartu kanan.
_Avoid_: blackout, status sistem

**Keadaan sesaat (snapshot)** :
Turunan presentasi terinterpretasi dari satu (param, run, t): frekuensi, status
kondisi, fase kendali (governor→AGC→UFLS), trip ≤ t & MW lepas, beban/pembangkitan,
defisit, headroom, state tiap unit (online / maks gov / TRIP), setpoint AGC
kumulatif. Satu-satunya sumber interpretasi untuk SLD, tag status, dan kartu kanan
(modul `snapshot(p, run, t)`); renderer TIDAK menghitung ulang turunan ini.
_Avoid_: derived state, presentation state

**Fasilitas run (sim)** :
Satu pintu param → run: `sim.run()` (cache + deteksi perubahan via fingerprint
param + clamp playhead saat run menyusut), `sim.restart()` (reset playhead + run
segar). Kelas bug M7/M8 ("run basi") mengerucut di sini — renderer/handler cukup
mengubah param lalu memanggil `render()`, yang selalu melewati `sim.run()`
sehingga run tak pernah basi.
_Avoid_: facade, state manager, store

**Ruang plot (plotSpace)** :
Modul skala & margin SATU-satunya untuk kanvas SVG: tabel margin (atas 12 /
kiri 38 / kanan 14 / bawah 24 & 26), tabel kotak desain (freq 680×250, gauge
74×250, volt 680×190, SLD 700×520), pemetaan `fToY/tToX/voltY`, dan `sizeSvg`
(ukur elemen → dims, guard default saat tersembunyi). Renderer grafik + `fitSld`
HANYA membaca dari sini — jangan tulis ulang angka margin/kotak di tempat lain
(duplikasi = drift renderer↔dokumen↔tes).
_Avoid_: layout constants, magic numbers, plot box

**Diagram satu garis (SLD)** :
Kanvas utama simulator: unit pembangkit → bus → feeder beban dengan pemutus;
menampilkan status & aliran daya secara langsung.
_Avoid_: SLT, single line diagram, diagram skematik

**Interkoneksi / jalur impor**:
Tie ke jaringan luar di SLD berlabel `Impor … MW`; kehilangannya (peristiwa "Lepas
interkoneksi") menciptakan defisit seperti islanding. Bernilai 0 MW = sistem mandiri.
_Avoid_: grid, jaringan luar, tie line

**Unit pembangkit (generator unit)**:
Satu generator sinkron (G1, G2, …) dengan parameter sendiri: MVA, output MW,
inersia H, droop R, kutub, batas governor; status ONLINE / TRIP.
_Avoid_: generator saja, mesin

**Kecepatan sinkron (RPM)**:
Putaran sinkron unit: `N = 120·f / jumlah kutub`; tampilan turunan dari frekuensi,
bukan variabel model tersendiri.
_Avoid_: rpm mentah

**Beban vital**:
Feeder yang tidak pernah dilepas oleh skema UFLS (prioritas tertinggi).
_Avoid_: beban penting, critical load

**Model tegangan ilustratif**:
Perkiraan tegangan bus (pu) yang disederhanakan & berlabel jelas sebagai bukan
hasil aliran daya; dipakai untuk narasi edukasi saja.
_Avoid_: model tegangan, voltage model

**Skenario (scenario)**:
Kasus gangguan terkonfigurasi utuh (seimbang / lepas unit / tambah beban / blok
unit) yang dijalankan dari awal hingga selesai.
_Avoid_: study, kasus uji

**Output unit (daya yang dikeluarkan)**:
MW nyata sebuah unit pada suatu saat = output awal + respons governor (dibatasi
headroom); turun ke nol saat unit TRIP.
_Avoid_: daya yang dikeluarkan, P output
