// Музыка к «Весне» Майкова: вальс 3/4, ля минор → ля мажор на «первые грёзы».
//
// Фарфоровая палитра: музыкальная шкатулка, глокеншпиль, мягкая струнная подкладка,
// на финале лёгкие колокольчики. Шумы только с причиной в кадре: звон блюда, мазок кисти,
// капли-слёзы, щебет птички. Пик шума на кадр позже события в картинке.
// Времена берёт из events.json (пишет ../video/build.py), голос из ../voice.mp3.
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
const SR = 44100, TOTAL = EV.total, N = Math.ceil(TOTAL * SR), V0 = EV.V0;
const FRAME = 1 / 30;
const LINES = Object.keys(EV).filter((k) => /^L\d+$/.test(k)).map((k) => +k.slice(1)).sort((a, b) => a - b)
  .map((n) => [EV[`L${n}`], EV[`E${n}`]]);
const LAST_E = LINES[LINES.length - 1][1];
const STANZA_GAP = [EV.E4, EV.L5];

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
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) {
    const [a, va] = keys[i - 1], [b, vb] = keys[i];
    return va + (vb - va) * smooth((t - a) / Math.max(1e-6, b - a));
  }
  return keys[keys.length - 1][1];
};
const panL = (p) => Math.cos((p + 1) * Math.PI / 4), panR = (p) => Math.sin((p + 1) * Math.PI / 4);
const underVoice = (t) => LINES.some(([a, b]) => t >= a - 0.05 && t < b);

const mus = [new Float32Array(N), new Float32Array(N)];
const sfx = [new Float32Array(N), new Float32Array(N)];

// ---------- инструменты: звенящие наборы парциалов [кратность, громкость, скорость затухания] ----------
const TIMBRE = {
  box: [[1, 1, 2.6], [2.01, 0.22, 5.5], [4.1, 0.14, 10], [6.27, 0.09, 22]],
  glock: [[1, 1, 1.9], [2.76, 0.34, 6], [5.4, 0.16, 14], [8.9, 0.05, 26]],
  bell: [[1, 1, 1.3], [1.003, 0.6, 1.4], [2.0, 0.4, 2.2], [2.42, 0.34, 2.6], [3.01, 0.22, 3.6], [4.17, 0.16, 5], [5.43, 0.1, 8]],
};
function ring(t0, m, { kind = 'box', gain = 0.1, pan = 0, bus = mus } = {}) {
  const f = hz(m) * (1 + (rnd() - 0.5) * 0.0015), i0 = Math.max(0, Math.floor(t0 * SR));
  const parts = TIMBRE[kind].filter(([r]) => f * r < SR * 0.45);
  const n = Math.min(N - i0, Math.floor(Math.min(4.5, 7 / parts[0][2]) * SR));
  const L = gain * panL(pan), R = gain * panR(pan);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let s = 0;
    for (const [r, a, d] of parts) s += a * Math.exp(-t * d) * Math.sin(2 * Math.PI * f * r * t);
    s *= Math.min(1, t / 0.0015);
    if (kind === 'box' && t < 0.004) s += 0.25 * (rnd() * 2 - 1) * (1 - t / 0.004); // щипок язычка
    bus[0][i0 + i] += s * L; bus[1][i0 + i] += s * R;
  }
}
// Струнная подкладка: два расстроенных голоса с мягким смычковым нарастанием
function pad(t0, dur, m, { gain = 0.04, pan = 0, atk = 0.5, rel = 0.8 } = {}) {
  const f = hz(m), i0 = Math.max(0, Math.floor(t0 * SR));
  const n = Math.min(N - i0, Math.floor((dur + rel) * SR));
  if (n <= 0) return;
  const L = gain * panL(pan), R = gain * panR(pan);
  const ph = [rnd() * 6.28, rnd() * 6.28];
  const vib = rnd() * 6.28;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const e = smooth(t / atk) * (t < dur ? 1 : Math.exp(-(t - dur) / (rel * 0.32)));
    const v = 0.0022 * Math.sin(2 * Math.PI * 4.7 * t + vib);
    let s = 0;
    for (let d = 0; d < 2; d++) {
      const w = 2 * Math.PI * f * (1 + (d ? 0.0024 : -0.0024) + v) * t + ph[d];
      s += Math.sin(w) + 0.4 * Math.sin(2 * w) + 0.2 * Math.sin(3 * w) + 0.09 * Math.sin(4 * w);
    }
    s *= e * 0.5;
    mus[0][i0 + i] += s * L; mus[1][i0 + i] += s * R;
  }
}

// ---------- шумы ----------
// Мазок кисти: шум в полосе, ворс даёт дрожание, панорама идёт за кистью
function stroke(a, b, { gain = 0.1, p0 = -0.4, p1 = 0.4 } = {}) {
  const t0 = a + FRAME, dur = b - a, i0 = Math.floor(t0 * SR), n = Math.min(N - i0, Math.floor(dur * SR));
  const aL = 1 - Math.exp(-2 * Math.PI * 1000 / SR), aH = 1 - Math.exp(-2 * Math.PI * 6500 / SR);
  let l = 0, h = 0, bristle = 0;
  for (let i = 0; i < n; i++) {
    const u = i / n, x = rnd() * 2 - 1;
    l += aL * (x - l); h += aH * (x - h);
    bristle += 0.002 * ((rnd() * 2 - 1) - bristle);
    const e = Math.sin(Math.PI * Math.pow(u, 0.7)) ** 1.3 * (0.72 + 0.28 * Math.sin(2 * Math.PI * 7 * u * dur) + 6 * bristle);
    const p = p0 + (p1 - p0) * u, s = (h - l) * e * gain;
    sfx[0][i0 + i] += s * panL(p); sfx[1][i0 + i] += s * panR(p);
  }
}
// Звон фарфора: тонкий короткий звук блюда с неровными обертонами
function porcelain(t, gain = 0.1, pan = 0) {
  const t0 = t - 0.002, i0 = Math.max(0, Math.floor(t0 * SR)), n = Math.min(N - i0, Math.floor(1.1 * SR));
  const P = [[2350, 1, 7], [3640, 0.7, 9], [5210, 0.5, 13], [7180, 0.3, 18], [9430, 0.14, 26]];
  for (let i = 0; i < n; i++) {
    const u = i / SR;
    let s = 0;
    for (const [f, a, d] of P) s += a * Math.exp(-u * d) * Math.sin(2 * Math.PI * f * u);
    s *= Math.min(1, u / 0.002);
    if (u < 0.003) s += 0.5 * (rnd() * 2 - 1);
    sfx[0][i0 + i] += s * gain * panL(pan); sfx[1][i0 + i] += s * gain * panR(pan);
  }
}
// Капля: быстрый «бульк» вверх и лёгкий стук о фарфор
function drop(t, { gain = 0.1, pan = 0, f0 = 950, size = 1 } = {}) {
  const i0 = Math.floor((t - 0.003) * SR), n = Math.min(N - i0, Math.floor(0.3 * size * SR));
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const u = i / SR, f = f0 * (1 + 0.9 * (1 - Math.exp(-u * 28 / size)));
    ph += 2 * Math.PI * f / SR;
    let s = Math.exp(-u * 24 / size) * Math.sin(ph) + 0.28 * Math.exp(-u * 55) * Math.sin(2 * Math.PI * 3150 * u);
    s *= Math.min(1, u / 0.003);
    sfx[0][i0 + i] += s * gain * panL(pan); sfx[1][i0 + i] += s * gain * panR(pan);
  }
}
function chirp(t0, { gain = 0.1, pan = 0, f0 = 3300, f1 = 4700, dur = 0.08 } = {}) {
  const i0 = Math.floor(t0 * SR), n = Math.min(N - i0, Math.floor(dur * SR));
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const u = i / n, f = f0 + (f1 - f0) * u + 220 * Math.sin(u * 16);
    ph += 2 * Math.PI * f / SR;
    const s = Math.sin(ph) * Math.sin(Math.PI * u) ** 1.3 * gain;
    sfx[0][i0 + i] += s * panL(pan); sfx[1][i0 + i] += s * panR(pan);
  }
}
const PHRASES = [
  [[0, 3400, 4700, 0.08], [0.11, 4600, 3700, 0.07], [0.21, 3600, 5100, 0.09]],
  [[0, 4900, 4100, 0.06], [0.08, 4900, 4100, 0.06], [0.16, 4900, 4000, 0.06], [0.26, 3500, 5300, 0.12]],
  [[0, 3200, 4400, 0.1], [0.14, 4300, 5000, 0.06], [0.22, 5000, 3900, 0.1]],
  [[0, 5200, 4300, 0.05], [0.07, 3900, 5000, 0.07], [0.17, 5100, 4200, 0.05], [0.24, 4000, 5400, 0.08], [0.35, 5300, 4000, 0.09]],
];
const phraseLen = (p) => Math.max(...p.map(([d, , , l]) => d + l));

// ---------- ноты: 3/4, в такте шесть восьмых, такт подогнан так, чтобы сильная доля пришлась на «первые» ----------
const N_MIN = Math.max(4, Math.round(EV.per / 1.5));
const BAR = EV.per / N_MIN, E8 = BAR / 6;
const CH = {
  Am: { pad: [45, 57, 60, 64], arp: [57, 64, 69, 72, 69, 64] },
  F: { pad: [41, 57, 60, 65], arp: [53, 60, 65, 69, 65, 60] },
  Dm: { pad: [38, 57, 62, 65], arp: [62, 65, 69, 74, 69, 65] },
  C: { pad: [48, 55, 60, 64], arp: [60, 67, 72, 76, 72, 67] },
  G: { pad: [43, 55, 59, 62], arp: [55, 62, 67, 71, 67, 62] },
  E: { pad: [40, 56, 59, 64], arp: [52, 59, 64, 68, 71, 68] },
  A: { pad: [45, 57, 61, 64], arp: [57, 64, 69, 73, 69, 64] },
  Fsm: { pad: [42, 57, 61, 66], arp: [54, 61, 66, 69, 66, 61] },
  D: { pad: [38, 57, 62, 66], arp: [62, 66, 69, 74, 69, 66] },
};
// Минор считаем от конца, чтобы последний такт перед «первые» всегда был доминантой E
const MIN = ['Am', 'Dm', 'E', 'Am', 'F', 'C', 'G', 'E', 'Am', 'Dm', 'F', 'E'];
const MAJ = ['A', 'Fsm', 'D', 'E', 'A', 'D'];
// Своя мелодия: [восьмая в такте, нота, длина]. В миноре вздыхает и опадает, в мажоре поднимается
const MEL_MIN = [
  [[2, 76, 2], [4, 72, 2]],
  [[0, 74, 2], [2, 77, 2], [4, 76, 1], [5, 74, 1]],
  [[0, 71, 2], [2, 68, 1], [3, 71, 1], [4, 76, 2]],
  [[0, 72, 2], [2, 69, 4]],
  [[0, 72, 3], [3, 69, 3]],
  [[0, 72, 2], [2, 76, 4]],
  [[0, 74, 3], [3, 71, 3]],
  [[0, 71, 2], [2, 68, 4]],
  [[0, 69, 3], [3, 72, 1], [4, 76, 2]],
  [[0, 77, 3], [3, 74, 3]],
  [[0, 72, 3], [3, 69, 3]],
  [[0, 74, 2], [2, 71, 2], [4, 68, 2]],
];
const MEL_MAJ = [
  [[0, 73, 2], [2, 76, 2], [4, 81, 2]], // до-диез на «первые», ля на «грёзы»: мажор наступает
  [[0, 78, 3], [3, 81, 3]],
  [[0, 78, 2], [2, 81, 1], [3, 78, 1], [4, 74, 2]],
  [[0, 76, 2], [2, 80, 2], [4, 83, 2]],
  [[0, 85, 3], [3, 81, 1], [4, 76, 2]],
  [[0, 78, 2], [2, 81, 2], [4, 86, 2]],
];
const MEL_END = [[0, 85, 2], [2, 81, 4]];

const FINAL_BAR = Math.floor((TOTAL - 0.6) / BAR);
const mod = (a, n) => ((a % n) + n) % n;
const chordOf = (b) => {
  if (b >= FINAL_BAR) return 'A';
  return b < N_MIN ? MIN[mod(b - N_MIN, MIN.length)] : MAJ[(b - N_MIN) % MAJ.length];
};
const melOf = (b) => {
  if (b === FINAL_BAR) return MEL_END;
  if (b > FINAL_BAR) return [];
  return b < N_MIN ? MEL_MIN[mod(b - N_MIN, MEL_MIN.length)] : MEL_MAJ[(b - N_MIN) % MEL_MAJ.length];
};

const melodySlots = new Set();
for (let b = 0; b <= FINAL_BAR; b++) {
  const t = b * BAR, major = b >= N_MIN, c = CH[chordOf(b)], finale = t >= LAST_E - 0.2;
  // Подкладка
  const padGain = major ? 0.034 : 0.03;
  const held = b === FINAL_BAR ? TOTAL - t : BAR + 0.08;
  pad(t, held, c.pad[0], { gain: padGain * 1.05, pan: 0 });
  pad(t, held, c.pad[1], { gain: padGain, pan: -0.35 });
  pad(t, held, c.pad[2], { gain: padGain, pan: 0.05 });
  pad(t, held, c.pad[3], { gain: padGain, pan: 0.35 });
  // Шкатулка: перебор. В миноре реже, с паузами, в мажоре все шесть восьмых
  const pattern = major ? [0, 1, 2, 3, 4, 5] : [0, 2, 3, 5];
  const arpEnd = b === FINAL_BAR ? 1 : 6;
  for (const s of pattern) {
    if (s >= arpEnd) continue;
    const at = t + s * E8, g = (s === 0 ? 0.075 : 0.055) * (underVoice(at) ? 0.8 : 1);
    ring(at, c.arp[s], { kind: 'box', gain: g, pan: -0.25 + 0.1 * s });
  }
  // Мелодия: шкатулка, на октаву выше перебора. Под голосом тише, в паузах полным голосом
  for (const [s, m, d] of melOf(b)) {
    const at = t + s * E8, voiced = underVoice(at);
    melodySlots.add(Math.round(at / E8));
    ring(at, m + 12, { kind: 'box', gain: voiced ? 0.09 : 0.15, pan: 0.15 });
    if (major) ring(at + 0.004, m + 12, { kind: 'glock', gain: voiced ? 0.04 : 0.075, pan: -0.15 });
    if (d >= 4 && !voiced) ring(at + 3 * E8, m + 24, { kind: 'glock', gain: 0.03, pan: 0.3 });
  }
  // Колокольчики только в финале
  if (finale) {
    const up = [c.arp[2] + 24, c.arp[3] + 24];
    ring(t, up[0], { kind: 'bell', gain: 0.05, pan: -0.45 });
    if (b < FINAL_BAR) ring(t + 3 * E8, up[1], { kind: 'bell', gain: 0.04, pan: 0.45 });
  }
}
// Финальный рокот колокольчиков на тонике
{
  const t = FINAL_BAR * BAR + 2 * E8;
  [81, 85, 88, 93].forEach((m, i) => ring(t + i * 0.09, m, { kind: 'bell', gain: 0.05, pan: -0.4 + i * 0.27 }));
}
// Ответы глокеншпиля в паузах между строками: в миноре опадают, в мажоре поднимаются
for (let i = 0; i + 1 < LINES.length; i++) {
  const a = LINES[i][1], z = LINES[i + 1][0], b = Math.floor(a / BAR), major = b >= N_MIN;
  const tones = CH[chordOf(b)].arp.slice(2, 5).map((m) => m + 24);
  const seq = major ? [...tones].sort((x, y) => x - y) : [...tones].sort((x, y) => y - x);
  let slot = Math.ceil((a + 0.03) / E8), k = 0;
  for (; slot * E8 < z - 0.12 && k < 3; slot++) {
    if (melodySlots.has(slot)) continue;
    ring(slot * E8, seq[k++], { kind: 'glock', gain: 0.05, pan: -0.3 + k * 0.25 });
  }
}
// Золотая отводка на «грёзы»: тонкий блик глокеншпиля
ring(EV.gre + FRAME, 88, { kind: 'glock', gain: 0.05, pan: 0.35 });
ring(EV.gre + FRAME + 0.11, 93, { kind: 'glock', gain: 0.04, pan: -0.2 });

// ---------- шумы по событиям ----------
porcelain(FRAME, 0.13, 0);
stroke(EV.wipe0, EV.wipe0e, { gain: 0.4, p0: -0.5, p1: 0.5 });
stroke(EV.wipe1, EV.wipe1e, { gain: 0.32, p0: 0.2, p1: 0.7 });
stroke(EV.wipe2, EV.wipe2e, { gain: 0.4, p0: 0.2, p1: 0.7 });
// Слёзы: с тающего снежка каждые 0,27 с, большая с подснежника
const dropPans = [-0.35, -0.2, -0.05, 0.1];
dropPans.forEach((p, i) => drop(EV.L5 - 0.32 + i * 0.27 + FRAME, { gain: 0.09, pan: p, f0: 880 + rnd() * 260 }));
drop(EV.slo + 0.02 + FRAME, { gain: 0.12, pan: -0.25, f0: 680, size: 1.7 });
// Щебет: клюв в кадре открыт, пока sin((t-E8)*1.05) > -0.45 (src/scene.js), вне этого птичка молчит
const beakOpen = (t) => Math.sin((t - LAST_E) * 1.05) > -0.45;
{
  const end = TOTAL - 0.6;
  let t = LAST_E + 1.1, k = 0;
  while (t < end) {
    const p = PHRASES[k % PHRASES.length], len = phraseLen(p);
    if (t + len > end) break;
    if (!beakOpen(t) || !beakOpen(t + len)) { t += 0.05; continue; }
    for (const [d, a, b, l] of p) chirp(t + d, { gain: 0.12, pan: -0.15, f0: a, f1: b, dur: l });
    console.log(`  щебет ${t.toFixed(2)}–${(t + len).toFixed(2)}`);
    t += len + 0.5 + rnd() * 0.3; k++;
  }
}

// ---------- ревербератор: как в комнате с белым блюдом, с затуханием верхов ----------
function reverb(src, wet, seedShift) {
  const combs = (seedShift ? [1188, 1277, 1356, 1491, 1617, 1693] : [1116, 1188, 1277, 1356, 1422, 1557]).map((d) => Math.round(d * 1.35));
  const buf = combs.map((d) => new Float32Array(d)), lp = combs.map(() => 0), pos = combs.map(() => 0);
  const ap = (seedShift ? [579, 248] : [556, 225]).map((d) => new Float32Array(d)), apos = [0, 0];
  const out = new Float32Array(N);
  const fb = 0.78, damp = 0.32;
  for (let i = 0; i < N; i++) {
    const x = src[i];
    let w = 0;
    for (let k = 0; k < combs.length; k++) {
      const y = buf[k][pos[k]];
      lp[k] = y * (1 - damp) + lp[k] * damp;
      buf[k][pos[k]] = x + lp[k] * fb;
      pos[k] = (pos[k] + 1) % combs[k];
      w += y;
    }
    w /= combs.length;
    for (let k = 0; k < ap.length; k++) {
      const y = ap[k][apos[k]], v = w + y * 0.5;
      ap[k][apos[k]] = v;
      apos[k] = (apos[k] + 1) % ap[k].length;
      w = y - v * 0.5;
    }
    out[i] = x + wet * w;
  }
  return out;
}

// ---------- сведение ----------
const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', path.join(POEM, 'voice.mp3'), '-f', 's16le', '-ac', '1', '-ar', String(SR), '-'], { maxBuffer: 1 << 28 });
const voice = new Float32Array(Math.floor(raw.length / 2));
for (let i = 0; i < voice.length; i++) voice[i] = raw.readInt16LE(i * 2) / 32768;
const voiceRms = (a, b) => {
  let s = 0, c = 0;
  for (let i = Math.floor((a - V0) * SR); i < Math.min(voice.length, (b - V0) * SR); i++) { s += voice[i] * voice[i]; c++; }
  return Math.sqrt(s / Math.max(1, c));
};
const busRms = (bus, a, b) => {
  let s = 0, c = 0;
  for (let i = Math.floor(a * SR); i < Math.min(N, b * SR); i++) { s += bus[0][i] ** 2 + bus[1][i] ** 2; c += 2; }
  return Math.sqrt(s / Math.max(1, c));
};
const energy = (rmsFn) => {
  let s = 0, d = 0;
  for (const [a, b] of LINES) { const r = rmsFn(a, b); s += r * r * (b - a); d += b - a; }
  return Math.sqrt(s / d);
};
const dB = (x) => 20 * Math.log10(x);

// Голос неровный: строки различаются по RMS почти на 8 дБ. Поэтому громкость музыки ведём по строкам:
// на каждой строке своё значение, чтобы музыка была на TARGET_DB тише именно этой строки.
// Реверб тянет хвост из соседних участков, поэтому считаем в несколько проходов.
const TARGET_DB = -19, LOUD = 3.3, MID = 1.8, PASSES = 5;
const VR = energy((a, b) => voiceRms(a, b));
const lineV = LINES.map(([a, b]) => voiceRms(a, b));
const shape = (lineG, base) => {
  const keys = [[0, 0], [0.7, LOUD * base], [V0 - 0.7, LOUD * base]];
  LINES.forEach(([a, b], n) => {
    if (a === STANZA_GAP[1]) keys.push([STANZA_GAP[0] + 0.05, lineG[n - 1]], [STANZA_GAP[0] + 0.35, MID * base], [a - 0.25, MID * base]);
    keys.push([n ? a : a - 0.05, lineG[n]], [b, lineG[n]]);
  });
  keys.push([LAST_E + 0.9, LOUD * base], [TOTAL - 1.9, LOUD * base], [TOTAL - 0.1, 0], [TOTAL, 0]);
  return keys;
};
const renderMusic = (keys) => {
  const shaped = [new Float32Array(N), new Float32Array(N)];
  for (const ch of [0, 1]) for (let i = 0; i < N; i++) shaped[ch][i] = mus[ch][i] * curve(keys, i / SR);
  return [reverb(shaped[0], 0.3, 0), reverb(shaped[1], 0.3, 1)];
};
let lineG = LINES.map(() => 1), musWet = renderMusic(shape(lineG, 1));
// base: общий уровень, от него считаются вступление, финал и пауза между строфами
const BASE = (VR * 10 ** (TARGET_DB / 20)) / energy((a, b) => busRms(musWet, a, b));
lineG = lineG.map(() => BASE);
for (let pass = 0; pass < PASSES; pass++) {
  musWet = renderMusic(shape(lineG, BASE));
  lineG = lineG.map((g, n) => g * (lineV[n] * 10 ** (TARGET_DB / 20)) / busRms(musWet, ...LINES[n]));
}
musWet = renderMusic(shape(lineG, BASE));
const sfxWet = [reverb(sfx[0], 0.14, 0), reverb(sfx[1], 0.14, 1)];
const SFX_G = VR * 6;
console.log(`голос RMS ${dB(VR).toFixed(1)} дБ, база ${BASE.toFixed(3)}`);
LINES.forEach(([a, b], n) => {
  const v = lineV[n], m = busRms(musWet, a, b);
  console.log(`  строка ${n + 1}: голос ${dB(v).toFixed(1)}, музыка ${dB(m).toFixed(1)}, разница ${(dB(m) - dB(v)).toFixed(1)} дБ, усиление ${lineG[n].toFixed(3)}`);
});
console.log(`  все строки: разница ${(dB(energy((a, b) => busRms(musWet, a, b))) - dB(VR)).toFixed(1)} дБ`);

const out = [new Float32Array(N), new Float32Array(N)];
for (const ch of [0, 1]) for (let i = 0; i < N; i++) {
  // Лёгкий fade-out всего слоя в самом конце, чтобы хвост реверба не обрывался
  const tail = Math.min(1, (TOTAL - i / SR) / 0.08);
  out[ch][i] = (musWet[ch][i] + sfxWet[ch][i] * SFX_G) * tail;
}

let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(out[0][i]), Math.abs(out[1][i]));
const limit = peak > 0.84 ? 0.84 / peak : 1;
if (limit < 1) console.log(`ВНИМАНИЕ: сжали всё в ${limit.toFixed(3)} раза, музыка под голосом стала тише цели`);

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
console.log(`music.wav: ${TOTAL.toFixed(2)} с, такт ${BAR.toFixed(3)} с, пик ${peak.toFixed(3)}, limit ${limit.toFixed(3)}`);
