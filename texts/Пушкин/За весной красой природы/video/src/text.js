// ---------- Строки стиха: малярный скотч в нижней трети, текст набрызгивается слева направо ----------
const LN = CFG.lines;
function lineWindow(i) {
  const l = LN[i], a = l.s - 0.12;
  const b = i < LN.length - 1 ? LN[i + 1].s - 0.25 : EV.fin - 0.1;
  return [a, b];
}
function drawVerse(g, t) {
  for (let i = 0; i < LN.length; i++) {
    const [a, b] = lineWindow(i);
    if (t < a || t > b + 0.13) continue;
    const l = LN[i];
    reset(g);
    const fs = 64;
    g.font = `${fs}px "GSub"`;
    const tw = g.measureText(l.text).width;
    const cx = 960, cy = 958;
    const inA = spr(t, a, 0.35), out = easeIn(inv(b, b + 0.12, t));
    const pw = tw + 110, ph = 112;
    g.save();
    g.translate(cx, cy - out * 260); g.globalAlpha = 1 - out;
    g.rotate((i % 2 ? 1 : -1) * 0.012 * (1 - out));
    g.scale(lerp(0.85, 1, inA), lerp(0.85, 1, inA));
    // скотч: тень, лента с рваными краями
    const r = rng(500 + i);
    const tape = (c) => {
      c.beginPath(); c.moveTo(-pw / 2, -ph / 2);
      for (let k = 0; k <= 6; k++) c.lineTo(-pw / 2 + 12 * (k % 2), -ph / 2 + k * ph / 6);
      for (let k = 0; k <= 6; k++) c.lineTo(pw / 2 - 12 * (k % 2), ph / 2 - k * ph / 6);
      c.closePath();
    };
    g.save(); g.globalAlpha *= 0.4; g.fillStyle = "#000"; g.filter = "blur(10px)"; g.translate(8, 12); tape(g); g.fill(); g.restore();
    g.fillStyle = "#f3ead2"; tape(g); g.fill();
    g.save(); tape(g); g.clip();
    g.fillStyle = "rgba(120,95,40,0.10)";
    for (let k = 0; k < 40; k++) g.fillRect(-pw / 2 + r() * pw, -ph / 2 + r() * ph, 3 + r() * 40, 1.5);
    g.restore();
    g.restore();
    // текст ровно (без поворота) — края букв чёткие
    const vis = easeOut(inv(a + 0.05, a + 0.42, t));
    g.save(); g.globalAlpha = 1 - out;
    const tx = Math.round(cx - tw / 2), ty = Math.round(cy - out * 260 + fs * 0.34);
    g.beginPath(); g.rect(tx - 10, ty - fs - 20, (tw + 20) * vis, fs * 1.6); g.clip();
    g.fillStyle = P.ink; g.textBaseline = "alphabetic"; g.fillText(l.text, tx, ty);
    g.restore();
    // облачко распыла на кромке набрызга
    if (vis > 0 && vis < 1) {
      g.save(); g.fillStyle = P.ink; const ex = tx + tw * vis, fr = Math.floor(t * 30);
      for (let k = 0; k < 30; k++) { g.globalAlpha = 0.5 * hash2(fr, k); g.beginPath(); g.arc(ex + (hash2(k, fr) - 0.3) * 40, ty - fs * 0.4 + (hash2(k + 9, fr) - 0.5) * fs, 1 + 3 * hash2(fr + 3, k), 0, TAU); g.fill(); }
      g.restore();
    }
  }
}
