// ---------- Квадрокоптер: взлёт со стороны, потом камера влетает в него и полёт идёт от первого лица ----------
const TO = { spin0: 0.25, spin1: 1.0, lift: 1.05, go: 1.95, merge0: 2.85, merge1: 3.85 };   // время взлёта, с
// коробка: центр c, оси ax[3] (единичные), полуразмеры h[3]
function box(c, ax, h, col, o = {}) {
  const P = (sx, sy, sz) => vadd(c, vadd(vsc(ax[0], sx * h[0]), vadd(vsc(ax[1], sy * h[1]), vsc(ax[2], sz * h[2]))));
  const q = [
    [P(-1, -1, 1), P(1, -1, 1), P(1, 1, 1), P(-1, 1, 1)], [P(1, -1, -1), P(-1, -1, -1), P(-1, 1, -1), P(1, 1, -1)],
    [P(1, -1, 1), P(1, -1, -1), P(1, 1, -1), P(1, 1, 1)], [P(-1, -1, -1), P(-1, -1, 1), P(-1, 1, 1), P(-1, 1, -1)],
    [P(-1, 1, 1), P(1, 1, 1), P(1, 1, -1), P(-1, 1, -1)], [P(-1, -1, -1), P(1, -1, -1), P(1, -1, 1), P(-1, -1, 1)],
  ];
  const cols = o.cols || [];
  q.forEach((f, i) => face(f, cols[i] || col, { ...o, ctr: c, cull: true }));
}
// положение и наклон дрона: он и есть FPV-камера
function droneState(t) {
  const c = fpvAt(t);
  const acc = (SPEED(t + 0.12) - SPEED(t - 0.12)) / 0.24;
  const tilt = -clamp(acc * 0.03, -0.15, 0.42);   // нос вниз на разгоне
  // на земле полозья стоят на той грани, что нарисована; после отрыва плавно переходим на путь полёта
  const gs = Math.max(Hsurf(c.x, c.z), Hx(c.x, c.z) + 0.22) + 0.19;   // стоит на дороге (лента приподнята на 0,22 м)
  const y = t < TO.go + 0.6 ? lerp(gs, c.y, ease(inv(TO.lift, TO.go + 0.6, t))) : c.y;
  return { pos: [c.x, y, c.z], yaw: HEAD(t) * DEG, tilt, roll: c.roll * 0.8 };
}
function propSpin(t) { return ease(inv(TO.spin0, TO.spin1, t)); }
function drawDrone(t, S, s = 1.7) {
  const f0 = [Math.sin(S.yaw), 0, Math.cos(S.yaw)], r0 = [Math.cos(S.yaw), 0, -Math.sin(S.yaw)];
  // наклон: нос вниз (вокруг r), крен (вокруг f)
  let f = vnorm(vadd(vsc(f0, Math.cos(S.tilt)), [0, Math.sin(S.tilt), 0]));
  let u = vnorm(vcross(f, r0));   // вверх
  const r = vnorm(vadd(vsc(r0, Math.cos(S.roll)), vsc(u, -Math.sin(S.roll))));
  u = vnorm(vcross(f, r));
  const C = S.pos;
  const L = (x, y, z) => vadd(C, vadd(vsc(r, x * s), vadd(vsc(u, y * s), vsc(f, z * s))));
  const AX = [r, u, f];
  const dark = [54, 58, 68], orange = [244, 128, 40], black = [26, 28, 32];
  beginGroup([C[0], C[1] - 0.2, C[2]], 8);   // после ленты дороги (у неё смещение 6)
  // корпус, оранжевая крышка с аккумулятором, камера спереди
  box(C, AX, [0.075 * s, 0.035 * s, 0.12 * s], dark, { cols: [dark, dark, dark, dark, mix(dark, [120, 124, 136], 0.3), dark] });
  box(L(0, 0.05, -0.01), AX, [0.055 * s, 0.025 * s, 0.085 * s], orange);
  box(L(0, 0.0, 0.135), AX, [0.03 * s, 0.028 * s, 0.022 * s], black);
  blob(L(0, 0.0, 0.16), 0.016 * s, 0.016 * s, 0.01 * s, [60, 90, 140], { sides: 6, emis: 0.4, basis: [u, r, f] });
  // лучи, моторы, винты
  const spin = propSpin(t);
  const ang = t * 55 * spin + t * t * 2;
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const M = L(sx * 0.22, 0.01, sz * 0.22);
    limb(L(sx * 0.04, 0.0, sz * 0.05), M, 0.016 * s, 0.014 * s, dark, { sides: 4 });
    lathe(L(sx * 0.22, -0.015, sz * 0.22), u, [[0.028 * s, 0], [0.028 * s, 0.045 * s], [0, 0.05 * s]], 6, black, { basis: [u, r, f] });
    const top = L(sx * 0.22, 0.04, sz * 0.22);
    const R = 0.12 * s;
    // размытый диск вращения
    if (spin > 0.05) {
      const disk = []; for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; disk.push(vadd(top, vadd(vsc(r, Math.cos(a) * R), vsc(f, Math.sin(a) * R)))); }
      face(disk, [210, 216, 226], { n: u, alpha: 0.32 * spin, two: true, emis: 0.3 });
    }
    // две лопасти (видны, пока винт не разогнался)
    if (spin < 0.95) {
      for (let b = 0; b < 2; b++) {
        const a = ang * sx + b * Math.PI, ca = Math.cos(a), sa = Math.sin(a);
        const d = vadd(vsc(r, ca), vsc(f, sa)), w = vadd(vsc(r, -sa), vsc(f, ca));
        face([vadd(top, vsc(w, 0.012 * s)), vadd(top, vadd(vsc(d, R), vsc(w, 0.018 * s))), vadd(top, vadd(vsc(d, R), vsc(w, -0.01 * s))), vadd(top, vsc(w, -0.012 * s))],
          b ? [236, 236, 240] : orange, { two: true, n: u, alpha: 1 - spin * 0.9 });
      }
    }
  }
  // посадочные ножки и полозья
  for (const sx of [-1, 1]) {
    limb(L(sx * 0.06, -0.03, 0.08), L(sx * 0.09, -0.11, 0.09), 0.008 * s, 0.008 * s, black, { sides: 3 });
    limb(L(sx * 0.06, -0.03, -0.08), L(sx * 0.09, -0.11, -0.09), 0.008 * s, 0.008 * s, black, { sides: 3 });
    limb(L(sx * 0.09, -0.11, -0.13), L(sx * 0.09, -0.11, 0.13), 0.01 * s, 0.01 * s, black, { sides: 3 });
  }
  // огни: спереди белые, сзади красные (мигают)
  const blink = 0.5 + 0.5 * Math.sin(t * 9);
  face([L(-0.02, 0.0, 0.122), L(0.02, 0.0, 0.122), L(0, 0.02, 0.122)], [255, 255, 240], { lit: false, two: true });
  face([L(-0.06, 0.0, -0.122), L(-0.03, 0.0, -0.122), L(-0.045, 0.02, -0.122)], mix([90, 20, 20], [255, 50, 40], blink), { lit: false, two: true });
  face([L(0.03, 0.0, -0.122), L(0.06, 0.0, -0.122), L(0.045, 0.02, -0.122)], mix([90, 20, 20], [255, 50, 40], blink), { lit: false, two: true });
  endGroup();
}
// снежная пыль из-под винтов (экранный слой)
function drawDust(g, t) {
  if (t > TO.merge1) return;
  const S = droneState(t), gy = Hsurf(S.pos[0], S.pos[2]);
  const k = propSpin(t) * clamp(1 - (S.pos[1] - gy - 0.2) / 2.2);
  if (k <= 0.01) return;
  reset(g);
  for (let i = 0; i < 70; i++) {
    const per = 0.7 + hash(i * 3.3) * 0.6, ph = ((t + hash(i * 1.7) * per) / per) % 1;
    const a = hash(i * 7.1) * TAU, rad = 0.2 + ph * (1.2 + hash(i) * 1.6);
    const p = project([S.pos[0] + Math.cos(a) * rad, gy + 0.05 + ph * (0.25 + hash(i * 5) * 0.5), S.pos[2] + Math.sin(a) * rad]);
    if (!p) continue;
    const sz = clamp(26 / p[2], 1.2, 9) * (0.6 + ph);
    g.fillStyle = `rgba(246,248,255,${(k * 0.7 * Math.sin(Math.PI * ph)).toFixed(3)})`;
    ngon(g, p[0], p[1], sz, 6, i); g.fill();
  }
}
// вспышка «объектива», когда камера входит в дрон
function droneFlash(t) {
  if (t < TO.merge0 || t > TO.merge1 + 0.3) return 0;
  const S = droneState(t), d = vlen(vsub(S.pos, [CAM.x, CAM.y, CAM.z]));
  return 0.6 * clamp(1 - Math.abs(d - 0.75) / 0.3) * (1 - ease(inv(TO.merge1, TO.merge1 + 0.1, t)));
}
// камера взлёта: сбоку-спереди, дрон проносится мимо; потом камера догоняет и влетает в него
function introCam(t, fpv) {
  if (t >= TO.merge1) return null;
  const S = droneState(Math.max(t, 0));
  const P0 = droneState(0).pos, h0 = HEAD(0) * DEG;
  const F0 = [Math.sin(h0), 0, Math.cos(h0)], R0 = [Math.cos(h0), 0, -Math.sin(h0)];
  // наблюдатель: справа-спереди, чуть выше снега, медленно смещается и поднимается вслед за дроном
  const sw = ease(inv(0, TO.go + 0.6, t));
  const side = lerp(1.55, 2.4, sw), fwd = lerp(1.75, 3.2, sw), up = lerp(0.42, 1.2, ease(inv(TO.lift, TO.go + 0.8, t)));
  const obs = vadd(P0, vadd(vsc(R0, side), vadd(vsc(F0, fwd), [0, up, 0])));
  const tgt = vadd(S.pos, [0, 0.03, 0]);
  const d = vsub(tgt, obs);
  const look = { x: obs[0], y: obs[1], z: obs[2], yaw: Math.atan2(d[0], d[2]), pitch: Math.atan2(d[1], Math.hypot(d[0], d[2])), roll: 0 };
  const e = inv(TO.merge0, TO.merge1, t);
  if (e <= 0) return look;
  // догоняем: позиция к дрону, взгляд — с текущей точки на дрон, к концу — взгляд самого дрона
  const ang = (a, b, u) => { let dd = b - a; while (dd > Math.PI) dd -= TAU; while (dd < -Math.PI) dd += TAU; return a + dd * u; };
  const ep = Math.pow(ease(e * 0.5) * 2 * 0.5 + 0.5 * Math.pow(e, 2.2), 1), eo = ease(inv(0.82, 1.0, e));   // разгон к дрону без торможения в конце
  const pos = [lerp(obs[0], fpv.x, ep), lerp(obs[1], fpv.y, ep) + Math.sin(Math.PI * ep) * 0.5, lerp(obs[2], fpv.z, ep)];
  const fwdD = [Math.sin(S.yaw), 0, Math.cos(S.yaw)];
  const tgt2 = vadd(tgt, vsc(vadd(vsc(fwdD, 2 + 6 * e), [0, 0.6 * e, 0]), ease(e * 3)));   // точка взгляда уходит вперёд плавно, без скачка в начале   // смотрим чуть впереди дрона: он в нижней половине кадра, под заголовком
  const d2 = vsub(tgt2, pos), hz = Math.hypot(d2[0], d2[2]) || 1e-3;
  const ly = Math.atan2(d2[0], d2[2]), lp = Math.atan2(d2[1], hz);
  return { x: pos[0], y: pos[1], z: pos[2], yaw: ang(ly, fpv.yaw, eo), pitch: lerp(lp, fpv.pitch, eo), roll: lerp(0, fpv.roll, eo) };
}
