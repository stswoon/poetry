// ---------- Сцены: заставка → доска → арена → повтор → видеопроверка → итог → финал ----------
const ctx = document.getElementById("scene").getContext("2d");
const E = EV;

// позиции героев в общем плане (мировые координаты)
const P = { swan: [1000, 285], rak: [300, 714], pike: [1650, 728] };
const HOOK_F = [CARTX + CART.front[0], GROUND + CART.front[1]], HOOK_R = [CARTX + CART.rear[0], GROUND + CART.rear[1]];
const START = E.green; // свисток старта: от него идут часы матча
const STRAIN = [E.green, E.L12]; // тянут изо всех сил
const tired = (t) => sstep(prog(t, E.L12, E.L12 + 0.9));

// ---------- Камера ----------
const SHOTS = [
  // [время, cx, cy, zoom]
  [0, 980, 545, 1.05],
  [E.L5, 980, 545, 1.05], [E.L6 - 0.2, 1000, 535, 1.1], [E.L6 + 0.3, 980, 545, 1.05],
  [E.L8 - 0.1, 980, 545, 1.05], [E.L8 + 0.6, 1000, 565, 1.08], [E.L9 - 0.3, 1000, 565, 1.08],
  // повтор: Лебедь, Рак, Щука крупно, затем общий
  [E.L9 - 0.05, P.swan[0] + 60, P.swan[1] + 80, 1.75], [E.L10 - 0.25, P.swan[0] + 60, P.swan[1] + 40, 1.8],
  [E.L10 + 0.05, P.rak[0] + 40, P.rak[1] - 110, 1.8], [E.w_shch2 - 0.25, P.rak[0] + 20, P.rak[1] - 110, 1.85],
  [E.w_shch2 + 0.05, P.pike[0], P.pike[1] - 90, 1.7], [E.w_vodu + 0.3, P.pike[0] + 20, P.pike[1] - 70, 1.75],
  [E.w_vodu + 0.7, 980, 545, 1.05], [E.L12, 980, 545, 1.05], [E.fin, 960, 480, 0.94], [TOTAL, 960, 470, 0.98],
];
function cam(t) {
  let a = SHOTS[0], b = SHOTS[SHOTS.length - 1];
  for (let i = 0; i < SHOTS.length - 1; i++) if (t >= SHOTS[i][0] && t <= SHOTS[i + 1][0]) { a = SHOTS[i]; b = SHOTS[i + 1]; break; }
  if (t > b[0]) a = b;
  const u = easeInOut(prog(t, a[0], b[0]));
  let cx = lerp(a[1], b[1], u), cy = lerp(a[2], b[2], u), z = lerp(a[3], b[3], u);
  // тряска при натуге
  const sh = win(t, STRAIN[0] + 0.2, STRAIN[1], 0.4, 0.3) * (t < E.L9 - 0.3 || t > E.E10 + 0.4 ? 1 : 0.3);
  cx += wob(t, 31) * 5 * sh; cy += wob(t, 27, 2) * 4 * sh;
  return { cx, cy, z };
}

// ---------- Герои на арене ----------
function heroState(t) {
  const sIn = prog(t, E.L6 - 0.15, E.w_troe + 0.35), rIn = prog(t, E.L6, E.w_vpr), pIn = prog(t, E.w_troe - 0.2, E.w_vpr - 0.05);
  const strain = win(t, STRAIN[0], STRAIN[1], 0.3, 0.4), tr = tired(t);
  const replay = t > E.L9 - 0.3 && t < E.L11;
  // Лебедь: влетает сверху справа, бьёт крыльями; на «облака» рвётся вверх
  const up = sstep(prog(t, E.w_obl - 0.2, E.w_obl + 0.5)) * (1 - sstep(prog(t, E.E10 + 0.2, E.E10 + 0.8)));
  const sx = lerp(P.swan[0] - 60, P.swan[0], easeOut(sIn)) + wob(t, 13) * 6 * strain, sy = lerp(-420, P.swan[1], easeOut(sIn)) - up * 70 + Math.sin(t * 9) * 8 * strain + tr * 275;
  const flapSpeed = 4 + strain * 9 + up * 6;
  const swanO = { flap: tr > 0.5 ? 0.1 : 0.5 + 0.5 * Math.sin(t * flapSpeed), fly: tr < 0.5, rot: -0.12 - up * 0.25 + tr * 0.1, tired: tr, neck: -up * 0.3 };
  // Рак: приползает слева, пятится; на «назад» отползает ещё
  const back = sstep(prog(t, E.w_nazad - 0.2, E.w_nazad + 0.5)) * (1 - sstep(prog(t, E.E10 + 0.2, E.E10 + 0.8)));
  const rx = lerp(-320, P.rak[0], easeOut(rIn)) - wob(t, 17, 1) * 6 * strain - back * 40, ry = P.rak[1];
  const rakO = { walk: t * (6 + strain * 14 + back * 10) * (1 - tr), claw: 0.4 + 0.4 * Math.sin(t * 7) * (1 - tr), tired: tr, rot: tr * 0.05 };
  // Щука: выпрыгивает из пруда; на «в воду» ныряет носом вниз
  const dive = sstep(prog(t, E.w_vodu - 0.25, E.w_vodu + 0.35)) * (1 - sstep(prog(t, E.E10 + 0.3, E.E10 + 0.9)));
  let px = P.pike[0], py = P.pike[1], prot = 0.08;
  if (pIn < 1) { const q = pIn; px = lerp(P.pike[0] + 160, P.pike[0], q); py = lerp(P.pike[1] + 90, P.pike[1], q) - Math.sin(q * Math.PI) * 230; prot = lerp(-0.7, 0.08, q); }
  py += Math.sin(t * 11) * 5 * strain + dive * 40 + tr * 18; px += wob(t, 19, 3) * 6 * strain + dive * 40; prot += dive * 0.5 + strain * Math.sin(t * 13) * 0.05 + tr * 0.06;
  const pikeO = { tail: t * (5 + strain * 16), mouth: 0.3 + 0.3 * Math.sin(t * 8) * (1 - tr) + tr * 0.5, rot: prot, tired: tr };
  return { sx, sy, swanO, sIn, rx, ry, rakO, rIn, px, py, pikeO, pIn, strain, replay, up, back, dive, tr };
}

// верёвка: от крюка к герою; snap 0..1 — прищёлкнулась, slack — провисание
function rope(c, a, b, snap, slack) {
  if (snap <= 0) return;
  const s = springSnap(snap), ex = lerp(a[0], b[0], clamp(s, 0, 1.05)), ey = lerp(a[1], b[1], clamp(s, 0, 1.05));
  const mx = (a[0] + ex) / 2, my = (a[1] + ey) / 2 + slack * 90 + (1 - clamp(s, 0, 1)) * 40;
  c.save(); c.lineCap = "round";
  for (const [col, lw] of [[C.ink, 13], ["#e8c98a", 7]]) { c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); c.moveTo(a[0], a[1]); c.quadraticCurveTo(mx, my, ex, ey); c.stroke(); }
  c.restore();
}

function drawArena(c, t) {
  const h = heroState(t);
  const { cx, cy, z } = cam(t);
  c.save();
  c.translate(W / 2, H / 2); c.scale(z, z); c.translate(-cx, -cy);
  c.drawImage(arenaC, WX0, WY0);
  clouds(c, t); flags(c, t); pondRipples(c, t);
  // воз: поклажа падает на «поклажей», дрожит при натуге, колёса дёргаются на «ходу»
  const load = prog(t, E.w_pokl - 0.15, E.w_voz + 0.35);
  const jerk = win(t, E.w_hodu - 0.1, E.w_hodu + 0.6, 0.1, 0.3);
  const shake = (wob(t, 40) * 3 * h.strain + Math.sin(t * 50) * 4 * jerk) * (1 - h.tr);
  cart(c, CARTX, GROUND, 1, { load: t < E.L5 - 0.3 ? 0 : load, shake, rock: Math.sin(t * 30) * (h.strain * 0.5 + jerk * 2) });
  dust(c, CARTX - 118, GROUND, t, h.strain * 0.8 + jerk);
  dust(c, CARTX + 126, GROUND, t + 0.4, h.strain * 0.8 + jerk);
  // верёвки
  const snap = prog(t, E.w_vpr - 0.05, E.w_vpr + 0.45), slack = 1 - h.strain * 0.9 + h.tr * 0.9;
  const swanEnd = [h.sx - 30, h.sy + 40], rakEnd = [h.rx + 175, h.ry + 12], pikeEnd = [h.px - 70, h.py - 6];
  rope(c, HOOK_F, swanEnd, h.sIn >= 1 ? snap : 0, slack * 0.4);
  rope(c, HOOK_R, rakEnd, h.rIn >= 1 ? snap : 0, slack * 0.5);
  rope(c, HOOK_F, pikeEnd, h.pIn >= 1 ? snap : 0, slack * 0.6);
  // герои
  if (h.rIn > 0) { rak(c, h.rx, h.ry, 0.92, h.rakO); sweat(c, h.rx + 80, h.ry - 110, t, h.strain * (1 - h.tr) + h.tr * 0.6, 0.3); }
  if (h.pIn > 0) {
    pike(c, h.px, h.py, 0.85, h.pikeO); pondFront(c, t);
    sweat(c, h.px + 120, h.py - 80, t, h.strain * (1 - h.tr), 0.6);
    splash(c, P.pike[0] + 10, P.pike[1] - 4, prog(t, E.w_vpr - 0.15, E.w_vpr + 0.75));
    splash(c, h.px + 120, P.pike[1] - 4, prog(t, E.w_vodu - 0.05, E.w_vodu + 0.8));
  }
  if (h.sIn > 0) {
    speedLines(c, h.sx, h.sy + 20, -Math.PI / 2, h.up, t);
    swan(c, h.sx, h.sy, 0.85, h.swanO); sweat(c, h.sx + 110, h.sy - 170, t, h.strain * (1 - h.tr), 0.1);
  }
  // телестратор (повтор): стрелки по словам и круг вокруг воза
  if (t > E.L9 - 0.3 && t < E.L12 + 0.2) {
    const fade = 1 - sstep(prog(t, E.L11 + 0.1, E.L11 + 0.45));
    c.save(); c.globalAlpha = fade;
    teleArrow(c, P.swan[0] - 210, P.swan[1] + 40, P.swan[0] - 210, P.swan[1] - 190, prog(t, E.w_obl - 0.1, E.w_obl + 0.35));
    teleArrow(c, P.rak[0] + 120, P.rak[1] - 150, P.rak[0] - 210, P.rak[1] - 150, prog(t, E.w_nazad - 0.1, E.w_nazad + 0.35));
    teleArrow(c, P.pike[0] + 60, P.pike[1] - 120, P.pike[0] + 230, P.pike[1] + 30, prog(t, E.w_vodu - 0.1, E.w_vodu + 0.35));
    teleCircle(c, CARTX + 40, GROUND - 120, 300, 170, prog(t, E.w_vodu + 0.6, E.w_vodu + 1.1));
    c.restore();
  }
  c.restore();
}

// ---------- Доска: предматчевый анализ (строки 1–3) ----------
function drawBoardScene(c, t) {
  studioBg(c, t);
  const z = 1 + 0.05 * prog(t, E.V0 - 0.3, E.L4);
  c.save(); c.translate(960, 430); c.scale(z, z); c.translate(-960, -430);
  c.drawImage(boardC, BOARD.x - 20, BOARD.y - 20);
  // ярлык
  slant(c, BOARD.x + BOARD.w - 420, BOARD.y - 34, 450, 56, 16); c.fillStyle = C.yellow; c.fill();
  c.fillStyle = C.navy; font(c, 34); c.textAlign = "left"; c.textBaseline = "middle"; c.fillText("ПРЕДМАТЧЕВЫЙ АНАЛИЗ", BOARD.x + BOARD.w - 390, BOARD.y - 4);
  // фишки: вместе → разлетаются на «согласья нет»
  const apart = springPop(prog(t, E.w_net - 0.2, E.w_net + 0.9));
  const knot = prog(t, E.w_muka - 0.35, E.w_muka + 0.7);
  const shakeK = sstep(prog(t, E.w_muka - 0.2, E.w_muka + 0.2));
  const home = { swan: [910, 400], rak: [1000, 400], pike: [955, 475] }, far = { swan: [960, 210], rak: [620, 470], pike: [1300, 560] };
  const pos = {}; for (const k of ["swan", "rak", "pike"]) pos[k] = [lerp(home[k][0], far[k][0], apart), lerp(home[k][1], far[k][1], apart)];
  // меловые стрелки в три стороны
  const ar = prog(t, E.w_net + 0.1, E.w_net + 0.8);
  chalkArrow(c, 960, 420, 960, 300, ar); chalkArrow(c, 940, 440, 720, 465, ar); chalkArrow(c, 980, 450, 1200, 530, ar);
  // клубок на «мука»
  if (knot > 0) {
    const pts = []; for (let i = 0; i <= 160; i++) { const q = i / 160, a = q * TAU * 5.5; const r = 40 + 50 * Math.sin(q * 13) + q * 30; pts.push([960 + Math.cos(a) * r * 1.3, 440 + Math.sin(a * 1.1) * r * 0.8]); }
    chalkPath(c, pts, knot, 7);
  }
  for (const k of ["swan", "rak", "pike"]) chip(c, pos[k][0], pos[k][1], k, springPop(prog(t, E.V0 - 0.2 + (k === "rak" ? 0.12 : k === "pike" ? 0.24 : 0), E.V0 + 0.8)), wob(t, 30, k.length) * 5 * shakeK);
  // красный крест на «не пойдёт»
  const xk = prog(t, E.w_poidet - 0.15, E.w_poidet + 0.6);
  if (xk > 0) {
    const s = lerp(2.4, 1, springSnap(xk));
    c.save(); c.translate(960, 430); c.rotate(-0.12); c.scale(s, s); c.globalAlpha = clamp(xk * 4, 0, 1) * (1 - 0.5 * sstep(prog(t, E.w_muka - 0.3, E.w_muka + 0.3)));
    c.lineCap = "round"; for (const [col, lw] of [[C.navy, 70], [C.red, 50]]) { c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); c.moveTo(-170, -170); c.lineTo(170, 170); c.moveTo(170, -170); c.lineTo(-170, 170); c.stroke(); }
    c.restore();
  }
  c.restore();
}

// ---------- Заставка и финал (подложки под HTML-титры) ----------
function titlePlate(c, t, k, big) {
  if (k <= 0) return;
  const s = springSnap(k);
  c.save(); c.translate(lerp(-1600, 0, s), 0);
  const y = big ? 130 : 360, h = big ? 300 : 280;
  slant(c, 260, y, 1400, h, 60); c.fillStyle = "rgba(11,26,58,0.96)"; c.fill();
  slant(c, 260, y + h - 14, 1380, 14, 4); c.fillStyle = C.yellow; c.fill();
  slant(c, 300, y - 40, 340, 56, 16); c.fillStyle = C.red; c.fill();
  c.fillStyle = "#fff"; font(c, 34); c.textAlign = "left"; c.textBaseline = "middle"; c.fillText(big ? "ИТОГИ МАТЧА" : "СЕГОДНЯ В ЭФИРЕ", 330, y - 10);
  c.restore();
}
function introStripes(c, t) {
  // полосы пролетают и оставляют фон
  const cols = [C.yellow, C.red, C.navy3];
  cols.forEach((col, i) => { const u = prog(t, 0.0 + i * 0.1, 0.75 + i * 0.1); if (u <= 0 || u >= 1) return; const x = lerp(-1500, 2100, easeInOut(u)); slant(c, x, 0, 900, H, 380); c.fillStyle = col; c.fill(); });
}

// ---------- Текст ----------
const CAPS = [...document.querySelectorAll(".cap")].map((el) => ({ el, n: +el.dataset.n, last: "" }));
const WORDS = [...document.querySelectorAll(".cap .w")].map((el) => ({ el, at: +el.dataset.at, last: -1 }));
const ROW = [826, 896];
function capState(n, t) {
  // строка появляется снизу, со следующей строкой поднимается, на третьей исчезает; на новом блоке и в финале — исчезает
  const B = CFG.blocks.find((b) => n >= b[0] && n <= b[1]);
  const Ln = (k) => E["L" + k];
  const next = n < B[1] ? Ln(n + 1) : null, next2 = n + 1 < B[1] ? Ln(n + 2) : null;
  const endBlock = B[1] < 12 ? Ln(B[1] + 1) - 0.42 : E.fin - 0.35;
  let y = ROW[1], op = sstep(prog(t, Ln(n) - 0.12, Ln(n) + 0.05));
  if (next !== null) y = lerp(ROW[1], ROW[0], springSoft(prog(t, next - 0.12, next + 0.6)));
  if (next2 !== null && next2 - 0.12 < endBlock) {
    const u = sstep(prog(t, next2 - 0.12, next2 + 0.16));
    y -= 72 * u; op *= 1 - u;
  }
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
  // титры: заставка и финал
  const ti = win(t, 0.55, E.V0 - 0.45, 0.45, 0.25), tf = sstep(prog(t, E.fin + 0.25, E.fin + 0.8));
  setTitle("tt1", ti, 0.55, t); setTitle("tt2", tf, E.fin + 0.25, t);
}
const TT = {};
function setTitle(id, k, t0, t) {
  const el = TT[id] || (TT[id] = document.getElementById(id)); if (!el) return;
  const s = springSnap(prog(t, t0, t0 + 0.8));
  const v = k <= 0 ? "0" : k.toFixed(3);
  el.style.opacity = v; el.style.transform = `translate(${((1 - s) * -260).toFixed(1)}px, 0px)`;
}

// ---------- Кадр ----------
function renderAt(t) {
  ctx.reset();
  const boardOn = t >= E.wipe1 + 0.3 && t < E.wipe2 + 0.3;
  if (t < E.wipe1 + 0.3) { studioBg(ctx, t); introStripes(ctx, t); titlePlate(ctx, t, win(t, 0.4, E.V0 - 0.45, 0.6, 0.25), false); }
  else if (boardOn) drawBoardScene(ctx, t);
  else {
    drawArena(ctx, t);
    // карточки участников (строка 4) → улетают в табло
    for (let i = 0; i < 3; i++) {
      const w = [E.w_leb, E.w_rak, E.w_shch][i];
      playerCard(ctx, t, i, prog(t, w - 0.2, w + 0.9), prog(t, E.L5 - 0.25 + i * 0.08, E.L5 + 0.45 + i * 0.08));
    }
    if (t < E.L5 + 0.6) { ctx.save(); ctx.globalAlpha = 0.55 * (1 - sstep(prog(t, E.L5 - 0.25, E.L5 + 0.4))); ctx.fillStyle = C.navy; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    replayFrame(ctx, t, win(t, E.L9 - 0.25, E.L11 + 0.1, 0.2, 0.3));
    // табло
    const st = {
      pull: [0, 1, 2].map((i) => Math.min(sstep(prog(t, E.w_lezut - 0.3 + i * 0.15, E.w_vozu + 0.2 + i * 0.1)), 1 - tired(t) * 0.9) * (0.96 + 0.04 * Math.sin(t * 20 + i))),
      blink: win(t, E.w_voz - 0.05, E.w_voz + 0.7, 0.05, 0.05) + win(t, E.w_hodu - 0.1, E.L8 + 0.4, 0.05, 0.05) + win(t, E.w_nyne - 0.1, TOTAL, 0.05, 0.05),
      clock: t < START ? 0 : (t - START) * 7, lights: win(t, E.red1 - 0.1, E.green + 0.7, 0.15, 0.3),
      light: [t >= E.green ? 2 : t >= E.red1 ? 1 : 0, t >= E.green ? 2 : t >= E.red2 ? 1 : 0, t >= E.green ? 2 : 0],
    };
    scoreboard(ctx, t, prog(t, E.L5 - 0.05, E.L5 + 0.7) * (1 - sstep(prog(t, E.fin - 0.2, E.fin + 0.2))) * (1 - win(t, E.L11 - 0.05, E.L12 + 0.1, 0.25, 0.3)), st);
    weightPanel(ctx, t, prog(t, E.L8 - 0.1, E.L8 + 0.7) * (1 - sstep(prog(t, E.L9 - 0.55, E.L9 - 0.25))), sstep(prog(t, E.w_legka - 0.4, E.w_legka + 0.3)) * 0.25 + 0.05);
    varPanel(ctx, t, prog(t, E.L11 + 0.1, E.L11 + 0.6), [prog(t, E.L11 + 0.15, E.L11 + 0.75), prog(t, E.w_vin - 0.1, E.w_vin + 0.6), prog(t, E.w_prav - 0.15, E.w_prav + 0.55)],
      [prog(t, E.w_vin, E.w_vin + 0.6), prog(t, E.w_prav, E.w_prav + 0.6), prog(t, E.w_sud - 0.1, E.w_sud + 0.5)], prog(t, E.E11 - 0.1, E.L12 + 0.15));
    finalBoard(ctx, t, prog(t, E.w_nyne - 0.15, E.w_nyne + 0.8) * (1 - sstep(prog(t, E.fin - 0.25, E.fin + 0.15))));
    // финал
    if (t > E.fin - 0.3) { ctx.save(); ctx.globalAlpha = 0.5 * sstep(prog(t, E.fin - 0.2, E.fin + 0.5)); ctx.fillStyle = C.navy; ctx.fillRect(0, 0, W, H); ctx.restore(); titlePlate(ctx, t, prog(t, E.fin, E.fin + 0.8), true); }
  }
  bug(ctx, t, sstep(prog(t, 1.0, 1.5)) * (1 - sstep(prog(t, E.fin - 0.3, E.fin))), t > E.L9 - 0.25 && t < E.L11 + 0.05);
  lowerBar(ctx, sstep(prog(t, E.L1 - 0.6, E.L1 - 0.1)) * (1 - sstep(prog(t, E.fin - 0.3, E.fin + 0.05))));
  wipe(ctx, prog(t, E.wipe1, E.wipe1 + 0.6));
  wipe(ctx, prog(t, E.wipe2, E.wipe2 + 0.6));
  wipe(ctx, prog(t, E.wipe3, E.wipe3 + 0.6));
  textAt(t);
}

let fontsReady = false;
const seek = (t) => renderAt(t);
window.addEventListener("hf-seek", (e) => seek(e.detail.time));
seek(0);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { buildArena(); seek(0); });

const tl = gsap.timeline({ paused: true });
tl.set({}, {}, TOTAL);
window.__timelines = window.__timelines || {};
window.__timelines["main"] = tl;
