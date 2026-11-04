// Палехские фигуры: ночное небо, луна, туманы-ленты, снега с пробелами, ели, тройка, ямщик, изба, вёрсты, горница, Нина и поэт, часы.
const HOR = 430;               // горизонт
const GROUND = PIC.y + PIC.h;  // низ картины

// ---------- Небо ----------
const STARS = []; { const r = mulberry32(31); for (let i = 0; i < 70; i++) STARS.push({ x: PIC.x + 20 + r() * (PIC.w - 40), y: PIC.y + 14 + r() * (HOR - PIC.y - 70), s: 3 + r() * 6, ph: r() * 6 }); }
function sky(c, t, warm = 0) {
  const g = c.createLinearGradient(0, PIC.y, 0, HOR + 20);
  g.addColorStop(0, "#05060a"); g.addColorStop(0.65, "#0d1222"); g.addColorStop(1, "#1d2a48");
  c.fillStyle = g; c.fillRect(PIC.x, PIC.y, PIC.w, HOR + 20 - PIC.y);
  for (const s of STARS) sparkle(c, s.x, s.y, s.s * (0.75 + 0.25 * Math.sin(t * 2.2 + s.ph)), 0.85);
}
// луна: золотой диск, тонкие лучи и кольца; dim — сколько тумана на ней
function moon(c, x, y, r, t, dim = 0, rays = 1) {
  c.save();
  const halo = c.createRadialGradient(x, y, r * 0.8, x, y, r * 3.4); halo.addColorStop(0, "rgba(247,223,152,0.28)"); halo.addColorStop(1, "rgba(247,223,152,0)");
  c.fillStyle = halo; disk(c, x, y, r * 3.4); c.fill();
  if (rays > 0) { c.globalAlpha = rays * 0.8; for (const k of [1.18, 1.3, 1.46]) { disk(c, x, y, r * k); gstroke(c, 1, GOLD); } c.globalAlpha = 1; }
  const g = c.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r); g.addColorStop(0, "#fffaea"); g.addColorStop(0.75, "#efe2bd"); g.addColorStop(1, "#cdb27a");
  disk(c, x, y, r); c.fillStyle = g; c.fill(); gstroke(c, 1.8, GOLD);
  c.fillStyle = "rgba(170,160,140,0.35)"; for (const [dx, dy, rr] of [[-0.3, -0.2, 0.26], [0.22, 0.12, 0.2], [-0.05, 0.36, 0.14]]) { disk(c, x + dx * r, y + dy * r, rr * r); c.fill(); }
  if (dim > 0) { disk(c, x, y, r * 1.02); c.fillStyle = `rgba(150,165,190,${0.6 * dim})`; c.fill(); }
  c.restore();
}
// туман — плывущая лента: голубовато-белая темпера, золотая кромка, белый блик
function fogRibbon(c, t, y, amp, speed, thick, phase, x0 = PIC.x - 60, x1 = PIC.x + PIC.w + 60, a = 0.9) {
  const top = [], bot = [];
  for (let x = x0; x <= x1; x += 40) {
    const w = y + amp * Math.sin(x * 0.0042 + phase + t * speed) + amp * 0.4 * Math.sin(x * 0.011 - t * speed * 1.6);
    const th = thick * (0.55 + 0.45 * Math.sin(x * 0.006 + phase * 1.7 + t * speed * 0.7)) * Math.pow(Math.sin(Math.PI * (x - x0) / (x1 - x0)), 0.7);
    top.push([x, w - th / 2]); bot.push([x, w + th / 2]);
  }
  c.save(); c.globalAlpha = a;
  curve(c, top); curve(c, bot.slice().reverse(), false, false); c.closePath();
  const g = c.createLinearGradient(0, y - thick, 0, y + thick); g.addColorStop(0, "#c9d4e6"); g.addColorStop(1, "#6f7f9e");
  c.fillStyle = g; c.fill();
  curve(c, top); gstroke(c, 1.6, GOLD);
  curve(c, top.map(([x, yy]) => [x, yy + 5])); gstroke(c, 1.2, "rgba(255,255,255,0.7)");
  c.restore();
}
function fogs(c, t, n = 3, a = 0.9) {
  const B = [[318, 20, -0.12, 34, 2.2], [372, 16, 0.1, 28, 4.1], [236, 22, 0.15, 30, 0.5]].slice(0, n);
  for (const b of B) fogRibbon(c, t, ...b, PIC.x - 60, PIC.x + PIC.w + 60, a);
}

// ---------- Снега и ели ----------
const HILLS = [
  { y: HOR + 4, amp: 18, f: 0.0031, ph: 0.4, col: "#c9d3e2" },
  { y: HOR + 70, amp: 26, f: 0.0024, ph: 2.1, col: "#dfe4ec" },
  { y: HOR + 150, amp: 22, f: 0.0036, ph: 4.0, col: SNOW },
];
const hillY = (h, x, off = 0) => h.y + h.amp * Math.sin((x + off) * h.f + h.ph) + h.amp * 0.35 * Math.sin((x + off) * h.f * 2.7 + h.ph * 1.3);
const FIRS = []; { const r = mulberry32(12); for (let i = 0; i < 26; i++) FIRS.push({ x: r() * 2600, s: 0.5 + r() * 0.7, row: i % 2 }); }
function fir(c, x, y, s) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = HAIR; c.fillRect(-3, -12, 6, 14);
  for (let k = 0; k < 4; k++) { const yy = -12 - k * 22, w = 34 - k * 7; poly(c, [[-w, yy], [w, yy], [0, yy - 34]]); paint(c, k % 2 ? FIR_L : FIR, 1.2); }
  c.fillStyle = SNOW; for (let k = 0; k < 4; k++) { const yy = -12 - k * 22, w = 34 - k * 7; c.beginPath(); c.ellipse(0, yy - 4, w * 0.7, 4, 0, Math.PI, TAU); c.fill(); }
  c.restore();
}
// u — насколько проявились поляны (кисть идёт слева направо), off — сдвиг для движения
function glades(c, t, u = 1, off = 0, firs = 1, mx = 1380) {
  c.save();
  // дальний лес на горизонте
  c.beginPath(); c.moveTo(PIC.x - 10, HOR + 14);
  for (let x = PIC.x - 10; x <= PIC.x + PIC.w + 10; x += 12) { const k = Math.floor((x + off * 0.3) / 12), hh = 10 + 22 * hash(k, 11); c.lineTo(x, HOR + 8 - (k % 2 ? hh : hh * 0.35)); }
  c.lineTo(PIC.x + PIC.w + 10, HOR + 16); c.closePath(); paint(c, "#16301f", 1, GOLD_D);
  for (const h of HILLS) {
    const off2 = off * (0.35 + (h.y - HOR) / 400);
    const pts = []; for (let x = PIC.x - 60; x <= PIC.x + PIC.w + 60; x += 30) pts.push([x, hillY(h, x, off2)]);
    curve(c, pts); c.lineTo(PIC.x + PIC.w + 60, GROUND + 10); c.lineTo(PIC.x - 60, GROUND + 10); c.closePath();
    const g = c.createLinearGradient(0, h.y - h.amp, 0, h.y + 120); g.addColorStop(0, h.col); g.addColorStop(1, SNOW_SH);
    c.fillStyle = g; c.fill();
    curve(c, pts); gstroke(c, 1.8, GOLD);
    // пробела: тонкие золотые штрихи вдоль гребня
    for (let k = 1; k <= 3; k++) { curve(c, pts.map(([x, y]) => [x, y + k * 7])); c.globalAlpha = 0.55 - k * 0.13; gstroke(c, 1, GOLD_L); c.globalAlpha = 1; }
    if (firs && h !== HILLS[2]) for (const f of FIRS) { if (f.row !== (h === HILLS[0] ? 0 : 1)) continue; const x = ((f.x - off2) % 2600 + 2600) % 2600 - 400; if (x < PIC.x - 60 || x > PIC.x + PIC.w + 60) continue; fir(c, x, hillY(h, x, off2) + 6, f.s * (h === HILLS[0] ? 0.55 : 0.9)); }
  }
  c.restore();
  // до «поляны» снега в ночной тени; свет расходится кругом из-под луны, по краю — золотая кромка
  if (u < 1) {
    const R = sstep(u) * 1900;
    c.save(); c.beginPath(); c.rect(PIC.x - 10, HOR - 40, PIC.w + 20, GROUND - HOR + 60); c.arc(mx, HOR - 20, Math.max(1, R), 0, TAU, true);
    c.fillStyle = "rgba(9,13,30,0.78)"; c.fill("evenodd");
    if (R > 1) { c.beginPath(); c.rect(PIC.x - 10, HOR - 30, PIC.w + 20, GROUND - HOR + 40); c.clip(); disk(c, mx, HOR - 20, R); gstroke(c, 2.4, GOLD_L); }
    c.restore();
  }
}
// золотые лучи от луны к полянам
function moonBeams(c, mx, my, u) {
  if (u <= 0) return;
  c.save();
  for (let k = 0; k < 11; k++) {
    const a = lerp(-0.9, 0.6, k / 10), L = (HOR + 60 - my) / Math.cos(a) * sstep(u * 1.4 - k * 0.04);
    if (L <= 70) continue;
    const g = c.createLinearGradient(mx, my, mx + Math.sin(a) * L, my + Math.cos(a) * L); g.addColorStop(0, "rgba(247,223,152,0.9)"); g.addColorStop(1, "rgba(247,223,152,0)");
    c.beginPath(); c.moveTo(mx + Math.sin(a) * 70, my + Math.cos(a) * 70); c.lineTo(mx + Math.sin(a) * L, my + Math.cos(a) * L); c.strokeStyle = g; c.lineWidth = 1.6 + (k % 2); c.stroke();
  }
  c.restore();
}

// ---------- Дорога ----------
const ROAD = [[1520, HOR + 6], [1400, HOR + 40], [1180, HOR + 90], [920, HOR + 140], [640, HOR + 186], [380, HOR + 214], [100, HOR + 226]];
function road(c, u = 1) {
  if (u <= 0) return;
  const n = Math.max(2, Math.round(ROAD.length * u));
  c.save();
  for (const [dy, w] of [[-5, 4], [7, 6]]) { curve(c, ROAD.slice(0, n).map(([x, y], i) => [x, y + dy * (i / ROAD.length)])); gstroke(c, w * 0.6 + 1, "#7d8fb0"); }
  curve(c, ROAD.slice(0, n)); c.globalAlpha = 0.6; gstroke(c, 1.2, GOLD); c.restore();
}

// ---------- Конь в «летящем галопе» ----------
// корпус без шеи и шея с головой отдельно: голову можно повернуть вокруг основания шеи
const HORSE_BODY = [[30, -132], [0, -126], [-40, -126], [-72, -132], [-96, -124], [-108, -108], [-110, -90], [-104, -74], [-92, -62], [-70, -62], [-30, -58], [10, -58], [36, -62], [52, -68], [66, -80], [74, -98], [70, -118], [52, -132]];
const HORSE_NECK = [[44, -128], [74, -102], [84, -114], [96, -136], [106, -154], [114, -162], [140, -152], [153, -157], [155, -167], [146, -177], [132, -188], [121, -199], [117, -217], [109, -206], [102, -204], [90, -196], [74, -178], [56, -154], [38, -138]];
const NECK_PIVOT = [62, -120];
// нога — плавный штрих: золотой контур под светлой темперой
function hleg(c, hx, hy, ang, bend, col, w = 1) {
  const L1 = 42, L2 = 46, kx = hx + Math.sin(ang) * L1, ky = hy + Math.cos(ang) * L1, a2 = ang + bend, fx = kx + Math.sin(a2) * L2, fy = ky + Math.cos(a2) * L2;
  for (const [lw, cc] of [[2.6, GOLD], [0, col]]) {
    c.beginPath(); c.moveTo(hx, hy); c.lineTo(kx, ky); gstroke(c, 12 * w + lw, cc);
    c.beginPath(); c.moveTo(kx, ky); c.lineTo(fx, fy); gstroke(c, 6.5 * w + lw, cc);
  }
  c.save(); c.translate(fx, fy); c.rotate(-a2); c.fillStyle = INK; c.beginPath(); c.ellipse(0, 2, 5.5, 4, 0, 0, TAU); c.fill(); c.restore();
}
function horse(c, x, y, s, ph, gait = 1, col = WHITE, headTurn = 0) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.translate(0, -(gait ? 6 * Math.sin(ph * 2) : 2 * Math.abs(Math.sin(ph))));
  const legs = (far) => {
    const cc = far ? "#d6cebd" : col, dx = far ? -8 : 0;
    if (gait) {
      const f = 0.5 + 0.5 * Math.sin(ph + (far ? 0.6 : 0));
      hleg(c, 52 + dx, -72, lerp(0.15, 1.15, f), lerp(-0.85, 0.05, f), cc);
      hleg(c, -92 - dx, -74, lerp(0.35, -1.0, f), lerp(0.75, -0.12, f), cc, 1.1);
    } else {
      const f = Math.sin(ph + (far ? Math.PI : 0));
      hleg(c, 52 + dx, -72, 0.22 * f, -0.6 * Math.max(0, f), cc);
      hleg(c, -92 - dx, -74, -0.22 * f, 0.5 * Math.max(0, -f), cc, 1.1);
    }
  };
  legs(true);
  // хвост — три пряди
  const tw = gait ? 8 * Math.sin(ph * 2 + 1) : 3 * Math.sin(ph);
  for (const [d, w, cc] of [[0, 10, col], [7, 3, GOLD], [-6, 3, GOLD_L]]) { c.beginPath(); c.moveTo(-98, -124); c.bezierCurveTo(-136, -132 + tw + d, -162, -96 + tw, -150 + d, -50 + tw * 1.4); gstroke(c, w, cc); }
  curve(c, HORSE_BODY, true); paint(c, col, 2.2);
  c.save(); curve(c, HORSE_BODY, true); c.clip();
  const g = c.createLinearGradient(0, -130, 0, -56); g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(1, "rgba(110,128,160,0.4)"); c.fillStyle = g; c.fillRect(-120, -140, 200, 90);
  c.restore();
  for (const [x0, y0, x1, y1] of [[-90, -100, -60, -112], [-30, -84, 10, -86], [30, -96, 56, -110]]) { c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 - 8, x1, y1); gstroke(c, 1.1, GOLD); }
  // шея и голова
  const bob = gait ? 0.06 * Math.sin(ph * 2 + 0.6) : 0.04 * Math.sin(ph * 2);
  c.save(); c.translate(NECK_PIVOT[0], NECK_PIVOT[1]); c.rotate(headTurn + bob); c.translate(-NECK_PIVOT[0], -NECK_PIVOT[1]);
  curve(c, HORSE_NECK, true); paint(c, col, 2.2);
  // грива — ровный ряд прядей вдоль гребня
  for (let i = 0; i < 11; i++) { const u = i / 10, p = [lerp(110, 40, u), lerp(-205, -136, u) - 10 * Math.sin(u * Math.PI)], w = 5 * Math.sin(ph * 2 + i * 0.7) * gait;
    c.beginPath(); c.moveTo(p[0], p[1]); c.quadraticCurveTo(p[0] - 16, p[1] - 2 + w * 0.4, p[0] - 30 - 6 * gait, p[1] + 12 + w); gstroke(c, 3.2, GOLD); c.beginPath(); c.moveTo(p[0], p[1]); c.quadraticCurveTo(p[0] - 14, p[1] + w * 0.4, p[0] - 26 - 6 * gait, p[1] + 14 + w); gstroke(c, 2, "#fff7e2"); }
  c.fillStyle = INK; c.beginPath(); c.ellipse(128, -180, 3.4, 2.4, -0.4, 0, TAU); c.fill(); disk(c, 149, -165, 1.8); c.fill();
  c.beginPath(); c.moveTo(118, -198); c.quadraticCurveTo(134, -170, 150, -158); c.moveTo(116, -168); c.lineTo(142, -162); gstroke(c, 1.5, GOLD); // уздечка
  c.beginPath(); c.moveTo(62, -96); c.quadraticCurveTo(70, -122, 52, -140); gstroke(c, 7, RED); c.beginPath(); c.moveTo(62, -96); c.quadraticCurveTo(70, -122, 52, -140); gstroke(c, 1.4, GOLD); // хомут
  c.restore();
  legs(false);
  c.restore();
}

// ---------- Тройка ----------
function troika(c, x, y, s, ph, gait = 1, nod = 0, ring = 0, t = 0) {
  c.save(); c.translate(x, y); c.scale(s, s);
  horse(c, 62, -24, 0.9, ph + 1.9, gait, "#e4ddcf", -0.42);
  // сани (позади коней)
  c.save(); c.translate(-250, 0);
  c.beginPath(); c.moveTo(-170, -4); c.lineTo(40, -4); c.bezierCurveTo(90, -4, 96, -40, 70, -52); gstroke(c, 6, GOLD); scroll(c, 66, -40, 12, -Math.PI / 2, -1, 1.1, 3);
  for (const px of [-140, -80, -20, 30]) { c.beginPath(); c.moveTo(px, -4); c.lineTo(px + 4, -26); gstroke(c, 4, GOLD); }
  curve(c, [[-176, -26], [-150, -28], [40, -28], [62, -44], [60, -80], [36, -86], [-120, -92], [-176, -128], [-196, -118], [-184, -60]], true); paint(c, RED, 2.2);
  for (const [sx, sy, r] of [[-120, -58, 18], [-50, -56, 16], [10, -58, 14]]) { scroll(c, sx, sy, r, 0, 1, 1.3, 1.8); }
  // седок в синей шинели с меховым воротником и в цилиндре
  c.save(); c.translate(-110, -92);
  curve(c, [[-40, 0], [44, 0], [34, -60], [10, -76], [-22, -76], [-40, -50]], true); paint(c, BLUE, 1.8);
  c.beginPath(); c.ellipse(-2, -74, 30, 12, 0, 0, TAU); paint(c, OCHRE, 1.4);
  disk(c, 6, -94, 15); paint(c, SKIN, 1.2); c.fillStyle = HAIR; c.beginPath(); c.arc(0, -98, 14, Math.PI * 0.9, Math.PI * 1.9); c.fill();
  poly(c, [[-12, -104], [18, -104], [20, -140], [-14, -140]]); paint(c, INK, 1.4); poly(c, [[-22, -104], [28, -104], [28, -99], [-22, -99]]); paint(c, INK, 1.2);
  c.restore();
  // ямщик на облучке: алый кафтан, шляпа с пером, борода
  c.save(); c.translate(36, -86); c.rotate(-0.05);
  curve(c, [[-30, 0], [26, 0], [20, -54], [0, -66], [-22, -58]], true); paint(c, RED, 1.8);
  c.beginPath(); c.moveTo(-26, -30); c.lineTo(22, -30); gstroke(c, 3, GOLD); // кушак
  c.save(); c.translate(0, -70); c.rotate(nod * 0.7);
  disk(c, 4, -14, 14); paint(c, SKIN, 1.2);
  curve(c, [[2, -6], [20, -6], [18, 10], [6, 16], [-4, 6]], true); paint(c, HAIR, 1);
  poly(c, [[-14, -22], [20, -24], [18, -40], [-12, -38]]); paint(c, INK, 1.4); c.beginPath(); c.ellipse(3, -23, 22, 4, 0, 0, TAU); paint(c, INK, 1.2);
  c.beginPath(); c.moveTo(14, -38); c.quadraticCurveTo(34, -60, 22, -74); gstroke(c, 3, GOLD); sparkle(c, 22, -74, 6, 1, "#5fb0c8");
  c.restore();
  c.beginPath(); c.moveTo(10, -44); c.lineTo(38, -26 + nod * 10); gstroke(c, 8, RED);
  c.restore();
  c.restore();
  // оглобли и вожжи
  c.beginPath(); c.moveTo(40, -96); c.lineTo(-196, -58); gstroke(c, 4, GOLD);
  c.beginPath(); c.moveTo(-176, -112 + nod * 10); c.quadraticCurveTo(-40, -70 + nod * 20, 140, -164); gstroke(c, 1.2, GOLD_L);
  horse(c, 0, 0, 1, ph, gait, WHITE, 0);
  // дуга алая с золотом и колокольчик
  c.beginPath(); c.ellipse(58, -124, 24, 92, 0, Math.PI, TAU); gstroke(c, 9, RED); c.beginPath(); c.ellipse(58, -124, 24, 92, 0, Math.PI, TAU); gstroke(c, 1.8, GOLD);
  const sw = ring * 0.4 * Math.sin(t * 9);
  c.save(); c.translate(58, -214); c.rotate(sw); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 12); gstroke(c, 2, GOLD);
  c.scale(1.6, 1.6); poly(c, [[-6, 12], [6, 12], [12, 30], [-12, 30]]); c.fillStyle = goldGrad(c, -12, 12, 12, 30); c.fill(); gstroke(c, 1.4, INK); c.fillStyle = INK; disk(c, 0, 33, 3); c.fill(); c.restore();
  horse(c, -48, 18, 1.04, ph + 0.8, gait, "#f3eee4", 0.36);
  c.restore();
}
function hoofSnow(c, t, x, y, s, a, b, seed = 5) {
  particles(t, a, b, 60, (i, bt, r) => ({ x: x + (-40 + 120 * r(1)) * s - (r(6) > 0.6 ? 260 * s : 0), y: y - 4 * s, vx: -(120 + 200 * r(2)) * s, vy: -(60 + 140 * r(3)) * s, g: 420 * s, life: 0.5 + 0.3 * r(4), s: (3 + 4 * r(5)) * s }), seed,
    (px, py, k, p) => { c.globalAlpha = 1 - k; c.fillStyle = hash(p.x | 0, 2) > 0.7 ? GOLD_L : "#ffffff"; disk(c, px, py, p.s * 0.5); c.fill(); c.globalAlpha = 1; });
}
function soundRings(c, t, x, y, a, b, period, rmax, k = 1) {
  for (let i = 0; a + i * period < b; i++) {
    const age = t - (a + i * period); if (age < 0 || age > 1.2) continue;
    const u = age / 1.2; c.save(); c.globalAlpha = (1 - u) * k; c.beginPath(); c.arc(x, y, 14 + rmax * u, Math.PI * 0.95, Math.PI * 2.05); gstroke(c, 2.4 * (1 - u) + 0.8, GOLD_L); c.restore();
  }
}

// ---------- Ямщик крупно ----------
function driverBig(c, x, y, s, t, sing = 1) {
  c.save(); c.translate(x, y); c.scale(s, s);
  // плечи в алом кафтане с золотым шитьём
  curve(c, [[-250, 30], [240, 30], [210, -120], [120, -210], [-80, -220], [-190, -150]], true); paint(c, RED, 2.4);
  for (let k = 0; k < 5; k++) scroll(c, -150 + k * 70, -80 + 20 * Math.sin(k), 22, k, k % 2 ? 1 : -1, 1.2, 2);
  curve(c, [[-90, -216], [110, -212], [80, -262], [-60, -268]], true); paint(c, OCHRE, 2); // меховой воротник
  // голова в профиль влево
  c.save(); c.translate(-50, -330);
  curve(c, [[60, -60], [10, -86], [-40, -70], [-56, -40], [-58, -16], [-76, 8], [-58, 14], [-54, 40], [-20, 64], [40, 60], [70, 10]], true); paint(c, SKIN, 2);
  const m = sing * (0.4 + 0.6 * Math.abs(Math.sin(t * 5.3)));
  curve(c, [[-50, 30], [-64, 58 + 6 * m], [-50, 104], [0, 124], [44, 96], [60, 40], [20, 40]], true); paint(c, HAIR, 1.8); // борода
  c.fillStyle = "#3a1410"; c.beginPath(); c.ellipse(-50, 30, 8, 2 + 5 * m, 0, 0, TAU); c.fill();
  c.fillStyle = INK; c.beginPath(); c.ellipse(-30, -22, 5, 3, 0, 0, TAU); c.fill(); c.beginPath(); c.moveTo(-42, -34); c.quadraticCurveTo(-30, -40, -18, -34); gstroke(c, 2.4, HAIR);
  curve(c, [[50, -40], [70, -10], [64, 30], [40, 40]]); gstroke(c, 8, HAIR);
  // шляпа с пером
  poly(c, [[-58, -66], [70, -70], [78, -128], [-64, -124]]); paint(c, INK, 2);
  c.beginPath(); c.ellipse(4, -68, 100, 16, -0.03, 0, TAU); paint(c, INK, 2);
  c.beginPath(); c.moveTo(-60, -84); c.lineTo(74, -88); gstroke(c, 5, GOLD);
  c.beginPath(); c.moveTo(60, -120); c.quadraticCurveTo(110, -170, 80, -210); gstroke(c, 4, GOLD); sparkle(c, 80, -210, 14, 1, "#5fb0c8"); sparkle(c, 80, -210, 6, 1, GOLD_L);
  c.restore();
  c.restore();
}
// песня: золотые ленты; curl — завитки удали, droop — тоска
function songRibbons(c, t, x0, y0, u, curl, droop) {
  if (u <= 0) return;
  for (let k = 0; k < 3; k++) {
    const pts = [], L = 1200 * u;
    for (let d = 0; d <= L; d += 22) {
      const ph = d * 0.012 - t * 2.2 + k * 2.1, rr = curl * 60 * sstep(d / 380);
      pts.push([x0 - d + rr * Math.cos(ph * 1.6), y0 + (k - 1) * 30 + 26 * Math.sin(ph) + rr * Math.sin(ph * 1.6) + droop * 0.00034 * d * d]);
    }
    if (pts.length < 2) continue;
    curve(c, pts); gstroke(c, 5 - k, k === 1 ? GOLD_L : GOLD);
  }
}
function heart(c, x, y, s) {
  c.beginPath(); c.moveTo(x, y + 0.35 * s);
  c.bezierCurveTo(x - 0.9 * s, y - 0.25 * s, x - 0.45 * s, y - 0.95 * s, x, y - 0.45 * s);
  c.bezierCurveTo(x + 0.45 * s, y - 0.95 * s, x + 0.9 * s, y - 0.25 * s, x, y + 0.35 * s);
}

// ---------- Изба, вёрсты ----------
function hut(c, x, y, s, a, draw = 1) {
  if (a <= 0) return;
  c.save(); c.translate(x, y); c.scale(s, s); c.globalAlpha = a;
  poly(c, [[-80, 0], [80, 0], [80, -70], [-80, -70]]); paint(c, "#241812", 1.8);
  for (let k = 1; k < 5; k++) { c.beginPath(); c.moveTo(-80, -k * 14); c.lineTo(80, -k * 14); gstroke(c, 1, "#4a3426"); }
  poly(c, [[-96, -66], [96, -66], [0, -140]]); paint(c, SNOW, 2);
  poly(c, [[-20, -54], [20, -54], [20, -22], [-20, -22]]); paint(c, "#0b0908", 2);
  poly(c, [[-30, -58], [30, -58], [0, -76]]); paint(c, null, 1.6); scroll(c, -26, -14, 7, 0, 1, 1.1, 1.4); scroll(c, 26, -14, 7, Math.PI, -1, 1.1, 1.4);
  poly(c, [[30, -150], [46, -150], [46, -110], [30, -110]]); paint(c, "#241812", 1.2);
  c.restore();
}
function verst(c, x, y, s) {
  c.save(); c.translate(x, y); c.scale(s, s);
  poly(c, [[-14, 0], [14, 0], [14, -300], [-14, -300]]); paint(c, WHITE, 1.6);
  c.save(); poly(c, [[-14, 0], [14, 0], [14, -300], [-14, -300]]); c.clip();
  c.fillStyle = INK; for (let k = 0; k < 9; k++) { const yy = -300 + k * 38; poly(c, [[-14, yy], [14, yy - 12], [14, yy + 8], [-14, yy + 20]]); c.fill(); }
  c.restore();
  poly(c, [[-30, -300], [30, -300], [24, -324], [-24, -324]]); paint(c, goldGrad(c, -30, -324, 30, -300), 1.2, GOLD_D);
  c.fillStyle = "rgba(111,132,166,0.6)"; c.beginPath(); c.ellipse(0, 4, 50, 8, 0, 0, TAU); c.fill();
  c.restore();
}

// ---------- Горница: стены, камин, огонь ----------
function room(c, t, lit = 1) {
  const g = c.createLinearGradient(0, PIC.y, 0, GROUND);
  g.addColorStop(0, `rgb(${lerp(28, 120, lit) | 0},${lerp(10, 30, lit) | 0},${lerp(8, 22, lit) | 0})`); g.addColorStop(1, `rgb(${lerp(18, 82, lit) | 0},${lerp(8, 18, lit) | 0},${lerp(6, 14, lit) | 0})`);
  c.fillStyle = g; c.fillRect(PIC.x, PIC.y, PIC.w, PIC.h);
  // золотой узор по стене
  c.save(); c.globalAlpha = 0.25 + 0.45 * lit;
  for (let y = PIC.y + 50; y < GROUND - 90; y += 90) for (let x = PIC.x + 50 + ((y / 90) % 2) * 45; x < PIC.x + PIC.w; x += 90) { sparkle(c, x, y, 9, 1, GOLD); disk(c, x, y, 2); c.fillStyle = GOLD_L; c.fill(); }
  c.restore();
  // пол охрой
  c.fillStyle = `rgb(${lerp(40, 150, lit) | 0},${lerp(26, 98, lit) | 0},${lerp(12, 40, lit) | 0})`; c.fillRect(PIC.x, GROUND - 70, PIC.w, 70);
  c.beginPath(); c.moveTo(PIC.x, GROUND - 70); c.lineTo(PIC.x + PIC.w, GROUND - 70); gstroke(c, 2, GOLD);
}
function fireplace(c, t, u = 1, flare = 0, fire = 1) {
  if (u <= 0) return;
  c.save(); c.translate(960, GROUND - 40); c.scale(1, u);
  // портал из белого камня в золоте
  poly(c, [[-290, -390], [290, -390], [290, -356], [-290, -356]]); paint(c, "#e9dcc4", 2.4);
  poly(c, [[-260, -356], [-180, -356], [-180, 0], [-260, 0]]); paint(c, "#e2d3b8", 2);
  poly(c, [[180, -356], [260, -356], [260, 0], [180, 0]]); paint(c, "#e2d3b8", 2);
  for (const sx of [-220, 220]) { scroll(c, sx, -300, 22, Math.PI / 2, sx > 0 ? 1 : -1, 1.2, 2); scroll(c, sx, -120, 22, -Math.PI / 2, sx > 0 ? -1 : 1, 1.2, 2); }
  c.beginPath(); c.moveTo(-180, 0); c.lineTo(-180, -250); c.quadraticCurveTo(0, -360, 180, -250); c.lineTo(180, 0); c.closePath(); paint(c, "#120806", 2.2);
  // огонь: алые и золотые языки
  const fl = (1 + 0.25 * flare) * fire;
  c.save(); c.beginPath(); c.moveTo(-180, 0); c.lineTo(-180, -250); c.quadraticCurveTo(0, -360, 180, -250); c.lineTo(180, 0); c.closePath(); c.clip();
  const glow = c.createRadialGradient(0, -40, 10, 0, -60, 260); glow.addColorStop(0, `rgba(255,170,60,${0.65 * Math.min(1, fl)})`); glow.addColorStop(1, "rgba(255,120,40,0)"); c.fillStyle = glow; c.fillRect(-180, -330, 360, 330);
  for (const [cols, sc] of [[[RED, "#e0572b"], 1], [["#f2a33a", GOLD_L], 0.62]]) {
    for (let k = 0; k < 6; k++) {
      const fx = -125 + k * 50, hh = (130 + 60 * Math.sin(k * 1.7) + 28 * Math.sin(t * 7 + k * 2.3)) * fl * sc, wv = 18 * Math.sin(t * 5 + k), wd = 28 * sc + 6;
      if (hh < 4) continue;
      c.beginPath(); c.moveTo(fx - wd, -20);
      c.bezierCurveTo(fx - wd * 1.4, -hh * 0.5, fx - 8 + wv, -hh * 0.62, fx + wv * 1.5, -hh);
      c.bezierCurveTo(fx + 8 + wv, -hh * 0.6, fx + wd * 1.3, -hh * 0.42, fx + wd, -20); c.closePath();
      c.fillStyle = cols[k % 2]; c.fill(); gstroke(c, 1, GOLD);
    }
  }
  c.restore();
  // поленья и угольки
  for (const [x0, a] of [[-120, -0.12], [10, 0.1]]) { c.save(); c.translate(x0, -22); c.rotate(a); poly(c, [[0, 0], [120, 0], [120, 22], [0, 22]]); paint(c, "#5a3218", 1.4); c.restore(); }
  for (let k = 0; k < 9; k++) { c.fillStyle = k % 2 ? "#ff7a2a" : GOLD_L; c.globalAlpha = 0.6 + 0.4 * Math.sin(t * 4 + k * 1.7); disk(c, -110 + k * 28, -8 + 6 * Math.sin(k), 4); c.fill(); }
  c.globalAlpha = 1;
  c.restore();
}

// ---------- Профили: Нина и поэт ----------
// лицо в профиль, смотрит в +x (начало координат — основание шеи спереди); дальше зеркалится
const FACE = [[-40, 10], [-44, -44], [-66, -84], [-80, -130], [-66, -180], [-30, -210], [16, -212], [48, -196], [60, -170], [62, -150], [58, -141], [66, -126], [80, -106], [78, -100], [66, -98], [68, -92], [70, -86], [64, -82], [68, -78], [62, -70], [64, -60], [56, -48], [34, -42], [24, -30], [18, 10]];
function eye(c) {
  c.fillStyle = "#fbf6ec"; c.beginPath(); c.moveTo(30, -141); c.quadraticCurveTo(40, -148, 50, -141); c.quadraticCurveTo(40, -136, 30, -141); c.fill();
  c.fillStyle = INK; disk(c, 44, -141.5, 3.6); c.fill();
  c.beginPath(); c.moveTo(29, -142); c.quadraticCurveTo(40, -150, 51, -142); gstroke(c, 1.8, INK);
  c.beginPath(); c.moveTo(24, -156); c.quadraticCurveTo(40, -164, 56, -155); gstroke(c, 2.6, HAIR);
}
function bust(c, x, y, s, dir, kind, a = 1) {
  if (a <= 0) return;
  c.save(); c.translate(x, y); c.scale(s * dir, s); c.globalAlpha = a;
  if (kind === "nina") {
    curve(c, [[-150, 120], [150, 120], [140, 50], [90, 22], [30, 14], [-40, 14], [-110, 24], [-150, 60]], true); paint(c, ROSE, 2.2);        // платье
    c.beginPath(); c.moveTo(-96, 30); c.quadraticCurveTo(-10, 66, 80, 26); gstroke(c, 2.2, GOLD);
    curve(c, [[-150, 60], [-110, 24], [-86, 40], [-96, 96], [-150, 110]], true); paint(c, "#e9a8a2", 1.6);                                    // рукав-фонарик
  } else {
    curve(c, [[-150, 120], [150, 120], [146, 40], [96, 14], [40, 10], [-50, 8], [-120, 20], [-150, 60]], true); paint(c, INK, 2.2);            // сюртук
    poly(c, [[-30, 0], [16, -36], [36, -8], [70, 30], [10, 40], [-40, 30]]); paint(c, WHITE, 1.8);                                           // воротник и шейный платок
    c.beginPath(); c.moveTo(-6, 18); c.quadraticCurveTo(14, 30, 30, 18); gstroke(c, 1.4, GOLD);
  }
  curve(c, FACE, true); paint(c, SKIN, 1.8);
  eye(c);
  c.fillStyle = "rgba(205,90,80,0.32)"; c.beginPath(); c.ellipse(30, -106, 16, 10, 0, 0, TAU); c.fill();
  c.beginPath(); c.moveTo(64, -83); c.lineTo(70, -84); gstroke(c, 2, "#a63c35"); c.beginPath(); c.moveTo(66, -98); c.quadraticCurveTo(72, -93, 70, -88); gstroke(c, 1.2, "#b0614f");
  if (kind === "nina") {
    curve(c, [[52, -194], [30, -212], [-10, -224], [-56, -214], [-84, -178], [-88, -132], [-76, -98], [-58, -92], [-46, -128], [-30, -160], [0, -182], [34, -188]], true); paint(c, HAIR, 1.8);
    disk(c, -40, -232, 34); paint(c, HAIR, 1.8); for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(-40, -232, 12 + k * 7, 0.4 + k, 2.4 + k); gstroke(c, 1.4, "#6e4630"); }
    poly(c, [[-62, -262], [-40, -284], [-18, -262]]); paint(c, goldGrad(c, -62, -284, -18, -262), 1, GOLD_D); sparkle(c, -40, -272, 6, 1);   // гребень
    for (let k = 0; k < 3; k++) { c.beginPath(); c.ellipse(-62 + k * 2, -96 + k * 15, 7, 10, 0.25, 0, TAU); paint(c, HAIR, 1.2, "#6e4630"); }  // локоны за ухом
    c.beginPath(); c.moveTo(-14, -104); c.lineTo(-14, -86); gstroke(c, 1.6, GOLD); c.fillStyle = GOLD_L; disk(c, -14, -80, 5); c.fill(); // серьга
  } else {
    const cap = [[56, -186], [40, -210], [0, -228], [-50, -222], [-86, -186], [-92, -136], [-80, -96], [-58, -92], [-44, -126], [-18, -150], [12, -176], [40, -180]];
    c.beginPath(); c.ellipse(-24, -118, 8, 15, 0.2, 0, TAU); paint(c, SKIN, 1.4);                                                             // ухо
    for (let k = 0; k < cap.length - 3; k++) { const [px, py] = cap[k]; c.beginPath(); c.arc(px, py, 14, 0, TAU); c.fillStyle = HAIR; c.fill(); }   // кудри
    curve(c, cap, true); paint(c, HAIR, 0);
    for (let k = 0; k < cap.length - 3; k++) { const [px, py] = cap[k]; c.beginPath(); c.arc(px, py, 9, 0.3 * k, 0.3 * k + 4.2); gstroke(c, 1.6, "#6e4630"); }
    curve(c, cap, true); gstroke(c, 1.4, GOLD);

  }
  c.restore();
}

// ---------- Часы ----------
function clockFace(c, x, y, r, mAng, hAng, trail = 0) {
  disk(c, x, y, r + 18); c.fillStyle = goldGrad(c, x - r, y - r, x + r, y + r); c.fill(); gstroke(c, 1.6, GOLD_D);
  disk(c, x, y, r); paint(c, "#f6eedb", 1.6, GOLD_D);
  for (let k = 0; k < 12; k++) { const a = k / 12 * TAU, r0 = k % 3 ? r - 14 : r - 26; c.beginPath(); c.moveTo(x + Math.sin(a) * r0, y - Math.cos(a) * r0); c.lineTo(x + Math.sin(a) * (r - 6), y - Math.cos(a) * (r - 6)); gstroke(c, k % 3 ? 3 : 6, INK); }
  if (trail > 0) { c.beginPath(); c.arc(x, y, r * 0.62, -Math.PI / 2, -Math.PI / 2 + trail * TAU); gstroke(c, 6, GOLD); }
  c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.sin(hAng) * r * 0.5, y - Math.cos(hAng) * r * 0.5); gstroke(c, 8, INK);
  c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.sin(mAng) * r * 0.8, y - Math.cos(mAng) * r * 0.8); gstroke(c, 5, INK);
  disk(c, x, y, 8); c.fillStyle = GOLD; c.fill();
}
function guest(c, x, y, s, kind, a) {
  if (a <= 0) return;
  c.save(); c.translate(x, y); c.scale(s, s); c.globalAlpha = a;
  if (kind === "hat") {
    poly(c, [[-14, 0], [-6, -46], [6, -46], [14, 0], [22, 0], [14, -60], [24, -64], [22, -96], [-22, -96], [-26, -60], [-36, -10], [-22, -40], [-22, 0]]); paint(c, INK, 1.4);
    disk(c, 0, -110, 15); paint(c, SKIN, 1.2); poly(c, [[-12, -120], [12, -120], [12, -158], [-12, -158]]); paint(c, INK, 1.2); poly(c, [[-19, -124], [19, -124], [19, -119], [-19, -119]]); paint(c, INK, 1);
  } else {
    poly(c, [[-36, 0], [36, 0], [16, -58], [18, -92], [-18, -92], [-16, -58]]); paint(c, BLUE, 1.4);
    disk(c, 0, -106, 14); paint(c, SKIN, 1.2); c.beginPath(); c.ellipse(-4, -112, 22, 20, 0, Math.PI * 0.9, Math.PI * 2.1); paint(c, OCHRE, 1.2);
  }
  c.restore();
}
