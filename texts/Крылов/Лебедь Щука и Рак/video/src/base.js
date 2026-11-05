// Спортивная трансляция: арена у пруда, воз и три участника. Всё рисуется кодом на одном canvas.
const W = 1920, H = 1080, TOTAL = CFG.total, EV = CFG.ev, TAU = Math.PI * 2;

function mulberry32(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, u) => a + (b - a) * u;
const sstep = (u) => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
const prog = (t, a, b) => clamp((t - a) / Math.max(1e-6, b - a), 0, 1);
const win = (t, a, b, fi = 0.25, fo = 0.25) => Math.min(sstep(prog(t, a, a + fi)), 1 - sstep(prog(t, b - fo, b)));
const mkCanvas = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
const easeOut = (u) => 1 - Math.pow(1 - clamp(u, 0, 1), 3);
// пружины Framer Motion как функции времени: 0 → 1 с перелётом
function makeSpring(opts) {
  const g = Motion.spring({ ...opts, keyframes: [0, 1] });
  const pts = []; for (let i = 0; i <= 400; i++) pts.push(g.next(i * 10).value);
  return (s) => { if (s <= 0) return 0; const f = s * 100; if (f >= 400) return 1; const i = Math.floor(f); return lerp(pts[i], pts[i + 1], f - i); };
}
const springPop = makeSpring({ stiffness: 260, damping: 13, mass: 1 });
const springSoft = makeSpring({ stiffness: 140, damping: 17, mass: 1 });
const springSnap = makeSpring({ stiffness: 420, damping: 20, mass: 1 });
// детерминированный «шум» для дрожи
const wob = (t, f, s = 0) => Math.sin(t * f + s) * 0.6 + Math.sin(t * f * 2.31 + s * 1.7) * 0.4;

const C = {
  navy: "#0b1a3a", navy2: "#15306a", navy3: "#21468f", yellow: "#ffd21f", yellowD: "#e0a800", red: "#e8322b", redD: "#a3161a",
  white: "#ffffff", ink: "#16223d", sky1: "#3d9be9", sky2: "#bfe6ff", grass1: "#74c74e", grass2: "#3f9a35",
  track: "#d3a46a", trackD: "#b9854b", water1: "#2f8fd6", water2: "#1c66b0", swan: "#2a6fdb", rak: "#e0452c", pike: "#3c9a3a",
};
const F_NARROW = '"Narrow"', F_SANS = '"SansB"', F_NUM = '"Num"';
function font(c, px, fam = F_NARROW, style = "") { c.font = `${style} ${px}px ${fam}`.trim(); }

// параллелограмм со скосом s
function slant(c, x, y, w, h, s) { c.beginPath(); c.moveTo(x + s, y); c.lineTo(x + w, y); c.lineTo(x + w - s, y + h); c.lineTo(x, y + h); c.closePath(); }
function rrect(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }
// обводка + заливка текущего пути мультяшным контуром
function ink(c, fill, lw = 5, stroke = C.ink) { c.fillStyle = fill; c.fill(); if (lw > 0) { c.lineWidth = lw; c.strokeStyle = stroke; c.lineJoin = "round"; c.stroke(); } }
// стрелка от (x0,y0) к (x1,y1), видна доля u
function arrow(c, x0, y0, x1, y1, u, col, lw, head = 34) {
  if (u <= 0) return;
  const x = lerp(x0, x1, u), y = lerp(y0, y1, u), a = Math.atan2(y1 - y0, x1 - x0);
  c.save(); c.strokeStyle = col; c.fillStyle = col; c.lineWidth = lw; c.lineCap = "round";
  c.beginPath(); c.moveTo(x0, y0); c.lineTo(x - Math.cos(a) * head * 0.6, y - Math.sin(a) * head * 0.6); c.stroke();
  c.beginPath(); c.moveTo(x, y); c.lineTo(x - Math.cos(a - 0.45) * head, y - Math.sin(a - 0.45) * head);
  c.lineTo(x - Math.cos(a + 0.45) * head, y - Math.sin(a + 0.45) * head); c.closePath(); c.fill();
  c.restore();
}
