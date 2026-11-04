// Расписание сцен: что лежит на песочном столе в момент t. Времена — из timings.json через EV.
const E = EV;

// ---------- 0. Титр: песок сыплется струйкой и складывается в буквы ----------
const TROWS = [
  { text: "Зимняя дорога", px: 128, y: 470, a: 0.05, b: 2.3 },
  { text: "Александр Сергеевич Пушкин", px: 52, y: 590, a: 2.3, b: 3.7 },
  { text: "1826", px: 46, y: 668, a: 3.5, b: 4.1 },
];
const TC = mkCanvas(W, H), tc = TC.getContext("2d"), TS = mkCanvas(W, H), ts = TS.getContext("2d");
function prepTitle() {
  tc.clearRect(0, 0, W, H); tc.fillStyle = "#000"; tc.textAlign = "center";
  for (const r of TROWS) { tc.font = FONT(r.px); r.w = tc.measureText(r.text).width; tc.fillText(r.text, 960, r.y); }
}
const revX = (r, t) => lerp(960 - r.w / 2 - 30, 960 + r.w / 2 + 100, sstep(prog(t, r.a, r.b)));
function sceneTitle(c, t) {
  ts.globalCompositeOperation = "source-over"; ts.clearRect(0, 0, W, H); ts.drawImage(TC, 0, 0);
  ts.globalCompositeOperation = "destination-in";
  for (const r of TROWS) {
    const x = revX(r, t), g = ts.createLinearGradient(x - 70, 0, x + 10, 0);
    g.addColorStop(0, "rgba(0,0,0,0.95)"); g.addColorStop(1, "rgba(0,0,0,0)");
    ts.save(); ts.beginPath(); ts.rect(0, r.y - r.px, W, r.px * 1.35); ts.clip(); ts.fillStyle = g; ts.fillRect(0, 0, W, H); ts.restore();
  }
  c.globalCompositeOperation = "source-over"; c.drawImage(TS, 0, 0);
  // струйка песка сверху в точку, где сейчас ложатся буквы
  sand(c, 0.85);
  for (const [k, r] of TROWS.entries()) {
    grains(c, t, r.a - 0.3, r.b - 0.05, 260, (i, bt, rr) => { const x = revX(r, bt + 0.3) - 30 + 14 * rr(1); return { x, y: -10, vx: 6 * (rr(2) - 0.5), vy: 1300, g: 0, life: (r.y - r.px * 0.4 + 10) / 1300, s: 2 + 2.5 * rr(3) }; }, 20 + k);
  }
  // горка у точки падения
  for (const r of TROWS) { if (t < r.a || t > r.b) continue; sand(c, 0.5); blob(c, revX(r, t), r.y - r.px * 0.3, r.px * 0.35, 0.5); }
}

// ---------- 1. Сквозь волнистые туманы пробирается луна ----------
const M1 = (t) => ({ x: 1380, y: lerp(340, 190, sstep(prog(t, E.L2 - 0.4, E.E2 + 0.3))), r: 60 });
function groundCover(c, u) {
  if (u >= 1) return;
  const X = lerp(-160, W + 160, u);
  c.save(); c.beginPath(); c.moveTo(W + 20, HOR - 30);
  for (let y = HOR - 30; y <= BAND_Y + 20; y += 14) c.lineTo(X + 40 * Math.sin(y * 0.03) + 20 * Math.sin(y * 0.09), y);
  c.lineTo(W + 20, BAND_Y + 20); c.closePath(); c.clip();
  sand(c, 0.8); c.fillRect(-10, HOR, W + 20, BAND_Y - HOR + 20); c.restore();
}
function fogs(c, t, m, dimOnMoon = 1, n = 3) {
  const B = [[318, 22, -0.12, 56, 0.3, 2.2], [384, 18, 0.1, 64, 0.28, 4.1], [250, 26, 0.16, 70, 0.3, 0.5]].slice(0, n);
  for (const b of B) fogBand(c, t, ...b);
  if (m && dimOnMoon > 0) for (const b of B) fogOverMoon(c, t, m.x, m.y, m.r, b[0], b[1], b[2], b[3] * 0.8, 0.45 * dimOnMoon, b[5]);
}
function scene1(c, t) {
  sky(c); const m = M1(t);
  moon(c, m.x, m.y, m.r);
  fogs(c, t, m, 1 - sstep(prog(t, E.L2, E.E2 + 0.5)) * 0.75);
  groundCover(c, sstep(prog(t, E.w_pol - 0.35, E.w_pol + 1.1)));
  glades(c, 1);
  moonBeam(c, m.x, m.y + m.r, sstep(prog(t, E.w_lyet - 0.2, E.w_lyet + 1.3)));
  band(c, t);
}

// ---------- 2. По дороге зимней, скучной тройка борзая бежит ----------
const MOON = { x: 1380, y: 190, r: 60 };
const TR2 = (t) => ({ x: lerp(-260, 820, springSoft(prog(t, E.w_troi - 0.5, E.w_troi + 2.0) * 2.5)) + 30 * Math.sin(t * 0.7), y: BAND_Y - 18, s: 0.86 });
const scroll = (t) => (t - E.sw1a) * 220;
function soundRings(c, t, x, y, a, b, period, rmax, k = 1, seed = 0) {
  for (let i = 0; a + i * period < b; i++) {
    const age = t - (a + i * period); if (age < 0 || age > 1.2) continue;
    const u = age / 1.2, r = 12 + rmax * u, al = (1 - u) * 0.75 * k;
    c.lineWidth = 4 * (1 - u) + 1.5;
    c.save(); c.beginPath(); c.rect(-10, -10, W + 20, HOR + 4); c.clip(); carve(c, al); c.beginPath(); c.arc(x, y, r, Math.PI * 0.95, Math.PI * 2.05); c.stroke(); c.restore();
    c.save(); c.beginPath(); c.rect(-10, HOR + 4, W + 20, H); c.clip(); sand(c, al * 0.6); c.beginPath(); c.arc(x, y, r, Math.PI * 0.95, Math.PI * 2.05); c.stroke(); c.restore();
  }
}
function scene2(c, t) {
  sky(c); moon(c, MOON.x, MOON.y, MOON.r);
  fogs(c, t, MOON, 0.25, 2);
  glades(c, 1, scroll(t) * 0.5);
  road(c, sstep(prog(t, E.w_dor - 0.4, E.w_dor + 1.0)), scroll(t));
  if (t > E.w_troi - 0.5) {
    const p = TR2(t), ph = t * TAU * 1.9;
    hoofSnow(c, t, p.x, p.y, p.s, E.w_troi - 0.5, E.tx2 + 2, 51);
    const ring = sstep(prog(t, E.w_kol - 0.2, E.w_kol + 0.3));
    troika(c, p.x, p.y, p.s, ph, 1, 0, ring, t);
    if (t > E.w_kol - 0.1) soundRings(c, t, p.x + 46 * p.s, p.y - 166 * p.s, E.w_kol - 0.1, E.tx2 + 1.5, 0.55, 150, 1, 1);
  }
  band(c, t);
}

// ---------- 3. Что-то слышится родное в долгих песнях ямщика ----------
const M3 = { x: 1330, y: 350, r: 160 };
function scene3(c, t) {
  sky(c); moon(c, M3.x, M3.y, M3.r);
  fogs(c, t, null, 0, 2);
  glades(c, 1, scroll(t) * 0.5);
  const sing = bump(t, E.L9 - 0.2, E.E12 + 0.3, 0.3);
  driverBig(c, 1380, BAND_Y + 14, 0.95, t, sing);
  const u = sstep(prog(t, E.w_pes - 0.5, E.w_pes + 2.2));
  const curl = sstep(prog(t, E.w_raz - 0.25, E.w_raz + 0.7)) * (1 - sstep(prog(t, E.w_tos - 0.6, E.w_tos)));
  const droop = sstep(prog(t, E.w_tos - 0.5, E.w_tos + 1.2));
  songLines(c, t, 1290, 352, u, curl, droop);
  // снежные вихри удали
  if (curl > 0) { carve(c, 0.8 * curl); for (let i = 0; i < 40; i++) { const a = t * (1.6 + hash(i, 3)) + i, rr = 40 + 120 * hash(i, 4), cx = 380 + 320 * hash(i, 5), cy = 250 + 90 * hash(i, 6); c.fillRect(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.6, 5, 5); } }
  // сердце тоски: процарапывается и осыпается
  const hu = sstep(prog(t, E.w_tos - 0.2, E.w_tos + 0.6)), hk = sstep(prog(t, E.E12 + 0.1, E.E12 + 1.2));
  if (hu > 0 && hk < 1) {
    c.save(); c.setLineDash([700 * hu, 800]); heart(c, 600, 300 + 40 * hk, 120); carve(c, 0.9 * (1 - hk)); c.lineWidth = 9; c.stroke(); c.restore();
    if (hk > 0) { carve(c, 0.85); grains(c, t, E.E12 + 0.1, E.E12 + 1.2, 220, (i, bt, r) => { const a = r(1) * TAU; return { x: 600 + Math.cos(a) * 90, y: 290 + Math.sin(a) * 70, vx: 20 * (r(2) - 0.5), vy: 40, g: 260, life: 0.9, s: 3 + 3 * r(3) }; }, 33); }
  }
  band(c, t);
}

// ---------- 4. Ни огня, ни чёрной хаты… только вёрсты полосаты ----------
const M4 = { x: 1560, y: 160, r: 44 };
function scene4(c, t) {
  sky(c, 0.92); moon(c, M4.x, M4.y, M4.r);
  fogs(c, t, M4, 0.4, 2);
  glades(c, 1);
  // огонёк вспыхнул и погас
  const f = bump(t, E.w_ogn - 0.05, E.w_ogn + 1.05, 0.2);
  if (f > 0) { carve(c, 1); blob(c, 600, HOR - 4, 90 * f, 0.7 * f); disk(c, 600, HOR - 4, 12 * f); }
  // изба сложилась и рассыпалась
  const ha = sstep(prog(t, E.w_hat - 0.25, E.w_hat + 0.25)) * (1 - sstep(prog(t, E.w_hat + 0.55, E.w_hat + 1.5)));
  hut(c, 1150, HOR + 136, 0.95, ha);
  if (t > E.w_hat + 0.5) { sand(c, 0.85); grains(c, t, E.w_hat + 0.5, E.w_hat + 1.5, 260, (i, bt, r) => ({ x: 1150 - 76 + 152 * r(1), y: HOR + 136 - 124 * r(2), vx: 30 * (r(3) - 0.3), vy: 10, g: 500, life: 0.55, s: 2 + 3 * r(4) }), 44); }
  // глушь и снег
  carve(c, 0.85);
  grains(c, t, E.w_sneg - 1.5, E.tx4 + 3, 70, (i, bt, r) => ({ x: -100 + (W + 200) * r(1) + 30 * Math.sin(bt * 3 + i), y: -12, vx: -30 - 40 * r(2), vy: 70 + 60 * r(3), g: 0, life: 7, s: 4 + 4 * r(4) }), 45);
  // вёрсты навстречу, справа налево
  if (t > E.w_vyo - 0.6) for (let k = 0; k < 4; k++) { const x = 2060 - (t - (E.w_vyo - 0.6)) * 520 + k * 900; if (x > -100 && x < 2100) verst(c, x, BAND_Y - 8, 0.95); }
  band(c, t);
}

// ---------- 5. Завтра, Нина… я забудусь у камина ----------
const nina = (t) => sstep(prog(t, E.w_nin - 0.1, E.w_nin + 0.7));
const poet = (t) => sstep(prog(t, E.w_zag - 0.1, E.w_zag + 0.7));
function scene5(c, t, clock = false) {
  const lit = sstep(prog(t, E.w_zav - 0.3, E.w_zav + 0.9));
  room(c, lerp(0.72, 0.34, lit));
  // остывший камин проступает сразу, на «Завтра» огонь разгорается из угольков
  fireplace(c, t, springSoft(prog(t, E.sw4a, E.sw4b + 0.6) * 1.6), bump(t, E.w_kam - 0.1, E.w_kam + 1.8, 0.4), lerp(0.14, 1, lit));
  const n = nina(t), p = poet(t);
  profile(c, 1540, BAND_Y + 30 * (1 - n), 0.95, -1, "nina", 0.97 * n);
  profile(c, 380, BAND_Y + 30 * (1 - p), 0.95, 1, "poet", 0.97 * p);
  band(c, t);
}

// ---------- 6. Звучно стрелка часовая мерный круг свой совершит ----------
const CL = { x: 960, y: 200, r: 100 };
function clockAt(t) {
  const loop = sstep(prog(t, E.w_kru - 0.2, E.E22 + 0.2));
  return { m: -TAU * 0.12 - TAU + TAU * loop + TAU * 0.12 * sstep(prog(t, E.L23, E.w_pol2)), h: lerp(-0.42, 0, sstep(prog(t, E.L21, E.w_pol2))), trail: loop * (1 - sstep(prog(t, E.E22 + 0.2, E.E22 + 1.2))) };
}
function scene6(c, t, withClock = true) {
  room(c, 0.34);
  fireplace(c, t, 1, 0);
  profile(c, 1540, BAND_Y, 0.95, -1, "nina", 0.97);
  profile(c, 380, BAND_Y, 0.95, 1, "poet", 0.97);
  // докучные гости по бокам от камина — сдуваются песком
  const gu = prog(t, E.w_dok - 0.1, E.w_dok + 1.1);
  for (const [i, x, dir, kind] of [[0, 590, -1, "hat"], [1, 1332, 1, "bon"]]) {
    const k = sstep(gu * 1.3 - i * 0.2); if (k >= 1) continue;
    c.save(); c.translate(x + dir * 70 * k, BAND_Y); c.scale(1.45, 1.45); sand(c, 0.93 * (1 - k));
    if (kind === "hat") { // господин во фраке и цилиндре
      poly(c, [[-14, 0], [-6, -46], [6, -46], [14, 0], [20, 0], [14, -60], [24, -64], [22, -96], [-22, -96], [-26, -60], [-36, -10], [-22, -40], [-20, 0]]); c.fill();
      disk(c, 0, -110, 15); c.fillRect(-12, -158, 24, 38); c.fillRect(-19, -124, 38, 5);
    } else {               // дама в платье и капоре
      poly(c, [[-34, 0], [34, 0], [16, -58], [18, -92], [-18, -92], [-16, -58]]); c.fill();
      disk(c, 0, -106, 14); c.beginPath(); c.ellipse(-dir * 4, -112, 22, 20, 0, Math.PI * 0.9, Math.PI * 2.1); c.fill();
    }
    c.restore();
  }
  if (gu > 0) { sand(c, 0.8); grains(c, t, E.w_dok - 0.1, E.w_dok + 1.1, 300, (j, bt, r) => { const right = r(6) > 0.5, x = right ? 1332 : 590; return { x: x - 40 + 80 * r(1), y: BAND_Y - 220 * r(2), vx: (right ? 1 : -1) * (260 + 360 * r(3)), vy: -50 - 90 * r(4), g: 50, life: 0.9, s: 2 + 3 * r(5) }; }, 61); }
  if (withClock) {
    const k = springPop(prog(t, E.sw5a, E.sw5b + 0.4) * 1.6), s = clockAt(t);
    if (k > 0.01) {
      c.save(); c.translate(CL.x, CL.y + 116); c.scale(k, k); c.translate(-CL.x, -CL.y - 116);
      sand(c, 0.95); poly(c, [[CL.x - 130, CL.y + 120], [CL.x + 130, CL.y + 120], [CL.x + 112, CL.y + 30], [CL.x - 112, CL.y + 30]]); c.fill();
      clockFace(c, CL.x, CL.y, CL.r, s.m, s.h, s.trail);
      c.restore();
    }
    // полночь: от часов расходятся кольца
    if (t > E.w_pol2 - 0.1) { sand(c, 1); for (let i = 0; i < 3; i++) { const a = t - E.w_pol2 - i * 0.35; if (a < 0 || a > 1.2) continue; c.lineWidth = 5 * (1 - a / 1.2) + 1; sand(c, 0.5 * (1 - a / 1.2)); c.beginPath(); c.arc(CL.x, CL.y, CL.r + 26 + 160 * a / 1.2, 0, TAU); c.stroke(); } }
  }
  band(c, t);
}

// ---------- 7. Грустно, Нина: путь мой скучен… отуманен лунный лик ----------
const M7 = { x: 1560, y: 170, r: 56 };
const TR7 = (t) => {
  const f = sstep(prog(t, E.en7 + 0.4, E.total - 0.6));
  return { x: lerp(860, 1300, f) + 24 * Math.sin(t * 0.5), y: lerp(BAND_Y - 18, HOR + 70, Math.pow(f, 0.8)), s: lerp(0.78, 0.14, Math.pow(f, 0.7)) };
};
function scene7(c, t, withMoon = true) {
  const fin = sstep(prog(t, E.en7 + 0.6, E.en7 + 2.2));
  sky(c, lerp(0.95, 0.97, fin));
  const dim = sstep(prog(t, E.w_otu - 0.2, E.w_otu + 1.4)) * 0.75;
  if (withMoon) moon(c, M7.x, M7.y, M7.r, dim);
  const B = [[300, 24, 0.12, 64, 0.3, 0.7], [376, 18, -0.1, 56, 0.32, 2.6]];
  for (const b of B) fogBand(c, t, ...b);
  // туман наползает на луну
  const fz = sstep(prog(t, E.w_otu - 0.4, E.w_otu + 1.6));
  if (fz > 0 && withMoon) { fogBand(c, t, M7.y + 70 - 70 * fz, 16, 0.2, 54, 0.28 * fz, 1.1, M7.x - 420, M7.x + 420); fogOverMoon(c, t, M7.x, M7.y, M7.r, M7.y + 70 - 74 * fz, 16, 0.2, 52, 0.4 * fz, 1.1); }
  glades(c, 1, (t - E.sw6a) * 70);
  road(c, 1, (t - E.sw6a) * 90);
  const p = TR7(t), ph = t * TAU * 0.95;
  const nod = sstep(prog(t, E.w_dre - 0.1, E.w_dre + 0.9)) * (0.85 + 0.15 * Math.sin(t * 1.3));
  const ring = 0.5 * sstep(prog(t, E.w_kol2 - 0.2, E.w_kol2 + 0.3));
  troika(c, p.x, p.y, p.s, ph, 0, nod, ring, t * 0.6);
  if (t > E.w_kol2 - 0.1 && t < E.tx7 + 1.5) soundRings(c, t, p.x + 46 * p.s, p.y - 166 * p.s, E.w_kol2 - 0.1, E.tx7 + 0.3, 0.9, 90, 0.6, 2);
  band(c, t);
}

// ---------- Финал: название процарапано в небе, автор — в полосе ----------
function finalText(c, t) {
  const a = E.en7 + 1.0;
  if (t < a) return;
  c.save(); c.textAlign = "left"; c.textBaseline = "alphabetic";
  const rows = [{ text: "Зимняя дорога", px: 122, y: 268, a }, { text: "Александр Сергеевич Пушкин · 1826", px: 48, y: 872, a: a + 0.9 }];
  for (const r of rows) {
    c.font = FONT(r.px); const w = c.measureText(r.text).width, x0 = 960 - w / 2, u = sstep(prog(t, r.a, r.a + 1.3));
    if (u <= 0) continue;
    c.save(); c.beginPath(); c.rect(x0 - 10, r.y - r.px * 1.1, (w + 20) * u, r.px * 1.5); c.clip();
    carve(c, 1); c.fillText(r.text, x0, r.y);
    carve(c, 0.18); c.lineWidth = r.px * 0.08; c.lineJoin = "round"; c.strokeText(r.text, x0, r.y);
    c.restore();
  }
  c.restore();
}

// ---------- Свет стола ----------
const warmAt = (t) => clamp(sstep(prog(t, E.sw4a, E.sw4b)) * 0.4 + sstep(prog(t, E.w_zav - 0.3, E.w_zav + 0.9)) * 0.6 - sstep(prog(t, E.sw6a, E.sw6b)), 0, 1);

// ---------- Кадр ----------
const MORPH = (t) => { const u = sstep(prog(t, E.sw6a, E.sw6b)); return { x: lerp(CL.x, M7.x, u), y: lerp(CL.y, M7.y, u), r: lerp(CL.r, M7.r, u) }; };
function drawScene(c, t) {
  if (t < E.sw1a) return sweep(c, t, E.sw0a, E.sw0b, sceneTitle, scene1, -20, H + 20, 1);
  if (t < E.sw2a) return sweep(c, t, E.sw1a, E.sw1b, scene1, scene2, -20, H + 20, 2);
  if (t < E.sw3a) return sweep(c, t, E.sw2a, E.sw2b, scene2, scene3, -20, H + 20, 3);
  if (t < E.sw4a) return sweep(c, t, E.sw3a, E.sw3b, scene3, scene4, -20, H + 20, 4);
  if (t < E.sw5a) return sweep(c, t, E.sw4a, E.sw4b, scene4, scene5, -20, H + 20, 5);
  if (t < E.sw6a) return sweep(c, t, E.sw5a, E.sw5b, scene5, scene6, -20, H + 20, 6);
  if (t < E.sw6b) {
    sweep(c, t, E.sw6a, E.sw6b, (cc, tt) => scene6(cc, tt, false), (cc, tt) => scene7(cc, tt, false), -20, H + 20, 7);
    const m = MORPH(t); moon(c, m.x, m.y, m.r, 0); return;
  }
  return scene7(c, t);
}
function renderAt(t) {
  t = clamp(t, 0, TOTAL - 1e-3);
  mh.setTransform(1, 0, 0, 1, 0, 0); mh.globalCompositeOperation = "source-over"; mh.clearRect(0, 0, W / 2, H / 2);
  mh.setTransform(0.5, 0, 0, 0.5, 0, 0);
  drawScene(mh, t);
  mf.setTransform(1, 0, 0, 1, 0, 0); mf.globalCompositeOperation = "source-over"; mf.clearRect(0, 0, W, H);
  mf.imageSmoothingEnabled = true; mf.imageSmoothingQuality = "high"; mf.drawImage(MH, 0, 0, W, H);
  carveText(mf, t);
  finalText(mf, t);
  composite(warmAt(t));
}

let lastT = 0;
const seek = (t) => { lastT = t; renderAt(t); };
window.addEventListener("hf-seek", (e) => seek(e.detail.time));
prepTitle(); seek(0);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { LAYOUT = null; prepTitle(); seek(lastT); });

const tl = gsap.timeline({ paused: true });
tl.set({}, {}, TOTAL);
window.__timelines = window.__timelines || {};
window.__timelines["main"] = tl;
