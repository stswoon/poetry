// ---------- Строки стиха: по две, на мазке белил в нижней трети; кисть открывает слова ----------
const LINES = CFG.lines;
const PAIRS = [];
for (let i = 0; i < LINES.length; i += 2) PAIRS.push([LINES[i], LINES[i + 1]]);
const FS = 58, LH = 74;
function drawVerse(g, t) {
  let pi = -1;
  for (let i = 0; i < PAIRS.length; i++) if (t >= PAIRS[i][0].s - 0.15) pi = i;
  if (pi < 0) return;
  const P = PAIRS[pi], next = PAIRS[pi + 1];
  const endT = next ? next[0].s - 0.15 : EV.fin - 0.3;
  const outU = inv(endT - 0.18, endT, t);
  if (outU >= 1) return;
  reset(g);
  g.font = `${FS}px "DLine"`;
  const tw = Math.max(...P.map((l) => g.measureText(l.text).width));
  const bw = Math.round(tw + 120), bh = LH * 2 + 40;
  const bx = Math.round(W / 2 - bw / 2), by = Math.round(H - 34 - bh);
  // мазок-подложка: проводится кистью слева направо
  const kIn = easeOut(inv(P[0].s - 0.2, P[0].s + 0.15, t));
  const sw = bw * kIn;
  g.save();
  g.globalAlpha = 1 - easeIn(outU);
  g.beginPath(); g.rect(bx - 30, by - 30, sw + 60, bh + 60); g.clip();
  roughPoly(g, [[bx - 10, by + 8], [bx + bw * 0.5, by - 4], [bx + bw + 14, by + 6], [bx + bw + 6, by + bh - 4], [bx + bw * 0.5, by + bh + 6], [bx - 14, by + bh - 6]], 900 + pi, 7);
  paint(g, C.white, 901 + pi, 0, 0.55, 0.97, 1.4);
  g.restore();
  g.save();
  g.globalAlpha = 1 - easeIn(outU);
  g.fillStyle = css(C.indigoD); g.textAlign = "left"; g.textBaseline = "middle";
  P.forEach((l, i) => {
    if (t < l.s - 0.15) return;
    const x = bx + 60, y = Math.round(by + 20 + LH * (i + 0.5) + 2);
    // кисть открывает строку слева направо за ~0,35 с
    const u = easeOut(inv(l.s - 0.15, l.s + 0.25, t));
    g.save();
    if (u < 0.999) { g.beginPath(); g.rect(x - 10, y - LH / 2, (tw + 40) * u, LH); g.clip(); }
    g.fillText(l.text, x, y);
    g.restore();
  });
  g.restore();
}
// заголовок: «Детство» кистевым шрифтом + автор; (x,y) — левый край строки названия
function titleBlock(g, t, x, y, scale, t0, center = false) {
  reset(g);
  const u = easeOut(inv(t0, t0 + 0.9, t));
  if (u <= 0) return;
  const fs = Math.round(230 * scale);
  g.font = `${fs}px "DTitle"`;
  const tw = g.measureText("Детство").width;
  const x0 = Math.round(center ? x - tw / 2 : x), y0 = Math.round(y);
  g.save();
  g.beginPath(); g.rect(x0 - 40, y0 - fs, (tw + 80) * u, fs * 1.6); g.clip();
  g.textBaseline = "alphabetic"; g.textAlign = "left";
  g.fillStyle = css(C.indigoD, 0.55); g.fillText("Детство", x0 + 6, y0 + 7);
  g.fillStyle = css(C.white); g.fillText("Детство", x0, y0);
  g.restore();
  const v = easeOut(inv(t0 + 0.6, t0 + 1.3, t));
  if (v > 0) {
    const afs = Math.round(54 * scale);
    g.font = `${afs}px "DLine"`;
    const s = "Иван Суриков · 1866";
    const aw = g.measureText(s).width;
    const ax = Math.round(center ? x - aw / 2 : x0 + 20), ay = Math.round(y0 + afs * 1.5);
    g.save(); g.globalAlpha = v;
    g.beginPath(); g.rect(ax - 30, ay - afs, (aw + 60) * v, afs * 1.6); g.clip();
    roughPoly(g, [[ax - 24, ay - afs * 0.75], [ax + aw + 26, ay - afs * 0.85], [ax + aw + 20, ay + afs * 0.45], [ax - 20, ay + afs * 0.5]], 950, 4);
    paint(g, C.verm, 951, 0, 0.5, 0.92);
    g.fillStyle = css(C.white); g.textBaseline = "middle"; g.fillText(s, ax, Math.round(ay - afs * 0.15));
    g.restore();
  }
}
