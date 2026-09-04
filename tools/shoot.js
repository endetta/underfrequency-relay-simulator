#!/usr/bin/env node
/**
 * shoot.js — screenshot & laporan tata letak Simulator Underfrequency Relay.
 * Pola tools/shoot.js proyek Differential Relay: headless Chrome via CDP
 * (WebSocket native Node >=22), tanpa dependensi npm.
 *   - shots/<name>.png        (full-page)
 *   - shots/<name>.ascii.txt  (peta ASCII — cara agen "melihat" PNG)
 *   - shots/report.txt        (geometri, overflow, font, exception, status SLD)
 * Pemakaian: CHROME=/path node tools/shoot.js
 */
'use strict';
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const ROOT = path.join(__dirname, '..');
const URL = 'file:///' + path.join(ROOT, 'underfrequency_relay_simulator.html').replace(/\\/g, '/');
const SHOTS = path.join(ROOT, 'tools', 'shots');
fs.mkdirSync(SHOTS, { recursive: true });

const CHROME = process.env.CHROME ||
  'C:/Program Files/Google/Chrome/Application/chrome.exe';
const VIEW_W = 1500, VIEW_H = 1000;

/* ── CDP session minimal ── */
class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map();
    ws.addEventListener('message', (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && this.pending.has(m.id)) { const { res, rej } = this.pending.get(m.id); this.pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((res, rej) => { this.pending.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method, params })); });
  }
  static async connect(url) {
    const ws = new WebSocket(url);
    await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
    return new CDP(ws);
  }
}

function findChrome() {
  return fs.existsSync(CHROME) ? CHROME : null;
}

async function launch(url) {
  const port = 9400 + Math.floor(Math.random() * 900);
  const chrome = spawn(findChrome(), [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--hide-scrollbars', '--mute-audio', '--force-device-scale-factor=1',
    `--remote-debugging-port=${port}`, `--user-data-dir=${path.join(ROOT, 'tools', '.tmp-chrome')}`,
    url
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  const wsUrl = await new Promise((res, rej) => {
    let buf = '';
    const to = setTimeout(() => rej(new Error('Chrome ws timeout')), 20000);
    chrome.stderr.on('data', (d) => {
      buf += d.toString();
      const m = buf.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (m) { clearTimeout(to); res(m[1]); }
    });
    chrome.on('error', rej);
  });
  const http = await fetch(wsUrl.replace(/^ws/, 'http').replace(/\/devtools\/browser\/.*/, '/json'));
  const targets = await http.json();
  const page = targets.find(t => t.type === 'page');
  return { chrome, cdp: await CDP.connect(page.webSocketDebuggerUrl) };
}

async function evalJs(cdp, expr) {
  const r = await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error('eval error: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
  return r.result.value;
}

async function waitReady(cdp) {
  for (let i = 0; i < 120; i++) {
    const s = await evalJs(cdp, 'document.readyState');
    if (s === 'complete') break;
    await new Promise(r => setTimeout(r, 100));
  }
  await evalJs(cdp, 'document.fonts && document.fonts.ready.then(()=>true)');
  // lewati splash secara deterministik (display:none — animasi keluar bukan bagian gate)
  const splashState = await evalJs(cdp, `(() => {
    const sp = document.getElementById('splash');
    if (sp) { sp.style.display = 'none'; sp.classList.add('out'); }
    const rt = document.getElementById('root'); if (rt) rt.classList.add('ready');
    return { found: !!sp, disp: sp && getComputedStyle(sp).display, rootReady: rt && rt.classList.contains('ready') };
  })()`);
  console.log('splash:', JSON.stringify(splashState));
  await new Promise(r => setTimeout(r, 900));
}

async function capture(cdp, name, setupExpr) {
  if (setupExpr) await evalJs(cdp, setupExpr);
  await new Promise(r => setTimeout(r, 120));
  const metrics = await evalJs(cdp, `(() => {
    const rect = (sel) => { const el = document.querySelector(sel); if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; };
    const overflow = [];
    document.querySelectorAll('*').forEach((el) => {
      if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflowX === 'visible') {
        overflow.push({ sel: el.tagName + (el.id ? '#' + el.id : '.' + (el.className || '').toString().split(' ')[0]), sw: el.scrollWidth, cw: el.clientWidth });
      }
    });
    const sldTag = document.getElementById('sldTag');
    const sldSvg = document.getElementById('sld');
    return {
      inner: [window.innerWidth, window.innerHeight],
      doc: [document.documentElement.scrollWidth, document.documentElement.scrollHeight],
      fonts: { space: document.fonts.check('600 13px "Space Grotesk"'), mono: document.fonts.check('12px "JetBrains Mono"'), inter: document.fonts.check('14px "Inter"') },
      rects: {
        colP: rect('.l-p'), sld: rect('.sld-card'), tr: rect('.transport'),
        fch: rect('.chart-card'), vch: rect('.chart-card.v'), side: rect('.side-card'),
        sldsvg: rect('#sld'), scrub: rect('#scrub'), play: rect('#playBtn'),
        fSvg: rect('#fSvg'), gauge: rect('#gauge'), gSvg: rect('#gauge svg'), vSvg: rect('#vSvg')
      },
      transport: (() => { const t = document.querySelector('.transport'); if (!t) return null;
        const cs = getComputedStyle(t); return { h: Math.round(t.getBoundingClientRect().height), disp: cs.display }; })(),
      overflow: overflow.slice(0, 12),
      sld: sldSvg ? { w: sldSvg.getAttribute('width'), h: sldSvg.getAttribute('height'), text: sldSvg.textContent.slice(0, 400) } : null,
      tag: sldTag ? sldTag.textContent : null,
      breakers: (sldSvg ? (sldSvg.innerHTML.match(/data-open="1"/g) || []).length : -1),
      tripLabels: (sldSvg ? (sldSvg.innerHTML.match(/TERBUKA/g) || []).length : -1),
      chipMaks: (sldSvg ? (sldSvg.innerHTML.match(/maks gov/g) || []).length : -1),
      legend: document.querySelectorAll('#legend span').length,
      cards: [...document.querySelectorAll('.card[data-card]')].map(c => c.dataset.card + (c.classList.contains('collapsed') ? '✂' : '')),
      state: (typeof S !== 'undefined') ? { scen: S.param.scenario.kind, tNow: S.ui.tNow, run: !!S.run, status: S.run ? S.run.status : null } : null
    };
  })()`);
  const lm = await cdp.send('Page.getLayoutMetrics');
  const { width, height } = lm.cssContentSize;
  const shot = await cdp.send('Page.captureScreenshot', {
    format: 'png', captureBeyondViewport: true,
    clip: { x: 0, y: 0, width, height, scale: 1 }
  });
  fs.writeFileSync(path.join(SHOTS, name + '.png'), Buffer.from(shot.data, 'base64'));
  fs.writeFileSync(path.join(SHOTS, name + '.json'), JSON.stringify(metrics, null, 1));
  asciiReport(name, path.join(SHOTS, name + '.png'));
  // zoom ASCII khusus kartu SLD (garis tipis hilang di resolusi halaman penuh)
  const sldR = metrics.rects.sld;
  if (sldR) asciiReport(name + '-sld', path.join(SHOTS, name + '.png'), { x: sldR.x - 8, y: sldR.y - 6, w: sldR.w + 16, h: sldR.h + 20, cols: 100, rows: 34 });
  return { name, metrics };
}

/* ── dekode PNG minimal (8-bit RGB/RGBA) + peta ASCII ── */
function decodePng(buf) {
  let off = 8; let w = 0, h = 0, bitDepth = 0, colorType = 0; const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off); const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); bitDepth = data[8]; colorType = data[9]; }
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  if (bitDepth !== 8) throw new Error('bitDepth ' + bitDepth + ' unsupported');
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const ch = colorType === 6 ? 4 : colorType === 2 ? 3 : 1;
  const stride = w * ch;
  const px = Buffer.alloc(w * h * 4);
  let pos = 0;
  const prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[pos++];
    const line = raw.subarray(pos, pos + stride); pos += stride;
    const cur = Buffer.from(line);
    for (let i = 0; i < stride; i++) {
      const a = i >= ch ? cur[i - ch] : 0, b = prev[i], c = i >= ch ? prev[i - ch] : 0;
      let v = cur[i];
      if (f === 1) v = (v + a) & 255;
      else if (f === 2) v = (v + b) & 255;
      else if (f === 3) v = (v + ((a + b) >> 1)) & 255;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        const pr = pa <= pb && pa <= pc ? a : pb <= pc ? b : c; v = (v + pr) & 255; }
      cur[i] = v;
    }
    for (let i = 0; i < stride; i++) px[(y * w + Math.floor(i / ch)) * 4 + (i % ch)] = cur[i];
    if (ch === 3) for (let x = 0; x < w; x++) px[(y * w + x) * 4 + 3] = 255;
    prev.set(cur);
  }
  return { w, h, px };
}

function asciiReport(name, pngPath, crop) {
  try {
    const full = decodePng(fs.readFileSync(pngPath));
    const cropX = crop ? Math.max(0, crop.x) : 0, cropY = crop ? Math.max(0, crop.y) : 0;
    const cropW = crop ? Math.min(full.w - cropX, crop.w) : full.w;
    const cropH = crop ? Math.min(full.h - cropY, crop.h) : full.h;
    const { w, h, px } = { w: cropW, h: cropH, px: full.px };
    const cols = crop ? crop.cols : 108, rows = crop ? crop.rows : 56;
    const cw = Math.max(1, Math.floor(w / cols)), chh = Math.max(1, Math.floor(h / rows));
    let out = name + '  (' + cropW + 'x' + cropH + ')\n';
    for (let ry = 0; ry < rows; ry++) {
      let line = '';
      for (let rx = 0; rx < cols; rx++) {
        let r = 0, g = 0, b = 0, n = 0;
        for (let y = cropY + ry * chh; y < Math.min(full.h, cropY + (ry + 1) * chh); y += 2)
          for (let x = cropX + rx * cw; x < Math.min(full.w, cropX + (rx + 1) * cw); x += 2) {
            const i = (y * full.w + x) * 4; r += px[i]; g += px[i + 1]; b += px[i + 2]; n++;
          }
        r /= n; g /= n; b /= n;
        const lum = 0.3 * r + 0.55 * g + 0.15 * b;
        let chr;
        if (r > g + 34 && r > b + 34) chr = 'R';
        else if (g > r + 26 && g > b + 20) chr = 'G';
        else if (b > r + 26 && b > g + 20) chr = 'B';
        else if (lum > 235) chr = ' ';
        else if (lum > 200) chr = '.';
        else if (lum > 160) chr = ':';
        else if (lum > 120) chr = '=';
        else if (lum > 80) chr = '+';
        else if (lum > 45) chr = '#';
        else chr = '@';
        line += chr;
      }
      out += line.replace(/\s+$/, '') + '\n';
    }
    const third = Math.floor(h / 3);
    let stats = '';
    for (let s = 0; s < 3; s++) {
      let r = 0, g = 0, b = 0, n = 0, dark = 0;
      for (let y = s * third; y < (s + 1) * third; y += 4)
        for (let x = 0; x < w; x += 4) {
          const i = (y * w + x) * 4; r += px[i]; g += px[i + 1]; b += px[i + 2]; n++;
          if (0.3 * px[i] + 0.55 * px[i + 1] + 0.15 * px[i + 2] < 120) dark++;
        }
      stats += `  third${s + 1}: avg rgb(${Math.round(r / n)},${Math.round(g / n)},${Math.round(b / n)}) dark% ${(100 * dark / n).toFixed(0)}\n`;
    }
    out += stats;
    fs.writeFileSync(path.join(SHOTS, name + '.ascii.txt'), out);
    console.log('ascii written:', name + '.ascii.txt');
  } catch (e) {
    console.log('ascii failed:', e.message);
  }
}

/* pilih preset (opsional) + skenario lewat DOM, lalu atur playhead & render ulang SLD */
function setScen(id, tNow, preset) {
  return `(() => {
    if (${preset ? `'${preset}'` : 'null'}) {
      const sel = document.getElementById('presetSel');
      sel.value = '${preset}';
      sel.dispatchEvent(new Event('change'));
    }
    const btn = document.querySelector('#scenGroup button[data-scen="${id}"]');
    if (btn) btn.click();
    S.ui.tNow = ${tNow};
    API.renderSldInto();
    API.renderTransport();
  })()`;
}

async function main() {
  const chromePath = findChrome();
  if (!chromePath) { console.error('Chrome tidak ditemukan. Set CHROME=...'); process.exit(1); }
  const { chrome, cdp } = await launch(URL);
  try {
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: VIEW_W, height: VIEW_H, deviceScaleFactor: 1, mobile: false });
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await waitReady(cdp);
    const results = [];
    results.push(await capture(cdp, 'init', `API.computeRun(); API.render();`));
    results.push(await capture(cdp, 'mid', setScen('imp', 2.2, 'berimpor')));
    results.push(await capture(cdp, 'runtuh', setScen('runtuh', 5.5)));
    results.push(await capture(cdp, 'g1-end', setScen('g1', 25)));
    results.push(await capture(cdp, 'collapsed', `API.setAllCollapsed(true);`));
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 700, height: 1000, deviceScaleFactor: 1, mobile: false });
    results.push(await capture(cdp, 'mobile', `API.setAllCollapsed(false); API.computeRun(); API.render();`));
    let rep = 'UFR simulator screenshot report\n';
    for (const r of results) {
      const m = r.metrics;
      rep += `\n== ${r.name} ==\n`;
      rep += `  viewport ${m.inner.join('x')} · doc ${m.doc.join('x')}\n`;
      rep += `  fonts space=${m.fonts.space} mono=${m.fonts.mono} inter=${m.fonts.inter}\n`;
      for (const [k, v] of Object.entries(m.rects)) rep += `  ${k.padEnd(8)} ${v ? v.x + ',' + v.y + ' ' + v.w + 'x' + v.h : 'MISSING'}\n`;
      rep += `  transport h=${m.transport ? m.transport.h : 'MISSING'}px\n`;
      rep += `  overflow: ${m.overflow.length ? JSON.stringify(m.overflow) : 'none'}\n`;
      if (m.state) rep += `  state scen=${m.state.scen} t=${m.state.tNow} run=${m.state.run} status=${m.state.status}\n`;
      rep += `  tag="${m.tag}" · breakers open=${m.breakers} · TERBUKA=${m.tripLabels} · maks gov=${m.chipMaks} · legend=${m.legend}\n`;
      rep += `  cards: ${(m.cards || []).join(' ')}\n`;
      if (m.sld) rep += `  sld svg ${m.sld.w}x${m.sld.h} text[:120]="${m.sld.text.slice(0, 120)}"\n`;
    }
    fs.writeFileSync(path.join(SHOTS, 'report.txt'), rep);
    console.log('done. report → tools/shots/report.txt');
  } finally {
    chrome.kill();
  }
}

main().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });