/* Tes PLOTSPACE (K3 arsitektur) — satu sumber skala & margin untuk SLD + grafik.
   Modul plotSpace: tabel margin M, tabel kotak desain box, pemetaan fToY/tToX/
   voltY (konsisten dengan M), sizeSvg (ukur el → dims, guard default), dims
   (fallback kotak desain). Literal diambil hitung tangan dari PRD §7: margin
   atas 12, kiri 38 (label Hz), kanan 14 (label tahap), bawah 24 (label waktu) /
   26 (volt); kotak desain freq 680×250, gauge 74×250, volt 680×190, SLD 700×520.
   Jalankan: node tools/plot.test.js */
'use strict';
const path = require('path');
const fs = require('fs');
const HTML = path.join(__dirname, '..', 'underfrequency_relay_simulator.html');
const { loadSimulator } = require('./lens-harness.js');
const src = fs.readFileSync(HTML, 'utf8');

let passed = 0, failed = 0;
function check(name, fn) {
  try { fn(); passed++; console.log('  ok  ' + name); }
  catch (e) { failed++; console.log('FAIL  ' + name + '\n      ' + e.message); }
}
function approx(act, exp, tol, ctx) {
  tol = tol === undefined ? 1e-6 : tol;
  if (!(Math.abs(act - exp) <= tol)) throw new Error(`${ctx}: aktual ${act}, harap ${exp} (±${tol})`);
}
function contains(s, sub, ctx) {
  if (!s.includes(sub)) throw new Error(`${ctx}: harus memuat "${sub}"`);
}

const ctx = loadSimulator(HTML);
const A = ctx.pub;
const PS = A.plotSpace;

console.log('plot.test.js — plotSpace: tabel margin & kotak, pemetaan, sizeSvg (K3)');

/* ── tabel margin & kotak desain (literal PRD §7 — satu sumber kebenaran) ── */
check('M: margin literal 12/38/14/24/26 (atas/kiri/kanan/bawahF/bawahV)', () => {
  approx(PS.M.top, 12, 1e-9, 'top');
  approx(PS.M.left, 38, 1e-9, 'left');
  approx(PS.M.right, 14, 1e-9, 'right');
  approx(PS.M.bottomF, 24, 1e-9, 'bottomF');
  approx(PS.M.bottomV, 26, 1e-9, 'bottomV');
});
check('box: kotak desain freq 680×250, gauge 74×250, volt 680×190, sld 700×520', () => {
  if (PS.box.freq.w !== 680 || PS.box.freq.h !== 250) throw new Error('box.freq 680×250');
  if (PS.box.gauge.w !== 74 || PS.box.gauge.h !== 250) throw new Error('box.gauge 74×250');
  if (PS.box.volt.w !== 680 || PS.box.volt.h !== 190) throw new Error('box.volt 680×190');
  if (PS.box.sld.w !== 700 || PS.box.sld.h !== 520) throw new Error('box.sld 700×520');
});

/* ── pemetaan konsisten dengan M (kotak desain = literal lama suite charts) ── */
check('fToY: y(52)=top=12, y(47)=H−bottomF=226 @250; M10 @340: y(50)=133.6, y(47)=316', () => {
  approx(PS.fToY(52, 250), 12, 1e-6, 'y52@250');
  approx(PS.fToY(47, 250), 226, 1e-6, 'y47@250');    // 250 − 24
  approx(PS.fToY(50, 340), 133.6, 1e-6, 'y50@340');  // 12 + 2/5·304
  approx(PS.fToY(47, 340), 316, 1e-6, 'y47@340');    // 12 + 304
});
check('tToX: x(0)=left=38, x(30)=W−right=666 @680; M10 @560: x(30)=546', () => {
  approx(PS.tToX(0, 680), 38, 1e-6, 'x0@680');
  approx(PS.tToX(30, 680), 666, 1e-6, 'x30@680');    // 680 − 14
  approx(PS.tToX(30, 560), 546, 1e-6, 'x30@560');    // 38 + 508
});
check('voltY: y(1.05)=top=12, y(0.85)=H−bottomV=224 @250 (label 0.85–1.05)', () => {
  approx(PS.voltY(1.05, 250), 12, 1e-6, 'v1.05@250');
  approx(PS.voltY(0.85, 250), 224, 1e-6, 'v0.85@250'); // 250 − 26
});

/* ── delegasi API lama: fToY/tToX tetap identik dengan plotSpace (parity) ── */
check('parity: A.fToY/A.tToX ≡ plotSpace (default kotak desain, tanpa dims)', () => {
  approx(A.fToY(52), PS.fToY(52), 1e-9, 'fToY52');
  approx(A.fToY(50), PS.fToY(50), 1e-9, 'fToY50');
  approx(A.tToX(15), PS.tToX(15), 1e-9, 'tToX15');
  approx(A.tToX(30), PS.tToX(30), 1e-9, 'tToX30');
});

/* ── sizeSvg: ukur el → dims bulat; guard default saat tersembunyi/stub ── */
check('sizeSvg: ukur clientWidth/Height nyata (dibulatkan)', () => {
  const b = PS.sizeSvg({ clientWidth: 801.4, clientHeight: 339.6 }, 680, 250);
  if (b.w !== 801 || b.h !== 340) throw new Error(`ukur nyata: ${b.w}×${b.h}, harap 801×340`);
});
check('sizeSvg: guard default (dw/dh) saat tersembunyi/stub (w,h ≤ 40)', () => {
  const b = PS.sizeSvg({ clientWidth: 0, clientHeight: 0 }, 680, 250);
  if (b.w !== 680 || b.h !== 250) throw new Error(`stub 0: ${b.w}×${b.h}`);
  const b2 = PS.sizeSvg({ clientWidth: 30, clientHeight: 20 }, 74, 250);
  if (b2.w !== 74 || b2.h !== 250) throw new Error(`stub kecil: ${b2.w}×${b2.h}`);
});
check('dims: fallback kotak desain bila dims kosong', () => {
  const d = PS.dims({}, 680, 250);
  if (d.w !== 680 || d.h !== 250) throw new Error(`dims kosong: ${d.w}×${d.h}`);
  const d2 = PS.dims({ w: 900, h: 400 }, 680, 250);
  if (d2.w !== 900 || d2.h !== 400) throw new Error(`dims isi: ${d2.w}×${d2.h}`);
});

/* ── rewiring (sumber kebenaran satu): renderer & fitSld baca plotSpace ── */
check('rewire: renderer grafik memakai plotSpace.box (freq/gauge/volt)', () => {
  contains(src, 'plotSpace.box.freq', 'freq baca box');
  contains(src, 'plotSpace.box.gauge', 'gauge baca box');
  contains(src, 'plotSpace.box.volt', 'volt baca box');
});
check('rewire: fitSld baca plotSpace.box.sld & sizeSvg; API mengekspor plotSpace', () => {
  contains(src, 'plotSpace.box.sld', 'sld baca box');
  contains(src, 'plotSpace.sizeSvg', 'fitSld/gambar pakai sizeSvg');
  contains(src, 'plotSpace: plotSpace', 'ekspor API');
});

console.log(`\n${passed} lulus, ${failed} gagal`);
process.exit(failed ? 1 : 0);