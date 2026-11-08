// ---------- Сцены: строфы 13–17, финал ----------
const olga = () => recolor("olga", princeSprite(false, 0, false, 0), { [COL.blue]: COL.red, [COL.blueD]: COL.redD, "#c49a50": COL.skin, [COL.purple]: "#e8e0c0", [COL.fur]: COL.white });
const igor = () => princeSprite(true, 0, false, 0);

function sc13(c, t) {
  if (t < L(75) - 0.1) { hallBg(c, t, 0.6); wash(c, "#0a0610", 0.35); big(c, portrait2("oleg", 0, false, "dark"), 132, TOP + 10 + R(clamp((t - W("w_ponik")) * 2) * 6), 3); return; }
  if (t < L(77) - 0.1) { // лицо кудесника в огне рассыпается
    const br = W("w_prezr") + 0.1, [dx, dy] = shakeXY(t, br, 4, 0.6);
    c.save(); c.translate(dx, dy); hallBg(c, t, 1.4);
    if (t < br) { c.save(); c.globalAlpha = 0.85; big(c, portrait2("kud", 0, false, "glow"), 132, TOP + 6, 3); c.restore(); wash(c, "#f08a20", 0.25); }
    else { const k = clamp((t - br) / 1.2); for (let i = 0; i < 60; i++) { const an = hash(i) * Math.PI * 2, d = k * (20 + hash(i * 2) * 160); rect(c, R(192 + Math.cos(an) * d), R(72 + Math.sin(an) * d + k * k * 60), 4, 4, i % 3 ? "#f08a20" : "#ffe680"); } }
    c.restore();
    if (t > br && t < br + 0.12) wash(c, "#ffffff", 0.6);
    return;
  }
  hallBg(c, t, 0.9); // встаёт
  const up = clamp((t - L(77) + 0.1) / 0.8);
  big(c, olegFoot(0), 162, R(lerp(120, 88, up)), 2);
  rect(c, 0, 146, LW, 18, "#6a4020");
  if (t > L(78) - 0.2) floatText(c, "!", t, L(78) - 0.2, 191, 100, "#ffe680");
}

function sc14(c, t) {
  const river = (sc) => { rect(c, 0, 118, LW, 20, "#3a6a9a"); for (let x = 0; x < LW; x += 12) rect(c, R(((x - sc * 0.6) % LW + LW) % LW), 122 + (x % 3) * 5, 6, 1, "#9ad8f0"); };
  if (t < L(81) - 0.1) { // вдоль Днепра
    const sc = (t - L(79)) * 34;
    skyBands(c, DUSK); sun(c, 320, 100, 10); hillsLayer(c, 116, 6, 80, 5, "#3a2a4a", sc * 0.2); river(sc);
    groundLayer(c, GROUND, sc, ["#4a4a2a", "#6a6a3a", "#3a3a20"], "#7a7a40");
    rider(c, 40, GROUND + 4, t + 0.4, { speed: 8 }, false, druzhSprite);
    blit(c, igor(), 140, GROUND - 46 + R(Math.sin(t * 6)));
    rider(c, 200, GROUND + 4, t, { speed: 8 });
    toast(c, "ЛОКАЦИЯ: ХОЛМ У ДНЕПРА", t, L(79) - 0.2, 2.6, LW / 2, 22);
    return;
  }
  skyBands(c, t < W("w_pyl") ? ["#141820", "#22283a", "#343c50", "#4a5068"] : DUSK);
  ell(c, 220, 172, 190, 66, "#2a2a1e"); ell(c, 220, 172, 170, 58, "#3a3a26");
  blit(c, bonesSprite(), 170, 110); blit(c, skullSprite(), 226, 104);
  if (t > L(83) - 0.3 && t < W("w_pyl")) for (let i = 0; i < 70; i++) { const x = R((hash(i) * LW + t * 40) % LW), y = R(TOP + (hash(i * 2) * 150 + t * 300) % 150); rect(c, x, y, 1, 5, "#8aa0c0"); }
  if (t > W("w_pyl") - 0.2 && t < W("w_veter")) for (let i = 0; i < 50; i++) { const x = R((hash(i) * LW + t * 120) % LW), y = R(80 + hash(i * 2) * 70); rect(c, x, y, 2, 1, "#c8a870"); }
  const wind = t > W("w_veter") - 0.3 ? 4 : 1.5;
  for (let x = 0; x < LW; x += 4) { const sw = R(Math.sin(t * 3 + x * 0.1) * wind); line(c, x, 164, x + sw, 146 + (x % 3) * 3, "#b8b088"); }
}

function bootLeg(c, x, footY) { // нога в сапоге, носок вправо; footY — подошва
  rect(c, x, TOP - 10, 22, footY - TOP - 4, "#5a1a1a"); rect(c, x + 2, TOP - 10, 3, footY - TOP - 4, "#7a2a2a");
  rect(c, x - 1, footY - 30, 24, 26, "#4a2a14"); poly(c, [[x + 23, footY - 14], [x + 40, footY - 8], [x + 42, footY], [x + 23, footY]], "#4a2a14");
  rect(c, x - 2, footY - 4, 46, 4, "#2a180c"); rect(c, x - 1, footY - 31, 24, 3, COL.gold); rect(c, x + 3, footY - 26, 2, 18, "#6a4020");
}
function sc15(c, t) {
  if (t < L(86) - 0.1) { // сапог на череп
    skyBands(c, DUSK); rect(c, 0, 120, LW, 44, "#2a2a1e");
    big(c, skullSprite(), 132, 98, 4);
    const d = clamp((t - L(85) + 0.3) / (W("w_nastup") - L(85) + 0.6));
    bootLeg(c, 176, R(lerp(TOP + 20, 104, d)));
    if (t > W("w_nastup") + 0.2 && t < W("w_nastup") + 0.4) wash(c, "#ffffff", 0.3);
    return;
  }
  if (t < L(88) - 0.1) { // говорит над черепом
    skyBands(c, DUSK); sun(c, 300, 110, 12); ell(c, 192, 176, 220, 60, "#2a2a1e");
    big(c, olegFoot(Math.floor(t * 3) % 2), 120, 72, 3);
    big(c, skullSprite(), 210, 140, 2);
    return;
  }
  skyBands(c, ["#1a0806", "#3a1008", "#6a200c", "#8a3010"]); // видение тризны
  fire(c, 170, 150, 44, 50, t);
  for (let i = 0; i < 6; i++) blit(c, soldierSprite(Math.floor(t * 2 + i) % 2), 40 + i * 56 + (i > 2 ? 40 : 0), GROUND - 26, i > 2);
  const sk = clamp((t - W("w_sekir") + 0.3) / 0.5);
  c.save(); c.translate(192, R(GROUND - 40 - sk * 40)); rect(c, -1, 0, 3, 50, "#5a3a20"); poly(c, [[2, 2], [18, -8], [22, 6], [18, 18], [2, 14]], "#c8d0dc"); rect(c, 3, 3, 10, 2, "#eef2f6"); c.restore();
}

function sc16(c, t) {
  const vs = W("w_vskr");
  if (t < L(93) - 0.1) { // хохочет над черепом
    skyBands(c, DUSK); ell(c, 192, 176, 220, 60, "#2a2a1e");
    big(c, portrait2("oleg", 1, false, "laugh"), 30, TOP + 14, 3);
    big(c, skullSprite(), 230, 120, 3);
    if (Math.floor(t * 5) % 2) floatText(c, "ХА-ХА!", t, Math.floor(t * 1.25) / 1.25, 200, 50, "#ffe680");
    return;
  }
  if (t < L(95) - 0.1) { // змея из глазницы — босс
    skyBands(c, NIGHT); rect(c, 0, 130, LW, 34, "#1a1a14");
    big(c, skullSprite(), 102, 64, 6);
    const k = clamp((t - W("w_zmiya") + 0.3) / 2.5);
    c.save(); c.beginPath(); c.rect(0, 0, 150, LH); c.clip(); snake(c, R(150 - k * 60), 100, t, -1, 26, 2); c.restore();
    toast(c, "БОСС: ЗМИЯ", t, W("boss"), 99, 290, 20, "#e8302c");
    if (t > W("boss")) { rect(c, 246, 38, 88, 6, "#120c14"); rect(c, 247, 39, 86, 4, "#e8302c"); }
    return;
  }
  if (t < vs + 0.05) { // обвивает сапог
    skyBands(c, NIGHT); rect(c, 0, 130, LW, 34, "#1a1a14");
    bootLeg(c, 172, 132);
    const k = clamp((t - L(95) + 0.1) / 1.5);
    for (let i = 0; i < 40 * k; i++) { const an = i * 0.45 + t * 2, x = R(185 + Math.cos(an) * 22), y = R(118 - i * 1.6 + Math.sin(an) * 5); if (Math.sin(an) > -0.2) rect(c, x, y, 5, 4, i % 4 ? "#1e2a1a" : "#6a7a50"); }
    toast(c, "БОСС: ЗМИЯ", t, W("boss"), 99, 290, 20, "#e8302c");
    rect(c, 246, 38, 88, 6, "#120c14"); rect(c, 247, 39, 86, 4, "#e8302c");
    return;
  }
  // бросок, вспышка, красный экран
  const [dx, dy] = shakeXY(t, vs, 5, 0.7);
  c.save(); c.translate(dx, dy); skyBands(c, NIGHT); rect(c, 0, 130, LW, 34, "#1a1a14"); bootLeg(c, 172, 132); snake(c, R(lerp(260, 200, clamp((t - vs) * 6))), 90, t, -1, 20, 2); c.restore();
  if (t < vs + 0.2) wash(c, "#ffffff", 1 - (t - vs) / 0.2);
  else wash(c, "#8a0810", clamp((t - vs - 0.2) / 0.5) * 0.8);
}
function scGameOver(c, t) {
  rect(c, 0, 0, LW, LH, "#000000");
  const k = clamp((t - W("gameoverV")) / 0.4);
  if (k > 0) centerText(c, "КОНЕЦ ИГРЫ", 90, Math.floor(t * 4) % 2 ? "#e8302c" : "#b01818", 3);
}

function sc17(c, t) {
  if (t < L(99) - 0.1) { // тризна: костры, ковши по кругу
    skyBands(c, DUSK); rect(c, 0, 118, LW, 16, "#3a5a8a"); groundLayer(c, 134, 0, ["#2a2418", "#3a3420", "#1e1a10"]);
    for (let i = 0; i < 3; i++) fire(c, 60 + i * 120, 150, 26, 26, t + i);
    for (let i = 0; i < 7; i++) blit(c, soldierSprite(Math.floor(t * 2 + i) % 2), 20 + i * 52, 124, i > 3);
    for (let i = 0; i < 4; i++) { const an = i / 4 * Math.PI * 2 + (t - L(97)) * 0.9, x = R(192 + Math.cos(an) * 120), y = R(118 + Math.sin(an) * 8); blit(c, cupSprite(true), x, y); if (Math.floor(t * 6 + i) % 2) rect(c, x + 3, y - 1, 8, 1, "#ffffff"); }
    ditherFade(c, clamp(1 - (t - L(97) + 0.15) / 0.6));
    return;
  }
  if (t < L(100) - 0.1) { // Игорь и Ольга на холме
    skyBands(c, SUNSET); sun(c, 192, 120, 16);
    ell(c, 192, 190, 200, 70, "#1a1420");
    blit(c, igor(), 160, 76); blit(c, olga(), 196, 78, true);
    return;
  }
  if (t < L(101) - 0.1) { // дружина у брега
    skyBands(c, DUSK); rect(c, 0, 112, LW, 16, "#3a5a8a"); groundLayer(c, 128, 0, ["#2a2418", "#3a3420", "#1e1a10"]);
    fire(c, 170, 150, 44, 34, t);
    for (let i = 0; i < 6; i++) blit(c, druzhSprite(0, { idle: true, noRider: false }), -20 + i * 70 - (i > 2 ? -30 : 0), 70, i > 2);
    return;
  }
  skyBands(c, NIGHT); stars(c, 33, 80, t); // призрак всадника в звёздах
  ell(c, 192, 200, 220, 70, "#0a0a14");
  c.save(); c.globalAlpha = 0.45 * clamp((t - L(101)) / 1.5); big(c, recolor("ghost", riderSprite(F(t, 6), { walk: true, spear: true }), Object.fromEntries(Object.keys(SHADOW).map((k) => [k, "#9fb8e8"]))), 100, 30, 2); c.restore();
}

function scFinal(c, t) {
  skyBands(c, NIGHT); stars(c, 41, 70, t); moon(c, 330, 104, 14);
  ell(c, 230, 216, 230, 60, "#0e0e20");
  rider(c, 200, 172, t, { spear: true });
  const k = springPop((t - W("fin")) * 1.2);
  centerText(c, "ПЕСНЬ О ВЕЩЕМ ОЛЕГЕ", R(30 - (1 - k) * 30), "#ffe680", 2);
  if (t > W("fin") + 0.5) centerText(c, "Александр Сергеевич Пушкин", 60, "#e8ecf8");
}
