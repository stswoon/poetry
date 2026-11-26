// ---------- Взрослые (сидя, сбоку), санки, кот, избы, деревья ----------
const AD = { TL: 118, HR: 36, UA: 54, FA: 50, TH: 60 };
const ADULT = {
  baba: { top: [92, 104, 140], topD: [70, 80, 112], skirt: C.umber, sleeve: [92, 104, 140], scarf: C.indigo, dots: C.white, hair: [236, 234, 228], feet: C.feltD },
  ded: { top: C.linen, topD: C.linenD, skirt: null, pants: [96, 108, 130], sleeve: C.linen, belt: C.verm, hair: [210, 206, 200], beard: [222, 218, 210], feet: C.ochreL },
  mama: { top: C.linen, topD: C.linenD, skirt: [176, 52, 40], sleeve: C.linen, scarf: C.ochre, dots: C.verm, hair: [110, 70, 40], feet: C.ochreL, apron: [236, 228, 206] },
};
// сидящий взрослый: (x,y) — сиденье под тазом, seatH — высота сиденья до пола (px при s=1)
// pose: { lean, head, hands: [[x,y] ближняя, [x,y] дальняя] в координатах от плеча, mouth, eyes, seatH }
function drawAdult(g, x, y, s, dir, kind, pose, seed = 0) {
  const c = ADULT[kind];
  g.save(); g.translate(x, y); g.scale(s * dir, s);
  const lean = pose.lean || 0, TL = AD.TL, seatH = pose.seatH || 110;
  const sh = [Math.sin(lean) * TL, -Math.cos(lean) * TL];
  const knee = [AD.TH, -6];
  const foot = [AD.TH + 8, seatH - 8];
  const arm = (i) => {
    const base = [sh[0] + (i ? -6 : 6), sh[1] + 14];
    const tgt = [sh[0] + pose.hands[i][0], sh[1] + pose.hands[i][1]];
    const r = ik2(base, tgt, AD.UA, AD.FA, false);
    const el = addv(base, r.a, AD.UA), hd = addv(el, r.a + r.b, AD.FA);
    const col = i ? mix(c.sleeve, [0, 0, 0], 0.18) : c.sleeve;
    brush(g, [base, el], 26, col, seed + 10 + i, 0.6);
    brush(g, [el, hd], 22, col, seed + 12 + i, 0.6);
    roughEll(g, hd[0], hd[1], 10, 11, seed + 14 + i, 0.06); paint(g, i ? C.skinD : C.skin, seed + 15 + i, 0, 0.3);
    return hd;
  };
  const far = arm(1);
  // ноги / юбка
  if (c.skirt) {
    roughPoly(g, [[-34, -26], [14, -30], [knee[0] + 14, knee[1] - 16], [knee[0] + 22, knee[1] + 8], [foot[0] + 14, foot[1] - 4], [foot[0] - 34, foot[1] - 2], [knee[0] - 26, 16], [-30, 16]], seed + 20, 2.5);
    paint(g, c.skirt, seed + 21, 1.4, 0.8);
    if (c.apron) { roughPoly(g, [[8, -26], [knee[0] + 10, knee[1] - 14], [knee[0] + 18, knee[1] + 8], [foot[0] + 8, foot[1] - 10], [foot[0] - 18, foot[1] - 10], [knee[0] - 6, 10]], seed + 22, 2); paint(g, c.apron, seed + 23, 1.5, 0.5); }
    roughEll(g, foot[0] - 14, foot[1] + 1, 19, 9, seed + 26, 0.08); paint(g, mix(c.feet, [0, 0, 0], 0.25), seed + 27, 0, 0.5);
    roughEll(g, foot[0] + 10, foot[1] + 3, 20, 9, seed + 24, 0.08); paint(g, c.feet, seed + 25, 0, 0.5);
  } else {
    for (let i = 1; i >= 0; i--) {
      const dk = i ? 0.8 : 1, k = [knee[0] - i * 8, knee[1] - i * 2], f = [foot[0] - i * 12, foot[1]];
      brush(g, [[0, -4], k], 30, mix(c.pants, [0, 0, 0], 1 - dk), seed + 26 + i, 0.6);
      brush(g, [k, [f[0] - 4, f[1] - 14]], 26, mix(C.white, [0, 0, 0], 1 - dk * 0.92), seed + 28 + i, 0.6); // онучи
      roughEll(g, f[0] + 6, f[1] - 2, 20, 10, seed + 30 + i, 0.1); paint(g, mix(c.feet, [0, 0, 0], 1 - dk), seed + 31 + i, 0.4, 0.9); // лапоть
    }
  }
  // туловище
  g.save(); g.rotate(lean);
  roughPoly(g, [[-30, -TL + 6], [22, -TL + 4], [32, -TL * 0.4], [30, 8], [-34, 10], [-36, -TL * 0.45]], seed + 40, 2.5);
  paint(g, c.top, seed + 41, 1.4, 0.8);
  if (c.belt) brush(g, [[-34, -14], [30, -14]], 10, c.belt, seed + 42, 0.6);
  g.restore();
  // голова
  g.save(); g.translate(sh[0] + Math.sin(lean) * (AD.HR + 6), sh[1] - Math.cos(lean) * (AD.HR + 6)); g.rotate(lean * 0.5 + (pose.head || 0));
  const R = AD.HR;
  if (kind === "baba" || kind === "mama") {
    // платок
    roughPoly(g, [[-R * 1.2, R * 0.9], [-R * 1.25, -R * 0.4], [-R * 0.6, -R * 1.18], [R * 0.5, -R * 1.15], [R * 1.08, -R * 0.55], [R * 0.7, -R * 0.4], [-R * 0.3, R * 0.2], [-R * 0.2, R * 1.1]], seed + 50, 2.4);
    paint(g, c.scarf, seed + 51, 0.6, 0.8);
    g.fillStyle = css(c.dots); for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(-R * 0.9 + hash(i + seed) * R * 1.5, -R * 0.9 + hash(i * 3 + seed) * R * 1.6, 3, 0, TAU); g.fill(); }
  }
  roughEll(g, R * 0.12, R * 0.05, R * 0.92, R * 0.98, seed + 52, 0.02); paint(g, C.skin, seed + 53, 0.3, 0.3);
  if (kind === "baba") { brush(g, [[-R * 0.5, -R * 0.62], [R * 0.6, -R * 0.75]], 12, c.hair, seed + 54, 0.4); }
  if (kind === "mama") { brush(g, [[-R * 0.45, -R * 0.62], [R * 0.6, -R * 0.72]], 11, c.hair, seed + 54, 0.4); }
  if (kind === "ded") {
    roughEll(g, -R * 0.15, -R * 0.55, R * 0.95, R * 0.55, seed + 55, 0.1); paint(g, c.hair, seed + 56, 0, 0.5);
    roughPoly(g, [[R * 0.1, R * 0.2], [R * 0.95, R * 0.25], [R * 0.8, R * 1.2], [R * 0.3, R * 1.55], [-R * 0.1, R * 0.9]], seed + 57, 3); paint(g, c.beard, seed + 58, 1.5, 0.5);
  }
  g.save(); g.globalAlpha = 0.45; roughEll(g, R * 0.5, R * 0.3, R * 0.22, R * 0.15, seed + 59, 0.1); g.fillStyle = css(C.cheek); g.fill(); g.restore();
  g.strokeStyle = css(C.ink); g.fillStyle = css(C.ink); g.lineCap = "round"; g.lineWidth = 3.2;
  const ex = R * 0.5, ey = -R * 0.12;
  if ((pose.eyes || "open") !== "open" || (pose.blink || 0) > 0.5) { g.beginPath(); g.moveTo(ex - 6, ey + 1); g.quadraticCurveTo(ex, ey + 5, ex + 6, ey + 1); g.stroke(); }
  else { g.beginPath(); g.ellipse(ex, ey, 3.6, 4.6, 0, 0, TAU); g.fill(); }
  roughEll(g, R * 1.0, R * 0.1, 6.5, 6, seed + 60, 0.05); g.fillStyle = css(C.skinD); g.fill();
  if (kind !== "ded") { g.lineWidth = 3; g.beginPath(); g.arc(R * 0.6, R * 0.38, 8, 0.3 * Math.PI, 0.8 * Math.PI); g.stroke(); }
  g.restore();
  const near = arm(0);
  g.restore();
  // координаты кистей в экранных единицах родителя
  const tr = (p) => [x + p[0] * s * dir, y + p[1] * s];
  return { near: tr(near), far: tr(far) };
}

// ---------- Санки: деревянные планки, загнутые полозья. (x,y) — середина сиденья ----------
function drawSled(g, x, y, s, rot = 0, seed = 0, dir = 1) {
  g.save(); g.translate(x, y); g.scale(s * dir, s); g.rotate(rot);
  // полозья (дальний темнее)
  for (let i = 1; i >= 0; i--) {
    const dy = i ? -6 : 0, col = i ? C.umberD : C.umber;
    brush(g, [[-86, 24 + dy], [60, 24 + dy], [86, 14 + dy], [96, -4 + dy], [86, -14 + dy]], 7, col, seed + i, 0.4);
    brush(g, [[-60, 22 + dy], [-60, 4 + dy]], 6, col, seed + 3 + i, 0.4);
    brush(g, [[50, 22 + dy], [50, 4 + dy]], 6, col, seed + 5 + i, 0.4);
  }
  roughPoly(g, [[-80, -4], [76, -4], [76, 6], [-80, 6]], seed + 7, 1.5); paint(g, C.ochre, seed + 8, 0, 0.8);
  g.strokeStyle = css(C.umber); g.lineWidth = 2; for (let k = -60; k < 70; k += 26) { g.beginPath(); g.moveTo(k, -4); g.lineTo(k, 6); g.stroke(); }
  g.restore();
}

// ---------- Кот, свернувшийся клубком (лапы поджаты) ----------
function drawCat(g, x, y, s, t, seed = 0) {
  g.save(); g.translate(x, y); g.scale(s, s);
  const br = 1 + 0.03 * Math.sin(t * 2.2);
  roughEll(g, 0, -22 * br, 62, 30 * br, seed, 0.05); paint(g, [196, 120, 60], seed + 1, 0, 0.7);
  brush(g, [[-50, -8], [-10, 4], [40, -2]], 16, [196, 120, 60], seed + 2, 0.6); // хвост вокруг
  roughEll(g, 44, -30, 24, 20, seed + 3, 0.05); paint(g, [210, 136, 72], seed + 4, 0, 0.6);
  roughPoly(g, [[30, -44], [36, -64], [46, -46]], seed + 5, 1); paint(g, [196, 120, 60], seed + 6, 0, 0.4);
  roughPoly(g, [[50, -46], [62, -62], [62, -40]], seed + 7, 1); paint(g, [196, 120, 60], seed + 8, 0, 0.4);
  g.strokeStyle = css(C.ink); g.lineWidth = 2.4; g.lineCap = "round";
  g.beginPath(); g.arc(46, -30, 5, 0.1 * Math.PI, 0.9 * Math.PI); g.stroke();
  g.beginPath(); g.arc(58, -30, 4, 0.1 * Math.PI, 0.9 * Math.PI); g.stroke();
  for (const k of [-24, 0, 24]) brush(g, [[k - 8, -46], [k + 4, -38]], 5, [150, 84, 40], seed + k, 0.3);
  g.restore();
}

// ---------- Изба снаружи: брёвна, крыша со снегом, окно с наличником, дым ----------
function drawIzba(g, x, y, s, t, opt = {}, seed = 0) {
  const lit = opt.lit || 0, w = 300, hW = 170;
  g.save(); g.translate(x, y); g.scale(s, s);
  // сруб
  roughPoly(g, [[-w / 2, 0], [w / 2, 0], [w / 2, -hW], [-w / 2, -hW]], seed, 2); paint(g, opt.dusk ? mix(C.log, C.indigo, opt.dusk) : C.log, seed + 1, 0, 0.9);
  for (let k = 1; k < 7; k++) brush(g, [[-w / 2 - 6, -k * hW / 7], [w / 2 + 6, -k * hW / 7]], 5, opt.dusk ? mix(C.logD, C.indigoD, opt.dusk) : C.logD, seed + k, 0.4);
  // окно
  const wx = 0, wy = -hW * 0.55;
  roughPoly(g, [[wx - 44, wy - 46], [wx + 44, wy - 46], [wx + 44, wy + 40], [wx - 44, wy + 40]], seed + 10, 1.5); paint(g, C.white, seed + 11, 0, 0.4);
  roughPoly(g, [[wx - 34, wy - 36], [wx + 34, wy - 36], [wx + 34, wy + 30], [wx - 34, wy + 30]], seed + 12, 1);
  paint(g, mix(opt.dusk ? C.indigoD : C.indigo, C.amber, lit), seed + 13, 0, 0.5);
  if (lit > 0) { g.save(); g.globalAlpha = lit * 0.5; g.globalCompositeOperation = "lighter"; const gr = g.createRadialGradient(wx, wy, 10, wx, wy, 180); gr.addColorStop(0, "rgba(255,190,90,0.9)"); gr.addColorStop(1, "rgba(255,190,90,0)"); g.fillStyle = gr; g.fillRect(wx - 200, wy - 200, 400, 400); g.restore(); }
  g.strokeStyle = css(C.white); g.lineWidth = 5; g.beginPath(); g.moveTo(wx, wy - 36); g.lineTo(wx, wy + 30); g.moveTo(wx - 34, wy - 4); g.lineTo(wx + 34, wy - 4); g.stroke();
  roughPoly(g, [[wx - 54, wy - 46], [wx, wy - 78], [wx + 54, wy - 46]], seed + 14, 1.5); paint(g, C.white, seed + 15, 0, 0.4);
  // крыша со снегом
  roughPoly(g, [[-w / 2 - 34, -hW + 6], [0, -hW - 130], [w / 2 + 34, -hW + 6]], seed + 20, 3); paint(g, opt.dusk ? mix(C.umberD, C.indigoD, opt.dusk) : C.umberD, seed + 21, 0.7, 0.8);
  roughPoly(g, [[-w / 2 - 40, -hW + 2], [-w / 2 - 20, -hW - 14], [0, -hW - 138], [w / 2 + 20, -hW - 14], [w / 2 + 40, -hW + 2], [w / 2, -hW - 6], [0, -hW - 116], [-w / 2, -hW - 6]], seed + 22, 4);
  paint(g, opt.dusk ? mix(C.snow, C.snowD, opt.dusk) : C.snow, seed + 23, 0, 0.5);
  // труба и дым
  roughPoly(g, [[60, -hW - 70], [86, -hW - 70], [86, -hW - 120], [60, -hW - 120]], seed + 24, 1.5); paint(g, C.stoveD, seed + 25, 0, 0.6);
  if (opt.smoke !== 0) {
    for (let i = 0; i < 7; i++) {
      const u = ((t * 0.35 + i / 7) % 1), r = 14 + u * 40;
      g.save(); g.globalAlpha = (1 - u) * 0.55;
      roughEll(g, 73 + Math.sin(u * 5 + i) * 18 + u * (opt.wind || 30) * 3, -hW - 130 - u * 220, r, r * 0.8, seed + 30 + i, 0.15);
      paint(g, opt.dusk ? mix(C.white, C.violet, opt.dusk) : C.white, seed + i, 0, 0.3); g.restore();
    }
  }
  // сугроб у стены
  roughPoly(g, [[-w / 2 - 50, 4], [-w / 2 + 20, -26], [w / 2 - 30, -20], [w / 2 + 60, 4]], seed + 40, 4); paint(g, opt.dusk ? mix(C.snow, C.snowD, opt.dusk * 0.8) : C.snow, seed + 41, 0, 0.5);
  g.restore();
}
function drawPine(g, x, y, s, seed = 0, dusk = 0) {
  g.save(); g.translate(x, y); g.scale(s, s);
  brush(g, [[0, 0], [0, -40]], 14, mix(C.umberD, C.indigoD, dusk), seed, 0.3);
  const green = mix(C.pine, C.indigoD, dusk * 0.7), snow = mix(C.white, C.snowD, dusk);
  for (let k = 0; k < 4; k++) {
    const y0 = -30 - k * 60, wdt = 110 - k * 24;
    roughPoly(g, [[-wdt, y0], [0, y0 - 100], [wdt, y0]], seed + k * 7, 4); paint(g, green, seed + k, -0.3, 0.8);
    roughPoly(g, [[-wdt * 0.7, y0 - 24], [0, y0 - 98], [wdt * 0.55, y0 - 30], [0, y0 - 64]], seed + k * 9, 3); paint(g, snow, seed + k + 3, 0, 0.4);
  }
  g.restore();
}
function drawBirch(g, x, y, s, seed = 0, dusk = 0) {
  g.save(); g.translate(x, y); g.scale(s, s);
  const bark = mix(C.birch, C.snowD, dusk);
  brush(g, [[0, 0], [4, -200], [-2, -420]], 22, bark, seed, 0.4);
  g.fillStyle = css(C.birchD);
  for (let k = 0; k < 9; k++) { const yy = -30 - k * 44 - hash(k + seed) * 20; g.fillRect(-10 + hash(k * 3 + seed) * 8, yy, 8 + hash(k * 5 + seed) * 10, 4); }
  for (let k = 0; k < 6; k++) {
    const yy = -200 - k * 40, sg = k % 2 ? 1 : -1;
    taper(g, [[0, yy], [sg * 40, yy - 30], [sg * 90, yy - 40 + hash(k) * 30]], 6, 1.5, mix(C.umberD, C.indigoD, dusk), seed + k);
  }
  g.restore();
}
