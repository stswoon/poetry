// ---------- режиссура: время суток, тучка, утёс, камера ----------
const cv = document.getElementById("scene"), ctx = cv.getContext("2d");
const REST = [55, 410], SC = [420, -2150];
const T_LAUNCH = E.w_umch - 0.05;
const T_FALL = E.E4 - 0.08, T_LAND = Math.max(E.L5 + 0.15, T_FALL + 0.5);
const T_TEAR = E.w_plach - 0.25, T_SLIDE = E.w_plach + 0.12, T_DROP = E.w_plach + 1.1, T_HIT = T_DROP + 0.55;
const STAR0 = 0.25, STAR1 = E.V0 - 0.7;
const LAND_Y = 1075; // песок перед подножием (основание утёса на y ≈ 1010)

function dayAt(t) {
  let d = 0;
  d += sstep(prog(t, E.w_utrom - 0.2, E.w_utrom + 0.9));
  d += 0.35 * sstep(prog(t, E.L6, E.E6));
  d += 0.65 * sstep(prog(t, E.E6, E.L8 + 0.5));
  d += 0.6 * sstep(prog(t, E.L8 + 0.5, E.fin));
  d += 0.15 * sstep(prog(t, E.fin, TOTAL));
  return d;
}

// тучка: позиция и состояние
function tuchaAt(t) {
  const o = { s: 0.8, rot: 0, eyes: 0, mouth: -1, wave: 0, ears: 0, heart: 0, glow: 0, squash: 0, look: [0, 0], t };
  let x = REST[0], y = REST[1] + Math.sin(t * 1.6) * 3;
  o.squash = Math.sin(t * 1.6) * 0.03; // дыхание во сне
  o.glow = (t < E.w_utrom + 0.6 ? 0.55 + 0.15 * Math.sin(t * 2) : 0.25) + 0.6 * bump(t, STAR1 - 0.05, 0.9);
  if (t >= E.w_utrom + 0.25) { // проснулась
    const k = springPop(prog(t, E.w_utrom + 0.25, E.w_utrom + 1.0)); o.eyes = k; o.mouth = 2; o.look = [0.3, -0.6];
    o.squash = -0.12 * bump(t, E.w_utrom + 0.25, 0.4) + 0.16 * bump(t, T_LAUNCH - 0.28, 0.3);
  }
  if (t >= T_LAUNCH) { // срывается вверх
    const u = prog(t, T_LAUNCH, E.L4 + 0.15), q = 1 - (1 - u) * (1 - u);
    x = lerp(REST[0], SC[0], easeInOut(u)); y = lerp(REST[1], SC[1], q);
    o.squash = -0.18 * (1 - u); o.mouth = 1; o.eyes = 1; o.rot = 0.25 * Math.sin(u * Math.PI);
  }
  if (t >= E.L4 + 0.15) { // играет в лазури: «восьмёрка», кувырок, ушки, сердечко
    const w = (t - E.L4 - 0.15) * 2.4, k = sstep(prog(t, E.L4 + 0.15, E.L4 + 0.6));
    x = SC[0] + k * 240 * Math.sin(w); y = SC[1] - k * 90 * Math.sin(2 * w);
    o.rot = TAU * easeInOut(prog(t, E.w_ves - 0.12, E.w_ves + 0.55)) + 0.12 * Math.sin(t * 5);
    o.ears = springPop(prog(t, E.w_ves, E.w_ves + 0.9)) * (1 - sstep(prog(t, E.w_igr - 0.15, E.w_igr + 0.1)));
    o.heart = win(t, E.w_igr - 0.08, E.E4 + 0.4, 0.25, 0.2);
    o.eyes = t > E.w_ves - 0.1 && t < E.w_ves + 0.6 ? 0 : 1; o.mouth = 1; o.look = [0.2, 0.3];
    o.wave = win(t, E.E4 - 0.55, E.E4 + 2, 0.15, 0.2);
  }
  if (t >= E.E4 - 0.15) { // улетает вдаль
    const u = easeIn(prog(t, E.E4 - 0.15, E.E4 + 1.3));
    x += 900 * u; y -= 700 * u; o.s = 0.8 * (1 - 0.8 * u);
  }
  return { x, y, o };
}

// утёс: лицо и настроение
function blinkK(t) {
  let k = 1;
  for (const b of [E.L5 + 1.0, E.L6 + 1.3, E.L7 + 0.4, E.fin + 1.5]) { const u = prog(t, b, b + 0.22); if (u > 0 && u < 1) k *= 1 - 0.92 * Math.sin(u * Math.PI); }
  return clamp(k, 0.05, 1);
}
function utesAt(t) {
  const s = { d: dayAt(t), open: [0, 0], sad: 0, look: [0, 0.8], brow: 0, smile: 0.6, ooh: 0, wet: 0, breathe: Math.sin(t * 1.1), happy: 0 };
  const r1 = springPop(prog(t, E.w_vel - 0.12, E.w_vel + 0.9));
  s.open = [0, 0.55 * r1]; s.happy = r1; s.look = [-0.4, 0.9];
  if (t >= E.w_utrom + 0.2) { const k = springPop(prog(t, E.w_utrom + 0.2, E.w_utrom + 1.0)); s.open = [k, lerp(0.55, 1, k)]; s.happy = 1 - k; s.look = [-0.3, 0.9]; }
  if (t >= T_LAUNCH) { const k = springBounce(prog(t, T_LAUNCH, T_LAUNCH + 1.2)); s.brow = k; s.ooh = k; s.smile = 0; s.look = [0.4, -1]; }
  if (t >= T_FALL) {
    s.brow = 0; s.ooh = 0; s.happy = 0;
    s.open = [1, 1]; s.look = [0.45, -0.9];
    s.sad = 0.3 + 0.35 * sstep(prog(t, E.L5, E.L6 + 0.3));
    s.smile = lerp(0, -0.8, sstep(prog(t, E.L5, E.L6)));
  }
  if (t >= E.L6) s.look = [lerp(0.45, 0, sstep(prog(t, E.L6, E.L6 + 0.8))), lerp(-0.9, 0.2, sstep(prog(t, E.L6, E.L6 + 0.8)))];
  if (t >= E.L7) { const k = sstep(prog(t, E.L7, E.L7 + 0.8)); s.open = [lerp(1, 0.6, k), lerp(1, 0.6, k)]; s.sad = lerp(0.65, 0.9, k); s.look = [-0.3, 0.6]; }
  if (t >= E.L8) { s.sad = 1; s.open = [0.55, 0.55]; s.look = [-0.2, 0.7]; }
  if (t >= E.fin) { const k = sstep(prog(t, E.fin, TOTAL - 0.5)); s.open = [lerp(0.55, 0.4, k), lerp(0.55, 0.4, k)]; }
  const bk = blinkK(t); s.open = [s.open[0] * bk, s.open[1] * bk];
  s.wet = sstep(prog(t, E.w_vlag - 0.1, E.w_sled + 0.25));
  return s;
}

// слеза в строке 8
function tearAt(t) {
  if (t < T_TEAR) return null;
  if (t < T_SLIDE) { const p = crackPoint(0); return { x: p[0], y: p[1], r: 13 * springPop(prog(t, T_TEAR, T_TEAR + 0.6)) }; }
  if (t < T_DROP) { const p = crackPoint(easeInOut(prog(t, T_SLIDE, T_DROP))); return { x: p[0], y: p[1], r: 13 }; }
  if (t < T_HIT) { const p = crackPoint(1), u = t - T_DROP, g = 2 * (LAND_Y - p[1]) / Math.pow(T_HIT - T_DROP, 2); return { x: p[0], y: p[1] + 0.5 * g * u * u, r: 13, fall: true }; }
  return { hit: t - T_HIT, x: crackPoint(1)[0], y: LAND_Y };
}

// камера: цепочка планов, каждый плавно перехватывает предыдущий
const SHOTS = [
  { t: 0, d: 0, e: easeInOut, f: (t) => { const k = easeInOut(prog(t, 0.2, E.V0 - 0.6)); return [lerp(160, -420, k), lerp(-1250, 430, k), lerp(0.78, 0.62, k)]; } },
  { t: E.L1 - 0.25, d: 0.7, e: springSoft, f: (t) => [55, 398, 2.2 + 0.45 * prog(t, E.L1, E.w_grud)] },
  { t: E.w_grud - 0.08, d: 0.8, e: springSoft, f: (t) => [0, 380 - 70 * prog(t, E.w_grud, E.L3), 0.64 - 0.04 * prog(t, E.w_grud, E.L3)] },
  { t: E.w_utrom - 0.15, d: 0.65, e: springSoft, f: () => [40, 250, 1.12] },
  { t: T_LAUNCH - 0.02, d: 0.45, e: easeOut, f: (t) => { const p = tuchaAt(t); return [p.x * 0.6 + 20, p.y + 150, 0.95]; } },
  { t: E.L4 - 0.15, d: 0.5, e: springSoft, f: (t) => { const p = tuchaAt(t); return [lerp(SC[0], p.x, 0.55), lerp(SC[1], p.y, 0.55) + 30, 1.05]; } },
  { t: T_FALL, d: T_LAND - T_FALL, e: easeInOut, f: (t) => [-50, 110 - 20 * prog(t, T_LAND, E.w_vlag), 1.4] },
  { t: E.w_vlag - 0.05, d: Math.max(0.6, E.w_morsh + 0.35 - E.w_vlag), e: easeInOut, f: () => [-160, 248, 3.4] },
  { t: E.L6 - 0.05, d: 0.6, e: springSoft, f: (t) => [-20, 220 - 40 * prog(t, E.L6, E.w_odin), 1.0] },
  { t: E.w_odin - 0.08, d: 0.75, e: springSoft, f: (t) => [0, 640, 0.3 - 0.03 * prog(t, E.w_odin, E.w_zad)] },
  { t: Math.max(E.w_odin + 0.9, E.w_zad - 0.45), d: 0.7, e: springSoft, f: (t) => [90 + 40 * prog(t, E.w_zad, E.L8), 80, 1.2] },
  { t: E.L8 - 0.1, d: 0.6, e: springSoft, f: () => [-135, 165, 2.1] },
  { t: T_SLIDE + 0.15, d: 0.5, e: easeInOut, f: (t) => { const tr = tearAt(Math.min(t, T_HIT - 0.01)); return [-155, tr.y - 20, lerp(2.1, 1.7, prog(t, T_SLIDE, T_DROP))]; } },
  { t: T_DROP - 0.05, d: 0.3, e: easeOut, f: (t) => { const tr = tearAt(Math.min(t, T_HIT - 0.01)); return [-172, tr.y + 60, lerp(1.7, 1.1, prog(t, T_DROP, T_HIT))]; } },
  { t: T_HIT + 0.15, d: 1.3, e: easeInOut, f: () => [-140, 560, 0.62] },
  { t: E.fin - 0.5, d: 1.5, e: easeInOut, f: () => [-900, 390, 0.42] },
];
function camChain(t, i) {
  const s = SHOTS[i], v = s.f(t);
  if (i === 0) return v;
  if (t < s.t) return camChain(t, i - 1);
  const u = s.d > 0 ? s.e(prog(t, s.t, s.t + s.d)) : 1;
  if (u >= 1 && prog(t, s.t, s.t + s.d) >= 1) return v;
  const p = camChain(t, i - 1);
  return [lerp(p[0], v[0], u), lerp(p[1], v[1], u), Math.exp(lerp(Math.log(p[2]), Math.log(v[2]), u))];
}
function camAt(t) {
  let i = 0; for (let k = 0; k < SHOTS.length; k++) if (t >= SHOTS[k].t) i = k;
  const v = camChain(t, i);
  // «живая» камера: лёгкое покачивание
  return { x: v[0] + wob(t, 0.7) * 6 / v[2], y: v[1] + wob(t, 0.9, 2) * 5 / v[2], z: v[2] };
}

// ---------- кадр ----------
function renderAt(t) {
  const c = ctx, d = dayAt(t), cam = camAt(t), U = utesAt(t), TU = tuchaAt(t);
  const horizonY = H / 2 + (1000 - cam.y) * cam.z;
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1;
  drawSky(c, cam, d);
  drawStars(c, cam, d, t);
  drawMoon(c, cam, d);
  drawSun(c, cam, d, t, horizonY);
  drawEveningStar(c, cam, d, t);
  // мир
  c.save(); c.translate(W / 2, H / 2); c.scale(cam.z, cam.z); c.translate(-cam.x, -cam.y);
  drawSkyClouds(c, cam, d, t);
  drawGround(c, cam, d);
  drawShadow(c, d);
  // перекати-поле на «Одиноко»
  const tw = prog(t, E.w_odin - 0.1, E.w_zad + 0.2);
  if (tw > 0 && tw < 1) { const x = lerp(-2200, 2400, tw); tumbleweed(c, x, 1000 - 95 + Math.abs(Math.sin(tw * 18)) * -60, 95, tw * 30, d); }
  drawUtes(c, U);
  shootingStar(c, t); // звезда летит поверх утёса и гаснет на Тучке
  // капля во влажном следе с отражением тучки
  const dk = sstep(prog(t, E.w_sled - 0.1, E.w_morsh + 0.2)) * (1 - sstep(prog(t, E.w_odin - 0.2, E.w_odin + 0.3)));
  if (dk > 0) {
    const p = crackPoint(0.62);
    c.save(); c.globalAlpha = dk; tear(c, p[0] + 4, p[1] + 6, 16 * springPop(prog(t, E.w_sled - 0.1, E.w_sled + 0.8)));
    c.save(); circle(c, p[0] + 4, p[1] + 6, 13); c.clip();
    drawTucha(c, p[0] + 4 + Math.sin(t * 2) * 2, p[1] + 4, { s: 0.055, rot: 0, eyes: 1, mouth: 1, wave: 1, ears: 0, heart: 0, glow: 0, squash: 0, t }, d);
    c.restore();
    sparkle(c, p[0] - 4, p[1] - 4, 9 + 4 * Math.sin(t * 6), dk, "#ffffff");
    c.restore();
  }
  // тучка
  const tk = TU.o;
  if (t < T_LAUNCH + 2) {
    // золотой след при взлёте
    if (t > T_LAUNCH && t < E.L4 + 1.0) for (let i = 1; i <= 8; i++) { const q = tuchaAt(t - i * 0.05); sparkle(c, q.x + Math.sin(i * 2.1) * 40, q.y + 60, 22 - i * 2, 0.9 - i * 0.1, "#ffe27a"); }
  }
  drawTucha(c, TU.x, TU.y, tk, d);
  zzz(c, TU.x + 70, TU.y - 60, t, t < E.w_utrom + 0.1 ? 1 - sstep(prog(t, E.w_utrom - 0.2, E.w_utrom + 0.1)) : 0);
  bang(c, TU.x + 70, TU.y - 80, t > E.w_utrom + 0.25 && t < T_LAUNCH + 0.1 ? springPop(prog(t, E.w_utrom + 0.25, E.w_utrom + 1.0)) : 0, t);
  // блики на «золотая»
  for (let i = 0; i < 6; i++) { const a = E.w_zol - 0.1 + i * 0.09, k = bump(t, a, 0.8); if (k > 0) sparkle(c, REST[0] + Math.cos(i * 2.4) * 110, REST[1] - 20 + Math.sin(i * 2.4) * 60, 26 * k * 2, 1, "#fffbe0"); }
  // утёс открывает глаз на «великана»: сердечко-блик
  const vk = bump(t, E.w_vel, 1.2); if (vk > 0) sparkle(c, EYE_R[0] + 60, EYE_R[1] - 50, 40 * vk * 2, 1, "#fffbe0");
  // чайки в лазури
  if (t > E.L4 - 0.6 && t < E.E4 + 1.2) for (let i = 0; i < 3; i++) gull(c, SC[0] - 1000 + (t - E.L4 + 0.6) * 520 + i * 170, SC[1] - 230 + i * 110 + Math.sin(t * 2 + i) * 20, 0.8 - i * 0.12, t, i * 1.7);
  // облако-мысль: воспоминание о ночи
  const th = win(t, E.w_zad - 0.1, E.L8 + 0.1, 0.6, 0.35);
  if (th > 0) {
    const bx = 440, by = -190, r = 170;
    thought(c, bx, by, r, prog(t, E.w_zad - 0.1, E.w_zad + 0.7) * (th < 1 && t > E.L8 - 0.3 ? th : 1), [200, -110]);
    const k = sstep(prog(t, E.w_zad + 0.15, E.w_zad + 0.6)) * th;
    if (k > 0) {
      c.save(); c.globalAlpha *= k; ell(c, bx, by, r * 0.88, r * 0.62); c.clip();
      c.fillStyle = "#1d2866"; c.fillRect(bx - r, by - r, 2 * r, 2 * r);
      for (let i = 0; i < 9; i++) { c.fillStyle = "#fffbe6"; circle(c, bx - 140 + i * 37, by - 80 + (i * 53) % 50, 2.5); c.fill(); }
      c.translate(bx - 10, by + 30); c.scale(0.24, 0.24); c.translate(-40, -330);
      drawUtes(c, { d: 0, open: [0, 0.4], sad: 0, look: [-0.4, 0.9], brow: 0, smile: 0.7, ooh: 0, wet: 0, breathe: 0, happy: 1 });
      drawTucha(c, REST[0], REST[1], { s: 0.8, rot: 0, eyes: 0, mouth: -1, wave: 0, ears: 0, heart: 0, glow: 0.7, squash: Math.sin(t * 1.6) * 0.03, t }, 0);
      c.restore();
    }
  }
  // слеза
  const tr = tearAt(t);
  if (tr && tr.hit === undefined) tear(c, tr.x, tr.y, tr.r);
  if (tr && tr.hit !== undefined) {
    const h = tr.hit, k = Math.max(0, 1 - h / 1.6);
    c.save(); c.globalAlpha = k; c.strokeStyle = "#cfefff"; c.lineWidth = 6;
    for (let i = 0; i < 3; i++) { const q = Math.max(0, h - i * 0.18); if (q <= 0) continue; ell(c, tr.x, tr.y, 30 + q * 260, 8 + q * 60); c.stroke(); }
    c.restore();
    glow(c, tr.x, tr.y - 20, 260, "rgba(190,235,255,0.8)", k);
    for (let i = 0; i < 6; i++) sparkle(c, tr.x + Math.cos(i * 1.05) * (60 + h * 160), tr.y - 30 - Math.abs(Math.sin(i * 1.05)) * (40 + h * 120), 20 * k, k, "#ffffff");
  }
  // финал: далёкая золотая тучка у горизонта
  const fk = sstep(prog(t, E.fin - 0.6, E.fin + 0.8));
  if (fk > 0) drawTucha(c, -2300 + (t - E.fin) * 25, 860 + Math.sin(t * 1.4) * 8, { s: 0.55 * fk, rot: 0, eyes: 0, mouth: 0, wave: 0, ears: 0, heart: 0, glow: 0.8, squash: 0, t }, d);
  c.restore();
  // экранные эффекты
  speedLines(c, ...toScreen(cam, TU.x, TU.y), win(t, T_LAUNCH - 0.05, T_LAUNCH + 0.5, 0.05, 0.3) * 0.8, 4, t, "#ffffff");
  rushLines(c, win(t, T_LAUNCH + 0.1, E.L4 + 0.1, 0.15, 0.3) * 0.7, t, -1);
  rushLines(c, win(t, T_FALL - 0.02, T_LAND + 0.1, 0.1, 0.2) * 0.75, t, 1);
  vignette(c, d);
  captionsPlate(c, t);
  textAt(t);
}

function shootingStar(c, t) {
  if (t < STAR0 || t > STAR1 + 0.4) return;
  const P = (u) => { const q = u * 0.55 + 0.45 * u * u, m = 1 - q; return [m * m * 1300 + 2 * m * q * 1250 + q * q * REST[0], m * m * -900 + 2 * m * q * 330 + q * q * (REST[1] - 20)]; };
  const u = prog(t, STAR0, STAR1);
  if (u < 1) {
    for (let i = 12; i >= 0; i--) { const p = P(Math.max(0, u - i * 0.018)); c.globalAlpha = (1 - i / 13) * 0.9; c.fillStyle = "#fff6c8"; circle(c, p[0], p[1], 16 - i); c.fill(); }
    c.globalAlpha = 1; const p = P(u); glow(c, p[0], p[1], 120, "rgba(255,240,180,0.9)", 1); sparkle(c, p[0], p[1], 46, 1, "#ffffff");
  } else {
    const k = 1 - prog(t, STAR1, STAR1 + 0.4);
    for (let i = 0; i < 8; i++) { const a = i * TAU / 8; sparkle(c, REST[0] + Math.cos(a) * (60 + 160 * (1 - k)), REST[1] + Math.sin(a) * (40 + 100 * (1 - k)), 28 * k, k, "#fff6c8"); }
  }
}
function vignette(c, d) {
  const g = c.createRadialGradient(W / 2, H / 2, 420, W / 2, H / 2, 1180);
  g.addColorStop(0, "rgba(10,12,40,0)"); g.addColorStop(1, `rgba(10,12,40,${(0.5 - 0.25 * sstep(d / 0.8) + 0.2 * sstep((d - 2) / 0.8)).toFixed(3)})`);
  c.fillStyle = g; c.fillRect(0, 0, W, H);
}

// ---------- плашка строк ----------
function captionsPlate(c, t) {
  const k = sstep(prog(t, E.L1 - 0.6, E.L1 - 0.1)) * (1 - sstep(prog(t, E.fin - 0.3, E.fin + 0.05)));
  if (k <= 0) return;
  c.save(); c.globalAlpha = k;
  rrect(c, 150, 822, 1620, 166, 26); c.fillStyle = "rgba(14,18,54,0.8)"; c.fill(); c.lineWidth = 4; c.strokeStyle = "rgba(255,210,90,0.5)"; c.stroke();
  rrect(c, 150, 822, 16, 166, 8); c.fillStyle = "#ffd25a"; c.fill();
  sparkle(c, 1730, 852, 16 + 4 * Math.sin(t * 3), 0.9, "#ffd25a");
  c.restore();
}

// ---------- текст ----------
const NL = Object.keys(E).filter((k) => /^L\d+$/.test(k)).length;
const CAPS = [...document.querySelectorAll(".cap")].map((el) => ({ el, n: +el.dataset.n, last: "" }));
const WORDS = [...document.querySelectorAll(".cap .w")].map((el) => ({ el, at: +el.dataset.at, last: -1 }));
const ROWS = [834, 906];
function capState(n, t) {
  // строка появляется снизу, со следующей строкой поднимается; на новом блоке и в финале — исчезает
  const B = CFG.blocks.find((b) => n >= b[0] && n <= b[1]);
  const Ln = (k) => E["L" + k];
  const next = n < B[1] ? Ln(n + 1) : null;
  const endBlock = B[1] < NL ? Ln(B[1] + 1) - 0.3 : E.fin - 0.35;
  let y = ROWS[1], op = sstep(prog(t, Ln(n) - 0.12, Ln(n) + 0.05));
  if (next !== null) y = lerp(ROWS[1], ROWS[0], springSoft(prog(t, next - 0.12, next + 0.6)));
  op *= 1 - sstep(prog(t, endBlock, endBlock + 0.25));
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
    w.el.style.transform = u >= 1 ? "none" : `translate(0px, ${((1 - s) * 30).toFixed(1)}px)`;
  }
  const ti = win(t, 0.45, E.V0 - 0.25, 0.4, 0.3), tf = sstep(prog(t, E.fin + 0.3, E.fin + 0.85));
  setTitle("tt1", ti, 0.45, t); setTitle("tt2", tf, E.fin + 0.3, t);
}
const TT = {};
function setTitle(id, k, t0, t) {
  const el = TT[id] || (TT[id] = document.getElementById(id)); if (!el) return;
  const s = springPop(prog(t, t0, t0 + 1.0));
  el.style.opacity = k <= 0 ? "0" : k.toFixed(3); el.style.transform = `translate(0px, ${((1 - s) * -90).toFixed(1)}px) scale(${(0.8 + 0.2 * s).toFixed(3)})`;
}

const seek = (t) => renderAt(t);
buildWorld();
window.addEventListener("hf-seek", (e) => seek(e.detail.time));
seek(0);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => seek(0));

const tl = gsap.timeline({ paused: true });
tl.set({}, {}, TOTAL);
window.__timelines = window.__timelines || {};
window.__timelines["main"] = tl;
