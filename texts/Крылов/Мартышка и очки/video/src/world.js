// ---------- Комната блогера и интерфейс стрима ----------
const RW = 1320, RH = 740;                 // кадр «вебкамеры»
const SX = 60, SY = 50;                     // где окно эфира на экране
const CHX = 1410, CHY = 50, CHW = 450, CHH = 740; // колонка чата
let ROOM_BG = null;

function buildWorld() {
  // статичный фон комнаты: стена, полка, неон, растение — рисуется один раз
  ROOM_BG = mkCanvas(RW * 2, RH * 2);
  const c = ROOM_BG.getContext("2d");
  c.scale(2, 2);
  const g = c.createLinearGradient(0, 0, 0, RH);
  g.addColorStop(0, "#3a2a72"); g.addColorStop(1, "#5b3d9a");
  c.fillStyle = g; c.fillRect(0, 0, RW, RH);
  // обои: ромбики
  c.save(); c.globalAlpha = 0.08; c.fillStyle = "#fff";
  for (let y = 20; y < RH; y += 60) for (let x = (y / 60) % 2 ? 30 : 0; x < RW; x += 60) { c.beginPath(); c.moveTo(x, y - 8); c.lineTo(x + 8, y); c.lineTo(x, y + 8); c.lineTo(x - 8, y); c.fill(); }
  c.restore();
  // неоновая полоса
  c.save(); c.shadowColor = "#ff2e88"; c.shadowBlur = 30; c.fillStyle = "#ff5aa5"; rrect(c, 80, 96, 1160, 10, 5); c.fill(); c.restore();
  // картина: джунгли в раме слева
  rrect(c, 120, 170, 250, 190, 10); ink(c, "#7a4a24", 8);
  c.save(); rrect(c, 136, 186, 218, 158, 4); c.clip();
  const g2 = c.createLinearGradient(0, 186, 0, 344); g2.addColorStop(0, "#ffb347"); g2.addColorStop(1, "#ff7a59"); c.fillStyle = g2; c.fillRect(136, 186, 218, 158);
  circle(c, 300, 236, 26); c.fillStyle = "#fff1b0"; c.fill();
  for (const [px, ph, col] of [[160, 120, "#2c7c39"], [220, 90, "#47a84a"], [290, 130, "#2c7c39"], [340, 80, "#47a84a"]]) {
    c.beginPath(); c.moveTo(px, 344); c.quadraticCurveTo(px + 6, 344 - ph * 0.6, px - 4, 344 - ph); c.lineWidth = 8; c.strokeStyle = "#5e3519"; c.stroke();
    for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k - 2) * 0.55; ellipse(c, px - 4 + Math.cos(a) * 26, 344 - ph + Math.sin(a) * 18, 30, 10, a); c.fillStyle = col; c.fill(); }
  }
  c.restore();
  // полка справа с бананами и кубком
  rrect(c, 930, 300, 300, 18, 6); ink(c, "#93582a", 5);
  for (let i = 0; i < 4; i++) banana(c, 980 + i * 30, 286 - (i % 2) * 6, 0.9, -0.3 + i * 0.2);
  c.save(); c.translate(1150, 300);
  c.beginPath(); c.moveTo(-26, -70); c.lineTo(26, -70); c.quadraticCurveTo(24, -34, 0, -28); c.quadraticCurveTo(-24, -34, -26, -70); ink(c, MC.gold, 5);
  rrect(c, -8, -30, 16, 18, 3); ink(c, MC.goldD, 4); rrect(c, -24, -14, 48, 14, 4); ink(c, MC.goldD, 4); c.restore();
  // растение в горшке слева внизу
  c.save(); c.translate(200, 560);
  for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (k - 3) * 0.32; c.beginPath(); c.moveTo(0, -40); c.quadraticCurveTo(Math.cos(a) * 80, -40 + Math.sin(a) * 120, Math.cos(a) * 130, -40 + Math.sin(a) * 160); c.lineWidth = 16; c.strokeStyle = k % 2 ? "#2f8a3e" : "#46a84c"; c.lineCap = "round"; c.stroke(); }
  rrect(c, -50, -50, 100, 70, 12); ink(c, "#e0703c", 5); c.restore();
  // кольцевая лампа (свет на героя)
  c.save(); c.globalAlpha = 0.5; const rg = c.createRadialGradient(660, 330, 40, 660, 330, 420); rg.addColorStop(0, "rgba(255,240,220,0.55)"); rg.addColorStop(1, "rgba(255,240,220,0)"); c.fillStyle = rg; c.fillRect(0, 0, RW, RH); c.restore();
}

// стол на переднем плане (рисуется поверх героя)
function desk(c) {
  c.fillStyle = "#b8743c"; c.fillRect(-200, 600, RW + 400, 30);
  c.fillStyle = "#8d5428"; c.fillRect(-200, 630, RW + 400, 200);
  c.strokeStyle = C.ink; c.lineWidth = 6; c.beginPath(); c.moveTo(-200, 600); c.lineTo(RW + 200, 600); c.moveTo(-200, 630); c.lineTo(RW + 200, 630); c.stroke();
  c.fillStyle = "rgba(255,255,255,0.12)"; c.fillRect(-200, 603, RW + 400, 8);
}

// ---------- интерфейс (координаты экрана 1920×1080) ----------
function streamFrame(c, t) {
  // рамка окна эфира
  c.save(); rrect(c, SX - 6, SY - 6, RW + 12, RH + 12, 26); c.lineWidth = 6; c.strokeStyle = "#ff2e88"; c.shadowColor = "#ff2e88"; c.shadowBlur = 24; c.stroke(); c.restore();
}
function liveBadge(c, t, k, viewers, replay) {
  if (k <= 0) return;
  c.save(); c.globalAlpha = k; c.translate(SX + 28, SY + 26);
  const s = springPop(k); c.scale(s, s);
  rrect(c, 0, 0, replay ? 178 : 186, 54, 14); ink(c, replay ? "#5a3c9e" : "#ef2b2b", 0);
  if (replay) { // значок перемотки
    c.fillStyle = "#fff"; c.beginPath(); c.moveTo(40, 14); c.lineTo(22, 27); c.lineTo(40, 40); c.fill(); c.beginPath(); c.moveTo(58, 14); c.lineTo(40, 27); c.lineTo(58, 40); c.fill();
  } else { circle(c, 28, 27, 10); c.fillStyle = Math.sin(t * 6) > -0.3 ? "#fff" : "rgba(255,255,255,0.4)"; c.fill(); }
  font(c, 34, F_NARROW, "700"); c.fillStyle = "#fff"; c.textBaseline = "middle"; c.fillText(replay ? "ПОВТОР" : "В ЭФИРЕ", replay ? 68 : 48, 28);
  // зрители
  rrect(c, (replay ? 178 : 186) + 12, 0, 170, 54, 14); c.fillStyle = "rgba(10,6,30,0.72)"; c.fill();
  const ex = (replay ? 178 : 186) + 40; ellipse(c, ex, 27, 16, 10); c.lineWidth = 4; c.strokeStyle = "#fff"; c.stroke(); circle(c, ex, 27, 5); c.fillStyle = "#fff"; c.fill();
  c.fillStyle = "#fff"; c.fillText(fmtNum(viewers), ex + 26, 28);
  c.restore();
}
function fmtNum(n) { return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " "); }

function likesBadge(c, t, k, likes, pulse) {
  if (k <= 0) return;
  c.save(); c.globalAlpha = k; c.translate(SX + RW - 230, SY + 26);
  rrect(c, 0, 0, 200, 54, 14); c.fillStyle = "rgba(10,6,30,0.72)"; c.fill();
  heart(c, 36, 28, 18 * (1 + 0.25 * pulse), "#ff2e88");
  font(c, 34, F_NARROW, "700"); c.fillStyle = "#fff"; c.textBaseline = "middle"; c.fillText(fmtNum(likes), 66, 28);
  c.restore();
}

// плашка-событие поверх эфира: попытки, донаты, штампы
function pill(c, x, y, text, bg, k, opt = {}) {
  if (k <= 0) return;
  c.save(); font(c, opt.size || 40, opt.fam || F_NARROW, "700");
  const w = c.measureText(text).width + (opt.icon ? 104 : 44), h = (opt.size || 40) + 26;
  c.translate(x, y); c.rotate(opt.rot || 0); const s = springPop(k) * (opt.scale || 1); c.scale(s, s); c.globalAlpha = Math.min(1, k * 4) * (opt.alpha ?? 1);
  rrect(c, -w / 2, -h / 2, w, h, 16); ink(c, bg, 5);
  c.fillStyle = opt.color || "#fff"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(text, opt.icon ? 28 : 0, 2);
  if (opt.icon) opt.icon(c, -w / 2 + 42, 0);
  c.restore();
}
// красный крест «не то»
function bigX(c, x, y, r, k) {
  if (k <= 0) return;
  c.save(); c.translate(x, y); const s = springPop(k); c.scale(s, s); c.rotate(-0.1);
  c.lineCap = "round";
  for (const [lw, col] of [[r * 0.42, C.ink], [r * 0.3, "#ef2b2b"]]) { c.beginPath(); c.moveTo(-r, -r); c.lineTo(r, r); c.moveTo(r, -r); c.lineTo(-r, r); c.lineWidth = lw; c.strokeStyle = col; c.stroke(); }
  c.restore();
}
// штамп с текстом в рамке
function stamp(c, x, y, text, col, k, rot = -0.14, size = 92) {
  if (k <= 0) return;
  c.save(); c.translate(x, y); c.rotate(rot);
  const s = lerp(2.4, 1, sstep(k * 1.6)); c.scale(s, s); c.globalAlpha = Math.min(1, k * 3);
  font(c, size, F_NUM); const w = c.measureText(text).width + 60, h = size + 30;
  rrect(c, -w / 2, -h / 2, w, h, 12); c.lineWidth = 10; c.strokeStyle = col; c.stroke();
  c.fillStyle = col; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(text, 0, 4);
  c.restore();
}

// ---------- чат ----------
const CHAT_COLORS = ["#22d3ee", "#ffd21f", "#3fd46b", "#ff8a3d", "#c08bff", "#ff5aa5"];
function chatPanel(c, t, msgs, k, pinned) {
  if (k <= 0) return;
  c.save(); c.globalAlpha = k;
  rrect(c, CHX, CHY, CHW, CHH, 22); c.fillStyle = "rgba(14,10,36,0.92)"; c.fill(); c.lineWidth = 3; c.strokeStyle = "rgba(255,255,255,0.14)"; c.stroke();
  font(c, 34, F_NARROW, "700"); c.fillStyle = "#fff"; c.textBaseline = "middle"; c.fillText("ЧАТ ЭФИРА", CHX + 28, CHY + 42);
  c.fillStyle = "rgba(255,255,255,0.14)"; c.fillRect(CHX + 20, CHY + 78, CHW - 40, 3);
  // сообщения: новые снизу, старые уезжают вверх
  const top = CHY + 84 + 140 * clamp(pinned * 5, 0, 1); // закреплённая мораль сдвигает ленту вниз
  c.save(); c.beginPath(); c.rect(CHX, top, CHW, CHY + CHH - top); c.clip();
  let y = CHY + CHH - 30; const LH = 84;
  const vis = msgs.filter((m) => t >= m.t);
  for (let i = vis.length - 1; i >= 0; i--) {
    const m = vis[i], u = springSnap(prog(t, m.t, m.t + 0.6));
    const yy = y - (i === vis.length - 1 ? 0 : 0);
    const dx = (1 - u) * 160;
    // сдвиг: каждое следующее сообщение поднимает старые
    let off = 0; for (let j = i + 1; j < vis.length; j++) off += LH * springSnap(prog(t, vis[j].t, vis[j].t + 0.45));
    const py = yy - off;
    if (py < top - 40) break;
    c.save(); c.globalAlpha = Math.min(1, u * 3) * k; c.translate(dx, 0);
    const big = m.big ? 1.12 : 1;
    circle(c, CHX + 46, py - 18, 20); c.fillStyle = m.col; c.fill();
    font(c, 26, F_NARROW, "700"); c.fillStyle = m.col; c.textBaseline = "middle"; c.fillText(m.name, CHX + 78, py - 32);
    font(c, Math.round(32 * big), F_SANS, "italic 700"); c.fillStyle = "#fff"; c.fillText(m.text, CHX + 78, py + 2);
    c.restore();
  }
  c.restore();
  // закреплённый комментарий автора (мораль)
  if (pinned > 0) {
    c.save(); const s = springSnap(pinned); c.globalAlpha = Math.min(1, pinned * 3); c.translate(0, (1 - s) * -60);
    rrect(c, CHX + 16, CHY + 94, CHW - 32, 118, 16); ink(c, "#ffd21f", 4);
    // булавка
    c.save(); c.translate(CHX + 54, CHY + 132); c.rotate(0.6); circle(c, 0, -10, 12); ink(c, "#ef2b2b", 3); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 22); c.lineWidth = 4; c.strokeStyle = C.ink; c.stroke(); c.restore();
    font(c, 26, F_NARROW, "700"); c.fillStyle = "#5a3c00"; c.textBaseline = "middle"; c.fillText("ЗАКРЕПЛЕНО · АВТОР", CHX + 84, CHY + 124);
    font(c, 50, F_NUM); c.fillStyle = C.ink; c.fillText("МОРАЛЬ", CHX + 84, CHY + 174);
    c.restore();
  }
  c.restore();
}

// нижняя полоса канала
function channelBar(c, t, k, subs) {
  if (k <= 0) return;
  c.save(); c.globalAlpha = k;
  const y = 992;
  circle(c, 96, y + 26, 26); ink(c, MC.fur, 3); circle(c, 96, y + 30, 15); c.fillStyle = MC.face; c.fill();
  font(c, 34, F_NARROW, "700"); c.fillStyle = "#fff"; c.textBaseline = "middle"; c.fillText("Мартышкин обзор", 136, y + 14);
  font(c, 26, F_NARROW, "700"); c.fillStyle = "rgba(255,255,255,0.6)"; c.fillText(fmtNum(subs) + " подписчиков", 136, y + 44);
  rrect(c, 420, y + 4, 196, 46, 23); c.fillStyle = "#ff2e88"; c.fill(); font(c, 28, F_NARROW, "700"); c.fillStyle = "#fff"; c.textAlign = "center"; c.fillText("ПОДПИСАТЬСЯ", 518, y + 28);
  c.restore();
}

// шкала «зрение»
function visionMeter(c, t, k, v) {
  if (k <= 0) return;
  c.save(); c.globalAlpha = Math.min(1, k * 2); c.translate(SX + 40 - (1 - springSnap(k)) * 300, SY + 150);
  rrect(c, 0, 0, 90, 380, 18); c.fillStyle = "rgba(10,6,30,0.78)"; c.fill();
  // глаз
  ellipse(c, 45, 40, 26, 16); c.lineWidth = 5; c.strokeStyle = "#fff"; c.stroke(); circle(c, 45, 40, 8); c.fillStyle = "#fff"; c.fill();
  rrect(c, 25, 80, 40, 260, 12); c.fillStyle = "rgba(255,255,255,0.12)"; c.fill();
  const h = 260 * clamp(v, 0, 1);
  rrect(c, 25, 340 - h, 40, Math.max(0.1, h), 12); c.fillStyle = v < 0.2 ? "#ef2b2b" : "#3fd46b"; c.fill();
  font(c, 30, F_NARROW, "700"); c.fillStyle = "#fff"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(Math.round(v * 100) + "%", 45, 362);
  c.restore();
}

// рейтинг звёздами
function rating(c, x, y, k, filled) {
  if (k <= 0) return;
  c.save(); c.translate(x, y);
  for (let i = 0; i < 5; i++) {
    const u = prog(k, i * 0.12, i * 0.12 + 0.5); if (u <= 0) continue;
    const s = springPop(u); c.save(); c.translate((i - 2) * 96, 0); c.scale(s, s);
    star5(c, 0, 0, 42, i < filled ? "#ffd21f" : "rgba(40,30,80,0.9)", C.ink, 6); c.restore();
  }
  c.restore();
}
