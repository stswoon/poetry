// Музыка к «Осень наступила…» (А. Н. Плещеев), стиль «Школьный гербарий».
//
// Своя спокойная осенняя пьеса в 3/4: ля минор, в последней строфе светлеет к до мажору
// (F – G – C на «Зашумели воды… в тёплые края»), в финале плагальное Fmaj7 – C, когда альбом закрылся.
// Мягкое фортепиано (затухающий аддитивный синтез: неидеальные обертоны, две струны, демпфер, педаль),
// виолончельная педаль, изредка челеста. Три такта на строфу, гармония меняется во вдохе перед
// первой строкой строфы, «в тёплые края» приходится на до мажор.
// Шумы только с причиной в кадре: обложка откидывается, перевороты страниц, порыв ветра, капли по бумаге,
// журчание ручья, взмахи крыльев, альбом закрывается. Пик шума — на кадр позже события.
//
// Запуск: node make_music.mjs [V0] [OUTRO]        (по умолчанию 5 и 8; можно --v0=5 --outro=8)
// Читает ../timings.json, ../voice.mp3 (через ffmpeg) и events.json, если он есть и совпадает с таймингами
// (иначе времена событий считаются по timings.json так же, как в ../video/build.py).
// Пишет music.wav (44,1 кГц, 16 бит, стерео, длина V0 + голос + OUTRO) и sfx.json (времена шумов).
// Без зависимостей: node и ffmpeg.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const POEM = path.dirname(HERE);
const SR = 44100, FRAME = 1 / 30;
const UNDER_DB = -19;          // музыка под голосом относительно голоса (K-взвешенно, в местах речи)
const LOUD_DB = 10, GAP_DB = 3.5; // заставка/финал и паузы между строфами — громче на столько

// ---------- аргументы и время ----------
const argv = process.argv.slice(2);
const pos = argv.filter((a) => !a.startsWith('--'));
const opt = (name, i, def) => {
  const kv = argv.find((a) => a.startsWith(`--${name}=`));
  const v = kv ? Number(kv.split('=')[1]) : pos[i] !== undefined ? Number(pos[i]) : def;
  if (!Number.isFinite(v)) throw new Error(`плохое значение ${name}`);
  return v;
};
const V0 = opt('v0', 0, 5), OUTRO = opt('outro', 1, 8);
if (V0 < 2 || OUTRO < 4.5) throw new Error('нужно V0 >= 2 и OUTRO >= 4.5');

const T = JSON.parse(fs.readFileSync(path.join(POEM, 'timings.json'), 'utf8'));
const VD = T.voiceDuration;
const TOTAL = Math.round((V0 + VD + OUTRO) * 1000) / 1000;
const N = Math.round(TOTAL * SR);
const LINES = T.lines.map((l) => ({ s: l.start + V0, e: l.end + V0, words: l.words.map((w) => ({ t: w.start + V0, text: w.text })) }));
const L = (n) => LINES[n - 1].s, E = (n) => LINES[n - 1].e;
const word = (n, w) => (LINES[n - 1].words.find((x) => x.text.includes(w)) ?? LINES[n - 1].words[0]).t;

function eventsFromTimings() {
  const flip = (a, b) => { const s = E(a) + 0.1; return [s, Math.min(s + 1.05, L(b) - 0.08)]; };
  const ev = {
    open: V0 - 1.75, opene: V0 - 0.5, close: E(16) + 2.3, closee: E(16) + 3.5,
    zel: word(7, 'зеленеет'), vet: word(11, 'Ветер'), dzh: word(12, 'Дождик'), mor: word(12, 'моросит'),
    zas: word(13, 'Зашумели'), vod: word(13, 'воды'), bys: word(14, 'Быстрого'),
    pti: word(15, 'Птички'), ule: word(15, 'улетели'), kra: word(16, 'края'),
  };
  [[4, 5], [8, 9], [12, 13]].forEach(([a, b], i) => { [ev[`f${i + 1}`], ev[`f${i + 1}e`]] = flip(a, b); });
  return ev;
}
let EV = eventsFromTimings(), evSrc = 'timings.json';
const evPath = path.join(HERE, 'events.json');
if (fs.existsSync(evPath)) {
  const raw = JSON.parse(fs.readFileSync(evPath, 'utf8'));
  const shift = V0 - (raw.V0 ?? V0);
  if (Math.abs(raw.L1 + shift - L(1)) < 0.02 && Math.abs(raw.E16 + shift - E(16)) < 0.02) {
    for (const [k, v] of Object.entries(raw)) if (typeof v === 'number' && !['V0', 'OUTRO', 'total'].includes(k)) EV[k] = v + shift;
    evSrc = shift ? `events.json со сдвигом ${shift > 0 ? '+' : ''}${shift.toFixed(2)} с` : 'events.json';
  } else console.warn('events.json не совпадает с timings.json — события считаю по timings.json');
}

// ---------- общие помощники ----------
let seed = 1885;
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
const panLR = (p) => [Math.cos((p + 1) * Math.PI / 4), Math.sin((p + 1) * Math.PI / 4)];
const db = (x) => 10 ** (x / 20);

const mus = [new Float32Array(N), new Float32Array(N)];
const sfx = [new Float32Array(N), new Float32Array(N)];

// ---------- инструменты ----------
// Фортепиано: обертоны с лёгкой негармоничностью, каждый гаснет в два этапа (быстро и долго),
// у трёх нижних — вторая струна чуть выше (медленные биения), мягкий молоточек, демпфер после dur.
function piano(t0, dur, m, { vel = 0.5, pan = 0 } = {}) {
  t0 = Math.max(0, t0);
  const f = hz(m), i0 = Math.round(t0 * SR);
  if (i0 >= N) return;
  const tau = 1.7 * (261.6 / f) ** 0.45, relT = 0.16;
  const len = Math.min(N - i0, Math.floor((dur + 6 * relT) * SR));
  const buf = new Float64Array(len), x = 0.12;
  for (let k = 1; k <= 14; k++) {
    const fk = f * k * Math.sqrt(1 + 0.00018 * k * k);
    if (fk > 8500) break;
    const a = k ** -(1.6 - 0.7 * vel) * Math.abs(Math.sin(Math.PI * k * x)) / Math.sin(Math.PI * x);
    const df = Math.exp(-1 / (tau * 0.22 / Math.sqrt(k) * SR)), ds = Math.exp(-1 / (tau * 2.4 / (1 + 0.45 * (k - 1)) * SR));
    const w = 2 * Math.PI * fk / SR, cw = Math.cos(w), sw = Math.sin(w);
    const two = k <= 3, w2 = w * 1.0007, cw2 = Math.cos(w2), sw2 = Math.sin(w2);
    let c = 1, s = 0, c2 = 1, s2 = 0, ef = 0.55 * a, es = 0.45 * a;
    for (let i = 0; i < len; i++) {
      let v = s;
      if (two) { v = 0.5 * (s + s2); const q = c2 * cw2 - s2 * sw2; s2 = c2 * sw2 + s2 * cw2; c2 = q; }
      buf[i] += v * (ef + es);
      const q = c * cw - s * sw; s = c * sw + s * cw; c = q;
      ef *= df; es *= ds;
    }
  }
  const att = Math.floor(0.005 * SR), di = Math.floor(dur * SR), rd = Math.exp(-1 / (relT * SR));
  const g = 0.22 * vel, [gl, gr] = panLR(pan);
  let r = 1;
  for (let i = 0; i < len; i++) {
    let e = i < att ? 0.5 - 0.5 * Math.cos(Math.PI * i / att) : 1;
    if (i >= di) { e *= r; r *= rd; }
    const v = buf[i] * e * g;
    mus[0][i0 + i] += v * gl; mus[1][i0 + i] += v * gr;
  }
}

// Виолончель: пилообразный спектр с «корпусом» (подъём около 240 Гц и 1 кГц), медленная атака смычка,
// вибрато входит не сразу, лёгкое дыхание смычка.
function cello(t0, dur, m, { gain = 0.05, pan = -0.25, att = 0.6, rel = 0.8 } = {}) {
  t0 = Math.max(0, t0);
  const f = hz(m), i0 = Math.round(t0 * SR);
  const len = Math.min(N - i0, Math.floor((dur + rel * 4) * SR));
  const H = [];
  for (let k = 1; k <= 18 && f * k < 5000; k++) {
    const fk = f * k;
    H.push([k, (0.35 + Math.exp(-(Math.log2(fk / 240) ** 2) / 0.5) + 0.55 * Math.exp(-(Math.log2(fk / 1000) ** 2) / 0.3)) / k]);
  }
  const [gl, gr] = panLR(pan), ph0 = rnd() * 6.28;
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const vib = 0.0025 * smooth((t - 0.35) / 0.7) * Math.sin(2 * Math.PI * 5.1 * t + ph0);
    ph += 2 * Math.PI * f * (1 + vib) / SR;
    let s = 0;
    for (const [k, a] of H) s += a * Math.sin(k * ph);
    let e = smooth(t / att) * (1 + 0.07 * Math.sin(2 * Math.PI * 0.23 * t + ph0));
    if (t > dur) e *= Math.exp(-(t - dur) / (rel * 0.35));
    const v = s * e * gain;
    mus[0][i0 + i] += v * gl; mus[1][i0 + i] += v * gr;
  }
}

// Челеста: почти чистый тон с коротким «звоном» верхних призвуков.
function celesta(t0, m, { vel = 0.4, pan = 0.35 } = {}) {
  const f = hz(m), i0 = Math.round(t0 * SR);
  if (i0 >= N) return;
  const len = Math.min(N - i0, Math.floor(3.2 * SR)), [gl, gr] = panLR(pan);
  const P = [[1, 1, 1.15], [2, 0.07, 0.35], [3, 0.05, 0.16], [4, 0.14, 0.06]];
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    let s = 0;
    for (const [r, a, tau] of P) s += a * Math.exp(-t / tau) * Math.sin(2 * Math.PI * f * r * t);
    const v = s * Math.min(1, t / 0.0015) * 0.12 * vel;
    mus[0][i0 + i] += v * gl; mus[1][i0 + i] += v * gr;
  }
}

// ---------- партитура: 3/4, по три такта на строфу ----------
// голоса аккордов: [бас, затем звуки перебора снизу вверх]
const CH = {
  Am: [45, 52, 57, 60, 64], E: [40, 52, 56, 59, 64], Dm: [38, 50, 53, 57, 62], F: [41, 53, 57, 60, 65],
  C: [36, 48, 52, 55, 60], Bb: [46, 53, 58, 62, 65], G: [43, 50, 55, 59, 62], Fmaj7: [41, 53, 57, 60, 64],
  Cend: [36, 43, 48, 52, 55, 60, 64],
};
const ROOT = { Am: 45, E: 40, Dm: 38, F: 41, C: 36, Bb: 46, G: 43, Fmaj7: 41, Cend: 36 };
// [аккорд, мелодия: [доля, нота, длительность в долях]]
const INTRO_FIRST = ['Am', [[0, 76, 2], [2, 74, 0.5], [2.5, 72, 0.5]]];
const INTRO_MID = ['Dm', [[0, 74, 2], [2, 72, 0.5], [2.5, 69, 0.5]]];
const INTRO_LAST = ['E', [[0, 71, 1.5], [1.5, 72, 0.5], [2, 68, 1]]];
const STANZAS = [
  [['Am', [[0, 69, 2], [2, 72, 1]]], ['Dm', [[0, 74, 1.5], [1.5, 72, 0.5], [2, 69, 1]]], ['E', [[0, 68, 1], [1, 71, 2]]]],
  [['F', [[0, 69, 1.5], [1.5, 72, 0.5], [2, 77, 1]]], ['Dm', [[0, 76, 1.5], [1.5, 74, 0.5], [2, 69, 1]]], ['C', [[0, 72, 1], [1, 76, 2]]]],
  [['Dm', [[0, 69, 2], [2, 65, 1]]], ['Bb', [[0, 74, 2], [2, 72, 0.5], [2.5, 69, 0.5]]], ['E', [[0, 68, 1.5], [1.5, 69, 0.5], [2, 71, 1]]]],
  [['F', [[0, 72, 1], [1, 69, 0.5], [1.5, 72, 0.5], [2, 77, 1]]], ['G', [[0, 74, 1], [1, 79, 1], [2, 83, 1]]], ['C', [[0, 84, 2], [2, 79, 1]]]],
];
const OUTRO_BAR = ['Fmaj7', [[0, 76, 1.5], [1.5, 74, 0.5], [2, 72, 0.5], [2.5, 74, 0.5]]];

const bars = [];
const addBars = (t0, t1, specs, sec) => {
  const d = (t1 - t0) / specs.length;
  specs.forEach(([chord, mel], i) => bars.push({ t: t0 + i * d, len: d, beat: d / 3, chord, mel, sec }));
};
const nI = Math.max(1, Math.round(V0 / 2.45));
const s1 = Math.min(V0, L(1) - 0.1);
addBars(0, s1, nI === 1 ? [INTRO_LAST] : [INTRO_FIRST, ...Array(nI - 2).fill(INTRO_MID), INTRO_LAST], 'intro');
const sStart = [s1, L(5) - 0.3, L(9) - 0.3, L(13) - 0.3];
for (let k = 0; k < 3; k++) addBars(sStart[k], sStart[k + 1], STANZAS[k], `s${k + 1}`);
const d4 = (L(16) - 0.1 - sStart[3]) / 2, end4 = sStart[3] + 3 * d4; // «в тёплые края» — на до мажоре
addBars(sStart[3], end4, STANZAS[3], 's4');
const fin = Math.min(end4 + 1.35 * d4, Math.max(end4 + 0.85 * d4, EV.closee + 0.1)); // C — сразу после хлопка обложки
addBars(end4, fin, [OUTRO_BAR], 'outro');
bars.push({ t: fin, len: TOTAL - fin, beat: d4 / 3, chord: 'Cend', mel: [[0, 72, 12]], sec: 'fin' });

const MEL_VEL = { intro: 0.6, s1: 0.48, s2: 0.48, s3: 0.46, s4: 0.5, outro: 0.58, fin: 0.5 };
const PATTERN = { s3: [0, 1, 2, 3, 2, 1], s4: [0, 1, 2, 3, 4, 3] }; // по умолчанию [0, 1, 2, 3, 4, 2]
for (const b of bars) {
  const v = CH[b.chord], e8 = b.beat / 2;
  if (b.chord === 'Cend') {
    v.forEach((m, j) => piano(b.t + j * 0.065, TOTAL - b.t, m, { vel: 0.5 - 0.03 * j, pan: -0.3 + 0.1 * j }));
  } else {
    (PATTERN[b.sec] ?? [0, 1, 2, 3, 4, 2]).forEach((idx, j) => {
      const t = b.t + j * e8 + (j ? (rnd() - 0.5) * 0.012 : 0.003);
      piano(t, b.t + b.len + 0.06 - t, v[idx], { vel: j === 0 ? 0.55 : j === 3 ? 0.42 : 0.35 + 0.04 * rnd(), pan: idx === 0 ? -0.1 : -0.4 + 0.15 * idx });
    });
  }
  for (const [bt, m, d] of b.mel) piano(b.t + bt * b.beat + (rnd() - 0.5) * 0.01, d * b.beat + 0.05, m, { vel: MEL_VEL[b.sec], pan: 0.18 });
}
// виолончель: корень такта, в первой строфе держит ля под ре минором; одинаковые соседние сливаются
{
  const notes = [];
  for (const b of bars) {
    const m = b.chord === 'Dm' && (b.sec === 's1' || b.sec === 'intro') ? 45 : ROOT[b.chord];
    const last = notes[notes.length - 1];
    if (last && last.m === m) last.t1 = b.t + b.len; else notes.push({ m, t0: b.t, t1: b.t + b.len });
  }
  notes.forEach((n, i) => cello(n.t0 - (i ? 0.08 : 0), n.t1 - n.t0 + 0.2, n.m, { att: i ? 0.45 : 1.4, gain: 0.05 }));
}
// челеста — изредка: в заставке, на «зеленеет» (вспыхивает озимь), на «края» (тёплое пятно), в финале
{
  const intro = bars.filter((b) => b.sec === 'intro'), b0 = intro[0], bl = intro[intro.length - 1];
  const bs4 = bars.find((b) => b.sec === 's4');
  const C = [
    [b0.t + b0.beat, 88, 0.42], [bl.t + 2 * bl.beat, 83, 0.4],
    [EV.zel + FRAME, 93, 0.32], [EV.zel + FRAME + 0.2, 88, 0.24],
    [EV.kra + FRAME, 91, 0.36], [EV.kra + FRAME + bs4.beat / 2, 96, 0.26],
    [fin + d4 / 3, 88, 0.4], [fin + 2 * d4 / 3, 91, 0.33], [fin + 3.5 * d4 / 3, 96, 0.26],
  ];
  for (const [t, m, vel] of C) celesta(t, m, { vel });
}

// ---------- шумы ----------
function biquad(type, f, Q) {
  const w = 2 * Math.PI * Math.min(f, SR * 0.45) / SR, cs = Math.cos(w), al = Math.sin(w) / (2 * Q), a0 = 1 + al;
  let b0, b1, b2;
  if (type === 'lp') { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = b0; }
  else if (type === 'hp') { b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = b0; }
  else { b0 = al; b1 = 0; b2 = -al; }
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: -2 * cs / a0, a2: (1 - al) / a0, x1: 0, x2: 0, y1: 0, y2: 0 };
}
const bq = (q, x) => {
  const y = q.b0 * x + q.b1 * q.x1 + q.b2 * q.x2 - q.a1 * q.y1 - q.a2 * q.y2;
  q.x2 = q.x1; q.x1 = x; q.y2 = q.y1; q.y1 = y; return y;
};
const retune = (q, type, f, Q) => { const n = biquad(type, f, Q); q.b0 = n.b0; q.b1 = n.b1; q.b2 = n.b2; q.a1 = n.a1; q.a2 = n.a2; };
const band = (lo, hi) => { const f = [biquad('hp', lo, 0.7), biquad('hp', lo, 0.7), biquad('lp', hi, 0.7), biquad('lp', hi, 0.7)]; return (x) => bq(f[3], bq(f[2], bq(f[1], bq(f[0], x)))); };
const peakNorm = (x) => { let p = 1e-9; for (const v of x) p = Math.max(p, Math.abs(v)); for (let i = 0; i < x.length; i++) x[i] /= p; return x; };
const hump = (u, p) => (u < p ? smooth(u / p) : smooth((1 - u) / (1 - p)));

// Шелест бумаги/картона: шум в полосе, «зёрна» хруста, огибающая с вершиной в доле peak.
function rustle(dur, { lo = 1500, hi = 7000, peak = 0.5, rate = 120, grain = [3, 14], smoothMix = 0.35 } = {}) {
  const n = Math.floor(dur * SR), x = new Float32Array(n), g = new Float32Array(n), flt = band(lo, hi);
  for (let i = 0; i < n; i++) if (rnd() < rate * hump(i / n, peak) / SR) {
    const len = Math.floor((grain[0] + rnd() * (grain[1] - grain[0])) * SR / 1000), A = 0.3 + 0.7 * rnd();
    for (let k = 0; k < len && i + k < n; k++) g[i + k] += A * Math.exp(-k / (len * 0.35)) * Math.min(1, k / 20);
  }
  for (let i = 0; i < n; i++) x[i] = flt(rnd() * 2 - 1) * hump(i / n, peak) * (smoothMix + (1 - smoothMix) * Math.min(1.5, g[i]));
  return peakNorm(x);
}
// Воздух от движущегося листа или обложки
function whoosh(dur, { lo = 150, hi = 900, peak = 0.6 } = {}) {
  const n = Math.floor(dur * SR), x = new Float32Array(n), flt = band(lo, hi);
  for (let i = 0; i < n; i++) x[i] = flt(rnd() * 2 - 1) * hump(i / n, peak) ** 1.5;
  return peakNorm(x);
}
// Мягкий удар картона: низкий тон, падающий по высоте, и приглушённый шум. Пик ~3 мс от начала.
function thud({ f0 = 115, f1 = 65, decay = 0.04, lpf = 750, tone = 0.7 } = {}) {
  const n = Math.floor(0.3 * SR), x = new Float32Array(n), flt = band(40, lpf);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, a = Math.min(1, t / 0.002);
    ph += 2 * Math.PI * (f1 + (f0 - f1) * Math.exp(-t / 0.03)) / SR;
    x[i] = a * (flt(rnd() * 2 - 1) * 3 * Math.exp(-t / decay) + tone * Math.sin(ph) * Math.exp(-t / (decay * 1.4)));
  }
  return peakNorm(x);
}
// Короткий шлепок бумаги / выдох воздуха
function slap({ lo = 500, hi = 3000, decay = 0.012, len = 0.12 } = {}) {
  const n = Math.floor(len * SR), x = new Float32Array(n), flt = band(lo, hi);
  for (let i = 0; i < n; i++) { const t = i / SR; x[i] = flt(rnd() * 2 - 1) * Math.min(1, t / 0.0015) * Math.exp(-t / decay); }
  return peakNorm(x);
}
// Порыв ветра: шум через резонансный фильтр, частота растёт с силой порыва, слабый призвук «воя».
function wind(dur) {
  const n = Math.floor(dur * SR), x = new Float32Array(n), b1 = biquad('bp', 400, 1.4), b2 = biquad('bp', 900, 6);
  const lp = biquad('lp', 2500, 0.7);
  for (let i = 0; i < n; i++) {
    const u = i / n, t = i / SR;
    const e = (u < 0.38 ? smooth(u / 0.38) : smooth((1 - u) / 0.62) ** 1.3) * (0.85 + 0.15 * Math.sin(2 * Math.PI * 1.7 * t + 0.6));
    if (i % 32 === 0) { const fc = 330 + 520 * e + 60 * Math.sin(2 * Math.PI * 0.9 * t); retune(b1, 'bp', fc, 1.4); retune(b2, 'bp', fc * 2.3, 6); }
    const w = bq(lp, rnd() * 2 - 1);
    x[i] = (bq(b1, w) + 0.25 * bq(b2, w)) * e;
  }
  return peakNorm(x);
}
// Трепет уголков страницы на ветру
function flutter(dur) {
  const n = Math.floor(dur * SR), x = new Float32Array(n), flt = band(2500, 8000);
  for (let i = 0; i < n; i++) { const t = i / SR; x[i] = flt(rnd() * 2 - 1) * hump(i / n, 0.35) * (0.5 + 0.5 * Math.sin(2 * Math.PI * 13 * t)) ** 3; }
  return peakNorm(x);
}
// Капля по бумаге: тихий «тп» — короткий щелчок и глухой тон
function drop() {
  const n = Math.floor(0.07 * SR), x = new Float32Array(n), flt = band(1000, 4500), f = 480 + 320 * rnd();
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, a = Math.min(1, t / 0.0005);
    ph += 2 * Math.PI * f * (1 - 0.15 * Math.min(1, t / 0.03)) / SR;
    x[i] = a * (flt(rnd() * 2 - 1) * 2.2 * Math.exp(-t / 0.004) + 0.6 * Math.sin(ph) * Math.exp(-t / 0.012));
  }
  return peakNorm(x);
}
// Ручей: пузырьки (тон, взлетающий по высоте и гаснущий) поверх мягкого шумового фона. Нормирован по RMS.
function brook(dur) {
  const n = Math.floor(dur * SR), x = new Float32Array(n), flt = band(250, 2200);
  const env = (t) => smooth(t / 0.35) * smooth((dur - t) / 0.45) * (1 + 0.3 * Math.exp(-(((t - 0.45) / 0.3) ** 2)));
  let am = 0.5;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    am += (rnd() - 0.5) * 0.004; am = Math.max(0.25, Math.min(0.8, am));
    x[i] = flt(rnd() * 2 - 1) * 0.5 * am * env(t);
  }
  for (let i = 0; i < n; i++) if (rnd() < 32 * env(i / SR) / SR) {
    const f0 = 500 + 1300 * rnd() ** 1.5, tau = 0.006 + 0.018 * rnd(), rise = 8 + 18 * rnd(), A = (0.4 + 0.6 * rnd()) * 0.9;
    let ph = 0;
    for (let k = 0; k < 5 * tau * SR && i + k < n; k++) {
      const t = k / SR;
      ph += 2 * Math.PI * f0 * (1 + rise * t) / SR;
      x[i + k] += A * Math.sin(ph) * Math.exp(-t / tau) * Math.min(1, t / 0.001);
    }
  }
  let s = 0, c = 0;
  for (let i = Math.floor(0.4 * SR); i < n - 0.5 * SR; i++) { s += x[i] * x[i]; c++; }
  const r = Math.sqrt(s / Math.max(1, c)) || 1;
  for (let i = 0; i < n; i++) x[i] /= r;
  return x;
}
// Взмах крыла: мягкое «фр» — шум средней полосы с быстрой атакой и затуханием, немного пёрышек сверху
function flap() {
  const n = Math.floor(0.2 * SR), x = new Float32Array(n), body = band(300, 1500), top = band(2500, 6000);
  for (let i = 0; i < n; i++) {
    const t = i / SR, e = t < 0.025 ? smooth(t / 0.025) : Math.exp(-(t - 0.025) / 0.05);
    x[i] = e * (body(rnd() * 2 - 1) + 0.15 * top(rnd() * 2 - 1) + 0.25 * Math.sin(2 * Math.PI * 130 * t));
  }
  return peakNorm(x);
}

// ---------- голос: громкость в местах речи ----------
const rawV = execFileSync('ffmpeg', ['-v', 'error', '-i', path.join(POEM, 'voice.mp3'), '-f', 'f32le', '-ac', '1', '-ar', String(SR), '-'], { maxBuffer: 1 << 28 });
const voice = new Float32Array(rawV.length / 4);
for (let i = 0; i < voice.length; i++) voice[i] = rawV.readFloatLE(i * 4);
const speech = LINES.map((l) => [l.s - V0, l.e - V0]); // окна речи во времени голоса
let VR = 0;
{
  let s = 0, c = 0;
  for (const [a, b] of speech) for (let i = Math.floor(a * SR); i < Math.min(voice.length, b * SR); i++) { s += voice[i] ** 2; c++; }
  VR = Math.sqrt(s / c);
}

// ---------- расстановка шумов (уровни — в долях RMS голоса) ----------
const SFXLOG = {};
const log = (k, v) => { (SFXLOG[k] ??= []).push(Math.round(v * 1000) / 1000); };
function put(t0, x, gain, pan) {
  const i0 = Math.round(t0 * SR);
  for (let i = 0; i < x.length; i++) {
    const j = i0 + i;
    if (j < 0 || j >= N) continue;
    const [l, r] = panLR(typeof pan === 'function' ? pan(i / x.length) : pan);
    sfx[0][j] += x[i] * gain * l; sfx[1][j] += x[i] * gain * r;
  }
}
// обложка откидывается влево и ложится на парту
{
  const d = EV.opene - EV.open;
  put(EV.open, rustle(d, { lo: 700, hi: 5000, peak: 0.6, rate: 70, grain: [4, 20], smoothMix: 0.3 }), 1.9 * VR, (u) => 0.45 - 0.9 * u);
  put(EV.open, whoosh(d, { lo: 120, hi: 800, peak: 0.75 }), 1.5 * VR, (u) => 0.3 - 0.6 * u);
  put(EV.opene + FRAME - 0.003, thud(), 2.6 * VR, -0.35);
  log('open_thud', EV.opene + FRAME);
}
// перевороты страниц: лист идёт справа налево, в конце мягко ложится
for (let k = 1; k <= 3; k++) {
  const a = EV[`f${k}`], b = EV[`f${k}e`], d = b - a;
  put(a, rustle(d, { lo: 1600, hi: 7500, peak: 0.45, rate: 140 }), 1.3 * VR, (u) => 0.55 - 1.1 * u);
  put(a, whoosh(d, { lo: 200, hi: 1200, peak: 0.5 }), 0.5 * VR, (u) => 0.4 - 0.8 * u);
  put(b + FRAME - 0.002, slap(), 0.75 * VR, -0.45);
  log('flip_land', b + FRAME);
}
// «Ветер в поле воет»: лёгкий порыв ~1,5 с и трепет уголков страницы
put(EV.vet + FRAME, wind(1.5), 0.85 * VR, (u) => -0.3 + 0.6 * u);
put(EV.vet + FRAME + 0.1, flutter(1.2), 0.28 * VR, 0.15);
log('wind', EV.vet + FRAME);
// «Дождик моросит»: редкие капли по бумаге до переворота страницы
for (let t = EV.dzh + 0.12; t < EV.f3 - 0.08; t += 0.15 + 0.2 * rnd()) {
  put(t, drop(), (0.9 + 0.6 * rnd()) * VR, -0.6 + rnd());
  log('drops', t);
}
// «Зашумели воды быстрого ручья»: журчание до конца строки 14, ручей бежит слева направо
{
  const t1 = E(14) + 0.25, d = t1 - EV.zas;
  put(EV.zas, brook(d), 0.13 * VR, (u) => -0.4 + 0.8 * u);
  log('brook', EV.zas); log('brook', t1);
}
// «Птички улетели»: пять птичек по два мягких взмаха, улетают вправо-вверх
[0, 0.24, 0.5, 0.78, 1.05].forEach((dt, i) => {
  const t = EV.ule + FRAME + dt;
  for (let j = 0; j < 2; j++) put(t + j * 0.12 - 0.025, flap(), (1.15 - 0.08 * i) * (j ? 0.7 : 1) * VR, 0.05 + 0.13 * i);
  log('flaps', t);
});
// альбом закрывается: шелест, воздух и мягкий хлопок картона
{
  const d = EV.closee - EV.close;
  put(EV.close, rustle(d, { lo: 700, hi: 5000, peak: 0.55, rate: 70, grain: [4, 20], smoothMix: 0.3 }), 1.7 * VR, (u) => -0.4 + 0.6 * u);
  put(EV.close, whoosh(d, { lo: 100, hi: 700, peak: 0.85 }), 1.6 * VR, (u) => -0.3 + 0.5 * u);
  put(EV.closee + FRAME - 0.003, thud({ f0: 105, f1: 60, decay: 0.05, lpf: 800 }), 2.8 * VR, 0.1);
  put(EV.closee + FRAME - 0.004, slap({ lo: 400, hi: 2500, decay: 0.05, len: 0.25 }), 0.9 * VR, 0.1);
  log('close_clap', EV.closee + FRAME);
}

// ---------- реверберация (Freeverb-подобная), уровень хвоста подгоняется к доле сухого сигнала ----------
function reverb(src, wetRatio) {
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617], aps = [556, 441, 341, 225], pre = Math.round(0.014 * SR);
  const outs = [0, 1].map((ch) => {
    const cb = combs.map((d) => ({ b: new Float32Array(d + ch * 23), i: 0, f: 0 }));
    const ab = aps.map((d) => ({ b: new Float32Array(d + ch * 23), i: 0 }));
    const y = new Float32Array(N);
    for (let n = 0; n < N; n++) {
      const x = n >= pre ? (src[0][n - pre] + src[1][n - pre]) * 0.015 : 0;
      let o = 0;
      for (const c of cb) { const v = c.b[c.i]; c.f = v * 0.7 + c.f * 0.3; c.b[c.i] = x + c.f * 0.84; c.i = (c.i + 1) % c.b.length; o += v; }
      for (const a of ab) { const v = a.b[a.i]; a.b[a.i] = o + v * 0.5; a.i = (a.i + 1) % a.b.length; o = v - o; }
      y[n] = o;
    }
    return y;
  });
  let sd = 0, sw = 0;
  for (let n = 0; n < N; n += 2) { sd += src[0][n] ** 2 + src[1][n] ** 2; sw += outs[0][n] ** 2 + outs[1][n] ** 2; }
  const k = wetRatio * Math.sqrt(sd / Math.max(1e-20, sw));
  return [0, 1].map((ch) => { const o = new Float32Array(N); for (let n = 0; n < N; n++) o[n] = src[ch][n] + outs[ch][n] * k; return o; });
}
const musW = reverb(mus, 0.5);
const sfxW = reverb(sfx, 0.2);

// ---------- громкость: K-взвешивание (BS.1770) и окна речи ----------
function kWeight(x) {
  let K = Math.tan(Math.PI * 1681.974450955533 / SR), Q = 0.7071752369554196;
  const Vh = 10 ** (3.999843853973347 / 20), Vb = Vh ** 0.4996667741545416;
  let a0 = 1 + K / Q + K * K;
  const s = { b0: (Vh + Vb * K / Q + K * K) / a0, b1: 2 * (K * K - Vh) / a0, b2: (Vh - Vb * K / Q + K * K) / a0, a1: 2 * (K * K - 1) / a0, a2: (1 - K / Q + K * K) / a0, x1: 0, x2: 0, y1: 0, y2: 0 };
  K = Math.tan(Math.PI * 38.13547087602444 / SR); Q = 0.5003270373238773; a0 = 1 + K / Q + K * K;
  const h = { b0: 1, b1: -2, b2: 1, a1: 2 * (K * K - 1) / a0, a2: (1 - K / Q + K * K) / a0, x1: 0, x2: 0, y1: 0, y2: 0 };
  const y = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) y[i] = bq(h, bq(s, x[i]));
  return y;
}
const msIn = (chs, wins, off = 0) => {
  let s = 0, c = 0;
  for (const [a, b] of wins) for (let i = Math.max(0, Math.floor((a + off) * SR)); i < Math.min(chs[0].length, (b + off) * SR); i++) { for (const x of chs) s += x[i] * x[i]; c++; }
  return s / Math.max(1, c);
};
const lufs = (ms) => -0.691 + 10 * Math.log10(ms);
const kv = kWeight(voice);
const voiceMS = 2 * msIn([kv], speech); // в ролике голос моно на оба канала (pan FL=FC, FR=FC)

const LOUD = db(LOUD_DB), GAP = db(GAP_DB);
const shape = [[0, 0], [0.9, LOUD], [L(1) - 0.9, LOUD], [L(1) - 0.08, 1]];
for (const n of [4, 8, 12]) {
  const a = E(n) + 0.05, b = L(n + 1) - 0.06;
  if (b - a < 0.4) continue;
  const r = Math.min(0.25, (b - a) / 3);
  shape.push([a, 1], [a + r, GAP], [b - r, GAP], [b, 1]);
}
shape.push([E(16) + 0.1, 1], [E(16) + 1.3, LOUD], [TOTAL - 3.2, LOUD], [TOTAL - 0.05, 0], [TOTAL, 0]);
const shaped = [0, 1].map((ch) => { const o = new Float32Array(N); for (let i = 0; i < N; i++) o[i] = musW[ch][i] * curve(shape, i / SR); return o; });
const kmus = shaped.map(kWeight);
const G = Math.sqrt(voiceMS * db(UNDER_DB) ** 2 / msIn(kmus, speech, V0));

const out = [0, 1].map((ch) => { const o = new Float32Array(N); for (let i = 0; i < N; i++) o[i] = shaped[ch][i] * G + sfxW[ch][i]; return o; });
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(out[0][i]), Math.abs(out[1][i]));
const limit = peak > 0.89 ? 0.89 / peak : 1;
if (limit < 1) console.warn(`пик ${peak.toFixed(3)} — всё ослаблено в ${limit.toFixed(3)} раза, музыка под голосом станет тише`);

// ---------- запись ----------
const data = Buffer.alloc(44 + N * 4);
data.write('RIFF', 0); data.writeUInt32LE(36 + N * 4, 4); data.write('WAVEfmt ', 8);
data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(2, 22);
data.writeUInt32LE(SR, 24); data.writeUInt32LE(SR * 4, 28); data.writeUInt16LE(4, 32); data.writeUInt16LE(16, 34);
data.write('data', 36); data.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) for (const ch of [0, 1]) {
  const v = Math.round(out[ch][i] * limit * 32767 + (rnd() - rnd()));
  data.writeInt16LE(Math.max(-32768, Math.min(32767, v)), 44 + i * 4 + ch * 2);
}
fs.writeFileSync(path.join(HERE, 'music.wav'), data);
fs.writeFileSync(path.join(HERE, 'sfx.json'), JSON.stringify({ note: 'пики шумов, секунды ролика', V0, OUTRO, total: TOTAL, ...SFXLOG }, null, 1));

// ---------- отчёт ----------
const kmix = [0, 1].map((ch) => kWeight(out[ch].map((v) => v * limit)));
const ksfx = sfxW.map(kWeight);
const Lv = lufs(voiceMS), Lm = lufs(msIn(kmus, speech, V0) * G * G * limit * limit), Lall = lufs(msIn(kmix, speech, V0)), Ls = lufs(msIn(ksfx, speech, V0) * limit * limit);
const Lintro = lufs(msIn(kmix, [[1.0, EV.open - 0.1]])), Lout = lufs(msIn(kmix, [[E(16) + 1.5, EV.close - 0.1], [fin + 0.3, TOTAL - 3.3]]));
console.log(`события: ${evSrc}; V0 ${V0}, OUTRO ${OUTRO}, длина ${TOTAL} с (${N} отсчётов)`);
console.log('такты:', bars.map((b) => `${b.chord}@${b.t.toFixed(2)}`).join(' '));
console.log(`голос в местах речи ${Lv.toFixed(1)} LUFS (моно на оба канала); музыка там же ${Lm.toFixed(1)} (${(Lm - Lv).toFixed(1)} дБ), с шумами ${Lall.toFixed(1)} (${(Lall - Lv).toFixed(1)} дБ), шумы отдельно ${Ls.toFixed(1)}`);
console.log(`заставка ${Lintro.toFixed(1)} LUFS (${(Lintro - Lv).toFixed(1)} дБ к голосу), финал ${Lout.toFixed(1)} (${(Lout - Lv).toFixed(1)} дБ)`);
console.log(`music.wav: пик ${(peak * limit).toFixed(4)} (${(20 * Math.log10(peak * limit)).toFixed(1)} dBFS), множитель ${limit.toFixed(3)}`);
