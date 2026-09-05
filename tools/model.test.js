/* Tes MODEL murni (PRD §5) — nilai literal hasil hitung tangan / contoh U01 §12.
   Jalankan: node tools/model.test.js
   Harness: tools/lens-harness.js (stub DOM → jalankan <script> → ekspor __pub). */
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
  tol = tol === undefined ? 1e-9 : tol;
  if (!(Math.abs(act - exp) <= tol)) throw new Error(`${ctx}: aktual ${act}, harap ${exp} (±${tol})`);
}

const ctx = loadSimulator(HTML);
const A = ctx.pub;
const { ufAggregates, initialRocof, satDevOf, respAt, ufGovernorAt, solveSteadyState,
        ufValidate, ufStatus, ufEvaluateStatic, ufFeederMw } = A;

/* Param default PRD §3: G1 700 MVA/5.0 s/5%, G2 450/4.0/4%, G3 330/4.5/5%;
   beban 1100; tahap 49.50/49.00/48.50/48.00 @ 5/10/15/20%. */
const G = JSON.parse(JSON.stringify(A.DEFAULT_GENS));
const ST = JSON.parse(JSON.stringify(A.DEFAULT_STAGES));
function P(over) {
  return Object.assign({
    fNom: 50, tMax: 40, tEvent: 1.0,
    gens: JSON.parse(JSON.stringify(G)), loadMw: 1100, importMw: 0,
    stages: JSON.parse(JSON.stringify(ST)),
  }, over || {});
}

console.log('model.test.js — literals model (PRD §5 / U01 §12)');

/* ── §5.2 agregat (set online) ── */
check('agregat default: S_base 1480, H_sys 4.58446, P_gen0 1100, β 31850, reserve 290', () => {
  const a = ufAggregates(G);
  approx(a.sBase, 1480, 1e-9, 'S_base');
  approx(a.hSys, 6785 / 1480, 1e-9, 'H_sys');            // (3500+1800+1485)/1480
  approx(a.pGen0, 1100, 1e-9, 'P_gen0');
  approx(a.betaPu, 31850, 1e-9, 'β');                    // 14000+11250+6600
  approx(a.reserve, 290, 1e-9, 'reserve');               // 140+80+70
});
check('U01 §12.1: H_sys 4-unit = 7625/1760 = 4.3324 s', () => {
  const four = [
    { mva: 700, h: 5.0 }, { mva: 450, h: 4.0 }, { mva: 330, h: 4.5 }, { mva: 280, h: 3.0 },
  ].map(g => Object.assign({ online: true }, g));
  const a = ufAggregates(four);
  approx(a.sBase, 1760, 1e-9, 'S_base');
  approx(a.hSys, 7625 / 1760, 1e-9, 'H_sys');
});
check('agregat: unit offline tidak ikut (G1 off → S 780, P_gen0 600)', () => {
  const gens = JSON.parse(JSON.stringify(G)); gens[0].online = false;
  const a = ufAggregates(gens);
  approx(a.sBase, 780, 1e-9, 'S_base');
  approx(a.pGen0, 600, 1e-9, 'P_gen0');
  approx(a.betaPu, 17850, 1e-9, 'β');                    // 11250+6600
});

/* ── §5.5 ROCOF awal ── */
check('ROCOF default D0=400 → ≈ −1,47 Hz/s (literal rencana)', () => {
  approx(initialRocof(G, 400), -1.473846, 1e-3, 'rocof'); // −(50/2H)(400/S), H=4.58446, S=1480
});
check('U01 §12.2: ROCOF 4-unit D0=500 → −1.6393 Hz/s', () => {
  const four = [
    { mva: 700, h: 5.0 }, { mva: 450, h: 4.0 }, { mva: 330, h: 4.5 }, { mva: 280, h: 3.0 },
  ].map(g => Object.assign({ online: true }, g));
  approx(initialRocof(four, 500), -1.639336, 1e-4, 'rocof'); // −(50/(2·4.332386))·(500/1760)
});
check('ROCOF: defisit nol → 0; D0 negatif (surplus) → positif', () => {
  approx(initialRocof(G, 0), 0, 1e-12, 'rocof 0');
  if (!(initialRocof(G, -100) > 0)) throw new Error('surplus harus rocof positif');
});

/* ── §5.4 droop & saturasi ── */
check('satDevOf: G1 −0.5, G2 −0.35556, G3 −0.53030 (Δf_i,sat = −f_nom·headroom·R/MVA)', () => {
  approx(satDevOf(G[0]), -0.5, 1e-9, 'G1');              // −50·140·0.05/700
  approx(satDevOf(G[1]), -160 / 450, 1e-9, 'G2');        // −50·80·0.04/450
  approx(satDevOf(G[2]), -175 / 330, 1e-9, 'G3');        // −50·70·0.05/330
});
check('satDevOf: tanpa headroom (p0=govMax) → jenuh sejak Δf=0', () => {
  approx(satDevOf(Object.assign({}, G[0], { govMax: G[0].p0 })), 0, 1e-12, 'sat 0');
});
check('respAt @49.9 Hz (Δf=−0.1): G1 28, G2 22.5, G3 13.2 MW', () => {
  approx(respAt(G[0], 49.9), 28, 1e-9, 'G1');            // 0.002·14000
  approx(respAt(G[1], 49.9), 22.5, 1e-9, 'G2');          // 0.002·11250
  approx(respAt(G[2], 49.9), 13.2, 1e-9, 'G3');          // 0.002·6600
});
check('respAt dijepit headroom: G1 @47 Hz → 140 MW (bukan 840)', () => {
  approx(respAt(G[0], 47), 140, 1e-9, 'clamp headroom');
});
check('respAt @f>50 → 0 (governor tidak menambah saat overfrekuensi)', () => {
  approx(respAt(G[0], 50.5), 0, 1e-12, 'resp nol');
});
check('ufGovernorAt @49.9: sup 1163.7, gov 63.7, head 226.3', () => {
  const r = ufGovernorAt(G, 49.9);
  approx(r.gov, 63.7, 1e-9, 'gov');                      // 28+22.5+13.2
  approx(r.sup, 1163.7, 1e-9, 'sup');                    // 1100+63.7
  approx(r.head, 226.3, 1e-9, 'head');                   // 290−63.7
  approx(r.resp.G1, 28, 1e-9, 'resp G1');
});

/* ── §5.6 solver keadaan mantap (piecewise saturasi) ── */
check('D=100 → SETTLED f=49.843014 (tanpa saturasi, β=31850)', () => {
  const r = solveSteadyState(G, 100);
  if (r.status !== 'SETTLED') throw new Error('harus SETTLED, dapat ' + r.status);
  approx(r.fSs, 50 - 5000 / 31850, 1e-9, 'f_ss');
  approx(r.betaEff, 31850, 1e-9, 'β_eff');
});
check('D=200 → SETTLED f=49.686028', () => {
  const r = solveSteadyState(G, 200);
  approx(r.fSs, 50 - 10000 / 31850, 1e-9, 'f_ss');
});
check('D=290 = total headroom → SETTLED f=49.469697, β_eff 6600 (hanya G3)', () => {
  const r = solveSteadyState(G, 290);
  if (r.status !== 'SETTLED') throw new Error('harus SETTLED, dapat ' + r.status);
  approx(r.fSs, 50 - 175 / 330, 1e-9, 'f_ss');           // −50·70/6600 = sat G3
  approx(r.betaEff, 6600, 1e-9, 'β_eff');
  approx(r.saturatedHr, 220, 1e-9, 'headroom jenuh (G2+G1)');
});
check('D=291 (1 MW di atas headroom) → COLLAPSE (bukan exception)', () => {
  const r = solveSteadyState(G, 291);
  if (r.status !== 'COLLAPSE') throw new Error('harus COLLAPSE, dapat ' + JSON.stringify(r));
  if (r.fSs !== null) throw new Error('f_ss harus null');
});
check('D=400 (defisit > reserve 290) → COLLAPSE', () => {
  const r = solveSteadyState(G, 400);
  if (r.status !== 'COLLAPSE') throw new Error('harus COLLAPSE, dapat ' + r.status);
});
check('U01 §12.3: 4-unit D=100 → f_ss 49.863 (β 36516.67)', () => {
  const four = [
    { mva: 700, h: 5.0, r: 0.05 }, { mva: 450, h: 4.0, r: 0.04 },
    { mva: 330, h: 4.5, r: 0.05 }, { mva: 280, h: 3.0, r: 0.06 },
  ].map(g => Object.assign({ online: true, govMax: g.mva, p0: g.mva * 0.8 }, g));
  const r = solveSteadyState(four, 100);
  approx(r.fSs, 49.863077, 1e-3, 'f_ss');                // 50 − 5000/36516.67
});

/* ── §5.3 feeder = fraksi × beban dasar (kejujuran MW nyata) ── */
check('ufFeederMw 1100 MW: T1 55, T2 110, T3 165, T4 220', () => {
  const m = ufFeederMw(ST, 1100);
  if (m.T1 !== 55 || m.T2 !== 110 || m.T3 !== 165 || m.T4 !== 220) {
    throw new Error('feeder salah: ' + JSON.stringify(m));
  }
});
check('ufFeederMw mengikuti beban dasar: 1500 MW → T1 75, T2 150', () => {
  const m = ufFeederMw(ST, 1500);
  if (m.T1 !== 75 || m.T2 !== 150) throw new Error('feeder salah: ' + JSON.stringify(m));
});

/* ── §5.9 status sistem (band normal ±0.2) ── */
check('status: 50.0 → SEIMBANG; 49.9 → SEIMBANG (dlm band); 49.8 → SEIMBANG (tepat batas)', () => {
  if (ufStatus(50, {}) !== 'SEIMBANG') throw new Error('50 harus SEIMBANG');
  if (ufStatus(49.9, {}) !== 'SEIMBANG') throw new Error('49.9 harus SEIMBANG');
  if (ufStatus(49.8, {}) !== 'SEIMBANG') throw new Error('49.8 tepat batas harus SEIMBANG (strict)');
});
check('status: 49.799 → DEFISIT; dgn trip → PELEPASAN BEBAN', () => {
  if (ufStatus(49.799, {}) !== 'DEFISIT') throw new Error('49.799 harus DEFISIT');
  if (ufStatus(49.799, { trips: 2 }) !== 'PELEPASAN BEBAN') throw new Error('dg trip harus PELEPASAN BEBAN');
});
check('status: trip ada & f kembali ≥ band → PEMULIHAN; collapse → RUNTUH', () => {
  if (ufStatus(49.9, { trips: 1 }) !== 'PEMULIHAN') throw new Error('harus PEMULIHAN');
  if (ufStatus(49.5, { collapse: true }) !== 'RUNTUH') throw new Error('harus RUNTUH');
  if (ufStatus(50, { collapse: true }) !== 'RUNTUH') throw new Error('collapse menang atas apa pun');
});

/* ── §5.7 validasi ── */
check('validasi param default → bersih', () => {
  const issues = ufValidate(P());
  if (issues.length) throw new Error('tak boleh ada issue: ' + JSON.stringify(issues));
});
check('U01 §12.6: urutan tahap naik → INVALID_UFLS_ORDER', () => {
  const p = P(); p.stages[1].thr = 49.6; // naik dari 49.5
  const issues = ufValidate(p);
  if (!issues.some(i => i.code === 'INVALID_UFLS_ORDER')) {
    throw new Error('harus INVALID_UFLS_ORDER: ' + JSON.stringify(issues));
  }
});
check('U01 §12.7: H/R/MVA/kutub/fNom ≤ 0 & beban negatif → INVALID_PARAM (tanpa exception)', () => {
  const bad = (mut) => { const p = P(); mut(p); return ufValidate(p); };
  if (!bad(p => p.gens[0].h = 0).some(i => i.code === 'INVALID_PARAM')) throw new Error('H=0 harus INVALID');
  if (!bad(p => p.gens[0].r = 0).some(i => i.code === 'INVALID_PARAM')) throw new Error('R=0 harus INVALID');
  if (!bad(p => p.gens[0].mva = 0).some(i => i.code === 'INVALID_PARAM')) throw new Error('MVA=0 harus INVALID');
  if (!bad(p => p.gens[0].poles = 0).some(i => i.code === 'INVALID_PARAM')) throw new Error('kutub=0 harus INVALID');
  if (!bad(p => p.fNom = 0).some(i => i.code === 'INVALID_PARAM')) throw new Error('fNom=0 harus INVALID');
  if (!bad(p => p.loadMw = -1).some(i => i.code === 'INVALID_PARAM')) throw new Error('beban<0 harus INVALID');
});

/* ── §5.6 evaluator statis (kunci parity dgn timeline, U01 §13.1) ── */
check('statis SEIMBANG (tanpa peristiwa) → f 50, tanpa shed', () => {
  const r = ufEvaluateStatic(P({ scenario: { kind: 'none' } }));
  if (r.status !== 'SETTLED' || Math.abs(r.steadyStateHz - 50) > 1e-9) throw new Error('harus SETTLED 50');
  if (r.totalShed !== 0 || r.operated.length) throw new Error('tanpa shed');
});
check('statis Lepas interkoneksi (berimpor 400): shed T1 75 + T2 150 → f 49.725275, rocof −1.474', () => {
  const r = ufEvaluateStatic(P({ loadMw: 1500, importMw: 400, scenario: { kind: 'importLoss' } }));
  if (r.status !== 'SETTLED') throw new Error('harus SETTLED: ' + JSON.stringify(r));
  approx(r.steadyStateHz, 50 - 8750 / 31850, 1e-9, 'f_ss');   // D akhir 175
  approx(r.initialDeficitMw, 400, 1e-9, 'D0');
  approx(r.initialRocofHzPerSec, -1.473846, 1e-3, 'rocof');
  if (r.totalShed !== 225) throw new Error('shed harus 225 (75+150), dapat ' + r.totalShed);
  if (JSON.stringify(r.operated) !== JSON.stringify(['T1', 'T2'])) {
    throw new Error('operated harus [T1,T2]: ' + JSON.stringify(r.operated));
  }
});
check('statis Lepas G1 (mandiri): shed keempat tahap 550 → f 50.140056 (overshed artefak model)', () => {
  const r = ufEvaluateStatic(P({ scenario: { kind: 'genLoss', target: 'G1' } }));
  if (r.status !== 'SETTLED') throw new Error('harus SETTLED: ' + JSON.stringify(r));
  approx(r.steadyStateHz, 50 + 2500 / 17850, 1e-9, 'f_ss');   // surplus 50 MW di atas p0
  if (r.totalShed !== 550) throw new Error('shed harus 550, dapat ' + r.totalShed);
  if (r.operated.length !== 4) throw new Error('semua tahap: ' + JSON.stringify(r.operated));
  approx(r.initialDeficitMw, 500, 1e-9, 'D0');
});
check('statis +Beban besar → COLLAPSE (D 1000 > headroom 290 + shed 550), steadyStateHz null', () => {
  const r = ufEvaluateStatic(P({ scenario: { kind: 'collapse', mw: 1000 } }));
  if (r.status !== 'COLLAPSE') throw new Error('harus COLLAPSE: ' + JSON.stringify(r));
  if (r.steadyStateHz !== null) throw new Error('f_ss harus null');
  if (r.totalShed !== 550) throw new Error('shed maksimal 550, dapat ' + r.totalShed);
  if (r.operated.length !== 4) throw new Error('semua tahap dilepas');
});

/* ── §5.3 GENERATOR_BLOCK (temuan code-review: output dijepit ke govMax) ── */
check('applyScenario Blok G3 (maks 100): govMax 100 & output DIJEPIT ke 100 (PRD §5.3)', () => {
  const gens = JSON.parse(JSON.stringify(G));
  const ap = A.applyScenario(gens, 1100, 0, { kind: 'block', target: 'G3', mw: 100 });
  if (gens[2].govMax !== 100 || gens[2].p0 !== 100) {
    throw new Error('G3 harus govMax 100 & p0 100: ' + JSON.stringify(gens[2]));
  }
  if (ap.load !== 1100 || ap.imp !== 0) throw new Error('load/imp tak boleh berubah');
  if (ap.txt.indexOf('blok G3') === -1) throw new Error('txt harus blok G3: ' + ap.txt);
  // unit lain tak tersentuh
  if (gens[0].p0 !== 500 || gens[1].govMax !== 430) throw new Error('G1/G2 tak boleh berubah');
});
check('statis Blok G3 (maks 100): defisit 150, f_ss 49.70297, tanpa shed', () => {
  const r = ufEvaluateStatic(P({ scenario: { kind: 'block', target: 'G3', mw: 100 } }));
  if (r.status !== 'SETTLED') throw new Error('harus SETTLED: ' + JSON.stringify(r));
  approx(r.steadyStateHz, 50 - 7500 / 25250, 1e-9, 'f_ss'); // β G1+G2 = 25250
  approx(r.initialDeficitMw, 150, 1e-9, 'D0');
  approx(r.initialRocofHzPerSec, -0.55270, 1e-3, 'rocof');
  if (r.totalShed !== 0 || r.operated.length) throw new Error('tanpa shed');
});

/* render default (M0: kosong) harus jalan tanpa error */
check('render() default jalan (tanpa error)', () => { A.render(); });

console.log(`\n${passed} lulus, ${failed} gagal`);
process.exit(failed ? 1 : 0);