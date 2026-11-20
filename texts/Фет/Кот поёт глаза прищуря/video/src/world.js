// ---------- Мир: комната (мировые координаты ≈ 0…1920 × 0…1080, пол с y = 700) и двор в метели ----------
const ROOM = {
  floorY: 700, win: [620, 150, 1060, 520], door: [1560, 180, 1800, 700], cat: [430, 846], cushion: [430, 852],
  boy: [1180, 884], boyS: 0.85, box: [626, 862], rug: [1060, 872, 470, 116], lamp: [1180, 96],
};
// снег: частицы в прямоугольнике, детерминированно; wind — снос по x (пикс/с)
function drawSnow(g, t, n, x0, y0, w, h, wind, fall, size, seed, a = 1, col = C.snow) {
  g.save(); g.globalAlpha *= a; g.fillStyle = css(col);
  for (let i = 0; i < n; i++) {
    const hx = hash(i * 1.7 + seed), hy = hash(i * 3.3 + seed), hs = hash(i * 5.1 + seed);
    const sp = 0.6 + hs * 0.8;
    let x = (hx * w + t * wind * sp + Math.sin(t * 1.6 + i) * 18) % w; if (x < 0) x += w;
    let y = (hy * h + t * fall * sp) % h; if (y < 0) y += h;
    const r = size * (0.5 + hs);
    g.beginPath(); g.ellipse(x0 + x, y0 + y, r * 1.3, r, Math.atan2(fall, wind), 0, TAU); g.fill();
  }
  g.restore();
}
// вихревые штрихи ветра
function windSwirls(g, t, x0, y0, w, h, n, a, seed = 0) {
  if (a <= 0) return;
  g.save(); g.globalAlpha *= a; g.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const ph = (t * 0.7 + hash(i + seed)) % 1;
    const x = x0 + ((hash(i * 7 + seed) * w + ph * w * 0.9) % w), y = y0 + hash(i * 13 + seed) * h;
    const L = 120 + hash(i * 3) * 160, al = Math.sin(ph * Math.PI);
    g.beginPath(); g.moveTo(x - L, y);
    g.bezierCurveTo(x - L * 0.4, y - 30, x - L * 0.1, y + 40, x + 10, y);
    g.arc(x + 10, y - 22, 22, Math.PI / 2, -Math.PI * 0.9, true);
    g.strokeStyle = `rgba(230,245,255,${(0.75 * al).toFixed(3)})`; g.lineWidth = 6; g.stroke();
  }
  g.restore();
}
// Дух бури: круглая туча с лицом; o.blow 0…1 — свистит (щёки, губы «о», струя), o.juggle — снежки по кругу, o.grin
function drawStorm(g, x, y, s, t, o = {}) {
  g.save(); g.translate(x, y + Math.sin(t * 2.4) * 10); g.scale(s, s); g.rotate(Math.sin(t * 1.7) * 0.06);
  const blow = clamp(o.blow ?? 0);
  const puffs = [[0, 0, 120], [-110, 20, 80], [110, 18, 84], [-60, -70, 82], [62, -66, 86], [0, 60, 90], [-150, -20, 54], [154, -24, 56]];
  const body = (c) => { c.beginPath(); for (const [px, py, r] of puffs) { c.moveTo(px + r, py); c.arc(px, py, r + Math.sin(t * 3 + px) * 3, 0, TAU); } };
  // контур — обводка каждого круга под заливкой
  g.lineWidth = 12; g.strokeStyle = css(ink(C.cloud)); body(g); g.stroke();
  body(g); g.fillStyle = css(C.cloudD); g.fill();
  g.save(); body(g); g.clip(); g.translate(-14, -18); body(g); g.fillStyle = css(C.cloud); g.fill(); g.restore();
  // брови-вихры и глаза
  const wink = o.wink ?? 0;
  for (const sd of [-1, 1]) {
    const ex = sd * 48, ey = -10;
    if (blow > 0.3 || (sd > 0 && wink > 0.5)) { g.beginPath(); g.moveTo(ex - 18, ey); g.quadraticCurveTo(ex, ey - 16, ex + 18, ey); g.strokeStyle = css(C.text); g.lineWidth = 8; g.lineCap = "round"; g.stroke(); }
    else {
      ell(g, ex, ey, 16, 21); g.fillStyle = css(C.white); g.fill(); g.lineWidth = 5; g.strokeStyle = css(C.text); g.stroke();
      ell(g, ex + 4 * (o.lookX ?? 0), ey + 3, 9, 13); g.fillStyle = css(C.text); g.fill();
      ell(g, ex - 3, ey - 5, 4, 5); g.fillStyle = css(C.white); g.fill();
    }
    g.beginPath(); g.moveTo(ex - 22, ey - 36); g.lineTo(ex + 18, ey - 30 - sd * 8); g.strokeStyle = css(C.text); g.lineWidth = 7; g.stroke();
  }
  // щёки и рот
  const ch = 1 + blow * 0.7;
  for (const sd of [-1, 1]) { ell(g, sd * 74, 36, 26 * ch, 16 * ch); g.fillStyle = css(C.pink, 0.55); g.fill(); }
  if (blow > 0.05) {
    ell(g, 0, 44, 9 + blow * 5, 9 + blow * 7); g.fillStyle = css([90, 40, 90]); g.fill(); g.lineWidth = 6; g.strokeStyle = css(C.text); g.stroke();
  } else {
    // озорная улыбка с клычком
    g.beginPath(); g.moveTo(-30, 34); g.quadraticCurveTo(0, 66, 30, 34); g.closePath(); g.fillStyle = css([90, 40, 90]); g.fill();
    g.lineWidth = 5; g.strokeStyle = css(C.text); g.stroke();
    g.beginPath(); g.moveTo(10, 38); g.lineTo(16, 50); g.lineTo(22, 37); g.fillStyle = css(C.white); g.fill();
  }
  g.restore();
  // струя свиста: линии вперёд (dir), вихрь
  if (blow > 0.05) {
    const dir = o.dir ?? -1;
    g.save(); g.translate(x + dir * 30 * s, y + 46 * s); g.scale(s, s);
    for (let i = 0; i < 7; i++) {
      const ph = (t * 2.2 + i / 7) % 1, yy = (i - 3) * 16 * (0.4 + ph);
      g.beginPath(); g.moveTo(dir * (40 + ph * 300), yy); g.lineTo(dir * (120 + ph * 520), yy * 1.6);
      g.strokeStyle = `rgba(235,250,255,${(blow * Math.sin(ph * Math.PI)).toFixed(3)})`; g.lineWidth = 8 - ph * 5; g.lineCap = "round"; g.stroke();
    }
    g.restore();
  }
  // снежки вокруг (жонглирует)
  if ((o.juggle ?? 0) > 0) {
    for (let k = 0; k < 3; k++) {
      const an = t * 3.2 + k * TAU / 3;
      const bx = x + Math.cos(an) * 230 * s, by = y - 40 * s + Math.sin(an) * 120 * s - Math.abs(Math.cos(an)) * 40 * s;
      g.save(); g.globalAlpha *= o.juggle;
      ell(g, bx, by, 24 * s, 24 * s); g.fillStyle = css(C.snow); g.fill(); g.lineWidth = 5 * s; g.strokeStyle = css(C.snowS); g.stroke();
      g.restore();
    }
  }
}
// Небо за окном/во дворе
function skyGrad(g, x0, y0, x1, y1) {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  gr.addColorStop(0, css(C.skyD)); gr.addColorStop(0.6, css(C.sky)); gr.addColorStop(1, css(C.teal));
  g.fillStyle = gr; g.fillRect(x0, y0, x1 - x0, y1 - y0);
}
function fir(g, x, y, h, bend, col = [40, 90, 110]) {
  g.save(); g.translate(x, y);
  for (let k = 0; k < 4; k++) {
    const yy = -h * (0.15 + k * 0.22), ww = h * (0.42 - k * 0.08), b = bend * (0.4 + k * 0.3);
    g.beginPath(); g.moveTo(-ww + b * 0.4, yy + h * 0.2); g.lineTo(b, yy - h * 0.22); g.lineTo(ww + b * 0.6, yy + h * 0.2); g.closePath();
    g.fillStyle = css(col); g.fill(); g.lineWidth = 4; g.strokeStyle = css(ink(col)); g.stroke();
    // снег на лапах
    g.beginPath(); g.moveTo(-ww * 0.7 + b * 0.4, yy + h * 0.14); g.quadraticCurveTo(b, yy - h * 0.1, ww * 0.7 + b * 0.6, yy + h * 0.14);
    g.lineTo(ww * 0.5 + b * 0.6, yy + h * 0.17); g.quadraticCurveTo(b, yy - h * 0.04, -ww * 0.5 + b * 0.4, yy + h * 0.17); g.closePath();
    g.fillStyle = css(C.snow); g.fill();
  }
  g.restore();
}

// ---------- Комната ----------
function drawRoom(g, t, st) {
  const fy = ROOM.floorY;
  // стена: обои с ромбиками
  g.fillStyle = css(C.wall); g.fillRect(-800, -400, 3600, fy + 400);
  g.save(); g.fillStyle = css(C.wallD, 0.55);
  for (let yy = -360; yy < fy - 120; yy += 90) for (let xx = -760 + ((yy / 90) % 2 ? 45 : 0); xx < 2800; xx += 90) {
    g.beginPath(); g.moveTo(xx, yy - 10); g.lineTo(xx + 8, yy); g.lineTo(xx, yy + 10); g.lineTo(xx - 8, yy); g.closePath(); g.fill();
  }
  g.restore();
  // тёплый свет лампы на стене
  const lg = g.createRadialGradient(ROOM.lamp[0], ROOM.lamp[1] + 140, 40, ROOM.lamp[0], ROOM.lamp[1] + 140, 900);
  lg.addColorStop(0, "rgba(255,230,170,0.55)"); lg.addColorStop(1, "rgba(255,230,170,0)");
  g.fillStyle = lg; g.fillRect(-800, -400, 3600, 1800);
  // панель внизу стены
  cel2(g, (c) => c.rect(-800, fy - 110, 3600, 110), C.wood, { lw: 5, sx: 0, sy: -10 });
  // пол
  g.fillStyle = css(C.floor); g.fillRect(-800, fy, 3600, 900);
  g.strokeStyle = css(shd(C.floor)); g.lineWidth = 4;
  for (let k = -12; k < 30; k++) { g.beginPath(); g.moveTo(960 + k * 110 * 0.55, fy); g.lineTo(960 + k * 110 * 1.9 - 900, fy + 700); g.stroke(); }
  // полоса тёплого света из двери на полу
  if (st.door > 0) {
    const [dx0, , dx1] = ROOM.door, a = clamp(st.door);
    g.save(); g.globalAlpha = 0.75 * a;
    g.beginPath(); g.moveTo(dx0 + (dx1 - dx0) * (1 - a), fy); g.lineTo(dx1, fy); g.lineTo(dx1 - 260, fy + 520); g.lineTo(lerp(dx1 - 260, 760, a), fy + 520); g.closePath();
    const gl = g.createLinearGradient(dx1, fy, 900, fy + 400); gl.addColorStop(0, "rgba(255,236,170,1)"); gl.addColorStop(1, "rgba(255,226,150,0.35)");
    g.fillStyle = gl; g.fill(); g.restore();
  }
  // печка слева
  const [sx0, sy0, sx1] = [-380, 40, 270];
  cel2(g, (c) => rr(c, sx0, sy0, sx1 - sx0, fy - sy0 + 6, 24), C.stove, { lw: 6, sx: 10, sy: -10 });
  for (let r = 0; r < 6; r++) for (let q = 0; q < 6; q++) {
    const tx = sx0 + 40 + q * 100, ty = sy0 + 50 + r * 100;
    if (tx > sx1 - 70) continue;
    rr(g, tx, ty, 60, 60, 10); g.fillStyle = css(C.tile, 0.9); g.fill();
    g.beginPath(); g.arc(tx + 30, ty + 30, 14, 0, TAU); g.fillStyle = css(C.white); g.fill();
  }
  // устье печки с огнём
  rr(g, -180, 470, 220, 170, 80); g.fillStyle = css([90, 50, 70]); g.fill(); g.lineWidth = 6; g.strokeStyle = css(ink(C.stove)); g.stroke();
  for (let k = 0; k < 3; k++) {
    const fl = Math.sin(t * 9 + k * 2) * 10;
    g.beginPath(); g.moveTo(-140 + k * 60, 636); g.quadraticCurveTo(-150 + k * 60, 560 + fl, -110 + k * 60, 520 + fl); g.quadraticCurveTo(-90 + k * 60, 590, -80 + k * 60, 636); g.closePath();
    g.fillStyle = css(k === 1 ? C.yellow : C.lamp); g.fill();
  }
  // окно
  drawWindow(g, t, st);
  // дверь
  drawDoor(g, t, st);
  // лампа под потолком
  const [lx, ly] = ROOM.lamp, sw = Math.sin(t * 1.3) * 0.03 + (st.lampSwing ?? 0) * Math.sin(t * 6) * 0.08;
  g.save(); g.translate(lx, -300); g.rotate(sw);
  g.beginPath(); g.moveTo(0, 0); g.lineTo(0, ly + 300); g.strokeStyle = css(C.text); g.lineWidth = 5; g.stroke();
  const lgl = g.createRadialGradient(0, ly + 360, 10, 0, ly + 360, 200); lgl.addColorStop(0, "rgba(255,240,180,0.9)"); lgl.addColorStop(1, "rgba(255,240,180,0)");
  g.fillStyle = lgl; g.fillRect(-220, ly + 160, 440, 400);
  cel2(g, (c) => { c.beginPath(); c.moveTo(-40, ly + 300); c.lineTo(40, ly + 300); c.lineTo(110, ly + 380); c.lineTo(-110, ly + 380); c.closePath(); }, C.lamp, { lw: 5, sx: 8, sy: 0 });
  ell(g, 0, ly + 384, 28, 12); g.fillStyle = css(C.yellow); g.fill();
  g.restore();
  // ковёр
  const [rx, ry, rw, rh] = ROOM.rug;
  ell(g, rx, ry, rw, rh); g.fillStyle = css(C.rug); g.fill(); g.lineWidth = 6; g.strokeStyle = css(ink(C.rug)); g.stroke();
  ell(g, rx, ry, rw * 0.8, rh * 0.76); g.lineWidth = 14; g.strokeStyle = css(C.rug2); g.stroke();
  ell(g, rx, ry, rw * 0.55, rh * 0.5); g.lineWidth = 10; g.strokeStyle = css(C.rug3); g.stroke();
  ell(g, rx, ry, rw * 0.3, rh * 0.26); g.fillStyle = css(C.rug2); g.fill();
}
function drawWindow(g, t, st) {
  const [x0, y0, x1, y1] = ROOM.win, rat = (st.rattle ?? 0) * Math.sin(t * 50) * 3;
  g.save(); g.translate(rat, 0);
  // вид наружу
  g.save(); g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0); g.clip();
  skyGrad(g, x0, y0, x1, y1);
  fir(g, x0 + 60, y1 + 30, 220, Math.sin(t * 2.2) * 20 - 16, [50, 100, 130]);
  fir(g, x1 - 50, y1 + 40, 260, Math.sin(t * 2.0 + 1) * 24 - 18, [50, 100, 130]);
  g.fillStyle = css(C.snow); g.fillRect(x0, y1 - 40, x1 - x0, 60);
  windSwirls(g, t, x0, y0 + 20, x1 - x0, y1 - y0 - 60, 4, 0.8 * (st.storm ?? 1));
  if ((st.stormInWin ?? 0) > 0) drawStorm(g, lerp(x1 + 220, x0 + 230, ease(st.stormInWin)), y0 + 160, 0.62, t, { juggle: st.juggle ?? 0, blow: st.blowWin ?? 0, dir: -1, lookX: -1 });
  drawSnow(g, t, 60, x0, y0, x1 - x0, y1 - y0, -260 * (st.storm ?? 1), 170, 5, 3);
  // снежные клоки, прилипшие к стеклу
  for (const sp of st.splats || []) {
    const u = t - sp.t0; if (u < 0) continue;
    const k = SPRING(u / 0.35);
    g.save(); g.translate(sp.x, sp.y); g.scale(k, k);
    g.beginPath(); for (let i = 0; i < 12; i++) { const an = i / 12 * TAU, r = (i % 2 ? 26 : 40) * (0.8 + hash(i + sp.x) * 0.4); g.lineTo(Math.cos(an) * r, Math.sin(an) * r); }
    g.closePath(); g.fillStyle = css(C.snow); g.fill(); g.lineWidth = 4; g.strokeStyle = css(C.snowS); g.stroke();
    g.restore();
    if (u < 0.3) impact(g, sp.x, sp.y, 70 * easeOut(u / 0.3), 1 - u / 0.3);
  }
  g.restore();
  // блик на стекле
  g.save(); g.globalAlpha = 0.18; g.fillStyle = "#fff";
  g.beginPath(); g.moveTo(x0 + 40, y1); g.lineTo(x0 + 160, y0); g.lineTo(x0 + 230, y0); g.lineTo(x0 + 110, y1); g.fill(); g.restore();
  // рама с переплётом
  g.lineJoin = "round";
  g.strokeStyle = css(C.white); g.lineWidth = 26; g.strokeRect(x0, y0, x1 - x0, y1 - y0);
  g.beginPath(); g.moveTo((x0 + x1) / 2, y0); g.lineTo((x0 + x1) / 2, y1); g.moveTo(x0, y0 + (y1 - y0) * 0.42); g.lineTo(x1, y0 + (y1 - y0) * 0.42);
  g.lineWidth = 16; g.stroke();
  g.strokeStyle = css(ink(C.wall)); g.lineWidth = 4; g.strokeRect(x0 - 13, y0 - 13, x1 - x0 + 26, y1 - y0 + 26); g.strokeRect(x0 + 13, y0 + 13, x1 - x0 - 26, y1 - y0 - 26);
  // подоконник
  cel2(g, (c) => rr(c, x0 - 50, y1 + 8, x1 - x0 + 100, 30, 8), C.white, { lw: 5, sx: 0, sy: -8 });
  g.restore();
  // занавески: колышутся, на «свищет» взлетают
  const fl = st.flap ?? 0;
  for (const sd of [-1, 1]) {
    const cx = sd < 0 ? x0 - 40 : x1 + 40;
    const swing = Math.sin(t * 2 + sd) * 8 + fl * (28 + Math.sin(t * 11) * 22);
    cel2(g, (c) => {
      c.beginPath(); c.moveTo(cx - 70, y0 - 50); c.lineTo(cx + 70, y0 - 50);
      c.quadraticCurveTo(cx + 60 + swing * 0.6 - sd * 40, (y0 + y1) / 2, cx + 40 - sd * 30 + swing * 2.2, y1 + 70 - fl * 50);
      c.lineTo(cx - 50 - sd * 30 + swing * 2.6, y1 + 80 - fl * 60);
      c.quadraticCurveTo(cx - 70 + swing * 0.4, (y0 + y1) / 2, cx - 70, y0 - 50); c.closePath();
    }, C.pink, { lw: 5, sx: sd * 8, sy: 0 });
  }
  // карниз
  cel2(g, (c) => rr(c, x0 - 140, y0 - 64, x1 - x0 + 280, 22, 10), C.woodD, { lw: 5, sx: 0, sy: -4 });
}
function drawDoor(g, t, st) {
  const [x0, y0, x1, y1] = ROOM.door, a = ease(st.door ?? 0);
  // наличник
  cel2(g, (c) => rr(c, x0 - 26, y0 - 26, x1 - x0 + 52, y1 - y0 + 26, 8), C.white, { lw: 5, sx: 0, sy: -6 });
  // проём: тёплый свет коридора
  const gl = g.createLinearGradient(x0, y0, x1, y1); gl.addColorStop(0, "rgb(255,240,190)"); gl.addColorStop(1, "rgb(255,206,130)");
  g.fillStyle = gl; g.fillRect(x0, y0, x1 - x0, y1 - y0);
  // полотно: петли справа, открывается в комнату
  const w = (x1 - x0) * (1 - a * 0.78);
  cel2(g, (c) => { c.beginPath(); c.moveTo(x1 - w, y0 - a * 30); c.lineTo(x1, y0); c.lineTo(x1, y1); c.lineTo(x1 - w, y1 + a * 30); c.closePath(); }, C.wood, { lw: 5, sx: 10, sy: 0 });
  if (a < 0.7) {
    const k = 1 - a;
    rr(g, x1 - w + 30 * k, y0 + 40, w - 60 * k, 180, 10); g.lineWidth = 4; g.strokeStyle = css(ink(C.wood)); g.stroke();
    rr(g, x1 - w + 30 * k, y0 + 280, w - 60 * k, 180, 10); g.stroke();
    ell(g, x1 - w + 24 * k + 6, (y0 + y1) / 2 + 20, 10 * k + 3, 10); g.fillStyle = css(C.yellow); g.fill(); g.stroke();
  }
}
// короб для игрушек
function drawBox(g, x, y, s, lid) {
  g.save(); g.translate(x, y); g.scale(s, s);
  cel2(g, (c) => rr(c, -90, -110, 180, 110, 14), [120, 180, 120], { lw: 5, sx: 8, sy: 0 });
  g.font = "800 46px 'M PLUS Rounded 1c'"; g.textAlign = "center"; g.fillStyle = css(C.white); g.fillText("★", 0, -38);
  g.save(); g.translate(-90, -110); g.rotate(-lid * 1.2);
  cel2(g, (c) => rr(c, 0, -22, 190, 24, 10), [100, 160, 110], { lw: 5, sx: 0, sy: -5 });
  g.restore();
  g.restore();
}
// игрушки: kind ball|block|horse
function drawToy(g, kind, x, y, s, rot) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  if (kind === "ball") {
    ell(g, 0, -30, 30, 30); g.fillStyle = css(C.red); g.fill();
    g.save(); ell(g, 0, -30, 30, 30); g.clip(); g.fillStyle = css(C.yellow); g.fillRect(-40, -38, 80, 16); g.restore();
    ell(g, 0, -30, 30, 30); g.lineWidth = 5; g.strokeStyle = css(ink(C.red)); g.stroke();
    ell(g, -10, -42, 8, 5, -0.5); g.fillStyle = "rgba(255,255,255,0.8)"; g.fill();
  } else if (kind === "block") {
    cel2(g, (c) => rr(c, -28, -56, 56, 56, 8), C.yellow, { lw: 5, sx: -6, sy: -6 });
    g.font = "800 36px 'M PLUS Rounded 1c'"; g.textAlign = "center"; g.fillStyle = css(C.hot); g.fillText("А", 0, -16);
  } else {
    // лошадка на колёсиках
    for (const sd of [-1, 1]) { ell(g, sd * 30, -10, 11, 11); g.fillStyle = css(C.text); g.fill(); }
    cel2(g, (c) => rr(c, -48, -30, 96, 14, 6), C.woodD, { lw: 4, sx: 0, sy: -3 });
    cel2(g, (c) => { c.beginPath(); c.moveTo(-38, -30); c.lineTo(-34, -60); c.lineTo(30, -60); c.lineTo(34, -30); c.closePath(); }, [255, 255, 255], { lw: 4, sx: 0, sy: -5 });
    cel2(g, (c) => { c.beginPath(); c.moveTo(22, -56); c.lineTo(36, -100); c.lineTo(62, -96); c.lineTo(58, -80); c.lineTo(40, -76); c.lineTo(36, -56); c.closePath(); }, [255, 255, 255], { lw: 4, sx: 0, sy: -5 });
    g.beginPath(); g.moveTo(34, -100); g.lineTo(18, -74); g.lineTo(26, -60); g.lineWidth = 9; g.strokeStyle = css(C.red); g.stroke();
    ell(g, 46, -88, 3, 3); g.fillStyle = css(C.text); g.fill();
  }
  g.restore();
}
// тень мамы на полу в полосе света (силуэт вытянут к мальчику); arms 0 — руки в боки, 1 — раскрыты
const SHC = document.createElement("canvas"); SHC.width = W; SHC.height = H;
const SHG = SHC.getContext("2d");
function drawMomShadow(g, t, a, arms) {
  if (a <= 0) return;
  const fy = ROOM.floorY, sg = SHG;
  // силуэт рисуется непрозрачным в отдельный холст тем же преобразованием камеры, затем кладётся одним слоем
  sg.setTransform(1, 0, 0, 1, 0, 0); sg.clearRect(0, 0, W, H);
  sg.setTransform(g.getTransform());
  // ширина — вдоль x, рост — от двери вниз-влево к мальчику
  sg.transform(0.42, 0.5, 1.0, -0.46, 1690, fy + 4);
  sg.fillStyle = "rgb(110,60,120)"; sg.strokeStyle = "rgb(110,60,120)"; sg.lineCap = "round"; sg.lineJoin = "round";
  sg.beginPath(); sg.moveTo(-70, 0); sg.lineTo(70, 0); sg.lineTo(34, -210); sg.lineTo(-34, -210); sg.closePath(); sg.fill();
  rr(sg, -36, -290, 72, 90, 30); sg.fill();
  ell(sg, 0, -330, 44, 46); sg.fill(); ell(sg, 0, -384, 24, 22); sg.fill();
  // руки: обе видны — в боки, на «Подойди» раскрываются
  const A = ease(arms);
  for (const sd of [-1, 1]) {
    const sh = [sd * 34, -276];
    const hand = [lerp(sd * 58, sd * 150, A), lerp(-212, -340, A)];
    const el = [lerp(sd * 86, sd * 100, A), lerp(-246, -292, A)];
    sg.beginPath(); sg.moveTo(sh[0], sh[1]); sg.lineTo(el[0], el[1]); sg.lineTo(hand[0], hand[1]); sg.lineWidth = 26; sg.stroke();
    ell(sg, hand[0], hand[1], 18, 18); sg.fill();
  }
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 0.5 * a; g.drawImage(SHC, 0, 0); g.restore();
}

// ---------- Двор ----------
const YARD = { ground: 820, house: [660, 520, 1260, 820], win: [870, 600, 1050, 740], gate: [1420, 820] };
function drawYard(g, t, st) {
  skyGrad(g, -800, -600, 2800, YARD.ground + 10);
  // дальний лес
  for (let k = 0; k < 14; k++) fir(g, -500 + k * 230, YARD.ground - 40, 200 + hash(k) * 120, Math.sin(t * 2 + k) * 16 - 20, [40, 70, 110]);
  windSwirls(g, t, -400, 60, 2800, 600, 9, 0.7, 4);
  // сугробы
  g.beginPath(); g.moveTo(-800, YARD.ground); for (let x = -800; x <= 2800; x += 100) g.lineTo(x, YARD.ground - 16 - Math.sin(x * 0.01) * 14);
  g.lineTo(2800, 1600); g.lineTo(-800, 1600); g.closePath(); g.fillStyle = css(C.snow); g.fill(); g.lineWidth = 5; g.strokeStyle = css(C.snowS); g.stroke();
  // дом
  const [hx0, hy0, hx1, hy1] = YARD.house;
  cel2(g, (c) => c.rect(hx0, hy0, hx1 - hx0, hy1 - hy0), [196, 120, 90], { lw: 6, sx: 14, sy: 0 });
  g.strokeStyle = css(shd([196, 120, 90])); g.lineWidth = 5;
  for (let yy = hy0 + 30; yy < hy1; yy += 40) { g.beginPath(); g.moveTo(hx0, yy); g.lineTo(hx1, yy); g.stroke(); }
  // крыша со снегом
  cel2(g, (c) => { c.beginPath(); c.moveTo(hx0 - 80, hy0 + 10); c.lineTo((hx0 + hx1) / 2, hy0 - 230); c.lineTo(hx1 + 80, hy0 + 10); c.closePath(); }, [150, 80, 110], { lw: 6, sx: 12, sy: 0 });
  g.beginPath(); g.moveTo(hx0 - 96, hy0 + 14); g.lineTo((hx0 + hx1) / 2, hy0 - 250); g.lineTo(hx1 + 96, hy0 + 14);
  for (let k = 0; k <= 10; k++) { const x = hx1 + 96 - k * (hx1 - hx0 + 192) / 10; g.lineTo(x, hy0 + 14 + (k % 2 ? 26 : 8)); }
  g.closePath(); g.fillStyle = css(C.snow); g.fill(); g.lineWidth = 5; g.strokeStyle = css(C.snowS); g.stroke();
  // труба с дымом
  cel2(g, (c) => c.rect(1110, hy0 - 200, 60, 140), [170, 90, 90], { lw: 5, sx: 8, sy: 0 });
  for (let k = 0; k < 4; k++) { const u = (t * 0.6 + k / 4) % 1; ell(g, 1140 - u * 260, hy0 - 220 - u * 120, 20 + u * 30, 16 + u * 22); g.fillStyle = `rgba(230,236,250,${(0.8 * (1 - u)).toFixed(3)})`; g.fill(); }
  // окно с тёплым светом и котом
  const [wx0, wy0, wx1, wy1] = YARD.win;
  const glow = g.createRadialGradient((wx0 + wx1) / 2, (wy0 + wy1) / 2, 20, (wx0 + wx1) / 2, (wy0 + wy1) / 2, 360);
  glow.addColorStop(0, "rgba(255,220,140,0.55)"); glow.addColorStop(1, "rgba(255,220,140,0)");
  g.fillStyle = glow; g.fillRect(wx0 - 400, wy0 - 400, wx1 - wx0 + 800, wy1 - wy0 + 800);
  g.fillStyle = css(C.warm); g.fillRect(wx0, wy0, wx1 - wx0, wy1 - wy0);
  // силуэт кота на подоконнике: уши, голова, спина
  g.fillStyle = css([150, 80, 70]);
  const cx = wx0 + 60, cy = wy1;
  g.beginPath(); g.ellipse(cx, cy - 30, 40, 34, 0, 0, TAU); g.fill();
  g.beginPath(); g.ellipse(cx, cy - 86, 40, 34, 0, 0, TAU); g.fill();
  for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(cx + sd * 34, cy - 100); g.lineTo(cx + sd * 30, cy - 136); g.lineTo(cx + sd * 10, cy - 116); g.closePath(); g.fill(); }
  g.strokeStyle = css(C.white); g.lineWidth = 14;
  g.strokeRect(wx0, wy0, wx1 - wx0, wy1 - wy0);
  g.beginPath(); g.moveTo((wx0 + wx1) / 2, wy0); g.lineTo((wx0 + wx1) / 2, wy1); g.lineWidth = 10; g.stroke();
  // ноты из окна
  for (let k = 0; k < 3; k++) { const u = (t * 0.45 + k / 3) % 1; note(g, wx0 + 90 + u * 120 + Math.sin(u * 6) * 20, wy0 - u * 180, 0.7, Math.sin(u * 5) * 0.3, C.hot, (st.notes ?? 1) * Math.sin(u * Math.PI)); }
  // забор и калитка
  const fy = YARD.ground;
  for (let x = 1300; x < 2400; x += 70) {
    if (x > 1390 && x < 1580) continue;
    cel2(g, (c) => { c.beginPath(); c.moveTo(x - 22, fy + 10); c.lineTo(x - 22, fy - 150); c.lineTo(x, fy - 176); c.lineTo(x + 22, fy - 150); c.lineTo(x + 22, fy + 10); c.closePath(); }, C.wood, { lw: 5, sx: 6, sy: 0 });
  }
  for (let x = -600; x < 560; x += 70) cel2(g, (c) => { c.beginPath(); c.moveTo(x - 22, fy + 10); c.lineTo(x - 22, fy - 150); c.lineTo(x, fy - 176); c.lineTo(x + 22, fy - 150); c.lineTo(x + 22, fy + 10); c.closePath(); }, C.wood, { lw: 5, sx: 6, sy: 0 });
  cel2(g, (c) => c.rect(-620, fy - 120, 1180, 22), C.woodD, { lw: 4, sx: 0, sy: -4 });
  cel2(g, (c) => c.rect(1280, fy - 120, 1120, 22), C.woodD, { lw: 4, sx: 0, sy: -4 });
  // столбы калитки
  for (const x of [1380, 1600]) cel2(g, (c) => rr(c, x - 20, fy - 230, 40, 240, 8), C.woodD, { lw: 5, sx: 6, sy: 0 });
  // калитка мотается на петлях (у левого столба): ширина сжимается
  const gs = Math.sin(t * 5.2) * 0.5 * (st.gate ?? 1) + 0.15;
  const gw = 200 * Math.cos(gs);
  cel2(g, (c) => { c.beginPath(); c.moveTo(1400, fy - 190); c.lineTo(1400 + gw, fy - 190 - Math.sin(gs) * 20); c.lineTo(1400 + gw, fy - Math.sin(gs) * 20); c.lineTo(1400, fy); c.closePath(); }, C.wood, { lw: 5, sx: 6, sy: 0 });
  g.beginPath(); g.moveTo(1400, fy - 20); g.lineTo(1400 + gw, fy - 170 - Math.sin(gs) * 20); g.strokeStyle = css(ink(C.wood)); g.lineWidth = 6; g.stroke();
  // ёлки рядом с домом
  fir(g, 420, fy + 20, 330, Math.sin(t * 2.3) * 30 - 24, [50, 110, 120]);
  fir(g, 1800, fy + 30, 380, Math.sin(t * 2.1 + 1) * 34 - 26, [50, 110, 120]);
  // дух бури
  if (st.storm) drawStorm(g, st.storm[0], st.storm[1], st.storm[2], t, st.stormO || {});
  drawSnow(g, t, 260, -800, -600, 3600, 1800, -520, 300, 6, 11);
}
