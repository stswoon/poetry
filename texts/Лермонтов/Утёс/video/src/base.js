// Утёс — аниме-чиби. Всё рисуется кодом на одном canvas; кадр — функция времени.
const W = 1920, H = 1080, TOTAL = CFG.total, E = CFG.ev, TAU = Math.PI * 2;

function mulberry32(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, u) => a + (b - a) * u;
const sstep = (u) => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
const prog = (t, a, b) => clamp((t - a) / Math.max(1e-6, b - a), 0, 1);
const win = (t, a, b, fi = 0.25, fo = 0.25) => Math.min(sstep(prog(t, a, a + fi)), 1 - sstep(prog(t, b - fo, b)));
const easeOut = (u) => 1 - Math.pow(1 - clamp(u, 0, 1), 3);
const easeIn = (u) => Math.pow(clamp(u, 0, 1), 3);
const easeInOut = (u) => { u = clamp(u, 0, 1); return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
// пружины Framer Motion как функции времени: 0 → 1 с перелётом
function makeSpring(opts) {
  const g = Motion.spring({ ...opts, keyframes: [0, 1] });
  const pts = []; for (let i = 0; i <= 400; i++) pts.push(g.next(i * 10).value);
  return (s) => { if (s <= 0) return 0; const f = s * 100; if (f >= 400) return 1; const i = Math.floor(f); return lerp(pts[i], pts[i + 1], f - i); };
}
const springPop = makeSpring({ stiffness: 260, damping: 13, mass: 1 });
const springSoft = makeSpring({ stiffness: 120, damping: 18, mass: 1 });
const springSnap = makeSpring({ stiffness: 420, damping: 22, mass: 1 });
const springBounce = makeSpring({ stiffness: 320, damping: 9, mass: 1 });
// пружина по реальному времени от события a (сек.)
const spr = (fn, t, a) => fn(Math.max(0, t - a));
const wob = (t, f, s = 0) => Math.sin(t * f + s) * 0.6 + Math.sin(t * f * 2.31 + s * 1.7) * 0.4;
const bump = (t, a, d = 0.5) => { const u = prog(t, a, a + d); return u <= 0 || u >= 1 ? 0 : Math.sin(u * Math.PI) * (1 - u); };

// ---------- цвет и время суток: d = 0 ночь, 0.5 рассвет, 1 день, 2 закат, 3 сумерки ----------
const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const rgbStr = (c, a = 1) => a >= 1 ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a.toFixed(3)})`;
const mixRgb = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
const D_KEYS = [0, 0.5, 1, 2, 3];
const PAL_HEX = {
  skyTop:  ["#0b1238", "#3a3f86", "#2f78e6", "#3b3c8c", "#121640"],
  skyMid:  ["#1d2866", "#c96f9b", "#62b0f6", "#d47596", "#3f3474"],
  skyLow:  ["#38478e", "#ffc08a", "#cdeeff", "#ffbf74", "#b45e72"],
  rockL:   ["#6a74aa", "#c99a96", "#c9b9a6", "#dc9a7c", "#6e5b84"],
  rockD:   ["#2b3264", "#6c4f6e", "#857466", "#8c5260", "#33284f"],
  ground:  ["#3c4680", "#d7a58c", "#efd29a", "#e7a570", "#4f3b62"],
  groundD: ["#262d5e", "#a8746e", "#cfab70", "#b4704e", "#33264a"],
  dune:    ["#323c74", "#c792a0", "#e2c49a", "#d68f78", "#46385f"],
  moss:    ["#5b7a8a", "#8aa070", "#86b862", "#b0a25a", "#55607a"],
  mossD:   ["#2e4458", "#56704e", "#4f8044", "#6f6a3c", "#2f3a4e"],
  ink:     ["#141a3e", "#3a2440", "#2e2a3a", "#3a1f2c", "#171230"],
  cloud:   ["#56609a", "#ffd9e4", "#ffffff", "#ffd7c2", "#7a6a9c"],
  cloudD:  ["#363f78", "#d9a2c0", "#cfe2f7", "#e7a4a4", "#4f4478"],
};
const PAL = {}; for (const k in PAL_HEX) PAL[k] = PAL_HEX[k].map(hexRgb);
function palRgb(name, d) {
  const P = PAL[name];
  if (d <= D_KEYS[0]) return P[0];
  for (let i = 0; i < D_KEYS.length - 1; i++) if (d <= D_KEYS[i + 1]) return mixRgb(P[i], P[i + 1], (d - D_KEYS[i]) / (D_KEYS[i + 1] - D_KEYS[i]));
  return P[P.length - 1];
}
const pal = (name, d, a = 1) => rgbStr(palRgb(name, d), a);

const F_SANS = '"SansB"';
function font(c, px, fam = F_SANS, style = "700") { c.font = `${style} ${px}px ${fam}`.trim(); }

// заливка текущего пути + аниме-контур
function ink(c, fill, lw = 4, stroke = "#1a1f4d") { c.fillStyle = fill; c.fill(); if (lw > 0) { c.lineWidth = lw; c.strokeStyle = stroke; c.lineJoin = "round"; c.lineCap = "round"; c.stroke(); } }
function circle(c, x, y, r) { c.beginPath(); c.arc(x, y, Math.max(0.1, r), 0, TAU); }
function ell(c, x, y, rx, ry, rot = 0) { c.beginPath(); c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU); }
function rrect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
// путь по точкам с плавными углами
function smooth(c, pts, close = true) {
  c.beginPath();
  const n = pts.length;
  if (!close) { c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < n - 1; i++) { const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; c.quadraticCurveTo(pts[i][0], pts[i][1], mx, my); } c.lineTo(pts[n - 1][0], pts[n - 1][1]); return; }
  const m0 = [(pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2];
  c.moveTo(m0[0], m0[1]);
  for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; c.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }
  c.closePath();
}
// аниме-блик: четырёхлучевая звёздочка
function sparkle(c, x, y, r, a = 1, col = "#fff") {
  if (a <= 0 || r <= 0) return;
  c.save(); c.globalAlpha *= a; c.fillStyle = col; c.beginPath();
  c.moveTo(x, y - r); c.quadraticCurveTo(x, y, x + r, y); c.quadraticCurveTo(x, y, x, y + r); c.quadraticCurveTo(x, y, x - r, y); c.quadraticCurveTo(x, y, x, y - r);
  c.fill(); c.restore();
}
// мягкое свечение радиальным градиентом (без фильтров — быстро в рендере)
function glow(c, x, y, r, col, a = 1) {
  if (a <= 0 || r <= 0) return;
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, col); g.addColorStop(1, "rgba(255,255,255,0)");
  c.save(); c.globalAlpha *= a; c.fillStyle = g; c.fillRect(x - r, y - r, 2 * r, 2 * r); c.restore();
}
// линии скорости от центра наружу
function speedLines(c, cx, cy, a, seed = 1, t = 0, col = "#fff", n = 46) {
  if (a <= 0) return;
  const r = mulberry32(seed + Math.floor(t * 12));
  c.save(); c.globalAlpha *= a; c.fillStyle = col;
  for (let i = 0; i < n; i++) {
    const ang = r() * TAU, r0 = 360 + r() * 260, r1 = 1400, w = 3 + r() * 9;
    const ca = Math.cos(ang), sa = Math.sin(ang), px = -sa, py = ca;
    c.beginPath(); c.moveTo(cx + ca * r0, cy + sa * r0); c.lineTo(cx + ca * r1 + px * w, cy + sa * r1 + py * w); c.lineTo(cx + ca * r1 - px * w, cy + sa * r1 - py * w); c.closePath(); c.fill();
  }
  c.restore();
}
// вертикальные линии скорости: dir = -1 — летим вверх (линии бегут вниз), 1 — падаем
function rushLines(c, a, t, dir = 1, col = "#fff") {
  if (a <= 0) return;
  const r = mulberry32(77);
  c.save(); c.lineCap = "round"; c.strokeStyle = col;
  for (let i = 0; i < 56; i++) {
    const x = r() * W, len = 140 + r() * 380, sp = 2600 + r() * 1800, w = 2 + r() * 6, al = 0.2 + 0.45 * r();
    const y = ((r() * (H + len) - dir * t * sp) % (H + len) + (H + len)) % (H + len) - len;
    c.globalAlpha = a * al; c.lineWidth = w; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + len); c.stroke();
  }
  c.restore();
}
