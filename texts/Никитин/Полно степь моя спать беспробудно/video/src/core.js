// ---------- Low-poly 3D на canvas: камера-дрон, проекция, грани с плоской заливкой ----------
const W = 1920, H = 1080, TAU = Math.PI * 2, DEG = Math.PI / 180;
const EV = CFG.ev;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, u) => a + (b - a) * u;
const inv = (a, b, v) => clamp((v - a) / (b - a));
const ease = (u) => { u = clamp(u); return u * u * (3 - 2 * u); };
const easeOut = (u) => 1 - Math.pow(1 - clamp(u), 3);
const easeIn = (u) => Math.pow(clamp(u), 3);
const easeIO = (u) => { u = clamp(u); return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const hash2 = (i, j) => { const s = Math.sin(i * 127.1 + j * 311.7 + 17.13) * 43758.5453; return s - Math.floor(s); };
// пружина Motion → u(0…1) с перелётом
const SPRING = (() => {
  try {
    const gen = Motion.spring({ keyframes: [0, 1], stiffness: 220, damping: 13, mass: 1 });
    const N = 120, arr = [];
    for (let i = 0; i <= N; i++) arr.push(gen.next(i * 1000 / N).value);
    return (u) => { u = clamp(u); const f = u * N, i = Math.floor(f); return i >= N ? arr[N] : lerp(arr[i], arr[i + 1], f - i); };
  } catch (e) { return (u) => { u = clamp(u); return 1 - Math.cos(u * 9) * Math.exp(-u * 6); }; }
})();
const spr = (t, t0, dur = 0.7) => (t <= t0 ? 0 : SPRING((t - t0) / dur));

// цвет [r,g,b]
const mix = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const css = (c, a = 1) => a >= 1 ? `rgb(${clamp(c[0], 0, 255) | 0},${clamp(c[1], 0, 255) | 0},${clamp(c[2], 0, 255) | 0})`
  : `rgba(${clamp(c[0], 0, 255) | 0},${clamp(c[1], 0, 255) | 0},${clamp(c[2], 0, 255) | 0},${clamp(a).toFixed(3)})`;
const reset = (g) => { g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = "source-over"; g.filter = "none"; };

// векторы
const v3 = (x, y, z) => [x, y, z];
const vadd = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const vsub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const vsc = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const vdot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const vcross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const vlen = (a) => Math.hypot(a[0], a[1], a[2]);
const vnorm = (a) => { const l = vlen(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const vlerp = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
// поворот вокруг вертикали (курс): 0 — смотрим на +z, плюс — направо (+x)
const yawVec = (yaw) => [Math.sin(yaw), 0, Math.cos(yaw)];

// ---------- Камера ----------
const F = 1000;          // фокус в пикселях: ~88° по горизонтали, широкий угол FPV
const NEAR = 0.25;
const CAM = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0 };
function setCam(c) {
  Object.assign(CAM, c);
  CAM.cy = Math.cos(c.yaw); CAM.sy = Math.sin(c.yaw);
  CAM.cp = Math.cos(c.pitch); CAM.sp = Math.sin(c.pitch);
  CAM.cr = Math.cos(c.roll); CAM.sr = Math.sin(c.roll);
}
function toCam(p) {
  const dx = p[0] - CAM.x, dy = p[1] - CAM.y, dz = p[2] - CAM.z;
  const x1 = dx * CAM.cy - dz * CAM.sy, z1 = dx * CAM.sy + dz * CAM.cy;
  const y2 = dy * CAM.cp - z1 * CAM.sp, z2 = dy * CAM.sp + z1 * CAM.cp;
  return [x1 * CAM.cr + y2 * CAM.sr, -x1 * CAM.sr + y2 * CAM.cr, z2];
}
// направление (без переноса) — для неба, солнца, звёзд
function dirToCam(d) {
  const x1 = d[0] * CAM.cy - d[2] * CAM.sy, z1 = d[0] * CAM.sy + d[2] * CAM.cy;
  const y2 = d[1] * CAM.cp - z1 * CAM.sp, z2 = d[1] * CAM.sp + z1 * CAM.cp;
  return [x1 * CAM.cr + y2 * CAM.sr, -x1 * CAM.sr + y2 * CAM.cr, z2];
}
const scr = (c) => [W / 2 + F * c[0] / c[2], H / 2 - F * c[1] / c[2]];
function project(p) { const c = toCam(p); return c[2] > NEAR ? [W / 2 + F * c[0] / c[2], H / 2 - F * c[1] / c[2], c[2]] : null; }

// ---------- Свет ----------
const MIST = { col: [236, 224, 236], on: 0 };
const LIGHT = { dir: [0.4, 0.7, 0.3], sun: [255, 240, 220], amb: [120, 130, 150], fog: [200, 210, 220], fogNear: 150, fogFar: 1500, fogMax: 0.92, point: null, night: 0 };
// base — цвет материала (0…255); n — нормаль наружу; p — центр грани; o.emis — самосвечение 0…1; o.two — двусторонняя
function shade(base, n, p, o = {}) {
  let d = vdot(n, LIGHT.dir);
  if (o.two) d = Math.abs(d);
  d = Math.max(0, d);
  const s = LIGHT.sun, a = LIGHT.amb;
  // небо светит сверху сильнее, чем сбоку: мягкая «полусфера»
  const up = 0.75 + 0.25 * n[1];
  let r = base[0] * (a[0] * up + s[0] * d) / 255, gg = base[1] * (a[1] * up + s[1] * d) / 255, b = base[2] * (a[2] * up + s[2] * d) / 255;
  const pl = LIGHT.point;
  if (pl) {
    const dv = vsub(pl.pos, p), dist = vlen(dv) || 1;
    let k = Math.max(0, vdot(n, vsc(dv, 1 / dist)));
    if (o.two) k = Math.max(k, 0.6);
    k *= pl.k * (o.pl ?? 1) / (1 + (dist / pl.r) * (dist / pl.r));
    r += base[0] * pl.col[0] / 255 * k; gg += base[1] * pl.col[1] / 255 * k; b += base[2] * pl.col[2] / 255 * k;
  }
  if (o.emis) { r = lerp(r, base[0], o.emis); gg = lerp(gg, base[1], o.emis); b = lerp(b, base[2], o.emis); }
  return [r, gg, b];
}
function fogMix(c, dist) {
  const f = LIGHT.fogMax * Math.pow(inv(LIGHT.fogNear, LIGHT.fogFar, dist), 1.1);
  return mix(c, LIGHT.fog, f);
}

// ---------- Грани ----------
let FACES = [];
let GROUP = null;   // предмет на земле: общий ключ сортировки = глубина основания − смещение к камере
function beginGroup(base, bias = 3) { const c = toCam(base); GROUP = { k: c[2] - bias, b: c[2] }; }
function endGroup() { GROUP = null; }
// отсечение ближней плоскостью (Сазерленд — Ходжмен)
function clipNear(cs) {
  const out = [];
  for (let i = 0; i < cs.length; i++) {
    const a = cs[i], b = cs[(i + 1) % cs.length];
    const ina = a[2] > NEAR, inb = b[2] > NEAR;
    if (ina) out.push(a);
    if (ina !== inb) { const u = (NEAR - a[2]) / (b[2] - a[2]); out.push([lerp(a[0], b[0], u), lerp(a[1], b[1], u), NEAR]); }
  }
  return out;
}
// pts — вершины в мире (по порядку обхода); col — цвет материала; o: {n (нормаль), ctr (центр предмета для нормали наружу),
// cull, two, emis, alpha, stroke(false — без обводки швов), sky (не туманить), key (явный ключ сортировки), jit (разброс тона)}
function face(pts, col, o = {}) {
  const cs = pts.map(toCam);
  let any = false, all = true;
  for (const c of cs) { if (c[2] > NEAR) any = true; else all = false; }
  if (!any) return;
  let n = o.n;
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length, cz = pts.reduce((s, p) => s + p[2], 0) / pts.length;
  const cen = [cx, cy, cz];
  if (!n) {
    n = vnorm(vcross(vsub(pts[1], pts[0]), vsub(pts[2], pts[0])));
    if (o.ctr && vdot(n, vsub(cen, o.ctr)) < 0) n = vsc(n, -1);
  }
  const toEye = [CAM.x - cx, CAM.y - cy, CAM.z - cz];
  if (o.cull && vdot(n, toEye) < 0) return;
  const poly = all ? cs : clipNear(cs);
  if (poly.length < 3) return;
  const sp = poly.map(scr);
  // грубая отбраковка за кадром
  let mnx = 1e9, mxx = -1e9, mny = 1e9, mxy = -1e9;
  for (const p of sp) { if (p[0] < mnx) mnx = p[0]; if (p[0] > mxx) mxx = p[0]; if (p[1] < mny) mny = p[1]; if (p[1] > mxy) mxy = p[1]; }
  if (mxx < -50 || mnx > W + 50 || mxy < -50 || mny > H + 50) return;
  const nn = (vdot(n, toEye) < 0 && o.two) ? vsc(n, -1) : n;
  let c = o.lit === false ? col : shade(col, nn, cen, o);
  if (o.jit) { const j = 1 + ((hash(o.seed ?? (cx * 0.731 + cz * 1.37 + cy * 2.1)) - 0.5) * o.jit); c = mul(c, j); }
  if (o.mist) c = mix(c, MIST.col, o.mist);
  const dist = vlen(toEye);
  if (!o.sky) c = fogMix(c, dist);
  const depth = cs.reduce((s, q) => s + q[2], 0) / cs.length;
  let k = o.key ?? depth;
  if (GROUP && o.key === undefined) k = GROUP.k + (depth - GROUP.b) * 0.02;
  FACES.push({ sp, k, col: css(c), a: o.alpha ?? 1, st: o.stroke !== false && (o.alpha ?? 1) >= 1 });
}
function drawFaces(g) {
  FACES.sort((a, b) => b.k - a.k);
  g.lineJoin = "round"; g.lineWidth = 1.1;
  for (const f of FACES) {
    const p = f.sp;
    g.beginPath(); g.moveTo(p[0][0], p[0][1]);
    for (let i = 1; i < p.length; i++) g.lineTo(p[i][0], p[i][1]);
    g.closePath();
    if (f.a < 1) { g.globalAlpha = f.a; g.fillStyle = f.col; g.fill(); g.globalAlpha = 1; continue; }
    g.fillStyle = f.col; g.fill();
    if (f.st) { g.strokeStyle = f.col; g.stroke(); }
  }
  FACES = [];
}

// ---------- Конструктор low-poly тел ----------
// ортонормальный базис вокруг оси
function basis(ax) {
  const a = vnorm(ax);
  const t = Math.abs(a[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const u = vnorm(vcross(a, t)), v = vcross(a, u);
  return [a, u, v];
}
// призма-конечность между точками a и b, радиусы r0/r1, sides граней, колпачки
function limb(a, b, r0, r1, col, o = {}) {
  const sides = o.sides ?? 5;
  const [ax, u, v] = basis(vsub(b, a));
  const ring = (c, r, ph) => { const out = []; for (let i = 0; i < sides; i++) { const an = (i + ph) / sides * TAU; out.push(vadd(c, vadd(vsc(u, Math.cos(an) * r), vsc(v, Math.sin(an) * r)))); } return out; };
  const A = ring(a, r0, o.ph ?? 0), B = ring(b, r1, o.ph ?? 0);
  const ctr = vlerp(a, b, 0.5);
  for (let i = 0; i < sides; i++) { const j = (i + 1) % sides; face([A[i], A[j], B[j], B[i]], col, { ...o, ctr, cull: true }); }
  if (o.caps !== false) { face(A.slice().reverse(), o.capCol || col, { ...o, ctr, cull: true }); face(B, o.capCol || col, { ...o, ctr, cull: true }); }
}
// тело вращения: центр c, ось up, профиль [[r, h]...] снизу вверх, sides граней, sc — растяжение по осям u/v
function lathe(c, up, prof, sides, col, o = {}) {
  const [ax, u0, v0] = o.basis || basis(up);
  const su = o.su ?? 1, sv = o.sv ?? 1;
  const rings = prof.map(([r, h]) => {
    const out = [];
    for (let i = 0; i < sides; i++) {
      const an = (i + (o.ph ?? 0)) / sides * TAU;
      out.push(vadd(c, vadd(vsc(ax, h), vadd(vsc(u0, Math.cos(an) * r * su), vsc(v0, Math.sin(an) * r * sv)))));
    }
    return out;
  });
  const hm = prof.reduce((s, p) => s + p[1], 0) / prof.length;
  const ctr = vadd(c, vsc(ax, hm));
  const cols = o.cols || [];
  for (let k = 0; k < prof.length - 1; k++) {
    const A = rings[k], B = rings[k + 1];
    const cc = cols[k] || col;
    for (let i = 0; i < sides; i++) {
      const j = (i + 1) % sides;
      if (prof[k][0] < 1e-4) face([A[i], B[j], B[i]], cc, { ...o, ctr, cull: o.cull ?? true });
      else if (prof[k + 1][0] < 1e-4) face([A[i], A[j], B[i]], cc, { ...o, ctr, cull: o.cull ?? true });
      else face([A[i], A[j], B[j], B[i]], cc, { ...o, ctr, cull: o.cull ?? true });
    }
  }
}
// низкополигональный «шар»-эллипсоид по осям
function blob(c, rx, ry, rz, col, o = {}) {
  const prof = [[0, -1], [0.72, -0.62], [1, 0.08], [0.7, 0.68], [0, 1]];
  lathe(c, [0, 1, 0], prof.map(([r, h]) => [r, h * ry]), o.sides ?? 7, col, { ...o, su: rx, sv: rz, basis: o.basis || [[0, 1, 0], [1, 0, 0], [0, 0, 1]] });
}
// двузвенная IK в 3D: плечо s, цель h, длины a, b, pole — куда смотрит локоть
function ik3(s, h, a, b, pole) {
  let d = vsub(h, s); let dl = vlen(d);
  dl = Math.min(dl, a + b - 1e-3); dl = Math.max(dl, Math.abs(a - b) + 1e-3);
  const dn = vnorm(d);
  const x = (a * a - b * b + dl * dl) / (2 * dl);
  const r = Math.sqrt(Math.max(0, a * a - x * x));
  let pv = vsub(pole, s); pv = vsub(pv, vsc(dn, vdot(pv, dn))); pv = vnorm(pv);
  return vadd(vadd(s, vsc(dn, x)), vsc(pv, r));
}
