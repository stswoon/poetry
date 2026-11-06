// ---------- Мир: холм, яблоня, дорога, ветка, поток, лес, птицы ----------
const LX0 = -300, LY0 = 400; // offscreen-пейзаж холма покрывает x −300…2220, y 400…1300
const HILL_TOP = [1180, 720];
function hillY(x) { // профиль ближнего холма
  if (x < HILL_TOP[0]) { const u = (HILL_TOP[0] - x) / (HILL_TOP[0] + 300); return HILL_TOP[1] + 230 * u * u + 18 * Math.sin(x / 140); }
  const u = (x - HILL_TOP[0]) / (2220 - HILL_TOP[0]); return HILL_TOP[1] + 170 * u * u + 10 * Math.sin(x / 110);
}
let LAND = null, TREE = null, ROADBG = null, BOKEH = null, BRANCH = null, STREAMBG = null, FOREST = null, OLYMP = null;

function buildLand() {
  const cv = mkCanvas(2520, 900), c = cv.getContext("2d"); c.translate(-LX0, -LY0);
  const r = mulberry32(5);
  // дальние горы
  c.beginPath(); c.moveTo(-300, 660);
  const peaks = [[-200, 560], [60, 470], [260, 560], [470, 500], [700, 590], [980, 450], [1250, 560], [1480, 500], [1760, 580], [1980, 470], [2220, 560]];
  for (const [x, y] of peaks) c.lineTo(x, y);
  c.lineTo(2220, 660); c.closePath(); ink(c, "#8fb0e0", 0);
  // снежные шапки и светлые грани
  for (const [x, y] of peaks) { if (y > 520) continue; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 46, y + 44); c.lineTo(x - 14, y + 36); c.lineTo(x + 4, y + 50); c.lineTo(x + 40, y + 38); c.closePath(); c.fillStyle = "#f1f6ff"; c.fill(); }
  c.globalAlpha = 0.35; for (let i = 0; i < peaks.length - 1; i++) { const [x, y] = peaks[i]; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 70, 660); c.lineTo(x + 140, 660); c.closePath(); c.fillStyle = "#6f8fc9"; c.fill(); } c.globalAlpha = 1;
  // дальние холмы
  for (const [col, base, amp, f, ph] of [["#9fd27c", 650, 26, 260, 0], ["#79c062", 690, 30, 210, 2], ["#5fae55", 728, 22, 170, 4]]) {
    c.beginPath(); c.moveTo(-300, 1300); for (let x = -300; x <= 2220; x += 20) c.lineTo(x, base + Math.sin(x / f + ph) * amp + Math.sin(x / (f * 0.37) + ph) * amp * 0.3); c.lineTo(2220, 1300); c.closePath(); ink(c, col, 0);
  }
  // деревца на дальних холмах
  for (let i = 0; i < 40; i++) { const x = -250 + r() * 2450, y = 700 + r() * 40; circle(c, x, y, 9 + r() * 8); c.fillStyle = r() < 0.5 ? "#3f8f48" : "#4c9e4f"; c.fill(); }
  // ближний холм
  c.beginPath(); c.moveTo(-300, 1300); for (let x = -300; x <= 2220; x += 10) c.lineTo(x, hillY(x)); c.lineTo(2220, 1300); c.closePath();
  const g = c.createLinearGradient(0, 700, 0, 1200); g.addColorStop(0, C.grass1); g.addColorStop(1, C.grass2); ink(c, g, 5);
  // светлая полоса вдоль гребня
  c.save(); c.beginPath(); for (let x = -300; x <= 2220; x += 10) c.lineTo(x, hillY(x) + 3); for (let x = 2220; x >= -300; x -= 10) c.lineTo(x, hillY(x) + 34 + 10 * Math.sin(x / 90)); c.closePath(); c.fillStyle = C.grassLight; c.globalAlpha = 0.75; c.fill(); c.restore();
  // тропинка к вершине
  c.beginPath(); c.moveTo(560, 1300); c.bezierCurveTo(760, 1050, 1300, 980, HILL_TOP[0] - 10, HILL_TOP[1] + 6); c.lineTo(HILL_TOP[0] + 16, HILL_TOP[1] + 6); c.bezierCurveTo(1360, 1000, 900, 1080, 880, 1300); c.closePath(); ink(c, C.road, 3, "#9f7448");
  // травинки и цветы
  for (let i = 0; i < 260; i++) {
    const x = -280 + r() * 2480, y = hillY(x) + 20 + r() * 480;
    if (r() < 0.55) { c.strokeStyle = r() < 0.5 ? C.grass3 : "#5cb84a"; c.lineWidth = 3; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 4, y - 10, x + 8 * (r() - 0.3), y - 22); c.stroke(); }
    else { circle(c, x, y, 4 + r() * 3); c.fillStyle = ["#ffffff", "#fff36b", "#ffd0e6", "#cfe4ff"][Math.floor(r() * 4)]; c.fill(); }
  }
  LAND = cv;
}

function buildTree() {
  const cv = mkCanvas(760, 760), c = cv.getContext("2d"), r = mulberry32(42);
  c.translate(380, 740); // основание ствола
  // ствол и ветви
  c.beginPath(); c.moveTo(-34, 0); c.bezierCurveTo(-30, -120, -40, -220, -20, -300); c.lineTo(22, -300); c.bezierCurveTo(30, -200, 26, -110, 38, 0); c.closePath(); ink(c, C.trunk, 5, C.trunkD);
  for (const [x1, y1, w] of [[-170, -420, 14], [160, -440, 14], [-30, -520, 12], [80, -360, 10]]) { c.lineCap = "round"; c.strokeStyle = C.trunkD; c.lineWidth = w + 6; c.beginPath(); c.moveTo(0, -290); c.quadraticCurveTo(x1 * 0.4, -360, x1, y1); c.stroke(); c.strokeStyle = C.trunk; c.lineWidth = w; c.stroke(); }
  // крона: облака листвы с цел-тенью
  const puffs = []; for (let i = 0; i < 16; i++) { const a = r() * TAU, d = r() * 200; puffs.push([Math.cos(a) * d * 1.3, -450 + Math.sin(a) * d * 0.75, 70 + r() * 50]); }
  const base = () => { c.beginPath(); for (const [x, y, rr] of puffs) { c.moveTo(x + rr, y); c.arc(x, y, rr, 0, TAU); } };
  c.save(); base(); c.lineWidth = 8; c.strokeStyle = "#2f6b3a"; c.stroke(); c.fillStyle = C.leafD; c.fill(); c.clip();
  c.fillStyle = C.leaf; c.beginPath(); for (const [x, y, rr] of puffs) { c.moveTo(x - 14 + rr * 0.85, y - 18); c.arc(x - 14, y - 18, rr * 0.85, 0, TAU); } c.fill();
  c.restore();
  // цветы яблони
  for (let i = 0; i < 260; i++) {
    const a = r() * TAU, d = Math.sqrt(r()) * 250, x = Math.cos(a) * d * 1.25, y = -450 + Math.sin(a) * d * 0.78, s = 6 + r() * 7;
    c.fillStyle = r() < 0.3 ? C.blossomD : C.blossom;
    for (let k = 0; k < 5; k++) { const pa = k / 5 * TAU + i; circle(c, x + Math.cos(pa) * s * 0.7, y + Math.sin(pa) * s * 0.7, s * 0.55); c.fill(); }
    circle(c, x, y, s * 0.3); c.fillStyle = "#ffd84a"; c.fill();
  }
  TREE = cv;
}
function drawTree(c, x, y, s, sway) {
  c.save(); c.translate(x, y); c.rotate(sway * 0.03); c.scale(s, s); c.drawImage(TREE, -380, -740); c.restore();
}
// лепестки, сорванные ветром
function petals(c, t, a, x0, y0, seed = 3, n = 26) {
  if (a <= 0) return;
  const r = mulberry32(seed);
  c.save(); c.globalAlpha *= a;
  for (let i = 0; i < n; i++) {
    const sp = 260 + r() * 300, ph = r() * 10, ox = r() * 300, oy = r() * 300;
    const u = ((t + ph) * sp) % 2400, x = x0 + ox + u, y = y0 + oy + Math.sin((t + ph) * 3) * 60 + u * 0.25;
    c.save(); c.translate(x, y); c.rotate(t * 4 + i); ell(c, 0, 0, 9, 5); c.fillStyle = i % 3 ? C.blossom : C.blossomD; c.fill(); c.restore();
  }
  c.restore();
}

// ---------- Школьник (со спины). Опорная точка — между ступнями ----------
// o: armL/armR — угол руки (0 вниз, 2.6 вверх), jump — подскок, look — голова вверх 0..1, wind — сила ветра, hair — фаза
function kid(c, x, y, s, o) {
  const t = o.t || 0, wind = o.wind ?? 0.5;
  c.save(); c.translate(x, y - (o.jump || 0)); c.scale(s, s); c.rotate(o.lean || 0);
  // ноги
  for (const sx of [-1, 1]) {
    const kick = (o.jump || 0) > 4 ? sx * 0.15 : 0;
    c.save(); c.translate(sx * 20, -92); c.rotate(kick);
    c.beginPath(); c.roundRect(-15, 0, 30, 88, 10); ink(c, C.pants, 4);
    c.beginPath(); c.roundRect(-19, 80, 38, 18, 8); ink(c, "#ffffff", 4); c.fillStyle = "#e5403b"; c.fillRect(-17, 92, 34, 5);
    c.restore();
  }
  // шарф по ветру
  const fl = (k) => Math.sin(t * 9 + k) * 14 * (0.4 + wind);
  c.beginPath(); c.moveTo(-10, -190); c.bezierCurveTo(-60, -200 + fl(0), -110, -186 + fl(1), -150 - 30 * wind, -196 + fl(2));
  c.lineTo(-150 - 30 * wind, -172 + fl(2.4)); c.bezierCurveTo(-110, -164 + fl(1.3), -60, -172 + fl(0.4), -6, -170); c.closePath(); ink(c, "#ef4b5a", 4);
  // руки
  const arm = (sx, ang) => {
    c.save(); c.translate(sx * 40, -172); c.rotate(-sx * ang);
    c.beginPath(); c.roundRect(-14, -4, 28, 86, 13); ink(c, C.jacket, 4);
    circle(c, 0, 90, 14); ink(c, C.skin, 4);
    c.restore();
  };
  arm(-1, o.armL ?? 0.18); arm(1, o.armR ?? 0.18);
  // куртка
  c.beginPath(); c.moveTo(-44, -184); c.quadraticCurveTo(0, -200, 44, -184); c.lineTo(52, -84); c.quadraticCurveTo(0, -74, -52, -84); c.closePath(); ink(c, C.jacket, 5);
  c.save(); c.clip(); c.fillStyle = C.jacketD; c.fillRect(10, -200, 60, 130); c.restore();
  c.strokeStyle = C.jacketD; c.lineWidth = 4; c.beginPath(); c.moveTo(-50, -100); c.quadraticCurveTo(0, -92, 50, -100); c.stroke();
  // капюшон
  c.beginPath(); c.moveTo(-34, -190); c.quadraticCurveTo(0, -160, 34, -190); c.quadraticCurveTo(0, -205, -34, -190); ink(c, C.jacketD, 3);
  // голова и волосы (со спины): острые аниме-пряди качает ветер
  const look = o.look || 0;
  c.save(); c.translate(0, -226 + look * 4); c.rotate(-look * 0.05);
  circle(c, -40, 2, 9); ink(c, C.skin, 3); circle(c, 40, 2, 9); ink(c, C.skin, 3); // уши
  const spikes = [];
  for (let i = 0; i <= 12; i++) {
    const a = Math.PI * (0.98 + i / 12 * 1.04), rr = 52 + (i % 2 ? 0 : 16), sway = Math.sin(t * 7 + i) * 5 * wind;
    spikes.push([Math.cos(a) * rr + sway, Math.sin(a) * rr * 0.98 - look * 6]);
  }
  spikes.push([46, 18], [30, 44], [10, 36], [-6, 50], [-24, 38], [-44, 22]);
  smooth(c, spikes); ink(c, C.hair, 5);
  c.save(); c.clip(); c.fillStyle = C.hairL; c.globalAlpha = 0.85; c.beginPath(); c.ellipse(-14, -30, 22, 30, -0.5, 0, TAU); c.fill(); c.restore();
  c.restore();
  c.restore();
}

// ---------- Крупно: пыльная дорога ----------
function buildRoad() {
  const cv = mkCanvas(W, H), c = cv.getContext("2d"), r = mulberry32(19);
  // земля ниже горизонта
  c.beginPath(); c.moveTo(0, 430); for (let x = 0; x <= W; x += 20) c.lineTo(x, 430 + Math.sin(x / 170) * 10); c.lineTo(W, H); c.lineTo(0, H); c.closePath(); ink(c, C.grass2, 0);
  c.beginPath(); c.moveTo(860, 432); c.lineTo(1060, 432); c.lineTo(1900, H); c.lineTo(20, H); c.closePath();
  const g = c.createLinearGradient(0, 430, 0, H); g.addColorStop(0, "#c9a271"); g.addColorStop(1, C.road); ink(c, g, 4, "#9f7448");
  // колеи и камешки
  c.strokeStyle = "rgba(150,105,60,0.45)"; c.lineWidth = 10; c.lineCap = "round";
  for (const k of [-0.32, 0.3]) { c.beginPath(); c.moveTo(960 + k * 120, 440); c.lineTo(960 + k * 1700, H); c.stroke(); }
  for (let i = 0; i < 160; i++) { const y = 450 + Math.pow(r(), 0.7) * 620, w = lerp(120, 940, (y - 430) / 650), x = 960 + (r() - 0.5) * 2 * w; ell(c, x, y, 3 + (y - 430) / 90, 2 + (y - 430) / 160); c.fillStyle = r() < 0.5 ? "#b98b55" : "#ead0a2"; c.fill(); }
  // трава по краям
  for (let i = 0; i < 420; i++) {
    const side = r() < 0.5 ? -1 : 1, y = 440 + Math.pow(r(), 0.8) * 640, w = lerp(110, 960, (y - 430) / 650), x = 960 + side * (w + r() * 500);
    const hh = 12 + (y - 430) / 8; c.strokeStyle = r() < 0.5 ? C.grass3 : C.grass1; c.lineWidth = 2 + (y - 430) / 160;
    c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 6, y - hh * 0.6, x + (r() - 0.5) * hh * 0.6, y - hh); c.stroke();
  }
  ROADBG = cv;
}
// капли бьют в пыль: фонтанчики пыли и брызги-короны
const HITS = (() => { const r = mulberry32(64), a = []; for (let i = 0; i < 70; i++) { const y = 470 + Math.pow(r(), 0.8) * 560; const w = lerp(120, 900, (y - 430) / 650); a.push([960 + (r() - 0.5) * 2 * w, y, r() * 3.2, (y - 430) / 650]); } return a; })();
function roadHits(c, t, t0, k) {
  if (k <= 0) return;
  for (const [x, y, d, z] of HITS) {
    const lt = t - t0 - d * 0.6; if (lt < 0) continue;
    const ph = lt % 0.9, u = ph / 0.9, s = 0.4 + z * 1.4;
    // пыль
    c.save(); c.globalAlpha = (1 - u) * 0.75 * k;
    for (let j = 0; j < 3; j++) { circle(c, x + (j - 1) * 14 * s * (0.5 + u), y - 8 * s - u * 26 * s, (8 + u * 26) * s); c.fillStyle = C.dust; c.fill(); }
    c.restore();
    // корона брызг
    if (u < 0.35) { const v = u / 0.35; c.save(); c.globalAlpha = (1 - v) * k; c.strokeStyle = "#eaf6ff"; c.lineWidth = 3 * s; c.lineCap = "round";
      for (let j = -2; j <= 2; j++) { const a = -Math.PI / 2 + j * 0.45; c.beginPath(); c.moveTo(x + Math.cos(a) * 6 * s, y + Math.sin(a) * 6 * s); c.lineTo(x + Math.cos(a) * (8 + v * 26) * s, y + Math.sin(a) * (8 + v * 26) * s - v * 8 * s); c.stroke(); }
      c.restore(); }
  }
}

// ---------- Макро: ветка яблони с каплями-жемчужинами ----------
function buildBokeh() {
  const cv = mkCanvas(W, H), c = cv.getContext("2d"), r = mulberry32(8);
  const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, "#5f86c8"); g.addColorStop(0.6, "#7aa3d8"); g.addColorStop(1, "#a7c9a0"); c.fillStyle = g; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 46; i++) {
    const x = r() * W, y = r() * H, rr = 40 + r() * 120, col = ["rgba(160,220,140,", "rgba(255,210,230,", "rgba(255,255,255,", "rgba(120,180,110,"][Math.floor(r() * 4)];
    const gg = c.createRadialGradient(x, y, 0, x, y, rr); gg.addColorStop(0, col + "0.5)"); gg.addColorStop(0.75, col + "0.32)"); gg.addColorStop(1, col + "0)"); c.fillStyle = gg; c.fillRect(x - rr, y - rr, 2 * rr, 2 * rr);
  }
  BOKEH = cv;
}
const BR_PTS = [[-120, 860], [300, 700], [700, 560], [1100, 470], [1500, 380], [2040, 300]];
const DROPS = [[420, 662, 26], [640, 585, 34], [880, 520, 22], [1050, 488, 38], [1290, 432, 28], [1480, 392, 32], [1700, 352, 24]];
function buildBranch() {
  const cv = mkCanvas(W + 200, H), c = cv.getContext("2d"), r = mulberry32(31);
  c.translate(100, 0);
  c.lineCap = "round"; c.lineJoin = "round";
  for (const [col, lw] of [[C.trunkD, 46], [C.trunk, 34]]) { c.strokeStyle = col; c.lineWidth = lw; smooth(c, BR_PTS, false); c.stroke(); }
  c.strokeStyle = "#8a6450"; c.lineWidth = 8; c.beginPath(); for (let i = 0; i < BR_PTS.length; i++) c[i ? "lineTo" : "moveTo"](BR_PTS[i][0], BR_PTS[i][1] - 10); c.stroke();
  // листья и цветы
  const leaf = (x, y, a, s) => { c.save(); c.translate(x, y); c.rotate(a); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(40 * s, -34 * s, 110 * s, 0); c.quadraticCurveTo(40 * s, 34 * s, 0, 0); ink(c, C.leaf, 4, "#2f6b3a"); c.strokeStyle = "#3a8a3e"; c.lineWidth = 3; c.beginPath(); c.moveTo(6, 0); c.lineTo(100 * s, 0); c.stroke(); c.restore(); };
  const flower = (x, y, s) => { for (let k = 0; k < 5; k++) { const a = k / 5 * TAU + x; c.save(); c.translate(x + Math.cos(a) * 22 * s, y + Math.sin(a) * 22 * s); c.rotate(a); ell(c, 0, 0, 26 * s, 20 * s); ink(c, k % 2 ? C.blossom : "#fff2f7", 3, "#e58fb0"); c.restore(); } circle(c, x, y, 12 * s); ink(c, "#ffd84a", 3, "#d9a520"); };
  for (let i = 0; i < 12; i++) { const u = 0.06 + i / 12 * 0.9, k = Math.floor(u * (BR_PTS.length - 1)), f = u * (BR_PTS.length - 1) - k; const x = lerp(BR_PTS[k][0], BR_PTS[k + 1][0], f), y = lerp(BR_PTS[k][1], BR_PTS[k + 1][1], f); leaf(x, y - 8, (i % 2 ? -1 : 1) * (0.9 + r() * 0.6) - 0.3, 0.9 + r() * 0.5); }
  for (const [x, y, s] of [[200, 700, 1.3], [540, 600, 1.1], [980, 470, 1.4], [1360, 380, 1.2], [1820, 300, 1.3]]) flower(x, y, s);
  BRANCH = cv;
}
// капля: висит на ветке, качается, при сильном ветре «срывается»
function pearl(c, x, y, rr, t, i, fall = 0) {
  const sw = Math.sin(t * 3.2 + i) * 0.08, len = rr * 0.9;
  c.save(); c.translate(x, y); c.rotate(sw);
  const yy = len + fall * 900;
  c.beginPath(); c.moveTo(-rr * 0.18, 0); c.quadraticCurveTo(-rr * 0.9, yy - rr * 0.3, 0, yy + rr); c.quadraticCurveTo(rr * 0.9, yy - rr * 0.3, rr * 0.18, 0); c.closePath();
  if (fall > 0) { c.beginPath(); circle(c, 0, yy, rr); }
  const g = c.createRadialGradient(-rr * 0.3, yy - rr * 0.3, 2, 0, yy, rr * 1.4); g.addColorStop(0, "rgba(255,255,255,0.95)"); g.addColorStop(0.45, "rgba(200,230,255,0.6)"); g.addColorStop(1, "rgba(120,170,230,0.55)");
  c.fillStyle = g; c.fill(); c.strokeStyle = "rgba(255,255,255,0.9)"; c.lineWidth = 3; c.stroke();
  circle(c, -rr * 0.35, yy - rr * 0.1, rr * 0.22); c.fillStyle = "#fff"; c.fill();
  sparkle(c, rr * 0.4, yy + rr * 0.2, rr * 0.9 * (0.6 + 0.4 * Math.sin(t * 5 + i * 2)), 0.9);
  c.restore();
}

// ---------- Горный поток (проводка камеры вдоль) ----------
const STW = 4200;
function streamY(x) { return 260 + x * 0.16 + Math.sin(x / 260) * 40; }
function buildStream() {
  const cv = mkCanvas(STW, 1700), c = cv.getContext("2d"), r = mulberry32(12);
  const sk = c.createLinearGradient(0, 0, 0, 1700); sk.addColorStop(0, "#6f86c4"); sk.addColorStop(1, "#c9dcf2"); c.fillStyle = sk; c.fillRect(0, 0, STW, 1700);
  // склон
  c.beginPath(); c.moveTo(0, 0); for (let x = 0; x <= STW; x += 20) c.lineTo(x, streamY(x) - 260 - 60 * Math.sin(x / 400)); c.lineTo(STW, 1700); c.lineTo(0, 1700); c.closePath();
  const g = c.createLinearGradient(0, 0, 0, 1700); g.addColorStop(0, "#6fbf58"); g.addColorStop(1, "#2f7e3a"); ink(c, g, 5);
  // камни
  for (let i = 0; i < 70; i++) { const x = r() * STW, y = streamY(x) + (r() < 0.5 ? -1 : 1) * (90 + r() * 240); ell(c, x, y, 26 + r() * 50, 18 + r() * 30); ink(c, C.rock, 4, C.rockD); ell(c, x - 8, y - 8, 14, 8); c.fillStyle = "#b4b9cf"; c.fill(); }
  // ели вдоль
  for (let i = 0; i < 46; i++) { const x = r() * STW, y = streamY(x) - 240 - r() * 260, h = 120 + r() * 140; c.beginPath(); c.moveTo(x, y - h); c.lineTo(x + h * 0.32, y); c.lineTo(x - h * 0.32, y); c.closePath(); ink(c, r() < 0.5 ? "#2f7e4a" : "#3d8f55", 4, "#1f4f37"); }
  // русло
  c.beginPath(); for (let x = 0; x <= STW; x += 20) c.lineTo(x, streamY(x) - 70); for (let x = STW; x >= 0; x -= 20) c.lineTo(x, streamY(x) + 70); c.closePath(); ink(c, C.waterD, 6, "#1d5f8f");
  STREAMBG = cv;
}
function streamWater(c, t, x0, x1) {
  // светлая вода и бегущая пена
  c.save(); c.beginPath(); for (let x = x0; x <= x1; x += 20) c.lineTo(x, streamY(x) - 52); for (let x = x1; x >= x0; x -= 20) c.lineTo(x, streamY(x) + 40); c.closePath();
  c.fillStyle = C.water; c.fill(); c.clip();
  c.strokeStyle = C.foam; c.lineCap = "round";
  const r = mulberry32(4);
  for (let i = 0; i < 90; i++) { const off = (r() - 0.5) * 90, len = 40 + r() * 120, sp = 900 + r() * 500; const x = x0 + ((r() * (x1 - x0) + t * sp) % (x1 - x0)); c.lineWidth = 4 + r() * 6; c.globalAlpha = 0.5 + r() * 0.5; c.beginPath(); c.moveTo(x, streamY(x) + off); c.lineTo(x + len, streamY(x + len) + off); c.stroke(); }
  c.restore();
  // брызги на перекатах
  for (let k = 0; k < 8; k++) { const bx = 300 + k * 480, by = streamY(bx); for (let j = 0; j < 7; j++) { const u = ((t * 2.2 + j / 7 + k * 0.3) % 1); const x = bx + j * 12 + u * 90, y = by - 50 - Math.sin(u * Math.PI) * 90; circle(c, x, y, 10 * (1 - u) + 2); c.fillStyle = "rgba(242,251,255,0.9)"; c.fill(); } }
}

// ---------- Лес и птицы ----------
function buildForest() {
  const cv = mkCanvas(W + 400, H), c = cv.getContext("2d"), r = mulberry32(21);
  const sk = c.createLinearGradient(0, 0, 0, H); sk.addColorStop(0, "#7a90cf"); sk.addColorStop(1, "#d6e6f6"); c.fillStyle = sk; c.fillRect(0, 0, W + 400, H);
  const fir = (x, y, h, col, line) => { c.beginPath(); c.moveTo(x, y - h); for (let k = 0; k < 4; k++) { const yy = y - h + h * (k + 1) / 4, ww = h * 0.13 * (k + 1.4); c.lineTo(x + ww, yy); c.lineTo(x + ww * 0.5, yy); } c.lineTo(x + h * 0.1, y + 20); c.lineTo(x - h * 0.1, y + 20); for (let k = 3; k >= 0; k--) { const yy = y - h + h * (k + 1) / 4, ww = h * 0.13 * (k + 1.4); c.lineTo(x - ww * 0.5, yy); c.lineTo(x - ww, yy); } c.closePath(); ink(c, col, 4, line); };
  for (let i = 0; i < 26; i++) fir(r() * (W + 400), 640 + r() * 40, 260 + r() * 140, "#5b8fb0", "#3f6f92");
  for (let i = 0; i < 22; i++) fir(r() * (W + 400), 760 + r() * 50, 340 + r() * 160, "#3d8a5a", "#235a3c");
  // кроны лиственных деревьев (из них вылетают птицы)
  for (let i = 0; i < 9; i++) {
    const x = 60 + i * 260 + r() * 80, y = 640 + r() * 80, rr = 150 + r() * 60;
    c.fillStyle = C.trunk; c.fillRect(x - 16, y, 32, 420);
    const pf = []; for (let k = 0; k < 7; k++) { const a = r() * TAU; pf.push([x + Math.cos(a) * rr * 0.6, y - rr * 0.6 + Math.sin(a) * rr * 0.4, rr * (0.45 + r() * 0.2)]); }
    c.save(); c.beginPath(); for (const [px, py, pr] of pf) { c.moveTo(px + pr, py); c.arc(px, py, pr, 0, TAU); } c.lineWidth = 8; c.strokeStyle = "#245a35"; c.stroke(); c.fillStyle = C.leafD; c.fill(); c.clip();
    c.fillStyle = C.leaf; c.beginPath(); for (const [px, py, pr] of pf) { c.moveTo(px - 12 + pr * 0.82, py - 16); c.arc(px - 12, py - 16, pr * 0.82, 0, TAU); } c.fill(); c.restore();
  }
  c.fillStyle = C.grass2; c.fillRect(0, 960, W + 400, 120);
  FOREST = cv;
}
// птица: тело, голова, крылья машут (flap 0..1)
function bird(c, x, y, s, flap, col = "#3b4f8f", dir = 1) {
  c.save(); c.translate(x, y); c.scale(s * dir, s);
  const wa = -0.9 + flap * 1.6;
  for (const k of [0.6, 1]) { c.save(); c.rotate(wa * k); c.beginPath(); c.moveTo(-6, 0); c.quadraticCurveTo(-10, -40, -46, -52 * k); c.quadraticCurveTo(-22, -16, 8, 2); c.closePath(); ink(c, k < 1 ? "#6d82c2" : col, 3, C.ink); c.restore(); }
  ell(c, 0, 4, 26, 14); ink(c, col, 3, C.ink);
  ell(c, 4, 10, 16, 8); c.fillStyle = "#ffe9a8"; c.fill();
  circle(c, 24, -6, 12); ink(c, col, 3, C.ink);
  c.beginPath(); c.moveTo(34, -8); c.lineTo(46, -4); c.lineTo(34, 0); c.closePath(); ink(c, "#ffb12b", 2, C.ink);
  circle(c, 27, -9, 3); c.fillStyle = "#111"; c.fill(); circle(c, 28, -10, 1.2); c.fillStyle = "#fff"; c.fill();
  c.beginPath(); c.moveTo(-24, 2); c.lineTo(-42, -4); c.lineTo(-40, 10); c.closePath(); ink(c, col, 3, C.ink);
  c.restore();
}
const FLOCK = (() => { const r = mulberry32(55), a = []; for (let i = 0; i < 22; i++) a.push([150 + r() * 1700, 520 + r() * 220, 0.6 + r() * 0.7, r() * 0.8, r() < 0.5 ? -1 : 1, r(), ["#3b4f8f", "#d9534f", "#f0a830", "#4b9c6b"][Math.floor(r() * 4)]]); return a; })();
// стая вспархивает из крон в момент t0
function flock(c, t, t0, a = 1, scale = 1) {
  if (a <= 0) return;
  c.save(); c.globalAlpha *= a;
  for (const [x, y, s, d, dir, ph, col] of FLOCK) {
    const lt = t - t0 - d * 0.5; if (lt < 0) continue;
    const u = lt; const bx = x + dir * u * 260, by = y - u * 230 - Math.sin(u * 3 + ph * 6) * 20;
    bird(c, bx, by, s * scale, 0.5 + 0.5 * Math.sin(t * 22 + ph * 9), col, dir);
  }
  c.restore();
}
// ноты-искры птичьего гама
function notes(c, t, t0, a, x0 = 300, x1 = 1700) {
  if (a <= 0) return;
  const r = mulberry32(99);
  c.save();
  for (let i = 0; i < 14; i++) {
    const d = r() * 1.6, x = lerp(x0, x1, r()), y0 = 520 + r() * 200, lt = t - t0 - d; if (lt < 0) continue;
    const u = (lt % 2.2) / 2.2, col = ["#fff", "#ffe14a", "#ffd0e6"][i % 3];
    c.globalAlpha = a * Math.sin(u * Math.PI);
    c.save(); c.translate(x + Math.sin(lt * 3 + i) * 30, y0 - u * 260); c.rotate(Math.sin(lt * 4 + i) * 0.3 - 0.2);
    // нота: головка, штиль, флажок (вторая — сдвоенная)
    const two = i % 2 === 1;
    c.fillStyle = col; c.strokeStyle = col; c.lineWidth = 6; c.lineCap = "round";
    ell(c, 0, 0, 15, 11, -0.4); c.fill();
    if (two) { ell(c, 40, -8, 15, 11, -0.4); c.fill(); c.beginPath(); c.moveTo(13, -4); c.lineTo(13, -62); c.lineTo(53, -70); c.lineTo(53, -12); c.stroke(); }
    else { c.beginPath(); c.moveTo(13, -4); c.lineTo(13, -62); c.quadraticCurveTo(36, -48, 32, -24); c.stroke(); }
    c.restore();
  }
  c.restore();
}
