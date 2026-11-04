// Песочный стол: маска песка рисуется в полразмера, затем один попиксельный проход
// превращает её в тёмный зернистый песок на подсвеченном стекле. Всё — функция времени t.
const W = 1920, H = 1080, TOTAL = CFG.total, EV = CFG.ev, TAU = Math.PI * 2;

function mulberry32(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const hash = (i, j = 0) => { let h = Math.imul(i, 374761393) + Math.imul(j, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, u) => a + (b - a) * u;
const sstep = (u) => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
const prog = (t, a, b) => clamp((t - a) / Math.max(1e-6, b - a), 0, 1);
const bump = (t, a, b, f = 0.25) => sstep(prog(t, a, a + f)) * (1 - sstep(prog(t, b - f, b)));
const mkCanvas = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
// пружины Framer Motion как функции времени: 0 → 1 с перелётом
function makeSpring(opts) {
  const g = Motion.spring({ ...opts, keyframes: [0, 1] });
  const pts = []; for (let i = 0; i <= 400; i++) pts.push(g.next(i * 10).value);
  return (s) => { if (s <= 0) return 0; const f = s * 100; if (f >= 400) return 1; const i = Math.floor(f); return lerp(pts[i], pts[i + 1], f - i); };
}
const springPop = makeSpring({ stiffness: 170, damping: 12, mass: 1 });
const springSoft = makeSpring({ stiffness: 90, damping: 15, mass: 1 });

// ---------- Песок и вычитание ----------
const sand = (c, a = 0.95) => { c.globalCompositeOperation = "source-over"; c.fillStyle = c.strokeStyle = `rgba(0,0,0,${a})`; };
const carve = (c, a = 1) => { c.globalCompositeOperation = "destination-out"; c.fillStyle = c.strokeStyle = `rgba(0,0,0,${a})`; };
function poly(c, pts, close = true) { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); if (close) c.closePath(); }
function disk(c, x, y, r) { c.beginPath(); c.arc(x, y, Math.max(0.1, r), 0, TAU); c.fill(); }
// мягкое пятно: радиальный градиент чёрного (для песка) — режим берётся из текущего composite
function blob(c, x, y, r, a) {
  const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(1, "rgba(0,0,0,0)");
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
}
// плавная кривая по точкам (Catmull-Rom)
function curve(c, pts) {
  c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    c.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
  }
}

// ---------- Холсты ----------
const view = document.getElementById("scene"), vctx = view.getContext("2d");
const MH = mkCanvas(W / 2, H / 2), mh = MH.getContext("2d");
const MF = mkCanvas(W, H), mf = MF.getContext("2d", { willReadFrequently: true });
const OUT = vctx.createImageData(W, H);

// ---------- Свет стола и зерно (считаются один раз) ----------
function makeLamp(c0, c1, hot) {
  const a = new Uint8ClampedArray(W * H * 3);
  for (let y = 0, q = 0; y < H; y++) for (let x = 0; x < W; x++, q += 3) {
    const dx = (x - 960) / 1250, dy = (y - 500) / 900, r = Math.sqrt(dx * dx + dy * dy);
    const u = Math.pow(sstep(r), 1.25), h = Math.exp(-((x - 900) ** 2 + (y - 360) ** 2) / 3.2e5) * hot;
    for (let k = 0; k < 3; k++) a[q + k] = lerp(c0[k], c1[k], u) + h;
  }
  return a;
}
const LAMP_C = makeLamp([228, 237, 247], [128, 146, 174], 10);   // лунный холодный
const LAMP_W = makeLamp([255, 228, 176], [176, 108, 52], 14);    // янтарный, у камина
const SANDC = [27, 19, 13];
const G = new Int16Array(W * H), STRAY = new Uint8Array(W * H);
{
  // зерно: мелкое по пикселю + комочки по 3 px + пятна по 14 px
  const r = mulberry32(7), vn = (sc) => { const cw = Math.ceil(W / sc) + 2, a = new Float32Array(cw * (Math.ceil(H / sc) + 2)); for (let i = 0; i < a.length; i++) a[i] = r(); return { sc, cw, a }; };
  const N3 = vn(2.6), N14 = vn(14);
  const smp = (N, x, y) => { const cx = x / N.sc, cy = y / N.sc, x0 = cx | 0, y0 = cy | 0, fx = cx - x0, fy = cy - y0, k = y0 * N.cw + x0, a = N.a;
    return lerp(lerp(a[k], a[k + 1], fx), lerp(a[k + N.cw], a[k + N.cw + 1], fx), fy); };
  for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i++) {
    G[i] = Math.round((0.34 * r() + 0.46 * smp(N3, x, y) + 0.2 * smp(N14, x, y) - 0.5) * 256);
    STRAY[i] = r() < 0.0016 ? 1 : 0;
  }
}

// Попиксельно: плотность песка D → непрозрачность с зерном, сильнее всего на краях и в тонком слое
function composite(warm) {
  const src = mf.getImageData(0, 0, W, H).data, out = OUT.data, n = W * H, wc = clamp(warm, 0, 1), cc = 1 - wc;
  const sr = SANDC[0], sg = SANDC[1], sb = SANDC[2], GK = 3.4 / 256;
  for (let i = 0, p = 0, q = 0; i < n; i++, p += 4, q += 3) {
    const A = src[p + 3];
    let op;
    if (A < 2) op = STRAY[i] ? 0.6 : 0;
    else { const D = A / 255; op = D * 1.04 + G[i] * GK * D * (1 - D); op = op < 0 ? 0 : op > 1 ? 1 : op; }
    const lr = LAMP_C[q] * cc + LAMP_W[q] * wc, lg = LAMP_C[q + 1] * cc + LAMP_W[q + 1] * wc, lb = LAMP_C[q + 2] * cc + LAMP_W[q + 2] * wc;
    out[p] = lr + (sr - lr) * op; out[p + 1] = lg + (sg - lg) * op; out[p + 2] = lb + (sb - lb) * op; out[p + 3] = 255;
  }
  vctx.putImageData(OUT, 0, 0);
}

// ---------- Частицы без состояния: позиция — функция возраста ----------
// emit(i) → {x, y, vx, vy, g, life, s}; рисует песчинки, родившиеся в [a, b)
function grains(c, t, a, b, rate, emit, seed = 1) {
  const n = Math.ceil((b - a) * rate);
  for (let i = 0; i < n; i++) {
    const bt = a + i / rate, p = emit(i, bt, (k) => hash(i * 7 + k, seed)), age = t - bt;
    if (age < 0 || age > p.life) continue;
    const x = p.x + p.vx * age, y = p.y + p.vy * age + 0.5 * p.g * age * age, s = p.s || 3;
    c.fillRect(x - s / 2, y - s / 2, s, s);
  }
}

// ---------- Строки стиха, процарапанные в полосе песка ----------
const FONT = (px, w = 700) => `${w} ${px}px "Doroga", serif`;
const TXT = { size: 49, base: [788, 846, 904, 962] };
let LAYOUT = null;
function layoutText() {
  mf.font = FONT(TXT.size);
  const sp = mf.measureText(" ").width;
  LAYOUT = CFG.lines.map((l, k) => {
    const ws = l.words.map((w) => ({ ...w, wd: mf.measureText(w.text).width }));
    const tot = ws.reduce((s, w) => s + w.wd, 0) + sp * (ws.length - 1);
    let x = 960 - tot / 2;
    for (const w of ws) { w.x = x; x += w.wd + sp; }
    return { ...l, y: TXT.base[(l.n - 1) % 4], ws };
  });
}
// Каждое слово процарапывается пальцем слева направо, начиная чуть раньше голоса
function carveText(c, t) {
  if (!LAYOUT) layoutText();
  c.save(); c.font = FONT(TXT.size); c.textBaseline = "alphabetic";
  for (const l of LAYOUT) {
    const st = Math.floor((l.n - 1) / 4) + 1, out0 = EV[`tx${st}`], out1 = out0 + 0.62;
    if (t < l.ws[0].at - 0.05 || t >= out1) continue;
    for (const w of l.ws) {
      const a = t - w.at; if (a < 0) continue;
      const u = sstep(a / Math.min(0.42, Math.max(0.2, w.dur)));
      // смахивание строфы: волна слева направо
      const sw = t > out0 ? sstep(((t - out0) / 0.45) * 1.5 - (w.x - 400) / 1100) : 0;
      if (sw >= 1) continue;
      c.save(); c.beginPath(); c.rect(w.x - 6, l.y - 60, (w.wd + 12) * u, 84); c.clip();
      carve(c, (w.key ? 1 : 0.94) * (1 - sw)); c.fillText(w.text, w.x, l.y);
      if (w.key) { carve(c, 0.22 * (1 - sw)); c.lineWidth = 7; c.lineJoin = "round"; c.strokeText(w.text, w.x, l.y); }
      c.restore();
    }
  }
  c.restore();
}

// Полоса густого песка под текстом, верхний край волнистый
const BAND_Y = 724;
function band(c, t, a = 0.93) {
  sand(c, a); c.beginPath(); c.moveTo(-10, H + 10);
  for (let x = -10; x <= W + 10; x += 20) c.lineTo(x, BAND_Y + 7 * Math.sin(x * 0.006 + 1.3) + 4 * Math.sin(x * 0.021));
  c.lineTo(W + 10, H + 10); c.closePath(); c.fill();
  // мягкий переход в землю
  const g = c.createLinearGradient(0, BAND_Y - 26, 0, BAND_Y + 4); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, `rgba(0,0,0,${a * 0.5})`);
  c.fillStyle = g; c.fillRect(0, BAND_Y - 26, W, 32);
}

// Смахивание ладонью: слева направо открывается сцена B, на фронте валик песка и брызги песчинок
function sweep(c, t, a, b, drawA, drawB, y0 = -20, y1 = H + 20, seed = 3) {
  if (t < a) return drawA(c, t);
  if (t >= b) return drawB(c, t);
  const u = sstep(prog(t, a, b)), X = lerp(-260, W + 260, u);
  const fx = (y) => X + 70 * Math.sin(y * 0.0105 + seed) + 34 * Math.sin(y * 0.031 + seed * 2.1);
  drawA(c, t);
  c.save(); c.beginPath(); c.moveTo(-20, y0);
  for (let y = y0; y <= y1; y += 16) c.lineTo(fx(y), y);
  c.lineTo(-20, y1); c.closePath(); c.clip();
  c.globalCompositeOperation = "source-over"; c.clearRect(-20, y0, W + 40, y1 - y0);
  drawB(c, t); c.restore();
  // валик на фронте
  sand(c, 0.42); c.lineWidth = 34; c.lineCap = "round"; c.beginPath();
  for (let y = y0; y <= y1; y += 16) { const x = fx(y) + 30; if (y === y0) c.moveTo(x, y); else c.lineTo(x, y); }
  c.stroke();
  sand(c, 0.8);
  grains(c, t, a, b, 900, (i, bt, r) => { const yy = lerp(y0, y1, r(1)); return { x: fx(yy) + 40, y: yy, vx: 160 + 340 * r(2), vy: -60 + 120 * r(3), g: 80, life: 0.5 + 0.4 * r(4), s: 2 + 3 * r(5) }; }, seed);
}
