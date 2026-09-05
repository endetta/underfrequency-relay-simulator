/* Tes SLD (PRD §5 / revisi §2 prototipe) — geometri & status visual:
   simbol generator lingkaran+salib (×), bus solid, beban vital teal tersambung,
   pemutus lurus vs miring 45° + label TERBUKA, TANPA stroke-dasharray di jalur daya.
   Jalankan: node tools/sld.test.js */
'use strict';
const path = require('path');
const HTML = path.join(__dirname, '..', 'underfrequency_relay_simulator.html');
const { loadSimulator } = require('./lens-harness.js');

let passed = 0, failed = 0;
function check(name, fn) {
  try { fn(); passed++; console.log('  ok  ' + name); }
  catch (e) { failed++; console.log('FAIL  ' + name + '\n      ' + e.message); }
}
function count(hay, needle) {
  let n = 0, i = 0;
  while ((i = hay.indexOf(needle, i)) !== -1) { n++; i += needle.length; }
  return n;
}

const ctx = loadSimulator(HTML);
const A = ctx.pub;

function scenP(kind, extra) {
  const p = A.paramP();
  p.scenario = Object.assign({ kind: kind }, extra || {});
  return p;
}
function runOf(p) { return A.ufTimeline(JSON.parse(JSON.stringify(p))); }
function renderAt(p, run, t) { return A.renderSld(p, t, run); }

console.log('sld.test.js — geometri & status SLD');

/* ── baseline: sistem seimbang (tanpa peristiwa) ── */
const baseP = scenP('none');
baseP.importMw = 400; // tampilkan interkoneksi terisi di baseline
const baseRun = runOf(baseP);
check('baseline: 3 simbol generator lingkaran + 6 garis silang (×)', () => {
  const s = renderAt(baseP, baseRun, 0);
  if (count(s, '<circle class="gen"') !== 3) throw new Error('harus 3 lingkaran generator');
  if (count(s, 'class="xc"') !== 6) throw new Error('harus 6 garis salib (2 per generator)');
});
check('baseline: bus solid tebal (stroke-width 7), TANPA stroke-dasharray di jalur daya', () => {
  const s = renderAt(baseP, baseRun, 0);
  if (count(s, 'class="bus"') !== 1) throw new Error('harus ada 1 bus');
  if (!s.includes('stroke-width="7"')) throw new Error('bus harus tebal');
  if (s.includes('stroke-dasharray')) throw new Error('jalur daya tidak boleh putus-putus');
});
check('baseline: 6 pemutus lurus (1 impor + 5 feeder), tanpa rotasi, tanpa label TERBUKA', () => {
  const s = renderAt(baseP, baseRun, 0);
  if (count(s, 'class="brk"') !== 6) throw new Error('harus 6 pemutus (1 impor + 4 tahap + vital), dapat ' + count(s, 'class="brk"'));
  if (count(s, 'data-open="1"') !== 0) throw new Error('tak boleh ada pemutus terbuka');
  if (s.includes('rotate(45')) throw new Error('tak boleh ada pemutus miring');
  if (s.includes('TERBUKA')) throw new Error('tak boleh ada label TERBUKA');
});
check('baseline: interkoneksi 400 MW berlabel, beban 1100 MW, vital teal tersambung ke bus', () => {
  const s = renderAt(baseP, baseRun, 0);
  if (!s.includes('400 MW')) throw new Error('label impor harus 400 MW');
  if (!s.includes('Beban 1100 MW')) throw new Error('label beban harus 1100 MW');
  if (!s.includes('VITAL · 550 MW')) throw new Error('label vital harus VITAL · 550 MW');
  // garis vital (teal) harus benar-benar menempel ke bus: segmen dari bus ke atas (plan-02 §4.3)
  if (!s.includes('x1="540" y1="72" x2="540" y2="252" stroke="#13697A"')) {
    throw new Error('feeder vital harus tersambung solid ke bus dengan warna teal');
  }
  if (count(s, 'stroke="#13697A"') < 2) throw new Error('vital harus bergaris teal');
});
check('baseline: semua generator ONLINE (chip hijau, RPM 3000/1500), tanpa maks gov', () => {
  const s = renderAt(baseP, baseRun, 0);
  if (count(s, 'RPM ') !== 3) throw new Error('3 chip harus menampilkan RPM');
  if (!s.includes('RPM 3000') || !s.includes('RPM 1500')) throw new Error('RPM kutub 2 = 3000, kutub 4 = 1500');
  if (s.includes('maks gov')) throw new Error('seimbang tak boleh maks gov');
  if (s.includes('TRIP')) throw new Error('seimbang tak boleh TRIP');
});

/* ── skenario Lepas interkoneksi: impor 0, pemutus impor miring + TERBUKA ── */
const impP = scenP('importLoss');
impP.importMw = 400; impP.loadMw = 1500; // sistem berimpor: lepas 400 MW = defisit 400
const impRun = runOf(impP);
check('lepas interkoneksi (t=1.3): pemutus impor miring 45° + label TERBUKA + 0 MW · LEPAS', () => {
  const s = renderAt(impP, impRun, 1.3);
  if (!s.includes('0 MW · LEPAS')) throw new Error('label impor harus 0 MW · LEPAS');
  if (count(s, 'data-open="1"') !== 1) throw new Error('tepat 1 pemutus terbuka (impor)');
  if (!s.includes('rotate(45 115 256)')) throw new Error('pemutus impor harus miring 45°');
  if (count(s, 'TERBUKA') !== 1) throw new Error('1 label TERBUKA');
  if (s.includes('stroke-dasharray')) throw new Error('tetap tanpa dasharray');
});
check('lepas interkoneksi saat f turun: governor jenuh → chip "maks gov" (copper)', () => {
  // t=2.0: f≈49.40 < semua titik saturasi (49.64/49.50/49.47) → ketiga unit jenuh
  const s = renderAt(impP, impRun, 2.0);
  if (count(s, 'maks gov') !== 3) throw new Error('ketiga unit harus maks gov saat f jauh di bawah sat: ' + count(s, 'maks gov'));
  if (s.includes('TRIP')) throw new Error('unit pembangkit tidak boleh TRIP (impor yg lepas)');
});

/* ── skenario Lepas G1 (mandiri) hingga akhir run ── */
const g1P = scenP('genLoss', { target: 'G1' });
const g1Run = runOf(g1P);
const T_END = g1Run.tMax;
check('lepas G1 (akhir run): keempat tahap terbuka berurutan, impor tetap tersambung', () => {
  const s = renderAt(g1P, g1Run, T_END);
  if (count(s, 'data-open="1"') !== 4) throw new Error('4 pemutus tahap harus terbuka, dapat ' + count(s, 'data-open="1"'));
  if (count(s, 'TERBUKA') !== 4) throw new Error('4 label TERBUKA');
  if (s.includes('rotate(45 80 116)')) throw new Error('pemutus impor tidak boleh terbuka di skenario G1');
  if (s.includes('0 MW · LEPAS')) throw new Error('impor tetap 400 MW');
});
check('lepas G1: chip G1 TRIP (abu) + 0 MW; G2/G3 online; beban akhir 550 MW · lepas 550', () => {
  const s = renderAt(g1P, g1Run, T_END);
  if (count(s, 'TRIP') !== 1) throw new Error('tepat G1 yang TRIP');
  if (!s.includes('stroke="#C9CDD2"')) throw new Error('simbol G1 harus abu (offline)');
  if (!s.includes('Beban 550 MW · lepas 550')) throw new Error('beban akhir 550 MW dgn total lepas 550');
  if (count(s, 'RPM ') !== 2) throw new Error('hanya G2/G3 yang menampilkan RPM');
});
check('lepas G1: tanpa dasharray di semua keadaan', () => {
  const s = renderAt(g1P, g1Run, T_END);
  if (s.includes('stroke-dasharray')) throw new Error('dilarang stroke-dasharray');
});

/* ── floor tipografi kanvas (plan-02 §4.4) ── */
check('font floor: semua font-size SLD >= 10 (plan-02)', () => {
  const s = renderAt(baseP, baseRun, 0);
  const sizes = [...s.matchAll(/font-size="([0-9.]+)"/g)].map(m => parseFloat(m[1]));
  if (!sizes.length) throw new Error('harus ada teks SVG');
  const min = Math.min(...sizes);
  if (min < 10) throw new Error('font terkecil ' + min + ' px < 10');
});

/* ── render master & fAt ── */
check('render() + renderSldInto jalan tanpa error; #sld terisi SVG', () => {
  A.render();
  const el = ctx.els.sld;
  if (!el || !el.innerHTML || el.innerHTML.indexOf('<line') === -1) throw new Error('#sld harus berisi SVG');
});
check('fAt: interpolasi linier antar sampel', () => {
  const run = { ts: [0, 1, 2], fs: [50, 49, 48] };
  if (Math.abs(A.fAt(run, 0.5) - 49.5) > 1e-9) throw new Error('interpolasi 0.5 harus 49.5');
  if (Math.abs(A.fAt(run, 0) - 50) > 1e-9) throw new Error('t awal');
  if (Math.abs(A.fAt(run, 5) - 48) > 1e-9) throw new Error('t di luar jangkauan = sampel akhir');
});

console.log(`\n${passed} lulus, ${failed} gagal`);
process.exit(failed ? 1 : 0);