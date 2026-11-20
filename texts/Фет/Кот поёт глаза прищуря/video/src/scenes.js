// ---------- Режиссура: камера, позы и события по времени слов ----------
const EV = CFG.ev;
const ANCHOR = [960, 420];   // точка экрана, куда камера ставит свою цель (низ кадра — под строки)
// [время, мир, x, y, zoom, переход, длительность]
const SHOTS = [
  [0, "yard", 960, 330, 0.95, "cut", 0],
  [1.0, "yard", 960, 450, 1.15, "move", 1.9],
  [3.0, "yard", 960, 668, 3.6, "in", 0.38],
  [3.38, "room", 430, 700, 1.75, "cut", 0],
  [EV.L2 - 0.12, "room", 1130, 820, 1.6, "whip", 0.28],
  [EV.L3 - 0.12, "room", 840, 335, 1.55, "whip", 0.28],
  [EV.svish4 - 0.06, "yard", 930, 520, 2.3, "cut", 0],
  [EV.svish4 + 0.2, "yard", 900, 520, 2.6, "move", 0.9],
  [EV.E4 + 0.1, "room", 1000, 560, 0.8, "whip", 0.3],
  [EV.L5 - 0.25, "room", 1300, 640, 0.95, "move", 0.8],
  [EV.spryach - 0.1, "room", 700, 760, 1.25, "whip", 0.25],
  [EV.vstavai - 0.14, "room", 1180, 780, 1.6, "whip", 0.2],
  [EV.L7 - 0.1, "room", 1330, 640, 0.95, "move", 0.5],
  [EV.L8 - 0.08, "room", 1180, 760, 1.9, "whip", 0.25],
  [EV.L9 - 0.1, "room", 1100, 700, 1.15, "cut", 0],
  [EV.kot2 - 0.1, "room", 430, 660, 3.0, "cut", 0],
  [EV.poet2 - 0.05, "room", 430, 700, 1.75, "move", 0.5],
  [EV.L11 - 0.12, "room", 700, 500, 0.95, "whip", 0.28],
  [EV.L12 - 0.32, "room", 840, 335, 3.4, "in", 0.3],
  [EV.L12 - 0.02, "yard", 1520, 620, 1.3, "cut", 0],
  [EV.vorot, "yard", 1000, 420, 0.82, "move", 1.3],
  [EV.E12 + 0.9, "room", 736, 560, 1.6, "whip", 0.3],
];
const FLASH = [3.38, EV.L12 - 0.02, EV.svish4 - 0.06];
const PUNCH = [[EV.kot, 0.1], [EV.vstavai + 0.05, 0.12], [EV.svish4, 0.08], [EV.klok, 0.06], [EV.svish12, 0.06], [EV.vstal, 0.06]];
function shotIndex(t) { let i = 0; while (i + 1 < SHOTS.length && t >= SHOTS[i + 1][0]) i++; return i; }
function camAt(t) {
  const i = shotIndex(t), s = SHOTS[i];
  const to = [s[2], s[3], s[4]];
  if (i === 0 || s[5] === "cut" || t >= s[0] + s[6]) return to;
  const p = SHOTS[i - 1];
  if (p[1] !== s[1]) return to;
  const from = camAt(s[0] - 1e-4);
  const u0 = (t - s[0]) / s[6];
  const u = s[5] === "whip" ? easeIO(u0) : s[5] === "in" ? easeIn(u0) : easeIO(u0);
  // зум в логарифме — равномерный наезд
  return [lerp(from[0], to[0], u), lerp(from[1], to[1], u), Math.exp(lerp(Math.log(from[2]), Math.log(to[2]), u))];
}
// сила штрихов рывка и направление
function whipAt(t) {
  const i = shotIndex(t), s = SHOTS[i];
  if (s[5] !== "whip" || t >= s[0] + s[6] || i === 0) return [0, 1, 0];
  const p = camAt(s[0] - 1e-4), u = (t - s[0]) / s[6];
  return [Math.sin(u * Math.PI), s[2] - p[0], s[3] - p[1]];
}
const bump = (u) => (u < 0 ? 0 : clamp(u / 0.06) * Math.exp(-u * 5));
function punchAt(t) { let k = 1; for (const [tp, a] of PUNCH) k += a * bump(t - tp); return k; }
function shakeAt(t) {
  let a = 0;
  for (const tp of [EV.vstavai + 0.05, EV.sneg + 0.03, EV.valit + 0.03, EV.klok + 0.03]) a += 14 * Math.exp(-Math.max(0, t - tp) * 9) * (t >= tp ? 1 : 0);
  return [Math.sin(t * 61) * a, Math.cos(t * 53) * a];
}

// ---------- Позы кота ----------
function catPose(t) {
  const open = t >= EV.glazami - 0.3 && t < EV.poet2 - 0.05 ? SPRING((t - (EV.glazami - 0.3)) / 0.4) : t >= EV.poet2 - 0.05 ? 1 - easeOut((t - EV.poet2 + 0.05) / 0.18) : 0;
  let look = 0.55;
  if (t >= EV.povodil - 0.05) look = lerp(0.55, -0.9, easeIO(inv(EV.povodil - 0.05, EV.povodil + 0.35, t)));
  if (t >= EV.povodil + 0.4) look = lerp(-0.9, 1, easeIO(inv(EV.povodil + 0.4, EV.povodil + 0.95, t)));
  let ear = 0;
  for (const tp of [EV.vstavai + 0.05, EV.sneg + 0.03, EV.valit + 0.03, EV.klok + 0.03]) if (t >= tp && t < tp + 0.5) ear = (t - tp) / 0.5;
  const ext = ease(inv(EV.spryach + 0.05, EV.spryach + 0.33, t)) * (1 - ease(inv(EV.igrush + 0.55, EV.igrush + 0.95, t)));
  const sweep = ease(inv(EV.igrush - 0.02, EV.igrush + 0.4, t));
  return {
    eyes: clamp(open, 0, 1.08), look, sing: open > 0.5 ? 0.55 : 1, ear, sway: Math.sin(t * 2.4) * 0.05,
    tailExt: ext, tailSweep: sweep, blush: 0.5 + 0.5 * Math.sin(t * 1.3),
  };
}
// отражение мальчика в зрачке кота: крошечный силуэт идёт к двери (вправо)
function catReflect(t) {
  if (t < EV.kot2 - 0.1 || t > EV.poet2) return null;
  const u = inv(EV.kot2, EV.povodil + 0.95, t);
  return (g, px, py, sd) => {
    const rx = px + lerp(-8, 10, u), ry = py + 4;
    g.save(); g.globalAlpha = 0.85; g.fillStyle = "rgba(255,240,200,0.95)";
    ell(g, rx, ry - 7, 3.2, 3.2); g.fill(); rr(g, rx - 2.6, ry - 4, 5.2, 8, 2); g.fill();
    g.restore();
  };
}

// ---------- Позы мальчика ----------
const POP1 = EV.vstavai + 0.05, POP2 = EV.vstal;
function boyPose(t) {
  if (t < POP1) {
    const shake = t > EV.L5 ? Math.sin(t * 30) * 0.06 * inv(EV.L5, POP1, t) : 0;
    return { pose: "lie", face: "sleep", bubble: clamp(0.55 + 0.45 * Math.sin(t * 2.4) + (t > EV.L5 ? 0.3 * inv(EV.L5, POP1, t) : 0) + shake, 0, 1.3) };
  }
  if (t < POP2) {
    const u = t - POP1, hop = u < 0.3 ? -Math.sin(u / 0.3 * Math.PI) * 40 : 0;
    if (t < EV.L7 - 0.1) return { pose: "sit", face: "shock", hands: [[-100, -212], [100, -212]], hop, pop: clamp(u / 0.35), bob: Math.sin(t * 20) * 2 * Math.exp(-u * 3) };
    if (t < EV.spat - 0.1) {
      const r = Math.sin(t * 13) * 7;
      return { pose: "sit", face: "rub", hands: [[-38 + r, -214], [36, -58]], tilt: 0.06 };
    }
    if (t < EV.E8 + 0.35) {
      const m = SPRING((t - EV.spat + 0.1) / 0.5), up = easeOut(inv(EV.spat - 0.1, EV.spat + 0.35, t));
      return { pose: "sit", face: "yawn", mouth: m, tear: clamp((t - EV.spat - 0.2) / 0.3), tilt: -0.1 * up,
        hands: [[lerp(-34, -92, up), lerp(-60, -300, up)], [lerp(34, 92, up), lerp(-60, -300, up)]] };
    }
    const d = easeOut(inv(EV.E8 + 0.35, EV.E8 + 0.75, t));
    return { pose: "sit", face: "smile", hands: [[lerp(-92, -34, d), lerp(-300, -60, d)], [lerp(92, 34, d), lerp(-300, -60, d)]], tilt: 0.04 };
  }
  const u = t - POP2, hop = u < 0.32 ? -Math.sin(u / 0.32 * Math.PI) * 50 : 0;
  const wave = t > POP2 + 0.35 ? Math.sin((t - POP2) * 12) * 22 : 0;
  const wv = easeOut(inv(POP2 + 0.25, POP2 + 0.5, t));
  return { pose: "stand", face: "smile", hop, lookX: -1,
    hands: [[-72, -128], [lerp(72, 104 + wave, wv), lerp(-128, -300, wv)]] };
}
const BOY_GONE = EV.kot2 - 0.05;

// ---------- Состояние комнаты ----------
function roomState(t) {
  const open = ease(inv(EV.L5 - 0.55, EV.L5 + 0.1, t)) * (1 - ease(inv(25.75, 26.0, t)));
  const stormy = 1 + 0.6 * (pulse(t, EV.L3, EV.E4 + 0.5) + pulse(t, EV.L11, EV.E12));
  return {
    door: open, storm: stormy,
    stormInWin: t < EV.E4 + 0.2 ? ease(inv(EV.L3 - 0.2, EV.L3 + 0.6, t)) : (t > EV.L11 - 0.6 && t < EV.L12 ? 1 : 0),
    juggle: t < EV.L4 ? 1 : 0, blowWin: t > EV.L4 && t < EV.E4 + 0.3 ? 0.6 : 0,
    rattle: pulse(t, EV.svish4, EV.E4 + 0.8) + (t > EV.sneg && t < EV.E11 ? 0.6 : 0),
    flap: clamp(pulse(t, EV.svish4, EV.E4 + 1.4) * (1 - inv(EV.E4 + 0.5, EV.E4 + 1.4, t) * 0.8)),
    lampSwing: pulse(t, EV.E4, EV.L5 + 0.5),
    splats: [{ x: 700, y: 265, t0: EV.sneg + 0.03 }, { x: 975, y: 390, t0: EV.valit + 0.03 }, { x: 790, y: 455, t0: EV.klok + 0.03 }],
  };
}
// игрушки: [вид, x, y, поворот, момент взлёта]
const TOYS = [["horse", 770, 872, 0, 0], ["ball", 850, 892, 0, 1], ["block", 916, 906, 0.1, 2], ["block", 962, 884, -0.15, 3]];
function drawToys(g, t) {
  const [bx, by] = ROOM.box;
  for (const [kind, x, y, r, k] of TOYS) {
    const t0 = EV.igrush + 0.08 + k * 0.1, u = (t - t0) / 0.4;
    if (u >= 1) continue;
    if (u <= 0) { drawToy(g, kind, x, y + Math.sin(t * 2 + k) * 0, 0.9, r); continue; }
    const px = lerp(x, bx, u), py = lerp(y, by - 60, u) - Math.sin(u * Math.PI) * 220;
    drawToy(g, kind, px, py, 0.9, r + u * 6 * (k % 2 ? 1 : -1));
  }
  const lid = t > EV.spryach - 0.1 && t < EV.igrush + 1.0 ? SPRING((t - EV.spryach + 0.1) / 0.5) * (1 - ease(inv(EV.igrush + 0.7, EV.igrush + 1.0, t))) : 0;
  drawBox(g, bx, by, 0.9, clamp(lid, 0, 1.1));
  // искры над коробом после уборки
  if (t > EV.igrush + 0.45 && t < EV.igrush + 1.2) for (let i = 0; i < 4; i++) sparkle(g, bx - 60 + i * 40, by - 140 - (t - EV.igrush) * 60 - i * 12, 18, 1 - inv(EV.igrush + 0.45, EV.igrush + 1.2, t), i % 2 ? C.yellow : C.white);
}
function catNotes(g, t, x, y, a) {
  if (a <= 0) return;
  for (let k = 0; k < 6; k++) {
    const u = (t * 0.5 + k / 6) % 1, cols = [C.hot, C.violet, [255, 170, 60]];
    note(g, x + 70 + u * 260 + Math.sin(u * 7 + k) * 26, y - 30 - u * 300, 0.75 + 0.25 * Math.sin(k), Math.sin(u * 5 + k) * 0.35, cols[k % 3], a * Math.sin(u * Math.PI), k % 3 === 1);
  }
}
function boyZs(g, t, x, y, a) {
  if (a <= 0) return;
  for (let k = 0; k < 3; k++) { const u = (t * 0.45 + k / 3) % 1; zee(g, x + u * 90 + Math.sin(u * 6) * 14, y - u * 170, 0.6 + u * 0.6, a * Math.sin(u * Math.PI)); }
}
function drawRoomScene(g, t) {
  const st = roomState(t);
  drawRoom(g, t, st);
  drawMomShadow(g, t, st.door * pulse(t, EV.L5 - 0.1, EV.E8 + 0.6), ease(inv(EV.podoidi, EV.proshch, t)));
  drawToys(g, t);
  // кот на подушке
  const [cx, cy] = ROOM.cat, cp = catPose(t);
  drawCushion(g, ROOM.cushion[0], ROOM.cushion[1], 1);
  drawCat(g, cx, cy, 1, t, cp);
  catNotes(g, t, cx, cy - 190, cp.sing > 0.8 ? 1 : 0.35);
  // мальчик
  if (t < BOY_GONE) {
    const bp = boyPose(t), [bx, by] = ROOM.boy, s = ROOM.boyS;
    drawBoy(g, bx, by + (bp.hop || 0), s, t, bp);
    if (bp.pose === "lie") boyZs(g, t, bx - 60, by - 170, 1);
    if (t >= POP1 && t < POP1 + 0.3) puff(g, bx, by - 90, 105, (t - POP1) / 0.3);
    if (t >= POP2 && t < POP2 + 0.3) puff(g, bx, by - 40, 105, (t - POP2) / 0.3);
    if (t >= POP1 && t < EV.L7 + 0.2) bang(g, bx + 110, by - 245, SPRING((t - POP1) / 0.4) * 1.2, 1 - inv(EV.L7 - 0.1, EV.L7 + 0.2, t));
  }
}
function yardState(t) {
  // дух бури: вступление — пролетает справа налево, жонглируя; строка 4 — крупно свистит; строка 12 — у калитки
  if (t < 3.4) {
    const u = inv(0.0, 2.9, t);
    return { storm: [lerp(2000, 120, ease(u)), 560 + Math.sin(u * 5) * 50, 0.6], stormO: { juggle: 1, lookX: -1 }, notes: 1, gate: 0.6 };
  }
  if (t < EV.L12 - 0.1) return { storm: [960, 470, 1.3], stormO: { blow: easeOut(inv(EV.svish4 - 0.1, EV.svish4 + 0.15, t)), dir: -1 }, gate: 1 };
  const up = ease(inv(EV.vorot + 0.2, EV.E12 + 0.8, t));
  return { storm: [lerp(1730, 1500, up), lerp(540, 300, up), lerp(0.85, 0.7, up)], stormO: { blow: easeOut(inv(EV.svish12 - 0.15, EV.svish12 + 0.1, t)) * (1 - up * 0.7), dir: -1 }, gate: 1.6, notes: 1 };
}
function drawYardScene(g, t) { drawYard(g, t, yardState(t)); }
