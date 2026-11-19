// ---------- Мир: небо, дальний ельник, деревья, земля с листьями, падающие листья ----------
// Мир в единицах 320×150 (буфер 960×450, сетка ×3; нижние 30 единиц экрана — полоса почвы со строками, она рисуется отдельно).
const WH = 150, GY = 132; // высота мира и линия земли
const PAL = {
  sky: ["#3f86d6", "#5aa0e2", "#79b8ec", "#9bcdf2", "#bfe0f6", "#dff0f8"],
  far: "#2f6470", farD: "#24505b", farL: "#3f7a84",
  hill: "#6f8f5a",
  birch: "#efe9dc", birchD: "#3a3430",
  bark: "#5a3a26", barkD: "#3e2618",
  gold: ["#ffd23f", "#f6b21b", "#e8901a", "#ffe78a"],
  rust: ["#d8661e", "#b84a18", "#8f3414", "#f0904a"],
  crim: ["#d8344a", "#b02638", "#ef6a5a", "#8a1c30"],
  green: ["#5aa844", "#3f8a36", "#86c85a", "#2e6a2c"],
  ground: "#5a3e2a", groundD: "#402a1c", wet: "#3e2c22", puddle: "#9cc8e6", puddleD: "#6aa0c8",
  grass: "#8a8a3a", grassD: "#6a6a2a", moss: "#5e8a3a", mossD: "#46702c",
  frost: "#e6f4ff", frostD: "#b8d8ee",
};
const LEAFC = ["#ffd23f", "#f6b21b", "#e8901a", "#d8661e", "#d8344a", "#ffe78a", "#b84a18"];

// --- небо: полосы с дизерингом на стыках; season меняет цвета ---
function drawSky(c, o) {
  const cols = o.night ? ["#0e1430", "#141c40", "#1a2450", "#202c5c", "#28346a", "#303c74"]
    : o.season === "summer" ? ["#3a8ae0", "#4f9ae6", "#68aeec", "#86c2f0", "#a6d4f4", "#c8e6f8"]
    : o.season === "spring" ? ["#6aa6dc", "#80b6e4", "#98c6ea", "#b0d6f0", "#c8e2f4", "#e2f0f8"] : PAL.sky;
  const top = -40 + (o.camY || 0) * 0.2, bandH = (WH + 40 - 18) / cols.length;
  rect(c, 0, 0, LW, WH, cols[0]);
  for (let i = 1; i < cols.length; i++) {
    const y = R(top + i * bandH);
    rect(c, 0, y, LW, WH - y, cols[i]);
    dither(c, 0, y - 2, LW, 2, cols[i], 0);
  }
  if (o.night) { // звёзды
    for (let i = 0; i < 60; i++) {
      const x = R(hash(i * 3.1) * LW), y = R(hash(i * 7.7) * 90);
      if ((Math.sin(o.t * (2 + hash(i) * 3) + i) > -0.3)) { dp(c, x, y, i % 5 ? "#c8d4ff" : "#ffffff", i % 5 ? 2 : 3); if (i % 7 === 0) { dp(c, x - 0.67, y + 0.33, "#8090c0", 1); dp(c, x + 1, y + 0.33, "#8090c0", 1); } }
    }
    disc(c, 262, 26, 9, "#f4f0d0"); disc(c, 266, 23, 8, cols[1]); // месяц
    return;
  }
  // солнце: бледный диск с лучами-пикселями
  const sx = 258 - (o.cam || 0) * 0.02, sy = 30 + (o.camY || 0) * 0.2;
  disc(c, sx, sy, 12, "#fff0c0"); disc(c, sx, sy, 11, "#fff6d0"); disc(c, sx, sy, 9, "#fffbe8");
  for (let k = 0; k < 16; k++) {
    const a = k * TAU / 16 + (o.t || 0) * 0.2, r1 = 13.5 + (k % 2) * 2;
    line(c, sx + Math.cos(a) * r1, sy + Math.sin(a) * r1, sx + Math.cos(a) * (r1 + 1.5), sy + Math.sin(a) * (r1 + 1.5), "#fff6d0", 0.67);
  }
  // облака
  for (let i = 0; i < 4; i++) {
    const x = ((i * 97 + 30 - (o.cam || 0) * 0.06 + (o.t || 0) * 2) % 400 + 400) % 400 - 40;
    const y = 18 + i * 11 + (o.camY || 0) * 0.25;
    cloud(c, x, y, 10 + (i % 3) * 4);
  }
}
function cloud(c, x, y, w) {
  ell(c, x, y + 0.6, w, 3.0, "#d6e8f6");
  ell(c, x, y, w, 3.2, "#ffffff"); ell(c, x - w * 0.4, y - 2, w * 0.45, 3, "#ffffff"); ell(c, x + w * 0.3, y - 3, w * 0.4, 3.4, "#ffffff");
  ell(c, x + w * 0.2, y - 4.2, w * 0.2, 1.2, "#ffffff");
}

// --- дальний ельник на холме (параллакс 0.15) ---
function drawFar(c, o) {
  const off = (o.cam || 0) * 0.15, cy = (o.camY || 0) * 0.5;
  const winter = o.season === "winter";
  const base = 112 + cy;
  // холм
  const hillC = o.night ? "#1c2a3a" : winter ? "#c8d8e8" : o.season === "summer" ? "#5e9a50" : PAL.hill;
  for (let x = 0; x < LW; x += 1 / K) {
    const wx = x + off, h = Math.sin(wx * 0.021) * 4 + Math.sin(wx * 0.047 + 1) * 2;
    rect(c, x, base + h, 1 / K, WH - base - h, hillC);
    if (hash(Math.floor(wx * K) * 0.37) > 0.93) dp(c, x, base + h + 1 + hash(wx) * 6, mix(hillC, "#000000", 0.12), 1);
  }
  for (let i = -2; i < 26; i++) {
    const k = Math.floor(off / 16) + i, x = k * 16 - off + hash(k) * 8, h = 18 + hash(k * 3.3) * 14;
    const y = base + Math.sin((x + off) * 0.021) * 4 - 1;
    spruce(c, x, y, h, o.night ? "#16233a" : winter ? "#5a7a8a" : PAL.far, o.night ? "#101a2c" : PAL.farD, winter);
  }
}
function spruce(c, x, y, h, col, colD, snow) {
  // ярусы лап: ширина растёт вниз, на стыке ярусов — короткая «ступенька»
  for (let j = 0; j < h; j += 1 / K) {
    const tier = (j % 4) / 4, w = (j / h) * h * 0.36 + 0.6 + tier * 1.1;
    rect(c, x - w, y - h + j, w, 1 / K, colD); rect(c, x, y - h + j, w + 0.34, 1 / K, col);
    if (snow && tier < 0.25) rect(c, x - w + 0.6, y - h + j, w * 1.3, 1 / K, "#eef6ff");
  }
  rect(c, x - 0.34, y - 1, 0.67, 1.3, "#3a2a20");
}

// --- деревья: ствол, ветки, крона из пятен; bare 0…1 — сколько листьев облетело ---
function crownColors(kind, season) {
  if (season === "summer" || season === "spring") return PAL.green;
  return kind === "birch" ? PAL.gold : kind === "aspen" ? PAL.crim : PAL.rust;
}
function tree(c, x, y, h, kind, seed, o, scale) {
  const sc = scale || 1, bare = o.bare || 0, season = o.season;
  const tw = kind === "oak" ? 4 * sc : 3 * sc;
  const trunkC = kind === "birch" ? PAL.birch : kind === "aspen" ? "#8a9a86" : PAL.bark;
  const trunkD = kind === "birch" ? PAL.birchD : kind === "aspen" ? "#5e6e5c" : PAL.barkD;
  rect(c, x - tw / 2, y - h, tw, h, trunkC);
  rect(c, x + tw / 2 - 1, y - h, 1, h, kind === "birch" ? "#c8c0b0" : trunkD);
  rect(c, x - tw / 2, y - h, 0.34, h, kind === "birch" ? "#ffffff" : mix(trunkC, "#ffffff", 0.2));
  if (kind === "birch") for (let j = 4; j < h; j += 4) rect(c, x - tw / 2 + (hash(seed + j) > 0.5 ? 0 : 0.67), y - h + j + hash(seed * 2 + j) * 3, 1.4 + hash(seed + j * 3) * 1.2, 0.67, PAL.birchD);
  else for (let j = 2; j < h; j += 1.7) dp(c, x - tw / 2 + 0.6 + hash(seed + j) * (tw - 1.4), y - h + j, trunkD, 1, 2 + Math.floor(hash(seed * 3 + j) * 3));
  // ветки
  const top = y - h;
  for (let k = 0; k < 6; k++) {
    const by = top + 6 * sc + k * h * 0.09, side = k % 2 ? 1 : -1, len = (8 + hash(seed + k * 5) * 8) * sc;
    line(c, x, by, x + side * len, by - len * 0.6, trunkD, 1);
    line(c, x + side * len * 0.6, by - len * 0.36, x + side * len * 0.8, by - len * 0.9, trunkD, 0.67);
    line(c, x + side * len * 0.85, by - len * 0.51, x + side * len * 1.05, by - len * 0.62, trunkD, 0.34);
  }
  if (season === "winter") { // снег на ветках
    for (let k = 0; k < 6; k++) { const by = top + 6 * sc + k * h * 0.09, side = k % 2 ? 1 : -1; rect(c, x + side * 6 * sc - 2, by - 4 * sc, 5, 1, "#f4f8ff"); }
    return;
  }
  // крона
  const cols = crownColors(kind, season);
  const n = kind === "oak" ? 16 : 13;
  for (let k = 0; k < n; k++) {
    const keep = hash(seed * 1.7 + k * 3.1);
    if (keep < bare) continue;
    const a = hash(seed + k * 2.3) * TAU, r = hash(seed + k * 4.1) * 13 * sc;
    const cx = x + Math.cos(a) * r * 1.2, cy = top + 10 * sc + Math.sin(a) * r * 0.75;
    const rr = (4 + hash(seed + k) * 4) * sc * (1 - bare * 0.4);
    disc(c, cx + rr * 0.12, cy + rr * 0.15, rr, cols[2 % cols.length]);
    disc(c, cx, cy, rr * 0.94, cols[k % 2 ? 1 : 0]);
    disc(c, cx - rr * 0.3, cy - rr * 0.35, rr * 0.45, cols[3 % cols.length === 3 ? 3 : 2]);
    if (season === "spring") disc(c, cx, cy, rr * 0.5, "#a8dc78");
    // фактура: отдельные листочки по мелкой сетке
    const nd = Math.min(18, R(rr * rr * 0.5));
    for (let q = 0; q < nd; q++) {
      const qa = hash(seed + k * 9.1 + q * 1.7) * TAU, qr = Math.sqrt(hash(seed * 0.7 + k + q * 2.9)) * rr * 0.92;
      const qc = q % 3 === 0 ? cols[3 % cols.length] : q % 3 === 1 ? cols[2 % cols.length] : cols[k % 2 ? 0 : 1];
      dp(c, cx + Math.cos(qa) * qr, cy + Math.sin(qa) * qr, qc, 2, 1);
    }
  }
  // искры-листья по краю кроны
  for (let k = 0; k < 14; k++) {
    if (hash(seed * 3.9 + k) < bare) continue;
    const a = hash(seed + k * 7.3) * TAU, r = (12 + hash(seed + k * 1.9) * 6) * sc;
    dp(c, x + Math.cos(a) * r * 1.2, top + 10 * sc + Math.sin(a) * r * 0.7, cols[2], 2);
  }
}

// средний ряд деревьев (параллакс 0.45) и ближний (1.0)
const TREE_KINDS = ["birch", "aspen", "birch", "oak", "birch", "aspen", "oak"];
function drawMid(c, o) {
  const off = (o.cam || 0) * 0.45, cy = (o.camY || 0) * 0.75, sp = 34;
  for (let i = -2; i < 13; i++) {
    const k = Math.floor(off / sp) + i, x = k * sp - off + hash(k * 1.3) * 14;
    const kind = TREE_KINDS[((k % 7) + 7) % 7];
    tree(c, x, 124 + cy, 44 + hash(k * 2.1) * 18, kind, k * 11.3, o, 0.8);
  }
}
function drawNear(c, o) {
  if (o.noNear) return;
  const cam = o.cam || 0, cy = o.camY || 0, sp = 150;
  for (let i = -1; i < 4; i++) {
    const k = Math.floor(cam / sp) + i, x = k * sp - cam + 40 + hash(k * 5.7) * 50;
    if (o.nearSkip && o.nearSkip(k * sp + 40 + hash(k * 5.7) * 50)) continue;
    const kind = TREE_KINDS[((k * 3 + 1) % 7 + 7) % 7];
    tree(c, x, GY + 1 + cy, 120 + hash(k) * 20, kind, k * 23.9 + 5, o, 1.35);
  }
}

// --- земля: трава, ковёр листьев (cover 0…1), лужи (wet), иней (frost) ---
function drawGround(c, o) {
  const cam = o.cam || 0, cy = o.camY || 0, gy = GY + cy;
  if (gy >= WH) return;
  const winter = o.season === "winter";
  rect(c, 0, gy, LW, WH - gy, winter ? "#e8f0f8" : lerpCol(PAL.ground, PAL.wet, o.wet || 0));
  rect(c, 0, gy + 6, LW, WH - gy, winter ? "#d0deec" : PAL.groundD);
  dither(c, 0, gy + 5, LW, 1, winter ? "#d0deec" : PAL.groundD, 0);
  if (winter) return;
  // трава по кромке
  const green = o.season === "summer" || o.season === "spring";
  const camD = Math.floor(cam * K);
  for (let xd = 0; xd < LW * K; xd++) {
    const wd = xd + camD, hh = hash(wd * 0.77);
    if (hh < 0.45) continue;
    const h = (hh - 0.45) * 7 * K;
    const gc = green ? (hash(wd) > 0.5 ? "#5aa844" : "#3f8a36") : (hash(wd) > 0.5 ? PAL.grass : PAL.grassD);
    c.fillStyle = o.frost ? mix(gc, PAL.frost, o.frost * 0.7) : gc;
    c.fillRect(xd - (camD % 1), Math.round(gy * K - h + 2), 1, Math.round(h));
  }
  // лужи на мокрой земле
  if ((o.wet || 0) > 0.05) {
    for (let k = Math.floor((cam - 60) / 90); k < Math.floor((cam + LW) / 90) + 1; k++) {
      const x = k * 90 + hash(k * 9.1) * 40 - cam, w = 14 + hash(k * 3.3) * 10;
      ell(c, x, gy + 3, w * (o.wet || 0), 1.6, PAL.puddleD); ell(c, x, gy + 3, w * (o.wet || 0) - 2, 1, PAL.puddle);
      if (o.springGlint) { c.globalAlpha = o.springGlint; rect(c, x - 3, gy + 2, 6, 1, "#7ad060"); rect(c, x - 1, gy + 3, 3, 1, "#a8e07a"); c.globalAlpha = 1; }
    }
  }
  // ковёр листьев: каждый лист — свой порог покрытия
  const cover = o.cover === undefined ? 1 : o.cover;
  const STEP = 1.34;
  for (let x = -2; x < LW + 2; x += STEP) {
    const wx = Math.floor((x + cam) / STEP);
    const lxBase = wx * STEP - cam;
    for (let r = 0; r < 4; r++) {
      const hh = hash(wx * 1.31 + r * 17.7);
      if (hh > cover) continue;
      let col = LEAFC[Math.floor(hash(wx * 2.7 + r) * LEAFC.length)];
      if (o.dull) col = mix(col, "#8a7a68", o.dull);
      if (o.frost) col = mix(col, PAL.frost, o.frost * (0.55 + 0.35 * hash(wx + r)));
      const lx = lxBase + hash(wx * 5 + r) * 1.2, ly = gy - 1.3 + r * 1.5 + hash(wx * 3.3 + r) * 1.4;
      const fl = hash(wx * 7.1 + r) > 0.5;
      c.fillStyle = col;
      const X = D(lx), Y = D(ly);
      c.fillRect(X, Y, 5, 2); c.fillRect(X + 1, Y - 1, 3, 1); c.fillRect(X + (fl ? 4 : 0), Y + 2, 2, 1);
      c.fillStyle = mix(col, "#5a2a10", 0.35); c.fillRect(X + 1, Y + 1, 3, 1); // прожилка
      if (r === 0 && hh < cover * 0.45) { c.fillStyle = mix(col, "#ffffff", 0.3); c.fillRect(X + 1, Y, 2, 1); }
    }
  }
  // иней: искры
  if (o.frost) {
    for (let i = 0; i < 40; i++) {
      const x = ((hash(i * 4.3) * 400 - cam) % LW + LW) % LW, y = gy - 1 + hash(i * 8.1) * 6;
      if (Math.sin((o.t || 0) * 5 + i * 2.1) > 1 - o.frost * 0.6) { dp(c, x, y, "#ffffff", 2); dp(c, x - 0.67, y + 0.33, "#cfe8ff", 1); dp(c, x + 1, y + 0.33, "#cfe8ff", 1); dp(c, x + 0.33, y - 0.67, "#cfe8ff", 1); dp(c, x + 0.33, y + 1, "#cfe8ff", 1); }
    }
  }
}
function lerpCol(a, b, u) { return mix(a, b, clamp(u)); }

// --- падающие листья (передний план): n — сколько, from — время начала листопада ---
function drawFalling(c, o, n, opts) {
  opts = opts || {};
  const t = o.t || 0, cam = o.cam || 0, wind = opts.wind || 0;
  for (let i = 0; i < n; i++) {
    const sp = 14 + hash(i * 1.7) * 12, ph = hash(i * 3.9) * 20;
    const life = (t * sp + ph * 10) % 190, y = -12 + life + (opts.yOff || 0);
    if (opts.land && y > GY - 2) continue;
    let x = (hash(i * 2.3) * 420 - cam * (1.1 + hash(i) * 0.2) + Math.sin(t * 1.6 + i) * 6 + wind * life * 0.8) % 420;
    if (x < 0) x += 420;
    x -= 50;
    const col = LEAFC[i % LEAFC.length], fl = Math.floor(t * 6 + i) % 4;
    const X = D(x), Y = D(y), vein = mix(col, "#5a2a10", 0.35);
    c.fillStyle = col;
    if (fl === 0) { c.fillRect(X, Y + 1, 6, 3); c.fillRect(X + 1, Y, 4, 5); c.fillStyle = vein; c.fillRect(X + 1, Y + 2, 5, 1); c.fillRect(X + 6, Y + 2, 2, 1); }
    else if (fl === 1) { c.fillRect(X, Y + 1, 7, 2); c.fillRect(X + 2, Y, 3, 4); c.fillStyle = vein; c.fillRect(X + 1, Y + 2, 6, 1); }
    else if (fl === 2) { c.fillRect(X + 1, Y, 3, 6); c.fillRect(X, Y + 1, 5, 4); c.fillStyle = vein; c.fillRect(X + 2, Y + 1, 1, 6); }
    else { c.fillRect(X, Y, 2, 6); c.fillRect(X + 2, Y + 1, 1, 4); c.fillStyle = vein; c.fillRect(X + 1, Y + 1, 1, 5); }
  }
}

// --- пропсы на земле (координаты мира; рисуются со сдвигом камеры) ---
function hazel(c, x, y, o, nuts) { // куст лещины
  for (let k = 0; k < 7; k++) {
    const a = -Math.PI / 2 + (k - 3) * 0.32, l = 16 + hash(k) * 6;
    line(c, x, y, x + Math.cos(a) * l, y + Math.sin(a) * l, PAL.bark, 1);
    if (!o.bareBush) disc(c, x + Math.cos(a) * l, y + Math.sin(a) * l, 3, k % 2 ? PAL.gold[1] : PAL.gold[2]);
  }
  if (nuts) for (let k = 0; k < nuts; k++) { const xx = x - 4 + k * 4, yy = y - 12; rect(c, xx, yy, 3, 3, "#a86a2a"); rect(c, xx, yy - 1, 3, 1, "#6a8a3a"); }
}
function stump(c, x, y) {
  rect(c, x - 7, y - 8, 14, 8, PAL.bark); rect(c, x - 7, y - 9, 14, 2, "#b08a5a"); rect(c, x - 5, y - 9, 10, 1, "#d0a870");
  rect(c, x + 5, y - 8, 2, 8, PAL.barkD); px(c, x - 2, y - 9, "#8a6a3a"); px(c, x + 1, y - 9, "#8a6a3a");
  line(c, x - 8, y, x - 11, y + 1, PAL.barkD, 1); line(c, x + 6, y, x + 10, y + 1, PAL.barkD, 1);
}
// кочка мха: подушка из бугорков, по ней звёздочки кукушкина льна и коробочки на тонких ножках.
// lift — кочку приподняли за край: она поднимается, под ней видна тёмная земля.
function mossMound(c, x, y, lift) {
  const l = lift || 0, yy = y - l;
  const MD = "#2c5422", MM = "#43762c", ML = "#62963a", MT = "#8cbe4a", MH = "#c8e67c";
  const H = (dx) => 6.4 * Math.sqrt(Math.max(0, 1 - (dx / 12.6) ** 2)); // высота подушки над землёй
  c.globalAlpha = 0.5; ell(c, x + 0.5, y + 0.3, 13.5, 1.3, "#24160c"); c.globalAlpha = 1;
  if (l > 0.05) ell(c, x, y - 0.5, 11.8, 1.2 + l * 0.8, "#2a1a10");
  if (l > 0.05) for (let i = 0; i < 8; i++) { const rx = x - 9.6 + i * 2.75 + hash(i * 7.3) * 0.8; line(c, rx, y - 0.2, rx + (hash(i) - 0.5) * 0.8, yy - 1.0, "#a08050", 0.34); } // корешки тянутся
  // тёмный низ и бугорки по контуру
  ell(c, x, yy - 2.0, 12.6, 2.4, MD);
  for (let i = 0; i < 12; i++) { const dx = -11.4 + i * 2.07, r = 1.9 + hash(i * 5.3) * 0.9; disc(c, x + dx, yy - H(dx) + r * 0.85, r, MD); }
  // средний тон, сдвинут к свету (слева сверху)
  for (let i = 0; i < 11; i++) { const dx = -10.4 + i * 2.08 + hash(i * 2.1) * 0.5, r = 1.6 + hash(i * 3.7) * 0.7; disc(c, x + dx - 0.35, yy - H(dx) + r * 0.85 + 0.45, r, MM); }
  // светлые макушки бугорков
  for (let i = 0; i < 9; i++) { const dx = -9.2 + i * 2.25, r = 0.85 + hash(i * 9.1) * 0.45; disc(c, x + dx - 0.6, yy - H(dx) + r + 0.55, r, ML); }
  // звёздочки-верхушки стебельков: крестик в пиксель буфера, у верха — светлее
  for (let i = 0; i < 54; i++) {
    const dx = (hash(i * 4.7) * 2 - 1) * 11.2, top = yy - H(dx) + 0.7, sy = top + hash(i * 6.1) * Math.max(0.5, H(dx) - 1.4);
    const col = sy < top + 1.6 ? MH : hash(i * 1.9) > 0.45 ? MT : ML;
    const X = Math.round((x + dx) * K), Y = Math.round(sy * K);
    c.fillStyle = col; c.fillRect(X, Y - 1, 1, 3); c.fillRect(X - 1, Y, 3, 1);
    if (i % 3 === 0) { c.fillStyle = MD; c.fillRect(X + 2, Y + 1, 1, 2); }
  }
  // коробочки мха на рыжих ножках
  for (const [dx, h, lean] of [[-6.5, 4.6, -0.7], [-2.6, 6.0, 0.2], [2.4, 5.2, 0.7], [6.8, 4.2, 1.1]]) {
    const bx = x + dx, by = yy - H(dx) + 1.2, tx = bx + lean, ty = by - h;
    line(c, bx, by, tx, ty, "#a8542c", 0.34);
    dp(c, tx - 0.34, ty - 1.0, "#c27a36", 2, 3); dp(c, tx - 0.34, ty - 1.0, "#f0c070", 1, 1); dp(c, tx - 0.34, ty - 1.34, "#6a3a1c", 2, 1);
  }
  // жёлтый листик упал на кочку
  const lx = Math.round((x + 4.2) * K), ly = Math.round((yy - H(4.2) + 0.9) * K);
  c.fillStyle = "#f6b21b"; c.fillRect(lx, ly, 5, 2); c.fillRect(lx + 1, ly - 1, 3, 1); c.fillRect(lx + 1, ly + 2, 2, 1);
  c.fillStyle = "#c8781a"; c.fillRect(lx + 1, ly + 1, 4, 1);
}
function mushroom(c, x, y, a) { // груздь: светлая шляпка-воронка
  c.globalAlpha = a; rect(c, x - 1, y - 3, 2, 3, "#efe6d0"); ell(c, x, y - 4, 4, 1.6, "#f4ecd6"); rect(c, x - 2, y - 5, 4, 1, "#d8c8a0"); c.globalAlpha = 1;
}
function berrySprig(c, x, y, berries, a) { // веточка брусники
  line(c, x, y, x + 2, y - 7, "#3f6a2c", 1); rect(c, x - 2, y - 4, 2, 1, "#4f8a36"); rect(c, x + 2, y - 6, 2, 1, "#4f8a36");
  if (berries) { c.globalAlpha = a; for (const [dx, dy] of [[1, -8], [3, -8], [2, -9], [0, -7], [4, -7]]) rect(c, x + dx, y + dy, 1, 1, "#c8102e"); c.globalAlpha = 1; }
}
function flower(c, x, y, kind, wilt, a) { // цветок: kind — snow/daisy/bell/aster/poppy
  c.globalAlpha = a === undefined ? 1 : a;
  const w = wilt || 0, hx = x + w * 3, hy = y - 8 + w * 4;
  line(c, x, y, x + w * 1.5, y - 5 + w * 1, kind === "snow" ? "#5a9a4a" : "#4a8a3a", 1);
  line(c, x + w * 1.5, y - 5 + w, hx, hy, kind === "snow" ? "#5a9a4a" : "#4a8a3a", 1);
  const col = { snow: "#ffffff", daisy: "#ffffff", bell: "#6a6ae8", aster: "#a85ad8", poppy: "#e83a3a", camomile: "#ffffff" }[kind] || "#ffffff";
  const colC = w > 0.5 ? "#8a6a4a" : col;
  if (kind === "snow" || kind === "bell") { rect(c, hx - 1, hy, 3, 2, colC); px(c, hx, hy + 2, colC); px(c, hx + 1, hy - 1, "#7ac060"); }
  else { px(c, hx - 1, hy, colC); px(c, hx + 1, hy, colC); px(c, hx, hy - 1, colC); px(c, hx, hy + 1, colC); px(c, hx, hy, kind === "aster" ? "#ffd23f" : kind === "poppy" ? "#2a1a1a" : "#ffd23f"); }
  c.globalAlpha = 1;
}
function twig(c, x, y, broken) {
  if (!broken) { line(c, x - 6, y, x + 6, y - 1, PAL.barkD, 1); px(c, x + 2, y - 2, PAL.barkD); }
  else { line(c, x - 6, y, x - 1, y - 2, PAL.barkD, 1); line(c, x + 1, y - 2, x + 6, y, PAL.barkD, 1); }
}
