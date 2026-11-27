// ---------- Таблички игры (экран): титр, «СТАРТ», волна, циферблат дня, счётчики, баннеры ----------
// деревянная табличка с выжженной надписью; (x, y) — центр
function plaque(g, x, y, w, h, k = 1, rot = 0, opt = {}) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(k, k);
  g.save(); g.shadowColor = "rgba(20,10,4,0.55)"; g.shadowBlur = 24; g.shadowOffsetY = 10;
  rrect(g, -w / 2, -h / 2, w, h, opt.r ?? 22); g.fillStyle = css(C.pineD); g.fill(); g.restore();
  rrect(g, -w / 2, -h / 2, w, h, opt.r ?? 22); g.fillStyle = pat(g, "pine", -w / 2, -h / 2, 0.9); g.fill();
  if (opt.paint) { rrect(g, -w / 2, -h / 2, w, h, opt.r ?? 22); paintPath(g, opt.paint, { a: 0.92, sc: 0.8 }); }
  // фаска и выжженная кромка
  rrect(g, -w / 2 + 8, -h / 2 + 8, w - 16, h - 16, (opt.r ?? 22) - 6); g.strokeStyle = css(opt.edge || C.burnt, 0.55); g.lineWidth = 4; g.stroke();
  const gr = g.createLinearGradient(0, -h / 2, 0, h / 2); gr.addColorStop(0, "rgba(255,255,255,0.22)"); gr.addColorStop(0.5, "rgba(255,255,255,0)"); gr.addColorStop(1, "rgba(30,15,5,0.25)");
  rrect(g, -w / 2, -h / 2, w, h, opt.r ?? 22); g.fillStyle = gr; g.fill();
  // гвоздики
  if (opt.nails !== false) for (const sx of [-1, 1]) { g.beginPath(); g.arc(sx * (w / 2 - 22), 0, 7, 0, TAU); g.fillStyle = css([90, 86, 80]); g.fill(); g.beginPath(); g.arc(sx * (w / 2 - 22) - 2, -2, 2.5, 0, TAU); g.fillStyle = "rgba(255,255,255,0.7)"; g.fill(); }
  g.restore();
}
// выжженный текст: тёмная сердцевина и подпалина вокруг; целые координаты в покое
function burnText(g, s, x, y, fs, col = C.burnt, align = "center", font = "ZTitle", glow = true) {
  g.font = `${fs}px "${font}"`; g.textAlign = align; g.textBaseline = "middle";
  x = Math.round(x); y = Math.round(y);
  if (glow) { g.save(); g.shadowColor = "rgba(120,60,20,0.55)"; g.shadowBlur = Math.max(2, fs * 0.06); g.fillStyle = css(col); g.fillText(s, x, y); g.restore(); }
  g.fillStyle = css(col); g.fillText(s, x, y);
}
// титр «Зима» с автором; u — появление (0…1 пружиной), out — уход вверх
function titleCard(g, t, cx, cy, sc, inT, authT, outT) {
  const u = spr(t, inT, 0.8), v = spr(t, authT, 0.7);
  const o = outT ? easeIn(inv(outT, outT + 0.45, t)) : 0;
  if (u <= 0) return;
  const y = cy - (1 - u) * 700 - o * 900;
  const rot = (1 - Math.min(1, u)) * -0.08;
  plaque(g, cx, y, 820 * sc, 300 * sc, 1, rot, { r: 34 * sc });
  g.save(); g.translate(cx, y); g.rotate(rot);
  burnText(g, "Зима", 0, -18 * sc, 210 * sc, C.burnt);
  g.restore();
  if (v > 0) {
    const ay = y + 205 * sc - (1 - Math.min(1, v)) * 120 - o * 200;
    plaque(g, cx, ay, 680 * sc, 92 * sc, 1, 0.02 * (1 - Math.min(1, v)), { paint: C.verm, edge: C.vermD, r: 18 * sc, nails: false });
    burnText(g, "Иван Суриков · 1880", cx, ay + 2 * sc, 52 * sc, C.white, "center", "ZTitle", false);
  }
}
// циферблат дня: полукруг-горизонт, солнце восходит (утро) и быстро садится (дни коротки)
function dayDial(g, t) {
  const on = win(t, EV.sunRise - 0.4, EV.E16 + 0.6, 0.35, 0.4);
  if (on <= 0) return;
  const big = win(t, EV.L13 - 0.3, EV.E16 + 0.3, 0.35, 0.4);
  const k = SPRING(inv(EV.sunRise - 0.4, EV.sunRise + 0.4, t)) * (1 + 0.35 * big) * (on < 1 ? on : 1);
  const x = 175 + 40 * big, y = 160 + 30 * big;
  g.save(); g.translate(x, y); g.scale(k, k);
  plaque(g, 0, 0, 300, 200, 1, 0, { r: 30, nails: false });
  // небо
  const sky = mix(mix([120, 170, 220], [250, 190, 120], win(t, EV.sunset - 0.8, EV.sunset + 0.2, 0.4, 0.4)), [40, 46, 96], easeIO(inv(EV.sunset, EV.sunset + 0.6, t)));
  g.beginPath(); g.arc(0, 40, 100, Math.PI, 0); g.closePath(); paintPath(g, sky, { sc: 0.4 });
  g.save(); g.beginPath(); g.arc(0, 40, 100, Math.PI, 0); g.closePath(); g.clip();
  // солнце: восход на «утро», в строфе 4 — короткая низкая дуга до заката
  let a;
  if (t < EV.L13) a = lerp(Math.PI * 1.02, Math.PI * 1.25, easeOut(inv(EV.sunRise - 0.2, EV.sunRise + 1.0, t)));
  else a = lerp(Math.PI * 1.25, Math.PI * 1.98, easeIO(inv(EV.dni - 0.2, EV.sunset, t)));
  const sr = 70, sx = Math.cos(a) * sr, sy = 40 + Math.sin(a) * sr * 0.75;
  g.beginPath(); g.arc(sx, sy, 22, 0, TAU); paintPath(g, C.gold, { grain: false }); g.beginPath(); g.arc(sx, sy, 22, 0, TAU); ballShade(g, sx, sy, 22, 0.6);
  g.strokeStyle = css(C.gold); g.lineWidth = 4; for (let i = 0; i < 8; i++) { const b = i * Math.PI / 4 + t; g.beginPath(); g.moveTo(sx + Math.cos(b) * 28, sy + Math.sin(b) * 28); g.lineTo(sx + Math.cos(b) * 38, sy + Math.sin(b) * 38); g.stroke(); }
  g.restore();
  g.fillStyle = css(C.snow); g.fillRect(-104, 38, 208, 12);
  burnText(g, t < EV.L13 ? "УТРО" : (t < EV.sunset ? "ДЕНЬ КОРОТОК" : "НОЧЬ"), 0, 74, 24, C.burnt);
  g.restore();
}
// табличка волны / хода (справа сверху)
function wavePlaque(g, t) {
  const S = [
    [EV.L1 - 0.2, "ВОЛНА 1", C.cobalt], [EV.winter, "ВОЛНА 2", C.cobalt], [EV.yourTurn, "ВАШ ХОД", C.green],
    [EV.attack, "АТАКА!", C.verm], [EV.win, "ПОБЕДА!", C.green],
  ];
  let k = -1; for (let i = 0; i < S.length; i++) if (t >= S[i][0]) k = i;
  if (k < 0 || t > EV.fin + 0.3) return;
  const [t0, s, col] = S[k];
  const u = SPRING(clamp((t - t0) / 0.8)), o = easeIn(inv(EV.fin, EV.fin + 0.3, t));
  const x = W - 210, y = 110 - o * 260;
  g.save(); g.translate(x, y); g.rotate(0.03 * Math.sin(Math.PI * Math.min(1, (t - t0) * 2.5)) * (1 - clamp(t - t0))); g.scale(lerp(1.4, 1, Math.min(1, u)) * (u < 1 ? u : 1), lerp(1.4, 1, Math.min(1, u)) * (u < 1 ? u : 1));
  plaque(g, 0, 0, 330, 110, 1, 0, { paint: col, edge: shade(col, -0.4), r: 22, nails: true });
  burnText(g, s, 0, 4, 54, C.white, "center", "ZTitle", false);
  g.restore();
}
// счётчик «ПОЛЕ: NN%» (строфа 2) и шкала «ТЕПЛО» (строфы 6–8)
function counters(g, t) {
  const on = win(t, EV.pole - 0.3, EV.L9 + 0.2, 0.3, 0.3);
  if (on > 0) {
    let done = 0; for (const tl of TILES) if (t >= tl.tf + FLIP / 2) done++;
    const pct = Math.round(100 * done / TILES.length);
    g.save(); g.translate(W / 2, 92 - (1 - on) * 200);
    plaque(g, 0, 0, 600, 104, 1, 0, { r: 22 });
    burnText(g, `ПОЛЕ В СНЕГУ: ${pct}%`, 0, 4, 44, C.cobaltD);
    g.restore();
  }
  const on2 = win(t, EV.straw0 - 0.6, EV.fin, 0.3, 0.4);
  if (on2 > 0) {
    const lvl = clamp(0.15 + 0.85 * ((t >= EV.straw0) + (t >= EV.straw1) + (t >= EV.straw2) + (t >= EV.straw3)) / 4);
    const prev = clamp(0.15 + 0.85 * ((t >= EV.straw0 - 0.0) + (t >= EV.straw1) + (t >= EV.straw2) + (t >= EV.straw3) - 1) / 4);
    let fill = lvl;
    for (let i = 0; i < 4; i++) { const th = EV["straw" + i]; if (t >= th && t < th + 0.5) fill = lerp(prev, lvl, SPRING((t - th) / 0.5)); }
    g.save(); g.translate(215, 100 - (1 - on2) * 220);
    plaque(g, 30, 0, 420, 104, 1, 0, { r: 22, nails: false });
    burnText(g, "ТЕПЛО", -98, 2, 34, C.vermD);
    rrect(g, -14, -16, 206, 32, 14); g.fillStyle = css([60, 36, 20, 1]); g.fill();
    rrect(g, -10, -12, 198 * clamp(fill, 0.05, 1), 24, 11); paintPath(g, mix(C.ochre, C.verm, fill), { grain: false });
    g.restore();
  }
}
// большие баннеры в центре
function banner(g, t, t0, t1, s, col, fs = 110) {
  const u = spr(t, t0, 0.6), o = easeIn(inv(t1 - 0.3, t1, t));
  if (u <= 0 || o >= 1) return;
  g.save(); g.translate(W / 2, (s === "ИЗБА УСТОЯЛА!" ? 150 : 330) - o * 700); g.rotate(-0.03); g.scale(lerp(2.2, 1, Math.min(1, u)), lerp(2.2, 1, Math.min(1, u)));
  g.globalAlpha = Math.min(1, u * 1.5);
  g.font = `${fs}px "ZTitle"`; const tw = g.measureText(s).width;
  plaque(g, 0, 0, tw + 140, fs * 1.55, 1, 0, { paint: col, edge: shade(col, -0.45), r: 30 });
  burnText(g, s, 0, fs * 0.05, fs, C.white, "center", "ZTitle", false);
  g.restore();
}
// кнопка «СТАРТ»
function startButton(g, t) {
  const u = spr(t, EV.startIn, 0.6), o = easeIn(inv(EV.V0 - 0.5, EV.V0 - 0.1, t));
  if (u <= 0 || o >= 1) return;
  const press = win(t, EV.startPress - 0.08, EV.startPress + 0.18, 0.06, 0.12);
  const x = W / 2, y = 790 + o * 500;
  g.save(); g.translate(x, y); g.scale(Math.min(1.1, u), Math.min(1.1, u));
  g.beginPath(); g.ellipse(0, 18, 190, 56, 0, 0, TAU); g.fillStyle = css(C.vermD); g.fill();
  g.beginPath(); g.ellipse(0, 18 - 26 * (1 - press), 190, 56, 0, 0, TAU); g.rect(-190, 18 - 26 * (1 - press), 380, 26 * (1 - press)); g.fillStyle = css(C.vermD); g.fill();
  g.beginPath(); g.ellipse(0, 18 - 26 * (1 - press), 190, 56, 0, 0, TAU); paintPath(g, C.verm, { ga: 0.18 });
  burnText(g, "СТАРТ", 0, 20 - 26 * (1 - press), 58, C.white, "center", "ZTitle", false);
  g.restore();
}
function drawHud(g, t) {
  // вступление: титр и «СТАРТ»
  if (t < EV.L1 + 1) { titleCard(g, t, W / 2, 330, 1, EV.titleDrop, EV.authorIn, EV.V0 - 0.55); startButton(g, t); }
  dayDial(g, t);
  counters(g, t);
  wavePlaque(g, t);
  banner(g, t, EV.winter - 0.05, EV.E16 + 0.9, "ЗИМА НАСТАЛА", C.cobalt);
  banner(g, t, EV.win, EV.fin + 0.2, "ИЗБА УСТОЯЛА!", C.green, 88);
  // финал: титр «Зима» крупно (кадр обложки)
  if (t > EV.fin - 0.2) titleCard(g, t, 560, 330, 0.98, EV.fin, EV.fin + 0.5, 0);
}
