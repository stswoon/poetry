// Склейка: таблица сцен, окно текста, переходы. Текст и тайминги приходят из CFG (build.py).
const cv = document.getElementById("scene");
const g = cv.getContext("2d", { alpha: false, willReadFrequently: false });
g.imageSmoothingEnabled = false;
const V0 = CFG.v0, TOTAL = CFG.total, LINES = CFG.lines;
const S = (n) => LINES[n - 1].start;
const E = (n) => LINES[n - 1].end;

const SC = Object.assign({}, SCENES1, SCENES2);
// имя сцены, с какой строки (0 — заставка), тип перехода на входе
const TABLE = [
  ["title", 0], ["murom", 1, "iris"], ["siege", 7, "mos"], ["battle", 14, "mos"], ["gate", 22, "mos"], ["map", 28, "mos"], ["tale", 41, "mos"],
  ["routes", 49, "mos"], ["ride", 51, "iris"], ["approach", 57, "mos"], ["bossWhistle", 61, "flash"], ["stumble", 66, "none"], ["bow", 78, "none"],
  ["capture", 85, "none"], ["nest", 89, "iris"], ["husbands", 115, "none"], ["kiev", 136, "iris"], ["enter", 143, "mos"], ["palace", 153, "none"],
  ["doubt", 177, "none"], ["reveal", 198, "none"], ["yard", 203, "mos"], ["pour", 244, "mos"], ["blast", 253, "flash"], ["field", 261, "iris"],
  ["polno", 266, "iris"], ["slava", 271, "mos"], ["final", 999, "iris"],
];
const FINAL_T = E(LINES.length) + 1.4;
const starts = TABLE.map(([n, l]) => (l === 0 ? 0 : l === 999 ? FINAL_T : S(l) - 0.15));

const a = (n) => lastT - S(n);
let lastT = 0;

const ROLE = {
  "сказитель": { name: "Сказитель", p: "narrator" },
  "илья": { name: "Илья Муромец", p: "ilya" },
  "соловей": { name: "Соловей-разбойник", p: "solovey2" },
  "владимир": { name: "Князь Владимир", p: "vladimir" },
  "мужички": { name: "Мужички черниговские", p: "muzhik" },
  "дочь": { name: "Дочь Соловья", p: "daughter1" },
};
function roleOf(L) {
  const r = Object.assign({}, ROLE[L.role]);
  if (L.role === "дочь") {
    if (L.n >= 111) { r.name = "Меньшая дочь"; r.p = "daughter3"; }
    else if (L.n >= 105) { r.name = "Меньшая дочь"; r.p = "daughter3"; }
    else if (L.n >= 100) { r.name = "Средняя дочь"; r.p = "daughter2"; }
    else { r.name = "Большая дочь"; r.p = "daughter1"; }
  }
  return r;
}

// Текущая строка: последняя начатая
function currentLine(t) {
  let lo = 0, hi = LINES.length - 1, best = -1;
  while (lo <= hi) {
    const m = (lo + hi) >> 1;
    if (LINES[m].start <= t) { best = m; lo = m + 1; } else hi = m - 1;
  }
  return best;
}

function drawBox(c, t) {
  const i = currentLine(t);
  if (i < 0 || t > FINAL_T - 0.1) return;
  const L = LINES[i];
  const r = roleOf(L);
  const k = springSoft((t - LINES[0].start + 0.3) * 1.2);
  const by = R(lerp(LH, 192, k));
  panel(c, 6, by, LW - 12, LH - by - 5);
  // портрет
  const speaking = t < L.end + 0.05 && Math.floor(t * 9) % 3 !== 0;
  const blink = (t * 0.31 + i * 0.13) % 1 < 0.03;
  rect(c, 11, by + 11, 44, 44, "#e8e0c0"); rect(c, 12, by + 12, 42, 42, "#7a6a3c");
  blit(c, portrait(r.p, speaking ? 1 : 0, blink), 13, by + 13);
  // имя
  const nw = textWidth(r.name);
  rect(c, 62, by + 3, nw + 8, 11, "#7a2c2c"); rect(c, 63, by + 4, nw + 6, 9, "#a03c34");
  drawText(c, r.name, 66, by + 5, "#fff3c0");
  // строки: до 3 предыдущих той же реплики тусклые, текущая яркая со спетым словом
  let first = i;
  while (first > 0 && i - first < 3 && LINES[first - 1].role === L.role && LINES[first - 1].n === LINES[first].n - 1 && LINES[first].stanza === LINES[first - 1].stanza) first--;
  const rows = i - first + 1;
  let y = by + 16 + (4 - rows) * 11;
  for (let j = first; j <= i; j++) {
    const M = LINES[j];
    let x = 62;
    if (j < i) {
      drawText(c, M.text, x, y, "#9ea4cc");
    } else {
      for (const w of M.words) {
        const col = t >= w.e ? "#ffe680" : t >= w.s ? "#ffffff" : "#d6d8ec";
        drawText(c, w.w, x, y, col, { shadow: "#0a0c20" });
        x += textWidth(w.w) + SPACE + 1;
      }
    }
    y += 11;
  }
  // индикатор «дальше»
  if (t > L.end + 0.15 && Math.floor(t * 3) % 2) { rect(c, LW - 18, by + 58, 5, 1, "#ffe680"); rect(c, LW - 17, by + 59, 3, 1, "#ffe680"); rect(c, LW - 16, by + 60, 1, 1, "#ffe680"); }
}

const tmp = document.createElement("canvas"); tmp.width = LW; tmp.height = LH;
const tg = tmp.getContext("2d"); tg.imageSmoothingEnabled = false;
function mosaic(level) {
  const sc = Math.max(1, R(level));
  if (sc <= 1) return;
  const w = Math.ceil(LW / sc), h = Math.ceil(LH / sc);
  tg.drawImage(cv, 0, 0, LW, LH, 0, 0, w, h);
  g.drawImage(tmp, 0, 0, w, h, 0, 0, w * sc, h * sc);
}

function render(t) {
  lastT = t;
  let i = 0;
  while (i + 1 < TABLE.length && t >= starts[i + 1]) i++;
  const [name, , kind] = TABLE[i];
  const u = t - starts[i];
  g.setTransform(1, 0, 0, 1, 0, 0);
  rect(g, 0, 0, LW, LH, "#0b0710");
  SC[name](g, t, a, cv, u);
  // переход на входе и выход следующей
  const next = TABLE[i + 1], tillNext = next ? starts[i + 1] - t : 99;
  const nk = next && next[2];
  const IN = 0.4;
  if (kind === "mos" && u < IN) mosaic(lerp(16, 1, u / IN));
  if (nk === "mos" && tillNext < IN) mosaic(lerp(1, 16, 1 - tillNext / IN));
  if (kind === "iris" && u < 0.6) iris(g, 240, 110, lerp(0, 300, smooth(u / 0.6)));
  if (nk === "iris" && tillNext < 0.6) iris(g, 240, 110, lerp(300, 0, smooth(1 - tillNext / 0.6)));
  if (kind === "flash" && u < 0.25) wash(g, "#ffffff", 1 - u / 0.25);
  drawBox(g, t);
}

window.addEventListener("hf-seek", (e) => render(e.detail.time));
render(0);
