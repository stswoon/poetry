// ---------- Разворот 3: «Туча небо кроет, солнце не блестит, ветер в поле воет, дождик моросит» ----------

const SUN = { x: 430, y: 322, r: 80, n: 24, L: 96 };
// Туча из папиросной бумаги: рисуется один раз
const CLOUD_W = 700, CLOUD_H = 360, cloudC = mkCanvas(CLOUD_W, CLOUD_H);
{
  const c = cloudC.getContext("2d"), r = mulberry32(19), cx = CLOUD_W / 2, cy = CLOUD_H / 2 + 20;
  const puffs = [[0, 0, 118], [-132, 28, 90], [132, 24, 96], [-58, -62, 92], [72, -56, 86], [-210, 56, 62], [214, 60, 62], [0, 70, 90]];
  c.beginPath(); for (const [x, y, rr] of puffs) { c.moveTo(cx + x + rr, cy + y); c.arc(cx + x, cy + y, rr, 0, TAU); }
  c.fillStyle = "#7f8592"; c.fill();
  c.globalCompositeOperation = "source-atop";
  for (let i = 0; i < 700; i++) { c.strokeStyle = r() > 0.5 ? `rgba(230,232,240,${0.06 + r() * 0.1})` : `rgba(40,45,60,${0.05 + r() * 0.08})`; c.lineWidth = 0.8 + r(); const x = r() * CLOUD_W, y = r() * CLOUD_H, a = r() * TAU, l = 6 + r() * 18; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke(); }
  const g = c.createLinearGradient(0, 40, 0, CLOUD_H); g.addColorStop(0, "rgba(220,224,234,0.35)"); g.addColorStop(1, "rgba(30,34,48,0.35)"); c.fillStyle = g; c.fillRect(0, 0, CLOUD_W, CLOUD_H);
  c.globalCompositeOperation = "source-over";
}
const DRY = []; { const r = mulberry32(64); for (let i = 0; i < 8; i++) DRY.push({ a: lerp(-0.42, 0.38, i / 7) + (r() - 0.5) * 0.1, L: 150 + r() * 90, w: 6 + r() * 3, ph: r() * 6, tone: r(), head: i % 3 === 0 }); }
const RAIN = [];
{ const r = mulberry32(37); for (let i = 0; i < 42; i++) RAIN.push({ t: EV.dzh - 0.08 + r() * 1.15, dx: (r() - 0.5) * 440, yl: 440 + r() * 440, xl: (r() - 0.5) * 20, s: 9 + r() * 12, seed: i }); }
const SWIRLS = [{ y: 560, t: EV.vet - 0.1 }, { y: 690, t: EV.vet + 0.12 }, { y: 470, t: EV.vet + 0.35 }];

const bump = (t, a, b, f = 0.25) => sstep(prog(t, a, a + f)) * (1 - sstep(prog(t, b - f, b)));
function cloudPos(t) {
  const u = sstep(prog(t, EV.tuc - 0.15, EV.kro + 0.45)), wv = sstep(prog(t, EV.vet - 0.1, EV.voe + 0.6));
  const wob = bump(t, EV.vet - 0.1, EV.voe + 0.6);
  return [lerp(-360, 398, u) + 46 * wv + 7 * Math.sin(t * 8.5) * wob, lerp(110, 246, u) + 4 * Math.sin(t * 6.1) * wob];
}

function sunflower(c, t) {
  const dim = sstep(prog(t, EV.sol - 0.1, EV.ble + 0.3)), rays = 1 - sstep(prog(t, EV.ble - 0.05, EV.ble + 0.45));
  // карандашные лучи гаснут на «не блестит»
  if (rays > 0) for (let i = 0; i < 14; i++) { const a = i / 14 * TAU + 0.12; pencil(c, [[SUN.x + Math.cos(a) * 200, SUN.y + Math.sin(a) * 200], [SUN.x + Math.cos(a) * 250, SUN.y + Math.sin(a) * 250]], 1, 3, 0.55 * rays, 70 + i); }
  c.save(); c.translate(SUN.x, SUN.y);
  c.shadowColor = "rgba(60,38,18,0.3)"; c.shadowBlur = 6; c.shadowOffsetX = 3; c.shadowOffsetY = 4;
  const pc = mixc(K.yellow, [150, 136, 104], dim * 0.7), pd = mixc(K.ochre, [120, 108, 88], dim * 0.7);
  for (let i = 0; i < SUN.n; i++) {
    const a = i / SUN.n * TAU + (i % 2) * 0.06, L = SUN.L * (i % 2 ? 0.9 : 1) * (1 - 0.12 * dim);
    c.save(); c.rotate(a + dim * 0.12 * Math.sin(i * 3)); c.beginPath(); c.moveTo(SUN.r * 0.82, -10); c.quadraticCurveTo(SUN.r + L * 0.6, -16, SUN.r + L, 0); c.quadraticCurveTo(SUN.r + L * 0.6, 16, SUN.r * 0.82, 10); c.closePath();
    c.fillStyle = css(i % 2 ? pd : pc); c.fill(); c.restore();
  }
  c.shadowColor = "transparent";
  c.beginPath(); c.arc(0, 0, SUN.r, 0, TAU); c.fillStyle = css(mixc([104, 64, 26], [78, 66, 54], dim)); c.fill();
  c.fillStyle = "rgba(30,15,5,0.4)"; for (let i = 0; i < 140; i++) { const a = i * 2.39996, d = Math.sqrt(i / 140) * SUN.r * 0.92; c.beginPath(); c.arc(Math.cos(a) * d, Math.sin(a) * d, 2.6, 0, TAU); c.fill(); }
  c.restore();
  tape(c, SUN.x - 118, SUN.y - 112, 96, 30, -0.75, 41); tape(c, SUN.x + 124, SUN.y + 108, 96, 30, -0.7, 42);
}

function drawLeft3(c, t) {
  c.drawImage(PAPER_L[2], 0, 0);
  // мокрые пятна от капель
  for (const d of RAIN) {
    const [cx0, cy0] = cloudPos(d.t), y0 = cy0 + 60, fall = 0.2 + (d.yl - y0) / 2800, a = t - d.t - fall;
    if (a <= 0) continue;
    const x = cx0 + d.dx + d.xl, rr = d.s * sstep(clamp(a / 0.25, 0, 1)), g = c.createRadialGradient(x, d.yl, 0, x, d.yl, rr);
    g.addColorStop(0, "rgba(120,92,58,0.3)"); g.addColorStop(0.75, "rgba(120,92,58,0.22)"); g.addColorStop(1, "rgba(120,92,58,0)");
    c.fillStyle = g; c.beginPath(); c.ellipse(x, d.yl, rr * 1.08, rr * 0.92, d.seed, 0, TAU); c.fill();
  }
  sunflower(c, t);
  // сухая трава в поле качается на «ветер»
  const ws = bump(t, EV.vet - 0.1, EV.voe + 0.9, 0.3);
  c.save(); c.shadowColor = "rgba(60,38,18,0.28)"; c.shadowBlur = 5; c.shadowOffsetX = 2; c.shadowOffsetY = 3;
  for (const g of DRY) {
    const sway = 0.03 * Math.sin(t * 2 + g.ph) + ws * (0.32 + 0.1 * Math.sin(t * 13 + g.ph));
    const tip = blade(c, 186 + g.a * 24, 880, g.L, g.w, -Math.PI / 2 + g.a + sway * 0.4, sway + 0.05, mixc(K.straw, K.strawD, g.tone));
    if (g.head) spike(c, tip[0], tip[1], tip[2], K.strawD);
  }
  c.restore();
  tape(c, 190, 846, 110, 32, 0.2, 43);
  // ветер: карандашные завитки летят слева направо
  for (const s of SWIRLS) {
    const a = t - s.t; if (a < 0 || a > 1.3) continue;
    const head = a / 0.95, pts = [];
    for (let q = Math.max(0, head - 0.42); q <= Math.min(1, head); q += 0.01) pts.push([30 + q * 780 + 46 * Math.sin(q * TAU * 1.5), s.y - 34 * Math.cos(q * TAU * 1.5) + 14 * Math.sin(q * 9)]);
    pencil(c, pts, 1, 2.6, 0.55, 90);
  }
  // туча наползает на «туча» и закрывает солнце
  const [cx, cy] = cloudPos(t);
  if (cx > -CLOUD_W / 2 - 40) {
    c.save(); c.shadowColor = "rgba(40,40,50,0.3)"; c.shadowBlur = 10; c.shadowOffsetX = 4; c.shadowOffsetY = 6; c.globalAlpha = 0.9;
    c.drawImage(cloudC, cx - CLOUD_W / 2, cy - CLOUD_H / 2); c.restore();
  }
  // капли дождя на «дождик моросит»
  c.save(); c.lineCap = "round";
  for (const d of RAIN) {
    const [cx0, cy0] = cloudPos(d.t), y0 = cy0 + 60, fall = 0.2 + (d.yl - y0) / 2800, a = t - d.t;
    if (a < 0 || a > fall) continue;
    const u = a / fall, y = lerp(y0, d.yl, u * u * 0.4 + u * 0.6), x = cx0 + d.dx + d.xl * u;
    c.strokeStyle = "rgba(70,100,150,0.75)"; c.lineWidth = 3.4; c.beginPath(); c.moveTo(x - 2, y - 26); c.lineTo(x, y); c.stroke();
  }
  c.restore();
}

// Перо на правой странице
function feather(c) {
  c.save(); c.translate(700, 822); c.rotate(-0.85);
  c.shadowColor = "rgba(60,38,18,0.3)"; c.shadowBlur = 5; c.shadowOffsetY = 3;
  c.beginPath(); c.moveTo(-110, 0); c.quadraticCurveTo(-20, -40, 110, -6); c.quadraticCurveTo(-20, 36, -110, 0); c.closePath();
  c.fillStyle = "#9da2ab"; c.fill(); c.shadowColor = "transparent";
  c.strokeStyle = "rgba(60,64,74,0.35)"; c.lineWidth = 1;
  for (let x = -96; x < 100; x += 7) { c.beginPath(); c.moveTo(x, -1); c.lineTo(x + 18, -30 * Math.sin((x + 110) / 220 * Math.PI)); c.moveTo(x, 1); c.lineTo(x + 18, 26 * Math.sin((x + 110) / 220 * Math.PI)); c.stroke(); }
  c.strokeStyle = "#ece6da"; c.lineWidth = 3; c.beginPath(); c.moveTo(-150, 4); c.quadraticCurveTo(-10, -4, 112, -6); c.stroke();
  c.restore();
}
