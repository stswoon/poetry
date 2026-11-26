// ---------- Страницы C (строфы 5–7) и D (строфа 8) ----------
// искра: четырёхлучевая звезда цвета печати
function spark(g, x, y, r, col, k = 1) {
  if (k <= 0.01) return;
  shape(g, (gg) => { for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, rr = i % 2 ? r * 0.28 * k : r * k; i ? gg.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : gg.moveTo(x + rr, y); } gg.closePath(); }, col, { lw: 3, reg: 0 });
}
const PRINT = [C.cyan, C.mag, C.yel];

// ================= C1: снег полотном на дворах и домах, блестит разноцветным огнём =================
function sceneC1(g, t, w, h) {
  sky(g, w, h, [70, 180, 240], [190, 232, 250], C.cyan, 2.4);
  // солнце в углу
  g.save(); g.translate(w * 0.06, h * 0.16); g.rotate(t * 0.3); shape(g, burstP(0, 0, 60, 110, 14, 3), C.yel, { lw: 4 }); g.restore();
  shape(g, circ(w * 0.06, h * 0.16, 52), [255, 190, 0], { lw: 4 });
  const cover = easeOut(inv(EV.polotnom - 0.6, EV.polotnom + 0.6, t));
  // избы рядом: снег «стелется» по крышам слева направо
  for (let i = 0; i < 7; i++) {
    const x = 170 + i * 250, s = 0.95 + 0.15 * hash(i);
    const sn = clamp(cover * 1.6 - i * 0.09);
    hut(g, x, h * 0.86, s, { roof: [[160, 60, 60], [80, 100, 150], [150, 90, 40]][i % 3], snowy: sn, lit: i % 2, smoke: i % 3 === 0, t, wind: 0.1 });
  }
  // двор — белое полотно с растровой тенью, сугробы
  shape(g, (gg) => { gg.moveTo(-10, h * 0.86); for (let i = 0; i <= 12; i++) gg.lineTo(i * w / 12, h * (0.85 + 0.03 * Math.sin(i * 1.7))); gg.lineTo(w + 10, h + 10); gg.lineTo(-10, h + 10); gg.closePath(); }, C.white,
    { lw: 4.5, shade: { fn: rect(-10, h * 0.92, w + 20, 60), col: C.cyanL, r: 2.6, cell: 9 } });
  // искры CMY на снегу — вспыхивают и гаснут
  const on = inv(EV.blestit - 0.3, EV.blestit + 0.2, t);
  for (let i = 0; i < 46; i++) {
    const x = hash(i * 1.9) * w, y = i % 3 === 0 ? h * (0.88 + 0.1 * hash(i * 2.2)) : h * (0.55 + 0.2 * hash(i * 3.3));
    const ph = (t * (0.9 + hash(i)) + hash(i * 7)) % 1, k = on * Math.max(0, Math.sin(ph * Math.PI)) * (t > EV.raznocv - 0.2 ? 1.25 : 0.9);
    spark(g, x, y, 13 + 10 * hash(i * 5), PRINT[i % 3], k);
  }
}

// ================= C2: лес смотрит весело из-под чёрных кудрей =================
function sceneC2(g, t, w, h) {
  sky(g, w, h, [90, 196, 244], [206, 238, 252], C.cyan, 2.2);
  // безлюдный простор побелевших полей
  shape(g, rect(-10, h * 0.6, w + 20, h * 0.5), C.white, { lw: 4.5, shade: { fn: (gg) => { for (let i = 0; i < 5; i++) gg.rect(-10, h * (0.66 + i * 0.07), w + 20, 10 + i * 4); }, col: C.cyanL, r: 2.4, cell: 9 } });
  // лес — лицо: кудри из чёрных крон, под ними глаза
  const fx = w * 0.5, fy = h * 0.46, wake = spr(t, EV.veselo - 0.3, 0.8);
  // нижние ели в снегу
  for (let i = 0; i < 16; i++) fir(g, -20 + i * 75, h * 0.64, 0.75 + 0.2 * hash(i), { snowy: true, col: [30, 70, 60] });
  // «чёрные кудри»: тёмные кроны-завитки над глазами, общий контур и спирали-блики
  const CURLS = [];
  for (let i = 0; i < 13; i++) {
    const a = Math.PI * (1.05 + 0.9 * i / 12), r0 = 250 + 18 * Math.sin(i * 2.1);
    const x = fx + Math.cos(a) * r0 * 1.5, y = fy + 90 + Math.sin(a) * r0 * 0.75 + Math.sin(t * 2 + i) * 4;
    CURLS.push([x, y, 58 + 10 * hash(i), i]);
  }
  shape(g, (gg) => { for (const [x, y, r] of CURLS) { gg.moveTo(x + r, y); gg.arc(x, y, r, 0, TAU); } }, [30, 32, 44], { union: true, lw: 4.5, shade: { fn: (gg) => { for (const [x, y, r] of CURLS) { gg.moveTo(x + r, y + 10); gg.arc(x, y + 10, r * 0.8, 0, Math.PI); } }, col: C.cyan, r: 2.2, cell: 8, a: 0.6 } });
  for (const [x, y, r, i] of CURLS) {
    g.beginPath(); for (let a = 0; a < 3.2 * Math.PI; a += 0.2) { const rr = r * 0.62 * (1 - a / (3.6 * Math.PI)); g.lineTo(x + Math.cos(a + i) * rr, y + Math.sin(a + i) * rr * 0.9); }
    g.lineWidth = 5; g.strokeStyle = css([120, 130, 170]); g.lineCap = "round"; g.stroke();
    if (i % 2) shape(g, ell(x - 4, y - r * 0.8, r * 0.55, 11), C.white, { lw: 3, reg: 0 });
  }
  // глаза моргают и смотрят по сторонам
  const blink = (t % 3.1) < 0.12 ? 0.15 : 1, look = Math.sin(t * 0.9) * 0.8;
  for (const sd of [-1, 1]) {
    shape(g, ell(fx + sd * 110, fy + 40, 52, 60 * blink * (0.4 + 0.6 * wake)), C.white, { lw: 5, reg: 0 });
    if (blink > 0.5) { g.beginPath(); g.arc(fx + sd * 110 + look * 16, fy + 50, 24, 0, TAU); g.fillStyle = INK; g.fill(); g.beginPath(); g.arc(fx + sd * 110 + look * 16 + 9, fy + 42, 8, 0, TAU); g.fillStyle = "#fff"; g.fill(); }
    halftone(g, circ(fx + sd * 190, fy + 120, 34), C.mag, 3, 9, 30, wake * 0.9);
  }
  // улыбка шире, когда «рад»
  const grin = lerp(0.3, 1, spr(t, EV.rad - 0.2, 0.7)) * wake;
  if (grin > 0.08) shape(g, (gg) => { gg.moveTo(fx - 130 * grin, fy + 130); gg.quadraticCurveTo(fx, fy + 130 + 110 * grin, fx + 130 * grin, fy + 130); gg.quadraticCurveTo(fx, fy + 150 + 40 * grin, fx - 130 * grin, fy + 130); gg.closePath(); }, [180, 30, 60], { lw: 5 });
  if (t > EV.rad - 0.2) sfx(g, "ХА-ХА!", w * 0.84, h * 0.18, 64, 0.2, C.yel, spr(t, EV.rad, 0.6), 1 - inv(EV.berez - 0.2, EV.berez + 0.2, t), C.mag);
}

// ================= C3: на ветках берёз, как алмазы, горят капли =================
function sceneC3(g, t, w, h) {
  sky(g, w, h, [120, 200, 246], [220, 242, 252], C.cyan, 2);
  // ствол берёзы и ветки
  shape(g, (gg) => { gg.moveTo(w * 0.12, h + 10); gg.lineTo(w * 0.2, -10); gg.lineTo(w * 0.3, -10); gg.lineTo(w * 0.26, h + 10); gg.closePath(); }, C.white, { lw: 5 });
  for (let k = 0; k < 8; k++) { const y = 40 + k * 70; g.fillStyle = INK; g.fillRect(w * 0.18 + k % 2 * 18, y, 26, 7); }
  const boughs = [[w * 0.24, h * 0.22, w * 0.95, h * 0.3], [w * 0.22, h * 0.52, w * 0.92, h * 0.62], [w * 0.2, h * 0.8, w * 0.82, h * 0.92]];
  const glow = inv(EV.almazy - 0.3, EV.goryat + 0.2, t);
  boughs.forEach(([x0, y0, x1, y1], bi) => {
    const sway = Math.sin(t * 1.4 + bi) * 6;
    g.lineCap = "round";
    g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2, y0 - 40 + sway, x1, y1 + sway); g.lineWidth = 16; g.strokeStyle = INK; g.stroke();
    g.lineWidth = 9; g.strokeStyle = css([120, 80, 60]); g.stroke();
    // свисающие веточки с каплями
    for (let k = 0; k < 6; k++) {
      const u = 0.15 + k * 0.15, bx = lerp(x0, x1, u), by = lerp(y0, y1, u) - 40 * Math.sin(u * Math.PI) + sway * u;
      const tx = bx + 10, ty = by + 60 + 20 * hash(bi * 10 + k);
      inkLine(g, [[bx, by], [bx + 6, by + 30], [tx, ty]], 4);
      // капля → алмаз
      const d = glow, s0 = 1 + 0.15 * Math.sin(t * 5 + k + bi);
      g.save(); g.translate(tx, ty + 18); g.scale(s0, s0);
      if (d < 0.5) shape(g, (gg) => { gg.moveTo(0, -16); gg.quadraticCurveTo(13, 4, 0, 12); gg.quadraticCurveTo(-13, 4, 0, -16); }, C.cyanL, { lw: 3.5, reg: 0 });
      else {
        shape(g, poly([[-16, -6], [-8, -16], [8, -16], [16, -6], [0, 18]]), mix(C.cyanL, PRINT[(k + bi) % 3], 0.35), { lw: 3.5, reg: 0 });
        g.beginPath(); g.moveTo(-16, -6); g.lineTo(16, -6); g.moveTo(-8, -16); g.lineTo(-4, -6); g.lineTo(0, 18); g.moveTo(8, -16); g.lineTo(4, -6); g.lineWidth = 2; g.strokeStyle = INK; g.stroke();
      }
      g.restore();
      const ph = (t * 1.3 + hash(bi * 7 + k)) % 1;
      if (d > 0.5) spark(g, tx + 14, ty + 4, 16, PRINT[(k + bi + 1) % 3], Math.max(0, Math.sin(ph * Math.PI)) * d);
    }
  });
  sfx(g, "БЛЕСК!", w * 0.62, h * 0.12, 62, 0.08, C.yel, spr(t, EV.goryat, 0.6), 1 - inv(EV.L29 - 1.0, EV.L29 - 0.5, t), C.cyanD);
}

// ================= D1: разворот — Зима прилетает, её встречают хлебом-солью =================
function sceneD1(g, t, w, h) {
  // фон: растровые лучи из центра
  sky(g, w, h, [80, 190, 246], [210, 240, 252], null);
  g.save(); g.translate(w * 0.5, h * 0.35);
  for (let i = 0; i < 24; i++) { g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 1600, i / 24 * TAU + t * 0.05, (i + 0.5) / 24 * TAU + t * 0.05); g.closePath(); g.fillStyle = dots(g, C.cyan, 3.2, 12, 45, 0.55); g.fill(); }
  g.restore();
  // линии скорости — в небе, за ёлками
  { const k0 = spr(t, EV.L29 - 0.4, 0.7), zy0 = lerp(-300, h * 0.7, k0); speedLines(g, w * 0.5, zy0 - 200, 260, 900, 30, 3, t, 0.35 * win(t, EV.L29 - 0.4, EV.L30 + 0.3, 0.2, 0.5)); }
  // снежная земля и ёлки
  for (let i = 0; i < 20; i++) fir(g, -20 + i * 100, h * 0.82, 0.6 + 0.25 * hash(i * 4), { snowy: true });
  shape(g, rect(-10, h * 0.8, w + 20, h * 0.3), C.white, { lw: 4.5, shade: { fn: rect(-10, h * 0.9, w + 20, 80), col: C.cyanL, r: 2.6, cell: 9 } });
  // Зима: влетает сверху на пружине и парит
  const k = spr(t, EV.L29 - 0.4, 0.7), zx = w * 0.5, zy = lerp(-300, h * 0.7, k) + Math.sin(t * 2) * 8;
  drawZimaFront(g, zx, zy, 1.05, ZIMA_POSES.open, t, { mouth: t > EV.prosim ? "laugh" : "lips", eyes: "open" });
  // мальчик машет слева, дед с хлебом-солью справа; на «Просим» дед кланяется
  drawBoy(g, w * 0.2, h * 0.9, 0.95, poseAt([[0, BOY_POSES.stand], [EV.L29 - 0.3, BOY_POSES.wave], [EV.prosim + 0.3, BOY_POSES.hooray]], t, 0.35), { mouth: "laugh", eyes: "happy", brow: 0.8 });
  const bow = Math.sin(clamp((t - EV.prosim + 0.1) / 1.2) * Math.PI) * 0.18;
  g.save(); g.translate(w * 0.8, h * 0.92); g.rotate(-bow); drawDed(g, 0, 0, 0.9, DED_POSES.bread, t, { bread: true, eyes: "happy" }); g.restore();
  balloon(g, w * 0.2, h * 0.2, 470, 150, "Здравствуй,\nгостья-зима!", 46, [w * 0.2, h * 0.5], spr(t, EV.zdrav - 0.1, 0.5));
}

// ================= D2: Зима поёт песни севера по лесам и степям =================
function sceneD2(g, t, w, h) {
  sky(g, w, h, [70, 170, 236], [200, 236, 252], C.cyan, 2.2);
  // слева — лес, справа — степь (ровная, с ковылём под снегом)
  for (let i = 0; i < 12; i++) fir(g, 40 + i * 70, h * 0.92, 0.7 + 0.3 * hash(i), { snowy: true });
  shape(g, (gg) => { gg.moveTo(-10, h * 0.9); gg.lineTo(w * 0.5, h * 0.9); gg.quadraticCurveTo(w * 0.75, h * 0.78, w + 10, h * 0.84); gg.lineTo(w + 10, h + 10); gg.lineTo(-10, h + 10); gg.closePath(); }, C.white,
    { lw: 4.5, shade: { fn: rect(-10, h * 0.94, w + 20, 40), col: C.cyanL, r: 2.4, cell: 9 } });
  for (let i = 0; i < 18; i++) { const x = w * 0.55 + i * 46; inkLine(g, [[x, h * 0.86], [x + 6, h * 0.8], [x + 14, h * 0.76]], 3); }
  // Зима летит слева направо через всю панель
  const u = inv(EV.L31 - 0.6, EV.E32 + 0.6, t), zx = lerp(-120, w + 160, easeIO(u) * 0.7 + u * 0.3), zy = h * 0.42 + Math.sin(t * 3) * 14;
  // ноты-снежинки тянутся шлейфом
  for (let i = 0; i < 12; i++) {
    const lag = i * 0.12, uu = inv(EV.L31 - 0.6, EV.E32 + 0.6, t - lag), x = lerp(-120, w + 160, easeIO(uu) * 0.7 + uu * 0.3) - 40, y = h * 0.42 + Math.sin((t - lag) * 3) * 14 + Math.sin(i * 1.3 + t * 4) * 30;
    if (uu <= 0 || uu >= 1) continue;
    g.save(); g.globalAlpha = 1 - i / 12;
    if (i % 2) snowflake(g, x, y, 14, PRINT[i % 3], 2.5);
    else { g.font = "54px ComicSfx"; g.textAlign = "center"; g.textBaseline = "middle"; g.lineWidth = 7; g.strokeStyle = INK; g.strokeText("♪", x, y); g.fillStyle = css(PRINT[i % 3]); g.fillText("♪", x, y); }
    g.restore();
  }
  drawZimaFly(g, zx, zy, 0.85, t, { mouth: "open" });
}
