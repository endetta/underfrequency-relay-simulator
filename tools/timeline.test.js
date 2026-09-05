/* Tes TIMELINE (PRD §5.5–5.8 + amendemen plan-03/ADR-0006: AGC sekunder) —
   determinisme, urutan trip, parity statis↔timeline, batas f ≥ 47, RUNTUH,
   lapisan kendali governor → AGC → UFLS. Nilai literal hasil hitung tangan /
   diverifikasi via probe model. Jalankan: node tools/timeline.test.js */
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
    agcOn: true, agcRate: 40, agcInterval: 2, // default produk (plan-03 §0b)
  }, over || {});
}

console.log('timeline.test.js — determinisme & urutan peristiwa (U01 §8/§13 + ADR-0006 AGC)');

/* ── determinisme & batas fisis ── */
check('determinisme: 2× run Lepas G1 → JSON identik (U01 §13.2)', () => {
  const p = P({ scenario: { kind: 'genLoss', target: 'G1' } });
  const a = A.ufTimeline(JSON.parse(JSON.stringify(p)));
  const b = A.ufTimeline(JSON.parse(JSON.stringify(p)));
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error('dua run tidak identik');
});
check('determinisme: 2× run +Beban 200 (AGC aktif) → JSON identik', () => {
  const p = P({ scenario: { kind: 'loadStep', mw: 200 } });
  const a = A.ufTimeline(JSON.parse(JSON.stringify(p)));
  const b = A.ufTimeline(JSON.parse(JSON.stringify(p)));
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error('dua run AGC tidak identik');
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
check('Seimbang: f tetap 50, tanpa trip, SEIMBANG, settled, AGC idle', () => {
  const r = A.ufTimeline(P({ scenario: { kind: 'none' } }));
  if (!r.settled || r.collapse) throw new Error('harus settled, bukan collapse');
  if (r.status !== 'SEIMBANG') throw new Error('harus SEIMBANG, dapat ' + r.status);
  approx(r.finalF, 50, 1e-12, 'finalF');
  if (r.tripSeq.length !== 0 || r.totalShed !== 0) throw new Error('tak boleh ada trip');
  if (r.agcDispatch !== 0 || r.agcStep !== 0) throw new Error('AGC harus idle saat seimbang');
  approx(r.finalV, 1, 1e-12, 'finalV');
});

/* ── Lapisan AGC: skenario ringan +Beban 200 (plan-03: showcase governor → AGC,
   tanpa UFLS). Droop saja: f_ss 49.686 DEFISIT; AGC memulihkan → 50.00 SEIMBANG. */
check('+Beban 200 AGC ON: pulih ke 50.00 via AGC (3 langkah, total 200 MW), tanpa trip', () => {
  const r = A.ufTimeline(P({ scenario: { kind: 'loadStep', mw: 200 } }));
  if (r.tripSeq.length !== 0) throw new Error('tak boleh ada trip: ' + JSON.stringify(r.tripSeq));
  if (!r.settled) throw new Error('harus settled');
  approx(r.finalF, 50, 1e-6, 'finalF');
  if (r.status !== 'SEIMBANG') throw new Error('harus SEIMBANG, dapat ' + r.status);
  approx(r.agcDispatch, 200, 1e-6, 'total dispatch AGC');
  if (r.agcStep !== 3) throw new Error('harus 3 langkah, dapat ' + r.agcStep);
  if (!r.agcRecovered) throw new Error('harus agcRecovered (f kembali ke pita via AGC)');
});
check('+Beban 200 AGC OFF: perilaku droop lama dipertahankan — f_ss 49.686 DEFISIT tanpa trip', () => {
  const r = A.ufTimeline(P({ scenario: { kind: 'loadStep', mw: 200 }, agcOn: false }));
  if (r.tripSeq.length !== 0) throw new Error('tak boleh ada trip');
  if (r.status !== 'DEFISIT') throw new Error('harus DEFISIT, dapat ' + r.status);
  approx(r.finalF, 50 - 10000 / 31850, 1e-6, 'finalF'); // 49.686028 droop saja
  if (r.agcDispatch !== 0) throw new Error('AGC off tak boleh dispatch');
});
check('+Beban 200 AGC OFF: parity statis↔timeline f_ss 49.686 (U01 §13.1)', () => {
  const p = P({ scenario: { kind: 'loadStep', mw: 200 }, agcOn: false });
  const r = A.ufTimeline(JSON.parse(JSON.stringify(p)));
  const st = A.ufEvaluateStatic(JSON.parse(JSON.stringify(p)));
  if (Math.abs(r.finalF - st.steadyStateHz) > 1e-6) {
    throw new Error(`parity: timeline ${r.finalF} vs statis ${st.steadyStateHz}`);
  }
});

/* ── Lepas G3 (defisit 250 < reserve 290): T1 lepas di transien, AGC lalu
   memulihkan ke 50.00 (PEMULIHAN). */
const G3 = P({ scenario: { kind: 'genLoss', target: 'G3' } });
check('Lepas G3 AGC ON: T1 lepas (55 MW), AGC 195 MW memulihkan f → 50.00 PEMULIHAN', () => {
  const r = A.ufTimeline(JSON.parse(JSON.stringify(G3)));
  if (JSON.stringify(r.tripSeq.map(x => x.stage)) !== JSON.stringify(['T1'])) {
    throw new Error('urutan harus [T1]: ' + JSON.stringify(r.tripSeq));
  }
  approx(r.tripSeq[0].mw, 55, 1e-9, 'mw T1');
  approx(r.totalShed, 55, 1e-9, 'totalShed');
  approx(r.agcDispatch, 195, 1e-6, 'total dispatch AGC');
  approx(r.finalF, 50, 1e-6, 'finalF');
  if (r.status !== 'PEMULIHAN') throw new Error('harus PEMULIHAN, dapat ' + r.status);
});

/* ── Lepas G1 (defisit 500 > reserve pasca-lepas 150): AGC tak mampu → semua
   tahap lepas (550), surplus 50 MW → f 50.140056 (artefak clamp suplai). */
const G1 = P({ scenario: { kind: 'genLoss', target: 'G1' } });
check('Lepas G1: keempat tahap lepas berurutan, total 550 MW, AGC 0 (tak mampu), PEMULIHAN', () => {
  const r = A.ufTimeline(JSON.parse(JSON.stringify(G1)));
  if (JSON.stringify(r.tripSeq.map(x => x.stage)) !== JSON.stringify(['T1', 'T2', 'T3', 'T4'])) {
    throw new Error('urutan harus T1..T4: ' + JSON.stringify(r.tripSeq));
  }
  approx(r.totalShed, 550, 1e-9, 'totalShed');
  if (r.agcDispatch !== 0) throw new Error('AGC tak boleh dispatch (defisit > reserve)');
  if (r.status !== 'PEMULIHAN') throw new Error('harus PEMULIHAN, dapat ' + r.status);
  if (!(r.finalV > 0.9)) throw new Error('tegangan harus pulih: ' + r.finalV);
});
check('Lepas G1: parity statis↔timeline f_ss 50.140056 (AGC idle — setara OFF)', () => {
  const p = P({ scenario: { kind: 'genLoss', target: 'G1' } });
  const r = A.ufTimeline(JSON.parse(JSON.stringify(p)));
  const st = A.ufEvaluateStatic(JSON.parse(JSON.stringify(p)));
  approx(r.finalF, 50 + 2500 / 17850, 1e-6, 'finalF literal');
  if (Math.abs(r.finalF - st.steadyStateHz) > 1e-6) {
    throw new Error(`parity: timeline ${r.finalF} vs statis ${st.steadyStateHz}`);
  }
});

/* ── Lepas interkoneksi (berimpor 400) ──
   D0=400 > reserve 290 → T1 (75) & T2 (150) lepas; AGC 175 MW memulihkan ke 50. */
const IMP = P({ loadMw: 1500, importMw: 400, scenario: { kind: 'importLoss' } });
check('Lepas interkoneksi AGC ON: urutan trip [T1 75, T2 150], lalu AGC 175 MW → f 50.00', () => {
  const r = A.ufTimeline(JSON.parse(JSON.stringify(IMP)));
  if (JSON.stringify(r.tripSeq.map(x => x.stage)) !== JSON.stringify(['T1', 'T2'])) {
    throw new Error('urutan harus T1 lalu T2: ' + JSON.stringify(r.tripSeq));
  }
  approx(r.tripSeq[0].mw, 75, 1e-9, 'mw T1'); approx(r.tripSeq[1].mw, 150, 1e-9, 'mw T2');
  if (!(r.tripSeq[1].t > r.tripSeq[0].t + 1e-9)) throw new Error('t harus naik');
  approx(r.totalShed, 225, 1e-9, 'totalShed');
  approx(r.agcDispatch, 175, 1e-6, 'total dispatch AGC');
  approx(r.finalF, 50, 1e-6, 'finalF');
  if (r.status !== 'PEMULIHAN') throw new Error('harus PEMULIHAN, dapat ' + r.status);
});
check('Lepas interkoneksi AGC OFF: parity statis↔timeline f_ss 49.725275 (U01 §13.1)', () => {
  const p = P({ loadMw: 1500, importMw: 400, scenario: { kind: 'importLoss' }, agcOn: false });
  const r = A.ufTimeline(JSON.parse(JSON.stringify(p)));
  const st = A.ufEvaluateStatic(JSON.parse(JSON.stringify(p)));
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
  approx(minV, 1 - 400 / 1480 * 0.5, 0.015, 'dip tegangan (ilustratif)');
  if (!(r.finalV > 0.95)) throw new Error('tegangan harus pulih: ' + r.finalV);
});

/* ── skenario +Beban besar → RUNTUH (AGC tak mampu: defisit ≫ reserve+shed) ── */
const RUNTUH = P({ scenario: { kind: 'collapse', mw: 1000 } });
check('+Beban besar: collapse RUNTUH, f terpaku 47.0, V lantai 0.85, shed maks 550, AGC 0', () => {
  const r = A.ufTimeline(JSON.parse(JSON.stringify(RUNTUH)));
  if (!r.collapse) throw new Error('harus collapse');
  if (r.status !== 'RUNTUH') throw new Error('harus RUNTUH, dapat ' + r.status);
  approx(Math.min.apply(null, r.fs), 47, 1e-9, 'min f (klip)');
  approx(r.finalV, 0.85, 0.001, 'V lantai');
  approx(r.totalShed, 550, 1e-9, 'totalShed');
  if (r.tripSeq.length !== 4) throw new Error('semua tahap harus lepas');
  if (r.agcDispatch !== 0) throw new Error('AGC tak mampu saat runtuh');
  const st = A.ufEvaluateStatic(JSON.parse(JSON.stringify(RUNTUH)));
  if (st.status !== 'COLLAPSE') throw new Error('statis harus COLLAPSE juga');
});

/* ── Blok G3 (temuan code-review, PRD §5.3): unit terblok kehilangan kapabilitas
   (govMax 100 < p0 250 → output dijepit 100 → defisit 150). AGC memulihkan; tanpa
   AGC f_ss 49.70297 DEFISIT (β G1+G2 = 25250). ── */
check('Blok G3 AGC ON: AGC memulihkan f → 50.00 (2 langkah, total 150 MW), tanpa trip', () => {
  const r = A.ufTimeline(P({ scenario: { kind: 'block', target: 'G3', mw: 100 } }));
  if (r.tripSeq.length !== 0) throw new Error('tak boleh ada trip: ' + JSON.stringify(r.tripSeq));
  if (r.status !== 'SEIMBANG') throw new Error('harus SEIMBANG, dapat ' + r.status);
  approx(r.finalF, 50, 1e-6, 'finalF');
  approx(r.agcDispatch, 150, 1e-6, 'total dispatch AGC');
  if (r.agcStep !== 2) throw new Error('harus 2 langkah, dapat ' + r.agcStep);
  if (!r.agcRecovered) throw new Error('harus agcRecovered (f kembali ke pita via AGC)');
});
check('Blok G3 AGC OFF: DEFISIT 49.70297 (droop saja) + parity statis↔timeline', () => {
  const p = P({ scenario: { kind: 'block', target: 'G3', mw: 100 }, agcOn: false });
  const r = A.ufTimeline(JSON.parse(JSON.stringify(p)));
  if (r.status !== 'DEFISIT') throw new Error('harus DEFISIT, dapat ' + r.status);
  approx(r.finalF, 50 - 7500 / 25250, 1e-6, 'finalF');
  if (r.agcDispatch !== 0) throw new Error('AGC off tak boleh dispatch');
  const st = A.ufEvaluateStatic(JSON.parse(JSON.stringify(p)));
  if (Math.abs(r.finalF - st.steadyStateHz) > 1e-6) {
    throw new Error(`parity: timeline ${r.finalF} vs statis ${st.steadyStateHz}`);
  }
});
check('determinisme: 2× run Blok G3 → JSON identik', () => {
  const p = P({ scenario: { kind: 'block', target: 'G3', mw: 100 } });
  const a = A.ufTimeline(JSON.parse(JSON.stringify(p)));
  const b = A.ufTimeline(JSON.parse(JSON.stringify(p)));
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error('dua run tidak identik');
});

/* ── validasi param AGC ── */
check('ufValidate: agcRate negatif & agcInterval < 0,5 → INVALID_PARAM; default bersih', () => {
  const clean = A.ufValidate(P({ scenario: { kind: 'none' } }));
  if (clean.length) throw new Error('default harus bersih: ' + JSON.stringify(clean));
  const bad1 = P({ agcRate: -5 });
  if (!A.ufValidate(bad1).some(i => i.code === 'INVALID_PARAM')) throw new Error('agcRate<0 harus INVALID');
  const bad2 = P({ agcInterval: 0.1 });
  if (!A.ufValidate(bad2).some(i => i.code === 'INVALID_PARAM')) throw new Error('agcInterval<0,5 harus INVALID');
  const bad3 = P({ agcOn: 'ya' });
  if (!A.ufValidate(bad3).some(i => i.code === 'INVALID_PARAM')) throw new Error('agcOn non-boolean harus INVALID');
});

console.log(`\n${passed} lulus, ${failed} gagal`);
process.exit(failed ? 1 : 0);
