// ---------- персонажи из пластилина ----------
const PAL = {
  horse: "#d9772f", mane: "#7a3a1c", hoof: "#3b2a24", muzzle: "#eaa274", saddle: "#2f7d4f", cloth: "#d8352a", gold: "#f2c232",
  skin: "#f3c49c", cheek: "rgba(240,110,110,0.45)", shirt: "#d8352a", pants: "#2f4a8a", felt: "#5b5560", hat: "#3f6fc4", hat2: "#6b95e0",
  hair: "#e3b04b", mitt: "#3a9a5a", blouse: "#f6f0e4", boot: "#7a2f25", hare: "#e9e5dd", crow: "#3b3f4c", finch: "#e3553f", finchB: "#7d8794",
};
// выбор решения IK: локоть наружу (side) и вниз
function ikArm(ax, ay, tx, ty, l1, l2, side) {
  const a = ik2(ax, ay, tx, ty, l1, l2, 1), b = ik2(ax, ay, tx, ty, l1, l2, -1);
  const sc = (q) => side * (q.jx - ax) + 0.6 * (q.jy - ay);
  return sc(a) >= sc(b) ? a : b;
}
function limb(c, ax, ay, jx, jy, ex, ey, r1, r2, r3, hex, seed) {
  claySaus(c, ax, ay, r1, jx, jy, r2, hex, seed, { prints: 0 });
  claySaus(c, jx, jy, r2, ex, ey, r3, hex, seed + 1, { prints: 0 });
}

// ======================= КОНЬ =======================
// H: { gait: 'stand'|'walk'|'trot'|'gallop'|'slip'|'sit', s: путь, k: доля позы, head, tail, t, blink }
const HB = { shx: 80, hpx: -82, jy: -142, l1: 76, l2: 72 };
const GAITS = {
  walk:   { stride: 130, stance: 0.66, lift: 18, off: { NF: 0.25, FF: 0.75, NH: 0.0, FH: 0.5 }, bob: 3, rock: 0.01 },
  trot:   { stride: 190, stance: 0.52, lift: 30, off: { NF: 0.0, FF: 0.5, NH: 0.5, FH: 0.0 }, bob: 6, rock: 0.015 },
  gallop: { stride: 300, stance: 0.34, lift: 46, off: { NF: 0.45, FF: 0.57, NH: 0.0, FH: 0.12 }, bob: 12, rock: 0.06 },
};
function horsePose(H) {
  // тело: смещение по y, наклон вокруг центра, ноги: цели копыт
  const out = { dy: 0, rot: 0, piv: [0, -180], hooves: {} };
  const base = { NF: HB.shx + 4, FF: HB.shx - 12, NH: HB.hpx - 2, FH: HB.hpx + 12 };
  const hipX = { NF: HB.shx, FF: HB.shx - 14, NH: HB.hpx, FH: HB.hpx + 14 };
  if (H.gait in GAITS) {
    const g = GAITS[H.gait], ph = H.s / g.stride;
    out.dy = -g.bob * Math.abs(Math.sin(ph * TAU)) + g.bob * 0.5; out.rot = g.rock * Math.sin(ph * TAU);
    for (const L in base) { const f = stepFoot(H.s, g.stride, g.off[L], g.stance, g.lift); out.hooves[L] = [hipX[L] + (f.x - H.s), f.y]; }
  } else if (H.gait === "slip") {
    const k = H.k; out.dy = 26 * k; out.rot = -0.08 * k;
    out.hooves = { NF: [lerp(base.NF, 175, k), 0], FF: [lerp(base.FF, 150, k), 0], NH: [lerp(base.NH, -170, k), 0], FH: [lerp(base.FH, -150, k), 0] };
  } else if (H.gait === "rise") { // из «сидя» обратно на ноги
    const k = H.k; out.piv = [-90, -150]; out.rot = -0.42 * (1 - k); out.dy = 92 * (1 - easeOut(k));
    out.hooves = { NF: [lerp(128, base.NF, k), 0], FF: [lerp(104, base.FF, k), 0], NH: [lerp(-22, base.NH, k), 0], FH: [lerp(-6, base.FH, k), 0] };
  } else if (H.gait === "sit") {
    const k = H.k; out.piv = [-90, -150]; out.rot = -0.42 * k; out.dy = 92 * k;
    out.hooves = { NF: [lerp(175, 128, k), 0], FF: [lerp(150, 104, k), 0], NH: [lerp(-170, -22, k), 0], FH: [lerp(-150, -6, k), 0] };
  } else {
    out.hooves = { NF: [base.NF, 0], FF: [base.FF, 0], NH: [base.NH, 0], FH: [base.FH, 0] };
    out.dy = 2 * Math.sin((H.t || 0) * 2.2);
  }
  return out;
}
function horseXf(P, x, y) { // точка тела → локальные координаты с учётом наклона
  const [px, py] = P.piv, cr = Math.cos(P.rot), sr = Math.sin(P.rot), dx = x - px, dy = y - py;
  return [px + dx * cr - dy * sr, py + dx * sr + dy * cr + P.dy];
}
function horseSaddle(H) { const P = horsePose(H); return horseXf(P, -4, -240); }
function horseMuzzle(H) { const P = horsePose(H); return horseXf(P, 214, -276 + (H.head || 0) * 30); }
function drawHorse(c, x, y, dir, H, rider) {
  const P = horsePose(H), t = H.t || 0;
  c.save(); c.translate(x, y);
  const turn = H.turn ?? 1; // поворот на месте: scaleX от 1 к −1
  c.scale(dir * turn, 1); CLAYM = dir * turn < 0 ? -1 : 1;
  // тень на полу
  const shK = H.gait === "sit" ? 1.1 : 1;
  c.save(); c.scale(1 / (dir * turn), 1); floorShadow(c, 0, 4, 190 * shK * Math.abs(turn) + 40, 0.28); c.restore();
  const leg = (L, col, sd) => {
    const hip = L[1] === "F" ? [HB.shx - (L[0] === "F" ? 14 : 0), HB.jy] : [HB.hpx + (L[0] === "F" ? 14 : 0), HB.jy];
    const J = horseXf(P, hip[0], hip[1]), hv = P.hooves[L];
    const front = L[1] === "F", k = ik2(J[0], J[1], hv[0], hv[1] - 10, HB.l1, HB.l2, front ? -1 : 1);
    claySaus(c, J[0], J[1] - 10, front ? 20 : 24, k.jx, k.jy, 13, col, sd, { prints: 0 });
    claySaus(c, k.jx, k.jy, 12, k.ex, k.ey, 11, col, sd + 1, { prints: 0 });
    clayBlob(c, k.ex + 3, k.ey + 2, 16, 10, PAL.hoof, 0, sd + 2, { prints: 0, sy: 3 });
  };
  const far = "#b45f24";
  leg("FH", far, 701); leg("FF", far, 705);
  // хвост
  const sw = Math.sin(t * 3.1) * 0.25 + (H.tailK || 0);
  const t0 = horseXf(P, -128, -196), t1 = [t0[0] - 34 * Math.cos(sw) - 6, t0[1] + 34 + 10 * Math.sin(sw)], t2 = [t1[0] - 16 + 12 * Math.sin(sw * 1.5), t1[1] + 56];
  claySaus(c, t0[0], t0[1], 15, t1[0], t1[1], 17, PAL.mane, 711, { prints: 0 }); claySaus(c, t1[0], t1[1], 17, t2[0], t2[1], 10, PAL.mane, 712, { prints: 0 });
  // туловище
  c.save(); const B = horseXf(P, 0, -180); c.translate(B[0], B[1]); c.rotate(P.rot); c.translate(0, 180);
  clay(c, blob(0, -182, 128, 62, 0, 721, 0.04), PAL.horse, { seed: 721, prints: 2 });
  clayBlob(c, 88, -186, 56, 54, PAL.horse, 0, 722, { prints: 0, shadow: false });
  clayBlob(c, -86, -188, 60, 56, PAL.horse, 0, 723, { prints: 0, shadow: false });
  // шея и голова
  const hd = H.head || 0, nod = Math.sin(t * 2) * 0.03;
  c.save(); c.translate(100, -205); c.rotate(hd * 0.4 + nod); c.translate(-100, 205);
  claySaus(c, 92, -200, 40, 150, -288, 28, PAL.horse, 724, { prints: 0 });
  for (let i = 0; i < 6; i++) { const u = i / 5; clayBlob(c, lerp(84, 142, u) - 8, lerp(-222, -318, u), 15 - u * 3, 13, PAL.mane, 0.6, 730 + i, { prints: 0, shadow: false }); }
  clay(c, blob(182, -298, 54, 31, 0.5, 725, 0.04), PAL.horse, { seed: 725, prints: 0 });
  clayBlob(c, 214, -276, 27, 22, PAL.muzzle, 0.3, 726, { prints: 0, shadow: false });
  c.fillStyle = "#5a2a18"; circle(c, 226, -272, 4); c.fill();
  claySaus(c, 156, -318, 9, 166, -352, 5, PAL.horse, 727, { prints: 0 });
  clayBlob(c, 166, -330, 14, 9, PAL.mane, -0.6, 728, { prints: 0, shadow: false });
  bead(c, 178, -309, 6, H.blink ?? 1);
  c.restore();
  // попона и седло
  clay(c, lumpPoly([[-52, -232], [44, -232], [50, -170], [-58, -170]], 741, 1.5), PAL.cloth, { seed: 741, prints: 0 });
  claySaus(c, -56, -172, 5, 48, -172, 5, PAL.gold, 742, { prints: 0, shadow: false });
  clayBlob(c, -4, -236, 46, 15, PAL.saddle, 0, 743, { prints: 0 });
  c.restore();
  if (rider) rider(c, horseXf(P, -4, -244));
  leg("NH", PAL.horse, 751); leg("NF", PAL.horse, 755);
  CLAYM = 1;
  c.restore();
}

// ======================= ВАНЯ =======================
// V: { look, legs: 'stand'|'ride'|'fly', arms: [[lx,ly],[rx,ry]] (цели кистей от таза), mouth, blink, sx, sy, rot, wave }
function drawVanya(c, x, y, V) {
  c.save(); c.translate(x, y); if (V.rot) c.rotate(V.rot); c.scale(V.sx ?? 1, V.sy ?? 1);
  const look = V.look ?? 0.6, legs = V.legs ?? "stand";
  // ноги
  const legDraw = (hx, kx, ky, fx, fy, seed) => { // носок валенка — по развороту тела
    claySaus(c, hx, 0, 17, kx, ky, 15, PAL.pants, seed, { prints: 0 });
    claySaus(c, kx, ky, 15, fx, fy - 18, 14, PAL.pants, seed + 1, { prints: 0 });
    claySaus(c, fx, fy - 26, 16, fx + 7 * (V.face ?? Math.sign(look || 1)), fy - 10, 17, PAL.felt, seed + 2, { prints: 0 });
  };
  if (legs === "stand") { const st = V.step || 0; legDraw(-18, -21, 44, -22 + st, 100, 801); legDraw(18, 21, 44, 22 - st, 100, 804); }
  else if (legs === "fly") { legDraw(-18, -46, 30, -60, 74, 801); legDraw(18, 46, 30, 62, 70, 804); }
  // руки: дальняя за телом
  const SH = [[-40, -92], [40, -92]], arms = V.arms || [[-46, -8], [46, -8]];
  const armDraw = (i) => {
    const [ax, ay] = SH[i], side = i === 0 ? -1 : 1, [tx, ty] = arms[i], k = ikArm(ax, ay, tx, ty, 36, 34, side);
    claySaus(c, ax, ay, 15, k.jx, k.jy, 13, PAL.shirt, 811 + i * 3, { prints: 0 });
    claySaus(c, k.jx, k.jy, 13, k.ex, k.ey, 11, PAL.shirt, 812 + i * 3, { prints: 0 });
    clayBlob(c, k.ex, k.ey, 14, 13, PAL.mitt, 0, 813 + i * 3, { prints: 0 });
  };
  const face = V.face ?? (look >= 0 ? 1 : -1), farArm = face >= 0 ? 0 : 1;
  if (!V.armsFront) armDraw(farArm); // всадник держит поводья обеими руками перед животом — обе руки спереди
  // туловище
  clay(c, blob(0, -50, 47, 60, 0, 821, 0.04), PAL.shirt, { seed: 821, prints: 1 });
  claySaus(c, 10 + look * 8, -104, 5, 12 + look * 8, -70, 5, PAL.gold, 822, { prints: 0, shadow: false });
  claySaus(c, -44, -10, 9, 44, -10, 9, PAL.gold, 823, { prints: 0 });
  clayBlob(c, 26, 6, 7, 12, PAL.gold, 0.3, 824, { prints: 0 });
  if (legs === "ride") { // ближняя нога вдоль бока коня
    claySaus(c, 16, 0, 18, 46, 18, 15, PAL.pants, 831, { prints: 0 });
    claySaus(c, 46, 18, 15, 42, 58, 14, PAL.pants, 832, { prints: 0 });
    claySaus(c, 40, 52, 16, 50, 70, 17, PAL.felt, 833, { prints: 0 });
  }
  if (V.armsFront) armDraw(farArm);
  armDraw(1 - farArm);
  // голова
  const fx = look * 14, hb = V.headBob || 0;
  c.save(); c.translate(0, hb); if (V.headRot) { c.translate(0, -110); c.rotate(V.headRot); c.translate(0, 110); }
  if (Math.abs(look) < 0.85) clayBlob(c, -46 - look * 6, -146, 10, 13, PAL.skin, 0, 841, { prints: 0 });
  clayBlob(c, 46 - look * 6, -146, 10, 13, PAL.skin, 0, 842, { prints: 0 });
  clay(c, blob(0, -150, 47, 46, 0, 843, 0.03), PAL.skin, { seed: 843, prints: 0, gloss: 0.35 });
  clayBlob(c, fx * 0.5, -184, 40, 14, PAL.hair, 0, 844, { prints: 0, shadow: false });
  // шапка
  if (!V.noHat) {
    clayBlob(c, 0, -198, 49, 32, PAL.hat, 0, 845, { prints: 1 });
    claySaus(c, -48, -182, 12, 48, -182, 12, PAL.hat2, 846, { prints: 0 });
    clayBlob(c, 4, -236, 16, 15, "#ffffff", 0, 847, { prints: 0 });
    if (V.snowHat > 0) { c.save(); c.globalAlpha = clamp(V.snowHat, 0, 1); clayBlob(c, 0, -236 + 30 * (1 - clamp(V.snowHat, 0, 1)), 64, 34, "#ffffff", 0, 848, { prints: 0 }); c.restore(); }
  }
  // лицо
  const bl = V.blink ?? 1, ey = -150;
  c.fillStyle = PAL.cheek; circle(c, fx - 27, -130, 10); c.fill(); circle(c, fx + 27, -130, 10); c.fill();
  if (V.dizzy) { c.save(); c.strokeStyle = "#17131f"; c.lineWidth = 3; for (const s of [-1, 1]) { c.beginPath(); for (let a = 0; a < 10; a += 0.3) c.lineTo(fx + s * 16 + Math.cos(a + V.dizzy) * a * 0.8, ey + Math.sin(a + V.dizzy) * a * 0.8); c.stroke(); } c.restore(); }
  else { bead(c, fx - 16 + (V.eyeX || 0), ey, 6.5, bl); bead(c, fx + 16 + (V.eyeX || 0), ey, 6.5, bl); }
  clayBlob(c, fx + look * 5, -136, 9, 8, "#e7a982", 0, 849, { prints: 0, shadow: false });
  c.strokeStyle = "#7a2e22"; c.lineWidth = 3.5; c.lineCap = "round";
  const m = V.mouth ?? 1;
  if (m === "o") { c.fillStyle = "#7a2e22"; c.beginPath(); c.ellipse(fx, -114, 7, 9, 0, 0, TAU); c.fill(); }
  else { c.beginPath(); c.moveTo(fx - 12, -117); c.quadraticCurveTo(fx, -117 + 10 * m, fx + 12, -117); c.stroke(); }
  c.restore();
  c.restore();
}
// Ваня-лепёшка в сугробе: голова вправо. F: { flat 0..1, kick, headUp 0..1, t, stars }
function drawVanyaFlat(c, x, y, F) {
  const f = F.flat, sy = lerp(1, 0.42, f), sx = lerp(1, 1.35, f);
  c.save(); c.translate(x, y);
  // ноги: бёдра по снегу, голени вверх и дрыгают
  for (const [i, ph] of [[0, 0], [1, 1.7]]) {
    const kick = F.kick * Math.sin(F.t * 9 + ph * 2);
    const hx = -70 * sx, hy = -14 * sy, kx = -128 * sx, ky = -10, ang = -1.25 + 0.45 * kick;
    const fx = kx + Math.cos(ang + Math.PI) * -50, fy = ky + Math.sin(ang) * 50;
    claySaus(c, hx, hy - i * 4, 16 * sy + 4, kx - i * 10, ky - i * 3, 14, PAL.pants, 861 + i * 4, { prints: 0 });
    claySaus(c, kx - i * 10, ky - i * 3, 14, fx - i * 10, fy, 13, PAL.pants, 862 + i * 4, { prints: 0 });
    claySaus(c, fx - i * 10, fy + 4, 15, fx - i * 10 - 6, fy - 16, 16, PAL.felt, 863 + i * 4, { prints: 0 });
  }
  // дальняя рука раскинута в сторону от зрителя — видна над спиной
  claySaus(c, 40 * sx, -26 * sy, 12, 58 * sx, -30 * sy - 34, 10, PAL.shirt, 869, { prints: 0 }); clayBlob(c, 62 * sx, -30 * sy - 44, 13, 12, PAL.mitt, 0, 870, { prints: 0 });
  // туловище-лепёшка
  clay(c, blob(0, -30 * sy, 78 * sx, 40 * sy, 0, 873, 0.05), PAL.shirt, { seed: 873, prints: 2 });
  claySaus(c, -54 * sx, -26 * sy, 8, -40 * sx, -50 * sy, 8, PAL.gold, 874, { prints: 0, shadow: false });
  // ближняя рука раскинута к зрителю — лежит на снегу перед туловищем
  claySaus(c, 44 * sx, -18 * sy, 13, 64 * sx, 16, 11, PAL.shirt, 871, { prints: 0 }); clayBlob(c, 70 * sx, 22, 14, 10, PAL.mitt, 0, 872, { prints: 0 });
  // голова: лицом в снег; поднимает — видно лицо в профиль
  const up = F.headUp || 0, hx = 112 * sx - 6 * up, hy = -34 * sy - 16 * up;
  claySaus(c, 62 * sx, -28 * sy, 22 * sy + 6, hx - 18, hy + 8, 20, PAL.shirt, 879, { prints: 0, shadow: false }); // плечи-ворот: голова не отрывается от тела
  c.save(); c.translate(hx, hy); c.rotate(-0.25 * up);
  clay(c, blob(0, 0, 46 * lerp(sx, 1, up), 44 * lerp(sy, 1, up) * 0.9, 0, 875, 0.03), PAL.skin, { seed: 875, prints: 0 });
  clayBlob(c, -14, -30 * lerp(sy, 1, up), 48, 26 * lerp(sy, 1, up), PAL.hat, -0.3, 876, { prints: 0 });
  clayBlob(c, -46, -40 * lerp(sy, 1, up), 15, 14, "#ffffff", 0, 877, { prints: 0 });
  if (up > 0.15) {
    c.globalAlpha = clamp((up - 0.15) * 3, 0, 1);
    bead(c, 24, -4, 6, F.blink ?? 1); bead(c, 38, -2, 5, F.blink ?? 1);
    clayBlob(c, 46, 8, 8, 7, "#e7a982", 0, 878, { prints: 0, shadow: false });
    c.fillStyle = PAL.cheek; circle(c, 26, 14, 9); c.fill();
    c.strokeStyle = "#7a2e22"; c.lineWidth = 3; c.beginPath(); c.moveTo(28, 26); c.quadraticCurveTo(36, 21, 44, 25); c.stroke();
  }
  c.restore();
  // звёздочки вокруг головы
  if (F.stars > 0) {
    for (let i = 0; i < 4; i++) {
      const a = F.t * 3.4 + i * TAU / 4, sx2 = hx + Math.cos(a) * 70, sy2 = hy - 58 + Math.sin(a) * 18;
      c.save(); c.globalAlpha = F.stars; c.translate(sx2, sy2); c.rotate(a);
      const pts = []; for (let k = 0; k < 10; k++) { const r = k % 2 ? 7 : 17; pts.push([Math.cos(k * TAU / 10 - Math.PI / 2) * r, Math.sin(k * TAU / 10 - Math.PI / 2) * r]); }
      clay(c, shapeFromPts(pts), PAL.gold, { seed: 880 + i, prints: 0, shadow: false });
      c.restore();
    }
  }
  c.restore();
}

// ======================= ДЕВУШКИ =======================
// G: { sar, scarf, dots, braidSide, look, arms: [[lx,ly],[rx,ry]] от плеч-центра, feet: [[x,y],[x,y]], bob, lean, mouth, blink, finger: угол }
function drawGirl(c, x, y, G) {
  c.save(); c.translate(x, y + (G.bob || 0)); if (G.lean) c.rotate(G.lean);
  const look = G.look ?? 0, t = G.t || 0;
  // валенки под подолом
  const feet = G.feet || [[-22, 0], [22, 0]];
  for (const [i, [fx, fy]] of feet.entries()) clayBlob(c, fx, fy - 12 - (G.bob || 0), 20, 13, PAL.boot, 0, 901 + i, { prints: 0 });
  // коса за спиной/через плечо
  const bs = G.braidSide || -1, bsw = G.braidSwing || 0;
  // коса через плечо ложится на грудь: звенья идут вниз и чуть к середине, а не в воздух сбоку
  const braid = () => { let px = bs * 28, py = -272; for (let i = 0; i < 5; i++) { const nx = px - bs * 1.5 + Math.sin(bsw + i * 0.5) * i * 1.6, ny = py + 24; clayBlob(c, nx, ny, 13 - i, 14, G.hair || "#c58a3a", 0.2, 910 + i, { prints: 0, shadow: false }); px = nx; py = ny; } clayBlob(c, px + bs * 2, py + 16, 14, 9, G.ribbon || PAL.cloth, 0, 916, { prints: 0 }); };
  // руки
  const SH = [[-34, -236], [34, -236]], arms = G.arms || [[-50, -150], [50, -150]];
  const hands = [];
  const armDraw = (i) => {
    const [ax, ay] = SH[i], side = i === 0 ? -1 : 1, [tx, ty] = arms[i], k = ikArm(ax, ay, tx, ty, 48, 44, side);
    claySaus(c, ax, ay, 17, k.jx, k.jy, 14, PAL.blouse, 921 + i * 3, { prints: 0 });
    claySaus(c, k.jx, k.jy, 13, k.ex, k.ey, 11, PAL.blouse, 922 + i * 3, { prints: 0 });
    clayBlob(c, k.ex, k.ey, 12, 12, PAL.skin, 0, 923 + i * 3, { prints: 0 });
    hands[i] = [k.ex, k.ey];
    if (G.finger !== undefined && i === 1) { // указательный палец вверх, качается
      c.save(); c.translate(k.ex, k.ey - 6); c.rotate(G.finger); claySaus(c, 0, 0, 5, 0, -26, 4.5, PAL.skin, 930, { prints: 0 }); c.restore();
    }
  };
  // сарафан
  clay(c, lumpPoly([[-34, -246], [34, -246], [74, -24], [56, -10], [-56, -10], [-74, -24]], 941 + (G.seed || 0), 1.5), G.sar, { seed: 941, prints: 2, rim: 16 });
  claySaus(c, -70, -30, 7, 70, -30, 7, G.trim || PAL.cloth, 942, { prints: 0, shadow: false });
  for (let i = -2; i <= 2; i++) { c.fillStyle = "rgba(255,255,255,0.7)"; circle(c, i * 26, -62, 5); c.fill(); }
  clayBlob(c, 0, -246, 34, 14, PAL.blouse, 0, 943, { prints: 0, shadow: false });
  if (bs * look <= 0) braid();
  armDraw(0); armDraw(1);
  // голова в платке
  const fx = look * 12;
  claySaus(c, -42, -310, 15, -46, -258, 17, G.scarf, 951, { prints: 0 });
  claySaus(c, 42, -310, 15, 46, -258, 17, G.scarf, 952, { prints: 0 });
  clay(c, blob(0, -296, 41, 42, 0, 953, 0.03), PAL.skin, { seed: 953, prints: 0, gloss: 0.35 });
  clay(c, blob(0, -326, 48, 30, 0, 954, 0.04), G.scarf, { seed: 954, prints: 1 });
  c.fillStyle = "rgba(255,255,255,0.8)"; for (const [dx, dy] of [[-22, -336], [6, -344], [28, -330], [-8, -318]]) { circle(c, dx, dy, 4); c.fill(); }
  clayBlob(c, 0, -249, 13, 8, G.scarf, 0, 955, { prints: 0, shadow: false }); // узелок под подбородком
  if (bs * look > 0) braid();
  // лицо
  const bl = G.blink ?? 1;
  c.fillStyle = PAL.cheek; circle(c, fx - 22, -284, 9); c.fill(); circle(c, fx + 22, -284, 9); c.fill();
  bead(c, fx - 13 + (G.eyeX || 0), -302, 6, bl); bead(c, fx + 13 + (G.eyeX || 0), -302, 6, bl);
  if (G.brow) { c.strokeStyle = "#5a3a22"; c.lineWidth = 3; c.lineCap = "round"; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(fx + s * 7, -316 + G.brow * 1.2); c.lineTo(fx + s * 19, -318 - G.brow * 1.2); c.stroke(); } }
  clayBlob(c, fx + look * 4, -290, 6, 6, "#e7a982", 0, 956, { prints: 0, shadow: false });
  const m = G.mouth ?? 1; c.strokeStyle = "#8a2e2a"; c.lineWidth = 3; c.lineCap = "round";
  if (m === "o") { c.fillStyle = "#8a2e2a"; c.beginPath(); c.ellipse(fx, -270, 6, 8, 0, 0, TAU); c.fill(); }
  else { c.beginPath(); c.moveTo(fx - 9, -272); c.quadraticCurveTo(fx, -272 + 8 * m, fx + 9, -272); c.stroke(); }
  c.restore();
  return hands;
}

// ======================= ЗВЕРИ И ПТИЦЫ =======================
function drawHare(c, x, y, dir, hop, t) {
  // hop 0..1 — фаза прыжка; в воздухе лапы вытянуты
  const air = Math.sin(Math.PI * hop), hy = -70 * air;
  c.save(); floorShadow(c, x, y + 2, 50 * (1 - 0.4 * air), 0.25); c.translate(x, y + hy); c.scale(dir, 1); CLAYM = dir;
  claySaus(c, -6, -10, 9, -34 - 20 * air, -4 + 6 * air, 8, PAL.hare, 961, { prints: 0 });
  clay(c, blob(0, -40, 36, 26, -0.15 * air, 962, 0.05), PAL.hare, { seed: 962, prints: 1 });
  clayBlob(c, -34, -48, 11, 11, "#ffffff", 0, 963, { prints: 0 });
  claySaus(c, 24, -30, 7, 36 + 14 * air, -10 + 4 * air, 6, PAL.hare, 964, { prints: 0 });
  clay(c, blob(34, -64, 22, 19, 0, 965, 0.04), PAL.hare, { seed: 965, prints: 0 });
  const fl = 0.3 * air + 0.08 * Math.sin(t * 6);
  claySaus(c, 28, -78, 7, 18 - 30 * fl, -124 + 10 * fl, 6, PAL.hare, 966, { prints: 0 });
  claySaus(c, 38, -78, 7, 40 - 26 * fl, -122 + 12 * fl, 6, PAL.hare, 967, { prints: 0 });
  bead(c, 42, -68, 4.5, 1); c.fillStyle = "#e88a9a"; circle(c, 55, -60, 4); c.fill();
  CLAYM = 1; c.restore();
}
function drawCrow(c, x, y, dir, t, huff) {
  c.save(); c.translate(x, y); c.scale(dir, 1); CLAYM = dir;
  claySaus(c, -18, -30, 10, -50, -18 + 4 * Math.sin(t * 3), 6, PAL.crow, 971, { prints: 0 });
  clay(c, blob(0, -34, 30, 22, -0.2, 972, 0.05), PAL.crow, { seed: 972, prints: 0, gloss: 0.5 });
  c.save(); c.translate(20, -56); c.rotate(-0.35 * huff);
  clay(c, blob(0, 0, 16, 15, 0, 973, 0.04), PAL.crow, { seed: 973, prints: 0, gloss: 0.5 });
  claySaus(c, 12, 0, 6, 30, 2, 2, "#6a6a70", 974, { prints: 0, shadow: false });
  bead(c, 6, -4, 3.5, huff > 0.5 ? 0 : 1);
  c.restore();
  c.strokeStyle = "#5a4a3a"; c.lineWidth = 3; c.beginPath(); c.moveTo(-4, -14); c.lineTo(-6, 0); c.moveTo(6, -14); c.lineTo(8, 0); c.stroke();
  CLAYM = 1; c.restore();
}
function drawFinch(c, x, y, dir, flap, t, chirp = 0) {
  c.save(); c.translate(x, y); c.scale(dir, 1); CLAYM = dir;
  if (!flap) { c.strokeStyle = "#5a4a3a"; c.lineWidth = 2.5; c.lineCap = "round"; c.beginPath(); c.moveTo(-4, -4); c.lineTo(-6, 4); c.moveTo(5, -4); c.lineTo(6, 4); c.stroke(); }
  claySaus(c, -14, -16, 7, -34, -10, 4, "#2a2a33", 981, { prints: 0, shadow: false });
  clay(c, blob(0, -20, 22, 20, 0, 982, 0.04), PAL.finchB, { seed: 982, prints: 0 });
  c.save(); c.clip(blob(0, -20, 22, 20, 0, 982, 0.04).p); clayBlob(c, 10, -8, 22, 18, PAL.finch, 0, 983, { prints: 0, shadow: false }); c.restore();
  clayBlob(c, 10, -36, 13, 12, "#2a2a33", 0, 984, { prints: 0, shadow: false });
  clayBlob(c, 22, -32, 5, 4, "#3a3a40", 0, 985, { prints: 0, shadow: false });
  bead(c, 13, -38, 2.6, 1);
  const wa = flap > 0 ? Math.sin(t * 40) * 0.9 : 0.15;
  c.save(); c.translate(-4, -24); c.rotate(-0.4 - wa); clayBlob(c, -14, 0, 18, 8, "#4a5060", 0, 986, { prints: 0, shadow: false }); c.restore();
  if (chirp > 0) { c.save(); c.globalAlpha = chirp; c.strokeStyle = "#5a5a6a"; c.lineWidth = 3; c.lineCap = "round"; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(30, -36, 10 + i * 8, -0.6, 0.6); c.stroke(); } c.restore(); }
  CLAYM = 1; c.restore();
}
