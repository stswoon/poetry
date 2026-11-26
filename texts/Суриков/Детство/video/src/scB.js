// ---------- Сцены 2–4: повтор кувырка, вид из сугроба, лицо в снегу и смех ----------
// склон в повторе: y = slopeY(x)
const slopeY = (x) => 300 + x * 0.42;
// знак «ПОВТОР ×0.5» с мигающей точкой
function replayBadge(g, t) {
  reset(g);
  const x = 1440, y = 70;
  roughPoly(g, [[x - 10, y - 4], [x + 420, y - 10], [x + 426, y + 66], [x - 6, y + 70]], 700, 3); paint(g, C.verm, 701, 0, 0.6, 0.95);
  if (Math.floor(t * 2.5) % 2 === 0) { roughEll(g, x + 34, y + 30, 13, 13, 702, 0.1); g.fillStyle = css(C.white); g.fill(); }
  g.font = '44px "DLine"'; g.fillStyle = css(C.white); g.textBaseline = "middle"; g.textAlign = "left";
  g.fillText("ПОВТОР ×0.5", x + 62, y + 32);
}
// ---- Сцена 2: повтор сбоку — кувырок, санки отдельно, бух в сугроб ----
function scene2(g, t) {
  const a = EV.L7 - 0.15, b = EV.sugrob, e = EV.L9;
  const u = inv(a, b + 0.1, t);                  // путь кувырком до сугроба
  const bx = lerp(200, 2350, u);                 // мировая x мальчика
  const land = inv(b - 0.05, b + 0.25, t);       // въезд в сугроб
  const fx = lerp(bx, 2420, ease(inv(b - 0.5, b + 0.3, t)));
  const camX = fx - 900, camY = slopeY(Math.min(fx, 2300)) - 690;
  const Z = 1.35;
  const [sx, sy] = shake(t, 3 + 10 * win(t, b, b + 0.5, 0.02, 0.4), 10, 5);
  skyFill(g, 0, 0, W, H, C.skyL, C.skyW, 21, 0.5);
  g.save(); g.translate(-camX * 0.15 + sx * 0.3, -camY * 0.1 + 40);
  farHills(g, 520, -camX * 0.3, 0, 22);
  g.restore();
  g.save(); g.translate(W / 2, H / 2); g.scale(Z, Z); g.translate(-W / 2, -H / 2); g.translate(-camX + sx, -camY + sy);
  // склон
  roughPoly(g, [[-400, slopeY(-400)], [2300, slopeY(2300)], [3400, slopeY(2300) + 40], [3400, 2600], [-400, 2600]], 23, 5);
  paint(g, C.snow, 24, 0.4, 0.6, 1, 1.6);
  for (let k = 0; k < 9; k++) { const x = k * 300 + 60; brush(g, [[x, slopeY(x) + 20], [x + 140, slopeY(x + 140) + 26]], 9, C.snowS, 25 + k, 0.4, 0.6); }
  // деревья на склоне (позади)
  for (let k = 0; k < 6; k++) { const x = 100 + k * 420; if (k % 2) drawBirch(g, x, slopeY(x) - 10, 0.9, 30 + k); else drawPine(g, x, slopeY(x) - 6, 0.9, 40 + k); }
  // сугроб внизу: задняя часть
  const dx = 2420, dy = slopeY(2300) + 30;
  roughPoly(g, [[dx - 260, dy + 40], [dx - 170, dy - 90], [dx - 20, dy - 150], [dx + 160, dy - 100], [dx + 280, dy + 40]], 26, 6); paint(g, C.snow, 27, 0, 0.5);
  // санки летят отдельно, вращаясь
  const su = inv(EV.L7 - 0.1, b + 0.6, t);
  const sxw = lerp(260, 2150, su), syw = slopeY(sxw) - 60 - Math.sin(su * Math.PI) * 220;
  drawSled(g, sxw, syw, 1.15, su * 7.5, 71, 1);
  // мальчик: кувырок колесом по склону
  if (t < b) {
    const by = slopeY(bx) - 95 - Math.abs(Math.sin(u * Math.PI * 4)) * 70;
    const rot = u * Math.PI * 2 * 3.0;
    const ph = Math.sin(u * Math.PI * 8);
    const pose = blendPose(KP.tuck, KP.flail, clamp(0.5 + 0.5 * ph));
    // пыль снега на касаниях
    for (let k = 0; k < 4; k++) {
      const uk = (k + 0.5) / 4.2, pk = inv(a + (b - a) * uk, a + (b - a) * uk + 0.6, t);
      if (pk > 0 && pk < 1) { const xk = lerp(200, 2350, uk); g.save(); g.globalAlpha = 1 - pk; roughEll(g, xk, slopeY(xk) - 20 - pk * 40, 60 + pk * 90, 30 + pk * 40, 60 + k, 0.2); paint(g, C.white, 60 + k, 0, 0.3); g.restore(); }
    }
    drawKid(g, bx, by, 1.3, 1, { ...pose, rot, mouth: "o", eyes: "wide" }, "hero", 100);
  }
  if (t >= b) {
    // торчат валенки: вниз головой в сугробе, ноги дрыгаются (обе видны)
    const k1 = Math.sin((t - b) * 11), k2 = Math.sin((t - b) * 11 + 2.2);
    const sink = easeOut(land);
    const pose = { rot: Math.PI * 0.92, lean: 0, head: 0, arms: [{ a: 0.4, b: 0.3 }, { a: -0.3, b: 0.3 }],
      legs: [{ a: 0.25 + 0.35 * k1, b: 0.5 + 0.4 * Math.max(0, k1) }, { a: -0.2 + 0.35 * k2, b: 0.5 + 0.4 * Math.max(0, k2) }], mouth: "o" };
    drawKid(g, dx - 10, dy - 112 + lerp(-30, 0, sink), 1.3, 1, pose, "hero", 100);
    // передняя часть сугроба закрывает туловище
    roughPoly(g, [[dx - 340, dy + 60], [dx - 220, dy - 70], [dx - 70, dy - 132], [dx + 80, dy - 128], [dx + 230, dy - 60], [dx + 340, dy + 60]], 28, 6); paint(g, C.snow, 29, 0, 0.5);
    brush(g, [[dx - 200, dy - 50], [dx - 60, dy - 104], [dx + 70, dy - 100]], 12, C.snowS, 30, 0.4, 0.6);
    // взрыв снега
    const pu = inv(b, b + 0.8, t);
    if (pu < 1) { g.save(); for (let k = 0; k < 14; k++) { const an = -Math.PI * (0.1 + 0.8 * hash(k * 3)), r = pu * (160 + hash(k) * 220); g.globalAlpha = 1 - pu; roughEll(g, dx + Math.cos(an) * r, dy - 120 + Math.sin(an) * r + pu * pu * 140, 30 + hash(k * 5) * 30, 24, 80 + k, 0.25); paint(g, C.white, 80 + k, 0, 0.3); } g.restore(); }
  }
  g.restore();
  replayBadge(g, t);
}

// ---- Сцена 3: снизу из сугроба — друзья нависают и хохочут ----
function friendHead(g, t, cx, cy, ang, sc, colors, pose, seed) {
  g.save(); g.translate(cx, cy); g.rotate(ang);
  drawKidFront(g, 0, 0, sc, pose, colors, seed);
  g.restore();
}
function scene3(g, t) {
  const a = EV.L9 - 0.12, hh = EV.hohochut;
  const [sx, sy] = shake(t, 4, 2.4, 9);
  reset(g);
  skyFill(g, 0, 0, W, H, [150, 196, 230], C.skyL, 31, 0.5);
  // облако и ветка берёзы над головами
  roughEll(g, 1300 + sx, 260, 260, 70, 32, 0.12); paint(g, C.white, 33, 0, 0.4, 0.8);
  taper(g, [[W + 40, 80], [1500, 160], [1260, 150]], 12, 2, C.umberD, 34);
  // друзья: голова к центру кадра, туловище уходит к краю
  const laugh = win(t, hh - 0.2, EV.L13, 0.2, 0.2);
  const F = [
    { c: "f1", hx: 600, hy: 600, t0: a + 0.05, arms: [{ a: 0.5, b: 1.9 }, { a: 0.5, b: 1.9 }] },
    { c: "f2", hx: 980, hy: 330, t0: a + 0.25, arms: [{ a: 0.35, b: 0.15 }, { a: 0.5, b: 1.8 }] },
    { c: "f3", hx: 1340, hy: 620, t0: a + 0.45, arms: [{ a: 0.6, b: 1.7 }, { a: 0.3, b: 0.2 }] },
  ];
  // края сугроба вокруг объектива («рыбий глаз»): ребята стоят над кромкой, поэтому рисуются поверх
  g.save();
  g.beginPath(); g.rect(-50, -50, W + 100, H + 100);
  for (let i = 0; i <= 40; i++) { const an = i / 40 * TAU, r = 1 + (hash(i * 3.3) - 0.5) * 0.12; const x = W / 2 + Math.cos(an) * 820 * r, y = H / 2 + Math.sin(an) * 470 * r; i ? g.lineTo(x, y) : g.moveTo(x, y); }
  g.closePath();
  g.fillStyle = css(C.snow); g.fill("evenodd");
  texture(g, 35, 0, 0.6);
  g.restore();
  const HO = KID.TL + KID.NECK + KID.HR - 6, SC = 3.0;
  for (let i = 0; i < 3; i++) {
    const f = F[i], k = spr(t, f.t0, 0.6);
    const bob = Math.sin(t * 9 + i * 2) * 14 * laugh;
    let dx = f.hx - W / 2, dy = f.hy - H / 2; const dl = Math.hypot(dx, dy); dx /= dl; dy /= dl;
    const ang = Math.atan2(-dx, dy);
    const out = lerp(700, 0, k);                       // вылезают из-за края
    const hx = f.hx + dx * (out + bob), hy = f.hy + dy * (out + bob);
    friendHead(g, t, hx + dx * HO * SC + sx, hy + dy * HO * SC + sy, ang, SC, f.c, { arms: f.arms, mouth: laugh > 0.3 ? "laugh" : "smile", eyes: laugh > 0.3 ? "happy" : "open", tl: t + i, head: Math.sin(t * 7 + i) * 0.08 * laugh }, 200 + i * 40);
  }
  // снег сыплется с плеч ребят
  snowfall(g, t, 40, 0.1, 1.4, 5, 0.8, 37);
}

// ---- Сцена 4: лицо в снегу крупно → «А ребятам смех!» общий план ----
function scene4(g, t) {
  const a = EV.L13 - 0.12, wide = EV.L16 - 0.15;
  if (t < wide) {
    const z = lerp(1.0, 1.12, ease(inv(a, wide, t)));
    const [sx, sy] = shake(t, 3, 2, 11);
    skyFill(g, 0, 0, W, H, [160, 200, 232], C.snow, 41, 0.5);
    // фон: склон и ребята размыто вдали
    roughPoly(g, [[-100, 700], [W + 100, 620], [W + 100, H + 100], [-100, H + 100]], 42, 6); paint(g, C.snow, 43, 0, 0.5);
    const sad = t >= EV.gore - 0.1;
    const blink = (t > EV.gore + 0.2 && t < EV.gore + 0.38) || (t > a + 1.2 && t < a + 1.35) ? 1 : 0;
    // руки у лица, варежки в снегу; плечи срезаны кадром — обе руки видны
    const pose = { arms: [{ a: 0.85, b: 3.45 }, { a: 0.85, b: 3.45 }], snowy: 1, mouth: sad ? "sad" : "o", eyes: "open", blink, head: sad ? -0.06 : 0.04 * Math.sin(t * 3) };
    g.save(); g.translate(W / 2 + sx, H / 2 + sy); g.scale(z, z); g.translate(-W / 2, -H / 2);
    drawKidFront(g, W / 2, 1010 + (sad ? 24 : 0), 4.0, pose, "hero", 300);
    g.restore();
    // налипший на объектив снег по краям
    lensSnow(g, t, 0.32, 130);
    return;
  }
  // общий план: мальчик по пояс в сугробе, ребята валятся со смеху
  const u = inv(wide, EV.L17, t);
  const [sx, sy] = shake(t, 3, 2.5, 13);
  skyFill(g, 0, 0, W, H, C.skyL, C.skyW, 44, 0.5);
  farHills(g, 520, 0, 0, 45);
  roughPoly(g, [[-100, 640], [W + 100, 600], [W + 100, H + 100], [-100, H + 100]], 46, 6); paint(g, C.snow, 47, 0, 0.5);
  g.save(); g.translate(sx, sy);
  g.translate(W / 2, H); g.scale(1.3, 1.3); g.translate(-W / 2, -H - 60);
  // f1: согнулся, держится за живот (слева)
  const b1 = Math.sin(t * 10) * 0.08;
  drawKid(g, 520, 830, 1.25, 1, { rot: 0, lean: 0.5 + b1, head: 0.25, arms: [{ a: -0.23, b: 1.52 }, { a: 0.3, b: 0.2 }], legs: [{ a: 0.12, b: 0.25 }, { a: -0.12, b: 0.2 }], mouth: "laugh", eyes: "happy", tl: t }, "f1", 400);
  // f3: показывает пальцем (позади справа)
  drawKid(g, 1250, 740, 0.95, -1, { rot: 0, lean: 0.12 + b1, head: 0.05, arms: [{ a: 1.55, b: 0.1 }, { a: -0.23, b: 1.52 }], legs: [{ a: 0.05, b: 0.05 }, { a: -0.08, b: 0.05 }], mouth: "laugh", eyes: "happy", tl: t + 2 }, "f3", 480);
  // f2: лежит на спине, голова вправо, дрыгает ногами
  const k1 = Math.sin(t * 9), k2 = Math.sin(t * 9 + 2);
  drawKid(g, 1380, 852, 1.15, -1, { rot: -Math.PI / 2, lean: 0, head: -0.1, arms: [{ a: -0.23, b: 1.52 }, { a: 1.7 + 0.3 * k1, b: 0.4 }], legs: [{ a: 1.35 + 0.3 * k1, b: 0.6 + 0.4 * Math.max(0, k1) }, { a: 1.15 + 0.3 * k2, b: 0.7 + 0.4 * Math.max(0, k2) }], mouth: "laugh", eyes: "happy", tl: t + 1 }, "f2", 440);
  // герой по пояс в сугробе (анфас), сначала грустный, к концу строки улыбается
  const smile = t > EV.smeh + 0.25;
  const wv = Math.sin(t * 4) * 0.12;
  drawKidFront(g, 900, 900, 1.5, { arms: [{ a: 1.15 + wv, b: 1.5 }, { a: 1.15 - wv, b: 1.5 }], snowy: 0.8, mouth: smile ? "smile" : "sad", eyes: "open", blink: 0, head: Math.sin(t * 2.6) * 0.06 }, "hero", 300);
  roughPoly(g, [[620, 1100], [660, 900], [780, 850], [1020, 846], [1160, 900], [1200, 1100]], 49, 6); paint(g, C.snow, 50, 0, 0.5);
  brush(g, [[680, 900], [800, 860], [1000, 858], [1140, 900]], 10, C.snowS, 51, 0.4, 0.6);
  g.restore();
}
