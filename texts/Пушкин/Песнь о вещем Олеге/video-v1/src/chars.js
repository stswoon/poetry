// ---------- Герои-силуэты: конь, всадник, кудесник, крупные планы, череп, змея ----------
// fig(c, draw, fill, rim, dx, dy): draw(c, col) рисует фигуру цветом col; сначала кромка света со сдвигом, затем силуэт
function fig(c, draw, fill, rim, dx = -3, dy = -2, rimA = 1) {
  if (rim && rimA > 0) { c.save(); c.globalAlpha *= rimA; c.translate(dx, dy); draw(c, rim); c.restore(); }
  draw(c, fill);
}
function seg(c, x0, y0, x1, y1, w) { c.lineWidth = w; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); }

// нога из двух звеньев: углы от вертикали (рад), длины a, b
// сужающееся звено ноги: трапеция от ширины wa к wb
function taper(c, x0, y0, x1, y1, wa, wb) {
  const dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
  c.beginPath(); c.moveTo(x0 + nx * wa / 2, y0 + ny * wa / 2); c.lineTo(x1 + nx * wb / 2, y1 + ny * wb / 2);
  c.lineTo(x1 - nx * wb / 2, y1 - ny * wb / 2); c.lineTo(x0 - nx * wa / 2, y0 - ny * wa / 2); c.closePath(); c.fill();
}
function leg2(c, x, y, a1, l1, a2, l2, w1, w2, col) {
  const kx = x + Math.sin(a1) * l1, ky = y + Math.cos(a1) * l1, hx = kx + Math.sin(a2) * l2, hy = ky + Math.cos(a2) * l2;
  c.fillStyle = col;
  taper(c, x, y, kx, ky, w1, w2 * 1.15); circle(c, kx, ky, w2 * 0.62); c.fill();
  taper(c, kx, ky, hx, hy, w2 * 1.05, w2 * 0.7); circle(c, hx, hy, w2 * 0.5); c.fill();
  c.beginPath(); c.moveTo(hx - w2 * 0.55, hy - 2); c.lineTo(hx + w2 * 0.6, hy - 2); c.lineTo(hx + w2 * 0.85, hy + 11); c.lineTo(hx - w2 * 0.6, hy + 11); c.closePath(); c.fill();
  return [hx, hy];
}

// поза коня: gait = "gallop" | "walk" | "stand" | "rear"; ph — фаза шага (обороты)
function horsePose(t, gait, speed = 1, seed = 0) {
  const ph = t * (gait === "gallop" ? 2.2 : gait === "walk" ? 0.9 : 0) * speed + seed;
  return { gait, ph, t, head: 0, tail: 1, seed };
}
function horse(c, x, y, s, dir, P, col, rim, rimA = 1) {
  c.save(); c.translate(x, y); c.scale(s * dir, s);
  const G = P.gait, ph = P.ph * TAU, t = P.t;
  const bob = G === "gallop" ? -Math.abs(Math.sin(ph)) * 12 : G === "walk" ? Math.sin(ph * 2) * 3 : Math.sin(t * 1.4 + P.seed) * 1.5;
  const pitch = G === "gallop" ? Math.sin(ph) * 0.06 : 0;
  const neck = (P.head || 0) + (G === "gallop" ? Math.sin(ph + 1) * 0.12 : G === "walk" ? Math.sin(ph * 2) * 0.05 : Math.sin(t * 0.9 + P.seed) * 0.03);
  const draw = (g, cl) => {
    g.save(); g.translate(0, bob); g.rotate(pitch);
    g.fillStyle = cl; g.strokeStyle = cl;
    // ноги: [x, y, фаза, передняя?]
    const legs = [[-72, -128, 0.0, 0], [-60, -128, 0.12, 0], [58, -126, 0.52, 1], [68, -126, 0.62, 1]];
    for (const [lx, ly, off, front] of legs) {
      const p = ph + off * TAU;
      let a1, a2;
      if (G === "gallop") { const sw = Math.sin(p); a1 = (front ? 0.15 : -0.1) + sw * 0.75; a2 = a1 + (front ? (sw < 0 ? -1.2 * -sw : 0.2) : (sw > 0 ? 0.9 * sw : 0.15)) * (front ? -1 : 1); }
      else if (G === "walk") { const sw = Math.sin(p * 0.5 * 2); a1 = sw * 0.3; a2 = a1 + (front ? -Math.max(0, -sw) * 0.8 : Math.max(0, sw) * 0.6); }
      else if (G === "rear") { a1 = front ? 1.2 : -0.15; a2 = front ? -0.5 : 0.25; }
      else { a1 = front ? 0.05 : -0.08; a2 = front ? 0.02 : 0.12; }
      leg2(g, lx, ly, -a1, front ? 58 : 62, -a2, front ? 64 : 62, front ? 40 : 50, 15, cl);
    }
    // корпус: грудь, бочка, круп одним контуром
    g.beginPath(); g.moveTo(96, -150);
    g.bezierCurveTo(100, -190, 70, -206, 30, -204); g.bezierCurveTo(-10, -194, -60, -204, -110, -200);
    g.bezierCurveTo(-150, -192, -158, -150, -138, -118); g.bezierCurveTo(-120, -100, -90, -104, -60, -106);
    g.bezierCurveTo(-20, -100, 30, -98, 60, -108); g.bezierCurveTo(84, -112, 94, -128, 96, -150); g.closePath(); g.fill();
    // шея и голова
    g.save(); g.translate(70, -182); g.rotate(-neck);
    g.beginPath(); g.moveTo(-44, -14); g.bezierCurveTo(-20, -60, 10, -96, 36, -118); g.lineTo(70, -104);
    g.bezierCurveTo(56, -64, 44, -30, 36, 28); g.lineTo(-10, 30); g.closePath(); g.fill();
    g.save(); g.translate(52, -110); g.rotate(1.0);
    g.beginPath(); g.moveTo(-26, -20); g.bezierCurveTo(10, -30, 50, -24, 82, -12); g.bezierCurveTo(94, -6, 94, 12, 82, 16);
    g.bezierCurveTo(56, 22, 30, 24, 12, 30); g.bezierCurveTo(-16, 34, -32, 16, -26, -20); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(-16, -18); g.lineTo(-20, -40); g.lineTo(-4, -22); g.closePath(); g.fill(); // ухо
    g.restore();
    // грива: тонкие пряди по гребню шеи
    g.lineCap = "round";
    for (let i = 0; i < 16; i++) {
      const u = i / 15, bx = lerp(-40, 40, u), by = lerp(-12, -116, u), wv = Math.sin(t * 5 + i * 0.7) * (G === "gallop" ? 9 : 3);
      const ln = 22 + (G === "gallop" ? 18 : 6) + (i % 3) * 6;
      g.lineWidth = 4 + (i % 2) * 2; g.beginPath(); g.moveTo(bx + 4, by); g.quadraticCurveTo(bx - ln * 0.5, by + 4 + wv, bx - ln, by + 12 + wv * 1.3); g.stroke();
    }
    g.restore();
    // хвост
    const tw = G === "gallop" ? 0.9 : 0.25;
    for (let i = 0; i < 5; i++) {
      const wv = Math.sin(t * 4 + i) * 14 * tw;
      g.lineWidth = 10 - i; g.beginPath(); g.moveTo(-120, -175);
      g.bezierCurveTo(-160, -170 + wv, -175 - 30 * tw, -120 + wv * 1.5 - 30 * tw, -170 - 50 * tw, -80 - 40 * tw + i * 6 + wv); g.stroke();
    }
    g.restore();
  };
  fig(c, draw, col, rim, -3 / s, -2 / s, rimA);
  c.restore();
}
// всадник поверх коня (в тех же координатах коня)
function rider(c, x, y, s, dir, P, col, rim, o = {}, rimA = 1) {
  const G = P.gait, ph = P.ph * TAU;
  const bob = G === "gallop" ? -Math.abs(Math.sin(ph)) * 12 + Math.sin(ph * 2) * 4 : G === "walk" ? Math.sin(ph * 2) * 4 : 0;
  c.save(); c.translate(x, y); c.scale(s * dir, s);
  const draw = (g, cl) => {
    g.save(); g.translate(-6, -196 + bob); g.fillStyle = cl; g.strokeStyle = cl; g.lineCap = "round";
    // плащ
    const cw = G === "gallop" ? 1 : 0.35;
    g.beginPath(); g.moveTo(-6, -92); g.quadraticCurveTo(-60 - 50 * cw, -70 + Math.sin(P.t * 6) * 10 * cw, -100 - 60 * cw, -20 + Math.sin(P.t * 5 + 1) * 16 * cw);
    g.quadraticCurveTo(-60, -10, -10, -6); g.closePath(); g.fill();
    // нога
    g.lineWidth = 18; g.beginPath(); g.moveTo(0, -4); g.lineTo(26, 26); g.lineTo(18, 64); g.stroke();
    // туловище
    g.beginPath(); g.moveTo(-22, 0); g.lineTo(22, 0); g.lineTo(16, -86); g.lineTo(-14, -90); g.closePath(); g.fill();
    // голова и шлем-шишак
    ellipse(g, 4, -106, 15, 18); g.fill();
    g.beginPath(); g.moveTo(-14, -110); g.quadraticCurveTo(-12, -142, 4, -160); g.quadraticCurveTo(20, -142, 22, -110); g.closePath(); g.fill();
    g.fillRect(2, -176, 4, 18);
    // рука и копьё / меч
    if (o.spear !== false) {
      const sa = (o.spearAng ?? 0.25) + (G === "gallop" ? Math.sin(ph) * 0.05 : 0);
      g.lineWidth = 12; g.beginPath(); g.moveTo(8, -76); g.lineTo(34, -44); g.stroke();
      g.save(); g.translate(34, -44); g.rotate(sa); g.lineWidth = 5; g.beginPath(); g.moveTo(0, 60); g.lineTo(0, -230); g.stroke();
      g.beginPath(); g.moveTo(-7, -230); g.lineTo(0, -262); g.lineTo(7, -230); g.closePath(); g.fill();
      if (o.banner) { g.beginPath(); g.moveTo(0, -226); g.quadraticCurveTo(-40, -220 + Math.sin(P.t * 7) * 8, -80, -206 + Math.sin(P.t * 6) * 10); g.lineTo(-74, -196); g.quadraticCurveTo(-40, -200, 0, -196); g.fill(); }
      g.restore();
    }
    // щит на спине
    circle(g, -20, -48, 26); g.fill();
    g.restore();
  };
  fig(c, draw, col, rim, -3 / s, -2 / s, rimA);
  if (o.shieldCol) { // красный щит виден на свету
    c.save(); c.translate(-26, -244 + bob); c.globalAlpha = 0.85; shield(c, 0, 0, 24); c.restore();
  }
  c.restore();
}
// пеший воин (Олег спешился)
function warrior(c, x, y, s, dir, col, rim, o = {}) {
  c.save(); c.translate(x, y); c.scale(s * dir, s);
  const t = o.t || 0, cw = o.wind ?? 0.4;
  const draw = (g, cl) => {
    g.fillStyle = cl; g.strokeStyle = cl; g.lineCap = "round";
    g.beginPath(); g.moveTo(-10, -250); g.quadraticCurveTo(-70 - 30 * cw, -150 + Math.sin(t * 2) * 8, -80 - 40 * cw, -10 + Math.sin(t * 1.7) * 10); g.lineTo(10, -10); g.closePath(); g.fill();
    g.lineWidth = 24; g.beginPath(); g.moveTo(-10, -130); g.lineTo(-18, 0); g.stroke(); g.beginPath(); g.moveTo(12, -130); g.lineTo(22, 0); g.stroke();
    g.beginPath(); g.moveTo(-30, -130); g.lineTo(32, -130); g.lineTo(26, -250); g.lineTo(-22, -254); g.closePath(); g.fill();
    ellipse(g, 6, -276, 19, 23); g.fill();
    g.beginPath(); g.moveTo(-14, -282); g.quadraticCurveTo(-12, -318, 6, -340); g.quadraticCurveTo(24, -318, 26, -282); g.closePath(); g.fill();
    g.fillRect(4, -358, 4, 20);
    const ra = o.arm ?? 0.3; g.lineWidth = 16; g.beginPath(); g.moveTo(16, -236); g.lineTo(16 + Math.sin(ra) * 90, -236 + Math.cos(ra) * 90); g.stroke();
    g.lineWidth = 6; g.beginPath(); g.moveTo(-26, -120); g.lineTo(-60, -20); g.stroke(); // меч у бедра
    if (o.spear) { const hx = 16 + Math.sin(ra) * 90, hy = -236 + Math.cos(ra) * 90; g.lineWidth = 6; g.beginPath(); g.moveTo(hx, hy + 120); g.lineTo(hx, hy - 260); g.stroke();
      g.beginPath(); g.moveTo(hx - 8, hy - 258); g.lineTo(hx, hy - 300); g.lineTo(hx + 8, hy - 258); g.closePath(); g.fill(); }
  };
  fig(c, draw, col, rim, -3 / s, -2 / s);
  c.restore();
}
// кудесник: сгорбленный, капюшон, длинная борода, посох со знаком Перуна
function sorcerer(c, x, y, s, dir, col, rim, o = {}) {
  const t = o.t || 0;
  c.save(); c.translate(x, y); c.scale(s * dir, s);
  const draw = (g, cl) => {
    g.fillStyle = cl; g.strokeStyle = cl; g.lineCap = "round";
    // балахон
    g.beginPath(); g.moveTo(-70, 0);
    for (let i = 0; i <= 8; i++) g.lineTo(lerp(-70, 64, i / 8), Math.sin(i * 1.3 + t * 2) * 5);
    g.quadraticCurveTo(46, -120, 30, -220); g.quadraticCurveTo(10, -262, -24, -250); g.quadraticCurveTo(-46, -200, -48, -140); g.closePath(); g.fill();
    // капюшон
    g.beginPath(); g.moveTo(-34, -236); g.quadraticCurveTo(-20, -300, 18, -296); g.quadraticCurveTo(46, -280, 40, -236); g.quadraticCurveTo(10, -220, -34, -236); g.fill();
    // рука к посоху
    g.lineWidth = 16; g.beginPath(); g.moveTo(20, -200); g.lineTo(70, -170); g.stroke();
    // посох
    g.lineWidth = 8; g.beginPath(); g.moveTo(74, 2); g.lineTo(78, -330); g.stroke();
    g.lineWidth = 7; g.beginPath(); g.moveTo(78, -330); g.quadraticCurveTo(100, -350, 92, -372); g.stroke();
  };
  fig(c, draw, col, rim, -3 / s, -2 / s);
  // борода: светлая, колышется
  c.fillStyle = "rgba(205,214,216,0.85)"; c.beginPath(); c.moveTo(30, -246);
  c.quadraticCurveTo(52 + Math.sin(t * 1.6) * 6, -200, 40 + Math.sin(t * 1.3) * 10, -150); c.quadraticCurveTo(22, -190, 14, -238); c.closePath(); c.fill();
  // знак Перуна на посохе
  if (o.glow > 0) {
    c.save(); c.globalCompositeOperation = "lighter"; c.globalAlpha = o.glow;
    c.fillStyle = radial(c, 86, -352, 0, 90, [[0, "rgba(170,210,255,0.9)"], [1, "rgba(80,140,255,0)"]]); circle(c, 86, -352, 90); c.fill();
    perunSign(c, 86, -352, 18, `rgba(235,245,255,${o.glow})`); c.restore();
  }
  c.restore();
}
// громовой знак (колесо с шестью лучами)
function perunSign(c, x, y, r, col) {
  c.save(); c.translate(x, y); c.strokeStyle = col; c.lineWidth = r * 0.16; circle(c, 0, 0, r); c.stroke();
  for (let i = 0; i < 6; i++) { c.rotate(TAU / 6); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(r * 0.55, -r * 0.2, r * 0.7, -r * 0.7); c.stroke(); }
  c.restore();
}

// ---------- Крупные планы ----------
// профиль Олега: шлем с наносником, борода; o.smirk 0..1, o.dark 0..1 (тень на лице), o.mouth 0..1
function olegFace(c, x, y, s, dir, o = {}) {
  const t = o.t || 0, rimCol = o.rim || "#ffb35a";
  c.save(); c.translate(x, y); c.scale(s * dir, s);
  const head = (g, cl) => {
    g.fillStyle = cl;
    // шея и плечи с кольчугой
    g.beginPath(); g.moveTo(-200, 420); g.quadraticCurveTo(-180, 220, -60, 170); g.lineTo(40, 170); g.quadraticCurveTo(200, 230, 260, 420); g.closePath(); g.fill();
    // лицо в профиль (смотрит вправо)
    g.beginPath(); g.moveTo(-80, -40); g.quadraticCurveTo(-90, 80, -40, 150); g.lineTo(60, 175);
    g.quadraticCurveTo(100, 150, 110, 110); // подбородок-борода
    g.lineTo(104, 70); g.quadraticCurveTo(116, 62, 108, 52); g.lineTo(112, 36 + (o.mouth || 0) * 6); // губы
    g.quadraticCurveTo(122, 30, 116, 22); g.lineTo(138, 6); g.quadraticCurveTo(140, -6, 120, -14); // нос
    g.lineTo(112, -40); g.quadraticCurveTo(110, -60, 96, -70); g.lineTo(-60, -80); g.closePath(); g.fill();
    // борода
    g.beginPath(); g.moveTo(-20, 60); g.quadraticCurveTo(40, 90, 104, 80); g.quadraticCurveTo(116, 140, 86, 200); g.quadraticCurveTo(40, 230, -10, 190); g.closePath(); g.fill();
    // шлем-шишак
    g.beginPath(); g.moveTo(-110, -40); g.quadraticCurveTo(-100, -170, 0, -250); g.quadraticCurveTo(100, -170, 120, -46); g.lineTo(-110, -30); g.closePath(); g.fill();
    g.fillRect(-4, -300, 10, 60);
    // наносник
    g.beginPath(); g.moveTo(104, -50); g.lineTo(124, -48); g.lineTo(128, 6); g.lineTo(116, 8); g.closePath(); g.fill();
    // бармица
    g.beginPath(); g.moveTo(-110, -40); g.quadraticCurveTo(-140, 80, -110, 170); g.lineTo(-40, 160); g.quadraticCurveTo(-70, 60, -60, -30); g.closePath(); g.fill();
  };
  fig(c, head, "#0b0e13", rimCol, 7, -4, 1);
  // золотой обод шлема
  c.strokeStyle = "rgba(230,175,80,0.85)"; c.lineWidth = 12; c.beginPath(); c.moveTo(-106, -38); c.quadraticCurveTo(10, -60, 118, -44); c.stroke();
  // глаз: блик
  const eyeK = 1 - (o.dark || 0) * 0.7;
  c.fillStyle = `rgba(255,220,170,${0.75 * eyeK})`; ellipse(c, 78, -16, 9, 5); c.fill();
  c.fillStyle = "#000"; circle(c, 82, -16, 4); c.fill();
  // ухмылка
  if (o.smirk > 0) { c.strokeStyle = `rgba(255,190,120,${0.7 * o.smirk})`; c.lineWidth = 4; c.beginPath(); c.moveTo(96, 50); c.quadraticCurveTo(106, 46 - o.smirk * 6, 112, 38); c.stroke(); }
  c.restore();
}
// кудесник крупно: капюшон, светящиеся глаза, борода
function sorcererFace(c, x, y, s, o = {}) {
  const t = o.t || 0;
  c.save(); c.translate(x, y); c.scale(s, s);
  const hood = (g, cl) => {
    g.fillStyle = cl;
    g.beginPath(); g.moveTo(-330, 520); g.quadraticCurveTo(-300, 120, -210, -40); g.quadraticCurveTo(-120, -260, 10, -270); g.quadraticCurveTo(150, -260, 220, -40);
    g.quadraticCurveTo(300, 120, 330, 520); g.closePath(); g.fill();
  };
  fig(c, hood, "#0a0d12", o.rim || "#9fc4ff", 0, -6, 0.9);
  // лицо в тени капюшона
  c.fillStyle = radial(c, 0, -20, 10, 200, [[0, "#3a3532"], [1, "#0e0d0c"]]);
  c.beginPath(); c.moveTo(-120, -60); c.quadraticCurveTo(0, -200, 120, -60); c.quadraticCurveTo(130, 60, 90, 120); c.lineTo(-90, 120); c.quadraticCurveTo(-130, 60, -120, -60); c.fill();
  // брови и морщины
  c.strokeStyle = "rgba(200,200,195,0.7)"; c.lineWidth = 10; c.lineCap = "round";
  c.beginPath(); c.moveTo(-90, -46); c.quadraticCurveTo(-55, -66, -22, -48); c.stroke(); c.beginPath(); c.moveTo(22, -48); c.quadraticCurveTo(55, -66, 90, -46); c.stroke();
  // глаза
  const g = o.glow || 0;
  [-52, 52].forEach((ex) => {
    c.fillStyle = "#050505"; ellipse(c, ex, -22, 22, 10); c.fill();
    c.save(); c.globalCompositeOperation = "lighter";
    c.fillStyle = radial(c, ex, -22, 0, 26 + g * 60, [[0, `rgba(200,230,255,${0.35 + g * 0.65})`], [1, "rgba(80,140,255,0)"]]); circle(c, ex, -22, 26 + g * 60); c.fill(); c.restore();
  });
  // нос
  c.fillStyle = "#24201e"; c.beginPath(); c.moveTo(-10, -30); c.quadraticCurveTo(-24, 40, -18, 52); c.quadraticCurveTo(0, 62, 18, 52); c.quadraticCurveTo(24, 40, 10, -30); c.fill();
  // борода: клин с мягким концом и тонкими прядями
  const sw0 = Math.sin(t * 1.1) * 14;
  c.fillStyle = linear(c, 0, 50, 0, 600, [[0, "rgba(214,218,216,0.95)"], [0.6, "rgba(170,176,178,0.8)"], [1, "rgba(120,126,130,0)"]]);
  c.beginPath(); c.moveTo(-122, 40); c.bezierCurveTo(-140, 220, -60, 420, 10 + sw0, 600); c.bezierCurveTo(70 + sw0, 420, 140, 220, 122, 40);
  c.quadraticCurveTo(0, 90, -122, 40); c.fill();
  c.lineCap = "round";
  for (let i = 0; i < 44; i++) {
    const u = i / 43, bx = lerp(-112, 112, u), sw = Math.sin(t * 1.2 + i * 0.7) * 10, len = 220 + Math.sin(u * Math.PI) * 330 + (i % 4) * 18;
    c.strokeStyle = i % 3 ? "rgba(235,238,236,0.55)" : "rgba(120,124,126,0.5)"; c.lineWidth = 3 + (i % 3);
    c.beginPath(); c.moveTo(bx, 56 + Math.abs(bx) * 0.25); c.quadraticCurveTo(bx * 0.75 + sw, 60 + len * 0.5, bx * 0.35 + sw * 1.6 + sw0 * 0.6, 60 + len); c.stroke();
  }
  // усы
  c.strokeStyle = "rgba(225,228,226,0.9)"; c.lineWidth = 14;
  c.beginPath(); c.moveTo(-6, 70); c.quadraticCurveTo(-50, 80, -70, 130); c.stroke(); c.beginPath(); c.moveTo(6, 70); c.quadraticCurveTo(50, 80, 70, 130); c.stroke();
  // рот под усами
  c.strokeStyle = "rgba(20,15,15,0.9)"; c.lineWidth = 8; const m = o.mouth || 0;
  c.beginPath(); c.moveTo(-34, 96); c.quadraticCurveTo(0, 96 + m * 18, 34, 96); c.stroke();
  c.restore();
}
// голова коня крупно (профиль вправо), глаз с бликом
function horseHead(c, x, y, s, dir, o = {}) {
  const t = o.t || 0, wind = o.wind ?? 1;
  c.save(); c.translate(x, y); c.scale(s * dir, s); c.rotate(o.tilt || 0);
  // грива за шеей
  c.lineCap = "round";
  for (let i = 0; i < 34; i++) {
    const u = i / 33, bx = lerp(-70, -380, u), by = lerp(-200, 560, u), wv = Math.sin(t * 3 + i * 0.5) * 16 * wind, ln = 90 + (i % 5) * 26 + wind * 30;
    c.strokeStyle = i % 3 ? "#07070a" : "#120d0b"; c.lineWidth = 7 + (i % 4) * 3;
    c.beginPath(); c.moveTo(bx + 30, by); c.bezierCurveTo(bx - ln * 0.3, by + 10 + wv, bx - ln * 0.7, by + 30 + wv, bx - ln, by + 60 + wv * 1.4); c.stroke();
  }
  const draw = (g, cl) => {
    g.fillStyle = cl;
    g.beginPath(); g.moveTo(-430, 620);
    g.bezierCurveTo(-400, 300, -260, 0, -90, -190);           // гребень шеи до затылка
    g.bezierCurveTo(-40, -230, 20, -215, 70, -180);            // лоб
    g.bezierCurveTo(160, -120, 250, -20, 315, 50);             // спинка носа
    g.bezierCurveTo(345, 85, 340, 135, 305, 150);              // храп
    g.bezierCurveTo(280, 162, 250, 160, 225, 150);             // губы
    g.bezierCurveTo(180, 150, 140, 140, 110, 145);             // подбородок
    g.bezierCurveTo(60, 190, -30, 190, -60, 140);              // ганаш (скула)
    g.bezierCurveTo(-70, 260, -60, 420, -10, 620); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(-95, -175); g.bezierCurveTo(-100, -230, -85, -270, -62, -292); g.bezierCurveTo(-50, -250, -40, -215, -30, -192); g.closePath(); g.fill(); // ухо
  };
  fig(c, draw, "#0d0a09", o.rim || "#ffb35a", -6, -6, 1);
  // объём: тёплый отсвет на скуле и храпе
  c.save(); c.globalCompositeOperation = "lighter";
  c.fillStyle = radial(c, 30, 60, 0, 170, [[0, "rgba(120,70,40,0.22)"], [1, "rgba(120,70,40,0)"]]); circle(c, 30, 60, 170); c.fill();
  c.fillStyle = radial(c, 280, 80, 0, 90, [[0, "rgba(120,70,40,0.18)"], [1, "rgba(120,70,40,0)"]]); circle(c, 280, 80, 90); c.fill();
  c.restore();
  // чёлка
  c.strokeStyle = "#07070a"; for (let i = 0; i < 7; i++) { const wv = Math.sin(t * 3 + i) * 8 * wind; c.lineWidth = 6; c.beginPath(); c.moveTo(-60 + i * 8, -200); c.quadraticCurveTo(-10 + i * 10 + wv, -170, 10 + i * 12 + wv, -120); c.stroke(); }
  // глаз
  c.fillStyle = "#1a0f0a"; ellipse(c, 60, -95, 26, 18, 0.35); c.fill();
  c.strokeStyle = "rgba(255,190,130,0.35)"; c.lineWidth = 3; c.beginPath(); c.ellipse(60, -95, 30, 22, 0.35, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
  c.fillStyle = `rgba(255,220,180,${0.8 + (o.eye || 0) * 0.2})`; circle(c, 68, -101, 6 + (o.eye || 0) * 4); c.fill();
  if (o.eye > 0) { c.save(); c.globalCompositeOperation = "lighter"; c.fillStyle = radial(c, 60, -95, 0, 120, [[0, `rgba(255,140,80,${0.5 * o.eye})`], [1, "rgba(255,80,40,0)"]]); circle(c, 60, -95, 120); c.fill(); c.restore(); }
  // ноздря
  const nf = 1 + (o.nostril || 0) * 0.5; c.fillStyle = "#000"; ellipse(c, 300, 95, 16 * nf, 9 * nf, 0.9); c.fill();
  c.restore();
}
// череп коня (профиль вправо)
function skull(c, x, y, s, rot = 0, light = 1, o = {}) {
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
  c.fillStyle = linear(c, 0, -80, 0, 60, [[0, mix("#5a5650", C.bone, light)], [1, mix("#2a2824", "#a8a090", light)]]);
  c.beginPath(); c.moveTo(-150, -30); c.quadraticCurveTo(-140, -90, -60, -86); c.quadraticCurveTo(40, -70, 150, -24); c.quadraticCurveTo(178, -6, 170, 18);
  c.quadraticCurveTo(100, 30, 40, 26); c.quadraticCurveTo(-20, 50, -90, 44); c.quadraticCurveTo(-150, 30, -150, -30); c.fill();
  // нижняя челюсть
  c.beginPath(); c.moveTo(-70, 40); c.quadraticCurveTo(40, 70, 160, 28); c.lineTo(150, 40); c.quadraticCurveTo(40, 90, -80, 66); c.closePath(); c.fill();
  // зубы
  c.strokeStyle = "rgba(40,36,30,0.8)"; c.lineWidth = 3; for (let i = 0; i < 8; i++) { c.beginPath(); c.moveTo(70 + i * 11, 22); c.lineTo(72 + i * 11, 36); c.stroke(); }
  // глазница
  const eo = o.eye || 0;
  c.fillStyle = "#050404"; ellipse(c, -48, -30, 32, 26, -0.2); c.fill();
  if (eo > 0) { c.save(); c.globalCompositeOperation = "lighter"; c.fillStyle = radial(c, -48, -30, 0, 40, [[0, `rgba(255,230,140,${0.6 * eo})`], [1, "rgba(255,180,60,0)"]]); circle(c, -48, -30, 40); c.fill(); c.restore(); }
  // ноздря и трещины
  c.fillStyle = "#14120f"; ellipse(c, 120, -8, 20, 8, -0.3); c.fill();
  c.strokeStyle = "rgba(30,26,22,0.6)"; c.lineWidth = 2; c.beginPath(); c.moveTo(-100, -60); c.lineTo(-70, -40); c.lineTo(-80, -10); c.stroke();
  c.restore();
}
// рёбра и кости коня на холме
function bones(c, x, y, s, light = 1) {
  c.save(); c.translate(x, y); c.scale(s, s); c.strokeStyle = mix("#4a463e", C.bone, light); c.lineCap = "round";
  c.lineWidth = 14; c.beginPath(); c.moveTo(-260, -20); c.quadraticCurveTo(-60, -50, 120, -24); c.stroke(); // хребет
  for (let i = 0; i < 9; i++) { const bx = -220 + i * 34; c.lineWidth = 9; c.beginPath(); c.moveTo(bx, -36 + i * 1.5); c.quadraticCurveTo(bx + 40, -110, bx + 30 - i * 2, 0); c.stroke(); }
  c.lineWidth = 12; c.beginPath(); c.moveTo(150, 10); c.lineTo(300, -4); c.stroke(); c.beginPath(); c.moveTo(-300, 10); c.lineTo(-180, 24); c.stroke();
  c.restore();
}
// змея по кривой pts [[x,y]...], k — сколько показано (0..1 от головы), t — время
function snake(c, pts, k, t, w = 26) {
  if (k <= 0) return;
  const n = pts.length, m = Math.max(2, Math.floor(n * k));
  const P = pts.slice(0, m);
  c.save(); c.lineCap = "round"; c.lineJoin = "round";
  for (let i = P.length - 1; i > 0; i--) {
    const u = i / (n - 1), ww = w * (u < 0.1 ? lerp(0.75, 1, u / 0.1) : lerp(1, 0.2, (u - 0.1) / 0.9));
    c.strokeStyle = "#080a08"; c.lineWidth = ww; c.beginPath(); c.moveTo(P[i][0], P[i][1]); c.lineTo(P[i - 1][0], P[i - 1][1]); c.stroke();
    if (i % 2 === 0) { c.strokeStyle = "rgba(120,160,120,0.35)"; c.lineWidth = ww * 0.25; c.beginPath(); c.moveTo(P[i][0], P[i][1] - ww * 0.25); c.lineTo(P[i - 1][0], P[i - 1][1] - ww * 0.25); c.stroke(); }
  }
  // голова
  const [hx, hy] = P[0], [nx, ny] = P[1], a = Math.atan2(hy - ny, hx - nx);
  c.translate(hx, hy); c.rotate(a);
  c.fillStyle = "#070907"; ellipse(c, 8, 0, w * 1.0, w * 0.62); c.fill();
  c.fillStyle = "rgba(255,200,60,0.95)"; circle(c, 14, -w * 0.28, w * 0.13); c.fill();
  const tg = Math.sin(t * 18) > 0.2 ? 1 : 0;
  if (tg) { c.strokeStyle = "#a01818"; c.lineWidth = 3; c.beginPath(); c.moveTo(w * 0.95, 0); c.lineTo(w * 1.6, 0); c.lineTo(w * 1.85, -6); c.moveTo(w * 1.6, 0); c.lineTo(w * 1.85, 6); c.stroke(); }
  c.restore();
}
// стрела в полёте
function arrow(c, x, y, ang, len = 120, col = "#0a0a0a") {
  c.save(); c.translate(x, y); c.rotate(ang); c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 4;
  c.beginPath(); c.moveTo(-len, 0); c.lineTo(0, 0); c.stroke();
  c.beginPath(); c.moveTo(12, 0); c.lineTo(-6, -7); c.lineTo(-6, 7); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(-len, 0); c.lineTo(-len - 14, -10); c.lineTo(-len + 16, 0); c.lineTo(-len - 14, 10); c.closePath(); c.fill();
  c.restore();
}
// ковш (чаша-ладья)
function ladle(c, x, y, s, rot, col = "#c8902e") {
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
  c.fillStyle = linear(c, 0, -30, 0, 30, [[0, "#ffe2a0"], [0.5, col], [1, "#5a3a10"]]);
  c.beginPath(); c.moveTo(-60, -20); c.quadraticCurveTo(0, 40, 60, -20); c.lineTo(80, -40); c.quadraticCurveTo(90, -50, 76, -52); c.lineTo(56, -30); c.lineTo(-56, -30); c.closePath(); c.fill();
  c.restore();
}
