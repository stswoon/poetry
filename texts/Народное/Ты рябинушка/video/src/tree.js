// ---------- Рябина: геометрия в координатах блюда (центр блюда = 0,0) ----------
const CROWN = { x: 0, y: -105 };
const TRUNK = bez([0, 335], [-16, 205], [20, 40], [0, -150], 36);
const TRUNK_L = arcLen(TRUNK), TRUNK_T = TRUNK_L[TRUNK_L.length - 1];
function along(pts, L, s) { // точка и угол пути на доле длины s
  const target = L[L.length - 1] * s;
  for (let i = 1; i < pts.length; i++) if (L[i] >= target) {
    const f = (target - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]), a = pts[i - 1], b = pts[i];
    return { x: lerp(a[0], b[0], f), y: lerp(a[1], b[1], f), a: Math.atan2(b[1] - a[1], b[0] - a[0]) };
  }
  const a = pts[pts.length - 2], b = pts[pts.length - 1]; return { x: b[0], y: b[1], a: Math.atan2(b[1] - a[1], b[0] - a[0]) };
}
// Ветви: доля ствола, где растут, конец, изгиб
const BR = [
  { s: 0.36, end: [-222, 58], c1: [-70, -26], c2: [70, -40] },
  { s: 0.40, end: [230, 36], c1: [70, -30], c2: [-70, -40] },
  { s: 0.62, end: [-214, -126], c1: [-60, -40], c2: [60, -10] },
  { s: 0.66, end: [196, -150], c1: [60, -40], c2: [-60, -10] },
  { s: 0.88, end: [-104, -252], c1: [-30, -50], c2: [40, 10] },
  { s: 0.91, end: [92, -266], c1: [30, -50], c2: [-30, 20] },
  { s: 1.00, end: [-4, -300], c1: [0, -40], c2: [6, 30] },
].map((b, i) => {
  const p = along(TRUNK, TRUNK_L, b.s), p0 = [p.x, p.y];
  const pts = bez(p0, [p0[0] + b.c1[0], p0[1] + b.c1[1]], [b.end[0] + b.c2[0], b.end[1] + b.c2[1]], b.end, 24);
  return { ...b, i, p0, pts, L: arcLen(pts), w0: lerp(13, 7, b.s), side: b.end[0] < -10 ? -1 : b.end[0] > 10 ? 1 : 0 };
});
// Перистые листья: на ветви (доля s), сторона, длина
const LEAVES = [];
{
  const r = mulberry32(21);
  for (const b of BR) {
    const spots = b.i === 6 ? [[0.45, 1], [0.5, -1]] : [[0.42, -1], [0.72, 1], [1.0, 0]];
    spots.forEach(([s, side], j) => {
      const p = along(b.pts, b.L, s);
      const a = side === 0 ? p.a - 0.25 * (b.side || 1) : p.a + side * (0.95 + r() * 0.25);
      LEAVES.push({ b: b.i, s, x: p.x, y: p.y, a, len: (side === 0 ? 120 : 108) + r() * 26, gold: (b.i + j) % 2 === 0, bend: (r() - 0.5) * 0.5 });
    });
  }
  // нижние листья на стволе
  for (const [s, side] of [[0.22, -1], [0.27, 1], [0.52, -1], [0.55, 1]]) {
    const p = along(TRUNK, TRUNK_L, s);
    LEAVES.push({ b: -1, s, x: p.x, y: p.y, a: p.a + side * 1.05, len: 92 + r() * 18, gold: side > 0, bend: (r() - 0.5) * 0.4 });
  }
}
function leafGeom(lf) { // стержень листа и пары листочков
  const ca = Math.cos(lf.a), sa = Math.sin(lf.a), nx = -sa, ny = ca, l = lf.len;
  const p3 = [lf.x + ca * l, lf.y + sa * l];
  const rach = bez([lf.x, lf.y], [lf.x + ca * l * 0.35 + nx * l * lf.bend * 0.5, lf.y + sa * l * 0.35 + ny * l * lf.bend * 0.5],
                   [lf.x + ca * l * 0.7 + nx * l * lf.bend, lf.y + sa * l * 0.7 + ny * l * lf.bend], p3, 16);
  const RL = arcLen(rach), lets = [];
  [0.28, 0.46, 0.63, 0.79].forEach((s, k) => {
    const q = along(rach, RL, s), ll = lerp(36, 27, k / 3);
    lets.push({ x: q.x, y: q.y, a: q.a - 0.78, len: ll, s }, { x: q.x, y: q.y, a: q.a + 0.78, len: ll, s });
  });
  const e = along(rach, RL, 0.97); lets.push({ x: e.x, y: e.y, a: e.a, len: 30, s: 1 });
  return { rach, lets };
}
LEAVES.forEach((lf) => Object.assign(lf, leafGeom(lf)));
// Грозди: висят под концом ветви
const CLUSTERS = BR.map((b, i) => {
  const r = mulberry32(40 + i), e = b.end, rot = b.side * 0.18, bs = [];
  const rows = [[-39, -13, 13, 39], [-26, 0, 26], [-13, 13], [0]];
  rows.forEach((row, k) => row.forEach((dx) => {
    const x = dx + (r() - 0.5) * 5, y = 26 + k * 23 + (r() - 0.5) * 5;
    bs.push({ x: e[0] + x * Math.cos(rot) - y * Math.sin(rot), y: e[1] + x * Math.sin(rot) + y * Math.cos(rot), r: 13.5 + r() * 2, d: r() * 0.25, fr: r() * TAU });
  }));
  return { i, e, bs, cx: e[0] - 40 * Math.sin(rot), cy: e[1] + 55 };
});
// Завитки «кудри»: растут из ветвей вверх и из ствола у корня
function curlPath(x, y, a, len, rad, dir) {
  const ca = Math.cos(a), sa = Math.sin(a), T = [x + ca * len, y + sa * len];
  const tail = bez([x, y], [x + ca * len * 0.3, y + sa * len * 0.3], [x + ca * len * 0.7, y + sa * len * 0.7], T, 8);
  const nx = -sa * dir, ny = ca * dir, cx = T[0] + nx * rad, cy = T[1] + ny * rad, th0 = Math.atan2(T[1] - cy, T[0] - cx), sp = [];
  for (let k = 1; k <= 34; k++) { const f = k / 34, th = th0 + dir * f * 1.15 * TAU, rr = rad * (1 - 0.8 * f); sp.push([cx + Math.cos(th) * rr, cy + Math.sin(th) * rr]); }
  return tail.concat(sp);
}
const CURLS = [];
BR.forEach((b) => {
  if (b.side === 0) return;
  const p = along(b.pts, b.L, 0.84);
  CURLS.push({ pts: curlPath(p.x, p.y, p.a - b.side * 0.95, 40, 24, b.side), red: CURLS.length % 3 === 1 });
});
for (const side of [-1, 1]) {
  const p = along(TRUNK, TRUNK_L, 0.1);
  CURLS.push({ pts: curlPath(p.x, p.y, -Math.PI / 2 + side * 1.25, 46, 22, side), red: side > 0 });
}
CURLS.forEach((c, i) => (c.i = i));
// Травка у корня: «осочки» веером
const GRASS = [];
{
  const r = mulberry32(5), cols = ["g", "r", "G", "g", "G", "r", "g", "G", "r"];
  for (let i = 0; i < 9; i++) {
    const a = lerp(-2.75, -0.39, i / 8) + (r() - 0.5) * 0.08, l = (i === 4 ? 70 : 92 + 30 * Math.sin(Math.PI * i / 8)) + r() * 14;
    const x = (i - 4) * 9, y = 340, ca = Math.cos(a), sa = Math.sin(a), side = a < -Math.PI / 2 ? -1 : 1;
    const pts = bez([x, y], [x + ca * l * 0.4, y + sa * l * 0.4], [x + ca * l * 0.8 + side * l * 0.25, y + sa * l * 0.8 + 0.1 * l], [x + ca * l + side * l * 0.42, y + sa * l + 0.3 * l], 18);
    GRASS.push({ i, pts, col: cols[i], w: 12 + r() * 3 });
  }
}
const SPROUT = { stem: bez([0, 338], [-4, 312], [4, 288], [0, 262], 10), lv: [[0, 268, -2.45, 44], [0, 262, -0.62, 46]] };
const SUN = { x: 258, y: -246 };
// Контур кроны для «намётки»
const CROWN_SK = [];
for (let i = 0; i <= 90; i++) { const th = -Math.PI / 2 + TAU * i / 90; const rr = 238 + 12 * Math.sin(th * 7) + 8 * Math.cos(th * 3); CROWN_SK.push([CROWN.x + Math.cos(th) * rr * 1.08, CROWN.y + Math.sin(th) * rr * 0.92]); }

// ---------- Времена ----------
const TM = {
  sk: { crown: [EV.L1 - 0.1, EV.E2], cl: [EV.rja - 0.1, EV.rja + 0.9], curls: [EV.ras - 0.05, EV.ras + 0.9], grass: [EV.vz1 - 0.05, EV.vz1 + 0.7], trunk: [EV.vy1 - 0.05, EV.vy1 + 0.95] },
  grass: [EV.ves - 0.05, EV.ves + 0.75], sprout: [EV.ves + 0.15, EV.ves + 0.75],
  trunk: [EV.let - 0.05, EV.let + 0.75], curls: [EV.let + 0.45, EV.vy2 + 0.9],
  dawn: [EV.zor - 0.15, EV.zor + 0.9], flowers: [EV.cve - 0.25, EV.cve + 0.5],
  sun: [EV.sol - 0.1, EV.sol + 0.75], berries: [EV.vyz - 0.15, EV.vyz + 0.7],
};
const branchStart = (b) => lerp(TM.trunk[0], TM.trunk[1], b.s * 0.85);
const BR_DUR = 0.55;

// ---------- Рисование ----------
function drawSketch(c, t) {
  const fade = 1 - sstep(prog(t, EV.let + 0.4, EV.vyz + 0.4));
  if (fade <= 0) return;
  const A = 0.6 * fade;
  sketch(c, CROWN_SK, sstep(prog(t, ...TM.sk.crown)), A * (1 - sstep(prog(t, EV.let, EV.let + 1.0))));
  CLUSTERS.forEach((cl, i) => {
    const u = sstep(prog(t, TM.sk.cl[0] + i * 0.08, TM.sk.cl[0] + i * 0.08 + 0.4));
    if (u <= 0) return;
    const pts = []; for (let k = 0; k <= 30; k++) { const th = -Math.PI / 2 + TAU * k / 30; pts.push([cl.cx + Math.cos(th) * 46, cl.cy + Math.sin(th) * 50]); }
    sketch(c, pts, u, A * (1 - sstep(prog(t, EV.cve - 0.2, EV.cve + 0.4))));
  });
  CURLS.forEach((cu, i) => sketch(c, cu.pts, sstep(prog(t, TM.sk.curls[0] + i * 0.05, TM.sk.curls[0] + i * 0.05 + 0.45)), A));
  GRASS.forEach((g, i) => sketch(c, g.pts, sstep(prog(t, TM.sk.grass[0] + i * 0.03, TM.sk.grass[0] + i * 0.03 + 0.4)), A));
  const ut = prog(t, ...TM.sk.trunk);
  sketch(c, TRUNK, sstep(ut / 0.7), A);
  BR.forEach((b) => sketch(c, b.pts, sstep((ut - b.s * 0.55) / 0.4), A));
}

function drawDawn(c, t) {
  const u = sstep(prog(t, ...TM.dawn)); if (u <= 0) return;
  const g = c.createRadialGradient(0, 430, 10, 0, 430, 80 + 520 * u);
  g.addColorStop(0, `rgba(240,110,40,${0.62 * u})`); g.addColorStop(0.35, `rgba(214,62,30,${0.42 * u})`); g.addColorStop(0.7, `rgba(150,40,20,${0.18 * u})`); g.addColorStop(1, "rgba(120,30,10,0)");
  c.fillStyle = g; c.fillRect(-R_FIELD, -R_FIELD, R_FIELD * 2, R_FIELD * 2);
  // лучи зари — тонкие золотые «осочки» от горизонта
  for (let i = 0; i < 9; i++) {
    const a = lerp(-2.6, -0.54, i / 8), k = sstep(prog(t, TM.dawn[0] + 0.2 + Math.abs(i - 4) * 0.05, TM.dawn[0] + 0.75 + Math.abs(i - 4) * 0.05));
    if (k <= 0) continue;
    c.save(); c.globalAlpha *= 0.33;
    const x0 = Math.cos(a) * 250, y0 = 430 + Math.sin(a) * 250, x1 = Math.cos(a) * 420, y1 = 430 + Math.sin(a) * 420;
    stroke(c, [[x0, y0], [lerp(x0, x1, 0.5), lerp(y0, y1, 0.5)], [x1, y1]], P.blade(10), goldFill(c), k);
    c.restore();
  }
}

function fillOf(c, col) { return col === "g" ? goldFill(c) : col === "r" ? C.red : C.green; }

function drawTree(c, t) {
  // травка у корня
  GRASS.forEach((g, i) => {
    const a = TM.grass[0] + i * 0.05, u = sstep(prog(t, a, a + 0.5));
    stroke(c, g.pts, P.blade(g.w), fillOf(c, g.col), u, { hi: g.col === "g" ? 0.5 : 0 });
  });
  // росток
  const us = sstep(prog(t, ...TM.sprout));
  stroke(c, SPROUT.stem, P.taper(10, 6), C.green, us);
  SPROUT.lv.forEach(([x, y, a, l], i) => drop(c, x, y, a, l, 18, i ? goldFill(c) : C.green, springPop(prog(t, TM.sprout[0] + 0.3 + i * 0.1, TM.sprout[0] + 1.3 + i * 0.1)), 0.3 * (i ? -1 : 1)));
  // ствол
  const ut = prog(t, ...TM.trunk);
  if (ut > 0) {
    stroke(c, TRUNK, P.taper(30, 11), C.redD, sstep(ut));
    stroke(c, TRUNK, P.taper(24, 8), goldFill(c), sstep(ut), { hi: 0.6 });
  }
  // ветви
  BR.forEach((b) => {
    const a = branchStart(b), u = sstep(prog(t, a, a + BR_DUR));
    if (u <= 0) return;
    stroke(c, b.pts, P.taper(b.w0 + 4, 4), C.redD, u);
    stroke(c, b.pts, P.taper(b.w0, 3), goldFill(c), u, { hi: 0.5 });
  });
  // плодоножки гроздей (тонко, золотом)
  CLUSTERS.forEach((cl) => {
    const b = BR[cl.i], u = sstep(prog(t, branchStart(b) + BR_DUR, branchStart(b) + BR_DUR + 0.35));
    if (u <= 0) return;
    for (const be of cl.bs.slice(0, 4)) stroke(c, [cl.e, [lerp(cl.e[0], be.x, 0.5), lerp(cl.e[1], be.y, 0.4)], [be.x, be.y]], P.taper(3, 1.5), goldFill(c), u);
  });
  // перистые листья
  LEAVES.forEach((lf, j) => {
    const a0 = lf.b < 0 ? lerp(TM.trunk[0], TM.trunk[1], lf.s) : branchStart(BR[lf.b]) + BR_DUR * lf.s;
    const ur = sstep(prog(t, a0, a0 + 0.35));
    if (ur <= 0) return;
    stroke(c, lf.rach, P.taper(4, 1.5), goldFill(c), ur);
    const fill = lf.gold ? goldFill(c) : C.green;
    lf.lets.forEach((q, k) => {
      const k0 = a0 + 0.08 + q.s * 0.3, kk = springPop(prog(t, k0, k0 + 1.0));
      if (kk <= 0) return;
      drop(c, q.x, q.y, q.a, q.len, 13, fill, kk, 0.18 * (k % 2 ? 1 : -1), lf.gold ? 0.45 : 0);
      if (!lf.gold) { c.save(); c.globalAlpha *= 0.85; drop(c, q.x, q.y, q.a, q.len * 0.55, 3, C.greenL, kk, 0.18 * (k % 2 ? 1 : -1)); c.restore(); }
    });
  });
  // кудри
  CURLS.forEach((cu, i) => {
    const a = lerp(TM.curls[0], TM.curls[1] - 0.5, i / (CURLS.length - 1)), u = sstep(prog(t, a, a + 0.5));
    stroke(c, cu.pts, P.curl(13), cu.red ? C.red : goldFill(c), u, { round: true, hi: cu.red ? 0 : 0.5 });
  });
  // цветы → ягоды
  CLUSTERS.forEach((cl, i) => {
    const fa = TM.flowers[0] + i * 0.07, ba = TM.berries[0] + i * 0.08;
    cl.bs.forEach((be, k) => {
      const kf = springPop(prog(t, fa + be.d, fa + be.d + 1.0)), kb = springPop(prog(t, ba + be.d, ba + be.d + 1.0));
      const fl = 1 - sstep(prog(t, ba + be.d, ba + be.d + 0.3));
      if (kf > 0 && fl > 0) { c.save(); c.globalAlpha *= fl; flower(c, be.x, be.y, be.r * 1.05, kf, be.fr); c.restore(); }
      if (kb > 0) berry(c, be.x, be.y, be.r, kb, 1);
    });
  });
}

function drawSun(c, t) {
  const u = prog(t, ...TM.sun); if (u <= 0) return;
  const k = springSoft(u * 1.6), { x, y } = SUN;
  const g = c.createRadialGradient(x, y, 5, x, y, 150 * k);
  g.addColorStop(0, `rgba(255,214,110,${0.45 * k})`); g.addColorStop(1, "rgba(255,190,80,0)");
  c.fillStyle = g; c.fillRect(x - 160, y - 160, 320, 320);
  for (let i = 0; i < 14; i++) {
    const a = i * TAU / 14 + 0.12, kk = springPop(prog(t, TM.sun[0] + 0.15 + i * 0.03, TM.sun[0] + 1.15 + i * 0.03));
    drop(c, x + Math.cos(a) * 34, y + Math.sin(a) * 34, a, i % 2 ? 26 : 34, 11, i % 2 ? C.red : goldFill(c), kk, 0.2, i % 2 ? 0 : 0.5);
  }
  c.fillStyle = goldFill(c); c.beginPath(); c.arc(x, y, 30 * k, 0, TAU); c.fill();
  c.fillStyle = C.red; c.beginPath(); c.arc(x, y, 17 * k, 0, TAU); c.fill();
  c.fillStyle = goldFill(c); c.beginPath(); c.arc(x, y, 7 * k, 0, TAU); c.fill();
}
