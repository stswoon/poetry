// Весенняя гроза — приключенческое аниме. Всё рисуется кодом на одном canvas; кадр — функция времени.
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
const easeIn = (u) => Math.pow(clamp(u, 0, 1), 3);
const easeInOut = (u) => { u = clamp(u, 0, 1); return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
// пружины Framer Motion как функции времени: 0 → 1 с перелётом
function makeSpring(opts) {
  const g = Motion.spring({ ...opts, keyframes: [0, 1] });
  const pts = []; for (let i = 0; i <= 400; i++) pts.push(g.next(i * 10).value);
  return (s) => { if (s <= 0) return 0; const f = s * 100; if (f >= 400) return 1; const i = Math.floor(f); return lerp(pts[i], pts[i + 1], f - i); };
}
const springPop = makeSpring({ stiffness: 260, damping: 13, mass: 1 });
const springSoft = makeSpring({ stiffness: 140, damping: 17, mass: 1 });
const springSnap = makeSpring({ stiffness: 420, damping: 20, mass: 1 });
const springBounce = makeSpring({ stiffness: 320, damping: 8, mass: 1 });
const wob = (t, f, s = 0) => Math.sin(t * f + s) * 0.6 + Math.sin(t * f * 2.31 + s * 1.7) * 0.4;
// «подскок» после события в момент a: 0 → пик → 0
const bump = (t, a, d = 0.5) => { const u = prog(t, a, a + d); return u <= 0 || u >= 1 ? 0 : Math.sin(u * Math.PI) * (1 - u); };

const C = {
  ink: "#1b2547", line: "#22305e",
  skyTop: "#2f6fe0", skyMid: "#5aa7f5", skyLow: "#bfe8ff",
  stormTop: "#3b3f73", stormMid: "#5d5f9a", stormLight: "#9ea3d6", stormRim: "#e9ecff",
  cloud: "#ffffff", cloudShade: "#c9d8f4", cloudShade2: "#9fb6e6",
  grass1: "#7fd35a", grass2: "#47a83f", grass3: "#2f7e3a", grassLight: "#b8ef7c",
  hillFar: "#7bb6d8", hillFar2: "#9fcbe4", mount: "#6f8fc9",
  trunk: "#6b4a3a", trunkD: "#4a3029", leaf: "#58b84a", leafD: "#3a8a3e",
  blossom: "#ffe3ee", blossomD: "#f6a9c4", gold: "#ffd34d", goldD: "#e09a1a", goldL: "#fff1a8",
  jacket: "#ffc928", jacketD: "#e2961a", pants: "#2c4f9c", hair: "#2a2f5e", hairL: "#4a5799", skin: "#ffd9bf", skinD: "#f0b296",
  road: "#d9b27c", roadD: "#b98b55", dust: "#e8cfa3",
  water: "#4fc3f0", waterD: "#2a8fd0", foam: "#f2fbff", rock: "#8a8fa8", rockD: "#5f6480",
  white: "#ffffff", yellow: "#ffe14a", pinkHair: "#f2c46b", hebeHair: "#f7c769", hebeHairD: "#d99a3e", chiton: "#fbfbff", chitonD: "#cfd6ee",
  eagle: "#8a5a32", eagleD: "#5c3a22", eagleL: "#c48a4f", beak: "#ffc23a",
};
const F_SANS = '"SansB"', F_NARROW = '"Narrow"';
function font(c, px, fam = F_NARROW, style = "") { c.font = `${style} ${px}px ${fam}`.trim(); }

// заливка текущего пути + аниме-контур
function ink(c, fill, lw = 4, stroke = C.line) { c.fillStyle = fill; c.fill(); if (lw > 0) { c.lineWidth = lw; c.strokeStyle = stroke; c.lineJoin = "round"; c.lineCap = "round"; c.stroke(); } }
function circle(c, x, y, r) { c.beginPath(); c.arc(x, y, Math.max(0.1, r), 0, TAU); }
function ell(c, x, y, rx, ry, rot = 0) { c.beginPath(); c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU); }
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
  if (a <= 0) return;
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, col); g.addColorStop(1, "rgba(255,255,255,0)");
  c.save(); c.globalAlpha *= a; c.fillStyle = g; c.fillRect(x - r, y - r, 2 * r, 2 * r); c.restore();
}
// камера: перевод из мировых координат сцены
function camApply(c, cx, cy, z, rot = 0) { c.translate(W / 2, H / 2); c.rotate(rot); c.scale(z, z); c.translate(-cx, -cy); }
// интерполяция по ключам [t, ...значения] с мягким ходом
function keys(t, K, ease = easeInOut) {
  if (t <= K[0][0]) return K[0].slice(1);
  for (let i = 0; i < K.length - 1; i++) if (t <= K[i + 1][0]) { const u = ease(prog(t, K[i][0], K[i + 1][0])); return K[i].slice(1).map((v, j) => lerp(v, K[i + 1][j + 1], u)); }
  return K[K.length - 1].slice(1);
}
// линии скорости (аниме) от центра наружу
function speedLines(c, cx, cy, a, seed = 1, t = 0, col = "#fff", n = 46) {
  if (a <= 0) return;
  const r = mulberry32(seed + Math.floor(t * 12));
  c.save(); c.globalAlpha *= a; c.fillStyle = col;
  for (let i = 0; i < n; i++) {
    const ang = r() * TAU, r0 = 380 + r() * 260, r1 = 1300, w = 3 + r() * 9;
    const ca = Math.cos(ang), sa = Math.sin(ang), px = -sa, py = ca;
    c.beginPath(); c.moveTo(cx + ca * r0, cy + sa * r0); c.lineTo(cx + ca * r1 + px * w, cy + sa * r1 + py * w); c.lineTo(cx + ca * r1 - px * w, cy + sa * r1 - py * w); c.closePath(); c.fill();
  }
  c.restore();
}
// вертикальные линии скорости при взлёте/падении камеры
function rushLines(c, a, t, dir = 1, col = "#fff") {
  if (a <= 0) return;
  const r = mulberry32(77);
  c.save(); c.globalAlpha *= a; c.strokeStyle = col; c.lineCap = "round";
  for (let i = 0; i < 60; i++) {
    const x = r() * W, len = 120 + r() * 380, sp = 2600 + r() * 1800, w = 2 + r() * 6;
    let y = ((r() * (H + len) - dir * t * sp) % (H + len) + (H + len)) % (H + len) - len;
    c.globalAlpha = a * (0.25 + 0.5 * r()); c.lineWidth = w; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + len); c.stroke();
  }
  c.restore();
}
