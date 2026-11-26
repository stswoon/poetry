// ---------- Герои комикса: мальчик, Зима, дед. Все — анфас или строгий профиль, обе руки и обе ноги всегда видны ----------
// Позы — углы от вертикали вниз: a1 — плечо/бедро (плюс — наружу от тела), a2 — сгиб в локте/колене (плюс — дальше наружу/вверх).
// side: −1 — левая сторона экрана, +1 — правая.
function chain(S, side, L1, L2, a1, a2) {
  const t1 = a1, t2 = a1 + a2;
  const E = [S[0] + side * Math.sin(t1) * L1, S[1] + Math.cos(t1) * L1];
  const Hd = [E[0] + side * Math.sin(t2) * L2, E[1] + Math.cos(t2) * L2];
  return [S, E, Hd];
}
const lerpPose = (A, B, u) => {
  const o = {};
  for (const k in A) o[k] = Array.isArray(A[k]) ? A[k].map((v, i) => lerp(v, B[k][i], u)) : (typeof A[k] === "number" ? lerp(A[k], B[k], u) : (u < 0.5 ? A[k] : B[k]));
  return o;
};
// ключи поз по времени: [[t, pose], …] → поза с плавными переходами dur
function poseAt(keys, t, dur = 0.45) {
  let p = keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t < keys[i][0]) break;
    p = lerpPose(p, keys[i][1], easeIO(inv(keys[i][0], keys[i][0] + dur, t)));
  }
  return p;
}

// --- лицо: глаза, брови, рот (общие для героев) ---
function face(g, x, y, r, f, skin) {
  const ex = r * 0.36, ey = -r * 0.05;
  // румянец растром
  for (const sd of [-1, 1]) halftone(g, circ(x + sd * r * 0.55, y + r * 0.28, r * 0.2), C.mag, 2.2, 8, 30, 0.8);
  for (const sd of [-1, 1]) {
    const cx = x + sd * ex, cy = y + ey;
    if (f.eyes === "closed" || f.eyes === "happy") {
      g.beginPath(); g.arc(cx, cy + r * 0.05, r * 0.13, Math.PI * 1.1, Math.PI * 1.9); g.lineWidth = 4.5; g.strokeStyle = INK; g.stroke();
    } else {
      const big = f.eyes === "wide" ? 1.35 : 1;
      shape(g, ell(cx, cy, r * 0.1 * big, r * 0.14 * big), C.white, { lw: 3.5, reg: 0 });
      const lx = (f.look || 0) * r * 0.04, ly = (f.lookY || 0) * r * 0.04;
      g.beginPath(); g.arc(cx + lx, cy + ly + r * 0.02, r * 0.07 * big, 0, TAU); g.fillStyle = INK; g.fill();
      g.beginPath(); g.arc(cx + lx + r * 0.03, cy + ly - r * 0.02, r * 0.025 * big, 0, TAU); g.fillStyle = "#fff"; g.fill();
    }
    if (f.lash && f.eyes !== "closed" && f.eyes !== "happy") for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(cx + sd * r * (0.02 + i * 0.06), cy - r * 0.13); g.lineTo(cx + sd * r * (0.04 + i * 0.1), cy - r * 0.22); g.lineWidth = 3; g.strokeStyle = INK; g.stroke(); }
    // бровь: f.brow > 0 — радость/удивление (вверх), < 0 — хмуро (внутренний конец вниз)
    const b = f.brow || 0;
    if (f.lash) { // у Зимы — тонкие брови дугой
      g.beginPath(); g.arc(cx, cy - r * 0.08, r * 0.2, Math.PI * 1.2, Math.PI * 1.8); g.lineWidth = 4; g.strokeStyle = INK; g.lineCap = "round"; g.stroke();
      continue;
    }
    g.beginPath();
    g.moveTo(cx - sd * r * 0.14, cy - r * 0.24 - (b < 0 ? b * r * 0.1 : b * r * 0.08));
    g.lineTo(cx + sd * r * 0.14, cy - r * 0.26 - b * r * 0.1);
    g.lineWidth = 5; g.strokeStyle = INK; g.lineCap = "round"; g.stroke();
  }
  // рот
  const my = y + r * 0.42, m = f.mouth || "smile";
  g.lineWidth = 4.5; g.strokeStyle = INK;
  if (m === "smile") { g.beginPath(); g.arc(x, my - r * 0.12, r * 0.2, Math.PI * 0.2, Math.PI * 0.8); g.stroke(); }
  else if (m === "lips") { shape(g, (gg) => { gg.moveTo(x - r * 0.18, my - r * 0.08); gg.quadraticCurveTo(x, my - r * 0.16, x + r * 0.18, my - r * 0.08); gg.quadraticCurveTo(x, my + r * 0.08, x - r * 0.18, my - r * 0.08); gg.closePath(); }, [226, 40, 96], { lw: 3.5, reg: 0 }); }
  else if (m === "sad") { g.beginPath(); g.arc(x, my + r * 0.1, r * 0.16, Math.PI * 1.2, Math.PI * 1.8); g.stroke(); }
  else if (m === "o") { shape(g, ell(x, my, r * 0.09, r * 0.12), [150, 30, 40], { lw: 4, reg: 0 }); }
  else if (m === "laugh" || m === "open") {
    const h = m === "laugh" ? r * 0.2 : r * 0.14;
    shape(g, (gg) => { gg.moveTo(x - r * 0.22, my - r * 0.06); gg.quadraticCurveTo(x, my - r * 0.02, x + r * 0.22, my - r * 0.06); gg.quadraticCurveTo(x + r * 0.15, my + h, x, my + h); gg.quadraticCurveTo(x - r * 0.15, my + h, x - r * 0.22, my - r * 0.06); }, [160, 30, 50], { lw: 4, reg: 0 });
    shape(g, ell(x, my + h * 0.7, r * 0.09, h * 0.22), [240, 110, 120], { lw: 0, reg: 0 });
  } else if (m === "puff") {  // дует: губы трубочкой, щёки надуты
    shape(g, ell(x + r * 0.05, my - r * 0.02, r * 0.1, r * 0.08), [200, 60, 90], { lw: 4, reg: 0 });
  } else if (m === "flat") { g.beginPath(); g.moveTo(x - r * 0.14, my); g.lineTo(x + r * 0.14, my); g.stroke(); }
}

// ================= МАЛЬЧИК (анфас), начало координат — между ступнями на земле =================
const BOY_POSES = {
  stand: { la: [0.18, 0.1], ra: [0.18, 0.1], ll: [0.06, 0], rl: [0.06, 0], tilt: 0, air: 0 },
  hips: { la: [0.6, -1.0], ra: [0.6, -1.0], ll: [0.1, 0], rl: [0.1, 0], tilt: 0, air: 0 },          // руки в боки
  wave: { la: [0.2, 0.1], ra: [2.3, 0.5], ll: [0.06, 0], rl: [0.06, 0], tilt: 0.04, air: 0 },          // машет правой (экран справа)
  hooray: { la: [2.5, 0.25], ra: [2.5, 0.25], ll: [0.16, -0.05], rl: [0.16, -0.05], tilt: 0, air: 0 }, // руки вверх
  breathe: { la: [1.25, 0.15], ra: [1.25, 0.15], ll: [0.1, 0], rl: [0.1, 0], tilt: 0, air: 0 },      // руки в стороны, грудь вперёд
  belly: { la: [0.45, -1.75], ra: [0.45, -1.75], ll: [0.08, 0], rl: [0.08, 0], tilt: 0, air: 0 },     // держится за живот от смеха
};
function drawBoy(g, x, y, s, P, F = {}) {
  g.save(); g.translate(x, y); g.scale(s, s);
  const coat = C.cyan, coatD = C.cyanD, hat = C.red, mitt = C.red, boot = [70, 74, 92], pants = [52, 56, 88];
  // ноги: бедро, колено, ступня; ступни на земле (у = 0), если не прыжок
  const legs = [-1, 1].map((sd) => { const a = sd < 0 ? P.ll : P.rl; return chain([sd * 20, -118], sd, 58, 56, a[0], a[1]); });
  const low = Math.max(legs[0][2][1], legs[1][2][1]);
  const dy = -low - (P.air || 0) * 60;
  g.translate(0, dy);
  // тень на земле
  g.save(); g.translate(0, -dy); halftone(g, ell(0, 4, 70 * (1 - (P.air || 0) * 0.3), 12), C.ink, 2.4, 8, 45, 0.55); g.restore();
  // нога кончается щиколоткой внутри валенка: круглый конец штанины не торчит под подошвой
  for (const L of legs) {
    const K = L[1], F2 = L[2], d = Math.hypot(F2[0] - K[0], F2[1] - K[1]) || 1, cut = Math.min(24, d * 0.5);
    limb(g, [L[0], K, [F2[0] - (F2[0] - K[0]) / d * cut, F2[1] - (F2[1] - K[1]) / d * cut]], 30, pants, 4.5);
  }
  // валенок: голенище закрывает конец штанины, подошва ровно на земле (у = F2), носок наружу
  for (const [i, L] of legs.entries()) {
    const sd = i ? 1 : -1, F2 = L[2];
    shape(g, (gg) => { const x0 = F2[0] - 22, x1 = F2[0] + 22, y0 = F2[1] - 46, y1 = F2[1];
      gg.moveTo(x0 + 6, y0); gg.lineTo(x1 - 6, y0); gg.lineTo(x1 - 4, y1 - 14);
      if (sd > 0) { gg.quadraticCurveTo(x1 + 14, y1 - 14, x1 + 12, y1); gg.lineTo(x0 + 2, y1); gg.lineTo(x0 + 4, y1 - 14); }
      else { gg.lineTo(x1 - 2, y1); gg.lineTo(x0 - 12, y1); gg.quadraticCurveTo(x0 - 14, y1 - 14, x0 + 4, y1 - 14); }
      gg.closePath(); }, boot, { lw: 4.5, reg: 1, shade: { fn: rect(F2[0], F2[1] - 50, 40, 60), col: C.ink, r: 2, cell: 8, a: 0.45 } });
  }
  // наклон — только тело выше бёдер; ноги и валенки стоят на земле
  g.translate(0, -118); g.rotate(P.tilt || 0); g.translate(0, 118);
  // пальто-трапеция
  const coatP = poly([[-42, -212], [42, -212], [56, -100], [-56, -100]]);
  shape(g, coatP, coat, { shade: { fn: rect(14, -220, 60, 130), col: coatD, r: 2.8, cell: 9 } });
  for (const by of [-185, -155, -125]) shape(g, circ(0, by, 5), C.yel, { lw: 3, reg: 0 });
  // шарф
  shape(g, rrect(-40, -222, 80, 22, 10), C.yel, { lw: 4.5, shade: { fn: rect(0, -230, 50, 40), col: C.mag, r: 2, cell: 7 } });
  // руки
  const arms = [-1, 1].map((sd) => { const a = sd < 0 ? P.la : P.ra; return chain([sd * 40, -200], sd, 48, 44, a[0], a[1]); });
  for (const A of arms) limb(g, A, 26, coat, 4.5);
  for (const A of arms) shape(g, circ(A[2][0], A[2][1], 14), mitt, { lw: 4.5, reg: 1 });
  // голова
  const hy = -272;
  shape(g, circ(0, hy, 54), C.skin, { shade: { fn: rect(18, hy - 60, 50, 120), col: C.skinD, r: 2.2, cell: 8 } });
  face(g, 0, hy + 4, 54, { eyes: F.eyes || "open", brow: F.brow ?? 0.3, mouth: F.mouth || "smile", look: F.look, lookY: F.lookY });
  // нос-кнопка
  shape(g, ell(0, hy + 16, 7, 5.5), C.skinD, { lw: 3, reg: 0 });
  // шапка с отворотом и помпоном
  shape(g, (gg) => { gg.moveTo(-56, hy - 14); gg.quadraticCurveTo(-58, hy - 78, 0, hy - 82); gg.quadraticCurveTo(58, hy - 78, 56, hy - 14); gg.closePath(); }, hat,
    { shade: { fn: rect(16, hy - 90, 50, 80), col: [150, 10, 20], r: 2.6, cell: 9 } });
  shape(g, rrect(-60, hy - 30, 120, 24, 10), C.white, { lw: 4.5 });
  for (let i = -48; i <= 48; i += 16) { g.beginPath(); g.moveTo(i, hy - 27); g.lineTo(i + 4, hy - 9); g.lineWidth = 3; g.strokeStyle = css(C.red); g.stroke(); }
  shape(g, circ(4, hy - 88, 17), C.white, { lw: 4.5 });
  g.restore();
}

// ================= ЗИМА: в полёте (профиль, летит вправо) =================
// начало координат — пояс. Дальняя нога согнута в колене, дальняя рука вытянута выше ближней — обе видны.
function drawZimaFly(g, x, y, s, t, o = {}) {
  g.save(); g.translate(x, y); g.scale(s * (o.flip ? -1 : 1), s); g.rotate(o.rot || 0);
  const suit = C.cyan, suitD = C.cyanD, hair = [222, 236, 252];
  const fl = (i) => Math.sin(t * 8 + i * 1.3);
  // плащ от плеч назад, волнами, зубчатый край
  shape(g, (gg) => {
    gg.moveTo(44, -40);
    for (let i = 0; i <= 8; i++) { const u = i / 8; gg.lineTo(40 - 250 * u, -44 - 30 * u + fl(i) * 14 * u); }
    const tips = [[-226, -50], [-196, -40], [-232, -16], [-200, -14], [-222, 14]];
    tips.forEach(([tx, ty], k) => gg.lineTo(tx + fl(k + 5) * 10, ty + fl(k + 1) * 10));
    for (let i = 6; i >= 0; i--) { const u = i / 8; gg.lineTo(40 - 250 * u, -6 + 16 * u + fl(i + 3) * 10 * u); }
    gg.closePath();
  }, C.white, { shade: { fn: rect(-240, -30, 290, 60), col: C.cyan, r: 3, cell: 10, a: 0.65 } });
  // дальняя нога: колено вниз-назад, голень поднята
  limb(g, [[-26, -6], [-90, -2], [-126, -50]], 19, suitD, 4.5);
  shape(g, (gg) => { gg.moveTo(-118, -46); gg.lineTo(-146, -80); gg.quadraticCurveTo(-150, -92, -138, -92); gg.lineTo(-112, -62); gg.closePath(); }, C.white, { lw: 4.5 });
  // волосы назад прядями
  shape(g, (gg) => { gg.moveTo(98, -78); gg.quadraticCurveTo(40, -96 + fl(1) * 6, -40, -78 + fl(2) * 10); gg.quadraticCurveTo(-90, -70 + fl(3) * 12, -120, -54 + fl(4) * 12); gg.quadraticCurveTo(-60, -50, 0, -52); gg.quadraticCurveTo(40, -46, 60, -30); gg.closePath(); }, hair,
    { shade: { fn: rect(-130, -64, 200, 30), col: C.cyanL, r: 2.4, cell: 8 } });
  for (let i = 0; i < 3; i++) inkLine(g, [[40 - i * 6, -70 + i * 6], [-10 - i * 10, -72 + i * 8 + fl(i) * 5], [-60 - i * 12, -64 + i * 8 + fl(i + 1) * 8]], 3);
  // дальняя рука — вперёд и выше
  limb(g, [[36, -4], [88, 10], [138, 8]], 15, suitD, 4.5);
  shape(g, circ(143, 8, 12), C.white, { lw: 4.5, reg: 1 });
  // туловище: грудь шире талии
  shape(g, (gg) => { gg.moveTo(-34, -22); gg.quadraticCurveTo(10, -46, 52, -40); gg.quadraticCurveTo(70, -20, 52, 4); gg.quadraticCurveTo(10, 12, -34, 10); gg.closePath(); }, suit,
    { shade: { fn: rect(-40, -2, 110, 20), col: suitD, r: 2.8, cell: 9 } });
  snowflake(g, 30, -18, 13, C.white, 2.6);
  shape(g, rrect(-30, -24, 11, 36, 4), C.white, { lw: 3.5, reg: 0 });
  // ближняя нога — прямая назад
  limb(g, [[-28, 4], [-100, 12], [-170, 14]], 20, suit, 4.5);
  shape(g, (gg) => { gg.moveTo(-168, -2); gg.lineTo(-206, 2); gg.quadraticCurveTo(-216, 12, -204, 22); gg.lineTo(-168, 26); gg.closePath(); }, C.white, { lw: 4.5 });
  // голова
  const hx = 86, hy = -50;
  shape(g, circ(hx, hy, 36), C.skin, { shade: { fn: rect(hx - 40, hy + 10, 80, 30), col: C.skinD, r: 2, cell: 8 } });
  // глаз с ресницами, бровь, губы
  shape(g, ell(hx + 16, hy - 4, 6, 8), C.white, { lw: 3, reg: 0 });
  g.beginPath(); g.arc(hx + 18, hy - 3, 4, 0, TAU); g.fillStyle = INK; g.fill();
  g.lineWidth = 3; g.strokeStyle = INK;
  for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(hx + 12 + i * 5, hy - 11); g.lineTo(hx + 10 + i * 7, hy - 18); g.stroke(); }
  g.lineWidth = 4; g.beginPath(); g.moveTo(hx + 8, hy - 20); g.quadraticCurveTo(hx + 18, hy - 25, hx + 28, hy - 20); g.stroke();
  if (o.mouth === "open") shape(g, ell(hx + 24, hy + 18, 7, 7), [180, 30, 60], { lw: 3.5, reg: 0 });
  else shape(g, ell(hx + 24, hy + 17, 7, 3.5), [220, 40, 90], { lw: 3, reg: 0 });
  halftone(g, circ(hx + 6, hy + 10, 9), C.mag, 2, 7, 30, 0.8);
  // волосы на голове и кокошник
  shape(g, (gg) => { gg.moveTo(hx - 38, hy + 6); gg.quadraticCurveTo(hx - 40, hy - 40, hx, hy - 38); gg.quadraticCurveTo(hx + 30, hy - 36, hx + 34, hy - 18); gg.quadraticCurveTo(hx + 10, hy - 26, hx - 10, hy - 12); gg.quadraticCurveTo(hx - 20, hy, hx - 38, hy + 6); gg.closePath(); }, hair, { lw: 4 });
  shape(g, (gg) => { gg.moveTo(hx - 28, hy - 30); gg.quadraticCurveTo(hx - 6, hy - 92, hx + 26, hy - 34); gg.quadraticCurveTo(hx, hy - 54, hx - 28, hy - 30); gg.closePath(); }, C.white,
    { lw: 4, shade: { fn: rect(hx - 30, hy - 92, 60, 30), col: C.cyanL, r: 2.2, cell: 7 } });
  snowflake(g, hx - 2, hy - 62, 8, C.cyan, 2.4);
  // ближняя рука — вперёд, кулак
  limb(g, [[40, -14], [92, -20], [142, -30]], 17, suit, 4.5);
  shape(g, circ(148, -31, 13), C.white, { lw: 4.5, reg: 1 });
  g.restore();
}
function snowflake(g, x, y, r, col, lw = 3) {
  g.save(); g.translate(x, y); g.strokeStyle = INK; g.lineCap = "round";
  for (const [w, c] of [[lw + 3, INK], [lw, css(col)]]) {
    g.lineWidth = w; g.strokeStyle = c;
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * TAU, cx = Math.cos(a), sy = Math.sin(a);
      g.beginPath(); g.moveTo(0, 0); g.lineTo(cx * r, sy * r);
      g.moveTo(cx * r * 0.6, sy * r * 0.6); g.lineTo(cx * r * 0.6 + Math.cos(a + 0.8) * r * 0.3, sy * r * 0.6 + Math.sin(a + 0.8) * r * 0.3);
      g.moveTo(cx * r * 0.6, sy * r * 0.6); g.lineTo(cx * r * 0.6 + Math.cos(a - 0.8) * r * 0.3, sy * r * 0.6 + Math.sin(a - 0.8) * r * 0.3);
      g.stroke();
    }
  }
  g.restore();
}

// ================= ЗИМА: анфас (парит), начало координат — между носками сапог =================
const ZIMA_POSES = {
  open: { la: [1.9, 0.35], ra: [1.9, 0.35], legs: 0.04, puff: 0 },        // руки раскрыты — «здравствуйте!»
  point: { la: [0.55, -0.99], ra: [1.55, 0.05], legs: 0.04, puff: 0 },     // левая в бок, правая указывает вправо
  push: { la: [1.15, 0.25], ra: [1.15, 0.25], legs: 0.06, puff: 0 },    // обе руки вперёд-в стороны (бросает ковёр)
  blow: { la: [0.55, -0.99], ra: [0.55, -0.99], legs: 0.04, puff: 1 },      // руки в боки, дует
  laugh: { la: [0.55, -0.99], ra: [0.55, -0.99], legs: 0.04, puff: 0 },
};
function drawZimaFront(g, x, y, s, P, t, F = {}) {
  g.save(); g.translate(x, y); g.scale(s, s);
  const suit = C.cyan, suitD = C.cyanD, hair = [214, 232, 250];
  const fl = (i) => Math.sin(t * 5 + i * 1.4);
  // плащ за спиной — широкий, колышется
  const cw = F.capeWind ?? 1;
  shape(g, (gg) => { gg.moveTo(-44, -296); gg.quadraticCurveTo(-96 + fl(1) * 8, -200, -100 - 30 * cw + fl(2) * 14, -70 + fl(3) * 8); gg.lineTo(-60 - 20 * cw, -84 + fl(4) * 10); gg.lineTo(-30 - 10 * cw, -66 + fl(5) * 8);
    gg.lineTo(30 + 10 * cw, -66 + fl(6) * 8); gg.lineTo(60 + 30 * cw, -84 + fl(7) * 10); gg.lineTo(100 + 60 * cw + fl(8) * 14, -70 + fl(9) * 8); gg.quadraticCurveTo(96 + fl(1) * 8, -200, 44, -296); gg.closePath(); }, C.white,
    { shade: { fn: rect(0, -310, 220, 260), col: C.cyan, r: 3, cell: 10, a: 0.6 } });
  // волосы за спиной
  shape(g, (gg) => { gg.moveTo(-50, -360); gg.quadraticCurveTo(-90 + fl(6) * 8, -280, -70 + fl(7) * 10, -220); gg.lineTo(70 + fl(8) * 10, -220); gg.quadraticCurveTo(90 + fl(9) * 8, -280, 50, -360); gg.closePath(); }, hair, { lw: 4.5 });
  // ноги вместе, носки вниз (парит)
  for (const sd of [-1, 1]) {
    // нога кончается щиколоткой выше носка сапожка; сапожок шире ноги и закрывает её конец
    limb(g, [[sd * 18, -120], [sd * (18 + P.legs * 40), -66], [sd * (12 + P.legs * 30), -34]], 26, sd < 0 ? suitD : suit, 4.5);
    shape(g, (gg) => { const fx = sd * (12 + P.legs * 30); gg.moveTo(fx - 20, -48); gg.lineTo(fx + 20, -48); gg.lineTo(fx + 13, 0); gg.quadraticCurveTo(fx, 12, fx - 13, 0); gg.closePath(); }, C.white, { lw: 4.5 });
  }
  // туловище
  shape(g, (gg) => { gg.moveTo(-44, -300); gg.lineTo(44, -300); gg.quadraticCurveTo(50, -200, 34, -130); gg.lineTo(-34, -130); gg.quadraticCurveTo(-50, -200, -44, -300); gg.closePath(); }, suit,
    { shade: { fn: rect(12, -310, 50, 190), col: suitD, r: 2.8, cell: 9 } });
  snowflake(g, 0, -240, 24, C.white, 3.5);
  // туника-юбочка с узором по краю
  shape(g, (gg) => { gg.moveTo(-38, -150); gg.lineTo(38, -150); gg.lineTo(60, -96); gg.quadraticCurveTo(0, -84, -60, -96); gg.closePath(); }, C.white,
    { lw: 4.5, shade: { fn: rect(0, -160, 70, 80), col: C.cyanL, r: 2.4, cell: 8 } });
  for (let k = -2; k <= 2; k++) shape(g, poly([[k * 22 - 7, -98 + Math.abs(k) * 2], [k * 22, -108 + Math.abs(k) * 2], [k * 22 + 7, -98 + Math.abs(k) * 2]]), C.cyan, { lw: 2.5, reg: 0 });
  shape(g, rrect(-38, -156, 76, 14, 6), C.cyan, { lw: 4 });
  // руки
  const arms = [-1, 1].map((sd) => { const a = sd < 0 ? P.la : P.ra; return chain([sd * 42, -290], sd, 62, 56, a[0], a[1]); });
  for (const [i, A] of arms.entries()) limb(g, A, 22, i ? suit : suitD, 4.5);
  for (const A of arms) shape(g, circ(A[2][0], A[2][1], 14), C.white, { lw: 4.5, reg: 1 });
  // голова
  const hy = -340;
  shape(g, circ(0, hy, 46), C.skin, { shade: { fn: rect(16, hy - 50, 40, 100), col: C.skinD, r: 2, cell: 8 } });
  if (P.puff > 0.5) for (const sd of [-1, 1]) shape(g, circ(sd * 30, hy + 18, 13), C.skin, { lw: 3.5, reg: 0 });
  face(g, 0, hy + 4, 46, { eyes: F.eyes || (P.puff > 0.5 ? "closed" : "open"), brow: F.brow ?? 0.5, mouth: P.puff > 0.5 ? "puff" : (F.mouth || "lips"), look: F.look, lash: 1 });
  // чёлка и кокошник
  shape(g, (gg) => { gg.moveTo(-48, hy - 6); gg.quadraticCurveTo(-46, hy - 52, 0, hy - 50); gg.quadraticCurveTo(46, hy - 52, 48, hy - 6); gg.quadraticCurveTo(30, hy - 30, 0, hy - 28); gg.quadraticCurveTo(-30, hy - 30, -48, hy - 6); gg.closePath(); }, hair, { lw: 4 });
  shape(g, (gg) => { gg.moveTo(-44, hy - 40); gg.quadraticCurveTo(0, hy - 120, 44, hy - 40); gg.quadraticCurveTo(0, hy - 64, -44, hy - 40); gg.closePath(); }, C.white,
    { lw: 4.5, shade: { fn: rect(-50, hy - 120, 100, 40), col: C.cyanL, r: 2.4, cell: 8 } });
  snowflake(g, 0, hy - 78, 12, C.cyan, 3);
  g.restore();
}

// ================= ДЕД (анфас), начало координат — середина между валенками на земле =================
const DED_POSES = {
  bread: { la: [0.35, -1.55], ra: [0.35, -1.55], cold: 0 },   // держит хлеб-соль на рушнике перед собой
  thumb: { la: [0.5, -0.9], ra: [0.55, 2.35], cold: 0 },      // левая — на кушаке, правая — большой палец вверх
  brace: { la: [0.5, -0.9], ra: [0.5, -0.9], cold: 1 },      // руки в боки, жмурится от ветра
};
function drawDed(g, x, y, s, P, t, F = {}) {
  g.save(); g.translate(x, y); g.scale(s, s);
  const coat = [232, 170, 70], coatD = [190, 110, 30], fur = [250, 240, 220], boot = [110, 108, 120], hat = [120, 76, 44];
  const wind = (F.wind || 0);
  const fl = (i) => Math.sin(t * 11 + i) * wind;
  // валенки (ступни на земле)
  for (const sd of [-1, 1]) shape(g, rrect(sd * 34 - 24, -70, 48, 70, 14), boot, { shade: { fn: rect(sd * 34, -80, 40, 90), col: C.ink, r: 2, cell: 8, a: 0.5 } });
  // тень
  halftone(g, ell(0, 4, 110, 14), C.ink, 2.4, 8, 45, 0.5);
  // тулуп до колен, полы колышутся на ветру
  shape(g, (gg) => { gg.moveTo(-58, -300); gg.lineTo(58, -300); gg.lineTo(88 + fl(1) * 14, -60); gg.quadraticCurveTo(0, -46, -88 + fl(2) * 10, -60); gg.closePath(); }, coat,
    { shade: { fn: rect(20, -310, 90, 270), col: coatD, r: 3, cell: 10 } });
  // меховая опушка по борту и подолу
  shape(g, rrect(-8, -300, 16, 244, 6), fur, { lw: 4 });
  shape(g, (gg) => { gg.moveTo(-90 + fl(2) * 10, -64); gg.quadraticCurveTo(0, -48, 90 + fl(1) * 14, -64); gg.lineTo(88 + fl(1) * 14, -48); gg.quadraticCurveTo(0, -32, -88 + fl(2) * 10, -48); gg.closePath(); }, fur, { lw: 4 });
  // красный кушак
  shape(g, rrect(-66, -170, 132, 22, 8), C.red, { lw: 4.5 });
  shape(g, poly([[30, -152], [44, -100], [26, -104], [18, -150]]), C.red, { lw: 4 });
  // борода — большая, на груди
  const bx = fl(3) * 10;
  shape(g, (gg) => { gg.moveTo(-50, -330); gg.quadraticCurveTo(-66, -250, -20 + bx, -200); gg.quadraticCurveTo(0 + bx * 1.4, -180, 20 + bx, -200); gg.quadraticCurveTo(66, -250, 50, -330); gg.closePath(); }, [236, 236, 240],
    { shade: { fn: rect(10, -340, 60, 150), col: C.grayD, r: 2.4, cell: 8 } });
  // руки
  const arms = [-1, 1].map((sd) => { const a = sd < 0 ? P.la : P.ra; return chain([sd * 56, -286], sd, 66, 60, a[0], a[1]); });
  if (F.bread) {
    // рушник между кистями и каравай с солонкой
    const A = arms[0][2], B = arms[1][2];
    shape(g, (gg) => { gg.moveTo(A[0] - 6, A[1] - 6); gg.lineTo(B[0] + 6, B[1] - 6); gg.lineTo(B[0] + 4, B[1] + 70); gg.lineTo(A[0] - 4, A[1] + 70); gg.closePath(); }, C.white, { lw: 4 });
    for (const yy of [52, 62]) { g.beginPath(); g.moveTo(A[0], A[1] + yy); g.lineTo(B[0], B[1] + yy); g.lineWidth = 4; g.strokeStyle = css(C.red); g.stroke(); }
    shape(g, ell((A[0] + B[0]) / 2, (A[1] + B[1]) / 2 - 26, 58, 30), [214, 140, 60], { shade: { fn: rect((A[0] + B[0]) / 2, (A[1] + B[1]) / 2 - 60, 70, 60), col: [150, 80, 20], r: 2.6, cell: 9 } });
    shape(g, ell((A[0] + B[0]) / 2, (A[1] + B[1]) / 2 - 50, 14, 8), C.white, { lw: 3.5 });
  }
  for (const A of arms) limb(g, A, 30, coat, 4.5);
  for (const A of arms) shape(g, circ(A[1][0], A[1][1], 3), coat, { lw: 0, reg: 0 });
  for (const [i, A] of arms.entries()) {
    const Hd = A[2];
    // меховой обшлаг
    const d = [Hd[0] - A[1][0], Hd[1] - A[1][1]], l = Math.hypot(d[0], d[1]) || 1, cu = [Hd[0] - d[0] / l * 14, Hd[1] - d[1] / l * 14];
    shape(g, circ(cu[0], cu[1], 17), fur, { lw: 4, reg: 0 });
    if (F.thumb && i === 1) {
      // кулак в варежке и большой палец вверх
      shape(g, rrect(Hd[0] - 10, Hd[1] - 44, 18, 34, 9), C.red, { lw: 4.5, reg: 0 });
      shape(g, rrect(Hd[0] - 18, Hd[1] - 16, 40, 32, 12), C.red, { lw: 4.5, reg: 1 });
      g.beginPath(); g.moveTo(Hd[0] - 8, Hd[1] - 2); g.lineTo(Hd[0] + 14, Hd[1] - 2); g.lineWidth = 3; g.strokeStyle = INK; g.stroke();
    } else shape(g, circ(Hd[0], Hd[1], 16), C.red, { lw: 4.5, reg: 1 });
  }
  // голова
  const hy = -352;
  shape(g, circ(0, hy, 46), C.skin, { shade: { fn: rect(14, hy - 50, 40, 100), col: C.skinD, r: 2, cell: 8 } });
  const sq = P.cold > 0.5;
  face(g, 0, hy + 2, 46, { eyes: sq ? "closed" : (F.eyes || "open"), brow: 0, mouth: "flat" });
  for (const sd of [-1, 1]) shape(g, (gg) => { const bx0 = sd * 17, by0 = hy - 14 - (sq ? -3 : 3); gg.moveTo(bx0 - sd * 4, by0 - 4); gg.quadraticCurveTo(bx0 + sd * 10, by0 - 14, bx0 + sd * 26, by0 + 4); gg.quadraticCurveTo(bx0 + sd * 12, by0 - 2, bx0 - sd * 4, by0 - 4); gg.closePath(); }, [240, 240, 244], { lw: 3.5, reg: 0 });
  // усы поверх рта, румяный нос
  shape(g, (gg) => { gg.moveTo(-34, hy + 22); gg.quadraticCurveTo(-16, hy + 10, 0, hy + 18); gg.quadraticCurveTo(16, hy + 10, 34, hy + 22); gg.quadraticCurveTo(16, hy + 30, 0, hy + 24); gg.quadraticCurveTo(-16, hy + 30, -34, hy + 22); gg.closePath(); }, [236, 236, 240], { lw: 4 });
  if (F.speak) shape(g, ell(0, hy + 33, 10, 7 + 3 * Math.abs(Math.sin(t * 14))), [150, 30, 40], { lw: 3.5, reg: 0 });
  shape(g, circ(0, hy + 10, 11), [240, 110, 100], { lw: 4, reg: 0 });
  // ушанка с опущенными ушами (выше глаз)
  shape(g, (gg) => { gg.moveTo(-56, hy - 22); gg.quadraticCurveTo(-60, hy - 92, 0, hy - 96); gg.quadraticCurveTo(60, hy - 92, 56, hy - 22); gg.closePath(); }, hat,
    { shade: { fn: rect(14, hy - 100, 60, 90), col: [70, 40, 20], r: 2.6, cell: 9 } });
  for (const sd of [-1, 1]) shape(g, rrect(sd * 54 - 14 + fl(5 + sd) * 4, hy - 30, 28, 56, 10), hat, { lw: 4.5 });
  shape(g, rrect(-62, hy - 60, 124, 24, 10), [150, 100, 60], { lw: 4.5 });
  g.restore();
}
