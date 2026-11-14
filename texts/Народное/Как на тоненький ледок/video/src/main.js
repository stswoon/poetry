// ---------- режиссура ----------
const cv = document.getElementById("scene"), ctx = cv.getContext("2d");
const L = (n) => E["L" + n], EN = (n) => E["E" + n];
const NL = Object.keys(E).filter((k) => /^L\d+$/.test(k)).length;

// ключевые моменты
const T_SLIP = E.w_dobra - 0.08;                       // копыто на скрытом льду
const T_FLY0 = T_SLIP + 0.14, T_LAND = Math.max(EN(6) - 0.05, T_FLY0 + 0.8);
const T_HSIT = T_SLIP + 0.55;                           // конь садится на лёд
const T_RISE = L(10) - 0.2, T_HWALK0 = T_RISE + 0.6, T_HWALK1 = EN(11) - 0.3;
const T_UP = E.w_kon12 - 0.15, T_JUMP = E.w_kon13 - 0.25, T_JUMPE = T_JUMP + 0.75;
const T_RUN0 = L(10) - 0.15, T_RUN1 = EN(11) - 0.25;
const T_GO = EN(NL) + 0.3, T_BUMP = EN(NL) + 2.3;
const HX_START = 520, HX_TROT = 1150, HX_SLIP = 1720, HX_ICE = 1960, HX_STAND = 2160, HX_BUMP = 3125;
const VX_LIE = 2470, VX_UP = 2560;
const G1 = { x0: 3530, x1: 2755, sar: "#f2b632", scarf: "#d84a3a", trim: "#d84a3a", hair: "#c58a3a", ribbon: "#3a9a5a", braidSide: -1, seed: 0 };
const G2 = { x0: 3630, x1: 2915, sar: "#3d9a5b", scarf: "#4a78c8", trim: "#f2c232", hair: "#8a5a2a", ribbon: "#d84a3a", braidSide: 1, seed: 3 };
const GY = (x) => { const h = hillY(x); return h + 19 * (1 - (HILL.y - h) / (HILL.y - HILL.top)); };

function blinkAt(t, off) { const p = (t + off) % 3.3; return p < 0.16 ? Math.max(0.05, Math.abs(p - 0.08) / 0.08) : 1; }

// ---------- конь: положение и аллюр ----------
function horseAt(t) {
  const H = { t, gait: "stand", s: 0, k: 1, head: 0, blink: blinkAt(t, 0.7) };
  let x = HX_START - 600, y = 905, dir = 1;
  if (t < L(4) - 0.6) return { x, y, dir, H, vis: false };
  const tA = L(4) - 0.6, tB = L(5), tC = T_SLIP;
  if (t < tB) { const u = prog(t, tA, tB); x = lerp(HX_START - 300, HX_TROT, u); H.gait = "trot"; H.s = x; }
  else if (t < tC) { const u = prog(t, tB, tC); x = lerp(HX_TROT, HX_SLIP, u); H.gait = "gallop"; H.s = x; H.head = -0.25; }
  else if (t < T_HSIT) { const u = easeOut(prog(t, tC, tC + 1.0)); x = lerp(HX_SLIP, HX_ICE, u); H.gait = "slip"; H.k = sstep(prog(t, tC, tC + 0.25)); H.head = 0.5; }
  else if (t < T_RISE) {
    const u = easeOut(prog(t, tC, tC + 1.0)); x = lerp(HX_SLIP, HX_ICE, u);
    H.gait = "sit"; H.k = sstep(prog(t, T_HSIT, T_HSIT + 0.45)); H.head = 0.35;
    // растерянно ёрзает на льду: съезжает туда-сюда, мотает головой
    const sp = win(t, L(7) + 0.2, EN(8), 0.3, 0.3); x += 14 * Math.sin((t - L(7)) * 5) * sp; H.head = 0.35 + 0.25 * Math.sin((t - L(7)) * 7) * sp;
  } else if (t < T_HWALK0) { x = HX_ICE; H.gait = "rise"; H.k = sstep(prog(t, T_RISE, T_HWALK0 - 0.05)); }
  else if (t < T_HWALK1) { const u = sstep(prog(t, T_HWALK0, T_HWALK1)); x = lerp(HX_ICE, HX_STAND, u); H.gait = "walk"; H.s = x - HX_ICE; }
  else if (t < T_GO) { x = HX_STAND; H.gait = "stand"; H.head = 0.1 * bump(t, T_JUMPE - 0.1, 0.6); }
  else if (t < T_BUMP) { const u = prog(t, T_GO, T_BUMP); x = lerp(HX_STAND, HX_BUMP, u * u * 0.25 + u * 0.75); H.gait = "trot"; H.s = x - HX_STAND; y = lerp(905, 940, sstep(u * 3)); }
  else { x = HX_BUMP - 26 * easeOut(prog(t, T_BUMP, T_BUMP + 0.35)); y = 940; H.gait = "stand"; H.head = 0.4 * bump(t, T_BUMP, 0.8); }
  if (t >= T_GO) y = lerp(905, 940, sstep(prog(t, T_GO, T_GO + 0.6)));
  return { x, y, dir, H, vis: true };
}

// ---------- Ваня ----------
function vanyaState(t) {
  if (t < T_FLY0) return { mode: "ride" };
  if (t < T_LAND) return { mode: "fly", u: prog(t, T_FLY0, T_LAND) };
  if (t < T_UP) return { mode: "flat" };
  if (t < T_JUMP) return { mode: "stand" };
  if (t < T_JUMPE) return { mode: "jump", u: prog(t, T_JUMP, T_JUMPE) };
  return { mode: "ride" };
}
function riderPose(t) {
  const V = { legs: "ride", face: 1, armsFront: true, look: 0.7, arms: [[30, -40], [60, -34]], sx: 0.82, sy: 0.82, mouth: 1, blink: blinkAt(t, 0.2) };
  if (t < T_FLY0) {
    // глазеет на снегиря, отвернувшись назад
    const back = sstep(prog(t, E.w_posp - 0.45, E.w_posp - 0.1)) * (1 - sstep(prog(t, T_SLIP - 0.05, T_SLIP + 0.1)));
    V.look = lerp(0.7, -0.95, back); V.eyeX = -3 * back; V.mouth = back > 0.5 ? 1.4 : 1;
    if (t < L(5)) { V.arms[1] = [62 + 10 * Math.sin(t * 9) * win(t, E.w_van4 - 0.1, L(5), 0.15, 0.2), -36 - 70 * win(t, E.w_van4 - 0.1, L(5), 0.15, 0.2)]; }
    V.headBob = -3 * Math.abs(Math.sin(t * 11));
    if (t > T_SLIP - 0.05) { V.mouth = "o"; V.look = 0.6; }
    return V;
  }
  // после прыжка — сидит; посадка с пружиной
  const land = spr(springBounce, t, T_JUMPE);
  V.sy = 0.82 * (1 - 0.18 * (1 - land)); V.sx = 0.82 * (1 + 0.12 * (1 - land));
  V.look = 0.75; V.mouth = 1.2;
  if (t >= L(16) - 0.1 && t < T_GO) { V.look = 0.8; V.mouth = 0.3; V.headBob = 6 * bump(t, E.w_ivan - 0.05, 0.5) + 6 * bump(t, E.w_zev, 0.5); }
  // «не зевай по сторонам» — глаза бегают
  if (t >= E.w_stor - 0.1 && t < T_GO) V.eyeX = 5 * Math.sign(Math.sin((t - E.w_stor) * 9)) * win(t, E.w_stor - 0.1, T_GO, 0.05, 0.2);
  if (t >= T_GO) {
    const back = sstep(prog(t, T_GO + 0.6, T_GO + 0.9)) * (1 - sstep(prog(t, T_BUMP - 0.05, T_BUMP + 0.1)));
    V.look = lerp(0.75, -0.95, back); V.mouth = 1.4;
    if (back > 0.01) V.arms[0] = [-60 - 14 * Math.sin(t * 12), -150 - 10 * Math.cos(t * 12)];
    if (t >= T_BUMP) { const k = spr(springBounce, t, T_BUMP); V.sy = 0.82 * (0.78 + 0.22 * k); V.sx = 0.82 * (1.12 - 0.12 * k); V.mouth = "o"; V.dizzy = t * 6; V.look = 0.7; }
    V.snowHat = prog(t, T_BUMP + 0.4, T_BUMP + 0.5);
  }
  return V;
}

// ---------- девушки ----------
function girlState(t, G, idx) {
  const S = { ...G, t, look: idx ? -0.4 : 0.4, mouth: 1, blink: blinkAt(t, idx * 1.3), arms: [[-50, -150], [50, -150]], braidSwing: Math.sin(t * 1.8 + idx) * 0.3 };
  let x = G.x0;
  // болтают на горке
  if (t < L(9)) { S.bob = -2 * Math.abs(Math.sin(t * 3 + idx)); }
  // увидали — ахают, ладошки к щекам
  const see = sstep(prog(t, E.w_dve - 0.05, E.w_dve + 0.25));
  if (t >= E.w_dve - 0.05 && t < T_RUN0) {
    S.look = -0.9; S.mouth = "o";
    const g = spr(springPop, t, E.w_uvid - 0.15 + idx * 0.08);
    S.arms = [[lerp(-50, -30, g), lerp(-150, -278, g)], [lerp(50, 30, g), lerp(-150, -278, g)]];
    S.bob = -24 * bump(t, E.w_uvid - 0.1 + idx * 0.08, 0.45) * see;
  }
  // бегут к Ване
  let run = 0;
  if (t >= T_RUN0) {
    const u = prog(t, T_RUN0, T_RUN1), ue = u < 1 ? sstep(u) * 0.3 + u * 0.7 : 1;
    x = lerp(G.x0, G.x1, ue); run = u < 1 ? 1 : 0;
    const s = Math.abs(x - G.x0);
    if (run) {
      S.look = -1; S.mouth = 0.8; S.lean = -0.08;
      const ph = s / 110 * TAU + idx;
      S.bob = -5 * Math.abs(Math.sin(ph / 2 * 2));
      S.arms = [[-52 + 18 * Math.sin(ph), -168 - 34 * Math.sin(ph)], [52 - 18 * Math.sin(ph), -168 + 34 * Math.sin(ph)]];
      S.braidSwing = s * 0.03;
      const feet = [];
      for (const [i, sx] of [[0, -18], [1, 18]]) {
        const f = stepFoot(s, 110, i * 0.5 + idx * 0.25, 0.45, 26), fxw = x - (f.x - s);
        feet.push([sx - (f.x - s), Math.min(2, GY(fxw + sx) - GY(x) + f.y)]);
      }
      S.feet = feet;
    }
  }
  // тормозят с волной снега
  if (t >= T_RUN1 && t < T_UP - 0.3) { S.look = -0.85; S.lean = -0.12 * bump(t, T_RUN1, 0.5); S.arms = [[-70, -120], [50, -150]]; }
  // тянут Ваню за руки / подсаживают
  if (t >= EN(11) - 0.1 && t < T_JUMPE + 0.2) {
    S.look = -0.9; S.mouth = 1.2;
    const reach = sstep(prog(t, EN(11) - 0.1, EN(11) + 0.3)), pull = sstep(prog(t, T_UP - 0.1, T_UP + 0.3));
    const push = win(t, T_JUMP - 0.2, T_JUMPE + 0.2, 0.2, 0.25);
    const dl = idx ? 0.6 : 1;
    S.arms = [[lerp(-50, -96 * dl, reach) + 30 * pull, lerp(-150, -96, reach) - 60 * pull - 80 * push], [lerp(50, -40 * dl, reach) + 20 * pull, lerp(-150, -100, reach) - 50 * pull - 90 * push]];
    S.lean = -0.22 * reach * (1 - pull) - 0.12 * push;
  }
  // показывают путь-дорогу
  if (t >= E.w_put14 - 0.2 && t < E.w_nak - 0.1) {
    const pt = idx === 1 ? spr(springPop, t, E.w_put14 - 0.15) : spr(springPop, t, E.w_put15 - 0.15) * (t >= E.w_put15 - 0.15 ? 1 : 0);
    S.look = lerp(-0.6, 0.9, Math.min(1, pt)); S.mouth = 1.3;
    if (pt > 0) S.arms = [[-50, -150], [lerp(50, 150, pt), lerp(-150, -268, pt)]];
  }
  // наказывают: руки в боки, палец
  if (t >= E.w_nak - 0.1 && t < T_BUMP + 0.25) {
    const ak = sstep(prog(t, E.w_nak - 0.1, E.w_nak + 0.2));
    S.look = -0.75; S.mouth = 0.2; S.brow = ak;
    S.arms = [[lerp(-50, -46, ak), lerp(-150, -138, ak)], [lerp(50, 46, ak), lerp(-150, -138, ak)]];
    const wag = (idx === 0 && t >= E.w_kak - 0.1) || t >= E.w_zev - 0.15;
    if (wag && t < T_GO + 0.4) { S.arms[1] = [62, -310]; S.finger = 0.35 * Math.sin((t - E.w_kak) * 9); S.mouth = "o"; }
    if (t >= T_GO + 0.4) { S.brow = 0; S.mouth = 1.2; S.look = 0.6; S.arms = [[-50, -150], [lerp(50, 120, sstep(prog(t, T_GO + 0.4, T_GO + 0.8))), lerp(-150, -300, sstep(prog(t, T_GO + 0.4, T_GO + 0.8))) + 14 * Math.sin(t * 12)]]; }
  }
  // финал: хватаются за голову
  if (t >= T_BUMP + 0.25) {
    const k = spr(springPop, t, T_BUMP + 0.25 + idx * 0.1);
    S.look = 0.7; S.mouth = "o"; S.arms = [[lerp(-50, -44, k), lerp(-150, -334, k)], [lerp(50, 44, k), lerp(-150, -334, k)]];
    S.bob = -10 * bump(t, T_BUMP + 0.25 + idx * 0.1, 0.4);
  }
  const y = GY(x);
  return { x, y, S, run };
}

// ---------- камера: цели планов → плавное следование (критическое демпфирование) + предел скорости ----------
function camTarget(t) {
  const hz = horseAt(t);
  if (t < L(1) - 0.5) return [2300, 470, 0.6];
  if (t < L(2)) return [POND.x - 80, 770, 1.45];
  if (t < L(3)) return [POND.x, 720, 1.15];
  if (t < L(4) - 0.5) return [1800, 640, 0.82];
  if (t < L(5)) return [hz.x + 300, 650, 1.0];
  if (t < T_SLIP) return [hz.x + 240, 650, 0.95];
  if (t < L(7) - 0.15) { const vp = flyPos(t); return [lerp(hz.x + 240, vp[0] + 40, sstep(prog(t, T_SLIP, T_LAND))), 650, 0.92]; }
  if (t < L(8)) return [2560, 735, 1.42];
  if (t < L(9) - 0.15) return [2660, 690, 1.0];
  if (t < T_RUN0) return [(G1.x0 + G2.x0) / 2, 600, 1.25];
  if (t < T_RUN1) { const a = girlState(t, G1, 0), b = girlState(t, G2, 1); return [(a.x + b.x) / 2 - 140, lerp(600, 690, prog(t, T_RUN0, T_RUN1)), 1.0]; }
  if (t < T_UP - 0.2) return [2640, 700, 1.25];
  if (t < T_JUMP - 0.1) return [2600, 700, 1.22];
  if (t < L(14)) return [2460, 680, 1.08];
  if (t < L(15) - 0.1) return [2760, 680, 1.0];
  if (t < L(16) - 0.1) return [3420, 640, 0.72];
  if (t < L(17)) return [2560, 720, 1.2];
  if (t < T_GO) return [2540, 716, 1.28];
  if (t < E.fin) return [2790, 690, 0.95];
  return [2790, 450, 0.95];
}
const CAM_DT = 1 / 120, CAM = [];
(function precomputeCam() {
  // цели планов сглаживаем окном ~0,5 с (дважды скользящее среднее), чтобы новый план не дёргал ускорение
  const N = Math.ceil((TOTAL + 0.1) / CAM_DT) + 1, R = [];
  for (let i = 0; i < N; i++) { const q = camTarget(i * CAM_DT); R.push([q[0], q[1], Math.log(q[2])]); }
  const box = (A, h) => { const out = [], n = A.length; for (let i = 0; i < n; i++) { let sx = 0, sy = 0, sz = 0, k = 0; for (let j = Math.max(0, i - h); j <= Math.min(n - 1, i + h); j++) { sx += A[j][0]; sy += A[j][1]; sz += A[j][2]; k++; } out.push([sx / k, sy / k, sz / k]); } return out; };
  const T2 = box(box(R, 30), 30);
  let [x, y, lz0] = T2[0], z = Math.exp(lz0), vx = 0, vy = 0, vz = 0;
  const w = 5.0, maxPx = 46 * 30; // ω и предел скорости (экранных px/с)
  for (let i = 0; i < N; i++) {
    const [tx, ty, ltz] = T2[i], lz = Math.log(z);
    let ax = w * w * (tx - x) - 2 * w * vx, ay = w * w * (ty - y) - 2 * w * vy, az = w * w * (ltz - lz) - 2 * w * vz;
    vx += ax * CAM_DT; vy += ay * CAM_DT; vz += az * CAM_DT;
    const sp = Math.hypot(vx, vy) * z; if (sp > maxPx) { vx *= maxPx / sp; vy *= maxPx / sp; }
    vz = clamp(vz, -0.55, 0.55);
    x += vx * CAM_DT; y += vy * CAM_DT; z = Math.exp(lz + vz * CAM_DT);
    CAM.push([x, y, z]);
  }
})();
function camAt(t) { const f = clamp(t / CAM_DT, 0, CAM.length - 1.001), i = Math.floor(f), u = f - i, a = CAM[i], b = CAM[i + 1]; return { x: lerp(a[0], b[0], u), y: lerp(a[1], b[1], u), z: lerp(a[2], b[2], u) }; }

// ---------- полёт Вани ----------
function flyPos(t) {
  const hz0 = horseAt(T_FLY0), sp = horseSaddle(hz0.H), x0 = hz0.x + sp[0], y0 = hz0.y + sp[1];
  const x1 = VX_LIE + 20, y1 = driftY(VX_LIE) - 40, u = prog(t, T_FLY0, T_LAND);
  return [lerp(x0, x1, 1 - Math.pow(1 - u, 1.6)), lerp(y0, y1, u) - 370 * Math.sin(Math.PI * u) * (1 - 0.15 * u)];
}

// ---------- частицы снега ----------
function burst(c, x, y, t, t0, n, seed, spread = 1, up = 1) {
  const u = t - t0; if (u < 0 || u > 1.1) return;
  const r = mulberry32(seed);
  for (let i = 0; i < n; i++) {
    const vx = (r() * 2 - 1) * 320 * spread, vy = -(180 + r() * 380) * up, rr = 6 + r() * 10;
    const px = x + vx * u, py = y + vy * u + 900 * u * u;
    if (py > y + 10) continue;
    c.globalAlpha = 1 - u / 1.1; c.fillStyle = "#ffffff"; circle(c, px, py, rr); c.fill();
    c.fillStyle = "rgba(150,180,220,0.5)"; circle(c, px + rr * 0.3, py + rr * 0.35, rr * 0.55); c.fill();
  }
  c.globalAlpha = 1;
}
const FLAKES = (() => { const r = mulberry32(1234), a = []; for (let i = 0; i < 130; i++) a.push({ x: r() * W, y: r() * H, v: 90 + r() * 120, s: 5 + r() * 9, ph: r() * TAU, k: r() }); return a; })();
function snowAmount(t) { return 0.18 + 0.82 * win(t, L(2) - 0.4, EN(3) + 0.6, 0.4, 0.8) + 0.1 * win(t, EN(NL), TOTAL, 1, 0.1); }
function drawSnowfall(c, t) {
  const amt = snowAmount(t);
  for (const f of FLAKES) {
    if (f.k > amt) continue;
    const y = (f.y + t * f.v) % (H + 40) - 20, x = (f.x + Math.sin(t * 1.3 + f.ph) * 26 + t * 12) % (W + 40) - 20;
    c.fillStyle = "rgba(150,175,215,0.45)"; circle(c, x + f.s * 0.25, y + f.s * 0.3, f.s); c.fill();
    c.fillStyle = "#ffffff"; circle(c, x, y, f.s); c.fill();
  }
}

// ---------- кадр ----------
function renderAt(t) {
  BOIL = Math.floor(t * BOIL_FPS);
  const c = ctx, cam = camAt(t);
  c.setTransform(1, 0, 0, 1, 0, 0);
  drawSky(c, cam);
  withLayer(c, cam, 0.45, (c) => drawFar(c, t));
  c.save(); c.translate(W / 2, H / 2); c.scale(cam.z, cam.z); c.translate(-cam.x, -cam.y);
  drawFloor(c, cam);
  const snowK = 0.35 + 0.65 * sstep(prog(t, L(2), EN(3)));
  for (const [x, y, s, sd] of [[420, 760, 0.7, 311], [760, 720, 0.55, 312], [1560, 700, 0.5, 313], [3980, 700, 0.6, 314], [4240, 690, 0.5, 315], [2400, 690, 0.45, 316]]) fir(c, x, y, s, sd, snowK);
  drawFence(c);
  const crowTurn = sstep(prog(t, E.w_nikto + 0.15, E.w_nikto + 0.35));
  drawCrow(c, CROW.x, CROW.y, crowTurn > 0.5 ? 1 : -1, t, win(t, E.w_nikto + 0.25, EN(8) + 0.6, 0.15, 0.3));
  drawHill(c);
  // пруд
  const ice = prog(t, L(1) - 0.05, EN(1) + 0.15);
  drawPond(c, { ice: t < L(1) - 0.05 ? 0 : ice, glint: prog(t, EN(1) - 0.2, EN(1) + 0.9), lumps: prog(t, L(2) - 0.1, EN(2) + 0.3), cover: sstep(prog(t, L(3), EN(3) + 0.2)),
    scrape: prog(t, T_SLIP, T_SLIP + 0.8), scrapeX0: HX_SLIP + 40, scrapeX1: HX_ICE + 150 });
  drawRoad(c, prog(t, E.w_put15 - 0.1, EN(15) + 0.4));
  drawDrift(c);
  // всё, что стоит на земле, — по глубине
  const items = [];
  items.push([BIRD_TREE.y, () => fir(c, BIRD_TREE.x, BIRD_TREE.y, 1, 301, snowK)]);
  items.push([FINAL_TREE.y, () => fir(c, FINAL_TREE.x, FINAL_TREE.y, 0.9, 331, snowK)]);
  const signShake = t > T_BUMP ? Math.exp(-(t - T_BUMP) * 4) * Math.sin((t - T_BUMP) * 34) * 0.07 : 0;
  items.push([SIGN.y, () => drawSign(c, prog(t, E.w_put14 + 0.05, E.w_put14 + 0.85), t, 1 - prog(t, T_BUMP + 0.02, T_BUMP + 0.06), signShake)]);
  const hz = horseAt(t), vs = vanyaState(t);
  if (hz.vis) {
    const rider = vs.mode === "ride" ? (c2, p) => drawVanya(c2, p[0], p[1], riderPose(t)) : null;
    items.push([hz.y, () => drawHorse(c, hz.x, hz.y, hz.dir, hz.H, rider)]);
  }
  if (vs.mode === "fly") items.push([2000, () => { const p = flyPos(t), u = vs.u;
    drawVanya(c, p[0], p[1], { legs: "fly", look: 0.5, rot: easeInOut(u) * TAU * 1.25, arms: [[-70, -150], [70, -150]], mouth: "o" }); }]);
  if (vs.mode === "flat") items.push([driftY(VX_LIE) + 1, () => {
    const land = spr(springBounce, t, T_LAND);
    const lift = sstep(prog(t, E.w_nikto - 0.1, E.w_nikto + 0.3)) * (1 - sstep(prog(t, E.w_bezh, E.w_bezh + 0.25)));
    const hope = sstep(prog(t, EN(11) - 0.3, EN(11) + 0.2));
    drawVanyaFlat(c, VX_LIE, driftY(VX_LIE) - 4, { flat: 1.15 - 0.15 * land, kick: win(t, T_LAND + 0.3, EN(7) + 0.3, 0.2, 0.3) + 0.35 * win(t, L(9), EN(10), 0.3, 0.3), headUp: Math.max(lift, 0.8 * hope), t, stars: win(t, T_LAND + 0.15, E.w_nikto + 0.5, 0.2, 0.3), blink: blinkAt(t, 0.4) });
    burst(c, VX_LIE + 40, driftY(VX_LIE) - 10, t, T_LAND, 18, 77, 1.4, 1);
  }]);
  if (vs.mode === "stand") items.push([driftY(VX_UP) + 1, () => {
    const k = spr(springBounce, t, T_UP), gy = driftY(VX_UP);
    burst(c, VX_UP, gy - 30, t, T_UP - 0.06, 18, 4242, 1.0, 0.9);
    floorShadow(c, VX_UP, gy + 2, 60, 0.25);
    drawVanya(c, VX_UP, gy - 100 * (0.35 + 0.65 * k), { legs: "stand", look: -0.3, sy: 0.35 + 0.65 * k, sx: 1.4 - 0.4 * k, arms: [[-80, -120 + 20 * Math.sin(t * 20) * bump(t, T_UP + 0.3, 0.6)], [80, -120]], mouth: 1.3, headRot: 0.15 * Math.sin(t * 26) * bump(t, T_UP + 0.35, 0.7), blink: blinkAt(t, 0.4) });
  }]);
  if (vs.mode === "jump") items.push([2000, () => {
    const hzz = horseAt(T_JUMPE), sp = horseSaddle(hzz.H), x1 = hzz.x + sp[0], y1 = hzz.y + sp[1], gy = driftY(VX_UP), u = vs.u;
    const x = lerp(VX_UP, x1, easeInOut(u)), y = lerp(gy - 100, y1, u) - 210 * Math.sin(Math.PI * u);
    drawVanya(c, x, y, { legs: "fly", look: -0.5, rot: -0.3 * Math.sin(Math.PI * u), arms: [[-80, -140], [70, -150]], mouth: "o", sx: lerp(1, 0.82, u), sy: lerp(1, 0.82, u) });
  }]);
  // заяц пробегает мимо
  if (t > L(8) - 0.4 && t < EN(8) + 0.8) items.push([952, () => { const u = prog(t, L(8) - 0.4, EN(8) + 0.8), x = lerp(3080, 2060, u); drawHare(c, x, 952, -1, (u * 5.5) % 1, t); }]);
  // девушки
  for (const [G, i] of [[G1, 0], [G2, 1]]) {
    const g = girlState(t, G, i);
    items.push([g.y + 0.6 - i * 0.1, () => {
      floorShadow(c, g.x, g.y + 2, 70, 0.22);
      drawGirl(c, g.x, g.y, g.S);
      if (t >= T_RUN1 && t < T_RUN1 + 1.1) burst(c, g.x - 40, g.y - 6, t, T_RUN1 + i * 0.06, 10, 300 + i, 0.9, 0.8);
    }]);
  }
  // снегирь
  items.push([BIRD_TREE.y + 0.1, () => {
    const land = 3.0, bx1 = BIRD_TREE.x + 98, by1 = BIRD_TREE.y - 40 - 72 - 2;
    if (t < land) { const u = prog(t, 0.4, land), x = lerp(700, bx1, easeOut(u)), y = lerp(420, by1, easeOut(u)) - 120 * Math.sin(Math.PI * u); drawFinch(c, x, y, 1, 1, t); }
    else { const hop = 14 * bump(t, E.w_posp - 0.3, 0.4) + 10 * bump(t, E.w_posp + 0.1, 0.4); drawFinch(c, bx1, by1 - hop, t > E.w_posp - 0.6 && t < L(7) ? -1 : 1, 0, t, win(t, E.w_posp - 0.6, E.w_posp + 0.6, 0.1, 0.2)); }
  }]);
  items.sort((a, b) => a[0] - b[0]);
  for (const [, fn] of items) fn();
  // брызги снега из-под копыт и при скольжении
  if (hz.vis && (hz.H.gait === "gallop" || hz.H.gait === "trot")) { const k = Math.floor(t * 6); burst(c, hz.x - 80, hz.y - 4, t, k / 6, 5, 900 + k, 0.5, 0.5); }
  burst(c, HX_SLIP + 220, POND.y - 10, t, T_SLIP + 0.05, 16, 501, 1.2, 0.9);
  // снег с таблички падает Ване на шапку
  if (t > T_BUMP + 0.04 && t < T_BUMP + 0.42) { const u = prog(t, T_BUMP + 0.04, T_BUMP + 0.42), hz2 = horseAt(t), sp = horseSaddle(hz2.H);
    clayBlob(c, lerp(SIGN.x + 40, hz2.x + sp[0], u), lerp(SIGN.y - SIGN_H - 6, hz2.y + sp[1] - 210 * 0.82, u * u), 60, 18 + 14 * u, "#ffffff", 0, 990); }
  c.restore();
  drawSnowfall(c, t);
  // лёгкая виньетка
  const vg = c.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.05);
  vg.addColorStop(0, "rgba(40,50,90,0)"); vg.addColorStop(1, "rgba(40,50,90,0.22)"); c.fillStyle = vg; c.fillRect(0, 0, W, H);
  captionsPlate(c, t);
  drawTitles(c, t);
  textAt(t);
}

// ---------- лента для строк: раскатанный светлый пластилин ----------
function captionsPlate(c, t) {
  const k = sstep(prog(t, L(1) - 0.6, L(1) - 0.1)) * (1 - sstep(prog(t, E.fin - 0.3, E.fin + 0.05)));
  if (k <= 0) return;
  c.save(); c.globalAlpha = k;
  const y = 828 + 30 * (1 - k);
  clay(c, lumpPoly([[170, y + 10], [190, y], [1730, y], [1750, y + 10], [1750, y + 152], [1730, y + 162], [190, y + 162], [170, y + 152]], 1001, 2), "#f7ecd2", { seed: 1001, rim: 16, gloss: 0.3, prints: 2, shade: 0.35 });
  c.restore();
}

// ---------- заголовок: буквы, скатанные из пластилина ----------
const TITLE_L1 = "Как на тоненький", TITLE_L2 = "ледок…", SUB = "Русская народная песня";
const T_COLORS = ["#d8352a", "#3f6fc4", "#f2b632", "#3a9a5a", "#e2679a", "#f07a2a"];
let SPRITES = null;
const TS = 2; // буквы рисуем в 2× и уменьшаем при выводе — край остаётся чётким
function makeLetter(ch, pxOut, hex) {
  const px = pxOut * TS, f = `700 ${px}px "Comic Sans MS", "Trebuchet MS", sans-serif`, pad = 40 * TS;
  const m = document.createElement("canvas").getContext("2d"); m.font = f;
  const w = Math.ceil(m.measureText(ch).width) + pad * 2, h = Math.ceil(px * 1.35) + pad * 2;
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const a = cv.getContext("2d"), bx = pad, by = pad + px * 1.0;
  const shape = (g, col) => { g.font = f; g.lineJoin = "round"; g.lineWidth = px * 0.08; g.fillStyle = col; g.strokeStyle = col; g.fillText(ch, bx, by); g.strokeText(ch, bx, by); };
  // тень
  a.save(); a.filter = `blur(${px * 0.012}px)`; a.globalAlpha = 0.3; a.translate(px * 0.025, px * 0.04); shape(a, "#28304f"); a.restore();
  const b = document.createElement("canvas"); b.width = w; b.height = h; const bc = b.getContext("2d"); shape(bc, hex);
  // объём: внутренняя тень снизу-справа и блик сверху-слева через размытую «изнанку»
  const inv = (col) => { const q = document.createElement("canvas"); q.width = w; q.height = h; const g = q.getContext("2d"); g.fillStyle = col; g.fillRect(0, 0, w, h); g.globalCompositeOperation = "destination-out"; shape(g, "#000"); return q; };
  bc.globalCompositeOperation = "source-atop";
  bc.save(); bc.filter = `blur(${px * 0.022}px)`; bc.globalAlpha = 0.5; bc.drawImage(inv("#1e1a3a"), -px * 0.025, -px * 0.03); bc.restore();
  bc.save(); bc.filter = `blur(${px * 0.018}px)`; bc.globalAlpha = 0.7; bc.drawImage(inv("#ffffff"), px * 0.02, px * 0.026); bc.restore();
  // чёткий край буквы
  bc.globalCompositeOperation = "source-over"; bc.save(); bc.font = f; bc.lineJoin = "round"; bc.lineWidth = Math.max(2, px * 0.012); bc.strokeStyle = rgbStr(shades(hex).deep, 0.55);
  bc.fillStyle = "rgba(0,0,0,0)"; bc.lineWidth = px * 0.08 + Math.max(2, px * 0.012) * 2; bc.globalCompositeOperation = "destination-over"; bc.strokeText(ch, bx, by); bc.restore();
  // отпечаток пальца
  bc.strokeStyle = "rgba(30,20,50,0.08)"; bc.lineWidth = 1.2;
  for (let i = 0; i < 6; i++) { bc.beginPath(); bc.ellipse(bx + px * 0.25, by - px * 0.35, px * (0.05 + i * 0.03), px * (0.035 + i * 0.022), 0.4, 0.3 * i, 0.3 * i + 2.4); bc.stroke(); }
  a.drawImage(b, 0, 0);
  return { cv, w, h, adv: m.measureText(ch).width / TS, bx, by };
}
function layoutLine(str, px, cx, baseY, ci) {
  const out = []; let x = 0;
  const m = document.createElement("canvas").getContext("2d"); m.font = `700 ${px}px "Comic Sans MS", "Trebuchet MS", sans-serif`;
  const total = m.measureText(str).width + px * 0.05 * (str.length - 1);
  for (const ch of str) {
    if (ch !== " ") { const sp = makeLetter(ch, px, T_COLORS[ci.n++ % T_COLORS.length]); out.push({ sp, x: cx - total / 2 + x, y: baseY }); }
    x += m.measureText(ch).width + px * 0.05;
  }
  return out;
}
function buildSprites() {
  const ci = { n: 0 };
  SPRITES = { a: layoutLine(TITLE_L1, 140, W / 2, 205, ci), b: layoutLine(TITLE_L2, 160, W / 2, 375, ci) };
  SPRITES.all = SPRITES.a.concat(SPRITES.b);
}
function drawTitleSet(c, t, t0, out) {
  if (!SPRITES) return;
  const n = SPRITES.all.length;
  SPRITES.all.forEach((L1, i) => {
    const st = t0 + i * 0.045, u = t - st; if (u < 0) return;
    const fall = clamp(u / 0.32, 0, 1), y = L1.y - 520 * (1 - fall * fall);
    let sx = 1, sy = 1;
    if (u > 0.32) { const k = springBounce(u - 0.32); sy = 0.62 + 0.38 * k; sx = 1.3 - 0.3 * k; }
    let oy = 0, a = 1;
    if (out !== undefined && t > out) { const v = t - out - i * 0.02; if (v > 0) { oy = -700 * v * v * 3; a = 1 - clamp(v / 0.4, 0, 1); } }
    if (a <= 0) return;
    const wob = Math.round(Math.sin(t * 2 + i) * 2);
    c.save(); c.globalAlpha = a; c.translate(Math.round(L1.x + L1.sp.adv / 2), Math.round(y + oy) + wob); c.scale(sx, sy);
    c.drawImage(L1.sp.cv, -L1.sp.adv / 2 - L1.sp.bx / TS, -L1.sp.by / TS, L1.sp.w / TS, L1.sp.h / TS); c.restore();
  });
}
function drawSub(c, t, t0, y, out) {
  const k = spr(springPop, t, t0); if (k <= 0) return;
  let a = clamp((t - t0) * 4, 0, 1); if (out !== undefined) a *= 1 - clamp((t - out) / 0.3, 0, 1);
  if (a <= 0) return;
  c.save(); c.globalAlpha = a; c.translate(W / 2, y); c.scale(0.7 + 0.3 * k, 0.7 + 0.3 * k);
  c.font = '700 54px "Avenir Next", sans-serif'; c.textAlign = "center"; c.textBaseline = "middle";
  const w = c.measureText(SUB).width + 70;
  clay(c, lumpPoly([[-w / 2, -40], [w / 2, -40], [w / 2 + 16, 0], [w / 2, 40], [-w / 2, 40], [-w / 2 - 16, 0]], 1101, 1.5), "#ffffff", { seed: 1101, rim: 10, gloss: 0.3, prints: 1 });
  c.fillStyle = "#2c3a72"; c.fillText(SUB, 0, 3); c.restore();
}
function drawTitles(c, t) {
  if (t < E.V0 + 0.2) { drawTitleSet(c, t, 0.25, E.V0 - 0.55); drawSub(c, t, 1.4, 478, E.V0 - 0.5); }
  if (t > E.fin) { drawTitleSet(c, t, E.fin + 0.2); drawSub(c, t, E.fin + 1.3, 478); }
}

// ---------- строки ----------
const CAPS = [...document.querySelectorAll(".cap")].map((el) => ({ el, n: +el.dataset.n, last: "" }));
const WORDS = [...document.querySelectorAll(".cap .w")].map((el) => ({ el, at: +el.dataset.at, last: -1 }));
const ROWS = [842, 916];
function capState(n, t) {
  const B = CFG.blocks.find((b) => n >= b[0] && n <= b[1]);
  const next = n < B[1] ? L(n + 1) : null;
  const endBlock = B[1] < NL ? L(B[1] + 1) - 0.25 : E.fin - 0.35;
  let y = n === B[0] ? ROWS[0] : ROWS[1], op = sstep(prog(t, L(n) - 0.12, L(n) + 0.05));
  if (B[0] === B[1]) y = (ROWS[0] + ROWS[1]) / 2;
  op *= 1 - sstep(prog(t, endBlock, endBlock + 0.22));
  return { y, op };
}
function textAt(t) {
  for (const cp of CAPS) {
    const s = capState(cp.n, t), key = s.y.toFixed(1) + "|" + s.op.toFixed(3);
    if (key !== cp.last) { cp.el.style.transform = `translate(0px, ${s.y.toFixed(1)}px)`; cp.el.style.opacity = s.op.toFixed(3); cp.last = key; }
  }
  for (const w of WORDS) {
    const u = prog(t, w.at - 0.06, w.at + 0.4), k = Math.round(u * 400); if (k === w.last) continue; w.last = k;
    const s = springPop(u);
    w.el.style.opacity = u > 0 ? Math.min(1, u * 5).toFixed(3) : "0";
    w.el.style.transform = u >= 1 ? "none" : `translate(0px, ${((1 - s) * 26).toFixed(1)}px) scale(${Math.min(1, 0.7 + 0.3 * s).toFixed(3)}, ${(1.25 - 0.25 * s).toFixed(3)})`;
  }
}

const seek = (t) => renderAt(t);
buildSprites();
window.addEventListener("hf-seek", (e) => seek(e.detail.time));
seek(0);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { buildSprites(); seek(0); });

const tl = gsap.timeline({ paused: true });
tl.set({}, {}, TOTAL);
window.__timelines = window.__timelines || {};
window.__timelines["main"] = tl;
