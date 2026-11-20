// ---------- Предметы степи: дорога, ручей, цветы, ковыль, копны, гнёзда, костёр, облака ----------
function plAt(pl, s) {
  const p = pl.p; s = clamp(s, 0, pl.len);
  let lo = 0, hi = p.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (p[m][2] < s) lo = m; else hi = m; }
  const a = p[lo], b = p[hi], u = (s - a[2]) / ((b[2] - a[2]) || 1);
  const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
  return [lerp(a[0], b[0], u), lerp(a[1], b[1], u), dx / l, dz / l];
}
// лента вдоль полилинии: lanes = [[от, до, цвет(s)]...] поперёк в метрах; lift — над землёй
function ribbon(pl, s0, s1, step, lanes, lift, o = {}) {
  let prev = null;
  // узлы ленты привязаны к полилинии (кратны шагу), иначе они ползут вместе с камерой и лента мигает
  for (let s = Math.max(0, Math.floor(s0 / step) * step); s <= Math.min(pl.len, s1) + 1e-6; s += step) {
    const [x, z, dx, dz] = plAt(pl, s);
    const rx = dz, rz = -dx;   // вправо
    const cur = lanes.map(([a, b]) => [[x + rx * a, z + rz * a], [x + rx * b, z + rz * b]]);
    const yc = (o.flatY ? o.flatY(x, z) : null);
    if (prev) {
      lanes.forEach(([a, b, colf], k) => {
        const [pa, pb] = prev.c[k], [ca, cb] = cur[k];
        const Y = (q) => (yc !== null ? yc : Hx(q[0], q[1])) + lift;
        const pts = [[pa[0], Y(pa), pa[1]], [pb[0], Y(pb), pb[1]], [cb[0], Y(cb), cb[1]], [ca[0], Y(ca), ca[1]]];
        const col = colf(s - step / 2);
        const mid = [(pa[0] + cb[0]) / 2, 0, (pa[1] + cb[1]) / 2];
        const d = toCam([mid[0], Y(pa), mid[2]])[2];
        face(pts, col.c || col, { n: [0, 1, 0], alpha: o.alpha ?? 1, key: d - (o.bias ?? 1.5) - Math.max(0, d) * (o.biasK ?? 0), emis: col.e || 0, mist: MIST.on ? mistAt(mid[0], Y(pa), mid[2], o.t) : 0 });
      });
    }
    prev = { c: cur };
  }
}
function drawRoad(t) {
  if (t > EV.E12) return;
  const q = nearPL(ROAD, CAM.x, CAM.z, 1e9); if (!q) return;
  const sC = q.s;
  const s0 = ROAD_S0;
  const colAt = (s, dark) => {
    const pt = plAt(ROAD, s);
    const sn = snowAt(pt[0], pt[1], t);
    const dry = t < EV.sohnet ? 0 : clamp(((t - EV.sohnet) * 120 - Math.max(0, s - s0)) / 30 + 0.5);
    let c = mix(COL.roadW, COL.road, dry);
    if (dark) c = mul(c, 0.82);
    return mix(c, [226, 234, 248], clamp(sn * 1.3 - 0.15));
  };
  ribbon(ROAD, sC - 40, sC + 520, 5, [[-2.2, -1.3, (s) => colAt(s, true)], [-1.3, 0.9, (s) => colAt(s, false)], [0.9, 1.8, (s) => colAt(s, true)]], 0.22, { t, bias: 6 });
}
let ROAD_S0 = 0;
function drawStream(t) {
  const q = nearPL(RAV, CAM.x, CAM.z, 190); if (!q) return;
  const fa = clamp((190 - q.d) / 70);   // издалека ручей проявляется плавно, а не всплывает куском
  const bottom = (x, z) => Hx(x, z);
  ribbon(RAV, q.s - 30, q.s + 420, 2.5, [[-1.3, 1.3, (s) => {
    const sh = 0.5 + 0.5 * Math.sin(s * 0.22 - t * 2.4);
    return { c: mix(COL.water, [200, 232, 252], sh * 0.35), e: 0.42 };
  }]], 0.3, { t, bias: 2.2, biasK: 0.03, flatY: null, alpha: fa });
  // белые искры течения
  for (let s = Math.floor(q.s / 3) * 3 - 6; s < q.s + 70; s += 3) {
    const k = hash(s * 1.7);
    if (k < 0.5) continue;
    const ph = (t * 0.6 + k * 3) % 1;   // искра плывёт по течению и плавно гаснет
    const [x, z, dx, dz] = plAt(RAV, s + ph * 3);
    const off = (hash(s * 3.3) - 0.5) * 1.6, px = x + dz * off, pz = z - dx * off, y = bottom(px, pz) + 0.36;
    const a = Math.sin(Math.PI * ph) * 0.8;
    face([[px - dx * 0.3, y, pz - dz * 0.3], [px + dz * 0.1, y, pz - dx * 0.1], [px + dx * 0.3, y, pz + dz * 0.3]], [250, 252, 255], { n: [0, 1, 0], emis: 0.7, two: true, alpha: a * fa, key: toCam([px, y, pz])[2] - 2.4 });
  }
}

// ---------- Цветы ----------
const FLOWER_COLS = [[228, 62, 56], [250, 212, 60], [246, 244, 236], [168, 112, 222], [90, 130, 232], [250, 150, 60]];
function drawFlowers(t) {
  if (t < EV.cvety - 0.1 || t > EV.E20 + 1.5) return;
  const fade = 1 - ease(inv(EV.E20 - 0.2, EV.E20 + 1.2, t));
  const R = 150, cell = 5;
  const i0 = Math.floor((CAM.x - R) / cell), i1 = Math.floor((CAM.x + R) / cell), j0 = Math.floor((CAM.z - R) / cell), j1 = Math.floor((CAM.z + R) / cell);
  const p0 = SEASON.pg;
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
    const hsh = hash2(i * 1.3 + 0.7, j * 2.1 - 0.3);
    if (hsh > 0.36) continue;
    const x = (i + hash2(i, j + 9)) * cell, z = (j + hash2(i + 5, j)) * cell;
    const d = Math.hypot(x - CAM.x, z - CAM.z); if (d > R) continue;
    const y0 = Hx(x, z);
    const c = toCam([x, y0, z]); if (c[2] < 0.5 || Math.abs(c[0]) > c[2] * 1.15 + 2 || Math.abs(c[1]) > c[2] * 0.7 + 2) continue;
    const popT = EV.cvety + Math.hypot(x - CAM_AT_CVETY[0], z - CAM_AT_CVETY[1]) / 140 + hsh * 0.6;
    const s = spr(t, popT, 0.55) * fade; if (s <= 0.02) continue;
    const col = FLOWER_COLS[Math.floor(hash2(i + 3, j - 2) * FLOWER_COLS.length)];
    const r = 0.42 * s, hgt = 0.32 * s, y = y0 + hgt;
    const dist3 = vlen([x - CAM.x, y - CAM.y, z - CAM.z]);
    if (dist3 > 55) { face(pentagon(x, y + 0.05, z, r * 1.1, hsh * 6), col, { n: [0, 1, 0], key: c[2] - 0.6, emis: 0.2 }); continue; }
    beginGroup([x, y0, z], 1.2);
    limb([x, y0, z], [x, y, z], 0.03, 0.025, [70, 130, 50], { sides: 3, caps: false });
    const rot = hsh * 6;
    for (let k = 0; k < 5; k++) {
      const a = rot + k / 5 * TAU, a0 = a - 0.45, a1 = a + 0.45;
      const tip = [x + Math.cos(a) * r, y + 0.1 * r, z + Math.sin(a) * r];
      face([[x, y, z], [x + Math.cos(a0) * r * 0.55, y + 0.05 * r, z + Math.sin(a0) * r * 0.55], tip, [x + Math.cos(a1) * r * 0.55, y + 0.05 * r, z + Math.sin(a1) * r * 0.55]], col, { two: true, emis: 0.15 });
    }
    face(pentagon(x, y + 0.04, z, r * 0.28, rot), k3(col), { n: [0, 1, 0], emis: 0.2 });
    endGroup();
  }
}
const k3 = (c) => (c[0] > 240 && c[1] > 200 && c[2] < 100 ? [200, 120, 40] : [250, 214, 70]);
function pentagon(x, y, z, r, rot) { const out = []; for (let k = 0; k < 5; k++) { const a = rot + k / 5 * TAU; out.push([x + Math.cos(a) * r, y, z + Math.sin(a) * r]); } return out; }
let CAM_AT_CVETY = [0, 0];

// ---------- Трава у земли: весной — мурава, летом — серебристый ковыль, осенью — рыжая ----------
function drawTufts(t) {
  const alt = CAM.y - Hx(CAM.x, CAM.z);
  if (alt > 14) return;
  const R = 34, cell = 1.6;
  const i0 = Math.floor((CAM.x - R) / cell), i1 = Math.floor((CAM.x + R) / cell), j0 = Math.floor((CAM.z - R) / cell), j1 = Math.floor((CAM.z + R) / cell);
  const wind = Math.sin(t * 1.3);
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
    const hs = hash2(i * 0.9 + 4, j * 1.7 + 1);
    if (hs > 0.5) continue;
    const x = (i + hash2(i + 2, j)) * cell, z = (j + hash2(i, j + 2)) * cell;
    const y0 = Hx(x, z);
    const c = toCam([x, y0, z]); if (c[2] < (t < TO.merge1 + 0.5 ? 3.2 : 0.4) || c[2] > R || Math.abs(c[0]) > c[2] * 1.15 + 1 || Math.abs(c[1]) > c[2] * 0.7 + 1) continue;
    const su = frontAmt(SEASON.ps, EV.E20 + 0.15, SUM_V, x, z, t), au = frontAmt(SEASON.pa, AUT_T0, AUT_V, x, z, t);
    const gr = clamp(frontAmt(SEASON.pg, EV.prinakr, 170, x, z, t) + 0.35);
    let col = mix([120, 120, 70], [104, 160, 70], gr);
    let hgt = 0.45 * gr;
    if (t < EV.probud) { const sn = snowAt(x, z, t); col = mix([150, 124, 92], [182, 160, 120], hs); hgt = 0.55 * (0.6 + sn * 0.4); if (hs > 0.28) continue; }
    if (su > 0) { col = mix(col, [206, 204, 180], su); hgt = lerp(hgt, 0.8, su); }
    if (au > 0) { col = mix(col, [190, 120, 70], au); hgt = lerp(hgt, 0.6, au); }
    if (hgt < 0.08) continue;
    const mown = su > 0.5 && MOWN.length && mownAt(x, z);
    if (mown) { col = COL.hay; }
    beginGroup([x, y0, z], 0.4);
    const em = (su > 0.5 ? 0.12 : 0.04) * (1 - LIGHT.night);
    for (let k = 0; k < 4; k++) {
      const a = hs * 40 + k * 1.6, bx = Math.cos(a) * 0.05, bz = Math.sin(a) * 0.05;
      const sway = (wind * 0.22 + Math.sin(t * 2.6 + x * 0.4 + z * 0.3 + k) * 0.12) * hgt;
      const hh = hgt * (0.75 + 0.35 * hash(k + hs * 9));
      const o = { two: true, emis: em, jit: 0.15, seed: hs * 31 + k, mist: MIST.on ? mistAt(x, y0, z, t) : 0 };
      if (mown) { face([[x - bz * 0.5, y0 + 0.02, z + bx * 0.5], [x + bz * 0.5, y0 + 0.02, z - bx * 0.5], [x + Math.cos(a) * 0.7, y0 + 0.07, z + Math.sin(a) * 0.7]], col, o); continue; }
      const mid = [x + bx * 2.5 + sway * 0.35, y0 + hh * 0.55, z + bz * 2.5 + sway * 0.18];
      const tip = [x + bx * 5 + sway, y0 + hh, z + bz * 5 + sway * 0.5];
      const w0 = 0.028;
      o.pl = 0.5;
      face([[x - bz * w0 * 20, y0, z + bx * w0 * 20], [x + bz * w0 * 20, y0, z - bx * w0 * 20], [mid[0] + bz * 0.4, mid[1], mid[2] - bx * 0.4], [mid[0] - bz * 0.4, mid[1], mid[2] + bx * 0.4]], col, o);
      face([[mid[0] - bz * 0.4, mid[1], mid[2] + bx * 0.4], [mid[0] + bz * 0.4, mid[1], mid[2] - bx * 0.4], tip], su > 0.5 ? mix(col, [250, 248, 236], 0.4) : col, o);
    }
    endGroup();
  }
}

// ---------- Копны ----------
const HAY_PROF = [[2.3, 0], [2.28, 0.85], [2.0, 1.85], [1.4, 2.7], [0.6, 3.25], [0, 3.45]];
function haystack(x, z, s, t, seed) {
  if (s <= 0.01) return;
  const y = Hx(x, z) - 0.15;
  beginGroup([x, y, z], 3.2);
  const prof = HAY_PROF.map(([r, h], k) => [r * (0.9 + 0.1 * s) * (k ? 1 + (hash(seed + k) - 0.5) * 0.12 : 1), h * s]);
  const night = LIGHT.night;
  lathe([x, y, z], [0, 1, 0], prof, 8, [214, 180, 100], { ph: seed, cols: [[200, 166, 92], [214, 180, 100], [226, 196, 116], [232, 204, 126], [236, 210, 136]], mist: MIST.on ? mistAt(x, y + 1.5, z, t) * 0.85 : 0, jit: 0.1, seed: seed * 3 });
  // жердь сверху
  limb([x, y + 3.3 * s, z], [x + 0.05, y + 4.1 * s, z], 0.05, 0.04, [110, 80, 56], { sides: 4 });
  endGroup();
}

// ---------- Гнёзда с яйцами ----------
function nest(x, z, s, t, seed, eggs = 3) {
  if (s <= 0.01) return;
  const y = Hx(x, z) + 0.02;
  beginGroup([x, y, z], 0.7);
  const prof = [[0.16, 0], [0.34, 0.05], [0.42, 0.16], [0.38, 0.24], [0.27, 0.22], [0.2, 0.14]].map(([r, h]) => [r * s, h * s]);
  lathe([x, y, z], [0, 1, 0], prof, 10, [138, 100, 64], { cull: false, cols: [[110, 80, 52], [138, 100, 64], [156, 116, 74], [170, 128, 82], [120, 88, 58]], jit: 0.2, seed });
  face(pentagon(x, y + 0.06 * s, z, 0.22 * s, seed), [96, 70, 46], { n: [0, 1, 0] });
  for (let k = 0; k < eggs; k++) {
    const a = seed + k / eggs * TAU, ex = x + Math.cos(a) * 0.09 * s, ez = z + Math.sin(a) * 0.09 * s;
    blob([ex, y + 0.13 * s, ez], 0.07 * s, 0.09 * s, 0.07 * s, [200, 224, 236], { sides: 6, emis: 0.1 });
  }
  endGroup();
}

// ---------- Костёр ----------
function campfire(t, a) {
  if (a <= 0.01) return;
  const [x, y, z] = FIRE.pos;
  beginGroup([x, y, z], 1.2);
  for (let k = 0; k < 4; k++) {
    const an = k / 4 * TAU + 0.4;
    limb([x + Math.cos(an) * 0.75, y + 0.06, z + Math.sin(an) * 0.75], [x + Math.cos(an) * 0.08, y + 0.5, z + Math.sin(an) * 0.08], 0.08, 0.06, [92, 64, 44], { sides: 4 });
  }
  // камни вокруг
  for (let k = 0; k < 9; k++) { const an = k / 9 * TAU; blob([x + Math.cos(an) * 0.95, y + 0.06, z + Math.sin(an) * 0.95], 0.16, 0.11, 0.13, [110, 108, 116], { sides: 5 }); }
  // языки пламени — пирамидки, дрожат
  const fl = [[0, 1.5, [255, 190, 70]], [0.22, 1.1, [255, 130, 50]], [-0.2, 1.0, [255, 150, 60]], [0.05, 0.75, [255, 236, 150]]];
  fl.forEach(([off, hh, col], k) => {
    const f = 0.8 + 0.35 * vn(t * 7 + k * 3.1, k) * a;
    const bx = x + off, bz = z + off * 0.6, h1 = hh * f * a;
    const r = 0.32 * a;
    const base = [0, 1, 2].map((i) => { const an = i / 3 * TAU + t * 1.5 + k; return [bx + Math.cos(an) * r, y + 0.25, bz + Math.sin(an) * r]; });
    const tip = [bx + Math.sin(t * 9 + k) * 0.12, y + 0.25 + h1, bz + Math.cos(t * 7 + k) * 0.1];
    for (let i = 0; i < 3; i++) face([base[i], base[(i + 1) % 3], tip], col, { lit: false, emis: 1, two: true });
  });
  endGroup();
}

// ---------- Облака: поле в небе + «улицы» облаков в строфе 4 ----------
let CLOUDS = [];
function cloudList(t) {
  const out = [];
  const wind = [6 * t + 160 * ease(inv(EV.L20, EV.E20, t)), 0];
  const C = 300, R = 2000;
  const i0 = Math.floor((CAM.x - wind[0] - R) / C), i1 = Math.floor((CAM.x - wind[0] + R) / C);
  const j0 = Math.floor((CAM.z - R) / C), j1 = Math.floor((CAM.z + R) / C);
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
    if (hash2(i * 2.3 + 1, j * 1.9) > 0.42) continue;
    const x = (i + hash2(i, j + 4)) * C + wind[0], z = (j + hash2(i + 7, j)) * C;
    out.push({ x, z, y: 175 + 50 * hash2(i, j), r: 34 + 26 * hash2(i + 1, j + 1), seed: i * 7 + j * 13, el: 1 });
  }
  // «улицы» облаков поперёк полёта строфы 4: тени бегут полосами
  if (t > EV.E12 && t < EV.L18) {
    const h = headAt(EV.L15), fx = Math.sin(h), fz = Math.cos(h), rx = Math.cos(h), rz = -Math.sin(h);
    const [bx, bz] = pathPt(EV.L14, 0, 0);
    const drift = (t - EV.L14) * 10;
    for (let k = 0; k < 5; k++) for (let m = -3; m <= 3; m++) {
      if (hash(k * 7 + m * 3 + 1) < 0.25) continue;
      const fwd = 40 + k * 115 + drift, side = m * 82 + (hash(k * 3 + m) - 0.5) * 30;
      out.push({ x: bx + fx * fwd + rx * side + 135, z: bz + fz * fwd + rz * side, y: PATH_G(EV.L14) + 150 + 12 * hash(k + m * 7), r: 22 + 10 * hash(k * 5 + m), seed: 900 + k * 31 + m, el: 1.5, dir: [rx, rz] });
    }
  }
  return out;
}
function PATH_G(tt) { const [i] = idx(tt); return PATH.g[i]; }
function drawClouds(t) {
  for (const c of CLOUDS) {
    const cc = toCam([c.x, c.y, c.z]);
    if (cc[2] < -c.r * 3 || Math.hypot(cc[0], cc[1]) > (Math.max(0, cc[2]) + c.r * 3) * 1.15 + c.r * 3) continue;
    const parts = [[0, 0, 0, 1, 0.55, 0.8], [0.8, -0.15, 0.2, 0.7, 0.45, 0.6], [-0.85, -0.2, -0.1, 0.65, 0.4, 0.55], [0.3, 0.25, -0.3, 0.6, 0.45, 0.55], [-0.3, 0.15, 0.4, 0.55, 0.4, 0.5]];
    const el = c.el || 1;
    for (const [ox, oy, oz, rx, ry, rz] of parts) {
      const d = c.dir || [1, 0];
      const px = c.x + (d[0] * ox * el - d[1] * oz) * c.r, pz = c.z + (d[1] * ox * el + d[0] * oz) * c.r;
      blob([px, c.y + oy * c.r, pz], rx * c.r * el, ry * c.r, rz * c.r, [252, 252, 255], { sides: 6, emis: 0.5 * (1 - 0.9 * LIGHT.night), seed: c.seed });
    }
  }
}
// тень облаков на земле (0 — нет, 1 — полная)
function cloudShadow(x, z) {
  if (SUNDIR[1] < 0.25 || LIGHT.night > 0.3) return 0;
  let s = 0;
  for (const c of CLOUDS) {
    const k = (c.y - 0) / SUNDIR[1];
    const sx = c.x - SUNDIR[0] * k, sz = c.z - SUNDIR[2] * k;
    const d = c.dir || [1, 0], el = c.el || 1;
    const dx = x - sx, dz = z - sz;
    const a = (dx * d[0] + dz * d[1]) / (c.r * 1.25 * el), b = (-dx * d[1] + dz * d[0]) / (c.r * 0.95);
    const q = a * a + b * b;
    if (q < 1.6) s = Math.max(s, clamp((1.6 - q) / 0.5));
  }
  return s;
}
