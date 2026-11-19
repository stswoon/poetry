// ---------- Пастозная живопись: мазок с гребнем, холст, палитра ----------
const W = 1920, H = 1080, TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, u) => a + (b - a) * u;
const inv = (a, b, v) => clamp((v - a) / (b - a));
const ease = (u) => { u = clamp(u); return u * u * (3 - 2 * u); };
const easeOut = (u) => 1 - Math.pow(1 - clamp(u), 3);
const easeIn = (u) => Math.pow(clamp(u), 3);
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
// пружина Motion → функция u(0…1) с перелётом
const SPRING = (() => {
  try {
    const gen = Motion.spring({ keyframes: [0, 1], stiffness: 170, damping: 11, mass: 1 });
    const N = 120, arr = [];
    for (let i = 0; i <= N; i++) arr.push(gen.next(i * 1200 / N).value);
    return (u) => { u = clamp(u); const f = u * N, i = Math.floor(f); return i >= N ? arr[N] : lerp(arr[i], arr[i + 1], f - i); };
  } catch (e) { return (u) => { u = clamp(u); return 1 - Math.cos(u * 9) * Math.exp(-u * 6); }; }
})();

// цвет: [r,g,b] 0…255
const mix = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
const shade = (c, k) => k >= 0 ? mix(c, [255, 250, 232], k) : mix(c, [28, 16, 30], -k);
const css = (c, a = 1) => a >= 1 ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a.toFixed(3)})`;
const jit = (c, n, amt) => [c[0] + (hash(n) - 0.5) * amt, c[1] + (hash(n + 7.3) - 0.5) * amt, c[2] + (hash(n + 3.1) - 0.5) * amt * 0.8];
// палитра по ключам: keys = [[t, color], …]
function ramp(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) return mix(keys[i - 1][1], keys[i][1], ease(inv(keys[i - 1][0], keys[i][0], t)));
  return keys[keys.length - 1][1];
}

const C = {
  cad: [246, 190, 40], gold: [232, 162, 34], ochre: [196, 128, 40], sienna: [150, 78, 30], umber: [86, 50, 30],
  ultra: [40, 62, 160], cobalt: [62, 104, 196], cerul: [108, 170, 226], cream: [250, 240, 206], white: [255, 250, 236],
  verm: [222, 70, 36], rose: [236, 128, 110], lemon: [250, 240, 150], night: [24, 30, 78], violet: [92, 70, 140],
  shirt: [192, 58, 44], pants: [68, 84, 120], skin: [234, 176, 128], hair: [236, 206, 120], green: [110, 150, 60],
};

// Мазок: тело + тень у нижнего края + гребень краски сверху. dx,dy — направление мазка (единичный вектор)
function dab(g, x, y, len, w, ang, col, a = 1) {
  const c = Math.cos(ang), s = Math.sin(ang);
  g.setTransform(c, s, -s, c, x, y);
  g.globalAlpha = a;
  const h = len / 2, r = w / 2;
  g.fillStyle = css(shade(col, -0.26));
  brush(g, h, r, w * 0.13); g.fill();
  g.fillStyle = css(col);
  brush(g, h, r * 0.92, 0); g.fill();
  g.globalAlpha = a * 0.75;
  g.fillStyle = css(shade(col, 0.36));
  brush(g, h * 0.62, Math.max(0.7, w * 0.09), -r * 0.42); g.fill();
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
}
// форма мазка: тупое начало слева, сужение и рваный кончик справа
function brush(g, h, r, dy) {
  g.beginPath();
  g.moveTo(-h, dy);
  g.quadraticCurveTo(-h, dy - r, -h + r, dy - r);
  g.lineTo(h * 0.45, dy - r * 0.9);
  g.quadraticCurveTo(h, dy - r * 0.55, h, dy - r * 0.05);
  g.quadraticCurveTo(h * 0.8, dy + r * 0.5, h * 0.4, dy + r * 0.85);
  g.lineTo(-h + r, dy + r);
  g.quadraticCurveTo(-h, dy + r, -h, dy);
}
function rr(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
const reset = (g) => { g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; };

// Толстая «живописная» линия (рука, нога, стебель): тень, тело, блик
function limb(g, pts, w, col) {
  reset(g);
  g.lineCap = "round"; g.lineJoin = "round";
  const path = () => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); };
  path(); g.strokeStyle = css(shade(col, -0.45)); g.lineWidth = w + 5; g.stroke();
  path(); g.strokeStyle = css(col); g.lineWidth = w; g.stroke();
  g.save(); g.translate(-w * 0.18, -w * 0.18); path(); g.strokeStyle = css(shade(col, 0.35)); g.lineWidth = Math.max(2, w * 0.22); g.stroke(); g.restore();
}
// пятно-эллипс, покрытое мазками (голова, облако, солнце): заливка + штрихи по форме
function blob(g, x, y, rx, ry, col, seed, n = 14, ang0 = 0.4) {
  reset(g);
  g.fillStyle = css(shade(col, -0.4));
  g.beginPath(); g.ellipse(x + 2, y + 3, rx + 2.5, ry + 2.5, 0, 0, TAU); g.fill();
  g.fillStyle = css(col);
  g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill();
  for (let i = 0; i < n; i++) {
    const a = hash(seed + i) * TAU, rr0 = Math.sqrt(hash(seed + i * 2.1)) * 0.75;
    const px = x + Math.cos(a) * rx * rr0, py = y + Math.sin(a) * ry * rr0;
    dab(g, px, py, Math.min(rx, ry) * 0.7, Math.min(rx, ry) * 0.2, ang0 + (hash(seed + i * 5) - 0.5) * 0.8, jit(shade(col, (0.5 - (py - y + ry) / (2 * ry)) * 0.2), seed + i, 14), 0.45);
  }
  reset(g);
}

// Холст: фактура переплетения и рельеф (один раз), накладывается поверх кадра
const CANVAS_TEX = (() => {
  const c = document.createElement("canvas"); c.width = 512; c.height = 512;
  const x = c.getContext("2d");
  const im = x.createImageData(512, 512), d = im.data;
  for (let j = 0; j < 512; j++) for (let i = 0; i < 512; i++) {
    const w = (Math.sin(i * 1.9) * Math.sin(j * 0.31) + Math.sin(j * 1.9) * Math.sin(i * 0.29)) * 0.5;
    const n = hash(i * 0.913 + j * 7.17) - 0.5;
    const v = 128 + w * 30 + n * 34;
    const k = (j * 512 + i) * 4;
    d[k] = d[k + 1] = d[k + 2] = v; d[k + 3] = 255;
  }
  x.putImageData(im, 0, 0);
  return c;
})();
let TEX_PAT = null;
function canvasGrain(g, amt = 0.16) {
  reset(g);
  if (!TEX_PAT) TEX_PAT = g.createPattern(CANVAS_TEX, "repeat");
  g.globalCompositeOperation = "overlay";
  g.globalAlpha = amt;
  g.fillStyle = TEX_PAT; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
}
