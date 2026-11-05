// ---------- Герои и воз (мультяшные, с контуром) ----------
// Все смотрят вправо; (x, y) — центр туловища; s — масштаб.

// Лебедь. o: flap 0..1 (крыло поднято), fly (лапы поджаты), neck (наклон шеи), tired (поникший)
function swan(c, x, y, s, o = {}) {
  const flap = o.flap ?? 0.2, tired = o.tired ?? 0, neck = (o.neck ?? 0) - tired * 0.5;
  c.save(); c.translate(x, y); c.scale(s, s); c.rotate(o.rot ?? 0);
  // дальнее крыло
  wing(c, -5, -28, lerp(0.05, 1.3, flap) + 0.12 - tired * 0.45, 0.92, "#d7e2ee");
  // лапы
  if (!o.fly) {
    c.fillStyle = "#ff8a1e"; c.strokeStyle = C.ink; c.lineWidth = 4;
    for (const dx of [-10, 22]) { c.beginPath(); c.moveTo(dx, 48); c.lineTo(dx - 18, 72); c.lineTo(dx + 20, 72); c.closePath(); c.fill(); c.stroke(); }
  } else {
    c.fillStyle = "#ff8a1e"; c.strokeStyle = C.ink; c.lineWidth = 4;
    c.beginPath(); c.ellipse(-92, 30, 22, 9, 0.3, 0, TAU); c.fill(); c.stroke();
  }
  // туловище
  c.beginPath(); c.moveTo(-118, -30);
  c.bezierCurveTo(-70, -48, 30, -52, 72, -14); c.bezierCurveTo(98, 12, 76, 56, 22, 58);
  c.bezierCurveTo(-42, 62, -98, 40, -120, -4); c.quadraticCurveTo(-134, -24, -118, -30); c.closePath();
  ink(c, "#ffffff", 5);
  c.save(); c.clip(); c.fillStyle = "rgba(120,150,190,0.22)"; c.beginPath(); c.ellipse(-10, 62, 130, 38, 0, 0, TAU); c.fill(); c.restore();
  // шея и голова
  c.save(); c.translate(58, -18); c.rotate(neck);
  c.lineCap = "round";
  const neckPath = () => { c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(34, -40, -26, -92, 14, -136); };
  neckPath(); c.strokeStyle = C.ink; c.lineWidth = 34; c.stroke();
  neckPath(); c.strokeStyle = "#ffffff"; c.lineWidth = 24; c.stroke();
  c.translate(18, -138);
  c.beginPath(); c.ellipse(4, 0, 27, 21, -0.1, 0, TAU); ink(c, "#ffffff", 5);
  // клюв
  c.beginPath(); c.moveTo(20, -10); c.quadraticCurveTo(52, -6, 64, 6); c.quadraticCurveTo(44, 12, 20, 10); c.closePath(); ink(c, "#ff8a1e", 4);
  c.beginPath(); c.moveTo(20, -10); c.quadraticCurveTo(14, 0, 20, 10); c.lineTo(26, 9); c.quadraticCurveTo(22, 0, 27, -9); c.closePath(); ink(c, C.ink, 0);
  // повязка команды
  c.beginPath(); c.moveTo(-22, -6); c.quadraticCurveTo(0, -24, 22, -16); c.lineTo(22, -8); c.quadraticCurveTo(0, -16, -22, 3); c.closePath(); ink(c, C.swan, 3);
  c.beginPath(); c.moveTo(-22, -2); c.lineTo(-40, -14); c.lineTo(-36, 6); c.closePath(); ink(c, C.swan, 3);
  // глаз
  const blink = o.squint ?? tired;
  c.fillStyle = C.ink;
  if (blink > 0.5) { c.lineWidth = 4; c.strokeStyle = C.ink; c.beginPath(); c.moveTo(0, -2); c.lineTo(12, -1); c.stroke(); }
  else { c.beginPath(); c.arc(7, -2, 5.5, 0, TAU); c.fill(); c.fillStyle = "#fff"; c.beginPath(); c.arc(9, -4, 2, 0, TAU); c.fill(); }
  c.restore();
  // ближнее крыло
  wing(c, -12, -20, lerp(-0.04, 1.2, flap) - tired * 0.4, 1, "#ffffff");
  c.restore();
}
function wing(c, x, y, a, k, fill) {
  c.save(); c.translate(x, y); c.rotate(a); c.scale(k, k);
  c.beginPath(); c.moveTo(18, 6);
  c.bezierCurveTo(-10, -48, -100, -66, -158, -34);
  c.quadraticCurveTo(-146, -22, -150, -12); c.quadraticCurveTo(-130, -8, -132, 4); c.quadraticCurveTo(-108, 4, -108, 16);
  c.bezierCurveTo(-70, 22, -20, 26, 18, 6); c.closePath();
  ink(c, fill, 5);
  c.strokeStyle = "rgba(22,34,61,0.35)"; c.lineWidth = 3; c.lineCap = "round";
  for (const [x0, y0, x1, y1] of [[-30, -10, -96, -22], [-40, 6, -104, 0], [-20, 16, -70, 14]]) { c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 - 8, x1, y1); c.stroke(); }
  c.restore();
}

// Рак. o: claw 0..1 (раскрыты клешни), walk (фаза ножек), tired
function rak(c, x, y, s, o = {}) {
  const walk = o.walk ?? 0, claw = o.claw ?? 0.3, tired = o.tired ?? 0;
  c.save(); c.translate(x, y); c.scale(s, s); c.rotate(o.rot ?? 0);
  const red = C.rak, redL = "#ff7a52", redD = "#a8281a";
  // дальняя клешня
  arm(c, 52, 4, -0.18 - tired * 0.3, claw, 0.86, redD);
  // ножки
  c.strokeStyle = C.ink; c.lineCap = "round";
  for (let i = 0; i < 4; i++) {
    const ph = walk + i * 1.6, lx = 34 - i * 22, sw = Math.sin(ph) * 10;
    c.lineWidth = 9; c.beginPath(); c.moveTo(lx, 18); c.lineTo(lx + 6 + sw, 42); c.lineTo(lx - 2 + sw * 1.4, 60 - Math.max(0, Math.cos(ph)) * 8); c.stroke();
    c.strokeStyle = redD; c.lineWidth = 5; c.stroke(); c.strokeStyle = C.ink;
  }
  // хвост: сегменты и веер
  const segs = [[-36, 32, 27], [-66, 28, 25], [-92, 24, 22], [-114, 20, 19], [-132, 16, 16]];
  const curl = tired * 0.25;
  c.save();
  c.save(); c.translate(-148, 8 + curl * 30); c.rotate(curl);
  c.beginPath(); c.moveTo(0, 0); c.lineTo(-34, -24); c.quadraticCurveTo(-44, 0, -34, 24); c.closePath(); ink(c, redL, 4);
  c.beginPath(); c.moveTo(0, 0); c.lineTo(-30, 0); c.stroke();
  c.restore();
  for (let i = segs.length - 1; i >= 0; i--) {
    const [sx, rx, ry] = segs[i];
    c.beginPath(); c.ellipse(sx, 4 + i * curl * 7, rx * 0.62, ry, 0, 0, TAU); ink(c, i % 2 ? red : redL, 4);
  }
  c.restore();
  // панцирь
  c.beginPath(); c.moveTo(-14, -8); c.bezierCurveTo(0, -46, 70, -44, 96, -6); c.lineTo(108, 0); c.lineTo(94, 8);
  c.bezierCurveTo(70, 34, 0, 36, -14, 18); c.closePath(); ink(c, red, 5);
  c.fillStyle = "rgba(255,255,255,0.28)"; c.beginPath(); c.ellipse(36, -22, 34, 9, -0.05, 0, TAU); c.fill();
  // повязка команды — красно-жёлтая лента
  c.beginPath(); c.moveTo(18, -36); c.lineTo(32, -36); c.lineTo(28, 30); c.lineTo(14, 30); c.closePath(); ink(c, C.yellow, 3);
  // глаза на стебельках
  for (const [ex, ey, k] of [[78, -46, 0.9], [90, -40, 1]]) {
    c.lineWidth = 5; c.strokeStyle = C.ink; c.beginPath(); c.moveTo(ex - 6, -14); c.lineTo(ex, ey); c.stroke();
    c.beginPath(); c.arc(ex, ey, 9 * k, 0, TAU); ink(c, "#fff", 3.5);
    if (tired > 0.5) { c.strokeStyle = C.ink; c.lineWidth = 3; c.beginPath(); c.moveTo(ex - 6, ey); c.lineTo(ex + 6, ey); c.stroke(); }
    else { c.fillStyle = C.ink; c.beginPath(); c.arc(ex + 2, ey + 1, 4.5 * k, 0, TAU); c.fill(); }
  }
  // усы
  c.strokeStyle = C.ink; c.lineWidth = 3.5;
  for (const [k, ph] of [[1, 0], [0.8, 1.3]]) {
    c.beginPath(); c.moveTo(100, -6);
    c.bezierCurveTo(150, -40 * k + Math.sin(walk * 0.5 + ph) * 6, 190, -110 * k, 160 + 30 * k, -150 * k + Math.sin(walk * 0.7 + ph) * 8); c.stroke();
  }
  // ближняя клешня
  arm(c, 60, 14, 0.05 + tired * 0.35, claw, 1, red);
  c.restore();
}
function arm(c, x, y, a, open, k, fill) {
  c.save(); c.translate(x, y); c.rotate(a); c.scale(k, k);
  c.lineCap = "round";
  c.strokeStyle = C.ink; c.lineWidth = 18; c.beginPath(); c.moveTo(0, 0); c.lineTo(40, 14); c.lineTo(78, 6); c.stroke();
  c.strokeStyle = fill; c.lineWidth = 10; c.stroke();
  c.translate(84, 4);
  // нижний «палец» и ладонь
  c.beginPath(); c.moveTo(-10, -8); c.bezierCurveTo(10, -26, 46, -22, 66, -6); c.quadraticCurveTo(72, 4, 62, 6);
  c.bezierCurveTo(44, 16, 8, 22, -10, 10); c.closePath(); ink(c, fill, 4.5);
  // верхний подвижный палец
  c.save(); c.translate(14, -14); c.rotate(-0.15 - open * 0.55);
  c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(14, -22, 44, -26, 62, -14); c.quadraticCurveTo(48, -6, 30, -4); c.closePath(); ink(c, fill, 4.5);
  c.restore();
  c.restore();
}

// Щука. o: tail (фаза хвоста), mouth 0..1, dive (наклон носом вниз), tired
function pike(c, x, y, s, o = {}) {
  const ph = o.tail ?? 0, mouth = o.mouth ?? 0.2, tired = o.tired ?? 0;
  c.save(); c.translate(x, y); c.scale(s, s); c.rotate(o.rot ?? 0);
  const g1 = "#4f9d3a", gD = "#2c6a26", belly = "#e2ee9c";
  // хвостовой плавник
  c.save(); c.translate(-150, 0); c.rotate(Math.sin(ph) * 0.35 * (1 - tired * 0.8));
  c.beginPath(); c.moveTo(6, 0); c.quadraticCurveTo(-26, -20, -58, -48); c.quadraticCurveTo(-44, -8, -42, 0); c.quadraticCurveTo(-44, 8, -58, 48); c.quadraticCurveTo(-26, 20, 6, 0); c.closePath();
  ink(c, "#c9562f", 4.5);
  c.restore();
  // спинной и анальный плавники у хвоста
  c.beginPath(); c.moveTo(-70, -26); c.quadraticCurveTo(-104, -66, -128, -48); c.quadraticCurveTo(-118, -24, -110, -14); c.closePath(); ink(c, "#c9562f", 4);
  c.beginPath(); c.moveTo(-70, 26); c.quadraticCurveTo(-100, 58, -124, 44); c.quadraticCurveTo(-116, 22, -110, 14); c.closePath(); ink(c, "#c9562f", 4);
  // туловище
  const body = () => { c.beginPath(); c.moveTo(-150, 0); c.bezierCurveTo(-120, -30, -40, -44, 60, -36); c.bezierCurveTo(110, -32, 150, -22, 190, -8);
    c.lineTo(196, 4); c.bezierCurveTo(150, 22, 110, 34, 60, 36); c.bezierCurveTo(-40, 42, -120, 30, -150, 0); c.closePath(); };
  body(); ink(c, g1, 5);
  c.save(); body(); c.clip();
  c.fillStyle = belly; c.beginPath(); c.ellipse(20, 40, 190, 26, 0, 0, TAU); c.fill();
  c.fillStyle = gD;
  for (let i = 0; i < 7; i++) { const bx = -110 + i * 30; c.beginPath(); c.ellipse(bx, -10, 7, 22, 0.25, 0, TAU); c.fill(); }
  c.fillStyle = "rgba(255,255,255,0.22)"; c.beginPath(); c.ellipse(40, -24, 90, 7, -0.03, 0, TAU); c.fill();
  c.restore();
  body(); c.lineWidth = 5; c.strokeStyle = C.ink; c.stroke();
  // рот: пасть открывается вниз
  const m = 4 + mouth * 18;
  c.save(); c.beginPath(); c.moveTo(196, 4); c.lineTo(120, 8); c.lineTo(186, 4 + m); c.closePath(); ink(c, "#7a1e22", 3.5);
  c.fillStyle = "#fff"; for (let i = 0; i < 5; i++) { const tx = 132 + i * 12; c.beginPath(); c.moveTo(tx, 6); c.lineTo(tx + 5, 6 + 4 + mouth * 5); c.lineTo(tx + 9, 6); c.fill(); }
  c.restore();
  // жаберная крышка и грудной плавник
  c.strokeStyle = "rgba(22,34,61,0.6)"; c.lineWidth = 4; c.beginPath(); c.moveTo(78, -26); c.quadraticCurveTo(64, 0, 80, 26); c.stroke();
  c.save(); c.translate(62, 18); c.rotate(0.5 + Math.sin(ph * 1.3) * 0.3);
  c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-30, 14, -46, 34); c.quadraticCurveTo(-16, 30, 6, 10); c.closePath(); ink(c, "#c9562f", 3.5); c.restore();
  // повязка команды на лбу
  c.beginPath(); c.moveTo(96, -33); c.lineTo(112, -30); c.lineTo(104, 24); c.lineTo(90, 26); c.closePath(); ink(c, C.yellow, 3);
  // глаз
  c.beginPath(); c.arc(132, -14, 12, 0, TAU); ink(c, "#ffe36b", 4);
  if (tired > 0.5) { c.strokeStyle = C.ink; c.lineWidth = 4; c.beginPath(); c.moveTo(122, -14); c.lineTo(142, -14); c.stroke(); }
  else { c.fillStyle = C.ink; c.beginPath(); c.arc(136, -14, 6, 0, TAU); c.fill(); c.fillStyle = "#fff"; c.beginPath(); c.arc(138, -17, 2.2, 0, TAU); c.fill(); }
  // бровь: решительная
  c.strokeStyle = C.ink; c.lineWidth = 5; c.lineCap = "round"; c.beginPath(); c.moveTo(118, -32 + tired * 6); c.lineTo(148, -26 - (1 - tired) * 4); c.stroke();
  c.restore();
}

// Воз с поклажей. (x, y) — земля под центром; o: load 0..1 (поклажа упала), shake, rock (покачивание колёс)
const CART = { front: [300, -96], rear: [-206, -112] };
function cart(c, x, y, s, o = {}) {
  const rock = o.rock ?? 0;
  c.save(); c.translate(x + (o.shake ?? 0), y); c.scale(s, s);
  // оглобли
  c.strokeStyle = C.ink; c.lineCap = "round"; c.lineWidth = 16;
  c.beginPath(); c.moveTo(170, -118); c.lineTo(304, -94); c.stroke(); c.strokeStyle = "#9b5c26"; c.lineWidth = 9; c.stroke();
  // кузов
  c.save(); c.rotate(rock * 0.01);
  c.beginPath(); c.moveTo(-210, -182); c.lineTo(214, -182); c.lineTo(196, -96); c.lineTo(-196, -96); c.closePath(); ink(c, "#b5743a", 5);
  c.strokeStyle = "rgba(60,30,8,0.55)"; c.lineWidth = 4;
  for (const yy of [-154, -126]) { c.beginPath(); c.moveTo(-204, yy); c.lineTo(208, yy); c.stroke(); }
  for (const xx of [-150, -40, 70, 170]) { c.beginPath(); c.moveTo(xx, -180); c.lineTo(xx - 4, -98); c.stroke(); }
  c.beginPath(); c.rect(-214, -190, 432, 14); ink(c, "#8a521f", 4);
  // поклажа: падает сверху по очереди
  const L = o.load ?? 1;
  const pieces = [
    (cc) => { cc.beginPath(); cc.roundRect(-30, -96, 160, 96, 8); ink(cc, "#7a4518", 5); cc.fillStyle = "#c79a3a";
      for (const bx of [-6, 98]) { cc.beginPath(); cc.rect(bx, -96, 14, 96); ink(cc, "#c79a3a", 3); }
      cc.beginPath(); cc.arc(50, -48, 10, 0, TAU); ink(cc, "#e7c35a", 3); },
    (cc) => { sack(cc, -150, 0, 1); },
    (cc) => { cc.beginPath(); cc.ellipse(160, -50, 38, 52, 0, 0, TAU); ink(cc, "#9a6230", 5);
      cc.strokeStyle = "#5b3410"; cc.lineWidth = 6; for (const yy of [-82, -18]) { cc.beginPath(); cc.moveTo(124, yy + 50 - 50); cc.ellipse(160, yy, 36, 6, 0, 0, Math.PI); cc.stroke(); } },
    (cc) => { sack(cc, -70, -6, 0.85); },
  ];
  const T = [[0, 0.45], [0.18, 0.62], [0.32, 0.76], [0.48, 0.95]];
  pieces.forEach((p, i) => {
    const u = prog(L, T[i][0], T[i][1]); if (u <= 0) return;
    const k = springPop(u * 1.6), dy = (1 - easeOut(u * 1.4)) * -420;
    c.save(); c.translate(0, -186 + dy); c.scale(1 + (1 - k) * 0.12, k > 0 ? 0.88 + k * 0.12 : 1); p(c); c.restore();
  });
  c.restore();
  // колёса
  for (const wx of [-118, 126]) wheel(c, wx, -64, 64, rock * 0.08 + wx * 0.001);
  c.restore();
}
function sack(c, x, y, k) {
  c.save(); c.translate(x, y); c.scale(k, k);
  c.beginPath(); c.moveTo(-58, 0); c.bezierCurveTo(-74, -50, -54, -98, -20, -108); c.quadraticCurveTo(0, -122, 20, -108);
  c.bezierCurveTo(54, -98, 74, -50, 58, 0); c.closePath(); ink(c, "#e8d29c", 5);
  c.strokeStyle = C.ink; c.lineWidth = 5; c.beginPath(); c.moveTo(-16, -108); c.lineTo(16, -108); c.stroke();
  c.fillStyle = "rgba(120,90,40,0.25)"; c.beginPath(); c.ellipse(16, -40, 26, 30, 0.3, 0, TAU); c.fill();
  c.restore();
}
function wheel(c, x, y, r, a) {
  c.save(); c.translate(x, y); c.rotate(a);
  c.beginPath(); c.arc(0, 0, r, 0, TAU); c.lineWidth = 16; c.strokeStyle = C.ink; c.stroke(); c.lineWidth = 9; c.strokeStyle = "#7a4518"; c.stroke();
  c.strokeStyle = C.ink; c.lineWidth = 7; c.lineCap = "round";
  for (let i = 0; i < 8; i++) { const q = i * TAU / 8; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(q) * (r - 6), Math.sin(q) * (r - 6)); c.stroke(); }
  c.strokeStyle = "#a8682c"; c.lineWidth = 3.5;
  for (let i = 0; i < 8; i++) { const q = i * TAU / 8; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(q) * (r - 8), Math.sin(q) * (r - 8)); c.stroke(); }
  c.beginPath(); c.arc(0, 0, 13, 0, TAU); ink(c, "#5b3410", 4);
  c.restore();
}

// капли пота у героя
function sweat(c, x, y, t, k, seed = 0) {
  if (k <= 0) return;
  c.save(); c.globalAlpha *= k;
  for (let i = 0; i < 3; i++) {
    const ph = ((t * 1.6 + i / 3 + seed) % 1), dx = (i - 1) * 26 + Math.sin(seed + i) * 6, dy = ph * 46;
    c.globalAlpha = k * (1 - ph);
    c.beginPath(); c.moveTo(x + dx, y + dy - 16); c.quadraticCurveTo(x + dx + 9, y + dy, x + dx, y + dy + 4); c.quadraticCurveTo(x + dx - 9, y + dy, x + dx, y + dy - 16);
    c.fillStyle = "#8fd3ff"; c.fill(); c.strokeStyle = C.ink; c.lineWidth = 2.5; c.stroke();
  }
  c.restore();
}

// значки стихий
function iconCloud(c, x, y, s, col = "#fff") {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.beginPath(); c.arc(-18, 6, 16, 0, TAU); c.arc(4, -6, 22, 0, TAU); c.arc(24, 6, 15, 0, TAU); c.rect(-18, 6, 42, 16); c.fillStyle = col; c.fill();
  c.restore();
}
function iconBack(c, x, y, s, col = "#fff") { c.save(); c.translate(x, y); c.scale(s, s); arrow(c, 28, 0, -30, 0, 1, col, 12, 30); c.restore(); }
function iconWave(c, x, y, s, col = "#fff") {
  c.save(); c.translate(x, y); c.scale(s, s); c.strokeStyle = col; c.lineWidth = 8; c.lineCap = "round";
  for (const dy of [-10, 10]) { c.beginPath(); c.moveTo(-30, dy); for (let i = 0; i <= 6; i++) c.quadraticCurveTo(-30 + i * 10 - 5, dy + (i % 2 ? -10 : 10), -30 + i * 10, dy); c.stroke(); }
  c.restore();
}
