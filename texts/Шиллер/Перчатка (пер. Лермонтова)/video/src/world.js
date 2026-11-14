// ---------- Арена: фон рисуется один раз в 2× (небо, трибуны, полог, драпировка; перила, стена с воротами, лестница, песок) ----------
const WS = 2;                          // запас разрешения фона для крупных планов
const GROUND = 800;                    // линия земли на песке
const RAIL = 330;                      // верх перил балкона
const BFLOOR = 398;                    // пол балкона (ноги скрыты перилами)
const GATES = [300, 780, 1260];        // ворота: лев, барсы, тигр
const GATE_TOP = 530, GATE_BOT = 700, GATE_R = 95;
// лестница прижата к стене арены: с балкона вниз до основания стены (GATE_BOT), на песок не выходит
const STAIR = { x0: 1600, y0: BFLOOR, n: 8, run: 37, rise: (GATE_BOT - BFLOOR) / 8 };
const STAIR_END = STAIR.x0 + (STAIR.n - 1) * STAIR.run;   // последний подступенок, дальше — пол
const QB = STAIR.x0 + (STAIR.n - 0.5) * STAIR.run;        // точка у подножия лестницы
const WW = 2240;                       // мир шире кадра: справа место под лестницу и проход рыцаря
const BG_BACK = mkCanvas(WW * WS, H * WS), BG_FRONT = mkCanvas(WW * WS, H * WS);

function lily(c, x, y, s, col) {
  c.save(); c.translate(x, y); c.scale(s, s); c.fillStyle = col;
  c.beginPath(); c.moveTo(0, -14); c.bezierCurveTo(6, -6, 5, 2, 0, 6); c.bezierCurveTo(-5, 2, -6, -6, 0, -14); c.fill();
  c.beginPath(); c.moveTo(-2, 3); c.bezierCurveTo(-10, -4, -16, 0, -12, 6); c.bezierCurveTo(-9, 4, -6, 6, -2, 6); c.fill();
  c.beginPath(); c.moveTo(2, 3); c.bezierCurveTo(10, -4, 16, 0, 12, 6); c.bezierCurveTo(9, 4, 6, 6, 2, 6); c.fill();
  c.fillRect(-7, 6, 14, 3); c.beginPath(); c.moveTo(-3, 9); c.lineTo(3, 9); c.lineTo(0, 15); c.fill();
  c.restore();
}

// высота опоры в точке x: балкон, ступень i (уровень i+1) или пол у стены
function stairLevel(x) { if (x < STAIR.x0) return STAIR.y0; return STAIR.y0 + Math.min(STAIR.n, Math.floor((x - STAIR.x0) / STAIR.run) + 1) * STAIR.rise; }

function buildWorld() {
  const r = mulberry32(7);
  // ===== задний фон =====
  let c = BG_BACK.getContext("2d"); c.scale(WS, WS);
  let g = c.createLinearGradient(0, 0, 0, 520);
  g.addColorStop(0, C.sky1); g.addColorStop(0.55, C.sky2); g.addColorStop(1, C.sky3);
  c.fillStyle = g; c.fillRect(0, 0, WW, 560);
  // солнце и полосы облаков
  const sg = c.createRadialGradient(1760, 250, 10, 1760, 250, 260); sg.addColorStop(0, "rgba(255,240,170,1)"); sg.addColorStop(0.25, "rgba(255,210,120,0.8)"); sg.addColorStop(1, "rgba(255,160,90,0)");
  c.fillStyle = sg; c.fillRect(1400, 0, 520, 520);
  circle(c, 1760, 250, 62); c.fillStyle = C.sun; c.fill();
  c.fillStyle = "rgba(255,190,150,0.35)";
  for (let i = 0; i < 8; i++) { const y = 40 + i * 34 + r() * 10, x = r() * 2000; rrect(c, x, y, 200 + r() * 300, 10, 5); c.fill(); }
  // трибуны по бокам: ряды зрителей
  for (const [x0, x1] of [[0, 250], [1570, WW]]) {
    for (let row = 0; row < 7; row++) {
      const y = 160 + row * 44;
      c.fillStyle = row % 2 ? "#6b5470" : "#7d6683"; c.fillRect(x0, y, x1 - x0, 44);
      c.fillStyle = "rgba(0,0,0,0.18)"; c.fillRect(x0, y + 36, x1 - x0, 8);
      for (let x = x0 + 14 + (row % 2) * 12; x < x1 - 8; x += 26) {
        const cols = ["#d94f5c", "#4f7ad9", "#e8c34a", "#5bb874", "#b06ad9", "#f08a3a"];
        c.fillStyle = cols[Math.floor(r() * cols.length)]; rrect(c, x - 10, y + 14, 20, 24, 6); c.fill();
        c.fillStyle = r() < 0.5 ? "#f2c39b" : "#c98e66"; circle(c, x, y + 10, 8); c.fill();
      }
    }
    c.fillStyle = C.stoneDD; c.fillRect(x0, 140, x1 - x0, 20);
  }
  // полог королевской ложи
  const cx0 = 225, cx1 = 1595;
  for (let x = cx0, i = 0; x < cx1; x += 50, i++) { c.fillStyle = i % 2 ? C.gold : C.red; c.fillRect(x, 58, 50, 70); }
  c.fillStyle = C.ink; c.fillRect(cx0 - 8, 50, cx1 - cx0 + 16, 12);
  for (let x = cx0, i = 0; x < cx1; x += 50, i++) { c.beginPath(); c.arc(x + 25, 128, 25, 0, Math.PI); c.fillStyle = i % 2 ? C.gold : C.red; c.fill(); c.lineWidth = 4; c.strokeStyle = C.ink; c.stroke(); }
  c.lineWidth = 5; c.strokeStyle = C.ink; c.strokeRect(cx0, 58, cx1 - cx0, 70);
  // драпировка за двором
  g = c.createLinearGradient(0, 130, 0, 400); g.addColorStop(0, "#5a0f22"); g.addColorStop(1, "#8f1a33");
  c.fillStyle = g; c.fillRect(240, 128, 1340, 280);
  for (let x = 240; x < 1580; x += 60) { c.fillStyle = "rgba(0,0,0,0.16)"; c.fillRect(x + 36, 128, 18, 280); c.fillStyle = "rgba(255,255,255,0.05)"; c.fillRect(x + 8, 128, 10, 280); }
  for (let y = 170; y < 400; y += 70) for (let x = 270 + ((y / 70) % 2) * 35; x < 1570; x += 70) lily(c, x, y, 0.9, "rgba(255,204,61,0.35)");
  // столбы полога
  for (const x of [240, 1580]) { c.fillStyle = C.gold; c.fillRect(x - 9, 60, 18, 345); c.lineWidth = 4; c.strokeStyle = C.ink; c.strokeRect(x - 9, 60, 18, 345); }

  // ===== передний фон =====
  c = BG_FRONT.getContext("2d"); c.scale(WS, WS);
  // стена арены
  c.fillStyle = C.stone; c.fillRect(0, 440, WW, GATE_BOT - 440 + 4);
  for (let y = 440, row = 0; y < GATE_BOT; y += 44, row++) {
    for (let x = -((row % 2) * 40); x < WW; x += 80) {
      const sh = r() * 0.12; c.fillStyle = `rgba(${r() < 0.5 ? "255,255,255" : "0,0,0"},${sh})`; c.fillRect(x + 3, y + 3, 74, 38);
      c.strokeStyle = C.stoneDD; c.lineWidth = 3; c.strokeRect(x + 1.5, y + 1.5, 77, 41);
    }
  }
  // арки ворот (внутри темно)
  for (const gx of GATES) {
    c.save(); c.beginPath(); c.moveTo(gx - GATE_R, GATE_BOT); c.lineTo(gx - GATE_R, GATE_TOP + GATE_R); c.arc(gx, GATE_TOP + GATE_R, GATE_R, Math.PI, 0); c.lineTo(gx + GATE_R, GATE_BOT); c.closePath();
    const ig = c.createLinearGradient(0, GATE_TOP, 0, GATE_BOT); ig.addColorStop(0, "#0b0610"); ig.addColorStop(1, "#24142c"); c.fillStyle = ig; c.fill(); c.restore();
    // кладка арки
    for (let i = 0; i <= 8; i++) { const a = Math.PI + (i / 8) * Math.PI;
      c.save(); c.translate(gx + Math.cos(a) * (GATE_R + 16), GATE_TOP + GATE_R + Math.sin(a) * (GATE_R + 16)); c.rotate(a + Math.PI / 2);
      c.fillStyle = C.stoneL; c.fillRect(-15, -16, 30, 32); c.lineWidth = 3; c.strokeStyle = C.stoneDD; c.strokeRect(-15, -16, 30, 32); c.restore(); }
    for (const sx of [-1, 1]) { c.fillStyle = C.stoneL; c.fillRect(gx + sx * (GATE_R + 16) - 15, GATE_TOP + GATE_R, 30, GATE_BOT - GATE_TOP - GATE_R); c.lineWidth = 3; c.strokeStyle = C.stoneDD; c.strokeRect(gx + sx * (GATE_R + 16) - 15, GATE_TOP + GATE_R, 30, GATE_BOT - GATE_TOP - GATE_R); }
    // факелы
    for (const sx of [-1, 1]) { const fx = gx + sx * 150; c.fillStyle = C.ink; c.fillRect(fx - 5, 560, 10, 40); c.fillStyle = C.goldD; c.fillRect(fx - 12, 552, 24, 12); }
  }
  // перила и фасад ложи
  c.fillStyle = C.stoneL; c.fillRect(230, RAIL, 1360, 18); c.lineWidth = 4; c.strokeStyle = C.ink; c.strokeRect(230, RAIL, 1360, 18);
  for (let x = 252; x < 1580; x += 34) {
    c.beginPath(); c.moveTo(x - 8, RAIL + 18); c.bezierCurveTo(x - 16, RAIL + 34, x - 4, RAIL + 44, x - 9, RAIL + 66); c.lineTo(x + 9, RAIL + 66); c.bezierCurveTo(x + 4, RAIL + 44, x + 16, RAIL + 34, x + 8, RAIL + 18); c.closePath();
    ink(c, C.stoneL, 3);
  }
  c.fillStyle = C.stone; c.fillRect(220, RAIL + 66, 1380, 64); c.lineWidth = 4; c.strokeStyle = C.ink; c.strokeRect(220, RAIL + 66, 1380, 64);
  c.fillStyle = C.stoneL; c.fillRect(214, RAIL + 62, 1392, 12); c.strokeRect(214, RAIL + 62, 1392, 12);
  for (let x = 300; x < 1560; x += 160) { c.fillStyle = C.goldD; circle(c, x, RAIL + 102, 12); c.fill(); }
  // знамёна между воротами
  for (const bx of [540, 1020]) {
    c.beginPath(); c.moveTo(bx - 46, RAIL + 72); c.lineTo(bx + 46, RAIL + 72); c.lineTo(bx + 46, 548); c.lineTo(bx, 520); c.lineTo(bx - 46, 548); c.closePath(); ink(c, C.blue, 4);
    lily(c, bx, RAIL + 128, 1.6, C.gold); lily(c, bx - 22, RAIL + 168, 0.9, C.gold); lily(c, bx + 22, RAIL + 168, 0.9, C.gold);
    c.fillStyle = C.gold; c.fillRect(bx - 50, RAIL + 66, 100, 10);
  }
  // песок
  g = c.createLinearGradient(0, GATE_BOT, 0, H); g.addColorStop(0, C.sandD); g.addColorStop(0.12, C.sand); g.addColorStop(1, C.sandL);
  c.fillStyle = g; c.fillRect(0, GATE_BOT, WW, H - GATE_BOT);
  c.fillStyle = "rgba(60,20,40,0.28)"; c.fillRect(0, GATE_BOT, WW, 14);
  c.strokeStyle = "rgba(150,90,40,0.22)"; c.lineWidth = 3;
  for (let i = -12; i <= 16; i++) { c.beginPath(); c.moveTo(960 + i * 60, GATE_BOT); c.lineTo(960 + i * 220, H); c.stroke(); }
  for (let i = 0; i < 160; i++) { c.fillStyle = r() < 0.5 ? "rgba(160,100,50,0.35)" : "rgba(255,240,200,0.5)"; ellipse(c, r() * WW, GATE_BOT + 20 + r() * (H - GATE_BOT), 3 + r() * 5, 1.5 + r() * 2); c.fill(); }
  // лестница с балкона вдоль стены: каменный массив под ступенями до основания стены
  const S = STAIR, sx0 = S.x0 - 8;
  const stairPath = () => { c.beginPath(); c.moveTo(sx0, S.y0);
    for (let i = 0; i < S.n; i++) { const x = S.x0 + i * S.run; c.lineTo(x, S.y0 + i * S.rise); c.lineTo(x, S.y0 + (i + 1) * S.rise); }
    c.lineTo(STAIR_END, GATE_BOT); c.lineTo(sx0, GATE_BOT); c.closePath(); };
  stairPath(); c.fillStyle = C.stoneD; c.fill();
  c.save(); stairPath(); c.clip();
  for (let y = S.y0, row = 0; y < GATE_BOT; y += 34, row++) for (let x = sx0 - (row % 2) * 30; x < STAIR_END + S.run; x += 60) {
    c.fillStyle = `rgba(${r() < 0.5 ? "255,255,255" : "0,0,0"},${r() * 0.1})`; c.fillRect(x + 2, y + 2, 56, 30);
    c.strokeStyle = C.stoneDD; c.lineWidth = 2.5; c.strokeRect(x + 1, y + 1, 58, 32); }
  c.restore();
  stairPath(); c.lineWidth = 5; c.strokeStyle = C.ink; c.lineJoin = "round"; c.stroke();
  // каменные плиты ступеней с выступающим краем
  for (let i = 0; i < S.n - 1; i++) { const x = S.x0 + i * S.run, y = S.y0 + (i + 1) * S.rise; rrect(c, x - 2, y - 2, S.run + 6, 10, 3); ink(c, C.stoneL, 3); }
  rrect(c, sx0 - 4, S.y0 - 2, S.x0 - sx0 + 10, 10, 3); ink(c, C.stoneL, 3);
  // тень у основания на песке
  c.fillStyle = "rgba(60,20,40,0.25)"; c.fillRect(sx0, GATE_BOT, STAIR_END - sx0 + 10, 12);
  // перила вдоль ступеней
  const rx0 = S.x0 - 4, ry0 = S.y0 - 64, rx1 = STAIR_END + 6, ry1 = GATE_BOT - 64;
  stroke2(c, [[rx0, ry0], [rx1, ry1]], 9, C.goldD, 4);
  for (let i = 0; i < S.n; i += 2) { const x = S.x0 + i * S.run + 12, y = S.y0 + (i + 1) * S.rise; stroke2(c, [[x, y - 2], [x, lerp(ry0, ry1, (x - rx0) / (rx1 - rx0))]], 5, C.goldD, 3); }
}

// решётка ворот: open 0 — закрыта, 1 — поднята
function gate(c, gx, open, t) {
  c.save(); c.beginPath(); c.moveTo(gx - GATE_R, GATE_BOT); c.lineTo(gx - GATE_R, GATE_TOP + GATE_R); c.arc(gx, GATE_TOP + GATE_R, GATE_R, Math.PI, 0); c.lineTo(gx + GATE_R, GATE_BOT); c.closePath(); c.clip();
  const dy = -open * (GATE_BOT - GATE_TOP + 10);
  for (let x = gx - GATE_R + 12; x < gx + GATE_R; x += 24) line(c, [[x, GATE_TOP - 10 + dy], [x, GATE_BOT + dy]], 7, "#2b2633", "butt");
  for (let y = GATE_TOP + 30; y < GATE_BOT; y += 40) line(c, [[gx - GATE_R, y + dy], [gx + GATE_R, y + dy]], 7, "#2b2633", "butt");
  for (let x = gx - GATE_R + 12; x < gx + GATE_R; x += 24) { c.fillStyle = "#4b4553"; c.beginPath(); c.moveTo(x - 5, GATE_BOT + dy); c.lineTo(x + 5, GATE_BOT + dy); c.lineTo(x, GATE_BOT + 14 + dy); c.fill(); }
  c.restore();
}
// глаза в темноте за решёткой
function gateEyes(c, gx, k, t, col = "#ffd84a") {
  if (k <= 0) return;
  const bl = ((t * 0.9 + gx * 0.01) % 2.7) < 0.12 ? 0.15 : 1;
  c.save(); c.globalAlpha = k; c.fillStyle = col; c.shadowColor = col; c.shadowBlur = 18;
  for (const sx of [-1, 1]) { ellipse(c, gx + sx * 22 + Math.sin(t * 0.8 + gx) * 8, 640, 10, 6 * bl, sx * 0.25); c.fill(); }
  c.restore();
}
// пламя факелов
function torches(c, t) {
  for (const gx of GATES) for (const sx of [-1, 1]) {
    const fx = gx + sx * 150, f = 1 + 0.15 * wob(t, 13, fx);
    c.save(); c.translate(fx, 552); c.scale(1, f);
    c.beginPath(); c.moveTo(-11, 0); c.bezierCurveTo(-14, -18, -2, -26, 0, -40); c.bezierCurveTo(4, -26, 14, -18, 11, 0); c.closePath();
    c.fillStyle = "#ff7a1a"; c.fill(); c.beginPath(); c.moveTo(-6, 0); c.bezierCurveTo(-7, -10, -1, -16, 0, -24); c.bezierCurveTo(2, -16, 7, -10, 6, 0); c.fillStyle = "#ffe36a"; c.fill();
    c.restore();
  }
}
