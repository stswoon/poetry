// Музыка к «Зимней дороге» Пушкина: протяжная ямщицкая песня в ре миноре, 4/4, около 67 ударов в минуту.
//
// Палитра (писалась под песочную анимацию v1, осталась и для Палеха v2): мягкая струнная подкладка, баян (язычковый тембр) ведёт песню,
// пиццикато контрабаса и тихий перебор арфы дают ровный «дорожный» пульс, редкие ноты челесты — снежинки.
// Мечта о камине и Нине (от смахивания sw4a до sw6a) — ре мажор, песню берёт тёплый кларнет.
// С sw6a снова ре минор: на «Дремля смолкнул мой ямщик» песня замолкает, остаются подкладка и шаг пульса,
// после голоса баян допевает последнюю фразу, и всё затихает на тонике.
// Шумы только с причиной в кадре, пик на кадр позже события: копыта и колокольчик тройки, треск камина
// и вспышка огня, ход стрелки, удар часов в полночь. Шумы титра, смен картин, ухода строфы и финального
// названия зависят от стиля картинки (--style):
//   palekh (v2, по умолчанию) — золото на чёрном лаке: название пишется золотом под тихое мерцание высоких
//     колокольчиков, картины сменяет золотая кромка (мягкий воздушный взмах и искорки-звоночки), строфа
//     рассыпается золотой пылью;
//   sand (v1) — песочная анимация: песок сыплется в титр и сметается ладонью, текст смахивается,
//     палец процарапывает название в финале. Даёт тот же music.wav, что был у ролика v1, бит в бит.
// Музыка в обоих стилях одна и та же.
//
// Времена берёт из events.json (пишет ../video/build.py), голос из ../voice.mp3, строки из ../timings.json.
// Запуск:   node make_music.mjs                     — вступление и финал из events.json (V0, OUTRO), стиль palekh
//           node make_music.mjs --style sand        — шумы ролика v1 (песок)
//           node make_music.mjs --intro 6 --outro 8 — другие длины: времена пересчитываются из timings.json
// Пишет music.wav (44,1 кГц, 16 бит, стерео) рядом со скриптом. Без зависимостей, нужен только ffmpeg.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const POEM = path.dirname(HERE);

// ---------- аргументы и события ----------
function parseArgs(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') {
      console.log('node make_music.mjs [--style palekh|sand] [--intro <с>] [--outro <с>] [--out <файл.wav>]');
      process.exit(0);
    }
    const m = a.match(/^--(intro|outro|out|style)(?:=(.*))?$/);
    if (!m) throw new Error(`непонятный аргумент: ${a}`);
    const v = m[2] ?? argv[++i];
    if (m[1] === 'out') o.out = v;
    else if (m[1] === 'style') {
      if (!['palekh', 'sand'].includes(v)) throw new Error(`--style: palekh или sand, а не «${v}»`);
      o.style = v;
    } else {
      o[m[1]] = Number(v);
      if (!Number.isFinite(o[m[1]]) || o[m[1]] < 0) throw new Error(`--${m[1]}: нужно число секунд, а не «${v}»`);
    }
  }
  return o;
}
const ARGS = parseArgs(process.argv.slice(2));
const STYLE = ARGS.style ?? 'palekh';
const TIMINGS = JSON.parse(fs.readFileSync(path.join(POEM, 'timings.json'), 'utf8'));
const EV_FILE = JSON.parse(fs.readFileSync(path.join(HERE, 'events.json'), 'utf8'));
const r3 = (x) => Math.round(x * 1000) / 1000;

// Ключевые слова — те же, что в build.py: [номер строки, начало слова]
const WORDS = {
  w_poby: [2, 'Пробирается'], w_pol: [3, 'поляны'], w_lyet: [4, 'Льёт'],
  w_dor: [5, 'дороге'], w_troi: [6, 'Тройка'], w_kol: [7, 'Колокольчик'], w_grem: [8, 'гремит'],
  w_pes: [10, 'песнях'], w_raz: [11, 'разгулье'], w_tos: [12, 'тоска'],
  w_ogn: [13, 'огня'], w_hat: [13, 'хаты'], w_sneg: [14, 'снег'], w_vyo: [15, 'вёрсты'],
  w_zav: [17, 'Завтра'], w_nin: [17, 'Нина'], w_kam: [19, 'камина'], w_zag: [20, 'Загляжусь'],
  w_str: [21, 'стрелка'], w_kru: [22, 'круг'], w_dok: [23, 'докучных'], w_pol2: [24, 'Полночь'],
  w_gru: [25, 'Грустно'], w_dre: [26, 'Дремля'], w_kol2: [27, 'Колокольчик'], w_otu: [28, 'Отуманен'],
};
// То же, что считает build.py, но для своих длин вступления и финала: время ролика = intro + время голоса
function deriveEvents(T, V0, OUTRO) {
  const L = T.lines;
  const S = (n) => r3(L[n - 1].start + V0), E = (n) => r3(L[n - 1].end + V0);
  const ev = { V0, OUTRO };
  L.forEach((_, i) => { ev[`L${i + 1}`] = S(i + 1); ev[`E${i + 1}`] = E(i + 1); });
  const st = [...new Set(L.map((l) => l.stanza))].sort((a, b) => a - b);
  const first = (k) => L.findIndex((l) => l.stanza === k) + 1;
  const last = (k) => L.length - [...L].reverse().findIndex((l) => l.stanza === k);
  st.forEach((k, j) => {
    ev[`st${j + 1}`] = S(first(k)); ev[`en${j + 1}`] = E(last(k));
    ev[`tx${j + 1}`] = r3(E(last(k)) + (j + 1 < st.length ? 0.2 : 0.5));
  });
  ev.sw0a = r3(V0 - 1.25); ev.sw0b = r3(V0 - 0.25);
  for (let j = 1; j < st.length; j++) {
    let a = E(last(st[j - 1])) + 0.3; const b = S(first(st[j])) - 0.12;
    if (b - a < 0.8) a = b - 0.8;
    ev[`sw${j}a`] = r3(a); ev[`sw${j}b`] = r3(b);
  }
  for (const [k, [n, w]] of Object.entries(WORDS)) {
    const x = L[n - 1].words.find((q) => q.text.startsWith(w));
    if (!x) throw new Error(`в строке ${n} нет слова «${w}»`);
    ev[k] = r3(x.start + V0);
  }
  ev.total = r3(V0 + T.voiceDuration + OUTRO);
  return ev;
}
const INTRO = ARGS.intro ?? EV_FILE.V0, OUTRO = ARGS.outro ?? EV_FILE.OUTRO;
let EV = EV_FILE;
if (Math.abs(INTRO - EV_FILE.V0) > 1e-6 || Math.abs(OUTRO - EV_FILE.OUTRO) > 1e-6) {
  EV = deriveEvents(TIMINGS, INTRO, OUTRO);
  console.log(`вступление ${INTRO} с, финал ${OUTRO} с (в events.json ${EV_FILE.V0}/${EV_FILE.OUTRO}): времена пересчитаны из timings.json`);
  console.log('  не забудь поправить V0/OUTRO в video/build.py, иначе картинка разойдётся с музыкой');
} else {
  const fresh = deriveEvents(TIMINGS, INTRO, OUTRO);
  const stale = Object.keys(fresh).filter((k) => k in EV_FILE && Math.abs(fresh[k] - EV_FILE[k]) > 0.002);
  if (stale.length) console.log(`ВНИМАНИЕ: events.json старее timings.json (${stale.slice(0, 6).join(', ')}…) — перезапусти video/build.py`);
}

const SR = 44100, TOTAL = EV.total, N = Math.round(TOTAL * SR), V0 = EV.V0;
const FRAME = 1 / 30;
const LINES = Object.keys(EV).filter((k) => /^L\d+$/.test(k)).map((k) => +k.slice(1)).sort((a, b) => a - b)
  .map((n) => [EV[`L${n}`], EV[`E${n}`]]);
const NST = Object.keys(EV).filter((k) => /^st\d+$/.test(k)).length;
const LAST_E = LINES[LINES.length - 1][1];
const STANZA_ENDS = new Set(Array.from({ length: NST }, (_, k) => EV[`en${k + 1}`]));
const underVoice = (t) => LINES.some(([a, b]) => t >= a - 0.05 && t < b);

// ---------- помощники ----------
let seed = 1826;
const rnd = () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const white = () => rnd() * 2 - 1;
const hz = (m) => 440 * 2 ** ((m - 69) / 12);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const sstep = (u) => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
const prog = (t, a, b) => clamp((t - a) / Math.max(1e-6, b - a), 0, 1);
const curve = (keys, t) => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) {
    const [a, va] = keys[i - 1], [b, vb] = keys[i];
    return va + (vb - va) * sstep((t - a) / Math.max(1e-6, b - a));
  }
  return keys[keys.length - 1][1];
};
const panL = (p) => Math.cos((clamp(p, -1, 1) + 1) * Math.PI / 4), panR = (p) => Math.sin((clamp(p, -1, 1) + 1) * Math.PI / 4);
const dB = (x) => 20 * Math.log10(Math.max(1e-12, x));
const stereo = () => [new Float32Array(N), new Float32Array(N)];

// Биквад (RBJ), транспонированная прямая форма II
class BQ {
  constructor(type, f, Q = Math.SQRT1_2, gainDb = 0) {
    const w = 2 * Math.PI * Math.min(f, SR * 0.45) / SR, cw = Math.cos(w), al = Math.sin(w) / (2 * Q), A = 10 ** (gainDb / 40);
    let b0, b1, b2, a0, a1, a2;
    if (type === 'lp') { b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = b0; a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al; }
    else if (type === 'hp') { b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = b0; a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al; }
    else if (type === 'bp') { b0 = al; b1 = 0; b2 = -al; a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al; }
    else if (type === 'peak') { b0 = 1 + al * A; b1 = -2 * cw; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * cw; a2 = 1 - al / A; }
    else if (type === 'hshelf') {
      const s = 2 * Math.sqrt(A) * al;
      b0 = A * ((A + 1) + (A - 1) * cw + s); b1 = -2 * A * ((A - 1) + (A + 1) * cw); b2 = A * ((A + 1) + (A - 1) * cw - s);
      a0 = (A + 1) - (A - 1) * cw + s; a1 = 2 * ((A - 1) - (A + 1) * cw); a2 = (A + 1) - (A - 1) * cw - s;
    } else throw new Error(type);
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = a1 / a0; this.a2 = a2 / a0; this.z1 = 0; this.z2 = 0;
  }
  run(x) {
    const y = this.b0 * x + this.z1;
    this.z1 = this.b1 * x - this.a1 * y + this.z2;
    this.z2 = this.b2 * x - this.a2 * y;
    return y;
  }
}
const filterInPlace = (x, ...fs) => { for (const f of fs) for (let i = 0; i < x.length; i++) x[i] = f.run(x[i]); return x; };

// K-взвешивание BS.1770: по нему меряем громкость, как LUFS
const kFilter = (x, i0 = 0, i1 = x.length) => {
  const a = new BQ('hshelf', 1681.97, 0.70718, 3.99984), b = new BQ('hp', 38.135, 0.50033);
  const out = new Float32Array(i1 - i0);
  for (let i = i0; i < i1; i++) out[i - i0] = b.run(a.run(x[i]));
  return out;
};
// Средняя мощность по каналам на участке [a, b) секунд (K-взвешенная копия передаётся готовой)
const powerOf = (chs, a, b, off = 0) => {
  let s = 0, c = 0;
  const i0 = Math.max(0, Math.floor(a * SR) - off), i1 = Math.min(chs[0].length, Math.floor(b * SR) - off);
  for (const ch of chs) for (let i = i0; i < i1; i++) { s += ch[i] * ch[i]; c++; }
  return s / Math.max(1, c);
};
const kRms = (bus, a, b) => {
  const pre = Math.floor(Math.max(0, a - 0.5) * SR), end = Math.min(N, Math.ceil(b * SR));
  return Math.sqrt(powerOf(bus.map((ch) => kFilter(ch, pre, end)), a, b, pre));
};
// Интегральная громкость со стробированием, как в BS.1770 (блоки 400 мс, шаг 100 мс)
function gatedLoud(kchs) {
  const B = Math.round(0.4 * SR), H = Math.round(0.1 * SR), blocks = [];
  for (let i = 0; i + B <= kchs[0].length; i += H) {
    let s = 0;
    for (const ch of kchs) for (let j = i; j < i + B; j++) s += ch[j] * ch[j];
    blocks.push(s / (B * kchs.length));
  }
  const abs = blocks.filter((p) => p > 1e-7);
  if (!abs.length) return 1e-12;
  const rel = abs.reduce((s, p) => s + p, 0) / abs.length * 0.1;
  const g = abs.filter((p) => p > rel);
  return Math.sqrt(g.reduce((s, p) => s + p, 0) / g.length);
}

// ---------- темп: ровный пульс, сильная доля на мажоре (sw4a) и на возврате минора (sw6a) ----------
// Три участка: ре минор до sw4a, ре мажор до sw6a, ре минор до конца. В каждом целое число тактов 4/4,
// темп между участками отличается меньше чем на 2 %, на слух он ровный.
const A_MAJ = EV.sw4a, A_MIN = EV.sw6a;
let TEMPO = null;
for (let nA = 2; nA <= 40; nA++) for (let nB = 1; nB <= 20; nB++) {
  const bA = A_MAJ / (4 * nA), bB = (A_MIN - A_MAJ) / (4 * nB);
  if (bA < 0.78 || bA > 0.97 || bB < 0.78 || bB > 0.97) continue;
  const cost = Math.abs(Math.log(bA / bB)) + 0.15 * Math.abs(Math.log((bA + bB) / 2 / 0.87));
  if (!TEMPO || cost < TEMPO.cost) TEMPO = { cost, nA, nB, bA, bB };
}
if (!TEMPO) throw new Error('не удалось подобрать темп под sw4a/sw6a');
const BARS = [];
for (let b = 0; b < TEMPO.nA; b++) BARS.push({ sec: 'A', j: b, t0: b * 4 * TEMPO.bA, beat: TEMPO.bA });
for (let b = 0; b < TEMPO.nB; b++) BARS.push({ sec: 'B', j: b, t0: A_MAJ + b * 4 * TEMPO.bB, beat: TEMPO.bB });
const bC = TEMPO.bB;
for (let b = 0; A_MIN + b * 4 * bC < TOTAL; b++) BARS.push({ sec: 'C', j: b, t0: A_MIN + b * 4 * bC, beat: bC });
// Тоника финала: первый такт после голоса, от которого до конца остаётся не меньше 2,5 с
const cBars = BARS.filter((x) => x.sec === 'C');
let FT = cBars.findIndex((x) => x.t0 >= LAST_E + 1.8 && x.t0 <= TOTAL - 2.5);
if (FT < 0) FT = cBars.reduce((k, x, i) => (x.t0 <= TOTAL - 2.5 && x.t0 > LAST_E - 1 ? i : k), cBars.length - 1);
FT = Math.max(1, FT);
BARS.splice(BARS.indexOf(cBars[FT]) + 1);
cBars.length = FT + 1;
BARS.forEach((x, i) => { x.i = i; x.t1 = i + 1 < BARS.length ? BARS[i + 1].t0 : TOTAL; });

// ---------- гармония и своя мелодия ----------
// pad — четыре голоса подкладки (сосед к соседу, общие звуки держатся), b — бас, arp — звуки для перебора арфы
const CH = {
  Dm: { b: 38, pad: [50, 57, 62, 65], arp: [50, 57, 62, 65, 69] },
  DmC: { b: 36, pad: [48, 57, 62, 65], arp: [48, 57, 62, 65, 69] },
  Bb: { b: 34, pad: [46, 58, 62, 65], arp: [46, 53, 58, 62, 65] },
  Bb2: { b: 34, pad: [46, 58, 65, 70], arp: [46, 53, 58, 62, 65] },
  A: { b: 33, pad: [45, 57, 61, 64], arp: [45, 52, 57, 61, 64] },
  A7: { b: 33, pad: [49, 55, 61, 64], arp: [45, 52, 55, 61, 64] },
  Gm: { b: 43, pad: [50, 58, 62, 67], arp: [43, 50, 55, 58, 62] },
  C: { b: 36, pad: [48, 55, 64, 67], arp: [48, 55, 60, 64, 67] },
  F: { b: 41, pad: [48, 57, 65, 69], arp: [41, 48, 53, 57, 60] },
  D: { b: 38, pad: [50, 57, 62, 66], arp: [50, 57, 62, 66, 69] },
  Bm: { b: 35, pad: [47, 54, 62, 66], arp: [47, 54, 59, 62, 66] },
  G: { b: 43, pad: [47, 55, 62, 67], arp: [43, 50, 55, 59, 62] },
  Aj: { b: 33, pad: [49, 57, 61, 64], arp: [45, 52, 57, 61, 64] },
};
// Мелодия: [доля в такте, нота, длина в долях]. Минор — баян, мажор — кларнет.
// Песня: запев с опеванием ля, широкий ход к верхнему ре, спуск по ступеням с задержаниями, вводный до-диез.
const SEC_A = [
  { ch: 'Dm', mel: [[1, 69, 1.5], [2.5, 70, 0.5], [3, 69, 1]] },
  { ch: 'DmC', mel: [[0, 74, 2], [2, 72, 0.5], [2.5, 70, 0.5], [3, 69, 1]] },
  { ch: 'Bb', mel: [[0, 67, 1], [1, 65, 0.5], [1.5, 67, 0.5], [2, 65, 1], [3, 62, 1]] },
  { ch: 'A', mel: [[0, 64, 2], [2, 61, 1], [3, 64, 1]] },
  { ch: 'Dm', mel: [[0, 65, 0.5], [0.5, 69, 1], [1.5, 74, 1.5], [3, 72, 1]] },
  { ch: 'Gm', mel: [[0, 70, 1.5], [1.5, 69, 0.5], [2, 67, 2]] },
  { ch: 'C', mel: [[0, 67, 0.5], [0.5, 72, 1.5], [2, 70, 1], [3, 69, 0.5], [3.5, 67, 0.5]] },
  { ch: 'F', mel: [[0, 65, 2], [2, 69, 1], [3, 72, 1]] },
  { ch: 'Bb2', mel: [[0, 74, 2], [2, 72, 1], [3, 70, 1]] },
  { ch: 'F', mel: [[0, 69, 1.5], [1.5, 72, 0.5], [2, 77, 1.5], [3.5, 76, 0.5]] },
  { ch: 'Gm', mel: [[0, 74, 1], [1, 70, 1], [2, 67, 1], [3, 70, 1]] },
  { ch: 'A7', mel: [[0, 69, 1.5], [1.5, 67, 0.5], [2, 64, 1], [3, 73, 1]] },
];
// Мечта у камина: ре мажор, мелодия поднимается к соль на «камина» и успокаивается на ре к «полночи»
const SEC_B = [
  { ch: 'D', mel: [[0, 74, 1.5], [1.5, 73, 0.5], [2, 74, 0.5], [2.5, 76, 0.5], [3, 78, 1]] },
  { ch: 'Bm', mel: [[0, 78, 2], [2, 76, 0.5], [2.5, 74, 0.5], [3, 71, 1]] },
  { ch: 'G', mel: [[0, 71, 1], [1, 74, 1], [2, 79, 1.5], [3.5, 78, 0.5]] },
  { ch: 'Aj', mel: [[0, 76, 1.5], [1.5, 74, 0.5], [2, 73, 1], [3, 69, 1]] },
  { ch: 'D', mel: [[0, 74, 2.5], [2.5, 73, 0.5], [3, 74, 1]] },
];
// Возврат: фа-бекар на смахивании остужает аккорд, песня вздыхает вниз и смолкает вместе с ямщиком
const C_FIRST = { ch: 'Dm', mel: [[0, 69, 1], [1, 65, 1], [2, 64, 0.5], [2.5, 62, 1.5]] };
const C_MID = [{ ch: 'Dm', mel: [] }, { ch: 'Gm', mel: [] }, { ch: 'Bb', mel: [] }];
const C_PICKUP = [[3, 65, 0.5], [3.5, 67, 0.5]]; // затакт к последней фразе, только если голос уже кончился
const C_LAST = { ch: 'A7', mel: [[0, 69, 0.5], [0.5, 74, 1.5], [2, 76, 0.5], [2.5, 74, 0.5], [3, 73, 1]] };
const C_END = { ch: 'Dm', mel: [[0, 74, 99]] };

const mod = (a, n) => ((a % n) + n) % n;
// Такты считаем от конца участка: последний такт минора — доминанта, последний такт мажора — ре мажор
function pick(list, j, n) {
  if (j === 0) return list[0];
  const k = list.length - (n - j);
  return list[k >= 1 ? k : 1 + mod(k - 1, list.length - 1)];
}
for (const bar of BARS) {
  if (bar.sec === 'A') Object.assign(bar, pick(SEC_A, bar.j, TEMPO.nA));
  else if (bar.sec === 'B') Object.assign(bar, pick(SEC_B, bar.j, TEMPO.nB));
  else if (bar.j === FT) Object.assign(bar, C_END);
  else if (bar.j === FT - 1) Object.assign(bar, C_LAST);
  else if (bar.j === 0) Object.assign(bar, C_FIRST);
  else Object.assign(bar, C_MID[mod(C_MID.length - (FT - 1 - bar.j), C_MID.length)]);
  if (bar.sec === 'C' && bar.j === FT - 2) bar.mel = [...bar.mel, ...C_PICKUP.filter(([s]) => bar.t0 + s * bar.beat > LAST_E + 0.15)];
}
const barAt = (t) => BARS.find((x) => t >= x.t0 && t < x.t1) || BARS[BARS.length - 1];

// ---------- инструменты ----------
const TB = 4096, TABLES = new Map();
const HARM = {
  str: (n) => n ** -1.1,                                    // смычковые: пила с мягким завалом
  reed: (n) => n ** -0.85 * (n % 2 ? 1 : 0.75),             // язычок баяна: густой, чуть «полый»
  clar: (n) => (n % 2 ? n ** -0.95 : 0.07 * n ** -0.5) * (n > 9 ? Math.exp(-(n - 9) / 3) : 1), // нечётные гармоники
};
function wtable(kind, nh) {
  const key = `${kind}${nh}`;
  if (TABLES.has(key)) return TABLES.get(key);
  const t = new Float32Array(TB + 1);
  let e = 0;
  for (let n = 1; n <= nh; n++) {
    const a = HARM[kind](n); e += a * a;
    for (let i = 0; i < TB; i++) t[i] += a * Math.sin(2 * Math.PI * n * i / TB);
  }
  const g = 1 / Math.sqrt(e / 2);
  for (let i = 0; i < TB; i++) t[i] *= g;
  t[TB] = t[0];
  TABLES.set(key, t);
  return t;
}
const osc = (tb, ph) => { const x = ph * TB, i = x | 0; return tb[i] + (tb[i + 1] - tb[i]) * (x - i); };

// Струнная подкладка: три слегка расстроенных голоса, смычковая атака, двойной фильтр «тепла»
function padNote(bus, t0, dur, m, { gain = 1, pan = 0, atk = 1.1, rel = 1.5, lp = 1700 } = {}) {
  const f = hz(m), tb = wtable('str', clamp(Math.floor(14000 / (f * 1.01)), 1, 30));
  const i0 = Math.max(0, Math.round(t0 * SR)), n = Math.min(N - i0, Math.round((dur + rel * 2.5) * SR));
  if (n <= 0) return;
  const det = [-0.0034, 0.0003, 0.0037], spread = [-0.25, 0, 0.25];
  const ph = det.map(() => rnd()), vr = det.map(() => 4.3 + rnd() * 1.1), vp = det.map(() => rnd() * 6.283);
  const gl = spread.map((s) => panL(pan + s) / Math.sqrt(3)), gr = spread.map((s) => panR(pan + s) / Math.sqrt(3));
  const a = 1 - Math.exp(-2 * Math.PI * lp / SR);
  let l1 = 0, l2 = 0, q1 = 0, q2 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const e = sstep(t / atk) * (t < dur ? 1 : Math.exp(-(t - dur) / (rel * 0.4)));
    let L = 0, R = 0;
    for (let k = 0; k < 3; k++) {
      ph[k] += f * (1 + det[k] + 0.0017 * Math.sin(2 * Math.PI * vr[k] * t + vp[k])) / SR;
      ph[k] -= Math.floor(ph[k]);
      const s = osc(tb, ph[k]);
      L += s * gl[k]; R += s * gr[k];
    }
    l1 += a * (L - l1); l2 += a * (l1 - l2); q1 += a * (R - q1); q2 += a * (q1 - q2);
    bus[0][i0 + i] += l2 * e * gain; bus[1][i0 + i] += q2 * e * gain;
  }
}

// Мелодическая линия одним дыханием: легато с подъездом высоты, у баяна — мех (разбухание длинных нот),
// у кларнета — поздняя вибрация и дыхание. Возвращает моно.
function renderLine(notes, { kind, det = [0], atk = 0.06, rel = 0.14, glide = 0.035, vib = 0, breath = 0, swell = 0.12 }) {
  const out = new Float32Array(N);
  if (!notes.length) return out;
  notes.sort((x, y) => x.t0 - y.t0);
  const fmax = Math.max(...notes.map((x) => hz(x.m))) * 1.02;
  const tb = wtable(kind, clamp(Math.floor(15000 / fmax), 1, 40));
  const iS = Math.max(0, Math.floor(notes[0].t0 * SR)), iE = Math.min(N, Math.ceil((notes[notes.length - 1].t1 + rel * 8) * SR));
  const aA = 1 - Math.exp(-1 / (atk * 0.33 * SR)), aR = 1 - Math.exp(-1 / (rel * 0.33 * SR)), aG = 1 - Math.exp(-1 / (glide * 0.4 * SR));
  const ph = det.map(() => rnd());
  let k = -1, amp = 0, lf = Math.log2(hz(notes[0].m)), bn = 0;
  for (let i = iS; i < iE; i++) {
    const t = i / SR;
    while (k + 1 < notes.length && t >= notes[k + 1].t0) {
      k++;
      const nt = notes[k];
      nt.legato = k > 0 && nt.t0 - notes[k - 1].t1 < 0.03;
      if (!nt.legato) lf = Math.log2(hz(nt.m));
    }
    let target = 0, tf = lf, vibAmt = 0;
    if (k >= 0) {
      const nt = notes[k], u = t - nt.t0, d = nt.t1 - nt.t0;
      if (t < nt.t1) {
        target = nt.v * (d > 0.9 ? 1 - swell + swell * Math.sin(Math.PI * Math.min(1, u / d)) : 1);
        if (nt.legato) target *= 1 - 0.3 * Math.exp(-u / 0.04);
        tf = Math.log2(hz(nt.m));
        vibAmt = vib * sstep((u - 0.3) / 0.5);
      }
    }
    amp += (target > amp ? aA : aR) * (target - amp);
    lf += (k >= 0 && notes[k].legato ? aG : 1) * (tf - lf);
    const f = 2 ** lf * (1 + vibAmt * Math.sin(2 * Math.PI * 5.1 * t));
    let s = 0;
    for (let j = 0; j < det.length; j++) { ph[j] += f * (1 + det[j]) / SR; ph[j] -= Math.floor(ph[j]); s += osc(tb, ph[j]); }
    s /= det.length;
    if (breath) { bn += 0.12 * (white() - bn); s += breath * bn * 6; }
    out[i] = s * amp;
  }
  return out;
}

// Затухающие моды (щипок, удар): рекурсивные осцилляторы, [частота, громкость, скорость затухания, фаза?]
function modal(bus, t0, P, { dur, gain = 1, pan = 0, atk = 0.002, click = 0, clickLen = 0.002 }) {
  const i0 = Math.max(0, Math.round(t0 * SR)), n = Math.min(N - i0, Math.round(dur * SR));
  if (n <= 0) return;
  const st = P.filter((p) => p[0] < SR * 0.45).map(([f, a, d, ph = rnd() * 6.283]) => (
    { c: Math.cos(2 * Math.PI * f / SR), s: Math.sin(2 * Math.PI * f / SR), re: Math.cos(ph), im: Math.sin(ph), a, k: Math.exp(-d / SR) }));
  const gl = gain * panL(pan), gr = gain * panR(pan), fadeN = Math.min(n, Math.round(0.01 * SR));
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (const p of st) { const re = p.re * p.c - p.im * p.s; p.im = p.re * p.s + p.im * p.c; p.re = re; s += p.a * p.im; p.a *= p.k; }
    const t = i / SR;
    if (t < atk) s *= t / atk;
    if (click && t < clickLen) s += click * white() * (1 - t / clickLen);
    if (i > n - fadeN) s *= (n - i) / fadeN;
    bus[0][i0 + i] += s * gl; bus[1][i0 + i] += s * gr;
  }
}
// Челеста: молоточек по пластинке с резонатором — основной тон и четвёртый обертон
const celesta = (bus, t, m, gain = 1, pan = 0) => {
  const f = hz(m);
  modal(bus, t, [[f, 1, 1.7], [2 * f, 0.05, 4], [3.98 * f, 0.22, 6.5], [6.9 * f, 0.04, 11], [10.4 * f, 0.015, 18]],
    { dur: 3.4, gain, pan, atk: 0.0015, click: 0.12 });
};
// Пиццикато контрабаса: щипок ближе к грифу, лёгкая негармоничность струны
const pizz = (bus, t, m, gain = 1, pan = 0) => {
  const f = hz(m), P = [];
  for (let n = 1; n <= 12 && n * f < 6000; n++) P.push([n * f * Math.sqrt(1 + 0.00012 * n * n), Math.abs(Math.sin(n * Math.PI * 0.21)) / n, 2.6 + 1.2 * n ** 1.3]);
  modal(bus, t, P, { dur: 2.4, gain, pan, atk: 0.004 });
};
// Арфа: мягкий щипок, звенит дольше
const harp = (bus, t, m, gain = 1, pan = 0) => {
  const f = hz(m), P = [];
  for (let n = 1; n <= 10 && n * f < 9000; n++) P.push([n * f * Math.sqrt(1 + 0.00005 * n * n), Math.abs(Math.sin(n * Math.PI * 0.3)) / n ** 1.2, 1.1 + 0.8 * n]);
  modal(bus, t, P, { dur: 3.0, gain, pan, atk: 0.003 });
};

// ---------- партитура ----------
const pad = stereo(), pulse = stereo(), harpBus = stereo(), cel = stereo();
const reedNotes = [], clarNotes = [];
const PAD_PAN = [-0.35, -0.1, 0.12, 0.35];
// Подкладка: одинаковые звуки соседних тактов связываются в одну долгую ноту
{
  const voices = [[], [], [], [], []]; // 0..3 — голоса, 4 — бас
  for (const bar of BARS) {
    const c = CH[bar.ch], warm = bar.sec === 'B', notes = [...c.pad, c.b];
    const vel = bar.sec === 'B' ? 1.12 : bar.sec === 'C' ? (bar.j >= FT - 1 ? 0.95 : 0.85) : bar.i === 0 ? 0.9 : 1;
    notes.forEach((m, v) => {
      const list = voices[v], prev = list[list.length - 1];
      if (prev && prev.m === m && Math.abs(prev.t1 - bar.t0) < 1e-6 && prev.warm === warm) { prev.t1 = bar.t1; prev.vel = Math.max(prev.vel, vel); }
      else list.push({ m, t0: bar.t0, t1: bar.t1, vel, warm });
    });
  }
  voices.forEach((list, v) => {
    for (const x of list) {
      const end = Math.abs(x.t1 - TOTAL) < 1e-6;
      padNote(pad, x.t0 - (x.t0 > 0 ? 0.08 : 0), x.t1 - x.t0 + (end ? 0.5 : 0.25), x.m, {
        gain: x.vel * (v === 4 ? 0.62 : 1), pan: v === 4 ? 0 : PAD_PAN[v],
        atk: x.t0 === 0 ? 2.2 : 0.9, rel: end ? 2 : 1.3, lp: x.warm ? 2500 : v === 4 ? 900 : 1650,
      });
    }
  });
}
// Пульс: пиццикато на 1 и 3, арфа «рысцой» восьмыми с дороги во 2 строфе, у камина — плавный перебор
const HARP_FROM = EV.sw1a - 1;
for (const bar of BARS) {
  const c = CH[bar.ch], q = bar.beat;
  if (bar.sec === 'A' && bar.i === 0) continue;
  if (bar.sec === 'C' && bar.j === FT) { pizz(pulse, bar.t0, c.b, 1.0, 0); continue; }
  const pv = bar.sec === 'C' ? (bar.j === FT - 1 ? 0.6 : 0.78) : 1;
  pizz(pulse, bar.t0, c.b, 1.0 * pv, -0.05);
  pizz(pulse, bar.t0 + 2 * q, c.b + 7, 0.75 * pv, 0.05);
  if (bar.sec === 'A' && bar.t0 >= HARP_FROM) {
    const pat = [0, 1, 2, 1, 3, 1, 2, 1], vel = [1, 0.55, 0.8, 0.55, 0.9, 0.55, 0.8, 0.55];
    pat.forEach((k, s) => harp(harpBus, bar.t0 + s * q / 2, c.arp[k], vel[s], -0.3 + 0.08 * k));
  }
  if (bar.sec === 'B') {
    const pat = [0, 1, 2, 3, 4, 3, 2, 1], vel = [1, 0.6, 0.75, 0.7, 0.85, 0.65, 0.7, 0.6];
    pat.forEach((k, s) => harp(harpBus, bar.t0 + s * q / 2, c.arp[k], vel[s], -0.35 + 0.15 * k));
  }
}
// Мелодия: под голосом на четверть тише, чем в паузах
for (const bar of BARS) {
  for (const [s, m, d] of bar.mel) {
    const t0 = bar.t0 + s * bar.beat, t1 = Math.min(TOTAL, bar.t0 + (s + d) * bar.beat);
    const v = (underVoice(t0 + 0.05) ? 0.75 : 1) * (bar.sec === 'C' && bar.j === FT ? 0.9 : 1);
    (bar.sec === 'B' ? clarNotes : reedNotes).push({ t0, t1: t1 - (bar.sec === 'B' ? 0 : 0.012), m, v });
  }
}
// Челеста-снежинки: в начале, через паузу между строками (только в холодных строфах), снегопад 4 строфы,
// огонёк на «огня», и снег оседает на тонике в финале
const cold = (t) => t < EV.sw4a - 0.1 || t > EV.sw6b;
const celTone = (t, k) => { const a = CH[barAt(t).ch].arp; return a[2 + (k % 3)] + 24; };
[[0.55, 86], [2.1, 81], [3.4, 77]].forEach(([t, m], k) => celesta(cel, t, m, 0.8 - 0.1 * k, 0.4 - 0.35 * k));
LINES.forEach(([, e], n) => {
  if (n + 1 >= LINES.length || n % 2 === 0) return;
  const z = LINES[n + 1][0];
  if (z - e < 0.35 || !cold(e)) return;
  celesta(cel, e + 0.06, celTone(e, n), 0.75, n % 4 === 1 ? 0.45 : -0.45);
});
{
  let t = EV.w_sneg - 1.0, k = 0;
  while (t < EV.sw4a - 0.3) {
    celesta(cel, t, celTone(t, k + 1) - (k % 2 ? 12 : 0), 0.32 + 0.15 * rnd(), -0.7 + 1.4 * rnd());
    t += 0.62 + 0.3 * rnd(); k++;
  }
}
celesta(cel, EV.w_ogn + FRAME, 93, 0.45, -0.35);
{
  const ft = cBars[FT].t0;
  [[0.5, 86, 0.7], [1.45, 81, 0.6], [2.5, 77, 0.5]].forEach(([d, m, g], k) => { if (ft + d < TOTAL - 0.8) celesta(cel, ft + d, m, g, 0.35 - 0.3 * k); });
}

// Звучание линий: баян (два язычка, сухая настройка) с формантами меха, кларнет — тёмный и тёплый
const reedMono = renderLine(reedNotes, { kind: 'reed', det: [-0.0011, 0.0012], atk: 0.07, rel: 0.16, glide: 0.03, swell: 0.16 });
filterInPlace(reedMono, new BQ('hp', 160, 0.7), new BQ('peak', 1150, 1.1, 4.5), new BQ('peak', 2600, 1.4, 2), new BQ('lp', 4600, 0.7));
const clarMono = renderLine(clarNotes, { kind: 'clar', det: [0], atk: 0.09, rel: 0.2, glide: 0.05, vib: 0.0022, breath: 0.012, swell: 0.1 });
filterInPlace(clarMono, new BQ('hp', 200, 0.7), new BQ('peak', 1500, 1.0, 2), new BQ('lp', 3200, 0.6));
const reed = stereo(), clar = stereo();
for (let i = 0; i < N; i++) {
  reed[0][i] = reedMono[i] * panL(0.1); reed[1][i] = reedMono[i] * panR(0.1);
  clar[0][i] = clarMono[i] * panL(-0.08); clar[1][i] = clarMono[i] * panR(-0.08);
}

// ---------- шумы по событиям в кадре ----------
const sfx = stereo();
const tmp = stereo();
const clearTmp = () => { tmp[0].fill(0); tmp[1].fill(0); };
const put = (i, s, p) => { if (i >= 0 && i < N) { tmp[0][i] += s * panL(p); tmp[1][i] += s * panR(p); } };
// Песок: шипение в полосе, «зёрна» — редкие щелчки через резонатор, плотный низ — валик под ладонью
function sandSweep(a, b, { p0 = -0.85, p1 = 0.85, low = 1 } = {}) {
  const t0 = a + FRAME, dur = b - a, i0 = Math.round(t0 * SR), n = Math.round((dur + 0.6) * SR);
  const hp = new BQ('hp', 1700), lp = new BQ('lp', 7800), lo1 = new BQ('hp', 170), lo2 = new BQ('lp', 650), gr = new BQ('bp', 4200, 1.6);
  let mod = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, u = t / dur;
    const speed = u < 1 ? 6 * u * (1 - u) / 1.5 : 0;
    const env = speed ** 0.8, settle = u < 1 ? 0 : Math.exp(-(t - dur) / 0.18);
    mod += 0.004 * (white() - mod);
    const hiss = lp.run(hp.run(white())) * (0.75 + 9 * mod);
    const roll = lo2.run(lo1.run(white()));
    const click = rnd() < 0.014 * env + 0.004 * settle ? white() * 9 : 0;
    const s = env * hiss + 0.55 * low * env ** 1.5 * roll + gr.run(click) * (env + 0.6 * settle);
    put(i0 + i, s, p0 + (p1 - p0) * sstep(Math.min(1, u)));
  }
}
// Ладонь смахивает строки: волна слева направо за 0,6 с, мягче и уже по полосе
function textSwish(t) {
  const i0 = Math.round((t + FRAME) * SR), dur = 0.62, n = Math.round(dur * SR);
  const hp = new BQ('hp', 1200), lp = new BQ('lp', 5200);
  for (let i = 0; i < n; i++) {
    const u = i / n, e = Math.sin(Math.PI * u) ** 1.4;
    put(i0 + i, lp.run(hp.run(white())) * e, -0.5 + u);
  }
}
// Титр: струйка песка падает на стекло там, где ложатся буквы (TROWS и падение зёрен — как в scenes.js)
function sandPour() {
  const rows = [
    { a: 0.35, b: 2.5, y: 470, px: 150, w: 880 },
    { a: 2.3, b: 3.7, y: 590, px: 60, w: 700 },
    { a: 3.5, b: 4.1, y: 668, px: 52, w: 110 },
  ];
  const hp = new BQ('hp', 2600), lp = new BQ('lp', 9500), pile1 = new BQ('bp', 900, 0.9), gr = new BQ('bp', 5200, 1.3);
  const n = Math.round(4.9 * SR);
  let mod = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR + FRAME;
    let env = 0, x = 0, wsum = 0;
    for (const r of rows) {
      const life = (r.y - r.px * 0.4 + 10) / 1300, s = r.a - 0.3 + life, e = r.b - 0.05 + life;
      const g = sstep((t - s) / 0.12) * (1 - sstep((t - e + 0.2) / 0.25)) * (r.px > 100 ? 1 : 0.75);
      if (g <= 0) continue;
      const rx = 960 - r.w / 2 - 30 + (r.w + 60) * sstep(prog(t - life + 0.3, r.a, r.b));
      env += g; x += rx * g; wsum += g;
    }
    if (env <= 0) continue;
    mod += 0.01 * (white() - mod);
    const hiss = lp.run(hp.run(white())) * (0.8 + 6 * mod), pile = pile1.run(white());
    const click = rnd() < 0.05 ? white() * 5 : 0;
    put(Math.round(t * SR), Math.min(1.2, env) * (hiss + 0.35 * pile + gr.run(click)), (x / wsum - 960) / 960 * 0.8);
  }
}
// Колокольчик под дугой: один и тот же тон (однозвучный), колоколовые обертоны с малой терцией, язычок щёлкает
function bellRing(t, gain, pan) {
  const f = hz(86) * (1 + (rnd() - 0.5) * 0.002);
  modal(tmp, t, [[0.5 * f, 0.16, 3], [f, 1, 4.6], [f + 1.3, 0.35, 4.8], [1.183 * f, 0.5, 5.6], [1.506 * f, 0.26, 6.6],
    [2.0 * f, 0.4, 7.2], [2.0 * f + 2.1, 0.15, 7.5], [2.51 * f, 0.17, 9], [2.66 * f, 0.15, 10], [3.01 * f, 0.1, 12], [4.08 * f, 0.05, 16]],
  { dur: 1.6, gain, pan, atk: 0.0008, click: 0.35, clickLen: 0.0015 });
  if (rnd() < 0.45) modal(tmp, t + 0.022 + rnd() * 0.01, [[f, 0.4, 6], [1.183 * f, 0.2, 7], [2 * f, 0.15, 9]], { dur: 0.8, gain: gain * 0.35, pan, atk: 0.0008 });
}
// Копыта по снегу: глухой удар и хруст; фазы ног — как у коней в figures.js (ph = t·2π·1.9, кони со сдвигом 1,9 / 0 / 0,8)
function hoofs(a, end, fadeA, fadeB, panAt) {
  const F = 1.9, horses = [[1.9, 0.6], [0, 1], [0.8, 0.7]];
  const legs = [Math.PI / 2, Math.PI / 2 - 0.55 * Math.PI, 1.5 * Math.PI - 0.62 * Math.PI, 1.5 * Math.PI - 1.17 * Math.PI];
  const hits = [];
  for (const [off, g] of horses) for (const lg of legs) {
    let ph0 = lg - off;
    for (let k = Math.floor(a * F) - 1; k <= Math.ceil(end * F) + 1; k++) {
      const t = (mod(ph0, 2 * Math.PI) + 2 * Math.PI * k) / (2 * Math.PI * F);
      if (t >= a && t < end) hits.push([t + FRAME + (rnd() - 0.5) * 0.012, g * (0.6 + 0.4 * rnd())]);
    }
  }
  for (const [t, g] of hits) {
    const e = sstep((t - a) / fadeA) * (1 - sstep((t - fadeB[0]) / (fadeB[1] - fadeB[0])));
    if (e <= 0) continue;
    const i0 = Math.round(t * SR), n = Math.round(0.09 * SR), lp = new BQ('lp', 240, 1.3), hp = new BQ('hp', 60), cr = new BQ('bp', 2400, 0.9);
    for (let i = 0; i < n; i++) {
      const u = i / SR, thud = lp.run(hp.run(white())) * Math.exp(-u / 0.022) * 3, crunch = cr.run(white()) * Math.exp(-u / 0.035) * 0.5;
      put(i0 + i, (thud + crunch) * g * e * Math.min(1, u / 0.002), panAt(t));
    }
  }
}
// Камин: редкие щелчки поленьев, тихое дыхание пламени; на «камина» огонь вспыхивает — вздох и россыпь искр
function fire(a, b, flareT) {
  const i0 = Math.round(a * SR), n = Math.round((b - a) * SR);
  const fl = new BQ('lp', 320, 0.8), fh = new BQ('hp', 90), wl = new BQ('bp', 700, 0.7);
  const freqs = [1700, 2500, 3400, 4700];
  let pending = [];
  for (let i = 0; i < n; i++) {
    const t = a + i / SR;
    const env = sstep((t - a) / 1.5) * (1 - sstep((t - (b - 0.7)) / 0.7));
    const flare = t > flareT ? Math.exp(-(t - flareT) / 0.9) * sstep((t - flareT) / 0.15) : 0;
    const breathL = fl.run(fh.run(white())) * (0.5 + 0.5 * Math.sin(t * 7 + 1.3 * Math.sin(t * 2.3))) * 0.6;
    const whoosh = wl.run(white()) * flare * 1.6;
    if (rnd() < (6 + 30 * flare) * env / SR) {
      const amp = Math.min(6, 0.6 / Math.sqrt(rnd() + 0.02)), bq = new BQ('bp', freqs[Math.floor(rnd() * 4)] * (0.8 + 0.4 * rnd()), 2.2);
      const k = 1 + Math.floor(rnd() * 3);
      for (let j = 0; j < k; j++) pending.push({ i: i + Math.round(rnd() * 0.004 * SR), amp: amp * (1 - 0.3 * j), bq, left: Math.round(0.012 * SR) });
    }
    let c = 0;
    for (const p of pending) { if (i >= p.i && p.left > 0) { c += p.bq.run(i === p.i ? p.amp : 0); p.left--; } }
    if (pending.length > 24) pending = pending.filter((p) => p.left > 0);
    put(i0 + i, env * (breathL + whoosh) + c * env, (rnd() - 0.5) * 0.3);
  }
}
// Ход стрелки: тик-так, ровно делит её полный круг
function ticks(a, b) {
  const k = Math.max(2, Math.round((b - a) / 0.25)), step = (b - a) / k;
  for (let j = 0; j <= k; j++) {
    const f = j % 2 ? 1750 : 2350;
    modal(tmp, a + j * step + FRAME, [[f, 1, 140], [f * 2.31, 0.45, 220], [f * 3.7, 0.2, 320]], { dur: 0.07, gain: 1, pan: 0.02, atk: 0.0004, click: 0.6, clickLen: 0.0012 });
  }
}
// Полночь: один мягкий удар часовой пружины-гонга (стержень, негармоничные обертоны)
function strike(t) {
  const f = hz(57);
  modal(tmp, t + FRAME, [[f, 1, 0.75], [f * 1.0035, 0.45, 0.85], [2 * f, 0.1, 1.5], [2.76 * f, 0.32, 1.6], [5.4 * f, 0.1, 3], [8.93 * f, 0.03, 5]],
    { dur: 4.5, gain: 1, pan: 0, atk: 0.006, click: 0.04, clickLen: 0.003 });
}
// Палец процарапывает буквы: шорох с «зернистым» дрожанием, панорама идёт за пальцем
function scratch(a, dur, w) {
  const i0 = Math.round((a + FRAME) * SR), n = Math.round(dur * SR), bp = new BQ('bp', 2300, 0.8), hp = new BQ('hp', 700);
  let g = 0;
  for (let i = 0; i < n; i++) {
    const u = i / n, speed = 6 * u * (1 - u) / 1.5;
    g += 0.02 * (Math.abs(white()) - g);
    const strokes = 0.55 + 0.45 * Math.sin(2 * Math.PI * 7.5 * u * dur) ** 2;
    put(i0 + i, bp.run(hp.run(white())) * speed ** 0.7 * strokes * (0.4 + 2 * g), ((960 - w / 2 + w * sstep(u)) - 960) / 960 * 0.8);
  }
}

// ---------- шумы Палеха: золото на чёрном лаке ----------
// Высокие колокольчики берут звуки текущего аккорда на две-три октавы выше (D6…A7): мерцание не спорит с гармонией
const goldScale = (t) => [...new Set(CH[barAt(t).ch].arp.flatMap((m) => [m + 24, m + 36]))]
  .filter((m) => m >= 84 && m <= 106).sort((x, y) => x - y);
// Искорка — крошечный колокольчик-пластинка (обертоны 2,76 и 5,4); второй, чуть расстроенный тон даёт мерцание.
// Атака 2,5 мс без щелчка, len растягивает звон
function spark(t, m, gain, pan, len = 1) {
  const f = hz(m);
  const P = [[f, 1, 7 / len], [f * 1.0023, 0.35, 8 / len], [2.76 * f, 0.2, 15 / len], [5.4 * f, 0.05, 26 / len]].filter((p) => p[0] < 13000);
  modal(tmp, t, P, { dur: 0.6 * len + 0.15, gain, pan, atk: 0.0025 });
}
// Мягкий «воздух» над золотом: гладкий шум 5–11 кГц без зерна, чуть дрожит, как блик
const airBand = () => { const hp = new BQ('hp', 5200, 0.7), lp = new BQ('lp', 11000, 0.7); return () => lp.run(hp.run(white())); };
// Золото пишет строку слева направо: шелест высоких колокольчиков идёт за пишущим концом строки,
// высота искр поднимается вдоль строки (глиссандо по звукам аккорда), на последней букве — звонкий блик.
// rows: { a, b — когда пишется строка, w — её ширина в пикселях кадра 1920, g — громкость }
function goldWrite(rows, { rate = 20, air = 0.45 } = {}) {
  const at = (r, t) => sstep(prog(t, r.a, r.b));
  const panOf = (r, u) => clamp(r.w * (u - 0.5) / 960 * 0.8, -0.9, 0.9);
  for (const r of rows) {
    const g = r.g ?? 1, dur = r.b - r.a, k = Math.max(5, Math.round(dur * rate));
    for (let j = 0; j < k; j++) {
      const t = r.a + dur * (j + rnd()) / k, u = at(r, t), sc = goldScale(t);
      const idx = clamp(Math.round(u * (sc.length - 1) + (rnd() - 0.5) * 2.5), 0, sc.length - 1);
      spark(t + FRAME, sc[idx], g * (0.3 + 0.7 * rnd()) * (0.6 + 0.4 * sstep(u * 4)), panOf(r, u) + (rnd() - 0.5) * 0.1, 0.5 + 0.9 * rnd());
    }
    const sc = goldScale(r.b);
    spark(r.b + FRAME, sc[sc.length - 1], g * 0.75, panOf(r, 1), 2.2);
  }
  const tA = Math.min(...rows.map((r) => r.a)), tB = Math.max(...rows.map((r) => r.b)) + 0.5;
  const i0 = Math.round((tA + FRAME) * SR), n = Math.round((tB - tA) * SR), hiss = airBand();
  for (let i = 0; i < n; i++) {
    const t = tA + i / SR, s = hiss();
    let e = 0, x = 0;
    for (const r of rows) {
      const q = sstep((t - r.a) / 0.15) * (1 - sstep((t - r.b) / 0.35)) * (r.g ?? 1);
      if (q > 0) { e += q; x += panOf(r, at(r, t)) * q; }
    }
    if (e <= 0) continue;
    const shim = 0.65 + 0.35 * Math.sin(2 * Math.PI * 6.3 * t) * Math.sin(2 * Math.PI * 2.1 * t + 1);
    put(i0 + i, air * Math.min(1.2, e) * shim * s, x / e);
  }
}
// Смена картины: по крышке шкатулки слева направо проходит золотая кромка. Мягкий воздушный взмах —
// гладкий шум через полосовой фильтр, полоса поднимается и опускается со скоростью кромки (без зерна песка),
// и 2–4 искорки-звоночка на самой кромке, всё выше по ходу
function goldSweep(a, b, { p0 = -0.85, p1 = 0.85, sparks = 3, body = 1 } = {}) {
  const t0 = a + FRAME, dur = b - a, i0 = Math.round(t0 * SR), n = Math.round((dur + 0.05) * SR);
  const hp = new BQ('hp', 140, 0.7), soft = new BQ('lp', 7500, 0.7), hiss = airBand(), q = 1 / 1.5;
  let lo = 0, bd = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, u = t / dur, speed = u < 1 ? 4 * u * (1 - u) : 0;
    const fc = 360 + 2300 * speed ** 1.5, f1 = 2 * Math.sin(Math.PI * fc / SR);
    lo += f1 * bd; const hi = hp.run(white()) - lo - q * bd; bd += f1 * hi; // фильтр Чемберлина: частоту можно вести плавно
    put(i0 + i, body * speed ** 1.3 * soft.run(bd) + 0.1 * speed ** 2.5 * hiss(), p0 + (p1 - p0) * sstep(Math.min(1, u)));
  }
  for (let k = 0; k < sparks; k++) {
    const u = 0.18 + 0.64 * (k + 0.5 + (rnd() - 0.5) * 0.5) / sparks, t = a + dur * u, sc = goldScale(t);
    const idx = clamp(Math.round((k + 1) / (sparks + 1) * (sc.length - 1) + (rnd() - 0.5)), 0, sc.length - 1);
    spark(t + FRAME, sc[idx], 0.2 * (0.75 + 0.25 * rnd()), p0 + (p1 - p0) * sstep(u), 1.6 + 0.8 * rnd());
  }
}
// Строфа рассыпается золотой пылью: еле слышный высокий шелест по ширине плашки и падающие вниз искорки
function goldDust(t) {
  const t0 = t + FRAME, dur = 0.62, i0 = Math.round(t0 * SR), n = Math.round(dur * SR), hiss = airBand();
  for (let i = 0; i < n; i++) {
    const u = i / n;
    put(i0 + i, hiss() * Math.sin(Math.PI * u) ** 1.6 * (0.75 + 0.25 * Math.sin(2 * Math.PI * 9 * u * dur)), -0.5 + u);
  }
  const sc = goldScale(t);
  for (let k = 0; k < 7; k++) {
    const u = (k + rnd()) / 7;
    spark(t0 + dur * 0.85 * u, sc[clamp(sc.length - 1 - Math.floor(u * sc.length), 0, sc.length - 1)],
      0.18 * (0.6 + 0.4 * rnd()) * Math.sin(Math.PI * (0.1 + 0.8 * u)), -0.5 + u, 0.4 + 0.3 * rnd());
  }
}

// Где сейчас тройка (TR2 в scenes.js: пружина от x = −260 к 820) и когда её закроет ладонь смахивания
const springSoftApprox = (s) => (s <= 0 ? 0 : 1 - (1 + 9.49 * s) * Math.exp(-9.49 * s));
const troikaX2 = (t) => -260 + 1080 * springSoftApprox(t - (EV.w_troi - 0.5)) + 30 * Math.sin(t * 0.7);
const coverTime = (a, b, x) => { // фронт смахивания X = lerp(−260, W+260, sstep(u))
  let lo = 0, hi = 1;
  for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (-260 + 2440 * sstep(m) < x) lo = m; else hi = m; }
  return a + (b - a) * lo;
};
const sfxLog = [];
// Каждый шум мерим на его участке (K-взвешенно) и ставим на заданное число дБ ниже голоса
let VK = 0;
function place(name, db, a, b, gen) {
  clearTmp(); gen();
  const r = kRms(tmp, a, b), g = r > 0 ? (VK * 10 ** (db / 20)) / r : 0;
  for (const ch of [0, 1]) for (let i = 0; i < N; i++) if (tmp[ch][i]) sfx[ch][i] += tmp[ch][i] * g;
  sfxLog.push(`  ${name}: ${a.toFixed(2)}–${b.toFixed(2)} с, ${db} дБ к голосу`);
}

// ---------- голос ----------
const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', path.join(POEM, 'voice.mp3'), '-f', 's16le', '-ac', '1', '-ar', String(SR), '-'], { maxBuffer: 1 << 28 });
const voice = new Float32Array(N);
{
  const off = Math.round(V0 * SR);
  for (let i = 0; i < raw.length / 2 && off + i < N; i++) voice[off + i] = raw.readInt16LE(i * 2) / 32768;
}
const voiceK = kFilter(voice);
const lineVK = LINES.map(([a, b]) => Math.sqrt(powerOf([voiceK], a, b)));
VK = Math.sqrt(LINES.reduce((s, [a, b], n) => s + lineVK[n] ** 2 * (b - a), 0) / LINES.reduce((s, [a, b]) => s + b - a, 0));

// ---------- шумы ----------
// Строки титра (как в ролике): когда пишется строка и её ширина в кадре
const TITLE_ROWS = [{ a: 0.05, b: 2.3, w: 880, g: 1 }, { a: 2.3, b: 3.7, w: 700, g: 0.8 }, { a: 3.5, b: 4.1, w: 110, g: 0.6 }];
const SW_DUR = (k) => EV[`sw${k}b`] - EV[`sw${k}a`];
if (STYLE === 'sand') place('песок сыплется в титр', -18, 0.4, 4.4, sandPour);
else place('золото пишет титр', -20, TITLE_ROWS[0].a + FRAME, TITLE_ROWS[2].b + 0.4, () => goldWrite(TITLE_ROWS));
for (let k = 0; k < NST; k++) {
  const a = EV[`sw${k}a`], b = EV[`sw${k}b`];
  if (a === undefined) continue;
  if (STYLE === 'sand') place(`смахивание sw${k}`, k === 0 ? -15 : -16.5, a + FRAME, b + FRAME, () => sandSweep(a, b, { low: k === 0 ? 1.2 : 1 }));
  else place(`золотая кромка sw${k}`, k === 0 ? -16 : -17.5, a + FRAME, b + FRAME,
    () => goldSweep(a, b, { sparks: clamp(Math.round(SW_DUR(k) * 3), 2, 4), body: k === 0 ? 1.1 : 1 }));
}
for (let k = 1; k <= NST; k++) {
  const t = EV[`tx${k}`];
  if (STYLE === 'sand') place(`текст смахнут tx${k}`, -27, t + 0.05, t + 0.6, () => textSwish(t));
  else place(`строфа рассыпается пылью tx${k}`, -29, t + 0.05, t + 0.6, () => goldDust(t));
}
{
  const cover = coverTime(EV.sw2a, EV.sw2b, troikaX2(EV.sw2a + 0.4) + 40);
  const panAt = (t) => clamp((troikaX2(t) + 40 - 960) / 960 * 0.75, -0.9, 0.9);
  place('копыта тройки', -32.5, EV.w_troi, cover - 0.3, () => hoofs(EV.w_troi - 0.45, cover, 1.0, [cover - 0.35, cover], panAt));
  const bx = troikaX2(EV.sw2a + 0.4) + 46 * 0.86, bellEnd = Math.min(EV.tx2 + 1.5, coverTime(EV.sw2a, EV.sw2b, bx));
  const rings = [];
  for (let i = 0; EV.w_kol - 0.1 + i * 0.55 < bellEnd; i++) rings.push(EV.w_kol - 0.1 + i * 0.55 + FRAME);
  place('колокольчик 2 строфа', -28.5, rings[0], rings[rings.length - 1] + 0.4,
    () => rings.forEach((t, i) => bellRing(t, (i % 2 ? 0.85 : 1) * sstep((i + 1) / 2), clamp((troikaX2(t) + 40 - 960) / 960 * 0.75, -0.9, 0.9) + (i % 2 ? 0.04 : -0.04))));
  const rings7 = [];
  for (let i = 0; EV.w_kol2 - 0.1 + i * 0.9 < EV.tx7 + 0.3; i++) rings7.push(EV.w_kol2 - 0.1 + i * 0.9 + FRAME);
  place('колокольчик 7 строфа', -32, rings7[0], rings7[rings7.length - 1] + 0.5,
    () => rings7.forEach((t, i) => bellRing(t, (i % 2 ? 0.85 : 1) * (1 - 0.08 * i), -0.08 + (i % 2 ? 0.03 : -0.03))));
}
place('камин', -33, EV.w_zav + 0.8, EV.sw6a, () => fire(EV.w_zav - 0.2, EV.sw6a + 0.7, EV.w_kam - 0.1 + FRAME));
place('ход стрелки', -29, EV.w_kru - 0.2, EV.E22 + 0.3, () => ticks(EV.w_kru - 0.2, EV.E22 + 0.2));
place('полночь', -25, EV.w_pol2, EV.w_pol2 + 2, () => strike(EV.w_pol2));
const EN = EV[`en${NST}`];
if (STYLE === 'sand') place('название процарапано', -22, EV.en7 + 1.0, EV.en7 + 3.2, () => { scratch(EV.en7 + 1.0, 1.3, 820); scratch(EV.en7 + 1.9, 1.3, 900); });
else place('золото пишет название в небе', -23, EN + 1.0 + FRAME, EN + 3.2 + 0.4,
  () => goldWrite([{ a: EN + 1.0, b: EN + 2.3, w: 820, g: 1 }, { a: EN + 1.9, b: EN + 3.2, w: 900, g: 0.75 }], { rate: 17 }));

// ---------- ревербератор: тёмный зал, длинный хвост, как над пустой зимней равниной ----------
function reverb(src, wet, right) {
  const pre = Math.round(0.021 * SR);
  const combs = (right ? [1139, 1211, 1300, 1379, 1445, 1580] : [1116, 1188, 1277, 1356, 1422, 1557]).map((d) => Math.round(d * 1.45));
  const buf = combs.map((d) => new Float32Array(d)), lp = combs.map(() => 0), pos = combs.map(() => 0);
  const ap = (right ? [579, 248] : [556, 225]).map((d) => new Float32Array(d)), apos = [0, 0];
  const out = new Float32Array(N), fb = 0.8, damp = 0.38;
  for (let i = 0; i < N; i++) {
    const x = i >= pre ? src[i - pre] : 0;
    let w = 0;
    for (let k = 0; k < combs.length; k++) {
      const y = buf[k][pos[k]];
      lp[k] = y * (1 - damp) + lp[k] * damp;
      buf[k][pos[k]] = x + lp[k] * fb;
      pos[k] = (pos[k] + 1) % combs[k];
      w += y;
    }
    w /= combs.length;
    for (let k = 0; k < 2; k++) {
      const y = ap[k][apos[k]], v = w + y * 0.5;
      ap[k][apos[k]] = v; apos[k] = (apos[k] + 1) % ap[k].length;
      w = y - v * 0.5;
    }
    out[i] = src[i] + wet * w;
  }
  return out;
}

// ---------- сведение инструментов: баланс по интегральной громкости каждого ----------
const STEMS = [
  ['подкладка', pad, 0], ['баян', reed, 1], ['кларнет', clar, 0.5],
  ['арфа', harpBus, -9.5], ['пиццикато', pulse, -8], ['челеста', cel, -13],
];
const mus = stereo();
for (const [name, bus, rel] of STEMS) {
  const L = gatedLoud(bus.map((ch) => kFilter(ch)));
  const g = 10 ** (rel / 20) / L;
  for (const ch of [0, 1]) for (let i = 0; i < N; i++) mus[ch][i] += bus[ch][i] * g;
  console.log(`  ${name}: ${rel} дБ к подкладке`);
}
const musWet = [reverb(mus[0], 0.32, 0), reverb(mus[1], 0.32, 1)];
const sfxWet = [reverb(sfx[0], 0.12, 0), reverb(sfx[1], 0.12, 1)];
const musK = musWet.map((ch) => kFilter(ch)), sfxK = sfxWet.map((ch) => kFilter(ch));

// ---------- громкость по времени: на каждой строке музыка на TARGET дБ тише именно этой строки ----------
// Во вступлении, в паузах между строфами и в финале — громче. В 7 строфе музыка затихает.
const TARGET = (n) => (n >= LINES.length - 2 ? -21 : n >= LINES.length - 4 ? -20.3 : -19);
const LOUD = 10 ** (10 / 20), MID = 10 ** (5 / 20);
const FT_T = cBars[FT].t0;
function shape(lineG, base) {
  const keys = [[0, 0], [1.6, LOUD * base], [Math.max(1.7, V0 - 0.9), LOUD * base]];
  const push0 = keys.push.bind(keys);
  keys.push = (...ks) => { for (const [t, v] of ks) push0([Math.max(t, keys[keys.length - 1][0] + 1e-3), v]); return keys.length; };
  LINES.forEach(([a, b], n) => {
    if (n > 0 && STANZA_ENDS.has(LINES[n - 1][1]) && a - LINES[n - 1][1] > 0.6) {
      const e = LINES[n - 1][1];
      keys.push([e + 0.08, lineG[n - 1]], [e + 0.4, MID * base], [Math.max(e + 0.45, a - 0.3), MID * base]);
    }
    keys.push([n ? a - 0.02 : a - 0.05, lineG[n]], [b, lineG[n]]);
  });
  const fadeA = Math.max(LAST_E + 1.4, FT_T + 0.5);
  keys.push([LAST_E + 0.1, lineG[LINES.length - 1]], [LAST_E + 1.2, LOUD * base], [fadeA, LOUD * base],
    [fadeA + (TOTAL - fadeA) * 0.55, LOUD * base * 0.3], [TOTAL - 0.03, 0], [TOTAL, 0]);
  return keys;
}
const gainArr = new Float32Array(N);
const fillGain = (keys) => { let k = 1; for (let i = 0; i < N; i++) { const t = i / SR; while (k < keys.length - 1 && t > keys[k][0]) k++; const [a, va] = keys[k - 1], [b, vb] = keys[k]; gainArr[i] = t <= a ? va : t >= b ? vb : va + (vb - va) * sstep((t - a) / Math.max(1e-6, b - a)); } };
const lineMix = (n) => {
  const [a, b] = LINES[n], i0 = Math.floor(a * SR), i1 = Math.floor(b * SR);
  let s = 0;
  for (let ch = 0; ch < 2; ch++) for (let i = i0; i < i1; i++) { const x = gainArr[i] * musK[ch][i] + sfxK[ch][i]; s += x * x; }
  return Math.sqrt(s / (2 * (i1 - i0)));
};
const musLines = Math.sqrt(LINES.reduce((s, [a, b]) => s + powerOf(musK, a, b) * (b - a), 0) / LINES.reduce((s, [a, b]) => s + b - a, 0));
const BASE = VK * 10 ** (-19 / 20) / musLines;
let lineG = LINES.map(() => BASE);
for (let pass = 0; pass < 8; pass++) {
  fillGain(shape(lineG, BASE));
  lineG = lineG.map((g, n) => clamp(g * (lineVK[n] * 10 ** (TARGET(n) / 20) / lineMix(n)) ** 0.9, BASE * 0.4, BASE * 2.2));
}
fillGain(shape(lineG, BASE));

const out = stereo();
for (const ch of [0, 1]) for (let i = 0; i < N; i++) {
  const tail = Math.min(1, (TOTAL - i / SR) / 0.05);
  out[ch][i] = (musWet[ch][i] * gainArr[i] + sfxWet[ch][i]) * tail;
}
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(out[0][i]), Math.abs(out[1][i]));
const LIM = 10 ** (-1.2 / 20), limit = peak > LIM ? LIM / peak : 1;
if (limit < 1) console.log(`ВНИМАНИЕ: пик выше −1 dBFS, всё сжато в ${limit.toFixed(3)} раза — музыка под голосом стала тише цели`);

// ---------- отчёт ----------
console.log(`темп: ${TEMPO.nA} тактов минора по ${(60 / TEMPO.bA).toFixed(1)} уд/мин, ${TEMPO.nB} тактов мажора по ${(60 / TEMPO.bB).toFixed(1)}, возврат с ${A_MIN.toFixed(2)} с; тоника финала ${FT_T.toFixed(2)} с`);
console.log(BARS.map((x) => `${x.t0.toFixed(1)}:${x.ch}`).join(' '));
console.log(`шумы (${STYLE}):\n` + sfxLog.join('\n'));
const outK = out.map((ch) => kFilter(ch));
const lineDiff = LINES.map(([a, b], n) => dB(Math.sqrt(powerOf(outK, a, b)) * limit) - dB(lineVK[n]));
lineDiff.forEach((d, n) => console.log(`  строка ${String(n + 1).padStart(2)}: музыка ${d.toFixed(1)} дБ к голосу`));
const allOut = Math.sqrt(LINES.reduce((s, [a, b]) => s + powerOf(outK, a, b) * (b - a), 0) / LINES.reduce((s, [a, b]) => s + b - a, 0)) * limit;
console.log(`под голосом всего: ${(dB(allOut) - dB(VK)).toFixed(1)} дБ (K-взвешенно, как LUFS без стробирования)`);
const seg = (a, b) => (dB(Math.sqrt(powerOf(outK, a, b)) * limit) - dB(VK)).toFixed(1);
console.log(`вступление 1,6–${(V0 - 0.9).toFixed(1)} с: ${seg(1.6, V0 - 0.9)} дБ к голосу; финал ${(LAST_E + 1.2).toFixed(1)}–${(FT_T + 0.5).toFixed(1)} с: ${seg(LAST_E + 1.2, FT_T + 0.5)} дБ`);

const OUT = ARGS.out ? path.resolve(ARGS.out) : path.join(HERE, 'music.wav');
const data = Buffer.alloc(44 + N * 4);
data.write('RIFF', 0); data.writeUInt32LE(36 + N * 4, 4); data.write('WAVEfmt ', 8);
data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(2, 22);
data.writeUInt32LE(SR, 24); data.writeUInt32LE(SR * 4, 28); data.writeUInt16LE(4, 32); data.writeUInt16LE(16, 34);
data.write('data', 36); data.writeUInt32LE(N * 4, 40);
// 16 бит с треугольным дизерингом: тихие хвосты затухания не рассыпаются в шум квантования
for (let i = 0; i < N; i++) for (let ch = 0; ch < 2; ch++) {
  const v = clamp(out[ch][i] * limit, -1, 1) * 32767 + (rnd() - rnd());
  data.writeInt16LE(clamp(Math.round(v), -32768, 32767), 44 + i * 4 + ch * 2);
}
fs.writeFileSync(OUT, data);
console.log(`${path.basename(OUT)}: ${(N / SR).toFixed(3)} с, пик ${dB(peak * limit).toFixed(1)} dBFS`);
