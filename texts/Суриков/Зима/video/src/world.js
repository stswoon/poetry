// ---------- Мир партии: доска, клетки, камера, фишки по времени ----------
// Мир: X 0…2400 (вправо), Z 0…1400 (к зрителю), Y — высота. Экран: косой вид сверху (KZ — сжатие глубины).
const BW = 2400, BD = 1400, KZ = 0.62, TILE = 200, PS = 1.4, NX = BW / TILE, NZ = BD / TILE;
let CAM = { x: 1200, y: 600, z: 0.7 };
let SZ = 0.7 * 1.4;   // масштаб фишек на экране = зум × PS
const P = (X, Z, Y = 0) => [(X - CAM.x) * CAM.z + W / 2, (Z * KZ - Y - CAM.y) * CAM.z + H / 2];
// камера так, чтобы точка мира (X, Z, Y) оказалась в (sx, sy) экрана при зуме z
const camAt = (X, Z, Y, z, sx = W / 2, sy = 420) => [X - (sx - W / 2) / z, Z * KZ - Y - (sy - H / 2) / z, z];

// ---------- расстановка ----------
const POS = {
  izba: [1250, 760], hay: [880, 900], bench: [1110, 935], door: [1340, 772],
  hillA: [1880, 560], hillB: [1820, 930], boss: [2090, 320],
  forest: [440, 360],
};
const TREES = [[290, 200], [440, 180], [590, 210], [230, 330], [370, 320], [520, 330], [660, 300], [300, 470], [450, 480], [600, 450]];
// дорога врага: от правого края к избе
const ROUTE = [[2450, 320], [2150, 325], [1950, 420], [1750, 580], [1580, 700]];
function distToRoute(x, z) {
  let d = 1e9;
  for (let i = 0; i < ROUTE.length - 1; i++) {
    const [ax, az] = ROUTE[i], [bx, bz] = ROUTE[i + 1];
    const vx = bx - ax, vz = bz - az, u = clamp(((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz));
    d = Math.min(d, Math.hypot(x - ax - vx * u, z - az - vz * u));
  }
  return d;
}
const TILES = [];
for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
  const X = i * TILE, Z = j * TILE, cx = X + TILE / 2, cz = Z + TILE / 2;
  const road = distToRoute(cx, cz) < 105;
  TILES.push({ i, j, X, Z, road, tf: 0, col: (i + j) % 2 ? C.earth : C.grass });
}
function initTiles() {
  for (const tl of TILES) {
    const u = clamp((tl.X + TILE / 2) / BW * 0.86 + hash2(tl.i, tl.j) * 0.14);
    tl.tf = lerp(EV.flip0, EV.flip1 - 0.4, u);
  }
}
const FLIP = 0.38;
const tileSnow = (X, Z, t) => { const tl = TILES[clamp(Math.floor(Z / TILE), 0, NZ - 1) * NX + clamp(Math.floor(X / TILE), 0, NX - 1)]; return clamp((t - tl.tf) / FLIP); };

// ---------- прыжки фишек ----------
// pts — точки [X, Z]; прыжок k идёт в [t0 + k*dur, t0 + (k+1)*dur]
function hops(t, t0, pts, dur, h) {
  const n = pts.length - 1;
  const k = clamp(Math.floor((t - t0) / dur), 0, n - 1 < 0 ? 0 : n - 1);
  if (t <= t0 || n < 1) return { X: pts[0][0], Z: pts[0][1], Y: 0, sq: land(t, t0 - 0.0001, 0), moving: false };
  const tk = t0 + k * dur, u = clamp((t - tk) / dur);
  if (t >= t0 + n * dur) return { X: pts[n][0], Z: pts[n][1], Y: 0, sq: land(t, t0 + n * dur), moving: false };
  const a = pts[k], b = pts[k + 1];
  const Y = Math.sin(Math.PI * u) * h;
  return { X: lerp(a[0], b[0], u), Z: lerp(a[1], b[1], u), Y, sq: u < 0.15 ? lerp(land(t, tk), 1.07, u / 0.15) : 1.07 - 0.07 * u, moving: true };
}
// сплющивание на приземлении
const land = (t, tl, amt = 0.16) => (t < tl ? 1 : 1 - amt * Math.sin(Math.PI * clamp((t - tl) / 0.16)) * (t - tl < 0.16 ? 1 : 0));
// прыжок на месте (топот, радость)
function hopInPlace(t, times, dur = 0.32, h = 40) {
  let Y = 0, sq = 1;
  for (const tl of times) {
    const t0 = tl - dur;
    if (t >= t0 && t < tl) { const u = (t - t0) / dur; Y = Math.sin(Math.PI * u) * h; sq = 1.06; }
    else if (t >= tl && t < tl + 0.16) sq = Math.min(sq, land(t, tl));
  }
  return { Y, sq };
}
const blink = (t, seed) => ((t * 0.31 + seed * 0.37) % 1 < 0.035 ? "closed" : null);

// ---------- состояния героев (их же рисует проба) ----------
function peasantState(t) {
  if (t < EV.peasantOut - 0.05) return null;
  const d = POS.door;
  const pts1 = [[d[0], d[1] + 6], [1300, 865], [1255, 955]];
  let st = hops(t, EV.peasantOut, pts1, 0.42, 46);
  const grow = easeOut(inv(EV.peasantOut - 0.05, EV.peasantOut + 0.25, t));
  const pose = { aL: 0.25, aR: 0.25, eyes: blink(t, 1) || "open", mouth: "smile", look: 0 };
  let sledPull = 0;
  // санки остаются там, куда их вытащили; верёвку держит до начала строфы 6
  if (t >= EV.sledOut - 0.2) sledPull = easeIO(inv(EV.sledOut - 0.2, EV.sledOut + 0.6, t));
  if (t >= EV.sledOut - 0.3 && t < EV.L21 - 0.25) { pose.aR = 1.05 + 0.15 * Math.sin(t * 6); pose.aL = 0.4; pose.mouth = "open"; }
  if (t >= EV.L19 - 0.2 && t < EV.L21) { pose.mouth = "smile"; pose.look = 1; }
  // строфа 6: к стогу, бросает солому
  const t6 = EV.L21 - 0.2;
  if (t >= t6) {
    st = hops(t, t6, [[1255, 955], [1150, 970], [1040, 985]], 0.4, 40);
    pose.look = -0.6; pose.mouth = "smile"; pose.aL = 0.3; pose.aR = 0.3;
    if (t > EV.L22 - 0.2) pose.look = 0.8;
    for (let i = 0; i < 4; i++) {
      const th = EV["straw" + i] - 0.5;   // бросок: руки вверх и вперёд
      const u = inv(th - 0.25, th + 0.05, t), v = inv(th + 0.1, th + 0.4, t);
      const a = 2.5 * easeOut(u) * (1 - easeIO(v));
      pose.aL = Math.max(pose.aL, 0.3 + a); pose.aR = Math.max(pose.aR, 0.3 + a);
    }
  }
  // строфа 7: смотрит на атаку, вздрагивает на ударах
  if (t >= EV.L25 - 0.2) {
    pose.look = 1; pose.eyes = "wide"; pose.mouth = "o"; pose.aL = 0.5; pose.aR = 0.5;
    for (const th of [EV.hit1, EV.seal, EV.hit2, EV.hit3]) if (t > th && t < th + 0.5) { pose.aL = 1.6; pose.aR = 1.6; }
  }
  // строфа 8: на лавку, спокоен
  const t8 = EV.L29 - 0.55;
  if (t >= t8) {
    st = hops(t, t8, [[1040, 985], [1110, 937]], 0.45, 80);
    const onB = t >= t8 + 0.45;
    if (onB) { st.Y = 44 * PS; st.sq = land(t, t8 + 0.45, 0.12) * (0.96 + 0.01 * Math.sin(t * 2.2)); }
    else st.Y += 44 * PS * easeIO(inv(t8, t8 + 0.45, t));
    pose.look = 0; pose.eyes = onB ? "happy" : "open"; pose.mouth = "smile";
    pose.aL = onB ? -0.42 : 0.4; pose.aR = onB ? -0.42 : 0.4;
    if (t > EV.win - 0.1) { pose.aL = 2.5 + 0.2 * Math.sin(t * 9); pose.aR = 2.5 + 0.2 * Math.sin(t * 9 + 1); pose.eyes = "happy"; pose.mouth = "open"; }
    if (t > EV.fin) { pose.aL = -0.42; pose.aR = -0.42; pose.mouth = "smile"; }
  }
  return { ...st, sq: st.sq, k: grow, pose, sledPull };
}
function kidState(t, which) {
  const t0 = EV.kidsOut + (which ? 0.4 : 0);
  if (t < t0 - 0.05) return null;
  const d = POS.door, hp = which ? POS.hillB : POS.hillA;
  const side = which ? -1 : 1;
  const tgt = which ? [hp[0] - 80, hp[1] + 85] : [hp[0] + 20, hp[1] + 95];
  const pts = [[d[0], d[1] + 6]];
  const n = 5;
  // путь в обход крестьянина: сначала вправо вдоль стены избы (за его спиной), потом к горе
  const mid = [1560, 790];
  for (let i = 1; i <= n; i++) { const u = i / n; const a = u < 0.4 ? [lerp(d[0], mid[0], u / 0.4), lerp(d[1] + 6, mid[1], u / 0.4)] : [lerp(mid[0], tgt[0], (u - 0.4) / 0.6), lerp(mid[1], tgt[1], (u - 0.4) / 0.6)]; pts.push(a); }
  let st = hops(t, t0, pts, 0.27, 36);
  const grow = easeOut(inv(t0 - 0.05, t0 + 0.2, t));
  const pose = { aL: 0.3, aR: 0.3, eyes: blink(t, 3 + which) || "open", mouth: "open", look: side * 0.3 };
  // строят: подпрыгивают и хлопают снег руками на каждом ярусе
  const hb = which ? EV.hillB : EV.hillA;
  const beats = [hb - 0.05, hb + 0.4, hb + 0.85];
  if (t > hb - 0.5 && t < hb + 1.4) {
    const hp2 = hopInPlace(t, beats, 0.3, 30); st = { ...st, Y: st.Y + hp2.Y, sq: Math.min(st.sq, hp2.sq) };
    const ph = beats.map((b) => Math.exp(-Math.pow((t - b + 0.12) / 0.12, 2))).reduce((a, b) => a + b, 0);
    pose.aL = 0.3 + 2.0 * (1 - ph); pose.aR = 0.3 + 2.0 * (1 - ph); pose.look = which ? 0.8 : -0.4; pose.eyes = "happy";
  }
  if (t >= hb + 1.4 && t < EV.L25 - 0.2) { pose.aL = which ? 0.3 : 2.4; pose.aR = which ? 2.4 : 0.3; pose.mouth = "smile"; pose.eyes = "happy"; }
  // атака: пригибаются за горой, радуются отскокам
  if (t >= EV.L25 - 0.2) {
    pose.eyes = "wide"; pose.mouth = "o"; pose.look = 1;
    const hits = [EV.hit1, EV.seal, EV.ball1, EV.ball2, EV.hit2, EV.hit3];
    let duck = 0; for (const th of hits) duck = Math.max(duck, win(t, th - 0.25, th + 0.2, 0.1, 0.15));
    st = { ...st, sq: st.sq * (1 - 0.18 * duck) };
    for (const th of hits) if (t > th + 0.2 && t < th + 0.7) { pose.aL = 2.4; pose.aR = 2.4; pose.eyes = "happy"; pose.mouth = "open"; }
  }
  const t8 = EV.L29 - 0.3 + which * 0.15;
  if (t >= t8) {
    const dest = which ? [1330, 1060] : [1560, 1050];
    const n8 = which ? 3 : 4, p8 = [tgt];
    for (let i = 1; i <= n8; i++) p8.push([lerp(tgt[0], dest[0], i / n8), lerp(tgt[1], dest[1], i / n8)]);
    st = hops(t, t8, p8, 0.3, 40);
  }
  if (t >= EV.L29 - 0.3) { pose.eyes = "happy"; pose.mouth = "smile"; pose.aL = 0.3; pose.aR = 0.3; pose.look = 0; }
  if (t >= EV.win - 0.1 && t < EV.fin + 0.4) {
    const hp3 = hopInPlace(t, [EV.win + 0.3 + which * 0.15, EV.win + 0.8 + which * 0.15, EV.win + 1.3 + which * 0.15], 0.35, 44);
    st = { ...st, Y: st.Y + hp3.Y, sq: Math.min(st.sq, hp3.sq) };
    pose.aL = 2.6; pose.aR = 2.6; pose.mouth = "open";
  }
  return { ...st, k: grow, pose };
}
function bossState(t) {
  const tl = EV.bossLand;
  if (t < tl - 0.55) return null;
  let X = POS.boss[0], Z = POS.boss[1], Y = Math.max(0, 900 * (1 - easeIn(inv(tl - 0.55, tl, t)))), sq = land(t, tl, 0.25);
  const pose = { aL: 0.9 + 0.12 * Math.sin(t * 2.1), aR: 0.9 + 0.12 * Math.sin(t * 2.1 + 1), eyes: blink(t, 7) === "closed" ? "closed" : "angry", mouth: "smile", look: -0.7, red: 0 };
  sq *= 1 + 0.015 * Math.sin(t * 2.6);
  // командует атакой
  if (t > EV.attack - 0.2 && t < EV.E28) { pose.aL = 2.2 + 0.3 * Math.sin(t * 7); pose.aR = 1.0; pose.mouth = "open"; }
  // злится, топает, дует
  if (t >= EV.stomp1 - 0.4) {
    pose.red = easeOut(inv(EV.stomp1 - 0.4, EV.stomp1 + 0.6, t)); pose.mouth = "frown"; pose.aL = 1.5; pose.aR = 1.5;
    const hp = hopInPlace(t, [EV.stomp1, EV.stomp2, EV.stomp3], 0.3, 50); Y += hp.Y; sq = Math.min(sq, hp.sq);
    if (t > EV.stomp2 + 0.15 && t < EV.stomp3 - 0.3) { pose.mouth = "blow"; pose.aL = 0.4; pose.aR = 0.4; }
  }
  // уходит с поля
  if (t >= EV.leave) {
    const st = hops(t, EV.leave, [[X, Z], [2200, 320], [2330, 300], [2480, 290], [2640, 280]], 0.36, 60);
    X = st.X; Z = st.Z; Y = st.Y; sq = st.sq; pose.look = 1; pose.mouth = "frown";
  }
  return { X, Z, Y, sq, pose, k: 1 };
}
// миньоны-сосульки
function minionState(t, i) {
  const tl = EV.bossLand + 0.35 + 0.25 * i;
  if (t < tl - 0.9) return null;
  const tgt = [[2210, 250], [2240, 420], [2160, 500]][i];
  let st = hops(t, tl - 0.75, [[2520, 300 + i * 70], [lerp(2520, tgt[0], 0.5), lerp(300 + i * 70, tgt[1], 0.5)], tgt], 0.375, 50);
  if (t >= EV.leave + 0.2 + i * 0.1) st = hops(t, EV.leave + 0.2 + i * 0.1, [tgt, [2400, tgt[1] - 20], [2600, tgt[1] - 40]], 0.34, 40);
  return st;
}
// духи атаки: A — Вьюга, B — Метель. Возвращают {X, Z, Y, rot, k, dir}
function spiritState(t, which) {
  const b = POS.boss, wallR = [1575, 700], wallF = [1420, 790];
  if (which === 0) {
    const t0 = EV.attack;
    if (t < t0 || t > EV.E28 + 0.9) return null;
    const ks = [
      [t0, [b[0], b[1] + 40, 140]], [EV.hit1 - 0.5, [1900, 470, 330]], [EV.hit1, [wallR[0] + 20, wallR[1], 120]], [EV.hit1 + 0.5, [1760, 560, 340]],
      [EV.seal - 0.45, [1680, 800, 260]], [EV.seal, [wallF[0] + 40, wallF[1] + 30, 95]], [EV.seal + 0.5, [1680, 720, 320]],
      [EV.hit2 - 0.45, [1800, 560, 340]], [EV.hit2, [wallR[0] + 25, wallR[1] - 10, 120]], [EV.hit2 + 0.6, [1950, 480, 380]],
      [EV.E28 + 0.9, [2650, 260, 320]],
    ];
    const [X, Z, Y] = keysV(t, ks, easeIO);
    return { X, Z, Y, rot: -t * 7, k: easeOut(inv(t0, t0 + 0.3, t)), dir: -1, name: "ВЬЮГА", nameT: EV.vyugi };
  }
  const t0 = EV.L26 - 0.2;
  if (t < t0 || t > EV.E28 + 1.0) return null;
  const ks = [
    [t0, [b[0] + 40, b[1] + 120, 200]], [EV.naduli - 0.2, [2130, 900, 150]], [EV.ball2 + 0.2, [2120, 910, 160]],
    [EV.ball2 + 0.45, [2080, 900, 540]], [EV.hit3 - 0.45, [1850, 860, 540]], [EV.hit3, [wallF[0] + 50, wallF[1] + 20, 105]], [EV.hit3 + 0.6, [1900, 760, 580]],
    [EV.E28 + 1.0, [2650, 420, 360]],
  ];
  const [X, Z, Y] = keysV(t, ks, easeIO);
  return { X, Z, Y, rot: -t * 6 + 1, k: easeOut(inv(t0, t0 + 0.3, t)), dir: -1, col: [196, 200, 244], name: "МЕТЕЛЬ", nameT: EV.meteli };
}
// облако и снежинки строфы 1
const cloudX = (t) => keys(t, [[EV.startPress, 2700], [EV.L1, 2050], [EV.E4, 700], [EV.L6, -300]], (u) => u);
const CLOUD_Z = 900, CLOUD_Y = 470;
const FLAKES = [];
function initFlakes() {
  const N = 46;
  for (let i = 0; i < N; i++) {
    const ts = i === 0 ? EV.L1 - 0.1 : lerp(EV.L1 - 0.4, EV.E3, hash(i * 3.1));
    const dur = i === 0 ? EV.flakeLand0 - ts : 1.5 + hash(i * 5.7) * 0.9;
    const X0 = cloudX(ts) + (hash(i * 7.3) - 0.5) * 220;
    const tx = i === 0 ? 1330 : clamp(X0 - 120 - hash(i * 2.2) * 260, 120, 2300), tz = i === 0 ? 1010 : lerp(560, 1330, hash(i * 9.1));
    FLAKES.push({ ts, tl: ts + dur, X0, Z0: CLOUD_Z + 20, tx, tz, rot0: hash(i) * 6, sp: 2 + hash(i * 4) * 3, sw: 30 + hash(i * 8) * 40 });
  }
}
function flakePos(f, t) {
  const u = clamp((t - f.ts) / (f.tl - f.ts));
  const X = lerp(f.X0, f.tx, u) + Math.sin(u * 7 + f.rot0) * f.sw * (1 - u);
  const Z = lerp(f.Z0, f.tz, u), Y = lerp(CLOUD_Y - 40, 0, u);
  return [X, Z, Y, u];
}
// снопы соломы: от стога к стене
function strawFly(t, i) {
  const tl = EV["straw" + i], t0 = tl - 0.5;
  if (t < t0 || t > tl) return null;
  const u = (t - t0) / 0.5;
  const from = [POS.hay[0], POS.hay[1] - 10, 210], to = [1250 + [-90, 100, 200, -30][i], 770, (20 + 35 * i) * PS];
  return [lerp(from[0], to[0], u), lerp(from[1], to[1], u), lerp(from[2], to[2], u) + Math.sin(Math.PI * u) * 160, u];
}
// снежки Метели
function ballFly(t, i) {
  const tl = i ? EV.ball2 : EV.ball1, t0 = tl - 0.55;
  if (t < t0 || t > tl) return null;
  const u = (t - t0) / 0.55, from = [2120, 900, 150], to = [POS.hillB[0] + 30, POS.hillB[1] - 10, 60];
  return [lerp(from[0], to[0], u), lerp(from[1], to[1], u), lerp(from[2], to[2], u) + Math.sin(Math.PI * u) * 90];
}

// ---------- камера ----------
let CAMK = null;
function camKeys() {
  const ov = (z = 0.74, sy = 450) => camAt(1200, 700, 0, z, W / 2, sy);
  const bossC = (z, sy = 450) => camAt(POS.boss[0] - 60, POS.boss[1] + 60, 160, z, W / 2, sy);
  return [
    [0, ov(0.66, 460)], [EV.V0 - 0.6, ov(0.74, 450)],
    [EV.L1 - 0.1, camAt(2000, CLOUD_Z, CLOUD_Y - 80, 0.95, W / 2, 330)],
    [EV.L2, camAt(1750, 960, 260, 1.0, W / 2, 380)],
    [EV.flakeLand0 - 0.2, camAt(1360, 1000, 60, 1.0, W / 2, 470)],
    [EV.E4 + 0.4, ov(0.74)],
    [EV.L5 + 0.2, camAt(560, 700, 0, 0.95, W / 2, 450)], [EV.E8 + 0.1, camAt(1840, 700, 0, 0.95, W / 2, 450)],
    [EV.L9 - 0.05, camAt(440, 380, 200, 0.95, W / 2, 400)], [EV.hatLand, camAt(440, 400, 170, 1.0, W / 2, 420)],
    [EV.L11, camAt(440, 470, 110, 1.2, W / 2, 440)], [EV.E12 + 0.2, camAt(440, 470, 110, 1.25, W / 2, 440)],
    [EV.L13 + 0.1, ov(0.74, 450)], [EV.morozcy - 0.45, ov(0.75, 450)],
    [EV.bossLand - 0.1, bossC(1.05)], [EV.winter - 0.15, bossC(1.1)],
    [EV.winter + 0.25, ov(0.74, 450)], [EV.E16 + 0.1, ov(0.74, 450)],
    [EV.L17 - 0.05, camAt(1340, 840, 120, 1.15, W / 2, 450)], [EV.sledOut + 0.4, camAt(1400, 880, 100, 1.1, W / 2, 450)],
    [EV.L19 - 0.1, camAt(1720, 740, 70, 0.95, W / 2, 440)], [EV.E20 + 0.2, camAt(1730, 740, 70, 1.0, W / 2, 440)],
    [EV.L21 - 0.05, camAt(1150, 850, 130, 1.0, W / 2, 450)], [EV.E24 + 0.1, camAt(1180, 840, 130, 1.05, W / 2, 450)],
    [EV.L25 - 0.1, camAt(1720, 620, 100, 0.74, W / 2, 520)], [EV.hit1 - 0.3, camAt(1680, 640, 100, 0.8, W / 2, 500)],
    [EV.seal - 0.35, camAt(1480, 780, 100, 1.05, W / 2, 450)], [EV.naduli, camAt(1800, 820, 80, 0.95, W / 2, 450)],
    [EV.vyugi - 0.1, camAt(1700, 650, 100, 0.76, W / 2, 510)], [EV.E28 + 0.3, camAt(1700, 650, 100, 0.76, W / 2, 510)],
    [EV.L29 - 0.1, camAt(1110, 935, 150, 1.25, W / 2, 480)], [EV.L30 - 0.05, camAt(1110, 935, 150, 1.25, W / 2, 480)],
    [EV.L30 + 0.6, ov(0.74, 450)], [EV.L31 - 0.1, bossC(1.05)],
    [EV.leave + 0.1, bossC(1.05)],
    [EV.win - 0.1, ov(0.74, 460)], [EV.fin + 0.2, camAt(1250, 760, 120, 0.9, 1260, 610)], [TOTAL, camAt(1250, 760, 120, 0.94, 1250, 620)],
  ];
}
function camShake(t) {
  let a = 0;
  for (const [tl, amp] of [[EV.hatLand, 14], [EV.bossLand, 22], [EV.winter, 12], [EV.hit1, 10], [EV.seal, 8], [EV.hit2, 12], [EV.hit3, 12], [EV.stomp1, 10], [EV.stomp2, 10], [EV.stomp3, 14]]) {
    if (t > tl && t < tl + 0.45) a = Math.max(a, amp * (1 - (t - tl) / 0.45));
  }
  return shake(t, a, 11);
}
function setCam(t) {
  CAMK = CAMK || camKeys();
  const [x, y, z] = keysV(t, CAMK, easeIO);
  const [sx, sy] = camShake(t);
  CAM = { x: x + sx / z, y: y + sy / z, z };
  SZ = z * PS;
}

// ---------- доска ----------
function drawTable(g) {
  g.fillStyle = pat(g, "table", -CAM.x * CAM.z * 0.9, -CAM.y * CAM.z * 0.9, CAM.z * 1.4, 90);
  g.fillRect(0, 0, W, H);
  const vg = g.createRadialGradient(W / 2, H * 0.45, H * 0.3, W / 2, H * 0.45, H * 1.05);
  vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(20,10,4,0.55)"); g.fillStyle = vg; g.fillRect(0, 0, W, H);
}
function drawBoard(g, t) {
  const [x0, y0] = P(-60, -90), [x1, y1] = P(BW + 60, BD + 90);
  // тень доски и рамка
  g.save(); g.shadowColor = "rgba(10,5,2,0.6)"; g.shadowBlur = 40 * CAM.z; g.shadowOffsetY = 18 * CAM.z;
  rrect(g, x0, y0, x1 - x0, y1 - y0 + 26 * CAM.z, 18 * CAM.z); g.fillStyle = css([70, 40, 22]); g.fill(); g.restore();
  rrect(g, x0, y0, x1 - x0, y1 - y0, 18 * CAM.z); g.fillStyle = pat(g, "pine", x0, y0, CAM.z * 0.9); g.fill();
  rrect(g, x0, y0, x1 - x0, y1 - y0, 18 * CAM.z); paintPath(g, C.vermD, { a: 0.55, grain: false });
  // торец доски
  g.beginPath(); g.rect(x0 + 10, y1, x1 - x0 - 20, 24 * CAM.z); g.fillStyle = "rgba(40,20,8,0.5)"; g.fill();
  const [bx0, by0] = P(0, 0), [bx1, by1] = P(BW, BD);
  g.beginPath(); g.rect(bx0, by0, bx1 - bx0, by1 - by0); g.fillStyle = pat(g, "board", bx0, by0, CAM.z); g.fill();
  // клетки: краска, с переворотом в снег
  const gap = 5 * CAM.z, rr = 8 * CAM.z;
  for (const tl of TILES) {
    let [ax, ay] = P(tl.X, tl.Z), [bx, by] = P(tl.X + TILE, tl.Z + TILE);
    if (bx < -10 || ax > W + 10 || by < -10 || ay > H + 10) continue;
    const u = clamp((t - tl.tf) / FLIP);
    const k = Math.abs(Math.cos(Math.PI * u));
    const snow = u >= 0.5;
    let col = snow ? (tl.road ? C.snowS : C.snow) : (tl.road ? C.path : tl.col);
    if (!snow) col = shade(col, (hash2(tl.i * 3, tl.j) - 0.5) * 0.12);
    else col = shade(col, -(hash2(tl.i, tl.j * 5)) * 0.04);
    const cy = (ay + by) / 2, hh = (by - ay - gap) * Math.max(0.06, k) / 2, lift = Math.sin(Math.PI * u) * 22 * CAM.z;
    rrect(g, ax + gap / 2, cy - hh - lift, bx - ax - gap, hh * 2, Math.min(rr, hh));
    g.fillStyle = css(col); g.fill();
    if (u > 0 && u < 1) { g.fillStyle = css(snow ? C.snowB : C.earthD, 0.35 * (1 - k)); g.fill(); }
  }
  // волокна сквозь краску — одним слоем
  g.save(); g.beginPath(); g.rect(bx0, by0, bx1 - bx0, by1 - by0); g.clip();
  g.globalCompositeOperation = "multiply"; g.globalAlpha = 0.2;
  g.fillStyle = pat(g, "grainGrey", bx0, by0, CAM.z * 0.7); g.fillRect(bx0, by0, bx1 - bx0, by1 - by0);
  g.restore();
  // пелена: белое полотно на фронте переворота
  if (t > EV.flip0 && t < EV.flip1 + 0.3) {
    const fx = lerp(-100, BW + 100, inv(EV.flip0, EV.flip1 - 0.2, t));
    const [px] = P(fx, 0);
    g.save(); g.beginPath(); g.rect(bx0, by0, bx1 - bx0, by1 - by0); g.clip();
    const gr = g.createLinearGradient(px - 260 * CAM.z, 0, px + 40 * CAM.z, 0);
    gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.75, "rgba(255,255,255,0.55)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(px - 260 * CAM.z, by0 - 40);
    for (let i = 0; i <= 20; i++) { const yy = lerp(by0 - 40, by1 + 40, i / 20); g.lineTo(px + Math.sin(i * 1.3 + t * 5) * 30 * CAM.z, yy); }
    g.lineTo(px - 260 * CAM.z, by1 + 40); g.closePath(); g.fill();
    g.restore();
  }
}

// ---------- фишки ----------
function drawPegAt(g, st, spec, shadowR) {
  const s = SZ * (st.k ?? 1);
  if (s <= 0.01) return;
  const [gx, gy] = P(st.X, st.Z, st.base || 0);
  const [px, py] = P(st.X, st.Z, (st.base || 0) + st.Y);
  dropShadow(g, gx, gy, shadowR * SZ * (1 - Math.min(0.5, st.Y / 400)), shadowR * 0.32 * SZ, 0.4 * (1 - Math.min(0.6, st.Y / 300)));
  peg(g, px, py, s, spec, { ...st.pose, sq: st.sq });
}
function drawWorld(g, t) {
  const items = [];
  const add = (Z, fn) => items.push([Z, fn]);
  // ёлки (под шапкой спят)
  const hatT = EV.hatLand;
  TREES.forEach(([X, Z], i) => add(Z, () => {
    const [x, y] = P(X, Z);
    dropShadow(g, x, y, 60 * SZ, 18 * SZ, 0.35);
    const look = t < hatT ? -0.2 : 0;
    const wake = t < EV.sleep ? 1 : 1 - easeIO(inv(EV.sleep, EV.sleep + 0.5 + hash(i) * 0.6, t));
    const surprised = t > hatT - 0.8 && t < hatT + 0.3;
    firTree(g, x, y, SZ * (0.9 + hash(i * 3) * 0.25) * (1 + (surprised ? 0.05 * Math.sin(t * 30 + i) : 0)), { eyes: surprised ? 1.2 : wake, look, snow: tileSnow(X, Z, t), sway: 0.02 * Math.sin(t * 1.3 + i) });
  }));
  // шапка на лес
  if (t > hatT - 0.6) add(700, () => {
    const Y = 95 * PS + 900 * (1 - easeIn(inv(hatT - 0.6, hatT, t)));
    const [x, y] = P(POS.forest[0], POS.forest[1], Y);
    const [sx, sy] = P(POS.forest[0], POS.forest[1] + 40);
    dropShadow(g, sx, sy, 250 * SZ * (1 - Math.min(0.5, (Y - 133) / 1400)), 80 * SZ, 0.3);
    bigHat(g, x, y, SZ * 0.68, land(t, hatT, 0.22) * (1 + 0.01 * Math.sin(t * 1.5)));
  });
  // изба
  add(POS.izba[1], () => {
    const [x, y] = P(...POS.izba);
    dropShadow(g, x + 40 * SZ, y - 20 * SZ, 230 * SZ, 70 * SZ, 0.4);
    const setup = easeOut(inv(0, EV.setup + 0.25, t));
    const Y0 = (1 - setup) * 110;
    const hitSq = [EV.hit1, EV.seal, EV.hit2, EV.hit3].reduce((a, th) => Math.min(a, land(t, th, 0.05)), 1);
    const r = izba(g, x, y - Y0 * SZ, SZ, {
      snowRoof: tileSnow(1250, 700, t), straw: clamp((t - EV.straw0 + 0.05) / (EV.straw3 - EV.straw0 + 0.05) * 0.75 + (t >= EV.straw0 ? 0.25 : 0)) * (t >= EV.straw0 - 0.05 ? 1 : 0),
      glow: lerp(0.35, 1, inv(EV.win, EV.fin + 1, t)), door: win(t, EV.peasantOut - 0.4, EV.kidsOut + 0.9, 0.3, 0.4), sq: hitSq * land(t, EV.setup + 0.35, 0.1),
    });
    // дым из трубы: строфы 6–8 и финал
    if (t > EV.L21) for (let i = 0; i < 7; i++) {
      const ph = ((t * 0.45 + i / 7) % 1);
      const [cx, cy] = r.chimney;
      const rr = (12 + 34 * ph) * SZ;
      g.beginPath(); g.arc(cx + Math.sin(ph * 5 + i) * 16 * SZ - ph * 50 * SZ, cy - ph * 230 * SZ, rr, 0, TAU);
      g.fillStyle = `rgba(236,236,240,${0.55 * (1 - ph) * clamp((t - EV.L21) * 2)})`; g.fill();
    }
  });
  // стог, лавка
  add(POS.hay[1], () => { const [x, y] = P(...POS.hay); dropShadow(g, x, y, 100 * SZ, 30 * SZ); const set = easeOut(inv(EV.setup + 0.5, EV.setup + 0.85, t)); haystack(g, x, y - (1 - set) * 260 * SZ, SZ, lerp(1, 0.55, inv(EV.straw0 - 0.5, EV.straw3, t))); });
  add(POS.bench[1] + 1, () => { const [x, y] = P(...POS.bench); dropShadow(g, x, y, 80 * SZ, 20 * SZ, 0.3); const set = easeOut(inv(EV.setup + 0.65, EV.setup + 1.0, t)); bench(g, x, y - (1 - set) * 240 * SZ, SZ); });
  // горы-бастионы
  [["hillA", EV.hillA], ["hillB", EV.hillB]].forEach(([k, t0]) => {
    const lv = clamp((t - t0 + 0.05) / 0.45 + 0) ; const lvl = t < t0 - 0.05 ? 0 : Math.min(3, (t - t0 + 0.05) / 0.45 + 0.4);
    if (lvl <= 0) return;
    add(POS[k][1], () => { const [x, y] = P(...POS[k]); dropShadow(g, x, y, 90 * SZ, 28 * SZ, 0.3); snowHill(g, x, y, SZ * 1.2, lvl); });
  });
  // санки
  const ps = peasantState(t);
  if (t > EV.sledOut - 0.4) {
    const u = ps ? ps.sledPull : 1;
    const X = lerp(1540, 1450, u), Z = lerp(690, 965, u);
    add(Z, () => { const [x, y] = P(X, Z); dropShadow(g, x, y, 70 * SZ, 16 * SZ, 0.3); sled(g, x, y, SZ * 0.95, -1);
    });
  }
  // верёвка от правой руки крестьянина к передку санок (поверх избы)
  if (ps && t > EV.sledOut - 0.4 && t < EV.L21 - 0.25) {
    const u = ps.sledPull, sX = lerp(1540, 1450, u), sZ = lerp(690, 965, u);
    add(Math.max(ps.Z, sZ, POS.izba[1]) + 2, () => {
      const [x, y] = P(sX, sZ);
      const [hx, hy] = pegHand(...P(ps.X, ps.Z, ps.Y), SZ * ps.k, SPEC.muzhik, { ...ps.pose, sq: ps.sq }, 1);
      const [fx, fy] = [x - 62 * SZ * 0.95, y - 18 * SZ];
      g.beginPath(); g.moveTo(hx, hy); g.quadraticCurveTo((hx + fx) / 2, Math.max(hy, fy) + 30 * SZ * (1 - u * 0.7), fx, fy);
      g.strokeStyle = css([120, 84, 44]); g.lineWidth = 4 * SZ; g.lineCap = "round"; g.stroke();
    });
  }
  // герои
  if (ps) add(ps.Z, () => drawPegAt(g, ps, SPEC.muzhik, 62));
  for (const w of [0, 1]) { const ks = kidState(t, w); if (ks) add(ks.Z, () => drawPegAt(g, ks, w ? SPEC.girl : SPEC.boy, 44)); }
  const bs = bossState(t);
  if (bs) add(bs.Z, () => {
    drawPegAt(g, bs, SPEC.frost, 92);
    if (t >= EV.bossLand && t < EV.bossLand + 0.6) { const [x, y] = P(bs.X, bs.Z, 20); burst(g, x, y, SZ * 1.6, (t - EV.bossLand) / 0.6, C.ice); }
    // дыхание Мороза: холодная струя к избе (обрывается у соломы)
    const bl = win(t, EV.stomp2 + 0.15, EV.stomp3 - 0.3, 0.15, 0.15);
    if (bl > 0) {
      
      for (let i = 0; i < 9; i++) {
        const ph = (t * 1.8 + i / 9) % 1;
        const [ex, ey] = P(lerp(bs.X - 40, 1600, ph), lerp(bs.Z, 700, ph), lerp(bs.Y + 230 * PS, 130, ph));
        g.beginPath(); g.ellipse(ex, ey, (18 + 30 * ph) * SZ, (8 + 10 * ph) * SZ, -0.4, 0, TAU);
        g.fillStyle = `rgba(230,244,255,${0.75 * bl * (1 - ph * 0.6)})`; g.fill();
      }
    }
  });
  for (let i = 0; i < 3; i++) { const m = minionState(t, i); if (m) add(m.Z, () => { const [gx, gy] = P(m.X, m.Z); dropShadow(g, gx, gy, 34 * SZ, 10 * SZ, 0.35 * (1 - Math.min(0.6, m.Y / 200))); const [x, y] = P(m.X, m.Z, m.Y); icicle(g, x, y, SZ, { sq: m.sq }); }); }
  for (const w of [0, 1]) {
    const sp = spiritState(t, w);
    if (!sp) continue;
    add(sp.Z, () => {
      const [gx, gy] = P(sp.X, sp.Z); dropShadow(g, gx, gy, 60 * SZ, 16 * SZ, 0.25);
      const [x, y] = P(sp.X, sp.Z, sp.Y);
      windSpirit(g, x, y, SZ * sp.k, { rot: sp.rot, dir: sp.dir, t, col: sp.col, puff: 0.5 + 0.5 * Math.sin(t * 8) });
    });
    // табличка с именем, когда его называет голос — поверх всех фишек
    const nv = easeOut(inv(sp.nameT - 0.1, sp.nameT + 0.25, t));
    if (nv > 0) add(3000 + w, () => { const [x, y] = P(sp.X, sp.Z, sp.Y); tag(g, x, y - 115 * SZ, sp.name, SZ * 0.95 * SPRING(nv)); });
  }
  // удары о солому и о горы
  for (const [th, X, Z, Y] of [[EV.hit1, 1585, 700, 120], [EV.seal, 1440, 800, 95], [EV.hit2, 1590, 690, 125], [EV.hit3, 1450, 800, 105], [EV.ball1, POS.hillB[0] + 30, POS.hillB[1], 60], [EV.ball2, POS.hillB[0] + 30, POS.hillB[1], 70]]) {
    if (t > th && t < th + 0.55) add(Z + 5, () => { const [x, y] = P(X, Z, Y); burst(g, x, y, SZ, (t - th) / 0.55); });
  }
  for (let i = 0; i < 2; i++) { const b = ballFly(t, i); if (b) add(b[1], () => { const [x, y] = P(b[0], b[1], b[2]); g.beginPath(); g.arc(x, y, 20 * SZ, 0, TAU); paintPath(g, C.white, { grain: false }); g.beginPath(); g.arc(x, y, 20 * SZ, 0, TAU); ballShade(g, x, y, 20 * SZ); }); }
  for (let i = 0; i < 4; i++) {
    const s = strawFly(t, i);
    if (s) add(s[1] + 30, () => { const [x, y] = P(s[0], s[1], s[2]); g.save(); g.translate(x, y); g.rotate(s[3] * 5); g.beginPath(); rrect(g, -36 * SZ, -12 * SZ, 72 * SZ, 24 * SZ, 8 * SZ); paintPath(g, C.straw, { sc: 0.3, ga: 0.3 }); g.strokeStyle = css(C.verm); g.lineWidth = 4 * SZ; g.beginPath(); g.moveTo(0, -12 * SZ); g.lineTo(0, 12 * SZ); g.stroke(); g.restore(); });
  }
  // значки «+щит»
  for (let i = 0; i < 4; i++) {
    const th = EV["straw" + i];
    if (t > th && t < th + 0.9) add(2000, () => { const u = (t - th) / 0.9; const [x, y] = P(1250 + [20, 90, 160, 230][i], 770, (170 + 20 * i) * PS + 120 * easeOut(u)); g.save(); g.globalAlpha = 1 - easeIn(u); tag(g, x, y, "+ЩИТ", SZ * 0.8 * SPRING(clamp(u * 3)), C.green); g.restore(); });
  }
  // снежинки строфы 1 (в воздухе и на доске)
  if (t > EV.L1 - 0.6 && t < EV.flip1 + 0.5) for (const f of FLAKES) {
    if (t < f.ts) continue;
    const [X, Z, Y, u] = flakePos(f, t);
    const fade = 1 - tileSnow(f.tx, f.tz, t);
    if (fade <= 0) continue;
    add(Z + (u >= 1 ? -400 : 0) + 0.5, () => {
      const [x, y] = P(X, Z, Y);
      if (u < 1) { const [gx, gy] = P(X, Z); dropShadow(g, gx, gy, 20 * SZ, 6 * SZ, 0.15 * u); flake(g, x, y, SZ * 0.9, f.rot0 + t * 0.8, t * f.sp, 1); }
      else { g.save(); g.translate(x, y); g.scale(1, 0.55); flake(g, 0, 0, SZ * 0.9 * land(t, f.tl, 0.2), f.rot0, 0, fade); g.restore(); }
    });
  }
  // облако
  if (t > EV.startPress - 0.2 && t < EV.L6 + 0.3) add(CLOUD_Z, () => { const X = cloudX(t); const [x, y] = P(X, CLOUD_Z, CLOUD_Y); const [gx, gy] = P(X, CLOUD_Z); dropShadow(g, gx, gy, 200 * SZ, 50 * SZ, 0.18); cloudPiece(g, x, y, SZ * 1.25, Math.sin(t * 3)); });
  // Zzz из-под шапки
  if (t > EV.sleep) for (let i = 0; i < 3; i++) add(800, () => {
    const ph = ((t - EV.sleep) * 0.4 + i / 3) % 1;
    const [x, y] = P(POS.forest[0] + 60 + ph * 160, POS.forest[1], 95 * PS + 330 + ph * 240);
    zToken(g, x, y, SZ * (0.8 + ph * 0.8), Math.sin(Math.PI * ph) * clamp((t - EV.sleep) * 2) * (1 - inv(EV.fin - 0.6, EV.fin, t)));
  });
  items.sort((a, b) => a[0] - b[0]);
  for (const [, fn] of items) { reset(g); fn(); }
  reset(g);
}
// деревянный ярлык с выжженной надписью (над фишкой)
function tag(g, x, y, s, k, col = C.cobalt) {
  if (k <= 0.01) return;
  g.save(); g.translate(x, y); g.scale(k, k);
  g.font = `40px "ZTitle"`; const tw = g.measureText(s).width;
  rrect(g, -tw / 2 - 18, -30, tw + 36, 60, 12); g.fillStyle = pat(g, "pine", 0, 0, 0.4); g.fill();
  rrect(g, -tw / 2 - 18, -30, tw + 36, 60, 12); g.strokeStyle = css(col); g.lineWidth = 5; g.stroke();
  g.fillStyle = css(col); g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(s, 0, 2);
  g.restore();
}
// тон: холод после «зима настала», сумерки в финале
function drawTint(g, t) {
  const cold = 0.14 * easeIO(inv(EV.winter - 0.1, EV.winter + 0.8, t)) * (1 - 0.6 * inv(EV.win, EV.win + 1, t));
  if (cold > 0) { g.fillStyle = `rgba(90,130,200,${cold})`; g.fillRect(0, 0, W, H); }
  const dusk = 0.2 * easeIO(inv(EV.fin - 0.5, EV.fin + 1.5, t));
  if (dusk > 0) {
    g.save(); g.globalCompositeOperation = "multiply"; g.fillStyle = `rgba(96,120,180,${dusk * 1.2})`; g.fillRect(0, 0, W, H); g.restore();
  }
  // метель в строфе 7: белые штрихи по экрану
  const bz = win(t, EV.attack, EV.E28 + 0.6, 0.4, 0.6);
  if (bz > 0) {
    g.strokeStyle = `rgba(255,255,255,${0.55 * bz})`; g.lineCap = "round";
    for (let i = 0; i < 46; i++) {
      const sp = 900 + hash(i) * 900, y0 = hash(i * 3.3) * H * 0.85;
      const x = W + 200 - ((t * sp + hash(i * 7) * 4000) % (W + 600));
      g.lineWidth = 3 + hash(i * 5) * 5;
      g.beginPath(); g.moveTo(x, y0 + Math.sin(t * 3 + i) * 20); g.lineTo(x + 60 + hash(i * 9) * 90, y0 + Math.sin(t * 3 + i) * 20 - 14); g.stroke();
    }
  }
  // победный салют из снежинок
  const cf = inv(EV.win, EV.win + 3.2, t);
  if (cf > 0 && cf < 1) for (let i = 0; i < 30; i++) {
    const tt = t - EV.win, a = hash(i * 2.1) * TAU, sp = 300 + hash(i * 3.7) * 500;
    const x = W / 2 + Math.cos(a) * sp * tt, y = 330 + Math.sin(a) * sp * tt * 0.7 + 260 * tt * tt;
    flake(g, x, y, 0.7, tt * 3 + i, tt * 6 + i, 1 - cf);
  }
}
function render(g, t) {
  reset(g);
  setCam(t);
  drawTable(g);
  drawBoard(g, t);
  drawWorld(g, t);
  reset(g);
  drawTint(g, t);
  reset(g);
  drawHud(g, t);
  reset(g);
  drawVerse(g, t);
}
initTiles(); initFlakes();
