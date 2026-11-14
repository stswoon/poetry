// ---------- Звери: лев, тигр, барс. Вид сбоку, морда к зрителю, мультяшный контур ----------
// p: { x, y (земля), s, dir (1 вправо, -1 влево), walk (фаза), stride, lie, crouch, stretch, jump, look [x,y],
//      mouth, brow, blink, tail (взмах), lash, lick, fear, snarl, mane (встряхивание), sleep, breathe }
const KIND = {
  lion: { body: C.lion, bodyD: C.lionD, belly: "#f6cf86", len: 1.0, h: 1.0, head: 1.0 },
  tiger: { body: C.tiger, bodyD: C.tigerD, belly: "#fff1d8", len: 1.02, h: 0.92, head: 0.92 },
  bars: { body: C.bars, bodyD: C.barsD, belly: "#fff6dc", len: 0.82, h: 0.78, head: 0.74 },
};
// кошачья лапа: плоская подошва, округлый верх, полоски между пальцами; claws > 0 — выпущенные когти
function pawShape(c, x, y, k, col, claws = 0) {
  c.save(); c.translate(x, y); c.scale(k, k);
  if (claws > 0.3) { c.fillStyle = "#fff"; c.strokeStyle = C.ink; c.lineWidth = 2.5;
    for (const dy of [-14, -6, 2]) { c.beginPath(); c.moveTo(30, dy - 3); c.lineTo(44 + 4 * claws, dy + 1); c.lineTo(30, dy + 4); c.closePath(); c.fill(); c.stroke(); } }
  c.beginPath(); c.moveTo(-16, 2); c.lineTo(26, 2);
  c.bezierCurveTo(36, 2, 38, -18, 24, -21); c.bezierCurveTo(14, -24, -6, -24, -14, -17); c.bezierCurveTo(-20, -12, -20, 2, -16, 2); c.closePath();
  ink(c, col, 4.5);
  c.strokeStyle = C.ink; c.lineWidth = 3.2; c.lineCap = "round";
  for (const tx of [8, 18]) { c.beginPath(); c.moveTo(tx + 2, 1); c.lineTo(tx, -9); c.stroke(); }
  c.restore();
}
// леопардовые розетки: охристое пятно и разорванное кольцо из тёмных дужек, по сетке с разбросом
const ROSETTES = (() => { const r = mulberry32(3), a = [];
  for (let gy = -62; gy <= 40; gy += 30) for (let gx = -150; gx <= 150; gx += 34) {
    const x = gx + (gy / 30) % 2 * 17 + (r() - 0.5) * 12, y = gy + (r() - 0.5) * 10;
    if ((x / 150) ** 2 + ((y + 4) / 66) ** 2 < 0.85 && y < 18) a.push([x, y, 6 + r() * 3, r() * TAU]); }
  return a; })();
function rosettes(c) {
  for (const [x, y, rad, a0] of ROSETTES) {
    ellipse(c, x, y, rad * 0.75, rad * 0.6, a0); c.fillStyle = "#d99a3a"; c.fill();
    c.strokeStyle = "#4a2c0a"; c.lineWidth = 3.6; c.lineCap = "round";
    for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(x, y, rad + 2, a0 + k * 2.1, a0 + k * 2.1 + 1.35); c.stroke(); }
  }
}
// капля пота
function sweat(c, x, y, k) { c.save(); c.translate(x, y); c.scale(k, k); c.beginPath(); c.moveTo(0, -9); c.quadraticCurveTo(7, 2, 0, 5); c.quadraticCurveTo(-7, 2, 0, -9); ink(c, C.blueL, 2.5); c.restore(); }
function beast(c, kind, p, t) {
  const K = KIND[kind], s = p.s || 1, dir = p.dir || 1;
  const lie = p.lie || 0, crouch = p.crouch || 0, stretch = p.stretch || 0, jump = p.jump || 0;
  const shiver = (p.fear || 0) > 0.3 ? Math.sin(t * 57) * 2.5 * p.fear : 0; // дрожит от страха
  c.save(); c.translate(p.x + shiver, p.y); c.scale(s * dir, s);
  // тень
  c.save(); c.scale(1, 1); c.fillStyle = "rgba(60,20,30,0.28)"; ellipse(c, 0, 9, 160 * K.len * (1 - 0.3 * jump), 9 * (1 - 0.5 * jump)); c.fill(); c.restore();
  const air = p.air || 0; // высота прыжка
  const breathe = Math.sin(t * (p.sleep ? 2.2 : 3.4) + (p.ph || 0)) * (p.sleep ? 4 : 2.5);
  const bodyH = lerp(lerp(118, 52, lie), 80, crouch * (1 - lie)) * K.h;
  const shX = 92 * K.len, hpX = -98 * K.len;
  let shY = -bodyH - air, hpY = -bodyH - air - 4;
  shY += stretch * 48; hpY -= stretch * 18;
  const tiltBody = Math.atan2(shY - hpY, shX - hpX);
  // лапы: цели
  const ph = p.walk || 0, st = (p.stride || 0) * 34;
  const legs = [ // [якорь x, якорь y, смещение фазы, ближняя?, передняя?]
    [shX - 8, shY + 20, Math.PI, false, true], [hpX + 6, hpY + 22, 0, false, false],
    [shX + 4, shY + 22, 0, true, true], [hpX - 4, hpY + 24, Math.PI, true, false],
  ];
  const UL = 58 * K.h, LL = 58 * K.h;
  const legPath = (L) => {
    const [ax, ay, off, near, front] = L;
    const gy = near ? 10 : 6; // подошвы на земле; дальние лапы чуть глубже
    let tx = ax + Math.sin(ph + off) * st, ty = gy - Math.max(0, Math.cos(ph + off)) * st * 0.5;
    if (front && stretch > 0) { tx = lerp(tx, ax + 120, stretch); ty = lerp(ty, gy, stretch); }
    if (lie > 0) {
      const lx = front ? ax + 86 : ax + 34, ly = gy;
      tx = lerp(tx, lx, lie); ty = lerp(ty, ly, lie);
    }
    if (front && near && (p.swipe || 0) > 0) { tx = lerp(tx, ax + 120, p.swipe); ty = lerp(ty, ay - 60, p.swipe); }
    if (jump > 0) { tx = lerp(tx, front ? ax + 95 : ax - 95, jump); ty = lerp(ty, ay + 40, jump) - air * (1 - jump); }
    ty -= air * (1 - jump);
    // у кошек и локоть передней лапы, и скакательный сустав задней смотрят назад, к хвосту
    return { ax, ay, tx, ty, bend: -1, near, front };
  };
  const drawLeg = (L, col) => {
    const q = legPath(L);
    // нога заканчивается щиколоткой над лапой, подошва лапы стоит в точке цели
    const ank = 16 * K.h, fold = q.front ? 1 : lerp(1, 0.5, lie); // лёжа задняя лапа поджата под бедро
    const k = limb(c, q.ax, q.ay, q.tx - 4 * K.h, q.ty - ank, UL * fold, (LL - ank * 0.6) * fold, q.bend, 28 * K.h, col);
    pawShape(c, k.hx + 4 * K.h, k.hy + ank, K.h, col, q.front && q.near ? (p.swipe || 0) : 0);
    // бедро задней лапы и плечо передней — мясистые, как у кошки
    ellipse(c, q.ax + (q.front ? 2 : -4), q.ay - 4, (q.front ? 26 : 38) * K.h, (q.front ? 34 : 46) * K.h, q.front ? 0.2 : -0.25); ink(c, col, 5);
  };
  drawLeg(legs[0], K.bodyD); drawLeg(legs[1], K.bodyD);
  // хвост
  const lash = p.lash || 0, tw = Math.sin(t * (lash > 0 ? 16 : 2.4) + (p.ph || 0)) * (0.35 + lash * 0.9) + (p.tail || 0);
  const tb = [hpX - 10, hpY + 6], tm = [hpX - 80, hpY + 40 - 40 * tw], te = [hpX - 140 + 30 * Math.abs(tw) * lash, hpY - 10 - 70 * tw + lie * 40];
  c.save(); c.lineCap = "round"; c.lineWidth = 22 * K.h; c.strokeStyle = C.ink; c.beginPath(); c.moveTo(...tb); c.quadraticCurveTo(...tm, ...te); c.stroke();
  c.lineWidth = 12 * K.h; c.strokeStyle = K.body; c.stroke(); c.restore();
  if (kind === "lion") { ellipse(c, te[0], te[1], 18, 14, tw); ink(c, C.mane, 4); }
  if (kind === "tiger") for (let i = 1; i < 5; i++) { // поперечные полоски на хвосте
    const u = i / 5, x = lerp(lerp(tb[0], tm[0], u), lerp(tm[0], te[0], u), u), y = lerp(lerp(tb[1], tm[1], u), lerp(tm[1], te[1], u), u);
    const dx = lerp(tm[0] - tb[0], te[0] - tm[0], u), dy = lerp(tm[1] - tb[1], te[1] - tm[1], u), d = Math.hypot(dx, dy) || 1, nx = -dy / d * 8, ny = dx / d * 8;
    line(c, [[x - nx, y - ny], [x + nx, y + ny]], 5, C.ink, "butt"); }
  // тело
  const bx = (shX + hpX) / 2, by = (shY + hpY) / 2 + 6;
  c.save(); c.translate(bx, by); c.rotate(tiltBody);
  ellipse(c, 0, 0, 150 * K.len, (58 + breathe) * K.h); ink(c, K.body, 6);
  ellipse(c, 10, 24 * K.h, 110 * K.len, 26 * K.h); c.fillStyle = K.belly; c.fill();
  c.save(); ellipse(c, 0, 0, 150 * K.len - 3, (58 + breathe) * K.h - 3); c.clip();
  if (kind === "tiger") { c.strokeStyle = C.ink; c.lineWidth = 9; c.lineCap = "round"; for (let i = -4; i <= 4; i++) { const x = i * 30; c.beginPath(); c.moveTo(x - 6, -70); c.quadraticCurveTo(x + 10, -30, x - 4, -8); c.stroke(); } }
  if (kind === "bars") rosettes(c);
  c.restore();
  c.restore();
  drawLeg(legs[2], K.body); drawLeg(legs[3], K.body);
  // голова (морда к зрителю)
  const hx = shX + 52 - stretch * 10 + crouch * 14, hy = shY - 44 * K.h + stretch * 22 + crouch * 30 + lie * 10;
  c.save(); c.translate(hx, hy); c.scale(dir, 1); // морда не отражается
  c.rotate((p.tilt || 0) + (p.mane || 0) * Math.sin(t * 22) * 0.18);
  head(c, kind, K, p, t);
  c.restore();
  c.restore();
}

function head(c, kind, K, p, t) {
  const hs = K.head, op = clamp(p.mouth || 0, 0, 1), fear = p.fear || 0, snarl = p.snarl || 0;
  c.save(); c.scale(hs, hs);
  // грива / уши
  if (kind === "lion") {
    const sh = (p.mane || 0) * Math.sin(t * 22);
    for (let ring = 0; ring < 2; ring++) {
      c.beginPath();
      const n = 18, R = ring ? 78 : 96;
      for (let i = 0; i <= n * 2; i++) { const a = (i / (n * 2)) * TAU + sh * 0.15 * (ring ? -1 : 1), rr = i % 2 ? R * 0.78 : R + 6 * Math.sin(i * 1.7 + t * 2); c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr + 6); }
      c.closePath(); ink(c, ring ? C.mane : C.maneD, 5);
    }
  }
  for (const sx of [-1, 1]) {
    const ex = sx * 44, ey = -42 - (kind === "lion" ? 6 : 0), back = fear * 0.9 * sx;
    c.save(); c.translate(ex, ey); c.rotate(back);
    ellipse(c, 0, 0, 20, 18); ink(c, K.body, 5); ellipse(c, 0, 2, 10, 9); c.fillStyle = "#f2a0a8"; c.fill(); c.restore();
  }
  // морда
  ellipse(c, 0, 0, 58, 54); ink(c, K.body, 5);
  if (kind === "tiger") { c.strokeStyle = C.ink; c.lineWidth = 6; c.lineCap = "round";
    for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(sx * 56, -10); c.lineTo(sx * 38, -6); c.stroke(); c.beginPath(); c.moveTo(sx * 55, 8); c.lineTo(sx * 40, 8); c.stroke(); }
    for (const dx of [-12, 0, 12]) { c.beginPath(); c.moveTo(dx, -52); c.lineTo(dx * 0.8, -38); c.stroke(); } }
  if (kind === "bars") { c.fillStyle = "#5a3a10"; for (const [x, y] of [[-30, -30], [-16, -40], [20, -36], [34, -24], [-40, -8], [42, -6]]) { circle(c, x, y, 4); c.fill(); } }
  // брови (морщит лоб)
  const brow = p.brow || 0;
  if (brow > 0) { c.strokeStyle = K.bodyD; c.lineWidth = 4; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-20, -30 - i * 7 + brow * 2); c.quadraticCurveTo(0, -36 - i * 7 - brow * 4, 20, -30 - i * 7 + brow * 2); c.globalAlpha = brow; c.stroke(); } c.globalAlpha = 1; }
  // глаза
  const look = p.look || [0, 0], bl = Math.max(p.blink || 0, p.sleep || 0);
  for (const sx of [-1, 1]) {
    const ex = sx * 22, ey = -12;
    const ry = 13 * (1 + fear * 0.35) * (1 - bl * 0.92);
    const red = p.redEye || 0; // «глаз кровавых»: налитые красным белки, красный отблеск
    if (red > 0) { c.save(); c.globalAlpha = red * 0.8; c.shadowColor = "#ff2a2a"; c.shadowBlur = 22; ellipse(c, ex, ey, 14, ry + 2); c.fillStyle = "#ff3b3b"; c.fill(); c.restore(); }
    ellipse(c, ex, ey, 12 * (1 + fear * 0.3), ry); ink(c, red > 0.3 ? "#ffd2d2" : "#fff", 3);
    if (red > 0.3 && ry > 3) { c.strokeStyle = "#e0303a"; c.lineWidth = 1.6; for (const a of [0.4, 2.6, 3.6]) { c.beginPath(); c.moveTo(ex + Math.cos(a) * 11, ey + Math.sin(a) * ry * 0.9); c.lineTo(ex + Math.cos(a) * 6, ey + Math.sin(a) * ry * 0.4); c.stroke(); } }
    if (ry > 3) { circle(c, ex + look[0] * 5, ey + look[1] * 4, 6 * (1 - fear * 0.45)); c.fillStyle = red > 0.3 ? "#8a0a18" : C.ink; c.fill(); }
    if (brow > 0 || snarl > 0) { c.strokeStyle = C.ink; c.lineWidth = 5; c.beginPath(); c.moveTo(ex - sx * 14, ey - 16 - 2 * snarl); c.lineTo(ex + sx * 10, ey - 12 + 4 * Math.max(brow, snarl)); c.stroke(); }
  }
  if (fear > 0.25) { c.save(); c.globalAlpha = clamp((fear - 0.25) * 2.5, 0, 1); for (const sx of [-1, 1]) sweat(c, sx * 66, -46 + ((t * 46 + (sx > 0 ? 13 : 0)) % 26), 1.5); c.restore(); }
  if ((p.sleep || 0) > 0.5) { for (const sx of [-1, 1]) { c.strokeStyle = C.ink; c.lineWidth = 4; c.beginPath(); c.arc(sx * 22, -14, 9, 0.2, Math.PI - 0.2); c.stroke(); } }
  // морда: нос, рот
  ellipse(c, -13, 18, 17, 13); ink(c, K.belly, 3); ellipse(c, 13, 18, 17, 13); ink(c, K.belly, 3);
  c.fillStyle = C.ink; for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) { circle(c, sx * (8 + i * 6), 18 + (i % 2) * 5, 2); c.fill(); }
  c.beginPath(); c.moveTo(-9, 4); c.lineTo(9, 4); c.lineTo(0, 13); c.closePath(); ink(c, "#3a1a22", 3);
  if (op > 0.02) {
    const mw = 20 + op * 16, mh = op * 46;
    ellipse(c, 0, 30 + mh * 0.5, mw, mh * 0.5 + 2); ink(c, "#5a0f22", 4);
    c.fillStyle = "#fff"; for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(sx * (mw - 10), 28); c.lineTo(sx * (mw - 3), 28); c.lineTo(sx * (mw - 7), 28 + 10 + op * 6); c.fill(); }
    ellipse(c, 0, 30 + mh * 0.85, mw * 0.55, mh * 0.18); c.fillStyle = "#f27a8a"; c.fill();
  } else if (snarl > 0.05) {
    rrect(c, -22, 28, 44, 14 * snarl + 2, 4); ink(c, "#fff", 3);
    c.strokeStyle = C.ink; c.lineWidth = 2; for (let x = -15; x <= 15; x += 10) { c.beginPath(); c.moveTo(x, 28); c.lineTo(x, 30 + 14 * snarl); c.stroke(); }
  } else {
    c.strokeStyle = C.ink; c.lineWidth = 3.5; c.beginPath(); c.moveTo(0, 13); c.lineTo(0, 22); c.moveTo(-12, 26); c.quadraticCurveTo(-6, 31, 0, 22); c.quadraticCurveTo(6, 31, 12, 26); c.stroke();
  }
  // язык: облизывается
  const lick = p.lick || 0;
  if (lick > 0) { const a = Math.sin(lick * Math.PI * 3) * 0.9; c.save(); c.translate(0, 30); c.rotate(a); rrect(c, -9, -4, 18, 22 + 10 * Math.sin(lick * Math.PI), 9); ink(c, "#f27a8a", 3); c.restore(); }
  c.restore();
}

// ---------- Люди ----------
// o: { kind: king|prince|baron|lady|beauty|knight, x, y (ступни), s, dir, walk, stride, arms: [[x,y],[x,y]] (от плеча, в единицах фигуры), look, mouth, smile, blink, fear, sly, cold, wince, cheer, legs (рисовать ноги) }
const PPL = {
  king: { coat: C.red, coatD: C.redD, trim: C.gold, hair: "#5a3416", h: 1.0 },
  prince: { coat: "#2e9b6a", coatD: "#1d6a47", trim: C.gold, hair: "#c98a3a", h: 0.86 },
  baron1: { coat: "#6a3fb0", coatD: "#432377", trim: "#e0d0ff", hair: "#2b1a12", h: 1.0 },
  baron2: { coat: "#2f8fb0", coatD: "#1c5c73", trim: "#d8f4ff", hair: "#8a8a8a", h: 0.98 },
  lady1: { coat: "#e8c34a", coatD: "#b08f1e", trim: "#fff", hair: "#6b3a1e", h: 0.92 },
  lady2: { coat: "#4fb87a", coatD: "#2f7d50", trim: "#fff", hair: "#1f1410", h: 0.92 },
  lady3: { coat: "#8a5ad9", coatD: "#5b3796", trim: "#fff", hair: "#d9a441", h: 0.92 },
  beauty: { coat: C.pink, coatD: C.pinkD, trim: C.pinkL, hair: "#f2c94a", h: 0.94 },
  knight: { coat: C.blue, coatD: C.blueD, trim: C.gold, hair: "#6b3a1e", h: 1.1 },
};
// рука: из двух решений IK берём то, где локоть смотрит наружу и вниз (как у человека анфас)
function arm(c, sx, sy, tx, ty, a, b, side, w, col, lw) {
  const k1 = ik(sx, sy, tx, ty, a, b, 1), k2 = ik(sx, sy, tx, ty, a, b, -1);
  const sc = (k) => side * (k.ex - sx) + (k.ey - sy);
  const k = sc(k1) >= sc(k2) ? k1 : k2;
  stroke2(c, [[sx, sy], [k.ex, k.ey], [k.hx, k.hy]], w, col, lw);
  return k;
}
// сапог: подошва на y, носок вперёд (+x), голенище шириной с ногу
function boot(c, x, y, hw, col, plate) {
  c.beginPath(); c.moveTo(x - hw, y - 30); c.lineTo(x + hw, y - 30); c.lineTo(x + hw, y - 15);
  c.quadraticCurveTo(x + hw + 16, y - 13, x + hw + 15, y); c.lineTo(x - hw, y); c.closePath(); ink(c, col, 4);
  if (plate) { c.strokeStyle = C.ink; c.lineWidth = 2.5; for (const yy of [-20, -11]) { c.beginPath(); c.moveTo(x - hw + 3, y + yy); c.lineTo(x + hw + (yy > -15 ? 8 : 0), y + yy); c.stroke(); } }
}
function person(c, who, o, t) {
  const P = PPL[who], s = (o.s || 1) * P.h, dir = o.dir || 1;
  c.save(); c.translate(o.x, o.y); c.scale(s * dir, s);
  const lady = who.startsWith("lady") || who === "beauty", kn = who === "knight";
  const breathe = Math.sin(t * 2.6 + (o.ph || 0)) * 2;
  const up = kn ? 24 : 0; // рыцарь выше и длинноногий
  const hipY = -120 - up, shY = -205 - up + breathe, neckY = -215 - up, shX = kn ? 40 : 30;
  // присед (dc, вниз) и наклон вперёд (lean, рад) — верх тела поворачивается вокруг таза, ступни остаются на месте
  const dc = o.crouch || 0, lean = o.lean || 0;
  const upper = () => { c.translate(0, hipY + dc); c.rotate(lean); c.translate(0, -hipY); };
  // плащ рыцаря — за спиной
  if (kn) { const fl = Math.sin(t * 2.2 + 0.5) * 8; c.save(); upper();
    c.beginPath(); c.moveTo(-40, shY + 2); c.lineTo(40, shY + 2); c.quadraticCurveTo(58 + fl * 0.3, hipY + 40, 50 + fl, hipY + 96);
    for (let i = 0; i <= 6; i++) c.lineTo(50 + fl - i * (100 + fl * 0.4) / 6, hipY + 96 + (i % 2 ? -12 : 0) - Math.abs(i - 3) * 2);
    c.quadraticCurveTo(-60 - fl * 0.3, hipY + 40, -40, shY + 2); c.closePath(); ink(c, "#16306b", 5); c.restore(); }
  // ноги: ступни в точках o.feet (в единицах фигуры от точки опоры), иначе — шаг по фазе
  if (o.legs) {
    const ph = o.walk || 0, st = (o.stride || 0) * 26;
    const feet = o.feet || [Math.PI, 0].map((off) => [Math.sin(ph + off) * st, -Math.max(0, Math.cos(ph + off)) * st * 0.6]);
    const hw = kn ? 18 : 16;
    // тень под подошвой — ступня стоит на земле, а не висит
    if (o.shadows) for (const [sx, sy] of o.shadows) { c.fillStyle = "rgba(60,20,30,0.3)"; ellipse(c, sx + 6, sy + 1, 34, 6); c.fill(); }
    feet.forEach(([fx, fy], i) => {
      const col = kn ? (i ? C.steel : C.steelD) : (i ? "#2b2a40" : P.coatD);
      const hx = (i ? 1 : -1) * (kn ? 12 : 6);
      // нога кончается над подошвой, коленом вперёд; сапог стоит подошвой ровно на опоре
      const k = limb(c, hx, hipY + dc, fx, fy - 26, kn ? 70 : 58, kn ? 68 : 56, 1, kn ? 26 : 22, col);
      if (kn) { circle(c, k.ex, k.ey, 13); ink(c, C.steel, 4); circle(c, k.ex, k.ey, 5); c.fillStyle = C.steelD; c.fill(); }
      boot(c, k.hx, k.hy + 26, hw, kn ? (i ? C.steel : C.steelD) : "#3a2414", kn);
    });
  }
  // туловище
  c.save(); upper();
  c.beginPath();
  if (lady) { c.moveTo(-26, shY); c.lineTo(26, shY); c.lineTo(20, hipY); c.quadraticCurveTo(70, hipY + 40, 66, 4); c.lineTo(-66, 4); c.quadraticCurveTo(-70, hipY + 40, -20, hipY); c.closePath(); }
  else if (kn) { c.moveTo(-48, shY); c.lineTo(48, shY); c.lineTo(36, hipY + 30); c.lineTo(-36, hipY + 30); c.closePath(); }
  else { c.moveTo(-34, shY); c.lineTo(34, shY); c.lineTo(30, hipY + 26); c.lineTo(-30, hipY + 26); c.closePath(); }
  ink(c, P.coat, 5);
  if (who === "king") { c.beginPath(); c.moveTo(-40, shY - 2); c.quadraticCurveTo(0, shY + 26, 40, shY - 2); c.lineTo(36, shY + 14); c.quadraticCurveTo(0, shY + 40, -36, shY + 14); c.closePath(); ink(c, "#fff", 4);
    c.fillStyle = C.ink; for (let i = -3; i <= 3; i++) { circle(c, i * 10, shY + 18 + Math.abs(i) * -2, 2.5); c.fill(); } }
  if (kn) { // кираса с ребром, лилия, пояс, набедренные пластины, меч у бедра
    c.beginPath(); c.moveTo(-40, shY + 4); c.lineTo(40, shY + 4); c.lineTo(32, hipY + 6); c.quadraticCurveTo(0, hipY + 24, -32, hipY + 6); c.closePath(); ink(c, C.steel, 4);
    line(c, [[0, shY + 10], [0, hipY + 12]], 3, C.steelD);
    c.fillStyle = "rgba(255,255,255,0.55)"; rrect(c, -26, shY + 12, 9, 52, 4); c.fill(); lily(c, 14, shY + 46, 1.25, C.gold);
    for (let i = 0; i < 3; i++) { rrect(c, -36 + i * 25, hipY + 18, 22, 20, 5); ink(c, i === 1 ? C.steel : C.steelD, 3.5); }
    c.fillStyle = "#3a2210"; c.fillRect(-38, hipY + 6, 76, 14); c.lineWidth = 3; c.strokeStyle = C.ink; c.strokeRect(-38, hipY + 6, 76, 14);
    rrect(c, -9, hipY + 4, 18, 18, 3); ink(c, C.gold, 3);
    stroke2(c, [[34, hipY + 18], [64 + dc * 0.7, hipY + 108 - dc * 0.8]], 11, "#3a2210", 3); // ножны (на корточках задираются назад)
    stroke2(c, [[22, hipY + 12], [46, hipY + 4]], 7, C.gold, 3);    // гарда
    stroke2(c, [[30, hipY + 6], [24, hipY - 16]], 7, "#5a3416", 3); circle(c, 23, hipY - 20, 6); ink(c, C.gold, 3);
  }
  if (lady) { c.fillStyle = P.trim; c.beginPath(); c.moveTo(-22, shY + 2); c.quadraticCurveTo(0, shY + 22, 22, shY + 2); c.lineTo(18, shY + 10); c.quadraticCurveTo(0, shY + 30, -18, shY + 10); c.fill();
    c.fillStyle = "rgba(255,255,255,0.35)"; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(0, hipY + 18 + i * 22, 30 + i * 8, 0.3, Math.PI - 0.3); c.lineWidth = 3; c.strokeStyle = "rgba(0,0,0,0.12)"; c.stroke(); } }
  // голова
  const hy = neckY - 36;
  const look = o.look || [0, 0], bl = o.blink || 0, fear = o.fear || 0, sly = o.sly || 0, cold = o.cold || 0, wince = o.wince || 0;
  if (kn) knightHead(c, hy, neckY, o, t);
  else {
  c.fillStyle = C.skin; rrect(c, -9, neckY - 8, 18, 16, 4); c.fill();
  // волосы сзади
  if (lady) { ellipse(c, 0, hy - 4, 40, 42); ink(c, P.hair, 5); }
  ellipse(c, 0, hy, 32, 36); ink(c, C.skin, 5);
  // лицо
  for (const sx of [-1, 1]) {
    const ex = sx * 12, ey = hy - 4;
    if (wince > 0.5) { c.strokeStyle = C.ink; c.lineWidth = 4; c.beginPath(); c.moveTo(ex - 6, ey); c.lineTo(ex + 6 * sx, ey); c.lineTo(ex - 6, ey + 4); c.stroke(); continue; }
    const ry = 7 * (1 + fear * 0.5) * (1 - bl * 0.9) * (1 - cold * 0.45) * (sx === 1 ? 1 - sly * 0.35 : 1);
    ellipse(c, ex, ey, 6 * (1 + fear * 0.4), ry); ink(c, "#fff", 2.5);
    if (ry > 2) { circle(c, ex + look[0] * 3, ey + look[1] * 2, 3.4 * (1 - fear * 0.4)); c.fillStyle = C.ink; c.fill(); }
    if (lady) { c.strokeStyle = C.ink; c.lineWidth = 2.5; for (let k = 0; k < 2; k++) { c.beginPath(); c.moveTo(ex + sx * 5, ey - ry + 1); c.lineTo(ex + sx * (8 + k * 2), ey - ry - 4 + k * 3); c.stroke(); } }
    // брови
    c.strokeStyle = who === "king" || who.startsWith("baron") ? P.hair : "#7a4a2a"; c.lineWidth = 3.5;
    const bu = fear * 6 + (sx === 1 ? sly * 6 : -sly * 1) - cold * 2;
    c.beginPath(); c.moveTo(ex - 7, ey - 11 - bu + cold * sx * 3); c.lineTo(ex + 7, ey - 11 - bu - cold * sx * 3); c.stroke();
  }
  // щёки
  if (lady) { c.fillStyle = "rgba(255,110,150,0.35)"; circle(c, -18, hy + 8, 6); c.fill(); circle(c, 18, hy + 8, 6); c.fill(); }
  // нос и рот
  c.strokeStyle = C.skinD; c.lineWidth = 3; c.beginPath(); c.moveTo(2, hy - 2); c.lineTo(who === "king" ? 8 : 5, hy + 8); c.lineTo(0, hy + 9); c.stroke();
  if (who === "king") { ellipse(c, 0, hy + 30, 24, 16); ink(c, P.hair, 4); }
  const mo = o.mouth || 0, sm = o.smile || 0;
  if (mo > 0.05) { ellipse(c, 0, hy + 19, 6 + mo * 2, 3 + mo * 7); ink(c, "#5a0f22", 2.5); }
  else { c.strokeStyle = "#7a2a2a"; c.lineWidth = 3; c.beginPath(); c.moveTo(-9, hy + 18 - sly * 2); c.quadraticCurveTo(0, hy + 18 + sm * 8 - cold * 2, 9 + sly * 2, hy + 17 - sm * 3 - sly * 6); c.stroke(); }
  // волосы и головные уборы
  if (lady) {
    c.beginPath(); c.moveTo(-34, hy - 6); c.quadraticCurveTo(-30, hy - 40, 0, hy - 40); c.quadraticCurveTo(30, hy - 40, 34, hy - 6); c.quadraticCurveTo(20, hy - 26, 0, hy - 26); c.quadraticCurveTo(-20, hy - 26, -34, hy - 6); ink(c, P.hair, 4);
    // французский чепец
    c.beginPath(); c.arc(0, hy - 10, 42, Math.PI * 1.08, Math.PI * 1.92); c.lineWidth = 9; c.strokeStyle = C.ink; c.stroke(); c.lineWidth = 5; c.strokeStyle = who === "beauty" ? C.gold : "#fff"; c.stroke();
    if (who === "beauty") { for (let i = 0; i < 5; i++) { const a = Math.PI * (1.15 + i * 0.17); circle(c, Math.cos(a) * 42, hy - 10 + Math.sin(a) * 42, 4); ink(c, "#fff", 2); } }
  } else {
    c.beginPath(); c.moveTo(-32, hy - 2); c.quadraticCurveTo(-34, hy - 40, 0, hy - 38); c.quadraticCurveTo(34, hy - 40, 32, hy - 2); c.quadraticCurveTo(24, hy - 22, 0, hy - 24); c.quadraticCurveTo(-24, hy - 22, -32, hy - 2); ink(c, P.hair, 4);
  }
  if (who === "king" || who === "prince") {
    const cw = who === "king" ? 30 : 22, ch = who === "king" ? 30 : 20, cy = hy - 30;
    c.beginPath(); c.moveTo(-cw, cy); c.lineTo(-cw, cy - ch * 0.5); c.lineTo(-cw * 0.5, cy - ch * 0.15); c.lineTo(0, cy - ch); c.lineTo(cw * 0.5, cy - ch * 0.15); c.lineTo(cw, cy - ch * 0.5); c.lineTo(cw, cy); c.closePath(); ink(c, C.gold, 4);
    circle(c, 0, cy - 8, 4); c.fillStyle = C.red; c.fill();
  }
  if (who.startsWith("baron")) {
    ellipse(c, 0, hy - 32, 40, 10); ink(c, P.coatD, 4); rrect(c, -24, hy - 54, 48, 24, 8); ink(c, P.coatD, 4);
    c.beginPath(); c.moveTo(14, hy - 50); c.quadraticCurveTo(50, hy - 90, 60, hy - 60 + Math.sin(t * 3 + o.x) * 6); c.quadraticCurveTo(40, hy - 60, 14, hy - 44); ink(c, "#fff", 3);
  }
  }
  // руки (от плеч к целям); по умолчанию свободно опущены
  const arms = o.arms || [[-14, 88], [14, 88]];
  [[-shX, -1], [shX, 1]].forEach(([sx, side], i) => {
    const [tx, ty] = arms[i];
    const k = arm(c, sx, shY + 10, sx + tx, shY + 10 + ty, 48, 46, side, kn ? 22 : 16, kn ? C.steel : P.coat, 4);
    if (kn) { rrect(c, k.hx - 12, k.hy - 11, 24, 22, 6); ink(c, C.steelD, 3.5); }
    else { circle(c, k.hx, k.hy, 10); ink(c, (who === "beauty" && i === 0 && o.gloveOn) ? C.pink : C.skin, 3.5); }
    if (o.hand && o.hand[i]) o.hand[i](c, k.hx, k.hy);
  });
  // наплечники рыцаря — поверх плеч
  if (kn) for (const sx of [-1, 1]) { ellipse(c, sx * 46, shY + 20, 20, 12, sx * 0.3); ink(c, C.steelD, 4); ellipse(c, sx * 42, shY + 6, 26, 18, sx * 0.25); ink(c, C.steel, 4);
    c.fillStyle = "rgba(255,255,255,0.5)"; ellipse(c, sx * 36, shY + 0, 9, 4, sx * 0.25); c.fill(); }
  // испуг: капли пота
  if (fear > 0.3) { c.save(); c.globalAlpha = fear; for (const sx of [-1, 1]) sweat(c, sx * 38, hy - 12 + ((t * 40) % 20), 1); c.restore(); }
  c.restore();
  c.restore();
}
// голова рыцаря: шлем с наносником и плюмажем, тяжёлые брови, борода, шрам
function knightHead(c, hy, neckY, o, t) {
  const look = o.look || [0, 0], bl = o.blink || 0, cold = o.cold || 0, mo = o.mouth || 0;
  rrect(c, -24, neckY - 14, 48, 26, 8); ink(c, C.steel, 4); // горжет
  // лицо с квадратной челюстью
  c.beginPath(); c.moveTo(-31, hy - 8); c.quadraticCurveTo(-33, hy + 28, -18, hy + 38); c.quadraticCurveTo(0, hy + 46, 18, hy + 38); c.quadraticCurveTo(33, hy + 28, 31, hy - 8);
  c.quadraticCurveTo(30, hy - 40, 0, hy - 40); c.quadraticCurveTo(-30, hy - 40, -31, hy - 8); c.closePath(); ink(c, "#e8b58c", 5);
  // борода и усы
  c.beginPath(); c.moveTo(-31, hy + 6); c.quadraticCurveTo(-30, hy + 34, -16, hy + 44); c.quadraticCurveTo(0, hy + 54, 16, hy + 44); c.quadraticCurveTo(30, hy + 34, 31, hy + 6);
  c.quadraticCurveTo(24, hy + 22, 14, hy + 20); c.quadraticCurveTo(0, hy + 14, -14, hy + 20); c.quadraticCurveTo(-24, hy + 22, -31, hy + 6); c.closePath(); ink(c, "#4a2a14", 4);
  // рот
  if (mo > 0.05) { ellipse(c, 0, hy + 28, 7 + mo * 2, 2 + mo * 6); ink(c, "#5a0f22", 2.5); }
  else { c.strokeStyle = C.ink; c.lineWidth = 3.5; c.beginPath(); c.moveTo(-10, hy + 28); c.lineTo(10, hy + 28 - cold * 2); c.stroke(); }
  // шрам через щёку
  c.strokeStyle = "#b04a44"; c.lineWidth = 3; c.lineCap = "round"; c.beginPath(); c.moveTo(-24, hy - 2); c.lineTo(-14, hy + 14); c.stroke();
  for (const u of [0.3, 0.7]) { const x = lerp(-24, -14, u), y = lerp(hy - 2, hy + 14, u); c.beginPath(); c.moveTo(x - 4, y + 2); c.lineTo(x + 4, y - 2); c.stroke(); }
  // глаза: прищур, зрачки, тяжёлые брови к переносице
  for (const sx of [-1, 1]) {
    const ex = sx * 13, ey = hy - 4, ry = 5 * (1 - bl * 0.9) * (1 - cold * 0.3);
    ellipse(c, ex, ey, 7, ry); ink(c, "#fff", 2.5);
    if (ry > 1.5) { circle(c, ex + look[0] * 3, ey + look[1] * 1.5, 3.2); c.fillStyle = C.ink; c.fill(); }
    c.strokeStyle = "#3a2010"; c.lineWidth = 6; c.lineCap = "round";
    c.beginPath(); c.moveTo(ex + sx * 10, ey - 12 - cold * 2); c.lineTo(ex - sx * 7, ey - 7 + cold * 2); c.stroke();
  }
  // шлем: купол, нащёчники, наносник, заклёпки
  c.beginPath(); c.moveTo(-37, hy + 16); c.lineTo(-37, hy - 12); c.quadraticCurveTo(-38, hy - 56, 0, hy - 58); c.quadraticCurveTo(38, hy - 56, 37, hy - 12); c.lineTo(37, hy + 16);
  c.lineTo(27, hy + 12); c.lineTo(27, hy - 14); c.lineTo(-27, hy - 14); c.lineTo(-27, hy + 12); c.closePath(); ink(c, C.steel, 5);
  rrect(c, -39, hy - 22, 78, 11, 4); ink(c, C.steelD, 4);
  rrect(c, -5, hy - 18, 10, 26, 3); ink(c, C.steel, 3.5);
  c.fillStyle = C.ink; for (const x of [-30, -15, 15, 30]) { circle(c, x, hy - 16.5, 2.2); c.fill(); }
  c.fillStyle = "rgba(255,255,255,0.55)"; ellipse(c, -16, hy - 42, 10, 5, -0.5); c.fill();
  // плюмаж
  const sw = Math.sin(t * 3.1) * 5;
  for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-4 + i * 4, hy - 56); c.quadraticCurveTo(-8 + i * 6 + sw, hy - 100 - i * 6, -40 + i * 12 + sw * 1.6, hy - 92 + i * 10);
    c.quadraticCurveTo(-18 + i * 6 + sw, hy - 84 - i * 4, 4 + i * 4, hy - 56); c.closePath(); ink(c, i === 1 ? "#ff4a5a" : C.red, 3.5); }
}
// веер
function fan(c, x, y, a, col) { c.save(); c.translate(x, y); c.rotate(a); c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 40, -Math.PI * 0.95, -Math.PI * 0.05); c.closePath(); ink(c, col, 3);
  c.strokeStyle = "rgba(0,0,0,0.25)"; c.lineWidth = 2; for (let i = 1; i < 7; i++) { const aa = -Math.PI * (0.95 - i * 0.13); c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(aa) * 40, Math.sin(aa) * 40); c.stroke(); } c.restore(); }
// перчатка
function glove(c, x, y, s, a, glow = 0) {
  c.save(); c.translate(x, y); c.rotate(a); c.scale(s, s);
  if (glow > 0) { c.save(); c.globalAlpha = glow; const g = c.createRadialGradient(0, 0, 4, 0, 0, 70); g.addColorStop(0, "rgba(255,240,150,0.9)"); g.addColorStop(1, "rgba(255,200,80,0)"); c.fillStyle = g; circle(c, 0, 0, 70); c.fill(); c.restore(); }
  c.beginPath();
  c.moveTo(-14, 22); c.lineTo(-16, -2);
  c.quadraticCurveTo(-30, -8, -26, -16); c.quadraticCurveTo(-20, -18, -12, -10); // большой палец
  c.lineTo(-12, -30); c.quadraticCurveTo(-6, -36, -2, -30); c.lineTo(-2, -12);
  c.lineTo(-1, -36); c.quadraticCurveTo(5, -42, 9, -36); c.lineTo(9, -12);
  c.lineTo(11, -32); c.quadraticCurveTo(17, -37, 20, -30); c.lineTo(19, -10);
  c.lineTo(22, -22); c.quadraticCurveTo(28, -25, 29, -18); c.lineTo(26, 4);
  c.quadraticCurveTo(22, 20, 14, 22); c.closePath();
  ink(c, C.pink, 4);
  rrect(c, -18, 18, 36, 14, 5); ink(c, "#fff", 3.5);
  c.restore();
}
// трон
function throne(c, x, y) {
  c.beginPath(); c.moveTo(x - 60, y); c.lineTo(x - 60, y - 210); c.quadraticCurveTo(x, y - 270, x + 60, y - 210); c.lineTo(x + 60, y); c.closePath(); ink(c, C.gold, 5);
  c.beginPath(); c.moveTo(x - 44, y); c.lineTo(x - 44, y - 196); c.quadraticCurveTo(x, y - 244, x + 44, y - 196); c.lineTo(x + 44, y); c.closePath(); ink(c, C.redD, 4);
  for (let i = 0; i < 3; i++) lily(c, x, y - 200 + i * 50, 1.1, C.gold);
}
