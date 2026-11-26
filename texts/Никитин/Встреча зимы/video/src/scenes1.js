// ---------- Общие декорации и страницы A (строфы 1–2), B (строфы 3–4) ----------
// Каждая сцена рисует свою панель в локальных координатах 0…w × 0…h, время t — общее время ролика.

function sky(g, w, h, top, bot, dcol, dr = 2.6) {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, css(top)); gr.addColorStop(1, css(bot));
  g.fillStyle = gr; g.fillRect(-10, -10, w + 20, h + 20);
  if (dcol) halftone(g, rect(-10, -10, w + 20, h * 0.7), dcol, dr, 12, 45, 0.5);
}
// дождевые штрихи
function rain(g, w, h, t, n, a = 1, ang = 0.18, seed = 1) {
  if (a <= 0.01) return;
  g.save(); g.globalAlpha = a; g.strokeStyle = css(C.cyanD); g.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const sp = 900 + 500 * hash(seed + i);
    const L = h + 160, y = ((hash(seed + i * 3.7) * L + t * sp) % L) - 80;
    const x = ((hash(seed + i * 1.3) * (w + 200) + y * ang) % (w + 200)) - 100;
    g.lineWidth = 2.5 + 2 * hash(seed + i * 5);
    g.beginPath(); g.moveTo(x, y); g.lineTo(x - 26 * ang * 4, y - 46); g.stroke();
  }
  g.restore();
}
// снег: хлопья-«пушок» (большие мягкие) или мелкий
function snow(g, w, h, t, n, a = 1, size = 7, seed = 5, wind = 20) {
  if (a <= 0.01) return;
  g.save(); g.globalAlpha = a;
  for (let i = 0; i < n; i++) {
    const sp = 50 + 60 * hash(seed + i);
    const L = h + 60, y = ((hash(seed + i * 2.3) * L + t * sp) % L) - 30;
    const x = ((hash(seed + i * 4.1) * (w + 80) + Math.sin(t * 1.3 + i) * 18 + t * wind) % (w + 80)) - 40;
    const r = size * (0.6 + 0.8 * hash(seed + i * 9));
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = "#fff"; g.fill(); g.lineWidth = 2; g.strokeStyle = INK; g.stroke();
  }
  g.restore();
}
// изба с наличником; snowy — 0…1 (снег на крыше)
function hut(g, x, y, s, o = {}) {
  g.save(); g.translate(x, y); g.scale(s, s);
  const wall = o.wall || C.wood, roof = o.roof || [150, 60, 50];
  shape(g, rect(-90, -120, 180, 120), wall, { shade: { fn: rect(30, -130, 70, 140), col: C.woodD, r: 2.6, cell: 9 } });
  for (let yy = -100; yy < 0; yy += 20) { g.beginPath(); g.moveTo(-90, yy); g.lineTo(90, yy); g.lineWidth = 2.5; g.strokeStyle = INK; g.stroke(); }
  shape(g, poly([[-112, -116], [0, -196], [112, -116]]), roof, { shade: { fn: rect(0, -200, 120, 90), col: C.ink, r: 2.2, cell: 8, a: 0.6 } });
  const sn = o.snowy || 0;
  if (sn > 0.01) {
    // снег полотном: от конька вниз, нижний край волной и с сосульками-наплывами
    const d = 84 * sn;
    shape(g, (gg) => { gg.moveTo(-6, -204); gg.lineTo(6, -204); gg.lineTo(6 + d * 1.38, -204 + d); for (let k = 0; k <= 8; k++) { const x = lerp(6 + d * 1.38, -6 - d * 1.38, k / 8); gg.lineTo(x, -204 + d + (k % 2 ? 9 : 0) * sn); } gg.lineTo(-6, -204); gg.closePath(); }, C.white,
      { shade: { fn: rect(0, -210, 140, 100), col: C.cyanL, r: 2.4, cell: 8 } });
  }
  // окно с наличником
  shape(g, rect(-34, -92, 68, 56), o.lit ? C.yelL : [70, 90, 120], { lw: 4 });
  g.beginPath(); g.moveTo(0, -92); g.lineTo(0, -36); g.moveTo(-34, -64); g.lineTo(34, -64); g.lineWidth = 4; g.strokeStyle = INK; g.stroke();
  shape(g, poly([[-44, -94], [0, -116], [44, -94]]), C.white, { lw: 4 });
  shape(g, rect(-42, -38, 84, 10), C.white, { lw: 3.5 });
  if (o.smoke) { // дым из трубы — по ветру
    shape(g, rect(44, -186, 20, 40), [120, 60, 50], { lw: 4 });
    for (let i = 0; i < 4; i++) { const u = ((t0(o) * 0.5 + i / 4) % 1); halftone(g, circ(54 + u * 90 * (o.wind || 0.3) * 3, -196 - u * 70, 10 + u * 20), C.grayD, 2.4, 8, 45, 1 - u); }
  }
  g.restore();
}
const t0 = (o) => o.t || 0;
// ель: слои с тушью; snowy — шапки снега
function fir(g, x, y, s, o = {}) {
  g.save(); g.translate(x, y); g.scale(s, s); g.rotate(o.lean || 0);
  const col = o.col || C.greenD;
  shape(g, rect(-8, -30, 16, 30), C.woodD, { lw: 3.5, reg: 0 });
  for (let k = 0; k < 3; k++) {
    const yy = -30 - k * 50, ww = 70 - k * 18;
    shape(g, poly([[-ww, yy], [0, yy - 80], [ww, yy]]), col, { lw: 4, shade: { fn: rect(0, yy - 90, ww, 90), col: C.ink, r: 2.2, cell: 8, a: 0.5 } });
    if (o.snowy) shape(g, (gg) => { gg.moveTo(-ww * 0.7, yy - 22); gg.lineTo(0, yy - 80); gg.lineTo(ww * 0.7, yy - 22); gg.quadraticCurveTo(ww * 0.3, yy - 38, 0, yy - 30); gg.quadraticCurveTo(-ww * 0.3, yy - 38, -ww * 0.7, yy - 22); gg.closePath(); }, C.white, { lw: 3.5, reg: 1 });
  }
  g.restore();
}
// облачко речи; tail — точка, куда смотрит хвостик
function balloon(g, x, y, w, h, text, size, tail, k = 1, col = C.white, font = "ComicLine") {
  if (k <= 0.01) return;
  g.save(); g.translate(x, y); g.scale(k, k);
  shape(g, (gg) => {
    gg.ellipse(0, 0, w / 2, h / 2, 0, 0, TAU);
    const tx = tail[0] - x, ty = tail[1] - y, a = Math.atan2(ty, tx);
    gg.moveTo(Math.cos(a + 0.25) * w * 0.38, Math.sin(a + 0.25) * h * 0.38); gg.lineTo(tx / k, ty / k); gg.lineTo(Math.cos(a - 0.25) * w * 0.38, Math.sin(a - 0.25) * h * 0.38);
  }, col, { lw: 6, reg: 0 });
  g.beginPath(); g.ellipse(0, 0, w / 2 - 3, h / 2 - 3, 0, 0, TAU); g.fillStyle = css(col); g.fill();
  g.fillStyle = INK; g.font = `${size}px ${font}`; g.textAlign = "center"; g.textBaseline = "middle";
  const ls = text.split("\n"); ls.forEach((l, i) => g.fillText(l, 0, (i - (ls.length - 1) / 2) * size * 1.12));
  g.restore();
}

// ================= A1: окно с наличником, дождь стучит, мальчик скучает =================
function sceneA1(g, t, w, h) {
  sky(g, w, h, [120, 136, 160], [160, 172, 190], C.grayD, 2.8);
  // бревенчатая стена
  shape(g, rect(-10, -10, w + 20, h + 20), C.wood, { lw: 0, reg: 0 });
  for (let yy = 20; yy < h; yy += 46) { shape(g, rrect(-20, yy, w + 40, 40, 20), C.wood, { lw: 4, reg: 0, shade: { fn: rect(-20, yy + 22, w + 40, 20), col: C.woodD, r: 2.6, cell: 9 } }); }
  // окно
  const wx = w * 0.5, wy = h * 0.52, ww = 470, wh = 340;
  g.save(); g.beginPath(); g.rect(wx - ww / 2, wy - wh / 2, ww, wh); g.clip();
  sky(g, w, h, [70, 76, 96], [110, 118, 140], null);
  halftone(g, rect(wx - ww / 2, wy - wh / 2, ww, wh), C.cyanD, 3, 12, 45, 0.35);
  // мальчик за стеклом: локти на подоконнике, кулаки у щёк; по ходу строфы вздыхает
  const sigh = 0.5 + 0.5 * Math.sin(t * 1.4);
  drawBoy(g, wx + 118, wy + wh / 2 + 166, 1.0, { la: [0.3, -2.87], ra: [0.3, -2.87], ll: [0.06, 0], rl: [0.06, 0], tilt: 0.04 * Math.sin(t * 0.9), air: 0 },
    { mouth: "sad", eyes: "open", brow: -0.7, look: Math.sin(t * 0.7), lookY: -0.5 + 0.3 * sigh });
  g.restore();
  // капли на стекле: падают и сползают
  g.save(); g.beginPath(); g.rect(wx - ww / 2, wy - wh / 2, ww, wh); g.clip();
  for (let i = 0; i < 26; i++) {
    const ph = (t * (0.35 + 0.3 * hash(i)) + hash(i * 3)) % 1;
    const x = wx - ww / 2 + hash(i * 7.3) * ww, y = wy - wh / 2 + ph * (wh + 40) - 20;
    shape(g, (gg) => { gg.moveTo(x, y - 14); gg.quadraticCurveTo(x + 9, y + 2, x, y + 8); gg.quadraticCurveTo(x - 9, y + 2, x, y - 14); }, C.cyanL, { lw: 3, reg: 0 });
    g.beginPath(); g.moveTo(x, y - 16); g.lineTo(x, y - 16 - 40 * ph); g.lineWidth = 2; g.strokeStyle = "rgba(220,240,255,0.7)"; g.stroke();
  }
  g.restore();
  // рама, переплёт, наличник
  g.lineWidth = 12; g.strokeStyle = css([240, 236, 226]);
  g.strokeRect(wx - ww / 2, wy - wh / 2, ww, wh);
  g.beginPath(); g.moveTo(wx, wy - wh / 2); g.lineTo(wx, wy + wh / 2); g.moveTo(wx - ww / 2, wy - 30); g.lineTo(wx + ww / 2, wy - 30); g.stroke();
  g.lineWidth = 4; g.strokeStyle = INK; g.strokeRect(wx - ww / 2 - 6, wy - wh / 2 - 6, ww + 12, wh + 12); g.strokeRect(wx - ww / 2 + 6, wy - wh / 2 + 6, ww - 12, wh - 12);
  shape(g, (gg) => { gg.moveTo(wx - ww / 2 - 40, wy - wh / 2 - 10); gg.lineTo(wx, wy - wh / 2 - 90); gg.lineTo(wx + ww / 2 + 40, wy - wh / 2 - 10); gg.closePath(); }, C.white,
    { shade: { fn: rect(wx, wy - wh, ww, wh), col: C.cyanL, r: 2.4, cell: 8 } });
  for (let k = -3; k <= 3; k++) shape(g, circ(wx + k * 52, wy - wh / 2 - 26 + Math.abs(k) * 6, 9), C.cyan, { lw: 3.5, reg: 0 });
  shape(g, rect(wx - ww / 2 - 40, wy + wh / 2, ww + 80, 26), C.white, { lw: 4.5 });
  for (const sd of [-1, 1]) shape(g, rect(wx + sd * (ww / 2 + 22) - 18, wy - wh / 2, 36, wh), C.white, { lw: 4, shade: { fn: rect(wx + sd * (ww / 2 + 22), wy - wh / 2, 20, wh), col: C.cyanL, r: 2.2, cell: 8 } });
  // дождь перед окном
  rain(g, w, h, t, 70, 0.9);
  // ТУК-ТУК — на каждое «стучал», а потом мерно
  const k1 = spr(t, EV.stekla - 0.1, 0.6), k2 = spr(t, EV.stuchal, 0.6);
  sfx(g, "ТУК!", w * 0.2, h * 0.3, 92, -0.2, C.yel, k1 * (1 + 0.06 * Math.sin(t * 9)), 1 - inv(EV.L3 + 0.5, EV.L3 + 1, t));
  sfx(g, "ТУК!", w * 0.83, h * 0.24, 92, 0.18, C.yel, k2 * (1 + 0.06 * Math.sin(t * 9 + 1)), 1 - inv(EV.L3 + 0.5, EV.L3 + 1, t));
}

// ================= A2: туман облаками встаёт над деревней =================
function sceneA2(g, t, w, h) {
  sky(g, w, h, [110, 124, 148], [168, 178, 196], C.grayD, 2.6);
  // дальний лес и избы
  for (let i = 0; i < 9; i++) fir(g, 20 + i * 86, h * 0.62, 0.7 + 0.3 * hash(i), { col: [60, 90, 90] });
  hut(g, w * 0.28, h * 0.8, 1.0, { roof: [110, 70, 60] });
  hut(g, w * 0.74, h * 0.84, 1.15, { roof: [120, 60, 60], lit: true });
  shape(g, rect(-10, h * 0.82, w + 20, h * 0.2), C.mud, { lw: 4, shade: { fn: rect(-10, h * 0.82, w + 20, 200), col: C.mudD, r: 3, cell: 10 } });
  // туман: клубы поднимаются из низин и растут
  const u0 = inv(EV.tuman - 0.6, EV.E4 + 0.5, t);
  for (let i = 0; i < 9; i++) {
    const ph = clamp(u0 * 1.4 - hash(i * 2) * 0.4);
    const x = w * (0.05 + 0.9 * hash(i * 5.1)) + Math.sin(t * 0.5 + i) * 20, y = h * (0.95 - 0.6 * ph - 0.1 * hash(i));
    const r = 60 + 80 * ph;
    if (ph > 0) {
      g.save(); g.globalAlpha = 0.85 * Math.min(1, ph * 3);
      shape(g, cloudP(x, y, r * 2.4, r * 0.9, i * 3), [232, 236, 242], { union: true,  lw: 4, reg: 0, shade: { fn: rect(x - r * 2, y, r * 4, r), col: C.grayD, r: 2.4, cell: 9, a: 0.6 } });
      g.restore();
    }
  }
  rain(g, w, h, t, 40, 0.8, 0.18, 3);
}

// ================= A3: хмурые тучи дуют холодом =================
function sceneA3(g, t, w, h) {
  sky(g, w, h, [90, 100, 124], [150, 160, 182], C.ink, 2.4);
  // ветер: ледяные завитки летят справа налево вниз
  const blow = spr(t, EV.veyal - 0.2, 0.8);
  for (let i = 0; i < 8; i++) {
    const ph = (t * 0.8 + hash(i)) % 1, y = h * (0.35 + 0.6 * hash(i * 3)), x = w * (1 - ph * 1.3) + 80;
    g.save(); g.globalAlpha = blow * Math.sin(ph * Math.PI);
    g.lineWidth = 5; g.strokeStyle = css(C.cyanL); g.lineCap = "round";
    g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x - 70, y - 20, x - 120, y + 30, x - 170, y); g.arc(x - 180, y - 12, 14, 0.5, 5); g.stroke();
    g.lineWidth = 2; g.strokeStyle = INK; g.stroke();
    g.restore();
  }
  // берёзки гнутся
  for (let i = 0; i < 4; i++) {
    const bx = 70 + i * 110, lean = -0.12 * blow - 0.05 * Math.sin(t * 3 + i) * blow;
    g.save(); g.translate(bx, h + 10); g.rotate(lean);
    shape(g, rect(-7, -170, 14, 170), C.white, { lw: 3.5 });
    for (let k = 0; k < 5; k++) { g.fillStyle = INK; g.fillRect(-7, -150 + k * 30, 9, 4); }
    for (let k = 0; k < 5; k++) halftone(g, circ(-20 - k * 6, -170 + k * 22, 26), [180, 140, 40], 3, 9, 45, 0.9);
    g.restore();
  }
  // тучи с лицами — угрюмые, надувают щёки и дуют
  const cl = [[w * 0.62, h * 0.28, 300], [w * 0.86, h * 0.42, 230], [w * 0.4, h * 0.16, 200]];
  cl.forEach(([x, y, s], i) => {
    const bob = Math.sin(t * 1.2 + i) * 6, puff = 0.5 + 0.5 * Math.sin(t * 3 + i);
    shape(g, cloudP(x, y + bob, s * 1.6, s * 0.62, i * 7 + 1), [110, 118, 136], { union: true,  lw: 5, shade: { fn: rect(x - s, y + bob, s * 2, s), col: C.ink, r: 3, cell: 10, a: 0.55 } });
    const fx = x - s * 0.1, fy = y + bob - s * 0.02, r = s * 0.17;
    for (const sd of [-1, 1]) {
      g.beginPath(); g.ellipse(fx + sd * r, fy, r * 0.32, r * 0.42, 0, 0, TAU); g.fillStyle = "#fff"; g.fill(); g.lineWidth = 3.5; g.strokeStyle = INK; g.stroke();
      g.beginPath(); g.arc(fx + sd * r - r * 0.1, fy + r * 0.1, r * 0.17, 0, TAU); g.fillStyle = INK; g.fill();
      g.beginPath(); g.moveTo(fx + sd * r * 1.45, fy - r * 0.75); g.lineTo(fx + sd * r * 0.3, fy - r * 0.4); g.lineWidth = 6; g.stroke();
    }
    shape(g, ell(fx - r * 1.4, fy + r * 0.9, r * (0.25 + 0.12 * puff), r * 0.3), [70, 40, 60], { lw: 3.5, reg: 0 });
  });
  sfx(g, "ФЬЮ-У-У!", w * 0.26, h * 0.62, 70, -0.12, C.cyanL, spr(t, EV.holod - 0.1, 0.6), 1 - inv(EV.L7 - 0.3, EV.L7 + 0.2, t));
}

// ================= A4: сумрачный лес плачет =================
function sceneA4(g, t, w, h) {
  sky(g, w, h, [96, 106, 128], [140, 150, 170], C.grayD, 2.6);
  shape(g, rect(-10, h * 0.8, w + 20, h * 0.3), C.mud, { lw: 4 });
  // лес — сплошная стена елей, в ней лицо
  for (let i = 0; i < 14; i++) fir(g, -20 + i * 72, h * 0.86, 1.25 + 0.25 * hash(i * 2), { col: [34, 70, 64] });
  const fx = w * 0.5, fy = h * 0.42, cry = inv(EV.plakal - 0.3, EV.plakal + 0.3, t);
  for (const sd of [-1, 1]) {
    shape(g, ell(fx + sd * 90, fy, 44, 54), C.white, { lw: 5, reg: 0 });
    g.beginPath(); g.arc(fx + sd * 90, fy + 18, 22, 0, TAU); g.fillStyle = INK; g.fill();
    g.beginPath(); g.arc(fx + sd * 90 + 8, fy + 10, 7, 0, TAU); g.fillStyle = "#fff"; g.fill();
    // брови домиком
    g.beginPath(); g.moveTo(fx + sd * 40, fy - 64); g.lineTo(fx + sd * 132, fy - 44); g.lineWidth = 10; g.strokeStyle = INK; g.lineCap = "round"; g.stroke();
  }
  g.beginPath(); g.arc(fx, fy + 140, 50, Math.PI * 1.15, Math.PI * 1.85); g.lineWidth = 9; g.strokeStyle = INK; g.stroke();
  // слёзы ручьями
  for (const sd of [-1, 1]) for (let i = 0; i < 4; i++) {
    const ph = (t * 1.2 + i / 4 + (sd > 0 ? 0.13 : 0)) % 1, x = fx + sd * (96 + 6 * i), y = fy + 50 + ph * 190;
    if (cry > 0) shape(g, (gg) => { gg.moveTo(x, y - 22); gg.quadraticCurveTo(x + 13, y + 4, x, y + 12); gg.quadraticCurveTo(x - 13, y + 4, x, y - 22); }, C.cyanL, { lw: 3.5, reg: 0, a: cry });
  }
  // «Бог знает о чём» — над лесом вопросы
  const q = spr(t, EV.bog - 0.1, 0.7), qa = 1 - inv(EV.plakal + 0.6, EV.plakal + 1.1, t);
  [["?", w * 0.24, h * 0.18, -0.3], ["?", w * 0.5, h * 0.08, 0.1], ["?", w * 0.76, h * 0.2, 0.35]].forEach(([s0, x, y, r], i) => sfx(g, s0, x, y + Math.sin(t * 3 + i) * 6, 84, r, C.yel, spr(t, EV.bog - 0.1 + i * 0.15, 0.6), qa));
  rain(g, w, h, t, 50, 0.85, 0.15, 7);
}

// ================= B1: часы бьют полдень, дождь кончился =================
function sceneB1(g, t, w, h) {
  const stop = inv(EV.perestal - 0.2, EV.perestal + 0.4, t);
  sky(g, w, h, mix([96, 106, 128], [170, 190, 214], stop), mix([150, 160, 180], [210, 220, 234], stop), C.grayD, 2.4);
  // окно сзади с дождём, который обрывается
  g.save(); g.beginPath(); g.rect(w * 0.1, h * 0.1, w * 0.8, h * 0.5); g.clip();
  rain(g, w, h, t, 40, 1 - stop, 0.15, 11);
  g.restore();
  // стена комнаты
  shape(g, (gg) => { gg.rect(-10, -10, w + 20, h + 20); gg.rect(w * 0.9, h * 0.1, -w * 0.8, h * 0.5); }, [250, 228, 170], { lw: 4, reg: 0, rule: "evenodd", shade: { fn: rect(-10, -10, w + 20, h + 20), col: C.mag, r: 2, cell: 14, a: 0.35 } });
  // часы-ходики
  const cx = w * 0.5, cy = h * 0.58, R = 120;
  const bang = spr(t, EV.polden - 0.15, 0.5), shake = (1 - clamp((t - EV.polden) / 0.6)) * (t > EV.polden ? 1 : 0);
  g.save(); g.translate(cx + Math.sin(t * 60) * 5 * shake, cy);
  const sw = Math.sin(t * 4) * 0.35;
  g.save(); g.rotate(sw); limb(g, [[0, 80], [0, 220]], 6, C.yel, 3); shape(g, circ(0, 230, 22), C.yel, { lw: 4 }); g.restore();
  shape(g, circ(0, 0, R + 20), C.red, { shade: { fn: rect(30, -160, 120, 320), col: [140, 0, 20], r: 2.6, cell: 9 } });
  shape(g, circ(0, 0, R), C.white, { lw: 5 });
  for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; g.beginPath(); g.moveTo(Math.sin(a) * R * 0.82, -Math.cos(a) * R * 0.82); g.lineTo(Math.sin(a) * R * 0.95, -Math.cos(a) * R * 0.95); g.lineWidth = k % 3 ? 4 : 8; g.strokeStyle = INK; g.stroke(); }
  // стрелки бегут к 12 и встают
  const u = easeOut(inv(EV.L9 - 1.2, EV.polden, t));
  const mA = lerp(-TAU * 2.2, 0, u), hA = lerp(-0.9, 0, u);
  limb(g, [[0, 0], [Math.sin(hA) * R * 0.5, -Math.cos(hA) * R * 0.5]], 12, C.ink, 0);
  limb(g, [[0, 0], [Math.sin(mA) * R * 0.78, -Math.cos(mA) * R * 0.78]], 8, C.ink, 0);
  shape(g, circ(0, 0, 10), C.yel, { lw: 4, reg: 0 });
  g.restore();
  sfx(g, "БОМ!", cx + 150, cy - 150, 96, 0.2, C.yel, bang, 1 - inv(EV.L10 + 0.2, EV.L10 + 0.6, t), C.mag);
}

// ================= B2: снежок пушком падает на осеннюю грязь =================
function sceneB2(g, t, w, h) {
  const sn = inv(EV.pushok - 0.4, EV.E12 + 2.0, t);
  sky(g, w, h, [176, 190, 210], [214, 222, 232], C.cyanD, 2.2);
  // забор и дальние избы
  hut(g, w * 0.8, h * 0.58, 0.9, { roof: [120, 60, 60], snowy: sn });
  for (let i = 0; i < 16; i++) { const x = 20 + i * 44; shape(g, poly([[x, h * 0.62], [x + 18, h * 0.56], [x + 36, h * 0.62], [x + 36, h * 0.74], [x, h * 0.74]]), [150, 110, 70], { lw: 3.5 }); }
  // грязь с лужами и следами
  shape(g, rect(-10, h * 0.72, w + 20, h * 0.4), C.mud, { lw: 4, shade: { fn: rect(-10, h * 0.72, w + 20, 300), col: C.mudD, r: 3.2, cell: 11 } });
  for (const [px, py, pw] of [[0.25, 0.86, 200], [0.62, 0.92, 260], [0.9, 0.82, 140]]) shape(g, ell(w * px, h * py, pw / 2, 22), [130, 150, 170], { lw: 4, shade: { fn: rect(w * px - pw / 2, h * py - 30, pw, 60), col: C.cyan, r: 2.4, cell: 9 } });
  // снег ложится: белые пятна на грязи растут
  for (let i = 0; i < 60; i++) {
    const st = hash(i * 3.3), u = clamp((sn - st * 0.7) * 3);
    if (u <= 0) continue;
    const x = hash(i * 1.7) * w, y = h * (0.75 + 0.25 * hash(i * 2.9));
    shape(g, ell(x, y, 10 + 22 * u, 4 + 7 * u), C.white, { lw: 3, reg: 0 });
  }
  // мальчик в окошке слева: нос к стеклу, глаза круглые
  const wx = w * 0.16, wy = h * 0.36;
  shape(g, rect(wx - 150, wy - 140, 300, 280), C.wood, { lw: 4, reg: 0 });
  g.save(); g.beginPath(); g.rect(wx - 110, wy - 100, 220, 190); g.clip();
  g.fillStyle = css([60, 70, 100]); g.fillRect(wx - 110, wy - 100, 220, 190);
  const surpr = inv(EV.pushok - 0.2, EV.pushok + 0.3, t);
  drawBoy(g, wx + 56, wy + 250, 0.92, { la: [0.3, -2.87], ra: [0.3, -2.87], ll: [0.06, 0], rl: [0.06, 0], tilt: 0, air: 0 },
    { mouth: surpr > 0.5 ? "o" : "flat", eyes: surpr > 0.5 ? "wide" : "open", brow: surpr > 0.5 ? 0.9 : -0.3, look: 1, lookY: 1 });
  g.restore();
  g.lineWidth = 9; g.strokeStyle = css([240, 236, 226]); g.strokeRect(wx - 110, wy - 100, 220, 190);
  g.beginPath(); g.moveTo(wx, wy - 100); g.lineTo(wx, wy + 90); g.stroke();
  g.lineWidth = 4; g.strokeStyle = INK; g.strokeRect(wx - 116, wy - 106, 232, 202);
  // хлопья
  snow(g, w, h, t, Math.round(70 * clamp(sn * 3)), clamp(sn * 4), 9, 21, 25);
  sfx(g, "О-О!", wx + 170, wy - 120, 70, 0.15, C.yel, spr(t, EV.pushok + 0.1, 0.6), 1 - inv(EV.L12, EV.L12 + 0.5, t));
}

// ================= B3: ночь прошла — солнце взрывается лучами =================
function sceneB3(g, t, w, h) {
  const day = inv(EV.rassvelo - 0.25, EV.rassvelo + 0.2, t);
  sky(g, w, h, mix(C.night, [90, 190, 240], day), mix([50, 60, 120], [190, 230, 250], day), mix(C.night, C.cyan, day), 3);
  if (day < 1) { // звёзды и сонная луна
    g.save(); g.globalAlpha = 1 - day;
    for (let i = 0; i < 18; i++) shape(g, burstP(hash(i) * w, hash(i * 3) * h * 0.7, 4, 10, 4, i), C.yel, { lw: 2.5, reg: 0 });
    // полумесяц: внешняя дуга луны и внутренняя дуга «выреза» между точками пересечения кругов
    { const x1 = w * 0.62, y1 = h * 0.36, r1 = 70, x2 = x1 + 34, y2 = y1 - 10, r2 = 62;
      const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy), a = (r1 * r1 - r2 * r2 + d * d) / (2 * d), hh = Math.sqrt(r1 * r1 - a * a);
      const mx = x1 + dx * a / d, my = y1 + dy * a / d, P1 = [mx + hh * dy / d, my - hh * dx / d], P2 = [mx - hh * dy / d, my + hh * dx / d];
      const a1 = Math.atan2(P1[1] - y1, P1[0] - x1), a2 = Math.atan2(P2[1] - y1, P2[0] - x1), b1 = Math.atan2(P1[1] - y2, P1[0] - x2), b2 = Math.atan2(P2[1] - y2, P2[0] - x2);
      shape(g, (gg) => { gg.arc(x1, y1, r1, a1, a2, true); gg.arc(x2, y2, r2, b2, b1, false); gg.closePath(); }, C.yelL, { lw: 4 }); }
    g.beginPath(); g.arc(w * 0.62 - 30, h * 0.36, 10, 0.2, Math.PI - 0.2); g.lineWidth = 4; g.strokeStyle = INK; g.stroke();
    sfx(g, "Z-z-z", w * 0.3, h * 0.22, 46, -0.1, C.white, 1, 1);
    g.restore();
  }
  if (day > 0) { // солнце с лучами
    const k = spr(t, EV.rassvelo - 0.2, 0.6), sx = w * 0.5, sy = h * 0.42;
    g.save(); g.translate(sx, sy); g.rotate(t * 0.4); g.scale(k, k);
    shape(g, burstP(0, 0, 120, 240, 16, 5), C.yel, { lw: 5, shade: { fn: rect(0, -260, 260, 520), col: C.red, r: 3, cell: 11, a: 0.5 } });
    g.restore();
    g.save(); g.translate(sx, sy); g.scale(k, k);
    shape(g, circ(0, 0, 96), [255, 190, 0], { lw: 5 });
    face(g, 0, 6, 80, { eyes: "happy", brow: 0.6, mouth: "laugh" });
    g.restore();
    // последнее облачко сдувает за край
    const off = easeIn(inv(EV.oblachka - 0.2, EV.oblachka + 0.7, t));
    if (off < 1) { shape(g, cloudP(w * 0.18 - off * 400, h * 0.78, 180, 70, 4), C.white, { union: true,  lw: 4 }); }
    if (t > EV.oblachka - 0.1) sfx(g, "ПУФ!", w * 0.2, h * 0.62, 56, -0.2, C.white, spr(t, EV.oblachka - 0.1, 0.5), 1 - inv(EV.oblachka + 0.8, EV.oblachka + 1.2, t), C.cyan);
  }
  sfx(g, "ДЗИНЬ!", w * 0.5, h * 0.86, 78, -0.05, C.white, spr(t, EV.rassvelo, 0.5), 1 - inv(EV.L14 - 0.2, EV.L14 + 0.2, t), C.mag);
}

// ================= B4: мальчик выбегает на крыльцо, река замерзает =================
function sceneB4(g, t, w, h) {
  sky(g, w, h, [80, 190, 240], [200, 236, 250], C.cyan, 2.2);
  // дальний берег, лес в снегу
  for (let i = 0; i < 14; i++) fir(g, w * 0.42 + i * 60, h * 0.5, 0.55 + 0.2 * hash(i), { snowy: true });
  shape(g, rect(-10, h * 0.48, w + 20, h * 0.1), C.white, { lw: 4, shade: { fn: rect(-10, h * 0.5, w + 20, 40), col: C.cyanL, r: 2.4, cell: 9 } });
  // река: волны → лёд от берегов
  const ice = easeOut(inv(EV.zamerzla - 0.3, EV.reka + 0.4, t));
  shape(g, rect(-10, h * 0.56, w + 20, h * 0.22), mix(C.cyanD, C.cyanL, ice), { lw: 4, shade: { fn: rect(-10, h * 0.56, w + 20, 200), col: C.white, r: 2.4 + ice * 1.2, cell: 10, a: 0.6 } });
  if (ice < 1) for (let i = 0; i < 14; i++) {
    const x = ((i * 120 + t * 90) % (w + 120)) - 60, y = h * (0.6 + 0.14 * hash(i));
    g.save(); g.globalAlpha = 1 - ice; g.beginPath(); g.moveTo(x - 30, y); g.quadraticCurveTo(x - 15, y - 10, x, y); g.quadraticCurveTo(x + 15, y + 10, x + 30, y); g.lineWidth = 3.5; g.strokeStyle = INK; g.stroke(); g.restore();
  }
  if (ice > 0) { // трещинки и блик льда
    g.save(); g.globalAlpha = ice;
    for (let i = 0; i < 9; i++) { const x = w * (0.4 + 0.6 * hash(i * 2)), y = h * (0.6 + 0.15 * hash(i * 5)); inkLine(g, [[x, y], [x + 30, y + 10], [x + 50, y - 4], [x + 80, y + 6]], 3); }
    g.restore();
  }
  // ближний берег в снегу и крыльцо слева
  shape(g, rect(-10, h * 0.76, w + 20, h * 0.3), C.white, { lw: 4, shade: { fn: rect(-10, h * 0.86, w + 20, 100), col: C.cyanL, r: 2.6, cell: 9 } });
  shape(g, rect(-10, -10, w * 0.28, h * 0.8), C.wood, { lw: 5, shade: { fn: rect(w * 0.18, -10, 100, h), col: C.woodD, r: 2.6, cell: 9 } });
  const door = inv(EV.vozduh - 0.6, EV.vozduh - 0.2, t);
  shape(g, rect(w * 0.08, h * 0.24, w * 0.12, h * 0.52), [60, 40, 30], { lw: 4 });
  g.save(); g.translate(w * 0.08, 0); g.scale(1 - door * 0.75, 1);
  shape(g, rect(0, h * 0.24, w * 0.12, h * 0.52), [170, 100, 50], { lw: 4, shade: { fn: rect(w * 0.06, h * 0.2, 80, h), col: C.woodD, r: 2.4, cell: 8 } });
  g.restore();
  shape(g, rect(-10, h * 0.76, w * 0.32, 26), [150, 96, 50], { lw: 4.5 });
  // мальчик: выскочил — «ура», потом глубокий вдох
  if (door > 0.2) {
    const jump = spr(t, EV.vozduh - 0.45, 0.6), bx = lerp(w * 0.14, w * 0.27, clamp(jump));
    const P = poseAt([[0, BOY_POSES.hooray], [EV.vozduh + 0.6, BOY_POSES.breathe], [EV.zamerzla - 0.2, BOY_POSES.wave]], t, 0.4);
    const air = Math.max(0, Math.sin(clamp((t - EV.vozduh + 0.45) / 0.55) * Math.PI)) * 0.8;
    drawBoy(g, bx, h * 0.8, 0.82, { ...P, air }, { mouth: t < EV.chist ? "laugh" : "o", eyes: t > EV.vozduh + 0.4 && t < EV.zamerzla - 0.3 ? "closed" : "happy", brow: 0.7 });
    if (t > EV.chist - 0.3 && t < EV.zamerzla) { const u = inv(EV.chist - 0.3, EV.chist + 0.9, t); halftone(g, circ(bx + 30 + u * 90, h * 0.8 - 230 - u * 30, 16 + u * 22), C.white, 3.2, 8, 30, 1 - u); }
  }
  sfx(g, "ХРУСТЬ!", w * 0.68, h * 0.4, 110, -0.08, C.cyanL, spr(t, EV.zamerzla, 0.6), 1 - inv(EV.L17 - 0.4, EV.L17, t), C.cyanD);
}
