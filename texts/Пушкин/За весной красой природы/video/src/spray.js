// ---------- Распыл: заливка с пылью по краю, потёки, проявление по ходу баллончика ----------
const SC = 2; // куски стены рисуются в 2× и уменьшаются при выводе — край краски чёткий
// заливка формы краской из баллончика: мягкий ореол, пыль, плотная заливка, блик, контур, потёки
// path(c) — строит путь в координатах куска; bb = [x, y, w, h] — рамка формы (для пыли)
function spray(c, path, color, o = {}) {
  const seed = o.seed || 1, r = rng(seed);
  const halo = o.halo == null ? 14 : o.halo;
  // ореол распыла
  if (halo > 0) {
    c.save(); c.filter = `blur(${halo * SC}px)`; c.globalAlpha = o.haloA || 0.55;
    c.fillStyle = color; c.beginPath(); path(c); c.fill(); c.restore();
  }
  // пыль: точки вокруг края (только там, где ореол)
  if (o.bb && o.dust !== 0) {
    const [bx, by, bw, bh] = o.bb, pad = halo * 2.2 + 10;
    const t = mk((bw + pad * 2) * SC, (bh + pad * 2) * SC), tc = t.getContext("2d");
    tc.setTransform(SC, 0, 0, SC, (pad - bx) * SC, (pad - by) * SC);
    tc.fillStyle = color;
    const n = Math.min(2600, Math.round((bw + bh) * (o.dust || 2.4)));
    for (let i = 0; i < n; i++) {
      const x = bx - pad + r() * (bw + pad * 2), y = by - pad + r() * (bh + pad * 2), s = 0.6 + r() * r() * 2.6;
      tc.globalAlpha = 0.4 + r() * 0.6; tc.beginPath(); tc.arc(x, y, s, 0, TAU); tc.fill();
    }
    tc.globalAlpha = 1; tc.globalCompositeOperation = "destination-in";
    tc.filter = `blur(${(halo + 6) * SC}px)`; tc.beginPath(); path(tc); tc.lineWidth = 2; tc.fill();
    c.save(); c.drawImage(t, bx - pad, by - pad, bw + pad * 2, bh + pad * 2); c.restore();
  }
  // плотная заливка
  c.save(); c.fillStyle = o.fill || color; c.beginPath(); path(c); c.fill();
  // зерно краски внутри формы
  if (o.bb && o.grain !== 0) {
    c.save(); c.clip();
    const [bx, by, bw, bh] = o.bb, n = Math.min(4000, Math.round(bw * bh / 260));
    for (let i = 0; i < n; i++) { c.fillStyle = r() < 0.5 ? "rgba(0,0,0,0.10)" : "rgba(255,255,255,0.13)"; c.beginPath(); c.arc(bx + r() * bw, by + r() * bh, 0.8 + r() * 2.2, 0, TAU); c.fill(); }
    c.restore();
  }
  // блик и тень внутри формы
  if (o.shade !== false && o.bb) {
    c.clip();
    const [bx, by, bw, bh] = o.bb;
    c.filter = `blur(${Math.max(6, bh * 0.08) * SC}px)`;
    c.globalAlpha = o.shadeA || 0.28; c.fillStyle = "#000";
    c.beginPath(); c.ellipse(bx + bw * 0.62, by + bh * 1.05, bw * 0.7, bh * 0.45, 0, 0, TAU); c.fill();
    c.globalAlpha = o.lightA || 0.35; c.fillStyle = "#fff";
    c.beginPath(); c.ellipse(bx + bw * 0.3, by + bh * 0.12, bw * 0.4, bh * 0.22, -0.2, 0, TAU); c.fill();
  }
  c.restore();
  // контур
  if (o.line) {
    c.save(); c.strokeStyle = o.lineC || P.ink; c.lineWidth = o.line; c.lineJoin = "round"; c.lineCap = "round";
    c.beginPath(); path(c); c.stroke(); c.restore();
  }
  // потёки
  if (o.drips) for (const d of o.drips) drip(c, d[0], d[1], d[2], d[3] || 6, o.dripC || color);
}
function drip(c, x, y, len, w, color) {
  c.save(); c.fillStyle = color;
  c.beginPath(); c.moveTo(x - w / 2, y - 2); c.lineTo(x - w * 0.38, y + len); c.lineTo(x + w * 0.38, y + len); c.lineTo(x + w / 2, y - 2); c.fill();
  c.beginPath(); c.arc(x, y + len, w * 0.62, 0, TAU); c.fill();
  c.restore();
}
// мазок баллончиком по линии (ветка, луч, волна): мягкий край + плотная середина
function sprayStroke(c, pts, w, color, o = {}) {
  const path = (cc) => { cc.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) cc.lineTo(pts[i][0], pts[i][1]); };
  c.save(); c.lineCap = "round"; c.lineJoin = "round";
  c.filter = `blur(${(o.halo || w * 0.35) * SC}px)`; c.globalAlpha = o.haloA || 0.5; c.strokeStyle = color; c.lineWidth = w * 1.5;
  c.beginPath(); path(c); c.stroke();
  c.filter = "none"; c.globalAlpha = o.a || 1; c.lineWidth = w; c.beginPath(); path(c); c.stroke();
  c.restore();
}
// кусок стены: заранее нарисованная картинка + проявление зигзагом баллончика
class Piece {
  constructor(x, y, w, h, draw, o = {}) {
    this.x = x; this.y = y; this.w = w; this.h = h;
    // поле вокруг рамки: ореол, пыль и края пухлых форм не обрезаются
    const pad = this.pad = o.pad == null ? 110 : o.pad;
    this.cv = mk((w + pad * 2) * SC, (h + pad * 2) * SC);
    const c = this.cv.getContext("2d");
    c.setTransform(SC, 0, 0, SC, pad * SC, pad * SC);
    draw(c, w, h);
    this.t0 = o.t0 || 0; this.t1 = o.t1 || 0.01;
    this.cans = o.cans || [o.can || P.pink]; this.can = this.cans[0];
    this.seed = (x * 0.013 + y * 0.007) % 97;
    // пути баллончиков: зигзаг по рядам. Два баллончика — от середины в разные стороны, их полосы заходят друг на друга
    const rows = o.rows || Math.max(2, Math.round(h / 170)), rh = h / rows;
    const zig = (xa, xb, ph) => {
      const pts = [], steps = Math.max(4, Math.round(Math.abs(xb - xa) / 60));
      for (let i = 0; i < rows; i++) {
        const fwd = i % 2 === 0;
        for (let k = 0; k <= steps; k++) {
          const u = k / steps, xx = lerp(fwd ? xa : xb, fwd ? xb : xa, u);
          pts.push([xx, rh * (i + 0.5) + Math.sin(xx * 0.004 + i * 1.7 + ph) * rh * 0.3]);
        }
      }
      let L = 0; const cum = [0];
      for (let i = 1; i < pts.length; i++) { L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); cum.push(L); }
      return { pts, cum, L };
    };
    const ex = pad * 0.6;
    this.paths = this.cans.length === 2
      ? [zig(w / 2 + 90, -ex, 0.5), zig(w / 2 - 90, w + ex, 2.1)]
      : [zig(-ex, w + ex, 0.9)];
    this.rr = rh * 0.95;
  }
  prog(t) { return easeIO(inv(this.t0, this.t1, t)); }
  at(l, k = 0) { // точка пути k на длине l
    const P_ = this.paths[k], c = P_.cum; let i = 1;
    while (i < c.length - 1 && c[i] < l) i++;
    const u = clamp((l - c[i - 1]) / (c[i] - c[i - 1] || 1));
    return [lerp(P_.pts[i - 1][0], P_.pts[i][0], u), lerp(P_.pts[i - 1][1], P_.pts[i][1], u)];
  }
  // где сейчас баллончик k (мир) или null
  nozzle(t, k = 0) {
    if (t < this.t0 || t > this.t1) return null;
    const q = this.at(this.prog(t) * this.paths[k].L, k);
    return [this.x + q[0], this.y + q[1]];
  }
  draw(g, t, alpha = 1) {
    const p = this.prog(t);
    if (p <= 0) return;
    g.save(); g.globalAlpha *= alpha;
    const pd = this.pad, W2 = this.w + pd * 2, H2 = this.h + pd * 2;
    if (p >= 1) { g.drawImage(this.cv, this.x - pd, this.y - pd, W2, H2); g.restore(); return; }
    const m = maskFor(this.cv.width, this.cv.height), mc = m.getContext("2d");
    reset(mc); mc.clearRect(0, 0, this.cv.width, this.cv.height);
    mc.setTransform(SC, 0, 0, SC, pd * SC, pd * SC);
    const step = this.rr * 0.4, sd = this.seed;
    for (let k = 0; k < this.paths.length; k++) {
      const l = p * this.paths[k].L;
      for (let s = 0, j = 0; s <= l; s += step, j++) {
        // неровный край: радиус и сдвиг пятна гуляют, вокруг — брызги
        const q = this.at(s, k), h1 = hash2(j + sd, k * 31 + 1), h2 = hash2(j * 3 + sd, k * 17 + 5);
        const rr = this.rr * (0.7 + h1 * 0.6), cx = q[0] + (h2 - 0.5) * this.rr * 0.5, cy = q[1] + (hash2(j + 7, k + sd) - 0.5) * this.rr * 0.7;
        const gr = mc.createRadialGradient(cx, cy, rr * 0.55, cx, cy, rr);
        gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(1, "rgba(0,0,0,0)");
        mc.fillStyle = gr; mc.fillRect(cx - rr, cy - rr, rr * 2, rr * 2);
        mc.fillStyle = "#000";
        for (let d = 0; d < 14; d++) {
          const a = hash2(j * 14 + d, k + sd) * TAU, rd = rr * (0.85 + hash2(d, j + k * 7) * 0.5), sz = 2 + hash2(j + d * 5, sd) * 9;
          mc.globalAlpha = 0.5 + 0.5 * hash2(d + j, sd + 3);
          mc.beginPath(); mc.arc(cx + Math.cos(a) * rd, cy + Math.sin(a) * rd, sz, 0, TAU); mc.fill();
        }
        mc.globalAlpha = 1;
      }
    }
    mc.setTransform(1, 0, 0, 1, 0, 0);
    mc.globalCompositeOperation = "source-in";
    mc.drawImage(this.cv, 0, 0);
    g.drawImage(m, 0, 0, this.cv.width, this.cv.height, this.x - pd, this.y - pd, W2, H2);
    g.restore();
  }
}
// маска проявления: растёт под самый большой кусок (раньше была меньше куска тумана — правый край проявлялся рывком)
let MASK = mk(16, 16);
function maskFor(w, h) { if (MASK.width < w || MASK.height < h) MASK = mk(Math.max(w, MASK.width), Math.max(h, MASK.height)); return MASK; }
// баллончик: x, y — колпачок с соплом; ang — наклон; color — колпачок и полоса
function drawCan(g, x, y, ang, color, s = 1, spraying = false, t = 0) {
  g.save(); g.translate(x, y); g.rotate(ang); g.scale(s, s);
  // колпачок в (0, 0), корпус вниз
  // тень
  g.save(); g.globalAlpha = 0.25; g.fillStyle = "#000"; g.filter = "blur(10px)";
  g.beginPath(); g.roundRect(-38, 10, 92, 230, 26); g.fill(); g.restore();
  // корпус
  const gr = g.createLinearGradient(-42, 0, 42, 0);
  gr.addColorStop(0, "#5c6270"); gr.addColorStop(0.35, "#e9edf3"); gr.addColorStop(0.55, "#b9c0cc"); gr.addColorStop(1, "#4a4f5c");
  g.fillStyle = gr; g.beginPath(); g.roundRect(-42, 20, 84, 220, 18); g.fill();
  g.strokeStyle = P.ink; g.lineWidth = 5; g.stroke();
  // цветная полоса этикетки
  g.save(); g.beginPath(); g.roundRect(-42, 20, 84, 220, 18); g.clip();
  g.fillStyle = color; g.fillRect(-44, 90, 88, 90);
  g.globalAlpha = 0.35; g.fillStyle = "#fff"; g.fillRect(-22, 90, 12, 90);
  g.globalAlpha = 1; g.fillStyle = P.ink; g.fillRect(-44, 86, 88, 5); g.fillRect(-44, 179, 88, 5);
  g.restore();
  // плечо и колпачок-распылитель
  g.fillStyle = "#cfd5de"; g.beginPath(); g.moveTo(-36, 24); g.quadraticCurveTo(0, -6, 36, 24); g.closePath(); g.fill();
  g.strokeStyle = P.ink; g.lineWidth = 5; g.stroke();
  g.fillStyle = color; g.beginPath(); g.roundRect(-16, -14, 32, 22, 6); g.fill(); g.stroke();
  g.fillStyle = P.ink; g.beginPath(); g.arc(0, -16, 5, 0, TAU); g.fill();
  g.restore();
}
// облачко распыла от сопла к точке на стене
function drawMist(g, nx, ny, tx, ty, color, t, n = 46) {
  const fr = Math.floor(t * 30);
  g.save(); g.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const u = hash2(fr, i), sp = (hash2(i, fr + 7) - 0.5) * (0.25 + u * 0.9);
    const x = lerp(nx, tx, u) + (ty - ny) * sp * 0.5, y = lerp(ny, ty, u) - (tx - nx) * sp * 0.5;
    g.globalAlpha = 0.25 + 0.5 * hash2(i * 3, fr);
    g.beginPath(); g.arc(x, y, 1.5 + u * 5, 0, TAU); g.fill();
  }
  g.globalAlpha = 0.35; g.filter = "blur(14px)";
  g.beginPath(); g.arc(tx, ty, 34, 0, TAU); g.fill();
  g.restore();
}
