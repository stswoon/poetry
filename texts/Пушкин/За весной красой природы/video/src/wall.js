// ---------- Стена: кирпич, асфальт, куски граффити ----------
const WX0 = -900, WX1 = 9400, WY0 = -500, WY1 = 1600, GROUND = 1000;
// кирпичная стена заранее, 1× (под пробегом камеры)
const WALL = (() => {
  const w = WX1 - WX0, h = WY1 - WY0, cv = mk(w, h), c = cv.getContext("2d"), r = rng(7);
  c.translate(-WX0, -WY0);
  c.fillStyle = "#b9b2a8"; c.fillRect(WX0, WY0, w, h); // раствор
  const bw = 118, bh = 46;
  for (let row = 0, y = WY0; y < GROUND; row++, y += bh + 8) {
    const off = row % 2 ? -bw / 2 : 0;
    for (let x = WX0 + off; x < WX1; x += bw + 8) {
      const k = r(), base = k < 0.15 ? [150, 80, 62] : k < 0.3 ? [120, 62, 50] : [138, 72, 56];
      const v = (r() - 0.5) * 22;
      c.fillStyle = `rgb(${base[0] + v | 0},${base[1] + v * 0.6 | 0},${base[2] + v * 0.5 | 0})`;
      c.fillRect(x + 1, y + 1, bw - 2, bh - 2);
      // тень снизу и сколы
      c.fillStyle = "rgba(40,15,10,0.22)"; c.fillRect(x + 1, y + bh - 7, bw - 2, 6);
      c.fillStyle = "rgba(255,230,210,0.10)"; c.fillRect(x + 1, y + 1, bw - 2, 5);
      if (r() < 0.18) { c.fillStyle = "rgba(60,30,20,0.25)"; c.beginPath(); c.arc(x + r() * bw, y + r() * bh, 3 + r() * 6, 0, TAU); c.fill(); }
    }
  }
  // зерно кирпича
  for (let i = 0; i < 90000; i++) {
    const x = WX0 + r() * w, y = WY0 + r() * (GROUND - WY0);
    c.fillStyle = r() < 0.5 ? "rgba(0,0,0,0.13)" : "rgba(255,255,255,0.09)";
    c.fillRect(x, y, 1.5 + r() * 2, 1.5 + r() * 2);
  }
  // старые выцветшие теги
  c.save(); c.globalAlpha = 0.16; c.lineCap = "round"; c.lineJoin = "round";
  for (let i = 0; i < 26; i++) {
    const x = WX0 + 200 + r() * (w - 400), y = 120 + r() * 700;
    c.strokeStyle = ["#2a2a40", "#e8e8e8", "#3b6ea8", "#a83b3b"][i % 4]; c.lineWidth = 5 + r() * 6;
    c.beginPath(); c.moveTo(x, y);
    for (let k = 0; k < 6; k++) c.quadraticCurveTo(x + k * 38 + r() * 30, y - 50 + r() * 100, x + k * 40 + 30, y + (r() - 0.5) * 40);
    c.stroke();
  }
  c.restore();
  // затемнение к асфальту
  const gd = c.createLinearGradient(0, GROUND - 260, 0, GROUND);
  gd.addColorStop(0, "rgba(30,10,10,0)"); gd.addColorStop(1, "rgba(30,10,10,0.35)");
  c.fillStyle = gd; c.fillRect(WX0, GROUND - 260, w, 260);
  // асфальт
  c.fillStyle = "#3d3b40"; c.fillRect(WX0, GROUND, w, WY1 - GROUND);
  c.fillStyle = "#2a282d"; c.fillRect(WX0, GROUND, w, 14);
  for (let i = 0; i < 26000; i++) { c.fillStyle = r() < 0.5 ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.08)"; c.fillRect(WX0 + r() * w, GROUND + 14 + r() * (WY1 - GROUND), 2, 2); }
  return cv;
})();

// пузырчатые буквы: ореол, объём, тёмный контур, белая окантовка, заливка градиентом, блик
function bubbleText(c, s, x, y, size, cols, seed = 1) {
  c.save(); c.font = `${size}px "GTitle"`; c.textBaseline = "alphabetic";
  const chars = [...s], adv = [], r = rng(seed);
  let tw = 0;
  for (const ch of chars) { const a = c.measureText(ch).width * 0.96; adv.push(a); tw += a; }
  const pos = []; let cx = x - tw / 2;
  for (let i = 0; i < chars.length; i++) { pos.push([cx, y + (r() - 0.5) * size * 0.08, (r() - 0.5) * 0.12]); cx += adv[i]; }
  const each = (fn) => { for (let i = 0; i < chars.length; i++) { c.save(); c.translate(pos[i][0] + adv[i] / 2, pos[i][1]); c.rotate(pos[i][2]); fn(chars[i], -adv[i] / 2); c.restore(); } };
  c.lineJoin = "round";
  // ореол распыла вокруг надписи
  c.save(); c.filter = `blur(${10 * SC}px)`; c.globalAlpha = 0.5; c.strokeStyle = P.ink; c.lineWidth = size * 0.3;
  each((ch, ox) => c.strokeText(ch, ox, 0)); c.restore();
  // объём
  for (let k = 14; k >= 1; k--) { c.fillStyle = k > 12 ? "#0d0b18" : P.ink; each((ch, ox) => { c.strokeStyle = c.fillStyle; c.lineWidth = size * 0.17; c.strokeText(ch, ox + k * size * 0.006, k * size * 0.007); }); }
  // контур и белая окантовка
  c.strokeStyle = P.ink; c.lineWidth = size * 0.17; each((ch, ox) => c.strokeText(ch, ox, 0));
  c.strokeStyle = P.white; c.lineWidth = size * 0.075; each((ch, ox) => c.strokeText(ch, ox, 0));
  // заливка
  const gr = c.createLinearGradient(0, -size * 0.74, 0, size * 0.02);
  cols.forEach((col, i) => gr.addColorStop(i / (cols.length - 1), col));
  c.fillStyle = gr; each((ch, ox) => c.fillText(ch, ox, 0));
  // блик: светлая полоска у верхнего края каждой буквы
  c.save(); c.globalAlpha = 0.75;
  each((ch, ox) => {
    c.save(); c.beginPath(); c.rect(-size, -size * 0.74, size * 2, size * 0.16); c.clip();
    c.fillStyle = "rgba(255,255,255,0.55)"; c.fillText(ch, ox, 0); c.restore();
  });
  c.restore();
  // пара бликов-звёздочек
  c.fillStyle = P.white;
  for (let i = 0; i < 3; i++) { const k = Math.floor(r() * chars.length); const px = pos[k][0] + adv[k] * 0.3, py = pos[k][1] - size * 0.6; star(c, px, py, size * 0.07); }
  c.restore();
  return tw;
}
function star(c, x, y, s) { c.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? s * 0.25 : s; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); c.fill(); }
// трафаретная плашка с подписью автора
function stencilTag(c, s, x, y, size, bg = P.ink, fg = P.white, seed = 3) {
  c.save(); c.font = `${size}px "GSub"`; const tw = c.measureText(s).width;
  const bx = x - tw / 2 - size * 0.5, by = y - size * 1.0, bw = tw + size, bh = size * 1.45;
  spray(c, (cc) => cc.rect(bx, by, bw, bh), bg, { halo: 8, bb: [bx, by, bw, bh], seed, shade: false, dust: 1.5 });
  c.fillStyle = fg; c.textAlign = "center"; c.textBaseline = "alphabetic"; c.fillText(s, x, y);
  c.restore();
}

// ---------- куски ----------
// раскладка мира (x)
const X = { title: 960, spring: 2560, summer: 3700, cloud: 4750, umb: 5560, sea: 7600 };
const BIRD_HOME = [2770, 452];
function blob(c, x, y, rx, ry, n = 9, seed = 1, j = 0.18) { // неровное пятно
  const r = rng(seed), pts = [];
  for (let i = 0; i < n; i++) { const a = i / n * TAU; const k = 1 + (r() - 0.5) * j * 2; pts.push([x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k]); }
  c.moveTo((pts[0][0] + pts[n - 1][0]) / 2, (pts[0][1] + pts[n - 1][1]) / 2);
  for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; c.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }
  c.closePath();
}
// пухлое облако из кругов: контур только снаружи (сначала толстая обводка, потом заливка поверх)
function cloudCircles(x, y, w, h, seed) {
  const r = rng(seed), out = [], n = 6;
  for (let i = 0; i < n; i++) { const u = (i + 0.5) / n; out.push([x - w / 2 + u * w, y + (Math.abs(u - 0.5) * 0.5 - 0.05) * h + (r() - 0.5) * h * 0.15, h * (0.38 + Math.sin(u * Math.PI) * 0.3 + r() * 0.08)]); }
  out.push([x, y + h * 0.18, h * 0.42], [x - w * 0.25, y + h * 0.22, h * 0.36], [x + w * 0.25, y + h * 0.22, h * 0.36]);
  return out;
}
function sprayCloud(c, circ, col, line, seed) {
  const path = (cc) => { for (const [x, y, rr] of circ) { cc.moveTo(x + rr, y); cc.arc(x, y, rr, 0, TAU); } };
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [x, y, rr] of circ) { x0 = Math.min(x0, x - rr); y0 = Math.min(y0, y - rr); x1 = Math.max(x1, x + rr); y1 = Math.max(y1, y + rr); }
  c.save(); c.strokeStyle = P.ink; c.lineWidth = line * 2; c.beginPath(); path(c); c.stroke(); c.restore();
  spray(c, path, col, { halo: 14, bb: [x0, y0, x1 - x0, y1 - y0], seed, lightA: 0.3 });
}
function buildPieces() {
  const PC = {};
  const tA = 0.12, tB = EV.V0 - 0.35;
  // 0. название
  PC.title = new Piece(X.title - 860, 150, 1720, 720, (c, w, h) => {
    bubbleText(c, "За весной,", w / 2, 285, 240, [P.yellow, P.orange, P.pink], 11);
    bubbleText(c, "красой природы…", w / 2, 525, 200, [P.lime, P.teal, P.sky], 12);
    stencilTag(c, "А. С. Пушкин · 1824", w / 2, 655, 54, P.ink, P.white, 13);
  }, { t0: tA, t1: tB, rows: 4, can: P.orange });
  // 1. весна: ветка, цветы, листья
  PC.spring = new Piece(X.spring - 560, 130, 1120, 760, (c, w, h) => {
    const ox = 560 - X.spring, oy = -130; // мир → кусок
    c.translate(ox, oy);
    spray(c, (cc) => blob(cc, X.spring, 470, 520, 330, 11, 21, 0.12), "#9fe3ff", { halo: 26, bb: [X.spring - 520, 140, 1040, 660], seed: 22, shade: false, haloA: 0.45 });
    const br = [[X.spring - 540, 640], [X.spring - 300, 560], [BIRD_HOME[0] - 140, 480], [BIRD_HOME[0] + 80, 476], [X.spring + 420, 400]];
    sprayStroke(c, br, 34, P.bark);
    sprayStroke(c, [[X.spring - 300, 560], [X.spring - 260, 420], [X.spring - 180, 330]], 20, P.bark);
    sprayStroke(c, [[X.spring + 60, 455], [X.spring + 160, 330], [X.spring + 300, 280]], 18, P.bark);
    sprayStroke(c, [[X.spring - 60, 500], [X.spring - 20, 600], [X.spring + 80, 660]], 16, P.bark);
    const r = rng(31);
    const flowers = [[X.spring - 180, 330], [X.spring + 300, 280], [X.spring + 420, 400], [X.spring - 420, 600], [X.spring + 80, 660], [X.spring - 260, 420], [X.spring + 160, 330]];
    for (const [fx, fy] of flowers) {
      for (let k = 0; k < 5; k++) { const a = k / 5 * TAU + r(); spray(c, (cc) => cc.ellipse(fx + Math.cos(a) * 30, fy + Math.sin(a) * 30, 30, 22, a, 0, TAU), P.pink, { halo: 6, bb: [fx - 60, fy - 60, 120, 120], seed: 40 + k, dust: 0, line: 4 }); }
      spray(c, (cc) => cc.arc(fx, fy, 15, 0, TAU), P.yellow, { halo: 4, line: 4, shade: false });
    }
    for (let k = 0; k < 12; k++) {
      const p = br[1 + (k % 3)], fx = p[0] + (r() - 0.5) * 260, fy = p[1] - 30 - r() * 60, a = -0.6 + r() * 1.2;
      spray(c, (cc) => { cc.save(); cc.translate(fx, fy); cc.rotate(a); cc.moveTo(-40, 0); cc.quadraticCurveTo(0, -26, 40, 0); cc.quadraticCurveTo(0, 26, -40, 0); cc.restore(); }, P.leaf, { halo: 5, line: 4, shade: false, dust: 0 });
    }
  }, { t0: EV.L1 - 0.2, t1: EV.prirody + 0.5, rows: 4, can: P.pink });
  // 2. лето: небо, поле, волны жара
  PC.summer = new Piece(X.summer - 640, 110, 1280, 860, (c, w, h) => {
    c.translate(640 - X.summer, -110);
    spray(c, (cc) => blob(cc, X.summer, 470, 600, 340, 12, 51, 0.1), P.sky, { halo: 30, bb: [X.summer - 600, 130, 1200, 680], seed: 52, shade: false, haloA: 0.5 });
    spray(c, (cc) => { cc.moveTo(X.summer - 620, 700); cc.quadraticCurveTo(X.summer, 600, X.summer + 620, 690); cc.lineTo(X.summer + 600, 900); cc.lineTo(X.summer - 600, 910); cc.closePath(); }, P.field, { halo: 18, bb: [X.summer - 620, 600, 1240, 310], seed: 53, line: 6, drips: [[X.summer - 400, 905, 46, 9], [X.summer - 90, 905, 70, 10], [X.summer + 330, 900, 38, 8]] });
    for (let k = 0; k < 7; k++) sprayStroke(c, [[X.summer - 520 + k * 160, 780 + (k % 2) * 40], [X.summer - 470 + k * 160, 740 + (k % 2) * 40]], 10, P.orange);
  }, { t0: EV.L2 - 0.25, t1: EV.L2 + 0.75, rows: 4, can: P.sky });
  // солнце отдельно: укатывается на «пройдёт»
  PC.sun = new Piece(X.summer - 330, 160, 520, 520, (c, w, h) => {
    const cx = 260, cy = 260;
    for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; sprayStroke(c, [[cx + Math.cos(a) * 150, cy + Math.sin(a) * 150], [cx + Math.cos(a) * 240, cy + Math.sin(a) * 240]], 26, P.sunO); }
    spray(c, (cc) => cc.arc(cx, cy, 140, 0, TAU), P.sun, { halo: 18, bb: [cx - 140, cy - 140, 280, 280], seed: 61, line: 8 });
    // лицо солнца
    c.fillStyle = P.ink; c.beginPath(); c.arc(cx - 45, cy - 20, 13, 0, TAU); c.arc(cx + 45, cy - 20, 13, 0, TAU); c.fill();
    c.strokeStyle = P.ink; c.lineWidth = 9; c.lineCap = "round"; c.beginPath(); c.arc(cx, cy + 15, 55, 0.25, Math.PI - 0.25); c.stroke();
    c.fillStyle = "rgba(255,90,90,0.55)"; c.beginPath(); c.arc(cx - 85, cy + 25, 22, 0, TAU); c.arc(cx + 85, cy + 25, 22, 0, TAU); c.fill();
  }, { t0: EV.L2 - 0.05, t1: EV.leto + 0.45, rows: 3, can: P.sunO });
  // 3. туман и тучи серым поверх весны и лета
  PC.fog = new Piece(1960, 40, 2900, 720, (c, w, h) => {
    c.translate(-1960, -40);
    const r = rng(71);
    for (let k = 0; k < 5; k++) {
      const y = 150 + k * 120;
      spray(c, (cc) => { cc.moveTo(1990, y - 50); for (let i = 0; i <= 14; i++) cc.lineTo(1990 + i * 200, y - 55 + Math.sin(i * 1.3 + k) * 18); cc.lineTo(4880, y + Math.sin(k) * 10); cc.lineTo(4830, y + 55); for (let i = 14; i >= 0; i--) cc.lineTo(1990 + i * 200, y + 55 + Math.sin(i * 1.1 + k * 2) * 18); cc.lineTo(1945, y); cc.closePath(); }, k < 2 ? P.fogD : P.fog, { halo: 24, haloA: 0.6, shade: false, seed: 72 + k });
    }
    for (let k = 0; k < 7; k++) { const x = 2150 + k * 400 + r() * 80; sprayCloud(c, cloudCircles(x, 130 + r() * 30, 420, 170, 80 + k), "#5b6175", 6, 90 + k); }
  }, { t0: EV.L3 - 0.15, t1: EV.E3 + 0.15, rows: 3, can: P.grey });
  // 4. туча-ветродуй
  PC.cloud = new Piece(X.cloud - 320, 90, 640, 460, (c, w, h) => {
    const cx = 300, cy = 220;
    sprayCloud(c, cloudCircles(cx, cy, 470, 250, 101), "#7a83a0", 7, 102);
    // надутые щёки и глаза-щёлочки
    c.fillStyle = "rgba(255,150,170,0.6)"; c.beginPath(); c.arc(cx + 70, cy + 30, 52, 0, TAU); c.fill();
    c.strokeStyle = P.ink; c.lineWidth = 9; c.lineCap = "round";
    c.beginPath(); c.moveTo(cx - 60, cy - 50); c.lineTo(cx - 10, cy - 38); c.moveTo(cx + 40, cy - 52); c.lineTo(cx + 95, cy - 46); c.stroke();
    c.lineWidth = 7; c.beginPath(); c.moveTo(cx - 70, cy - 85); c.lineTo(cx - 10, cy - 68); c.moveTo(cx + 40, cy - 80); c.lineTo(cx + 105, cy - 86); c.stroke();
    // губы трубочкой
    c.fillStyle = P.ink; c.beginPath(); c.ellipse(cx + 180, cy + 40, 30, 22, 0, 0, TAU); c.fill();
    c.fillStyle = "#ff8aa0"; c.beginPath(); c.ellipse(cx + 186, cy + 40, 16, 11, 0, 0, TAU); c.fill();
  }, { t0: EV.L4 - 0.35, t1: EV.L4 + 0.45, rows: 3, can: P.purple });
  // 5. зонтики — по одному куску на зонтик (живут отдельно)
  PC.umb = [[X.umb - 330, P.red, 111], [X.umb, P.teal, 112], [X.umb + 330, P.yellow, 113]].map(([ux, col, sd], i) =>
    new Piece(ux - 170, 430, 340, 400, (c) => {
      const cx = 170, cy = 140;
      // ручка
      c.strokeStyle = P.ink; c.lineWidth = 10; c.lineCap = "round";
      c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx, cy + 210); c.arc(cx - 22, cy + 210, 22, 0, Math.PI); c.stroke();
      // купол с фестонами
      spray(c, (cc) => { cc.moveTo(cx - 160, cy + 30); cc.quadraticCurveTo(cx - 150, cy - 120, cx, cy - 130); cc.quadraticCurveTo(cx + 150, cy - 120, cx + 160, cy + 30);
        for (let k = 4; k > 0; k--) { const x1 = cx - 160 + k * 80; cc.quadraticCurveTo(x1 - 40, cy + 2, x1 - 80, cy + 30); } cc.closePath(); }, col, { halo: 12, line: 8, bb: [cx - 160, cy - 130, 320, 160], seed: sd, drips: [[cx - 90, cy + 22, 30 + i * 12, 8], [cx + 70, cy + 24, 50 - i * 10, 8]] });
      c.strokeStyle = "rgba(27,24,48,0.6)"; c.lineWidth = 5;
      for (const k of [-0.5, 0, 0.5]) { c.beginPath(); c.moveTo(cx, cy - 128); c.quadraticCurveTo(cx + k * 120, cy - 60, cx + k * 160 * 0.98 + (k > 0 ? -20 : k < 0 ? 20 : 0), cy + 26); c.stroke(); }
    }, { t0: EV.L5 - 0.35 + i * 0.36, t1: EV.L5 - 0.05 + i * 0.36, rows: 2, can: col }));
  // 6. тёплый край: закат, солнце, море, гребни, остров — каждый кусок рисует свой баллончик у зрителя на глазах
  const ARR = EV.L7;  // камера прилетела к морю
  const MID = X.sea;
  const skyFill = (c) => {
    const sky = c.createLinearGradient(0, -100, 0, 640);
    sky.addColorStop(0, "#ff5fa2"); sky.addColorStop(0.5, "#ff9a3d"); sky.addColorStop(1, "#ffd36b");
    spray(c, (cc) => blob(cc, X.sea, 320, 1230, 420, 14, 121, 0.06), "#ff9a3d", { fill: sky, halo: 34, bb: [X.sea - 1230, -100, 2460, 840], seed: 122, shade: false, haloA: 0.5 });
  };
  const seaFill = (c) => {
    spray(c, (cc) => { cc.moveTo(X.sea - 1240, 560); for (let i = 0; i <= 25; i++) cc.lineTo(X.sea - 1240 + i * 100, 560 + Math.sin(i * 0.9) * 12); cc.quadraticCurveTo(X.sea + 1300, 780, X.sea + 1200, 990); cc.lineTo(X.sea - 1200, 990); cc.quadraticCurveTo(X.sea - 1300, 780, X.sea - 1240, 560); cc.closePath(); }, P.sea, { halo: 20, bb: [X.sea - 1240, 545, 2480, 445], seed: 124, line: 7, shadeA: 0.4 });
    for (let k = 0; k < 4; k++) sprayStroke(c, [[X.sea - 1200, 640 + k * 90], [X.sea + 1200, 640 + k * 90 + (k % 2 ? 14 : -10)]], 22, k % 2 ? P.seaL : P.seaD, { a: 0.75 });
  };
  // кусок в мировых координатах
  const wp = (x0, y0, w, h, fn, side, o) => new Piece(x0, y0, w, h, (c) => { c.translate(-x0, -y0); fn(c); }, o);
  // закат и море — одна картина, два баллончика от середины в разные стороны (без шва между половинами)
  PC.skyP = wp(X.sea - 1260, -110, 2520, 860, skyFill, 0, { t0: ARR - 0.1, t1: ARR + 0.85, rows: 3, cans: [P.pink, P.orange] });
  PC.sunP = wp(X.sea - 120, 330, 480, 240, (c) => {
    for (let k = 0; k < 7; k++) { const a = Math.PI + (k + 0.5) / 7 * Math.PI; sprayStroke(c, [[X.sea + 120 + Math.cos(a) * 235, 560 + Math.sin(a) * 235], [X.sea + 120 + Math.cos(a) * 300, 560 + Math.sin(a) * 300]], 20, "#ffe27a"); }
    spray(c, (cc) => cc.arc(X.sea + 120, 560, 210, Math.PI, 0), P.sun, { halo: 26, bb: [X.sea - 90, 350, 420, 210], seed: 123, shade: false });
  }, 0, { t0: ARR + 0.65, t1: ARR + 1.1, rows: 2, can: P.yellow });
  PC.seaP = wp(X.sea - 1300, 540, 2600, 460, seaFill, 0, { t0: EV.more - 0.8, t1: EV.more + 0.2, rows: 2, cans: [P.seaL, P.seaD] });
  PC.crest = wp(X.sea - 1200, 600, 2400, 380, (c) => {
    const r = rng(131);
    for (let k = 0; k < 14; k++) { const x = X.sea - 1100 + r() * 2200, y = 630 + (k % 4) * 90 + r() * 20; sprayStroke(c, [[x - 70, y + 10], [x - 10, y - 14], [x + 60, y + 6]], 10, P.white); }
  }, 0, { t0: EV.more + 0.05, t1: EV.more + 0.5, rows: 2, can: P.white });
  const ix = X.sea + 820;
  PC.isle = wp(ix - 260, 260, 560, 340, (c) => {
    spray(c, (cc) => cc.ellipse(ix, 575, 230, 50, 0, Math.PI, 0), "#f5c26b", { halo: 10, line: 6, bb: [ix - 230, 525, 460, 50], seed: 125 });
    sprayStroke(c, [[ix - 20, 560], [ix - 10, 470], [ix + 20, 380], [ix + 60, 310]], 24, P.bark);
    for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + (k - 2.5) * 0.55; spray(c, (cc) => { cc.save(); cc.translate(ix + 60, 310); cc.rotate(a); cc.moveTo(0, 0); cc.quadraticCurveTo(90, -50, 170, 30); cc.quadraticCurveTo(90, -5, 0, 0); cc.restore(); }, P.leaf, { halo: 6, line: 5, shade: false, dust: 0 }); }
  }, 0, { t0: EV.E7 - 0.5, t1: EV.E7 + 0.05, rows: 2, can: P.leaf });
  PC.seaAll = [PC.skyP, PC.sunP, PC.seaP, PC.crest, PC.isle];
  // 7. финальное название над морем
  PC.fin = new Piece(X.sea - 920, 40, 1840, 620, (c, w, h) => {
    bubbleText(c, "За весной,", w / 2, 225, 230, ["#7fd8ff", "#2b6ff2", P.purple], 211);
    bubbleText(c, "красой природы…", w / 2, 465, 190, [P.lime, P.teal, "#0d8a7d"], 212);
    stencilTag(c, "А. С. Пушкин", w / 2, 585, 52, P.ink, P.white, 213);
  }, { t0: EV.fin, t1: EV.fin + 1.3, rows: 3, can: P.pink });
  return PC;
}
