// ---------- v3. Сцены: строфы 13–17, финал ----------
const olga = () => recolor("olga", princeSprite(false, 0, false, 0), { [COL.blue]: COL.red, [COL.blueD]: COL.redD, "#c49a50": COL.skin, [COL.purple]: "#e8e0c0", [COL.fur]: COL.white });
const igor = () => princeSprite(true, 0, false, 0);

// ---------- 13. Поник; гнев на кудесника; встаёт ----------
function sc13(c, t) {
  if (t < L(75) - 0.1) { // сидит за столом, голову повесил, тучка
    hallBg(c, t);
    olegAt(c, 90, t, "down");
    rect(c, 0, 128, LW, 22, "#6a4020"); rect(c, 0, 128, LW, 2, "#8a5a2a");
    rainCloud(c, 113, 66, t);
    if (t > W("w_ponik")) floatText(c, "…", t, W("w_ponik") + Math.floor((t - W("w_ponik")) / 0.9) * 0.9, 132, 76, "#c8d0f0");
    return;
  }
  if (t < L(77) - 0.1) { // гнев: кудесник в пузыре-мысли, Олег бьёт — пузырь лопается
    const br = W("w_prezr") + 0.1, [dx, dy] = shakeXY(t, br, 4, 0.6);
    c.save(); c.translate(dx, dy);
    hallBg(c, t);
    olegAt(c, 90, t, t > br - 0.25 && t < br + 0.3 ? "angry" : "talk", false, 1, 6);
    rect(c, 0, 128, LW, 22, "#6a4020"); rect(c, 0, 128, LW, 2, "#8a5a2a");
    if (t < br) { bubble(c, 196, 20, 92, 92, 140, 70); blit(c, kudBig(Math.floor(t * 3) % 2, { glow: true, up: Math.floor(t * 2) % 2 === 0 }), 222, 30); }
    else { const k = clamp((t - br) / 1.0); for (let i = 0; i < 50; i++) { const an = hash(i) * Math.PI * 2, d = k * (10 + hash(i * 2) * 120); rect(c, R(245 + Math.cos(an) * d), R(68 + Math.sin(an) * d + k * k * 40), 4, 4, i % 3 ? "#e8e0c0" : "#5a5a6e"); } floatText(c, "БАЦ!", t, br, 245, 50, "#ffe680"); }
    c.restore();
    if (t > br && t < br + 0.1) wash(c, "#ffffff", 0.6);
    return;
  }
  hallBg(c, t); // встаёт из-за стола и идёт к выходу
  const x = R(lerp(90, 330, clamp((t - L(78) + 0.4) / 2.8)));
  olegAt(c, x, t, t > L(78) - 0.4 ? "walk" : "idle", false, 1, 8);
  rect(c, 0, 128, LW, 22, "#6a4020"); rect(c, 0, 128, LW, 2, "#8a5a2a");
  if (t > L(78) - 0.4) floatText(c, "!", t, L(78) - 0.4, x + 23, 66, "#ffe680");
}

// ---------- 14. Выезд к Днепру, кости на холме ----------
function sc14(c, t) {
  const river = (sc) => { rect(c, 0, 118, LW, 20, "#3a6a9a"); for (let x = 0; x < LW; x += 12) rect(c, R(((x - sc * 0.6) % LW + LW) % LW), 122 + (x % 3) * 5, 6, 1, "#9ad8f0"); };
  if (t < L(81) - 0.1) { // вдоль Днепра
    const sc = (t - L(79)) * 40;
    skyBands(c, DUSK); sun(c, 320, 100, 10); hillsLayer(c, 116, 6, 80, 5, "#3a2a4a", sc * 0.2); river(sc);
    groundLayer(c, GROUND, sc, ["#4a4a2a", "#6a6a3a", "#3a3a20"], "#7a7a40");
    rider(c, 30, GROUND + 4, t + 0.4, { speed: 9 }, false, druzhSprite);
    blit(c, igor(), 136, GROUND - 46 + R(Math.sin(t * 8)));
    rider(c, 190, GROUND + 4, t, { speed: 9 });
    toast(c, "ЛОКАЦИЯ: ХОЛМ У ДНЕПРА", t, L(79) - 0.2, 2.6, LW / 2, 22);
    return;
  }
  skyBands(c, t < W("w_pyl") ? ["#141820", "#22283a", "#343c50", "#4a5068"] : DUSK);
  ell(c, 220, 172, 190, 66, "#2a2a1e"); ell(c, 220, 172, 170, 58, "#3a3a26");
  blit(c, bonesSprite(), 170, 110); blit(c, skullSprite(), 226, 104);
  if (t > L(81)) rider(c, R(lerp(-90, 30, clamp((t - L(81)) / 1.5))), GROUND + 4, t, clamp((t - L(81)) / 1.5) < 1 ? { speed: 8 } : {});
  if (t > L(83) - 0.3 && t < W("w_pyl")) for (let i = 0; i < 70; i++) { const x = R((hash(i) * LW + t * 40) % LW), y = R(TOP + (hash(i * 2) * 150 + t * 300) % 150); rect(c, x, y, 1, 5, "#8aa0c0"); }
  if (t > W("w_pyl") - 0.2 && t < W("w_veter")) for (let i = 0; i < 50; i++) { const x = R((hash(i) * LW + t * 120) % LW), y = R(80 + hash(i * 2) * 70); rect(c, x, y, 2, 1, "#c8a870"); }
  const wind = t > W("w_veter") - 0.3 ? 4 : 1.5;
  for (let x = 0; x < LW; x += 4) { const sw = R(Math.sin(t * 3 + x * 0.1) * wind); line(c, x, 164, x + sw, 146 + (x % 3) * 3, "#b8b088"); }
}

// ---------- 15. Наступил на череп; говорит; видение тризны ----------
function bootLeg(c, x, footY) {
  rect(c, x, TOP - 10, 22, footY - TOP - 4, "#3a3450"); rect(c, x + 2, TOP - 10, 3, footY - TOP - 4, "#4a4466");
  rect(c, x - 1, footY - 30, 24, 26, "#5a3a20"); poly(c, [[x + 23, footY - 14], [x + 40, footY - 8], [x + 42, footY], [x + 23, footY]], "#5a3a20");
  rect(c, x - 2, footY - 4, 46, 4, "#2a180c"); rect(c, x - 1, footY - 31, 24, 3, COL.gold); rect(c, x + 3, footY - 26, 2, 18, "#7a5030");
}
function hillTop(c) { skyBands(c, DUSK); sun(c, 330, 110, 12); ell(c, 192, 182, 230, 52, "#2a2a1e"); }
function sc15(c, t) {
  if (t < L(86) - 0.1) { // сапог на череп крупно
    skyBands(c, DUSK); rect(c, 0, 120, LW, 44, "#2a2a1e");
    big(c, skullSprite(), 132, 98, 4);
    const d = clamp((t - L(85) + 0.3) / (W("w_nastup") - L(85) + 0.6));
    bootLeg(c, 176, R(lerp(TOP + 20, 104, d)));
    if (t > W("w_nastup") + 0.2 && t < W("w_nastup") + 0.35) wash(c, "#ffffff", 0.3);
    return;
  }
  if (t < L(88) - 0.1) { // говорит над черепом — Олег крупно, человечком
    hillTop(c);
    olegAt(c, 90, t, "talk", false, 2, 4);
    big(c, skullSprite(), 196, GROUND - 26, 2);
    return;
  }
  skyBands(c, ["#1a0806", "#3a1008", "#6a200c", "#8a3010"]); // видение тризны
  fire(c, 90, 150, 44, 50, t);
  for (let i = 0; i < 5; i++) blit(c, soldierSprite(Math.floor(t * 2 + i) % 2, { spear: false }), 20 + i * 70 + (i > 1 ? 120 : 0), GROUND - 26, i > 1);
  const sk = clamp((t - W("w_sekir") + 0.3) / 0.5), wx = 230; // воин поднимает секиру над головой
  blit(c, soldierSprite(0, { spear: false }), wx, GROUND - 26);
  const hx = wx + 14, hy = GROUND - 14 - R(sk * 14);
  line(c, wx + 12, GROUND - 16, hx, hy, "#26222e", 2);
  c.save(); c.translate(hx, hy); c.rotate(-0.3 - sk * 0.5); rect(c, -1, -40, 3, 44, "#5a3a20"); poly(c, [[2, -40], [16, -48], [20, -36], [16, -26], [2, -30]], "#c8d0dc"); rect(c, 3, -38, 9, 2, "#eef2f6"); c.restore();
}

// ---------- 16. Босс: змея растёт и кусает ----------
const BITES = ["bite1", "bite2", "bite4"];
const OLEG_X = 60; // Олег крупно ×2: x..x+92
function snakeState(t) {
  const g1 = W("w_zmiya") + 0.6, g2 = L(94) + 0.4; // рост ступенями со вспышкой
  const sc = t < g1 ? 1 : t < g2 ? 2 : 3;
  let lunge = 0, open = Math.sin(t * 6) > 0.3 ? 0.4 : 0;
  for (const b of BITES) { const u = t - W(b); if (u > -0.25 && u < 0.35) { lunge = u < 0 ? 1 + u / 0.25 : 1 - u / 0.35; open = u < -0.05 ? 1 : 0; } }
  return { sc, lunge: smooth(clamp(lunge)), open, flashes: [g1, g2] };
}
function heartsLeft(t) { let h = 5; if (t > W("bite1")) h -= 1; if (t > W("bite2")) h -= 2; if (t > W("bite4")) h -= 2; return h; }
function sc16(c, t) {
  if (t < L(93) - 0.1) { // хохочет над черепом
    hillTop(c);
    olegAt(c, OLEG_X, t, "laugh", false, 2, 3);
    big(c, skullSprite(), 210, GROUND - 26, 2);
    if (Math.floor(t * 4) % 2) floatText(c, "ХА-ХА!", t, Math.floor(t * 1.25) / 1.25, 196, 44, "#ffe680");
    return;
  }
  const S = snakeState(t);
  let dx = 0, dy = 0; for (const b of BITES) { const s = shakeXY(t, W(b), 5, 0.4); dx += s[0]; dy += s[1]; }
  c.save(); c.translate(dx, dy);
  skyBands(c, NIGHT); stars(c, 51, 30, t, 60); ell(c, 192, 182, 230, 52, "#1a1a14");
  const skx = 250, sky = GROUND - 26;
  big(c, skullSprite(), skx, sky, 2);
  const hs = S.sc, hw = 52 * hs, hh = 40 * hs;
  const len = clamp((t - W("w_zmiya") + 0.6) / 0.8);
  const restX = lerp(skx + 10, 330 - hw, clamp((hs - 1) / 2)), restY = lerp(sky - 4, 84 - hh * 0.5, clamp((hs - 1) / 2));
  const hx = R(lerp(restX, OLEG_X + 30, S.lunge)), hy = R(lerp(restY, 40, S.lunge) + Math.sin(t * 3) * 3);
  const ex = skx + 16, ey = sky + 12, pts = [];
  for (let i = 0; i < 30; i++) { const u = (i / 29) * len; pts.push([lerp(hx + hw * 0.8, ex, u) + Math.sin(u * 9 + t * 4) * 6 * hs, lerp(hy + hh * 0.6, ey, u) + Math.cos(u * 7 + t * 3) * 4]); }
  if (t > L(95) - 0.1) { const k = clamp((t - L(95) + 0.1) / 0.8); for (let i = 0; i < 22 * k; i++) { const an = i * 0.5 + t * 2; pts.push([OLEG_X + 46 + Math.cos(an) * 26, GROUND - 14 - i * 1.4 + Math.sin(an) * 6]); } }
  if (len > 0) snakeBody(c, pts, 3 + 2 * hs);
  const hurt = BITES.some((b) => t - W(b) > -0.02 && t - W(b) < 0.45);
  if (t > W("bite4") + 0.2) { c.save(); c.translate(OLEG_X + 46, GROUND); c.rotate(-clamp((t - W("bite4") - 0.2) / 0.5) * 1.4); big(c, olegStand("hurt", 0), -46, -138, 2); c.restore(); }
  else olegAt(c, OLEG_X, t, hurt ? "hurt" : "idle", false, 2, 2);
  if (len > 0) big(c, snakeHead(S.open), hx, hy, hs);
  for (const b of BITES) { if (t > W(b) && t < W(b) + 0.12) wash(c, "#e8302c", 0.45); floatText(c, b === "bite1" ? "-1" : "-2", t, W(b), OLEG_X + 4, 40, "#ff6a6a"); }
  for (const f of S.flashes) if (t > f && t < f + 0.1) wash(c, "#ffffff", 0.5);
  c.restore();
  toast(c, "БОСС: ЗМИЯ", t, W("boss"), 1.4, 300, 104, "#e8302c"); // дальше имя и полоса жизни — в HUD
  if (t > W("bite4")) wash(c, "#8a0810", clamp((t - W("bite4") - 0.3) / 0.6) * 0.75);
}
function scGameOver(c, t) {
  rect(c, 0, 0, LW, LH, "#000000");
  const k = clamp((t - W("gameoverV")) / 0.4);
  if (k > 0) centerText(c, "КОНЕЦ ИГРЫ", 90, Math.floor(t * 4) % 2 ? "#e8302c" : "#b01818", 3);
}

// ---------- 17. Тризна плачевная ----------
function sc17(c, t) {
  if (t < L(99) - 0.1) { // ковш передают из рук в руки по ряду
    skyBands(c, DUSK); rect(c, 0, 110, LW, 16, "#3a5a8a"); groundLayer(c, 126, 0, ["#2a2418", "#3a3420", "#1e1a10"]);
    firePit(c, 320, t, 0.9);
    const xs = [24, 66, 108, 150, 192];
    const u = Math.max(0, (t - L(97)) / 1.0), n = xs.length, cyc = 2 * (n - 1);
    const step = Math.floor(u), f = u - step, at = (q) => { q %= cyc; return q < n ? q : cyc - q; };
    const a = at(step), b = at(step + 1);
    xs.forEach((x, i) => druzhAt(c, x, t + i, i === a || (f > 0.5 && i === b) ? "talk" : "idle", false, COL.white));
    const hand = (i) => xs[i] + 36, drink = f < 0.5;
    const kx = R(drink ? hand(a) : lerp(hand(a), hand(b), smooth((f - 0.5) / 0.5))), ky = R(drink ? GROUND - 52 - Math.sin(f * Math.PI * 2) * 4 : GROUND - 42);
    blit(c, kovsh(), kx - 9, ky);
    if (Math.floor(t * 8) % 2) { rect(c, kx - 5, ky + 1, 2, 1, "#ffffff"); rect(c, kx + 2, ky, 1, 1, "#ffffff"); }
    ditherFade(c, clamp(1 - (t - L(97) + 0.15) / 0.6));
    return;
  }
  if (t < L(100) - 0.1) { // Игорь и Ольга на холме
    skyBands(c, SUNSET); sun(c, 192, 120, 16);
    ell(c, 192, 190, 200, 70, "#1a1420");
    blit(c, igor(), 160, 84); blit(c, olga(), 196, 86, true); // сидят на бревне
    rect(c, 150, 118, 86, 10, "#3a2414"); rect(c, 150, 118, 86, 2, "#5a3a20"); disc(c, 150, 123, 5, "#5a3a20"); disc(c, 150, 123, 2, "#3a2414");
    return;
  }
  if (t < L(101) - 0.1) { // дружина у брега
    skyBands(c, DUSK); rect(c, 0, 112, LW, 16, "#3a5a8a"); groundLayer(c, 128, 0, ["#2a2418", "#3a3420", "#1e1a10"]);
    firePit(c, 192, t);
    [0, 64, 256, 320].forEach((x, i) => druzhAt(c, x, t + i, i % 2 ? "talk" : "idle", i > 1, COL.white));
    return;
  }
  skyBands(c, NIGHT); stars(c, 33, 80, t); groundLayer(c, 128, 0, ["#1a1810", "#2a2618", "#12100a"]); // поминают: пузырь-воспоминание
  firePit(c, 192, t);
  [0, 64, 256, 320].forEach((x, i) => druzhAt(c, x, t + i, "idle", i > 1, COL.white));
  bubble(c, 96, 16, 192, 66, 192, 100);
  c.save(); c.beginPath(); c.rect(100, 20, 184, 58); c.clip();
  skyBands(c, ["#5a2010", "#8a3a18", "#c86a28"], 84); groundLayer(c, 76, (t - L(101)) * 60, ["#4a3018", "#6a4a28", "#3a2410"]);
  rider(c, 120, 80, t, { speed: 14, spear: true }); rider(c, 40, 80, t + 0.3, { speed: 14, spear: true }, false, druzhSprite);
  c.restore();
}

function scFinal(c, t) {
  skyBands(c, NIGHT); stars(c, 41, 70, t); moon(c, 330, 104, 14);
  ell(c, 230, 216, 230, 60, "#0e0e20");
  rider(c, 200, 172, t, { spear: true });
  const k = springPop((t - W("fin")) * 1.2);
  centerText(c, "ПЕСНЬ О ВЕЩЕМ ОЛЕГЕ", R(30 - (1 - k) * 30), "#ffe680", 2);
  if (t > W("fin") + 0.5) centerText(c, "Александр Сергеевич Пушкин", 60, "#e8ecf8");
}
