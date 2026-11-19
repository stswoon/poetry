// ---------- мел на доске ----------
// Рисунок кладётся на прозрачный слой обычными штрихами, потом слой умножается на маску зерна (destination-in):
// так у любой линии и буквы рваный меловой край. Мел «дышит»: дрожание точек меняется BOIL_FPS раз в секунду.
const BOIL_FPS = 10;
let BOIL = 0;
let GA = 1;   // общая прозрачность героя: умножается на прозрачность каждого штриха
const CH = {
  white: "#f4f2ea", cream: "#fbf3d6", blue: "#9fd2f3", sky: "#cfeafc", deep: "#6fa7e0", yellow: "#f7e07a",
  pink: "#f5a9bd", red: "#ee7a6c", ochre: "#dca55e", brown: "#a7825e", mud: "#8d7357", green: "#a6d99a",
  violet: "#c7b2ee", skin: "#f8d2b6", hair: "#e9b765", grey: "#b9c2bd"
};
const BOARD = "#2b4a3d";

function makeCanvas(w, h) { const cv = document.createElement("canvas"); cv.width = w; cv.height = h; return cv; }

// бесшовная плитка: рисуем пятно и его копии через края
function wrapDraw(size, x, y, r, fn) {
  for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) {
    if (x + dx + r < 0 || x + dx - r > size || y + dy + r < 0 || y + dy - r > size) continue;
    fn(x + dx, y + dy);
  }
}

let BOARD_TILE = null, GRAIN_W = null, GRAIN_S = null;
function buildBoard() {
  const S = 1024, cv = makeCanvas(S, S), c = cv.getContext("2d"), R = mulberry32(7);
  c.fillStyle = BOARD; c.fillRect(0, 0, S, S);
  // крупные пятна: доска неровно тёмная
  for (let i = 0; i < 46; i++) {
    const x = R() * S, y = R() * S, r = 120 + R() * 300, light = R() < 0.55;
    wrapDraw(S, x, y, r, (px, py) => {
      const g = c.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, light ? "rgba(200,225,210,0.07)" : "rgba(10,25,18,0.12)"); g.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = g; c.fillRect(px - r, py - r, r * 2, r * 2);
    });
  }
  // следы губки: широкие дуги стёртого мела
  c.lineCap = "round";
  for (let i = 0; i < 30; i++) {
    const x = R() * S, y = R() * S, r = 90 + R() * 220, a0 = R() * TAU, da = 0.6 + R() * 1.4;
    wrapDraw(S, x, y, r + 60, (px, py) => {
      c.strokeStyle = `rgba(235,240,232,${0.018 + R() * 0.03})`; c.lineWidth = 40 + R() * 70;
      c.beginPath(); c.arc(px, py, r, a0, a0 + da); c.stroke();
    });
  }
  // призраки старых надписей
  for (let i = 0; i < 70; i++) {
    const x = R() * S, y = R() * S, len = 10 + R() * 40;
    wrapDraw(S, x, y, len, (px, py) => {
      c.strokeStyle = `rgba(240,240,230,${0.03 + R() * 0.04})`; c.lineWidth = 2 + R() * 3;
      c.beginPath(); c.moveTo(px, py); c.quadraticCurveTo(px + len * 0.5, py - 10 + R() * 20, px + len, py + R() * 8 - 4); c.stroke();
    });
  }
  // мелкий шум
  const im = c.getImageData(0, 0, S, S), d = im.data;
  for (let i = 0; i < d.length; i += 4) { const n = (R() - 0.5) * 12; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  c.putImageData(im, 0, 0);
  BOARD_TILE = cv;
}

// маска зерна: в основном непрозрачная, с продолговатыми «дырками», как мел на шершавой доске
function buildGrain(seed, holes, base, size = 512) {
  const cv = makeCanvas(size, size), c = cv.getContext("2d"), R = mulberry32(seed);
  const im = c.createImageData(size, size), d = im.data, A = new Float32Array(size * size);
  for (let i = 0; i < A.length; i++) A[i] = base + (1 - base) * R();
  for (let k = 0; k < holes; k++) {
    const x0 = R() * size, y0 = R() * size, len = 1.5 + R() * 6, wd = 0.6 + R() * 1.1, ang = -0.35 + (R() - 0.5) * 0.9, depth = 0.25 + R() * 0.65;
    const ca = Math.cos(ang), sa = Math.sin(ang), rr = Math.ceil(len + 2);
    for (let dy = -rr; dy <= rr; dy++) for (let dx = -rr; dx <= rr; dx++) {
      const u = (dx * ca + dy * sa) / len, v = (-dx * sa + dy * ca) / wd, q = u * u + v * v;
      if (q > 1) continue;
      const xi = ((Math.round(x0 + dx) % size) + size) % size, yi = ((Math.round(y0 + dy) % size) + size) % size, j = yi * size + xi;
      A[j] *= 1 - depth * (1 - q);
    }
  }
  for (let i = 0; i < A.length; i++) { d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = 255; d[i * 4 + 3] = Math.round(clamp(A[i], 0, 1) * 255); }
  c.putImageData(im, 0, 0);
  return cv;
}

function buildChalk() {
  buildBoard();
  GRAIN_W = buildGrain(11, 5200, 0.62);
  GRAIN_S = buildGrain(23, 1800, 0.86);
}

// ---------- штрих ----------
const jit = (seed, i, amp) => (hash(seed * 13.7 + i * 7.31 + BOIL * 1.913) - 0.5) * 2 * amp;
// обрезать ломаную по доле длины (мел «дописывает» линию)
function trunc(P, u) {
  if (u >= 1) return P; if (u <= 0) return [];
  let L = 0; const seg = [];
  for (let i = 1; i < P.length; i++) { const l = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); seg.push(l); L += l; }
  let left = L * u; const out = [P[0]];
  for (let i = 1; i < P.length; i++) {
    if (left >= seg[i - 1]) { out.push(P[i]); left -= seg[i - 1]; continue; }
    const k = left / Math.max(1e-6, seg[i - 1]); out.push([lerp(P[i - 1][0], P[i][0], k), lerp(P[i - 1][1], P[i][1], k)]); break;
  }
  return out;
}
// сгладить: Катмулл–Ром, n точек на отрезок
function curve(P, n = 6, closed = false) {
  const out = [], m = P.length, get = (i) => closed ? P[(i + m) % m] : P[clamp(i, 0, m - 1)];
  const last = closed ? m : m - 1;
  for (let i = 0; i < last; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
    }
  }
  out.push(closed ? [...P[0]] : [...P[m - 1]]);
  return out;
}
function ellPts(cx, cy, rx, ry, rot = 0, n = 28, a0 = 0, a1 = TAU) {
  const out = [], cr = Math.cos(rot), sr = Math.sin(rot);
  for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n), x = Math.cos(a) * rx, y = Math.sin(a) * ry; out.push([cx + x * cr - y * sr, cy + x * sr + y * cr]); }
  return out;
}
// меловая линия: основной штрих и тонкий сдвинутый «край» мелка
function chalkLine(c, P, w, col, o = {}) {
  const seed = o.seed || 1, amp = o.jit ?? 1.3, a = (o.alpha ?? 1) * GA;
  const Q = o.prog != null ? trunc(P, o.prog) : P;
  if (Q.length < 2 || a <= 0.003) return;
  c.save(); c.lineCap = "round"; c.lineJoin = "round"; c.strokeStyle = col;
  for (let pass = 0; pass < 2; pass++) {
    c.globalAlpha = a * (pass ? 0.6 : 0.96); c.lineWidth = w * (pass ? 0.5 : 1);
    c.beginPath();
    for (let i = 0; i < Q.length; i++) {
      const x = Q[i][0] + jit(seed + pass * 3, i, amp) + (pass ? w * 0.22 : 0), y = Q[i][1] + jit(seed + pass * 3 + 1, i, amp) - (pass ? w * 0.16 : 0);
      i ? c.lineTo(x, y) : c.moveTo(x, y);
    }
    c.stroke();
  }
  c.restore();
}
// заливка «плашмя» мелом + штриховка; P — замкнутый контур
function chalkFill(c, P, col, o = {}) {
  if (P.length < 3) return;
  const a = (o.alpha ?? 1) * GA; if (a <= 0.003) return;
  const path = polyPath(P);
  c.save(); c.clip(path);
  // подложка цвета доски: то, что позади фигуры, не просвечивает
  if (o.under !== false) { c.globalAlpha = a; c.fillStyle = BOARD; c.fill(path); }
  c.globalAlpha = (o.base ?? 0.3) * a; c.fillStyle = col; c.fill(path);
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const p of P) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) / 2 + 4, ang = o.ang ?? -1.0, sp = o.sp ?? 8, seed = o.seed || 3;
  const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
  c.strokeStyle = col; c.lineWidth = o.lw ?? 3; c.lineCap = "round"; c.globalAlpha = (o.hatch ?? 0.7) * a;
  c.beginPath();
  for (let k = -R, i = 0; k <= R; k += sp, i++) {
    const off = k + jit(seed, i, sp * 0.18), l0 = -R + jit(seed + 1, i, 6), l1 = R + jit(seed + 2, i, 6);
    c.moveTo(cx + nx * off + dx * l0, cy + ny * off + dy * l0); c.lineTo(cx + nx * off + dx * l1 + jit(seed + 4, i, 1.5), cy + ny * off + dy * l1);
  }
  c.stroke();
  c.restore();
}
// фигура: заливка + контур
function chalkShape(c, P, fill, line, w, o = {}) {
  if (fill) chalkFill(c, P, fill, o);
  if (line) chalkLine(c, [...P, P[0]], w, line, { seed: (o.seed || 3) + 50, alpha: o.alpha, jit: o.jit, prog: o.prog });
}
function chalkDot(c, x, y, r, col, a = 1) { c.save(); c.globalAlpha = a * GA; c.fillStyle = col; circle(c, x, y, r); c.fill(); c.restore(); }

// меловая пыль: облачко точек, разлетается и оседает
function dust(c, x, y, t0, t, n = 26, spread = 90, col = CH.white, seed = 5) {
  const u = t - t0; if (u < 0 || u > 1.6) return;
  const R = mulberry32(seed), fade = 1 - sstep(u / 1.6);
  c.save(); c.fillStyle = col;
  for (let i = 0; i < n; i++) {
    const ang = R() * TAU, sp = spread * (0.3 + R() * 0.9), r = 1.5 + R() * 3.5;
    const px = x + Math.cos(ang) * sp * easeOut(u * 1.4), py = y + Math.sin(ang) * sp * 0.6 * easeOut(u * 1.4) + u * u * 40;
    c.globalAlpha = fade * (0.35 + R() * 0.5); circle(c, px, py, r); c.fill();
  }
  c.restore();
}
