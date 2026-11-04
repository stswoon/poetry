// Расписание картин на крышке шкатулки. Времена — из timings.json через EV.
const E = EV;
const ctx = document.getElementById("scene").getContext("2d");

// ---------- 0. Титр: золотом пишется название ----------
const TROWS = [
  { text: "Зимняя дорога", px: 128, y: 330, a: 0.05, b: 2.3 },
  { text: "Александр Сергеевич Пушкин", px: 52, y: 430, a: 2.3, b: 3.7 },
  { text: "1826", px: 46, y: 500, a: 3.5, b: 4.1 },
];
function goldWrite(c, t, text, px, y, a, b, shine = true) {
  c.save(); c.font = FONT(px); const w = c.measureText(text).width, x0 = 960 - w / 2, u = sstep(prog(t, a, b)), X = x0 - 10 + (w + 20) * u;
  if (u <= 0) { c.restore(); return; }
  c.beginPath(); c.rect(x0 - 10, y - px * 1.1, X - x0 + 10, px * 1.5); c.clip();
  c.lineWidth = px * 0.06; c.strokeStyle = "rgba(0,0,0,0.6)"; c.lineJoin = "round"; c.strokeText(text, x0, y);
  c.fillStyle = goldGrad(c, 0, y - px * 0.75, 0, y + px * 0.1); c.fillText(text, x0, y);
  // блик бежит по буквам после написания
  if (shine) { const s = prog(t, b + 0.1, b + 1.1); if (s > 0 && s < 1) { const sx = lerp(x0 - 80, x0 + w + 80, s); const g = c.createLinearGradient(sx - 60, 0, sx + 60, 0); g.addColorStop(0, "rgba(255,248,220,0)"); g.addColorStop(0.5, "rgba(255,248,220,0.85)"); g.addColorStop(1, "rgba(255,248,220,0)"); c.globalCompositeOperation = "source-atop"; c.fillStyle = g; c.fillText(text, x0, y); c.globalCompositeOperation = "source-over"; } }
  c.restore();
  if (u < 1) sparkle(c, X, y - px * 0.35, px * 0.18, 1);
}
function sceneTitle(c, t) {
  for (const r of TROWS) goldWrite(c, t, r.text, r.px, r.y, r.a, r.b);
  const k = sstep(prog(t, 0.9, 2.0));
  if (k > 0) { c.save(); c.globalAlpha = k; c.beginPath(); c.moveTo(960 - 260 * k, 372); c.lineTo(960 + 260 * k, 372); gstroke(c, 2, GOLD); scroll(c, 960 - 260 * k - 16, 372, 14, 0, -1, 1.2, 2); scroll(c, 960 + 260 * k + 16, 372, 14, Math.PI, 1, 1.2, 2); sparkle(c, 960, 372, 10, 1); c.restore(); }
}

// ---------- 1. Сквозь волнистые туманы пробирается луна ----------
const M1 = (t) => ({ x: 1380, y: lerp(360, 170, sstep(prog(t, E.L2 - 0.4, E.E2 + 0.3))), r: 52 });
function scene1(c, t) {
  sky(c, t); const m = M1(t);
  moon(c, m.x, m.y, m.r, t, 0, sstep(prog(t, E.E2 - 0.4, E.E2 + 0.8)));
  fogs(c, t, 3, 0.92);
  glades(c, t, prog(t, E.w_pol - 0.3, E.w_pol + 1.6), 0, 1, M1(t).x);
  moonBeams(c, m.x, m.y, sstep(prog(t, E.w_lyet - 0.2, E.w_lyet + 1.3)));
}

// ---------- 2. По дороге зимней, скучной тройка борзая бежит ----------
const MOON = { x: 1380, y: 170, r: 52 };
const TR2 = (t) => ({ x: lerp(-200, 900, springSoft(prog(t, E.w_troi - 0.5, E.w_troi + 2.0) * 2.5)) + 26 * Math.sin(t * 0.7), y: GROUND - 30, s: 0.82 });
const scroll2 = (t) => (t - E.sw1a) * 200;
function scene2(c, t) {
  sky(c, t); moon(c, MOON.x, MOON.y, MOON.r, t);
  fogs(c, t, 2, 0.85);
  glades(c, t, 1, scroll2(t) * 0.6);
  road(c, sstep(prog(t, E.w_dor - 0.4, E.w_dor + 1.0)));
  if (t > E.w_troi - 0.5) {
    const p = TR2(t), ph = t * TAU * 1.7;
    hoofSnow(c, t, p.x, p.y, p.s, E.w_troi - 0.5, E.tx2 + 2, 51);
    troika(c, p.x, p.y, p.s, ph, 1, 0, sstep(prog(t, E.w_kol - 0.2, E.w_kol + 0.3)), t);
    if (t > E.w_kol - 0.1) soundRings(c, t, p.x + 58 * p.s, p.y - 184 * p.s, E.w_kol - 0.1, E.tx2 + 1.5, 0.55, 120, 1);
  }
}

// ---------- 3. Что-то слышится родное в долгих песнях ямщика ----------
const M3 = { x: 1300, y: 330, r: 100 };
function scene3(c, t) {
  sky(c, t); moon(c, M3.x, M3.y, M3.r, t);
  fogs(c, t, 2, 0.8);
  glades(c, t, 1, scroll2(t) * 0.6);
  const sing = bump(t, E.L9 - 0.2, E.E12 + 0.3, 0.3);
  const u = sstep(prog(t, E.w_pes - 0.5, E.w_pes + 2.2));
  const curl = sstep(prog(t, E.w_raz - 0.25, E.w_raz + 0.7)) * (1 - sstep(prog(t, E.w_tos - 0.6, E.w_tos)));
  const droop = sstep(prog(t, E.w_tos - 0.5, E.w_tos + 1.2));
  songRibbons(c, t, 1250, 410, u, curl, droop);
  if (curl > 0) for (let i = 0; i < 30; i++) { const a = t * (1.6 + hash(i, 3)) + i, rr = 40 + 110 * hash(i, 4); sparkle(c, 420 + 300 * hash(i, 5) + Math.cos(a) * rr, 260 + 80 * hash(i, 6) + Math.sin(a) * rr * 0.6, 6, curl); }
  const hu = sstep(prog(t, E.w_tos - 0.2, E.w_tos + 0.6)), hk = sstep(prog(t, E.E12 + 0.1, E.E12 + 1.2));
  if (hu > 0 && hk < 1) {
    c.save(); c.globalAlpha = hu * (1 - hk); heart(c, 560, 280 + 30 * hk, 110 * (0.6 + 0.4 * hu)); paint(c, RED, 3, GOLD); c.restore();
    if (hk > 0) particles(t, E.E12 + 0.1, E.E12 + 1.2, 120, (i, bt, r) => { const a = r(1) * TAU; return { x: 560 + Math.cos(a) * 70, y: 270 + Math.sin(a) * 55, vx: 20 * (r(2) - 0.5), vy: 30, g: 200, life: 0.9, s: 5 + 4 * r(3) }; }, 33, (x, y, k, p) => sparkle(c, x, y, p.s, 1 - k));
  }
  driverBig(c, 1360, GROUND + 50, 0.86, t, sing);
}

// ---------- 4. Ни огня, ни чёрной хаты… только вёрсты полосаты ----------
const M4 = { x: 1560, y: 150, r: 40 };
function scene4(c, t) {
  sky(c, t); moon(c, M4.x, M4.y, M4.r, t);
  fogs(c, t, 2, 0.75);
  glades(c, t, 1);
  const f = bump(t, E.w_ogn - 0.05, E.w_ogn + 1.05, 0.2);
  if (f > 0) { const g = c.createRadialGradient(600, HOR + 2, 2, 600, HOR + 2, 70 * f); g.addColorStop(0, `rgba(255,214,120,${f})`); g.addColorStop(1, "rgba(255,170,60,0)"); c.fillStyle = g; disk(c, 600, HOR + 2, 70 * f); c.fill(); sparkle(c, 600, HOR + 2, 16 * f, f); }
  const ha = sstep(prog(t, E.w_hat - 0.25, E.w_hat + 0.25)) * (1 - sstep(prog(t, E.w_hat + 0.55, E.w_hat + 1.5)));
  hut(c, 1150, HOR + 120, 0.85, ha);
  if (t > E.w_hat + 0.5) particles(t, E.w_hat + 0.5, E.w_hat + 1.5, 120, (i, bt, r) => ({ x: 1150 - 70 + 140 * r(1), y: HOR + 120 - 120 * r(2), vx: 20 * (r(3) - 0.3), vy: -20, g: -30, life: 0.9, s: 5 + 4 * r(4) }), 44, (x, y, k, p) => sparkle(c, x, y, p.s, 1 - k));
  particles(t, E.w_sneg - 1.5, E.tx4 + 3, 60, (i, bt, r) => ({ x: PIC.x + (PIC.w + 200) * r(1), y: PIC.y - 10, vx: -30 - 30 * r(2), vy: 60 + 60 * r(3), life: 8, s: 3 + 3 * r(4), gold: r(5) > 0.7 }), 45,
    (x, y, k, p) => { if (p.gold) sparkle(c, x, y, p.s * 1.6, 1); else { c.fillStyle = "#ffffff"; disk(c, x, y, p.s * 0.6); c.fill(); } });
  if (t > E.w_vyo - 0.6) for (let k = 0; k < 4; k++) { const x = 2000 - (t - (E.w_vyo - 0.6)) * 520 + k * 900; if (x > PIC.x - 60 && x < PIC.x + PIC.w + 60) verst(c, x, GROUND - 14, 0.9); }
}

// ---------- 5. Завтра, Нина… я забудусь у камина ----------
function scene5(c, t) {
  const lit = sstep(prog(t, E.w_zav - 0.3, E.w_zav + 0.9));
  room(c, t, lit);
  fireplace(c, t, springSoft(prog(t, E.sw4a, E.sw4b + 0.6) * 1.6), bump(t, E.w_kam - 0.1, E.w_kam + 1.8, 0.4), lerp(0.08, 1, lit));
  const n = sstep(prog(t, E.w_nin - 0.1, E.w_nin + 0.7)), p = sstep(prog(t, E.w_zag - 0.1, E.w_zag + 0.7));
  bust(c, 1500, GROUND - 96 + 30 * (1 - n), 1.12, -1, "nina", n);
  bust(c, 420, GROUND - 96 + 30 * (1 - p), 1.12, 1, "poet", p);
}

// ---------- 6. Звучно стрелка часовая мерный круг свой совершит ----------
const CL = { x: 960, y: 160, r: 66 };
function clockAt(t) {
  const loop = sstep(prog(t, E.w_kru - 0.2, E.E22 + 0.2));
  return { m: -TAU * 0.12 - TAU + TAU * loop + TAU * 0.12 * sstep(prog(t, E.L23, E.w_pol2)), h: lerp(-0.42, 0, sstep(prog(t, E.L21, E.w_pol2))), trail: loop * (1 - sstep(prog(t, E.E22 + 0.2, E.E22 + 1.2))) };
}
function scene6(c, t, withClock = true) {
  room(c, t, 1);
  fireplace(c, t, 1, 0, 1);
  bust(c, 1500, GROUND - 96, 1.12, -1, "nina", 1);
  bust(c, 420, GROUND - 96, 1.12, 1, "poet", 1);
  const gu = prog(t, E.w_dok - 0.1, E.w_dok + 1.1);
  for (const [i, x, kind] of [[0, 712, "hat"], [1, 1208, "bon"]]) {
    const k = sstep(gu * 1.3 - i * 0.2); if (k >= 1) continue;
    guest(c, x, GROUND - 60 - 20 * k, 1.1, kind, 1 - k);
  }
  if (gu > 0) particles(t, E.w_dok - 0.1, E.w_dok + 1.1, 160, (j, bt, r) => { const right = r(6) > 0.5, x = right ? 1208 : 712; return { x: x - 30 + 60 * r(1), y: GROUND - 60 - 170 * r(2), vx: (right ? 1 : -1) * (180 + 260 * r(3)), vy: -40 - 70 * r(4), life: 0.9, s: 5 + 5 * r(5) }; }, 61, (x, y, k, p) => sparkle(c, x, y, p.s, 1 - k));
  if (withClock) {
    const k = springPop(prog(t, E.sw5a, E.sw5b + 0.4) * 1.6), s = clockAt(t);
    if (k > 0.01) {
      c.save(); c.translate(CL.x, CL.y + 96); c.scale(k, k); c.translate(-CL.x, -CL.y - 96);
      poly(c, [[CL.x - 96, CL.y + 96], [CL.x + 96, CL.y + 96], [CL.x + 80, CL.y + 30], [CL.x - 80, CL.y + 30]]); c.fillStyle = goldGrad(c, CL.x - 96, CL.y, CL.x + 96, CL.y + 96); c.fill(); gstroke(c, 1.4, GOLD_D);
      clockFace(c, CL.x, CL.y, CL.r, s.m, s.h, s.trail);
      c.restore();
    }
    if (t > E.w_pol2 - 0.1) for (let i = 0; i < 3; i++) { const a = t - E.w_pol2 - i * 0.35; if (a < 0 || a > 1.2) continue; c.save(); c.globalAlpha = 1 - a / 1.2; disk(c, CL.x, CL.y, CL.r + 28 + 140 * a / 1.2); gstroke(c, 3 * (1 - a / 1.2) + 1, GOLD_L); c.restore(); }
  }
}

// ---------- 7. Грустно, Нина: путь мой скучен… отуманен лунный лик ----------
const M7 = { x: 1560, y: 150, r: 48 };
const TR7 = (t) => {
  const f = sstep(prog(t, E.en7 + 0.4, E.total - 0.6));
  return { x: lerp(900, 1330, f) + 20 * Math.sin(t * 0.5), y: lerp(GROUND - 30, HOR + 44, Math.pow(f, 0.8)), s: lerp(0.74, 0.13, Math.pow(f, 0.7)) };
};
function scene7(c, t, withMoon = true) {
  sky(c, t);
  const dim = sstep(prog(t, E.w_otu - 0.2, E.w_otu + 1.4)) * 0.7;
  if (withMoon) moon(c, M7.x, M7.y, M7.r, t, dim, 1 - dim);
  fogs(c, t, 2, 0.8);
  const fz = sstep(prog(t, E.w_otu - 0.4, E.w_otu + 1.6));
  if (fz > 0 && withMoon) { fogRibbon(c, t, M7.y + 64 - 60 * fz, 8, 0.2, 30, 1.1, M7.x - 200, M7.x + 300, 0.9 * fz); fogRibbon(c, t, M7.y + 26 - 44 * fz, 6, -0.15, 22, 2.4, M7.x - 150, M7.x + 260, 0.75 * fz); }
  glades(c, t, 1, (t - E.sw6a) * 60);
  road(c, 1);
  const p = TR7(t), ph = t * TAU * 0.95;
  const nod = sstep(prog(t, E.w_dre - 0.1, E.w_dre + 0.9)) * (0.85 + 0.15 * Math.sin(t * 1.3));
  troika(c, p.x, p.y, p.s, ph, 0, nod, 0.5 * sstep(prog(t, E.w_kol2 - 0.2, E.w_kol2 + 0.3)), t * 0.6);
  if (t > E.w_kol2 - 0.1 && t < E.tx7 + 1.5) soundRings(c, t, p.x + 58 * p.s, p.y - 184 * p.s, E.w_kol2 - 0.1, E.tx7 + 0.3, 0.9, 80, 0.6);
}

// ---------- Финал: название золотом в небе, автор — на плашке ----------
function finalText(c, t) {
  const a = E.en7 + 1.0;
  if (t < a) return;
  c.save(); picPath(c); c.clip(); goldWrite(c, t, "Зимняя дорога", 112, 230, a, a + 1.3); c.restore();
  goldWrite(c, t, "Александр Сергеевич Пушкин · 1826", 46, 880, a + 0.9, a + 2.2, false);
}

// ---------- Кадр ----------
const MORPH = (t) => { const u = sstep(prog(t, E.sw6a, E.sw6b)); return { x: lerp(CL.x, M7.x, u), y: lerp(CL.y, M7.y, u), r: lerp(CL.r, M7.r, u) }; };
function drawScene(c, t) {
  if (t < E.sw1a) return sweep(c, t, E.sw0a, E.sw0b, sceneTitle, scene1, 1);
  if (t < E.sw2a) return sweep(c, t, E.sw1a, E.sw1b, scene1, scene2, 2);
  if (t < E.sw3a) return sweep(c, t, E.sw2a, E.sw2b, scene2, scene3, 3);
  if (t < E.sw4a) return sweep(c, t, E.sw3a, E.sw3b, scene3, scene4, 4);
  if (t < E.sw5a) return sweep(c, t, E.sw4a, E.sw4b, scene4, scene5, 5);
  if (t < E.sw6a) return sweep(c, t, E.sw5a, E.sw5b, scene5, scene6, 6);
  if (t < E.sw6b) {
    sweep(c, t, E.sw6a, E.sw6b, (cc, tt) => scene6(cc, tt, false), (cc, tt) => scene7(cc, tt, false), 7);
    const m = MORPH(t), u = prog(t, E.sw6a, E.sw6b);
    if (u < 0.5) clockFace(c, m.x, m.y, m.r, 0, 0, 0); else moon(c, m.x, m.y, m.r, t, 0, (u - 0.5) * 2);
    return;
  }
  return scene7(c, t);
}
function renderAt(t) {
  t = clamp(t, 0, TOTAL - 1e-3);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  ctx.drawImage(BG, 0, 0);
  ctx.save(); picPath(ctx); ctx.clip(); drawScene(ctx, t); ctx.restore();
  drawFrame(ctx, t);
  goldText(ctx, t);
  finalText(ctx, t);
}

let lastT = 0;
const seek = (t) => { lastT = t; renderAt(t); };
window.addEventListener("hf-seek", (e) => seek(e.detail.time));
seek(0);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { LAYOUT = null; seek(lastT); });

const tl = gsap.timeline({ paused: true });
tl.set({}, {}, TOTAL);
window.__timelines = window.__timelines || {};
window.__timelines["main"] = tl;
