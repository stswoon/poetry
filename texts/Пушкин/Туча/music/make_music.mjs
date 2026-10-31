// Музыка к «Туче»: вальс 3/4, ре минор → ре мажор.
//
// Первая строфа: фортепиано и струны, спокойно и немного грустно. Вторая (прошлое):
// низкие струны с тремоло и литавры. На «Земля освежилась» переход в ре мажор,
// флейта и челеста. Шумы только с причиной в кадре: шорох бумаги на сборке диорамы,
// треск молнии, гром, дождь, ветер, разгон тучи, звон радуги, птицы в финале.
// Всё привязано к ../timings.json.
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
const LINES = T.lines.map((l) => ({ s: l.start + V0, e: l.end + V0, words: l.words }));
const TOTAL = V0 + T.voiceDuration + OUTRO;
const N = Math.ceil(TOTAL * SR);
const wordAt = (n, w) => LINES[n - 1].words.find((x) => x.text.includes(w)).start + V0;

const S1 = LINES[0].s, S1E = LINES[3].e;
const S2 = LINES[4].s, S2E = LINES[7].e;
const S3 = LINES[8].s, FRESH = LINES[9].s, END = LINES[11].e;

let seed = 1835;
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
const sfx = [new Float32Array(N), new Float32Array(N)];  // шумы: своя постоянная громкость

function note(buf, t0, dur, m, { gain = 0.2, atk = 0.02, rel = 0.3, pan = 0, kind = 'piano', vib = 0, trem = 0 } = {}) {
  const f = hz(m), i0 = Math.max(0, Math.floor(t0 * SR));
  const n = Math.min(N - i0, Math.floor((dur + rel) * SR));
  if (n <= 0) return;
  const L = gain * Math.cos((pan + 1) * Math.PI / 4), R = gain * Math.sin((pan + 1) * Math.PI / 4);
  const ph = rnd() * 6.28;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let env = Math.min(1, t / atk) * (t < dur ? 1 : Math.exp(-(t - dur) / (rel * 0.35)));
    if (trem) env *= 0.62 + 0.38 * Math.sin(2 * Math.PI * trem * t);
    const w = 2 * Math.PI * f * t + ph + vib * Math.sin(2 * Math.PI * 4.4 * t);
    let v;
    if (kind === 'strings') {
      v = 0.62 * Math.sin(w) + 0.24 * Math.sin(2 * w + 0.4) + 0.12 * Math.sin(3 * w + 1.1) + 0.05 * Math.sin(4 * w);
    } else if (kind === 'flute') {
      v = 0.82 * Math.sin(w) + 0.13 * Math.sin(2 * w) + 0.04 * Math.sin(3 * w);
    } else if (kind === 'celesta') {
      v = Math.exp(-t * 2.6) * (0.7 * Math.sin(w) + 0.25 * Math.exp(-t * 4) * Math.sin(4 * w) + 0.12 * Math.exp(-t * 9) * Math.sin(7.3 * w));
    } else if (kind === 'timp') {
      v = Math.exp(-t * 3.2) * (0.8 * Math.sin(w * (1 + 0.02 * Math.exp(-t * 18))) + 0.25 * Math.exp(-t * 7) * Math.sin(1.6 * w));
    } else {  // войлочное фортепиано: мягкая атака, верхние гармоники гаснут быстро
      const d = Math.exp(-t * 1.5);
      v = d * (0.72 * Math.sin(w) + 0.2 * Math.exp(-t * 2.8) * Math.sin(2 * w + 0.2) + 0.07 * Math.exp(-t * 5) * Math.sin(3 * w + 0.5));
    }
    buf[0][i0 + i] += v * env * L;
    buf[1][i0 + i] += v * env * R;
  }
}

// --- Гармония: 3/4, 1 такт = 2.25 с. Своя последовательность, не цитата ---
const BAR = 2.25, BEAT = BAR / 3;
const Dm = [38, 57, 62, 65, 69], Bb = [34, 58, 62, 65, 70], Gm = [43, 58, 62, 67, 70], A = [33, 57, 61, 64, 69];
const F = [41, 57, 60, 65, 69], C = [36, 55, 60, 64, 67];
const D = [38, 57, 62, 66, 69], G = [43, 59, 62, 67, 71], Bm = [47, 59, 62, 66, 71], Em = [40, 59, 64, 67, 71];
const PAST0 = S2 - 1.1;

function harmonyAt(t) {
  if (t < PAST0) return [Dm, Bb, F, A, Dm, Gm, Bb, A][Math.floor(t / BAR) % 8];
  if (t < S3 - 0.3) return [Dm, Gm, Dm, A, Bb, A, Dm, A][Math.floor((t - PAST0) / BAR) % 8];
  if (t < FRESH - 0.2) return [Bb, A][Math.floor((t - S3 + 0.3) / BAR) % 2];
  if (t < END + 0.4) return [D, Bm, G, A, D, G, Em, A][Math.floor((t - FRESH + 0.2) / BAR) % 8];
  return [D, G, A, Bm, G, A, D, D][Math.min(7, Math.floor((t - END - 0.4) / BAR))];
}
const isPast = (t) => t >= PAST0 && t < S3 - 0.3;

// Мелодия: (долей от начала фразы, длина в долях, нота)
const PHRASE_A = [[0, 3, 74], [3, 2, 77], [5, 1, 76], [6, 3, 74], [9, 2, 70], [11, 1, 72], [12, 2, 69], [14, 1, 70], [15, 3, 72], [18, 6, 69]];
const PHRASE_B = [[0, 2, 69], [2, 1, 70], [3, 3, 72], [6, 2, 70], [8, 1, 69], [9, 3, 65]];
const PHRASE_C = [[0, 3, 78], [3, 2, 81], [5, 1, 79], [6, 3, 78], [9, 2, 74], [11, 1, 76], [12, 3, 78], [15, 2, 76], [17, 1, 73], [18, 6, 74]];
const phrase = (t0, p, gain, kind = 'flute', pan = 0.15) => {
  for (const [at, len, m] of p) {
    note(mus, t0 + at * BEAT, len * BEAT, m, { gain, atk: 0.08, rel: 0.6, pan, kind, vib: 0.3 });
  }
};

// Струнный фон и бас
for (let t = 0; t < TOTAL - 0.5; t += BAR) {
  const ch = harmonyAt(t + 0.01);
  const past = isPast(t + 0.01);
  for (let k = 1; k < ch.length; k++) {
    note(mus, t, BAR * 0.98, ch[k] - (past ? 12 : 0), {
      gain: past ? 0.055 : 0.04, atk: past ? 0.25 : 0.6, rel: 0.9, pan: -0.35 + 0.18 * k, kind: 'strings', vib: 0.12, trem: past ? 7.5 : 0,
    });
  }
  note(mus, t, BAR * 0.95, ch[0], { gain: past ? 0.13 : 0.085, atk: 0.3, rel: 0.8, kind: 'strings' });
}
// Вальс фортепиано: бас на первую долю, аккорд на вторую и третью; в прошлом только литавры
for (let t = 0; t < TOTAL - 2; t += BEAT) {
  const beat = Math.round(t / BEAT) % 3;
  const ch = harmonyAt(t + 0.01);
  if (isPast(t + 0.01)) {
    if (beat === 0) note(mus, t, BEAT, ch[0] + 12, { gain: 0.12, atk: 0.004, rel: 0.5, kind: 'timp' });
    continue;
  }
  if (beat === 0) {
    note(mus, t, BEAT * 1.6, ch[0] + 12, { gain: 0.1, atk: 0.008, rel: 0.7, pan: -0.15 });
  } else {
    note(mus, t, BEAT * 1.1, ch[beat === 1 ? 2 : 3] + 12, { gain: 0.05, atk: 0.008, rel: 0.5, pan: 0.2 });
    note(mus, t, BEAT * 1.1, ch[beat === 1 ? 3 : 4] + 12, { gain: 0.042, atk: 0.008, rel: 0.5, pan: 0.32 });
  }
}
phrase(0.2, PHRASE_A, 0.095);                // заставка
phrase(S1E + 0.02, PHRASE_B.slice(0, 3), 0.05);  // пауза после первой строфы
phrase(FRESH + 0.1, PHRASE_C.slice(0, 6), 0.05);
phrase(END + 0.25, PHRASE_C, 0.1);

// --- Шумы ---
function noiseBurst(t0, dur, gain, { pan = 0, lo = 0.05, hi = 0, shape = (u) => Math.sin(Math.PI * u) } = {}) {
  const i0 = Math.max(0, Math.floor(t0 * SR)), n = Math.min(N - i0, Math.floor(dur * SR));
  if (n <= 0) return;
  let a = 0, b = 0;
  const L = Math.cos((pan + 1) * Math.PI / 4), R = Math.sin((pan + 1) * Math.PI / 4);
  for (let i = 0; i < n; i++) {
    const x = rnd() - 0.5;
    a += lo * (x - a);
    b += hi * (a - b);
    const v = (a - b) * shape(i / n) * gain;
    sfx[0][i0 + i] += v * L;
    sfx[1][i0 + i] += v * R;
  }
}
// Бумага: мягкий шлепок и шорох на каждом слое сборки
[0.05, 0.25, 0.4, 0.55, 0.7, 0.85].forEach((t, i) => {
  note(sfx, t, 0.06, 45 + i, { gain: 0.25, atk: 0.003, rel: 0.2, kind: 'timp', pan: -0.3 + i * 0.12 });
  noiseBurst(t, 0.2, 0.5, { lo: 0.55, hi: 0.08, pan: -0.3 + i * 0.12, shape: (u) => Math.exp(-u * 5) });
});
// Клочки на «рассеянной»
noiseBurst(wordAt(1, 'рассеянной'), 0.7, 0.4, { lo: 0.5, hi: 0.1, pan: -0.4 });
// Молния: сухой треск и хвост
for (const dt of [0, 0.6]) {
  const t0 = wordAt(6, 'молния') + dt;
  noiseBurst(t0, 0.28, dt ? 1.0 : 1.5, { lo: 0.8, hi: 0.2, shape: (u) => Math.exp(-u * 7) });
  noiseBurst(t0 + 0.05, 1.0, dt ? 3.5 : 5, { lo: 0.03, hi: 0.002, shape: (u) => Math.exp(-u * 4) });
}
// Гром: долгий низкий раскат, волнами
{
  const t0 = wordAt(7, 'гром') - 0.1;
  noiseBurst(t0, 3.2, 24, { lo: 0.012, hi: 0.0008, shape: (u) => (Math.min(1, u * 14)) * Math.exp(-u * 2.6) * (0.65 + 0.35 * Math.sin(u * 26)) });
}
// Дождь: шипящий шум с мягким нарастанием
{
  const a = LINES[7].s - 0.4, b = S3 + 0.6;
  noiseBurst(a, b - a, 0.8, { lo: 0.75, hi: 0.2, shape: (u) => smooth(u * 5) * smooth((1 - u) * 3.5) });
  noiseBurst(a, b - a, 0.8, { lo: 0.7, hi: 0.2, pan: 0.5, shape: (u) => smooth(u * 5) * smooth((1 - u) * 3.5) });
}
// Звон радуги
[86, 90, 93, 98, 102, 105].forEach((m, i) => {
  note(sfx, wordAt(10, 'освежилась') + 0.2 + i * 0.1, 0.1, m, { gain: 0.12 * (1 - i * 0.08), atk: 0.002, rel: 1.8, pan: -0.55 + 0.22 * i, kind: 'celesta' });
});
// Разгон тучи: шум нарастает и уходит вправо
noiseBurst(LINES[11].s + 0.3, END - LINES[11].s + 0.1, 3.6, { lo: 0.1, hi: 0.03, pan: 0.6, shape: (u) => u * u * smooth((1 - u) * 6) });
// Птицы в финале: короткие посвисты
for (let i = 0; i < 9; i++) {
  const t0 = END + 1.4 + i * 0.62 + rnd() * 0.25;
  const m = 91 + Math.floor(rnd() * 6);
  note(sfx, t0, 0.05, m, { gain: 0.06, atk: 0.005, rel: 0.08, pan: -0.6 + rnd() * 1.2, kind: 'flute' });
  note(sfx, t0 + 0.09, 0.05, m + 3, { gain: 0.05, atk: 0.005, rel: 0.08, pan: -0.6 + rnd() * 1.2, kind: 'flute' });
}

// Ветер: фильтрованный шум. Порыв на «сокройся», ласковый ветер в строках 11–12
{
  let nL = 0, nR = 0, wL = 0, wR = 0;
  const gustT = wordAt(9, 'сокройся');
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const lvl = curve([[0, 0.01], [S2 - 1, 0.015], [S2, 0.06], [S2E, 0.07], [gustT, 0.2], [gustT + 1.2, 0.05], [FRESH, 0.02], [LINES[10].s - 0.3, 0.02], [LINES[10].s + 0.6, 0.13], [END, 0.1], [END + 2, 0.02], [TOTAL, 0.012]], t);
    const gust = 0.55 + 0.45 * Math.sin(2 * Math.PI * t / 2.9 + 1.4 * Math.sin(t * 0.5));
    nL += 0.3 * ((rnd() - 0.5) - nL); nR += 0.3 * ((rnd() - 0.5) - nR);
    wL += (0.03 + 0.08 * gust) * (nL - wL); wR += (0.03 + 0.08 * gust) * (nR - wR);
    sfx[0][i] += 20 * lvl * gust * wL;
    sfx[1][i] += 20 * lvl * gust * wR;
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
    sum += mus[0][i] ** 2 + mus[1][i] ** 2; cnt += 2;
  }
  return Math.sqrt(sum / cnt);
};

const VR = voiceRms();
const TARGET_DB = -19;
const gains = [[S1, S1E], [S2, S2E], [S3, END]].map(([a, b]) => (VR * 10 ** (TARGET_DB / 20)) / rmsOf(a, b));
console.log('voice rms', VR.toFixed(4), 'gains', gains.map((g) => g.toFixed(3)).join(' '));

const INTRO_GAIN = Math.max(...gains) * 5, OUTRO_GAIN = Math.max(...gains) * 5.5;
const gainKeys = [
  [0, 0], [0.5, INTRO_GAIN], [V0 - 1.3, INTRO_GAIN], [S1 - 0.1, gains[0]], [S1E, gains[0]],
  [S2 - 0.7, gains[1]], [S2E, gains[1]], [S3, gains[2]], [END + 0.1, gains[2]],
  [END + 1.1, OUTRO_GAIN], [TOTAL - 2.2, OUTRO_GAIN], [TOTAL - 0.15, 0], [TOTAL, 0],
];

// Простая реверберация на музыку: разнесённые гребенчатые задержки
const out = [new Float32Array(N), new Float32Array(N)];
for (const ch of [0, 1]) {
  const delays = (ch ? [1277, 1693, 2111, 2593] : [1213, 1601, 2039, 2711]).map((d) => d * 3);
  const lines = delays.map((d) => new Float32Array(d));
  const pos = delays.map(() => 0);
  for (let i = 0; i < N; i++) {
    const x = mus[ch][i] * curve(gainKeys, i / SR) + sfx[ch][i] * VR * 1.6;
    let wet = 0;
    for (let d = 0; d < lines.length; d++) {
      const y = lines[d][pos[d]];
      lines[d][pos[d]] = x + y * 0.6;
      pos[d] = (pos[d] + 1) % delays[d];
      wet += y;
    }
    out[ch][i] = x + 0.13 * wet;
  }
}
let peak = 0;
const tail = Math.floor((TOTAL - 0.2) * SR);
for (let i = 0; i < N; i++) {
  if (i > tail) { const g = (N - i) / (N - tail); out[0][i] *= g; out[1][i] *= g; }
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
