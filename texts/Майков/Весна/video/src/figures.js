// Подснежник, снежок, снежинки, слёзы, туча, солнце, птица.
const GROUND = (x) => 826 + 10 * Math.sin(x * 0.012);

// ---------- Подснежник ----------
const FL = { x: 500, y: 830, h: 440 };
const bez = (p, s) => { const m = 1 - s; return [m * m * m * p[0][0] + 3 * m * m * s * p[1][0] + 3 * m * s * s * p[2][0] + s * s * s * p[3][0], m * m * m * p[0][1] + 3 * m * m * s * p[1][1] + 3 * m * s * s * p[2][1] + s * s * s * p[3][1]]; };
const STEM = [[FL.x, FL.y], [FL.x - 34, FL.y - 210], [FL.x - 30, FL.y - FL.h - 10], [FL.x + 112, FL.y - FL.h + 6]];
const stemU = (t) => sstep(prog(t, EV.L1 - 0.15, EV.L1 + 0.75));
function headAng(t) {
  const droop = sstep(prog(t, EV.slo - 0.1, EV.gor + 0.2)) * (1 - sstep(prog(t, EV.per - 0.1, EV.per + 0.8)));
  const bow = t > EV.cve ? 0.14 * Math.exp(-(t - EV.cve) * 2.4) * Math.sin((t - EV.cve) * 9) : 0;
  return 0.03 * Math.sin(t * 1.35) + bow + droop * 0.2;
}
function snowdrop(c, t) {
  if (t < EV.L1 - 0.15) return;
  const su = stemU(t);
  // листья за стеблем
  leaf(c, FL.x - 4, FL.y + 2, 330, 56, -1.9, t, EV.L2 - 0.05, -0.08);
  leaf(c, FL.x + 6, FL.y + 2, 268, 50, -1.2, t, EV.L2 + 0.14, 0.08);
  // стебель
  c.save(); c.lineCap = "round"; c.lineJoin = "round";
  for (const [lw, col] of [[15, COB], [6, MID]]) { c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); for (let i = 0; i <= 44 * su; i++) { const p = bez(STEM, i / 44); if (i === 0) c.moveTo(p[0], p[1]); else c.lineTo(p[0], p[1]); } c.stroke(); }
  c.restore();
  const k = t < EV.gol + 0.1 ? 0 : springPop((t - EV.gol - 0.1) * 1.3);
  if (k <= 0.001) return;
  const op = t < EV.cve - 0.1 ? 0 : springSoft((t - EV.cve + 0.1) * 1.5);
  const P = STEM[3];
  c.save(); c.translate(P[0], P[1]); c.rotate(headAng(t)); c.scale(k, k);
  const sp = 0.1 + 0.9 * op;
  for (const [d, len, w] of [[-0.62, 200, 96], [0.62, 200, 96], [0, 214, 104]]) gs(c, 0, 8, len * (0.76 + 0.24 * op), w, Math.PI / 2 + d * sp, 1, 0, d > 0 ? -1 : 1, { d: COB, m: MID, l: "#a9c6f6" });
  if (op > 0.2) for (const d of [-0.28, 0.28]) gs(c, 0, 14, 128, 60, Math.PI / 2 + d * sp, sstep(prog(op, 0.2, 0.8)), 0, d > 0 ? -1 : 1, { d: "#ffffff", m: "#cfe0fb", l: SKY });
  gs(c, 0, 18, 58, 24, Math.PI / 2, op, 0, 1, { d: "#ffffff", m: PALE, l: COB });
  dab(c, 0, 6, 21, COB, MID);
  gs(c, -4, -8, 58, 20, -2.4, 1, 0.05, 1);
  c.restore();
}
// Искры на «чистый»
const SPARKS = []; { const r = mulberry32(58); for (let i = 0; i < 12; i++) { const b = r() * TAU; SPARKS.push({ b, d: 110 + r() * 110, s: 11 + r() * 14, t: EV.chi - 0.02 + r() * 0.42 }); } }
function star(c, x, y, s, col) { for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; gs(c, x, y, s, s * 0.32, a, 1, 0, 1, { d: col, m: col, l: "#ffffff" }); } }
function sparks(c, t) {
  const P = STEM[3];
  for (const q of SPARKS) { const a = t - q.t; if (a < 0 || a > 0.95) continue; const u = sstep(a / 0.25) * (1 - sstep(prog(a, 0.55, 0.95))); star(c, P[0] + Math.cos(q.b) * q.d, P[1] + 110 + Math.sin(q.b) * q.d * 0.7, q.s * u, MID); }
}

// ---------- Снежок ----------
const MO = { x0: 620, x1: 930, base: 832, h: 196 };
const moundMelt = (t) => sstep(prog(t, EV.E4 - 0.15, EV.E5 + 0.1));
function moundY(x, m) { const u = (x - MO.x0) / (MO.x1 - MO.x0); return GROUND(x) + 1 - MO.h * (1 - 0.93 * m) * Math.pow(Math.sin(Math.PI * u), 0.75) * (1 + 0.07 * Math.sin(u * 9)); }
function mound(c, t) {
  if (t < EV.L3 - 0.05) return;
  const reveal = sstep(prog(t, EV.L3 - 0.05, EV.pod + 0.75)), m = moundMelt(t);
  if (m >= 0.995) return;
  c.save();
  c.beginPath(); c.rect(MO.x0 - 6, 400, (MO.x1 - MO.x0 + 12) * reveal, 460); c.clip();
  const path = () => { c.beginPath(); for (let x = MO.x0; x <= MO.x1; x += 6) { if (x === MO.x0) c.moveTo(x, moundY(x, m)); else c.lineTo(x, moundY(x, m)); } c.lineTo(MO.x1, moundY(MO.x1, m)); for (let x = MO.x1; x >= MO.x0; x -= 6) c.lineTo(x, GROUND(x) + 1); c.closePath(); };
  path(); const g = c.createLinearGradient(0, MO.base - MO.h, 0, MO.base); g.addColorStop(0, "rgba(186,208,250,.9)"); g.addColorStop(1, "rgba(232,240,254,.72)"); c.fillStyle = g; c.fill();
  // сквозистый: кружево, сквозь снег видно блюдо
  const lace = sstep(prog(t, EV.skv - 0.1, EV.skv + 0.5));
  if (lace > 0) {
    c.save(); path(); c.clip(); c.globalAlpha = lace * 0.8; c.strokeStyle = MID; c.lineWidth = 2.6;
    for (let d = -300; d < 460; d += 34) { c.beginPath(); c.moveTo(MO.x0 + d, MO.base); c.lineTo(MO.x0 + d + 220, MO.base - 220); c.stroke(); c.beginPath(); c.moveTo(MO.x0 + d + 220, MO.base); c.lineTo(MO.x0 + d, MO.base - 220); c.stroke(); }
    for (let d = 0; d < 11; d++) for (let e = 0; e < 7; e++) dot(c, MO.x0 + 8 + d * 34 + (e % 2) * 17, MO.base - 8 - e * 17, 4, WHITE);
    c.restore();
  }
  c.beginPath(); for (let x = MO.x0; x <= MO.x1; x += 6) { if (x === MO.x0) c.moveTo(x, moundY(x, m)); else c.lineTo(x, moundY(x, m)); }
  c.lineTo(MO.x1, moundY(MO.x1, m));
  c.lineCap = "round"; c.strokeStyle = COB; c.lineWidth = 7; c.stroke();
  c.strokeStyle = "rgba(255,255,255,.85)"; c.lineWidth = 2.5; c.stroke();
  c.restore();
}
// Снежинки падают на «снежок»
const FLAKES = []; { const r = mulberry32(12); for (let i = 0; i < 16; i++) FLAKES.push({ x: 800 + r() * 125, y0: 150 + r() * 130, t: EV.L4 - 0.25 + i * 0.13, s: 17 + r() * 15, ph: r() * 6, v: 150 + r() * 70 }); }
function flake(c, x, y, s, rot) {
  c.save(); c.translate(x, y); c.rotate(rot); c.strokeStyle = MID; c.lineWidth = Math.max(1.4, s * 0.13); c.lineCap = "round";
  for (let i = 0; i < 6; i++) { c.rotate(TAU / 6); c.beginPath(); c.moveTo(0, 0); c.lineTo(s, 0); c.moveTo(s * 0.62, 0); c.lineTo(s * 0.86, s * 0.26); c.moveTo(s * 0.62, 0); c.lineTo(s * 0.86, -s * 0.26); c.stroke(); }
  c.restore();
}
function flakes(c, t) {
  for (const f of FLAKES) { const a = t - f.t; if (a < 0 || a > 2.8) continue; const y = f.y0 + a * f.v, x = f.x + 18 * Math.sin(a * 2 + f.ph); const ground = moundY(clamp(x, MO.x0 + 1, MO.x1 - 1), moundMelt(t)); if (y > ground) continue; c.save(); c.globalAlpha = sstep(a / 0.3) * (1 - sstep(prog(t, EV.E4 + 0.4, EV.E4 + 1.1))); flake(c, x, y, f.s, a * 0.6 + f.ph); c.restore(); }
}

// ---------- Слёзы ----------
const TEARS = [];
{
  const P = STEM[3];
  // большая: с подснежника на «слёзы»; остальные: с тающего снежка и с лепестка
  TEARS.push({ x: P[0] + 8, y0: P[1] + 214, t: EV.slo + 0.02, s: 2.3, land: GROUND(P[0]) + 2 });
  const r = mulberry32(90), xs = [668, 742, 812, 870, 908, 700, 845];
  xs.forEach((x, i) => TEARS.push({ x, y0: moundY(x, 0.35) + 2, t: EV.L5 - 0.32 + i * 0.27, s: 1.2 + r() * 0.6, land: GROUND(x) + 2 }));
  TEARS.push({ x: P[0] - 14, y0: P[1] + 200, t: EV.slo + 0.65, s: 1.7, land: GROUND(P[0] - 14) + 2 });
}
function tear(c, x, y, s) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.beginPath(); c.moveTo(0, -26); c.bezierCurveTo(4, -12, 15, -3, 15, 8); c.bezierCurveTo(15, 19, 7, 25, 0, 25); c.bezierCurveTo(-7, 25, -15, 19, -15, 8); c.bezierCurveTo(-15, -3, -4, -12, 0, -26); c.closePath();
  const g = c.createLinearGradient(-15, 0, 15, 0); g.addColorStop(0, COB); g.addColorStop(0.55, MID); g.addColorStop(1, SKY); c.fillStyle = g; c.fill(); c.lineWidth = 2.4 / s; c.strokeStyle = "#ffffff"; c.stroke();
  c.beginPath(); c.ellipse(-5, 8, 3, 6, 0.3, 0, TAU); c.fillStyle = "rgba(255,255,255,.9)"; c.fill();
  c.restore();
}
function tears(c, t) {
  for (const q of TEARS) {
    const a = t - q.t; if (a < 0) continue;
    const fall = q.y0 + 80 * a * a * 4, k = sstep(a / 0.18);
    if (fall < q.land) { tear(c, q.x, fall, q.s * k); continue; }
    const hit = q.t + Math.sqrt((q.land - q.y0) / 320), b = t - hit;
    if (b < 0.7) { c.save(); c.globalAlpha = 1 - sstep(b / 0.7); c.strokeStyle = MID; c.lineWidth = 3.5; c.beginPath(); c.ellipse(q.x, q.land, 10 + b * 66, 3 + b * 15, 0, 0, TAU); c.stroke(); c.restore(); }
  }
}

// ---------- Туча «о горе былом» ----------
const cloudC = mkCanvas(W, H), cloudX = cloudC.getContext("2d");
const CLOUD = [[0, 0, 80], [86, -30, 92], [186, -8, 82], [270, 16, 62], [-84, 18, 62], [60, 34, 72], [172, 40, 66]];
function cloud(c, t) {
  const a0 = EV.L6 - 0.5, a1 = EV.byl + 0.3, a2 = EV.byl + 1.3;
  if (t < a0 || t > a2) return;
  const u = springSoft((t - a0) * 1.5), go = sstep(prog(t, a1, a2));
  const x = lerp(-180, 450, u) - go * 620, y = 214 - go * 34;
  // на отдельном холсте: иначе при прозрачности видны наложения кругов
  const q = cloudX; q.clearRect(0, 0, W, H);
  for (const [dx, dy, r] of CLOUD) dot(q, x + dx, y + dy + 4 * Math.sin(t * 1.6 + dx), r, COB);
  for (const [dx, dy, r] of CLOUD) ga(q, x + dx, y + dy + 4 * Math.sin(t * 1.6 + dx), r * 0.74, -2.8, -0.5, r * 0.34, 1, { d: "rgba(42,95,203,.2)", m: "rgba(126,166,238,.85)", l: "rgba(212,227,252,.95)" });
  c.save(); inPath(c, 2); c.clip(); c.globalAlpha = (1 - go) * sstep((t - a0) / 0.3); c.drawImage(cloudC, 0, 0); c.restore();
}

// ---------- Солнце на «грёзы» ----------
const SUN = { x: 838, y: 246, r: 62 };
function sun(c, t) {
  const a = t - EV.gre + 0.05; if (a < 0) return;
  const k = springLand(a * 1.1), y = SUN.y + (1 - k) * 90, n = 14;
  c.save(); c.translate(SUN.x, y); c.scale(k, k); c.rotate(t * 0.06);
  for (let i = 0; i < n; i++) { const b = i / n * TAU, L = i % 2 ? 58 : 84; gs(c, Math.cos(b) * SUN.r * 0.98, Math.sin(b) * SUN.r * 0.98, L, 24, b, 1, 0, 1, i % 2 ? PAL_GOLD : PAL); }
  c.restore();
  const g = c.createRadialGradient(SUN.x - 16, y - 18, 6, SUN.x, y, SUN.r * k); g.addColorStop(0, "#fbe9ab"); g.addColorStop(0.6, GOLD); g.addColorStop(1, GOLDD);
  c.beginPath(); c.arc(SUN.x, y, SUN.r * k, 0, TAU); c.fillStyle = g; c.fill();
  c.lineWidth = 4; c.strokeStyle = COB; c.stroke();
}

// ---------- Птица ----------
function bird(c, x, y, s, dir, flap, beak, rot = 0) {
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s * dir, s);
  // хвост
  for (const d of [-0.2, 0.02, 0.24]) gs(c, -44, 12, 122 + d * 16, 30, Math.PI - 0.16 + d, 1, 0, d > 0 ? -1 : 1);
  // тело
  gs(c, -58, 18, 148, 86, -0.2, 1, 0, 1, { d: COB, m: MID, l: "#c3d7fb" });
  gs(c, -10, 28, 70, 30, -0.26, 1, 0, -1, { d: "#ffffff", m: PALE, l: SKY });
  // голова
  dab(c, 68, -30, 29, COB, MID);
  dot(c, 78, -37, 7.5, WHITE); dot(c, 80, -37, 4, COB);
  // клюв
  c.fillStyle = GOLDD;
  c.beginPath(); c.moveTo(92, -40 - beak * 5); c.lineTo(121, -34 - beak * 11); c.lineTo(93, -28); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(92, -28); c.lineTo(115, -23 + beak * 12); c.lineTo(90, -18 + beak * 3); c.closePath(); c.fill();
  // крыло
  c.save(); c.translate(12, -8); c.rotate(-0.3 - 0.7 * flap);
  for (const [d, L] of [[-0.25, 92], [0.1, 106], [0.42, 92]]) gs(c, 0, 0, L, 34, Math.PI + 0.1 + d, 1, 0, d > 0 ? -1 : 1, { d: COB, m: MID, l: "#c3d7fb" });
  c.restore();
  c.restore();
}
function noteGlyph(c, x, y, s, col, rot, dbl) {
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s); c.fillStyle = col; c.strokeStyle = col; c.lineWidth = 3.4; c.lineCap = "round";
  c.beginPath(); c.ellipse(-8, 14, 9, 6.5, -0.4, 0, TAU); c.fill();
  c.beginPath(); c.moveTo(0, 12); c.lineTo(0, -18); c.stroke();
  if (dbl) { c.beginPath(); c.ellipse(16, 8, 9, 6.5, -0.4, 0, TAU); c.fill(); c.beginPath(); c.moveTo(24, 6); c.lineTo(24, -24); c.stroke(); c.lineWidth = 6; c.beginPath(); c.moveTo(0, -18); c.lineTo(24, -24); c.stroke(); }
  else { c.beginPath(); c.moveTo(0, -18); c.quadraticCurveTo(14, -12, 12, 2); c.stroke(); }
  c.restore();
}
