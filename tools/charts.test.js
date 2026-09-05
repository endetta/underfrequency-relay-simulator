/* Tes GRAFIK (PRD §5 / rencana §5 M2 + plan-03 P1) — geometri & literal posisi:
   renderFreq (jendela 0–30 s, y 47–52 Hz, pita normal ±0.2, ambang T1–T4
   putus-putus copper, penanda peristiwa & trip), renderGauge (batang gradien
   hijau→merah + penunjuk f), renderVolt (pu 0.85–1.05 + lantai 0.85 + label
   ilustratif). Nilai literal hitung tangan dari skala y = 12 + (52−f)/5·214 dan
   x = 38 + t/30·628 (jendela 0–30 s, plan-03 P1).
   Jalankan: node tools/charts.test.js */
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

const ctx = loadSimulator(HTML);
const A = ctx.pub;

function scenP(kind, extra, over) {
  const p = A.paramP();
  p.scenario = Object.assign({ kind: kind }, extra || {});
  if (over) Object.assign(p, over);
  return p;
}

console.log('charts.test.js — grafik frekuensi, gauge, tegangan (M2)');

/* ── skala (literal hitung tangan) ── */
check('skala: y(52)=12, y(50)=97.6, y(49.5)=119, y(47)=226 (jendela 47–52 Hz)', () => {
  approx(A.fToY(52), 12, 1e-6, 'y52');
  approx(A.fToY(50), 97.6, 1e-6, 'y50');   // 12 + 2/5·214
  approx(A.fToY(49.5), 119, 1e-6, 'y49.5'); // 12 + 2.5/5·214
  approx(A.fToY(47), 226, 1e-6, 'y47');
});
check('skala: x(0)=38, x(15)=352, x(30)=666 (jendela 0–30 s)', () => {
  approx(A.tToX(0), 38, 1e-6, 'x0');
  approx(A.tToX(15), 352, 1e-6, 'x15');  // 38 + 15/30·628
  approx(A.tToX(30), 666, 1e-6, 'x30');
});

/* ── renderFreq: struktur & penanda ── */
const impP = scenP('importLoss', null, { importMw: 400, loadMw: 1500 });
const impRun = A.ufTimeline(JSON.parse(JSON.stringify(impP)));
check('renderFreq: pita normal ±0.2 (y 89.04, tinggi 17.12) + garis 50 Hz ditegaskan', () => {
  const s = A.renderFreq(impP, impRun, 2.2);
  // pita: y(50.2)=89.04, y(49.8)=106.16 → tinggi 17.12
  if (!s.includes('y="89.04"') || !s.includes('height="17.12"')) throw new Error('pita normal harus 50.2→49.8');
  if (!s.includes('class="band"')) throw new Error('pita butuh kelas band');
});
check('renderFreq: 4 garis ambang putus-putus copper di y literal + label T1–T4', () => {
  const s = A.renderFreq(impP, impRun, 2.2);
  if (s.indexOf('stroke-dasharray') === -1) throw new Error('ambang harus putus-putus');
  const thr = (s.match(/class="thr"/g) || []).length;
  if (thr !== 4) throw new Error('4 ambang tahap, dapat ' + thr);
  if (!s.includes('y1="119.0"') || !s.includes('y2="119.0"')) throw new Error('T1 (49.5) harus y=119.0');
  if (!s.includes('y1="140.4"') || !s.includes('y2="140.4"')) throw new Error('T2 (49.0) harus y=140.4'); // 12+3/5·214
  if (!s.includes('y1="161.8"') || !s.includes('y2="161.8"')) throw new Error('T3 (48.5) harus y=161.8'); // 12+3.5/5·214
  if (!s.includes('y1="183.2"') || !s.includes('y2="183.2"')) throw new Error('T4 (48.0) harus y=183.2'); // 12+4/5·214
  ['T1', 'T2', 'T3', 'T4'].forEach(id => { if (!s.includes('>' + id + '<')) throw new Error('label ' + id + ' hilang'); });
});
check('renderFreq: penanda peristiwa di t=1.0 (x=58.9) & trip T1 di t trip (x literal)', () => {
  const s = A.renderFreq(impP, impRun, 2.2);
  if (!s.includes('x1="58.9"') || !s.includes('x2="58.9"')) throw new Error('peristiwa t=1.0 → x=38+1/30·628=58.9');
  if (!s.includes('class="ev"')) throw new Error('penanda peristiwa butuh kelas ev');
  const trip1 = impRun.tripSeq[0];
  if (!trip1) throw new Error('harus ada trip pertama');
  const xTrip = A.tToX(trip1.t);
  if (!s.includes('class="trip"') || s.indexOf('cx="' + xTrip.toFixed(1) + '"') === -1) {
    throw new Error('penanda trip harus di x=' + xTrip.toFixed(1));
  }
});
check('renderFreq: kurva f(t) mengikuti sampel run (polyline non-kosong)', () => {
  const s = A.renderFreq(impP, impRun, 2.2);
  const m = s.match(/<polyline[^>]*points="([^"]+)"/);
  if (!m) throw new Error('kurva f(t) harus polyline');
  if (m[1].split(' ').length < 10) throw new Error('kurva harus banyak titik');
});
check('renderFreq: label sumbu y 47–52 Hz & x 0–30 s (langkah 5 s)', () => {
  const s = A.renderFreq(impP, impRun, 2.2);
  ['47.0', '48.0', '49.0', '50.0', '51.0', '52.0'].forEach(v => {
    if (!s.includes('>' + v + '</text>')) throw new Error('label y ' + v + ' hilang');
  });
  ['0s', '5s', '15s', '30s'].forEach(v => {
    if (!s.includes('>' + v + '<')) throw new Error('label x ' + v + ' hilang');
  });
  if (s.includes('>6s<') || s.includes('>12s<')) throw new Error('label x lama (6s/12s) tidak boleh ada');
});

/* ── renderGauge: batang gradien + penunjuk ── */
check('gauge: hijau HANYA di zona 50 Hz — puncak copper (over-frekuensi), dasar merah (plan-02 §4.4b)', () => {
  const s = A.renderGauge(49.5);
  const stops = (s.match(/<stop /g) || []).length;
  if (stops < 5) throw new Error('min 5 stop warna, dapat ' + stops);
  if (!s.includes('offset="0%"') || !s.includes('#B5651D')) throw new Error('puncak (52 Hz) harus copper, BUKAN hijau');
  if (/offset="0%"[^>]*#2E7D46/.test(s)) throw new Error('stop 0% tidak boleh hijau');
  if (!s.includes('offset="100%"') || !s.includes('#C0392B')) throw new Error('dasar (47 Hz) harus merah');
  if (!s.includes('#2E7D46')) throw new Error('hijau harus ada di zona 50 Hz');
});
check('gauge: penunjuk f=49.5 di y=119 & nilai tertulis; f=50 → y=97.6', () => {
  const s50 = A.renderGauge(50);
  if (!s50.includes('97.6')) throw new Error('penunjuk 50 Hz harus y=97.6');
  const s = A.renderGauge(49.5);
  if (!s.includes('119')) throw new Error('penunjuk 49.5 Hz harus y=119');
  if (!s.includes('>49.50 Hz<')) throw new Error('nilai f harus tertulis');
});
check('gauge: tick 47–52 Hz', () => {
  const s = A.renderGauge(50);
  for (const v of [47, 48, 49, 50, 51, 52]) {
    if (!s.includes('>' + v + '</text>')) throw new Error('tick ' + v + ' hilang');
  }
});

/* ── renderVolt: ilustratif, lantai 0.85, label wajib ── */
check('tegangan: label ilustratif & nominal kV di kartu (HTML), lantai 0.85 + skala pu di SVG', () => {
  if (!src.includes('ilustratif, bukan hasil aliran daya')) throw new Error('label ilustratif wajib di kartu');
  if (!src.includes('nominal 20 kV')) throw new Error('footer kV wajib di kartu');
  const s = A.renderVolt(impRun);
  if (!s.includes('0.85')) throw new Error('lantai 0.85 harus terlihat');
  if (!s.includes('lantai 0.85')) throw new Error('label lantai wajib');
  ['0.85', '0.90', '0.95', '1.00', '1.05'].forEach(v => {
    if (!s.includes('>' + v + '</text>')) throw new Error('label pu ' + v + ' hilang');
  });
});
check('tegangan: kurva V(t) non-kosong; run RUNTUH berakhir di lantai 0.85', () => {
  const r = A.ufTimeline(JSON.parse(JSON.stringify(scenP('collapse', { mw: 1000 }))));
  const s = A.renderVolt(r);
  const m = s.match(/<polyline[^>]*points="([^"]+)"/);
  if (!m) throw new Error('kurva V(t) harus polyline');
  approx(r.finalV, 0.85, 0.001, 'finalV lantai');
});

/* ── render master: grafik masuk ke DOM ── */
/* ── floor tipografi kanvas (plan-02 §4.4) ── */
check('font floor: semua font-size grafik & gauge >= 10 (plan-02)', () => {
  for (const [name, svg] of [
    ['freq', A.renderFreq(impP, impRun, 2.2)],
    ['gauge', A.renderGauge(50)],
    ['volt', A.renderVolt(impRun)]
  ]) {
    const sizes = [...svg.matchAll(/font-size="([0-9.]+)"/g)].map(m => parseFloat(m[1]));
    if (!sizes.length) throw new Error(name + ': harus ada teks SVG');
    const min = Math.min(...sizes);
    if (min < 10) throw new Error(name + ' font terkecil ' + min + ' px < 10');
  }
});

check('render() mengisi #fSvg, #gauge, #vSvg tanpa error', () => {
  A.render();
  const f = ctx.els.fSvg, g = ctx.els.gauge, v = ctx.els.vSvg;
  if (!f || !f.innerHTML || f.innerHTML.indexOf('<polyline') === -1) throw new Error('#fSvg harus berisi kurva');
  if (!g || !g.innerHTML || g.innerHTML.indexOf('<linearGradient') === -1) throw new Error('#gauge harus gradien');
  if (!v || !v.innerHTML || v.innerHTML.indexOf('<polyline') === -1) throw new Error('#vSvg harus berisi kurva');
});

console.log(`\n${passed} lulus, ${failed} gagal`);
process.exit(failed ? 1 : 0);