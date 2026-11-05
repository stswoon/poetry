// Школьный гербарий: парта, бумага альбома, скотч и засушенные растения. Всё рисуется кодом.
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
const springSoft = makeSpring({ stiffness: 120, damping: 16, mass: 1 });

// ---------- Цвета: [r, g, b] ----------
const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const mixc = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
const css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const K = {
  green: hex("#5d8d36"), greenD: hex("#3b6324"), greenL: hex("#8db454"), winter: hex("#3fae38"), winterL: hex("#7fdc5a"),
  yellow: hex("#e2b234"), ochre: hex("#c99a3a"), orange: hex("#d9772a"), red: hex("#b5412a"), rust: hex("#9a4a22"),
  brown: hex("#7a5132"), brownL: hex("#a87a4e"), straw: hex("#cdb06a"), strawD: hex("#a88a48"),
  white: hex("#fbf8ee"), beige: hex("#cdb68c"), blue: hex("#3c62c4"), blueDry: hex("#7d6f86"),
  ink: hex("#3b2414"), pencil: hex("#5a5550"), grey: hex("#8d9098"), stream: hex("#4f86c6"),
};

// ---------- Парта (статичная) ----------
const deskC = mkCanvas(W, H);
{
  const c = deskC.getContext("2d"), r = mulberry32(11);
  c.fillStyle = "#6f4a2c"; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 300; i++) {
    const y = r() * H, light = r() > 0.55;
    c.strokeStyle = light ? `rgba(170,120,75,${0.05 + r() * 0.09})` : `rgba(35,18,8,${0.06 + r() * 0.1})`;
    c.lineWidth = 1 + r() * 3.5; c.beginPath();
    for (let x = -20; x <= W + 40; x += 40) { const yy = y + 7 * Math.sin(x * 0.0035 + i) + 3 * Math.sin(x * 0.012 + i * 2.1); if (x < 0) c.moveTo(x, yy); else c.lineTo(x, yy); }
    c.stroke();
  }
  for (const y of [268, 742]) { c.fillStyle = "rgba(25,12,4,0.45)"; c.fillRect(0, y, W, 3); c.fillStyle = "rgba(190,140,90,0.18)"; c.fillRect(0, y + 3, W, 2); }
  // карандаш и опавшие листья на парте (видны, пока альбом закрыт)
  c.save(); c.translate(1640, 700); c.rotate(-0.55);
  c.shadowColor = "rgba(0,0,0,0.35)"; c.shadowBlur = 10; c.shadowOffsetY = 6;
  c.fillStyle = "#e3b23c"; c.fillRect(-170, -11, 300, 22); c.shadowColor = "transparent";
  c.fillStyle = "#c79422"; c.fillRect(-170, 3, 300, 8); c.fillStyle = "#f2cf6a"; c.fillRect(-170, -11, 300, 5);
  c.fillStyle = "#b8b2a8"; c.fillRect(130, -11, 26, 22); c.fillStyle = "#d76e78"; c.beginPath(); c.roundRect(156, -11, 26, 22, 5); c.fill();
  c.fillStyle = "#e8c9a0"; c.beginPath(); c.moveTo(-170, -11); c.lineTo(-218, 0); c.lineTo(-170, 11); c.closePath(); c.fill();
  c.fillStyle = "#3a3632"; c.beginPath(); c.moveTo(-204, -3.5); c.lineTo(-218, 0); c.lineTo(-204, 3.5); c.closePath(); c.fill();
  c.restore();
  const g = c.createRadialGradient(W / 2, H / 2, 280, W / 2, H / 2, 1150); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(15,6,0,0.5)");
  c.fillStyle = g; c.fillRect(0, 0, W, H);
}

// ---------- Страница альбома ----------
const PW = 840, PH = 920, SX = 960, PY = 80; // ширина и высота страницы, корешок, верх страницы
function paperBase(seed, side) {
  const cv = mkCanvas(PW, PH), c = cv.getContext("2d"), r = mulberry32(seed);
  c.fillStyle = "#f1e5c9"; c.fillRect(0, 0, PW, PH);
  for (let i = 0; i < 46; i++) {
    const x = r() * PW, y = r() * PH, rad = 40 + r() * 170, g = c.createRadialGradient(x, y, 0, x, y, rad), dark = r() > 0.5;
    g.addColorStop(0, dark ? "rgba(165,120,60,0.035)" : "rgba(255,251,238,0.1)"); g.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = g; c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  for (let i = 0; i < 1100; i++) {
    const x = r() * PW, y = r() * PH, a = r() * TAU, l = 4 + r() * 15;
    c.strokeStyle = `rgba(${r() > 0.6 ? 130 : 95},85,50,${0.05 + r() * 0.1})`; c.lineWidth = 0.5 + r() * 0.7; c.beginPath(); c.moveTo(x, y);
    c.quadraticCurveTo(x + Math.cos(a + 0.6) * l * 0.5, y + Math.sin(a + 0.6) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke();
  }
  for (let i = 0; i < 600; i++) { c.fillStyle = `rgba(110,78,40,${0.07 + r() * 0.14})`; c.fillRect(r() * PW, r() * PH, 1 + r() * 1.6, 1 + r() * 1.6); }
  const g = side === "L" ? c.createLinearGradient(PW, 0, PW - 130, 0) : c.createLinearGradient(0, 0, 130, 0);
  g.addColorStop(0, "rgba(95,62,30,0.34)"); g.addColorStop(0.3, "rgba(95,62,30,0.12)"); g.addColorStop(1, "rgba(95,62,30,0)");
  c.fillStyle = g; c.fillRect(0, 0, PW, PH);
  const g2 = side === "L" ? c.createLinearGradient(0, 0, 46, 0) : c.createLinearGradient(PW, 0, PW - 46, 0);
  g2.addColorStop(0, "rgba(125,92,50,0.2)"); g2.addColorStop(1, "rgba(125,92,50,0)"); c.fillStyle = g2; c.fillRect(0, 0, PW, PH);
  return cv;
}
// Правая страница — разлинованный лист для записей
const LINE_TOPS = [318, 428, 538, 648]; // верх строк текста, координаты кадра
function ruledBase(seed) {
  const cv = paperBase(seed, "R"), c = cv.getContext("2d");
  c.lineWidth = 1.6; c.strokeStyle = "rgba(82,112,170,0.3)";
  for (let y = LINE_TOPS[0] - PY - 40; y < PH - 40; y += 55) { c.beginPath(); c.moveTo(40, y); c.lineTo(PW - 40, y); c.stroke(); }
  c.strokeStyle = "rgba(196,80,96,0.35)"; c.lineWidth = 2; c.beginPath(); c.moveTo(104, 30); c.lineTo(104, PH - 30); c.stroke();
  return cv;
}
const PAPER_L = [1, 2, 3, 4].map((i) => paperBase(100 + i, "L"));
const PAPER_R = [1, 2, 3, 4].map((i) => ruledBase(200 + i));

// ---------- Обложка ----------
const LABEL = { x: 112, y: 230, w: 640, h: 420 }; // этикетка на обложке: обложка лежит от (SX − 2, PY − 14)
const CW = PW + 18, CH = PH + 28; // обложка = картонная доска альбома
const coverC = mkCanvas(CW, CH);
{
  const c = coverC.getContext("2d"), r = mulberry32(31);
  c.fillStyle = "#8f6238"; c.fillRect(0, 0, CW, CH);
  for (let i = 0; i < 2200; i++) { c.fillStyle = r() > 0.5 ? `rgba(60,35,15,${0.05 + r() * 0.1})` : `rgba(200,150,95,${0.04 + r() * 0.08})`; c.fillRect(r() * CW, r() * CH, 1 + r() * 2.5, 1 + r() * 2.5); }
  for (let i = 0; i < 260; i++) { const x = r() * CW, y = r() * CH; c.strokeStyle = `rgba(55,32,14,${0.05 + r() * 0.08})`; c.lineWidth = 0.8; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (r() - 0.5) * 24, y + (r() - 0.5) * 8); c.stroke(); }
  // тканевый корешок
  c.fillStyle = "#3d5a3a"; c.fillRect(0, 0, 70, CH);
  for (let y = 0; y < CH; y += 3) { c.fillStyle = `rgba(0,0,0,${0.08 + 0.06 * Math.sin(y * 1.7)})`; c.fillRect(0, y, 70, 1); }
  for (let x = 0; x < 70; x += 3) { c.fillStyle = "rgba(255,255,255,0.04)"; c.fillRect(x, 0, 1, CH); }
  c.fillStyle = "rgba(0,0,0,0.25)"; c.fillRect(70, 0, 4, CH);
  // уголки
  c.fillStyle = "#3d5a3a";
  for (const [x, y, sx, sy] of [[CW, 0, -1, 1], [CW, CH, -1, -1]]) { c.beginPath(); c.moveTo(x, y); c.lineTo(x + sx * 110, y); c.lineTo(x, y + sy * 110); c.closePath(); c.fill(); }
  // этикетка
  const L = LABEL;
  c.shadowColor = "rgba(30,15,5,0.45)"; c.shadowBlur = 14; c.shadowOffsetY = 5;
  c.fillStyle = "#f3e8cd"; c.fillRect(L.x, L.y, L.w, L.h); c.shadowColor = "transparent";
  for (let i = 0; i < 500; i++) { c.fillStyle = `rgba(120,85,45,${0.05 + r() * 0.1})`; c.fillRect(L.x + r() * L.w, L.y + r() * L.h, 1.4, 1.4); }
  c.strokeStyle = "rgba(90,52,24,0.85)"; c.lineWidth = 3; c.strokeRect(L.x + 18, L.y + 18, L.w - 36, L.h - 36);
  c.lineWidth = 1.2; c.strokeRect(L.x + 27, L.y + 27, L.w - 54, L.h - 54);
}

// ---------- Скотч ----------
function tape(c, x, y, w, h, a, seed, alpha = 1) {
  if (alpha <= 0) return;
  const r = mulberry32(seed), n = 6;
  c.save(); c.translate(x, y); c.rotate(a); c.globalAlpha *= alpha;
  c.beginPath(); c.moveTo(-w / 2, -h / 2); c.lineTo(w / 2, -h / 2);
  for (let i = 1; i <= n; i++) c.lineTo(w / 2 + (r() - 0.5) * 6, -h / 2 + h * i / n);
  c.lineTo(-w / 2, h / 2);
  for (let i = n - 1; i >= 0; i--) c.lineTo(-w / 2 + (r() - 0.5) * 6, -h / 2 + h * i / n);
  c.closePath();
  c.shadowColor = "rgba(60,40,20,0.2)"; c.shadowBlur = 4; c.shadowOffsetY = 1.5;
  c.fillStyle = "rgba(238,226,192,0.8)"; c.fill(); c.shadowColor = "transparent";
  c.fillStyle = "rgba(255,255,255,0.18)"; c.fillRect(-w / 2 + 4, -h / 2 + 3, w - 8, h * 0.25);
  c.restore();
}

// ---------- Листья ----------
// Контур в единицах длины листа: черешок в (0,0), кончик в (0,-1).
const MAPLE = { cy: -0.25, R: 0.62, lobes: [[0, 1], [0.98, 0.86], [-0.98, 0.86], [1.95, 0.52], [-1.95, 0.52]] };
function outline(kind) {
  const pts = [];
  if (kind === "maple") {
    const { cy, R } = MAPLE;
    for (let i = 0; i <= 220; i++) {
      const th = -3.0 + 6.0 * i / 220;
      let r = 0.4;
      for (const [a, L] of MAPLE.lobes) { const d = Math.abs(th - a); if (d < 0.62) r = Math.max(r, L * Math.pow(1 - d / 0.62, 0.75)); }
      if (r > 0.46) r += 0.05 * Math.abs(Math.sin(th * 16));
      pts.push([Math.sin(th) * r * R, cy - Math.cos(th) * r * R]);
    }
    return pts;
  }
  const half = {
    birch: (s) => 0.36 * Math.pow(Math.sin(Math.PI * Math.pow(s, 0.75)), 0.9) * (1 - 0.25 * s) + 0.018 * Math.abs(Math.sin(s * 44)),
    aspen: (s) => 0.46 * Math.pow(Math.sin(Math.PI * s), 0.62) + 0.012 * Math.abs(Math.sin(s * 30)),
    oak: (s) => 0.27 * Math.pow(Math.sin(Math.PI * s), 0.7) * (0.62 + 0.42 * Math.abs(Math.sin(s * Math.PI * 4.5))),
    willow: (s) => 0.13 * Math.pow(Math.sin(Math.PI * s), 0.8),
  }[kind];
  for (let i = 0; i <= 50; i++) { const s = i / 50; pts.push([half(s), -s]); }
  for (let i = 50; i >= 0; i--) { const s = i / 50; pts.push([-half(s), -s]); }
  return pts;
}
const SHAPES = { maple: outline("maple"), birch: outline("birch"), aspen: outline("aspen"), oak: outline("oak"), willow: outline("willow") };

function leafPath(c, kind) { const p = SHAPES[kind]; c.beginPath(); c.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) c.lineTo(p[i][0], p[i][1]); c.closePath(); }
// Лист: (x,y) — черешок, len — длина, a — поворот (0 = кончиком вверх).
// col0 — исходный цвет, col1 — цвет осени, u — насколько лист пожелтел (от краёв к середине).
function leaf(c, x, y, len, a, kind, col0, col1, u = 0, opt = {}) {
  const sh = opt.shadow ?? 1, stem = opt.stem ?? 0.32;
  c.save(); c.translate(x, y); c.rotate(a); c.scale(len, len);
  if (opt.sx) c.scale(opt.sx, 1);
  c.lineCap = "round";
  // черешок
  c.strokeStyle = css(mixc(col0, K.brown, 0.5 + u * 0.3)); c.lineWidth = 0.022;
  c.beginPath(); c.moveTo(0, stem); c.quadraticCurveTo(0.03, stem * 0.4, 0, 0); c.stroke();
  leafPath(c, kind);
  if (sh > 0) { c.shadowColor = `rgba(60,38,18,${0.32 * sh})`; c.shadowBlur = 7; c.shadowOffsetX = 3 / len * 1; c.shadowOffsetY = 4; }
  c.fillStyle = css(col0); c.fill(); c.shadowColor = "transparent";
  c.save(); c.clip();
  if (u > 0) {
    const cy = kind === "maple" ? MAPLE.cy : -0.5, R = 0.62, r0 = Math.max(0, (1 - u) * R * 0.9);
    const g = c.createRadialGradient(0, cy, r0, 0, cy, r0 + 0.32);
    g.addColorStop(0, css(col1, 0)); g.addColorStop(1, css(col1, 1));
    c.fillStyle = g; c.fillRect(-1, -1.2, 2, 1.6);
    if (opt.edge) { const g2 = c.createRadialGradient(0, cy, r0 + 0.12, 0, cy, r0 + 0.5); g2.addColorStop(0, css(opt.edge, 0)); g2.addColorStop(1, css(opt.edge, 0.9)); c.fillStyle = g2; c.fillRect(-1, -1.2, 2, 1.6); }
  }
  // прожилки
  c.strokeStyle = "rgba(255,245,210,0.38)"; c.lineWidth = 0.016;
  if (kind === "maple") {
    for (const [th, L] of MAPLE.lobes) { c.beginPath(); c.moveTo(0, -0.02); c.lineTo(Math.sin(th) * L * MAPLE.R * 0.9, MAPLE.cy - Math.cos(th) * L * MAPLE.R * 0.9); c.stroke(); }
  } else {
    c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -0.97); c.stroke(); c.lineWidth = 0.009;
    for (let s = 0.14; s < 0.9; s += 0.11) for (const d of [-1, 1]) { c.beginPath(); c.moveTo(0, -s); c.quadraticCurveTo(d * 0.12, -s - 0.06, d * 0.3, -s - 0.15); c.stroke(); }
  }
  // сухая бумажная фактура
  c.fillStyle = "rgba(70,40,15,0.07)";
  for (let i = 0; i < 18; i++) { const px = Math.sin(i * 12.9898) * 0.3, py = -0.15 - ((i * 0.618) % 1) * 0.75; c.beginPath(); c.arc(px, py, 0.02 + (i % 3) * 0.008, 0, TAU); c.fill(); }
  c.restore();
  c.restore();
}

// ---------- Цветы ----------
function stem(c, pts, w, col) {
  c.strokeStyle = css(col); c.lineWidth = w; c.lineCap = "round"; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) { const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; c.quadraticCurveTo(pts[i][0], pts[i][1], mx, my); }
  const e = pts[pts.length - 1]; c.lineTo(e[0], e[1]); c.stroke();
}
// Ромашка: u — насколько высохла
function chamomile(c, x, y, r, u, seed) {
  const rr = mulberry32(seed), n = 19;
  c.save(); c.translate(x, y);
  c.shadowColor = "rgba(60,38,18,0.25)"; c.shadowBlur = 5; c.shadowOffsetX = 2; c.shadowOffsetY = 3;
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU + rr() * 0.12, curl = sstep(prog(u, rr() * 0.4, 0.6 + rr() * 0.4)), L = r * (1 - 0.42 * curl) * (0.92 + rr() * 0.12), wd = r * 0.17 * (1 - 0.45 * curl);
    c.save(); c.rotate(a + curl * 0.25 * (rr() - 0.5)); c.beginPath(); c.ellipse(r * 0.22 + L / 2, 0, L / 2, wd, 0, 0, TAU);
    c.fillStyle = css(mixc(K.white, K.beige, curl)); c.fill(); c.restore();
  }
  c.shadowColor = "transparent";
  const g = c.createRadialGradient(-r * 0.08, -r * 0.08, 0, 0, 0, r * 0.3);
  g.addColorStop(0, css(mixc(hex("#f6cf3e"), hex("#b48a34"), u))); g.addColorStop(1, css(mixc(hex("#d79a1c"), hex("#7a5a24"), u)));
  c.beginPath(); c.arc(0, 0, r * 0.3, 0, TAU); c.fillStyle = g; c.fill();
  c.fillStyle = "rgba(90,50,10,0.25)"; for (let i = 0; i < 26; i++) { const a = i * 2.4, d = Math.sqrt(i / 26) * r * 0.26; c.beginPath(); c.arc(Math.cos(a) * d, Math.sin(a) * d, 1.6, 0, TAU); c.fill(); }
  c.restore();
}
// Василёк: бахромчатые воронки по кругу
function cornflower(c, x, y, r, u, seed) {
  const rr = mulberry32(seed), n = 11, col = mixc(K.blue, K.blueDry, u);
  c.save(); c.translate(x, y);
  c.shadowColor = "rgba(60,38,18,0.25)"; c.shadowBlur = 5; c.shadowOffsetX = 2; c.shadowOffsetY = 3;
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU + rr() * 0.15, k = 1 - 0.38 * sstep(prog(u, rr() * 0.3, 0.7 + rr() * 0.3)), L = r * k;
    c.save(); c.rotate(a); c.beginPath(); c.moveTo(r * 0.15, -r * 0.06);
    c.lineTo(L * 0.85, -r * 0.2 * k);
    for (let j = 0; j <= 4; j++) { const yy = lerp(-r * 0.2 * k, r * 0.2 * k, j / 4); c.lineTo(L * (j % 2 ? 0.88 : 1.02), yy); }
    c.lineTo(r * 0.15, r * 0.06); c.closePath();
    c.fillStyle = css(mixc(col, [30, 40, 90], 0.12 * (i % 2))); c.fill(); c.restore();
  }
  c.shadowColor = "transparent";
  c.beginPath(); c.arc(0, 0, r * 0.2, 0, TAU); c.fillStyle = css(mixc(hex("#2a2f78"), hex("#5a4a5a"), u)); c.fill();
  c.restore();
}

// ---------- Карандаш ----------
// Ломаная pts рисуется до доли u: двойной неровный штрих, как карандашом.
function pencil(c, pts, u, w = 2.2, alpha = 0.55, seed = 1) {
  if (u <= 0 || pts.length < 2) return;
  let total = 0; const seg = [];
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); total += d; }
  const want = total * clamp(u, 0, 1);
  c.save(); c.lineCap = "round"; c.lineJoin = "round";
  for (let pass = 0; pass < 2; pass++) {
    const r = mulberry32(seed * 7 + pass); let acc = 0;
    c.strokeStyle = css(K.pencil, alpha * (pass ? 0.5 : 1)); c.lineWidth = w * (pass ? 0.7 : 1);
    c.beginPath(); c.moveTo(pts[0][0] + pass * 1.2, pts[0][1] + pass * 0.8);
    for (let i = 1; i < pts.length; i++) {
      const j = (r() - 0.5) * 1.6;
      if (acc + seg[i - 1] >= want) { const f = (want - acc) / seg[i - 1]; c.lineTo(lerp(pts[i - 1][0], pts[i][0], f) + pass * 1.2, lerp(pts[i - 1][1], pts[i][1], f) + pass * 0.8 + j); break; }
      acc += seg[i - 1]; c.lineTo(pts[i][0] + pass * 1.2, pts[i][1] + pass * 0.8 + j);
    }
    c.stroke();
  }
  c.restore();
}

// Бумажная бирка с номером
function tag(c, x, y, txt, a = -0.05) {
  c.save(); c.translate(x, y); c.rotate(a);
  c.shadowColor = "rgba(60,38,18,0.3)"; c.shadowBlur = 6; c.shadowOffsetY = 3;
  c.fillStyle = "#e9d6ae"; c.beginPath(); c.moveTo(-70, -32); c.lineTo(52, -32); c.lineTo(78, 0); c.lineTo(52, 32); c.lineTo(-70, 32); c.closePath(); c.fill();
  c.shadowColor = "transparent";
  c.beginPath(); c.arc(54, 0, 7, 0, TAU); c.fillStyle = "#f1e5c9"; c.fill(); c.strokeStyle = "rgba(110,70,35,0.6)"; c.lineWidth = 2; c.stroke();
  c.strokeStyle = "rgba(160,60,40,0.75)"; c.lineWidth = 2; c.beginPath(); c.moveTo(61, 0); c.bezierCurveTo(90, -6, 100, 22, 128, 14); c.stroke();
  c.fillStyle = css(K.ink); c.font = 'italic 700 34px "Pero"'; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(txt, -8, 2);
  c.restore();
}
