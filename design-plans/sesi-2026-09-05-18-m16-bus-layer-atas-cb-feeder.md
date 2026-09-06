# Sesi 2026-09-05-18 — M16: busbar layer atas, CB 14×14 menjauh dari bus, label feeder lebih besar (TDD)

- **Mulai:** 22:35 · **Commit sebelum:** `9256b76` (perbaikan white screen) · **Repo/branch:** endetta/underfrequency-relay-simulator @ main
- **Mandat user (TDD):** tiga permintaan SLD — (1) garis bus/bar hitam di layer paling atas,
  tidak ditindih garis hijau/biru/teal; (2) CB lebih besar dan menjauh dari busbar, jangan
  menempel; (3) teks keterangan feeder (mis. "T2 55 MW") lebih besar — bukan hanya kotaknya.
- **Dikerjakan & hasil (merah → hijau per irisan, seam `renderSld` di tools/sld.test.js):**
  - **M16-A (layer bus):** merah — asersi posisi `class="bus"` HARUS setelah garis impor,
    feeder T1 (hijau), dan vital (teal) dalam string SVG → gagal (bus digambar pertama).
    Hijau — push bus dipindah ke akhir `renderSld` (sebelum label Beban), komposisi tak berubah.
  - **M16-B (CB 14×14 + gap):** merah — CB feeder `y=270 w=14 h=14` center di x feeder
    (gap 6,5 px dari tepi bawah bus 263,5); CB impor **pindah ke ATAS bus** `y=236`
    (gap 6,5 simetris dari tepi atas bus 256,5), garis impor `y2=236` (sentuh-simpul),
    rotate center `115,243`, TERBUKA naik ke `y=230`. → 5 merah (3 baru + 2 literal lama).
    Hijau — dua push `.brk` + garis impor diperbarui; literal M8 (12×12) & M12-B (y2=254)
    di sld.test diperbarui/digantikan (spesifikasinya kini dijekspresikan oleh cek M16-B).
  - **M16-C (font feeder):** merah — id feeder font **13** (y=426), MW font **12** (y=446);
    hijau — dua push `<text>` feeder diperbarui (dari 11/10,5 @ 422/440).
  - **Bukti:** sld.test 31→**34** asersi hijau; total **170 asersi** (model 33, timeline 21,
    sld 34, charts 21, ui 34, snapshot 8, sim 6, plot 13); `shoot.js` bersih — desktop
    sldScale 1,11 / font efektif 11,11 (identik dengan M15), bodyScroll=0, overflow none,
    consoleErrors=0, playcheck PASS. Grep bekas koordinat lama (y2=254, y=268, 12×12,
    rotate 115 260) = nihil.
- **Dokumen tersinkron:** implementation-plan §5 · overview.md (CB 14×14, hitungan 34/170) ·
  README (CB 14×14, 170) · CLAUDE.md (bullet M16) · log ini.
- **Status:** SELESAI.
- **Langkah berikutnya (untuk sesi/AI baru):** commit + push; bila user kurang puas ukuran/
  jarak, geser konstanta di satu tempat (push `.brk`) lalu sesuaikan asersi M16-B.
