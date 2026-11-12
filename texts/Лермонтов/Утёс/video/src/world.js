// ---------- мир: небо, звёзды, луна и солнце, пустыня, облака ----------
const STARS = [], SKYCL = [], STONES = [], DUNES = [];
function buildWorld() {
  const r = mulberry32(3);
  for (let i = 0; i < 170; i++) STARS.push([(r() - 0.5) * 2600, -1250 + r() * 2000, 1 + r() * 2.6, r() * TAU, r()]);
  // облака на высоте — мимо них летит тучка
  const r2 = mulberry32(9);
  for (let i = 0; i < 26; i++) SKYCL.push([-1500 + r2() * 3600, -3200 + r2() * 2500, 0.5 + r2() * 1.1, r2()]);
  const r3 = mulberry32(21);
  for (let i = 0; i < 40; i++) STONES.push([(r3() - 0.5) * 9000, 1012 + r3() * 900, 6 + r3() * 26]);
  const r4 = mulberry32(31);
  for (let i = 0; i < 18; i++) DUNES.push([-6000 + i * 700 + r4() * 300, 120 + r4() * 160, 500 + r4() * 500]);
}
// экран ↔ мир
const toScreen = (cam, x, y) => [W / 2 + (x - cam.x) * cam.z, H / 2 + (y - cam.y) * cam.z];
// небо: объекты «на бесконечности» почти не двигаются с камерой
const skyPos = (cam, sx, sy) => [W / 2 + sx - cam.x * 0.12, H / 2 + sy - cam.y * 0.08];

function drawSky(c, cam, d) {
  const zz = clamp(cam.z, 0.3, 1.0);
  const yAt = (wy) => H / 2 + (wy - cam.y) * zz;
  const y0 = yAt(-2600), y1 = yAt(1000);
  const g = c.createLinearGradient(0, y0, 0, Math.max(y0 + 10, y1));
  g.addColorStop(0, pal("skyTop", d)); g.addColorStop(0.58, pal("skyMid", d)); g.addColorStop(1, pal("skyLow", d));
  c.fillStyle = g; c.fillRect(0, 0, W, H);
}
function drawStars(c, cam, d, t) {
  const a = (1 - sstep(d / 0.55)) + sstep((d - 2.2) / 0.8) * 0.75;
  if (a <= 0.01) return;
  for (const [sx, sy, r, ph, k] of STARS) {
    const [x, y] = skyPos(cam, sx, sy); if (x < -10 || x > W + 10 || y < -10 || y > H + 10) continue;
    const tw = 0.55 + 0.45 * Math.sin(t * (1.5 + k * 2.5) + ph);
    c.globalAlpha = a * tw; c.fillStyle = "#fffbe6"; circle(c, x, y, r); c.fill();
    if (r > 3.0) sparkle(c, x, y, r * 4.2 * tw, a * 0.85, "#fffbe6");
  }
  c.globalAlpha = 1;
}
function drawMoon(c, cam, d) {
  const set = sstep(d / 0.6); if (set >= 1) return;
  const [x, y] = skyPos(cam, 560, -190 + set * 760);
  glow(c, x, y, 260, "rgba(255,246,200,0.55)", 1 - set);
  c.save(); c.globalAlpha = 1 - set * 0.6;
  circle(c, x, y, 78); c.fillStyle = "#fff6d0"; c.fill();
  c.fillStyle = "rgba(220,205,150,0.5)"; circle(c, x - 22, y - 14, 15); c.fill(); circle(c, x + 18, y + 22, 10); c.fill(); circle(c, x + 26, y - 26, 7); c.fill();
  c.restore();
}
function drawSun(c, cam, d, t, horizonY) {
  // день: солнце в небе слева; закат: у горизонта
  const day = sstep((d - 0.3) / 0.6) * (1 - sstep((d - 1.45) / 0.3));
  if (day > 0.01) {
    const rise = 1 - sstep((d - 0.3) / 0.7);
    const [x, y] = skyPos(cam, -640, -300 + rise * 700);
    glow(c, x, y, 420, "rgba(255,240,170,0.75)", day);
    c.save(); c.globalAlpha = day; c.translate(x, y); c.rotate(t * 0.25);
    c.fillStyle = "rgba(255,236,150,0.35)";
    for (let i = 0; i < 12; i++) { c.rotate(TAU / 12); c.beginPath(); c.moveTo(0, -110); c.lineTo(18, -200); c.lineTo(-18, -200); c.closePath(); c.fill(); }
    circle(c, 0, 0, 92); c.fillStyle = "#fff3b0"; c.fill(); circle(c, 0, 0, 74); c.fillStyle = "#ffe066"; c.fill();
    c.restore();
  }
  const ss = sstep((d - 1.4) / 0.35);
  if (ss > 0.01) {
    const x = W / 2 + (-1500 - cam.x) * Math.min(cam.z, 1) * 0.35 + 0, y = Math.min(H + 200, horizonY - 70 + clamp(d - 2, 0, 1) * 190);
    glow(c, x, y, 620, "rgba(255,170,90,0.75)", ss);
    c.save(); c.globalAlpha = ss; circle(c, x, y, 110); c.fillStyle = "#ffcf73"; c.fill(); circle(c, x, y, 90); c.fillStyle = "#ffb04a"; c.fill(); c.restore();
  }
}
function drawEveningStar(c, cam, d, t) {
  const a = sstep((d - 2.35) / 0.35); if (a <= 0) return;
  const [x, y] = skyPos(cam, 260, -400);
  glow(c, x, y, 70, "rgba(255,255,230,0.9)", a);
  sparkle(c, x, y, 34 + 6 * Math.sin(t * 3), a, "#fffbe6");
}
// облака на высоте (в мировых координатах)
function cloudPuff(c, x, y, s, d, a = 1) {
  c.save(); c.globalAlpha *= a; c.translate(x, y); c.scale(s, s);
  const P = [[-120, 20, 70], [-50, -20, 90], [50, -10, 80], [130, 25, 60], [0, 35, 80]];
  c.fillStyle = pal("cloudD", d); for (const [a1, b, r] of P) { circle(c, a1, b + 14, r); c.fill(); }
  c.fillStyle = pal("cloud", d); for (const [a1, b, r] of P) { circle(c, a1, b, r * 0.94); c.fill(); }
  c.restore();
}
function drawSkyClouds(c, cam, d, t) {
  const vis = 1 - 0.8 * (1 - sstep((d - 0.3) / 0.5)) - 0.5 * sstep((d - 2.3) / 0.5);
  for (const [x0, y, s, k] of SKYCL) {
    const x = x0 + t * (14 + 20 * k);
    if (Math.abs(x - cam.x) * cam.z > W + 400 * s * cam.z || Math.abs(y - cam.y) * cam.z > H + 200 * s * cam.z) continue;
    cloudPuff(c, x, y, s, d, vis);
  }
}
// пустыня: дальние дюны с параллаксом, земля, камни
function drawGround(c, cam, d) {
  const L = cam.x - W / 2 / cam.z - 200, R = cam.x + W / 2 / cam.z + 200;
  const top = cam.y - H / 2 / cam.z - 50, bot = cam.y + H / 2 / cam.z + 50;
  if (bot < 820) return;
  // дальние дюны (смещены с параллаксом 0.5)
  const off = cam.x * 0.5;
  c.fillStyle = pal("dune", d);
  c.beginPath(); c.moveTo(L, 1001);
  for (const [x, h, w] of DUNES) { const xx = x + off; if (xx + w < L || xx - w > R) continue; c.moveTo(xx - w, 1001); c.quadraticCurveTo(xx, 1001 - h * 1.6, xx + w, 1001); }
  c.fill();
  const g = c.createLinearGradient(0, 1000, 0, 1000 + 1400);
  g.addColorStop(0, pal("ground", d)); g.addColorStop(1, pal("groundD", d));
  c.fillStyle = g; c.fillRect(L, 1000, R - L, Math.max(10, bot - 1000 + 1500));
  c.strokeStyle = pal("ink", d, 0.85); c.lineWidth = 6 / Math.max(0.5, cam.z); c.beginPath(); c.moveTo(L, 1000); c.lineTo(R, 1000); c.stroke();
  // рябь песка
  c.strokeStyle = pal("groundD", d, 0.6); c.lineWidth = 4;
  for (let i = 0; i < 12; i++) { const y = 1060 + i * i * 14; const x0 = -4000 + (i * 977) % 2600; c.beginPath(); c.moveTo(x0, y); c.quadraticCurveTo(x0 + 400, y - 18, x0 + 800, y); c.moveTo(x0 + 2600, y + 30); c.quadraticCurveTo(x0 + 3000, y + 12, x0 + 3400, y + 30); c.stroke(); }
  for (const [x, y, r] of STONES) { if (x < L || x > R) continue; ell(c, x, y, r * 1.4, r * 0.7); ink(c, pal("rockD", d), 3, pal("ink", d, 0.7)); }
  void top;
}
// тень утёса: днём короткая, на закате длинная вправо
function drawShadow(c, d) {
  const len = 1 + 3.2 * sstep((d - 1.2) / 0.9);
  c.save(); c.globalAlpha = 0.35;
  c.fillStyle = pal("ink", d);
  c.beginPath(); c.moveTo(-560, 1004); c.lineTo(572, 1004); c.lineTo(572 + 600 * (len - 1) + 300, 1004 + 60 + 40 * len); c.lineTo(-560 + 200 * len, 1004 + 60 + 40 * len); c.closePath(); c.fill();
  c.restore();
}
