// Хохлома: стол, чёрное лаковое блюдо, лаковая доска для текста и хохломские мазки кистью. Всё рисуется кодом.
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
const springPop = makeSpring({ stiffness: 190, damping: 11, mass: 1 });
const springSoft = makeSpring({ stiffness: 120, damping: 15, mass: 1 });

// ---------- Цвета ----------
const C = {
  red: "#cf2a1c", redL: "#f0533a", redD: "#7c120b", black: "#0a0605", cream: "#f8ecd0", creamD: "#d9c39a",
  green: "#4f8a2c", greenL: "#9cc24a", greenD: "#2c5418", goldL: "#fff0b2", gold: "#efbd4a", goldD: "#9a6516",
};

// ---------- Золото: пятнистый металл как узор ----------
const goldC = mkCanvas(512, 512);
{
  const c = goldC.getContext("2d"), r = mulberry32(7);
  const g = c.createLinearGradient(0, 0, 512, 512);
  g.addColorStop(0, "#f7d56c"); g.addColorStop(0.35, "#e2a93a"); g.addColorStop(0.55, "#fbe39a"); g.addColorStop(0.8, "#d19a2e"); g.addColorStop(1, "#f3c95a");
  c.fillStyle = g; c.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 70; i++) {
    const x = r() * 512, y = r() * 512, rad = 20 + r() * 90, gg = c.createRadialGradient(x, y, 0, x, y, rad), lt = r() > 0.5;
    gg.addColorStop(0, lt ? "rgba(255,246,200,0.35)" : "rgba(150,90,20,0.28)"); gg.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = gg; c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  for (let i = 0; i < 900; i++) { c.fillStyle = r() > 0.5 ? "rgba(255,250,215,0.25)" : "rgba(120,70,10,0.18)"; c.fillRect(r() * 512, r() * 512, 1.5, 1.5); }
}
let GOLD = null; // узор создаётся для основного контекста
const goldFill = (c) => (GOLD || (GOLD = c.createPattern(goldC, "repeat")));

// ---------- Стол (статичный) ----------
const deskC = mkCanvas(W, H);
{
  const c = deskC.getContext("2d"), r = mulberry32(11);
  c.fillStyle = "#3a2213"; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 320; i++) {
    const y = r() * H, light = r() > 0.55;
    c.strokeStyle = light ? `rgba(150,95,55,${0.05 + r() * 0.08})` : `rgba(15,6,2,${0.08 + r() * 0.12})`;
    c.lineWidth = 1 + r() * 3.5; c.beginPath();
    for (let x = -20; x <= W + 40; x += 40) { const yy = y + 8 * Math.sin(x * 0.003 + i) + 3 * Math.sin(x * 0.011 + i * 2.1); if (x < 0) c.moveTo(x, yy); else c.lineTo(x, yy); }
    c.stroke();
  }
  const g = c.createRadialGradient(W / 2, H / 2, 300, W / 2, H / 2, 1150); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(5,2,0,0.62)");
  c.fillStyle = g; c.fillRect(0, 0, W, H);
}

// ---------- Блюдо ----------
const PC = { x: 575, y: 540 }, R_OUT = 476, R_GOLD = 446, R_ORN = 410, R_FIELD = 400;
const plateC = mkCanvas(1000, 1000); // блюдо без росписи: тень, дерево ободка, чёрный лак
{
  const c = plateC.getContext("2d"), o = 500;
  c.save(); c.shadowColor = "rgba(0,0,0,0.6)"; c.shadowBlur = 40; c.shadowOffsetY = 18;
  c.fillStyle = "#120a07"; c.beginPath(); c.arc(o, o, R_OUT, 0, TAU); c.fill(); c.restore();
  // чёрный лак: чуть светлее к центру, ободок темнее (выпуклость края)
  const g = c.createRadialGradient(o - 60, o - 80, 30, o, o, R_OUT);
  g.addColorStop(0, "#2a1a14"); g.addColorStop(0.7, "#120a07"); g.addColorStop(0.86, "#060302"); g.addColorStop(0.93, "#1d120c"); g.addColorStop(1, "#050201");
  c.fillStyle = g; c.beginPath(); c.arc(o, o, R_OUT, 0, TAU); c.fill();
  // ложбинка между полем и ободком
  c.strokeStyle = "rgba(0,0,0,0.7)"; c.lineWidth = 6; c.beginPath(); c.arc(o, o, R_ORN + 2, 0, TAU); c.stroke();
  c.strokeStyle = "rgba(255,220,180,0.06)"; c.lineWidth = 2; c.beginPath(); c.arc(o, o, R_ORN + 6, 0, TAU); c.stroke();
}
// лаковый блик (статичный), рисуется поверх росписи
const sheenC = mkCanvas(1000, 1000);
{
  const c = sheenC.getContext("2d"), o = 500;
  c.save(); c.beginPath(); c.arc(o, o, R_OUT, 0, TAU); c.clip();
  const g = c.createRadialGradient(o - 230, o - 260, 10, o - 230, o - 260, 330);
  g.addColorStop(0, "rgba(255,240,215,0.13)"); g.addColorStop(0.5, "rgba(255,240,215,0.04)"); g.addColorStop(1, "rgba(255,240,215,0)");
  c.fillStyle = g; c.fillRect(0, 0, 1000, 1000);
  c.restore();
}

// ---------- Лаковая доска для текста ----------
const BX = 1100, BY = 210, BW = 700, BH = 640;
const boardC = mkCanvas(BW + 80, BH + 80);
{
  const c = boardC.getContext("2d"), o = 40;
  c.save(); c.shadowColor = "rgba(0,0,0,0.55)"; c.shadowBlur = 30; c.shadowOffsetY = 14;
  c.fillStyle = "#0b0605"; c.beginPath(); c.roundRect(o, o, BW, BH, 26); c.fill(); c.restore();
  const g = c.createLinearGradient(o, o, o + BW, o + BH); g.addColorStop(0, "#1f130d"); g.addColorStop(0.5, "#0b0605"); g.addColorStop(1, "#150c08");
  c.fillStyle = g; c.beginPath(); c.roundRect(o, o, BW, BH, 26); c.fill();
  c.strokeStyle = "rgba(0,0,0,0.6)"; c.lineWidth = 4; c.beginPath(); c.roundRect(o + 18, o + 18, BW - 36, BH - 36, 16); c.stroke();
  const sh = c.createLinearGradient(o, o, o + BW * 0.6, o + BH * 0.5); sh.addColorStop(0, "rgba(255,235,210,0.08)"); sh.addColorStop(1, "rgba(255,235,210,0)");
  c.fillStyle = sh; c.beginPath(); c.roundRect(o, o, BW, BH, 26); c.fill();
}

// ---------- Геометрия мазков ----------
function bez(p0, p1, p2, p3, n = 24) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, v = 1 - u;
    out.push([v * v * v * p0[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * p3[0],
              v * v * v * p0[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * p3[1]]);
  }
  return out;
}
function arcLen(pts) { const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return L; }
// Точки пути до доли u длины, с интерполяцией конца
function cut(pts, u) {
  if (u >= 1) return pts;
  const L = arcLen(pts), target = L[L.length - 1] * u, out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    if (L[i] >= target) { const f = (target - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]); out.push([lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)]); return out; }
    out.push(pts[i]);
  }
  return out;
}
// Мазок кистью с нажимом: prof(s) — ширина в точке s (0..1 по всей длине), u — какая доля уже написана
function stroke(c, pts, prof, fill, u = 1, opt = {}) {
  if (u <= 0.001) return;
  const L = arcLen(pts), tot = L[L.length - 1], q = cut(pts, u), Lq = arcLen(q), n = q.length;
  if (n < 2) return;
  const lft = [], rgt = [], uTip = u < 1 ? 1 : 0;
  for (let i = 0; i < n; i++) {
    const a = q[Math.max(0, i - 1)], b = q[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const s = Lq[i] / tot;
    let w = prof(s);
    if (uTip) w *= Math.min(1, (Lq[n - 1] - Lq[i]) / 14 + 0.25); // растущий конец — кончик кисти
    w *= 0.5;
    lft.push([q[i][0] - dy * w, q[i][1] + dx * w]); rgt.push([q[i][0] + dy * w, q[i][1] - dx * w]);
  }
  c.beginPath(); c.moveTo(lft[0][0], lft[0][1]);
  for (let i = 1; i < n; i++) c.lineTo(lft[i][0], lft[i][1]);
  for (let i = n - 1; i >= 0; i--) c.lineTo(rgt[i][0], rgt[i][1]);
  c.closePath();
  c.fillStyle = fill; c.fill();
  if (opt.round) { const w0 = prof(0) * 0.5; c.beginPath(); c.arc(q[0][0], q[0][1], w0, 0, TAU); c.fill(); }
  if (opt.hi) { // блик золота вдоль мазка
    c.save(); c.globalAlpha *= opt.hi; c.strokeStyle = "rgba(255,248,215,0.9)"; c.lineWidth = 1.6; c.lineCap = "round";
    c.beginPath(); const k = Math.floor(n * 0.15), m = Math.floor(n * 0.75);
    for (let i = k; i <= m; i++) { const p = lft[i], cc = q[i], x = lerp(cc[0], p[0], 0.45), y = lerp(cc[1], p[1], 0.45); if (i === k) c.moveTo(x, y); else c.lineTo(x, y); }
    c.stroke(); c.restore();
  }
}
// профили нажима
const P = {
  drop: (wm) => (s) => wm * Math.pow(Math.max(0, 1 - s), 0.85) * (0.55 + 0.45 * Math.min(1, s * 6)), // «капелька»: толстая голова, тонкий хвост
  blade: (wm) => (s) => wm * Math.pow(Math.sin(Math.PI * clamp(s, 0, 1)), 0.7) + 0.6,          // «осочка»: тонко — нажим — тонко
  taper: (w0, w1) => (s) => lerp(w0, w1, s),
  curl: (wm) => (s) => wm * Math.pow(1 - s, 1.1) * Math.min(1, 0.4 + s * 5) + 0.7,                // завиток: нажим в начале, сходит на нет в спирали
};
// «капелька»: от основания (x, y) под углом a, длина len, ширина wm, лёгкий изгиб bend
function drop(c, x, y, a, len, wm, fill, k = 1, bend = 0.25, hi = 0) {
  if (k <= 0.001) return;
  const l = len * k, ca = Math.cos(a), sa = Math.sin(a), nx = -sa, ny = ca;
  const p0 = [x, y], p3 = [x + ca * l, y + sa * l];
  const p1 = [x + ca * l * 0.35 + nx * l * bend * 0.6, y + sa * l * 0.35 + ny * l * bend * 0.6];
  const p2 = [x + ca * l * 0.75 + nx * l * bend, y + sa * l * 0.75 + ny * l * bend];
  stroke(c, bez(p0, p1, p2, p3, 16), P.drop(wm * k), fill, 1, { round: true, hi });
}
// спираль-завиток: начинается в (x, y) и закручивается вокруг центра на расстоянии rad
function curlPts(x, y, a, rad, turns, dir = 1) {
  const cx = x + Math.cos(a) * rad, cy = y + Math.sin(a) * rad, pts = [], n = 40;
  const th0 = a + Math.PI;
  for (let i = 0; i <= n; i++) {
    const f = i / n, th = th0 + dir * f * turns * TAU, r = rad * (1 - 0.82 * f);
    pts.push([cx + Math.cos(th) * r, cy + Math.sin(th) * r]);
  }
  return pts;
}
// тонкая золотая «намётка» по пути
function sketch(c, pts, u, alpha) {
  if (u <= 0.001 || alpha <= 0.001) return;
  const q = cut(pts, u);
  c.save(); c.globalAlpha *= alpha; c.strokeStyle = "#e9be5c"; c.lineWidth = 2.2; c.lineCap = "round"; c.lineJoin = "round";
  c.beginPath(); c.moveTo(q[0][0], q[0][1]); for (let i = 1; i < q.length; i++) c.lineTo(q[i][0], q[i][1]); c.stroke(); c.restore();
}
// ягода: красный шарик с бликом и чёрной «кисткой»
function berry(c, x, y, r, k = 1, ripe = 1) {
  if (k <= 0.001) return;
  const rr = r * k;
  const g = c.createRadialGradient(x - rr * 0.35, y - rr * 0.4, rr * 0.1, x, y, rr);
  g.addColorStop(0, ripe > 0.5 ? C.redL : "#f08a3a"); g.addColorStop(0.6, C.red); g.addColorStop(1, C.redD);
  c.fillStyle = g; c.beginPath(); c.arc(x, y, rr, 0, TAU); c.fill();
  c.fillStyle = "rgba(255,240,200,0.85)"; c.beginPath(); c.arc(x - rr * 0.38, y - rr * 0.4, rr * 0.22, 0, TAU); c.fill();
  // «кистка» — маленькая чёрная звёздочка на кончике ягоды (снизу справа)
  const kx = x + rr * 0.42, ky = y + rr * 0.46;
  c.strokeStyle = "#1a0705"; c.lineWidth = Math.max(1, rr * 0.11); c.lineCap = "round";
  for (let i = 0; i < 4; i++) { const a = 0.4 + i * Math.PI / 4; c.beginPath(); c.moveTo(kx - Math.cos(a) * rr * 0.17, ky - Math.sin(a) * rr * 0.17); c.lineTo(kx + Math.cos(a) * rr * 0.17, ky + Math.sin(a) * rr * 0.17); c.stroke(); }
}
// белый цветок рябины: пять лепестков и жёлтая серединка
function flower(c, x, y, r, k = 1, rot = 0) {
  if (k <= 0.001) return;
  const rr = r * k;
  c.fillStyle = C.cream;
  for (let i = 0; i < 5; i++) { const a = rot + i * TAU / 5; c.beginPath(); c.ellipse(x + Math.cos(a) * rr * 0.55, y + Math.sin(a) * rr * 0.55, rr * 0.5, rr * 0.36, a, 0, TAU); c.fill(); }
  c.fillStyle = "#e7b33e"; c.beginPath(); c.arc(x, y, rr * 0.28, 0, TAU); c.fill();
}
// кисть: деревянная ручка под хохлому и тёмный ворс; (x, y) — кончик
function brush(c, x, y, a, alpha) {
  if (alpha <= 0.001) return;
  c.save(); c.globalAlpha *= alpha; c.translate(x, y); c.rotate(a);
  c.shadowColor = "rgba(0,0,0,0.45)"; c.shadowBlur = 14; c.shadowOffsetX = 10; c.shadowOffsetY = 14;
  c.fillStyle = "#3b2416"; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(10, -14, 14, -44); c.lineTo(-14, -44); c.quadraticCurveTo(-10, -14, 0, 0); c.fill();
  c.shadowColor = "transparent";
  c.fillStyle = "#b9b4ac"; c.fillRect(-15, -66, 30, 24);
  c.fillStyle = "#d9d4cc"; c.fillRect(-15, -66, 9, 24);
  c.fillStyle = C.red; c.beginPath(); c.moveTo(-13, -66); c.lineTo(13, -66); c.lineTo(9, -330); c.lineTo(-9, -330); c.closePath(); c.fill();
  c.fillStyle = goldFill(c);
  for (let i = 0; i < 5; i++) { c.beginPath(); c.ellipse(0, -100 - i * 46, 6, 14, 0, 0, TAU); c.fill(); }
  c.fillStyle = "rgba(255,255,255,0.18)"; c.fillRect(-8, -326, 4, 258);
  c.restore();
}
