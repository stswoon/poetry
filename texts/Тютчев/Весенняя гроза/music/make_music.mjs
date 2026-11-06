// Музыка к «Весенней грозе» (Ф. И. Тютчев), стиль «Приключенческое аниме».
//
// Своя светлая пьеса в духе аниме-опенинга, 120 BPM, ре мажор, в последней строфе взлёт в ми мажор.
// Инструменты (синтез): фортепиано (аддитивное: неидеальные обертоны, две струны, демпфер), пиццикато
// струнных (два исполнителя с расстройкой), колокольчики (глокеншпиль: моды бруска), мягкий бас,
// струнная подушка (три пилы с ФНЧ), лёгкие барабаны и «тайко» на громе.
// Сетка: сильные доли — V0 − 3 + кадр, через 2 с (при V0 = 4,0: 1,03; 3,03; 5,03 …). Ход «королевский»
// (IV – V – iii – vi) и его родственники, гармония по полутакту.
//   0 … V0      заставка: подъём (дробь, пробег фортепиано, обратная тарелка), удар с тайко на молнии
//               (0,95 + 0,05 + кадр), тема в два такта (G – A → D), разрешение на облачной шторке;
//   под голосом ритм остаётся, мелодии нет: строфа 1 — тихий бит, бас, пиццикато, редкий колокольчик,
//               на «резвяся и играя» пиццикато скачет; пауза 1 — арпеджио A7 и дробь в удар;
//               строфа 2 — бит плотнее, тихие аккорды фортепиано; пауза 2 — кусок темы;
//               строфа 3 — пиццикато бежит шестнадцатыми («поток»), шейкер;
//               пауза 3 — взлёт: дробь, обратная тарелка, пробег B7, толчок на «и» четвёртой доли
//               (вспышка перед Олимпом) в ми мажор (A); строфа 4 — подушка, колокольчики;
//   финал       падение: томы сверху вниз, пиццикато вниз, толчок на приземлении; тема в ми мажоре
//               (A – B → E), светлый аккорд E(add9) и затухание до конца.
// Акценты под голосом (тайко на ударах молнии, колокольчики на «мячике», солнце, кубок, каскад вниз на
// «пролила») ставятся отдельно, каждый на свою громкость к голосу.
// Шумы — синтез, тихо, пик на кадр позже события: гром на заставке и на «гром», серия раскатов на
// строке 5, большой удар на «Всё» и раскат на «громам» (гром низкий, с плавной атакой), шорох дождя
// с «брызнул» до конца строки 8, журчание потока (строка 9, тише — на панели потока в строке 11),
// птичий щебет (строки 10–11), «вжух» взлёта сквозь тучи, вода из кубка на «пролила», всплеск на
// приземлении и ливень до fin + 1,6.
//
// Запуск: node make_music.mjs --intro 4.0 --outro 6.0   (по умолчанию 4.0 и 6.0; можно --intro=4 или
// позиционно: node make_music.mjs 4.0 6.0; --v0 — то же, что --intro)
// Читает ../timings.json, ../voice.mp3 (через ffmpeg) и events.json (пишет ../video/build.py), если он
// совпадает с таймингами; иначе времена событий считаются по timings.json так же, как в build.py.
// Пишет music.wav (44,1 кГц, 16 бит, стерео, длина intro + голос + outro) и sfx.json (времена шумов,
// акцентов и опорных моментов музыки). Без зависимостей: node и ffmpeg.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const POEM = path.dirname(HERE);
const SR = 44100, FRAME = 1 / 30;

// громкость относительно голоса (K-взвешенно, голос — средний по строкам, моно в оба канала)
const UNDER_DB = -19;                // музыка вместе с акцентами под голосом, в среднем по строкам
const LINE_DB = [-19.5, -19.5, -19.5, -19.5, -19, -19, -19, -19, -19, -19, -19, -18.5, -19, -19, -18.5, -18.5];
const INTRO_DB = -8, FIN_DB = -7, GAP_DB = -14, PUSH_DB = -10;

// ---------- аргументы ----------
const argv = process.argv.slice(2);
const named = {}, positional = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith('--')) {
    const eq = a.indexOf('=');
    if (eq > 0) named[a.slice(2, eq)] = a.slice(eq + 1);
    else named[a.slice(2)] = argv[++i];
  } else positional.push(a);
}
const num = (v, nm) => { const x = Number(v); if (!Number.isFinite(x)) throw new Error(`плохое значение ${nm}: ${v}`); return x; };
const V0 = num(named.intro ?? named.v0 ?? positional[0] ?? 4.0, 'intro');
const OUTRO = num(named.outro ?? positional[1] ?? 6.0, 'outro');
if (V0 < 3.8 || V0 > 6) throw new Error('нужно 3,8 ≤ intro ≤ 6 (заставка: подъём, удар молнии в 1,0 с и тема)');

// ---------- время ----------
const r3 = (x) => Math.round(x * 1000) / 1000;
const T = JSON.parse(fs.readFileSync(path.join(POEM, 'timings.json'), 'utf8'));
const VD = T.voiceDuration;
const TOTAL = r3(V0 + VD + OUTRO);
const N = Math.round(TOTAL * SR);
const LINES = T.lines.map((l) => ({ s: l.start + V0, e: l.end + V0, words: l.words }));
if (LINES.length !== 16) throw new Error(`ожидалось 16 строк, в timings.json ${LINES.length}`);

// события — так же, как в ../video/build.py
const norm = (s) => s.toLowerCase().replace(/ё/g, 'е').replace(/[^а-яa-z]/g, '');
function eventsFromTimings() {
  const ev = { V0 };
  LINES.forEach((l, i) => { ev[`L${i + 1}`] = r3(l.s); ev[`E${i + 1}`] = r3(l.e); });
  const W = {
    w_lyublyu: [1, 'Люблю'], w_grozu: [1, 'грозу'], w_grom: [2, 'гром'], w_rezv: [3, 'резвяся'], w_igr: [3, 'играя'],
    w_groh: [4, 'Грохочет'], w_neb: [4, 'небе'], w_gremyat: [5, 'Гремят'], w_rask: [5, 'раскаты'], w_molod: [5, 'молодые'],
    w_bryz: [6, 'брызнул'], w_pyl: [6, 'пыль'], w_perly: [7, 'перлы'], w_solnce: [8, 'солнце'], w_zolot: [8, 'золотит'],
    w_potok: [9, 'поток'], w_gam: [10, 'гам'], w_shum: [11, 'шум'], w_vse: [12, 'Всё'], w_veselo: [12, 'весело'],
    w_gromam: [12, 'громам'], w_geba: [13, 'Геба'], w_korm: [14, 'Кормя'], w_orla: [14, 'орла'], w_gromok: [15, 'Громокипящий'],
    w_kubok: [15, 'кубок'], w_smeyas: [16, 'Смеясь'], w_prol: [16, 'пролила'],
  };
  for (const [k, [n, w]] of Object.entries(W)) {
    const x = LINES[n - 1].words.find((q) => norm(q.text) === norm(w));
    if (!x) throw new Error(`нет слова «${w}» в строке ${n}`);
    ev[k] = r3(x.start + V0);
  }
  ev.fin = r3(ev.E16 + 1.7);
  return ev;
}
const EV = eventsFromTimings();
let evSrc = 'timings.json';
{
  const p = path.join(HERE, 'events.json');
  if (fs.existsSync(p)) {
    const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
    const shift = V0 - (raw.V0 ?? V0);
    if (Math.abs(raw.L1 + shift - EV.L1) < 0.02 && Math.abs(raw.E16 + shift - EV.E16) < 0.02) {
      for (const [k, v] of Object.entries(raw)) if (typeof v === 'number' && !['V0', 'OUTRO', 'total'].includes(k)) EV[k] = r3(v + shift);
      evSrc = shift ? `events.json со сдвигом ${shift > 0 ? '+' : ''}${shift.toFixed(2)} с` : 'events.json';
    } else console.warn('events.json не совпадает с timings.json — события считаю по timings.json');
  }
}
const L = (n) => EV[`L${n}`], E = (n) => EV[`E${n}`];
// моменты картинки (../video/src/main.js)
const FLASH0 = 0.95 + 0.05;                       // молния заставки: flashCurve(t, 0.95), пик через 0,05
const HIT = FLASH0 + FRAME;
const T_RISE = E(12) + 0.15, T_OLY = L(13) - 0.15, T_FALL = E(16) + 0.05, T_LAND = E(16) + 0.85;
const HOPS = [EV.w_rezv + 0.22, EV.w_igr - 0.02, EV.w_igr + 0.42, L(4) + 0.2]; // мячик-молния касается туч

// ---------- помощники ----------
let seed = 1828;
const rnd = () => {
  seed = (seed + 0x6d2b79f5) | 0;
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
const panLR = (p) => [Math.cos((clamp(p, -1, 1) + 1) * Math.PI / 4), Math.sin((clamp(p, -1, 1) + 1) * Math.PI / 4)];
const stereo = (n = N) => [new Float32Array(n), new Float32Array(n)];
const hum = (s = 0.003) => (rnd() - 0.5) * 2 * s;
const vh = (v, s = 0.06) => v * (1 + (rnd() - 0.5) * 2 * s);
function polyblep(t, dt) {
  if (t < dt) { t /= dt; return t + t - t * t - 1; }
  if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; }
  return 0;
}
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

// медленный шум с СКО ≈ 1 (для «перекатов» грома, журчания, зернистости воды)
const lpn = (fc) => { const f = svf(); f.set(fc, 0.7071); const k = Math.sqrt(SR / (0.74 * fc)); return () => f.lp(wn()) * k; };

// ---------- громкость: K-взвешивание (BS.1770) ----------
function kCoefs() {
  let K = Math.tan(Math.PI * 1681.974450955533 / SR), Q = 0.7071752369554196;
  const Vh = 10 ** (3.999843853973347 / 20), Vb = Vh ** 0.4996667741545416;
  let a0 = 1 + K / Q + K * K;
  const s = { b0: (Vh + Vb * K / Q + K * K) / a0, b1: 2 * (K * K - Vh) / a0, b2: (Vh - Vb * K / Q + K * K) / a0, a1: 2 * (K * K - 1) / a0, a2: (1 - K / Q + K * K) / a0 };
  K = Math.tan(Math.PI * 38.13547087602444 / SR); Q = 0.5003270373238773; a0 = 1 + K / Q + K * K;
  const h = { b0: 1, b1: -2, b2: 1, a1: 2 * (K * K - 1) / a0, a2: (1 - K / Q + K * K) / a0 };
  return [s, h];
}
const KC = kCoefs();
const kState = () => KC.map((c) => ({ ...c, x1: 0, x2: 0, y1: 0, y2: 0 }));
function kWeight(x, from = 0, to = x.length) {
  const [s, h] = kState(), y = new Float32Array(x.length);
  for (let i = from; i < to; i++) y[i] = bq(h, bq(s, x[i]));
  return y;
}
const lufs = (p) => -0.691 + 10 * Math.log10(p);

// ---------- голос ----------
const rawV = execFileSync('ffmpeg', ['-v', 'error', '-i', path.join(POEM, 'voice.mp3'), '-f', 'f32le', '-ac', '1', '-ar', String(SR), '-'], { maxBuffer: 1 << 28 });
const voiceA = new Float32Array(rawV.buffer, rawV.byteOffset, rawV.length / 4).slice();
const kv = kWeight(voiceA);
const speech = LINES.map((l) => [l.s, l.e]); // окна речи, секунды ролика
function voicePow(wins) {
  let s = 0, c = 0;
  for (const [a, b] of wins) for (let i = Math.max(0, Math.floor((a - V0) * SR)); i < Math.min(kv.length, (b - V0) * SR); i++) { s += kv[i] * kv[i]; c++; }
  return 2 * s / Math.max(1, c); // в ролике голос (моно) идёт в оба канала
}
const PV = voicePow(speech);
const LV = lufs(PV);
// голос читает строки по-разному громко (строки 7–8, 13, 16 заметно тише) — музыку, акценты и шумы под
// голосом меряем от громкости своей строки (не дальше −8…+3 дБ от среднего), вне строк — от среднего
const VLINE_RAW = speech.map((w) => 10 * Math.log10(voicePow([w]) / PV));
const VLINE = VLINE_RAW.map((x) => clamp(x, -8, 3));
function refPow(t) {
  for (let i = 0; i < 16; i++) if (t >= speech[i][0] - 0.25 && t <= speech[i][1] + 0.1) return PV * 10 ** (VLINE[i] / 10);
  return PV;
}

// ---------- шины ----------
const MS = stereo(); // посыл музыки на реверберацию
const bus = () => ({ d: stereo(), s: MS, track: false, lo: 0, hi: 0 });
const BUS = { барабаны: bus(), перкуссия: bus(), бас: bus(), пиццикато: bus(), фортепиано: bus(), колокольчики: bus(), подушка: bus(), тарелки: bus() };
const { барабаны: DR, перкуссия: PC, бас: BS, пиццикато: PZ, фортепиано: PN, колокольчики: BL, подушка: PD, тарелки: FX } = BUS;
// акценты под голосом: рендер во временную шину, громкость к голосу, затем в ACC (без формы громкости)
const ACC = stereo(), ACCS = stereo();
const TMP = { d: stereo(), s: stereo(), track: true, lo: N, hi: -1 };
function put(B, i, y, gl, gr, k) {
  if (i < 0 || i >= N) return;
  B.d[0][i] += y * gl; B.d[1][i] += y * gr;
  if (k) { B.s[0][i] += y * gl * k; B.s[1][i] += y * gr * k; }
  if (B.track) { if (i < B.lo) B.lo = i; if (i > B.hi) B.hi = i; }
}

// ---------- инструменты ----------
// фортепиано: обертоны с лёгкой негармоничностью, два этапа затухания, у нижних — две струны
function piano(B, t0, dur, m, vel = 0.5, pan = 0, sendK = 0.22) {
  const i0 = Math.round(t0 * SR); if (i0 >= N || i0 < 0) return;
  const f = hz(m), tau = 1.7 * (261.6 / f) ** 0.5, relT = 0.11;
  const hold = Math.min(dur, tau * 3.2);
  const len = Math.min(N - i0, Math.floor((hold + 6 * relT) * SR));
  if (len <= 0) return;
  const buf = new Float64Array(len), x = 0.13, bright = 1.6 - 0.8 * vel;
  for (let k = 1; k <= 12; k++) {
    const fk = f * k * Math.sqrt(1 + 0.0003 * k * k);
    if (fk > 9500) break;
    const a = k ** -bright * Math.abs(Math.sin(Math.PI * k * x)) / Math.sin(Math.PI * x);
    const df = Math.exp(-1 / (tau * 0.16 / Math.sqrt(k) * SR)), ds = Math.exp(-1 / (tau * 2.0 / (1 + 0.5 * (k - 1)) * SR));
    const w = 2 * Math.PI * fk / SR, cw = Math.cos(w), sw = Math.sin(w);
    const two = k <= 3, w2 = w * 1.00055, cw2 = Math.cos(w2), sw2 = Math.sin(w2);
    let c = 1, s = 0, c2 = 1, s2 = 0, ef = 0.5 * a, es = 0.5 * a;
    for (let i = 0; i < len; i++) {
      let v = s;
      if (two) { v = 0.5 * (s + s2); const q2 = c2 * cw2 - s2 * sw2; s2 = c2 * sw2 + s2 * cw2; c2 = q2; }
      buf[i] += v * (ef + es);
      const q = c * cw - s * sw; s = c * sw + s * cw; c = q;
      ef *= df; es *= ds;
    }
  }
  const att = Math.floor(0.004 * SR), ham = Math.floor(0.006 * SR), di = Math.floor(hold * SR), rd = Math.exp(-1 / (relT * SR));
  const g = 0.2 * vel, [gl, gr] = panLR(pan);
  let r = 1, lp = 0;
  for (let i = 0; i < len; i++) {
    if (i < ham) { lp += 0.3 * (wn() - lp); buf[i] += lp * 0.06 * vel * (1 - i / ham); }
    let e = i < att ? 0.5 - 0.5 * Math.cos(Math.PI * i / att) : 1;
    if (i >= di) { e *= r; r *= rd; }
    put(B, i0 + i, buf[i] * e * g, gl, gr, sendK);
  }
}
// пиццикато: щипок (обертоны гаснут тем быстрее, чем выше), два исполнителя с расстройкой, щелчок пальца
function pizz(B, t0, m, vel = 0.5, pan = 0, sendK = 0.16) {
  const i0 = Math.round(t0 * SR); if (i0 >= N || i0 < 0) return;
  const f0 = hz(m), tb = 0.3 * (196 / f0) ** 0.4;
  const len = Math.min(N - i0, Math.floor((tb * 5 + 0.02) * SR));
  const buf = new Float64Array(len);
  for (const [det, amp] of [[-0.004, 0.55], [0.0035, 0.45]]) {
    const f = f0 * (1 + det);
    for (let k = 1; k <= 10; k++) {
      const fk = f * k; if (fk > 8000) break;
      const d = Math.exp(-1 / ((tb / (1 + 0.85 * (k - 1))) * SR));
      const w = 2 * Math.PI * fk / SR, cw = Math.cos(w), sw = Math.sin(w);
      let c = 1, s = 0, e = Math.abs(Math.sin(Math.PI * k * 0.19)) / k ** 1.45 * amp;
      for (let i = 0; i < len; i++) { buf[i] += s * e; const q = c * cw - s * sw; s = c * sw + s * cw; c = q; e *= d; }
    }
  }
  const bp = biquad('bp', 2200, 1.2), ns = Math.min(len, Math.floor(0.012 * SR));
  for (let i = 0; i < ns; i++) buf[i] += bq(bp, wn()) * 0.35 * Math.exp(-i / (0.003 * SR));
  const g = 0.75 * vel, [gl, gr] = panLR(pan), att = Math.floor(0.0015 * SR), fe = Math.floor(0.01 * SR);
  for (let i = 0; i < len; i++) {
    const e = (i < att ? i / att : 1) * (i > len - fe ? (len - i) / fe : 1);
    put(B, i0 + i, buf[i] * e * g, gl, gr, sendK);
  }
}
// колокольчик (глокеншпиль): моды свободного бруска 1 : 2,76 : 5,40 : 8,93, удар молоточка
function bell(B, t0, m, vel = 0.4, pan = 0, sendK = 0.35) {
  const i0 = Math.round(t0 * SR); if (i0 >= N || i0 < 0) return;
  const f = hz(m), ts = (1318 / f) ** 0.3;
  const len = Math.min(N - i0, Math.floor(1.5 * ts * 4.5 * SR));
  const buf = new Float64Array(len);
  for (const [r, a, tau] of [[1, 1, 1.5], [2.756, 0.3, 0.42], [5.404, 0.12, 0.16], [8.933, 0.05, 0.07]]) {
    const fk = f * r; if (fk > 17000) continue;
    const d = Math.exp(-1 / (tau * ts * SR)), w = 2 * Math.PI * fk / SR, cw = Math.cos(w), sw = Math.sin(w);
    let c = 1, s = 0, e = a;
    for (let i = 0; i < len; i++) { buf[i] += s * e; const q = c * cw - s * sw; s = c * sw + s * cw; c = q; e *= d; }
  }
  const hp = biquad('hp', 5000, 0.7), nc = Math.min(len, Math.floor(0.004 * SR));
  for (let i = 0; i < nc; i++) buf[i] += bq(hp, wn()) * 0.25 * Math.exp(-i / (0.0012 * SR));
  const g = 0.18 * vel, [gl, gr] = panLR(pan), fe = Math.floor(0.02 * SR);
  for (let i = 0; i < len; i++) put(B, i0 + i, buf[i] * g * Math.min(1, i / 20) * (i > len - fe ? (len - i) / fe : 1), gl, gr, sendK);
}
// мягкий бас: синус с быстро гаснущими 2-й и 3-й гармониками, мягкое насыщение
function bass(B, t0, dur, m, vel = 0.8) {
  const i0 = Math.round(t0 * SR); if (i0 >= N || i0 < 0) return;
  const f = hz(m), rel = 0.06, len = Math.min(N - i0, Math.floor((dur + rel * 6) * SR)), di = Math.floor(dur * SR), rd = Math.exp(-1 / (rel * SR));
  let ph = 0, r = 1;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    ph += 2 * Math.PI * f / SR;
    let e = Math.min(1, i / (0.006 * SR)) * (0.62 + 0.38 * Math.exp(-t / 0.1)) * Math.exp(-t / 2.2);
    if (i >= di) { e *= r; r *= rd; }
    const s = Math.sin(ph) + 0.3 * Math.exp(-t / 0.22) * Math.sin(2 * ph) + 0.12 * Math.exp(-t / 0.1) * Math.sin(3 * ph);
    put(B, i0 + i, Math.tanh(1.3 * s * e) / Math.tanh(1.3) * vel * 0.26, 0.7071, 0.7071, 0.015);
  }
}
// струнная подушка: три пилы (PolyBLEP) с расстройкой и вибрато, ФНЧ, мягкая атака
function pad(B, t0, dur, m, vel = 0.4, pan = 0, { att = 0.3, rel = 0.6, cut = 2400, sendK = 0.45 } = {}) {
  const i0 = Math.max(0, Math.round(t0 * SR)); if (i0 >= N) return;
  const f = hz(m), len = Math.min(N - i0, Math.floor((dur + rel * 5) * SR)), di = Math.floor(dur * SR), rd = Math.exp(-1 / (rel * SR));
  const dets = [-0.0052, 0, 0.0047], ph = dets.map(() => rnd()), F1 = svf(), F2 = svf(), vp = rnd() * 6, [gl, gr] = panLR(pan);
  F1.set(cut, 0.6); F2.set(cut * 1.1, 0.6);
  let r = 1;
  for (let i = 0; i < len; i++) {
    const t = i / SR, vib = 1 + 0.0012 * Math.sin(2 * Math.PI * 5.1 * t + vp);
    let s = 0;
    for (let j = 0; j < 3; j++) { const dt = f * (1 + dets[j]) * vib / SR; ph[j] += dt; if (ph[j] >= 1) ph[j] -= 1; s += 2 * ph[j] - 1 - polyblep(ph[j], dt); }
    let e = t < att ? Math.sin(0.5 * Math.PI * t / att) ** 2 : 1;
    if (i >= di) { e *= r; r *= rd; }
    put(B, i0 + i, F2.lp(F1.lp(s)) * e * vel * 0.06, gl, gr, sendK);
  }
}

// ---------- барабаны ----------
function kick(B, t0, vel = 0.8) {
  const i0 = Math.round(t0 * SR), len = Math.round(0.36 * SR);
  let ph = 0, lp = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR, f = 47 + 105 * Math.exp(-t / 0.032) + 150 * Math.exp(-t / 0.004);
    ph += 2 * Math.PI * f / SR; lp += 0.25 * (wn() - lp);
    const body = Math.sin(ph) * Math.exp(-t / 0.15) * Math.min(1, t / 0.001) * Math.min(1, (0.36 - t) / 0.05);
    put(B, i0 + i, Math.tanh(1.6 * (body + lp * Math.exp(-t / 0.003) * 0.3)) / Math.tanh(1.6) * vel * 0.5, 0.7071, 0.7071, 0.02);
  }
}
const RIM = { dec: 0.06, tone: 1.6, sendK: 0.12 };
function snare(B, t0, vel = 0.5, { dec = 0.12, tone = 1, pan = 0.06, sendK = 0.2 } = {}) {
  const i0 = Math.round(t0 * SR), len = Math.round((dec * 6 + 0.02) * SR), [gl, gr] = panLR(pan);
  const hp = biquad('hp', 1100, 0.7), bp = biquad('bp', 4200, 0.7);
  let p1 = 0, p2 = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    p1 += 2 * Math.PI * (195 + 40 * Math.exp(-t / 0.01)) / SR; p2 += 2 * Math.PI * 345 / SR;
    const nz = bq(bp, bq(hp, wn())) * 2.0;
    const y = (tone * (0.5 * Math.sin(p1) * Math.exp(-t / 0.05) + 0.2 * Math.sin(p2) * Math.exp(-t / 0.03))
      + nz * Math.exp(-t / dec) * (1 + 1.2 * Math.exp(-t / 0.007))) * Math.min(1, t / 0.0008) * Math.min(1, (len / SR - t) / 0.01) * vel * 0.5;
    put(B, i0 + i, y, gl, gr, sendK);
  }
}
function hat(B, t0, vel = 0.2, open = false, pan = 0.28) {
  const i0 = Math.round(t0 * SR), dec = open ? 0.13 : 0.03, len = Math.round((dec * 7 + 0.01) * SR), [gl, gr] = panLR(pan);
  const h1 = biquad('hp', 7000, 0.7), h2 = biquad('hp', 7000, 0.7), b = biquad('bp', 10000, 0.9);
  for (let i = 0; i < len; i++) {
    const t = i / SR, x = bq(h2, bq(h1, wn()));
    put(B, i0 + i, (x + 0.6 * bq(b, x)) * Math.exp(-t / dec) * Math.min(1, t / 0.0006) * Math.min(1, (len / SR - t) / 0.008) * vel * 0.8, gl, gr, 0.06);
  }
}
function shaker(B, t0, vel = 0.08, pan = -0.32) {
  const i0 = Math.round(t0 * SR), len = Math.round(0.12 * SR), [gl, gr] = panLR(pan), bp = biquad('bp', 6500, 1.0);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    put(B, i0 + i, bq(bp, wn()) * Math.min(1, t / 0.008) * Math.exp(-Math.max(0, t - 0.008) / 0.03) * vel * 1.4, gl, gr, 0.08);
  }
}
function crash(B, t0, vel = 0.6, dec = 1.1, sendK = 0.25) {
  const i0 = Math.round(t0 * SR), len = Math.min(N - i0, Math.round(dec * 4.5 * SR));
  const f = [0, 1].map(() => [biquad('hp', 3500, 0.7), biquad('bp', 7000, 0.5), biquad('lp', 12500, 0.7)]);
  for (let i = 0; i < len; i++) {
    const t = i / SR, env = Math.exp(-t / dec) * (1 + 1.5 * Math.exp(-t / 0.03)) * Math.min(1, t / 0.0008) * Math.min(1, (len / SR - t) / 0.3) * vel * 0.13;
    for (const ch of [0, 1]) {
      const [h, b, l] = f[ch], x = bq(h, wn()), y = bq(l, x + 0.8 * bq(b, x)) * env, j = i0 + i;
      if (j >= 0 && j < N) { B.d[ch][j] += y; B.s[ch][j] += y * sendK; if (B.track) { B.lo = Math.min(B.lo, j); B.hi = Math.max(B.hi, j); } }
    }
  }
}
// обратная тарелка: шум нарастает к t1 и обрывается
function revCym(B, t1, dur = 0.8, vel = 0.5) {
  const i0 = Math.round((t1 - dur) * SR), len = Math.round(dur * SR);
  const f = [0, 1].map(() => [biquad('hp', 3000, 0.7), biquad('lp', 11000, 0.7)]);
  for (let i = 0; i < len; i++) {
    const u = i / len, env = u ** 2.6 * Math.min(1, (len - i) / (0.006 * SR)) * vel * 0.16;
    for (const ch of [0, 1]) {
      const j = i0 + i; if (j < 0 || j >= N) continue;
      const y = bq(f[ch][1], bq(f[ch][0], wn())) * env;
      B.d[ch][j] += y; B.s[ch][j] += y * 0.35;
    }
  }
}
// мембрана: тайко и томы — моды круглой мембраны, подъезд тона сверху, шлепок палочки
function membrane(B, t0, f, vel, { dec = 0.5, pan = 0, sendK = 0.25, slap = 0.5, glide = 0.3 } = {}) {
  const i0 = Math.round(t0 * SR); if (i0 >= N || i0 < 0) return;
  const len = Math.min(N - i0, Math.round(dec * 5 * SR)), [gl, gr] = panLR(pan), lp = biquad('lp', 1600, 0.7), hp = biquad('hp', 2500, 0.7);
  const modes = [[1, 1], [1.593, 0.32], [2.135, 0.16], [2.653, 0.08]], ph = modes.map(() => 0);
  for (let i = 0; i < len; i++) {
    const t = i / SR, gf = 1 + glide * Math.exp(-t / 0.025);
    let s = 0;
    modes.forEach(([r, a], k) => { ph[k] += 2 * Math.PI * f * r * gf / SR; s += a * Math.sin(ph[k]) * Math.exp(-t / (dec / (1 + 0.8 * k))); });
    const w = wn();
    s += slap * bq(lp, w) * Math.exp(-t / 0.018) + 0.2 * bq(hp, w) * Math.exp(-t / 0.0015);
    put(B, i0 + i, s * Math.min(1, t / 0.0015) * Math.min(1, (len / SR - t) / 0.05) * vel * 0.5, gl, gr, sendK);
  }
}
const taiko = (B, t0, vel = 0.8, f = 64, dec = 0.6, pan = 0) => membrane(B, t0, f, vel, { dec, pan, sendK: 0.3, slap: 0.6, glide: 0.35 });
const tom = (B, t0, f, vel = 0.5, pan = 0) => membrane(B, t0, f, vel, { dec: 0.22, pan, sendK: 0.18, slap: 0.35, glide: 0.25 });
function roll(B, t0, t1, v0, v1, step) {
  for (let t = t0, k = 0; t < t1 - 1e-6; t += step, k++) {
    const u = (t - t0) / Math.max(1e-6, t1 - t0);
    snare(B, t + hum(0.002), lerp(v0, v1, u * u) * (0.88 + 0.24 * rnd()) * (k % 2 ? 0.86 : 1), { dec: 0.07, sendK: 0.12 });
  }
}

// ---------- гармония ----------
const PCN = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const QUAL = { '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], maj7: [0, 4, 7, 11], sus4: [0, 5, 7], '7sus4': [0, 5, 7, 10], add9: [0, 4, 7, 14] };
function chord(name) {
  const mm = name.match(/^([A-G]#?)(.*)$/);
  if (!mm || !(mm[2] in QUAL)) throw new Error(`аккорд ${name}?`);
  return { name, root: PCN[mm[1]], iv: QUAL[mm[2]] };
}
const rootIn = (c, lo) => lo + (((c.root - lo) % 12) + 12) % 12;           // нижний корень не ниже lo
function voicing(c, lo, n) {                                                // n звуков аккорда вверх от корня
  const pcs = new Set(c.iv.map((x) => (c.root + x) % 12)), out = [];
  for (let m = rootIn(c, lo); out.length < n && m < 120; m++) if (pcs.has(m % 12)) out.push(m);
  return out;
}
const bassRoot = (c) => rootIn(c, 33);                                      // A1 … G#2

// ---------- форма ----------
const BEAT = 0.5, BAR = 2;
const G0 = V0 - 3 + FRAME;                    // при V0 = 4,0 — 1,033 (удар молнии заставки)
const bt = (k, b = 0) => G0 + k * BAR + b * BEAT;
// такты: [аккорд первого полутакта, второго, манера]
const PLAN = [
  ['G', 'A', 'intro'],          // 0: молния заставки, тема
  ['D', 'D', 'land'],           // 1: разрешение на облачной шторке, с V0 голос
  ['Bm', 'Bm', 'calm'],         // 2: строфа 1
  ['G', 'G', 'calm'],           // 3: «первый гром»
  ['A', 'A', 'play'],           // 4: «резвяся и играя» — мячик скачет
  ['D', 'A7', 'calm1'],         // 5: во второй половине — подхват в паузе 1
  ['G', 'A', 'drive'],          // 6: строфа 2, раскаты
  ['F#m', 'Bm', 'drive'],       // 7: дождик брызнул
  ['G', 'A', 'drive'],          // 8: перлы
  ['D', 'D', 'drive'],          // 9: солнце
  ['G', 'A', 'drive2'],         // 10: в паузе 2 — кусок темы
  ['D', 'D', 'flow'],           // 11: строфа 3, поток
  ['Bm', 'Bm', 'flow'],         // 12: птицы
  ['G', 'G', 'flow'],           // 13: гам и шум
  ['A', 'A', 'flow'],           // 14: «Всё вторит весело громам»
  ['Gmaj7', 'B7sus4', 'rise'],  // 15: взлёт: разгон на B7, толчок в ми мажор
  ['A', 'B', 'olymp'],          // 16: строфа 4, Олимп (ми мажор)
  ['G#m', 'C#m', 'olymp'],      // 17
  ['A', 'B', 'olymp'],          // 18
  ['E', 'E', 'olymp'],          // 19
  ['C#m', 'B', 'fall'],         // 20: «пролила», падение, толчок на приземлении
  ['A', 'B', 'finale'],         // 21: тема в ми мажоре
  ['E', 'E', 'end'],            // 22: финальный аккорд
];
const kMod = Math.round((T_OLY + FRAME + 0.25 - G0) / BAR);   // такт после толчка взлёта
const kHook = Math.round((T_LAND + FRAME + 0.25 - G0) / BAR); // такт темы финала
if (kMod !== 16 || kHook !== 21) throw new Error(`план тактов рассчитан на толчки в тактах 16 и 21, а по таймингам ${kMod} и ${kHook} — поправь PLAN`);
const PUSH1 = bt(kMod) - 0.25, PUSH2 = bt(kHook) - 0.25, T_END = bt(kHook + 1);
if (TOTAL - T_END < 1.8) throw new Error(`финальному аккорду (${T_END.toFixed(2)} с) нужно не меньше 1,8 с до конца — увеличь outro`);
for (const [nm, a, b] of [['взлёт', PUSH1, T_OLY + FRAME], ['приземление', PUSH2, T_LAND + FRAME]])
  if (Math.abs(a - b) > 0.08) console.warn(`толчок «${nm}» ${a.toFixed(3)} далеко от картинки ${b.toFixed(3)}`);
const MARK = {};
const mark = (k, v) => { MARK[k] = r3(v); };

// тема: F#5 E5 F#5 A5 B5 A5 F#5 (в финале на тон выше), фортепиано и колокольчики октавой выше
const HOOK = [[0, 0.75, 78], [0.75, 0.25, 76], [1, 0.5, 78], [1.5, 1, 81], [2.5, 0.5, 83], [3, 0.5, 81], [3.5, 2, 78]];
function hook(t, tr, landDur, vel = 0.72) {
  HOOK.forEach(([b, d, m], j) => {
    const last = j === HOOK.length - 1;
    piano(PN, t + b * BEAT + hum(0.002), last ? landDur : d * BEAT * 0.92, m + tr, vh(vel, 0.04), 0.12, 0.26);
    bell(BL, t + b * BEAT, m + tr + 12, last ? 0.42 : 0.34, -0.18, 0.3);
  });
}
// толчок: на «и» четвёртой доли перед тактом в ми мажоре (A add9) — удар, тарелка, бас, аккорд, подушка
function push(tp, key) {
  crash(FX, tp, 0.8, 1.4); kick(DR, tp, 0.9); taiko(PC, tp, 0.95, 56, 0.9);
  bass(BS, tp, 0.45, 33, 1); bass(BS, tp, 0.45, 45, 0.4);
  [45, 57, 64, 69, 71, 73, 76].forEach((m, j) => piano(PN, tp + j * 0.012, 1.0, m, 0.6, -0.2 + 0.07 * j));
  voicing(chord('Aadd9'), 52, 4).forEach((m, j) => pad(PD, tp, 2.25, m, 0.5, -0.3 + 0.2 * j, { att: 0.05, rel: 0.7 }));
  bell(BL, tp, 88, 0.45, 0.25); bell(BL, tp + 0.01, 93, 0.4, -0.25);
  mark(key, tp);
}

// подъём заставки: обратная тарелка, дробь, пробег фортепиано вверх в удар молнии
revCym(FX, G0, 0.9, 0.5);
roll(DR, G0 - 0.5, G0, 0.12, 0.5, BEAT / 4);
[57, 62, 64, 66, 69, 71].forEach((m, j) => piano(PN, G0 - 0.75 + j * 0.125, 0.14, m, 0.38 + 0.05 * j, -0.1));
crash(FX, HIT, 0.75, 1.4); taiko(PC, HIT, 1.0, 54, 0.9);
mark('intro_hit', HIT);

const BASSP = {
  intro: [[0, 0.5, 0, 1], [0.5, 0.5, 0, 0.55], [1, 0.5, 12, 0.7], [1.5, 0.5, 0, 0.65], [2, 0.5, 0, 0.95], [2.5, 0.5, 0, 0.55], [3, 0.5, 12, 0.7], [3.5, 0.5, 7, 0.6]],
  land: [[0, 2, 0, 1], [2, 1.5, 0, 0.75], [3.5, 0.5, 7, 0.5]],
  calm: [[0, 1.5, 0, 0.95], [1.5, 0.5, 0, 0.6], [2, 1.5, 0, 0.85], [3.5, 0.5, 7, 0.5]],
  play: [[0, 0.75, 0, 1], [0.75, 0.25, 12, 0.5], [1.5, 0.5, 0, 0.7], [2, 0.75, 0, 0.9], [2.75, 0.25, 12, 0.5], [3.5, 0.5, 7, 0.55]],
  drive: [[0, 0.5, 0, 1], [0.5, 0.5, 0, 0.5], [1, 0.5, 0, 0.7], [1.5, 0.5, 12, 0.6], [2, 0.5, 0, 0.9], [2.5, 0.5, 0, 0.5], [3, 0.5, 0, 0.7], [3.5, 0.5, 12, 0.6]],
  olymp: [[0, 1.5, 0, 0.9], [1.5, 0.5, 7, 0.5], [2, 1.5, 0, 0.85], [3.5, 0.5, 12, 0.5]],
};
Object.assign(BASSP, { calm1: BASSP.calm, drive2: BASSP.drive, flow: BASSP.drive, finale: BASSP.drive });
BASSP.rise = [...BASSP.drive.filter(([x]) => x < 2), [2, 0.5, 0, 0.6], [2.5, 0.5, 0, 0.7], [3, 0.5, 0, 0.8]];
BASSP.fall = BASSP.olymp.filter(([x]) => x < 2);
const PZP = { intro: [0, 2, 3, 1], land: [0, 2, 3, 4], calm: [0, 2, 3, 2], calm1: [0, 2, 3, 2], play: [0, 3, 1, 4], drive: [0, 2, 3, 4], drive2: [0, 2, 3, 4], rise: [0, 2, 3, 4], olymp: [0, 2, 3, 1], fall: [0, 2, 3, 1], finale: [0, 2, 3, 1] };

for (let k = 0; k < PLAN.length; k++) {
  const [na, nb, st] = PLAN[k], A = chord(na), Bc = chord(nb), t = bt(k);
  if (t >= TOTAL) break;
  const at = (x) => t + x * BEAT, ch = (x) => (x < 2 ? A : Bc);
  const pushed = k === kMod || k === kHook; // доля 1 сыграна заранее толчком

  // --- барабаны ---
  const H = (x, v, open = false) => hat(DR, at(x) + hum(0.002), vh(v), open);
  const K = (x, v) => kick(DR, at(x), vh(v, 0.04));
  const S = (x, v, o) => snare(DR, at(x) + hum(0.002), vh(v, 0.05), o);
  const hats8 = (v1, v2, upTo = 4) => { for (let x = 0; x < upTo - 1e-6; x += 0.5) H(x, x % 1 ? v2 : v1); };
  switch (st) {
    case 'intro':
      K(0, 0.9); K(1.5, 0.7); K(2, 0.85); S(1, 0.6); hats8(0.24, 0.15, 3);
      [240, 200, 165, 130].forEach((f, j) => tom(PC, at(3 + j * 0.25), f, 0.55 + 0.08 * j, -0.3 + 0.2 * j));
      break;
    case 'land': crash(FX, at(0), 0.6, 1.2); K(0, 0.85); K(2, 0.5); S(1, 0.32); S(3, 0.28); hats8(0.16, 0.1); mark('landing', at(0)); break;
    case 'calm': K(0, 0.6); K(2, 0.5); S(1, 0.26, RIM); S(3, 0.26, RIM); hats8(0.12, 0.07); break;
    case 'calm1': K(0, 0.6); K(2, 0.5); S(1, 0.26, RIM); hats8(0.12, 0.07, 3); roll(DR, at(3), at(4), 0.12, 0.5, BEAT / 4); break;
    case 'play': K(0, 0.6); K(1.5, 0.4); K(2, 0.5); S(1, 0.28, RIM); S(3, 0.28, RIM); hats8(0.12, 0.07); H(1.75, 0.06); H(3.75, 0.06); break;
    case 'drive': case 'flow':
      K(0, 0.7); K(1.5, 0.45); K(2, 0.62); S(1, 0.42); S(3, 0.42); hats8(0.15, 0.09); H(3.5, 0.12, true);
      if (st === 'flow') for (let x = 0; x < 4; x += 0.25) shaker(PC, at(x) + hum(0.003), x % 0.5 ? 0.05 : 0.08);
      if (k === 6) { crash(FX, at(0), 0.55, 1.1); mark('gap1_hit', at(0)); }
      if (k === 11) crash(FX, at(0), 0.4, 1.0);
      break;
    case 'drive2': K(0, 0.7); K(1.5, 0.45); K(2, 0.62); S(1, 0.42); hats8(0.15, 0.09, 3); S(3, 0.3); S(3.5, 0.45); break;
    case 'rise':
      K(0, 0.7); K(1.5, 0.45); S(1, 0.42); hats8(0.15, 0.09, 2); K(2, 0.55); K(3, 0.7);
      roll(DR, at(2), at(3), 0.12, 0.4, BEAT / 4); roll(DR, at(3), at(3.5), 0.4, 0.75, BEAT / 8);
      revCym(FX, at(3.5), 0.7, 0.55); mark('rise_start', at(2));
      break;
    case 'olymp': K(0, 0.55); K(2, 0.48); S(1, 0.32, { sendK: 0.3 }); S(3, 0.32, { sendK: 0.3 }); hats8(0.11, 0.06); break;
    case 'fall':
      K(0, 0.55); S(1, 0.32, { sendK: 0.3 }); hats8(0.11, 0.06, 2);
      [300, 250, 205, 170, 140, 115].forEach((f, j) => tom(PC, at(2 + j * 0.25), f, 0.45 + 0.07 * j, 0.4 - 0.16 * j));
      K(3, 0.6); revCym(FX, at(3.5), 0.6, 0.45); mark('fall_fill', at(2));
      break;
    case 'finale': K(0, 0.85); K(1.5, 0.6); K(2, 0.8); S(1, 0.6); hats8(0.22, 0.14, 3); [3, 3.25, 3.5, 3.75].forEach((x, j) => S(x, 0.5 + 0.07 * j)); break;
    case 'end': crash(FX, at(0), 0.7, 1.7); K(0, 0.85); taiko(PC, at(0), 0.8, 58, 1.0); mark('final_chord', at(0)); break;
  }
  if (st === 'rise') push(PUSH1, 'push_rise');
  if (st === 'fall') push(PUSH2, 'push_land');

  // --- бас ---
  if (st === 'end') { bass(BS, at(0), TOTAL - at(0) - 0.3, 28, 0.8); bass(BS, at(0), TOTAL - at(0) - 0.3, 40, 0.55); }
  else for (const [x, d, off, v] of BASSP[st]) {
    if (pushed && x === 0) continue;
    bass(BS, at(x), d * BEAT * 0.9, bassRoot(ch(x)) + off, v * 0.9);
  }

  // --- пиццикато ---
  if (st === 'flow') {
    for (let x = 0; x < 4 - 1e-6; x += 0.25) {
      const q = Math.round(x * 4) % 8, idx = [6, 5, 4, 3, 2, 1, 2, 3][q];
      pizz(PZ, at(x) + hum(0.003), voicing(ch(x), 55, 7)[idx], q === 0 ? 0.5 : q % 2 ? 0.3 : 0.38, q % 2 ? -0.4 : -0.15);
    }
  } else if (st === 'end') {
    [52, 59, 64, 68].forEach((m, j) => pizz(PZ, at(0) + j * 0.015, m, 0.5, -0.3 + 0.15 * j));
  } else {
    const hi = st === 'olymp' || st === 'fall' ? 67 : 55, upTo = st === 'rise' || st === 'fall' ? 2 : 4;
    for (let x = 0; x < upTo - 1e-6; x += 0.5) {
      const q = Math.round(x * 2) % 4, v = st === 'play' ? (q % 2 ? 0.42 : 0.55) : q === 0 ? 0.5 : 0.36;
      pizz(PZ, at(x) + hum(0.003), voicing(ch(x), hi, 7)[PZP[st][q]], st === 'olymp' ? v * 0.75 : v, q % 2 ? -0.4 : -0.15);
    }
    if (st === 'rise') [59, 63, 66, 69, 71, 75].forEach((m, j) => pizz(PZ, at(2 + j * 0.25), m, 0.4 + 0.05 * j, -0.3));
    if (st === 'fall') voicing(chord('B'), 67, 7).reverse().slice(0, 6).forEach((m, j) => pizz(PZ, at(2 + j * 0.25), m, 0.5 - 0.02 * j, 0.3 - 0.12 * j));
  }

  // --- фортепиано ---
  const comp = (xs, lo, n, d, v) => xs.forEach((x) => { if (pushed && x === 0) return; voicing(ch(x), lo, n).forEach((m, j) => piano(PN, at(x) + j * 0.006 + hum(0.002), d, m, vh(v), 0.18 + 0.05 * j)); });
  switch (st) {
    case 'intro': case 'finale':
      hook(t, st === 'finale' ? 2 : 0, st === 'finale' ? TOTAL - at(3.5) : 1.0);
      comp([0, 1.5, 2, 3.5], 48, 4, 0.4, 0.4);
      if (st === 'finale') mark('finale_theme', t);
      break;
    case 'land': [50, 57, 62, 66, 69].forEach((m, j) => piano(PN, at(0) + j * 0.03, 1.6, m, 0.45, -0.15 + 0.08 * j)); break;
    case 'calm1': [57, 61, 64, 67, 69, 73, 76, 79].forEach((m, j) => piano(PN, at(2 + j * 0.25), 0.2, m, 0.3 + 0.035 * j, -0.1 + 0.04 * j)); mark('gap1_fill', at(2)); break;
    case 'drive': case 'flow': comp([0, 1.5, 3], 67, 3, 0.3, 0.26); break;
    case 'drive2':
      comp([0, 1.5], 67, 3, 0.3, 0.26);
      [[2, 0.75, 76], [2.75, 0.25, 74], [3, 0.5, 76], [3.5, 0.5, 81]].forEach(([x, d, m]) => { piano(PN, at(x), d * BEAT * 0.92, m, 0.55, 0.12); bell(BL, at(x), m + 12, 0.22, -0.18); });
      mark('gap2_phrase', at(2));
      break;
    case 'rise': comp([0, 1.5], 67, 3, 0.3, 0.26); [59, 63, 66, 69, 71, 75].forEach((m, j) => piano(PN, at(2 + j * 0.125 * 2), 0.2, m, 0.4 + 0.05 * j, 0.1)); break;
    case 'olymp': comp([0, 2], 64, 4, 0.9, 0.24); break;
    case 'fall': comp([0], 64, 4, 0.9, 0.24); break;
    case 'end': [40, 47, 52, 56, 59, 64, 68, 71, 76].forEach((m, j) => piano(PN, at(0) + j * 0.035, TOTAL - at(0), m, 0.5, -0.3 + 0.07 * j)); break;
  }

  // --- колокольчики ---
  const B1 = (x, i, v) => { if (pushed && x === 0) return; bell(BL, at(x), voicing(ch(x), 84, 3)[i], v, 0.35); };
  switch (st) {
    case 'calm': B1(0, 1, 0.2); break;
    case 'calm1': B1(0, 1, 0.2); break;
    case 'drive': case 'drive2': case 'flow': B1(0, 1, 0.18); B1(2.5, 2, 0.14); break;
    case 'rise': B1(0, 1, 0.18); break;
    case 'olymp': [1, 0, 2, 1].forEach((i, x) => B1(x, i, 0.17)); break;
    case 'fall': B1(0, 1, 0.17); B1(1, 0, 0.17); break;
    case 'end': [88, 92, 95, 100].forEach((m, j) => bell(BL, at(j * 0.5), m, [0.42, 0.36, 0.32, 0.3][j], -0.3 + 0.2 * j)); break;
  }

  // --- подушка ---
  const P = (c, t0, d, v, o = {}) => voicing(c, 52, 4).forEach((m, j) => pad(PD, t0, d, m, v, -0.3 + 0.2 * j, o));
  switch (st) {
    case 'intro': P(A, at(0), 1.0, 0.5, { att: 0.12, rel: 0.5 }); P(Bc, at(2), 1.0, 0.5, { att: 0.12, rel: 0.5 }); break;
    case 'land': P(A, at(0), 1.3, 0.45, { att: 0.1, rel: 0.6 }); break;
    case 'rise': P(chord('B7sus4'), at(2), 0.38, 0.45, { att: 0.3 }); P(chord('B7'), at(2.75), 0.35, 0.55, { att: 0.1, rel: 0.15 }); break;
    case 'olymp': if (!pushed) P(A, at(0), 1.0, 0.32, { att: 0.25, rel: 0.7 }); P(Bc, at(2), 1.0, 0.32, { att: 0.25, rel: 0.7 }); break;
    case 'fall': P(A, at(0), 1.0, 0.3, { att: 0.25 }); P(Bc, at(2), 0.75, 0.45, { att: 0.5, rel: 0.15 }); break;
    case 'finale': P(Bc, at(2), 1.0, 0.5, { att: 0.12, rel: 0.5 }); break;
    case 'end': [52, 56, 59, 64, 66].forEach((m, j) => pad(PD, at(0), TOTAL - at(0) - 0.4, m, 0.5, -0.4 + 0.2 * j, { att: 0.08, rel: 1.2 })); break;
  }
}

// ---------- акценты под голосом (тайко на молниях, колокольчики) ----------
const ACCLOG = {}, ACCWIN = {};
function placeAcc(key, t, target, w1, fn) {
  TMP.lo = N; TMP.hi = -1;
  fn(TMP);
  if (TMP.hi < TMP.lo) return;
  const a = Math.max(TMP.lo, Math.floor(t * SR)), b = Math.min(TMP.hi + 1, Math.floor((t + w1) * SR));
  let p = 0;
  for (const ch of [0, 1]) {
    const [s, h] = kState(), x = TMP.d[ch];
    let sum = 0;
    for (let i = TMP.lo; i < b; i++) { const y = bq(h, bq(s, x[i])); if (i >= a) sum += y * y; }
    p += sum / Math.max(1, b - a);
  }
  const g = Math.sqrt(refPow(t) * db(target) ** 2 / p);
  for (const ch of [0, 1]) for (let i = TMP.lo; i <= TMP.hi; i++) {
    ACC[ch][i] += TMP.d[ch][i] * g; ACCS[ch][i] += TMP.s[ch][i] * g; TMP.d[ch][i] = 0; TMP.s[ch][i] = 0;
  }
  (ACCLOG[key] ??= []).push(r3(t)); (ACCWIN[key] ??= []).push([t, t + w1]);
}
// пик вспышки молнии: bolt.at + 0,05 (BOLTS в main.js), звук — на кадр позже
const TK = [
  ['taiko_grom', EV.w_grom - 0.03 + FRAME, 66, 0.6, -19],
  ['taiko_gremyat', EV.w_gremyat + FRAME, 74, 0.5, -22],
  ['taiko_rask', EV.w_rask + FRAME, 84, 0.45, -22.5],
  ['taiko_molod', EV.w_molod + FRAME, 62, 0.55, -21.5],
  ['taiko_vse', EV.w_vse - 0.03 + FRAME, 50, 1.1, -18.5],
  ['taiko_gromam', EV.w_gromam - 0.01 + FRAME, 68, 0.6, -20],
  ['taiko_gromok', EV.w_gromok + FRAME, 92, 0.35, -22],
];
for (const [key, t, f, dec, target] of TK) placeAcc(key, t, target, 0.6, (B) => {
  taiko(B, t, 1, f, dec, key === 'taiko_rask' ? 0.3 : key === 'taiko_gremyat' ? -0.3 : 0);
  if (key === 'taiko_vse') taiko(B, t + 0.015, 0.6, 76, 0.5, 0.15);
  if (key === 'taiko_gromok') taiko(B, t + 0.19, 0.7, 98, 0.3, 0.1);
});
// мячик-молния касается туч — колокольчик вверх по ступеням
HOPS.forEach((h, j) => placeAcc('bells_hops', h + FRAME, -23, 0.35, (B) => bell(B, h + FRAME, [86, 90, 93, 98][j], 1, [0.6, -0.1, -0.6, 0.2][j], 0.3)));
// солнце прорвалось — быстрый взлёт колокольчиков (D)
placeAcc('bells_sun', EV.w_solnce - 0.12 + FRAME, -22, 0.8, (B) => [86, 90, 93, 98, 102].forEach((m, j) => bell(B, EV.w_solnce - 0.12 + FRAME + j * 0.06, m, 1 - 0.08 * j, 0.5 - 0.15 * j, 0.4)));
// искры у кубка
placeAcc('bells_kubok', EV.w_kubok - 0.05 + FRAME, -24, 0.35, (B) => bell(B, EV.w_kubok - 0.05 + FRAME, 95, 1, -0.4, 0.4));
placeAcc('bells_kubok', EV.w_kubok + 0.1 + FRAME, -24, 0.35, (B) => bell(B, EV.w_kubok + 0.1 + FRAME, 100, 1, 0.4, 0.4));
// «пролила» — каскад колокольчиков вниз по пентатонике ми мажора, вместе с потоком из кубка
{
  const t0 = EV.w_prol + FRAME, notes = [100, 97, 95, 92, 90, 88, 85, 83, 80, 78, 76];
  placeAcc('bells_cascade', t0, -18, 1.0, (B) => notes.forEach((m, j) => bell(B, t0 + j * 0.085, m, 1 - 0.03 * j, 0.35 - 0.065 * j, 0.4)));
}

// ---------- шумы ----------
const SFX = stereo(), SFXS = stereo(), SFXLOG = {}, SFXWIN = {};
function placeSfx(key, t0, st, target, w0, w1, { bal = 0, send = 0, at = null, ref = null } = {}) {
  const gb = [bal > 0 ? 1 - bal : 1, bal < 0 ? 1 + bal : 1];
  const a = Math.max(0, Math.floor(w0 * SR)), b = Math.min(st[0].length, Math.floor(w1 * SR));
  let p = 0;
  for (const ch of [0, 1]) { const k = kWeight(st[ch], 0, b); let s = 0; for (let i = a; i < b; i++) s += k[i] * k[i]; p += gb[ch] ** 2 * s / Math.max(1, b - a); }
  const g = Math.sqrt((ref ?? refPow(at ?? t0)) * db(target) ** 2 / p), i0 = Math.round(t0 * SR);
  for (const ch of [0, 1]) for (let i = 0; i < st[ch].length; i++) {
    const j = i0 + i; if (j < 0 || j >= N) continue;
    const y = st[ch][i] * g * gb[ch];
    SFX[ch][j] += y; if (send) SFXS[ch][j] += y * send;
  }
  (SFXLOG[key] ??= []).push(r3(at ?? t0)); (SFXWIN[key] ??= []).push([t0 + w0, t0 + w1]);
}
// гром: бурый шум под ФНЧ, раскаты — несколько горбов огибающей, «перекаты» — медленная АМ;
// плавная атака (att), трескучий удар (crack) только на заставке, низкий «бум» (boom) на большом ударе
function thunder({ dur = 2.4, att = 0.12, crack = 0, lp = 260, boom = 0, rolls = 3 } = {}) {
  const n = Math.round(dur * SR), out = stereo(n);
  const bumps = [];
  for (let r = 0; r < rolls; r++) bumps.push([att + 0.2 + rnd() * dur * 0.45, 0.3 + 0.4 * rnd(), 0.2 + 0.35 * rnd()]);
  const F = [0, 1].map(() => [svf(), svf()]), hp = [biquad('hp', 28, 0.7), biquad('hp', 28, 0.7)];
  F.forEach(([a, b]) => { a.set(lp, 0.7); b.set(lp * 1.3, 0.6); });
  const am = lpn(7);
  const ck = [biquad('hp', 700, 0.7), biquad('lp', 4500, 0.7)];
  let bc = 0, bl = 0, br = 0, bp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    bc = 0.996 * bc + 0.05 * wn(); bl = 0.996 * bl + 0.05 * wn(); br = 0.996 * br + 0.05 * wn();
    let env = (t < att ? Math.sin(0.5 * Math.PI * t / att) ** 2 : Math.exp(-(t - att) / (dur * 0.28)));
    for (const [p, a, w] of bumps) env += a * Math.exp(-(((t - p) / w) ** 2)) * Math.exp(-(t - att) / dur);
    env *= Math.min(1, (dur - t) / 0.4) * Math.max(0.1, 1 + 0.45 * am());
    let c = 0;
    if (crack) {
      const ce = t < att ? 0 : Math.exp(-(t - att) / 0.09) * Math.min(1, (t - att) / 0.002);
      c = crack * bq(ck[1], bq(ck[0], wn())) * ce * (1 + 2 * (rnd() < 0.002 ? 1 : 0));
    }
    let bm = 0;
    if (boom) { bp += 2 * Math.PI * (36 + 26 * Math.exp(-t / 0.15)) / SR; bm = boom * Math.sin(bp) * (t < att ? (t / att) ** 2 : Math.exp(-(t - att) / 0.6)); }
    out[0][i] = bq(hp[0], F[0][1].lp(F[0][0].lp(0.7 * bc + 0.3 * bl))) * env + c + bm;
    out[1][i] = bq(hp[1], F[1][1].lp(F[1][0].lp(0.7 * bc + 0.3 * br))) * env + c + bm;
  }
  return out;
}
// дождь: шорох (шум 1–7 кГц с порывами) и капли (короткие тональные щелчки); heavy — гул ливня
function rain(dur, { fadeIn = 0.5, fadeOut = 0.6, rate = 60, heavy = 0, amp = null } = {}) { // amp(t) — множитель громкости во времени
  const n = Math.round(dur * SR), out = stereo(n);
  for (const ch of [0, 1]) {
    const hp = biquad('hp', 1200 - 500 * heavy, 0.7), lp = biquad('lp', 7000, 0.7), lo = biquad('bp', 700, 0.6), ph = rnd() * 6, ph2 = rnd() * 6;
    for (let i = 0; i < n; i++) {
      const t = i / SR, gust = 0.85 + 0.12 * Math.sin(2 * Math.PI * 0.31 * t + ph) + 0.07 * Math.sin(2 * Math.PI * 0.83 * t + ph2), w = wn();
      out[ch][i] = (bq(lp, bq(hp, w)) + heavy * 0.7 * bq(lo, w)) * gust * 0.5;
    }
  }
  for (let k = 0, cnt = Math.round(rate * dur); k < cnt; k++) {
    const t0 = rnd() * dur, f0 = 1800 + rnd() * 3500, tau = 0.002 + rnd() * 0.005, a = 0.3 + 0.7 * rnd(), [gl, gr] = panLR(rnd() * 1.8 - 0.9);
    let ph = 0;
    for (let i = Math.round(t0 * SR), j = 0; i < n && j < tau * 6 * SR; i++, j++) {
      const t = j / SR; ph += 2 * Math.PI * f0 * (1 - 0.3 * t / (tau * 6)) / SR;
      const y = a * Math.sin(ph) * Math.exp(-t / tau) * Math.min(1, t / 0.0004);
      out[0][i] += y * gl; out[1][i] += y * gr;
    }
  }
  for (let i = 0; i < n; i++) { const t = i / SR, e = smooth(t / fadeIn) * smooth((dur - t) / fadeOut) * (amp ? amp(t) : 1); out[0][i] *= e; out[1][i] *= e; }
  return out;
}
// журчание: шум двух полос с медленной АМ и пузырьки (тон растёт, быстро гаснет)
function brook(dur, { fadeIn = 0.35, fadeOut = 0.45, rate = 38 } = {}) {
  const n = Math.round(dur * SR), out = stereo(n);
  for (const ch of [0, 1]) {
    const b1 = biquad('bp', 700, 0.9), b2 = biquad('bp', 1600, 1.4), m = lpn(4);
    for (let i = 0; i < n; i++) { const w = wn(); out[ch][i] = (bq(b1, w) + 0.5 * bq(b2, w)) * Math.max(0.2, 0.75 + 0.3 * m()) * 0.35; }
  }
  for (let k = 0, cnt = Math.round(rate * dur); k < cnt; k++) {
    const t0 = rnd() * dur, f0 = 380 * (1300 / 380) ** rnd(), tau = 0.006 + 0.025 * rnd(), a = 0.25 + 0.5 * rnd(), [gl, gr] = panLR(rnd() * 1.6 - 0.8);
    let ph = 0;
    for (let i = Math.round(t0 * SR), j = 0; i < n && j < tau * 5 * SR; i++, j++) {
      const t = j / SR; ph += 2 * Math.PI * f0 * (1 + 8 * t) / SR;
      const y = a * Math.sin(ph) * Math.exp(-t / tau) * Math.min(1, t / 0.001);
      out[0][i] += y * gl; out[1][i] += y * gr;
    }
  }
  for (let i = 0; i < n; i++) { const t = i / SR, e = smooth(t / fadeIn) * smooth((dur - t) / fadeOut); out[0][i] *= e; out[1][i] *= e; }
  return out;
}
// птицы: серии «твить» вниз, трели (быстрая ЧМ), «фью-ить»; dens(t) — сколько птиц поёт
function birds(dur, dens) {
  const n = Math.round(dur * SR), out = stereo(n);
  const syl = (t0, d, f0, f1, a, pan) => {
    const [gl, gr] = panLR(pan); let ph = 0;
    for (let i = Math.round(t0 * SR), j = 0, m = Math.round(d * SR); j < m && i < n; i++, j++) {
      const u = j / m, f = f0 * (f1 / f0) ** u; ph += 2 * Math.PI * f / SR;
      const y = a * Math.sin(Math.PI * u) ** 1.5 * (Math.sin(ph) + 0.15 * Math.sin(2 * ph));
      out[0][i] += y * gl; out[1][i] += y * gr;
    }
  };
  const trill = (t0, d, fc, dev, rate, a, pan) => {
    const [gl, gr] = panLR(pan); let ph = 0;
    for (let i = Math.round(t0 * SR), j = 0, m = Math.round(d * SR); j < m && i < n; i++, j++) {
      const t = j / SR, f = fc + dev * Math.sin(2 * Math.PI * rate * t); ph += 2 * Math.PI * f / SR;
      const y = a * smooth(t / 0.02) * smooth((d - t) / 0.03) * (0.6 + 0.4 * Math.sin(2 * Math.PI * rate * t)) * Math.sin(ph);
      out[0][i] += y * gl; out[1][i] += y * gr;
    }
  };
  let t = 0.05;
  while (t < dur - 0.45) {
    const r = rnd(), pan = rnd() * 1.6 - 0.8, a = 0.4 + 0.6 * rnd(), base = 2600 + rnd() * 2400;
    if (r < 0.4) { const cnt = 3 + Math.floor(rnd() * 4), gap = 0.07 + 0.04 * rnd(), sl = 0.045 + 0.02 * rnd(); for (let j = 0; j < cnt; j++) syl(t + j * gap, sl, base * 1.35, base * 0.8, a * (1 - 0.08 * j), pan); }
    else if (r < 0.7) trill(t, 0.25 + 0.2 * rnd(), base, 600, 28 + 10 * rnd(), a * 0.7, pan);
    else { syl(t, 0.11, base * 0.8, base * 1.3, a, pan); syl(t + 0.13, 0.09, base * 1.2, base * 0.85, a * 0.8, pan); }
    t += (0.18 + rnd() * 0.5) / dens(t);
  }
  for (let i = 0; i < n; i++) { const tt = i / SR, e = smooth(tt / 0.25) * smooth((dur - tt) / 0.3); out[0][i] *= e; out[1][i] *= e; }
  return out;
}
// «вжух» взлёта: полосовой шум, центр уходит вверх к пику, огибающая — горб
function whoosh(dur, p, lo, hi) {
  const n = Math.round(dur * SR), out = stereo(n);
  for (const ch of [0, 1]) {
    const F = svf(), A = svf();
    for (let i = 0; i < n; i++) {
      const u = i / n, b = u < p ? smooth(u / p) : 1 - 0.3 * smooth((u - p) / (1 - p));
      if ((i & 15) === 0) { const fc = lo * (hi / lo) ** b; F.set(fc, 1.1); A.set(fc * 0.5, 0.7); }
      const env = u < p ? (u / p) ** 2.2 : smooth((1 - u) / (1 - p)) ** 1.4, w = wn();
      out[ch][i] = env * (F.bp(w) + 0.3 * A.lp(w));
    }
  }
  return out;
}
// вода из кубка: шум, полоса опускается (вода падает), зернистая АМ, капли; плавное нарастание
function pourWater(dur, tv) { // tv — конец голоса от начала: до него вода тише (не закрывает «пролила»)
  const n = Math.round(dur * SR), out = stereo(n);
  for (const ch of [0, 1]) {
    const F = svf(), m = lpn(30);
    for (let i = 0; i < n; i++) {
      const u = i / n;
      if ((i & 15) === 0) F.set(2600 * (900 / 2600) ** u, 0.8);
      const t = i / SR, env = smooth(t / 0.3) * (0.3 + 0.7 * smooth((t - tv) / 0.35)) * Math.min(1, (n - i) / (0.04 * SR));
      out[ch][i] = F.bp(wn()) * Math.max(0.15, 0.8 + 0.4 * m()) * env;
    }
  }
  for (let k = 0, cnt = Math.round(25 * dur); k < cnt; k++) {
    const t0 = 0.3 + rnd() * (dur - 0.35), f0 = 900 + rnd() * 1800, tau = 0.01 + 0.02 * rnd(), [gl, gr] = panLR(rnd() * 1.4 - 0.7);
    let ph = 0;
    for (let i = Math.round(t0 * SR), j = 0; i < n && j < tau * 5 * SR; i++, j++) {
      const t = j / SR; ph += 2 * Math.PI * f0 * (1 - 3 * t) / SR;
      const y = 0.3 * Math.sin(ph) * Math.exp(-t / tau) * Math.min(1, t / 0.001);
      out[0][i] += y * gl; out[1][i] += y * gr;
    }
  }
  return out;
}
// всплеск ливня на холме: удар (низкий шлепок), брызги, пузырьки, капли
function splash() {
  const dur = 1.2, n = Math.round(dur * SR), out = stereo(n);
  for (const ch of [0, 1]) {
    const lpI = biquad('lp', 2000, 0.7), sp1 = biquad('hp', 1500, 0.7), sp2 = biquad('lp', 8000, 0.7);
    let tp = 0;
    for (let i = 0; i < n; i++) {
      const t = i / SR, w = wn();
      tp += 2 * Math.PI * (55 + 60 * Math.exp(-t / 0.02)) / SR;
      const impact = bq(lpI, w) * Math.exp(-t / 0.05) * 1.3 + Math.sin(tp) * Math.exp(-t / 0.08) * 0.7;
      const spray = bq(sp2, bq(sp1, w)) * smooth(t / 0.015) * Math.exp(-t / 0.35) * 0.8;
      out[ch][i] = (impact + spray) * Math.min(1, t / 0.003) * smooth((dur - t) / 0.1);
    }
  }
  for (let k = 0; k < 20; k++) {
    const t0 = 0.02 + rnd() ** 1.5 * 0.7, f0 = 450 + rnd() * 1000, tau = 0.012 + rnd() * 0.035, a = 0.2 + 0.3 * rnd(), [gl, gr] = panLR(rnd() * 1.6 - 0.8);
    let ph = 0;
    for (let i = Math.round(t0 * SR), j = 0; i < n && j < tau * 6 * SR; i++, j++) {
      const t = j / SR; ph += 2 * Math.PI * f0 * (1 + 1.6 * t / 0.05) / SR;
      const y = a * Math.sin(ph) * Math.exp(-t / tau) * Math.min(1, t / 0.001);
      out[0][i] += y * gl; out[1][i] += y * gr;
    }
  }
  return out;
}

// гром на заставке: с треском (слов ещё нет)
{ const att = 0.03; placeSfx('thunder_intro', HIT - att, thunder({ dur: 3.0, att, crack: 0.5, lp: 600, rolls: 3 }), -9, 0, 1.5, { at: HIT }); }
// гром под голосом: низкий, атака 0,1–0,12 с, пик на кадр позже вспышки
for (const [key, pk, o, target] of [
  ['thunder_grom', EV.w_grom - 0.03 + FRAME, { dur: 2.4, att: 0.12, lp: 380, rolls: 3 }, -22],
  ['thunder_gremyat', EV.w_gremyat + FRAME, { dur: 1.8, att: 0.1, lp: 400, rolls: 2 }, -25],
  ['thunder_rask', EV.w_rask + FRAME, { dur: 1.7, att: 0.1, lp: 450, rolls: 2 }, -25.5],
  ['thunder_molod', EV.w_molod + FRAME, { dur: 2.0, att: 0.1, lp: 360, rolls: 2 }, -24.5],
  ['thunder_vse', EV.w_vse - 0.03 + FRAME, { dur: 2.6, att: 0.08, lp: 450, boom: 0.8, rolls: 3 }, -20.5],
  ['thunder_gromam', EV.w_gromam - 0.01 + FRAME, { dur: 2.0, att: 0.1, lp: 400, rolls: 2 }, -23],
]) placeSfx(key, pk - o.att, thunder(o), target, 0, o.att + 1.0, { at: pk, bal: key === 'thunder_rask' ? 0.3 : key === 'thunder_gremyat' ? -0.3 : 0 });
// дождь: с «брызнул» (rainAt: w_bryz − 0,15 … + 0,4) до конца строки 8
{
  const a = EV.w_bryz - 0.15 + FRAME, b = E(8) + 0.45, fi = 0.55, fo = 0.7;
  // строки 7–8 голос читает тише — дождь там тише на 5 дБ (на «солнце» струи золотые, дождь редеет)
  const dip = (t) => lerp(1, db(-5), smooth((t + a - L(7) + 0.3) / 0.5)), amp = (t) => dip(t);
  placeSfx('rain', a, rain(b - a, { fadeIn: fi, fadeOut: fo, rate: 45, amp }), -30, fi, b - a - fo, { at: a });
  SFXLOG.rain.push(r3(b));
}
// поток: строка 9 (сцена потока), тише — на панели горного потока в строке 11 («шум нагорный»)
{
  const a = L(9) - 0.35, b = E(9) + 0.35;
  placeSfx('brook', a, brook(b - a), -26, 0.35, b - a - 0.45, { at: a, ref: refPow(L(9)) }); SFXLOG.brook.push(r3(b));
  const a2 = EV.w_shum - 0.25 + FRAME, b2 = E(11) + 0.2;
  placeSfx('brook', a2, brook(b2 - a2, { fadeIn: 0.3, fadeOut: 0.4 }), -30, 0.3, b2 - a2 - 0.4, { at: a2, bal: 0.35 }); SFXLOG.brook.push(r3(b2));
}
// птицы: строки 10–11, гуще со взлёта стаи (flock: w_gam − 0,45)
{
  const a = L(10) - 0.1, b = E(11) + 0.1, fl = EV.w_gam - 0.45 + FRAME - a;
  placeSfx('birds', a, birds(b - a, (t) => (t < fl ? 1 : 2.2)), -26, 0, b - a, { at: a, send: 0.25 });
  SFXLOG.birds.push(r3(b));
}
// «вжух» взлёта сквозь тучи: T_RISE … L13, пик чуть раньше белой вспышки T_OLY
{
  const a = T_RISE + FRAME, b = L(13), pk = T_OLY - 0.2 + FRAME;
  placeSfx('whoosh_rise', a, whoosh(b - a, (pk - a) / (b - a), 260, 2800), -12, 0, b - a, { at: pk, send: 0.2 });
}
// вода из кубка: льётся с w_prol − 0,05 (pour) до приземления, нарастает плавно (не закрывает «пролила»)
{
  const a = EV.w_prol - 0.05 + FRAME, b = T_LAND + FRAME;
  placeSfx('pour', a, pourWater(b - a, E(16) - a), -17, 0, b - a, { at: a, ref: PV });
}
// всплеск на приземлении и ливень (rainAt: T_FALL − 0,05 … fin + 1,6, спад 1,4 с)
placeSfx('splash', T_LAND + FRAME, splash(), -11, 0, 0.5, { at: T_LAND + FRAME });
{
  const a = T_FALL - 0.05, b = Math.min(TOTAL - 0.1, EV.fin + 1.6);
  placeSfx('downpour', a, rain(b - a, { fadeIn: 0.3, fadeOut: 1.4, rate: 140, heavy: 1 }), -15, 0.3, b - a - 1.4, { at: a, ref: PV });
  SFXLOG.downpour.push(r3(b));
}

// ---------- реверберация ----------
function reverb(src, { room = 0.84, damp = 0.28, wet = 0.045, pre = 0.02 } = {}) {
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617], aps = [556, 441, 341, 225], P = Math.round(pre * SR);
  return [0, 1].map((ch) => {
    const cb = combs.map((d) => ({ b: new Float32Array(d + ch * 23), i: 0, f: 0 }));
    const ab = aps.map((d) => ({ b: new Float32Array(d + ch * 23), i: 0 }));
    const y = new Float32Array(N);
    for (let n = 0; n < N; n++) {
      const x = n >= P ? (src[0][n - P] + src[1][n - P]) * 0.5 : 0;
      let o = 0;
      for (const c of cb) { const v = c.b[c.i]; c.f = v * (1 - damp) + c.f * damp; c.b[c.i] = x + c.f * room; if (++c.i >= c.b.length) c.i = 0; o += v; }
      for (const a of ab) { const v = a.b[a.i]; a.b[a.i] = o + v * 0.5; if (++a.i >= a.b.length) a.i = 0; o = v - o; }
      y[n] = o * wet;
    }
    return y;
  });
}
const wetM = reverb(MS), wetA = reverb(ACCS), wetS = reverb(SFXS, { room: 0.7, damp: 0.4, wet: 0.04 });
const music = [0, 1].map((ch) => { const o = Float32Array.from(wetM[ch]); for (const b of Object.values(BUS)) { const x = b.d[ch]; for (let i = 0; i < N; i++) o[i] += x[i]; } return o; });
for (const ch of [0, 1]) for (let i = 0; i < N; i++) { ACC[ch][i] += wetA[ch][i]; SFX[ch][i] += wetS[ch][i]; }
// низ чистим от 30 Гц
for (const x of [...music, ...ACC, ...SFX]) { const hp = biquad('hp', 30, 0.7); for (let i = 0; i < N; i++) x[i] = bq(hp, x[i]); }

// ---------- форма громкости ----------
// цели по строкам (LINE_DB) задают постоянный уровень внутри строки, переходы — в паузах; общий множитель
// строк подбирается так, чтобы музыка вместе с акцентами в среднем по строкам была UNDER_DB к голосу.
const kM = music.map((x) => kWeight(x)), kA = ACC.map((x) => kWeight(x));
const prefix = (ks) => ks.map((k) => { const p = new Float64Array(N + 1); for (let i = 0; i < N; i++) p[i + 1] = p[i] + k[i] * k[i]; return p; });
const preM = prefix(kM);
const winPow = (pre, wins) => {
  let s = 0, c = 0;
  for (const [a, b] of wins) { const ia = clamp(Math.floor(a * SR), 0, N), ib = clamp(Math.floor(b * SR), 0, N); s += pre[0][ib] - pre[0][ia] + pre[1][ib] - pre[1][ia]; c += ib - ia; }
  return s / Math.max(1, c);
};
const gainFor = (wins, target) => Math.sqrt(PV * db(target) ** 2 / winPow(preM, wins));
const W_INTRO = [[G0, bt(1) + 0.45]], W_GAP1 = [[E(4) + 0.3, L(5) - 0.3]], W_GAP2 = [[E(8) + 0.28, L(9) - 0.3]];
const W_PUSH = [[PUSH1 - 0.35, PUSH1 + 0.1]], W_FIN = [[PUSH2 - 0.25, T_END + 1.0]];
const gI = gainFor(W_INTRO, INTRO_DB), gG1 = gainFor(W_GAP1, GAP_DB), gG2 = gainFor(W_GAP2, GAP_DB), gP = gainFor(W_PUSH, PUSH_DB), gF = gainFor(W_FIN, FIN_DB);
const lineG0 = speech.map((w, i) => gainFor([w], LINE_DB[i] + VLINE[i]));
function shapeKeys(lineG) {
  const K = [[0, 0], [0.012, gI], [bt(1) + 0.5, gI], [V0 - 0.03, lineG[0]]];
  for (let i = 1; i <= 16; i++) {
    const g = lineG[i - 1];
    if (i === 5) K.push([E(4) + 0.03, lineG[3]], [E(4) + 0.3, gG1], [L(5) - 0.3, gG1], [L(5) - 0.03, g], [L(5), g]);
    else if (i === 9) K.push([E(8) + 0.03, lineG[7]], [E(8) + 0.28, gG2], [L(9) - 0.3, gG2], [L(9) - 0.03, g], [L(9), g]);
    else if (i === 13) K.push([E(12) + 0.03, lineG[11]], [E(12) + 0.45, gG1], [PUSH1 + 0.015, gP], [L(13) + 0.11, g]);
    else K.push([L(i), g]);
    K.push([E(i), g]);
  }
  K.push([E(16) + 0.03, lineG[15]], [E(16) + 0.5, gF], [TOTAL - 1.9, gF], [TOTAL - 0.02, 0], [TOTAL, 0]);
  for (let i = 1; i < K.length; i++) if (K[i][0] < K[i - 1][0]) throw new Error(`форма громкости: ключи не по порядку на ${K[i][0]}`);
  return K;
}
function gainArray(keys) {
  const G = new Float32Array(N);
  let j = 0;
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    while (j < keys.length - 1 && t > keys[j + 1][0]) j++;
    if (t <= keys[0][0] || j >= keys.length - 1) { G[i] = keys[Math.min(j, keys.length - 1)][1]; continue; }
    const [a, va] = keys[j], [b, vb] = keys[j + 1];
    G[i] = va + (vb - va) * smooth((t - a) / Math.max(1e-6, b - a));
  }
  return G;
}
const shapedPow = (G, wins) => {
  let s = 0, c = 0;
  for (const [a, b] of wins) for (let i = Math.floor(a * SR); i < Math.min(N, b * SR); i++) { s += G[i] * G[i] * (kM[0][i] ** 2 + kM[1][i] ** 2); c++; }
  return s / Math.max(1, c);
};
const preA = prefix(kA);
const pAcc = winPow(preA, speech);
if (pAcc > PV * db(UNDER_DB) ** 2) throw new Error('акценты под голосом громче цели UNDER_DB — убавь их');
let lineG = lineG0.slice(), G = null;
for (let it = 0; it < 3; it++) {
  G = gainArray(shapeKeys(lineG));
  const k = Math.sqrt((PV * db(UNDER_DB) ** 2 - pAcc) / shapedPow(G, speech));
  lineG = lineG.map((g) => g * k);
}
G = gainArray(shapeKeys(lineG));

// ---------- сведение ----------
const out = [0, 1].map((ch) => { const o = new Float32Array(N); for (let i = 0; i < N; i++) o[i] = music[ch][i] * G[i] + ACC[ch][i] + SFX[ch][i]; return o; });
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(out[0][i]), Math.abs(out[1][i]));
const PEAK_MAX = db(-1.2);
const limit = peak > PEAK_MAX ? PEAK_MAX / peak : 1;
if (limit < 1) console.warn(`пик ${peak.toFixed(3)} — всё ослаблено в ${limit.toFixed(3)} раза, музыка под голосом станет тише`);
for (const o of out) for (let i = 0; i < N; i++) o[i] *= limit;
for (let i = Math.max(0, N - Math.round(0.02 * SR)); i < N; i++) out[0][i] = out[1][i] = 0; // хвост — ровно ноль

// ---------- запись ----------
const data = Buffer.alloc(44 + N * 4);
data.write('RIFF', 0); data.writeUInt32LE(36 + N * 4, 4); data.write('WAVE', 8); data.write('fmt ', 12);
data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(2, 22);
data.writeUInt32LE(SR, 24); data.writeUInt32LE(SR * 4, 28); data.writeUInt16LE(4, 32); data.writeUInt16LE(16, 34);
data.write('data', 36); data.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) for (const ch of [0, 1]) {
  const x = out[ch][i], v = x === 0 ? 0 : Math.round(x * 32767 + (rnd() - rnd()));
  data.writeInt16LE(clamp(v, -32768, 32767), 44 + i * 4 + ch * 2);
}
fs.writeFileSync(path.join(HERE, 'music.wav'), data);
fs.writeFileSync(path.join(HERE, 'sfx.json'), JSON.stringify({
  note: 'секунды ролика. sfx — шумы (гром: пик; rain/brook/birds/downpour: начало и конец; whoosh_rise: пик; pour: начало; splash: удар). accents — музыкальные акценты под голосом (тайко, колокольчики): начало. music — опорные моменты музыки.',
  V0, OUTRO, total: TOTAL, sfx: SFXLOG, accents: ACCLOG, music: MARK,
}, null, 1));

// ---------- отчёт ----------
const kO = out.map((x) => kWeight(x)), preO = prefix(kO);
const kMs = [0, 1].map((ch) => { const o = new Float32Array(N); for (let i = 0; i < N; i++) o[i] = kM[ch][i] * G[i] * limit; return o; });
const preMs = prefix(kMs);
const f1 = (x) => x.toFixed(1);
const rel = (pre, wins) => f1(lufs(winPow(pre, wins)) - LV);
console.log(`события: ${evSrc}; intro ${V0}, outro ${OUTRO}, длина ${TOTAL} с (${N} отсчётов, ${SR} Гц)`);
console.log(`сетка 120 BPM, сильные доли с ${G0.toFixed(3)}; толчки ${PUSH1.toFixed(3)} (вспышка ${(T_OLY + FRAME).toFixed(3)}), ${PUSH2.toFixed(3)} (приземление ${(T_LAND + FRAME).toFixed(3)}); финальный аккорд ${T_END.toFixed(3)}`);
console.log(`голос в местах речи ${f1(LV)} LUFS (моно в оба канала); строки к среднему, дБ: ${VLINE_RAW.map((x, i) => `${i + 1}:${f1(x)}`).join(' ')}`);
const relL = (pre, i) => f1(lufs(winPow(pre, [speech[i]])) - LV - VLINE[i]);
console.log(`под голосом (средн. по строкам, дБ к голосу): музыка ${rel(preMs, speech)}, + акценты ${f1(lufs(winPow(preMs, speech) + pAcc * limit * limit) - LV)}, всё вместе с шумами ${rel(preO, speech)}`);
console.log('по строкам, к голосу этой строки — всё вместе:', speech.map((w, i) => `${i + 1}:${relL(preO, i)}`).join(' '));
console.log('                              только музыка:', speech.map((w, i) => `${i + 1}:${relL(preMs, i)}`).join(' '));
console.log(`заставка ${rel(preO, W_INTRO)}, пауза 1 ${rel(preO, W_GAP1)}, пауза 2 ${rel(preO, W_GAP2)}, толчок взлёта ${rel(preO, W_PUSH)}, финал ${rel(preO, W_FIN)} дБ к голосу`);
const kS = SFX.map((x) => kWeight(x)), preS = prefix(kS);
console.log('                              акценты:', speech.map((w, i) => `${i + 1}:${relL(preA, i)}`).join(' '));
console.log('                              шумы:', speech.map((w, i) => `${i + 1}:${relL(preS, i)}`).join(' '));
{
  // баланс инструментов (сухо, с формой громкости, дБ к голосу)
  const bal = (wins) => Object.entries(BUS).map(([nm, b]) => {
    const kb = b.d.map((x) => kWeight(x)); let s = 0, c = 0;
    for (const [a1, b1] of wins) for (let i = Math.floor(a1 * SR); i < Math.min(N, b1 * SR); i++) { s += G[i] * G[i] * (kb[0][i] ** 2 + kb[1][i] ** 2); c++; }
    return `${nm} ${f1(lufs(s / c * limit * limit) - LV)}`;
  }).join(', ');
  console.log(`баланс под голосом: ${bal(speech)}\nбаланс заставки: ${bal(W_INTRO)}\nбаланс финала: ${bal(W_FIN)}`);
}
console.log('шумы в своих окнах (дБ к голосу):', Object.entries(SFXWIN).map(([k, w]) => `${k} ${w.map((x) => rel(preS, [x])).join('/')}`).join(', '));
console.log('акценты в своих окнах (дБ к голосу):', Object.entries(ACCWIN).map(([k, w]) => `${k} ${w.map((x) => f1(lufs(winPow(preA, [x]) * limit * limit) - LV)).join('/')}`).join(', '));
{
  let pk = 0;
  const off = Math.round(V0 * SR);
  for (let i = 0; i < N; i++) { const j = i - off, v = j >= 0 && j < voiceA.length ? voiceA[j] : 0; pk = Math.max(pk, Math.abs(out[0][i] + v), Math.abs(out[1][i] + v)); }
  let p2 = 0; for (let i = 0; i < N; i++) p2 = Math.max(p2, Math.abs(out[0][i]), Math.abs(out[1][i]));
  console.log(`music.wav: пик ${p2.toFixed(4)} (${f1(20 * Math.log10(p2))} dBFS), множитель ${limit.toFixed(3)}; голос + музыка 1:1 — пик ${f1(20 * Math.log10(pk))} dBFS`);
}
