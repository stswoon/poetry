// ---------- Кот-чиби: сидит на подушке анфас ----------
// (x, y) — точка посадки (низ, середина), s — масштаб.
// o: eyes 0 (прищур ^ ^) … 1 (открыты), look −1…1 (куда смотрят зрачки), sing 0…1 (поёт), ear 0…1 (дёрг уха),
//    sway — наклон корпуса (рад), tailExt 0…1 (хвост вытянут по полу вправо), tailSweep 0…1 (метёт влево),
//    blush, mouthO (рот «о» от удивления)
function drawCat(g, x, y, s, t, o = {}) {
  const eyes = o.eyes ?? 0, look = o.look ?? 0, sing = o.sing ?? 0, ear = o.ear ?? 0;
  g.save(); g.translate(x, y); g.scale(s, s);
  // тень на подушке/полу
  ell(g, 0, 2, 120, 16); g.fillStyle = "rgba(90,50,120,0.22)"; g.fill();
  g.rotate(o.sway ?? 0);
  const lw = 5;
  // --- хвост (за телом) ---
  const ext = ease(o.tailExt ?? 0), sweep = ease(o.tailSweep ?? 0);
  const tp = [];
  for (let i = 0; i <= 16; i++) {
    const u = i / 16;
    // свёрнутый: вверх-вправо дугой; вытянутый: по полу вправо далеко; sweep — дуга уходит влево к коробу
    const cx = 62 + Math.sin(u * 2.2) * 70 + Math.sin(t * 2.3 + u * 3) * 8 * u;
    const cy = -24 - u * 120 + Math.sin(u * 3.1) * 10;
    const L = 470;
    const fx = 62 + u * L * (1 - sweep * 0.55), fy = -8 - Math.sin(u * Math.PI) * (16 + sweep * 60);
    tp.push([lerp(cx, fx, ext), lerp(cy, fy, ext)]);
  }
  limb(g, tp, 30, C.cat, { lw });
  // белый кончик хвоста
  limb(g, tp.slice(13), 30, C.catW, { lw });
  // --- задние лапы: бока-окорока и ступни (обе видны) ---
  for (const sd of [-1, 1]) {
    cel2(g, (c) => ell(c, sd * 56, -34, 40, 34), C.cat, { lw, sx: -sd * 6, sy: -8 });
    cel2(g, (c) => ell(c, sd * 70, -8, 28, 13), C.catW, { lw, sx: -sd * 3, sy: -4 });
    // пальцы на ступне
    g.beginPath(); g.moveTo(sd * 70 - 8, -4); g.lineTo(sd * 70 - 8, 2); g.moveTo(sd * 70 + 8, -4); g.lineTo(sd * 70 + 8, 2);
    g.strokeStyle = css(ink(C.catW)); g.lineWidth = 3; g.stroke();
  }
  // --- тело ---
  const breathe = 1 + Math.sin(t * 2.6) * 0.015;
  cel2(g, (c) => ell(c, 0, -78, 80 * breathe, 74), C.cat, { lw, sx: -10, sy: -10 });
  // полоски на боках
  g.lineCap = "round";
  for (const sd of [-1, 1]) for (let k = 0; k < 2; k++) {
    g.beginPath(); g.moveTo(sd * (66 - k * 4), -96 + k * 26); g.quadraticCurveTo(sd * (50 - k * 4), -90 + k * 26, sd * (44 - k * 3), -100 + k * 26);
    g.strokeStyle = css(C.catS); g.lineWidth = 9; g.stroke();
  }
  // белый живот
  cel2(g, (c) => ell(c, 0, -62, 44, 50), [255, 214, 172], { lw: 0, noLine: true, sx: -5, sy: -6 });
  // --- передние лапы: прямые от груди до подушки, обе спереди ---
  for (const sd of [-1, 1]) {
    const knead = sing * Math.max(0, Math.sin(t * 7 + (sd > 0 ? Math.PI : 0))) * 5;
    limb(g, [[sd * 21, -96], [sd * 21, -18 - knead]], 30, C.catW, { lw });
    cel2(g, (c) => ell(c, sd * 22, -12 - knead, 20, 13), C.catW, { lw: 4, sx: -2, sy: -4 });
    g.beginPath(); g.moveTo(sd * 22 - 6, -8 - knead); g.lineTo(sd * 22 - 6, -2 - knead); g.moveTo(sd * 22 + 6, -8 - knead); g.lineTo(sd * 22 + 6, -2 - knead);
    g.strokeStyle = css(ink(C.catW)); g.lineWidth = 3; g.stroke();
  }
  // --- голова (большая) ---
  g.save(); g.translate(0, -186); g.rotate(Math.sin(t * 2.1) * 0.04 * sing);
  // уши (за головой)
  for (const sd of [-1, 1]) {
    const tw = sd > 0 ? Math.sin(clamp(ear) * Math.PI * 3) * 0.35 * (1 - clamp(ear) * 0.3) : 0;
    g.save(); g.translate(sd * 66, -58); g.rotate(sd * 0.28 + tw);
    cel2(g, (c) => { c.beginPath(); c.moveTo(-34, 22); c.quadraticCurveTo(-10, -50, 4, -62); c.quadraticCurveTo(26, -30, 34, 22); c.closePath(); }, C.cat, { lw, sx: -sd * 5, sy: -4 });
    g.beginPath(); g.moveTo(-18, 14); g.quadraticCurveTo(-4, -30, 3, -40); g.quadraticCurveTo(16, -18, 20, 14); g.closePath();
    g.fillStyle = css(C.pink); g.fill();
    g.restore();
  }
  // череп
  cel2(g, (c) => ell(c, 0, 0, 116, 94), C.cat, { lw, sx: -12, sy: -12 });
  // мордочка белая
  g.beginPath(); g.moveTo(-70, 40); g.quadraticCurveTo(-60, 0, -24, 8); g.quadraticCurveTo(0, -6, 24, 8); g.quadraticCurveTo(60, 0, 70, 40);
  g.quadraticCurveTo(0, 104, -70, 40); g.closePath(); g.fillStyle = css(C.catW); g.fill();
  // полоски на лбу
  for (const dx of [-24, 0, 24]) {
    g.beginPath(); g.moveTo(dx, -92); g.lineTo(dx * 1.1, -60 + Math.abs(dx) * 0.4);
    g.strokeStyle = css(C.catS); g.lineWidth = 10; g.lineCap = "round"; g.stroke();
  }
  // румянец
  for (const sd of [-1, 1]) { ell(g, sd * 70, 30, 22, 12); g.fillStyle = css(C.pink, 0.55 + 0.25 * (o.blush ?? 0)); g.fill(); }
  // глаза
  const eo = clamp(eyes);
  for (const sd of [-1, 1]) {
    const ex = sd * 44, ey = -2;
    if (eo < 0.5) {
      // прищур «^ ^» — дужки
      g.beginPath(); g.moveTo(ex - 22, ey + 6); g.quadraticCurveTo(ex, ey - 18 + eo * 10, ex + 22, ey + 6);
      g.strokeStyle = css(C.text); g.lineWidth = 8; g.lineCap = "round"; g.stroke();
    } else {
      const k = (eo - 0.5) * 2, ry = 30 * k + 2;
      ell(g, ex, ey, 25, ry); g.fillStyle = css(C.white); g.fill(); g.lineWidth = 5; g.strokeStyle = css(C.text); g.stroke();
      g.save(); ell(g, ex, ey, 25, ry); g.clip();
      // радужка: зелёно-золотая, большой зрачок, блики
      const px = ex + look * 9, py = ey + 2;
      ell(g, px, py, 19, 26); g.fillStyle = css([90, 170, 90]); g.fill();
      ell(g, px, py + 6, 19, 18); g.fillStyle = css([200, 210, 80]); g.fill();
      ell(g, px, py, 10, 19); g.fillStyle = css([40, 30, 60]); g.fill();
      ell(g, px - 7, py - 10, 7, 9); g.fillStyle = css(C.white); g.fill();
      ell(g, px + 7, py + 10, 3.5, 3.5); g.fill();
      if (o.reflect) o.reflect(g, px, py, sd);
      g.restore();
      // ресницы-уголки
      g.beginPath(); g.moveTo(ex + sd * 22, ey - ry * 0.6); g.lineTo(ex + sd * 32, ey - ry * 0.9);
      g.strokeStyle = css(C.text); g.lineWidth = 5; g.stroke();
    }
  }
  // носик
  g.beginPath(); g.moveTo(-8, 22); g.lineTo(8, 22); g.lineTo(0, 31); g.closePath(); g.fillStyle = css(C.pink); g.fill();
  g.lineWidth = 3; g.strokeStyle = css(ink(C.pink)); g.stroke();
  // рот: «ω», при пении приоткрыт и «дышит»
  const open = sing * (0.45 + 0.55 * Math.abs(Math.sin(t * 4.2))) + (o.mouthO ?? 0);
  if (open > 0.08) {
    ell(g, 0, 44 + open * 4, 10 + open * 4, 5 + open * 10); g.fillStyle = css([170, 50, 80]); g.fill();
    g.lineWidth = 4; g.strokeStyle = css(C.text); g.stroke();
    ell(g, 0, 48 + open * 9, 6 + open * 2, 3 + open * 3); g.fillStyle = css(C.pink); g.fill();
  }
  g.beginPath(); g.moveTo(-18, 34); g.quadraticCurveTo(-9, 44, 0, 33); g.quadraticCurveTo(9, 44, 18, 34);
  g.strokeStyle = css(C.text); g.lineWidth = 4.5; g.lineCap = "round"; g.stroke();
  // усы
  for (const sd of [-1, 1]) for (let k = -1; k <= 1; k++) {
    g.beginPath(); g.moveTo(sd * 60, 30 + k * 10); g.lineTo(sd * (108 + Math.abs(k) * 4), 24 + k * 16 + Math.sin(t * 3 + k) * 2 * sing);
    g.strokeStyle = css(ink(C.cat)); g.lineWidth = 3; g.stroke();
  }
  // блик на голове
  ell(g, -50, -54, 26, 12, -0.4); g.fillStyle = "rgba(255,255,255,0.55)"; g.fill();
  g.restore();
  g.restore();
}
// точка конца хвоста в мировых координатах (для гэга с игрушками)
function catTailTip(x, y, s, ext, sweep) {
  const u = 1, L = 470;
  return [x + (62 + u * L * (1 - ease(sweep) * 0.55)) * s * ease(ext), y - 8 * s];
}
// круглая подушка на полу под котом
function drawCushion(g, x, y, s) {
  g.save(); g.translate(x, y); g.scale(s, s);
  ell(g, 0, 10, 150, 26); g.fillStyle = "rgba(90,50,120,0.22)"; g.fill();
  cel2(g, (c) => { c.beginPath(); c.ellipse(0, -6, 140, 34, 0, 0, Math.PI); c.lineTo(-140, -14); c.ellipse(0, -14, 140, 34, 0, Math.PI, 0); c.closePath(); }, C.violet, { lw: 5, sx: -6, sy: -8 });
  ell(g, 0, -16, 124, 26); g.fillStyle = css(lit(C.violet, 0.35)); g.fill();
  for (const sd of [-1, 1]) { ell(g, sd * 132, -8, 12, 12); g.fillStyle = css(C.yellow); g.fill(); g.lineWidth = 3; g.strokeStyle = css(ink(C.yellow)); g.stroke(); }
  g.restore();
}
