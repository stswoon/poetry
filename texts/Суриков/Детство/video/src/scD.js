// ---------- Сцены 7–10 и финал: изба изнутри (один «съёмочный павильон»), изба снаружи ночью ----------
KID_COLORS.heroIn = { coat: [70, 112, 176], coatD: [48, 80, 130], hat: C.fur, hatL: C.furL, boot: C.felt, bootD: C.feltD, mit: C.skin, mitD: C.skinD, pants: C.indigo, trim: [70, 112, 176], belt: C.verm, scarf: [70, 112, 176], hair: [150, 100, 54] };
const FLOOR = 880, TOP = 400;
const STEPS = [[2470, 760], [2560, 640], [2630, 520]];   // [левый край, верх]; правый край у печи x=2700
const STOVE_X = 2700;

function drawInterior(g, t, opt = {}) {
  const glowA = opt.glow ?? 1;
  // стена из брёвен
  roughPoly(g, [[-300, -400], [4000, -400], [4000, FLOOR + 10], [-300, FLOOR + 10]], 800, 2); paint(g, [150, 100, 60], 801, 0, 0.7, 1, 1.6);
  for (let k = 0; k < 16; k++) { const y = FLOOR - k * 62; brush(g, [[-300, y], [4000, y + (hash(k) - 0.5) * 8]], 12, [110, 70, 40], 802 + k, 0.5); brush(g, [[-300, y - 26], [4000, y - 26]], 8, [178, 124, 74], 820 + k, 0.4, 0.6); }
  // пол
  roughPoly(g, [[-300, FLOOR], [4000, FLOOR], [4000, 1500], [-300, 1500]], 840, 2); paint(g, [176, 124, 72], 841, 0, 0.6);
  for (let k = 0; k < 6; k++) brush(g, [[-300, FLOOR + 30 + k * 70], [4000, FLOOR + 30 + k * 70]], 4, [120, 80, 46], 842 + k, 0.3);
  // дверь (слева), открыта в начале сцены 7
  const open = opt.door || 0;
  roughPoly(g, [[110, 330], [420, 330], [420, FLOOR], [110, FLOOR]], 850, 2); paint(g, mix([60, 40, 26], C.indigoD, open), 851, 0, 0.6);
  if (open > 0.02) {
    g.save(); g.beginPath(); g.rect(110, 330, 310, FLOOR - 330); g.clip();
    snowfall(g, t, 50, 6, 2, 4, 0.8 * open, 852, 5);
    g.restore();
    roughPoly(g, [[420, 330], [420 + 120 * open, 300], [420 + 120 * open, FLOOR + 30], [420, FLOOR]], 853, 2); paint(g, [126, 84, 50], 854, 1.57, 0.7);
  } else {
    for (let k = 0; k < 4; k++) brush(g, [[130 + k * 76, 340], [130 + k * 76, FLOOR - 10]], 6, [90, 60, 36], 855 + k, 0.4);
  }
  // окно с метелью
  windowPane(g, t, 820, 330, 240, 230, opt.howl || 0);
  // лавка вдоль стены
  roughPoly(g, [[1180, 752], [2360, 752], [2360, 782], [1180, 782]], 860, 2); paint(g, [130, 86, 50], 861, 0, 0.7);
  for (const x of [1220, 1700, 2320]) brush(g, [[x, 782], [x, FLOOR]], 18, [104, 68, 40], 862 + x, 0.4);
  // прялка: донце на лавке, стойка, лопасть с куделью
  const px = 2200;
  brush(g, [[px - 70, 748], [px + 40, 748]], 16, [170, 110, 60], 870, 0.5);
  brush(g, [[px, 748], [px, 470]], 16, [170, 110, 60], 871, 0.5);
  roughPoly(g, [[px - 40, 470], [px + 40, 470], [px + 46, 330], [px - 46, 330]], 872, 2); paint(g, [190, 126, 66], 873, 0, 0.6);
  brush(g, [[px - 30, 360], [px + 30, 360]], 6, C.verm, 874, 0.4); brush(g, [[px - 30, 400], [px + 30, 400]], 6, C.green, 875, 0.4);
  roughEll(g, px, 330, 52, 44, 876, 0.18); paint(g, [228, 220, 196], 877, 0, 0.6);  // кудель
  // светец: подставка, стержень, зажим с лучиной; корытце с водой
  const lx = 2470;
  roughPoly(g, [[lx - 60, FLOOR], [lx + 60, FLOOR], [lx + 40, FLOOR - 26], [lx - 40, FLOOR - 26]], 880, 2); paint(g, [96, 62, 36], 881, 0, 0.6);
  roughEll(g, lx + 40, FLOOR - 12, 50, 16, 882, 0.08); paint(g, [70, 90, 110], 883, 0, 0.4);
  brush(g, [[lx, FLOOR - 26], [lx, 560]], 8, [50, 46, 52], 884, 0.3);
  brush(g, [[lx - 10, 560], [lx + 14, 548]], 10, [50, 46, 52], 885, 0.3);
  brush(g, [[lx - 30, 572], [lx + 44, 536]], 6, [214, 180, 120], 886, 0.3);       // лучина
  // печь
  roughPoly(g, [[STOVE_X, TOP], [3900, TOP], [3900, FLOOR], [STOVE_X, FLOOR]], 890, 3); paint(g, C.stove, 891, 1.57, 0.6);
  brush(g, [[STOVE_X - 10, TOP], [3900, TOP]], 24, C.stoveD, 892, 0.5);
  // чело: тёмный свод с углями
  const cx0 = 2780;
  roughPoly(g, [[cx0, FLOOR - 160], [cx0, FLOOR - 280], [cx0 + 110, FLOOR - 340], [cx0 + 220, FLOOR - 280], [cx0 + 220, FLOOR - 160]], 893, 3); paint(g, [44, 30, 30], 894, 0, 0.4);
  const ember = 0.6 + 0.4 * Math.sin(t * 5.3) * Math.sin(t * 2.1);
  roughEll(g, cx0 + 110, FLOOR - 180, 80, 20, 895, 0.2); paint(g, mix([200, 60, 20], [255, 170, 60], ember), 896, 0, 0.3);
  // приступки
  for (const [x0, y0] of STEPS) { roughPoly(g, [[x0, y0], [STOVE_X + 4, y0], [STOVE_X + 4, FLOOR], [x0, FLOOR]], 897 + x0, 2); paint(g, [198, 180, 156], 898 + x0, 1.57, 0.6); brush(g, [[x0, y0], [STOVE_X, y0]], 8, [150, 132, 110], 899 + x0, 0.4); }
  // занавеска-лоскутное одеяло на печи и кот
  roughPoly(g, [[3150, TOP - 4], [3600, TOP - 4], [3600, TOP - 40], [3150, TOP - 36]], 900, 3); paint(g, C.verm, 901, 0, 0.6);
  drawCat(g, 3400, TOP - 30, 1.0, t, 910);
}
function windowPane(g, t, x, y, w, h, howl) {
  roughPoly(g, [[x - 26, y - 26], [x + w + 26, y - 26], [x + w + 26, y + h + 26], [x - 26, y + h + 26]], 930, 2); paint(g, [200, 160, 110], 931, 0, 0.6);
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  const [tx, ty] = shake(t, howl * 3, 13, 5);
  g.translate(tx, ty);
  skyFill(g, x - 10, y - 10, w + 20, h + 20, C.indigoD, C.indigo, 932, 0.4);
  g.save(); g.translate(x, y); g.scale(w / W, h / H);
  snowfall(g, t, 120 + Math.round(howl * 160), -14 - howl * 10, 3, 9, 0.9, 933, 5);
  g.restore();
  // морозные узоры по углам
  g.globalAlpha = 0.55;
  for (let k = 0; k < 7; k++) { const cx = x + (k % 2 ? w : 0), cy = y + (k < 4 ? h : 0); roughEll(g, cx, cy, 40 + hash(k) * 40, 30 + hash(k * 3) * 30, 934 + k, 0.3); paint(g, C.white, 934 + k, 0.7, 0.6); }
  g.restore();
  // переплёт
  brush(g, [[x + w / 2, y], [x + w / 2, y + h]], 10, [176, 130, 84], 940, 0.4);
  brush(g, [[x, y + h / 2], [x + w, y + h / 2]], 10, [176, 130, 84], 941, 0.4);
}
// тёплый свет лучины и виньетка
function warmLight(g, cxS, cyS, r, a, t) {
  reset(g);
  const fl = 0.85 + 0.15 * Math.sin(t * 11) * Math.sin(t * 7.3);
  g.globalCompositeOperation = "lighter"; g.globalAlpha = a * fl * 0.35;
  const gr = g.createRadialGradient(cxS, cyS, 10, cxS, cyS, r);
  gr.addColorStop(0, "rgba(255,190,100,1)"); gr.addColorStop(1, "rgba(255,190,100,0)");
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = "multiply"; g.globalAlpha = 0.55;
  const vg = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.0);
  vg.addColorStop(0, "rgba(255,255,255,1)"); vg.addColorStop(1, "rgba(60,40,60,1)");
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
  reset(g);
}
// пламя лучины в мировых координатах
function flame(g, x, y, s, t) {
  g.save(); g.translate(x, y); g.scale(s, s);
  for (let k = 0; k < 3; k++) {
    const fl = Math.sin(t * (9 + k * 3) + k) * 0.12;
    const hgt = [70, 52, 30][k], wdt = [20, 14, 8][k];
    g.beginPath(); g.moveTo(-wdt, 0); g.quadraticCurveTo(-wdt * 1.1, -hgt * 0.5, fl * 60, -hgt); g.quadraticCurveTo(wdt * 1.1, -hgt * 0.5, wdt, 0); g.quadraticCurveTo(0, 12, -wdt, 0);
    g.fillStyle = css([[255, 140, 40], [255, 200, 90], [255, 246, 210]][k]); g.fill();
  }
  g.restore();
}
// камера павильона: центр (wx,wy) и масштаб z
function camApply(g, wx, wy, z, sx = 0, sy = 0) { g.translate(W / 2 + sx, H / 2 + sy); g.scale(z, z); g.translate(-wx, -wy); }
const camBlend = (A, B, u) => [lerp(A[0], B[0], u), lerp(A[1], B[1], u), Math.exp(lerp(Math.log(A[2]), Math.log(B[2]), u))];

// ---- поза ребёнка через IK: hip, ступни, кисти в мировых координатах (лицом вправо, масштаб s) ----
function kidIK(hip, lean, feet, hands, s, extra = {}) {
  const loc = (p) => [(p[0] - hip[0]) / s, (p[1] - hip[1]) / s];
  const legs = feet.map((f, i) => { const r = ik2([i ? -3 : 3, 0], [loc(f)[0] - 14 * Math.cos(0), loc(f)[1]], KID.TH, KID.SH, true); return { a: r.a, b: r.b }; });
  const sh = [Math.sin(lean) * KID.TL, -Math.cos(lean) * KID.TL];
  const arms = hands.map((hd, i) => { const base = [sh[0] + (i ? -4 : 4), sh[1] + 8]; const r = ik2(base, loc(hd), KID.UA, KID.FA + KID.MIT * 0.8, false); return { a: r.a - lean, b: r.b }; });
  return { rot: 0, lean, head: 0, legs, arms, ...extra };
}
// ключи подъёма на печь: hip, ступни (ближняя, дальняя), кисти (ближняя, дальняя)
const CLIMB = [
  { hip: [2380, 752], f: [[2395, 866], [2365, 866]], h: [[2440, 690], [2420, 700]], lean: 0.05 },
  { hip: [2455, 760], f: [[2515, 746], [2420, 866]], h: [[2575, 628], [2560, 630]], lean: 0.3 },
  { hip: [2520, 640], f: [[2530, 746], [2505, 746]], h: [[2645, 508], [2630, 510]], lean: 0.3 },
  { hip: [2590, 640], f: [[2600, 626], [2545, 746]], h: [[2655, 506], [2640, 508]], lean: 0.35 },
  { hip: [2655, 520], f: [[2668, 506], [2610, 626]], h: [[2735, 390], [2718, 392]], lean: 0.45 },
];
const SIT = { rot: 0, lean: -0.04, head: 0.05, legs: [{ a: 1.52, b: 0.06 }, { a: 1.47, b: 0.06 }], arms: [{ a: 0.75, b: 0.5 }, { a: 0.6, b: 0.6 }] };
const SIT_HIP = [2760, 380];
function climbPose(c, s) {
  if (c >= 0.8) {
    const u = ease(inv(0.8, 1, c));
    const k = CLIMB[4], p0 = kidIK(k.hip, k.lean, k.f, k.h, s);
    return { hip: [lerp(k.hip[0], SIT_HIP[0], u), lerp(k.hip[1], SIT_HIP[1], u)], pose: blendPose(p0, SIT, u) };
  }
  const f = c / 0.8 * 4, i = Math.min(3, Math.floor(f)), u0 = f - i;
  const A = CLIMB[i], B = CLIMB[i + 1];
  // сначала переносится нога (остальные опоры стоят), потом руки, таз догоняет
  const uf = easeIO(inv(0, 0.45, u0)), uh = easeIO(inv(0.25, 0.7, u0)), up = easeIO(inv(0.1, 1, u0));
  const L = (p, q, u) => [lerp(p[0], q[0], u), lerp(p[1], q[1], u)];
  const lift = (p, q, u) => { const r = L(p, q, u); if (Math.hypot(q[0] - p[0], q[1] - p[1]) > 4) r[1] -= Math.sin(u * Math.PI) * 36; return r; };
  const hip = L(A.hip, B.hip, up);
  const feet = [lift(A.f[0], B.f[0], uf), lift(A.f[1], B.f[1], uf)];
  const hands = [lift(A.h[0], B.h[0], uh), lift(A.h[1], B.h[1], uh)];
  const u = up;
  return { hip, pose: kidIK(hip, lerp(A.lean, B.lean, u), feet, hands, s) };
}

// ---- Сцена 7: шубёнку долой — и на печь к бабушке ----
function scene7(g, t) {
  const a = EV.L25 - 0.12, cut = EV.L27 - 0.12;
  const s = 1.25;
  if (t < cut) {
    const z = lerp(1.55, 1.75, ease(inv(a, cut, t)));
    const [sx, sy] = shake(t, 1.5, 2, 23);
    g.save(); camApply(g, 560, 690, z, sx, sy);
    drawInterior(g, t, { door: 1 - ease(inv(a + 0.3, a + 1.0, t)) });
    // мальчик анфас у двери: руки разводит — шубёнка слетает
    const off = ease(inv(EV.shubenku - 0.1, EV.doloy, t));
    const pose = { arms: [{ a: lerp(0.5, 1.9, off), b: lerp(0.4, 0.2, off) }, { a: lerp(0.5, 1.9, off), b: lerp(0.4, 0.2, off) }], mouth: "smile", eyes: "open", blink: (t % 2.3) < 0.1 ? 1 : 0 };
    drawKidFront(g, 640, FLOOR - 140, 1.55, pose, t >= EV.shubenku + 0.15 ? "heroIn" : "hero", 300);
    // ноги анфас: две ноги в валенках под рубахой/шубой
    for (const sg of [-1, 1]) { brush(g, [[640 + sg * 22 * 1.55, FLOOR - 140 + 10], [640 + sg * 24 * 1.55, FLOOR - 20]], 28 * 1.55 * 0.7, C.felt, 310 + sg, 0.6); roughEll(g, 640 + sg * 26 * 1.55, FLOOR - 14, 26, 14, 312 + sg, 0.1); paint(g, C.feltD, 313 + sg, 0, 0.5); }
    g.restore();
    warmLight(g, W * 0.9, H * 0.3, 1300, 0.8, t);
    // шубёнка летит в объектив
    const fu = inv(EV.shubenku + 0.15, cut + 0.12, t);
    if (fu > 0 && fu < 1) {
      reset(g);
      const sc = lerp(2.0, 14, easeIn(fu)), rx = lerp(1075, W / 2 + 100, fu), ry = lerp(600, H / 2, fu);
      g.save(); g.translate(rx, ry); g.scale(sc, sc); g.rotate(fu * 1.2);
      roughPoly(g, [[-40, -50], [40, -50], [70, -36], [96, 10], [70, 18], [48, -8], [50, 60], [-50, 60], [-48, -8], [-70, 18], [-96, 10], [-70, -36]], 320, 3);
      paint(g, C.verm, 321, 0.7, 0.8);
      g.restore();
    }
    return;
  }
  // на печь: подъём по приступкам
  const c = inv(cut + 0.05, EV.babushke + 0.15, t);
  const cp = climbPose(c, s);
  const cam = camBlend([2560, 620, 1.05], [2820, 470, 1.25], ease(inv(cut, EV.L29, t)));
  const [sx, sy] = shake(t, 1.2, 2, 27);
  g.save(); camApply(g, cam[0], cam[1], cam[2], sx, sy);
  drawInterior(g, t, {});
  // бабушка на печи, лицом к мальчику; протягивает руки
  const reach = ease(inv(EV.babushke - 0.4, EV.babushke + 0.4, t));
  drawAdult(g, 3020, TOP - 26, 1.05, -1, "baba", { lean: 0.05 + reach * 0.15, head: 0.08, seatH: 34, hands: [[lerp(30, 120, reach), lerp(110, 40, reach)], [lerp(10, 100, reach), lerp(100, 30, reach)]], eyes: "open", blink: (t % 3.1) < 0.12 ? 1 : 0 }, 700);
  drawKid(g, cp.hip[0], cp.hip[1], s, 1, { ...cp.pose, mouth: "smile", eyes: "open" }, "heroIn", 100);
  g.restore();
  warmLight(g, W * 0.15, H * 0.4, 1300, 0.9, t);
}

// ---- Сцена 8: тихо на печи → метель воет за окном ----
function scene8(g, t) {
  const a = EV.L29 - 0.12, w = EV.L31 - 0.15;
  const s = 1.25;
  if (t < w) {
    const z = lerp(1.45, 1.65, ease(inv(a, w, t)));
    g.save(); camApply(g, 2880, 360, z);
    drawInterior(g, t, {});
    drawAdult(g, 3020, TOP - 26, 1.05, -1, "baba", { lean: 0.12, head: 0.12, seatH: 34, hands: [[118, 36], [60, 100]], eyes: "closed" }, 700);
    const bl = (t % 2.9) < 0.14 ? 1 : 0;
    drawKid(g, SIT_HIP[0], SIT_HIP[1], s, 1, { ...SIT, head: 0.05 + 0.04 * Math.sin(t * 1.3), mouth: "smile", eyes: "open", blink: bl }, "heroIn", 100);
    g.restore();
    warmLight(g, W * 0.1, H * 0.6, 1100, 0.9, t);
    return;
  }
  // окно крупно: воет метель, стекло дрожит
  const howl = ease(inv(w, EV.voet + 0.3, t));
  const z = lerp(2.6, 2.9, ease(inv(w, EV.L33, t)));
  const [sx, sy] = shake(t, howl * 5, 9, 29);
  g.save(); camApply(g, 940, 470, z, sx, sy);
  drawInterior(g, t, { howl });
  g.restore();
  // вихри ветра за стеклом (поверх кадра, в пределах окна)
  warmLight(g, W * 0.5, H * 1.1, 900, 0.5, t);
}

// ---- Сцена 9: дед плетёт лапоть, матушка прядёт лён ----
function scene9(g, t) {
  const a = EV.L33 - 0.12, p = EV.matushka - 0.25;
  const u = ease(inv(p - 0.35, p + 0.35, t));
  const cam = camBlend([1540, 660, 2.3], [2140, 600, 2.1], u);
  g.save(); camApply(g, cam[0], cam[1], cam[2]);
  drawInterior(g, t, {});
  // дед: сидит на лавке, лапоть на колене; ближняя рука с кочедыком ходит вверх-вниз
  const k = Math.sin(t * 6.5);
  const dh = drawAdult(g, 1470, 752, 1.0, 1, "ded", { lean: 0.32, head: 0.3, seatH: 128, hands: [[62 + k * 10, 70 - Math.max(0, k) * 30], [70, 96]], eyes: "open", blink: (t % 3.3) < 0.12 ? 1 : 0 }, 720);
  // лапоть на колене и лыко
  roughEll(g, 1470 + 70, 738, 36, 16, 730, 0.12); paint(g, C.ochreL, 731, 0.4, 0.8);
  g.strokeStyle = css(C.ochre); g.lineWidth = 2; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(1470 + 50 + i * 10, 726); g.lineTo(1470 + 64 + i * 10, 752); g.stroke(); }
  taper(g, [[dh.near[0], dh.near[1]], [1470 + 80, 730], [1470 + 140, 790], [1470 + 120, 860]], 7, 3, C.ochreL, 732);
  // матушка у прялки: дальняя рука тянет кудель, ближняя крутит веретено
  const sp = t * 14;
  const mh = drawAdult(g, 2080, 752, 1.0, 1, "mama", { lean: 0.08, head: -0.08, seatH: 128, hands: [[64, 120], [100, -40]], eyes: "open", blink: (t % 2.7) < 0.12 ? 1 : 0 }, 740);
  // нить от кудели к веретену
  const spx = mh.near[0] + 6, spy = mh.near[1] + 40;
  g.strokeStyle = css(C.white, 0.9); g.lineWidth = 2; g.beginPath(); g.moveTo(2200 - 30, 350); g.lineTo(mh.far[0], mh.far[1]); g.lineTo(spx, spy - 50); g.stroke();
  // веретено (вращается: полоски бегут)
  brush(g, [[spx, spy - 60], [spx, spy + 40]], 8, [196, 150, 96], 742, 0.3);
  roughEll(g, spx, spy + 2, 18, 30, 743, 0.05); paint(g, [228, 220, 196], 744, 0, 0.4);
  g.strokeStyle = css(C.umber); g.lineWidth = 2;
  for (let i = 0; i < 3; i++) { const ph = (sp + i * 2.1) % TAU, xx = spx + Math.cos(ph) * 16; if (Math.sin(ph) > 0) { g.beginPath(); g.moveTo(xx, spy - 22); g.lineTo(xx, spy + 26); g.stroke(); } }
  g.restore();
  warmLight(g, W * 0.95, H * 0.45, 1100, 0.9, t);
}

// ---- Сцена 10: огонёк светца → вся изба → изба снаружи, название ----
function scene10(g, t) {
  const a = EV.L37 - 0.12, out = EV.L40 - 0.2, fin = EV.fin;
  if (t < out) {
    const pull = ease(inv(EV.L39 - 0.3, out, t));
    const cam = camBlend([2475, 560, 3.0], [2050, 560, 0.58], pull);
    g.save(); camApply(g, cam[0], cam[1], cam[2]);
    drawInterior(g, t, {});
    drawAdult(g, 1470, 752, 1.0, 1, "ded", { lean: 0.32, head: 0.3, seatH: 128, hands: [[62 + Math.sin(t * 6.5) * 10, 70], [70, 96]], eyes: "open" }, 720);
    roughEll(g, 1470 + 70, 738, 36, 16, 730, 0.12); paint(g, C.ochreL, 731, 0.4, 0.8);
    const mh = drawAdult(g, 2080, 752, 1.0, 1, "mama", { lean: 0.08, head: -0.08, seatH: 128, hands: [[64, 120], [100, -40]], eyes: "open" }, 740);
    g.strokeStyle = css(C.white, 0.9); g.lineWidth = 2; g.beginPath(); g.moveTo(2170, 350); g.lineTo(mh.far[0], mh.far[1]); g.lineTo(mh.near[0] + 6, mh.near[1] - 10); g.stroke();
    brush(g, [[mh.near[0] + 6, mh.near[1] - 20], [mh.near[0] + 6, mh.near[1] + 80]], 8, [196, 150, 96], 742, 0.3);
    drawAdult(g, 3020, TOP - 26, 1.05, -1, "baba", { lean: 0.12, head: 0.12, seatH: 34, hands: [[118, 36], [60, 100]], eyes: "closed" }, 700);
    drawKid(g, SIT_HIP[0], SIT_HIP[1], 1.25, 1, { ...SIT, mouth: "smile", eyes: "closed" }, "heroIn", 100);
    flame(g, 2490, 540, 1, t);
    // угольки падают в корытце
    for (let k = 0; k < 3; k++) { const ph = (t * 0.7 + k / 3) % 1; g.fillStyle = css([255, 150, 40], 1 - ph); g.beginPath(); g.arc(2500 + k * 6, 560 + ph * 300, 3, 0, TAU); g.fill(); }
    g.restore();
    const fx = W / 2 + (2490 - cam[0]) * cam[2], fy = H / 2 + (520 - cam[1]) * cam[2];
    warmLight(g, fx, fy, 500 + 900 * cam[2], 1.2, t);
    return;
  }
  // снаружи: изба ночью в стихающей метели
  const calm = ease(inv(out, fin + 1, t));
  const z = lerp(1.5, 1.0, ease(inv(out, fin, t)));
  skyFill(g, 0, 0, W, H, C.indigoD, [70, 64, 120], 990, 0.4);
  // звёзды проступают
  g.fillStyle = css(C.white, calm * 0.8);
  for (let k = 0; k < 40; k++) { g.beginPath(); g.arc(hash(k * 3.1) * W, hash(k * 5.7) * 420, 1.5 + hash(k) * 2, 0, TAU); g.fill(); }
  g.save(); camApply(g, W / 2, 640, z);
  for (let i = 0; i < 4; i++) drawIzba(g, 200 + i * 520 - (i > 1 ? -300 : 0), 760, 0.42, t, { smoke: 1, wind: 40, dusk: 0.95, lit: 0.5 }, 960 + i * 7);
  roughPoly(g, [[-400, 820], [W + 400, 800], [W + 400, 1400], [-400, 1400]], 991, 6); paint(g, mix(C.snowD, C.indigo, 0.25), 992, 0, 0.5);
  drawIzba(g, 1060, 930, 1.35, t, { smoke: 1, wind: 40, dusk: 0.8, lit: 1 }, 333);
  drawSled(g, 1400, 920, 1.0, 0.1, 70, -1);
  g.restore();
  snowfall(g, t, Math.round(lerp(160, 40, calm)), lerp(-8, -1, calm), lerp(2, 0.8, calm), 4, 0.8, 993, calm < 0.6 ? 4 : 0);
  // название крупно (кадр для обложки)
  titleBlock(g, t, W / 2, 330, 1.25, fin, true);
}
