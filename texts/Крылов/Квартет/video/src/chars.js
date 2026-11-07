// ---------- Герои: Мартышка, Осёл, Козёл, Мишка, Соловей; скрипки, альт, бас (виолончель), стулья ----------
// (x, y) — точка на полу под героем; s — масштаб; o.dir = 1 смотрит вправо, −1 влево.
// Система туловища: начало в бедре, y вверх отрицательный.

const SPEC = {
  mart: { body: "#9b5a2b", bodyD: "#6f3d1a", belly: "#f2c99b", bw: 46, bh: 66, hip: 132, hd: 46, ua: 50, la: 48, legW: 15, armW: 14, inst: "violin" },
  osel: { body: "#8f98a6", bodyD: "#646c79", belly: "#dde1e7", bw: 56, bh: 80, hip: 148, hd: 50, ua: 46, la: 42, legW: 15, armW: 15, inst: "violin" },
  kozel: { body: "#efe6d2", bodyD: "#c2b69c", belly: "#ffffff", bw: 54, bh: 78, hip: 148, hd: 50, ua: 46, la: 42, legW: 14, armW: 14, inst: "alto" },
  mish: { body: "#8a5530", bodyD: "#5f3719", belly: "#cf9e6c", bw: 76, bh: 96, hip: 140, hd: 58, ua: 56, la: 52, legW: 26, armW: 24, inst: "cello" },
};
const SEAT = 112; // высота сиденья стула

// ---------- Инструменты ----------
function fiddleShape(c) {
  c.beginPath();
  c.moveTo(-62, 0);
  c.bezierCurveTo(-62, -36, -26, -38, -18, -24);
  c.bezierCurveTo(-10, -16, 6, -16, 14, -24);
  c.bezierCurveTo(24, -34, 56, -30, 56, 0);
  c.bezierCurveTo(56, 30, 24, 34, 14, 24);
  c.bezierCurveTo(6, 16, -10, 16, -18, 24);
  c.bezierCurveTo(-26, 38, -62, 36, -62, 0);
  c.closePath();
}
// корпус по оси +x: (x, y) — центр корпуса, ang — направление грифа, sc — размер
function fiddle(c, x, y, ang, sc, glow = 0) {
  c.save(); c.translate(x, y); c.rotate(ang); c.scale(sc, sc);
  if (glow > 0) { c.save(); c.globalAlpha = glow; c.shadowColor = C.gold; c.shadowBlur = 40; fiddleShape(c); c.fillStyle = C.gold; c.fill(); c.restore(); }
  // гриф и завиток
  rrect(c, 46, -7, 86, 14, 5); ink(c, "#3a2210", 4);
  circle(c, 138, 0, 10); ink(c, "#7a3a12", 4);
  c.fillStyle = C.ink; circle(c, 138, 0, 3.5); c.fill();
  // колки
  c.fillStyle = "#2a160a"; for (const dx of [118, 128]) { c.fillRect(dx - 2, -13, 4, 26); }
  // корпус
  fiddleShape(c); ink(c, "#b5541c", 4.5);
  c.save(); fiddleShape(c); c.clip(); c.fillStyle = "rgba(255,190,110,0.35)"; ellipse(c, 6, -14, 60, 14, 0); c.fill(); c.restore();
  // эфы
  c.strokeStyle = C.ink; c.lineWidth = 3; c.lineCap = "round";
  for (const sy of [-11, 11]) { c.beginPath(); c.moveTo(-16, sy * 0.6); c.quadraticCurveTo(-4, sy * 1.5, 8, sy * 0.6); c.stroke(); }
  // подгрифник и подставка
  c.beginPath(); c.moveTo(-58, -6); c.lineTo(-30, -9); c.lineTo(-30, 9); c.lineTo(-58, 6); c.closePath(); ink(c, "#2a160a", 0);
  c.fillStyle = "#f1d7a2"; c.fillRect(-12, -14, 5, 28);
  // струны
  c.strokeStyle = "rgba(255,255,255,0.85)"; c.lineWidth = 1.4;
  for (const sy of [-4.5, -1.5, 1.5, 4.5]) { c.beginPath(); c.moveTo(-34, sy); c.lineTo(126, sy * 0.6); c.stroke(); }
  c.restore();
}
// смычок: от руки (x, y) в направлении ang, длина len
function bow(c, x, y, ang, len) {
  c.save(); c.translate(x, y); c.rotate(ang); c.lineCap = "round";
  c.strokeStyle = C.ink; c.lineWidth = 9; c.beginPath(); c.moveTo(-8, 0); c.lineTo(len, 0); c.stroke();
  c.strokeStyle = "#5a3416"; c.lineWidth = 4.5; c.beginPath(); c.moveTo(-8, 0); c.lineTo(len, 0); c.stroke();
  c.strokeStyle = "#f6eed8"; c.lineWidth = 2.5; c.beginPath(); c.moveTo(4, 7); c.lineTo(len - 4, 3); c.stroke();
  rrect(c, -10, -4, 18, 13, 3); ink(c, "#1d1209", 2);
  c.restore();
}

// ---------- Стул (смотрит вправо, сиденье на высоте SEAT) ----------
function chair(c, x, y, s, dir = 1, rot = 0, q = 0) {
  c.save(); c.translate(x, y); c.scale(s * dir, s); c.rotate(rot);
  const bar = (x0, y0, x1, y1, w, col = C.woodD) => { c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.strokeStyle = C.ink; c.lineWidth = w + 8; c.stroke(); c.strokeStyle = col; c.lineWidth = w; c.stroke(); };
  c.lineCap = "round";
  bar(-34, 0, -36, -SEAT, 10); bar(30, 0, 34, -SEAT, 10);
  bar(-48, 0, -52, -250, 12, C.wood); bar(42, 0, 46, -SEAT, 12, C.wood);
  rrect(c, -64, -SEAT - 16, 120, 20, 7); ink(c, C.wood, 5);
  rrect(c, -66, -236, 26, 94, 8); ink(c, C.woodL, 5);
  c.restore();
  if (q > 0) { // знак вопроса над стулом
    c.save(); c.translate(x, y - 300 * s); const k = springPop(q); c.scale(k, k);
    circle(c, 0, 0, 34); ink(c, C.yellow, 5);
    c.fillStyle = C.ink; font(c, 52, F_NUM); c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("?", 0, 3);
    c.restore();
  }
}

// ---------- Головы (центр головы в (0,0), смотрят вправо) ----------
function eye(c, x, y, r, o, iris = "#ffffff", pupilW = null) {
  const bl = clamp(o.blink ?? 0, 0, 1), look = o.look ?? [0, 0];
  c.save(); c.translate(x, y); c.scale(1, 1 - bl * 0.9);
  circle(c, 0, 0, r); ink(c, iris, 3);
  c.fillStyle = C.ink;
  if (pupilW) { rrect(c, -pupilW / 2 + look[0] * r * 0.3, -r * 0.22, pupilW, r * 0.44, 2); c.fill(); }
  else { circle(c, look[0] * r * 0.35 + r * 0.15, look[1] * r * 0.35, r * 0.52); c.fill(); c.fillStyle = "#fff"; circle(c, look[0] * r * 0.35 + r * 0.32, look[1] * r * 0.35 - r * 0.2, r * 0.18); c.fill(); }
  c.restore();
  if (o.daze) { // звёздочки вместо зрачков
    c.save(); c.translate(x, y); c.rotate((o.t ?? 0) * 6); c.strokeStyle = C.ink; c.lineWidth = 3;
    for (let i = 0; i < 4; i++) { c.rotate(Math.PI / 4); c.beginPath(); c.moveTo(-r * 0.7, 0); c.lineTo(r * 0.7, 0); c.stroke(); }
    c.restore();
  }
}
function mouth(c, x, y, w, open, smile = 1, teeth = false) {
  c.save(); c.translate(x, y);
  if (open > 0.06) {
    ellipse(c, 0, open * 6, w * 0.55, 4 + open * 14); ink(c, "#5a1420", 3);
    c.save(); ellipse(c, 0, open * 6, w * 0.55, 4 + open * 14); c.clip(); c.fillStyle = "#ff7a8a"; ellipse(c, 0, open * 6 + 4 + open * 12, w * 0.4, 8); c.fill();
    if (teeth) { c.fillStyle = "#fff"; c.fillRect(-10, open * 6 - 4 - open * 14, 9, 10); c.fillRect(1, open * 6 - 4 - open * 14, 9, 10); }
    c.restore();
  } else {
    c.strokeStyle = C.ink; c.lineWidth = 4; c.lineCap = "round"; c.beginPath();
    c.moveTo(-w / 2, -2 * smile); c.quadraticCurveTo(0, 8 * smile, w / 2, -2 * smile); c.stroke();
  }
  c.restore();
}
function headMart(c, o) {
  const sp = SPEC.mart, t = o.t ?? 0;
  circle(c, -32, -2, 16); ink(c, sp.body, 4); circle(c, -32, -2, 9); ink(c, sp.belly, 0);
  // хохолок
  c.beginPath(); c.moveTo(-14, -36); c.lineTo(-6, -58 - Math.sin(t * 9) * 3); c.lineTo(2, -38); c.lineTo(12, -56 - Math.sin(t * 9 + 1) * 3); c.lineTo(16, -34); c.closePath(); ink(c, sp.bodyD, 4);
  circle(c, 0, 0, 40); ink(c, sp.body, 5);
  c.fillStyle = sp.belly; circle(c, 10, -8, 17); c.fill(); circle(c, 27, -8, 15); c.fill(); ellipse(c, 24, 14, 24, 18); c.fill();
  // бантик проказницы
  c.save(); c.translate(-20, -34); c.rotate(-0.3 + Math.sin(t * 7) * 0.08);
  c.beginPath(); c.moveTo(0, 0); c.lineTo(-22, -14); c.lineTo(-22, 14); c.closePath(); ink(c, C.magenta, 4);
  c.beginPath(); c.moveTo(0, 0); c.lineTo(22, -14); c.lineTo(22, 14); c.closePath(); ink(c, C.magenta, 4);
  circle(c, 0, 0, 7); ink(c, C.magentaD, 3); c.restore();
  eye(c, 10, -9, 8, o); eye(c, 28, -9, 7.5, o);
  c.fillStyle = C.ink; circle(c, 31, 5, 2.4); c.fill(); circle(c, 37, 5, 2.4); c.fill();
  mouth(c, 25, 20, 22, o.talk ?? 0, o.sad ? -0.7 : 1);
}
function headOsel(c, o) {
  const sp = SPEC.osel, t = o.t ?? 0, droop = o.ear ?? 0, big = o.bigEars ?? 1;
  for (const [ex, a, k] of [[-18, -0.62, 0.92], [-4, -0.32, 1]]) {
    c.save(); c.translate(ex, -24); c.rotate(a + droop * 1.2 + Math.sin(t * 3 + ex) * 0.04); c.scale(big, big);
    ellipse(c, 0, -34 * k, 13, 36 * k); ink(c, k < 1 ? sp.bodyD : sp.body, 4.5);
    ellipse(c, 1, -32 * k, 6, 25 * k); c.fillStyle = "#d9a3ae"; c.fill(); c.restore();
  }
  ellipse(c, 0, -4, 36, 32); ink(c, sp.body, 5);
  // грива
  c.beginPath(); c.moveTo(-30, -16); c.quadraticCurveTo(-18, -44, 0, -36); c.quadraticCurveTo(-6, -30, 6, -30); c.quadraticCurveTo(-14, -18, -30, -16); ink(c, "#3f4450", 3);
  // морда
  ellipse(c, 38, 18, 34, 25, 0.2); ink(c, "#cfd3da", 5);
  c.fillStyle = C.ink; ellipse(c, 60, 10, 5, 7, 0.4); c.fill();
  eye(c, 12, -10, 9, o);
  // тяжёлое веко: важно и туповато
  c.save(); c.beginPath(); c.arc(12, -10, 10.5, Math.PI * 1.05, Math.PI * 1.95); c.lineTo(12, -10); c.closePath(); ink(c, sp.body, 3); c.restore();
  mouth(c, 44, 32, 26, o.talk ?? 0, o.sad ? -0.7 : 0.6, true);
}
function headKozel(c, o) {
  const sp = SPEC.kozel, t = o.t ?? 0;
  // рога
  c.save(); c.lineCap = "round";
  for (const [dx, col] of [[-10, "#9b7440"], [2, "#b98d4f"]]) {
    c.beginPath(); c.moveTo(dx, -26); c.bezierCurveTo(dx - 6, -60, dx - 40, -62, dx - 46, -30);
    c.strokeStyle = C.ink; c.lineWidth = 19; c.stroke(); c.strokeStyle = col; c.lineWidth = 11; c.stroke();
  }
  c.restore();
  c.save(); c.translate(-24, -6); c.rotate(0.45 + Math.sin(t * 4) * 0.08); ellipse(c, -8, 0, 20, 8); ink(c, sp.body, 4); c.restore();
  // голова — вытянутая к морде
  c.beginPath(); c.moveTo(-30, -6); c.bezierCurveTo(-30, -40, 22, -38, 34, -6); c.bezierCurveTo(46, 14, 50, 30, 36, 34);
  c.bezierCurveTo(22, 38, 4, 30, -10, 22); c.bezierCurveTo(-24, 14, -30, 6, -30, -6); c.closePath(); ink(c, sp.body, 5);
  // борода
  c.beginPath(); c.moveTo(16, 30); c.quadraticCurveTo(30, 44, 22, 70 + Math.sin(t * 6) * 3); c.quadraticCurveTo(12, 50, 6, 28); c.closePath(); ink(c, "#d8cdb5", 4);
  c.fillStyle = C.ink; ellipse(c, 44, 18, 3.5, 5, 0.3); c.fill();
  eye(c, 10, -10, 9, o, "#ffd860", 11);
  mouth(c, 34, 30, 16, o.talk ?? 0, o.sad ? -0.7 : 0.5);
}
function headMish(c, o) {
  const sp = SPEC.mish;
  for (const [ex, ey] of [[-30, -40], [12, -50]]) { circle(c, ex, ey, 18); ink(c, sp.body, 5); circle(c, ex, ey, 9); c.fillStyle = sp.belly; c.fill(); }
  circle(c, 0, 0, 50); ink(c, sp.body, 5);
  ellipse(c, 32, 14, 28, 22); ink(c, "#e0b98c", 4);
  c.fillStyle = C.ink; ellipse(c, 54, 6, 11, 8); c.fill(); c.fillStyle = "rgba(255,255,255,0.6)"; ellipse(c, 51, 3, 4, 2.5); c.fill();
  c.fillStyle = "rgba(255,120,120,0.35)"; circle(c, 8, 16, 9); c.fill();
  eye(c, 14, -12, 7.5, o);
  mouth(c, 36, 28, 22, o.talk ?? 0, o.sad ? -0.7 : 0.8);
}
const HEADS = { mart: headMart, osel: headOsel, kozel: headKozel, mish: headMish };

// ---------- Ноги, хвосты, ступни ----------
function foot(c, kind, x, y) {
  if (kind === "osel" || kind === "kozel") { c.beginPath(); c.moveTo(x - 12, y - 14); c.lineTo(x + 13, y - 14); c.lineTo(x + 15, y); c.lineTo(x - 13, y); c.closePath(); ink(c, "#3b3030", 4); }
  else { ellipse(c, x + 8, y - 8, kind === "mish" ? 24 : 18, kind === "mish" ? 13 : 10); ink(c, SPEC[kind].bodyD, 4); }
}
function tail(c, kind, hx, hy, t, o) {
  const sp = SPEC[kind];
  c.save(); c.lineCap = "round";
  if (kind === "mart") {
    const w = Math.sin(t * 3.2) * 18 + (o.excite ?? 0) * Math.sin(t * 14) * 14;
    c.beginPath(); c.moveTo(hx - 30, hy + 4);
    c.bezierCurveTo(hx - 110, hy + 30, hx - 120, hy - 90 + w, hx - 70, hy - 110 + w);
    c.quadraticCurveTo(hx - 40, hy - 120 + w, hx - 52, hy - 92 + w);
    c.strokeStyle = C.ink; c.lineWidth = 17; c.stroke(); c.strokeStyle = sp.body; c.lineWidth = 9; c.stroke();
  } else if (kind === "osel") {
    const w = Math.sin(t * 2.5) * 0.2;
    c.translate(hx - 46, hy - 10); c.rotate(0.5 + w);
    c.strokeStyle = C.ink; c.lineWidth = 10; c.beginPath(); c.moveTo(0, 0); c.lineTo(-10, 56); c.stroke();
    c.strokeStyle = sp.body; c.lineWidth = 5; c.stroke();
    c.beginPath(); c.ellipse(-11, 66, 9, 15, 0.1, 0, TAU); ink(c, "#3f4450", 3);
  } else if (kind === "kozel") {
    c.translate(hx - 50, hy - 30); c.rotate(-0.6 + Math.sin(t * 9) * 0.25);
    ellipse(c, 0, -12, 9, 16); ink(c, sp.body, 4);
  } else { circle(c, hx - 70, hy - 18, 14); ink(c, sp.body, 4); }
  c.restore();
}

// ---------- Герой целиком ----------
// o: sit 0..1, walk (фаза шагов или null), bob (подскок), lean, play 0..1, ph (фаза смычка), screech 0..1,
//    pose: "down" | "up" | "point" | "plead" | "hold" | "inst" (инструмент в руках), inst 0..1 (виден инструмент),
//    talk, blink, look [x,y], sad 0..1, ear (Осёл), daze, kick (болтает ногами), excite, glow
function hero(c, kind, x, y, s, o = {}) {
  const sp = SPEC[kind], dir = o.dir ?? 1, sit = clamp(o.sit ?? 0, 0, 1), t = o.t ?? 0;
  c.save(); c.translate(x, y); c.scale(s * dir, s);
  const hipX = lerp(0, -14, sit), hipY = -lerp(sp.hip, SEAT + 10, sit) - (o.bob ?? 0);
  const lean = (o.lean ?? 0) + (o.sad ?? 0) * 0.16 + Math.sin(t * 2.1 + x) * 0.015;
  const cosL = Math.cos(lean), sinL = Math.sin(lean);
  // точка пола → система туловища
  const toT = (px, py) => { const dx = px - hipX, dy = py - hipY; return [dx * cosL + dy * sinL, -dx * sinL + dy * cosL]; };
  // ноги
  const L = sp.hip / 2 + 6, walk = o.walk, legs = [];
  for (const side of [-1, 1]) {
    let fx, fy = 0;
    const sitFoot = [hipX + 58 + side * 6 + (o.kick ?? 0) * Math.sin(t * 9 + side) * 14, -(o.kick ?? 0) * (8 + 6 * Math.sin(t * 9 + side))];
    if (walk != null) { const ph = walk + (side > 0 ? Math.PI : 0); fx = hipX + Math.sin(ph) * 30; fy = -Math.max(0, Math.cos(ph)) * 22; }
    else { fx = hipX + side * 12; }
    const fxy = [lerp(fx, sitFoot[0], sit), lerp(fy, sitFoot[1], sit)];
    legs.push(fxy);
  }
  const drawLeg = (i, col) => limb(c, hipX + (i ? 6 : -6), hipY + 6, legs[i][0], legs[i][1] - 6, L, L, 1, sp.legW, col, (hx, hy) => foot(c, kind, hx, hy + 6));
  // хвост и дальняя нога
  tail(c, kind, hipX, hipY, t, o);
  drawLeg(0, sp.bodyD);
  // поза рук и инструмент — в системе туловища
  c.save(); c.translate(hipX, hipY); c.rotate(lean);
  const S = [16, -sp.bh * 1.2], Hc = [26, -sp.bh * 1.2 - sp.hd];
  const instOn = (o.inst ?? 0) > 0.01, pose = o.pose ?? (instOn ? "inst" : "down");
  const play = o.play ?? 0, scr = o.screech ?? 0, ph = o.ph ?? 0;
  let back = [S[0] - 6, S[1] + 82], front = [S[0] + 8, S[1] + 84];
  const sway = Math.sin(t * 2.4 + x * 0.01) * 6;
  let violin = null, cello = null, bowSeg = null;
  if (pose === "up") { const w = Math.sin(t * 12) * 10; back = [S[0] - 30, S[1] - 84 + w]; front = [S[0] + 36, S[1] - 86 - w]; }
  else if (pose === "point") { back = [S[0] - 4, S[1] + 80]; front = [S[0] + 92, S[1] - 28 + Math.sin(t * 10) * 8]; }
  else if (pose === "plead") { const w = Math.sin(t * 7) * 6; back = [S[0] + 52, S[1] - 36 + w]; front = [S[0] + 62, S[1] - 30 + w]; }
  else if (pose === "down") { back = [S[0] - 10 + sway, S[1] + 82]; front = [S[0] + 10 - sway, S[1] + 84]; }
  if ((pose === "inst" || pose === "point") && instOn) {
    const k = lerp(0.5, 0.5 + 0.5 * Math.sin(ph), clamp(play + scr, 0, 1));
    if (sp.inst === "cello") {
      const ax = -Math.PI / 2 - 0.1 + scr * Math.sin(t * 40) * 0.06, sc = 1.6;
      const cx = hipX + 88, cy = -118, u = [Math.cos(ax), Math.sin(ax)];
      cello = { c: toT(cx, cy), ang: ax - lean, sc, pin: toT(cx - u[0] * 98, cy - u[1] * 98), pin2: toT(cx - u[0] * 98, 0) };
      back = toT(cx + u[0] * 110, cy + u[1] * 110);
      const con = toT(cx, cy), ba = 0.45 - lean + scr * Math.sin(t * 33) * 0.25, kk = lerp(50, 115, k);
      front = [con[0] - Math.cos(ba) * kk, con[1] - Math.sin(ba) * kk];
      bowSeg = [front[0], front[1], ba, 175];
    } else {
      const sc = sp.inst === "alto" ? 0.74 : 0.64, a = -0.16 + scr * Math.sin(t * 37) * 0.08;
      const vc = [S[0] + 34, S[1] + 16], u = [Math.cos(a), Math.sin(a)];
      violin = { c: vc, ang: a, sc };
      back = [vc[0] + u[0] * 78 * sc / 0.64, vc[1] + u[1] * 78 * sc / 0.64];
      const con = [vc[0] - u[0] * 6, vc[1] - u[1] * 6], ba = -1.15 + scr * Math.sin(t * 31) * 0.35, kk = lerp(28, 96, k);
      front = [con[0] - Math.cos(ba) * kk, con[1] - Math.sin(ba) * kk];
      bowSeg = [front[0], front[1], ba, 150];
    }
    if (pose === "point") { // смычок как дирижёрская палочка
      const w = Math.sin(t * 10) * 0.25;
      front = [S[0] + 70, S[1] - 40 + Math.sin(t * 10) * 10]; bowSeg = [front[0], front[1], -0.7 + w, 150];
    }
  }
  const hand = (hx, hy) => { circle(c, hx, hy, sp.armW * 0.75); ink(c, kind === "osel" || kind === "kozel" ? "#3b3030" : sp.bodyD, 3.5); };
  // дальняя рука
  limb(c, S[0] - 8, S[1] + 6, back[0], back[1], sp.ua, sp.la, -1, sp.armW, sp.bodyD, hand);
  c.restore();
  // туловище
  c.save(); c.translate(hipX, hipY); c.rotate(lean);
  ellipse(c, 6, -sp.bh * 0.7, sp.bw, sp.bh * 0.8); ink(c, sp.body, 5);
  c.save(); ellipse(c, 6, -sp.bh * 0.7, sp.bw, sp.bh * 0.8); c.clip(); ellipse(c, 24, -sp.bh * 0.58, sp.bw * 0.62, sp.bh * 0.6); c.fillStyle = sp.belly; c.fill(); c.restore();
  if (kind === "mish") { // бабочка у Мишки
    c.save(); c.translate(S[0] + 22, S[1] + 6); c.beginPath(); c.moveTo(0, 0); c.lineTo(-14, -10); c.lineTo(-14, 10); c.closePath(); c.moveTo(0, 0); c.lineTo(14, -10); c.lineTo(14, 10); c.closePath(); ink(c, C.red, 3); c.restore();
  }
  c.restore();
  // ближняя нога
  drawLeg(1, sp.body);
  // голова, инструмент, ближняя рука
  c.save(); c.translate(hipX, hipY); c.rotate(lean);
  if (cello) {
    c.save(); c.strokeStyle = C.ink; c.lineWidth = 6; c.beginPath(); c.moveTo(cello.pin[0], cello.pin[1]); c.lineTo(cello.pin2[0], cello.pin2[1]); c.stroke(); c.restore();
    fiddle(c, cello.c[0], cello.c[1], cello.ang, cello.sc, o.glow ?? 0);
  }
  c.save(); c.translate(Hc[0], Hc[1]); c.rotate((o.headRot ?? 0) + Math.sin(t * 3 + x) * 0.03 - (o.sad ?? 0) * 0.25 + scr * Math.sin(t * 29) * 0.08);
  HEADS[kind](c, { ...o, t });
  c.restore();
  if (violin) fiddle(c, violin.c[0], violin.c[1], violin.ang, violin.sc, o.glow ?? 0);
  if (bowSeg) bow(c, bowSeg[0], bowSeg[1], bowSeg[2], bowSeg[3]);
  limb(c, S[0] + 4, S[1] + 10, front[0], front[1], sp.ua, sp.la, -1, sp.armW, sp.body, hand);
  c.restore();
  c.restore();
}
// где у героя голова и макушка в координатах мира (для ярлыков, лампочки, звёздочек)
function headPos(kind, x, y, s, dir = 1, sit = 0) {
  const sp = SPEC[kind], hipY = -lerp(sp.hip, SEAT + 10, sit), hipX = lerp(0, -14, sit);
  const hx = hipX + 26, hy = hipY - sp.bh * 1.2 - sp.hd;
  return { x: x + hx * s * dir, y: y + hy * s, top: y + (hy - (kind === "osel" ? 110 : kind === "mish" ? 70 : 60)) * s };
}

// ---------- Соловей ----------
// o: flap 0..1, fly, sing 0..1 (клюв открыт), dir, glow
function nightingale(c, x, y, s, o = {}) {
  const t = o.t ?? 0, flap = o.flap ?? 0, sing = o.sing ?? 0;
  c.save(); c.translate(x, y); c.scale(s * (o.dir ?? 1), s); c.rotate(o.rot ?? 0);
  if ((o.glow ?? 0) > 0) { const g = c.createRadialGradient(0, -10, 10, 0, -10, 160); g.addColorStop(0, `rgba(255,214,90,${0.55 * o.glow})`); g.addColorStop(1, "rgba(255,214,90,0)"); c.fillStyle = g; c.fillRect(-170, -180, 340, 340); }
  // лапки
  if (!o.fly) { c.strokeStyle = C.ink; c.lineWidth = 4; c.lineCap = "round"; for (const dx of [-4, 10]) { c.beginPath(); c.moveTo(dx, 18); c.lineTo(dx + 2, 36); c.lineTo(dx + 10, 38); c.stroke(); } }
  // хвост
  c.save(); c.translate(-30, 2); c.rotate(0.28 + Math.sin(t * 5) * 0.08);
  c.beginPath(); c.moveTo(0, -8); c.lineTo(-62, -14); c.quadraticCurveTo(-70, 0, -62, 14); c.lineTo(0, 8); c.closePath(); ink(c, "#b5652e", 4); c.restore();
  // дальнее крыло
  if (o.fly) { c.save(); c.translate(-2, -14); c.rotate(-0.5 - flap * 1.4); ellipse(c, -26, 0, 34, 12); ink(c, "#5d4426", 4); c.restore(); }
  // туловище
  ellipse(c, 0, 0, 38, 26, -0.15); ink(c, "#8b6b43", 4.5);
  c.save(); ellipse(c, 0, 0, 38, 26, -0.15); c.clip(); ellipse(c, 10, 18, 30, 18); c.fillStyle = "#efe2c6"; c.fill(); c.restore();
  // голова
  circle(c, 30, -20, 19); ink(c, "#8b6b43", 4.5);
  c.save(); circle(c, 30, -20, 19); c.clip(); ellipse(c, 38, -8, 14, 9); c.fillStyle = "#efe2c6"; c.fill(); c.restore();
  // клюв
  c.save(); c.translate(46, -22);
  c.save(); c.rotate(-sing * 0.45); c.beginPath(); c.moveTo(0, -4); c.lineTo(22, 0); c.lineTo(0, 2); c.closePath(); ink(c, "#3a2a1a", 3); c.restore();
  c.save(); c.rotate(sing * 0.35); c.beginPath(); c.moveTo(0, 2); c.lineTo(18, 2); c.lineTo(0, 6); c.closePath(); ink(c, "#3a2a1a", 3); c.restore();
  c.restore();
  // глаз
  c.fillStyle = C.ink; circle(c, 36, -24, 4.5); c.fill(); c.fillStyle = "#fff"; circle(c, 37.5, -26, 1.6); c.fill();
  // ближнее крыло
  c.save(); c.translate(-4, -6); c.rotate(o.fly ? -0.3 - flap * 1.5 : 0.18); ellipse(c, -20, 2, 30, 14); ink(c, "#6e522f", 4); c.restore();
  c.restore();
}
