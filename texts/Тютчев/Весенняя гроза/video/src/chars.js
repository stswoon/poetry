// ---------- Олимп: Геба, Зевесов орёл, громокипящий кубок ----------
function buildOlymp() {
  const cv = mkCanvas(W + 400, H + 200), c = cv.getContext("2d"), r = mulberry32(14);
  const g = c.createLinearGradient(0, 0, 0, H + 200); g.addColorStop(0, "#3f7fe6"); g.addColorStop(0.5, "#8fc4f6"); g.addColorStop(0.8, "#ffe2a6"); g.addColorStop(1, "#ffd27a"); c.fillStyle = g; c.fillRect(0, 0, W + 400, H + 200);
  // колоннада на облаке справа
  const cx0 = 1260;
  c.save(); c.globalAlpha = 0.92;
  const col = (x, y, h) => {
    c.beginPath(); c.rect(x - 34, y - h, 68, h); const gg = c.createLinearGradient(x - 34, 0, x + 34, 0); gg.addColorStop(0, "#fffdf7"); gg.addColorStop(0.65, "#efe6d6"); gg.addColorStop(1, "#cfc2ad"); ink(c, gg, 4, "#9c8d76");
    c.strokeStyle = "rgba(160,145,120,0.6)"; c.lineWidth = 3; for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(x + k * 12, y - h + 20); c.lineTo(x + k * 12, y - 16); c.stroke(); }
    c.beginPath(); c.rect(x - 50, y - h - 24, 100, 26); ink(c, "#f6efe2", 4, "#9c8d76"); c.beginPath(); c.rect(x - 46, y - 18, 92, 20); ink(c, "#f6efe2", 4, "#9c8d76");
  };
  for (let i = 0; i < 4; i++) col(cx0 + i * 190, 700, 420);
  c.beginPath(); c.rect(cx0 - 90, 230, 760, 56); ink(c, "#f8f1e4", 4, "#9c8d76");
  c.beginPath(); c.moveTo(cx0 - 110, 232); c.lineTo(cx0 + 285, 120); c.lineTo(cx0 + 690, 232); c.closePath(); ink(c, "#fbf6ec", 4, "#9c8d76");
  c.fillStyle = C.gold; c.fillRect(cx0 - 90, 268, 760, 10);
  c.restore();
  OLYMP = cv;
}
const OLY_CLOUDS = [];
// облачное «море» под Олимпом
function cloudSea(c, t, y, a = 1, pal = "gold") {
  const list = pal === "gold" ? OLY_CLOUDS : OLY_CLOUDS_W;
  c.save(); c.globalAlpha *= a; c.fillStyle = pal === "gold" ? "#ffe3b0" : "#e3ecfc"; c.fillRect(-1000, y - 70, W + 3000, 2400); c.restore();
  list.forEach((cl, i) => { const x = ((i * 330 - t * (30 + (i % 3) * 14)) % 2600 + 2600) % 2600 - 340; drawCloud(c, cl, x, y + (i % 2) * 70 + Math.sin(t + i) * 6, 1.1 + (i % 3) * 0.2, 0, a); });
}
const OLY_CLOUDS_W = [];

// Геба в аниме-манере: три четверти, лицом вправо (к орлу). Опорная точка — середина груди.
// o: reach — рука с кубком тянется к орлу, tilt — наклон кубка, laugh — смех, turn — поворот головы при появлении, t
const HB = { line: "#7a4a1c", hair: "#ffd56b", hairS: "#e9a63e", hairD: "#c9822a", hairL: "#fff4c4", skin: "#ffe3cf", skinS: "#f6b9a0", skinL: "#c8836a",
  cloth: "#fbfbff", clothS: "#d5dcf3", clothL: "#8c93b8", eye1: "#1f3c8f", eye2: "#4aa8f0", eye3: "#bfe9ff" };
function hebeArm(o) {
  // дальняя рука (правая для зрителя): плечо → локоть → кисть; не пересекает корпус
  const r = o.reach || 0, tl = o.tilt || 0;
  const S = [50, -112];
  const Eb = [lerp(92, 128, r), lerp(-30, -92, r) - tl * 10];
  const Hd = [lerp(150, 236, r) + tl * 6, lerp(-66, -118, r) - tl * 22];
  return { S, E: Eb, H: Hd };
}
function hebeHand(x, y, s, o) {
  const { H } = hebeArm(o);
  const tl = o.tilt || 0, cs = 0.5, ang = tl * 1.9;
  const cx = x + H[0] * s, cy = y + (H[1] - 26) * s;       // начало чаши (кубок держат за ножку)
  const rx = cx + Math.sin(ang) * 112 * cs * s, ry = cy - Math.cos(ang) * 112 * cs * s; // край чаши
  return [cx, cy, rx, ry];
}
function limb(c, pts, w, fill, line) {
  c.save(); c.lineCap = "round"; c.lineJoin = "round";
  for (const [col, lw] of [[line, w + 8], [fill, w]]) { c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); pts.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py))); c.stroke(); }
  c.restore();
}
function hebe(c, x, y, s, o) {
  const t = o.t || 0, laugh = o.laugh || 0, tl = o.tilt || 0;
  const hw = (k) => Math.sin(t * 2.4 + k) * 16; // ветер в волосах
  c.save(); c.translate(x, y); c.scale(s, s);
  // ---- волосы сзади: объёмные пряди-клинья, падают вниз и чуть назад по ветру
  const clump = (pts, fill) => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length - 1; i += 2) c.quadraticCurveTo(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]); c.closePath(); ink(c, fill, 5, HB.line); };
  clump([[-40, -330], [-150, -300], [-160, -160], [-176, -40 + hw(0)], [-206 + hw(0.5), 100 + hw(0.3)], [-150, 20], [-110, -60], [-70, -200], [-40, -330]], HB.hairD);
  clump([[-20, -340], [-130, -300], [-126, -150], [-130, 0 + hw(1)], [-150 + hw(1.4), 170 + hw(1.1)], [-96, 60], [-70, -40], [-30, -200], [-20, -340]], HB.hairS);
  clump([[10, -340], [-90, -300], [-86, -160], [-80, -20 + hw(2)], [-96 + hw(2.4), 130 + hw(2.1)], [-50, 20], [-30, -80], [20, -220], [10, -340]], HB.hair);
  c.strokeStyle = HB.hairL; c.lineWidth = 6; c.lineCap = "round"; c.beginPath(); c.moveTo(-64, -250); c.quadraticCurveTo(-82, -150, -74, -60 + hw(2) * 0.5); c.stroke();
  // ---- дальняя рука с кубком (за корпусом начинается, дальше — вправо, к орлу)
  const A = hebeArm(o);
  limb(c, [A.S, A.E, A.H], 30, HB.skin, HB.skinL);
  // ---- хитон
  const fl = (k) => Math.sin(t * 3 + k) * 12;
  c.beginPath(); c.moveTo(-74, -122); c.quadraticCurveTo(-10, -140, 66, -120);
  c.bezierCurveTo(104, 40, 140 + fl(0), 250, 200 + fl(1), 440); c.lineTo(-180 + fl(2), 440); c.bezierCurveTo(-130, 250, -108, 60, -74, -122); c.closePath();
  ink(c, HB.cloth, 5, HB.clothL);
  c.save(); c.clip();
  c.fillStyle = HB.clothS; c.beginPath(); c.moveTo(20, -130); c.bezierCurveTo(70, 40, 100 + fl(0), 250, 150 + fl(1), 450); c.lineTo(300, 450); c.lineTo(300, -140); c.closePath(); c.fill();
  c.strokeStyle = "#bcc5e4"; c.lineWidth = 4; for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(k * 26 - 10, 20); c.bezierCurveTo(k * 32, 150, k * 44 + fl(k), 300, k * 58 + fl(k + 1), 450); c.stroke(); }
  c.fillStyle = HB.clothS; c.beginPath(); c.moveTo(-74, -122); c.quadraticCurveTo(-10, -96, 66, -120); c.lineTo(66, -108); c.quadraticCurveTo(-10, -80, -74, -110); c.closePath(); c.fill();
  c.restore();
  // пояс и застёжка
  c.beginPath(); c.moveTo(-96, -6); c.quadraticCurveTo(0, 10, 92, -6); c.lineTo(94, 16); c.quadraticCurveTo(0, 32, -98, 16); c.closePath(); ink(c, C.gold, 3, C.goldD);
  circle(c, -52, -118, 11); ink(c, C.gold, 3, C.goldD); circle(c, -55, -121, 4); c.fillStyle = "#fff6c8"; c.fill();
  // ---- шея с цел-тенью от подбородка
  c.beginPath(); c.moveTo(-14, -170); c.lineTo(-18, -112); c.quadraticCurveTo(6, -102, 30, -114); c.lineTo(28, -170); c.closePath(); ink(c, HB.skin, 4, HB.skinL);
  c.fillStyle = HB.skinS; c.beginPath(); c.moveTo(-14, -168); c.lineTo(28, -168); c.lineTo(28, -140); c.quadraticCurveTo(8, -128, -14, -146); c.closePath(); c.fill();
  // ---- ближняя рука: опущена вдоль тела; на смехе — машет вверх, сбоку от головы
  const sw = Math.sin(t * 2.2) * 6; const Sn = [-62, -112], En = [lerp(-92, -150, laugh), lerp(-26, -96, laugh)], Hn = [lerp(-70 + sw, -150 + Math.sin(t * 10) * 10 * laugh, laugh), lerp(56, -200, laugh)];
  limb(c, [Sn, En, Hn], 30, HB.skin, HB.skinL);
  circle(c, Hn[0], Hn[1], 17); ink(c, HB.skin, 4, HB.skinL);
  // ---- голова в три четверти, лицом вправо
  c.save(); c.translate(14, -240); c.rotate(lerp(0.08, 0, o.turn ?? 1) - laugh * 0.14);
  // лицо: широкая щека слева, острый подбородок вправо-вниз
  c.beginPath(); c.moveTo(-72, -36); c.bezierCurveTo(-80, 24, -60, 70, -18, 96); c.quadraticCurveTo(14, 112, 40, 96); c.bezierCurveTo(66, 74, 80, 30, 76, -36); c.bezierCurveTo(66, -112, -62, -112, -72, -36); c.closePath();
  ink(c, HB.skin, 5, HB.skinL);
  // тень от чёлки на лбу
  c.save(); c.clip(); c.fillStyle = HB.skinS; c.beginPath(); c.moveTo(-90, -40); c.quadraticCurveTo(0, -14, 90, -44); c.lineTo(90, -120); c.lineTo(-90, -120); c.closePath(); c.fill(); c.restore();
  // румянец со штрихами
  c.fillStyle = "rgba(255,120,150,0.38)"; ell(c, -40, 46, 20, 9); c.fill(); ell(c, 50, 44, 13, 8); c.fill();
  c.strokeStyle = "rgba(230,90,120,0.6)"; c.lineWidth = 2.5; for (const bx of [-50, -40, -30, 44, 52]) { c.beginPath(); c.moveTo(bx + 4, 40); c.lineTo(bx - 2, 52); c.stroke(); }
  // глаза: большие, с бликами и густой линией ресниц
  const eye = (ex, ey, w, h, out) => {
    if (laugh > 0.5) { c.strokeStyle = "#3b2340"; c.lineWidth = 6; c.lineCap = "round"; c.beginPath(); c.moveTo(ex - w, ey + 4); c.quadraticCurveTo(ex, ey - h * 0.75, ex + w, ey + 4); c.stroke(); return; }
    const bl = (((t + 0.3) % 3.1) < 0.12) ? 0.12 : 1;
    c.save(); c.translate(ex, ey); c.scale(1, bl);
    c.beginPath(); c.moveTo(-w, -h * 0.45); c.quadraticCurveTo(0, -h * 1.05, w, -h * 0.55); c.quadraticCurveTo(w * 1.05, h * 0.5, 0, h); c.quadraticCurveTo(-w * 1.05, h * 0.5, -w, -h * 0.45); c.closePath(); c.fillStyle = "#fff"; c.fill();
    c.save(); c.clip();
    ell(c, w * 0.08, h * 0.12, w * 0.78, h * 0.92); const ig = c.createLinearGradient(0, -h, 0, h); ig.addColorStop(0, HB.eye1); ig.addColorStop(0.6, HB.eye2); ig.addColorStop(1, HB.eye3); c.fillStyle = ig; c.fill();
    ell(c, w * 0.08, h * 0.18, w * 0.38, h * 0.5); c.fillStyle = "#101a44"; c.fill();
    c.fillStyle = "rgba(20,30,90,0.35)"; c.fillRect(-w, -h, w * 2, h * 0.55);
    c.restore();
    ell(c, -w * 0.22, -h * 0.3, w * 0.3, h * 0.22); c.fillStyle = "#fff"; c.fill();
    circle(c, w * 0.42, h * 0.48, w * 0.12); c.fill();
    c.restore();
    // ресницы: толстая линия сверху с «хвостиком» наружу
    c.strokeStyle = "#2a1530"; c.lineWidth = 7; c.lineCap = "round"; c.beginPath(); c.moveTo(ex - out * w * 1.0, ey - h * 0.5); c.quadraticCurveTo(ex, ey - h * 1.15, ex + out * w * 1.12, ey - h * 0.42); c.stroke();
    c.lineWidth = 4; c.beginPath(); c.moveTo(ex + out * w * 1.05, ey - h * 0.45); c.lineTo(ex + out * w * 1.42, ey - h * 0.3); c.stroke();
    c.lineWidth = 2.5; c.beginPath(); c.moveTo(ex - w * 0.25, ey + h * 0.98); c.lineTo(ex + w * 0.3, ey + h * 0.98); c.stroke();
  };
  eye(-26, 12, 24, 34, -1); eye(42, 12, 16, 31, 1);
  // брови
  c.strokeStyle = HB.hairD; c.lineWidth = 4; c.lineCap = "round"; c.beginPath(); c.moveTo(-52, -36 - laugh * 4); c.quadraticCurveTo(-32, -48 - laugh * 4, -10, -42 - laugh * 4); c.moveTo(24, -44 - laugh * 4); c.quadraticCurveTo(42, -50 - laugh * 4, 58, -40 - laugh * 4); c.stroke();
  // нос — короткий штрих, рот маленький; при смехе — открытый «D»
  c.strokeStyle = HB.skinL; c.lineWidth = 3; c.beginPath(); c.moveTo(30, 46); c.lineTo(34, 52); c.stroke();
  if (laugh > 0.3) { c.beginPath(); c.moveTo(4, 68); c.quadraticCurveTo(22, 72, 40, 66); c.quadraticCurveTo(26, 98, 8, 74); c.closePath(); ink(c, "#a8354a", 3, "#6b1f2c"); ell(c, 22, 82, 8, 5); c.fillStyle = "#ff8fa0"; c.fill(); }
  else { c.strokeStyle = "#8b3a45"; c.lineWidth = 4; c.beginPath(); c.moveTo(10, 70); c.quadraticCurveTo(22, 76, 34, 68); c.stroke(); }
  // ---- чёлка: острые пряди-«клинья», тень и блик-кольцо
  const bang = (k) => Math.sin(t * 3.2 + k) * 3;
  c.beginPath(); c.moveTo(-90, -10); c.bezierCurveTo(-104, -130, 70, -150, 92, -30);
  c.lineTo(80, 0 + bang(0)); c.lineTo(66, -40); c.lineTo(56, 6 + bang(1)); c.lineTo(36, -44); c.lineTo(20, -2 + bang(2)); c.lineTo(4, -46);
  c.lineTo(-14, -6 + bang(3)); c.lineTo(-26, -46); c.lineTo(-46, -4 + bang(4)); c.lineTo(-56, -40); c.lineTo(-76, 12 + bang(5)); c.closePath();
  ink(c, HB.hair, 5, HB.line);
  c.save(); c.clip();
  c.fillStyle = HB.hairS; c.beginPath(); c.moveTo(-100, -20); c.lineTo(100, -40); c.lineTo(100, 20); c.lineTo(-100, 20); c.closePath(); c.fill();
  c.strokeStyle = HB.hairL; c.lineWidth = 9; c.beginPath(); for (let k = 0; k <= 8; k++) { const px = -66 + k * 16, py = -82 + (k % 2 ? 6 : -4) - Math.sin(k / 8 * Math.PI) * 6; k ? c.lineTo(px, py) : c.moveTo(px, py); } c.stroke();
  c.restore();
  // боковые пряди: ближняя длинная (у щеки), дальняя тонкая
  c.beginPath(); c.moveTo(-84, -20); c.bezierCurveTo(-104, 50 + bang(6), -98, 120, -76 + bang(7), 176); c.lineTo(-70, 120); c.bezierCurveTo(-74, 70, -70, 30, -60, -6); c.closePath(); ink(c, HB.hair, 4, HB.line);
  c.beginPath(); c.moveTo(78, -18); c.bezierCurveTo(92, 30 + bang(8), 90, 70, 84 + bang(9), 112); c.lineTo(76, 70); c.bezierCurveTo(76, 40, 72, 10, 66, -10); c.closePath(); ink(c, HB.hairS, 4, HB.line);
  // лавровый венок
  for (let k = 0; k < 9; k++) { const a = Math.PI * (1.05 + k * 0.1), lx = Math.cos(a) * 88, ly = -46 + Math.sin(a) * 64; c.save(); c.translate(lx, ly); c.rotate(a + Math.PI / 2 + (k % 2 ? 0.5 : -0.5)); ell(c, 0, 0, 16, 7); ink(c, "#6fd06a", 2, "#2f7a3a"); c.restore(); }
  c.restore();
  // ---- кубок в руке (держит за ножку) и кулачок поверх ножки
  goblet(c, A.H[0], A.H[1] - 26, 0.5, t, tl, 1, 1);
  c.save(); c.translate(A.H[0], A.H[1]); c.rotate(tl * 0.5); ell(c, 0, 0, 18, 15); ink(c, HB.skin, 4, HB.skinL); c.strokeStyle = HB.skinL; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-8, -6); c.lineTo(-8, 8); c.moveTo(2, -8); c.lineTo(2, 8); c.stroke(); c.restore();
  c.restore();
}
// кубок: опорная точка — середина ножки; tilt 0..1 (наклон до ~110°)
function goblet(c, x, y, s, t, tilt = 0, boil = 1, dir = -1) {
  c.save(); c.translate(x, y); c.scale(s, s); c.rotate(dir * tilt * 1.9);
  const gg = (x0, x1) => { const g = c.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, "#c27a1c"); g.addColorStop(0.35, "#ffe58a"); g.addColorStop(0.55, C.gold); g.addColorStop(1, "#b0650f"); return g; };
  // ножка и основание
  ell(c, 0, 120, 70, 18); ink(c, gg(-70, 70), 4, "#8a4f0e");
  c.beginPath(); c.moveTo(-14, 116); c.lineTo(-10, -10); c.lineTo(10, -10); c.lineTo(14, 116); c.closePath(); ink(c, gg(-14, 14), 4, "#8a4f0e");
  ell(c, 0, 40, 22, 12); ink(c, gg(-22, 22), 4, "#8a4f0e");
  // чаша
  c.beginPath(); c.moveTo(-120, -110); c.bezierCurveTo(-118, -20, -60, 0, 0, 0); c.bezierCurveTo(60, 0, 118, -20, 120, -110); c.closePath(); ink(c, gg(-120, 120), 5, "#8a4f0e");
  c.strokeStyle = "#fff4c2"; c.lineWidth = 6; c.beginPath(); c.moveTo(-86, -88); c.quadraticCurveTo(-80, -36, -44, -20); c.stroke();
  // содержимое: кипящие тучки и мини-молнии
  ell(c, 0, -110, 120, 26); ink(c, "#3a3d78", 5, "#8a4f0e");
  c.save(); ell(c, 0, -110, 116, 24); c.clip();
  for (let k = 0; k < 7; k++) { const bx = -90 + k * 30, by = -104 + Math.sin(t * 9 + k * 1.7) * 8 * boil; circle(c, bx, by, 22 + 6 * Math.sin(t * 7 + k)); c.fillStyle = k % 2 ? "#4a4b82" : "#6a6ca8"; c.fill(); circle(c, bx - 6, by - 8, 10); c.fillStyle = "rgba(200,205,245,0.8)"; c.fill(); }
  c.restore();
  // пузыри-тучки над краем
  for (let k = 0; k < 5; k++) { const u = ((t * 0.9 + k / 5) % 1), bx = -70 + k * 35 + Math.sin(t * 3 + k) * 10, by = -120 - u * 120; c.globalAlpha = (1 - u) * boil; circle(c, bx, by, 14 + u * 16); c.fillStyle = "#c9cdf2"; c.fill(); c.strokeStyle = "#6a6ca8"; c.lineWidth = 3; c.stroke(); c.globalAlpha = 1; }
  // мини-молнии
  if (boil > 0) for (let k = 0; k < 2; k++) { const ph = (t * 3.4 + k * 0.5) % 1; if (ph < 0.35) { const b = makeBolt(300 + Math.floor(t * 3.4) * 7 + k, -60 + k * 90, -120, -40 + k * 70, -230, 0.5); drawBolt(c, b, Math.min(1, (1 - ph / 0.35) * boil), 1, "#fff6a8", 0.4); } }
  c.restore();
}
// поток из опрокинутого кубка: тучи, капли, искры летят вниз
function pour(c, x, y, t, t0, a = 1) {
  if (a <= 0) return;
  const r = mulberry32(17);
  c.save();
  for (let i = 0; i < 60; i++) {
    const d = r() * 1.2, lt = t - t0 - d; if (lt < 0) continue;
    const ph = (lt % 1.2) / 1.2, vx = -60 + r() * 120, px = x + vx * ph + Math.sin(lt * 5 + i) * 10, py = y + ph * ph * 1300;
    c.globalAlpha = a * (1 - ph * 0.6);
    if (i % 3 === 0) { circle(c, px, py, 22 + r() * 22); c.fillStyle = i % 2 ? "#c9cdf2" : "#9ea3d6"; c.fill(); }
    else { c.strokeStyle = "#e8f4ff"; c.lineWidth = 4; c.beginPath(); c.moveTo(px, py); c.lineTo(px + vx * 0.05, py + 40); c.stroke(); }
  }
  c.restore();
}

// Зевесов орёл: опорная точка — центр тела; flap 0..1; dir −1 смотрит влево
function eagle(c, x, y, s, flap, dir = -1, t = 0) {
  c.save(); c.translate(x, y); c.scale(s * dir, s);
  const wing = (back) => {
    c.save(); c.translate(-10, -30); c.rotate(-0.25 - flap * 1.0 + (back ? 0.35 : 0));
    const P = [[0, 0], [-90, -95], [-200, -160], [-300, -196], [-410, -212], [-338, -168], [-420, -172], [-336, -136], [-410, -128], [-326, -104], [-392, -84], [-310, -74], [-366, -42], [-282, -44],
      [-246, -14], [-214, 8], [-184, -8], [-152, 20], [-120, 4], [-88, 30], [-56, 14], [-20, 34]];
    c.beginPath(); P.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath();
    ink(c, back ? C.eagleD : C.eagle, 5, "#3a2414");
    if (!back) { c.save(); c.clip(); c.fillStyle = C.eagleL; c.beginPath(); c.moveTo(0, 0); c.lineTo(-90, -95); c.lineTo(-200, -160); c.lineTo(-290, -186); c.quadraticCurveTo(-200, -100, -40, 0); c.closePath(); c.fill();
      c.fillStyle = C.eagleD; c.beginPath(); c.moveTo(-282, -44); c.lineTo(-246, -14); c.lineTo(-214, 8); c.lineTo(-184, -8); c.lineTo(-152, 20); c.lineTo(-120, 4); c.lineTo(-88, 30); c.lineTo(-56, 14); c.lineTo(-20, 34); c.lineTo(-40, -10); c.quadraticCurveTo(-160, -40, -282, -44); c.fill(); c.restore();
      c.strokeStyle = "#3a2414"; c.lineWidth = 3; for (const [x0, y0, x1, y1] of [[-338, -168, -290, -150], [-336, -136, -280, -120], [-326, -104, -270, -92], [-310, -74, -250, -66]]) { c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); } }
    c.restore();
  };
  wing(true);
  // хвост
  c.beginPath(); c.moveTo(-90, 10); c.lineTo(-230, -20); c.lineTo(-240, 30); c.lineTo(-225, 70); c.lineTo(-90, 50); c.closePath(); ink(c, C.eagleD, 5, "#3a2414");
  // тело
  c.beginPath(); c.moveTo(120, -40); c.bezierCurveTo(60, -80, -60, -60, -110, 0); c.bezierCurveTo(-60, 70, 60, 80, 110, 30); c.closePath(); ink(c, C.eagle, 5, "#3a2414");
  c.save(); c.clip(); c.fillStyle = C.eagleD; ell(c, 0, 50, 140, 40); c.fill(); c.restore();
  // лапы с молнией
  for (const k of [0, 1]) { c.save(); c.translate(10 + k * 34, 50); c.strokeStyle = "#e0a400"; c.lineWidth = 12; c.lineCap = "round"; c.beginPath(); c.moveTo(0, 0); c.lineTo(6, 46); c.stroke(); c.restore(); }
  c.save(); c.translate(30, 104); c.rotate(-0.2);
  c.beginPath(); c.moveTo(-110, -10); c.lineTo(-30, -10); c.lineTo(-44, 6); c.lineTo(40, 2); c.lineTo(26, 16); c.lineTo(120, 12); c.lineTo(20, 26); c.lineTo(34, 12); c.lineTo(-50, 18); c.lineTo(-34, 4); c.closePath();
  ink(c, "#ffe14a", 4, "#c77a00"); glow(c, 0, 8, 160, "rgba(255,240,140,0.6)", 0.6 + 0.4 * Math.sin(t * 12));
  c.restore();
  for (const k of [0, 1]) { c.save(); c.translate(16 + k * 34, 96); c.strokeStyle = "#3a2414"; c.lineWidth = 6; c.beginPath(); c.arc(0, 0, 14, Math.PI * 0.1, Math.PI * 1.1); c.stroke(); c.restore(); }
  // голова
  c.beginPath(); c.moveTo(100, -30); c.bezierCurveTo(110, -110, 200, -120, 230, -70); c.bezierCurveTo(240, -40, 200, -10, 150, 0); c.closePath(); ink(c, C.eagleL, 5, "#3a2414");
  c.beginPath(); c.moveTo(222, -84); c.bezierCurveTo(260, -90, 290, -66, 286, -34); c.lineTo(262, -46); c.bezierCurveTo(254, -40, 236, -40, 222, -50); c.closePath(); ink(c, C.beak, 4, "#a86a00");
  ell(c, 196, -78, 12, 11); c.fillStyle = "#ffe14a"; c.fill(); c.strokeStyle = "#3a2414"; c.lineWidth = 3; c.stroke();
  circle(c, 199, -78, 6); c.fillStyle = "#111"; c.fill(); circle(c, 201, -81, 2.5); c.fillStyle = "#fff"; c.fill();
  c.strokeStyle = "#3a2414"; c.lineWidth = 5; c.beginPath(); c.moveTo(178, -96); c.lineTo(214, -92); c.stroke();
  wing(false);
  c.restore();
}
