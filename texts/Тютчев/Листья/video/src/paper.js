// ---------- бумага: волокна, вырезанные детали, тень от бумаги, «дрожание» перекладки ----------
let BOIL = 0;            // номер «кадра» перекладки (12 в секунду), ставится в renderAt
const BOIL_FPS = 12;
let CAMZ = 1;            // текущий масштаб камеры: тень от бумаги в пикселях экрана не зависит от зума
function noise1(seed, i) { const r = mulberry32((seed * 7919 + i * 104729) | 0); r(); return r() * 2 - 1; }
// детали перекладки чуть сдвигаются 12 раз в секунду, как при покадровой съёмке
const boil = (seed, amp = 0.8) => [noise1(seed, BOIL) * amp, noise1(seed + 77, BOIL) * amp, noise1(seed + 155, BOIL) * 0.004];

// текстура волокон: прозрачная, светлые и тёмные волокна, крапинки
function makeFibers(size, seed, dens = 1) {
  const cv = document.createElement("canvas"); cv.width = cv.height = size;
  const c = cv.getContext("2d"), r = mulberry32(seed);
  for (let i = 0; i < 2600 * dens; i++) { // крапинки
    const x = r() * size, y = r() * size, s = 0.6 + r() * 1.6, d = r() < 0.5;
    c.fillStyle = d ? `rgba(70,45,20,${0.05 + r() * 0.12})` : `rgba(255,248,230,${0.05 + r() * 0.14})`;
    c.fillRect(x, y, s, s);
  }
  c.lineCap = "round";
  for (let i = 0; i < 520 * dens; i++) { // волокна
    const x = r() * size, y = r() * size, L = 6 + r() * 26, a = r() * TAU, b = (r() - 0.5) * 0.9, d = r() < 0.55;
    c.strokeStyle = d ? `rgba(80,52,24,${0.05 + r() * 0.1})` : `rgba(255,250,236,${0.08 + r() * 0.16})`;
    c.lineWidth = 0.5 + r() * 0.9;
    c.beginPath(); c.moveTo(x, y);
    c.quadraticCurveTo(x + Math.cos(a) * L * 0.5 + Math.cos(a + 1.57) * b * L * 0.3, y + Math.sin(a) * L * 0.5 + Math.sin(a + 1.57) * b * L * 0.3, x + Math.cos(a) * L, y + Math.sin(a) * L);
    c.stroke();
  }
  return cv;
}
let FIB = null, FIB_PAT = null, GRAIN = null;
function initPaper() {
  FIB = makeFibers(512, 11, 1);
  GRAIN = makeFibers(1024, 23, 3.2);
}
function fibPattern(c) { if (!FIB_PAT || FIB_PAT._c !== c) { FIB_PAT = c.createPattern(FIB, "repeat"); FIB_PAT._c = c; } return FIB_PAT; }

// вырезанная из бумаги деталь: тень, заливка, лёгкий объём, светлый срез по краю, волокна
// fill — цвет строкой или функция (c) => fillStyle; o.lift — насколько деталь «приподнята» над фоном
function cut(c, path, fill, o = {}) {
  const lift = o.lift ?? 1, k = 1 / CAMZ;
  if (lift > 0) {
    c.save(); c.translate(5 * lift * k, 7 * lift * k); c.fillStyle = `rgba(52,30,12,${0.12 * (o.sh ?? 1)})`; c.fill(path);
    c.translate(-2.5 * lift * k, -3.5 * lift * k); c.fillStyle = `rgba(52,30,12,${0.16 * (o.sh ?? 1)})`; c.fill(path); c.restore();
  }
  c.fillStyle = typeof fill === "function" ? fill(c) : fill; c.fill(path);
  if (o.tex !== false) {
    c.save(); c.clip(path); c.globalAlpha = o.tex ?? 0.85; c.fillStyle = fibPattern(c);
    c.fillRect(-4000, -4000, 8000, 8000); c.restore();
  }
  if (o.edge !== false) { // светлый срез бумаги по краю
    c.save(); c.clip(path); c.strokeStyle = o.edgeCol ?? "rgba(255,246,225,0.55)"; c.lineWidth = (o.edgeW ?? 2.2) * k; c.stroke(path); c.restore();
  }
}
// рваная полоска / кусок бумаги: многоугольник с неровным краем
function tornRect(x, y, w, h, seed, amp = 4, step = 18) {
  const pts = [], r = mulberry32(seed);
  const edge = (x0, y0, x1, y1) => { const L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(2, Math.round(L / step));
    for (let i = 0; i < n; i++) { const u = i / n, nx = -(y1 - y0) / L, ny = (x1 - x0) / L, j = (r() - 0.5) * 2 * amp; pts.push([lerp(x0, x1, u) + nx * j, lerp(y0, y1, u) + ny * j]); } };
  edge(x, y, x + w, y); edge(x + w, y, x + w, y + h); edge(x + w, y + h, x, y + h); edge(x, y + h, x, y);
  return polyPath(pts);
}
// холмик: верхний край волной, низ — далеко вниз
function hillPath(x0, x1, y, amp, seed, step = 40, bottom = 3000) {
  const r = mulberry32(seed), pts = [[x0, bottom]];
  const ph1 = r() * TAU, ph2 = r() * TAU, f1 = 0.0021 + r() * 0.001, f2 = 0.006 + r() * 0.003;
  for (let x = x0; x <= x1 + step; x += step) pts.push([x, y - amp * (0.65 * Math.sin(x * f1 + ph1) + 0.35 * Math.sin(x * f2 + ph2)) + (r() - 0.5) * 3]);
  pts.push([x1 + step, bottom]);
  return polyPath(pts);
}
