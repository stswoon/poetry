// ---------- Строки стиха: плашка внизу, слова загораются под голос; строфа 2 — облачко реплики мамы ----------
const FONT = "'M PLUS Rounded 1c', sans-serif";
const LINES = CFG.lines;
const PANEL = { cx: 960, y0: 808, lh: 82, size: 60 };
const COUPLETS = [[1, 2], [3, 4], [5, 6], [7, 8], [9, 10], [11, 12]];
// интервал показа пары строк: от начала первой до начала следующей пары (последняя — до конца ролика минус финал)
function coupletSpan(k) {
  const [a] = COUPLETS[k], s = LINES[a - 1].s - 0.12;
  const e = k + 1 < COUPLETS.length ? LINES[COUPLETS[k + 1][0] - 1].s - 0.12 : CFG.ev.fin;
  return [s, e];
}
function measure(g, txt) { return g.measureText(txt).width; }
function drawPanel(g, x0, y0, w, h, speech, a, t) {
  g.save(); g.globalAlpha = a;
  const path = (c) => {
    rr(c, x0, y0, w, h, 46);
    if (speech) { c.moveTo(x0 + w - 190, y0 + 4); c.lineTo(x0 + w - 70, y0 - 74); c.lineTo(x0 + w - 110, y0 + 4); }
  };
  g.shadowColor = "rgba(80,40,120,0.35)"; g.shadowBlur = 0; g.shadowOffsetY = 8;
  path(g); g.fillStyle = speech ? "rgba(255,247,226,0.94)" : "rgba(255,250,252,0.92)"; g.fill();
  g.shadowColor = "transparent"; g.shadowOffsetY = 0;
  path(g); g.lineJoin = "round"; g.lineWidth = 7; g.strokeStyle = css(speech ? C.lamp : C.violet); g.stroke();
  // звёздочки по углам
  sparkle(g, x0 + 30, y0 + 26, 16 + Math.sin(t * 4) * 3, 1, C.yellow);
  sparkle(g, x0 + w - 32, y0 + h - 26, 14 + Math.sin(t * 4 + 2) * 3, 1, C.hot);
  g.restore();
}
function drawVerse(g, t) {
  reset(g);
  let k = -1;
  for (let i = 0; i < COUPLETS.length; i++) { const [s, e] = coupletSpan(i); if (t >= s && t < e) k = i; }
  if (k < 0) return;
  const [s, e] = coupletSpan(k);
  const pair = COUPLETS[k], speech = k === 2 || k === 3;
  g.font = `700 ${PANEL.size}px ${FONT}`;
  const wmax = Math.max(...pair.map((n) => measure(g, LINES[n - 1].text)));
  const pw = Math.round(wmax + 140), ph = PANEL.lh * 2 + 34;
  // вход: пружина снизу; выход: уезжает вниз
  const inU = spr(t, s, 0.6), outU = k + 1 < COUPLETS.length ? easeIn(inv(e - 0.22, e, t)) : 0;
  const dy = Math.round((1 - inU) * 140 + outU * 220);
  const a = clamp(inv(s, s + 0.12, t)) * (1 - outU);
  const x0 = Math.round(PANEL.cx - pw / 2), y0 = PANEL.y0 + dy;
  drawPanel(g, x0, y0, pw, ph, speech, a, t);
  g.save(); g.globalAlpha = a; g.textBaseline = "alphabetic"; g.textAlign = "left";
  pair.forEach((n, j) => {
    const L = LINES[n - 1];
    if (t < L.s - 0.1) return;
    const la = clamp(inv(L.s - 0.1, L.s + 0.06, t));
    const lw = measure(g, L.text) + (L.words.length - 1) * measure(g, " ") * 0.3;
    let x = Math.round(PANEL.cx - lw / 2);
    const by = y0 + 22 + PANEL.lh * (j + 1) - 14 + Math.round((1 - spr(t, L.s - 0.1, 0.45)) * 24);
    const sp = measure(g, " ") * 1.3;
    g.save(); g.globalAlpha *= la;
    for (const w of L.words) {
      const ww = measure(g, w.w);
      const said = t >= w.s, cur = t >= w.s && t < w.e;
      const bump = cur ? 1 + 0.08 * Math.sin(clamp((t - w.s) / Math.max(0.12, w.e - w.s)) * Math.PI) : 1;
      g.save(); g.translate(x + ww / 2, by - 20); g.scale(bump, bump); g.translate(-ww / 2, 20);
      g.lineJoin = "round"; g.lineWidth = 10; g.strokeStyle = "rgba(255,255,255,1)"; g.strokeText(w.w, 0, 0);
      g.fillStyle = css(said ? C.hot : C.text); g.fillText(w.w, 0, 0);
      g.restore();
      x += ww + sp;
    }
    g.restore();
  });
  g.restore();
}
// Заголовок: две строки + автор; u — 0…1 пружина входа, a — прозрачность
function drawTitle(g, t, cx, cy, sc, a, t0) {
  if (a <= 0) return;
  reset(g);
  const lines = ["Кот поёт,", "глаза прищуря…"];
  g.save(); g.globalAlpha = a;
  lines.forEach((txt, i) => {
    const k = spr(t, t0 + i * 0.12, 0.8), s = sc * k;
    if (s <= 0.01) return;
    g.save(); g.translate(Math.round(cx), Math.round(cy + i * 150 * sc)); if (Math.abs(s - 1) > 0.002) g.scale(s, s);
    g.rotate((1 - k) * (i ? 0.08 : -0.08));
    g.font = `800 ${140}px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
    g.fillStyle = css(C.hot); g.strokeStyle = css(C.hot); g.lineWidth = 30;
    g.save(); g.translate(8, 10); g.strokeText(txt, 0, 0); g.fillText(txt, 0, 0); g.restore();
    g.lineWidth = 30; g.strokeStyle = css(C.white); g.strokeText(txt, 0, 0);
    g.lineWidth = 12; g.strokeStyle = css(C.text); g.strokeText(txt, 0, 0);
    const gr = g.createLinearGradient(0, -60, 0, 60); gr.addColorStop(0, "rgb(255,236,120)"); gr.addColorStop(1, "rgb(255,160,70)");
    g.fillStyle = gr; g.fillText(txt, 0, 0);
    g.restore();
  });
  // автор на плашке-пилюле
  const k3 = spr(t, t0 + 0.3, 0.7);
  if (k3 > 0.01) {
    g.save(); g.translate(Math.round(cx), Math.round(cy + 260 * sc)); if (Math.abs(k3 * sc - 1) > 0.002) g.scale(k3 * sc, k3 * sc);
    g.font = `800 52px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle";
    const txt = "Афанасий Фет · 1842", w = measure(g, txt) + 80;
    rr(g, -w / 2, -42, w, 84, 42); g.fillStyle = css(C.violet); g.fill(); g.lineWidth = 6; g.strokeStyle = css(C.white); g.stroke();
    g.fillStyle = css(C.white); g.fillText(txt, 0, 2);
    g.restore();
  }
  // искры вокруг
  for (let i = 0; i < 7; i++) {
    const ph = (t * 0.9 + i / 7) % 1;
    sparkle(g, cx + Math.cos(i * 2.1) * 620 * sc, cy + 60 * sc + Math.sin(i * 1.7) * 200 * sc, 26 * Math.sin(ph * Math.PI) * sc, a, i % 2 ? C.yellow : C.white);
  }
  g.restore();
}
