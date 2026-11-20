// ---------- Строки стиха (по две, слово за словом) и заголовок ----------
const LINES = CFG.lines;
const PAIRS = [];
for (let i = 0; i < LINES.length; i += 2) PAIRS.push([LINES[i], LINES[i + 1]]);
PAIRS.forEach((p, k) => {
  p.s = p[0].s - 0.12;
  p.e = (k + 1 < PAIRS.length ? LINES[(k + 1) * 2].s - 0.35 : EV.fin - 0.3);
});
const FONT_L = "50px StepLine";
const ACC = [255, 214, 110];
function wordsLayout(g, line) {
  g.font = FONT_L;
  const sp = g.measureText(" ").width;
  let x = 0;
  const out = line.words.map((w) => { const wd = g.measureText(w.w).width; const o = { ...w, x, wd }; x += wd + sp; return o; });
  return { ws: out, width: x - sp };
}
function drawVerse(g, t) {
  reset(g);
  for (const p of PAIRS) {
    if (t < p.s - 0.05 || t > p.e + 0.45) continue;
    const ain = spr(t, p.s, 0.55), aout = ease(inv(p.e, p.e + 0.4, t));
    const alpha = clamp((t - p.s) / 0.2) * (1 - aout);
    if (alpha <= 0.01) continue;
    const L = p.map((l) => wordsLayout(g, l));
    const wmax = Math.max(L[0].width, L[1].width);
    const lh = 66, padX = 44, padY = 26;
    const bw = Math.round(wmax + padX * 2), bh = Math.round(lh * 2 + padY * 2 - 12);
    const dy = Math.round((1 - ain) * 46 - aout * 24);
    const bx = Math.round(W / 2 - bw / 2), by = Math.round(H - 86 - bh + dy);
    g.globalAlpha = alpha;
    g.fillStyle = "rgba(12,18,34,0.72)";
    g.beginPath(); g.roundRect(bx, by, bw, bh, 22); g.fill();
    g.fillStyle = "rgba(255,255,255,0.10)"; g.fillRect(bx + 22, by, bw - 44, 2);
    g.font = FONT_L; g.textBaseline = "alphabetic"; g.textAlign = "left";
    L.forEach((lay, li) => {
      const x0 = Math.round(W / 2 - lay.width / 2), y0 = by + padY + 46 + li * lh;
      for (const w of lay.ws) {
        const said = t >= w.s, cur = t >= w.s - 0.03 && t < w.e + 0.08;
        g.fillStyle = cur ? css(ACC) : said ? "rgb(255,255,255)" : "rgb(150,156,172)";
        const lift = cur ? Math.round(-3 * Math.sin(clamp((t - w.s) / Math.max(0.12, w.e - w.s)) * Math.PI)) : 0;
        g.fillText(w.w, x0 + Math.round(w.x), y0 + lift);
      }
    });
    g.globalAlpha = 1;
  }
}
// заголовок: буквы падают сверху на пружине, затем стоят на целых координатах (резкость)
const TITLE = ["ПОЛНО, СТЕПЬ МОЯ,", "СПАТЬ БЕСПРОБУДНО…"];
const AUTHOR = "Иван Саввич Никитин · 1854";
function drawTitle(g, t, cx, cy, size, alpha, t0, o = {}) {
  if (alpha <= 0.01) return;
  reset(g);
  g.globalAlpha = alpha;
  g.font = `${size}px StepTitle`; g.letterSpacing = `${Math.round(size * 0.06)}px`;
  g.textBaseline = "alphabetic"; g.textAlign = "left";
  const lh = Math.round(size * 1.12);
  TITLE.forEach((line, li) => {
    const full = g.measureText(line).width;
    const x0 = Math.round(cx - full / 2), y0 = Math.round(cy + li * lh);
    let k = 0;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      const xi = g.measureText(line.slice(0, i)).width;
      const s = spr(t, t0 + (li * 9 + i) * 0.028, 0.6);
      if (s <= 0.001) continue;
      const dy = Math.round((1 - s) * -60);
      g.fillStyle = "rgba(10,16,40,0.35)"; g.fillText(ch, x0 + Math.round(xi) + 3, y0 + dy + 5);
      g.fillStyle = o.col || "#ffffff"; g.fillText(ch, x0 + Math.round(xi), y0 + dy);
      k++;
    }
  });
  g.letterSpacing = "0px";
  const sa = ease(inv(t0 + 0.9, t0 + 1.4, t));
  if (sa > 0) {
    g.globalAlpha = alpha * sa;
    const ay = Math.round(cy + lh * 2 - size * 0.25);
    g.font = `${Math.round(size * 0.42)}px StepAuth`; g.letterSpacing = "3px"; g.textAlign = "center";
    g.fillStyle = "rgba(10,16,40,0.35)"; g.fillText(AUTHOR, Math.round(cx) + 2, ay + 3);
    g.fillStyle = o.col2 || css(ACC); g.fillText(AUTHOR, Math.round(cx), ay);
    const lw = Math.round(size * 1.2), half = Math.round(g.measureText(AUTHOR).width / 2 + size * 0.35);
    g.fillStyle = o.col2 || css(ACC);
    g.fillRect(Math.round(cx) - half - lw, ay - Math.round(size * 0.15), lw, 3);
    g.fillRect(Math.round(cx) + half, ay - Math.round(size * 0.15), lw, 3);
    g.letterSpacing = "0px"; g.textAlign = "left";
  }
  g.globalAlpha = 1;
}
