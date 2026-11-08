// Музыка и шумы к «Песни о вещем Олеге» А. С. Пушкина, стиль «Трейлер эпического фильма».
//
// Своя трейлерная музыка в ре миноре: низкий гул-дрон, синтетические большие барабаны (одайко, тайко, симэ, щелчки
// палок), остинато «струнных» шестнадцатыми (рисунок 3+3+2), низкие «струнные» и «медь», «браммы» (низкие медные
// удары с раскрывающимся фильтром), хор на гласных «а/о/у» (форманты), стеклянное мерцание, арфа, райзеры и удары.
// Мелодия и аранжировка свои. Разделы привязаны к строкам и словам голоса (timings.json):
//   0 … L1−0,45   заставка: гром на молниях (≈0,3 и ≈1,5 с), удар и «брамм» на названии (0,9 с), подъём остинато;
//   ст. 1         поход (132 в минуту — шаг галопа дружины): барабаны, остинато, низы, медь; топот копыт, мечи, зарево;
//   ст. 2–4       кудесник и пророчество: гул, хор «о/а», сердцебиение, мерцание; карточка «ПРОРОЧЕСТВО» — удар и брамм;
//   ст. 5–6       видения славы: поход возвращается с хором и медью, щит на вратах — удар; шторм и вал; снаряды —
//                 «замедление» (только подушка и низкие удары, звон отскоков); незримый хранитель — светлый хор;
//   ст. 7         конь: поход → стрелы → галоп → нарастание (дробь, райзер) → провал, низкий удар на чёрном кадре
//                 и почти тишина на всю строку 42;
//   ст. 8–10      прощание с конём: тёплая подушка струнных, виолончель, арфа; карточка «ГОДЫ СПУСТЯ»;
//   ст. 11        пир: бубен, колокольцы, бурдон квинтой, «гусли»; «поминают… битвы» — эхо похода;
//   ст. 12–13     вопрос о коне (вспышка-воспоминание) → тревога, «почил»; гнев: низкие стаккато, удар кулака;
//   ст. 14–16     выезд (медленный марш) → холм: пустота, дождь, пыль, ветер; карточка «СУДЬБА»; череп, тризна;
//                 напряжение перед ст. 91; змея: тишина и ветер → ползучий кластер → удар на «вскрикнул», тишина ~1 с;
//   ст. 17        эпилог: медленный хорал, на последних строках — эхо похода и нарастание;
//   финал (fin)   удар, брамм и аккорд ре минор с хором, затухание к концу.
// Шумы — синтез, только с причиной в кадре, пик на кадр позже события в картинке (времена — в sfx.json).
//
// Запуск: node make_music.mjs --intro 4.5 --outro 7.5      (по умолчанию 4,5 и 7,5; можно --intro=4.5)
// Читает ../timings.json, ../voice.mp3 (через ffmpeg) и events.json (пишет ../video/build.py), если он совпадает
// с таймингами; иначе события считает по timings.json так же, как build.py (fin = конец голоса + 2,2 с).
// Пишет music.wav (44,1 кГц, 16 бит, стерео, длина intro + голос + outro) и sfx.json. Без зависимостей: node и ffmpeg.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const POEM = path.dirname(HERE);
const SR = 44100, FRAME = 1 / 30;

// ---------- уровни: K-взвешенно (BS.1770), дБ к голосу в местах речи ----------
// по строфам 1…17: под голосом 18,5–20 дБ тише голоса
const UNDER = [-18.5, -19.5, -19, -19.5, -18.5, -18.5, -18.5, -20, -20, -20, -19, -19.5, -18.5, -19.5, -19.5, -19, -19.5];
const LINE_DB = { 4: 0.5, 16: -1, 25: -0.5, 28: -1, 76: -1.5, 30: -0.5, 39: 0.3, 40: 0.6, 41: 1, 88: 0.5, 89: 0.5, 90: 0.5, 92: -0.5, 95: 0.5 };
const FREE = new Set([93]);  // музыка нарочно почти молчит часть строки: громкость как у предыдущей, без подгонки
const LINE_ABS = { 42: -27, 96: -16 }; // своя цель: ст. 42 — почти тишина после удара; ст. 96 — удар на «вскрикнул», тишина
const SWELL = { 1: -12, 2: -13, 4: -11, 5: -12, 6: -12, 8: -14, 11: -13, 12: -14, 13: -12, 15: -12 }; // пауза после строфы
const CARD_DB = -7;            // карточки «ПРОРОЧЕСТВО», «ГОДЫ СПУСТЯ», «СУДЬБА»
const INTRO_DB = -5, BUILD_DB = -10, FIN_DB = -4;
// шумы: громкость в своём окне к голосу (K-взвешенно)
const SFX_DB = {
  thunder: [-3, -8], hooves: -21, gallop: -20, walk: -21, memory: -23, swords: -16, blaze: -20, perun: -18,
  shield: -13, wave: -20, storm: -19, whoosh: -21, ricochet: -15, arrows: -21, clash: -14, clink: -13, fist: -13,
  shatter: -18, rain: -21, dust: -22, wind: -21, wind2: -22, crunch: -12, hiss: -19, slither: -23, strike: -11,
};
const FIN_AFTER = 2.2; // запасной путь: fin = конец последней строки + 2,2 с (как в ../video/build.py)

// ---------- аргументы ----------
const argv = process.argv.slice(2);
function opt(name, def) {
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    let v = null;
    if (a === `--${name}`) v = Number(argv[i + 1]);
    else if (a.startsWith(`--${name}=`)) v = Number(a.slice(name.length + 3));
    else continue;
    if (!Number.isFinite(v)) throw new Error(`плохое значение --${name}`);
    return v;
  }
  return def;
}
const V0 = opt('intro', 4.5), OUTRO = opt('outro', 7.5);
if (V0 < 3 || OUTRO < 5) throw new Error('нужно --intro >= 3 и --outro >= 5');

// ---------- время ----------
const r3 = (x) => Math.round(x * 1000) / 1000;
const T = JSON.parse(fs.readFileSync(path.join(POEM, 'timings.json'), 'utf8'));
const VD = T.voiceDuration;
const TOTAL = r3(V0 + VD + OUTRO);
const N = Math.round(TOTAL * SR);
const LINES = T.lines;
const NL = LINES.length;
if (NL !== 102) throw new Error(`ожидалось 102 строки, в timings.json ${NL}`);
const norm = (s) => s.toLowerCase().replace(/ё/g, 'е').replace(/[^а-яa-z]/g, '');
const WORDS = { // как в ../video/build.py
  w_hoz: [2, 'хозарам'], w_sely: [3, 'сёлы'], w_mech: [4, 'мечам'], w_pozh: [4, 'пожарам'], w_bron: [5, 'броне'],
  w_kud1: [8, 'кудесник'], w_perun: [9, 'Перуну'], w_vest: [10, 'вестник'], w_podieh: [12, 'подъехал'],
  w_zeml: [16, 'землёю'], w_konya3: [18, 'коня'], w_vlad: [19, 'владык'], w_yazyk: [21, 'язык'], w_chele: [24, 'челе'],
  w_slava: [26, 'слава'], w_imya: [27, 'имя'], w_shchit: [28, 'щит'], w_zavid: [30, 'Завидует'],
  w_val: [31, 'вал'], w_prashch: [33, 'пращ'], w_strela: [33, 'стрела'], w_kinzhal: [33, 'кинжал'], w_khran: [36, 'хранитель'],
  w_secha: [41, 'сеча'], w_usm: [43, 'усмехнулся'], w_odnako: [43, 'однако'], w_slez: [46, 'слезает'],
  w_strem: [52, 'стремя'], w_pomni: [53, 'помни'], w_popon: [55, 'попоной'], w_korm: [57, 'кормите'], w_drug: [60, 'другого'],
  w_zvon: [62, 'звоне'], w_kudri: [63, 'кудри'], w_burn: [70, 'бурный'], w_pochil: [72, 'почил'],
  w_ponik: [73, 'поник'], w_prezr: [76, 'Презреть'], w_dozhd: [83, 'дожди'], w_pyl: [83, 'пыль'], w_veter: [84, 'ветер'],
  w_nastup: [85, 'наступил'], w_sekir: [89, 'секирой'], w_zmiya: [93, 'змия'], w_obvil: [95, 'обвилась'], w_vskr: [96, 'вскрикнул'],
};
function eventsFromTimings() {
  const ev = { V0 };
  LINES.forEach((l, i) => { ev[`L${i + 1}`] = r3(l.start + V0); ev[`E${i + 1}`] = r3(l.end + V0); });
  for (const [k, [n, w]] of Object.entries(WORDS)) {
    const x = LINES[n - 1].words.find((q) => norm(q.text) === norm(w));
    if (!x) throw new Error(`нет слова «${w}» в строке ${n}`);
    ev[k] = r3(x.start + V0);
  }
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
      if (Math.abs((raw.total ?? TOTAL) + shift - TOTAL) > 0.002) console.warn(`внимание: total в events.json ${raw.total}, у музыки ${TOTAL} (другой outro?)`);
    } else console.warn('events.json не совпадает с timings.json — события считаю по timings.json');
  }
}
if (EV.fin > TOTAL - 4) throw new Error(`финал слишком короткий: fin ${EV.fin}, длина ${TOTAL}`);
const L = (n) => EV[`L${n}`], E = (n) => EV[`E${n}`], W = (k) => EV[k];
const stanzaOf = (n) => LINES[n - 1].stanza;

// ---------- помощники ----------
let seed = 1822;
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
const dB = (ms) => 10 * Math.log10(Math.max(ms, 1e-20));
const hum = (s = 0.003) => (rnd() - 0.5) * 2 * s;
const panLR = (p) => [Math.cos((clamp(p, -1, 1) + 1) * Math.PI / 4), Math.sin((clamp(p, -1, 1) + 1) * Math.PI / 4)];
const scrPan = (x) => clamp((x - 960) / 960 * 0.7, -0.8, 0.8); // x в кадре 1920 → панорама
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
function svf() { // фильтр с переменным срезом (state variable, TPT)
  let ic1 = 0, ic2 = 0, a1 = 1, a2 = 0, a3 = 0;
  return {
    set(fc, Q) { const g = Math.tan(Math.PI * Math.min(fc, SR * 0.45) / SR), k = 1 / Q; a1 = 1 / (1 + g * (g + k)); a2 = g * a1; a3 = g * a2; },
    lp(x) { const v3 = x - ic2, v1 = a1 * ic1 + a2 * v3, v2 = ic2 + a2 * ic1 + a3 * v3; ic1 = 2 * v1 - ic1; ic2 = 2 * v2 - ic2; return v2; },
    bp(x) { const v3 = x - ic2, v1 = a1 * ic1 + a2 * v3, v2 = ic2 + a2 * ic1 + a3 * v3; ic1 = 2 * v1 - ic1; ic2 = 2 * v2 - ic2; return v1; },
  };
}
// низкая полка (RBJ, S = 1)
function lowShelf(f, gainDb) {
  const A = 10 ** (gainDb / 40), w = 2 * Math.PI * f / SR, cs = Math.cos(w), al = Math.sin(w) / 2 * Math.SQRT2, sa = 2 * Math.sqrt(A) * al;
  const a0 = (A + 1) + (A - 1) * cs + sa;
  return { b0: A * ((A + 1) - (A - 1) * cs + sa) / a0, b1: 2 * A * ((A - 1) - (A + 1) * cs) / a0, b2: A * ((A + 1) - (A - 1) * cs - sa) / a0,
    a1: -2 * ((A - 1) + (A + 1) * cs) / a0, a2: ((A + 1) + (A - 1) * cs - sa) / a0, x1: 0, x2: 0, y1: 0, y2: 0 };
}
// кривая громкости по ключам [t, g] (плавно между ключами), сразу на все отсчёты
function renderCurve(keys) {
  for (let i = 1; i < keys.length; i++) if (keys[i][0] < keys[i - 1][0]) throw new Error(`ключи не по порядку на ${keys[i][0].toFixed(3)} с`);
  const g = new Float32Array(N);
  let j = 0;
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    while (j < keys.length - 1 && t > keys[j + 1][0]) j++;
    if (t <= keys[0][0]) g[i] = keys[0][1];
    else if (j >= keys.length - 1) g[i] = keys[keys.length - 1][1];
    else { const [a, va] = keys[j], [b, vb] = keys[j + 1]; g[i] = va + (vb - va) * smooth((t - a) / Math.max(1e-6, b - a)); }
  }
  return g;
}

// ---------- шины ----------
const stereo = () => [new Float32Array(N), new Float32Array(N)];
const BUS = { барабаны: stereo(), низ: stereo(), струнные: stereo(), медь: stereo(), хор: stereo(), арфа: stereo() };
const { барабаны: DR, низ: LO, струнные: STR, медь: BR, хор: CHO, арфа: KY } = BUS;
const send = stereo();
function put(bus, i, y, gl, gr, sk) {
  if (i < 0 || i >= N) return;
  bus[0][i] += y * gl; bus[1][i] += y * gr;
  if (sk) { send[0][i] += y * gl * sk; send[1][i] += y * gr * sk; }
}

// ---------- барабаны и удары ----------
// корпус — синус со спадом высоты, кожа — шум; насыщение tanh
function drum(t0, f0, vel, o = {}) {
  const { dec = 0.4, bend = 1.5, bendT = 0.03, skin = 0.3, skinF = 1200, skinDec = 0.012, pan = 0, sendK = 0.25, drive = 1.8, bus = DR, maxLen = 4 } = o;
  const i0 = Math.round(t0 * SR);
  if (i0 >= N || vel <= 0) return;
  const len = Math.min(N - i0, Math.round(Math.min(maxLen, dec * 5.5 + 0.05) * SR)), [gl, gr] = panLR(pan);
  const lp = biquad('lp', skinF, 0.7), td = Math.tanh(drive);
  const kd = Math.exp(-1 / (dec * SR)), ks = Math.exp(-1 / (skinDec * SR)), kb = Math.exp(-1 / (bendT * SR)), fade = 0.03 * SR;
  let ph = 0, ed = 1, es = 1, eb = 1;
  for (let i = 0; i < len; i++) {
    ph += 2 * Math.PI * f0 * (1 + bend * eb) / SR;
    const x = Math.sin(ph) * ed + skin * bq(lp, wn()) * es;
    ed *= kd; es *= ks; eb *= kb;
    let y = Math.tanh(drive * x) / td * vel * 0.8;
    if (i < 40) y *= i / 40;
    if (len - i < fade) y *= (len - i) / fade;
    put(bus, i0 + i, y, gl, gr, sendK);
  }
}
const odaiko = (t, v = 1, pan = 0) => drum(t, 44, v, { dec: 0.7, bend: 2.2, bendT: 0.035, skin: 0.55, skinF: 900, sendK: 0.4, drive: 2.2, pan });
const taiko = (t, v = 0.7, pan = 0) => {
  drum(t, 63, v, { dec: 0.3, bend: 1.4, skin: 0.5, skinF: 1500, pan: pan - 0.2, sendK: 0.3 });
  drum(t + 0.009 + rnd() * 0.006, 68, v * 0.75, { dec: 0.27, bend: 1.3, skin: 0.45, skinF: 1800, pan: pan + 0.2, sendK: 0.3 });
};
const shime = (t, v = 0.4, pan = 0.25) => drum(t, 230, v, { dec: 0.06, bend: 0.5, bendT: 0.008, skin: 0.9, skinF: 4000, skinDec: 0.005, pan, sendK: 0.22, drive: 1.3 });
const lowTom = (t, v = 0.5, f = 70, pan = 0) => drum(t, f, v, { dec: 0.4, bend: 0.9, skin: 0.35, skinF: 1000, pan, sendK: 0.4 });
const frameDrum = (t, v = 0.5, pan = -0.15) => drum(t, 118, v, { dec: 0.13, bend: 0.5, bendT: 0.01, skin: 0.6, skinF: 2600, skinDec: 0.008, pan, sendK: 0.2, drive: 1.4 });
// сердцебиение «тук-тук»
const heart = (t, v = 0.5) => {
  drum(t, 50, v, { dec: 0.16, bend: 0.8, bendT: 0.02, skin: 0.12, skinF: 500, sendK: 0.15, drive: 1.5 });
  drum(t + 0.27, 46, v * 0.7, { dec: 0.18, bend: 0.8, bendT: 0.02, skin: 0.1, skinF: 500, sendK: 0.15, drive: 1.5 });
};
// щелчок палок
function clack(t0, v = 0.35, pan = -0.25) {
  const i0 = Math.round(t0 * SR), len = Math.round(0.06 * SR), [gl, gr] = panLR(pan), bp = biquad('bp', 2300, 1.6);
  let p = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR; p += 2 * Math.PI * 1650 / SR;
    const y = (0.5 * Math.sin(p) * Math.exp(-t / 0.008) + 1.2 * bq(bp, wn()) * Math.exp(-t / 0.005)) * v * smooth(t / 0.0004);
    put(DR, i0 + i, y, gl, gr, 0.2);
  }
}
// колокольцы бубна
function jingle(t0, v = 0.2, pan = 0.3) {
  const i0 = Math.round(t0 * SR), len = Math.round(0.18 * SR), [gl, gr] = panLR(pan), h = biquad('hp', 5500, 0.7);
  const fs = [6400, 7900, 9600, 11300].map((f) => f * (0.97 + 0.06 * rnd())), ph = fs.map(() => rnd() * 6.28);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    let s = 0;
    for (let k = 0; k < 4; k++) s += Math.sin(2 * Math.PI * fs[k] * t + ph[k]) * Math.exp(-t / (0.05 + 0.02 * k));
    const y = (0.25 * s + bq(h, wn()) * 0.9) * Math.exp(-t / 0.045) * smooth(t / 0.002) * v * 0.5;
    put(DR, i0 + i, y, gl, gr, 0.15);
  }
}
// малый (военный) барабан для дроби
function snare(t0, vel = 0.6, { pan = 0.05, sendK = 0.18, dec = 0.11 } = {}) {
  const i0 = Math.round(t0 * SR), len = Math.round((dec * 6 + 0.02) * SR), [gl, gr] = panLR(pan);
  const hp = biquad('hp', 900, 0.7), bp = biquad('bp', 3300, 0.6);
  let p1 = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    p1 += 2 * Math.PI * (185 + 45 * Math.exp(-t / 0.008)) / SR;
    const nz = bq(bp, bq(hp, wn())) * 2.2;
    const y = (0.5 * Math.sin(p1) * Math.exp(-t / 0.05) + nz * Math.exp(-t / dec) * (1 + 1.3 * Math.exp(-t / 0.008)))
      * smooth(t / 0.0008) * smooth((len / SR - t) / 0.01) * vel * 0.6;
    put(DR, i0 + i, y, gl, gr, sendK);
  }
}
// дробь: шаг от s0 к s1, громкость от v0 к v1
function roll(t0, t1, v0, v1, s0, s1) {
  for (let t = t0, k = 0; t < t1 - 1e-6; k++) {
    const u = (t - t0) / Math.max(1e-6, t1 - t0);
    snare(t + hum(0.002), lerp(v0, v1, u * u) * (0.88 + 0.24 * rnd()) * (k % 2 ? 0.86 : 1), { dec: 0.07 });
    t += lerp(s0, s1, u);
  }
}
// низкий «уход» синусом
function subdrop(t0, f0, f1, dur, v, bus = LO) {
  const i0 = Math.round(t0 * SR);
  if (i0 >= N) return;
  const len = Math.min(N - i0, Math.round(dur * SR));
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR, f = f1 + (f0 - f1) * Math.exp(-t / (dur * 0.22));
    ph += 2 * Math.PI * f / SR;
    const y = Math.sin(ph) * Math.exp(-t / (dur * 0.35)) * smooth(t / 0.005) * smooth((len - i) / (0.1 * SR)) * v * 0.7;
    put(bus, i0 + i, y, 0.7071, 0.7071, 0.05);
  }
}
// шумовой всплеск (тарелка/воздух удара), стерео
function noiseBurst(t0, v, dec, { lpF = 7000, hpF = 400, sendK = 0.6, bus = DR, att = 0.002 } = {}) {
  const i0 = Math.round(t0 * SR);
  if (i0 >= N) return;
  const len = Math.min(N - i0, Math.round(dec * 6 * SR)), F = [0, 1].map(() => [biquad('hp', hpF, 0.7), biquad('lp', lpF, 0.7)]);
  for (let i = 0; i < len; i++) {
    const t = i / SR, env = Math.exp(-t / dec) * (1 + 2 * Math.exp(-t / 0.012)) * smooth(t / att) * smooth((len - i) / (0.05 * SR)) * v * 0.25;
    for (const ch of [0, 1]) {
      const y = bq(F[ch][1], bq(F[ch][0], wn())) * env;
      bus[ch][i0 + i] += y; send[ch][i0 + i] += y * sendK;
    }
  }
}
// металл: негармонические обертоны пластины
function metalHit(t0, v, f0 = 170, dec = 1.3, pan = 0, bus = KY) {
  const i0 = Math.round(t0 * SR);
  if (i0 >= N) return;
  const ratios = [1, 1.593, 2.135, 2.653, 3.156, 3.79, 4.52, 5.41], len = Math.min(N - i0, Math.round(dec * 4 * SR)), [gl, gr] = panLR(pan);
  const ph = ratios.map(() => rnd() * 6.28), hp = biquad('hp', 1500, 0.7);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    let s = 0;
    for (let k = 0; k < ratios.length; k++) s += Math.sin(2 * Math.PI * f0 * ratios[k] * t + ph[k]) * Math.exp(-t / (dec / (1 + 0.3 * k))) / (1 + 0.5 * k);
    const y = (s * 0.5 + bq(hp, wn()) * Math.exp(-t / 0.006)) * smooth(t / 0.001) * smooth((len - i) / (0.05 * SR)) * v * 0.18;
    put(bus, i0 + i, y, gl, gr, 0.5);
  }
}
// трейлерный удар: большой барабан, два тайко, низкий уход, всплеск, металл
function impact(t0, v = 1, { tail = 1, metal = 0.3, f0 = 40, noise = 1 } = {}) {
  drum(t0, f0, v, { dec: 0.85 * tail, bend: 2.6, bendT: 0.03, skin: 0.75, skinF: 1700, sendK: 0.55, drive: 2.5 });
  drum(t0 + 0.006, 74, v * 0.55, { dec: 0.3, bend: 1.2, skin: 0.6, skinF: 2500, pan: 0.2, sendK: 0.5 });
  drum(t0 + 0.012, 58, v * 0.5, { dec: 0.35, bend: 1.2, skin: 0.6, skinF: 2200, pan: -0.2, sendK: 0.5 });
  subdrop(t0, 95, 28, 2.4 * tail, v * 0.8);
  if (noise) noiseBurst(t0, v * 0.5 * noise, 0.3 * tail);
  if (metal) metalHit(t0, v * metal, 150, 1.6 * tail);
}
// «брамм»: низкая медь — пилы с расстройкой, фильтр раскрывается на атаке и медленно закрывается, перегруз
function bramm(t0, root, dur, v = 1, o = {}) {
  const { iv = [0, 12, 19], fMax = 1300, fSus = 300, att = 0.06, rel = 0.8, drive = 2.6, sendK = 0.3, nOsc = 4, det = 16, sub = 0.6 } = o;
  const i0 = Math.round(t0 * SR);
  if (i0 >= N) return;
  const len = Math.min(N - i0, Math.round((dur + rel * 5) * SR));
  const notes = iv.map((d) => hz(root + d));
  const osc = [0, 1].map(() => notes.flatMap((f) => Array.from({ length: nOsc }, (_, k) => ({ p: rnd(), d: f * 2 ** ((det * (2 * k / (nOsc - 1) - 1) + (rnd() - 0.5) * 6) / 1200) / SR }))));
  const F = [svf(), svf()], F2 = [svf(), svf()], td = Math.tanh(drive), fsub = hz(root - 12 >= 24 ? root - 12 : root), nn = notes.length * nOsc;
  let ps = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    let A = t < att ? smooth(t / att) : 1;
    if (t > dur) A *= Math.exp(-(t - dur) / rel);
    if ((i & 7) === 0) {
      const fc = t < att ? 70 * (fMax / 70) ** (t / att) : fSus + (fMax - fSus) * Math.exp(-(t - att) / (dur * 0.35 + 0.05));
      for (const ch of [0, 1]) { F[ch].set(fc, 1.2); F2[ch].set(fc, 0.8); }
    }
    ps += 2 * Math.PI * fsub / SR;
    const sb = Math.sin(ps) * sub;
    for (const ch of [0, 1]) {
      let s = 0;
      for (const q of osc[ch]) { q.p += q.d; if (q.p >= 1) q.p -= 1; s += 2 * q.p - 1 - polyblep(q.p, q.d); }
      s /= nn;
      const y = (Math.tanh(drive * 2.2 * F2[ch].lp(F[ch].lp(s))) / td + sb) * A * v * 0.35;
      if (i0 + i < N) { LO[ch][i0 + i] += y; send[ch][i0 + i] += y * sendK; }
    }
  }
}
// гул-дрон: синус октавой ниже и пилы под низким фильтром, медленно «дышит»
function drone(t0, t1, m, v = 0.5, { fadeIn = 1.5, fadeOut = 1.5, cut = 200, sub = 0.5, sendK = 0.12, wob = 0.15 } = {}) {
  const i0 = Math.max(0, Math.round(t0 * SR)), i1 = Math.min(N, Math.round(t1 * SR)), dur = (i1 - i0) / SR;
  const f = hz(m), fs = hz(m - 12), d = [-7, 6, 1].map((c) => f * 2 ** (c / 1200) / SR), p = [rnd(), rnd(), rnd()];
  const F = [svf(), svf()]; F[0].set(cut, 0.9); F[1].set(cut * 1.05, 0.9);
  let ps = 0;
  const wp = rnd() * 6;
  for (let i = 0; i < i1 - i0; i++) {
    const t = i / SR;
    ps += 2 * Math.PI * fs / SR;
    const s = [0, 0, 0];
    for (let k = 0; k < 3; k++) { p[k] += d[k]; if (p[k] >= 1) p[k] -= 1; s[k] = 2 * p[k] - 1 - polyblep(p[k], d[k]); }
    const A = smooth(t / fadeIn) * smooth((dur - t) / fadeOut) * (1 + wob * Math.sin(2 * Math.PI * 0.11 * t + wp)) * v * 0.45;
    const so = Math.sin(ps) * sub;
    const yL = (F[0].lp((s[0] + s[2]) * 0.5) * 0.9 + so) * A, yR = (F[1].lp((s[1] + s[2]) * 0.5) * 0.9 + so) * A;
    LO[0][i0 + i] += yL; LO[1][i0 + i] += yR; send[0][i0 + i] += yL * sendK; send[1][i0 + i] += yR * sendK;
  }
}

// ---------- синтезаторы ----------
// «струнные», «медь», бас: несколько пил (PolyBLEP) с расстройкой, ФНЧ со срезом от громкости, вибрато, тремоло
function synth(bus, t0, dur, m, o = {}) {
  const { vel = 0.6, pan = 0, gain = 0.1, nOsc = 3, det = 10, bright = 3, sus = 0.8, att = 0.02, dec = 0.15, rel = 0.15,
    scoop = 0, vib = 0, vibRate = 5.2, bend = null, sendK = 0.3, swell = null, q = 0.8, blat = 0, trem = 0, tremRate = 13, fmin = 120 } = o;
  const i0 = Math.round(t0 * SR);
  if (i0 >= N || dur <= 0 || vel <= 0) return;
  const len = Math.min(N - i0, Math.ceil((dur + rel * 7) * SR)), [gl, gr] = panLR(pan);
  const ph = Array.from({ length: nOsc }, () => rnd());
  const ratio = Array.from({ length: nOsc }, (_, k) => 2 ** ((nOsc === 1 ? 0 : det * (2 * k / (nOsc - 1) - 1)) / 1200));
  const F = svf(), vph = rnd() * 6.28, tph = rnd() * 6.28, base = hz(m), tr = tremRate * (0.95 + 0.1 * rnd());
  let f = base, dt = f / SR;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    if ((i & 7) === 0) {
      let semis = m;
      if (scoop) semis -= scoop * Math.exp(-t / 0.035);
      if (vib) semis += vib * smooth((t - 0.2) / 0.3) * Math.sin(2 * Math.PI * vibRate * t + vph);
      if (bend) semis += bend(t);
      f = semis === m ? base : hz(semis); dt = f / SR;
    }
    let s = 0;
    for (let k = 0; k < nOsc; k++) { const d = dt * ratio[k]; ph[k] += d; if (ph[k] >= 1) ph[k] -= 1; s += 2 * ph[k] - 1 - polyblep(ph[k], d); }
    s /= nOsc;
    let A = t < att ? smooth(t / att) : sus + (1 - sus) * Math.exp(-(t - att) / dec);
    if (swell) A *= lerp(swell[0], swell[1], clamp(t / dur, 0, 1) ** (swell[2] ?? 1));
    if (t > dur) A *= Math.exp(-(t - dur) / rel);
    if (trem) A *= 1 - trem * (0.5 + 0.5 * Math.sin(2 * Math.PI * tr * t + tph));
    if ((i & 7) === 0) F.set(Math.min(14000, f * (1 + bright * vel * A * (1 + blat * Math.exp(-t / 0.04))) + fmin), q);
    put(bus, i0 + i, F.lp(s) * A * vel * gain, gl, gr, sendK);
  }
}
const SPIC = { gain: 1.0, nOsc: 2, det: 8, bright: 7, sus: 0.25, att: 0.003, dec: 0.05, rel: 0.035, sendK: 0.2, q: 0.9, fmin: 250 };
const PADS = { gain: 0.22, nOsc: 3, det: 11, bright: 1.6, sus: 1, att: 0.6, dec: 1, rel: 0.7, vib: 0.1, sendK: 0.4, q: 0.7, fmin: 200 };
const TREM = { ...PADS, gain: 0.4, att: 0.25, trem: 0.55, tremRate: 13, bright: 2.2, vib: 0.05 };
const BRASS = { gain: 0.8, nOsc: 3, det: 10, bright: 2.6, sus: 0.75, att: 0.05, dec: 0.3, rel: 0.25, scoop: 0.15, sendK: 0.3, q: 0.85, blat: 0.4, fmin: 100 };
const STAB = { ...BRASS, sus: 0.3, att: 0.01, dec: 0.12, rel: 0.1, bright: 3.5 };
const CELLO = { gain: 0.3, nOsc: 2, det: 3, bright: 2.4, sus: 0.9, att: 0.25, dec: 0.4, rel: 0.5, vib: 0.12, sendK: 0.35, q: 0.75, fmin: 120 };
const NASAL = { gain: 0.16, nOsc: 2, det: 4, bright: 6, sus: 1, att: 0.4, dec: 1, rel: 0.6, sendK: 0.3, q: 2.5, fmin: 600 };
const BASS = { gain: 0.5, nOsc: 2, det: 5, bright: 1.0, sus: 0.85, att: 0.03, dec: 0.25, rel: 0.25, sendK: 0.04, q: 0.7, fmin: 70 };
// хор: три пилы с дрейфом высоты и вибрато через три форманты гласной
const VOW = { а: [[730, 1, 90], [1090, 0.5, 110], [2440, 0.16, 170]], о: [[570, 1, 80], [840, 0.45, 90], [2410, 0.1, 150]], у: [[400, 1, 70], [800, 0.22, 80], [2240, 0.05, 130]] };
function choir(t0, dur, m, vel = 0.5, o = {}) {
  const { vow = 'а', att = 0.8, rel = 1.2, pan = 0, sendK = 0.55, vib = 0.12, gain = 1, swell = null } = o;
  const i0 = Math.round(t0 * SR);
  if (i0 >= N || dur <= 0) return;
  const len = Math.min(N - i0, Math.ceil((dur + rel * 5) * SR)), [gl, gr] = panLR(pan);
  const sh = m >= 60 ? 1.15 : 1;
  const fl = VOW[vow].map(([f, g, bw]) => ({ q: biquad('bp', f * sh, (f * sh) / bw), g }));
  const nb = biquad('bp', 3000, 0.8), det = [-11, 0, 9], ph = det.map(() => rnd()), dr = det.map(() => [rnd() * 6.28, 0.3 + rnd() * 0.5]);
  const vph = rnd() * 6.28, vr = 4.8 + rnd() * 0.8, base = hz(m), dts = new Float64Array(3);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    if ((i & 15) === 0) {
      const vb = vib * 100 * smooth((t - 0.3) / 0.5) * Math.sin(2 * Math.PI * vr * t + vph);
      for (let k = 0; k < 3; k++) dts[k] = base * 2 ** ((vb + det[k] + 5 * Math.sin(2 * Math.PI * dr[k][1] * t + dr[k][0])) / 1200) / SR;
    }
    let s = 0;
    for (let k = 0; k < 3; k++) { ph[k] += dts[k]; if (ph[k] >= 1) ph[k] -= 1; s += 2 * ph[k] - 1 - polyblep(ph[k], dts[k]); }
    s /= 3;
    let y = 0;
    for (const { q, g } of fl) y += g * bq(q, s);
    y += 0.015 * bq(nb, wn());
    let A = t < att ? smooth(t / att) : 1;
    if (swell) A *= lerp(swell[0], swell[1], clamp(t / dur, 0, 1));
    if (t > dur) A *= Math.exp(-(t - dur) / rel);
    put(CHO, i0 + i, y * A * vel * gain * 1.6, gl, gr, sendK);
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
    put(KY, i0 + i, s * smooth(t / 0.0015) * smooth((len / SR - t) / 0.05) * vel * 0.2, gl, gr, 0.4);
  }
}
// колокольчик (блик металла, золото)
function bell(t0, m, vel = 0.3, pan = 0.2) {
  const i0 = Math.round(t0 * SR), f = hz(m);
  if (i0 >= N) return;
  const len = Math.min(N - i0, Math.round(1.6 * SR)), [gl, gr] = panLR(pan);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const s = Math.sin(2 * Math.PI * f * t) * Math.exp(-t / 0.55) + 0.3 * Math.sin(2 * Math.PI * f * 2.76 * t) * Math.exp(-t / 0.16)
      + 0.12 * Math.sin(2 * Math.PI * f * 5.4 * t) * Math.exp(-t / 0.05);
    put(KY, i0 + i, s * smooth(t / 0.0007) * smooth((1.6 - t) / 0.1) * vel * 0.16, gl, gr, 0.45);
  }
}
// стеклянный тон (мерцание): два синуса с биением и октава
function glass(t0, dur, m, vel = 0.2, { att = 0.6, rel = 1.2, pan = 0 } = {}) {
  const i0 = Math.round(t0 * SR), f = hz(m);
  if (i0 >= N) return;
  const len = Math.min(N - i0, Math.round((dur + rel * 5) * SR)), [gl, gr] = panLR(pan), a = 2 * Math.PI * f / SR;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    let A = t < att ? smooth(t / att) : 1;
    if (t > dur) A *= Math.exp(-(t - dur) / rel);
    const s = Math.sin(a * i) + Math.sin(a * 1.0017 * i + 1) + 0.25 * Math.sin(a * 2.0009 * i + 2);
    put(KY, i0 + i, s * A * vel * 0.1, gl, gr, 0.6);
  }
}
// шумовой подъём: полосовой шум, центр уходит вверх
function riser(t0, t1, v = 0.5, { f0 = 350, f1 = 7000, bus = KY } = {}) {
  const i0 = Math.round(t0 * SR), len = Math.min(N - i0, Math.round((t1 - t0) * SR)), F = [svf(), svf()];
  for (let i = 0; i < len; i++) {
    const u = i / len;
    if ((i & 15) === 0) { const fc = f0 * (f1 / f0) ** (u ** 1.3); F[0].set(fc, 1.6); F[1].set(fc * 1.06, 1.6); }
    const env = u ** 2.2 * smooth((len - i) / (0.012 * SR)) * v * 0.3;
    for (const ch of [0, 1]) { const y = F[ch].bp(wn()) * env; bus[ch][i0 + i] += y; send[ch][i0 + i] += y * 0.25; }
  }
}
// «обратная тарелка»: шум нарастает и обрывается к t1
function revSwell(t1, dur, v = 0.5, { hp = 1800, bus = KY } = {}) {
  const i0 = Math.round((t1 - dur) * SR), len = Math.round(dur * SR), F = [0, 1].map(() => [biquad('hp', hp, 0.7), biquad('lp', 11000, 0.7)]);
  for (let i = 0; i < len; i++) {
    const u = i / len, env = u ** 3 * smooth((len - i) / (0.004 * SR)) * v * 0.35;
    for (const ch of [0, 1]) {
      const y = bq(F[ch][1], bq(F[ch][0], wn())) * env;
      if (i0 + i >= 0 && i0 + i < N) { bus[ch][i0 + i] += y; send[ch][i0 + i] += y * 0.3; }
    }
  }
}

// ---------- гармония и сетка ----------
const CH = {
  Dm: { b: 38, pcs: [2, 5, 9] }, Dm9: { b: 38, pcs: [2, 5, 9, 4] }, D: { b: 38, pcs: [2, 6, 9] },
  Bb: { b: 34, pcs: [10, 2, 5] }, Bbmaj7: { b: 34, pcs: [10, 2, 5, 9] }, F: { b: 41, pcs: [5, 9, 0] }, C: { b: 36, pcs: [0, 4, 7] },
  Gm: { b: 43, pcs: [7, 10, 2] }, 'Gm/D': { b: 38, pcs: [7, 10, 2] }, A: { b: 33, pcs: [9, 1, 4] }, Asus: { b: 33, pcs: [9, 2, 4] },
  Eb: { b: 39, pcs: [3, 7, 10] }, 'Eb/D': { b: 38, pcs: [3, 7, 10] },
};
const voicing = (ch, top, n) => { const o = []; for (let m = top; o.length < n && m > 24; m--) if (ch.pcs.includes(((m % 12) + 12) % 12)) o.push(m); return o; };
const rootIn = (ch, lo) => { let m = lo; while ((((m - ch.pcs[0]) % 12) + 12) % 12) m++; return m; };
const thirdOf = (ch) => (((ch.pcs[1] - ch.pcs[0]) % 12) + 12) % 12;
// отрезок [t0, t1] — целые такты по per долей около beat (если возможно), иначе доли около beat
function splitBars(t0, t1, beat, per = 4) {
  const dur = t1 - t0, nbar = Math.max(1, Math.round(dur / (beat * per)));
  let nb = nbar * per, b = dur / nb;
  if (Math.abs(b / beat - 1) > 0.15) { nb = Math.max(1, Math.round(dur / beat)); b = dur / nb; }
  const out = [];
  for (let k = 0; k < nb; k += per) out.push({ t: t0 + k * b, nb: Math.min(per, nb - k), beat: b });
  return out;
}
const MARK = {}; // ключевые музыкальные моменты для отчёта и sfx.json
const mark = (k, t) => { MARK[k] = r3(t); };
const SECTIONS = [];
function run(name, t0, t1, chords, pat, beat, o = {}) {
  const bars = splitBars(t0, t1, beat, o.per ?? 4);
  const ch = typeof chords === 'function' ? chords(bars.length) : chords;
  bars.forEach((b, k) => Object.assign(b, { chord: ch[k % ch.length], k, n: bars.length, name, last: k === bars.length - 1 }));
  for (const b of bars) pat(b, o);
  SECTIONS.push({ name, t0, t1, beat: bars[0].beat });
  mark(name, t0);
  return bars;
}
// аккорды по тактам: цикл и обязательное окончание
const fill = (cycle, tail = []) => (n) => {
  const a = Array.from({ length: n }, (_, k) => cycle[k % cycle.length]);
  tail.forEach((c, j) => { const k = n - tail.length + j; if (k >= 0) a[k] = c; });
  return a;
};
const at = (b, x) => b.t + x * b.beat;
const chAt = (b, x = 0) => { const c = b.chord; return CH[Array.isArray(c) ? c[Math.min(c.length - 1, Math.floor(x / b.nb * c.length))] : c]; };
function chordSegs(b, fn) { const c = Array.isArray(b.chord) ? b.chord : [b.chord], d = b.nb * b.beat / c.length; c.forEach((nm, j) => fn(b.t + j * d, d, CH[nm], j)); }

// аккорды инструментами
const padCh = (t, dur, ch, vel, top = 69, n = 4, o = {}) => voicing(ch, top, n).forEach((m, j, a) => synth(STR, t + j * 0.01, dur, m, { ...PADS, vel, pan: a.length > 1 ? -0.45 + 0.9 * j / (a.length - 1) : 0, ...o }));
const tremCh = (t, dur, ch, vel, top = 81, n = 2, o = {}) => voicing(ch, top, n).forEach((m, j) => synth(STR, t, dur, m, { ...TREM, vel, pan: j % 2 ? 0.4 : -0.4, ...o }));
const brassCh = (t, dur, ch, vel, top = 62, n = 4, o = {}) => voicing(ch, top, n).forEach((m, j, a) => synth(BR, t + j * 0.004, dur, m, { ...BRASS, vel, pan: -0.3 + 0.6 * j / Math.max(1, a.length - 1), ...o }));
const stabCh = (t, ch, vel, top = 62, n = 4) => brassCh(t, 0.12, ch, vel, top, n, STAB);
const choirCh = (t, dur, ch, vel, top = 69, n = 4, o = {}) => voicing(ch, top, n).forEach((m, j, a) => choir(t + j * 0.02, dur, m, vel, { pan: a.length > 1 ? -0.5 + j / (a.length - 1) : 0, ...o }));
const bass = (t, dur, ch, vel = 0.5, o = {}) => synth(LO, t, dur, ch.b, { ...BASS, vel, ...o });
const glint = (t, v = 0.22) => [74, 77, 81, 86].forEach((m, j) => bell(t + j * 0.07, m, v, -0.3 + 0.2 * j));
function harpGliss(t, dur, ch, vel, lo = 55, hi = 91) {
  const ms = []; for (let m = lo; m <= hi; m++) if (ch.pcs.includes(m % 12)) ms.push(m);
  ms.forEach((m, k) => harp(t + k * dur / ms.length, m, vel * (0.6 + 0.4 * k / ms.length), (m - 73) / 30, 1.4));
}
// остинато шестнадцатыми: акценты 3+3+2 (на двух долях): прима, прима, квинта, прима, прима, терция, прима, октава
const OST = [[0, 1], [0, 0.5], [7, 0.62], [0, 0.95], [0, 0.5], [3, 0.62], [0, 0.92], [12, 0.58]];
function ostinato(b, vel, { lo = 50, oct = 1, from = 0, to = b.nb, pan = 0.3, sendK = 0.2, step = 0.25, bright = 7, cresc = null } = {}) {
  for (let j = Math.round(from / step); j * step < to - 1e-6; j++) {
    const x = j * step, ch = chAt(b, x), r = rootIn(ch, lo), [iv, a] = OST[j % 8], m = r + (iv === 3 ? thirdOf(ch) : iv);
    const t = at(b, x) + hum(0.002), v = vel * a * (cresc ? cresc(t) : 1), d = step * b.beat * 0.6;
    synth(STR, t, d, m, { ...SPIC, vel: v, pan: -pan, sendK, bright });
    if (oct) synth(STR, t, d, m + 12, { ...SPIC, vel: v * 0.5 * oct, pan, sendK, bright });
  }
}
// низкие струнные восьмыми
function lowStr(b, vel, { sendK = 0.12 } = {}) {
  for (let x = 0; x < b.nb - 1e-6; x += 0.5) {
    const ch = chAt(b, x), acc = x % 1 === 0 ? 1 : 0.7;
    synth(STR, at(b, x), b.beat * 0.4, ch.b + 12, { ...SPIC, vel: vel * acc, pan: 0.1, sendK, bright: 4 });
    synth(LO, at(b, x), b.beat * 0.4, ch.b, { ...SPIC, vel: vel * acc * 0.8, pan: 0, sendK: 0.05, bright: 2.5, fmin: 80 });
  }
}
// барабаны похода: одайко на 1 и 3, тайко «бум . . бум | бум . бум бум», щелчки на 2 и 4, дробь симэ на четвёртой доле
function marchDrums(b, v = 1, { fill = true } = {}) {
  const A = (x) => at(b, x);
  v *= 0.55;
  odaiko(A(0), 0.95 * v);
  if (b.nb > 2) odaiko(A(2), 0.7 * v);
  if (b.k % 2 === 1 && b.nb > 2.5) odaiko(A(2.5), 0.5 * v);
  for (const [x, vv, p] of [[0, 0.75, 0], [0.75, 0.45, 0.3], [1.5, 0.55, -0.3], [2, 0.7, 0], [2.75, 0.45, 0.3], [3, 0.6, -0.2], [3.5, 0.5, 0.2]]) if (x < b.nb - 1e-6) taiko(A(x), vv * v, p);
  for (const x of [1, 3]) if (x < b.nb) clack(A(x), 0.35 * v);
  if (fill && b.k % 2 === 1 && b.nb === 4) for (let j = 0; j < 4; j++) shime(A(3 + j * 0.25), (0.25 + 0.1 * j) * v, j % 2 ? 0.3 : -0.3);
}
// арфа восьмыми: вверх-вниз по аккорду
function harpArp(b, vel, { top = 79, step = 0.5 } = {}) {
  const seq = [0, 1, 2, 3, 4, 5, 4, 3, 2, 1];
  for (let j = 0; j * step < b.nb - 1e-6; j++) {
    const x = j * step, ch = chAt(b, x), vs = voicing(ch, top, 6).reverse(), m = vs[seq[j % seq.length]];
    harp(at(b, x) + hum(0.004), m, vel * (x % 1 ? 0.8 : 1), (m - 66) / 30, 1.6);
  }
}

// ---------- опорные времена ----------
const B1 = 0.4545;                                        // 132 в минуту — 2,2 шага галопа дружины в кадре
const tM = L(1) - 0.45;                                   // заставка → поход (смена сцены)
const tS2 = L(7) - 0.45, tS3 = L(13) - 0.45;              // лес и кудесник; вопрос Олега
const tP = E(18) + 0.15;                                  // карточка «ПРОРОЧЕСТВО»
const tS5 = L(25) - 0.45, tS6 = L(31) - 0.45;             // видения славы; море
const t6b = L(33) - 0.1, t6c = L(35) - 0.1;               // снаряды (замедление); хранитель
const tS7 = L(37) - 0.45, t7b = L(39) - 0.1, t7c = L(40) - 0.1, t7d = L(41) - 0.1;
const tH42 = L(42) - 0.3 + FRAME;                         // чёрный кадр «Но примешь ты смерть…»
const t8 = L(43) - 0.45, tG = E(60) + 0.15;               // прощание; карточка «ГОДЫ СПУСТЯ»
const t11 = L(61) - 0.45, t11b = L(65) - 0.3, t12 = L(67) - 0.45, t12b = L(71) - 0.3;
const t13 = L(73) - 0.45, t13b = L(75) - 0.3, t13c = L(77) - 0.1, t13d = L(78) - 0.1;
const t14 = L(79) - 0.45, t14b = L(81) - 0.1, t14c = L(83) - 0.1, tS = E(84) + 0.15; // выезд; холм; дождь; «СУДЬБА»
const ns = W('w_nastup'), t15b = L(86) - 0.1, t15c = L(88) - 0.1, t15d = E(90) + 0.05, tH91 = L(91) - 0.4 + FRAME;
const t16b = E(92) + 0.1, zm = W('w_zmiya'), t16c = zm - 0.3, tV = W('w_vskr') + FRAME; // змея; бросок и вспышка
const t17 = tV + 1.2, t17b = L(101) - 0.3, tEnd = E(NL) + 0.1, tF = EV.fin + 0.1 + FRAME;
const tShield = W('w_shchit') + 0.15 + FRAME, tFist = W('w_prezr') + 0.1 + FRAME;
const PROJ = [W('w_prashch'), W('w_strela'), W('w_kinzhal')].map((h) => h + 0.35); // снаряд долетает (video/src/scenes1.js)
const ACCENTS = []; // окна громких музыкальных акцентов внутри строк — не участвуют в подгонке громкости строки

// ---------- заставка ----------
mark('intro', 0);
drone(0, tM + 1.2, 38, 0.55, { fadeIn: 0.25, fadeOut: 1.0, cut: 160 });
impact(0.9, 1, { metal: 0.55, tail: 1.1 }); mark('intro_bramm', 0.9);
bramm(0.86, 38, 1.3, 1, { iv: [0, 12, 19] });
choirCh(0.9, 1.4, CH.Dm, 0.35, 69, 4, { att: 0.08, rel: 1.0 });
{ // подъём к походу: остинато и тайко за четыре доли до смены сцены
  const b = { t: tM - 4 * B1, nb: 4, beat: B1, chord: 'Dm', k: 1 };
  ostinato(b, 0.8, { cresc: (t) => lerp(0.3, 1, (t - b.t) / (4 * B1)) });
  taiko(at(b, 0), 0.4); taiko(at(b, 2), 0.5); taiko(at(b, 2.75), 0.45); taiko(at(b, 3), 0.6);
  for (let j = 0; j < 8; j++) shime(at(b, 3 + j / 8), 0.2 + 0.05 * j, j % 2 ? 0.3 : -0.3);
  revSwell(tM, 1.6, 0.5);
  riser(tM - 2.0, tM, 0.35);
}

// ---------- ст. 1: поход ----------
run('pohod', tM, tS2, fill(['Dm', 'Dm', 'Bb', 'C', 'Dm', 'Bb', 'Gm', 'A']), (b) => {
  if (b.k === 0) impact(b.t, 0.9, { metal: 0.2 });
  marchDrums(b, 1);
  ostinato(b, 0.55);
  lowStr(b, 0.45);
  chordSegs(b, (t, d, ch) => { brassCh(t, d, ch, 0.3, 62, 4, { swell: [0.75, 1.05] }); bass(t, d, ch, 0.5); });
}, B1);
glint(W('w_bron') - 0.05);                                // золотая чешуя брони ловит солнце
impact(tS2, 0.85, { metal: 0.15, tail: 1.2 });           // смена сцены: в тёмный лес

// ---------- ст. 2: лес, кудесник ----------
drone(tS2 - 0.2, tS5 + 0.6, 38, 0.5, { fadeIn: 1.0, fadeOut: 0.8, cut: 140 });
run('les', tS2, tS3, fill(['Dm', 'Bb', 'Gm', 'A', 'Dm', 'Bb', 'Eb', 'A']), (b) => {
  const d = b.nb * b.beat, ch = chAt(b);
  choirCh(b.t, d + 0.5, ch, 0.42, 67, 4, { vow: 'о', att: 1.0, rel: 1.2 });
  bass(b.t, d, ch, 0.35, { att: 0.4 });
  tremCh(b.t, d, ch, 0.2, 81, 2);
  drum(b.t, 50, 0.45, { dec: 0.5, bend: 0.8, skin: 0.15, skinF: 600, sendK: 0.45 });
  if (b.nb > 2) drum(at(b, 2.5), 47, 0.28, { dec: 0.45, bend: 0.8, skin: 0.12, skinF: 600, sendK: 0.45 });
  bell(b.t + 0.05, voicing(ch, 88, 1)[0], 0.12, rnd() - 0.5);
}, 0.8);
choirCh(W('w_perun') + 0.05, 1.6, CH.Dm, 0.3, 74, 3, { att: 0.15, rel: 1.0 }); // знак Перуна на посохе
harpGliss(W('w_vest') - 0.2, 0.7, CH.Dm, 0.25);           // руны кружат

// ---------- ст. 3: «Скажи мне, кудесник…» ----------
run('vopros', tS3, tP, fill(['Dm', 'Gm', 'Bb', 'A', 'Dm', 'Gm', 'Eb', 'A'], ['A']), (b) => {
  chordSegs(b, (t, d, ch) => { padCh(t, d + 0.2, ch, 0.3, 65, 4); bass(t, d, ch, 0.4); });
  for (let x = 0; x < b.nb - 1e-6; x += 0.5) {
    const ch = chAt(b, x), r = rootIn(ch, 40);
    synth(STR, at(b, x), b.beat * 0.3, r + ((x * 2) % 4 === 3 ? 7 : 0), { ...SPIC, vel: 0.4 * (x % 1 ? 0.7 : 1), bright: 4, pan: 0.15 });
  }
  taiko(b.t, 0.45); if (b.nb > 2) taiko(at(b, 2), 0.35);
  clack(at(b, 1), 0.15); if (b.nb > 3) clack(at(b, 3), 0.15);
}, 0.6);
drum(W('w_zeml') + 0.1, 42, 0.45, { dec: 0.8, bend: 1.5, skin: 0.3, sendK: 0.5 });   // сыплется могильная земля
subdrop(W('w_zeml') + 0.1, 70, 30, 1.5, 0.35);
ACCENTS.push([W('w_zeml') + 0.05, W('w_zeml') + 1.0]);
riser(E(18) - 1.2, tP, 0.3);

// ---------- карточка «ПРОРОЧЕСТВО» ----------
impact(tP, 1, { metal: 0.3, tail: 1.2 }); mark('card_prorochestvo', tP);
bramm(tP - 0.02, 38, 1.1, 1, { iv: [0, 12, 15] });
choirCh(tP, 1.3, CH.Dm, 0.5, 74, 4, { att: 0.06, rel: 1.1 });

// ---------- ст. 4: пророчество ----------
run('prorochestvo', tP, tS5, fill(['Dm', 'Bb', 'Gm', 'Asus', 'Dm', 'F', 'Gm', 'A'], ['A']), (b) => {
  const d = b.nb * b.beat, ch = chAt(b);
  choirCh(b.t, d + 0.4, ch, 0.38, 72, 4, { att: 1.1, rel: 1.3 });
  choirCh(b.t, d + 0.4, ch, 0.3, 57, 2, { vow: 'у', att: 1.1, rel: 1.3 });
  bass(b.t, d, ch, 0.35, { att: 0.5 });
  tremCh(b.t, d, ch, 0.18, 86, 2);
  heart(b.t, 0.45); if (b.nb > 2) heart(at(b, 2), 0.3);
  glass(b.t + 0.2, d, voicing(ch, 93, 1)[0], 0.08);
}, 0.75);
[81, 86, 89].forEach((m, j) => glass(W('w_yazyk') + j * 0.15, 1.6, m, 0.07, { att: 0.3 })); // свет от губ
riser(W('w_chele') - 0.2, tS5, 0.55, { f0: 400, f1: 8000 });                            // луч на челе → видения
synth(STR, W('w_chele'), tS5 - W('w_chele'), 62, { ...PADS, vel: 0.4, att: 0.3, rel: 0.1, swell: [0.3, 1.2], bend: (t) => 12 * (t / (tS5 - W('w_chele'))) ** 2 });
revSwell(tS5, 1.2, 0.6);

// ---------- ст. 5: видения славы ----------
drone(tS5 - 0.3, tH42, 38, 0.45, { fadeIn: 0.5, fadeOut: 0.05, cut: 160 });
run('slava', tS5, tS6, fill(['Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'C', 'Gm', 'A'], ['Gm', 'A']), (b) => {
  if (b.k === 0) impact(b.t, 1, { metal: 0.3 });
  marchDrums(b, 0.95);
  ostinato(b, 0.55);
  lowStr(b, 0.45);
  chordSegs(b, (t, d, ch) => { brassCh(t, d, ch, 0.38, 65, 4, { swell: [0.7, 1.1] }); bass(t, d, ch, 0.5); choirCh(t, d + 0.2, ch, 0.32, 76, 4, { att: 0.25 }); });
}, 0.5);
glint(W('w_imya') + 0.1);                                 // имя золотом на стяге
impact(tShield, 0.5, { metal: 0.4, tail: 0.9 }); mark('shield', tShield); // щит прибит к вратам
ACCENTS.push([tShield - 0.05, tShield + 0.9]);

// ---------- ст. 6: шторм, снаряды, хранитель ----------
run('shtorm', tS6, t6b, fill(['Dm', 'Bb', 'Gm', 'A']), (b) => {
  if (b.k === 0) impact(b.t, 0.8, { metal: 0.15 });
  ostinato(b, 0.5, { lo: 45, oct: 0.6 });
  for (const x of [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5]) if (x < b.nb - 1e-6) taiko(at(b, x), x % 1 ? 0.35 : 0.55, x % 1 ? 0.3 : -0.3);
  odaiko(b.t, 0.8);
  chordSegs(b, (t, d, ch) => { padCh(t, d + 0.2, ch, 0.3, 69, 4); bass(t, d, ch, 0.5); });
}, 0.5);
{ const wv = W('w_val'); choirCh(wv - 0.4, 2.0, CH.Bb, 0.45, 74, 4, { att: 0.9, swell: [0.4, 1], rel: 0.8 }); revSwell(wv + 0.6, 1.0, 0.4); }
mark('zamedlenie', t6b);                                  // снаряды в замедлении: подушка и низкие удары
padCh(t6b, L(34) - t6b, CH.Dm9, 0.45, 69, 4, { att: 0.3 });
padCh(L(34) - 0.05, t6c - L(34) + 0.3, CH.Bbmaj7, 0.5, 69, 4, { att: 0.5 });
tremCh(L(34) - 0.05, t6c - L(34) + 0.3, CH.Bbmaj7, 0.2, 84, 2);
choirCh(t6b, t6c - t6b + 0.3, CH.Dm, 0.35, 62, 3, { vow: 'у', att: 0.6 });
bass(t6b, t6c - t6b, CH.Dm, 0.35, { att: 0.4 });
for (const T0 of PROJ) {
  revSwell(T0, 0.55, 0.3);
  drum(T0, 48, 0.55, { dec: 0.6, bend: 1.2, skin: 0.3, skinF: 900, sendK: 0.5 });
  subdrop(T0, 80, 32, 1.0, 0.35);
  ACCENTS.push([T0 - 0.4, T0 + 0.7]);
}
run('hranitel', t6c, tS7, fill(['F', 'Bb', 'F', 'C', 'Dm', 'Bb', 'C', 'A'], ['A']), (b) => {
  chordSegs(b, (t, d, ch) => { choirCh(t, d + 0.4, ch, 0.38, 77, 4, { att: 0.5 }); padCh(t, d + 0.3, ch, 0.28, 69, 4); bass(t, d, ch, 0.4); });
  odaiko(b.t, 0.55); if (b.nb > 2) taiko(at(b, 2), 0.35);
  ostinato(b, 0.3, { lo: 62, oct: 0 });
}, 0.6);
harpGliss(W('w_khran') - 0.25, 0.8, CH.F, 0.3);           // светящийся купол

// ---------- ст. 7: конь → галоп → удар «Но примешь ты смерть…» ----------
run('kon', tS7, t7b, fill(['Dm', 'Bb', 'C', 'Dm']), (b) => {
  if (b.k === 0) impact(b.t, 0.75, { metal: 0.15 });
  marchDrums(b, 0.85); ostinato(b, 0.5); lowStr(b, 0.4);
  chordSegs(b, (t, d, ch) => { brassCh(t, d, ch, 0.3, 62, 4, { swell: [0.75, 1.05] }); bass(t, d, ch, 0.5); });
}, 0.5);
run('strely', t7b, t7c, fill(['Gm', 'A']), (b) => {
  marchDrums(b, 0.85, { fill: false }); ostinato(b, 0.55); lowStr(b, 0.45);
  chordSegs(b, (t, d, ch) => { brassCh(t, d, ch, 0.32, 64, 4, { swell: [0.7, 1.1] }); bass(t, d, ch, 0.5); });
}, 0.5);
run('galop', t7c, t7d, fill(['Dm', 'Bb']), (b) => {
  marchDrums(b, 1);
  for (let x = 0.5; x < b.nb - 1e-6; x += 1) snare(at(b, x), 0.25);
  ostinato(b, 0.6); lowStr(b, 0.5);
  chordSegs(b, (t, d, ch) => { brassCh(t, d, ch, 0.4, 65, 4, { swell: [0.7, 1.1] }); choirCh(t, d + 0.2, ch, 0.3, 74, 4, { att: 0.3 }); bass(t, d, ch, 0.55); });
}, 0.45);
run('secha', t7d, tH42 - 0.12, fill(['Gm', 'A']), (b) => {
  marchDrums(b, 1.05);
  ostinato(b, 0.65, { cresc: (t) => lerp(0.8, 1.15, (t - t7d) / (tH42 - t7d)) }); lowStr(b, 0.55);
  chordSegs(b, (t, d, ch) => {
    brassCh(t, d, ch, 0.45, 65, 4, { swell: [0.7, 1.2], rel: 0.05 });
    choirCh(t, d, ch, 0.35, 76, 4, { att: 0.3, rel: 0.08 }); bass(t, d, ch, 0.55, { rel: 0.05 });
  });
}, 0.42);
roll(tH42 - 2.4, tH42 - 0.12, 0.15, 0.7, 0.07, 0.035);
riser(t7d + 0.3, tH42 - 0.12, 0.5);
revSwell(tH42 - 0.12, 1.5, 0.5);
impact(tH42, 1.2, { metal: 0, tail: 1.8, noise: 0.5 }); mark('smert_udar', tH42);
bramm(tH42, 38, 0.5, 0.9, { iv: [0, 12], fMax: 700, fSus: 160, rel: 0.5 });
subdrop(tH42, 70, 26, 2.6, 0.7);
glass(L(42) + 0.6, E(42) - L(42) + 0.2, 86, 0.05, { att: 1.0, rel: 1.5 }); // из темноты проступает глаз коня
heart(L(42) + 0.6, 0.25);

// ---------- ст. 8–10: прощание с конём ----------
run('proshchanie', t8, tG, fill(['Dm', 'Bb', 'F', 'C', 'Gm', 'Dm', 'Bb', 'A', 'Bb', 'F', 'Gm', 'Dm', 'Bb', 'F', 'C', 'Dm'], ['Gm', 'Asus', 'A']), (b) => {
  const d = b.nb * b.beat, ch = chAt(b);
  padCh(b.t, d + 0.3, ch, b.k === 0 ? 0.24 : 0.3, 72, 4, { att: b.k === 0 ? 1.5 : 0.8 });
  synth(LO, b.t, d, ch.b + 12, { ...CELLO, vel: 0.35, att: b.k === 0 ? 1.2 : 0.25 });
  if (b.k > 0) harpArp(b, 0.22);
}, 0.85);
[86, 89, 93].forEach((m, j) => bell(W('w_strem') + 0.05 + j * 0.09, m, 0.2, 0.2 + 0.1 * j)); // позлащённое стремя

// ---------- карточка «ГОДЫ СПУСТЯ» ----------
impact(tG, 0.8, { metal: 0.35, tail: 0.9 }); mark('card_gody', tG);
bramm(tG - 0.02, 38, 0.7, 0.85);
revSwell(tG, 1.0, 0.45);

// ---------- ст. 11: пир ----------
synth(STR, t11, t11b - t11 + 0.3, 50, { ...NASAL, vel: 0.5, pan: -0.3 });   // бурдон квинтой (колёсная лира)
synth(STR, t11, t11b - t11 + 0.3, 57, { ...NASAL, vel: 0.4, pan: 0.3 });
run('pir', t11, t11b, fill(['Dm', 'C', 'Dm', 'C', 'Dm', 'Bb', 'C', 'Dm']), (b) => {
  for (const [x, v] of [[0, 0.42], [1.5, 0.32], [2, 0.38], [3, 0.28]]) if (x < b.nb - 1e-6) frameDrum(at(b, x), v);
  for (const x of [0.5, 1, 2.5, 3.5]) if (x < b.nb - 1e-6) clack(at(b, x), 0.16, 0.2);
  for (let x = 0; x < b.nb - 1e-6; x += 0.5) jingle(at(b, x), x % 1 ? 0.12 : 0.18);
  const ch = chAt(b), vs = voicing(ch, 74, 3);
  synth(LO, b.t, b.beat * 0.4, ch.b, { ...BASS, vel: 0.45, rel: 0.1 });
  if (b.nb > 2) synth(LO, at(b, 2), b.beat * 0.4, ch.b + 7, { ...BASS, vel: 0.35, rel: 0.1 });
  [0, 1.5, 2, 3].forEach((x, j) => { if (x < b.nb - 1e-6) harp(at(b, x), vs[j % 3], 0.22, j % 2 ? 0.3 : -0.3, 0.8); });
}, 0.44);
run('pamyat', t11b, t12, fill(['Dm', 'Bb', 'Gm', 'A']), (b) => {     // «поминают… битвы» — эхо похода
  ostinato(b, 0.3, { oct: 0.4, sendK: 0.6 });
  odaiko(b.t, 0.4); if (b.nb > 2) taiko(at(b, 2), 0.25);
  chordSegs(b, (t, d, ch) => choirCh(t, d + 0.3, ch, 0.3, 69, 4, { vow: 'о', att: 0.6 }));
}, 0.45);

// ---------- ст. 12: «А где мой товарищ?» → «почил» ----------
run('gde_kon', t12, t12b, fill(['F', 'C', 'Dm', 'Bb']), (b) => {
  chordSegs(b, (t, d, ch) => padCh(t, d + 0.2, ch, 0.38, 72, 4, { att: 0.3 }));
  for (let x = 0; x < b.nb - 1e-6; x += 0.5) {
    const ch = chAt(b, x), vs = voicing(ch, 74, 3);
    synth(STR, at(b, x), 0.08, x % 1 ? vs[1] : ch.b + 12, { ...SPIC, vel: 0.3, bright: 2.5, sendK: 0.3 });
  }
}, 0.55);
choirCh(W('w_burn') - 0.3, 1.8, CH.F, 0.35, 77, 4, { att: 0.15 });   // вспышка-воспоминание: конь скачет в золоте
drone(t12b - 0.3, t14 + 0.5, 38, 0.45, { fadeIn: 0.6, fadeOut: 0.4, cut: 130 });
run('trevoga', t12b, t13, fill(['Gm/D', 'Eb/D', 'Dm']), (b) => {
  const d = b.nb * b.beat, ch = chAt(b);
  tremCh(b.t, d, ch, 0.15, 62, 2, { tremRate: 14 });
  bass(b.t, d, CH.Dm, 0.35, { att: 0.3 });
  heart(b.t, 0.35);
}, 0.75);

// ---------- ст. 13: поник → гнев → встаёт ----------
run('ponik', t13, t13b, fill(['Dm', 'Bb']), (b) => {
  const d = b.nb * b.beat;
  padCh(b.t, d + 0.3, chAt(b), 0.34, 62, 3, { att: 0.6 });
  heart(b.t, 0.35);
}, 0.8);
run('gnev', t13b, t13c, fill(['Dm', 'Eb', 'Dm', 'A']), (b) => {
  for (let x = 0; x < b.nb - 1e-6; x += 0.5) {
    const ch = chAt(b, x), r = rootIn(ch, 38), v = 0.5 * (x % 1 ? 0.7 : 1);
    synth(STR, at(b, x), b.beat * 0.3, r, { ...SPIC, vel: v, bright: 5 });
    synth(STR, at(b, x), b.beat * 0.3, r + 12, { ...SPIC, vel: v * 0.6, bright: 5, pan: 0.3 });
  }
  odaiko(b.t, 0.6); taiko(b.t, 0.6); if (b.nb > 2) taiko(at(b, 2), 0.5);
  chordSegs(b, (t, d, ch) => { stabCh(t, ch, 0.5, 62, 4); bass(t, d, ch, 0.45); });
}, 0.45);
impact(tFist, 0.4, { metal: 0.1, tail: 0.8 }); mark('fist', tFist);   // кулак по столу, лицо кудесника рассыпается
ACCENTS.push([tFist - 0.05, tFist + 0.8]);
run('pamyat2', t13c, t13d, fill(['Bb', 'F']), (b) => chordSegs(b, (t, d, ch) => padCh(t, d + 0.3, ch, 0.28, 70, 4, { att: 0.3 })), 0.7);
run('vstaet', t13d, t14, fill(['Gm', 'A']), (b) => {
  ostinato(b, 0.35, { lo: 45, oct: 0.5, cresc: (t) => lerp(0.4, 1, (t - t13d) / (t14 - t13d)) });
  chordSegs(b, (t, d, ch) => { bass(t, d, ch, 0.45, { rel: 0.08 }); brassCh(t, d, ch, 0.3, 62, 4, { swell: [0.4, 1.1], rel: 0.08 }); });
}, 0.45);
riser(t13d, t14, 0.4);
impact(t14, 0.8, { metal: 0.15 });

// ---------- ст. 14: выезд → холм → дождь, пыль, ветер ----------
run('vyezd', t14, t14b, fill(['Dm', 'Gm', 'Dm', 'A']), (b) => {
  odaiko(b.t, 0.6); if (b.nb > 2) taiko(at(b, 2), 0.45);
  clack(at(b, 1), 0.15); if (b.nb > 3) clack(at(b, 3), 0.15);
  lowStr(b, 0.35);
  chordSegs(b, (t, d, ch) => { choirCh(t, d + 0.3, ch, 0.3, 62, 3, { vow: 'о', att: 0.5 }); bass(t, d, ch, 0.4); });
}, 0.65);
mark('holm', t14b);                                         // пустота: тонкий высокий тон и гул
drone(t14b - 0.2, tS + 0.3, 38, 0.4, { cut: 110, fadeIn: 0.6, fadeOut: 0.3 });
drum(t14b, 46, 0.4, { dec: 0.6, bend: 0.8, skin: 0.2, skinF: 600, sendK: 0.5 });
glass(t14b, t14c - t14b + 0.5, 86, 0.06, { att: 1.2 });
glass(t14b + 0.3, t14c - t14b + 0.2, 81, 0.045, { att: 1.4 });
for (let t = t14c; t < tS - 0.8; t += 1.6) drum(t, 45, 0.3, { dec: 0.6, bend: 0.8, skin: 0.15, skinF: 500, sendK: 0.5 });
riser(tS - 1.4, tS, 0.3, { f0: 200, f1: 3000 });

// ---------- карточка «СУДЬБА» ----------
impact(tS, 1, { metal: 0.3, tail: 1.2 }); mark('card_sudba', tS);
bramm(tS - 0.02, 38, 0.8, 1, { iv: [0, 12, 13] });        // ре и ми-бемоль — тёмный кластер
choirCh(tS, 1.4, CH['Eb/D'], 0.3, 57, 3, { vow: 'у', att: 0.1, rel: 1.2 });

// ---------- ст. 15: череп, «Спи, друг», тризна, напряжение ----------
drone(tS, tV, 38, 0.42, { cut: 120, fadeIn: 0.8, fadeOut: 0.03 });
synth(STR, L(85) - 0.3, ns + 0.35 - L(85) + 0.3, 50, { ...PADS, vel: 0.25, att: 0.5, rel: 0.4 });
drum(ns + 0.35 + FRAME, 44, 0.55, { dec: 0.5, bend: 1.0, skin: 0.25, skinF: 700, sendK: 0.45 }); // сапог встал на череп
run('spi_drug', t15b, t15c, fill(['Dm9', 'Bbmaj7']), (b) => chordSegs(b, (t, d, ch) => {
  padCh(t, d + 0.4, ch, 0.4, 72, 4, { att: 0.6 }); choirCh(t, d + 0.4, ch, 0.3, 62, 2, { vow: 'у', att: 0.8 });
}), 0.9);
run('trizna', t15c, t15d, fill(['Dm', 'Gm', 'Dm', 'Eb']), (b) => {
  for (const [x, f, v] of [[0, 70, 0.55], [1.5, 62, 0.4], [2, 70, 0.45], [3, 55, 0.5], [3.5, 62, 0.3]]) if (x < b.nb - 1e-6) lowTom(at(b, x), v, f, ((x * 0.37) % 0.6) - 0.3);
  chordSegs(b, (t, d, ch) => { choirCh(t, d + 0.3, ch, 0.35, 57, 3, { vow: 'о', att: 0.4 }); bass(t, d, ch, 0.4); });
}, 0.62);
mark('napryazhenie', t15d);                                 // перед «Так вот где таилась погибель моя!»
riser(t15d - 0.3, tH91 - 0.05, 0.5);
[50, 51].forEach((m, j) => synth(STR, t15d - 0.2, tH91 - t15d + 0.1, m, { ...TREM, vel: 0.22, att: 0.4, swell: [0.3, 1.3], pan: j ? 0.35 : -0.35, rel: 0.05 }));
[1.25, 0.8, 0.45].forEach((d, j) => heart(tH91 - d, 0.35 + 0.1 * j));
drum(tH91, 42, 0.8, { dec: 0.7, bend: 1.6, skin: 0.35, skinF: 700, sendK: 0.5 }); mark('napryazhenie_udar', tH91);
subdrop(tH91, 80, 30, 1.6, 0.5);

// ---------- ст. 16: змея ----------
[[38, 0.25], [39, 0.2], [50, 0.14], [51, 0.12]].forEach(([m, v], j) => synth(STR, tH91, t16b - tH91, m, { ...TREM, vel: v, att: 0.6, pan: j % 2 ? 0.35 : -0.35 }));
for (let t = tH91 + 0.9; t < t16b - 0.5; t += 1.15) heart(t, 0.35);
mark('zmeya', t16c);
[[74, 0.45, -0.4], [75, 0.4, 0.4], [69, 0.3, 0], [38, 0.45, -0.2], [39, 0.4, 0.2]].forEach(([m, v, p]) => synth(STR, t16c, tV - 0.08 - t16c, m, { ...TREM, vel: v, att: 2.0, swell: [0.2, 1.4, 2], pan: p, rel: 0.03 }));
{ let t = t16c + 0.4; while (t < tV - 0.3) { const u = (t - t16c) / (tV - t16c); heart(t, 0.3 + 0.35 * u); t += lerp(1.15, 0.42, u); } }
synth(STR, tV - 1.6, 1.52, 62, { ...TREM, vel: 0.3, att: 0.3, bend: (t) => 12 * (t / 1.52) ** 2, swell: [0.3, 1.3], rel: 0.03 });
revSwell(tV - 0.08, 1.4, 0.5);
riser(tV - 2.5, tV - 0.08, 0.4);
impact(tV, 1.25, { metal: 0.25, tail: 0.6, noise: 0.6 }); mark('vskriknul', tV);  // бросок змеи и белая вспышка
bramm(tV, 38, 0.3, 1, { iv: [0, 12, 13], rel: 0.25 });
noiseBurst(tV, 0.35, 0.12, { lpF: 12000, hpF: 1500 });

// ---------- ст. 17: эпилог ----------
mark('epilog', t17);
drone(t17, TOTAL, 38, 0.32, { fadeIn: 3, fadeOut: 2, cut: 120 });
run('epilog', t17, t17b, fill(['Dm', 'Bb', 'F', 'C', 'Gm', 'Dm', 'Bb', 'A', 'Dm', 'F', 'Bb', 'C', 'Dm', 'Gm', 'A'], ['A']), (b) => {
  const d = b.nb * b.beat, ch = chAt(b);
  padCh(b.t, d + 0.5, ch, 0.3, 72, 4, { att: b.k === 0 ? 2.0 : 0.9, rel: 1.0 });
  choirCh(b.t, d + 0.5, ch, 0.28, 69, 4, { vow: 'о', att: b.k === 0 ? 2.2 : 1.0 });
  bass(b.t, d, ch, 0.3, { att: 0.6 });
}, 0.85, { per: 2 });
run('epilog_pohod', t17b, tEnd, fill(['Dm', 'Bb', 'Gm', 'A']), (b) => {  // «Бойцы поминают минувшие дни» — эхо похода
  ostinato(b, 0.3, { oct: 0.5, sendK: 0.5, cresc: (t) => lerp(0.6, 1.1, (t - t17b) / (tEnd - t17b)) });
  odaiko(b.t, 0.45); if (b.nb > 2) taiko(at(b, 2), 0.3);
  chordSegs(b, (t, d, ch) => { choirCh(t, d + 0.3, ch, 0.32, 72, 4, { att: 0.5 }); padCh(t, d + 0.3, ch, 0.25, 69, 4); bass(t, d, ch, 0.4); });
}, B1);
run('k_finalu', tEnd, tF - 0.1, fill(['Gm', 'A']), (b) => {
  marchDrums(b, 0.9, { fill: false });
  ostinato(b, 0.6, { cresc: (t) => lerp(0.7, 1.15, (t - tEnd) / (tF - tEnd)) });
  chordSegs(b, (t, d, ch) => { brassCh(t, d, ch, 0.4, 65, 4, { swell: [0.5, 1.2], rel: 0.05 }); choirCh(t, d, ch, 0.35, 74, 4, { att: 0.3, rel: 0.1 }); bass(t, d, ch, 0.5, { rel: 0.05 }); });
}, B1);
roll(tF - 1.6, tF - 0.1, 0.2, 0.75, 0.07, 0.035);
riser(tEnd, tF - 0.1, 0.5);
revSwell(tF - 0.1, 1.5, 0.6);

// ---------- финал: удар, брамм и аккорд ----------
impact(tF, 1.3, { metal: 0.5, tail: 1.6 }); mark('final', tF);
bramm(tF - 0.02, 38, 2.4, 1.1, { iv: [0, 12, 19], rel: 1.2 });
{
  const fd = Math.max(1.5, TOTAL - tF - 2.6);
  choirCh(tF, fd, CH.Dm, 0.6, 74, 5, { att: 0.05, rel: 1.5 });
  padCh(tF, fd, CH.Dm, 0.5, 74, 5, { att: 0.05, rel: 1.4 });
  brassCh(tF, fd * 0.8, CH.Dm, 0.5, 62, 4, { rel: 1.0 });
  synth(LO, tF, fd, 38, { ...BASS, vel: 0.6, rel: 1.2 });
  odaiko(tF, 1);
  harpGliss(tF + 0.05, 0.6, CH.Dm, 0.3);
}

// ---------- реверберация (Freeverb-подобная) ----------
function reverb(src, room = 0.84, damp = 0.28) {
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617], aps = [556, 441, 341, 225], pre = Math.round(0.022 * SR);
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
// средний квадрат суммы каналов в окнах (off — сдвиг окон, для голоса без вступления)
const msIn = (chs, wins, off = 0) => {
  let s = 0, c = 0;
  for (const [a, b] of wins) for (let i = Math.max(0, Math.floor((a + off) * SR)); i < Math.min(chs[0].length, (b + off) * SR); i++) { for (const x of chs) s += x[i] * x[i]; c++; }
  return s / Math.max(1, c);
};
// окна минус исключения
function minus(wins, excl) {
  let out = wins.map((w) => [...w]);
  for (const [a, b] of excl) out = out.flatMap(([x, y]) => (b <= x || a >= y ? [[x, y]] : [[x, Math.max(x, a)], [Math.min(y, b), y]].filter(([p, q]) => q - p > 0.05)));
  return out;
}

// ---------- сумма музыки ----------
const busReport = (() => { // баланс шин (сухо, K дБFS) — для настройки
  const W5 = { заставка: [[0.3, tM]], поход: [[tM, tS2]], пророчество: [[tP, tS5]], слава: [[tS5, tS6]], прощание: [[t8, tG]], пир: [[t11, t11b]], змея: [[t16c, tV]], эпилог: [[t17, t17b]], финал: [[tF, tF + 3]] };
  const kb = Object.fromEntries(Object.entries(BUS).map(([nm, b]) => [nm, b.map(kWeight)]));
  return Object.entries(W5).map(([w, wins]) => `  ${w}: ` + Object.entries(kb).map(([nm, k]) => `${nm} ${dB(msIn(k, wins)).toFixed(1)}`).filter((x) => !x.endsWith('-200.0')).join(', ')).join('\n');
})();
const wet = reverb(send, 0.86, 0.3);
const music = [0, 1].map((ch) => {
  const o = wet[ch];
  for (const b of Object.values(BUS)) { const x = b[ch]; for (let i = 0; i < N; i++) o[i] += x[i]; }
  // срез ниже 30 Гц и мягкая полка −4 дБ ниже ~80 Гц: низ трейлера остаётся, но не съедает запас громкости
  const hp = biquad('hp', 30, 0.7), ls = lowShelf(80, -4);
  for (let i = 0; i < N; i++) o[i] = bq(ls, bq(hp, o[i]));
  return o;
});
for (const k of Object.keys(BUS)) BUS[k] = null; // память
// провалы перед большими ударами и тишина ~1 с после «вскрикнул»
const MUTE = [[0, 1]];
for (const th of [tH42, tV]) MUTE.push([th - 0.13, 1], [th - 0.09, 0.04], [th - 0.008, 0.04], [th, 1]);
MUTE.push([tV + 0.3, 1], [tV + 0.8, 0], [t17 - 0.05, 0], [t17 + 0.6, 1]);
MUTE.push([tF - 0.13, 1], [tF - 0.09, 0.04], [tF - 0.008, 0.04], [tF, 1]);
{ const g = renderCurve(MUTE); for (const x of music) for (let i = 0; i < N; i++) x[i] *= g[i]; }

// ---------- голос ----------
const rawV = execFileSync('ffmpeg', ['-v', 'error', '-i', path.join(POEM, 'voice.mp3'), '-f', 'f32le', '-ac', '1', '-ar', String(SR), '-'], { maxBuffer: 1 << 29 });
const voiceA = new Float32Array(rawV.buffer, rawV.byteOffset, rawV.length / 4);
const speechAll = LINES.map((_, i) => [L(i + 1), E(i + 1)]); // окна речи, секунды ролика
const kv = kWeight(voiceA);
// в ролике голос (моно) идёт в оба канала
const voiceMS = 2 * msIn([voiceA], speechAll, -V0), voiceKMS = 2 * msIn([kv], speechAll, -V0);
const vR = dB(voiceMS), vK = dB(voiceKMS);
// опора по строке: K-уровень голоса этой строки (в пределах −6…+3 дБ от среднего) — тихие строки получают тише фон
const VREF = [null, ...speechAll.map((w) => clamp(dB(2 * msIn([kv], [w], -V0)), vK - 6, vK + 3))];
const vRef = (n) => VREF[n];
// опора для шума в окне [a, b]: строки, которые оно задевает (по длительности), иначе — средний голос
// кривая опоры (дБ) по времени: в строке — её голос, в паузах — плавно между соседними
const VCURVE = (() => {
  const k = [];
  for (let n = 1; n <= NL; n++) k.push([L(n) + 0.02, VREF[n]], [E(n) - 0.02, VREF[n]]);
  return (t) => {
    if (t <= k[0][0]) return k[0][1];
    for (let i = 1; i < k.length; i++) if (t <= k[i][0]) { const [a, va] = k[i - 1], [b, vb] = k[i]; return va + (vb - va) * smooth((t - a) / Math.max(1e-6, b - a)); }
    return k[k.length - 1][1];
  };
})();
function refAt(a, b) {
  let s = 0, d = 0;
  for (let n = 1; n <= NL; n++) { const o = Math.min(b, E(n)) - Math.max(a, L(n)); if (o > 0) { s += o * db(VREF[n]) ** 2; d += o; } }
  return d > 0.2 ? dB(s / d) : vK;
}

// ---------- шумы ----------
const sfx = stereo(), sfxSend = stereo();
const SFX = {}, SFXWIN = {};
const log = (k, v) => { (SFX[k] ??= []).push(r3(v)); };
const nbuf = (sec) => new Float32Array(Math.max(1, Math.round(sec * SR)));
const peakNorm = (x) => { let p = 0; for (const v of x) p = Math.max(p, Math.abs(v)); if (p > 0) for (let i = 0; i < x.length; i++) x[i] /= p; return x; };
// буфер x (моно с панорамой pan — число или функция времени, или стерео [L, R]) ставится с t0;
// громкость — target дБ к голосу (K-взвешенно) в окне буфера [w0, w0 + win]
// follow — длинный фон (копыта, ветер, дождь, шипение) идёт за громкостью голоса по строкам
function place(t0, x, target, pan, win, key, { sendK = 0.12, w0 = 0, follow = false } = {}) {
  const st = Array.isArray(x), chs = st ? x : [x], len = chs[0].length;
  const a = Math.max(0, Math.round(w0 * SR)), n = Math.max(1, Math.min(len - a, Math.round(win * SR)));
  let s = 0;
  for (const c of chs) { const kx = kWeight(c); for (let i = a; i < a + n; i++) s += kx[i] * kx[i]; }
  const rd = refAt(t0 + w0, t0 + w0 + win), ref = db(rd) ** 2;
  let g = Math.sqrt(ref * db(target) ** 2 / ((st ? s : 2 * s) / n));
  const g0 = g, i0 = Math.round(t0 * SR);
  for (let i = 0; i < len; i++) {
    const j = i0 + i;
    if (j < 0 || j >= N) continue;
    if (follow && (i & 255) === 0) g = g0 * db(clamp(VCURVE(j / SR) - rd, -8, 3));
    let yl, yr;
    if (st) { yl = x[0][i] * g; yr = x[1][i] * g; }
    else { const [gl, gr] = panLR(typeof pan === 'function' ? pan(i / SR) : pan); yl = x[i] * g * gl * Math.SQRT2; yr = x[i] * g * gr * Math.SQRT2; }
    sfx[0][j] += yl; sfx[1][j] += yr; sfxSend[0][j] += yl * sendK; sfxSend[1][j] += yr * sendK;
  }
  (SFXWIN[key] ??= []).push([t0 + w0, t0 + w0 + win]);
}
// пик буфера ставится на tp (событие + кадр)
function placePeak(tp, x, target, pan, win, key, o = {}) {
  const chs = Array.isArray(x) ? x : [x];
  let pi = 0, pv = 0;
  for (const c of chs) for (let i = 0; i < Math.min(c.length, SR); i++) if (Math.abs(c[i]) > pv) { pv = Math.abs(c[i]); pi = i; }
  place(tp - pi / SR, x, target, pan, win, key, { ...o, w0: Math.max(0, pi / SR - 0.03) });
  log(key, tp);
}

// гром: треск (импульсы, верх) и раскаты (бурый шум, низ) с перекатами
function thunderBuf(dur, { crack = 1, lp = 200, att = 0.02 } = {}) {
  const n = Math.round(dur * SR), out = [];
  const bumps = Array.from({ length: Math.max(2, Math.round(dur * 2)) }, () => [0.15 + rnd() * dur * 0.55, 0.4 + rnd() * 0.8, 0.12 + rnd() * 0.35]);
  for (let ch = 0; ch < 2; ch++) {
    const l1 = biquad('lp', lp, 0.7), l2 = biquad('lp', lp * 1.8, 0.6), hp = biquad('hp', 30, 0.7), hc = biquad('hp', 700, 0.7), lc = biquad('lp', 9000, 0.7);
    const rum = new Float32Array(n), cr = new Float32Array(n);
    let br = 0;
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      br = br * 0.996 + wn() * 0.06;
      let r = 0.35;
      for (const [c, a, w] of bumps) { const d = (t - c) / w; r += a * Math.exp(-d * d); }
      rum[i] = bq(hp, bq(l2, bq(l1, br))) * r * Math.exp(-t / (dur * 0.32)) * smooth(t / att) * smooth((n - i) / (0.3 * SR));
      if (crack && t < 0.7) {
        const dens = Math.exp(-t / 0.07);
        cr[i] = bq(lc, bq(hc, (rnd() < 0.05 * dens + 0.002 ? wn() * 3 : 0) + wn() * dens * 0.5)) * Math.exp(-t / 0.22) * smooth(t / 0.002);
      }
    }
    peakNorm(rum); if (crack) peakNorm(cr);
    const o = new Float32Array(n);
    for (let i = 0; i < n; i++) o[i] = rum[i] * 0.8 + crack * cr[i];
    out.push(o);
  }
  return out;
}
// копыто: стук корпуса, глухой удар, щелчок
function clop(Lc, Rc, i0, v, pan, walk) {
  const len = Math.round(0.09 * SR), [gl, gr] = panLR(pan), bp = biquad('bp', (walk ? 1500 : 1100) * (0.85 + 0.3 * rnd()), 1.2);
  const f1 = (walk ? 210 : 160) * (0.9 + 0.2 * rnd()), f2 = walk ? 95 : 70;
  let p1 = 0, p2 = 0;
  for (let i = 0; i < len && i0 + i < Lc.length; i++) {
    if (i0 + i < 0) continue;
    const t = i / SR;
    p1 += 2 * Math.PI * f1 * (1 + 0.3 * Math.exp(-t / 0.005)) / SR; p2 += 2 * Math.PI * f2 / SR;
    const y = (0.6 * Math.sin(p1) * Math.exp(-t / 0.018) + 0.8 * Math.sin(p2) * Math.exp(-t / 0.035) + (walk ? 1.4 : 1.0) * bq(bp, wn()) * Math.exp(-t / 0.006)) * v * smooth(t / 0.0006);
    Lc[i0 + i] += y * gl; Rc[i0 + i] += y * gr;
  }
}
// копыта по кадру: horses — [{speed, seed, pan, vel}], фаза шага как в video/src/chars.js (horsePose), wins — окна кадра
function hoovesBuf(t0, t1, horses, gait, wins = [[t0, t1]]) {
  const Lc = nbuf(t1 - t0 + 0.15), Rc = nbuf(t1 - t0 + 0.15);
  const gate = (t) => wins.reduce((g, [a, b]) => Math.max(g, smooth((t - a) / 0.06) * smooth((b - t) / 0.06)), 0);
  const offs = gait === 'gallop' ? [[0, 0.85], [0.17, 0.95], [0.33, 1]] : [[0, 1], [0.25, 0.75], [0.5, 0.95], [0.75, 0.75]];
  for (const h of horses) {
    const rate = (gait === 'gallop' ? 2.2 : 0.9) * h.speed;
    for (let k = Math.floor(t0 * rate + h.seed) - 1; (k - 1 - h.seed) / rate < t1; k++) for (const [off, v] of offs) {
      const t = (k + off - h.seed) / rate + hum(0.004);
      if (t < t0 || t > t1) continue;
      const g = gate(t);
      if (g > 0.01) clop(Lc, Rc, Math.round((t - t0) * SR), v * h.vel * g * (0.85 + 0.3 * rnd()), h.pan, gait === 'walk');
    }
  }
  return [Lc, Rc];
}
// звон мечей из ножен: скрежет вверх и звенящие резонансы
function shingBuf(dur = 1.1) {
  const x = nbuf(dur), res = [2950, 4730, 6880, 9100].map((f) => biquad('bp', f * (0.95 + 0.1 * rnd()), 30)), sc = svf();
  for (let i = 0; i < x.length; i++) {
    const t = i / SR, w = wn();
    if ((i & 15) === 0) sc.set(1500 * 4 ** clamp(t / 0.22, 0, 1), 3);
    const scrape = sc.bp(w) * Math.sin(Math.PI * clamp(t / 0.24, 0, 1)) * 0.6;
    let ring = 0;
    res.forEach((q, k) => { ring += bq(q, w) * [1, 0.8, 0.6, 0.4][k]; });
    x[i] = scrape + ring * 6 * smooth(t / 0.12) * Math.exp(-Math.max(0, t - 0.12) / 0.35) * smooth((x.length - i) / (0.05 * SR));
  }
  return x;
}
// «вух» огня и треск
function whoompBuf(dur = 2.2) {
  const out = [];
  for (let ch = 0; ch < 2; ch++) {
    const x = nbuf(dur), F = svf(), hc = biquad('hp', 1500, 0.7);
    for (let i = 0; i < x.length; i++) {
      const t = i / SR;
      if ((i & 15) === 0) F.set(150 * (2500 / 150) ** clamp(t / 0.35, 0, 1), 0.8);
      const roar = F.lp(wn()) * smooth(t / 0.25) * Math.exp(-Math.max(0, t - 0.25) / 0.5);
      const crack = bq(hc, rnd() < 40 / SR * Math.exp(-t / 0.9) * 30 ? wn() * 4 : 0) * 0.5;
      x[i] = (roar * 1.5 + crack) * smooth((x.length - i) / (0.1 * SR));
    }
    out.push(x);
  }
  return out;
}
// металлический лязг (щит, клинки): обертоны пластины, удар молота, глухой удар
function clangBuf(f0, dur, { thud = 1, hammer = 1, ratios = [1, 1.47, 2.09, 2.56, 3.39, 4.2, 5.3, 6.6] } = {}) {
  const x = nbuf(dur), ph = ratios.map(() => rnd() * 6.28), hp = biquad('hp', 800, 0.7);
  let pt = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    let s = 0;
    for (let k = 0; k < ratios.length; k++) s += (Math.sin(2 * Math.PI * f0 * ratios[k] * t + ph[k]) + 0.6 * Math.sin(2 * Math.PI * f0 * ratios[k] * 1.003 * t)) * Math.exp(-t / (dur * 0.45 / (1 + 0.35 * k))) / (1 + 0.6 * k);
    pt += 2 * Math.PI * 65 * (1 + 0.5 * Math.exp(-t / 0.01)) / SR;
    x[i] = (s * 0.35 + hammer * bq(hp, wn()) * Math.exp(-t / 0.006) * 1.5 + thud * Math.sin(pt) * Math.exp(-t / 0.12)) * smooth(t / 0.0005) * smooth((x.length - i) / (0.05 * SR));
  }
  return x;
}
// звон отскока: высокие обертоны с лёгким спадом высоты
function pingBuf(fs, dur = 0.8, glide = 0.03, dec = 0.3) {
  const x = nbuf(dur), ph = fs.map(() => 0), hp = biquad('hp', 2000, 0.7);
  for (let i = 0; i < x.length; i++) {
    const t = i / SR, g = 1 - glide * (1 - Math.exp(-t / 0.2));
    let s = 0;
    fs.forEach((f, k) => { ph[k] += 2 * Math.PI * f * g / SR; s += Math.sin(ph[k]) * Math.exp(-t / (dec / (1 + 0.4 * k))) / (1 + 0.5 * k); });
    x[i] = (s + 0.8 * bq(hp, wn()) * Math.exp(-t / 0.004)) * smooth(t / 0.0004) * smooth((x.length - i) / (0.03 * SR));
  }
  return x;
}
// свист полёта: полосовой шум, центр f0 → f1, нарастает к концу (in) или колоколом
function whooshBuf(dur, f0, f1, q = 1.5, shape = 'in') {
  const x = nbuf(dur), F = svf();
  for (let i = 0; i < x.length; i++) {
    const u = i / x.length;
    if ((i & 15) === 0) F.set(f0 * (f1 / f0) ** u, q);
    const env = shape === 'in' ? u ** 2 * smooth((x.length - i) / (0.01 * SR)) : Math.sin(Math.PI * u) ** 1.5;
    x[i] = F.bp(wn()) * env;
  }
  return x;
}
// звон ковшей
function clinkBuf() {
  const fs = [2350, 3980, 5600, 7300].map((f) => f * (0.96 + 0.08 * rnd()));
  return pingBuf(fs, 0.5, 0.004, 0.18);
}
// удар кулака по столу: дерево и глухой низ
function thumpBuf() {
  const x = nbuf(0.5), bp = biquad('bp', 240, 2.5), hp = biquad('hp', 1200, 0.7);
  let p = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    p += 2 * Math.PI * 85 * (1 + 0.6 * Math.exp(-t / 0.01)) / SR;
    x[i] = (Math.sin(p) * Math.exp(-t / 0.12) + 2.5 * bq(bp, wn()) * Math.exp(-t / 0.05) + 0.6 * bq(hp, wn()) * Math.exp(-t / 0.004)) * smooth(t / 0.0005);
  }
  return x;
}
// треск рассыпающихся углей и искр
function crackleBuf(dur, rate = 120, dec = 0.6) {
  const out = [];
  for (let ch = 0; ch < 2; ch++) {
    const x = nbuf(dur), bp = biquad('bp', 3200, 0.9), F = svf();
    for (let i = 0; i < x.length; i++) {
      const t = i / SR, dens = Math.exp(-t / dec);
      if ((i & 15) === 0) F.set(300 + 2500 * clamp(t / 0.3, 0, 1), 0.7);
      const imp = rnd() < rate / SR * dens ? wn() * 5 : 0;
      x[i] = bq(bp, imp) + F.lp(wn()) * 0.4 * smooth(t / 0.05) * Math.exp(-t / 0.35);
    }
    out.push(x);
  }
  return out;
}
// дождь: шипение и капли
function rainBuf(dur) {
  const out = [];
  for (let ch = 0; ch < 2; ch++) {
    const x = nbuf(dur), hp = biquad('hp', 1200, 0.7), lp = biquad('lp', 7000, 0.7), dr = biquad('bp', 3500, 3);
    for (let i = 0; i < x.length; i++) {
      const t = i / SR;
      const drop = rnd() < 260 / SR ? wn() * 6 : 0;
      x[i] = (bq(lp, bq(hp, wn())) * 0.35 + bq(dr, drop)) * smooth(t / 0.2) * smooth((x.length - i) / (0.2 * SR));
    }
    out.push(x);
  }
  return out;
}
// песок/пыль: верхний шум порывами
function dustBuf(dur) {
  const out = [];
  const ph = [rnd() * 6, rnd() * 6];
  for (let ch = 0; ch < 2; ch++) {
    const x = nbuf(dur), hp = biquad('hp', 2500, 0.7), lp = biquad('lp', 9000, 0.7);
    for (let i = 0; i < x.length; i++) {
      const t = i / SR, g = 0.6 + 0.4 * Math.sin(2 * Math.PI * 0.9 * t + ph[0] + ch) * Math.sin(2 * Math.PI * 0.37 * t + ph[1]);
      x[i] = bq(lp, bq(hp, wn())) * g * smooth(t / 0.2) * smooth((x.length - i) / (0.25 * SR));
    }
    out.push(x);
  }
  return out;
}
// ветер: полосовой шум с блуждающим центром, порывы и тонкий свист
function windBuf(dur, { lo = 250, hi = 800, fadeIn = 0.6, fadeOut = 0.5 } = {}) {
  const out = [], ph = Array.from({ length: 6 }, () => rnd() * 6.28);
  for (let ch = 0; ch < 2; ch++) {
    const x = nbuf(dur), F = svf(), Fw = svf();
    for (let i = 0; i < x.length; i++) {
      const t = i / SR;
      const m = 0.5 + 0.25 * Math.sin(2 * Math.PI * 0.11 * t + ph[0] + ch * 0.7) + 0.15 * Math.sin(2 * Math.PI * 0.23 * t + ph[1]) + 0.1 * Math.sin(2 * Math.PI * 0.07 * t + ph[2]);
      if ((i & 31) === 0) { const c = lo * (hi / lo) ** clamp(m, 0, 1); F.set(c, 1.4); Fw.set(c * 2.3, 14); }
      const g = 0.45 + 0.55 * clamp(m, 0, 1);
      const w = wn();
      x[i] = (F.bp(w) + 0.25 * Fw.bp(w)) * g * smooth(t / fadeIn) * smooth((x.length - i) / (fadeOut * SR));
    }
    out.push(x);
  }
  return out;
}
// хруст кости под сапогом
function crunchBuf() {
  const x = nbuf(0.6);
  for (let k = 0; k < 46; k++) {
    const t0 = k < 34 ? rnd() * 0.09 : 0.1 + rnd() * 0.3, a = (k < 34 ? 1 : 0.35) * (0.5 + rnd()), f = 1500 + rnd() * 3000;
    const bp = biquad('bp', f, 3), i0 = Math.round(t0 * SR);
    for (let i = 0; i < 0.006 * SR && i0 + i < x.length; i++) x[i0 + i] += bq(bp, i < 8 ? wn() * 4 : 0) * a;
  }
  let p = 0;
  for (let i = 0; i < x.length; i++) { const t = i / SR; p += 2 * Math.PI * 90 * (1 + 0.5 * Math.exp(-t / 0.01)) / SR; x[i] = x[i] * 0.8 + Math.sin(p) * Math.exp(-t / 0.08) * 0.9; }
  return x;
}
// шипение змеи: всплески [начало, длина]
function hissBuf(dur, bursts) {
  const x = nbuf(dur), hp = biquad('hp', 2800, 0.7), bp = biquad('bp', 6000, 0.8);
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    let env = 0;
    for (const [s, l] of bursts) if (t >= s && t < s + l + 0.3) env = Math.max(env, smooth((t - s) / 0.08) * smooth((s + l - t) / 0.2 + 1) * (t > s + l ? Math.exp(-(t - s - l) / 0.08) : 1));
    const w = bq(hp, wn());
    x[i] = (w * 0.5 + bq(bp, w)) * env * (0.85 + 0.15 * Math.sin(2 * Math.PI * 23 * t));
  }
  return x;
}
// шорох чешуи
function slitherBuf(dur) {
  const x = nbuf(dur), bp = biquad('bp', 1700, 1.2), ph = rnd() * 6;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR, g = 0.5 + 0.5 * Math.sin(2 * Math.PI * 17 * t + ph + 3 * Math.sin(2 * Math.PI * 1.3 * t));
    x[i] = bq(bp, wn()) * g * g * smooth(t / 0.3) * smooth((x.length - i) / (0.1 * SR));
  }
  return x;
}

// --- 0. гром на молниях заставки (video/src/scenes1.js: вспышки 0,25 и 1,5 с) ---
placePeak(0.25 + 0.04 + FRAME, thunderBuf(3.4), SFX_DB.thunder[0], 0, 1.2, 'thunder', { sendK: 0.2 });
placePeak(1.5 + 0.04 + FRAME, thunderBuf(2.6, { crack: 0.6, lp: 170 }), SFX_DB.thunder[1], 0, 1.0, 'thunder', { sendK: 0.25 });
// --- ст. 1: топот дружины по кадрам, мечи, зарево ---
{
  const a = tM, b = W('w_hoz') - 0.25;
  const nine = Array.from({ length: 9 }, (_, i) => ({ speed: 1, seed: i * 0.29, pan: 0.5 - i * 0.1, vel: 1 - (i % 3) * 0.15 }));
  place(a, hoovesBuf(a, b, nine, 'gallop'), SFX_DB.hooves, 0, b - a, 'hooves', { follow: true }); log('hooves', a); log('hooves', b);
  const c = L(5) - 0.1, d = W('w_bron') - 0.25;
  const five = [...Array.from({ length: 4 }, (_, i) => ({ speed: 1.1, seed: 0.66 + i * 0.29, pan: -0.3 - i * 0.08, vel: 0.8 })), { speed: 1.05, seed: 0.1, pan: 0.1, vel: 1.2 }];
  place(c, hoovesBuf(c, d, five, 'gallop'), SFX_DB.hooves, 0, d - c, 'hooves', { follow: true }); log('hooves', c); log('hooves', d);
  const e = L(6) - 0.1, f = tS2;
  place(e, hoovesBuf(e, f, [{ speed: 1, seed: 0, pan: 0.15, vel: 1 }], 'gallop'), SFX_DB.hooves, 0, f - e, 'hooves', { follow: true }); log('hooves', e); log('hooves', f);
  // мечи взлетают веером: i-й на w_mech − 0,1 + 0,07·i (пружина), x = 360 + 240·i
  const len = 1.6, L2 = nbuf(len), R2 = nbuf(len);
  for (let i = 0; i < 6; i++) {
    const x = shingBuf(1.1), [gl, gr] = panLR(scrPan(360 + i * 240)), i0 = Math.round(i * 0.07 * SR);
    for (let j = 0; j < x.length && i0 + j < L2.length; j++) { L2[i0 + j] += x[j] * gl * (0.8 + 0.05 * i); R2[i0 + j] += x[j] * gr * (0.8 + 0.05 * i); }
  }
  const t0 = W('w_mech') - 0.1 + FRAME;
  place(t0, [L2, R2], SFX_DB.swords, 0, 0.8, 'swords', { sendK: 0.25 }); log('swords', t0);
  const z = W('w_pozh') - 0.2 + FRAME;
  place(z, whoompBuf(2.2), SFX_DB.blaze, 0, 1.2, 'blaze', { sendK: 0.2 }); log('blaze', z);
}
// --- ст. 2: дальний гром на знаке Перуна, конь Олега подходит шагом ---
{
  const gp = W('w_perun') + 0.05 + FRAME;
  place(gp, thunderBuf(3.0, { crack: 0, lp: 140, att: 0.25 }), SFX_DB.perun, 0, 2.0, 'perun', { sendK: 0.3 }); log('perun', gp);
  const a = L(12) - 0.1, b = W('w_podieh') + 0.6;
  place(a, hoovesBuf(a, b, [{ speed: 1.4, seed: 0.2, pan: -0.35, vel: 1 }], 'walk'), SFX_DB.walk, 0, b - a, 'walk', { follow: true }); log('walk', a); log('walk', b);
}
// --- ст. 5: щит прибит к вратам Цареграда ---
placePeak(tShield, clangBuf(140, 2.2, { thud: 1.2 }), SFX_DB.shield, 0, 0.6, 'shield', { sendK: 0.3 });
// --- ст. 6: молния и вал; снаряды летят справа и отскакивают со звоном ---
{
  const wv = W('w_val');
  placePeak(wv - 0.1 + 0.02 + FRAME, thunderBuf(2.4, { crack: 0.7, lp: 180 }), SFX_DB.storm, 0, 1.0, 'storm', { sendK: 0.25 });
  const wave = whoompBuf(2.4); // водяной вал: низкий нарастающий шум, вершина на wv + 0.6
  const env = (i) => Math.sin(Math.PI * clamp(i / SR / 2.0, 0, 1));
  for (const x of wave) { const lp = biquad('lp', 900, 0.7); for (let i = 0; i < x.length; i++) x[i] = bq(lp, wn()) * env(i) * 0.8 + x[i] * 0.3; }
  place(wv - 0.4, wave, SFX_DB.wave, 0, 2.0, 'wave', { sendK: 0.2 }); log('wave', wv - 0.4);
  const kinds = [['stone', 450, 900, 1.2, [1100, 1730, 2650], 0.18], ['arrow', 2600, 1700, 7, [2800, 4410, 6150], 0.3], ['dagger', 3800, 2600, 2, [3200, 5100, 7700], 0.4]];
  PROJ.forEach((T0, j) => {
    const [kind, f0, f1, q, fs, dec] = kinds[j];
    const w = whooshBuf(0.6, f0, f1, q);
    place(T0 - 0.6 + FRAME, w, SFX_DB.whoosh, (t) => scrPan(lerp(1900, 890, t / 0.6)), 0.6, 'whoosh', { sendK: 0.15 }); log('whoosh', T0 - 0.6 + FRAME);
    placePeak(T0 + FRAME, pingBuf(fs, 0.9, kind === 'stone' ? 0.01 : 0.04, dec), SFX_DB.ricochet + (kind === 'stone' ? 2 : 0), (t) => scrPan(lerp(890, 1190, clamp(t / 0.7, 0, 1))), 0.4, 'ricochet', { sendK: 0.3 });
  });
}
// --- ст. 7: стрелы втыкаются в землю вокруг коня (как в video/src/scenes2.js), галоп ---
{
  const mb = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const R = mb(7), hits = [];
  for (let i = 0; i < 26; i++) {
    const t0 = L(39) - 0.3 + R() * 1.6, x = 300 + R() * 1350; R();
    if (Math.abs(x - 960) < 260 && R() < 2) continue;
    hits.push([t0 + 0.35, x]);
  }
  const a = Math.min(...hits.map((h) => h[0])) - 0.1, len = Math.max(...hits.map((h) => h[0])) - a + 0.3, Lc = nbuf(len), Rc = nbuf(len);
  for (const [th, x] of hits) {
    const b = thumpBuf(), [gl, gr] = panLR(scrPan(x)), i0 = Math.round((th - a + FRAME) * SR), v = 0.5 + 0.5 * rnd();
    for (let j = 0; j < 0.25 * SR && i0 + j < len * SR; j++) { Lc[i0 + j] += b[j] * gl * v; Rc[i0 + j] += b[j] * gr * v; }
  }
  place(a, [Lc, Rc], SFX_DB.arrows, 0, len, 'arrows', { follow: true }); log('arrows', a); log('arrows', a + len);
  const c = t7c, d = t7d, e = L(42) - 0.3;
  place(c, hoovesBuf(c, d, [{ speed: 1.3, seed: 0, pan: -0.05, vel: 1 }], 'gallop'), SFX_DB.gallop, 0, d - c, 'gallop', { follow: true }); log('gallop', c);
  place(d, hoovesBuf(d, e, [{ speed: 1.2, seed: 0.4, pan: 0.05, vel: 1 }], 'gallop'), SFX_DB.gallop, 0, e - d, 'gallop', { follow: true }); log('gallop', e);
  // сеча: скрещённые клинки и вспышка (вспышка на w_secha − 0,05)
  placePeak(W('w_secha') - 0.03 + FRAME, pingBuf([2100, 3350, 4870, 6900], 0.9, 0.01, 0.35), SFX_DB.clash, 0.25, 0.4, 'clash', { sendK: 0.3 });
}
// --- ст. 11: звон ковшей; ст. 12: конь скачет во вспышке-воспоминании ---
{
  const zv = W('w_zvon') + FRAME;
  const a = clinkBuf(), b = clinkBuf(), len = 0.6, Lc = nbuf(len), Rc = nbuf(len);
  for (const [x, p, dt] of [[a, scrPan(480), 0], [b, scrPan(1440), 0.035]]) { const [gl, gr] = panLR(p), i0 = Math.round(dt * SR); for (let j = 0; j < x.length && i0 + j < Lc.length; j++) { Lc[i0 + j] += x[j] * gl; Rc[i0 + j] += x[j] * gr; } }
  placePeak(zv, [Lc, Rc], SFX_DB.clink, 0, 0.3, 'clink', { sendK: 0.35 });
  const bu = W('w_burn'), m0 = bu - 0.4, m1 = L(71) - 0.2;
  place(m0, hoovesBuf(m0, m1, [{ speed: 1.2, seed: 0, pan: 0, vel: 1 }], 'gallop', [[m0 + 0.1, m1 - 0.15]]), SFX_DB.memory, 0, m1 - m0, 'memory', { sendK: 0.6, follow: true }); log('memory', m0);
}
// --- ст. 13: кулак по столу, лицо кудесника рассыпается искрами ---
placePeak(tFist, thumpBuf(), SFX_DB.fist, 0, 0.3, 'fist', { sendK: 0.2 });
place(tFist - 0.01, crackleBuf(1.4), SFX_DB.shatter, 0, 1.2, 'shatter', { sendK: 0.3 }); log('shatter', tFist);
// --- ст. 14: шаг всадников вдоль Днепра; дождь, пыль, ветер в ковыле ---
{
  const a = t14, b = t14b;
  const four = Array.from({ length: 4 }, (_, i) => ({ speed: 1.1, seed: i * 0.4, pan: scrPan(500 + i * 230 + 150), vel: i === 0 ? 1 : 0.8 }));
  place(a, hoovesBuf(a, b, four, 'walk'), SFX_DB.walk, 0, b - a, 'walk', { follow: true }); log('walk', a); log('walk', b);
  const dz = W('w_dozhd'), pl = W('w_pyl'), vt = W('w_veter');
  place(dz - 0.2, rainBuf(pl - dz + 0.25), SFX_DB.rain, 0, pl - dz + 0.2, 'rain', { sendK: 0.1, follow: true }); log('rain', dz - 0.2); log('rain', pl + 0.05);
  place(pl - 0.2, dustBuf(vt - pl + 0.6), SFX_DB.dust, 0, vt - pl + 0.6, 'dust', { sendK: 0.1, follow: true }); log('dust', pl - 0.2); log('dust', vt + 0.4);
  const w1 = vt - 0.3, w2 = L(88) - 0.1;
  place(w1, windBuf(w2 - w1, { fadeIn: 0.5, fadeOut: 0.4 }), SFX_DB.wind, 0, w2 - w1, 'wind', { sendK: 0.15, follow: true }); log('wind', w1); log('wind', w2);
}
// --- ст. 15: сапог на черепе ---
placePeak(ns + 0.35 + FRAME, crunchBuf(), SFX_DB.crunch, -0.05, 0.25, 'crunch', { sendK: 0.2 });
// --- ст. 16: ветер над холмом; змея выползает, обвивает сапог, бросок ---
{
  const w1 = L(91) - 0.5, w2 = tV - 0.12 - FRAME;
  place(w1, windBuf(w2 - w1, { lo: 200, hi: 650, fadeIn: 0.8, fadeOut: 0.05 }), SFX_DB.wind2, 0, w2 - w1, 'wind2', { sendK: 0.15, follow: true }); log('wind2', w1); log('wind2', w2);
  const h0 = zm - 0.3 + FRAME, h1 = L(95) - 0.1, bursts = [];
  for (let t = 0; t < h1 - h0 - 0.4;) { const l = 0.5 + rnd() * 0.5; bursts.push([t, l]); t += l + 0.3 + rnd() * 0.35; }
  place(h0, hissBuf(h1 - h0 + 0.3, bursts), SFX_DB.hiss, (t) => -0.2 + 0.3 * t / (h1 - h0), h1 - h0, 'hiss', { sendK: 0.15, follow: true }); log('hiss', h0); log('hiss', h1);
  const s0 = L(95) - 0.1 + FRAME, s1 = tV - 0.12;
  place(s0, slitherBuf(s1 - s0), SFX_DB.slither, 0.05, s1 - s0, 'slither', { sendK: 0.1, follow: true }); log('slither', s0);
  const st = whooshBuf(0.25, 900, 3500, 1.5), hs = hissBuf(0.3, [[0.0, 0.2]]);
  for (let i = 0; i < st.length; i++) st[i] = st[i] * 1.2 + (hs[i] ?? 0) * 0.5 * (i / st.length);
  placePeak(tV, st, SFX_DB.strike, (t) => scrPan(lerp(1500, 1000, clamp(t / 0.25, 0, 1))), 0.2, 'strike', { sendK: 0.2 });
}
const sfxWet = reverb(sfxSend, 0.78, 0.35);
for (const ch of [0, 1]) { const o = sfx[ch], w = sfxWet[ch]; for (let i = 0; i < N; i++) o[i] += w[i]; }

// ---------- форма громкости музыки ----------
// Цели — K-уровень музыки к голосу. По строкам: UNDER строфы + LINE_DB (в пределах ±4 дБ от уровня строфы), громкие
// акценты внутри строк в подгонке не участвуют. Строки FREE берут громкость предыдущей. В паузах между строфами,
// на карточках, во вступлении и в финале — громче. Внутри строки громкость постоянна, переходы — в паузах.
const kMus = music.map(kWeight);
const lvlK = (wins) => dB(msIn(kMus, wins));
const SL = {};
LINES.forEach((l) => { (SL[l.stanza] ??= []).push(l.n); });
const lineWin = (n) => minus([[L(n), E(n)]], ACCENTS);
const gSt = {};
for (const [s, ns_] of Object.entries(SL)) { const m = ns_.filter((n) => !FREE.has(n)); gSt[s] = db(m.reduce((a, n) => a + vRef(n), 0) / m.length + UNDER[s - 1] - lvlK(m.flatMap(lineWin))); }
const gLine = [];
for (let n = 1; n <= NL; n++) {
  const s = stanzaOf(n);
  if (LINE_ABS[n] !== undefined) gLine[n] = clamp(db(vRef(n) + LINE_ABS[n] - lvlK([[L(n), E(n)]])), gSt[s] * db(-20), gSt[s] * db(6));
  else gLine[n] = FREE.has(n) ? null : clamp(db(vRef(n) + UNDER[s - 1] + (LINE_DB[n] ?? 0) - lvlK(lineWin(n))), gSt[s] * db(-6), gSt[s] * db(6));
}
for (let n = 1; n <= NL; n++) if (gLine[n] === null) gLine[n] = gLine[n - 1] ?? gSt[stanzaOf(n)];
const gFor = (wins, target, lo, hi) => clamp(db(vK + target - lvlK(wins)), lo, hi);
const CARDS = { 18: tP, 60: tG, 84: tS };
const HITGAP = { 41: tH42 }; // удар в паузе перед строкой: держим громкость строки (+4 дБ) до удара, тише — с началом строки
const gIntro = gFor([[0.2, tM - 0.05]], INTRO_DB, 0, 1e3);
const keys = [[0, gIntro], [L(1) - 0.3, gIntro], [L(1) - 0.03, gLine[1]]];
const SWW = []; // окна громких пауз для отчёта
for (let n = 1; n <= NL; n++) {
  if (keys[keys.length - 1][0] < L(n)) keys.push([L(n), gLine[n]]);
  keys.push([E(n), gLine[n]]);
  if (n === NL) break;
  const s = stanzaOf(n), gap = L(n + 1) - E(n), g0 = gLine[n], g1 = gLine[n + 1];
  if (CARDS[n] !== undefined) {
    const w = [E(n) + 0.15, L(n + 1) - 0.12], g = gFor([w], CARD_DB, Math.min(g0, g1) * db(-6), Math.max(g0, g1) * db(15));
    keys.push([E(n) + 0.03, g0], [E(n) + 0.12, g], [L(n + 1) - 0.2, g], [L(n + 1) - 0.03, g1]);
    SWW.push([`карточка ${n}/${n + 1}`, w]);
  } else if (s !== stanzaOf(n + 1) && SWELL[s] !== undefined && gap > 0.6) {
    const w = [E(n) + 0.2, L(n + 1) - 0.2], g = gFor([w], SWELL[s], Math.min(g0, g1) * db(-3), Math.max(g0, g1) * db(9));
    keys.push([E(n) + 0.05, g0], [E(n) + 0.2, g], [L(n + 1) - 0.2, g], [L(n + 1) - 0.03, g1]);
    SWW.push([`пауза ${n}/${n + 1}`, w]);
  } else if (HITGAP[n] !== undefined) {
    const th = HITGAP[n];
    keys.push([E(n) + 0.03, g0], [th - 0.15, g0], [th - 0.01, g0 * db(4)], [Math.min(th + 0.12, L(n + 1) - 0.05), g0 * db(4)], [L(n + 1) + 0.05, g1]);
    SWW.push([`удар ${n}/${n + 1}`, [th, L(n + 1)]]);
  } else if (gap > 0.08) keys.push([E(n) + 0.03, g0], [L(n + 1) - 0.03, g1]);
}
const gBuild = gFor([[E(NL) + 0.4, tF - 0.15]], BUILD_DB, gLine[NL], gLine[NL] * db(12));
const gFin = gFor([[tF, tF + 3]], FIN_DB, 0, 1e3);
keys.push([E(NL) + 0.05, gLine[NL]], [tF - 0.2, gBuild], [tF - 0.01, gFin], [TOTAL - 1.8, gFin], [TOTAL - 0.02, 0], [TOTAL, 0]);
const shapeG = renderCurve(keys);
for (const x of music) for (let i = 0; i < N; i++) x[i] *= shapeG[i];

// ---------- сведение и запись ----------
const out = [0, 1].map((ch) => { const o = new Float32Array(N); for (let i = 0; i < N; i++) o[i] = music[ch][i] + sfx[ch][i]; return o; });
// ограничитель пиков (потолок 0,89): заглядывание 3 мс, атака 2 мс, отпускание 80 мс — громкость остального не меняется
const CEIL = 0.89;
let peak = 0, limMs = 0, limMin = 1;
{
  const la = Math.round(0.003 * SR), g = new Float32Array(N).fill(1);
  for (let i = 0; i < N; i++) {
    const a = Math.max(Math.abs(out[0][i]), Math.abs(out[1][i]));
    peak = Math.max(peak, a);
    if (a > CEIL) { const r = CEIL / a; for (let j = Math.max(0, i - la); j <= Math.min(N - 1, i + la); j++) if (g[j] > r) g[j] = r; }
  }
  const kr = 1 - Math.exp(-1 / (0.08 * SR)), ka = 1 - Math.exp(-1 / (0.002 * SR));
  for (let i = 1; i < N; i++) g[i] = Math.min(g[i], g[i - 1] + (1 - g[i - 1]) * kr);
  for (let i = N - 2; i >= 0; i--) g[i] = Math.min(g[i], g[i + 1] + (1 - g[i + 1]) * ka);
  for (let i = 0; i < N; i++) { if (g[i] < 0.999) limMs++; limMin = Math.min(limMin, g[i]); for (const x of [out[0], out[1], music[0], music[1], sfx[0], sfx[1]]) x[i] *= g[i]; }
  limMs = limMs / SR * 1000;
}
const limit = 1;
if (limMin < 1) console.warn(`ограничитель: до ${(20 * Math.log10(limMin)).toFixed(1)} дБ, всего ${limMs.toFixed(0)} мс`);
for (let i = Math.max(0, N - Math.round(0.03 * SR)); i < N; i++) out[0][i] = out[1][i] = 0; // без щелчка в конце
for (const x of out) for (let i = 0; i < N; i++) if (!Number.isFinite(x[i])) throw new Error(`NaN/∞ в звуке на ${(i / SR).toFixed(3)} с`);
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
  note: 'секунды ролика. Шумы: thunder, swords, blaze, shield, storm, ricochet, clash, clink, fist, crunch, strike — пики; hooves, walk, gallop, rain, dust, wind, wind2, hiss, arrows — начало и конец окна; perun, wave, whoosh, memory, shatter, slither — начало. music — ключевые моменты музыки (удары, разделы).',
  V0, OUTRO, total: TOTAL, ...SFX, music: MARK,
}, null, 1));

// ---------- отчёт ----------
const f1 = (x) => x.toFixed(1);
const kM2 = music.map(kWeight), kS = sfx.map(kWeight);
const relR = (chs, wins) => f1(dB(msIn(chs, wins)) - vR), relK = (chs, wins) => f1(dB(msIn(chs, wins)) - vK);
const regular = speechAll.filter((_, i) => !FREE.has(i + 1));
console.log(`события: ${evSrc}; intro ${V0}, outro ${OUTRO}, длина ${TOTAL} с (${N} отсчётов), fin ${EV.fin}`);
console.log(`разделы: ${SECTIONS.map((s) => `${s.name} ${s.t0.toFixed(1)}–${s.t1.toFixed(1)} (${(60 / s.beat).toFixed(0)})`).join(', ')}`);
console.log(`голос в местах речи: RMS ${f1(vR)} дБFS, K ${f1(vK - 0.691)} LUFS`);
console.log(`музыка под голосом, все строки: K ${relK(kM2, speechAll)} дБ, RMS ${relR(music, speechAll)} дБ; без строк ${[...FREE].join(', ')}: K ${relK(kM2, regular)}, RMS ${relR(music, regular)}`);
console.log(`музыка + шумы по всей речи: K ${f1(dB(msIn(kM2, speechAll) + msIn(kS, speechAll)) - vK)} дБ`);
console.log('по строфам (K | RMS, дБ к голосу):', Object.entries(SL).map(([s, ns_]) => `${s}: ${relK(kM2, ns_.map((n) => [L(n), E(n)]))}|${relR(music, ns_.map((n) => [L(n), E(n)]))}`).join('  '));
console.log('по строкам (K, дБ к голосу этой строки; музыка | музыка + шумы):', speechAll.map((w, i) => { const v = dB(2 * msIn([kv], [w], -V0)); return `${i + 1}:${f1(dB(msIn(kM2, [w])) - v)}|${f1(dB(msIn(kM2, [w]) + msIn(kS, [w])) - v)}`; }).join(' '));
console.log(`заставка K ${relK(kM2, [[0.2, tM - 0.05]])}, нарастание к финалу K ${relK(kM2, [[E(NL) + 0.4, tF - 0.15]])}, финал K ${relK(kM2, [[tF, tF + 3]])} (дБ к голосу)`);
console.log('паузы и карточки (K):', SWW.map(([nm, w]) => `${nm} ${relK(kM2, [w])}`).join(', '));
console.log('шумы в своих окнах (K, дБ к голосу):', Object.entries(SFXWIN).map(([k, w]) => `${k} ${w.map((x) => relK(kS, [x])).join(' ')}`).join(', '));
console.log(`баланс шин (сухо, K дБFS до общего уровня):\n${busReport}`);
{
  let pk = 0;
  for (let i = 0; i < N; i++) {
    const j = i - Math.round(V0 * SR), v = j >= 0 && j < voiceA.length ? voiceA[j] : 0;
    pk = Math.max(pk, Math.abs(music[0][i] + sfx[0][i] + v), Math.abs(music[1][i] + sfx[1][i] + v));
  }
  let pm = 0; for (let i = 0; i < N; i++) pm = Math.max(pm, Math.abs(out[0][i]), Math.abs(out[1][i]));
  console.log(`music.wav: пик ${f1(20 * Math.log10(pm))} dBFS (до ограничителя ${f1(20 * Math.log10(peak))}); голос + музыка: пик ${f1(20 * Math.log10(pk))} dBFS`);
}
console.log('шумы:', JSON.stringify(SFX));
console.log('музыка:', JSON.stringify(MARK));
