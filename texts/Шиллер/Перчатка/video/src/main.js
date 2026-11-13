// ---------- Режиссура: двор → раунд 1 (лев) → раунд 2 (тигр) → раунд 3 (барсы) → перчатка → бонусный раунд Делоржа → K.O. ----------
const ctx = document.getElementById("scene").getContext("2d");
const E = EV;
const LIONX = 520, TIGX = 800, BAR_A = 1180, BAR_B = 1600, GLOVE_G = [1400, 806];
const S_LION = 0.8, S_TIG = 0.78, S_BAR = 0.86, S_BALC = 0.55, S_KN = 0.86;
const speedOf = (f, t) => Math.abs(f(t + 0.04) - f(t - 0.04)) / 0.08;

// ===== ворота =====
const GATE_OPEN = [
  [[0, 0], [E.w_stuk - 0.1, 1, 0.35]],                       // лев
  [[0, 0], [E.w_mahn3 + 0.05, 1, 0.3]],                      // барсы
  [[0, 0], [E.w_zatv - 0.05, 1, 0.22]],                      // тигр
];

// ===== лев =====
const LW0 = E.w_grozn - 0.15, LW1 = Math.max(E.E14 + 0.2, LW0 + 1.6), LW2 = Math.max(E.w_glaza + 0.2, LW1 + 0.4);
const lionX = (t) => kfe([[0, GATES[0]], [LW0, LIONX, LW2 - LW0]], t);
const lionY = (t) => kfe([[0, GATE_BOT], [LW0, GROUND, LW1 - LW0]], t);
const lionS = (t) => kfe([[0, 0.5], [LW0, S_LION, LW1 - LW0]], t);
function lionP(t) {
  const x = lionX(t), sp = speedOf(lionX, t) + speedOf(lionY, t);
  const lie = Math.max(sstep(prog(t, E.w_leg - 0.15, E.w_leg + 0.5)) * (1 - sstep(prog(t, E.w_vstal - 0.25, E.w_vstal + 0.3))), sstep(prog(t, E.w_legli - 0.2, E.w_legli + 0.5)));
  const look = t < E.L15 ? [0.3, 0.2] : t < E.w_morsh ? [Math.sin((t - E.L15) * 2.6) , -0.3 + 0.3 * Math.sin((t - E.L15) * 1.7)] : [0.2, 0];
  const watch = win(t, E.L48, E.E50 + 0.4, 0.4, 0.4); // следит за Делоржем
  const kx = clamp((knightX(t) - x) / 500, -1, 1);
  return {
    x, y: lionY(t), s: lionS(t), dir: 1, walk: x / 52 + (t > E.w_vstal - 0.3 && t < E.w_otosh ? 0 : 0), stride: clamp(sp / 70, 0, 1),
    lie, look: watch > 0 ? [lerp(look[0], kx, watch), 0] : look,
    brow: win(t, E.w_morsh - 0.1, E.L18 + 0.2, 0.2, 0.3) + win(t, E.w_ryk - 0.1, E.w_smir + 0.6, 0.1, 0.4),
    mane: win(t, E.w_shevel - 0.05, E.L19, 0.1, 0.25) + 0.6 * win(t, E.w_ryk - 0.05, E.w_ryk + 0.9, 0.05, 0.3),
    stretch: win(t, E.w_potyan - 0.1, E.w_zevn + 0.1, 0.35, 0.35),
    mouth: Math.max(win(t, E.w_zevn - 0.05, E.w_zevn + 1.0, 0.3, 0.35) * 1.0, win(t, E.w_ryk - 0.12, E.w_ryk + 1.0, 0.08, 0.3), 0.35 * win(t, E.w_lev - 0.05, E.w_lev + 0.5, 0.08, 0.2)),
    sleep: win(t, E.w_leg + 0.6, E.w_vidit, 0.4, 0.2) * 0.7 + win(t, E.w_legli + 0.5, E.L41, 0.5, 0.4) * 0.6,
    blink: blinkAt(t, 0.3), tilt: t < E.w_morsh ? 0.12 * Math.sin((t - E.L15) * 2.6) * win(t, E.L15, E.w_morsh, 0.3, 0.3) : 0,
    tail: lie * 0.5, ph: 0.4,
  };
}
// ===== тигр =====
const TJ0 = E.w_pryan - 0.18, TJ1 = TJ0 + 0.7;
const CIRC0 = E.w_obosh - 0.15, CIRC1 = Math.max(E.w_rych + 0.2, CIRC0 + 2.2);
function tigerBase(t) {
  // прыжок из ворот
  if (t < TJ1) { const u = prog(t, TJ0, TJ1); return { x: lerp(GATES[2], 1050, u), y: lerp(GATE_BOT, GROUND, u) - Math.sin(u * Math.PI) * 170, s: lerp(0.55, S_TIG, u), dir: -1, air: 0, jump: Math.sin(u * Math.PI) }; }
  // робеет: отступает, крадётся ко льву
  if (t < CIRC0) {
    const x = kfe([[TJ1, 1050], [E.w_rob, 1100, 0.5], [E.w_krad + 0.05, 880, Math.max(0.8, CIRC0 - E.w_krad - 0.1)]], t);
    return { x, y: GROUND, s: S_TIG, dir: -1 };
  }
  // обходит льва кругом
  if (t < CIRC1) {
    const u = easeInOut(prog(t, CIRC0, CIRC1)), th = u * TAU, R = 360;
    const x = LIONX + R * Math.cos(th), dep = Math.sin(th);
    return { x, y: GROUND - 34 * dep, s: S_TIG * (1 - 0.12 * dep), dir: th < Math.PI ? -1 : 1 };
  }
  const x = kfe([[CIRC1, LIONX + 360], [CIRC1, TIGX, Math.max(0.3, E.w_lozh + 0.3 - CIRC1)]], t);
  return { x, y: GROUND, s: S_TIG, dir: 1 };
}
const tigerXf = (t) => tigerBase(t).x;
function tigerP(t) {
  const b = tigerBase(t), sp = speedOf(tigerXf, t);
  const lie = sstep(prog(t, E.w_lozh - 0.1, E.w_lozh + 0.5));
  const watch = win(t, E.L48, E.E50 + 0.4, 0.4, 0.4), kx = clamp((knightX(t) - b.x) / 500, -1, 1);
  return {
    ...b, walk: b.x / (t > E.w_krad && t < CIRC0 ? 30 : 46) * (b.dir), stride: clamp(sp / 80, 0, 1) * (t > E.w_krad && t < CIRC0 ? 0.6 : 1),
    lie, crouch: win(t, E.w_vidit - 0.05, E.w_lozh, 0.2, 0.3) * (t > E.w_krad - 0.1 && t < CIRC0 ? 1 : 0.45),
    fear: win(t, E.w_vidit, E.w_lozh, 0.15, 0.4) * (t < E.w_krad ? 1 : 0.5) + win(t, E.w_ryk, E.w_smir + 0.5, 0.1, 0.4) * 0.6,
    mouth: Math.max(win(t, E.w_rev - 0.08, E.w_rev + 0.8, 0.08, 0.25), win(t, E.w_rych - 0.08, E.w_rych + 0.6, 0.08, 0.2) * 0.7, win(t, E.w_lapoy - 0.1, E.w_lapoy + 0.6, 0.08, 0.2) * 0.6),
    lash: win(t, E.w_hvost - 0.1, E.L25, 0.1, 0.2), lick: prog(t, E.w_lizh - 0.05, E.w_lizh + 1.1) * (t < E.w_lizh + 1.1 ? 1 : 0),
    look: watch > 0 ? [kx * watch, 0] : t > E.w_krad - 0.1 && t < CIRC0 ? [-1, 0.3] : t > E.w_vidit - 0.1 && t < E.w_krad ? [-1, 0] : t > E.w_lapoy - 0.3 && t < E.w_vstal ? [0, -1] : [0, 0],
    swipe: win(t, E.w_lapoy - 0.2, E.w_lapoy + 0.45, 0.12, 0.25), blink: blinkAt(t, 1.3), ph: 1.1,
    sleep: win(t, E.w_lozh + 0.6, E.w_tret, 0.3, 0.2) * 0.5,
  };
}
// ===== барсы =====
const BJ = [[E.w_pryzh - 0.45, E.w_ochut + 0.35, 990], [E.w_pryzh - 0.3, E.w_ochut + 0.5, 1110]];
const HIT = E.w_lapoy + 0.05;
function barsBase(i, t) {
  const [j0, j1, lx] = BJ[i];
  if (t < j1) { const u = prog(t, j0, j1); return { x: lerp(GATES[1], lx, u), y: lerp(GATE_BOT - 10, GROUND, u) - Math.sin(u * Math.PI) * 260, s: lerp(0.5, S_BAR, u), dir: 1, jump: Math.sin(u * Math.PI), rot: 0 }; }
  // отброшены лапой
  const kx = lx + 130 + i * 30;
  if (t < E.w_smir) { const u = prog(t, HIT, HIT + 0.55); const x = lerp(lx, kx, easeOut(u)); return { x, y: GROUND - Math.sin(u * Math.PI) * 70, s: S_BAR, dir: -1, rot: Math.sin(u * Math.PI) * 0.5 * (i ? -1 : 1), jump: Math.sin(u * Math.PI) * 0.6 }; }
  const tx = i ? BAR_B : BAR_A;
  const x = kfe([[E.w_smir, kx], [E.w_oskal, tx, Math.max(0.8, E.w_otosh + 0.7 - E.w_oskal)]], t);
  return { x, y: GROUND, s: S_BAR, dir: -1, rot: 0 };
}
function barsP(i, t) {
  const b = barsBase(i, t), sp = speedOf((tt) => barsBase(i, tt).x, t);
  const watch = win(t, E.L48, E.E50 + 0.4, 0.4, 0.4), kx = clamp((knightX(t) - b.x) / 500, -1, 1);
  return {
    ...b, walk: -b.x / 34, stride: clamp(sp / 70, 0, 1), lie: sstep(prog(t, E.w_legli - 0.15 + i * 0.12, E.w_legli + 0.45 + i * 0.12)),
    fear: win(t, E.w_ryk, E.w_legli, 0.1, 0.4), crouch: win(t, E.w_smir - 0.1, E.w_legli, 0.2, 0.2) * 0.6,
    snarl: win(t, E.w_oskal - 0.1, E.w_legli + 0.2, 0.15, 0.3),
    mouth: win(t, E.w_zaryc - 0.05, E.w_zaryc + 0.5, 0.08, 0.2) * 0.6 + win(t, E.w_bars - 0.05, E.w_bars + 0.5, 0.1, 0.2) * 0.5,
    look: watch > 0 ? [kx * watch, 0] : [-0.6, 0], blink: blinkAt(t, 2.1 + i), ph: 2 + i,
  };
}
// ===== Делорж =====
// весь путь — одна координата q: на балконе и лестнице q = x, после подножия (QB) — путь по песку / SAND_K.
// Ступни ставятся в узлы сетки q с шагом в ступень: на лестнице каждая нога встаёт ровно на ступень, на песке шаг длиннее.
const PICKX = 1452, KN_BALC = 1470, SAND_K = 3, Q_TOP = STAIR.x0 - 6;
const SANDP = [[QB, GATE_BOT], [1826, GROUND + 30], [PICKX, GROUND + 30]];   // от подножия вперёд, к зрителю, и влево к перчатке
const SAND_LEN = SANDP.slice(1).reduce((acc, q, i) => acc + Math.hypot(q[0] - SANDP[i][0], q[1] - SANDP[i][1]), 0);
const Q_PICK = QB + SAND_LEN / SAND_K;
function sandAt(d) {
  for (let i = 1; i < SANDP.length; i++) {
    const [x0, y0] = SANDP[i - 1], [x1, y1] = SANDP[i], L = Math.hypot(x1 - x0, y1 - y0);
    if (d <= L || i === SANDP.length - 1) { const u = clamp(d / L, 0, 1); return [lerp(x0, x1, u), lerp(y0, y1, u)]; }
    d -= L;
  }
}
const pathAt = (q) => (q <= QB ? [q, stairLevel(q)] : sandAt((q - QB) * SAND_K));
const KW0 = E.w_delorzh - 0.05, KW1 = KW0 + 0.7;                        // по балкону к лестнице
const KS0 = KW1, KS1 = KS0 + 2.4;                                        // вниз по лестнице
const KP = Math.max(E.w_beret - 0.1, KS1 + 1.6);                         // по песку к перчатке, берёт
const KB0 = E.w_vozvr2 - 0.1, KB1 = Math.max(E.E50 + 0.2, KB0 + 1.8);    // обратно к лестнице
const KU0 = E.w_vityaz - 0.1, KU1 = E.w_balkon + 0.35;                  // спокойно вверх
const KR1 = Math.min(E.w_rukopl + 0.9, E.L57 - 0.1);                    // по балкону к красавице
const KQ = [[0, KN_BALC], [KW0, Q_TOP, KW1 - KW0], [KS0, QB, KS1 - KS0], [KS1, Q_PICK, KP - KS1], [KB0, QB, KB1 - KB0], [KU0, Q_TOP, KU1 - KU0], [KU1, KN_BALC, KR1 - KU1]];
const knightQ = (t) => kf(KQ, t, trapEase);
const knightX = (t) => pathAt(knightQ(t))[0];
// ступня j (0/1) при положении тела q: стоит на узле a, либо летит с узла a на a+2
// на полу у лестницы и на песке земля под ступнёй — на глубине тела (сдвиг по глубине не должен выглядеть как высота)
function stepFoot(q, j) {
  const v = (q - STAIR.x0) / STAIR.run - 0.5, w = v - j + 0.5, cyc = Math.floor(w / 2), r = w - 2 * cyc, a = 2 * cyc + j;
  const g0 = pathAt(q)[1], flat = q >= STAIR_END;
  const node = (f) => { const qn = STAIR.x0 + (f + 0.5) * STAIR.run, pt = pathAt(qn); return [pt[0], flat && qn >= STAIR_END ? g0 : pt[1]]; };
  if (r < 1) { const [x, y] = node(a); return { x, g: y, lift: 0 }; }
  const u = r - 1, e = sstep(u), A = node(a), B = node(a + 2), M = pathAt(STAIR.x0 + (a + 2 * e + 0.5) * STAIR.run);
  return { x: M[0], g: lerp(A[1], B[1], e), lift: Math.sin(u * Math.PI) };
}
function knightP(t) {
  const q = knightQ(t), [x, g0] = pathAt(q);
  const sq = Math.abs(knightQ(t + 0.04) - knightQ(t - 0.04)) / 0.08, go = sstep(clamp(sq / 30, 0, 1)); // 0 — стоит, 1 — идёт
  const v = knightX(t + 0.05) - knightX(t - 0.05);
  let dir = v > 0.5 ? 1 : v < -0.5 ? -1 : (t < KW0 ? -1 : t < KB0 ? (t < KP + 0.5 ? -1 : 1) : t < KU0 + 0.5 ? -1 : t > KR1 - 0.05 && t < E.w_nagr + 0.3 ? -1 : 1);
  if (t > E.w_nagr + 0.25) dir = 1;
  // ступни в мире: шаг по сетке, а когда стоит — рядом под телом
  const fw = [0, 1].map((j) => { const f = stepFoot(q, j), rx = x + (j ? 7 : -7);
    return { x: lerp(rx, f.x, go), g: lerp(g0, f.g, go), lift: f.lift * go * 15 }; });
  let y = Math.max(fw[0].g, fw[1].g);             // тело опирается на нижнюю ступню — до неё нога дотягивается
  const s = lerp(S_BALC, S_KN, (y - BFLOOR) / (GROUND - BFLOOR)), st = s * PPL.knight.h;
  const feet = fw.map((f) => [(f.x - x) * dir / st, (f.g - f.lift - y) / st]), shadows = fw.map((f) => [(f.x - x) * dir / st, (f.g - y) / st]);
  const onBalc = q < STAIR.x0 + 4, sand = q > QB + 1;
  const pop = springPop(prog(t, E.w_ryad - 0.2, E.w_ryad + 0.6));
  if (t < E.w_ryad + 0.6) y += (1 - pop) * 200;
  const bend = win(t, KP - 0.25, KP + 0.45, 0.2, 0.25), hold = sstep(prog(t, KP, KP + 0.5));
  const throwK = prog(t, E.w_brosil - 0.25, E.w_brosil + 0.1), thr = win(t, E.w_brosil - 0.3, E.w_brosil + 0.6, 0.12, 0.3);
  let arms = null;
  if (bend > 0 || (t > KP && t < E.w_brosil + 0.1)) {
    const reach = [lerp(14, 56, bend), lerp(88, 150, bend)];
    arms = [[-14, 88], t > KP ? [lerp(reach[0], 48, hold), lerp(reach[1], 10, hold)] : reach];
  }
  if (thr > 0) arms = [[-14, 88], [lerp(-40, 80, easeOut(throwK)), lerp(-60, -10, easeOut(throwK))]];
  return {
    x, y, s, dir, onBalc, sand, legs: true, feet, shadows, arms, bend,
    look: [0.4, t > KR1 && t < E.w_brosil ? 0.2 : 0], cold: win(t, E.w_holod - 0.2, E.w_nagr + 0.8, 0.3, 0.4), blink: blinkAt(t, 0.9), ph: 0.7,
    mouth: win(t, E.w_ne - 0.05, E.E60, 0.05, 0.1) * (0.5 + 0.5 * Math.sin(t * 22)),
    holdGlove: t > KP + 0.05 && t < E.w_brosil - 0.02,
  };
}
// ===== перчатка =====
const GF0 = E.w_sorv - 0.05, GF1 = Math.max(E.w_upala + 0.05, GF0 + 1.2), GT0 = E.w_brosil - 0.02, GT1 = GT0 + 0.32;
const FACE_B = [1342, BFLOOR - 0.94 * S_BALC * 251];
function gloveState(t) {
  if (t < GF0) return null;
  if (t < GF1) {
    const u = prog(t, GF0, GF1), uy = easeIn(u);
    return { x: lerp(1318, GLOVE_G[0], u) + Math.sin(u * 9) * 26 * (1 - u), y: lerp(318, GLOVE_G[1], uy), a: u * 7 + Math.sin(u * 6) * 0.5, s: lerp(0.55, 0.9, u), glow: 0 };
  }
  if (t < KP + 0.05) { const land = prog(t, GF1, GF1 + 0.3); return { x: GLOVE_G[0], y: GLOVE_G[1] - Math.sin(land * Math.PI) * 18, a: 1.5, s: 0.9, glow: 0.5 + 0.5 * Math.sin(t * 5), ground: true }; }
  if (t < GT0) return null; // в руке рыцаря
  const kn = knightP(GT0);
  if (t < GT1) { const u = prog(t, GT0, GT1); const sx = kn.x - 40, sy = kn.y - 200 * kn.s; return { x: lerp(sx, FACE_B[0] + 6, u), y: lerp(sy, FACE_B[1], u) - Math.sin(u * Math.PI) * 30, a: -u * 9, s: 0.5, glow: 0, top: true }; }
  const u = prog(t, GT1, GT1 + 0.7); if (u >= 1) return null;
  return { x: FACE_B[0] + 6 - u * 30, y: FACE_B[1] + easeIn(u) * 110, a: -9 - u * 3, s: 0.5, glow: 0, top: true };
}

// ===== двор на балконе =====
const COURT = [
  { who: "baron2", x: 400, ph: 0.3 }, { who: "baron1", x: 520, ph: 1.1 }, { who: "prince", x: 680, ph: 2.0 }, { who: "king", x: 860, ph: 0.5 },
  { who: "lady1", x: 1010, ph: 1.7, pop: "w_obvor" }, { who: "lady2", x: 1115, ph: 0.9, pop: "w_dam" }, { who: "lady3", x: 1222, ph: 2.4, pop: "w_dam", d: 0.25 },
  { who: "beauty", x: 1342, ph: 0.2, pop: "w_ryad", d: -0.1 },
];
function blinkAt(t, s = 0) { const p = (t + s) % 3.3; return p < 0.13 ? Math.sin((p / 0.13) * Math.PI) : 0; }
const KING_WAVES = [E.w_znak, E.w_mahn2, E.w_mahn3];
function courtPose(m, t) {
  const o = { x: m.x, y: BFLOOR, s: S_BALC, dir: 1, ph: m.ph, blink: blinkAt(t, m.ph * 3), look: [0, 0.6] };
  if (m.pop) { const t0 = E[m.pop] + (m.d || 0); o.y += (1 - springPop(prog(t, t0 - 0.2, t0 + 0.7))) * 220; }
  // общие реакции
  const excite = Math.max(win(t, E.w_lev - 0.1, E.L15, 0.2, 0.4), win(t, E.w_pryan, E.L24, 0.2, 0.4), win(t, E.w_pryzh, E.L34, 0.2, 0.4), win(t, E.w_gosti, E.w_vdrug, 0.3, 0.2));
  const fear = win(t, E.L51 - 0.1, E.L53, 0.3, 0.5) + 0.6 * win(t, E.w_ryk - 0.05, E.w_smir + 0.3, 0.1, 0.4);
  const watchGlove = win(t, E.w_vdrug, E.E40 + 0.5, 0.2, 0.4);
  const clap = win(t, E.w_rukopl - 0.15, E.L57 + 0.3, 0.2, 0.4);
  o.mouth = Math.max(excite * 0.5 * (0.5 + 0.5 * Math.sin(t * 9 + m.ph)), fear * 0.9, watchGlove * 0.6);
  o.fear = fear; o.smile = 0.5 + clap * 0.5;
  const kx = knightX(t);
  const watchKnight = win(t, E.L47, E.L57, 0.4, 0.4);
  if (watchGlove > 0) o.look = [clamp((GLOVE_G[0] - m.x) / 500, -1, 1) * watchGlove, 1];
  if (watchKnight > 0) o.look = [clamp((kx - m.x) / 400, -1, 1), kx > STAIR.x0 ? 1 : 0];
  if (clap > 0) { const k = Math.abs(Math.sin(t * 14 + m.ph)), hx = 26 - 22 * (1 - k); o.arms = [[hx, 50], [-hx, 50]]; } // ладони сходятся перед грудью
  else if (m.who.startsWith("lady") || m.who === "beauty") o.arms = [[-14, 88], [36, 4]]; // левая опущена, правая с веером у плеча
  if (m.who.startsWith("lady") || m.who === "beauty") o.hand = [null, (c, x, y) => fan(c, x, y - 6, -0.6 + Math.sin(t * 7 + m.ph) * 0.25 * (1 - clap), PPL[m.who].trim === "#fff" ? "#ffe9a8" : C.pinkL)];
  if (m.who === "king") {
    o.y = BFLOOR + 18; o.look = [0.2, 0.8];
    let up = 0; for (const tw of KING_WAVES) up = Math.max(up, win(t, tw - 0.25, tw + 0.9, 0.15, 0.35));
    const lean = win(t, E.L4 - 0.1, E.L6, 0.4, 0.4);
    o.look = [lean > 0.2 ? 0.3 : 0.2, 0.6 + lean * 0.4];
    o.arms = [[-14, 88], [lerp(14, 46, up), lerp(88, -96, up) + Math.sin(t * 16) * 10 * up]];
    o.mouth = Math.max(o.mouth, up * 0.6);
  }
  if (m.who === "beauty") {
    const lean = win(t, E.L37, E.w_sorv + 0.3, 0.3, 0.2);
    o.gloveOn = t < GF0;
    if (lean > 0) o.arms = [[lerp(-14, -44, lean), lerp(88, 78, lean)], o.arms[1]];
    const sly = win(t, E.L41 - 0.1, E.E46 + 0.3, 0.3, 0.3);
    o.sly = sly; if (sly > 0) { o.look = [1, -0.2]; o.smile = 0.7; }
    o.dir = 1;
    if (t > E.L44 - 0.1 && t < E.E46) o.mouth = 0.5 + 0.5 * Math.sin(t * 20);
    const love = win(t, E.L57 - 0.1, E.w_holod + 0.2, 0.3, 0.3);
    if (love > 0) { o.smile = 1; o.look = [1, 0]; }
    o.love = love;
    const hit = prog(t, GT1 - 0.02, GT1 + 0.15);
    if (t > GT1 - 0.02) { o.wince = win(t, GT1 - 0.02, GT1 + 1.4, 0.05, 0.4); o.x -= 10 * Math.sin(Math.min(1, hit) * Math.PI) + 6 * o.wince; o.mouth = 0.8 * win(t, GT1 + 0.3, E.fin, 0.3, 0.3); o.fear = 0.5 * o.wince; }
  }
  return o;
}

// ===== камера =====
const SH = {
  WIDE: [960, 540, 1.0], GATES: [620, 600, 1.55], BARONS: [470, 268, 2.1], PRINCE: [690, 262, 2.4], KING: [860, 250, 2.6], BALC: [900, 330, 1.45],
  ARENA: [960, 640, 1.22], LADIES: [1180, 262, 1.95], LADIES2: [1320, 262, 2.0], G1: [320, 620, 2.1], G1b: [420, 650, 1.65], LION: [540, 650, 1.7],
  LFACE: [600, 662, 2.7], LFACE2: [610, 664, 3.2], LMANE: [580, 655, 2.2], LSTRETCH: [560, 680, 1.6], LYAWN: [610, 668, 2.6], LLIE: [600, 690, 1.5],
  G3: [1250, 620, 2.1], TIGJUMP: [1080, 620, 1.35], TSEE: [880, 640, 1.45], TROAR: [1090, 672, 2.4], TTAIL: [1070, 660, 1.8], TCRAWL: [930, 670, 1.6],
  CIRC: [560, 650, 1.3], TLIE: [660, 680, 1.55], G2: [790, 610, 1.9], BJUMP: [880, 600, 1.4], SWIPE: [900, 650, 1.75], ROAR: [600, 655, 2.2],
  BBACK: [1180, 640, 1.35], BEAUTY: [1342, 262, 2.6], BFACE: [1345, 250, 3.3], TWO: [1405, 262, 2.4], KFACE: [1470, 252, 3.2], LAND: [1380, 700, 1.7],
  BALCR: [1150, 280, 1.6], FEAR1: [1100, 268, 2.0], FEAR2: [640, 268, 2.1],
};
const CAM = [
  [0, [960, 540, 1.0]], [E.V0 - 0.35, [520, 610, 1.6], 0.7], [E.L1 + 0.6, [1020, 610, 1.6], E.E1 - E.L1 + 0.4],
  [E.w_baron - 0.15, SH.BARONS, 0.4], [E.w_prinz - 0.15, SH.PRINCE, 0.35], [E.w_franc - 0.2, SH.KING, 0.35],
  [E.L4 - 0.1, SH.BALC, 0.5], [E.w_popr - 0.15, SH.ARENA, 0.5], [E.L6 - 0.1, SH.LADIES, 0.45], [E.w_dam - 0.2, SH.LADIES2, 1.2],
  [E.L9 - 0.1, SH.KING, 0.35], [E.w_stuk - 0.15, SH.G1, 0.3], [E.L13 - 0.1, SH.G1b, 0.5], [E.L14, SH.LION, 0.5],
  [E.L15 - 0.1, SH.LFACE, 0.35], [E.L16 - 0.1, SH.LION, 0.4], [E.w_morsh - 0.12, SH.LFACE2, 0.3], [E.L18 - 0.1, SH.LMANE, 0.3],
  [E.L19 - 0.1, SH.LSTRETCH, 0.4], [E.w_zevn - 0.1, SH.LYAWN, 0.3], [E.w_leg - 0.1, SH.LLIE, 0.4], [E.w_mahn2 - 0.2, SH.KING, 0.3],
  [E.L21 - 0.05, SH.G3, 0.3], [E.w_pryan - 0.2, SH.TIGJUMP, 0.35], [E.w_vidit - 0.1, SH.TSEE, 0.35], [E.w_rev - 0.15, SH.TROAR, 0.25],
  [E.L24 - 0.1, SH.TTAIL, 0.35], [E.L25 - 0.1, SH.TCRAWL, 0.5], [E.L26 - 0.05, [900, 668, 2.3], 0.4], [E.L27 - 0.1, SH.CIRC, 0.5],
  [E.L28 - 0.1, SH.TLIE, 0.5], [E.L29 - 0.1, SH.KING, 0.3], [E.L30 - 0.1, SH.G2, 0.35], [E.w_pryzh - 0.35, SH.BJUMP, 0.35],
  [E.L32 - 0.1, SH.SWIPE, 0.3], [E.L33 - 0.05, SH.ROAR, 0.3], [E.L34 - 0.1, SH.BBACK, 0.45], [E.w_legli - 0.2, SH.WIDE, 0.8],
  [E.L37 - 0.1, SH.BALC, 0.5], [E.L38 - 0.1, SH.BEAUTY, 0.3], [E.L40 - 0.05, SH.LAND, 0.35], [E.L41 - 0.1, SH.TWO, 0.4],
  [E.w_ulyb - 0.2, SH.BFACE, 0.35], [E.L44 - 0.1, SH.BEAUTY, 0.35], [E.L46 - 0.1, SH.TWO, 0.35], [E.L47 - 0.1, SH.KFACE, 0.35],
  [E.L51 - 0.1, SH.FEAR1, 0.35], [E.w_serdce - 0.2, SH.FEAR2, 0.35], [E.L56 - 0.1, SH.BALCR, 0.4], [E.L57 - 0.1, SH.BFACE, 0.35],
  [E.L58 - 0.1, SH.KFACE, 0.3], [E.L59 - 0.1, SH.TWO, 0.3], [E.w_ne - 0.1, [1400, 300, 1.9], 0.4], [E.E60 + 0.3, SH.WIDE, 1.2],
];
// следование за перчаткой и рыцарем: [начало, конец, функция → кадр]
const FOLLOW = [
  [E.w_sorv + 0.1, E.L40 + 0.1, (t) => { const g = gloveState(t) || { x: GLOVE_G[0], y: GLOVE_G[1] }; return [1360, g.y, 2.0]; }],
  [KW0 + 0.6, E.L51 - 0.1, (t) => { const k = knightP(t); return [k.x - 120 * (t > KP ? 0.3 : 1), k.y - 150 * k.s, k.sand ? 1.45 : 1.6]; }],
  [E.E52 - 0.2, E.L56 - 0.1, (t) => { const k = knightP(t); return [k.x - 100, k.y - 160 * k.s, 1.55]; }],
];
// встряски: [время, сила]
const SHAKES = [[E.w_stuk, 14], [E.w_gryan, 14], [TJ1, 12], [E.w_lapoy + 0.05, 16], [E.w_ryk, 26], [GF1, 8], [GT1, 14], [E.w_znak + 0.1, 6]];
// камера: цель — ключи CAM (с упреждением) и слежение; сама камера догоняет цель критически задемпфированной
// пружиной (без перелёта), посчитанной заранее таблицей — так переезды плавные и кадр детерминирован
const CAM_DT = 1 / 120, CAM_W = 5.2, CAM_LEAD = 0.3, CAM_VMAX = 1500, CAM_ZMAX = 1.1;
function camTarget(t) {
  let [cx, cy, z] = kf(CAM, t + CAM_LEAD, easeInOut);
  for (const [a, b, fn] of FOLLOW) { const w = win(t, a, b, 0.5, 0.5); if (w > 0) { const f = fn(Math.min(t + 0.15, b)); cx = lerp(cx, f[0], w); cy = lerp(cy, f[1], w); z = lerp(z, f[2], w); } }
  return [cx, cy, Math.log(Math.max(1, z))];
}
const CAM_TAB = (() => {
  const n = Math.ceil((TOTAL + 1) / CAM_DT) + 2, tab = new Float64Array(n * 3), x = camTarget(0), v = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    const g = camTarget(i * CAM_DT);
    for (let j = 0; j < 3; j++) v[j] += (CAM_W * CAM_W * (g[j] - x[j]) - 2 * CAM_W * v[j]) * CAM_DT;
    // предел скорости: панорама не быстрее CAM_VMAX px/с на экране, зум — не быстрее CAM_ZMAX
    const z = Math.exp(x[2]), sv = Math.hypot(v[0], v[1]) * z;
    if (sv > CAM_VMAX) { v[0] *= CAM_VMAX / sv; v[1] *= CAM_VMAX / sv; }
    v[2] = clamp(v[2], -CAM_ZMAX, CAM_ZMAX);
    for (let j = 0; j < 3; j++) { x[j] += v[j] * CAM_DT; tab[i * 3 + j] = x[j]; }
  }
  return tab;
})();
function camAt(t) {
  const f = clamp(t / CAM_DT, 0, CAM_TAB.length / 3 - 2), i = Math.floor(f), u = f - i, at = (j) => lerp(CAM_TAB[i * 3 + j], CAM_TAB[i * 3 + 3 + j], u);
  let cx = at(0), cy = at(1), z = Math.max(1, Math.exp(at(2)));
  const hw = W / (2 * z), hh = H / (2 * z);
  cx = clamp(cx, hw, WW - hw); cy = clamp(cy, hh, H - hh);
  let sx = 0, sy = 0;
  for (const [te, a] of SHAKES) if (t >= te && t < te + 0.8) { const d = Math.exp(-(t - te) * 6) * a; sx += Math.sin((t - te) * 71) * d; sy += Math.cos((t - te) * 53) * d; }
  return { cx, cy, z, sx, sy };
}

// ===== эффекты в мире =====
function dust(c, x, y, t, t0, k = 1) {
  const u = prog(t, t0, t0 + 0.9); if (u <= 0 || u >= 1) return;
  c.save(); c.globalAlpha = (1 - u) * 0.7;
  for (let i = 0; i < 9; i++) { const a = (i / 8) * Math.PI, r = (30 + 110 * easeOut(u)) * k, px = x - Math.cos(a) * r * 1.3, py = y - Math.sin(a) * r * 0.22 - 12 * k, rad = (26 + 30 * u) * k;
    const g = c.createRadialGradient(px, py, 0, px, py, rad); g.addColorStop(0, "rgba(245,220,174,0.75)"); g.addColorStop(1, "rgba(245,220,174,0)"); c.fillStyle = g; circle(c, px, py, rad); c.fill(); }
  c.restore();
}
function shock(c, x, y, t, t0) {
  const u = prog(t, t0, t0 + 0.8); if (u <= 0 || u >= 1) return;
  c.save(); c.globalAlpha = 1 - u; c.lineWidth = 14 * (1 - u) + 2; c.strokeStyle = "#fff6c8";
  for (const k of [1, 0.65]) { ellipse(c, x, y, 120 + 900 * u * k, 40 + 300 * u * k); c.stroke(); }
  c.restore();
}
function zzz(c, x, y, t, k) {
  if (k <= 0) return;
  for (let i = 0; i < 3; i++) { const p = ((t * 0.6 + i / 3) % 1); arcadeText(c, "z", x + p * 60 + i * 8, y - p * 110, 26 + p * 30, "#fff", { lw: 6, shadow: false }); }
}
function hitStars(c, x, y, t, t0) {
  const u = prog(t, t0, t0 + 0.7); if (u <= 0 || u >= 1) return;
  c.save(); c.globalAlpha = 1 - u * u;
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU + 0.3, r = 30 + 120 * easeOut(u); star4(c, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.7, 26 * (1 - u) + 8, i % 2 ? "#fff" : C.yellow); }
  c.restore();
}
function worldText(c, txt, x, y, t, t0, dur, px, col) {
  const k = win(t, t0, t0 + dur, 0.06, 0.25); if (k <= 0) return;
  const s = springSlam(prog(t, t0, t0 + 0.6));
  c.save(); c.globalAlpha = k; c.translate(x, y - 30 * prog(t, t0, t0 + dur)); c.scale(s, s); c.rotate(-0.08);
  arcadeText(c, txt, 0, 0, px, col, { grad: [C.white, col] }); c.restore();
}

// ===== мир =====
function drawWorld(c, t) {
  const cam = camAt(t);
  c.save();
  c.translate(W / 2, H / 2); c.scale(cam.z, cam.z); c.translate(-cam.cx + cam.sx, -cam.cy + cam.sy);
  c.drawImage(BG_BACK, 0, 0, WW, H);
  // двор
  c.save(); c.translate(860, BFLOOR); c.scale(S_BALC, S_BALC); throne(c, 0, 0); c.restore();
  const kn = knightP(t);
  const kHand = (cc, x, y) => { if (kn.holdGlove) glove(cc, x + 4, y + 8, 0.9, 0.4 + Math.sin(t * 2) * 0.1); };
  for (const m of COURT) {
    const o = courtPose(m, t);
    person(c, m.who, o, t);
    if (m.who === "beauty" && o.love > 0) { for (const sx of [-1, 1]) heart(c, o.x + sx * 7 * S_BALC * 0.94 * 1.0, o.y - S_BALC * 0.94 * 255, 0.42 * springPop(prog(t, E.L57 - 0.1, E.L57 + 0.6)) * o.love * (1 + 0.15 * Math.sin(t * 9)), C.red); }
  }
  if (kn.onBalc) person(c, "knight", { ...kn, hand: [null, kHand] }, t);
  // сердечки дам трескаются от страха
  const hk = win(t, E.w_strah - 0.1, E.L53 + 0.3, 0.2, 0.3);
  if (hk > 0) for (const m of COURT.slice(4)) heart(c, m.x + 18, 175 + Math.sin(t * 4 + m.ph) * 6, 0.9 * hk, C.red, prog(t, E.w_serdce - 0.1, E.w_serdce + 0.4));
  c.drawImage(BG_FRONT, 0, 0, WW, H);
  // ворота, глаза, факелы
  for (let i = 0; i < 3; i++) gate(c, GATES[i], kf(GATE_OPEN[i], t), t);
  const eyesK = win(t, E.V0 - 0.5, E.L4, 0.4, 0.4);
  gateEyes(c, GATES[0], eyesK * (1 - prog(t, E.w_stuk - 0.2, E.w_stuk)), t);
  gateEyes(c, GATES[1], eyesK + win(t, E.L29, E.w_bars, 0.3, 0.1), t, "#9cff6a");
  gateEyes(c, GATES[2], eyesK + win(t, E.L20, E.w_zatv, 0.3, 0.1), t, "#ff9a3a");
  torches(c, t);
  // звери и рыцарь по глубине
  const actors = [];
  if (t > E.w_grozn - 0.2) actors.push({ y: lionY(t), d: () => beast(c, "lion", lionP(t), t) });
  if (t > TJ0) { const p = tigerP(t); actors.push({ y: p.y, d: () => beast(c, "tiger", p, t) }); }
  for (let i = 0; i < 2; i++) if (t > BJ[i][0]) { const p = barsP(i, t); actors.push({ y: p.y + (p.jump > 0.3 ? 40 : 0), d: () => { c.save(); if (p.rot) { c.translate(p.x, p.y - 60); c.rotate(p.rot); c.translate(-p.x, -(p.y - 60)); } beast(c, "bars", p, t); c.restore(); } }); }
  if (!kn.onBalc) actors.push({ y: kn.y + 2, d: () => person(c, "knight", { ...kn, hand: [null, kHand] }, t) });
  const gs = gloveState(t);
  if (gs && !gs.top) actors.push({ y: gs.ground ? GLOVE_G[1] + 1 : 9999, d: () => glove(c, gs.x, gs.y, gs.s, gs.a, gs.glow) });
  actors.sort((a, b) => a.y - b.y).forEach((a) => a.d());
  if (gs && gs.top) glove(c, gs.x, gs.y, gs.s, gs.a, 0);
  // эффекты
  dust(c, GATES[0] + 40, GATE_BOT + 10, t, E.w_stuk - 0.05, 0.8);
  dust(c, 1050, GROUND, t, TJ1 - 0.05);
  dust(c, BJ[0][2], GROUND, t, BJ[0][1] - 0.05, 0.8); dust(c, BJ[1][2], GROUND, t, BJ[1][1] - 0.05, 0.8);
  dust(c, LIONX, GROUND, t, E.w_leg + 0.2, 0.7);
  dust(c, GLOVE_G[0], GLOVE_G[1], t, GF1 - 0.03, 0.5);
  shock(c, LIONX + 90, GROUND - 120, t, E.w_ryk);
  hitStars(c, 960, GROUND - 120, t, E.w_lapoy + 0.05);
  hitStars(c, FACE_B[0], FACE_B[1], t, GT1);
  zzz(c, LIONX + 110, GROUND - 140, t, win(t, E.w_leg + 0.6, E.w_mahn2 + 0.3, 0.4, 0.3));
  worldText(c, "HIT!", 980, GROUND - 230, t, E.w_lapoy + 0.05, 1.0, 70, C.yellow);
  worldText(c, "РРРР!", LIONX + 160, GROUND - 300, t, E.w_ryk, 1.1, 92, "#ff7a1a");
  worldText(c, "+1 ПЕРЧАТКА", PICKX, GROUND - 300, t, KP + 0.1, 1.3, 46, C.pinkL);
  worldText(c, "!", 1030, GROUND - 230, t, E.w_vidit - 0.05, 0.9, 110, C.red);
  c.restore();
}

// ===== HUD файтинга =====
const SEG = [
  [E.L9 - 0.2, { p1: ["ЛЕВ", "lion"], p2: ["???", null], b1: [[0, 0], [E.w_lev, 1, 0.8]], b2: [[0, 0]] }],
  [E.w_mahn2 - 0.1, { p1: ["ЛЕВ", "lion"], p2: ["ТИГР", "tiger"], b1: [[0, 1]], b2: [[0, 0], [E.w_tigr, 1, 0.8], [E.w_rob, 0.45, 0.6]] }],
  [E.w_mahn3 - 0.1, { p1: ["ТИГР", "tiger"], p2: ["БАРСЫ ×2", "bars"], b1: [[0, 0.45], [E.w_tret, 0.8, 0.6]], b2: [[0, 0], [E.w_bars, 1, 0.8], [E.w_lapoy + 0.05, 0.55, 0.4], [E.w_ryk, 0.15, 0.5]] }],
  [E.L41 - 0.2, { p1: ["КРАСАВИЦА", "beauty"], p2: ["ДЕЛОРЖ", "knight"], b1: [[0, 1]], b2: [[0, 1]] }],
  [E.w_delorzh - 0.1, { p1: ["ДЕЛОРЖ", "knight"], p2: ["ЗВЕРИ ×4", "lion"], b1: [[0, 1]], b2: [[0, 1]] }],
  [E.L57 - 0.2, { p1: ["ДЕЛОРЖ", "knight"], p2: ["ГОРДОСТЬ", "beauty"], b1: [[0, 1]], b2: [[0, 1], [GT1, 0, 0.5]] }],
];
function portrait(c, x, y, sz, kind, t, flip) {
  c.save(); rrect(c, x, y, sz, sz, 10); c.fillStyle = "#2a1a40"; c.fill(); c.clip();
  const g = c.createLinearGradient(0, y, 0, y + sz); g.addColorStop(0, "#5a3c9e"); g.addColorStop(1, "#1b1026"); c.fillStyle = g; c.fillRect(x, y, sz, sz);
  if (kind === "lion" || kind === "tiger" || kind === "bars") { c.translate(x + sz / 2, y + sz * 0.56); c.scale(sz / 190, sz / 190); head(c, kind, KIND[kind], { look: [flip ? -0.6 : 0.6, 0], blink: blinkAt(t, x * 0.01) }, t); }
  else if (kind) { const sc = sz / 105, hh = PPL[kind].h; c.translate(x + sz / 2, y + sz * 0.5 + (kind === "king" ? 262 : kind === "knight" ? 275 : 251) * hh * sc); c.scale(sc, sc); person(c, kind, { x: 0, y: 0, s: 1, dir: 1, look: [flip ? -0.6 : 0.6, 0], blink: blinkAt(t, x * 0.01), smile: 0.6, sly: kind === "beauty" ? 0.6 : 0 }, t); }
  else arcadeText(c, "?", x + sz / 2, y + sz / 2, sz * 0.7, "#fff");
  c.restore();
  rrect(c, x, y, sz, sz, 10); c.lineWidth = 6; c.strokeStyle = C.gold; c.stroke();
}
function hpBar(c, x, y, w, h, v, flip, label, k) {
  c.save(); slant(c, x - 6, y - 6, w + 12, h + 12, 18); ink(c, "#20142e", 5);
  const col = v > 0.5 ? C.hpG : v > 0.25 ? C.hpY : C.hpR;
  const vw = Math.max(0, w * v);
  c.save(); slant(c, x, y, w, h, 14); c.clip(); c.fillStyle = "#5a1020"; c.fillRect(x, y, w, h);
  c.fillStyle = col; if (flip) c.fillRect(x + w - vw, y, vw, h); else c.fillRect(x, y, vw, h);
  c.fillStyle = "rgba(255,255,255,0.35)"; c.fillRect(x, y + 4, w, h * 0.28); c.restore();
  font(c, 34, F_HUD); c.textBaseline = "top"; c.textAlign = flip ? "right" : "left";
  c.lineWidth = 7; c.strokeStyle = C.ink; c.strokeText(label, flip ? x + w : x, y + h + 8); c.fillStyle = "#fff"; c.fillText(label, flip ? x + w : x, y + h + 8);
  c.restore();
}
function hud(c, t) {
  const k = sstep(prog(t, E.L9 - 0.3, E.L9 + 0.3)) * (1 - sstep(prog(t, E.E60 + 0.6, E.E60 + 1.1)));
  if (k <= 0) return;
  let seg = SEG[0]; for (const s of SEG) if (t >= s[0]) seg = s;
  const S = seg[1], sw = springSnap(prog(t, seg[0], seg[0] + 0.5));
  c.save(); c.globalAlpha = k; c.translate(0, -140 * (1 - k));
  portrait(c, 40, 30, 110, S.p1[1], t, false);
  portrait(c, W - 150, 30, 110, S.p2[1], t, true);
  hpBar(c, 176, 48, 640, 44, kf(S.b1, t) * sw, false, S.p1[0], k);
  hpBar(c, W - 176 - 640, 48, 640, 44, kf(S.b2, t) * sw, true, S.p2[0], k);
  // таймер
  const r0 = E.L9 - 0.2, fast = prog(t, E.L37, E.w_vdrug) * 30;
  let tv = Math.max(0, 99 - Math.floor((t - r0) * 0.7 + fast)); if (t > E.w_vdrug) tv = Math.max(0, 99 - Math.floor((E.w_vdrug - r0) * 0.7 + 30));
  rrect(c, W / 2 - 66, 26, 132, 100, 14); ink(c, "#20142e", 5);
  arcadeText(c, String(tv).padStart(2, "0"), W / 2, 78, 78, C.yellow, { grad: ["#fff6b0", C.gold] });
  c.restore();
}
// карточки бойцов
const CARDS = [
  [E.w_franc - 0.1, E.L4 + 0.6, "right", "КОРОЛЬ ФРАНЦИСК", "king", ["ХОЗЯИН АРЕНЫ"]],
  [E.w_lev - 0.05, E.L15 + 0.4, "right", "ЛЕВ", "lion", [["СИЛА", 5], ["ГРИВА", 5]]],
  [E.w_tigr - 0.05, E.w_rev + 0.3, "left", "ТИГР", "tiger", [["СИЛА", 4], ["СМЕЛОСТЬ", 4]]],
  [E.w_bars - 0.05, E.L32 - 0.2, "left", "БАРСЫ ×2", "bars", [["ПРЫЖОК", 5], ["СИЛА", 3]]],
  [E.w_licem - 0.1, E.L43 + 0.4, "left", "КРАСАВИЦА", "beauty", [["КОВАРСТВО", 5], ["ДОБРОТА", 1]]],
  [E.w_delorzh - 0.05, E.L48 + 0.6, "left", "ДЕЛОРЖ", "knight", [["СМЕЛОСТЬ", 9], ["СЛОВ", 0]]],
];
function card(c, t, cd) {
  const [t0, t1, side, name, kind, stats] = cd;
  const k = win(t, t0, t1, 0.05, 0.3); if (k <= 0) return;
  const s = springPop(prog(t, t0, t0 + 0.9)), w = 520, h = 250, y = 168;
  const x = side === "left" ? lerp(-w - 40, 50, s) : lerp(W + 40, W - w - 50, s);
  c.save(); c.globalAlpha = Math.min(1, k * 1.4);
  slant(c, x, y, w, h, 26); ink(c, "rgba(27,16,38,0.92)", 6, C.gold);
  portrait(c, x + 36, y + 24, 150, kind, t, side === "right");
  arcadeText(c, name, x + 214, y + 58, name.length > 12 ? 34 : name.length > 9 ? 40 : 54, C.yellow, { align: "left", grad: ["#fff6b0", C.gold] });
  stats.forEach((st, i) => {
    const yy = y + 118 + i * 54;
    if (typeof st === "string") { arcadeText(c, st, x + 214, yy, 36, "#fff", { align: "left" }); return; }
    const [lab, v] = st;
    font(c, 30, F_HUD); c.fillStyle = "#fff"; c.textAlign = "left"; c.textBaseline = "middle"; c.fillText(lab, x + 214, yy);
    const n = v > 5 ? 5 : v, fill = prog(t, t0 + 0.3 + i * 0.15, t0 + 0.9 + i * 0.15);
    for (let j = 0; j < 5; j++) { rrect(c, x + 214 + j * 34, yy + 18, 28, 16, 4); ink(c, j < n * fill ? (lab === "СЛОВ" || lab === "ДОБРОТА" ? C.hpR : C.hpG) : "#3a2a50", 3); }
    if (v > 5) arcadeText(c, "∞", x + 214 + 5 * 34 + 26, yy + 24, 48, C.yellow);
    if (v === 0) arcadeText(c, "0", x + 214 + 5 * 34 + 22, yy + 24, 36, C.hpR);
  });
  c.restore();
}
// большие надписи
const BANNERS = [
  [E.w_znak - 0.05, 1.3, "ROUND 1", C.yellow], [E.w_vyh - 0.05, 0.9, "FIGHT!", C.red],
  [E.w_mahn2 - 0.05, 1.2, "ROUND 2", C.yellow], [E.w_pryan - 0.1, 0.9, "FIGHT!", C.red], [E.w_lozh + 0.25, 1.3, "НИЧЬЯ", C.cyan],
  [E.w_mahn3 - 0.05, 1.2, "ROUND 3", C.yellow], [E.w_pryzh - 0.1, 1.0, "2 VS 1", C.red], [E.w_legli + 0.3, 1.3, "НИЧЬЯ", C.cyan],
  [E.w_vozvr + 0.1, 1.7, "БОНУСНЫЙ РАУНД", C.pink], [E.w_zveryam - 0.05, 0.9, "FIGHT!", C.red], [E.w_sobr - 0.05, 1.4, "FLAWLESS!", C.cyan],
  [E.w_rukopl - 0.05, 1.5, "PERFECT!", C.yellow], [GT1, 1.6, "K.O.", C.red],
];
function banner(c, t, b) {
  const [t0, dur, txt, col] = b, k = win(t, t0, t0 + dur, 0.04, 0.22); if (k <= 0) return;
  const s = springSlam(prog(t, t0, t0 + 0.7)), px = txt.length > 9 ? 110 : 170;
  c.save(); c.globalAlpha = k; c.translate(W / 2, 400); c.scale(lerp(2.4, 1, s), lerp(2.4, 1, s));
  // полосы скорости за надписью
  c.save(); c.globalAlpha = 0.5 * k; c.fillStyle = col; for (let i = -4; i <= 4; i++) { const yy = i * 26, len = 500 + 300 * Math.abs(Math.sin(i * 7.1)); c.fillRect(-len - 200 + ((t * 2400 + i * 300) % 400), yy - 3, len, 6); }
  c.restore();
  arcadeText(c, txt, 0, 0, px, col, { grad: ["#ffffff", col], lw: px * 0.13 });
  c.restore();
}
// квест-плашка
function questPlate(c, t) {
  const k = win(t, E.w_vozvr + 0.1, E.w_delorzh + 0.2, 0.3, 0.3); if (k <= 0) return;
  const s = springPop(prog(t, E.w_vozvr + 0.1, E.w_vozvr + 0.9));
  c.save(); c.globalAlpha = k; c.translate(W / 2, 540); c.scale(s, s);
  rrect(c, -360, -40, 720, 80, 18); ink(c, "rgba(27,16,38,0.92)", 5, C.pink);
  glove(c, -300, 0, 0.75, 0.3); arcadeText(c, "ЗАДАНИЕ: ВЕРНУТЬ ПЕРЧАТКУ", 30, 2, 40, "#fff", { lw: 7 });
  c.restore();
}
// экран «НАГРАДА?»
function rewardBox(c, t) {
  const k = win(t, E.w_ne - 0.1, E.E60 + 1.0, 0.25, 0.3); if (k <= 0) return;
  const s = springPop(prog(t, E.w_ne - 0.1, E.w_ne + 0.7)), pick = prog(t, E.w_nagr - 0.1, E.w_nagr + 0.25);
  c.save(); c.globalAlpha = k; c.translate(W / 2 + 540, 610); c.scale(s, s);
  rrect(c, -230, -110, 460, 220, 22); ink(c, "rgba(27,16,38,0.94)", 6, C.gold);
  arcadeText(c, "НАГРАДА?", 0, -60, 54, C.yellow, { grad: ["#fff6b0", C.gold] });
  const bx = [[-100, "ДА", "#2b6a3a"], [100, "НЕТ", C.redD]];
  for (const [x, lab, col] of bx) {
    const sel = lab === "НЕТ" ? pick : 0;
    rrect(c, x - 80, 0, 160, 76, 14); ink(c, sel > 0.5 ? C.red : col, 5, sel > 0.5 ? "#fff" : C.ink);
    arcadeText(c, lab, x, 40, 46, "#fff", { lw: 6 });
  }
  // курсор
  const cx = lerp(-100, 100, sstep(prog(t, E.w_ne + 0.2, E.w_nagr - 0.15)));
  c.fillStyle = C.yellow; c.beginPath(); c.moveTo(cx - 10, 96); c.lineTo(cx + 10, 96); c.lineTo(cx, 80); c.fill();
  c.restore();
}
// конфетти
const CONF = (() => { const r = mulberry32(11), a = []; for (let i = 0; i < 90; i++) a.push({ x: r() * W, v: 260 + r() * 260, sw: r() * 6, col: [C.yellow, C.pink, C.cyan, C.green, "#fff"][i % 5], d: r() * 0.6 }); return a; })();
function confetti(c, t) {
  const t0 = E.w_rukopl - 0.1, k = win(t, t0, E.L57 + 0.5, 0.05, 0.4); if (k <= 0) return;
  c.save(); c.globalAlpha = k;
  for (const p of CONF) { const tt = t - t0 - p.d; if (tt < 0) continue; const y = -30 + p.v * tt, x = p.x + Math.sin(tt * 3 + p.sw) * 40; c.save(); c.translate(x, y); c.rotate(tt * 5 + p.sw); c.fillStyle = p.col; c.fillRect(-8, -4, 16, 8); c.restore(); }
  c.restore();
}
// «WINNER»
function winner(c, t) {
  const t0 = E.E60 + 0.5, k = win(t, t0, E.fin + 0.2, 0.05, 0.3); if (k <= 0) return;
  const s = springSlam(prog(t, t0, t0 + 0.7));
  c.save(); c.globalAlpha = k; c.translate(W / 2, 380); c.scale(lerp(2, 1, s), lerp(2, 1, s));
  arcadeText(c, "ПОБЕДИТЕЛЬ:", 0, -70, 80, "#fff", { grad: ["#ffffff", C.cyan] });
  arcadeText(c, "ДЕЛОРЖ", 0, 50, 150, C.yellow, { grad: ["#fff6b0", C.gold] });
  c.restore();
}
// заставка: монетка и PRESS START
function intro(c, t) {
  const k = 1 - sstep(prog(t, E.V0 - 0.5, E.V0 - 0.1)); if (k <= 0) return;
  c.save(); c.globalAlpha = k;
  const coin = prog(t, 0.05, 0.55);
  if (coin < 1) { const y = lerp(470, 690, easeIn(coin)); c.save(); c.translate(W / 2, y); c.scale(Math.abs(Math.cos(coin * 9)) * 0.9 + 0.1, 1); circle(c, 0, 0, 34); ink(c, C.gold, 5); arcadeText(c, "$", 0, 2, 40, C.goldD, { lw: 0, shadow: false }); c.restore(); }
  rrect(c, W / 2 - 60, 690, 120, 18, 9); ink(c, "#20142e", 4);
  const blink = Math.floor(t * 3) % 2 === 0;
  if (t < 0.6 && blink) arcadeText(c, "INSERT COIN", W / 2, 760, 50, "#fff");
  if (t > 1.0 && blink) arcadeText(c, "PRESS START", W / 2, 760, 50, C.yellow);
  const fl = win(t, 0.55, 0.9, 0.03, 0.3); if (fl > 0) { c.fillStyle = `rgba(255,255,255,${0.8 * fl})`; c.fillRect(0, 0, W, H); }
  c.restore();
}

// ===== плашка строк и ярлык говорящего =====
const SPEAK = {}; for (let n = 44; n <= 46; n++) SPEAK[n] = ["КРАСАВИЦА", C.pink];
SPEAK[60] = ["ДЕЛОРЖ", C.blue];
function curLine(t) { let n = 0; for (let k = 1; k <= NL; k++) if (t >= E["L" + k] - 0.12) n = k; return n; }
function captionsPlate(c, t) {
  const k = sstep(prog(t, E.L1 - 0.6, E.L1 - 0.1)) * (1 - sstep(prog(t, E.fin - 0.3, E.fin + 0.05)));
  if (k <= 0) return;
  c.save(); c.globalAlpha = k;
  rrect(c, 120, 830, 1680, 160, 18); c.fillStyle = "rgba(22,12,40,0.93)"; c.fill(); c.lineWidth = 6; c.strokeStyle = C.gold; c.stroke();
  rrect(c, 132, 842, 1656, 136, 12); c.lineWidth = 2.5; c.strokeStyle = "rgba(255,204,61,0.55)"; c.stroke();
  // мигающий треугольник «дальше»
  if (Math.floor(t * 2.5) % 2 === 0) { c.fillStyle = C.gold; c.beginPath(); c.moveTo(1752, 958); c.lineTo(1772, 958); c.lineTo(1762, 970); c.fill(); }
  c.restore();
  const cur = curLine(t), spk = SPEAK[cur];
  if (spk && k > 0.5 && !(cur === 60 && t < E.w_ne - 0.1)) {
    const st = cur === 60 ? E.w_ne - 0.1 : E["L" + cur] - 0.15;
    const first = SPEAK[cur - 1] && SPEAK[cur - 1][0] === spk[0] ? 1 : prog(t, st, st + 0.45);
    c.save(); font(c, 32, F_HUD); const w = c.measureText(spk[0]).width + 40;
    c.translate(150, 812); c.scale(springPop(first), springPop(first)); slant(c, 0, -24, w, 48, 12); ink(c, spk[1], 4);
    c.fillStyle = "#fff"; c.textBaseline = "middle"; c.fillText(spk[0], 18, 2); c.restore();
  }
}

// ===== кадр =====
function renderAt(t) {
  ctx.reset();
  ctx.fillStyle = C.ink; ctx.fillRect(0, 0, W, H);
  drawWorld(ctx, t);
  // тон кадра: замедление перчатки, холод Делоржа, заставка и финал
  const slow = win(t, E.w_sorv, GF1 + 0.2, 0.15, 0.3);
  if (slow > 0) { ctx.fillStyle = `rgba(40,20,80,${0.22 * slow})`; ctx.fillRect(0, 0, W, H); arcadeText(ctx, "ЗАМЕДЛЕНИЕ", 1700, 240, 34, C.cyan, { lw: 6 }); }
  const cold = win(t, E.w_holod - 0.1, GT0, 0.25, 0.1);
  if (cold > 0) { ctx.fillStyle = `rgba(60,130,255,${0.22 * cold})`; ctx.fillRect(0, 0, W, H); }
  const hitFlash = Math.max(win(t, GT1, GT1 + 0.25, 0.02, 0.2), win(t, E.w_ryk, E.w_ryk + 0.2, 0.02, 0.15) * 0.6, win(t, E.w_gryan, E.w_gryan + 0.15, 0.02, 0.1) * 0.5);
  if (hitFlash > 0) { ctx.fillStyle = `rgba(255,255,255,${0.55 * hitFlash})`; ctx.fillRect(0, 0, W, H); }
  const dim = Math.max(0.62 * (1 - sstep(prog(t, E.V0 - 0.6, E.V0 - 0.1))), 0.6 * sstep(prog(t, E.fin - 0.2, E.fin + 0.5)));
  if (dim > 0) { ctx.fillStyle = `rgba(20,8,36,${dim})`; ctx.fillRect(0, 0, W, H); }
  // виньетка
  const vg = ctx.createRadialGradient(W / 2, H / 2, 500, W / 2, H / 2, 1150); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(10,0,20,0.45)"); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  hud(ctx, t);
  for (const cd of CARDS) card(ctx, t, cd);
  for (const b of BANNERS) banner(ctx, t, b);
  questPlate(ctx, t); rewardBox(ctx, t); confetti(ctx, t); winner(ctx, t); intro(ctx, t);
  // финал: «GAME OVER» мигает под заголовком
  const fk = sstep(prog(t, E.fin + 0.6, E.fin + 1.2));
  if (fk > 0) { ctx.save(); ctx.globalAlpha = fk; if (Math.floor(t * 2) % 2 === 0) arcadeText(ctx, "PRESS START", W / 2, 640, 50, C.yellow); for (let i = 0; i < 10; i++) { const a = i * 0.63; star4(ctx, W / 2 + Math.cos(a) * (700 + 40 * (i % 3)), 330 + Math.sin(a * 1.3) * 200, 24 * Math.abs(Math.sin(t * 2.2 + i)), "#fffbe0"); } ctx.restore(); }
  captionsPlate(ctx, t);
  textAt(t);
}

// ===== текст =====
const NL = Object.keys(E).filter((k) => /^L\d+$/.test(k)).length;
const CAPS = [...document.querySelectorAll(".cap")].map((el) => ({ el, n: +el.dataset.n, last: "" }));
const WORDS = [...document.querySelectorAll(".cap .w")].map((el) => ({ el, at: +el.dataset.at, last: -1 }));
const ROWS = [844, 912];
function capState(n, t) {
  const B = CFG.blocks.find((b) => n >= b[0] && n <= b[1]);
  const Ln = (k) => E["L" + k];
  const next = n < B[1] ? Ln(n + 1) : null, next2 = n + 1 < B[1] ? Ln(n + 2) : null;
  const endBlock = B[1] < NL ? Ln(B[1] + 1) - 0.3 : E.fin - 0.35;
  let y = ROWS[1], op = sstep(prog(t, Ln(n) - 0.12, Ln(n) + 0.05));
  if (next !== null) y = lerp(ROWS[1], ROWS[0], springSoft(prog(t, next - 0.12, next + 0.6)));
  if (next2 !== null && next2 - 0.12 < endBlock) { const u = sstep(prog(t, next2 - 0.12, next2 + 0.16)); y -= 72 * u; op *= 1 - u; }
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
  const ti = win(t, 0.6, E.V0 - 0.25, 0.3, 0.25), tf = sstep(prog(t, E.fin + 0.25, E.fin + 0.8));
  setTitle("tt1", ti, 0.6, t); setTitle("tt2", tf, E.fin + 0.25, t);
}
const TT = {};
function setTitle(id, k, t0, t) {
  const el = TT[id] || (TT[id] = document.getElementById(id)); if (!el) return;
  const s = springSlam(prog(t, t0, t0 + 0.8));
  el.style.opacity = k <= 0 ? "0" : k.toFixed(3); el.style.transform = `translate(0px, ${((1 - s) * -160).toFixed(1)}px) scale(${(0.8 + 0.2 * s).toFixed(3)})`;
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
