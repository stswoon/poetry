// «Песнь о вещем Олеге» — трейлер эпического фильма. Всё рисуется кодом на одном canvas, кадр = функция времени.
const W = 1920, H = 1080, TOTAL = CFG.total, EV = CFG.ev, TAU = Math.PI * 2;
const BAR = 92; // чёрные полосы широкого экрана сверху и снизу

function mulberry32(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, u) => a + (b - a) * u;
const sstep = (u) => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
const prog = (t, a, b) => clamp((t - a) / Math.max(1e-6, b - a), 0, 1);
const win = (t, a, b, fi = 0.25, fo = 0.25) => Math.min(sstep(prog(t, a, a + fi)), 1 - sstep(prog(t, b - fo, b)));
const mkCanvas = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
const easeOut = (u) => 1 - Math.pow(1 - clamp(u, 0, 1), 3);
const easeIn = (u) => Math.pow(clamp(u, 0, 1), 3);
const easeInOut = (u) => { u = clamp(u, 0, 1); return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
// пружины Framer Motion как функции времени: 0 → 1 с перелётом (детерминированно, по таблице)
function makeSpring(opts) {
  const g = Motion.spring({ ...opts, keyframes: [0, 1] });
  const pts = []; for (let i = 0; i <= 400; i++) pts.push(g.next(i * 10).value);
  return (s) => { if (s <= 0) return 0; const f = s * 100; if (f >= 400) return 1; const i = Math.floor(f); return lerp(pts[i], pts[i + 1], f - i); };
}
const springPop = makeSpring({ stiffness: 260, damping: 13, mass: 1 });
const springSoft = makeSpring({ stiffness: 120, damping: 18, mass: 1 });
const springSnap = makeSpring({ stiffness: 420, damping: 22, mass: 1 });
const springHeavy = makeSpring({ stiffness: 90, damping: 14, mass: 2 });
const popAt = (t, t0, f = springPop) => (t < t0 ? 0 : f(t - t0));
// детерминированный «шум»
const wob = (t, f, s = 0) => Math.sin(t * f + s) * 0.6 + Math.sin(t * f * 2.31 + s * 1.7) * 0.4;
function hash(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
function noise1(x) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i), hash(i + 1), u) * 2 - 1; }

// палитра: «блокбастер» — бирюзовые тени, оранжевый свет
const C = {
  ink: "#06080c", ink2: "#0c1118", night: "#070c14", teal: "#0f2a33", teal2: "#1d4651", steel: "#9fb6c4",
  sunset1: "#1a2a3a", sunset2: "#6b3a3a", sunset3: "#e0743a", sunset4: "#ffc06a", ember: "#ff7a2a", fire: "#ffb347",
  gold: "#f6c35b", goldL: "#fff0b8", goldD: "#9b6a1c", bone: "#e8e0cc", blood: "#7a1010", moon: "#dfe9f2", mist: "#a9c2cc",
  white: "#ffffff",
};
const F_TITLE = '"TitleSerif"', F_CAP = '"CapSerif"';
function font(c, px, fam = F_TITLE, style = "") { c.font = `${style} ${px}px ${fam}`.trim(); }

function circle(c, x, y, r) { c.beginPath(); c.arc(x, y, Math.max(0.01, r), 0, TAU); }
function ellipse(c, x, y, rx, ry, rot = 0) { c.beginPath(); c.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU); }
function radial(c, x, y, r0, r1, stops) { const g = c.createRadialGradient(x, y, r0, x, y, Math.max(r0 + 0.1, r1)); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; }
function linear(c, x0, y0, x1, y1, stops) { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; }
function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; }
function mix(h1, h2, u) {
  const a = parseInt(h1.slice(1), 16), b = parseInt(h2.slice(1), 16);
  const r = Math.round(lerp((a >> 16) & 255, (b >> 16) & 255, u)), g = Math.round(lerp((a >> 8) & 255, (b >> 8) & 255, u)), bl = Math.round(lerp(a & 255, b & 255, u));
  return "#" + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
}
// силуэт с контровым светом: shape(c) рисует путь; сначала светлая кромка со сдвигом к свету, затем тёмная заливка
function rimmed(c, shape, fill, rim, dx, dy, rimA = 1) {
  if (rim && rimA > 0) { c.save(); c.globalAlpha *= rimA; c.translate(dx, dy); c.fillStyle = rim; shape(c); c.restore(); }
  c.fillStyle = fill; shape(c);
}
// камера: наезд/сдвиг вокруг точки + тряска
function camera(c, cx, cy, zoom, ox = 0, oy = 0, rot = 0) {
  c.translate(W / 2 + ox, H / 2 + oy); c.rotate(rot); c.scale(zoom, zoom); c.translate(-cx, -cy);
}
function shake(t, t0, amp, dur = 0.6) {
  if (t < t0 || t > t0 + dur) return [0, 0];
  const k = amp * Math.pow(1 - (t - t0) / dur, 2);
  return [noise1((t - t0) * 40) * k, noise1((t - t0) * 40 + 77) * k];
}
