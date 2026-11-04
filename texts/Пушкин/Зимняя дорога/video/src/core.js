// Палехская шкатулка: чёрный лак, темпера, тонкая золотая проскрипь. Всё — функция времени t.
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
function makeSpring(opts) {
  const g = Motion.spring({ ...opts, keyframes: [0, 1] });
  const pts = []; for (let i = 0; i <= 400; i++) pts.push(g.next(i * 10).value);
  return (s) => { if (s <= 0) return 0; const f = s * 100; if (f >= 400) return 1; const i = Math.floor(f); return lerp(pts[i], pts[i + 1], f - i); };
}
const springPop = makeSpring({ stiffness: 170, damping: 12, mass: 1 });
const springSoft = makeSpring({ stiffness: 90, damping: 15, mass: 1 });

// ---------- Палитра темперы ----------
const LAC = "#0b0908", SNOW = "#efe9dc", SNOW_SH = "#a9b9d0", SNOW_D = "#6f84a6", FIR = "#1d3a2b", FIR_L = "#2f5b41";
const RED = "#b3271f", RED_D = "#781812", OCHRE = "#c98f2e", ROSE = "#dc8a86", BLUE = "#2c4b88", BLUE_D = "#1a2d5a";
const WHITE = "#f4eddd", SKIN = "#e6b893", HAIR = "#4a2c1a", INK = "#15110e";
const GOLD = "#d8a743", GOLD_L = "#f7df98", GOLD_D = "#8c6420";
function goldGrad(c, x0, y0, x1, y1) {
  const g = c.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, "#8c6420"); g.addColorStop(0.28, "#f1cf78"); g.addColorStop(0.5, "#b9862c"); g.addColorStop(0.72, "#fbe6a4"); g.addColorStop(1, "#9a6d22");
  return g;
}

// ---------- Пути ----------
function poly(c, pts, close = true) { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); if (close) c.closePath(); }
function disk(c, x, y, r) { c.beginPath(); c.arc(x, y, Math.max(0.1, r), 0, TAU); }
// плавная кривая по точкам (Catmull-Rom); closed — замкнутая
function curve(c, pts, closed = false, move = true) {
  const n = pts.length, P = (i) => closed ? pts[(i + n) % n] : pts[clamp(i, 0, n - 1)];
  if (move) { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); }
  const m = closed ? n : n - 1;
  for (let i = 0; i < m; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    c.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
  }
  if (closed) c.closePath();
}
// заливка темперой и золотая обводка
function paint(c, fill, gw = 2, gold = GOLD) {
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (gw > 0) { c.strokeStyle = gold; c.lineWidth = gw; c.lineJoin = "round"; c.lineCap = "round"; c.stroke(); }
}
function gstroke(c, w = 2, col = GOLD) { c.strokeStyle = col; c.lineWidth = w; c.lineCap = "round"; c.lineJoin = "round"; c.stroke(); }
// золотая звёздочка-искра
function sparkle(c, x, y, r, a = 1, col = GOLD_L) {
  if (a <= 0 || r <= 0) return;
  c.save(); c.globalAlpha *= a; c.fillStyle = col; c.beginPath();
  c.moveTo(x, y - r); c.quadraticCurveTo(x, y, x + r * 0.32, y); c.quadraticCurveTo(x, y, x, y + r);
  c.quadraticCurveTo(x, y, x - r * 0.32, y); c.quadraticCurveTo(x, y, x, y - r); c.fill();
  c.beginPath(); c.moveTo(x - r * 0.7, y); c.quadraticCurveTo(x, y, x, y - r * 0.22); c.quadraticCurveTo(x, y, x + r * 0.7, y); c.quadraticCurveTo(x, y, x, y + r * 0.22); c.quadraticCurveTo(x, y, x - r * 0.7, y); c.fill();
  c.restore();
}
// завиток-спираль (орнамент)
function scroll(c, x, y, r, a0, dir = 1, turns = 1.4, w = 2, col = GOLD) {
  c.beginPath();
  for (let i = 0; i <= 40; i++) { const u = i / 40, a = a0 + dir * u * turns * TAU, rr = r * (1 - 0.82 * u); const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; if (i) c.lineTo(px, py); else c.moveTo(px, py); }
  gstroke(c, w, col);
}

// ---------- Частицы без состояния ----------
function particles(t, a, b, rate, emit, seed, draw) {
  const n = Math.ceil((b - a) * rate);
  for (let i = 0; i < n; i++) {
    const bt = a + i / rate, p = emit(i, bt, (k) => hash(i * 7 + k, seed)), age = t - bt;
    if (age < 0 || age > p.life) continue;
    draw(p.x + p.vx * age, p.y + p.vy * age + 0.5 * (p.g || 0) * age * age, age / p.life, p);
  }
}

// ---------- Крышка шкатулки: картина, рамка, плашка для текста ----------
const PIC = { x: 150, y: 46, w: 1620, h: 640, r: 30 };
const PANEL = { x: 430, y: 730, w: 1060, h: 270, r: 22 };
function rrect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
const picPath = (c) => rrect(c, PIC.x, PIC.y, PIC.w, PIC.h, PIC.r);
const BG = mkCanvas(W, H);
{
  const c = BG.getContext("2d");
  const g = c.createRadialGradient(900, 380, 100, 960, 540, 1250); g.addColorStop(0, "#1b1512"); g.addColorStop(1, "#050403");
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  // блик лака
  const s = c.createLinearGradient(0, 0, W, H); s.addColorStop(0.3, "rgba(255,240,220,0)"); s.addColorStop(0.42, "rgba(255,240,220,0.035)"); s.addColorStop(0.5, "rgba(255,240,220,0)");
  c.fillStyle = s; c.fillRect(0, 0, W, H);
}
// орнамент рамки: двойная золотая линия, бусины и листики по периметру; u — насколько прорисована
function frameOrn(c, x, y, w, h, r, u = 1, beads = 1, gap = 14) {
  if (u <= 0) return;
  c.save();
  const per = 2 * (w + h);
  for (const [d, lw] of [[-gap, 3], [0, 1.6]]) {
    rrect(c, x + d, y + d, w - 2 * d, h - 2 * d, r - d * 0.6);
    c.setLineDash(u >= 1 ? [] : [(per + 16 * gap) * u, per * 3]); c.strokeStyle = goldGrad(c, x, y, x + w, y + h); c.lineWidth = lw; c.stroke();
  }
  c.setLineDash([]);
  if (beads) {
    const step = 34, n = Math.floor(per / step);
    for (let i = 0; i < n * u; i++) {
      const s = i * step; let px, py;
      if (s < w) { px = x + s; py = y - gap / 2; } else if (s < w + h) { px = x + w + gap / 2; py = y + s - w; } else if (s < 2 * w + h) { px = x + w - (s - w - h); py = y + h + gap / 2; } else { px = x - gap / 2; py = y + h - (s - 2 * w - h); }
      if ((px < x + r && py < y + r) || (px > x + w - r && py < y + r) || (px < x + r && py > y + h - r) || (px > x + w - r && py > y + h - r)) continue;
      c.fillStyle = i % 2 ? GOLD : GOLD_L; disk(c, px, py, i % 2 ? 2.2 : 3.2); c.fill();
    }
  }
  c.restore();
}
function cornerFlourish(c, x, y, sx, sy, u = 1) {
  if (u <= 0) return;
  c.save(); c.translate(x, y); c.scale(sx, sy); c.globalAlpha *= u;
  scroll(c, 34, 34, 22, Math.PI, 1, 1.2, 2.4); scroll(c, 70, 18, 12, Math.PI, -1, 1.1, 1.8); scroll(c, 18, 70, 12, -Math.PI / 2, 1, 1.1, 1.8);
  c.fillStyle = GOLD_L; disk(c, 34, 34, 4); c.fill();
  c.restore();
}
function drawFrame(c, t) {
  const u = sstep(prog(t, -0.4, 1.6));
  frameOrn(c, PIC.x, PIC.y, PIC.w, PIC.h, PIC.r, u, 1, 14);
  const k = sstep(prog(t, 1.2, 2.0));
  for (const [x, y, sx, sy] of [[PIC.x - 30, PIC.y - 30, 1, 1], [PIC.x + PIC.w + 30, PIC.y - 30, -1, 1], [PIC.x - 30, PIC.y + PIC.h + 30, 1, -1], [PIC.x + PIC.w + 30, PIC.y + PIC.h + 30, -1, -1]]) cornerFlourish(c, x, y, sx, sy, k);
  const p = sstep(prog(t, EV.sw0a, EV.sw0b));
  if (p > 0) {
    c.save(); c.globalAlpha = p; c.fillStyle = "rgba(4,3,3,0.55)"; rrect(c, PANEL.x, PANEL.y, PANEL.w, PANEL.h, PANEL.r); c.fill(); c.restore();
    frameOrn(c, PANEL.x, PANEL.y, PANEL.w, PANEL.h, PANEL.r, p, 0, 9);
    c.save(); c.globalAlpha = p;
    for (const s of [-1, 1]) { const cx = 960 + s * (PANEL.w / 2 + 34), cy = PANEL.y + PANEL.h / 2; scroll(c, cx, cy - 26, 20, s > 0 ? Math.PI : 0, s, 1.25, 2.2); scroll(c, cx, cy + 26, 20, s > 0 ? Math.PI : 0, -s, 1.25, 2.2); c.fillStyle = GOLD_L; disk(c, cx, cy, 4); c.fill(); }
    c.restore();
  }
}

// ---------- Строки стиха золотом ----------
const FONT = (px, w = 700) => `${w} ${px}px "Doroga", serif`;
const TXT = { size: 46, base: [796, 852, 908, 964] };
let LAYOUT = null;
function layoutText(c) {
  c.font = FONT(TXT.size);
  const sp = c.measureText(" ").width;
  LAYOUT = CFG.lines.map((l) => {
    const ws = l.words.map((w) => ({ ...w, wd: c.measureText(w.text).width }));
    const tot = ws.reduce((s, w) => s + w.wd, 0) + sp * (ws.length - 1);
    let x = 960 - tot / 2;
    for (const w of ws) { w.x = x; x += w.wd + sp; }
    return { ...l, y: TXT.base[(l.n - 1) % 4], ws };
  });
}
// слово пишется золотом слева направо, впереди светлое перо; строфа рассыпается золотой пылью
function goldText(c, t) {
  if (!LAYOUT) layoutText(c);
  c.save(); c.font = FONT(TXT.size); c.textBaseline = "alphabetic";
  for (const l of LAYOUT) {
    const st = Math.floor((l.n - 1) / 4) + 1, out0 = EV[`tx${st}`], out1 = out0 + 0.62;
    if (t < l.ws[0].at - 0.05 || t >= out1) continue;
    for (const w of l.ws) {
      const a = t - w.at; if (a < 0) continue;
      const u = sstep(a / Math.min(0.42, Math.max(0.2, w.dur)));
      const sw = t > out0 ? sstep(((t - out0) / 0.45) * 1.5 - (w.x - 400) / 1100) : 0;
      if (sw >= 1) continue;
      const X = w.x - 4 + (w.wd + 8) * u;
      c.save(); c.globalAlpha = 1 - sw;
      c.beginPath(); c.rect(w.x - 6, l.y - 52, X - w.x + 6, 72); c.clip();
      c.fillStyle = w.key ? GOLD_L : goldGrad(c, 0, l.y - 36, 0, l.y + 8);
      c.fillText(w.text, w.x, l.y);
      c.restore();
      if (u < 1) { c.save(); c.beginPath(); c.rect(X - 18, l.y - 52, 18, 72); c.clip(); c.fillStyle = "#fff6d6"; c.fillText(w.text, w.x, l.y); c.restore(); sparkle(c, X, l.y - 18, 9, 1 - u); }
      if (sw > 0) for (let k = 0; k < 6; k++) { const r = hash(k, l.n * 50 + w.x | 0); sparkle(c, w.x + w.wd * r, l.y - 16 - 50 * sw * (0.5 + hash(k, 3)), 4 + 3 * r, (1 - sw) * 0.9); }
    }
  }
  c.restore();
}

// Смена картины: золотая кромка идёт слева направо, слева уже новая картина
function sweep(c, t, a, b, drawA, drawB, seed = 3) {
  if (t < a) return drawA(c, t);
  if (t >= b) return drawB(c, t);
  const u = sstep(prog(t, a, b)), X = lerp(PIC.x - 120, PIC.x + PIC.w + 120, u);
  const fx = (y) => X + 46 * Math.sin((y - PIC.y) * 0.008 + seed) + 18 * Math.sin(y * 0.021 + seed * 2.1);
  drawA(c, t);
  c.save(); c.beginPath(); c.moveTo(PIC.x - 200, PIC.y - 10);
  for (let y = PIC.y - 10; y <= PIC.y + PIC.h + 10; y += 12) c.lineTo(fx(y), y);
  c.lineTo(PIC.x - 200, PIC.y + PIC.h + 10); c.closePath(); c.clip();
  drawB(c, t); c.restore();
  // кромка: широкое золотое свечение и тонкая яркая линия
  const edge = () => { c.beginPath(); for (let y = PIC.y - 10; y <= PIC.y + PIC.h + 10; y += 12) { const x = fx(y); if (y === PIC.y - 10) c.moveTo(x, y); else c.lineTo(x, y); } };
  c.save(); edge(); c.strokeStyle = "rgba(240,200,110,0.28)"; c.lineWidth = 22; c.stroke(); edge(); c.strokeStyle = GOLD; c.lineWidth = 5; c.stroke(); edge(); c.strokeStyle = "#fff3c4"; c.lineWidth = 1.6; c.stroke(); c.restore();
  particles(t, a, b, 70, (i, bt, r) => { const yy = lerp(PIC.y, PIC.y + PIC.h, r(1)); return { x: fx(yy) + 6, y: yy, vx: 60 + 160 * r(2), vy: -30 + 60 * r(3), life: 0.5 + 0.4 * r(4), s: 5 + 6 * r(5) }; }, seed,
    (x, y, k, p) => sparkle(c, x, y, p.s * (1 - k * 0.6), 1 - k));
}
