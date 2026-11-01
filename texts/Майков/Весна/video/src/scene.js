// Расписание: что и когда пишется на блюде. Всё — функция времени t.
const ctx = document.getElementById("scene").getContext("2d");
const ov = document.getElementById("top").getContext("2d");

// ---------- Заставка ----------
const INTRO = [{ x: 304, y: 430, r: 92, t: 0.6 }, { x: 1616, y: 430, r: 92, t: 0.8 }, { x: 424, y: 756, r: 60, t: 1.0 }, { x: 1496, y: 756, r: 60, t: 1.15 }];
const INTRO_LEAVES = [];
for (const f of INTRO) for (let i = 0; i < 5; i++) { const b = i / 5 * TAU + 0.5; INTRO_LEAVES.push({ x: f.x + Math.cos(b) * f.r * 0.8, y: f.y + Math.sin(b) * f.r * 0.8, a: b, L: f.r * 1.05, t: f.t + 0.08 }); }

// ---------- Земля ----------
function ground(c, t) {
  if (t < EV.L1 - 0.15) return;
  const u = sstep(prog(t, EV.L1 - 0.15, EV.L1 + 1.2));
  c.save(); inPath(c, 2); c.clip();
  { const X = lerp(70, 1860, u); c.beginPath(); c.moveTo(0, 780); for (let y = 780; y <= H; y += 12) c.lineTo(X + 10 * Math.sin(y * 0.11) + (y - 780) * 0.34, y); c.lineTo(0, H); c.closePath(); c.clip(); }
  c.beginPath(); c.moveTo(100, H); for (let x = 100; x <= 1830; x += 14) c.lineTo(x, GROUND(x)); c.lineTo(1830, H); c.closePath();
  const g = c.createLinearGradient(0, 820, 0, 1010); g.addColorStop(0, "rgba(90,135,225,.72)"); g.addColorStop(1, "rgba(205,222,252,.5)"); c.fillStyle = g; c.fill();
  c.beginPath(); for (let x = 100; x <= 1830; x += 14) { if (x === 100) c.moveTo(x, GROUND(x)); else c.lineTo(x, GROUND(x)); } c.strokeStyle = COB; c.lineWidth = 7; c.stroke();
  for (let x = 330; x < 1630; x += 92) { gs(c, x, GROUND(x) + 26, 72, 15, -0.05, 1, 0.04, 1, PAL_SKY); ga(c, x + 46, GROUND(x) + 82, 18, 3.4, 5.9, 5, 1, PAL_SKY); }
  c.restore();
}

// ---------- Ростки на «первые» ----------
const SPROUTS = [[668, 0], [742, 0.1], [812, 0.2], [870, 0.28], [918, 0.36], [430, 0.18], [612, 0.1]].map(([x, d]) => ({ x, t: EV.per + d }));
function sprouts(c, t) {
  for (const s of SPROUTS) { if (t < s.t) continue; const y = GROUND(s.x) + 3, sw = 0.05 * Math.sin(t * 1.5 + s.x); leaf(c, s.x, y, 70, 30, -2.0 + sw, t, s.t); leaf(c, s.x, y, 82, 32, -1.57 + sw, t, s.t + 0.05, 0); leaf(c, s.x, y, 70, 30, -1.14 + sw, t, s.t + 0.1, -0.08); }
}

// ---------- Счастье: розы волной ----------
const HAPPY = [
  { x: 290, y: 420, r: 88 }, { x: 362, y: 668, r: 74 }, { x: 240, y: 560, r: 50 }, { x: 470, y: 236, r: 58 }, { x: 622, y: 232, r: 38 },
  { x: 672, y: 706, r: 64 }, { x: 1060, y: 170, r: 56 }, { x: 1290, y: 176, r: 62 }, { x: 1530, y: 238, r: 46 }, { x: 1062, y: 906, r: 52 }, { x: 1308, y: 930, r: 62 }, { x: 1540, y: 862, r: 46 },
].map((f, i) => ({ ...f, t: EV.sch - 0.08 + i * 0.1 }));
const HAPPY_LEAVES = [];
for (const f of HAPPY) for (let i = 0; i < 5; i++) { const b = i / 5 * TAU + f.x * 0.01; HAPPY_LEAVES.push({ x: f.x + Math.cos(b) * f.r * 0.82, y: f.y + Math.sin(b) * f.r * 0.82, a: b, L: f.r * 0.95, t: f.t + 0.08 }); }
// Завитки в пустотах блюда
const CURLS = [{ x: 172, y: 520, r: 26, a: 0, d: 1 }, { x: 380, y: 300, r: 26, a: 1, d: -1 }, { x: 716, y: 170, r: 28, a: 2, d: 1 }, { x: 1180, y: 130, r: 22, a: 3, d: 1 }, { x: 1418, y: 140, r: 22, a: 0.5, d: -1 }, { x: 1704, y: 390, r: 24, a: 1.5, d: 1 }, { x: 1718, y: 660, r: 24, a: 2.5, d: -1 }, { x: 1200, y: 862, r: 22, a: 0, d: 1 }, { x: 1432, y: 906, r: 22, a: 2, d: -1 }, { x: 760, y: 914, r: 24, a: 4, d: 1 }, { x: 520, y: 928, r: 24, a: 2, d: -1 }].map((q, i) => ({ ...q, t: EV.sch + 0.1 + i * 0.08 }));

// ---------- Ветка и птица ----------
const BR = [[812, GROUND(812) + 2], [868, 720], [796, 620], [824, 516]];
const PERCH = { x: 820, y: 482 };
const brU = (t) => sstep(prog(t, EV.sch, EV.ino));
function branch(c, t) {
  const u = brU(t); if (u <= 0) return;
  c.save(); c.lineCap = "round";
  for (const [lw, col] of [[11, COB], [4, MID]]) { c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); for (let i = 0; i <= 30 * u; i++) { const p = bez(BR, i / 30); if (i === 0) c.moveTo(p[0], p[1]); else c.lineTo(p[0], p[1]); } c.stroke(); }
  c.restore();
  for (const [s, d] of [[0.25, -1], [0.42, 1], [0.6, -1], [0.78, 1], [0.95, -1]]) { if (u < s) continue; const p = bez(BR, s), t0 = EV.sch + (EV.ino - EV.sch) * s; leaf(c, p[0], p[1], 92, 40, -1.57 + d * 1.0, t, t0, d * 0.08); }
}
function birdState(t) {
  const t0 = EV.ino - 0.45, t1 = EV.ino + 0.45;
  if (t < t1) { const u = sstep(prog(t, t0, t1)); return { x: lerp(1090, PERCH.x, u), y: lerp(120, PERCH.y, u) - 70 * Math.sin(u * Math.PI), flap: Math.sin(t * 24), beak: 0, rot: lerp(0.3, 0, u) }; }
  const sing = t > EV.E8 + 0.9 && t < TOTAL - 0.4 && Math.sin((t - EV.E8) * 1.05) > -0.45;
  return { x: PERCH.x, y: PERCH.y + 1.5 * Math.sin(t * 3), flap: 0, beak: sing ? 0.3 + 0.7 * Math.abs(Math.sin(t * 8)) : 0, rot: 0.02 * Math.sin(t * 2.4) };
}
const NOTES = [];
{ const r = mulberry32(90); for (let i = 0; i < 9; i++) NOTES.push({ t: EV.E8 + 1.1 + i * 0.62, dx: 40 + r() * 130, dy: -(130 + r() * 170), ph: r() * 6, s: 0.8 + r() * 0.5, dbl: r() > 0.5, c: i % 3 === 2 ? GOLDD : (i % 2 ? COB : MID) }); }

// ---------- Золотая отводка ----------
const GOLD_LEN = ELL_LEN(IN.rx - 8, IN.ry - 8), CA_LEN = ELL_LEN(CA.rx - 7, CA.ry - 7);
function goldRim(c, t) {
  const u = sstep(prog(t, EV.gre - 0.05, EV.gre + 1.3)); if (u <= 0) return;
  c.save(); c.lineCap = "butt";
  c.beginPath(); c.ellipse(D.x, D.y, IN.rx - 8, IN.ry - 8, 0, 0, TAU); c.setLineDash([GOLD_LEN * u, GOLD_LEN]); c.strokeStyle = GOLD; c.lineWidth = 8; c.stroke();
  c.beginPath(); c.ellipse(CA.x, CA.y, CA.rx - 7, CA.ry - 7, 0, 0, TAU); c.setLineDash([CA_LEN * u, CA_LEN]); c.lineWidth = 5; c.stroke();
  c.setLineDash([]); c.restore();
  // блик бежит по золоту
  if (u >= 1) { const a = (t - EV.gre) * 1.15, x = D.x + Math.cos(a) * (IN.rx - 8), y = D.y + Math.sin(a) * (IN.ry - 8), s = 22 + 6 * Math.sin(t * 5); star(c, x, y, s, "#fff3c0"); }
}

// ---------- Кисть, пока пишет ----------
function liveBrush(c, t) {
  let p = null;
  if (t < 1.3) { const a = -Math.PI / 2 + TAU * clamp(0.2 + t / 1.5, 0, 1); p = [D.x + Math.cos(a) * (D.rx - 34), D.y + Math.sin(a) * (D.ry - 34), sstep(prog(t, 1.05, 1.3))]; }
  else if (t > EV.L1 - 0.4 && t < EV.L1 + 1.05) { const q = bez(STEM, stemU(t)); p = [q[0], q[1], Math.max(1 - sstep(prog(t, EV.L1 - 0.4, EV.L1 - 0.1)), sstep(prog(t, EV.L1 + 0.8, EV.L1 + 1.05)))]; }
  else if (t > EV.L3 - 0.3 && t < EV.pod + 1.05) { const u = sstep(prog(t, EV.L3 - 0.05, EV.pod + 0.75)), x = lerp(MO.x0, MO.x1, u); p = [x, moundY(clamp(x, MO.x0 + 1, MO.x1 - 1), 0), Math.max(1 - sstep(prog(t, EV.L3 - 0.3, EV.L3 - 0.05)), sstep(prog(t, EV.pod + 0.8, EV.pod + 1.05))), 1]; }
  if (!p) return;
  // над снежком ручка идёт вверх и влево, чтобы не заходить на текст
  const away = p[2] * 340, up = p[3] ? 1 : 0, dx = up ? -0.2 : 0.74, dy = up ? -0.98 : -0.68;
  brush(c, p[0] + away * dx, p[1] + away * dy, 1, (up ? -1.77 : -0.74) + 0.05 * Math.sin(t * 15));
}

// ---------- Смывание белой глазурью ----------
const WIPES = [
  { a: EV.wipe0, b: EV.wipe0e, r: [130, 120, 1790, 960], src: "dish" },
  { a: EV.wipe1, b: EV.wipe1e, r: CA_TEXT, src: "cart" },
  { a: EV.wipe2, b: EV.wipe2e, r: CA_TEXT, src: "cart" },
];
function wipeLayer(c, t) {
  for (const w of WIPES) {
    if (t < w.a - 0.2 || t >= w.b + 0.25) continue;
    const [x0, y0, x1, y1] = w.r, u = prog(t, w.a, w.b), X = lerp(x0 - 30, x1 + 30, sstep(u));
    if (t < w.b) {
      c.save(); c.beginPath(); c.moveTo(x0, y0); for (let y = y0; y <= y1; y += 14) c.lineTo(Math.min(x1, X + 13 * Math.sin(y * 0.09) + 9 * Math.sin(y * 0.031 + t * 5)), y); c.lineTo(x0, y1); c.closePath(); c.clip();
      if (w.src === "dish") { inPath(c, 2); c.clip(); c.drawImage(bgC, 0, 0); } else c.drawImage(cartC, 0, 0);
      c.restore();
    }
    const inn = sstep(prog(t, w.a - 0.2, w.a)), out = sstep(prog(t, w.b, w.b + 0.25)), by = lerp(y0, y1, 0.5) + (y1 - y0) * 0.5 * Math.sin((t - w.a) * 17) * 0.86;
    brush(c, lerp(x0 - 90, X, inn) + out * 150, by - (1 - inn) * 280 - out * 330, 1, -0.74);
  }
}

// ---------- Текст: слова пружинят по времени ----------
const WORDS = [...document.querySelectorAll(".w")].map((el) => ({ el, at: parseFloat(el.dataset.at), last: -1 }));
function textAt(t) {
  for (const w of WORDS) {
    const a = t - w.at, k = a <= 0 ? 0 : springPop(a * 1.35), op = clamp(a / 0.08, 0, 1);
    const key = Math.round(k * 400) + (op * 100 | 0) * 1000; if (key === w.last) continue; w.last = key;
    w.el.style.opacity = op; w.el.style.transform = `translateY(${(1 - k) * 16}px) scale(${0.82 + 0.18 * k})`;
  }
}

// ---------- Кадр ----------
function renderAt(t) {
  ctx.reset(); ov.reset();
  ctx.clearRect(0, 0, W, H); ctx.drawImage(bgC, 0, 0);
  ground(ctx, t);
  drawRim(ctx, t);
  if (t < EV.wipe0e) { for (const l of INTRO_LEAVES) leaf(ctx, l.x, l.y, l.L, l.L * 0.42, l.a, t, l.t); for (const f of INTRO) rose(ctx, f, t); }
  goldRim(ctx, t);
  sun(ctx, t);
  cloud(ctx, t);
  for (const q of HAPPY_LEAVES) if (t > q.t) leaf(ctx, q.x, q.y, q.L, q.L * 0.42, q.a, t, q.t);
  for (const q of CURLS) if (t > q.t) curl(ctx, q.x, q.y, q.r, q.a, q.d, sstep(prog(t, q.t, q.t + 0.5)));
  for (const f of HAPPY) rose(ctx, f, t);
  mound(ctx, t);
  sprouts(ctx, t);
  branch(ctx, t);
  snowdrop(ctx, t);
  sparks(ctx, t);
  flakes(ctx, t);
  tears(ctx, t);
  // клеймо с текстом
  const pk = t < EV.wipe0e ? 0 : springLand((t - EV.wipe0e) * 1.5);
  if (pk > 0) { ctx.save(); ctx.translate(CA.x, CA.y); ctx.scale(lerp(0.86, 1, pk), pk); ctx.translate(-CA.x, -CA.y); ctx.drawImage(cartC, 0, 0); ctx.restore(); }
  if (t > EV.ino - 0.5) { const s = birdState(t); bird(ctx, s.x, s.y, 0.74, -1, s.flap, s.beak, s.rot); }
  for (const n of NOTES) { const a = t - n.t; if (a < 0 || a > 1.9) continue; const u = a / 1.9, k = springPop(a); ctx.save(); ctx.globalAlpha = 1 - sstep(prog(u, 0.72, 1)); noteGlyph(ctx, PERCH.x - 84 - n.dx * u + 14 * Math.sin(u * 7 + n.ph), PERCH.y - 40 + n.dy * u, n.s * k, n.c, 0.16 * Math.sin(u * 8 + n.ph), n.dbl); ctx.restore(); }
  liveBrush(ctx, t);
  ctx.drawImage(glossC, 0, 0);
  // верхний холст нужен только пока идёт кисть
  const brushOn = WIPES.some((w) => t >= w.a - 0.2 && t < w.b + 0.25);
  ov.canvas.style.display = brushOn ? "block" : "none";
  ov.clearRect(0, 0, W, H);
  if (brushOn) wipeLayer(ov, t);
  textAt(t);
}

const seek = (t) => renderAt(t);
window.addEventListener("hf-seek", (e) => seek(e.detail.time));
seek(0);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => seek(0));

const tl = gsap.timeline({ paused: true });
tl.set({}, {}, TOTAL);
window.__timelines = window.__timelines || {};
window.__timelines["main"] = tl;
