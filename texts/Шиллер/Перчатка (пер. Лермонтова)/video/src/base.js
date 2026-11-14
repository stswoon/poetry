// Файтинг-аркада «Королевский зверинец». Всё рисуется кодом на одном canvas.
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
const easeIn = (u) => Math.pow(clamp(u, 0, 1), 2.2);
const easeInOut = (u) => { u = clamp(u, 0, 1); return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
// пружины Framer Motion как функции времени: 0 → 1 с перелётом (детерминированно, по таблице)
function makeSpring(opts) {
  const g = Motion.spring({ ...opts, keyframes: [0, 1] });
  const pts = []; for (let i = 0; i <= 400; i++) pts.push(g.next(i * 10).value);
  return (s) => { if (s <= 0) return 0; const f = s * 100; if (f >= 400) return 1; const i = Math.floor(f); return lerp(pts[i], pts[i + 1], f - i); };
}
const springPop = makeSpring({ stiffness: 260, damping: 13, mass: 1 });
const springSoft = makeSpring({ stiffness: 140, damping: 17, mass: 1 });
const springSnap = makeSpring({ stiffness: 420, damping: 22, mass: 1 });
const springSlam = makeSpring({ stiffness: 600, damping: 16, mass: 1 });
// пружина от момента t0: секунды после t0
const popAt = (t, t0, f = springPop) => (t < t0 ? 0 : f(t - t0));
// детерминированный «шум» для дрожи
const wob = (t, f, s = 0) => Math.sin(t * f + s) * 0.6 + Math.sin(t * f * 2.31 + s * 1.7) * 0.4;

// ключи: [время, значение, длительность] → значение в момент t (числа или массивы)
function kf(list, t, f = springSoft) {
  let i = -1; for (let k = 0; k < list.length; k++) if (t >= list[k][0]) i = k;
  if (i <= 0) return list[0][1];
  const a = list[i - 1][1], b = list[i][1], u = f(prog(t, list[i][0], list[i][0] + (list[i][2] || 0.4)));
  const mix = (x, y) => (Array.isArray(x) ? x.map((v, j) => mix(v, y[j])) : lerp(x, y, u));
  return mix(a, b);
}
// шаг пешехода: короткий разгон и торможение, в середине ровная скорость (пик всего ×1.25 от средней)
function trapEase(u, a = 0.2) { u = clamp(u, 0, 1); const v = 1 / (1 - a);
  if (u < a) return v * u * u / (2 * a); if (u > 1 - a) return 1 - v * (1 - u) * (1 - u) / (2 * a); return v * (u - a / 2); }
// то же, но плавно (без перелёта)
const kfe = (list, t) => kf(list, t, easeInOut);

const C = {
  ink: "#1b1026", sky1: "#2a1450", sky2: "#c2426b", sky3: "#ffb04a", sun: "#ffe08a",
  stone: "#8a7a8f", stoneD: "#5e4f66", stoneL: "#b3a3b3", stoneDD: "#3d3045",
  sand: "#e9b86a", sandD: "#c98f45", sandL: "#f7d394",
  red: "#d42b3a", redD: "#8f1426", gold: "#ffcc3d", goldD: "#c08a12", blue: "#2f6fe0", blueD: "#1b3f8f", blueL: "#7fb2ff",
  pink: "#ff6fae", pinkD: "#c23a7a", pinkL: "#ffc2dc", white: "#ffffff", yellow: "#ffe14a", cyan: "#3ee8ff", green: "#3fd46b",
  hpG: "#48f07a", hpY: "#ffd23a", hpR: "#ff3b3b", steel: "#c9d3e6", steelD: "#7d8aa6",
  skin: "#f6c9a0", skinD: "#d79a74",
  lion: "#e8a63a", lionD: "#b8741c", mane: "#a8501a", maneD: "#6e2f0d", tiger: "#f08a22", tigerD: "#b85a10", bars: "#f3d27a", barsD: "#c9a24a",
};
const F_CAP = '"Narrow"', F_HUD = '"Arcade"', F_ITAL = '"SansB"';
function font(c, px, fam = F_CAP, style = "") { c.font = `${style} ${px}px ${fam}`.trim(); }

function rrect(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }
function slant(c, x, y, w, h, s) { c.beginPath(); c.moveTo(x + s, y); c.lineTo(x + w, y); c.lineTo(x + w - s, y + h); c.lineTo(x, y + h); c.closePath(); }
// заливка + мультяшный контур текущего пути
function ink(c, fill, lw = 5, stroke = C.ink) { c.fillStyle = fill; c.fill(); if (lw > 0) { c.lineWidth = lw; c.strokeStyle = stroke; c.lineJoin = "round"; c.stroke(); } }
function circle(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, TAU); }
function ellipse(c, x, y, rx, ry, rot = 0) { c.beginPath(); c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU); }
function line(c, pts, w, col, cap = "round") { c.save(); c.lineCap = cap; c.lineJoin = "round"; c.lineWidth = w; c.strokeStyle = col; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.stroke(); c.restore(); }
// толстая линия с контуром
function stroke2(c, pts, w, col, lw = 5) { line(c, pts, w + lw * 2, C.ink); line(c, pts, w, col); }
// двухзвенная конечность: колено/локоть по IK, bend = ±1 — в какую сторону гнётся
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
function limb(c, sx, sy, tx, ty, a, b, bend, w, col, lw = 5) {
  const k = ik(sx, sy, tx, ty, a, b, bend);
  stroke2(c, [[sx, sy], [k.ex, k.ey], [k.hx, k.hy]], w, col, lw);
  return k;
}
function star4(c, x, y, r, col) { if (r <= 0.5) return; c.save(); c.fillStyle = col; c.beginPath();
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU - Math.PI / 2, rr = i % 2 ? r * 0.28 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  c.closePath(); c.fill(); c.restore(); }
function star5(c, x, y, r, col, lw = 4) { c.beginPath();
  for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  c.closePath(); ink(c, col, lw); }
function heart(c, x, y, s, col, crack = 0) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.beginPath(); c.moveTo(0, 12); c.bezierCurveTo(-26, -6, -14, -26, 0, -12); c.bezierCurveTo(14, -26, 26, -6, 0, 12); c.closePath();
  ink(c, col, 3 / s);
  if (crack > 0) line(c, [[0, -12], [-4, -4], [3, 0], [-2, 8 * crack]], 3 / s, C.ink);
  c.restore();
}
// текст с толстым контуром (аркадный)
function arcadeText(c, txt, x, y, px, fill, opt = {}) {
  c.save(); font(c, px, opt.fam || F_HUD); c.textAlign = opt.align || "center"; c.textBaseline = "middle";
  c.lineJoin = "round"; c.miterLimit = 2;
  if (opt.shadow !== false) { c.fillStyle = opt.shadowCol || "rgba(0,0,0,0.55)"; c.fillText(txt, x + px * 0.06, y + px * 0.08); }
  c.lineWidth = opt.lw || px * 0.16; c.strokeStyle = opt.stroke || C.ink; c.strokeText(txt, x, y);
  if (opt.grad) { const g = c.createLinearGradient(0, y - px / 2, 0, y + px / 2); opt.grad.forEach((col, i) => g.addColorStop(i / (opt.grad.length - 1), col)); c.fillStyle = g; }
  else c.fillStyle = fill;
  c.fillText(txt, x, y); c.restore();
}
