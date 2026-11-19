// ---------- Герой: мальчик в синем пальто, красной шапке и жёлтом шарфе ----------
// Рисуется в буфер игры. Скелет в локальных координатах: x — вперёд по взгляду, y — вверх от земли.
// Порядок слоёв: хвост шарфа, дальняя рука, дальняя нога, ближняя нога, пальто, голова, ближняя рука.
// Дальнее плечо вынесено за спину (x = −4.5), чтобы дальняя рука читалась и при опущенной руке.
const HC = {
  coat: "#2f5fd0", coatD: "#20408f", coatL: "#5f8ef0", sleeve: "#5c8cf4",
  pants: "#33385c", pantsD: "#22253f",
  boot: "#4a2a16", bootL: "#7a4a26",
  skin: "#f4c49c", skinD: "#d89a72", cheek: "#ee6a68",
  hat: "#d8323a", hatD: "#9c1f2a", hatBand: "#f6efe0",
  scarf: "#ffc93a", scarfD: "#d89a18",
  mitt: "#d8323a", mittD: "#9c1f2a",
  hair: "#6a3a1c", eye: "#1a1420",
};
const THIGH = 4.6, SHIN = 4.6, UPARM = 4.2, FOREARM = 4.0;

// поза по умолчанию: стоит, руки опущены
function poseStand(t) {
  const br = Math.sin(t * 2.4) * 0.25;
  return {
    lift: 0, hipY: 10.2 + br * 0.3, lean: 0.02,
    feet: [[-1.6, 0], [1.6, 0]],
    hands: [[-0.6, 7.6 + br], [1.0, 7.6 + br]], elbows: ["back", "back"],
    tilt: 0, mouth: "smile", eyes: "open", blush: 0.5, scarfWave: 0.3,
  };
}

// бег: фаза — функция пройденного пути, ступня в опоре стоит в точке мира (без «лунной походки»)
const STRIDE = 8;
function poseRun(dist, t, speed = 1) {
  const ph = dist / (2 * STRIDE);
  const leg = (u) => {
    u = u - Math.floor(u);
    if (u < 0.5) { const v = u / 0.5; return [STRIDE / 2 - v * STRIDE, 0]; }
    const v = (u - 0.5) / 0.5, s = v * v * (3 - 2 * v);
    return [-STRIDE / 2 + s * STRIDE, Math.sin(Math.PI * v) * 4.2 * speed];
  };
  const near = leg(ph), far = leg(ph + 0.5);
  const sw = Math.sin(ph * TAU); // >0: ближняя нога в опоре и уходит назад
  const bob = Math.abs(Math.cos(ph * TAU * 2)) * 0.7;
  return {
    lift: 0, hipY: 9.0 + bob, lean: 0.22 * speed,
    feet: [far, near],
    // руки вразнобой с ногами: ближняя рука идёт вперёд, когда ближняя нога уходит назад
    hands: [[-2.2 - sw * 3.4, 5.6 - Math.abs(sw) * 0.8], [1.2 + sw * 3.6, 5.6 - Math.abs(sw) * 0.8]], elbows: ["back", "back"],
    tilt: 0, mouth: "smile", eyes: "open", blush: 0.8, scarfWave: 1,
  };
}

// прыжок: k — 0…1 по полёту
function poseJump(k, t) {
  const h = Math.sin(Math.PI * clamp(k)) * 16;
  return {
    lift: h, hipY: 9.0, lean: 0.12,
    feet: [[-2.6, 2.6], [2.4, 3.6]],
    hands: [[-3.6, -2.4], [3.4, -3.0]], elbows: ["down", "down"],
    tilt: -0.4, mouth: "open", eyes: "open", blush: 0.8, scarfWave: 1,
  };
}

function lerpPose(a, b, u) {
  const o = Object.assign({}, u < 0.5 ? a : b);
  const L2 = (p, q) => [lerp(p[0], q[0], u), lerp(p[1], q[1], u)];
  o.lift = lerp(a.lift, b.lift, u); o.hipY = lerp(a.hipY, b.hipY, u); o.lean = lerp(a.lean, b.lean, u);
  o.feet = [L2(a.feet[0], b.feet[0]), L2(a.feet[1], b.feet[1])];
  o.hands = [L2(a.hands[0], b.hands[0]), L2(a.hands[1], b.hands[1])];
  o.tilt = lerp(a.tilt, b.tilt, u); o.blush = lerp(a.blush, b.blush, u); o.scarfWave = lerp(a.scarfWave, b.scarfWave, u);
  return o;
}

// x, y — точка на земле под героем (в единицах буфера); dir = +1 смотрит вправо, −1 — влево.
// v2: герой рисуется на отдельный холст по мелкой сетке ×3, затем кладётся в мир с тёмным контуром в 1 пиксель.
const HBOX = { w: 52, h: 68, ox: 26, oy: 62 }; // размер холста героя и где на нём точка земли (единицы)
const heroCv = document.createElement("canvas"); heroCv.width = HBOX.w * K; heroCv.height = HBOX.h * K;
const heroCtx = heroCv.getContext("2d");
function drawHero(c, x, y, P, dir, t) {
  heroCtx.clearRect(0, 0, heroCv.width, heroCv.height);
  const gx = Math.round(x * K), gy = Math.round(y * K);
  drawHeroBody(heroCtx, HBOX.ox + (x * K - gx) / K, HBOX.oy + (y * K - gy) / K, P, dir, t);
  outlined(c, heroCv, gx - HBOX.ox * K, gy - HBOX.oy * K, "#1b1226");
}

function drawHeroBody(c, x, y, P, dir, t) {
  const S = (lx, ly) => [x + lx * dir, y - ly]; // локальные → холст
  const rot = (vx, vy, a) => [vx * Math.cos(a) + vy * Math.sin(a), -vx * Math.sin(a) + vy * Math.cos(a)];
  const lift = P.lift || 0;
  const hip = [0, P.hipY + lift];
  const up = (vx, vy) => { const r = rot(vx, vy, P.lean); return [hip[0] + r[0], hip[1] + r[1]]; };
  const neck = up(0, 8.4);
  const shN = up(2.0, 7.2), shF = up(P.farSh === undefined ? -4.5 : P.farSh, 7.2); // farSh: позы, где дальняя рука тянется вперёд
  const hipN = [1.4, hip[1]], hipF = [-1.6, hip[1]];
  const INK = "#1b1226";

  // ---- нога: от бедра к щиколотке, колено вперёд; сапог с подошвой ----
  function leg(hp, foot, cPants, cBoot, cBootL, inked) {
    const ank = [foot[0], foot[1] + 2 + lift * (P.feetFollow === false ? 0 : 1)];
    const A = S(hp[0], hp[1]), B = S(ank[0], ank[1]);
    const k1 = ik(A[0], A[1], B[0], B[1], THIGH, SHIN, 1), k2 = ik(A[0], A[1], B[0], B[1], THIGH, SHIN, -1);
    const kn = P.knee === "up" ? (k1[1] < k2[1] ? k1 : k2) : (k1[0] - x) * dir > (k2[0] - x) * dir ? k1 : k2; // колено — вперёд по взгляду (сидя — вверх)
    if (inked) { line(c, A[0], A[1], kn[0], kn[1], INK, 2.7); line(c, kn[0], kn[1], kn[2], kn[3], INK, 2.7); }
    line(c, A[0], A[1], kn[0], kn[1], cPants, 2);
    line(c, kn[0], kn[1], kn[2], kn[3], cPants, 2);
    // складка на колене
    dp(c, kn[0] - 0.3 * dir, kn[1] - 0.2, mix(cPants, "#000000", 0.25), 2);
    // сапог: голенище и носок, подошва темнее, блик сверху
    const sx = kn[2], sy = kn[3];
    const bx0 = dir > 0 ? sx - 1.2 : sx - 2.8;
    if (inked) rect(c, bx0 - 0.34, sy - 0.34, 4.68, 2.68, INK);
    rect(c, bx0, sy, 4, 2, cBoot);
    ell(c, dir > 0 ? bx0 + 3.3 : bx0 + 0.7, sy + 1.1, 0.9, 0.9, cBoot);
    rect(c, bx0, sy + 1.67, 4, 0.34, "#1e120a");
    rect(c, dir > 0 ? bx0 + 0.34 : bx0 + 1.0, sy + 0.34, 2.6, 0.34, cBootL);
    rect(c, bx0, sy - 0.34, 4, 0.34, mix(cBoot, "#ffffff", 0.15)); // отворот голенища
  }
  // ---- рука: от плеча к кисти; варежка с большим пальцем и манжетой ----
  function arm(sh, hand, pref, cSleeve, cMitt, inked) {
    const A = S(sh[0], sh[1]), B = [A[0] + hand[0] * dir, A[1] + hand[1]];
    const e1 = ik(A[0], A[1], B[0], B[1], UPARM, FOREARM, 1), e2 = ik(A[0], A[1], B[0], B[1], UPARM, FOREARM, -1);
    let el;
    if (pref === "back") el = (e1[0] - x) * dir < (e2[0] - x) * dir ? e1 : e2;
    else if (pref === "front") el = (e1[0] - x) * dir > (e2[0] - x) * dir ? e1 : e2;
    else el = e1[1] > e2[1] ? e1 : e2; // "down": локоть ниже
    if (inked) { line(c, A[0], A[1], el[0], el[1], INK, 2.7); line(c, el[0], el[1], el[2], el[3], INK, 2.7); }
    line(c, A[0], A[1], el[0], el[1], cSleeve, 2);
    line(c, el[0], el[1], el[2], el[3], cSleeve, 2);
    // манжета у кисти
    const fx = el[2] - el[0], fy = el[3] - el[1], fl = Math.hypot(fx, fy) || 1;
    const cx = el[2] - fx / fl * 0.7, cy = el[3] - fy / fl * 0.7;
    disc(c, cx, cy, 1.05, "#f6efe0");
    // варежка и большой палец
    if (inked) disc(c, el[2], el[3], 1.45, INK);
    disc(c, el[2], el[3], 1.1, cMitt);
    disc(c, el[2] + 0.8 * dir, el[3] - 0.5, 0.5, cMitt);
    dp(c, el[2] - 0.5, el[3] - 0.7, mix(cMitt, "#ffffff", 0.35), 1);
    return [el[2], el[3]];
  }

  // хвост шарфа за спиной (крепится к шее): полоски и бахрома на конце
  const nk = S(neck[0] - 1, neck[1] - 0.5);
  const wv = P.scarfWave || 0;
  let prev = nk;
  for (let i = 1; i <= 5; i++) {
    const sx = nk[0] - i * 1.3 * dir, sy = nk[1] + i * (0.9 - wv * 0.6) + Math.sin(t * 9 + i * 1.3) * wv * 0.7;
    line(c, prev[0], prev[1], sx, sy, i % 2 ? HC.scarf : HC.scarfD, i > 3 ? 1.1 : 1.6);
    if (i === 5) for (let f = -1; f <= 1; f++) line(c, sx, sy, sx - 0.9 * dir, sy + 0.5 + f * 0.45, HC.scarfD, 0.34);
    prev = [sx, sy];
  }

  if (!P.farFront) arm(shF, P.hands[0], P.elbows[0], HC.coatD, HC.mittD, false);
  if (!P.legsFront) {
    leg(hipF, P.feet[0], HC.pantsD, "#2e1a0e", HC.boot, false);
    leg(hipN, P.feet[1], HC.pants, HC.boot, HC.bootL, true);
  }

  // пальто: трапеция от плеч до подола (подол закрывает верх бёдер), тень со спины, блик спереди
  const hem = P.legsFront ? -0.4 : -1.7;
  const cp = [up(-3.6, 8.2), up(2.8, 8.2), up(4.0, hem), up(-4.6, hem)].map((p) => S(p[0], p[1]));
  poly(c, cp, HC.coat);
  poly(c, [up(-3.6, 8.2), up(-2.4, 8.2), up(-3.2, hem), up(-4.6, hem)].map((p) => S(p[0], p[1])), "#2852b8");
  const fr1 = S(...up(2.6, 7.6)), fr2 = S(...up(3.7, hem + 0.3));
  line(c, fr1[0], fr1[1], fr2[0], fr2[1], HC.coatL, 0.34);
  const hemL = S(...up(-4.6, hem)), hemR = S(...up(4.0, hem));
  line(c, hemL[0], hemL[1], hemR[0], hemR[1], HC.coatD, 0.67);
  // пояс с пряжкой, пуговицы, карман
  const belt = [S(...up(-4.2, 0.8)), S(...up(3.6, 0.8))];
  line(c, belt[0][0], belt[0][1], belt[1][0], belt[1][1], "#1c3478", 0.67);
  const bk = S(...up(1.8, 0.8)); rect(c, bk[0] - 0.45, bk[1] - 0.45, 0.9, 0.9, "#f0c840");
  for (const yy of [5.6, 3.4]) { const bt = S(...up(1.9, yy)); disc(c, bt[0], bt[1], 0.42, "#f0c840"); }
  const pk = S(...up(-1.6, -0.6)); rect(c, pk[0] - 1, pk[1] - 0.2, 2, 0.34, HC.coatD);
  // шарф на шее: толстый виток с полоской
  const n1 = S(...up(-3.2, 8.5)), n2 = S(...up(2.7, 8.5));
  line(c, n1[0], n1[1], n2[0], n2[1], HC.scarf, 2.1);
  line(c, n1[0], n1[1] + 0.2, n2[0], n2[1] + 0.2, HC.scarfD, 0.5);
  if (P.legsFront) {
    leg([hipF[0] - 0.6, hipF[1] + 0.6], P.feet[0], HC.pantsD, "#2e1a0e", HC.boot, false);
    leg(hipN, P.feet[1], HC.pants, HC.boot, HC.bootL, true);
  }
  if (P.farFront) arm(shF, P.hands[0], P.elbows[0], HC.coatD, HC.mittD, true);

  // ---- голова ----
  const hc = up(0.6, 12.2);
  const H = S(hc[0], hc[1]);
  const tilt = P.tilt || 0;
  disc(c, H[0], H[1], 3.6, HC.skinD);
  disc(c, H[0] + 0.25 * dir, H[1] - 0.2, 3.35, HC.skin);
  ell(c, H[0] - 2.5 * dir, H[1] + 0.2, 1.5, 2.2, HC.hair);           // волосы на затылке
  ell(c, H[0] - 0.7 * dir, H[1] + 0.5, 0.75, 1.05, HC.skinD);         // ухо
  dp(c, H[0] - 0.7 * dir, H[1] + 0.4, "#c07a5a", 1, 2);
  const fy = H[1] + tilt * 0.5;
  // нос
  disc(c, H[0] + 3.45 * dir, fy + 0.5, 0.6, HC.skin);
  dp(c, H[0] + 3.45 * dir - (dir > 0 ? 0 : 0.34), fy + 0.9, HC.skinD, 1);
  // щека
  if ((P.blush || 0) > 0.2) { c.globalAlpha = clamp(P.blush) * 0.85; ell(c, H[0] + 1.1 * dir, fy + 1.25, 1.0, 0.55, HC.cheek); c.globalAlpha = 1; }
  // рот
  const mx = H[0] + 2.2 * dir, my = fy + 2.1;
  if (P.mouth === "open") { ell(c, mx, my, 0.8, 0.7, "#6a1622"); ell(c, mx, my + 0.35, 0.45, 0.25, "#ee7a86"); }
  else if (P.mouth === "o") { ell(c, mx + 0.2 * dir, my, 0.42, 0.55, "#6a1622"); }
  else if (P.mouth === "sad") { line(c, mx - 0.8 * dir, my + 0.3, mx, my - 0.15, "#7a1e28", 0.34); line(c, mx, my - 0.15, mx + 0.7 * dir, my + 0.3, "#7a1e28", 0.34); }
  else { line(c, mx - 0.8 * dir, my - 0.3, mx, my + 0.2, "#7a1e28", 0.34); line(c, mx, my + 0.2, mx + 0.75 * dir, my - 0.25, "#7a1e28", 0.34); }
  // шапка: купол с резинкой-вязкой, отворот, помпон
  const hx = H[0] - (0.3 - tilt * 0.8) * dir, hy = H[1] - 1.6 + tilt * 0.7;
  ell(c, hx, hy - 1.4, 4.0, 2.6, HC.hat);
  for (let i = -3; i <= 3; i++) {
    const xx = hx + i * 1.05, top = hy - 1.4 - 2.6 * Math.sqrt(Math.max(0, 1 - ((i * 1.05) / 4) ** 2)) + 0.5;
    line(c, xx, top, xx, hy - 0.1, HC.hatD, 0.34);
  }
  dp(c, hx + 1.2 * dir, hy - 3.2, "#f06a70", 2, 1);
  rect(c, hx - 4.1, hy - 0.1, 8.2, 1.2, HC.hatBand);
  for (let i = 0; i < 8; i++) dp(c, hx - 3.7 + i, hy + 0.3, "#d8ccb6", 1);
  rect(c, hx - 4.1, hy + 1.1, 8.2, 0.34, "#c8b8a0");
  // чёлка из-под шапки
  for (let i = 0; i < 3; i++) line(c, hx + (0.6 + i * 0.7) * dir, hy + 1.2, hx + (0.4 + i * 0.7) * dir, hy + 2.0 - i * 0.15, HC.hair, 0.4);
  const ppx = hx - 2.4 * dir, ppy = hy - 4.6;
  disc(c, ppx, ppy, 1.7, "#d8cfc0"); disc(c, ppx - 0.2, ppy - 0.25, 1.4, HC.hatBand);
  dp(c, ppx - 0.7, ppy - 0.9, "#ffffff", 2);
  // глаз — поверх шапки, чтобы отворот его не закрыл: белок, зрачок, блик, бровь
  const ex = H[0] + 1.7 * dir;
  const ey = Math.max(H[1] - 0.6 + tilt * 0.8, hy + 1.6);
  if (P.eyes === "closed" || P.eyes === "happy") {
    line(c, ex - 0.6, ey + 0.35, ex, ey - 0.2, HC.eye, 0.34); line(c, ex, ey - 0.2, ex + 0.6, ey + 0.35, HC.eye, 0.34);
  } else {
    ell(c, ex, ey, 0.7, 0.95, "#ffffff");
    rect(c, ex + (dir > 0 ? -0.05 : -0.45) + tilt * 0, ey - 0.6 + Math.min(0, tilt) * 0.25, 0.5, 1.2, HC.eye);
    dp(c, ex + (dir > 0 ? 0.1 : -0.3), ey - 0.5 + Math.min(0, tilt) * 0.25, "#ffffff", 1);
  }
  const sad = P.mouth === "sad";
  line(c, ex - 0.8 * dir, ey - 1.3 + (sad ? 0.3 : 0), ex + 0.7 * dir, ey - 1.45 - (sad ? 0.35 : 0), HC.hair, 0.4);

  arm(shN, P.hands[1], P.elbows[1], HC.sleeve, HC.mitt, true);
}

// тень под героем: в прыжке сжимается
function heroShadow(c, x, y, lift) {
  const k = clamp(1 - lift / 24);
  c.globalAlpha = 0.35 * k + 0.1;
  ell(c, x, y + 0.5, 5 * k + 1.5, 1.2, "#2a1a10");
  c.globalAlpha = 1;
}
