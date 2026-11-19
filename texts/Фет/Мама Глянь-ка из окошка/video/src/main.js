// ---------- сцены по времени ----------
const L = (n) => E[`L${n}`], EN = (n) => E[`E${n}`];
const cv = document.getElementById("scene"), ctx = cv.getContext("2d");
const LW = makeCanvas(W, H), lw = LW.getContext("2d");   // мел комнаты/двора (камера)
const LY = makeCanvas(W, H), ly = LY.getContext("2d");   // двор в окне
const LS = makeCanvas(W, H), ls = LS.getContext("2d");   // строки и заголовок
const GL = makeCanvas(480, 270), gl = GL.getContext("2d");
let PAT_B = null, PAT_W = null, PAT_S = null;

// ===== ключевые моменты =====
const T_TITLE0 = 0.35, T_TITLE1 = 2.0, T_AUTH1 = 2.75;
const T_IN1 = L(4) + 0.25, T_IN0 = T_IN1 - 0.95;           // пролёт сквозь окно во двор
const T_OUT0 = L(9) - 0.45, T_OUT1 = L(9) + 0.35;          // назад в комнату («Погляди хоть ты!»)
const T_IN2_1 = L(10) + 0.15, T_IN2_0 = T_IN2_1 - 0.75;     // снова во двор, к кустам
const T_WIPE0 = L(16) - 0.55, T_WIPE1 = L(16) + 0.2;       // губка стирает горку — дома
const T_BUBBLE = E.w_vchera - 0.25, T_BUBBLE_OUT = EN(3) + 0.05;
const T_RUN0 = L(13) - 0.2, T_HILL_TOP = E.w_veselo - 0.15, T_RIDE1 = T_WIPE0 + 0.15;
const T_EXIT0 = E.fin - 0.2, T_EXIT1 = T_EXIT0 + 2.2;
const T_FTITLE0 = E.fin + 0.2, T_FTITLE1 = T_FTITLE0 + 1.6;

// ===== камеры =====
// ключи камеры: [t, x, y, z]; между ключами — плавно (easeInOut), масштаб в логарифме
function camKeys(K, t) {
  if (t <= K[0][0]) return { x: K[0][1], y: K[0][2], z: K[0][3] };
  for (let i = 1; i < K.length; i++) {
    if (t <= K[i][0]) {
      const a = K[i - 1], b = K[i], u = easeInOut(prog(t, a[0], b[0]));
      return { x: lerp(a[1], b[1], u), y: lerp(a[2], b[2], u), z: Math.exp(lerp(Math.log(a[3]), Math.log(b[3]), u)) };
    }
  }
  const k = K[K.length - 1]; return { x: k[1], y: k[2], z: k[3] };
}
const ROOM_K = [
  [0, 960, 420, 0.9], [V0() - 0.9, 960, 420, 0.9], [E.w_mama + 0.4, 1180, 470, 1.12], [E.w_okoshka, 900, 440, 1.2],
  [T_BUBBLE + 0.3, 1220, 560, 1.2], [EN(3) - 0.2, 1240, 560, 1.24],
  // назад в комнату в L9 — общий план с мамой
  [T_OUT1, 1000, 470, 1.0], [T_IN2_0, 900, 430, 1.1],
  // после губки — девочка и мама
  [T_WIPE0, 1240, 500, 1.15], [T_WIPE1, 1240, 500, 1.15], [E.w_otkazh, 1180, 470, 1.25], [L(17), 1320, 440, 1.3], [E.w_nu - 0.1, 1300, 470, 1.15],
  [E.fin, 1150, 470, 1.0], [T_FTITLE0 + 0.5, 960, 380, 0.82]
];
function V0() { return E.V0; }
const winCam = { x: WIN.x + WIN.w / 2, y: WIN.y + WIN.h / 2, z: W / WIN.w };
// доля пролёта сквозь окно: 0 — комната, 1 — двор во весь кадр
function winZoom(t) {
  if (t < T_IN0) return 0;
  if (t < T_IN1) return easeIn(prog(t, T_IN0, T_IN1)) * 0.35 + 0.65 * sstep(prog(t, T_IN0, T_IN1)) ;
  if (t < T_OUT0) return 1;
  if (t < T_OUT1) return 1 - sstep(prog(t, T_OUT0, T_OUT1));
  if (t < T_IN2_0) return 0;
  if (t < T_IN2_1) return sstep(prog(t, T_IN2_0, T_IN2_1));
  if (t < T_WIPE0) return 1;
  return 0;
}
function roomCam(t) {
  const c0 = camKeys(ROOM_K, t), k = winZoom(t);
  c0.y = Math.max(c0.y, FLOOR - 262 / c0.z);   // пол не уходит под строки
  if (k <= 0) return c0;
  // наезд на окно: центр и масштаб к раме; масштаб в логарифме, центр так, чтобы окно росло ровно
  const z = Math.exp(lerp(Math.log(c0.z), Math.log(winCam.z), k));
  const kk = (z - c0.z) / (winCam.z - c0.z || 1);
  return { x: lerp(c0.x, winCam.x, kk), y: lerp(c0.y, winCam.y, kk), z };
}
// камера двора; позиция героини на горке нужна для слежения
const YARD_K = () => [
  [0, 960, 540, 1], [E.w_odelo, 960, 540, 1], [E.w_pobel + 0.3, 1150, 520, 1.02], [E.w_vidno - 0.05, 1500, 460, 1.3], [E.w_moroz + 0.4, 1580, 430, 1.38],
  [L(7) - 0.05, 2860, 440, 1.0], [L(8), 2820, 330, 1.3], [EN(8) + 0.1, 2840, 280, 1.55],
  // пока мы в комнате, двор в окне уезжает к кустам
  [T_OUT1, 2830, 380, 1.15], [T_IN2_0, 2830, 380, 1.15], [T_IN2_1 + 0.3, 3650, 470, 1.0], [E.w_svezh, 3670, 480, 1.0], [E.w_vatoy, 4290, 470, 1.0],
  [E.w_vse + 0.1, 4350, 450, 0.82], [EN(12) + 0.2, 4350, 450, 0.82], [T_RUN0 - 0.15, 5450, 480, 0.95]
];
let YK = null;
function yardCam(t) {
  if (!YK) YK = YARD_K();
  if (t < T_RUN0 + 0.9) return camKeys(YK, t);
  const g = sledGirl(t);
  const c1 = { x: g.x + 120, y: Math.min(480, g.y - 160), z: 0.95 };
  const c0 = camKeys(YK, T_RUN0 + 0.9), u = sstep(prog(t, T_RUN0 + 0.9, T_RUN0 + 1.8));
  return { x: lerp(c0.x, c1.x, u), y: lerp(c0.y, c1.y, u), z: c1.z };
}

// ===== ходьба: ступни в точках мира =====
// x0 — откуда пошёл, x — где тело; SL — шаг; dir — направление. Возвращает мировые x ступней и подъём.
function walkFeet(x0, x, dir, SL, lift) {
  const d = Math.max(0, (x - x0) * dir), out = [];
  for (let j = 0; j < 2; j++) {
    const cyc = (d / SL + j) / 2, n = Math.floor(cyc), f = cyc - n;
    const Xp = (m) => x0 + dir * (2 * m + 0.5 - j) * SL;
    if (f < 0.5) out.push([Xp(n), 0]);
    else { const u = (f - 0.5) * 2; out.push([lerp(Xp(n), Xp(n + 1), easeInOut(u)), Math.sin(u * Math.PI) * lift]); }
  }
  return out;  // [far, near]
}

// ===== девочка в комнате =====
const STOOL_X = 1060, STOOL_TOP = FLOOR - 82;
function roomGirl(t) {
  const s = girlDefault();
  s.seed = 1; s.sc = 1;
  const blink = (a) => (Math.abs(((t + a) % 3.1) - 0.1) < 0.07 ? 1 : 0);
  if (t < T_WIPE0) {
    // на табурете у окна
    s.x = STOOL_X; s.y = STOOL_TOP; s.face = -1; s.blink = blink(0.4);
    s.feet = [[-12, 0], [14, 0]];
    s.hands = [[52, -126], [30, -112]];   // дальняя ладонь у живота — не под показывающей рукой
    s.bob = Math.sin(t * 3) * 1.5;
    s.sway = Math.sin(t * 2.2) * 0.4;
    // «Мама!» — поворот к маме и взмах
    const turn = t > E.w_mama - 0.12 && t < E.w_glyan - 0.05;
    if (turn) {
      s.face = 1; s.mouth = 0.8;
      const wv = Math.sin((t - E.w_mama) * 18);
      s.hands[1] = [42 + wv * 8, -210 + wv * 6]; s.hands[0] = [40, -132]; s.farFront = true;
      s.tilt = -0.08; s.bob += bump(t, E.w_mama - 0.1, 0.4) * -8;
    } else if (t >= E.w_glyan - 0.05 && t < T_OUT0) {
      // показывает в окно; оглядывается на маму в «Погляди хоть ты!»
      const pt = sstep(prog(t, E.w_glyan - 0.05, E.w_glyan + 0.25));
      s.hands[1] = [lerp(30, 84, pt), lerp(-112, -186, pt)];
      s.mouth = t < EN(1) ? 0.5 : 0;
      s.look = 0.6;
      // вспоминает кошку: пальчик у подбородка
      if (t > T_BUBBLE && t < T_BUBBLE_OUT) { s.tilt = -0.12; s.look = 0.2; s.hands[1] = [52, -196]; s.hands[0] = [44, -168]; s.mouth = 0.3; }
    }
    if (t >= T_OUT0) {
      // «Погляди хоть ты!» — оборачивается к маме и зовёт рукой
      const call = t < E.w_ty + 0.6;
      s.face = call ? 1 : -1;
      if (call) { const wv = Math.sin((t - E.w_pogl) * 14); s.hands[1] = [56 + wv * 14, -150 + wv * 10]; s.hands[0] = [40, -124]; s.mouth = 0.6; s.look = 0.3; }
      else { s.hands[1] = [80, -190]; s.hands[0] = [52, -126]; s.mouth = 0.2; s.look = 0.6; }
    }
    s.stool = true;
    return s;
  }
  // после губки: на полу, просит маму
  s.x = 1200; s.y = FLOOR; s.face = 1; s.blink = blink(0.9);
  s.feet = [[-12, 0], [14, 0]];
  const hop = Math.abs(Math.sin((t - T_WIPE1) * 7)) * 6 * (t < L(17) ? 1 : 0.3);
  s.bob = -hop;
  s.hands = [[30, -150], [34, -144]]; s.farFront = true;   // ладошки у груди — «ну пожалуйста»
  s.tilt = -0.14 + Math.sin(t * 3) * 0.04; s.look = 0.6; s.mouth = t < EN(16) ? 0.4 : 0;
  s.sway = Math.sin(t * 7) * 0.6;
  // «гулять!» — прыжок, руки вверх
  if (t >= E.w_gulyat - 0.1) {
    const j = bump(t, E.w_gulyat - 0.1, 0.55);
    const k = sstep(prog(t, E.w_gulyat - 0.1, E.w_gulyat + 0.05)) * (1 - sstep(prog(t, E.w_gulyat + 0.6, E.w_gulyat + 0.9)));
    s.bob = -j * 90; s.hands = [[lerp(30, 76, k), lerp(-150, -252, k) + s.bob], [lerp(34, -64, k), lerp(-144, -248, k) + s.bob]];   // руки буквой V — за контуром головы
    s.farFront = k < 0.5; s.mouth = 0.9; s.tilt = 0;
    if (j > 0) { s.feet = [[-10, -j * 72], [12, -j * 72]]; s.jump = j * 80; }
  }
  if (t > T_EXIT0) {
    const x = lerp(1200, 1630, easeInOut(prog(t, T_EXIT0, T_EXIT0 + 1.3)));
    const f = walkFeet(1200, x, 1, 46, 14);
    s.x = x; s.feet = f.map(([fx, fy]) => [fx - x, -fy]);
    s.bob = -Math.abs(Math.sin((x - 1200) / 46 * Math.PI)) * 6;
    s.hands = [[42 + Math.sin(x / 30) * 8, -112], [-34 - Math.sin(x / 30) * 10, -110]]; s.farFront = false;
    s.mouth = 0.3; s.tilt = 0;
    if (t > T_EXIT0 + 0.3) { s.outfit = "coat"; s.scarf = 0.4; }   // мел «переодевает» её в пальто с вешалки
    s.alpha = 1 - sstep(prog(t, T_EXIT0 + 1.15, T_EXIT0 + 1.5));
  }
  return s;
}

// ===== мама =====
const MOM_X0 = 1610, MOM_X1 = 1290;
function roomMom(t) {
  const s = momDefault();
  s.face = -1; s.x = MOM_X0; s.y = FLOOR; s.steam = t;
  s.hands = [[56, -240], [46, -266]]; s.cup = 1;   // чашка в ближней руке, дальняя придерживает снизу (из-за туловища)
  s.blink = Math.abs(((t + 1.3) % 3.7) - 0.1) < 0.07 ? 1 : 0;
  s.look = 0.4;
  if (t > E.w_mama && t < T_IN0) { s.tilt = 0.06; s.mouth = t > E.w_okoshka - 0.2 && t < EN(1) + 0.3 ? 0.4 : 0; }
  if (t < T_WIPE0) {
    // «Погляди хоть ты!» — идёт к окну и наклоняется, ахает
    if (t >= T_OUT0) {
      const u = easeInOut(prog(t, E.w_pogl - 0.1, E.w_ty + 0.5));
      const x = lerp(MOM_X0, MOM_X1, u);
      const f = walkFeet(MOM_X0, x, -1, 52, 10);
      s.x = x; s.feet = f.map(([fx]) => (fx - x) * -1); s.step = Math.sin(((MOM_X0 - x) / 52) * Math.PI);
      s.sway = Math.sin(((MOM_X0 - x) / 52) * Math.PI) * 0.6;
      const bend = sstep(prog(t, E.w_ty + 0.3, E.w_ty + 0.8));
      s.lean = bend * 0.28; s.mouth = bend * 0.7; s.tilt = bend * 0.08;   // «ах!» — наклон и открытый рот, чашка в руках
    }
    return s;
  }
  // дома после губки: мама у двери, слушает дочку
  s.x = 1470; s.face = -1; s.cup = 0;
  s.hands = [[70, -252], [-28, -226]];   // ближняя рука на поясе, дальняя ладонью вперёд — «ну-ну»
  s.tilt = 0.05; s.look = 0.6;
  if (t > L(17) - 0.1) { s.smileEyes = t > E.w_sama; s.hands = [[54, -262], [58, -338]]; s.tilt = -0.05 + Math.sin(t * 2) * 0.03; }  // хитро подпирает щёку
  if (t > E.w_nu - 0.1) { s.mouth = t < EN(18) + 0.1 ? 0.7 : 0; s.hands = [[58, -250], [96, -300 + Math.sin(t * 9) * 14]]; s.smileEyes = 1; }
  if (t > T_EXIT0 + 0.3) {
    s.face = 1;
    const x = lerp(1470, 1640, easeInOut(prog(t, T_EXIT0 + 1.2, T_EXIT1)));
    const f = walkFeet(1470, x, 1, 52, 10);
    s.x = x; s.feet = f.map(([fx]) => fx - x); s.step = Math.sin(((x - 1470) / 52) * Math.PI); s.hat = prog(t, T_EXIT0 + 0.3, T_EXIT0 + 0.9);
    const sw2 = Math.sin(((x - 1470) / 52) * Math.PI); s.hands = [[54 + sw2 * 10, -244], [-36 - sw2 * 10, -244]]; s.farFront = false; s.mouth = 0; s.smileEyes = 1;
    s.alpha = 1 - sstep(prog(t, T_EXIT1 - 0.5, T_EXIT1));
  }
  return s;
}

// ===== кошка: умывается в облачке и в финале на подоконнике =====
function catState(t, x, y, sc, t0) {
  const u = Math.max(0, t - t0), cyc = (u * 1.6) % 1;
  // лизнуть лапу (у рта) → провести по носу → опустить
  let paw = [34, -8], lick = 0;
  if (u > 0) {
    if (cyc < 0.35) { const k = sstep(cyc / 0.25); paw = [lerp(34, 52, k), lerp(-8, -96, k)]; lick = k > 0.8 ? 1 : 0; }
    else if (cyc < 0.75) { const k = sstep((cyc - 0.35) / 0.4); paw = [lerp(52, 58, k), lerp(-96, -124, k)]; }
    else { const k = sstep((cyc - 0.75) / 0.25); paw = [lerp(58, 34, k), lerp(-124, -8, k)]; }
  }
  return { x, y, sc, face: 1, paw, lick, wag: Math.sin(t * 2.4), blink: lick };
}

// ===== девочка на горке =====
const GIRL_X0 = 4380;   // левее левого края кадра (камера 5450, z 0.95): вбегает из-за края
function sledGirl(t) {
  const x0 = GIRL_X0, xTop = HILL.top[0] - 10;
  let x, mode;
  if (t < T_HILL_TOP) { x = lerp(x0, xTop, easeInOut(prog(t, T_RUN0, T_HILL_TOP)) * 0.15 + 0.85 * prog(t, T_RUN0, T_HILL_TOP)); mode = "walk"; }
  else if (t < E.w_veselo + 0.12) { x = xTop; mode = "sit"; }
  else { x = lerp(xTop, HILL.x1 - 120, easeIn(prog(t, E.w_veselo + 0.12, T_RIDE1)) * 0.6 + 0.4 * prog(t, E.w_veselo + 0.12, T_RIDE1)); mode = "ride"; }
  return { x, y: hillY(x), mode };
}
function drawSledScene(c, t) {
  if (t < T_RUN0 || t > T_WIPE1 + 0.05) return;
  const g = sledGirl(t), s = girlDefault();
  s.outfit = "coat"; s.seed = 2; s.sc = 0.95; s.face = 1;
  if (g.mode === "walk") {
    const f = walkFeet(GIRL_X0, g.x, 1, 78, 26);
    const ang = hillAng(g.x);
    s.lean = 0.18 + Math.max(0, -ang) * 0.4;
    s.feet = f.map(([fx, fy]) => [fx - g.x, hillY(fx) - g.y - fy]);
    const ph = ((g.x - GIRL_X0) / 78) * Math.PI;
    s.bob = -Math.abs(Math.sin(ph)) * 7;
    s.hands = [[46 + Math.sin(ph) * 12, -118], [-30, -104]];   // ближняя рука тянет верёвку назад
    s.mouth = 0.4; s.scarf = 0.5 + Math.sin(ph) * 0.2; s.sway = Math.sin(ph) * 0.5;
    s.x = g.x; s.y = g.y;
    // салазки сзади на верёвке
    const sx = g.x - 150, sy = hillY(sx);
    const hand = [g.x + (-30) * s.sc, g.y + (-104 + s.bob) * s.sc];
    drawSled(c, sx, sy, hillAng(sx), 1, [hand, [(hand[0] + sx + 70) / 2, (hand[1] + sy - 30) / 2 + 20], [sx + 72, sy - 28]]);
    drawGirl(c, s);
    return;
  }
  // сидит на салазках и мчит вниз
  const ang = g.mode === "ride" ? hillAng(g.x) : 0, sp = g.mode === "ride" ? prog(t, E.w_veselo + 0.12, T_RIDE1) : 0;
  c.save(); c.translate(g.x, g.y); c.rotate(ang);
  drawSled(c, 0, 0, 0, 1, null);
  s.x = -6; s.y = 10; s.sit = 1; s.lean = -0.08 - sp * 0.12; s.farFront = true;
  s.feet = [[86, -40], [60, -22]];
  s.hands = [[54, -72], [62, -68]];
  chalkLine(c, curve([[62 * s.sc - 6, -68 * s.sc + 10], [72, -40], [80, -30]], 4), 3, CH.white, { seed: 1405 });
  s.mouth = g.mode === "ride" ? 1 : 0.3; s.scarf = g.mode === "ride" ? 1 : 0.2; s.sway = g.mode === "ride" ? 1.4 : 0;
  drawGirl(c, s);
  c.restore();
  if (g.mode === "ride") {
    // линии скорости и снежный хвост
    for (let i = 0; i < 6; i++) {
      const yy = g.y - 30 - i * 26, len = 120 + (i % 3) * 60;
      chalkLine(c, [[g.x - 140 - i * 12, yy], [g.x - 140 - len - i * 12, yy - Math.tan(ang) * len]], 3, CH.white, { seed: 1500 + i, alpha: 0.7 * sstep(sp * 5) });
    }
    dust(c, g.x - 70, g.y - 6, E.w_veselo + 0.15, t, 40, 160, CH.white, 77);
  }
}

// ===== рука с ватой =====
const SLAPS = () => [E.w_svezh, E.w_beloy, E.w_puhl, E.w_vatoy, E.w_vse];
function handState(t) {
  const S = SLAPS(), t0 = E.w_slovno - 0.15, t1 = EN(12) + 0.35;
  if (t < t0 || t > t1 + 0.6) return null;
  // путь: влетает сверху-справа, показывает комок ваты («тороватый»), затем шлёпает по кустам
  let tip = [4500, -200], ang = 0, hold = "cotton";
  const enter = spr(springSoft, t, t0);
  tip = [lerp(4250, BUSHES[0] + 60, enter), lerp(-300, 330 + Math.sin(t * 4) * 12, enter)];
  if (t > E.w_torov - 0.1 && t < S[0] - 0.3) ang = Math.sin((t - E.w_torov) * 10) * 0.08;
  for (let i = 0; i < 5; i++) {
    const a = S[i] - 0.28, b = S[i];
    const prevX = i ? BUSHES[i - 1] + 60 : BUSHES[0] + 60;
    if (t >= a) {
      const u = prog(t, a, b);
      tip = [lerp(prevX, BUSHES[i] + 60, easeInOut(u)), lerp(330, GROUND - 150, easeIn(u))];
      if (t > b) { const r = prog(t, b, b + 0.25); tip = [BUSHES[i] + 60, lerp(GROUND - 150, 330, easeOut(r))]; }
    }
  }
  if (t > t1) tip = [tip[0] + (t - t1) * 1600, tip[1] - (t - t1) * 1800];
  return { tip, ang, hold };
}

// ===== строки мелом =====
const FONT_L = '700 60px "Caveat"', LINE_Y0 = 872, LINE_DY = 66;
const KEYCOL = { pink: CH.pink, yellow: CH.yellow, ochre: CH.ochre, white: "#ffffff", blue: CH.blue, green: CH.green };
function blockOf(n) { return CFG.blocks.findIndex((b) => b.includes(n)); }
function drawCaptions(c, t) {
  const B = CFG.blocks, lines = CFG.lines;
  for (let bi = 0; bi < B.length; bi++) {
    const first = lines[B[bi][0] - 1], nextB = B[bi + 1];
    const tOn = first.s - 0.12;
    const tOff = nextB ? lines[nextB[0] - 1].s - 0.45 : E.fin + 0.3;
    if (t < tOn || t > tOff + 0.3) continue;
    const fade = 1 - sstep(prog(t, tOff, tOff + 0.3)), smear = prog(t, tOff, tOff + 0.3) * 40;
    c.save(); c.font = FONT_L; c.textBaseline = "middle"; c.globalAlpha = fade;
    B[bi].forEach((n, li) => {
      const l = lines[n - 1], y = LINE_Y0 + li * LINE_DY;
      const widths = l.w.map((w) => c.measureText(w.t).width), sp = c.measureText(" ").width;
      const tot = widths.reduce((a, b) => a + b, 0) + sp * (l.w.length - 1);
      let x = W / 2 - tot / 2;
      l.w.forEach((w, k) => {
        const d = clamp(w.e - w.s, 0.16, 0.34), u = prog(t, w.s - 0.08, w.s - 0.08 + d);
        if (u > 0) {
          c.save(); c.beginPath(); c.rect(x - 10, y - 50, (widths[k] + 20) * u, 100); c.clip();
          c.fillStyle = w.k ? KEYCOL[w.k] : CH.white;
          c.fillText(w.t, x + smear, y);
          c.restore();
        }
        x += widths[k] + sp;
      });
    });
    c.restore();
  }
}
// тёмная «вымытая» полоса под строками
function drawBand(c, t) {
  const on = sstep(prog(t, CFG.lines[0].s - 0.5, CFG.lines[0].s)) * (1 - sstep(prog(t, E.fin + 0.2, E.fin + 0.7)));
  if (on <= 0) return;
  const g = c.createLinearGradient(0, 800, 0, 860);
  g.addColorStop(0, "rgba(20,38,30,0)"); g.addColorStop(1, `rgba(20,38,30,${0.86 * on})`);
  c.fillStyle = g; c.fillRect(0, 800, W, 60);
  c.fillStyle = `rgba(20,38,30,${0.86 * on})`; c.fillRect(0, 860, W, H - 860);
}

// заголовок мелом: пишется слева направо (u 0…1)
const TITLE = "Мама! глянь-ка из окошка…";
function drawTitle(c, x, y, size, u, ua, authSize, alpha = 1) {
  c.save(); c.globalAlpha = alpha; c.textAlign = "left"; c.textBaseline = "alphabetic";
  c.font = `700 ${size}px "Amatic SC"`;
  const w = c.measureText(TITLE).width, x0 = x - w / 2;
  c.save(); c.beginPath(); c.rect(x0 - 20, y - size * 1.1, (w + 40) * u, size * 1.5); c.clip();
  c.fillStyle = CH.white; c.fillText(TITLE, x0, y); c.restore();
  // подчёркивание волной
  const ul = []; for (let i = 0; i <= 30; i++) ul.push([x0 + (w * i) / 30, y + size * 0.16 + Math.sin(i * 0.9) * 3]);
  chalkLine(c, ul, size * 0.04, CH.yellow, { prog: sstep((u - 0.6) / 0.4), seed: 33 });
  c.font = `700 ${authSize}px "Caveat"`;
  const AU = "Афанасий Фет · 1887", aw = c.measureText(AU).width;
  c.save(); c.beginPath(); c.rect(x - aw / 2 - 10, y + size * 0.2, (aw + 20) * ua, authSize * 1.6); c.clip();
  c.fillStyle = CH.sky; c.fillText(AU, x - aw / 2, y + size * 0.22 + authSize); c.restore();
  c.restore();
  return { x0, w };
}

// ===== кадр =====
const camMat = (cam) => [cam.z, 0, 0, cam.z, W / 2 - cam.x * cam.z, H / 2 - cam.y * cam.z];
function setCam(c, cam) { c.setTransform(...camMat(cam)); }
function boardFill(c, m) {
  PAT_B.setTransform(new DOMMatrix(m));
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = PAT_B; c.fillRect(0, 0, W, H); c.restore();
}
function grain(c, pat, m) {
  pat.setTransform(new DOMMatrix(m));
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = "destination-in"; c.fillStyle = pat; c.fillRect(0, 0, W, H); c.restore();
}
function composite(layer, a = 1) {
  gl.clearRect(0, 0, 480, 270); gl.drawImage(layer, 0, 0, 480, 270);
  ctx.save(); ctx.globalAlpha = 0.22 * a; ctx.drawImage(GL, 0, 0, W, H); ctx.globalAlpha = a; ctx.drawImage(layer, 0, 0); ctx.restore();
}
const mul = (A, B) => [A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1], A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3], A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5]];

function yardState(t) {
  return {
    snow: sstep(prog(t, E.w_odelo - 0.1, E.w_pobel + 0.5)), tSnow: t,
    thermo: sstep(prog(t, E.w_vidno - 0.2, E.w_vidno + 0.3)),
    merc: 1 - spr(springSoft, t, E.w_moroz - 0.05),
    flakes: sstep(prog(t, E.w_moroz, E.w_moroz + 0.6)),
    treeSnow: 1,
    frost: sstep(prog(t, L(7) - 0.1, EN(8) + 0.1)),
    sparkle: sstep(prog(t, E.w_iney - 0.2, E.w_iney + 0.3)),
    cotton: SLAPS(),
    track: t > E.w_veselo + 0.12 ? [HILL.top[0], sledGirl(t).x] : null
  };
}
function yardView(cam) { const hw = W / 2 / cam.z; return [cam.x - hw, cam.x + hw]; }
function drawYardAll(c, t, cam) {
  drawYard(c, t, yardState(t), yardView(cam));
  drawSledScene(c, t);
  const h = handState(t);
  if (h) drawHand(c, h.tip, h.ang, 1.7, h.hold);
}

// комната со всем содержимым (в мировых координатах комнаты)
function drawRoomAll(c, t) {
  const R = { sketch: sstep(prog(t, 0.05, 1.5)), crossAlpha: 1 - sstep(prog(winZoom(t), 0.35, 0.8)), hatGone: t > T_EXIT0 + 0.3 };
  drawRoom(c, t, R);
  // дверь открывается на выходе
  const dOpen = sstep(prog(t, T_EXIT0 + 0.5, T_EXIT0 + 0.95)) * (1 - sstep(prog(t, T_EXIT1 + 0.1, T_EXIT1 + 0.5)));
  if (dOpen > 0) {
    const d = DOOR;
    chalkShape(c, [[d.x + 8, d.y + 8], [d.x + d.w - 8, d.y + 8], [d.x + d.w - 8, d.y + d.h], [d.x + 8, d.y + d.h]], CH.cream, null, 0, { seed: 90, base: 0.5 * dOpen, hatch: 0.7 * dOpen, sp: 9 });
    chalkShape(c, [[d.x, d.y], [d.x + d.w * (1 - dOpen * 0.75), d.y + 24 * dOpen], [d.x + d.w * (1 - dOpen * 0.75), d.y + d.h - 10 * dOpen], [d.x, d.y + d.h]], CH.brown, CH.ochre, 5, { seed: 91, base: 0.5, sp: 10, ang: -1.5 });
  }
  // табурет
  const st = sstep(prog(t, 0.4, 1.4));
  chalkShape(c, [[STOOL_X - 60, STOOL_TOP], [STOOL_X + 60, STOOL_TOP], [STOOL_X + 60, STOOL_TOP + 16], [STOOL_X - 60, STOOL_TOP + 16]], CH.ochre, OUT, 4, { seed: 95, base: 0.5, alpha: st });
  chalkLine(c, [[STOOL_X - 48, STOOL_TOP + 16], [STOOL_X - 56, FLOOR]], 9, CH.ochre, { seed: 96, alpha: st });
  chalkLine(c, [[STOOL_X + 48, STOOL_TOP + 16], [STOOL_X + 56, FLOOR]], 9, CH.ochre, { seed: 97, alpha: st });
  // меловая пыль: девочка одевается
  if (t > T_EXIT0 + 0.1 && t < T_EXIT0 + 1.8) { const gx = lerp(1200, 1630, easeInOut(prog(T_EXIT0 + 0.3, T_EXIT0, T_EXIT0 + 1.3))); dust(c, gx, FLOOR - 160, T_EXIT0 + 0.3, t, 34, 120, CH.white, 66); }
  // кошка на подоконнике в финале
  if (t > T_EXIT0) {
    const a = sstep(prog(t, T_EXIT0, T_EXIT0 + 0.6));
    drawCat(c, { ...catState(t, WIN.x + WIN.w - 120, WIN.y + WIN.h, 0.62, T_EXIT0 + 0.3), alpha: a });
  }
  // мама и девочка: появляются в начале
  const pop = spr(springPop, t, 0.9), pop2 = spr(springPop, t, 1.15);
  const m = roomMom(t), g = roomGirl(t);
  if (pop2 > 0.01) { m.sc *= 0.75 + 0.25 * clamp(pop2, 0, 1.2); m.alpha = (m.alpha ?? 1) * clamp(pop2 * 1.6, 0, 1); drawMom(c, m); }
  if (pop > 0.01) { g.sc *= 0.75 + 0.25 * clamp(pop, 0, 1.2); g.alpha = (g.alpha ?? 1) * clamp(pop * 1.6, 0, 1); drawGirl(c, g); }
  // облачко мысли с кошкой («вчера»)
  if (t > T_BUBBLE && t < T_BUBBLE_OUT + 0.4) {
    const k = spr(springPop, t, T_BUBBLE), out = sstep(prog(t, T_BUBBLE_OUT, T_BUBBLE_OUT + 0.3));
    const cx = 1335, cy = 330, sc = k * (1 + out * 0.25), a = 1 - out;
    // кружки-ступеньки от головы
    [[1112, 418, 9], [1140, 392, 13], [1172, 368, 18]].forEach(([x, y, r], i) => chalkShape(c, ellPts(x, y, r * k, r * k, 0, 12), null, CH.white, 3.5, { seed: 120 + i, alpha: a }));
    c.save(); c.translate(cx, cy); c.scale(sc, sc); c.translate(-cx, -cy);
    const P = cloudPts(cx, cy, 180, 118, 10, 4);
    chalkShape(c, P, BOARD, CH.white, 4.5, { seed: 125, base: 0.92 * a, hatch: 0, alpha: a });
    chalkFill(c, P, CH.white, { base: 0.05, hatch: 0.08, sp: 14, alpha: a });
    // «вчера» мелом и подоконник
    c.save(); c.globalAlpha = a; c.font = '700 40px "Caveat"'; c.fillStyle = CH.yellow; c.fillText("вчера", cx - 150, cy - 52); c.restore();
    chalkLine(c, [[cx - 140, cy + 74], [cx + 140, cy + 74]], 6, CH.ochre, { seed: 126, alpha: a });
    drawCat(c, { ...catState(t, cx - 10, cy + 72, 0.82, E.w_umyv - 0.3), alpha: a });
    c.restore();
  }
}

function renderScene(t, kind, clipX0 = 0, clipX1 = W) {
  const clip = (c) => { c.beginPath(); c.rect(clipX0, 0, clipX1 - clipX0, H); c.clip(); };
  if (kind === "yard") {
    const yc = yardCam(t), m = camMat(yc);
    ctx.save(); clip(ctx); boardFill(ctx, m);
    lw.setTransform(1, 0, 0, 1, 0, 0); lw.clearRect(0, 0, W, H);
    lw.save(); clip(lw); lw.setTransform(...m); drawYardAll(lw, t, yc); lw.restore();
    grain(lw, PAT_W, m); composite(LW);
    ctx.restore();
    return;
  }
  const rc = roomCam(t), m = camMat(rc);
  ctx.save(); clip(ctx); boardFill(ctx, m);
  // двор в окне: своя доска и свой мел
  const yc = yardCam(t);
  const wm = mul(m, [WIN.w / W, 0, 0, WIN.h / H, WIN.x, WIN.y]), ym = mul(wm, camMat(yc));
  const wr = [m[4] + WIN.x * m[0], m[5] + WIN.y * m[3], WIN.w * m[0], WIN.h * m[3]];
  ctx.save(); ctx.beginPath(); ctx.rect(...wr); ctx.clip();
  const wa = sstep(prog(t, 0.3, 1.3));
  ctx.globalAlpha = wa; boardFill(ctx, ym); ctx.fillStyle = "rgba(160,200,230,0.06)"; ctx.fillRect(...wr); ctx.globalAlpha = 1;
  ly.setTransform(1, 0, 0, 1, 0, 0); ly.clearRect(0, 0, W, H);
  ly.save(); ly.beginPath(); ly.rect(...wr); ly.clip(); ly.setTransform(...ym); drawYardAll(ly, t, yc); ly.restore();
  grain(ly, PAT_W, ym); composite(LY, sstep(prog(t, 0.6, 1.6)));   // двор в окне проявляется вслед за рамой
  ctx.restore();
  lw.setTransform(1, 0, 0, 1, 0, 0); lw.clearRect(0, 0, W, H);
  lw.save(); clip(lw); lw.setTransform(...m); drawRoomAll(lw, t); lw.restore();
  grain(lw, PAT_W, m); composite(LW);
  ctx.restore();
}

function renderAt(t) {
  BOIL = Math.floor(t * BOIL_FPS);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const wz = winZoom(t);
  if (t >= T_WIPE0 && t < T_WIPE1) {
    // губка: слева уже комната, справа ещё горка
    const u = easeInOut(prog(t, T_WIPE0, T_WIPE1)), xe = lerp(-160, W + 160, u);
    renderScene(t, "room", 0, Math.max(0, xe));
    renderScene(t, "yard", Math.max(0, xe), W);
    drawSponge(xe, t);
  } else renderScene(t, wz >= 1 ? "yard" : "room");
  // строки и заголовок
  drawBand(ctx, t);
  ls.setTransform(1, 0, 0, 1, 0, 0); ls.clearRect(0, 0, W, H);
  drawCaptions(ls, t);
  // заголовок в начале — на стене над окном (в координатах комнаты)
  if (t < E.L1 + 0.6) {
    const rc = roomCam(t); ls.save(); ls.setTransform(...camMat(rc));
    const u = sstep(prog(t, T_TITLE0, T_TITLE1)), ua = sstep(prog(t, T_TITLE1 - 0.1, T_AUTH1));
    const a = 1 - sstep(prog(t, E.L1 - 0.2, E.L1 + 0.5));
    const r = drawTitle(ls, 960, 100, 118, u, ua, 46, a);
    ls.restore();
    // рука пишет заголовок
    if (t < T_AUTH1 + 0.7) {
      const hx = r.x0 + r.w * u, hy = 100 - 30 + Math.sin(t * 22) * 8;
      const away = sstep(prog(t, T_AUTH1, T_AUTH1 + 0.6));
      handOnScreen(rc, [hx + away * 700, hy - away * 600], -0.1);
    }
  }
  // финальный заголовок
  if (t > T_FTITLE0 - 0.1) {
    const rc = roomCam(t); ls.save(); ls.setTransform(...camMat(rc));
    const u = sstep(prog(t, T_FTITLE0, T_FTITLE1)), ua = sstep(prog(t, T_FTITLE1 - 0.1, T_FTITLE1 + 0.6));
    const r = drawTitle(ls, 960, 95, 150, u, ua, 58, 1);
    ls.restore();
    if (t < T_FTITLE1 + 1.4) {
      const hx = r.x0 + r.w * u, away = sstep(prog(t, T_FTITLE1 + 0.6, T_FTITLE1 + 1.3));
      handOnScreen(rc, [hx + away * 800, 65 + Math.sin(t * 22) * 8 - away * 700], -0.1);
    }
  }
  grain(ls, PAT_S, [1, 0, 0, 1, 0, 0]);
  composite(LS);
}
// рука поверх всего — в координатах комнаты
function handOnScreen(rc, tip, ang) {
  lw.setTransform(1, 0, 0, 1, 0, 0); lw.clearRect(0, 0, W, H);
  lw.setTransform(...camMat(rc)); drawHand(lw, tip, ang, 1.0, "chalk");
  grain(lw, PAT_W, camMat(rc));
  ls.save(); ls.setTransform(1, 0, 0, 1, 0, 0); ls.drawImage(LW, 0, 0); ls.restore();
}
// губка
function drawSponge(x, t) {
  lw.setTransform(1, 0, 0, 1, 0, 0); lw.clearRect(0, 0, W, H);
  // меловые разводы за губкой
  for (let i = 0; i < 7; i++) chalkLine(lw, [[x - 40, 120 + i * 120], [x - 300 - (i % 3) * 80, 140 + i * 120 + Math.sin(i) * 20]], 50, CH.white, { seed: 1600 + i, alpha: 0.12 });
  const y = 520 + Math.sin(t * 9) * 160;
  lw.save(); lw.translate(x, y); lw.rotate(0.12 + Math.sin(t * 9) * 0.1);
  chalkShape(lw, [[-70, -150], [70, -150], [70, 150], [-70, 150]], CH.yellow, OUT, 6, { seed: 1610, base: 0.75, sp: 7 });
  chalkShape(lw, [[-70, -150], [70, -150], [70, -90], [-70, -90]], CH.brown, OUT, 5, { seed: 1611, base: 0.6, sp: 6 });
  lw.restore();
  grain(lw, PAT_W, [1, 0, 0, 1, 0, 0]); composite(LW);
  dust(ctx, x, y, T_WIPE0 + 0.2, t, 30, 150, CH.white, 55);
}

// ===== пробы: ?probe=girl|coat|sled|mom|cat|hand|cam =====
const PQ = new URLSearchParams(location.search), PROBE = PQ.get("probe");
function probe(kind) {
  const c = lw; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = BOARD; ctx.fillRect(0, 0, W, H);
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H);
  const cols = 8, rows = 4, cw = W / cols, chh = H / rows, n = cols * rows;
  const span = { girl: [E.L1 - 0.3, T_WIPE0], girl2: [T_WIPE1, T_EXIT1], sled: [T_RUN0, T_WIPE1], mom: [E.L1, T_EXIT1], cat: [E.w_umyv - 0.3, E.w_umyv + 1.6], hand: [E.w_slovno - 0.1, EN(12) + 0.5] }[kind];
  const labels = [];
  for (let k = 0; k < n; k++) {
    const t = lerp(span[0], span[1], k / (n - 1)), x0 = (k % cols) * cw, y0 = Math.floor(k / cols) * chh;
    BOIL = Math.floor(t * BOIL_FPS);
    c.save(); c.beginPath(); c.rect(x0, y0, cw, chh); c.clip();
    c.strokeStyle = "rgba(255,255,255,0.25)"; c.lineWidth = 2; c.strokeRect(x0, y0, cw, chh);
    if (kind === "girl" || kind === "girl2") {
      const s = roomGirl(t), sc = 0.62;
      c.translate(x0 + cw / 2, y0 + chh - 14); c.scale(sc, sc); s.x = 0; s.y = 0; s.sc = 1; drawGirl(c, s);
      chalkLine(c, [[-140, 0], [140, 0]], 3, CH.grey, { seed: 1 });
    } else if (kind === "mom") {
      const s = roomMom(t), sc = 0.5;
      c.translate(x0 + cw / 2, y0 + chh - 10); c.scale(sc, sc); s.x = 0; s.y = 0; s.sc = 1; s.alpha = 1; drawMom(c, s);
      chalkLine(c, [[-180, 0], [180, 0]], 3, CH.grey, { seed: 1 });
    } else if (kind === "sled") {
      const g = sledGirl(t);
      c.translate(x0 + cw / 2, y0 + chh / 2 + 40); c.scale(0.5, 0.5); c.translate(-g.x, -g.y);
      drawHill(c, t, { track: null }); drawSledScene(c, t);
    } else if (kind === "cat") {
      c.translate(x0 + cw / 2 - 20, y0 + chh - 20); c.scale(1.2, 1.2); drawCat(c, catState(t, 0, 0, 1, span[0]));
    } else if (kind === "hand") {
      const h = handState(t);
      c.translate(x0 + cw / 2, y0 + chh / 2); c.scale(0.16, 0.16); c.translate(-4300, -450);
      BUSHES.forEach((x, i) => drawBush(c, t, x, i, SLAPS()[i]));
      if (h) drawHand(c, h.tip, h.ang, 1.7, h.hold);
    }
    c.restore();
    labels.push([t, x0, y0]);
  }
  grain(c, PAT_W, [1, 0, 0, 1, 0, 0]); composite(LW);
  ctx.fillStyle = "#ff0"; ctx.font = "18px monospace"; labels.forEach(([t, x, y]) => ctx.fillText(t.toFixed(2), x + 6, y + 20));
}
// ?probe=cam — скорость камеры (px экрана за кадр)
function probeCam() {
  const c = ctx; c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = "#fff"; c.fillRect(0, 0, W, H);
  let prev = null, maxV = 0, tv = 0; const vs = [];
  for (let f = 0; f <= TOTAL * 30; f++) {
    const t = f / 30, wz = winZoom(t), cam = wz >= 1 && t < T_WIPE0 ? yardCam(t) : roomCam(t);
    if (prev && prev.kind === (wz >= 1)) { const v = Math.hypot(cam.x - prev.x, cam.y - prev.y) * cam.z + Math.abs(Math.log(cam.z / prev.z)) * 1100; vs.push([t, v]); if (v > maxV) { maxV = v; tv = t; } }
    prev = { ...cam, kind: wz >= 1 };
  }
  c.fillStyle = "#000"; c.font = "40px monospace"; c.fillText(`maxV ${maxV.toFixed(1)} px/frame at ${tv.toFixed(2)}s`, 40, 80);
  c.strokeStyle = "#c00"; c.beginPath(); vs.forEach(([t, v]) => c.lineTo(40 + (t / TOTAL) * (W - 80), 1000 - v * 8)); c.stroke();
  c.fillStyle = "#555"; c.font = "18px monospace"; for (let s = 0; s < TOTAL; s += 2) c.fillText(s, 40 + (s / TOTAL) * (W - 80), 1040);
}

function setup() {
  buildChalk();
  PAT_B = ctx.createPattern(BOARD_TILE, "repeat"); PAT_W = ctx.createPattern(GRAIN_W, "repeat"); PAT_S = ctx.createPattern(GRAIN_S, "repeat");
}
const seek = (t) => (PROBE === "cam" ? probeCam() : PROBE ? probe(PROBE) : renderAt(t));
const T_Q = PQ.has("t") ? +PQ.get("t") : 0;   // ?t=12.3 — кадр для проверки без плеера
let LAST_T = T_Q;
setup();
window.addEventListener("hf-seek", (e) => { LAST_T = e.detail.time; seek(LAST_T); });
seek(T_Q);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => seek(LAST_T));

const tl = gsap.timeline({ paused: true });
tl.set({}, {}, TOTAL);
window.__timelines = window.__timelines || {};
window.__timelines["main"] = tl;
