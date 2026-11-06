// ---------- Небо, облака (цел-шейдинг), молнии, дождь ----------
function skyGrad(c, top, mid, low, y0 = 0, y1 = H) {
  const g = c.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, top); g.addColorStop(0.55, mid); g.addColorStop(1, low);
  c.fillStyle = g; c.fillRect(-W, y0 - H, W * 3, (y1 - y0) + H * 2);
}

// облако заранее рисуется в offscreen-canvas: тень, свет со смещением, светлая кромка, тонкий контур
const CLOUD_PAL = {
  white: { shade: "#b9cdf2", light: "#ffffff", mid: "#e3ecfc", rim: "#ffffff", line: "#7f95c9" },
  storm: { shade: "#2e2f5c", light: "#6a6ca8", mid: "#4a4b82", rim: "#b8bcf0", line: "#1d1f42" },
  gold: { shade: "#f1b56b", light: "#fff8e6", mid: "#ffe3b0", rim: "#ffffff", line: "#d48b4a" },
  dusk: { shade: "#8a8fc4", light: "#f4f1ff", mid: "#c9cbef", rim: "#ffffff", line: "#6a6fa8" },
};
function makeCloud(seed, w, h, pal) {
  const P = CLOUD_PAL[pal], r = mulberry32(seed), pad = Math.ceil(h * 0.42) + 30;
  const cv = mkCanvas(w + pad * 2, h + pad * 2), c = cv.getContext("2d");
  c.translate(pad, pad);
  const puffs = [];
  const n = 7 + Math.floor(r() * 4);
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n, x = w * (0.08 + 0.84 * u) + (r() - 0.5) * w * 0.06;
    const top = Math.sin(u * Math.PI);
    const rr = h * (0.22 + 0.3 * top * (0.7 + 0.3 * r()));
    puffs.push([x, h - rr * (0.75 + 0.5 * top) - h * 0.05, rr]);
  }
  for (let i = 0; i < 4; i++) { const u = 0.25 + r() * 0.5; puffs.push([w * u, h * (0.3 + r() * 0.2), h * (0.24 + r() * 0.12)]); }
  const base = () => { c.beginPath(); for (const [x, y, rr] of puffs) { c.moveTo(x + rr, y); c.arc(x, y, rr, 0, TAU); } c.rect(w * 0.06, h * 0.62, w * 0.88, h * 0.3); };
  // контур
  c.save(); base(); c.lineWidth = 7; c.strokeStyle = P.line; c.stroke(); c.restore();
  c.save(); base(); c.fillStyle = P.shade; c.fill(); c.clip();
  c.fillStyle = P.mid; c.beginPath(); for (const [x, y, rr] of puffs) { c.moveTo(x - rr * 0.08 + rr * 0.92, y - rr * 0.1); c.arc(x - rr * 0.08, y - rr * 0.1, rr * 0.92, 0, TAU); } c.fill();
  c.fillStyle = P.light; c.beginPath(); for (const [x, y, rr] of puffs) { c.moveTo(x - rr * 0.18 + rr * 0.78, y - rr * 0.22); c.arc(x - rr * 0.18, y - rr * 0.22, rr * 0.78, 0, TAU); } c.fill();
  // кромка-блик
  c.strokeStyle = P.rim; c.lineWidth = 5; c.globalAlpha = 0.9;
  for (const [x, y, rr] of puffs) {
    const a = Math.PI * 1.35, px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    if (puffs.some(([x2, y2, r2]) => (x2 !== x || y2 !== y) && Math.hypot(px - x2, py - y2) < r2 - 4)) continue;
    c.beginPath(); c.arc(x, y, rr - 6, Math.PI * 1.15, Math.PI * 1.55); c.stroke();
  }
  c.restore();
  return { cv, w, h, pad };
}
// нарисовать облако с центром низа в (x, y); sq — «подпрыгивание» (сжатие/растяжение)
function drawCloud(c, cl, x, y, s = 1, sq = 0, a = 1) {
  if (a <= 0) return;
  c.save(); c.globalAlpha *= a; c.translate(x, y); c.scale(s * (1 + sq * 0.12), s * (1 - sq * 0.14));
  c.drawImage(cl.cv, -cl.w / 2 - cl.pad, -cl.h - cl.pad);
  c.restore();
}

// ---------- Молния: ломаная с ветками ----------
function makeBolt(seed, x0, y0, x1, y1, rough = 1) {
  const r = mulberry32(seed);
  function seg(ax, ay, bx, by, depth) {
    const n = Math.max(6, Math.round(Math.hypot(bx - ax, by - ay) / 38));
    const pts = [[ax, ay]], nx = -(by - ay), ny = bx - ax, L = Math.hypot(nx, ny) || 1;
    for (let i = 1; i < n; i++) { const u = i / n, off = (r() - 0.5) * 70 * rough * (depth ? 0.6 : 1);
      pts.push([lerp(ax, bx, u) + nx / L * off, lerp(ay, by, u) + ny / L * off]); }
    pts.push([bx, by]);
    return pts;
  }
  const main = seg(x0, y0, x1, y1, 0), branches = [];
  for (let k = 0; k < 3; k++) {
    const i = 2 + Math.floor(r() * (main.length - 4)), p = main[i];
    const ang = Math.atan2(y1 - y0, x1 - x0) + (r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.5), len = 120 + r() * 200;
    branches.push({ at: i / main.length, pts: seg(p[0], p[1], p[0] + Math.cos(ang) * len, p[1] + Math.sin(ang) * len, 1) });
  }
  return { main, branches };
}
function strokePts(c, pts, upto) {
  const n = Math.max(2, Math.ceil(pts.length * upto));
  c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < n && i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.stroke();
}
// a — яркость (0..1), grow — доля пути (удар сверху вниз)
function drawBolt(c, b, a, grow = 1, col = "#fff6a8", scale = 1) {
  if (a <= 0 || grow <= 0) return;
  c.save(); c.lineCap = "round"; c.lineJoin = "round";
  const layers = [[44 * scale, "rgba(140,170,255,0.18)"], [24 * scale, "rgba(190,210,255,0.35)"], [12 * scale, col], [5 * scale, "#ffffff"]];
  for (const [lw, st] of layers) {
    c.globalAlpha = a; c.lineWidth = lw; c.strokeStyle = st;
    strokePts(c, b.main, grow);
    for (const br of b.branches) if (grow > br.at) { c.lineWidth = lw * 0.55; strokePts(c, br.pts, clamp((grow - br.at) / (1 - br.at), 0, 1)); c.lineWidth = lw; }
  }
  c.restore();
}
// вспышка молнии во времени: резкий пик и затухание с повторным «мерцанием»
function flashCurve(t, a) { const d = t - a; if (d < 0 || d > 0.7) return 0; return d < 0.05 ? d / 0.05 : Math.max(0, 1 - (d - 0.05) / 0.55) * (0.75 + 0.25 * Math.cos(d * 40)); }
// кольца звуковой волны (гром)
function shockRings(c, x, y, t, a0, col = "rgba(255,255,255,0.9)") {
  for (let k = 0; k < 3; k++) {
    const u = prog(t, a0 + k * 0.12, a0 + k * 0.12 + 0.9); if (u <= 0 || u >= 1) continue;
    c.save(); c.globalAlpha = (1 - u) * 0.8; c.strokeStyle = col; c.lineWidth = 10 * (1 - u) + 2;
    ell(c, x, y, 60 + u * 520, (60 + u * 520) * 0.55); c.stroke(); c.restore();
  }
}

// ---------- Дождь ----------
const RAIN = (() => { const r = mulberry32(911), a = []; for (let i = 0; i < 260; i++) a.push([r() * 2400 - 240, r(), 0.6 + r() * 0.8, r()]); return a; })();
// k — сила (0..1), gold — доля «золотых нитей», ang — наклон
function drawRain(c, t, k, gold = 0, ang = 0.18, speed = 1) {
  if (k <= 0) return;
  c.save(); c.lineCap = "round";
  const n = Math.floor(RAIN.length * clamp(k, 0, 1));
  for (let i = 0; i < n; i++) {
    const [x0, y0, z, g] = RAIN[i];
    const len = 60 * z + 30, sp = 1900 * z * speed;
    const y = ((y0 * (H + 300) + t * sp) % (H + 300)) - 150, x = x0 + (y + 150) * ang;
    const isG = g < gold;
    c.globalAlpha = (0.35 + 0.4 * z) * Math.min(1, k * 1.5);
    c.strokeStyle = isG ? (g < gold * 0.5 ? "#ffe680" : "#fff3b8") : "rgba(225,240,255,1)";
    c.lineWidth = (isG ? 3.4 : 2.4) * z;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + len * ang, y + len); c.stroke();
  }
  c.restore();
}
// лучи солнца веером
function sunRays(c, x, y, a, t, n = 9, len = 1600, col = "rgba(255,240,170,") {
  if (a <= 0) return;
  c.save(); c.translate(x, y); c.rotate(t * 0.05);
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * TAU, w = 0.07 + 0.04 * Math.sin(i * 3.1);
    const g = c.createLinearGradient(0, 0, Math.cos(ang) * len, Math.sin(ang) * len);
    g.addColorStop(0, col + (0.55 * a) + ")"); g.addColorStop(1, col + "0)");
    c.fillStyle = g; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, len, ang - w, ang + w); c.closePath(); c.fill();
  }
  c.restore();
}
function sunDisk(c, x, y, r, a = 1) {
  glow(c, x, y, r * 4, "rgba(255,244,190,0.9)", a);
  c.save(); c.globalAlpha *= a; circle(c, x, y, r); c.fillStyle = "#fffbe6"; c.fill(); c.restore();
}
