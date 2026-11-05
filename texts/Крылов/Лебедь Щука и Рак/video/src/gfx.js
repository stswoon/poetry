// ---------- Графика спортивного канала (экранные координаты) ----------

// плашка «ПРЯМОЙ ЭФИР» / «ПОВТОР» в левом верхнем углу
function bug(c, t, k, replay) {
  if (k <= 0) return;
  c.save(); c.globalAlpha = k; c.translate(lerp(-300, 0, springSnap(k)), 0);
  const x = 150, y = 76;
  slant(c, x, y, 300, 56, 16); c.fillStyle = replay ? C.yellow : C.red; c.fill();
  slant(c, x + 300 - 16, y, 150, 56, 16); c.fillStyle = C.navy; c.fill();
  c.textBaseline = "middle"; c.textAlign = "left";
  if (replay) {
    c.save(); c.translate(x + 40, y + 28); c.rotate(-t * 4); c.strokeStyle = C.navy; c.lineWidth = 6;
    c.beginPath(); c.arc(0, 0, 13, 0.4, TAU - 0.2); c.stroke(); c.restore();
    c.fillStyle = C.navy; font(c, 36); c.fillText("ПОВТОР", x + 66, y + 30);
  } else {
    c.fillStyle = "#fff"; c.globalAlpha = k * (0.55 + 0.45 * Math.abs(Math.sin(t * 3))); c.beginPath(); c.arc(x + 38, y + 28, 10, 0, TAU); c.fill();
    c.globalAlpha = k; font(c, 34); c.fillText("ПРЯМОЙ ЭФИР", x + 58, y + 30);
  }
  c.fillStyle = C.yellow; font(c, 30); c.fillText("КУБОК", x + 312, y + 30);
  c.restore();
}

// табло: участники, шкалы тяги, дистанция, часы
function scoreboard(c, t, k, st) {
  if (k <= 0) return;
  const y0 = lerp(-150, 0, springSnap(k));
  c.save(); c.translate(0, y0);
  const x = 1110, y = 66, w = 660, h = 110;
  slant(c, x, y, w, h, 22); c.fillStyle = C.navy; c.fill();
  slant(c, x, y + h - 10, w - 4, 10, 2); c.fillStyle = C.yellow; c.fill();
  // участники
  const who = [["swan", C.swan], ["rak", C.rak], ["pike", C.pike]];
  who.forEach(([w2, col], i) => {
    const cx = x + 74 + i * 108, cy = y + 42;
    c.beginPath(); c.arc(cx, cy, 30, 0, TAU); c.fillStyle = col; c.fill(); c.lineWidth = 3; c.strokeStyle = "#fff"; c.stroke();
    c.save(); c.beginPath(); c.arc(cx, cy, 28, 0, TAU); c.clip();
    if (w2 === "swan") swan(c, cx - 6, cy + 20, 0.19, { flap: 0.2 }); else if (w2 === "rak") rak(c, cx - 18, cy + 6, 0.26, { claw: 0.5 }); else pike(c, cx - 36, cy + 3, 0.24, { tail: 0.4, mouth: 0.4 });
    c.restore();
    // шкала тяги
    const p = st.pull[i];
    c.fillStyle = "rgba(255,255,255,0.18)"; c.fillRect(cx - 36, cy + 38, 72, 9);
    c.fillStyle = p > 0.95 ? C.red : C.yellow; c.fillRect(cx - 36, cy + 38, 72 * p, 9);
  });
  // дистанция
  c.textAlign = "left"; c.textBaseline = "alphabetic";
  c.fillStyle = "rgba(255,255,255,0.75)"; font(c, 26); c.fillText("ДИСТАНЦИЯ", x + 370, y + 38);
  const blink = st.blink > 0 && Math.floor(t * 6) % 2 === 0;
  c.fillStyle = blink ? C.red : C.yellow; font(c, 60, F_NUM); c.fillText("0,0", x + 370, y + 96);
  c.fillStyle = "#fff"; font(c, 36); c.fillText("м", x + 462, y + 96);
  // часы матча
  const sec = Math.max(0, st.clock), mm = String(Math.floor(sec / 60)).padStart(2, "0"), ss = String(Math.floor(sec % 60)).padStart(2, "0");
  slant(c, x + w - 150, y - 34, 132, 36, 10); c.fillStyle = C.red; c.fill();
  c.fillStyle = "#fff"; font(c, 28, F_NUM); c.textAlign = "center"; c.fillText(`${mm}:${ss}`, x + w - 84, y - 6);
  // стартовые огни
  if (st.lights > 0) {
    c.save(); c.globalAlpha = st.lights;
    for (let i = 0; i < 3; i++) {
      const on = st.light[i], lx = x + 140 + i * 70, ly = y + h + 40;
      c.beginPath(); c.arc(lx, ly, 24, 0, TAU); c.fillStyle = C.navy; c.fill(); c.lineWidth = 4; c.strokeStyle = "#fff"; c.stroke();
      c.beginPath(); c.arc(lx, ly, 17, 0, TAU); c.fillStyle = on === 2 ? "#3bea5c" : on === 1 ? C.red : "#2b3550"; c.fill();
    }
    c.restore();
  }
  c.restore();
}

// карточка участника
const CARDS = [
  { who: "swan", name: "ЛЕБЕДЬ", col: C.swan, icon: iconCloud, x: 520, from: [0, -900], rot: -0.06 },
  { who: "rak", name: "РАК", col: C.rak, icon: iconBack, x: 960, from: [-1300, 0], rot: 0.04 },
  { who: "pike", name: "ЩУКА", col: C.pike, icon: iconWave, x: 1400, from: [1300, 200], rot: 0.07 },
];
function playerCard(c, t, i, kin, kout) {
  if (kin <= 0 || kout >= 1) return;
  const d = CARDS[i], s = springPop(kin), cw = 360, ch = 470, cy = 400;
  const fx = d.from[0] * (1 - s), fy = d.from[1] * (1 - s);
  const out = sstep(kout);
  c.save();
  c.translate(d.x + fx + (1110 + 74 + i * 108 - d.x) * out, cy + fy + (108 - cy) * out);
  c.rotate(d.rot * (1 - out) + (1 - s) * 0.4); c.scale(1 - out * 0.85, 1 - out * 0.85);
  c.globalAlpha = 1 - out * 0.7;
  slant(c, -cw / 2, -ch / 2, cw, ch, 26); c.fillStyle = C.navy; c.fill();
  c.save(); slant(c, -cw / 2 + 12, -ch / 2 + 12, cw - 24, ch - 110, 22); c.clip();
  const g = c.createLinearGradient(0, -ch / 2, 0, ch / 2 - 100); g.addColorStop(0, d.col); g.addColorStop(1, C.navy2); c.fillStyle = g; c.fill();
  c.fillStyle = "rgba(255,255,255,0.12)"; for (let k = 0; k < 4; k++) { slant(c, -260 + k * 140, -ch / 2, 50, ch, 120); c.fill(); }
  if (d.who === "swan") swan(c, -30, 70, 0.95, { flap: 0.45 + 0.1 * Math.sin(t * 5) });
  else if (d.who === "rak") rak(c, -10, 30, 0.95, { claw: 0.5 + 0.4 * Math.sin(t * 6), walk: t * 6 });
  else pike(c, -20, 10, 0.8, { tail: t * 7, mouth: 0.4 + 0.3 * Math.sin(t * 5) });
  c.restore();
  // значок стихии
  c.beginPath(); c.arc(cw / 2 - 52, -ch / 2 + 54, 36, 0, TAU); c.fillStyle = C.navy; c.fill(); c.lineWidth = 4; c.strokeStyle = C.yellow; c.stroke();
  d.icon(c, cw / 2 - 52, -ch / 2 + 54, 0.8, C.yellow);
  // имя
  slant(c, -cw / 2 + 4, ch / 2 - 92, cw - 8, 80, 22); c.fillStyle = C.yellow; c.fill();
  c.fillStyle = C.navy; font(c, 62); c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(d.name, 0, ch / 2 - 50);
  c.restore();
}

// плашка статистики: вес поклажи
function weightPanel(c, t, k, needle) {
  if (k <= 0) return;
  const s = springPop(k), x = 1340, y = 230, w = 420, h = 300;
  c.save(); c.globalAlpha = clamp(k * 3, 0, 1); c.translate(x + w / 2, y + h / 2); c.scale(s, s); c.translate(-w / 2, -h / 2);
  slant(c, 0, 0, w, h, 24); c.fillStyle = "rgba(11,26,58,0.94)"; c.fill();
  slant(c, 0, 0, w, 52, 8); c.fillStyle = C.yellow; c.fill();
  c.fillStyle = C.navy; font(c, 34); c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("ВЕС ПОКЛАЖИ", w / 2, 28);
  // циферблат весов
  const cx = w / 2 - 50, cy = 210, R = 92;
  c.beginPath(); c.arc(cx, cy, R, Math.PI, TAU); c.lineTo(cx + R, cy); c.closePath(); c.fillStyle = "#fff"; c.fill();
  c.strokeStyle = C.navy; c.lineWidth = 4;
  for (let i = 0; i <= 10; i++) { const a = Math.PI + i * Math.PI / 10; c.beginPath(); c.moveTo(cx + Math.cos(a) * (R - 6), cy + Math.sin(a) * (R - 6)); c.lineTo(cx + Math.cos(a) * (R - (i % 5 ? 18 : 30)), cy + Math.sin(a) * (R - (i % 5 ? 18 : 30))); c.stroke(); }
  c.beginPath(); c.arc(cx, cy, R * 0.7, Math.PI * 1.75, TAU); c.strokeStyle = C.red; c.lineWidth = 10; c.stroke();
  const a = Math.PI + needle * 0.35 * Math.PI + Math.sin(t * 9) * 0.02;
  c.strokeStyle = C.red; c.lineWidth = 6; c.lineCap = "round"; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a) * (R - 16), cy + Math.sin(a) * (R - 16)); c.stroke();
  c.beginPath(); c.arc(cx, cy, 9, 0, TAU); c.fillStyle = C.navy; c.fill();
  // пёрышко
  c.save(); c.translate(w - 90, 150 + Math.sin(t * 2.4) * 10); c.rotate(-0.6 + Math.sin(t * 2) * 0.15);
  c.beginPath(); c.moveTo(0, 60); c.quadraticCurveTo(-34, 0, 0, -64); c.quadraticCurveTo(34, 0, 0, 60); c.fillStyle = "#fff"; c.fill(); c.lineWidth = 3; c.strokeStyle = C.ink; c.stroke();
  c.beginPath(); c.moveTo(0, 74); c.lineTo(0, -56); c.stroke();
  c.restore();
  c.restore();
}

// рамка повтора: виньетка, полосы и угловые скобки
function replayFrame(c, t, k) {
  if (k <= 0) return;
  c.save(); c.globalAlpha = k;
  const g = c.createRadialGradient(960, 540, 500, 960, 540, 1150); g.addColorStop(0, "rgba(10,20,50,0)"); g.addColorStop(1, "rgba(10,20,50,0.55)");
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.fillStyle = "rgba(255,255,255,0.05)"; for (let y = (t * 60) % 6; y < H; y += 6) c.fillRect(0, y, W, 2);
  c.strokeStyle = C.yellow; c.lineWidth = 8;
  for (const [x, y, sx, sy] of [[60, 60, 1, 1], [1860, 60, -1, 1], [60, 1020, 1, -1], [1860, 1020, -1, -1]]) { c.beginPath(); c.moveTo(x, y + sy * 70); c.lineTo(x, y); c.lineTo(x + sx * 70, y); c.stroke(); }
  c.restore();
}

// видеопроверка: три стоп-кадра с вопросами
function varPanel(c, t, k, ks, kq, kout) {
  if (k <= 0 || kout >= 1) return;
  const s = springSnap(k), o = 1 - sstep(kout);
  c.save(); c.globalAlpha = o;
  c.fillStyle = `rgba(6,15,38,${0.72 * clamp(k * 2, 0, 1)})`; c.fillRect(0, 0, W, H);
  c.translate(960, 440); c.scale(lerp(0.6, 1, s) * lerp(1, 0.85, sstep(kout)), lerp(0.6, 1, s)); c.translate(-960, -440);
  slant(c, 300, 130, 1320, 80, 24); c.fillStyle = C.red; c.fill();
  c.fillStyle = "#fff"; font(c, 54); c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("ВИДЕОПРОВЕРКА", 960, 172);
  const who = ["swan", "rak", "pike"], cols = [C.swan, C.rak, C.pike];
  who.forEach((w2, i) => {
    const ki = springPop(ks[i]); if (ki <= 0) return;
    const fx = 380 + i * 400, fy = 250, fw = 360, fh = 380;
    c.save(); c.translate(fx + fw / 2, fy + fh / 2); c.scale(ki, ki); c.translate(-fw / 2, -fh / 2);
    c.fillStyle = C.navy; c.fillRect(-8, -8, fw + 16, fh + 16);
    c.save(); c.beginPath(); c.rect(0, 0, fw, fh); c.clip();
    const g = c.createLinearGradient(0, 0, 0, fh); g.addColorStop(0, cols[i]); g.addColorStop(1, C.navy2); c.fillStyle = g; c.fillRect(0, 0, fw, fh);
    if (w2 === "swan") swan(c, 170, 305, 0.78, { flap: 0.3 }); else if (w2 === "rak") rak(c, 175, 290, 0.8, { claw: 0.6 }); else pike(c, 165, 275, 0.68, { tail: 0.3, mouth: 0.5 });
    c.fillStyle = "rgba(0,0,0,0.25)"; c.fillRect(0, 0, fw, fh);
    c.restore();
    // вопрос
    const q = springPop(kq[i]);
    if (q > 0) { c.save(); c.translate(fw / 2, 82); c.scale(q * (1 + 0.05 * Math.sin(t * 6 + i)), q * (1 + 0.05 * Math.sin(t * 6 + i)));
      c.fillStyle = C.yellow; c.strokeStyle = C.navy; c.lineWidth = 12; font(c, 140, F_NUM); c.textAlign = "center"; c.textBaseline = "middle";
      c.strokeText("?", 0, 0); c.fillText("?", 0, 0); c.restore(); }
    c.restore();
  });
  c.restore();
}

// итоговое табло крупно
function finalBoard(c, t, k) {
  if (k <= 0) return;
  const s = springPop(k);
  c.save(); c.translate(960, 250); c.scale(s, s);
  slant(c, -330, -110, 660, 220, 40); c.fillStyle = C.navy; c.fill(); c.lineWidth = 6; c.strokeStyle = C.yellow; c.stroke();
  slant(c, -250, -150, 300, 56, 16); c.fillStyle = C.red; c.fill();
  c.fillStyle = "#fff"; font(c, 40); c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("ИТОГ", -100, -122);
  c.fillStyle = C.yellow; font(c, 150, F_NUM); c.fillText("0,0", -40, 20);
  c.fillStyle = "#fff"; font(c, 80); c.fillText("м", 170, 34);
  c.restore();
}

// шторка: косые цветные полосы проходят слева направо; u 0..1
function wipe(c, u) {
  if (u <= 0 || u >= 1) return;
  const cols = [C.yellow, C.red, C.navy3, C.navy];
  cols.forEach((col, i) => {
    const d = i * 0.08, uu = clamp((u - d) / (1 - 0.24), 0, 1), x = lerp(-1700, 2100, easeInOut(uu));
    slant(c, x - 300 * 0, 0, 1500, H, 420); c.fillStyle = col; c.fill();
  });
}
const easeInOut = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

// нижняя треть: подложка для строк
function lowerBar(c, k) {
  if (k <= 0) return;
  const s = easeOut(k);
  c.save();
  c.translate(lerp(-1500, 0, s), 0);
  slant(c, 210, 812, 1500, 160, 30); c.fillStyle = "rgba(11,26,58,0.93)"; c.fill();
  slant(c, 210, 812, 44, 160, 30); c.fillStyle = C.yellow; c.fill();
  slant(c, 254, 966, 1440, 6, 2); c.fillStyle = C.red; c.fill();
  c.restore();
}

// телестратор: жёлтая стрелка с обводкой (мировые координаты)
function teleArrow(c, x0, y0, x1, y1, u) {
  if (u <= 0) return;
  arrow(c, x0, y0, x1, y1, u, C.navy, 26, 70);
  arrow(c, x0, y0, x1, y1, u, C.yellow, 16, 58);
}
function teleCircle(c, x, y, rx, ry, u) {
  if (u <= 0) return;
  c.save(); c.lineCap = "round";
  for (const [col, lw] of [[C.navy, 22], [C.yellow, 12]]) { c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); c.ellipse(x, y, rx, ry, -0.05, -Math.PI / 2, -Math.PI / 2 + TAU * u); c.stroke(); }
  c.restore();
}

// всплеск воды
function splash(c, x, y, u) {
  if (u <= 0 || u >= 1) return;
  c.save(); c.globalAlpha = 1 - u;
  c.fillStyle = "#bfe6ff"; c.strokeStyle = C.ink; c.lineWidth = 3;
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + (i - 4) * 0.28, d = easeOut(u) * (120 + (i % 3) * 30), g = u * u * 160;
    const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d + g;
    c.beginPath(); c.arc(px, py, 14 * (1 - u * 0.6), 0, TAU); c.fill(); c.stroke();
  }
  c.strokeStyle = "rgba(255,255,255,0.9)"; c.lineWidth = 6;
  c.beginPath(); c.ellipse(x, y + 10, 60 + u * 140, 14 + u * 30, 0, 0, TAU); c.stroke();
  c.restore();
}
// пыль из-под колёс
function dust(c, x, y, t, k) {
  if (k <= 0) return;
  c.save();
  for (let i = 0; i < 6; i++) {
    const ph = (t * 1.3 + i / 6) % 1, px = x + (i - 2.5) * 22 + ph * (i % 2 ? 30 : -30), py = y - ph * 40;
    c.globalAlpha = k * (1 - ph) * 0.7; c.fillStyle = "#e9d2a8"; c.beginPath(); c.arc(px, py, 14 + ph * 22, 0, TAU); c.fill();
  }
  c.restore();
}
// линии скорости
function speedLines(c, x, y, a, k, t) {
  if (k <= 0) return;
  c.save(); c.translate(x, y); c.rotate(a); c.strokeStyle = "rgba(255,255,255,0.85)"; c.lineCap = "round"; c.globalAlpha = k;
  for (let i = 0; i < 7; i++) { const off = ((t * 900 + i * 137) % 420), yy = (i - 3) * 34; c.lineWidth = 6 - (i % 3); c.beginPath(); c.moveTo(-60 - off, yy); c.lineTo(-160 - off, yy); c.stroke(); }
  c.restore();
}
