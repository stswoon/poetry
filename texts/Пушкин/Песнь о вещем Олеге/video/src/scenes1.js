// ---------- v3, 8-бит RPG. Сцены: титул, строфы 1–6 ----------
const EV = CFG.ev;
const L = (n) => EV["L" + n], LE = (n) => EV["E" + n], W = (k) => EV[k];
const TOP = 12, GROUND = 150; // HUD сверху, линия земли в сценах
const F = (t, fps = 12) => Math.floor(t * fps) % 8;
const big = (c, s, x, y, k = 2, flip) => { // целочисленное увеличение спрайта (крупный план)
  c.save(); c.imageSmoothingEnabled = false;
  if (flip) { c.translate(R(x) + s.width * k, R(y)); c.scale(-1, 1); c.drawImage(s, 0, 0, s.width * k, s.height * k); }
  else c.drawImage(s, R(x), R(y), s.width * k, s.height * k);
  c.restore();
};
const shakeXY = (t, t0, amp = 3, dur = 0.5) => (t < t0 || t > t0 + dur ? [0, 0] : [R((hash(Math.floor(t * 30)) - 0.5) * 2 * amp * (1 - (t - t0) / dur)), R((hash(Math.floor(t * 30) + 9) - 0.5) * 2 * amp * (1 - (t - t0) / dur))]);
const SUNSET = ["#2a1e4a", "#5a2e5a", "#a8405a", "#e8704a", "#f8b060"];
const NIGHT = ["#06061a", "#0e1030", "#1a1e48", "#262c5a"];
const FOREST = ["#08141a", "#10242a", "#18363a", "#20484a"];
const GOLDSKY = ["#5a3010", "#a0581c", "#e09030", "#f8c860", "#fff0b0"];
const DUSK = ["#141838", "#2a2a58", "#5a3a6a", "#a0505a", "#e08050"];

function stars(c, seed, n, t, h = 120) {
  for (let i = 0; i < n; i++) {
    const x = R(hash(i * 3.7 + seed) * LW), y = R(TOP + hash(i * 9.1 + seed) * h), tw = Math.floor(t * 2 + i) % 5;
    rect(c, x, y, 1, 1, tw ? "#c8d0f0" : "#5a6090");
  }
}
function sun(c, x, y, r, col = "#ffe680") { disc(c, x, y, r + 3, "#f8a050"); disc(c, x, y, r, col); }
function moon(c, x, y, r) { disc(c, x, y, r, "#e8ecf4"); disc(c, x + 3, y - 2, r * 0.25, "#c8ccd8"); disc(c, x - 3, y + 3, r * 0.18, "#c8ccd8"); }
// пиксельная надпись по центру (не текст стиха: игровые надписи)
function centerText(c, s, y, col, scale = 1, shadow = "#120c14") {
  const w = textWidth(s) * scale; drawText(c, s, R((LW - w) / 2), y, col, { scale, shadow });
}
// всплывающее окошко игры: «СПУТНИК: КОНЬ» и т.п.
function toast(c, s, t, t0, dur, x, y, col = "#ffe680") {
  if (t < t0 || t > t0 + dur) return;
  const k = springPop((t - t0) * 1.4), w = textWidth(s) + 10, yy = R(y - (1 - k) * 8);
  panel(c, R(x - w / 2), yy, w, 15);
  drawText(c, s, R(x - w / 2 + 5), yy + 4, col);
}
function floatText(c, s, t, t0, x, y, col = "#ffffff") {
  const u = (t - t0) / 0.9; if (u < 0 || u > 1) return;
  drawText(c, s, R(x - textWidth(s) / 2), R(y - u * 14), col, { shadow: "#120c14" });
}
function sparkle(c, x, y, t, t0, col = "#ffffff") {
  const u = (t - t0) / 0.5; if (u < 0 || u > 1) return; const r = R(2 + u * 6);
  rect(c, x - r, y, r * 2 + 1, 1, col); rect(c, x, y - r, 1, r * 2 + 1, col); rect(c, x - 1, y - 1, 3, 3, "#ffe680");
}
function lightningBolt(c, x0, y0, x1, y1, seed, col = "#e8f4ff") {
  let x = x0, y = y0; const n = 8;
  for (let i = 1; i <= n; i++) { const nx = lerp(x0, x1, i / n) + (hash(seed + i) - 0.5) * 16, ny = lerp(y0, y1, i / n); line(c, x, y, nx, ny, col, 2); x = nx; y = ny; }
}
function bgSteppe(c, t, scroll, pal = SUNSET, sunX = 280) {
  skyBands(c, pal);
  if (sunX !== null) sun(c, sunX, 104, 12);
  hillsLayer(c, 128, 10, 90, 1.3, "#4a2a4a", scroll * 0.2);
  hillsLayer(c, 140, 7, 60, 2.7, "#2a1a30", scroll * 0.5);
  groundLayer(c, GROUND, scroll, ["#5a4a2a", "#7a6a3a", "#4a3a20"], "#8a7a40");
}
function bgForest(c, t, scroll) {
  skyBands(c, FOREST);
  forestLayer(c, 120, 60, 14, 2, "#1a3a34", scroll * 0.3, "#2a5a4a");
  forestLayer(c, 140, 70, 18, 5, "#0e2420", scroll * 0.6, "#1a3a30");
  groundLayer(c, GROUND, scroll, ["#1a2a1a", "#2a3a22", "#14200f"], "#2e4a28");
  for (let i = 0; i < 3; i++) { const x = ((i * 160 - scroll * 1.4) % 520 + 520) % 520 - 60; rect(c, x, TOP, 14, GROUND - TOP, "#0a1210"); rect(c, x + 2, TOP, 2, GROUND - TOP, "#18241e"); }
}
function fogBands(c, t, a = 0.5) {
  c.save(); c.globalAlpha = a;
  for (let k = 0; k < 4; k++) { const y = 70 + k * 22, x = ((t * (8 + k * 4)) % 140) - 140; for (let xx = x; xx < LW; xx += 140) ell(c, xx + 70, y, 70, 6, "#9ab0c0"); }
  c.restore();
}
function rider(c, x, y, t, opt = {}, flip, spr = riderSprite) { // y — линия земли
  const fr = opt.speed ? F(t, opt.speed) : Math.floor(t * 4) % 8;
  const o = { ...opt }; delete o.speed; if (!opt.speed) o.idle = true; else if (opt.speed < 10) o.walk = true;
  blit(c, spr(fr, o), x, y - 76, flip);
}
const DRUZH = { [COL.red]: COL.blue, [COL.redL]: COL.blueL };
// ноги людей уходят в полосу земли на 3 пикс., как копыта коней
const olegAt = (c, x, t, pose = "idle", flip, k = 1, fps = 6) => { const s = olegStand(pose, Math.floor(t * fps) % 2); if (k === 1) blit(c, s, x, GROUND - 63, flip); else big(c, s, x, GROUND - 66 * k + 4, k, flip); };
const druzhAt = (c, x, t, pose = "idle", flip, hair) => blit(c, recolor("dz" + pose + Math.floor(t * 6) % 2 + (hair || ""), olegStand(pose, Math.floor(t * 6) % 2), { ...DRUZH, ...(hair ? { [COL.steel]: hair, [COL.steelL]: hair, [COL.steelD]: hair, [COL.gold]: hair } : {}) }), x, GROUND - 63, flip);
const kudAt = (c, x, t, opt = {}, flip = false) => blit(c, kudBig(Math.floor(t * 3) % 2, opt), x, GROUND - 65, flip);
const youthAt = (c, x, t, flip, fps = 8, col) => blit(c, youthStand(Math.floor(t * fps) % 2, col), x, GROUND - 47, flip);
// враг падает от удара: летит назад и вверх, крутится
function knocked(c, x0, t, t0, flip = true) {
  if (t < t0) { blit(c, soldierSprite(Math.floor(t * 6) % 2), x0, GROUND - 26, flip); return; }
  const u = t - t0; if (u > 1.2) return;
  c.save(); c.translate(R(x0 + 9 + u * 160), R(GROUND - 13 - u * 120 + u * u * 160)); c.rotate(u * 9); c.drawImage(soldierSprite(0), -9, -13); c.restore();
  sparkle(c, x0 + 6, GROUND - 20, t, t0, "#ffe680");
}
function particlesDust(c, t, k = 1) {
  for (let i = 0; i < 24; i++) { const x = R(((hash(i) * LW - t * 90 * (0.5 + hash(i * 2))) % LW + LW) % LW), y = R(GROUND - 4 + hash(i * 3) * 10 - ((t * 3 + hash(i)) % 1) * 8); if (hash(i * 5) < k) rect(c, x, y, 2, 1, "#c8a870"); }
}

// ---------- 0. Титульный экран ----------
function scTitle(c, t) {
  skyBands(c, NIGHT); stars(c, 3, 60, t); moon(c, 352, 26, 10);
  hillsLayer(c, 176, 10, 80, 4.1, "#14142a", t * 6);
  groundLayer(c, 192, t * 30, ["#101024", "#1a1a34", "#0c0c1c"]);
  const k = springPop(t * 1.2);
  centerText(c, "ПЕСНЬ О ВЕЩЕМ ОЛЕГЕ", R(36 - (1 - k) * 30), "#ffe680", 2);
  if (t > 0.6) centerText(c, "А. С. ПУШКИН · 1822", 64, "#c8d0f0");
  if (t < W("start") && Math.floor(t * 3) % 2 === 0) centerText(c, "▶ НАЖМИ СТАРТ", 94, "#ffffff");
  if (t >= W("start")) centerText(c, "▶ НАЖМИ СТАРТ", 94, Math.floor(t * 16) % 2 ? "#ffe680" : "#e8302c");
  rider(c, R(-90 + t * 110), 196, t, { speed: 14 });
  if (t > W("start")) wash(c, "#ffffff", clamp(1 - (t - W("start")) / 0.3));
}

// ---------- 1. Поход ----------
function sc1(c, t) {
  const a = L(1) - 0.3, sc = (t - a) * 46;
  bgSteppe(c, t, sc);
  if (t > W("w_hoz") - 0.2) for (let i = 0; i < 4; i++) { // юрты хазар
    const x = R(420 - (t - W("w_hoz")) * 30 + i * 46), y = 116 + (i % 2) * 6;
    blit(c, yurtSprite(), x, y);
    if (t > W("w_pozh") - 0.1) fire(c, x + 4, y + 4, 18, 10 + 6 * clamp((t - W("w_pozh")) * 2), t + i);
  }
  if (t > W("w_sely") - 0.1 && t < L(5)) { // нивы
    const k = clamp((t - W("w_sely")) * 3);
    for (let x = 0; x < LW; x += 3) { const h = R((6 + hash(x) * 6) * k), sw = R(Math.sin(t * 4 + x * 0.2)); rect(c, x + sw, GROUND + 10 - h, 1, h, "#e8c060"); rect(c, x + sw, GROUND + 10 - h, 2, 2, "#f8e090"); }
  }
  const sw = t > W("w_mech") - 0.1 && t < L(5);
  const hand = sw ? [44, 0] : undefined;
  const ox = 200 + R(Math.sin(t * 2) * 4);
  const R3 = [[30, GROUND + 4, druzhSprite, 0.3], [110, GROUND + 2, druzhSprite, 0.6], [ox, GROUND + 6, riderSprite, 0]];
  for (const [x, y, spr, ph] of R3) rider(c, x, y, t + ph, { speed: 13, spear: !sw, hand }, false, spr);
  if (sw) for (const [x, y] of R3) { const hy = y - 76 + 16; line(c, x + 51, hy + 16 - 16, x + 51, hy - 14, "#eef2f6", 2); rect(c, x + 48, hy, 7, 1, COL.gold); sparkle(c, x + 51, hy - 14, t, W("w_mech") + 0.15); }
  if (t > W("w_mech") - 0.6 && t < L(5) + 0.5) for (let i = 0; i < 3; i++) { const hit = W("w_mech") + 0.25 + i * 0.45, x = R(lerp(LW + 10, 286, clamp((t - hit + 0.9) / 0.9))); knocked(c, x, t, hit); if (t > hit && t < hit + 0.15) wash(c, "#ffffff", 0.25); }
  if (t > W("w_bron") - 0.1) for (let i = 0; i < 4; i++) sparkle(c, ox + 32 + i * 5, GROUND - 52 + (i % 2) * 8, t, W("w_bron") + i * 0.12, "#ffe680");
  toast(c, "УРОВЕНЬ 1 · ПОХОД", t, a + 0.1, 2.2, LW / 2, 22);
  floatText(c, "+100 СЛАВА", t, W("w_pozh") + 0.2, 300, 100, "#ffe680");
  toast(c, "СПУТНИК: КОНЬ", t, W("w_kon1"), 2.4, 300, 22, "#ffffff");
  particlesDust(c, t, 0.7);
}

// ---------- 2. Кудесник из леса ----------
function sc2(c, t) {
  const a = L(7) - 0.3, stop = W("w_podieh") + 0.5;
  const sc = (Math.min(t, stop) - a) * 30;
  bgForest(c, t, sc);
  const kx = R(lerp(400, 250, clamp((t - W("w_kud1") + 0.4) / 1.6)));
  if (t > W("w_kud1") - 0.5) {
    const up = t > W("w_perun") - 0.2 && t < W("w_perun") + 1.2;
    kudAt(c, kx, t < W("w_kud1") + 1.2 ? t * 2 : 0, { up, glow: up });
    exclaim(c, kx + 19, GROUND - 84, t);
    if (up) { lightningBolt(c, kx + 4, GROUND - 74, kx + 30, TOP, 7 + Math.floor(t * 10)); if (t < W("w_perun") + 0.25) wash(c, "#e8f4ff", 0.5); }
    if (t > W("w_vest") - 0.2 && t < L(12)) for (let i = 0; i < 8; i++) { const an = i / 8 * Math.PI * 2 + t * 2, rx = R(kx + 20 + Math.cos(an) * 32), ry = R(GROUND - 36 + Math.sin(an) * 12); rect(c, rx, ry, 1, 5, "#9fd8ff"); rect(c, rx + 1, ry + (i % 3), 2, 1, "#9fd8ff"); }
  }
  const rx = R(lerp(-80, 120, clamp((t - L(12) + 0.6) / 1.8)));
  if (t > L(12) - 0.6) rider(c, rx, GROUND + 4, t, t < stop ? { speed: 8 } : {});
  if (t > stop - 0.2 && t < stop + 0.8) for (let i = 0; i < 10; i++) rect(c, rx + 20 + i * 5, GROUND + 2 - R(((t - stop) * 10 + hash(i)) % 3), 3, 2, "#4a5a3a");
}

// ---------- 3. Олег спрашивает ----------
function sc3(c, t) {
  bgForest(c, t, 80);
  rider(c, 40, GROUND + 4, t, { talk: Math.floor(t * 8) % 2 === 0 });
  kudAt(c, 250, t); exclaim(c, 269, GROUND - 84, t);
  if (t > W("w_vragov") - 0.3 && t < L(16)) for (let i = 0; i < 3; i++) { const x = 380 + i * 16 - R(clamp((t - W("w_vragov") + 0.3) * 3) * 60); blit(c, soldierSprite(0), x, GROUND - 26 - i * 4); }
  if (t > W("w_zeml") - 0.5 && t < L(17)) {
    wash(c, "#0a0610", 0.5 * clamp((t - W("w_zeml") + 0.5) * 2));
    for (let i = 0; i < 40; i++) { const x = R(hash(i) * LW), y = R(TOP + ((t - W("w_zeml") + 0.5) * 120 + hash(i * 3) * 150) % 150); rect(c, x, y, 3, 2, "#5a3a1a"); }
  }
  if (t > L(17) - 0.1) {
    const k = springPop((t - L(17) + 0.1) * 1.5), w = 150, x = R(LW / 2 - w / 2), y = R(26 - (1 - k) * 40);
    panel(c, x, y, w, 46); drawText(c, "ОБМЕН", x + 8, y + 6, "#ffe680");
    for (let i = 0; i < 4; i++) { const hx = x + 10 + i * 34, sel = t > W("w_konya3") && Math.floor(t * 6) % 4 === i; rect(c, hx, y + 18, 30, 22, sel ? "#5a6aa8" : "#2a3260"); big(c, horseIcon(true), hx + 2, y + 19, 2); }
  }
}

// ---------- 4. Пророчество: кудесник и Олег во весь рост ----------
const SHADOW = Object.fromEntries([COL.bay, COL.bayL, COL.bayD, COL.mane, COL.red, COL.redL, COL.mail, COL.mailD, COL.skin, COL.skinD, COL.steel, COL.steelL, COL.steelD, COL.gold, COL.leather, COL.hoof, COL.white].map((k) => [k, "#20204a"]));
function magicCircle(c, x, y, t, k = 1) { for (let i = 0; i < 28; i++) { const an = i / 28 * Math.PI * 2 + t * 0.9; rect(c, R(x + Math.cos(an) * 34 * k), R(y + Math.sin(an) * 7 * k), 2, 2, i % 3 ? "#5a8ad8" : "#bfe8ff"); } }
function prophecyBg(c, t) { bgForest(c, t, 160); wash(c, "#06061a", 0.35); stars(c, 9, 30, t, 50); }
function sc4(c, t) {
  prophecyBg(c, t);
  const kx = 250, up = t > L(21) - 0.2;
  magicCircle(c, kx + 20, GROUND - 2, t);
  // Олег подъезжает, грозит мечом — кудесник не боится
  const ox = R(lerp(20, 70, clamp((t - L(19) + 0.3) / 1.2)));
  rider(c, ox, GROUND + 4, t, t < L(19) + 0.9 ? { speed: 8 } : { hand: t < L(20) - 0.2 ? [44, 0] : undefined });
  if (t > L(19) + 0.9 && t < L(20) - 0.2) { line(c, ox + 51, GROUND - 76 + 16, ox + 51, GROUND - 76 - 12, "#eef2f6", 2); }
  // княжеский дар: мешок с золотом летит к ногам, кудесник отмахивается
  const d0 = W("w_dar") - 0.6;
  if (t > d0 && t < L(21) + 0.5) {
    const u = clamp((t - d0) / 0.6), bx = R(lerp(ox + 60, kx - 10, u)), by = R(lerp(GROUND - 50, GROUND - 8, u) - Math.sin(u * Math.PI) * 30);
    rect(c, bx, by, 9, 8, "#8a6a3a"); rect(c, bx + 2, by - 2, 5, 2, "#6a4a2a");
    if (u >= 1) for (let i = 0; i < 8; i++) { const v = clamp((t - d0 - 0.6) / 0.8), cx = R(bx + 4 - v * (10 + i * 9)), cy = R(GROUND - 4 - Math.abs(Math.sin(v * 6 + i)) * 10 * (1 - v)); blit(c, coinIcon(), cx, cy); }
  }
  // правдивый язык, воля небесная: молния в посох, руны
  if (up && t < L(23) - 0.1) {
    if (Math.floor(t * 10) % 7 === 0 || (t > W("w_nebes") && t < W("w_nebes") + 0.3)) { lightningBolt(c, kx + 4, GROUND - 74, kx - 10, TOP, Math.floor(t * 10)); }
    for (let i = 0; i < 8; i++) { const an = i / 8 * Math.PI * 2 + t * 2.4, rx = R(kx + 20 + Math.cos(an) * 34), ry = R(GROUND - 40 + Math.sin(an) * 14); rect(c, rx, ry, 1, 5, "#9fd8ff"); rect(c, rx + 1, ry + (i % 3), 2, 1, "#9fd8ff"); }
  }
  kudAt(c, kx, t, { up, glow: up });
  // во мгле: пиксельные облака тумана заволакивают годы
  if (t > L(23) - 0.3 && t < L(24) + 0.3) { const k = clamp((t - L(23) + 0.3) / 0.8) * (1 - clamp((t - L(24) + 0.1) / 0.4)); for (let i = 0; i < 10; i++) { const x = R(((i * 53 + t * 40) % 460) - 40), y = R(GROUND - 30 - (i % 4) * 22); ell(c, x, y, 26 * k, 8 * k, i % 2 ? "#c8d0e0" : "#a8b4c8"); } }
  // жребий на челе: луч от посоха к шлему, звезда
  if (t > W("w_chele") - 0.6) {
    const k = clamp((t - W("w_chele") + 0.6) / 0.5), hx = ox + 38, hy = GROUND - 76 + 4;
    for (let i = 0; i <= 20 * k; i++) rect(c, R(lerp(kx + 4, hx, i / 20)), R(lerp(GROUND - 77, hy, i / 20)), 2, 2, i % 2 ? "#ffffff" : "#bfe8ff");
    if (t > W("w_chele")) sparkle(c, hx, hy - 4, t, W("w_chele") + ((t - W("w_chele")) % 0.5 < 0.5 ? Math.floor((t - W("w_chele")) / 0.5) * 0.5 : 0), "#ffffff");
  }
}

// ---------- 5. Видения славы (в золотой рамке) ----------
function visionFrame(c) { rect(c, 0, TOP, LW, 3, COL.gold); rect(c, 0, 161, LW, 3, COL.gold); rect(c, 0, TOP, 3, 152, COL.gold); rect(c, LW - 3, TOP, 3, 152, COL.gold); }
function sc5(c, t) {
  if (t < L(26) - 0.1) { prophecyBg(c, t); magicCircle(c, 270, GROUND - 2, t, 1 + clamp(t - L(25)) * 0.6); rider(c, 70, GROUND + 4, t, {}); kudAt(c, 250, t, { up: true, glow: true }); const r = R(clamp((t - L(25)) / 1.6) * 260); if (r > 2) { c.save(); c.globalAlpha = 0.5; disc(c, 254, GROUND - 77, r, "#fff0b0"); c.restore(); } wash(c, "#fff0b0", clamp((t - L(26) + 0.5) * 2) * 0.8); return; }
  skyBands(c, GOLDSKY); sun(c, 192, 140, 16, "#fff8d0");
  if (t < L(27) - 0.1) { // щиты вверх
    groundLayer(c, GROUND, 0, ["#7a5020", "#9a6a30", "#5a3a18"]);
    for (let i = 0; i < 4; i++) { const k = springPop((t - L(26) - i * 0.1) * 1.5); rider(c, 10 + i * 92, GROUND + 4, t + i, { hand: [46, R(14 - k * 14)] }, false, druzhSprite); blit(c, shieldSprite(7), 10 + i * 92 + 46, GROUND - 76 + 18 + 10 - R(k * 14)); }
    floatText(c, "+100 СЛАВА", t, W("w_slava") + 0.1, 192, 50, "#ffe680"); visionFrame(c); return;
  }
  if (t < L(28) - 0.1) { // стяг с именем
    rect(c, 60, 30, 3, 130, "#4a2a18");
    for (let x = 0; x < 220; x++) { const y = R(36 + Math.sin(t * 4 - x * 0.06) * 4 * (x / 220)); rect(c, 63 + x, y, 1, 64, x % 20 < 10 ? "#c8342c" : "#b02a24"); }
    if (t > W("w_imya") - 0.2) drawText(c, "ОЛЕГ", 128, 54, "#ffe680", { scale: 3, shadow: "#5a1010" });
    visionFrame(c); return;
  }
  if (t < L(29) - 0.1) { // щит на вратах Цареграда
    const hit = W("w_shchit") + 0.15, [dx, dy] = shakeXY(t, hit, 4, 0.6);
    c.save(); c.translate(dx, dy);
    groundLayer(c, GROUND, 0, ["#7a6040", "#9a7a50", "#5a4428"]);
    blit(c, gateSprite(), 132, GROUND - 90);
    const u = clamp((t - hit + 0.5) / 0.5);
    if (t > hit - 0.5) { const sz = Math.max(1, R(lerp(5, 1, u))); big(c, shieldSprite(8), R(lerp(-60, 183, u)), R(lerp(30, GROUND - 52, u)), sz); }
    c.restore();
    if (t > hit && t < hit + 0.12) wash(c, "#ffffff", 0.7);
    floatText(c, "+100 СЛАВА", t, hit + 0.2, 192, 40, "#ffe680"); visionFrame(c); return;
  }
  if (t < L(30) - 0.1) { // волны и суша
    hillsLayer(c, 120, 8, 70, 3, "#5a7a3a", 0);
    for (let y = 120; y < 164; y += 4) { const off = R(Math.sin(t * 2 + y) * 6); rect(c, 0, y, LW, 4, y % 8 ? "#2a5a8a" : "#3a7aaa"); for (let x = (off % 12 + 12) % 12; x < LW; x += 12) rect(c, x, y, 4, 1, "#9ad8f0"); }
    for (let i = 0; i < 2; i++) blit(c, shipSprite(), 60 + i * 170 + R((t - L(29)) * 10), 100 + i * 12 + R(Math.sin(t * 2 + i) * 2));
    floatText(c, "+100 СЛАВА", t, W("w_volny") + 0.2, 192, 40, "#ffe680"); visionFrame(c); return;
  }
  groundLayer(c, GROUND, 0, ["#5a3a20", "#7a5030", "#3a2414"]); // недруг завидует
  for (let i = 0; i < 5; i++) { const t0 = W("w_zavid") + i * 0.15, turn = t > t0; c.save(); c.globalAlpha = turn ? clamp(1 - (t - t0) * 0.7, 0.25, 1) : 1; blit(c, soldierSprite(Math.floor(t * 4) % 2), 70 + i * 56, GROUND - 26, turn); c.restore(); }
  visionFrame(c);
}

// ---------- 6. Хранитель ----------
function sc6(c, t) {
  if (t < L(33) - 0.1) { // шторм, вал мимо ладьи
    skyBands(c, ["#06080e", "#0e1620", "#16222e", "#1e2e3a"]);
    const wv = W("w_val");
    if ((t > wv - 0.1 && t < wv + 0.15) || (t > wv + 0.4 && t < wv + 0.5)) { wash(c, "#c8e0ff", 0.4); lightningBolt(c, 80, TOP, 110, 110, 3); }
    const rise = Math.sin(Math.PI * clamp((t - wv + 0.4) / 2));
    c.save(); c.translate(190, 120); c.rotate(Math.sin(t * 2) * 0.12); c.drawImage(shipSprite(), -30, -30); c.restore();
    for (let y = 126; y < 164; y += 4) { const lift = R(rise * (y < 140 ? 40 : 10)), off = R(Math.sin(t * 3 + y) * 8); rect(c, 0, y - lift, LW, 4 + lift, y % 8 ? "#16324a" : "#20446a"); for (let x = (off % 14 + 14) % 14; x < LW; x += 14) rect(c, x, y - lift, 5, 1, "#8ab8d0"); }
    for (let i = 0; i < 60; i++) { const x = R((hash(i) * LW + t * 60) % LW), y = R(TOP + (hash(i * 2) * 150 + t * 260) % 150); rect(c, x, y, 1, 4, "#5a7a9a"); }
    return;
  }
  bgSteppe(c, t, 300, DUSK, 300);
  rider(c, 140, GROUND + 4, t, {});
  const tx = 190, ty = GROUND - 50;
  for (const [k, kind] of [["w_prashch", "stone"], ["w_strela", "arrow"], ["w_kinzhal", "dagger"]]) {
    const T = W(k) + 0.35, u = clamp((t - T + 0.5) / 0.5), b = clamp((t - T) / 0.6);
    if (t > T - 1.0 && t < T + 1.0) { const ex = R(lerp(LW + 4, 330, clamp((t - T + 1.0) / 0.35))); blit(c, soldierSprite(Math.floor(t * 8) % 2, { spear: false }), ex, GROUND - 26, true); if (t > T - 0.55 && t < T - 0.4) rect(c, ex - 4, GROUND - 22, 4, 2, "#ffffff"); }
    if (t < T - 0.5 || t > T + 0.9) continue;
    const x = t < T ? lerp(LW + 10, tx, u) : tx + b * 40, y = t < T ? lerp(ty - 20, ty, u) : ty - b * 30 + b * b * 60;
    if (t < T + 0.6) {
      if (kind === "stone") disc(c, x, y, 3, "#5a5a5a");
      else if (kind === "arrow") { line(c, x, y, x + 16, y, "#c8b090"); rect(c, x - 2, y - 1, 3, 3, "#c8d0dc"); rect(c, x + 14, y - 2, 3, 5, "#e8e0c0"); }
      else { rect(c, x, y, 10, 2, "#eef2f6"); rect(c, x + 10, y - 1, 4, 4, "#6a4a2a"); }
    }
    if (t > T) { sparkle(c, tx, ty, t, T, "#ffffff"); floatText(c, "ПРОМАХ", t, T, tx, ty - 22, "#9fd8ff"); }
  }
  if (t > W("w_khran") - 0.3) { const k = clamp((t - W("w_khran") + 0.3) * 2), r = 50 + R(Math.sin(t * 6)); c.save(); c.globalAlpha = 0.6 * k; for (let i = 0; i < 90; i++) { const an = i / 90 * Math.PI * 2; rect(c, R(180 + Math.cos(an) * r), R(GROUND - 38 + Math.sin(an) * r * 0.9), 2, 2, i % 2 ? "#9fd8ff" : "#ffffff"); } c.restore(); }
}
