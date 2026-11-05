// ---------- Разворот 2: «Вянет и желтеет травка на лугах, только зеленеет озимь на полях» ----------

const GRASS = [];
{
  const r = mulberry32(72);
  for (let i = 0; i < 13; i++) GRASS.push({ a: lerp(-0.48, 0.48, i / 12) + (r() - 0.5) * 0.08, L: 330 + r() * 150, w: 10 + r() * 4, c0: (r() - 0.5) * 0.22,
    tone: r(), head: i % 3 === 1, i });
}
const GB = { x: 312, y: 700 }; // где связан пучок
const HILLS = []; for (let x = 50; x <= 800; x += 18) HILLS.push([x, 600 + 22 * Math.sin(x * 0.011) + 12 * Math.sin(x * 0.029 + 1)]);
const SPROUTS = [];
{ const r = mulberry32(88); for (let i = 0; i < 30; i++) SPROUTS.push({ x: 128 + i * 20.4 + (r() - 0.5) * 8, l1: 42 + r() * 30, l2: 36 + r() * 26, a1: -0.18 - r() * 0.2, a2: 0.15 + r() * 0.22, ph: r() * 6, i }); }
const STRIP = []; { const r = mulberry32(13); for (let x = 108; x <= 734; x += 12) STRIP.push([x, 790 + (r() - 0.5) * 6]); for (let x = 734; x >= 108; x -= 12) STRIP.push([x, 840 + (r() - 0.5) * 6]); }
const FURROWS = [0, 1, 2, 3].map((i) => { const pts = []; for (let x = 96; x <= 750; x += 26) pts.push([x, 856 + i * 13 + 4 * Math.sin(x * 0.01 + i) - (x - 96) * 0.012 * (i - 1.5)]); return pts; });

function blade(c, x, y, L, w, ang, bend, col) {
  const n = 16, P = []; let px = x, py = y, th = ang;
  for (let i = 0; i <= n; i++) { const s = i / n; P.push([px, py, th]); th = ang + bend * s * s * 2.4; px += Math.cos(th) * L / n; py += Math.sin(th) * L / n; }
  c.beginPath();
  for (let i = 0; i <= n; i++) { const [qx, qy, q] = P[i], h = w / 2 * Math.pow(1 - i / n, 0.8); c.lineTo(qx + Math.sin(q) * h, qy - Math.cos(q) * h); }
  for (let i = n; i >= 0; i--) { const [qx, qy, q] = P[i], h = w / 2 * Math.pow(1 - i / n, 0.8); c.lineTo(qx - Math.sin(q) * h, qy + Math.cos(q) * h); }
  c.closePath(); c.fillStyle = css(col); c.fill();
  return P[n];
}
// Метёлка тимофеевки на кончике стебля
function spike(c, x, y, th, col) {
  c.save(); c.translate(x, y); c.rotate(th); c.fillStyle = css(col);
  c.beginPath(); c.ellipse(34, 0, 38, 7, 0, 0, TAU); c.fill();
  c.fillStyle = css(mixc(col, [60, 40, 20], 0.25)); for (let i = 0; i < 9; i++) { c.beginPath(); c.arc(6 + i * 7.5, (i % 2 ? 3 : -3), 2, 0, TAU); c.fill(); }
  c.restore();
}

function drawLeft2(c, t) {
  c.drawImage(PAPER_L[1], 0, 0);
  // на «лугах» карандаш рисует холмы луга
  pencil(c, HILLS, sstep(prog(t, EV.lug - 0.12, EV.lug + 0.7)), 2.4, 0.5, 4);
  // пучок травы: никнет на «вянет», желтеет на «желтеет»
  const dv = sstep(prog(t, EV.vya - 0.08, EV.vya + 0.8));
  c.save(); c.shadowColor = "rgba(60,38,18,0.28)"; c.shadowBlur = 6; c.shadowOffsetX = 3; c.shadowOffsetY = 4;
  for (const g of GRASS) {
    const yv = sstep(prog(t, EV.zhe - 0.12 + g.i * 0.035, EV.zhe + 0.75 + g.i * 0.035));
    const col = mixc(mixc(K.green, K.greenL, g.tone), mixc(K.straw, K.strawD, g.tone), yv);
    const bend = g.c0 + Math.sign(g.a || 0.01) * (0.08 + 0.3 * dv);
    const tip = blade(c, GB.x + g.a * 30, GB.y, g.L * (1 - 0.06 * dv), g.w, -Math.PI / 2 + g.a, bend, col);
    if (g.head) spike(c, tip[0], tip[1], tip[2], mixc(K.greenD, K.strawD, yv));
  }
  c.restore();
  tape(c, GB.x, GB.y - 46, 148, 38, 0.12, 21);
  // озимь: полоска земли, ростки вырастают на «только» и вспыхивают на «зеленеет»
  c.save(); c.shadowColor = "rgba(60,38,18,0.3)"; c.shadowBlur = 6; c.shadowOffsetY = 3;
  c.beginPath(); STRIP.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fillStyle = "#94693f"; c.fill(); c.restore();
  { const r = mulberry32(5); c.fillStyle = "rgba(60,35,15,0.35)"; for (let i = 0; i < 160; i++) c.fillRect(110 + r() * 620, 794 + r() * 42, 2, 2); }
  const glow = sstep(prog(t, EV.zel - 0.05, EV.zel + 0.35)) * (1 - 0.6 * sstep(prog(t, EV.zel + 0.6, EV.zel + 1.6)));
  if (glow > 0) { const g = c.createRadialGradient(420, 770, 20, 420, 770, 420); g.addColorStop(0, `rgba(150,235,110,${0.4 * glow})`); g.addColorStop(1, "rgba(150,235,110,0)"); c.fillStyle = g; c.fillRect(0, 500, PW, 420); }
  for (const s of SPROUTS) {
    const k = springSoft((t - (EV.tol - 0.15 + s.i * 0.018)) * 1.6); if (k <= 0) continue;
    const sw = 0.04 * Math.sin(t * 2.4 + s.ph), col = mixc(K.winter, K.winterL, glow * 0.8);
    blade(c, s.x, 796, s.l1 * k, 6, -Math.PI / 2 + s.a1 + sw, -0.05, col);
    blade(c, s.x + 2, 796, s.l2 * k, 5, -Math.PI / 2 + s.a2 + sw, 0.06, mixc(col, K.greenD, 0.2));
  }
  tape(c, 118, 814, 70, 30, 1.2, 22); tape(c, 724, 816, 70, 30, -1.1, 23);
  // на «полях» карандаш проводит борозды поля
  FURROWS.forEach((f, i) => pencil(c, f, sstep(prog(t, EV.pol - 0.1 + i * 0.1, EV.pol + 0.55 + i * 0.1)), 2, 0.45, 30 + i));
}

// Колос ржи на правой странице
function ryeEar(c) {
  c.save();
  stem(c, [[640, 905], [680, 840], [712, 790]], 4, K.strawD);
  c.translate(712, 790); c.rotate(-0.95);
  c.shadowColor = "rgba(60,38,18,0.3)"; c.shadowBlur = 4; c.shadowOffsetY = 2;
  for (let i = 0; i < 9; i++) for (const d of [-1, 1]) { c.save(); c.translate(i * 14, 0); c.rotate(d * 0.5); c.beginPath(); c.ellipse(9, 0, 11, 5, 0, 0, TAU); c.fillStyle = css(mixc(K.straw, K.ochre, (i % 3) / 3)); c.fill(); c.restore(); }
  c.shadowColor = "transparent"; c.strokeStyle = css(K.strawD, 0.8); c.lineWidth = 1.2;
  for (let i = 0; i < 9; i++) for (const d of [-1, 1]) { c.beginPath(); c.moveTo(i * 14 + 16, d * 6); c.lineTo(i * 14 + 62, d * 26); c.stroke(); }
  c.restore();
}
