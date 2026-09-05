/* Tes SIM — fasilitas run (K2 arsitektur): satu pintu (param → run) di belakang
   modul `sim`. Invarian yang diuji = kelas bug M7/M8 (run basi, playhead lewat
   ujung saat run menyusut): cache referensi, deteksi mutasi otomatis via
   fingerprint param, clamp tNow > tMax, coupling loadStep, freshness render.
   Jalankan: node tools/sim.test.js */
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

function resetToDefaults() {
  A.S.ui.playing = false; A.S.ui.tNow = 0; A.S.ui.loadStepMw = 200;
  A.S.param.presetId = 'mandiri';
  A.S.param.gens = JSON.parse(JSON.stringify(A.DEFAULT_GENS));
  A.S.param.stages = JSON.parse(JSON.stringify(A.DEFAULT_STAGES));
  A.S.param.loadMw = 1100; A.S.param.importMw = 0;
  A.S.param.scenario = { kind: 'none' };
  A.S.param.agcOn = true; A.S.param.agcRate = 40; A.S.param.agcInterval = 2;
  A.sim.run();
}

console.log('sim.test.js — fasilitas run: cache, anti-stale, clamp (K2)');

/* ── cache & mirror ── */
check('sim cache: dua panggilan tanpa perubahan param → run yang SAMA (referensi); S.run tersinkron', () => {
  resetToDefaults();
  const r1 = A.sim.run();
  const r2 = A.sim.run();
  if (r1 !== r2) throw new Error('run harus di-cache (referensi sama) saat param tak berubah');
  if (A.S.run !== r1) throw new Error('S.run harus mirror hasil sim.run');
});

/* ── deteksi mutasi otomatis (anti-stale) ── */
check('sim anti-stale: mutasi param (impor 400 / beban 1500) terdeteksi → run BARU', () => {
  resetToDefaults();
  const r0 = A.sim.run();
  A.S.param.importMw = 400; A.S.param.loadMw = 1500; // preset berimpor, setimbang
  const r1 = A.sim.run();
  if (r1 === r0) throw new Error('run harus dihitung ulang setelah param berubah');
  if (A.S.run !== r1) throw new Error('S.run harus mirror run baru');
  if (r1.status !== 'SEIMBANG') throw new Error('sistem 1100+400 harus seimbang, dapat ' + r1.status);
  resetToDefaults();
});

/* ── clamp playhead (M8: run menyusut → tNow lewat ujung) ── */
check('sim clamp: tNow > tMax saat recompute → di-reset ke 0', () => {
  resetToDefaults();
  A.S.ui.tNow = 31; // > tMax 30
  A.S.param.scenario = { kind: 'loadStep', mw: 600 };
  A.sim.run();
  if (A.S.ui.tNow !== 0) throw new Error('tNow harus di-clamp ke 0, dapat ' + A.S.ui.tNow);
  resetToDefaults();
});

/* ── coupling loadStep: skenario + beban [MW] → run mencerminkan (AGC 150, pulih) ── */
check('sim coupling loadStep: scenario {loadStep,150} → agcDispatch 150 & status SEIMBANG', () => {
  resetToDefaults();
  A.S.param.scenario = { kind: 'loadStep', mw: 150 };
  const r = A.sim.run();
  approx(r.agcDispatch, 150, 1e-6, 'agcDispatch');
  if (r.status !== 'SEIMBANG') throw new Error('150 MW harus pulih SEIMBANG, dapat ' + r.status);
  resetToDefaults();
});

/* ── freshness render: mutasi param lalu render() (tanpa computeRun) → run segar ── */
check('sim freshness: render() memanggil sim.run di depan — run tidak basi setelah mutasi', () => {
  resetToDefaults();
  const r0 = A.sim.run();
  A.S.param.scenario = { kind: 'genLoss', target: 'G1' };
  A.render(); // jalur UI normal tanpa computeRun manual
  if (A.S.run === r0) throw new Error('render() harus menghasilkan run segar (param berubah)');
  if (!A.S.run.tripSeq || A.S.run.tripSeq.length === 0) throw new Error('run lepas G1 harus punya urutan trip');
  resetToDefaults();
});

/* ── computeRun delegasi & restart ── */
check('sim API: computeRun() delegasi ke sim (S.run sinkron) & sim.restart() reset play/t', () => {
  resetToDefaults();
  const r1 = A.computeRun();
  if (A.S.run !== r1) throw new Error('computeRun harus sinkron dgn sim.run');
  A.S.ui.playing = true; A.S.ui.tNow = 12;
  A.S.param.importMw = 400; A.S.param.loadMw = 1500;
  const r2 = A.sim.restart();
  if (A.S.ui.playing) throw new Error('restart harus stop play');
  if (A.S.ui.tNow !== 0) throw new Error('restart harus t=0');
  if (A.S.run !== r2) throw new Error('restart harus run segar ter-mirror');
  resetToDefaults();
});

console.log(`\n${passed} lulus, ${failed} gagal`);
process.exit(failed ? 1 : 0);
