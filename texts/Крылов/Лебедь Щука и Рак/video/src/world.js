// ---------- Арена: небо, трибуны, луг, дорожка, пруд (статичный фон в мировых координатах) ----------
// Мир шире кадра, чтобы камера могла двигаться: x −200..2120, y −300..1080
const WX0 = -450, WY0 = -300, WW = 2950, WH = 1380;
const POND = { x: 1640, y: 742, rx: 360, ry: 92 };
const GROUND = 730; // линия колёс воза
const CARTX = 860;

const arenaC = mkCanvas(WW, WH);
function buildArena() {
  const c = arenaC.getContext("2d"), r = mulberry32(5);
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, WW, WH);
  c.translate(-WX0, -WY0);
  // небо
  let g = c.createLinearGradient(0, WY0, 0, 520); g.addColorStop(0, "#2f86dc"); g.addColorStop(0.6, "#7cc4f4"); g.addColorStop(1, "#cdeeff");
  c.fillStyle = g; c.fillRect(WX0, WY0, WW, 900);
  // дальние холмы
  c.fillStyle = "#9fd77a"; c.beginPath(); c.moveTo(WX0, 470);
  for (let x = WX0; x <= WX0 + WW; x += 40) c.lineTo(x, 450 - 30 * Math.sin(x * 0.004) - 16 * Math.sin(x * 0.011 + 1)); c.lineTo(WX0 + WW, 600); c.lineTo(WX0, 600); c.fill();
  // трибуны
  const TY = 418;
  c.fillStyle = "#24407e"; c.fillRect(WX0, TY, WW, 112);
  c.fillStyle = "#1a2f5f"; for (let i = 0; i < 4; i++) c.fillRect(WX0, TY + 18 + i * 24, WW, 4);
  const crowd = ["#ffd21f", "#e8322b", "#ffffff", "#2a6fdb", "#ff8a1e", "#7fd35a", "#f2b9c9"];
  for (let row = 0; row < 4; row++) for (let x = WX0 + (row % 2) * 9; x < WX0 + WW; x += 18) {
    const y = TY + 10 + row * 24 + r() * 3;
    c.fillStyle = crowd[Math.floor(r() * crowd.length)]; c.beginPath(); c.arc(x + r() * 4, y, 6.5, 0, TAU); c.fill();
    c.fillStyle = "rgba(255,226,190,0.95)"; c.beginPath(); c.arc(x + r() * 4, y - 9, 4.5, 0, TAU); c.fill();
  }
  // рекламный борт
  c.fillStyle = C.navy; c.fillRect(WX0, 520, WW, 38);
  const boards = ["КУБОК ЛЕСА", "ВОЗ-2026", "КУБОК ЛЕСА", "ВОЗ-2026", "КУБОК ЛЕСА", "ВОЗ-2026", "КУБОК ЛЕСА", "ВОЗ-2026"];
  boards.forEach((b, i) => {
    const x = WX0 + 40 + i * 400; c.fillStyle = i % 2 ? C.yellow : C.red; c.fillRect(x, 524, 360, 30);
    c.fillStyle = i % 2 ? C.navy : "#fff"; c.font = `700 24px "Narrow", "PT Sans Narrow", sans-serif`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(b, x + 180, 540);
  });
  // луг
  g = c.createLinearGradient(0, 558, 0, 1080); g.addColorStop(0, "#86d25c"); g.addColorStop(1, "#3f9a35");
  c.fillStyle = g; c.fillRect(WX0, 558, WW, 1080 - 558 + 10);
  for (let i = 0; i < 520; i++) { const x = WX0 + r() * WW, y = 570 + r() * 520; c.strokeStyle = r() > 0.5 ? "rgba(40,110,30,0.35)" : "rgba(200,240,150,0.35)"; c.lineWidth = 3; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (r() - 0.5) * 8, y - 10 - r() * 10); c.stroke(); }
  // дорожка
  c.fillStyle = C.track; c.beginPath(); c.moveTo(WX0, 655); c.lineTo(WX0 + WW, 655); c.lineTo(WX0 + WW, 790); c.lineTo(WX0, 790); c.fill();
  c.fillStyle = C.trackD; c.fillRect(WX0, 650, WW, 8); c.fillRect(WX0, 788, WW, 6);
  for (let i = 0; i < 160; i++) { c.fillStyle = "rgba(120,80,40,0.25)"; c.beginPath(); c.ellipse(WX0 + r() * WW, 665 + r() * 120, 3 + r() * 6, 2 + r() * 2, 0, 0, TAU); c.fill(); }
  // стартовая линия (шашечки) под возом
  for (let i = 0; i < 9; i++) for (let j = 0; j < 2; j++) { c.fillStyle = (i + j) % 2 ? C.ink : "#fff"; c.fillRect(CARTX - 18 + j * 18, 658 + i * 14.6, 18, 14.6); }
  c.fillStyle = "#fff"; c.font = `700 30px "Narrow", "PT Sans Narrow", sans-serif`; c.textAlign = "center"; c.fillText("СТАРТ", CARTX, 818);
  // пруд
  c.save(); c.beginPath(); c.ellipse(POND.x, POND.y, POND.rx + 14, POND.ry + 12, 0, 0, TAU); c.fillStyle = "#c9a15e"; c.fill();
  g = c.createLinearGradient(0, POND.y - POND.ry, 0, POND.y + POND.ry); g.addColorStop(0, "#58b4f0"); g.addColorStop(1, C.water2);
  c.beginPath(); c.ellipse(POND.x, POND.y, POND.rx, POND.ry, 0, 0, TAU); c.fillStyle = g; c.fill(); c.lineWidth = 5; c.strokeStyle = C.ink; c.stroke();
  c.restore();
  // камыши
  for (const [x, y, k] of [[1300, 715, 1], [1325, 722, 0.8], [1960, 720, 1], [1985, 728, 0.9], [1940, 732, 0.7]]) reed(c, x, y, k);
  // флажки на трибунах
  for (let i = 0; i < 11; i++) { const x = WX0 + 120 + i * 270; c.strokeStyle = "#ccc"; c.lineWidth = 4; c.beginPath(); c.moveTo(x, TY); c.lineTo(x, TY - 70); c.stroke(); }
}
buildArena();
function reed(c, x, y, k) {
  c.save(); c.translate(x, y); c.scale(k, k); c.strokeStyle = "#3d7a2a"; c.lineWidth = 6; c.lineCap = "round";
  for (const a of [-0.2, 0, 0.18]) { c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(a * 60, -60, a * 90, -120); c.stroke(); }
  c.fillStyle = "#6b3f1c"; c.beginPath(); c.ellipse(0, -112, 7, 22, 0, 0, TAU); c.fill(); c.restore();
}
// флажки колышутся
function flags(c, t) {
  const cols = [C.red, C.yellow, C.swan, C.yellow, C.red, C.pike, C.red, C.yellow, C.swan];
  for (let i = 0; i < 11; i++) {
    const x = WX0 + 120 + i * 270, y = 418 - 70;
    c.fillStyle = cols[i % cols.length]; c.beginPath(); c.moveTo(x, y);
    for (let k = 0; k <= 6; k++) c.lineTo(x + k * 9, y + Math.sin(t * 6 + i + k * 0.7) * 4 * (k / 6));
    for (let k = 6; k >= 0; k--) c.lineTo(x + k * 9, y + 30 + Math.sin(t * 6 + i + k * 0.7) * 4 * (k / 6) - k * 1.5);
    c.closePath(); c.fill();
  }
}
// облака плывут
const CLOUDS = [[200, 90, 1.2], [760, 40, 0.9], [1250, 120, 1.4], [1700, 60, 1], [2100, 150, 0.8], [-150, 170, 1]];
function clouds(c, t) {
  c.save();
  for (const [x0, y, k] of CLOUDS) {
    const x = WX0 + ((x0 - WX0 + t * 14 * k) % (WW + 300)) - 150;
    c.save(); c.translate(x, y); c.scale(k * 2.2, k * 2.2);
    c.fillStyle = "rgba(255,255,255,0.95)"; c.beginPath(); c.arc(-30, 8, 22, 0, TAU); c.arc(0, -6, 30, 0, TAU); c.arc(32, 6, 22, 0, TAU); c.arc(8, 14, 22, 0, TAU); c.fill();
    c.restore();
  }
  c.restore();
}
// рябь на пруду
function pondRipples(c, t) {
  c.save(); c.beginPath(); c.ellipse(POND.x, POND.y, POND.rx - 4, POND.ry - 4, 0, 0, TAU); c.clip();
  c.strokeStyle = "rgba(255,255,255,0.55)"; c.lineWidth = 4; c.lineCap = "round";
  for (let i = 0; i < 7; i++) {
    const x = POND.x - 260 + i * 85 + Math.sin(t * 0.8 + i) * 18, y = POND.y - 50 + (i % 3) * 38;
    c.beginPath(); c.moveTo(x - 26, y); c.quadraticCurveTo(x, y - 7, x + 26, y); c.stroke();
  }
  c.restore();
}
// вода поверх нижней части щуки
function pondFront(c, t, alpha = 0.78) {
  c.save(); c.beginPath(); c.ellipse(POND.x, POND.y, POND.rx, POND.ry, 0, 0, TAU); c.clip();
  c.fillStyle = `rgba(28,102,176,${alpha})`;
  c.beginPath(); c.moveTo(POND.x - POND.rx, POND.y - 6);
  for (let x = POND.x - POND.rx; x <= POND.x + POND.rx; x += 20) c.lineTo(x, POND.y - 6 + Math.sin(x * 0.03 + t * 4) * 5);
  c.lineTo(POND.x + POND.rx, POND.y + POND.ry); c.lineTo(POND.x - POND.rx, POND.y + POND.ry); c.closePath(); c.fill();
  c.restore();
}

// ---------- Студия: фон для предматчевой аналитики и заставки ----------
function studioBg(c, t) {
  const g = c.createRadialGradient(960, 480, 100, 960, 540, 1150); g.addColorStop(0, "#21468f"); g.addColorStop(1, "#060f26");
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.save(); c.globalAlpha = 0.12; c.fillStyle = "#fff";
  for (let i = 0; i < 7; i++) { const x = -400 + i * 380 + ((t * 40) % 380); slant(c, x, 0, 120, H, 300); c.fill(); }
  c.restore();
}
// тактическая доска
const BOARD = { x: 420, y: 110, w: 1080, h: 640, cx: 960, cy: 430 };
const boardC = mkCanvas(BOARD.w + 40, BOARD.h + 40);
{
  const c = boardC.getContext("2d"), r = mulberry32(21);
  c.translate(20, 20);
  c.beginPath(); c.roundRect(0, 0, BOARD.w, BOARD.h, 18); c.fillStyle = "#7a4a22"; c.fill(); c.lineWidth = 6; c.strokeStyle = C.ink; c.stroke();
  c.beginPath(); c.roundRect(22, 22, BOARD.w - 44, BOARD.h - 44, 8); c.fillStyle = "#1f5a3a"; c.fill();
  for (let i = 0; i < 1400; i++) { c.fillStyle = `rgba(255,255,255,${0.02 + r() * 0.04})`; c.fillRect(22 + r() * (BOARD.w - 44), 22 + r() * (BOARD.h - 44), 2 + r() * 10, 1.5); }
  c.strokeStyle = "rgba(255,255,255,0.22)"; c.lineWidth = 4;
  c.strokeRect(60, 60, BOARD.w - 120, BOARD.h - 120);
  c.beginPath(); c.moveTo(BOARD.w / 2, 60); c.lineTo(BOARD.w / 2, BOARD.h - 60); c.stroke();
  c.beginPath(); c.arc(BOARD.w / 2, BOARD.h / 2, 90, 0, TAU); c.stroke();
  c.strokeRect(60, BOARD.h / 2 - 140, 130, 280); c.strokeRect(BOARD.w - 190, BOARD.h / 2 - 140, 130, 280);
}
// фишка героя на доске
function chip(c, x, y, who, k = 1, shake = 0) {
  if (k <= 0) return;
  c.save(); c.translate(x + shake, y); c.scale(k, k);
  c.beginPath(); c.arc(0, 0, 70, 0, TAU); ink(c, who === "swan" ? C.swan : who === "rak" ? C.rak : C.pike, 6, "#fff");
  c.save(); c.beginPath(); c.arc(0, 0, 64, 0, TAU); c.clip();
  if (who === "swan") swan(c, -14, 46, 0.42, { flap: 0.2 });
  else if (who === "rak") rak(c, -40, 14, 0.58, { claw: 0.5 });
  else pike(c, -78, 6, 0.55, { tail: 0.4, mouth: 0.5 });
  c.restore(); c.restore();
}
// меловая линия с дрожью: путь из точек, видна доля u
function chalkPath(c, pts, u, lw = 9) {
  if (u <= 0) return;
  const n = Math.max(2, Math.floor(pts.length * u));
  c.save(); c.lineCap = "round"; c.lineJoin = "round";
  for (const [a, dx, dy] of [[0.85, 0, 0], [0.35, 2, -1.5]]) {
    c.strokeStyle = `rgba(245,245,235,${a})`; c.lineWidth = lw; c.beginPath();
    for (let i = 0; i < n; i++) { const [x, y] = pts[i]; if (i) c.lineTo(x + dx, y + dy); else c.moveTo(x + dx, y + dy); }
    c.stroke();
  }
  c.restore();
}
function chalkArrow(c, x0, y0, x1, y1, u) {
  if (u <= 0) return;
  const pts = []; for (let i = 0; i <= 30; i++) { const q = i / 30; pts.push([lerp(x0, x1, q) + Math.sin(q * 9) * 3, lerp(y0, y1, q) + Math.cos(q * 7) * 3]); }
  chalkPath(c, pts, u);
  if (u >= 0.98) { const a = Math.atan2(y1 - y0, x1 - x0);
    chalkPath(c, [[x1 - Math.cos(a - 0.5) * 40, y1 - Math.sin(a - 0.5) * 40], [x1, y1], [x1 - Math.cos(a + 0.5) * 40, y1 - Math.sin(a + 0.5) * 40]], 1); }
}
