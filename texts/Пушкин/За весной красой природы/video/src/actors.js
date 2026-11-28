// ---------- Живые: птичка, глаза под зонтиками, листья, потёки, дождь, баллончики, камера ----------
// ветка под птичкой (мир): y на x ≈ 2770 — см. wall.js, точки ветки [2630,480] → [2850,476]
const PERCH = [2770, 478];
const T_PEEL = EV.ptichka + 0.12, T_FLY = EV.ptichka + 0.7;
const FLY_END = EV.E8 + 0.2;
// состояние птички во времени: x, y — центр тела; s — масштаб; flap — фаза взмаха; perched; alive 0…1
function birdState(t) {
  const st = { x: PERCH[0], y: PERCH[1] - 64, s: 1, flap: 0, perched: true, alive: 0, look: 0, hop: 0, shake: 0 };
  // ещё нарисована: проявляется вместе с весной
  st.paint = clamp(inv(EV.L1 + 0.5, EV.prirody + 0.2, t));
  if (t < T_PEEL) {
    // весной один раз оглядывается, на «Лето» подпрыгивает от радости
    st.look = 0.5 * win(t, EV.L1 + 1.6, EV.L1 + 2.4, 0.2, 0.2);
    const hp = inv(EV.leto, EV.leto + 0.45, t); st.hop = Math.sin(hp * Math.PI) * 26;
    st.y -= st.hop;
    return st;
  }
  st.alive = spr(t, T_PEEL, 0.6);
  st.shake = win(t, T_PEEL + 0.1, T_FLY - 0.05, 0.05, 0.1) * Math.sin(t * 60) * 0.12;
  if (t < T_FLY) { st.s = 1 + 0.18 * st.alive; st.y = PERCH[1] - 64 * st.s; return st; }
  st.perched = false; st.alive = 1; st.s = 1.18;
  // рывок над стеной к морю (камера летит следом), потом — плавно над морем, которое рисуют баллончики
  const ARR = EV.L7, ax = X.sea - 1050, ex = X.sea - 300, bob = Math.sin(t * 5) * 16;
  if (t < ARR) {
    const u = inv(T_FLY, ARR, t);
    st.x = lerp(PERCH[0], ax, easeIO(u));
    st.y = lerp(PERCH[1] - 64, 330, easeIO(u)) - Math.sin(u * Math.PI) * 180 + bob * u - inv(T_FLY, T_FLY + 0.25, t) * 30 + 30;
  } else {
    const u = inv(ARR, EV.L8 - 0.2, t);
    st.x = lerp(ax, ex, u);
    st.y = 330 + Math.sin(u * Math.PI) * -40 + bob;
  }
  st.flap = (t - T_FLY) * 5.2;
  if (t > EV.L8 - 0.2) {
    // «улетает»: к солнцу на горизонте, уменьшается
    const v = easeIO(inv(EV.L8 - 0.2, FLY_END + 0.6, t));
    st.x = lerp(ex, X.sea + 120, v); st.y = lerp(st.y, 470, v); st.s = lerp(1.18, 0.16, v); st.fade = 1 - inv(0.8, 1, v);
    st.flap = (t - T_FLY) * lerp(5.2, 7, v);
  }
  return st;
}
const BLUE = "#2b6ff2", BLUE_D = "#1d4fb8", BREAST = "#ff8a3d";
function birdWing(g, ang, col) {
  // крыло от плеча (0,0) назад-вверх при ang<0
  g.save(); g.rotate(ang);
  g.fillStyle = col; g.strokeStyle = P.ink; g.lineWidth = 5; g.lineJoin = "round";
  g.beginPath(); g.moveTo(6, 0); g.quadraticCurveTo(-30, -30, -86, -8); g.lineTo(-70, 2); g.lineTo(-84, 10); g.lineTo(-62, 14); g.quadraticCurveTo(-30, 22, 6, 6); g.closePath();
  g.fill(); g.stroke();
  g.strokeStyle = "rgba(27,24,48,0.45)"; g.lineWidth = 3; g.beginPath(); g.moveTo(-20, 4); g.lineTo(-62, 4); g.stroke();
  g.restore();
}
function drawBird(g, st) {
  if (st.paint <= 0) return;
  g.save(); g.translate(st.x, st.y); g.rotate(st.shake); g.scale(st.s, st.s);
  const a = (st.perched ? st.paint : 1) * (st.fade == null ? 1 : st.fade);
  if (a <= 0) { g.restore(); return; }
  g.globalAlpha *= a;
  // тень на стене — птичка «отклеилась»
  if (st.alive > 0) {
    g.save(); g.globalAlpha *= 0.32 * clamp(st.alive); g.filter = "blur(8px)"; g.fillStyle = "#1a0d08";
    const off = 16 + 18 * clamp(st.alive);
    g.beginPath(); g.ellipse(off, off * 1.2, 58, 44, 0, 0, TAU); g.fill(); g.restore();
  }
  const flapA = st.perched ? 0 : Math.sin(st.flap * TAU);
  // дальнее крыло (за телом), видно в полёте
  if (!st.perched) { g.save(); g.translate(-2, -26); birdWing(g, -0.25 - flapA * 0.9 - 0.35, BLUE_D); g.restore(); }
  // лапки: сидя — две, держатся за ветку; в полёте — поджаты под брюшком
  g.strokeStyle = P.ink; g.lineWidth = 5; g.lineCap = "round";
  if (st.perched) {
    const fy = 64;
    for (const [lx, dx] of [[-8, -4], [12, 4]]) {
      g.beginPath(); g.moveTo(lx, 34); g.lineTo(lx + dx, fy - 2); g.stroke();
      g.beginPath(); g.moveTo(lx + dx - 10, fy); g.lineTo(lx + dx + 12, fy); g.moveTo(lx + dx, fy - 2); g.lineTo(lx + dx + 4, fy + 5); g.stroke();
    }
  } else {
    g.lineWidth = 6; for (const lx of [-18, 4]) { g.beginPath(); g.moveTo(lx, 36); g.lineTo(lx - 20, 58); g.stroke(); g.beginPath(); g.moveTo(lx - 20, 58); g.lineTo(lx - 34, 56); g.moveTo(lx - 20, 58); g.lineTo(lx - 30, 66); g.stroke(); }
  }
  // хвост
  g.fillStyle = BLUE_D; g.strokeStyle = P.ink; g.lineWidth = 5; g.lineJoin = "round";
  g.beginPath(); g.moveTo(-48, -4); g.lineTo(-104, -34); g.lineTo(-96, -12); g.lineTo(-108, 4); g.lineTo(-46, 12); g.closePath(); g.fill(); g.stroke();
  // тело (с ореолом краски)
  g.save(); g.shadowColor = "rgba(43,111,242,0.6)"; g.shadowBlur = 14;
  g.fillStyle = BLUE; g.beginPath(); g.ellipse(0, 0, 62, 46, -0.12, 0, TAU); g.fill(); g.restore();
  g.save(); g.beginPath(); g.ellipse(0, 0, 62, 46, -0.12, 0, TAU); g.clip();
  g.fillStyle = BREAST; g.beginPath(); g.ellipse(26, 26, 46, 34, -0.3, 0, TAU); g.fill();
  g.fillStyle = "rgba(255,255,255,0.35)"; g.beginPath(); g.ellipse(-8, -26, 34, 12, -0.2, 0, TAU); g.fill();
  g.restore();
  g.strokeStyle = P.ink; g.lineWidth = 6; g.beginPath(); g.ellipse(0, 0, 62, 46, -0.12, 0, TAU); g.stroke();
  // клюв
  g.fillStyle = P.yellow; g.lineWidth = 5;
  g.beginPath(); g.moveTo(54, -16); g.lineTo(84, -6 + st.look * 4); g.lineTo(54, 2); g.closePath(); g.fill(); g.stroke();
  // глаз
  const ex = 30 - st.look * 6, ey = -14;
  g.fillStyle = P.white; g.beginPath(); g.arc(ex, ey, 13, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = P.ink; g.beginPath(); g.arc(ex + 4 - st.look * 9, ey + 1, 7, 0, TAU); g.fill();
  g.fillStyle = P.white; g.beginPath(); g.arc(ex + 6 - st.look * 9, ey - 2, 2.5, 0, TAU); g.fill();
  // ближнее крыло: сидя — сложено вдоль спины, в полёте машет
  g.save(); g.translate(-2, -10);
  birdWing(g, st.perched ? 0.12 : -0.15 - flapA * 0.95, BLUE);
  g.restore();
  g.restore();
}
// капли, которые птичка стряхивает
function drawShakeDrops(g, t) {
  const u = inv(T_PEEL + 0.1, T_PEEL + 0.8, t);
  if (u <= 0 || u >= 1) return;
  g.save(); g.fillStyle = P.fog;
  for (let i = 0; i < 14; i++) {
    const a = i / 14 * TAU + 0.3, d = 50 + u * (160 + hash(i) * 90);
    g.globalAlpha = 1 - u; g.beginPath(); g.arc(PERCH[0] + Math.cos(a) * d, PERCH[1] - 60 + Math.sin(a) * d + u * u * 120, 9 - u * 5, 0, TAU); g.fill();
  }
  g.restore();
}
// потёки серой краски под туманом — «дождь»
function drawFogDrips(g, t) {
  if (t < EV.L3) return;
  for (let i = 0; i < 26; i++) {
    const x = 2010 + i * 108 + hash(i) * 50, y = 690 + hash(i + 7) * 40 - (i % 3) * 120;
    const t0 = EV.L3 + 0.4 + (x - 1960) / 2900 * 1.3;
    const len = 30 + 200 * hash(i + 3) * easeOut(inv(t0, t0 + 3.2, t));
    if (t < t0) continue;
    drip(g, x, y, len, 7 + hash(i + 9) * 6, i % 2 ? P.fog : P.fogD);
  }
}
// глаза под зонтиками
function umbOffset(i, t) { // вздох среднего зонтика на «горе»
  let y = Math.sin(t * 1.7 + i * 2) * 4;
  if (i === 1) y += Math.sin(inv(EV.gore - 0.1, EV.gore + 0.7, t) * Math.PI) * 26;
  return y;
}
function drawUmbrellas(g, t, PC) {
  const bx = birdState(t).x;
  PC.umb.forEach((pc, i) => {
    const p = pc.prog(t); if (p <= 0) return;
    const oy = umbOffset(i, t), ux = pc.x + 170, uy = pc.y + 140 + oy;
    // тень лица под зонтиком
    g.save(); g.globalAlpha = 0.9 * ease(inv(0.5, 1, p));
    g.fillStyle = "#231a2a"; g.beginPath(); g.ellipse(ux, uy + 92, 104, 66, 0, 0, TAU); g.fill();
    // глаза: следят за птичкой, когда она пролетает; моргают
    const look = clamp((bx - ux) / 500, -1, 1) * (t > T_FLY ? 1 : 0);
    const down = t > T_FLY ? -0.6 : 0.5;
    const blink = (Math.abs(((t + i * 0.7) % 2.6) - 1.3) < 0.07) ? 0.15 : 1;
    for (const sx of [-34, 34]) {
      const ex = ux + sx, ey = uy + 84;
      g.fillStyle = P.white; g.beginPath(); g.ellipse(ex, ey, 20, 24 * blink, 0, 0, TAU); g.fill();
      g.fillStyle = P.ink; g.beginPath(); g.arc(ex + look * 8, ey + down * 9, 9 * Math.min(1, blink * 2), 0, TAU); g.fill();
      // грустное верхнее веко
      g.fillStyle = "#231a2a"; g.beginPath(); g.moveTo(ex - 24, ey - 30); g.lineTo(ex + 24, ey - 30); g.lineTo(ex + 24, ey - (sx < 0 ? 14 : 4)); g.lineTo(ex - 24, ey - (sx < 0 ? 4 : 14)); g.closePath(); g.fill();
    }
    g.restore();
    g.save(); g.translate(0, oy); pc.draw(g, t); g.restore();
  });
}
// листья с дыхания тучи
const MOUTH = [X.cloud - 320 + 480, 90 + 260];
function leafShape(g, s) { g.beginPath(); g.moveTo(-s, 0); g.quadraticCurveTo(-s * 0.1, -s * 0.75, s, 0); g.quadraticCurveTo(-s * 0.1, s * 0.75, -s, 0); g.closePath(); }
function drawLeaves(g, t) {
  const cols = [P.orange, P.red, P.yellow, P.rust];
  for (let i = 0; i < 26; i++) {
    const ts = EV.osen + 0.35 + i * 0.11, u = (t - ts) / 2.4;
    if (u <= 0 || u >= 1) continue;
    const x = MOUTH[0] + 20 + u * (760 + hash(i) * 520), y = MOUTH[1] + (hash(i + 4) - 0.5) * 80 + u * u * (260 + hash(i + 2) * 280) + Math.sin(u * 8 + i) * 30;
    g.save(); g.translate(x, y); g.rotate(u * (5 + hash(i) * 6) * (i % 2 ? 1 : -1)); g.globalAlpha = 1 - easeIn(inv(0.75, 1, u));
    g.fillStyle = cols[i % 4]; g.strokeStyle = P.ink; g.lineWidth = 4; g.lineJoin = "round";
    const ls = 30 + hash(i + 1) * 14; leafShape(g, ls); g.fill(); g.stroke();
    g.lineWidth = 3; g.beginPath(); g.moveTo(-ls * 1.25, 0); g.lineTo(ls * 0.8, 0); g.stroke();
    g.restore();
  }
  // струя ветра
  const w = win(t, EV.osen + 0.25, EV.E5 - 0.6, 0.2, 0.4);
  if (w > 0) {
    g.save(); g.globalAlpha = 0.7 * w; g.strokeStyle = P.white; g.lineWidth = 9; g.lineCap = "round";
    for (let k = 0; k < 4; k++) {
      const ph = (t * 1.6 + k * 0.25) % 1, x0 = MOUTH[0] + 40 + ph * 500, y0 = MOUTH[1] - 50 + k * 34;
      g.beginPath(); g.moveTo(x0, y0); g.bezierCurveTo(x0 + 80, y0 - 30, x0 + 160, y0 + 30, x0 + 240, y0); g.stroke();
    }
    g.restore();
  }
}
// дождь над зонтиками
function drawRain(g, t) {
  const w = win(t, EV.L5 - 0.2, T_FLY + 1.2, 0.3, 0.6);
  if (w <= 0) return;
  g.save(); g.strokeStyle = "rgba(200,225,255,0.85)"; g.lineWidth = 5; g.lineCap = "round"; g.globalAlpha = w;
  for (let i = 0; i < 46; i++) {
    const x = X.umb - 560 + hash(i) * 1120, sp = 900 + hash(i + 3) * 300;
    const y = ((t * sp + hash(i + 5) * 900) % 900) - 300;
    if (y > 380 && Math.abs(x - X.umb) < 520) continue; // разбиваются о зонтики
    g.beginPath(); g.moveTo(x, y); g.lineTo(x - 8, y + 40); g.stroke();
  }
  g.restore();
}
// баллончики: влетают, трясутся, рисуют, улетают
function drawCans(g, t, PC) {
  const jobs = [PC.title, PC.spring, PC.summer, PC.sun, PC.fog, PC.cloud, ...PC.umb, ...PC.seaAll, PC.fin];
  for (const pc of jobs) {
    const a = pc.t0 - 0.45, b = pc.t1 + 0.35;
    if (t < a || t > b) continue;
    const big = pc === PC.fog ? 1.45 : pc === PC.skyP || pc === PC.seaP ? 1.3 : 1;
    pc.cans.forEach((col, k) => {
      const n = pc.nozzle(Math.max(pc.t0 + 0.001, Math.min(pc.t1 - 0.001, t)), k);
      const dir = pc.cans.length === 2 && k === 0 ? -1 : 1; // левый баллончик влетает слева
      let cx = n[0] + 125 * big, cy = n[1] - 70 * big, ang = -0.45;
      if (t < pc.t0) { const u = 1 - spr(t, a, 0.4); cx += 700 * u * dir; cy -= 500 * u; ang += Math.sin(t * 38 + k) * 0.22 * clamp(inv(a + 0.15, pc.t0, t)); }
      if (t > pc.t1) { const u = easeIn(inv(pc.t1, b, t)); cx += 900 * u * dir; cy -= 700 * u; ang -= u * dir; }
      if (t >= pc.t0 && t <= pc.t1) { cx += Math.sin(t * 23 + k * 2) * 6; cy += Math.cos(t * 19 + k) * 5; drawMist(g, cx - 18 * big, cy - 6 * big, n[0], n[1], col, t + pc.x + k * 13); }
      drawCan(g, cx, cy, ang, col, big);
    });
  }
}
// ---------- камера ----------
const KEYS = () => [
  [0, 960, 470, 1.32], [2.9, 960, 510, 1.0], [EV.L1 - 0.35, 960, 510, 1.0], [EV.L1 + 0.15, 2560, 480, 1.08],
  [EV.L2 - 0.45, 2620, 470, 1.16], [EV.L2 - 0.05, 3700, 480, 1.0], [EV.proydet, 3720, 480, 1.03], [EV.proydet + 0.8, 3920, 470, 1.0],
  [EV.L3 + 0.35, 3410, 420, 0.66], [EV.E3 + 0.2, 3410, 420, 0.7], [EV.L4 + 0.1, 4850, 400, 1.0], [EV.L5 - 0.4, 4980, 430, 1.04],
  [EV.L5 + 0.1, X.umb, 560, 1.05], [EV.ptichka - 0.25, X.umb, 570, 1.16], [EV.ptichka + 0.15, PERCH[0] + 30, 450, 1.5],
  [T_FLY, PERCH[0] + 60, 450, 1.4], [EV.L7 + 0.45, X.sea, 430, 0.8], [EV.L8 + 0.2, X.sea + 20, 435, 0.83], [EV.fin - 0.3, X.sea, 455, 1.0], [TOTAL + 1, X.sea, 455, 1.0],
];
let _K = null;
function keyCam(t) {
  _K = _K || KEYS();
  for (let i = 0; i < _K.length - 1; i++) {
    const a = _K[i], b = _K[i + 1];
    if (t <= b[0]) { const u = easeIO(inv(a[0], b[0], t)); return [lerp(a[1], b[1], u), lerp(a[2], b[2], u), lerp(a[3], b[3], u)]; }
  }
  const z = _K[_K.length - 1]; return [z[1], z[2], z[3]];
}
function camAt(t) {
  const k = keyCam(t);
  const w = win(t, T_FLY - 0.1, EV.L7 + 0.25, 0.35, 0.5);
  if (w <= 0) return k;
  const b = birdState(t);
  const f = [b.x + 160, 440, lerp(1.4, 1.0, easeIO(inv(T_FLY, T_FLY + 0.8, t)))];
  return [lerp(k[0], f[0], w), lerp(k[1], f[1], w), lerp(k[2], f[2], w)];
}
