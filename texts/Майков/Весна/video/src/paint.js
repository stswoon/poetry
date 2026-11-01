// Кисть гжельского мастера: один мазок идёт от густого кобальта к прозрачному голубому.
const W = 1920, H = 1080, TOTAL = CFG.total, EV = CFG.ev, TAU = Math.PI * 2;

function mulberry32(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, u) => a + (b - a) * u;
const sstep = (u) => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
const prog = (t, a, b) => clamp((t - a) / Math.max(1e-6, b - a), 0, 1);
const mkCanvas = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
// пружины Framer Motion как функции времени: 0 → 1 с перелётом
function makeSpring(opts) {
  const g = Motion.spring({ ...opts, keyframes: [0, 1] });
  const pts = []; for (let i = 0; i <= 400; i++) pts.push(g.next(i * 10).value);
  return (s) => { if (s <= 0) return 0; const f = s * 100; if (f >= 400) return 1; const i = Math.floor(f); return lerp(pts[i], pts[i + 1], f - i); };
}
const springPop = makeSpring({ stiffness: 170, damping: 12, mass: 1 });
const springLand = makeSpring({ stiffness: 95, damping: 10, mass: 1 });
const springSoft = makeSpring({ stiffness: 120, damping: 16, mass: 1 });

const COB = "#0f2e8a", MID = "#2a5fcb", SKY = "#7ea6ee", PALE = "#d4e3fc", WHITE = "#fdfeff", GOLD = "#e0ab22", GOLDD = "#9a6a00";
const PAL = { d: COB, m: MID, l: PALE };
const PAL_SKY = { d: MID, m: SKY, l: "#e6effe" };
const PAL_W = { d: "#ffffff", m: "#dbe7ff", l: "rgba(170,198,250,.55)" };
const PAL_GOLD = { d: GOLDD, m: GOLD, l: "#f8e4a2" };

// Мазок с тенью: хвост в (x,y), толстая голова к концу, поперёк — от густого к прозрачному. u — насколько кисть прошла.
function gs(c, x, y, len, w, ang, u = 1, bend = 0, side = 1, pal = PAL) {
  if (u <= 0) return;
  const n = 14, L = len * u, wid = w * (0.45 + 0.55 * u);
  c.save(); c.translate(x, y); c.rotate(ang);
  const prof = (s) => wid / 2 * Math.pow(Math.sin(Math.PI * Math.pow(s, 1.5)), 0.8);
  c.beginPath();
  for (let i = 0; i <= n; i++) { const s = i / n, cx = s * L, cy = bend * L * Math.sin(Math.PI * s) - prof(s); if (i === 0) c.moveTo(cx, cy); else c.lineTo(cx, cy); }
  for (let i = n; i >= 0; i--) { const s = i / n; c.lineTo(s * L, bend * L * Math.sin(Math.PI * s) + prof(s)); }
  c.closePath();
  const off = bend * L, g = c.createLinearGradient(0, off - wid / 2 * side, 0, off + wid / 2 * side);
  g.addColorStop(0, pal.d); g.addColorStop(0.42, pal.m); g.addColorStop(1, pal.l);
  c.fillStyle = g; c.fill();
  c.restore();
}
// Лепесток-скобка: дуга, сужена на концах; у внутреннего края густо, у внешнего прозрачно.
function ga(c, x, y, r, a0, a1, w, u = 1, pal = PAL) {
  if (u <= 0) return;
  const n = 18, ae = a0 + (a1 - a0) * u;
  c.beginPath();
  for (let i = 0; i <= n; i++) { const s = i / n, a = lerp(a0, ae, s), h = w / 2 * Math.pow(Math.sin(Math.PI * s), 0.7), rr = r + h, px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; if (i === 0) c.moveTo(px, py); else c.lineTo(px, py); }
  for (let i = n; i >= 0; i--) { const s = i / n, a = lerp(a0, ae, s), h = w / 2 * Math.pow(Math.sin(Math.PI * s), 0.7), rr = r - h; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  c.closePath();
  const g = c.createRadialGradient(x, y, Math.max(0.1, r - w / 2), x, y, r + w / 2);
  g.addColorStop(0, pal.d); g.addColorStop(0.5, pal.m); g.addColorStop(1, pal.l);
  c.fillStyle = g; c.fill();
}
const dot = (c, x, y, r, col) => { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = col; c.fill(); };
function dab(c, x, y, r, a, b) {
  if (r <= 0) return;
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, b); g.addColorStop(1, a);
  c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = g; c.fill();
}
// Завиток: две скобки и точка
function curl(c, x, y, r, a0, dir, u = 1, pal = PAL) {
  if (u <= 0) return;
  ga(c, x, y, r, a0, a0 + dir * 3.4, r * 0.34, u, pal);
  ga(c, x + Math.cos(a0 + dir * 3.4) * r * 0.45, y + Math.sin(a0 + dir * 3.4) * r * 0.45, r * 0.5, a0 + dir * 3.4, a0 + dir * 6.2, r * 0.22, sstep(prog(u, 0.5, 1)), pal);
}

// Гжельская роза: кольца мазков от края к середине
function rose(c, f, t) {
  const a = t - f.t; if (a < 0) return;
  const k = springPop(a * 1.2), r = f.r; if (k <= 0.001) return;
  const u1 = sstep(prog(a, 0, 0.34)), u2 = sstep(prog(a, 0.14, 0.5)), u3 = sstep(prog(a, 0.3, 0.66)), u4 = sstep(prog(a, 0.42, 0.78));
  const s = f.x * 0.013 + f.y * 0.007;
  c.save(); c.translate(f.x, f.y); c.rotate((f.rot || 0) + 0.03 * Math.sin(t * 0.9 + s)); c.scale(k, k);
  dot(c, 0, 0, r * 0.72, "#c9dbfa");
  for (let i = 0; i < 6; i++) { const b = i / 6 * TAU + 0.2; ga(c, 0, 0, r * 0.76, b - 0.62, b + 0.62, r * 0.46, u1); }
  for (let i = 0; i < 5; i++) { const b = i / 5 * TAU + 0.8; ga(c, 0, 0, r * 0.5, b - 0.76, b + 0.76, r * 0.38, u2); }
  dot(c, 0, 0, r * 0.36 * u3, "#a9c6f6");
  for (let i = 0; i < 4; i++) { const b = i / 4 * TAU + 0.4; ga(c, 0, 0, r * 0.27, b - 0.86, b + 0.86, r * 0.26, u3, { d: COB, m: MID, l: SKY }); }
  dab(c, 0, 0, r * 0.16 * u4, COB, MID);
  if (u4 > 0) for (let i = 0; i < 12; i++) { const b = i / 12 * TAU + 0.1; dot(c, Math.cos(b) * r * 1.05, Math.sin(b) * r * 1.05, r * 0.045 * u4, COB); }
  c.restore();
}
// Лист: мазок с жилкой
function leaf(c, x, y, len, w, ang, t, t0, bend = 0.08, pal = PAL) {
  const a = t - t0; if (a < 0) return;
  const u = springSoft(a * 1.6);
  gs(c, x, y, len, w, ang, u, bend, bend >= 0 ? 1 : -1, pal);
  gs(c, x, y, len * 0.86, w * 0.1, ang, sstep(prog(a, 0.2, 0.55)), bend * 1.2, 1, { d: COB, m: COB, l: COB });
}

// ---------- Блюдо ----------
const D = { x: 960, y: 540, rx: 900, ry: 515 }, IN = { rx: 832, ry: 452 };
const inPath = (c, ins = 0) => { c.beginPath(); c.ellipse(D.x, D.y, IN.rx - ins, IN.ry - ins, 0, 0, TAU); };
const bgC = mkCanvas(W, H);
{
  const c = bgC.getContext("2d"), r = mulberry32(1857);
  const g = c.createRadialGradient(W / 2, H / 2, 300, W / 2, H / 2, 1200); g.addColorStop(0, "#2a56bc"); g.addColorStop(1, "#0c2470");
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  // разводы глазури
  for (let i = 0; i < 90; i++) { const x = r() * W, y = r() * H; c.beginPath(); c.ellipse(x, y, 90 + r() * 240, 16 + r() * 40, r() * 0.5 - 0.25, 0, TAU); c.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "4,16,70"},${0.012 + r() * 0.022})`; c.fill(); }
  // белые цветы по углам
  for (const [x, y, a0] of [[92, 92, 0.78], [1828, 92, 2.36], [92, 988, -0.78], [1828, 988, -2.36]]) {
    for (const d of [-1.05, -0.52, 0, 0.52, 1.05]) gs(c, x + Math.cos(a0 + d) * 16, y + Math.sin(a0 + d) * 16, 150 - Math.abs(d) * 44, 46, a0 + d, 1, 0, 1, PAL_W);
    dab(c, x, y, 26, "#ffffff", "#dbe7ff"); dot(c, x, y, 9, MID);
  }
  // тень и тело блюда
  c.save(); c.shadowColor = "rgba(3,10,50,.62)"; c.shadowBlur = 42; c.shadowOffsetY = 16;
  c.beginPath(); c.ellipse(D.x, D.y, D.rx, D.ry, 0, 0, TAU); c.fillStyle = "#f2f6ff"; c.fill(); c.restore();
  c.save(); c.translate(D.x, D.y); c.scale(1, D.ry / D.rx);
  const b = c.createRadialGradient(-180, -260, 80, 0, 0, D.rx);
  b.addColorStop(0, "#ffffff"); b.addColorStop(0.72, "#fbfcff"); b.addColorStop(0.9, "#e8eefb"); b.addColorStop(0.93, "#d5dff3"); b.addColorStop(0.96, "#f7f9ff"); b.addColorStop(1, "#dfe7f7");
  c.fillStyle = b; c.beginPath(); c.arc(0, 0, D.rx, 0, TAU); c.fill(); c.restore();
}
// Кант и бордюр из мазков: готовый слой, показывается кистью по кругу
const rimC = mkCanvas(W, H);
{
  const c = rimC.getContext("2d");
  c.lineWidth = 12; c.strokeStyle = COB; c.beginPath(); c.ellipse(D.x, D.y, D.rx - 9, D.ry - 9, 0, 0, TAU); c.stroke();
  c.lineWidth = 5; c.beginPath(); c.ellipse(D.x, D.y, IN.rx + 2, IN.ry + 2, 0, 0, TAU); c.stroke();
  const n = 84, mx = (D.rx + IN.rx) / 2 - 22, my = (D.ry + IN.ry) / 2 - 18;
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU, x = D.x + Math.cos(a) * mx, y = D.y + Math.sin(a) * my, tan = Math.atan2(my * Math.cos(a), -mx * Math.sin(a));
    gs(c, x, y, 58, 26, tan + 0.34, 1, 0.05, 1, i % 2 ? PAL : PAL_SKY);
    if (i % 2 === 0) dot(c, D.x + Math.cos(a) * (D.rx - 22), D.y + Math.sin(a) * (D.ry - 22), 5, MID);
  }
}
const ELL_LEN = (a, b) => Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
function drawRim(c, t) {
  const u = clamp(0.2 + t / 1.5, 0, 1);
  if (u >= 1) { c.drawImage(rimC, 0, 0); return; }
  c.save(); c.beginPath(); c.moveTo(D.x, D.y);
  const a0 = -Math.PI / 2, a1 = a0 + TAU * u;
  for (let i = 0; i <= 80; i++) { const a = lerp(a0, a1, i / 80); c.lineTo(D.x + Math.cos(a) * 1300, D.y + Math.sin(a) * 1300); }
  c.closePath(); c.clip(); c.drawImage(rimC, 0, 0); c.restore();
}
// Блик глазури поверх росписи
const glossC = mkCanvas(W, H);
{
  const c = glossC.getContext("2d");
  c.save(); c.translate(430, 150); c.rotate(-0.42); c.scale(1, 0.16);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, 340); g.addColorStop(0, "rgba(255,255,255,.5)"); g.addColorStop(1, "rgba(255,255,255,0)");
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, 340, 0, TAU); c.fill(); c.restore();
}

// ---------- Клеймо под текст ----------
const CA = { x: 1350, y: 540, rx: 400, ry: 275 };
const cartC = mkCanvas(W, H);
{
  const c = cartC.getContext("2d");
  c.save(); c.shadowColor = "rgba(20,50,140,.2)"; c.shadowBlur = 16; c.shadowOffsetY = 4;
  c.beginPath(); c.ellipse(CA.x, CA.y, CA.rx, CA.ry, 0, 0, TAU); c.fillStyle = "#ffffff"; c.fill(); c.restore();
  c.lineWidth = 7; c.strokeStyle = COB; c.stroke();
  c.lineWidth = 2.5; c.beginPath(); c.ellipse(CA.x, CA.y, CA.rx - 14, CA.ry - 14, 0, 0, TAU); c.stroke();
  const n = 56;
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU, x = CA.x + Math.cos(a) * (CA.rx + 6), y = CA.y + Math.sin(a) * (CA.ry + 6), tan = Math.atan2(CA.ry * Math.cos(a), -CA.rx * Math.sin(a));
    if (Math.abs(Math.sin(a)) > 0.97) continue;
    gs(c, x, y, 34, 15, tan + 0.5, 1, 0.05, 1, i % 2 ? PAL : PAL_SKY);
  }
  for (const [yy, dir] of [[CA.y - CA.ry + 6, 1], [CA.y + CA.ry - 6, -1]]) {
    for (const s of [-1, 1]) { gs(c, CA.x + s * 26, yy, 104, 26, s > 0 ? 0.13 * dir : Math.PI - 0.13 * dir, 1, s * dir * 0.08, s * dir); gs(c, CA.x + s * 124, yy + dir * 15, 42, 15, s > 0 ? 0.6 * dir : Math.PI - 0.6 * dir, 1, 0, s * dir, PAL_SKY); }
    rose(c, { x: CA.x, y: yy, r: 32, t: -5 }, 0);
  }
}
const CA_TEXT = [CA.x - 345, CA.y - 200, CA.x + 345, CA.y + 200];

// Кисть с деревянной ручкой
function brush(c, x, y, s, ang) {
  c.save(); c.translate(x, y); c.rotate(ang); c.scale(s, s);
  const hg = c.createLinearGradient(0, -7, 0, 7); hg.addColorStop(0, "#c98a52"); hg.addColorStop(1, "#7b4a22");
  c.beginPath(); c.moveTo(60, -7); c.lineTo(330, -4); c.lineTo(330, 4); c.lineTo(60, 7); c.closePath(); c.fillStyle = hg; c.fill();
  c.beginPath(); c.rect(30, -9, 34, 18); c.fillStyle = "#b9c0cb"; c.fill();
  c.beginPath(); c.moveTo(32, -8); c.bezierCurveTo(8, -9, 0, -3, -14, 0); c.bezierCurveTo(0, 3, 8, 9, 32, 8); c.closePath(); c.fillStyle = COB; c.fill();
  c.restore();
}
