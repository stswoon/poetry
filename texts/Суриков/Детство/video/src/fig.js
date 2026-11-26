// ---------- Скелет героев: FK/IK, позы. Вперёд = +x в локальных координатах, вниз = +y ----------
// угол конечности: 0 — вниз, + — вперёд (по взгляду героя)
const dirv = (a) => [Math.sin(a), Math.cos(a)];
const addv = (p, a, L) => [p[0] + Math.sin(a) * L, p[1] + Math.cos(a) * L];
// IK двухзвенной конечности. knee=true: колено вперёд (нога), иначе локоть назад-вниз (рука)
function ik2(base, target, L1, L2, knee) {
  const dx = target[0] - base[0], dy = target[1] - base[1];
  const d = clamp(Math.hypot(dx, dy), Math.abs(L1 - L2) + 0.01, L1 + L2 - 0.01);
  const ang = Math.atan2(dx, dy);
  const a1 = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
  const inner = Math.acos(clamp((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2), -1, 1));
  const bend = Math.PI - inner;
  return knee ? { a: ang + a1, b: bend } : { a: ang - a1, b: bend };
}
// смешать две позы (числа и вложенные массивы/объекты)
function blendPose(p, q, u) {
  if (typeof p === "number") return lerp(p, q, u);
  if (Array.isArray(p)) return p.map((v, i) => blendPose(v, q[i], u));
  if (p && typeof p === "object") { const o = {}; for (const k in p) o[k] = k in q ? blendPose(p[k], q[k], u) : p[k]; for (const k in q) if (!(k in o)) o[k] = q[k]; return o; }
  return u < 0.5 ? p : q;
}
// поза по ключам [[t, pose], …] с плавным переходом
function poseAt(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, p0] = keys[i], [t1, p1] = keys[i + 1];
    if (t < t1) return blendPose(p0, p1, easeIO(inv(t0, t1, t)));
  }
  return keys[keys.length - 1][1];
}

// ---------- Ребёнок сбоку ----------
// размеры при масштабе 1 (рост стоя ≈ 290 px)
const KID = { TL: 92, NECK: 10, HR: 31, UA: 44, FA: 40, TH: 50, SH: 48, MIT: 12 };
const KID_COLORS = {
  hero: { coat: C.verm, coatD: C.vermD, hat: C.fur, hatL: C.furL, boot: C.felt, bootD: C.feltD, mit: C.ochreL, mitD: C.ochre, pants: C.indigo, trim: C.white, belt: C.ochre, scarf: C.blue },
  f1: { coat: C.blue, coatD: [34, 70, 124], hat: [70, 70, 80], hatL: [130, 130, 140], boot: C.umberL, bootD: C.umber, mit: C.verm, mitD: C.vermD, pants: C.umberD, trim: C.linen, belt: C.verm, scarf: C.yel, knit: false },
  f2: { coat: C.green, coatD: [32, 90, 60], hat: C.verm, hatL: C.vermL, boot: C.feltD, bootD: C.ink, mit: C.yel, mitD: C.ochre, pants: C.umber, trim: C.linen, belt: C.yel, scarf: C.white, knit: true },
  f3: { coat: C.ochre, coatD: [160, 110, 40], hat: C.blue, hatL: C.blueL, boot: C.felt, bootD: C.feltD, mit: C.green, mitD: [32, 90, 60], pants: C.indigoD, trim: C.white, belt: C.blue, scarf: C.verm, knit: true },
};
// стандартные позы (углы); arms/legs: [ближняя, дальняя]
const KP = {
  stand: { rot: 0, lean: 0.03, head: 0, arms: [{ a: 0.15, b: 0.3 }, { a: -0.1, b: 0.3 }], legs: [{ a: 0.02, b: 0.04 }, { a: -0.02, b: 0.04 }] },
  sled: { rot: 0, lean: 0.12, head: -0.05, arms: [{ a: 0.9, b: 0.6 }, { a: 1.25, b: 0.25 }], legs: [{ a: 1.45, b: 0.35 }, { a: 1.12, b: 0.75 }] },
  wave: { rot: 0, lean: 0.06, head: 0.08, arms: [{ a: 2.05, b: 0.75 }, { a: 0.85, b: 0.6 }], legs: [{ a: 1.45, b: 0.35 }, { a: 1.12, b: 0.75 }] },
  tuck: { rot: 0, lean: 0.5, head: 0.3, arms: [{ a: 1.9, b: 1.2 }, { a: 2.6, b: 0.9 }], legs: [{ a: 1.9, b: 1.9 }, { a: 1.6, b: 1.6 }] },
  flail: { rot: 0, lean: 0.1, head: -0.2, arms: [{ a: 2.6, b: 0.4 }, { a: -2.2, b: 0.5 }], legs: [{ a: 0.9, b: 0.4 }, { a: -0.5, b: 0.6 }] },
};

function head(g, s, c, pose, front, seed) {
  // голова — круг; лицо смотрит вперёд (+x)
  const R = KID.HR;
  roughEll(g, 0, 0, R, R * 1.02, seed + 1, 0.02); paint(g, C.skin, seed + 2, 0.3, 0.35);
  // румянец и снег
  g.save(); g.globalAlpha = 0.55; roughEll(g, R * 0.42, R * 0.32, R * 0.26, R * 0.2, seed + 3, 0.1); g.fillStyle = css(C.cheek); g.fill(); g.restore();
  // глаз, рот, нос (профиль 3/4)
  const ex = R * 0.42, ey = -R * 0.1;
  g.fillStyle = css(C.ink); g.strokeStyle = css(C.ink); g.lineCap = "round";
  const eyes = pose.eyes || "open";
  if (eyes === "closed" || eyes === "happy" || (pose.blink || 0) > 0.5) {
    g.lineWidth = 3.4; g.beginPath();
    if (eyes === "happy") g.arc(ex, ey + 3, 6, Math.PI * 1.1, Math.PI * 1.9); else { g.moveTo(ex - 6, ey + 1); g.lineTo(ex + 5, ey + 1); }
    g.stroke();
  } else { g.beginPath(); g.ellipse(ex, ey, 4.2, 5.4, 0, 0, TAU); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.arc(ex + 1.4, ey - 1.8, 1.4, 0, TAU); g.fill(); }
  // бровь
  g.lineWidth = 3; g.beginPath();
  const sad = pose.mouth === "sad";
  g.moveTo(ex - 8, ey - 11 + (sad ? -3 : 0)); g.lineTo(ex + 6, ey - 12 + (sad ? 3 : 0)); g.stroke();
  // нос
  roughEll(g, R * 0.96, R * 0.08, 6, 5.5, seed + 9, 0.05); g.fillStyle = css(C.skinD); g.fill();
  // рот
  const m = pose.mouth || "smile", mx = R * 0.55, my = R * 0.5;
  g.lineWidth = 3.2; g.beginPath();
  if (m === "smile") { g.arc(mx, my - 6, 9, 0.35 * Math.PI, 0.85 * Math.PI); g.stroke(); }
  else if (m === "sad") { g.arc(mx, my + 6, 8, 1.2 * Math.PI, 1.8 * Math.PI); g.stroke(); }
  else if (m === "o") { g.ellipse(mx + 2, my, 5, 6.5, 0, 0, TAU); g.fillStyle = css(C.vermD); g.fill(); }
  else { // open / laugh
    const op = m === "laugh" ? 0.6 + 0.4 * Math.abs(Math.sin((pose.tl || 0) * 18)) : 1;
    g.moveTo(mx - 11, my - 4); g.quadraticCurveTo(mx, my + 14 * op, mx + 11, my - 5); g.closePath();
    g.fillStyle = css(C.vermD); g.fill();
  }
  // шапка-ушанка или вязаная шапка
  if (c.knit) {
    roughPoly(g, [[-R * 1.02, -R * 0.15], [-R * 0.9, -R * 0.8], [-R * 0.2, -R * 1.18], [R * 0.6, -R * 0.95], [R * 1.0, -R * 0.3], [R * 0.95, -R * 0.12]], seed + 11, 2);
    paint(g, c.hat, seed + 12, 0, 0.9);
    brush(g, [[-R * 1.02, -R * 0.2], [R * 0.98, -R * 0.2]], 11, c.hatL, seed + 13, 0.7);
    roughEll(g, -R * 0.45, -R * 1.2, 10, 10, seed + 14, 0.2); paint(g, c.hatL, seed + 15, 0, 0.7);
  } else {
    roughPoly(g, [[-R * 1.12, R * 0.55], [-R * 1.15, -R * 0.4], [-R * 0.7, -R * 1.12], [R * 0.3, -R * 1.2], [R * 0.95, -R * 0.75], [R * 1.05, -R * 0.35],
      [R * 0.2, -R * 0.42], [-R * 0.3, -R * 0.2], [-R * 0.35, R * 0.6]], seed + 11, 2.4);
    paint(g, c.hat, seed + 12, 0.4, 1);
    brush(g, [[-R * 0.35, -R * 0.42], [R * 1.05, -R * 0.52]], 15, c.hatL, seed + 13, 0.8);
  }
  // снег на лице: лоб, щека, подбородок — глаз и рот остаются видны
  if (pose.snowy > 0) {
    g.save(); g.globalAlpha = clamp(pose.snowy);
    const SP = [[-0.2, -0.45, 9, 6], [0.15, -0.5, 8, 5], [0.85, 0.15, 7, 6], [0.2, 0.75, 9, 6], [-0.5, 0.35, 8, 7], [0.95, -0.2, 5, 4]];
    SP.forEach(([u, v, rx, ry], i) => { roughEll(g, u * R, v * R, rx, ry, seed + i * 5, 0.25); paint(g, C.white, seed + i, 0, 0.4); });
    g.restore();
  }
}

// нарисовать ребёнка сбоку. (x,y) — таз на экране, s — масштаб, dir — куда смотрит (1 вправо, -1 влево)
function drawKid(g, x, y, s, dir, pose, colors, seed = 0) {
  const c = KID_COLORS[colors] || colors;
  g.save(); g.translate(x, y); g.scale(s * dir, s); g.rotate(pose.rot || 0);
  const lean = pose.lean || 0;
  const sh = [Math.sin(lean) * KID.TL, -Math.cos(lean) * KID.TL];
  const hipN = [3, 0], hipF = [-3, 0];
  const limb = (base, L, i, isLeg) => {
    const p = isLeg ? pose.legs[i] : pose.arms[i];
    const a = isLeg ? p.a : p.a + lean;
    const j = addv(base, a, isLeg ? KID.TH : KID.UA);
    const a2 = isLeg ? a - p.b : a + p.b;
    const e = addv(j, a2, isLeg ? KID.SH : KID.FA);
    return { j, e, a2 };
  };
  const drawLeg = (i, dark) => {
    const L = limb(i ? hipF : hipN, 0, i, true);
    const base = i ? hipF : hipN;
    const k = dark ? 0.82 : 1;
    brush(g, [base, L.j], 26, mix(c.pants, [0, 0, 0], 1 - k), seed + 20 + i, 0.6);
    brush(g, [L.j, L.e], 25, mix(c.boot, [0, 0, 0], 1 - k), seed + 22 + i, 0.8);
    // ступня-валенок вперёд, перпендикулярно голени
    const fa = L.a2 - Math.PI / 2 + 0.05;
    const toe = [L.e[0] - Math.sin(fa) * 0 + Math.sin(L.a2 + Math.PI / 2) * 24, L.e[1] + Math.cos(L.a2 + Math.PI / 2) * 24];
    brush(g, [[L.e[0] - Math.sin(L.a2 + Math.PI / 2) * 4, L.e[1] - Math.cos(L.a2 + Math.PI / 2) * 4], toe], 22, mix(c.bootD, [0, 0, 0], 1 - k), seed + 24 + i, 0.7);
    // подол шубки поверх бедра
    const flap = [lerp(base[0], L.j[0], 0.62), lerp(base[1], L.j[1], 0.62)];
    brush(g, [[base[0], base[1] - 8], flap], 40, mix(c.coat, [0, 0, 0], 1 - k * 0.98), seed + 26 + i, 0.7);
    brush(g, [[lerp(base[0], flap[0], 0.85), lerp(base[1], flap[1], 0.85)], flap], 14, mix(c.trim, [0, 0, 0], 1 - k), seed + 28 + i, 0.5);
    return L;
  };
  const drawArm = (i, dark) => {
    const L = limb([sh[0] + (i ? -4 : 4), sh[1] + 8], 0, i, false);
    const base = [sh[0] + (i ? -4 : 4), sh[1] + 8];
    const k = dark ? 0.8 : 1;
    const col = mix(c.coat, [0, 0, 0], 1 - k);
    brush(g, [base, L.j], 24, col, seed + 30 + i, 0.7);
    brush(g, [L.j, L.e], 21, col, seed + 32 + i, 0.7);
    // меховой обшлаг и варежка
    const cu = addv(L.e, L.a2, -5);
    brush(g, [cu, L.e], 22, mix(c.trim, [0, 0, 0], 1 - k), seed + 34 + i, 0.4);
    const m = addv(L.e, L.a2, KID.MIT * 0.8);
    roughEll(g, m[0], m[1], KID.MIT * 1.05, KID.MIT * 1.25, seed + 36 + i, 0.08, -L.a2);
    paint(g, mix(c.mit, [0, 0, 0], 1 - k), seed + 37 + i, 0, 0.6);
    if (pose.snowy > 0) { g.save(); g.globalAlpha = clamp(pose.snowy); roughEll(g, m[0], m[1], KID.MIT * 1.1, KID.MIT * 0.9, seed + 38 + i, 0.3); paint(g, C.white, seed, 0, 0.3); g.restore(); }
    return { L, hand: m };
  };
  // дальняя рука, дальняя нога, туловище, ближняя нога, голова, ближняя рука
  const farArm = drawArm(1, true);
  drawLeg(1, true);
  // туловище-шубка
  g.save(); g.rotate(lean);
  const TL = KID.TL;
  roughPoly(g, [[-24, -TL + 4], [18, -TL + 2], [28, -TL * 0.45], [30, 6], [-30, 8], [-30, -TL * 0.45]], seed + 40, 2.6);
  paint(g, c.coat, seed + 41, 1.4, 0.9);
  brush(g, [[-30, -16], [30, -16]], 12, c.belt, seed + 42, 0.6);
  brush(g, [[22, -TL + 8], [28, 4]], 10, c.trim, seed + 43, 0.5);
  // шарф/воротник
  brush(g, [[-20, -TL + 4], [20, -TL + 2]], 18, c.scarf, seed + 44, 0.6);
  g.restore();
  drawLeg(0, false);
  // голова
  g.save(); g.translate(sh[0] + Math.sin(lean) * (KID.NECK + KID.HR), sh[1] - Math.cos(lean) * (KID.NECK + KID.HR) + 6);
  g.rotate(lean * 0.6 + (pose.head || 0));
  head(g, s, c, pose, false, seed + 50);
  g.restore();
  const nearArm = drawArm(0, false);
  g.restore();
  const r = pose.rot || 0, cr = Math.cos(r), sr = Math.sin(r);
  const tw = (p) => [x + dir * s * (p[0] * cr - p[1] * sr), y + s * (p[0] * sr + p[1] * cr)];
  return { farHand: tw(farArm.hand), nearHand: tw(nearArm.hand) };
}

// ---------- Ребёнок анфас (крупно; друзья над сугробом) ----------
// pose: arms [{a,b}] — левая/правая (на экране), a: 0 вниз, + наружу; b: сгиб локтя внутрь-вверх
function drawKidFront(g, x, y, s, pose, colors, seed = 0) {
  const c = KID_COLORS[colors] || colors;
  g.save(); g.translate(x, y); g.scale(s, s); g.rotate(pose.rot || 0);
  const TL = KID.TL;
  // руки за туловищем не прячем: рисуем после шубки
  roughPoly(g, [[-34, -TL + 6], [34, -TL + 6], [44, 10], [-44, 10]], seed + 1, 3);
  paint(g, c.coat, seed + 2, 1.5, 0.9);
  brush(g, [[0, -TL + 14], [0, 8]], 12, c.trim, seed + 3, 0.5);
  brush(g, [[-42, -14], [42, -14]], 12, c.belt, seed + 4, 0.6);
  brush(g, [[-28, -TL + 6], [28, -TL + 6]], 20, c.scarf, seed + 5, 0.6);
  const hands = [];
  for (let i = 0; i < 2; i++) {
    const sg = i ? 1 : -1, p = pose.arms[i];
    const base = [sg * 34, -TL + 14];
    const a = p.a;              // от вертикали наружу
    const j = [base[0] + sg * Math.sin(a) * KID.UA, base[1] + Math.cos(a) * KID.UA];
    const a2 = a - p.b;         // локоть сгибается внутрь
    const e = [j[0] + sg * Math.sin(a2) * KID.FA, j[1] + Math.cos(a2) * KID.FA];
    brush(g, [base, j], 24, c.coat, seed + 10 + i, 0.7);
    brush(g, [j, e], 21, c.coat, seed + 12 + i, 0.7);
    brush(g, [[lerp(j[0], e[0], 0.85), lerp(j[1], e[1], 0.85)], e], 22, c.trim, seed + 14 + i, 0.4);
    const m = [e[0] + sg * Math.sin(a2) * 9, e[1] + Math.cos(a2) * 9];
    roughEll(g, m[0], m[1], 13, 15, seed + 16 + i, 0.08); paint(g, c.mit, seed + 17 + i, 0, 0.6);
    if (pose.snowy > 0) { g.save(); g.globalAlpha = clamp(pose.snowy); roughEll(g, m[0], m[1] - 2, 14, 11, seed + 18 + i, 0.3); paint(g, C.white, seed, 0, 0.3); g.restore(); }
    hands.push(m);
  }
  // голова анфас
  g.save(); g.translate(0, -TL - KID.NECK - KID.HR + 6); g.rotate(pose.head || 0);
  const R = KID.HR;
  roughEll(g, 0, 0, R * 1.05, R, seed + 20, 0.02); paint(g, C.skin, seed + 21, 0.2, 0.35);
  g.save(); g.globalAlpha = 0.5;
  roughEll(g, -R * 0.55, R * 0.3, R * 0.22, R * 0.16, seed + 22, 0.1); g.fillStyle = css(C.cheek); g.fill();
  roughEll(g, R * 0.55, R * 0.3, R * 0.22, R * 0.16, seed + 23, 0.1); g.fill(); g.restore();
  const eyes = pose.eyes || "open";
  g.fillStyle = css(C.ink); g.strokeStyle = css(C.ink); g.lineCap = "round"; g.lineWidth = 3.4;
  for (const sx of [-1, 1]) {
    const ex = sx * R * 0.38, ey = -R * 0.08;
    if (eyes === "happy" || eyes === "closed" || (pose.blink || 0) > 0.5) { g.beginPath(); if (eyes === "happy") g.arc(ex, ey + 4, 6, Math.PI * 1.1, Math.PI * 1.9); else { g.moveTo(ex - 6, ey + 1); g.lineTo(ex + 6, ey + 1); } g.stroke(); }
    else { g.beginPath(); g.ellipse(ex, ey, 4.4, 5.6, 0, 0, TAU); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.arc(ex + 1.4, ey - 2, 1.5, 0, TAU); g.fill(); g.fillStyle = css(C.ink); }
    const sad = pose.mouth === "sad";
    g.beginPath(); g.moveTo(ex + sx * 8, ey - 12); g.lineTo(ex - sx * 7, ey - 12 - (sad ? 6 : 0)); g.stroke();
  }
  roughEll(g, 0, R * 0.14, 5.5, 5, seed + 24, 0.05); g.fillStyle = css(C.skinD); g.fill();
  const m = pose.mouth || "smile", my = R * 0.5;
  g.lineWidth = 3.2; g.beginPath();
  if (m === "smile") { g.arc(0, my - 7, 10, 0.25 * Math.PI, 0.75 * Math.PI); g.stroke(); }
  else if (m === "sad") { g.arc(0, my + 7, 9, 1.2 * Math.PI, 1.8 * Math.PI); g.stroke(); }
  else { const op = m === "laugh" ? 0.6 + 0.4 * Math.abs(Math.sin((pose.tl || 0) * 18)) : 1; g.moveTo(-13, my - 4); g.quadraticCurveTo(0, my + 16 * op, 13, my - 4); g.closePath(); g.fillStyle = css(C.vermD); g.fill(); }
  if (c.knit) {
    roughPoly(g, [[-R * 1.08, -R * 0.15], [-R * 0.95, -R * 0.85], [0, -R * 1.25], [R * 0.95, -R * 0.85], [R * 1.08, -R * 0.15]], seed + 30, 2);
    paint(g, c.hat, seed + 31, 0, 0.9);
    brush(g, [[-R * 1.08, -R * 0.2], [R * 1.08, -R * 0.2]], 11, c.hatL, seed + 32, 0.7);
    roughEll(g, 0, -R * 1.3, 11, 11, seed + 33, 0.2); paint(g, c.hatL, seed + 34, 0, 0.7);
  } else {
    roughPoly(g, [[-R * 1.2, R * 0.65], [-R * 1.22, -R * 0.45], [-R * 0.8, -R * 1.15], [R * 0.8, -R * 1.15], [R * 1.22, -R * 0.45], [R * 1.2, R * 0.65],
      [R * 0.9, R * 0.6], [R * 0.95, -R * 0.35], [-R * 0.95, -R * 0.35], [-R * 0.9, R * 0.6]], seed + 30, 2.4);
    paint(g, c.hat, seed + 31, 0.4, 1);
    brush(g, [[-R * 1.15, -R * 0.45], [R * 1.15, -R * 0.45]], 16, c.hatL, seed + 32, 0.8);
  }
  if (pose.snowy > 0) {
    g.save(); g.globalAlpha = clamp(pose.snowy);
    const SP = [[-0.55, -0.42, 9, 6], [0.1, -0.5, 10, 5], [0.6, -0.45, 7, 5], [-0.8, 0.25, 7, 8], [0.82, 0.3, 8, 8], [-0.35, 0.82, 9, 6], [0.3, 0.85, 8, 6], [0, 0.95, 6, 4]];
    SP.forEach(([u, v, rx, ry], i) => { roughEll(g, u * R, v * R, rx, ry, seed + i * 5, 0.25); paint(g, C.white, seed + i, 0, 0.4); });
    g.restore();
  }
  g.restore();
  g.restore();
  return hands;
}

// где окажется варежка ближней руки (без рисования) — для верёвки и предметов в руке
function drawKidHandOnly(x, y, s, dir, pose) {
  const lean = pose.lean || 0;
  const sh = [Math.sin(lean) * KID.TL, -Math.cos(lean) * KID.TL];
  const p = pose.arms[0], base = [sh[0] + 4, sh[1] + 8];
  const a = p.a + lean, j = addv(base, a, KID.UA), a2 = a + p.b, e = addv(j, a2, KID.FA), m = addv(e, a2, KID.MIT * 0.8);
  const r = pose.rot || 0, cr = Math.cos(r), sr = Math.sin(r);
  return [x + dir * s * (m[0] * cr - m[1] * sr), y + s * (m[0] * sr + m[1] * cr)];
}
