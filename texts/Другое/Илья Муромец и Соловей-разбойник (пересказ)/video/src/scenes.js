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
function palaceFacade(c, bend = 0, burst = 0, porch = 0) {
  const W = (x, y) => x + (148 - y) * bend * 0.5;
  const dome = (x, y, r) => {
    const tx = W(x, y - r), base = W(x, 82), hw = r * 0.8;
    poly(c, [[tx - hw, y], [tx + hw, y], [base + hw, 82], [base - hw, 82]], "#ece4d0");
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

function bowForest(c, base, b) {
  for (let i = 0; i < 26; i++) {
    const x = -20 + i * 21 + hash(i + 3) * 10, h = 30 + hash(i * 2 + 3) * 22, w = 11 + hash(i * 3 + 3) * 4;
    const lean = b * h * 0.95 * (0.8 + hash(i * 5 + 3) * 0.4), topY = base - h * (1 - b * 0.55);
    poly(c, [[x + lean, topY], [x + w, base], [x - w, base]], "#223a30");
    poly(c, [[x + lean, topY], [x + lean * 0.8 + w * 0.5, base - h * 0.6 * (1 - b * 0.4)], [x + lean * 0.7, base - h * 0.5 * (1 - b * 0.4)]], "#2e4e3c");
  }
}
