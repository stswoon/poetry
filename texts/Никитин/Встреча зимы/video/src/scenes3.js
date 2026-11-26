// ---------- Страницы E (строфа 9), F (последняя строфа), обложки ----------

// ================= E1: раздолье — Зима делает петлю над полем =================
function sceneE1(g, t, w, h) {
  sky(g, w, h, [70, 180, 240], [200, 236, 252], C.cyan, 2.4);
  shape(g, rect(-10, h * 0.78, w + 20, h * 0.3), C.white, { lw: 4.5, shade: { fn: rect(-10, h * 0.86, w + 20, 60), col: C.cyanL, r: 2.4, cell: 9 } });
  for (let i = 0; i < 8; i++) fir(g, 20 + i * 80, h * 0.8, 0.45 + 0.15 * hash(i), { snowy: true });
  // петля: центр, радиус; угол растёт со временем
  const u = inv(EV.L33 - 0.5, EV.E34 + 0.3, t), a = -Math.PI / 2 + u * TAU * 1.15;
  const cx = w * 0.5, cy = h * 0.42, R = 150;
  // след петли
  g.save(); g.lineCap = "round";
  for (let i = 0; i < 30; i++) {
    const a2 = a - i * 0.09; if (a2 < -Math.PI / 2) break;
    g.globalAlpha = 1 - i / 30; g.lineWidth = 16 - i * 0.4; g.strokeStyle = css(PRINT[i % 3]);
    g.beginPath(); g.arc(cx, cy, R, a2 - 0.09, a2); g.stroke();
  }
  g.restore();
  const zx = cx + Math.cos(a) * R, zy = cy + Math.sin(a) * R;
  drawZimaFly(g, zx, zy, 0.6, t, { rot: a + Math.PI / 2, mouth: "open" });
  sfx(g, "ВЖУХ!", w * 0.3, h * 0.84, 70, -0.1, C.yel, spr(t, EV.gulyai - 0.2, 0.6), 1 - inv(EV.L35 - 0.3, EV.L35, t), C.mag);
}

// ================= E2: ледяной луч строит мост через реку =================
function sceneE2(g, t, w, h) {
  sky(g, w, h, [70, 180, 240], [200, 236, 252], C.cyan, 2.2);
  for (let i = 0; i < 14; i++) fir(g, w * 0.55 + i * 50, h * 0.5, 0.5 + 0.2 * hash(i), { snowy: true });
  // берега и река подо льдом
  shape(g, rect(-10, h * 0.5, w + 20, h * 0.6), C.white, { lw: 4.5 });
  shape(g, (gg) => { gg.moveTo(w * 0.36, h * 0.5); gg.lineTo(w * 0.62, h * 0.5); gg.lineTo(w * 0.7, h + 10); gg.lineTo(w * 0.3, h + 10); gg.closePath(); }, C.cyanL,
    { lw: 4.5, shade: { fn: rect(w * 0.3, h * 0.5, w * 0.4, h), col: C.cyan, r: 2.8, cell: 10 } });
  // мост вырастает по дуге слева направо
  const b = easeOut(inv(EV.mosty - 0.1, EV.rekam + 0.5, t));
  const x0 = w * 0.26, x1 = w * 0.74, yb = h * 0.74;
  const P = (u) => [lerp(x0, x1, u), yb - Math.sin(u * Math.PI) * 120];
  if (b > 0) {
    g.save(); g.lineCap = "round"; g.lineJoin = "round";
    g.beginPath(); for (let i = 0; i <= 40 * b; i++) { const p = P(i / 40); i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }
    g.lineWidth = 48; g.strokeStyle = INK; g.stroke(); g.lineWidth = 38; g.strokeStyle = css(C.cyanL); g.stroke();
    g.lineWidth = 6; g.strokeStyle = "#fff"; g.stroke();
    // ледяные опоры-сосульки
    for (let i = 1; i < 6; i++) { const u = i / 6; if (u > b) break; const p = P(u); shape(g, poly([[p[0] - 12, p[1] + 16], [p[0] + 12, p[1] + 16], [p[0], p[1] + 70 - Math.abs(u - 0.5) * 80]]), C.white, { lw: 3.5, reg: 0 }); }
    g.restore();
  }
  // Зима слева указывает; луч от руки к концу моста
  const zx = w * 0.13, zy = h * 0.66 + Math.sin(t * 2) * 6;
  drawZimaFront(g, zx, zy, 0.62, ZIMA_POSES.point, t, { mouth: "laugh" });
  const hand = [zx + (42 + Math.sin(1.55) * 62 + Math.sin(1.6) * 56) * 0.62, zy + (-290 + Math.cos(1.55) * 62 + Math.cos(1.6) * 56) * 0.62];
  if (b > 0 && b < 1) {
    const tip = P(b);
    g.save(); g.lineCap = "round";
    for (const [lw, c] of [[22, INK], [14, css(C.cyanL)], [5, "#fff"]]) { g.beginPath(); g.moveTo(hand[0], hand[1]); for (let i = 1; i <= 6; i++) { const u = i / 6; g.lineTo(lerp(hand[0], tip[0], u) + (i < 6 ? Math.sin(t * 40 + i) * 10 : 0), lerp(hand[1], tip[1], u) + (i < 6 ? Math.cos(t * 37 + i) * 10 : 0)); } g.lineWidth = lw; g.strokeStyle = c; g.stroke(); }
    g.restore();
    spark(g, tip[0], tip[1], 34, C.white, 1);
  }
  sfx(g, "ВЖУХ!", w * 0.5, h * 0.22, 100, -0.06, C.white, spr(t, EV.mosty, 0.6), 1 - inv(EV.L36 - 0.2, EV.L36 + 0.2, t), C.cyanD);
}

// ================= E3: Зима раскатывает снежный ковёр =================
function sceneE3(g, t, w, h) {
  sky(g, w, h, [70, 180, 240], [200, 236, 252], C.cyan, 2.2);
  for (let i = 0; i < 24; i++) fir(g, 20 + i * 80, h * 0.5, 0.5 + 0.2 * hash(i * 3), { snowy: true });
  // поле — ещё местами бурое, ковёр закрывает его
  shape(g, rect(-10, h * 0.48, w + 20, h * 0.6), [170, 150, 120], { lw: 4.5, shade: { fn: rect(-10, h * 0.48, w + 20, h), col: C.mudD, r: 2.6, cell: 10 } });
  const u = easeOut(inv(EV.kovry - 0.4, EV.E36 + 0.8, t));
  const xs = w * 0.2, xe = lerp(xs, w + 120, u), ytop = h * 0.56, yb = h * 0.98;
  // раскатанная часть ковра: белая с голубым узором-снежинками и каймой
  if (xe > xs + 4) {
    shape(g, poly([[xs, ytop], [xe, ytop], [xe + 40, yb], [xs - 60, yb]]), C.white, { lw: 5 });
    g.save(); g.beginPath(); g.rect(xs - 60, ytop, xe - xs + 100, yb - ytop); g.clip();
    for (let i = 0; i < 14; i++) { const x = xs + 60 + i * 130; if (x > xe) break; snowflake(g, x, (ytop + yb) / 2, 32, C.cyan, 3.5); }
    for (const yy of [ytop + 18, yb - 18]) { g.beginPath(); for (let x = xs - 60; x < xe + 40; x += 30) g.lineTo(x, yy + (x / 30 % 2 ? -8 : 8)); g.lineWidth = 5; g.strokeStyle = css(C.mag); g.stroke(); }
    g.restore();
  }
  // рулон катится
  if (u < 1) {
    const rx = xe + 24, ry = (ytop + yb) / 2 + 10, rr = lerp(80, 30, u);
    g.save(); g.translate(rx, ry); g.rotate(t * 8);
    shape(g, circ(0, 0, rr), C.white, { lw: 5 });
    g.beginPath(); for (let a = 0; a < 6 * TAU; a += 0.2) { const r = rr * a / (6 * TAU); g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.lineWidth = 3.5; g.strokeStyle = css(C.cyanD); g.stroke();
    g.restore();
  }
  // Зима толкает обеими руками
  drawZimaFront(g, w * 0.1, h * 0.86 + Math.sin(t * 2) * 6, 0.62, poseAt([[0, ZIMA_POSES.open], [EV.kovry - 0.35, ZIMA_POSES.push]], t, 0.3), t, { mouth: "laugh" });
}

// ================= F1: жгучий холод — а деду всё нипочём: «Ничего!» =================
function sceneF1(g, t, w, h) {
  sky(g, w, h, [100, 190, 240], [214, 240, 252], C.cyan, 2.6);
  for (let i = 0; i < 22; i++) fir(g, -20 + i * 90, h * 0.6, 0.6 + 0.25 * hash(i * 9), { snowy: true });
  shape(g, rect(-10, h * 0.6, w + 20, h * 0.5), C.white, { lw: 4.5, shade: { fn: rect(-10, h * 0.7, w + 20, h), col: C.cyanL, r: 2.6, cell: 10, a: 0.7 } });
  const blow = win(t, EV.pahnul - 0.4, EV.E39 + 0.3, 0.3, 0.6);
  // Зима слева дует
  const zx = w * 0.2, zy = h * 0.8 + Math.sin(t * 2) * 6;
  const zP = poseAt([[0, ZIMA_POSES.laugh], [EV.zhguchiy - 0.3, ZIMA_POSES.blow], [EV.E39 + 0.3, ZIMA_POSES.laugh]], t, 0.3);
  drawZimaFront(g, zx, zy, 1.15, zP, t, { mouth: t > EV.nichego ? "laugh" : "lips", eyes: t > EV.nichego + 0.3 ? "happy" : undefined });
  // поток холода: завитки и снег слева направо
  if (blow > 0) {
    for (let i = 0; i < 16; i++) {
      const ph = (t * 1.3 + hash(i)) % 1, x = zx + 120 + ph * (w * 0.55), y = zy - 400 + 90 * Math.sin(i * 1.7) + 30 * Math.sin(t * 4 + i);
      g.save(); g.globalAlpha = blow * Math.sin(ph * Math.PI);
      g.lineWidth = 7; g.strokeStyle = css(C.cyanL); g.lineCap = "round";
      g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + 60, y - 30, x + 110, y + 30, x + 170, y); g.stroke(); g.lineWidth = 2.5; g.strokeStyle = INK; g.stroke();
      g.restore();
    }
    snow(g, w, h * 0.9, t * 3, 50, blow, 6, 31, 120);
  }
  // дед справа: сугроб растёт до колен
  const dx = w * 0.62, dy = h * 0.92;
  const dP = poseAt([[0, DED_POSES.brace], [EV.nichego - 0.5, DED_POSES.thumb]], t, 0.3);
  drawDed(g, dx, dy, 1.25, { ...dP, cold: blow > 0.3 && t < EV.vse ? 1 : 0 }, t, { wind: blow, thumb: t > EV.nichego - 0.3, speak: t > EV.govorit && t < EV.E40 + 0.3, eyes: t > EV.vse ? "happy" : "open" });
  const drift = easeOut(inv(EV.kolen - 0.6, EV.snegu + 0.5, t));
  if (drift > 0) shape(g, (gg) => { const hh = 24 + 74 * drift; gg.moveTo(dx - 210, dy + 10); gg.quadraticCurveTo(dx - 150, dy - hh, dx - 40, dy - hh * 0.92); gg.quadraticCurveTo(dx + 60, dy - hh * 1.08, dx + 140, dy - hh * 0.9); gg.quadraticCurveTo(dx + 210, dy - hh * 0.5, dx + 240, dy + 10); gg.closePath(); }, C.white,
    { lw: 5, shade: { fn: rect(dx - 220, dy - 60, 470, 80), col: C.cyanL, r: 2.6, cell: 9 } });
  // мальчик хохочет справа
  const laugh = t > EV.nichego;
  drawBoy(g, w * 0.88, h * 0.92 + (laugh ? -Math.abs(Math.sin(t * 8)) * 10 : 0), 0.9, laugh ? BOY_POSES.belly : BOY_POSES.stand, { mouth: laugh ? "laugh" : "o", eyes: laugh ? "happy" : "wide", brow: 0.8 });
  sfx(g, "ФУ-У-УХ!", w * 0.4, h * 0.2, 110, -0.1, C.cyanL, spr(t, EV.pahnul - 0.1, 0.6), 1 - inv(EV.L38 + 0.3, EV.L38 + 0.8, t), C.cyanD);
  balloon(g, w * 0.78, h * 0.16, 400, 170, "НИЧЕГО!", 74, [dx + 40, dy - 520], spr(t, EV.nichego - 0.05, 0.5), C.yelL, "ComicSfx");
}

// ================= Обложка выпуска (вступление) и задняя обложка (финал) =================
function titleBlock(g, t, x, y, size, k, t0) {
  // ВСТРЕЧА ЗИМЫ: буквы влетают по одной, объём и растровая тень; в покое — целые координаты
  const words = ["ВСТРЕЧА", "ЗИМЫ"];
  g.save(); g.textBaseline = "alphabetic"; g.font = `${size}px ComicTitle`; g.lineJoin = "round";
  words.forEach((wd, wi) => {
    const yy = Math.round(y + wi * size * 1.02), tw = g.measureText(wd).width;
    let cx = Math.round(x - tw / 2);
    [...wd].forEach((ch, ci) => {
      const cw = g.measureText(ch).width, kk = t0 === null ? 1 : spr(t, t0 + (wi * 7 + ci) * 0.06, 0.55);
      if (kk > 0.01) {
        const settled = kk > 0.995 && Math.abs(kk - 1) < 0.005;
        g.save(); g.translate(Math.round(cx + cw / 2), yy); if (!settled) { g.scale(kk, kk); g.rotate((1 - kk) * 0.6); }
        const d = Math.round(size * 0.07);
        for (let i = d; i >= 1; i--) { g.fillStyle = css(C.cyanD); g.fillText(ch, -cw / 2 + i, i); }
        g.fillStyle = dots(g, C.ink, 2.2, 7, 45, 0.9); g.fillText(ch, -cw / 2 + d, d);
        g.lineWidth = Math.round(size * 0.09); g.strokeStyle = INK; g.strokeText(ch, -cw / 2, 0);
        g.fillStyle = css(wi ? C.white : C.yel); g.fillText(ch, -cw / 2, 0);
        g.lineWidth = Math.max(2, Math.round(size * 0.03)); g.strokeText(ch, -cw / 2, 0);
        g.restore();
      }
      cx += cw;
    });
  });
  g.restore();
}
function authorTag(g, x, y, k, rot = -0.03) {
  if (k <= 0.01) return;
  g.save(); g.translate(Math.round(x), Math.round(y)); if (k < 0.995) { g.scale(k, k); g.rotate(rot); }
  g.font = "50px ComicAuth"; g.textAlign = "center"; g.textBaseline = "middle";
  const s = "ИВАН САВВИЧ НИКИТИН · 1854", tw = g.measureText(s).width;
  shape(g, rect(-tw / 2 - 30, -40, tw + 60, 80), C.mag, { lw: 6, reg: 5 });
  g.fillStyle = "#fff"; g.fillText(s, 0, 2);
  g.restore();
}
function sceneCover(g, t, w, h) {
  // обложка: лучи-растр, дождь начинается, капля летит в окно
  sky(g, w, h, [120, 140, 176], [176, 190, 214], null);
  g.save(); g.translate(w * 0.5, h * 0.62);
  for (let i = 0; i < 28; i++) { g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 1500, i / 28 * TAU - t * 0.08, (i + 0.5) / 28 * TAU - t * 0.08); g.closePath(); g.fillStyle = dots(g, C.cyanD, 3.4, 12, 45, 0.5); g.fill(); }
  g.restore();
  // деревня внизу
  for (let i = 0; i < 5; i++) hut(g, 200 + i * 380, h * 0.98, 1.05 + 0.1 * hash(i), { roof: [[150, 60, 60], [80, 100, 150]][i % 2], lit: i === 2 });
  titleBlock(g, t, w * 0.5, h * 0.33, 230, 1, 0.15);
  authorTag(g, w * 0.5, h * 0.66, spr(t, 1.0, 0.6));
  // плашка «выпуск»
  g.save(); g.translate(150, 130); g.rotate(-0.12); shape(g, burstP(0, 0, 80, 110, 14, 2), C.yel, { lw: 5 });
  g.font = "34px ComicSfx"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = INK; g.fillText("ВЫПУСК", 0, -16); g.font = "52px ComicSfx"; g.fillText("№ 1", 0, 24); g.restore();
  rain(g, w, h, t, Math.round(80 * inv(1.6, 3.0, t)), 0.9, 0.18, 13);
}
function sceneBack(g, t, w, h) {
  sky(g, w, h, [70, 180, 240], [210, 240, 252], null);
  g.save(); g.translate(w * 0.5, h * 0.4);
  for (let i = 0; i < 28; i++) { g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 1500, i / 28 * TAU + t * 0.06, (i + 0.5) / 28 * TAU + t * 0.06); g.closePath(); g.fillStyle = dots(g, C.cyan, 3.4, 12, 45, 0.55); g.fill(); }
  g.restore();
  shape(g, rect(-10, h * 0.8, w + 20, h * 0.3), C.white, { lw: 5, shade: { fn: rect(-10, h * 0.88, w + 20, 80), col: C.cyanL, r: 2.6, cell: 9 } });
  for (let i = 0; i < 5; i++) hut(g, 160 + i * 400, h * 0.84, 0.9, { roof: [[150, 60, 60], [80, 100, 150]][i % 2], snowy: 1, lit: i % 2, smoke: true, t, wind: 0.1 });
  // герои внизу: мальчик, Зима, дед
  drawBoy(g, w * 0.16, h * 0.97, 0.75, BOY_POSES.wave, { mouth: "laugh", eyes: "happy", brow: 0.8 });
  drawDed(g, w * 0.84, h * 0.97, 0.7, DED_POSES.thumb, t, { thumb: true, eyes: "happy" });
  drawZimaFly(g, lerp(-300, w + 300, ((t - EV.fin) / 9) % 1), 76, 0.62, t, { mouth: "open" });   // над заголовком, не под плашкой с именем
  snow(g, w, h, t, 60, 1, 7, 41, 30);
}
