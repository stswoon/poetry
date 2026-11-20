// ---------- Аниме-чиби: заливка в два тона, цветной контур, искры, ноты, линии скорости ----------
const W = 1920, H = 1080, TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, u) => a + (b - a) * u;
const inv = (a, b, v) => clamp((v - a) / (b - a));
const ease = (u) => { u = clamp(u); return u * u * (3 - 2 * u); };
const easeOut = (u) => 1 - Math.pow(1 - clamp(u), 3);
const easeIn = (u) => Math.pow(clamp(u), 3);
const easeIO = (u) => { u = clamp(u); return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const pulse = (t, a, b) => clamp(Math.min((t - a) / 0.12, (b - t) / 0.12));   // 0…1, «окно» с мягкими краями
// пружина Motion → u(0…1) с перелётом
const SPRING = (() => {
  try {
    const gen = Motion.spring({ keyframes: [0, 1], stiffness: 210, damping: 12, mass: 1 });
    const N = 120, arr = [];
    for (let i = 0; i <= N; i++) arr.push(gen.next(i * 1000 / N).value);
    return (u) => { u = clamp(u); const f = u * N, i = Math.floor(f); return i >= N ? arr[N] : lerp(arr[i], arr[i + 1], f - i); };
  } catch (e) { return (u) => { u = clamp(u); return 1 - Math.cos(u * 9) * Math.exp(-u * 6); }; }
})();
const spr = (t, t0, dur = 0.7) => SPRING((t - t0) / dur);

// цвет [r,g,b]
const mix = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
const css = (c, a = 1) => a >= 1 ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${clamp(a).toFixed(3)})`;
// аниме-тень: темнее и с уходом в сирень; свет: к тёплому белому
const shd = (c, k = 1) => mix(c, [88, 60, 140], 0.32 * k).map((v, i) => v * (1 - 0.16 * k));
const lit = (c, k = 1) => mix(c, [255, 250, 236], 0.45 * k);
const ink = (c) => mix(c, [60, 30, 90], 0.62);   // цветной контур: тон заливки, затемнённый в сиреневый

const C = {
  wall: [236, 196, 206], wallD: [206, 160, 190], paper: [248, 222, 222], wood: [214, 146, 98], woodD: [170, 104, 76],
  floor: [222, 160, 112], rug: [232, 104, 120], rug2: [255, 208, 120], rug3: [120, 160, 220],
  stove: [246, 238, 232], tile: [110, 150, 220], warm: [255, 214, 140], lamp: [255, 170, 90],
  sky: [42, 62, 128], skyD: [24, 30, 78], teal: [70, 168, 196], snow: [240, 250, 255], snowS: [170, 196, 236],
  cloud: [196, 214, 246], cloudD: [130, 150, 210],
  cat: [250, 178, 98], catW: [255, 246, 236], catS: [222, 128, 70], pink: [255, 150, 170],
  skin: [255, 220, 196], hair: [120, 76, 56], shirt: [120, 200, 230], pants: [92, 110, 200], sock: [255, 255, 255],
  red: [236, 70, 90], yellow: [255, 216, 80], green: [120, 200, 120], violet: [140, 90, 200], white: [255, 255, 255],
  text: [70, 40, 110], hot: [236, 64, 132],
};

const reset = (g) => { g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = "source-over"; g.filter = "none"; };
function rr(g, x, y, w, h, r) {
  r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function ell(g, x, y, rx, ry, rot = 0) { g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU); }

// Двухтоновая заливка проще и надёжнее: тень = форма ∩ (вся плоскость − сдвинутая форма)
function cel2(g, path0, col, o = {}) {
  const lw = o.lw ?? 4, sx = o.sx ?? -9, sy = o.sy ?? -11;
  const path = (c) => { c.beginPath(); path0(c); };
  path(g); g.fillStyle = css(o.shadeCol || shd(col)); g.fill();
  g.save(); path(g); g.clip(); g.translate(sx, sy); path(g); g.fillStyle = css(col); g.fill(); g.restore();
  if (!o.noLine) { path(g); g.lineWidth = lw; g.strokeStyle = css(o.line || ink(col)); g.lineJoin = "round"; g.lineCap = "round"; g.stroke(); }
}
// Конечность (рука, нога, хвост): толстая линия с контуром и тенью снизу
function limb(g, pts, w, col, o = {}) {
  g.lineCap = "round"; g.lineJoin = "round";
  const path = () => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); };
  path(); g.strokeStyle = css(o.line || ink(col)); g.lineWidth = w + (o.lw ?? 4) * 2; g.stroke();
  path(); g.strokeStyle = css(shd(col)); g.lineWidth = w; g.stroke();
  g.save(); g.translate(-w * 0.12, -w * 0.16); path(); g.strokeStyle = css(col); g.lineWidth = w * 0.72; g.stroke(); g.restore();
}
// Двухзвенная IK: плечо s, кисть h, длины a, b; side = +1/-1 — куда смотрит локоть
function ik(s, h, a, b, side) {
  const dx = h[0] - s[0], dy = h[1] - s[1];
  let d = Math.hypot(dx, dy); d = Math.min(d, a + b - 0.01);
  const ang = Math.atan2(dy, dx);
  const cosA = clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1);
  const A = Math.acos(cosA) * side;
  return [s[0] + Math.cos(ang - A) * a, s[1] + Math.sin(ang - A) * a];
}

// ---------- Знаки аниме ----------
// четырёхлучевая искра
function sparkle(g, x, y, r, a = 1, col = C.white) {
  if (a <= 0 || r <= 0) return;
  g.save(); g.globalAlpha *= clamp(a); g.translate(x, y);
  g.beginPath();
  for (let i = 0; i < 4; i++) {
    const an = i * Math.PI / 2;
    g.lineTo(Math.cos(an) * r, Math.sin(an) * r);
    g.lineTo(Math.cos(an + Math.PI / 4) * r * 0.22, Math.sin(an + Math.PI / 4) * r * 0.22);
  }
  g.closePath(); g.fillStyle = css(col); g.fill();
  g.restore();
}
// нота ♪ (рисуем сами: в шрифте её может не быть)
function note(g, x, y, s, rot, col, a = 1, dbl = false) {
  if (a <= 0) return;
  g.save(); g.globalAlpha *= clamp(a); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  g.lineWidth = 9; g.strokeStyle = css(ink(col)); g.fillStyle = css(col); g.lineJoin = "round";
  const head = (hx) => { ell(g, hx, 0, 15, 11, -0.4); };
  const shape = () => {
    head(0); if (dbl) head(44);
    g.moveTo(12, -4); g.rect(10, -62, 7, 58);
    if (dbl) { g.rect(54, -66, 7, 58); g.moveTo(10, -62); g.lineTo(61, -66); g.lineTo(61, -52); g.lineTo(10, -48); g.closePath(); }
    else { g.moveTo(17, -62); g.quadraticCurveTo(40, -48, 34, -24); g.quadraticCurveTo(34, -40, 17, -44); g.closePath(); }
  };
  g.beginPath(); shape(); g.stroke();
  g.beginPath(); shape(); g.fill();
  g.restore();
}
// буква сна Z
function zee(g, x, y, s, a) {
  if (a <= 0) return;
  g.save(); g.globalAlpha *= clamp(a); g.translate(x, y); g.scale(s, s);
  g.font = "800 60px 'M PLUS Rounded 1c'"; g.textAlign = "center"; g.textBaseline = "middle";
  g.lineWidth = 10; g.strokeStyle = css(C.violet); g.lineJoin = "round"; g.strokeText("Z", 0, 0);
  g.fillStyle = css(C.white); g.fillText("Z", 0, 0);
  g.restore();
}
// восклицательный знак над головой
function bang(g, x, y, s, a) {
  if (a <= 0) return;
  g.save(); g.globalAlpha *= clamp(a); g.translate(x, y); g.scale(s, s);
  g.lineWidth = 8; g.strokeStyle = css(ink(C.red)); g.fillStyle = css(C.red); g.lineJoin = "round";
  g.beginPath(); g.moveTo(-14, -80); g.lineTo(14, -80); g.lineTo(7, -18); g.lineTo(-7, -18); g.closePath(); g.stroke(); g.fill();
  ell(g, 0, 0, 11, 11); g.stroke(); g.fill();
  g.restore();
}
// линии скорости по краям кадра (экранные координаты), a — сила
function speedLines(g, t, a, cx = W / 2, cy = H / 2, col = C.white) {
  if (a <= 0) return;
  reset(g);
  g.save(); g.globalAlpha = clamp(a) * 0.85;
  const fr = Math.floor(t * 30 / 2);
  for (let i = 0; i < 90; i++) {
    const an = (i / 90) * TAU + hash(i + fr * 13) * 0.05;
    const r0 = 520 + hash(i * 3 + fr) * 360, r1 = 1500;
    const wd = 3 + hash(i * 7 + fr) * 9;
    const ca = Math.cos(an), sa = Math.sin(an);
    g.beginPath();
    g.moveTo(cx + ca * r0, cy + sa * r0);
    g.lineTo(cx + ca * r1 - sa * wd, cy + sa * r1 + ca * wd);
    g.lineTo(cx + ca * r1 + sa * wd, cy + sa * r1 - ca * wd);
    g.closePath(); g.fillStyle = css(col); g.fill();
  }
  g.restore();
}
// горизонтальные штрихи рывка камеры (whip pan)
function whipStreaks(g, t, a, dirx, diry) {
  if (a <= 0) return;
  reset(g); g.save(); g.globalAlpha = clamp(a);
  const fr = Math.floor(t * 30);
  const ang = Math.atan2(diry, dirx);
  g.translate(W / 2, H / 2); g.rotate(ang);
  for (let i = 0; i < 70; i++) {
    const y = (hash(i * 5 + fr) - 0.5) * 1500, x = (hash(i * 11 + fr * 3) - 0.5) * 2600;
    const len = 300 + hash(i * 17) * 900, th = 2 + hash(i * 23 + fr) * 10;
    g.fillStyle = i % 3 ? "rgba(255,255,255,0.85)" : "rgba(255,200,230,0.8)";
    g.fillRect(x - len / 2, y - th / 2, len, th);
  }
  g.restore();
}
// удар: звезда-вспышка с лучами
function impact(g, x, y, r, a, col = C.white) {
  if (a <= 0) return;
  g.save(); g.globalAlpha *= clamp(a); g.translate(x, y);
  g.beginPath();
  for (let i = 0; i < 20; i++) { const an = i / 20 * TAU, rr2 = i % 2 ? r * 0.45 : r * (0.8 + hash(i) * 0.4); g.lineTo(Math.cos(an) * rr2, Math.sin(an) * rr2); }
  g.closePath(); g.fillStyle = css(col); g.fill(); g.lineWidth = 5; g.strokeStyle = css(C.yellow); g.stroke();
  g.restore();
}
// облачко-пыль для «поп»-смены позы
function puff(g, x, y, r, u) {
  if (u <= 0 || u >= 1) return;
  g.save(); g.globalAlpha *= 1 - easeIn(u);
  for (let i = 0; i < 9; i++) {
    const an = i / 9 * TAU + 0.3, d = r * (0.3 + easeOut(u) * 0.9);
    const rx = r * (0.42 - u * 0.2) * (0.8 + hash(i) * 0.4);
    ell(g, x + Math.cos(an) * d, y + Math.sin(an) * d * 0.6, rx, rx * 0.85);
    g.fillStyle = css(C.white); g.fill(); g.lineWidth = 4; g.strokeStyle = css(C.snowS); g.stroke();
  }
  ell(g, x, y, r * (0.7 - u * 0.4), r * (0.55 - u * 0.3)); g.fillStyle = css(C.white); g.fill();
  g.restore();
}
