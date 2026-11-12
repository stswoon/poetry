// ---------- Утёс-великан: мировые координаты, земля на y = 1000 ----------
const UT = (() => {
  const r = mulberry32(11);
  const base = [[-560, 1010], [-505, 780], [-470, 580], [-435, 400], [-405, 230], [-365, 70], [-300, -75], [-200, -165], [-70, -205],
    [70, -200], [200, -158], [300, -70], [368, 72], [404, 236], [442, 404], [474, 590], [512, 790], [572, 1010]];
  const out = [];
  for (let i = 0; i < base.length; i++) {
    out.push(base[i]);
    if (i < base.length - 1) { const p = base[i], q = base[i + 1]; out.push([(p[0] + q[0]) / 2 + (r() - 0.5) * 34, (p[1] + q[1]) / 2 + (r() - 0.5) * 22]); }
  }
  // трещины-текстура (кроме морщины у глаза)
  const cracks = [
    [[-95, -95], [-50, -106], [-4, -96], [30, -104]], [[60, -128], [110, -118], [150, -126]],
    [[168, 112], [180, 168], [166, 228], [178, 272]], [[-330, 300], [-280, 330], [-300, 380]], [[290, 520], [340, 560], [325, 620]],
    [[-380, 640], [-300, 660], [-250, 700], [-170, 690]], [[120, 640], [200, 690], [300, 700]], [[-60, 780], [20, 820], [110, 810]],
    [[-420, 860], [-330, 870], [-290, 920]], [[260, 860], [350, 880], [420, 930]],
  ];
  const strata = [[[-430, 560], [-200, 590], [80, 580], [300, 600], [470, 590]], [[-470, 760], [-180, 800], [140, 790], [500, 800]]];
  const moss = [[-300, 545, 70], [-240, 560, 50], [310, 570, 60], [380, 760, 70], [-420, 770, 60], [-120, 950, 80], [210, 960, 90]];
  return { pts: out, cracks, strata, moss };
})();
// морщина под левым (по кадру) глазом — по ней бежит слеза
const CRACK = [[-150, 106], [-158, 150], [-148, 194], [-168, 242], [-160, 290], [-174, 336]];
function crackPoint(u) {
  const n = CRACK.length - 1, f = clamp(u, 0, 1) * n, i = Math.min(n - 1, Math.floor(f)), k = f - i;
  return [lerp(CRACK[i][0], CRACK[i + 1][0], k), lerp(CRACK[i][1], CRACK[i + 1][1], k)];
}
const EYE_L = [-122, 58], EYE_R = [122, 58];

function poly(c, pts) { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); }

// s: { d, open:[l,r], sad, look:[x,y], brow, smile, ooh, wet, breathe }
function drawUtes(c, s) {
  const d = s.d, inkC = pal("ink", d);
  c.save();
  c.translate(0, 1000); c.scale(1, 1 + 0.004 * s.breathe); c.translate(0, -1000);
  // тело
  smooth(c, UT.pts);
  const lx = lerp(420, -420, sstep((d - 0.2) / 0.6));
  const g = c.createLinearGradient(lx, -220, -lx * 0.9, 700);
  g.addColorStop(0, pal("rockL", d)); g.addColorStop(0.55, rgbStr(mixRgb(palRgb("rockL", d), palRgb("rockD", d), 0.45))); g.addColorStop(1, pal("rockD", d));
  ink(c, g, 9, inkC);
  // теневая сторона
  c.save(); smooth(c, UT.pts); c.clip();
  const sideX = lx > 0 ? -1 : 1;
  const g2 = c.createLinearGradient(sideX * 560, 0, sideX * 180, 0);
  g2.addColorStop(0, pal("rockD", d, 0.75)); g2.addColorStop(1, pal("rockD", d, 0));
  c.fillStyle = g2; c.fillRect(-600, -260, 1200, 1400);
  // слои и трещины
  c.lineCap = "round"; c.lineJoin = "round";
  for (const st of UT.strata) { smooth(c, st, false); c.lineWidth = 6; c.strokeStyle = pal("rockD", d, 0.55); c.stroke(); }
  for (const cr of UT.cracks) { poly(c, cr); c.lineWidth = 6; c.strokeStyle = pal("ink", d, 0.55); c.stroke(); }
  // мох
  for (const [x, y, r] of UT.moss) mossTuft(c, x, y, r, d);
  c.restore();
  // уступ-грудь, где спит тучка
  ell(c, 40, 478, 250, 34); ink(c, pal("rockD", d), 7, inkC);
  ell(c, 40, 468, 240, 22); c.fillStyle = pal("rockL", d); c.fill();
  mossTuft(c, -160, 470, 46, d); mossTuft(c, 250, 472, 40, d);
  drawFace(c, s, inkC);
  c.restore();
}

function mossTuft(c, x, y, r, d) {
  const rr = mulberry32((x * 7 + y * 13) | 0), cs = [];
  for (let i = 0; i < 6; i++) cs.push([x + (rr() - 0.5) * r * 1.6, y + (rr() - 0.5) * r * 0.5, r * (0.28 + rr() * 0.22)]);
  c.fillStyle = pal("mossD", d); for (const [a, b, q] of cs) { circle(c, a, b + 4, q); c.fill(); }
  c.fillStyle = pal("moss", d); for (const [a, b, q] of cs) { circle(c, a, b, q * 0.86); c.fill(); }
}

function drawFace(c, s, inkC) {
  const d = s.d;
  // нос-выступ
  c.beginPath(); c.moveTo(-26, 104); c.quadraticCurveTo(-34, 160, -6, 172); c.quadraticCurveTo(22, 176, 30, 154);
  c.lineWidth = 7; c.strokeStyle = pal("rockD", d); c.lineCap = "round"; c.stroke();
  // морщина-трещина
  poly(c, CRACK); c.lineWidth = 9; c.strokeStyle = inkC; c.stroke();
  c.save(); c.translate(3, -2); poly(c, CRACK); c.lineWidth = 3; c.strokeStyle = pal("rockL", d, 0.8); c.stroke(); c.restore();
  if (s.wet > 0) {
    c.save(); c.globalAlpha = s.wet; poly(c, CRACK.slice(1)); c.lineWidth = 7; c.strokeStyle = "rgba(170,220,255,0.85)"; c.stroke();
    c.lineWidth = 2.5; c.strokeStyle = "#ffffff"; c.stroke(); c.restore();
  }
  // глаза
  eye(c, EYE_L[0], EYE_L[1], s.open[0], s.sad, s.look, -1, d, inkC, s.happy);
  eye(c, EYE_R[0], EYE_R[1], s.open[1], s.sad, s.look, 1, d, inkC, s.happy);
  // брови из мха
  for (const side of [-1, 1]) {
    const bx = side * 122, by = -16 - s.brow * 26;
    c.save(); c.translate(bx, by); c.rotate(side * (-0.12 - s.sad * 0.32 + s.brow * 0.1));
    const cs = []; for (let i = 0; i < 6; i++) { const u = i / 5; cs.push([lerp(-62, 62, u), -Math.sin(u * Math.PI) * 10 + (side * (u - 0.5)) * 0, 17 + 6 * Math.sin(u * Math.PI)]); }
    c.fillStyle = inkC; for (const [a, b, q] of cs) { circle(c, a, b, q + 4); c.fill(); }
    c.fillStyle = pal("mossD", d); for (const [a, b, q] of cs) { circle(c, a, b + 2, q); c.fill(); }
    c.fillStyle = pal("moss", d); for (const [a, b, q] of cs) { circle(c, a - 2, b - 2, q * 0.78); c.fill(); }
    c.restore();
  }
  // рот
  c.lineCap = "round"; c.strokeStyle = inkC; c.lineWidth = 8;
  if (s.ooh > 0.05) { ell(c, 0, 236, 16 * s.ooh + 4, 22 * s.ooh + 4); c.fillStyle = inkC; c.fill(); }
  else { c.beginPath(); c.moveTo(-44, 236); c.quadraticCurveTo(0, 236 + 26 * s.smile, 44, 236); c.stroke(); }
  // борода-мох
  for (let i = 0; i < 9; i++) { const u = i / 8; mossTuft(c, lerp(-150, 150, u), 300 + Math.sin(u * Math.PI) * 42, 44, d); }
}

function eye(c, x, y, o, sad, look, side, d, inkC, happy = 0) {
  if (o < 0.1) {
    // спит: дуга «︶»
    c.beginPath(); c.arc(x, y - 6, 40, 0.15 * Math.PI, 0.85 * Math.PI); c.lineWidth = 9; c.strokeStyle = inkC; c.lineCap = "round"; c.stroke();
    return;
  }
  const rx = 44, ry = 56 * o;
  c.save();
  ell(c, x, y, rx, ry);
  const g = c.createLinearGradient(x, y - ry, x, y + ry); g.addColorStop(0, "#1b1d4a"); g.addColorStop(1, "#4b63c4");
  c.fillStyle = g; c.fill();
  c.save(); ell(c, x, y, rx, ry); c.clip();
  const lx = look[0] * 9, ly = look[1] * 8;
  ell(c, x + lx, y + ly + ry * 0.25, rx * 0.6, ry * 0.5); c.fillStyle = "rgba(110,160,255,0.55)"; c.fill();
  circle(c, x - 13 + lx, y - ry * 0.35 + ly, 15); c.fillStyle = "#fff"; c.fill();
  circle(c, x + 15 + lx, y + ry * 0.35 + ly, 7); c.fill();
  // веко: грусть опускает внешний угол
  const lid = clamp(sad, 0, 1) * 0.55 + (1 - o) * 0.2;
  if (lid > 0.01) {
    const inner = y - ry + 2 * ry * lid * 0.35, outer = y - ry + 2 * ry * lid;
    c.beginPath(); c.moveTo(x - rx - 4, y - ry - 6); c.lineTo(x + rx + 4, y - ry - 6);
    if (side < 0) { c.lineTo(x + rx + 4, inner); c.lineTo(x - rx - 4, outer); } else { c.lineTo(x + rx + 4, outer); c.lineTo(x - rx - 4, inner); }
    c.closePath(); c.fillStyle = pal("rockL", d); c.fill();
    c.beginPath(); if (side < 0) { c.moveTo(x + rx, inner); c.lineTo(x - rx, outer); } else { c.moveTo(x - rx, inner); c.lineTo(x + rx, outer); }
    c.lineWidth = 6; c.strokeStyle = inkC; c.stroke();
  }
  c.restore();
  ell(c, x, y, rx, ry); c.lineWidth = 7; c.strokeStyle = inkC; c.stroke();
  // «улыбка глазами»: нижняя дуга
  if (happy > 0) { c.globalAlpha = happy; c.beginPath(); c.ellipse(x, y + ry + 10, rx * 0.9, 14, 0, Math.PI, TAU); c.fillStyle = pal("rockL", d); c.fill(); c.globalAlpha = 1; }
  c.restore();
}

// ---------- Тучка-чиби: локальные координаты, ~240×170 при s = 1 ----------
const PUFFS = [[-72, 22, 52], [-28, -26, 66], [38, -22, 60], [86, 24, 46], [8, 30, 68], [-100, 46, 34], [112, 50, 30]];
// o: { s, rot, eyes, mouth: 0 улыбка / 1 смех / -1 сон, wave, ears, heart, glow, squash, look }
function drawTucha(c, x, y, o, d) {
  const s = o.s; if (s <= 0.01) return;
  c.save(); c.translate(x, y); c.rotate(o.rot || 0); c.scale(s * (1 + (o.squash || 0)), s * (1 - (o.squash || 0)));
  if (o.glow > 0) glow(c, 0, 10, 260, "rgba(255,214,110,0.9)", o.glow);
  const heart = clamp(o.heart || 0, 0, 1), cl = 1 - heart, inkC = "#7a3d1c";
  // ушки зайчика
  if (o.ears > 0.01) for (const sd of [-1, 1]) {
    c.save(); c.translate(sd * 34, -70); c.rotate(sd * 0.22 + Math.sin(o.t * 9 + sd) * 0.08); c.scale(1, o.ears);
    ell(c, 0, -46, 22, 52); ink(c, "#ffe7a0", 7, inkC); ell(c, 0, -40, 10, 34); c.fillStyle = "#ffb3b3"; c.fill(); c.restore();
  }
  // ручки
  for (const sd of [-1, 1]) {
    const up = sd > 0 ? (o.wave || 0) : 0, ang = sd * (0.5 + up * 1.5) + (sd > 0 ? Math.sin(o.t * 14) * 0.5 * up : 0);
    c.save(); c.translate(sd * 104, 40); c.rotate(-sd * 0.2 - (sd > 0 ? up * 1.6 : 0) + Math.sin(o.t * 14) * 0.4 * up);
    ell(c, sd * 22, 0, 26, 18); ink(c, "#ffd76a", 7, inkC); c.restore(); void ang;
  }
  if (cl > 0) {
    c.save(); c.globalAlpha *= cl;
    c.fillStyle = inkC; for (const [a, b, r] of PUFFS) { circle(c, a, b, r + 7); c.fill(); }
    const g = c.createLinearGradient(0, -90, 0, 90); g.addColorStop(0, "#fff6c2"); g.addColorStop(0.55, "#ffd862"); g.addColorStop(1, "#ffb43c");
    c.fillStyle = g; for (const [a, b, r] of PUFFS) { circle(c, a, b, r); c.fill(); }
    c.fillStyle = "rgba(255,255,255,0.7)"; ell(c, -40, -54, 26, 12, -0.3); c.fill(); ell(c, 30, -60, 14, 7, 0.2); c.fill();
    // завиток-чёлка
    c.beginPath(); c.arc(-6, -78, 16, Math.PI * 0.9, Math.PI * 2.3); c.lineWidth = 7; c.strokeStyle = "#ffcf4a"; c.stroke(); c.lineWidth = 3; c.strokeStyle = inkC; c.stroke();
    c.restore();
  }
  if (heart > 0) {
    c.save(); c.globalAlpha *= heart; c.scale(0.4 + 0.6 * heart, 0.4 + 0.6 * heart);
    c.beginPath();
    for (let i = 0; i <= 60; i++) { const a = (i / 60) * TAU, hx = 16 * Math.pow(Math.sin(a), 3) * 7.2, hy = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * 7.2 + 8; i ? c.lineTo(hx, hy) : c.moveTo(hx, hy); }
    c.closePath(); const g = c.createLinearGradient(0, -80, 0, 110); g.addColorStop(0, "#ffe68a"); g.addColorStop(1, "#ff9a3c"); ink(c, g, 8, inkC);
    c.restore();
  }
  // лицо
  const lk = o.look || [0, 0];
  for (const sd of [-1, 1]) {
    const ex = sd * 32 + lk[0] * 6, ey = 12 + lk[1] * 5;
    if (o.eyes < 0.15) {
      c.beginPath();
      if (o.mouth === 1) c.arc(ex, ey + 8, 13, 1.15 * Math.PI, 1.85 * Math.PI); else c.arc(ex, ey - 4, 13, 0.15 * Math.PI, 0.85 * Math.PI);
      c.lineWidth = 6; c.strokeStyle = "#3a1f2a"; c.lineCap = "round"; c.stroke();
    } else {
      ell(c, ex, ey, 14, 19 * o.eyes); c.fillStyle = "#3a1f2a"; c.fill();
      circle(c, ex - 4, ey - 7 * o.eyes, 5.5); c.fillStyle = "#fff"; c.fill(); circle(c, ex + 5, ey + 7 * o.eyes, 2.5); c.fill();
    }
  }
  c.fillStyle = "rgba(255,120,140,0.55)"; ell(c, -58, 36, 15, 9); c.fill(); ell(c, 58, 36, 15, 9); c.fill();
  c.beginPath(); c.lineCap = "round"; c.strokeStyle = "#3a1f2a"; c.lineWidth = 5;
  if (o.mouth === 1) { c.moveTo(-14, 34); c.quadraticCurveTo(0, 58, 14, 34); c.closePath(); c.fillStyle = "#c2405a"; c.fill(); c.stroke(); }
  else if (o.mouth === 2) { ell(c, 0, 42, 8, 10); c.fillStyle = "#3a1f2a"; c.fill(); }
  else if (o.mouth === -1) { c.moveTo(-8, 40); c.quadraticCurveTo(0, 46, 8, 40); c.stroke(); }
  else { c.moveTo(-12, 36); c.quadraticCurveTo(0, 48, 12, 36); c.stroke(); }
  c.restore();
}

// «z z z» над спящей тучкой
function zzz(c, x, y, t, a) {
  if (a <= 0) return;
  for (let i = 0; i < 3; i++) {
    const ph = (t * 0.55 + i / 3) % 1, k = Math.sin(ph * Math.PI);
    c.save(); c.globalAlpha = a * k; font(c, 30 + ph * 34);
    c.fillStyle = "#fff"; c.strokeStyle = "#1a1f4d"; c.lineWidth = 6; c.lineJoin = "round";
    const px = x + ph * 70 + Math.sin(ph * 6) * 10, py = y - ph * 120;
    c.strokeText("z", px, py); c.fillText("z", px, py); c.restore();
  }
}
// аниме-«!» над головой
function bang(c, x, y, k, t) {
  if (k <= 0) return;
  c.save(); c.translate(x, y); c.scale(k, k); c.rotate(0.12);
  rrect(c, -12, -78, 24, 56, 12); ink(c, "#ff5a6e", 6);
  circle(c, 0, -2, 12); ink(c, "#ff5a6e", 6);
  c.lineWidth = 6; c.strokeStyle = "#ffffff"; c.lineCap = "round";
  for (let i = 0; i < 3; i++) { const a = -2.2 + i * 0.5; c.beginPath(); c.moveTo(Math.cos(a) * 52 + 40, Math.sin(a) * 52 - 30); c.lineTo(Math.cos(a) * 74 + 40, Math.sin(a) * 74 - 30); c.stroke(); }
  c.restore();
}
// чайка
function gull(c, x, y, s, t, ph) {
  const f = Math.sin(t * 9 + ph) * 0.5;
  c.save(); c.translate(x, y); c.scale(s, s);
  c.beginPath(); c.moveTo(-60, -10 - f * 40); c.quadraticCurveTo(-30, -26 - f * 30, 0, 0); c.quadraticCurveTo(30, -26 - f * 30, 60, -10 - f * 40);
  c.lineWidth = 15; c.strokeStyle = "#1a1f4d"; c.lineCap = "round"; c.lineJoin = "round"; c.stroke(); c.lineWidth = 8; c.strokeStyle = "#ffffff"; c.stroke();
  c.restore();
}
// перекати-поле
function tumbleweed(c, x, y, r, rot, d) {
  c.save(); c.translate(x, y); c.rotate(rot);
  c.strokeStyle = pal("groundD", d); c.lineWidth = 5;
  const rr = mulberry32(5);
  for (let i = 0; i < 14; i++) { c.beginPath(); c.arc((rr() - 0.5) * r * 0.5, (rr() - 0.5) * r * 0.5, r * (0.5 + rr() * 0.5), rr() * TAU, rr() * TAU + 2.4); c.stroke(); }
  c.strokeStyle = pal("ink", d, 0.7); c.lineWidth = 3; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke();
  c.restore();
}
// слеза
function tear(c, x, y, r) {
  if (r <= 0.3) return;
  c.beginPath(); c.moveTo(x, y - 2.3 * r);
  c.bezierCurveTo(x + 0.35 * r, y - 1.3 * r, x + r, y - 0.7 * r, x + r, y);
  c.arc(x, y, r, 0, Math.PI);
  c.bezierCurveTo(x - r, y - 0.7 * r, x - 0.35 * r, y - 1.3 * r, x, y - 2.3 * r);
  const g = c.createLinearGradient(x, y - 2 * r, x, y + r); g.addColorStop(0, "#e6f7ff"); g.addColorStop(1, "#6cc4ff");
  ink(c, g, Math.max(2, r * 0.18), "#1a3a7a");
  ell(c, x - r * 0.35, y - r * 0.2, r * 0.22, r * 0.38, -0.3); c.fillStyle = "#fff"; c.fill();
}
// облачко-мысль
function thought(c, x, y, r, k, trail) {
  if (k <= 0) return;
  c.save(); c.globalAlpha *= Math.min(1, k * 1.5);
  const s = springPop(k);
  for (let i = 0; i < 3; i++) { const u = (i + 1) / 4; if (k < u * 0.6) continue; circle(c, lerp(trail[0], x, u * 0.7), lerp(trail[1], y, u * 0.7) + 30, 12 + i * 8); ink(c, "#ffffff", 5); }
  c.translate(x, y); c.scale(s, s);
  const P = [[-r * 0.55, 0, r * 0.55], [0, -r * 0.3, r * 0.62], [r * 0.55, 0, r * 0.55], [0, r * 0.28, r * 0.6], [-r * 0.2, r * 0.1, r * 0.5]];
  c.fillStyle = "#1a1f4d"; for (const [a, b, q] of P) { circle(c, a, b, q + 6); c.fill(); }
  c.fillStyle = "#ffffff"; for (const [a, b, q] of P) { circle(c, a, b, q); c.fill(); }
  c.restore();
}
