// ---------- герои мелом ----------
// Все герои рисуются «лицом вправо» в своих координатах: начало — земля под ногами, y вверх отрицательный.
// face = −1 отражает героя целиком. Руки и ноги — двухзвенная IK; цели задаются в тех же координатах.
const rot = (p, a) => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const LWD = 5;           // толщина контура при масштабе 1
const OUT = CH.white;   // цвет контура

function limb(c, a, tgt, l1, l2, bend, col, w, seed) {
  const k = ik(a, tgt, l1, l2, bend);
  chalkLine(c, [a, k.mid, k.end], w, col, { seed, jit: 0.9 });
  return k;
}
function mitten(c, p, r, col, seed, ang = 0) {
  chalkShape(c, ellPts(p[0], p[1], r, r * 0.85, ang, 14), col, OUT, 3.2, { seed, sp: 5, lw: 2.4, base: 0.55 });
}
function shoe(c, ank, col, seed, dir = 1, len = 30, ht = 15) {
  // подошва ровно на уровне ank.y + ht*0.8; носок по направлению dir
  const g = ank[1] + ht * 0.8, x = ank[0];
  const P = [[x - 8 * dir, ank[1] - 2], [x + 8 * dir, ank[1] - 1], [x + (len - 4) * dir, g - 9], [x + len * dir, g - 3], [x + (len - 2) * dir, g], [x - 10 * dir, g], [x - 11 * dir, g - 6]];
  chalkShape(c, curve(P, 3, true), col, OUT, 3.4, { seed, sp: 5, lw: 2.5, base: 0.5 });
}

// ===== девочка =====
// s: {x, y, face, sc, outfit:'gown'|'coat', lean, bob, feet:[far, near] (точки на земле), hands:[far, near],
//     look, tilt, mouth (0 улыбка … 1 «о!»), blink (0…1), sway (косички), sit (0/1), seed}
function girlDefault() {
  return { x: 0, y: 0, face: 1, sc: 1, outfit: "gown", lean: 0, bob: 0, feet: [[-14, 0], [14, 0]], hands: [[-36, -110], [36, -110]],
           look: 0, tilt: 0, mouth: 0, blink: 0, sway: 0, sit: 0, seed: 1, hipX: 0, scarf: 0, alpha: 1 };
}
function drawGirl(c, s) {
  const sd = s.seed * 100, coat = s.outfit === "coat";
  c.save(); c.translate(s.x, s.y); c.scale(s.sc * s.face, s.sc);
  const ga0 = GA; GA *= s.alpha ?? 1;
  if (s.jump > 0) { const k = 1 - s.jump / 120; c.save(); c.globalAlpha = 0.35; c.fillStyle = "#13261d"; c.beginPath(); c.ellipse(0, 2, 46 * k, 9 * k, 0, 0, TAU); c.fill(); c.restore(); }
  const H = [s.hipX || 0, -100 + s.bob + (s.sit ? 46 : 0)];
  const T = (p) => add(H, rot(p, s.lean));           // точка туловища → локальная
  const N = T([0, -95]);
  const shF = T([-5, -86]), shN = T([6, -84]);
  const hipF = T([-7, 0]), hipN = T([7, 0]);
  const legCol = coat ? CH.violet : CH.skin, shoeCol = coat ? CH.brown : CH.pink;
  const ank = (f) => [f[0], f[1] - 12];
  const handCol = coat ? CH.red : CH.skin;
  // дальняя рука — за туловищем, но кисть выглядывает (farFront — рука перед грудью, рисуется поверх туловища)
  const farArm = () => { const k = limb(c, shF, s.hands[0], 44, 42, 1, coat ? CH.red : CH.skin, coat ? 15 : 10, sd + 1); mitten(c, k.end, 10, handCol, sd + 2); };
  if (!s.farFront) farArm();
  // косичка дальняя (за головой)
  const head = T([8, -140]), tilt = s.lean * 0.4 + s.tilt;
  const hp = (p) => add(head, rot(p, tilt));
  const tail = (root, side, sw) => {
    const P = [root, add(root, [-10 - sw * 6, 22]), add(root, [-16 - sw * 14, 46]), add(root, [-14 - sw * 22, 66])];
    chalkLine(c, curve(P, 4), 13, CH.hair, { seed: sd + side, jit: 0.8 });
    chalkLine(c, curve(P, 4), 3, CH.ochre, { seed: sd + side + 5, jit: 0.6, alpha: 0.8 });
    const b = add(root, [-6 - sw * 3, 12]);
    chalkShape(c, [[b[0] - 14, b[1] - 9], [b[0], b[1]], [b[0] - 14, b[1] + 9]], CH.pink, CH.pink, 3, { seed: sd + side + 7, base: 0.7 });
    chalkShape(c, [[b[0] + 14, b[1] - 9], [b[0], b[1]], [b[0] + 14, b[1] + 9]], CH.pink, CH.pink, 3, { seed: sd + side + 8, base: 0.7 });
  };
  if (!coat || true) tail(hp([-30, 4]), 30, s.sway);
  // ноги
  const bendLeg = -1;
  if (s.sit) {
    limb(c, hipF, ank(s.feet[0]), 50, 48, bendLeg, legCol, 13, sd + 3); shoe(c, ank(s.feet[0]), shoeCol, sd + 4);
    limb(c, hipN, ank(s.feet[1]), 50, 48, bendLeg, legCol, 13, sd + 5); shoe(c, ank(s.feet[1]), shoeCol, sd + 6);
  } else {
    limb(c, hipF, ank(s.feet[0]), 50, 50, bendLeg, legCol, 13, sd + 3); shoe(c, ank(s.feet[0]), shoeCol, sd + 4);
    limb(c, hipN, ank(s.feet[1]), 50, 50, bendLeg, legCol, 13, sd + 5); shoe(c, ank(s.feet[1]), shoeCol, sd + 6);
  }
  // туловище
  if (coat) {
    const P = [[-24, -96], [22, -96], [32, -50], [34, -10], [50, 30], [0, 36], [-46, 30], [-34, -10], [-30, -50]].map(T);
    chalkShape(c, curve(P, 3, true), CH.red, OUT, LWD, { seed: sd + 9, sp: 7, ang: -1.1 });
    chalkLine(c, [T([20, -80]), T([24, -20]), T([30, 26])], 3, OUT, { seed: sd + 10, alpha: 0.7 });
    for (let i = 0; i < 3; i++) chalkDot(c, ...T([28, -66 + i * 26]), 4.5, CH.yellow);
    // шарф: петля на шее и конец, который полощется
    const sc0 = T([0, -92]);
    chalkShape(c, curve([T([-26, -98]), T([24, -100]), T([26, -82]), T([-24, -80])], 3, true), CH.yellow, OUT, 4, { seed: sd + 11, sp: 6, ang: 0.4, base: 0.55 });
    const fl = s.scarf;
    const end = [sc0, add(sc0, [-26, 14 + fl * -10]), add(sc0, [-54 - fl * 20, 26 - fl * 22 + Math.sin(fl * 9 + s.seed) * 6]), add(sc0, [-78 - fl * 38, 36 - fl * 30])];
    chalkLine(c, curve(end, 4), 16, CH.yellow, { seed: sd + 12, jit: 0.8 });
  } else {
    const P = [[-22, -96], [22, -96], [30, -62], [56, 66], [28, 72], [0, 68], [-30, 72], [-56, 66], [-32, -62]].map(T);
    chalkShape(c, curve(P, 3, true), CH.sky, OUT, LWD, { seed: sd + 9, sp: 8, ang: -1.1 });
    for (let i = 0; i < 5; i++) chalkDot(c, ...T([-26 + i * 13, 40 + (i % 2) * 8]), 3.5, CH.pink, 0.9);
    chalkLine(c, curve([T([-18, -94]), T([0, -84]), T([18, -94])], 4), 3, OUT, { seed: sd + 13 });
  }
  if (s.farFront) farArm();
  // ближняя рука
  const kn = limb(c, shN, s.hands[1], 44, 42, 1, coat ? CH.red : CH.skin, coat ? 15 : 10, sd + 14);
  mitten(c, kn.end, 10, handCol, sd + 15);
  // голова
  chalkShape(c, ellPts(head[0], head[1], 46, 44, tilt, 30), CH.skin, OUT, LWD, { seed: sd + 16, sp: 14, base: 0.88, hatch: 0.12, lw: 2.2 });
  // волосы: шапочка сзади и чёлка
  if (!coat) {
    const hair = [hp([-46, 4]), hp([-48, -22]), hp([-30, -44]), hp([0, -50]), hp([26, -44]), hp([40, -30]), hp([30, -24]), hp([14, -30]), hp([0, -24]), hp([-12, -30]), hp([-24, -12]), hp([-36, 10])];
    chalkShape(c, curve(hair, 3, true), CH.hair, CH.ochre, 3.5, { seed: sd + 17, sp: 6, ang: 0.6, base: 0.55 });
  } else {
    const hat = [hp([-50, 6]), hp([-50, -24]), hp([-30, -48]), hp([2, -54]), hp([30, -44]), hp([46, -22]), hp([44, -12]), hp([-40, -6])];
    chalkShape(c, curve(hat, 3, true), CH.blue, OUT, 4, { seed: sd + 17, sp: 6, ang: 1.2, base: 0.55 });
    chalkLine(c, [hp([-48, -8]), hp([44, -16])], 9, CH.white, { seed: sd + 18 });
    const pom = hp([-26, -56]);
    chalkShape(c, ellPts(pom[0], pom[1], 16, 15, 0, 14), CH.white, OUT, 3, { seed: sd + 19, sp: 4, base: 0.7 });
    // ушко шапки
    chalkShape(c, [hp([-42, -6]), hp([-22, -6]), hp([-30, 22])], CH.blue, OUT, 3.5, { seed: sd + 20, base: 0.6 });
  }
  // лицо (3/4 вправо)
  const look = s.look * 4;
  const eye = (p, r) => {
    const q = hp([p[0] + look, p[1]]);
    if (s.blink > 0.5) chalkLine(c, [[q[0] - r * 1.4, q[1]], [q[0], q[1] + r * 0.6], [q[0] + r * 1.4, q[1]]], 3, OUT, { seed: sd + 21 });
    else chalkDot(c, q[0], q[1], r, OUT);
  };
  eye([8, -6], 5); eye([30, -8], 5.5);
  chalkFill(c, ellPts(...hp([2, 12]), 9, 6, 0, 12), CH.pink, { base: 0.6, hatch: 0.5, sp: 4, lw: 2 });
  chalkFill(c, ellPts(...hp([38, 10]), 7, 5, 0, 12), CH.pink, { base: 0.6, hatch: 0.5, sp: 4, lw: 2 });
  chalkDot(c, ...hp([44, 4]), 3, CH.red, 0.8);
  const m = clamp(s.mouth, 0, 1), mc = hp([24, 20]);
  if (m < 0.15) chalkLine(c, curve([[mc[0] - 9, mc[1] - 2], [mc[0], mc[1] + 4], [mc[0] + 9, mc[1] - 3]], 3), 3, OUT, { seed: sd + 22 });
  else chalkShape(c, ellPts(mc[0], mc[1] + 2, 6 + m * 2, 3 + m * 7, 0, 12), CH.red, OUT, 2.6, { seed: sd + 22, base: 0.8, sp: 3 });
  // ближняя косичка — из-под волос на затылке, ложится за плечо
  tail(hp([-38, 14]), 40, s.sway * 0.8);
  GA = ga0; c.restore();
}

// ===== мама =====
// s: {x, y, face, sc, lean, feet:[far, near] (x на полу), hands:[far, near], cup (0/1), tilt, look, mouth, blink, smile, hat (0…1)}
function momDefault() {
  return { x: 0, y: 0, face: 1, sc: 1, lean: 0, feet: [-12, 14], step: 0, hands: [[30, -210], [40, -200]], cup: 1, tilt: 0, look: 0, mouth: 0, blink: 0, seed: 7, sway: 0, alpha: 1 };
}
function drawMom(c, s) {
  const sd = s.seed * 100;
  c.save(); c.translate(s.x, s.y); c.scale(s.sc * s.face, s.sc); const ga0 = GA; GA *= s.alpha ?? 1;
  const H = [0, -200];
  const T = (p) => add(H, rot(p, s.lean));
  const shF = T([-8, -140]), shN = T([8, -138]);
  // дальняя рука (farFront — перед туловищем)
  const farArm = () => { const k = limb(c, shF, s.hands[0], 64, 60, 1, CH.violet, 14, sd + 1); mitten(c, k.end, 11, CH.skin, sd + 2); };
  if (!s.farFront) farArm();
  // туфли выглядывают из-под юбки; при шаге — по очереди
  shoe(c, [s.feet[0], -14 - Math.max(0, s.step) * 10], CH.brown, sd + 3, 1, 34, 16);
  shoe(c, [s.feet[1], -14 - Math.max(0, -s.step) * 10], CH.brown, sd + 4, 1, 34, 16);
  // юбка до пола
  const sw = s.sway * 10;
  const skirt = [T([-34, 0]), T([34, 0]), [62 + sw, -26], [70 + sw, -12], [30, -8], [0, -12], [-30, -8], [-66 + sw, -12], [-58 + sw, -26]];
  chalkShape(c, curve(skirt, 3, true), CH.deep, OUT, LWD, { seed: sd + 5, sp: 8, ang: -1.2 });
  // фартук
  const ap = [T([14, -6]), T([40, -2]), [58 + sw, -40], [26 + sw * 0.6, -36]];
  chalkShape(c, curve(ap, 3, true), CH.white, OUT, 3, { seed: sd + 6, sp: 9, ang: 0.4, base: 0.25, hatch: 0.45 });
  // кофта
  const top = [[-30, -146], [26, -146], [34, -100], [36, 0], [-34, 0], [-36, -100]].map(T);
  chalkShape(c, curve(top, 3, true), CH.pink, OUT, LWD, { seed: sd + 7, sp: 7, ang: -0.9 });
  // шаль на плечах
  const sh = [[-36, -150], [30, -152], [40, -118], [10, -96], [-40, -108]].map(T);
  chalkShape(c, curve(sh, 3, true), CH.violet, OUT, 4, { seed: sd + 8, sp: 6, ang: 0.9, base: 0.45 });
  // голова
  const head = T([10, -186]), tilt = s.lean * 0.5 + s.tilt, hp = (p) => add(head, rot(p, tilt));
  chalkLine(c, [T([4, -150]), hp([0, 30])], 14, CH.skin, { seed: sd + 9 });
  chalkShape(c, ellPts(head[0], head[1], 38, 42, tilt, 28), CH.skin, OUT, LWD, { seed: sd + 10, sp: 14, base: 0.88, hatch: 0.12, lw: 2.2 });
  // волосы с пучком
  const hair = [hp([-40, 12]), hp([-42, -20]), hp([-22, -44]), hp([8, -46]), hp([32, -32]), hp([38, -16]), hp([22, -24]), hp([0, -22]), hp([-20, -10]), hp([-28, 16])];
  chalkShape(c, curve(hair, 3, true), CH.brown, OUT, 3.5, { seed: sd + 11, sp: 6, ang: 0.7, base: 0.6 });
  const bun = hp([-36, -36]);
  chalkShape(c, ellPts(bun[0], bun[1], 20, 18, 0, 16), CH.brown, OUT, 3.5, { seed: sd + 12, sp: 5, base: 0.6 });
  if (s.hat > 0.01) {
    const hy = lerp(-90, 0, easeOut(s.hat));
    const hat = [hp([-46, -10 + hy]), hp([-40, -40 + hy]), hp([-10, -58 + hy]), hp([24, -50 + hy]), hp([42, -24 + hy]), hp([42, -12 + hy])];
    chalkShape(c, curve(hat, 3, true), CH.green, OUT, 4, { seed: sd + 13, sp: 6, ang: 1.1, base: 0.55 });
    chalkLine(c, [hp([-46, -12 + hy]), hp([42, -14 + hy])], 9, CH.white, { seed: sd + 14 });
  }
  const look = s.look * 4;
  const eye = (p) => {
    const q = hp([p[0] + look, p[1]]);
    if (s.blink > 0.5 || s.smileEyes) chalkLine(c, curve([[q[0] - 6, q[1] + 1], [q[0], q[1] - 3], [q[0] + 6, q[1] + 1]], 3), 3, OUT, { seed: sd + 15 });
    else chalkDot(c, q[0], q[1], 4.2, OUT);
  };
  eye([6, -4]); eye([26, -6]);
  chalkFill(c, ellPts(...hp([30, 12]), 6, 4, 0, 12), CH.pink, { base: 0.55, hatch: 0.4, sp: 4, lw: 2 });
  chalkDot(c, ...hp([38, 4]), 3, CH.red, 0.7);
  const m = clamp(s.mouth, 0, 1), mc = hp([22, 20]);
  if (m < 0.15) chalkLine(c, curve([[mc[0] - 10, mc[1] - 3], [mc[0], mc[1] + 4], [mc[0] + 9, mc[1] - 3]], 3), 3, OUT, { seed: sd + 16 });
  else chalkShape(c, ellPts(mc[0], mc[1] + 2, 6 + m * 2, 3 + m * 6, 0, 12), CH.red, OUT, 2.6, { seed: sd + 16, base: 0.8, sp: 3 });
  if (s.farFront) farArm();
  // ближняя рука
  const kn = limb(c, shN, s.hands[1], 64, 60, 1, CH.violet, 14, sd + 17);
  mitten(c, kn.end, 11, CH.skin, sd + 18);
  if (s.cup) {
    const h = kn.end;
    chalkShape(c, [[h[0] - 4, h[1] - 26], [h[0] + 26, h[1] - 26], [h[0] + 22, h[1] + 4], [h[0], h[1] + 4]], CH.white, OUT, 3, { seed: sd + 19, base: 0.4, sp: 5 });
    chalkLine(c, ellPts(h[0] + 28, h[1] - 12, 8, 9, 0, 10, -1.6, 1.6), 3, OUT, { seed: sd + 20 });
    const st = s.steam || 0;
    for (let i = 0; i < 2; i++) {
      const x0 = h[0] + 6 + i * 10, P = [];
      for (let k = 0; k < 6; k++) P.push([x0 + Math.sin(st * 3 + k * 1.2 + i) * 5, h[1] - 32 - k * 9]);
      chalkLine(c, P, 2.5, OUT, { seed: sd + 21 + i, alpha: 0.5 });
    }
  }
  GA = ga0; c.restore();
}

// ===== кошка (сидит боком, лицом вправо) =====
// s: {x, y, sc, face, wash (0…1 фаза умывания), wag, blink, lick (лапа у рта 0/1)}
function drawCat(c, s) {
  const sd = 900;
  c.save(); c.translate(s.x, s.y); c.scale(s.sc * (s.face || 1), s.sc); const ga0 = GA; GA *= s.alpha ?? 1;
  const col = CH.ochre;
  // хвост по полу и вверх
  const wg = s.wag || 0;
  chalkLine(c, curve([[-50, -6], [-90, -4], [-118, -18 + wg * 6], [-122 - wg * 8, -48 + wg * 4]], 5), 15, col, { seed: sd + 1 });
  // туловище-груша и бедро
  const body = [[-56, -4], [-62, -40], [-40, -78], [-6, -98], [26, -96], [36, -70], [30, -30], [24, -4]];
  chalkShape(c, curve(body, 3, true), col, OUT, LWD, { seed: sd + 4, sp: 8, ang: -0.9, base: 0.4 });
  chalkLine(c, curve([[-50, -8], [-56, -38], [-30, -52], [-8, -30], [-6, -6]], 4), 4, OUT, { seed: sd + 5 });
  for (let i = 0; i < 3; i++) chalkLine(c, [[-46 + i * 12, -70 + i * 4], [-36 + i * 12, -58 + i * 4]], 5, CH.brown, { seed: sd + 6 + i });
  chalkShape(c, ellPts(-22, -4, 16, 6, 0, 10), col, OUT, 3, { seed: sd + 9, base: 0.6 });
  // дальняя передняя лапа: от груди к полу, чуть впереди ближней
  const leg = (P0, sd0) => { chalkLine(c, P0, 18, OUT, { seed: sd0, jit: 0.6 }); chalkLine(c, P0, 11, col, { seed: sd0 + 1, jit: 0.6 }); };
  leg([[24, -62], [40, -32], [52, -8]], sd + 2);
  chalkShape(c, ellPts(56, -6, 12, 6, 0, 10), col, OUT, 3, { seed: sd + 3, base: 0.6 });
  // голова: при умывании наклоняется к лапе
  const w = s.wash || 0, lick = s.lick || 0;
  const hc = [30 + lick * 4, -118 + lick * 10], ht = -0.15 + lick * 0.25;
  const hp = (p) => add(hc, rot(p, ht));
  chalkShape(c, [hp([-26, -14]), hp([-20, -48]), hp([-4, -24])], col, OUT, 4, { seed: sd + 10, base: 0.6 });
  chalkShape(c, [hp([6, -26]), hp([22, -50]), hp([26, -16])], col, OUT, 4, { seed: sd + 11, base: 0.6 });
  chalkShape(c, ellPts(hc[0], hc[1], 34, 30, ht, 24), col, OUT, LWD, { seed: sd + 12, sp: 7, base: 0.45 });
  chalkFill(c, [hp([16, -40]), hp([20, -46]), hp([22, -36])], CH.pink, { base: 0.9 });
  const ey = (p) => { const q = hp(p); if (s.blink > 0.5 || lick > 0.5) chalkLine(c, curve([[q[0] - 6, q[1]], [q[0], q[1] + 3], [q[0] + 6, q[1]]], 3), 3, OUT, { seed: sd + 13 }); else chalkDot(c, q[0], q[1], 4.5, CH.green); };
  ey([6, -6]); ey([24, -8]);
  const ns = hp([32, 4]);
  chalkDot(c, ns[0], ns[1], 4, CH.pink);
  for (let i = -1; i <= 1; i += 2) chalkLine(c, [hp([28, 10]), hp([54, 8 + i * 8])], 2, OUT, { seed: sd + 14 + i, alpha: 0.7 });
  if (lick > 0.5) chalkShape(c, ellPts(...hp([30, 16]), 5, 4, 0, 10), CH.pink, CH.pink, 2, { base: 0.9 });
  // ближняя передняя лапа: от плеча к цели (у рта или у носа); локоть смотрит назад-вниз
  // плечо → локоть вниз (не вперёд) → лапа к цели
  const sh = [14, -80], el = [20, -44];
  const paw = s.paw || [34, -8];
  leg([sh, el, paw], sd + 16);
  chalkShape(c, ellPts(paw[0] + 4, paw[1], 11, 7, 0, 12), col, OUT, 3, { seed: sd + 17, base: 0.6 });
  GA = ga0; c.restore();
}

// ===== рука с мелком («кто-то тороватый») =====
// tip — кончик мелка в мировых координатах; ang — наклон руки; рукав уходит за край кадра вверх-вправо
function drawHand(c, tip, ang = 0, sc = 1, holding = "chalk", alpha = 1) {
  c.save(); c.translate(tip[0], tip[1]); c.rotate(ang); c.scale(sc, sc); const ga0 = GA; GA *= alpha;
  const sd = 700;
  // рукав
  chalkShape(c, [[96, -150], [380, -560], [520, -460], [176, -60]], CH.deep, OUT, 6, { seed: sd + 1, sp: 10, ang: 0.6 });
  chalkLine(c, [[96, -150], [176, -60]], 12, CH.white, { seed: sd + 2 });
  if (holding === "chalk") chalkShape(c, [[-4, -4], [8, -14], [62, -70], [50, -60]], CH.white, OUT, 3, { seed: sd + 3, base: 0.9, sp: 4 });
  else chalkShape(c, cloudPts(0, -8, 46, 38, 7, 3), CH.white, CH.white, 3, { seed: sd + 3, base: 0.8, sp: 5, ang: 0.7 });
  // ладонь и пальцы
  const palm = [[40, -46], [72, -84], [120, -110], [170, -90], [180, -40], [140, -10], [90, -10], [56, -24]];
  chalkShape(c, curve(palm, 3, true), CH.skin, OUT, 5, { seed: sd + 4, sp: 8, base: 0.45 });
  chalkLine(c, curve([[54, -40], [30, -38], [22, -22], [38, -14], [70, -22]], 4), 13, CH.skin, { seed: sd + 5 });   // указательный
  chalkLine(c, curve([[64, -78], [40, -64], [28, -46]], 4), 12, CH.skin, { seed: sd + 6 });                        // большой
  chalkLine(c, curve([[54, -40], [30, -38], [22, -22], [38, -14], [70, -22]], 4), 2.5, OUT, { seed: sd + 7, alpha: 0.6 });
  chalkLine(c, curve([[90, -12], [76, 4], [96, 10], [120, -6]], 4), 12, CH.skin, { seed: sd + 8 });
  GA = ga0; c.restore();
}
