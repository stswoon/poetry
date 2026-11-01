// Персонажи и предметы росписи: солнце, изба с сенями, плетень, ласточка, девочка, клеймо дальних стран, кисть.
const GROUND = (x) => 862 + 16 * Math.sin(x * 0.0041 + 1.1) + 6 * Math.sin(x * 0.013);

// ---------- Солнце ----------
const SUN = { x: 562, y: 218, r: 76 };
function sun(c, t) {
  const a = t - EV.sol; if (a < -0.1) return;
  const k = springLand(a + 0.1), grow = 1 + 0.2 * sstep(prog(t, EV.sol2, EV.kra + 0.5)), happy = sstep(prog(t, EV.sol2, EV.kra + 0.3));
  const R = SUN.r * grow, rot = t * 0.1;
  c.save(); c.translate(SUN.x, SUN.y); c.scale(k, k);
  const rays = 16;
  for (let i = 0; i < rays; i++) {
    const b = i / rays * TAU + rot, big = i % 2 === 0, u = springSoft((a - 0.1 - i * 0.022) * 1.6), L = (big ? 66 : 40) * (1 + 0.14 * Math.sin(t * 2.2 + i)) * grow;
    drop(c, Math.cos(b) * R * 0.98, Math.sin(b) * R * 0.98, L, big ? 25 : 18, b, big ? C.red : C.orange, u);
    if (big) drop(c, Math.cos(b) * R * 1.04, Math.sin(b) * R * 1.04, L * 0.68, 5, b, C.white, sstep((a - 0.55) * 2.2));
  }
  // второй ряд лучей на «краше»
  if (happy > 0) for (let i = 0; i < rays; i++) { const b = (i + 0.5) / rays * TAU - rot * 0.7, u = springSoft((t - EV.sol2 - i * 0.03) * 1.3); drop(c, Math.cos(b) * R * 1.56, Math.sin(b) * R * 1.56, 24, 11, b, C.orangeD, u); }
  dab(c, 0, 0, R, C.gold, 2);
  arcS(c, 0, 0, R * 0.9, 0.3, 2.9, R * 0.11, C.orange, sstep(a * 3));
  arcS(c, 0, 0, R * 0.9, 3.45, 6.05, R * 0.11, C.orange, sstep(a * 3));
  const u3 = sstep((a - 0.35) * 2.5);
  if (u3 > 0) for (let i = 0; i < 18; i++) { const b = i / 18 * TAU; dot(c, Math.cos(b) * R * 0.78, Math.sin(b) * R * 0.78, 2.6 * u3, C.white); }
  // лицо
  const fs = R / 76;
  c.save(); c.scale(fs, fs);
  const blink = (t % 3.7) > 3.55 ? 0.15 : 1;
  for (const s of [-1, 1]) { c.fillStyle = C.black; c.beginPath(); c.ellipse(s * 24, -10, 7.5, 9.5 * blink, 0, 0, TAU); c.fill(); if (blink === 1) dot(c, s * 24 + 2, -13, 2.4, C.white); dot(c, s * 42, 12, 11, "rgba(226,70,60,.55)"); }
  c.lineCap = "round"; c.strokeStyle = C.redD; c.lineWidth = 6; c.beginPath(); c.arc(0, 8, 24 + happy * 4, 0.32 - happy * 0.1, Math.PI - 0.32 + happy * 0.1); c.stroke();
  c.restore(); c.restore();
  // блеск на «блестит»
  if (t > EV.ble - 0.05) { const per = 1.5; for (let i = 0; i < 8; i++) { const ph = (t - EV.ble + 0.05 + i * 0.37) % per, u = ph / 0.55; if (u > 1) continue; const b = i * 2.399, d = (R + 74) * (0.86 + 0.12 * (i % 3)), s = Math.sin(u * Math.PI) * (i % 2 ? 15 : 22); const sy = SUN.y + Math.sin(b) * d; if (sy > 100) star(c, SUN.x + Math.cos(b) * d, sy, s); } }
}
function star(c, x, y, s) { if (s <= 0) return; c.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, r = i % 2 ? s * 0.26 : s; const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; if (i === 0) c.moveTo(px, py); else c.lineTo(px, py); } c.closePath(); c.fillStyle = C.white; c.fill(); c.lineWidth = 1.6; c.strokeStyle = C.orangeD; c.stroke(); }

// ---------- Изба с сенями ----------
const HS = { x: 330, base: 858, wall: 164, top: 496, ridge: 300, door: 66, doorTop: 610 };
function house(c, t) {
  const a = t - (EV.las + 0.55); if (a < 0) return;
  const k = springLand(a * 1.05);
  c.save(); c.translate(HS.x, HS.base); c.scale(lerp(0.92, 1, k), k); c.translate(-HS.x, -HS.base);
  const x0 = HS.x - HS.wall, x1 = HS.x + HS.wall, y0 = HS.top, yb = HS.base;
  // брёвна
  c.beginPath(); c.rect(x0, y0, x1 - x0, yb - y0); c.fillStyle = "#a43b1c"; c.fill();
  for (let i = 0; i < 9; i++) { const y = y0 + i * 42 + 8; c.fillStyle = i % 2 ? "#8f2f15" : "#b4471f"; c.fillRect(x0, y, x1 - x0, 37); c.fillStyle = C.brownD; c.fillRect(x0, y + 37, x1 - x0, 5); drop(c, x0 + 30 + (i % 2) * 34, y + 19, 70, 6, 0, "rgba(255,220,170,.55)"); drop(c, x1 - 110 - (i % 2) * 24, y + 19, 70, 6, 0, "rgba(255,220,170,.55)"); }
  for (const s of [-1, 1]) for (let i = 0; i < 9; i++) { const y = y0 + i * 42 + 8; c.beginPath(); c.ellipse(HS.x + s * HS.wall, y + 19, 13, 20, 0, 0, TAU); c.fillStyle = "#d58c47"; c.fill(); c.lineWidth = 3; c.strokeStyle = C.brownD; c.stroke(); dot(c, HS.x + s * HS.wall, y + 19, 3, C.brownD); }
  // фронтон
  c.beginPath(); c.moveTo(x0 - 6, y0 + 3); c.lineTo(HS.x, HS.ridge + 26); c.lineTo(x1 + 6, y0 + 3); c.closePath(); c.fillStyle = C.cream; c.fill();
  rosan(c, { x: HS.x, y: y0 - 60, r: 44, p: P_RED, t: -5 }, 0);
  for (const s of [-1, 1]) { drop(c, HS.x + s * 50, y0 - 38, 62, 20, s > 0 ? -0.1 : Math.PI + 0.1, C.green); drop(c, HS.x + s * 52, y0 - 38, 50, 5, s > 0 ? -0.1 : Math.PI + 0.1, C.white); }
  // крыша и причелины
  for (const s of [-1, 1]) {
    const ex = HS.x + s * (HS.wall + 38), ey = y0 + 26;
    c.beginPath(); c.moveTo(HS.x, HS.ridge - 12); c.lineTo(ex, ey); c.lineTo(ex - s * 2, ey + 28); c.lineTo(HS.x, HS.ridge + 28); c.closePath(); c.fillStyle = C.blue; c.fill(); c.lineWidth = 4; c.strokeStyle = C.black; c.stroke();
    const n = 7; for (let i = 1; i < n; i++) { const u = i / n, x = lerp(HS.x, ex, u), y = lerp(HS.ridge + 8, ey + 14, u); dot(c, x, y, 5, C.white); }
    for (let i = 0; i < 9; i++) { const u = (i + 0.5) / 9, x = lerp(HS.x, ex, u), y = lerp(HS.ridge + 30, ey + 30, u); c.beginPath(); c.arc(x, y, 12, 0, Math.PI); c.fillStyle = C.white; c.fill(); dot(c, x, y + 6, 3, C.red); }
  }
  // конёк
  drop(c, HS.x - 2, HS.ridge - 6, 58, 24, -1.57, C.red); drop(c, HS.x - 2, HS.ridge - 10, 42, 6, -1.57, C.white); dot(c, HS.x, HS.ridge - 66, 7, C.black);
  // дверной проём
  const dx0 = HS.x - HS.door, dx1 = HS.x + HS.door, dy0 = HS.doorTop;
  c.fillStyle = "#2a1208"; c.fillRect(dx0, dy0, dx1 - dx0, yb - dy0);
  const open = sstep(prog(t, EV.sen - 0.05, EV.sen + 0.42));
  if (open > 0) { const g = c.createLinearGradient(0, dy0, 0, yb); g.addColorStop(0, "rgba(255,190,90,.65)"); g.addColorStop(1, "rgba(255,210,120,.2)"); c.fillStyle = g; c.fillRect(dx0, dy0, dx1 - dx0, yb - dy0); }
  // створка
  const dw = (dx1 - dx0) * lerp(1, 0.2, open);
  c.fillStyle = C.teal; c.fillRect(dx0, dy0, dw, yb - dy0); c.fillStyle = C.tealD; for (let i = 1; i < 4; i++) c.fillRect(dx0 + dw * i / 4 - 1.5, dy0, 3, yb - dy0);
  if (open < 0.6) { const u = 1 - open / 0.6; rosan(c, { x: dx0 + dw / 2, y: dy0 + 90, r: 30 * u, p: P_RED, t: -5 }, 0); dot(c, dx0 + dw - 16, dy0 + 140, 7 * u, C.gold); }
  c.lineWidth = 3; c.strokeStyle = C.black; c.strokeRect(dx0, dy0, dw, yb - dy0);
  // наличник
  c.fillStyle = C.cream; c.fillRect(dx0 - 18, dy0, 18, yb - dy0); c.fillRect(dx1, dy0, 18, yb - dy0);
  c.beginPath(); c.moveTo(dx0 - 28, dy0); c.lineTo(HS.x, dy0 - 50); c.lineTo(dx1 + 28, dy0); c.closePath(); c.fillStyle = C.cream; c.fill(); c.lineWidth = 3; c.stroke();
  drop(c, HS.x - 44, dy0 - 10, 36, 13, -0.45, C.red); drop(c, HS.x + 44, dy0 - 10, 36, 13, Math.PI + 0.45, C.red); dot(c, HS.x, dy0 - 18, 9, C.blue); dot(c, HS.x, dy0 - 18, 3, C.white);
  for (let i = 0; i < 5; i++) { const y = dy0 + 26 + i * 44; dot(c, dx0 - 9, y, 4, C.red); dot(c, dx1 + 9, y, 4, C.red); }
  // ступень
  c.fillStyle = C.brown; c.fillRect(dx0 - 26, yb - 7, dx1 - dx0 + 52, 14);
  c.restore();
}

// ---------- Плетень ----------
const FENCE = { x0: 548, x1: 1016, top: 668, posts: [566, 660, 770, 880, 990] };
const PERCH = { x: 660, y: 642 };
function fence(c, t) {
  const a = t - (EV.L6 + 0.1); if (a < 0) return;
  c.save();
  FENCE.posts.forEach((x, i) => { const k = springLand((a - i * 0.07) * 1.1); if (k <= 0) return; const b = GROUND(x), top = lerp(b, FENCE.top + (i % 2) * 8, k); c.fillStyle = C.brown; c.beginPath(); c.roundRect(x - 11, top, 22, b - top + 6, 8); c.fill(); c.lineWidth = 3; c.strokeStyle = C.brownD; c.stroke(); c.beginPath(); c.ellipse(x, top + 2, 12, 7, 0, 0, TAU); c.fillStyle = "#d58c47"; c.fill(); c.stroke(); });
  const u = sstep(a * 1.8);
  for (let r = 0; r < 4; r++) { const y = 712 + r * 34; c.save(); c.beginPath(); c.rect(FENCE.x0 - 6, 0, (FENCE.x1 - FENCE.x0 + 12) * u, H); c.clip();
    c.lineCap = "round"; c.strokeStyle = r % 2 ? "#8d5426" : "#a86a30"; c.lineWidth = 14; c.beginPath(); for (let x = FENCE.x0; x <= FENCE.x1; x += 10) { const yy = y + 9 * Math.sin((x - FENCE.x0) / 110 * Math.PI + r * Math.PI); if (x === FENCE.x0) c.moveTo(x, yy); else c.lineTo(x, yy); } c.stroke();
    c.strokeStyle = "rgba(255,235,190,.75)"; c.lineWidth = 2.4; c.beginPath(); for (let x = FENCE.x0; x <= FENCE.x1; x += 10) { const yy = y - 2 + 9 * Math.sin((x - FENCE.x0) / 110 * Math.PI + r * Math.PI); if (x === FENCE.x0) c.moveTo(x, yy); else c.lineTo(x, yy); } c.stroke(); c.restore(); }
  c.restore();
}

// ---------- Ласточка (смотрит вправо, dir = −1 — влево) ----------
function swallow(c, x, y, s, dir, rot, o = {}) {
  const dark = "#13204c", mid = "#23408f", flap = o.flap === undefined ? 0.9 : o.flap, beak = o.beak || 0;
  c.save(); c.translate(x, y); c.scale(s * dir, s); c.rotate(rot);
  // дальнее крыло
  if (!o.perched) { c.save(); c.translate(6, -16); c.scale(0.92, -flap * 0.82 + 0.05); c.rotate(-0.1); wingShape(c, "#0c1538", false); c.restore(); }
  // хвост-вилка
  drop(c, -146, o.perched ? 28 : 16, 96, 19, o.perched ? -0.2 : -0.1, dark);
  drop(c, -134, o.perched ? 52 : -18, 86, 19, o.perched ? -0.42 : 0.25, dark);
  // тело
  c.beginPath(); c.moveTo(78, -10); c.bezierCurveTo(54, -44, -8, -40, -66, -2); c.bezierCurveTo(-24, 24, 44, 32, 78, -10); c.closePath(); c.fillStyle = dark; c.fill();
  // белое брюшко
  c.beginPath(); c.moveTo(62, 7); c.bezierCurveTo(38, 30, -18, 25, -54, 0); c.bezierCurveTo(-14, 7, 30, 5, 62, 7); c.closePath(); c.fillStyle = C.white; c.fill();
  // красное горло и лоб
  c.beginPath(); c.ellipse(60, 1, 18, 12, -0.45, 0, TAU); c.fillStyle = C.red; c.fill();
  c.beginPath(); c.ellipse(72, -13, 7, 4, 0.5, 0, TAU); c.fill();
  // клюв
  c.save(); c.translate(76, -10); c.fillStyle = C.black;
  c.save(); c.rotate(-beak * 0.42); c.beginPath(); c.moveTo(0, -5); c.lineTo(23, 0); c.lineTo(0, 4); c.closePath(); c.fill(); c.restore();
  c.save(); c.rotate(beak * 0.42); c.beginPath(); c.moveTo(0, -1); c.lineTo(20, 2); c.lineTo(0, 6); c.closePath(); c.fill(); c.restore();
  c.restore();
  // глаз
  dot(c, 56, -18, 7.5, C.white); dot(c, 58, -18, 4.6, C.black); dot(c, 59.6, -19.6, 1.5, C.white);
  // ноги
  if (o.perched) { c.strokeStyle = C.black; c.lineWidth = 4; c.lineCap = "round"; for (const q of [14, 30]) { c.beginPath(); c.moveTo(q, 19); c.lineTo(q - 2, 30); c.lineTo(q + 8, 33); c.stroke(); } }
  // ближнее крыло
  if (o.perched) {
    c.beginPath(); c.moveTo(34, -18); c.bezierCurveTo(4, -38, -74, -22, -134, 28); c.bezierCurveTo(-74, 14, -6, 16, 34, -18); c.closePath(); c.fillStyle = mid; c.fill(); c.lineWidth = 2.5; c.strokeStyle = "#0c1538"; c.stroke();
    for (let i = 0; i < 4; i++) drop(c, 12 - i * 28, -9 + i * 5, 26, 7, 2.75, C.white);
  } else { c.save(); c.translate(10, -18); c.scale(1, flap); wingShape(c, mid, true); c.restore(); }
  c.restore();
}
function wingShape(c, col, ozh) {
  c.beginPath(); c.moveTo(30, 2); c.bezierCurveTo(18, -66, -36, -126, -104, -152); c.bezierCurveTo(-78, -94, -56, -38, -28, 4); c.closePath(); c.fillStyle = col; c.fill(); c.lineWidth = 2.5; c.strokeStyle = "#0c1538"; c.stroke();
  if (ozh) for (let i = 0; i < 4; i++) { const u = i / 4; drop(c, lerp(2, -56, u), lerp(-26, -106, u), 26, 8, -2.1, C.white); }
}

// ---------- Девочка (смотрит вправо) ----------
function child(c, x, y, s, o = {}) {
  const arm = o.arm === undefined ? 1.25 : o.arm, step = o.step || 0, hand = o.hand || 0;
  c.save(); c.translate(x, y + Math.abs(step) * -4); c.scale(s, s);
  // ботинки
  c.fillStyle = C.black;
  c.beginPath(); c.ellipse(-18 + step * 10, -3, 19, 9, 0, 0, TAU); c.fill(); c.beginPath(); c.ellipse(22 - step * 10, -3, 19, 9, 0, 0, TAU); c.fill();
  // дальняя рука
  c.save(); c.translate(-20, -128); c.rotate(1.75); c.strokeStyle = "#ece2c7"; c.lineWidth = 19; c.lineCap = "round"; c.beginPath(); c.moveTo(0, 0); c.lineTo(52, 0); c.stroke(); dot(c, 60, 0, 9.5, C.skin); c.restore();
  // сарафан
  c.beginPath(); c.moveTo(-26, -138); c.lineTo(26, -138); c.bezierCurveTo(36, -90, 54, -46, 62, -10); c.bezierCurveTo(30, -2, -30, -2, -62, -10); c.bezierCurveTo(-54, -46, -36, -90, -26, -138); c.closePath(); c.fillStyle = C.red; c.fill(); c.lineWidth = 3; c.strokeStyle = C.redD; c.stroke();
  // подол и оживка
  c.beginPath(); c.moveTo(-58, -30); c.bezierCurveTo(-28, -21, 28, -21, 58, -30); c.lineTo(62, -10); c.bezierCurveTo(30, -2, -30, -2, -62, -10); c.closePath(); c.fillStyle = C.blue; c.fill();
  for (let i = 0; i < 7; i++) dot(c, -48 + i * 16, -16 + Math.abs(i - 3) * -1.4, 3.2, C.white);
  rosan(c, { x: 0, y: -70, r: 21, p: { base: C.gold, dark: C.orangeD, light: C.white }, t: -5 }, 0);
  for (const q of [-1, 1]) { drop(c, q * 16, -62, 26, 10, q > 0 ? 0.6 : Math.PI - 0.6, C.green); }
  // рубашка
  c.beginPath(); c.moveTo(-24, -128); c.bezierCurveTo(-24, -150, 24, -150, 24, -128); c.lineTo(26, -118); c.lineTo(-26, -118); c.closePath(); c.fillStyle = C.white; c.fill();
  // голова
  dab(c, 2, -176, 41, C.skin, 3);
  dot(c, 22, -160, 8.5, "rgba(230,90,80,.5)");
  c.fillStyle = C.black; const blink = (o.t % 3.1) > 2.96 ? 0.15 : 1;
  c.beginPath(); c.ellipse(26, -178, 4.8, 6 * blink, 0, 0, TAU); c.fill(); c.beginPath(); c.ellipse(4, -178, 4.8, 6 * blink, 0, 0, TAU); c.fill();
  c.lineCap = "round"; c.strokeStyle = C.redD; c.lineWidth = 3.6; c.beginPath(); c.arc(16, -162, 11, 0.3, 2.5); c.stroke();
  // платок
  c.beginPath(); c.moveTo(-40, -158); c.bezierCurveTo(-52, -232, 42, -240, 45, -190); c.bezierCurveTo(16, -204, -14, -198, -18, -152); c.bezierCurveTo(-26, -140, -38, -146, -40, -158); c.closePath(); c.fillStyle = C.blue; c.fill(); c.lineWidth = 3; c.strokeStyle = C.blueD; c.stroke();
  for (const [a, b] of [[-26, -192], [-8, -212], [14, -218], [-30, -170], [-14, -196]]) dot(c, a, b, 3.4, C.white);
  drop(c, -28, -144, 34, 17, 2.3, C.blue);
  // ближняя рука
  c.save(); c.translate(18, -128); c.rotate(-arm); c.strokeStyle = "#fff"; c.lineWidth = 20; c.lineCap = "round"; c.beginPath(); c.moveTo(0, 0); c.lineTo(58, 0); c.stroke(); c.lineWidth = 3; c.strokeStyle = C.red; c.beginPath(); c.moveTo(48, -9); c.lineTo(48, 9); c.stroke();
  dot(c, 71, 0, 11, C.skin);
  if (hand > 0) { for (let i = 0; i < 3; i++) dot(c, 77 - i * 5, -10 - i, 2.8 * hand, C.orangeD); }
  c.restore();
  c.restore();
}

// ---------- Клеймо дальних стран ----------
const MED = { x: 830, y: 424, r: 166 };
function medallion(c, t) {
  const open = springSoft((t - EV.str + 0.04) * 1.2), shut = sstep(prog(t, EV.wipe3 + 0.1, EV.wipe3 + 0.65));
  if (t < EV.str - 0.04 || shut >= 1) return;
  const R = MED.r * open * (1 - shut);
  if (R <= 12) return;
  c.save(); c.translate(MED.x, MED.y);
  c.save(); c.beginPath(); c.arc(0, 0, R, 0, TAU); c.clip();
  const s = R / MED.r; c.scale(s, s);
  // небо, солнце
  const g = c.createLinearGradient(0, -MED.r, 0, 40); g.addColorStop(0, "#11807c"); g.addColorStop(1, "#7fd0b8"); c.fillStyle = g; c.fillRect(-MED.r, -MED.r, MED.r * 2, MED.r * 2);
  dab(c, 62, -14, 44, C.orange, 4); for (let i = 0; i < 12; i++) { const b = i / 12 * TAU + t * 0.25; drop(c, 62 + Math.cos(b) * 50, -14 + Math.sin(b) * 50, 22, 9, b, C.gold); }
  // море
  c.fillStyle = C.blue; c.fillRect(-MED.r, 34, MED.r * 2, 150);
  for (let r = 0; r < 4; r++) for (let i = 0; i < 9; i++) { const x = -160 + i * 42 + (r % 2) * 22 + ((t * 11) % 42), y = 54 + r * 26; arcS(c, x, y, 13, 3.5, 5.9, 3.6, C.white); }
  // парус
  c.save(); c.translate(64 + 8 * Math.sin(t * 0.8), 34 + 2 * Math.sin(t * 1.7)); c.fillStyle = C.brownD; c.beginPath(); c.moveTo(-34, 0); c.lineTo(32, 0); c.lineTo(20, 15); c.lineTo(-20, 15); c.closePath(); c.fill(); c.fillRect(-2, -66, 4, 66);
  c.beginPath(); c.moveTo(4, -64); c.quadraticCurveTo(44, -28, 28, -7); c.lineTo(4, -7); c.closePath(); c.fillStyle = C.white; c.fill(); c.beginPath(); c.moveTo(-5, -56); c.quadraticCurveTo(-34, -28, -28, -7); c.lineTo(-5, -7); c.closePath(); c.fillStyle = C.red; c.fill(); c.restore();
  // остров с пальмой
  c.beginPath(); c.ellipse(-106, 122, 96, 42, 0, 0, TAU); c.fillStyle = C.gold; c.fill();
  c.lineCap = "round"; c.strokeStyle = C.brown; c.lineWidth = 15; c.beginPath(); c.moveTo(-104, 100); c.quadraticCurveTo(-108, 40, -82, -24); c.stroke();
  for (let i = 0; i < 7; i++) { const b = -2.9 + i * 0.68 + 0.05 * Math.sin(t * 1.8 + i); drop(c, -82, -24, 86, 26, b, C.green, 1, 0.16 * (Math.cos(b) > 0 ? 1 : -1)); drop(c, -82, -24, 66, 4, b, C.white, 1, 0.16 * (Math.cos(b) > 0 ? 1 : -1)); }
  dot(c, -90, -14, 7, C.brownD); dot(c, -72, -12, 7, C.brownD);
  c.restore();
  // обод
  c.beginPath(); c.arc(0, 0, R, 0, TAU); c.lineWidth = 18; c.strokeStyle = C.red; c.stroke(); c.beginPath(); c.arc(0, 0, R + 10, 0, TAU); c.lineWidth = 3; c.strokeStyle = C.black; c.stroke(); c.beginPath(); c.arc(0, 0, R - 10, 0, TAU); c.lineWidth = 3; c.stroke();
  for (let i = 0; i < 34; i++) { const b = i / 34 * TAU + 0.1; dot(c, Math.cos(b) * R, Math.sin(b) * R, 3.6, C.white); }
  c.restore();
}

// ---------- Нота ----------
function noteGlyph(c, x, y, s, col, rot, dbl) {
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s); c.fillStyle = col; c.strokeStyle = col; c.lineWidth = 5; c.lineCap = "round";
  c.beginPath(); c.ellipse(0, 0, 11, 8, -0.4, 0, TAU); c.fill(); c.beginPath(); c.moveTo(9.5, -2); c.lineTo(9.5, -36); c.stroke();
  if (dbl) { c.beginPath(); c.ellipse(29, -7, 11, 8, -0.4, 0, TAU); c.fill(); c.beginPath(); c.moveTo(38.5, -9); c.lineTo(38.5, -40); c.stroke(); c.lineWidth = 8; c.beginPath(); c.moveTo(9.5, -36); c.lineTo(38.5, -40); c.stroke(); }
  else { c.beginPath(); c.moveTo(9.5, -36); c.quadraticCurveTo(24, -28, 21, -14); c.stroke(); }
  c.restore();
}

// ---------- Кисть ----------
function brush(c, x, y, ang) {
  c.save(); c.translate(x, y); c.rotate(ang);
  c.lineCap = "round"; c.strokeStyle = C.brown; c.lineWidth = 20; c.beginPath(); c.moveTo(0, -102); c.lineTo(0, -320); c.stroke(); c.strokeStyle = C.red; c.lineWidth = 12; c.beginPath(); c.moveTo(0, -240); c.lineTo(0, -320); c.stroke();
  c.fillStyle = "#cfd2d6"; c.fillRect(-15, -112, 30, 40); c.fillStyle = "rgba(30,30,40,.35)"; c.fillRect(-15, -112, 7, 40);
  c.beginPath(); c.moveTo(-15, -74); c.bezierCurveTo(-24, -40, -10, -10, 0, 8); c.bezierCurveTo(10, -10, 24, -40, 15, -74); c.closePath(); c.fillStyle = C.gold; c.fill(); c.lineWidth = 2.5; c.strokeStyle = C.orangeD; c.stroke();
  c.restore();
}
