// ---------- Мир: небо из вихрей мазков, нива, солнце, месяц, змей ----------
// Мировые координаты: горизонт на HZ, запад (закат) слева, восток справа. Вид V = {x, y, z}: точка (x, y) в центре кадра.
const HZ = 560;
const P = (V, x, y) => [(x - V.x) * V.z + W / 2, (y - V.y) * V.z + H / 2];
const EV = CFG.ev;

// ---- время суток: 0 — жаркий день, .5 — золотой вечер, .7 — сумерки, .85 — солнце зажмурилось, 1 — рассвет
function todAt(t) {
  return ramp([[0, [0, 0, 0]], [EV.L5 - 1.2, [0, 0, 0]], [EV.L5 + 0.4, [0.5, 0, 0]], [EV.L7, [0.6, 0, 0]], [EV.L9, [0.7, 0, 0]],
    [EV.smezh, [0.72, 0, 0]], [EV.smezh + 0.9, [0.86, 0, 0]], [EV.oko - 0.1, [0.86, 0, 0]], [EV.oko + 0.9, [1, 0, 0]]], t)[0];
}
const ZEN = [[0, C.cobalt], [0.5, [70, 80, 170]], [0.7, [38, 40, 104]], [0.86, [20, 22, 62]], [1, [70, 110, 190]]];
const HOR_W = [[0, [176, 214, 236]], [0.5, [246, 176, 96]], [0.7, [232, 92, 52]], [0.86, [120, 48, 70]], [1, [250, 196, 140]]];
const HOR_E = [[0, [176, 214, 236]], [0.5, [190, 160, 190]], [0.7, [70, 70, 140]], [0.86, [80, 50, 96]], [1, [252, 214, 120]]];
function skyCol(x, y, td) {
  const v = clamp((y + 700) / (HZ + 700)); // 0 — зенит, 1 — горизонт
  const e = clamp((x + 600) / 3200);       // 0 — запад, 1 — восток
  const hor = mix(ramp(HOR_W, td), ramp(HOR_E, td), e);
  let c = mix(ramp(ZEN, td), hor, Math.pow(v, 1.5));
  // заря на востоке: летом закат и восход горят одновременно
  const ke = ramp([[0.55, [0, 0, 0]], [0.7, [0.55, 0, 0]], [0.86, [0.35, 0, 0]], [1, [0.9, 0, 0]]], td)[0];
  if (ke > 0) c = mix(c, [252, 206, 150], ke * Math.exp(-Math.pow((x - 2300) / 800, 2)) * Math.pow(v, 3));
  return c;
}
// солнце: дуга с запада вниз, под горизонтом на север, восход на востоке
function sunPos(t) {
  const td = todAt(t);
  if (t < EV.oko - 0.2) return [lerp(lerp(560, 120, inv(0, 0.5, td)), -260, inv(0.5, 0.86, td)), lerp(lerp(40, 330, inv(0, 0.5, td)), HZ + 90, inv(0.5, 0.86, td))];
  const u = easeOut(inv(EV.oko - 0.2, EV.oko + 1.6, t));
  return [2300, lerp(HZ + 120, HZ - 120, u)];
}

// ---- мазки неба: сетка с дрожанием, направление по полю вихрей
const SKY = [];
(() => {
  const st = 36; let n = 0;
  for (let y = -760; y < HZ + 10; y += st * 0.62) for (let x = -2400; x < 6200; x += st) {
    n++;
    SKY.push([x + (hash(n) - 0.5) * st * 0.9, y + (hash(n * 1.3) - 0.5) * st * 0.5, 40 + hash(n * 2.7) * 34, 11 + hash(n * 3.3) * 6, n]);
  }
})();
const SWIRLS = [[300, -260, 260, 1], [1350, -120, 300, -1], [2500, -300, 280, 1], [-900, -150, 260, -1], [3500, -150, 300, 1]];
function flowAng(x, y, t) {
  let vx = 1, vy = 0.18 * Math.sin(x * 0.003 + y * 0.004 + t * 0.25);
  for (const [cx, cy, r, s] of SWIRLS) {
    const dx = x - cx, dy = y - cy, k = Math.exp(-(dx * dx + dy * dy) / (r * r)) * 2.2;
    vx += -dy / r * k * s; vy += dx / r * k * s;
  }
  return Math.atan2(vy, vx);
}
function drawSky(g, V, t, opt = {}) {
  const td = todAt(t);
  // подложка — сплошной градиент, чтобы между мазками не было дыр
  reset(g);
  const [, y0] = P(V, 0, -760), [, y1] = P(V, 0, HZ);
  const gr = g.createLinearGradient(0, y0, 0, y1 + 40);
  gr.addColorStop(0, css(skyCol(V.x, -700, td))); gr.addColorStop(1, css(skyCol(V.x, HZ, td)));
  g.fillStyle = gr; g.fillRect(0, 0, W, Math.max(0, y1 + 60));
  const x0 = V.x - W / 2 / V.z - 80, x1 = V.x + W / 2 / V.z + 80, ya = V.y - H / 2 / V.z - 60, yb = Math.min(HZ + 10, V.y + H / 2 / V.z + 60);
  const sz = clamp(V.z, 0.55, 2.2);
  for (const [sx, sy, len, w, n] of SKY) {
    if (sy < ya || sy > yb) continue;
    const drift = ((t * 22 + hash(n * 9) * 60) % 60) - 30;
    const a = flowAng(sx, sy, t);
    const x = sx + Math.cos(a) * drift, y = sy + Math.sin(a) * drift;
    if (x < x0 || x > x1) continue;
    let col = jit(skyCol(x, y, td), n, 26);
    // светлые завитки вокруг солнца
    const [sux, suy] = sunPos(t), ds = Math.hypot(x - sux, y - suy);
    if (ds < 520) col = mix(col, td > 0.75 && td < 0.95 ? col : C.lemon, (1 - ds / 520) * 0.55);
    const [px, py] = P(V, x, y);
    const fade = Math.min(1, Math.abs(drift) < 26 ? 1 : (30 - Math.abs(drift)) / 4);
    dab(g, px, py, len * sz, w * sz, a, col, 0.92 * fade);
  }
  reset(g);
  if (td > 0.55) drawStars(g, V, t, td);
}
function drawStars(g, V, t, td) {
  const k = inv(0.6, 0.86, td) * (1 - inv(0.9, 1, td));
  if (k <= 0) return;
  for (let i = 0; i < 70; i++) {
    const x = 400 + hash(i * 4.1) * 3600, y = -700 + hash(i * 2.9) * 900;
    const [px, py] = P(V, x, y);
    if (px < -20 || px > W + 20 || py < -20 || py > H) continue;
    const tw = 0.6 + 0.4 * Math.sin(t * 3 + i);
    dab(g, px, py, 14 * V.z, 5 * V.z, 0.3, C.lemon, k * tw);
    dab(g, px, py, 14 * V.z, 5 * V.z, 1.9, C.lemon, k * tw);
  }
  reset(g);
}

// ---- солнце: круг из мазков по окружности и кольца ореола (как у Ван Гога)
function drawSun(g, cx, cy, r, t, heat = 1, a = 1) {
  reset(g);
  for (let ring = 3; ring >= 1; ring--) {
    const rr0 = r * (1 + ring * 0.55);
    const n = 26 + ring * 10;
    for (let i = 0; i < n; i++) {
      const ang = i / n * TAU + t * 0.25 * (ring % 2 ? 1 : -1) + ring;
      dab(g, cx + Math.cos(ang) * rr0, cy + Math.sin(ang) * rr0, r * 0.42, r * 0.14, ang + Math.PI / 2, jit(mix(C.lemon, C.cad, ring / 3), i + ring * 50, 30), a * (0.55 - ring * 0.1) * heat);
    }
  }
  g.globalAlpha = a; reset(g); g.globalAlpha = a;
  g.fillStyle = css(C.cad); g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill();
  for (let k = 0; k < 3; k++) {
    const rr0 = r * (0.85 - k * 0.3), n = 18 - k * 5;
    for (let i = 0; i < n; i++) {
      const ang = i / n * TAU - t * 0.6 + k;
      dab(g, cx + Math.cos(ang) * rr0, cy + Math.sin(ang) * rr0, r * 0.36, r * 0.13, ang + Math.PI / 2, jit(k === 2 ? C.white : C.lemon, i + k * 30, 24), a);
    }
  }
  reset(g);
}

// ---- месяц: серп с лицом. look: −1…1 куда глядит; brow: 0…1 удивление; peek: 0…1 насколько вышел из-за облака
function drawMoon(g, cx, cy, r, t, o = {}) {
  const a = o.a === undefined ? 1 : o.a;
  reset(g); g.globalAlpha = a;
  // серп: круг минус смещённый круг (рисуем на отдельном слое)
  const L = moonLayer(r);
  g.drawImage(L, cx - r * 1.3, cy - r * 1.3);
  // лицо на внутренней кромке серпа
  const ex = cx - r * 0.53 + (o.look || 0) * r * 0.03, ey = cy - r * 0.2;
  const brow = o.brow || 0, open = o.blink ? 0.15 : 1;
  g.fillStyle = css([90, 70, 60], a);
  g.beginPath(); g.ellipse(ex, ey, r * 0.075, r * 0.11 * open * (1 + brow * 0.45), 0, 0, TAU); g.fill();
  g.fillStyle = css(C.white, a); g.beginPath(); g.arc(ex - r * 0.02, ey - r * 0.04, r * 0.025, 0, TAU); g.fill();
  g.strokeStyle = css([120, 90, 70], a); g.lineWidth = r * 0.035; g.lineCap = "round";
  g.beginPath(); g.moveTo(ex - r * 0.1, ey - r * (0.2 + brow * 0.12)); g.quadraticCurveTo(ex + r * 0.01, ey - r * (0.27 + brow * 0.16), ex + r * 0.1, ey - r * (0.19 + brow * 0.1)); g.stroke();
  // рот: робкая улыбка или «о» от изумления
  if (brow > 0.4) { g.fillStyle = css([150, 80, 70], a); g.beginPath(); g.ellipse(cx - r * 0.44, cy + r * 0.3, r * 0.05, r * 0.07 * brow, 0, 0, TAU); g.fill(); }
  else { g.beginPath(); g.moveTo(cx - r * 0.56, cy + r * 0.27); g.quadraticCurveTo(cx - r * 0.45, cy + r * 0.35, cx - r * 0.34, cy + r * 0.26); g.stroke(); }
  // румянец смущения
  g.fillStyle = css(C.rose, 0.45 * a * (o.blush || 0)); g.beginPath(); g.ellipse(cx - r * 0.64, cy + r * 0.08, r * 0.08, r * 0.05, 0, 0, TAU); g.fill();
  reset(g);
}
const MOON_CACHE = {};
function moonLayer(r) {
  const key = Math.round(r);
  if (MOON_CACHE[key]) return MOON_CACHE[key];
  const c = document.createElement("canvas"); c.width = c.height = Math.ceil(r * 2.6);
  const x = c.getContext("2d"), cx = r * 1.3, cy = r * 1.3;
  x.fillStyle = css(C.lemon); x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.fill();
  x.save(); x.beginPath(); x.arc(cx, cy, r * 0.99, 0, TAU); x.clip();
  for (let i = 0; i < 30; i++) {
    const a = hash(i * 3.7) * TAU, d = Math.sqrt(hash(i * 1.9)) * r * 0.85;
    dab(x, cx + Math.cos(a) * d, cy + Math.sin(a) * d, r * 0.38, r * 0.12, Math.PI / 2 + Math.cos(a) * 0.3, jit(mix(C.lemon, C.cream, hash(i)), i, 12), 0.9);
  }
  x.restore();
  reset(x);
  x.globalCompositeOperation = "destination-out";
  x.beginPath(); x.arc(cx + r * 0.55, cy - r * 0.1, r * 0.86, 0, TAU); x.fill();
  x.globalCompositeOperation = "source-over";
  return (MOON_CACHE[key] = c);
}

// облако-клубок из мазков
function drawCloud(g, cx, cy, s, col, seed, a = 1) {
  // клубы: 5 кругов, каждый закручен мазками по окружности
  for (let k = 0; k < 6; k++) {
    const bx = cx + (k - 2.5) * 70 * s + (hash(seed + k) - 0.5) * 30 * s, by = cy - Math.sin((k + 0.5) / 6 * Math.PI) * 50 * s;
    const R = (46 + hash(seed + k * 3) * 26) * s;
    reset(g); g.globalAlpha = a; g.fillStyle = css(shade(col, -0.08)); g.beginPath(); g.ellipse(bx, by, R * 1.02, R * 0.84, 0, 0, TAU); g.fill(); g.globalAlpha = 1;
  }
  for (let k = 0; k < 6; k++) {
    const bx = cx + (k - 2.5) * 70 * s + (hash(seed + k) - 0.5) * 30 * s, by = cy - Math.sin((k + 0.5) / 6 * Math.PI) * 50 * s;
    const R = (46 + hash(seed + k * 3) * 26) * s;
    for (let i = 0; i < 16; i++) {
      const an = i / 16 * TAU + k, rr0 = R * (0.35 + 0.6 * hash(seed + k * 16 + i));
      const x = bx + Math.cos(an) * rr0, y = by + Math.sin(an) * rr0 * 0.8;
      dab(g, x, y, 40 * s, 17 * s, (hash(seed + i * 5 + k) - 0.5) * 0.7, jit(shade(col, (by - y) / R * 0.25), seed + k * 16 + i, 18), a);
    }
  }
  reset(g);
}

// ---- нива: ряды колосьев в перспективе; ветер гонит золотые волны
const ROWS = [];
(() => {
  let n = 0;
  for (let i = 0; i < 46; i++) {
    const u = Math.pow((i + 1) / 46, 1.0);
    ROWS.push({ y: HZ + 700 * Math.pow(u, 1.7), s: 0.16 + u * 1.25, step: 10 + u * 46, seed: ++n * 101 });
  }
})();
function fieldLight(td) { return ramp([[0, [1, 0, 0]], [0.5, [0.95, 0, 0]], [0.7, [0.78, 0, 0]], [0.86, [0.4, 0, 0]], [1, [0.97, 0, 0]]], td)[0]; }
const RYE_DAY = [[0, C.gold], [0.5, [236, 146, 40]], [0.7, [196, 96, 50]], [0.86, [70, 60, 90]], [1, [240, 170, 70]]];
// волна ветра 0…1 в точке (x, глубина u) в момент t
function windWave(x, y, t) {
  const gust = windGust(t);
  return gust * Math.sin(x * 0.0042 - t * 3.1 + y * 0.006) * 0.5 + 0.5 * gust;
}
function windGust(t) {
  return 0.35 + 0.65 * ease(inv(EV.L2 - 0.5, EV.gonit, t)) * (1 - 0.6 * ease(inv(EV.E4 + 0.3, EV.L5 + 1.5, t))) + 0.25 * ease(inv(EV.oko, EV.oko + 1, t));
}
function drawField(g, V, t, opt = {}) {
  const td = todAt(t), lit = fieldLight(td), base = ramp(RYE_DAY, td);
  const [, hy] = P(V, 0, HZ);
  // подложка поля и дальний лес
  reset(g);
  const gr = g.createLinearGradient(0, hy, 0, H);
  gr.addColorStop(0, css(shade(base, -0.2))); gr.addColorStop(1, css(shade(base, -0.45)));
  g.fillStyle = gr; g.fillRect(0, Math.max(0, hy - 2), W, H);
  drawTreeLine(g, V, t, td);
  if (opt.stooks) drawStooks(g, V, t, td, opt.stooks);
  const x0 = V.x - W / 2 / V.z - 60, x1 = V.x + W / 2 / V.z + 60;
  for (const R of ROWS) {
    const [, py] = P(V, 0, R.y);
    if (py < -40 || py > H + 160) continue;
    const s = R.s * V.z;
    const step = R.step;
    const start = Math.floor(x0 / step) * step;
    for (let x = start; x < x1; x += step) {
      const k = Math.round(x / step) + R.seed;
      const xx = x + (hash(k) - 0.5) * step * 0.8;
      const wv = windWave(xx, R.y, t);
      const bend = -Math.PI / 2 + 0.12 + wv * 0.55 + (hash(k * 1.3) - 0.5) * 0.25;
      let col = jit(base, k, 34);
      // гребень волны — золотой перелив, впадина — тень
      col = wv > 0.62 ? mix(col, C.lemon, (wv - 0.62) * 1.6 * lit) : shade(col, -(0.62 - wv) * 0.35);
      col = shade(col, (lit - 1) * 0.9);
      if (opt.mezha && Math.abs(mezhaD(xx, R.y, opt.mezha)) < 26 + R.s * 30) col = mix(col, C.green, 0.7);
      const [px, py2] = P(V, xx, R.y + (hash(k * 2.1) - 0.5) * R.step * 0.25);
      const len = 46 * s, w = 11 * s;
      dab(g, px + Math.cos(bend) * len * 0.5, py2 + Math.sin(bend) * len * 0.5, len, w, bend, col);
      // колос — светлый мазок на конце
      if (R.s > 0.5) dab(g, px + Math.cos(bend) * len * 1.05, py2 + Math.sin(bend) * len * 1.05, len * 0.45, w * 1.25, bend, shade(col, 0.25 * lit));
      // васильки
      if (hash(k * 7.7) > 0.985 && R.s > 0.35) dab(g, px, py2 - len * 0.3, 10 * s, 10 * s, 0, shade([60, 90, 220], (lit - 1) * 0.8));
    }
  }
  reset(g);
}
// межа между нивами — косая полоса травы; знак — с какой стороны
const MEZHA_X = 1500;
function mezhaD(x, y, per) { const q = x + (y - HZ) * 0.7 - MEZHA_X; return ((q % per) + per * 1.5) % per - per / 2; }
function drawTreeLine(g, V, t, td) {
  const col = shade(mix([60, 90, 80], [40, 40, 80], inv(0.5, 0.86, td)), td > 0.95 ? 0 : 0);
  for (let i = 0; i < 150; i++) {
    const x = -2400 + i * 46 + hash(i) * 30;
    const hgt = 14 + hash(i * 3.1) * 26 + (i % 23 === 7 ? 30 : 0);
    const [px, py] = P(V, x, HZ - hgt * 0.4);
    if (px < -80 || px > W + 80) continue;
    dab(g, px, py, hgt * V.z * 1.2, 30 * V.z, -Math.PI / 2 + 0.2, jit(col, i, 26));
  }
  // деревня с церковкой на востоке
  const [cx, cy] = P(V, 2650, HZ - 6);
  if (cx > -200 && cx < W + 200) {
    const s = V.z, roof = shade([150, 70, 60], -inv(0.5, 0.86, td) * 0.5);
    for (let i = 0; i < 5; i++) { dab(g, cx + i * 46 * s, cy - 10 * s, 36 * s, 22 * s, 0, shade([200, 170, 130], -inv(0.5, 0.86, td) * 0.6)); dab(g, cx + i * 46 * s, cy - 26 * s, 40 * s, 12 * s, 0, roof); }
    dab(g, cx - 60 * s, cy - 30 * s, 60 * s, 18 * s, -Math.PI / 2, shade(C.cream, -inv(0.5, 0.86, td) * 0.6));
    dab(g, cx - 60 * s, cy - 66 * s, 22 * s, 18 * s, 0, shade([90, 130, 80], -inv(0.5, 0.86, td) * 0.6));
    dab(g, cx - 60 * s, cy - 82 * s, 14 * s, 4 * s, -Math.PI / 2, C.gold);
  }
  reset(g);
}
// копны сжатого хлеба
function drawStooks(g, V, t, td, k) {
  const lit = fieldLight(td);
  for (let i = 0; i < 16; i++) {
    const x = -200 + i * 260 + hash(i) * 140, y = HZ + 30 + hash(i * 2.3) * 300;
    const sc = 0.6 + (y - HZ) / 120;
    const [px, py] = P(V, x, y);
    const s = sc * V.z, a = k;
    reset(g); g.fillStyle = css(shade(C.sienna, (lit - 1) * 0.9 - 0.1));
    g.beginPath(); g.moveTo(px - 36 * s, py); g.quadraticCurveTo(px - 20 * s, py - 50 * s, px, py - 74 * s); g.quadraticCurveTo(px + 20 * s, py - 50 * s, px + 36 * s, py); g.closePath(); g.fill();
    for (let j = 0; j < 7; j++) dab(g, px + (j - 3) * 9 * s, py - 30 * s, 64 * s, 13 * s, -Math.PI / 2 + (j - 3) * 0.16, shade(jit(C.gold, i * 9 + j, 30), (lit - 1) * 0.9), a);
    dab(g, px, py - 66 * s, 30 * s, 16 * s, 0, shade(C.sienna, (lit - 1) * 0.9), a);
  }
  reset(g);
}

// ---- змей: ромб с хвостом бантиков; нитка до руки
function drawKite(g, x, y, s, ang, t, hand) {
  if (hand) {
    reset(g);
    g.strokeStyle = "rgba(255,248,230,0.85)"; g.lineWidth = Math.max(1.5, 2.2 * s);
    g.beginPath(); g.moveTo(hand[0], hand[1]);
    g.quadraticCurveTo((hand[0] + x) / 2 + 40 * s, Math.max(hand[1], y) - 20 * s + Math.abs(hand[0] - x) * 0.18, x, y + 40 * s); g.stroke();
  }
  // хвост
  reset(g);
  let px = x, py = y + 60 * s;
  for (let i = 0; i < 7; i++) {
    const nx = px - 22 * s + Math.sin(t * 6 + i * 0.9) * 12 * s, ny = py + 22 * s;
    g.strokeStyle = "rgba(255,240,220,0.9)"; g.lineWidth = 2 * s; g.beginPath(); g.moveTo(px, py); g.lineTo(nx, ny); g.stroke();
    dab(g, nx, ny, 16 * s, 9 * s, 0.6, i % 2 ? C.cerul : C.verm); dab(g, nx, ny, 16 * s, 9 * s, -0.6, i % 2 ? C.cerul : C.verm);
    reset(g); px = nx; py = ny;
  }
  const c = Math.cos(ang), sn = Math.sin(ang);
  const pt = (u, v) => [x + (u * c - v * sn) * s, y + (u * sn + v * c) * s];
  const top = pt(0, -60), rt = pt(42, -6), bot = pt(0, 64), lf = pt(-42, -6);
  const cen = pt(0, -6);
  const tri2 = (a, b, col) => { reset(g); g.fillStyle = css(col); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(cen[0], cen[1]); g.closePath(); g.fill(); };
  tri2(top, rt, C.verm); tri2(rt, bot, C.cad); tri2(bot, lf, C.verm); tri2(lf, top, C.cad);
  for (let i = 0; i < 8; i++) { const u = (hash(i) - 0.5) * 50, v = (hash(i * 3) - 0.5) * 90; const p = pt(u * 0.6, v * 0.7); dab(g, p[0], p[1], 26 * s, 7 * s, ang + 0.5, jit(i % 2 ? C.verm : C.cad, i, 30), 0.8); }
  reset(g); g.strokeStyle = css(C.umber); g.lineWidth = 3 * s;
  g.beginPath(); g.moveTo(top[0], top[1]); g.lineTo(rt[0], rt[1]); g.lineTo(bot[0], bot[1]); g.lineTo(lf[0], lf[1]); g.closePath(); g.stroke();
  g.beginPath(); g.moveTo(top[0], top[1]); g.lineTo(bot[0], bot[1]); g.moveTo(lf[0], lf[1]); g.lineTo(rt[0], rt[1]); g.stroke();
  reset(g);
}
