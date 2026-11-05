// ---------- Кадр: стол, доска, блюдо, роспись, кисть, текст ----------
const ctx = document.getElementById("scene").getContext("2d");
const stageEl = document.getElementById("stage");
const RIM = [0.25, 2.35]; // кисть обходит ободок
const RIM_A0 = -Math.PI / 2;

// орнамент ободка: ягодка и две «капельки» по кругу
const ORN = []; for (let i = 0; i < 28; i++) ORN.push({ a: RIM_A0 + (i + 0.5) * TAU / 28, i });
function drawRim(c, t) {
  const u = sstep(prog(t, ...RIM)); if (u <= 0) return;
  const a1 = RIM_A0 + TAU * u;
  c.save(); c.translate(PC.x, PC.y);
  // золотой ободок
  c.strokeStyle = goldFill(c); c.lineCap = "round";
  c.lineWidth = 22; c.beginPath(); c.arc(0, 0, (R_GOLD + R_OUT - 8) / 2 + 1, RIM_A0, a1); c.stroke();
  c.lineWidth = 3.5; c.beginPath(); c.arc(0, 0, R_ORN, RIM_A0, a1); c.stroke();
  c.lineWidth = 2; c.beginPath(); c.arc(0, 0, R_GOLD - 4, RIM_A0, a1); c.stroke();
  c.strokeStyle = "rgba(255,248,215,0.55)"; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, R_OUT - 15, RIM_A0, a1); c.stroke();
  // орнамент появляется следом за кистью
  for (const o of ORN) {
    const tt = RIM[0] + (RIM[1] - RIM[0]) * ((o.a - RIM_A0) / TAU), k = springPop(prog(t, tt + 0.1, tt + 1.1));
    if (k <= 0) continue;
    const rr = (R_ORN + R_GOLD) / 2 - 2, x = Math.cos(o.a) * rr, y = Math.sin(o.a) * rr, ta = o.a + Math.PI / 2;
    if (o.i % 2 === 0) berry(c, x, y, 8.5, k, 1);
    else { c.fillStyle = C.cream; c.beginPath(); c.arc(x, y, 4.2 * k, 0, TAU); c.fill(); }
    drop(c, x + Math.cos(ta) * 11, y + Math.sin(ta) * 11, ta, 15, 7, goldFill(c), k, 0.35);
    drop(c, x - Math.cos(ta) * 11, y - Math.sin(ta) * 11, ta + Math.PI, 15, 7, goldFill(c), k, -0.35);
  }
  c.restore();
}

// золотая рамка доски и ягодки по углам
function drawBoard(c, t) {
  c.drawImage(boardC, BX - 40, BY - 40);
  const u = sstep(prog(t, 0.45, 2.3)); if (u <= 0) return;
  const per = 2 * (BW - 60 + BH - 60);
  c.save(); c.strokeStyle = goldFill(c); c.lineWidth = 4; c.setLineDash([per * u, per]);
  c.beginPath(); c.roundRect(BX + 22, BY + 22, BW - 44, BH - 44, 14); c.stroke();
  c.lineWidth = 1.6; c.setLineDash([per * u, per]); c.beginPath(); c.roundRect(BX + 32, BY + 32, BW - 64, BH - 64, 10); c.stroke();
  c.restore();
  const corners = [[BX + 56, BY + 56, 0.785], [BX + BW - 56, BY + 56, 2.356], [BX + BW - 56, BY + BH - 56, -2.356], [BX + 56, BY + BH - 56, -0.785]];
  corners.forEach(([x, y, a], i) => {
    const k = springPop(prog(t, 1.4 + i * 0.12, 2.4 + i * 0.12)); if (k <= 0) return;
    drop(c, x, y, a - 0.6, 30, 10, goldFill(c), k, 0.3, 0.4); drop(c, x, y, a + 0.6, 30, 10, goldFill(c), k, -0.3, 0.4);
    berry(c, x + Math.cos(a) * 6, y + Math.sin(a) * 6, 9, k, 1);
  });
}
// узор под названием: ягодки и капельки
function titleOrnament(c, y, t0, t, alpha) {
  if (alpha <= 0) return;
  c.save(); c.globalAlpha *= alpha;
  const x = 1450;
  for (const s of [-1, 1]) {
    const k = springPop(prog(t, t0 + 0.1, t0 + 1.1));
    drop(c, x + s * 30, y, s > 0 ? 0 : Math.PI, 70, 12, goldFill(c), k, 0.25 * s, 0.4);
    drop(c, x + s * 30, y, s > 0 ? -0.5 : Math.PI + 0.5, 34, 9, C.red, k, -0.2 * s);
  }
  const k = springPop(prog(t, t0, t0 + 1));
  berry(c, x - 12, y - 6, 11, k); berry(c, x + 12, y - 6, 11, k); berry(c, x, y + 12, 11, k);
  c.restore();
}

// кисть: обходит ободок на заставке, потом расписывает росток и ствол
function brushAt(t) {
  if (t < RIM[1] + 0.6) {
    const u = sstep(prog(t, ...RIM)), a = RIM_A0 + TAU * u, r = (R_GOLD + R_OUT - 8) / 2;
    let x = PC.x + Math.cos(a) * r, y = PC.y + Math.sin(a) * r, al = sstep(prog(t, 0.0, 0.3));
    const off = sstep(prog(t, RIM[1], RIM[1] + 0.6)); x += off * 260; y -= off * 360; al *= 1 - off;
    return { x, y, a: 0.45, al };
  }
  const a0 = TM.grass[0] - 0.55, a1 = TM.trunk[1] + 0.1;
  if (t < a0 || t > a1 + 0.6) return null;
  let x, y;
  if (t < TM.trunk[0]) { // приходит снизу справа и пишет травку, затем росток
    const u = sstep(prog(t, a0, TM.grass[0])), w = prog(t, TM.grass[0], TM.trunk[0]);
    const gx = PC.x + lerp(-70, 70, sstep(w)), gy = PC.y + 300 - 40 * Math.sin(Math.PI * w);
    x = lerp(PC.x + 320, gx, u); y = lerp(PC.y + 560, gy, u);
  } else { // ведёт ствол вверх
    const q = along(TRUNK, TRUNK_L, sstep(prog(t, ...TM.trunk)));
    x = PC.x + q.x; y = PC.y + q.y;
  }
  const off = sstep(prog(t, a1, a1 + 0.6)); x += off * 300; y += off * 120;
  return { x, y, a: 0.5, al: sstep(prog(t, a0, a0 + 0.25)) * (1 - off) };
}

function drawGlint(c, t) {
  const u = prog(t, EV.glint, EV.glint + 1.1); if (u <= 0 || u >= 1) return;
  c.save(); c.beginPath(); c.arc(PC.x, PC.y, R_OUT, 0, TAU); c.clip();
  c.globalCompositeOperation = "lighter";
  const x = lerp(PC.x - 700, PC.x + 700, sstep(u)), g = c.createLinearGradient(x - 160, 0, x + 160, 0);
  g.addColorStop(0, "rgba(255,230,190,0)"); g.addColorStop(0.5, `rgba(255,236,200,${0.16 * Math.sin(Math.PI * u)})`); g.addColorStop(1, "rgba(255,230,190,0)");
  c.translate(x, PC.y); c.rotate(0.45); c.translate(-x, -PC.y);
  c.fillStyle = g; c.fillRect(x - 160, PC.y - 700, 320, 1400);
  c.restore();
}

// ---------- Текст: слова «пишутся» слева направо под голос ----------
const WORDS = [...document.querySelectorAll(".w")].map((el) => ({ el, at: parseFloat(el.dataset.at), d: parseFloat(el.dataset.d), last: -1 }));
const SHEETS = {}; for (const el of document.querySelectorAll(".sheet")) SHEETS[el.id] = { el, op: "" };
function setOp(id, op) { const s = SHEETS[id]; if (!s) return; const v = op.toFixed(3); if (s.op !== v) { s.el.style.opacity = v; s.op = v; } }
function textAt(t) {
  for (const w of WORDS) {
    const a = clamp((t - w.at) / w.d, 0, 1), key = Math.round(a * 300); if (key === w.last) continue; w.last = key;
    // clip-path только на время, пока слово пишется
    w.el.style.opacity = a > 0 ? "1" : "0";
    w.el.style.clipPath = a > 0 && a < 1 ? `inset(-20% ${((1 - a) * 100).toFixed(2)}% -20% 0)` : "";
  }
  setOp("card1s", 1 - sstep(prog(t, EV.L1 - 0.75, EV.L1 - 0.3)));
  setOp("sh1", 1 - sstep(prog(t, EV.q_out, EV.q_oute)));
  setOp("sh2", 1 - sstep(prog(t, EV.a_out, EV.a_oute)));
  setOp("card2s", 1);
}

function renderAt(t) {
  ctx.reset();
  ctx.drawImage(deskC, 0, 0);
  drawBoard(ctx, t);
  ctx.drawImage(plateC, PC.x - 500, PC.y - 500);
  ctx.save(); ctx.translate(PC.x, PC.y);
  ctx.beginPath(); ctx.arc(0, 0, R_FIELD, 0, TAU); ctx.clip();
  drawDawn(ctx, t);
  drawSketch(ctx, t);
  drawTree(ctx, t);
  drawSun(ctx, t);
  ctx.restore();
  drawRim(ctx, t);
  ctx.drawImage(sheenC, PC.x - 500, PC.y - 500);
  drawGlint(ctx, t);
  // узоры под названием на заставке и в финале
  titleOrnament(ctx, 522, 1.5, t, 1 - sstep(prog(t, EV.L1 - 0.75, EV.L1 - 0.3)));
  titleOrnament(ctx, 522, EV.fin + 0.9, t, 1);
  const b = brushAt(t); if (b) brush(ctx, b.x, b.y, b.a, b.al);
  textAt(t);
  // лёгкий наезд на заставке и медленный в финале
  let z = 1;
  if (t < EV.L1) z = 1 + 0.02 * sstep(t / EV.L1) ; else if (t < EV.L1 + 0.8) z = lerp(1.02, 1, sstep(prog(t, EV.L1, EV.L1 + 0.8)));
  else if (t > EV.fin) z = 1 + 0.03 * sstep(prog(t, EV.fin, TOTAL));
  stageEl.style.transform = z === 1 ? "none" : `scale(${z.toFixed(5)})`;
}

const seek = (t) => renderAt(t);
window.addEventListener("hf-seek", (e) => seek(e.detail.time));
seek(0);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => seek(0));

const tl = gsap.timeline({ paused: true });
tl.set({}, {}, TOTAL);
window.__timelines = window.__timelines || {};
window.__timelines["main"] = tl;
