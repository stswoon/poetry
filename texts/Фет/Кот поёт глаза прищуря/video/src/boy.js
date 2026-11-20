// ---------- Мальчик-чиби в пижаме ----------
// Позы: "lie" — спит на боку лицом к нам (голова слева), "sit" — сидит на ковре анфас, ноги вперёд, "stand" — стоит анфас.
// (x, y) — точка на полу под тазом, s — масштаб.
// o: pose, hands [[lx,ly],[rx,ry]] — кисти (локальные), face: sleep|shock|rub|yawn|smile, bubble 0…1 (пузырь сна),
//    pop 0…1 (лопнул), mouth 0…1 (зевок), tear 0…1
const BOY = { ua: 50, fa: 48, handR: 16, lw: 5 };
function elbowOut(s, h, a, b, sd) {
  const e1 = ik(s, h, a, b, 1), e2 = ik(s, h, a, b, -1);
  const sc = (e) => sd * (e[0] - s[0]) + 0.6 * (e[1] - s[1]);
  return sc(e1) >= sc(e2) ? e1 : e2;
}
function boyArm(g, sh, hand, sd) {
  const R = BOY.ua + BOY.fa - 2, dx = hand[0] - sh[0], dy = hand[1] - sh[1], d = Math.hypot(dx, dy);
  if (d > R) hand = [sh[0] + dx / d * R, sh[1] + dy / d * R];   // кисть не дальше длины руки
  const el = elbowOut(sh, hand, BOY.ua, BOY.fa, sd);
  limb(g, [sh, el, hand], 26, C.shirt, { lw: BOY.lw });
  // манжета и кисть
  cel2(g, (c) => ell(c, hand[0], hand[1], BOY.handR, BOY.handR), C.skin, { lw: 4, sx: -3, sy: -4 });
  return el;
}
function hairCap(g) {
  // шапка волос с чёлкой зубцами и вихром-«антенной»
  g.beginPath();
  g.moveTo(-92, 6);
  g.bezierCurveTo(-104, -70, -50, -104, 0, -102);
  g.bezierCurveTo(56, -104, 104, -70, 92, 6);
  g.lineTo(80, -10); g.lineTo(66, 8); g.lineTo(50, -24); g.lineTo(30, -6); g.lineTo(12, -34); g.lineTo(-8, -8);
  g.lineTo(-28, -32); g.lineTo(-46, -4); g.lineTo(-62, -22); g.lineTo(-78, 4);
  g.closePath();
}
// Голова: локальные координаты, центр (0,0); face — выражение
function boyHead(g, t, o) {
  const lw = BOY.lw;
  // вихор
  g.beginPath(); g.moveTo(4, -98); g.quadraticCurveTo(24, -150, 52, -140); g.quadraticCurveTo(30, -134, 18, -98); g.closePath();
  g.fillStyle = css(C.hair); g.fill(); g.lineWidth = 4; g.strokeStyle = css(ink(C.hair)); g.stroke();
  // уши
  for (const sd of [-1, 1]) cel2(g, (c) => ell(c, sd * 84, 12, 14, 18), C.skin, { lw: 4, sx: -sd * 2, sy: -2 });
  // лицо
  cel2(g, (c) => ell(c, 0, 0, 86, 80), C.skin, { lw, sx: -8, sy: -8 });
  // волосы
  cel2(g, hairCap, C.hair, { lw, sx: -8, sy: -10 });
  ell(g, -40, -70, 26, 9, -0.3); g.fillStyle = "rgba(255,240,220,0.5)"; g.fill();
  // румянец
  for (const sd of [-1, 1]) { ell(g, sd * 52, 34, 18, 9); g.fillStyle = css(C.pink, 0.6); g.fill(); }
  const f = o.face || "smile";
  g.lineCap = "round"; g.strokeStyle = css(C.text);
  const eye = (sd) => {
    const ex = sd * 36, ey = 12;
    if (f === "sleep") { g.beginPath(); g.moveTo(ex - 16, ey); g.quadraticCurveTo(ex, ey + 14, ex + 16, ey); g.lineWidth = 6; g.stroke(); }
    else if (f === "yawn" || (f === "rub" && sd < 0)) {
      // зажмурился «> <»
      g.beginPath(); g.moveTo(ex - sd * 14, ey - 12); g.lineTo(ex + sd * 12, ey); g.lineTo(ex - sd * 14, ey + 12); g.lineWidth = 6; g.stroke();
    } else {
      const big = f === "shock" ? 1.1 : 1;
      ell(g, ex, ey, 17 * big, 24 * big); g.fillStyle = css(C.white); g.fill(); g.lineWidth = 4.5; g.stroke();
      if (f === "shock") { ell(g, ex, ey + 2, 6, 7); g.fillStyle = css(C.text); g.fill(); }
      else {
        const lx = (o.lookX ?? 0) * 5;
        ell(g, ex + lx, ey + 3, 13, 19); g.fillStyle = css([90, 60, 40]); g.fill();
        ell(g, ex + lx, ey + 8, 12, 11); g.fillStyle = css([150, 100, 60]); g.fill();
        ell(g, ex + lx - 5, ey - 6, 6, 7); g.fillStyle = css(C.white); g.fill();
        ell(g, ex + lx + 5, ey + 12, 3, 3); g.fill();
        if (f === "rub") { // полусонный: верхнее веко опущено
          g.save(); ell(g, ex, ey, 17, 24); g.clip(); g.fillStyle = css(C.skin); g.fillRect(ex - 20, ey - 30, 40, 26); g.restore();
          g.beginPath(); g.moveTo(ex - 17, ey - 4); g.lineTo(ex + 17, ey - 4); g.lineWidth = 5; g.stroke();
        }
      }
    }
  };
  eye(-1); eye(1);
  // рот
  if (f === "yawn") {
    const m = clamp(o.mouth ?? 1);
    ell(g, 0, 50, 18 + m * 8, 8 + m * 26); g.fillStyle = css([170, 50, 80]); g.fill(); g.lineWidth = 4.5; g.strokeStyle = css(C.text); g.stroke();
    ell(g, 0, 60 + m * 12, 12 + m * 4, 5 + m * 6); g.fillStyle = css(C.pink); g.fill();
  } else if (f === "shock") {
    ell(g, 0, 50, 11, 14); g.fillStyle = css([170, 50, 80]); g.fill(); g.lineWidth = 4.5; g.strokeStyle = css(C.text); g.stroke();
  } else if (f === "sleep") {
    g.beginPath(); g.moveTo(-8, 48); g.quadraticCurveTo(0, 54, 8, 48); g.lineWidth = 4.5; g.strokeStyle = css(C.text); g.stroke();
  } else {
    g.beginPath(); g.moveTo(-14, 44); g.quadraticCurveTo(0, 58, 14, 44); g.lineWidth = 4.5; g.strokeStyle = css(C.text); g.stroke();
  }
  // слезинка-искра у зевка
  if ((o.tear ?? 0) > 0) { sparkle(g, 64, 4, 16 * o.tear, o.tear, [170, 220, 255]); ell(g, 56, 22, 6 * o.tear, 9 * o.tear); g.fillStyle = css([170, 220, 255]); g.fill(); }
  // пузырь сна из носа
  const b = o.bubble ?? 0;
  if (b > 0.02 && !(o.pop > 0)) {
    const r = 8 + b * 38;
    ell(g, -18 - r * 0.85, 30 + r * 0.25, r, r); g.fillStyle = "rgba(200,235,255,0.55)"; g.fill();
    g.lineWidth = 3.5; g.strokeStyle = "rgba(120,170,230,0.95)"; g.stroke();
    ell(g, -18 - r * 1.15, 30 - r * 0.15, r * 0.25, r * 0.16, -0.6); g.fillStyle = "rgba(255,255,255,0.95)"; g.fill();
  }
  if (o.pop > 0 && o.pop < 1) {
    const u = o.pop, r = 46 + u * 40;
    g.save(); g.globalAlpha *= 1 - u;
    for (let i = 0; i < 10; i++) {
      const an = i / 10 * TAU;
      g.beginPath(); g.moveTo(-50 + Math.cos(an) * r * 0.6, 40 + Math.sin(an) * r * 0.6); g.lineTo(-50 + Math.cos(an) * r, 40 + Math.sin(an) * r);
      g.strokeStyle = "rgba(120,170,230,1)"; g.lineWidth = 5; g.stroke();
    }
    g.restore();
  }
}
function drawBoy(g, x, y, s, t, o = {}) {
  const lw = BOY.lw, pose = o.pose || "stand";
  g.save(); g.translate(x, y); g.scale(s, s);
  if (pose === "lie") {
    ell(g, -10, 4, 210, 18); g.fillStyle = "rgba(90,50,120,0.22)"; g.fill();
    const br = Math.sin(t * 2.2) * 2;   // дыхание
    // нижняя нога: от бедра вправо, ступня на ковре
    limb(g, [[40, -34], [104, -22], [150, -16]], 30, C.pants, { lw });
    cel2(g, (c) => ell(c, 168, -16, 24, 15), C.sock, { lw: 4, sx: -3, sy: -4 });
    // туловище (лежит горизонтально)
    cel2(g, (c) => rr(c, -96, -100 - br, 156, 92 + br, 42), C.shirt, { lw, sx: -8, sy: -9 });
    // звёздочки на пижаме
    for (const [sx, sy] of [[-60, -70], [-10, -50], [30, -78]]) sparkle(g, sx, sy - br, 9, 1, C.yellow);
    // верхняя нога: согнута, колено вперёд, ступня позади нижней
    limb(g, [[44, -64], [112, -64], [146, -40]], 30, C.pants, { lw });
    cel2(g, (c) => ell(c, 164, -38, 24, 15, 0.3), C.sock, { lw: 4, sx: -3, sy: -4 });
    // голова лежит на ковре, макушкой влево
    g.save(); g.translate(-160, -82); g.rotate(-1.05);
    boyHead(g, t, { face: o.face || "sleep", bubble: o.bubble, pop: o.pop });
    g.restore();
    // ближняя рука: предплечье на ковре перед грудью, кисть видна на ковре
    boyArmLying(g, [-66, -40], [-58, -12], [-4, -14]);
    // дальняя рука: лежит сверху на боку, кисть на бедре
    boyArmLying(g, [-50, -92 - br], [0, -112 - br], [48, -86 - br]);
  } else if (pose === "sit") {
    ell(g, 0, 4, 120, 16); g.fillStyle = "rgba(90,50,120,0.22)"; g.fill();
    for (const sd of [-1, 1]) {
      limb(g, [[sd * 24, -40], [sd * 52, -44], [sd * 66, -24]], 32, C.pants, { lw });
      cel2(g, (c) => ell(c, sd * 72, -18, 20, 24, sd * 0.2), C.sock, { lw: 4, sx: -sd * 3, sy: -4 });
    }
    torsoFront(g, -150, -30);
    g.save(); g.translate(0, -230 + (o.bob ?? 0)); g.rotate(o.tilt ?? 0); boyHead(g, t, o); g.restore();
    const hd = o.hands || [[-34, -60], [34, -60]];
    boyArm(g, [-50, -138], hd[0], -1); boyArm(g, [50, -138], hd[1], 1);
  } else {
    ell(g, 0, 4, 90, 14); g.fillStyle = "rgba(90,50,120,0.22)"; g.fill();
    for (const sd of [-1, 1]) {
      limb(g, [[sd * 24, -100], [sd * 26, -54], [sd * 27, -18]], 32, C.pants, { lw });
      cel2(g, (c) => rr(c, sd * 27 - 22 + sd * 6, -22, 44, 22, 11), C.sock, { lw: 4, sx: -sd * 3, sy: -4 });
    }
    torsoFront(g, -216, -86);
    g.save(); g.translate(0, -296 + (o.bob ?? 0)); g.rotate(o.tilt ?? 0); boyHead(g, t, o); g.restore();
    const hd = o.hands || [[-70, -124], [70, -124]];
    boyArm(g, [-50, -202], hd[0], -1); boyArm(g, [50, -202], hd[1], 1);
  }
  g.restore();
}
function boyArmLying(g, sh, el, hand) {
  limb(g, [sh, el, hand], 26, C.shirt, { lw: BOY.lw });
  cel2(g, (c) => ell(c, hand[0], hand[1], BOY.handR, BOY.handR), C.skin, { lw: 4, sx: -3, sy: -4 });
}
function torsoFront(g, top, bot) {
  cel2(g, (c) => rr(c, -60, top, 120, bot - top, 44), C.shirt, { lw: BOY.lw, sx: -9, sy: -9 });
  // воротник и пуговицы
  g.beginPath(); g.moveTo(-30, top + 6); g.lineTo(0, top + 30); g.lineTo(30, top + 6);
  g.strokeStyle = css(ink(C.shirt)); g.lineWidth = 4; g.stroke();
  for (let k = 0; k < 3; k++) { ell(g, 0, top + 46 + k * 26, 5, 5); g.fillStyle = css(C.white); g.fill(); g.lineWidth = 2.5; g.stroke(); }
  for (const [sx, sy] of [[-34, top + 54], [36, top + 84]]) sparkle(g, sx, sy, 9, 1, C.yellow);
}
