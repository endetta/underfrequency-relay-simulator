#!/usr/bin/env node
/**
 * shoot-proto.js — capture + metrics untuk PROTOTIPE layout (bukan produk).
 *
 * Pola sama dengan tools/shoot.js milik Differential Relay: headless Chrome
 * via CDP (WebSocket native Node >=22), tanpa dependensi npm. Karena PNG tak
 * bisa "dibaca" langsung oleh agen, skrip ini juga menulis:
 *   - shots/<name>.png        (full-page)
 *   - shots/<name>.ascii.txt  (peta ASCII dari PNG — cara agen "melihat")
 *   - shots/report.txt        (geometri elemen kunci, overflow, font, error)
 *
 * Pemakaian:  CHROME=/path node tools/shoot-proto.js
 */
'use strict';
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const ROOT = path.join(__dirname, '..');
const URL = 'file:///' + path.join(ROOT, 'prototype.html').replace(/\\/g, '/');
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
  const port = 9300 + Math.floor(Math.random() * 900);
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
  // ambil target halaman (bukan devtools browser)
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
  await new Promise(r => setTimeout(r, 700));
}

async function capture(cdp, name, setupExpr) {
  if (setupExpr) await evalJs(cdp, setupExpr);
  await new Promise(r => setTimeout(r, 150));
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
    return {
      inner: [window.innerWidth, window.innerHeight],
      doc: [document.documentElement.scrollWidth, document.documentElement.scrollHeight],
      bodyClass: document.body.className,
      fontSpace: document.fonts.check('13px "Space Grotesk"'),
      fontMono: document.fonts.check('12px "JetBrains Mono"'),
      rects: {
        layout: rect('.layout'), colP: rect('.colP'), sld: rect('.sld'), tr: rect('.tr'),
        fch: rect('.fch'), vch: rect('.vch'), side: rect('.side'), fgauge: rect('.fgauge'),
        gval: rect('.gval'), fsvg: rect('#fSvg'), vsvg: rect('#vSvg'), sldsvg: rect('#sldSvg'), vsw: rect('.vsw')
      },
      css: (() => {
        const lay = document.querySelector('.layout');
        const cs = getComputedStyle(lay);
        const ch = lay.children[0];
        const csc = getComputedStyle(ch);
        return {
          display: cs.display, areas: cs.gridTemplateAreas, cols: cs.gridTemplateColumns,
          childArea: csc.gridArea, childCol: csc.gridColumnStart + '/' + csc.gridColumnEnd,
          childRow: csc.gridRowStart + '/' + csc.gridRowEnd,
          nChildren: lay.children.length,
          bodyClassList: document.body.className,
          sheetOk: [...document.styleSheets].map(s => { try { return s.cssRules.length; } catch (e) { return 'X'; } }).join(',')
        };
      })(),
      overflow: overflow.slice(0, 12),
      state: (typeof sim !== 'undefined') ? { t: sim.ts ? tNow : null, f: sim && sim.fs ? sim.fs[Math.min(sim.fs.length-1, Math.round(tNow/0.005))] : null } : null
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

function asciiReport(name, pngPath) {
  try {
    const { w, h, px } = decodePng(fs.readFileSync(pngPath));
    const cols = 108, rows = 56;
    const cw = Math.max(1, Math.floor(w / cols)), chh = Math.max(1, Math.floor(h / rows));
    let out = name + '  (' + w + 'x' + h + ')\n';
    for (let ry = 0; ry < rows; ry++) {
      let line = '';
      for (let rx = 0; rx < cols; rx++) {
        let r = 0, g = 0, b = 0, n = 0;
        for (let y = ry * chh; y < Math.min(h, (ry + 1) * chh); y += 2)
          for (let x = rx * cw; x < Math.min(w, (rx + 1) * cw); x += 2) {
            const i = (y * w + x) * 4; r += px[i]; g += px[i + 1]; b += px[i + 2]; n++;
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
    // statistik warna per sepertiga halaman
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
    results.push(await capture(cdp, 'proto-a-init', `setVariant('a'); resetSim();`));
    results.push(await capture(cdp, 'proto-a-mid', `setVariant('a'); resetSim(); running=false; tNow=2.2; drawAll();`));
    results.push(await capture(cdp, 'proto-a-runtuh', `setVariant('a'); setScn('runtuh'); running=false; tNow=5.5; drawAll();`));
    results.push(await capture(cdp, 'proto-b-mid', `setVariant('b'); resetSim(); running=false; tNow=2.2; drawAll();`));
    let rep = 'PROTO screenshot report\n';
    for (const r of results) {
      const m = r.metrics;
      rep += `\n== ${r.name} ==\n`;
      rep += `  viewport ${m.inner.join('x')} · doc ${m.doc.join('x')} · body ${m.bodyClass}\n`;
      rep += `  fonts SpaceGrotesk=${m.fontSpace} JetBrainsMono=${m.fontMono}\n`;
      for (const [k, v] of Object.entries(m.rects)) rep += `  ${k.padEnd(8)} ${v ? v.x + ',' + v.y + ' ' + v.w + 'x' + v.h : 'MISSING'}\n`;
      rep += `  overflow: ${m.overflow.length ? JSON.stringify(m.overflow) : 'none'}\n`;
      if (m.state) rep += `  state t=${m.state.t} f=${m.state.f}\n`;
    }
    fs.writeFileSync(path.join(SHOTS, 'report.txt'), rep);
    console.log('done. report → tools/shots/report.txt');
  } finally {
    chrome.kill();
  }
}

main().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });