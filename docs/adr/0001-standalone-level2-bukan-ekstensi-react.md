# ADR-0001 — Simulator mandiri LEVEL 2, bukan ekstensi LEVEL 3

Status: accepted (2026-09-05, Round 1 grill)

Library ini sudah memiliki modul Underfrequency (81U) lengkap di
`LEVEL 3 - PROTECTION SYSTEM SIMULATOR` (React, ter-wire di `/simulator/underfrequency`,
spesifikasi U01 v1.0 READY FOR APPROVAL). Namun user memutuskan membangun simulator
underfrequency baru dengan **Differential & Distance LEVEL 2 sebagai referensi utama**
— yaitu artefak edukasi vanilla satu-file HTML (tanpa build, Bahasa Indonesia, pakem
visual splash/krem-collapse/halo) sebagai saudara kandung kedua proyek itu.

Keputusan: buat proyek baru **`LEVEL 2 - UNDERFREQUENCY RELAY SIMULATOR/`** berisi
satu file `underfrequency_relay_simulator.html`, repo git sendiri
(`endetta/underfrequency-relay-simulator`, branch `main`, remote GitHub menyusul
setelah desain disetujui user). Port seam desain (bukan kode model) dari Differential
& Distance; modul LEVEL 3 **tidak disentuh** dan tetap independen. Spesifikasi U01
hanya dipakai sebagai *referensi persamaan / sumber kebenaran*, tidak menyalin kode
engine LEVEL 3.

Pertimbangan alternatif: memperluas LEVEL 3 (ditolak — Differential R10 FROZEN di
situ, gate proses paling ketat, dan user menginginkan artefak edukasi LEVEL 2);
menyalin kode engine LEVEL 3 (ditolak — duplikasi lintas proyek melanggar higiene
"satu perubahan = satu proyek").

Konsekuensi: akan ada **dua implementasi underfrequency** di library secara sengaja;
tidak ada sinkronisasi otomatis antara keduanya. Alasan ini wajib dicatat di
`CLAUDE.md` proyek agar tidak "dirapikan" oleh agen lain.
