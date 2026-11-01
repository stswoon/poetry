// Расписание: что и когда пишется на доске. Всё — функция времени t.
const ctx = document.getElementById("scene").getContext("2d");
const ov = document.getElementById("top").getContext("2d");

// ---------- Заставка ----------
const CORNERS = [
  { x: 168, y: 158, r: 76, p: P_RED, t: -0.9 }, { x: 1752, y: 158, r: 76, p: P_BLUE, t: -0.7 },
  { x: 168, y: 924, r: 66, p: P_BLUE, t: -0.5 }, { x: 1752, y: 924, r: 66, p: P_RED, t: -0.3 },
];
const CORNER_LEAVES = [];
for (const [x, y, a0] of [[168, 158, 0.3], [1752, 158, 2.2], [168, 924, -0.6], [1752, 924, 3.7]]) for (const d of [-0.62, 0, 0.62]) CORNER_LEAVES.push({ x: x + Math.cos(a0 + d) * 60, y: y + Math.sin(a0 + d) * 60, a: a0 + d, L: d === 0 ? 86 : 70 });
const INTRO = [
  { k: "ro", x: 268, y: 400, r: 96, p: P_PINK, t: 0.7 }, { k: "ro", x: 1652, y: 400, r: 96, p: P_OR, t: 0.9 },
  { k: "ku", x: 345, y: 628, r: 58, p: P_BLUE, t: 1.15 }, { k: "ku", x: 1575, y: 628, r: 58, p: P_RED, t: 1.3 },
];

// ---------- Земля и трава ----------
const TUFTS = [];
{ const r = mulberry32(1893); for (let x = 96; x < 1830; x += 27 + r() * 12) { const f = 0.8 + r() * 0.5; TUFTS.push({ x, f, ph: r() * 6, t: EV.L1 + (x - 96) / (1830 - 96) * (EV.E1 - EV.L1) * 0.9, c: r() > 0.72 ? C.greenL : C.green }); } }
const TALL = [
  { x: 548, h: 150, a: -1.66, b: 0.05 }, { x: 628, h: 215, a: -1.56, b: -0.05 }, { x: 716, h: 170, a: -1.62, b: 0.06 }, { x: 800, h: 250, a: -1.54, b: 0.05 },
  { x: 888, h: 180, a: -1.5, b: -0.05 }, { x: 968, h: 235, a: -1.6, b: 0.05 }, { x: 118, h: 110, a: -1.4, b: 0.04 }, { x: 1060, h: 110, a: -1.5, b: 0.05 },
  { x: 1240, h: 90, a: -1.62, b: 0.05 }, { x: 1420, h: 100, a: -1.5, b: -0.05 }, { x: 1610, h: 92, a: -1.58, b: 0.05 },
].map((s, i) => ({ ...s, y: GROUND(s.x) + 4, t: EV.L1 + 0.1 + (s.x / 1920) * 1.2, dur: 0.75, leaves: s.h > 130 ? 3 : 2, ll: s.h > 130 ? 60 : 44 }));

function ground(c, t) {
  if (t < EV.L1 - 0.1) return;
  const u = sstep(prog(t, EV.L1 - 0.1, EV.E1 + 0.1));
  c.save(); framePath(c, 26); c.clip();
  c.beginPath(); c.rect(70, 0, (1860 - 70) * u + 2, H); c.clip();
  c.beginPath(); c.moveTo(70, H); for (let x = 70; x <= 1860; x += 16) c.lineTo(x, GROUND(x)); c.lineTo(1860, H); c.closePath(); c.fillStyle = C.green; c.fill();
  c.beginPath(); c.moveTo(70, H); for (let x = 70; x <= 1860; x += 16) c.lineTo(x, GROUND(x) + 40); c.lineTo(1860, H); c.closePath(); c.fillStyle = C.greenD; c.fill();
  for (let x = 90; x < 1840; x += 62) { drop(c, x, GROUND(x) + 18, 44, 7, -0.08, C.greenL, 1); arcS(c, x + 30, GROUND(x) + 72, 16, 3.5, 5.9, 3, C.greenL); }
  c.restore();
}
function tufts(c, t) {
  c.save(); framePath(c, 26); c.clip();
  for (const q of TUFTS) { const a = t - q.t; if (a < 0) continue; const k = springSoft(a * 1.5), y = GROUND(q.x) + 5, sw = 0.05 * Math.sin(t * 1.5 + q.ph);
    for (const d of [-0.42, 0, 0.42]) drop(c, q.x + d * 12, y, (d === 0 ? 44 : 32) * q.f, 13 * q.f, -1.57 + d + sw, q.c, k); }
  c.restore();
}

// ---------- Цветы: распускаются на «весна» ----------
const SPRING = [
  { k: "st", x: 930, y: 660, a: -1.72, h: 400, b: 0.06, t: EV.ves - 0.1, dur: 0.6, leaves: 3, ll: 50 },
  { k: "st", x: 720, y: 650, a: -1.42, h: 210, b: -0.08, t: EV.ves, dur: 0.5, leaves: 2, ll: 44 },
  { k: "ro", x: 924, y: 250, r: 72, p: P_RED, t: EV.ves + 0.25 }, { k: "ku", x: 768, y: 438, r: 58, p: P_PINK, t: EV.ves + 0.1 },
  { k: "ro", x: 972, y: 440, r: 48, p: P_BLUE, t: EV.ves + 0.4 }, { k: "ku", x: 806, y: 150, r: 40, p: P_OR, t: EV.ves + 0.5 },
  { k: "ro", x: 1000, y: 132, r: 38, p: P_PINK, t: EV.ves + 0.6 }, { k: "ku", x: 1172, y: 158, r: 46, p: P_RED, t: EV.ves + 0.45 },
  { k: "ro", x: 1366, y: 150, r: 58, p: P_PINK, t: EV.ves + 0.3 }, { k: "ku", x: 1558, y: 158, r: 46, p: P_BLUE, t: EV.ves + 0.55 },
];
const SPRING_LEAVES = [];
for (const f of SPRING) if (f.k !== "st") for (let i = 0; i < 4; i++) { const b = 0.7 + i * 1.57 + f.x * 0.01; SPRING_LEAVES.push({ x: f.x + Math.cos(b) * f.r * 0.8, y: f.y + Math.sin(b) * f.r * 0.8, a: b, L: f.r * 1.05, t: f.t + 0.1 }); }
const FINAL = [
  { k: "ku", x: 540, y: 905, r: 34, p: P_RED }, { k: "ro", x: 700, y: 935, r: 36, p: P_BLUE }, { k: "ku", x: 868, y: 905, r: 34, p: P_PINK }, { k: "ro", x: 1040, y: 942, r: 34, p: P_RED },
  { k: "ku", x: 1205, y: 916, r: 38, p: P_OR }, { k: "ro", x: 1390, y: 930, r: 38, p: P_PINK }, { k: "ku", x: 1570, y: 915, r: 36, p: P_BLUE }, { k: "ku", x: 380, y: 940, r: 30, p: P_OR },
].map((f, i) => ({ ...f, t: EV.sob - 0.15 + i * 0.09 }));
const BIG = { x: MED.x, y: MED.y, r: 118, p: P_RED, t: EV.wipe3 + 0.3 };

// ---------- Ласточка: путь и состояния ----------
const PATH = [
  [EV.L3 - 0.25, 2050, 40], [EV.las + 0.65, 1500, 96], [EV.las + 1.15, 1040, 140], [EV.L4 - 0.1, 770, 280], [EV.sen, 560, 500], [EV.sen + 0.5, 470, 640],
  [EV.let + 0.05, 470, 560], [EV.L5 - 0.05, 640, 380], [EV.L5 + 0.6, 830, 200], [EV.kra - 0.1, 980, 340], [EV.kra + 0.5, 850, 510], [EV.L6, 720, 500], [EV.ves, 590, 410], [EV.E6 - 0.2, 560, 520], [EV.L7 - 0.12, PERCH.x, PERCH.y],
];
function catmull(p, t) {
  if (t <= p[0][0]) return [p[0][1], p[0][2]];
  const n = p.length; if (t >= p[n - 1][0]) return [p[n - 1][1], p[n - 1][2]];
  let i = 0; while (i < n - 2 && t > p[i + 1][0]) i++;
  const a = p[Math.max(0, i - 1)], b = p[i], d = p[i + 1], e = p[Math.min(n - 1, i + 2)], u = (t - b[0]) / (d[0] - b[0]), u2 = u * u, u3 = u2 * u;
  const f = (q) => 0.5 * (2 * b[q] + (d[q] - a[q]) * u + (2 * a[q] - 5 * b[q] + 4 * d[q] - e[q]) * u2 + (3 * b[q] - a[q] - 3 * d[q] + e[q]) * u3);
  return [f(1), f(2)];
}
const PECK = { x: 636, y: 842 };
const HOP_DOWN = [EV.zer + 0.05, EV.zer + 0.5], HOP_UP = [EV.L10 + 0.1, EV.L10 + 0.55];
function singing(t) {
  const on = [[EV.pro, EV.E7 + 0.1], [EV.pri, EV.E8 + 0.2], [EV.pes, EV.E10 + 0.2], [EV.pri2, EV.E12 + 0.7], [EV.wipe3e + 0.8, EV.total - 0.4]];
  for (const [a, b] of on) if (t > a && t < b) return true; return false;
}
function birdState(t) {
  if (t < EV.L7 - 0.12) {
    const p = catmull(PATH, t), q = catmull(PATH, t + 0.05), dx = q[0] - p[0], dy = q[1] - p[1];
    const dir = dx >= 0 ? 1 : -1, tilt = clamp(Math.atan2(dy, Math.abs(dx) + 1), -0.6, 0.6);
    const near = sstep(prog(t, EV.L3 - 0.2, EV.L4)) * 0.2;
    const land = sstep(prog(t, EV.L7 - 0.45, EV.L7 - 0.12));
    return { x: p[0], y: p[1], s: 0.74 + near - land * 0.02, dir, rot: tilt * (1 - land), flap: Math.sin(t * 24) * (1 - land * 0.4), perched: false, beak: 0 };
  }
  const b = singing(t) ? 0.3 + 0.7 * Math.abs(Math.sin(t * 8.5)) : 0;
  if (t < HOP_DOWN[0]) return { x: PERCH.x, y: PERCH.y + 2, s: 0.92, dir: -1, rot: 0.02 * Math.sin(t * 3), flap: 0, perched: true, beak: b };
  if (t < HOP_DOWN[1]) { const u = prog(t, ...HOP_DOWN); return { x: lerp(PERCH.x, PECK.x, u), y: lerp(PERCH.y, PECK.y, u) - 46 * Math.sin(u * Math.PI), s: 0.92, dir: -1, rot: 0.2, flap: Math.sin(t * 28), perched: false, beak: 0 }; }
  if (t < HOP_UP[0]) { const pk = Math.max(0, Math.sin((t - HOP_DOWN[1]) * 13)); return { x: PECK.x, y: PECK.y + pk * 5, s: 0.92, dir: -1, rot: 0.08 + pk * 0.42, flap: 0, perched: true, beak: 0 }; }
  if (t < HOP_UP[1]) { const u = prog(t, ...HOP_UP); return { x: lerp(PECK.x, PERCH.x, u), y: lerp(PECK.y, PERCH.y, u) - 46 * Math.sin(u * Math.PI), s: 0.92, dir: -1, rot: -0.2, flap: Math.sin(t * 28), perched: false, beak: 0 }; }
  return { x: PERCH.x, y: PERCH.y + 2, s: 0.92, dir: -1, rot: 0.02 * Math.sin(t * 3), flap: 0, perched: true, beak: b };
}
// Белые капли за ласточкой: «с весною»
const SPARK = []; { const r = mulberry32(77); for (let i = 0; i < 26; i++) { const t0 = EV.L3 + 0.05 + i * (EV.sen - EV.L3 - 0.1) / 26; const p = catmull(PATH, t0); SPARK.push({ t: t0, x: p[0] + r() * 24 - 12, y: p[1] + 18 + r() * 24, c: r() > 0.5 ? C.white : (r() > 0.5 ? C.pink : C.gold), s: 7 + r() * 8 }); } }

// ---------- Девочка ----------
const WALK = [EV.L9 - 0.05, EV.L9 + 0.72], CH0 = HS.x + 6, CH1 = 500;
function childState(t) {
  const out = sstep(prog(t, EV.L8 - 0.05, EV.L8 + 0.38));
  const x = lerp(CH0, CH1, sstep(prog(t, ...WALK)));
  const walking = t > WALK[0] && t < WALK[1];
  const step = walking ? Math.sin((t - WALK[0]) * 15) : 0;
  // рука не поднимается выше плеча-лица: взмах вперёд, а не вверх
  const wave = (d) => 0.56 + 0.26 * Math.sin(d * 9), REST = -1.25, w0 = wave(EV.E8 + 0.5 - EV.pri);
  let arm = REST;
  if (t > EV.pri - 0.08 && t < EV.E8 + 0.5) arm = lerp(REST, wave(t - EV.pri), sstep(prog(t, EV.pri - 0.08, EV.pri + 0.12)));
  if (t >= EV.E8 + 0.5 && t <= EV.dam) arm = lerp(w0, -0.06, sstep(prog(t, EV.E8 + 0.5, EV.dam)));
  const hand = t > EV.L9 && t < EV.zer + 0.2 ? 1 : 0;
  if (t > EV.dam && t < EV.E9 + 0.3) arm = -0.06 + (t > EV.zer - 0.06 ? 0.34 * Math.sin(prog(t, EV.zer - 0.06, EV.zer + 0.22) * Math.PI) : 0);
  if (t >= EV.E9 + 0.3 && t < EV.pes) arm = lerp(-0.06, REST, sstep(prog(t, EV.E9 + 0.3, EV.E9 + 0.7)));
  if (t >= EV.pes) arm = REST + 0.05 * Math.sin(t * 2);
  if (t > EV.wipe3e - 0.2) arm = lerp(REST, 0.56 + 0.24 * Math.sin((t - EV.wipe3e) * 6), sstep(prog(t, EV.wipe3e - 0.2, EV.wipe3e + 0.25)));
  return { x, y: HS.base + 7 + 8 * sstep(prog(t, ...WALK)), s: lerp(0.72, 0.98, out) * (t < EV.L8 - 0.05 ? 0 : 1), arm, step, hand, t };
}
const GRAINS = []; { const r = mulberry32(44); for (let i = 0; i < 18; i++) GRAINS.push({ d: r() * 0.25, tx: 580 + r() * 92, ty: 860 + r() * 22, v: r() * 90 + 40, s: 4.5 + r() * 2.2, g: EV.zer + 0.7 + i * 0.07 }); }
function grains(c, t) {
  if (t < EV.zer) return;
  const hx = CH1 + 86, hy = HS.base - 128;
  for (const g of GRAINS) { const a = t - EV.zer - g.d; if (a < 0 || t > g.g + 0.04 + 0.5) continue; const u = clamp(a / 0.5, 0, 1), x = lerp(hx, g.tx, u), y = lerp(hy, g.ty, u) - g.v * Math.sin(u * Math.PI);
    if (t > g.g) continue; dab(c, x, y, g.s, C.gold, g.tx); c.lineWidth = 1.4; c.strokeStyle = C.orangeD; c.stroke(); }
}

// ---------- Ноты ----------
const NOTES = [];
{ const r = mulberry32(90); const add = (t0, t1, n, big) => { for (let i = 0; i < n; i++) NOTES.push({ t: lerp(t0, t1, i / n), dx: 120 + r() * 170, dy: -(150 + r() * 200), ph: r() * 6, s: (big ? 1.2 : 0.8) + r() * 0.3, dbl: r() > 0.5, c: [C.white, C.red, C.blue][i % 3] }); };
  add(EV.pro, EV.E7, 5); add(EV.pri, EV.E8, 3); add(EV.pes, EV.E10 + 0.2, 7, true); add(EV.pri2, EV.E12, 4); add(EV.wipe3e + 0.8, TOTAL - 1.4, 8); }

// ---------- Золотая лента из клейма к клюву ----------
function ribbon(c, t) {
  const a0 = EV.pri2 - 0.05, a1 = EV.E12 + 0.8; if (t < a0 || t > a1 + 0.5) return;
  const fade = 1 - sstep(prog(t, a1, a1 + 0.5));
  const P0 = [MED.x - 60, MED.y + 150], P3 = [PERCH.x - 66, PERCH.y - 22], n = 40, u = sstep(prog(t, a0, a0 + 0.9));
  c.save(); c.globalAlpha = fade; c.lineCap = "round";
  const pt = (s) => [lerp(P0[0], P3[0], s) + 50 * Math.sin(s * 8 + t * 2.5) * (1 - s * 0.7), lerp(P0[1], P3[1], s) + 18 * Math.cos(s * 6 + t * 2)];
  for (const [col, w] of [[C.orangeD, 16], [C.gold, 10]]) { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); for (let i = 0; i <= n * u; i++) { const p = pt(i / n); if (i === 0) c.moveTo(p[0], p[1]); else c.lineTo(p[0], p[1]); } c.stroke(); }
  for (let i = 0; i < 4; i++) { const s = ((t - a0) * 0.55 + i * 0.25) % 1; if (s > u) continue; const p = pt(s); noteGlyph(c, p[0], p[1] - 10, 0.7, i % 2 ? C.white : C.red, 0.1 * Math.sin(t * 5 + i), i % 2 === 0); }
  c.restore();
}

// ---------- Закрашивание ----------
const WIPES = [
  { a: EV.wipe0, b: EV.wipe0e, r: [150, 216, 1770, 868], src: woodC },
  { a: EV.wipe1, b: EV.wipe1e, r: textPlate, src: plateC },
  { a: EV.wipe2, b: EV.wipe2e, r: textPlate, src: plateC },
  { a: EV.wipe3, b: EV.wipe3e, r: textPlate, src: plateC },
];
function wipeLayer(c, t) {
  for (const w of WIPES) {
    if (t < w.a - 0.2 || t >= w.b + 0.25) continue;
    const [x0, y0, x1, y1] = w.r, u = prog(t, w.a, w.b), X = lerp(x0 - 30, x1 + 30, sstep(u));
    if (t < w.b) {
      c.save(); c.beginPath(); c.moveTo(x0, y0); for (let y = y0; y <= y1; y += 14) c.lineTo(Math.min(x1, X + 13 * Math.sin(y * 0.09) + 9 * Math.sin(y * 0.031 + t * 5)), y); c.lineTo(x0, y1); c.closePath(); c.clip();
      c.drawImage(w.src, 0, 0);
      if (w.src === woodC) { for (const l of CORNER_LEAVES) leaf(c, l.x, l.y, l.L, l.L * 0.45, l.a, t, -0.4, C.green); for (const f of CORNERS) rosan(c, f, t); }
      c.restore();
    }
    const inn = sstep(prog(t, w.a - 0.2, w.a)), out = sstep(prog(t, w.b, w.b + 0.25)), by = lerp(y0, y1, 0.5) + (y1 - y0) * 0.5 * Math.sin((t - w.a) * 17) * 0.86;
    brush(c, lerp(x0 - 90, X, inn) + out * 150, by - (1 - inn) * 280 - out * 330, 0.52 + 0.12 * Math.sin(t * 17));
  }
}

// ---------- Текст: слова пружинят по времени ----------
const WORDS = [...document.querySelectorAll(".w")].map((el) => ({ el, at: parseFloat(el.dataset.at), key: !!el.className.match(/ (gr|or|bl|re|pi|te)/), last: -1 }));
function textAt(t) {
  for (const w of WORDS) {
    const a = t - w.at, k = a <= 0 ? 0 : springPop(a * 1.35), op = clamp(a / 0.08, 0, 1);
    const key = Math.round(k * 400) + (op * 100 | 0) * 1000; if (key === w.last) continue; w.last = key;
    w.el.style.opacity = op; w.el.style.transform = `translateY(${(1 - k) * 16}px) scale(${0.82 + 0.18 * k})`;
  }
}

// ---------- Кадр ----------
function renderAt(t) {
  ctx.reset(); ov.reset();
  ctx.clearRect(0, 0, W, H); ctx.drawImage(woodC, 0, 0);
  const inIntro = t < EV.wipe0e;
  ground(ctx, t);
  for (const l of CORNER_LEAVES) leaf(ctx, l.x, l.y, l.L, l.L * 0.45, l.a, t, -0.4, C.green);
  for (const f of CORNERS) rosan(ctx, f, t);
  if (inIntro) for (const f of INTRO) (f.k === "ro" ? rosan : kupavka)(ctx, f, t);
  drawFrame(ctx, t);
  sun(ctx, t);
  for (const q of SPRING_LEAVES) if (t > q.t) leaf(ctx, q.x, q.y, q.L, q.L * 0.42, q.a, t, q.t);
  for (const f of SPRING) { if (f.k === "st") sprig(ctx, f, t); else if (f.k === "ro") rosan(ctx, f, t); else kupavka(ctx, f, t); }
  for (const s of TALL) sprig(ctx, s, t);
  tufts(ctx, t);
  house(ctx, t);
  // капли за ласточкой
  for (const s of SPARK) { const a = t - s.t; if (a < 0 || a > 1.3) continue; ctx.save(); ctx.globalAlpha = 1 - sstep(prog(a, 0.7, 1.3)); drop(ctx, s.x, s.y + a * 90 + a * a * 40, s.s * 2, s.s, 1.57 + a, s.c, 1); ctx.restore(); }
  fence(ctx, t);
  for (const f of FINAL) (f.k === "ro" ? rosan : kupavka)(ctx, f, t);
  // плашка
  const pk = t < EV.wipe0e ? 0 : springLand((t - EV.wipe0e) * 1.5);
  if (pk > 0) { ctx.save(); const cx = PL.x + PL.w / 2, cy = PL.y + PL.h / 2; ctx.translate(cx, cy); ctx.scale(lerp(0.86, 1, pk), pk); ctx.translate(-cx, -cy); ctx.drawImage(plateC, 0, 0); ctx.restore(); }
  medallion(ctx, t);
  rosan(ctx, BIG, t);
  grains(ctx, t);
  const ch = childState(t);
  if (ch.s > 0) child(ctx, ch.x, ch.y, ch.s, ch);
  ribbon(ctx, t);
  const st = birdState(t);
  if (t > EV.L3 - 0.3) swallow(ctx, st.x, st.y, st.s, st.dir, st.rot, st);
  for (const n of NOTES) { const a = t - n.t; if (a < 0 || a > 1.9) continue; const u = a / 1.9, k = springPop(a); const x = PERCH.x - 64 + n.dx * u + 15 * Math.sin(u * 7 + n.ph), y = PERCH.y - 28 + n.dy * u; ctx.save(); ctx.globalAlpha = 1 - sstep(prog(u, 0.72, 1)); noteGlyph(ctx, x, y, n.s * k, n.c, 0.16 * Math.sin(u * 8 + n.ph), n.dbl); ctx.restore(); }
  // верхний холст нужен только пока идёт кисть
  const brushOn = WIPES.some((w) => t >= w.a - 0.2 && t < w.b + 0.25);
  ov.canvas.style.display = brushOn ? "block" : "none";
  ov.clearRect(0, 0, W, H);
  if (brushOn) wipeLayer(ov, t);
  textAt(t);
}

const seek = (t) => renderAt(t);
window.addEventListener("hf-seek", (e) => seek(e.detail.time));
seek(0);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => seek(0));

const tl = gsap.timeline({ paused: true });
tl.set({}, {}, TOTAL);
window.__timelines = window.__timelines || {};
window.__timelines["main"] = tl;
