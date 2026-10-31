// Сцены 1: от Мурома до поимки Соловья. a(n) — секунд от начала строки n.
const PAL = {
  dawn: { sky: ["#2a2a6a", "#4a3c8a", "#8a4c94", "#d0607c", "#f08c64", "#f8bc68"], far: "#6a4a84", mid: "#3a4a6c", near: "#28483c", ground: ["#4a7a34", "#6a9a44", "#3a6228"], tuft: "#2e5220", cloud: "#f8c8a8", cloudD: "#d88c88" },
  day: { sky: ["#2c6cc8", "#3c84d8", "#5c9ce4", "#84b8ec", "#b0d4f0", "#d8ecf4"], far: "#7ca0c4", mid: "#4a7a84", near: "#2e5c44", ground: ["#5a9238", "#78ae48", "#477a2c"], tuft: "#366422", cloud: "#ffffff", cloudD: "#c8dcec" },
  grim: { sky: ["#1a1428", "#241c34", "#322438", "#44303c", "#5a3c40", "#6e4a44"], far: "#2a2230", mid: "#201a28", near: "#181420", ground: ["#2e2a24", "#3e3a2c", "#24201c"], tuft: "#1c1a14", cloud: "#3a3040", cloudD: "#2a2230" },
  dusk: { sky: ["#1c1a4a", "#3c2a68", "#6a3480", "#b04878", "#e8705c", "#f8a858"], far: "#4a3468", mid: "#2c2c50", near: "#1c2438", ground: ["#2c4a34", "#3e6040", "#203a2a"], tuft: "#1a3020", cloud: "#e88878", cloudD: "#a85070" },
  gold: { sky: ["#3060b8", "#5088d0", "#88b0d8", "#c8c8b0", "#f0d890", "#f8e8a8"], far: "#b89c78", mid: "#6a8a54", near: "#3e7040", ground: ["#6aa23e", "#8ec04e", "#528830"], tuft: "#3e7428", cloud: "#fff4d8", cloudD: "#f0c898" },
};

function landscape(c, t, pal, scroll, o = {}) {
  skyBands(c, pal.sky, o.skyH || 150);
  rect(c, 0, o.skyH || 150, LW, LH, pal.sky[pal.sky.length - 1]);
  if (o.sun) { disc(c, o.sun[0], o.sun[1], o.sun[2] + 3, o.sunGlow || "#ffe0a0"); disc(c, o.sun[0], o.sun[1], o.sun[2], o.sunCol || "#fff4c8"); }
  cloudsLayer(c, 16, scroll * 0.06 + t * 2, 3, pal.cloud, pal.cloudD);
  hillsLayer(c, 128, 18, 180, 2.1, pal.far, scroll * 0.14);
  forestLayer(c, 146, 22, 15, 5, pal.mid, scroll * 0.3);
  if (o.bend) return;
  forestLayer(c, 160, 22, 19, 9, pal.near, scroll * 0.55);
  groundLayer(c, 160, scroll, pal.ground, pal.tuft);
}

function gallop(t, sp = 13) { return Math.floor(t * sp) % 8; }

function churchSprite() {
  return sprite("church", 70, 74, (c) => {
    rect(c, 12, 32, 46, 42, "#8a6a44"); rect(c, 14, 34, 42, 40, "#a0805a");
    c.fillStyle = "#6a4e30"; for (let y = 36; y < 74; y += 4) c.fillRect(14, y, 42, 1);
    poly(c, [[8, 34], [62, 34], [35, 16]], "#5a3e2a");
    rect(c, 31, 6, 8, 12, "#a0805a");
    ell(c, 35, 6, 7, 6, "#3e6aa8"); ell(c, 34, 4, 3, 2, "#6a94d0");
    rect(c, 34, -2, 2, 6, COL.gold); rect(c, 32, 0, 6, 1, COL.gold);
    rect(c, 29, 52, 12, 22, "#3a2a1c"); rect(c, 34, 52, 2, 22, "#5a4028");
    rect(c, 18, 44, 6, 8, "#f8d060"); rect(c, 46, 44, 6, 8, "#f8d060");
  });
}

function fortSprite(open = 0) {
  return sprite("fort" + R(open * 4), 200, 96, (c) => {
    const log = (x, w, top) => {
      rect(c, x, top, w, 96 - top, "#6a4a2c");
      c.fillStyle = "#4a3220"; for (let i = x; i < x + w; i += 4) c.fillRect(i, top, 1, 96 - top);
      c.fillStyle = "#8a6a40"; for (let i = x + 1; i < x + w; i += 4) c.fillRect(i, top, 1, 96 - top);
      for (let i = x; i < x + w; i += 4) poly(c, [[i, top], [i + 4, top], [i + 2, top - 4]], "#6a4a2c");
    };
    log(0, 200, 36);
    for (const x of [16, 160]) { log(x, 26, 14); poly(c, [[x - 4, 14], [x + 30, 14], [x + 13, -2]], "#3e6aa8"); rect(c, x + 8, 22, 8, 10, "#1c1410"); }
    log(78, 44, 24);
    poly(c, [[74, 24], [126, 24], [100, 6]], "#3e6aa8");
    ell(c, 100, 4, 6, 5, COL.gold); rect(c, 99, -2, 2, 4, COL.goldL);
    rect(c, 84, 54, 32, 42, "#120c0c");
    const w = R(16 * (1 - open));
    rect(c, 84, 54, w, 42, "#5a3e24"); rect(c, 116 - w, 54, w, 42, "#5a3e24");
    if (w > 2) { c.fillStyle = "#3a2818"; c.fillRect(84, 66, w, 2); c.fillRect(116 - w, 66, w, 2); c.fillRect(84, 84, w, 2); c.fillRect(116 - w, 84, w, 2); }
  });
}

// Волна свиста: дуги, расходящиеся от рта
function whistleWaves(c, x, y, t, power = 1, col = "#f0f4ff") {
  for (let i = 0; i < 6; i++) {
    const ph = (t * 1.6 + i / 6) % 1;
    const r = 8 + ph * 240 * power;
    const pts = 40;
    c.fillStyle = i % 2 ? col : "#a8c8ff";
    if (ph > 0.9) continue;
    for (let k = 0; k < pts; k++) {
      const a = -1.3 + (k / pts) * 2.6;
      const px = x + Math.cos(a + Math.PI) * r, py = y + Math.sin(a + Math.PI) * r * 0.75;
      if ((k + i) % 3) c.fillRect(R(px), R(py), 2, 2);
    }
    for (let k = 0; k < pts; k++) {
      const a = -1.3 + (k / pts) * 2.6;
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r * 0.75;
      if ((k + i) % 3) c.fillRect(R(px), R(py), 2, 2);
    }
  }
}

// Луг, который сминается свистом: b 0..1 — насколько пригнуло
function bentMeadow(c, y, b, seed, t, cols) {
  for (let i = 0; i < 150; i++) {
    const x = hash(i * 3.1 + seed) * LW, yy = y + hash(i * 1.7 + seed) * (LH - y - 4);
    const h = 3 + hash(i) * 4;
    const dx = b * h * (1 + hash(i * 9)) + Math.sin(t * 8 + i) * b * 1.2;
    line(c, x, yy, x + dx, yy - h * (1 - b * 0.75), i % 3 ? cols[0] : cols[1]);
    if (i % 7 === 0) {
      const fall = b * (10 + hash(i * 5) * 40);
      const fx = x + dx + fall * 1.4, fy = yy - h + b * hash(i) * 4;
      if (fall < 40) { rect(c, fx - 1, fy, 3, 1, "#6ab0f0"); rect(c, fx, fy - 1, 1, 3, "#6ab0f0"); rect(c, fx, fy, 1, 1, "#f8e870"); }
    }
  }
}

// Лес, кланяющийся земле: b 0..1 (деревья наклоняются вправо)
function bowingForest(c, base, b, seed, col, tip) {
  for (let i = 0; i < 26; i++) {
    const x = -20 + i * 21 + hash(i + seed) * 10, h = 30 + hash(i * 2 + seed) * 22;
    const w = 11 + hash(i * 3 + seed) * 4;
    const lean = b * h * 0.95 * (0.8 + hash(i * 5 + seed) * 0.4);
    const topY = base - h * (1 - b * 0.55);
    poly(c, [[x + lean, topY], [x + w, base], [x - w, base]], col);
    poly(c, [[x + lean, topY], [x + lean * 0.8 + w * 0.5, base - h * 0.6 * (1 - b * 0.4)], [x + lean * 0.7, base - h * 0.5 * (1 - b * 0.4)]], tip);
  }
}

function fallenPerson(c, x, y, fall, col, seed) {
  const s = muzhikSprite(col, 0, { down: true });
  blitRot(c, s, x, y - 12 + fall * 9, fall * 1.5, 1);
}

// Шкала силы с подписью, как у босса в игре
function hpBar(c, label, x, y, w, frac, col = "#e8302c") {
  drawText(c, label, x, y - 10, "#fff3c0", { shadow: "#120c14" });
  rect(c, x - 2, y - 1, w + 4, 9, "#120c14"); rect(c, x - 1, y, w + 2, 7, "#e8e0c0"); rect(c, x, y + 1, w, 5, "#3a1418");
  rect(c, x, y + 1, w * clamp(frac), 5, col); rect(c, x, y + 1, w * clamp(frac), 1, "#ff9a7a");
}

function drawRiderAt(c, t, x, y, opt = {}, flip) {
  const sp = opt.walk ? 7 : 13;
  blit(c, riderSprite(gallop(t, sp), opt), x, y, flip);
}

// Привязанный Соловей у стремени
function boundSolovey(c, x, y, t) {
  // x — как у коня + 50: Соловей волочится позади, верёвка идёт к стремени
  const sx = x - 62, sy = y - 4 + Math.sin(t * 7) * 1.2;
  blitRot(c, soloveySprite("sit", true), sx, sy, 1.25, 0.72);
  line(c, sx + 12, sy - 6, x - 12, y - 28, COL.leather);
}

const SCENES1 = {
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
    const d = springPop(t - 0.5);
    const y1 = lerp(-70, 22, d);
    const a = "ИЛЬЯ МУРОМЕЦ", b = "И СОЛОВЕЙ-РАЗБОЙНИК";
    const wa = textWidth(a, true) * 3, wb = textWidth(b, true) * 2;
    drawText(c, a, R((LW - wa) / 2) + 2, R(y1) + 2, "#2a0e0e", { scale: 3, bold: true });
    drawText(c, a, R((LW - wa) / 2), R(y1), "#ffd860", { scale: 3, bold: true, shadow: "#a84a14" });
    const d2 = springPop(t - 1.1);
    drawText(c, b, R((LW - wb) / 2), R(lerp(290, 54, d2)), "#fff6d8", { scale: 2, bold: true, shadow: "#3a1450" });
    if (t > 1.9) {
      const s1 = "Русская былина. Сказитель Т. Г. Рябинин";
      const s2 = "Записал А. Ф. Гильфердинг, Кижи, 1871";
      drawText(c, s1, R((LW - textWidth(s1)) / 2), 80, "#fff0c8", { shadow: "#2a1040" });
      drawText(c, s2, R((LW - textWidth(s2)) / 2), 92, "#ffe0b0", { shadow: "#2a1040" });
    }
    if (t > 3.2 && Math.floor(t * 2.5) % 2 === 0) {
      const s = "▶ В ПУТЬ";
      drawText(c, s, R((LW - textWidth(s, true)) / 2), 246, "#fff6d8", { bold: true, shadow: "#120c14" });
    }
  },

  // ---------- 1–6: выезд из Мурома ----------
  murom(c, t, a) {
    const v = a(1), scroll = v * 90;
    const sun = [360, 60 - clamp(v / 22) * 22, 15];
    landscape(c, t, PAL.dawn, scroll, { sun });
    blit(c, churchSprite(), 340 - scroll * 0.8, 88);
    blit(c, churchSprite(), 90 - scroll * 0.8, 92);
    drawRiderAt(c, t, 140 + Math.sin(v * 0.4) * 10, 112, {});
    rect(c, 0, 186, LW, 6, "#3a6228");
    if (a(5) > 0) { // Киев впереди: стрелка-указатель
      const k = springPop(a(5));
      const px = 370 + (1 - k) * 80;
      rect(c, px + 18, 110, 3, 50, COL.bay); rect(c, px, 112, 40, 12, "#e8d8a8"); rect(c, px, 112, 40, 1, "#fff");
      drawText(c, "КИЕВ", px + 8, 115, "#6a1c14");
    }
    label(c, "МУРОМ, СЕЛО КАРАЧАРОВО");
  },

  // ---------- 7–13: Чернигов в осаде ----------
  siege(c, t, a) {
    const v = a(7), scroll = 40 + v * 3;
    skyBands(c, PAL.grim.sky, 150);
    rect(c, 0, 150, LW, LH, "#6e4a44");
    cloudsLayer(c, 10, t * 7, 11, "#2a2230", "#1a1420");
    hillsLayer(c, 120, 12, 200, 3.5, "#231c2e", scroll * 0.3);
    blit(c, fortSprite(0), 140, 68);
    groundLayer(c, 160, scroll, PAL.grim.ground, PAL.grim.tuft);
    // Нагнано силушки: ряды подходят по мере чтения
    const n = clamp(a(8) / 3.5);
    for (let row = 0; row < 5; row++) {
      const y = 136 + row * 11;
      for (let i = 0; i < 26; i++) {
        const dist = Math.abs(i - 13) / 13;
        if (hash(i * 3 + row * 11) > n * 1.2 - dist * 0.35) continue;
        const x = i * 19 - 16 + (row % 2) * 9 + (hash(i + row) - 0.5) * 8;
        const by = Math.sin(t * 3.4 + i * 0.7 + row) > 0.6 ? 1 : 0;
        blit(c, soldierSprite(Math.floor(t * 3 + i) % 2), x, y - by);
      }
    }
    // Ворон разворачивается, не долетая
    const av = a(12);
    for (let i = 0; i < 8; i++) {
      const base = 15 + i * 36;
      const fwd = t * 26 + i * 40;
      const x = av > 0 ? clamp(av / 3) * 0 + (base + 60 - av * 34 * (1 + i * 0.1)) : ((fwd % 560) - 60);
      const y = 24 + hash(i * 3) * 44 + Math.sin(t * 2 + i) * 4;
      blit(c, crowSprite(Math.floor(t * 8 + i)), x, y, av > 0);
    }
    if (a(13) > 0) { // Серый волк бежит и останавливается
      const w = clamp(a(13) / 2.4);
      const x = lerp(-40, 54, smooth(w));
      ell(c, x + 12, 172, 12, 5, "#7c7c88"); disc(c, x + 25, 168, 4, "#8e8e98"); rect(c, x + 27, 170, 5, 2, "#8e8e98");
      poly(c, [[x + 22, 164], [x + 24, 160], [x + 26, 164]], "#7c7c88");
      rect(c, x + 2, 177, 2, 5, "#5c5c68"); rect(c, x + 8, 177, 2, 5, "#5c5c68"); rect(c, x + 16, 177, 2, 5, "#5c5c68"); rect(c, x + 22, 177, 2, 5, "#5c5c68");
      line(c, x, 170, x - 8, 166, "#7c7c88", 2);
    }
    label(c, "ЧЕРНИГОВ-ГРАД");
  },

  // ---------- 14–21: Илья против силы ----------
  battle(c, t, a) {
    const v = a(14), end = S(19) - S(14), p = clamp(v / end);
    const scroll = 40 + v * 70;
    skyBands(c, PAL.grim.sky, 150);
    rect(c, 0, 150, LW, LH, "#6e4a44");
    cloudsLayer(c, 10, t * 7, 11, "#2a2230", "#1a1420");
    hillsLayer(c, 120, 12, 200, 3.5, "#231c2e", scroll * 0.15);
    const fx = 300 - p * 230;
    blit(c, fortSprite(a(20) > 0 ? clamp(a(20) / 1.2) : 0), fx, 68);
    groundLayer(c, 160, scroll * 0.9, PAL.grim.ground, PAL.grim.tuft);
    const heroX = 130 + Math.sin(v * 1.3) * 26;
    const heroY = 112 + Math.sin(v * 2.6) * 2;
    // «побил он эту силу всю»: к строке 17 разлетаются и все остальные, дальше поле пусто
    const wipe = clamp((t - S(17)) / (S(18) - S(17)));
    for (let row = 0; row < 4 && wipe < 1; row++) {
      for (let i = 0; i < 90; i++) {
        const wx = i * 15 + (row % 2) * 7 - scroll * 0.9 + 380;
        const y = 138 + row * 12;
        const hitAt = S(15) + i * 0.36 + row * 0.2;
        const k = t - hitAt;
        if (wipe > 0) {
          if (wx < -30 || wx > LW + 20) continue;
          const f = clamp(wipe * 2.2 - hash(i * 7.3 + row * 3.1));
          if (f >= 1) continue;
          blitRot(c, soldierSprite(0), wx + f * 130, y + 8 - sinPi(f) * 60, f * 9, 1 - f * 0.3);
          continue;
        }
        if (wx < -30 || wx > LW + 20) continue;
        if (wx < heroX + 62 && k > 0) {
          const f = clamp((heroX + 62 - wx) / 42);
          const fy = -sinPi(f) * 46;
          blitRot(c, soldierSprite(0), wx + f * 80, y + fy + 8, f * 7, 1 - f * 0.25);
        } else {
          blit(c, soldierSprite(Math.floor(t * 3 + i) % 2), wx, y);
        }
      }
    }
    if (a(14) > 0 && p < 1) {
      blit(c, riderSprite(gallop(t, 15), { spear: true }), heroX, heroY);
      if (Math.floor(t * 8) % 2) {
        const sx = heroX + 76, sy = heroY + 24;
        line(c, sx, sy - 6, sx, sy + 6, "#fff4a0"); line(c, sx - 6, sy, sx + 6, sy, "#fff4a0");
      }
    } else {
      blit(c, riderSprite(gallop(t, 7), { walk: true, spear: true }), lerp(heroX, 40, smooth((t - S(19)) / 3)), 112);
    }
    if (t < S(19)) hpBar(c, "ЧЁРНАЯ СИЛА", 266, 22, 190, 1 - clamp((t - S(15)) / (S(18) - S(15))));
    // Мужички выходят и зовут
    if (a(20) > 0) {
      for (let i = 0; i < 5; i++) {
        const k = springSoft(a(20) - 0.2 - i * 0.2);
        const mx = fx + 98 + i * 12 - k * (14 + i * 2);
        blit(c, muzhikSprite(i % 2 ? COL.white : "#c8d0b0", Math.floor(t * 4 + i) % 2), mx, 136 + i % 2 * 6, true);
      }
    }
    label(c, "ЧЕРНИГОВ-ГРАД");
  },

  // ---------- 22–27: ответ у ворот ----------
  gate(c, t, a) {
    const v = a(22);
    const p = clamp(v / 8);
    skyBands(c, PAL.day.sky, 150);
    rect(c, 0, 150, LW, LH, PAL.day.sky[5]);
    cloudsLayer(c, 16, t * 3, 2, PAL.day.cloud, PAL.day.cloudD);
    hillsLayer(c, 120, 12, 200, 3.5, PAL.day.far, 20);
    blit(c, fortSprite(1), 200, 68);
    groundLayer(c, 160, 50, PAL.day.ground, PAL.day.tuft);
    blit(c, riderSprite(0, { walk: true, spear: true }), 82, 110);
    for (let i = 0; i < 6; i++) {
      const by = Math.sin(t * 3 + i) > 0.6 ? 1 : 0;
      blit(c, muzhikSprite(i % 2 ? COL.white : "#c8d0b0", 0, { hat: i % 3 ? "#6a4a2a" : "#3a4a6a" }), 210 + i * 18, 138 + (i % 2) * 7 - by, true);
    }
    label(c, "ЧЕРНИГОВ-ГРАД");
  },

  // ---------- 28–40: карта и рассказ мужичков ----------
  map(c, t, a) {
    drawMap(c, t, a, { moss: clamp(a(30) / 2.5), pins: true });
    label(c, "КАРТА: ДОРОГА НА КИЕВ");
  },

  // ---------- 41–48: как свищет Соловей (рассказ) ----------
  tale(c, t, a) {
    const v = a(41);
    meadowScene(c, t, v, {
      bend: clamp((t - S(45)) / 1.2) * 0.7 + clamp((t - S(47)) / 1.2) * 0.3,
      flower: clamp((t - S(46)) / 1.4),
      forest: clamp((t - S(47)) / 1.3),
      people: clamp((t - S(48)) / 1),
      whistle: v > 0 && (t < S(43) || t > S(43) + 0.6),
    });
    label(c, "РЕЧКА СМОРОДИНА");
  },

  // ---------- 49–50: два пути ----------
  routes(c, t, a) {
    drawMap(c, t, a, { moss: 1, pins: true, routes: true });
    const k1 = springPop(a(49)), k2 = springPop(a(50));
    if (a(49) > 0) { const s = "ПРЯМО: 500 ВЁРСТ"; panel(c, 118, R(lerp(-30, 12, k1)), textWidth(s, true) + 16, 22); drawText(c, s, 126, R(lerp(-30, 12, k1)) + 7, "#ffd860", { bold: true }); }
    if (a(50) > 0) { const s = "В ОБЪЕЗД: ЦЕЛА ТЫСЯЧА"; panel(c, 108, R(lerp(-30, 38, k2)), textWidth(s, true) + 16, 22); drawText(c, s, 116, R(lerp(-30, 38, k2)) + 7, "#f8f4e0", { bold: true }); }
    label(c, "КАРТА: ДОРОГА НА КИЕВ");
  },

  // ---------- 51–56: скачка с холма на холм ----------
  ride(c, t, a) {
    const v = a(51), scroll = 200 + v * 230;
    const hop = clamp(a(54) / 0.6);
    landscape(c, t, PAL.day, scroll * 0.6, { bend: true, sun: [420, 40, 14] });
    // бегущие холмы
    const gy = (x) => 168 - hop * (Math.sin((x + scroll) / 74) * 16 + Math.sin((x + scroll) / 31) * 4);
    for (let x = 0; x < LW; x++) {
      const y = R(gy(x));
      rect(c, x, y, 1, 2, "#8ec04e"); rect(c, x, y + 2, 1, LH - y, "#5a9238");
    }
    // мелкие речки промеж ног
    const riv = clamp(a(56) / 0.5);
    if (riv > 0) {
      for (let i = 0; i < 5; i++) {
        const x = ((i * 240 - scroll) % (LW + 160) + LW + 160) % (LW + 160) - 80;
        for (let k = 0; k < 40; k++) rect(c, x + k, gy(x + k) - 1, 1, 4 + (k % 11 ? 0 : 1), k % 6 ? "#3c84d8" : "#b0d4f0");
      }
    }
    const hx = 160;
    const jump = hop * Math.abs(Math.sin(v * 3.1)) * 40 + riv * 4;
    blit(c, riderSprite(gallop(t, 17)), hx, gy(hx + 40) - 66 - jump);
    if (hop) for (let i = 0; i < 6; i++) rect(c, hx + 10 - ((t * 200 + i * 40) % 120), gy(hx) - 2 - hash(i) * 10 - jump * 0.2, 4, 2, "#d8ecb0");
    const left = R(Math.max(40, 500 - v * 16));
    hudCounter(c, left + " вёрст", 14);
    label(c, "ДОРОГА ПРЯМОЕЗЖАЯ");
  },

  // ---------- 57–60: приметы дороги ----------
  approach(c, t, a) {
    const v = a(57), scroll = v * 62;
    landscape(c, t, PAL.grim, scroll * 0.4, { sun: [420, 40, 12], sunCol: "#8c6858", sunGlow: "#5a4040" });
    // речка Смородинка
    const wx = (n, off) => 500 + (S(n) - S(57)) * 62 + off - scroll;
    const rx = wx(57, -120);
    rect(c, rx, 170, 90, 100, "#c04820");
    for (let i = 0; i < 26; i++) { const yy = 170 + hash(i) * 90; rect(c, rx + hash(i * 3) * 80, yy, 8, 1, "#f09040"); }
    // грязь чёрная
    const mx = wx(58, -20);
    ell(c, mx, 184, 55, 12, "#141014"); ell(c, mx - 8, 183, 34, 6, "#2a2228");
    // берёза покляпая
    blit(c, birchSprite(), wx(59, 0), 90);
    // крест Леванидов
    blit(c, crossSprite(), wx(60, 40), 138);
    blit(c, riderSprite(gallop(t, 8), { walk: true }), 110, 112);
    label(c, "У РЕЧКИ СМОРОДИНЫ");
  },

  // ---------- 61–65: Соловей свищет ----------
  bossWhistle(c, t, a) {
    const v = a(61);
    const shake = v > 0 ? 1 : 0;
    c.save();
    if (shake) c.translate(R(Math.sin(t * 40) * 1.4), R(Math.cos(t * 31) * 1));
    meadowScene(c, t, v, {
      bend: clamp(a(63) / 1.2), flower: clamp(a(64) / 1.4), forest: clamp(a(65) / 1.2), people: 0,
      whistle: true, rider: true, hpShow: v < 3,
    });
    c.restore();
    if (v > 0 && v < 3.4) {
      const k = springPop(v);
      const s = "СОЛОВЕЙ-РАЗБОЙНИК";
      const w = textWidth(s, true) * 2 + 20;
      panel(c, R((LW - w) / 2), R(lerp(-30, 8, k)), w, 28, "#3c1420");
      drawText(c, s, R((LW - w) / 2) + 10, R(lerp(-30, 8, k)) + 7, "#ffd860", { scale: 2, bold: true });
    }
    label(c, "У РЕЧКИ СМОРОДИНЫ");
  },

  // ---------- 66–77: конь спотыкается ----------
  stumble(c, t, a) {
    const v = a(66);
    meadowScene(c, t, v, { bend: 1, flower: 1, forest: 1, people: 0, whistle: t < S(71), noHero: true });
    const s = riderSprite(0, { walk: true });
    const dip = a(67) > 0 && a(70) < 0 ? 0.26 + Math.sin(t * 16) * 0.03 : (a(70) > 0 ? 0.04 + Math.sin(t * 2) * 0.02 : 0.08);
    const x = 138 + (a(67) > 0 && a(70) < 0 ? Math.sin(t * 22) * 1.6 : 0);
    blitRot(c, s, x, 148, dip);
    // плётка
    if (a(69) > 0 && a(71) < 0) {
      const sw = (t * 3) % 1;
      const hx = x - 10, hy = 118;
      const tipx = hx - 26 + sw * 18, tipy = hy - 18 + sw * 32;
      line(c, hx, hy, tipx, tipy, "#3a2010");
      if (sw > 0.85) { for (let i = 0; i < 6; i++) rect(c, tipx + Math.cos(i) * 7, tipy + Math.sin(i) * 7, 2, 2, "#fff4a0"); }
    }
    label(c, "У РЕЧКИ СМОРОДИНЫ");
  },

  // ---------- 78–84: выстрел ----------
  bow(c, t, a) {
    const v = a(78);
    const zoomed = a(83) > 0.75;
    if (!zoomed) {
      meadowScene(c, t, v, { bend: 1, flower: 1, forest: 1, people: 0, whistle: a(83) < 0, noHero: true });
      blit(c, riderSprite(0, { walk: true, bow: true }), 100, 112);
      const hx = 164, hy = 118;
      const draw = clamp(a(81) / 1.8);
      // лук
      line(c, hx + 4, hy - 22, hx + 12, hy, "#a0522c", 2); line(c, hx + 12, hy, hx + 4, hy + 22, "#a0522c", 2);
      line(c, hx + 4, hy - 22, hx + 4 - draw * 12, hy, "#f8f0d8"); line(c, hx + 4 - draw * 12, hy, hx + 4, hy + 22, "#f8f0d8");
      if (a(82) > 0 && a(83) < 0) { line(c, hx + 4 - draw * 12, hy, hx + 28, hy, "#e8e0c8"); rect(c, hx + 26, hy - 1, 4, 3, COL.steelL); }
      if (a(83) > 0) {
        const f = clamp(a(83) / 0.75);
        const ax = lerp(hx + 28, 340, f), ay = lerp(hy, 92, f);
        line(c, ax - 12, ay + 3, ax, ay, "#e8e0c8");
        for (let i = 1; i < 4; i++) rect(c, ax - 12 - i * 8, ay + 3 + i * 2, 4, 1, "#fff4a0");
      }
    } else {
      // крупно: стрела попадает
      skyBands(c, PAL.grim.sky, 200);
      const k = springPop(a(83) - 0.75);
      const f = a(84) - 0;
      const s = soloveySprite(a(84) > 0 ? "sit" : "whistle", a(84) > 0.2);
      blitRot(c, s, 240 + (a(84) > 0 ? Math.sin(t * 30) * 3 * Math.max(0, 1 - f) : 0), 110, 0, 2.8 * k);
      if (a(84) < 0.4 && a(84) > -0.05) {
        for (let i = 0; i < 12; i++) { const r = (a(84) + 0.1) * 300; rect(c, 240 + Math.cos(i * 0.52) * r - 2, 88 + Math.sin(i * 0.52) * r * 0.8, 4, 4, i % 2 ? "#fff4a0" : "#ff7a4a"); }
        wash(c, "#fff8d0", clamp(0.7 - (a(84) + 0.05) * 2));
      }
    }
    hpBar(c, "СОЛОВЕЙ", 300, 22, 160, a(84) > 0 ? Math.max(0, 1 - a(84) * 1.4) : 1);
    label(c, "У РЕЧКИ СМОРОДИНЫ");
  },

  // ---------- 85–88: поимка ----------
  capture(c, t, a) {
    const v = a(85);
    if (a(87) < 0) {
      meadowScene(c, t, v, { bend: 1 - clamp(v / 4), flower: 1, forest: 1 - clamp(v / 4), people: 0, whistle: false, noHero: true, noSolovey: true });
      const k = clamp(v / 1.1);
      const x = 318 - k * 120, y = lerp(70, 164, k * k);
      blitRot(c, soloveySprite("sit", true), x, y, k * 1.57 * 1.0, 1);
      blit(c, riderSprite(0, { walk: true }), 100, 112);
      if (a(86) > 0) { const ff = clamp(a(86) / 1); line(c, 150, 150, lerp(150, x, ff), lerp(150, y, ff), COL.leather, 2); }
    } else {
      const u = a(87), scroll = u * 80;
      landscape(c, t, PAL.day, scroll, { sun: [420, 40, 14] });
      blit(c, riderSprite(gallop(t, 9), { walk: true }), 150, 112);
      boundSolovey(c, 200, 168, t);
    }
    label(c, "ЧИСТО ПОЛЕ");
  },
};

function sinPi(f) { return Math.sin(f * Math.PI); }

function label(c, s) {
  const w = textWidth(s);
  rect(c, 6, 6, w + 10, 13, "#120c14"); rect(c, 7, 7, w + 8, 11, "#2c2460");
  drawText(c, s, 11, 9, "#f8e8b0");
}
function hudCounter(c, s, y) {
  const w = textWidth(s, true);
  rect(c, LW - w - 18, y - 3, w + 12, 14, "#120c14"); rect(c, LW - w - 17, y - 2, w + 10, 12, "#2c5a40");
  drawText(c, s, LW - w - 12, y, "#fff3c0", { bold: true });
}

// Луг у дуба. bend/flower/forest/people 0..1, whistle — свист, rider — Илья вдали
function meadowScene(c, t, v, o) {
  const pal = PAL.grim;
  skyBands(c, pal.sky, 150);
  rect(c, 0, 150, LW, LH, pal.sky[5]);
  cloudsLayer(c, 10, t * 12, 7, pal.cloud, pal.cloudD);
  hillsLayer(c, 124, 12, 180, 3.2, pal.far, 20);
  bowingForest(c, 158, o.forest || 0, 3, "#223a30", "#2e4e3c");
  groundLayer(c, 160, 30, ["#3a5a2c", "#4e7238", "#2e4a24"], null);
  bentMeadow(c, 160, o.bend || 0, 1, t, ["#2a4a1e", "#6a8a3a"]);
  const oak = oakSprite();
  blit(c, oak, 240, 26);
  const sx = 296, sy = 54;
  if (!o.noSolovey) {
    const whistling = o.whistle && Math.floor(t * 8) % 8 !== 0;
    blit(c, soloveySprite(o.whistle ? "whistle" : "sit", false, Math.floor(t * 6) % 2), sx, sy);
    if (whistling) whistleWaves(c, sx + 23, sy + 20, t, 1);
  }
  if (o.people) {
    const cols = [COL.white, "#c8d0b0", "#d8c8a8", "#a8c0d0", COL.white];
    for (let i = 0; i < 5; i++) fallenPerson(c, 60 + i * 42, 182 + (i % 2) * 6, clamp(o.people * 1.4 - i * 0.08), cols[i], i);
  }
  if (o.rider) {
    const k = clamp(v / 4);
    blit(c, riderSprite(gallop(t, 9 - k * 6), { walk: true }), 40 + k * 60, 112);
  }
}

function drawMap(c, t, a, o) {
  // Карта сверху: Чернигов внизу слева, Киев вверху справа
  rect(c, 0, 0, LW, LH, "#5c8e3c");
  c.fillStyle = "#4a7a32";
  for (let i = 0; i < 300; i++) c.fillRect(R(hash(i * 1.3) * LW), R(hash(i * 2.7) * LH), 3, 1);
  for (let i = 0; i < 70; i++) {
    const x = hash(i * 5.1) * LW, y = hash(i * 4.3) * 200;
    if (Math.abs((y - 180) + (x - 80) * 0.5) < 34) continue;
    poly(c, [[x, y - 8], [x + 6, y + 4], [x - 6, y + 4]], "#23502c");
    poly(c, [[x, y - 8], [x + 2, y - 2], [x - 2, y - 2]], "#3a7a40");
  }
  const P = [[58, 150], [428, 34]];
  const pt = (u) => [lerp(P[0][0], P[1][0], u), lerp(P[0][1], P[1][1], u)];
  // объезд
  const det = (u) => { const q = pt(u); return [q[0] - Math.sin(u * Math.PI) * 58, q[1] - Math.sin(u * Math.PI) * 88]; };
  if (o.routes) {
    const shown = clamp(a(50) / 2.5);
    for (let i = 0; i < 90 * shown; i++) { const q = det(i / 90); rect(c, q[0], q[1], 3, 3, i % 4 < 2 ? "#e8d8a8" : "#c0a870"); }
  }
  // прямая дорога зарастает
  for (let i = 0; i <= 120; i++) {
    const q = pt(i / 120);
    const m = o.moss * (0.2 + 0.9 * sinPi(i / 120));
    const col = hash(i * 7.7) < m ? "#2e6a30" : "#e8d8a8";
    rect(c, q[0] - 2, q[1] - 2, 5, 5, col);
  }
  if (o.routes) {
    const shown = clamp(a(49) / 1.5);
    for (let i = 0; i < 120 * shown; i += 4) { const q = pt(i / 120); rect(c, q[0], q[1], 2, 2, "#ffd860"); }
  }
  // города
  const town = (x, y, s, col) => { rect(c, x - 13, y - 8, 26, 16, "#6a4a2c"); poly(c, [[x - 14, y - 8], [x + 14, y - 8], [x, y - 20]], col); disc(c, x, y - 21, 3, COL.gold); drawText(c, s, x - textWidth(s) / 2, y + 11, "#fff6d8", { shadow: "#120c14" }); };
  town(P[0][0], P[0][1], "ЧЕРНИГОВ", "#3e6aa8");
  town(P[1][0], P[1][1], "КИЕВ", "#c89a2c");
  // приметы на дороге
  if (o.pins) {
    const pin = (n, u, draw, s) => {
      const k = springPop(a(n));
      if (a(n) < 0) return;
      const q = pt(u);
      draw(q[0], q[1] - 6 - (1 - k) * 30);
      if (s) { const below = n % 2 === 1; drawText(c, s, below ? q[0] - 8 : q[0] + 12, below ? q[1] + 16 : q[1] - 34, "#fff6d8", { shadow: "#120c14" }); }
    };
    pin(35, 0.22, (x, y) => ell(c, x, y + 4, 14, 6, "#141014"), "грязь чёрная");
    pin(36, 0.36, (x, y) => blitRot(c, birchSprite(), x, y - 10, 0, 0.42), "берёза покляпая");
    pin(37, 0.5, (x, y) => { line(c, x - 44, y + 26, x + 44, y - 20, "#c04820", 4); line(c, x - 44, y + 24, x + 44, y - 22, "#f09040"); }, "речка Смородина");
    pin(38, 0.64, (x, y) => blit(c, crossSprite(), x - 11, y - 28), "крест Леванидов");
    pin(39, 0.8, (x, y) => blitRot(c, oakSprite(), x, y - 20, 0, 0.3), null);
    if (a(39) > 0) {
      const k = springPop(a(39) - 0.1);
      const q = pt(0.8);
      blitRot(c, soloveySprite("sit", false), q[0] + 2, q[1] - 34, 0, 0.6 * k);
      if (a(40) < 0.8 && Math.floor(t * 6) % 2) drawText(c, "!", q[0] + 20, q[1] - 56, "#ff5040", { scale: 2, bold: true, shadow: "#120c14" });
    }
  }
}
