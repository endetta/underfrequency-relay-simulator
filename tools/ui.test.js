/* Tes SEAM desain (warisan Differential/Distance) + perilaku UI M1:
   splash, judul bergantian .tt-a/.tt-b, collapse animasi anti-blink, tooltip "?",
   scrollbar tipis, transport kompak (≤ 44 px), tab kartu kanan, chip skenario,
   pill status. Bagian grafik/gauge menyusul di M2, isi kartu kanan di M3.
   Jalankan: node tools/ui.test.js */
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
function contains(hay, needle, ctx) { if (!hay.includes(needle)) throw new Error(`${ctx}: harus memuat "${needle}"`); }

const ctx = loadSimulator(HTML);
const A = ctx.pub;

console.log('ui.test.js — seam desain & perilaku UI (M1)');

/* ===== seam desain (src) ===== */
check('splash: #splash krem + judul + huruf S H E V A + .wrap opacity 0', () => {
  contains(src, 'id="splash"', 'markup');
  contains(src, 'Simulator Underfrequency Relay', 'judul');
  contains(src, '<span>S</span><span>H</span><span>E</span><span>V</span><span>A</span>', 'huruf');
  contains(src, '#splash.go{transform:none;}', 'animasi masuk');
  contains(src, '.wrap{opacity:0;}', 'wrap menunggu');
});
check('judul bergantian .tt-a ↔ .tt-b + kilau ttShine (palet krem/copper lembut)', () => {
  contains(src, 'class="tt-a">Simulator Underfrequency Relay', 'tt-a');
  contains(src, 'class="tt-b">by Sheva - Endetta', 'tt-b');
  contains(src, 'ttShine 6s linear infinite,ttSwapA 24s ease-in-out infinite', 'animasi');
  contains(src, 'ttShine 6s linear infinite,ttSwapB 24s ease-in-out infinite', 'animasi b');
  contains(src, '#8A6B4D', 'kilau copper lembut');
});
check('collapse animasi .card-b-i grid 1fr→0fr (bukan display:none) + chev', () => {
  contains(src, '.card .card-b-i{overflow:hidden;min-height:0;}', 'css');
  contains(src, '.card.collapsed .card-b{grid-template-rows:0fr;opacity:0;}', '0fr');
  contains(src, '.card.collapsed .chev{transform:rotate(-90deg);}', 'chev');
  if (src.includes('.card.collapsed .card-b{display:none}')) throw new Error('display:none tidak diizinkan');
});
check('collapse centering DIANIMASI via padding-top + collapsedStackH (anti-blink)', () => {
  if (src.includes('.all-collapsed{justify-content:center}')) throw new Error('centering justify-content → blink');
  contains(src, 'collapsedStackH', 'ukuran tinggi ciut');
  contains(src, 'transition:padding-top .35s ease', 'padding animatable');
  contains(src, "panel.classList.toggle('all-collapsed', all)", 'kelas centering');
});
check('scrollbar tipis global', () => {
  contains(src, 'scrollbar-width:thin', 'firefox');
  contains(src, '*::-webkit-scrollbar{width:6px;height:6px;}', 'webkit');
});
check('tooltip "?": ikon .q[data-tip] + #qTip + delegasi pointerover/out', () => {
  contains(src, 'class="q" data-tip=', 'ikon ?');
  contains(src, '#qTip{position:fixed', 'qTip');
  contains(src, "document.addEventListener('pointerover', qTipHover)", 'delegasi');
  contains(src, 'qTipOut', 'delegasi out');
  contains(src, "@keyframes qIn", 'animasi qTip');
});

/* ===== perilaku (API/harness) ===== */
check('render() default jalan; SLD & transport terisi', () => {
  A.render();
  if (!ctx.els.sld || !ctx.els.sld.innerHTML) throw new Error('#sld harus terisi');
  if (A.renderTransport() !== true) throw new Error('renderTransport harus true');
});
check('transport KOMPAK: tinggi CSS ≤ 44 px', () => {
  const rules = [...src.matchAll(/\.transport\s*\{([^}]*)\}/g)];
  if (!rules.length) throw new Error('.transport CSS tidak ada');
  const heights = rules.map(m => (m[1].match(/height:(\d+(?:\.\d+)?)px/) || [])[1]).filter(Boolean).map(parseFloat);
  if (!heights.length) throw new Error('height tak dideklarasi');
  const min = Math.min(...heights);
  if (min > 44) throw new Error('transport harus ≤ 44 px, dapat ' + min);
});
check('transport: tombol play/kecepatan/scrub/reset + baca t', () => {
  contains(src, 'id="playBtn"', 'play');
  contains(src, 'id="spdGroup"', 'kecepatan');
  contains(src, 'data-spd="0.5"', '0.5×');
  contains(src, 'data-spd="1"', '1×');
  contains(src, 'data-spd="2"', '2×');
  contains(src, 'id="scrub"', 'scrubber');
  contains(src, 'id="resetBtn"', 'reset');
  contains(src, 'id="tNow"', 'waktu');
});
check('kartu kanan: 2 tab (Kondisi sistem / Urutan pelepasan)', () => {
  contains(src, 'id="tabKondisi"', 'tab 1');
  contains(src, 'id="tabUrutan"', 'tab 2');
  contains(src, '>Kondisi sistem<', 'label 1');
  contains(src, '>Urutan pelepasan<', 'label 2');
  A.setSideTab('urutan');
  if (A.S.ui.sideTab !== 'urutan') throw new Error('sideTab harus urutan');
  A.setSideTab('kondisi');
});
check('chip skenario (6) + pill status SLD + slider impor + preset', () => {
  contains(src, 'id="scenGroup"', 'group skenario');
  contains(src, 'Lepas interkoneksi', 'skenario impor');
  contains(src, '+ Beban besar (runtuh)', 'skenario runtuh');
  contains(src, 'id="sldTag"', 'pill status');
  contains(src, 'id="impSlider"', 'slider impor');
  contains(src, 'id="presetSel"', 'preset');
});
check('tidak ada KaTeX & tidak ada kartu ringkasan dot (kartu kanan = tab)', () => {
  if (src.toLowerCase().includes('katex')) throw new Error('KaTeX dilarang (inline SVG saja)');
  if (src.includes('dot-summary')) throw new Error('kartu ringkasan lama tidak dipakai');
});
check('collapse: S.ui.collapsed 4 kartu; all-collapsed → paddingTop set; expand → kosong', () => {
  const keys = Object.keys(A.S.ui.collapsed).sort();
  if (JSON.stringify(keys) !== JSON.stringify(['beban', 'skenario', 'tentang', 'unit'])) {
    throw new Error('kartu collapse harus 4: ' + JSON.stringify(keys));
  }
  A.setAllCollapsed(true);
  if (!A.S.ui.collapsed.unit || !A.S.ui.collapsed.beban) throw new Error('harus semua ciut');
  const panel = ctx.els.paramsPanel;
  if (!panel.classList.contains('all-collapsed')) throw new Error('paramsPanel harus all-collapsed');
  if (!(parseFloat(panel.style.paddingTop) > 0)) throw new Error('paddingTop harus angka positif');
  A.setAllCollapsed(false);
  if (panel.classList.contains('all-collapsed')) throw new Error('all-collapsed harus dilepas');
  if (panel.style.paddingTop !== '') throw new Error('paddingTop harus kosong');
  A.toggleCard('unit');
  if (!A.S.ui.collapsed.unit) throw new Error('toggleCard harus membalik unit');
  A.toggleCard('unit');
  if (A.S.ui.collapsed.unit) throw new Error('toggleCard harus membalik lagi');
});
check('qTip: hover elemen ? → tampil + posisi; out → sembunyi', () => {
  A.qTipHover({ target: { closest: () => ({ dataset: { tip: 'Penjelasan uji' }, getBoundingClientRect: () => ({ left: 100, top: 50, width: 15, height: 15, bottom: 65 }) }) } });
  const tip = ctx.els.qTip;
  if (tip.className !== 'show') throw new Error('qTip harus show');
  if (tip.innerHTML !== 'Penjelasan uji') throw new Error('isi tooltip salah');
  if (!(parseFloat(tip.style.left) > 0) || !(parseFloat(tip.style.top) > 0)) throw new Error('posisi harus diatur');
  A.qTipHover({ target: { closest: () => null } });
  A.qTipOut({ target: { closest: () => ({ dataset: { tip: 'x' } }) } });
  if (tip.className !== '') throw new Error('qTip harus sembunyi');
});
check('status pill mengikuti playhead: skenario impor di t akhir → PELEPASAN BEBAN', () => {
  const p = A.paramP(); p.importMw = 400; p.loadMw = 1500; p.scenario = { kind: 'importLoss' };
  const run = A.ufTimeline(JSON.parse(JSON.stringify(p)));
  A.S.ui.tNow = run.tMax;
  A.S.run = run;
  A.S.param.scenario = { kind: 'importLoss' };
  A.renderSldInto();
  const tag = ctx.els.sldTag;
  if (!tag || tag.textContent.indexOf('PELEPASAN BEBAN') === -1) {
    throw new Error('pill harus PELEPASAN BEBAN, dapat: ' + (tag && tag.textContent));
  }
  A.S.ui.tNow = 0;
  A.S.param.scenario = { kind: 'none' };
  A.computeRun();
});

/* ===== M3: kartu kanan dua tab (renderSide) ===== */
function sideP(over) {
  const p = A.paramP();
  if (over) Object.assign(p, over);
  return p;
}
const impS = sideP({ importMw: 400, loadMw: 1500, scenario: { kind: 'importLoss' } });
const impRunS = A.ufTimeline(JSON.parse(JSON.stringify(impS)));

check('M3: tab Kondisi sistem menampilkan pill + f + ROCOF + beban + pembangkitan + governor + headroom + defisit', () => {
  const h = A.renderSide(impS, impRunS, 0, 'kondisi');
  ['Frekuensi', 'ROCOF awal', 'Beban sistem', 'Pembangkitan', 'Dukungan governor', 'Headroom tersisa', 'Defisit'].forEach(k => {
    if (!h.includes(k)) throw new Error('field ' + k + ' hilang');
  });
  if (h.indexOf('SEIMBANG') === -1) throw new Error('t=0 harus SEIMBANG');
});
check('M3: pill status semantik — PELEPASAN BEBAN di t tengah & RUNTUH saat collapse', () => {
  const mid = A.renderSide(impS, impRunS, 2.2, 'kondisi');
  if (mid.indexOf('PELEPASAN BEBAN') === -1) throw new Error('t=2.2 harus PELEPASAN BEBAN');
  if (mid.indexOf('st-pelepasan') === -1) throw new Error('kelas pill pelepasan');
  const runC = A.ufTimeline(JSON.parse(JSON.stringify(sideP({ scenario: { kind: 'collapse', mw: 1000 } }))));
  const c = A.renderSide(sideP({ scenario: { kind: 'collapse', mw: 1000 } }), runC, runC.tMax, 'kondisi');
  if (c.indexOf('RUNTUH') === -1 || c.indexOf('st-runtuh') === -1) throw new Error('collapse harus RUNTUH + st-runtuh');
});
check('M3: tab Urutan pelepasan — baris tiap trip dgn −MW, t, f, beban before→after + total', () => {
  const h = A.renderSide(impS, impRunS, impRunS.tMax, 'urutan');
  if (h.indexOf('Belum ada pelepasan') !== -1) throw new Error('harus ada trip');
  if (!h.includes('−75 MW') || !h.includes('−150 MW')) throw new Error('baris harus memuat −MW nyata');
  if (!h.includes('beban 1500 → 1425')) throw new Error('beban sebelum→sesudah T1');
  if (h.indexOf('Total lepas') === -1 || h.indexOf('225') === -1) throw new Error('total lepas 225 MW');
});
check('M3: tanpa trip → "Belum ada pelepasan"', () => {
  const h = A.renderSide(sideP(), null, 0, 'urutan');
  if (h.indexOf('Belum ada pelepasan') === -1) throw new Error('harus pesan kosong');
});
check('M3: renderSideInto mengisi #sidePh; tanpa duplikat kartu ringkasan', () => {
  A.renderSideInto();
  if (!ctx.els.sidePh || !ctx.els.sidePh.innerHTML) throw new Error('#sidePh harus terisi');
  if (src.includes('.r-sum')) throw new Error('kartu ringkasan dot tidak dipakai');
});

/* ===== M5: satu layar, splash auto, switch view, kart-dalam-kart (plan-02) ===== */
check('M5: splash AUTO — timer go 20ms, keluar 1350ms, hapus 1860ms, klik=skip, reduced-motion', () => {
  contains(src, "sp.classList.add('go')", 'timer go 20ms');
  contains(src, ', 1350)', 'timer keluar 1350ms');
  contains(src, 'setTimeout(skip, 1860)', 'timer hapus 1860ms');
  contains(src, "sp.addEventListener('click', skip)", 'klik = skip');
  contains(src, 'prefers-reduced-motion', 'reduced-motion');
  contains(src, 'sp.remove()', 'hapus elemen splash');
});
check('M5: kunci satu layar desktop — html/body overflow hidden + layout flex + kolom scroll internal', () => {
  contains(src, 'html,body{height:100%;overflow:hidden;}', 'lock html/body');
  contains(src, '.layout{flex:1;min-height:0', 'layout flex:1');
  contains(src, 'grid-template-rows:minmax(0,1fr)', 'baris viewport');
  contains(src, '.params-panel{flex:1;min-height:0', 'params scroll internal');
  contains(src, '.side-card{flex:1;min-height:0', 'side penuh kolom');
  if (src.includes('position:sticky;top:0')) throw new Error('sticky lama harus dihapus (plan-02 §4.1)');
});
check('M5: switch tengah SLD/Grafik — markup + setView tidak menyentuh run/playhead', () => {
  contains(src, 'data-view="sld"', 'tombol SLD');
  contains(src, 'data-view="graf"', 'tombol Grafik');
  contains(src, 'id="viewSld"', 'view SLD');
  contains(src, 'id="viewGraf"', 'view Grafik');
  const runBefore = A.S.run;
  const tBefore = A.S.ui.tNow;
  A.setView('graf');
  if (A.S.ui.view !== 'graf') throw new Error('S.ui.view harus graf');
  if (!ctx.els.viewSld.classList.contains('hidden')) throw new Error('viewSld harus hidden');
  if (ctx.els.viewGraf.classList.contains('hidden')) throw new Error('viewGraf harus terlihat');
  A.setView('sld');
  if (A.S.ui.view !== 'sld') throw new Error('kembali ke sld');
  if (ctx.els.viewSld.classList.contains('hidden')) throw new Error('viewSld harus terlihat lagi');
  if (A.S.run !== runBefore || A.S.ui.tNow !== tBefore) throw new Error('ganti view TIDAK boleh menyentuh run/playhead');
});
check('M5: kart-dalam-kart — renderGenList menghasilkan .gencard per generator', () => {
  A.render();
  const n = (ctx.els.genList.innerHTML.match(/class="gencard"/g) || []).length;
  if (n !== A.S.param.gens.length) throw new Error('.gencard harus = jumlah gens, dapat ' + n);
});

console.log(`\n${passed} lulus, ${failed} gagal`);
process.exit(failed ? 1 : 0);