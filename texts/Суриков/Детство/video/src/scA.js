// ---------- Сцены 0–1: вершина горы (титр) и спуск от первого лица до «хлоп!» ----------
// холмы и лес вдали (полоса у горизонта), x0 — параллакс
function farHills(g, hz, x0, dusk = 0, seed = 0) {
  roughPoly(g, [[-200, hz + 30], [-200, hz - 40], [300 + x0 * 0.2, hz - 90], [800 + x0 * 0.2, hz - 50], [1300 + x0 * 0.2, hz - 110], [2100, hz - 40], [2100, hz + 30]], seed, 6);
  paint(g, mix([150, 170, 200], C.violet, dusk), seed + 1, 0, 0.6);
  // кромка леса
  g.save();
  for (let i = 0; i < 70; i++) {
    const x = -100 + i * 32 + x0 * 0.35, hgt = 26 + hash(i + seed) * 30;
    roughPoly(g, [[x - 16, hz + 6], [x, hz - hgt], [x + 16, hz + 6]], seed + i, 2);
    paint(g, mix([90, 120, 130], C.indigoD, dusk), seed + i, 0, 0.4);
  }
  g.restore();
}

// ---- Сцена 0: вершина горы сбоку, мальчик на санках машет в камеру; титр ----
function scene0(g, t) {
  const t0 = 0, tEnd = EV.L1;
  const push = easeIn(inv(tEnd - 0.7, tEnd, t));             // санки трогаются
  const cx = lerp(0, 60, inv(0, tEnd, t)) + push * 200;       // проводка камеры
  const z = lerp(1.0, 1.1, ease(inv(0, tEnd, t)));
  const [sx, sy] = shake(t, 2.5, 3);
  skyFill(g, 0, 0, W, H, C.skyL, C.skyW, 11, 0.5);
  // солнце
  roughEll(g, 1500, 230, 70, 70, 5, 0.04); paint(g, [255, 236, 190], 6, 0, 0.3);
  g.save();
  g.translate(W / 2 + sx, H / 2 + sy); g.scale(z, z); g.translate(-W / 2 - cx, -H / 2);
  farHills(g, 640, -cx, 0, 20);
  // деревня внизу (далеко справа)
  for (let i = 0; i < 6; i++) drawIzba(g, 1250 + i * 130, 690 + (i % 2) * 14, 0.22, t, { smoke: 1, wind: 20 }, 300 + i * 13);
  // склон горы: вершина слева, склон уходит вправо вниз
  roughPoly(g, [[-300, 830], [900, 826], [1180, 860], [1600, 1000], [2300, 1200], [-300, 1200]], 40, 5);
  paint(g, C.snow, 41, 0.1, 0.6);
  brush(g, [[900, 836], [1180, 868], [1600, 1004], [2300, 1200]], 18, C.snowS, 42, 0.5, 0.7); // тень кромки
  // берёзы на вершине
  drawBirch(g, 60, 860, 1.5, 50); drawPine(g, -60, 880, 1.5, 60);
  // мальчик на санках у кромки, лицом вправо (вниз по склону)
  const sledX = 780 + push * 300, sledY = 790 + push * 60;
  const rot = push * 0.18;
  g.save(); g.translate(sledX, sledY); g.rotate(rot);
  drawSled(g, 0, 0, 1.7, 0, 70, 1);
  const pw = poseAt([[0, KP.sled], [0.4, KP.wave], [tEnd - 1.4, KP.wave], [tEnd - 0.9, KP.sled]], t);
  const wav = Math.sin(t * 9) * 0.35 * win(t, 0.4, tEnd - 1.0, 0.3, 0.3);
  const p = { ...pw, arms: [{ a: pw.arms[0].a + wav * 0.6, b: pw.arms[0].b - wav * 0.5 }, pw.arms[1]], head: pw.head + 0.1 * win(t, 0.4, tEnd - 1.0), mouth: "open", eyes: "open", blink: (t % 2.6) < 0.12 ? 1 : 0 };
  drawKid(g, -20, -48, 1.7, 1, p, "hero", 100);
  g.restore();
  g.restore();
  // титр
  titleBlock(g, t, 150, 290, 1, 0.3);
  // снег слегка падает
  snowfall(g, t, 60, 0.4, 0.6, 3.5, 0.7, 7);
}

// ---- Сцена 1: спуск от первого лица ----
// пройденный путь (м) — интеграл скорости
function sledV(t) {
  const a = EV.L1, b = EV.kachus, c = EV.L5;
  if (t < b) return lerp(0.8, 2.2, inv(a, b, t));
  if (t < c) return lerp(2.2, 13, easeOut(inv(b, b + 1.6, t)));
  return 13;
}
function sledDist(t) {
  // численно: шаг 1/60
  let d = 0; const a = EV.L1 - 0.2;
  for (let x = a; x < t; x += 1 / 60) d += sledV(x) / 60;
  return d;
}
const TREES = [];
for (let i = 0; i < 60; i++) TREES.push({ z: 6 + i * 4.2, x: (i % 2 ? 1 : -1) * (4.5 + hash(i * 3.3) * 6), kind: hash(i * 1.9) < 0.45 ? "birch" : "pine", s: 0.8 + hash(i) * 0.5 });
function scene1(g, t) {
  const d = sledDist(t);
  const tH = EV.hlop;
  // крен и занос после «свернулись»
  const swerve = ease(inv(EV.svernulis, tH, t));
  const crash = inv(tH - 0.05, tH + 0.25, t);
  let roll = Math.sin(t * 3.1) * 0.02 + swerve * 0.35 * Math.sin((t - EV.svernulis) * 6) + swerve * 0.25 + easeIn(crash) * 1.5;
  if (t > tH + 0.25) roll = 1.75 + (t - tH - 0.25) * 4.5;  // кувырок камеры
  const v = sledV(t);
  const [sx, sy] = shake(t, 1.5 + v * 0.9, 11);
  const hz = 430 - 40 * ease(inv(EV.L1, EV.kachus, t)) + swerve * 60;
  const camX = swerve * 2.5 * Math.sin((t - EV.svernulis) * 4);
  const f = 820, Hc = 1.3;
  reset(g);
  g.fillStyle = css(C.snow); g.fillRect(0, 0, W, H);
  g.save();
  g.translate(W / 2 + sx, H / 2 + sy); g.rotate(roll); g.scale(1.25, 1.25); g.translate(-W / 2, -H / 2);
  skyFill(g, -400, -600, W + 800, hz + 600, C.sky, C.skyW, 13, 0.5);
  roughEll(g, 1450 - camX * 30, hz - 180, 60, 60, 5, 0.04); paint(g, [255, 236, 190], 6, 0, 0.3);
  farHills(g, hz, -camX * 40, 0, 20);
  // долина с деревней ниже горизонта, приближается
  const vz = 1 + d * 0.012;
  roughPoly(g, [[-400, hz + 4], [W + 400, hz + 4], [W + 400, hz + 200], [-400, hz + 200]], 30, 3); paint(g, mix(C.snow, C.snowS, 0.4), 31, 0, 0.5);
  const homeI = 3;
  for (let i = 0; i < 7; i++) {
    const hx = W / 2 + (i - 3) * 150 * vz - camX * 60, hy = hz + 70 + (i % 2) * 14;
    drawIzba(g, hx, hy, 0.2 * vz, t, { smoke: 1, wind: 15, lit: 0 }, 300 + i * 13);
    if (i === homeI) {
      // «дом родной»: кисть обводит дом красным кольцом
      const u = ease(inv(EV.dom - 0.1, EV.dom + 0.6, t)), fade = 1 - inv(EV.L4, EV.L4 + 0.6, t);
      if (u > 0 && fade > 0) {
        g.save(); g.globalAlpha = fade;
        const pts = []; for (let k = 0; k <= 40 * u; k++) { const a = -2.2 + k / 40 * 6.6; pts.push([hx + Math.cos(a) * 72 * vz, hy - 38 * vz + Math.sin(a) * 58 * vz]); }
        if (pts.length > 1) brush(g, pts, 9, C.verm, 77, 0.6);
        g.restore();
      }
    }
  }
  // склон: от камеры до кромки горы
  roughPoly(g, [[-400, H + 600], [-400, hz + 120], [W + 400, hz + 120], [W + 400, H + 600]], 34, 4);
  paint(g, C.snow, 35, 0, 0.5, 1, 1.6);
  // колея: две борозды к точке схода
  const vpx = W / 2 - camX * 30;
  for (const sg of [-2, -1, 1, 2]) brush(g, [[vpx + sg * 6, hz + 124], [vpx + sg * 120, hz + 300], [vpx + sg * 300 + Math.sin(sg) * 60, H + 200]], 10, C.snowS, 36 + sg, 0.4, 0.55);
  // бугорки склона: короткие мазки-тени вразброс, бегут на камеру
  for (let k = 0; k < 22; k++) {
    const zz = ((k * 2.3 + hash(k) * 3 - d) % 50 + 50) % 50 + 1.6;
    const lx = (hash(k * 4.1) - 0.5) * 16;
    const y = hz + 120 + Hc * f / zz * 0.55, x = vpx + lx * f / zz;
    if (y > H + 200) continue;
    g.save(); g.globalAlpha = clamp(1.3 - zz / 40) * 0.55;
    roughEll(g, x, y, 260 / zz + 4, 60 / zz + 2, 40 + k, 0.2); paint(g, C.snowS, 40 + k, 0, 0.4);
    g.restore();
  }
  // деревья по сторонам: от дальних к ближним
  const vis = TREES.map((tr) => ({ ...tr, zz: tr.z - d })).filter((tr) => tr.zz > 0.6 && tr.zz < 60).sort((a, b) => b.zz - a.zz);
  for (const tr of vis) {
    const sc = f / tr.zz * 0.006 * tr.s;
    const x = vpx + (tr.x - camX) * f / tr.zz, y = hz + 120 + Hc * f / tr.zz * 0.55;
    g.save(); g.globalAlpha = clamp((60 - tr.zz) / 12);
    if (tr.kind === "birch") drawBirch(g, x, y, sc * 1.1, 500 + tr.z); else drawPine(g, x, y, sc * 1.2, 600 + tr.z);
    g.restore();
  }
  g.restore();
  // скоростные линии по краям кадра
  const vs = clamp((v - 4) / 9);
  if (vs > 0) {
    g.save();
    for (let i = 0; i < 26; i++) {
      const a = hash(i * 1.3) * TAU, ph = (t * 3.2 + hash(i * 2.7)) % 1;
      const r0 = 520 + ph * 700, r1 = r0 + 160 + vs * 260;
      g.globalAlpha = vs * 0.55 * (1 - ph);
      brush(g, [[W / 2 + Math.cos(a) * r0 * 1.5, hz + 140 + Math.sin(a) * r0 * 0.7], [W / 2 + Math.cos(a) * r1 * 1.5, hz + 140 + Math.sin(a) * r1 * 0.7]], 6 + vs * 6, C.white, 200 + i, 0.3);
    }
    g.restore();
  }
  // передний план: загнутые полозья по краям, верёвка, обе варежки (в экранных координатах)
  const [fx, fy] = shake(t, 3 + v * 1.4, 14, 3);
  g.save(); g.translate(fx, fy + 10); g.translate(W / 2, H); g.rotate(roll * 0.35); g.translate(-W / 2, -H);
  const mitY = 935 + Math.sin(t * 7) * 8;
  for (const sg of [-1, 1]) {
    const bx = W / 2 + sg * 820;
    // полоз: снизу из угла вверх и загиб к центру
    brush(g, [[bx + sg * 40, H + 60], [bx, 820], [bx - sg * 20, 700], [bx - sg * 80, 640], [bx - sg * 130, 660], [bx - sg * 120, 710]], 34, C.umber, 80 + sg, 0.7);
    brush(g, [[bx + sg * 30, H + 60], [bx - sg * 6, 820], [bx - sg * 24, 712]], 12, C.umberL, 81 + sg, 0.5, 0.8);
    // край сиденья в углу
    roughPoly(g, [[bx - sg * 60, H + 40], [bx - sg * 40, 1010], [bx + sg * 120, 1000], [bx + sg * 140, H + 40]], 82 + sg, 3); paint(g, C.ochre, 83 + sg, 0, 0.8);
    // верёвка от загиба полоза к варежке
    const mx = W / 2 + sg * 640;
    brush(g, [[bx - sg * 120, 700], [bx - sg * 110, 820], [mx + sg * 20, mitY - 10]], 7, C.linenD, 95 + sg, 0.3);
    // рукав и варежка
    brush(g, [[W / 2 + sg * 520, H + 80], [mx, mitY + 40]], 78, C.verm, 96 + sg, 0.7);
    brush(g, [[mx + sg * 4, mitY + 52], [mx - sg * 6, mitY + 30]], 80, C.white, 97 + sg, 0.4);
    roughEll(g, mx + sg * 6, mitY, 50, 42, 98 + sg, 0.08, sg * 0.3); paint(g, C.ochreL, 99 + sg, 0, 0.6);
    brush(g, [[mx - sg * 30, mitY - 20], [mx - sg * 44, mitY + 4]], 20, C.ochreL, 100 + sg, 0.5); // большой палец
  }
  g.restore();
  // «хлоп!»: снег в объектив
  const sp = inv(tH - 0.02, tH + 0.2, t);
  if (sp > 0) {
    lensSnow(g, t, ease(sp) * (1 - 0.4 * inv(tH + 0.8, EV.L7, t)), 120);
  }
}
// снег, налипший на объектив: пятна по краям и белая вспышка
function lensSnow(g, t, amt, seed) {
  reset(g);
  g.save(); g.globalAlpha = clamp(amt * 0.9);
  for (let i = 0; i < 26; i++) {
    const a = hash(i + seed) * TAU, r = 380 + hash(i * 2 + seed) * 520;
    const x = W / 2 + Math.cos(a) * r * 1.4, y = H / 2 + Math.sin(a) * r * 0.8;
    roughEll(g, x, y, 90 + hash(i * 3 + seed) * 180, 70 + hash(i * 4 + seed) * 140, seed + i, 0.18, a);
    paint(g, C.white, seed + i, a, 0.5);
  }
  g.restore();
  const flash = 1 - inv(0, 0.5, amt > 0 ? (t - EV.hlop) : 0);
  if (t >= EV.hlop && flash > 0) { g.fillStyle = css(C.white, flash * 0.85); g.fillRect(0, 0, W, H); }
}
