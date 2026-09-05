# Sesi YYYY-MM-DD-NN — <judul singkat pekerjaan>

> Aturan root "Log sesi wajib" (CLAUDE.md poin 8). Salin file ini ke
> `design-plans/sesi-YYYY-MM-DD-NN-<judul>.md` (NN = nomor urut sesi hari itu, mulai 01).

- **Mulai:** <jam> · **Commit sebelum:** <sha> · **Repo/branch:** <nama> @ <branch>
- **Mandat user:** <1–3 kalimat — APA yang diminta, bukan caranya>
- **Dikerjakan & hasil:** <poin kegiatan → hasil ringkas + BUKTI: tes hijau X/Y, angka shoot
  bodyScroll/sldScale, verifikasi CDP, dst.>
- **Dokumen tersinkron:** <plan-*.md → status, PRD §, CLAUDE.md, dst. — sebut yang diubah>
- **Status:** SELESAI | BELUM — <sisa + alasan> | TERTUNDA
- **Langkah berikutnya (untuk sesi/AI baru):** <mulai dari mana (file/commit), kerjakan apa,
  gate/DoD apa yang menutup pekerjaan>

---

### Contoh isi (ringkas, bukan template panjang)

```
- Mulai: 09:10 · Commit sebelum: 687d418 · Repo: endetta/underfrequency-relay-simulator @ main
- Mandat: rombak layout desktop (satu layar, splash auto, switch SLD/Grafik) + revisi gauge.
- Dikerjakan & hasil: tes merah dulu (10 gagal) → splash auto (terhapus t≈1,8 s, probe CDP) →
  kunci layar (bodyScroll=0) → SLD 700×520 + font ≥10 → gauge stop 0/36/38/44/62/100.
  92 asersi hijau; shoot 8 view bersih (sldScale 1,11, consoleErrors=0).
- Dokumen tersinkron: plan-02 → DIEKSEKUSI/SELESAI · CLAUDE.md (status M5) · log ini.
- Status: SELESAI.
- Langkah berikutnya: — (semua tuntas; lihat log berikutnya).
```
