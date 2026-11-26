// ---------- Печать комикса: тушь, сдвиг цветов, растр Бен-Дэй, бумага ----------
const _pat = {};
// растр: точки цвета col радиуса r в ячейке cell, сетка повёрнута на ang (градусы)
function dots(g, col, r = 3, cell = 12, ang = 45, a = 1) {
  const key = `${col}|${r}|${cell}|${ang}|${a}`;
  if (!_pat[key]) {
    const c = document.createElement("canvas");
    c.width = c.height = cell;
    const x = c.getContext("2d");
    x.fillStyle = css(col, a);
    x.beginPath(); x.arc(cell / 2, cell / 2, r, 0, TAU); x.fill();
    // соседние четверти, чтобы точки не резались по краю ячейки при большом радиусе
    if (r > cell / 2 - 0.5) for (const [dx, dy] of [[0, 0], [cell, 0], [0, cell], [cell, cell]]) { x.beginPath(); x.arc(dx, dy, r * 0.6, 0, TAU); x.fill(); }
    const p = g.createPattern(c, "repeat");
    p.setTransform(new DOMMatrix().rotate(ang));
    _pat[key] = p;
  }
  return _pat[key];
}
// заливка пути с печатным сдвигом (цвет чуть мимо контура), затем контур тушью
function shape(g, fn, fill, o = {}) {
  const reg = o.reg ?? 3, lw = o.lw ?? 5;
  if (o.union) {           // фигура из пересекающихся кругов: общий контур без внутренних линий
    g.save(); g.globalAlpha = o.a ?? 1;
    g.beginPath(); fn(g); g.lineWidth = lw * 2; g.strokeStyle = o.ink || INK; g.lineJoin = "round"; g.stroke();
    g.fillStyle = Array.isArray(fill) ? css(fill) : fill; g.fill();
    if (o.shade) { const sh = o.shade; g.save(); g.beginPath(); fn(g); g.clip(); g.beginPath(); sh.fn(g); g.fillStyle = dots(g, sh.col || C.ink, sh.r ?? 2.6, sh.cell ?? 10, sh.ang ?? 45, sh.a ?? 0.85); g.fill(); g.restore(); }
    g.restore();
    return;
  }
  if (fill) {
    g.save(); g.translate(reg, reg * 0.55);
    g.beginPath(); fn(g); g.fillStyle = Array.isArray(fill) ? css(fill, o.a ?? 1) : fill; g.fill(o.rule || "nonzero");
    g.restore();
  }
  if (o.shade) {           // тень растром внутри формы: o.shade = {fn: путь области, col, r, cell, ang}
    const s = o.shade;
    g.save(); g.beginPath(); fn(g); g.clip(o.rule || "nonzero");
    g.beginPath(); s.fn(g); g.fillStyle = dots(g, s.col || C.ink, s.r ?? 2.6, s.cell ?? 10, s.ang ?? 45, s.a ?? 0.85); g.fill();
    g.restore();
  }
  if (lw > 0) { g.beginPath(); fn(g); g.lineWidth = lw; g.strokeStyle = o.ink || INK; g.lineJoin = "round"; g.lineCap = "round"; g.stroke(); }
}
// растр поверх области (без контура)
function halftone(g, fn, col, r = 3, cell = 12, ang = 45, a = 1) {
  g.beginPath(); fn(g); g.fillStyle = dots(g, col, r, cell, ang, a); g.fill();
}
// конечность-капсула: контур тушью + цвет; pts — [[x,y],…]
function limb(g, pts, w, col, lw = 5) {
  g.lineJoin = "round"; g.lineCap = "round";
  g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.strokeStyle = INK; g.lineWidth = w + lw * 2; g.stroke();
  g.strokeStyle = css(col); g.lineWidth = w; g.stroke();
}
// линия тушью с нажимом (толще в середине)
function inkLine(g, pts, w = 5, col = INK) {
  g.strokeStyle = col; g.lineCap = "round"; g.lineJoin = "round";
  for (let i = 1; i < pts.length; i++) {
    const u = i / pts.length;
    g.lineWidth = w * (0.55 + 0.9 * Math.sin(u * Math.PI));
    g.beginPath(); g.moveTo(pts[i - 1][0], pts[i - 1][1]); g.lineTo(pts[i][0], pts[i][1]); g.stroke();
  }
}
const circ = (x, y, r) => (g) => g.arc(x, y, r, 0, TAU);
const ell = (x, y, rx, ry, rot = 0) => (g) => g.ellipse(x, y, rx, ry, rot, 0, TAU);
const rect = (x, y, w, h) => (g) => g.rect(x, y, w, h);
const poly = (pts) => (g) => { g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); };
function rrect(x, y, w, h, r) {
  return (g) => { g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
}
// звезда-взрыв
function burstP(x, y, r1, r2, n, seed = 1, rot = 0) {
  return (g) => {
    for (let i = 0; i < n * 2; i++) {
      const a = rot + i / (n * 2) * TAU;
      const r = i % 2 ? r1 * (0.85 + 0.3 * hash(seed + i)) : r2 * (0.8 + 0.4 * hash(seed + i * 3.1));
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      i ? g.lineTo(px, py) : g.moveTo(px, py);
    }
    g.closePath();
  };
}
// облако из кругов
function cloudP(x, y, w, h, seed = 1, n = 6) {
  return (g) => {
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1);
      const cx = x - w / 2 + w * (0.12 + 0.76 * u), r = h * (0.38 + 0.25 * Math.sin(u * Math.PI) + 0.08 * hash(seed + i));
      const cy = y + h * 0.15 - r * 0.6 * Math.sin(u * Math.PI);
      g.moveTo(cx + r, cy); g.arc(cx, cy, r, 0, TAU);
    }
    g.moveTo(x - w / 2 + h * 0.3, y + h * 0.3); g.rect(x - w / 2 + h * 0.25, y, w - h * 0.5, h * 0.32);
  };
}
// лучи скорости вокруг точки
function speedLines(g, cx, cy, r1, r2, n, seed, t, a = 1) {
  g.save(); g.globalAlpha = a; g.strokeStyle = INK; g.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const ang = hash(seed + i) * TAU + t * 0.2, rr = r1 + hash(seed + i * 7) * (r2 - r1) * 0.4;
    g.lineWidth = 2 + 4 * hash(seed + i * 3);
    g.beginPath(); g.moveTo(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr); g.lineTo(cx + Math.cos(ang) * r2, cy + Math.sin(ang) * r2); g.stroke();
  }
  g.restore();
}
// звук-надпись: объёмные буквы с контуром; k — масштаб пружины, a — прозрачность
function sfx(g, text, x, y, size, rot, col, k = 1, a = 1, col2 = C.ink) {
  if (k <= 0.01 || a <= 0.01) return;
  g.save(); g.globalAlpha = a; g.translate(x, y); g.rotate(rot); g.scale(k, k);
  g.font = `${size}px ComicSfx`; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
  const d = size * 0.09;
  for (let i = 6; i >= 1; i--) { g.fillStyle = css(col2); g.fillText(text, d * i / 6 * 1.2, d * i / 6); }
  g.lineWidth = size * 0.1; g.strokeStyle = INK; g.strokeText(text, 0, 0);
  g.fillStyle = css(col); g.fillText(text, 0, 0);
  g.lineWidth = size * 0.035; g.strokeText(text, 0, 0);
  g.restore();
}
// бумага: волокна и пятна, плитка 512×512 (по зерну, одинаковая в каждом кадре)
const PAPER = (() => {
  const c = document.createElement("canvas"); c.width = c.height = 512;
  const x = c.getContext("2d");
  x.fillStyle = css(C.paper); x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) {
    const px = hash(i * 1.7) * 512, py = hash(i * 2.9 + 4) * 512, r = 0.4 + hash(i * 5.3) * 1.4;
    x.fillStyle = hash(i * 7.1) > 0.5 ? "rgba(150,120,70,0.10)" : "rgba(255,255,255,0.20)";
    x.fillRect(px, py, r * 2, r);
  }
  for (let i = 0; i < 260; i++) {
    const px = hash(i * 3.3 + 9) * 512, py = hash(i * 4.1 + 2) * 512, l = 6 + hash(i) * 22, ang = hash(i * 9.9) * TAU;
    x.strokeStyle = "rgba(140,110,60,0.13)"; x.lineWidth = 0.7;
    x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(ang) * l * 0.5 + 3, py + Math.sin(ang) * l * 0.5 - 3, px + Math.cos(ang) * l, py + Math.sin(ang) * l); x.stroke();
  }
  return c;
})();
let _paperPat = null;
function paperFill(g) { if (!_paperPat) _paperPat = g.createPattern(PAPER, "repeat"); return _paperPat; }
// газетная фактура поверх цветной картинки панели: мелкие светлые волокна (в мировых координатах)
function paperOver(g, x, y, w, h, a = 0.35) {
  g.save(); g.globalAlpha = a; g.globalCompositeOperation = "multiply"; g.fillStyle = paperFill(g); g.fillRect(x, y, w, h); g.restore();
}
