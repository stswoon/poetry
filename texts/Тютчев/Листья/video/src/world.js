// ---------- декорации и реквизит: всё из бумаги ----------
const GY = 900; // земля в координатах мира

// ель: ярусы с бахромой хвои
function firPath(h, w, tiers, seed) {
  const r = mulberry32(seed), top = -h, base = -h * 0.12, R = [[0, top]];
  // правая сторона сверху вниз: скат яруса, затем бахрома иголок внутрь до начала следующего яруса
  let x = 0, y = top;
  for (let i = 0; i < tiers; i++) {
    const y1 = lerp(top, base, (i + 1) / tiers), wB = w * 0.5 * (0.32 + 0.68 * (i + 1) / tiers);
    const n = 4;
    for (let j = 1; j <= n; j++) { const u = j / n; R.push([lerp(x, wB, u) + (j < n ? (r() - 0.3) * 6 : 0), lerp(y, y1, u) + (j < n ? (r() - 0.5) * 6 : 0)]); }
    const wIn = i < tiers - 1 ? wB * 0.52 : 0, m = Math.max(3, Math.round((wB - wIn) / 16));
    for (let j = 1; j <= m; j++) { const u = j / m; R.push([lerp(wB, wIn, u), y1 + (j % 2 ? h * 0.012 : -h * 0.022) + (r() - 0.5) * 3]); }
    x = wIn; y = y1 - h * 0.03;
    if (i < tiers - 1) R.push([x, y]);
  }
  const Lft = R.slice(1, -1).reverse().map(([a, b]) => [-a, b + (r() - 0.5) * 2]);
  return polyPath(R.concat(Lft));
}
const FIRS = {};
function firShape(id, h, w, tiers, seed) { if (!FIRS[id]) FIRS[id] = { p: firPath(h, w, tiers, seed), h, w, tiers }; return FIRS[id]; }
// пучок хвои сосны — неровный овал с иголками по краю
function tuftPath(rx, ry, seed) {
  const r = mulberry32(seed), pts = [], n = 46;
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU, k = i % 2 ? 1.0 + r() * 0.08 : 0.86; pts.push([Math.cos(a) * rx * k, Math.sin(a) * ry * k * (Math.sin(a) > 0 ? 0.75 : 1)]); }
  return polyPath(pts);
}
const TUFTS = [tuftPath(150, 70, 3), tuftPath(115, 56, 5), tuftPath(95, 48, 7), tuftPath(130, 60, 9)];

// снежная шапка на ярусе
function snowCap(w, seed) {
  const r = mulberry32(seed), pts = [];
  const n = 14;
  for (let i = 0; i <= n; i++) { const u = i / n, x = lerp(-w, w, u); pts.push([x, -Math.sin(Math.PI * u) * w * 0.32 - 0.04]); }
  for (let i = n; i >= 0; i--) { const u = i / n, x = lerp(-w, w, u); pts.push([x * 0.96, (i % 3 === 0 ? 0.16 + r() * 0.1 : 0.06) * Math.sin(Math.PI * u)]); }
  return smoothPath(pts);
}
const CAPS_SNOW = [0, 1, 2, 3, 4, 5].map((i) => snowCap(1, 40 + i));

// ель с лицом и снегом. o: {k (рост 0..1), snow 0..1, shake, face, sleepy, blanket 0..1, patch 0..1, tone}
function drawFir(c, x, y, h, w, o = {}) {
  const sh = firShape(`${h}|${w}|${o.tiers ?? 5}`, h, w, o.tiers ?? 5, o.seed ?? 1);
  const bx = boil(o.seed ?? 1, 0.7);
  c.save(); c.translate(x + bx[0], y + bx[1]);
  const k = o.k ?? 1, sq = o.sq ?? 0;
  c.rotate((o.lean ?? 0) + (o.shake ?? 0) * 0.04 + bx[2]);
  c.scale(1 + sq * 0.12, k * (1 - sq * 0.1));
  // ствол
  cut(c, polyPath([[-w * 0.05, 0], [w * 0.05, 0], [w * 0.04, -h * 0.14], [-w * 0.04, -h * 0.14]]), "#6a4428", { lift: 0.8 });
  const g = (cc) => { const gr = cc.createLinearGradient(0, -h, 0, 0); gr.addColorStop(0, o.tone2 ?? "#3f6a4c"); gr.addColorStop(1, o.tone ?? "#25402f"); return gr; };
  cut(c, sh.p, g, { lift: 1.1, edgeCol: "rgba(200,230,190,0.35)" });
  // светлая хвоя по ярусам — полоски иголок
  c.save(); c.clip(sh.p); c.strokeStyle = "rgba(150,190,140,0.32)"; c.lineWidth = 2 / CAMZ;
  for (let i = 0; i < 26; i++) { const yy = -h * (0.12 + 0.82 * (i / 26)), ww = w * 0.48 * (1 - (-yy / h)); c.beginPath(); c.moveTo(-ww * 0.7, yy); c.lineTo(-ww * 0.7 + ww * 0.25, yy + 10); c.moveTo(ww * 0.7, yy); c.lineTo(ww * 0.7 - ww * 0.25, yy + 10); c.stroke(); }
  c.restore();
  // лист перекрашивает бок ели в жёлтый; ель стряхивает желтизну
  if ((o.yellow ?? 0) > 0.01) {
    const yx = o.yx ?? w * 0.36, yy = o.yy ?? -h * 0.4, r = w * 0.85 * easeOut(clamp(o.yellow, 0, 1)), fade = 1 - clamp(o.yellowGone ?? 0, 0, 1);
    c.save(); c.clip(sh.p); c.globalAlpha = 0.88 * fade;
    const g = c.createRadialGradient(yx, yy, 0, yx, yy, Math.max(1, r)); g.addColorStop(0, "#f0c040"); g.addColorStop(0.7, "#e6a92e"); g.addColorStop(1, "rgba(230,169,46,0)");
    c.fillStyle = g; c.fillRect(yx - r, yy - r, 2 * r, 2 * r);
    c.strokeStyle = "rgba(255,236,170,0.6)"; c.lineWidth = 2 / CAMZ;
    for (let i = 0; i < 26; i++) { const yy2 = -h * (0.12 + 0.82 * (i / 26)), ww = w * 0.48 * (1 - (-yy2 / h)); if (Math.hypot(ww * 0.7 - yx, yy2 - yy) > r) continue; c.beginPath(); c.moveTo(ww * 0.7, yy2); c.lineTo(ww * 0.7 - ww * 0.25, yy2 + 10); c.stroke(); }
    c.restore();
  }
  // снег на ярусах: шапки лежат на скатах ярусов
  const snow = o.snow ?? 0;
  if (snow > 0.01) {
    const tiers = o.tiers ?? 5;
    for (let i = 0; i < tiers; i++) {
      if (o.face && i === 3) continue; // на ярусе с лицом снега нет — не режет глаза
      const u = clamp(snow * (tiers + 1) - i * 0.8, 0, 1); if (u <= 0) continue;
      const y1 = lerp(-h, -h * 0.12, (i + 1) / tiers), th = (h * 0.88) / tiers, wB = w * 0.5 * (0.32 + 0.68 * (i + 1) / tiers);
      const cy = y1 - th * 0.42, cw = wB * 0.62;
      c.save(); c.translate(0, cy - (1 - easeOut(u)) * 120); c.scale(cw * (0.6 + 0.4 * u), cw * 0.75);
      const kz = CAMZ; CAMZ = kz * cw; cut(c, CAPS_SNOW[i % 6], "#f7f4ee", { lift: 0.5, edgeCol: "rgba(255,255,255,0.8)" }); CAMZ = kz; c.restore();
    }
  }
  // снежное одеяло: укрывает ель по силуэту, сверху отогнутый край
  if ((o.blanket ?? 0) > 0.01) {
    const b = easeOut(o.blanket), yT = lerp(0, -h * 0.5, b), wT = w * 0.5 * (0.32 + 0.68 * (1 + yT / h * 1.0)) * 1.18, wB = w * 0.5;
    const pts = [[-wB, 24], [-wT, yT + 10], [-wT * 0.5, yT - 8], [0, yT - 2], [wT * 0.5, yT - 10], [wT, yT + 8], [wB, 24]];
    cut(c, smoothPath(pts), "#f5f2ea", { lift: 1, edgeCol: "rgba(255,255,255,0.9)" });
    const band = [[-wT * 1.04, yT + 6], [-wT * 0.5, yT - 10], [0, yT - 4], [wT * 0.5, yT - 12], [wT * 1.04, yT + 4], [wT * 1.08, yT + 46], [wT * 0.5, yT + 34], [0, yT + 40], [-wT * 0.5, yT + 32], [-wT * 1.08, yT + 48]];
    cut(c, smoothPath(band), "#e6e1d4", { lift: 0.5 });
    c.save(); c.setLineDash([10 / CAMZ, 9 / CAMZ]); c.strokeStyle = "rgba(150,170,190,0.6)"; c.lineWidth = 2.2 / CAMZ;
    for (const yy of [0.35, 0.7]) { const y2 = lerp(yT + 60, 10, yy), ww = lerp(wT, wB, yy) * 0.9; c.beginPath(); c.moveTo(-ww, y2); c.quadraticCurveTo(0, y2 + 14, ww, y2); c.stroke(); }
    c.restore();
  }
  c.restore();
  // лицо — без растяжения ствола
  if (o.face) {
    c.save(); c.translate(x + bx[0], y + bx[1]); c.rotate((o.lean ?? 0) + (o.shake ?? 0) * 0.04 + bx[2]);
    drawFace(c, 0, -h * (o.faceY ?? 0.5) * k * (1 - sq * 0.1), w * 0.62, o.face, 0);
    c.restore();
  }
}

// сосна: ствол с корой и пучки хвои
function drawPine(c, x, y, h, o = {}) {
  const bx = boil((o.seed ?? 5) + 3, 0.7), k = o.k ?? 1;
  c.save(); c.translate(x + bx[0], y + bx[1]); c.rotate((o.shake ?? 0) * 0.035 + bx[2]); c.scale(1, k);
  const tw = h * 0.055;
  const trunk = polyPath([[-tw, 0], [tw, 0], [tw * 0.7, -h * 0.82], [-tw * 0.7, -h * 0.82]]);
  cut(c, trunk, (cc) => { const g = cc.createLinearGradient(-tw, 0, tw, 0); g.addColorStop(0, "#8a4b2a"); g.addColorStop(0.5, "#b8673a"); g.addColorStop(1, "#7a3f22"); return g; }, { lift: 1 });
  c.save(); c.clip(trunk); c.strokeStyle = "rgba(60,30,14,0.45)"; c.lineWidth = 2.4 / CAMZ;
  const r = mulberry32(o.seed ?? 5);
  for (let i = 0; i < 14; i++) { const yy = -h * 0.8 * r(), xx = (r() - 0.5) * tw; c.beginPath(); c.moveTo(xx - 10, yy); c.lineTo(xx + 10, yy - 4); c.stroke(); }
  c.restore();
  // сучки и пучки
  const T = [[0, -h * 0.9, 1.0, 0], [-h * 0.17, -h * 0.74, 0.8, 1], [h * 0.18, -h * 0.68, 0.85, 3], [-h * 0.05, -h * 0.6, 0.65, 2]];
  for (const [tx, ty, sc, id] of T.slice().reverse()) {
    if (tx) { c.save(); c.strokeStyle = "#7a4426"; c.lineWidth = 9 / CAMZ * CAMZ; c.lineCap = "round"; c.beginPath(); c.moveTo(0, ty + 30); c.lineTo(tx * 0.8, ty + 10); c.stroke(); c.restore(); }
    c.save(); c.translate(tx, ty); c.scale(sc * h / 700, sc * h / 700);
    const kz = CAMZ; CAMZ = kz * sc * h / 700;
    cut(c, TUFTS[id], (cc) => { const g = cc.createLinearGradient(0, -70, 0, 70); g.addColorStop(0, "#4f7d55"); g.addColorStop(1, "#2a4a33"); return g; }, { lift: 1, edgeCol: "rgba(200,230,190,0.35)" });
    if ((o.snow ?? 0) > 0.01) { const u = clamp(o.snow * 1.5 - id * 0.15, 0, 1); if (u > 0) { c.save(); c.translate(0, -50 - (1 - easeOut(u)) * 150); c.scale(110 * (0.6 + 0.4 * u), 70); const k2 = CAMZ; CAMZ = k2 * 110; cut(c, CAPS_SNOW[id], "#f7f4ee", { lift: 0.5 }); CAMZ = k2; c.restore(); } }
    CAMZ = kz; c.restore();
  }
  if (o.face) drawFace(c, 0, -h * 0.88, h * 0.26, o.face, 0);
  c.restore();
}

// ёж: клубок из хвои (open = 0) или развернувшийся ёж (open = 1), вид сбоку.
// Развернувшись: мордочка с носом, глаз, ушко, четыре лапки на земле (две ближние, две дальние темнее).
// dir = 1 — смотрит вправо, −1 — влево. Земля в локальных координатах на y = 0.84R.
function needleFan(c, R, a0, a1, n, r0k, r1k, cx = 0, cy = 0, sx = 1, sy = 1) {
  for (let ring = 0; ring < 2; ring++) {
    for (let i = 0; i < n; i++) {
      const a = lerp(a0, a1, (i + ring * 0.5) / n), r0 = R * (ring ? r0k * 0.7 : r0k), r1 = R * (ring ? r1k * 0.86 : r1k), wa = 0.07;
      c.fillStyle = i % 3 === 0 ? "#3d2a18" : i % 3 === 1 ? "#5a3c22" : "#8a6440";
      c.beginPath(); c.moveTo(cx + Math.cos(a - wa) * r0 * sx, cy + Math.sin(a - wa) * r0 * sy); c.lineTo(cx + Math.cos(a) * r1 * sx, cy + Math.sin(a) * r1 * sy); c.lineTo(cx + Math.cos(a + wa) * r0 * sx, cy + Math.sin(a + wa) * r0 * sy); c.closePath(); c.fill();
    }
  }
}
function drawHedgehog(c, x, y, R, roll, open, f = {}, dir = 1) {
  const bx = boil(91, 0.6), u = clamp(open, 0, 1);
  c.save(); c.translate(x + bx[0], y + bx[1]);
  c.fillStyle = "rgba(52,30,12,0.22)"; c.beginPath(); c.ellipse(4, R * 0.86, R * (u > 0.5 ? 1.45 : 1.05), R * 0.16, 0, 0, TAU); c.fill();
  if (u < 0.5) { // клубок: перед раскрытием сплющивается
    const q = u * 2; c.translate(0, R * 0.12 * q); c.scale(1 + 0.16 * q, 1 - 0.2 * q); c.rotate(roll);
    cut(c, (() => { const p = new Path2D(); p.arc(0, 0, R * 0.92, 0, TAU); return p; })(), "#6d4a2c", { lift: 1 });
    needleFan(c, R, 0, TAU, 38, 0.7, 1.18);
    c.restore(); return;
  }
  // раскрылся: пружинит из сплющенного
  const k = springBounce(clamp((u - 0.5) * 2, 0, 1) * 0.9), sq = 1 - k;
  c.translate(0, R * 0.84); c.scale(dir * (1 + 0.12 * sq), 1 - 0.18 * sq); c.translate(0, -R * 0.84);
  const sniff = f.sniff ?? 0;
  // дальние лапки (темнее, за телом)
  for (const lx of [0.72, -0.42]) { c.fillStyle = "#4a3020"; c.beginPath(); c.ellipse(lx * R, R * 0.66, R * 0.13, R * 0.22, 0, 0, TAU); c.fill(); c.beginPath(); c.ellipse(lx * R + R * 0.06, R * 0.82, R * 0.15, R * 0.06, 0, 0, TAU); c.fill(); }
  // мордочка и брюшко
  const face = new Path2D();
  face.moveTo(R * 0.2, R * 0.62); face.quadraticCurveTo(R * 0.55, R * 0.7, R * 1.0, R * 0.48); face.lineTo(R * (1.62 + 0.04 * sniff), R * (0.36 - 0.03 * sniff));
  face.quadraticCurveTo(R * 1.3, R * 0.0, R * 0.95, -R * 0.12); face.quadraticCurveTo(R * 0.5, -R * 0.1, R * 0.2, R * 0.62); face.closePath();
  cut(c, face, "#d8b088", { lift: 0.8 });
  // тело с иголками по спине
  const body = new Path2D(); body.ellipse(-R * 0.12, R * 0.22, R * 1.05, R * 0.6, 0, 0, TAU);
  cut(c, body, "#6d4a2c", { lift: 1 });
  needleFan(c, R, Math.PI * 0.92, Math.PI * 2.08, 30, 0.55, 1.05, -R * 0.12, R * 0.3, 1.18, 0.95);
  // ушко, глаз, нос
  c.fillStyle = "#b88a60"; c.beginPath(); c.ellipse(R * 0.82, -R * 0.08, R * 0.1, R * 0.14, -0.4, 0, TAU); c.fill();
  if ((f.blink ?? 1) > 0.15) { c.fillStyle = "#1e120a"; circle(c, R * 1.12, R * 0.14, R * 0.075); c.fill(); c.fillStyle = "#fff"; circle(c, R * 1.1, R * 0.12, R * 0.025); c.fill(); }
  else { c.strokeStyle = "#1e120a"; c.lineWidth = 2.5; c.beginPath(); c.moveTo(R * 1.05, R * 0.15); c.lineTo(R * 1.19, R * 0.15); c.stroke(); }
  c.fillStyle = "#1e120a"; circle(c, R * (1.62 + 0.04 * sniff), R * (0.35 - 0.03 * sniff), R * 0.09); c.fill();
  // ближние лапки поверх брюшка
  for (const lx of [0.55, -0.6]) { cut(c, (() => { const p = new Path2D(); p.ellipse(lx * R, R * 0.66, R * 0.13, R * 0.22, 0, 0, TAU); p.ellipse(lx * R + R * 0.07, R * 0.82, R * 0.16, R * 0.065, 0, 0, TAU); return p; })(), "#5a3a26", { lift: 0.6 }); }
  c.restore();
}

// бумажный цветок: bloom 0..1, wilt 0..1 (поник), petalsFall 0..1
function drawFlower(c, x, y, h, hue, bloom, wilt, seed) {
  if (bloom <= 0.01) return;
  const bx = boil(seed, 0.5), r = mulberry32(seed);
  c.save(); c.translate(x + bx[0], y);
  const st = h * easeOut(bloom), bend = wilt * 1.2;
  const hx = Math.sin(bend) * st * 0.55, hy = -st + (1 - Math.cos(bend)) * st * 0.45;
  c.strokeStyle = "#4f7a3a"; c.lineWidth = 6; c.lineCap = "round"; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(0, -st * 0.6, hx, hy); c.stroke();
  // листок на стебле
  c.save(); c.translate(0, -st * 0.3); c.rotate(-0.9 + wilt * 0.6); const kz = CAMZ; c.scale(st * 0.28, st * 0.28); CAMZ = kz * st * 0.28;
  cut(c, LEAF.birch.path, "#5f9440", { lift: 0.5, tex: 0.6 }); CAMZ = kz; c.restore();
  c.translate(hx, hy); c.rotate(bend * 1.1);
  const pc = hue, n = 6, pr = h * 0.22 * (0.4 + 0.6 * spr(springPop, bloom * 2, 0));
  for (let i = 0; i < n; i++) {
    const fallI = clamp(wilt * 2.2 - i * 0.18 - 0.6, 0, 1);
    c.save(); c.rotate((i / n) * TAU); c.translate(0, -pr * 0.6 + fallI * h * 0.5); c.rotate(fallI * 2);
    c.globalAlpha = 1 - fallI;
    const kz2 = CAMZ; c.scale(pr * 0.55, pr * 0.85); CAMZ = kz2 * pr * 0.6;
    cut(c, PETAL, mixHex(pc, "#c9b38a", wilt * 0.8), { lift: 0.5, tex: 0.6 }); CAMZ = kz2; c.restore();
  }
  c.fillStyle = mixHex("#f2c23a", "#9a7a3a", wilt); circle(c, 0, 0, pr * 0.32); c.fill();
  c.restore();
}
const PETAL = smoothPath([[0, 0.5], [0.5, 0.1], [0.42, -0.5], [0, -0.75], [-0.42, -0.5], [-0.5, 0.1]]);

// солнце из бумаги: rays 0..1, pale 0..1, face
function drawSun(c, x, y, R, rays, pale, t, f) {
  const col = mixHex("#f2b630", "#efe6c8", pale), rc = mixHex("#f5c84a", "#ece4cc", pale);
  c.save(); c.translate(x, y);
  const n = 12;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + t * 0.15, L = R * (0.45 + 0.35 * (i % 2)) * rays;
    if (L < 2) continue;
    c.save(); c.rotate(a);
    cut(c, polyPath([[R * 0.9, -R * 0.09], [R * 1.05 + L, 0], [R * 0.9, R * 0.09]]), rc, { lift: 0.6, tex: 0.6 }); c.restore();
  }
  cut(c, (() => { const p = new Path2D(); p.arc(0, 0, R, 0, TAU); return p; })(), (cc) => { const g = cc.createRadialGradient(-R * 0.3, -R * 0.3, 0, 0, 0, R); g.addColorStop(0, mixHex("#ffe08a", "#f6f0dc", pale)); g.addColorStop(1, col); return g; }, { lift: 1 });
  if (f) drawFace(c, 0, -R * 0.05, R * 1.4, f, 0);
  c.restore();
}

// облако; puff — надутые щёки (ветер)
const CLOUD = smoothPath([[-1, 0.3], [-0.95, -0.1], [-0.6, -0.35], [-0.3, -0.62], [0.12, -0.6], [0.4, -0.38], [0.75, -0.42], [1, -0.05], [0.9, 0.3]]);
function drawCloud(c, x, y, s, o = {}) {
  const bx = boil(o.seed ?? 3, 0.6);
  c.save(); c.translate(x + bx[0], y + bx[1]); c.scale(s * (1 + (o.puff ?? 0) * 0.08), s * (1 - (o.puff ?? 0) * 0.04));
  const kz = CAMZ; CAMZ = kz * s;
  cut(c, CLOUD, o.col ?? "#f6f1e6", { lift: o.lift ?? 0.8, edgeCol: "rgba(255,255,255,0.9)" });
  if (o.cheeks) { c.fillStyle = "rgba(235,140,120,0.45)"; c.beginPath(); c.ellipse(-0.42, 0.02, 0.13, 0.08, 0, 0, TAU); c.fill(); c.beginPath(); c.ellipse(0.32, 0.02, 0.13, 0.08, 0, 0, TAU); c.fill(); }
  CAMZ = kz; c.restore();
  if (o.face) drawFace(c, x + bx[0] - s * 0.05, y + bx[1] - s * 0.22, s * 1.2, o.face, 0);
}

// птичка из листьев: flap — фаза взмаха, fly 0..1 (сидит/летит), sing — открытый клюв.
// Вид сбоку, клювом вправо. Сидя: ближнее крыло сложено вдоль тела, дальнего не видно, две лапки держат ветку.
// В полёте: оба крыла машут (дальнее темнее, за телом), лапки поджаты.
function birdLeaf(c, kind, x, y, ang, sw, sl, fill, lift = 0.5) {
  c.save(); c.translate(x, y); c.rotate(ang); c.scale(sw, sl); const kz = CAMZ; CAMZ = kz * Math.min(sw, sl);
  cut(c, LEAF[kind].path, fill, { lift, tex: 0.6 }); CAMZ = kz; c.restore();
}
function drawBird(c, x, y, s, flap, fly, dir = 1, o = {}) {
  const bx = boil(171, 0.5), F = fly > 0.5;
  c.save(); c.translate(x + bx[0], y + bx[1]); c.scale(dir * s / 100, s / 100);
  const kz = CAMZ; CAMZ = kz * s / 100;
  const wa = F ? Math.sin(flap) : 0;            // −1 крылья вниз … 1 вверх
  const wingAng = F ? lerp(-2.5, -0.35, (wa + 1) / 2) : -1.95;
  // дальнее крыло — только в полёте
  if (F) birdLeaf(c, "birch", 2, -20, lerp(-1.75, -0.25, (wa + 1) / 2), 40, 62, "#8a3e1c", 0.4); // всегда выглядывает над спиной
  // хвост: два листика назад-вверх
  birdLeaf(c, "birch", -44, -2, -1.15 + (F ? 0.1 * wa : 0), 30, 44, "#a8642e");
  birdLeaf(c, "birch", -44, 2, -1.45 + (F ? 0.1 * wa : 0), 28, 40, "#94532a");
  // лапки — под телом, до ветки
  if (!F) { c.strokeStyle = "#3a2410"; c.lineWidth = 4; c.lineCap = "round";
    for (const fx of [-6, 12]) { c.beginPath(); c.moveTo(fx, 26); c.lineTo(fx + 2, 45); c.moveTo(fx - 6, 46); c.lineTo(fx + 10, 46); c.stroke(); } }
  // тело — лист осины вдоль, носом к голове
  const body = new Path2D(); body.ellipse(0, 4, 50, 28, -0.08, 0, TAU);
  birdLeaf(c, "aspen", -50, 6, Math.PI / 2 - 0.08, 62, 100, (cc) => { const g = cc.createLinearGradient(0, 0, 0.5, -1); g.addColorStop(0, "#c8622a"); g.addColorStop(1, "#e2853a"); return g; }, 0.9);
  // грудка
  c.fillStyle = "#f0c27a"; c.beginPath(); c.ellipse(28, 10, 20, 13, 0.35, 0, TAU); c.fill();
  // голова
  const head = new Path2D(); head.arc(46, -20, 21, 0, TAU);
  cut(c, head, "#d06a2e", { lift: 0.7 });
  const ob = o.sing ?? 0;
  c.fillStyle = "#3a2410";
  c.beginPath(); c.moveTo(63, -25); c.lineTo(82, -21 - ob * 4); c.lineTo(64, -17); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(63, -17); c.lineTo(79, -15 + ob * 7); c.lineTo(63, -13); c.closePath(); c.fill();
  c.fillStyle = "#fbf6ea"; circle(c, 50, -25, 6.5); c.fill(); c.fillStyle = "#1e120a"; circle(c, 51.5, -24.5, 4); c.fill();
  // ближнее крыло
  birdLeaf(c, "birch", 4, -10, wingAng, F ? 44 : 38, F ? 66 : 58, "#9c4a22", 0.6);
  CAMZ = kz; c.restore();
}

// песочные часы из бумаги: u — доля пересыпавшегося песка
function drawHourglass(c, x, y, s, u, t) {
  c.save(); c.translate(x, y); c.scale(s / 100, s / 100); const kz = CAMZ; CAMZ = kz * s / 100;
  c.strokeStyle = "#6a4428"; c.lineWidth = 3; c.beginPath(); c.moveTo(0, -150); c.lineTo(0, -66); c.stroke();
  cut(c, tornRect(-46, -70, 92, 14, 5, 1.5, 12), "#8a5a34", { lift: 0.7 });
  cut(c, tornRect(-46, 56, 92, 14, 6, 1.5, 12), "#8a5a34", { lift: 0.7 });
  const glass = polyPath([[-36, -56], [36, -56], [6, 0], [36, 56], [-36, 56], [-6, 0]]);
  cut(c, glass, "rgba(220,236,240,0.85)", { lift: 0.5, tex: 0.3 });
  c.save(); c.clip(glass); c.fillStyle = "#e8b23a";
  const top = lerp(-46, -2, u), bot = lerp(54, 14, u);
  c.beginPath(); c.moveTo(-40, top); c.lineTo(40, top); c.lineTo(0, 2); c.closePath(); if (u < 0.98) c.fill();
  c.beginPath(); c.moveTo(-40, 56); c.lineTo(40, 56); c.lineTo(40, bot + 10); c.lineTo(0, bot); c.lineTo(-40, bot + 10); c.closePath(); c.fill();
  if (u < 0.98) { c.fillRect(-1.5, 0, 3, bot); }
  c.restore();
  CAMZ = kz; c.restore();
}
