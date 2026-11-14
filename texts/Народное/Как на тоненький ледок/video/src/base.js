// Как на тоненький ледок — пластилиновый мультфильм. Всё лепится кодом на одном canvas; кадр — функция времени.
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
const springBounce = makeSpring({ stiffness: 320, damping: 9, mass: 1 });
// пружина по реальному времени от события a (сек.)
const spr = (fn, t, a) => fn(Math.max(0, t - a));
const bump = (t, a, d = 0.5) => { const u = prog(t, a, a + d); return u <= 0 || u >= 1 ? 0 : Math.sin(u * Math.PI) * (1 - u); };
const wob = (t, f, s = 0) => Math.sin(t * f + s) * 0.6 + Math.sin(t * f * 2.31 + s * 1.7) * 0.4;

// ---------- цвет ----------
const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const rgbStr = (c, a = 1) => a >= 1 ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a.toFixed(3)})`;
const mixRgb = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
const CC = {}; // кэш производных цветов
function shades(hex) {
  if (CC[hex]) return CC[hex];
  const b = hexRgb(hex);
  return (CC[hex] = { base: hex, rgb: b, light: rgbStr(mixRgb(b, [255, 255, 255], 0.38)), dark: rgbStr(mixRgb(b, [20, 18, 40], 0.42)),
    deep: mixRgb(b, [10, 10, 30], 0.6), spec: rgbStr(mixRgb(b, [255, 255, 255], 0.75)) });
}

// ---------- стоп-моушен: фактура «дрожит» 12 раз в секунду ----------
let BOIL = 0;          // номер «кадра» лепки, ставится в renderAt
const BOIL_FPS = 12;
function noise1(seed, i) { const r = mulberry32((seed * 7919 + i * 104729) | 0); r(); return r() * 2 - 1; }
// гладкий шум по углу: n гармоник с фазами из seed
function lumpR(seed, a, amt) {
  const r = mulberry32(seed | 0);
  const p1 = r() * TAU, p2 = r() * TAU, p3 = r() * TAU;
  const bp = BOIL * 1.7 + seed;
  return 1 + amt * (0.55 * Math.sin(2 * a + p1) + 0.3 * Math.sin(3 * a + p2) + 0.15 * Math.sin(5 * a + p3))
    + 0.012 * Math.sin(4 * a + bp) + 0.008 * Math.sin(7 * a + bp * 1.3);
}

// ---------- формы: Path2D + рамка ----------
function shapeFromPts(pts) {
  const p = new Path2D(), n = pts.length;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const q of pts) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); }
  const m0 = [(pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2];
  p.moveTo(m0[0], m0[1]);
  for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; p.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); }
  p.closePath();
  return { p, bb: [x0, y0, x1, y1] };
}
// комок: эллипс с неровным краем
function blob(cx, cy, rx, ry, rot = 0, seed = 1, lump = 0.05, n = 26) {
  const pts = [], cr = Math.cos(rot), sr = Math.sin(rot);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU, k = lumpR(seed, a, lump);
    const x = Math.cos(a) * rx * k, y = Math.sin(a) * ry * k;
    pts.push([cx + x * cr - y * sr, cy + x * sr + y * cr]);
  }
  return shapeFromPts(pts);
}
// колбаска между двумя точками
function sausage(x1, y1, r1, x2, y2, r2, seed = 1, lump = 0.04) {
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1e-3, ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  const pts = [], N = 9;
  for (let i = 0; i <= N; i++) { // полукруг вокруг конца 2
    const a = -Math.PI / 2 + (i / N) * Math.PI, k = lumpR(seed, a, lump);
    pts.push([x2 + (ux * Math.cos(a) + nx * Math.sin(a)) * r2 * k, y2 + (uy * Math.cos(a) + ny * Math.sin(a)) * r2 * k]);
  }
  for (let i = 0; i <= N; i++) { // полукруг вокруг конца 1
    const a = Math.PI / 2 + (i / N) * Math.PI, k = lumpR(seed + 3, a, lump);
    pts.push([x1 + (ux * Math.cos(a) + nx * Math.sin(a)) * r1 * k, y1 + (uy * Math.cos(a) + ny * Math.sin(a)) * r1 * k]);
  }
  return shapeFromPts(pts);
}
// многоугольник со скруглёнными углами и лёгкой «лепкой»
function lumpPoly(pts, seed = 1, j = 2) {
  const q = pts.map((p, i) => [p[0] + noise1(seed + BOIL * 3, i) * j, p[1] + noise1(seed + 11 + BOIL * 3, i) * j]);
  return shapeFromPts(q);
}

// ---------- пластилин: заливка с объёмом, бликом и отпечатками ----------
let CLAYM = 1; // 1 — свет слева; −1 — фигура зеркалена (scale(−1,1)), блик и тень переносим, чтобы свет оставался слева
function clay(c, s, hex, o = {}) {
  const M = CLAYM, sh = shades(hex), [x0, y0, x1, y1] = s.bb, w = x1 - x0, h = y1 - y0, m = Math.min(w, h);
  const rim = o.rim ?? Math.max(3, m * 0.16);
  if (o.shadow !== false) { // отбрасываемая тень на то, что сзади
    c.save(); c.translate(M * (o.sx ?? Math.max(2, m * 0.05)), o.sy ?? Math.max(3, m * 0.08)); c.fillStyle = "rgba(28,36,70,0.2)"; c.fill(s.p); c.restore();
  }
  c.fillStyle = hex; c.fill(s.p);
  c.save(); c.clip(s.p);
  const g = M > 0 ? c.createLinearGradient(x0, y0, x0 + w * 0.7, y1) : c.createLinearGradient(x1, y0, x1 - w * 0.7, y1);
  const sd = o.shade ?? 1;
  g.addColorStop(0, `rgba(255,255,255,${0.26 * sd})`); g.addColorStop(0.45, "rgba(255,255,255,0)"); g.addColorStop(1, rgbStr(sh.deep, 0.45 * sd));
  c.fillStyle = g; c.fillRect(x0 - 2, y0 - 2, w + 4, h + 4);
  // край темнее — форма скатана, а не вырезана
  c.lineJoin = "round";
  c.strokeStyle = rgbStr(sh.deep, 0.16); c.lineWidth = rim * 2.2; c.stroke(s.p);
  c.strokeStyle = rgbStr(sh.deep, 0.14); c.lineWidth = rim * 1.0; c.stroke(s.p);
  // мягкий блик сверху-слева
  if (o.spec !== false) {
    const hx = o.hx ?? 0.33, bx = x0 + w * (M > 0 ? hx : 1 - hx), by = y0 + h * (o.hy ?? 0.26), br = Math.max(4, m * 0.36);
    const gs = c.createRadialGradient(bx, by, 0, bx, by, br);
    gs.addColorStop(0, `rgba(255,255,255,${o.gloss ?? 0.42})`); gs.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = gs; c.fillRect(bx - br, by - br, 2 * br, 2 * br);
  }
  // отпечатки пальцев и вмятины
  if (o.prints !== false && m > 26) {
    const r = mulberry32((o.seed ?? 7) * 31 + 5);
    const n = o.prints ?? (m > 120 ? 2 : 1);
    c.lineWidth = Math.max(0.8, Math.min(1.6, m * 0.008)); c.strokeStyle = rgbStr(sh.deep, 0.07);
    for (let k = 0; k < n; k++) {
      const px = x0 + w * (0.25 + 0.5 * r()), py = y0 + h * (0.3 + 0.45 * r()), rr = Math.min(m * 0.16, 34), a0 = r() * TAU, rot = r() * 3;
      for (let i = 0; i < 8; i++) { const e = 0.25 + i * 0.1; c.beginPath(); c.ellipse(px, py, rr * e * 1.25, rr * e * 0.85, rot, a0 + i * 0.3, a0 + i * 0.3 + 2.2 + r() * 1.2); c.stroke(); }
    }
    c.fillStyle = "rgba(255,255,255,0.18)";
    for (let k = 0; k < 3; k++) { const px = x0 + w * r(), py = y0 + h * r(); c.beginPath(); c.ellipse(px, py, m * 0.03 + 1, m * 0.018 + 1, r() * 3, 0, TAU); c.fill(); }
  }
  c.restore();
}
// быстрые помощники
const clayBlob = (c, x, y, rx, ry, hex, rot = 0, seed = 1, o = {}) => clay(c, blob(x, y, rx, ry, rot, seed, o.lump ?? 0.05), hex, { seed, ...o });
const claySaus = (c, x1, y1, r1, x2, y2, r2, hex, seed = 1, o = {}) => clay(c, sausage(x1, y1, r1, x2, y2, r2, seed, o.lump ?? 0.04), hex, { seed, ...o });
// бусина-глаз: чёрная с бликом
function bead(c, x, y, r, open = 1) {
  if (open <= 0.08) { c.save(); c.strokeStyle = "#1b1622"; c.lineWidth = Math.max(2, r * 0.45); c.lineCap = "round"; c.beginPath(); c.moveTo(x - r, y); c.quadraticCurveTo(x, y + r * 0.6, x + r, y); c.stroke(); c.restore(); return; }
  c.save(); c.fillStyle = "#17131f"; c.beginPath(); c.ellipse(x, y, r, r * open, 0, 0, TAU); c.fill();
  c.fillStyle = "rgba(255,255,255,0.9)"; c.beginPath(); c.arc(x - r * 0.35, y - r * 0.35 * open, r * 0.32, 0, TAU); c.fill(); c.restore();
}
function circle(c, x, y, r) { c.beginPath(); c.arc(x, y, Math.max(0.1, r), 0, TAU); }
function rrect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
// мягкая тень на полу (овал)
function floorShadow(c, x, y, rx, a = 0.22) {
  if (rx <= 1) return;
  const g = c.createRadialGradient(x, y, 0, x, y, rx);
  g.addColorStop(0, `rgba(40,60,110,${a})`); g.addColorStop(1, "rgba(40,60,110,0)");
  c.save(); c.fillStyle = g; c.translate(x, y); c.scale(1, 0.24); c.translate(-x, -y); c.fillRect(x - rx, y - rx, 2 * rx, 2 * rx); c.restore();
}
// двухзвенная IK: от a до цели t, длины l1 l2, bend = +1/−1 — с какой стороны сустав
function ik2(ax, ay, tx, ty, l1, l2, bend) {
  let dx = tx - ax, dy = ty - ay, d = Math.hypot(dx, dy);
  const dmax = l1 + l2 - 0.5; if (d > dmax) { dx *= dmax / d; dy *= dmax / d; d = dmax; }
  d = Math.max(d, Math.abs(l1 - l2) + 0.5);
  const a = Math.atan2(dy, dx), cosA = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
  const ang = a + bend * Math.acos(cosA);
  return { jx: ax + Math.cos(ang) * l1, jy: ay + Math.sin(ang) * l1, ex: ax + dx, ey: ay + dy };
}
// шаги по точкам мира: s — пройденный путь, off — сдвиг фазы ноги, stance — доля опоры
function stepFoot(s, stride, off, stance, lift) {
  const u = s / stride + off, k = Math.floor(u), f = u - k;
  const Xk = (k + stance / 2 - off) * stride;
  if (f < stance) return { x: Xk, y: 0, air: 0 };
  const w = (f - stance) / (1 - stance);
  return { x: Xk + stride * sstep(w), y: -lift * Math.sin(Math.PI * w), air: Math.sin(Math.PI * w) };
}
