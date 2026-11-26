// ---------- Плашка рассказчика: строки стиха по две, под голос ----------
const LINES = CFG.lines;
// пары строк: 1–2, 3–4 в каждой строфе
const PAIRS = [];
for (let i = 0; i < LINES.length; i += 2) PAIRS.push([LINES[i], LINES[i + 1]]);
function drawVerse(g, t) {
  // какая пара сейчас: от начала первой строки (−0.15) до начала следующей пары
  let pi = -1;
  for (let i = 0; i < PAIRS.length; i++) if (t >= PAIRS[i][0].s - 0.15) pi = i;
  if (pi < 0) return;
  const P = PAIRS[pi];
  const next = PAIRS[pi + 1];
  const endT = next ? next[0].s - 0.15 : EV.fin - 0.2;
  // уход: если до следующей пары есть пауза больше 0.8 с — плашка держится и уезжает перед сменой
  const outU = inv(endT - 0.2, endT, t);
  if (outU >= 1 && !next) return;
  const fs = 56, lh = 72, padX = 38, padY = 18;
  g.save(); reset(g);
  g.font = `${fs}px ComicLine`;
  const tw = Math.max(...P.map((l) => g.measureText(l.text).width));
  const bw = Math.round(tw + padX * 2), bh = Math.round(lh * 2 + padY * 2);
  const bx = Math.round(W / 2 - bw / 2), by = Math.round(H - 26 - bh);
  const kIn = spr(t, P[0].s - 0.15, 0.45);
  const k = clamp(kIn, 0, 1.2) * (1 - easeIn(outU));
  if (k <= 0.01) { g.restore(); return; }
  g.translate(W / 2, by + bh / 2);
  if (Math.abs(k - 1) > 0.002) g.scale(lerp(0.85, 1, clamp(k, 0, 1.2)), k);
  g.translate(-W / 2, -(by + bh / 2));
  // тень растром и плашка
  g.fillStyle = dots(g, C.ink, 2.4, 8, 45, 0.85); g.fillRect(bx + 10, by + 10, bw, bh);
  g.fillStyle = css(C.yel); g.fillRect(bx, by, bw, bh);
  g.lineWidth = 6; g.strokeStyle = INK; g.strokeRect(bx, by, bw, bh);
  g.fillStyle = INK; g.textAlign = "left"; g.textBaseline = "middle";
  P.forEach((l, i) => {
    const appear = t >= l.s - 0.15;
    if (!appear) return;
    const u = spr(t, l.s - 0.15, 0.35);
    const x = bx + padX, y = by + padY + lh * (i + 0.5) + 2;
    g.save(); g.globalAlpha = clamp(u * 1.5);
    if (u < 0.995) { g.translate(x, y); g.translate(0, (1 - clamp(u)) * 18); g.translate(-x, -y); }
    g.fillText(l.text, x, Math.round(y));
    g.restore();
  });
  g.restore();
}
