// ---------- Мальчик: живописные мазки. Сбоку (бег, стоит), анфас (руки раскинуты, лёжа сверху), крупно лицо ----------
// Сбоку: начало координат — земля под тазом, единица — пиксель при s = 1 (рост ≈ 215).
const B = { hip: 94, thigh: 48, shin: 44, torso: 70, head: 25, up: 34, fore: 32 };
const STRIDE = 200; // путь за полный цикл бега (два шага); опорная стопа неподвижна относительно земли

const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const dirv = (ang, l) => [Math.sin(ang) * l, Math.cos(ang) * l]; // угол от вертикали вниз, + вперёд

// Поза сбоку. o = {kind: "run"|"stand", dist — пройденный путь (лок. ед.), look, holdRel — куда тянется рука с ниткой, jump}
// Бег: опорная ступня неподвижна относительно земли (едет назад ровно со скоростью тела), маховая переносится по дуге.
function sidePose(o) {
  const p = {};
  if (o.kind === "run") {
    // бег с фазой полёта: опора 35 % цикла на каждую ногу, таз высоко, колено на опоре согнуто ≈35–40°
    const D = STRIDE, c = o.dist / D, f = 0.35, half = D * f / 2;
    p.c = c;
    const leg = (off) => {
      let q = c + off; q -= Math.floor(q);
      if (q < f) return { st: true, x: lerp(half, -half, q / f), y: -10 };
      const u = (q - f) / (1 - f), e = 0.5 - 0.5 * Math.cos(Math.PI * u);
      // маховая: сначала пятка уходит вверх-назад, потом стопа выносится вперёд
      return { st: false, x: lerp(-half, half, Math.pow(e, 1.25)), y: -10 - Math.sin(Math.PI * Math.pow(u, 0.7)) * 19 };
    };
    const A = leg(0), Bl = leg(0.5), st = A.st ? A : (Bl.st ? Bl : null);
    const hEdge = Math.sqrt(91 * 91 - half * half);
    let hv;
    if (st) hv = Math.min(86.5, Math.sqrt(91 * 91 - st.x * st.x));
    else { const q = c - Math.floor(c), u = q < 0.5 ? (q - f) / (0.5 - f) : (q - 0.5 - f) / (0.5 - f); hv = hEdge + Math.sin(Math.PI * clamp(u)) * 4; }
    p.feet = [[A.x, A.y], [Bl.x, Bl.y]];                 // [ближняя, дальняя]
    p.jump = o.jump || 0;
    p.hipY = -(10 + hv) - p.jump;
    p.lean = 0.22 + 0.03 * Math.sin(c * 4 * Math.PI + 0.6);
    p.farArm = [0.75 * Math.cos(TAU * c), 1.75 + 0.25 * Math.sin(TAU * c)]; // против дальней ноги
    p.kj = ease(clamp(p.jump / 58));
    p.leap = [[0.75, 0.35], [-0.65, 1.05]];
  } else {
    p.legs = [[0.1, 0.06], [-0.12, 0.04]];
    p.lean = -0.04;
    p.farArm = [0.25, 1.5];
    p.jump = 0;
  }
  p.look = o.look || 0;
  p.hold = o.hold;
  p.holdRel = o.holdRel;
  return p;
}
// двухзвенная IK для ноги: колено вперёд (+x)
function legIK(hip, f) {
  let dx = f[0] - hip[0], dy = f[1] - hip[1], d = Math.hypot(dx, dy);
  const L1 = B.thigh, L2 = B.shin, maxd = L1 + L2 - 0.5;
  if (d > maxd) { dx *= maxd / d; dy *= maxd / d; d = maxd; }
  const a = Math.atan2(dy, dx), cA = clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1);
  const k1 = [hip[0] + Math.cos(a + Math.acos(cA)) * L1, hip[1] + Math.sin(a + Math.acos(cA)) * L1];
  const k2 = [hip[0] + Math.cos(a - Math.acos(cA)) * L1, hip[1] + Math.sin(a - Math.acos(cA)) * L1];
  return [k1[0] > k2[0] ? k1 : k2, [hip[0] + dx, hip[1] + dy]];
}
function sideJoints(p) {
  const J = {};
  if (p.feet) {
    J.hip = [0, p.hipY];
    J.legs = p.feet.map((f, i) => {
      const [kn, an] = legIK(J.hip, [f[0], f[1] - p.jump]);
      if (!p.kj) return [kn, an];
      const [th, kb] = p.leap[i], k2 = add(J.hip, dirv(th, B.thigh)), a2 = add(k2, dirv(th - kb, B.shin));
      return [lerp2(kn, k2, p.kj), lerp2(an, a2, p.kj)];
    });
  } else {
    const legPts = p.legs.map(([th, kb]) => { const kn = dirv(th, B.thigh); return [kn, add(kn, dirv(th - kb, B.shin))]; });
    const low = Math.max(legPts[0][1][1], legPts[1][1][1]);
    J.hip = [0, -(low + 10) - p.jump];
    J.legs = legPts.map(([kn, an]) => [add(J.hip, kn), add(J.hip, an)]);
  }
  J.neck = add(J.hip, [Math.sin(p.lean) * B.torso, -Math.cos(p.lean) * B.torso]);
  J.head = add(J.neck, [Math.sin(p.lean + p.look * 0.3) * 6 + 4, -B.head - 4]);
  J.shN = add(J.neck, [-3, 8]);
  J.shF = add(J.neck, [5, 6]);
  const [ua, eb] = p.farArm;
  const el = add(J.shF, dirv(ua, B.up));
  J.farArm = [J.shF, el, add(el, dirv(ua + eb, B.fore))];
  J.nearArm = armIK(J.shN, p.hold || add(J.shN, p.holdRel || [30, 40]), p.holdRel && p.holdRel[1] < 0 ? -1 : 1);
  return J;
}
// двухзвенная IK: локоть наружу и вниз (side = 1 — локоть ниже линии плечо–кисть)
function armIK(sh, target, side) {
  let dx = target[0] - sh[0], dy = target[1] - sh[1];
  let d = Math.hypot(dx, dy);
  const maxd = B.up + B.fore - 1;
  if (d > maxd) { dx *= maxd / d; dy *= maxd / d; d = maxd; }
  const a = Math.atan2(dy, dx);
  const cosA = clamp((B.up * B.up + d * d - B.fore * B.fore) / (2 * B.up * d), -1, 1);
  const ang = a + Math.acos(cosA) * side;
  const el = [sh[0] + Math.cos(ang) * B.up, sh[1] + Math.sin(ang) * B.up];
  return [sh, el, [sh[0] + dx, sh[1] + dy]];
}

// ---------- Живописная отрисовка: сегменты из мазков, свет слева сверху ----------
const LIGHT = [-0.55, -0.83];
// цвет под освещение сцены: lit 0…1 — яркость, warm 0…1 — тёплая подсветка заката
function litCol(c, o) { if (o.env) c = mix(c, o.env, 0.16); return shade(mix(mix(c, [255, 140, 80], (o.warm || 0) * 0.35), [56, 64, 130], (o.cool || 0) * 0.45), ((o.lit === undefined ? 1 : o.lit) - 1) * 0.95); }
function capsule(g, a, b, ra, rb) {
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  g.beginPath();
  g.arc(b[0], b[1], rb, ang - Math.PI / 2, ang + Math.PI / 2);
  g.arc(a[0], a[1], ra, ang + Math.PI / 2, ang + Math.PI * 1.5);
  g.closePath();
}
// сегмент тела: рваная тёмная кайма, тело, мазки тени и света вдоль формы
function paintSeg(g, a, b, ra, rb, col, seed, k) {
  reset(g);
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1e-3, ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  let nx = -(b[1] - a[1]) / L, ny = (b[0] - a[0]) / L;
  if (nx * LIGHT[0] + ny * LIGHT[1] < 0) { nx = -nx; ny = -ny; } // n — к свету
  g.fillStyle = css(shade(col, -0.5), 0.75); capsule(g, [a[0] - nx * 0.8 * k, a[1] - ny * 0.8 * k], [b[0] - nx * 0.8 * k, b[1] - ny * 0.8 * k], ra + 1.4 * k, rb + 1.4 * k); g.fill();
  g.fillStyle = css(col); capsule(g, a, b, ra, rb); g.fill();
  const m = Math.max(1, Math.round(L / (9 * k)));
  for (let i = 0; i < m; i++) {
    const u = (i + 0.5) / m, r = lerp(ra, rb, u);
    const px = lerp(a[0], b[0], u), py = lerp(a[1], b[1], u);
    dab(g, px - nx * r * 0.5, py - ny * r * 0.5, L / m * 1.35, r * 0.75, ang + (hash(seed + i) - 0.5) * 0.12, jit(shade(col, -0.24), seed + i, 14), 0.85);
    dab(g, px + nx * r * 0.38, py + ny * r * 0.38, L / m * 1.2, r * 0.48, ang + (hash(seed + i * 3) - 0.5) * 0.16, jit(shade(col, 0.2), seed + i * 7, 16), 0.85);
  }
  reset(g);
}
// цельная конечность через точки pts с радиусами rs: без шва на суставе, мазки тени и света вдоль формы
function limbPath(g, pts, rs, grow, ox, oy) {
  const n = pts.length, L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1e-3, nx = -(b[1] - a[1]) / d, ny = (b[0] - a[0]) / d, r = rs[i] + grow;
    L.push([pts[i][0] + nx * r + ox, pts[i][1] + ny * r + oy]); R.push([pts[i][0] - nx * r + ox, pts[i][1] - ny * r + oy]);
  }
  const e = pts[n - 1], s0 = pts[0];
  const ae = Math.atan2(e[1] - pts[n - 2][1], e[0] - pts[n - 2][0]), as = Math.atan2(pts[1][1] - s0[1], pts[1][0] - s0[0]);
  g.beginPath(); g.moveTo(L[0][0], L[0][1]);
  for (let i = 1; i < n; i++) g.lineTo(L[i][0], L[i][1]);
  g.arc(e[0] + ox, e[1] + oy, rs[n - 1] + grow, ae + Math.PI / 2, ae - Math.PI / 2, true);
  for (let i = n - 1; i >= 0; i--) g.lineTo(R[i][0], R[i][1]);
  g.arc(s0[0] + ox, s0[1] + oy, rs[0] + grow, as - Math.PI / 2, as + Math.PI / 2, true);
  g.closePath();
}
function paintLimb(g, pts, rs, col, seed, k) {
  reset(g);
  g.fillStyle = css(shade(col, -0.45), 0.45); limbPath(g, pts, rs, 1.0 * k, 0.7 * k, 0.9 * k); g.fill();
  g.fillStyle = css(col); limbPath(g, pts, rs, 0, 0, 0); g.fill();
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1], Ls = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1e-3, ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    let nx = -(b[1] - a[1]) / Ls, ny = (b[0] - a[0]) / Ls;
    if (nx * LIGHT[0] + ny * LIGHT[1] < 0) { nx = -nx; ny = -ny; }
    const r = (rs[i] + rs[i + 1]) / 2;
    for (let j = 0; j < 3; j++) {
      const u = 0.2 + j * 0.3 + (hash(seed + i * 7 + j) - 0.5) * 0.12;
      dab(g, lerp(a[0], b[0], u) - nx * r * 0.42, lerp(a[1], b[1], u) - ny * r * 0.42, Ls * 0.5, r * 0.9, ang + (hash(seed + i + j * 3) - 0.5) * 0.14, jit(shade(col, -0.18), seed + i * 5 + j, 16), 0.85);
    }
    for (let j = 0; j < 2; j++) {
      const u = 0.3 + j * 0.4 + (hash(seed + i * 11 + j) - 0.5) * 0.2;
      dab(g, lerp(a[0], b[0], u) + nx * r * 0.3, lerp(a[1], b[1], u) + ny * r * 0.3, Ls * 0.55, r * 0.6, ang + (hash(seed + i * 13 + j) - 0.5) * 0.16, jit(shade(col, 0.16), seed + i * 17 + j, 14), 0.8);
    }
  }
  reset(g);
}
// ступня сбоку: пятка, плоская подошва на земле, носок; dir — куда смотрит
function footSide(g, an, s, dir, sk, seed, T) {
  paintShape(g, [T(add(an, [-4, -2])), T(add(an, [5, -1])), T(add(an, [12, 4])), T(add(an, [17, 6.5])), T(add(an, [17.5, 9.5])), T(add(an, [14, 11])), T(add(an, [-2, 11])), T(add(an, [-6, 8])), T(add(an, [-6, 3]))], sk, seed, s, 0, 6);
}
// ступня анфас: укорочена, носок наружу, пальцы
function footFront(g, a, s, sd, sk, seed, W0) {
  const c = add(a, [sd * 4, 5]), pts = [];
  for (let i = 0; i < 10; i++) { const an = i / 10 * TAU; const v = rot([Math.cos(an) * 8.5, Math.sin(an) * 4.6], sd * 0.35); pts.push(W0(add(c, v))); }
  paintShape(g, pts, sk, seed, s, sd * 0.35, 5);
  for (let i = 0; i < 3; i++) { const q = W0(add(c, rot([sd * (5 + i * 1.6), 1.5 + i * 0.6], sd * 0.35))); dab(g, q[0], q[1], 3.2 * s, 2.6 * s, 0, shade(sk, -0.12), 0.8); }
}
// замкнутая форма (рубаха, волосы) с каймой и мазками по направлению ang
// сглаживание замкнутого контура (Чайкин): без угловатых «касок» и прямоугольного торса
function chaikin(P) { const out = []; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); } return out; }
function paintShape(g, pts, col, seed, k, ang, n) {
  pts = chaikin(chaikin(pts));
  reset(g);
  const path = (dx, dy) => { g.beginPath(); g.moveTo(pts[0][0] + dx, pts[0][1] + dy); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0] + dx, pts[i][1] + dy); g.closePath(); };
  g.lineJoin = "round"; g.strokeStyle = css(shade(col, -0.45), 0.45); g.lineWidth = 2 * k; path(0.6 * k, 0.6 * k); g.stroke();
  g.fillStyle = css(col); path(0, 0); g.fill();
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  g.save(); path(0, 0); g.clip();
  for (let i = 0; i < Math.round(n * 1.6); i++) {
    const x = lerp(x0, x1, hash(seed + i * 1.3)), y = lerp(y0, y1, hash(seed + i * 2.7));
    const lx = (x - (x0 + x1) / 2) / (x1 - x0 + 1e-3), ly = (y - (y0 + y1) / 2) / (y1 - y0 + 1e-3);
    const light = -(lx * 0.9 + ly * 0.6);
    dab(g, x, y, 19 * k, 7 * k, ang + (hash(seed + i * 5) - 0.5) * 0.35, jit(shade(col, light * 0.45), seed + i, 20), 0.9);
  }
  g.restore();
  reset(g);
}
const rot = (v, a) => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)];

// ---------- Сбоку ----------
function drawBoySide(g, x, y, s, dir, o, t) {
  const p = sidePose(o);
  const ph = o.kind === "run" ? o.dist / STRIDE * TAU : 0;
  if (p.holdRel) p.holdRel = [p.holdRel[0] + Math.sin(ph) * 9 + Math.sin(t * 2.3) * 3, p.holdRel[1] + Math.cos(ph * 2) * 6 + Math.sin(t * 1.7) * 4];
  const J = sideJoints(p);
  const T = (pt) => [x + pt[0] * s * dir, y + pt[1] * s];
  const LC = (c) => litCol(c, o);
  const shirt = LC(C.shirt), pants = LC(C.pants), skin = LC(C.skin), hair = LC(C.hair), farK = -0.2;
  // тень на земле (в прыжке меньше)
  reset(g);
  const sh = 1 - clamp(p.jump / 60) * 0.5;
  g.fillStyle = "rgba(60,30,20,0.35)"; g.beginPath(); g.ellipse(x, y + 2, 46 * s * sh, 9 * s * sh, 0, 0, TAU); g.fill();
  // дальняя рука: рукав сужается к запястью, кисть
  const arm = (A, col, sk, seed) => {
    paintLimb(g, A.map(T), [7.2 * s, 6.2 * s, 5 * s], col, seed, s);
    hand(g, T(A[1]), T(A[2]), s, sk, seed);
  };
  arm(J.farArm, shade(shirt, farK), shade(skin, farK), 11);
  // ноги: дальняя, ближняя
  const leg = (L, col, sk, seed) => {
    const [kn, an] = L;
    footSide(g, an, s, dir, sk, seed + 20, T);
    paintLimb(g, [T(J.hip), T(kn), T(add(an, [0, -2]))], [9.5 * s, 7 * s, 5.2 * s], col, seed, s);
  };
  leg(J.legs[1], shade(pants, farK), shade(skin, farK), 31);
  leg(J.legs[0], pants, skin, 41);
  // рубаха навыпуск: подол развевается на бегу
  // позвоночник с изгибом: у таза наклон меньше, у груди больше — торс гнётся в поясе
  const P2 = (u, v) => {
    const N = 6; let px = J.hip[0], py = J.hip[1];
    const step = u / N;
    for (let i = 0; i < N; i++) { const a = p.lean + 0.22 * ((i + 0.5) * step / 70 - 0.5); px += Math.sin(a) * step; py -= Math.cos(a) * step; }
    const a = p.lean + 0.22 * (u / 70 - 0.5);
    return T([px + Math.cos(a) * v, py + Math.sin(a) * v]);
  };
  const sp = [Math.sin(p.lean), -Math.cos(p.lean)];
  const fl = o.kind === "run" ? Math.sin(ph * 2) : Math.sin(t * 2);
  const torso = [P2(-13, -16 - 4 - fl * 3), P2(0, -13), P2(24, -12), P2(48, -13.5), P2(66, -10), P2(70, 0), P2(68, 6), P2(56, 13), P2(34, 12.5), P2(16, 12), P2(0, 14), P2(-12, 15 + fl)];
  paintShape(g, torso, shirt, 61, s, Math.atan2(sp[1], sp[0] * dir), 26);
  // вышивка по подолу и вороту, разрез косоворотки
  for (let i = 0; i < 6; i++) { const q = P2(-9 + i * 0.3, lerp(-14, 13, i / 5)); dab(g, q[0], q[1], 6 * s, 3 * s, 0.6, LC(C.cad), 0.9); }
  for (let i = 0; i < 4; i++) { const q = P2(66 - i * 4, 7 - i * 0.5); dab(g, q[0], q[1], 5 * s, 2.6 * s, 1.2, LC(C.cad), 0.9); }
  // пояс-кушак и кисть сзади (летит по ветру)
  const b0 = P2(22, -12), b1 = P2(22, 12.5);
  paintSeg(g, b0, b1, 3.3 * s, 3.3 * s, LC([120, 40, 40]), 71, s);
  const tw = o.kind === "run" ? Math.sin(ph * 2 + 1) : Math.sin(t * 2.4);
  const k0 = P2(20, -14), k1 = [k0[0] - dir * (9 + 3 * tw) * s, k0[1] + (13 - 4 * Math.abs(tw)) * s];
  paintSeg(g, k0, k1, 2.2 * s, 3.4 * s, LC([140, 46, 44]), 75, s);
  // шея и голова
  const nk = T(J.neck), hd = T(J.head);
  paintSeg(g, nk, [lerp(nk[0], hd[0], 0.6), lerp(nk[1], hd[1], 0.6)], 7.5 * s, 7 * s, shade(skin, -0.1), 81, s);
  headSide(g, hd, s, dir, p.look, o, t, ph, LC);
  // ближняя рука (с ниткой змея)
  arm(J.nearArm, shade(shirt, 0.04), skin, 21);
  reset(g);
  return { hand: T(J.nearArm[2]), head: hd, J };
}
// кисть: овал ладони по направлению предплечья и большой палец
function hand(g, el, wr, s, sk, seed) {
  const a = Math.atan2(wr[1] - el[1], wr[0] - el[0]);
  const c = [wr[0] + Math.cos(a) * 4 * s, wr[1] + Math.sin(a) * 4 * s];
  paintSeg(g, wr, c, 4.6 * s, 5.4 * s, sk, seed + 50, s);
  dab(g, c[0] + Math.cos(a - 1.2) * 4 * s, c[1] + Math.sin(a - 1.2) * 4 * s, 7 * s, 3.4 * s, a - 0.6, sk);
}
function headSide(g, hd, s, dir, look, o, t, ph, LC) {
  const skin = LC(C.skin), hair = LC(C.hair);
  const H = (dx, dy) => [hd[0] + dx * dir * s, hd[1] + dy * s];
  // череп и подбородок
  reset(g);
  g.fillStyle = css(shade(skin, -0.5), 0.75);
  g.beginPath(); g.ellipse(hd[0] + 0.8 * s, hd[1] + 0.8 * s, 25.5 * s, 26.5 * s, 0, 0, TAU); g.fill();
  const rg = g.createRadialGradient(...H(6, -8), 4 * s, ...H(0, 0), 28 * s);
  rg.addColorStop(0, css(shade(skin, 0.14))); rg.addColorStop(1, css(shade(skin, -0.14)));
  g.fillStyle = rg; g.beginPath(); g.ellipse(hd[0], hd[1], 24.5 * s, 25.5 * s, 0, 0, TAU); g.fill();
  const ch = H(11, 16); g.beginPath(); g.ellipse(ch[0], ch[1], 12 * s, 9 * s, 0, 0, TAU); g.fill();
  // нос, ухо, румянец
  const ns = H(25, 1); dab(g, ns[0], ns[1], 9 * s, 7 * s, dir > 0 ? 0.9 : Math.PI - 0.9, shade(skin, -0.04));
  reset(g); const er = H(-3, 3); g.fillStyle = css(shade(skin, -0.16)); g.beginPath(); g.ellipse(er[0], er[1], 5 * s, 7 * s, 0, 0, TAU); g.fill();
  g.fillStyle = css(shade(skin, -0.32)); g.beginPath(); g.ellipse(er[0] + dir * 1 * s, er[1], 2 * s, 3.5 * s, 0, 0, TAU); g.fill();
  g.fillStyle = css(C.rose, 0.45); const bl = H(13, 9); g.beginPath(); g.ellipse(bl[0], bl[1], 5 * s, 3.2 * s, 0, 0, TAU); g.fill();
  // глаз и бровь
  const ey = H(14, -3 - look * 3);
  g.fillStyle = css([40, 26, 30]); g.beginPath(); g.ellipse(ey[0], ey[1], 2.4 * s, (o.blink ? 0.6 : 3.4) * s, 0, 0, TAU); g.fill();
  const bw = H(13, -10 - look * 3); dab(g, bw[0], bw[1], 9 * s, 2.6 * s, dir > 0 ? -0.15 : Math.PI + 0.15, shade(hair, -0.35));
  // рот: на бегу приоткрыт
  reset(g); const mo = H(18, 12); g.fillStyle = css([150, 60, 56]);
  g.beginPath(); g.ellipse(mo[0], mo[1], 2.6 * s, (o.kind === "run" ? 2.4 : 1.2) * s, 0, 0, TAU); g.fill();
  // волосы: шапка с вихрами, чёлка вперёд, на бегу вихры летят назад
  const wind = o.kind === "run" ? 1 : 0.4;
  const cap = [H(21, -12), H(14, -22), H(0, -28), H(-14, -25), H(-24, -12), H(-25, 2), H(-19, 11), H(-9, 3), H(2, -6), H(10, -9)];
  paintShape(g, cap, hair, 91, s, dir > 0 ? -2.6 : -0.5, 18);
  for (let i = 0; i < 11; i++) {
    const u = i / 10, a0 = lerp(-0.25, -2.9, u);
    const base = H(Math.cos(a0) * 22, Math.sin(a0) * 23 - 2);
    const fl = Math.sin(t * 9 + i * 1.7 + ph) * 0.25 * wind;
    const ang = (dir > 0 ? Math.PI : 0) + (dir > 0 ? -1 : 1) * (0.5 + u * 0.5) + fl * dir;
    dab(g, base[0] - Math.cos(ang) * 2 * s, base[1] + Math.sin(ang) * 1 * s, (10 + 4 * hash(i)) * s, 4.2 * s, ang + (dir > 0 ? 0 : 0), jit(shade(hair, 0.12), i + 95, 22), 0.95);
  }
  reset(g);
}

// ---------- Анфас ----------
// o = {arms: 0…1 раскинуты, lie: true — вид сверху, eyes, smile, tilt — наклон головы, lit, warm}
function drawBoyFront(g, x, y, s, o, t) {
  const op = o.arms || 0, lie = !!o.lie;
  const LC = (c) => litCol(c, o);
  const shirt = LC(C.shirt), pants = LC(C.pants), skin = LC(C.skin);
  const sw = lie ? 0 : Math.sin(t * 1.3) + 0.4 * Math.sin(t * 2.9);
  const breathe = Math.sin(t * 2.2) * (lie ? 3 : 1.6);
  const W0 = (v) => [x + v[0] * s, y + v[1] * s];
  // таз: вес на левой (для зрителя) ноге, бедро правой опущено
  const hipTilt = lie ? 0.03 : 0.07 + sw * 0.015;
  const hop = lie ? 0 : Math.sin(Math.PI * clamp(op * 1.4)) * 16;
  const hipC = [lie ? 0 : -4 + sw * 6, -90 - hop];
  const hL = add(hipC, rot([-11, 0], hipTilt)), hR = add(hipC, rot([11, 0], hipTilt));
  const aL = lie ? [-34, -9] : [-15, -9 - hop * 0.6], aR = lie ? [20, -24] : [17, -9 - hop * 0.6];
  const kL = add([lerp(hL[0], aL[0], 0.5), lerp(hL[1], aL[1], 0.52)], [-2.5, 0]);
  const kR = add([lerp(hR[0], aR[0], 0.5), lerp(hR[1], aR[1], 0.52)], lie ? [17, 4] : [-6, 2.5]);  // опорная прямее, свободная колено внутрь
  // корпус в противоходе тазу, голова к змею
  const tA = lie ? 0 : -hipTilt * 1.4 + sw * 0.012;
  const up = rot([0, -1], tA), rt = rot([1, 0], tA);
  // корпус чуть изогнут в сторону опорной ноги — не доска
  const bend = lie ? 0 : 0.05 + sw * 0.01;
  const TP = (u, v) => { const c = bend * (u / 72) * (u / 72) * 72 * 0.5; return [hipC[0] + up[0] * u + rt[0] * (v + c), hipC[1] + up[1] * u + rt[1] * (v + c)]; };
  const neckB = TP(72 + breathe * 0.3, 0);
  const shL = TP(64 + breathe * 0.5, -19), shR = TP(64 + breathe * 0.5, 19);
  const hA = (o.tilt || 0) + (lie ? 0 : sw * 0.05) - (lie ? 0.06 * Math.sin(t * 0.9) : Math.sin(Math.PI * clamp(op * 1.2)) * 0.2);
  const head = add(neckB, rot([0, -30], hA));
  // руки: IK с локтем наружу и вниз
  // взмах по дуге: угол и длина руки интерполируются, рука не складывается посередине
  const polar = (sh, a, b, u) => { const ra = Math.hypot(...a), rb = Math.hypot(...b); let aa = Math.atan2(a[1], a[0]), ab = Math.atan2(b[1], b[0]);
    if (ab - aa > Math.PI) ab -= TAU; if (aa - ab > Math.PI) ab += TAU; const an = lerp(aa, ab, u), r = lerp(ra, rb, u); return add(sh, [Math.cos(an) * r, Math.sin(an) * r]); };
  const uo = ease(op);
  const tug = o.hold === false || lie ? 0 : Math.pow(Math.max(0, Math.sin(t * 2.7)), 3) * 14;
  const wave = lie ? 0 : Math.sin(t * 3.2) * 6 * uoW(op);
  const tgtL = add(polar(shL, [-10, 63.5], lie ? [-61, -6] : [-50, -36], uo), [0, wave]);
  const tgtR = add(polar(shR, o.hold === false ? [7, 62] : [20 - tug * 0.3, 54 - tug], lie ? [56, 18] : [50, -38], uo), [0, -wave]);
  const armL = ikPick(shL, tgtL, [-1, 0.7]), armR = ikPick(shR, tgtR, op < 0.5 ? [0.45, 1] : [1, 0.7]);
  // тень
  reset(g);
  if (!lie) { g.fillStyle = "rgba(60,30,20,0.35)"; g.beginPath(); g.ellipse(x, y + 2, 62 * s, 10 * s, 0, 0, TAU); g.fill(); }
  else { g.fillStyle = "rgba(60,30,20,0.26)"; g.beginPath(); g.ellipse(x + 8 * s, y - 100 * s, 125 * s, 150 * s, 0, 0, TAU); g.fill(); }
  // ноги
  [[hL, kL, aL, -1, 31], [hR, kR, aR, 1, 41]].forEach(([h, k, a, sd, seed]) => {
    footFront(g, a, s, sd, skin, seed + 20, W0);
    paintLimb(g, [W0(h), W0(k), W0(add(a, [0, -2]))], [10 * s, 7.6 * s, 5.6 * s], pants, seed, s);
  });
  // рубаха: шире в плечах, расширяется к подолу
  const fl = Math.sin(t * 2.3) * (lie ? 0 : 1);
  const torso = [TP(72, -8), TP(68, -20), TP(58, -21), TP(40, -18.5), TP(22, -16), TP(4, -19), TP(-12, -22 - fl), TP(-14, -6), TP(-12, 8), TP(-13, 22 + fl), TP(4, 19), TP(22, 16), TP(40, 18.5), TP(58, 21), TP(68, 20), TP(72, 8)].map(W0);
  paintShape(g, torso, shirt, 61, s, Math.atan2(up[1], up[0]), 34);
  // ворот с вышивкой и разрезом слева, вышивка по подолу
  for (let i = 0; i < 7; i++) { const q = W0(TP(71 - Math.sin(i / 6 * Math.PI) * 4, lerp(-8, 8, i / 6))); dab(g, q[0], q[1], 5 * s, 2.6 * s, 0, LC(C.cad), 0.9); }
  for (let i = 0; i < 5; i++) { const q = W0(TP(66 - i * 6, -5)); dab(g, q[0], q[1], 5 * s, 2.6 * s, Math.PI / 2, LC(C.cad), 0.9); }
  for (let i = 0; i < 9; i++) { const q = W0(TP(-9, lerp(-19, 19, i / 8))); dab(g, q[0], q[1], 6 * s, 3 * s, 0.5, LC(C.cad), 0.9); }
  // кушак и кисть у бедра
  paintSeg(g, W0(TP(18, -16.5)), W0(TP(18, 16.5)), 3.6 * s, 3.6 * s, LC([120, 40, 40]), 71, s);
  const kk = W0(TP(16, -14)), sway = Math.sin(t * 2.6) * (lie ? 0 : 1);
  paintSeg(g, kk, [kk[0] - (3 + sway * 3) * s, kk[1] + 14 * s], 2.2 * s, 3.4 * s, LC([140, 46, 44]), 75, s);
  // шея и голова
  paintSeg(g, W0(neckB), W0(lerp2(neckB, head, 0.55)), 8.8 * s, 8.2 * s, shade(skin, -0.1), 81, s);
  headFront(g, W0(head), s, hA, o, t, LC);
  // руки поверх боков
  [[armL, 11], [armR, 21]].forEach(([A, seed]) => {
    paintLimb(g, A.map(W0), [7.4 * s, 6.4 * s, 5.2 * s], shade(shirt, 0.04), seed, s);
    hand(g, W0(A[1]), W0(A[2]), s, skin, seed);
  });
  // в гнезде: соломинки поверх краёв фигуры — лежит во ржи, а не на ней
  if (lie) for (let i = 0; i < 16; i++) {
    const a = hash(i * 4.1) * TAU, r = (70 + hash(i * 2.3) * 60) * s;
    const px = x + Math.cos(a) * r * 0.8, py = y - 100 * s + Math.sin(a) * r * 1.05;
    const hh = W0(head);
    if (Math.hypot(px - hh[0], py - hh[1]) < 48 * s) continue;
    dab(g, px, py, 34 * s, 3 * s, a + Math.PI / 2 + (hash(i) - 0.5) * 0.6, LC(C.gold), 0.9);
  }
  reset(g);
  return { handR: W0(armR[2]), handL: W0(armL[2]), head: W0(head) };
}
const lerp2 = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
const uoW = (op) => clamp((op - 0.8) / 0.2);
// IK с выбором локтя: из двух решений — то, что больше смотрит в сторону pref
function ikPick(sh, target, pref) {
  const A = armIK(sh, target, 1), Bb = armIK(sh, target, -1);
  const mid = lerp2(sh, A[2], 0.5);
  const sc = (E) => (E[1][0] - mid[0]) * pref[0] + (E[1][1] - mid[1]) * pref[1];
  return sc(A) >= sc(Bb) ? A : Bb;
}
function headFront(g, hd, s, tilt, o, t, LC) {
  const skin = LC(C.skin), hair = LC(C.hair);
  const H = (dx, dy) => { const v = rot([dx, dy], tilt); return [hd[0] + v[0] * s, hd[1] + v[1] * s]; };
  // уши
  for (const sd of [-1, 1]) { reset(g); const e = H(sd * 24, 3); g.fillStyle = css(shade(skin, -0.14)); g.beginPath(); g.ellipse(e[0], e[1], 5 * s, 7.5 * s, tilt, 0, TAU); g.fill(); }
  reset(g);
  g.fillStyle = css(shade(skin, -0.5), 0.75); g.beginPath(); g.ellipse(hd[0] + 0.8 * s, hd[1] + 0.8 * s, 25 * s, 27.5 * s, tilt, 0, TAU); g.fill();
  const rg = g.createRadialGradient(...H(-8, -8), 4 * s, ...H(0, 2), 30 * s);
  rg.addColorStop(0, css(shade(skin, 0.14))); rg.addColorStop(1, css(shade(skin, -0.14)));
  g.fillStyle = rg; g.beginPath(); g.ellipse(hd[0], hd[1], 24 * s, 26.5 * s, tilt, 0, TAU); g.fill();
  g.save(); g.beginPath(); g.ellipse(hd[0], hd[1], 24 * s, 26.5 * s, tilt, 0, TAU); g.clip();
  for (let i = 0; i < 44; i++) { const a = hash(i * 5.1) * TAU, d = Math.sqrt(hash(i * 2.9)) * 23; const dx = Math.cos(a) * d, dy = Math.sin(a) * d * 1.1, q = H(dx, dy);
    const side = (dx * 0.6 + dy * 0.5) / 24; // >0 — теневая сторона
    dab(g, q[0], q[1], 9 * s, 4.6 * s, 0.5 + tilt + (hash(i) - 0.5) * 0.6 + (dx > 0 ? 0.6 : 0), jit(shade(skin, -side * 0.2 + 0.03), i + 200, 10), 0.42); }
  // подбородок и скула — мягкая тень под нижней губой и по правой щеке
  { const q = H(2, 20); dab(g, q[0], q[1], 16 * s, 5 * s, tilt, shade(skin, -0.14), 0.35); const r = H(17, 6); dab(g, r[0], r[1], 13 * s, 5 * s, Math.PI / 2 + tilt, shade(skin, -0.12), 0.35); }
  g.restore();
  // волосы: шапка и рваная чёлка
  const cap = [H(-25, 2), H(-24, -14), H(-14, -26), H(0, -29), H(14, -26), H(24, -14), H(25, 1), H(19, -7), H(11, -11), H(4, -9), H(-4, -12), H(-12, -9), H(-19, -7)];
  paintShape(g, cap, hair, 101, s, -Math.PI / 2 + tilt, 20);
  for (let i = 0; i < 9; i++) {
    const u = i / 8, bx = lerp(-19, 19, u), by = -13 - Math.sin(u * Math.PI) * 4;
    const b0 = H(bx, by), fl = Math.sin(t * 4 + i * 1.3) * 0.25;
    const a = Math.PI / 2 + tilt + (u - 0.5) * 0.8 + fl;
    dab(g, b0[0] + Math.cos(a) * 3 * s, b0[1] + Math.sin(a) * 3 * s, (10 + hash(i * 3) * 4) * s, 4 * s, a, jit(shade(hair, 0.12), i + 120, 22), 0.95);
  }
  // глаза, брови, нос, румянец, рот
  const eo = o.eyes === undefined ? 1 : o.eyes, lk = o.lookUp || 0;
  for (const sd of [-1, 1]) {
    reset(g);
    const e = H(sd * 9, 1 - lk * 2);
    if (eo > 0.35) {
      g.fillStyle = css([40, 26, 30]); g.beginPath(); g.ellipse(e[0], e[1], 2.8 * s, 3.8 * eo * s, tilt, 0, TAU); g.fill();
      if (o.moonEyes) { const mr = 1.25 * s, Lm = moonLayer(mr); g.globalAlpha = o.moonEyes; g.drawImage(Lm, e[0] + 0.6 * s - mr * 1.3, e[1] + 0.4 * s - mr * 1.3); g.globalAlpha = 1; }
      g.fillStyle = css(C.white, 0.9); g.beginPath(); g.arc(e[0] - 0.9 * s, e[1] - 1.2 * s, 0.9 * s, 0, TAU); g.fill();
    }
    else { g.strokeStyle = css([90, 50, 46]); g.lineWidth = 1.8 * s; g.lineCap = "round"; g.beginPath(); g.arc(e[0], e[1] - 1.5 * s, 3.6 * s, 0.25 + tilt, Math.PI - 0.25 + tilt); g.stroke(); }
    const b = H(sd * 9.5, -6.5 - lk * 2); dab(g, b[0], b[1], 8 * s, 2.4 * s, tilt - sd * 0.18, shade(hair, -0.35));
    reset(g); const c = H(sd * 14, 9); g.fillStyle = css(C.rose, 0.4); g.beginPath(); g.ellipse(c[0], c[1], 4.5 * s, 3 * s, tilt, 0, TAU); g.fill();
  }
  const n = H(0, 6); dab(g, n[0], n[1], 7 * s, 5 * s, Math.PI / 2 + tilt, shade(skin, -0.08));
  reset(g);
  const sm = o.smile === undefined ? 1 : o.smile;
  const m0 = H(-6.5, 13), m1 = H(0, 13 + 5 * sm), m2 = H(6.5, 13);
  g.strokeStyle = css([150, 60, 56]); g.lineWidth = 2.2 * s; g.lineCap = "round";
  g.beginPath(); g.moveTo(m0[0], m0[1]); g.quadraticCurveTo(m1[0], m1[1], m2[0], m2[1]); g.stroke();
  reset(g);
}

// ---------- Крупно: лицо мальчика, в глазах отражается месяц ----------
function drawFaceClose(g, cx, cy, s, t, o = {}) {
  reset(g);
  // уши
  blob(g, cx - 300 * s, cy + 30 * s, 50 * s, 80 * s, shade(C.skin, -0.06), 71, 4);
  blob(g, cx + 300 * s, cy + 30 * s, 50 * s, 80 * s, shade(C.skin, -0.06), 72, 4);
  const rg = g.createRadialGradient(cx - 80 * s, cy - 80 * s, 40 * s, cx, cy, 340 * s);
  rg.addColorStop(0, css(shade(C.skin, 0.18))); rg.addColorStop(1, css(shade(C.skin, -0.12)));
  g.fillStyle = css(shade(C.skin, -0.4)); g.beginPath(); g.ellipse(cx + 4 * s, cy + 6 * s, 306 * s, 336 * s, 0, 0, TAU); g.fill();
  g.fillStyle = rg; g.beginPath(); g.ellipse(cx, cy, 300 * s, 330 * s, 0, 0, TAU); g.fill();
  for (let i = 0; i < 22; i++) {
    const a = hash(i * 3.3) * TAU, d = Math.sqrt(hash(i * 1.7)) * 250 * s;
    dab(g, cx + Math.cos(a) * d, cy + Math.sin(a) * d * 1.1, 110 * s, 30 * s, 0.5 + (hash(i) - 0.5) * 0.5, jit(C.skin, i + 300, 14), 0.22);
  }
  // румянец
  for (const sd of [-1, 1]) { reset(g); g.fillStyle = css(C.rose, 0.35); g.beginPath(); g.ellipse(cx + sd * 170 * s, cy + 120 * s, 60 * s, 36 * s, 0, 0, TAU); g.fill(); }
  // волосы-чёлка
  for (let i = 0; i < 26; i++) {
    const a = -Math.PI * (0.05 + i * 0.035);
    dab(g, cx + Math.cos(a) * 250 * s, cy + Math.sin(a) * 280 * s - 30 * s, 210 * s, 60 * s, a + Math.PI / 2 + (hash(i) - 0.5) * 0.4, jit(C.hair, i + 90, 30));
  }
  const eo = o.eyes === undefined ? 1 : o.eyes;
  for (const sd of [-1, 1]) {
    const ex = cx + sd * 112 * s, ey = cy + 10 * s;
    reset(g);
    g.fillStyle = css(C.white); g.beginPath(); g.ellipse(ex, ey, 62 * s, 44 * s * eo, 0, 0, TAU); g.fill();
    g.save(); g.beginPath(); g.ellipse(ex, ey, 62 * s, 44 * s * eo, 0, 0, TAU); g.clip();
    const ix = ex + (o.lookX || 0) * 14 * s, iy = ey - (o.lookY || 0) * 10 * s;
    g.fillStyle = css([90, 130, 170]); g.beginPath(); g.arc(ix, iy, 34 * s, 0, TAU); g.fill();
    g.fillStyle = css([20, 24, 40]); g.beginPath(); g.arc(ix, iy, 17 * s, 0, TAU); g.fill();
    // отражение: маленький серп месяца
    if (o.moon) { const mr = 20 * s, L = moonLayer(mr); g.globalAlpha = o.moon; g.drawImage(L, ix + 4 * s - mr * 1.3, iy - 2 * s - mr * 1.3); g.globalAlpha = 1; }
    g.fillStyle = css(C.white); g.beginPath(); g.arc(ix - 11 * s, iy - 12 * s, 7 * s, 0, TAU); g.fill();
    g.restore();
    // веко и бровь
    limb(g, [[ex - 66 * s, ey - 46 * s * eo - 4 * s], [ex, ey - 54 * s * eo - 8 * s], [ex + 66 * s, ey - 46 * s * eo - 4 * s]], 10 * s, shade(C.skin, -0.25));
    limb(g, [[ex - 60 * s, ey - 110 * s], [ex + 4 * s, ey - 126 * s - (o.brow || 0) * 20 * s], [ex + 62 * s, ey - 108 * s]], 18 * s, shade(C.hair, -0.1));
  }
  // нос, веснушки, улыбка
  dab(g, cx, cy + 90 * s, 70 * s, 40 * s, Math.PI / 2, shade(C.skin, -0.08));
  for (let i = 0; i < 14; i++) dab(g, cx + (i % 2 ? 1 : -1) * (70 + hash(i) * 80) * s, cy + (80 + hash(i * 2) * 50) * s, 10 * s, 8 * s, 0, [196, 116, 80], 0.55);
  limb(g, [[cx - 70 * s, cy + 175 * s], [cx, cy + 205 * s], [cx + 70 * s, cy + 172 * s]], 12 * s, [170, 70, 60]);
  reset(g);
}
