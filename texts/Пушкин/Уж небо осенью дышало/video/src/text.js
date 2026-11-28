// ---------- Строки стиха: полоса бумаги с рваным краем в нижней трети, тушь пишет слева направо ----------
const LN = CFG.lines;
const KEYW = new Set(["дышало", "блистало", "день", "сень", "обнажалась", "туман", "караван", "югу", "пора", "двора"]);
const nrm = (s) => s.toLowerCase().replace(/ё/g, "е").replace(/[^а-я]/g, "");
function lineWindow(i) {
  const l = LN[i], a = l.s - 0.12;
  const b = i < LN.length - 1 ? LN[i + 1].s - 0.38 : EV.fin - 0.1;
  return [a, b];
}
function tornStrip(c, pw, ph, seed) {
  c.beginPath(); c.moveTo(-pw / 2, -ph / 2);
  const n = 22;
  for (let k = 0; k <= n; k++) c.lineTo(-pw / 2 + k * pw / n, -ph / 2 + (hash2(k, seed) - 0.5) * 9);
  for (let k = 0; k <= 4; k++) c.lineTo(pw / 2 + (hash2(k, seed + 1) - 0.5) * 12, -ph / 2 + k * ph / 4);
  for (let k = n; k >= 0; k--) c.lineTo(-pw / 2 + k * pw / n, ph / 2 + (hash2(k, seed + 2) - 0.5) * 9);
  for (let k = 4; k >= 0; k--) c.lineTo(-pw / 2 + (hash2(k, seed + 3) - 0.5) * 12, -ph / 2 + k * ph / 4);
  c.closePath();
}
function drawVerse(g, t) {
  for (let i = 0; i < LN.length; i++) {
    const [a, b] = lineWindow(i);
    if (t < a || t > b + 0.24) continue;
    const l = LN[i];
    reset(g);
    const fs = 62;
    g.font = `${fs}px "GLine"`;
    const parts = l.words.map((w) => ({ ...w, wd: g.measureText(w.w).width }));
    const sp = g.measureText(" ").width;
    const tw = parts.reduce((s, p) => s + p.wd, 0) + sp * (parts.length - 1);
    const cx = 960, cy = 962;
    const inA = spr(t, a, 0.35), out = easeIn(inv(b, b + 0.24, t));
    const pw = tw + 120, ph = 104;
    const dx = -out * 1300; // уходит влево с ветром
    g.save();
    g.translate(Math.round(cx + dx), cy); g.globalAlpha = 1 - out * 0.6;
    g.scale(lerp(0.8, 1, clamp(inA, 0, 1.2)), lerp(0.8, 1, clamp(inA, 0, 1.2)));
    g.save(); g.globalAlpha *= 0.35; g.fillStyle = "#2a2018"; g.filter = "blur(8px)"; g.translate(6, 10); tornStrip(g, pw, ph, 300 + i); g.fill(); g.restore();
    g.fillStyle = "#f8f0dc"; tornStrip(g, pw, ph, 300 + i); g.fill();
    // акварельная подкладка под строкой
    g.save(); tornStrip(g, pw, ph, 300 + i); g.clip(); g.globalAlpha = 0.22; g.fillStyle = i % 2 ? P.ochreL : "#c9d3d6"; g.beginPath(); g.ellipse(0, 10, pw * 0.48, ph * 0.42, 0, 0, TAU); g.fill(); g.restore();
    g.restore();
    // текст ровно и в целых координатах (резкий край букв); проявляется кистью слева направо
    const vis = easeOut(inv(a + 0.02, a + 0.38, t));
    g.save(); g.globalAlpha = 1 - out;
    const tx = Math.round(cx + dx - tw / 2), ty = Math.round(cy + fs * 0.33);
    g.beginPath(); g.rect(tx - 12, ty - fs - 20, (tw + 24) * vis, fs * 1.7); g.clip();
    g.textBaseline = "alphabetic";
    let x = tx;
    for (const p of parts) {
      const key = KEYW.has(nrm(p.w)) && t >= p.s - 0.05;
      g.fillStyle = key ? P.crimson : P.ink; g.fillText(p.w, Math.round(x), ty);
      x += p.wd + sp;
    }
    g.restore();
    if (vis > 0 && vis < 1) splatter(g, tx + tw * vis, ty - fs * 0.35, 30, 10, P.ink, Math.floor(t * 30), 0.6);
  }
}
// ---------- Названия: кисть пишет тушью по акварельной подкладке ----------
function brushText(g, text, x, y, fs, prog, col, font = "GTitle") {
  g.font = `${fs}px "${font}"`; const tw = g.measureText(text).width;
  const tx = Math.round(x - tw / 2), ty = Math.round(y);
  g.save(); g.beginPath(); g.rect(tx - 20, ty - fs * 1.1, (tw + 40) * prog, fs * 1.5); g.clip();
  g.fillStyle = col; g.fillText(text, tx, ty); g.restore();
  if (prog > 0.02 && prog < 0.99) { const ex = tx + tw * prog; splatter(g, ex, ty - fs * 0.35, fs * 0.5, 12, col, Math.floor(prog * 60), 0.7); }
  return tw;
}
function drawTitleIntro(g, t) {
  // название пишется в небе над прудом и сдувается ветром перед первой строкой
  const blow = easeIn(inv(T0.wake + 0.3, EV.L1 - 0.12, t));
  if (blow >= 1) return;
  reset(g);
  g.save(); g.globalAlpha = 1 - blow; g.translate(-blow * 1100, -blow * 80);
  const wa = easeOut(inv(0.05, 0.6, t));
  g.save(); g.globalAlpha *= wa; g.drawImage(SPR.titleWash, 960 - 800 * 0.85, 250 - 175 * 0.85, 1800 * 0.85, 420 * 0.85); g.restore();
  brushText(g, "Уж небо осенью дышало…", 960, 260, 112, easeIO(inv(0.15, 1.5, t)), P.ink);
  brushText(g, "А. С. Пушкин · из романа «Евгений Онегин»", 960, 350, 44, easeOut(inv(1.2, 1.8, t)), P.umberD, "GSub");
  g.restore();
}
function drawTitleFinal(g, t) {
  reset(g);
  const a = T0.s7 + 0.25;
  g.save(); g.globalAlpha = easeOut(inv(a - 0.1, a + 0.5, t)); g.drawImage(SPR.titleWash, 960 - 900, 380 - 210, 1800, 420); g.restore();
  brushText(g, "Уж небо", 960, 360, 170, easeIO(inv(a, a + 0.7, t)), P.ink);
  brushText(g, "осенью дышало…", 960, 530, 170, easeIO(inv(a + 0.55, a + 1.4, t)), P.ink);
  brushText(g, "А. С. Пушкин", 960, 640, 62, easeOut(inv(a + 1.3, a + 1.8, t)), P.crimson, "GSub");
  brushText(g, "из романа «Евгений Онегин»", 960, 710, 42, easeOut(inv(a + 1.6, a + 2.1, t)), P.umberD, "GSub");
}
