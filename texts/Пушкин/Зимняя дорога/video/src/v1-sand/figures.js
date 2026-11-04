// Силуэты из песка: небо, туман, луна, снежные поляны, тройка, ямщик, изба, вёрсты, камин, профили, часы.
const HOR = 440; // горизонт

// ---------- Небо, луна, туман ----------
function sky(c, a = 0.95) {
  const g = c.createLinearGradient(0, 0, 0, HOR + 10);
  g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(0.6, `rgba(0,0,0,${a * 0.93})`); g.addColorStop(1, `rgba(0,0,0,${a * 0.8})`);
  c.globalCompositeOperation = "source-over"; c.fillStyle = g; c.fillRect(-10, -10, W + 20, HOR + 20);
}
// луна — протёртый в песке круг с ореолом; dim — сколько тумана на ней
function moon(c, x, y, r, dim = 0) {
  carve(c, 1); blob(c, x, y, r * 2.6, 0.42);
  carve(c, 1); disk(c, x, y, r);
  // моря на луне — лёгкая пыль
  sand(c, 0.12); disk(c, x - r * 0.3, y - r * 0.15, r * 0.32); disk(c, x + r * 0.25, y + r * 0.28, r * 0.22);
  if (dim > 0) { sand(c, 0.62 * dim); disk(c, x, y, r * 1.05); c.globalCompositeOperation = "source-over"; blob(c, x, y, r * 3, 0.4 * dim); }
}
// волнистые полосы тумана: в небе — светлее (песок снят), на луне — темнее (песок насыпан)
function fogBand(c, t, y, amp, speed, wid, a, phase, x0 = -100, x1 = W + 100) {
  const pts = [];
  for (let x = x0; x <= x1; x += 40) pts.push([x, y + amp * Math.sin(x * 0.004 + phase + t * speed) + amp * 0.4 * Math.sin(x * 0.011 - t * speed * 1.7)]);
  // дымка и три тонкие волны, проведённые пальцами
  c.lineCap = "round"; c.lineWidth = wid; carve(c, a * 0.3); curve(c, pts); c.stroke();
  for (const [dy, lw, k] of [[-wid * 0.22, 9, 1], [0, 6, 0.85], [wid * 0.2, 4, 0.7]]) { c.lineWidth = lw; carve(c, Math.min(1, a * 1.7 * k)); curve(c, pts.map(([x, yy]) => [x, yy + dy])); c.stroke(); }
}
function fogOverMoon(c, t, mx, my, mr, y, amp, speed, wid, a, phase) {
  c.save(); c.beginPath(); c.arc(mx, my, mr * 1.08, 0, TAU); c.clip();
  const pts = []; for (let x = mx - 200; x <= mx + 200; x += 20) pts.push([x, y + amp * Math.sin(x * 0.004 + phase + t * speed) + amp * 0.4 * Math.sin(x * 0.011 - t * speed * 1.7)]);
  sand(c, a); c.lineWidth = wid; c.lineCap = "round"; curve(c, pts); c.stroke();
  c.restore();
}

// ---------- Снежные поляны ----------
const HILLS = [
  { y: HOR + 6, amp: 26, f: 0.0031, ph: 0.4, a: 0.42 },
  { y: HOR + 96, amp: 34, f: 0.0024, ph: 2.1, a: 0.3 },
  { y: HOR + 196, amp: 28, f: 0.0036, ph: 4.0, a: 0.24 },
];
const hillY = (h, x, off = 0) => h.y + h.amp * Math.sin((x + off) * h.f + h.ph) + h.amp * 0.35 * Math.sin((x + off) * h.f * 2.7 + h.ph * 1.3);
// u — насколько «процарапаны» поляны (0..1, слева направо), off — сдвиг для движения
function glades(c, u = 1, off = 0) {
  if (u <= 0) return;
  c.save(); c.beginPath(); c.rect(-10, 0, (W + 20) * u, H); c.clip();
  // лес на горизонте — зубчатая кромка
  sand(c, 0.72); c.beginPath(); c.moveTo(-10, HOR + 12);
  for (let x = -10; x <= W + 10; x += 9) { const k = Math.floor((x + off * 0.35) / 9), hh = 8 + 26 * hash(k, 11) * (0.5 + 0.5 * Math.sin(k * 0.13)); c.lineTo(x, HOR + 10 - (k % 2 ? hh : hh * 0.3)); }
  c.lineTo(W + 10, HOR + 14); c.closePath(); c.fill();
  // тени по склонам: тонкий песок под каждой линией холма
  for (const h of HILLS) {
    const pts = []; for (let x = -40; x <= W + 40; x += 30) pts.push([x, hillY(h, x, off * (0.4 + h.y / 1400))]);
    c.lineCap = "round";
    sand(c, h.a * 0.8); c.lineWidth = 12; curve(c, pts); c.stroke();
    sand(c, h.a * 0.5); c.lineWidth = 4; curve(c, pts.map(([x, y]) => [x, y + 18])); c.stroke();
  }
  c.restore();
}
// светлый конус от луны к полянам
// свет льётся: тонкие лучи-бороздки от луны вниз, к полянам
function moonBeam(c, mx, my, u) {
  if (u <= 0) return;
  c.save(); c.lineCap = "round";
  for (let k = 0; k < 9; k++) {
    const a = lerp(-0.85, 0.55, k / 8), L = (HOR + 30 - my) / Math.cos(a) * sstep(u * 1.4 - k * 0.05);
    if (L <= 0) continue;
    const g = c.createLinearGradient(mx, my, mx + Math.sin(a) * L, my + Math.cos(a) * L);
    g.addColorStop(0, "rgba(0,0,0,0.7)"); g.addColorStop(1, "rgba(0,0,0,0.05)");
    c.globalCompositeOperation = "destination-out"; c.strokeStyle = g; c.lineWidth = 5 + 3 * (k % 2);
    c.beginPath(); c.moveTo(mx + Math.sin(a) * 70, my + Math.cos(a) * 70); c.lineTo(mx + Math.sin(a) * L, my + Math.cos(a) * L); c.stroke();
  }
  c.restore();
}

// ---------- Дорога ----------
// колеи: из-за горизонта справа петлёй выходят вперёд и идут вдоль низа кадра
function road(c, u = 1, off = 0) {
  if (u <= 0) return;
  const far = [[1500, HOR + 4], [1380, HOR + 50], [1160, HOR + 110], [900, HOR + 170], [640, HOR + 228], [360, HOR + 262], [-60, HOR + 272]];
  c.lineCap = "round";
  for (const [dy, w0, a] of [[-10, 3, 0.55], [12, 5, 0.55]]) {
    const n = Math.max(2, Math.round(far.length * u));
    const pts = far.slice(0, n).map(([x, y], i) => [x, y + dy * (i / far.length)]);
    sand(c, a); c.lineWidth = w0 + 4 * u; curve(c, pts); c.stroke();
  }
  // утоптанная полоса и сугробы вдоль переднего края
  sand(c, 0.16); c.fillRect(-10, HOR + 248, W + 20, 30);
  for (let i = -1; i < 9; i++) { const x = ((i * 260 - off) % 2340 + 2340) % 2340 - 210; sand(c, 0.35); c.beginPath(); c.ellipse(x, BAND_Y - 6, 120, 18, 0, Math.PI, TAU); c.fill(); }
}

// ---------- Конь ----------
// x,y — земля под конём, s — масштаб, ph — фаза бега, gait 1 — галоп, 0 — шаг; head — наклон головы
function horse(c, x, y, s, ph, gait = 1, head = 0, a = 0.96) {
  c.save(); c.translate(x, y); c.scale(s, s);
  const bob = gait * 5 * Math.sin(ph * 2) + (1 - gait) * 1.5 * Math.sin(ph * 2);
  c.translate(0, -bob);
  sand(c, a); c.lineCap = "round"; c.lineJoin = "round";
  // ноги: бедро/плечо → колено → копыто
  const leg = (hx, hy, up, lo, ang, bend, w1, w2) => {
    const kx = hx + Math.sin(ang) * up, ky = hy + Math.cos(ang) * up, fx = kx + Math.sin(ang + bend) * lo, fy = ky + Math.cos(ang + bend) * lo;
    c.lineWidth = w1; c.beginPath(); c.moveTo(hx, hy); c.lineTo(kx, ky); c.stroke();
    c.lineWidth = w2; c.beginPath(); c.moveTo(kx, ky); c.lineTo(fx, fy); c.stroke();
    c.beginPath(); c.ellipse(fx + 2, fy + 1, 6, 4, 0, 0, TAU); c.fill();
  };
  const A = gait ? 0.62 : 0.28, B = gait ? 1.25 : 0.55;
  for (const [off, side] of [[0, 1], [0.55, -1]]) {
    const pf = ph + off * Math.PI, pr = ph + (off + 0.62) * Math.PI;
    leg(44, -76, 36, 40, A * Math.sin(pf) + 0.12, -B * Math.max(0, Math.cos(pf)), 15, 9);
    leg(-46, -78, 38, 42, -A * Math.sin(pr) - 0.05, B * 0.8 * Math.max(0, -Math.cos(pr)), 17, 9);
  }
  // корпус
  c.beginPath(); c.ellipse(0, -86, 62, 25, 0.02, 0, TAU); c.fill();
  disk(c, 46, -86, 26); disk(c, -48, -90, 27);
  // шея и голова
  const hd = head + (gait ? 0.08 * Math.sin(ph * 2 + 0.6) : 0.04 * Math.sin(ph * 2));
  c.save(); c.translate(52, -98); c.rotate(-0.15 + hd);
  poly(c, [[-22, 0], [-4, -16], [28, -62], [44, -60], [40, -38], [22, 14]]); c.fill();
  c.translate(36, -58); c.rotate(0.95);
  c.beginPath(); c.ellipse(16, 0, 26, 11, 0, 0, TAU); c.fill(); disk(c, 36, 2, 9);
  poly(c, [[-4, -10], [2, -26], [8, -10]]); c.fill(); // ухо
  c.restore();
  // грива
  c.lineWidth = 5;
  for (let i = 0; i < 6; i++) { const u = i / 5, mx = lerp(40, 78, u), my = lerp(-108, -150, u) + hd * 30 * u; c.beginPath(); c.moveTo(mx, my); c.quadraticCurveTo(mx - 14, my - 4 + 4 * Math.sin(ph * 3 + i), mx - 26 - 6 * gait, my + 8 + 5 * Math.sin(ph * 3 + i)); c.stroke(); }
  // хвост
  const tw = gait ? 10 * Math.sin(ph * 2 + 1) : 3 * Math.sin(ph);
  c.lineWidth = 12; c.beginPath(); c.moveTo(-66, -98); c.quadraticCurveTo(-96, -96 + tw, -112, -54 + tw * 1.5); c.stroke();
  c.lineWidth = 6; c.beginPath(); c.moveTo(-70, -96); c.quadraticCurveTo(-106, -86 + tw, -122, -44 + tw * 1.8); c.stroke();
  c.restore();
}

// ---------- Тройка ----------
// nod — голова ямщика вниз (0..1), ring — сила качания колокольчика
function troika(c, x, y, s, ph, gait = 1, nod = 0, ring = 0, t = 0) {
  c.save(); c.translate(x, y); c.scale(s, s);
  // дальняя пристяжная, коренник, ближняя пристяжная
  horse(c, 26, -8, 0.94, ph + 1.9, gait, -0.28, 0.82);
  horse(c, 0, 0, 1, ph, gait, 0.05, 0.96);
  horse(c, -16, 10, 1.03, ph + 0.8, gait, 0.38, 0.98);
  sand(c, 0.96); c.lineCap = "round"; c.lineJoin = "round";
  // дуга и колокольчик
  c.lineWidth = 9; c.beginPath(); c.ellipse(46, -112, 26, 92, 0, Math.PI, TAU); c.stroke();
  const sw = ring * 0.35 * Math.sin(t * 9);
  c.save(); c.translate(46, -196); c.rotate(sw); c.lineWidth = 3; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 14); c.stroke();
  poly(c, [[-5, 14], [5, 14], [10, 30], [-10, 30]]); c.fill(); disk(c, 0, 33, 3.5); c.restore();
  // оглобли и постромки
  c.lineWidth = 6; c.beginPath(); c.moveTo(52, -96); c.lineTo(-190, -54); c.stroke();
  c.lineWidth = 3; c.beginPath(); c.moveTo(20, -90); c.lineTo(-190, -64); c.stroke();
  // сани
  c.lineWidth = 7; c.beginPath(); c.moveTo(-380, -6); c.lineTo(-200, -6); c.quadraticCurveTo(-158, -8, -160, -58); c.stroke();
  for (const px of [-350, -300, -250, -210]) { c.lineWidth = 5; c.beginPath(); c.moveTo(px, -8); c.lineTo(px + 4, -26); c.stroke(); }
  poly(c, [[-372, -26], [-200, -26], [-180, -60], [-205, -82], [-330, -84], [-372, -110]]); c.fill();
  // ямщик на облучке
  c.save(); c.translate(-214, -82);
  poly(c, [[-26, 0], [20, 0], [14, -58], [-18, -64]]); c.fill();       // тулуп
  c.save(); c.translate(-2, -66); c.rotate(nod * 0.75);
  disk(c, 4, -14, 14); poly(c, [[6, -6], [24, -2], [10, 10]]); c.fill(); // голова и борода
  poly(c, [[-12, -22], [18, -24], [14, -40], [-8, -38]]); c.fill();    // шапка
  c.restore();
  c.lineWidth = 9; c.beginPath(); c.moveTo(6, -44); c.lineTo(34, -24 + nod * 12); c.stroke(); // руки
  c.lineWidth = 2; c.beginPath(); c.moveTo(34, -24 + nod * 12); c.quadraticCurveTo(160, 10 + nod * 30, 272, -24); c.stroke();     // вожжи
  c.restore();
  // седок в шинели и цилиндре
  c.save(); c.translate(-318, -100);
  poly(c, [[-34, 0], [34, 0], [22, -70], [-24, -74]]); c.fill();
  disk(c, 0, -86, 15); c.fillRect(-14, -132, 28, 38); c.fillRect(-21, -100, 42, 6);
  poly(c, [[-26, -72], [26, -70], [30, -52], [-30, -56]]); c.fill(); // воротник
  c.restore();
  c.restore();
}
// снежная пыль из-под копыт и полозьев
function hoofSnow(c, t, x, y, s, a, b, seed = 5) {
  sand(c, 0.6);
  grains(c, t, a, b, 70, (i, bt, r) => ({ x: x + (-60 + 120 * r(1)) * s - (r(6) > 0.6 ? 330 * s : 0), y: y - 4 * s, vx: -(120 + 200 * r(2)) * s, vy: -(60 + 140 * r(3)) * s, g: 420 * s, life: 0.5 + 0.3 * r(4), s: (2 + 4 * r(5)) * s }), seed);
}

// ---------- Ямщик крупно (3 строфа) ----------
function driverBig(c, x, y, s, t, sing = 1) {
  c.save(); c.translate(x, y); c.scale(s, s); sand(c, 0.96); c.lineJoin = "round";
  // плечи и тулуп с воротником
  poly(c, [[-260, 0], [250, 0], [210, -150], [120, -230], [-90, -240], [-200, -170]]); c.fill();
  poly(c, [[-100, -236], [110, -232], [70, -290], [-60, -296]]); c.fill();
  // голова в профиль, смотрит влево, чуть подана вперёд
  c.save(); c.translate(-70, -350);
  c.beginPath(); c.ellipse(0, 0, 68, 78, 0, 0, TAU); c.fill();
  poly(c, [[-62, -10], [-92, 12], [-66, 22]]); c.fill();          // нос
  const m = sing * (0.5 + 0.5 * Math.abs(Math.sin(t * 5.3)));
  poly(c, [[-62, 30], [-84, 60 + 8 * m], [-70, 104], [-20, 118], [30, 90], [40, 40]]); c.fill(); // борода
  carve(c, 0.9); c.beginPath(); c.ellipse(-70, 40, 9, 3 + 6 * m, 0, 0, TAU); c.fill(); // рот поёт
  sand(c, 0.96);
  poly(c, [[-62, -40], [66, -44], [74, -100], [-68, -96]]); c.fill();           // ямщицкая шляпа
  c.beginPath(); c.ellipse(2, -42, 104, 18, -0.03, 0, TAU); c.fill();            // поля
  c.lineWidth = 6; c.beginPath(); c.moveTo(56, -96); c.quadraticCurveTo(96, -146, 70, -172); c.stroke(); // перо
  c.restore();
  c.restore();
}
// песня: светлые струны в небе, тёмные — на снегу; curl — закрутка, droop — провисание
function songLines(c, t, x0, y0, u, curl, droop) {
  if (u <= 0) return;
  for (let k = 0; k < 3; k++) {
    const pts = [], L = 1500 * u;
    for (let d = 0; d <= L; d += 24) {
      const ph = d * 0.012 - t * 2.2 + k * 2.1, rr = curl * 70 * sstep(d / 400);
      const x = x0 - d + rr * Math.cos(ph * 1.6), y = y0 + (k - 1) * 36 + 30 * Math.sin(ph) + rr * Math.sin(ph * 1.6) + droop * 0.00028 * d * d;
      pts.push([x, y]);
    }
    if (pts.length < 2) continue;
    c.lineCap = "round"; c.lineWidth = 7 - k * 1.5;
    c.save(); c.beginPath(); c.rect(-10, -10, W + 20, HOR + 12); c.clip(); carve(c, 0.85); curve(c, pts); c.stroke(); c.restore();
    c.save(); c.beginPath(); c.rect(-10, HOR + 2, W + 20, H); c.clip(); sand(c, 0.6); curve(c, pts); c.stroke(); c.restore();
  }
}
function heart(c, x, y, s) {
  c.beginPath(); c.moveTo(x, y + 0.35 * s);
  c.bezierCurveTo(x - 0.9 * s, y - 0.25 * s, x - 0.45 * s, y - 0.95 * s, x, y - 0.45 * s);
  c.bezierCurveTo(x + 0.45 * s, y - 0.95 * s, x + 0.9 * s, y - 0.25 * s, x, y + 0.35 * s);
}

// ---------- Изба, огонёк, вёрсты ----------
function hut(c, x, y, s, a) {
  if (a <= 0) return;
  c.save(); c.translate(x, y); c.scale(s, s); sand(c, 0.95 * a);
  poly(c, [[-80, 0], [80, 0], [80, -70], [0, -130], [-80, -70]]); c.fill();
  c.fillRect(30, -140, 18, 40);
  carve(c, 0.5 * a); c.fillRect(-26, -54, 30, 26);
  c.restore();
}
function verst(c, x, y, s) {
  c.save(); c.translate(x, y); c.scale(s, s);
  sand(c, 0.9); c.fillRect(-15, -330, 30, 330);
  carve(c, 0.85);
  for (let k = 0; k < 7; k++) { const yy = -320 + k * 46; poly(c, [[-11, yy], [11, yy - 12], [11, yy + 10], [-11, yy + 22]]); c.fill(); }
  sand(c, 0.95); c.fillRect(-34, -352, 68, 30); carve(c, 0.6); c.fillRect(-26, -346, 52, 18);
  sand(c, 0.4); c.beginPath(); c.ellipse(0, 4, 60, 10, 0, 0, TAU); c.fill();
  c.restore();
}

// ---------- Комната: камин, огонь, профили, часы ----------
function room(c, a = 0.34) {
  c.globalCompositeOperation = "source-over";
  const g = c.createRadialGradient(960, 520, 120, 960, 480, 1100);
  g.addColorStop(0, `rgba(0,0,0,${a * 0.55})`); g.addColorStop(1, `rgba(0,0,0,${Math.min(0.92, a * 2.3)})`);
  c.fillStyle = g; c.fillRect(-10, -10, W + 20, H + 20);
  // пол
  sand(c, 0.3); c.fillRect(-10, 690, W + 20, 60);
}
function fireplace(c, t, u = 1, flare = 0, fire = 1) {
  if (u <= 0) return;
  c.save(); c.translate(960, 720); c.scale(1, u);
  sand(c, 0.95);
  c.fillRect(-300, -400, 600, 34);       // полка
  c.fillRect(-270, -366, 80, 366); c.fillRect(190, -366, 80, 366);
  c.fillRect(-230, -366, 460, 40);
  // топка: тёмная глубина и огонь светом
  sand(c, 0.88); poly(c, [[-190, 0], [190, 0], [190, -250], [120, -326], [-120, -326], [-190, -250]]); c.fill();
  carve(c, 1);
  const fl = (1 + 0.25 * flare) * fire;
  for (let k = 0; k < 7; k++) {
    const fx = -140 + k * 46, hh = (110 + 60 * Math.sin(k * 1.7) + 30 * Math.sin(t * 7 + k * 2.3)) * fl, wv = 16 * Math.sin(t * 5 + k), wd = 26 + 6 * Math.sin(k * 2.9);
    c.beginPath(); c.moveTo(fx - wd, -24);
    c.bezierCurveTo(fx - wd * 1.3, -hh * 0.45, fx - 6 + wv, -hh * 0.6, fx + wv * 1.4, -hh);
    c.bezierCurveTo(fx + 8 + wv, -hh * 0.62, fx + wd * 1.3, -hh * 0.4, fx + wd, -24); c.closePath(); c.fill();
  }
  carve(c, 0.6); blob(c, 0, -110 * Math.max(0.3, fl), 260 * Math.max(0.35, fl), 0.5);
  sand(c, 0.95); c.fillRect(-150, -30, 300, 26); poly(c, [[-170, -22], [-60, -48], [50, -40], [160, -20]], false); c.lineWidth = 18; c.stroke(); // поленья
  c.restore();
}
// профиль: dir 1 — смотрит вправо, -1 — влево; kind "nina" / "poet"
function profile(c, x, y, s, dir, kind, a = 0.97) {
  if (a <= 0) return;
  c.save(); c.translate(x, y); c.scale(s * dir, s); sand(c, a); c.lineJoin = "round";
  // плечи и шея
  poly(c, [[-170, 0], [130, 0], [110, -70], [40, -120], [36, -190], [-40, -196], [-60, -120], [-150, -80]]); c.fill();
  // голова и лицо (смотрит в +x)
  const face = [[-70, -240], [-60, -330], [-10, -372], [52, -364], [74, -330], [80, -300], [98, -272], [82, -262], [88, -246], [80, -236], [86, -224], [76, -206], [56, -192], [20, -186], [-30, -196]];
  poly(c, face); c.fill();
  if (kind === "nina") {
    disk(c, -40, -380, 46); disk(c, -82, -350, 30); // узел волос
    for (let k = 0; k < 4; k++) { c.beginPath(); c.ellipse(46 + k * 3, -340 + k * 22, 9, 13, 0.3, 0, TAU); c.fill(); } // локоны у виска
    c.lineWidth = 4; c.beginPath(); c.moveTo(-150, -40); c.quadraticCurveTo(-30, 10, 120, -40); c.stroke();
  } else {
    for (let k = 0; k < 9; k++) disk(c, -60 + k * 13 - (k > 5 ? 20 : 0), -350 - 22 * Math.sin(k * 0.45) + (k > 5 ? 30 : 0), 22); // кудри
    poly(c, [[30, -300], [48, -232], [26, -214], [8, -290]]); c.fill(); // бакенбарды
    poly(c, [[-10, -200], [70, -192], [96, -150], [20, -120], [-30, -150]]); c.fill(); // воротник, шейный платок
  }
  c.restore();
}
function guests(c, t, a0, a1) {
  // докучные гости: маленькие силуэты по краям, сдуваются песком
  const g = [[220, 1, "hat"], [330, 1, "bon"], [1590, -1, "bon"], [1700, -1, "hat"]];
  const u = prog(t, a0, a1);
  for (let i = 0; i < g.length; i++) {
    const [x, dir, kind] = g[i], k = clamp(u * 1.6 - i * 0.15, 0, 1); if (k >= 1) continue;
    c.save(); c.translate(x - dir * 60 * sstep(k), 700); sand(c, 0.92 * (1 - sstep(k)));
    poly(c, [[-26, 0], [26, 0], [16, -80], [-16, -80]]); c.fill(); disk(c, 0, -94, 15);
    if (kind === "hat") c.fillRect(-11, -136, 22, 32); else { c.beginPath(); c.ellipse(0, -100, 22, 16, 0, Math.PI, TAU); c.fill(); }
    c.restore();
    if (k > 0) { sand(c, 0.8); grains(c, t, a0 + i * 0.15 * (a1 - a0) / 1.6, a1, 160, (j, bt, r) => ({ x: x + (-24 + 48 * r(1)), y: 700 - 140 * r(2), vx: -dir * (200 + 300 * r(3)), vy: -40 - 80 * r(4), g: 60, life: 0.8, s: 2 + 3 * r(5) }), 40 + i); }
  }
}
function clockFace(c, x, y, r, mAng, hAng, trail = 0) {
  sand(c, 0.96); disk(c, x, y, r + 16);
  carve(c, 1); disk(c, x, y, r);
  sand(c, 0.85);
  for (let k = 0; k < 12; k++) { const a = k / 12 * TAU, r0 = k % 3 ? r - 16 : r - 28; c.lineWidth = k % 3 ? 4 : 8; c.beginPath(); c.moveTo(x + Math.sin(a) * r0, y - Math.cos(a) * r0); c.lineTo(x + Math.sin(a) * (r - 6), y - Math.cos(a) * (r - 6)); c.stroke(); }
  if (trail > 0) { sand(c, 0.22); c.lineWidth = 18; c.beginPath(); c.arc(x, y, r * 0.62, -Math.PI / 2, -Math.PI / 2 + trail * TAU); c.stroke(); }
  sand(c, 0.97); c.lineCap = "round";
  c.lineWidth = 9; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.sin(hAng) * r * 0.5, y - Math.cos(hAng) * r * 0.5); c.stroke();
  c.lineWidth = 6; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.sin(mAng) * r * 0.8, y - Math.cos(mAng) * r * 0.8); c.stroke();
  disk(c, x, y, 9);
}
