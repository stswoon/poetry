// ---------- Окружение: небо, холмы, лес, туман, частицы, свет, огонь, плёнка ----------
const SPR = {}; // заранее нарисованные спрайты (туман, зерно, дым)

function buildSprites() {
  const R = mulberry32(1822);
  // туман: мягкие пятна на полупрозрачном поле
  for (let k = 0; k < 3; k++) {
    const f = mkCanvas(1400, 360), g = f.getContext("2d");
    for (let i = 0; i < 70; i++) {
      const x = R() * 1400, y = 120 + R() * 140, r = 60 + R() * 150;
      g.fillStyle = radial(g, x, y, 0, r, [[0, "rgba(255,255,255,0.20)"], [1, "rgba(255,255,255,0)"]]);
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    g.globalCompositeOperation = "destination-in";
    g.fillStyle = linear(g, 0, 0, 0, 360, [[0, "rgba(0,0,0,0)"], [0.3, "rgba(0,0,0,1)"], [0.7, "rgba(0,0,0,1)"], [1, "rgba(0,0,0,0)"]]); g.fillRect(0, 0, 1400, 360);
    g.fillStyle = linear(g, 0, 0, 1400, 0, [[0, "rgba(0,0,0,0)"], [0.15, "rgba(0,0,0,1)"], [0.85, "rgba(0,0,0,1)"], [1, "rgba(0,0,0,0)"]]); g.fillRect(0, 0, 1400, 360);
    SPR["fog" + k] = f;
  }
  // зерно плёнки: 6 кадров шума
  for (let k = 0; k < 6; k++) {
    const gc = mkCanvas(640, 360), g = gc.getContext("2d"), im = g.createImageData(640, 360);
    for (let i = 0; i < im.data.length; i += 4) { const v = R() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
    g.putImageData(im, 0, 0); SPR["grain" + k] = gc;
  }
  // клуб дыма
  const s = mkCanvas(256, 256), g = s.getContext("2d");
  for (let i = 0; i < 26; i++) {
    const x = 128 + (R() - 0.5) * 120, y = 128 + (R() - 0.5) * 120, r = 30 + R() * 60;
    g.fillStyle = radial(g, x, y, 0, r, [[0, "rgba(255,255,255,0.16)"], [1, "rgba(255,255,255,0)"]]);
    g.fillRect(0, 0, 256, 256);
  }
  SPR.smoke = s;
  const d = mkCanvas(256, 256), h = d.getContext("2d");
  for (let i = 0; i < 26; i++) {
    const x = 128 + (R() - 0.5) * 120, y = 128 + (R() - 0.5) * 120, r = 30 + R() * 60;
    h.fillStyle = radial(h, x, y, 0, r, [[0, "rgba(22,18,22,0.30)"], [1, "rgba(22,18,22,0)"]]);
    h.fillRect(0, 0, 256, 256);
  }
  SPR.smokeD = d;
  SPR.off = mkCanvas(W, H);
}
// фигуры, нарисованные на отдельном холсте и наложенные целиком (без наложения перекрытий)
function ghost(c, draw, alpha, op = "source-over") {
  const o = SPR.off, g = o.getContext("2d"); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
  g.setTransform(c.getTransform()); draw(g); g.setTransform(1, 0, 0, 1, 0, 0);
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = alpha; c.globalCompositeOperation = op; c.drawImage(o, 0, 0); c.restore();
}

// небо: вертикальный градиент + светило
const SKY = {
  sunset: ["#14202e", "#3a3346", "#9a4a3a", "#f08a3c", "#ffd08a"],
  dusk: ["#0a1320", "#1c2a3e", "#4a3c4e", "#a8583c", "#e0904e"],
  storm: ["#05080d", "#0d1720", "#1a2a33", "#2c3c44", "#45565c"],
  night: ["#03060b", "#08111c", "#0f1d2c", "#1b2d3d", "#2a3e4e"],
  forest: ["#050a0c", "#0b1a1c", "#143034", "#245056", "#3f6e70"],
  dawn: ["#1a2636", "#4a5468", "#9a8a96", "#e8b49a", "#ffe2c0"],
  gold: ["#1a1208", "#4a2c10", "#a0581c", "#f0a040", "#ffe0a0"],
  sea: ["#04090f", "#0a1824", "#16303e", "#2e5260", "#5a7c84"],
};
function sky(c, kind, horizon = 700, y0 = 0) {
  const s = SKY[kind];
  c.fillStyle = linear(c, 0, y0, 0, horizon, [[0, s[0]], [0.35, s[1]], [0.65, s[2]], [0.88, s[3]], [1, s[4]]]);
  c.fillRect(-2000, y0 - 2000, W + 4000, horizon - y0 + 2000);
  c.fillStyle = s[4]; c.fillRect(-2000, horizon - 1, W + 4000, 2400);
}
function sunDisc(c, x, y, r, col = "#ffe4a8", glow = "rgba(255,170,80,0.55)", k = 1) {
  c.save(); c.globalCompositeOperation = "lighter";
  c.fillStyle = radial(c, x, y, 0, r * 9, [[0, glow], [0.25, "rgba(255,120,50,0.18)"], [1, "rgba(255,90,40,0)"]]);
  c.globalAlpha = k; c.fillRect(x - r * 9, y - r * 9, r * 18, r * 18); c.restore();
  c.save(); c.globalAlpha = k; c.fillStyle = col; circle(c, x, y, r); c.fill(); c.restore();
}
function moonDisc(c, x, y, r, k = 1) {
  c.save(); c.globalAlpha = k; c.globalCompositeOperation = "lighter";
  c.fillStyle = radial(c, x, y, 0, r * 7, [[0, "rgba(190,215,235,0.45)"], [0.3, "rgba(120,160,200,0.12)"], [1, "rgba(80,120,160,0)"]]);
  c.fillRect(x - r * 7, y - r * 7, r * 14, r * 14); c.restore();
  c.save(); c.globalAlpha = k; c.fillStyle = C.moon; circle(c, x, y, r); c.fill();
  c.fillStyle = "rgba(150,170,190,0.35)"; circle(c, x - r * 0.3, y - r * 0.2, r * 0.22); c.fill(); circle(c, x + r * 0.25, y + r * 0.3, r * 0.15); c.fill(); c.restore();
}
function stars(c, seed, n, k = 1, h = 600) {
  const R = mulberry32(seed); c.save(); c.fillStyle = "#dfe8ff";
  for (let i = 0; i < n; i++) { const x = R() * W, y = R() * h, r = R() * 1.6 + 0.4; c.globalAlpha = k * (0.3 + R() * 0.7); c.fillRect(x, y, r, r); }
  c.restore();
}
// гребень холмов: процедурный профиль, заливка вниз
function ridgeY(x, seed, amp, f) { return amp * (0.55 * noise1(x * f + seed) + 0.3 * noise1(x * f * 2.3 + seed * 3.1) + 0.15 * noise1(x * f * 5.1 + seed * 7.7)); }
function ridge(c, seed, baseY, amp, col, f = 0.0018, x0 = -900, x1 = W + 900, step = 10) {
  c.beginPath(); c.moveTo(x0, H + 1200);
  for (let x = x0; x <= x1; x += step) c.lineTo(x, baseY - ridgeY(x, seed, amp, f));
  c.lineTo(x1, H + 1200); c.closePath(); c.fillStyle = col; c.fill();
}
// дымка над слоем (воздушная перспектива)
function haze(c, y, h, col, a) { c.fillStyle = linear(c, 0, y - h, 0, y, [[0, rgba(col, 0)], [1, rgba(col, a)]]); c.fillRect(-2000, y - h, W + 4000, h); }
// ковыль: метёлки, клонятся по ветру
function featherGrass(c, seed, y, n, len, col, t, wind = 1, x0 = -300, x1 = W + 300, lw = 2) {
  const R = mulberry32(seed); c.save(); c.strokeStyle = col; c.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const x = lerp(x0, x1, R()), l = len * (0.6 + R() * 0.6), ph = R() * TAU, yy = y + R() * 26;
    const b = (0.35 + 0.25 * Math.sin(t * 1.3 + x * 0.004 + ph)) * wind;
    c.lineWidth = lw * (0.6 + R() * 0.8); c.globalAlpha = 0.55 + R() * 0.45;
    c.beginPath(); c.moveTo(x, yy); c.quadraticCurveTo(x + b * l * 0.25, yy - l * 0.6, x + b * l * 0.9, yy - l * (1 - b * 0.35)); c.stroke();
  }
  c.restore();
}
// ель-силуэт
function spruce(c, x, y, h, col) {
  c.fillStyle = col; c.beginPath(); const w = h * 0.34;
  c.moveTo(x, y - h);
  for (let i = 1; i <= 6; i++) { const yy = y - h + (h * 0.92 * i) / 6, ww = (w * i) / 6 + 6; c.lineTo(x + ww, yy); c.lineTo(x + ww * 0.45, yy - h * 0.03); }
  for (let i = 6; i >= 1; i--) { const yy = y - h + (h * 0.92 * i) / 6, ww = (w * i) / 6 + 6; c.lineTo(x - ww * 0.45, yy - h * 0.03); c.lineTo(x - ww, yy); }
  c.closePath(); c.fill(); c.fillRect(x - h * 0.02, y - h * 0.1, h * 0.04, h * 0.12);
}
function forestRow(c, seed, y, h, col, n, x0 = -400, x1 = W + 400) {
  const R = mulberry32(seed);
  for (let i = 0; i < n; i++) spruce(c, lerp(x0, x1, (i + R() * 0.8) / n), y + R() * 20, h * (0.6 + R() * 0.6), col);
}
// толстые стволы ближнего плана
function trunks(c, seed, n, col, x0 = -200, x1 = W + 200) {
  const R = mulberry32(seed); c.fillStyle = col;
  for (let i = 0; i < n; i++) {
    const x = lerp(x0, x1, (i + R()) / n), w = 40 + R() * 70;
    c.beginPath(); c.moveTo(x - w / 2, -200); c.lineTo(x + w / 2, -200); c.lineTo(x + w * 0.6, H + 200); c.lineTo(x - w * 0.6, H + 200); c.closePath(); c.fill();
    for (let b = 0; b < 3; b++) { const by = 100 + R() * 500, d = R() < 0.5 ? -1 : 1; c.beginPath(); c.moveTo(x, by); c.lineTo(x + d * (120 + R() * 160), by - 60 - R() * 80); c.lineTo(x + d * 10, by + 14); c.closePath(); c.fill(); }
  }
}
// полосы тумана, плывут
function fog(c, y, a, t, speed = 20, scale = 1, k = 0) {
  const s = SPR["fog" + (k % 3)]; if (!s) return;
  c.save(); c.globalAlpha = a;
  const w = 1400 * scale, off = ((t * speed) % w + w) % w;
  for (let x = -w - off; x < W + w; x += w * 0.7) c.drawImage(s, x, y - 180 * scale, w, 360 * scale);
  c.restore();
}
// лучи света веером от точки
function rays(c, x, y, n, len, a, t, spread = 1.2, dir = Math.PI / 2, col = "255,210,150") {
  c.save(); c.globalCompositeOperation = "lighter";
  for (let i = 0; i < n; i++) {
    const ang = dir + (i / (n - 1) - 0.5) * spread + Math.sin(t * 0.4 + i * 1.7) * 0.02, w = 0.025 + 0.02 * hash(i);
    const k = a * (0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 0.7 + i * 2.3)));
    c.fillStyle = linear(c, x, y, x + Math.cos(ang) * len, y + Math.sin(ang) * len, [[0, `rgba(${col},${k})`], [1, `rgba(${col},0)`]]);
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(ang - w) * len, y + Math.sin(ang - w) * len); c.lineTo(x + Math.cos(ang + w) * len, y + Math.sin(ang + w) * len); c.closePath(); c.fill();
  }
  c.restore();
}
// частицы: пыль/пепел/искры/снег/дождь — позиция = функция времени
function particles(c, kind, t, seed, n, k = 1, box = [0, BAR, W, H - BAR]) {
  const R = mulberry32(seed), [bx, by, bw, bh] = [box[0], box[1], box[2] - box[0], box[3] - box[1]];
  c.save();
  if (kind === "embers") c.globalCompositeOperation = "lighter";
  for (let i = 0; i < n; i++) {
    const px = R(), py = R(), sp = 0.5 + R(), sz = R(), ph = R() * TAU;
    let x, y, r, col, a;
    if (kind === "dust") { x = px * bw + t * 30 * sp + Math.sin(t * 0.5 + ph) * 20; y = py * bh + Math.sin(t * 0.3 + ph) * 30 - t * 6 * sp; r = 1 + sz * 2.5; col = "255,220,170"; a = 0.25 + 0.35 * sz; }
    else if (kind === "embers") { x = px * bw + Math.sin(t * 1.3 + ph) * 40 + t * 20; y = py * bh - t * 70 * sp; r = 1.2 + sz * 2.6; col = "255,150,60"; a = 0.5 + 0.5 * Math.sin(t * 6 + ph); }
    else if (kind === "snow") { x = px * bw + Math.sin(t * 0.8 + ph) * 50 + t * 40; y = py * bh + t * 90 * sp; r = 1.5 + sz * 3.5; col = "235,242,255"; a = 0.55 + 0.4 * sz; }
    else if (kind === "ash") { x = px * bw + t * 50 * sp; y = py * bh + t * 25 * sp + Math.sin(t + ph) * 20; r = 1 + sz * 2; col = "200,200,205"; a = 0.3 + 0.3 * sz; }
    else if (kind === "rain") { x = px * bw + t * 300 * sp; y = py * bh + t * 1500 * sp; col = "190,210,230"; a = 0.25 + 0.25 * sz; }
    x = bx + (((x % bw) + bw) % bw); y = by + (((y % bh) + bh) % bh);
    c.globalAlpha = clamp(a, 0, 1) * k;
    if (kind === "rain") { c.strokeStyle = `rgb(${col})`; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 9, y - 46); c.stroke(); }
    else { c.fillStyle = `rgb(${col})`; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
  }
  c.restore();
}
// зарево и дым на горизонте
function blaze(c, x, y, w, h, t, k = 1) {
  c.save(); c.globalCompositeOperation = "lighter"; c.globalAlpha = k * (0.8 + 0.2 * noise1(t * 3 + x));
  c.fillStyle = radial(c, x, y, 0, w, [[0, "rgba(255,140,50,0.75)"], [0.4, "rgba(255,90,30,0.3)"], [1, "rgba(200,40,10,0)"]]);
  c.beginPath(); c.ellipse(x, y, w, h, 0, 0, TAU); c.fill(); c.restore();
}
function smokeColumn(c, x, y, h, t, k = 1, dark = true) {
  const s = dark ? SPR.smokeD : SPR.smoke; if (!s) return;
  c.save(); c.globalAlpha = 0.85 * k;
  for (let i = 0; i < 9; i++) {
    const u = ((i / 9 + t * 0.06) % 1), yy = y - u * h, sz = 80 + u * 260, xx = x + Math.sin(u * 4 + t * 0.3) * 40 + u * 120;
    c.globalAlpha = 0.9 * k * Math.sin(u * Math.PI);
    c.drawImage(s, xx - sz / 2, yy - sz / 2, sz, sz);
  }
  c.restore();
}
// языки пламени (очаг, костёр)
function flames(c, x, y, w, h, t, k = 1) {
  c.save(); c.globalCompositeOperation = "lighter"; c.globalAlpha = k;
  c.fillStyle = radial(c, x, y - h * 0.3, 0, w * 2.6, [[0, "rgba(255,160,60,0.55)"], [1, "rgba(255,90,20,0)"]]);
  c.fillRect(x - w * 3, y - h * 3, w * 6, h * 4);
  const n = Math.round(clamp(w / 28, 7, 34)), tw = w / n * 1.9;
  for (let i = 0; i < n; i++) {
    const ph = i * 1.9, ctr = 1 - Math.abs(i / (n - 1) - 0.5) * 1.4, fx = x + (i / (n - 1) - 0.5) * w;
    const fh = h * ctr * (0.5 + 0.5 * (0.5 + 0.5 * noise1(t * 4 + ph))), sway = noise1(t * 3 + ph) * tw * 0.8;
    c.fillStyle = linear(c, fx, y, fx, y - fh, [[0, "rgba(255,210,110,0.9)"], [0.45, "rgba(255,120,40,0.55)"], [1, "rgba(200,40,10,0)"]]);
    c.beginPath(); c.moveTo(fx - tw, y); c.bezierCurveTo(fx - tw, y - fh * 0.4, fx - tw * 0.2 + sway, y - fh * 0.6, fx + sway * 1.6, y - fh);
    c.bezierCurveTo(fx + tw * 0.3 + sway, y - fh * 0.55, fx + tw, y - fh * 0.4, fx + tw, y); c.closePath(); c.fill();
  }
  c.restore();
}
// шатры хазар
function tent(c, x, y, s, col) {
  c.fillStyle = col; c.beginPath(); c.moveTo(x - 60 * s, y); c.lineTo(x - 50 * s, y - 40 * s); c.quadraticCurveTo(x, y - 95 * s, x + 50 * s, y - 40 * s); c.lineTo(x + 60 * s, y); c.closePath(); c.fill();
  c.fillRect(x - 2 * s, y - 112 * s, 4 * s, 22 * s);
}
// ворота Царьграда: башни, арка, зубцы
function gates(c, x, y, s, col, rim) {
  const sh = (g) => {
    g.beginPath();
    g.rect(x - 520 * s, y - 520 * s, 260 * s, 520 * s); g.rect(x + 260 * s, y - 520 * s, 260 * s, 520 * s);
    g.rect(x - 280 * s, y - 420 * s, 560 * s, 420 * s);
    for (let i = 0; i < 6; i++) { g.rect(x - 520 * s + i * 46 * s, y - 560 * s, 28 * s, 40 * s); g.rect(x + 260 * s + i * 46 * s, y - 560 * s, 28 * s, 40 * s); }
    for (let i = 0; i < 9; i++) g.rect(x - 280 * s + i * 64 * s, y - 452 * s, 34 * s, 32 * s);
    g.fill();
  };
  rimmed(c, sh, col, rim, -4, -4, 0.8);
  // проём арки — створки ворот
  c.fillStyle = "#1a120c"; c.beginPath(); c.moveTo(x - 170 * s, y); c.lineTo(x - 170 * s, y - 230 * s); c.arc(x, y - 230 * s, 170 * s, Math.PI, 0); c.lineTo(x + 170 * s, y); c.closePath(); c.fill();
  c.strokeStyle = "rgba(255,190,110,0.25)"; c.lineWidth = 6 * s;
  for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(x + i * 48 * s, y); c.lineTo(x + i * 48 * s, y - 380 * s); c.stroke(); }
  c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 400 * s); c.lineWidth = 10 * s; c.strokeStyle = "rgba(0,0,0,0.7)"; c.stroke();
}
// круглый щит с умбоном и солнечным знаком
function shield(c, x, y, r, rot = 0, glint = 0) {
  c.save(); c.translate(x, y); c.rotate(rot);
  c.fillStyle = radial(c, -r * 0.3, -r * 0.3, r * 0.1, r * 1.1, [[0, "#c2402a"], [1, "#5a1610"]]); circle(c, 0, 0, r); c.fill();
  c.lineWidth = r * 0.09; c.strokeStyle = "#d8a24a"; c.stroke();
  c.strokeStyle = "rgba(240,200,120,0.85)"; c.lineWidth = r * 0.05;
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; c.beginPath(); c.moveTo(Math.cos(a) * r * 0.25, Math.sin(a) * r * 0.25); c.lineTo(Math.cos(a) * r * 0.86, Math.sin(a) * r * 0.86); c.stroke(); }
  c.fillStyle = radial(c, -r * 0.08, -r * 0.08, 0, r * 0.25, [[0, "#fff1c2"], [0.5, "#d8a24a"], [1, "#6a4a1a"]]); circle(c, 0, 0, r * 0.22); c.fill();
  if (glint > 0) { c.globalCompositeOperation = "lighter"; c.globalAlpha = glint; c.fillStyle = radial(c, -r * 0.4, -r * 0.4, 0, r * 0.9, [[0, "rgba(255,240,200,0.9)"], [1, "rgba(255,200,120,0)"]]); circle(c, 0, 0, r); c.fill(); }
  c.restore();
}
// ладья: корпус с носом-конём, парус, вёсла
function ship(c, x, y, s, rock, col, sail = "#7a2a1c", t = 0) {
  c.save(); c.translate(x, y); c.rotate(rock); c.scale(s, s);
  c.fillStyle = col;
  c.beginPath(); c.moveTo(-260, -40); c.quadraticCurveTo(-300, -120, -250, -170); c.quadraticCurveTo(-230, -130, -240, -60);
  c.quadraticCurveTo(0, -20, 240, -60); c.quadraticCurveTo(250, -140, 300, -150); c.quadraticCurveTo(290, -90, 260, -40);
  c.quadraticCurveTo(0, 50, -260, -40); c.fill();
  c.fillRect(-6, -380, 12, 340);
  c.fillStyle = sail; c.beginPath(); c.moveTo(-150, -360); c.quadraticCurveTo(0, -330 + Math.sin(t * 2) * 8, 150, -360); c.lineTo(160, -120); c.quadraticCurveTo(0, -150, -160, -120); c.closePath(); c.fill();
  c.strokeStyle = "rgba(240,200,140,0.5)"; c.lineWidth = 10; for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(i * 60, -350); c.lineTo(i * 64, -130); c.stroke(); }
  c.strokeStyle = col; c.lineWidth = 7; for (let i = 0; i < 7; i++) { const ox = -180 + i * 60, a = Math.sin(t * 3 + i * 0.4) * 0.25; c.beginPath(); c.moveTo(ox, -40); c.lineTo(ox - 30 + Math.sin(a) * 40, 60); c.stroke(); }
  for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? "#b8402a" : "#d8a24a"; circle(c, -170 + i * 64, -52, 20); c.fill(); }
  c.restore();
}
// волны: слои синусов
function waves(c, y, amp, t, col, n = 3, speed = 1) {
  for (let k = 0; k < n; k++) {
    const yy = y + k * amp * 0.9, a = amp * (1 - k * 0.15);
    c.fillStyle = mix(col, "#000000", k * 0.18); c.beginPath(); c.moveTo(-300, H + 300);
    for (let x = -300; x <= W + 300; x += 16) c.lineTo(x, yy + Math.sin(x * 0.006 + t * speed * (1 + k * 0.3) + k) * a + Math.sin(x * 0.017 - t * speed * 1.7 + k * 2) * a * 0.35);
    c.lineTo(W + 300, H + 300); c.closePath(); c.fill();
    c.save(); c.strokeStyle = "rgba(200,225,235,0.18)"; c.lineWidth = 3; c.beginPath();
    for (let x = -300; x <= W + 300; x += 16) { const yy2 = yy + Math.sin(x * 0.006 + t * speed * (1 + k * 0.3) + k) * a + Math.sin(x * 0.017 - t * speed * 1.7 + k * 2) * a * 0.35; x === -300 ? c.moveTo(x, yy2) : c.lineTo(x, yy2); }
    c.stroke(); c.restore();
  }
}
// молния
function lightning(c, x, y0, y1, seed, k) {
  if (k <= 0) return; const R = mulberry32(seed);
  c.save(); c.globalCompositeOperation = "lighter"; c.strokeStyle = `rgba(220,235,255,${k})`; c.lineWidth = 4; c.shadowColor = "rgba(160,200,255,0.9)"; c.shadowBlur = 30;
  c.beginPath(); let x1 = x; c.moveTo(x, y0);
  for (let y = y0; y < y1; y += 40) { x1 += (R() - 0.5) * 90; c.lineTo(x1, y); if (R() < 0.2) { c.moveTo(x1, y); c.lineTo(x1 + (R() - 0.5) * 200, y + 120); c.moveTo(x1, y); } }
  c.stroke(); c.restore();
}

// ---------- Пост-обработка кадра ----------
function grade(c, warm = 0.5, k = 1) {
  // тёплый свет / бирюзовые тени
  c.save(); c.globalAlpha = 0.16 * k; c.globalCompositeOperation = "soft-light";
  c.fillStyle = linear(c, 0, 0, W, H, [[0, "#1f6a78"], [1, mix("#1f6a78", "#ff8a3a", warm)]]); c.fillRect(0, 0, W, H); c.restore();
}
function vignette(c, k = 0.75) {
  c.save(); c.fillStyle = radial(c, W / 2, H / 2, H * 0.35, H * 1.05, [[0, "rgba(0,0,0,0)"], [1, `rgba(0,0,0,${k})`]]); c.fillRect(0, 0, W, H); c.restore();
}
function grain(c, t, a = 0.07) {
  const f = Math.floor(t * 30) % 6, s = SPR["grain" + f]; if (!s) return;
  c.save(); c.globalAlpha = a; c.globalCompositeOperation = "overlay"; c.drawImage(s, 0, 0, W, H); c.restore();
}
function letterbox(c, k = 1) { c.fillStyle = "#000"; c.fillRect(0, 0, W, BAR * k); c.fillRect(0, H - BAR * k, W, BAR * k + 1); }
function flash(c, a, col = "255,255,255") { if (a <= 0) return; c.save(); c.fillStyle = `rgba(${col},${clamp(a, 0, 1)})`; c.fillRect(0, 0, W, H); c.restore(); }
function fade(c, a) { if (a <= 0) return; c.save(); c.fillStyle = `rgba(0,0,0,${clamp(a, 0, 1)})`; c.fillRect(0, 0, W, H); c.restore(); }
// блик объектива
function flare(c, x, y, k) {
  if (k <= 0) return; c.save(); c.globalCompositeOperation = "lighter"; c.globalAlpha = k;
  c.fillStyle = linear(c, 0, y, W, y, [[0, "rgba(120,170,255,0)"], [clamp(x / W, 0.01, 0.99), "rgba(255,200,140,0.35)"], [1, "rgba(120,170,255,0)"]]); c.fillRect(0, y - 3, W, 6);
  const dx = W / 2 - x, dy = H / 2 - y;
  [[0.4, 40, "255,180,120"], [0.8, 18, "140,200,255"], [1.3, 60, "255,140,90"], [1.7, 26, "180,255,200"]].forEach(([u, r, col]) => {
    c.fillStyle = radial(c, x + dx * u * 2, y + dy * u * 2, 0, r, [[0, `rgba(${col},0.22)`], [1, `rgba(${col},0)`]]); circle(c, x + dx * u * 2, y + dy * u * 2, r); c.fill();
  });
  c.restore();
}
// металлический заголовок с бегущим бликом (текст и блик рисуются на отдельном холсте)
function metalText(c, text, x, y, px, k, sweep, track = 0.12, col = "gold") {
  if (k <= 0) return;
  if (!SPR.txt) SPR.txt = mkCanvas(W, H);
  const o = SPR.txt, g = o.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "source-over"; g.globalAlpha = 1; g.clearRect(0, 0, W, H);
  font(g, px, F_TITLE, "700"); g.textAlign = "center"; g.textBaseline = "middle";
  if ("letterSpacing" in g) g.letterSpacing = `${(px * track).toFixed(1)}px`;
  const w = g.measureText(text).width;
  g.fillStyle = col === "gold"
    ? linear(g, 0, y - px * 0.5, 0, y + px * 0.5, [[0, "#fff4cf"], [0.45, "#e8b45a"], [0.55, "#8a5a1a"], [1, "#f2c66a"]])
    : linear(g, 0, y - px * 0.5, 0, y + px * 0.5, [[0, "#ffffff"], [0.45, "#c8d4dc"], [0.55, "#5e6e78"], [1, "#d6e0e6"]]);
  g.fillText(text, x, y);
  if (sweep > 0 && sweep < 1) {
    const sx = x - w / 2 - 200 + (w + 400) * sweep;
    g.globalCompositeOperation = "source-atop";
    g.fillStyle = linear(g, sx - 120, 0, sx + 120, 0, [[0, "rgba(255,255,255,0)"], [0.5, "rgba(255,255,255,0.85)"], [1, "rgba(255,255,255,0)"]]);
    g.fillRect(sx - 140, y - px, 280, px * 2);
  }
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  font(c, px, F_TITLE, "700"); c.textAlign = "center"; c.textBaseline = "middle";
  if ("letterSpacing" in c) c.letterSpacing = `${(px * track).toFixed(1)}px`;
  c.globalAlpha = k * 0.65; c.fillStyle = "#000"; c.fillText(text, x + px * 0.03, y + px * 0.05);
  c.globalAlpha = k; c.drawImage(o, 0, 0);
  c.restore();
}
// карточка трейлера: слова по центру, разлёт трекинга, свет
function card(c, text, t, t0, t1, px = 92) {
  const k = win(t, t0, t1, 0.25, 0.3); if (k <= 0) return;
  const u = prog(t, t0, t1), track = lerp(0.1, 0.32, easeOut(u));
  c.save(); fade(c, 0.85 * k);
  metalText(c, text, W / 2, H / 2, px * lerp(1.06, 1, easeOut(u)), k, prog(t, t0 + 0.1, t1 - 0.1), track, "steel");
  c.restore();
}
