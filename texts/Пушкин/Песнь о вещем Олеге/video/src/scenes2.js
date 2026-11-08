// ---------- v3. Сцены: строфы 7–12 ----------
function hearts(c, x, y, t, t0) { for (let i = 0; i < 3; i++) { if (t < t0) continue; const u = ((t - t0) * 0.8 + i / 3) % 1; blit(c, heartIcon(true), R(x + Math.sin(u * 6 + i) * 6), R(y - u * 30)); } }
const HORSE_X = 150, HORSE_Y = GROUND + 4; // конь стоит здесь в сценах прощания
function horseAt(c, x, t, opt = {}, flip, y = HORSE_Y, blanket = false) { rider(c, x, y, t, { noRider: true, ...opt }, flip); if (blanket) drawBlanket(c, flip ? x + 84 - 62 : x + 22, y - 76 + 40 + (opt.speed && Math.floor(t * opt.speed) % 2 ? 1 : 0)); }
function drawBlanket(c, x, y) { rect(c, x, y, 40, 15, "#8a2a8a"); rect(c, x, y + 13, 40, 2, COL.gold); for (let i = 2; i < 38; i += 6) rect(c, x + i, y + 4, 2, 2, "#c86ac8"); }

// ---------- 7. Конь в бою, квест ----------
function sc7(c, t) {
  if (t < L(39) - 0.1) { // гордый конь крупно
    bgSteppe(c, t, 400, DUSK, 100);
    big(c, riderSprite(Math.floor(t * 4) % 8, { idle: true, noRider: true }), 70, GROUND - 156, 2);
    return;
  }
  if (t < L(40) - 0.1) { // стоит смирно под стрелами
    bgSteppe(c, t, 420, DUSK, null);
    horseAt(c, 150, t);
    for (let i = 0; i < 18; i++) { const t0 = L(39) - 0.2 + hash(i) * 1.8, x = R(40 + hash(i * 3) * 300), fl = clamp((t - t0) / 0.35); if (t < t0 || (x > 140 && x < 240)) continue; const y = R(lerp(TOP, GROUND + 2, fl)), xx = R(x - (1 - fl) * 40); line(c, xx, y, xx - 6, y - 10, "#c8b090"); rect(c, xx - 7, y - 12, 2, 3, "#e8e0c0"); }
    if (t > W("w_strel7")) floatText(c, "ПРОМАХ", t, W("w_strel7") + 0.2, 190, GROUND - 70, "#9fd8ff");
    return;
  }
  if (t < L(41) - 0.1) { // мчится по бранному полю, сбивает врагов
    const sc = (t - L(40)) * 140;
    bgSteppe(c, t, sc, ["#1a1010", "#3a1a14", "#6a2a18", "#a04020"], null);
    for (let i = 0; i < 4; i++) { const x = R(((i * 120 - sc * 0.5) % 480 + 480) % 480 - 40); for (let k = 0; k < 5; k++) ell(c, x + Math.sin(t + k) * 4, 120 - k * 14, 10 + k * 3, 5, "#3a2a2a"); }
    for (let i = 0; i < 3; i++) { const hit = L(40) + 0.35 + i * 0.55, x = R(lerp(LW + 10, 222, clamp((t - hit + 0.6) / 0.6))); knocked(c, x, t, hit); }
    const [dx, dy] = shakeXY(t, L(40) + 0.35, 2, 1.8);
    rider(c, 150 + dx, GROUND + 4 + dy, t, { speed: 16, spear: true });
    particlesDust(c, t * 2, 1);
    return;
  }
  if (t < W("quest")) { // холод и сеча
    bgSteppe(c, t, 500, NIGHT, null);
    for (let i = 0; i < 70; i++) { const x = R((hash(i) * LW + t * 30) % LW), y = R(TOP + (hash(i * 2) * 150 + t * 50) % 150); rect(c, x, y, 2, 2, "#e8f0ff"); }
    rider(c, 130, GROUND + 4, t, { speed: 14 });
    const sc0 = W("w_secha"); if (t > sc0 - 0.4) { knocked(c, 250, t, sc0 + 0.1); sparkle(c, 240, GROUND - 40, t, sc0 + 0.05); sparkle(c, 236, GROUND - 46, t, sc0 + 0.2); }
    return;
  }
  bgSteppe(c, t, 500, NIGHT, null); // квест: окно рисует main.js
  horseAt(c, 150, t);
  wash(c, "#5a0810", 0.55);
}

// ---------- 8. Усмешка, тучка над головой, спешивается, гладит коня ----------
function sc8(c, t) {
  bgSteppe(c, t, 600, DUSK, 320);
  const sl = W("w_slez");
  if (t < sl) {
    rider(c, HORSE_X, HORSE_Y, t, {});
    if (t > W("w_usm") - 0.1 && t < W("w_odnako")) floatText(c, "ХМ!", t, W("w_usm") - 0.1, HORSE_X + 36, HORSE_Y - 96, "#ffe680");
    if (t > W("w_odnako") - 0.2) rainCloud(c, HORSE_X + 36, HORSE_Y - 96, t);
    return;
  }
  horseAt(c, HORSE_X, t);
  const d = clamp((t - sl) / 0.7);
  if (t < L(47) - 0.2) { // слезает: из седла дугой на землю у морды коня
    const x = R(lerp(HORSE_X + 10, HORSE_X + 70, d)), y = R(lerp(HORSE_Y - 100, GROUND - 63, d) - Math.sin(d * Math.PI) * 12);
    blit(c, olegStand(d < 1 ? "walk" : "down", 0), x, y, true);
    rainCloud(c, x + 23, y - 6, t);
    return;
  }
  olegAt(c, HORSE_X + 70, t, "pet", true, 1, 3); // гладит шею
  hearts(c, HORSE_X + 66, HORSE_Y - 70, t, W("w_glad"));
}

// ---------- 9. Прощание ----------
function sc9(c, t) {
  if (t < L(51) - 0.1) { // Олег обнимает коня, оба крупно
    bgSteppe(c, t, 650, SUNSET, 192);
    big(c, riderSprite(Math.floor(t * 3) % 8, { idle: true, noRider: true }), 10, GROUND - 156 + 4, 2);
    olegAt(c, 168, t, "talk", true, 2, 4);
    hearts(c, 170, 50, t, L(49) + 0.5);
    return;
  }
  if (t < L(53) - 0.1) { // пустое золотое стремя под седлом
    skyBands(c, SUNSET); rect(c, 0, TOP, LW, 40, "#552e16"); rect(c, 0, TOP + 40, LW, 3, "#7c4a26"); rect(c, 150, TOP + 26, 84, 14, "#c8342c"); rect(c, 150, TOP + 38, 84, 2, COL.gold);
    const sw = Math.sin((t - L(51)) * 2.4) * 0.25; c.save(); c.translate(192, TOP + 42); c.rotate(sw);
    rect(c, -2, 0, 4, 60, "#5a3a20"); rect(c, -14, 60, 28, 4, COL.gold); rect(c, -14, 60, 4, 24, COL.gold); rect(c, 10, 60, 4, 24, COL.gold); rect(c, -16, 84, 32, 4, COL.goldD); rect(c, -12, 61, 2, 20, COL.goldL);
    c.restore();
    sparkle(c, 182, TOP + 106, t, W("w_strem"), "#ffffff");
    return;
  }
  if (t < L(54) - 0.1) { // «помни меня» — конь на дыбы
    bgSteppe(c, t, 680, SUNSET, 120);
    const up = clamp((t - W("w_pomni") + 0.2) / 0.4) * (1 - clamp((t - W("w_pomni") - 1.2) / 0.5));
    c.save(); c.translate(200, GROUND); c.rotate(-0.45 * up); c.drawImage(riderSprite(0, { idle: true, noRider: true }), -40, -76); c.restore();
    if (up > 0.5) floatText(c, "И-ГО-ГО!", t, W("w_pomni"), 240, 50, "#ffffff");
    olegAt(c, 120, t, "idle");
    return;
  }
  bgSteppe(c, t, 700, SUNSET, 300); // отроки бегут
  horseAt(c, HORSE_X, t);
  olegAt(c, 90, t, "talk", false, 1, 5);
  for (let i = 0; i < 2; i++) youthAt(c, R(lerp(400 + i * 34, 238 + i * 30, clamp((t - L(54) + 0.1) / 1.0))), t + i * 0.2, true, 10);
}

// ---------- 10. Попона, луг, вода, зерно, уход ----------
function sc10(c, t) {
  const green = () => groundLayer(c, GROUND, 0, ["#3a6a2a", "#5a8a3a", "#2a5a1a"], "#7aaa4a");
  if (t < L(56) - 0.1) { // отроки набрасывают попону на спину коня
    bgSteppe(c, t, 720, SUNSET, 300);
    horseAt(c, HORSE_X, t);
    olegAt(c, 90, t, "talk", false, 1, 5);
    youthAt(c, 268, t, true, 3); youthAt(c, 238, t, true, 0);
    const t0 = W("w_popon") - 0.2, u = smooth(clamp((t - t0) / 0.7)); // отрок подбрасывает попону дугой на спину
    const hx = 224, hy = GROUND - 62, bx = HORSE_X + 22, by = HORSE_Y - 76 + 40;
    drawBlanket(c, R(lerp(hx, bx, u)), R(lerp(hy, by, u) - Math.sin(u * Math.PI) * 18));
    return;
  }
  if (t < L(57) - 0.1) { // ведут на луг под уздцы
    skyBands(c, SUNSET); sun(c, 300, 104, 12); hillsLayer(c, 136, 6, 60, 1.1, "#2a4a2a", (t - L(56)) * 10); green();
    const x = R(lerp(40, 190, clamp((t - L(56)) / 3)));
    horseAt(c, x, t, { speed: 7 }, false, HORSE_Y, true);
    youthAt(c, x + 80, t, false, 6);
    line(c, x + 68, GROUND - 54, x + 86, GROUND - 30, "#5a3a20");
    return;
  }
  if (t < L(58) - 0.1) {
    if (t < W("w_korm") - 0.1) { // купание в реке
      skyBands(c, SUNSET); green(); rect(c, 0, GROUND - 6, LW, 30, "#2a5a8a");
      horseAt(c, HORSE_X, t, {}, false, GROUND + 14, true);
      rect(c, 0, GROUND + 2, LW, 20, "#2a5a8a"); for (let x = 0; x < LW; x += 10) rect(c, x + R(Math.sin(t * 3 + x) * 3), GROUND + 2, 5, 1, "#9ad8f0");
      youthAt(c, 250, t, true, 4);
      for (let i = 0; i < 20; i++) { const u = (t * 1.5 + hash(i)) % 1; rect(c, R(200 + hash(i * 2) * 50), R(GROUND - Math.sin(u * Math.PI) * 30), 2, 2, "#c8f0ff"); }
    } else { // зерно: отрок сыплет из мешка в кормушку на земле, конь ест
      bgSteppe(c, t, 760, DUSK, 320);
      c.save(); c.translate(HORSE_X + 40, HORSE_Y); c.rotate(0.12); c.drawImage(riderSprite(0, { idle: true, noRider: true }), -40, -76); drawBlanket(c, -18, -36); c.restore();
      rect(c, 214, GROUND - 14, 44, 14, "#6a4020"); rect(c, 214, GROUND - 14, 44, 2, "#8a5a2a"); rect(c, 216, GROUND - 2, 4, 2, "#4a2a10"); rect(c, 252, GROUND - 2, 4, 2, "#4a2a10");
      ell(c, 236, GROUND - 13, 18, R(2 + clamp(t - W("w_korm")) * 2), "#e8b040");
      youthAt(c, 262, t, true, 3);
      rect(c, 252, GROUND - 40, 12, 12, "#c8a868");
      for (let i = 0; i < 30; i++) { const u = ((t - W("w_korm")) * 1.6 + hash(i)) % 1; rect(c, R(250 - u * 10 + hash(i * 3) * 4), R(GROUND - 30 + u * 16), 1, 2, "#f0c060"); }
    }
    return;
  }
  if (t < L(59) - 0.1) { // ключевая вода: родник из камня в корыто на земле
    bgForest(c, t, 200);
    poly(c, [[40, GROUND], [52, 92], [96, 80], [124, 96], [130, GROUND]], "#4a4a56"); poly(c, [[56, 100], [92, 88], [110, 100], [70, 108]], "#5a5a68");
    for (let i = 0; i < 4; i++) line(c, 118 + i, 104, 132 + i * 2, GROUND - 10, "#9ad8f0");
    for (let i = 0; i < 4; i++) { const u = (t * 2 + i / 4) % 1; rect(c, R(136 + u * 6), R(GROUND - 10 - Math.sin(u * Math.PI) * 4), 1, 1, "#e8f8ff"); }
    rect(c, 128, GROUND - 10, 48, 10, "#6a4020"); rect(c, 130, GROUND - 10, 44, 3, "#9ad8f0");
    c.save(); c.translate(222, HORSE_Y); c.scale(-1, 1); c.rotate(0.16); c.drawImage(riderSprite(0, { idle: true, noRider: true }), -40, -76); drawBlanket(c, -18, -36); c.restore();
    youthAt(c, 300, t, true, 2);
    return;
  }
  if (t < L(60) - 0.1) { // уводят в закат
    bgSteppe(c, t, 800, SUNSET, 260);
    const x = R(lerp(150, 400, clamp((t - L(59)) / 3.5)));
    horseAt(c, x, t, { speed: 7 }, false, HORSE_Y, true);
    youthAt(c, x - 26, t, false); youthAt(c, x + 76, t + 0.3, false);
    olegAt(c, 40, t, "down", false);
    toast(c, "КОНЬ ПОКИНУЛ ОТРЯД", t, W("leave"), 2.6, LW / 2, 24, "#e8302c");
    return;
  }
  bgSteppe(c, t, 820, DUSK, 260); // серый конь
  toast(c, "КОНЬ ПОКИНУЛ ОТРЯД", t, W("leave"), 2.6, LW / 2, 24, "#e8302c");
  const ent = clamp((t - W("w_drug") + 0.4) / 1.4);
  blit(c, greyHorse(ent < 1 ? Math.floor(t * 7) % 8 : 0, ent < 1 ? { walk: true } : { idle: true }), R(lerp(400, 200, ent)), GROUND - 72, true);
  if (ent > 0.2) youthAt(c, R(lerp(480, 286, ent)), t, true);
  olegAt(c, 90, t, "down", true);
}

// ---------- 11. Пир: прошло много лет ----------
function hallBg(c, t, fire0 = 1) {
  for (let y = TOP; y < GROUND; y += 8) { rect(c, 0, y, LW, 8, y % 16 ? "#3a2414" : "#4a2e18"); rect(c, 0, y + 7, LW, 1, "#2a180c"); }
  for (const x of [40, 344]) { rect(c, x - 6, 40, 12, 16, "#5a3a20"); fire(c, x - 4, 46, 8, 10, t + x); } // факелы на стенах
  rect(c, 0, GROUND, LW, LH - GROUND, "#2a1a10");
}
function firePit(c, x, t, k = 1) { for (let i = 0; i < 7; i++) ell(c, x - 18 + i * 6, GROUND + 4, 4, 3, "#6a6a72"); fire(c, x - 14, GROUND + 2, 28, 26 * k, t); }
const HAT = "#6a4a2a";
function feasters(c, t, raise, white) {
  const hair = white ? COL.white : HAT;
  for (let i = 0; i < 5; i++) {
    const x = 6 + i * 76, flip = i > 2;
    druzhAt(c, x, t * 0.5 + i, raise > 0.5 ? "up" : "talk", flip, hair);
    const hx = flip ? x + 46 - 34 : x + 34, cy = R(GROUND - 70 + 4 + (raise > 0.5 ? 2 : 32) + Math.sin(t * 3 + i) * (raise > 0.5 ? 1 : 0));
    blit(c, kovsh(), hx - 8, cy, flip);
  }
  rect(c, 0, 124, LW, 26, "#6a4020"); rect(c, 0, 124, LW, 2, "#8a5a2a"); // стол перед ними
}
function sc11(c, t) {
  if (t < L(63) - 0.1) {
    hallBg(c, t);
    const zv = W("w_zvon"), raise = clamp((t - zv + 0.6) / 0.6);
    feasters(c, t, raise, false);
    if (t > zv) for (let i = 0; i < 5; i++) sparkle(c, 40 + i * 76, 76, t, zv + i * 0.05);
    return;
  }
  if (t < W("w_kurg") - 0.15) { hallBg(c, t); feasters(c, t, 0.3, true); return; }
  if (t < L(65) - 0.1) { // курган в снегу
    skyBands(c, ["#3a4a6a", "#6a7a9a", "#a8b8d0", "#d8e0ec"]);
    ell(c, 192, 160, 150, 60, "#e8eef8"); ell(c, 192, 160, 120, 46, "#f4f8ff");
    for (let i = 0; i < 60; i++) { const x = R((hash(i) * LW + t * 20) % LW), y = R(TOP + (hash(i * 2) * 150 + t * 40) % 150); rect(c, x, y, 1, 1, "#ffffff"); }
    return;
  }
  hallBg(c, t); feasters(c, t, 0.2, true); // поминают битвы: пузырь-воспоминание
  bubble(c, 96, 18, 192, 70, 192, 84);
  c.save(); c.beginPath(); c.rect(100, 22, 184, 62); c.clip();
  skyBands(c, ["#5a2010", "#8a3a18", "#c86a28"], 88); groundLayer(c, 80, (t - L(65)) * 60, ["#4a3018", "#6a4a28", "#3a2410"]);
  rider(c, R(110 + ((t - L(65)) * 30) % 40), 84, t, { speed: 14, spear: true }, false, druzhSprite);
  knocked(c, 224, t, L(65) + 0.6 + Math.floor((t - L(65) - 0.6) / 1.4) * 1.4);
  c.restore();
}

// ---------- 12. «А где мой товарищ?» ----------
function sc12(c, t) {
  if (t < L(71) - 0.1) {
    hallBg(c, t);
    druzhAt(c, 20, t, "idle", false, COL.white); druzhAt(c, 320, t + 0.3, "idle", true, COL.white);
    olegAt(c, 168, t, "talk", Math.sin(t * 1.5) > 0, 1, 5);
    rect(c, 0, 128, LW, 22, "#6a4020"); rect(c, 0, 128, LW, 2, "#8a5a2a");
    if (t > L(67) + 0.3 && t < W("w_burn") - 0.3) floatText(c, "?", t, L(67) + 0.3 + Math.floor((t - L(67) - 0.3) / 0.9) * 0.9, 191, 70, "#ffe680");
    const fb = W("w_burn");
    if (t > fb - 0.4 && t < L(71) - 0.2) { // вспышка-воспоминание в пузыре
      bubble(c, 220, 16, 150, 62, 200, 76);
      c.save(); c.beginPath(); c.rect(224, 20, 142, 54); c.clip();
      skyBands(c, GOLDSKY, 80); groundLayer(c, 72, t * 60, ["#7a5020", "#9a6a30", "#5a3a18"]);
      rider(c, 250, 76, t, { speed: 14, noRider: true });
      c.restore();
    }
    return;
  }
  skyBands(c, NIGHT); stars(c, 21, 50, t); moon(c, 300, 40, 12); // холм под луной
  ell(c, 150, 170, 170, 70, "#141a2a"); ell(c, 150, 170, 150, 60, "#1a2236");
  for (let x = 20; x < 300; x += 6) rect(c, x + R(Math.sin(t * 2 + x) * 2), 112 + R(Math.abs(x - 150) * 0.25), 1, 5, "#2a3450");
  blit(c, skullSprite(), 136, 96);
  if (t > W("w_pochil")) ditherFade(c, clamp((t - W("w_pochil")) / 2) * 0.5);
}
