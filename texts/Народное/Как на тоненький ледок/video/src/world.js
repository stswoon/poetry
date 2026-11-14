// ---------- мир: пластилиновая диорама зимы ----------
const HOR = 560;                                  // линия горизонта
const POND = { x: 1950, y: 892, rx: 440, ry: 74 };
const BIRD_TREE = { x: 1180, y: 868 };
const DRIFT = { x: 2540, y: 892 };
const FENCE = { x0: 2760, x1: 3080, y: 800 };
const CROW = { x: 2952, y: 676 };
const SIGN = { x: 3200, y: 918 };
const HILL = { x: 3580, y: 886, top: 690, half: 400 };
const FINAL_TREE = { x: 3900, y: 962 };
const ROAD = [[3200, 942], [3450, 950], [3800, 946], [4100, 930], [4300, 880], [4430, 770], [4510, 650], [4540, 590]];
const C = {
  sky0: "#bcd7ee", sky1: "#e9eef2", sky2: "#f7ecd9", snow: "#f2f6fb", snowD: "#d5e2f0", ice: "#9fd3ea", water: "#2e5f8c",
  fir: "#2f8a55", firD: "#246b45", trunk: "#8a5a32", wood: "#b07a44", woodD: "#7d5330", red: "#d8352a", hill: "#e8eff8",
  far: "#c9d8ea", far2: "#b5c8de", house: "#c8643a", roof: "#7a4a8c", win: "#ffd36a", sun: "#ffe9a8",
};
function hillY(x) { const u = (x - HILL.x) / HILL.half; return Math.abs(u) >= 1 ? HILL.y : HILL.y - (HILL.y - HILL.top) * Math.pow(Math.cos(u * Math.PI / 2), 2); }
function driftY(x) { const u = (x - DRIFT.x) / 190; return Math.abs(u) >= 1 ? DRIFT.y : DRIFT.y - 70 * Math.pow(Math.cos(u * Math.PI / 2), 1.6); }

// ---------- небо и дальний план (экранные координаты с параллаксом) ----------
function drawSky(c, cam) {
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, C.sky0); g.addColorStop(0.55, C.sky1); g.addColorStop(1, C.sky2);
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  // мазки пальцем по фону-картону
  const r = mulberry32(91);
  c.save(); c.lineCap = "round";
  for (let i = 0; i < 22; i++) {
    const x = r() * W * 1.2 - 100 - cam.x * 0.05 % 200, y = r() * H * 0.6, l = 120 + r() * 260;
    c.strokeStyle = r() < 0.5 ? "rgba(255,255,255,0.16)" : "rgba(120,150,190,0.08)"; c.lineWidth = 14 + r() * 22;
    c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + l / 2, y - 10 + r() * 20, x + l, y + (r() - 0.5) * 30); c.stroke();
  }
  c.restore();
}
function withLayer(c, cam, f, fn) {
  // слой с параллаксом f (0 — прибит к экрану, 1 — мир)
  const z = 1 + (cam.z - 1) * f, ax = 2400, ay = 560;
  const cx = ax + (cam.x - ax) * f, cy = ay + (cam.y - ay) * f;
  c.save(); c.translate(W / 2, H / 2); c.scale(z, z); c.translate(-cx, -cy); fn(c); c.restore();
}
function drawFar(c, t) {
  // солнце, облака, дальние холмы, деревня на горизонте
  clayBlob(c, 3500, 140, 70, 70, "#ffe39a", 0, 41, { shadow: false, gloss: 0.6 });
  for (const [x, y, s, sd] of [[1200, 120, 1, 51], [2300, 60, 1.3, 52], [3050, 200, 0.9, 53], [4300, 110, 1.1, 54], [600, 240, 0.8, 55]]) {
    const dx = (t * 6 * s) % 400;
    for (let k = 0; k < 4; k++) clayBlob(c, x + dx + (k - 1.5) * 70 * s, y + (k % 2 ? -18 : 6) * s, 70 * s, 42 * s, "#ffffff", 0, sd + k, { shadow: false, gloss: 0.2, prints: 0 });
  }
  clay(c, lumpPoly([[-800, HOR + 40], [-200, HOR - 60], [500, HOR - 20], [1200, HOR - 90], [1900, HOR - 30], [2600, HOR - 80], [3300, HOR - 20], [4000, HOR - 70], [4700, HOR - 30], [5600, HOR - 60], [5600, HOR + 120], [-800, HOR + 120]], 61, 3), C.far2, { shadow: false, seed: 61, gloss: 0.15 });
  clay(c, lumpPoly([[-800, HOR + 60], [0, HOR - 10], [800, HOR + 20], [1600, HOR - 25], [2400, HOR + 15], [3200, HOR - 15], [4100, HOR + 10], [5600, HOR - 10], [5600, HOR + 140], [-800, HOR + 140]], 62, 3), C.far, { shadow: false, seed: 62, gloss: 0.15 });
  // деревня
  for (const [x, s, sd] of [[4390, 0.5, 71], [4530, 0.42, 72], [4660, 0.55, 73], [4800, 0.45, 74]]) house(c, x, HOR + 14, s, sd);
}
function house(c, x, y, s, sd) {
  const w = 160 * s, h = 110 * s;
  clay(c, lumpPoly([[x - w / 2, y], [x - w / 2, y - h], [x + w / 2, y - h], [x + w / 2, y]], sd, 1.5), C.house, { seed: sd, prints: 0 });
  clay(c, lumpPoly([[x - w / 2 - 14 * s, y - h + 4], [x, y - h - 80 * s], [x + w / 2 + 14 * s, y - h + 4]], sd + 1, 1.5), C.roof, { seed: sd + 1, prints: 0 });
  clayBlob(c, x, y - h - 52 * s, 50 * s, 18 * s, "#ffffff", 0, sd + 2, { shadow: false, prints: 0 }); // снег на крыше
  c.fillStyle = C.win; rrect(c, x - 22 * s, y - h * 0.68, 44 * s, 38 * s, 6 * s); c.fill();
}

// ---------- ближний мир ----------
function drawFloor(c, cam) {
  const x0 = cam.x - W / cam.z, x1 = cam.x + W / cam.z;
  const g = c.createLinearGradient(0, HOR, 0, 1500);
  g.addColorStop(0, "#e6eef8"); g.addColorStop(0.3, C.snow); g.addColorStop(1, "#dfe9f5");
  c.fillStyle = g; c.fillRect(x0 - 100, HOR + 20, x1 - x0 + 200, 1600);
  // размазанный пальцами снег: светлые и голубые дуги
  const r = mulberry32(17);
  c.save(); c.lineCap = "round";
  for (let i = 0; i < 70; i++) {
    const x = -400 + r() * 5600, y = HOR + 60 + r() * 700, l = 90 + r() * 240;
    if (x + l < x0 - 50 || x > x1 + 50) { r(); r(); continue; }
    c.strokeStyle = r() < 0.55 ? "rgba(255,255,255,0.7)" : "rgba(150,180,215,0.22)"; c.lineWidth = 8 + r() * 14;
    c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + l / 2, y - 8, x + l, y + 2); c.stroke();
  }
  c.restore();
  // кромка поля у горизонта — валик снега
  clay(c, lumpPoly([[x0 - 200, HOR + 40], [x0 - 200, HOR + 8], [(x0 + x1) / 2, HOR + 2], [x1 + 200, HOR + 10], [x1 + 200, HOR + 44]], 18, 2), "#eef3fa", { shadow: false, seed: 18, prints: 0, gloss: 0.3 });
}

// пруд: вода → лёд → под снегом; ice — доля замёрзшего, cover — доля снега, scrape — процарапанная полоса
const SNOW_ON_ICE = (() => { const r = mulberry32(303), a = []; for (let i = 0; i < 26; i++) a.push({ x: POND.x + (r() * 2 - 1) * POND.rx * 0.82, y: POND.y + (r() * 2 - 1) * POND.ry * 0.6, r: 26 + r() * 30, k: r() }); return a; })();
function drawPond(c, st) {
  const { x, y, rx, ry } = POND;
  // берег — валик снега вокруг
  clay(c, blob(x, y + 6, rx + 34, ry + 22, 0, 81, 0.03), C.snowD, { seed: 81, shadow: false, prints: 0, gloss: 0.25 });
  // вода
  clay(c, blob(x, y, rx, ry, 0, 82, 0.02), C.water, { seed: 82, shadow: false, gloss: 0.5, prints: 0 });
  if (st.ice > 0) {
    // лёд нарастает от берега к середине
    c.save();
    const s = blob(x, y, rx, ry, 0, 82, 0.02);
    c.clip(s.p);
    const k = 1 - easeOut(st.ice);
    const hole = new Path2D(); hole.rect(x - rx - 10, y - ry - 10, 2 * rx + 20, 2 * ry + 20);
    if (k > 0.01) hole.ellipse(x, y, rx * k, ry * k, 0, 0, TAU);
    c.fillStyle = C.ice; c.fill(hole, "evenodd");
    // глянец и узоры трещин
    const gl = c.createLinearGradient(x - rx, y - ry, x + rx * 0.4, y + ry);
    gl.addColorStop(0, "rgba(255,255,255,0.55)"); gl.addColorStop(0.5, "rgba(255,255,255,0.05)"); gl.addColorStop(1, "rgba(40,90,140,0.25)");
    c.globalAlpha = st.ice; c.fillStyle = gl; c.fill(hole, "evenodd");
    const r = mulberry32(83); c.strokeStyle = "rgba(255,255,255,0.75)"; c.lineWidth = 2.2; c.lineCap = "round";
    for (let i = 0; i < 18; i++) {
      const a = r() * TAU, d0 = 0.35 + r() * 0.5, len = 0.12 + r() * 0.25;
      if (d0 < k + 0.02) { r(); continue; }
      c.beginPath(); c.moveTo(x + Math.cos(a) * rx * d0, y + Math.sin(a) * ry * d0);
      c.lineTo(x + Math.cos(a + 0.1) * rx * (d0 + len), y + Math.sin(a + 0.1) * ry * (d0 + len)); c.stroke(); r();
    }
    // блик бежит по льду
    const sw = st.glint;
    if (sw > 0 && sw < 1) { const gx = x - rx + 2 * rx * sw; const bg = c.createLinearGradient(gx - 80, 0, gx + 80, 0);
      bg.addColorStop(0, "rgba(255,255,255,0)"); bg.addColorStop(0.5, "rgba(255,255,255,0.85)"); bg.addColorStop(1, "rgba(255,255,255,0)");
      c.globalAlpha = 1; c.fillStyle = bg; c.fillRect(gx - 80, y - ry, 160, 2 * ry); }
    c.restore();
  }
  // снег на льду: сначала отдельные комочки-лепёшки, потом сплошной слой
  if (st.lumps > 0 || st.cover > 0) {
    c.save(); c.clip(blob(x, y, rx, ry, 0, 82, 0.02).p);
    if (st.cover > 0) { c.globalAlpha = st.cover; clay(c, blob(x, y - 4, rx + 6, ry + 6, 0, 84, 0.02), C.snow, { shadow: false, seed: 84, gloss: 0.35 }); c.globalAlpha = 1; }
    for (let i = 0; i < SNOW_ON_ICE.length; i++) {
      const q = SNOW_ON_ICE[i], a = st.lumps * SNOW_ON_ICE.length - i;
      if (a <= 0) continue;
      const sq = springPop(clamp(a * 0.6, 0, 4));
      clayBlob(c, q.x, q.y, q.r * (0.6 + 0.6 * sq), q.r * 0.42 * (1.6 - 0.6 * sq), "#ffffff", 0, 400 + i, { prints: 0, sy: 4, sx: 2 });
    }
    // процарапанная копытами полоса — под снегом блестит лёд
    if (st.scrape > 0) {
      const sx0 = st.scrapeX0, sx1 = lerp(st.scrapeX0, st.scrapeX1, st.scrape);
      const p = new Path2D(); p.ellipse((sx0 + sx1) / 2, y - 6, Math.max(4, (sx1 - sx0) / 2 + 20), 20, 0, 0, TAU);
      c.fillStyle = C.ice; c.fill(p);
      c.fillStyle = "rgba(255,255,255,0.6)"; c.fillRect(sx0, y - 12, (sx1 - sx0) * 0.8, 4);
      clay(c, sausage(sx0 - 10, y - 26, 10, sx1 + 10, y - 26, 12, 87), "#ffffff", { seed: 87, prints: 0 });
      clay(c, sausage(sx0 - 10, y + 16, 9, sx1 + 10, y + 16, 11, 88), "#ffffff", { seed: 88, prints: 0 });
    }
    c.restore();
  }
}

function fir(c, x, y, s, sd, snowK = 1, shake = 0) {
  claySaus(c, x, y, 14 * s, x, y - 60 * s, 12 * s, C.trunk, sd);
  const tiers = [[0, 150, 120], [1, 118, 205], [2, 84, 280], [3, 50, 340]];
  for (const [i, w, h] of tiers) {
    const yy = y - 40 * s - i * 72 * s, sh = shake * Math.sin(i * 1.3 + shake * 30) * 6;
    const pts = [[x - w * s + sh, yy], [x + sh * 0.5, yy - 120 * s], [x + w * s + sh, yy]];
    clay(c, lumpPoly(pts.concat([[x + w * 0.4 * s, yy + 12 * s], [x - w * 0.4 * s, yy + 12 * s]]), sd + i * 7, 2), i % 2 ? C.firD : C.fir, { seed: sd + i * 7, prints: 1 });
    if (snowK > 0) { c.save(); c.globalAlpha = snowK; clay(c, lumpPoly([[x - w * 0.62 * s + sh, yy - 30 * s], [x + sh * 0.5, yy - 116 * s], [x + w * 0.55 * s + sh, yy - 34 * s], [x + sh * 0.2, yy - 46 * s]], sd + i * 7 + 3, 2), "#ffffff", { seed: sd + i * 7 + 3, prints: 0, shadow: false }); c.restore(); }
  }
}
function drawFence(c) {
  const { x0, x1, y } = FENCE;
  claySaus(c, x0 - 10, y - 70, 9, x1 + 10, y - 66, 9, C.woodD, 501);
  claySaus(c, x0 - 10, y - 30, 9, x1 + 10, y - 28, 9, C.woodD, 502);
  for (let i = 0, x = x0; x <= x1; i++, x += 64) {
    clay(c, lumpPoly([[x - 15, y], [x - 15, y - 100], [x, y - 120], [x + 15, y - 100], [x + 15, y]], 510 + i, 1.5), C.wood, { seed: 510 + i, prints: 0 });
    clayBlob(c, x, y - 116, 16, 8, "#ffffff", 0, 530 + i, { prints: 0, shadow: false });
  }
}
function drawHill(c) {
  const pts = [];
  for (let i = 0; i <= 24; i++) { const x = HILL.x - HILL.half - 60 + (i / 24) * (2 * HILL.half + 120); pts.push([x, hillY(x)]); }
  pts.push([HILL.x + HILL.half + 60, HILL.y + 30], [HILL.x - HILL.half - 60, HILL.y + 30]);
  clay(c, lumpPoly(pts, 601, 1.5), C.hill, { seed: 601, gloss: 0.35, rim: 30 });
}
function drawDrift(c) {
  const pts = [];
  for (let i = 0; i <= 16; i++) { const x = DRIFT.x - 200 + i * 25; pts.push([x, driftY(x)]); }
  pts.push([DRIFT.x + 200, DRIFT.y + 16], [DRIFT.x - 200, DRIFT.y + 16]);
  clay(c, lumpPoly(pts, 611, 1.5), "#f7faff", { seed: 611, gloss: 0.45, rim: 18 });
}
// указатель: pop 0..1 — выскакивает из снега; высокий — табличка на уровне головы всадника
const SIGN_H = 372;
function drawSign(c, pop, t, cap = 1, shake = 0) {
  if (pop <= 0) return;
  const { x, y } = SIGN, s = springBounce(pop), h = SIGN_H * s;
  c.save(); c.translate(x, y); c.rotate(0.06 * Math.sin(t * 3) * (1 - clamp(pop, 0, 1)) + shake);
  claySaus(c, 0, 0, 14, 0, -h, 11, C.wood, 621);
  if (s > 0.3) {
    const k = clamp((s - 0.3) / 0.7, 0, 1.3), yy = -h + 26;
    clay(c, lumpPoly([[-34, yy - 26 * k], [120 * k, yy - 26 * k], [160 * k, yy], [120 * k, yy + 26 * k], [-34, yy + 26 * k]], 622, 1.5), C.red, { seed: 622 });
    if (cap > 0) { c.save(); c.globalAlpha = cap; clayBlob(c, 40 * k, yy - 30 * k, 64 * k, 11, "#ffffff", 0, 623, { prints: 0, shadow: false }); c.restore(); }
  }
  c.restore();
  floorShadow(c, x + 10, y + 4, 40, 0.25);
}
// дорожка-колбаска раскатывается к деревне: k 0..1
function drawRoad(c, k) {
  if (k <= 0) return;
  const segs = []; let L = 0;
  for (let i = 1; i < ROAD.length; i++) { const d = Math.hypot(ROAD[i][0] - ROAD[i - 1][0], ROAD[i][1] - ROAD[i - 1][1]); segs.push(d); L += d; }
  let rem = L * easeInOut(k); const pts = [ROAD[0]];
  for (let i = 1; i < ROAD.length && rem > 0; i++) {
    const d = segs[i - 1], u = Math.min(1, rem / d); rem -= d;
    pts.push([lerp(ROAD[i - 1][0], ROAD[i][0], u), lerp(ROAD[i - 1][1], ROAD[i][1], u)]);
  }
  c.save(); c.lineCap = "round"; c.lineJoin = "round";
  const width = (p) => lerp(46, 10, clamp((ROAD[0][1] - p[1]) / 360, 0, 1));
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    c.strokeStyle = "#b9a07a"; c.lineWidth = width(a); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
    c.strokeStyle = "rgba(255,255,255,0.35)"; c.lineWidth = width(a) * 0.3; c.beginPath(); c.moveTo(a[0], a[1] - width(a) * 0.2); c.lineTo(b[0], b[1] - width(a) * 0.2); c.stroke();
  }
  // валик на конце — раскатываемый ком
  const e = pts[pts.length - 1];
  if (k < 1) clayBlob(c, e[0], e[1] - width(e) * 0.4, width(e) * 0.7, width(e) * 0.6, "#c9ad84", 0, 631, { prints: 0 });
  c.restore();
}
