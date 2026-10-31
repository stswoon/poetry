// Сцены 2: от гнезда Соловья до финала.

function ilyaFoot(frame = 0, sword = false) {
  return sprite("ilf" + frame + sword, 34, 44, (c) => {
    const k = frame % 2 ? 1 : 0;
    poly(c, [[10, 14], [4, 18], [2, 34], [10, 36], [14, 24]], COL.red);
    rect(c, 11, 30, 5, 9 - k, COL.mailD); rect(c, 18, 30, 5, 9 - (1 - k), COL.mailD);
    rect(c, 10, 38 - k, 7, 3, COL.leather); rect(c, 18, 38 - (1 - k), 7, 3, COL.leather);
    poly(c, [[10, 12], [24, 12], [25, 32], [9, 32]], COL.mail);
    c.fillStyle = COL.mailD; for (let y = 13; y < 31; y += 2) for (let x = 11 + (y % 4 ? 1 : 0); x < 24; x += 2) c.fillRect(x, y, 1, 1);
    rect(c, 9, 25, 16, 2, COL.leather); rect(c, 15, 25, 3, 2, COL.gold);
    disc(c, 17, 7, 5, COL.skin);
    rect(c, 19, 6, 2, 1, COL.hoof);
    poly(c, [[13, 9], [22, 7], [22, 13], [18, 16], [14, 13]], "#b0a088");
    poly(c, [[11, 6], [23, 6], [21, 1], [17, -5], [13, 1]], COL.steel);
    poly(c, [[13, 5], [16, 5], [16, -2], [14, 1]], COL.steelL);
    rect(c, 11, 6, 12, 1, COL.gold);
    if (sword) {
      line(c, 24, 15, 29, 9, COL.mailD, 3); rect(c, 28, 8, 3, 3, COL.skin);
      line(c, 30, 8, 30, -3, COL.goldD, 2);
    } else {
      line(c, 24, 15, 26, 25, COL.mailD, 3); rect(c, 25, 25, 3, 3, COL.skin);
    }
  });
}

function nestBack(c, t, pal = PAL.gold) {
  skyBands(c, pal.sky, 150);
  rect(c, 0, 150, LW, LH, pal.sky[5]);
  cloudsLayer(c, 14, t * 3, 5, pal.cloud, pal.cloudD);
  hillsLayer(c, 124, 12, 180, 3.2, pal.far, 30);
  forestLayer(c, 150, 20, 17, 3, pal.mid, 30);
  groundLayer(c, 160, 60, pal.ground, pal.tuft);
  // дубы-гнездо с тремя окнами
  blit(c, oakSprite(), 180, 6);
  blit(c, oakSprite(), 268, 2, true);
  blit(c, oakSprite(), 92, 12);
  rect(c, 140, 62, 210, 74, "#7c5630");
  c.fillStyle = "#5c3e22"; for (let y = 66; y < 134; y += 6) c.fillRect(140, y, 210, 1);
  c.fillStyle = "#94703e"; for (let y = 67; y < 134; y += 6) c.fillRect(140, y, 210, 1);
  poly(c, [[128, 64], [362, 64], [245, 20]], "#5a3820");
  poly(c, [[140, 62], [350, 62], [245, 26]], "#6e4828");
  rect(c, 229, 124, 32, 36, "#2a1a10");
  rect(c, 245, 124, 2, 36, "#54381e");
  return [[156, 76], [226, 76], [296, 76]];
}

function windowFrame(c, x, y, lit) {
  rect(c, x - 3, y - 3, 44, 40, "#d8a84a");
  rect(c, x - 2, y - 2, 42, 38, "#6a3a1a");
  rect(c, x, y, 38, 34, lit ? "#f8e090" : "#231810");
  poly(c, [[x - 6, y - 3], [x + 19, y - 12], [x + 44, y - 3]], "#d8a84a");
  poly(c, [[x, y - 3], [x + 19, y - 9], [x + 38, y - 3]], "#8a4a20");
}

function husbandSprite(frame, spear = true) {
  return muzhikSprite("#7ca0d8", frame, { spear, hat: "#3c2a1c", beard: "#2a1a14" });
}

function kievBack(c, t, pal, scroll = 0) {
  skyBands(c, pal.sky, 150);
  rect(c, 0, 150, LW, LH, pal.sky[5]);
  cloudsLayer(c, 14, t * 2, 8, pal.cloud, pal.cloudD);
  hillsLayer(c, 128, 12, 200, 2.2, pal.far, scroll * 0.2);
  // стена и башни, золотые главы
  const X = (x) => x - scroll * 0.6;
  const tower = (x, h, r) => {
    rect(c, X(x), 148 - h, 34, h, "#ece4d0"); rect(c, X(x) + 26, 148 - h, 8, h, "#c8bea4");
    rect(c, X(x), 148 - h, 34, 3, "#a89878");
    ell(c, X(x) + 17, 148 - h - 6, r, r + 2, "#f0c040"); ell(c, X(x) + 14, 148 - h - 8, r * 0.4, r * 0.6, "#ffe680");
    rect(c, X(x) + 16, 148 - h - 20, 2, 10, "#f0c040"); rect(c, X(x) + 13, 148 - h - 17, 8, 1, "#f0c040");
  };
  for (const [x, h, r] of [[-40, 66, 11], [110, 86, 14], [176, 104, 17], [240, 86, 14], [310, 66, 11], [420, 58, 10], [520, 72, 11], [600, 60, 10]]) tower(x, h, r);
  rect(c, X(-120), 112, 900, 38, "#f4ecd8");
  rect(c, X(-120), 112, 900, 3, "#b0a080");
  for (let x = -120; x < 780; x += 13) rect(c, X(x), 106, 7, 6, "#f4ecd8");
  rect(c, X(190), 118, 34, 32, "#1e1410"); ell(c, X(207), 118, 17, 10, "#1e1410");
  groundLayer(c, 150, scroll, pal.ground, pal.tuft);
}

function palaceFacade(c, t, bend = 0, burst = 0) {
  const W = (x, y) => x + (148 - y) * bend * 0.5;
  // Шпили и главы наклоняются вместе с bend
  const dome = (x, y, r) => {
    const tx = W(x, y - r);
    rect(c, tx - r * 0.8, y, r * 1.6, 18, "#ece4d0");
    ell(c, tx, y - 3, r, r + 2, COL.gold); ell(c, tx - r * 0.4, y - 6, r * 0.3, r * 0.6, COL.goldL);
    line(c, tx, y - r - 5, W(x, y - r - 12), y - r - 14, COL.gold, 2);
    rect(c, W(x, y - r - 11) - 3, y - r - 11, 7, 1, COL.gold);
  };
  dome(120, 60, 16); dome(240, 40, 24); dome(360, 60, 16);
  rect(c, 80, 80, 320, 90, "#f0e8d4");
  rect(c, 80, 80, 320, 4, "#c84834");
  rect(c, 80, 84, 320, 3, COL.gold);
  rect(c, 80, 160, 320, 10, "#c8bea4");
  // окошечки
  for (let i = 0; i < 8; i++) {
    const x = 96 + i * 38 + (i > 3 ? 18 : 0);
    if (burst > 0) rect(c, x, 96, 16, 28, "#1c1410");
    else {
      rect(c, x, 96, 16, 28, "#3c6aa8"); rect(c, x + 7, 96, 2, 28, "#c89a2c"); rect(c, x, 108, 16, 2, "#c89a2c");
      ell(c, x + 8, 96, 8, 5, "#3c6aa8"); rect(c, x + 2, 98, 4, 8, "#7ca8d8");
    }
    rect(c, x - 2, 124, 20, 2, "#c89a2c");
    if (burst > 0 && burst < 1) {
      for (let k = 0; k < 7; k++) {
        const r = burst * (24 + hash(k + i * 9) * 90), an = hash(k * 3 + i) * 6.28;
        rect(c, x + 8 + Math.cos(an) * r, 110 + Math.sin(an) * r + burst * burst * 60, 3, 3, k % 2 ? "#7ca8d8" : "#f8f4e0");
      }
    }
  }
  rect(c, 214, 118, 52, 52, "#2a1810"); ell(c, 240, 118, 26, 16, "#2a1810");
  rect(c, 238, 104, 4, 66, "#6a4020");
}

function yardBack(c, t, pal, o = {}) {
  skyBands(c, pal.sky, 120);
  rect(c, 0, 120, LW, LH, pal.sky[5]);
  cloudsLayer(c, 10, t * 2, 8, pal.cloud, pal.cloudD);
  palaceFacade(c, t, o.bend || 0, o.burst || 0);
  // стена двора по бокам
  for (const [x, w] of [[0, 84], [396, 84]]) {
    rect(c, x, 112, w, 58, "#e4dac2"); rect(c, x, 112, w, 2, "#a89878");
    for (let i = x; i < x + w; i += 12) rect(c, i, 106, 7, 6, "#e4dac2");
    c.fillStyle = "#c8bea4"; for (let y = 120; y < 170; y += 8) c.fillRect(x, y, w, 1);
  }
  // широкий двор: мощёные плиты
  rect(c, 0, 170, LW, 100, "#b4a68e");
  c.fillStyle = "#94866e";
  for (let y = 172; y < 200; y += 6) c.fillRect(0, y, LW, 1);
  for (let y = 172; y < 200; y += 6) for (let x = (y % 12 ? 0 : 7); x < LW; x += 14) c.fillRect(x, y, 1, 6);
}

function hallBack(c, t) {
  rect(c, 0, 0, LW, 150, "#7a2c2c");
  c.fillStyle = "#8e3a34"; for (let y = 0; y < 150; y += 24) for (let x = (y % 48 ? 0 : 24); x < LW; x += 48) { c.fillRect(x + 12, y + 8, 12, 8); }
  c.fillStyle = "#c89a2c"; for (let y = 4; y < 150; y += 24) for (let x = (y % 48 ? 0 : 24); x < LW; x += 48) c.fillRect(x + 17, y + 6, 2, 12);
  rect(c, 0, 120, LW, 50, "#5a1c20"); rect(c, 0, 120, LW, 2, "#c89a2c");
  // арочные окна со светом
  for (const x of [60, 170, 280, 390]) {
    rect(c, x, 42, 36, 66, "#2c54a8"); ell(c, x + 18, 42, 18, 16, "#2c54a8");
    rect(c, x + 3, 40, 30, 66, "#7ca8d8"); ell(c, x + 18, 40, 15, 14, "#7ca8d8");
    rect(c, x + 17, 26, 2, 80, "#c89a2c"); rect(c, x + 3, 66, 30, 2, "#c89a2c");
    poly(c, [[x + 2, 108], [x + 34, 108], [x + 54, 170], [x - 16, 170]], "#a84a3c");
  }
  for (const x of [8, 130, 240, 350, 454]) { rect(c, x, 0, 18, 170, "#ece4d0"); rect(c, x + 13, 0, 5, 170, "#c8bea4"); rect(c, x - 2, 0, 22, 8, COL.gold); rect(c, x - 2, 162, 22, 8, COL.gold); }
  // пол-шахматка
  rect(c, 0, 170, LW, 100, "#3c2438");
  c.fillStyle = "#5a3a50";
  for (let y = 170, r = 0; y < 270; y += 10, r++) for (let x = (r % 2) * 20; x < LW; x += 40) c.fillRect(x, y, 20, 10);
}

function feastTable(c, x, y, w) {
  rect(c, x, y + 12, w, 16, "#6a3a1a");
  rect(c, x, y, w, 14, "#f4ecd8");
  rect(c, x, y + 12, w, 3, "#c84834");
  for (let i = 0; i < w / 26; i++) {
    const cx = x + 8 + i * 26;
    if (i % 3 === 0) { blit(c, cupSprite(true), cx, y - 12); }
    else if (i % 3 === 1) { ell(c, cx + 6, y - 2, 8, 4, "#c89a2c"); ell(c, cx + 6, y - 4, 5, 3, "#a84a20"); }
    else { ell(c, cx + 6, y - 3, 7, 5, "#c88a3c"); rect(c, cx + 2, y - 5, 8, 1, "#e8c078"); }
  }
}

// Пузырь-мысль с мини-картинкой, как в комиксе
function vision(c, x, y, w, h, draw, k = 1) {
  if (k <= 0) return;
  const hh = h * k;
  panel(c, x, y + (h - hh) / 2, w, hh, "#20264c");
  if (k < 1) return;
  c.save();
  c.beginPath(); c.rect(x + 4, y + 4, w - 8, h - 8); c.clip();
  c.translate(x + 4, y + 4);
  c.scale((w - 8) / LW, (h - 8) / 190);
  draw();
  c.restore();
}

function scanWave(c, cv, amp, t) {
  if (amp <= 0.01) return;
  for (let y = 0; y < 200; y++) {
    const dx = R(Math.sin(y * 0.09 + t * 16) * amp);
    if (dx) c.drawImage(cv, 0, y, LW, 1, dx, y, LW, 1);
  }
}

function people(c, t, fall, xs) {
  xs.forEach((x, i) => {
    const f = clamp(fall * 1.6 - i * 0.1);
    if (f <= 0) blit(c, muzhikSprite(i % 2 ? COL.white : "#c8d0b0", Math.floor(t * 2 + i) % 2, { hat: i % 3 ? "#6a4a2a" : "#3a4a6a" }), x, 158 + (i % 2) * 8);
    else blitRot(c, muzhikSprite(i % 2 ? COL.white : "#c8d0b0", 0, { hat: i % 3 ? "#6a4a2a" : "#3a4a6a", down: true }), x + 11, 176 + (i % 2) * 8, f * 1.5);
  });
}

const SCENES2 = {
  // ---------- 89–114: гнездо, три дочери ----------
  nest(c, t, a) {
    const w = nestBack(c, t);
    const speak = [S(92), S(98), S(103)];
    const cols = [COL.red, COL.blue, COL.green];
    w.forEach((p, i) => {
      const k = springPop(t - speak[i] + 0.2);
      const on = t >= speak[i] - 0.2;
      const active = (i === 0 && a(92) > 0 && a(98) < 0) || (i === 1 && a(98) > 0 && a(103) < 0) || (i === 2 && a(103) > 0);
      windowFrame(c, p[0], p[1], on);
      if (on) {
        const sy = p[1] + 36 - R(36 * Math.min(1, k));
        c.save(); c.beginPath(); c.rect(p[0], p[1], 38, 34); c.clip();
        blit(c, girlSprite(cols[i], active && Math.floor(t * 7) % 2 ? 1 : 0), p[0] + 10, sy - 2);
        c.restore();
      }
      if (active) rect(c, p[0] + 18, p[1] - 12 + Math.sin(t * 8), 2, 2, "#fff4a0");
    });
    const p = clamp((t - S(89)) / (S(115) - S(89)));
    const x = lerp(-70, 150, p);
    blit(c, riderSprite(gallop(t, 8), { walk: true }), x, 118);
    boundSolovey(c, x + 50, 174, t);
    label(c, "ГНЕЗДО СОЛОВЬИНОЕ");
  },

  // ---------- 115–135: зятья ----------
  husbands(c, t, a) {
    const w = nestBack(c, t);
    w.forEach((p, i) => { windowFrame(c, p[0], p[1], true); blit(c, girlSprite([COL.red, COL.blue, COL.green][i]), p[0] + 10, p[1] + 14); });
    const stop = a(122) > 0;
    const thrown = a(130) > 0;
    const px = lerp(150, 90, clamp((t - S(115)) / 14));
    const x = a(133) > 0 ? lerp(px, 480, clamp(a(133) / 7)) : px;
    blit(c, riderSprite(gallop(t, 7), { walk: true }), x, 118);
    boundSolovey(c, x + 50, 174, t);
    for (let i = 0; i < 3; i++) {
      const k = clamp((t - S(117) - i * 0.5) / 3.2);
      const hx = lerp(240 + i * 20, 240 - 8 * i - 34, smooth(k));
      const by = !stop && k < 1 ? (Math.floor(t * 8 + i) % 2) : 0;
      blit(c, husbandSprite(Math.floor(t * 8 + i), !thrown), hx, 146 + i * 6 - by, true);
      if (thrown) { const f = clamp(a(130) / 0.5); blitRot(c, sprite("spearg", 30, 6, (cc) => { line(cc, 0, 3, 24, 3, COL.leather); poly(cc, [[24, 0], [30, 3], [24, 6]], COL.steelL); }, null), hx - 8 - f * 12, 170 + i * 6, f * 1.4); }
      if (a(131) > 0 && a(133) < 0) rect(c, hx - 2, 150 + i * 6 + Math.sin(t * 7 + i) * 2, 3, 3, COL.skin);
    }
    if (a(126) > 0 && a(129) < 0) { // ества и питьё в пузыре
      vision(c, 318, 26, 148, 76, () => { hallBack(c, t); feastTable(c, 60, 130, 360); }, clamp(a(126) * 3));
    }
    label(c, "ГНЕЗДО СОЛОВЬИНОЕ");
  },

  // ---------- 136–142: Киев, Владимир из церкви ----------
  kiev(c, t, a) {
    const v = a(136);
    const inside = a(139) > 0;
    if (!inside) {
      const scroll = clamp(v / 8) * 110;
      kievBack(c, t, PAL.gold, scroll);
      if (a(138) < 0) {
        blit(c, riderSprite(gallop(t, 7), { walk: true }), lerp(-60, 118, smooth(v / 6)), 96);
        boundSolovey(c, lerp(-60, 118, smooth(v / 6)) + 50, 152, t);
      } else {
        // Князь выходит из церкви
        const k = clamp(a(138) / 3.5);
        blit(c, princeSprite(false, Math.floor(t * 5)), lerp(160, 260, k), 120);
        for (let i = 0; i < 3; i++) blit(c, muzhikSprite("#c8d0b0", Math.floor(t * 5 + i), { hat: "#3a4a6a" }), lerp(130, 228, k) - i * 22, 130 + i * 2);
      }
      label(c, "СТОЛЬНЫЙ КИЕВ-ГРАД");
    } else {
      hallBack(c, t);
      feastTable(c, 76, 178, 330);
      blit(c, princeSprite(false, 0), 226, 130);
      for (let i = 0; i < 6; i++) { if (i === 3) continue; const x = 96 + i * 54; blit(c, muzhikSprite(i % 2 ? "#7ca0d8" : "#c8d0b0", 0, { hat: i % 2 ? "#6a2c2c" : "#3c2a1c", beard: "#6a5030" }), x, 150 + (Math.sin(t * 3 + i) > 0.7 ? -1 : 0)); }
      label(c, "СТОЛОВАЯ ГОРЕНКА");
    }
  },

  // ---------- 143–152: Илья входит ----------
  enter(c, t, a) {
    const outside = a(145) < 0;
    if (outside) {
      yardBack(c, t, PAL.gold);
      blit(c, riderSprite(0, { walk: true, noRider: a(144) > 1.2 }), 80, 112);
      boundSolovey(c, 130, 168, t);
      if (a(144) > 1.2) blit(c, ilyaFoot(Math.floor(t * 5)), lerp(150, 214, clamp((a(144) - 1.2) / 2)), 128);
      label(c, "ШИРОКИЙ ДВОР");
      return;
    }
    hallBack(c, t);
    feastTable(c, 200, 178, 260);
    blit(c, princeSprite(false, 0), 320, 130);
    for (let i = 0; i < 3; i++) blit(c, muzhikSprite("#7ca0d8", 0, { hat: "#6a2c2c" }), 226 + i * 30, 150);
    // дверь на пяту
    const door = clamp(a(147) / 0.5);
    rect(c, 28, 74, 44, 96, "#120c0c");
    if (door < 1) rect(c, 28, 74, 44 * (1 - door), 96, "#6a3a1a");
    else poly(c, [[28, 74], [14, 62], [14, 184], [28, 170]], "#6a3a1a");
    if (a(147) > 0.3 && a(148) < 0.1) for (let i = 0; i < 10; i++) rect(c, 72 + hash(i) * 26, 90 + hash(i * 3) * 70, 2, 2, "#d8c8a0");
    const walk = clamp(a(147) / 2.2);
    const bowU = a(149) > 0 ? Math.max(0, Math.sin((a(149) * 1.2) % Math.PI)) : 0;
    const bow2 = a(150) > 0 ? Math.max(0, Math.sin((a(150) * 1.5) % Math.PI)) : 0;
    const bx = lerp(30, 118, walk);
    blitRot(c, ilyaFoot(a(147) < 2.2 && a(147) > 0 ? Math.floor(t * 5) : 0), bx + 17, 150, Math.max(bowU, bow2) * 0.7);
    label(c, "СТОЛОВАЯ ГОРЕНКА");
  },

  // ---------- 153–176: расспрос ----------
  palace(c, t, a) {
    hallBack(c, t);
    feastTable(c, 200, 178, 260);
    for (let i = 0; i < 3; i++) blit(c, muzhikSprite("#7ca0d8", 0, { hat: "#6a2c2c" }), 226 + i * 30, 150);
    blit(c, ilyaFoot(0), 118, 128);
    blit(c, princeSprite(false, 0), 320, 130);
    if (a(171) > 0) {
      const k = clamp(a(171) * 3);
      vision(c, 150, 12, 178, 96, () => { approachMini(c, t, clamp(a(172) / 8)); }, k);
    }
    label(c, "СТОЛОВАЯ ГОРЕНКА");
  },

  // ---------- 177–197: Владимир не верит ----------
  doubt(c, t, a) {
    hallBack(c, t);
    feastTable(c, 200, 178, 260);
    for (let i = 0; i < 3; i++) blit(c, muzhikSprite("#7ca0d8", 0, { hat: "#6a2c2c" }), 226 + i * 30, 150 + (Math.sin(t * 8 + i) > 0.8 && a(181) < 0 ? -1 : 0));
    blit(c, ilyaFoot(0), 118, 128);
    blit(c, princeSprite(false, 0), 320 + (a(178) > 0 && a(181) < 0 ? Math.sin(t * 12) : 0), 130);
    if (a(181) > 0) {
      const k = clamp(a(181) * 3);
      const stage = t < S(187) ? 0 : t < S(192) ? 1 : 2;
      vision(c, 150, 12, 178, 96, () => {
        if (stage === 0) { // сила под Черниговом
          skyBands(c, PAL.grim.sky, 150); rect(c, 0, 150, LW, 110, "#6e4a44");
          blit(c, fortSprite(0), 140, 70); rect(c, 0, 160, LW, 110, "#2e2a24");
          for (let r = 0; r < 3; r++) for (let i = 0; i < 26; i++) blit(c, soldierSprite(i % 2), i * 19 - 16, 134 + r * 12);
        } else if (stage === 1) { // приметы у Смородины
          approachMini(c, t, clamp((t - S(187)) / 6));
        } else { // свист
          meadowScene(c, t, 0, { bend: 1, flower: 1, forest: clamp((t - S(195)) / 2), people: clamp((t - S(197)) / 1), whistle: true });
        }
      }, k);
    }
    label(c, "СТОЛОВАЯ ГОРЕНКА");
  },

  // ---------- 198–202: «на твоём дворе» ----------
  reveal(c, t, a) {
    if (a(200) < 0) {
      hallBack(c, t);
      feastTable(c, 200, 178, 260);
      blit(c, ilyaFoot(0), 118, 128);
      blit(c, princeSprite(false, 0), 320, 130);
    } else {
      yardBack(c, t, PAL.gold);
      blit(c, riderSprite(0, { walk: true, noRider: true }), 240, 112);
      const k = springPop(a(200));
      blitRot(c, soloveySprite("sit", true), 212, 170, 1.25, 0.5 + k * 0.5);
      line(c, 236, 152, 262, 140, COL.leather, 2);
    }
    label(c, a(200) < 0 ? "СТОЛОВАЯ ГОРЕНКА" : "ШИРОКИЙ ДВОР");
  },

  // ---------- 203–243: на дворе ----------
  yard(c, t, a) {
    yardBack(c, t, PAL.gold);
    blit(c, riderSprite(0, { walk: true, noRider: true }), 264, 112);
    blitRot(c, soloveySprite("sit", true, a(226) > 0 && a(238) < 0 ? 1 : 0), 234, 172, a(226) > 0 ? 1.1 : 1.25, 1);
    line(c, 252, 152, 286, 142, COL.leather, 2);
    // Князь выбегает: шапка на одно ухо, шуба на одно плечо
    const run = clamp(a(203) / 3.4);
    const hasCoat = a(205) > 0;
    const hat = a(206) > 0;
    const px = lerp(240, 96, smooth(run));
    blit(c, princeSprite(hasCoat, run < 1 ? Math.floor(t * 8) : 0, !hat), px, 126 + (run < 1 ? -(Math.floor(t * 8) % 2) : 0));
    if (a(207) > 0) blit(c, ilyaFoot(0), 356, 124, true);
    if (a(233) > 0 && a(237) < 0) { // просит чару зелена вина
      blitRot(c, cupSprite(true), 234, 120, 0, 2);
    }
    label(c, "ШИРОКИЙ ДВОР");
  },

  // ---------- 244–252: полтора ведра ----------
  pour(c, t, a) {
    if (a(249) < 0) {
      hallBack(c, t);
      // бочка и наполняющаяся чара
      rect(c, 120, 118, 62, 52, "#6a3a1a"); c.fillStyle = "#4a2810"; c.fillRect(120, 128, 62, 2); c.fillRect(120, 158, 62, 2); rect(c, 178, 150, 6, 8, "#c89a2c");
      const lvl = clamp(a(246) / 3) * 0.7 + clamp(a(248) / 2) * 0.3;
      const cy = 150;
      poly(c, [[202, cy - 18], [282, cy - 18], [268, cy + 24], [216, cy + 24]], COL.gold);
      poly(c, [[206, cy - 14], [278, cy - 14], [264, cy + 20], [220, cy + 20]], "#3a1420");
      const ly = lerp(cy + 20, cy - 12, lvl);
      if (lvl > 0.01) poly(c, [[lerp(220, 206, (cy + 20 - ly) / 34), ly], [lerp(264, 278, (cy + 20 - ly) / 34), ly], [264, cy + 20], [220, cy + 20]], a(248) > 0 ? "#b8892c" : "#6c2c3c");
      if (lvl < 1 && a(246) > 0) { line(c, 184, 154, 225, ly, a(248) > 0 ? "#d8a83c" : "#8c2c3c", 3); }
      blit(c, princeSprite(false, Math.floor(t * 6)), 310, 130);
      label(c, "СТОЛОВАЯ ГОРЕНКА");
    } else {
      yardBack(c, t, PAL.gold);
      blit(c, riderSprite(0, { walk: true, noRider: true }), 264, 112);
      line(c, 252, 152, 286, 142, COL.leather, 2);
      blit(c, ilyaFoot(0), 356, 124, true);
      const k = clamp(a(249) / 3);
      blit(c, princeSprite(true, k < 1 ? Math.floor(t * 8) : 0), lerp(60, 170, smooth(k)), 126);
      const drink = clamp(a(252) / 0.9);
      blitRot(c, soloveySprite("sit", true), 234, 172 - drink * 8, 1.1 - drink * 0.9, 1);
      if (a(251) > 0) {
        const ang = 0.3 + drink * 1.6;
        blitRot(c, cupSprite(drink < 1), 234 + 10, 154 - drink * 14, ang, 2);
      } else if (a(249) > 0) blitRot(c, cupSprite(true), lerp(60, 170, smooth(k)) + 26, 150, 0, 2);
      label(c, "ШИРОКИЙ ДВОР");
    }
  },

  // ---------- 253–260: главный свист ----------
  blast(c, t, a, cv) {
    const v = a(253);
    const bend = clamp(a(255) / 1.1) * (1 + Math.sin(t * 11) * 0.05);
    const burst = a(256) > 0 ? clamp(a(256) / 2) : 0;
    const pal = PAL.grim;
    c.save();
    const sh = 2 + clamp(v / 2) * 3;
    c.translate(R(Math.sin(t * 47) * sh), R(Math.cos(t * 37) * sh * 0.7));
    yardBack(c, t, pal, { bend, burst });
    people(c, t, clamp(a(258) / 1.5), [24, 58, 90, 122, 370, 402, 436]);
    blitRot(c, riderSprite(0, { walk: true, noRider: true }), 300 + Math.sin(t * 30), 148, 0.1);
    blit(c, soloveySprite("whistle", true, Math.floor(t * 10) % 2), 216, 116);
    blit(c, ilyaFoot(0), 356, 124, true);
    if (a(259) > 0) { // князь укрывается шубой
      ell(c, 170, 164, 18, 13, COL.fur); ell(c, 170, 170, 20, 6, COL.furD);
      c.fillStyle = COL.furD; for (let i = 0; i < 7; i++) c.fillRect(156 + i * 4, 156 + (i % 3) * 3, 2, 1);
      if (Math.floor(t * 7) % 2) rect(c, 154, 166, 2, 2, COL.skin);
    } else blit(c, princeSprite(true, 0), 158, 126);
    whistleWaves(c, 239, 136, t * 1.4, 1.6);
    c.restore();
    scanWave(c, cv, 2 + clamp(v / 3) * 5, t);
    label(c, "ШИРОКИЙ ДВОР");
  },

  // ---------- 261–265: чисто поле на закате ----------
  field(c, t, a) {
    const v = a(261), scroll = v * 60;
    if (a(264) < -0.1) {
      landscape(c, t, PAL.dusk, scroll, { sun: [380, 118, 34], sunGlow: "#f8a860", sunCol: "#ffd890" });
      blit(c, riderSprite(gallop(t, 11)), 150, 112);
      boundSolovey(c, 200, 168, t);
      label(c, "ЧИСТО ПОЛЕ");
    } else {
      // без подробностей: только силуэт и взмах меча
      landscape(c, t, PAL.dusk, 200, { sun: [240, 112, 46], sunGlow: "#f8a860", sunCol: "#ffd890" });
      const sw = clamp(a(264) / 0.6);
      blit(c, sprite("ilsil", 34, 44, (cc) => { const s = ilyaFoot(0, true); cc.drawImage(s, 0, 0); cc.globalCompositeOperation = "source-in"; cc.fillStyle = "#1a1030"; cc.fillRect(0, 0, 34, 44); }, null), 224, 118);
      line(c, 252, 122, 252 + Math.sin(-0.6 + sw * 2.2) * 40, 122 - Math.cos(-0.6 + sw * 2.2) * 40, "#fff4d0", 2);
      if (a(264) > 0.5) {
        wash(c, "#fff8e0", clamp(0.9 - (a(264) - 0.5) * 1.1));
        // перья по ветру
        for (let i = 0; i < 22; i++) {
          const ph = a(264) * (0.3 + hash(i) * 0.5) + hash(i * 3);
          rect(c, 250 + Math.sin(ph * 8 + i) * 18 + a(264) * (6 + i), 110 + ph * 40 + hash(i * 7) * 20, 3, 1, i % 3 ? COL.featherL : COL.feather);
        }
      }
      if (a(265) > 0) blit(c, sprite("hatg", 18, 12, (cc) => { poly(cc, [[1, 11], [17, 11], [14, 4], [9, 1], [4, 4]], COL.featherD); poly(cc, [[7, 2], [9, -2], [12, 2]], COL.red); }), 280, 166);
      label(c, "ЧИСТО ПОЛЕ");
    }
  },

  // ---------- 266–270: «тебе полно» ----------
  polno(c, t, a) {
    const v = a(266);
    const pal = PAL.gold;
    landscape(c, t, pal, 40, { sun: [410, 44, 16] });
    const sun = clamp(v / 12);
    blit(c, oakSprite(), 330, 26);
    // соловей-птичка вместо свиста
    disc(c, 386, 58, 3, "#8a6a44"); rect(c, 389, 57, 2, 1, "#d89a30");
    if (a(266) > 0) for (let i = 0; i < 3; i++) { const p = ((t * 0.6 + i / 3) % 1); rect(c, 392 + p * 30, 56 - p * 18 + Math.sin(p * 9) * 2, 2, 3, "#fff6d8"); }
    // цветы поднимаются
    for (let i = 0; i < 60; i++) {
      const g = clamp((t - S(266) - i * 0.04) / 1);
      const x = hash(i * 3.1) * LW, y = 170 + hash(i * 1.9) * 22, h = g * (4 + hash(i) * 5);
      line(c, x, y, x, y - h, "#3e7428");
      if (g > 0.7) { const col = ["#6ab0f0", "#f8e870", "#f07a8a"][i % 3]; rect(c, x - 1, y - h - 1, 3, 1, col); rect(c, x, y - h - 2, 1, 3, col); }
    }
    const slot = (n, draw) => { if (a(n) > 0) { const k = springPop(a(n)); draw(k); } };
    slot(268, (k) => { blit(c, muzhikSprite(COL.whiteD, 0, { beard: COL.whiteD, hat: "#5a4a3a" }), 112, 200 - 40 * k); blit(c, girlSpriteFull("#8a4a64"), 134, 200 - 40 * k); });
    slot(269, (k) => { blit(c, muzhikSprite("#7ca0d8", Math.floor(t * 3)), 182, 200 - 40 * k); blit(c, girlSpriteFull(COL.green), 204, 200 - 40 * k); });
    slot(270, (k) => { for (let i = 0; i < 4; i++) { const jump = R(Math.abs(Math.sin(t * 5 + i)) * 6); blit(c, childSprite(i), 248 + i * 20, 186 - 12 * k - jump); } });
    blit(c, riderSprite(gallop(t, 5), { walk: true }), 10 + sun * 6, 110);
    label(c, "ЧИСТО ПОЛЕ");
  },

  // ---------- 271–272: слава ----------
  slava(c, t, a) {
    const v = a(271);
    const pal = PAL.gold;
    skyBands(c, pal.sky, 170);
    rect(c, 0, 170, LW, LH, pal.sky[5]);
    disc(c, 240, 118, 70, "#ffe89c"); disc(c, 240, 118, 58, "#fff6d0");
    for (let i = 0; i < 12; i++) { const an = i * 0.52 + t * 0.2; line(c, 240 + Math.cos(an) * 74, 118 + Math.sin(an) * 74, 240 + Math.cos(an) * 106, 118 + Math.sin(an) * 106, "#ffe89c"); }
    cloudsLayer(c, 20, t * 3, 6, pal.cloud, pal.cloudD);
    hillsLayer(c, 170, 18, 120, 1.6, "#6aa23e", 10, "#8ec04e");
    rect(c, 0, 170, LW, 100, "#6aa23e");
    poly(c, [[160, 174], [320, 174], [284, 148], [196, 148]], "#8ec04e");
    blit(c, riderSprite(gallop(t, 3), { spear: true, walk: true }), 200, 90);
    for (let i = 0; i < 12; i++) {
      const left = i % 2 === 0;
      const x = left ? 34 + i * 12 : 330 + i * 11;
      const by = R(Math.abs(Math.sin(t * 4 + i)) * 3);
      blit(c, muzhikSprite(i % 3 ? COL.white : "#c8d0b0", 0, { hat: i % 3 ? "#6a4a2a" : "#3a4a6a" }), x, 164 + (i % 4) * 3 - by);
    }
  },

  // ---------- финал: крупное название (кадр-обложка) ----------
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
    const A = "ИЛЬЯ МУРОМЕЦ", B = "И СОЛОВЕЙ-РАЗБОЙНИК", C = "Русская былина";
    const wa = textWidth(A, true) * 5, wb = textWidth(B, true) * 3;
    const ya = R(lerp(-90, 18, k1)), yb = R(lerp(-60, 68, k2));
    drawText(c, A, R((LW - wa) / 2) + 3, ya + 3, "#3a1208", { scale: 5, bold: true });
    drawText(c, A, R((LW - wa) / 2), ya, "#ffd24a", { scale: 5, bold: true, shadow: "#a0300c" });
    drawText(c, B, R((LW - wb) / 2) + 2, yb + 2, "#120c28", { scale: 3, bold: true });
    drawText(c, B, R((LW - wb) / 2), yb, "#fffaf0", { scale: 3, bold: true, shadow: "#7a2810" });
    if (u > 1.4) { const w = textWidth(C) * 2; drawText(c, C, R((LW - w) / 2), 102, "#5a2408", { scale: 2, shadow: "#fff6d0" }); }
  },
};

function girlSpriteFull(col) {
  return sprite("gf" + col, 22, 30, (c) => {
    poly(c, [[6, 12], [15, 12], [19, 28], [3, 28]], col);
    rect(c, 10, 12, 2, 16, COL.gold);
    disc(c, 11, 7, 4, COL.skin);
    poly(c, [[6, 5], [16, 5], [15, 0], [11, -2], [7, 0]], COL.red); rect(c, 6, 5, 10, 1, COL.gold);
    rect(c, 6, 7, 2, 10, "#6a4020");
  });
}
function childSprite(i) {
  return sprite("ch" + i, 14, 18, (c) => {
    const col = [COL.white, COL.blueL, "#f0c848", COL.redL][i % 4];
    poly(c, [[3, 7], [11, 7], [12, 15], [2, 15]], col);
    rect(c, 3, 15, 3, 3, COL.leather); rect(c, 8, 15, 3, 3, COL.leather);
    disc(c, 7, 4, 3.4, COL.skin);
    rect(c, 3, 1, 8, 2, ["#e8c868", "#8a5a30", "#3a2a1c", "#d88a30"][i % 4]);
  });
}

// Мини-дорога с приметами для пузыря-воспоминания
function approachMini(c, t, u) {
  skyBands(c, PAL.grim.sky, 150);
  rect(c, 0, 150, LW, 110, "#6e4a44");
  hillsLayer(c, 124, 12, 180, 3.2, PAL.grim.far, 20);
  rect(c, 0, 160, LW, 110, "#3a5a2c");
  ell(c, 90, 184, 66, 14, "#141014");
  blit(c, birchSprite(), 170, 86);
  rect(c, 240, 160, 70, 40, "#c04820");
  for (let i = 0; i < 12; i++) rect(c, 240 + hash(i) * 60, 162 + hash(i * 3) * 34, 6, 1, "#f09040");
  blit(c, crossSprite(), 350, 134);
  blit(c, riderSprite(gallop(t, 7), { walk: true }), lerp(-20, 390, u), 110);
}
