// ---------- Мир: вечерний лужок, две липы, сцена-подиум, LED-экран, прожекторы ----------
const FLOOR = 800, HORIZON = 640;
const SCR = { x: 560, y: 128, w: 800, h: 340 }; // LED-экран над сценой
const TREES = [{ x: 205, side: -1 }, { x: 1715, side: 1 }];
const BRANCH = [1508, 452]; // ветка правой липы, куда садится Соловей
let bgC = null, treeC = null;
const BGK = 2; // запас разрешения под наезды камеры

function buildWorld() {
  bgC = mkCanvas(W * BGK, H * BGK);
  const c = bgC.getContext("2d"); c.scale(BGK, BGK);
  let g = c.createLinearGradient(0, 0, 0, HORIZON);
  g.addColorStop(0, C.night); g.addColorStop(0.55, C.night2); g.addColorStop(1, C.night3);
  c.fillStyle = g; c.fillRect(0, 0, W, HORIZON + 4);
  const r = mulberry32(7);
  for (let i = 0; i < 150; i++) { const x = r() * W, y = r() * HORIZON * 0.7, a = 0.25 + r() * 0.6; c.fillStyle = `rgba(255,255,255,${a})`; circle(c, x, y, 0.8 + r() * 1.7); c.fill(); }
  // луна
  c.fillStyle = "#fff6d8"; circle(c, 1500, 110, 34); c.fill(); c.fillStyle = C.night; circle(c, 1516, 100, 30); c.fill();
  // дальние холмы
  for (const [col, base, amp, f, ph] of [["#3b2a78", HORIZON - 70, 50, 0.004, 1], ["#2e2263", HORIZON - 30, 36, 0.006, 3]]) {
    c.beginPath(); c.moveTo(0, HORIZON + 5);
    for (let x = 0; x <= W; x += 20) c.lineTo(x, base - amp * (0.6 + 0.4 * Math.sin(x * f + ph)) * (0.7 + 0.3 * Math.sin(x * f * 2.7)));
    c.lineTo(W, HORIZON + 5); c.closePath(); c.fillStyle = col; c.fill();
  }
  // трава
  g = c.createLinearGradient(0, HORIZON, 0, H); g.addColorStop(0, "#2f8a40"); g.addColorStop(1, "#1d5e2c");
  c.fillStyle = g; c.fillRect(0, HORIZON, W, H - HORIZON);
  for (let i = 0; i < 420; i++) { const x = r() * W, y = HORIZON + 6 + r() * (H - HORIZON), h = 8 + r() * 14; c.strokeStyle = r() < 0.5 ? "rgba(120,210,110,0.45)" : "rgba(20,70,30,0.5)"; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (r() - 0.5) * 8, y - h); c.stroke(); }
  // ферма света
  c.fillStyle = "#2a2a3a"; c.fillRect(120, 26, 1680, 16); c.fillRect(120, 54, 1680, 6);
  c.strokeStyle = "#4b4b60"; c.lineWidth = 3; for (let x = 130; x < 1800; x += 36) { c.beginPath(); c.moveTo(x, 40); c.lineTo(x + 18, 56); c.lineTo(x + 36, 40); c.stroke(); }
  // ножки экрана
  for (const x of [SCR.x + 60, SCR.x + SCR.w - 60]) { c.fillStyle = "#2a2a3a"; c.fillRect(x - 10, SCR.y + SCR.h, 20, HORIZON - SCR.y - SCR.h + 30); }
  // рама экрана
  rrect(c, SCR.x - 26, SCR.y - 26, SCR.w + 52, SCR.h + 52, 26); ink(c, "#3a2f6e", 6);
  rrect(c, SCR.x - 10, SCR.y - 10, SCR.w + 20, SCR.h + 20, 14); ink(c, "#0b0820", 4);
  // подиум
  ellipse(c, 960, FLOOR + 4, 860, 128); c.fillStyle = C.ink; c.fill();
  c.beginPath(); c.moveTo(100, FLOOR); c.lineTo(100, FLOOR + 56); c.ellipse(960, FLOOR + 56, 860, 128, 0, Math.PI, 0, true); c.lineTo(1820, FLOOR); c.closePath();
  c.fillStyle = C.woodD; c.fill(); c.lineWidth = 6; c.strokeStyle = C.ink; c.stroke();
  ellipse(c, 960, FLOOR, 856, 124); c.fillStyle = C.wood; c.fill(); c.lineWidth = 6; c.strokeStyle = C.ink; c.stroke();
  c.save(); ellipse(c, 960, FLOOR, 856, 124); c.clip();
  c.strokeStyle = "rgba(120,60,20,0.45)"; c.lineWidth = 3;
  for (let i = -9; i <= 9; i++) { c.beginPath(); c.moveTo(960 + i * 96, FLOOR - 130); c.lineTo(960 + i * 130, FLOOR + 130); c.stroke(); }
  const gl = c.createRadialGradient(960, FLOOR - 40, 40, 960, FLOOR, 860); gl.addColorStop(0, "rgba(255,230,170,0.35)"); gl.addColorStop(1, "rgba(255,230,170,0)"); c.fillStyle = gl; c.fillRect(0, FLOOR - 140, W, 300);
  c.restore();
  // липа — отдельный спрайт, чтобы плясать
  treeC = mkCanvas(640 * BGK, 760 * BGK);
  const tc = treeC.getContext("2d"); tc.scale(BGK, BGK); tc.translate(320, 740);
  tc.beginPath(); tc.moveTo(-34, 0); tc.quadraticCurveTo(-22, -180, -30, -330); tc.lineTo(26, -330); tc.quadraticCurveTo(20, -180, 38, 0); tc.closePath(); ink(tc, "#6b4223", 6);
  tc.strokeStyle = "rgba(40,20,10,0.5)"; tc.lineWidth = 3; for (const y of [-60, -140, -230]) { tc.beginPath(); tc.moveTo(-18, y); tc.quadraticCurveTo(0, y - 12, 16, y); tc.stroke(); }
  const blobs = [[0, -470, 230], [-150, -400, 140], [150, -400, 150], [-90, -570, 140], [100, -580, 140], [0, -650, 120], [-190, -500, 110], [190, -510, 110]];
  for (const [x, y, rr] of blobs) { circle(tc, x, y, rr + 6); tc.fillStyle = C.ink; tc.fill(); }
  for (const [x, y, rr] of blobs) { circle(tc, x, y, rr); tc.fillStyle = C.leaf1; tc.fill(); }
  const r2 = mulberry32(11);
  for (let i = 0; i < 90; i++) { const a = r2() * TAU, d = r2() * 230, x = Math.cos(a) * d, y = -480 + Math.sin(a) * d * 0.8, rr = 18 + r2() * 30; circle(tc, x, y, rr); tc.fillStyle = r2() < 0.5 ? C.leaf2 : C.leaf3; tc.globalAlpha = 0.85; tc.fill(); }
  tc.globalAlpha = 1;
  for (let i = 0; i < 30; i++) { const a = r2() * TAU, d = r2() * 200; circle(tc, Math.cos(a) * d, -480 + Math.sin(a) * d * 0.8, 5); tc.fillStyle = "#f6f0a0"; tc.fill(); } // цветы липы
}

// липа: dance 0..1 — пляшет, rustle 0..1 — шелестит
function tree(c, x, t, dance, rustle) {
  const sk = Math.sin(t * 7.5) * 0.16 * dance + Math.sin(t * 13) * 0.02 * rustle;
  const sy = 1 + Math.sin(t * 15) * 0.05 * dance, jump = Math.abs(Math.sin(t * 7.5)) * 26 * dance;
  c.save(); c.translate(x, HORIZON + 30 - jump); c.transform(1, 0, sk, 1, 0, 0); c.scale(1 / sy, sy);
  c.drawImage(treeC, -320, -740, 640, 760);
  if (dance > 0.05) { // рот и глаза у пляшущей липы
    c.globalAlpha = sstep(dance * 2); c.fillStyle = C.ink; circle(c, -40, -470, 14); c.fill(); circle(c, 40, -470, 14); c.fill();
    c.beginPath(); c.arc(0, -420, 40, 0.1, Math.PI - 0.1); c.lineWidth = 8; c.strokeStyle = C.ink; c.stroke(); c.globalAlpha = 1;
  }
  c.restore();
}
// падающие листья
function leaves(c, x, t, t0, n, seed) {
  if (t < t0) return; const r = mulberry32(seed), dt = t - t0;
  for (let i = 0; i < n; i++) {
    const sx = x + (r() - 0.5) * 360, sy = 230 + r() * 260, v = 60 + r() * 60, ph = r() * TAU;
    const y = sy + v * dt, xx = sx + Math.sin(dt * 3 + ph) * 30; if (y > FLOOR + 60) continue;
    c.save(); c.translate(xx, y); c.rotate(dt * 2 + ph); ellipse(c, 0, 0, 11, 6); ink(c, C.leaf3, 2.5); c.restore();
  }
}

// прожектор: из точки на ферме в точку на полу
function spot(c, x0, tx, ty, a, col = "255,240,200", w = 110) {
  if (a <= 0.005) return;
  c.save(); c.globalCompositeOperation = "lighter";
  const g = c.createLinearGradient(x0, 40, tx, ty); g.addColorStop(0, `rgba(${col},${0.32 * a})`); g.addColorStop(1, `rgba(${col},${0.06 * a})`);
  c.beginPath(); c.moveTo(x0 - 16, 46); c.lineTo(x0 + 16, 46); c.lineTo(tx + w, ty); c.lineTo(tx - w, ty); c.closePath(); c.fillStyle = g; c.fill();
  const p = c.createRadialGradient(tx, ty, 10, tx, ty, w * 1.3); p.addColorStop(0, `rgba(${col},${0.35 * a})`); p.addColorStop(1, `rgba(${col},0)`);
  c.fillStyle = p; ellipse(c, tx, ty, w * 1.3, w * 0.35); c.fill();
  c.restore();
  c.fillStyle = "#1c1c28"; rrect(c, x0 - 18, 40, 36, 26, 6); c.fill(); c.fillStyle = `rgba(${col},${0.9 * a + 0.1})`; circle(c, x0, 64, 9); c.fill();
}
// лампочки по раме экрана и подиуму
function bulbs(c, t, chase, fail) {
  const pts = [];
  for (let i = 0; i <= 20; i++) pts.push([SCR.x - 18 + (SCR.w + 36) * i / 20, SCR.y - 18], [SCR.x - 18 + (SCR.w + 36) * i / 20, SCR.y + SCR.h + 18]);
  for (let i = 1; i < 8; i++) pts.push([SCR.x - 18, SCR.y - 18 + (SCR.h + 36) * i / 8], [SCR.x + SCR.w + 18, SCR.y - 18 + (SCR.h + 36) * i / 8]);
  for (let i = 0; i <= 26; i++) { const a = Math.PI * (i / 26); pts.push([960 - Math.cos(a) * 850, FLOOR + 30 + Math.sin(a) * 126]); }
  pts.forEach(([x, y], i) => {
    const on = fail > 0.5 ? (Math.floor(t * 8) % 2 === 0 ? 1 : 0.15) : 0.35 + 0.65 * (((i + Math.floor(t * chase)) % 3) === 0 ? 1 : 0.2);
    c.fillStyle = fail > 0.5 ? `rgba(255,70,70,${on})` : `rgba(255,214,80,${on})`; circle(c, x, y, 6); c.fill();
  });
}

// птички на липах: fall 0..1 — свалились от фальши
const BIRDS = [[150, 330, -1], [300, 390, 1], [80, 470, 1], [1640, 300, -1], [1800, 400, -1]];
function birds(c, t, t0) {
  BIRDS.forEach(([x, y, d], i) => {
    const u = t0 == null ? 0 : prog(t, t0 + i * 0.05, t0 + 1.4 + i * 0.05);
    let bx = x, by = y, rot = 0, fly = false;
    if (u > 0) { bx = x + d * 400 * u + Math.sin(u * 20) * 10; by = y - Math.sin(u * Math.PI) * 120 - u * 300; rot = -0.3 * d; fly = true; }
    if (u >= 1) return;
    c.save(); c.translate(bx, by); c.scale(d * 0.55, 0.55);
    if (fly) { c.save(); c.rotate(-0.6 - Math.abs(Math.sin(t * 30)) * 1.2); ellipse(c, -10, -16, 26, 10); ink(c, "#4a7bd6", 4); c.restore(); }
    ellipse(c, 0, 0, 30, 22); ink(c, "#5b8de6", 4); circle(c, 24, -14, 15); ink(c, "#5b8de6", 4);
    c.beginPath(); c.moveTo(36, -16); c.lineTo(50, -12); c.lineTo(36, -8); c.closePath(); ink(c, "#ffb02e", 3);
    c.fillStyle = C.ink; circle(c, 28, -17, 3.5); c.fill();
    if (u > 0) { c.strokeStyle = C.ink; c.lineWidth = 3; c.beginPath(); c.moveTo(22, -26); c.lineTo(32, -20); c.moveTo(32, -26); c.lineTo(22, -20); c.stroke(); }
    c.restore();
  });
}

// конфетти: взрыв из точки в момент t0
function confetti(c, t, t0, x, y, n, seed, spread = 1) {
  if (t < t0) return; const dt = t - t0; if (dt > 4) return;
  const r = mulberry32(seed), cols = [C.magenta, C.yellow, C.cyan, C.green, "#ffffff"];
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (r() - 0.5) * 2.4 * spread, v = 600 + r() * 700, col = cols[Math.floor(r() * cols.length)], sp = r() * 10;
    const drag = 1 - Math.exp(-dt * 1.6);
    const px = x + Math.cos(a) * v * drag / 1.6, py = y + Math.sin(a) * v * drag / 1.6 + 160 * dt * dt;
    if (py > H + 40) continue;
    c.save(); c.translate(px + Math.sin(dt * 5 + sp) * 14, py); c.rotate(dt * 8 + sp); c.scale(1, Math.cos(dt * 9 + sp));
    c.globalAlpha = 1 - sstep(prog(dt, 3, 4)); c.fillStyle = col; c.fillRect(-9, -5, 18, 10); c.restore();
  }
}

// ноты из инструмента: good — круглые ровные, иначе колючие кривые
function notes(c, t, x, y, a, good, seed, dirX = 1) {
  if (a <= 0.01) return; const r = mulberry32(seed);
  for (let i = 0; i < 6; i++) {
    const per = 1.4, ph = (t / per + r()) % 1, sx = (r() - 0.3) * 60;
    const nx = x + sx + dirX * ph * 160 + Math.sin(ph * 8 + i) * (good ? 14 : 30), ny = y - ph * 220;
    c.save(); c.globalAlpha = a * (1 - sstep(prog(ph, 0.7, 1))) * sstep(prog(ph, 0, 0.1));
    c.translate(nx, ny); c.rotate(good ? Math.sin(t * 3 + i) * 0.2 : Math.sin(t * 17 + i) * 0.6);
    const sc = good ? 1 : 1.1 + 0.3 * Math.sin(t * 23 + i); c.scale(sc, sc);
    if (good) { ellipse(c, 0, 0, 14, 10, -0.4); ink(c, C.gold, 3.5); c.fillRect(11, -46, 5, 46); c.strokeStyle = C.ink; c.lineWidth = 2; c.strokeRect(11, -46, 5, 46); c.beginPath(); c.moveTo(15, -46); c.quadraticCurveTo(34, -36, 26, -18); c.lineWidth = 5; c.strokeStyle = C.gold; c.stroke(); }
    else {
      c.beginPath(); for (let k = 0; k < 10; k++) { const rr = k % 2 ? 7 : 17, aa = k / 10 * TAU; c.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr); } c.closePath(); ink(c, i % 2 ? C.red : "#9b5cff", 3);
      c.strokeStyle = C.ink; c.lineWidth = 5; c.lineCap = "round"; c.beginPath(); c.moveTo(12, 0); c.lineTo(18, -18); c.lineTo(8, -28); c.lineTo(20, -48); c.stroke();
    }
    c.restore();
  }
}
// мультяшное облако драки: k 0..1 — сила
function fightCloud(c, t, x, y, k) {
  if (k <= 0.01) return; const r = mulberry32(5);
  c.save(); c.translate(x, y); const s = springPop(k * 1.5) * (1 + Math.sin(t * 19) * 0.03); c.scale(s * 1.45, s * 1.15);
  const puffs = []; for (let i = 0; i < 16; i++) { const a = i / 16 * TAU + Math.sin(t * 6 + i) * 0.15; puffs.push([Math.cos(a) * (230 + r() * 40), Math.sin(a) * (120 + r() * 30), 80 + r() * 40 + Math.sin(t * 11 + i) * 8]); }
  for (const [px, py, pr] of puffs) { circle(c, px, py, pr + 6); c.fillStyle = C.ink; c.fill(); }
  for (const [px, py, pr] of puffs) { circle(c, px, py, pr); c.fillStyle = "#f4efe6"; c.fill(); }
  ellipse(c, 0, 0, 270, 150); c.fillStyle = "#f4efe6"; c.fill();
  // мелькают лапы, рога, уши, смычки
  const bits = [[() => { c.fillStyle = SPEC.osel.body; ellipse(c, 0, 0, 13, 40); }, 1], [() => { c.strokeStyle = "#5a3416"; c.lineWidth = 6; c.beginPath(); c.moveTo(-60, 0); c.lineTo(60, 0); c.stroke(); }, 0],
    [() => { c.fillStyle = SPEC.mish.body; circle(c, 0, 0, 26); }, 1], [() => { c.strokeStyle = "#b98d4f"; c.lineWidth = 12; c.beginPath(); c.arc(0, 0, 30, 3.5, 5.6); c.stroke(); }, 0], [() => { c.fillStyle = SPEC.mart.body; ellipse(c, 0, 0, 34, 12); }, 1]];
  bits.forEach(([fn], i) => { const ph = (t * 1.7 + i * 0.37) % 1; const a = i * 1.3 + t * 2; c.save(); c.translate(Math.cos(a) * 250, Math.sin(a) * 140); c.rotate(t * 7 + i); c.globalAlpha = Math.sin(ph * Math.PI); fn(); c.restore(); });
  // звёздочки
  for (let i = 0; i < 6; i++) { const a = t * 3 + i; c.save(); c.translate(Math.cos(a) * 160, Math.sin(a * 1.3) * 80 - 40); c.rotate(t * 5 + i); star(c, 0, 0, 22, 10, C.yellow); c.restore(); }
  c.restore();
}
function star(c, x, y, R, r, col) { c.beginPath(); for (let k = 0; k < 10; k++) { const rr = k % 2 ? r : R, a = -Math.PI / 2 + k / 10 * TAU; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); ink(c, col, 3); }
// лампочка-идея над головой
function bulbIdea(c, x, y, k, t) {
  if (k <= 0) return; const s = springPop(k * 1.2);
  c.save(); c.translate(x, y); c.scale(s, s);
  c.save(); c.globalCompositeOperation = "lighter"; const g = c.createRadialGradient(0, -20, 10, 0, -20, 130); g.addColorStop(0, "rgba(255,230,120,0.7)"); g.addColorStop(1, "rgba(255,230,120,0)"); c.fillStyle = g; c.fillRect(-140, -150, 280, 280); c.restore();
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + t; c.strokeStyle = C.yellow; c.lineWidth = 6; c.lineCap = "round"; c.beginPath(); c.moveTo(Math.cos(a) * 62, -20 + Math.sin(a) * 62); c.lineTo(Math.cos(a) * 84, -20 + Math.sin(a) * 84); c.stroke(); }
  circle(c, 0, -26, 40); ink(c, "#fff3a0", 5);
  rrect(c, -18, 8, 36, 26, 5); ink(c, "#9aa0ad", 4);
  c.strokeStyle = C.ink; c.lineWidth = 4; c.beginPath(); c.moveTo(-10, -20); c.lineTo(-4, -34); c.lineTo(4, -20); c.lineTo(10, -34); c.stroke();
  c.restore();
}
// звёздочки над головой (после драки)
function dizzy(c, x, y, t, k) {
  if (k <= 0.01) return; c.save(); c.globalAlpha = k;
  for (let i = 0; i < 3; i++) { const a = t * 4 + i / 3 * TAU; star(c, x + Math.cos(a) * 44, y + Math.sin(a) * 12, 13, 6, C.yellow); }
  c.restore();
}

// ---------- Зрители: врезка «зал» ----------
// hope 0..1 — машут огоньками; react 0..1 — фальшь: уши торчком, лапы на уши, глаза зажмурены
function audienceShot(c, t, hope, react) {
  let g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#1b1146"); g.addColorStop(1, "#0b0722"); c.fillStyle = g; c.fillRect(0, 0, W, H);
  // отсвет сцены
  c.save(); c.globalCompositeOperation = "lighter"; const sg = c.createRadialGradient(960, -200, 100, 960, -200, 1100); sg.addColorStop(0, "rgba(255,210,140,0.35)"); sg.addColorStop(1, "rgba(255,210,140,0)"); c.fillStyle = sg; c.fillRect(0, 0, W, H); c.restore();
  const shake = react * 6;
  const rows = [[300, 0.72, 9, 3], [470, 0.9, 7, 1], [660, 1.15, 5, 2]];
  rows.forEach(([y, s, n, seed], ri) => {
    const r = mulberry32(seed + 40);
    for (let i = 0; i < n; i++) {
      const x = (i + 0.5 + (ri % 2 ? 0.25 : -0.1)) * (W / n) + (r() - 0.5) * 40, kind = ["hare", "hedge", "owl", "squirrel"][Math.floor(r() * 4)];
      const jx = wob(t, 40, i + ri * 7) * shake, bob = Math.sin(t * 6 + i + ri) * 6 * hope;
      critter(c, kind, x + jx, y + bob, s, t + i, hope, react, (i + ri) % 2);
    }
    // спинки кресел
    c.fillStyle = ri === 2 ? "#7a1a3a" : "#5c1530"; rrect(c, -20, y + 90 * s, W + 40, 260, 30); c.fill();
  });
  // вспышки телефонов на «пленять»
  if (hope > 0.1) { const r = mulberry32(77); for (let i = 0; i < 9; i++) { const x = r() * W, y = 160 + r() * 520, p = ((t * 1.3 + r()) % 1); if (p < 0.08) { c.save(); c.globalCompositeOperation = "lighter"; const fg = c.createRadialGradient(x, y, 2, x, y, 90); fg.addColorStop(0, `rgba(255,255,255,${0.9 * hope})`); fg.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = fg; c.fillRect(x - 90, y - 90, 180, 180); c.restore(); } } }
}
function critter(c, kind, x, y, s, t, hope, react, alt) {
  c.save(); c.translate(x, y); c.scale(s, s);
  const ear = react; // уши торчком
  if (kind === "hare") {
    for (const d of [-1, 1]) { c.save(); c.translate(d * 18, -50); c.rotate(d * lerp(0.35, 0.05, ear) + Math.sin(t * 40) * 0.05 * react); ellipse(c, 0, -46 - ear * 14, 13, 50 + ear * 14); ink(c, "#d9d4cf", 4); ellipse(c, 0, -44 - ear * 14, 6, 36); c.fillStyle = "#f2b3c0"; c.fill(); c.restore(); }
    ellipse(c, 0, 0, 52, 58); ink(c, "#d9d4cf", 5);
  } else if (kind === "hedge") {
    c.beginPath(); for (let k = 0; k <= 18; k++) { const a = Math.PI + k / 18 * Math.PI, rr = k % 2 ? 62 : 84 + ear * 26; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr + 10); } c.closePath(); ink(c, "#5a4636", 4);
    ellipse(c, 0, 10, 46, 48); ink(c, "#e2c49c", 5);
  } else if (kind === "owl") {
    ellipse(c, 0, 0, 58, 62); ink(c, "#9a6f4a", 5);
    for (const d of [-1, 1]) { c.beginPath(); c.moveTo(d * 26, -50); c.lineTo(d * (44 + ear * 10), -86 - ear * 16); c.lineTo(d * 50, -40); c.closePath(); ink(c, "#9a6f4a", 4); }
    ellipse(c, 0, 8, 40, 42); c.fillStyle = "#e8d2b0"; c.fill();
  } else {
    c.save(); c.translate(48, 10); c.rotate(-0.4 + Math.sin(t * 3) * 0.1); ellipse(c, 10, -40, 30, 62); ink(c, "#d4772f", 4); c.restore();
    for (const d of [-1, 1]) { c.beginPath(); c.moveTo(d * 20, -42); c.lineTo(d * 34, -84 - ear * 18); c.lineTo(d * 44, -36); c.closePath(); ink(c, "#d4772f", 4); }
    ellipse(c, 0, 0, 48, 52); ink(c, "#d4772f", 5);
    ellipse(c, 0, 16, 28, 26); c.fillStyle = "#f6dcb5"; c.fill();
  }
  // лицо
  const ey = kind === "owl" ? -6 : -10, er = kind === "owl" ? 15 : 9;
  for (const d of [-1, 1]) {
    if (react > 0.4) { c.strokeStyle = C.ink; c.lineWidth = 5; c.lineCap = "round"; c.beginPath(); c.moveTo(d * 18 - 8 * d, ey - 8); c.lineTo(d * 18 + 6 * d, ey); c.lineTo(d * 18 - 8 * d, ey + 8); c.stroke(); }
    else { circle(c, d * 18, ey, er); ink(c, "#fff", 3); c.fillStyle = C.ink; circle(c, d * 18, ey - 2 * hope, er * 0.5); c.fill(); }
  }
  if (react > 0.4) { ellipse(c, 0, 28, 16, 12); ink(c, "#5a1420", 3); }
  else { c.strokeStyle = C.ink; c.lineWidth = 4; c.beginPath(); c.arc(0, 18, 14, 0.2, Math.PI - 0.2); c.stroke(); }
  // лапы: огоньки над головой или на ушах
  const pawCol = kind === "hare" ? "#d9d4cf" : kind === "hedge" ? "#e2c49c" : kind === "owl" ? "#9a6f4a" : "#d4772f";
  if (react > 0.3) { for (const d of [-1, 1]) { const px = d * lerp(30, 50, react), py = lerp(60, -14, sstep(react)); ellipse(c, px, py, 16, 20); ink(c, pawCol, 4); } }
  else if (hope > 0.1) {
    const w = Math.sin(t * 5 + alt * 2) * 0.5, px = alt ? 60 : -60;
    c.save(); c.translate(px, -30); c.rotate(w); c.globalCompositeOperation = "lighter"; c.strokeStyle = alt ? "rgba(255,46,136,0.9)" : "rgba(34,211,238,0.9)"; c.lineWidth = 12; c.lineCap = "round"; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -90); c.stroke(); c.restore();
    ellipse(c, px, -20, 16, 18); ink(c, pawCol, 4);
  }
  c.restore();
}
