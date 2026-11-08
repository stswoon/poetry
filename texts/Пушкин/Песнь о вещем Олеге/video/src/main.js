// ---------- v3. Склейка: таблица сцен, HUD, окно диалога, квест, переходы ----------
const cv = document.getElementById("scene");
const g = cv.getContext("2d", { alpha: false });
g.imageSmoothingEnabled = false;
const TOTAL = CFG.total, LINES = CFG.lines;
const BOX_Y = 166;

// [функция сцены, время начала, переход на входе]
const TABLE = [
  [scTitle, 0], [sc1, L(1) - 0.3, "flash"], [sc2, L(7) - 0.3, "mos"], [sc3, L(13) - 0.3, "none"], [sc4, L(19) - 0.6, "iris"],
  [sc5, L(25) - 0.3, "none"], [sc6, L(31) - 0.3, "mos"], [sc7, L(37) - 0.3, "mos"], [sc8, L(43) - 0.4, "iris"], [sc9, L(49) - 0.3, "mos"],
  [sc10, L(55) - 0.3, "none"], [null, W("years"), "none"], [sc11, L(61) - 0.15, "iris"], [sc12, L(67) - 0.3, "none"], [sc13, L(73) - 0.3, "mos"],
  [sc14, L(79) - 0.3, "iris"], [sc15, L(85) - 0.4, "mos"], [sc16, L(91) - 0.4, "none"], [scGameOver, W("w_vskr") + 0.7, "none"],
  [sc17, L(97) - 0.15, "none"], [scFinal, W("fin") - 0.3, "iris"],
];
function yearsCard(c, t) {
  rect(c, 0, 0, LW, LH, "#0b0710");
  const k = clamp((t - W("years")) / 0.3);
  if (k > 0) centerText(c, "ПРОШЛО МНОГО ЛЕТ…", 96, "#ffe680", 2);
}

// ---------- HUD ----------
const HEART_T = (i) => W("w_vskr") + 0.15 + i * 0.12;
function hud(c, t) {
  if (t < L(1) - 0.3 || t > W("fin") - 0.3 || (t > W("years") && t < L(61) - 0.15) || t > W("w_vskr") + 0.7 && t < L(97) - 0.15) return;
  rect(c, 0, 0, LW, TOP, "#0b0710"); rect(c, 0, TOP - 1, LW, 1, "#3a3060");
  drawText(c, "ОЛЕГ", 4, 3, "#ffffff");
  const hl = heartsLeft(t);
  for (let i = 0; i < 5; i++) blit(c, heartIcon(i < hl), 34 + i * 10, 2);
  const on = t > W("w_kon1") && t < W("leave");
  const questBlink = t > W("quest") && t < LE(42) + 1.1 && Math.floor(t * 6) % 2;
  blit(c, horseIcon(on), 92, 1); if (questBlink) rect(c, 91, 0, 15, 12, "rgba(232,48,44,0.6)");
  const glory = ["w_pozh", "w_slava", "w_shchit", "w_volny"].filter((k) => t > W(k) + 0.2).length * 100;
  blit(c, coinIcon(), 290, 2); drawText(c, "СЛАВА " + glory, 300, 3, "#ffe680");
  if (t > W("boss") && t < W("w_vskr") + 0.7) { drawText(c, "ЗМИЯ", 130, 3, "#e8302c"); rect(c, 160, 3, 82, 7, "#120c14"); rect(c, 161, 4, 80, 5, "#e8302c"); }
}

// ---------- окно диалога: портрет, имя, две строки, слова печатаются под голос ----------
const ROLE = { oleg: ["ОЛЕГ", "oleg"], kud: ["КУДЕСНИК", "kud"], chron: ["ЛЕТОПИСЬ", "chron"] };
function curLine(t) { let k = -1; for (let i = 0; i < LINES.length; i++) if (LINES[i].s - 0.1 <= t) k = i; return k; }
function drawWords(c, L0, x, y, t, dim) {
  for (const w of L0.words) {
    if (t < w.s - 0.06) break;
    const col = dim ? "#9ea4cc" : t < w.e ? "#ffffff" : "#ffe680";
    drawText(c, w.w, x, y, col, { shadow: "#0a0c20" });
    x += textWidth(w.w) + SPACE + 1;
  }
}
function drawBox(c, t) {
  const i = curLine(t);
  if (i < 0 || t > W("fin") - 0.4) return; // на «КОНЕЦ ИГРЫ» строка 96 остаётся внизу до строки 97
  let Lc = LINES[i];
  if (Lc.n === CFG.quest) return; // строка квеста — в своём окне
  const pairStart = Lc.n % 2 === 1 ? Lc.n : Lc.n - 1;
  const r = ROLE[Lc.role];
  const k = springSoft((t - LINES[0].s + 0.4) * 1.2);
  const by = R(lerp(LH, BOX_Y, k));
  panel(c, 4, by, LW - 8, LH - by - 3);
  const speaking = t < Lc.e && Math.floor(t * 9) % 3 !== 0;
  rect(c, 8, by + 4, 40, 40, "#e8e0c0");
  const mood = r[1] === "oleg" && Lc.n >= 91 ? "laugh" : r[1] === "oleg" && Lc.n >= 74 && Lc.n <= 77 ? "angry" : r[1] === "kud" ? "glow" : "";
  blit(c, portrait2(r[1], speaking ? 1 : 0, (t * 0.31 + i * 0.13) % 1 < 0.03, mood), 8, by + 4);
  const nw = textWidth(r[0]);
  rect(c, 54, by - 5, nw + 8, 11, "#7a2c2c"); rect(c, 55, by - 4, nw + 6, 9, "#a03c34");
  drawText(c, r[0], 58, by - 3, "#fff3c0");
  const rows = [];
  for (let n = pairStart; n <= Lc.n; n++) if (n !== CFG.quest && LINES[n - 1].role === Lc.role) rows.push(LINES[n - 1]); // сменился говорящий — новая страница
  let y = by + 12;
  for (const M of rows) { drawWords(c, M, 56, y, t, M.n !== Lc.n); y += 14; }
  if (t > Lc.e + 0.15 && Math.floor(t * 3) % 2) { rect(c, LW - 16, by + 38, 5, 1, "#ffe680"); rect(c, LW - 15, by + 39, 3, 1, "#ffe680"); rect(c, LW - 14, by + 40, 1, 1, "#ffe680"); }
}
// окно «НОВЫЙ КВЕСТ» со строкой 42
function questBox(c, t) {
  const q = LINES[CFG.quest - 1], t0 = W("quest"), t1 = LE(CFG.quest) + 1.1;
  if (t < t0 || t > t1) return;
  const k = springPop((t - t0) * 1.6), w = 300, h = 54, x = R((LW - w) / 2), y = R(26 - (1 - k) * 60);
  panel(c, x, y, w, h, "#3a1020");
  centerText(c, "НОВЫЙ КВЕСТ", y + 7, "#ffe680");
  rect(c, x + 20, y + 19, w - 40, 1, "#7a6a3c");
  const tw = textWidth(q.text); drawWords(c, q, R((LW - tw) / 2), y + 30, t, false);
}

// ---------- переходы ----------
const tmp = document.createElement("canvas"); tmp.width = LW; tmp.height = LH;
const tg = tmp.getContext("2d"); tg.imageSmoothingEnabled = false;
function mosaic(level) {
  const sc = Math.max(1, R(level)); if (sc <= 1) return;
  const w = Math.ceil(LW / sc), h = Math.ceil(LH / sc);
  tg.drawImage(cv, 0, 0, LW, LH, 0, 0, w, h); g.drawImage(tmp, 0, 0, w, h, 0, 0, w * sc, h * sc);
}
function render(t) {
  let i = 0;
  while (i + 1 < TABLE.length && t >= TABLE[i + 1][1]) i++;
  const [fn, start, kind] = TABLE[i], u = t - start;
  g.setTransform(1, 0, 0, 1, 0, 0);
  rect(g, 0, 0, LW, LH, "#0b0710");
  if (fn) fn(g, t); else yearsCard(g, t);
  const next = TABLE[i + 1], till = next ? next[1] - t : 99, nk = next && next[2];
  if (kind === "mos" && u < 0.35) mosaic(lerp(14, 1, u / 0.35));
  if (nk === "mos" && till < 0.35) mosaic(lerp(1, 14, 1 - till / 0.35));
  if (kind === "iris" && u < 0.5) iris(g, LW / 2, 90, lerp(0, 260, smooth(u / 0.5)));
  if (nk === "iris" && till < 0.5) iris(g, LW / 2, 90, lerp(260, 0, smooth(1 - till / 0.5)));
  if (kind === "flash" && u < 0.25) wash(g, "#ffffff", 1 - u / 0.25);
  hud(g, t);
  questBox(g, t);
  drawBox(g, t);
  if (t > TOTAL - 1.0) wash(g, "#000000", clamp((t - TOTAL + 1.0) / 0.9));
}

window.addEventListener("hf-seek", (e) => render(e.detail.time));
render(0);
