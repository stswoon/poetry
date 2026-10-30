// Сцены пересказа. a(n) — секунд от начала строки n (нумерация voice/lines.json).
const PAL = {
  dawn: { sky: ["#2a2a6a", "#4a3c8a", "#8a4c94", "#d0607c", "#f08c64", "#f8bc68"], far: "#6a4a84", mid: "#3a4a6c", near: "#28483c", ground: ["#4a7a34", "#6a9a44", "#3a6228"], tuft: "#2e5220", cloud: "#f8c8a8", cloudD: "#d88c88" },
  day: { sky: ["#2c6cc8", "#3c84d8", "#5c9ce4", "#84b8ec", "#b0d4f0", "#d8ecf4"], far: "#7ca0c4", mid: "#4a7a84", near: "#2e5c44", ground: ["#5a9238", "#78ae48", "#477a2c"], tuft: "#366422", cloud: "#ffffff", cloudD: "#c8dcec" },
  grim: { sky: ["#1a1428", "#241c34", "#322438", "#44303c", "#5a3c40", "#6e4a44"], far: "#2a2230", mid: "#201a28", near: "#181420", ground: ["#2e2a24", "#3e3a2c", "#24201c"], tuft: "#1c1a14", cloud: "#3a3040", cloudD: "#2a2230" },
  dusk: { sky: ["#1c1a4a", "#3c2a68", "#6a3480", "#b04878", "#e8705c", "#f8a858"], far: "#4a3468", mid: "#2c2c50", near: "#1c2438", ground: ["#2c4a34", "#3e6040", "#203a2a"], tuft: "#1a3020", cloud: "#e88878", cloudD: "#a85070" },
  gold: { sky: ["#3060b8", "#5088d0", "#88b0d8", "#c8c8b0", "#f0d890", "#f8e8a8"], far: "#b89c78", mid: "#6a8a54", near: "#3e7040", ground: ["#6aa23e", "#8ec04e", "#528830"], tuft: "#3e7428", cloud: "#fff4d8", cloudD: "#f0c898" },
  swamp: { sky: ["#2c4a4c", "#3c5e58", "#587a64", "#7a9470", "#a0ac7c", "#c4c088"], far: "#4a6a58", mid: "#2e4c40", near: "#1e3830", ground: ["#3e5a30", "#546e38", "#324a28"], tuft: "#26401e", cloud: "#c8d0a8", cloudD: "#94a488" },
};
const sinPi = (f) => Math.sin(f * Math.PI);
const gallop = (t, sp = 13) => Math.floor(t * sp) % 8;

function landscape(c, t, pal, scroll, o = {}) {
  skyBands(c, pal.sky, 150);
  rect(c, 0, 150, LW, LH, pal.sky[5]);
  if (o.sun) { disc(c, o.sun[0], o.sun[1], o.sun[2] + 3, o.sunGlow || "#ffe0a0"); disc(c, o.sun[0], o.sun[1], o.sun[2], o.sunCol || "#fff4c8"); }
  cloudsLayer(c, 16, scroll * 0.06 + t * 2, 3, pal.cloud, pal.cloudD);
  hillsLayer(c, 128, 18, 180, 2.1, pal.far, scroll * 0.14);
  forestLayer(c, 146, 22, 15, 5, pal.mid, scroll * 0.3);
  if (o.noGround) return;
  forestLayer(c, 160, 22, 19, 9, pal.near, scroll * 0.55);
  groundLayer(c, 160, scroll, pal.ground, pal.tuft);
}

function label(c, s) {
  const w = textWidth(s);
  rect(c, 6, 6, w + 10, 13, "#120c14"); rect(c, 7, 7, w + 8, 11, "#2c2460");
  drawText(c, s, 11, 9, "#f8e8b0");
}
function hudCounter(c, s, y = 14) {
  const w = textWidth(s, true);
  rect(c, LW - w - 18, y - 3, w + 12, 14, "#120c14"); rect(c, LW - w - 17, y - 2, w + 10, 12, "#2c5a40");
  drawText(c, s, LW - w - 12, y, "#fff3c0", { bold: true });
}
function hpBar(c, name, x, y, w, frac, col = "#e8302c") {
  drawText(c, name, x, y - 10, "#fff3c0", { shadow: "#120c14" });
  rect(c, x - 2, y - 1, w + 4, 9, "#120c14"); rect(c, x - 1, y, w + 2, 7, "#e8e0c0"); rect(c, x, y + 1, w, 5, "#3a1418");
  rect(c, x, y + 1, w * clamp(frac), 5, col); rect(c, x, y + 1, w * clamp(frac), 1, "#ff9a7a");
}
function whistleWaves(c, x, y, t, power = 1) {
  for (let i = 0; i < 6; i++) {
    const ph = (t * 1.6 + i / 6) % 1;
    if (ph > 0.9) continue;
    const r = 8 + ph * 240 * power;
    c.fillStyle = i % 2 ? "#f0f4ff" : "#a8c8ff";
    for (let side = 0; side < 2; side++) for (let k = 0; k < 40; k++) {
      const an = -1.3 + (k / 40) * 2.6 + side * Math.PI;
      if ((k + i) % 3) c.fillRect(R(x + Math.cos(an) * r), R(y + Math.sin(an) * r * 0.75), 2, 2);
    }
  }
}
function boundSolovey(c, x, y, t) {
  const sx = x - 62, sy = y - 4 + Math.sin(t * 7) * 1.2;
  blitRot(c, soloveySprite("sit", true), sx, sy, 1.25, 0.72);
  line(c, sx + 12, sy - 6, x - 12, y - 28, COL.leather);
}

// ---------- новые предметы ----------
function bogLayer(c, t, y) {
  rect(c, 0, y, LW, LH - y, "#2c4436");
  c.fillStyle = "#3e5c44";
  for (let i = 0; i < 90; i++) { const yy = y + 2 + hash(i * 1.1) * (LH - y - 4); const xx = (hash(i * 3.3) * LW + Math.sin(t * 0.7 + i) * 3); c.fillRect(R(xx), R(yy), 3 + hash(i) * 10, 1); }
  c.fillStyle = "#6a8a50";
  for (let i = 0; i < 16; i++) { const px = hash(i * 7.1) * LW, py = y + 4 + hash(i * 2.9) * 26; c.fillRect(R(px), R(py), 2, 2); c.fillRect(R(px - 1), R(py - 2), 1, 2); }
}
function plank(c, x, y, w = 28) {
  rect(c, x, y, w, 6, "#7a5430"); rect(c, x, y, w, 2, "#a0784a");
  c.fillStyle = "#4a3018"; c.fillRect(x, y, 1, 6); c.fillRect(x + w - 1, y, 1, 6);
}
function threeOaks(c) { blit(c, oakSprite(), 200, 26); blit(c, oakSprite(), 290, 18, true); blit(c, oakSprite(), 340, 34); }
function nestOnOaks(c) {
  // гнездо на дубах из сучьев
  ell(c, 322, 66, 40, 10, "#3e2a1a"); ell(c, 322, 62, 34, 6, "#5a3e24");
  c.fillStyle = "#2c1c10"; for (let i = 0; i < 20; i++) c.fillRect(284 + i * 4, 58 + (i % 3) * 3, 6, 1);
}
function solAt(c, t, pose, patched = false, x = 300, y = 18) { blit(c, soloveySprite(pose, patched, Math.floor(t * 6) % 2), x, y); }
function bentMeadow(c, y, b, seed, t) {
  for (let i = 0; i < 150; i++) {
    const x = hash(i * 3.1 + seed) * LW, yy = y + hash(i * 1.7 + seed) * (LH - y - 4), h = 3 + hash(i) * 4;
    const dx = b * h * (1 + hash(i * 9)) + Math.sin(t * 8 + i) * b * 1.2;
    line(c, x, yy, x + dx, yy - h * (1 - b * 0.75), i % 3 ? "#2a4a1e" : "#6a8a3a");
    if (i % 7 === 0) { const fall = b * (10 + hash(i * 5) * 40), fx = x + dx + fall * 1.4; if (fall < 40) { rect(c, fx - 1, yy - h, 3, 1, "#6ab0f0"); rect(c, fx, yy - h - 1, 1, 3, "#6ab0f0"); rect(c, fx, yy - h, 1, 1, "#f8e870"); } }
  }
}
function fenceAndHall(c, t) {
  // палаты белокаменные с золотыми крылечками
  rect(c, 150, 56, 200, 104, "#ece4d0"); rect(c, 150, 56, 200, 4, "#a89878");
  poly(c, [[140, 58], [360, 58], [250, 22]], "#7a3030");
  for (let i = 0; i < 5; i++) { rect(c, 164 + i * 36, 72, 18, 26, "#231810"); rect(c, 163 + i * 36, 70, 20, 2, COL.gold); }
  // крылечки золочёные: как жар горят
  const glow = Math.floor(t * 4) % 2 ? COL.goldL : COL.gold;
  rect(c, 226, 112, 48, 48, COL.goldD); rect(c, 230, 116, 40, 44, glow);
  rect(c, 240, 124, 20, 36, "#2a1a10");
  poly(c, [[222, 112], [278, 112], [250, 98]], glow);
}
function ironFence(c, reveal) {
  // железный тын: на маковках только шлемы, без подробностей
  for (const [x0, w] of [[0, 150], [348, 132]]) { rect(c, x0, 120, w, 3, "#2a2a34"); rect(c, x0, 148, w, 3, "#2a2a34"); }
  for (let i = 0; i < 25; i++) {
    const x = 6 + i * 20; if (x > 150 && x < 348) continue;
    rect(c, x, 102, 4, 66, "#3a3a48"); rect(c, x + 1, 102, 1, 66, "#6a6a7c");
    poly(c, [[x - 1, 102], [x + 5, 102], [x + 2, 96]], "#6a6a7c");
    if (i / 25 < reveal) { ell(c, x + 2, 94, 5, 4, COL.steelD); ell(c, x + 1, 93, 3, 2, COL.steel); rect(c, x - 3, 96, 10, 1, "#4a4a58"); }
  }
}
function treasure(c, x, y, k) {
  if (k <= 0) return;
  const s = k;
  ell(c, x, y, 30 * s, 12 * s, "#a07820"); ell(c, x, y - 3 * s, 25 * s, 9 * s, COL.gold);
  c.fillStyle = COL.goldL; for (let i = 0; i < 16; i++) c.fillRect(R(x - 22 * s + hash(i) * 44 * s), R(y - 10 * s + hash(i * 3) * 12 * s), 2, 2);
  c.fillStyle = "#f4f0e8"; for (let i = 0; i < 8; i++) c.fillRect(R(x - 18 * s + hash(i * 5) * 36 * s), R(y - 8 * s + hash(i * 7) * 12 * s), 2, 2);
  c.fillStyle = "#c8d0dc"; for (let i = 0; i < 6; i++) c.fillRect(R(x - 18 * s + hash(i * 9) * 36 * s), R(y - 5 * s + hash(i * 11) * 8 * s), 3, 1);
}
function woman(col, frame = 0) {
  return sprite("woman" + col + frame, 22, 30, (c) => {
    poly(c, [[6, 12], [15, 12], [19, 28], [3, 28]], col);
    rect(c, 10, 12, 2, 16, COL.gold);
    disc(c, 11, 7, 4, COL.skin);
    if (frame) rect(c, 10, 9, 2, 2, "#5a1010");
    poly(c, [[6, 5], [16, 5], [15, 0], [11, -2], [7, 0]], COL.red); rect(c, 6, 5, 10, 1, COL.gold);
    rect(c, 6, 7, 2, 10, "#6a4020");
  });
}
function ilyaFoot(frame = 0, sword = false) {
  return sprite("ilf" + frame + sword, 34, 44, (c) => {
    const k = frame % 2 ? 1 : 0;
    poly(c, [[10, 14], [4, 18], [2, 34], [10, 36], [14, 24]], COL.red);
    rect(c, 11, 30, 5, 9 - k, COL.mailD); rect(c, 18, 30, 5, 9 - (1 - k), COL.mailD);
    rect(c, 10, 38 - k, 7, 3, COL.leather); rect(c, 18, 38 - (1 - k), 7, 3, COL.leather);
    poly(c, [[10, 12], [24, 12], [25, 32], [9, 32]], COL.mail);
    c.fillStyle = COL.mailD; for (let y = 13; y < 31; y += 2) for (let x = 11 + (y % 4 ? 1 : 0); x < 24; x += 2) c.fillRect(x, y, 1, 1);
    rect(c, 9, 25, 16, 2, COL.leather); rect(c, 15, 25, 3, 2, COL.gold);
    disc(c, 17, 7, 5, COL.skin); rect(c, 19, 6, 2, 1, COL.hoof);
    poly(c, [[13, 9], [22, 7], [22, 13], [18, 16], [14, 13]], "#b0a088");
    poly(c, [[11, 6], [23, 6], [21, 1], [17, -5], [13, 1]], COL.steel); poly(c, [[13, 5], [16, 5], [16, -2], [14, 1]], COL.steelL);
    rect(c, 11, 6, 12, 1, COL.gold);
    if (sword) { line(c, 24, 15, 29, 9, COL.mailD, 3); rect(c, 28, 8, 3, 3, COL.skin); }
    else { line(c, 24, 15, 26, 25, COL.mailD, 3); rect(c, 25, 25, 3, 3, COL.skin); }
  });
}
function palaceFacade(c, bend = 0, burst = 0, porch = 0) {
  const W = (x, y) => x + (148 - y) * bend * 0.5;
  const dome = (x, y, r) => {
    const tx = W(x, y - r);
    rect(c, tx - r * 0.8, y, r * 1.6, 18, "#ece4d0");
    ell(c, tx, y - 3, r, r + 2, COL.gold); ell(c, tx - r * 0.4, y - 6, r * 0.3, r * 0.6, COL.goldL);
    line(c, tx, y - r - 5, W(x, y - r - 12), y - r - 14, COL.gold, 2);
    rect(c, W(x, y - r - 11) - 3, y - r - 11, 7, 1, COL.gold);
  };
  dome(120, 60, 16); dome(240, 40, 24); dome(360, 60, 16);
  rect(c, 80, 80, 320, 90, "#f0e8d4"); rect(c, 80, 80, 320, 4, "#c84834"); rect(c, 80, 84, 320, 3, COL.gold); rect(c, 80, 160, 320, 10, "#c8bea4");
  for (let i = 0; i < 8; i++) {
    const x = 96 + i * 38 + (i > 3 ? 18 : 0);
    if (burst > 0) rect(c, x, 96, 16, 28, "#1c1410");
    else { rect(c, x, 96, 16, 28, "#3c6aa8"); rect(c, x + 7, 96, 2, 28, "#c89a2c"); rect(c, x, 108, 16, 2, "#c89a2c"); ell(c, x + 8, 96, 8, 5, "#3c6aa8"); rect(c, x + 2, 98, 4, 8, "#7ca8d8"); }
    rect(c, x - 2, 124, 20, 2, "#c89a2c");
    if (burst > 0 && burst < 1) for (let k = 0; k < 7; k++) { const r = burst * (24 + hash(k + i * 9) * 90), an = hash(k * 3 + i) * 6.28; rect(c, x + 8 + Math.cos(an) * r, 110 + Math.sin(an) * r + burst * burst * 60, 3, 3, k % 2 ? "#7ca8d8" : "#f8f4e0"); }
  }
  rect(c, 214, 118, 52, 52, "#2a1810"); ell(c, 240, 118, 26, 16, "#2a1810"); rect(c, 238, 104, 4, 66, "#6a4020");
  // крылечки отваливаются
  const fall = porch * porch * 60, rot = porch * 0.5;
  c.save(); c.translate(280, 152 + fall); c.rotate(rot); rect(c, -14, -8, 28, 18, "#d8a84a"); rect(c, -14, -8, 28, 3, "#ffe680"); c.restore();
  c.save(); c.translate(200, 152 + fall); c.rotate(-rot); rect(c, -14, -8, 28, 18, "#d8a84a"); rect(c, -14, -8, 28, 3, "#ffe680"); c.restore();
}
function yardBack(c, t, pal, o = {}) {
  skyBands(c, pal.sky, 120);
  rect(c, 0, 120, LW, LH, pal.sky[5]);
  cloudsLayer(c, 10, t * 2, 8, pal.cloud, pal.cloudD);
  palaceFacade(c, o.bend || 0, o.burst || 0, o.porch || 0);
  for (const [x, w] of [[0, 84], [396, 84]]) {
    rect(c, x, 112, w, 58, "#e4dac2"); rect(c, x, 112, w, 2, "#a89878");
    for (let i = x; i < x + w; i += 12) rect(c, i, 106, 7, 6, "#e4dac2");
    c.fillStyle = "#c8bea4"; for (let y = 120; y < 170; y += 8) c.fillRect(x, y, w, 1);
  }
  rect(c, 0, 170, LW, 100, "#b4a68e");
  c.fillStyle = "#94866e";
  for (let y = 172; y < 200; y += 6) c.fillRect(0, y, LW, 1);
  for (let y = 172; y < 200; y += 6) for (let x = (y % 12 ? 0 : 7); x < LW; x += 14) c.fillRect(x, y, 1, 6);
}
function hallBack(c) {
  rect(c, 0, 0, LW, 150, "#7a2c2c");
  c.fillStyle = "#8e3a34"; for (let y = 0; y < 150; y += 24) for (let x = (y % 48 ? 0 : 24); x < LW; x += 48) c.fillRect(x + 12, y + 8, 12, 8);
  c.fillStyle = "#c89a2c"; for (let y = 4; y < 150; y += 24) for (let x = (y % 48 ? 0 : 24); x < LW; x += 48) c.fillRect(x + 17, y + 6, 2, 12);
  rect(c, 0, 120, LW, 50, "#5a1c20"); rect(c, 0, 120, LW, 2, "#c89a2c");
  for (const x of [60, 170, 280, 390]) {
    rect(c, x, 42, 36, 66, "#2c54a8"); ell(c, x + 18, 42, 18, 16, "#2c54a8");
    rect(c, x + 3, 40, 30, 66, "#7ca8d8"); ell(c, x + 18, 40, 15, 14, "#7ca8d8");
    rect(c, x + 17, 26, 2, 80, "#c89a2c"); rect(c, x + 3, 66, 30, 2, "#c89a2c");
    poly(c, [[x + 2, 108], [x + 34, 108], [x + 54, 170], [x - 16, 170]], "#a84a3c");
  }
  for (const x of [8, 130, 240, 350, 454]) { rect(c, x, 0, 18, 170, "#ece4d0"); rect(c, x + 13, 0, 5, 170, "#c8bea4"); rect(c, x - 2, 0, 22, 8, COL.gold); rect(c, x - 2, 162, 22, 8, COL.gold); }
  rect(c, 0, 170, LW, 100, "#3c2438");
  c.fillStyle = "#5a3a50";
  for (let y = 170, r = 0; y < 270; y += 10, r++) for (let x = (r % 2) * 20; x < LW; x += 40) c.fillRect(x, y, 20, 10);
}
function feastTable(c, x, y, w) {
  rect(c, x, y + 12, w, 16, "#6a3a1a"); rect(c, x, y, w, 14, "#f4ecd8"); rect(c, x, y + 12, w, 3, "#c84834");
  for (let i = 0; i < w / 26; i++) {
    const cx = x + 8 + i * 26;
    if (i % 3 === 0) blit(c, cupSprite(true), cx, y - 12);
    else if (i % 3 === 1) { ell(c, cx + 6, y - 2, 8, 4, "#c89a2c"); ell(c, cx + 6, y - 4, 5, 3, "#a84a20"); }
    else { ell(c, cx + 6, y - 3, 7, 5, "#c88a3c"); rect(c, cx + 2, y - 5, 8, 1, "#e8c078"); }
  }
}
function scanWave(c, cv, amp, t) {
  if (amp <= 0.01) return;
  for (let y = 0; y < 200; y++) { const dx = R(Math.sin(y * 0.09 + t * 16) * amp); if (dx) c.drawImage(cv, 0, y, LW, 1, dx, y, LW, 1); }
}
function bogatyr(i, frame = 0) { return muzhikSprite(["#7ca0d8", "#c8d0b0", "#d8c8a8"][i % 3], frame, { hat: ["#6a2c2c", "#3c2a1c", "#2c4a6a"][i % 3], beard: "#6a5030" }); }

const SC = {
  // ---------- заставка ----------
  title(c, t) {
    const u = t / V0;
    skyBands(c, ["#141240", "#241c5c", "#4c2a78", "#8a3c7c", "#d05c6c", "#f09458"], 170);
    rect(c, 0, 170, LW, 110, "#f09458");
    disc(c, 240, 170 - u * 26, 50, "#ffcc78"); disc(c, 240, 170 - u * 26, 42, "#fff0b8");
    forestLayer(c, 176, 34, 20, 7, "#2a1c48", 30 + t * 2);
    hillsLayer(c, 206, 8, 130, 4, "#1a1834", 10 + t * 4);
    rect(c, 0, 214, LW, 60, "#141228");
    groundLayer(c, 226, t * 90, ["#1c2a2c", "#2c423c", "#18222a"], "#121c1e");
    blit(c, riderSprite(gallop(t, 12), { spear: true }), 196, 158);
    const d = springPop(t - 0.5), y1 = lerp(-70, 22, d);
    const a = "ИЛЬЯ МУРОМЕЦ", b = "И СОЛОВЕЙ-РАЗБОЙНИК";
    const wa = textWidth(a, true) * 3, wb = textWidth(b, true) * 2;
    drawText(c, a, R((LW - wa) / 2) + 2, R(y1) + 2, "#2a0e0e", { scale: 3, bold: true });
    drawText(c, a, R((LW - wa) / 2), R(y1), "#ffd860", { scale: 3, bold: true, shadow: "#a84a14" });
    drawText(c, b, R((LW - wb) / 2), R(lerp(290, 54, springPop(t - 1.1))), "#fff6d8", { scale: 2, bold: true, shadow: "#3a1450" });
    if (t > 1.9) { const s = "По страницам старинной былины"; drawText(c, s, R((LW - textWidth(s)) / 2), 80, "#fff0c8", { shadow: "#2a1040" }); }
    if (t > 3.2 && Math.floor(t * 2.5) % 2 === 0) { const s = "▶ В ПУТЬ"; drawText(c, s, R((LW - textWidth(s, true)) / 2), 246, "#fff6d8", { bold: true, shadow: "#120c14" }); }
  },

  // 1–3: скачка с горы на гору
  ride(c, t, a) {
    const v = a(1), scroll = 100 + v * 230;
    landscape(c, t, PAL.day, scroll * 0.6, { noGround: true, sun: [420, 40, 14] });
    const gy = (x) => 168 - (Math.sin((x + scroll) / 74) * 16 + Math.sin((x + scroll) / 31) * 4);
    for (let x = 0; x < LW; x++) { const y = R(gy(x)); rect(c, x, y, 1, 2, "#8ec04e"); rect(c, x, y + 2, 1, LH - y, "#5a9238"); }
    if (a(3) > 0) for (let i = 0; i < 5; i++) {
      const x = ((i * 240 - scroll) % (LW + 160) + LW + 160) % (LW + 160) - 80;
      for (let k = 0; k < 40; k++) rect(c, x + k, gy(x + k) - 1, 1, 4, k % 6 ? "#3c84d8" : "#b0d4f0");
    }
    const hx = 160, jump = Math.abs(Math.sin(v * 3.1)) * 40;
    blit(c, riderSprite(gallop(t, 17)), hx, gy(hx + 40) - 66 - jump);
    for (let i = 0; i < 6; i++) rect(c, hx + 10 - ((t * 200 + i * 40) % 120), gy(hx) - 2 - hash(i) * 10 - jump * 0.2, 4, 2, "#d8ecb0");
    label(c, "ДОРОГА НА КИЕВ");
  },

  // 4–12: Брынские леса, болото, настилы
  bog(c, t, a) {
    const tilt = a(6) > 0 && a(7) < 0;
    const hasIlya = a(7) > 0;
    landscape(c, t, PAL.swamp, 40, { noGround: true });
    forestLayer(c, 160, 34, 22, 9, PAL.swamp.near, 60);
    bogLayer(c, t, 160);
    // настилы растут от левого края
    const n = a(10) > 0 ? clamp(a(10) / (S(13) - S(10))) : 0;
    const planks = R(n * 15);
    for (let i = 0; i < planks; i++) plank(c, 40 + i * 30, 172 + (i % 2));
    const sink = a(5) > 0 ? clamp(a(5) / 2.5) : 0;
    const hx = 92, hy = hasIlya ? lerp(126, 112, clamp(a(10))) : 112 + sink * 14;
    if (a(4) < 0 || !hasIlya) blit(c, riderSprite(a(4) < 0 ? gallop(t, 10) : 0, { walk: true }), hx, hy);
    else blit(c, riderSprite(0, { walk: true, noRider: true }), hx - 26, 126 - clamp(a(10) / 2) * 12);
    if (hasIlya) {
      const ix = 134 + planks * 22;
      blit(c, ilyaFoot(planks && planks < 15 ? Math.floor(t * 6) % 2 : 0), Math.min(ix, 400), 134);
      // вырванный дуб в руке
      if (a(9) > 0 && n < 1) {
        const sw = sinPi((t * 0.9) % 1);
        const ox = Math.min(ix, 400) + 34, oy = 136 - sw * 30;
        blitRot(c, oakSprite(), ox + 8, oy, 0.9 + sw * 0.5, 0.36);
        if (sw < 0.15) for (let i = 0; i < 5; i++) rect(c, ox + 10 + i * 5, 160 + hash(i) * 6, 2, 2, "#3a2a1a");
      }
    }
    if (tilt) for (let i = 0; i < 6; i++) { const p = (t * 1.3 + i / 6) % 1; ell(c, 100 + i * 12, 186 - p * 8, 3 + p * 2, 1, "#6a8a50"); }
    if (n > 0) hudCounter(c, R(n * 30) + " вёрст настила");
    label(c, "БРЫНСКИЕ ЛЕСА");
  },

  // 13–17: река и прыжок
  river(c, t, a) {
    landscape(c, t, PAL.day, 120, { noGround: true, sun: [410, 40, 14] });
    forestLayer(c, 160, 22, 19, 9, PAL.day.near, 60);
    rect(c, 0, 160, LW, LH - 160, "#5a9238"); rect(c, 0, 160, LW, 2, "#78ae48");
    const rx = 170, rw = 150;
    rect(c, rx, 160, rw, 110, "#2c6cc8");
    c.fillStyle = "#6ab0f0"; for (let i = 0; i < 80; i++) { const y = 162 + hash(i * 2.2) * 104; const x = rx + ((hash(i * 3.3) * rw + t * (24 + i % 7 * 8)) % rw); c.fillRect(R(x), R(y), 6 + hash(i) * 6, 1); }
    c.fillStyle = "#78808c"; for (let i = 0; i < 12; i++) { const x = rx + 12 + hash(i * 5.1) * (rw - 24), y = 168 + hash(i * 7.7) * 30; ell(c, x, y, 5 + hash(i) * 4, 3, "#6a7280"); ell(c, x - 1, y - 1, 3, 2, "#98a0ac"); }
    const j = a(17);
    if (a(16) < 0) { blit(c, riderSprite(gallop(t, 8), { walk: true }), lerp(-60, 60, clamp(a(13) / 6)), 112); }
    else if (j < 0) { const rear = clamp(a(16) / 0.9); blitRot(c, riderSprite(0, { walk: true }), 102, 148 - rear * 8, -rear * 0.5); }
    else {
      const f = clamp(j / 2.1);
      const x = lerp(60, 340, f), y = 112 - sinPi(f) * 104;
      blitRot(c, riderSprite(gallop(t, 8)), x + 42, y + 36, -0.3 + f * 0.6);
    }
    label(c, "РЕЧКА СМОРОДИНА");
  },

  // 18–27: Соловей на трёх дубах
  oaks(c, t, a) {
    landscape(c, t, PAL.grim, 30, { noGround: true });
    bowForest(c, 158, 0);
    groundLayer(c, 160, 30, ["#3a5a2c", "#4e7238", "#2e4a24"], null);
    bentMeadow(c, 160, 0, 1, t);
    threeOaks(c); nestOnOaks(c);
    solAt(c, t, "sit", false, a(23) > 0 ? 300 : 300, a(23) > 0 ? 8 : 18);
    // сокол, зверь, змей поворачивают
    const fly = (x, y, sp) => { const u = clamp((t - S(20)) / 3); return lerp(x, x + sp, sinPi(u)); };
    if (a(20) > -0.2 && a(22) < 0) {
      const u = clamp((t - S(20)) / 2.2);
      for (let i = 0; i < 3; i++) blit(c, crowSprite(Math.floor(t * 8 + i)), 40 + sinPi(u) * 180 - i * 18, 40 + i * 12, u > 0.5);
      const w = clamp((t - S(20) - 1) / 2);
      const wx = 30 + sinPi(w) * 140;
      ell(c, wx + 12, 172, 12, 5, "#7c7c88"); disc(c, wx + 25, 168, 4, "#8e8e98");
      rect(c, wx + 2, 177, 2, 5, "#5c5c68"); rect(c, wx + 20, 177, 2, 5, "#5c5c68");
      const z = clamp((t - S(21)) / 2);
      for (let i = 0; i < 18; i++) rect(c, 30 + sinPi(z) * 170 + i * 3, 182 + Math.sin(i * 0.9 + t * 6) * 2, 3, 2, "#4a7a30");
    }
    if (a(24) > 0.3 && a(27) < 1) { // окрик
      const k = springPop(a(24) - 0.3);
      for (let i = 0; i < 3; i++) { const r = 8 + i * 8; rect(c, 300 + 23 - r * k, 18 + 18 - r * k * 0.5, 2, 2, "#ff7a4a"); rect(c, 300 + 23 + r * k, 18 + 18 - r * k * 0.5, 2, 2, "#ff7a4a"); }
    }
    if (a(18) > 0) {
      const k = springPop(a(18));
      const s = "СОЛОВЕЙ-РАЗБОЙНИК", w = textWidth(s, true) * 2 + 20;
      if (a(18) < 3.2) { panel(c, R((LW - w) / 2), R(lerp(-30, 8, k)), w, 28, "#3c1420"); drawText(c, s, R((LW - w) / 2) + 10, R(lerp(-30, 8, k)) + 7, "#ffd860", { scale: 2, bold: true }); }
    }
    blit(c, riderSprite(gallop(t, 7), { walk: true }), lerp(-40, 70, clamp((t - S(22)) / 8)), 112);
    label(c, "ЗАПОВЕДНЫЕ ДУБЫ");
  },

  // 28–38: свист, конь на коленях, плётка
  whistle(c, t, a) {
    const on = a(28) > 0 && a(32) < 0;
    landscape(c, t, PAL.grim, 30, { noGround: true }); // подложка, чтобы при тряске не открывались края
    c.save();
    if (on) c.translate(R(Math.sin(t * 40) * 1.6), R(Math.cos(t * 31) * 1.2));
    landscape(c, t, PAL.grim, 30, { noGround: true });
    const b = clamp(a(29) / 1.2), f = clamp(a(30) / 1.3);
    bowForest(c, 158, b);
    groundLayer(c, 160, 30, ["#3a5a2c", "#4e7238", "#2e4a24"], null);
    bentMeadow(c, 160, clamp(a(30) / 1), 1, t);
    // столетние дубы покачнулись
    const sway = on ? Math.sin(t * 7) * 0.05 * f : 0;
    blitRot(c, oakSprite(), 275 + sway * 60, 111, sway); blitRot(c, oakSprite(), 365 + sway * 40, 103, sway); blitRot(c, oakSprite(), 415 + sway * 50, 119, sway);
    nestOnOaks(c);
    solAt(c, t, a(32) < 0 ? "whistle" : "sit");
    if (on) whistleWaves(c, 323, 40, t, 1);
    c.restore();
    const kneel = a(31) > 0 && a(34) < 0.4;
    const rx = 70;
    const s = riderSprite(0, { walk: true });
    if (kneel) blitRot(c, s, rx + 42, 146, 0.28 + (a(32) < 0 ? Math.sin(t * 18) * 0.02 : 0));
    else if (a(34) > 0) blitRot(c, s, rx + 42, 146, 0.04);
    else blit(c, riderSprite(gallop(t, 8), { walk: true }), rx, 112);
    if (a(34) > 0 && a(35) < 0) { const sw = (t * 3) % 1, hx = rx + 32, hy = 118; line(c, hx, hy, hx - 26 + sw * 18, hy - 18 + sw * 32, "#3a2010"); }
    label(c, "ЗАПОВЕДНЫЕ ДУБЫ");
  },

  // 39–47: выстрел
  arrow(c, t, a) {
    const zoomed = a(45) > 0.7;
    if (!zoomed) {
      landscape(c, t, PAL.grim, 30, { noGround: true });
      bowForest(c, 158, 1);
      groundLayer(c, 160, 30, ["#3a5a2c", "#4e7238", "#2e4a24"], null);
      bentMeadow(c, 160, 1, 1, t);
      threeOaks(c); nestOnOaks(c);
      const peek = a(42) > 0 ? clamp(a(42) / 0.6) : 0;
      solAt(c, t, "sit", false, 300, lerp(26, 6, peek));
      const hx = lerp(70, 104, clamp(a(39) / 2));
      blit(c, riderSprite(a(39) < 2 ? gallop(t, 9) : 0, { walk: a(39) >= 2, bow: a(43) > 0 }), hx, 112);
      if (a(43) > 0) {
        const bx = hx + 64, by = 118, draw = clamp(a(43) / 1.5);
        line(c, bx + 4, by - 22, bx + 12, by, "#a0522c", 2); line(c, bx + 12, by, bx + 4, by + 22, "#a0522c", 2);
        line(c, bx + 4, by - 22, bx + 4 - draw * 12, by, "#f8f0d8"); line(c, bx + 4 - draw * 12, by, bx + 4, by + 22, "#f8f0d8");
        if (a(44) > 0 && a(45) < 0) { line(c, bx + 4 - draw * 12, by, bx + 28, by, "#e8e0c8"); rect(c, bx + 26, by - 1, 4, 3, COL.steelL); }
        if (a(45) > 0) {
          const f = clamp(a(45) / 0.7), ax = lerp(bx + 28, 320, f), ay = lerp(by, 40, f);
          line(c, ax - 12, ay + 3, ax, ay, "#e8e0c8");
          for (let i = 1; i < 4; i++) rect(c, ax - 12 - i * 8, ay + 3 + i * 2, 4, 1, "#fff4a0");
        }
      }
    } else {
      skyBands(c, PAL.grim.sky, 200);
      const k = springPop(a(45) - 0.7);
      const hit = a(46);
      blitRot(c, soloveySprite(hit > 0 ? "sit" : "whistle", hit > 0.2), 240 + (hit > 0 ? Math.sin(t * 30) * 3 * Math.max(0, 1 - hit) : 0), 110, 0, 2.8 * k);
      if (hit > -0.05 && hit < 0.5) {
        for (let i = 0; i < 12; i++) { const r = (hit + 0.1) * 280; rect(c, 240 + Math.cos(i * 0.52) * r - 2, 88 + Math.sin(i * 0.52) * r * 0.8, 4, 4, i % 2 ? "#fff4a0" : "#ff7a4a"); }
        wash(c, "#fff8d0", clamp(0.7 - (hit + 0.05) * 1.8));
      }
    }
    hpBar(c, "СОЛОВЕЙ", 120, 22, 150, a(46) > 0 ? Math.max(0, 1 - a(46) * 1.2) : 1);
    label(c, "ЗАПОВЕДНЫЕ ДУБЫ");
  },

  // 47–55: падение и ремни
  capture(c, t, a) {
    landscape(c, t, PAL.grim, 30, { noGround: true });
    bowForest(c, 158, 1 - clamp(a(47) / 5));
    groundLayer(c, 160, 30, ["#3a5a2c", "#4e7238", "#2e4a24"], null);
    bentMeadow(c, 160, 1 - clamp(a(47) / 5), 1, t);
    threeOaks(c); nestOnOaks(c);
    const k = clamp(a(47) / 1.6);
    const hx = 104;
    const lx = lerp(322, 196, k), ly = lerp(44, 168, k * k);
    blitRot(c, soloveySprite("sit", true), lx, ly, k * 7, 1 - k * 0.2); // покатился как сноп
    blit(c, riderSprite(0, { walk: true }), hx, 112);
    if (a(48) > 0 && a(49) < 1) for (let i = 0; i < 5; i++) { const r = sinPi((t * 1.1 + i / 5) % 1) * 22; line(c, lx - r, ly - 8 + i * 4, lx + r, ly - 6 + i * 4, COL.leather, 2); }
    if (a(50) > 0) line(c, lx + 6, ly - 10, hx + 66, 142, COL.leather, 2);
    label(c, "ЗАПОВЕДНЫЕ ДУБЫ");
  },

  // 56–77: подворье
  court(c, t, a) {
    landscape(c, t, PAL.dusk, 80, { noGround: true, sun: [420, 42, 12], sunCol: "#ffc888" });
    groundLayer(c, 160, 40, ["#3a4a2e", "#4e6038", "#2c3a24"], null);
    fenceAndHall(c, t);
    ironFence(c, clamp(a(60) / 1.6));
    const wins = [[164, 72], [200, 72], [236, 72], [272, 72], [308, 72]];
    if (a(63) > 0) { const k = springPop(a(63)); c.save(); c.beginPath(); c.rect(236, 72, 18, 26); c.clip(); blit(c, girlSprite(COL.blue, Math.floor(t * 7) % 2), 236, 72 + 30 - k * 26); c.restore(); }
    if (a(67) > 0) { const k = springPop(a(67)); c.save(); c.beginPath(); c.rect(272, 72, 18, 26); c.clip(); blit(c, girlSprite(COL.purple, 0), 272, 72 + 30 - k * 26); c.restore(); }
    // Илья въезжает
    const x = lerp(-60, 74, clamp(a(56) / 7));
    const stop = a(56) >= 7;
    blit(c, riderSprite(stop ? 0 : gallop(t, 9), { walk: true }), x, 112);
    boundSolovey(c, x + 50, 170, t);
    // Пелька
    if (a(71) > 0) {
      const dead = a(77) > 0;
      const pk = clamp(a(71) / 2.2);
      const px = lerp(250, 300, pk);
      const board = (bx, by, ang) => { c.save(); c.translate(R(bx), R(by)); c.rotate(ang); rect(c, -14, -3, 28, 7, "#5a5a68"); rect(c, -14, -3, 28, 2, "#8a8a98"); c.restore(); };
      if (!dead) blit(c, woman(COL.green, a(73) > 0 && a(74) < 0 ? 1 : 0), px, 136);
      else {
        const fk = clamp(a(77) / 0.8);
        blitRot(c, woman(COL.green), px + 12 + fk * 16, 150 + fk * 12 - sinPi(fk) * 10, fk * 1.6);
        if (a(77) < 2) for (let i = 0; i < 6; i++) { const an = t * 5 + i; rect(c, px + 18 + Math.cos(an) * 12, 136 + Math.sin(an) * 4, 2, 2, "#fff4a0"); }
      }
      // доска
      if (a(72) > 0 && a(73) < 0) board(px + 4, 134, 0);
      if (a(73) > 0) {
        const T1 = S(75) - S(73);
        if (t < S(75)) { const f = clamp(a(73) / T1); board(lerp(px, x + 60, f), 134 - sinPi(f) * 44, f * 7); }
        else if (t < S(77)) { const f = clamp((t - S(75)) / (S(77) - S(75))); board(lerp(x + 60, px + 6, f), 130 - sinPi(f) * 50, 7 + f * 8); if (a(75) < 0.3) for (let i = 0; i < 8; i++) rect(c, x + 60 + Math.cos(i) * 12, 130 + Math.sin(i) * 12, 2, 2, "#fff4a0"); }
        else board(px + 6 + clamp(a(77)) * 20, 172, 0.1);
      }
      if (a(75) > -0.2 && a(75) < 0.3) { wash(c, "#fff8d0", 0.3); }
    }
    label(c, "ПОДВОРЬЕ СОЛОВЬЯ");
  },

  // 78–90: жена и выкуп
  ransom(c, t, a) {
    landscape(c, t, PAL.dusk, 80, { noGround: true, sun: [420, 42, 12], sunCol: "#ffc888" });
    groundLayer(c, 160, 40, ["#3a4a2e", "#4e6038", "#2c3a24"], null);
    fenceAndHall(c, t);
    ironFence(c, 1);
    blit(c, riderSprite(0, { walk: true }), 74, 112);
    boundSolovey(c, 124, 170, t);
    const k = clamp((t - S(78)) / 1.5);
    const wx = lerp(250, 168, smooth(k));
    if (a(79) < 0) blit(c, woman(COL.purple, Math.floor(t * 6) % 2), wx, 138 + (k < 1 ? -(Math.floor(t * 8) % 2) : 0));
    else blitRot(c, woman(COL.purple, Math.floor(t * 5) % 2), wx + 12, 166, 1.0);
    const tr = (n) => clamp((t - S(n)) / 1);
    const pile = Math.max(tr(79) * 0.45, tr(80) * 0.8, tr(81));
    if (a(84) < 2) treasure(c, 244, 182, pile);
    else treasure(c, 244, 182, pile * Math.max(0, 1 - (a(84) - 2) / 1.5));
    // «слёзы и кровь» — только символично, блеск гаснет
    if (a(85) > 0 && a(87) < 0) for (let i = 0; i < 8; i++) { const p = (t * 0.9 + i / 8) % 1; rect(c, 224 + i * 6, 150 + p * 28, 1, 2, "#a8c8ff"); }
    label(c, "ПОДВОРЬЕ СОЛОВЬЯ");
  },

  // 91–96: дорога и Киев
  kiev(c, t, a) {
    if (a(93) < 0) {
      const scroll = (t - S(91)) * 200;
      landscape(c, t, PAL.gold, scroll, { sun: [410, 44, 14] });
      blit(c, riderSprite(gallop(t, 15)), 170, 112);
      boundSolovey(c, 220, 168, t);
    } else {
      const v = a(93);
      skyBands(c, PAL.gold.sky, 150); rect(c, 0, 150, LW, LH, PAL.gold.sky[5]);
      cloudsLayer(c, 14, t * 2, 8, PAL.gold.cloud, PAL.gold.cloudD);
      hillsLayer(c, 128, 12, 200, 2.2, PAL.gold.far, 40);
      const X = (x) => x - clamp(v / 6) * 80;
      const tower = (x, h, r) => { rect(c, X(x), 148 - h, 34, h, "#ece4d0"); rect(c, X(x) + 26, 148 - h, 8, h, "#c8bea4"); ell(c, X(x) + 17, 148 - h - 6, r, r + 2, "#f0c040"); ell(c, X(x) + 14, 148 - h - 8, r * 0.4, r * 0.6, "#ffe680"); rect(c, X(x) + 16, 148 - h - 20, 2, 10, "#f0c040"); rect(c, X(x) + 13, 148 - h - 17, 8, 1, "#f0c040"); };
      for (const [x, h, r] of [[-20, 66, 11], [110, 86, 14], [176, 104, 17], [240, 86, 14], [310, 66, 11], [420, 58, 10], [520, 72, 11]]) tower(x, h, r);
      rect(c, X(-120), 112, 900, 38, "#f4ecd8");
      for (let x = -120; x < 780; x += 13) rect(c, X(x), 106, 7, 6, "#f4ecd8");
      rect(c, X(190), 118, 34, 32, "#1e1410"); ell(c, X(207), 118, 17, 10, "#1e1410");
      groundLayer(c, 150, 40, PAL.gold.ground, PAL.gold.tuft);
      const x = lerp(-60, 150, clamp(v / 4));
      if (a(94) < 0) { blit(c, riderSprite(gallop(t, 8), { walk: true }), x, 96); boundSolovey(c, x + 50, 152, t); }
      else {
        rect(c, 232, 120, 4, 34, COL.bay); rect(c, 230, 118, 8, 3, COL.gold);
        blit(c, riderSprite(0, { walk: true, noRider: a(94) > 0.8 }), 150, 96);
        boundSolovey(c, 200, 152, t);
        if (a(94) > 0.8) blit(c, ilyaFoot(Math.floor(t * 5)), lerp(250, 400, clamp(a(96) / 2.4)), 112);
      }
    }
    label(c, "СТОЛЬНЫЙ КИЕВ-ГРАД");
  },

  // 97–111: пир, разговор
  feast(c, t, a) {
    hallBack(c);
    feastTable(c, 200, 178, 260);
    for (let i = 0; i < 3; i++) blit(c, bogatyr(i, 0), 226 + i * 30, 150 + (Math.sin(t * 3 + i) > 0.8 ? -1 : 0));
    blit(c, princeSprite(false, 0), 320, 130);
    blit(c, woman(COL.purple), 356, 138);
    rect(c, 28, 74, 44, 96, "#120c0c");
    const enter = a(99) > 0;
    if (!enter) { rect(c, 28, 74, 44, 96, "#6a3a1a"); }
    else {
      poly(c, [[28, 74], [14, 62], [14, 184], [28, 170]], "#6a3a1a");
      const w = clamp(a(99) / 1.8), x = lerp(30, 118, w);
      const bow = a(99) > 1.8 && a(100) < 0 ? sinPi(clamp((a(99) - 1.8) / 1)) * 0.6 : 0;
      blitRot(c, ilyaFoot(w < 1 ? Math.floor(t * 5) : 0), x + 17, 150, bow);
    }
    label(c, "СВЕТЛАЯ ГОРНИЦА");
  },

  // 112–117: все на двор
  yardRun(c, t, a) {
    yardBack(c, t, PAL.gold);
    blit(c, riderSprite(0, { walk: true, noRider: true }), 264, 112);
    blitRot(c, soloveySprite("sit", true), 234, 172, 1.25, 1);
    line(c, 252, 152, 286, 142, COL.leather, 2);
    const k = clamp(a(112) / 4);
    blit(c, ilyaFoot(Math.floor(t * 7)), lerp(226, 356, smooth(k)), 124);
    blit(c, princeSprite(true, Math.floor(t * 8)), lerp(226, 150, smooth(k)), 126);
    blit(c, woman(COL.purple, 0), lerp(226, 116, smooth(k)), 138);
    for (let i = 0; i < 3; i++) blit(c, bogatyr(i, Math.floor(t * 7 + i)), lerp(226, 42 + i * 26, smooth(clamp(k - i * 0.1))), 146);
    label(c, "КНЯЖЕСКИЙ ДВОР");
  },

  // 118–137: уговоры и чара
  yard(c, t, a) {
    yardBack(c, t, PAL.gold);
    blit(c, riderSprite(0, { walk: true, noRider: true }), 264, 112);
    const drink = a(133) > 0 && a(134) < 0 ? clamp(a(133) / 1.6) : 0;
    blitRot(c, soloveySprite("sit", true), 234, 172 - drink * 8, 1.25 - drink * 1.05, 1);
    line(c, 252, 152, 286, 142, COL.leather, 2);
    blit(c, ilyaFoot(0), 356, 124, true);
    blit(c, princeSprite(true, 0), 150 + (a(119) > 0 && a(120) < 0 ? Math.sin(t * 12) : 0), 126);
    blit(c, woman(COL.purple, 0), 116, 138);
    for (let i = 0; i < 3; i++) blit(c, bogatyr(i, 0), 42 + i * 26, 146);
    const shown = [[129, 0, true], [130, 1, true], [131, 2, false]];
    if (a(129) > 0 && a(134) < 0) {
      if (a(133) < 0) shown.forEach(([n, i, f]) => { if (a(n) > 0) { const k = springPop(a(n)); if (n === 131) { ell(c, 196 + i * 28, 118 - k * 6, 9, 6, "#c88a3c"); rect(c, 190 + i * 28, 112 - k * 6, 10, 1, "#e8c078"); } else blitRot(c, cupSprite(f), 196 + i * 28, 118 - k * 6, 0, 2); } });
      else blitRot(c, cupSprite(drink < 1), 244, 150 - drink * 14, 0.3 + drink * 1.5, 2);
    }
    label(c, "КНЯЖЕСКИЙ ДВОР");
  },

  // 138–149: главный свист
  blast(c, t, a, cv) {
    const v = a(141);
    const on = a(141) > 0 && a(150) < 0;
    const bend = clamp(a(144) / 1) * (1 + Math.sin(t * 11) * 0.05);
    const burst = a(145) > 0 ? clamp(a(145) / 2) : 0;
    const porch = clamp((a(144) - 1.5) / 1.5);
    const fall = clamp(a(146) / 1.5);
    yardBack(c, t, on ? PAL.grim : PAL.gold, { bend: on ? bend : 0, burst, porch }); // подложка для тряски
    c.save();
    if (on) { const sh = 2 + clamp(v / 2) * 3; c.translate(R(Math.sin(t * 47) * sh), R(Math.cos(t * 37) * sh * 0.7)); }
    yardBack(c, t, on ? PAL.grim : PAL.gold, { bend: on ? bend : 0, burst, porch });
    // кони разбегаются
    if (a(145) > 0) for (let i = 0; i < 2; i++) blit(c, riderSprite(gallop(t, 17), { noRider: true }), 440 - a(145) * (70 + i * 30) + i * 60, 112 + i * 5, true);
    // Илья и князь под кафтаном
    blit(c, ilyaFoot(0), 300, 124, true);
    const hide = a(148) > 0;
    blit(c, princeSprite(true, on && !hide ? Math.floor(t * 8) % 2 : 0), hide ? lerp(150, 276, clamp(a(148) / 1.4)) : 150, 126);
    if (hide && a(148) > 1.4) { poly(c, [[274, 130], [306, 130], [316, 172], [264, 172]], COL.red); poly(c, [[280, 136], [300, 136], [308, 170], [272, 170]], COL.redD); }
    blit(c, soloveySprite(a(150) < 0 ? "whistle" : "sit", true, Math.floor(t * 10) % 2), 196, 116);
    // богатыри на четвереньках
    for (let i = 0; i < 5; i++) {
      const x0 = 32 + i * 24;
      if (fall <= 0) blit(c, bogatyr(i, 0), x0, 146);
      else blitRot(c, bogatyr(i, Math.floor(t * 4 + i)), x0 + 11 + clamp(a(147)) * Math.sin(t * 1.1 + i) * 8 + (a(147) > 0 ? a(147) * (i % 2 ? 6 : -4) : 0), 170, fall * 1.5);
    }
    if (a(141) > 0 && a(150) < 0) whistleWaves(c, 219, 136, t * 1.4, 1.6);
    c.restore();
    if (on) scanWave(c, cv, 2 + clamp(v / 3) * 5, t);
    label(c, "КНЯЖЕСКИЙ ДВОР");
  },

  // 150–157: расчёт
  end(c, t, a) {
    if (a(156) < 0) {
      yardBack(c, t, PAL.grim, { bend: 0.6, burst: 1, porch: 1 });
      blit(c, ilyaFoot(0), 300, 124, true);
      blit(c, soloveySprite("sit", true), 196, 116);
      for (let i = 0; i < 5; i++) blitRot(c, bogatyr(i), 43 + i * 24, 170, 1.5);
    } else {
      landscape(c, t, PAL.dusk, 200, { sun: [240, 112, 46], sunGlow: "#f8a860", sunCol: "#ffd890" });
      const sw = clamp(a(156) / 0.7);
      blit(c, sprite("ilsil", 34, 44, (cc) => { cc.drawImage(ilyaFoot(0, true), 0, 0); cc.globalCompositeOperation = "source-in"; cc.fillStyle = "#1a1030"; cc.fillRect(0, 0, 34, 44); }, null), 224, 118);
      line(c, 252, 122, 252 + Math.sin(-0.6 + sw * 2.2) * 40, 122 - Math.cos(-0.6 + sw * 2.2) * 40, "#fff4d0", 2);
      if (a(156) > 0.6) {
        wash(c, "#fff8e0", clamp(0.9 - (a(156) - 0.6) * 1.1));
        for (let i = 0; i < 22; i++) { const ph = (a(156) - 0.6) * (0.3 + hash(i) * 0.5) + hash(i * 3); rect(c, 250 + Math.sin(ph * 8 + i) * 18 + (a(156) - 0.6) * (6 + i), 110 + ph * 40 + hash(i * 7) * 20, 3, 1, i % 3 ? COL.featherL : COL.feather); }
      }
      if (a(157) > 0) blit(c, sprite("hatg", 18, 12, (cc) => { poly(cc, [[1, 11], [17, 11], [14, 4], [9, 1], [4, 4]], COL.featherD); poly(cc, [[7, 2], [9, -2], [12, 2]], COL.red); }), 280, 166);
    }
    label(c, a(156) < 0 ? "КНЯЖЕСКИЙ ДВОР" : "ЧИСТО ПОЛЕ");
  },

  // 158–161: старший богатырь
  glory(c, t, a) {
    const pal = PAL.gold;
    yardBack(c, t, pal);
    blit(c, ilyaFoot(0), 226, 126);
    blit(c, princeSprite(true, 0), 186, 128);
    blit(c, woman(COL.purple), 152, 140);
    for (let i = 0; i < 4; i++) { const by = R(Math.abs(Math.sin(t * 4 + i)) * 3); blit(c, bogatyr(i, 0), 54 + i * 24, 146 - by); blit(c, bogatyr(i + 1, 0), 300 + i * 26, 146 - by); }
    if (a(159) > 0) { const k = springPop(a(159)); const s = "СТАРШИЙ БОГАТЫРЬ", w = textWidth(s, true) * 2 + 20; panel(c, R((LW - w) / 2), R(lerp(-30, 10, k)), w, 28, "#3c1420"); drawText(c, s, R((LW - w) / 2) + 10, R(lerp(-30, 10, k)) + 7, "#ffd860", { scale: 2, bold: true }); }
    label(c, "КНЯЖЕСКИЙ ДВОР");
  },

  // финал: крупное название
  final(c, t, a, cv, u) {
    const pal = PAL.gold;
    skyBands(c, pal.sky, 170);
    rect(c, 0, 170, LW, LH, pal.sky[5]);
    disc(c, 240, 150, 92, "#ffe89c"); disc(c, 240, 150, 78, "#fff6d0");
    for (let i = 0; i < 16; i++) { const an = i * 0.39 + t * 0.12; line(c, 240 + Math.cos(an) * 96, 150 + Math.sin(an) * 96, 240 + Math.cos(an) * 170, 150 + Math.sin(an) * 170, "#ffe89c"); }
    hillsLayer(c, 206, 14, 150, 1.6, "#6aa23e", 10, "#8ec04e");
    rect(c, 0, 210, LW, 60, "#6aa23e");
    groundLayer(c, 226, 40, ["#5a9238", "#78ae48", "#477a2c"], null);
    blit(c, riderSprite(gallop(t, 3), { spear: true, walk: true }), 198, 150);
    const k1 = springPop(u - 0.2), k2 = springPop(u - 0.7);
    const A = "ИЛЬЯ МУРОМЕЦ", B = "И СОЛОВЕЙ-РАЗБОЙНИК";
    const wa = textWidth(A, true) * 5, wb = textWidth(B, true) * 3;
    const ya = R(lerp(-90, 18, k1)), yb = R(lerp(-60, 68, k2));
    drawText(c, A, R((LW - wa) / 2) + 3, ya + 3, "#3a1208", { scale: 5, bold: true });
    drawText(c, A, R((LW - wa) / 2), ya, "#ffd24a", { scale: 5, bold: true, shadow: "#a0300c" });
    drawText(c, B, R((LW - wb) / 2) + 2, yb + 2, "#120c28", { scale: 3, bold: true });
    drawText(c, B, R((LW - wb) / 2), yb, "#fffaf0", { scale: 3, bold: true, shadow: "#7a2810" });
  },
};

function bowForest(c, base, b) {
  for (let i = 0; i < 26; i++) {
    const x = -20 + i * 21 + hash(i + 3) * 10, h = 30 + hash(i * 2 + 3) * 22, w = 11 + hash(i * 3 + 3) * 4;
    const lean = b * h * 0.95 * (0.8 + hash(i * 5 + 3) * 0.4), topY = base - h * (1 - b * 0.55);
    poly(c, [[x + lean, topY], [x + w, base], [x - w, base]], "#223a30");
    poly(c, [[x + lean, topY], [x + lean * 0.8 + w * 0.5, base - h * 0.6 * (1 - b * 0.4)], [x + lean * 0.7, base - h * 0.5 * (1 - b * 0.4)]], "#2e4e3c");
  }
}
