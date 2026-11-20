// ---------- Небо и свет по времени: рассвет, день, золото, таймлапс, лето, ночь, осенняя заря ----------
let SKYK = [];
function initSky() {
  const hEnd = HEAD(EV.rumyan) ;   // курс в осенней строфе: солнце впереди
  const day = { zen: [70, 140, 226], hor: [200, 224, 242], el: 34, az: 60, sun: [255, 246, 226], amb: [146, 164, 190], fog: [200, 220, 238], fn: 160, ff: 1600, stars: 0, gold: 0 };
  const k = (t, o) => SKYK.push({ t, ...day, ...o });
  k(0, { zen: [26, 38, 80], hor: [118, 124, 174], el: -6, az: 28, sun: [0, 0, 0], amb: [118, 130, 178], fog: [114, 122, 170], stars: 0.6 });
  k(EV.polno + 0.3, { zen: [48, 64, 124], hor: [232, 164, 160], el: -1.5, az: 28, sun: [90, 60, 70], amb: [146, 140, 184], fog: [196, 156, 170], stars: 0.15 });
  k(EV.teplo, { zen: [92, 140, 210], hor: [255, 210, 172], el: 7, az: 28, sun: [255, 204, 150], amb: [160, 158, 180], fog: [236, 204, 186] });
  k(EV.svetlo + 0.7, { zen: [84, 148, 226], hor: [212, 230, 244], el: 22, az: 40, sun: [255, 244, 220], amb: [150, 166, 190], fog: [206, 222, 236] });
  k(EV.E8, { el: 34, az: 60 });
  k(EV.zolote - 0.2, { el: 30, az: 66 });
  k(EV.zolote + 0.4, { zen: [92, 150, 220], hor: [255, 226, 158], el: 26, az: 72, sun: [255, 222, 140], amb: [176, 160, 128], fog: [244, 222, 170], gold: 1 });
  k(EV.E12 + 0.2, { zen: [92, 150, 220], hor: [255, 226, 158], el: 26, az: 72, sun: [255, 222, 140], amb: [176, 160, 128], fog: [244, 222, 170], gold: 0.6 });
  k(EV.E12 + 1.2, { zen: [60, 128, 226], hor: [196, 222, 246], el: 48, az: 100, sun: [255, 248, 232], amb: [140, 160, 192], fog: [196, 218, 240] });
  const hz = (tt, d) => HEAD(tt) + d;
  k(EV.L20 - 0.2, { zen: [60, 128, 226], hor: [196, 222, 246], el: 52, az: hz(EV.L20, -40), sun: [255, 248, 232], amb: [140, 160, 192], fog: [196, 218, 240] });
  k((EV.L20 + EV.E20) / 2 - 0.3, { zen: [64, 132, 224], hor: [216, 228, 236], el: 30, az: hz(EV.zari1, -5) });
  k(EV.E20 - 0.55, { zen: [96, 104, 176], hor: [255, 188, 120], el: 10, az: hz(EV.zari2, 25), sun: [255, 196, 130], amb: [160, 140, 150], fog: [240, 190, 150] });
  k(EV.E20, { zen: [70, 70, 140], hor: [255, 146, 92], el: 0.5, az: hz(EV.E20, 38), sun: [255, 150, 90], amb: [150, 118, 130], fog: [230, 148, 118] });
  k(EV.E20 + 0.55, { zen: [72, 84, 150], hor: [248, 176, 150], el: 2, az: 110, sun: [255, 180, 130], amb: [156, 140, 160], fog: [236, 190, 170] });
  k(EV.L21 + 0.7, { zen: [74, 146, 228], hor: [214, 232, 246], el: 32, az: 120, sun: [255, 244, 220], amb: [150, 166, 192], fog: [206, 222, 238] });
  k(EV.E23, { zen: [80, 140, 220], hor: [230, 226, 214], el: 22, az: 150, sun: [255, 232, 196], amb: [156, 160, 178], fog: [222, 220, 220] });
  k(EV.kostsy, { zen: [40, 44, 98], hor: [226, 118, 98], el: -2, az: 160, sun: [110, 60, 40], amb: [92, 82, 124], fog: [118, 90, 112], stars: 0.2 });
  k(EV.nocham + 0.25, { zen: [10, 16, 42], hor: [36, 48, 96], el: -20, az: 160, sun: [0, 0, 0], amb: [56, 68, 120], fog: [26, 34, 68], fn: 50, ff: 760, stars: 1 });
  k(ORB.t1 - 0.1, { zen: [10, 16, 42], hor: [36, 48, 96], el: -20, az: 160, sun: [0, 0, 0], amb: [56, 68, 120], fog: [26, 34, 68], fn: 50, ff: 760, stars: 1 });
  const az7 = ((hEnd / DEG) % 360 + 360) % 360 + 8;
  k(EV.rumyan, { zen: [96, 92, 156], hor: [252, 176, 168], el: 3, az: az7, sun: [255, 176, 150], amb: [160, 140, 172], fog: [236, 196, 200], fn: 120, ff: 1300, stars: 0.1 });
  k(EV.otdohni, { zen: [86, 84, 146], hor: [238, 178, 186], el: 1.5, az: az7, sun: [240, 160, 150], amb: [150, 134, 170], fog: [226, 202, 214], fn: 120, ff: 1300 });
  k(EV.usni, { zen: [52, 52, 104], hor: [196, 158, 190], el: -1.5, az: az7, sun: [150, 90, 100], amb: [128, 118, 160], fog: [196, 178, 206], fn: 120, ff: 1300, stars: 0.5 });
  k(EV.fin, { zen: [38, 40, 90], hor: [178, 148, 186], el: -3, az: az7, sun: [80, 50, 70], amb: [112, 106, 150], fog: [180, 164, 198], fn: 120, ff: 1300, stars: 0.85 });
  SKYK.sort((a, b) => a.t - b.t);
}
function skyAt(t) {
  if (t <= SKYK[0].t) return SKYK[0];
  for (let i = 0; i < SKYK.length - 1; i++) {
    const a = SKYK[i], b = SKYK[i + 1];
    if (t <= b.t) {
      const u = ease((t - a.t) / (b.t - a.t || 1));
      let daz = b.az - a.az; while (daz > 180) daz -= 360; while (daz < -180) daz += 360;
      const o = {};
      for (const key of ["zen", "hor", "sun", "amb", "fog"]) o[key] = mix(a[key], b[key], u);
      for (const key of ["el", "fn", "ff", "stars", "gold"]) o[key] = lerp(a[key], b[key], u);
      o.az = a.az + daz * u;
      return o;
    }
  }
  return SKYK[SKYK.length - 1];
}
let SKY = null, SUNDIR = [0, 1, 0];
function setLight(t) {
  SKY = skyAt(t);
  const el = SKY.el * DEG, az = SKY.az * DEG;
  SUNDIR = [Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)];
  // при солнце под горизонтом свет идёт от неба: направление вверх, сила — от sun
  LIGHT.dir = vnorm([SUNDIR[0], Math.max(0.18, SUNDIR[1]), SUNDIR[2]]);
  LIGHT.sun = SKY.sun.map((c) => c * 0.95); LIGHT.amb = SKY.amb; LIGHT.fog = SKY.fog;
  LIGHT.fogNear = SKY.fn; LIGHT.fogFar = SKY.ff;
  LIGHT.night = clamp(SKY.stars);
}
// звёзды: направления на верхней полусфере
const STARS = Array.from({ length: 260 }, (_, i) => {
  const a = hash(i * 3.1) * TAU, e = Math.asin(0.04 + 0.96 * Math.pow(hash(i * 7.7 + 1), 0.8));
  return { d: [Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e)], s: 1 + hash(i * 5.3) * 2.2, ph: hash(i * 9.9) * TAU };
});
function ngon(g, x, y, r, n, rot = 0) { g.beginPath(); for (let i = 0; i < n; i++) { const a = rot + i / n * TAU; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.closePath(); }
function drawSky(g, t) {
  reset(g);
  g.translate(W / 2, H / 2); g.rotate(CAM.roll);
  const hy = Math.tan(CAM.pitch) * F;
  const gr = g.createLinearGradient(0, hy - 1150, 0, hy);
  gr.addColorStop(0, css(SKY.zen)); gr.addColorStop(0.62, css(mix(SKY.zen, SKY.hor, 0.45))); gr.addColorStop(1, css(SKY.hor));
  g.fillStyle = gr; g.fillRect(-1800, -2600, 3600, 2600 + hy + 2);
  // подложка земли: туман у горизонта → земля под камерой
  const gc = fogMix(shade(groundCol(CAM.x, CAM.z, CAM.y - 10, t), [0, 1, 0], [CAM.x, CAM.y, CAM.z]), 420);
  const gg = g.createLinearGradient(0, hy, 0, hy + 500);
  gg.addColorStop(0, css(SKY.fog)); gg.addColorStop(1, css(gc));
  g.fillStyle = gg; g.fillRect(-1800, hy, 3600, 2600);
  reset(g);
  // звёзды
  if (SKY.stars > 0.01) {
    for (const s of STARS) {
      const c = dirToCam(s.d); if (c[2] <= 0) continue;
      const p = scr(c); if (p[0] < -5 || p[0] > W + 5 || p[1] < -5 || p[1] > H + 5) continue;
      const tw = 0.6 + 0.4 * Math.sin(t * 3 + s.ph);
      g.fillStyle = `rgba(255,250,236,${(SKY.stars * tw * clamp(s.d[1] * 6)).toFixed(3)})`;
      ngon(g, p[0], p[1], s.s, 4, Math.PI / 4); g.fill();
    }
  }
  // солнце — многоугольник со свечением
  const sc = dirToCam(SUNDIR);
  if (sc[2] > 0.05 && SKY.el > -4) {
    const p = scr(sc), vis = clamp((SKY.el + 4) / 5);
    const glow = g.createRadialGradient(p[0], p[1], 0, p[0], p[1], 520);
    const sunC = mix(SKY.hor, [255, 250, 230], 0.6);
    glow.addColorStop(0, css(sunC, 0.55 * vis)); glow.addColorStop(0.25, css(sunC, 0.18 * vis)); glow.addColorStop(1, css(sunC, 0));
    g.fillStyle = glow; g.fillRect(p[0] - 520, p[1] - 520, 1040, 1040);
    g.fillStyle = css(mix([255, 252, 236], SKY.hor, 0.25), vis); ngon(g, p[0], p[1], 52, 12, t * 0.2); g.fill();
    g.fillStyle = css([255, 255, 248], vis); ngon(g, p[0], p[1], 36, 12, -t * 0.3); g.fill();
  }
  // луна ночью
  if (SKY.stars > 0.5) {
    const md = vnorm([Math.sin(FIRE_MOON_AZ), 0.42, Math.cos(FIRE_MOON_AZ)]);
    const mc = dirToCam(md);
    if (mc[2] > 0) {
      const p = scr(mc), a = clamp((SKY.stars - 0.5) * 2) * clamp(1 - (t - EV.L25) / 0.8 + 1);
      const glow = g.createRadialGradient(p[0], p[1], 0, p[0], p[1], 220);
      glow.addColorStop(0, `rgba(220,226,255,${(0.35 * a).toFixed(3)})`); glow.addColorStop(1, "rgba(220,226,255,0)");
      g.fillStyle = glow; g.fillRect(p[0] - 220, p[1] - 220, 440, 440);
      g.fillStyle = css([236, 238, 250], a); ngon(g, p[0], p[1], 40, 10); g.fill();
      g.fillStyle = css([200, 206, 230], a); ngon(g, p[0] + 9, p[1] - 6, 9, 6); g.fill(); ngon(g, p[0] - 12, p[1] + 10, 6, 6); g.fill();
    }
  }
}
let FIRE_MOON_AZ = 0;
// блик солнца (строка «в ярком золоте»): шестиугольники вдоль линии солнце → центр
function drawFlare(g, t, a) {
  if (a <= 0.01) return;
  const sc = dirToCam(SUNDIR); if (sc[2] <= 0.05) return;
  const p = scr(sc);
  reset(g); g.globalCompositeOperation = "lighter";
  const dx = W / 2 - p[0], dy = H / 2 - p[1];
  const spots = [[0.35, 40, [255, 200, 120]], [0.6, 70, [255, 230, 160]], [0.9, 26, [200, 230, 255]], [1.25, 110, [255, 190, 110]], [1.6, 50, [255, 240, 200]]];
  for (const [k, r, c] of spots) { g.fillStyle = css(c, 0.16 * a); ngon(g, p[0] + dx * k, p[1] + dy * k, r, 6, 0.3); g.fill(); }
  const gl = g.createRadialGradient(p[0], p[1], 0, p[0], p[1], 900);
  gl.addColorStop(0, `rgba(255,214,130,${(0.45 * a).toFixed(3)})`); gl.addColorStop(1, "rgba(255,214,130,0)");
  g.fillStyle = gl; g.fillRect(0, 0, W, H);
  reset(g);
}
