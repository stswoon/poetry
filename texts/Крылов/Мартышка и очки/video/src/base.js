// Стрим блогера-обзорщика «Мартышкин обзор». Всё рисуется кодом на одном canvas.
const W = 1920, H = 1080, TOTAL = CFG.total, EV = CFG.ev, TAU = Math.PI * 2;

function mulberry32(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, u) => a + (b - a) * u;
const sstep = (u) => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
const prog = (t, a, b) => clamp((t - a) / Math.max(1e-6, b - a), 0, 1);
const win = (t, a, b, fi = 0.25, fo = 0.25) => Math.min(sstep(prog(t, a, a + fi)), 1 - sstep(prog(t, b - fo, b)));
const mkCanvas = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
const easeOut = (u) => 1 - Math.pow(1 - clamp(u, 0, 1), 3);
const easeInOut = (u) => { u = clamp(u, 0, 1); return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
// пружины Framer Motion как функции времени: 0 → 1 с перелётом (детерминированно, по таблице)
function makeSpring(opts) {
  const g = Motion.spring({ ...opts, keyframes: [0, 1] });
  const pts = []; for (let i = 0; i <= 400; i++) pts.push(g.next(i * 10).value);
  return (s) => { if (s <= 0) return 0; const f = s * 100; if (f >= 400) return 1; const i = Math.floor(f); return lerp(pts[i], pts[i + 1], f - i); };
}
const springPop = makeSpring({ stiffness: 260, damping: 13, mass: 1 });
const springSoft = makeSpring({ stiffness: 140, damping: 17, mass: 1 });
const springSnap = makeSpring({ stiffness: 420, damping: 20, mass: 1 });
// пружина от момента t0: значение в момент t (секунды)
const popAt = (t, t0, f = springPop) => (t < t0 ? 0 : f(t - t0));
// детерминированный «шум» для дрожи
const wob = (t, f, s = 0) => Math.sin(t * f + s) * 0.6 + Math.sin(t * f * 2.31 + s * 1.7) * 0.4;

const C = {
  night: "#120a35", night2: "#2b1c66", night3: "#5a3c9e", magenta: "#ff2e88", magentaD: "#b3125a", yellow: "#ffd21f", yellowD: "#e0a800",
  cyan: "#22d3ee", red: "#ef2b2b", redD: "#9e1414", green: "#3fd46b", white: "#ffffff", ink: "#1a1233",
  grass1: "#47a84a", grass2: "#2c7c39", wood: "#d08c4c", woodD: "#93582a", woodL: "#e9ae6e", leaf1: "#2f8a3e", leaf2: "#46a84c", leaf3: "#6cc35a",
  gold: "#ffcf4a", goldD: "#c98b12",
};
const F_NARROW = '"Narrow"', F_SANS = '"SansB"', F_NUM = '"Num"';
function font(c, px, fam = F_NARROW, style = "") { c.font = `${style} ${px}px ${fam}`.trim(); }

// параллелограмм со скосом s
function slant(c, x, y, w, h, s) { c.beginPath(); c.moveTo(x + s, y); c.lineTo(x + w, y); c.lineTo(x + w - s, y + h); c.lineTo(x, y + h); c.closePath(); }
function rrect(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }
// заливка + мультяшный контур текущего пути
function ink(c, fill, lw = 5, stroke = C.ink) { c.fillStyle = fill; c.fill(); if (lw > 0) { c.lineWidth = lw; c.strokeStyle = stroke; c.lineJoin = "round"; c.stroke(); } }
function circle(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, TAU); }
function ellipse(c, x, y, rx, ry, rot = 0) { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, TAU); }
// двухзвенная конечность: локоть по IK, bend = ±1 — в какую сторону гнётся
function ik(sx, sy, tx, ty, a, b, bend) {
  let dx = tx - sx, dy = ty - sy, d = Math.hypot(dx, dy);
  const dd = clamp(d, Math.abs(a - b) + 0.01, a + b - 0.01);
  if (d < 1e-6) { dx = 0; dy = 1; d = 1; }
  const base = Math.atan2(dy, dx), al = Math.acos(clamp((a * a + dd * dd - b * b) / (2 * a * dd), -1, 1));
  const ang = base - bend * al;
  const ex = sx + Math.cos(ang) * a, ey = sy + Math.sin(ang) * a;
  const ux = dx / d, uy = dy / d;
  return { ex, ey, hx: sx + ux * Math.min(d, a + b - 0.01), hy: sy + uy * Math.min(d, a + b - 0.01) };
}
function limb(c, sx, sy, tx, ty, a, b, bend, w, col, end = null) {
  const k = ik(sx, sy, tx, ty, a, b, bend);
  c.save(); c.lineCap = "round"; c.lineJoin = "round";
  c.beginPath(); c.moveTo(sx, sy); c.lineTo(k.ex, k.ey); c.lineTo(k.hx, k.hy);
  c.strokeStyle = C.ink; c.lineWidth = w + 9; c.stroke(); c.strokeStyle = col; c.lineWidth = w; c.stroke();
  c.restore();
  if (end) end(k.hx, k.hy, Math.atan2(k.hy - k.ey, k.hx - k.ex));
  return k;
}
