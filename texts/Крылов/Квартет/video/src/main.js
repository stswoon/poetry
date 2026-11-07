// ---------- Режиссура: выход участников → инструменты → три провала → драка → Соловей → вердикт ----------
const ctx = document.getElementById("scene").getContext("2d");
const E = EV;
const KINDS = ["mart", "osel", "kozel", "mish"];
const SC = { mart: 0.95, osel: 0.95, kozel: 0.95, mish: 0.98 };
const POS = {
  line: { mart: [560, 1], osel: [830, 1], kozel: [1100, 1], mish: [1370, 1] },
  A: { mart: [600, 1], osel: [845, -1], kozel: [1110, 1], mish: [1375, 1] },
  B: { mish: [560, 1], kozel: [820, -1], mart: [1110, 1], osel: [1370, -1] },
  C: { mart: [590, 1], osel: [840, 1], kozel: [1090, 1], mish: [1360, 1] },
  P: { mart: [1000, 1], osel: [1125, 1], kozel: [1250, 1], mish: [1390, 1] },
};
const ENTER = { mart: [E.L1 - 0.15, -260], osel: [E.L2 - 0.2, -260], kozel: [E.L3 - 0.2, 2180], mish: [E.L4 - 0.15, 2200] };
const FAILS = [E.w_derut, E.w_neid1, E.w_neid2]; // моменты фальши
const XS = [E.w_net, E.w_neid1 + 0.15, E.w_neid2 + 0.15]; // большой «✕» жюри
const FIGHT = [E.w_razb - 0.1, E.E25 + 0.35];

// ---------- Дорожки героев: ключи [время, x, dir, sit, способ] ----------
function track(kind) {
  const [t0, x0] = ENTER[kind], L = POS.line[kind], A = POS.A[kind], B = POS.B[kind], Cc = POS.C[kind], P = POS.P[kind];
  const dirIn = x0 < 0 ? 1 : -1;
  const k = [[0, x0, dirIn, 0, "walk"], [t0, x0, dirIn, 0, "walk"], [t0 + 1.15, L[0], dirIn, 0, "walk"], [t0 + 1.5, L[0], L[1], 0, "walk"]];
  k.push([E.w_seli - 0.15, L[0], L[1], 0, "slide"], [E.w_seli + 0.45, A[0], A[1], 1, "slide"]);
  // на речь Мартышки все смотрят на неё
  const lookM = kind === "mart" ? A[1] : -1;
  k.push([E.L10 - 0.1, A[0], A[1], 1, "slide"], [E.L10 + 0.25, A[0], lookM, 1, "slide"]);
  k.push([E.w_rass - 0.15, A[0], lookM, 1, "slide"], [E.w_rass + 0.75, B[0], B[1], 1, "slide"]);
  const lookO = kind === "osel" ? B[1] : 1;
  k.push([E.L18 - 0.1, B[0], B[1], 1, "slide"], [E.L18 + 0.25, B[0], lookO, 1, "slide"]);
  k.push([E.w_usel - 0.15, B[0], lookO, 1, "slide"], [E.w_usel + 0.7, Cc[0], Cc[1], 1, "slide"]);
  k.push([E.L23 - 0.05, Cc[0], Cc[1], 1, "slide"], [E.L23 + 0.3, Cc[0], Cc[1], 0, "walk"]);
  k.push([E.L27 + 0.1, Cc[0], Cc[1], 0, "walk"], [E.L27 + 1.4 + KINDS.indexOf(kind) * 0.1, P[0], P[1], 0, "walk"]);
  return k;
}
const TRACKS = Object.fromEntries(KINDS.map((k) => [k, track(k)]));
function place(kind, t) {
  const tr = TRACKS[kind];
  let a = tr[0], b = tr[0];
  for (let i = 0; i < tr.length - 1; i++) if (t >= tr[i][0] && t < tr[i + 1][0]) { a = tr[i]; b = tr[i + 1]; break; }
  if (t >= tr[tr.length - 1][0]) a = b = tr[tr.length - 1];
  const u = prog(t, a[0], b[0]), e = b[4] === "slide" ? easeInOut(u) : u;
  const x = lerp(a[1], b[1], e), d = lerp(a[2], b[2], sstep(u)), sit = lerp(a[3], b[3], sstep(u));
  const moving = Math.abs(b[1] - a[1]) > 4 && u > 0 && u < 1;
  return { x, dir: Math.abs(d) < 0.15 ? Math.sign(d || 1) * 0.15 : d, sit, walk: moving && b[4] === "walk" ? t * 13 : null, slide: moving && b[4] === "slide" };
}

// ---------- Состояние героя в момент t ----------
const INST_AT = { mish: E.w_basa, kozel: E.w_alta, mart: E.w_skr, osel: E.w_skr + 0.12 };
function heroAt(kind, t) {
  const p = place(kind, t), o = { t, dir: p.dir, sit: p.sit, walk: p.walk };
  let y = FLOOR, extraRot = 0;
  // вход: подскоки; Мартышка — сальто
  const [t0] = ENTER[kind];
  if (t > t0 && t < t0 + 1.5) {
    const u = prog(t, t0, t0 + 1.15);
    if (kind === "mart") { y -= Math.sin(u * Math.PI) * 150; extraRot = u < 1 ? -easeInOut(prog(u, 0.25, 0.85)) * TAU : 0; }
    else if (kind === "kozel") y -= Math.abs(Math.sin(u * Math.PI * 3)) * 70 * (1 - sstep(prog(u, 0.9, 1)));
    else if (kind === "mish") o.lean = Math.sin(t * 9) * 0.08;
    o.walk = u < 1 ? t * (kind === "mish" ? 9 : 14) : null;
  }
  // выход со взмахом, «Затеяли сыграть Квартет!»
  const wave = win(t, t0 + 1.0, t0 + 1.9, 0.1, 0.2) + win(t, E.w_kv1 - 0.15, E.E5 + 0.35, 0.1, 0.25);
  o.inst = t >= INST_AT[kind] ? 1 : 0;
  o.pose = wave > 0.5 && !o.inst ? "up" : o.inst ? "inst" : "down";
  if (wave > 0.5 && !o.inst) o.bob = Math.abs(Math.sin(t * 9)) * 14;
  if (o.inst && t < INST_AT[kind] + 0.5) o.bob = Math.sin(prog(t, INST_AT[kind], INST_AT[kind] + 0.5) * Math.PI) * 30;
  // игра и фальшь
  const play = win(t, E.w_udar - 0.1, E.E9 + 0.2, 0.15, 0.3) + win(t, E.w_nach - 0.1, E.E17 + 0.3, 0.15, 0.3) + win(t, E.E21 - 0.05, E.E22 + 0.3, 0.15, 0.3);
  const scr = FAILS.reduce((m, f, i) => Math.max(m, win(t, f - 0.05, [E.E9, E.E17, E.E22][i] + 0.25, 0.08, 0.3)), 0);
  o.play = clamp(play, 0, 1); o.screech = scr; o.ph = t * (scr > 0.3 ? 34 : 13) + KINDS.indexOf(kind) * 1.3;
  if (scr > 0.3) { o.lean = (o.lean ?? 0) + Math.sin(t * 25 + kind.length) * 0.05; o.blink = 0.8; }
  else o.blink = ((t * 0.37 + kind.length * 0.13) % 1) > 0.96 ? 1 : 0;
  // речь Мартышки: встаёт на стул, дирижирует смычком
  if (kind === "mart") {
    const st = win(t, E.L10 - 0.15, E.E15 + 0.3, 0.3, 0.35);
    y -= SEAT * SC.mart * sstep(st); o.sit = lerp(o.sit, 0, sstep(st));
    if (st > 0.5) { o.pose = "point"; o.excite = 1; o.talk = talking(t, [[E.L10, E.E15]]); o.lean = 0.05 + Math.sin(t * 5) * 0.05; o.kick = 0; }
    if (t > E.L15 - 0.1 && t < E.E15 + 0.3) o.bob = Math.abs(Math.sin(t * 7.5)) * 26;
  }
  // Осёл предлагает «секрет»
  if (kind === "osel") {
    const st = win(t, E.L18 - 0.1, E.E20 + 0.3, 0.3, 0.35);
    o.sit = lerp(o.sit, 0, sstep(st));
    if (st > 0.5) { o.pose = "point"; o.talk = talking(t, [[E.L18, E.E20]]); o.lean = -0.08; }
  }
  // все — за спором, затем просят Соловья
  if (t > E.L23 - 0.1 && t < FIGHT[0] + 0.3) { o.talk = 0.5 + 0.5 * Math.sin(t * 20 + kind.length); o.lean = Math.sin(t * 8 + kind.length) * 0.12; }
  const dz = win(t, FIGHT[1] - 0.1, E.L27 + 0.6, 0.1, 0.4); if (dz > 0.3) { o.daze = true; o.lean = Math.sin(t * 4 + kind.length) * 0.1; }
  if (t > E.L28 - 0.1 && t < E.E31 + 0.2) { o.talk = talking(t, [[E.L28, E.E31]]); o.lean = 0.12; o.headRot = -0.2; o.look = [0.6, -0.8]; }
  if (t > E.L27 && t < E.E36 + 2) { o.headRot = (o.headRot ?? 0) - 0.15; o.look = [0.6, -0.8]; }
  // «инструменты есть»: поднимают и показывают
  const show = win(t, E.w_instr - 0.1, E.w_instr + 0.9, 0.12, 0.3); if (show > 0) { o.bob = (o.bob ?? 0) + show * 34; o.glow = show * 0.8; }
  // «уши ваши понежней» — у Осла уши растут
  if (kind === "osel") { o.bigEars = 1 + 0.35 * win(t, E.w_ushi - 0.05, E.w_ponezh + 0.6, 0.25, 0.3); o.ear = win(t, E.w_ushi, E.w_ponezh + 0.6, 0.2, 0.3) * 0.15; }
  // вердикт — поникли
  const sad = sstep(prog(t, E.w_godit - 0.2, E.w_godit + 0.8));
  if (sad > 0) { o.sad = sad; o.look = [0, 0.6]; o.headRot = 0; if (kind === "osel") o.ear = Math.max(o.ear ?? 0, sad * 0.9); }
  return { kind, x: p.x, y, o, s: SC[kind], rot: extraRot, slide: p.slide, hidden: t > FIGHT[0] + 0.25 && t < FIGHT[1] - 0.15 };
}
// рот открывается на словах из интервалов
function talking(t, spans) {
  for (const [a, b] of spans) if (t >= a && t <= b) return 0.35 + 0.35 * Math.sin(t * 19) + 0.3 * Math.sin(t * 31);
  return 0;
}

// ---------- Стулья ----------
const SCATTER = { mart: [380, 1.5], osel: [700, -1.45], kozel: [1260, 1.55], mish: [1580, -1.5] };
function chairAt(kind, t, h) {
  const t0 = E.w_seli - 0.35;
  if (t < t0) return null;
  const pop = springPop(prog(t, t0, t0 + 1.2));
  let x = h.x, y = FLOOR, rot = 0, s = SC[kind] * pop, q = 0, dir = Math.sign(h.o.dir) || 1;
  const fl = FIGHT[0] + 0.35 + KINDS.indexOf(kind) * 0.22;
  if (t > fl) { // вылетают из драки и падают
    const u = prog(t, fl, fl + 0.9), sx = SCATTER[kind];
    x = lerp(1000, sx[0], u); y = lerp(640, FLOOR, u) - Math.sin(u * Math.PI) * 360; rot = u * sx[1] * (u < 1 ? 3 : 1); if (u >= 1) rot = sx[1];
  }
  // «как нам сесть» и «как ни садитесь» — стулья кружат с вопросами
  const orb = Math.max(win(t, E.w_sest - 0.15, E.L32 + 0.4, 0.4, 0.4), win(t, E.w_sadit - 0.4, E.w_godit + 0.3, 0.4, 0.35));
  if (orb > 0) {
    const i = KINDS.indexOf(kind), a = t * 2.4 + i * TAU / 4, ox = 1200 + Math.cos(a) * 380, oy = FLOOR - 60 + Math.sin(a) * 60 - 120;
    x = lerp(x, ox, orb); y = lerp(y, oy, orb); rot = lerp(rot, Math.sin(t * 6 + i) * 0.4, orb); s = lerp(s, 0.7, orb);
    q = t < E.L32 ? prog(t, E.w_sest - 0.1, E.w_sest + 0.6) : prog(t, E.w_sadit - 0.2, E.w_sadit + 0.5);
    q *= orb > 0.6 ? 1 : 0; dir = Math.cos(a) > 0 ? -1 : 1;
  }
  // после вердикта стулья валятся
  const fall = sstep(prog(t, E.w_godit + 0.3, E.w_godit + 1.0));
  if (fall > 0 && orb < 0.5) { const sx = SCATTER[kind]; rot = lerp(rot, sx[1] * 0.98, fall); }
  return { x, y, rot, s, q, dir, behind: orb < 0.5 };
}

// ---------- Соловей ----------
function birdAt(t) {
  const t0 = E.w_solov - 0.5, t1 = E.w_prilet + 0.35;
  if (t < t0) return null;
  const u = prog(t, t0, t1), e = easeInOut(u);
  const x = lerp(-120, BRANCH[0], e), y = lerp(180, BRANCH[1] - 40, e) - Math.sin(e * Math.PI) * 140;
  const fly = u < 1, sing = Math.max(talking(t, [[E.L32, E.E33], [E.L35, E.E36]]), win(t, E.w_prilet + 0.3, E.w_prilet + 1.0) * 0.8);
  const glow = sstep(prog(t, E.L32 - 0.4, E.L32 + 0.3)) * (1 - 0.6 * sstep(prog(t, E.w_godit, E.w_godit + 0.8)));
  return { x, y, o: { t, fly, flap: fly ? 0.5 + 0.5 * Math.sin(t * 30) : 0, sing, glow, dir: 1, rot: fly ? -0.15 + Math.sin(t * 3) * 0.1 : 0 } };
}

// ---------- Экран над сценой ----------
function screenMode(t) {
  const seq = [
    [E.L1, "logo", 0], [E.L1, "name:mart", E.L1], [E.L2, "name:osel", E.L2], [E.L3, "name:kozel", E.L3], [E.w_mish - 0.1, "name:mish", E.w_mish - 0.1],
    [E.w_kv1 - 0.1, "word:КВАРТЕТ", E.w_kv1 - 0.1], [E.L6, "onair", E.L6], [E.w_derut, "fail", E.w_derut], [E.w_stoy - 0.1, "word:СТОП!", E.w_stoy - 0.1],
    [E.L12 - 0.2, "plan:B", E.L12 - 0.2], [E.w_zapl - 0.1, "dance", E.w_zapl], [E.L16, "onair", E.L16], [E.w_neid1, "fail", E.w_neid1],
    [E.w_sekret - 0.1, "secret", E.w_sekret - 0.1], [E.L21, "row", E.L21], [E.E21, "onair", E.E21], [E.w_neid2, "fail", E.w_neid2],
    [E.w_razb, "bars", E.w_razb], [E.w_solov, "guest", E.w_solov], [E.L28, "ask", E.L28], [E.L32 - 0.2, "logo", E.L32 - 0.2], [E.w_godit, "verdict", E.w_godit], [E.fin, "logo", E.fin],
  ];
  let m = ["logo", 0]; for (const [at, md, t0] of seq) if (t >= at) m = [md, t0];
  const [md, t0] = m;
  let u = prog(t, t0, t0 + 1.0);
  if (md === "plan:B") u = prog(t, E.L12 - 0.2, E.E13);
  if (md === "row") u = prog(t, E.L21, E.E21);
  return [md, u];
}

// ---------- Камера ----------
// [время начала, функция цели (t) → [cx, cy, zoom]]
const at = (k, dx = 0, cy = 590, z = 1.55) => (t) => [heroAt(k, t).x + dx, cy, z];
const fixed = (cx, cy, z) => () => [cx, cy, z];
const SHOTS = [
  [0, fixed(960, 330, 1.45)], [E.V0 - 0.7, fixed(960, 540, 1.0)],
  [E.L1 - 0.05, at("mart", 200, 520, 1.4)], [E.L2 - 0.05, at("osel", 60, 520, 1.4)], [E.L3 - 0.05, at("kozel", -60, 520, 1.4)], [E.L4 - 0.05, at("mish", -60, 520, 1.4)],
  [E.L5 - 0.1, fixed(960, 560, 1.04)], [E.L6 - 0.1, fixed(960, 590, 1.14)], [E.L7 - 0.1, fixed(960, 540, 1.0)],
  [E.L9 - 0.1, fixed(960, 580, 1.08)],
  [E.L10 - 0.15, at("mart", 50, 470, 1.7)], [E.L12 - 0.3, fixed(960, 300, 1.6)], [E.L14 - 0.2, at("mart", 40, 480, 1.55)], [E.L15 - 0.1, fixed(960, 540, 1.0)],
  [E.L16 - 0.1, fixed(960, 560, 1.03)], [E.L17 - 0.1, fixed(960, 600, 1.12)],
  [E.L18 - 0.15, at("osel", -180, 470, 1.45)], [E.L21 - 0.15, fixed(960, 560, 1.0)], [E.L22 - 0.1, fixed(960, 600, 1.1)],
  [E.L23 - 0.1, fixed(1000, 600, 1.15)],
  [E.w_solov - 0.4, (t) => { const b = birdAt(t) || { x: 300, y: 200 }; return [b.x + 120, b.y + 160, 1.3]; }], [E.w_prilet + 0.3, fixed(1390, 480, 1.35)],
  [E.L27 + 0.2, fixed(1210, 560, 1.1)], [E.L28 + 0.6, fixed(1230, 540, 1.18)], [E.w_sest - 0.3, fixed(1150, 540, 1.02)],
  [E.L32 - 0.15, fixed(1475, 440, 2.0)], [E.w_ushi - 0.2, at("osel", 20, 440, 2.0)], [E.w_ponezh + 0.55, fixed(1450, 460, 1.7)],
  [E.L35 - 0.15, fixed(1110, 560, 1.0)], [E.w_godit - 0.2, fixed(960, 540, 1.0)], [E.fin, fixed(960, 520, 1.04)],
];
const BLEND = 0.5;
function camRaw(t) {
  let i = 0; for (let k = 0; k < SHOTS.length; k++) if (t >= SHOTS[k][0]) i = k;
  const cur = SHOTS[i][1](t);
  if (i === 0) return cur;
  const u = prog(t, SHOTS[i][0], SHOTS[i][0] + BLEND);
  if (u >= 1) return cur;
  const prev = SHOTS[i - 1][1](t), e = easeInOut(u);
  return [lerp(prev[0], cur[0], e), lerp(prev[1], cur[1], e), lerp(prev[2], cur[2], e)];
}
function cam(t) {
  let [cx, cy, z] = camRaw(t);
  // тряска на фальши и в драке
  const sh = FAILS.reduce((m, f) => Math.max(m, win(t, f - 0.05, f + 0.7, 0.05, 0.4)), 0) + win(t, FIGHT[0], FIGHT[1], 0.2, 0.3) * 0.6;
  cx += wob(t, 37) * 9 * sh; cy += wob(t, 31, 2) * 7 * sh;
  z = Math.max(1, z);
  cx = clamp(cx, W / (2 * z), W - W / (2 * z)); cy = clamp(cy, H / (2 * z), H - H / (2 * z));
  return { cx, cy, z };
}

// ---------- Ноты-листы ----------
function sheets(c, t, t0, x0, y0, x1, y1, n, seed) {
  if (t < t0) return; const r = mulberry32(seed);
  for (let i = 0; i < n; i++) {
    const d = r() * 0.4, u = prog(t, t0 + d, t0 + d + 1.1), sx = x0 + (r() - 0.5) * 300;
    if (u <= 0) continue;
    const x = lerp(sx, x1 + (i - n / 2) * 8, easeOut(u)) + Math.sin(u * 9 + i) * 30 * (1 - u), y = lerp(y0, y1 - i * 4, easeInOut(u));
    c.save(); c.translate(x, y); c.rotate(Math.sin(u * 7 + i) * 0.5 * (1 - u) - 0.1);
    page(c);
    c.restore();
  }
}
function page(c) {
  rrect(c, -34, -44, 68, 88, 4); ink(c, "#fffdf2", 4);
  c.strokeStyle = "rgba(26,18,51,0.6)"; c.lineWidth = 2; for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(-24, -28 + k * 18); c.lineTo(24, -28 + k * 18); c.stroke(); }
  c.fillStyle = C.ink; for (let k = 0; k < 4; k++) { ellipse(c, -16 + k * 12, -24 + ((k * 7) % 4) * 9, 4, 3, -0.4); c.fill(); }
}
function musicStand(c, x, t) {
  const tin = E.w_not - 0.2; if (t < tin) return;
  const fl = FIGHT[0] + 0.3, u = prog(t, fl, fl + 0.8);
  if (u >= 1) return;
  c.save(); c.translate(lerp(x, x - 500, u), FLOOR - Math.sin(u * Math.PI) * 400); c.rotate(-u * 6); const s = springPop(prog(t, tin, tin + 1)); c.scale(s, s);
  c.strokeStyle = C.ink; c.lineWidth = 10; c.lineCap = "round"; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -150); c.moveTo(-30, 0); c.lineTo(0, -40); c.lineTo(30, 0); c.stroke();
  c.strokeStyle = "#555a6e"; c.lineWidth = 5; c.stroke();
  c.save(); c.translate(0, -175); c.rotate(-0.2); rrect(c, -60, -36, 120, 72, 6); ink(c, "#555a6e", 5); c.restore();
  c.restore();
}

// ---------- Мир ----------
function drawWorld(c, t) {
  const { cx, cy, z } = cam(t);
  c.save(); c.translate(W / 2, H / 2); c.scale(z, z); c.translate(-cx, -cy);
  c.drawImage(bgC, 0, 0, W, H);
  const [md, u] = screenMode(t); drawScreen(c, t, md, u);
  const failF = FAILS.reduce((m, f, i) => Math.max(m, win(t, f, [E.E9, E.E17, E.E22][i] + 0.5, 0.05, 0.2)), 0);
  bulbs(c, t, t < E.V0 ? 10 : 5, failF);
  // липы
  const dance = win(t, E.w_zapl - 0.15, E.E15 + 0.5, 0.25, 0.4), rustle = win(t, E.w_lipki - 0.1, E.w_lipki + 1.2, 0.1, 0.5) + failF * 0.7;
  for (const tr of TREES) tree(c, tr.x, t + tr.side, dance, rustle);
  // ветка для Соловья
  c.save(); c.lineCap = "round"; c.strokeStyle = C.ink; c.lineWidth = 22; c.beginPath(); c.moveTo(1700, 420); c.quadraticCurveTo(1600, 440, BRANCH[0] - 40, BRANCH[1]); c.stroke();
  c.strokeStyle = "#6b4223"; c.lineWidth = 13; c.stroke(); c.restore();
  leaves(c, 205, t, E.w_lipki, 10, 3); leaves(c, 1715, t, E.w_lipki + 0.1, 10, 4); leaves(c, 960, t, E.w_zapl, 18, 8);
  birds(c, t, E.w_derut);
  // прожекторы
  const lights = t < E.V0 ? 1 : 0.75;
  const sweep = t < E.V0 ? Math.sin(t * 2.2) * 500 : 0;
  KINDS.forEach((k, i) => {
    const h = heroAt(k, t), col = ["255,120,190", "120,230,255", "255,236,140", "255,180,110"][i];
    spot(c, 360 + i * 400, (t < E.V0 ? 960 + sweep * (i % 2 ? 1 : -1) : h.x), FLOOR + 10, lights * (failF > 0.3 ? 0.5 + 0.5 * (Math.floor(t * 10) % 2) : 1), failF > 0.3 ? "255,90,90" : col);
  });
  const bd = birdAt(t); if (bd && t > E.L32 - 0.5) spot(c, 1700, BRANCH[0], BRANCH[1] + 10, sstep(prog(t, E.L32 - 0.5, E.L32)), "255,214,90", 70);
  // стулья позади героев, пюпитр, листы нот
  const hs = KINDS.map((k) => heroAt(k, t));
  const chs = hs.map((h) => [h, chairAt(h.kind, t, h)]);
  for (const [h, ch] of chs) if (ch && ch.behind) chair(c, ch.x, ch.y, ch.s, ch.dir, ch.rot, ch.q);
  musicStand(c, 968, t);
  if (t < FIGHT[0] + 0.3) sheets(c, t, E.w_not - 0.15, 968, -80, 968, FLOOR - 175, 5, 21);
  // герои по глубине: дальние — меньше x не нужно, рисуем слева направо, Мишку последним
  const order = hs.slice().sort((a, b) => (a.kind === "mish") - (b.kind === "mish") || a.x - b.x);
  for (const h of order) {
    if (h.hidden) continue;
    c.save();
    if (h.rot) { const hy = h.y - 160; c.translate(h.x, hy); c.rotate(h.rot); c.translate(-h.x, -hy); }
    if (h.slide) { c.save(); c.globalAlpha = 0.5; c.strokeStyle = "#fff"; c.lineWidth = 6; c.lineCap = "round"; for (let i = 0; i < 3; i++) { const d = Math.sign(h.o.dir); c.beginPath(); c.moveTo(h.x - d * (90 + i * 30), h.y - 70 - i * 40); c.lineTo(h.x - d * (190 + i * 30), h.y - 70 - i * 40); c.stroke(); } c.restore(); }
    hero(c, h.kind, h.x, h.y, h.s, h.o);
    c.restore();
    // ноты из инструментов
    if (h.o.inst) { const hp = headPos(h.kind, h.x, h.y, h.s, h.o.dir, h.o.sit); notes(c, t, hp.x + 40 * Math.sign(h.o.dir), hp.y + 60, Math.max(h.o.play * 0.9, h.o.screech), h.o.screech < 0.3, 31 + KINDS.indexOf(h.kind) * 7, Math.sign(h.o.dir)); }
  }
  // «и ноты есть у нас» — каждый поднимает лист с нотами
  const shk = win(t, E.w_noty - 0.1, E.w_instr + 0.3, 0.2, 0.3);
  if (shk > 0) for (const h of hs) {
    const hp = headPos(h.kind, h.x, h.y, h.s, h.o.dir, h.o.sit);
    c.save(); c.translate(hp.x + 20, hp.top - 40 - 16 * Math.abs(Math.sin(t * 6 + h.x))); c.rotate(Math.sin(t * 5 + h.x) * 0.18); const z = springPop(shk); c.scale(z * 1.1, z * 1.1); page(c); c.restore();
  }
  // драка
  fightCloud(c, t, 1000, 640, win(t, FIGHT[0], FIGHT[1], 0.15, 0.35));
  // после драки — звёздочки над головами
  for (const h of hs) { const hp = headPos(h.kind, h.x, h.y, h.s, h.o.dir, h.o.sit); dizzy(c, hp.x, hp.top + 10, t + h.x, win(t, FIGHT[1] - 0.1, E.L27 + 0.6, 0.15, 0.4)); }
  // лампочка над Ослом
  { const h = hs[1], hp = headPos("osel", h.x, h.y, h.s, h.o.dir, h.o.sit); bulbIdea(c, hp.x - 10 * Math.sign(h.o.dir), hp.top - 60, prog(t, E.w_sekret - 0.15, E.w_sekret + 0.6) * (1 - sstep(prog(t, E.E20 + 0.1, E.E20 + 0.4))), t); }
  // ярлыки участников
  for (const h of hs) {
    const hp = headPos(h.kind, h.x, h.y, h.s, h.o.dir, h.o.sit), [t0] = ENTER[h.kind];
    nameTag(c, hp.x, hp.top, NAMES[h.kind], null, win(t, t0 + 0.75, E.L6 - 0.15, 0.25, 0.25), HCOL[h.kind], t);
    nameTag(c, hp.x, hp.top, INST[h.kind] === "ПРИМА" || INST[h.kind] === "ВТОРА" ? "СКРИПКА" : INST[h.kind], null, win(t, INST_AT[h.kind] + 0.05, Math.min(INST_AT[h.kind] + 1.4, E.w_seli - 0.2), 0.2, 0.25), HCOL[h.kind], t);
  }
  // стулья перед героями (кружат), Соловей
  for (const [h, ch] of chs) if (ch && !ch.behind) chair(c, ch.x, ch.y, ch.s, ch.dir, ch.rot, ch.q);
  if (bd) {
    nightingale(c, bd.x, bd.y, 1.15, bd.o);
    // трель: ноты идут ровным потоком, без привязки к раскрытию клюва (иначе мигают)
    const trill = win(t, E.L32 - 0.2, E.E36 + 0.5, 0.3, 0.4) * (1 - 0.7 * win(t, E.E33 + 0.1, E.L35, 0.3, 0.3));
    if (trill > 0.01) notes(c, t, bd.x + 60, bd.y - 20, trill, true, 91, -1);
    nameTag(c, bd.x, bd.y - 70, "СОЛОВЕЙ", "ПРИГЛАШЁННЫЙ ЭКСПЕРТ", win(t, E.w_prilet + 0.3, E.L28 + 0.2, 0.25, 0.3), C.gold, t);
  }
  // конфетти
  confetti(c, t, 0.45, 960, SCR.y + SCR.h, 90, 1, 1.2);
  confetti(c, t, E.w_kv1, 960, SCR.y + SCR.h, 70, 2, 1.3);
  confetti(c, t, E.fin + 0.2, 960, SCR.y + SCR.h, 70, 3, 1.4);
  c.restore();
}

// ---------- Кадр ----------
function renderAt(t) {
  ctx.reset();
  // врезки «зал»: ждут музыку и затыкают уши
  const aud1 = t >= E.w_plen - 0.1 && t < E.E8 + 0.15, aud2 = t >= E.w_derut + 0.35 && t < E.w_tolku - 0.05;
  if (aud1 || aud2) audienceShot(ctx, t, aud1 ? sstep(prog(t, E.w_plen, E.w_plen + 0.6)) : 0, aud2 ? sstep(prog(t, E.w_derut + 0.35, E.w_derut + 0.55)) : 0);
  else drawWorld(ctx, t);
  if (aud2) birds(ctx, t, E.w_derut + 0.35);
  // телеграфика
  bug(ctx, t, sstep(prog(t, E.V0 - 0.2, E.V0 + 0.4)) * (1 - sstep(prog(t, E.fin - 0.3, E.fin))));
  const lvl = (() => {
    let v = sstep(prog(t, E.w_plen, E.E8)) * 0.85;
    v = t > FAILS[0] ? lerp(v, 0.04, sstep(prog(t, FAILS[0], FAILS[0] + 0.3))) : v;
    if (t > E.w_nach) v = lerp(0.04, 0.7, sstep(prog(t, E.w_nach, E.w_nach + 0.8)));
    if (t > FAILS[1]) v = lerp(0.7, 0.04, sstep(prog(t, FAILS[1], FAILS[1] + 0.3)));
    if (t > E.E21) v = lerp(0.04, 0.55, sstep(prog(t, E.E21, E.E21 + 0.8)));
    if (t > FAILS[2]) v = lerp(0.55, 0.0, sstep(prog(t, FAILS[2], FAILS[2] + 0.3)));
    return v * (0.94 + 0.06 * Math.sin(t * 17));
  })();
  const fl = FAILS.reduce((m, f, i) => Math.max(m, win(t, f, [E.E9, E.E17, E.E22][i] + 0.5, 0.05, 0.2)), 0);
  meter(ctx, t, Math.max(win(t, E.w_plen - 0.3, E.L10 + 1.0, 0.4, 0.4), win(t, E.L16 - 0.3, E.L23 + 0.2, 0.4, 0.4)), lvl, fl, XS.map((x) => (t > x + 1.0 ? prog(t, x + 1.0, x + 1.6) : 0)));
  XS.forEach((x) => bigX(ctx, t, prog(t, x - 0.05, x + 1.15)));
  verdictBoard(ctx, t, win(t, E.w_godit - 0.05, E.fin - 0.1, 0.25, 0.35), KINDS.map((k, i) => prog(t, E.w_godit + 0.3 + i * 0.22, E.w_godit + 0.9 + i * 0.22)), prog(t, E.w_godit + 1.15, E.w_godit + 1.8));
  // плашка под строками и ярлык говорящего
  const capK = sstep(prog(t, E.L1 - 0.6, E.L1 - 0.1)) * (1 - sstep(prog(t, E.fin - 0.3, E.fin + 0.05)));
  lowerBar(ctx, capK);
  const cur = curLine(t), spk = SPEAK[cur];
  const same = SPEAK[cur - 1] && SPEAK[cur - 1][0] === (spk && spk[0]);
  if (spk && capK > 0.5) speakerChip(ctx, spk[0], spk[1], (same ? 1 : prog(t, E["L" + cur] - 0.15, E["L" + cur] + 0.3)) * (1 - sstep(prog(t, E.fin - 0.4, E.fin - 0.1))) * (cur > 31 || t < E["E" + cur] + 0.9 ? 1 : 0), ROW[1] + 35);
  // заставка и финал — подложки под HTML-титры
  titlePlate(ctx, t, win(t, 0.35, E.V0 - 0.35, 0.5, 0.3), 600, 250);
  if (t > E.fin - 0.3) { ctx.save(); ctx.globalAlpha = 0.28 * sstep(prog(t, E.fin - 0.2, E.fin + 0.5)); ctx.fillStyle = C.night; ctx.fillRect(0, 0, W, H); ctx.restore(); titlePlate(ctx, t, prog(t, E.fin, E.fin + 0.8), 660, 300); }
  wipe(ctx, prog(t, E.fin - 0.55, E.fin + 0.25));
  textAt(t);
}
const SPEAK = {};
for (let n = 10; n <= 15; n++) SPEAK[n] = ["МАРТЫШКА", C.magenta];
for (let n = 18; n <= 20; n++) SPEAK[n] = ["ОСЁЛ", C.cyan];
for (let n = 28; n <= 31; n++) SPEAK[n] = ["ВСЕ ЧЕТВЕРО", C.yellow];
for (let n = 32; n <= 36; n++) SPEAK[n] = ["СОЛОВЕЙ", C.gold];
function curLine(t) { let n = 0; for (let k = 1; k <= 36; k++) if (t >= E["L" + k] - 0.12) n = k; return n; }

// ---------- Текст ----------
const CAPS = [...document.querySelectorAll(".cap")].map((el) => ({ el, n: +el.dataset.n, last: "" }));
const WORDS = [...document.querySelectorAll(".cap .w")].map((el) => ({ el, at: +el.dataset.at, last: -1 }));
const ROW = [826, 896];
const NL = 36;
function capState(n, t) {
  // строка появляется снизу, со следующей строкой поднимается, на третьей исчезает; на новом блоке и в финале — исчезает
  const B = CFG.blocks.find((b) => n >= b[0] && n <= b[1]);
  const Ln = (k) => E["L" + k];
  const next = n < B[1] ? Ln(n + 1) : null, next2 = n + 1 < B[1] ? Ln(n + 2) : null;
  const endBlock = B[1] < NL ? Ln(B[1] + 1) - 0.3 : E.fin - 0.35;
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
  const ti = win(t, 0.55, E.V0 - 0.35, 0.45, 0.25), tf = sstep(prog(t, E.fin + 0.25, E.fin + 0.8));
  setTitle("tt1", ti, 0.55, t); setTitle("tt2", tf, E.fin + 0.25, t);
}
const TT = {};
function setTitle(id, k, t0, t) {
  const el = TT[id] || (TT[id] = document.getElementById(id)); if (!el) return;
  const s = springSnap(prog(t, t0, t0 + 0.8));
  el.style.opacity = k <= 0 ? "0" : k.toFixed(3); el.style.transform = `translate(${((1 - s) * -260).toFixed(1)}px, 0px)`;
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
