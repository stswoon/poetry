// ---------- листья: контуры, прожилки, цвет по сезону, лицо ----------
// Локальные координаты листа: основание пластинки в (0,0), лист растёт вверх (−y), длина ~1.
// Черешок идёт от (0, PET) до (0,0) — ниже основания.
const LEAF = {};
function buildLeafShapes() {
  // клён: 5 острых лопастей с мелкими зубцами
  const mk = (lobes, r0, w, teeth, tAmp) => {
    const pts = [], C = [0, -r0], N = 220;
    for (let i = 0; i < N; i++) {
      const th = -Math.PI + (i / N) * TAU; // от низа по часовой
      let r = r0;
      for (const [ang, R] of lobes) { let d = Math.abs(th - ang); d = Math.min(d, TAU - d); const f = Math.max(0, 1 - d / w); r = Math.max(r, r0 + (R - r0) * Math.pow(f, 1.15)); }
      if (r > r0 * 1.25) r *= 1 + tAmp * Math.abs(((th * teeth / Math.PI) % 2 + 2) % 2 - 1) - tAmp * 0.5;
      pts.push([C[0] + Math.sin(th) * r, C[1] - Math.cos(th) * r]);
    }
    return pts;
  };
  const d2r = Math.PI / 180;
  const mapleLobes = [[0, 0.66], [-52 * d2r, 0.6], [52 * d2r, 0.6], [-108 * d2r, 0.4], [108 * d2r, 0.4]];
  LEAF.maple = { pts: mk(mapleLobes, 0.19, 0.62, 22, 0.07), C: [0, -0.19], tips: mapleLobes.map(([a, R]) => [Math.sin(a) * R, -0.19 - Math.cos(a) * R]), face: [0, -0.3], fs: 1, pet: 0.34 };
  // берёза: треугольно-яйцевидная, двоякопильчатая
  const prof = (wf, teeth, amp, round) => {
    const L = [], R = [], N = 80;
    for (let i = 0; i <= N; i++) {
      const s = i / N, w = wf(s);
      const tooth = round ? Math.abs(Math.sin(s * teeth * Math.PI)) : Math.abs(((s * teeth) % 1) - 0.5) * 2;
      const ww = w * (1 + amp * (tooth - 0.5) * (s > 0.06 && s < 0.97 ? 1 : 0));
      R.push([ww, -s]); L.unshift([-ww, -s]);
    }
    return R.concat(L);
  };
  LEAF.birch = { pts: prof((s) => 0.36 * Math.pow(Math.sin(Math.PI * Math.pow(s, 0.62)), 1.1) * (1 - 0.15 * s), 13, 0.16, false), C: [0, -0.4], face: [0, -0.38], fs: 0.62, pet: 0.3 };
  LEAF.aspen = { pts: prof((s) => 0.46 * Math.pow(Math.sin(Math.PI * s), 0.62), 9, 0.1, true), C: [0, -0.5], face: [0, -0.48], fs: 0.75, pet: 0.42 };
  LEAF.oak = { pts: prof((s) => 0.3 * Math.pow(Math.sin(Math.PI * Math.pow(s, 0.8)), 0.7) * (0.62 + 0.38 * Math.abs(Math.cos(s * Math.PI * 4.5))), 1, 0, false), C: [0, -0.5], face: [0, -0.5], fs: 0.6, pet: 0.12 };
  for (const k in LEAF) LEAF[k].path = polyPath(LEAF[k].pts);
}

// цвета: летний и осенний для каждого героя
const SUMMER = [[88, 150, 58], [112, 172, 68]];          // центр, край
const AUTUMN = {
  gold: [[226, 176, 50], [238, 150, 38]], orange: [[230, 128, 40], [205, 78, 34]], red: [[200, 64, 40], [160, 38, 36]],
  crimson: [[172, 44, 52], [120, 30, 40]], amber: [[214, 150, 44], [190, 96, 36]], lemon: [[236, 200, 70], [220, 160, 40]],
};
// цвет листа: a — степень осени (0 лето, 1 осень); край желтеет раньше центра
function leafFill(c, kind, s, a, aut, pale = 0) {
  const sh = LEAF[kind], A = AUTUMN[aut] || AUTUMN.gold;
  const ae = clamp(a * 1.5, 0, 1), ac = clamp(a * 1.5 - 0.5, 0, 1);
  // зелень сначала желтеет, потом уходит в свой осенний цвет — без бурой грязи
  const via = (S, T, u) => u < 0.5 ? mixRgb(S, [214, 190, 70], u * 2) : mixRgb([214, 190, 70], T, (u - 0.5) * 2);
  let cc = via(SUMMER[0], A[0], ac), ce = via(SUMMER[1], A[1], ae);
  if (pale > 0) { cc = mixRgb(cc, [214, 205, 170], pale); ce = mixRgb(ce, [214, 205, 170], pale); }
  const g = c.createRadialGradient(sh.C[0] * s, sh.C[1] * s, 0, sh.C[0] * s, sh.C[1] * s, s * 0.62);
  g.addColorStop(0, rgbStr(mixRgb(cc, [255, 250, 220], 0.12))); g.addColorStop(0.55, rgbStr(cc)); g.addColorStop(1, rgbStr(ce));
  return { g, cc, ce };
}
function leafVeins(c, kind, s, col) {
  const sh = LEAF[kind];
  c.save(); c.strokeStyle = col; c.lineCap = "round";
  if (kind === "maple") {
    for (const tp of sh.tips) {
      c.lineWidth = s * 0.016; c.beginPath(); c.moveTo(0, -s * 0.02); c.lineTo(tp[0] * s * 0.9, tp[1] * s * 0.9); c.stroke();
      c.lineWidth = s * 0.008;
      for (const u of [0.35, 0.58, 0.78]) { // боковые жилки к краю лопасти
        const bx = tp[0] * s * 0.9 * u, by = (tp[1] * 0.9 * u - 0.02 * (1 - u)) * s, ang = Math.atan2(tp[1], tp[0]);
        for (const sg of [-1, 1]) { const a2 = ang + sg * 0.75; c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + Math.cos(a2) * s * 0.11 * (1.1 - u), by + Math.sin(a2) * s * 0.11 * (1.1 - u)); c.stroke(); }
      }
    }
  } else {
    const len = kind === "oak" ? 0.98 : 0.96;
    c.lineWidth = s * 0.02; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -len * s); c.stroke();
    c.lineWidth = s * 0.009;
    const n = kind === "aspen" ? 4 : kind === "oak" ? 4 : 7;
    for (let i = 1; i <= n; i++) {
      const u = i / (n + 1), y = -u * len * s, w = (kind === "aspen" ? 0.36 : kind === "oak" ? 0.24 : 0.28) * Math.sin(Math.PI * Math.pow(u, 0.7)) * s;
      for (const sg of [-1, 1]) { c.beginPath(); c.moveTo(0, y); c.quadraticCurveTo(sg * w * 0.5, y - s * 0.03, sg * w * 0.92, y - s * 0.1); c.stroke(); }
    }
  }
  c.restore();
}
// лист целиком в локальных координатах (вызывать после translate/rotate)
// o: {a, aut, pale, lift, petiole (доля длины), petBend}
function drawLeafLocal(c, kind, s, o = {}) {
  const sh = LEAF[kind], a = o.a ?? 0, pet = (o.petiole ?? sh.pet) * s;
  const F = leafFill(c, kind, s, a, o.aut, o.pale ?? 0);
  // черешок
  if (pet > 0.5 && o.noPet !== true) {
    c.save(); c.strokeStyle = rgbStr(mixRgb(F.ce, [70, 40, 18], 0.45)); c.lineCap = "round"; c.lineWidth = Math.max(1.5, s * 0.03);
    c.beginPath(); c.moveTo(0, pet); c.quadraticCurveTo((o.petBend ?? 0.12) * s, pet * 0.5, 0, 0); c.stroke(); c.restore();
  }
  c.save(); c.scale(s, s);
  const k = CAMZ; CAMZ = k * s; // тень и срез в экранных пикселях
  cut(c, sh.path, F.g, { lift: o.lift ?? 1, sh: o.sh ?? 1, edgeW: 2.0, tex: 0.9 });
  if ((o.gloss ?? -1) > 0 && o.gloss < 1) { // блик пробегает по листу
    c.save(); c.clip(sh.path); const gx = lerp(-1.2, 1.2, o.gloss);
    const g = c.createLinearGradient(gx - 0.25, -0.5, gx + 0.25, -0.2); g.addColorStop(0, "rgba(255,255,240,0)"); g.addColorStop(0.5, "rgba(255,255,240,0.6)"); g.addColorStop(1, "rgba(255,255,240,0)");
    c.fillStyle = g; c.fillRect(-1, -1.2, 2, 1.4); c.restore();
  }
  CAMZ = k; c.restore();
  leafVeins(c, kind, s, rgbStr(mixRgb(mixRgb(F.cc, F.ce, 0.5), [255, 244, 200], 0.42), 0.85));
}

// ---------- лицо из бумаги: глаза-овалы и рот ----------
// f: {blink 0..1 (1 открыт), lx, ly (взгляд −1..1), mouth: "smile"|"o"|"grin"|"flat"|"yawn"|"sad"|"shut", mo (раскрытие), brow (−1 хмуро … 1 удивлённо)}
function drawFace(c, x, y, s, f = {}, tilt = 0) {
  const ex = s * 0.105, ey = s * 0.125, gap = s * 0.15, bl = clamp(f.blink ?? 1, 0, 1);
  c.save(); c.translate(x, y); c.rotate(tilt);
  for (const sg of [-1, 1]) {
    const cx = sg * gap * 0.5 * 1.25, cy = 0;
    if (f.sleep || bl < 0.12) { // закрытый глаз — дужка
      c.strokeStyle = "#2a1a10"; c.lineWidth = Math.max(2, s * 0.022); c.lineCap = "round";
      c.beginPath(); c.moveTo(cx - ex * 0.85, cy); c.quadraticCurveTo(cx, cy + ey * (f.sleep ? 0.55 : 0.4), cx + ex * 0.85, cy); c.stroke();
      continue;
    }
    // белок — вырезанный кружок с тенью
    c.fillStyle = "rgba(40,22,8,0.22)"; c.beginPath(); c.ellipse(cx + s * 0.012, cy + s * 0.016, ex, ey * bl, 0, 0, TAU); c.fill();
    c.fillStyle = "#fbf6ea"; c.beginPath(); c.ellipse(cx, cy, ex, ey * bl, 0, 0, TAU); c.fill();
    c.save(); c.beginPath(); c.ellipse(cx, cy, ex, ey * bl, 0, 0, TAU); c.clip();
    const px = cx + (f.lx ?? 0) * ex * 0.45, py = cy + (f.ly ?? 0) * ey * 0.42 + ey * 0.12;
    c.fillStyle = "#24160c"; c.beginPath(); c.ellipse(px, py, ex * 0.56, ey * 0.56, 0, 0, TAU); c.fill();
    c.fillStyle = "#fffaf0"; c.beginPath(); c.arc(px - ex * 0.2, py - ey * 0.22, ex * 0.18, 0, TAU); c.fill();
    c.restore();
    if (f.brow !== undefined && Math.abs(f.brow) > 0.05) { // бровь-полоска
      c.save(); c.strokeStyle = "#2a1a10"; c.lineWidth = Math.max(2, s * 0.02); c.lineCap = "round";
      const by = cy - ey * 1.5 - f.brow * ey * 0.25, tl = -sg * f.brow * 0.25;
      c.beginPath(); c.moveTo(cx - ex * 0.8, by + Math.sin(tl) * ex); c.lineTo(cx + ex * 0.8, by - Math.sin(tl) * ex); c.stroke(); c.restore();
    }
  }
  // рот
  const my = ey * 1.45, mw = s * 0.09, mo = f.mo ?? 0.5;
  c.fillStyle = "#3a1a10"; c.strokeStyle = "#2a1208"; c.lineWidth = Math.max(2, s * 0.02); c.lineCap = "round";
  const m = f.mouth ?? "smile";
  if (m === "smile") { c.beginPath(); c.moveTo(-mw, my); c.quadraticCurveTo(0, my + mw * 0.9, mw, my); c.stroke(); }
  else if (m === "sad") { c.beginPath(); c.moveTo(-mw * 0.8, my + mw * 0.35); c.quadraticCurveTo(0, my - mw * 0.35, mw * 0.8, my + mw * 0.35); c.stroke(); }
  else if (m === "flat") { c.beginPath(); c.moveTo(-mw * 0.6, my + mw * 0.1); c.lineTo(mw * 0.6, my + mw * 0.1); c.stroke(); }
  else if (m === "grin") { c.beginPath(); c.moveTo(-mw, my - mw * 0.05); c.quadraticCurveTo(0, my + mw * (0.6 + 1.0 * mo), mw, my - mw * 0.05); c.closePath(); c.fill();
    c.fillStyle = "#e86a5a"; c.beginPath(); c.ellipse(0, my + mw * (0.25 + 0.45 * mo), mw * 0.42, mw * 0.18 * (0.5 + mo), 0, 0, TAU); c.fill(); }
  else if (m === "o" || m === "yawn") { const r = mw * (m === "yawn" ? 0.55 + 0.6 * mo : 0.35 + 0.35 * mo); c.beginPath(); c.ellipse(0, my + r * 0.4, r * 0.8, r, 0, 0, TAU); c.fill(); }
  c.restore();
}
