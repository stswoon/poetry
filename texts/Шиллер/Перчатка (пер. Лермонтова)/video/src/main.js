// ---------- Режиссура (перевод Лермонтова): двор → раунд 1 (лев) → раунд 2 (тигр) → перчатка между ними → бонусный раунд рыцаря → K.O. → рыцарь уходит ----------
const ctx = document.getElementById("scene").getContext("2d");
const E = EV;
const LIONX = 560, TIGX = 1010, GLOVE_G = [805, 812];   // лев и тигр лежат мордами друг к другу, перчатка между ними
const S_LION = 0.8, S_TIG = 0.78, S_BALC = 0.55, S_KN = 0.86;
const speedOf = (f, t) => Math.abs(f(t + 0.04) - f(t - 0.04)) / 0.08;

// ===== ворота ===== (средние ворота у Лермонтова не открываются: барсов нет)
const GATE_OPEN = [
  [[0, 0], [E.w_dver - 0.15, 1, 1.1]],                       // лев: «скрыпучую дверь отворяют» — медленно
  [[0, 0]],
  [[0, 0], [E.w_pryzh - 0.45, 1, 0.25]],                     // тигр
];

// ===== лев =====
const LW0 = E.w_vyh - 0.1, LW1 = Math.max(E.E10 + 0.1, LW0 + 2.2), LW2 = Math.max(E.w_glyad, LW1 + 0.4);   // «тяжёлой стопой»
const lionX = (t) => kfe([[0, GATES[0]], [LW0, LIONX, LW2 - LW0]], t);
const lionY = (t) => kfe([[0, GATE_BOT], [LW0, GROUND, LW1 - LW0]], t);
const lionS = (t) => kfe([[0, 0.5], [LW0, S_LION, LW1 - LW0]], t);
function lionP(t) {
  const x = lionX(t), sp = speedOf(lionX, t) + speedOf(lionY, t);
  const lie = sstep(prog(t, E.w_lozh1 - 0.15, E.w_lozh1 + 0.5));
  const around = win(t, E.w_molcha2 - 0.1, E.w_zev, 0.3, 0.3);                 // «молча вдруг глядит вокруг»
  let look = around > 0 ? [Math.sin((t - E.w_molcha2) * 2.4), -0.3 + 0.3 * Math.sin((t - E.w_molcha2) * 1.6)] : [0.2, 0];
  const wt = win(t, E.w_vstr - 0.2, E.w_ryad, 0.3, 0.4); if (wt > 0) look = [lerp(look[0], clamp((tigerXf(t) - x) / 300, -1, 1), wt), look[1]];
  const wg = win(t, GF0, GF1 + 0.4, 0.3, 0.4); if (wg > 0) look = [lerp(look[0], 0.5, wg), lerp(look[1], lerp(-1, 0.6, prog(t, GF0, GF1)), wg)];
  const wk = win(t, E.L41, E.L48, 0.4, 0.4); if (wk > 0) look = [lerp(look[0], clamp((knightX(t) - x) / 500, -1, 1), wk), look[1]];
  return {
    x, y: lionY(t), s: lionS(t), dir: 1, walk: x / 52, stride: clamp(sp / 70, 0, 1), lie, look,
    brow: win(t, E.w_rab - 0.1, E.w_nevol, 0.2, 0.3) * 0.8,                          // раб ворчит — владыка хмурится
    mane: win(t, E.w_tryas - 0.05, E.E14 + 0.15, 0.1, 0.25),
    mouth: Math.max(win(t, E.w_zev - 0.05, E.w_zev + 1.1, 0.3, 0.35), 0.35 * win(t, E.w_lev - 0.05, E.w_lev + 0.5, 0.08, 0.2)),
    sleep: win(t, E.w_lozh1 + 0.6, E.w_vstr - 0.3, 0.4, 0.2) * 0.7 + win(t, E.w_ryad + 0.6, E.w_sverhu, 0.5, 0.2) * 0.6,
    blink: blinkAt(t, 0.3), tilt: around > 0 ? 0.12 * Math.sin((t - E.w_molcha2) * 2.4) * around : 0,
    tail: lie * 0.5, ph: 0.4,
  };
}
// ===== тигр =====
const TJ0 = E.w_pryzh - 0.2, TJ1 = TJ0 + 0.85, TLAND = 1110;                       // «с диким прыжком взлетел»
const CIRC0 = E.w_tiho - 0.1, CIRC1 = Math.max(E.E26 + 0.1, CIRC0 + 3.0);           // «тихо владельца обходит»
function tigerBase(t) {
  if (t < TJ1) { const u = prog(t, TJ0, TJ1); return { x: lerp(GATES[2], TLAND, u), y: lerp(GATE_BOT, GROUND, u) - Math.sin(u * Math.PI) * 240, s: lerp(0.55, S_TIG, u), dir: -1, jump: Math.sin(u * Math.PI) }; }
  if (t < CIRC0) { const x = kfe([[TJ1, TLAND], [E.w_vstr - 0.15, LIONX + 360, Math.max(0.6, E.w_zavyl - E.w_vstr)]], t); return { x, y: GROUND, s: S_TIG, dir: -1 }; }
  if (t < CIRC1) {
    const u = easeInOut(prog(t, CIRC0, CIRC1)), th = u * TAU, R = 360, x = LIONX + R * Math.cos(th), dep = Math.sin(th);
    return { x, y: GROUND - 34 * dep, s: S_TIG * (1 - 0.12 * dep), dir: th < Math.PI ? -1 : 1 };
  }
  const x = kfe([[CIRC1, LIONX + 360], [CIRC1 + 0.1, TIGX, Math.max(0.6, E.w_lozh2 - CIRC1 - 0.3)]], t);
  return { x, y: GROUND, s: S_TIG, dir: t < CIRC1 + 0.3 ? 1 : -1 };   // после круга разворачивается мордой ко льву, пятится, ворча, и ложится
}
const tigerXf = (t) => tigerBase(t).x;
function tigerP(t) {
  const b = tigerBase(t), sp = speedOf(tigerXf, t);
  const lie = sstep(prog(t, E.w_lozh2 - 0.1, E.w_lozh2 + 0.5));
  const stalk = win(t, CIRC0 - 0.2, CIRC1, 0.3, 0.3);
  let look = t > E.w_vstr - 0.2 && t < E.w_ryad ? [clamp((LIONX - b.x) / 200, -1, 1), 0.15] : [0, 0];
  const wg = win(t, GF0, GF1 + 0.4, 0.3, 0.4); if (wg > 0) look = [lerp(look[0], -0.5, wg), lerp(look[1], lerp(-1, 0.6, prog(t, GF0, GF1)), wg)];
  const wk = win(t, E.L41, E.L48, 0.4, 0.4); if (wk > 0) look = [lerp(look[0], clamp((knightX(t) - b.x) / 500, -1, 1), wk), look[1]];
  return {
    ...b, walk: b.x / (stalk > 0.5 ? 30 : 46) * b.dir, stride: clamp(sp / 80, 0, 1) * (stalk > 0.5 ? 0.6 : 1),
    lie, crouch: Math.max(stalk * 0.7, win(t, E.w_rab - 0.1, E.w_lozh2, 0.2, 0.3) * 0.5),
    mouth: Math.max(win(t, E.w_zavyl - 0.08, E.w_zavyl + 1.1, 0.08, 0.3), win(t, E.w_vorch - 0.1, E.w_zlit + 0.4, 0.1, 0.2) * 0.45 * (0.6 + 0.4 * Math.sin(t * 18))),
    snarl: win(t, E.w_glaz - 0.1, E.w_lozh2 + 0.3, 0.2, 0.3), brow: win(t, E.w_glaz - 0.2, E.w_lozh2, 0.2, 0.3),
    redEye: win(t, E.w_glaz - 0.15, E.w_nevol, 0.2, 0.4),                          // «глаз кровавых не сводит»
    lash: win(t, E.w_hvost - 0.1, E.E24 + 0.3, 0.1, 0.2), tail: -0.7 * stalk, look, blink: blinkAt(t, 1.3), ph: 1.1,   // крадётся — хвост низко
    sleep: win(t, E.w_lozh2 + 0.8, E.w_sverhu, 0.3, 0.2) * 0.4,
  };
}
// ===== Делорж =====
// весь путь — одна координата q: на балконе и лестнице q = x, после подножия (QB) — путь по песку / SAND_K.
// Ступни ставятся в узлы сетки q с шагом в ступень: на лестнице каждая нога встаёт ровно на ступень, на песке шаг длиннее.
const PICKX = GLOVE_G[0] + 80, KN_BALC = 1470, SAND_K = 3, Q_TOP = STAIR.x0 - 6, EXIT_X = 2160;
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
// в финале («тотчас покинул») рыцарь уходит вниз по лестнице и вдоль стены за край кадра
let EXITING = false;
const pathAt = (q) => (q <= QB ? [q, stairLevel(q)] : EXITING ? [Math.min(EXIT_X, QB + (q - QB) * SAND_K), GATE_BOT] : sandAt((q - QB) * SAND_K));
const KW0 = E.w_rycar3 - 0.1, KW1 = KW0 + 0.5;                          // «с балкона в минуту бежит»
const KS0 = KW1, KS1 = Math.max(E.w_vstup - 0.2, KS0 + 1.6);             // бегом вниз по лестнице, «дерзко в круг он вступает»
const KP = Math.max(E.w_podym2 - 0.1, KS1 + 2.4);                        // к перчатке «меж диких зверей», «подымает»
const KB0 = Math.max(KP + 0.8, E.w_trep - 0.4), KB1 = KB0 + 2.6;         // назад по песку под взглядами двора
const KU0 = KB1, KU1 = Math.max(E.w_hvala - 0.2, KU0 + 2.2);             // вверх по лестнице: «приносит назад»
const KR1 = Math.max(E.w_vzglyad - 0.2, KU1 + 0.9);                      // по балкону к Кунигунде
const KL0 = E.w_pokin - 0.25, KL1 = KL0 + 4.2;                           // «тотчас покинул»: вниз и прочь
const Q_EXIT = QB + (EXIT_X - QB) / SAND_K;
const KQ = [[0, KN_BALC], [KW0, Q_TOP, KW1 - KW0], [KS0, QB, KS1 - KS0], [KS1, Q_PICK, KP - KS1], [KB0, QB, KB1 - KB0], [KU0, Q_TOP, KU1 - KU0],
            [KU1, KN_BALC, KR1 - KU1], [KL0, Q_EXIT, KL1 - KL0]];
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
  EXITING = t > KL0 - 0.1;
  const q = knightQ(t), [x, g0] = pathAt(q);
  const sq = Math.abs(knightQ(t + 0.04) - knightQ(t - 0.04)) / 0.08, go = sstep(clamp(sq / 30, 0, 1)); // 0 — стоит, 1 — идёт
  const v = knightX(t + 0.05) - knightX(t - 0.05);
  const dir = v > 0.5 ? 1 : v < -0.5 ? -1 : t > KL0 ? 1 : -1;
  // ступни в мире: шаг по сетке, а когда стоит — рядом под телом
  const fw = [0, 1].map((j) => { const f = stepFoot(q, j), rx = x + (j ? 7 : -7);
    return { x: lerp(rx, f.x, go), g: lerp(g0, f.g, go), lift: f.lift * go * 15 }; });
  let y = Math.max(fw[0].g, fw[1].g);             // тело опирается на нижнюю ступню — до неё нога дотягивается
  const s = lerp(S_BALC, S_KN, (y - BFLOOR) / (GROUND - BFLOOR)), st = s * PPL.knight.h;
  const feet = fw.map((f) => [(f.x - x) * dir / st, (f.g - f.lift - y) / st]), shadows = fw.map((f) => [(f.x - x) * dir / st, (f.g - y) / st]);
  const onBalc = q < STAIR.x0 + 4, sand = q > QB + 1;
  const pop = springPop(prog(t, E.w_rycar1 - 0.3, E.w_rycar1 + 0.5));         // появляется у перил, когда к нему обращается Кунигунда
  if (t < E.w_rycar1 + 0.5) y += (1 - pop) * 200;
  const bend = win(t, KP - 0.5, KP + 0.55, 0.4, 0.4), hold = sstep(prog(t, KP + 0.1, KP + 0.65));   // присел, наклонился, взял
  const throwK = prog(t, E.w_kinul - 0.25, E.w_kinul + 0.1), thr = win(t, E.w_kinul - 0.3, E.w_kinul + 0.6, 0.12, 0.3);
  let arms = null;
  if (bend > 0 || (t > KP && t < E.w_kinul + 0.1)) {
    const reach = [lerp(14, 50, bend), lerp(88, 80, bend)];   // рука вперёд-вниз в наклонённом корпусе — кисть у песка
    arms = [[-14, 88], t > KP ? [lerp(reach[0], 48, hold), lerp(reach[1], 10, hold)] : reach];
  }
  if (thr > 0) arms = [[-14, 88], [lerp(-40, 80, easeOut(throwK)), lerp(-60, -10, easeOut(throwK))]];
  const fire = win(t, E.w_dosad - 0.2, E.w_kinul + 0.7, 0.3, 0.4);            // «досады жестокой пылая в огне»
  return {
    x, y, s, dir, onBalc, sand, legs: true, feet, shadows, arms, bend, fire, crouch: 70 * bend, lean: 0.5 * bend,
    look: [0.4, 0], cold: Math.max(fire, win(t, E.w_kinul, E.E54 + 0.6, 0.2, 0.4)), blink: blinkAt(t, 0.9), ph: 0.7,
    mouth: win(t, E.L54 - 0.05, E.E54, 0.05, 0.1) * (0.5 + 0.5 * Math.sin(t * 22)),
    holdGlove: t > KP + 0.05 && t < E.w_kinul - 0.02,
  };
}
// ===== перчатка =====
const GF0 = E.w_sverhu - 0.05, GF1 = Math.max(E.w_mezhdu + 0.1, GF0 + 2.0), GT0 = E.w_kinul - 0.02, GT1 = GT0 + 0.32;   // падает медленно, «судьбы случайной игрою»
const FACE_B = [1342, BFLOOR - 0.94 * S_BALC * 251];
function gloveState(t) {
  if (t < GF0) return null;
  if (t < GF1) {
    const u = prog(t, GF0, GF1), uy = easeIn(u);
    return { x: lerp(1318, GLOVE_G[0], easeInOut(u)) + Math.sin(u * 11) * 60 * (1 - u), y: lerp(318, GLOVE_G[1], uy), a: u * 11 + Math.sin(u * 6) * 0.5, s: lerp(0.55, 0.9, u), glow: 0 };
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
  { who: "lady1", x: 1010, ph: 1.7, pop: "w_hor" }, { who: "lady2", x: 1115, ph: 0.9, pop: "w_hor", d: 0.3 }, { who: "lady3", x: 1222, ph: 2.4, pop: "w_dam" },
  { who: "beauty", x: 1342, ph: 0.2, pop: "w_blest", d: -0.1 },
];
function blinkAt(t, s = 0) { const p = (t + s) % 3.3; return p < 0.13 ? Math.sin((p / 0.13) * Math.PI) : 0; }
const KING_WAVES = [E.L7 - 0.15, E.w_mahn];   // «царскому знаку внимают», «царь махнул снова»
function courtPose(m, t) {
  const o = { x: m.x, y: BFLOOR, s: S_BALC, dir: 1, ph: m.ph, blink: blinkAt(t, m.ph * 3), look: [0, 0.6] };
  if (m.pop) { const t0 = E[m.pop] + (m.d || 0); o.y += (1 - springPop(prog(t, t0 - 0.2, t0 + 0.7))) * 220; }
  // общие реакции: в строфе 1 «молча зрелища ждали» — рты закрыты
  const excite = Math.max(win(t, E.w_lev - 0.1, E.L11, 0.2, 0.4), win(t, E.w_pryzh, E.L23, 0.2, 0.4));
  const fear = win(t, E.L45 - 0.1, E.L47, 0.3, 0.5) + 0.6 * win(t, E.w_zavyl - 0.05, E.w_zavyl + 1.5, 0.1, 0.4);
  const watchGlove = win(t, GF0, E.E34 + 0.5, 0.2, 0.4);
  const clap = win(t, E.w_hvala - 0.15, E.L49 + 0.3, 0.2, 0.4);
  o.mouth = Math.max(excite * 0.5 * (0.5 + 0.5 * Math.sin(t * 9 + m.ph)), fear * 0.9, watchGlove * 0.6);
  o.fear = fear; o.smile = 0.5 + clap * 0.5;
  const kx = knightX(t);
  const watchKnight = win(t, E.L41, E.L49, 0.4, 0.4);
  if (watchGlove > 0) o.look = [clamp((GLOVE_G[0] - m.x) / 500, -1, 1) * watchGlove, 1];
  if (watchKnight > 0) o.look = [clamp((kx - m.x) / 400, -1, 1), kx > STAIR.x0 - 40 || kx < 1300 ? 1 : 0];
  const lady = m.who.startsWith("lady") || m.who === "beauty";
  if (clap > 0) { const k = Math.abs(Math.sin(t * 14 + m.ph)), hx = 26 - 22 * (1 - k); o.arms = [[hx, 50], [-hx, 50]]; } // ладони сходятся перед грудью
  else if (lady) o.arms = [[-14, 88], [36, 4]]; // левая опущена, правая с веером у плеча
  if (lady) o.hand = [null, (c, x, y) => { if (!o.noFan) fan(c, x, y - 6, -0.6 + Math.sin(t * 7 + m.ph) * 0.25 * (1 - clap), PPL[m.who].trim === "#fff" ? "#ffe9a8" : C.pinkL); }];
  if (m.who === "king") {
    o.y = BFLOOR + 18; o.look = [0.2, 0.8];
    let up = 0; for (const tw of KING_WAVES) up = Math.max(up, win(t, tw - 0.25, tw + 0.9, 0.15, 0.35));
    o.arms = [[-14, 88], [lerp(14, 46, up), lerp(88, -96, up) + Math.sin(t * 16) * 10 * up]];
    o.mouth = Math.max(o.mouth, up * 0.6);
  }
  if (m.who === "beauty") {
    const lean = win(t, E.w_sverhu - 0.7, GF0 + 0.3, 0.3, 0.2);                   // перчатка соскальзывает с руки
    o.gloveOn = t < GF0;
    if (lean > 0) o.arms = [[lerp(-14, -44, lean), lerp(88, 78, lean)], o.arms[1]];
    const sly = win(t, E.L35 - 0.1, E.E40 + 0.3, 0.3, 0.3);                       // «лукаво смеясь»
    o.sly = sly; if (sly > 0) { o.look = [1, -0.2]; o.smile = 0.7; }
    o.dir = 1;
    if (t > E.w_smeyas - 0.1 && t < E.w_smeyas + 0.6) o.mouth = 0.4 + 0.3 * Math.sin(t * 30);   // смешок
    if (t > E.L37 - 0.1 && t < E.E40) o.mouth = 0.5 + 0.5 * Math.sin(t * 20);
    const love = win(t, E.w_nezh - 0.1, E.w_dosad + 0.2, 0.3, 0.3);               // «нежный, пылающий взгляд»
    if (love > 0) { o.smile = 1; o.look = [1, 0]; }
    o.love = love;
    const hand = win(t, E.w_ruk - 0.2, E.w_dosad + 0.3, 0.3, 0.3);                // «с рукой девицы героя встречает»
    if (hand > 0) { o.arms = [o.arms[0], [lerp(36, 78, hand), lerp(4, 30, hand)]]; o.noFan = hand > 0.4; }
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
const TWO_B = [760, 655, 1.5], T_FACE = [820, 668, 2.4], T_TAIL = [990, 660, 1.8], T_LIE = [790, 680, 1.55], T_ANGRY = [890, 672, 2.1], G_LAND = [805, 700, 1.7];
const CAM = [
  [0, [960, 540, 1.0]], [E.V0 - 0.35, [440, 268, 2.0], 0.7], [E.L1 + 0.6, [700, 268, 2.0], E.E2 - E.L1],          // «вельможи толпою стояли»
  [E.L3 - 0.1, SH.KING, 0.4], [E.L5 - 0.1, SH.BALC, 0.5], [E.w_hor - 0.2, SH.LADIES, 0.45], [E.w_blest - 0.3, SH.LADIES2, 0.8],
  [E.L7 - 0.35, SH.KING, 0.35], [E.E7 - 0.15, SH.G1, 0.6], [E.w_lev - 0.1, SH.G1b, 0.5], [E.w_vyh + 0.2, SH.LION, 1.2],
  [E.L11 - 0.1, SH.LFACE, 0.4], [E.w_zev - 0.2, SH.LYAWN, 0.35], [E.w_tryas - 0.2, SH.LMANE, 0.35], [E.L15 - 0.1, SH.LLIE, 0.5],
  [E.L17 - 0.15, SH.KING, 0.35], [E.w_tigr - 0.2, SH.G3, 0.35], [E.w_pryzh - 0.25, SH.TIGJUMP, 0.35], [E.L21 - 0.1, TWO_B, 0.4],
  [E.w_zavyl - 0.15, T_FACE, 0.3], [E.L23 - 0.1, T_TAIL, 0.35], [E.L25 - 0.1, SH.CIRC, 0.5],
  [E.L27 - 0.1, TWO_B, 0.4], [E.w_vorch - 0.2, T_ANGRY, 0.35], [E.L29 - 0.1, T_LIE, 0.5],
  [E.L31 - 0.35, SH.BEAUTY, 0.35], [E.w_mezhdu - 0.25, G_LAND, 0.4],
  [E.L35 - 0.1, SH.TWO, 0.4], [E.w_kunig - 0.2, SH.BFACE, 0.35], [E.L37 - 0.1, SH.BEAUTY, 0.35], [E.L39 - 0.1, SH.TWO, 0.35], [E.w_podym - 0.2, SH.BFACE, 0.35],
  [E.L45 - 0.1, SH.FEAR1, 0.35], [E.w_trep - 0.2, SH.FEAR2, 0.35],
  [E.w_hvala - 0.2, SH.BALCR, 0.4], [E.L49 - 0.1, SH.BFACE, 0.35], [E.L50 - 0.1, SH.TWO, 0.35],
  [E.L52 - 0.1, SH.KFACE, 0.3], [E.L53 - 0.1, SH.TWO, 0.3], [E.L54 - 0.1, [1400, 300, 1.9], 0.4], [E.L55 - 0.1, [1560, 420, 1.35], 0.5], [E.E55 + 0.3, SH.WIDE, 1.2],
];
// следование: [начало, конец, функция → кадр]
const FOLLOW = [
  [E.L26 - 0.25, E.E26 + 0.15, (t) => { const b = tigerBase(t); return [b.x + b.dir * 105, GROUND - 95, 2.5]; }],               // «глаз кровавых не сводит»
  [GF0 + 0.1, GF1 + 0.2, (t) => { const g = gloveState(t) || { x: GLOVE_G[0], y: GLOVE_G[1] }; return [g.x, g.y, 1.8]; }],      // падение перчатки
  [KW0 + 0.3, E.L45 - 0.1, (t) => { const k = knightP(t); return [k.x + 110 * k.dir * (t > KP ? 0.3 : 1), k.y - 150 * k.s, k.sand ? 1.45 : 1.6]; }],
  [E.L47 - 0.8, E.w_hvala - 0.2, (t) => { const k = knightP(t); return [k.x + 80 * k.dir, k.y - 160 * k.s, 1.5]; }],
];
// встряски: [время, сила]
const SHAKES = [[E.w_otvor, 8], [TJ1, 12], [E.w_zavyl, 22], [GF1, 8], [GT1, 14], [E.L7 + 0.1, 6]];
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

// «досады жестокой пылая в огне»: языки пламени за спиной рыцаря
function fireAura(c, kn, t) {
  const k = kn.fire || 0; if (k <= 0) return;
  const sc = kn.s * PPL.knight.h, cx = kn.x, top = kn.y - 330 * sc, bot = kn.y - 120 * sc;
  c.save(); c.globalAlpha = 0.85 * k;
  for (let i = 0; i < 9; i++) {
    const u = i / 8, x = cx + (u - 0.5) * 150 * sc, hgt = (90 + 50 * Math.sin(t * 11 + i * 1.7)) * sc * (0.6 + 0.4 * Math.sin(u * Math.PI)), y0 = lerp(bot, top + 60 * sc, Math.sin(u * Math.PI));
    c.beginPath(); c.moveTo(x - 20 * sc, y0 + 40 * sc); c.quadraticCurveTo(x - 24 * sc, y0 - hgt * 0.5, x + 4 * sc * Math.sin(t * 9 + i), y0 - hgt);
    c.quadraticCurveTo(x + 24 * sc, y0 - hgt * 0.5, x + 20 * sc, y0 + 40 * sc); c.closePath(); c.fillStyle = i % 2 ? "#ff7a1a" : "#ff3b3b"; c.fill();
  }
  c.restore();
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
    if (m.who === "beauty" && o.love > 0) { for (const sx of [-1, 1]) heart(c, o.x + sx * 7 * S_BALC * 0.94 * 1.0, o.y - S_BALC * 0.94 * 255, 0.42 * springPop(prog(t, E.w_nezh - 0.1, E.w_nezh + 0.6)) * o.love * (1 + 0.15 * Math.sin(t * 9)), C.red); }
  }
  if (kn.onBalc) { fireAura(c, kn, t); person(c, "knight", { ...kn, hand: [null, kHand] }, t); }
  // «трепеща»: сердечки дам дрожат и трескаются
  const hk = win(t, E.w_trep - 0.3, E.L47 + 0.3, 0.2, 0.3);
  if (hk > 0) for (const m of COURT.slice(4)) heart(c, m.x + 18 + Math.sin(t * 40 + m.ph) * 3, 175 + Math.sin(t * 4 + m.ph) * 6, 0.9 * hk, C.red, prog(t, E.w_trep - 0.1, E.w_trep + 0.4));
  c.drawImage(BG_FRONT, 0, 0, WW, H);
  // ворота, глаза, факелы
  for (let i = 0; i < 3; i++) gate(c, GATES[i], kf(GATE_OPEN[i], t), t);
  const eyesK = win(t, E.V0 - 0.5, E.L4, 0.4, 0.4);
  gateEyes(c, GATES[0], (eyesK + win(t, E.L7 - 0.5, E.w_dver, 0.3, 0.1)) * (1 - prog(t, E.w_dver, E.w_dver + 0.5)), t);
  gateEyes(c, GATES[2], (eyesK + win(t, E.L17 - 0.3, E.w_pryzh, 0.3, 0.1)) * (1 - prog(t, E.w_pryzh - 0.3, E.w_pryzh)), t, "#ff9a3a");
  torches(c, t);
  // звери и рыцарь по глубине
  const actors = [];
  if (t > E.w_dver + 0.05) actors.push({ y: lionY(t), d: () => { c.save(); c.globalAlpha = clamp((t - E.w_dver - 0.05) / 0.45, 0, 1); beast(c, "lion", lionP(t), t); c.restore(); } });   // проступает из темноты, когда решётка поднята
  if (t > TJ0) { const p = tigerP(t); actors.push({ y: p.y, d: () => beast(c, "tiger", p, t) }); }
  if (!kn.onBalc) actors.push({ y: kn.y + 2, d: () => { fireAura(c, kn, t); person(c, "knight", { ...kn, hand: [null, kHand] }, t); } });
  const gs = gloveState(t);
  if (gs && !gs.top) actors.push({ y: gs.ground ? GLOVE_G[1] + 1 : 9999, d: () => glove(c, gs.x, gs.y, gs.s, gs.a, gs.glow) });
  actors.sort((a, b) => a.y - b.y).forEach((a) => a.d());
  if (gs && gs.top) glove(c, gs.x, gs.y, gs.s, gs.a, 0);
  // эффекты
  dust(c, GATES[0] + 40, GATE_BOT + 10, t, E.w_otvor - 0.1, 0.8);
  dust(c, TLAND, GROUND, t, TJ1 - 0.05);
  dust(c, LIONX, GROUND, t, E.w_lozh1 + 0.2, 0.7);
  dust(c, TIGX, GROUND, t, E.w_lozh2 + 0.3, 0.6);
  dust(c, GLOVE_G[0], GLOVE_G[1], t, GF1 - 0.03, 0.5);
  const th = tigerBase(E.w_zavyl);
  shock(c, th.x - 120, GROUND - 110, t, E.w_zavyl);
  hitStars(c, FACE_B[0], FACE_B[1], t, GT1);
  zzz(c, LIONX + 110, GROUND - 140, t, win(t, E.w_lozh1 + 0.6, E.w_mahn + 0.3, 0.4, 0.3));
  worldText(c, "!", LIONX + 380, GROUND - 230, t, E.w_vstr - 0.05, 0.9, 110, C.red);
  worldText(c, "У-У-У!", th.x - 60, GROUND - 300, t, E.w_zavyl, 1.2, 92, "#ff7a1a");
  worldText(c, "ррр…", TIGX - 150, GROUND - 210, t, E.w_vorch - 0.05, 1.1, 56, "#ffb070");
  worldText(c, "+1 ПЕРЧАТКА", PICKX, GROUND - 300, t, KP + 0.1, 0.85, 46, C.pinkL);
  c.restore();
}

// ===== HUD файтинга =====
const SEG = [
  [E.L7 - 0.2, { p1: ["ЛЕВ", "lion"], p2: ["???", null], b1: [[0, 0], [E.w_lev, 1, 0.8]], b2: [[0, 0]] }],
  [E.w_mahn - 0.1, { p1: ["ЛЕВ", "lion"], p2: ["ТИГР", "tiger"], b1: [[0, 1]], b2: [[0, 0], [E.w_tigr, 1, 0.8], [E.w_nevol, 0.45, 0.6]] }],
  [E.L35 - 0.2, { p1: ["КУНИГУНДА", "beauty"], p2: ["РЫЦАРЬ", "knight"], b1: [[0, 1]], b2: [[0, 1]] }],
  [E.w_rycar3 - 0.1, { p1: ["РЫЦАРЬ", "knight"], p2: ["ЗВЕРИ ×2", "lion"], b1: [[0, 1]], b2: [[0, 1]] }],
  [E.L52 - 0.2, { p1: ["РЫЦАРЬ", "knight"], p2: ["ГОРДОСТЬ", "beauty"], b1: [[0, 1]], b2: [[0, 1], [GT1, 0, 0.5]] }],
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
  const k = sstep(prog(t, E.L7 - 0.3, E.L7 + 0.3)) * (1 - sstep(prog(t, E["E" + NL] + 0.6, E["E" + NL] + 1.1)));
  if (k <= 0) return;
  let seg = SEG[0]; for (const s of SEG) if (t >= s[0]) seg = s;
  const S = seg[1], sw = springSnap(prog(t, seg[0], seg[0] + 0.5));
  c.save(); c.globalAlpha = k; c.translate(0, -140 * (1 - k));
  portrait(c, 40, 30, 110, S.p1[1], t, false);
  portrait(c, W - 150, 30, 110, S.p2[1], t, true);
  hpBar(c, 176, 48, 640, 44, kf(S.b1, t) * sw, false, S.p1[0], k);
  hpBar(c, W - 176 - 640, 48, 640, 44, kf(S.b2, t) * sw, true, S.p2[0], k);
  // таймер
  const r0 = E.L7 - 0.2, fast = prog(t, E.L29, E.w_sverhu) * 30;   // время стоит, пока падает перчатка
  let tv = Math.max(0, 99 - Math.floor((t - r0) * 0.7 + fast)); if (t > E.w_sverhu) tv = Math.max(0, 99 - Math.floor((E.w_sverhu - r0) * 0.7 + 30));
  rrect(c, W / 2 - 66, 26, 132, 100, 14); ink(c, "#20142e", 5);
  arcadeText(c, String(tv).padStart(2, "0"), W / 2, 78, 78, C.yellow, { grad: ["#fff6b0", C.gold] });
  c.restore();
}
// карточки бойцов
const CARDS = [
  [E.w_korol - 0.1, E.L5 + 0.4, "right", "КОРОЛЬ", "king", ["ХОЗЯИН АРЕНЫ"]],
  [E.w_lev - 0.05, E.L11 + 0.2, "right", "ЛЕВ", "lion", [["СИЛА", 5], ["ЛЕНЬ", 5]]],
  [E.w_tigr - 0.05, E.w_vstr - 0.1, "left", "ТИГР", "tiger", [["ЯРОСТЬ", 5], ["СМЕЛОСТЬ", 3]]],
  [E.w_kunig - 0.1, E.L38 + 0.3, "left", "КУНИГУНДА", "beauty", [["КОВАРСТВО", 5], ["ДОБРОТА", 1]]],
  [E.w_rycar3 - 0.05, E.L42 + 0.6, "left", "РЫЦАРЬ", "knight", [["СМЕЛОСТЬ", 9], ["СКОРОСТЬ", 5]]],
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
    for (let j = 0; j < 5; j++) { rrect(c, x + 214 + j * 34, yy + 18, 28, 16, 4); ink(c, j < n * fill ? (lab === "ДОБРОТА" ? C.hpR : C.hpG) : "#3a2a50", 3); }
    if (v > 5) arcadeText(c, "∞", x + 214 + 5 * 34 + 26, yy + 24, 48, C.yellow);
  });
  c.restore();
}
// большие надписи
const BANNERS = [
  [E.L7 - 0.05, 1.3, "ROUND 1", C.yellow], [E.w_vyh - 0.05, 0.9, "FIGHT!", C.red],
  [E.w_mahn - 0.05, 1.2, "ROUND 2", C.yellow], [E.w_tigr + 0.25, 0.9, "FIGHT!", C.red, 330], [E.w_ryad + 0.1, 1.3, "НИЧЬЯ", C.cyan],
  [E.E40 + 0.05, 1.5, "БОНУСНЫЙ РАУНД", C.pink, 205, 100], [E.w_vstup - 0.05, 0.9, "FIGHT!", C.red, 205, 120], [KP + 1.0, 1.2, "FLAWLESS!", C.cyan, 200, 120],
  [E.w_hvala - 0.05, 1.5, "PERFECT!", C.yellow, 660, 150], [GT1, 1.6, "K.O.", C.red, 225, 130],
];
function banner(c, t, b) {
  const [t0, dur, txt, col, by = 400, bpx = 0] = b, k = win(t, t0, t0 + dur, 0.04, 0.22); if (k <= 0) return;
  const s = springSlam(prog(t, t0, t0 + 0.7)), px = bpx || (txt.length > 9 ? 110 : 170);
  c.save(); c.globalAlpha = k; const s0 = bpx ? 1.5 : 2.4; c.translate(W / 2, by); c.scale(lerp(s0, 1, s), lerp(s0, 1, s));
  // полосы скорости за надписью
  c.save(); c.globalAlpha = 0.5 * k; c.fillStyle = col; for (let i = -4; i <= 4; i++) { const yy = i * 26, len = 500 + 300 * Math.abs(Math.sin(i * 7.1)); c.fillRect(-len - 200 + ((t * 2400 + i * 300) % 400), yy - 3, len, 6); }
  c.restore();
  arcadeText(c, txt, 0, 0, px, col, { grad: ["#ffffff", col], lw: px * 0.13 });
  c.restore();
}
// квест-плашка
function questPlate(c, t) {
  const k = win(t, E.w_podym - 0.05, E.E40 + 0.15, 0.3, 0.2); if (k <= 0) return;   // уходит, когда влетает «БОНУСНЫЙ РАУНД»
  const s = springPop(prog(t, E.w_podym - 0.05, E.w_podym + 0.75));
  c.save(); c.globalAlpha = k; c.translate(W / 2, 205); c.scale(s, s);
  rrect(c, -360, -40, 720, 80, 18); ink(c, "rgba(27,16,38,0.92)", 5, C.pink);
  glove(c, -300, 0, 0.75, 0.3); arcadeText(c, "ЗАДАНИЕ: ПОДНЯТЬ ПЕРЧАТКУ", 30, 2, 40, "#fff", { lw: 7 });
  c.restore();
}
// экран «НАГРАДА?»
function rewardBox(c, t) {
  const k = win(t, E.w_blag - 0.1, E.E54 + 1.0, 0.25, 0.3); if (k <= 0) return;
  const s = springPop(prog(t, E.w_blag - 0.1, E.w_blag + 0.7)), pick = prog(t, E.w_nadob - 0.1, E.w_nadob + 0.25);
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
  const cx = lerp(-100, 100, sstep(prog(t, E.w_blag + 0.2, E.w_nadob - 0.15)));
  c.fillStyle = C.yellow; c.beginPath(); c.moveTo(cx - 10, 96); c.lineTo(cx + 10, 96); c.lineTo(cx, 80); c.fill();
  c.restore();
}
// конфетти
const CONF = (() => { const r = mulberry32(11), a = []; for (let i = 0; i < 90; i++) a.push({ x: r() * W, v: 260 + r() * 260, sw: r() * 6, col: [C.yellow, C.pink, C.cyan, C.green, "#fff"][i % 5], d: r() * 0.6 }); return a; })();
function confetti(c, t) {
  const t0 = E.w_hvala - 0.1, k = win(t, t0, E.L49 + 0.5, 0.05, 0.4); if (k <= 0) return;
  c.save(); c.globalAlpha = k;
  for (const p of CONF) { const tt = t - t0 - p.d; if (tt < 0) continue; const y = -30 + p.v * tt, x = p.x + Math.sin(tt * 3 + p.sw) * 40; c.save(); c.translate(x, y); c.rotate(tt * 5 + p.sw); c.fillStyle = p.col; c.fillRect(-8, -4, 16, 8); c.restore(); }
  c.restore();
}
// «WINNER»
function winner(c, t) {
  const t0 = E["E" + NL] + 0.5, k = win(t, t0, E.fin + 0.2, 0.05, 0.3); if (k <= 0) return;
  const s = springSlam(prog(t, t0, t0 + 0.7));
  c.save(); c.globalAlpha = k; c.translate(W / 2, 380); c.scale(lerp(2, 1, s), lerp(2, 1, s));
  arcadeText(c, "ПОБЕДИТЕЛЬ:", 0, -70, 80, "#fff", { grad: ["#ffffff", C.cyan] });
  arcadeText(c, "РЫЦАРЬ", 0, 50, 150, C.yellow, { grad: ["#fff6b0", C.gold] });
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
const SPEAK = {}; for (let n = 37; n <= 40; n++) SPEAK[n] = ["КУНИГУНДА", C.pink];
SPEAK[54] = ["РЫЦАРЬ", C.blue];
function curLine(t) { let n = 0; for (let k = 1; k <= NL; k++) if (t >= E["L" + k] - 0.12) n = k; return n; }
function captionsPlate(c, t) {
  const k = sstep(prog(t, E.L1 - 0.6, E.L1 - 0.1)) * (1 - sstep(prog(t, E.fin - 0.3, E.fin + 0.05)));
  if (k <= 0) return;
  c.save(); c.globalAlpha = k;
  rrect(c, 120, 830, 1680, 160, 18); c.fillStyle = "rgba(22,12,40,0.985)"; c.fill(); c.lineWidth = 6; c.strokeStyle = C.gold; c.stroke();
  rrect(c, 132, 842, 1656, 136, 12); c.lineWidth = 2.5; c.strokeStyle = "rgba(255,204,61,0.55)"; c.stroke();
  // мигающий треугольник «дальше»
  if (Math.floor(t * 2.5) % 2 === 0) { c.fillStyle = C.gold; c.beginPath(); c.moveTo(1752, 958); c.lineTo(1772, 958); c.lineTo(1762, 970); c.fill(); }
  c.restore();
  const cur = curLine(t), spk = SPEAK[cur];
  if (spk && k > 0.5) {
    const st = E["L" + cur] - 0.15;
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
  const slow = win(t, GF0, GF1 + 0.2, 0.15, 0.3);
  if (slow > 0) { ctx.fillStyle = `rgba(40,20,80,${0.22 * slow})`; ctx.fillRect(0, 0, W, H); arcadeText(ctx, "ЗАМЕДЛЕНИЕ", 1700, 240, 34, C.cyan, { lw: 6 }); }
  const hot = win(t, E.w_dosad - 0.1, GT0, 0.25, 0.1);   // «пылая в огне» — красный жар
  if (hot > 0) { ctx.fillStyle = `rgba(255,70,30,${0.2 * hot})`; ctx.fillRect(0, 0, W, H); }
  const hitFlash = Math.max(win(t, GT1, GT1 + 0.25, 0.02, 0.2), win(t, E.w_zavyl, E.w_zavyl + 0.2, 0.02, 0.15) * 0.6, win(t, TJ1 - 0.05, TJ1 + 0.1, 0.02, 0.1) * 0.4);
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
  if (fk > 0) { ctx.save(); ctx.globalAlpha = fk; if (Math.floor(t * 2) % 2 === 0) arcadeText(ctx, "PRESS START", W / 2, 640, 50, C.yellow); for (let i = 0; i < 10; i++) { const a = i * 0.63, sx = W / 2 + Math.cos(a) * (700 + 40 * (i % 3)), sy = 330 + Math.sin(a * 1.3) * 200; if (Math.abs(sx - W / 2) < 660 && sy > 420 && sy < 560) continue; star4(ctx, sx, sy, 24 * Math.abs(Math.sin(t * 2.2 + i)), "#fffbe0"); } ctx.restore(); }
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
