// Кисть городецкого мастера: капля, скобка, цветы в три слоя (подмалёвок, тенёвка, оживка).
const W = 1920, H = 1080, TOTAL = CFG.total, EV = CFG.ev, TAU = 6.283185;

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

const C = { red: "#c8281e", redD: "#7d1410", blue: "#1f4f9a", blueD: "#12295c", teal: "#0f6e6a", tealD: "#084543", green: "#2f8238", greenD: "#14492a", greenL: "#58a845",
  pink: "#e8657f", pinkD: "#a81f3c", orange: "#ef8a1c", orangeD: "#b5500c", black: "#1a1210", white: "#fff9e8", gold: "#f9d65c", cream: "#fcefcb", skin: "#f6cfa3", brown: "#7a4522", brownD: "#46260f" };
const P_RED = { base: C.red, dark: C.redD, light: C.white }, P_BLUE = { base: C.blue, dark: C.blueD, light: C.white },
  P_PINK = { base: C.pink, dark: C.pinkD, light: C.white }, P_OR = { base: C.orange, dark: C.orangeD, light: C.white };

// Капля: хвост в (x,y), толстая голова к концу. u — насколько кисть прошла мазок.
function drop(c, x, y, len, w, ang, col, u = 1, bend = 0) {
  if (u <= 0) return;
  const n = 12, L = len * u, ca = Math.cos(ang), sa = Math.sin(ang);
  c.beginPath();
  for (let i = 0; i <= n; i++) { const s = i / n, cx = s * L, cy = bend * L * Math.sin(Math.PI * s), h = w / 2 * Math.pow(Math.sin(Math.PI * Math.pow(s, 1.5)), 0.8) * (0.45 + 0.55 * u), yy = cy - h;
    if (i === 0) c.moveTo(x + ca * cx - sa * yy, y + sa * cx + ca * yy); else c.lineTo(x + ca * cx - sa * yy, y + sa * cx + ca * yy); }
  for (let i = n; i >= 0; i--) { const s = i / n, cx = s * L, cy = bend * L * Math.sin(Math.PI * s), h = w / 2 * Math.pow(Math.sin(Math.PI * Math.pow(s, 1.5)), 0.8) * (0.45 + 0.55 * u), yy = cy + h;
    c.lineTo(x + ca * cx - sa * yy, y + sa * cx + ca * yy); }
  c.closePath(); c.fillStyle = col; c.fill();
}
// Скобка: дуга с сужением на концах
function arcS(c, x, y, r, a0, a1, w, col, u = 1) {
  if (u <= 0) return;
  const n = 18, ae = a0 + (a1 - a0) * u;
  c.beginPath();
  for (let i = 0; i <= n; i++) { const s = i / n, a = lerp(a0, ae, s), h = w / 2 * Math.pow(Math.sin(Math.PI * s), 0.7), rr = r + h, px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; if (i === 0) c.moveTo(px, py); else c.lineTo(px, py); }
  for (let i = n; i >= 0; i--) { const s = i / n, a = lerp(a0, ae, s), h = w / 2 * Math.pow(Math.sin(Math.PI * s), 0.7), rr = r - h; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  c.closePath(); c.fillStyle = col; c.fill();
}
const dot = (c, x, y, r, col) => { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = col; c.fill(); };
// Неровный мазок-круг
function dab(c, x, y, r, col, seed = 1) {
  if (r <= 0) return;
  c.beginPath();
  for (let i = 0; i <= 26; i++) { const a = i / 26 * TAU, k = 1 + 0.018 * Math.sin(a * 3 + seed) + 0.012 * Math.sin(a * 5 + seed * 2.3), px = x + Math.cos(a) * r * k, py = y + Math.sin(a) * r * k; if (i === 0) c.moveTo(px, py); else c.lineTo(px, py); }
  c.closePath(); c.fillStyle = col; c.fill();
}

// Розан: круг, чёрно-тёмные скобки лепестков, белая оживка
function rosan(c, f, t) {
  const a = t - f.t; if (a < 0) return;
  const k = springPop(a * 1.15), r = f.r * (f.scale || 1), P = f.p, s = f.x * 0.013 + f.y * 0.007;
  if (k <= 0.001) return;
  const u2 = sstep(prog(a, 0.2, 0.55)), u3 = sstep(prog(a, 0.48, 0.92));
  c.save(); c.translate(f.x, f.y); c.rotate((f.rot || 0) + 0.035 * Math.sin(t * 0.9 + s)); c.scale(k, k);
  dab(c, 0, 0, r, P.base, s);
  for (let i = 0; i < 6; i++) { const b = i / 6 * TAU + 0.3; arcS(c, 0, 0, r * 0.8, b - 0.42, b + 0.42, r * 0.18, P.dark, u2); }
  for (let i = 0; i < 5; i++) { const b = i / 5 * TAU + 0.9; arcS(c, 0, 0, r * 0.53, b - 0.48, b + 0.48, r * 0.15, P.dark, u2); }
  dab(c, 0, 0, r * 0.27 * u2, P.dark, s + 1);
  for (let i = 0; i < 6; i++) { const b = i / 6 * TAU + 0.3; arcS(c, 0, 0, r * 0.93, b - 0.46, b + 0.46, r * 0.055, P.light, u3); }
  for (let i = 0; i < 5; i++) { const b = i / 5 * TAU + 0.9; arcS(c, 0, 0, r * 0.65, b - 0.36, b + 0.36, r * 0.05, P.light, u3); }
  if (u3 > 0) for (let i = 0; i < 7; i++) { const b = i / 7 * TAU; dot(c, Math.cos(b) * r * 0.16, Math.sin(b) * r * 0.16, r * 0.032 * u3, P.light); }
  c.restore();
}
// Купавка: круг, лепестки-капли по кругу
function kupavka(c, f, t) {
  const a = t - f.t; if (a < 0) return;
  const k = springPop(a * 1.15), r = f.r, P = f.p, s = f.x * 0.011 + f.y * 0.005, n = f.n || 10;
  if (k <= 0.001) return;
  const u2 = sstep(prog(a, 0.18, 0.55)), u3 = sstep(prog(a, 0.46, 0.9));
  c.save(); c.translate(f.x, f.y); c.rotate((f.rot || 0) + 0.04 * Math.sin(t * 0.8 + s)); c.scale(k, k);
  for (let i = 0; i < n; i++) { const b = i / n * TAU; drop(c, Math.cos(b) * r * 0.32, Math.sin(b) * r * 0.32, r * 0.72, r * 0.44, b, P.base); }
  for (let i = 0; i < n; i++) { const b = i / n * TAU; drop(c, Math.cos(b) * r * 0.36, Math.sin(b) * r * 0.36, r * 0.46, r * 0.16, b, P.dark, u2); }
  dab(c, 0, 0, r * 0.36, C.gold, s); arcS(c, 0, 0, r * 0.3, 0.3, 3.0, r * 0.1, C.orangeD, u2);
  for (let i = 0; i < n; i++) { const b = (i + 0.5) / n * TAU; drop(c, Math.cos(b) * r * 0.5, Math.sin(b) * r * 0.5, r * 0.4, r * 0.05, b, P.light, u3); }
  if (u3 > 0) for (let i = 0; i < 6; i++) { const b = i / 6 * TAU + 0.4; dot(c, Math.cos(b) * r * 0.2, Math.sin(b) * r * 0.2, r * 0.03 * u3, C.black); }
  c.restore();
}
// Лист: капля светло-зелёная, половина тёмная, белая жилка
function leaf(c, x, y, len, w, ang, t, t0, col = C.green, bend = 0.1) {
  const a = t - t0; if (a < 0) return;
  const u = springSoft(a * 1.5);
  drop(c, x, y, len, w, ang, col, u, bend);
  drop(c, x, y, len * 0.92, w * 0.4, ang, C.greenD, sstep(prog(a, 0.16, 0.5)), bend * 1.4);
  drop(c, x, y, len * 0.82, w * 0.09, ang, C.white, sstep(prog(a, 0.38, 0.75)), bend * 1.8);
}
// Стебель с парами листьев; покачивается
function sprig(c, f, t) {
  const a = t - f.t; if (a < 0) return;
  const u = sstep(a / (f.dur || 0.7)), sway = f.sway === 0 ? 0 : 0.018 * Math.sin(t * 1.3 + f.x * 0.03);
  const ang = f.a + sway, n = 18;
  const pt = (s) => [f.x + Math.cos(ang) * f.h * s + Math.cos(ang + 1.57) * f.b * f.h * Math.sin(Math.PI * s), f.y + Math.sin(ang) * f.h * s + Math.sin(ang + 1.57) * f.b * f.h * Math.sin(Math.PI * s)];
  c.save(); c.lineCap = "round"; c.strokeStyle = C.greenD; c.lineWidth = f.lw || 5; c.beginPath();
  for (let i = 0; i <= n * u; i++) { const p = pt(i / n); if (i === 0) c.moveTo(p[0], p[1]); else c.lineTo(p[0], p[1]); }
  c.stroke(); c.restore();
  const m = f.leaves || 3;
  for (let i = 1; i <= m; i++) { const s = i / (m + 0.4), p = pt(s), L = (f.ll || 56) * (1.08 - s * 0.4), w = L * 0.42, t1 = f.t + (f.dur || 0.7) * s;
    leaf(c, p[0], p[1], L, w, ang - 0.7, t, t1, f.col || C.green); leaf(c, p[0], p[1], L, w, ang + 0.7, t, t1 + 0.05, f.col || C.green, -0.1); }
  const p = pt(1); leaf(c, p[0], p[1], (f.ll || 56) * 0.7, (f.ll || 56) * 0.32, ang, t, f.t + (f.dur || 0.7), f.col || C.green, 0);
}

// ---------- Дерево: один раз рисуем в отдельный холст ----------
const woodC = mkCanvas(W, H);
{
  const c = woodC.getContext("2d"), r = mulberry32(1858);
  const g = c.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 1200); g.addColorStop(0, "#f2c251"); g.addColorStop(0.65, "#e8b13f"); g.addColorStop(1, "#d3932a");
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  // пятна
  const nw = 96, nh = 54, nC = mkCanvas(nw, nh), nc = nC.getContext("2d"), im = nc.createImageData(nw, nh);
  for (let i = 0; i < nw * nh; i++) { const v = r(); im.data[i * 4] = v > 0.5 ? 255 : 110; im.data[i * 4 + 1] = v > 0.5 ? 225 : 60; im.data[i * 4 + 2] = v > 0.5 ? 150 : 10; im.data[i * 4 + 3] = 22; }
  nc.putImageData(im, 0, 0); c.imageSmoothingEnabled = true; c.drawImage(nC, 0, 0, W, H);
  // волокна
  for (let k = 0; k < 170; k++) {
    const y0 = r() * H, ph = r() * 6.28, f = 0.0016 + r() * 0.0022, am = 6 + r() * 16, al = 0.04 + r() * 0.11;
    c.beginPath(); for (let x = 0; x <= W; x += 24) { const y = y0 + am * Math.sin(x * f + ph) + 4 * Math.sin(x * f * 3.1 + ph); if (x === 0) c.moveTo(x, y); else c.lineTo(x, y); }
    c.strokeStyle = `rgba(${130 + r() * 30},${70 + r() * 20},18,${al})`; c.lineWidth = 0.8 + r() * 2.2; c.stroke();
  }
  // сучок
  for (const [x, y] of [[1460, 980], [760, 110]]) for (let i = 7; i > 0; i--) { c.beginPath(); c.ellipse(x, y, i * 11, i * 3.6, 0.04, 0, TAU); c.strokeStyle = `rgba(120,64,16,${0.05 + (8 - i) * 0.02})`; c.lineWidth = 2; c.stroke(); }
}

// ---------- Рамка ----------
const FR = { x: 50, y: 48, w: 1820, h: 984, r: 34 };
function framePath(c, ins) { c.beginPath(); c.roundRect(FR.x + ins, FR.y + ins, FR.w - ins * 2, FR.h - ins * 2, Math.max(4, FR.r - ins * 0.6)); }
const FRAME_LEN = (() => { let p = 0; const w = FR.w - 22, h = FR.h - 22; p = 2 * (w + h); return p; })();
const FRAME_DOTS = [];
{
  const pts = [], ins = 11, x0 = FR.x + ins, x1 = FR.x + FR.w - ins, y0 = FR.y + ins, y1 = FR.y + FR.h - ins, st = 30;
  for (let x = x0 + 30; x < x1 - 20; x += st) pts.push([x, y0]);
  for (let y = y0 + 30; y < y1 - 20; y += st) pts.push([x1, y]);
  for (let x = x1 - 30; x > x0 + 20; x -= st) pts.push([x, y1]);
  for (let y = y1 - 30; y > y0 + 20; y -= st) pts.push([x0, y]);
  pts.forEach((p, i) => FRAME_DOTS.push({ x: p[0], y: p[1], u: i / pts.length }));
}
function drawFrame(c, t) {
  const u = clamp(0.7 + t / 1.0, 0, 1);
  c.save(); c.lineCap = "butt";
  framePath(c, 11); c.setLineDash([FRAME_LEN * u, FRAME_LEN]); c.strokeStyle = C.red; c.lineWidth = 22; c.stroke();
  framePath(c, 25); c.setLineDash([FRAME_LEN * u, FRAME_LEN]); c.strokeStyle = C.black; c.lineWidth = 4; c.stroke();
  framePath(c, 0); c.setLineDash([FRAME_LEN * u, FRAME_LEN]); c.strokeStyle = C.black; c.lineWidth = 3; c.stroke();
  c.setLineDash([]); c.restore();
  for (const d of FRAME_DOTS) if (d.u <= u) dot(c, d.x, d.y, 4.6, C.white);
}

// ---------- Плашка для текста ----------
const PL = { x: 1034, y: 262, w: 672, h: 556 };
const plateC = mkCanvas(W, H);
{
  const c = plateC.getContext("2d"), r = mulberry32(58);
  c.save(); c.shadowColor = "rgba(70,30,0,.28)"; c.shadowBlur = 10; c.shadowOffsetY = 5;
  c.beginPath(); c.roundRect(PL.x, PL.y, PL.w, PL.h, 42); c.fillStyle = C.cream; c.fill(); c.restore();
  // зерно на плашке
  for (let i = 0; i < 26; i++) { const y = PL.y + 8 + r() * (PL.h - 16); c.beginPath(); c.moveTo(PL.x + 14, y); c.bezierCurveTo(PL.x + 200, y + r() * 8 - 4, PL.x + 450, y + r() * 8 - 4, PL.x + PL.w - 14, y); c.strokeStyle = `rgba(190,130,50,${0.04 + r() * 0.05})`; c.lineWidth = 1 + r() * 1.4; c.stroke(); }
  c.beginPath(); c.roundRect(PL.x, PL.y, PL.w, PL.h, 42); c.strokeStyle = C.red; c.lineWidth = 13; c.stroke();
  c.beginPath(); c.roundRect(PL.x + 12, PL.y + 12, PL.w - 24, PL.h - 24, 34); c.strokeStyle = C.black; c.lineWidth = 3; c.stroke();
  c.beginPath(); c.roundRect(PL.x - 8, PL.y - 8, PL.w + 16, PL.h + 16, 48); c.strokeStyle = C.black; c.lineWidth = 3; c.stroke();
  const n = 64; for (let i = 0; i < n; i++) { const u = i / n, per = 2 * (PL.w + PL.h); let d = u * per, x, y;
    if (d < PL.w) { x = PL.x + d; y = PL.y; } else if ((d -= PL.w) < PL.h) { x = PL.x + PL.w; y = PL.y + d; } else if ((d -= PL.h) < PL.w) { x = PL.x + PL.w - d; y = PL.y + PL.h; } else { d -= PL.w; x = PL.x; y = PL.y + PL.h - d; }
    const onCorner = (x < PL.x + 30 || x > PL.x + PL.w - 30) && (y < PL.y + 30 || y > PL.y + PL.h - 30); if (!onCorner) dot(c, x, y, 3.2, C.white); }
  // завитки в верху и внизу плашки
  const cx = PL.x + PL.w / 2;
  for (const [yy, dir] of [[PL.y + 42, 1], [PL.y + PL.h - 42, -1]]) {
    for (const s of [-1, 1]) { drop(c, cx + s * 26, yy, 120, 22, s > 0 ? 0.04 * dir : Math.PI - 0.04 * dir, C.green, 1, s * dir * 0.1); drop(c, cx + s * 30, yy, 96, 8, s > 0 ? 0.04 * dir : Math.PI - 0.04 * dir, C.greenD, 1, s * dir * 0.14); drop(c, cx + s * 150, yy + dir * 2, 60, 15, s > 0 ? -0.5 * dir : Math.PI + 0.5 * dir, C.red); dot(c, cx + s * 212, yy - dir * 26, 4, C.red); dot(c, cx + s * 228, yy - dir * 16, 3, C.blue); }
    rosan(c, { x: cx, y: yy, r: 24, p: P_RED, t: -5 }, 0);
  }
}
const textPlate = [PL.x + 26, PL.y + 62, PL.x + PL.w - 26, PL.y + PL.h - 62];
