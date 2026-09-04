/* Tes TIMELINE (PRD §5.5–5.8 / U01 §8, §13) — determinisme, urutan trip,
   parity statis↔dinamis, batas f ≥ 47, RUNTUH. Nilai literal hitung tangan.
   Jalankan: node tools/timeline.test.js */
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

const G = JSON.parse(JSON.stringify(A.DEFAULT_GENS));
const ST = JSON.parse(JSON.stringify(A.DEFAULT_STAGES));
function P(over) {
  return Object.assign({
    fNom: 50, tMax: 40, tEvent: 1.0,
    gens: JSON.parse(JSON.stringify(G)), loadMw: 1100, importMw: 0,
    stages: JSON.parse(JSON.stringify(ST)),
  }, over || {});
}

console.log('timeline.test.js — determinisme & urutan peristiwa (U01 §8/§13)');

/* ── determinisme & batas fisis ── */
check('determinisme: 2× run Lepas G1 → JSON identik (U01 §13.2)', () => {
  const p = P({ scenario: { kind: 'genLoss', target: 'G1' } });
  const a = A.ufTimeline(JSON.parse(JSON.stringify(p)));
  const b = A.ufTimeline(JSON.parse(JSON.stringify(p)));
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error('dua run tidak identik');
});
check('batas fisis: f tidak pernah di bawah 47 Hz di semua skenario', () => {
  [ { kind: 'genLoss', target: 'G1' }, { kind: 'importLoss' },
    { kind: 'collapse', mw: 1000 }, { kind: 'loadStep', mw: 200 } ].forEach(scn => {
    const r = A.ufTimeline(P({ scenario: scn }));
    const minF = Math.min.apply(null, r.fs);
    if (minF < 47 - 1e-9) throw new Error(`${scn.kind}: min f ${minF} < 47`);
  });
});

/* ── skenario Seimbang ── */
check('Seimbang: f tetap 50, tanpa trip, SEIMBANG, settled', () => {
  const r = A.ufTimeline(P({ scenario: { kind: 'none' } }));
  if (!r.settled || r.collapse) throw new Error('harus settled, bukan collapse');
  if (r.status !== 'SEIMBANG') throw new Error('harus SEIMBANG, dapat ' + r.status);
  approx(r.finalF, 50, 1e-12, 'finalF');
  if (r.tripSeq.length !== 0 || r.totalShed !== 0) throw new Error('tak boleh ada trip');
  approx(r.finalV, 1, 1e-12, 'finalV');
});

/* ── skenario Lepas interkoneksi (berimpor 400) ──
   D0=400; saturasi transien menarik f jauh; shed T1 (75) & T2 (150);
   f pulih ke 49.725275 = hasil statis (parity U01 §13.1). */
const IMP = P({ loadMw: 1500, importMw: 400, scenario: { kind: 'importLoss' } });
check('Lepas interkoneksi: urutan trip [T1 75, T2 150], t naik, loadBefore/After konsisten', () => {
  const r = A.ufTimeline(JSON.parse(JSON.stringify(IMP)));
  if (r.tripSeq.length !== 2) throw new Error('harus 2 trip: ' + JSON.stringify(r.tripSeq));
  if (r.tripSeq[0].stage !== 'T1' || r.tripSeq[1].stage !== 'T2') {
    throw new Error('urutan harus T1 lalu T2');
  }
  approx(r.tripSeq[0].mw, 75, 1e-9, 'mw T1'); approx(r.tripSeq[1].mw, 150, 1e-9, 'mw T2');
  if (!(r.tripSeq[1].t > r.tripSeq[0].t + 1e-9)) throw new Error('t harus naik');
  approx(r.tripSeq[0].loadBefore, 1500, 1e-9, 'loadBefore T1');
  approx(r.tripSeq[0].loadAfter, 1425, 1e-9, 'loadAfter T1');
  approx(r.tripSeq[1].loadBefore, 1425, 1e-9, 'loadBefore T2');
  approx(r.tripSeq[1].loadAfter, 1275, 1e-9, 'loadAfter T2');
  if (!(r.tripSeq[0].fAt < 49.5 + 1e-9)) throw new Error('trip T1 harus ≤ ambang 49.5');
  if (!(r.tripSeq[1].fAt < 49.0 + 1e-9)) throw new Error('trip T2 harus ≤ ambang 49.0');
});
check('Lepas interkoneksi: parity statis↔timeline f_ss 49.725275 (U01 §13.1)', () => {
  const r = A.ufTimeline(JSON.parse(JSON.stringify(IMP)));
  const st = A.ufEvaluateStatic(JSON.parse(JSON.stringify(IMP)));
  approx(r.finalF, 50 - 8750 / 31850, 1e-6, 'finalF literal');
  if (Math.abs(r.finalF - st.steadyStateHz) > 1e-6) {
    throw new Error(`parity: timeline ${r.finalF} vs statis ${st.steadyStateHz}`);
  }
  if (r.status !== 'PELEPASAN BEBAN') throw new Error('harus PELEPASAN BEBAN, dapat ' + r.status);
});
check('Lepas interkoneksi: event log konsisten dgn tripSeq; dip tegangan ≈ 0.865 & pulih > 0.95', () => {
  const r = A.ufTimeline(JSON.parse(JSON.stringify(IMP)));
  if (!r.ev.length || r.ev[0].kind !== 'event') throw new Error('ev[0] harus event');
  const trips = r.ev.filter(e => e.kind === 'trip');
  if (trips.length !== r.tripSeq.length) throw new Error('jumlah trip log ≠ tripSeq');
  trips.forEach((e, i) => {
    if (e.stage !== r.tripSeq[i].stage || Math.abs(e.mw - r.tripSeq[i].mw) > 1e-9) {
      throw new Error('log trip ke-' + i + ' tak cocok');
    }
  });
  approx(r.ev[0].d0, 400, 1e-9, 'D0 di log');
  approx(r.ev[0].rocof0, -1.473846, 1e-3, 'rocof0 di log');
  const minV = Math.min.apply(null, r.vs);
  approx(minV, 1 - 400 / 1480 * 0.5, 0.015, 'dip tegangan (ilustratif)'); // 0.5·D0/S
  if (!(r.finalV > 0.95)) throw new Error('tegangan harus pulih: ' + r.finalV);
});

/* ── skenario Lepas G1 (mandiri) ──
   D0=500 > headroom 290 → saturasi penuh; keempat tahap lepas (550);
   surplus 50 MW → f jenuh ke 50.140056 (artefak clamp suplai ≥ p0). */
const G1 = P({ scenario: { kind: 'genLoss', target: 'G1' } });
check('Lepas G1: keempat tahap lepas berurutan, total 550 MW, status PEMULIHAN', () => {
  const r = A.ufTimeline(JSON.parse(JSON.stringify(G1)));
  if (JSON.stringify(r.tripSeq.map(x => x.stage)) !== JSON.stringify(['T1', 'T2', 'T3', 'T4'])) {
    throw new Error('urutan harus T1..T4: ' + JSON.stringify(r.tripSeq));
  }
  approx(r.totalShed, 550, 1e-9, 'totalShed');
  if (r.status !== 'PEMULIHAN') throw new Error('harus PEMULIHAN, dapat ' + r.status);
  if (!(r.finalV > 0.9)) throw new Error('tegangan harus pulih: ' + r.finalV);
});
check('Lepas G1: parity statis↔timeline f_ss 50.140056', () => {
  const r = A.ufTimeline(JSON.parse(JSON.stringify(G1)));
  const st = A.ufEvaluateStatic(JSON.parse(JSON.stringify(G1)));
  approx(r.finalF, 50 + 2500 / 17850, 1e-6, 'finalF literal');
  if (Math.abs(r.finalF - st.steadyStateHz) > 1e-6) {
    throw new Error(`parity: timeline ${r.finalF} vs statis ${st.steadyStateHz}`);
  }
});

/* ── skenario +Beban besar → RUNTUH ── */
const RUNTUH = P({ scenario: { kind: 'collapse', mw: 1000 } });
check('+Beban besar: collapse RUNTUH, f terpaku 47.0, V lantai 0.85, shed maks 550', () => {
  const r = A.ufTimeline(JSON.parse(JSON.stringify(RUNTUH)));
  if (!r.collapse) throw new Error('harus collapse');
  if (r.status !== 'RUNTUH') throw new Error('harus RUNTUH, dapat ' + r.status);
  approx(Math.min.apply(null, r.fs), 47, 1e-9, 'min f (klip)');
  approx(r.finalV, 0.85, 0.001, 'V lantai');
  approx(r.totalShed, 550, 1e-9, 'totalShed');
  if (r.tripSeq.length !== 4) throw new Error('semua tahap harus lepas');
  const st = A.ufEvaluateStatic(JSON.parse(JSON.stringify(RUNTUH)));
  if (st.status !== 'COLLAPSE') throw new Error('statis harus COLLAPSE juga');
});

/* ── skenario +Beban 200 (mild): defisit kecil, tanpa shed, tetap dalam band? ── */
check('+Beban 200: defisit 200 → f_ss 49.686 (dgn droop saja), tanpa trip', () => {
  const r = A.ufTimeline(P({ scenario: { kind: 'loadStep', mw: 200 } }));
  if (r.tripSeq.length !== 0) throw new Error('tak boleh ada trip: ' + JSON.stringify(r.tripSeq));
  if (r.status !== 'DEFISIT') throw new Error('harus DEFISIT, dapat ' + r.status);
  approx(r.finalF, 50 - 10000 / 31850, 1e-6, 'finalF'); // 49.686028
});

console.log(`\n${passed} lulus, ${failed} gagal`);
process.exit(failed ? 1 : 0);