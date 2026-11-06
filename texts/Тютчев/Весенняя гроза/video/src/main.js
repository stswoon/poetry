// ---------- Сцены и монтаж ----------
const ctx = document.getElementById("scene").getContext("2d");
const E = EV;
let CL = null; // облака: строятся один раз

function buildAll() {
  buildLand(); buildTree(); buildRoad(); buildBokeh(); buildBranch(); buildStream(); buildForest(); buildOlymp();
  CL = {
    A: [makeCloud(101, 980, 440, "white"), makeCloud(101, 980, 440, "storm")],
    B: [makeCloud(102, 820, 380, "white"), makeCloud(102, 820, 380, "storm")],
    Cc: [makeCloud(103, 900, 420, "white"), makeCloud(103, 900, 420, "storm")],
    small: [201, 202, 203, 204].map((s) => makeCloud(s, 360, 160, "white")),
    rush: [301, 302, 303, 304, 305].map((s) => makeCloud(s, 1100, 480, "white")),
  };
  OLY_CLOUDS.length = 0; OLY_CLOUDS_W.length = 0;
  for (let i = 0; i < 9; i++) { OLY_CLOUDS.push(makeCloud(400 + i, 640, 260, "gold")); OLY_CLOUDS_W.push(makeCloud(500 + i, 640, 260, "white")); }
}

// ---------- Монтаж: какая сцена в момент t ----------
const T_ROAD = E.w_pyl - 0.3, T_BRANCH = E.L7 - 0.15, T_SUN = E.L8 - 0.1, T_WHIP = E.E8 + 0.5, T_STREAM = T_WHIP + 0.22;
const T_FOREST = E.L10 - 0.12, T_SPLIT = E.L11 - 0.1, T_HILL3 = E.L12 - 0.1, T_RISE = E.E12 + 0.15, T_OLY = E.L13 - 0.15;
const T_CUP = E.L15 - 0.1, T_OLY2 = E.L16 - 0.12, T_FALL = E.E16 + 0.05, T_LAND = E.E16 + 0.85;
function sceneAt(t) {
  if (t < E.V0 - 0.5) return "intro";
  if (t < T_ROAD) return "hill";
  if (t < T_BRANCH) return "road";
  if (t < T_SUN) return "branch";
  if (t < T_STREAM) return "hill";
  if (t < T_FOREST) return "stream";
  if (t < T_SPLIT) return "forest";
  if (t < T_HILL3) return "split";
  if (t < T_RISE) return "hill";
  if (t < T_OLY) return "rise";
  if (t < T_CUP) return "olymp";
  if (t < T_OLY2) return "cup";
  if (t < T_FALL) return "olymp";
  if (t < T_LAND) return "fall";
  return "hill";
}

// ---------- Погода во времени ----------
function stormAt(t) {
  let s = sstep(prog(t, E.V0 - 0.5, E.L2));                    // туча наползает к «гром»
  s *= 1 - 0.55 * sstep(prog(t, E.w_solnce - 0.3, E.w_zolot));  // солнце прорвалось
  s = Math.max(s, 0.6 * win(t, E.L12 - 0.2, E.E12 + 0.6, 0.3, 0.5));
  s = Math.max(s, 0.85 * win(t, T_FALL, E.fin + 0.6, 0.2, 1.2));
  return s;
}
function rainAt(t) {
  let k = sstep(prog(t, E.w_bryz - 0.15, E.w_bryz + 0.4));
  k *= 1 - 0.5 * sstep(prog(t, E.L9 - 0.4, E.L9 + 0.4));
  k = Math.max(k, win(t, T_FALL - 0.05, E.fin + 1.6, 0.3, 1.4));
  if (t > E.fin + 1.6) k = 0;
  return k;
}
const goldAt = (t) => 0.8 * sstep(prog(t, E.w_solnce, E.w_zolot + 0.2)) * (t < T_RISE ? 1 : 0) + 0.6 * sstep(prog(t, E.fin - 0.4, E.fin + 0.6)) * (t > T_LAND ? 1 : 0);
const sunAt = (t) => Math.max(sstep(prog(t, E.w_solnce - 0.35, E.w_solnce + 0.4)) * (t < T_RISE ? 1 : 0), sstep(prog(t, E.fin - 0.6, E.fin + 0.6)));

// молнии на холме: [время, облако-источник, x0, y0, x1, y1, масштаб, seed]
const BOLTS = [
  [E.w_grom - 0.08, 1080, 360, 860, 700, 1.1, 11],
  [E.w_gremyat - 0.05, 520, 420, 300, 720, 1, 12],
  [E.w_rask - 0.05, 1640, 430, 1840, 730, 1, 13],
  [E.w_molod - 0.05, 1060, 360, 1290, 720, 1.1, 14],
  [E.w_vse - 0.08, 1100, 330, 720, 760, 1.6, 15],
  [E.w_gromam - 0.06, 1660, 420, 1500, 740, 1.2, 16],
].map(([at, x0, y0, x1, y1, s, seed]) => ({ at, s, b: makeBolt(seed, x0, y0, x1, y1, 1.2) }));
const flashAt = (t) => BOLTS.reduce((m, b) => Math.max(m, flashCurve(t, b.at)), 0);

// мячик-молния скачет по тучам на «резвяся и играя»
const HOPS = [[E.w_rezv - 0.3, 1640, 120], [E.w_rezv + 0.22, 1090, 40], [E.w_igr - 0.02, 540, 130], [E.w_igr + 0.42, 1090, 40], [E.L4 + 0.2, 1240, -160], [E.E4 + 0.3, 1000, -420]];
function ballAt(t) {
  if (t < HOPS[0][0] || t > HOPS[HOPS.length - 1][0]) return null;
  for (let i = 0; i < HOPS.length - 1; i++) if (t <= HOPS[i + 1][0]) {
    const u = prog(t, HOPS[i][0], HOPS[i + 1][0]), [ , x0, y0] = HOPS[i], [ , x1, y1] = HOPS[i + 1];
    return [lerp(x0, x1, u), lerp(y0, y1, u) - Math.sin(u * Math.PI) * 170, u];
  }
  return null;
}

// ---------- Школьник ----------
function kidPose(t) {
  const spread = springSoft(prog(t, E.w_lyublyu - 0.1, E.w_grozu + 0.5)) * (1 - sstep(prog(t, E.L3 - 0.2, E.L3 + 0.4)));
  let arms = 0.18 + 1.75 * spread;
  arms = lerp(arms, 2.5, sstep(prog(t, E.w_bryz - 0.1, E.w_bryz + 0.4)) * (1 - sstep(prog(t, E.L8 - 0.3, E.L8 + 0.2))));
  arms = lerp(arms, 1.9, sstep(prog(t, E.L8 - 0.2, E.L8 + 0.4)) * (1 - sstep(prog(t, E.L9, E.L9 + 0.2))));
  let jump = 40 * bump(t, E.w_grom, 0.6) * 2;
  const party = win(t, E.w_veselo - 0.15, E.E12 + 0.5, 0.1, 0.2);
  jump += party * Math.abs(Math.sin((t - E.w_veselo) * 7)) * 46;
  arms = lerp(arms, 2.3 + 0.25 * Math.sin(t * 14), party);
  const rainParty = win(t, T_LAND, E.fin + 0.2, 0.2, 0.4);
  arms = lerp(arms, 2.6 + 0.2 * Math.sin(t * 10), rainParty); jump += rainParty * Math.abs(Math.sin((t - T_LAND) * 6)) * 40;
  let armL = arms, armR = arms;
  const wave = sstep(prog(t, E.fin - 0.1, E.fin + 0.5));
  armL = lerp(armL, 0.3, wave); armR = lerp(armR, 2.5 + 0.35 * Math.sin(t * 8), wave);
  const look = Math.max(sstep(prog(t, E.L4 - 0.3, E.L4 + 0.3)) * (1 - sstep(prog(t, E.L5 + 0.2, E.L5 + 0.6))), sstep(prog(t, E.L8 - 0.2, E.L8 + 0.4)) * (t < T_STREAM ? 1 : 0), win(t, T_LAND - 0.1, E.fin, 0.2, 0.4));
  return { t, armL, armR, jump, look, wind: 0.5 + stormAt(t) * 0.8 };
}

// ---------- Холм ----------
function hillCam(t) {
  const K = [
    [E.V0 - 0.6, 960, 560, 1.0], [E.L1, 980, 560, 1.03], [E.w_grozu + 0.5, 1150, 590, 1.4], [E.w_grom - 0.12, 1150, 590, 1.42],
    [E.w_grom + 0.35, 1090, 460, 1.06], [E.L4 - 0.1, 1080, 420, 1.04], [E.E4 + 0.15, 1040, 150, 1.12], [E.L5 - 0.25, 1040, 150, 1.12],
    [E.L5 + 0.12, 960, 480, 0.98], [E.w_bryz, 990, 500, 1.02], [T_ROAD, 1020, 530, 1.1],
    [T_SUN, 1000, 430, 1.0], [T_WHIP, 1080, 400, 1.1],
    [T_HILL3, 1080, 560, 1.18], [E.w_vse + 0.12, 980, 500, 1.0], [T_RISE, 1100, 540, 1.12],
    [T_LAND, 1150, 560, 1.32], [E.fin - 0.2, 1000, 500, 1.0], [TOTAL, 960, 490, 0.96],
  ];
  let [cx, cy, z] = keys(t, K);
  const f = flashAt(t);
  cx += wob(t, 61) * 14 * f; cy += wob(t, 53, 1) * 10 * f;
  return [cx, cy, z];
}
function drawHill(c, t, camOverride) {
  const st = stormAt(t), [cx, cy, z] = camOverride || hillCam(t), fl = flashAt(t);
  c.save(); camApply(c, cx, cy, z);
  // небо
  const blue = win(t, E.L4 - 0.4, E.L5 + 0.1, 0.4, 0.3);
  const top = mix(C.skyTop, "#2b2c5a", st * (1 - 0.85 * blue)), mid = mix(C.skyMid, "#55578f", st * (1 - 0.6 * blue)), low = mix(C.skyLow, "#a9aedb", st);
  skyGrad(c, top, mid, low, -900, 720);
  if (blue > 0) { glow(c, 1080, 60, 700, "rgba(150,210,255,0.9)", blue); for (let k = 0; k < 6; k++) sparkle(c, 760 + k * 120, -40 + Math.sin(k * 1.9) * 90, 22 * (0.6 + 0.4 * Math.sin(t * 7 + k)), blue); }
  // солнце за тучей
  const sun = sunAt(t);
  if (sun > 0) { sunRays(c, 1320, 160, sun, t, 12, 1700); sunDisk(c, 1320, 160, 70, sun); }
  // мелкие белые облака далеко
  CL.small.forEach((cl, i) => drawCloud(c, cl, ((i * 560 + t * 18) % 2600) - 340, 520 - (i % 2) * 70, 0.9, 0, 1 - st * 0.7));
  // мячик-молния и большие тучи
  const slide = 520 * (1 - sstep(prog(t, E.V0 - 0.6, E.L2)));
  const sqA = bump(t, HOPS[2][0], 0.6) * 2, sqB = (bump(t, HOPS[1][0], 0.6) + bump(t, HOPS[3][0], 0.6)) * 2, sqC = bump(t, HOPS[0][0] + 0.05, 0.6) * 2;
  const beat = win(t, E.w_veselo - 0.1, E.E12 + 0.5, 0.1, 0.2) * Math.abs(Math.sin((t - E.w_veselo) * 7));
  const part = sstep(prog(t, E.w_solnce - 0.3, E.w_zolot + 0.2)) * (t < T_RISE ? 1 : 0); // тучи расходятся, пропуская солнце
  const pair = (cl, x, y, s, sq) => { if (st < 0.999) drawCloud(c, cl[0], x, y, s, sq, 1); drawCloud(c, cl[1], x, y, s, sq, st); };
  pair(CL.A, 520 - slide * 0.6 - part * 160 + Math.sin(t * 0.7) * 10, 470, 1, sqA + beat * 0.6);
  pair(CL.Cc, 1640 + slide - part * 40 + Math.sin(t * 0.6 + 1) * 10, 500, 1, sqC + beat * 0.6);
  pair(CL.B, 1090 + slide * 0.5 - part * 520 - blue * 420 + Math.sin(t * 0.8 + 2) * 8, 420 - blue * 40, 1, sqB + beat * 0.8);
  // мячик
  const ball = ballAt(t);
  if (ball) { const [bx, by] = ball; glow(c, bx, by, 150, "rgba(255,246,170,0.85)"); circle(c, bx, by, 34); c.fillStyle = "#fffbe0"; c.fill(); for (let k = 0; k < 4; k++) sparkle(c, bx + Math.cos(t * 9 + k * 1.6) * 60, by + Math.sin(t * 9 + k * 1.6) * 60, 20, 0.9, "#fff6a8"); }
  // гром в небе голубом: кольца
  shockRings(c, 1090, 200, t, E.w_groh - 0.05);
  shockRings(c, 1090, 240, t, E.w_neb + 0.1, "rgba(255,246,170,0.9)");
  // радуга в финале — за холмами и деревом
  const rb = sstep(prog(t, E.fin - 0.5, E.fin + 0.8));
  if (rb > 0) rainbow(c, 1100, 900, 980, rb);
  // земля
  c.drawImage(LAND, LX0, LY0);
  // молнии бьют в дальние холмы — поверх гор, но за деревом и мальчиком
  for (const b of BOLTS) { const lt = t - b.at; if (lt < 0 || lt > 0.7) continue; const f = flashCurve(t, b.at); glow(c, b.b.main[b.b.main.length - 1][0], b.b.main[b.b.main.length - 1][1], 220, "rgba(255,246,190,0.8)", f * 0.8); drawBolt(c, b.b, f, clamp(lt / 0.12, 0, 1), "#fff6a8", b.s * 1.25); }
  drawTree(c, 360, 900, 1, Math.sin(t * 2.2) * (0.6 + st) + beat * 2);
  // школьник на вершине
  kid(c, HILL_TOP[0], HILL_TOP[1] + 6, 0.95, kidPose(t));
  // затемнение при грозе
  c.restore();
  if (st > 0) { c.save(); c.globalAlpha = st * 0.32; c.fillStyle = "#1c1f55"; c.fillRect(0, 0, W, H); c.restore(); }
  petals(c, t, (0.35 + st * 0.5) * (1 - rainAt(t) * 0.5), -900, 120, 3, 22);
  drawRain(c, t, rainAt(t), goldAt(t), 0.16 + st * 0.06);
  if (fl > 0) { c.save(); c.globalAlpha = fl * 0.22; c.fillStyle = "#eef3ff"; c.fillRect(0, 0, W, H); c.restore(); }
  speedLines(c, 1150, 380, Math.max(flashCurve(t, BOLTS[0].at), flashCurve(t, BOLTS[4].at)) * 0.7, 3, t);
  // взмах «вжух» при уходе в поток
  const wh = prog(t, T_WHIP, T_STREAM); if (wh > 0 && wh < 1) whip(c, wh, t);
}
function mix(a, b, u) {
  const p = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const A = p(a), B = p(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], clamp(u, 0, 1)))).join(",")})`;
}
function rainbow(c, x, y, r, a) {
  const cols = ["#ff5b5b", "#ffa53b", "#ffe14a", "#6fd36a", "#4fb3f0", "#5a6fe0", "#a46ae0"];
  c.save(); c.globalAlpha = 0.55 * a; c.lineWidth = 26;
  cols.forEach((col, i) => { c.strokeStyle = col; c.beginPath(); c.arc(x, y, r - i * 24, Math.PI * 1.08, Math.PI * (1.08 + 0.84 * a)); c.stroke(); });
  c.restore();
}
function whip(c, u, t) {
  c.save(); c.globalAlpha = Math.sin(u * Math.PI) * 0.85;
  const r = mulberry32(7); c.fillStyle = "#fff";
  for (let i = 0; i < 40; i++) { const y = r() * H, len = 300 + r() * 900, x = lerp(W + 200, -len - 200, u) + (r() - 0.5) * 900; c.fillRect(x, y, len, 3 + r() * 8); }
  c.restore();
}

// ---------- Дорога и ветка ----------
function drawRoad(c, t) {
  const st = stormAt(t), z = 1 + 0.08 * prog(t, T_ROAD, T_BRANCH);
  c.save(); c.translate(W / 2, H / 2); c.scale(z, z); c.translate(-W / 2, -H / 2);
  skyGrad(c, "#3a3c72", "#6a6ca8", "#b8bde6", 0, 440);
  drawCloud(c, CL.B[1], 700 + t * 30, 330, 0.8); drawCloud(c, CL.A[1], 1500 - t * 20, 360, 0.7);
  c.drawImage(ROADBG, 0, 0);
  roadHits(c, t, E.w_bryz - 0.2, 1);
  c.restore();
  c.save(); c.globalAlpha = st * 0.2; c.fillStyle = "#1c1f55"; c.fillRect(0, 0, W, H); c.restore();
  drawRain(c, t, 1, 0, 0.2, 1.1);
  sparkle(c, 960, 520, 40 * bump(t, E.w_pyl, 0.6) * 2, 0.8);
}
function drawBranch(c, t) {
  const u = prog(t, T_BRANCH, T_SUN), z = 1.04 + 0.08 * u;
  c.drawImage(BOKEH, 0, 0);
  drawRain(c, t, 0.45, 0, 0.12, 0.6);
  c.save(); c.translate(W / 2, H / 2); c.scale(z, z); c.rotate(-0.02 + u * 0.03); c.translate(-W / 2, -H / 2);
  const sway = Math.sin(t * 2.4) * 0.012;
  c.save(); c.translate(0, 860); c.rotate(sway); c.translate(0, -860);
  c.drawImage(BRANCH, -100, 0);
  DROPS.forEach(([x, y, r], i) => {
    const g = springPop(prog(t, E.w_perly - 0.35 + i * 0.09, E.w_perly + 0.4 + i * 0.09));
    if (g <= 0) return;
    pearl(c, x, y + 10, r * 1.7 * g, t, i);
  });
  c.restore(); c.restore();
  glow(c, 1380, 120, 420, "rgba(255,250,220,0.5)", sstep(prog(t, E.L8 - 0.6, E.L8)));
}

// ---------- Поток, лес, сплит ----------
function drawStream(c, t, vx = 0, vw = W, camX) {
  const u = prog(t, T_STREAM, T_FOREST + 1.2);
  const cx = camX ?? lerp(1000, 3000, u), cy = streamY(cx) - 20, z = camX ? 1.08 : 1.35;
  c.fillStyle = "#6f86c4"; c.fillRect(0, 0, W, H);
  c.save(); camApply(c, cx, cy, z, -0.1);
  c.drawImage(STREAMBG, 0, -400 + 400);
  streamWater(c, t, Math.max(0, cx - 1400), Math.min(STW, cx + 1400));
  c.restore();
  drawRain(c, t, rainAt(t) * 0.8, 0, 0.14);
}
function drawForest(c, t, shift = 0) {
  const u = prog(t, T_FOREST, T_HILL3), z = 1.0 + 0.1 * u;
  c.save(); c.translate(W / 2, H / 2); c.scale(z, z); c.translate(-W / 2 - 200 * u - shift, -H / 2);
  c.drawImage(FOREST, 0, 0);
  c.restore();
  flock(c, t, E.w_gam - 0.45, 1, 1.1);
  notes(c, t, E.w_gam - 0.3, win(t, E.w_gam - 0.3, T_HILL3 + 0.2, 0.2, 0.2));
  drawRain(c, t, rainAt(t) * 0.6, 0.3, 0.12);
}
function drawSplit(c, t) {
  const inL = springSnap(prog(t, T_SPLIT - 0.05, T_SPLIT + 0.5)), inR = springSnap(prog(t, E.w_shum - 0.25, E.w_shum + 0.3));
  // левая панель — лес
  c.save(); c.beginPath(); c.moveTo(0, 0); c.lineTo(lerp(-200, 1080, inL), 0); c.lineTo(lerp(-400, 860, inL), H); c.lineTo(0, H); c.closePath(); c.clip();
  drawForest(c, t, 260); c.restore();
  // правая панель — горный поток
  c.save(); c.beginPath(); c.moveTo(lerp(W + 300, 1100, inR), 0); c.lineTo(W, 0); c.lineTo(W, H); c.lineTo(lerp(W + 100, 880, inR), H); c.closePath(); c.clip();
  c.fillStyle = "#6f86c4"; c.fillRect(0, 0, W, H);
  drawStream(c, t, 0, W, 2200 + (t - T_SPLIT) * 420); c.restore();
  // если правая ещё не въехала — справа тот же лес
  if (inR < 1) { c.save(); c.beginPath(); c.moveTo(lerp(-200, 1080, inL), 0); c.lineTo(W, 0); c.lineTo(W, H); c.lineTo(lerp(-400, 860, inL), H); c.closePath(); c.clip(); c.beginPath(); c.moveTo(lerp(W + 300, 1100, inR), 0); c.lineTo(lerp(W + 100, 880, inR), H); c.lineTo(-W, H); c.lineTo(-W, 0); c.closePath(); c.clip(); drawForest(c, t, -200); c.restore(); }
  // белые рамки панелей
  c.save(); c.lineWidth = 16; c.strokeStyle = "#fff"; c.lineCap = "round";
  c.beginPath(); c.moveTo(lerp(-200, 1080, inL), -20); c.lineTo(lerp(-400, 860, inL), H + 20); c.stroke();
  if (inR > 0) { c.beginPath(); c.moveTo(lerp(W + 300, 1100, inR), -20); c.lineTo(lerp(W + 100, 880, inR), H + 20); c.stroke(); }
  c.restore();
}

// ---------- Взлёт сквозь тучи ----------
function drawRise(c, t) {
  const u = prog(t, T_RISE, T_OLY + 0.3);
  const cy = lerp(540, -2600, easeIn(u));
  drawHill(c, t, [1060, cy, 1.1]);
  rushClouds(c, t, u, -1);
  rushLines(c, sstep(u * 3), t, -1);
}
// облака проносятся мимо камеры: dir −1 — камера вверх (облака вниз), +1 — вниз
function rushClouds(c, t, u, dir) {
  CL.rush.forEach((cl, i) => {
    const ph = (u * 2.2 + i / CL.rush.length) % 1;
    const y = dir < 0 ? lerp(-200, H + 1000, ph) : lerp(H + 1000, -200, ph), x = [200, 1500, 800, 1750, 300][i];
    drawCloud(c, cl, x, y, 1.4 + (i % 2) * 0.4, 0, 1);
  });
}

// ---------- Олимп ----------
function olympState(t) {
  const reach = springSoft(prog(t, E.w_korm - 0.3, E.w_orla + 0.3));
  const laugh = sstep(prog(t, E.w_smeyas - 0.15, E.w_smeyas + 0.1));
  const tilt = springSoft(prog(t, E.w_prol - 0.45, E.w_prol + 0.35));
  const turn = springPop(prog(t, E.L13 - 0.2, E.w_geba + 0.3));
  return { t, reach, laugh, tilt, turn };
}
function drawOlymp(c, t, extraCy = 0) {
  const o = olympState(t);
  const zoom = keys(t, [[T_OLY, 1.2], [E.w_geba + 0.3, 1.0], [E.w_korm - 0.2, 1.0], [E.w_orla + 0.3, 0.92], [E.L16, 1.0], [E.w_prol + 0.4, 1.08]])[0];
  const pan = keys(t, [[T_OLY, 700, 470], [E.w_geba + 0.3, 860, 540], [E.w_orla + 0.3, 960, 540], [E.L16, 900, 540], [E.w_prol + 0.3, 820, 560]]);
  c.save(); camApply(c, pan[0], pan[1] + extraCy, zoom);
  c.drawImage(OLYMP, -200, -100);
  sunDisk(c, 1650, 140, 60, 1); sunRays(c, 1650, 140, 0.7, t, 10, 1500, "rgba(255,236,170,");
  cloudSea(c, t, 760, 1, "white");
  // орёл пикирует справа
  const ein = springSoft(prog(t, E.w_korm - 0.7, E.w_orla + 0.2));
  if (ein > 0) {
    const ex = lerp(2500, 1420, ein), ey = lerp(-200, 330, ein) + Math.sin(t * 3) * 14;
    eagle(c, ex, ey, 0.95, 0.5 + 0.5 * Math.sin(t * (ein < 1 ? 9 : 5)), -1, t);
  }
  speedLines(c, 1420, 330, bump(t, E.w_orla - 0.1, 0.6) * 1.4, 9, t, "#fff8d8");
  hebe(c, 600, 520, 1.3, o);
  const [hx, hy, rx, ry] = hebeHand(600, 520, 1.3, o);
  if (o.tilt > 0.5) pour(c, rx, ry, t, E.w_prol - 0.05, sstep((o.tilt - 0.5) * 2));
  cloudSea(c, t * 1.3 + 3, 1010, 1, "gold");
  // корм для орла: искры амброзии из кубка
  const feed = win(t, E.w_orla - 0.2, E.L15 - 0.1, 0.2, 0.3);
  for (let k = 0; k < 6; k++) { const ph = (t * 1.5 + k / 6) % 1; sparkle(c, lerp(rx, 1170, ph), lerp(ry - 10, 255, ph) - Math.sin(ph * Math.PI) * 80, 18, feed * (1 - ph)); }
  c.restore();
}
function drawCup(c, t) {
  const u = prog(t, T_CUP, T_OLY2);
  const g = c.createRadialGradient(960, 520, 50, 960, 520, 1100); g.addColorStop(0, "#fff3c4"); g.addColorStop(0.5, "#ffc96b"); g.addColorStop(1, "#d9822b"); c.fillStyle = g; c.fillRect(0, 0, W, H);
  speedLines(c, 960, 520, 0.55, 21, t, "#fff8e0", 60);
  const boil = 1 + 0.6 * sstep(prog(t, E.w_gromok, E.w_gromok + 0.4));
  const s = lerp(2.2, 2.6, easeOut(u));
  glow(c, 960, 560, 700, "rgba(255,255,230,0.8)");
  goblet(c, 960 + Math.sin(t * 30) * 3 * (boil - 1), 700 + lerp(40, 0, easeOut(u)) + Math.sin(t * 25) * 2 * (boil - 1), s, t, 0, boil);
  sparkle(c, 960 - 250, 700 - 120 * s - 12, 90 * bump(t, E.w_kubok - 0.05, 0.7) * 2, 1);
  sparkle(c, 960 + 230, 700 - 110 * s, 60 * bump(t, E.w_kubok + 0.1, 0.7) * 2, 1);
}
function drawFall(c, t) {
  const u = prog(t, T_FALL, T_LAND);
  if (u < 0.45) { drawOlymp(c, t, lerp(0, 1800, easeIn(u / 0.45))); }
  else { drawHill(c, t, [1150, lerp(-1800, 560, easeOut((u - 0.45) / 0.55)), 1.32]); }
  rushClouds(c, t, u, 1);
  rushLines(c, Math.sin(u * Math.PI), t, 1);
}

// ---------- Заставка ----------
function drawIntro(c, t) {
  skyGrad(c, "#1f2457", "#4b4f92", "#9ea6dc", 0, H);
  // облака летят на камеру из центра
  CL.rush.map((cl, i) => ({ i, ph: (t * 0.42 + i / CL.rush.length) % 1 })).sort((a, b) => a.ph - b.ph).forEach(({ i, ph }) => {
    const ang = i * 2.1 + 0.6, q = ph * ph;
    const s = lerp(0.35, 2.6, q), x = 960 + Math.cos(ang) * 2200 * q, y = 620 + Math.sin(ang) * 1300 * q;
    drawCloud(c, CL.A[1], x, y, s * 0.6 * Math.min(1, ph * 5), 0, 1);
  });
  const b = makeBolt(5, 1250, -40, 820, 640, 1.3);
  const f = flashCurve(t, 0.95);
  drawBolt(c, b, f, clamp((t - 0.95) / 0.12, 0, 1), "#fff6a8", 1.4);
  if (f > 0) { c.save(); c.globalAlpha = f * 0.25; c.fillStyle = "#fff"; c.fillRect(0, 0, W, H); c.restore(); }
  speedLines(c, 960, 500, f * 0.8 + 0.25 * sstep(prog(t, 1.0, 1.4)), 2, t);
  for (let k = 0; k < 7; k++) sparkle(c, 380 + k * 200, 360 + Math.sin(k * 2.3) * 220, 26 * (0.5 + 0.5 * Math.sin(t * 6 + k)), sstep(prog(t, 1.1, 1.6)), "#fff6a8");
}
// шторка из облаков: u 0..1 (на 0.5 экран закрыт)
function cloudWipe(c, u) {
  if (u <= 0 || u >= 1) return;
  const k = u < 0.5 ? easeOut(u * 2) : 1 - easeIn((u - 0.5) * 2);
  CL.rush.forEach((cl, i) => {
    const side = i % 2 ? 1 : -1, y = [140, 420, 700, 980, 560][i];
    drawCloud(c, cl, 960 + side * lerp(1900, 420, k) + side * (i * 30), y + 300, 2.2, 0, 1);
  });
}

// ---------- Плашка под строки ----------
function lowerPlate(c, a) {
  if (a <= 0) return;
  const g = c.createLinearGradient(0, 760, 0, H); g.addColorStop(0, "rgba(14,20,58,0)"); g.addColorStop(0.35, "rgba(14,20,58,0.55)"); g.addColorStop(1, "rgba(14,20,58,0.72)");
  c.save(); c.globalAlpha = a; c.fillStyle = g; c.fillRect(0, 760, W, H - 760); c.restore();
}

// ---------- Текст ----------
const CAPS = [...document.querySelectorAll(".cap")].map((el) => ({ el, n: +el.dataset.n, last: "" }));
const WORDS = [...document.querySelectorAll(".cap .w")].map((el) => ({ el, at: +el.dataset.at, last: -1 }));
const ROW = [828, 900];
const NL = CFG.nlines;
function capState(n, t) {
  const B = CFG.blocks.find((b) => n >= b[0] && n <= b[1]);
  const Ln = (k) => E["L" + k];
  const next = n < B[1] ? Ln(n + 1) : null, next2 = n + 1 < B[1] ? Ln(n + 2) : null;
  const endBlock = B[1] < NL ? Ln(B[1] + 1) - 0.42 : E.fin - 0.35;
  let y = ROW[1], op = sstep(prog(t, Ln(n) - 0.12, Ln(n) + 0.05));
  if (next !== null) y = lerp(ROW[1], ROW[0], springSnap(prog(t, next - 0.22, next + 0.16)));
  if (next2 !== null && next2 - 0.12 < endBlock) { const u = sstep(prog(t, next2 - 0.38, next2 - 0.24)); y -= 24 * u; op *= 1 - u; }
  op *= 1 - sstep(prog(t, endBlock, endBlock + 0.25));
  return { y, op };
}
const TT = {};
function setTitle(id, k, t0, t) {
  const el = TT[id] || (TT[id] = document.getElementById(id)); if (!el) return;
  const s = springPop(prog(t, t0, t0 + 0.9));
  el.style.opacity = k <= 0 ? "0" : k.toFixed(3);
  el.style.transform = `scale(${lerp(0.6, 1, s).toFixed(4)})`;
}
function textAt(t) {
  for (const cp of CAPS) {
    const s = capState(cp.n, t), key = s.y.toFixed(1) + "|" + s.op.toFixed(3);
    if (key !== cp.last) { cp.el.style.transform = `translate(0px, ${s.y.toFixed(1)}px)`; cp.el.style.opacity = s.op.toFixed(3); cp.last = key; }
  }
  for (const w of WORDS) {
    const u = prog(t, w.at - 0.06, w.at + 0.4), k = Math.round(u * 400); if (k === w.last) continue; w.last = k;
    const s = springPop(u);
    w.el.style.opacity = u > 0 ? Math.min(1, u * 5).toFixed(3) : "0";
    w.el.style.transform = u >= 1 ? "none" : `translate(0px, ${((1 - s) * 30).toFixed(1)}px)`;
  }
  setTitle("tt1", win(t, 1.0, E.V0 - 0.5, 0.3, 0.3), 1.0, t);
  setTitle("tt2", sstep(prog(t, E.fin + 0.2, E.fin + 0.7)), E.fin + 0.2, t);
}

// ---------- Кадр ----------
function renderAt(t) {
  ctx.reset();
  if (!CL) { ctx.fillStyle = "#2b2c5a"; ctx.fillRect(0, 0, W, H); textAt(t); return; }
  const sc = sceneAt(t);
  if (sc === "intro") drawIntro(ctx, t);
  else if (sc === "hill") drawHill(ctx, t);
  else if (sc === "road") drawRoad(ctx, t);
  else if (sc === "branch") drawBranch(ctx, t);
  else if (sc === "stream") drawStream(ctx, t);
  else if (sc === "forest") drawForest(ctx, t);
  else if (sc === "split") drawSplit(ctx, t);
  else if (sc === "rise") drawRise(ctx, t);
  else if (sc === "olymp") drawOlymp(ctx, t);
  else if (sc === "cup") drawCup(ctx, t);
  else if (sc === "fall") drawFall(ctx, t);
  lowerPlate(ctx, sstep(prog(t, E.L1 - 0.6, E.L1 - 0.1)) * (1 - sstep(prog(t, E.fin - 0.3, E.fin + 0.1))));
  // переходы
  cloudWipe(ctx, prog(t, E.V0 - 1.0, E.V0));
  const wi = sceneAt(t) === "rise" ? sstep(prog(t, T_OLY - 0.3, T_OLY)) : 0; if (wi > 0) { ctx.save(); ctx.globalAlpha = wi; ctx.fillStyle = "#fffaf0"; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  const wo = prog(t, T_OLY, T_OLY + 0.5); if (wo > 0 && wo < 1) { ctx.save(); ctx.globalAlpha = 1 - wo; ctx.fillStyle = "#fffaf0"; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  const sw = prog(t, T_STREAM, T_STREAM + 0.3); if (sw > 0 && sw < 1) whip(ctx, 0.5 + sw * 0.5, t);
  const cut = (a) => { const d = t - a; if (d >= 0 && d < 0.18) { ctx.save(); ctx.globalAlpha = (1 - d / 0.18) * 0.55; ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H); ctx.restore(); } };
  [T_ROAD, T_BRANCH, T_SUN, T_FOREST, T_SPLIT, T_HILL3, T_CUP, T_OLY2].forEach(cut);
  // финальная виньетка под название
  const fv = sstep(prog(t, E.fin, E.fin + 0.6));
  if (fv > 0) { const g = ctx.createLinearGradient(0, 0, 0, 560); g.addColorStop(0, "rgba(16,24,70,0.55)"); g.addColorStop(1, "rgba(16,24,70,0)"); ctx.save(); ctx.globalAlpha = fv; ctx.fillStyle = g; ctx.fillRect(0, 0, W, 560); ctx.restore(); }
  textAt(t);
}

const seek = (t) => renderAt(t);
window.addEventListener("hf-seek", (e) => seek(e.detail.time));
buildAll();
seek(0);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => seek(0));

const tl = gsap.timeline({ paused: true, onUpdate: () => seek(tl.time()) });
tl.set({}, {}, TOTAL);
window.__timelines = window.__timelines || {};
window.__timelines["main"] = tl;
