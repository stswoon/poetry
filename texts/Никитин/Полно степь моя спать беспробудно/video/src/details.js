// ---------- Детали степи: верстовые столбы, деревья, кусты, курган с каменной бабой, хутор, грачи ----------
const DET = { posts: [], trees: [], bushes: [], huts: [], rooks: [], idol: null, well: null };
const farFrom = (x, z, pts, d) => pts.every((p) => Math.hypot(x - p[0], z - p[1]) > d);

function initDetails() {
  // верстовые столбы справа от дороги
  for (let s = 60; s < ROAD.len - 10; s += 105) { const [x, z, dx, dz] = plAt(ROAD, s); DET.posts.push([x + dz * 3.6, z - dx * 3.6]); }
  // запретные места: дорога, костёр, гнёзда, косцы
  const keep = [[FIRE.pos[0], FIRE.pos[2]], [NESTS[0].x, NESTS[0].z], [MOWERS[0].P[0], MOWERS[0].P[2]]];
  const okPlace = (x, z, r) => farFrom(x, z, keep, r) && carve(x, z) < 0.3 && !(nearPL(ROAD, x, z, 7)) && Math.abs(kurganH(x, z)) < 0.5;
  // деревья вдоль пути строф 1–3: одинокие и рощицы
  for (let k = 0; k < 26; k++) {
    const tt = lerp(EV.L1 - 0.5, EV.E12, k / 25) + hash(k * 3.1) * 0.6;
    const side = (hash(k * 7.7) < 0.5 ? -1 : 1) * (14 + hash(k * 2.3) * 40);
    const [x, z] = pathPt(tt, 30 + hash(k) * 50, side);
    const n = hash(k * 5.9) < 0.3 ? 3 : 1;
    for (let m = 0; m < n; m++) {
      const xx = x + (m ? (hash(k + m) - 0.5) * 12 : 0), zz = z + (m ? (hash(k * 2 + m) - 0.5) * 12 : 0);
      if (okPlace(xx, zz, 25)) DET.trees.push({ x: xx, z: zz, h: 6 + hash(k * 9 + m) * 3.5, kind: hash(k * 4 + m) < 0.6 ? 0 : 1, seed: k * 3 + m });
    }
  }
  // кусты: россыпь вдоль всего пути
  for (let k = 0; k < 140; k++) {
    const tt = lerp(0.5, EV.E23, hash(k * 1.3)), side = (hash(k * 2.7) - 0.5) * 2 * (9 + hash(k * 4.1) * 60);
    const [x, z] = pathPt(tt, hash(k * 6.1) * 60, side);
    if (okPlace(x, z, 14)) DET.bushes.push({ x, z, r: 0.7 + hash(k * 8.8) * 0.8, seed: k });
  }
  // хутор справа впереди: хаты, колодец-журавль
  const [hx, hz] = pathPt(EV.L3, 150, 95);
  const hh = headAt(EV.L3);
  for (let k = 0; k < 6; k++) {
    const a = hh + 0.9 + k * 0.55, d = 12 + (k % 3) * 9;
    DET.huts.push({ x: hx + Math.sin(a) * d, z: hz + Math.cos(a) * d, yaw: a + Math.PI / 2 + (hash(k) - 0.5) * 0.4, seed: k });
  }
  DET.well = { x: hx - 6, z: hz + 4, yaw: hh };
  // каменная баба на кургане
  DET.idol = KURG[0];
  // грачи сидят на оттаявшем поле у дороги и взлетают перед дроном
  for (let k = 0; k < 12; k++) {
    const tp = EV.L3 + 0.3 + k * 0.22;
    const [x, z] = pathPt(tp, 0, (hash(k * 3.9) < 0.5 ? -1 : 1) * (2.5 + hash(k * 1.1) * 7));
    DET.rooks.push({ x, z, tk: tp - 1.1 + hash(k * 2.2) * 0.3, side: hash(k * 3.9) < 0.5 ? -1 : 1, seed: k, yaw: hash(k * 6.6) * TAU });
  }
}

const visNear = (x, y, z, rad, maxd) => {
  const d = Math.hypot(x - CAM.x, z - CAM.z); if (d > maxd) return false;
  const c = toCam([x, y, z]); if (c[2] < -rad) return false;
  return Math.hypot(c[0], c[1]) < Math.max(0, c[2] + rad) * 1.13 + rad * 1.6;
};
const seasonCol = (x, z, t, winter, spring, summer, autumn) => {
  let c = winter;
  const gr = frontAmt(SEASON.pg, EV.prinakr, 170, x, z, t); if (gr > 0) c = mix(c, spring, gr);
  const su = frontAmt(SEASON.ps, EV.E20 + 0.15, SUM_V, x, z, t); if (su > 0) c = mix(c, summer, su);
  const au = frontAmt(SEASON.pa, AUT_T0, AUT_V, x, z, t); if (au > 0) c = mix(c, autumn, au);
  return c;
};
const mistO = (x, y, z, t) => (MIST.on ? mistAt(x, y, z, t) : 0);

function verstPost(x, z, t) {
  const y = Hx(x, z);
  if (!visNear(x, y + 1, z, 2, 420)) return;
  beginGroup([x, y, z], 0.8);
  const n = 7, hgt = 2.0;
  for (let k = 0; k < n; k++) {
    const y0 = y + k * hgt / n, col = k % 2 ? [236, 234, 228] : [34, 34, 40];
    box([x, y0 + hgt / n / 2, z], [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [0.1, hgt / n / 2, 0.1], col, { mist: mistO(x, y0, z, t) });
  }
  const sn = snowAt(x, z, t);
  lathe([x, y + hgt, z], [0, 1, 0], [[0.13, 0], [0, 0.16]], 4, sn > 0.5 ? [240, 244, 252] : [110, 84, 60], { ph: 0.5 });
  endGroup();
}
function tree(T, t) {
  const y = Hx(T.x, T.z);
  if (!visNear(T.x, y + T.h * 0.6, T.z, T.h, 900)) return;
  const far = Math.hypot(T.x - CAM.x, T.z - CAM.z) > 260;
  beginGroup([T.x, y, T.z], 2.5);
  const birch = T.kind === 0;
  const bark = birch ? [236, 232, 222] : [96, 74, 56];
  const top = [T.x + (hash(T.seed) - 0.5) * 0.6, y + T.h * 0.62, T.z + (hash(T.seed * 2) - 0.5) * 0.6];
  limb([T.x, y - 0.2, T.z], top, 0.2 * T.h / 7, 0.1 * T.h / 7, bark, { sides: 5, mist: mistO(T.x, y, T.z, t) });
  if (birch && !far) for (let k = 0; k < 3; k++) { const hy = y + 0.8 + k * 1.2; box([T.x + 0.12, hy, T.z], [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [0.06, 0.08, 0.15], [40, 40, 44]); }
  // ветви
  const br = [];
  for (let k = 0; k < 5; k++) {
    const a = T.seed * 2.1 + k * 1.3, hb = y + T.h * (0.42 + k * 0.08), len = T.h * (0.28 - k * 0.02);
    const b0 = vlerp([T.x, y, T.z], top, (hb - y) / (top[1] - y));
    const b1 = [b0[0] + Math.cos(a) * len, hb + len * 0.75, b0[2] + Math.sin(a) * len];
    br.push(b1);
    if (!far) limb(b0, b1, 0.07 * T.h / 7, 0.035 * T.h / 7, bark, { sides: 4 });
  }
  // крона: зимой снежные шапки на ветвях, весной растёт листва, осенью золото
  const leaf = seasonCol(T.x, T.z, t, [0, 0, 0], birch ? [110, 168, 72] : [80, 136, 62], birch ? [130, 160, 74] : [96, 130, 64], birch ? [236, 186, 60] : [206, 110, 52]);
  const gr = frontAmt(SEASON.pg, EV.prinakr, 170, T.x, T.z, t);
  const sn = t < EV.propal + 1 ? snowAt(T.x, T.z, t) : 0;
  const pts = [top, ...br];
  pts.forEach((p, k) => {
    const s = 0.25 + 0.75 * ease(gr);
    const r = T.h * (k ? 0.17 : 0.24) * s;
    if (gr > 0.02) blob(vadd(p, [0, r * 0.2, 0]), r * 1.15, r * 0.9, r * 1.05, leaf, { sides: 6, jit: 0.12, seed: T.seed * 10 + k, mist: mistO(p[0], p[1], p[2], t) });
  });
  endGroup();
}
function bush(B, t) {
  const y = Hx(B.x, B.z);
  if (!visNear(B.x, y + 0.6, B.z, 2, 260)) return;
  beginGroup([B.x, y, B.z], 1.2);
  const col = seasonCol(B.x, B.z, t, [78, 60, 50], [84, 140, 66], [120, 140, 70], [176, 70, 50]);
  const sn = t < EV.propal + 1 ? snowAt(B.x, B.z, t) : 0;
  for (let k = 0; k < 3; k++) {
    const a = B.seed + k * 2.1, r = B.r * (1 - k * 0.2);
    const p = [B.x + Math.cos(a) * r * 0.6 * (k ? 1 : 0), y + r * 0.55, B.z + Math.sin(a) * r * 0.6 * (k ? 1 : 0)];
    blob(p, r, r * 0.75, r * 0.9, col, { sides: 6, jit: 0.15, seed: B.seed * 7 + k, mist: mistO(p[0], p[1], p[2], t) });
    if (sn > 0.3) blob(vadd(p, [0, r * 0.62, 0]), r * 0.8, r * 0.25, r * 0.7, [240, 244, 252], { sides: 6 });
  }
  endGroup();
}
function idol(t) {
  const K = DET.idol; if (!K) return;
  const x = K.x, z = K.z, y = Hx(x, z);
  if (!visNear(x, y + 1, z, 3, 700)) return;
  beginGroup([x, y, z], 1.5);
  const stone = [150, 146, 140], h = headAt(EV.L2);
  const ax = [[Math.cos(h), 0, -Math.sin(h)], [0, 1, 0], [Math.sin(h), 0, Math.cos(h)]];
  box([x, y + 0.9, z], ax, [0.42, 0.95, 0.3], stone);
  box([x, y + 2.0, z], ax, [0.3, 0.22, 0.26], mix(stone, [120, 116, 110], 0.4));   // плечи
  blob([x, y + 2.45, z], 0.26, 0.3, 0.24, stone, { sides: 6 });
  box(vadd([x, y + 1.35, z], vsc(ax[2], 0.31)), ax, [0.32, 0.06, 0.02], [118, 114, 108]);   // сложенные на животе руки
  const sn = t < EV.propal + 1 ? snowAt(x, z, t) : 0;
  if (sn > 0.3) blob([x, y + 2.72, z], 0.24, 0.1, 0.22, [240, 244, 252], { sides: 6 });
  endGroup();
}
function hut(Hh, t) {
  const y = Hx(Hh.x, Hh.z);
  if (!visNear(Hh.x, y + 2, Hh.z, 5, 1300)) return;
  beginGroup([Hh.x, y, Hh.z], 3);
  const c = Math.cos(Hh.yaw), s = Math.sin(Hh.yaw);
  const R = [c, 0, -s], U = [0, 1, 0], Fw = [s, 0, c];
  const P = (a, b, d) => [Hh.x + R[0] * a + Fw[0] * d, y + b, Hh.z + R[2] * a + Fw[2] * d];
  box(P(0, 1.2, 0), [R, U, Fw], [2.4, 1.2, 1.8], [234, 228, 212], { mist: mistO(Hh.x, y + 1, Hh.z, t) });
  box(P(0.6, 0.9, 1.82), [R, U, Fw], [0.35, 0.3, 0.02], [70, 110, 160]);   // окно
  box(P(-1.2, 0.85, 1.82), [R, U, Fw], [0.3, 0.6, 0.02], [96, 70, 50]);   // дверь
  const sn = t < EV.propal + 1 ? snowAt(Hh.x, Hh.z, t) : 0;
  const roof = mix([176, 138, 78], [238, 242, 250], clamp(sn * 1.4 - 0.2));
  const ridge = 3.9, eave = 2.3, ov = 0.45;
  face([P(-2.85, eave, 2.25), P(2.85, eave, 2.25), P(2.85, ridge, 0), P(-2.85, ridge, 0)], roof, { ctr: P(0, 1.5, 0), mist: mistO(Hh.x, y + 3, Hh.z, t) });
  face([P(2.85, eave, -2.25), P(-2.85, eave, -2.25), P(-2.85, ridge, 0), P(2.85, ridge, 0)], roof, { ctr: P(0, 1.5, 0), mist: mistO(Hh.x, y + 3, Hh.z, t) });
  face([P(2.4, eave, 1.8), P(2.4, eave, -1.8), P(2.4, ridge - ov, 0)], roof, { ctr: P(0, 1.5, 0) });
  face([P(-2.4, eave, -1.8), P(-2.4, eave, 1.8), P(-2.4, ridge - ov, 0)], roof, { ctr: P(0, 1.5, 0) });
  box(P(1.2, 3.9, -0.6), [R, U, Fw], [0.22, 0.45, 0.22], [200, 190, 176]);   // труба
  endGroup();
  // дым из трубы: полупрозрачные клубы поднимаются и сносятся ветром
  if (t < EV.E12 + 2) {
    for (let k = 0; k < 6; k++) {
      const ph = ((t * 0.35 + k / 6 + Hh.seed * 0.13) % 1);
      const p = vadd(P(1.2, 4.4, -0.6), [ph * 3.2, ph * 7, ph * 1.2]);
      blob(p, 0.4 + ph * 1.3, 0.35 + ph * 1.0, 0.4 + ph * 1.3, [220, 222, 230], { sides: 6, alpha: 0.5 * (1 - ph), emis: 0.3, key: toCam(p)[2] - 2 });
    }
  }
}
function well(t) {
  const Wl = DET.well, y = Hx(Wl.x, Wl.z);
  if (!visNear(Wl.x, y + 2, Wl.z, 6, 1300)) return;
  beginGroup([Wl.x, y, Wl.z], 3);
  const f = [Math.sin(Wl.yaw), 0, Math.cos(Wl.yaw)];
  box([Wl.x, y + 0.45, Wl.z], [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [0.6, 0.45, 0.6], [120, 92, 64]);   // сруб
  const pv = [Wl.x + f[0] * 2.5, y + 3.2, Wl.z + f[2] * 2.5];
  limb([pv[0], y, pv[2]], pv, 0.12, 0.1, [110, 84, 60], { sides: 4 });   // столб-рогатка
  limb(vadd(pv, vsc(f, 2.2)), [Wl.x, y + 1.6, Wl.z], 0.06, 0.05, [130, 100, 70], { sides: 4 });   // журавль-шест (над срубом)
  limb(vadd(pv, vsc(f, 2.2)), vadd(vadd(pv, vsc(f, 2.2)), [0, 1.3, 0]), 0.04, 0.04, [130, 100, 70], { sides: 3 });
  endGroup();
}
// грач: стоит на двух ногах, при приближении дрона взлетает
function rook(Rk, t) {
  if (t > Rk.tk + 4.5 || t < EV.carstvo + 0.5) return;
  const y0 = Hx(Rk.x, Rk.z), s = 2.2;
  const fly = t > Rk.tk;
  const tau = Math.max(0, t - Rk.tk);
  const hc = headAt(Rk.tk + 1.1);
  const sideV = [Math.cos(hc) * Rk.side, 0, -Math.sin(hc) * Rk.side], fwdV = [Math.sin(hc), 0, Math.cos(hc)];
  const p = fly ? vadd([Rk.x, y0 + 0.3, Rk.z], vadd(vsc(sideV, 3 * tau + 2.5 * tau * tau), vadd(vsc(fwdV, 5 * tau), [0, 2.2 * tau + 1.4 * tau * tau, 0])))
    : [Rk.x, y0 + 0.13 * s, Rk.z];
  if (!visNear(p[0], p[1], p[2], 1, 160)) return;
  const hd = fly ? Math.atan2(sideV[0] * (3 + 5 * tau) + fwdV[0] * 5, sideV[2] * (3 + 5 * tau) + fwdV[2] * 5) : Rk.yaw;
  beginGroup(fly ? p : [Rk.x, y0, Rk.z], fly ? 0 : 0.5);
  smallBird(p, hd, t * 20 + Rk.seed, s, { sit: !fly, col: [36, 36, 44], belly: [52, 52, 62], dark: [24, 24, 30], legs: !fly, pitch: fly ? 0.3 : 0.05, beak: [190, 190, 196] });
  endGroup();
}
function drawDetails(t) {
  for (const p of DET.posts) verstPost(p[0], p[1], t);
  for (const T of DET.trees) tree(T, t);
  for (const B of DET.bushes) bush(B, t);
  for (const Hh of DET.huts) hut(Hh, t);
  well(t);
  idol(t);
  for (const Rk of DET.rooks) rook(Rk, t);
}
