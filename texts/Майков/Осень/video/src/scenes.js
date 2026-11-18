// ---------- Сцены «Осени». Время — из сборки: L(n) начало строки, LE(n) конец, W("слово") ----------
const HY = GY + 3; // линия подошв героя в буфере

// --- общие помощники ---
// дорожка героя: ключи [t, x]; между ключами — равномерный бег
function track(t, keys) {
  if (t <= keys[0][0]) return { x: keys[0][1], v: 0 };
  for (let i = 0; i + 1 < keys.length; i++) {
    const [t0, x0] = keys[i], [t1, x1] = keys[i + 1];
    if (t < t1) return { x: lerp(x0, x1, (t - t0) / (t1 - t0)), v: (x1 - x0) / (t1 - t0) };
  }
  return { x: keys[keys.length - 1][1], v: 0 };
}
function forest(b, t, o) {
  o.t = t;
  drawSky(b, o); drawFar(b, o); drawMid(b, o); drawNear(b, o); drawGround(b, o);
}
// вылет листьев из точки (x, y мира) с момента t0: фонтан с гравитацией
function burst(b, x, y, t0, t, n, seed, power) {
  const u = t - t0;
  if (u < 0 || u > 2.4) return;
  const pw = power || 1;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (hash(seed + i * 1.3) - 0.5) * 2.2, v = (40 + hash(seed + i * 2.9) * 60) * pw;
    const px0 = x + Math.cos(a) * v * u + Math.sin(u * 6 + i) * 3, py = y + Math.sin(a) * v * u + 70 * u * u;
    if (py > y + 2) continue;
    const col = LEAFC[(i + seed) % LEAFC.length];
    if (((u * 8 + i) | 0) % 2) rect(b, px0, py, 2, 1, col); else rect(b, px0, py, 1, 2, col);
  }
}
// нота ♪ (в буфере мира)
function note(b, x, y, col) {
  x = R(x); y = R(y);
  rect(b, x + 2, y, 1, 6, "#2a1a10"); rect(b, x - 1, y + 4, 4, 3, "#2a1a10");
  rect(b, x + 2, y + 1, 1, 4, col); rect(b, x, y + 5, 2, 1, col); px(b, x + 3, y + 1, col); px(b, x + 4, y + 2, col);
}
function heart(b, x, y, col) {
  x = R(x); y = R(y);
  rect(b, x, y, 2, 1, col); rect(b, x + 3, y, 2, 1, col); rect(b, x - 1, y + 1, 7, 1, col); rect(b, x, y + 2, 5, 1, col); rect(b, x + 1, y + 3, 3, 1, col); px(b, x + 2, y + 4, col);
}
function notesFrom(b, x, y, t0, t, n, seed) {
  for (let i = 0; i < n; i++) {
    const st = t0 + i * 0.22, u = t - st;
    if (u < 0 || u > 1.6) continue;
    const side = i % 2 ? 1 : -1;
    note(b, x + side * (6 + u * 26 + hash(seed + i) * 8), y - u * 34 + Math.sin(u * 9 + i) * 2, ["#ffffff", "#ffd23f", "#ff9ad0", "#9ae0ff"][i % 4]);
  }
}
function bubble(b, x, y, w, h, tailX) { // облачко мысли/речи
  rect(b, x - 1, y, w + 2, h, "#2a1a10"); rect(b, x, y - 1, w, h + 2, "#2a1a10");
  rect(b, x, y, w, h, "#ffffff");
  rect(b, tailX, y + h, 2, 2, "#ffffff"); px(b, tailX - 1, y + h + 1, "#2a1a10"); px(b, tailX + 2, y + h, "#2a1a10"); px(b, tailX, y + h + 2, "#2a1a10");
}
// крупная экранная надпись-звук («ХРУСЬ!») над точкой мира
function sfxText(g, word, wx, wy, t0, t, col) {
  const u = t - t0;
  if (u < 0 || u > 0.9) return;
  const k = springPop(u * 2.2), [sx, sy] = scr(wx, wy);
  const sc = R(lerp(2, 5, clamp(k)));
  const w = textWidth(word) * sc;
  g.globalAlpha = clamp((0.9 - u) / 0.25);
  drawText(g, word, R(sx - w / 2), R(sy - 40 - u * 50), col || "#ffffff", sc, { edge: "#2a1206", shadow: "#2a1206" });
  g.globalAlpha = 1;
}
// куча листьев: холмик из листьев-пикселей, k 0…1 — насколько насыпана
function leafPile(b, x, y, w, h, k) {
  if (k <= 0) return;
  const hh = h * k;
  for (let j = 0; j < hh; j++) {
    const half = w * Math.sqrt(Math.max(0, 1 - ((hh - j) / hh) ** 2));
    for (let i = -half; i < half; i += 2) {
      const hs = hash(R(i) * 7.1 + j * 13.3);
      rect(b, x + i, y - j, 2, 1, LEAFC[Math.floor(hs * LEAFC.length)]);
      if (hs > 0.85) px(b, x + i + 1, y - j - 1, "#ffe78a");
    }
  }
}
// облачко-мечта над героем: рисунок внутри, потом красный крест и облачко лопается
// облачко мысли: овал с тёмной каймой и два кружка-«хвоста» к голове героя (hx, hy)
function thought(b, x, y, w, h, hx, hy) {
  const cx = x + w / 2, cy = y + h / 2;
  ell(b, cx, cy, w / 2 + 2, h / 2 + 2, "#2a1a10"); ell(b, cx, cy, w / 2 + 1, h / 2 + 1, "#ffffff");
  for (let k = 0; k < 5; k++) { const a = k * TAU / 5 + 0.3; disc(b, cx + Math.cos(a) * w * 0.42, cy + Math.sin(a) * h * 0.42, 5, "#ffffff"); }
  for (const [u, r] of [[0.45, 2.6], [0.75, 1.8]]) { const qx = lerp(hx, cx, 1 - u), qy = lerp(hy, cy + h / 2, 1 - u); disc(b, qx, qy, r + 1, "#2a1a10"); disc(b, qx, qy, r, "#ffffff"); }
}
function dreamBubble(b, x, y, t, t0, tX, t1, draw, hx, hy) {
  if (t < t0 || t > t1) return;
  const k = springPop((t - t0) * 2.2), pop = prog(t, t1 - 0.25, t1);
  const yy = R(y + (1 - clamp(k)) * 8);
  if (pop > 0) { for (let i = 0; i < 10; i++) { const a = i * TAU / 10; px(b, x + 18 + Math.cos(a) * (8 + pop * 14), yy + 10 + Math.sin(a) * (5 + pop * 8), "#ffffff"); } return; }
  thought(b, x, yy, 36, 22, hx, hy);
  draw(b, x, yy);
  if (t > tX) {
    const u = clamp((t - tX) / 0.25);
    for (let i = 0; i < 18 * u; i++) { rect(b, x + 4 + i * 1.6, yy + 2 + i, 3, 2, "#e8303a"); rect(b, x + 32 - i * 1.6, yy + 2 + i, 3, 2, "#e8303a"); }
  }
}
function heroAt(b, x, P, dir, t) { heroShadow(b, x, HY, P.lift || 0); drawHero(b, x, HY, P, dir, t); }

// счётчик листьев в HUD: копится от ковра, топота, бега и пинка
function leavesAt(t) {
  let n = 0;
  n += R(36 * smooth(prog(t, L(1), LE(2))));
  n += R(14 * prog(t, W("topchu"), W("topchu") + 0.5));
  n += R(30 * prog(t, L(6), LE(7)));
  n += R(84 * prog(t, W("zagreb"), W("zagreb") + 1.2));
  n += R(40 * prog(t, L(21), LE(21))) + R(55 * prog(t, L(33), LE(33))) + R(99 * prog(t, L(36), LE(36)));
  return Math.min(999, n);
}
const GONE = () => [W("oreh") + 0.35, W("cvetok") + 0.15, W("gruzd") + 0.45, W("kistey") + 0.3];
const hudGame = (t, extra) => Object.assign({ leaves: leavesAt(t), secrets: t > L(9) - 0.2, gone: GONE() }, extra || {});

// ===================== 0–1. Титр и первая строфа: лист кроет землю, герой топает =====================
function sc1(b, t) {
  const tStop = L(1) + 0.9;
  const cam = 20 + Math.min(t, tStop) * 9;
  const cover = lerp(0.25, 0.95, smooth(prog(t, L(1), LE(2) + 0.3)));
  const wet = lerp(1, 0.55, prog(t, L(1), LE(2)));
  const glint = between(t, W("veshn") - 0.1, LE(4)) ? Math.sin(Math.PI * prog(t, W("veshn") - 0.1, LE(4))) : 0;
  forest(b, t, { cam, cover, wet, springGlint: glint });
  // герой выбегает слева, тормозит и стоит, на «топчу» — два топота
  const camStop = 20 + tStop * 9;
  const tr = track(t, [[2.0, 20 + 2.0 * 9 - 40], [tStop, camStop + 130], [L(5) + 0.4, camStop + 130]]);
  const hx = tr.x - cam; // после остановки и камера, и герой стоят: земля под ним не едет
  let P, dir = 1;
  if (t < L(1) + 0.9) P = poseRun(tr.x, t);
  else if (between(t, W("topchu") - 0.15, W("topchu") + 1.1)) P = poseStomp(((t - W("topchu") + 0.15) / 0.62) % 1);
  else if (between(t, L(2) - 0.2, LE(2))) P = poseLookUp(prog(t, L(2) - 0.2, L(2) + 0.3) - prog(t, LE(2) - 0.4, LE(2)));
  else P = poseStand(t);
  if (t >= 2.0) heroAt(b, hx, P, dir, t);
  // топот: листья подпрыгивают
  burst(b, hx + 4, HY - 1, W("topchu") + 0.22, t, 18, 11, 0.7);
  burst(b, hx + 4, HY - 1, W("topchu") + 0.84, t, 18, 23, 0.7);
  // «Вешнюю леса красу»: облачко мысли — весенняя ветка зеленеет и желтеет
  const bt0 = W("veshn") - 0.1, bt1 = LE(4) + 0.2;
  if (between(t, bt0, bt1)) {
    const k = springPop((t - bt0) * 2), y0 = R(HY - 58 + (1 - k) * 10);
    thought(b, hx + 10, y0, 34, 20, hx + 4, HY - 30);
    const fade = prog(t, W("krasu"), W("krasu") + 0.6);
    line(b, hx + 13, y0 + 15, hx + 41, y0 + 6, PAL.bark, 1);
    for (let i = 0; i < 6; i++) {
      const lx = hx + 16 + i * 4.4, ly = y0 + 12 - i * 1.4 + (i % 2 ? -2 : 2);
      const col = mix(i % 2 ? "#5aa844" : "#86c85a", i % 2 ? "#e8901a" : "#ffd23f", fade);
      const drop = fade > 0.6 ? (fade - 0.6) * 30 * (0.5 + hash(i)) : 0;
      if (y0 + drop < y0 + 18) rect(b, lx, ly + drop, 3, 2, col);
    }
  }
  drawFalling(b, { t, cam }, lerp(10, 46, prog(t, 0.2, L(1) + 0.5)) | 0, { yOff: 0 });
  const zoomIn = smooth(prog(t, L(2) - 0.3, L(2) + 0.6)), punch = between(t, W("topchu"), W("topchu") + 1.4) ? 0.25 * springSoft((t - W("topchu")) * 2) : 0;
  return {
    zoom: 1 + smooth(prog(t, L(1) - 0.3, L(1) + 0.6)) * 0.3 + zoomIn * 0.25 + punch, fx: hx + 10, fy: HY - 26, shake: (between(t, W("topchu") + 0.22, W("topchu") + 0.32) || between(t, W("topchu") + 0.84, W("topchu") + 0.94)) ? 0.5 : 0,
    hud: t > L(1) - 0.3 ? hudGame(t) : { hidden: true }, band: { cam },
    screen: (g, tt) => {
      sfxText(g, "ТОП!", hx + 18, HY - 18, W("topchu") + 0.22, tt, "#ffd23f");
      sfxText(g, "ТОП!", hx + 24, HY - 30, W("topchu") + 0.84, tt, "#ffd23f");
    },
    over: (g, tt) => { // титр
      if (tt > L(1) + 0.4) return;
      const out = smooth(prog(tt, L(1) - 0.35, L(1) + 0.4));
      const y = R(130 - out * 700);
      drawTitle(g, "ОСЕНЬ", 960, y, 18, tt, 0.25);
      const ka = springPop((tt - 1.1) * 1.4);
      if (ka > 0) {
        const s = "Аполлон Николаевич Майков", w = textWidth(s) * 5;
        g.globalAlpha = clamp(ka);
        drawText(g, s, R((1920 - w) / 2), y + 230 + R((1 - ka) * 40), "#fff6e0", 5, { edge: "#2a1206", shadow: "#2a1206" });
        const yr = "1856", w2 = textWidth(yr) * 4;
        drawText(g, yr, R((1920 - w2) / 2), y + 310, "#ffd23f", 4, { edge: "#2a1206", shadow: "#2a1206" });
        g.globalAlpha = 1;
      }
    },
  };
}

// ===================== 2. «С холоду щёки горят… Листья ногой загребать!» =====================
function sc2(b, t) {
  const t0 = L(5) - 0.15;
  // герой стоит (крупно лицо), потом разгоняется
  const runStart = L(6) - 0.1;
  const hxW = 400 + (t > runStart ? (t - runStart) * 55 : 0);
  const kickT = W("zagreb") - 0.1;
  const stopT = kickT - 0.25;
  const xStop = 400 + (stopT - runStart) * 55;
  const hx = t < stopT ? hxW : xStop;
  const cam = hx - 120;
  // ветки под ногами на «сучья» и «трещат»: положены туда, куда наступит герой
  const twigs = [W("suchya"), W("treshch"), W("treshch") + 0.35].map((tw) => 400 + (tw - runStart) * 55 + 3);
  forest(b, t, { cam, cover: 0.95, wet: 0.5 });
  twigs.forEach((x, i) => twig(b, x - cam, HY - 1, t > [W("suchya"), W("treshch"), W("treshch") + 0.35][i]));
  let P;
  if (t < runStart) P = poseStand(t), P.blush = 1, P.mouth = "o";
  else if (t < stopT) P = poseRun(hx, t, 1.1);
  else if (t < kickT + 1.0) P = poseKick(prog(t, kickT - 0.1, kickT + 0.7));
  else P = poseStand(t);
  heroAt(b, hx - cam, P, 1, t);
  // пар изо рта и румянец
  if (t < runStart + 0.3) {
    for (let i = 0; i < 3; i++) {
      const u = ((t - t0) * 1.2 + i / 3) % 1;
      c_puff(b, hx - cam + 6 + u * 10, HY - 24 - u * 4, 1 + u * 1.5, 1 - u);
    }
  }
  burst(b, hx - cam + 8, HY - 2, kickT + 0.25, t, 60, 37, 1.3);
  drawFalling(b, { t, cam }, 24);
  // «ХРУСЬ!»
  const z = t < runStart ? 3.2 : lerp(3.2, 1.4, smooth(prog(t, runStart, runStart + 0.6)));
  const kz = between(t, kickT, kickT + 1.4) ? 0.35 * Math.sin(Math.PI * prog(t, kickT, kickT + 1.4)) : 0;
  return {
    zoom: z + kz, fx: hx - cam + 2, fy: t < runStart + 0.3 ? HY - 22 : HY - 30,
    hud: hudGame(t), band: { cam },
    screen: (g, tt) => {
      sfxText(g, "ХРУСЬ!", twigs[0] - cam, HY - 6, W("suchya") + 0.05, tt, "#ffffff");
      sfxText(g, "ТРЕСК!", twigs[1] - cam, HY - 6, W("treshch") + 0.05, tt, "#ffffff");
      sfxText(g, "ШУРХ!", hx - cam + 14, HY - 10, kickT + 0.3, tt, "#ffd23f");
      // линии скорости на бегу
      if (between(tt, runStart + 0.3, stopT)) {
        g.fillStyle = "rgba(255,255,255,0.55)";
        for (let i = 0; i < 9; i++) { const y = 140 + i * 80 + R(hash(i) * 40), x = ((i * 377 - tt * 2400) % 2300 + 2300) % 2300 - 200; g.fillRect(R(x / SC) * SC, R(y / SC) * SC, 180 + i * 10, SC); }
      }
    },
  };
}
function c_puff(b, x, y, r, a) { b.globalAlpha = clamp(a) * 0.9; disc(b, x, y, r, "#f4f8ff"); b.globalAlpha = 1; }

// ===================== 3. «Нет мне здесь прежних утех!… Свянул последний цветок» =====================
function sc3(b, t) {
  const bare = smooth(prog(t, W("tainu") - 0.2, LE(10) + 0.2)) * 0.88;
  const hazelX = 230, flowerX = 300;
  const tr = track(t, [[L(9) - 0.3, 120], [L(11) - 0.1, 120], [W("sorvan") + 0.05, hazelX - 10], [LE(11) + 0.1, hazelX - 10], [L(12) + 0.25, flowerX - 14], [99, flowerX - 14]]);
  const cam = clamp(tr.x - 120, 0, 140);
  forest(b, t, { cam, cover: 0.95, bare });
  hazel(b, hazelX - cam, HY - 1, { bareBush: bare > 0.5 }, 0);
  // орех: прыжок, встряска куста, падает пустая скорлупка
  const jT = W("sorvan") + 0.1;
  const jk = prog(t, jT, jT + 0.55);
  const shakeX = between(t, jT + 0.25, jT + 0.9) ? Math.sin(t * 60) * 1.2 : 0;
  if (shakeX) hazel(b, hazelX - cam + shakeX, HY - 1, { bareBush: true }, 0);
  if (t > jT + 0.35) { const u = t - jT - 0.35, y = Math.min(HY - 2, HY - 26 + 60 * u * u); rect(b, hazelX - cam + 3, y, 3, 2, "#8a6a3a"); px(b, hazelX - cam + 4, y - 1, "#6a8a3a"); }
  // цветок вянет
  const wilt = smooth(prog(t, W("svyanul"), W("cvetok") + 0.4));
  flower(b, flowerX - cam, HY - 1, "aster", wilt);
  if (wilt > 0.3) for (let i = 0; i < 4; i++) { const u = t - W("svyanul") - 0.3 - i * 0.12; if (u > 0 && u < 1) px(b, flowerX - cam + 3 + i + u * 6, HY - 6 + u * 6, "#a85ad8"); }
  let P;
  if (between(t, jT, jT + 0.55)) P = poseJump(jk, t);
  else if (tr.v > 1) P = poseRun(tr.x, t);
  else if (between(t, W("net") - 0.1, W("net") + 0.8)) P = poseShrug(prog(t, W("net") - 0.1, W("net") + 0.3));
  else if (between(t, W("net") + 0.8, LE(9) + 0.2)) { P = poseStand(t); P.mouth = "o"; P.tilt = 0.3; } // оглядывается: где же?
  else if (between(t, L(10), LE(10) + 0.2)) P = poseLookUp(prog(t, L(10), L(10) + 0.4));
  else if (t > L(12) + 0.25) P = poseCrouch(prog(t, L(12) + 0.25, L(12) + 0.6), 0.2);
  else P = poseStand(t);
  if (P === undefined) P = poseStand(t);
  const look = between(t, W("net") + 0.8, LE(9) + 0.2) ? (Math.floor((t - W("net") - 0.8) / 0.45) % 2 ? -1 : 1) : 1;
  heroAt(b, tr.x - cam, P, look, t);
  drawFalling(b, { t, cam }, R(lerp(24, 70, Math.sin(Math.PI * prog(t, W("tainu") - 0.2, LE(10) + 0.8)))));
  // камера: средний план → общий (деревья облетают) → куст → цветок
  let zoom = lerp(1.6, 1.85, smooth(prog(t, L(9), LE(9)))), fx = tr.x - cam + 10, fy = HY - 30;
  if (between(t, L(10) - 0.1, LE(10) + 0.2)) { zoom = lerp(1.6, 1, smooth(prog(t, L(10) - 0.1, L(10) + 0.5))); fy = 60; }
  if (between(t, L(11) - 0.1, LE(11) + 0.2)) { zoom = 1.7; fx = hazelX - cam; fy = HY - 24; }
  if (t > LE(11) + 0.2) { zoom = lerp(1.7, 2.4, smooth(prog(t, LE(11) + 0.2, L(12) + 0.6))); fx = flowerX - cam - 4; fy = HY - 14; }
  return {
    zoom, fx, fy, hud: hudGame(t), band: { cam },
    screen: (g, tt) => {
      sfxText(g, "?", tr.x - cam, HY - 30, W("net") + 0.85, tt, "#ffd23f");
      sfxText(g, "?", tr.x - cam + 6, HY - 32, W("net") + 1.75, tt, "#ffd23f");
      sfxText(g, "ПУСТО!", hazelX - cam, HY - 26, W("oreh") + 0.05, tt, "#ff7a6a");
      sfxText(g, "ЭХ…", flowerX - cam, HY - 12, W("cvetok") + 0.1, tt, "#cfd8ff");
    },
  };
}

// ===================== 4. «Мох не приподнят… Пурпур брусничных кистей» =====================
function sc4(b, t) {
  const mossX = 140, stumpX = 300;
  const tr = track(t, [[L(13) - 0.3, 110], [L(14) + 0.6, 110], [LE(14) + 0.1, 110], [L(15) + 0.5, stumpX - 26], [99, stumpX - 26]]);
  const cam = clamp(tr.x - 110, 0, 190);
  forest(b, t, { cam, cover: 0.9, bare: 0.88, wet: 0.2 });
  const poke = between(t, W("moh"), LE(13) + 0.1) ? Math.max(0, Math.sin((t - W("moh")) * 9)) * 1.2 : 0;
  mossMound(b, mossX - cam, HY - 1, poke);
  stump(b, stumpX - cam, HY - 1);
  for (let i = 0; i < 3; i++) berrySprig(b, stumpX - cam - 14 + i * 5, HY - 1, false, 0);
  // призраки груздей: проступают пунктиром и тают
  let P;
  if (tr.v > 1) P = poseRun(tr.x, t);
  else if (t < L(15)) P = poseCrouch(prog(t, L(13) - 0.2, W("moh")), 0.6 + poke * 0.6);
  else P = poseCrouch(prog(t, L(15) + 0.5, L(15) + 0.9), 0.3);
  heroAt(b, tr.x - cam, P, 1, t);
  // мечта о груздях: облачко с груздями перечёркивается
  const hx4 = tr.x - cam;
  dreamBubble(b, hx4 + 4, HY - 70, t, L(14) - 0.35, W("gruzd") + 0.15, LE(14) + 0.35, (c, x, y) => {
    for (let i = 0; i < 3; i++) { const mx = x + 8 + i * 10, my = y + 19 - (i % 2) * 3; rect(c, mx - 1, my - 6, 3, 7, "#e8dcc0"); ell(c, mx, my - 7, 5.2, 2.4, "#f4ecd6"); rect(c, mx - 4, my - 8, 8, 1, "#c8a870"); px(c, mx - 2, my - 9, "#ffffff"); }
  }, hx4 + 2, HY - 30);
  // мечта о бруснике: облачко с гроздьями
  dreamBubble(b, hx4 + 4, HY - 70, t, L(16) - 0.3, W("kistey") + 0.1, LE(16) + 0.45, (c, x, y) => {
    line(c, x + 6, y + 18, x + 30, y + 6, "#3f6a2c", 1);
    for (let i = 0; i < 9; i++) { const bx = x + 8 + i * 2.6, by = y + 10 + (i % 3) * 2 + (i > 4 ? -3 : 1); rect(c, bx, by, 2, 2, "#c8102e"); px(c, bx, by, "#ff5a6a"); }
    rect(c, x + 12, y + 5, 3, 2, "#4f8a36"); rect(c, x + 22, y + 3, 3, 2, "#4f8a36");
  }, hx4 + 2, HY - 30);
  drawFalling(b, { t, cam }, 12);
  const atMoss = t < LE(14) + 0.2;
  return {
    zoom: atMoss ? 1.8 : lerp(1.4, 1.8, smooth(prog(t, L(15) + 0.4, L(16)))), fx: atMoss ? mossX - cam - 8 : stumpX - cam - 16, fy: HY - 34,
    hud: hudGame(t), band: { cam },
    screen: (g, tt) => {
      sfxText(g, "НИ ГРИБА!", mossX - cam, HY - 18, W("gruzd") + 0.4, tt, "#ff7a6a");
      sfxText(g, "НИ ЯГОДКИ!", stumpX - cam - 6, HY - 18, W("kistey") + 0.2, tt, "#ff7a6a");
    },
  };
}

// ===================== 5. «Долго на листьях лежит ночи мороз… Ясность прозрачных небес» =====================
function sc5(b, t) {
  const frost = smooth(prog(t, L(17) - 0.2, LE(18)));
  const slipT = W("moroz") - 0.05;
  const tr = track(t, [[L(17) - 0.2, 60], [slipT, 120], [slipT + 0.9, 132], [99, 132]]);
  const tilt = smooth(prog(t, W("skvoz"), W("glyadit"))) * (1 - smooth(prog(t, LE(20) - 0.3, LE(20) + 0.3)));
  const camY = R(tilt * 90);
  const cam = 40 + t * 2;
  forest(b, t, { cam, cover: 0.95, bare: 0.92, frost, camY });
  b.globalAlpha = 0.18 * frost; rect(b, 0, 0, LW, WH, "#cfe6ff"); b.globalAlpha = 1;
  // солнце «глядит»: глаза на бледном диске
  if (camY > 20) {
    const sx = 258 - cam * 0.02, sy = 30 + camY * 0.2;
    const look = Math.sin(t * 1.5) > 0 ? 1 : 0;
    rect(b, sx - 4 + look, sy - 1, 2, 2, "#5a6a8a"); rect(b, sx + 2 + look, sy - 1, 2, 2, "#5a6a8a");
    rect(b, sx - 2, sy + 4, 4, 1, "#9aa8c0");
  }
  // искры ясного неба
  if (t > L(20)) for (let i = 0; i < 24; i++) { const u = (t * 0.7 + hash(i)) % 1; if (u < 0.3) px(b, hash(i * 3.3) * LW, hash(i * 5.1) * 80 + camY * 0.2 - 20, "#ffffff"); }
  let P;
  if (t < slipT) P = tr.v > 1 ? poseRun(tr.x, t, 0.7) : poseStand(t);
  else if (t < slipT + 0.9) P = poseSlip(prog(t, slipT, slipT + 0.9), t);
  else P = poseShiver(prog(t, slipT + 0.9, slipT + 1.3), t);
  const hx = tr.x - (t < slipT ? 0 : 0);
  b.save(); b.translate(0, camY * K); heroAt(b, hx, P, 1, t); b.restore();
  return {
    zoom: lerp(1.5, 1, tilt), fx: hx + 8, fy: lerp(HY - 30, 70, tilt), hud: hudGame(t), band: { cam },
    screen: (g, tt) => { sfxText(g, "ОЙ!", hx + 6, HY - 30 + camY, slipT + 0.15, tt, "#cfe8ff"); sfxText(g, "БРРР!", hx + 6, HY - 30 + camY, slipT + 1.1, tt, "#cfe8ff"); },
  };
}

// ===================== 6. «Листья шумят под ногой… И, как безумный, пою!» (и 9 — то же громче) =====================
function scRun(b, t, a) {
  // a: { l1: первая строка строфы, big: финальная версия }
  const n = a.l1, runT0 = L(n) - 0.3, smT = W(a.smert), toT = W(a.tolko), poT = L(n + 3);
  const dullK = smooth(prog(t, smT - 0.1, smT + 0.6)) * (1 - smooth(prog(t, toT - 0.05, toT + 0.25)));
  const speed = t < smT ? 60 : t < toT ? (a.big ? 52 : 34) : 0;
  const xRun = (tt) => 40 + Math.min(tt, smT) * 0 + (Math.min(tt, toT) - runT0) * 0;
  // путь: бег до «Только», потом прыжок и пение на месте
  const keys = [[runT0, 60], [smT, 60 + (smT - runT0) * 60], [toT, 60 + (smT - runT0) * 60 + (toT - smT) * (a.big ? 52 : 34)]];
  const tr = track(t, keys);
  const cam = tr.x - 120;
  forest(b, t, { cam, cover: 1, bare: 0.75, dull: dullK });
  // ветер «стелет жатву»: ряды листьев летят над землёй и ложатся
  if (between(t, smT - 0.1, toT + 0.2)) {
    for (let r = 0; r < 4; r++) for (let i = 0; i < 26; i++) {
      const u = prog(t, smT - 0.1 + r * 0.18, smT + 0.9 + r * 0.18);
      const x = R(lerp(330, 10 + i * 12, smooth(u)) + hash(i + r * 9) * 6), y = R(HY - 3 - r * 3 + Math.sin(i + t * 9) * (1 - u) * 3);
      rect(b, x, y, 3, 1, mix(LEAFC[(i + r) % LEAFC.length], "#8a7a68", dullK));
    }
  }
  const jumpT = toT + 0.02, jk = prog(t, jumpT, jumpT + 0.6);
  let P, dir = 1;
  if (t < toT) { P = poseRun(tr.x, t, t < smT ? 1.1 : 0.7); if (t > smT) { P.mouth = "sad"; P.lean = 0.35; } }
  else if (t < jumpT + 0.6) P = poseJump(jk, t);
  else {
    P = poseSing(prog(t, jumpT + 0.6, jumpT + 0.9), t);
    // «как безумный»: прыжки-развороты на месте
    const hu = (t - jumpT - 0.6) / 0.42;
    dir = Math.floor(hu + 0.5) % 2 ? -1 : 1; // разворот в воздухе, на вершине прыжка
    P.lift = Math.abs(Math.sin(hu * Math.PI)) * (a.big ? 7 : 4);
  }
  const hx = tr.x - cam;
  // финальная версия: куча листьев под героем и вихрь вокруг
  if (a.big && t > jumpT) {
    const k = smooth(prog(t, jumpT, jumpT + 0.8));
    leafPile(b, hx, HY + 1, 22, 7, k);
    for (let i = 0; i < 40; i++) {
      const a2 = t * 3 + i * TAU / 40, r = 16 + (i % 5) * 6 + Math.sin(t * 2 + i) * 3;
      rect(b, hx + Math.cos(a2) * r * 1.4, HY - 18 + Math.sin(a2) * r * 0.55 - (i % 7) * 2, 2, 1, LEAFC[i % LEAFC.length]);
    }
  }
  heroAt(b, hx, P, dir, t);
  if (t < toT) burst(b, hx - 4, HY - 1, Math.floor(t * 3.5) / 3.5, t, 10, Math.floor(t * 3.5), 0.5);
  if (t > jumpT + 0.45) notesFrom(b, hx, HY - 30, jumpT + 0.45, t, a.big ? 14 : 9, n);
  drawFalling(b, { t, cam }, a.big && t > toT ? 60 : 26, { wind: t > smT && t < toT ? 0.6 : 0 });
  // вспышка радости
  const flash = between(t, toT, toT + 0.25) ? 1 - prog(t, toT, toT + 0.25) : 0;
  const zoom = t < smT ? 1.6 : t < toT ? lerp(1.6, 1.3, smooth(prog(t, smT, smT + 0.6))) : lerp(1.3, a.big ? 1.45 : 1.9, smooth(prog(t, toT, toT + 0.7)));
  return {
    zoom, fx: hx + 6, fy: HY - (t > toT ? 34 : 28), dull: dullK, hud: hudGame(t), band: { cam },
    screen: (g, tt) => {
      if (flash > 0) { g.fillStyle = "#fff6c0"; g.globalAlpha = flash * 0.7; g.fillRect(0, 0, 1920, BAND_Y); g.globalAlpha = 1; }
      sfxText(g, "ШУРШ-ШУРШ!", hx + 4, HY - 40, W(a.shum) + 0.05, tt, "#ffd23f");
    },
  };
}
function sc6(b, t) { return scRun(b, t, { l1: 21, smert: "smert", tolko: "tolko", shum: "shumyat" }); }
function sc9(b, t) { return scRun(b, t, { l1: 33, smert: "smert2", tolko: "tolko2", shum: "shumyat2", big: true }); }

// ===================== 7. Воспоминание: подснежник → лето → осенние цветы =====================
const MEM_FLOWERS = [["snow", 0], ["bell", 1], ["daisy", 1], ["poppy", 1], ["camomile", 2], ["aster", 2]];
function sc7(b, t) {
  const t0 = L(25) - 0.3, pickT = W("rval") - 0.35, runT = W("vplot") - 0.2, endRun = LE(28) - 0.2;
  // сезон по ходу бега: весна → лето → осень
  const sp = prog(t, runT, endRun);
  const season = sp < 0.34 ? "spring" : sp < 0.72 ? "summer" : "autumn";
  const snowX0 = 136, baseX = snowX0 - 8.5;
  const tr = track(t, [[t0, 70], [pickT - 0.4, baseX], [runT, baseX], [endRun, baseX + (endRun - runT) * 70], [99, baseX + (endRun - runT) * 70]]);
  const cam = tr.x - 112;
  forest(b, t, { cam, season, cover: season === "autumn" ? 0.7 : 0, bare: season === "spring" ? 0.45 : 0, wet: season === "spring" ? 0.6 : 0 });
  // весной — снежные пятна
  if (season === "spring") for (let k = 0; k < 6; k++) { const x = k * 70 - (cam % 70) - 20; ell(b, x, HY - 1, 10, 2, "#f4f8ff"); }
  // подснежник у мха
  const snowX = 136;
  if (t < runT + 0.4) {
    mossMound(b, snowX - cam + 9, HY - 1, 0);
    const grow = smooth(prog(t, W("mhov") - 0.2, W("mhov") + 0.4));
    if (t < pickT && grow > 0) flower(b, snowX - cam, HY - 1 - (1 - grow) * 6, "snow", 0, grow);
  }
  // цветы вдоль пути: каждый встречен
  const flowersX = MEM_FLOWERS.slice(1).map((f, i) => baseX + (runT + 0.45 + i * (endRun - runT - 0.6) / 5 - runT) * 70 + 10);
  flowersX.forEach((x, i) => {
    const sx = x - cam;
    if (sx < -10 || sx > LW + 10) return;
    flower(b, sx, HY - 1, MEM_FLOWERS[i + 1][0], 0);
    const met = runT + 0.45 + i * (endRun - runT - 0.6) / 5;
    if (t > met) heart(b, sx - 2, HY - 16 - (t - met) * 10, "#ff5a7a");
  });
  let P;
  if (t < pickT - 0.4) P = poseRun(tr.x, t, 0.8);
  else if (t < pickT + 0.45) P = posePick(prog(t, pickT - 0.35, pickT) - prog(t, pickT + 0.05, pickT + 0.45));
  else if (t < runT) { P = poseStand(t); P.hands = [P.hands[0], [2.4, -2.8]]; P.elbows = ["back", "down"]; P.mouth = "open"; P.eyes = "happy"; P.blush = 1; }
  else P = poseRun(tr.x, t, 1);
  heroAt(b, tr.x - cam, P, 1, t);
  // сорванный подснежник: от земли в руку, потом герой держит его над головой
  if (between(t, pickT, runT + 0.05)) {
    const hx7 = tr.x - cam, handX = hx7 + 4.5, handY = HY - 17.4 - 2.8; // кисть поднятой ближней руки (poseStand)
    const u = smooth(prog(t, pickT, pickT + 0.45));
    const fx7 = lerp(snowX0 - cam, handX, u), fy7 = lerp(HY - 1, handY + 2, u);
    flower(b, fx7, fy7, "snow", 0, 1);
  }
  // в руке после срыва — подснежник
  const hud = { leaves: leavesAt(t), banner: ["ВОСПОМИНАНИЕ", t0 + 0.1, "#2c3a5a"] };
  return {
    zoom: t < runT ? 1.7 : 1.4, fx: tr.x - cam + 14, fy: HY - 24, hud, band: { cam },
    over: (g, tt) => drawCollection(g, tt, pickT, runT, endRun),
  };
}
// панель коллекции цветов (в воспоминании и зимой)
function drawCollection(g, t, pickT, runT, endRun) {
  const x0 = 1920 - 28 - 6 * 70 - 8, y0 = 24;
  panelBox(g, x0, y0, 6 * 70 + 8, 56, "#2c3a5a");
  MEM_FLOWERS.forEach((f, i) => {
    const got = i === 0 ? pickT : runT + 0.45 + (i - 1) * (endRun - runT - 0.6) / 5;
    const x = x0 + 8 + i * 70, y = y0 + 6;
    g.fillStyle = "#1a2236"; g.fillRect(x, y, 60, 44);
    if (t > got) {
      const k = springPop((t - got) * 2.2), s = R(lerp(1, 4, clamp(k)));
      // цветок значком: стебель и венчик
      const col = { snow: "#ffffff", bell: "#6a6ae8", daisy: "#ffffff", poppy: "#e83a3a", camomile: "#ffffff", aster: "#a85ad8" }[f[0]];
      g.fillStyle = "#4a8a3a"; g.fillRect(x + 28, y + 18, s, s * 5);
      g.fillStyle = col; g.fillRect(x + 22, y + 8, s * 4, s * 3); g.fillRect(x + 26, y + 4, s * 2, s * 5);
      g.fillStyle = "#ffd23f"; g.fillRect(x + 28, y + 12, s, s);
    }
  });
}

// ===================== 8. «Что им сказала душа… В зимние ночи и дни!» =====================
function sc8(b, t) {
  const winT = L(31) - 0.25;
  if (t < winT) {
    // разговор с цветами на летней поляне
    const cam = 300;
    forest(b, t, { cam, season: "summer", cover: 0, bare: 0 });
    const fl = ["bell", "daisy", "poppy", "camomile", "aster"];
    fl.forEach((k, i) => {
      const sw = Math.sin(t * 3 + i) * (t > L(30) ? 0.25 : 0.08);
      flower(b, 168 + i * 9, HY - 1, k, sw < 0 ? 0 : sw);
    });
    const P8 = poseCrouch(prog(t, L(29) - 0.3, L(29) + 0.2), 0.1);
    P8.tilt = 0.25 + Math.sin(t * 4.2) * 0.25; P8.mouth = Math.floor(t * 5) % 2 ? "open" : "smile"; P8.eyes = t > L(30) ? "happy" : "open";
    P8.hands[1] = [P8.hands[1][0] + Math.sin(t * 3) * 0.8, P8.hands[1][1] - 1.5 + Math.sin(t * 3) * 0.6];
    heroAt(b, 140, P8, 1, t);
    // пузыри: герой — сердце и нота; цветы — ноты и сердца в ответ
    const bk = springPop((t - L(29) - 0.1) * 2);
    if (t > L(29) && t < L(30) + 0.3) { bubble(b, 132, HY - 52 + R((1 - clamp(bk)) * 6), 22, 12, 140); heart(b, 136, HY - 48, "#ff5a7a"); note(b, 146, HY - 50, "#ffb21b"); }
    if (t > L(30)) {
      for (let i = 0; i < 5; i++) {
        const st = L(30) + i * 0.25, k = springPop((t - st) * 2);
        if (k <= 0) continue;
        const x = 162 + i * 9, y = HY - 34 - (i % 2) * 10 - R((1 - clamp(k)) * 4);
        bubble(b, x, y, 10, 9, x + 4);
        if (i % 2) note(b, x + 3, y + 1, "#ffb21b"); else heart(b, x + 3, y + 2, "#ff5a7a");
      }
    }
    return { zoom: 1.7, fx: 170, fy: HY - 30, hud: { leaves: leavesAt(t), banner: ["ВОСПОМИНАНИЕ", L(25) - 0.2, "#2c3a5a"] }, band: { cam }, over: (g, tt) => drawCollection(g, tt, -1, -1, 0) };
  }
  // зимняя ночь: изба, окно с тёплым светом, внутри герой с альбомом цветов
  const dayK = between(t, W("dni") - 0.6, W("dni") + 0.9) ? Math.sin(Math.PI * prog(t, W("dni") - 0.6, W("dni") + 0.9)) : 0;
  const night = dayK < 0.5;
  drawSky(b, { t, night, season: "winter", cam: 0 });
  if (!night) { rect(b, 0, 0, LW, WH, "#a8cce8"); disc(b, 60, 30, 10, "#fff6d0"); }
  drawFar(b, { t, cam: 0, season: "winter", night });
  rect(b, 0, GY - 4, LW, WH, night ? "#c8d4e8" : "#eef4fa");
  // изба
  const hx0 = 96, hw = 140;
  for (let j = 0; j < 9; j++) { rect(b, hx0, 54 + j * 9, hw, 8, j % 2 ? "#6a4228" : "#7a4c2c"); rect(b, hx0, 61 + j * 9, hw, 1, "#3e2618"); }
  poly(b, [[hx0 - 12, 56], [hx0 + hw / 2, 20], [hx0 + hw + 12, 56]], "#4e3020");
  poly(b, [[hx0 - 12, 56], [hx0 + hw / 2, 20], [hx0 + hw + 12, 56], [hx0 + hw / 2, 26]], "#f4f8ff");
  // окно
  const wx = 136, wy = 66, ww = 60, wh = 44;
  rect(b, wx - 4, wy - 4, ww + 8, wh + 8, "#efe6d0");
  const glow = 0.85 + 0.15 * Math.sin(t * 3);
  rect(b, wx, wy, ww, wh, mix("#e8a040", "#ffd27a", glow));
  rect(b, wx, wy + wh - 10, ww, 10, "#c87a38");
  // лампа
  disc(b, wx + 48, wy + 10, 3, "#fff6c0"); rect(b, wx + 47, wy + 2, 2, 6, "#5a3a20");
  // герой у окна с альбомом
  b.save(); b.beginPath(); b.rect(wx * K, wy * K, ww * K, wh * K); b.clip();
  // альбом с цветами — перед героем, кисти лежат на его краях
  const pk = prog(t, W("vspomnyu"), W("vspomnyu") + 0.5);
  rect(b, wx + 21, wy + wh - 23, 14, 10, "#a03030"); rect(b, wx + 22, wy + wh - 22, 12, 8, "#fff6e0"); rect(b, wx + 28, wy + wh - 22, 1, 8, "#d8c8a8");
  if (pk > 0) { flower(b, wx + 25, wy + wh - 15, "snow", 0, pk); flower(b, wx + 31, wy + wh - 15, "aster", 0, pk); }
  drawHero(b, wx + 16, wy + wh - 6, poseSit(t, true), 1, t);
  b.restore();
  // рама, подоконник со снегом
  rect(b, wx + ww / 2 - 1, wy, 2, wh, "#efe6d0"); rect(b, wx, wy + wh / 2 - 1, ww, 2, "#efe6d0");
  rect(b, wx - 6, wy + wh + 4, ww + 12, 3, "#f4f8ff");
  // снег
  for (let i = 0; i < 70; i++) {
    const sp = 10 + hash(i) * 14, y = ((t * sp + hash(i * 3) * 200) % 170) - 10, x = (hash(i * 7) * 360 + Math.sin(t + i) * 5) % 340 - 10;
    px(b, x, y, "#ffffff"); if (i % 3 === 0) px(b, x + 1, y, "#dfe8f8");
  }
  const z = lerp(1.3, 1.9, smooth(prog(t, winT, W("dysha"))));
  return {
    zoom: z, fx: wx + ww / 2, fy: wy + wh / 2 + 6, band: { night: true },
    hud: { leaves: leavesAt(t), banner: ["СОХРАНЕНО", W("vspomnyu"), "#2c3a5a"] },
    over: (g, tt) => drawCollection(g, tt, -1, -1, 0),
  };
}

// ===================== финал: герой сидит на куче листьев, название крупно =====================
function scFinal(b, t) {
  const cam = 600 + (t - W("fin")) * 4;
  forest(b, t, { cam, cover: 1, bare: 0.5 });
  leafPile(b, 160, HY + 1, 24, 8, 1);
  drawHero(b, 156, HY - 6, poseSit(t), 1, t);
  drawFalling(b, { t, cam }, 30);
  return {
    zoom: 1.5, fx: 160, fy: 96, hud: { hidden: true }, band: { cam },
    over: (g, tt) => {
      drawTitle(g, "ОСЕНЬ", 960, 110, 18, tt, W("fin") + 0.1);
      const ka = springPop((tt - W("fin") - 0.7) * 1.4);
      if (ka > 0) {
        const s = "Аполлон Николаевич Майков", w = textWidth(s) * 5;
        g.globalAlpha = clamp(ka);
        drawText(g, s, R((1920 - w) / 2), 340 + R((1 - ka) * 40), "#fff6e0", 5, { edge: "#2a1206", shadow: "#2a1206" });
        g.globalAlpha = 1;
      }
    },
  };
}

// [функция, время начала, переход на входе: leaf — вихрь листьев, mos — пиксельное растворение]
const SCENES = [
  [sc1, 0], [sc2, L(5) - 0.15, "leaf"], [sc3, L(9) - 0.3, "leaf"], [sc4, L(13) - 0.3, "leaf"], [sc5, L(17) - 0.3, "leaf"],
  [sc6, L(21) - 0.3, "leaf"], [sc7, L(25) - 0.3, "mos"], [sc8, L(29) - 0.3, "none"], [sc9, L(33) - 0.3, "leaf"], [scFinal, W("fin"), "leaf"],
];
