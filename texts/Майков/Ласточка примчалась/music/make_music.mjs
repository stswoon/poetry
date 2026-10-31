// Музыка к «Ласточке»: 6/8, соль мажор → ми минор (февраль и март) → соль мажор.
//
// Челеста и пиццикато, на зимних строках низкий кларнет, на «весною» колокольчики
// и флейта. Шумы только с причиной в кадре: карандаш, ластик, щебет, ветер, дождь.
// Времена берёт из events.json (пишет ../video/build.py) и ../timings.json.
//
// Запуск: node make_music.mjs
// Пишет music.wav (44.1 кГц, 16 бит, стерео) рядом со скриптом. Без зависимостей.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const POEM = path.dirname(HERE);
const EV = JSON.parse(fs.readFileSync(path.join(HERE, 'events.json'), 'utf8'));
const SR = 44100, TOTAL = EV.total, N = Math.ceil(TOTAL * SR);

let seed = 1858;
const rnd = () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const hz = (m) => 440 * 2 ** ((m - 69) / 12);
const smooth = (u) => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };
const curve = (keys, t) => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) {
    const [a, va] = keys[i - 1], [b, vb] = keys[i];
    return va + (vb - va) * smooth((t - a) / Math.max(1e-6, b - a));
  }
  return keys[keys.length - 1][1];
};

const mus = [new Float32Array(N), new Float32Array(N)];
const sfx = [new Float32Array(N), new Float32Array(N)];

function note(t0, dur, m, { gain = 0.2, pan = 0, kind = 'celesta' } = {}) {
  const f = hz(m), i0 = Math.max(0, Math.floor(t0 * SR));
  const rel = kind === 'pizz' ? 0.25 : kind === 'celesta' || kind === 'bell' ? 1.1 : 0.2;
  const n = Math.min(N - i0, Math.floor((dur + rel) * SR));
  if (n <= 0) return;
  const L = gain * Math.cos((pan + 1) * Math.PI / 4), R = gain * Math.sin((pan + 1) * Math.PI / 4);
  for (let i = 0; i < n; i++) {
    const t = i / SR, w = 2 * Math.PI * f * t;
    let s = 0;
    if (kind === 'celesta') s = Math.exp(-t * 3.2) * (Math.sin(w) + 0.35 * Math.exp(-t * 7) * Math.sin(4 * w) + 0.12 * Math.exp(-t * 11) * Math.sin(8 * w));
    else if (kind === 'bell') s = Math.exp(-t * 2.4) * (Math.sin(w) + 0.5 * Math.exp(-t * 4) * Math.sin(2.76 * w) + 0.25 * Math.exp(-t * 9) * Math.sin(5.4 * w));
    else if (kind === 'pizz') s = Math.exp(-t * 9) * (Math.sin(w) + 0.4 * Math.sin(2 * w) + 0.15 * Math.sin(3 * w));
    else if (kind === 'clar') { const a = Math.min(1, t / 0.07) * (t < dur ? 1 : Math.exp(-(t - dur) / 0.07)); s = a * (Math.sin(w) + 0.4 * Math.sin(3 * w) + 0.18 * Math.sin(5 * w)); }
    else if (kind === 'flute') { const a = Math.min(1, t / 0.06) * (t < dur ? 1 : Math.exp(-(t - dur) / 0.08)); const v = Math.sin(w + 0.05 * Math.sin(2 * Math.PI * 5.2 * t) * Math.min(1, t * 2)); s = a * (v + 0.22 * Math.sin(2 * w) + 0.05 * (rnd() - 0.5)); }
    mus[0][i0 + i] += s * L; mus[1][i0 + i] += s * R;
  }
}

// Шум в полосе с огибающей: карандаш, ластик, ветер, дождь
function noise(t0, dur, { gain = 0.1, lo = 800, hi = 4000, am = 0, amDepth = 0.6, pan = 0, atk = 0.03, rel = 0.05 } = {}) {
  const i0 = Math.max(0, Math.floor(t0 * SR)), n = Math.min(N - i0, Math.floor(dur * SR));
  const aL = 1 - Math.exp(-2 * Math.PI * lo / SR), aH = 1 - Math.exp(-2 * Math.PI * hi / SR);
  let l = 0, h = 0;
  const gL = gain * Math.cos((pan + 1) * Math.PI / 4), gR = gain * Math.sin((pan + 1) * Math.PI / 4);
  for (let i = 0; i < n; i++) {
    const t = i / SR, x = rnd() * 2 - 1;
    l += aL * (x - l); h += aH * (x - h);
    let e = Math.min(1, t / atk) * Math.min(1, (dur - t) / rel);
    if (am) e *= 1 - amDepth + amDepth * Math.abs(Math.sin(Math.PI * am * t));
    sfx[0][i0 + i] += (h - l) * e * gL; sfx[1][i0 + i] += (h - l) * e * gR;
  }
}

function chirp(t0, { gain = 0.1, pan = 0, f0 = 3400, f1 = 4700, dur = 0.09 } = {}) {
  const i0 = Math.floor(t0 * SR), n = Math.min(N - i0, Math.floor(dur * SR));
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const u = i / n, f = f0 + (f1 - f0) * u + 260 * Math.sin(u * 18);
    ph += 2 * Math.PI * f / SR;
    const s = Math.sin(ph) * Math.sin(Math.PI * u) ** 1.2 * gain;
    sfx[0][i0 + i] += s * Math.cos((pan + 1) * Math.PI / 4); sfx[1][i0 + i] += s * Math.sin((pan + 1) * Math.PI / 4);
  }
}
const twitter = (t, pan, g = 0.1) => { for (const [d, a, b] of [[0, 3300, 4600], [0.12, 4500, 3600], [0.22, 3500, 5000], [0.36, 4900, 4100]]) chirp(t + d, { gain: g, pan, f0: a, f1: b }); };

// ---------- ноты: восьмая 0,2 с, такт 1,2 с ----------
const E8 = 0.2, BAR = 6 * E8;
const CH = { G: [43, 59, 62, 67], C: [48, 60, 64, 67], D: [50, 57, 62, 66], Em: [40, 59, 64, 67], Am: [45, 60, 64, 69], B7: [47, 59, 63, 66] };
const prog = (t) => {
  if (t < EV.L4 - 0.3) return ['G', 'C', 'G', 'D'][Math.floor(t / BAR) % 4];
  if (t < EV.L7 - 0.2) return ['Em', 'Am', 'B7', 'Em'][Math.floor(t / BAR) % 4];
  return ['G', 'C', 'D', 'G'][Math.floor(t / BAR) % 4];
};
// Своя мелодия: качается на 6/8, в конце фразы взлёт, как у ласточки
const MEL = [[0, 74, 2], [2, 79, 1], [3, 78, 2], [5, 76, 1], [6, 74, 2], [8, 71, 1], [9, 72, 2], [11, 74, 1],
             [12, 76, 2], [14, 79, 1], [15, 83, 2], [17, 81, 1], [18, 79, 3], [21, 78, 1], [22, 79, 1], [23, 81, 1]];
const MEL_LEN = 24;
function melody(t0, t1, opt, shift = 0) {
  for (let k = Math.floor(t0 / (MEL_LEN * E8)); k * MEL_LEN * E8 < t1; k++) {
    for (const [s, m, d] of MEL) {
      const at = (k * MEL_LEN + s) * E8;
      if (at >= t0 && at < t1) note(at, d * E8, m + shift, opt);
    }
  }
}
for (let b = 0; b * BAR < TOTAL - 0.3; b++) {
  const t = b * BAR, c = CH[prog(t)];
  note(t, E8 * 2, c[0], { kind: 'pizz', gain: 0.3 });
  note(t + E8 * 3, E8 * 2, c[0] + 12, { kind: 'pizz', gain: 0.17 });
  for (const s of [2, 5]) { note(t + s * E8, E8, c[1], { kind: 'pizz', gain: 0.12, pan: -0.25 }); note(t + s * E8, E8, c[2], { kind: 'pizz', gain: 0.12, pan: 0.25 }); }
  if (t >= EV.L4 - 0.3 && t < EV.L7 - 0.2) note(t, BAR * 0.95, c[1] - 12, { kind: 'clar', gain: 0.1, pan: -0.2 });
}
melody(0, EV.L4 - 0.3, { gain: 0.2, pan: 0.15 });
melody(EV.L7 - 0.2, TOTAL - 0.8, { gain: 0.2, pan: 0.15 });
melody(EV.E7 + 0.2, TOTAL - 0.8, { kind: 'flute', gain: 0.075, pan: -0.2 }, 12);
for (const [i, m] of [79, 83, 86, 91, 95].entries()) note(EV.ves + i * 0.1, 0.4, m, { kind: 'bell', gain: 0.1, pan: 0.3 - i * 0.15 });

// ---------- шумы ----------
const pencil = (a, b, g = 0.05, pan = 0) => noise(a, b - a, { gain: g, lo: 2200, hi: 8200, am: 7.5, amDepth: 0.75, pan });
const eraser = (a, b, pan) => noise(a, b - a, { gain: 0.1, lo: 350, hi: 2600, am: 9, amDepth: 0.8, pan });
pencil(0.2, 3.5, 0.03, -0.45); pencil(0.5, 3.2, 0.035, 0.45);
eraser(EV.wipe1, EV.wipe1 + 0.65, -0.45);
pencil(EV.L1, EV.E1, 0.04, 0.45); pencil(EV.L2, EV.L3 + 0.2, 0.04, 0.45);
pencil(EV.L4, EV.L4 + 0.7, 0.04, 0.3); pencil(EV.L5, EV.L5 + 0.7, 0.04, 0.5);
twitter(3.75, 0.4, 0.075); twitter(EV.zap, 0.3, 0.1);
noise(EV.zli - 0.05, 0.7, { gain: 0.14, lo: 250, hi: 1300, atk: 0.2, rel: 0.3, pan: 0.1 });
noise(EV.dozh, EV.L7 - EV.dozh + 0.5, { gain: 0.06, lo: 2500, hi: 9000, atk: 0.25, rel: 0.3, pan: 0.5 });
eraser(EV.L7, EV.L7 + 0.62, 0.4);
pencil(EV.L7 + 0.5, EV.E7 + 1.0, 0.04, 0.45);
twitter(EV.E7 + 0.7, 0.35, 0.09); twitter(EV.final + 1.2, 0.3, 0.075); twitter(TOTAL - 3.4, 0.45, 0.075);
eraser(EV.wipe2, EV.wipe2 + 0.62, -0.45);
pencil(EV.final, EV.final + 3.3, 0.03, -0.45);

// ---------- сведение: под голосом примерно на 19 дБ тише речи ----------
function voiceRms() {
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', path.join(POEM, 'voice.mp3'), '-f', 's16le', '-ac', '1', '-ar', '22050', '-'], { maxBuffer: 1 << 28 });
  let s = 0, c = 0, n = Math.floor(raw.length / 2);
  for (let i = 0; i < n; i++) { const x = raw.readInt16LE(i * 2) / 32768; if (Math.abs(x) > 0.02) { s += x * x; c++; } }
  return Math.sqrt(s / c);
}
function rmsOf(a, b) {
  let s = 0, c = 0;
  for (let i = Math.floor(a * SR); i < Math.min(N, b * SR); i += 3) { s += mus[0][i] ** 2 + mus[1][i] ** 2; c += 2; }
  return Math.sqrt(s / Math.max(1, c));
}
const VR = voiceRms();
const G = (VR * 10 ** (-19 / 20)) / rmsOf(EV.L1, EV.E7);
const LOUD = G * 4.2;
const gainKeys = [[0, 0], [0.2, LOUD], [EV.L1 - 1.1, LOUD], [EV.L1 - 0.1, G], [EV.E7, G], [EV.E7 + 0.9, LOUD], [TOTAL - 1.8, LOUD], [TOTAL - 0.1, 0], [TOTAL, 0]];
console.log('voice rms', VR.toFixed(4), 'gain', G.toFixed(3));

const out = [new Float32Array(N), new Float32Array(N)];
for (const ch of [0, 1]) {
  const delays = (ch ? [1277, 1693, 2111, 2593] : [1213, 1601, 2039, 2711]).map((d) => d * 3);
  const lines = delays.map((d) => new Float32Array(d));
  const pos = delays.map(() => 0);
  for (let i = 0; i < N; i++) {
    const x = mus[ch][i] * curve(gainKeys, i / SR) + sfx[ch][i] * VR * 1.5;
    let wet = 0;
    for (let d = 0; d < lines.length; d++) {
      const y = lines[d][pos[d]];
      lines[d][pos[d]] = x + y * 0.55;
      pos[d] = (pos[d] + 1) % delays[d];
      wet += y;
    }
    out[ch][i] = x + 0.1 * wet;
  }
}
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(out[0][i]), Math.abs(out[1][i]));
const limit = peak > 0.89 ? 0.89 / peak : 1;

const data = Buffer.alloc(44 + N * 4);
data.write('RIFF', 0); data.writeUInt32LE(36 + N * 4, 4); data.write('WAVEfmt ', 8);
data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(2, 22);
data.writeUInt32LE(SR, 24); data.writeUInt32LE(SR * 4, 28); data.writeUInt16LE(4, 32); data.writeUInt16LE(16, 34);
data.write('data', 36); data.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, out[0][i] * limit)) * 32767), 44 + i * 4);
  data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, out[1][i] * limit)) * 32767), 46 + i * 4);
}
fs.writeFileSync(path.join(HERE, 'music.wav'), data);
console.log(`music.wav: ${TOTAL.toFixed(2)} s, peak ${peak.toFixed(3)}, limit ${limit.toFixed(3)}`);
