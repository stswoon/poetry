// ---------- режиссура ----------
const cv = document.getElementById("scene"), ctx = cv.getContext("2d");
const L = (n) => E["L" + n], EN = (n) => E["E" + n];
const NL = Object.keys(E).filter((k) => /^L\d+$/.test(k)).length;
buildLeafShapes();
initPaper();

// ---------- герои-листья на клёне ----------
const BR0 = [2230, 300], BR1 = [3380, 262];
const branchY = (x) => lerp(BR0[1], BR1[1], (x - BR0[0]) / (BR1[0] - BR0[0])) + 16 * Math.sin((x - BR0[0]) / 230);
const HEROES = [
  { ax: 2470, ay: 380, s: 182, aut: "gold", ph: 0.0 },
  { ax: 2640, ay: 472, s: 192, aut: "red", ph: 1.3 },
  { ax: 2810, ay: 376, s: 182, aut: "orange", ph: 2.1, joker: true },
  { ax: 2980, ay: 482, s: 198, aut: "crimson", ph: 0.7 },
  { ax: 3150, ay: 372, s: 182, aut: "amber", ph: 2.8 },
  { ax: 3310, ay: 462, s: 176, aut: "lemon", ph: 1.9 },
];
// мелкие листья без лиц: на главной ветке и на верхней
const SMALL = [];
{
  const r = mulberry32(77);
  const xs = [2330, 2400, 2555, 2725, 2895, 3065, 3230, 3390];
  xs.forEach((x, i) => SMALL.push({ ax: x, ay: branchY(x) + 8 + r() * 10, s: 62 + r() * 26, sw: (r() - 0.5) * 1.6, aut: ["gold", "orange", "red", "amber", "lemon"][i % 5], ph: r() * 6, kind: "maple" }));
  for (let i = 0; i < 9; i++) { const x = 2380 + i * 86 + r() * 30; SMALL.push({ ax: x, ay: 90 + Math.sin(i) * 14 + 10, s: 52 + r() * 22, sw: (r() - 0.5) * 1.2, aut: ["amber", "red", "gold"][i % 3], ph: r() * 6, kind: "maple", up: true }); }
}
const HY = 0.32; // центр пластинки клёна в долях размера
function hangCenter(ax, ay, s, pet, sw) { const v = -(HY * s + pet), th = Math.PI + sw; return [ax - v * Math.sin(th), ay + v * Math.cos(th)]; }

// ---------- ключевые моменты ----------
const T_POP = E.w_torch - 0.05;
const T_BLIZ = E.w_snega - 0.3, T_BLIZE = EN(4) + 0.4;
const T_SLEEP = E.w_spyat - 0.1;
const T_HOG0 = E.w_igly - 0.55, T_HOG1 = E.w_ezha - 0.05;
const T_JK0 = L(7) - 0.75, T_JKHIT = E.w_zhelt - 0.3, T_JKOUT = EN(8) - 0.05, T_JKLAND = Math.max(E.w_my - 0.08, T_JKOUT + 1.0);
const T_SHAKE = Math.max(E.w_zhelt + 0.45, EN(7) - 0.1), T_YAWN = E.w_svezha - 0.05; // «не желтеет» — стряхивает желтизну
const T_UNROLL = E.w_ezha; // ёж разворачивается на «ежа»
const T_SUN = E.w_leto - 0.2;
const T_WOFF = L(9) + 1.0; // снег в бору тает, когда бор уже за кадром
const T_DROP = E.w_rose - 0.55, T_SPLASH = E.w_rose - 0.05;
const T_BIRDGO = Math.max(E.w_otpeli + 0.35, EN(17) - 0.3);
const T_AUT0 = E.w_viset - 0.1, T_AUT1 = EN(22) + 0.8;
const T_WIND = L(25) - 0.2;
const T_TEAR = [E.w_sorv1 - 0.05, E.w_sorv1 + 0.22, E.w_vetv - 0.15, E.w_vetv + 0.05, E.w_vetv + 0.22, E.w_vetv + 0.4];
const T_FIN = E.fin;
const HGX = 3425; // песочные часы висят на конце ветки

// центр вихря листьев: сплайн по ключам
const VK = [[T_TEAR[0], 2860, 360], [L(29), 2560, 230], [L(30), 2050, 140], [L(31), 1700, 230], [L(32), 1250, -150], [T_FIN, 950, -900], [TOTAL, 900, -1050]];
function catmull(p0, p1, p2, p3, u) { const u2 = u * u, u3 = u2 * u; return 0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3); }
function vortexC(t) {
  if (t <= VK[0][0]) return [VK[0][1], VK[0][2]];
  for (let i = 0; i < VK.length - 1; i++) {
    if (t <= VK[i + 1][0]) {
      const u = sstep(prog(t, VK[i][0], VK[i + 1][0])) * 0.5 + prog(t, VK[i][0], VK[i + 1][0]) * 0.5, a = VK[Math.max(0, i - 1)], b = VK[i], cc = VK[i + 1], d = VK[Math.min(VK.length - 1, i + 2)];
      return [catmull(a[1], b[1], cc[1], d[1], u), catmull(a[2], b[2], cc[2], d[2], u)];
    }
  }
  const l = VK[VK.length - 1]; return [l[1], l[2]];
}
const windAmt = (t) => win(t, T_WIND + 0.3, T_FIN, 0.6, 0.8) * (0.55 + 0.45 * win(t, E.w_vetry, EN(30), 0.3, 0.6));

// ---------- состояние героя ----------
function blinkAt(t, off) { const p = (t + off) % 3.7; return p < 0.15 ? Math.max(0.05, Math.abs(p - 0.075) / 0.075) : 1; }
function heroAt(i, t) {
  const h = HEROES[i], s = h.s, pet = 0.34 * s;
  const st = { s, kind: "maple", aut: h.aut, a: 0, pale: 0, lift: 1, face: { blink: blinkAt(t, h.ph), mouth: "smile", lx: 0, ly: 0 }, gloss: -1, vis: true };
  // сезон
  const aStart = T_AUT0 + i * 0.22;
  st.a = sstep(prog(t, aStart, aStart + 1.4)) * 0.85 + 0.15 * sstep(prog(t, T_AUT1, T_AUT1 + 2));
  if (h.joker) st.a = Math.max(st.a, 0.0);
  // качание на черешке
  let sw = 0.08 * Math.sin(t * 1.3 + h.ph) + 0.05 * Math.sin(t * 2.3 + h.ph * 2);
  // «Мы ж, лёгкое племя» — подпрыгивают и машут
  const jump = bump(t, E.w_my - 0.05 + i * 0.07, 0.6);
  sw += 0.35 * ring(t, E.w_my + i * 0.07, 10, 1.0);
  // «гостим» — поклон
  sw += 0.32 * bump(t, E.w_gostim - 0.2 + i * 0.1, 0.7) * (i % 2 ? -1 : 1);
  // «Играли с лучами» — удар солнечного зайчика
  const hitT = E.w_luch - 0.1 + i * ((EN(15) - E.w_luch + 0.2) / 6);
  sw += 0.45 * ring(t, hitT, 11, 0.9) * (i % 2 ? 1 : -1);
  // «желтеть» — повисли
  // ветер: дёргаются
  const wa = windAmt(t);
  sw += wa * (0.28 * Math.sin(t * 9 + h.ph * 3) + 0.14 * Math.sin(t * 17 + h.ph)) - wa * 0.25;
  sw += 0.5 * win(t, E.w_skoree - 0.1, T_TEAR[i], 0.15, 0.05) * Math.sin(t * 22 + h.ph);
  let [cx, cy] = hangCenter(h.ax, h.ay - jump * 26, s, pet, sw);
  let rot = Math.PI + sw;
  st.faceTilt = sw * 0.5;
  // лицо по строкам
  const f = st.face;
  if (t > E.w_my - 0.2 && t < L(10)) f.mouth = "grin", f.mo = 0.6;
  if (t > E.w_blest - 0.1 && t < L(11)) { f.mouth = "grin"; f.mo = 0.4; }
  if (t > E.w_vremya - 0.2 && t < L(12)) { f.lx = clamp((HGX - h.ax) / 350, -1, 1); f.ly = 0.3; f.mouth = "o"; f.mo = 0.3; }
  if (t > E.w_leto - 0.2 && t < L(15)) { f.ly = -0.6; f.lx = 0.7; f.mouth = "grin"; f.mo = 0.5; }
  if (t > L(15) && t < L(16)) { f.mouth = "grin"; f.mo = 0.7; f.lx = Math.sin(t * 6) * 0.8; }
  if (t > L(16) && t < L(17)) f.mouth = "smile";
  if (t >= L(17) && t < L(21)) { f.mouth = "flat"; f.lx = 0.6; f.ly = -0.3; f.brow = 0.1; }
  if (t >= L(21) && t < L(23)) { f.lx = Math.sin((t - L(21)) * 2.6 + i) > 0 ? 0.9 : -0.9; f.mouth = t > E.w_zhelt2 - 0.2 ? "o" : "sad"; f.mo = 0.3; f.brow = 0.5; }
  if (t >= L(23) && t < L(25)) { f.lx = 0.8; f.ly = -0.9; f.mouth = t > E.w_ulet - 0.15 ? "grin" : "o"; f.mo = 0.5; f.brow = t > E.w_ulet - 0.15 ? -0.4 : 0.5; }
  if (t >= L(25)) { f.mouth = "o"; f.mo = 0.6; f.lx = 0.9; f.brow = 0.6; }
  if (t >= E.w_skoree - 0.1 && t < T_TEAR[i]) { f.blink = 0; f.mouth = "grin"; f.mo = 0.3; f.brow = -0.5; }
  // роса — капля на лицо третьего
  if (i === 3 && t > T_SPLASH - 0.05 && t < T_SPLASH + 0.6) { f.blink = 0; f.mouth = "o"; f.mo = 0.8; }
  if (i === 3 && t >= T_SPLASH + 0.6 && t < L(17)) { f.mouth = "grin"; f.mo = 0.8; }
  // блеск
  if (t > E.w_blest - 0.3 && t < E.w_blest + 1.0) st.gloss = prog(t, E.w_blest - 0.3 + i * 0.08, E.w_blest + 0.5 + i * 0.08);
  if (t > E.w_krase - 0.3 && t < E.w_krase + 1.0) st.gloss = prog(t, E.w_krase - 0.25 + i * 0.06, E.w_krase + 0.55 + i * 0.06);
  // «в красе» — распушились
  st.s = s * (1 + 0.1 * bump(t, E.w_krase - 0.15 + i * 0.05, 0.8));
  // шутник: прилетает из леса
  if (h.joker && t < T_JKLAND + 0.6) {
    const J = jokerAt(t);
    if (J) { st.cx = J.x; st.cy = J.y; st.rot = J.rot; st.face = J.face; st.faceTilt = J.rot * 0.3; st.free = true; st.petBend = 0.3; st.lift = 1.6; st.attachBlend = J.attach; return finishHero(st, i, t, cx, cy, rot); }
  }
  st.cx = cx; st.cy = cy; st.rot = rot;
  return finishHero(st, i, t, cx, cy, rot);
}
// после отрыва — полёт в вихре
function flightPos(i, t, n = 6, rad = 1) {
  const td = T_TEAR[i % 6] + (i >= 6 ? 0.1 + (i % 5) * 0.12 : 0);
  const [vx, vy] = vortexC(t);
  const th = i * (TAU / n) + (t - T_TEAR[0]) * 2.1 + (i >= 6 ? 0.4 : 0);
  const R = (200 + 50 * Math.sin(i * 1.7)) * rad * (0.75 + 0.25 * Math.sin(t * 0.9 + i));
  return [vx + Math.cos(th) * R, vy + Math.sin(th) * R * 0.55 + Math.sin(t * 3 + i) * 18, td];
}
function finishHero(st, i, t, cx, cy, rot) {
  const td = T_TEAR[i];
  if (t >= td) {
    const u = t - td, h = HEROES[i];
    // отрыв: рывок по ветру влево-вверх
    const bx = cx - 520 * u * u - 160 * u, by = cy - 180 * u + 40 * Math.sin(u * 6);
    const [fx, fy] = flightPos(i, t);
    const k = sstep(prog(t, td + 0.25, td + 1.5));
    st.cx = lerp(bx, fx, k); st.cy = lerp(by, fy, k);
    st.rot = lerp(Math.PI + 0.6 * Math.sin(u * 8), 0.5 * Math.sin(t * 2.2 + i) + 0.25 * Math.sin(t * 5.1 + i * 2), sstep(prog(t, td, td + 0.9)));
    st.faceTilt = st.rot * 0.25;
    st.free = true; st.lift = 1.7;
    const f = st.face; f.blink = blinkAt(t, h.ph); f.brow = 0.3; f.lx = -0.6; f.ly = -0.2;
    f.mouth = "grin"; f.mo = 0.7;
    if (t < td + 0.35) { f.mouth = "o"; f.mo = 1; f.blink = 1; f.brow = 1; }
  }
  return st;
}
// путь шутника в первой строфе
const FIR_X = 860, FIR_H = 640, FIR_W = 440;
const PATCH = [FIR_X + FIR_W * 0.36, GY - FIR_H * 0.4]; // где лист трётся о бок ели
function jokerAt(t) {
  if (t < T_JK0) return null;
  const h = HEROES[2], pet = 0.34 * h.s;
  const f = { blink: blinkAt(t, 0.4), mouth: "grin", mo: 0.5, lx: -0.8, ly: 0 };
  let x, y, rot, attach = 0;
  if (t < T_JKHIT) { // влетает справа к ели
    const u = easeInOut(prog(t, T_JK0, T_JKHIT));
    x = lerp(1560, PATCH[0] + 62, u); y = lerp(330, PATCH[1], u) - 90 * Math.sin(Math.PI * u); rot = -0.5 + 0.3 * Math.sin(u * 7);
  } else if (t < T_JKHIT + 0.55) { // трётся о бок ели — бок желтеет
    const u = t - T_JKHIT;
    x = PATCH[0] + 58 + 5 * Math.sin(u * 32); y = PATCH[1] + 26 * Math.sin(u * 10); rot = -0.75 + 0.18 * Math.sin(u * 20);
    f.lx = -1; f.mouth = "grin"; f.mo = 0.5;
  } else if (t < T_JKOUT) { // отскакивает и хихикает
    const t1 = T_JKHIT + 0.55, u = t - t1, k = spr(springSoft, t, t1);
    x = lerp(PATCH[0] + 58, 1150, k); y = lerp(PATCH[1], 450, k) + 10 * Math.sin(u * 5);
    rot = -0.75 * (1 - k) + 0.25 * Math.sin(u * 3) + 0.2 * Math.sin(u * 13) * win(t, T_SHAKE, T_JKOUT, 0.1, 0.1);
    f.lx = -1; f.mouth = t > T_SHAKE ? "grin" : "smile"; f.mo = 0.8;
  } else { // летит к клёну и прицепляется
    const u = prog(t, T_JKOUT, T_JKLAND), e = easeInOut(u);
    const [hx, hy] = hangCenter(h.ax, h.ay, h.s, pet, 0);
    x = lerp(1110, hx, e); y = lerp(470, hy, e) - 260 * Math.sin(Math.PI * e);
    rot = lerp(0.6, Math.PI, sstep(prog(t, T_JKLAND - 0.45, T_JKLAND))) + 0.4 * Math.sin(u * 9) * (1 - u);
    attach = sstep(prog(t, T_JKLAND - 0.3, T_JKLAND));
    f.lx = 1; f.mouth = "grin"; f.mo = 0.6;
    if (t > T_JKLAND) { const k = ring(t, T_JKLAND, 10, 0.7); rot = Math.PI + 0.5 * k; const c2 = hangCenter(h.ax, h.ay, h.s, pet, 0.5 * k); x = c2[0]; y = c2[1]; }
  }
  return { x, y, rot, face: f, attach };
}

// ёж: 0 — клубок, 0..0.5 — сплющивается (0,2 с), 0.5..1 — раскрылся и пружинит (1 с)
function hogOpen(t) { const d = t - T_UNROLL; return d <= 0 ? 0 : d < 0.2 ? (d / 0.2) * 0.5 : 0.5 + 0.5 * clamp(d - 0.2, 0, 1); }
const hogSniff = (t) => (t > T_UNROLL + 0.6 ? Math.max(0, Math.sin(t * 13)) * (Math.sin(t * 1.7) > 0.2 ? 1 : 0) : 0);
// ---------- камера: плавное следование за целями планов ----------
const SHOTS = [
  [0, 1350, 250, 0.82],
  [E.V0 - 0.5, 900, 560, 0.95],
  [T_SLEEP - 0.3, 870, 520, 1.18],
  [E.w_zelen - 0.9, 880, 470, 1.55],
  [E.w_igly - 0.95, 1000, 790, 1.4],
  [L(7) - 0.4, 980, 560, 1.15],
  [T_JKOUT, 2860, 440, 0.95],
  [E.w_vremya - 0.4, 2820, 480, 1.1],
  [L(13) - 0.3, 2960, 400, 0.82],
  [L(15) - 0.1, 2880, 455, 1.0],
  [L(16) - 0.15, 2975, 565, 1.5],
  [L(17) - 0.25, 2950, 405, 0.84],
  [L(19) - 0.1, 3060, 385, 0.86],
  [L(21) - 0.2, 2870, 545, 1.25],
  [L(23) - 0.1, 2960, 430, 0.95],
  [L(25) - 0.25, 2980, 400, 0.82],
  [L(27) - 0.2, 2860, 440, 0.92],
];
const T_FOLLOW = L(29) - 0.6;
function shotTarget(t) {
  if (t >= T_FOLLOW) { const [x, y] = vortexC(t + 0.4); return [x, y + 120, lerp(0.88, 0.8, prog(t, L(31), T_FIN))]; }
  let s = SHOTS[0]; for (const k of SHOTS) if (t >= k[0]) s = k; return [s[1], s[2], s[3]];
}
const CAM = (() => {
  // два последовательных критически задемпфированных фильтра: цель плана сглаживается, скорость растёт плавно, без рывка
  const dt = 1 / 120, n = Math.ceil(TOTAL / dt) + 2, out = new Float32Array(n * 3);
  const s0 = shotTarget(0);
  let a = [s0[0], s0[1], Math.log(s0[2])], av = [0, 0, 0], p = a.slice(), pv = [0, 0, 0];
  const cap = 46 * 30; // не быстрее ~46 px экрана за кадр
  for (let i = 0; i < n; i++) {
    const t = i * dt, tg = shotTarget(t), T = [tg[0], tg[1], Math.log(tg[2])];
    const o1 = t >= T_FOLLOW ? 5 : 5.5, o2 = t >= T_FOLLOW ? 3.4 : 4.2;
    for (let k = 0; k < 3; k++) { av[k] += (o1 * o1 * (T[k] - a[k]) - 2 * o1 * av[k]) * dt; a[k] += av[k] * dt; }
    for (let k = 0; k < 3; k++) { pv[k] += (o2 * o2 * (a[k] - p[k]) - 2 * o2 * pv[k]) * dt; }
    const z = Math.exp(p[2]), sp = Math.hypot(pv[0], pv[1]) * z; if (sp > cap) { pv[0] *= cap / sp; pv[1] *= cap / sp; }
    for (let k = 0; k < 3; k++) p[k] += pv[k] * dt;
    out[i * 3] = p[0]; out[i * 3 + 1] = p[1]; out[i * 3 + 2] = Math.exp(p[2]);
  }
  return { out, dt, n };
})();
function camAt(t) {
  const f = clamp(t / CAM.dt, 0, CAM.n - 2), i = Math.floor(f), u = f - i, o = CAM.out;
  return [lerp(o[i * 3], o[i * 3 + 3], u), lerp(o[i * 3 + 1], o[i * 3 + 4], u), lerp(o[i * 3 + 2], o[i * 3 + 5], u)];
}
let CAMX = 0, CAMY = 0;
function setLayer(c, p) { c.setTransform(CAMZ, 0, 0, CAMZ, W / 2 - CAMX * p * CAMZ, H / 2 - CAMY * p * CAMZ); }
const toScreen = (x, y) => [W / 2 + (x - CAMX) * CAMZ, H / 2 + (y - CAMY) * CAMZ];

// ---------- небо по сезонам ----------
const SKY = [
  [0, "#b7cdd8", "#e4e8de"], [E.V0 - 0.3, "#aec3cd", "#e3e6df"], [L(9) - 0.6, "#98c6e0", "#e9efdc"], [T_SUN, "#7fbde3", "#f5edcf"],
  [E.w_pobl - 0.2, "#b3bfc3", "#e5dcc8"], [T_WIND, "#97a8b4", "#d8d2c3"], [L(32) - 0.3, "#97a8b4", "#d8d2c3"], [T_FIN - 0.6, "#e7a47c", "#f6d49c"],
];
function skyAt(t) {
  let i = 0; for (let k = 0; k < SKY.length; k++) if (t >= SKY[k][0]) i = k;
  if (i === 0) return [SKY[0][1], SKY[0][2]];
  const u = sstep(prog(t, SKY[i][0], SKY[i][0] + 1.4));
  return [mixHex(SKY[i - 1][1], SKY[i][1], u), mixHex(SKY[i - 1][2], SKY[i][2], u)];
}

// ---------- фон ----------
const HILLS = {};
// холм, который к краям уходит вниз за кадр — без вертикального среза
function taperHill(x0, x1, y, amp, seed, step) {
  const r = mulberry32(seed), pts = [[x0 - 400, 3000]];
  const ph1 = r() * TAU, ph2 = r() * TAU;
  for (let x = x0 - 400; x <= x1 + 400; x += step) {
    const tl = clamp((x0 + 200 - x) / 600, 0, 1), tr = clamp((x - (x1 - 350)) / 700, 0, 1);
    pts.push([x, y - amp * (0.65 * Math.sin(x * 0.0026 + ph1) + 0.35 * Math.sin(x * 0.007 + ph2)) + 420 * (tl * tl + tr * tr)]);
  }
  pts.push([x1 + 400, 3000]);
  return polyPath(pts);
}
function hills() {
  if (HILLS.far) return HILLS;
  HILLS.far = hillPath(-2000, 6000, 760, 60, 5, 50);
  HILLS.mid = hillPath(-2000, 6000, 830, 34, 9, 44);
  HILLS.ground = hillPath(-1500, 5000, GY, 10, 13, 36);
  HILLS.snow = taperHill(-200, 1900, GY - 26, 18, 17, 30);
  HILLS.drift = taperHill(-200, 1900, GY + 34, 22, 19, 26);
  return HILLS;
}
const SKYCLOUDS = [[600, -60, 120, 1], [1500, -140, 150, 2], [2350, -40, 110, 3], [3300, -180, 160, 4], [-200, -260, 130, 5], [900, -520, 170, 6], [2000, -640, 140, 7], [2900, -900, 180, 8], [1300, -1050, 150, 9]];
function drawBackground(c, t) {
  const [top, bot] = skyAt(t);
  c.setTransform(1, 0, 0, 1, 0, 0);
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, top); g.addColorStop(1, bot);
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  // бумажные облака неба
  setLayer(c, 0.4);
  const ca = 1 - sstep(prog(t, T_FIN - 0.8, T_FIN + 0.2)); // в финале облака уходят из-за названия
  if (ca > 0.01) { c.save(); c.globalAlpha = ca; for (const [x, y, s, sd] of SKYCLOUDS) drawCloud(c, x + t * 6 * (sd % 3 + 1) - 200, y, s, { seed: sd, lift: 0.5, col: mixHex("#f8f3e8", top, 0.18) }); c.restore(); }
}
function drawHills(c, t) {
  const Hh = hills();
  const aut = sstep(prog(t, E.w_pobl - 0.2, E.w_pobl + 1.5));
  const winter = 1 - sstep(prog(t, T_WOFF, T_WOFF + 0.4)); // снег в бору только в первой строфе
  setLayer(c, 0.55); cut(c, Hh.far, mixHex(mixHex("#a99a72", "#b08a58", aut), "#c9c9c2", winter * 0.6), { lift: 0.8 });
  // дальние деревья среднего плана
  setLayer(c, 0.78);
  const r = mulberry32(5);
  for (let i = 0; i < 26; i++) {
    const x = -600 + i * 190 + r() * 60, h = 170 + r() * 90, isFir = x < 1500;
    if (isFir) drawFir(c, x, 800, h, h * 0.62, { seed: 200 + i, tiers: 4, tone: "#3e5a48", tone2: "#567a60", snow: winter * 0.9 });
    else { // круглые кроны
      const col = mixHex("#7aa356", ["#d29a3a", "#c4612f", "#e0b046"][i % 3], aut);
      c.save(); c.translate(x, 800);
      cut(c, polyPath([[-8, 0], [8, 0], [6, -h * 0.5], [-6, -h * 0.5]]), "#6e4a2e", { lift: 0.6 });
      cut(c, tuftPath(h * 0.36, h * 0.3, 300 + i), col, { lift: 0.7 }); c.restore();
      c.save(); c.translate(x, 800 - h * 0.62); c.restore();
    }
  }
  setLayer(c, 0.88); cut(c, Hh.mid, mixHex(mixHex("#93a167", "#a8834e", aut), "#d7d7cf", winter * 0.7), { lift: 0.9 });
}

// ---------- основной план ----------
const FOREST = [
  { type: "fir", x: 300, h: 430, w: 300, seed: 2 },
  { type: "fir", x: 560, h: 520, w: 360, seed: 4 },
  { type: "fir", x: FIR_X, h: FIR_H, w: FIR_W, seed: 6, hero: true },
  { type: "pine", x: 1240, h: 720, seed: 8, hero: true },
  { type: "fir", x: 1530, h: 470, w: 330, seed: 10 },
];
function treeFace(t, isFir) {
  const f = { blink: 1, mouth: "flat", lx: 0, ly: 0 };
  if (t < T_POP - 0.05) { f.sleep = true; f.mouth = "flat"; }
  else if (t < T_SLEEP) { f.mouth = "o"; f.mo = 0.4; f.brow = 0.5; f.ly = -0.3; f.blink = blinkAt(t, isFir ? 0.2 : 1.1); if (t > E.w_snega) { f.ly = -0.8; f.brow = 0.8; } }
  else if (t < L(29)) { f.sleep = true; f.mouth = "flat"; }
  if (isFir && t > T_YAWN - 0.1 && t < T_YAWN + 1.1) { f.mouth = "yawn"; f.mo = bump(t, T_YAWN - 0.1, 1.2) * 1.2; f.sleep = true; }
  if (isFir && t > T_JKHIT && t < T_SHAKE) { f.sleep = false; f.blink = 0.35; f.mouth = "flat"; f.brow = -0.6; f.lx = 1; }
  if (t > L(31) - 0.3) { const u = prog(t, L(31) - 0.3, L(31)); f.sleep = u < 0.5; f.blink = 1; f.mouth = "o"; f.mo = 0.7; f.brow = 0.9; f.ly = -1; f.lx = isFir ? 0.4 : -0.3; }
  return f;
}
function drawForest(c, t) {
  if (CAMX * 1 - W / 2 / CAMZ > 2000) return;
  const winter = 1 - sstep(prog(t, T_WOFF, T_WOFF + 0.4));
  for (const T of FOREST) {
    const k0 = t < T_POP ? 0.72 : 0.72 + 0.28 * spr(springBounce, t, T_POP + T.seed * 0.012);
    const snow = winter * sstep(prog(t, T_BLIZ + T.seed * 0.06, T_BLIZ + 1.5 + T.seed * 0.06));
    const shake = (T.hero ? ring(t, T_SHAKE, 14, 0.9) * 1.5 : 0) + ring(t, T_POP + T.seed * 0.012, 12, 0.5) * 0.6 + windAmt(t) * 0.3 * Math.sin(t * 6 + T.seed);
    const face = T.hero ? treeFace(t, T.type === "fir") : null;
    if (T.type === "fir") {
      const o = { k: k0, snow, shake, seed: T.seed, face, faceY: 0.42 };
      if (T.hero) {
        o.blanket = winter * sstep(prog(t, T_SLEEP - 0.2, T_SLEEP + 0.7)) * (1 - sstep(prog(t, L(6) - 0.3, L(6) + 0.3)));
        o.yellow = prog(t, T_JKHIT + 0.05, T_JKHIT + 0.6); o.yellowGone = sstep(prog(t, T_SHAKE + 0.05, T_SHAKE + 0.45));
        o.yx = PATCH[0] - FIR_X; o.yy = PATCH[1] - GY;
      }
      drawFir(c, T.x, GY + 6, T.h, T.w, o);
    } else drawPine(c, T.x, GY + 6, T.h, { k: k0, snow, shake, seed: T.seed, face });
  }
}
// сугробы и земля
function drawGround(c, t) {
  const Hh = hills(), aut = sstep(prog(t, E.w_pobl - 0.2, E.w_pobl + 1.5));
  const winter = 1 - sstep(prog(t, T_WOFF, T_WOFF + 0.4));
  cut(c, Hh.ground, mixHex("#8e9a58", "#9a7a46", aut), { lift: 1 });
  // трава у клёна: бумажные травинки
  const r = mulberry32(31);
  c.save();
  for (let i = 0; i < 60; i++) {
    const x = 1950 + i * 30 + r() * 20, hh = 26 + r() * 30, lean = (r() - 0.5) * 0.5 - windAmt(t) * 0.5 * (0.6 + 0.4 * Math.sin(t * 7 + i));
    c.fillStyle = mixHex(["#5f8f3a", "#77a548", "#4f7a32"][i % 3], ["#c79a3c", "#b7782e", "#d0a850"][i % 3], aut);
    c.beginPath(); c.moveTo(x - 6, GY + 4); c.quadraticCurveTo(x + lean * hh * 0.5, GY - hh * 0.6, x + lean * hh, GY - hh); c.lineTo(x + 6, GY + 4); c.closePath(); c.fill();
  }
  c.restore();
  if (winter > 0.01) { c.save(); c.globalAlpha = winter; cut(c, Hh.snow, "#f4f1ea", { lift: 0.9, edgeCol: "rgba(255,255,255,0.9)" }); c.restore(); }
}
function drawGroundFront(c, t) {
  const winter = 1 - sstep(prog(t, T_WOFF, T_WOFF + 0.4));
  if (winter > 0.01) { c.save(); c.globalAlpha = winter; cut(c, hills().drift, "#f8f6f0", { lift: 1.2, edgeCol: "rgba(255,255,255,0.95)" }); c.restore(); }
}

// клён: ствол и ветки
function drawMaple(c, t) {
  const wa = windAmt(t);
  // ствол
  const trunk = polyPath([[2150, GY + 10], [2280, GY + 10], [2262, 200], [2250, -400], [2190, -400], [2178, 200]]);
  cut(c, trunk, (cc) => { const g = cc.createLinearGradient(2150, 0, 2280, 0); g.addColorStop(0, "#5e4130"); g.addColorStop(0.5, "#86634a"); g.addColorStop(1, "#4e3626"); return g; }, { lift: 1.2 });
  c.save(); c.clip(trunk); c.strokeStyle = "rgba(40,24,14,0.4)"; c.lineWidth = 3;
  const r = mulberry32(3); for (let i = 0; i < 20; i++) { const y = GY - r() * 1300, x = 2180 + r() * 80; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 4, y - 40 - r() * 40); c.stroke(); }
  c.restore();
  // ветки: толщина сужается, ветер качает конец
  const sway = wa * 10 * Math.sin(t * 5);
  const branch = (x0, x1, yf, w0, w1) => {
    const top = [], bot = [];
    for (let i = 0; i <= 24; i++) { const u = i / 24, x = lerp(x0, x1, u), y = yf(x) + sway * u * u, w = lerp(w0, w1, u); top.push([x, y - w / 2]); bot.unshift([x, y + w / 2]); }
    cut(c, polyPath(top.concat(bot)), "#6e4f38", { lift: 1.1 });
  };
  branch(2240, 3170, (x) => 80 + 10 * Math.sin(x / 140) - (x - 2240) * 0.02, 22, 6);
  branch(2240, BR1[0] + 40, branchY, 42, 9);
  // черенки-сучки к героям
  c.strokeStyle = "#6e4f38"; c.lineCap = "round"; c.lineWidth = 8;
  for (const h of HEROES) { const by = branchY(h.ax - 18) + sway * ((h.ax - 2240) / 1200) ** 2; c.beginPath(); c.moveTo(h.ax - 18, by); c.quadraticCurveTo(h.ax - 4, by + 4, h.ax, h.ay - 2); c.stroke(); }
}
function smallLeafAt(j, t) {
  const L1 = SMALL[j], wa = windAmt(t);
  const sw = L1.sw * 0.4 + 0.07 * Math.sin(t * 1.5 + L1.ph) + wa * (0.3 * Math.sin(t * 10 + L1.ph) - 0.3);
  const pet = 0.34 * L1.s, ay = L1.ay + (wa * 10 * Math.sin(t * 5)) * ((L1.ax - 2240) / 1200) ** 2;
  const rot0 = L1.up ? sw * 0.5 + Math.PI * 0.85 + (j % 2 ? 0.5 : -0.5) : Math.PI + sw;
  let [cx, cy] = [L1.ax - (-(HY * L1.s + pet)) * Math.sin(rot0), ay + (-(HY * L1.s + pet)) * Math.cos(rot0)];
  const a = sstep(prog(t, T_AUT0 + 0.1 * (j % 7), T_AUT0 + 1.6 + 0.1 * (j % 7)));
  const st = { cx, cy, rot: rot0, s: L1.s, a, aut: L1.aut, kind: "maple", lift: 1, gloss: -1 };
  const td = T_TEAR[j % 6] + 0.08 + (j % 4) * 0.1;
  if (t >= td) {
    const u = t - td, bx = cx - 560 * u * u - 200 * u, by = cy - 160 * u;
    const [fx, fy] = flightPos(j + 6, t, 12, 1.7);
    const k = sstep(prog(t, td + 0.3, td + 1.6));
    st.cx = lerp(bx, fx, k); st.cy = lerp(by, fy, k); st.rot = rot0 + u * 5 + Math.sin(t * 3 + j); st.lift = 1.6; st.free = true;
    if (t > T_FIN - 0.3) { // разлетаются из кадра, чтобы не лезть на название
      const v = t - (T_FIN - 0.3), [vx, vy] = vortexC(t), dx = st.cx - vx, dy = st.cy - vy, d = Math.hypot(dx, dy) || 1;
      st.cx += (dx / d) * (900 * v * v + 300 * v); st.cy += (dy / d) * (700 * v * v + 200 * v);
    }
  }
  return st;
}
function drawLeafState(c, st) {
  c.save(); c.translate(st.cx, st.cy); c.rotate(st.rot); c.translate(0, HY * st.s);
  drawLeafLocal(c, st.kind, st.s, { a: st.a, aut: st.aut, pale: st.pale, lift: st.lift, petBend: st.petBend ?? 0.12, gloss: st.gloss });
  c.restore();
  if (st.face) drawFace(c, st.cx, st.cy, st.s * 0.95, st.face, st.faceTilt ?? 0);
}

// ---------- частицы ----------
function drawSnowfall(c, t) {
  const amt = win(t, T_BLIZ, T_BLIZE, 0.4, 0.8) + 0.25 * win(t, E.V0 - 0.6, T_JKOUT, 0.6, 0.5);
  if (amt <= 0.01 || CAMX > 2100) return;
  c.setTransform(1, 0, 0, 1, 0, 0);
  const n = Math.round(150 * amt), r = mulberry32(5);
  for (let i = 0; i < n; i++) {
    const sp = 260 + r() * 340, sx = r() * 2400, sy = r() * 1300, sz = 4 + r() * 10, wob1 = r() * 6;
    const x = ((sx - t * sp * 0.9 - (CAMX - 900) * CAMZ * 0.9) % 2400 + 2400) % 2400 - 240, y = ((sy + t * sp + (-CAMY + 560) * CAMZ * 0.9) % 1300 + 1300) % 1300 - 110;
    c.save(); c.translate(x + Math.sin(t * 2 + wob1) * 14, y); c.rotate(t * 1.5 + wob1);
    c.fillStyle = "rgba(60,70,90,0.18)"; c.fillRect(-sz / 2 + 3, -sz / 2 + 4, sz, sz * 0.8);
    c.fillStyle = "#fbfaf6"; c.beginPath(); c.moveTo(-sz / 2, -sz * 0.3); c.lineTo(sz * 0.1, -sz / 2); c.lineTo(sz / 2, sz * 0.1); c.lineTo(-sz * 0.1, sz / 2); c.closePath(); c.fill();
    c.restore();
  }
}
function drawWindStrips(c, t) {
  const amt = windAmt(t); if (amt <= 0.01) return;
  c.setTransform(1, 0, 0, 1, 0, 0);
  const r = mulberry32(17), n = Math.round(14 * amt);
  for (let i = 0; i < n; i++) {
    const y0 = 120 + r() * 680, len = 260 + r() * 360, sp = 1700 + r() * 900, ph = r() * 10, x = ((W + 600 - ((t + ph) * sp) % (W + 1400)) + 0);
    c.save(); c.globalAlpha = 0.75 * amt;
    const pts = [];
    for (let k = 0; k <= 16; k++) { const u = k / 16; pts.push([x + u * len, y0 + Math.sin(u * 7 + t * 9 + ph) * 12]); }
    const top = pts.map(([a, b], k) => [a, b - 4 - 3 * Math.sin((k / 16) * Math.PI)]), bot = pts.map(([a, b], k) => [a, b + 4 + 3 * Math.sin((k / 16) * Math.PI)]).reverse();
    const p = polyPath(top.concat(bot));
    c.fillStyle = "rgba(60,40,20,0.12)"; c.save(); c.translate(4, 6); c.fill(p); c.restore();
    c.fillStyle = "#f7f1e2"; c.fill(p); c.restore();
  }
}
function star4(c, x, y, s, a) {
  c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = "#fff6cf";
  c.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? s * 0.28 : s, an = (i / 8) * TAU; c.lineTo(Math.cos(an) * r, Math.sin(an) * r); } c.closePath(); c.fill();
  c.restore();
}
function drawSparkles(c, t, at, xs) {
  for (let i = 0; i < xs.length; i++) {
    const u = prog(t, at + i * 0.07, at + 0.8 + i * 0.07); if (u <= 0 || u >= 1) continue;
    const s = 26 * Math.sin(Math.PI * u);
    star4(c, xs[i][0], xs[i][1] - u * 30, s, u * 2);
  }
}

// ---------- сцена целиком ----------
function drawWorld(c, t) {
  setLayer(c, 1);
  // солнце за холмами
  const sunUp = spr(springSoft, t, T_SUN), sunX = 3600, sunY = lerp(820, 30, sunUp);
  const pale = sstep(prog(t, E.w_pobl - 0.15, E.w_pobl + 0.9)), rays = sunUp * (1 + 0.35 * win(t, L(15), EN(15), 0.3, 0.3)) * (1 - 0.85 * pale);
  if (t > T_SUN - 0.1 && sunUp > 0.01) {
    const sf = { blink: blinkAt(t, 2.2), mouth: pale > 0.5 ? "flat" : "smile", lx: -0.6, ly: 0.3 };
    drawSun(c, sunX, sunY, 110, rays * (1 - windAmt(t) * 0.6), Math.min(1, pale + windAmt(t) * 0.3), t, sf);
  }
  drawHills(c, t);
  setLayer(c, 1);
  drawGround(c, t);
  drawForest(c, t);
  // з-з-з над спящей елью
  if (t > T_SLEEP && t < L(6) + 0.5) {
    c.save(); c.font = '700 64px "CapS", serif'; c.textAlign = "center";
    for (let i = 0; i < 3; i++) {
      const u = ((t - T_SLEEP) * 0.55 + i / 3) % 1;
      c.globalAlpha = Math.sin(Math.PI * u) * win(t, T_SLEEP, L(6) + 0.5, 0.3, 0.4);
      const x = FIR_X - 170 - u * 110 + Math.sin(u * 6) * 14, y = GY - FIR_H * 0.6 - u * 200;
      c.fillStyle = "rgba(52,30,12,0.25)"; c.fillText("з", x + 4, y + 5); c.fillStyle = "#f8f4ea"; c.fillText("з", x, y);
    }
    c.restore();
  }
  // ель стряхивает жёлтые иголки
  if (t > T_SHAKE && t < T_SHAKE + 1.4) {
    const r = mulberry32(55);
    for (let i = 0; i < 30; i++) {
      const sx = PATCH[0] - 30 - r() * 230, sy = PATCH[1] - 120 + r() * 240, dl = r() * 0.25, v = t - T_SHAKE - dl; if (v <= 0) continue;
      const yy = sy + 60 * v + 520 * v * v, a = 1 - clamp((v - 0.8) / 0.4, 0, 1); if (yy > GY + 10 || a <= 0) continue;
      c.save(); c.translate(sx + (r() - 0.5) * 120 * v + 14 * Math.sin(v * 9 + i), yy); c.rotate(r() * 3 + v * 7); c.globalAlpha = a;
      c.fillStyle = i % 3 ? "#e9b437" : "#d4922a"; c.fillRect(-11, -2, 22, 4); c.restore();
    }
  }
  // пыль, когда ель зевает
  if (t > T_YAWN && t < T_YAWN + 1.6) {
    for (let i = 0; i < 9; i++) {
      const u = prog(t, T_YAWN + i * 0.05, T_YAWN + 1.2 + i * 0.05); if (u <= 0 || u >= 1) continue;
      const a = -1.2 + (i / 9) * 2.4, d = 40 + u * 170;
      c.fillStyle = `rgba(150,140,125,${0.55 * (1 - u)})`; circle(c, FIR_X + Math.cos(a) * d, GY - FIR_H * 0.38 + Math.sin(a) * d * 0.6 - u * 40, 10 + u * 22); c.fill();
    }
  }
  drawGroundFront(c, t);
  // ёж — перед сугробом, лапки на снегу
  if (t > T_HOG0 && t < T_JKOUT + 1.5) {
    const u = easeOut(prog(t, T_HOG0, T_HOG1)), x = lerp(1640, 1080, u), R = 78;
    drawHedgehog(c, x, GY + 16 - R * 0.84, R, -(x - 1640) / R, hogOpen(t), { blink: blinkAt(t, 0.9), sniff: hogSniff(t) }, -1);
  }
  // цветы
  const FL = [[2400, "#e86a7a"], [2520, "#f2f2f0"], [2680, "#7a8ae8"], [2840, "#f2c23a"], [2990, "#e86a7a"], [3150, "#f2f2f0"], [3290, "#b47ae0"], [3420, "#f2c23a"]];
  FL.forEach(([x, col], i) => {
    const bloom = prog(t, E.w_blest - 0.1 + i * 0.06, E.w_blest + 0.9 + i * 0.06), wilt = sstep(prog(t, E.w_otcv - 0.2 + i * 0.08, E.w_otcv + 1.0 + i * 0.08));
    drawFlower(c, x, GY + 8, 175 + (i % 3) * 30, col, bloom, wilt, 60 + i);
  });
  drawMaple(c, t);
  // мелкие листья
  for (let j = 0; j < SMALL.length; j++) drawLeafState(c, smallLeafAt(j, t));
  // зефиры — облачка-ветерки
  if (t > T_SUN && t < E.w_ushli + 3) {
    for (let i = 0; i < 3; i++) {
      const app = spr(springPop, t, T_SUN + 0.4 + i * 0.25); if (app <= 0) continue;
      const go = easeIn(prog(t, E.w_zef - 0.1 + i * 0.15, E.w_ushli + 1.4 + i * 0.15));
      const x = 2830 + i * 165 + go * 1100, y = -95 + i * 40 + Math.sin(t * 1.6 + i) * 12 - go * 260;
      const f = { blink: blinkAt(t, i), mouth: go > 0.05 ? "o" : "smile", mo: 0.3, lx: go > 0.05 ? 1 : -0.6, ly: 0.2 };
      drawCloud(c, x, y, 70 * app, { seed: 40 + i, face: f, cheeks: true, puff: Math.sin(t * 4 + i) * 0.5 + 0.5 });
    }
  }
  // птичка: прилетает справа, садится клювом к листьям, поёт и улетает вверх-влево
  if (t > T_SUN - 0.5 && t < T_BIRDGO + 3.5) {
    const TA = T_SUN - 0.5, TL = T_SUN + 0.45, PY = branchY(3360) - 46;
    let bx = 3360, by = PY, fly = 0, flap = 0, sing = 0, sc = 96;
    if (t < TL) { const u = easeOut(prog(t, TA, TL)); bx = lerp(4300, 3360, u); by = lerp(-260, PY, u) - 50 * Math.sin(Math.PI * u); fly = t < TL - 0.07 ? 1 : 0; flap = t * 18; }
    else if (t < T_BIRDGO) { sing = t > TL + 0.15 && t < E.w_otpeli + 0.1 ? 0.5 + 0.5 * Math.sin(t * 14) : 0; by -= 4 * Math.abs(Math.sin(t * 7)) * (sing > 0 ? 1 : 0); }
    else { const u = t - T_BIRDGO; fly = 1; flap = u * 18; bx -= 380 * u + 120 * u * u; by -= 420 * u - 30 * Math.sin(u * 4); sc = 96 * (1 - 0.35 * clamp(u / 3, 0, 1)); }
    drawBird(c, bx, by, sc, flap, fly, -1, { sing });
    // ноты
    if (t < E.w_otpeli + 0.5) for (let i = 0; i < 4; i++) {
      const u = ((t - T_SUN - 0.6) * 0.7 + i / 4) % 1;
      if (t - (T_SUN + 0.6) < i * 0.3) continue;
      c.save(); c.globalAlpha = Math.sin(Math.PI * u) * (1 - prog(t, E.w_otpeli, E.w_otpeli + 0.5)); c.font = '700 54px "CapS", serif'; c.fillStyle = "#3a2616";
      c.fillText(i % 2 ? "♪" : "♫", bx - 40 - u * 150 + Math.sin(u * 8) * 16, by - 70 - u * 150); c.restore();
    }
  }
  // стайка далеко в небе — «за ними»
  if (t > L(23) - 0.5 && t < L(25) + 1) {
    const u = t - (L(23) - 0.5);
    for (let i = 0; i < 3; i++) drawBird(c, 2700 + i * 80 + u * 130, -10 - i * 40 - u * 40, 32, u * 16 + i, 1, 1);
  }
  // большое облако-ветер
  if (t > T_WIND - 0.2) {
    const k = spr(springSoft, t, T_WIND), x = lerp(4300, 3560, k) + Math.sin(t * 1.4) * 10, y = -40;
    const puff = 0.5 + 0.5 * Math.sin(t * 7);
    const f = { blink: blinkAt(t, 1.4), mouth: "o", mo: 0.6 + 0.4 * puff, brow: -0.4, lx: -1 };
    if (t < L(32) + 1) drawCloud(c, x, y, 260, { seed: 90, face: f, cheeks: true, puff: puff * 1.6 });
  }
  // герои
  for (let i = 0; i < HEROES.length; i++) {
    if (t >= T_FIN + i * 0.09) continue;
    drawLeafState(c, heroAt(i, t));
  }
  // песочные часы на нитке
  const hgIn = spr(springBounce, t, E.w_vremya - 0.2), hgOut = easeIn(prog(t, L(13) - 0.2, L(13) + 0.4));
  if (hgIn > 0 && hgOut < 1) {
    const x = HGX, y = branchY(HGX) + lerp(-260, 150, hgIn) - hgOut * 420;
    c.strokeStyle = "#6a4428"; c.lineWidth = 2; c.beginPath(); c.moveTo(x, branchY(HGX)); c.lineTo(x, y - 50); c.stroke();
    drawHourglass(c, x, y + 50, 125, prog(t, E.w_vremya, L(13)), t);
  }
  // солнечный зайчик
  if (t > E.w_luch - 0.4 && t < EN(15) + 0.4) {
    const seg = (EN(15) - E.w_luch + 0.2) / 6, k = clamp((t - (E.w_luch - 0.1)) / seg, -0.6, 5.6);
    const i0 = clamp(Math.floor(k), 0, 5), i1 = clamp(i0 + 1, 0, 5), u = k - Math.floor(k);
    const p0 = heroAt(i0, t), p1 = heroAt(i1, t);
    const x = lerp(p0.cx, p1.cx, u), y = lerp(p0.cy, p1.cy, u) - 120 * Math.sin(Math.PI * u) - 40;
    const g = c.createRadialGradient(x, y, 0, x, y, 46); g.addColorStop(0, "rgba(255,240,170,0.95)"); g.addColorStop(0.5, "rgba(255,220,110,0.6)"); g.addColorStop(1, "rgba(255,220,110,0)");
    c.fillStyle = g; c.fillRect(x - 46, y - 46, 92, 92);
  }
  // капля росы и брызги
  if (t > T_DROP - 0.6 && t < T_SPLASH + 1.2) {
    const h = HEROES[3], hc = heroAt(3, t);
    const grow = prog(t, T_DROP - 0.6, T_DROP), u = prog(t, T_DROP, T_SPLASH);
    if (t < T_SPLASH) {
      const x = h.ax - 2, y = lerp(h.ay - 12, hc.cy - 30, easeIn(u)), r = 8 + 10 * grow;
      c.save(); c.translate(x, y); c.scale(1, 1 + 0.3 * u);
      cut(c, smoothPath([[0, -r * 1.6], [r, 0], [r * 0.7, r * 0.8], [0, r], [-r * 0.7, r * 0.8], [-r, 0]]), "rgba(170,214,236,0.92)", { lift: 0.6, tex: 0.3 });
      c.fillStyle = "rgba(255,255,255,0.9)"; circle(c, -r * 0.35, -r * 0.1, r * 0.25); c.fill(); c.restore();
    } else {
      for (let i = 0; i < 9; i++) {
        const v = prog(t, T_SPLASH, T_SPLASH + 0.9), a = -Math.PI * (0.1 + 0.8 * (i / 8)), d = 30 + 170 * v;
        c.fillStyle = `rgba(170,214,236,${0.95 * (1 - v)})`; circle(c, hc.cx + Math.cos(a) * d, hc.cy - 30 + Math.sin(a) * d * 0.8 + 260 * v * v, 9 * (1 - v * 0.5)); c.fill();
      }
    }
  }
  drawSparkles(c, t, E.w_blest - 0.1, HEROES.map((h) => [h.ax + 60, h.ay + 30]));
  drawSparkles(c, t, E.w_krase - 0.1, HEROES.map((h) => [h.ax - 50, h.ay + 140]));
}

// ---------- передний план: листья у самой камеры ----------
function drawForeLeaves(c, t) {
  const amt = win(t, L(30) - 0.3, EN(31), 0.2, 0.5); if (amt <= 0.01) return;
  c.setTransform(1, 0, 0, 1, 0, 0);
  const auts = ["red", "gold", "orange", "crimson", "amber"];
  for (let i = 0; i < 5; i++) {
    const u = prog(t, L(30) - 0.2 + i * 0.32, L(30) + 1.1 + i * 0.32); if (u <= 0 || u >= 1) continue;
    const x = lerp(W + 300, -300, u), y = 220 + i * 140 + Math.sin(u * 6 + i) * 80, s = 260 + (i % 2) * 80;
    c.save(); c.translate(x, y); c.rotate(u * 4 + i);
    const kz = CAMZ; CAMZ = 1; drawLeafLocal(c, i % 2 ? "maple" : "aspen", s, { a: 1, aut: auts[i], lift: 2.2 }); CAMZ = kz; c.restore();
  }
}

// ---------- название из листьев ----------
const TS = 2;
const TITLE = "Листья", SUB0 = "Фёдор Тютчев · 1830", SUB1 = "Фёдор Иванович Тютчев";
const TCOL = [["#7cb84f", "#4f8a34"], ["#f0c24a", "#d9902a"], ["#ee9a3a", "#c95a24"], ["#d9553a", "#a8322a"], ["#c23a46", "#8a2434"], ["#e6b040", "#c87a2a"]];
let SPR = null;
function makeLetter(ch, pxOut, cols, seed) {
  const px = pxOut * TS, f = `900 ${px}px "Leafy", serif`, pad = 30 * TS;
  const m = document.createElement("canvas").getContext("2d"); m.font = f;
  const adv = m.measureText(ch).width, w = Math.ceil(adv) + pad * 2, h = Math.ceil(px * 1.3) + pad * 2, bx = pad, by = pad + px * 0.98;
  const make = () => { const q = document.createElement("canvas"); q.width = w; q.height = h; return q; };
  const cvL = make(), a = cvL.getContext("2d");
  a.font = f; a.fillStyle = "#000"; a.fillText(ch, bx, by);
  a.globalCompositeOperation = "source-atop";
  const g = a.createRadialGradient(bx + adv * 0.4, by - px * 0.45, 0, bx + adv * 0.5, by - px * 0.4, px * 0.75);
  g.addColorStop(0, mixHex(cols[0], "#fff6d8", 0.18)); g.addColorStop(0.55, cols[0]); g.addColorStop(1, cols[1]); a.fillStyle = g; a.fillRect(0, 0, w, h);
  // прожилки: главная по диагонали, боковые ёлочкой
  a.strokeStyle = rgbStr(mixRgb(hexRgb(cols[0]), [255, 244, 200], 0.45), 0.8); a.lineCap = "round";
  const x0 = bx + adv * 0.15, y0 = by - px * 0.02, x1 = bx + adv * 0.85, y1 = by - px * 0.78;
  a.lineWidth = px * 0.02; a.beginPath(); a.moveTo(x0, y0); a.lineTo(x1, y1); a.stroke();
  a.lineWidth = px * 0.009;
  for (let i = 1; i < 7; i++) { const u = i / 7, cx = lerp(x0, x1, u), cy = lerp(y0, y1, u); for (const sg of [-1, 1]) { a.beginPath(); a.moveTo(cx, cy); a.lineTo(cx + sg * px * 0.16 - px * 0.08, cy + sg * px * 0.06 - px * 0.12); a.stroke(); } }
  a.globalAlpha = 0.9; a.fillStyle = a.createPattern(FIB, "repeat"); a.fillRect(0, 0, w, h); a.globalAlpha = 1;
  // светлый срез по краю
  a.globalCompositeOperation = "source-atop"; a.strokeStyle = "rgba(255,246,225,0.6)"; a.lineWidth = 3 * TS; a.font = f; a.strokeText(ch, bx, by);
  // тень
  const cvS = make(), s = cvS.getContext("2d"); s.font = f; s.fillStyle = "rgba(52,30,12,0.3)"; s.fillText(ch, bx, by);
  return { cv: cvL, sh: cvS, w, h, adv: adv / TS, bx, by };
}
function buildSprites() {
  const px = 230, m = document.createElement("canvas").getContext("2d"); m.font = `900 ${px}px "Leafy", serif`;
  const gapX = px * 0.04, chars = [...TITLE], widths = chars.map((ch) => m.measureText(ch).width), total = widths.reduce((a, b) => a + b, 0) + gapX * (chars.length - 1);
  let x = W / 2 - total / 2;
  SPR = chars.map((ch, i) => { const sp = makeLetter(ch, px, TCOL[i], i); const o = { sp, x: Math.round(x), y: 470 }; x += widths[i] + gapX; return o; });
}
function blitLetter(c, L1, x, y, rot, sc, alpha) {
  const sp = L1.sp;
  c.save(); c.globalAlpha = alpha; c.translate(x + sp.adv / 2, y); c.rotate(rot); c.scale(sc, sc);
  const dx = -sp.adv / 2 - sp.bx / TS, dy = -sp.by / TS;
  c.drawImage(sp.sh, dx + 6, dy + 8, sp.w / TS, sp.h / TS); c.drawImage(sp.sh, dx + 3, dy + 4, sp.w / TS, sp.h / TS);
  c.drawImage(sp.cv, dx, dy, sp.w / TS, sp.h / TS);
  // черешок над буквой
  c.restore();
}
function drawSubStrip(c, text, t0, t, out, y) {
  const k = spr(springPop, t, t0); if (k <= 0) return;
  let a = clamp((t - t0) * 4, 0, 1); if (out !== undefined) a *= 1 - clamp((t - out) / 0.3, 0, 1); if (a <= 0) return;
  c.save(); c.globalAlpha = a; c.translate(W / 2, y); c.rotate(-0.015); c.scale(0.7 + 0.3 * k, 0.7 + 0.3 * k);
  c.font = 'italic 400 60px "CapI", serif'; c.textAlign = "center"; c.textBaseline = "middle";
  const w = c.measureText(text).width + 90;
  const kz = CAMZ; CAMZ = 1; cut(c, tornRect(-w / 2, -48, w, 96, 404, 4, 20), "#f4ead3", { lift: 1.2 }); CAMZ = kz;
  c.fillStyle = "#3a2616"; c.fillText(text, 0, 4); c.restore();
}
function drawTitles(c, t) {
  if (!SPR) return;
  c.setTransform(1, 0, 0, 1, 0, 0);
  // вступление: порыв ветра заносит буквы-листья, перед первой строкой их сдувает к бору
  if (t < E.V0 + 0.5) {
    const tOut = E.V0 - 0.75;
    SPR.forEach((L1, i) => {
      const st = 0.15 + i * 0.1, u = prog(t, st, st + 0.85); if (u <= 0) return;
      const e = easeOut(u), k = spr(springBounce, t, st + 0.75);
      let x = lerp(-260 - i * 60, L1.x, e), y = lerp(180 + i * 70, L1.y, e) - 160 * Math.sin(Math.PI * e);
      let rot = (1 - e) * (3 + i) * 1.2 + (u >= 1 ? 0.12 * (1 - k) * Math.sin((t - st) * 9) : 0), sc = lerp(0.4, 1, e);
      if (u >= 1) rot += 0.02 * Math.sin(t * 2.2 + i);
      let a = 1;
      if (t > tOut) { const v = t - tOut - i * 0.04; if (v > 0) { x -= 1700 * v * v + 300 * v; y += -260 * v + 40 * Math.sin(v * 8); rot -= v * 6; a = 1 - clamp(v / 0.75, 0, 1); } }
      if (a <= 0) return;
      const px = t > st + 1.4 && t < tOut ? Math.round(x) : x, py = t > st + 1.4 && t < tOut ? Math.round(y) : y;
      blitLetter(c, L1, px, py, rot, sc, a);
    });
    drawSubStrip(c, SUB0, 1.25, t, E.V0 - 0.7, 640);
  }
  // финал: закатное бумажное солнце за названием
  if (t >= T_FIN - 1.2) {
    const k = spr(springSoft, t, T_FIN - 1.2), kz = CAMZ; CAMZ = 1;
    drawSun(c, 1540, lerp(1300, 860, k), 170, 0.9 * k, 0, t, { blink: blinkAt(t, 2.2), mouth: "smile", lx: -0.7, ly: -0.6 });
    CAMZ = kz;
  }
  // финал: листья-герои слетаются и становятся буквами
  if (t >= T_FIN) {
    SPR.forEach((L1, i) => {
      const t0 = T_FIN + i * 0.09, u = prog(t, t0, t0 + 0.85);
      const st0 = heroAt(i, t0), [sx, sy] = toScreenAt(st0.cx, st0.cy, t0), z0 = camAt(t0)[2];
      const e = easeInOut(u), x = lerp(sx, L1.x + L1.sp.adv / 2, e), y = lerp(sy, L1.y - 80, e) - 120 * Math.sin(Math.PI * e);
      if (u < 1) { // тот же лист-герой с лицом летит к своей букве и сжимается в неё
        const st = { ...st0, cx: x, cy: y, rot: lerp(st0.rot, 0, e), s: lerp(st0.s * z0, 130, e) * (1 - 0.9 * sstep(prog(u, 0.72, 1))), lift: 1.6 };
        st.face = { ...st0.face, blink: blinkAt(t, HEROES[i].ph), mouth: "grin", mo: 0.6 }; st.faceTilt = st.rot * 0.25;
        const kz = CAMZ; CAMZ = 1; drawLeafState(c, st); CAMZ = kz;
      }
      if (u > 0.75) {
        const k = spr(springBounce, t, t0 + 0.65), settled = t > t0 + 1.8;
        const rot = settled ? 0 : 0.2 * (1 - k) * (i % 2 ? 1 : -1);
        const bx = settled ? Math.round(L1.x) : L1.x, by = settled ? Math.round(L1.y + Math.sin(t * 1.6 + i) * 0) : L1.y;
        blitLetter(c, L1, bx, by, rot, settled ? 1 : 0.4 + 0.6 * k, clamp((u - 0.75) * 6, 0, 1));
      }
    });
    drawSubStrip(c, SUB1, T_FIN + 1.05, t, undefined, 650);
  }
}
function toScreenAt(x, y, t) { const [cx, cy, z] = camAt(t); return [W / 2 + (x - cx) * z, H / 2 + (y - cy) * z]; }

// ---------- строки ----------
const CAPS = [...document.querySelectorAll(".cap")].map((el) => ({ el, n: +el.dataset.n, last: "" }));
const WORDS = [...document.querySelectorAll(".cap .w")].map((el) => ({ el, at: +el.dataset.at, last: -1 }));
const STRIP = document.getElementById("strip");
const ROWS = [846, 920];
function capState(n, t) {
  const B = CFG.blocks.find((b) => n >= b[0] && n <= b[1]);
  const endBlock = B[1] < NL ? L(B[1] + 1) - 0.25 : E.fin - 0.35;
  const y = n === B[0] ? ROWS[0] : ROWS[1];
  let op = sstep(prog(t, L(n) - 0.12, L(n) + 0.05));
  op *= 1 - sstep(prog(t, endBlock, endBlock + 0.22));
  return { y, op };
}
let STRIP_LAST = "";
function textAt(t) {
  const so = win(t, L(1) - 0.45, E.fin + 0.1, 0.3, 0.45), sk = spr(springPop, t, L(1) - 0.45);
  const key = so.toFixed(3) + "|" + sk.toFixed(3);
  if (key !== STRIP_LAST) { STRIP.style.opacity = so.toFixed(3); STRIP.style.transform = `translate(0px, ${((1 - sk) * 60).toFixed(1)}px) rotate(-0.4deg)`; STRIP_LAST = key; }
  for (const cp of CAPS) {
    const s = capState(cp.n, t), k2 = s.y.toFixed(1) + "|" + s.op.toFixed(3);
    if (k2 !== cp.last) { cp.el.style.transform = `translate(0px, ${s.y.toFixed(1)}px)`; cp.el.style.opacity = s.op.toFixed(3); cp.last = k2; }
  }
  for (const w of WORDS) {
    const u = prog(t, w.at - 0.06, w.at + 0.4), k = Math.round(u * 400); if (k === w.last) continue; w.last = k;
    const s = springPop(u);
    w.el.style.opacity = u > 0 ? Math.min(1, u * 5).toFixed(3) : "0";
    w.el.style.transform = u >= 1 ? "none" : `translate(0px, ${((1 - s) * 22).toFixed(1)}px) rotate(${((1 - s) * -6).toFixed(2)}deg)`;
  }
}

// ---------- кадр ----------
let VIGN = null;
function renderAt(t) {
  t = clamp(t, 0, TOTAL);
  BOIL = Math.floor(t * BOIL_FPS);
  [CAMX, CAMY, CAMZ] = camAt(t);
  const c = ctx;
  c.setTransform(1, 0, 0, 1, 0, 0);
  drawBackground(c, t);
  drawWorld(c, t);
  drawSnowfall(c, t);
  drawWindStrips(c, t);
  const z = CAMZ; drawForeLeaves(c, t); CAMZ = z;
  CAMZ = 1; drawTitles(c, t); CAMZ = z;
  // зерно бумаги и мягкая виньетка
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 0.5; c.fillStyle = c.createPattern(GRAIN, "repeat"); c.fillRect(0, 0, W, H); c.globalAlpha = 1;
  if (!VIGN) { VIGN = c.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.05); VIGN.addColorStop(0, "rgba(60,36,14,0)"); VIGN.addColorStop(1, "rgba(60,36,14,0.32)"); }
  c.fillStyle = VIGN; c.fillRect(0, 0, W, H);
  textAt(t);
}

// ---------- проба героев: ?probe=hero&i=N | bird | hog | trees ----------
const PQ = new URLSearchParams(location.search), PROBE = PQ.get("probe");
function probe(kind) {
  const c = ctx; c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = "#c9a97a"; c.fillRect(0, 0, W, H);
  const cols = 8, rows = 5, cw = W / cols, ch = H / rows, n = cols * rows;
  const span = { hero: [L(9) - 0.5, T_FIN - 0.05], joker: [T_JK0, T_JKLAND + 1.5], bird: [T_SUN, T_BIRDGO + 2], hog: [T_HOG0, T_JKOUT + 1.2], trees: [E.V0, EN(8)], wake: [L(30), L(32)] }[kind];
  for (let k = 0; k < n; k++) {
    const t = lerp(span[0], span[1], k / (n - 1)), x0 = (k % cols) * cw, y0 = Math.floor(k / cols) * ch;
    BOIL = Math.floor(t * BOIL_FPS); CAMZ = 1;
    c.save(); c.beginPath(); c.rect(x0, y0, cw, ch); c.clip();
    c.strokeStyle = "rgba(0,0,0,0.2)"; c.strokeRect(x0, y0, cw, ch);
    if (kind === "hero" || kind === "joker") {
      const i = kind === "joker" ? 2 : +(PQ.get("i") || 0), st = heroAt(i, t), sc = 0.62;
      c.translate(x0 + cw / 2, y0 + ch / 2 + 6); c.scale(sc, sc); c.translate(-st.cx, -st.cy); drawLeafState(c, st);
    } else if (kind === "bird") {
      let fly = t >= T_BIRDGO ? 1 : 0, u = t - T_BIRDGO;
      c.translate(x0 + cw / 2, y0 + ch / 2); c.strokeStyle = "#6e4f38"; c.lineWidth = 9; if (!fly) { c.beginPath(); c.moveTo(-90, 47); c.lineTo(90, 47); c.stroke(); }
      drawBird(c, 0, 0, 96, u * 18, fly, 1, { sing: t < E.w_otpeli + 0.1 ? 0.5 + 0.5 * Math.sin(t * 14) : 0 });
    } else if (kind === "hog") {
      const u = easeOut(prog(t, T_HOG0, T_HOG1)), x = lerp(1640, 1080, u), R = 78;
      c.translate(x0 + cw / 2 + 10, y0 + ch / 2 + 30); c.scale(0.72, 0.72); c.fillStyle = "#f4f1ea"; c.fillRect(-170, 0, 340, 80);
      drawHedgehog(c, 0, -R * 0.84 + 4, R, -(x - 1640) / R, hogOpen(t), { blink: blinkAt(t, 0.9), sniff: hogSniff(t) }, -1);
    } else {
      c.translate(x0 + cw / 2, y0 + ch - 6); c.scale(0.24, 0.24);
      const k0 = t < T_POP ? 0.72 : 0.72 + 0.28 * spr(springBounce, t, T_POP + 0.07);
      drawFir(c, -260, 0, FIR_H, FIR_W, { k: k0, snow: 1, face: treeFace(t, true), faceY: 0.42, blanket: sstep(prog(t, T_SLEEP - 0.2, T_SLEEP + 0.7)) * (1 - sstep(prog(t, L(6) - 0.3, L(6) + 0.3))), shake: ring(t, T_SHAKE, 14, 0.9) * 1.5, yellow: prog(t, T_JKHIT + 0.05, T_JKHIT + 0.6), yellowGone: sstep(prog(t, T_SHAKE + 0.05, T_SHAKE + 0.45)), yx: PATCH[0] - FIR_X, yy: PATCH[1] - GY, seed: 6 });
      drawPine(c, 330, 0, 720, { k: k0, face: treeFace(t, false), seed: 8 });
    }
    c.restore();
    c.fillStyle = "#000"; c.font = "16px monospace"; c.fillText(t.toFixed(2), x0 + 6, y0 + 18);
  }
}
// ?probe=cam — скорость и рывки камеры по всему ролику (px экрана за кадр)
function probeCam() {
  const c = ctx; c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = "#fff"; c.fillRect(0, 0, W, H);
  let maxV = 0, maxA = 0, tv = 0, ta = 0, prev = null, pv = 0; const vs = [];
  for (let f = 0; f <= TOTAL * 30; f++) {
    const t = f / 30, [x, y, z] = camAt(t);
    if (prev) { const v = Math.hypot(x - prev[0], y - prev[1]) * z + Math.abs(Math.log(z / prev[2])) * 1100; vs.push(v); if (v > maxV) { maxV = v; tv = t; } const a = Math.abs(v - pv); if (f > 2 && a > maxA) { maxA = a; ta = t; } pv = v; }
    prev = [x, y, z];
  }
  c.fillStyle = "#000"; c.font = "40px monospace";
  c.fillText(`maxV ${maxV.toFixed(1)} px/frame at ${tv.toFixed(2)}s`, 40, 80); c.fillText(`maxDeltaV ${maxA.toFixed(2)} px/frame^2 at ${ta.toFixed(2)}s`, 40, 140);
  c.strokeStyle = "#c00"; c.beginPath(); vs.forEach((v, i) => c.lineTo(40 + i * (W - 80) / vs.length, 1000 - v * 12)); c.stroke();
  c.strokeStyle = "#999"; c.beginPath(); c.moveTo(40, 1000 - 50 * 12); c.lineTo(W - 40, 1000 - 50 * 12); c.stroke();
}
const seek = (t) => (PROBE === "cam" ? probeCam() : PROBE ? probe(PROBE) : renderAt(t));
buildSprites();
window.addEventListener("hf-seek", (e) => seek(e.detail.time));
seek(0);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { buildSprites(); seek(0); });

const tl = gsap.timeline({ paused: true });
tl.set({}, {}, TOTAL);
window.__timelines = window.__timelines || {};
window.__timelines["main"] = tl;
