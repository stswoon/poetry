// Музыка к «Травка зеленеет…»: наигрыш 2/4, ре мажор → си минор (дальние страны) → ре мажор.
//
// Балалайка с бряцанием, гусли, на дальних странах и в финале свирель. Шумы только с причиной
// в кадре: щебет ласточки, скрип двери, мазок кисти, дробь зёрен.
// Времена берёт из events.json (пишет ../video/build.py) и ../voice.mp3.
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

function note(t0, dur, m, { gain = 0.2, pan = 0, kind = 'bala' } = {}) {
  const f = hz(m), i0 = Math.max(0, Math.floor(t0 * SR));
  const rel = kind === 'gusli' ? 1.2 : kind === 'bala' ? 0.35 : 0.2;
  const n = Math.min(N - i0, Math.floor((dur + rel) * SR));
  if (n <= 0) return;
  const L = gain * Math.cos((pan + 1) * Math.PI / 4), R = gain * Math.sin((pan + 1) * Math.PI / 4);
  for (let i = 0; i < n; i++) {
    const t = i / SR, w = 2 * Math.PI * f * t;
    let s = 0;
    if (kind === 'bala') s = Math.exp(-t * 7.5) * (Math.sin(w) + 0.55 * Math.exp(-t * 6) * Math.sin(2 * w) + 0.3 * Math.exp(-t * 11) * Math.sin(3 * w) + 0.16 * Math.exp(-t * 18) * Math.sin(5 * w));
    else if (kind === 'gusli') s = Math.exp(-t * 2.8) * (Math.sin(w) + 0.32 * Math.exp(-t * 4) * Math.sin(2 * w) + 0.12 * Math.exp(-t * 9) * Math.sin(4 * w));
    else if (kind === 'bass') s = Math.exp(-t * 5) * (Math.sin(w) + 0.35 * Math.sin(2 * w));
    else if (kind === 'flute') { const a = Math.min(1, t / 0.07) * (t < dur ? 1 : Math.exp(-(t - dur) / 0.08)); const v = Math.sin(w + 0.06 * Math.sin(2 * Math.PI * 5.4 * t) * Math.min(1, t * 2)); s = a * (v + 0.2 * Math.sin(2 * w) + 0.04 * (rnd() - 0.5)); }
    mus[0][i0 + i] += s * L; mus[1][i0 + i] += s * R;
  }
}
// Бряцание: быстрое повторение ноты
const trem = (t0, dur, m, o) => { for (let k = 0; k * 0.0625 < dur; k++) note(t0 + k * 0.0625, 0.05, m, { ...o, gain: o.gain * (k % 2 ? 0.7 : 1) }); };

// Шум в полосе с огибающей: мазок кисти, зёрна
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
// Скрип двери: низкий тон с дрожью, плывёт вверх
function creak(t0, dur, g, pan) {
  const i0 = Math.floor(t0 * SR), n = Math.min(N - i0, Math.floor(dur * SR));
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const u = i / n, f = 340 + 240 * u + 40 * Math.sin(u * 40);
    ph += 2 * Math.PI * f / SR;
    const s = (Math.sin(ph) + 0.5 * Math.sin(2.02 * ph) + 0.3 * Math.sin(3.05 * ph)) * Math.sin(Math.PI * u) * (0.55 + 0.45 * Math.sin(2 * Math.PI * 38 * u * dur)) * g;
    sfx[0][i0 + i] += s * Math.cos((pan + 1) * Math.PI / 4); sfx[1][i0 + i] += s * Math.sin((pan + 1) * Math.PI / 4);
  }
}

// ---------- ноты: восьмая 0,25 с, такт 2/4 — 1 с ----------
const E8 = 0.25, BAR = 4 * E8;
const CH = { D: [38, 57, 62, 66], G: [43, 59, 62, 67], Bm: [35, 54, 59, 62], A: [33, 57, 61, 64], Em: [40, 55, 59, 64], Fsm: [42, 57, 61, 66] };
const MAJ = ['D', 'Bm', 'Em', 'A', 'D', 'G', 'A', 'D'], MIN = ['Bm', 'Fsm', 'G', 'A'];
const inFar = (t) => t >= EV.L11 - 0.2 && t < EV.E12 + 0.4;
const chordAt = (t) => { const b = Math.floor(t / BAR); return inFar(t) ? MIN[b % 4] : MAJ[b % 8]; };
// Своя мелодия: подпрыгивает вверх и кружит, как ласточка над двором
const MEL = [[0, 74, 1], [1, 78, 1], [2, 81, 2], [4, 83, 1], [5, 81, 1], [6, 78, 2], [8, 76, 1], [9, 78, 1], [10, 74, 1], [11, 71, 1], [12, 73, 2], [14, 76, 2],
             [16, 74, 1], [17, 78, 1], [18, 81, 2], [20, 86, 1], [21, 83, 1], [22, 81, 2], [24, 79, 1], [25, 78, 1], [26, 76, 1], [27, 73, 1], [28, 74, 4]];
const MEL_LEN = 32;
function melody(t0, t1, opt, shift = 0) {
  for (let k = Math.floor(t0 / (MEL_LEN * E8)); k * MEL_LEN * E8 < t1; k++) {
    for (const [s, m, d] of MEL) {
      const at = (k * MEL_LEN + s) * E8;
      if (at < t0 || at >= t1) continue;
      if (opt.kind === 'bala' && d >= 2) trem(at, d * E8 * 0.9, m + shift, opt);
      else note(at, d * E8 * 0.95, m + shift, opt);
    }
  }
}
for (let b = 0; b * BAR < TOTAL - 0.3; b++) {
  const t = b * BAR, c = CH[chordAt(t)];
  note(t, E8, c[0] + 12, { kind: 'bass', gain: 0.32 });
  note(t + 2 * E8, E8, c[0] + 19, { kind: 'bass', gain: 0.2 });
  for (const s of [1, 3]) for (const [i, p] of [[1, -0.3], [2, 0], [3, 0.3]]) note(t + s * E8 + (i - 1) * 0.008, E8 * 0.7, c[i], { kind: 'bala', gain: inFar(t) ? 0.05 : 0.085, pan: p });
  // гусли перебором
  if (inFar(t) || t < EV.L1 - 0.4 || t > EV.E12) for (let i = 0; i < 4; i++) note(t + i * E8, 0.4, c[1 + i % 3] + 12, { kind: 'gusli', gain: 0.09, pan: -0.35 + i * 0.2 });
}
melody(0, EV.L11 - 0.2, { kind: 'bala', gain: 0.16, pan: 0.15 });
melody(EV.E12 + 0.4, TOTAL - 0.8, { kind: 'bala', gain: 0.16, pan: 0.15 });
// свирель: на дальних странах свой протяжный напев, в финале вторит наигрышу
for (const [s, m, d] of [[0, 71, 1.5], [1.5, 74, 0.5], [2, 73, 1], [3, 69, 1], [4, 71, 2]]) note(EV.L11 - 0.1 + s * 0.75, d * 0.75, m + 12, { kind: 'flute', gain: 0.085, pan: -0.25 });
melody(EV.E12 + 1.0, TOTAL - 0.8, { kind: 'flute', gain: 0.06, pan: -0.2 }, 12);

// ---------- шумы ----------
const stroke = (a, b, pan, g = 0.09) => noise(a, b - a, { gain: g, lo: 900, hi: 6500, am: 4, amDepth: 0.55, atk: 0.06, rel: 0.1, pan });
stroke(EV.wipe0, EV.wipe0e, 0); stroke(EV.wipe1, EV.wipe1e, 0.4); stroke(EV.wipe2, EV.wipe2e, 0.4); stroke(EV.wipe3, EV.wipe3e, 0.4);
twitter(EV.L3 + 0.1, 0.7, 0.07); twitter(EV.las + 1.1, 0.1, 0.08); twitter(EV.let, -0.3, 0.08);
twitter(EV.L7 - 0.15, -0.1, 0.1); twitter(EV.E7 + 0.02, -0.1, 0.09); twitter(EV.E10 + 0.1, -0.1, 0.1);
twitter(EV.E12 + 0.3, -0.1, 0.1); twitter(EV.wipe3e + 1.0, -0.1, 0.08); twitter(TOTAL - 3.2, -0.1, 0.08);
creak(EV.sen - 0.05, 0.5, 0.05, -0.5);
for (let i = 0; i < 16; i++) { const t = EV.zer + 0.28 + i * 0.03 + rnd() * 0.05; noise(t, 0.022, { gain: 0.18, lo: 2500, hi: 9000, atk: 0.002, rel: 0.012, pan: -0.15 }); }

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
const G = (VR * 10 ** (-19 / 20)) / rmsOf(EV.L1, EV.E12);
const LOUD = G * 4.0, MID = G * 1.7;
const gainKeys = [[0, 0], [0.2, LOUD], [EV.L1 - 1.1, LOUD], [EV.L1 - 0.1, G],
  [EV.E4, G], [EV.E4 + 0.25, MID], [EV.L5 - 0.2, MID], [EV.L5, G],
  [EV.E8, G], [EV.E8 + 0.25, MID], [EV.L9 - 0.2, MID], [EV.L9, G],
  [EV.E12, G], [EV.E12 + 0.9, LOUD], [TOTAL - 1.8, LOUD], [TOTAL - 0.1, 0], [TOTAL, 0]];
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
      lines[d][pos[d]] = x + y * 0.5;
      pos[d] = (pos[d] + 1) % delays[d];
      wet += y;
    }
    out[ch][i] = x + 0.08 * wet;
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
