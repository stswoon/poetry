// ---------- Сцены: строфы 7–12 ----------
const olegFoot = (fr = 0, o = {}) => muzhikSprite(COL.red, fr, { hat: COL.steel, beard: "#a0603a", ...o });
const youth = (fr = 0) => muzhikSprite("#3a8a4a", fr, { beard: COL.skin, hat: "#6a4a2a" });
function hearts(c, x, y, t, t0) { for (let i = 0; i < 3; i++) { const u = ((t - t0) * 0.8 + i / 3) % 1; if (t < t0) continue; blit(c, heartIcon(true), R(x + Math.sin(u * 6 + i) * 6), R(y - u * 30)); } }

// ---------- 7. Конь в бою, квест ----------
function sc7(c, t) {
  if (t < L(39) - 0.1) { // гордый конь крупно
    bgSteppe(c, t, 400, DUSK, 100);
    big(c, riderSprite(Math.floor(t * 4) % 8, { idle: true, noRider: true }), 70, GROUND - 156, 2);
    return;
  }
  if (t < L(40) - 0.1) { // стоит смирно под стрелами
    bgSteppe(c, t, 420, DUSK, null);
    rider(c, 150, GROUND + 4, t, { noRider: true });
    for (let i = 0; i < 18; i++) { const t0 = L(39) - 0.2 + hash(i) * 1.8, x = R(40 + hash(i * 3) * 300), fl = clamp((t - t0) / 0.35); if (t < t0 || (x > 140 && x < 240)) continue; const y = R(lerp(TOP, GROUND + 2, fl)), xx = R(x - (1 - fl) * 40); line(c, xx, y, xx - 6, y - 10, "#c8b090"); rect(c, xx - 7, y - 12, 2, 3, "#e8e0c0"); }
    if (t > W("w_strel7")) floatText(c, "ПРОМАХ", t, W("w_strel7") + 0.2, 190, GROUND - 70, "#9fd8ff");
    return;
  }
  if (t < L(41) - 0.1) { // мчится по бранному полю
    const sc = (t - L(40)) * 140;
    bgSteppe(c, t, sc, ["#1a1010", "#3a1a14", "#6a2a18", "#a04020"], null);
    for (let i = 0; i < 4; i++) { const x = R(((i * 120 - sc * 0.5) % 480 + 480) % 480 - 40); for (let k = 0; k < 5; k++) ell(c, x + Math.sin(t + k) * 4, 120 - k * 14, 10 + k * 3, 5, "#3a2a2a"); }
    rider(c, 150, GROUND + 4, t, { speed: 16, spear: true });
    particlesDust(c, t * 2, 1);
    return;
  }
  if (t < W("quest")) { // холод и сеча
    bgSteppe(c, t, 500, NIGHT, null);
    for (let i = 0; i < 70; i++) { const x = R((hash(i) * LW + t * 30) % LW), y = R(TOP + (hash(i * 2) * 150 + t * 50) % 150); rect(c, x, y, 2, 2, "#e8f0ff"); }
    rider(c, 130, GROUND + 4, t, { speed: 14 });
    const sc0 = W("w_secha"); if (t > sc0 - 0.1) { blit(c, soldierSprite(1), 250, GROUND - 26, true); sparkle(c, 240, GROUND - 40, t, sc0 + 0.05); sparkle(c, 236, GROUND - 46, t, sc0 + 0.2); }
    return;
  }
  // квест: экран краснеет, окно «НОВЫЙ КВЕСТ» рисует main.js
  bgSteppe(c, t, 500, NIGHT, null);
  rider(c, 150, GROUND + 4, t, { noRider: true });
  wash(c, "#5a0810", 0.55);
}

// ---------- 8. Усмешка, спешивается, гладит коня ----------
function sc8(c, t) {
  if (t < L(45) - 0.1) {
    skyBands(c, DUSK);
    const dk = t > W("w_odnako") - 0.1;
    big(c, portrait2("oleg", 0, false, dk ? "dark" : t > W("w_usm") - 0.2 ? "smirk" : ""), 132, TOP + 10, 3);
    return;
  }
  bgSteppe(c, t, 600, DUSK, 320);
  if (t < W("w_slez")) { rider(c, 140, GROUND + 4, t, {}); return; }
  rider(c, 160, GROUND + 4, t, { noRider: true });
  const d = clamp((t - W("w_slez")) / 0.6);
  if (t < L(47) - 0.2) blit(c, olegFoot(0), R(lerp(170, 120, d)), R(lerp(GROUND - 70, GROUND - 26, d)));
  else { blit(c, olegFoot(0), 205, GROUND - 26); rect(c, 220, GROUND - 14 + R(Math.sin(t * 6) * 2), 6, 2, COL.skin); hearts(c, 222, GROUND - 60, t, W("w_glad")); }
}

// ---------- 9. Прощание ----------
function sc9(c, t) {
  if (t < L(51) - 0.1) {
    bgSteppe(c, t, 650, SUNSET, 192);
    big(c, olegFoot(0), 70, GROUND - 60 + 4, 2);
    big(c, riderSprite(Math.floor(t * 3) % 8, { idle: true, noRider: true }), 120, GROUND - 156 + 4, 2, true);
    return;
  }
  if (t < L(53) - 0.1) { // пустое золотое стремя
    skyBands(c, SUNSET); rect(c, 0, TOP, LW, 40, "#552e16"); rect(c, 0, TOP + 40, LW, 3, "#7c4a26");
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
    if (up > 0.5) floatText(c, "И-ГО-ГО!", t, W("w_pomni"), 230, 60, "#ffffff");
    blit(c, olegFoot(0), 110, GROUND - 26);
    return;
  }
  bgSteppe(c, t, 700, SUNSET, 300); // отроки бегут
  rider(c, 170, GROUND + 4, t, { noRider: true }, true);
  blit(c, olegFoot(0), 110, GROUND - 26);
  for (let i = 0; i < 2; i++) blit(c, youth(Math.floor(t * 8) % 2), R(lerp(400 + i * 30, 260 + i * 26, clamp((t - L(54) + 0.1) / 1.0))), GROUND - 26, true);
}

// ---------- 10. Попона, луг, вода, зерно, уход ----------
function sc10(c, t) {
  const greenGround = () => groundLayer(c, GROUND, 0, ["#3a6a2a", "#5a8a3a", "#2a5a1a"], "#7aaa4a");
  if (t < L(56) - 0.1) { // попона
    bgSteppe(c, t, 720, SUNSET, 300);
    rider(c, 150, GROUND + 4, t, { noRider: true });
    const d = springPop((t - W("w_popon") + 0.3) * 1.3);
    rect(c, 172, R(lerp(TOP, GROUND - 50, d)), 32, 14, "#8a2a8a"); rect(c, 172, R(lerp(TOP, GROUND - 50, d)) + 12, 32, 2, COL.gold);
    return;
  }
  if (t < L(57) - 0.1) { // ведут на луг
    skyBands(c, SUNSET); sun(c, 300, 104, 12); hillsLayer(c, 136, 6, 60, 1.1, "#2a4a2a", (t - L(56)) * 10); greenGround();
    const x = R(lerp(60, 200, clamp((t - L(56)) / 3)));
    rider(c, x, GROUND + 4, t, { speed: 7, noRider: true });
    blit(c, youth(Math.floor(t * 6) % 2), x + 76, GROUND - 26);
    return;
  }
  if (t < L(58) - 0.1) {
    if (t < W("w_korm") - 0.1) { // купание
      skyBands(c, SUNSET); greenGround(); rect(c, 0, GROUND - 6, LW, 30, "#2a5a8a");
      rider(c, 150, GROUND + 14, t, { noRider: true });
      rect(c, 0, GROUND + 2, LW, 20, "#2a5a8a"); for (let x = 0; x < LW; x += 10) rect(c, x + R(Math.sin(t * 3 + x) * 3), GROUND + 2, 5, 1, "#9ad8f0");
      for (let i = 0; i < 20; i++) { const u = (t * 1.5 + hash(i)) % 1; rect(c, R(170 + hash(i * 2) * 60), R(GROUND - Math.sin(u * Math.PI) * 30), 2, 2, "#c8f0ff"); }
    } else { // зерно
      skyBands(c, DUSK); rect(c, 120, 120, 144, 30, "#6a4020"); rect(c, 120, 118, 144, 3, "#8a5a2a");
      for (let i = 0; i < 80; i++) { const u = ((t - W("w_korm")) * 1.3 + hash(i)) % 1; const y = R(TOP + u * 108); if (y < 120) rect(c, R(170 + hash(i * 3) * 44), y, 1, 2, "#f0c060"); }
      ell(c, 192, 120, 60, R(4 + clamp(t - W("w_korm")) * 4), "#e8b040");
    }
    return;
  }
  if (t < L(59) - 0.1) { // ключевая вода
    bgForest(c, t, 200); rect(c, 60, 60, 70, 90, "#3a3a44"); rect(c, 66, 66, 60, 6, "#4a4a56");
    for (let i = 0; i < 4; i++) line(c, 130 + i, 90, 140 + i, 128, "#9ad8f0");
    rect(c, 128, 128, 40, 10, "#5a3a20");
    big(c, riderSprite(0, { idle: true, noRider: true }), 140, GROUND - 158 + 30, 2, true);
    return;
  }
  if (t < L(60) - 0.1) { // уходит в закат
    bgSteppe(c, t, 800, SUNSET, 260);
    const x = R(lerp(150, 400, clamp((t - L(59)) / 3.5)));
    rider(c, x, GROUND + 4, t, { speed: 7, noRider: true });
    blit(c, youth(Math.floor(t * 6) % 2), x - 20, GROUND - 26); blit(c, youth(Math.floor(t * 6 + 1) % 2), x + 72, GROUND - 26);
    blit(c, olegFoot(0), 60, GROUND - 26, true);
    toast(c, "КОНЬ ПОКИНУЛ ОТРЯД", t, W("leave"), 2.6, LW / 2, 24, "#e8302c");
    return;
  }
  bgSteppe(c, t, 820, DUSK, 260); // серый конь
  toast(c, "КОНЬ ПОКИНУЛ ОТРЯД", t, W("leave"), 2.6, LW / 2, 24, "#e8302c");
  const ent = clamp((t - W("w_drug") + 0.4) / 1.4);
  blit(c, greyHorse(ent < 1 ? Math.floor(t * 7) % 8 : 0, ent < 1 ? { walk: true } : { idle: true }), R(lerp(400, 190, ent)), GROUND - 72, true);
  blit(c, olegFoot(0), 100, GROUND - 26, true);
}

// ---------- 11. Пир: прошло много лет ----------
function hallBg(c, t, fireK = 1) {
  for (let y = TOP; y < 164; y += 8) { rect(c, 0, y, LW, 8, y % 16 ? "#3a2414" : "#4a2e18"); rect(c, 0, y + 7, LW, 1, "#2a180c"); }
  rect(c, 162, 70, 60, 50, "#2a1a10"); fire(c, 166, 120, 52, 40 * fireK, t);
}
function feasters(c, t, raise, white) {
  for (let i = 0; i < 6; i++) {
    const x = 20 + i * 60 + (i > 2 ? 30 : 0), fr = Math.floor(t * 2 + i) % 2;
    blit(c, muzhikSprite(["#2c54a8", COL.red, "#3a8a4a", "#6a2c90", "#8a6a3a", "#2c54a8"][i], fr, { beard: white ? COL.white : "#8a6a40", hat: white ? COL.white : "#6a4a2a" }), x, 118);
    const cy = R(132 - raise * 16 + Math.sin(t * 3 + i) * (raise > 0.5 ? 1 : 0));
    blit(c, cupSprite(true), x + 14, cy);
  }
  rect(c, 0, 146, LW, 18, "#6a4020"); rect(c, 0, 146, LW, 2, "#8a5a2a");
}
function sc11(c, t) {
  if (t < L(63) - 0.1) {
    hallBg(c, t);
    const zv = W("w_zvon"), raise = clamp((t - zv + 0.6) / 0.6);
    feasters(c, t, raise, false);
    if (t > zv) for (let i = 0; i < 6; i++) sparkle(c, 30 + i * 60 + (i > 2 ? 30 : 0), 116, t, zv + i * 0.05);
    return;
  }
  if (t < W("w_kurg") - 0.15) { hallBg(c, t, 0.8); feasters(c, t, 0.3, true); return; }
  if (t < L(65) - 0.1) { // курган в снегу
    skyBands(c, ["#3a4a6a", "#6a7a9a", "#a8b8d0", "#d8e0ec"]);
    ell(c, 192, 160, 150, 60, "#e8eef8"); ell(c, 192, 160, 120, 46, "#f4f8ff");
    for (let i = 0; i < 60; i++) { const x = R((hash(i) * LW + t * 20) % LW), y = R(TOP + (hash(i * 2) * 150 + t * 40) % 150); rect(c, x, y, 1, 1, "#ffffff"); }
    return;
  }
  hallBg(c, t, 1.6); // в огне минувшие битвы
  for (let i = 0; i < 3; i++) { const x = R(((i * 120 + (t - L(65)) * 70) % 300) + 40); c.save(); c.globalAlpha = 0.6; blit(c, recolor("shR", riderSprite(F(t + i, 12), {}), SHADOW), x, 52); c.restore(); }
}

// ---------- 12. «А где мой товарищ?» ----------
function sc12(c, t) {
  if (t < L(71) - 0.1) {
    hallBg(c, t, 0.9);
    big(c, olegFoot(Math.floor(t * 3) % 2), 166, 88, 2, Math.sin(t * 1.5) > 0); blit(c, cupSprite(true), 200, 128);
    rect(c, 0, 146, LW, 18, "#6a4020");
    const fb = W("w_burn");
    if (t > fb - 0.3 && t < L(71) - 0.3) { skyBands(c, GOLDSKY); groundLayer(c, GROUND, t * 60, ["#7a5020", "#9a6a30", "#5a3a18"]); rider(c, 150, GROUND + 4, t, { speed: 14, noRider: true }); wash(c, "#ffffff", 0.15); }
    return;
  }
  skyBands(c, NIGHT); stars(c, 21, 50, t); moon(c, 300, 40, 12); // холм под луной
  ell(c, 150, 170, 170, 70, "#141a2a"); ell(c, 150, 170, 150, 60, "#1a2236");
  for (let x = 20; x < 300; x += 6) rect(c, x + R(Math.sin(t * 2 + x) * 2), 112 + R(Math.abs(x - 150) * 0.25), 1, 5, "#2a3450");
  if (t > W("w_pochil")) ditherFade(c, clamp((t - W("w_pochil")) / 2) * 0.5);
}
