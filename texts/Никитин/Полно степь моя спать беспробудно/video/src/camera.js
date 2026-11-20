// ---------- Полёт дрона: курс, скорость, высота и наклон по ключам; путь интегрируется заранее ----------
// ключи [[t, v]...] → гладкая функция (Эрмит с касательными Катмулла — Рома)
function kf(keys) {
  keys = keys.slice().sort((a, b) => a[0] - b[0]);
  return (t) => {
    const n = keys.length;
    if (t <= keys[0][0]) return keys[0][1];
    if (t >= keys[n - 1][0]) return keys[n - 1][1];
    let i = 0; while (keys[i + 1][0] < t) i++;
    const [t0, v0] = keys[i], [t1, v1] = keys[i + 1], h = t1 - t0 || 1e-6;
    const tm = keys[i - 1], tp = keys[i + 2];
    let m0 = tm ? (v1 - tm[1]) / (t1 - tm[0]) : (v1 - v0) / h;
    let m1 = tp ? (tp[1] - v0) / (tp[0] - t0) : (v1 - v0) / h;
    if ((v1 - v0) === 0) { m0 = 0; m1 = 0; }
    const u = (t - t0) / h, u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * v0 + (u3 - 2 * u2 + u) * h * m0 + (-2 * u3 + 3 * u2) * v1 + (u3 - u2) * h * m1;
  };
}

const ORB = { t0: 0, t1: 0, w: 50, v: 8 };   // облёт костра: начало, конец, °/с, м/с
let HEAD, SPEED, ALT, PITCH, YOFF, LOOKW;
const PATH = { dt: 1 / 120, x: [], z: [], h: [], g: [] };

function initFlight() {
  const T = CFG.total;
  ORB.t0 = EV.raspev - 0.2; ORB.t1 = EV.L25 - 0.45;
  const orbKeys = [];
  const OE = 0.8;   // разгон поворота: курс входит в облёт плавно
  orbKeys.push([ORB.t0, 58]);
  for (let k = 0; k <= 8; k++) { const tt = lerp(ORB.t0 + OE, ORB.t1, k / 8); orbKeys.push([tt, 58 + ORB.w * (tt - ORB.t0 - OE / 2)]); }
  const hEnd = 58 + ORB.w * (ORB.t1 - ORB.t0 - OE / 2);
  HEAD = kf([
    [0, 0], [EV.L1, 0], [EV.L2, 7], [EV.L3, -6], [EV.L4, 3], [EV.E4, 0], [EV.pokazh, 8], [EV.E8, 2],
    [EV.polyub, 10], [EV.zhuravli, 36], [EV.E10, 40], [EV.zolote, 36], [EV.ruchyi - 0.3, 30], [EV.ovragam, 50], [EV.shumyat, 24], [EV.E12 + 0.5, 34],
    [EV.L13, 30], [EV.L15, 20], [EV.E16, 10], [EV.L17, 2], [EV.gnezd, -8], [EV.E18, -10], [EV.zvuki, -10], [EV.L20, -6], [EV.E20, 36],
    [EV.L21, 54], [EV.E22, 58], ...orbKeys, [ORB.t1 + 1.2, hEnd + 18], [EV.otdohni, hEnd + 26], [T, hEnd + 34],
  ]);
  SPEED = kf([
    [0, 0], [TO.go - 0.15, 0], [TO.go + 0.6, 6], [TO.merge1, 16], [EV.L1, 22], [EV.E4, 24], [EV.L5, 18], [EV.pokazh, 12], [EV.E8, 18], [EV.polyub, 24], [EV.zhuravli, 32],
    [EV.E10, 32], [EV.ruchyi, 30], [EV.E12, 28], [EV.E12 + 0.8, 22], [EV.L13, 14], [EV.E16, 14], [EV.L17, 13], [EV.gnezd - 0.5, 3],
    [EV.gnezd, 1.2], [EV.E18, 1.2], [EV.zvuki, 3], [EV.L20, 6], [EV.E20, 9], [EV.L21, 10], [EV.E22, 10], [EV.L23, 13], [EV.E23 - 0.5, 11],
    [ORB.t0 + 0.3, ORB.v], [ORB.t0 + 1, ORB.v], [ORB.t1 - 1, ORB.v], [ORB.t1, ORB.v], [EV.L25 + 1, 9], [EV.otdohni, 7], [EV.usni, 4], [EV.fin, 1.5], [T, 0.8],
  ]);
  ALT = kf([
    [0, 0.2], [TO.lift, 0.2], [TO.go, 1.5], [TO.merge1, 4.0], [EV.L1, 4.5], [EV.L2, 4], [EV.L3, 5], [EV.E3, 6], [EV.svetlo, 12], [EV.L5, 14], [EV.nenagl, 30], [EV.pokazh + 0.3, 62],
    [EV.muravoyu, 45], [EV.E8, 16], [EV.polyub, 14], [EV.zhuravli, 16], [EV.E10, 16], [EV.zolote, 14], [EV.ruchyi - 0.4, 9], [EV.ovragam, 4],
    [EV.E12, 4.5], [EV.E12 + 0.7, 18], [EV.L13, 55], [EV.L14, 70], [EV.E16, 70], [EV.L17, 45], [EV.gnezd - 0.5, 4], [EV.gnezd, 1.8],
    [EV.E18, 1.6], [EV.zvuki, 6], [EV.L20, 14], [EV.E20, 18], [EV.L21, 4.8], [EV.E22, 4.4], [EV.L23, 10], [EV.E23 - 0.6, 12],
    [ORB.t0 + 0.7, 5], [ORB.t0 + 1.2, 4.8], [ORB.t1 - 1, 4.8], [ORB.t1, 5], [EV.L25 + 1, 9], [EV.otdohni, 40], [EV.usni, 95], [EV.fin, 120], [T, 126],
  ]);
  PITCH = kf([
    [0, 0], [TO.go, 0], [TO.merge1, -9], [EV.L1, -9], [EV.E4, -8], [EV.svetlo, -2], [EV.L5, -14], [EV.pokazh, -20], [EV.muravoyu, -24], [EV.cvety, -26],
    [EV.E8, -14], [EV.polyub, -4], [EV.zhuravli, -1], [EV.E10, -3], [EV.zolote, 0], [EV.ruchyi, -12], [EV.ovragam, -14], [EV.E12, -8],
    [EV.E12 + 0.7, 2], [EV.belosn, 10], [EV.plyvut - 0.3, 6], [EV.grudi + 0.2, -30], [EV.polosami + 0.2, -42], [EV.E16, -40], [EV.L17, -20],
    [EV.gnezd - 0.4, -24], [EV.gnezd, -21], [EV.E18, -19], [EV.zvuki, 10], [EV.pesni, 24], [EV.L20 + 0.7, 7], [EV.E20, 2],
    [EV.L21, -14], [EV.lozhis, -18], [EV.kostsam, -24], [EV.E22, -24], [EV.kopna, -11], [EV.E23 - 0.6, -12], [ORB.t0 + 0.9, -26], [ORB.t1 - 0.3, -26], [EV.L25, -6],
    [EV.prohl, -8], [EV.otdohni, -18], [EV.usni, -14], [EV.fin, 5], [T, 5],
  ]);
  YOFF = kf([
    [0, 0], [EV.zhuravli - 0.6, 0], [EV.karavan, 22], [EV.E10 + 0.3, 18], [EV.zolote + 0.2, 0], [EV.L21, 6], [EV.lozhis, 12], [EV.kostsam - 0.45, 34], [EV.kostsam, 58], [EV.kostsam + 0.2, 64],
    [EV.E22 + 0.4, 0], [T, 0],
  ]);
  LOOKW = kf([[0, 0], [ORB.t0, 0], [ORB.t0 + 0.6, 0.86], [ORB.t1 - 0.5, 0.86], [ORB.t1 + 0.6, 0], [T, 0]]);
  // интегрируем путь
  let x = 0, z = 0;
  const N = Math.ceil(T / PATH.dt) + 2;
  for (let i = 0; i < N; i++) {
    const t = i * PATH.dt, h = HEAD(t) * DEG, v = Math.max(0, SPEED(t));
    PATH.x.push(x); PATH.z.push(z); PATH.h.push(h);
    x += Math.sin(h) * v * PATH.dt; z += Math.cos(h) * v * PATH.dt;
  }
  // курганы у дороги строфы 1 (на первом — каменная баба)
  { const k1 = (() => { const h = PATH.h[Math.floor((EV.L2 + 1.5) / PATH.dt)], i = Math.floor((EV.L2 + 1.5) / PATH.dt); return [PATH.x[i] + Math.sin(h) * 70 - Math.cos(h) * 38, PATH.z[i] + Math.cos(h) * 70 + Math.sin(h) * 38]; })();
    const k2 = (() => { const h = PATH.h[Math.floor(EV.L4 / PATH.dt)], i = Math.floor(EV.L4 / PATH.dt); return [PATH.x[i] + Math.sin(h) * 120 + Math.cos(h) * 55, PATH.z[i] + Math.cos(h) * 120 - Math.sin(h) * 55]; })();
    KURG = [{ x: k1[0], z: k1[1], h: 7, r: 22 }, { x: k2[0], z: k2[1], h: 5, r: 19 }]; }
  // овраг вдоль пути строки 12, дорога строфы 1
  const seg = (ta, tb, extA, extB) => {
    const pts = [];
    const ia = Math.floor(ta / PATH.dt), ib = Math.floor(tb / PATH.dt);
    const ha = PATH.h[ia], hb = PATH.h[ib];
    for (let k = 5; k >= 1; k--) pts.push([PATH.x[ia] - Math.sin(ha) * extA * k / 5, PATH.z[ia] - Math.cos(ha) * extA * k / 5]);
    for (let i = ia; i <= ib; i += 6) pts.push([PATH.x[i], PATH.z[i]]);
    for (let k = 1; k <= 5; k++) pts.push([PATH.x[ib] + Math.sin(hb) * extB * k / 5, PATH.z[ib] + Math.cos(hb) * extB * k / 5]);
    return polyline(pts);
  };
  RAV = seg(EV.ruchyi - 1.1, EV.E12 + 0.35, 40, 70);
  ROAD = seg(0.05, EV.L7, 6, 420);
  initRavCells();
  // земля под путём, сглаженная по времени
  const raw = PATH.x.map((px, i) => Hx(px, PATH.z[i]));
  for (let i = 0; i < N; i++) { let s = 0, c = 0; for (let k = -36; k <= 36; k += 4) { const j = clamp(i + k, 0, N - 1); s += raw[j]; c++; } PATH.g.push(s / c); }
  const P = (t) => posXZ(t);
  SEASON.pm = P(EV.carstvo); SEASON.pg = P(EV.prinakr); SEASON.ps = P(EV.E20); SEASON.pa = P(AUT_T0);
}
function idx(t) { const f = clamp(t, 0, CFG.total) / PATH.dt, i = Math.min(Math.floor(f), PATH.x.length - 2); return [i, f - i]; }
function posXZ(t) { const [i, u] = idx(t); return [lerp(PATH.x[i], PATH.x[i + 1], u), lerp(PATH.z[i], PATH.z[i + 1], u)]; }
function headAt(t) { return HEAD(t) * DEG; }
function camAt(t) { const f = fpvAt(t); return introCam(t, f) || f; }
function fpvAt(t) {
  const [i, u] = idx(t);
  const x = lerp(PATH.x[i], PATH.x[i + 1], u), z = lerp(PATH.z[i], PATH.z[i + 1], u);
  const gr = lerp(PATH.g[i], PATH.g[i + 1], u);
  const h = HEAD(t) * DEG;
  // крен в поворот: по скорости поворота
  const rate = (HEAD(t + 0.15) - HEAD(t - 0.15)) / 0.3 * DEG;
  const v = Math.max(0, SPEED(t));
  let roll = clamp(rate * (0.12 + v * 0.01), -0.3, 0.3);
  // лёгкая «ручная» дрожь FPV, сильнее на скорости
  const sh = 0.0025 + v * 0.00012;
  const nz = (k) => (vn(t * 1.7 + k * 13.1, k * 7.7) - 0.5) * 2;
  let yaw = h + YOFF(t) * DEG + nz(1) * sh;
  const lw = LOOKW(t);
  if (lw > 0) { const c = FIRE.pos; const toC = Math.atan2(c[0] - x, c[2] - z); let dy = toC - h; while (dy > Math.PI) dy -= TAU; while (dy < -Math.PI) dy += TAU; yaw = h + dy * lw; }
  roll += nz(2) * sh * 1.5;
  const pitch = PITCH(t) * DEG + nz(3) * sh;
  return { x, y: gr + ALT(t), z, yaw, pitch, roll };
}
// база для предметов: точка пути в момент tt, сдвиг вперёд/вправо в метрах (по курсу)
function pathPt(tt, fwd = 0, right = 0) {
  const [x, z] = posXZ(tt), h = headAt(tt);
  return [x + Math.sin(h) * fwd + Math.cos(h) * right, z + Math.cos(h) * fwd - Math.sin(h) * right];
}
const FIRE = { pos: [0, 0, 0] };
