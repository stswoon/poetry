// ---------- Строки стиха: по две на светлой рейке внизу; слова выжигаются под голос ----------
const LINES = CFG.lines;
const PAIRS = [];
for (let i = 0; i < LINES.length; i += 2) PAIRS.push([LINES[i], LINES[i + 1]]);
const FS = 56, LH = 70;
function drawVerse(g, t) {
  let pi = -1;
  for (let i = 0; i < PAIRS.length; i++) if (t >= PAIRS[i][0].s - 0.14) pi = i;
  if (pi < 0) return;
  const Pp = PAIRS[pi], next = PAIRS[pi + 1];
  // рейка уходит не раньше конца последнего слова пары
  const lastE = Pp[Pp.length - 1].e;
  const outS = next ? Math.max(next[0].s - 0.3, lastE + 0.03) : EV.fin - 0.36;
  const outU = inv(outS, outS + 0.14, t);
  if (outU >= 1) return;
  reset(g);
  g.font = `${FS}px "ZLine"`;
  const tw = Math.max(...Pp.map((l) => g.measureText(l.text).width));
  const bw = Math.max(760, Math.round(tw + 130)), bh = LH * 2 + 44;
  const bx = Math.round(W / 2 - bw / 2), by = Math.round(H - 30 - bh);
  // рейка въезжает снизу на пружине
  const kin = spr(t, Pp[0].s - 0.14, 0.4);
  const dy = Math.round((1 - Math.min(1, kin)) * 260 + easeIn(outU) * 260);
  g.save(); g.translate(0, dy);
  g.save(); g.shadowColor = "rgba(20,10,4,0.6)"; g.shadowBlur = 26; g.shadowOffsetY = 10;
  rrect(g, bx, by, bw, bh, 20); g.fillStyle = css(C.birchD); g.fill(); g.restore();
  rrect(g, bx, by, bw, bh, 20); g.fillStyle = pat(g, "board", bx, by, 1.2); g.fill();
  rrect(g, bx, by, bw, bh, 20); g.fillStyle = "rgba(255,248,232,0.45)"; g.fill();
  rrect(g, bx + 8, by + 8, bw - 16, bh - 16, 14); g.strokeStyle = css(C.burnt, 0.4); g.lineWidth = 3; g.stroke();
  // слова: светлый оттиск сразу, выжигание — со словом голоса
  g.textAlign = "left"; g.textBaseline = "middle";
  Pp.forEach((l, i) => {
    if (t < l.s - 0.12) return;
    const lw = g.measureText(l.text).width;
    let x = Math.round(W / 2 - lw / 2);
    const y = Math.round(by + 22 + LH * (i + 0.5) + 2);
    const sp = g.measureText(" ").width;
    for (const w of l.words) {
      const ww = g.measureText(w.w).width;
      const u = clamp((t - (w.s - 0.12)) / 0.22);
      g.fillStyle = css(C.burnt, 0.22); g.fillText(w.w, x, y);
      if (u > 0) { g.save(); g.globalAlpha = u; g.fillStyle = css(C.burnt); g.fillText(w.w, x, y); g.restore(); }
      x += ww + sp;
    }
  });
  g.restore();
}
