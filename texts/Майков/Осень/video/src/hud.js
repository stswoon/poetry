// ---------- Экранный слой (1920×1080): полоса почвы со строками стиха, HUD, заголовок ----------
const BAND_Y = WH * SC; // 900: под миром — срез почвы

// полоса почвы: тёмная земля с камешками и корешками (рисуется в экранных пикселях ×6)
function drawBand(g, t, o) {
  o = o || {};
  const top = BAND_Y, P = SC;
  g.fillStyle = o.night ? "#141a2c" : "#2c1c12"; g.fillRect(0, top, 1920, 1080 - top);
  g.fillStyle = o.night ? "#1c2238" : "#3a2618"; g.fillRect(0, top, 1920, P * 2);
  const cam = (o.cam || 0);
  for (let i = 0; i < 70; i++) {
    const x = ((hash(i * 3.7) * 2200 - cam * P) % 2200 + 2200) % 2200 - 140, y = top + P * 3 + hash(i * 9.1) * 160;
    const s = hash(i * 1.3);
    g.fillStyle = o.night ? "#202840" : s > 0.66 ? "#4a3222" : s > 0.33 ? "#3a281a" : "#241810";
    g.fillRect(R(x / P) * P, R(y / P) * P, P * (1 + (i % 3)), P);
  }
}

// строки стиха: пара строк строфы; строка появляется целиком (тусклая), слова загораются под голос
function curLine(t) { let k = -1; for (let i = 0; i < CFG.lines.length; i++) if (CFG.lines[i].s - 0.12 <= t) k = i; return k; }
function drawVerse(g, t) {
  const i = curLine(t);
  if (i < 0 || t > CFG.ev.fin - 0.2) return;
  const Lc = CFG.lines[i];
  const first = Lc.n % 2 === 1 ? Lc.n : Lc.n - 1;
  const rows = [CFG.lines[first - 1]];
  if (first + 1 <= CFG.lines.length && (Lc.n === first + 1 || true)) rows.push(CFG.lines[first]);
  const sc = 5, lh = 13 * sc;
  rows.forEach((M, r) => {
    if (t < M.s - 0.12) return; // вторая строка пары появляется со своим голосом
    const k = springPop((t - (M.s - 0.12)) * 1.8);
    const w = textWidth(M.text) * sc;
    let x = R((1920 - w) / 2 / sc) * sc;
    const y = BAND_Y + 22 + r * lh + R((1 - k) * 30 / sc) * sc;
    g.globalAlpha = clamp(k * 1.5);
    for (const wd of M.words) {
      const said = t >= wd.s - 0.04, now = said && t < wd.e + 0.05;
      const col = now ? "#ffd23f" : said ? "#f8eedc" : "#9a8672";
      drawText(g, wd.w, x, y, col, sc, { shadow: "#120a06" });
      x += (textWidth(wd.w) + SPACE + GAP) * sc;
    }
    g.globalAlpha = 1;
  });
}

// ---------- HUD: листья ×N и четыре «секрета леса» ----------
const SECRETS = ["nut", "flower", "shroom", "berry"];
function icon(g, kind, x, y, s, dead) {
  const P = (dx, dy, w, h, col) => { g.fillStyle = col; g.fillRect(x + dx * s, y + dy * s, w * s, h * s); };
  const k = (col) => dead ? "#6a6058" : col;
  if (kind === "nut") { P(2, 1, 4, 2, k("#6a8a3a")); P(1, 3, 6, 4, k("#b0742e")); P(2, 7, 4, 1, k("#8a5420")); P(2, 4, 1, 1, k("#d8a050")); }
  if (kind === "flower") { P(3, 4, 1, 4, k("#4a8a3a")); P(2, 1, 3, 3, k("#a85ad8")); P(1, 2, 5, 1, k("#a85ad8")); P(3, 2, 1, 1, k("#ffd23f")); P(4, 6, 2, 1, k("#4a8a3a")); }
  if (kind === "shroom") { P(1, 2, 6, 2, k("#f4ecd6")); P(2, 1, 4, 1, k("#d8c8a0")); P(3, 4, 2, 4, k("#efe6d0")); }
  if (kind === "berry") { P(1, 3, 2, 2, k("#c8102e")); P(4, 3, 2, 2, k("#c8102e")); P(2, 5, 2, 2, k("#c8102e")); P(5, 5, 2, 2, k("#c8102e")); P(3, 1, 1, 2, k("#3f6a2c")); P(4, 0, 2, 1, k("#4f8a36")); }
  if (kind === "leaf") { P(2, 1, 3, 1, "#ffd23f"); P(1, 2, 5, 2, "#f6b21b"); P(2, 4, 3, 1, "#e8901a"); P(3, 5, 1, 2, "#8a5420"); }
}
function panelBox(g, x, y, w, h, fill) {
  g.fillStyle = "#1a120c"; g.fillRect(x - 4, y - 4, w + 8, h + 8);
  g.fillStyle = fill || "#3a2a1e"; g.fillRect(x, y, w, h);
  g.fillStyle = "#5a4430"; g.fillRect(x, y, w, 4);
}
function drawHud(g, t, st) {
  if (!st || st.hidden) return;
  const s = 4;
  // слева: листья ×N
  panelBox(g, 28, 24, 230, 52);
  icon(g, "leaf", 40, 30, 5);
  drawText(g, "×" + String(st.leaves).padStart(3, "0"), 92, 34, "#ffe8a0", s, { shadow: "#120a06" });
  // справа: «СЕКРЕТЫ ЛЕСА» и 4 слота
  if (st.secrets) {
    const x0 = 1920 - 28 - 4 * 76 - 12;
    panelBox(g, x0 - 300, 24, 300 + 4 * 76 + 8, 52);
    drawText(g, "СЕКРЕТЫ", x0 - 286, 34, "#ffe8a0", s, { shadow: "#120a06" });
    SECRETS.forEach((k, i) => {
      const x = x0 + i * 76, y = 28;
      g.fillStyle = "#1a120c"; g.fillRect(x, y, 64, 44);
      const gone = st.gone[i];
      const pop = gone ? springPop((t - gone) * 2) : 0;
      icon(g, k, x + 16, y + 6, 4, gone && t > gone);
      if (gone && t > gone) {
        const z = 1 + (1 - clamp(pop)) * 0.6;
        g.fillStyle = "#e8303a";
        for (let j = 0; j < 9; j++) {
          const d = (j - 4) * 4 * z;
          g.fillRect(x + 32 + d - 3, y + 22 + d - 3, 6, 6); g.fillRect(x + 32 + d - 3, y + 22 - d - 3, 6, 6);
        }
      }
    });
  }
  if (st.banner) { // надпись по центру сверху: ВОСПОМИНАНИЕ, СОХРАНЕНО
    const k = springPop((t - st.banner[1]) * 1.6);
    const w = textWidth(st.banner[0]) * 5;
    const y = R(lerp(-60, 100, k));
    panelBox(g, R((1920 - w) / 2) - 24, y - 16, w + 48, 72, st.banner[2] || "#3a2a1e");
    drawText(g, st.banner[0], R((1920 - w) / 2), y, "#ffd23f", 5, { shadow: "#120a06" });
  }
}

// ---------- Заголовок «ОСЕНЬ»: свои толстые буквы с объёмом ----------
const TITLE_GLYPHS = {
  О: [".######.", "########", "##....##", "##....##", "##....##", "##....##", "##....##", "########", ".######."],
  С: [".#######", "########", "##......", "##......", "##......", "##......", "##......", "########", ".#######"],
  Е: ["#######", "#######", "##.....", "######.", "######.", "##.....", "##.....", "#######", "#######"],
  Н: ["##...##", "##...##", "##...##", "#######", "#######", "##...##", "##...##", "##...##", "##...##"],
  Ь: ["##.....", "##.....", "##.....", "######.", "#######", "##...##", "##...##", "#######", "######."],
};
const TITLE_FILL = ["#fff2a8", "#ffe066", "#ffd23f", "#ffc22e", "#ffb021", "#f89a1c", "#f08418", "#e86e16", "#d85a14"];
// cx — центр по x, y — верх букв, cell — размер клетки в экранных пикселях, t0 — когда буквы начинают влетать
function drawTitle(g, word, cx, y, cell, t, t0) {
  const letters = [...word];
  const ws = letters.map((ch) => TITLE_GLYPHS[ch][0].length);
  const total = ws.reduce((a, b) => a + b, 0) + (letters.length - 1) * 2;
  let x = R(cx - total * cell / 2);
  letters.forEach((ch, i) => {
    const k = t0 === undefined ? 1 : springPop((t - t0 - i * 0.12) * 1.5);
    if (k <= 0) { x += (ws[i] + 2) * cell; return; }
    const dy = R((1 - k) * -220), rows = TITLE_GLYPHS[ch];
    const bob = t0 === undefined ? 0 : R(Math.sin(t * 2.2 + i * 0.9) * 0.6) * R(cell / 3);
    const yy = y + dy + bob;
    const cellAt = (cx2, cy2, col) => { g.fillStyle = col; g.fillRect(x + cx2 * cell, yy + cy2 * cell, cell, cell); };
    // обводка: тёмная рамка на клетку вокруг
    rows.forEach((r, j) => { for (let q = 0; q < r.length; q++) if (r[q] === "#") { g.fillStyle = "#2a0e06"; g.fillRect(x + q * cell - R(cell / 2), yy + j * cell - R(cell / 2), cell * 2, cell * 2); } });
    // объём: сдвиг вниз-вправо
    rows.forEach((r, j) => { for (let q = 0; q < r.length; q++) if (r[q] === "#") { g.fillStyle = "#8a2c0c"; g.fillRect(x + q * cell + R(cell / 2), yy + j * cell + R(cell * 0.75), cell, cell); } });
    rows.forEach((r, j) => { for (let q = 0; q < r.length; q++) if (r[q] === "#") cellAt(q, j, TITLE_FILL[j]); });
    // блик
    rows.forEach((r, j) => { if (j < 2) for (let q = 0; q < r.length; q++) if (r[q] === "#" && (q + j) % 3 === 0) { g.fillStyle = "#ffffff"; g.fillRect(x + q * cell + 2, yy + j * cell + 2, R(cell / 3), R(cell / 3)); } });
    x += (ws[i] + 2) * cell;
  });
}
