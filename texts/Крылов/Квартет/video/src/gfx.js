// ---------- Телеграфика: экран над сценой, ярлыки героев, шкала аплодисментов, «✕», вердикт ----------
const NAMES = { mart: "МАРТЫШКА", osel: "ОСЁЛ", kozel: "КОЗЁЛ", mish: "МИШКА" };
const INST = { mart: "ПРИМА", osel: "ВТОРА", kozel: "АЛЬТ", mish: "БАС" };
const HCOL = { mart: C.magenta, osel: C.cyan, kozel: C.yellow, mish: "#ff8a1e" };

function txt(c, s, x, y, px, col, fam = F_NARROW, align = "center", style = "") {
  font(c, px, fam, style); c.textAlign = align; c.textBaseline = "middle"; c.fillStyle = col; c.fillText(s, x, y);
}
// ---------- LED-экран ----------
function screenBase(c, t, glitch = 0) {
  const g = c.createLinearGradient(0, SCR.y, 0, SCR.y + SCR.h); g.addColorStop(0, "#1d0f4f"); g.addColorStop(1, "#3b1170");
  c.fillStyle = g; c.fillRect(SCR.x, SCR.y, SCR.w, SCR.h);
  // лучи
  c.save(); c.globalAlpha = 0.18; c.translate(SCR.x + SCR.w / 2, SCR.y + SCR.h / 2); c.rotate(t * 0.4);
  for (let i = 0; i < 12; i++) { c.rotate(TAU / 12); c.beginPath(); c.moveTo(0, 0); c.lineTo(900, -70); c.lineTo(900, 70); c.closePath(); c.fillStyle = i % 2 ? C.magenta : C.cyan; c.fill(); }
  c.restore();
  if (glitch > 0) { const r = mulberry32(Math.floor(t * 20)); for (let i = 0; i < 8; i++) { c.fillStyle = `rgba(${r() < 0.5 ? "255,46,136" : "34,211,238"},${0.5 * glitch})`; c.fillRect(SCR.x, SCR.y + r() * SCR.h, SCR.w, 4 + r() * 20); } }
}
function screenPixels(c) { c.fillStyle = "rgba(0,0,0,0.18)"; for (let y = SCR.y; y < SCR.y + SCR.h; y += 6) c.fillRect(SCR.x, y, SCR.w, 2); }
function logo(c, x, y, s, t) {
  c.save(); c.translate(x, y); c.scale(s, s);
  star(c, -300, -18, 30, 13, C.yellow); star(c, 300, -18, 30, 13, C.yellow);
  font(c, 92, F_NUM); c.textAlign = "center"; c.textBaseline = "middle";
  c.lineWidth = 14; c.strokeStyle = C.ink; c.lineJoin = "round"; c.strokeText("ЛЕСНЫЕ", 0, -46); c.fillStyle = C.yellow; c.fillText("ЛЕСНЫЕ", 0, -46);
  c.strokeText("ТАЛАНТЫ", 0, 46); c.fillStyle = C.magenta; c.fillText("ТАЛАНТЫ", 0, 46);
  c.restore();
}
// mode: logo | name:<kind> | word:<текст> | onair | fail | plan:<A|B> | dance | secret | row | bars | guest | ask | verdict
function drawScreen(c, t, mode, u) {
  c.save(); rrect(c, SCR.x, SCR.y, SCR.w, SCR.h, 6); c.clip();
  const [m, arg] = mode.split(":"), cx = SCR.x + SCR.w / 2, cy = SCR.y + SCR.h / 2, pop = springPop(u * 1.6);
  if (m === "bars") {
    const cols = ["#ffffff", "#ffe600", "#00e5ff", "#00d84a", "#ff2ad4", "#ff1a1a", "#1a3cff"];
    cols.forEach((col, i) => { c.fillStyle = col; c.fillRect(SCR.x + i * SCR.w / 7, SCR.y, SCR.w / 7 + 1, SCR.h * 0.72); });
    c.fillStyle = "#111"; c.fillRect(SCR.x, SCR.y + SCR.h * 0.72, SCR.w, SCR.h * 0.28);
    const r = mulberry32(Math.floor(t * 24)); for (let i = 0; i < 6; i++) { c.fillStyle = "rgba(0,0,0,0.5)"; c.fillRect(SCR.x, SCR.y + r() * SCR.h, SCR.w, 3 + r() * 10); }
    txt(c, "ТЕХНИЧЕСКИЕ НЕПОЛАДКИ", cx, SCR.y + SCR.h * 0.86, 46, "#fff");
  } else {
    screenBase(c, t, m === "fail" ? 1 : 0);
    if (m === "logo") logo(c, cx, cy, 0.9 + 0.1 * pop, t);
    else if (m === "name") { const k = arg; c.save(); c.translate(cx, cy); c.scale(pop, pop); txt(c, NAMES[k], 0, -10, 128, HCOL[k], F_NUM); c.restore(); }
    else if (m === "word") { c.save(); c.translate(cx, cy); c.rotate(-0.05); c.scale(pop, pop); font(c, 170, F_NUM); c.textAlign = "center"; c.textBaseline = "middle"; c.lineWidth = 18; c.strokeStyle = C.ink; c.strokeText(arg, 0, 0); c.fillStyle = C.yellow; c.fillText(arg, 0, 0); c.restore(); }
    else if (m === "onair") {
      for (let i = 0; i < 24; i++) { const h = (0.3 + 0.7 * Math.abs(Math.sin(t * 6 + i * 0.7) * Math.sin(t * 2.3 + i))) * 210; c.fillStyle = i % 3 === 0 ? C.magenta : i % 3 === 1 ? C.cyan : C.yellow; c.fillRect(SCR.x + 40 + i * 30, SCR.y + SCR.h - 30 - h, 20, h); }
      rrect(c, cx - 170, SCR.y + 30, 340, 74, 37); ink(c, C.red, 5); txt(c, "● В ЭФИРЕ", cx, SCR.y + 68, 52, "#fff");
    } else if (m === "fail") { // экран «плачет»: грустный смайлик в помехах
      c.save(); c.translate(cx + Math.sin(t * 40) * 6, cy); c.scale(pop, pop);
      circle(c, 0, 0, 130); ink(c, C.red, 10);
      c.fillStyle = C.ink; ellipse(c, -45, -30, 16, 24); c.fill(); ellipse(c, 45, -30, 16, 24); c.fill();
      c.lineCap = "round"; c.strokeStyle = C.ink; c.lineWidth = 14; c.beginPath(); c.arc(0, 75, 55, Math.PI + 0.5, -0.5); c.stroke();
      c.fillStyle = C.cyan; ellipse(c, -50, 20 + ((t * 120) % 60), 9, 14); c.fill();
      c.restore();
    } else if (m === "plan") planDiagram(c, t, u, arg);
    else if (m === "dance") {
      for (let i = 0; i < 5; i++) { const x = SCR.x + 90 + i * 155, b = Math.abs(Math.sin(t * 7.5 + i)) * 40, sk = Math.sin(t * 7.5 + i) * 0.3;
        c.save(); c.translate(x, SCR.y + SCR.h - 20 - b); c.transform(1, 0, sk, 1, 0, 0);
        c.beginPath(); c.moveTo(-90, 0); c.lineTo(0, -230); c.lineTo(90, 0); c.closePath(); ink(c, i % 2 ? "#7b6cd6" : "#5b4bb8", 5);
        c.beginPath(); c.moveTo(-34, -142); c.lineTo(0, -230); c.lineTo(34, -142); c.quadraticCurveTo(0, -126, -34, -142); ink(c, "#ffffff", 0);
        c.fillStyle = C.ink; circle(c, -18, -80, 7); c.fill(); circle(c, 18, -80, 7); c.fill(); c.lineWidth = 5; c.strokeStyle = C.ink; c.beginPath(); c.arc(0, -60, 18, 0.2, Math.PI - 0.2); c.stroke();
        c.restore(); }
      for (let i = 0; i < 4; i++) { const x = SCR.x + 160 + i * 160, b = Math.abs(Math.sin(t * 7.5 + i + 2)) * 30; circle(c, x, SCR.y + SCR.h - 70 - b, 44); ink(c, C.leaf2, 4); c.fillStyle = "#6b4223"; c.fillRect(x - 7, SCR.y + SCR.h - 30 - b, 14, 30); }
    } else if (m === "secret") { bulbIdea(c, cx - 230, cy + 20, u * 2, t); c.save(); c.translate(cx + 90, cy); c.rotate(-0.06); c.scale(pop, pop); font(c, 140, F_NUM); c.textAlign = "center"; c.textBaseline = "middle"; c.lineWidth = 16; c.strokeStyle = C.ink; c.strokeText("СЕКРЕТ!", 0, 0); c.fillStyle = C.yellow; c.fillText("СЕКРЕТ!", 0, 0); c.restore(); }
    else if (m === "row") planDiagram(c, t, u, "C");
    else if (m === "guest") {
      c.save(); c.globalCompositeOperation = "lighter"; const g = c.createRadialGradient(cx, cy, 20, cx, cy, 420); g.addColorStop(0, "rgba(255,207,74,0.8)"); g.addColorStop(1, "rgba(255,207,74,0)"); c.fillStyle = g; c.fillRect(SCR.x, SCR.y, SCR.w, SCR.h); c.restore();
      nightingale(c, cx - 230, cy + 30, 2.0 * pop, { t, sing: 0.5 + 0.5 * Math.sin(t * 9) });
      txt(c, "ГОСТЬ ВЫПУСКА", cx + 140, cy - 50, 56, "#fff"); txt(c, "СОЛОВЕЙ", cx + 140, cy + 40, 120, C.gold, F_NUM);
    } else if (m === "ask") { for (let i = 0; i < 5; i++) { const x = SCR.x + 100 + i * 150, y = cy + Math.sin(t * 5 + i) * 30; c.save(); c.translate(x, y); c.rotate(Math.sin(t * 3 + i) * 0.3); txt(c, "?", 0, 0, 200, i % 2 ? C.yellow : C.magenta, F_NUM); c.restore(); } }
    else if (m === "verdict") { c.save(); c.translate(cx, cy); c.rotate(-0.04); c.scale(pop, pop); font(c, 150, F_NUM); c.textAlign = "center"; c.textBaseline = "middle"; c.lineWidth = 18; c.strokeStyle = C.ink; c.strokeText("НЕ ПРОШЛИ", 0, 0); c.fillStyle = C.red; c.fillText("НЕ ПРОШЛИ", 0, 0); c.restore(); }
  }
  screenPixels(c);
  c.restore();
}
// схема рассадки сверху: A — как сели, B — по Мартышке (бас против альта, прима против вторы), C — в ряд
const PLAN = {
  A: { mart: [-260, 30, 0], osel: [-90, -50, Math.PI], kozel: [90, 40, 2.2], mish: [260, -40, -0.6] },
  B: { mish: [-250, 0, 0], kozel: [-90, 0, Math.PI], mart: [90, 0, 0], osel: [250, 0, Math.PI] },
  C: { mart: [-255, 20, -Math.PI / 2], osel: [-85, 20, -Math.PI / 2], kozel: [85, 20, -Math.PI / 2], mish: [255, 20, -Math.PI / 2] },
};
function planDiagram(c, t, u, which) {
  const cx = SCR.x + SCR.w / 2, cy = SCR.y + SCR.h / 2 + 10, to = PLAN[which], from = which === "B" ? PLAN.A : PLAN.B;
  c.fillStyle = "rgba(255,255,255,0.08)"; rrect(c, SCR.x + 30, SCR.y + 24, SCR.w - 60, SCR.h - 48, 20); c.fill();
  txt(c, which === "C" ? "РЯДОМ!" : "СХЕМА РАССАДКИ", cx, SCR.y + 56, 40, "#fff");
  const mv = easeInOut(prog(u, 0.25, 0.75));
  for (const k of ["mart", "osel", "kozel", "mish"]) {
    const a = from[k], b = to[k], x = cx + lerp(a[0], b[0], mv), y = cy + lerp(a[1], b[1], mv) + 20, ang = lerp(a[2], b[2], mv);
    if (mv < 1) { c.save(); c.setLineDash([12, 10]); c.strokeStyle = "rgba(255,255,255,0.5)"; c.lineWidth = 4; c.beginPath(); c.moveTo(cx + a[0], cy + a[1] + 20); c.lineTo(cx + b[0], cy + b[1] + 20); c.stroke(); c.restore(); }
    // стул сверху и взгляд героя
    c.save(); c.translate(x, y); c.rotate(ang);
    rrect(c, -34, -34, 68, 68, 10); ink(c, C.wood, 4); c.fillStyle = C.woodD; c.fillRect(-34, -34, 14, 68);
    c.beginPath(); c.moveTo(40, -16); c.lineTo(66, 0); c.lineTo(40, 16); c.closePath(); ink(c, HCOL[k], 3);
    c.restore();
    c.save(); c.translate(x, y); circle(c, 0, 0, 28); ink(c, HCOL[k], 4); txt(c, NAMES[k][0], 0, 2, 40, C.ink, F_NUM); c.restore();
    txt(c, INST[k], x, y + 66, 30, "#fff");
  }
  // стрелки «против»
  if (which === "B") {
    const ar = prog(u, 0.55, 0.9);
    for (const [x0, x1] of [[-210, -130], [130, 210]]) { if (ar <= 0) break; c.save(); c.globalAlpha = ar; c.strokeStyle = C.yellow; c.lineWidth = 8; c.lineCap = "round"; c.beginPath(); c.moveTo(cx + x0 + 10, cy + 20); c.lineTo(cx + x1 - 10, cy + 20); c.stroke();
      for (const [px, d] of [[x0 + 10, -1], [x1 - 10, 1]]) { c.beginPath(); c.moveTo(cx + px, cy + 20); c.lineTo(cx + px - d * 16, cy + 8); c.lineTo(cx + px - d * 16, cy + 32); c.closePath(); c.fillStyle = C.yellow; c.fill(); } c.restore(); }
  }
}

// ---------- Ярлык над героем (в мире) ----------
function nameTag(c, x, y, title, sub, k, col, t) {
  if (k <= 0.01) return; const s = springPop(k * 1.4);
  font(c, 46, F_NUM); const w1 = c.measureText(title).width; font(c, 30); const w2 = sub ? c.measureText(sub).width : 0;
  const w = Math.max(w1, w2) + 60, h = sub ? 104 : 70;
  c.save(); c.translate(x, y - h / 2 - 20 + Math.sin(t * 3) * 4); c.scale(s, s);
  c.beginPath(); c.moveTo(-16, h / 2 - 2); c.lineTo(0, h / 2 + 22); c.lineTo(16, h / 2 - 2); c.closePath(); ink(c, col, 4);
  slant(c, -w / 2, -h / 2, w, h, 16); ink(c, col, 5);
  if (sub) { txt(c, title, 0, -16, 46, C.ink, F_NUM); txt(c, sub, 0, 28, 30, C.ink); } else txt(c, title, 0, 2, 46, C.ink, F_NUM);
  c.restore();
}

// ---------- Экранная графика поверх кадра ----------
function bug(c, t, k) {
  if (k <= 0.01) return;
  c.save(); c.globalAlpha = k; c.translate(lerp(-300, 0, springSnap(k)), 0);
  rrect(c, 70, 52, 316, 92, 18); ink(c, "rgba(18,10,53,0.92)", 4, C.magenta);
  logo(c, 228, 98, 0.36, t);
  rrect(c, 70, 154, 214, 40, 20); c.fillStyle = C.red; c.fill();
  c.fillStyle = Math.floor(t * 2) % 2 ? "#fff" : "#ffb3b3"; circle(c, 96, 174, 8); c.fill(); txt(c, "ПРЯМОЙ ЭФИР", 114, 175, 27, "#fff", F_NARROW, "left");
  c.restore();
}
// шкала аплодисментов: level 0..1, flash 0..1 — провал
function meter(c, t, k, level, flash, strikes) {
  if (k <= 0.01) return; const x = 1430, y = 56, w = 420, n = 14;
  c.save(); c.globalAlpha = k; c.translate(lerp(380, 0, springSnap(k)), 0);
  rrect(c, x, y, w, 118, 16); ink(c, "rgba(18,10,53,0.92)", 4, flash > 0.5 ? C.red : C.cyan);
  txt(c, "АПЛОДИСМЕНТЫ", x + 24, y + 28, 30, "#fff", F_NARROW, "left");
  for (let i = 0; i < n; i++) {
    const on = i / n < level, col = i < 6 ? C.green : i < 11 ? C.yellow : C.red;
    c.fillStyle = on ? col : "rgba(255,255,255,0.12)"; rrect(c, x + 24 + i * 27.5, y + 52, 21, 46, 4); c.fill();
  }
  // слоты для «✕»
  for (let i = 0; i < 3; i++) {
    const sx = x + w - 34 - (2 - i) * 40, sy = y + 28, on = strikes[i] ?? 0;
    c.strokeStyle = "rgba(255,255,255,0.25)"; c.lineWidth = 3; rrect(c, sx - 15, sy - 15, 30, 30, 6); c.stroke();
    if (on > 0) { c.save(); c.translate(sx, sy); const s = springPop(on); c.scale(s, s); c.strokeStyle = C.red; c.lineWidth = 7; c.lineCap = "round"; c.beginPath(); c.moveTo(-10, -10); c.lineTo(10, 10); c.moveTo(10, -10); c.lineTo(-10, 10); c.stroke(); c.restore(); }
  }
  c.restore();
}
// большой «✕» жюри по центру: u 0..1 (время жизни)
function bigX(c, t, u) {
  if (u <= 0 || u >= 1) return;
  const s = lerp(2.6, 1, springSnap(u * 2.2)), out = sstep(prog(u, 0.7, 1));
  c.save(); c.translate(lerp(960, 1730, out), lerp(470, 84, out)); c.rotate(-0.1); c.scale(s * (1 - out * 0.85), s * (1 - out * 0.85));
  c.globalAlpha = 1 - out * 0.3; c.lineCap = "round";
  for (const [col, lw] of [[C.ink, 92], [C.red, 64]]) { c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); c.moveTo(-150, -150); c.lineTo(150, 150); c.moveTo(150, -150); c.lineTo(-150, 150); c.stroke(); }
  c.restore();
}
// «СТОП!» — пауза в эфире
function pausePlate(c, t, k) {
  if (k <= 0.01) return; const s = springPop(k * 1.6);
  c.save(); c.translate(1600, 300); c.rotate(0.06); c.scale(s, s);
  rrect(c, -150, -80, 300, 160, 24); ink(c, "rgba(18,10,53,0.92)", 5, C.yellow);
  c.fillStyle = C.yellow; c.fillRect(-110, -46, 30, 92); c.fillRect(-62, -46, 30, 92);
  txt(c, "СТОП!", 60, 4, 70, C.yellow, F_NUM);
  c.restore();
}
function topPlate(c, t, k, text, col) {
  if (k <= 0.01) return; const s = springSnap(k);
  c.save(); c.translate(0, lerp(-200, 0, s)); font(c, 54, F_NUM); const w = c.measureText(text).width + 90;
  slant(c, 960 - w / 2, 220, w, 86, 24); ink(c, col, 5);
  txt(c, text, 960, 265, 54, "#fff", F_NUM);
  c.restore();
}
// вердикт эксперта: k — показ, xs[4] — когда штампуются «✕»
function verdictBoard(c, t, k, xs, stamp = 0) {
  if (k <= 0.01) return; const s = springPop(k * 1.3);
  c.save(); c.translate(960, 400); c.scale(s, s);
  rrect(c, -620, -250, 1240, 470, 36); ink(c, "rgba(18,10,53,0.95)", 7, C.gold);
  txt(c, "ВЕРДИКТ ЭКСПЕРТА", 0, -196, 52, C.gold, F_NUM);
  ["mart", "osel", "kozel", "mish"].forEach((kind, i) => {
    const x = -435 + i * 290, y = -20;
    circle(c, x, y, 108); ink(c, "#2b1c66", 5, HCOL[kind]);
    c.save(); circle(c, x, y, 104); c.clip(); c.translate(x - 10, y + 20); c.scale(1.25, 1.25); HEADS[kind](c, { t, sad: 1, ear: 0.6 }); c.restore();
    txt(c, NAMES[kind], x, y + 140, 40, "#fff", F_NUM);
    const u = xs[i]; if (u > 0) { c.save(); c.translate(x, y); const z = lerp(2.2, 1, springSnap(u)); c.scale(z, z); c.lineCap = "round"; for (const [col, lw] of [[C.ink, 34], [C.red, 22]]) { c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); c.moveTo(-70, -70); c.lineTo(70, 70); c.moveTo(70, -70); c.lineTo(-70, 70); c.stroke(); } c.restore(); }
  });
  if (stamp > 0) { // штамп поверх доски
    c.save(); c.translate(0, 40); c.rotate(-0.12); const z = lerp(2.4, 1, springSnap(stamp)); c.scale(z, z); c.globalAlpha = clamp(stamp * 4, 0, 1);
    rrect(c, -330, -70, 660, 140, 22); c.fillStyle = "rgba(255,255,255,0.92)"; c.fill(); c.lineWidth = 12; c.strokeStyle = C.red; c.stroke();
    txt(c, "НЕ ПРОШЛИ", 0, 6, 112, C.red, F_NUM);
    c.restore();
  }
  c.restore();
}
// плашка под строками
function lowerBar(c, k) {
  if (k <= 0.01) return;
  c.save(); c.globalAlpha = k;
  const g = c.createLinearGradient(0, 790, 0, H); g.addColorStop(0, "rgba(12,6,36,0)"); g.addColorStop(0.18, "rgba(12,6,36,0.86)"); g.addColorStop(1, "rgba(12,6,36,0.92)");
  c.fillStyle = g; c.fillRect(0, 790, W, H - 790);
  c.fillStyle = C.magenta; c.fillRect(0, 806, W * k, 5);
  c.restore();
}
// ярлык говорящего слева от строки
function speakerChip(c, name, col, k, y) {
  if (k <= 0.01) return; const s = springSnap(k);
  c.save(); c.globalAlpha = clamp(k * 2, 0, 1); c.translate(lerp(-260, 0, s), 0);
  font(c, 30, F_NUM); const w = c.measureText(name).width + 40;
  slant(c, 268 - w, y - 22, w, 44, 12); ink(c, col, 0); txt(c, name, 268 - w / 2 - 4, y + 1, 30, C.ink, F_NUM);
  c.restore();
}
// шторка-переход: полосы шоу
function wipe(c, u) {
  if (u <= 0 || u >= 1) return;
  [C.magenta, C.yellow, C.cyan].forEach((col, i) => { const x = lerp(-1700, 2300, easeInOut(clamp(u * 1.25 - i * 0.12, 0, 1))); slant(c, x, 0, 820, H, 360); c.fillStyle = col; c.fill(); });
}
// подложка под HTML-титр
function titlePlate(c, t, k, y, h) {
  if (k <= 0.01) return; const s = springSnap(k);
  c.save(); c.translate(lerp(-1700, 0, s), 0);
  slant(c, 300, y, 1320, h, 56); c.fillStyle = "rgba(18,10,53,0.94)"; c.fill(); c.lineWidth = 6; c.strokeStyle = C.magenta; c.stroke();
  slant(c, 300, y + h - 12, 1300, 12, 4); c.fillStyle = C.yellow; c.fill();
  c.restore();
}
