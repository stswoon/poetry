// ---------- Герои и предметы: Мартышка-блогер, очки, камень, посылка, корона ----------
// Всё в координатах «комнаты» (1320×740), рисуется функцией времени без случайностей.
const MC = { fur: "#8a5631", furD: "#5e3519", furL: "#b97a48", face: "#f1cfa5", faceD: "#d9a878", shirt: "#18b3a3", shirtD: "#0d7f74",
  grey: "#d9d4cc", greyD: "#a39c92", tongue: "#ff6f8e", mouth: "#5a1626", lens: "#bfe8ff", frame: "#1a1233", gold: "#ffcf4a", goldD: "#c98b12" };

// очки: центр (x, y), масштаб s, поворот rot. o.fog — запотели, o.crack — трещины, o.flip — дужками вверх
function glasses(c, x, y, s, rot = 0, o = {}) {
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
  const r = 30, dx = 38, col = o.color || MC.frame;
  c.lineCap = "round"; c.lineJoin = "round";
  // дужки
  c.strokeStyle = col; c.lineWidth = 7;
  const tY = o.flip ? 16 : -6;
  c.beginPath(); c.moveTo(-dx - r + 2, -6); c.lineTo(-dx - r - 22, tY - 8); c.moveTo(dx + r - 2, -6); c.lineTo(dx + r + 22, tY - 8); c.stroke();
  for (const sx of [-1, 1]) {
    circle(c, sx * dx, 0, r);
    c.fillStyle = o.fog ? `rgba(255,255,255,${0.35 + 0.5 * o.fog})` : "rgba(191,232,255,0.38)"; c.fill();
    c.lineWidth = 8; c.strokeStyle = col; c.stroke();
    // блик
    c.save(); c.beginPath(); c.arc(sx * dx - 6, -6, r * 0.62, Math.PI * 1.05, Math.PI * 1.45); c.lineWidth = 5; c.strokeStyle = "rgba(255,255,255,0.9)"; c.stroke(); c.restore();
    if (o.crack) {
      c.save(); c.strokeStyle = "rgba(255,255,255,0.95)"; c.lineWidth = 2.5; c.beginPath();
      c.moveTo(sx * dx - 4, -4); c.lineTo(sx * dx + 14, -22); c.moveTo(sx * dx - 4, -4); c.lineTo(sx * dx + 20, 10); c.moveTo(sx * dx - 4, -4); c.lineTo(sx * dx - 22, 14); c.stroke(); c.restore();
    }
  }
  // капли на запотевших стёклах
  if (o.drip) for (const sx of [-1, 1]) { c.fillStyle = "rgba(160,220,255,0.95)"; ellipse(c, sx * dx + 8, r * 0.6 + o.drip * 26, 5, 7); c.fill(); }
  // перемычка
  c.beginPath(); c.moveTo(-dx + r - 2, -4); c.quadraticCurveTo(0, -18, dx - r + 2, -4); c.lineWidth = 7; c.strokeStyle = col; c.stroke();
  c.restore();
}

// осколок стекла (треугольник с бликом)
function shard(c, x, y, s, rot, glint) {
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
  c.beginPath(); c.moveTo(-10, -8); c.lineTo(12, -4); c.lineTo(-2, 12); c.closePath();
  c.fillStyle = "rgba(200,240,255,0.85)"; c.fill(); c.lineWidth = 2; c.strokeStyle = "#ffffff"; c.stroke();
  if (glint > 0) star4(c, 0, 0, 16 * glint, "#fffbe0");
  c.restore();
}
// четырёхлучевой блеск
function star4(c, x, y, r, col = "#fff") {
  c.save(); c.translate(x, y); c.beginPath();
  for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4, rr = i % 2 ? r * 0.22 : r; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  c.closePath(); c.fillStyle = col; c.fill(); c.restore();
}
// пятиконечная звезда
function star5(c, x, y, r, fill, stroke = C.ink, lw = 4) {
  c.save(); c.translate(x, y); c.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  c.closePath(); if (fill) { c.fillStyle = fill; c.fill(); } if (lw) { c.lineWidth = lw; c.strokeStyle = stroke; c.lineJoin = "round"; c.stroke(); }
  c.restore();
}
function heart(c, x, y, r, fill) {
  c.save(); c.translate(x, y); c.scale(r / 20, r / 20); c.beginPath();
  c.moveTo(0, 16); c.bezierCurveTo(-26, -2, -16, -24, 0, -10); c.bezierCurveTo(16, -24, 26, -2, 0, 16); c.closePath();
  c.fillStyle = fill; c.fill(); c.restore();
}
function banana(c, x, y, s, rot = 0) {
  // полумесяц с толстой серединой, рёбрышком, тёмным кончиком и черенком
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s); c.lineJoin = "round";
  c.beginPath(); c.moveTo(-36, -12);
  c.bezierCurveTo(-30, 26, 26, 30, 38, -16);
  c.bezierCurveTo(22, 4, -14, 6, -36, -12); c.closePath();
  ink(c, "#ffd84a", 3.5);
  c.beginPath(); c.moveTo(-28, -4); c.bezierCurveTo(-18, 16, 18, 18, 32, -8); c.lineWidth = 3; c.strokeStyle = "#e3a90f"; c.stroke();
  c.beginPath(); c.moveTo(-22, -6); c.bezierCurveTo(-12, 6, 12, 8, 24, -6); c.lineWidth = 3; c.strokeStyle = "#fff3a6"; c.stroke();
  circle(c, -35, -12, 3.5); c.fillStyle = "#3a2410"; c.fill();
  c.save(); c.translate(38, -16); c.rotate(-0.7); rrect(c, -3, -12, 7, 14, 2); ink(c, "#7a5512", 2.5); c.restore();
  c.restore();
}

// камень
function rock(c, x, y, s) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.beginPath(); c.moveTo(-120, 30); c.lineTo(-104, -32); c.lineTo(-50, -66); c.lineTo(22, -72); c.lineTo(88, -44); c.lineTo(122, 8); c.lineTo(110, 34); c.closePath();
  ink(c, "#8d8a9c", 6);
  c.beginPath(); c.moveTo(-60, -50); c.lineTo(10, -58); c.lineTo(70, -36); c.lineWidth = 6; c.strokeStyle = "#b9b6c6"; c.stroke();
  c.beginPath(); c.moveTo(-20, -10); c.lineTo(20, 4); c.moveTo(50, -8); c.lineTo(80, 10); c.lineWidth = 4; c.strokeStyle = "#625f72"; c.stroke();
  c.restore();
}

// посылка: open 0..1 — клапаны раскрываются, tape 0..1 — скотч сорван
function parcel(c, x, y, s, open, tape, rot = 0) {
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
  const w = 260, h = 160;
  // задние клапаны
  if (open > 0) {
    c.save(); c.translate(-w / 2, -h); c.rotate(-1.9 * open); rrect(c, 0, -10, w / 2, 20, 4); ink(c, "#c98a4b", 5); c.restore();
    c.save(); c.translate(w / 2, -h); c.rotate(1.9 * open); rrect(c, -w / 2, -10, w / 2, 20, 4); ink(c, "#c98a4b", 5); c.restore();
  }
  rrect(c, -w / 2, -h, w, h, 8); ink(c, "#d99a58", 6);
  c.fillStyle = "#b97a3c"; c.fillRect(-w / 2 + 4, -h + 4, w - 8, 20);
  if (tape < 1) { c.fillStyle = "#e9dcae"; c.fillRect(-18, -h, 36 * (1 - tape), h * (1 - tape * 0.6)); }
  // наклейка «хрупкое»: бокал
  c.save(); c.translate(70, -70); c.beginPath(); c.moveTo(-14, -26); c.lineTo(14, -26); c.lineTo(8, 0); c.lineTo(-8, 0); c.closePath(); c.lineWidth = 4; c.strokeStyle = "#7a2b12"; c.stroke();
  c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 18); c.moveTo(-10, 18); c.lineTo(10, 18); c.stroke(); c.restore();
  c.restore();
}

// корона
function crown(c, x, y, s, rot = 0) {
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
  c.beginPath(); c.moveTo(-70, 30); c.lineTo(-80, -40); c.lineTo(-40, -6); c.lineTo(0, -56); c.lineTo(40, -6); c.lineTo(80, -40); c.lineTo(70, 30); c.closePath();
  ink(c, MC.gold, 6); c.fillStyle = MC.goldD; c.fillRect(-68, 14, 136, 10);
  for (const [px, py, col] of [[-80, -40, "#ff2e88"], [0, -56, "#22d3ee"], [80, -40, "#3fd46b"]]) { circle(c, px, py, 10); ink(c, col, 4); }
  c.restore();
}

// ---------- Мартышка ----------
// P: x, y — середина торса на уровне стола; t — время; squint/blink/anger/open/smile/tongue/sniff 0..1;
// look [dx, dy]; tilt — наклон головы; lh, rh — цели кистей; tail {tip:[x,y], curl, rings}; head — что на темени
function monkey(c, P) {
  const t = P.t, bx = P.x, by = P.y;
  const breath = Math.sin(t * 2.4) * 0.012;
  const hx = bx + (P.headDX || 0) + Math.sin(t * 1.3) * 3, hy = by - 330 + Math.sin(t * 2.4 + 0.8) * 4 + (P.headDY || 0);
  const tilt = (P.tilt || 0) + Math.sin(t * 1.1) * 0.03;
  // хвост — позади, из-за стола справа
  if (P.tail) tail(c, bx + 175, by + 20, P.tail, t);
  // торс в футболке
  c.save(); c.translate(bx, by); c.scale(1, 1 + breath);
  c.beginPath(); c.moveTo(-150, 40); c.bezierCurveTo(-155, -110, -120, -185, -60, -195); c.lineTo(60, -195); c.bezierCurveTo(120, -185, 155, -110, 150, 40); c.closePath();
  ink(c, MC.shirt, 6);
  // принт на футболке: очки
  c.save(); c.globalAlpha = 0.85; glasses(c, 0, -90, 0.7, 0, { color: "#0d4d47" }); c.restore();
  // шея
  c.beginPath(); c.ellipse(0, -192, 46, 18, 0, 0, TAU); ink(c, MC.furD, 0);
  c.restore();
  // наушники на шее (провод)
  // голова
  c.save(); c.translate(hx, hy); c.rotate(tilt);
  // уши
  for (const sx of [-1, 1]) { circle(c, sx * 122, 6, 44); ink(c, MC.fur, 6); circle(c, sx * 122, 6, 26); ink(c, MC.faceD, 0); }
  ellipse(c, 0, 0, 128, 118); ink(c, MC.fur, 6);
  // седой хохолок — к старости
  c.save(); c.lineCap = "round";
  for (const [ax, len, bend] of [[-26, 46, -1], [0, 58, 1], [26, 44, 1]]) {
    const sw = Math.sin(t * 3 + ax) * 0.12;
    c.beginPath(); c.moveTo(ax, -108); c.quadraticCurveTo(ax + bend * 22, -108 - len * 0.7, ax + bend * 18 + sw * 40, -108 - len);
    c.lineWidth = 16; c.strokeStyle = C.ink; c.stroke(); c.lineWidth = 9; c.strokeStyle = MC.grey; c.stroke();
  }
  c.restore();
  // маска лица
  c.beginPath(); c.ellipse(-42, -12, 52, 56, 0, 0, TAU); c.ellipse(42, -12, 52, 56, 0, 0, TAU); c.fillStyle = MC.face; c.fill();
  ellipse(c, 0, 52, 78, 54); c.fillStyle = MC.face; c.fill();
  // морщинки старости
  c.strokeStyle = MC.faceD; c.lineWidth = 3;
  for (const sx of [-1, 1]) { c.beginPath(); c.arc(sx * 42, -12, 66, sx > 0 ? -0.2 : Math.PI - 0.1, sx > 0 ? 0.1 : Math.PI + 0.2); c.stroke(); }
  // глаза
  const blink = P.blink || 0, sq = clamp(P.squint || 0, 0, 1), lid = Math.max(blink, sq * 0.62);
  const [lx, ly] = P.look || [0, 0];
  for (const sx of [-1, 1]) {
    const ex = sx * 42, ey = -14;
    c.save(); ellipse(c, ex, ey, 26, 29); c.fillStyle = "#fff"; c.fill(); c.clip();
    circle(c, ex + lx * 9, ey + ly * 8, 13); c.fillStyle = "#2a1408"; c.fill();
    circle(c, ex + lx * 9 + 4, ey + ly * 8 - 5, 4.5); c.fillStyle = "#fff"; c.fill();
    // веко сверху и снизу при прищуре
    c.fillStyle = MC.faceD; c.fillRect(ex - 30, ey - 32, 60, 60 * lid);
    if (sq > 0) c.fillRect(ex - 30, ey + 30 - 18 * sq, 60, 30);
    c.restore();
    ellipse(c, ex, ey, 26, 29); c.lineWidth = 4; c.strokeStyle = C.ink; c.stroke();
    if (lid > 0.05) { c.beginPath(); c.moveTo(ex - 26, ey - 29 + 58 * lid); c.lineTo(ex + 26, ey - 29 + 58 * lid); c.lineWidth = 4; c.stroke(); }
    // брови: злость сводит их вниз к носу
    const an = P.anger || 0, up = (P.brow || 0);
    c.beginPath(); c.moveTo(ex - sx * 26, ey - 42 - up * 10 + an * 2); c.lineTo(ex + sx * 22, ey - 40 - up * 10 + an * 16);
    c.lineWidth = 9; c.lineCap = "round"; c.strokeStyle = MC.furD; c.stroke();
  }
  // нос: ноздри раздуваются при нюхе
  const sn = P.sniff || 0, nf = 1 + 0.5 * sn * (0.5 + 0.5 * Math.sin(t * 28));
  for (const sx of [-1, 1]) { ellipse(c, sx * 11, 30, 5 * nf, 7 * nf, sx * 0.4); c.fillStyle = "#4a2410"; c.fill(); }
  // рот
  const op = clamp(P.open || 0, 0, 1), sm = P.smile ?? 0.6, tg = P.tongue || 0;
  if (op > 0.04 || tg > 0.04) {
    const mh = 10 + 36 * Math.max(op, tg * 0.6);
    ellipse(c, 0, 66, 34, mh); ink(c, MC.mouth, 4);
    if (tg > 0) { c.beginPath(); c.ellipse(0, 66 + mh * 0.5 + tg * 26, 20, 16 + tg * 26, 0, 0, TAU); ink(c, MC.tongue, 4); c.beginPath(); c.moveTo(0, 66 + mh * 0.5); c.lineTo(0, 66 + mh * 0.5 + tg * 40); c.lineWidth = 3; c.strokeStyle = "#c4405e"; c.stroke(); }
  } else {
    c.beginPath(); c.moveTo(-34, 62); c.quadraticCurveTo(0, 62 + 30 * sm - 16 * (P.anger || 0), 34, 62); c.lineWidth = 5; c.lineCap = "round"; c.strokeStyle = C.ink; c.stroke();
  }
  // гарнитура блогера: дуга, амбушюр, микрофон
  c.save(); c.lineCap = "round";
  c.beginPath(); c.arc(0, 4, 136, Math.PI * 1.12, Math.PI * 1.88); c.lineWidth = 14; c.strokeStyle = "#2a2440"; c.stroke();
  rrect(c, -150, -18, 32, 62, 12); ink(c, "#2a2440", 4); rrect(c, 118, -18, 32, 62, 12); ink(c, "#2a2440", 4);
  c.beginPath(); c.moveTo(-134, 40); c.quadraticCurveTo(-120, 96, -50, 92); c.lineWidth = 7; c.strokeStyle = "#2a2440"; c.stroke();
  circle(c, -46, 92, 10); ink(c, "#ff2e88", 3);
  c.restore();
  if (P.onHead) P.onHead(c);
  c.restore();
  // руки (длинные, по IK) и то, что в руках
  const sh = [[bx - 108, by - 168], [bx + 108, by - 168]];
  const lh = P.lh || [bx - 170, by - 8], rh = P.rh || [bx + 170, by - 8];
  const hand = (x, y, a) => { c.save(); c.translate(x, y); c.rotate(a); ellipse(c, 6, 0, 26, 22); ink(c, MC.face, 5);
    for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(18, i * 9); c.lineTo(30, i * 11); c.lineWidth = 3; c.strokeStyle = MC.faceD; c.stroke(); } c.restore(); };
  if (P.behind) P.behind(c);
  arm(c, sh[0][0], sh[0][1], lh[0], lh[1], 118, -1, 26, MC.fur, hand);
  arm(c, sh[1][0], sh[1][1], rh[0], rh[1], 118, 1, 26, MC.fur, hand);
  if (P.held) P.held(c);
  return { hx, hy, tilt };
}

// рука: из двух решений IK берём то, где локоть снаружи и ниже (side: −1 левая, +1 правая);
// у границы решения плавно смешиваем, чтобы локоть не прыгал
function arm(c, sx, sy, tx, ty, a, side, w, col, end) {
  const k1 = ik(sx, sy, tx, ty, a, a, 1), k2 = ik(sx, sy, tx, ty, a, a, -1);
  const sc = (k) => side * k.ex + 0.6 * k.ey;
  const u = sstep(0.5 + (sc(k1) - sc(k2)) / 40);
  const ex = lerp(k2.ex, k1.ex, u), ey = lerp(k2.ey, k1.ey, u), hx = k1.hx, hy = k1.hy;
  c.save(); c.lineCap = "round"; c.lineJoin = "round";
  c.beginPath(); c.moveTo(sx, sy); c.lineTo(ex, ey); c.lineTo(hx, hy);
  c.strokeStyle = C.ink; c.lineWidth = w + 9; c.stroke(); c.strokeStyle = col; c.lineWidth = w; c.stroke();
  c.restore();
  if (end) end(hx, hy, Math.atan2(hy - ey, hx - ex));
}

// хвост: от основания до кончика кубической кривой; rings — очки, нанизанные на хвост (0..n)
function tail(c, x0, y0, T, t) {
  const [tx, ty] = T.tip;
  const sw = Math.sin(t * 2.2) * 14;
  const c1 = [x0 + 170, y0 - 40], c2 = [tx + 120 + sw, ty + 120];
  c.save(); c.lineCap = "round";
  c.beginPath(); c.moveTo(x0, y0); c.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], tx, ty);
  // завиток
  const curl = T.curl ?? 1;
  c.arc(tx - 22 * curl, ty, 22 * curl, 0, -Math.PI * 1.5 * curl, true);
  c.lineWidth = 30; c.strokeStyle = C.ink; c.stroke(); c.lineWidth = 20; c.strokeStyle = MC.fur; c.stroke();
  c.restore();
  // очки на хвосте
  const n = T.rings || 0;
  for (let i = 0; i < n; i++) {
    const u = 0.5 + i * 0.16, p = bez(x0, y0, c1, c2, tx, ty, u), p2 = bez(x0, y0, c1, c2, tx, ty, u + 0.01);
    const a = Math.atan2(p2[1] - p[1], p2[0] - p[0]);
    const k = T.ringK ? T.ringK[i] : 1; if (k <= 0) continue;
    glasses(c, p[0] + Math.cos(a + Math.PI / 2) * 0 + 38, p[1], 0.8 * k, a + Math.PI / 2);
  }
}
function bez(x0, y0, c1, c2, x3, y3, u) {
  const v = 1 - u;
  return [v * v * v * x0 + 3 * v * v * u * c1[0] + 3 * v * u * u * c2[0] + u * u * u * x3,
          v * v * v * y0 + 3 * v * v * u * c1[1] + 3 * v * u * u * c2[1] + u * u * u * y3];
}

// люди в очках (окошко «люди говорят»): простые фигурки, кивают
function person(c, x, y, s, t, hair, shirt, phase) {
  c.save(); c.translate(x, y); c.scale(s, s);
  const nod = Math.sin(t * 5 + phase) * 0.08;
  rrect(c, -70, 0, 140, 150, 50); ink(c, shirt, 5);
  c.save(); c.translate(0, -10); c.rotate(nod);
  circle(c, 0, -60, 62); ink(c, "#f4c9a0", 5);
  c.beginPath(); c.arc(0, -66, 64, Math.PI * 1.05, Math.PI * 1.95); c.lineTo(50, -80); c.lineTo(-50, -80); c.closePath(); ink(c, hair, 5);
  glasses(c, 0, -56, 0.62);
  c.beginPath(); c.arc(0, -30, 16, 0.2, Math.PI - 0.2); c.lineWidth = 4; c.strokeStyle = C.ink; c.stroke();
  c.restore(); c.restore();
}
