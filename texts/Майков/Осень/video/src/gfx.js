// ---------- служебное: время, пружины, примитивы пиксельной графики ----------
// v2: мир задаётся в «единицах» 320×150, но рисуется в буфер с сеткой ×3 (960×450 пикселей) и растягивается
// на 1920×900 без сглаживания (×2). Примитивы принимают координаты в единицах и растрируют по мелкой сетке:
// круги, наклоны и детали втрое мельче, чем в v1. Текст и HUD рисуются поверх в полном разрешении.
const LW = 320, LH = 180, SC = 6; // единицы экрана и экранных пикселей на единицу
const K = 3;                        // пикселей буфера на единицу
const TAU = Math.PI * 2;

function hash(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
const lerp = (a, b, u) => a + (b - a) * u;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const smooth = (u) => { u = clamp(u); return u * u * (3 - 2 * u); };
const R = Math.round;
const D = (v) => Math.round(v * K); // единицы → пиксели буфера
const between = (t, a, b) => t >= a && t < b;
const prog = (t, a, b) => clamp((t - a) / (b - a));

// пружина Framer Motion как функция времени: 0 → 1 с перелётом
function makeSpring(o) {
  const gen = Motion.spring(Object.assign({ keyframes: [0, 1] }, o));
  const pts = [];
  for (let i = 0; i <= 300; i++) pts.push(gen.next(i * 10).value);
  return (s) => { if (s <= 0) return 0; const f = s * 100; if (f >= 300) return 1; const i = Math.floor(f); return lerp(pts[i], pts[i + 1], f - i); };
}
const springPop = makeSpring({ stiffness: 260, damping: 13, mass: 1 });
const springSoft = makeSpring({ stiffness: 110, damping: 17, mass: 1 });

// время событий из сборки: L(n) — начало строки n, LE(n) — конец, W(k) — слово или событие
const L = (n) => CFG.lines[n - 1].s;
const LE = (n) => CFG.lines[n - 1].e;
const W = (k) => { const v = CFG.ev[k]; if (v === undefined) throw new Error("нет события " + k); return v; };

// прямоугольник в единицах
function rect(c, x, y, w, h, col) {
  c.fillStyle = col;
  const x0 = D(x), y0 = D(y);
  c.fillRect(x0, y0, Math.max(1, D(x + w) - x0), Math.max(1, D(y + h) - y0));
}
// «пиксель» в единицу (3×3) и мелкий пиксель буфера n×n в точке (x, y) единиц
function px(c, x, y, col) { rect(c, R(x), R(y), 1, 1, col); }
function dp(c, x, y, col, n = 1, m) { c.fillStyle = col; c.fillRect(D(x), D(y), n, m === undefined ? n : m); }
// круг и эллипс построчно по мелкой сетке
function ell(c, x, y, rx, ry, col) {
  c.fillStyle = col;
  const cx = x * K, cy = y * K, a = rx * K, bb = ry * K;
  if (a <= 0 || bb <= 0) return;
  for (let j = -Math.ceil(bb); j <= Math.ceil(bb); j++) {
    const yy = j + 0.5;
    const h = a * Math.sqrt(Math.max(0, 1 - (yy * yy) / (bb * bb)));
    if (h > 0.35) { const l = Math.round(cx - h); c.fillRect(l, Math.round(cy + j), Math.max(1, Math.round(cx + h) - l), 1); }
  }
}
function disc(c, x, y, r, col) { ell(c, x, y, r, r, col); }
// линия толщиной w единиц: круглая кисть по мелкой сетке
const BRUSH = {};
function brush(d) {
  if (BRUSH[d]) return BRUSH[d];
  const rows = [], r = d / 2;
  for (let j = 0; j < d; j++) { const yy = j + 0.5 - r, h = Math.sqrt(Math.max(0, r * r - yy * yy)); rows.push([Math.round(r - h), Math.max(1, Math.round(2 * h))]); }
  return (BRUSH[d] = rows);
}
function line(c, x0, y0, x1, y1, col, w = 1) {
  c.fillStyle = col;
  const d = Math.max(1, Math.round(w * K)), o = d / 2;
  const ax = x0 * K, ay = y0 * K, bx = x1 * K, by = y1 * K;
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay))));
  const br = d >= 3 ? brush(d) : null;
  for (let i = 0; i <= n; i++) {
    const X = Math.round(lerp(ax, bx, i / n) - o), Y = Math.round(lerp(ay, by, i / n) - o);
    if (!br) c.fillRect(X, Y, d, d);
    else for (let j = 0; j < d; j++) c.fillRect(X + br[j][0], Y + j, br[j][1], 1);
  }
}
// многоугольник построчно по мелкой сетке (вершины в единицах)
function poly(c, pts, col) {
  const P = pts.map((p) => [p[0] * K, p[1] * K]);
  let y0 = Infinity, y1 = -Infinity;
  for (const p of P) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  c.fillStyle = col;
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
    const xs = [];
    for (let i = 0; i < P.length; i++) {
      const a = P[i], b2 = P[(i + 1) % P.length];
      if ((a[1] <= y + 0.5 && b2[1] > y + 0.5) || (b2[1] <= y + 0.5 && a[1] > y + 0.5)) xs.push(a[0] + (y + 0.5 - a[1]) / (b2[1] - a[1]) * (b2[0] - a[0]));
    }
    xs.sort((p, q) => p - q);
    for (let i = 0; i + 1 < xs.length; i += 2) { const l = Math.round(xs[i]), r = Math.round(xs[i + 1]); if (r > l) c.fillRect(l, y, r - l, 1); }
  }
}
// шахматный дизеринг по мелкой сетке внутри прямоугольника единиц
function dither(c, x, y, w, h, col, phase = 0) {
  c.fillStyle = col;
  const X = D(x), Y = D(y), Wd = D(w), Hd = D(h);
  for (let j = 0; j < Hd; j++) for (let i = (j + phase) & 1; i < Wd; i += 2) c.fillRect(X + i, Y + j, 1, 1);
}
// двухзвенная IK: от точки a к цели b, звенья l1/l2; bend = +1/−1 — в какую сторону гнуть сустав
function ik(ax, ay, bx, by, l1, l2, bend) {
  let dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy);
  const dm = Math.min(d, l1 + l2 - 0.01);
  if (d < 1e-6) { dx = 0; dy = 1; d = 1; }
  const ux = dx / d, uy = dy / d;
  const a = (l1 * l1 - l2 * l2 + dm * dm) / (2 * dm), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  return [ax + ux * a - uy * h * bend, ay + uy * a + ux * h * bend, ax + ux * dm, ay + uy * dm];
}
// цвет: смешение двух #rrggbb
function mix(c1, c2, u) {
  const a = parseInt(c1.slice(1), 16), b = parseInt(c2.slice(1), 16);
  const r = R(lerp(a >> 16, b >> 16, u)), g = R(lerp((a >> 8) & 255, (b >> 8) & 255, u)), bl = R(lerp(a & 255, b & 255, u));
  return "#" + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
}
// тёмный контур вокруг всего, что нарисовано на холсте src: 1 пиксель буфера по 8 направлениям
function outlined(dst, src, dx, dy, col) {
  const o = outlined.o || (outlined.o = document.createElement("canvas"));
  if (o.width !== src.width || o.height !== src.height) { o.width = src.width; o.height = src.height; }
  const oc = o.getContext("2d");
  oc.globalCompositeOperation = "source-over";
  oc.clearRect(0, 0, o.width, o.height);
  for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) oc.drawImage(src, ox, oy);
  oc.globalCompositeOperation = "source-in";
  oc.fillStyle = col; oc.fillRect(0, 0, o.width, o.height);
  oc.globalCompositeOperation = "source-over";
  dst.drawImage(o, dx, dy); dst.drawImage(src, dx, dy);
}
