// Музыка к «Ты, рябинушка…» (русская народная песня), стиль «Хохлома: рябина на золоте».
//
// Своя протяжная лирическая пьеса в 3/4, неспешно и с лёгким расширением к концу. Вопрос — ре дорийский
// (Dm – G – F – Am), в паузе перед ответом аккорд C уводит в фа мажор, ответ светлее (F – C – B♭),
// на «Солнцем вызрела» — ре мажор (светлый аккорд вместе с золотым солнцем), в финале плагальное
// G – Gm – D и затухание. По такту на строку, гармония меняется во вдохах между строками.
// Гусли — щипковый синтез Карплюса — Стронга (металлическая струна, щипок у края, корпус, струны звенят
// до смены аккорда), мягкая жалейка (язычковая дудка: нечётные обертоны, дыхание, «подъезды», форшлаги)
// на заставке и в финале, тихий бурдон ре–ля в вопросе и с «солнца» до конца. На заставке гусли
// «переливом» отвечают ягодкам ободка, которые распускаются следом за кистью (звук идёт по кругу блюда).
// Шумы только с причиной в кадре: шорох кисти по ободку на заставке, шорох кисти на «весной … Летом»
// (травка, росток, ствол), звон колокольчика на «цвела» (цветы) и на «Солнцем» (солнце), мягкий перелив
// блика лака по готовому блюду. Пик шума — на кадр позже события.
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
const UNDER_DB = -19;             // музыка под голосом относительно голоса (K-взвешенно, в местах речи)
const LOUD_DB = 8.5, GAP_DB = 4;  // заставка/финал и пауза между вопросом и ответом — громче на столько
const RIM = [0.25, 2.35];         // кисть обходит ободок (video/src/main.js), секунды ролика — от V0 не зависят
const PLATE_X = 575, RIM_R = 461; // центр блюда по x и радиус ободка в кадре 1920×1080 — для панорамы
const scrPan = (x) => Math.max(-0.75, Math.min(0.75, (x - 960) / 960 * 0.8));

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
if (V0 < 3 || OUTRO < 5) throw new Error('нужно V0 >= 3 и OUTRO >= 5');

const T = JSON.parse(fs.readFileSync(path.join(POEM, 'timings.json'), 'utf8'));
const VD = T.voiceDuration;
const TOTAL = Math.round((V0 + VD + OUTRO) * 1000) / 1000;
const N = Math.round(TOTAL * SR);
const LINES = T.lines.map((l) => ({ s: l.start + V0, e: l.end + V0, words: l.words.map((w) => ({ t: w.start + V0, text: w.text })) }));
if (LINES.length !== 8) throw new Error(`ожидалось 8 строк, в timings.json ${LINES.length}`);
const L = (n) => LINES[n - 1].s, E = (n) => LINES[n - 1].e;
const word = (n, w) => {
  const x = LINES[n - 1].words.find((q) => q.text.includes(w));
  if (!x) throw new Error(`нет слова «${w}» в строке ${n}`);
  return x.t;
};

// так же, как в ../video/build.py
function eventsFromTimings() {
  const r3 = (x) => Math.round(x * 1000) / 1000;
  const ev = {};
  for (let i = 1; i <= 8; i++) { ev[`L${i}`] = r3(L(i)); ev[`E${i}`] = r3(E(i)); }
  const W = {
    rja: [1, 'рябинушка'], ras: [2, 'Раскудрявая'], vz1: [3, 'взошла'], vy1: [4, 'выросла'],
    ves: [5, 'весной'], vz2: [5, 'взошла'], let: [6, 'Летом'], vy2: [6, 'выросла'],
    zor: [7, 'зорям'], cve: [7, 'цвела'], sol: [8, 'Солнцем'], vyz: [8, 'вызрела'],
  };
  for (const [k, [n, w]] of Object.entries(W)) ev[k] = r3(word(n, w));
  Object.assign(ev, {
    q_out: r3(L(5) - 0.75), q_oute: r3(L(5) - 0.35), a_in: r3(L(5) - 0.35),
    a_out: r3(E(8) + 0.9), a_oute: r3(E(8) + 1.35), fin: r3(E(8) + 1.35), glint: r3(E(8) + 0.5),
  });
  return ev;
}
let EV = eventsFromTimings(), evSrc = 'timings.json';
const evPath = path.join(HERE, 'events.json');
if (fs.existsSync(evPath)) {
  const raw = JSON.parse(fs.readFileSync(evPath, 'utf8'));
  const shift = V0 - (raw.V0 ?? V0);
  if (Math.abs(raw.L1 + shift - L(1)) < 0.02 && Math.abs(raw.E8 + shift - E(8)) < 0.02) {
    for (const [k, v] of Object.entries(raw)) if (typeof v === 'number' && !['V0', 'OUTRO', 'total'].includes(k)) EV[k] = v + shift;
    evSrc = shift ? `events.json со сдвигом ${shift > 0 ? '+' : ''}${shift.toFixed(2)} с` : 'events.json';
  } else console.warn('events.json не совпадает с timings.json — события считаю по timings.json');
}

// ---------- общие помощники ----------
let seed = 1611;
const rnd = () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const hz = (m) => 440 * 2 ** ((m - 69) / 12);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (u) => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
const prog = (t, a, b) => clamp((t - a) / Math.max(1e-6, b - a), 0, 1);
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
const stereo = () => [new Float32Array(N), new Float32Array(N)];

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
const band = (lo, hi) => { const f = [biquad('hp', lo, 0.7), biquad('hp', lo, 0.7), biquad('lp', hi, 0.7), biquad('lp', hi, 0.7)]; return (x) => bq(f[3], bq(f[2], bq(f[1], bq(f[0], x)))); };

const gus = stereo(), pipeB = stereo(), dr = stereo(); // гусли, жалейка, бурдон
const sfx = stereo();

// ---------- инструменты ----------
// Гусли: Карплюс — Стронг. Линия задержки длиной в период, в петле — двухточечный фильтр потерь
// (S меньше 0,5 — ярче, как металлическая струна) и фазовращатель для точной высоты. Затухание T60 —
// от 6 с в басу до ~1,2 с вверху. Щипок — форма оттянутой у края струны с долей шума, мягче при слабом
// щипке. После ring струну глушит ладонь.
const gPan = (m) => clamp(-0.45 + (m - 38) / 55 * 0.9, -0.5, 0.5); // басы слева, верха справа, как гусли на коленях
function gusli(t0, m, { vel = 0.4, ring = 2, pan, tone = 1 } = {}) {
  t0 = Math.max(0, t0);
  const i0 = Math.round(t0 * SR);
  if (i0 >= N) return;
  const f = hz(m), P = SR / f, S = 0.3;
  const Ni = Math.floor(P - S - 0.25), d = P - S - Ni, C = (1 - d) / (1 + d);
  const w0 = 2 * Math.PI * f / SR;
  const Hl = Math.sqrt((1 - S) ** 2 + S * S + 2 * S * (1 - S) * Math.cos(w0));
  const T60 = clamp(4.2 * (196 / f) ** 0.55, 1.2, 6);
  const g = Math.min(0.99999, 10 ** (-3 / (f * T60)) / Hl);
  const relT = 0.13, ringN = Math.max(0, Math.floor(ring * SR));
  const len = Math.min(N - i0, ringN + Math.floor(relT * 8 * SR), Math.floor(T60 * 1.2 * SR));
  // щипок: начальная форма струны — треугольник с вершиной у края (β = 0,14) и немного шума,
  // сглаженные по кругу однополюсным фильтром (щипок слабее или нота ниже — срез ниже, звук мягче)
  const buf = new Float64Array(Ni), beta = 0.14;
  const fc = clamp(f * (9 + 22 * vel * tone), 1300, 7500), a = 1 - Math.exp(-2 * Math.PI * fc / SR);
  let l1 = 0, l2 = 0;
  for (let i = 0; i < Ni; i++) {
    const u = i / Ni;
    l1 += a * (rnd() * 2 - 1 - l1); l2 += a * (l1 - l2);
    buf[i] = (u < beta ? u / beta : (1 - u) / (1 - beta)) + 0.9 * l2;
  }
  { let z = buf[Ni - 1]; for (let k = 0; k < 2; k++) for (let i = 0; i < Ni; i++) { z += a * (buf[i] - z); if (k) buf[i] = z; } }
  let mean = 0, pk = 1e-9;
  for (let i = 0; i < Ni; i++) mean += buf[i];
  mean /= Ni;
  for (let i = 0; i < Ni; i++) { buf[i] -= mean; pk = Math.max(pk, Math.abs(buf[i])); }
  const [gl, gr] = panLR(pan ?? gPan(m)), amp = 0.2 * vel / pk, rd = Math.exp(-1 / (relT * SR));
  let idx = 0, prev = 0, apx = 0, apy = 0, r = 1;
  for (let i = 0; i < len; i++) {
    const out = buf[idx];
    const l = (1 - S) * out + S * prev; prev = out;
    const y = C * l + apx - C * apy; apx = l; apy = y;
    buf[idx] = g * y; idx = idx + 1 === Ni ? 0 : idx + 1;
    let e = i < 90 ? i / 90 : 1;
    if (i >= ringN) { e *= r; r *= rd; }
    const v = out * e * amp;
    gus[0][i0 + i] += v * gl; gus[1][i0 + i] += v * gr;
  }
}

// Жалейка, мягко: одна легатная фраза. Нечётные обертоны сильнее (цилиндрическая трубка с язычком),
// яркость растёт с громкостью, дыхание в полосе 1,8–5,5 кГц и «чих» на атаке, подъезд снизу в начале фразы,
// глиссандо между нотами, вибрато входит не сразу. notes: [{t, d, m, gr}], gr — форшлаг сверху.
function pipe(notes, { gain = 0.06, pan = 0.22 } = {}) {
  const seq = [];
  for (const n of notes) {
    if (n.gr) { const g = Math.min(0.075, n.d * 0.3); seq.push({ t: n.t, d: g, m: n.gr, grace: true }); seq.push({ t: n.t + g, d: n.d - g, m: n.m, slur: true, t0: n.t }); }
    else seq.push({ ...n, t0: n.t });
  }
  const tA = seq[0].t, last = seq[seq.length - 1], tB = last.t + last.d, rel = 0.16;
  const i0 = Math.max(0, Math.round(tA * SR)), i1 = Math.min(N, Math.round((tB + rel * 7) * SR));
  const base = [1, 0.3, 0.55, 0.16, 0.3, 0.08, 0.15, 0.05, 0.07, 0.03];
  const nb = band(1800, 5500), [gl, gr] = panLR(pan);
  let k = 0, ph = 0, vph = rnd() * 6.28;
  for (let i = i0; i < i1; i++) {
    const t = i / SR;
    while (k + 1 < seq.length && t >= seq[k + 1].t) k++;
    const cur = seq[k], prv = seq[k - 1];
    let lf = Math.log2(hz(cur.m));
    if (prv) { const p = Math.log2(hz(prv.m)), gt = Math.abs(cur.m - prv.m) > 4 ? 0.07 : 0.04; lf = p + (lf - p) * smooth((t - cur.t) / gt); }
    lf -= 0.06 * (1 - smooth((t - tA) / 0.11));                       // подъезд к первой ноте
    const dt = t - cur.t0;
    vph += 2 * Math.PI * (5.1 + 0.4 * Math.sin(0.7 * t)) / SR;
    if (!cur.grace) lf += 0.0055 * smooth((dt - 0.22) / 0.4) * Math.sin(vph);
    ph += 2 * Math.PI * 2 ** lf / SR;
    let A = smooth((t - tA) / 0.09) * (t > tB ? Math.exp(-(t - tB) / rel) : 1);
    A *= 0.84 + 0.16 * Math.sin(Math.PI * clamp((t - tA) / (tB - tA), 0, 1));
    if (k > 0 && !cur.slur) A *= 1 - 0.2 * Math.exp(-(((t - cur.t) / 0.028) ** 2));
    if (!cur.grace && cur.d > 0.45) A *= 0.9 + 0.1 * Math.sin(Math.PI * clamp(dt / cur.d, 0, 1));
    const b = 0.45 + 0.3 * A, s1 = Math.sin(ph), c2 = 2 * Math.cos(ph);
    let sm = base[0] * s1, pa = 0, pb = s1, bp = b;
    for (let h = 1; h < base.length; h++) { const nx = c2 * pb - pa; sm += base[h] * bp * nx; bp *= b; pa = pb; pb = nx; }
    const chiff = Math.exp(-(t - tA) / 0.045) + (k > 0 && !cur.slur && !prv?.grace ? 0.5 * Math.exp(-(t - cur.t) / 0.025) : 0);
    const v = gain * A * (sm + nb(rnd() * 2 - 1) * (0.25 + 0.8 * chiff));
    pipeB[0][i] += v * gl; pipeB[1][i] += v * gr;
  }
}

// Бурдон: тихая тянущаяся нота (язычковый тембр, мягко срезан сверху), в каналах чуть разная частота — ширина.
function drone(t0, t1, m, { gain = 0.03, att = 1.2, rel = 1.0 } = {}) {
  const f = hz(m);
  const i0 = Math.max(0, Math.round(t0 * SR)), i1 = Math.min(N, Math.round((t1 + rel) * SR));
  const H = [];
  for (let k = 1; k <= 12 && f * k < 3500; k++) H.push((k % 2 ? 1 : 0.6) / k * Math.exp(-f * k / 1400));
  const ph0 = rnd() * 6.28;
  [-0.07, 0.07].forEach((det, ch) => {
    let ph = rnd() * 6.28;
    const w = 2 * Math.PI * (f + det) / SR;
    for (let i = i0; i < i1; i++) {
      const t = i / SR;
      ph += w;
      const s1 = Math.sin(ph), c2 = 2 * Math.cos(ph);
      let pa = 0, pb = s1, sm = H[0] * s1;
      for (let k = 1; k < H.length; k++) { const nx = c2 * pb - pa; sm += H[k] * nx; pa = pb; pb = nx; }
      const e = smooth((t - t0) / att) * (t > t1 ? smooth(1 - (t - t1) / rel) : 1) * (1 + 0.07 * Math.sin(2 * Math.PI * 0.13 * t + ph0 + ch));
      dr[ch][i] += sm * e * gain;
    }
  });
}

// ---------- партитура ----------
// голоса аккордов: [бас, затем струны перебора снизу вверх]
const CH = {
  Dm: [50, 57, 62, 65, 69], C: [48, 55, 60, 64, 67], Am: [45, 52, 57, 60, 64], G: [43, 50, 55, 59, 62],
  F: [41, 48, 53, 57, 60], Bb: [46, 53, 58, 62, 65], D: [50, 57, 62, 66, 69], Gm: [43, 50, 55, 58, 62],
  Dend: [38, 45, 50, 57, 62, 66, 69],
};
const chordTones = (chord, lo, n) => {
  const pcs = new Set(CH[chord].map((m) => m % 12)), out = [];
  for (let m = lo; out.length < n; m++) if (pcs.has(m % 12)) out.push(m);
  return out;
};
// такт: {t, len, beats, beat, chord, sec, mel: [[доля, нота, длительность в долях]], pat}
const bars = [];
const bar = (t, len, chord, sec, mel = [], pat = 'arp', beats = 3) => bars.push({ t, len, beats, beat: len / beats, chord, sec, mel, pat });
const barAt = (t) => bars.reduce((acc, b) => (t >= b.t - 1e-6 ? b : acc), bars[0]);

// заставка: три такта (Dm – C – Am, при длинной заставке перед ними ещё Dm/G); пока кисть обходит ободок,
// гусли вместо перебора играют перелив по ягодкам
const s1 = Math.min(V0, L(1) - 0.1);
const nI = Math.max(3, Math.round(s1 / 1.75)), dI = s1 / nI;
const INTRO = [...Array(nI - 3).fill(0).map((_, i) => (i % 2 ? 'G' : 'Dm')), 'Dm', 'C', 'Am']; // фраза жалейки — на последних трёх
INTRO.forEach((ch, i) => bar(i * dI, dI, ch, 'intro', [], i * dI < RIM[1] ? 'bass' : 'arp'));
// вопрос: «Ты, рябинушка» / «Раскудрявая» / «Ты когда взошла» / «Когда выросла?» — такт на строку,
// последний такт шире (вопрос повисает), на его третьей доле — C в паузе, и перелив вверх к фа мажору
const qEnd = L(4) - 0.1, dq = (qEnd - s1) / 3;
bar(s1, dq, 'Dm', 'q', [[0, 77, 2], [2, 76, 1]], 'q');
bar(s1 + dq, dq, 'G', 'q', [[0, 74, 2], [2, 71, 1]], 'q');
bar(s1 + 2 * dq, dq, 'F', 'q', [[0, 72, 1.5], [1.5, 69, 1.5]], 'q');
const aStart = L(5) - 0.3;
const cAt = Math.max(E(4) + 0.15, qEnd + (aStart - qEnd) * 2 / 3);
bar(qEnd, cAt - qEnd, 'Am', 'q', [[0, 72, 1], [1, 76, 1]], 'arp2', 2);
bar(cAt, aStart - cAt, 'C', 'gap', [[0, 67, 1.15], [0.25, 72, 0.9], [0.5, 76, 0.65], [0.75, 79, 0.4]], 'bass', 1);
// ответ: «Я весной взошла» F / «Летом выросла» C / «По зорям цвела» B♭ / «Солнцем вызрела» D
const a4 = L(8) - 0.1, da = (a4 - aStart) / 3;
bar(aStart, da, 'F', 'a', [[0, 81, 2], [2, 79, 1]], 'a');
bar(aStart + da, da, 'C', 'a', [[0, 76, 1.5], [1.5, 79, 1.5]], 'a');
bar(aStart + 2 * da, da, 'Bb', 'a', [[0, 77, 2], [2, 74, 1]], 'a');
const o1 = Math.max(E(8) + 0.35, a4 + da);
bar(a4, o1 - a4, 'D', 'sun', [[0, 78, 1.5], [1.5, 81, 1.5]], 'strum');
// финал: G – Gm – D, такты чуть шире; последний аккорд звенит до конца
let w1 = da * 1.04, w2 = da * 1.1;
const room = TOTAL - 3.6 - o1;
if (w1 + w2 > room) { const k = room / (w1 + w2); w1 *= k; w2 *= k; }
const o2 = o1 + w1, o3 = o2 + w2;
bar(o1, w1, 'G', 'out', [], 'arp');
bar(o2, w2, 'Gm', 'out', [], 'arp');
bar(o3, TOTAL - o3, 'Dend', 'fin', [], 'final');

const MEL_VEL = { q: 0.44, gap: 0.4, a: 0.48, sun: 0.54 };
const PAT = { arp: [0, 1, 2, 3, 4, 2], q: [0, 1, 2, 3, 4, 2], a: [0, 2, 3, 4, 3, 2], arp2: [0, 1, 2, 3] };
const plucks = (b, list, from = 0) => {
  const v = CH[b.chord], e8 = b.beat / 2, end = b.t + b.len;
  list.forEach((idx, jj) => {
    const j = jj + from, t = b.t + j * e8 + (j ? (rnd() - 0.5) * 0.014 : 0.003);
    const again = list.indexOf(idx, jj + 1); // та же струна ещё раз в такте — до неё и звенит
    const ring = again >= 0 ? b.t + (again + from) * e8 - t + 0.01 : end + 0.12 - t;
    gusli(t, v[idx], { vel: j === 0 ? 0.55 : j % 2 === 0 ? 0.38 : 0.32 + 0.04 * rnd(), ring });
  });
};
for (const b of bars) {
  const v = CH[b.chord], end = b.t + b.len;
  if (b.pat === 'bass') gusli(b.t + 0.004, v[0], { vel: 0.55, ring: end + 0.12 - b.t });
  else if (b.pat === 'strum') {
    v.forEach((m, j) => gusli(b.t + 0.004 + j * 0.032, m, { vel: 0.52 - 0.03 * j, ring: end + 0.12 - b.t - j * 0.032 }));
    plucks(b, [2, 3, 4, 3], 2);
  } else if (b.pat === 'final') {
    v.forEach((m, j) => gusli(b.t + 0.004 + j * 0.06, m, { vel: 0.5 - 0.025 * j, ring: TOTAL - b.t }));
    const bo = w2 / 3 * 1.05;
    gusli(b.t + 2 * bo, 81, { vel: 0.24, ring: TOTAL - b.t });
    gusli(b.t + 3.5 * bo, 86, { vel: 0.2, ring: TOTAL - b.t });
  } else plucks(b, PAT[b.pat]);
  for (const [bt, m, d] of b.mel) {
    const t = b.t + bt * b.beat + (rnd() - 0.5) * 0.01;
    gusli(t, m, { vel: MEL_VEL[b.sec], ring: d * b.beat + 0.1, tone: 1.2 });
  }
}
// перелив по ягодкам ободка: ягодка появляется (springPop ≈ половина размера) через ~0,19 с после своей
// отметки на круге, щипок — на кадр позже; струны — звуки текущего аккорда от A4, звук идёт по кругу блюда
{
  const RUN = [0, 1, 2, 3, 4, 3, 2, 3, 1, 2, 3, 4, 3, 1];
  for (let i = 0, j = 0; i < 28; i += 2, j++) {
    const t = RIM[0] + (RIM[1] - RIM[0]) * (i + 0.5) / 28 + 0.19 + FRAME;
    const a = -Math.PI / 2 + (i + 0.5) * 2 * Math.PI / 28, tones = chordTones(barAt(t).chord, 69, 5);
    gusli(t, tones[RUN[j % RUN.length]], { vel: 0.3 + 0.08 * Math.sin(Math.PI * j / 13), ring: 0.9, pan: scrPan(PLATE_X + Math.cos(a) * 428) });
  }
}
// жалейка: заставка (A4 D5 E5 | G5 F5 E5 | D5 C5 A4 — опевание и спуск к ля) и финал (D5 E5 D5 B4 | B♭4 A4 G4 | A4 D5)
const fl = (t0, beat, list) => list.map(([bt, m, d, gr]) => ({ t: t0 + bt * beat, d: d * beat, m, gr }));
{
  const b0 = bars[nI - 3], bI = b0.beat;
  pipe(fl(b0.t, bI, [[1.5, 69, 0.5], [2, 74, 1], [3, 76, 1, 77], [4, 79, 1], [5, 77, 0.5], [5.5, 76, 0.5], [6, 74, 1, 76], [7, 72, 1], [8, 69, 0.85]]), { gain: 0.064 });
  const bo1 = w1 / 3, bo2 = w2 / 3, bo3 = bo2 * 1.05;
  const out = [
    ...fl(o1, bo1, [[0, 74, 1.5], [1.5, 76, 0.5], [2, 74, 0.5], [2.5, 71, 0.5]]),
    ...fl(o2, bo2, [[0, 70, 1.5, 72], [1.5, 69, 0.5], [2, 67, 1]]),
    ...fl(o3, bo3, [[0, 69, 1]]),
  ];
  out.push({ t: o3 + bo3, d: TOTAL - 0.7 - (o3 + bo3), m: 74 });
  pipe(out, { gain: 0.062 });
}
// бурдон ре–ля: от заставки до паузы перед ответом и с «солнца» до конца
for (const [m, gn] of [[38, 0.0106], [45, 0.0069], [50, 0.0038]]) {
  drone(0, cAt + 0.2, m, { gain: gn, att: 1.4, rel: 0.9 });
  drone(a4 - 0.05, TOTAL, m, { gain: gn, att: 0.7, rel: 0.5 });
}
// корпус гуслей: лёгкие резонансы деки, срез самого верха и постоянной составляющей
for (const ch of [0, 1]) {
  const r1 = biquad('bp', 280, 1.3), r2 = biquad('bp', 1500, 1.2), lp = biquad('lp', 9000, 0.7), hp = biquad('hp', 28, 0.7), x = gus[ch];
  for (let i = 0; i < N; i++) x[i] = bq(hp, bq(lp, x[i] + 0.45 * bq(r1, x[i]) + 0.18 * bq(r2, x[i])));
}
const mus = [0, 1].map((ch) => { const o = new Float32Array(N); for (let i = 0; i < N; i++) o[i] = gus[ch][i] + pipeB[ch][i] + dr[ch][i]; return o; });

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

// ---------- шумы (уровни — в дБ к RMS голоса в местах речи) ----------
const hump = (u, p) => (u < p ? smooth(u / p) : smooth((1 - u) / (1 - p)));
const rmsNorm = (x) => { let s = 0, c = 0; for (const v of x) if (v !== 0) { s += v * v; c++; } const r = Math.sqrt(s / Math.max(1, c)) || 1; for (let i = 0; i < x.length; i++) x[i] /= r; return x; };
// Шорох кисти по лаку: шум ворса в высокой полосе, мягкое «трение» в средней и редкие зёрна.
// env(t) — нажим (0..1); thin(t) — насколько кисть тонкая (верхняя полоса растёт, средняя уходит).
function brushNoise(dur, env, { lo = 1800, hi = 8500, drag = 0.3, rate = 60, thin = () => 0 } = {}) {
  const n = Math.floor(dur * SR), x = new Float32Array(n), gr = new Float32Array(n);
  const hiB = band(lo, hi), midB = band(500, 1700), topB = band(hi * 0.8, Math.min(15000, hi * 1.6));
  for (let i = 0; i < n; i++) if (rnd() < rate * env(i / SR) / SR) {
    const len = Math.floor((2 + rnd() * 8) * SR / 1000), A = 0.3 + 0.7 * rnd();
    for (let k = 0; k < len && i + k < n; k++) gr[i + k] += A * Math.exp(-k / (len * 0.35)) * Math.min(1, k / 15);
  }
  for (let i = 0; i < n; i++) {
    const t = i / SR, e = env(t), th = thin(t);
    if (e <= 0) { hiB(0); midB(0); topB(0); continue; }
    x[i] = e * ((1 - 0.5 * th) * hiB(rnd() * 2 - 1) + drag * (1 - th) * midB(rnd() * 2 - 1) + 0.6 * th * topB(rnd() * 2 - 1)) * (0.65 + 0.35 * Math.min(1.5, gr[i]));
  }
  return rmsNorm(x);
}
// Колокольчик: неидеальные призвуки, у основного — пара с биениями, звон ~3 с с мягким концом.
function bell(t0, m, { gain = 0.1, pan = 0 } = {}) {
  const f = hz(m), i0 = Math.round(t0 * SR);
  if (i0 < 0 || i0 >= N) return;
  const sc = (1200 / f) ** 0.35;
  const P = [[1, 1, 0.75], [1.0021, 0.55, 0.65], [2.0, 0.18, 0.4], [2.76, 0.28, 0.25], [4.07, 0.08, 0.14], [5.4, 0.1, 0.08]].filter(([r]) => f * r < 16000);
  const LEN = 3.0, len = Math.min(N - i0, Math.floor(LEN * SR)), [gl, gr] = panLR(pan);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    let s = 0;
    for (const [r, a, tau] of P) s += a * Math.exp(-t / (tau * sc)) * Math.sin(2 * Math.PI * f * r * t);
    const v = s * Math.min(1, t / 0.0008) * smooth((LEN - t) / 0.6) * gain;
    sfx[0][i0 + i] += v * gl; sfx[1][i0 + i] += v * gr;
  }
}
const SFXLOG = {};
const log = (k, v) => { (SFXLOG[k] ??= []).push(Math.round(v * 1000) / 1000); };
function put(t0, x, gain, pan) {
  const i0 = Math.round(t0 * SR);
  for (let i = 0; i < x.length; i++) {
    const j = i0 + i;
    if (j < 0 || j >= N) continue;
    const [l, r] = panLR(typeof pan === 'function' ? pan(i / SR) : pan);
    sfx[0][j] += x[i] * gain * l; sfx[1][j] += x[i] * gain * r;
  }
}
const SFX_WIN = {}; // окна шумов для отчёта
// кисть обходит ободок: нажим ровный, громче и ярче, где кисть бежит быстрее (середина круга), звук идёт по кругу
{
  const t0 = RIM[0] + FRAME, dur = RIM[1] - RIM[0] + 0.3;
  const u = (t) => prog(RIM[0] + t, RIM[0], RIM[1]);
  const env = (t) => smooth(t / 0.1) * (0.4 + 0.6 * 4 * u(t) * (1 - u(t))) * smooth((RIM[1] + 0.14 - RIM[0] - t) / 0.2);
  const pan = (t) => scrPan(PLATE_X + Math.cos(-Math.PI / 2 + 2 * Math.PI * smooth(u(t))) * RIM_R);
  put(t0, brushNoise(dur, env, { lo: 2000, hi: 9000, drag: 0.35, rate: 90 }), db(-17) * VR, pan);
  log('brush_rim', t0); log('brush_rim', RIM[1] + FRAME);
  SFX_WIN.brush_rim = [[t0, RIM[1] + FRAME]];
}
// «весной»: кисть пишет травку (четыре «осочки») и росток; «Летом»: ведёт ствол вверх (у основания нажим сильнее)
{
  const pan = scrPan(PLATE_X);
  const g0 = EV.ves - 0.05 + FRAME;
  [0, 0.19, 0.4, 0.6].forEach((dt, i) => {
    const d = 0.26 + 0.04 * rnd();
    put(g0 + dt, brushNoise(d, (t) => hump(t / d, 0.35), { lo: 2200, hi: 9000, drag: 0.25, rate: 50 }), db(-30.5 - (i % 2) * 1.5) * VR, pan - 0.04 + 0.03 * i);
    log('brush_grass', g0 + dt + 0.35 * d);
  });
  const sd = 0.6, sp0 = EV.ves + 0.15 + FRAME;
  put(sp0, brushNoise(sd, (t) => hump(t / sd, 0.3) * 0.9, { lo: 2400, hi: 9500, drag: 0.2, rate: 40 }), db(-32.5) * VR, pan);
  log('brush_sprout', sp0 + 0.3 * sd);
  const tr0 = EV.let - 0.05 + FRAME, td = 0.8;
  const trEnv = (t) => { const u = t / td; return smooth(u / 0.08) * (1 - 0.6 * u) * smooth((1 - u) / 0.12); };
  put(tr0, brushNoise(td + 0.05, trEnv, { lo: 1800, hi: 8500, drag: 0.4, rate: 70, thin: (t) => clamp(t / td, 0, 1) }), db(-29.5) * VR, pan);
  log('brush_trunk', tr0); log('brush_trunk', tr0 + td);
  SFX_WIN.brush_ves_let = [[g0, sp0 + sd], [tr0, tr0 + td]];
}
// колокольчики: «цвела» — перелив вниз-вверх по звукам текущего аккорда, «Солнцем» — вверх; первый удар — пик
function chime(t0, contour, lo, step, gainDb, pan, key) {
  const tones = chordTones(barAt(t0).chord, lo, 5);
  contour.forEach((ix, j) => bell(t0 + j * step + (j ? (rnd() - 0.5) * 0.012 : 0), tones[ix], { gain: db(gainDb - (j ? 2.5 + 0.8 * j : 0)) * VR, pan: pan + 0.06 * (j - 2) }));
  log(key, t0);
  SFX_WIN[key] = [[t0, t0 + 0.9]];
}
chime(EV.cve + FRAME, [2, 1, 0, 1, 3], 81, 0.085, -24, scrPan(PLATE_X - 30), 'bells_flowers');
chime(EV.sol + FRAME, [0, 1, 2, 3, 2], 86, 0.075, -24, scrPan(PLATE_X + 258), 'bells_sun');
// блик лака: светлая полоса проходит по блюду слева направо за 1,1 с, ярче всего в середине —
// воздушный «шшш» в верхней полосе и тихий перелив высоких звуков аккорда по ходу блика
{
  const t0 = EV.glint + FRAME, d = 1.1;
  const pan = (t) => scrPan(PLATE_X - 700 + 1400 * smooth(t / d));
  const n = Math.floor(d * SR), x = new Float32Array(n), hb = band(4500, 12000), mb = band(2500, 6000);
  for (let i = 0; i < n; i++) { const u = i / n, e = Math.sin(Math.PI * u) ** 2; x[i] = e * (hb(rnd() * 2 - 1) + 0.4 * mb(rnd() * 2 - 1)) * (1 + 0.25 * Math.sin(2 * Math.PI * 9 * i / SR)); }
  put(t0, rmsNorm(x), db(-23) * VR, pan);
  const tones = chordTones(barAt(t0 + 0.5).chord, 86, 5);
  [0.12, 0.3, 0.46, 0.6, 0.76].forEach((u, j) => bell(t0 + u * d, tones[j], { gain: db(-28) * VR * (0.55 + 0.45 * Math.sin(Math.PI * u)), pan: pan(u * d) }));
  log('glint', t0 + 0.5 * d);
  SFX_WIN.glint = [[t0, t0 + d]];
}

// ---------- реверберация (Freeverb-подобная), уровень хвоста подгоняется к доле сухого сигнала ----------
function reverb(src, wetRatio) {
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617], aps = [556, 441, 341, 225], pre = Math.round(0.016 * SR);
  const outs = [0, 1].map((ch) => {
    const cb = combs.map((d) => ({ b: new Float32Array(d + ch * 23), i: 0, f: 0 }));
    const ab = aps.map((d) => ({ b: new Float32Array(d + ch * 23), i: 0 }));
    const y = new Float32Array(N);
    for (let n = 0; n < N; n++) {
      const x = n >= pre ? (src[0][n - pre] + src[1][n - pre]) * 0.015 : 0;
      let o = 0;
      for (const c of cb) { const v = c.b[c.i]; c.f = v * 0.7 + c.f * 0.3; c.b[c.i] = x + c.f * 0.85; c.i = (c.i + 1) % c.b.length; o += v; }
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
const musW = reverb(mus, 0.55);
const sfxW = reverb(sfx, 0.3);

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
const voiceMS = 2 * msIn([kv], speech); // в ролике голос моно на оба канала

const LOUD = db(LOUD_DB), GAP = db(GAP_DB);
const shape = [[0, 0], [0.3, LOUD], [L(1) - 0.9, LOUD], [L(1) - 0.08, 1]];
{
  const a = E(4) + 0.05, b = L(5) - 0.06;
  if (b - a > 0.4) { const r = Math.min(0.25, (b - a) / 3); shape.push([a, 1], [a + r, GAP], [b - r, GAP], [b, 1]); }
}
shape.push([E(8) + 0.1, 1], [E(8) + 1.3, LOUD], [TOTAL - 2.2, LOUD], [TOTAL - 0.02, 0], [TOTAL, 0]);
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
fs.writeFileSync(path.join(HERE, 'sfx.json'), JSON.stringify({ note: 'пики шумов, секунды ролика; brush_rim и brush_trunk — начало и конец шороха, glint — середина блика', V0, OUTRO, total: TOTAL, ...SFXLOG }, null, 1));

// ---------- отчёт ----------
const kmix = [0, 1].map((ch) => kWeight(out[ch].map((v) => v * limit)));
const ksfx = sfxW.map(kWeight);
const Lv = lufs(voiceMS), Lm = lufs(msIn(kmus, speech, V0) * G * G * limit * limit), Lall = lufs(msIn(kmix, speech, V0)), Ls = lufs(msIn(ksfx, speech, V0) * limit * limit);
const Lintro = lufs(msIn(kmix, [[0.5, L(1) - 1.0]])), Lgap = lufs(msIn(kmix, [[E(4) + 0.3, L(5) - 0.3]])), Lout = lufs(msIn(kmix, [[E(8) + 1.4, TOTAL - 2.3]]));
const f1 = (x) => x.toFixed(1);
console.log(`события: ${evSrc}; V0 ${V0}, OUTRO ${OUTRO}, длина ${TOTAL} с (${N} отсчётов)`);
console.log('такты:', bars.map((b) => `${b.chord}@${b.t.toFixed(2)}`).join(' '));
console.log(`голос в местах речи ${f1(Lv)} LUFS (моно на оба канала); музыка там же ${f1(Lm)} (${f1(Lm - Lv)} дБ), с шумами ${f1(Lall)} (${f1(Lall - Lv)} дБ), шумы отдельно ${f1(Ls)} (${f1(Ls - Lv)} дБ)`);
console.log(`заставка ${f1(Lintro)} LUFS (${f1(Lintro - Lv)} дБ к голосу), пауза перед ответом ${f1(Lgap)} (${f1(Lgap - Lv)} дБ), финал ${f1(Lout)} (${f1(Lout - Lv)} дБ)`);
console.log('шумы в своих окнах (дБ к голосу):', Object.entries(SFX_WIN).map(([k, w]) => `${k} ${f1(lufs(msIn(ksfx, w) * limit * limit) - Lv)}`).join(', '));
{
  const kb = (bus) => [0, 1].map((ch) => kWeight(bus[ch]));
  const bal = (wins) => ['гусли', 'жалейка', 'бурдон'].map((nm, i) => `${nm} ${f1(lufs(msIn(kb([gus, pipeB, dr][i]), wins)))}`).join(', ');
  console.log(`баланс (сухо, LUFS): заставка — ${bal([[0.5, L(1) - 0.3]])}; под голосом — ${bal(speech.map(([a, b]) => [a + V0, b + V0]))}; финал — ${bal([[o1, TOTAL - 2.3]])}`);
}
console.log(`music.wav: пик ${(peak * limit).toFixed(4)} (${f1(20 * Math.log10(peak * limit))} dBFS), множитель ${limit.toFixed(3)}`);
