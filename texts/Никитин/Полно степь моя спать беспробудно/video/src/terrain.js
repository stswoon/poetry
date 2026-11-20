// ---------- Рельеф степи: пологие увалы, овраг с ручьём, сезонная окраска граней ----------
function vn(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), fx = x - xi, fz = z - zi;
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  return lerp(lerp(hash2(xi, zi), hash2(xi + 1, zi), u), lerp(hash2(xi, zi + 1), hash2(xi + 1, zi + 1), u), v);
}
const baseH = (x, z) => 24 * (vn(x / 320, z / 320) - 0.5) + 9 * (vn(x / 120 + 7.3, z / 120 - 2.1) - 0.5) + 2.2 * (vn(x / 34 + 3.1, z / 34 + 9.7) - 0.5);

// полилиния с длиной дуги: [[x, z, s]...]
function polyline(pts) {
  const out = []; let s = 0;
  for (let i = 0; i < pts.length; i++) { if (i) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); out.push([pts[i][0], pts[i][1], s]); }
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
  for (const p of out) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
  return { p: out, len: s, bb: [x0, x1, z0, z1] };
}
// расстояние до полилинии и параметр вдоль неё
function nearPL(pl, x, z, maxd) {
  const bb = pl.bb;
  if (x < bb[0] - maxd || x > bb[1] + maxd || z < bb[2] - maxd || z > bb[3] + maxd) return null;
  let best = 1e9, bs = 0, side = 0;
  const p = pl.p;
  for (let i = 0; i < p.length - 1; i++) {
    const ax = p[i][0], az = p[i][1], bx = p[i + 1][0], bz = p[i + 1][1];
    const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1;
    const u = clamp(((x - ax) * dx + (z - az) * dz) / L2);
    const qx = ax + dx * u, qz = az + dz * u, d = Math.hypot(x - qx, z - qz);
    if (d < best) { best = d; bs = lerp(p[i][2], p[i + 1][2], u); side = Math.sign(dx * (z - az) - dz * (x - ax)); }
  }
  return best <= maxd ? { d: best, s: bs, side } : null;
}

let RAV = null;    // овраг: полилиния по пути дрона (camera.js)
let ROAD = null;   // дорога строфы 1
const RAV_D = 13, RAV_BOT = 2.6, RAV_TOP = 17;
function carve(x, z) {
  if (!RAV) return 0;
  const q = nearPL(RAV, x, z, RAV_TOP + 4);
  if (!q) return 0;
  const d = q.d + 2.2 * (vn(x / 14 + 40, z / 14 - 7) - 0.5);
  const f = 1 - ease(inv(RAV_BOT, RAV_TOP, d));
  const taper = ease(inv(0, 60, q.s)) * ease(inv(RAV.len, RAV.len - 60, q.s));
  return RAV_D * Math.pow(f, 1.25) * taper;
}
let KURG = [];   // курганы: {x, z, h, r}
const kurganH = (x, z) => { let s = 0; for (const k of KURG) { const d2 = ((x - k.x) ** 2 + (z - k.z) ** 2) / (k.r * k.r); if (d2 < 9) s += k.h * Math.exp(-d2); } return s; };
const Hx = (x, z) => baseH(x, z) + kurganH(x, z) - carve(x, z);
const HC = new Map();
function Hg(ix, iz) {   // высота в узле решётки 5 м (кэш)
  const k = (ix + 60000) * 120000 + (iz + 60000);
  let h = HC.get(k);
  if (h === undefined) { h = Hx(ix * 5, iz * 5); HC.set(k, h); }
  return h;
}

// ---------- Сезоны ----------
const COL = {
  snow: [236, 242, 252], snowS: [206, 220, 244], earth: [116, 90, 68], earthW: [92, 70, 56], olive: [124, 122, 74],
  green: [100, 156, 68], green2: [142, 170, 82], summer: [184, 184, 124], summer2: [206, 200, 150], hay: [218, 184, 104],
  autumn: [172, 112, 66], autumn2: [140, 100, 74], road: [186, 156, 110], roadW: [104, 82, 64], water: [96, 170, 226],
};
const SEASON = { pm: [0, 0], pg: [0, 0], ps: [0, 0], pa: [0, 0] };
const SUM_V = 170, AUT_V = 55, AUT_T0 = EV.E24 + 0.1;   // скорость волн лета и осени, м/с
function snowAt(x, z, t) {
  if (t < EV.carstvo) return 1;
  const dist = Math.hypot(x - SEASON.pm[0], z - SEASON.pm[1]);
  const front = (t - EV.carstvo) * 260;
  const fs = clamp((dist - front) / 40 + 0.5 + 0.6 * (vn(x / 50, z / 50) - 0.5));
  const thr = lerp(0.58, 1.06, ease(inv(EV.carstvo + 0.6, EV.propal + 0.3, t)));
  const ps = clamp((vn(x / 22 + 11, z / 22 - 5) - thr) * 9 + 0.5);
  return Math.max(fs, ps);
}
const frontAmt = (p, t0, speed, x, z, t, soft = 45) => t < t0 ? 0 : clamp(((t - t0) * speed - Math.hypot(x - p[0], z - p[1])) / soft + 0.5 + 0.5 * (vn(x / 60 + 3, z / 60) - 0.5));
let MOWN = [];   // скошенные полосы: {x, z, dx, dz, len, w}
function mownAt(x, z) {
  for (const m of MOWN) {
    const rx = x - m.x, rz = z - m.z;
    const along = rx * m.dx + rz * m.dz, across = Math.abs(-rx * m.dz + rz * m.dx);
    if (along > -0.5 && along < m.len && across < m.w) return 1;
  }
  return 0;
}
function groundCol(x, z, h, t, lod = 1) {
  const v = vn(x / 70 + 9, z / 70 - 4);
  let c = mix(COL.earth, COL.earthW, v * 0.6);
  c = mix(c, COL.olive, 0.55 * ease(inv(EV.probud - 0.4, EV.E6, t)));
  const gr = frontAmt(SEASON.pg, EV.prinakr, 170, x, z, t);
  if (gr > 0) { let gc = mix(COL.green, COL.green2, v); gc = mix(gc, [168, 170, 94], clamp((vn(x / 26 + 5, z / 26 + 8) - 0.55) * 2.4) * 0.55); gc = mix(gc, [70, 120, 70], clamp((vn(x / 90 - 3, z / 90 + 2) - 0.6) * 2.5) * 0.5); c = mix(c, gc, gr); }
  const su = frontAmt(SEASON.ps, EV.E20 + 0.15, SUM_V, x, z, t);
  if (su > 0) {
    let sc = mix(COL.summer, COL.summer2, v);
    if (MOWN.length && mownAt(x, z)) sc = COL.hay;
    c = mix(c, sc, su);
  }
  const au = frontAmt(SEASON.pa, AUT_T0, AUT_V, x, z, t);
  if (au > 0) c = mix(c, mix(COL.autumn, COL.autumn2, v), au);
  // весенние лужи: после таяния блестят небом, сохнут, когда приходит мурава
  const pud = clamp((vn(x / 9 + 3, z / 9 + 7) - 0.77) * 9) * ease(inv(EV.carstvo + 0.4, EV.propal, t)) * (1 - ease(inv(EV.L5, EV.prinakr + 0.5, t))) * (1 - gr);
  if (pud > 0 && lod === 1) c = mix(c, [178, 206, 240], pud);
  if (t < EV.propal + 1) { const s = snowAt(x, z, t); if (s > 0) c = mix(c, mix(COL.snow, COL.snowS, v * 0.5), s); }
  if (SHADOW_ON) c = mul(c, 1 - 0.5 * SHADOW_K * cloudShadow(x, z));
  // дно оврага влажное и темнее
  if (RAV && h < baseH(x, z) - 4) c = mix(c, [70, 96, 60], 0.25);
  return c;
}

// высота той самой грани мелкой сетки 5 м, что рисуется (а не гладкой функции): на неё ставим предметы вплотную
function Hsurf(x, z) {
  const ix = Math.floor(x / 5), iz = Math.floor(z / 5), u = x / 5 - ix, v = z / 5 - iz;
  const h00 = Hg(ix, iz), h10 = Hg(ix + 1, iz), h01 = Hg(ix, iz + 1), h11 = Hg(ix + 1, iz + 1);
  if (hash2(ix * 3 + 1, iz * 7 + 2) < 0.5) return u >= v ? h00 + (h10 - h00) * u + (h11 - h10) * v : h00 + (h11 - h01) * u + (h01 - h00) * v;
  return u + v <= 1 ? h00 + (h10 - h00) * u + (h01 - h00) * v : h11 + (h01 - h11) * (1 - u) + (h10 - h11) * (1 - v);
}
// ---------- Сетка рельефа: 40 м → 10 м → 5 м по удалению ----------
const R2 = 1750, R1 = 330, R0 = 105;
function cellVisible(xc, yc, zc, rad) {
  const c = toCam([xc, yc, zc]);
  if (c[2] < -rad) return false;
  return Math.hypot(c[0], c[1]) < Math.max(0, c[2] + rad) * 1.13 + rad * 1.6;
}
function quad(ix, iz, n, t) {   // ix, iz — индексы узла решётки 5 м; n — размер клетки в узлах
  const x0 = ix * 5, z0 = iz * 5, s = n * 5;
  const h00 = Hg(ix, iz), h10 = Hg(ix + n, iz), h01 = Hg(ix, iz + n), h11 = Hg(ix + n, iz + n);
  const A = [x0, h00, z0], B = [x0 + s, h10, z0], C = [x0 + s, h11, z0 + s], D = [x0, h01, z0 + s];
  const tri = (p, q, r) => {
    let nn = vnorm(vcross(vsub(r, p), vsub(q, p)));
    if (nn[1] < 0) nn = vsc(nn, -1);
    const cx = (p[0] + q[0] + r[0]) / 3, cy = (p[1] + q[1] + r[1]) / 3, cz = (p[2] + q[2] + r[2]) / 3;
    face([p, q, r], groundCol(cx, cz, cy, t, n), { n: nn, pl: 0.35, jit: 0.08, seed: cx * 0.37 + cz * 1.91, mist: MIST.on ? mistAt(cx, cy, cz, t) : 0 });
  };
  if (hash2(ix * 3 + 1, iz * 7 + 2) < 0.5) { tri(A, B, C); tri(A, C, D); } else { tri(A, B, D); tri(B, C, D); }
}
// клетки у оврага всегда мелкие: иначе край крупной клетки ложится над оврагом по бровке и в щель видно небо
const RAV40 = new Set(), RAV10 = new Set();
function initRavCells() {
  if (!RAV) return;
  const [x0, x1, z0, z1] = RAV.bb, m = RAV_TOP + 12;
  for (let x = Math.floor((x0 - m) / 10) * 10; x <= x1 + m; x += 10) for (let z = Math.floor((z0 - m) / 10) * 10; z <= z1 + m; z += 10) {
    if (!nearPL(RAV, x + 5, z + 5, RAV_TOP + 10)) continue;
    RAV10.add(Math.floor(x / 10) * 100003 + Math.floor(z / 10));
    RAV40.add(Math.floor(x / 40) * 100003 + Math.floor(z / 40));
  }
}
function drawTerrain(t) {
  const n8 = Math.ceil(R2 / 40) + 1;
  const bx = Math.floor(CAM.x / 40), bz = Math.floor(CAM.z / 40);
  for (let i = -n8; i <= n8; i++) for (let j = -n8; j <= n8; j++) {
    const ix = (bx + i) * 8, iz = (bz + j) * 8;   // в узлах 5 м
    const xc = ix * 5 + 20, zc = iz * 5 + 20;
    const d2 = Math.hypot(xc - CAM.x, zc - CAM.z);
    if (d2 > R2) continue;
    const yc = Hg(ix + 4, iz + 4);
    if (!cellVisible(xc, yc, zc, 36)) continue;
    const d3 = Math.hypot(d2, CAM.y - yc);
    if (d3 > R1 + 30 && !RAV40.has((bx + i) * 100003 + (bz + j))) { quad(ix, iz, 8, t); continue; }
    for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) {
      const jx = ix + a * 2, jz = iz + b * 2;
      const x1 = jx * 5 + 5, z1 = jz * 5 + 5, y1 = Hg(jx + 1, jz + 1);
      if (!cellVisible(x1, y1, z1, 10)) continue;
      const e3 = Math.hypot(x1 - CAM.x, z1 - CAM.z, CAM.y - y1);
      if (e3 > R0 + 8 && !RAV10.has(Math.floor(jx / 2) * 100003 + Math.floor(jz / 2))) { quad(jx, jz, 2, t); continue; }
      for (let c = 0; c < 2; c++) for (let d = 0; d < 2; d++) quad(jx + c, jz + d, 1, t);
    }
  }
}
// подложка под рельефом (закрывает щели между уровнями сетки) и небо рисует sky.js

// туман строфы 7: сначала струйки по низинам, потом молочное покрывало
function mistLevel(t) { return lerp(-26, 16, ease(inv(EV.prohl - 0.3, EV.usni + 0.6, t))); }
function mistAt(x, y, z, t) {
  const lv = mistLevel(t);
  const wisp = vn(x / 40 + t * 0.3, z / 32 - t * 0.1);
  const k = clamp((lv + 10 * (wisp - 0.5) - y) / 16);
  const strand = clamp(inv(EV.prohl - 0.5, EV.prohl + 0.6, t)) * clamp((wisp - 0.5) * 2.5) * 0.45;
  const haze = 0.4 * ease(inv(EV.otdohni - 0.6, EV.usni + 0.8, t));
  return clamp(Math.max(k * 0.6, strand * 0.7, haze * 0.8)) * MIST.on;
}
