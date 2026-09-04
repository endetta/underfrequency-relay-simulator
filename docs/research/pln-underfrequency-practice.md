# Riset: praktik operasi underfrequency (PLN & praktik global)

> Status: **ringkasan riset web non-resmi** (2026-09-05). Dokumen resmi PLN
> (Aturan Jaringan / Peraturan Dirjen / Grid Code terbaru) **tidak tersedia daring
> secara resmi** pada saat penulisan, sehingga angka apa pun yang menyangkut
> praktik PLN tetap memakai label ambar `plnVerificationRequired` di UI — sama
> seperti keputusan modul LEVEL 3 U01. Dokumen ini hanya memberi konteks untuk PRD,
> bukan sumber kebenaran.

## Temuan utama

### Frekuensi nominal & pita operasi normal (50 Hz)
- Pita operasi normal khas: **50 Hz ± 0,2 Hz (49,8–50,2 Hz)**. Sumber NESO (Grid
  Code Inggris, 2020) menyebut pita pre-fault 49,8–50,2; laporan operasi Jawa-Bali
  merujuk *Aturan Jaringan Jawa Bali (Grid Code 2007)* dengan grafik frekuensi yang
  bergerak dalam pita ±0,2 Hz yang sama. Konsisten dengan asumsi U01.
- Implikasi: di atas 49,8 Hz sistem dianggap normal; governor/AGC menjaga pita;
  UFLS hanya bekerja di bawah itu.

### Skema UFLS berjenjang (praktik umum)
- Jumlah tahap umum: **4–6 tahap** (sampai ~10 tahap pada beberapa sistem), interval
  ambang **0,2–0,5 Hz**, lepas kumulatif total **30–50%** beban bila perlu.
- Tunda waktu disengaja khas **0,1–0,3 s** (Li 2019, OSTI; "typical time delay is
  0.1–0.3s"); U01 memakai 0,2–0,5 s — sejalan.
- Contoh skema 5 tahap (riset UFLS RoCoF, Whiterose): 49,5 / 49,2 / 49,0 / 48,8 /
  48,6 Hz. Contoh DigSILENT (60 Hz): 4–6 tahap tiap 0,5 Hz, 10% per tahap.
- Contoh khas 50 Hz non-resmi (diskusi teknis): tahap pertama 49,4 Hz, kedua
  48,8 Hz, ketiga 48,2 Hz (interval 0,6 Hz) — variasinya lebar antar-utility.

### Konteks Indonesia (sumber sekunder/akademik)
- Makalah Itenas (elkomika, 2026) tentang evaluasi skema UFR berjenjang menyebut
  tahap pertama **49,5 Hz** dan tahap kedua **49,2 Hz** — pola interval 0,3 Hz
  khas praktik regional. Angka ini akademik/sekunder, bukan Aturan Jaringan resmi.
- Sistem Jawa-Madura-Bali memakai AGC (secondary control); governor = primary
  response. Literatur umum: droop tipikal **3–5%** (beberapa sumber 4–6% untuk
  unit modern); respons primer mulai bekerja setelah frekuensi keluar dari
  *deadband* governor (kecil, orde ±0,03–0,05 Hz) — v1 U01 mengabaikan deadband
  (droop statis), catatan desain ini tetap berlaku.

## Implikasi untuk simulator ini
1. Default tahap U01 (49,50 / 49,00 / 48,50 / 48,00 Hz; 5/10/15/20%; tunda
   0,2–0,5 s) tetap dipakai sebagai **default "praktik tipikal"** — konsisten
   dengan keputusan ADR-0002 dan modul LEVEL 3 — tetapi selalu berlabel ambar
   "perlu verifikasi ke pedoman resmi PLN".
2. Sebagai *opsi presisi*, PRD boleh menawarkan pola interval 0,3 Hz khas regional
   (49,5 → 49,2 → …) dalam studi/prasetel, tetap dengan label yang sama.
3. Narasi edukasi governor (kartu/respon): unit menambah output sesuai droop saat
   f < ~49,8–50,0 (pita operasi), bukan menunggu sampai 49,5 — governor adalah
   garis pertahanan pertama; UFLS adalah garis terakhir.

## Sumber
- IEEE Std C37.117-2007 (halaman standar: standards.ieee.org/ieee/C37.117/2651).
- Li dkk. 2019, *Continuous UFLS scheme*, OSTI purl 1823370 (tunda khas 0,1–0,3 s).
- *UFLS Using Locally Estimated RoCoF*, University of Leeds / Whiterose eprints
  171387 (contoh 5 tahap 49,5…48,6 Hz).
- NERC/TRC, *Approaches for UFLS Programs* (kisaran tahap pertama vs nominal).
- DigSILENT FAQ UFLS (contoh 4–6 tahap, 0,5 Hz, 10%/tahap).
- Elkomika Itenas, *Evaluation of Staged UFLS Strategy* (49,5 → 49,2 Hz, konteks
  Indonesia; sumber akademik sekunder).
- Laporan operasi P2B Gandul beban rendah Idul Fitri 2016 (Scribd; menyitir Grid
  Code Jawa Bali 2007, pita 49,8–50,2 Hz).
- NESO, *Frequency Risk and Control Policy* (2020) — pita pre-fault 49,8–50,2 Hz.
- Catatan teknis governor droop/deadband (ResearchGate/diskusi industri; droop
  3–5%).
