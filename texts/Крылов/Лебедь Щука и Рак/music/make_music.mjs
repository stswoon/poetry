// Музыка к басне И. А. Крылова «Лебедь, Щука и Рак», стиль «Спортивная трансляция».
//
// Своя заставка спортивного канала, ~120 BPM, си-бемоль мажор: бочка, малый, хай-хэт, тарелка, синт-бас,
// синтетическая «медь» (секция из трёх пил на голос с фильтром, который раскрывается на атаке, как у меди)
// и труба-соло. Мелодии и аранжировка свои.
//   0 … V0      заставка: дробь малого под пролёт полос, удар с тарелкой на появлении плашки, фанфара в два такта
//               (F F B♭ G F D | E♭ F G A B♭ — B♭!), последний удар — вместе со шторкой к доске;
//   под голосом ритм тихо остаётся, мелодии нет: строки 1–3 («предматчевый анализ») — лёгкий бит, бас, редкие
//               стабы; в паузе между строфами — сбивка меди и малого с тарелкой на шторке к арене;
//               строки 4–5 (арена) — бит с малым на 2 и 4; строка 6 — нарастание (дробь, крещендо меди, шумовой
//               подъём), на красных огнях два стаба «раз, два», на зелёном — удар с тарелкой (и свисток);
//   строки 7–8 («матч») — плотный бит «бочка на каждую долю»; 9–10 («ПОВТОР») — тот же темп вполсилы,
//               музыка «за стеклом» (низкочастотный фильтр), длинные аккорды; 11 («ВИДЕОПРОВЕРКА») — барабаны уходят,
//               тикают «часы», тихие удары литавры, тянется тревожный аккорд D(sus4) → D;
//   строка 12   обрыв ритма и «сдувшийся» спуск: тянущийся аккорд оседает вниз с покачиванием, затем глухое «бом»
//               на итоговом табло «0,0 м»;
//   финал (fin) сбивка и фанфара-отбивка (тот же мотив, ответ на заставку), финальный аккорд и чистое затухание.
// Шумы — синтез, редкие и только с причиной в кадре: «вжух» на трёх шторках и тише на карточках участников,
// глухие «бух» поклажи, стартовый свисток на зелёном огне, всплески щуки, финальный свисток в паузе перед
// строкой 12 (кончается к её началу, чтобы не закрывать «Да только…»). Пик шума — на кадр позже события.
//
// Запуск: node make_music.mjs [V0] [OUTRO]        (по умолчанию 4.5 и 6.5; можно --v0=4.5 --outro=6.5)
// Читает ../timings.json, ../voice.mp3 (через ffmpeg) и events.json (пишет ../video/build.py), если он совпадает
// с таймингами; иначе времена событий считает по timings.json так же, как build.py.
// Пишет music.wav (44,1 кГц, 16 бит, стерео, длина V0 + голос + OUTRO) и sfx.json (времена шумов и музыки).
// Без зависимостей: node и ffmpeg.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const POEM = path.dirname(HERE);
const SR = 44100, FRAME = 1 / 30;
const UNDER_DB = -19;                       // музыка под голосом относительно голоса (K-взвешенно, в местах речи)
const INTRO_DB = -9, FIN_DB = -8, GAP_DB = -13; // фанфара заставки, фанфара финала, пауза между строфами (дБ к голосу)
const GO_DB = 3;                                 // удар на зелёном огне — громче соседних строк на столько
// шумы: громкость в своём окне относительно голоса в местах речи (K-взвешенно)
const SFX_DB = { wipe: [-12, -13, -15], card: -21, thud: -23, whistle_start: -12, splash: [-19, -16], whistle_final: -12 };

// ---------- аргументы и время ----------
const argv = process.argv.slice(2);
const pos = argv.filter((a) => !a.startsWith('--'));
const opt = (name, i, def) => {
  const kv = argv.find((a) => a.startsWith(`--${name}=`));
  const v = kv ? Number(kv.split('=')[1]) : pos[i] !== undefined ? Number(pos[i]) : def;
  if (!Number.isFinite(v)) throw new Error(`плохое значение ${name}`);
  return v;
};
const V0 = opt('v0', 0, 4.5), OUTRO = opt('outro', 1, 6.5);
if (V0 < 3.5 || OUTRO < 4.5) throw new Error('нужно V0 >= 3.5 и OUTRO >= 4.5');

const r3 = (x) => Math.round(x * 1000) / 1000;
const T = JSON.parse(fs.readFileSync(path.join(POEM, 'timings.json'), 'utf8'));
const VD = T.voiceDuration;
const TOTAL = r3(V0 + VD + OUTRO);
const N = Math.round(TOTAL * SR);
const LINES = T.lines.map((l) => ({ s: l.start + V0, e: l.end + V0, words: l.words }));
if (LINES.length !== 12) throw new Error(`ожидалось 12 строк, в timings.json ${LINES.length}`);

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
    w_leb: [4, 'Лебедь'], w_rak: [4, 'Рак'], w_shch: [4, 'Щука'], w_pokl: [5, 'поклажей'], w_voz: [5, 'воз'],
    w_troe: [6, 'трое'], w_vpr: [6, 'впряглись'], w_obl: [9, 'облака'], w_vodu: [10, 'воду'], w_sud: [11, 'судить'],
    w_voz3: [12, 'воз'], w_nyne: [12, 'ныне'],
  };
  for (const [k, [n, w]] of Object.entries(W)) ev[k] = word(n, w);
  Object.assign(ev, {
    wipe1: r3(V0 - 0.65), wipe2: r3(ev.L4 - 0.6), wipe3: r3(ev.L9 - 0.55), green: r3(ev.L7 - 0.12), fin: r3(ev.E12 + 1.0),
  });
  ev.red1 = r3(Math.min(ev.green - 0.3, Math.max(ev.green - 0.7, ev.w_vpr + 0.15)));
  ev.red2 = r3((ev.red1 + ev.green) / 2);
  return ev;
}
const EV = eventsFromTimings();
let evSrc = 'timings.json';
{
  const p = path.join(HERE, 'events.json');
  if (fs.existsSync(p)) {
    const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
    const shift = V0 - (raw.V0 ?? V0);
    if (Math.abs(raw.L1 + shift - EV.L1) < 0.02 && Math.abs(raw.E12 + shift - EV.E12) < 0.02) {
      for (const [k, v] of Object.entries(raw)) if (typeof v === 'number' && !['V0', 'OUTRO', 'total'].includes(k)) EV[k] = r3(v + shift);
      evSrc = shift ? `events.json со сдвигом ${shift > 0 ? '+' : ''}${shift.toFixed(2)} с` : 'events.json';
    } else console.warn('events.json не совпадает с timings.json — события считаю по timings.json');
  }
}
const L = (n) => EV[`L${n}`], E = (n) => EV[`E${n}`];

// ---------- помощники ----------
let seed = 1814;
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
const scrPan = (x) => clamp((x - 960) / 960 * 0.8, -0.85, 0.85); // x в кадре 1920 → панорама
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
// фильтр с переменным срезом (state variable, TPT): set(fc, Q) — хоть каждые несколько отсчётов
function svf() {
  let ic1 = 0, ic2 = 0, a1 = 1, a2 = 0, a3 = 0;
  return {
    set(fc, Q) { const g = Math.tan(Math.PI * Math.min(fc, SR * 0.45) / SR), k = 1 / Q; a1 = 1 / (1 + g * (g + k)); a2 = g * a1; a3 = g * a2; },
    lp(x) { const v3 = x - ic2, v1 = a1 * ic1 + a2 * v3, v2 = ic2 + a2 * ic1 + a3 * v3; ic1 = 2 * v1 - ic1; ic2 = 2 * v2 - ic2; return v2; },
    bp(x) { const v3 = x - ic2, v1 = a1 * ic1 + a2 * v3, v2 = ic2 + a2 * ic1 + a3 * v3; ic1 = 2 * v1 - ic1; ic2 = 2 * v2 - ic2; return v1; },
  };
}

// шины: сухие и посыл на реверберацию
const BUS = { бочка: stereo(), малый: stereo(), хэт: stereo(), тарелки: stereo(), перкуссия: stereo(), бас: stereo(), медь: stereo(), труба: stereo(), подушка: stereo(), подъём: stereo() };
const { бочка: kb_, малый: sn_, хэт: hh_, тарелки: cy_, перкуссия: pc_, бас: bs, медь: br, труба: ld, подушка: pd, подъём: fx } = BUS;
const send = stereo();
const sfx = stereo(), sfxSend = stereo();
function put(bus, i, y, gl, gr, sendK, sbus = send) {
  if (i < 0 || i >= N) return;
  bus[0][i] += y * gl; bus[1][i] += y * gr;
  if (sendK) { sbus[0][i] += y * gl * sendK; sbus[1][i] += y * gr * sendK; }
}
const hum = (s = 0.004) => (rnd() - 0.5) * 2 * s;

// ---------- барабаны ----------
function kick(t0, vel = 0.8) {
  const i0 = Math.round(t0 * SR), len = Math.round(0.42 * SR);
  let ph = 0, prev = 0, hp = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR, f = 46 + 95 * Math.exp(-t / 0.028) + 170 * Math.exp(-t / 0.0035);
    ph += 2 * Math.PI * f / SR;
    const n = wn(); hp = 0.55 * (hp + n - prev); prev = n;
    const body = Math.sin(ph) * Math.exp(-t / 0.16) * smooth(t / 0.0012) * smooth((0.42 - t) / 0.06);
    const y = Math.tanh(1.8 * (body + hp * Math.exp(-t / 0.0025) * 0.22)) / Math.tanh(1.8) * vel * 0.85;
    put(kb_, i0 + i, y, 0.7071, 0.7071, 0.03);
  }
}
function snare(t0, vel = 0.6, { pan = 0.05, sendK = 0.16, dec = 0.13, tone = 1 } = {}) {
  const i0 = Math.round(t0 * SR), len = Math.round((dec * 6 + 0.02) * SR), [gl, gr] = panLR(pan);
  const hp = biquad('hp', 900, 0.7), bp = biquad('bp', 3300, 0.6);
  let p1 = 0, p2 = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    p1 += 2 * Math.PI * (186 + 45 * Math.exp(-t / 0.008)) / SR; p2 += 2 * Math.PI * 332 / SR;
    const nz = bq(bp, bq(hp, wn())) * 2.2;
    const y = (tone * (0.55 * Math.sin(p1) * Math.exp(-t / 0.055) + 0.22 * Math.sin(p2) * Math.exp(-t / 0.035))
      + nz * Math.exp(-t / dec) * (1 + 1.3 * Math.exp(-t / 0.008))) * smooth(t / 0.0008) * smooth((len / SR - t) / 0.01) * vel * 0.68;
    put(sn_, i0 + i, y, gl, gr, sendK);
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
function crash(t0, vel = 0.7, dec = 0.9) {
  const i0 = Math.round(t0 * SR), len = Math.min(N - i0, Math.round(dec * 4.2 * SR));
  const f = [0, 1].map(() => [biquad('hp', 3200, 0.7), biquad('bp', 6800, 0.5), biquad('lp', 13000, 0.7)]);
  for (let i = 0; i < len; i++) {
    const t = i / SR, env = Math.exp(-t / dec) * (1 + 1.6 * Math.exp(-t / 0.035)) * smooth(t / 0.0008) * smooth((len / SR - t) / 0.3) * vel * 0.13;
    for (const ch of [0, 1]) {
      const [h, b, l] = f[ch], x = bq(h, wn());
      const y = bq(l, x + 0.8 * bq(b, x)) * env;
      if (i0 + i < N) { cy_[ch][i0 + i] += y; send[ch][i0 + i] += y * 0.22; }
    }
  }
}
// том / литавра: основной тон с подъездом сверху, призвуки, глухой удар колотушки
function tom(t0, f, vel = 0.6, { dec = 0.28, pan = 0, parts = [[1, 1], [1.59, 0.25]], sendK = 0.12, mallet = 0.25 } = {}) {
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
// деревянная коробочка: «тик-так» видеопроверки
function block(t0, f, vel = 0.4, pan = 0) {
  const i0 = Math.round(t0 * SR), len = Math.round(0.12 * SR), [gl, gr] = panLR(pan), bp = biquad('bp', f * 1.4, 2);
  let p1 = 0, p2 = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR; p1 += 2 * Math.PI * f / SR; p2 += 2 * Math.PI * f * 2.76 / SR;
    const y = (Math.sin(p1) * Math.exp(-t / 0.022) + 0.35 * Math.sin(p2) * Math.exp(-t / 0.009) + 0.5 * bq(bp, wn()) * Math.exp(-t / 0.003))
      * smooth(t / 0.0005) * smooth((0.12 - t) / 0.02) * vel * 0.3;
    put(pc_, i0 + i, y, gl, gr, 0.15);
  }
}
function roll(t0, t1, v0, v1, step) {
  for (let t = t0, k = 0; t < t1 - 1e-6; t += step, k++) {
    const u = (t - t0) / Math.max(1e-6, t1 - t0);
    snare(t + hum(0.003), lerp(v0, v1, u * u) * (0.88 + 0.24 * rnd()) * (k % 2 ? 0.86 : 1), { dec: 0.075, sendK: 0.1 });
  }
}
// шумовой подъём перед стартом: полосовой шум, центр уходит вверх 350 → 7000 Гц
function riser(t0, t1, vel = 0.5) {
  const i0 = Math.round(t0 * SR), len = Math.round((t1 - t0) * SR), F = [svf(), svf()];
  for (let i = 0; i < len; i++) {
    const u = i / len;
    if ((i & 15) === 0) { const fc = 350 * (7000 / 350) ** (u ** 1.3); F[0].set(fc, 1.6); F[1].set(fc * 1.06, 1.6); }
    const env = u ** 2.2 * smooth((len - i) / (0.012 * SR)) * vel * 0.3;
    for (const ch of [0, 1]) { const y = F[ch].bp(wn()) * env; fx[ch][i0 + i] += y; send[ch][i0 + i] += y * 0.25; }
  }
}

// ---------- синтезаторы ----------
// «медь», труба, подушка: несколько пил (PolyBLEP) с расстройкой, ФНЧ, срез которого растёт с громкостью
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
    put(bs, i0 + i, (F.lp(saw) * 0.85 + Math.sin(ps) * 0.5) * A * vel * 0.6, 0.7071, 0.7071, sendK);
  }
}

// ---------- гармония ----------
// бас — нижний звук, pcs — звуки аккорда
const CH = {
  Bb: { b: 34, pcs: [10, 2, 5] }, BbD: { b: 38, pcs: [10, 2, 5] }, Bb7: { b: 34, pcs: [10, 2, 5, 8] }, Gm: { b: 43, pcs: [7, 10, 2] },
  Eb: { b: 39, pcs: [3, 7, 10] }, F: { b: 41, pcs: [5, 9, 0] }, Ab: { b: 44, pcs: [8, 0, 3] }, Cm: { b: 36, pcs: [0, 3, 7] },
  D: { b: 38, pcs: [2, 6, 9] }, Dsus: { b: 38, pcs: [2, 7, 9] },
};
const voicing = (ch, top, n) => { const p = CH[ch].pcs, o = []; for (let m = top; o.length < n && m > 30; m--) if (p.includes(((m % 12) + 12) % 12)) o.push(m); return o; };
const BRASS = { gain: 0.42, nOsc: 3, det: 10, bright: 3.4, sus: 0.7, att: 0.018, dec: 0.15, rel: 0.1, scoop: 0.25, sendK: 0.28 };
const STAB = { ...BRASS, gain: 0.5, bright: 3, sus: 0.55, att: 0.008, dec: 0.09, rel: 0.06, scoop: 0.18, sendK: 0.22 };
const LEAD = { gain: 0.55, nOsc: 2, det: 6, bright: 5.5, sus: 0.82, att: 0.015, dec: 0.2, rel: 0.08, scoop: 0.45, vib: 0.14, sendK: 0.3, pan: -0.08 };
const PAD = { gain: 0.25, nOsc: 3, det: 12, bright: 1.6, sus: 1, att: 0.5, dec: 1, rel: 0.25, scoop: 0, sendK: 0.45, blat: 0 };
function section(t, ch, dur, vel, top = 70, n = 4, o = {}) {
  voicing(ch, top, n).forEach((m, j, a) => voice(br, t + j * 0.003 + hum(0.002), dur, m, { ...BRASS, vel, pan: a.length > 1 ? -0.38 + 0.76 * j / (a.length - 1) : 0, ...o }));
}
const stab = (t, ch, dur, vel, top = 70, n = 4) => section(t, ch, dur, vel, top, n, STAB);
const lead = (t, m, dur, vel = 0.75, o = {}) => voice(ld, t, dur, m, { ...LEAD, vel, ...o });

// ---------- сетка: такты ~120 BPM ----------
// отрезок [t0, t1] делится на доли около 0,5 с, доли — на такты по 4 (последний может быть короче)
function splitBars(t0, t1) {
  const nb = Math.max(1, Math.round((t1 - t0) / 0.5)), b = (t1 - t0) / nb, out = [];
  for (let k = 0; k < nb; k += 4) out.push({ t: t0 + k * b, nb: Math.min(4, nb - k), beat: b });
  return out;
}
const MARK = {}; // ключевые музыкальные моменты для отчёта и sfx.json
const mark = (k, t) => { MARK[k] = r3(t); };

// ---------- заставка ----------
// полосы пролетают 0…0,95 с, плашка с названием выезжает с 0,4 с (video/src/main.js) — первый удар на 0,45
const tH = 0.45, tG0 = V0 - 0.05, bI = (tG0 - tH) / 8;
if (bI < 0.4 || bI > 0.62) console.warn(`темп заставки ${(60 / bI).toFixed(0)} BPM — далеко от 120`);
{
  const at = (x) => tH + x * bI;
  roll(0.03, tH - 0.02, 0.1, 0.62, bI / 8);
  crash(at(0), 0.85); mark('intro_hit', at(0));
  for (let k = 0; k < 7; k++) {
    kick(at(k), k ? 0.82 : 0.95);
    if (k % 2) snare(at(k) + hum(), 0.62);
    hat(at(k) + hum(), 0.24); hat(at(k + 0.5) + hum(), 0.17);
  }
  // гармония по долям, мелодия трубы и секция в ритм мелодии
  const HARM = [[0, 'Bb'], [2, 'Eb'], [3, 'BbD'], [4, 'Ab'], [5, 'Eb'], [5.5, 'F'], [6, 'Bb']];
  const chAt = (x) => HARM.reduce((a, [b, c]) => (x >= b - 1e-6 ? c : a), 'Bb');
  const FAN = [[0, 77, 0.7], [0.75, 77, 0.22], [1, 82, 0.92], [2, 79, 0.45], [2.5, 77, 0.45], [3, 74, 0.92],
    [4, 75, 0.45], [4.5, 77, 0.45], [5, 79, 0.45], [5.5, 81, 0.45], [6, 82, 0.7]];
  const SECT = [[0, 0.7], [0.75, 0.22], [1, 0.92], [2, 0.92], [3, 0.92], [4, 0.92], [5, 0.45], [5.5, 0.45], [6, 0.7]];
  for (const [x, m, d] of FAN) lead(at(x), m, d * bI, x === 1 || x === 6 ? 0.85 : 0.75);
  for (const [x, d] of SECT) section(at(x), chAt(x), d * bI, x === 0 || x === 6 ? 0.8 : 0.65, 72, 4);
  for (let x = 0; x < 7; x += 0.5) { const ch = chAt(x); bass(at(x), bI * 0.42, CH[ch].b + (x % 1 ? 12 : 0), x % 1 ? 0.55 : 0.75); }
  // последний удар — вместе со шторкой к доске
  const tz = at(7);
  kick(tz, 0.95); snare(tz, 0.7); crash(tz, 0.8, 1.1);
  stab(tz, 'Bb', bI * 0.42, 0.9, 74, 5); lead(tz, 82, bI * 0.42, 0.85, { vib: 0 });
  bass(tz, bI * 0.8, 34, 0.85);
  mark('intro_final_hit', tz);
}

// ---------- до старта (строки 1–6) ----------
const g1 = splitBars(tG0, EV.green);
{
  let ia = 0, ir = 0;
  const nb1 = g1.length;
  g1.forEach((b, k) => {
    if (b.t >= EV.green - 3.3 || k === nb1 - 1) b.sec = 'build';
    else if (b.t + 2 * b.beat < EV.wipe2 + 0.3) b.sec = 'analysis';
    else b.sec = 'arena';
  });
  const build = g1.filter((b) => b.sec === 'build');
  build.forEach((b, j) => { b.chord = ['Cm', 'Eb', 'F'][3 - build.length + j] ?? 'Eb'; });
  for (const b of g1) {
    if (b.sec === 'analysis') b.chord = ['Bb', 'Gm', 'Eb', 'F'][ia++ % 4];
    if (b.sec === 'arena') b.chord = ['Eb', 'F', 'Gm', 'Cm'][ir++ % 4];
  }
}
const lastAnalysis = g1.filter((b) => b.sec === 'analysis').at(-1);
const firstArena = g1.find((b) => b.sec !== 'analysis');
// сбивка в паузе между строфами: восьмые от конца строки 3 до шторки к арене
const FILL = [[2, 'Ab', 75], [2.5, 'Bb', 77], [3, 'Bb', 77], [3.5, 'Bb7', 80]];
const fillFrom = lastAnalysis ? FILL.filter(([x]) => lastAnalysis.t + x * lastAnalysis.beat >= E(3) - 0.05) : [];

for (const b of g1) {
  const at = (x) => b.t + x * b.beat, B = b.beat, ch = CH[b.chord], end = b.t + b.nb * B;
  const inFill = (x) => b === lastAnalysis && fillFrom.length && x >= fillFrom[0][0] - 1e-6;
  if (b.sec === 'analysis') {
    // лёгкий бит «предматчевого анализа»
    for (let x = 0; x < b.nb; x++) {
      if (x % 2 === 0) kick(at(x) + hum(0.002), 0.72);
      else if (!inFill(x)) snare(at(x) + hum(), 0.3, { tone: 0.4, dec: 0.06 });
      hat(at(x) + hum(), 0.2); if (!inFill(x + 0.5)) hat(at(x + 0.5) + hum(), 0.14);
    }
    for (const [x, iv, d, v] of [[0, 0, 0.9, 0.8], [1, 0, 0.4, 0.5], [1.5, 12, 0.4, 0.45], [2, 0, 0.9, 0.7], [3, 7, 0.4, 0.5], [3.5, 12, 0.4, 0.45]])
      if (x < b.nb && !inFill(x)) bass(at(x), d * B, ch.b + iv, v);
    stab(at(0), b.chord, 0.4 * B, 0.45);
    if (!inFill(2.5)) stab(at(2.5), b.chord, 0.3 * B, 0.36);
    if (b === lastAnalysis && fillFrom.length) {
      for (const [x, c, m] of fillFrom) {
        stab(at(x), c, 0.38 * B, 0.7, 72, 4); lead(at(x), m, 0.4 * B, 0.7, { vib: 0 });
        bass(at(x), 0.4 * B, CH[c].b + 12, 0.7);
      }
      for (let x = Math.max(3, fillFrom[0][0]); x < 4 - 1e-6; x += 0.25) snare(at(x) + hum(0.002), 0.3 + 0.35 * (x - 3), { dec: 0.09 });
      mark('stanza_fill', at(fillFrom[0][0]));
    }
  } else if (b.sec === 'arena') {
    const first = b === firstArena;
    if (first) {
      crash(at(0), 0.75); mark('arena_crash', at(0));
      if (fillFrom.length) lead(at(0), 79, 0.5 * B, 0.75, { vib: 0 });
    }
    for (let x = 0; x < b.nb; x++) {
      kick(at(x) + hum(0.002), x % 2 ? 0.45 : 0.8);
      if (x % 2) snare(at(x) + hum(), 0.5);
      hat(at(x) + hum(), 0.24); hat(at(x + 0.5) + hum(), x === 3 ? 0.22 : 0.16, x === 3);
    }
    for (const [x, iv, v] of [[0, 0, 0.75], [0.5, 0, 0.5], [1, 12, 0.6], [1.5, 0, 0.5], [2, 0, 0.7], [2.5, 0, 0.5], [3, 12, 0.6], [3.5, 7, 0.5]])
      if (x < b.nb) bass(at(x), 0.42 * B, ch.b + iv, v);
    stab(at(0), b.chord, 0.36 * B, first ? 0.7 : 0.45, first ? 74 : 70);
    for (const x of [1.5, 3]) if (x < b.nb) stab(at(x), b.chord, 0.26 * B, 0.38);
  } else {
    // нарастание: восьмые малого, потом дробь, крещендо меди и шумовой подъём; на красных огнях — «раз, два»
    const last = b === g1.at(-1);
    const stop = last && EV.red1 > b.t + 0.15 ? EV.red1 - 0.03 : end;
    if (!MARK.build) { mark('build', b.t); riser(b.t, EV.green, 0.55); }
    for (let x = 0; x < b.nb; x++) if (at(x) < stop - 0.05) kick(at(x) + hum(0.002), 0.82);
    if (!last) {
      for (let x = 0; x < b.nb; x += 0.5) snare(at(x) + hum(), 0.25 + 0.3 * x / b.nb, { dec: 0.1 });
      for (let x = 0; x < b.nb; x += 0.25) hat(at(x) + hum(), 0.12 + 0.12 * x / b.nb);
    } else roll(b.t, stop, 0.45, 0.85, B / 8);
    for (let x = 0; x < b.nb; x += 0.5) if (at(x) < stop - 0.05) bass(at(x), 0.42 * B, ch.b + ((x * 2) % 2 ? 12 : 0), 0.6 + 0.2 * x / b.nb);
    section(b.t, b.chord, stop - b.t - 0.02, last ? 0.75 : 0.6, last ? 72 : 70, 4, { swell: last ? [0.75, 1] : [0.3, 0.8, 1.5], att: 0.05 });
    if (last && EV.red1 > b.t) {
      for (const [t, top, f, v] of [[EV.red1, 69, 87.3, 0.72], [EV.red2, 72, 116.5, 0.8]]) {
        stab(t, 'F', 0.22, v, top, 4); bass(t, 0.2, 41, 0.8); tom(t, f, 0.7, { pan: 0.1 }); kick(t, 0.6);
      }
      mark('red_stabs', EV.red1);
    }
  }
}

// ---------- матч, повтор, видеопроверка (строки 7–11) ----------
const g2 = splitBars(EV.green, L(12));
const beats2 = g2.flatMap((b) => Array.from({ length: b.nb }, (_, k) => b.t + k * b.beat));
const varStart = beats2.find((t) => t >= E(10) + 0.05) ?? beats2.at(-1);
const repStart = (g2.find((b) => b.t >= EV.wipe3 - 0.3 && b.t < varStart) ?? { t: varStart }).t;
const tWh = Math.max(E(11) + 0.06, L(12) - 0.42); // финальный свисток — в паузе перед строкой 12
mark('go', EV.green); mark('replay', repStart); mark('var', varStart); mark('cut', L(12));
{
  let im = 0, ip = 0, prevRep = 'Gm';
  for (const b of g2) {
    const at = (x) => b.t + x * b.beat, B = b.beat, end = b.t + b.nb * B;
    if (b.t < repStart) {
      // «матч»: бочка на каждую долю, малый на 2 и 4, открытый хэт на слабых восьмых, бас октавами, стабы 3+3+2
      b.chord = ['Bb', 'Ab', 'Eb', 'F'][im++ % 4];
      const ch = CH[b.chord], first = b.t === EV.green, lastM = end > repStart - 1e-6;
      if (first) {
        crash(at(0), 0.9, 1.1); stab(at(0), 'Bb', 0.6 * B, 0.95, 74, 5); bass(at(0), 0.9 * B, 34, 0.9);
      }
      for (let x = 0; x < b.nb; x++) {
        kick(at(x) + hum(0.002), first && !x ? 0.95 : 0.85);
        if (x % 2 && !(lastM && x === 3)) snare(at(x) + hum(), 0.6);
        hat(at(x) + hum(), 0.2); hat(at(x + 0.5) + hum(), 0.25, true);
      }
      for (let x = first ? 1 : 0; x < b.nb; x += 0.5) bass(at(x), 0.42 * B, ch.b + ((x * 2) % 2 ? 12 : 0), (x * 2) % 2 ? 0.55 : 0.75);
      if (!first) stab(at(0), b.chord, 0.35 * B, 0.45);
      for (const x of [1.5, 3]) if (x < b.nb) stab(at(x), b.chord, 0.25 * B, 0.42);
      if (lastM && b.nb === 4) for (let x = 3; x < 4 - 1e-6; x += 0.25) snare(at(x) + hum(0.002), 0.35 + 0.3 * (x - 3), { dec: 0.09 });
    } else if (b.t < varStart) {
      // «ПОВТОР»: вполсилы, длинные аккорды, малый с большим хвостом (весь бас и медь потом — за фильтром)
      b.chord = varStart - b.t < 2 * B ? prevRep : ['Gm', 'Eb', 'Cm', 'Ab'][ip++ % 4];
      prevRep = b.chord;
      const ch = CH[b.chord], stop = Math.min(end, varStart);
      if (b.t === repStart) tom(at(0), 87.3, 0.8, { dec: 0.5, sendK: 0.4 });
      const ok = (x) => at(x) < stop - 0.05;
      if (ok(0)) kick(at(0), 0.9);
      if (ok(2.5)) kick(at(2.5), 0.45);
      if (ok(2)) snare(at(2), 0.62, { dec: 0.2, sendK: 0.55 });
      for (let x = 0; x < b.nb; x++) if (ok(x)) hat(at(x) + hum(), 0.14);
      for (const [x, iv, d, v] of [[0, 0, 1.9, 0.75], [2, 0, 1.4, 0.6], [3.5, 7, 0.45, 0.5]]) if (ok(x)) bass(at(x), Math.min(d * B, stop - at(x) - 0.03), ch.b + iv, v);
      section(b.t, b.chord, stop - b.t - 0.05, 0.42, 70, 4, { att: 0.09, sus: 0.85, dec: 0.4, bright: 2.2, sendK: 0.45, scoop: 0.1 });
    }
  }
}
// видеопроверка: «тик-так», тихие удары литавры, тревожный аккорд; на строке 12 — обрыв и «сдувшийся» спуск
const DEF = clamp(EV.w_nyne - L(12) - 0.1, 0.9, 1.6);
const deflate = (tAbs) => {
  if (tAbs <= L(12)) return 0;
  const u = clamp((tAbs - L(12)) / DEF, 0, 1);
  return -10 * u ** 1.6 + 0.45 * u * Math.sin(2 * Math.PI * 6.5 * (tAbs - L(12)));
};
{
  const ticks = beats2.filter((t) => t >= varStart - 1e-6 && t < tWh - 0.05);
  ticks.forEach((t, j) => {
    block(t + hum(0.002), j % 2 ? 1180 : 1560, 0.45, j % 2 ? -0.14 : 0.14);
    if (j % 2 === 0) timp(t, 38, 0.42 + 0.1 * j / ticks.length);
  });
  // тревога растёт: шестнадцатые хэта перед свистком
  for (let t = Math.max(varStart, tWh - 1.0); t < tWh - 0.03; t += g2[0].beat / 4) hat(t, 0.08 + 0.17 * (t - (tWh - 1.0)));
  const tsw = varStart + 0.55 * (L(12) - varStart), t0 = varStart - 0.04, dur = L(12) + DEF - t0;
  // крещендо до обрыва, на спуске — затихание
  const defAmp = (tA) => (tA < L(12) ? lerp(0.55, 1, clamp((tA - t0) / (L(12) - t0), 0, 1) ** 0.7) : 1 - 0.8 * smooth((tA - L(12)) / DEF));
  const susBend = (m) => (t) => (m === 67 ? -smooth((t0 + t - tsw) / 0.08) : 0) + deflate(t0 + t);
  for (const [m, pan] of [[69, 0.32], [67, -0.3], [62, 0.12], [57, -0.12]])
    voice(pd, t0, dur, m, { ...PAD, vel: 0.5, pan, bend: susBend(m), amp: (t) => defAmp(t0 + t), rel: 0.18 });
  // слабая «медь» поверх подушки — чтобы спуск звучал как сдувшийся оркестр
  for (const [m, pan] of [[66, 0.2], [62, -0.2]])
    voice(br, L(12) - 0.02, DEF, m, { ...BRASS, vel: 0.42, pan, gain: 0.3, att: 0.03, sus: 0.9, dec: 0.3, rel: 0.2, scoop: 0, bend: (t) => deflate(L(12) - 0.02 + t), swell: [1, 0.25, 1] });
  bass(varStart, L(12) + DEF - varStart, 38, 0.45, { bend: (t) => deflate(varStart + t), amp: (t) => defAmp(varStart + t) });
  // «бом» на итоговом табло
  const tb = EV.w_nyne - 0.1 + FRAME;
  bass(tb, 0.32, 34, 0.9); kick(tb, 0.55); voice(br, tb, 0.24, 46, { ...STAB, vel: 0.6, gain: 0.5, bright: 1.6 });
  voice(br, tb, 0.24, 53, { ...STAB, vel: 0.5, gain: 0.35, bright: 1.6 });
  mark('deflate', L(12)); mark('bom', tb);
}

// ---------- финал: сбивка и фанфара-отбивка ----------
const bO = clamp((TOTAL - EV.fin - 1.8) / 4, 0.36, 0.5);
{
  const at = (x) => EV.fin + x * bO;
  [[-1, 'sn', 0.45], [-0.75, 'sn', 0.55], [-0.5, 'hi', 0.62], [-0.25, 'lo', 0.72]].forEach(([x, k, v]) => {
    if (k === 'sn') snare(at(x), v); else tom(at(x), k === 'hi' ? 174.6 : 116.5, v, { pan: k === 'hi' ? -0.15 : 0.15 });
  });
  crash(at(0), 0.85); mark('fin_fanfare', at(0));
  for (let k = 0; k < 4; k++) {
    kick(at(k), k ? 0.82 : 0.95); if (k % 2) snare(at(k) + hum(), 0.62);
    hat(at(k) + hum(), 0.24); hat(at(k + 0.5) + hum(), 0.17);
  }
  const HARM = [[0, 'Bb'], [2, 'Ab'], [2.5, 'Eb'], [3, 'F']];
  const chAt = (x) => HARM.reduce((a, [b, c]) => (x >= b - 1e-6 ? c : a), 'Bb');
  const OUT = [[0, 77, 0.7], [0.75, 77, 0.22], [1, 82, 0.92], [2, 80, 0.45], [2.5, 79, 0.45], [3, 77, 0.45], [3.5, 81, 0.45]];
  for (const [x, m, d] of OUT) { lead(at(x), m, d * bO, x === 1 ? 0.85 : 0.75); section(at(x), chAt(x), d * bO, x ? 0.65 : 0.8, 72, 4); }
  for (let x = 0; x < 4; x += 0.5) bass(at(x), bO * 0.42, CH[chAt(x)].b + (x % 1 ? 12 : 0), x % 1 ? 0.55 : 0.75);
  // финальный аккорд: держится и гаснет к концу ролика
  const tf = at(4), hold = TOTAL - 0.35 - tf;
  kick(tf, 0.95); crash(tf, 0.9, 1.6); timp(tf, 34, 0.8, 0); snare(tf, 0.6);
  lead(tf, 82, hold, 0.85, { swell: [1, 0.45, 0.8], rel: 0.4 });
  section(tf, 'Bb', hold, 0.75, 77, 5, { swell: [1, 0.4, 0.8], rel: 0.4, sus: 0.8 });
  for (const m of [46, 53]) voice(br, tf, hold, m, { ...BRASS, vel: 0.65, gain: 0.4, bright: 2.2, swell: [1, 0.4, 0.8], rel: 0.4 });
  bass(tf, hold * 0.8, 34, 0.85);
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
const music = [0, 1].map((ch) => { const o = Float32Array.from(wet[ch]); for (const b of Object.values(BUS)) for (let i = 0; i < N; i++) o[i] += b[ch][i]; return o; });
// «ПОВТОР»: музыка уходит «за стекло» — ФНЧ закрывается на шторке и открывается к видеопроверке; низ чистим от 30 Гц
{
  const keys = [[repStart - 0.01, 19000], [repStart + 0.45, 1000], [varStart - 0.4, 1000], [varStart + 0.05, 19000]];
  const lf = (t) => (t <= keys[0][0] || t >= keys[3][0] ? 19000 : Math.exp(curve(keys.map(([a, v]) => [a, Math.log(v)]), t)));
  for (const ch of [0, 1]) {
    const F = svf(), hp = biquad('hp', 30, 0.7), x = music[ch];
    for (let i = 0; i < N; i++) { if ((i & 15) === 0) F.set(lf(i / SR), 0.75); x[i] = bq(hp, F.lp(x[i])); }
  }
}

// ---------- голос ----------
const rawV = execFileSync('ffmpeg', ['-v', 'error', '-i', path.join(POEM, 'voice.mp3'), '-f', 'f32le', '-ac', '1', '-ar', String(SR), '-'], { maxBuffer: 1 << 28 });
const voiceA = new Float32Array(rawV.length / 4);
for (let i = 0; i < voiceA.length; i++) voiceA[i] = rawV.readFloatLE(i * 4);
const speech = LINES.map((l) => [l.s, l.e]); // окна речи, секунды ролика

// ---------- громкость: K-взвешивание (BS.1770) ----------
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
const kv = kWeight(voiceA);
const voiceMS = 2 * msIn([kv], speech, -V0); // в ролике голос (моно) идёт в оба канала

// ---------- шумы ----------
const SFX = {}, SFXWIN = {};
const log = (k, v) => { (SFX[k] ??= []).push(r3(v)); };
// моно-буфер x ставится с t0, громкость — target дБ к голосу в окне [t0, t0 + win]; pan — число или функция времени
function place(t0, x, target, pan, win, key, sendK = 0.12) {
  const kx = kWeight(x), n = Math.min(x.length, Math.round(win * SR));
  let s = 0; for (let i = 0; i < n; i++) s += kx[i] * kx[i];
  const g = Math.sqrt(voiceMS * db(target) ** 2 / (s / n));
  const i0 = Math.round(t0 * SR);
  for (let i = 0; i < x.length; i++) {
    const [gl, gr] = panLR(typeof pan === 'function' ? pan(i / SR) : pan);
    put(sfx, i0 + i, x[i] * g, gl, gr, sendK, sfxSend);
  }
  (SFXWIN[key] ??= []).push([t0, t0 + win]);
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
// свисток с горошиной: тон ~3 кГц, горошина даёт быструю трель (ЧМ и АМ ~30 Гц), дыхание
function whistle(dur, f0 = 2950) {
  const n = Math.round(dur * SR), x = new Float32Array(n), br1 = svf(), hpb = biquad('hp', 1500, 0.7);
  br1.set(f0, 7);
  let ph = 0, pp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, rate = 29 + 4 * Math.sin(2 * Math.PI * 1.7 * t);
    pp += 2 * Math.PI * rate / SR;
    const pea = Math.sin(pp), f = f0 * (0.93 + 0.07 * smooth(t / 0.03)) * (1 + 0.035 * pea) * (1 - 0.05 * smooth((t - dur + 0.04) / 0.04));
    ph += 2 * Math.PI * f / SR;
    const env = smooth(t / 0.012) * smooth((dur - t) / 0.035) * (0.62 + 0.38 * (0.5 + 0.5 * pea));
    const w = wn();
    x[i] = env * (Math.sin(ph) + 0.1 * Math.sin(2 * ph) + 0.5 * br1.bp(w) + 0.04 * bq(hpb, w));
  }
  return x;
}
// всплеск: удар о воду, брызги, пузырьки с растущим тоном, капли
function splash(big) {
  const dur = big ? 0.95 : 0.7, n = Math.round(dur * SR), x = new Float32Array(n);
  const lpI = biquad('lp', 2400, 0.7), sp1 = biquad('hp', 1800, 0.7), sp2 = biquad('lp', 8000, 0.7);
  let tp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, w = wn();
    tp += 2 * Math.PI * (60 + 70 * Math.exp(-t / 0.02)) / SR;
    const impact = bq(lpI, w) * Math.exp(-t / (big ? 0.035 : 0.025)) * 1.4 + Math.sin(tp) * Math.exp(-t / 0.05) * (big ? 0.7 : 0.45);
    const spray = bq(sp2, bq(sp1, w)) * smooth(t / 0.01) * Math.exp(-t / (big ? 0.24 : 0.16)) * 0.8;
    x[i] = (impact + spray) * smooth((dur - t) / 0.05);
  }
  const bub = big ? 14 : 8;
  for (let k = 0; k < bub; k++) {
    const t0 = 0.02 + rnd() ** 1.5 * (big ? 0.55 : 0.4), f0 = 450 + rnd() * 1000, tau = 0.012 + rnd() * 0.035, a = 0.25 + 0.35 * rnd();
    let ph = 0;
    for (let i = Math.round(t0 * SR), j = 0; i < n && j < tau * 6 * SR; i++, j++) {
      const t = j / SR; ph += 2 * Math.PI * f0 * (1 + 1.6 * t / 0.05) / SR;
      x[i] += a * Math.sin(ph) * Math.exp(-t / tau) * smooth(t / 0.001);
    }
  }
  for (let k = 0; k < (big ? 10 : 6); k++) {
    const t0 = 0.12 + rnd() * (dur - 0.25), f0 = 1800 + rnd() * 2500;
    let ph = 0;
    for (let i = Math.round(t0 * SR), j = 0; i < n && j < 0.05 * SR; i++, j++) {
      const t = j / SR; ph += 2 * Math.PI * f0 * (1 + 3 * t / 0.05) / SR;
      x[i] += 0.12 * Math.sin(ph) * Math.exp(-t / 0.008) * smooth(t / 0.0008);
    }
  }
  return x;
}
// «бух» поклажи: мешок — мягко, сундук — деревом, бочонок — гулко
function thud(kind) {
  const dur = 0.35, n = Math.round(dur * SR), x = new Float32Array(n);
  const lp = biquad('lp', kind === 'sack' ? 380 : 900, 0.7), bp = biquad('bp', kind === 'sack' ? 1400 : 950, 1.2);
  const modes = { sack: [[72, 1, 0.07]], chest: [[128, 0.8, 0.09], [305, 0.45, 0.05], [520, 0.25, 0.03]], barrel: [[96, 0.7, 0.1], [212, 0.6, 0.14], [430, 0.3, 0.08]] }[kind];
  const ph = modes.map(() => 0);
  for (let i = 0; i < n; i++) {
    const t = i / SR, w = wn();
    let s = bq(lp, w) * Math.exp(-t / (kind === 'sack' ? 0.05 : 0.025)) * 1.2 + bq(bp, w) * Math.exp(-t / 0.02) * 0.25;
    modes.forEach(([f, a, tau], k) => { ph[k] += 2 * Math.PI * f * (1 + 0.15 * Math.exp(-t / 0.01)) / SR; s += a * Math.sin(ph[k]) * Math.exp(-t / tau); });
    x[i] = s * smooth(t / 0.002) * smooth((dur - t) / 0.04);
  }
  return x;
}

// шторки: четыре полосы пересекают кадр слева направо за ≈0,6 с, середина — wipeN + 0,3
['wipe1', 'wipe2', 'wipe3'].forEach((k, j) => {
  const pk = EV[k] + 0.3 + FRAME, dur = 0.66, p = 0.5;
  place(pk - p * dur, whoosh(dur, p, 420, 2600), SFX_DB.wipe[j], (t) => lerp(-0.8, 0.8, smooth(t / dur)), dur, 'whoosh_wipe', 0.15);
  log('whoosh_wipe', pk);
});
// карточки: пружина влёта (prog(w − 0,2, w + 0,9)) быстрее всего ≈ w − 0,11; Лебедь сверху (x 520), Рак слева, Щука справа
[['w_leb', () => scrPan(520)], ['w_rak', (t) => lerp(-0.75, 0, smooth(t / 0.2))], ['w_shch', (t) => lerp(0.8, scrPan(1400), smooth(t / 0.2))]].forEach(([k, pan]) => {
  const pk = EV[k] - 0.11 + FRAME, dur = 0.3, p = 0.55;
  place(pk - p * dur, whoosh(dur, p, 700, 3800), SFX_DB.card, pan, dur, 'whoosh_card', 0.1);
  log('whoosh_card', pk);
});
// поклажа: load = prog(t, w_pokl − 0,15, w_voz + 0,35), куски падают по очереди, «садятся» около половины своего отрезка
{
  const a = EV.w_pokl - 0.15, b = EV.w_voz + 0.35, TT = [[0, 0.45], [0.18, 0.62], [0.32, 0.76], [0.48, 0.95]];
  const kinds = ['chest', 'sack', 'barrel', 'sack'], pans = [scrPan(834 + 50), scrPan(834 - 150), scrPan(834 + 165), scrPan(834 - 70)];
  TT.forEach(([u0, u1], i) => {
    const tl = Math.max(a + (u0 + 0.47 * (u1 - u0)) * (b - a), EV.L5 - 0.3) + FRAME;
    place(tl - 0.002, thud(kinds[i]), SFX_DB.thud - (kinds[i] === 'sack' ? 1.5 : 0), pans[i], 0.15, 'thud_load', 0.08);
    log('thud_load', tl);
  });
}
// стартовый свисток — на зелёном огне
{
  const t0 = EV.green + FRAME - 0.012, dur = 0.22; // коротко: «Из» начинается через 0,1 с
  place(t0, whistle(dur, 2980), SFX_DB.whistle_start, 0.05, dur, 'whistle_start', 0.2);
  log('whistle_start', t0); log('whistle_start', t0 + dur);
}
// всплески: щука приземляется в пруд в конце прыжка (pIn = 1 на w_vpr − 0,05), ныряет на «в воду»
{
  const t1 = EV.w_vpr - 0.05 + FRAME, t2 = EV.w_vodu - 0.02 + FRAME;
  place(t1, splash(false), SFX_DB.splash[0], scrPan(1674), 0.4, 'splash', 0.15); log('splash', t1);
  place(t2, splash(true), SFX_DB.splash[1], scrPan(1220), 0.5, 'splash', 0.15); log('splash', t2);
}
// финальный свисток: в паузе перед строкой 12, кончается к её началу
{
  const dur = L(12) - 0.02 - tWh;
  place(tWh, whistle(dur, 2860), SFX_DB.whistle_final, 0.05, dur, 'whistle_final', 0.25);
  log('whistle_final', tWh); log('whistle_final', tWh + dur);
}
const sfxWet = reverb(sfxSend, 0.78, 0.35);
const sfxAll = [0, 1].map((ch) => { const o = new Float32Array(N); for (let i = 0; i < N; i++) o[i] = sfx[ch][i] + sfxWet[ch][i]; return o; });

// ---------- форма громкости ----------
// Уровень музыки задаётся целями (дБ к голосу, K-взвешенно): по строкам — около −19 (нарастание и «матч» чуть
// громче, видеопроверка и спуск чуть тише), заставка, пауза между строфами и фанфара финала — громче.
// Внутри строки громкость постоянна (динамика аранжировки сохраняется), переходы — в паузах между строками.
const kraw = music.map(kWeight);
const Lv = lufs(voiceMS);
const gainFor = (wins, target, lim = 12) => {
  const d = Lv + target - lufs(msIn(kraw, wins));
  return { g: db(d), d };
};
const LINE_DB = [-19.5, -19.5, -19.5, -19, -19, -17.5, -18, -18, -19.5, -19.5, -20, -20];
const lineG = speech.map((w, i) => gainFor([w], LINE_DB[i]).g);
// общий множитель так, чтобы в среднем по всем строкам вышло UNDER_DB
{
  let sm = 0; speech.forEach((w, i) => { sm += msIn(kraw, [w]) * lineG[i] ** 2 * (w[1] - w[0]); });
  const tot = speech.reduce((a, w) => a + w[1] - w[0], 0), k = Math.sqrt(voiceMS * db(UNDER_DB) ** 2 / (sm / tot));
  for (let i = 0; i < 12; i++) lineG[i] *= k;
}
const gIntro = gainFor([[tH, tG0 - 0.3]], INTRO_DB).g, gGap = gainFor([[E(3) + 0.2, L(4) - 0.26]], GAP_DB).g, gFin = gainFor([[EV.fin, EV.fin + 4 * bO]], FIN_DB).g;
const shape = [[0, 0], [0.012, gIntro], [tG0 - 0.32, gIntro], [tG0 + 0.02, lineG[0]]];
for (let i = 1; i <= 12; i++) {
  const g = lineG[i - 1];
  if (i === 7 && E(6) + 0.02 < EV.green - 0.03) {
    const gGo = Math.max(lineG[5], lineG[6]) * db(GO_DB);
    shape.push([E(6) + 0.02, lineG[5]], [EV.green - 0.03, gGo], [L(7) - 0.04, gGo], [L(7) + 0.12, g]);
  } else shape.push([L(i), g]);
  shape.push([E(i), g]);
  if (i === 3 && L(4) - E(3) > 0.6) shape.push([E(3) + 0.02, g], [E(3) + 0.2, gGap], [L(4) - 0.26, gGap], [L(4) - 0.02, lineG[3]]);
}
shape.push([E(12) + 0.1, lineG[11]], [EV.fin - 0.55, gFin], [TOTAL - 2.0, gFin], [TOTAL - 0.04, 0], [TOTAL, 0]);
for (let i = 1; i < shape.length; i++) if (shape[i][0] < shape[i - 1][0]) throw new Error(`форма громкости: ключи не по порядку на ${shape[i][0]}`);
const G = 1;
const shaped = [0, 1].map((ch) => { const o = new Float32Array(N); for (let i = 0; i < N; i++) o[i] = music[ch][i] * curve(shape, i / SR); return o; });
const kmus = shaped.map(kWeight);
const lineCorr = lineG.map((g) => 20 * Math.log10(g / lineG.reduce((a, b) => a + b, 0) * 12));

const out = [0, 1].map((ch) => { const o = new Float32Array(N); for (let i = 0; i < N; i++) o[i] = shaped[ch][i] * G + sfxAll[ch][i]; return o; });
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(out[0][i]), Math.abs(out[1][i]));
const limit = peak > 0.89 ? 0.89 / peak : 1;
if (limit < 1) console.warn(`пик ${peak.toFixed(3)} — всё ослаблено в ${limit.toFixed(3)} раза, музыка под голосом станет тише`);
// последние 30 мс — ровно ноль (после затухания), чтобы не было щелчка
for (let i = Math.max(0, N - Math.round(0.03 * SR)); i < N; i++) out[0][i] = out[1][i] = 0;

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
  note: 'секунды ролика. Шумы: whoosh_wipe, whoosh_card, thud_load, splash — пики; whistle_start и whistle_final — начало и конец свистка. music — ключевые моменты музыки (удары, разделы).',
  V0, OUTRO, total: TOTAL, ...SFX, music: MARK,
}, null, 1));

// ---------- отчёт ----------
const kOut = out.map((x) => kWeight(x.map((v) => v * limit)));
const kS = sfxAll.map(kWeight);
const f1 = (x) => x.toFixed(1);
const Lm = lufs(msIn(kmus, speech) * limit * limit);
const rel = (wins, k = kOut) => f1(lufs(msIn(k, wins)) - Lv);
console.log(`события: ${evSrc}; V0 ${V0}, OUTRO ${OUTRO}, длина ${TOTAL} с (${N} отсчётов)`);
console.log(`сетка: заставка ${(60 / bI).toFixed(1)} BPM; до старта ${(60 / g1[0].beat).toFixed(1)} BPM, такты ${g1.map((b) => `${b.chord}${b.nb < 4 ? '/' + b.nb : ''}@${b.t.toFixed(2)}(${b.sec[0]})`).join(' ')}`);
console.log(`       матч ${(60 / g2[0].beat).toFixed(1)} BPM, такты ${g2.map((b) => `${b.chord ?? 'D'}${b.nb < 4 ? '/' + b.nb : ''}@${b.t.toFixed(2)}`).join(' ')}; повтор ${repStart.toFixed(2)}, проверка ${varStart.toFixed(2)}, финал ${(60 / bO).toFixed(0)} BPM`);
console.log(`голос в местах речи ${f1(Lv)} LUFS (моно в оба канала); музыка там же ${f1(Lm)} LUFS (${f1(Lm - Lv)} дБ к голосу); музыка с шумами ${rel(speech)} дБ`);
console.log('по строкам (музыка с шумами, дБ к голосу):', speech.map((w, i) => `${i + 1}:${rel([w])}`).join(' '));
console.log('поправка уровня по строкам, дБ к среднему:', lineCorr.map((x) => f1(x)).join(' '));
console.log(`заставка ${rel([[0.3, tG0 - 0.3]])} дБ, пауза между строфами ${rel([[E(3) + 0.2, L(4) - 0.25]])} дБ, финал ${rel([[EV.fin, TOTAL - 2.0]])} дБ (K-взвешенно, к голосу)`);
console.log('шумы в своих окнах (дБ к голосу):', Object.entries(SFXWIN).map(([k, w]) => `${k} ${w.map((x) => rel([x], kS)).join('/')}`).join(', '));
{
  const kb = Object.fromEntries(Object.entries(BUS).map(([nm, b]) => [nm, b.map(kWeight)]));
  const bal = (wins) => Object.entries(kb).map(([nm, b]) => `${nm} ${f1(lufs(msIn(b, wins)))}`).filter((x) => !x.endsWith('Infinity')).join(', ');
  console.log(`баланс (сухо, LUFS до общего уровня):\n  заставка — ${bal([[0.45, tG0]])}\n  строки 1–5 — ${bal(speech.slice(0, 5))}\n  строки 7–8 — ${bal(speech.slice(6, 8))}\n  строки 9–12 — ${bal(speech.slice(8))}\n  финал — ${bal([[EV.fin, EV.fin + 2]])}`);
  const kw = wet.map(kWeight), km = music.map(kWeight);
  console.log(`реверберация: ${f1(lufs(msIn(kw, [[0, TOTAL]])) - lufs(msIn(km, [[0, TOTAL]])))} дБ к музыке`);
}
// голос + музыка 1:1, как в ролике
{
  let pk = 0;
  for (let i = 0; i < N; i++) {
    const j = i - Math.round(V0 * SR), v = j >= 0 && j < voiceA.length ? voiceA[j] : 0;
    pk = Math.max(pk, Math.abs(out[0][i] * limit + v), Math.abs(out[1][i] * limit + v));
  }
  console.log(`music.wav: пик ${(peak * limit).toFixed(4)} (${f1(20 * Math.log10(peak * limit))} dBFS), множитель ${limit.toFixed(3)}; голос + музыка: пик ${f1(20 * Math.log10(pk))} dBFS`);
}
console.log('шумы:', JSON.stringify(SFX));
console.log('музыка:', JSON.stringify(MARK));
