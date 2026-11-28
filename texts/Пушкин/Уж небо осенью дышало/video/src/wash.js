// ---------- Акварель и тушь (v2): послойная заливка с деформацией края, грануляция, сухая кисть ----------
// Всё тяжёлое запекается при загрузке; в кадре только drawImage и простые пути.
function gauss(r) { let u = 0; while (u === 0) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * r()); }
function vnoise(x, seed) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i + seed * 13.1), hash(i + 1 + seed * 13.1), u); }
// рекурсивная деформация многоугольника: середина каждого ребра сдвигается по Гауссу пропорционально длине ребра
function deform(pts, depth, vari, r) {
  let p = pts.map((q) => [q[0], q[1], q[2] ?? vari * (0.6 + 0.8 * r())]);
  for (let d = 0; d < depth; d++) {
    const o = [];
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const v = (a[2] + b[2]) / 2;
      o.push(a, [(a[0] + b[0]) / 2 + gauss(r) * len * v * 0.35, (a[1] + b[1]) / 2 + gauss(r) * len * v * 0.35, v * (0.75 + 0.5 * r())]);
    }
    p = o;
  }
  return p;
}
function poly(c, pts) { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let k = 1; k < pts.length; k++) c.lineTo(pts[k][0], pts[k][1]); c.closePath(); }
function bbox(pts, m = 0) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return [x0 - m, y0 - m, x1 + m, y1 + m]; }
// зерно бумаги для грануляции (повторяемая плитка)
let GRAIN = null;
function bakeGrain() {
  const n = 256, c = mk(n, n), x = c.getContext("2d"), id = x.createImageData(n, n), d = id.data, r = rng(77);
  for (let i = 0; i < n * n; i++) { const v = r(); const a = v > 0.72 ? (v - 0.72) / 0.28 : 0; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = 0; d[i * 4 + 3] = Math.round(255 * Math.pow(a, 1.6)); }
  x.putImageData(id, 0, 0);
  // крупнее: кластеры зерна
  const c2 = mk(n * 2, n * 2), x2 = c2.getContext("2d"); x2.imageSmoothingEnabled = true; x2.drawImage(c, 0, 0, n * 2, n * 2); x2.globalAlpha = 0.6; x2.drawImage(c, 0, 0);
  return c2;
}
// акварельная заливка: layers полупрозрачных слоёв одной деформированной формы
function watercolor(c, pts, color, seed, o = {}) {
  GRAIN = GRAIN || bakeGrain();
  const r = rng(seed * 31 + 7);
  const vari = o.vari ?? 0.55, layers = o.layers ?? 30, a = o.alpha ?? 0.05;
  const base = deform(pts, o.depth ?? 2, vari, r);
  const [x0, y0, x1, y1] = bbox(base, 80);
  const w = Math.ceil(x1 - x0), h = Math.ceil(y1 - y0);
  if (w < 2 || h < 2) return;
  const t = mk(w, h), tx = t.getContext("2d");
  tx.translate(-x0, -y0); tx.fillStyle = color;
  for (let L = 0; L < layers; L++) {
    const lp = deform(base, 3, vari * 0.5, r);
    tx.globalAlpha = a; poly(tx, lp); tx.fill();
  }
  // тёмная кайма у высохшего края (пигмент собирается к краю)
  if (o.edge !== 0) { tx.globalAlpha = (o.edge ?? 0.18); tx.strokeStyle = color; tx.lineWidth = 2.2; tx.filter = "blur(0.8px)"; poly(tx, deform(base, 2, vari * 0.3, r)); tx.stroke(); tx.filter = "none"; }
  // грануляция: выбиваем пигмент зерном бумаги
  if (o.gran !== 0) { tx.setTransform(1, 0, 0, 1, 0, 0); tx.globalCompositeOperation = "destination-out"; tx.globalAlpha = o.gran ?? 0.35; tx.fillStyle = tx.createPattern(GRAIN, "repeat"); tx.translate(-(x0 % 512), -(y0 % 512)); tx.fillRect(x0 % 512, y0 % 512, w, h); }
  c.drawImage(t, x0, y0);
}
// пятно-капля как набор точек (база для watercolor)
function blob(cx, cy, rx, ry, n = 10, rot = 0) { const p = []; for (let k = 0; k < n; k++) { const a = rot + (k / n) * TAU; p.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return p; }
function rect(x0, y0, x1, y1) { return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]; }
// «по мокрому»: вертикальная растяжка неба несколькими цветами с мягкими затёками
function wetSky(c, w, h, stops, seed) {
  const gr = c.createLinearGradient(0, 0, 0, h); stops.forEach(([u, col]) => gr.addColorStop(u, col)); c.fillStyle = gr; c.fillRect(0, 0, w, h);
  const r = rng(seed);
  for (let k = 0; k < 9; k++) { const [u, col] = stops[Math.floor(r() * stops.length)]; const y = u * h + (r() - 0.5) * h * 0.15; watercolor(c, blob(r() * w, y, w * (0.25 + r() * 0.3), h * 0.06, 8), col, seed + k, { alpha: 0.03, layers: 22, vari: 0.7, gran: 0.15, edge: 0.08 }); }
}
// мазок тушью сухой кистью: штампы вдоль пути, ширина с нажимом, разрывы к концу; лёгкое растекание по бумаге
function resample(pts, step) {
  const out = [pts[0]]; let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i], d = Math.hypot(bx - ax, by - ay); let s = step - acc;
    while (s <= d) { const u = s / d; out.push([ax + (bx - ax) * u, ay + (by - ay) * u]); s += step; }
    acc = d - (s - step);
  }
  return out;
}
function inkBrush(c, pts, w, color = P.ink, seed = 1, o = {}) {
  if (pts.length < 2) return;
  const q = resample(pts, Math.max(0.8, w * 0.22)), n = q.length, r = rng(seed);
  c.save(); c.fillStyle = color;
  if (o.bleed !== false) { c.globalAlpha = 0.12; c.strokeStyle = color; c.lineWidth = w * 1.9; c.lineCap = "round"; c.lineJoin = "round"; c.filter = "blur(1.5px)"; c.beginPath(); q.forEach((p, k) => (k ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.stroke(); c.filter = "none"; }
  const dry = o.dry ?? 0.25, head = o.head ?? 0.15, tail = o.tail ?? 0.35;
  for (let k = 0; k < n; k++) {
    const u = k / Math.max(1, n - 1);
    const press = Math.min(1, u / head, (1 - u) / tail) ;
    const ww = w * (0.18 + 0.82 * Math.pow(clamp(press), 0.7)) * (0.85 + 0.3 * vnoise(k * 0.15, seed));
    // сухая кисть: к хвосту мазок рвётся
    if (u > 1 - tail && vnoise(k * 0.9, seed + 5) < dry * (u - (1 - tail)) / tail * 2) continue;
    c.globalAlpha = o.alpha ?? 0.92;
    c.beginPath(); c.ellipse(q[k][0], q[k][1], ww / 2, ww / 2 * 0.8, 0, 0, TAU); c.fill();
  }
  c.restore();
}
// быстрый мазок для анимации (в кадре): переменная толщина отрезками
function inkStroke(c, pts, w, color = P.ink, o = {}) {
  const n = pts.length; if (n < 2) return;
  c.save(); c.strokeStyle = color; c.lineCap = "round"; c.lineJoin = "round";
  for (let k = 0; k < n - 1; k++) {
    const u = (k + 0.5) / (n - 1);
    const taper = o.flat ? 1 : Math.pow(Math.sin(Math.PI * clamp(u)), 0.5);
    c.lineWidth = Math.max(0.6, w * (0.3 + 0.7 * taper) * (1 + 0.18 * (hash2(k, o.seed ?? 1) - 0.5)));
    c.beginPath(); c.moveTo(pts[k][0], pts[k][1]); c.lineTo(pts[k + 1][0], pts[k + 1][1]); c.stroke();
  }
  c.restore();
}
function bez(p0, p1, p2, p3, n = 16) {
  const out = [];
  for (let k = 0; k <= n; k++) { const u = k / n, v = 1 - u; out.push([v * v * v * p0[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * p3[0], v * v * v * p0[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * p3[1]]); }
  return out;
}
function splatter(c, x, y, rad, n, color, seed, a = 0.8) {
  const q = rng(seed); c.save(); c.fillStyle = color;
  for (let k = 0; k < n; k++) { const ang = q() * TAU, d = Math.pow(q(), 0.6) * rad, s = 0.8 + q() * 4.5 * (1 - d / rad); c.globalAlpha = a * (0.4 + 0.6 * q()); c.beginPath(); c.arc(x + Math.cos(ang) * d, y + Math.sin(ang) * d, s, 0, TAU); c.fill(); }
  c.restore();
}
// бумага: холодное прессование — светотень зерна, волокна (кладётся «умножением» на весь кадр)
let PAPER = null;
function bakePaper() {
  const c = mk(W, H), x = c.getContext("2d"), r = rng(11);
  x.fillStyle = "#ffffff"; x.fillRect(0, 0, W, H);
  x.filter = "blur(50px)";
  for (let k = 0; k < 70; k++) { x.globalAlpha = 0.07; x.fillStyle = r() < 0.5 ? "#d8c49c" : "#fffaf0"; x.beginPath(); x.arc(r() * W, r() * H, 90 + r() * 260, 0, TAU); x.fill(); }
  x.filter = "none"; x.globalAlpha = 1;
  // зерно: мягкая крупная фактура (сглаженный шум) + мелкий шум
  const nw = 480, nh = 270, nc = mk(nw, nh), nx = nc.getContext("2d"), nid = nx.createImageData(nw, nh);
  for (let i = 0; i < nw * nh; i++) { const v = 200 + r() * 55; nid.data[i * 4] = nid.data[i * 4 + 1] = v; nid.data[i * 4 + 2] = v - 6; nid.data[i * 4 + 3] = 255; }
  nx.putImageData(nid, 0, 0);
  x.globalCompositeOperation = "multiply"; x.globalAlpha = 0.35; x.imageSmoothingEnabled = true; x.drawImage(nc, 0, 0, W, H);
  x.globalCompositeOperation = "source-over"; x.globalAlpha = 1;
  const id = x.getImageData(0, 0, W, H), d = id.data;
  for (let i = 0; i < d.length; i += 4) { const s2 = (r() - 0.5) * 9; d[i] += s2; d[i + 1] += s2; d[i + 2] += s2; }
  x.putImageData(id, 0, 0);
  x.strokeStyle = "rgba(150,120,80,0.10)"; x.lineWidth = 1;
  for (let k = 0; k < 600; k++) { const px = r() * W, py = r() * H, a = r() * TAU, l = 6 + r() * 22; x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a + 1) * l * 0.5, py + Math.sin(a + 1) * l * 0.5, px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke(); }
  return c;
}
function bake(w, h, fn) { const c = mk(w, h); fn(c.getContext("2d"), w, h); return c; }
// пигментная пятнистость для героев (накладывается на гуся source-atop)
let MOTTLE = null;
function bakeMottle() {
  return bake(1024, 1024, (c) => {
    const r = rng(303);
    c.filter = "blur(10px)";
    for (let k = 0; k < 260; k++) { c.globalAlpha = 0.18; c.fillStyle = r() < 0.55 ? "#3a3026" : "#ffffff"; c.beginPath(); c.ellipse(r() * 1024, r() * 1024, 10 + r() * 50, 8 + r() * 30, r() * 3, 0, TAU); c.fill(); }
    c.filter = "none";
    c.globalAlpha = 0.5; c.fillStyle = c.createPattern(GRAIN || (GRAIN = bakeGrain()), "repeat"); c.fillRect(0, 0, 1024, 1024);
  });
}
