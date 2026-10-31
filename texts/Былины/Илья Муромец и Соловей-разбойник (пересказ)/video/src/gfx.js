// Низкое разрешение 480×270, масштаб ×4 в CSS. Всё рисуется как функция времени.
const LW = 480, LH = 270;

function hash(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
const lerp = (a, b, u) => a + (b - a) * u;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const smooth = (u) => { u = clamp(u); return u * u * (3 - 2 * u); };
const R = Math.round;

// пружина Framer Motion как функция времени: 0 → 1 с перелётом
function makeSpring(o) {
  const g = Motion.spring(Object.assign({ keyframes: [0, 1] }, o));
  const pts = [];
  for (let i = 0; i <= 300; i++) pts.push(g.next(i * 10).value);
  return (s) => { if (s <= 0) return 0; const f = s * 100; if (f >= 300) return 1; const i = Math.floor(f); return lerp(pts[i], pts[i + 1], f - i); };
}
const springPop = makeSpring({ stiffness: 240, damping: 14, mass: 1 });
const springSoft = makeSpring({ stiffness: 90, damping: 16, mass: 1 });

function rect(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(R(x), R(y), R(w), R(h)); }
function poly(c, pts, col) {
  let y0 = Infinity, y1 = -Infinity;
  for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  c.fillStyle = col;
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
    const xs = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      if ((a[1] <= y + 0.5 && b[1] > y + 0.5) || (b[1] <= y + 0.5 && a[1] > y + 0.5)) {
        xs.push(a[0] + (y + 0.5 - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
      }
    }
    xs.sort((p, q) => p - q);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const l = R(xs[i]), r = R(xs[i + 1]);
      if (r > l) c.fillRect(l, y, r - l, 1);
    }
  }
}
function disc(c, x, y, r, col) {
  c.fillStyle = col;
  for (let j = -Math.ceil(r); j <= Math.ceil(r); j++) {
    const h = Math.sqrt(Math.max(0, r * r - j * j));
    if (h > 0) c.fillRect(R(x - h), R(y + j), Math.max(1, R(2 * h)), 1);
  }
}
function ell(c, x, y, rx, ry, col) {
  c.fillStyle = col;
  for (let j = -Math.ceil(ry); j <= Math.ceil(ry); j++) {
    const h = rx * Math.sqrt(Math.max(0, 1 - (j * j) / (ry * ry)));
    if (h > 0) c.fillRect(R(x - h), R(y + j), Math.max(1, R(2 * h)), 1);
  }
}
function line(c, x0, y0, x1, y1, col, w = 1) {
  c.fillStyle = col;
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) c.fillRect(R(lerp(x0, x1, i / n) - (w - 1) / 2), R(lerp(y0, y1, i / n) - (w - 1) / 2), w, w);
}

// Спрайт в кэше: рисует fn, по желанию обводит тёмным контуром.
const spriteCache = new Map();
function sprite(key, w, h, fn, outline = "#120c14") {
  let s = spriteCache.get(key);
  if (s) return s;
  s = document.createElement("canvas");
  s.width = w; s.height = h;
  const c = s.getContext("2d");
  c.imageSmoothingEnabled = false;
  fn(c);
  if (outline) {
    const id = c.getImageData(0, 0, w, h), d = id.data;
    const op = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 40;
    const edge = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!op(x, y) && (op(x - 1, y) || op(x + 1, y) || op(x, y - 1) || op(x, y + 1))) edge.push(x, y);
    }
    c.fillStyle = outline;
    for (let i = 0; i < edge.length; i += 2) c.fillRect(edge[i], edge[i + 1], 1, 1);
  }
  spriteCache.set(key, s);
  return s;
}
function blit(c, s, x, y, flip) {
  x = R(x); y = R(y);
  if (!flip) { c.drawImage(s, x, y); return; }
  c.save(); c.translate(x + s.width, y); c.scale(-1, 1); c.drawImage(s, 0, 0); c.restore();
}
// Масштаб и поворот спрайта без сглаживания (поворот стиля Mode 7)
function blitRot(c, s, cx, cy, ang, scale = 1) {
  c.save(); c.translate(R(cx), R(cy)); c.rotate(ang); c.scale(scale, scale);
  c.drawImage(s, -s.width / 2, -s.height / 2); c.restore();
}

// Небо из полос с шахматным переходом: фирменный градиент 16-бит.
function mixHex(a, b, u) {
  const p = (s, i) => parseInt(s.substr(i, 2), 16);
  const m = (i) => R(lerp(p(a, i), p(b, i), u)).toString(16).padStart(2, "0");
  return "#" + m(1) + m(3) + m(5);
}
function skyBands(c, src, h = LH) {
  const bands = [];
  src.forEach((col, i) => { bands.push(col); if (i + 1 < src.length) bands.push(mixHex(col, src[i + 1], 0.5)); });
  const n = bands.length, bh = h / n;
  for (let i = 0; i < n; i++) {
    const y = Math.floor(i * bh), y2 = Math.floor((i + 1) * bh);
    rect(c, 0, y, LW, y2 - y, bands[i]);
    if (i + 1 < n) {
      c.fillStyle = bands[i + 1];
      for (let yy = y2 - 2; yy < y2; yy++) for (let x = (yy & 1) * 1; x < LW; x += 2) c.fillRect(x, yy, 1, 1);
    }
  }
}

function hillsLayer(c, base, amp, period, seed, col, scroll, topCol) {
  for (let x = 0; x < LW; x++) {
    const u = (x + scroll) / period;
    const n = Math.sin(u * 2 + seed) * 0.55 + Math.sin(u * 5.3 + seed * 2.1) * 0.25 + Math.sin(u * 11.7 + seed * 0.7) * 0.2;
    const y = R(base - (n + 1) * amp);
    if (topCol) { c.fillStyle = topCol; c.fillRect(x, y, 1, 2); c.fillStyle = col; c.fillRect(x, y + 2, 1, LH - y); }
    else { c.fillStyle = col; c.fillRect(x, y, 1, LH - y); }
  }
}

// Зубчатая кромка хвойного леса
function forestLayer(c, base, h, period, seed, col, scroll, tipCol) {
  const ox = Math.floor(scroll / period);
  for (let i = -2; i < LW / period + 3; i++) {
    const k = i + ox, x = k * period - scroll;
    const th = h * (0.55 + hash(k * 3.1 + seed) * 0.6), tx = x + hash(k + seed) * period * 0.6;
    const hw = period * (0.75 + hash(k * 7.7 + seed) * 0.35);
    poly(c, [[tx, base - th], [tx + hw, base + 2], [tx - hw, base + 2]], col);
    if (tipCol) poly(c, [[tx, base - th], [tx + hw * 0.32, base - th * 0.68], [tx - hw * 0.1, base - th * 0.64]], tipCol);
  }
  rect(c, 0, base, LW, LH - base, col);
}

function cloudsLayer(c, y, scroll, seed, col, shade) {
  const P = 150, ox = Math.floor(scroll / P);
  for (let i = -1; i < LW / P + 2; i++) {
    const k = i + ox, x = k * P - scroll + hash(k * 9.1 + seed) * 70, yy = y + hash(k * 2.3 + seed) * 26;
    const w = 14 + hash(k + seed) * 18;
    ell(c, x, yy, w, 5, col); ell(c, x - w * 0.5, yy + 2, w * 0.6, 4, col); ell(c, x + w * 0.6, yy + 2, w * 0.55, 3, col); ell(c, x + w * 0.1, yy - 3, w * 0.5, 4, col);
    rect(c, x - w * 0.9, yy + 4, w * 1.8, 1, shade);
  }
}

// Плоская земля с полосами-тайлами, бегущими вбок
function groundLayer(c, y, scroll, cols, tuft) {
  const [a, b, d] = cols;
  rect(c, 0, y, LW, LH - y, a);
  rect(c, 0, y, LW, 2, b);
  for (let i = 0; i < 90; i++) {
    const row = hash(i * 1.7);
    const yy = y + 4 + row * (LH - y - 6);
    const sp = 0.6 + row * 1.6;
    const P = 480 + 40;
    let x = (hash(i * 3.3) * P - scroll * sp) % P; if (x < 0) x += P;
    x -= 20;
    rect(c, x, yy, 4 + hash(i) * 8, 1, i % 3 ? d : b);
  }
  if (tuft) {
    const P = 37, ox = Math.floor(scroll * 1.2 / P);
    for (let i = -1; i < LW / P + 2; i++) {
      const k = i + ox, x = k * P - scroll * 1.2 + hash(k) * 20, yy = y + 1 + hash(k * 1.3) * 3;
      rect(c, x, yy - 3, 1, 3, tuft); rect(c, x + 2, yy - 2, 1, 2, tuft);
    }
  }
}

function wash(c, col, a) {
  c.save(); c.globalAlpha = a; c.fillStyle = col; c.fillRect(0, 0, LW, LH); c.restore();
}

// Шахматное затемнение: 4 уровня, как у консоли без альфы
function ditherFade(c, level, col = "#0b0710") {
  level = clamp(level);
  if (level <= 0) return;
  if (level >= 1) { rect(c, 0, 0, LW, LH, col); return; }
  c.fillStyle = col;
  const n = Math.floor(level * 4);
  for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) {
    const m = ((x & 1) * 2 + (y & 1) * 3 + ((x >> 1) & 1) + ((y >> 1) & 1) * 2) % 4;
    if (m < n + (level * 4 - n > 0.5 ? 1 : 0)) c.fillRect(x, y, 1, 1);
  }
}

// Диафрагма: чёрный круг, закрывающий экран
function iris(c, cx, cy, r, col = "#0b0710") {
  c.fillStyle = col;
  if (r <= 0) { c.fillRect(0, 0, LW, LH); return; }
  for (let y = 0; y < LH; y++) {
    const d = y - cy, h = r * r - d * d;
    if (h <= 0) { c.fillRect(0, y, LW, 1); continue; }
    const s = Math.sqrt(h), l = R(cx - s), rr = R(cx + s);
    if (l > 0) c.fillRect(0, y, l, 1);
    if (rr < LW) c.fillRect(rr, y, LW - rr, 1);
  }
}

// Пиксельная рамка окна в стиле консольной RPG
function panel(c, x, y, w, h, fill = "#141a3c") {
  rect(c, x + 2, y, w - 4, h, "#e8e0c0");
  rect(c, x, y + 2, w, h - 4, "#e8e0c0");
  rect(c, x + 1, y + 1, w - 2, h - 2, "#e8e0c0");
  rect(c, x + 2, y + 2, w - 4, h - 4, "#7a6a3c");
  rect(c, x + 3, y + 3, w - 6, h - 6, fill);
  c.fillStyle = "#1c2450";
  for (let j = y + 3; j < y + h - 3; j += 2) c.fillRect(x + 3, j, w - 6, 1);
}
