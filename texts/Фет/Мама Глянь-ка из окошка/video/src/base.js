// «Мама! глянь-ка из окошка…» — мел на школьной доске. Всё рисуется кодом на canvas; кадр — функция времени.
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
const springSoft = makeSpring({ stiffness: 110, damping: 17, mass: 1 });
const springBounce = makeSpring({ stiffness: 330, damping: 9, mass: 1 });
const spr = (fn, t, a) => fn(Math.max(0, t - a));
// импульс: 0 → пик → 0 за d секунд
const bump = (t, a, d = 0.5) => { const u = prog(t, a, a + d); return u <= 0 || u >= 1 ? 0 : Math.sin(u * Math.PI) * (1 - u * 0.5); };
// затухающее покачивание после события
const ring = (t, a, f = 9, d = 1.2) => { const s = t - a; return s <= 0 ? 0 : Math.sin(s * f) * Math.exp(-s * 3.2 / d); };
const wob = (t, f, s = 0) => Math.sin(t * f + s) * 0.6 + Math.sin(t * f * 2.31 + s * 1.7) * 0.4;

// ---------- цвет ----------
function circle(c, x, y, r) { c.beginPath(); c.arc(x, y, Math.max(0.1, r), 0, TAU); }
// детерминированный шум 1D по целому ключу
const hash = (n) => { let x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const noise1 = (x, s = 0) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i + s * 57), hash(i + 1 + s * 57), u) * 2 - 1; };
function polyPath(pts, close = true) { const p = new Path2D(); pts.forEach((q, i) => (i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1]))); if (close) p.closePath(); return p; }
// двухзвенная IK: от a к цели b, длины l1, l2; bend = +1/−1 — в какую сторону сгиб
function ik(a, b, l1, l2, bend) {
  let dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy);
  const dd = clamp(d, Math.abs(l1 - l2) + 0.01, l1 + l2 - 0.01);
  if (d < 1e-6) { dx = 0; dy = 1; d = 1; }
  const ux = dx / d, uy = dy / d, ex = a[0] + ux * dd, ey = a[1] + uy * dd;
  const x = (l1 * l1 - l2 * l2 + dd * dd) / (2 * dd), h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
  return { mid: [a[0] + ux * x - uy * h * bend, a[1] + uy * x + ux * h * bend], end: [ex, ey] };
}
