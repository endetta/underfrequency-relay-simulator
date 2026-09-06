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
// M16-A: urutan gambar bus diuji terpisah (lihat blok M16-A di bawah) — bus paling atas.
check('baseline: 6 pemutus lurus (1 impor + 5 feeder), tanpa rotasi, tanpa label TERBUKA', () => {
  const s = renderAt(baseP, baseRun, 0);
  if (count(s, 'class="brk"') !== 6) throw new Error('harus 6 pemutus (1 impor + 4 tahap + vital), dapat ' + count(s, 'class="brk"'));
  if (count(s, 'data-open="1"') !== 0) throw new Error('tak boleh ada pemutus terbuka');
  if (s.includes('rotate(45')) throw new Error('tak boleh ada pemutus miring');
  if (s.includes('TERBUKA')) throw new Error('tak boleh ada label TERBUKA');
});
check('baseline: interkoneksi 400 MW berlabel, beban 1100 MW, vital teal tersambung ke bus (dari atas)', () => {
  const s = renderAt(baseP, baseRun, 0);
  if (!s.includes('400 MW')) throw new Error('label impor harus 400 MW');
  if (!s.includes('Beban 1100 MW')) throw new Error('label beban harus 1100 MW');
  // M8: label feeder DUA BARIS (tanpa overlap) — vital = 'VITAL' + '550 MW' terpisah
  if (!s.includes('>VITAL<')) throw new Error('baris 1 vital harus berisi VITAL');
  if (!s.includes('>550 MW<')) throw new Error('baris 2 vital harus berisi 550 MW');
  if (s.includes('VITAL · 550 MW')) throw new Error('label satu baris "VITAL · 550 MW" harus dihapus (M8)');
  // garis vital (teal) harus menempel bus dan turun MENYENTUH kotak feeder (M8: beban di BAWAH bus; F1: y2=400)
  if (!s.includes('x1="540" y1="260" x2="540" y2="400" stroke="var(--teal)"')) {
    throw new Error('feeder vital harus tersambung solid dari bus ke tepi kotak dengan warna teal (var(--teal))');
  }
  if (count(s, 'stroke="var(--teal)"') < 2) throw new Error('vital harus bergaris teal');
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
  if (!s.includes('rotate(45 115 243)')) throw new Error('pemutus impor harus miring 45° (M16-B: CB 14×14 di atas bus, pusat 115,243)');
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
  if (!s.includes('stroke="var(--off)"')) throw new Error('simbol G1 harus abu (offline)');
  if (!s.includes('Beban 550 MW · lepas 550')) throw new Error('beban akhir 550 MW dgn total lepas 550');
  if (count(s, 'RPM ') !== 2) throw new Error('hanya G2/G3 yang menampilkan RPM');
});
check('lepas G1: tanpa dasharray di semua keadaan', () => {
  const s = renderAt(g1P, g1Run, T_END);
  if (s.includes('stroke-dasharray')) throw new Error('dilarang stroke-dasharray');
});

/* ── skenario Lepas G2 & Blok G3 (temuan code-review: PRD §4.2/§5.10) ── */
const g2P = scenP('genLoss', { target: 'G2' });
const g2Run = runOf(g2P);
check('Lepas G2: chip G2 TRIP (abu) + 0 MW; G1/G3 online; tanpa dasharray', () => {
  const s = renderAt(g2P, g2Run, g2Run.tMax);
  if (count(s, 'TRIP') !== 1) throw new Error('tepat G2 yang TRIP, dapat ' + count(s, 'TRIP'));
  if (!s.includes('stroke="var(--off)"')) throw new Error('simbol G2 harus abu (offline)');
  if (count(s, 'RPM ') !== 2) throw new Error('hanya G1/G3 yang menampilkan RPM');
  if (s.includes('stroke-dasharray')) throw new Error('tanpa dasharray');
});
const blkP = scenP('block', { target: 'G3', mw: 100 });
const blkRun = runOf(blkP);
check('Blok G3 (maks 100): chip G3 = 100 MW (output dijepit PRD §5.3), bukan 250', () => {
  const s = renderAt(blkP, blkRun, blkRun.tMax);
  const mws = [...s.matchAll(/class="chipmw"[^>]*>([^<]+)</g)].map(m => m[1]);
  if (mws.length !== 3) throw new Error('harus 3 chip MW, dapat ' + mws.length);
  if (mws[2] !== '100 MW') throw new Error('chip G3 harus 100 MW (terblok), dapat ' + mws[2]);
});

/* ── M8: rombak SLD per permintaan user — generator DI ATAS bus, beban DI BAWAH,
   label feeder dua baris (tanpa overlap), pemutus lebih besar 12×12. ── */
check('M8+F3: generator di ATAS bus — lingkaran cy=142 (di atas bus 260), garis naik 260→164 (F3)', () => {
  const s = renderAt(baseP, baseRun, 0);
  if (count(s, 'cy="142"') !== 3) throw new Error('3 lingkaran generator harus di atas bus (cy=142), dapat ' + count(s, 'cy="142"'));
  if (count(s, 'y2="164"') !== 3) throw new Error('garis tiap generator harus naik dari bus (260) ke tepi lingkaran (y2=164), dapat ' + count(s, 'y2="164"'));
  if (s.includes('y2="300"')) throw new Error('generator TIDAK boleh lagi di bawah bus');
});
check('M8+F1: beban di BAWAH bus — kotak feeder y=400, garis turun 260→400 MENYENTUH kotak (gap 8 px hilang)', () => {
  const s = renderAt(baseP, baseRun, 0);
  if (count(s, 'y="400"') !== 5) throw new Error('5 kotak feeder harus di bawah bus (y=400), dapat ' + count(s, 'y="400"'));
  if (count(s, 'y2="400"') !== 5) throw new Error('garis tiap feeder harus turun dari bus (260) ke tepi kotak (y2=400), dapat ' + count(s, 'y2="400"'));
  if (s.includes('y2="392"')) throw new Error('gap 8 px (garis 392, kotak 400) harus dihapus (F1)');
  if (s.includes('y="36"')) throw new Error('feeder TIDAK boleh lagi di atas bus');
});
check('M8: label feeder dua baris tanpa overlap — id di baris 1, MW di baris 2 (semua 1100 MW)', () => {
  const s = renderAt(baseP, baseRun, 0);
  ['T1', 'T2', 'T3', 'T4', 'VITAL'].forEach(id => {
    if (!s.includes('>' + id + '<')) throw new Error('baris 1 harus berisi ' + id);
  });
  ['55 MW', '110 MW', '165 MW', '220 MW', '550 MW'].forEach(mw => {
    if (!s.includes('>' + mw + '<')) throw new Error('baris 2 harus berisi ' + mw);
  });
  if (s.includes('T1 · 55 MW')) throw new Error('label satu baris "T1 · 55 MW" harus dihapus (M8)');
});
check('M9: kotak feeder TIDAK saling tumpuk — 5 kotak lebar 96 @ pitch 105 (celah 9)', () => {
  const s = renderAt(baseP, baseRun, 0);
  const xs = [...s.matchAll(/<rect x="([0-9]+)" y="400" width="96" height="52"/g)].map(m => parseInt(m[1], 10));
  if (xs.length !== 5) throw new Error('harus 5 kotak feeder y=400 lebar 96, dapat ' + xs.length);
  for (let i = 1; i < xs.length; i++) {
    if (xs[i] - xs[i - 1] !== 105) throw new Error('pitch antar kotak harus 105, dapat ' + (xs[i] - xs[i - 1]));
  }
  if (s.includes('width="110" height="52"')) throw new Error('kotak lebar 110 (tumpuk 5 px) harus dihapus (M9)');
});
check('M8+M16-B: pemutus (CB) lebih besar — kini 14×14 (M8: 12×12, semula 8×8), tetap 6 buah', () => {
  const s = renderAt(baseP, baseRun, 0);
  if (count(s, 'class="brk"') !== 6) throw new Error('tetap 6 pemutus (1 impor + 5 feeder)');
  if (count(s, 'width="14" height="14"') !== 6) throw new Error('keenam CB harus 14×14, dapat ' + count(s, 'width="14" height="14"'));
  if (s.includes('width="12" height="12"')) throw new Error('CB 12×12 lama harus dihapus (M16-B)');
  if (s.includes('width="8" height="8"')) throw new Error('CB 8×8 lama harus dihapus (M8)');
});
check('M8: pita vertikal berurutan tanpa tumpuk — gen (≤192) < bus (260) < CB (268+) < kotak (400)', () => {
  const s = renderAt(baseP, baseRun, 0);
  // chip generator pindah ke atas (band 148–192), bukan lagi 296–340
  if (s.includes('y="296"')) throw new Error('chip gen lama y=296 harus pindah ke atas (M8)');
  if (s.includes('y="364"')) throw new Error('label id gen lama y=364 harus pindah ke atas (M8)');
  // CB feeder 14×14 di bawah bus: y=270 (270–284, gap 6,5 dari tepi bus 263,5)
  if (count(s, 'y="270"') !== 5) throw new Error('5 CB feeder harus di y=270 (menjauh dari bus, M16-B)');
});

/* ── M16-A: busbar di layer paling atas — tidak tertindih garis feeder/impor/vital ── */
check('M16-B: CB feeder 14×14 MENJAUH dari bus — y=270 (gap 6,5 px dari tepi bawah bus 263,5), center di x feeder', () => {
  const s = renderAt(baseP, baseRun, 0);
  const cbs = [...s.matchAll(/<rect class="brk"[^>]*x="([0-9]+)" y="270" width="14" height="14"/g)].map(m => parseInt(m[1], 10));
  if (cbs.length !== 5) throw new Error('5 CB feeder harus 14×14 @ y=270, dapat ' + cbs.length + ': ' + cbs);
  const fx = [120, 225, 330, 435, 540];
  fx.forEach((x, i) => { if (cbs[i] !== x - 7) throw new Error('CB ' + (i + 1) + ' harus center di x=' + x + ' (x-7), dapat x=' + cbs[i]); });
  const gap = 270 - (260 + 3.5); // tepi bawah bus = 260 + stroke-width 7/2
  if (gap < 6) throw new Error('gap CB→bus = ' + gap + ' px < 6');
  if (s.includes('width="12" height="12"')) throw new Error('CB 12×12 lama harus dihapus (M16-B)');
  if (count(s, 'y="268"') !== 0) throw new Error('CB yembek y=268 (menempel bus) harus hilang (M16-B)');
});
check('M16-B: CB impor 14×14 di ATAS bus dgn gap simetris — y=236 (bottom 250, gap 6,5 dari tepi atas bus 256,5)', () => {
  const s = renderAt(baseP, baseRun, 0);
  if (!s.includes('x="108" y="236" width="14" height="14"')) throw new Error('CB impor harus 14×14 @ y=236 (gap 6,5 di atas bus), dapat: ' + (s.match(/<rect class="brk"[^>]*x="10[0-9]"[^>]*>/) || [''])[0]);
  if (!s.includes('<line class="imp" x1="115" y1="82" x2="115" y2="236"')) throw new Error('garis impor harus turun sampai tepi CB (y2=236, pola sentuh-simpul), dapat: ' + (s.match(/<line class="imp" x1="115"[^>]*>/) || [''])[0]);
});
check('M16-A: bus digambar TERAKHIR (elemen terakhir dalam string SVG) — tak tertindih hijau/biru/teal', () => {
  const s = renderAt(baseP, baseRun, 0);
  const busPos = s.indexOf('class="bus"');
  if (busPos === -1) throw new Error('bus harus ada');
  const impPos = s.indexOf('class="imp" x1="115"'); // garis impor (biru/ink, kiri)
  const fedPos = s.indexOf('x1="120" y1="260" x2="120" y2="400"'); // feeder T1 (hijau)
  const vitPos = s.indexOf('x1="540" y1="260" x2="540" y2="400"'); // feeder vital (teal)
  if (busPos < impPos) throw new Error('bus (pos ' + busPos + ') harus setelah garis impor (pos ' + impPos + ')');
  if (busPos < fedPos) throw new Error('bus (pos ' + busPos + ') harus setelah feeder T1 hijau (pos ' + fedPos + ')');
  if (busPos < vitPos) throw new Error('bus (pos ' + busPos + ') harus setelah feeder vital teal (pos ' + vitPos + ')');
});

check('M16-C: label feeder lebih besar — id font 13, MW font 12 (sebelumnya 11/10,5)', () => {
  const s = renderAt(baseP, baseRun, 0);
  const idFs = [...s.matchAll(/<text x="(?:120|225|330|435|540)" y="(?:422|426)"[^>]*font-size="([0-9.]+)"/g)].map(m => parseFloat(m[1]));
  const mwFs = [...s.matchAll(/<text x="(?:120|225|330|435|540)" y="(?:440|446)"[^>]*font-size="([0-9.]+)"/g)].map(m => parseFloat(m[1]));
  if (idFs.length !== 5) throw new Error('5 label id feeder dibutuhkan, dapat ' + idFs.length);
  if (mwFs.length !== 5) throw new Error('5 label MW feeder dibutuhkan, dapat ' + mwFs.length);
  idFs.forEach(f => { if (f !== 13) throw new Error('font id feeder harus 13 (M16-C), dapat ' + f); });
  mwFs.forEach(f => { if (f !== 12) throw new Error('font MW feeder harus 12 (M16-C), dapat ' + f); });
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

/* ── plan-03 P3: label AGC di chip SLD saat setpoint sekunder aktif ── */
const agcP = scenP('loadStep', { mw: 200 });
const agcRun = runOf(agcP);
check('plan-03: chip "AGC" muncul di SEMUA unit online SETELAH langkah AGC (+200, t=pasca langkah 1)', () => {
  const t1 = agcRun.agcSteps[0].t;
  const s = renderAt(agcP, agcRun, t1 + 0.05);
  const tags = count(s, 'class="agctag"');
  if (tags !== 3) throw new Error('ketiga unit menerima setpoint AGC → 3 label agctag, dapat ' + tags);
  if (!s.includes('>AGC<')) throw new Error('teks label AGC harus ada');
});
check('plan-03: tanpa AGC (agcOn=false) atau sebelum langkah → tanpa label agcctag', () => {
  const s0 = renderAt(agcP, agcRun, 0);
  if (count(s0, 'class="agctag"') !== 0) throw new Error('t=0 belum boleh ada label AGC');
  const pOff = scenP('loadStep', { mw: 200 });
  pOff.agcOn = false;
  const runOff = runOf(pOff);
  const sOff = renderAt(pOff, runOff, runOff.tMax);
  if (count(sOff, 'class="agctag"') !== 0) throw new Error('agcOn=false tidak boleh ada label AGC');
});
check('plan-03: MW chip = droop + setpoint AGC, tidak pernah melewati govMax', () => {
  const t1 = agcRun.agcSteps[0].t;
  const s = renderAt(agcP, agcRun, t1 + 0.05);
  const re = /class="chipmw"[^>]*>([0-9]+) MW(?: · maks gov)?</g;
  const vals = [];
  let mm;
  while ((mm = re.exec(s))) vals.push(parseInt(mm[1], 10));
  if (vals.length < 3) throw new Error('harus ada 3 chip MW, dapat ' + vals.length);
  const g2 = agcP.gens.find(g => g.id === 'G2');
  if (vals[1] <= g2.p0) throw new Error('MW G2 harus naik karena AGC/droop, dapat ' + vals[1]);
  if (vals[1] > g2.govMax) throw new Error('MW G2 tidak boleh melewati govMax ' + g2.govMax + ', dapat ' + vals[1]);
});

/* ── F2 (plan-05): band generator lega & seimbang — chip 104 @ pitch 180 ── */
check('F2+F3: chip generator 104 lebar (bukan 118) — 3 chip @ y=100 (F3)', () => {
  const s = renderAt(baseP, baseRun, 0);
  const chips = [...s.matchAll(/<rect class="chip"[^>]*x="([0-9]+)" y="100" width="104" height="44"/g)].map(m => parseInt(m[1], 10));
  if (chips.length !== 3) throw new Error('harus 3 chip lebar 104 @ y=100, dapat ' + chips.length + ': ' + chips);
  if (s.includes('width="118" height="44"')) throw new Error('chip lebar 118 harus dihapus (F2)');
});
check('F2: gap chip→lingkaran tetangga >= 20 px & margin kanan >= 30 px', () => {
  const s = renderAt(baseP, baseRun, 0);
  const gx = [170, 350, 530];
  const chipX = [...s.matchAll(/<rect class="chip"[^>]*x="([0-9]+)" y="100" width="104"/g)].map(m => parseInt(m[1], 10));
  if (chipX.length !== 3) throw new Error('3 chip lebar 104 dibutuhkan, dapat ' + chipX.length);
  for (let i = 0; i < 2; i++) {
    const gap = gx[i + 1] - 22 - (chipX[i] + 104); // lingkaran tetangga kiri = gx−22
    if (gap < 20) throw new Error('gap chip' + (i + 1) + '→gen' + (i + 2) + ' = ' + gap + ' px < 20');
  }
  const marginR = 700 - (chipX[2] + 104);
  if (marginR < 30) throw new Error('margin kanan = ' + marginR + ' px < 30');
});
check('F2: baris MW chip font 10 (floor >= 10), tanpa font 11', () => {
  const s = renderAt(baseP, baseRun, 0);
  const mws = [...s.matchAll(/<text class="chipmw"[^>]*font-size="([0-9.]+)"/g)].map(m => m[1]);
  if (mws.length !== 3) throw new Error('3 baris MW chip dibutuhkan, dapat ' + mws.length);
  mws.forEach(fs => {
    if (parseFloat(fs) !== 10) throw new Error('font MW chip harus 10, dapat ' + fs + ' (F2)');
  });
});

/* ── F3 (plan-06): komposisi vertikal — blok impor turun, band gen naik, void ≤ 40 ── */
check('F3: blok interkoneksi turun (y=48) — label id gen y=112, chip y=100, AGC y=84 h=15 (M12-A)', () => {
  const s = renderAt(baseP, baseRun, 0);
  if (!s.includes('x="60" y="48" width="110" height="34"')) throw new Error('blok interkoneksi harus di y=48 (F3)');
  if (count(s, 'y="112"') !== 3) throw new Error('3 label id gen harus di y=112 (F3), dapat ' + count(s, 'y="112"'));
  const t1 = agcRun.agcSteps[0].t;
  const sAgc = renderAt(agcP, agcRun, t1 + 0.05);
  if (count(sAgc, 'class="agctag"') !== 3) throw new Error('3 label AGC dibutuhkan');
  if (!sAgc.includes('y="84" width="32" height="15"')) throw new Error('AGC tag harus y=84 h=15 (teks muat penuh), dapat: ' + (sAgc.match(/<rect class="agctag"[^>]*>/) || [''])[0]);
  if (sAgc.includes('y="86" width="32" height="13"')) throw new Error('AGC tag 86×13 (teks meluber 0,7 px) harus dihapus (M12-A)');
});
/* M12-B (garis impor sentuh CB y2=254) digantikan M16-B: CB impor pindah ke ATAS bus,
   garis kini berakhir di tepi atas CB (y2=236) — asersi serupa ada di cek M16-B. */
check('M12-C: label Beban margin kanan konsisten — x=668 (sejajar tepi chip G3, margin 32 px)', () => {
  const s = renderAt(baseP, baseRun, 0);
  if (!s.includes('<text x="668" y="486" text-anchor="end"')) throw new Error('label Beban harus x=668 (margin kanan 32 px), dapat: ' + (s.match(/<text x="[0-9]+" y="486" text-anchor="end"[^>]*>/) || [''])[0]);
});
check('F3: void vertikal impor→gen <= 40 px (void 90 px lama hilang)', () => {
  const s = renderAt(baseP, baseRun, 0);
  const impRect = s.match(/<rect class="imp" x="([0-9]+)" y="([0-9]+)" width="110" height="34"/);
  if (!impRect) throw new Error('rect impor harus ada');
  const impBottom = parseInt(impRect[2], 10) + 34;
  const cy = parseInt((s.match(/cy="([0-9]+)"/) || [])[1], 10);
  if (!cy) throw new Error('cy lingkaran harus ada');
  const voidPx = cy - 22 - impBottom; // atas lingkaran = cy − r
  if (voidPx > 40) throw new Error('void impor→gen = ' + voidPx + ' px > 40 (F3)');
});

console.log(`\n${passed} lulus, ${failed} gagal`);
process.exit(failed ? 1 : 0);