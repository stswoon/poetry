// Музыка и шумы к басне И. А. Крылова «Квартет», стиль «Шоу талантов» (выпуск телешоу «Лесные таланты»).
//
// Своя заставка телешоу, ~133 BPM, фа мажор: бочка, хлопки, хай-хэт, синт-бас, синтетическая «медь» (секция из
// трёх пил на голос с фильтром, который раскрывается на атаке) и труба-соло. Мелодия и аранжировка свои.
//   0 … V0      заставка: дробь малого и подъём до хлопушки (0,45 с), удар с тарелкой и конфетти, фанфара в семь
//               долей (A C F — E F G F D C | B♭ D F — E G | F!), последний удар за долю до голоса;
//   под голосом тихий пульс шоу, мелодии нет, в паузах между блоками — «та-дам» меди с тарелкой:
//               строки 1–8 — выход участников (бочка на 1 и 3, хлопки на 2 и 4, бас «умпа», стабы меди);
//               на «Квартет» и на «свет» — «та-дам», после «свет» оркестр шоу замолкает: играют участники;
//               10–15 — план Мартышки (лёгкий бит, щипковое арпеджио), на «запляшут» — танцевальный бит;
//               18–20 — «секрет» Осла (после «дзынь» лампочки добавляются колокольчики);
//               21 — «чинно в ряд»: важное «умпа» на четверти; 23–25 — спор и драка: минор, погоня, томы;
//               26–27 — Соловей: золотая подушка, арфа, тихий пульс; 28–31 — просьба (минорный оттенок);
//               32–36 — речь Соловья: подушка, тихий пульс и флейта-соловей, на строке 36 — дробь перед вердиктом;
//   финал (fin) — короткая заставка шоу (тот же мотив с другим окончанием), финальный аккорд и затухание.
// Шумы — синтез, только с причиной в кадре, пик на кадр позже события: хлопушки конфетти, аплодисменты зала,
// три попытки квартета (настройка струн → фальшивый скрежет → зуммер жюри «✕»), «вжух» стульев, «дзынь» лампочки,
// мультяшная драка (удары, «бум», свист стульев), крылья и трели Соловья, четыре штампа и большой штамп «НЕ ПРОШЛИ»,
// грустный тромбон «уа-уа-уа-уааа».
//
// Запуск: node make_music.mjs [V0] [OUTRO]        (по умолчанию 3.6 и 7.5; можно --v0=3.6 --outro=7.5)
// Читает ../timings.json, ../voice.mp3 (через ffmpeg) и events.json (пишет ../video/build.py), если он совпадает
// с таймингами; иначе времена событий считает по timings.json так же, как build.py (fin = конец голоса + 2,6 с).
// Пишет music.wav (44,1 кГц, 16 бит, стерео, длина V0 + голос + OUTRO) и sfx.json (времена шумов и музыки).
// Без зависимостей: node и ffmpeg.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const POEM = path.dirname(HERE);
const SR = 44100, FRAME = 1 / 30;
// уровни музыки (RMS, дБ к RMS голоса в местах речи)
const UNDER_DB = -19;                         // фон под голосом в среднем по строкам
const INTRO_DB = -7, FIN_DB = -6.5;           // заставка и финал
const STING_DB = -11;                         // «та-дам» в паузах между блоками
// шумы: громкость в своём окне относительно голоса в местах речи (K-взвешенно, BS.1770)
const SFX_DB = {
  pop: [-4, -12, -8], applause: -16, tune: -17, timid: -18, screech: [-11.5, -13, -12.5], buzzer: [-13, -13.5, -13], chair: -17,
  ding: -12, fight: -13, flap: -19, trill: -11, stamp: -9, bigstamp: -5, trombone: -7,
};
const FIN_AFTER = 2.6; // запасной путь: fin = конец последней строки + 2,6 с (как в ../video/build.py)

// ---------- аргументы и время ----------
const argv = process.argv.slice(2);
const pos = argv.filter((a) => !a.startsWith('--'));
const opt = (name, i, def) => {
  const kv = argv.find((a) => a.startsWith(`--${name}=`));
  const v = kv ? Number(kv.split('=')[1]) : pos[i] !== undefined ? Number(pos[i]) : def;
  if (!Number.isFinite(v)) throw new Error(`плохое значение ${name}`);
  return v;
};
const V0 = opt('v0', 0, 3.6), OUTRO = opt('outro', 1, 7.5);
if (V0 < 2.6 || OUTRO < 5) throw new Error('нужно V0 >= 2.6 и OUTRO >= 5');

const r3 = (x) => Math.round(x * 1000) / 1000;
const T = JSON.parse(fs.readFileSync(path.join(POEM, 'timings.json'), 'utf8'));
const VD = T.voiceDuration;
const TOTAL = r3(V0 + VD + OUTRO);
const N = Math.round(TOTAL * SR);
const LINES = T.lines.map((l) => ({ s: l.start + V0, e: l.end + V0, words: l.words }));
const NL = LINES.length;
if (NL !== 36) throw new Error(`ожидалось 36 строк, в timings.json ${NL}`);

// события — так же, как в ../video/build.py
const norm = (s) => s.toLowerCase().replace(/ё/g, 'е').replace(/[^а-яa-z]/g, '');
function eventsFromTimings() {
  const ev = { V0 };
  LINES.forEach((l, i) => { ev[`L${i + 1}`] = r3(l.s); ev[`E${i + 1}`] = r3(l.e); });
  const word = (n, w) => {
    const x = LINES[n - 1].words.find((q) => norm(q.text) === norm(w));
    if (!x) throw new Error(`нет слова «${w}» в строке ${n}`);
    return r3(x.start + V0);
  };
  const W = {
    w_mart: [1, 'Проказница-Мартышка'], w_mish: [4, 'Мишка'], w_kv1: [5, 'Квартет'], w_not: [6, 'нот'], w_basa: [6, 'баса'],
    w_alta: [6, 'альта'], w_skr: [6, 'скрипки'], w_seli: [7, 'сели'], w_lipki: [7, 'липки'], w_plen: [8, 'Пленять'],
    w_svet: [8, 'свет'], w_udar: [9, 'Ударили'], w_derut: [9, 'дерут'], w_tolku: [9, 'толку'], w_net: [9, 'нет'],
    w_stoy: [10, 'Стой'], w_zapl: [15, 'запляшут'], w_rass: [16, 'Расселись'], w_nach: [16, 'начали'], w_neid1: [17, 'нейдёт'],
    w_sekret: [18, 'секрет'], w_usel: [21, 'уселись'], w_neid2: [22, 'нейдёт'], w_razb: [23, 'разборы'], w_solov: [26, 'Соловью'],
    w_prilet: [26, 'прилететь'], w_noty: [30, 'ноты'], w_instr: [30, 'инструменты'], w_sest: [31, 'сесть'], w_ushi: [33, 'уши'],
    w_ponezh: [33, 'понежней'], w_sadit: [35, 'садитесь'], w_godit: [36, 'годитесь'],
  };
  for (const [k, [n, w]] of Object.entries(W)) ev[k] = word(n, w);
  ev.fin = r3(ev[`E${NL}`] + FIN_AFTER);
  return ev;
}
const EV = eventsFromTimings();
let evSrc = 'timings.json';
{
  const p = path.join(HERE, 'events.json');
  if (fs.existsSync(p)) {
    const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
    const shift = V0 - (raw.V0 ?? V0);
    if (Math.abs(raw.L1 + shift - EV.L1) < 0.02 && Math.abs(raw[`E${NL}`] + shift - EV[`E${NL}`]) < 0.02) {
      for (const [k, v] of Object.entries(raw)) if (typeof v === 'number' && !['V0', 'OUTRO', 'total'].includes(k)) EV[k] = r3(v + shift);
      evSrc = shift ? `events.json со сдвигом ${shift > 0 ? '+' : ''}${shift.toFixed(2)} с` : 'events.json';
      if (Math.abs((raw.total ?? TOTAL) + shift - TOTAL) > 0.002) console.warn(`внимание: total в events.json ${raw.total}, у музыки ${TOTAL} (другой OUTRO?)`);
    } else console.warn('events.json не совпадает с timings.json — события считаю по timings.json');
  }
}
if (EV.fin > TOTAL - 4) throw new Error(`финал слишком короткий: fin ${EV.fin}, длина ${TOTAL}`);
const L = (n) => EV[`L${n}`], E = (n) => EV[`E${n}`];
const FIGHT = [EV.w_razb - 0.1, E(25) + 0.35]; // облако драки (video/src/main.js)

// ---------- помощники ----------
let seed = 1811;
const rnd = () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const wn = () => rnd() * 2 - 1;
const hz = (m) => 440 * 2 ** ((m - 69) / 12);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, u) => a + (b - a) * u;
const smooth = (u) => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
const easeInOut = (u) => { u = clamp(u, 0, 1); return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
const db = (x) => 10 ** (x / 20);
const curve = (keys, t) => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) {
    const [a, va] = keys[i - 1], [b, vb] = keys[i];
    return va + (vb - va) * smooth((t - a) / Math.max(1e-6, b - a));
  }
  return keys[keys.length - 1][1];
};
const panLR = (p) => [Math.cos((clamp(p, -1, 1) + 1) * Math.PI / 4), Math.sin((clamp(p, -1, 1) + 1) * Math.PI / 4)];
const scrPan = (x) => clamp((x - 960) / 960 * 0.7, -0.8, 0.8); // x в кадре 1920 → панорама
const stereo = () => [new Float32Array(N), new Float32Array(N)];
const polyblep = (t, dt) => (t < dt ? ((t /= dt), t + t - t * t - 1) : t > 1 - dt ? ((t = (t - 1) / dt), t * t + t + t + 1) : 0);

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
// фильтр с переменным срезом (state variable, TPT)
function svf() {
  let ic1 = 0, ic2 = 0, a1 = 1, a2 = 0, a3 = 0;
  return {
    set(fc, Q) { const g = Math.tan(Math.PI * Math.min(fc, SR * 0.45) / SR), k = 1 / Q; a1 = 1 / (1 + g * (g + k)); a2 = g * a1; a3 = g * a2; },
    lp(x) { const v3 = x - ic2, v1 = a1 * ic1 + a2 * v3, v2 = ic2 + a2 * ic1 + a3 * v3; ic1 = 2 * v1 - ic1; ic2 = 2 * v2 - ic2; return v2; },
    bp(x) { const v3 = x - ic2, v1 = a1 * ic1 + a2 * v3, v2 = ic2 + a2 * ic1 + a3 * v3; ic1 = 2 * v1 - ic1; ic2 = 2 * v2 - ic2; return v1; },
  };
}

// шины музыки и посыл на реверберацию
const BUS = { бочка: stereo(), малый: stereo(), хэт: stereo(), перкуссия: stereo(), бас: stereo(), медь: stereo(), соло: stereo(), клавиши: stereo(), подушка: stereo() };
const { бочка: kb_, малый: sn_, хэт: hh_, перкуссия: pc_, бас: bs_, медь: br_, соло: ld_, клавиши: ky_, подушка: pd_ } = BUS;
const send = stereo();
const sfx = stereo(), sfxSend = stereo();
function put(bus, i, y, gl, gr, sendK, sbus = send) {
  if (i < 0 || i >= N) return;
  bus[0][i] += y * gl; bus[1][i] += y * gr;
  if (sendK) { sbus[0][i] += y * gl * sendK; sbus[1][i] += y * gr * sendK; }
}
// моно-буфер в шину музыки
function addBuf(bus, t0, x, pan = 0, sendK = 0.2, gain = 1) {
  const i0 = Math.round(t0 * SR), [gl, gr] = panLR(pan);
  for (let i = 0; i < x.length; i++) put(bus, i0 + i, x[i] * gain, gl, gr, sendK);
}
const hum = (s = 0.004) => (rnd() - 0.5) * 2 * s;

// ---------- барабаны ----------
function kick(t0, vel = 0.8) {
  const i0 = Math.round(t0 * SR), len = Math.round(0.4 * SR);
  let ph = 0, prev = 0, hp = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR, f = 48 + 90 * Math.exp(-t / 0.026) + 160 * Math.exp(-t / 0.0035);
    ph += 2 * Math.PI * f / SR;
    const n = wn(); hp = 0.55 * (hp + n - prev); prev = n;
    const body = Math.sin(ph) * Math.exp(-t / 0.14) * smooth(t / 0.0012) * smooth((0.4 - t) / 0.06);
    const y = Math.tanh(1.8 * (body + hp * Math.exp(-t / 0.0025) * 0.25)) / Math.tanh(1.8) * vel * 0.85;
    put(kb_, i0 + i, y, 0.7071, 0.7071, 0.03);
  }
}
function snare(t0, vel = 0.6, { pan = 0.05, sendK = 0.16, dec = 0.13, tone = 1 } = {}) {
  const i0 = Math.round(t0 * SR), len = Math.round((dec * 6 + 0.02) * SR), [gl, gr] = panLR(pan);
  const hp = biquad('hp', 900, 0.7), bp = biquad('bp', 3300, 0.6);
  let p1 = 0, p2 = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    p1 += 2 * Math.PI * (190 + 45 * Math.exp(-t / 0.008)) / SR; p2 += 2 * Math.PI * 335 / SR;
    const nz = bq(bp, bq(hp, wn())) * 2.2;
    const y = (tone * (0.55 * Math.sin(p1) * Math.exp(-t / 0.055) + 0.22 * Math.sin(p2) * Math.exp(-t / 0.035))
      + nz * Math.exp(-t / dec) * (1 + 1.3 * Math.exp(-t / 0.008))) * smooth(t / 0.0008) * smooth((len / SR - t) / 0.01) * vel * 0.68;
    put(sn_, i0 + i, y, gl, gr, sendK);
  }
}
// хлопок: три быстрых всплеска шума и короткий хвост; слой из двух «ладоней» чуть врозь
function clap(t0, vel = 0.5, { pan = 0, sendK = 0.2 } = {}) {
  for (const [dt, p, v] of [[0, pan - 0.18, 1], [0.004, pan + 0.18, 0.8]]) {
    const i0 = Math.round((t0 + dt) * SR), len = Math.round(0.24 * SR), [gl, gr] = panLR(p);
    const bp = biquad('bp', 1150 + rnd() * 200, 1.0), hp = biquad('hp', 550, 0.7);
    for (let i = 0; i < len; i++) {
      const t = i / SR;
      let env = 0;
      for (const d of [0, 0.0095, 0.0195]) if (t >= d) env = Math.max(env, Math.exp(-(t - d) / 0.0035));
      if (t >= 0.025) env = Math.max(env, 0.55 * Math.exp(-(t - 0.025) / 0.065));
      const y = bq(bp, bq(hp, wn())) * env * smooth(t / 0.0004) * smooth((0.24 - t) / 0.03) * vel * v * 1.7;
      put(sn_, i0 + i, y, gl, gr, sendK);
    }
  }
}
function hat(t0, vel = 0.3, open = false) {
  const i0 = Math.round(t0 * SR), dec = open ? 0.11 : 0.032, len = Math.round((dec * 7 + 0.01) * SR), [gl, gr] = panLR(0.24);
  const h1 = biquad('hp', 7200, 0.7), h2 = biquad('hp', 7200, 0.7), b = biquad('bp', 10500, 0.9);
  for (let i = 0; i < len; i++) {
    const t = i / SR, x = bq(h2, bq(h1, wn()));
    const y = (x + 0.6 * bq(b, x)) * Math.exp(-t / dec) * smooth(t / 0.0006) * smooth((len / SR - t) / 0.008) * vel * 0.85;
    put(hh_, i0 + i, y, gl, gr, 0.06);
  }
}
function shaker(t0, vel = 0.1, pan = -0.3) {
  const i0 = Math.round(t0 * SR), len = Math.round(0.09 * SR), [gl, gr] = panLR(pan), h = biquad('hp', 5200, 0.7), b = biquad('bp', 8500, 0.8);
  for (let i = 0; i < len; i++) {
    const t = i / SR, x = bq(h, wn());
    const y = (x * 0.6 + bq(b, x)) * smooth(t / 0.007) * Math.exp(-t / 0.028) * smooth((0.09 - t) / 0.01) * vel;
    put(hh_, i0 + i, y, gl, gr, 0.08);
  }
}
function crash(t0, vel = 0.7, dec = 0.9) {
  const i0 = Math.round(t0 * SR), len = Math.min(N - i0, Math.round(dec * 4.2 * SR));
  const f = [0, 1].map(() => [biquad('hp', 3200, 0.7), biquad('bp', 6800, 0.5), biquad('lp', 13000, 0.7)]);
  for (let i = 0; i < len; i++) {
    const t = i / SR, env = Math.exp(-t / dec) * (1 + 1.6 * Math.exp(-t / 0.035)) * smooth(t / 0.0008) * smooth((len / SR - t) / 0.3) * vel * 0.13;
    for (const ch of [0, 1]) {
      const [h, b, l] = f[ch], x = bq(h, wn());
      const y = bq(l, x + 0.8 * bq(b, x)) * env;
      if (i0 + i < N && i0 + i >= 0) { hh_[ch][i0 + i] += y; send[ch][i0 + i] += y * 0.22; }
    }
  }
}
function tom(t0, f, vel = 0.6, { dec = 0.26, pan = 0, parts = [[1, 1], [1.59, 0.25]], sendK = 0.12, mallet = 0.25 } = {}) {
  const i0 = Math.round(t0 * SR), len = Math.round((dec * 6) * SR), [gl, gr] = panLR(pan), lp = biquad('lp', 1200, 0.7);
  const ph = parts.map(() => 0);
  for (let i = 0; i < len; i++) {
    const t = i / SR, glide = 1 + 0.35 * Math.exp(-t / 0.018);
    let s = 0;
    parts.forEach(([r, a], k) => { ph[k] += 2 * Math.PI * f * r * glide / SR; s += a * Math.sin(ph[k]) * Math.exp(-t / (dec / (1 + 0.6 * k))); });
    const y = (s + mallet * bq(lp, wn()) * Math.exp(-t / 0.012)) * smooth(t / 0.0015) * smooth((len / SR - t) / 0.04) * vel * 0.42;
    put(pc_, i0 + i, y, gl, gr, sendK);
  }
}
const timp = (t0, m, vel, pan = -0.1) => tom(t0, hz(m), vel, { dec: 0.55, pan, parts: [[1, 1], [1.5, 0.45], [1.98, 0.25]], sendK: 0.25, mallet: 0.4 });
// римшот-щелчок
function rim(t0, vel = 0.3, pan = 0.12) {
  const i0 = Math.round(t0 * SR), len = Math.round(0.07 * SR), [gl, gr] = panLR(pan), bp = biquad('bp', 2600, 1.5);
  let p1 = 0, p2 = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR; p1 += 2 * Math.PI * 1720 / SR; p2 += 2 * Math.PI * 470 / SR;
    const y = (0.6 * Math.sin(p1) * Math.exp(-t / 0.006) + 0.45 * Math.sin(p2) * Math.exp(-t / 0.014) + 0.8 * bq(bp, wn()) * Math.exp(-t / 0.004))
      * smooth(t / 0.0004) * smooth((0.07 - t) / 0.01) * vel * 0.7;
    put(pc_, i0 + i, y, gl, gr, 0.15);
  }
}
function roll(t0, t1, v0, v1, step, dec = 0.075) {
  for (let t = t0, k = 0; t < t1 - 1e-6; t += step, k++) {
    const u = (t - t0) / Math.max(1e-6, t1 - t0);
    snare(t + hum(0.003), lerp(v0, v1, u * u) * (0.88 + 0.24 * rnd()) * (k % 2 ? 0.86 : 1), { dec, sendK: 0.1 });
  }
}
// шумовой подъём: полосовой шум, центр уходит вверх
function riser(t0, t1, vel = 0.5, f0 = 350, f1 = 7000) {
  const i0 = Math.round(t0 * SR), len = Math.round((t1 - t0) * SR), F = [svf(), svf()];
  for (let i = 0; i < len; i++) {
    const u = i / len;
    if ((i & 15) === 0) { const fc = f0 * (f1 / f0) ** (u ** 1.3); F[0].set(fc, 1.6); F[1].set(fc * 1.06, 1.6); }
    const env = u ** 2.2 * smooth((len - i) / (0.012 * SR)) * vel * 0.3;
    for (const ch of [0, 1]) { const y = F[ch].bp(wn()) * env; if (i0 + i < N) { pd_[ch][i0 + i] += y; send[ch][i0 + i] += y * 0.25; } }
  }
}

// ---------- синтезаторы ----------
// «медь», труба, подушка, щипок: несколько пил (PolyBLEP) с расстройкой, ФНЧ, срез которого растёт с громкостью
// (и с «блатом» на атаке), подъезд к ноте снизу, вибрато на долгих нотах.
function voice(bus, t0, dur, m, o = {}) {
  const { vel = 0.6, pan = 0, gain = 0.08, nOsc = 3, det = 10, bright = 3.5, sus = 0.7, att = 0.016, dec = 0.15, rel = 0.1,
    scoop = 0.25, vib = 0, vibRate = 5.4, bend = null, sendK = 0.28, swell = null, amp = null, q = 0.85, blat = 0.6 } = o;
  const i0 = Math.round(t0 * SR);
  if (i0 >= N) return;
  const len = Math.min(N - i0, Math.ceil((dur + rel * 9) * SR)), [gl, gr] = panLR(pan);
  const ph = Array.from({ length: nOsc }, () => rnd());
  const ratio = Array.from({ length: nOsc }, (_, k) => 2 ** ((nOsc === 1 ? 0 : det * (2 * k / (nOsc - 1) - 1)) / 1200));
  const F = svf(), vph = rnd() * 6.28;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    let semis = m - scoop * Math.exp(-t / 0.035);
    if (vib && dur > 0.3) semis += vib * smooth((t - 0.16) / 0.25) * Math.sin(2 * Math.PI * vibRate * t + vph);
    if (bend) semis += bend(t);
    const f = hz(semis), dt = f / SR;
    let s = 0;
    for (let k = 0; k < nOsc; k++) {
      const d = dt * ratio[k];
      ph[k] += d; if (ph[k] >= 1) ph[k] -= 1;
      s += 2 * ph[k] - 1 - polyblep(ph[k], d);
    }
    s /= nOsc;
    let A = t < att ? smooth(t / att) : sus + (1 - sus) * Math.exp(-(t - att) / dec);
    if (swell) A *= lerp(swell[0], swell[1], clamp(t / dur, 0, 1) ** (swell[2] ?? 1));
    if (amp) A *= amp(t);
    if (t > dur) A *= Math.exp(-(t - dur) / rel);
    if ((i & 7) === 0) F.set(Math.min(14000, f * (1 + bright * vel * A * (1 + blat * Math.exp(-t / 0.04))) + 120), q);
    put(bus, i0 + i, F.lp(s) * A * vel * gain, gl, gr, sendK);
  }
}
// синт-бас: две пилы и синус-основа, фильтр открывается на атаке
function bass(t0, dur, m, vel = 0.7, { bend = null, amp = null, sendK = 0.03 } = {}) {
  const i0 = Math.round(t0 * SR);
  if (i0 >= N) return;
  const rel = 0.03, len = Math.min(N - i0, Math.ceil((dur + rel * 9) * SR)), F = svf();
  let p1 = rnd(), p2 = rnd(), ps = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR, semis = m + (bend ? bend(t) : 0), f = hz(semis), dt = f / SR;
    p1 += dt; if (p1 >= 1) p1 -= 1;
    p2 += dt * 1.0035; if (p2 >= 1) p2 -= 1;
    ps += 2 * Math.PI * f / SR;
    const saw = 0.5 * (2 * p1 - 1 - polyblep(p1, dt)) + 0.5 * (2 * p2 - 1 - polyblep(p2, dt * 1.0035));
    let A = smooth(t / 0.004) * (0.72 + 0.28 * Math.exp(-t / 0.09));
    if (amp) A *= amp(t);
    if (t > dur) A *= Math.exp(-(t - dur) / rel);
    if ((i & 7) === 0) F.set(Math.min(6000, 80 + f * 1.3 + 1500 * vel * Math.exp(-t / 0.07)), 0.95);
    put(bs_, i0 + i, (F.lp(saw) * 0.85 + Math.sin(ps) * 0.5) * A * vel * 0.6, 0.7071, 0.7071, sendK);
  }
}
// арфа: затухающие гармоники и щипок
function harp(t0, m, vel = 0.4, pan = 0, dec = 1.3) {
  const i0 = Math.round(t0 * SR), f = hz(m);
  if (i0 >= N) return;
  const len = Math.min(N - i0, Math.round(dec * 4 * SR)), [gl, gr] = panLR(pan), bp = biquad('bp', Math.min(f * 4, 9000), 2);
  const parts = [[1, 1, dec], [2, 0.42, dec * 0.45], [3, 0.2, dec * 0.28], [4, 0.09, dec * 0.18], [5, 0.04, dec * 0.12]];
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    let s = 0;
    for (const [r, a, d] of parts) s += a * Math.sin(2 * Math.PI * f * r * (1 + 0.0003 * r * r) * t) * Math.exp(-t / d);
    s += 0.25 * bq(bp, wn()) * Math.exp(-t / 0.004);
    put(ky_, i0 + i, s * smooth(t / 0.0015) * smooth((len / SR - t) / 0.05) * vel * 0.2, gl, gr, 0.4);
  }
}
// колокольчики (глокеншпиль)
function glock(t0, m, vel = 0.35, pan = 0.2) {
  const i0 = Math.round(t0 * SR), f = hz(m);
  if (i0 >= N) return;
  const len = Math.min(N - i0, Math.round(1.6 * SR)), [gl, gr] = panLR(pan);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const s = Math.sin(2 * Math.PI * f * t) * Math.exp(-t / 0.55) + 0.3 * Math.sin(2 * Math.PI * f * 2.76 * t) * Math.exp(-t / 0.16)
      + 0.12 * Math.sin(2 * Math.PI * f * 5.4 * t) * Math.exp(-t / 0.05);
    put(ky_, i0 + i, s * smooth(t / 0.0007) * smooth((1.6 - t) / 0.1) * vel * 0.16, gl, gr, 0.35);
  }
}
// флейта: синус с обертонами, дыхание вокруг тона, «чифф» на атаке; pitch — число или функция времени
function fluteBuf(dur, pitch, { vel = 0.7, vib = 0.18, vibRate = 5.3, breath = 0.1, att = 0.035, rel = 0.07, amp = null } = {}) {
  const n = Math.ceil((dur + rel * 7) * SR), x = new Float32Array(n), F = svf(), hpN = biquad('hp', 2500, 0.7), ch = biquad('bp', 3000, 0.9);
  let ph = 0; const vph = rnd() * 6.28;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let m = typeof pitch === 'function' ? pitch(t) : pitch;
    if (vib) m += vib * smooth((t - 0.14) / 0.22) * Math.sin(2 * Math.PI * vibRate * t + vph);
    const f = hz(m); ph += 2 * Math.PI * f / SR;
    if ((i & 15) === 0) F.set(f, 5);
    let A = t < att ? smooth(t / att) : 1;
    if (t > dur) A *= Math.exp(-(t - dur) / rel);
    if (amp) A *= amp(t);
    const w = wn();
    const tone = Math.sin(ph) + 0.16 * Math.sin(2 * ph + 0.4) + 0.05 * Math.sin(3 * ph + 1.1);
    const chiff = bq(ch, w) * Math.exp(-t / 0.018) * 0.5;
    x[i] = (tone * 0.8 + breath * (F.bp(w) * 3 + bq(hpN, w) * 0.25) + chiff) * A * vel;
  }
  return x;
}

// ---------- гармония (фа мажор) ----------
const CH = {
  F: { b: 41, pcs: [5, 9, 0] }, Fmaj7: { b: 41, pcs: [5, 9, 0, 4] }, Dm: { b: 38, pcs: [2, 5, 9] }, Dm7: { b: 38, pcs: [2, 5, 9, 0] },
  Bb: { b: 34, pcs: [10, 2, 5] }, Bbmaj7: { b: 34, pcs: [10, 2, 5, 9] }, C: { b: 36, pcs: [0, 4, 7] }, C7: { b: 36, pcs: [0, 4, 7, 10] },
  Csus: { b: 36, pcs: [0, 5, 7] }, Gm: { b: 43, pcs: [7, 10, 2] }, Gm7: { b: 43, pcs: [7, 10, 2, 5] }, A7: { b: 45, pcs: [9, 1, 4, 7] },
  Am: { b: 45, pcs: [9, 0, 4] },
};
const SCALE = [5, 7, 9, 10, 0, 2, 4]; // фа мажор
const up = (m) => { do m++; while (!SCALE.includes(m % 12)); return m; };
const dn = (m) => { do m--; while (!SCALE.includes(m % 12)); return m; };
const voicing = (ch, top, n) => { const p = CH[ch].pcs, o = []; for (let m = top; o.length < n && m > 30; m--) if (p.includes(((m % 12) + 12) % 12)) o.push(m); return o; };
const BRASS = { gain: 0.42, nOsc: 3, det: 10, bright: 3.4, sus: 0.7, att: 0.018, dec: 0.15, rel: 0.1, scoop: 0.25, sendK: 0.28 };
const STAB = { ...BRASS, gain: 0.5, bright: 3, sus: 0.55, att: 0.008, dec: 0.09, rel: 0.06, scoop: 0.18, sendK: 0.22 };
const LEAD = { gain: 0.55, nOsc: 2, det: 6, bright: 5.5, sus: 0.82, att: 0.015, dec: 0.2, rel: 0.08, scoop: 0.45, vib: 0.14, sendK: 0.3, pan: -0.08 };
const PAD = { gain: 0.25, nOsc: 3, det: 12, bright: 1.6, sus: 1, att: 0.5, dec: 1, rel: 0.25, scoop: 0, sendK: 0.45, blat: 0 };
const PLUCK = { gain: 0.42, nOsc: 2, det: 7, bright: 5, sus: 0, att: 0.003, dec: 0.1, rel: 0.05, scoop: 0, sendK: 0.3, blat: 0.3, q: 1.1 };
function section(t, ch, dur, vel, top = 72, n = 4, o = {}) {
  voicing(ch, top, n).forEach((m, j, a) => voice(br_, t + j * 0.003 + hum(0.002), dur, m, { ...BRASS, vel, pan: a.length > 1 ? -0.38 + 0.76 * j / (a.length - 1) : 0, ...o }));
}
const stab = (t, ch, dur, vel, top = 72, n = 4) => section(t, ch, dur, vel, top, n, STAB);
const lead = (t, m, dur, vel = 0.75, o = {}) => voice(ld_, t, dur, m, { ...LEAD, vel, ...o });
const pad = (t, ch, dur, vel = 0.45, top = 72, o = {}) => voicing(ch, top, 4).forEach((m, j) => voice(pd_, t, dur, m, { ...PAD, vel, pan: [-0.35, 0.35, -0.15, 0.15][j], ...o }));
const pluck = (t, m, dur, vel = 0.45, pan = 0) => voice(ky_, t, dur, m, { ...PLUCK, vel, pan });

// ---------- сетка ----------
// отрезок [t0, t1] делится на доли около beat, доли — на такты по 4 (последний может быть короче)
function splitBars(t0, t1, beat = 0.45) {
  const nb = Math.max(1, Math.round((t1 - t0) / beat)), b = (t1 - t0) / nb, out = [];
  for (let k = 0; k < nb; k += 4) out.push({ t: t0 + k * b, nb: Math.min(4, nb - k), beat: b });
  return out;
}
const MARK = {}; // ключевые музыкальные моменты для отчёта и sfx.json
const mark = (k, t) => { MARK[k] = r3(t); };
const SECTIONS = [];
function run(name, t0, t1, chords, pat, beat = 0.45, o = {}) {
  const bars = splitBars(t0, t1, beat);
  bars.forEach((b, k) => Object.assign(b, { chord: chords[k % chords.length], k, n: bars.length, name, last: k === bars.length - 1 }));
  for (const b of bars) pat(b, o);
  SECTIONS.push({ name, t0, t1, beat: bars[0].beat, bars });
  mark(name, t0);
  return bars;
}
const cx = (b) => ({ at: (x) => b.t + x * b.beat, B: b.beat, nb: b.nb, ch: CH[b.chord] });
const bassSeq = (b, seq) => { const { at, B, nb, ch } = cx(b); for (const [x, iv, v, d = 0.4] of seq) if (x < nb - 1e-6) bass(at(x), d * B, ch.b + iv, v); };
const UMPA = [[0, 0, 0.72], [0.5, 12, 0.48], [1, 0, 0.6], [1.5, 12, 0.48], [2, 7, 0.62], [2.5, 12, 0.45], [3, 0, 0.6], [3.5, 12, 0.48]];

// ---------- рисунки (такт b: начало, число долей, длина доли, аккорд) ----------
const PAT = {
  // выход участников: бочка на 1 и 3, хлопки на 2 и 4, бас «умпа» восьмыми, стабы на 1 и на «и» второй доли
  show(b, o) {
    const { at, B, nb } = cx(b);
    for (let x = 0; x < nb; x++) {
      if (x % 2 === 0) kick(at(x) + hum(0.002), 0.72); else clap(at(x) + hum(0.003), 0.4);
      hat(at(x) + hum(), 0.15); hat(at(x + 0.5) + hum(), 0.1, x === 3);
    }
    bassSeq(b, UMPA);
    stab(at(0), b.chord, 0.3 * B, o.v ?? 0.48);
    if (nb > 1.5) stab(at(1.5), b.chord, 0.22 * B, (o.v ?? 0.48) * 0.8);
    if (o.air && nb > 3) stab(at(3), b.chord, 0.22 * B, 0.36, 74);
  },
  // план Мартышки: лёгкий бит, шейкер, щипковое арпеджио по звукам аккорда
  plan(b) {
    const { at, B, nb } = cx(b);
    for (let x = 0; x < nb; x++) {
      if (x === 0) kick(at(0) + hum(0.002), 0.62);
      if (x % 2) clap(at(x) + hum(0.003), 0.28);
      for (const s of [0, 0.25, 0.5, 0.75]) shaker(at(x + s) + hum(0.002), s === 0 ? 0.13 : s === 0.5 ? 0.1 : 0.06);
    }
    if (nb > 2.5) kick(at(2.5), 0.38);
    bassSeq(b, [[0, 0, 0.68, 0.9], [1.5, 0, 0.45, 0.35], [2, 7, 0.58, 0.9], [3.5, 12, 0.45, 0.35]]);
    const v = voicing(b.chord, 79, 4).reverse(), seq = [0, 1, 2, 3, 2, 1, 2, 3];
    for (let k = 0; k < nb * 2; k++) pluck(at(k / 2), 0.42 * B, v[seq[k % 8]], k % 2 ? 0.34 : 0.42, k % 2 ? 0.28 : -0.28);
  },
  // «запляшут лес и горы»: бочка на каждую долю, открытый хэт и бас на слабых восьмых, стабы на «и»
  dance(b) {
    const { at, B, nb } = cx(b);
    for (let x = 0; x < nb; x++) {
      kick(at(x) + hum(0.002), 0.74);
      if (x % 2) clap(at(x) + hum(0.003), 0.42);
      hat(at(x) + hum(), 0.1); hat(at(x + 0.5) + hum(), 0.2, true);
      stab(at(x + 0.5), b.chord, 0.18 * B, 0.36, 74);
    }
    bassSeq(b, [[0, 0, 0.66, 0.3], [0.5, 12, 0.6, 0.3], [1, 0, 0.62, 0.3], [1.5, 12, 0.58, 0.3], [2, 0, 0.64, 0.3], [2.5, 12, 0.6, 0.3], [3, 0, 0.62, 0.3], [3.5, 12, 0.58, 0.3]]);
  },
  // «секрет» Осла: как план, но реже; после «дзынь» — колокольчики
  secret(b) {
    const { at, B, nb } = cx(b);
    for (let x = 0; x < nb; x++) {
      if (x % 2 === 0) kick(at(x) + hum(0.002), x ? 0.42 : 0.62);
      if (x % 2) clap(at(x) + hum(0.003), 0.3);
      shaker(at(x) + hum(0.002), 0.12); shaker(at(x + 0.5) + hum(0.002), 0.08);
    }
    bassSeq(b, [[0, 0, 0.66, 0.9], [1.5, 7, 0.45, 0.35], [2, 0, 0.58, 0.9], [3.5, 12, 0.45, 0.35]]);
    const v = voicing(b.chord, 79, 4).reverse();
    for (let k = 0; k < nb; k++) pluck(at(k), 0.5 * B, v[[0, 2, 1, 3][k % 4]], 0.38, k % 2 ? 0.25 : -0.25);
    if (b.t >= EV.w_sekret + 0.2) { const g = voicing(b.chord, 91, 3); glock(at(0), g[0], 0.4); if (nb > 2.5) glock(at(2.5), g[1], 0.32, -0.15); }
  },
  // «уселись чинно в ряд»: важное «умпа» на четверти, стабы меди на слабые доли
  row(b) {
    const { at, B, nb } = cx(b);
    for (let x = 0; x < nb; x++) {
      if (x % 2 === 0) kick(at(x) + hum(0.002), 0.58); else rim(at(x) + hum(0.002), 0.32);
      hat(at(x) + hum(), 0.12);
      if (x % 2) stab(at(x), b.chord, 0.28 * B, 0.36, 72);
    }
    bassSeq(b, [[0, 0, 0.66, 0.32], [1, 7, 0.5, 0.32], [2, 0, 0.62, 0.32], [3, 7, 0.5, 0.32]]);
  },
  // «пуще прежнего пошли разборы»: минор, бас-остинато, шестнадцатые хэта
  tension(b) {
    const { at, B, nb } = cx(b);
    for (let x = 0; x < nb; x++) {
      if (x === 0 || x === 2) kick(at(x) + hum(0.002), 0.66);
      if (x % 2) clap(at(x) + hum(0.003), 0.4);
      for (const s of [0, 0.25, 0.5, 0.75]) hat(at(x + s) + hum(0.002), s ? 0.08 : 0.13);
    }
    if (nb > 1.5) kick(at(1.5), 0.45);
    bassSeq(b, [[0, 0, 0.66, 0.4], [0.5, 0, 0.5], [1, 3, 0.58], [1.5, 0, 0.5], [2, 7, 0.62], [2.5, 8, 0.55], [3, 7, 0.58], [3.5, 12, 0.5]]);
    stab(at(0), b.chord, 0.3 * B, 0.42, 74);
  },
  // драка: погоня — ломаная бочка, малый с призраками, томы, хроматический бас, резкие стабы
  chase(b) {
    const { at, B, nb } = cx(b);
    for (const x of [0, 0.75, 1.5, 2, 2.75, 3.5]) if (x < nb) kick(at(x) + hum(0.002), 0.68);
    for (let x = 0; x < nb; x++) {
      if (x % 2) snare(at(x) + hum(), 0.52); else snare(at(x + 0.75) + hum(), 0.16, { dec: 0.07 });
      for (const s of [0, 0.25, 0.5, 0.75]) hat(at(x + s) + hum(0.002), s === 0.5 ? 0.16 : 0.09);
    }
    if (nb === 4 && b.k % 2 === 1) [220, 185, 147, 110].forEach((f, j) => tom(at(3 + j * 0.25), f, 0.5 + 0.05 * j, { pan: 0.3 - 0.2 * j }));
    bassSeq(b, [[0, 0, 0.68], [0.5, 12, 0.5], [1, 1, 0.6], [1.5, 0, 0.5], [2, 3, 0.62], [2.5, 0, 0.5], [3, 6, 0.6], [3.5, 7, 0.55]]);
    for (const x of [0, 1.75, 3.25]) if (x < nb) stab(at(x), b.chord, 0.16 * B, 0.44, 75);
  },
  // Соловей: золотая подушка, арфа вверх-вниз, тихий пульс
  golden(b) {
    const { at, B, nb } = cx(b);
    kick(at(0) + hum(0.002), 0.45);
    for (let x = 0; x < nb; x++) { shaker(at(x) + hum(0.002), 0.08); shaker(at(x + 0.5) + hum(0.002), 0.05); if (x === 3) rim(at(x), 0.2); }
    bassSeq(b, [[0, 0, 0.55, 1.8], [2, 7, 0.45, 1.8]]);
    pad(b.t, b.chord, nb * B - 0.05, 0.42, 77);
    const v = voicing(b.chord, 86, 6).reverse(), seq = [0, 2, 4, 5, 3, 1, 2, 4];
    for (let k = 0; k < nb * 2; k++) harp(at(k / 2), v[seq[k % 8]], 0.3, k % 2 ? 0.3 : -0.3, 1.1);
  },
  // просьба к Соловью: пульс шоу мягче, медь тянет аккорды с нарастанием
  plead(b) {
    const { at, B, nb } = cx(b);
    for (let x = 0; x < nb; x++) {
      if (x % 2 === 0) kick(at(x) + hum(0.002), 0.6); else clap(at(x) + hum(0.003), 0.34);
      hat(at(x) + hum(), 0.13); hat(at(x + 0.5) + hum(), 0.09);
    }
    if (nb > 2.5) kick(at(2.5), 0.34);
    bassSeq(b, [[0, 0, 0.68, 0.9], [1, 0, 0.5], [1.5, 7, 0.45], [2, 0, 0.6, 0.9], [3, 7, 0.5], [3.5, 12, 0.45]]);
    section(b.t, b.chord, nb * B - 0.06, 0.36, 72, 4, { att: 0.12, sus: 0.9, dec: 0.4, bright: 2.2, sendK: 0.4, scoop: 0.1, swell: [0.45, 1, 1.4] });
  },
  // речь Соловья: подушка, тихий пульс, арфа четвертями (флейта — отдельно, по окнам речи)
  expert(b, o) {
    const { at, B, nb } = cx(b);
    if (b.t >= o.rollFrom - 1e-6) return; // строка 36 — дробь перед вердиктом (ниже)
    const nbx = Math.min(nb, Math.round((o.rollFrom - b.t) / B));
    kick(at(0) + hum(0.002), 0.42);
    for (let x = 0; x < nbx; x++) { if (x % 2) rim(at(x) + hum(0.002), 0.2); shaker(at(x) + hum(0.002), 0.06); shaker(at(x + 0.5) + hum(0.002), 0.04); }
    bassSeq(b, [[0, 0, 0.5, nbx - 0.4]]);
    pad(b.t, b.chord, nbx * B - 0.05, 0.4, 77);
    const v = voicing(b.chord, 84, 4).reverse();
    for (let k = 0; k < nbx; k++) harp(at(k), v[[0, 2, 1, 3][k % 4]], 0.24, k % 2 ? 0.3 : -0.3, 1.2);
  },
};
// «та-дам» в паузе между блоками: подхват малого, удар с тарелкой, стаб меди, верхняя нота трубы
function sting(t, chord, B, { v = 0.62, top = 77, crashV = 0.6, pickup = true } = {}) {
  if (pickup) [[-0.75, 0.22], [-0.5, 0.28], [-0.25, 0.36]].forEach(([x, vv]) => snare(t + x * B, vv * v, { dec: 0.08 }));
  snare(t - 0.025, 0.3 * v, { dec: 0.06 }); snare(t, 0.62 * v); kick(t, 0.9 * v); crash(t, crashV * v, 0.8);
  stab(t, chord, 0.3, 0.85 * v, 76, 5); lead(t, top, 0.3, 0.8 * v, { vib: 0 }); bass(t, 0.35, CH[chord].b, 0.85 * v);
}
// мягкая точка перед паузой оркестра
function button(t, chord, v = 0.6) { kick(t, 0.6 * v); stab(t, chord, 0.16, 0.6 * v, 72); bass(t, 0.2, CH[chord].b, 0.7 * v); }

// ---------- заставка ----------
// хлопушка конфетти на 0,45 с (video/src/main.js), дальше семь долей фанфары, последний удар за долю до голоса
const tH = 0.45, tG0 = V0 - 0.05, bI = (tG0 - tH) / 7;
if (bI < 0.36 || bI > 0.6) console.warn(`темп заставки ${(60 / bI).toFixed(0)} BPM — далеко от 133`);
const HARM_I = [[0, 'F'], [2, 'C'], [3, 'Dm'], [4, 'Bb'], [5, 'C7'], [6, 'F']];
const chAt = (H, x) => H.reduce((a, [b, c]) => (x >= b - 1e-6 ? c : a), H[0][1]);
{
  const at = (x) => tH + x * bI;
  roll(0.02, tH - 0.05, 0.12, 0.55, (tH - 0.07) / 8);
  riser(0, tH + 0.02, 0.4, 500, 8000);
  crash(at(0), 0.9); kick(at(0), 1); clap(at(0), 0.5); mark('intro_hit', at(0));
  for (let k = 0; k < 6; k++) {
    if (k % 2 === 0) kick(at(k), k ? 0.82 : 0.95); else clap(at(k) + hum(), 0.55);
    hat(at(k) + hum(), 0.22); hat(at(k + 0.5) + hum(), 0.15, k === 3);
  }
  kick(at(2.5), 0.5); kick(at(4.5), 0.5);
  [[5.5, 196], [5.75, 147]].forEach(([x, f]) => tom(at(x), f, 0.6, { pan: f > 150 ? -0.2 : 0.2 }));
  const MEL = [[0, 69, 0.5], [0.5, 72, 0.25], [0.75, 77, 0.75], [1.5, 76, 0.25], [1.75, 77, 0.25], [2, 79, 0.5], [2.5, 77, 0.5],
    [3, 74, 0.5], [3.5, 72, 0.5], [4, 70, 0.5], [4.5, 74, 0.25], [4.75, 77, 0.75], [5.5, 76, 0.25], [5.75, 79, 0.25]];
  for (const [x, m, d] of MEL) lead(at(x), m, d * bI * 0.95, x === 0.75 || x === 4.75 ? 0.85 : 0.72);
  for (const [x, d] of [[0, 0.45], [0.75, 0.7], [2, 0.45], [3, 0.45], [4, 0.45], [4.75, 0.7], [5.5, 0.4]]) section(at(x), chAt(HARM_I, x), d * bI, x === 0.75 || x === 4.75 ? 0.75 : 0.62, 72, 4);
  for (let x = 0; x < 6; x += 0.5) { const ch = chAt(HARM_I, x); bass(at(x), bI * 0.42, CH[ch].b + (x % 1 ? 12 : 0), x % 1 ? 0.55 : 0.75); }
  const tz = at(6);
  kick(tz, 0.95); clap(tz, 0.55); crash(tz, 0.8, 1.0);
  stab(tz, 'F', bI * 0.5, 0.9, 77, 5); lead(tz, 77, bI * 0.5, 0.85, { vib: 0 }); bass(tz, bI * 0.8, 41, 0.85);
  mark('intro_final_hit', tz);
}

// ---------- под голосом ----------
const A1 = E(5) + 0.04, B1 = E(8) + 0.03;            // «та-дам» после «Квартет» и после «свет»
const D2 = EV.w_zapl - 0.03, G2 = E(15) + 0.05, C3 = EV.w_nach - 0.12;
const G4 = E(20) + 0.05, C5 = E(21) - 0.08, K6 = E(25) + 0.05, G7 = E(27) + 0.05, Q8 = E(31) + 0.05, R9 = EV.w_godit + 0.3;
const ROLL0 = L(36) - 0.05;
// строки 1–8
const s1a = run('vyhod', tG0, A1, ['F', 'Dm', 'Bb', 'C'], PAT.show, 0.46);
sting(A1, 'F', s1a[0].beat, { top: 81 }); mark('sting_kvartet', A1);
const s1b = run('efir', A1, B1, ['Bb', 'C', 'F', 'Dm', 'Bb', 'C'], PAT.show, 0.46, { air: true, v: 0.5 });
sting(B1, 'C7', s1b[0].beat, { top: 79 }); mark('sting_svet', B1);
// строка 9 — играет квартет (оркестр шоу молчит)
// строки 10–16
const s2 = run('plan', L(10) - 0.02, D2, ['Dm', 'Bb', 'F', 'C'], PAT.plan, 0.46);
const s2d = run('dance', D2, G2, ['F', 'C'], PAT.dance, 0.45);
sting(G2, 'F', s2d[0].beat, { top: 81 }); mark('sting_gory', G2);
const s3 = run('rasselis', G2, C3, ['Bb', 'C'], PAT.show, 0.46);
button(C3, 'C');
// строки 18–21
const s4 = run('sekret', L(18) - 0.02, G4, ['Bb', 'F', 'Gm', 'C'], PAT.secret, 0.46);
snare(L(18) - 0.02 - s4[0].beat * 0.5, 0.2, { dec: 0.07 }); snare(L(18) - 0.02 - s4[0].beat * 0.25, 0.26, { dec: 0.07 });
sting(G4, 'F', s4[0].beat, { top: 77 }); mark('sting_sekret', G4);
run('chinno', G4, C5, ['F', 'C7', 'F', 'C7'], PAT.row, 0.46);
button(C5, 'C');
// строки 23–25: спор и драка
const s6 = run('spor', L(23) - 0.02, FIGHT[0], ['Dm', 'A7'], PAT.tension, 0.42);
const s6c = run('draka', FIGHT[0], K6, ['Dm', 'Bb', 'Gm', 'A7'], PAT.chase, 0.4);
crash(FIGHT[0], 0.5, 0.6);
{ // конец драки: «бамс» и точка
  const t = K6; kick(t, 0.85); snare(t, 0.55); crash(t, 0.45, 0.6); stab(t, 'Dm', 0.22, 0.7, 74, 4); bass(t, 0.3, 38, 0.8); mark('draka_stop', t);
}
// строки 26–27: Соловей
const s7 = run('solovey', L(26) - 0.02, G7, ['Fmaj7', 'Bbmaj7'], PAT.golden, 0.48);
{ // золотой луч: глиссандо арфы на взлёте Соловья, колокольчики на посадке
  const t0 = EV.w_solov - 0.5, notes = []; for (let m = 65; m <= 96; m++) if ([5, 9, 0, 4].includes(m % 12)) notes.push(m);
  notes.forEach((m, j) => harp(t0 + j * 0.9 / notes.length, m, 0.32 + 0.1 * j / notes.length, -0.5 + j / notes.length, 1.4));
  const tl = EV.w_prilet + 0.35 + FRAME; [89, 93, 96].forEach((m, j) => glock(tl + j * 0.07, m, 0.3, 0.3));
  mark('harp_gliss', t0);
}
sting(G7, 'F', s7[0].beat, { top: 77, v: 0.55, crashV: 0.45 }); mark('sting_prosba', G7);
// строки 28–31: просьба
run('prosba', G7, Q8, ['Dm', 'Bb', 'F', 'C'], PAT.plead, 0.46);
{ // «Скажи лишь, как нам сесть!» — мягкая точка, тишина перед ответом Соловья
  const t = Q8; stab(t, 'C', 0.25, 0.5, 72); bass(t, 0.3, 36, 0.6); kick(t, 0.5); mark('tishina', t);
}
// строки 32–36: речь Соловья, на строке 36 — дробь перед вердиктом
const s9 = run('otvet', L(32) - 0.02, R9, ['Fmaj7', 'Dm7', 'Bbmaj7', 'C'], PAT.expert, 0.48, { rollFrom: ROLL0 });
{
  const B = s9[0].beat, beats = s9.flatMap((b) => Array.from({ length: b.nb }, (_, k) => b.t + k * b.beat));
  const r0 = beats.find((t) => t >= ROLL0 - 1e-6) ?? ROLL0;
  roll(r0, R9 - 0.03, 0.12, 0.62, B / 6, 0.07);
  for (let t = r0; t < R9 - 0.05; t += B) kick(t, 0.4 + 0.25 * (t - r0) / (R9 - r0));
  bass(r0, R9 - r0 - 0.04, 36, 0.55, { amp: (t) => lerp(0.7, 1, t / (R9 - r0)) });
  pad(r0, 'Csus', R9 - r0 - 0.04, 0.45, 77, { att: 0.3, swell: [0.6, 1, 1], rel: 0.05 });
  riser(r0 + 0.3 * (R9 - r0), R9 - 0.02, 0.35);
  mark('drob', r0);
  // флейта-соловей под его речь: форшлаг и долгая нота, на третьей доле — группетто
  const wins = [[L(32), E(33)], [L(35), E(36)]];
  for (const b of s9) {
    const at = (x) => b.t + x * b.beat, top = voicing(b.t >= r0 - 1e-6 ? 'Csus' : b.chord, 89, 3);
    const inWin = (t) => wins.some(([a, z]) => t >= a - 0.05 && t < z - 0.25);
    if (inWin(at(0.5)) && b.nb >= 2) {
      const m = top[0], d = 1.3 * B;
      addBuf(ld_, at(0.5), fluteBuf(d, (t) => (t < 0.06 ? up(m) : m), { vel: 0.5, vib: 0.2 }), 0.15, 0.4);
    }
    if (inWin(at(2.5)) && b.nb >= 4) {
      const m = top[1], seq = [[0, up(m)], [0.07, m], [0.14, dn(m)], [0.21, m]];
      addBuf(ld_, at(2.5), fluteBuf(0.75 * B + 0.21, (t) => seq.reduce((a, [s, n]) => (t >= s ? n : a), m), { vel: 0.44, vib: 0.16 }), 0.2, 0.4);
    }
  }
}
const ON = [[tG0, B1 + 0.35], [L(10) - 0.02, C3 + 0.25], [L(18) - 0.04, C5 + 0.25], [L(23) - 0.02, K6 + 0.35], [L(26) - 0.02, Q8 + 0.45], [L(32) - 0.02, R9]];

// ---------- финал: короткая заставка шоу ----------
const bO = clamp((TOTAL - EV.fin - 2.2) / 6, 0.38, bI);
{
  const at = (x) => EV.fin + x * bO;
  tom(EV.fin - 0.11, 175, 0.55, { pan: -0.15 }); tom(EV.fin - 0.055, 131, 0.6, { pan: 0.15 });
  crash(at(0), 0.85); kick(at(0), 1); clap(at(0), 0.5); mark('fin_fanfare', at(0));
  for (let k = 0; k < 6; k++) {
    if (k % 2 === 0) kick(at(k), k ? 0.82 : 0.95); else clap(at(k) + hum(), 0.55);
    hat(at(k) + hum(), 0.22); hat(at(k + 0.5) + hum(), 0.15, k === 3);
  }
  kick(at(2.5), 0.5); kick(at(4.5), 0.5);
  [[5.5, 196], [5.75, 147]].forEach(([x, f]) => tom(at(x), f, 0.6, { pan: f > 150 ? -0.2 : 0.2 }));
  const HARM = [[0, 'F'], [2, 'C'], [2.5, 'Dm'], [3, 'Bb'], [5, 'C7'], [6, 'F']];
  const OUT = [[0, 69, 0.5], [0.5, 72, 0.25], [0.75, 77, 0.75], [1.5, 76, 0.25], [1.75, 77, 0.25], [2, 79, 0.5], [2.5, 81, 0.5],
    [3, 82, 0.5], [3.5, 81, 0.25], [3.75, 79, 0.25], [4, 77, 0.5], [4.5, 82, 0.5], [5, 79, 0.5], [5.5, 76, 0.5]];
  for (const [x, m, d] of OUT) lead(at(x), m, d * bO * 0.95, x === 0.75 || x === 4.5 ? 0.85 : 0.74);
  for (const [x, d] of [[0, 0.45], [0.75, 0.7], [2, 0.45], [2.5, 0.45], [3, 0.45], [4, 0.45], [4.5, 0.45], [5, 0.45], [5.5, 0.4]]) section(at(x), chAt(HARM, x), d * bO, x === 0.75 ? 0.75 : 0.62, 72, 4);
  for (let x = 0; x < 6; x += 0.5) { const ch = chAt(HARM, x); bass(at(x), bO * 0.42, CH[ch].b + (x % 1 ? 12 : 0), x % 1 ? 0.55 : 0.75); }
  // финальный аккорд: держится и гаснет к концу ролика
  const tf = at(6), hold = TOTAL - 0.4 - tf;
  kick(tf, 0.95); crash(tf, 0.9, 1.6); timp(tf, 29, 0.8, 0); clap(tf, 0.5);
  lead(tf, 77, hold, 0.85, { swell: [1, 0.4, 0.8], rel: 0.4 });
  section(tf, 'F', hold, 0.75, 81, 5, { swell: [1, 0.35, 0.8], rel: 0.4, sus: 0.8 });
  for (const m of [41, 48]) voice(br_, tf, hold, m, { ...BRASS, vel: 0.62, gain: 0.4, bright: 2.2, swell: [1, 0.35, 0.8], rel: 0.4 });
  bass(tf, hold * 0.8, 41, 0.85);
  [96, 93, 89].forEach((m, j) => glock(tf + 0.12 * j, m, 0.3, 0.25 - 0.25 * j));
  mark('final_chord', tf);
}

// ---------- реверберация (Freeverb-подобная) ----------
function reverb(src, room = 0.84, damp = 0.28) {
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617], aps = [556, 441, 341, 225], pre = Math.round(0.018 * SR);
  return [0, 1].map((ch) => {
    const cb = combs.map((d) => ({ b: new Float32Array(d + ch * 23), i: 0, f: 0 }));
    const ab = aps.map((d) => ({ b: new Float32Array(d + ch * 23), i: 0 }));
    const y = new Float32Array(N);
    for (let n = 0; n < N; n++) {
      const x = n >= pre ? (src[0][n - pre] + src[1][n - pre]) * 0.5 : 0;
      let o = 0;
      for (const c of cb) { const v = c.b[c.i]; c.f = v * (1 - damp) + c.f * damp; c.b[c.i] = x + c.f * room; c.i = (c.i + 1) % c.b.length; o += v; }
      for (const a of ab) { const v = a.b[a.i]; a.b[a.i] = o + v * 0.5; a.i = (a.i + 1) % a.b.length; o = v - o; }
      y[n] = o * 0.045;
    }
    return y;
  });
}
const wet = reverb(send);
// под голосом пульс легче: бочку и бас тише, хлопки, хэт и медь — заметнее (на заставке и в финале — как есть)
const TRIM = { бочка: 0.55, бас: 0.75, малый: 1.3, хэт: 1.45, медь: 1.15 };
const uvKeys = [[tG0 + 0.05, 0], [tG0 + 0.25, 1], [EV.fin - 0.5, 1], [EV.fin - 0.3, 0]];
const music = [0, 1].map((ch) => {
  const o = Float32Array.from(wet[ch]);
  for (const [nm, b] of Object.entries(BUS)) {
    const k = TRIM[nm] ?? 1;
    for (let i = 0; i < N; i++) o[i] += b[ch][i] * (k === 1 ? 1 : lerp(1, k, curve(uvKeys, i / SR)));
  }
  return o;
});
for (const ch of [0, 1]) { const hp = biquad('hp', 32, 0.7), x = music[ch]; for (let i = 0; i < N; i++) x[i] = bq(hp, x[i]); }

// ---------- голос ----------
const rawV = execFileSync('ffmpeg', ['-v', 'error', '-i', path.join(POEM, 'voice.mp3'), '-f', 'f32le', '-ac', '1', '-ar', String(SR), '-'], { maxBuffer: 1 << 28 });
const voiceA = new Float32Array(rawV.length / 4);
for (let i = 0; i < voiceA.length; i++) voiceA[i] = rawV.readFloatLE(i * 4);
const speech = LINES.map((l) => [l.s, l.e]); // окна речи, секунды ролика

// ---------- громкость: RMS и K-взвешивание (BS.1770) ----------
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
// средний квадрат суммы каналов в окнах (off — сдвиг окон, для голоса без вступления)
const msIn = (chs, wins, off = 0) => {
  let s = 0, c = 0;
  for (const [a, b] of wins) for (let i = Math.max(0, Math.floor((a + off) * SR)); i < Math.min(chs[0].length, (b + off) * SR); i++) { for (const x of chs) s += x[i] * x[i]; c++; }
  return s / Math.max(1, c);
};
const dB = (ms) => 10 * Math.log10(Math.max(ms, 1e-20));
const kv = kWeight(voiceA);
// в ролике голос (моно) идёт в оба канала
const voiceMS = 2 * msIn([voiceA], speech, -V0), voiceKMS = 2 * msIn([kv], speech, -V0);

// ---------- шумы ----------
const SFX = {}, SFXWIN = {};
const log = (k, v) => { (SFX[k] ??= []).push(r3(v)); };
// буфер x (моно с панорамой pan — число или функция времени, или стерео [L, R]) ставится с t0;
// громкость — target дБ к голосу (K-взвешенно) в окне [t0 + w0, t0 + w0 + win]
function place(t0, x, target, pan, win, key, sendK = 0.12, w0 = 0) {
  const st = Array.isArray(x), chs = st ? x : [x], len = chs[0].length;
  const a = Math.round(w0 * SR), n = Math.min(len - a, Math.round(win * SR));
  let s = 0; for (const c of chs) { const kx = kWeight(c); for (let i = a; i < a + n; i++) s += kx[i] * kx[i]; }
  const g = Math.sqrt(voiceKMS * db(target) ** 2 / (s / n));
  const i0 = Math.round(t0 * SR);
  for (let i = 0; i < len; i++) {
    if (st) put(sfx, i0 + i, 1, x[0][i] * g, x[1][i] * g, sendK, sfxSend);
    else { const [gl, gr] = panLR(typeof pan === 'function' ? pan(i / SR) : pan); put(sfx, i0 + i, x[i] * g, gl, gr, sendK, sfxSend); }
  }
  (SFXWIN[key] ??= []).push([t0 + w0, t0 + w0 + win]);
}
const mono2st = (parts, len) => { // [{t, x, pan}] → стерео-буфер длины len (с)
  const n = Math.round(len * SR), Lc = new Float32Array(n), Rc = new Float32Array(n);
  for (const { t, x, pan = 0, g = 1 } of parts) {
    const i0 = Math.round(t * SR), [gl, gr] = panLR(pan);
    for (let i = 0; i < x.length && i0 + i < n; i++) if (i0 + i >= 0) { Lc[i0 + i] += x[i] * gl * g; Rc[i0 + i] += x[i] * gr * g; }
  }
  const nf = Math.min(n, Math.round(0.02 * SR));
  for (let i = 0; i < nf; i++) { const k = smooth(i / nf); Lc[n - 1 - i] *= k; Rc[n - 1 - i] *= k; }
  return [Lc, Rc];
};

// хлопушка: щелчок, глухой «пум» и шелест бумажек
function popBuf(dur = 1.1) {
  const n = Math.round(dur * SR), x = new Float32Array(n);
  const hp = biquad('hp', 900, 0.7), lp = biquad('lp', 9000, 0.7), hpC = biquad('hp', 3800, 0.7), bpP = biquad('bp', 5200, 0.8);
  let ph = 0, tick = 1e9, tickA = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, w = wn();
    ph += 2 * Math.PI * (70 + 120 * Math.exp(-t / 0.012)) / SR;
    const crack = bq(lp, bq(hp, w)) * Math.exp(-t / 0.0045) * 2.4 * smooth(t / 0.0003);
    const thump = Math.sin(ph) * Math.exp(-t / 0.035) * 0.9 * smooth(t / 0.001);
    if (t > 0.03 && rnd() < 90 / SR * Math.exp(-t / 0.5)) { tickA = 0.3 + 0.7 * rnd(); tick = 0; }
    tick++;
    const rustle = bq(bpP, bq(hpC, w)) * (0.1 + tickA * Math.exp(-tick / (0.003 * SR))) * smooth((t - 0.02) / 0.05) * Math.exp(-t / 0.45);
    x[i] = (crack + thump + rustle) * smooth((dur - t) / 0.08);
  }
  return x;
}
// аплодисменты: много хлопков ладоней по залу
function applauseBuf(dur, { fadeIn = 0.55, fadeOut = 0.3, rate = 70 } = {}) {
  const n = Math.round(dur * SR), Lc = new Float32Array(n), Rc = new Float32Array(n), cn = Math.round(rate * dur);
  for (let k = 0; k < cn; k++) {
    const t0 = rnd() * dur, fade = smooth(t0 / fadeIn) * smooth((dur - t0) / fadeOut);
    if (rnd() > fade) continue;
    const bp = biquad('bp', 800 + rnd() * 2000, 0.7 + rnd() * 0.8), a = 0.35 + 0.65 * rnd(), [gl, gr] = panLR((rnd() * 2 - 1) * 0.9), tau = 0.005 + 0.009 * rnd();
    const i0 = Math.round(t0 * SR), len = Math.round(0.06 * SR);
    for (let j = 0; j < len && i0 + j < n; j++) {
      const t = j / SR, y = bq(bp, wn()) * smooth(t / 0.0006) * Math.exp(-t / tau) * a;
      Lc[i0 + j] += y * gl; Rc[i0 + j] += y * gr;
    }
  }
  const F = [biquad('bp', 1500, 0.5), biquad('bp', 1500, 0.5)];
  for (let i = 0; i < n; i++) { const t = i / SR, e = smooth(t / fadeIn) * smooth((dur - t) / fadeOut) * 0.05; Lc[i] += bq(F[0], wn()) * e; Rc[i] += bq(F[1], wn()) * e; }
  return [Lc, Rc];
}
// смычковая струна: пила с дрожью периода, шорох смычка, резонансы корпуса; scratch/jitter/crackle — для фальши
const BODY = { vn: [[290, 3, 1], [520, 2.5, 0.8], [2800, 1.8, 0.6]], va: [[225, 3, 1], [420, 2.5, 0.8], [2100, 1.8, 0.5]], cb: [[75, 2, 1], [150, 2.5, 0.8], [800, 1.5, 0.4]] };
function bowBuf(dur, pitch, o = {}) {
  const { vel = 0.6, body = 'vn', bright = 1, jitter = 0, scratch = 0.08, vib = 0, vibRate = 5.6, att = 0.07, rel = 0.08, amp = null, crackle = 0 } = o;
  const n = Math.ceil((dur + rel * 6) * SR), x = new Float32Array(n);
  const res = BODY[body].map(([f, q, g]) => [biquad('bp', f, q), g]), F = svf(), hpN = biquad('hp', 2000, 0.7);
  let ph = rnd(), jit = 0, cr = 1, crT = 1, crS = 0; const vph = rnd() * 6.28;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let m = typeof pitch === 'function' ? pitch(t) : pitch;
    if (vib) m += vib * smooth((t - 0.08) / 0.2) * Math.sin(2 * Math.PI * vibRate * t + vph);
    const f = hz(m) * (1 + jitter * jit), dt = f / SR;
    ph += dt; if (ph >= 1) { ph -= 1; jit = wn(); }
    const saw = 2 * ph - 1 - polyblep(ph, dt);
    const bn = bq(hpN, wn()) * scratch * (ph < 0.25 ? 1.6 : 0.5);
    if (crackle && --crT <= 0) { crT = Math.round(SR / (22 + 45 * rnd())); cr = 1 - crackle * rnd(); }
    crS += (cr - crS) * 0.02;
    if ((i & 7) === 0) F.set(Math.min(12000, f * (3 + 5 * bright) + 600 * bright), 0.8);
    const y = F.lp(saw + bn);
    let s = y * 0.35; for (const [q, g] of res) s += bq(q, y) * g;
    let A = t < att ? smooth(t / att) : 1;
    if (t > dur) A *= Math.exp(-(t - dur) / rel);
    if (amp) A *= amp(t);
    x[i] = s * A * vel * (crackle ? crS : 1);
  }
  return x;
}
// раскладки героев на сцене (video/src/main.js): x скрипок (Мартышка, Осёл), альта (Козёл), баса (Мишка)
const LAYOUT = [{ mart: 600, osel: 845, kozel: 1110, mish: 1375 }, { mish: 560, kozel: 820, mart: 1110, osel: 1370 }, { mart: 590, osel: 840, kozel: 1090, mish: 1360 }];
const pp = (x) => scrPan(x) * 0.7;
// настройка: все тянут «ля» и подстраиваются, затем пробуют пустые струны
function tuning(lay, len) {
  const P = [];
  const drift = (m, d0, tau, over = 0) => (t) => m + d0 * Math.exp(-t / tau) + over * Math.sin(Math.min(t / tau, 3) * 2.2) * Math.exp(-t / tau);
  const stroke = (t, a, d) => (u) => smooth(u / a) * (0.75 + 0.25 * Math.exp(-u / 0.08)) * smooth((d - u) / 0.12);
  P.push({ t: 0.0, x: bowBuf(0.85, drift(33, -0.5, 0.25), { body: 'cb', vel: 0.6, bright: 0.6, amp: stroke(0, 0.06, 0.85) }), pan: pp(lay.mish) });
  P.push({ t: 0.05, x: bowBuf(0.8, drift(57, 0.45, 0.22, 0.15), { body: 'va', vel: 0.55, amp: stroke(0, 0.06, 0.8) }), pan: pp(lay.kozel) });
  P.push({ t: 0.1, x: bowBuf(0.75, drift(69, -0.35, 0.2, 0.2), { vel: 0.5, vib: 0.06, amp: stroke(0, 0.05, 0.75) }), pan: pp(lay.mart) });
  P.push({ t: 0.16, x: bowBuf(0.7, drift(69.1, 0.7, 0.3), { vel: 0.46, amp: stroke(0, 0.05, 0.7) }), pan: pp(lay.osel) });
  if (len > 1.15) {
    const k = Math.min(1, (len - 0.75) / 0.5);
    P.push({ t: 0.72, x: bowBuf(0.36 * k, drift(76, -0.4, 0.1), { vel: 0.5, amp: stroke(0, 0.03, 0.36 * k) }), pan: pp(lay.mart) });
    P.push({ t: 0.8, x: bowBuf(0.3 * k, drift(62, 0.5, 0.12), { vel: 0.46, amp: stroke(0, 0.03, 0.3 * k) }), pan: pp(lay.osel) });
    P.push({ t: 0.86, x: bowBuf(0.3 * k, drift(50, -0.4, 0.12), { body: 'va', vel: 0.5, amp: stroke(0, 0.03, 0.3 * k) }), pan: pp(lay.kozel) });
    P.push({ t: 0.94, x: bowBuf(0.3 * k, drift(38, 0.5, 0.12), { body: 'cb', vel: 0.55, bright: 0.6, amp: stroke(0, 0.03, 0.3 * k) }), pan: pp(lay.mish) });
  }
  return mono2st(P, len);
}
// робкая игра перед второй фальшью: скрипки ведут фразу мимо нот, альт и бас тянут не туда
function timid(lay, len) {
  const P = [], seq = [77, 79, 81, 79, 77, 76, 74, 76], d = len / seq.length;
  seq.forEach((m, j) => {
    P.push({ t: j * d, x: bowBuf(d * 0.92, m + 0.3 + 0.15 * Math.sin(j * 2.1), { vel: 0.42, vib: 0.1, scratch: 0.14, jitter: 0.004, att: 0.04 }), pan: pp(lay.mart) });
    P.push({ t: j * d + 0.03, x: bowBuf(d * 0.9, m - 3.55 + 0.2 * Math.cos(j * 1.7), { vel: 0.36, scratch: 0.14, jitter: 0.005, att: 0.04 }), pan: pp(lay.osel) });
  });
  P.push({ t: 0, x: bowBuf(len - 0.05, (t) => 60.4 + 0.3 * Math.sin(t * 1.3), { body: 'va', vel: 0.4, att: 0.15 }), pan: pp(lay.kozel) });
  P.push({ t: 0, x: bowBuf(len - 0.05, (t) => 29.3 + 0.2 * Math.sin(t * 0.9), { body: 'cb', vel: 0.5, bright: 0.5, att: 0.15 }), pan: pp(lay.mish) });
  return mono2st(P, len + 0.4);
}
// фальшь: четыре инструмента дерут мимо нот — кластер с дрожью и треском смычка, в конце всё «съезжает» вниз
function screech(lay, k = 1, dur = 1.0, duckAt = null) {
  const droop = (t) => -3 * smooth((t - (dur - 0.42)) / 0.42);
  const amp = (t) => (0.8 + 0.2 * Math.exp(-t / 0.06)) * (1 - 0.25 * smooth((t - dur + 0.4) / 0.4)) * (duckAt === null ? 1 : 1 - 0.45 * smooth((t - duckAt) / 0.06));
  const P = [
    { t: 0, x: bowBuf(dur, (t) => 88 + 0.9 * Math.sin(2 * Math.PI * 7.5 * t) + droop(t), { vel: 0.6, scratch: 0.5 * k, jitter: 0.03 * k, crackle: 0.6, bright: 1.6, att: 0.012, amp }), pan: pp(lay.mart) },
    { t: 0.02, x: bowBuf(dur - 0.02, (t) => 89.4 + 0.7 * Math.sin(2 * Math.PI * 6.3 * t + 1) + droop(t) * 1.3, { vel: 0.5, scratch: 0.5 * k, jitter: 0.035 * k, crackle: 0.6, bright: 1.6, att: 0.012, amp }), pan: pp(lay.osel) },
    { t: 0.01, x: bowBuf(dur - 0.01, (t) => 66.6 + 2 * Math.sin(Math.PI * clamp(t / 0.6, 0, 1)) + droop(t), { body: 'va', vel: 0.55, scratch: 0.45 * k, jitter: 0.03 * k, crackle: 0.5, bright: 1.3, att: 0.015, amp }), pan: pp(lay.kozel) },
    { t: 0, x: bowBuf(dur, (t) => 31.3 + droop(t) * 0.7, { body: 'cb', vel: 1, scratch: 0.8 * k, jitter: 0.05 * k, crackle: 0.7, bright: 0.9, att: 0.015, amp }), pan: pp(lay.mish) },
  ];
  // писк канифоли: две короткие высокие «взвизгивания»
  for (const [t, f] of [[0.18 + 0.1 * rnd(), 3150], [0.5 + 0.15 * rnd(), 3600]]) {
    const n = Math.round(0.09 * SR), x = new Float32Array(n); let ph = 0;
    for (let i = 0; i < n; i++) { const u = i / n; ph += 2 * Math.PI * f * (1 + 0.04 * Math.sin(u * 30)) / SR; x[i] = Math.sin(ph) * Math.sin(Math.PI * u) ** 2 * 0.25 * k; }
    P.push({ t, x, pan: pp(lay.osel) });
  }
  return mono2st(P, dur + 0.5);
}
// зуммер жюри «✕»: жёсткий низкий меандр с биениями
function buzzerBuf(dur = 0.55) {
  const n = Math.round((dur + 0.05) * SR), x = new Float32Array(n), lp = biquad('lp', 4000, 0.7), bp = biquad('bp', 1000, 1.2);
  const ph = [0, 0.3, 0.6];
  for (let i = 0; i < n; i++) {
    const t = i / SR, f0 = 116.5 * (1 - 0.04 * smooth((t - dur + 0.12) / 0.12));
    let s = 0;
    [[1, 1], [1.012, 0.8], [2.004, 0.35]].forEach(([r, a], k) => {
      const dt = f0 * r / SR; ph[k] += dt; if (ph[k] >= 1) ph[k] -= 1;
      const p2 = (ph[k] + 0.5) % 1;
      s += a * ((ph[k] < 0.5 ? 1 : -1) + polyblep(ph[k], dt) - polyblep(p2, dt));
    });
    const y = Math.tanh(1.6 * s);
    x[i] = (bq(lp, y) * 0.7 + bq(bp, y) * 0.8) * smooth(t / 0.004) * smooth((dur - t) / 0.03) * (0.9 + 0.1 * Math.sin(2 * Math.PI * 30 * t));
  }
  return x;
}
// «вжух»: полосовой шум, центр поднимается к пику и опускается (как пролёт мимо), огибающая — горб
function whoosh(dur, p, lo, hi) {
  const n = Math.round(dur * SR), x = new Float32Array(n), F1 = svf(), F2 = svf();
  let pink = 0;
  for (let i = 0; i < n; i++) {
    const u = i / n, b = u < p ? smooth(u / p) : smooth((1 - u) / (1 - p));
    if ((i & 15) === 0) { const fc = lo * (hi / lo) ** b; F1.set(fc, 1.3); F2.set(fc * 2.3, 2); }
    const w = wn(); pink = 0.97 * pink + 0.03 * w;
    const env = (u < p ? (u / p) ** 2 : smooth((1 - u) / (1 - p)) ** 1.6);
    x[i] = env * (F1.bp(w + 6 * pink) + 0.35 * F2.bp(w));
  }
  return x;
}
// «дзынь» лампочки: щелчок выключателя и колокольчик с неровными обертонами
function dingBuf() {
  const n = Math.round(1.3 * SR), x = new Float32Array(n), f = 1568, hp = biquad('hp', 3000, 0.7);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let s = 0;
    for (const [r, a, d] of [[1, 1, 0.75], [1.0021, 0.5, 0.6], [2, 0.18, 0.4], [2.76, 0.35, 0.28], [5.4, 0.16, 0.12], [8.93, 0.07, 0.06]]) s += a * Math.sin(2 * Math.PI * f * r * t) * Math.exp(-t / d);
    x[i] = (s * smooth(t / 0.0006) + bq(hp, wn()) * Math.exp(-t / 0.002) * 0.6) * smooth((1.3 - t) / 0.1);
  }
  return x;
}
// удар: глухой «тук» (синус с подъездом сверху и шлепок шума)
function thumpBuf(f0, dec, slap = 0.5, dur = 0.3) {
  const n = Math.round(dur * SR), x = new Float32Array(n), lp = biquad('lp', 700, 0.7), bp = biquad('bp', 1600, 1.2);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, w = wn();
    ph += 2 * Math.PI * f0 * (1 + 0.8 * Math.exp(-t / 0.012)) / SR;
    x[i] = (Math.sin(ph) * Math.exp(-t / dec) + bq(lp, w) * Math.exp(-t / 0.02) * 0.8 + bq(bp, w) * Math.exp(-t / 0.008) * slap) * smooth(t / 0.0012) * smooth((dur - t) / 0.03);
  }
  return x;
}
// деревянный «бонк» стула
function bonkBuf() {
  const n = Math.round(0.25 * SR), x = new Float32Array(n), modes = [[210, 1, 0.05], [530, 0.6, 0.03], [1180, 0.3, 0.015]];
  for (let i = 0; i < n; i++) {
    const t = i / SR; let s = 0;
    for (const [f, a, d] of modes) s += a * Math.sin(2 * Math.PI * f * t) * Math.exp(-t / d);
    x[i] = (s + wn() * Math.exp(-t / 0.003) * 0.5) * smooth(t / 0.0008);
  }
  return x;
}
// мультяшный свист: синус, тон взлетает и падает
function slideWhistle(dur, f0, f1, f2) {
  const n = Math.round(dur * SR), x = new Float32Array(n); let ph = 0;
  for (let i = 0; i < n; i++) {
    const u = i / n, f = u < 0.5 ? f0 * (f1 / f0) ** smooth(u / 0.5) : f1 * (f2 / f1) ** smooth((u - 0.5) / 0.5);
    ph += 2 * Math.PI * f * (1 + 0.012 * Math.sin(2 * Math.PI * 6 * u * dur)) / SR;
    x[i] = (Math.sin(ph) + 0.08 * Math.sin(2 * ph)) * smooth(u / 0.08) * smooth((1 - u) / 0.12) * 0.5;
  }
  return x;
}
// драка: возня облака (бурчащий шум), частые глухие удары, «вжик» кулаков, «бум», свист и стук вылетающих стульев
function fightBuf(dur, chairT) {
  const n = Math.round(dur * SR), Lc = new Float32Array(n), Rc = new Float32Array(n);
  { // бурчащая возня
    const F = [svf(), svf()]; F[0].set(380, 1.2); F[1].set(420, 1.2);
    let a = 0.5, tgt = 0.5, cnt = 0;
    for (let i = 0; i < n; i++) {
      if (--cnt <= 0) { cnt = Math.round(SR * (0.03 + 0.05 * rnd())); tgt = 0.25 + 0.75 * rnd(); }
      a += (tgt - a) * 0.004;
      const t = i / SR, e = a * smooth(t / 0.15) * smooth((dur - t) / 0.35) * 0.55;
      Lc[i] += F[0].bp(wn()) * e; Rc[i] += F[1].bp(wn()) * e;
    }
  }
  const P = [];
  for (let t = 0.06; t < dur - 0.3; t += 0.1 + 0.16 * rnd()) P.push({ t, x: thumpBuf(85 + 70 * rnd(), 0.05 + 0.03 * rnd(), 0.6, 0.2), pan: (rnd() * 2 - 1) * 0.45, g: 0.5 + 0.5 * rnd() });
  for (const u of [0.18, 0.45, 0.72]) P.push({ t: u * dur, x: whoosh(0.16, 0.6, 900, 4200), pan: (rnd() * 2 - 1) * 0.5, g: 0.5 });
  for (const u of [0.08, 0.52]) P.push({ t: u * dur, x: thumpBuf(48, 0.22, 0.4, 0.5), pan: 0, g: 1.3 }); // «бум»
  chairT.forEach(([tl, tland, pan], j) => {
    if (j % 2 === 0) P.push({ t: tl, x: slideWhistle(tland - tl, 700 + 60 * j, 1900 + 100 * j, 850), pan, g: 0.32 });
    else P.push({ t: tl, x: whoosh(tland - tl, 0.4, 500, 2600), pan, g: 0.5 });
    P.push({ t: tland - 0.001, x: bonkBuf(), pan, g: 0.8 });
  });
  const st = mono2st(P, dur);
  for (let i = 0; i < n; i++) { Lc[i] += st[0][i]; Rc[i] += st[1][i]; }
  return [Lc, Rc];
}
// взмах крыла: мягкий «фух» перьев
function flapBuf() {
  const n = Math.round(0.16 * SR), x = new Float32Array(n), bp = biquad('bp', 650, 0.9), lp = biquad('lp', 260, 0.7), hp = biquad('hp', 3000, 0.7);
  for (let i = 0; i < n; i++) {
    const t = i / SR, w = wn(), e = smooth(t / 0.03) * Math.exp(-Math.max(0, t - 0.03) / 0.035);
    x[i] = (bq(bp, w) + 1.5 * bq(lp, w) + 0.12 * bq(hp, w)) * e;
  }
  return x;
}
// грустный тромбон «уа-уа-уа-уааа»: пилы с медным фильтром и сурдиной-«квакушкой»
function tromboneBuf(u) {
  const notes = [[0, u, 60], [1.08 * u, u, 59], [2.16 * u, u, 58], [3.24 * u, 2.5 * u, 57]], dur = 3.24 * u + 2.5 * u;
  const n = Math.ceil((dur + 0.3) * SR), x = new Float32Array(n), F = svf(), W = svf();
  const ph = [rnd(), rnd()];
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let k = 0; for (let j = 0; j < notes.length; j++) if (t >= notes[j][0]) k = j;
    const [ns, nl, m] = notes[k], tn = t - ns, lastN = k === notes.length - 1;
    let semis = m - 0.35 * Math.exp(-tn / 0.03);
    if (lastN) semis += 0.35 * smooth((tn - 0.2) / 0.3) * Math.sin(2 * Math.PI * 5.2 * tn) - 0.7 * smooth((tn - nl + 0.4) / 0.4);
    const f = hz(semis);
    let s = 0;
    [1, 1.0023].forEach((r, j) => { const dt = f * r / SR; ph[j] += dt; if (ph[j] >= 1) ph[j] -= 1; s += 2 * ph[j] - 1 - polyblep(ph[j], dt); });
    s *= 0.5;
    let A = smooth(tn / 0.03) * (0.85 + 0.15 * Math.exp(-tn / 0.1));
    if (!lastN) A *= smooth((nl - tn + 0.02) / 0.05); else A *= smooth((nl - tn) / 0.25);
    if (t > dur) A = 0;
    const wah = lastN ? (0.55 + 0.45 * Math.sin(2 * Math.PI * 3.6 * Math.max(0, tn - 0.12) - Math.PI / 2 + Math.PI)) * smooth(tn / 0.12) * (1 - 0.7 * smooth((tn - nl + 0.4) / 0.4))
      : Math.sin(Math.PI * clamp(tn / nl, 0, 1)) ** 0.7;
    if ((i & 7) === 0) { F.set(f * (1.5 + 4 * A) + 250 + 1500 * wah, 0.9); W.set(380 + 1200 * wah, 2.6); }
    const y = F.lp(s);
    x[i] = (0.45 * y + 1.1 * W.bp(y)) * A;
  }
  return x;
}
// штамп: тяжёлый «тук» с шлепком; большой — ниже, с гулом и хвостом
function stampBuf(big) {
  const dur = big ? 1.2 : 0.35, n = Math.round(dur * SR), x = new Float32Array(n);
  const kn = biquad('bp', big ? 300 : 420, 2), sl = biquad('bp', 2300, 1), lp = biquad('lp', 1800, 0.7);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, w = wn();
    ph += 2 * Math.PI * ((big ? 46 : 82) + (big ? 95 : 110) * Math.exp(-t / 0.012)) / SR;
    let s = Math.sin(ph) * Math.exp(-t / (big ? 0.24 : 0.06)) + bq(kn, w) * Math.exp(-t / 0.025) * 1.2 + bq(sl, w) * Math.exp(-t / 0.006) * (big ? 1.6 : 1);
    if (big) s += bq(lp, w) * Math.exp(-t / 0.13) * 0.6;
    x[i] = Math.tanh(1.3 * s) * smooth(t / 0.0008) * smooth((dur - t) / 0.06);
  }
  return x;
}

// --- хлопушки конфетти: на 0,45 с, на «Квартет» и в финале (fin + 0,2) ---
[[0.45, SFX_DB.pop[0]], [EV.w_kv1, SFX_DB.pop[1]], [EV.fin + 0.2, SFX_DB.pop[2]]].forEach(([t, d]) => {
  const tp = t + FRAME; place(tp, popBuf(), d, 0, 0.12, 'pop', 0.2); log('pop', tp);
});
// --- аплодисменты зала: «Пленять своим искусством свет» ---
{
  const t0 = EV.w_plen - 0.05 + FRAME, t1 = E(8) + 0.15, dur = t1 - t0;
  place(t0, applauseBuf(dur), SFX_DB.applause, 0, dur, 'applause', 0.25); log('applause', t0); log('applause', t1);
}
// --- три попытки квартета ---
{
  const tries = [[EV.w_udar, EV.w_derut, EV.w_net], [EV.w_nach, EV.w_neid1, EV.w_neid1 + 0.15], [E(21), EV.w_neid2, EV.w_neid2 + 0.15]];
  tries.forEach(([ts, tf, tx], j) => {
    const lay = LAYOUT[j], gap = tf - ts - 0.04, tuneLen = Math.min(gap, 1.4);
    place(ts + FRAME, tuning(lay, tuneLen), SFX_DB.tune, 0, Math.min(1, tuneLen), 'tune', 0.2); log('tune', ts + FRAME);
    if (gap - tuneLen > 0.8) {
      const t0 = ts + tuneLen + 0.08, len = tf - 0.02 - t0;
      place(t0 + FRAME, timid(lay, len), SFX_DB.timid, 0, len, 'timid', 0.2); log('timid', t0 + FRAME);
    }
    // скрежет не дольше 1,1 с; если зуммер почти сразу (попытки 2 и 3) — короче и под зуммером тише
    const tsc = tf + FRAME - 0.01, early = tx - tf < 0.6, dsc = early ? 0.8 : Math.min(1.1, tx - tf - 0.05);
    place(tsc, screech(lay, 0.85 + 0.1 * j, dsc, early ? tx - tf + 0.05 : null), SFX_DB.screech[j], 0, Math.min(0.9, dsc), 'screech', 0.25); log('screech', tsc);
    const tb = tx + 0.013 + FRAME; // большой «✕» садится через ~0,06 с после x − 0,05
    place(tb, buzzerBuf(0.55), SFX_DB.buzzer[j], 0, 0.5, 'buzzer', 0.15); log('buzzer', tb);
  });
}
// --- «вжух» стульев: пик — на середине пересадки (лёгкий наплыв easeInOut) ---
{
  const C = [[EV.w_seli - 0.15, EV.w_seli + 0.45, [[-0.25, 0.25]]], [EV.w_rass - 0.15, EV.w_rass + 0.75, [[-0.6, 0.5], [0.6, -0.5]]], [EV.w_usel - 0.15, EV.w_usel + 0.7, [[0.3, -0.3]]]];
  for (const [a, b, sweeps] of C) {
    const pk = (a + b) / 2 + FRAME, dur = Math.min(0.75, (b - a) * 0.95), p = 0.5;
    sweeps.forEach(([p0, p1], j) => {
      const t0 = pk - p * dur + j * 0.06;
      place(t0, whoosh(dur, p, 380, 2400 + 400 * j), SFX_DB.chair - (sweeps.length > 1 ? 2.5 : 0), (t) => lerp(p0, p1, smooth(t / dur)), dur, 'chair', 0.12);
    });
    log('chair', pk);
  }
}
// --- «дзынь» лампочки: лампочка садится на пружине через ~0,08 с после w_sekret − 0,15 ---
{ const t = EV.w_sekret - 0.15 + 0.084 + FRAME; place(t, dingBuf(), SFX_DB.ding, scrPan(1300) * 0.5, 0.3, 'ding', 0.3); log('ding', t); }
// --- драка ---
{
  const t0 = FIGHT[0] + FRAME, dur = FIGHT[1] - FIGHT[0];
  const sc = { mart: 380, osel: 700, kozel: 1260, mish: 1580 };
  const chairT = ['mart', 'osel', 'kozel', 'mish'].map((k, i) => { const fl = FIGHT[0] + 0.35 + i * 0.22; return [fl - FIGHT[0], fl + 0.9 - FIGHT[0], scrPan(sc[k]) * 0.8]; });
  place(t0, fightBuf(dur, chairT), SFX_DB.fight, 0, dur, 'fight', 0.15); log('fight', t0); log('fight', t0 + dur);
}
// --- полёт Соловья: взмах вниз — когда sin(30 t) проходит ноль сверху вниз (video/src/main.js) ---
{
  const a = EV.w_solov - 0.5, b = EV.w_prilet + 0.35, parts = [];
  for (let k = Math.ceil((a * 30 - Math.PI) / (2 * Math.PI)); ; k++) {
    const t = (Math.PI + 2 * Math.PI * k) / 30; if (t >= b - 0.05) break; if (t < a) continue;
    const u = (t - a) / (b - a), x = lerp(-120, 1508, easeInOut(u));
    parts.push({ t: t - a + FRAME - 0.03, x: flapBuf(), pan: scrPan(x) * 0.45, g: 0.7 + 0.3 * Math.sin(Math.PI * u) });
    log('flap', t + FRAME);
  }
  place(a, mono2st(parts, b - a + 0.3), SFX_DB.flap, 0, b - a, 'flap', 0.2);
}
// --- трель Соловья после прилёта: свист с подъёмом, трель, щёлканье ---
{
  const t0 = EV.w_prilet + 0.3 + FRAME;
  const SYL = [[0, 0.15, (u) => lerp(84, 89, smooth(u))], [0.17, 0.26, (u, t) => (Math.floor(t * 26) % 2 ? 91 : 93)], [0.45, 0.06, (u) => lerp(89, 86, u)],
    [0.53, 0.04, () => 93], [0.59, 0.08, (u) => lerp(93, 89, smooth(u))]];
  const last = SYL[SYL.length - 1], dur = last[0] + last[1];
  const pitch = (t) => { let s = SYL[0]; for (const q of SYL) if (t >= q[0]) s = q; return s[2](clamp((t - s[0]) / s[1], 0, 1), t); };
  const amp = (t) => { for (const [s, d] of SYL) if (t >= s - 0.005 && t < s + d + 0.02) return smooth((t - s + 0.005) / 0.012) * smooth((s + d + 0.02 - t) / 0.02) * (t0 + t < E(26) ? 0.6 : 1); return 0; };
  const x = fluteBuf(dur, pitch, { vel: 0.7, vib: 0, breath: 0.06, att: 0.005, rel: 0.04, amp });
  place(t0, x, SFX_DB.trill, scrPan(1508) * 0.5, dur, 'trill', 0.35); log('trill', t0); log('trill', t0 + dur);
}
// --- вердикт: четыре штампа «✕», большой штамп «НЕ ПРОШЛИ», грустный тромбон ---
const tBig = EV.w_godit + 1.15 + 0.075 + FRAME; // штамп садится на пружине через ~0,075 с
{
  [0, 1, 2, 3].forEach((i) => { // пока звучит «годитесь» — на 3 дБ тише
    const t = EV.w_godit + 0.3 + i * 0.22 + 0.07 + FRAME;
    place(t, stampBuf(false), SFX_DB.stamp - (t < E(NL) ? 3 : 0), [-0.45, -0.15, 0.15, 0.45][i], 0.15, 'stamp', 0.15); log('stamp', t);
  });
  place(tBig, stampBuf(true), SFX_DB.bigstamp, 0, 0.3, 'bigstamp', 0.3); log('bigstamp', tBig);
  const tt = tBig + 0.16, u = clamp((EV.fin - 0.08 - tt) / 5.74, 0.22, 0.36), x = tromboneBuf(u);
  place(tt, x, SFX_DB.trombone, 0.05, 5.74 * u, 'trombone', 0.3); log('trombone', tt); log('trombone', tt + 5.74 * u);
  if (tt + 5.74 * u > EV.fin + 0.05) console.warn('тромбон заходит на финальную заставку');
}
const sfxWet = reverb(sfxSend, 0.78, 0.35);
const sfxAll = [0, 1].map((ch) => { const o = new Float32Array(N); for (let i = 0; i < N; i++) o[i] = sfx[ch][i] + sfxWet[ch][i]; return o; });

// ---------- форма громкости музыки ----------
// Цели — RMS музыки к RMS голоса (в местах речи): по строкам около UNDER_DB (танец и драка чуть громче, речь Соловья
// тише), заставка, «та-дам» в паузах и финал громче. Внутри строки громкость постоянна, переходы — в паузах.
const LINE_DB = Array.from({ length: NL }, (_, i) => {
  const n = i + 1;
  if (n >= 6 && n <= 8) return 0.5; if (n >= 10 && n <= 14) return -0.5; if (n === 15) return 1; if (n === 21) return -0.5;
  if (n === 24 || n === 25) return 1; if (n === 26 || n === 27) return -1; if (n >= 32 && n <= 35) return -1.5; if (n === 36) return -0.5;
  return 0;
});
const inter = (w) => ON.map(([a, b]) => [Math.max(a, w[0]), Math.min(b, w[1])]).filter(([a, b]) => b - a > 0.05);
const onWins = speech.map(inter);
const vRef = dB(voiceMS);
const lvl = (chs, wins) => dB(msIn(chs, wins));
const lineG = onWins.map((w, i) => (w.reduce((a, [x, y]) => a + y - x, 0) < 0.25 ? null : db(vRef + UNDER_DB + LINE_DB[i] - lvl(music, w))));
for (let i = 0; i < NL; i++) if (lineG[i] === null) lineG[i] = lineG[i - 1] ?? lineG.find((g) => g !== null);
{ // общий множитель: в среднем по всем строкам (где играет оркестр) ровно UNDER_DB
  let sm = 0, tot = 0;
  onWins.forEach((w, i) => w.forEach(([a, b]) => { sm += msIn(music, [[a, b]]) * lineG[i] ** 2 * (b - a); tot += b - a; }));
  const k = Math.sqrt(voiceMS * db(UNDER_DB) ** 2 / (sm / tot));
  for (let i = 0; i < NL; i++) lineG[i] *= k;
}
const gFor = (wins, target) => db(vRef + target - lvl(music, wins));
const gIntro = gFor([[tH, tG0 - 0.3]], INTRO_DB), gFin = gFor([[EV.fin, EV.fin + 6 * bO]], FIN_DB);
const STINGS = [[5, A1], [8, B1], [15, G2], [20, G4], [25, K6], [27, G7]];
const gSting = Object.fromEntries(STINGS.map(([n, t]) => [n, gFor([[t, L(n + 1) - 0.1]], STING_DB - (n === 25 ? 1 : 0))]));
const shape = [[0, 0], [0.012, gIntro], [tG0 - 0.32, gIntro], [tG0 + 0.02, lineG[0]]];
for (let i = 1; i <= NL; i++) {
  const g = lineG[i - 1];
  if (i > 1) shape.push([L(i), g]);
  shape.push([E(i), g]);
  if (gSting[i] && i < NL) {
    const t = STINGS.find(([n]) => n === i)[1], gs = clamp(gSting[i], g * db(-3), g * db(8));
    shape.push([Math.min(t - 0.005, E(i) + 0.03), gs], [L(i + 1) - 0.12, gs], [L(i + 1) - 0.02, lineG[i]]);
  }
}
shape.push([E(NL) + 0.1, lineG[NL - 1]], [EV.fin - 0.4, gFin], [TOTAL - 1.8, gFin], [TOTAL - 0.04, 0], [TOTAL, 0]);
for (let i = 1; i < shape.length; i++) if (shape[i][0] < shape[i - 1][0]) throw new Error(`форма громкости: ключи не по порядку на ${shape[i][0]}`);
const shaped = [0, 1].map((ch) => { const o = new Float32Array(N); for (let i = 0; i < N; i++) o[i] = music[ch][i] * curve(shape, i / SR); return o; });

const out = [0, 1].map((ch) => { const o = new Float32Array(N); for (let i = 0; i < N; i++) o[i] = shaped[ch][i] + sfxAll[ch][i]; return o; });
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(out[0][i]), Math.abs(out[1][i]));
const limit = peak > 0.89 ? 0.89 / peak : 1;
if (limit < 1) console.warn(`пик ${peak.toFixed(3)} — всё ослаблено в ${limit.toFixed(3)} раза`);
for (let i = Math.max(0, N - Math.round(0.03 * SR)); i < N; i++) out[0][i] = out[1][i] = 0; // без щелчка в конце

// ---------- запись ----------
const data = Buffer.alloc(44 + N * 4);
data.write('RIFF', 0); data.writeUInt32LE(36 + N * 4, 4); data.write('WAVEfmt ', 8);
data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(2, 22);
data.writeUInt32LE(SR, 24); data.writeUInt32LE(SR * 4, 28); data.writeUInt16LE(4, 32); data.writeUInt16LE(16, 34);
data.write('data', 36); data.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) for (const ch of [0, 1]) {
  const v = out[ch][i] === 0 ? 0 : Math.round(out[ch][i] * limit * 32767 + (rnd() - rnd()));
  data.writeInt16LE(Math.max(-32768, Math.min(32767, v)), 44 + i * 4 + ch * 2);
}
fs.writeFileSync(path.join(HERE, 'music.wav'), data);
fs.writeFileSync(path.join(HERE, 'sfx.json'), JSON.stringify({
  note: 'секунды ролика. Шумы: pop, chair, ding, stamp, bigstamp, flap — пики; tune, timid, screech, buzzer — начала; applause, fight, trill, trombone — начало и конец. music — ключевые моменты музыки (удары, разделы).',
  V0, OUTRO, total: TOTAL, ...SFX, music: MARK,
}, null, 1));

// ---------- отчёт ----------
const f1 = (x) => x.toFixed(1);
const sh = shaped.map((x) => x.map((v) => v * limit)), all = out.map((x) => x.map((v) => v * limit));
const allOn = onWins.flat();
const kSh = sh.map(kWeight), kAll = all.map(kWeight), kS = sfxAll.map(kWeight);
const relR = (chs, wins) => f1(lvl(chs, wins) - vRef), relK = (chs, wins) => f1(lvl(chs, wins) - dB(voiceKMS));
console.log(`события: ${evSrc}; V0 ${V0}, OUTRO ${OUTRO}, длина ${TOTAL} с (${N} отсчётов)`);
console.log(`темп: заставка ${(60 / bI).toFixed(1)} BPM, финал ${(60 / bO).toFixed(1)} BPM; разделы: ${SECTIONS.map((s) => `${s.name} ${s.t0.toFixed(2)}–${s.t1.toFixed(2)} (${(60 / s.beat).toFixed(0)})`).join(', ')}`);
console.log(`голос в местах речи: RMS ${f1(vRef)} дБFS, K ${f1(dB(voiceKMS) - 0.691)} LUFS`);
console.log(`музыка под голосом (где играет оркестр шоу): RMS ${relR(sh, allOn)} дБ, K ${relK(kSh, allOn)} дБ к голосу; по всей речи: RMS ${relR(sh, speech)}, K ${relK(kSh, speech)}`);
console.log(`музыка + шумы по всей речи: RMS ${relR(all, speech)} дБ, K ${relK(kAll, speech)} дБ`);
console.log('по строкам (музыка, RMS дБ к голосу; «—» — оркестр молчит):', onWins.map((w, i) => `${i + 1}:${w.length ? relR(sh, w) : '—'}`).join(' '));
console.log(`заставка RMS ${relR(sh, [[tH, tG0 - 0.3]])}, финал RMS ${relR(sh, [[EV.fin, EV.fin + 6 * bO]])}, «та-дам» ${STINGS.map(([n, t]) => `${n}/${n + 1}:${relR(sh, [[t, L(n + 1) - 0.1]])}`).join(' ')} (дБ к голосу)`);
console.log('шумы в своих окнах (K / RMS, дБ к голосу):', Object.entries(SFXWIN).map(([k, w]) => `${k} ${w.map((x) => `${relK(kS, [x])}|${relR(sfxAll, [x])}`).join(' ')}`).join(', '));
{
  const bal = (wins) => Object.entries(BUS).map(([nm, b]) => `${nm} ${f1(lvl(b, wins))}`).filter((x) => !x.endsWith('-200.0')).join(', ');
  console.log(`баланс шин (сухо, RMS дБFS до общего уровня):\n  заставка — ${bal([[0.45, tG0]])}\n  строки 1–8 — ${bal(speech.slice(0, 8))}\n  строки 23–25 — ${bal(speech.slice(22, 25))}\n  строки 32–36 — ${bal(speech.slice(31))}\n  финал — ${bal([[EV.fin, EV.fin + 2]])}`);
}
{
  let pk = 0;
  for (let i = 0; i < N; i++) {
    const j = i - Math.round(V0 * SR), v = j >= 0 && j < voiceA.length ? voiceA[j] : 0;
    pk = Math.max(pk, Math.abs(all[0][i] + v), Math.abs(all[1][i] + v));
  }
  console.log(`music.wav: пик ${(peak * limit).toFixed(4)} (${f1(20 * Math.log10(peak * limit))} dBFS), множитель ${limit.toFixed(3)}; голос + музыка: пик ${f1(20 * Math.log10(pk))} dBFS`);
}
console.log('шумы:', JSON.stringify(SFX));
console.log('музыка:', JSON.stringify(MARK));
