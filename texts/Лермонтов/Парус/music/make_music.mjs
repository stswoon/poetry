// Музыка к «Парусу»: баркарола 6/8 в ля миноре + море и шторм.
//
// Пэд (виолончели), мелодия, бас, прибой и ветер. Шторм, свет и туча следуют
// за строфами из ../timings.json; громкость под голосом подбирается так, чтобы
// музыка была на ~19 дБ тише голоса.
//
// Запуск: node make_music.mjs [--offset 6.0] [--outro 8.0]
// Пишет music.wav (44.1 кГц, 16 бит, стерео) рядом со скриптом.
// Без зависимостей: numpy на этой машине нет.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const POEM = path.dirname(HERE);
const arg = (name, dflt) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? Number(process.argv[i + 1]) : dflt;
};
const V0 = arg('--offset', 6.0);
const OUTRO = arg('--outro', 8.0);

const SR = 44100;
const T = JSON.parse(fs.readFileSync(path.join(POEM, 'timings.json'), 'utf8'));
const LINES = T.lines.map((l) => ({ s: l.start + V0, e: l.end + V0 }));
const TOTAL = V0 + T.voiceDuration + OUTRO;
const N = Math.ceil(TOTAL * SR);

const S1 = LINES[0].s, S1E = LINES[3].e;
const S2 = LINES[4].s, S2E = LINES[7].e;
const S3 = LINES[8].s, CLOUD = LINES[10].s, END = LINES[11].e;

let seed = 1832;
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
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [a, va] = keys[i - 1], [b, vb] = keys[i];
      return va + (vb - va) * smooth((t - a) / Math.max(1e-6, b - a));
    }
  }
  return keys[keys.length - 1][1];
};

const mus = [new Float32Array(N), new Float32Array(N)];  // музыка: под голосом приглушается
const amb = [new Float32Array(N), new Float32Array(N)];  // море и ветер

function note(buf, t0, dur, m, { gain = 0.2, atk = 0.02, rel = 0.3, pan = 0, kind = 'pluck', vib = 0 } = {}) {
  const f = hz(m), i0 = Math.max(0, Math.floor(t0 * SR));
  const n = Math.min(N - i0, Math.floor((dur + rel) * SR));
  if (n <= 0) return;
  const L = gain * Math.cos((pan + 1) * Math.PI / 4), R = gain * Math.sin((pan + 1) * Math.PI / 4);
  const ph = rnd() * 6.28;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = Math.min(1, t / atk) * (t < dur ? 1 : Math.exp(-(t - dur) / (rel * 0.35)));
    const w = 2 * Math.PI * f * t + ph + vib * Math.sin(2 * Math.PI * 4.6 * t);
    let v;
    if (kind === 'cello') {
      v = 0.62 * Math.sin(w) + 0.26 * Math.sin(2 * w + 0.4) + 0.13 * Math.sin(3 * w + 1.1) + 0.06 * Math.sin(4 * w) + 0.03 * Math.sin(5 * w);
    } else if (kind === 'flute') {
      v = 0.8 * Math.sin(w) + 0.14 * Math.sin(2 * w) + 0.04 * Math.sin(3 * w);
    } else {  // щипок: гитара, лютня
      const d = Math.exp(-t * 2.4);
      v = d * (0.6 * Math.sin(w) + 0.28 * Math.exp(-t * 3) * Math.sin(2 * w) + 0.12 * Math.exp(-t * 5) * Math.sin(3 * w));
    }
    buf[0][i0 + i] += v * env * L;
    buf[1][i0 + i] += v * env * R;
  }
}

function timpani(t0, gain) {
  const i0 = Math.floor(t0 * SR), n = Math.min(N - i0, Math.floor(1.6 * SR));
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const v = Math.exp(-t * 3.2) * Math.sin(2 * Math.PI * (58 + 26 * Math.exp(-t * 16)) * t) * gain;
    mus[0][i0 + i] += v; mus[1][i0 + i] += v;
  }
}

// --- Гармония: 6/8, 1 такт = 2.6 с. Своя последовательность, не цитата ---
const BAR = 2.6, EIGHTH = BAR / 6;
const Am = [45, 52, 57, 60, 64], F = [41, 48, 57, 60, 65], Dm = [38, 50, 57, 62, 65], E = [40, 52, 56, 59, 64];
const C = [36, 52, 55, 60, 64], G = [43, 50, 55, 59, 62], Em = [40, 52, 55, 59, 64], Fm7 = [41, 48, 56, 60, 63];

function harmonyAt(t) {
  if (t < S2 - 1.2) return [Am, Am, F, E, Am, Dm, E, Am][Math.floor(t / BAR) % 8];
  if (t < S3 - 1.0) return [Am, F, Dm, E][Math.floor(t / (BAR / 2)) % 4];
  if (t < CLOUD - 0.2) return [C, G, F, C][Math.floor(Math.max(0, t - S3) / BAR) % 4];
  if (t < END + 0.5) return [F, Dm, E, Am][Math.floor(Math.max(0, t - CLOUD) / BAR) % 4];
  return [Am, F, Fm7, E, Am][Math.min(4, Math.floor(Math.max(0, t - END) / (BAR * 0.62)))];
}

// Мелодия: (восьмых от начала фразы, длина в восьмых, нота)
const PHRASE_A = [[0, 3, 69], [3, 1, 71], [4, 2, 72], [6, 3, 76], [9, 1, 74], [10, 2, 72], [12, 4, 71], [16, 2, 69], [18, 5, 68], [24, 3, 69], [27, 1, 72], [28, 2, 71], [30, 6, 69]];
const PHRASE_C = [[0, 3, 72], [3, 3, 76], [6, 4, 79], [10, 2, 77], [12, 5, 76], [18, 3, 74], [21, 3, 72], [24, 8, 72]];
const phrase = (t0, p, gain, kind) => {
  for (const [at, len, m] of p) {
    note(mus, t0 + at * EIGHTH, len * EIGHTH, m, { gain, atk: 0.09, rel: 0.5, pan: 0.15, kind, vib: 0.35 });
  }
};

// Аккордовый фон, щипки, бас
for (let t = 0; t < TOTAL - 1; t += BAR) {
  const storm = t >= S2 - 1.2 && t < S3 - 1.0;
  const ch = harmonyAt(t + 0.01);
  const fade = 1;
  for (let k = 1; k < ch.length; k++) {
    note(mus, t, BAR * 0.98, ch[k], { gain: (storm ? 0.05 : 0.055) * fade, atk: 0.6, rel: 0.9, pan: -0.35 + 0.18 * k, kind: 'cello', vib: 0.14 });
  }
  note(mus, t, BAR * 0.95, ch[0], { gain: 0.1, atk: 0.3, rel: 0.8, kind: 'cello' });
}
// Качание 6/8 щипками (в шторм — резче)
for (let t = 0; t < TOTAL - 2; t += EIGHTH) {
  const beat = Math.round(t / EIGHTH) % 6;
  const ch = harmonyAt(t + 0.01);
  const storm = t >= S2 - 1.2 && t < S3 - 1.0;
  const m = ch[[1, 3, 4, 2, 3, 4][beat]] + 12 * (beat === 2 ? 0 : 0);
  note(mus, t, EIGHTH * 1.5, m, { gain: (beat % 3 === 0 ? 0.075 : 0.05) * (storm ? 1.15 : 1), atk: 0.004, rel: 0.5, pan: beat % 2 ? 0.3 : -0.3, kind: 'pluck' });
}
phrase(0.6, PHRASE_A, 0.11, 'flute');
phrase(S1 + 3 * BAR + 0.6, PHRASE_A.slice(0, 7), 0.07, 'flute');
phrase(S3, PHRASE_C, 0.1, 'flute');
phrase(END + 0.3, PHRASE_A.slice(9), 0.12, 'flute');

// Шторм: литавры и тремоло
for (let t = S2 - 0.6; t < S3 - 1.4; t += EIGHTH * 3) timpani(t, 0.14);
for (let t = S2; t < S3 - 1.4; t += 0.085) {
  const ch = harmonyAt(t);
  note(mus, t, 0.08, ch[2] + 12, { gain: 0.016, atk: 0.006, rel: 0.05, pan: rnd() - 0.5, kind: 'cello' });
}
// Туча вдали: глухой гром
for (const [t, g] of [[CLOUD + 1.4, 0.05], [END + 1.5, 0.08], [TOTAL - 3.4, 0.06]]) timpani(t, g);

// --- Море и ветер: фильтрованный шум ---
{
  let a = 0, b = 0, wL = 0, wR = 0, nL = 0, nR = 0;
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const sea = 0.5 + 0.5 * Math.sin(2 * Math.PI * t / 5.2) ** 2;  // накат
    const storm = curve([[0, 0.05], [S2 - 1.6, 0.05], [S2, 0.8], [S2E, 0.9], [S3 - 0.3, 0.1], [CLOUD, 0.06], [END, 0.2], [TOTAL, 0.12]], t);
    const gust = 0.55 + 0.45 * Math.sin(2 * Math.PI * t / 2.1 + 1.4 * Math.sin(t * 0.7));
    a += 0.03 * ((rnd() - 0.5) - a);
    b += 0.09 * ((rnd() - 0.5) - b);
    const seaL = a * (0.5 + 0.9 * sea) * (0.65 + 1.3 * storm);
    nL += 0.3 * ((rnd() - 0.5) - nL); nR += 0.3 * ((rnd() - 0.5) - nR);
    wL += (0.04 + 0.11 * gust) * (nL - wL); wR += (0.04 + 0.11 * gust) * (nR - wR);
    amb[0][i] = 1.1 * seaL + 0.25 * b * sea + 1.4 * storm * gust * wL;
    amb[1][i] = 1.1 * seaL + 0.25 * b * sea + 1.4 * storm * gust * wR;
  }
}

// --- Громкость под голосом: сравниваем RMS речи и музыки ---
function voiceRms() {
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', path.join(POEM, 'voice.mp3'), '-f', 'f32le', '-ac', '1', '-ar', String(SR), '-'], { maxBuffer: 1 << 28 });
  const f = new Float32Array(raw.buffer, raw.byteOffset, raw.length >> 2);
  let sum = 0, cnt = 0;
  for (const l of T.lines) {
    for (let i = Math.floor(l.start * SR); i < l.end * SR && i < f.length; i++) { sum += f[i] * f[i]; cnt++; }
  }
  return Math.sqrt(sum / cnt);
}
const rmsOf = (t0, t1) => {
  let sum = 0, cnt = 0;
  for (let i = Math.floor(t0 * SR); i < t1 * SR; i += 3) {
    const a = mus[0][i] + amb[0][i], b = mus[1][i] + amb[1][i];
    sum += a * a + b * b; cnt += 2;
  }
  return Math.sqrt(sum / cnt);
};

const VR = voiceRms();
const TARGET_DB = -19;
// Отдельные коэффициенты на три части: шторм по природе громче
const gains = [[S1, S1E], [S2, S2E], [S3, END]].map(([a, b]) => (VR * 10 ** (TARGET_DB / 20)) / rmsOf(a, b));
console.log('voice rms', VR.toFixed(4), 'gains', gains.map((g) => g.toFixed(3)).join(' '));

const INTRO_GAIN = Math.max(...gains) * 5, OUTRO_GAIN = Math.max(...gains) * 5.5;
const gainKeys = [
  [0, 0], [0.5, INTRO_GAIN], [V0 - 1.3, INTRO_GAIN], [S1 - 0.1, gains[0]], [S1E, gains[0]],
  [S2 - 0.7, gains[1]], [S2E, gains[1]], [S3 - 0.7, gains[2]], [END + 0.1, gains[2]],
  [END + 1.1, OUTRO_GAIN], [TOTAL - 2.2, OUTRO_GAIN], [TOTAL - 0.15, 0], [TOTAL, 0],
];

// Простая реверберация на музыку: разнесённые гребенчатые задержки
const out = [new Float32Array(N), new Float32Array(N)];
for (const ch of [0, 1]) {
  const delays = (ch ? [1277, 1693, 2111, 2593] : [1213, 1601, 2039, 2711]).map((d) => d * 3);
  const lines = delays.map((d) => new Float32Array(d));
  const pos = delays.map(() => 0);
  for (let i = 0; i < N; i++) {
    const x = mus[ch][i];
    let wet = 0;
    for (let d = 0; d < lines.length; d++) {
      const y = lines[d][pos[d]];
      lines[d][pos[d]] = x + y * 0.58;
      pos[d] = (pos[d] + 1) % delays[d];
      wet += y;
    }
    out[ch][i] = x + 0.11 * wet + amb[ch][i];
  }
}
let peak = 0;
for (let i = 0; i < N; i++) {
  const g = curve(gainKeys, i / SR);
  out[0][i] *= g; out[1][i] *= g;
  peak = Math.max(peak, Math.abs(out[0][i]), Math.abs(out[1][i]));
}
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
