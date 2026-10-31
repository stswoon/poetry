// Музыка к «Есть в осени первоначальной»: тихий вальс 3/4 в соль мажоре.
//
// Фортепиано, струнный фон, флейта в паузах голоса. На строке 9 музыка почти
// пропадает («птиц не слышно»), на строке 11 разворачивается вместе с лазурью.
// Шумы только с причиной в кадре: звон на «хрустальный», свист серпа, блик
// на «блестит», ветер в поле. Всё привязано к ../timings.json.
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
const S3 = LINES[8].s, POUR = LINES[10].s, END = LINES[11].e;

let seed = 1857;
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

function note(buf, t0, dur, m, { gain = 0.2, atk = 0.02, rel = 0.3, pan = 0, kind = 'piano', vib = 0 } = {}) {
  const f = hz(m), i0 = Math.max(0, Math.floor(t0 * SR));
  const n = Math.min(N - i0, Math.floor((dur + rel) * SR));
  if (n <= 0) return;
  const L = gain * Math.cos((pan + 1) * Math.PI / 4), R = gain * Math.sin((pan + 1) * Math.PI / 4);
  const ph = rnd() * 6.28;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = Math.min(1, t / atk) * (t < dur ? 1 : Math.exp(-(t - dur) / (rel * 0.35)));
    const w = 2 * Math.PI * f * t + ph + vib * Math.sin(2 * Math.PI * 4.4 * t);
    let v;
    if (kind === 'strings') {
      v = 0.62 * Math.sin(w) + 0.24 * Math.sin(2 * w + 0.4) + 0.12 * Math.sin(3 * w + 1.1) + 0.05 * Math.sin(4 * w);
    } else if (kind === 'flute') {
      v = 0.82 * Math.sin(w) + 0.13 * Math.sin(2 * w) + 0.04 * Math.sin(3 * w);
    } else if (kind === 'celesta') {
      v = Math.exp(-t * 2.6) * (0.7 * Math.sin(w) + 0.25 * Math.exp(-t * 4) * Math.sin(4 * w) + 0.12 * Math.exp(-t * 9) * Math.sin(7.3 * w));
    } else {  // войлочное фортепиано: мягкая атака, верхние гармоники гаснут быстро
      const d = Math.exp(-t * 1.5);
      v = d * (0.72 * Math.sin(w) + 0.2 * Math.exp(-t * 2.8) * Math.sin(2 * w + 0.2) + 0.07 * Math.exp(-t * 5) * Math.sin(3 * w + 0.5));
    }
    buf[0][i0 + i] += v * env * L;
    buf[1][i0 + i] += v * env * R;
  }
}

// --- Гармония: 3/4, 1 такт = 2.4 с. Своя последовательность, не цитата ---
const BAR = 2.4, BEAT = BAR / 3;
const G = [43, 59, 62, 67, 71], Em = [40, 59, 64, 67, 71], C = [36, 60, 64, 67, 72], D = [38, 57, 62, 66, 69];
const Am = [45, 60, 64, 69, 72], Bm = [47, 59, 62, 66, 71], Cadd = [36, 62, 64, 67, 74];

function harmonyAt(t) {
  if (t < S2 - 1.2) return [G, Em, C, D, G, Bm, C, D][Math.floor(t / BAR) % 8];
  if (t < S3 - 0.8) return [Am, Em, C, G, Am, Em, D, D][Math.floor((t - S2 + 1.2) / BAR) % 8];
  if (t < POUR - 0.4) return [Em, C][Math.floor((t - S3 + 0.8) / (BAR * 2)) % 2];
  if (t < END + 0.4) return [C, G, Cadd, G][Math.floor((t - POUR + 0.4) / BAR) % 4];
  return [C, D, Em, C, D, G, G][Math.min(6, Math.floor((t - END - 0.4) / BAR))];
}

// Мелодия: (долей от начала фразы, длина в долях, нота)
const PHRASE_A = [[0, 2, 74], [2, 1, 71], [3, 2, 72], [5, 1, 69], [6, 2, 71], [8, 1, 67], [9, 3, 69], [12, 2, 74], [14, 1, 76], [15, 2, 74], [17, 1, 71], [18, 6, 72]];
const PHRASE_B = [[0, 2, 76], [2, 1, 74], [3, 3, 71], [6, 2, 72], [8, 1, 74], [9, 3, 67]];
const PHRASE_C = [[0, 3, 79], [3, 2, 76], [5, 1, 74], [6, 3, 76], [9, 2, 74], [11, 1, 71], [12, 3, 74], [15, 2, 71], [17, 1, 69], [18, 8, 67]];
const phrase = (t0, p, gain, kind = 'flute') => {
  for (const [at, len, m] of p) {
    note(mus, t0 + at * BEAT, len * BEAT, m, { gain, atk: 0.1, rel: 0.6, pan: 0.15, kind, vib: 0.3 });
  }
};

// Струнный фон и бас
for (let t = 0; t < TOTAL - 0.5; t += BAR) {
  const ch = harmonyAt(t + 0.01);
  const thin = t >= S3 - 0.8 && t < POUR - 0.4;  // строки 9–10: воздух пустеет
  for (let k = 1; k < ch.length; k++) {
    note(mus, t, BAR * 0.98, ch[k], { gain: thin ? 0.018 : 0.04, atk: 0.7, rel: 1.0, pan: -0.35 + 0.18 * k, kind: 'strings', vib: 0.12 });
  }
  if (!thin) note(mus, t, BAR * 0.95, ch[0], { gain: 0.085, atk: 0.3, rel: 0.8, kind: 'strings' });
}
// Вальс фортепиано: бас на первую долю, аккорд на вторую и третью
for (let t = 0; t < TOTAL - 2; t += BEAT) {
  const beat = Math.round(t / BEAT) % 3;
  const ch = harmonyAt(t + 0.01);
  if (t >= S3 - 0.8 && t < POUR - 0.4 && beat !== 0) continue;  // редкие ноты
  if (beat === 0) {
    note(mus, t, BEAT * 1.6, ch[0] + 12, { gain: 0.1, atk: 0.008, rel: 0.7, pan: -0.15 });
  } else {
    note(mus, t, BEAT * 1.1, ch[beat === 1 ? 2 : 3] + 12, { gain: 0.05, atk: 0.008, rel: 0.5, pan: 0.2 });
    note(mus, t, BEAT * 1.1, ch[beat === 1 ? 3 : 4] + 12, { gain: 0.042, atk: 0.008, rel: 0.5, pan: 0.32 });
  }
}
phrase(0.5, PHRASE_A, 0.1);                 // заставка
phrase(LINES[3].e + 0.05, PHRASE_B, 0.05);  // пауза после первой строфы
phrase(LINES[7].e - 0.1, PHRASE_B.slice(0, 3), 0.03);
phrase(POUR + 0.15, PHRASE_C.slice(0, 8), 0.05);
phrase(END + 0.25, PHRASE_C, 0.1);

// --- Шумы ---
function chime(t0, gain) {  // хрустальный звон: разлёт высоких нот
  [88, 91, 95, 98, 100, 103].forEach((m, i) => {
    note(sfx, t0 + i * 0.075, 0.1, m, { gain: gain * (1 - i * 0.09), atk: 0.002, rel: 1.8, pan: -0.55 + 0.22 * i, kind: 'celesta' });
  });
}
function swish(t0, dur, gain, from, to) {  // свист серпа: полосовой шум с нарастанием
  const i0 = Math.floor(t0 * SR), n = Math.min(N - i0, Math.floor(dur * SR));
  let a = 0, b = 0;
  for (let i = 0; i < n; i++) {
    const u = i / n, c = 0.06 + 0.3 * Math.sin(Math.PI * u) ** 2;
    const x = rnd() - 0.5;
    a += c * (x - a); b += c * (a - b);
    const v = (a - b) * Math.sin(Math.PI * u) ** 1.4 * gain;
    const p = from + (to - from) * u;
    sfx[0][i0 + i] += v * Math.cos((p + 1) * Math.PI / 4);
    sfx[1][i0 + i] += v * Math.sin((p + 1) * Math.PI / 4);
  }
}
chime(wordAt(3, 'хрустальный') + 0.03, 0.05);
const SERP = wordAt(5, 'серп');
swish(SERP + 0.02, 0.5, 0.5, -0.6, -0.1);
swish(SERP + 0.62, 0.5, 0.42, -0.1, 0.35);
swish(SERP + 1.22, 0.55, 0.36, 0.35, 0.7);
[0, 1, 2, 3].forEach((i) => note(sfx, wordAt(8, 'Блестит') + 0.08 + i * 0.13, 0.05, 96 + i * 3, { gain: 0.022, atk: 0.002, rel: 0.8, pan: -0.5 + i * 0.32, kind: 'celesta' }));

// Ветер: фильтрованный шум, сильнее в поле, стихает на строке 9
{
  let nL = 0, nR = 0, wL = 0, wR = 0;
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const lvl = curve([[0, 0.03], [S1, 0.05], [S1E, 0.05], [S2, 0.1], [S2E, 0.1], [S3 + 0.8, 0.012], [POUR, 0.012], [END, 0.03], [TOTAL, 0.02]], t);
    const gust = 0.55 + 0.45 * Math.sin(2 * Math.PI * t / 3.4 + 1.4 * Math.sin(t * 0.5));
    nL += 0.3 * ((rnd() - 0.5) - nL); nR += 0.3 * ((rnd() - 0.5) - nR);
    wL += (0.03 + 0.08 * gust) * (nL - wL); wR += (0.03 + 0.08 * gust) * (nR - wR);
    sfx[0][i] += 1.4 * lvl * gust * wL;
    sfx[1][i] += 1.4 * lvl * gust * wR;
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
// Строки 9–10 измеряем не отдельно, иначе тишина там выровняется обратно
const gains = [[S1, S1E], [S2, S2E], [POUR, END]].map(([a, b]) => (VR * 10 ** (TARGET_DB / 20)) / rmsOf(a, b));
console.log('voice rms', VR.toFixed(4), 'gains', gains.map((g) => g.toFixed(3)).join(' '));

const INTRO_GAIN = Math.max(...gains) * 5, OUTRO_GAIN = Math.max(...gains) * 5.5;
const gainKeys = [
  [0, 0], [0.5, INTRO_GAIN], [V0 - 1.3, INTRO_GAIN], [S1 - 0.1, gains[0]], [S1E, gains[0]],
  [S2 - 0.7, gains[1]], [S2E, gains[1]], [POUR, gains[2]], [END + 0.1, gains[2]],
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
