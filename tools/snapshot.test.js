/* Tes SNAPSHOT keadaan sesaat — modul presentasi bersama lintas-permukaan
   (SLD, tag #sldTag, kartu kanan): satu-satunya sumber interpretasi
   (param, run, t) → {f, status, phase, trips, shedTotal, loadNow, impNow,
   deficit, agcDisp, gov, gen[]}. Nilai literal = domain (PRD §3/§5 + konvensi
   status/fase) — bukan hasil hitung ulang duplikat.
   Jalankan: node tools/snapshot.test.js */
'use strict';
const path = require('path');
const HTML = path.join(__dirname, '..', 'underfrequency_relay_simulator.html');
const { loadSimulator } = require('./lens-harness.js');

let passed = 0, failed = 0;
function check(name, fn) {
  try { fn(); passed++; console.log('  ok  ' + name); }
  catch (e) { failed++; console.log('FAIL  ' + name + '\n      ' + e.message); }
}
function approx(act, exp, tol, ctx) {
  tol = tol === undefined ? 1e-6 : tol;
  if (!(Math.abs(act - exp) <= tol)) throw new Error(`${ctx}: aktual ${act}, harap ${exp} (±${tol})`);
}

const ctx = loadSimulator(HTML);
const A = ctx.pub;

function scenP(kind, extra, over) {
  const p = A.paramP();
  p.scenario = Object.assign({ kind: kind }, extra || {});
  if (over) Object.assign(p, over);
  return p;
}
function runOf(p) { return A.ufTimeline(JSON.parse(JSON.stringify(p))); }
function byId(gen, id) { for (let i = 0; i < gen.length; i++) if (gen[i].id === id) return gen[i]; throw new Error('unit ' + id + ' hilang'); }

console.log('snapshot.test.js — keadaan sesaat (p, run, t) → satu objek presentasi');

/* ── Seimbang (tanpa peristiwa) ── */
check('snapshot seimbang t=0: f 50, SEIMBANG, phase idle, trips 0, shed 0, load 1100, deficit 0', () => {
  const p = scenP('none');
  const run = runOf(p);
  const s = A.snapshot(p, run, 0);
  approx(s.f, 50, 1e-6, 'f');
  if (s.status !== 'SEIMBANG') throw new Error('status harus SEIMBANG, dapat ' + s.status);
  if (s.phase !== 'idle') throw new Error('phase harus idle, dapat ' + s.phase);
  if (s.collapse) throw new Error('collapse harus false');
  if (s.trips.length !== 0 || s.shedTotal !== 0) throw new Error('tanpa trip harus shed 0');
  approx(s.loadNow, 1100, 1e-6, 'loadNow');
  approx(s.impNow, 0, 1e-6, 'impNow');
  approx(s.deficit, 0, 1e-6, 'deficit');
  approx(s.gov.sup, 1100, 1e-6, 'gov.sup (G1+G2+G3)');
  if (s.gen.length !== 3) throw new Error('gen harus 3 baris, dapat ' + s.gen.length);
  if (s.gen.some(g => g.off || g.sat)) throw new Error('semua unit online & tak jenuh');
  approx(byId(s.gen, 'G1').mwFinal, 500, 1e-6, 'G1 mwFinal');
  approx(byId(s.gen, 'G3').mwFinal, 250, 1e-6, 'G3 mwFinal');
});

/* ── Lepas G1: unit off & output 0; UFLS T1 (55 MW) sudah trip → loadNow 1045 ── */
check('snapshot lepas G1 t=1,5: G1 off mwFinal 0, G2/G3 online, shed 55, loadNow 1045', () => {
  const p = scenP('genLoss', { target: 'G1' });
  const run = runOf(p);
  const s = A.snapshot(p, run, 1.5);
  if (!byId(s.gen, 'G1').off) throw new Error('G1 harus off');
  if (byId(s.gen, 'G2').off || byId(s.gen, 'G3').off) throw new Error('G2/G3 harus online');
  if (!(s.deficit > 0)) throw new Error('deficit harus positif, dapat ' + s.deficit);
  if (s.trips.length !== 1) throw new Error('t=1,5 harus tepat 1 trip (T1), dapat ' + s.trips.length);
  approx(s.shedTotal, 55, 1e-6, 'shedTotal T1');
  approx(s.loadNow, 1045, 1e-6, 'loadNow 1100−55');
  approx(byId(s.gen, 'G1').mwFinal, 0, 1e-6, 'G1 mwFinal (trip)');
  if (s.status === 'SEIMBANG') throw new Error('tak mungkin SEIMBANG saat G1 lepas');
});

/* ── +Beban 150: dalam reserve → governor saja menahan; belum ada AGC/UFLS ── */
check('snapshot +Beban 150 t=1,5: fase governor, trips 0, deficit > 0 (masih pita normal)', () => {
  const p = scenP('loadStep', { mw: 150 });
  const run = runOf(p);
  const s = A.snapshot(p, run, 1.5);
  if (s.trips.length || s.shedTotal !== 0) throw new Error('150 MW harus tertahan governor, tanpa UFLS');
  if (s.phase !== 'governor') throw new Error('fase harus governor, dapat ' + s.phase);
  if (!(s.deficit > 0)) throw new Error('deficit harus positif, dapat ' + s.deficit);
  if (s.status !== 'SEIMBANG') throw new Error('f turun tipis → masih SEIMBANG, dapat ' + s.status);
});

/* ── +Beban 150 (skenario M7): UFLS tidak bekerja; AGC memulihkan → phase agc ── */
check('snapshot +Beban 150 t=40: agcDisp 150, fase agc, status SEIMBANG', () => {
  const p = scenP('loadStep', { mw: 150 });
  const run = runOf(p);
  const s = A.snapshot(p, run, 40);
  if (s.trips.length !== 0) throw new Error('150 MW harus pulih tanpa UFLS');
  approx(s.agcDisp, 150, 1e-6, 'agcDisp (150 MW dipulihkan AGC)');
  if (s.phase !== 'agc') throw new Error('fase harus agc (kendali sekunder), dapat ' + s.phase);
  if (s.status !== 'SEIMBANG') throw new Error('status harus SEIMBANG setelah pemulihan, dapat ' + s.status);
  approx(s.loadNow, 1250, 1e-6, 'loadNow 1100+150');
});

/* ── RUNTUH (+beban besar): semua unit jenuh (sat) & mwFinal = govMax; 4 trip; shed 550 ── */
check('snapshot runtuh t=25: status RUNTUH, semua gen sat & mwFinal=govMax, trips 4, shed 550, fase ufls', () => {
  const p = scenP('collapse', { mw: 1000 });
  const run = runOf(p);
  const s = A.snapshot(p, run, 25);
  if (s.status !== 'RUNTUH') throw new Error('status harus RUNTUH, dapat ' + s.status);
  if (!s.collapse) throw new Error('collapse harus true');
  if (s.trips.length !== 4) throw new Error('4 tahap harus trip, dapat ' + s.trips.length);
  approx(s.shedTotal, 550, 1e-6, 'shedTotal 550 (T1–T4)');
  if (s.phase !== 'ufls') throw new Error('fase harus ufls, dapat ' + s.phase);
  s.gen.forEach(g => {
    if (!g.sat) throw new Error(g.id + ' harus jenuh (sat) saat runtuh');
  });
  const gm = { G1: 640, G2: 430, G3: 320 };
  s.gen.forEach(g => approx(g.mwFinal, gm[g.id], 1e-6, g.id + ' mwFinal harus govMax ' + gm[g.id]));
});

/* ── Konsistensi impor: preset berimpor 400; saat LEPAS impNow 0 & impLost true ── */
check('snapshot impor: 400 MW mengalir; setelah importLoss impNow 0, impLost true, load 1100', () => {
  const p = scenP('none', null, { importMw: 400, loadMw: 1500 });
  const run = runOf(p);
  const s0 = A.snapshot(p, run, 0.5);
  approx(s0.impNow, 400, 1e-6, 'impNow sebelum');
  if (s0.impLost) throw new Error('impLost harus false sebelum peristiwa');
  const pl = scenP('importLoss', null, { importMw: 400, loadMw: 1500 });
  const rl = runOf(pl);
  const sl = A.snapshot(pl, rl, 1.2);
  if (!sl.impLost) throw new Error('impLost harus true setelah peristiwa');
  approx(sl.impNow, 0, 1e-6, 'impNow setelah lepas');
  if (!(sl.deficit > 0)) throw new Error('deficit harus positif setelah impor lepas');
});

/* ── loadNow: delta skenario tampil sejak t=0 (parity perilaku UI lama); rocof0 dari event ── */
check('snapshot loadStep: loadNow 1250 (1100+150) sepanjang t; rocof0 < 0; headroom ≥ 0', () => {
  const p = scenP('loadStep', { mw: 150 });
  const run = runOf(p);
  approx(A.snapshot(p, run, 0.5).loadNow, 1250, 1e-6, 'loadNow t=0.5 (delta tampil sejak awal, sbgmn UI lama)');
  approx(A.snapshot(p, run, 1.05).loadNow, 1250, 1e-6, 'loadNow t=1.05');
  const s = A.snapshot(p, run, 1.05);
  if (!(s.rocof0 < 0)) throw new Error('rocof0 harus negatif (defisit), dapat ' + s.rocof0);
  if (!(s.gov.head >= 0)) throw new Error('headroom harus ≥ 0, dapat ' + s.gov.head);
});

/* ── Konsisten lintas-permukaan: konten tag #sldTag & renderSld memakai snapshot (status sama) ── */
check('snapshot dipakai konsumen: status di tag & renderSld tidak menghitung ulang sendiri', () => {
  // renderSld & tag memakai snapshot → asersi string lama di suite sld/ui tetap valid;
  // di sini cukup membuktikan status numerik snapshot selaras dgn pill ufStatus langsung.
  const p = scenP('genLoss', { target: 'G2' });
  const run = runOf(p);
  const s = A.snapshot(p, run, 6);
  const direct = A.ufStatus(s.f, { trips: s.trips.length, collapse: s.collapse });
  if (direct !== s.status) throw new Error('snapshot.status harus = ufStatus langsung: ' + s.status + ' vs ' + direct);
});

console.log(`\n${passed} lulus, ${failed} gagal`);
process.exit(failed ? 1 : 0);
