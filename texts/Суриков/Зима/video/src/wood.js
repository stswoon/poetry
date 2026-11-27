// ---------- Дерево: текстуры волокон, роспись по дереву, лак, тени ----------
const C = {
  walnut: [92, 58, 36], walnutD: [58, 35, 22], birch: [226, 196, 150], birchD: [196, 160, 112],
  pine: [214, 170, 110], pineD: [170, 120, 70],
  snow: [246, 248, 252], snowS: [196, 214, 236], snowB: [150, 178, 214],
  earth: [150, 112, 62], earthD: [118, 86, 46], grass: [128, 146, 74], grassD: [98, 118, 58],
  path: [176, 140, 92],
  verm: [206, 58, 38], vermD: [150, 36, 26], ochre: [214, 150, 52], ochreD: [160, 102, 34],
  green: [44, 112, 72], greenD: [26, 74, 48], cobalt: [40, 82, 170], cobaltD: [24, 50, 116], ice: [168, 214, 240],
  skin: [244, 196, 160], cheek: [232, 120, 110], ink: [46, 28, 18], burnt: [70, 36, 16],
  straw: [232, 192, 84], strawD: [184, 138, 44], white: [255, 255, 255], gold: [244, 196, 64],
  sky: [120, 150, 190], dusk: [64, 70, 120],
};
// детерминированный генератор по зерну
function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

// текстура волокон: полосы с изгибами вокруг сучков
function makeGrain(w, h, base, dark, seed, opt = {}) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const x = c.getContext("2d");
  const r = rng(seed);
  x.fillStyle = css(base); x.fillRect(0, 0, w, h);
  const knots = [];
  for (let i = 0; i < (opt.knots ?? 3); i++) knots.push([w * (0.15 + r() * 0.7), h * (0.15 + r() * 0.7), 20 + r() * 40]);
  const step = opt.step ?? 5;
  // бесшовно: изгибы — целое число периодов по ширине, сучки учитываются с соседними копиями, линии повторяются по высоте
  const per = (n) => TAU * n / w;
  for (let y0 = 0; y0 < h; y0 += step * (0.6 + r() * 0.9)) {
    const a = (opt.alpha ?? 0.22) * (0.3 + r() * 0.9), wv = 2 + r() * 6, f = per(1 + Math.floor(r() * 3)), ph = r() * 10;
    const colr = css(r() < 0.75 ? dark : shade(base, 0.25), a), lw = 0.6 + r() * (opt.lw ?? 1.6);
    for (const oy of [-h, 0, h]) {
      x.beginPath();
      for (let px = 0; px <= w; px += 8) {
        let y = y0 + oy + Math.sin(px * f + ph) * wv + Math.sin(px * f * 3 + ph * 2) * wv * 0.3;
        for (const [kx0, ky0, kr] of knots) for (const ox of [-w, 0, w]) for (const oky of [-h, 0, h]) {
          const kx = kx0 + ox, ky = ky0 + oky;
          const dx = px - kx, dy = y - ky, d2 = dx * dx * 0.08 + dy * dy;
          if (d2 < kr * kr * 20) y += (dy >= 0 ? 1 : -1) * kr * 1.6 * Math.exp(-d2 / (kr * kr * 2.2));
        }
        px === 0 ? x.moveTo(px, y) : x.lineTo(px, y);
      }
      x.strokeStyle = colr; x.lineWidth = lw; x.stroke();
    }
  }
  // сучки рисуем от центров вдали от края, чтобы кольца не резались швом
  for (const [kx, ky, kr] of knots) {
    for (let k = 0; k < 5; k++) {
      x.beginPath(); x.ellipse(kx, ky, kr * 0.5 * (1 - k * 0.17), kr * 0.22 * (1 - k * 0.17), 0, 0, TAU);
      x.strokeStyle = css(dark, 0.35); x.lineWidth = 1.2; x.stroke();
    }
    x.beginPath(); x.ellipse(kx, ky, kr * 0.1, kr * 0.05, 0, 0, TAU); x.fillStyle = css(dark, 0.6); x.fill();
  }
  return c;
}
let TEX = null;
function tex() {
  if (TEX) return TEX;
  TEX = {
    table: makeGrain(1024, 1024, C.walnut, C.walnutD, 11, { knots: 4, alpha: 0.5, step: 6, lw: 2.2 }),
    board: makeGrain(1024, 1024, C.birch, C.birchD, 23, { knots: 2, alpha: 0.28, step: 7 }),
    pine: makeGrain(512, 512, C.pine, C.pineD, 37, { knots: 1, alpha: 0.35, step: 5 }),
    grainGrey: makeGrain(512, 512, [200, 200, 200], [120, 120, 120], 41, { knots: 1, alpha: 0.6, step: 4 }),
  };
  return TEX;
}
const PAT = {};
function pat(g, name, ox = 0, oy = 0, sc = 1, rot = 0) {
  const k = name + "|" + (g === window.__g0 ? 0 : 1);
  if (!PAT[k]) PAT[k] = g.createPattern(tex()[name], "repeat");
  const p = PAT[k];
  p.setTransform(new DOMMatrix().translate(ox, oy).rotate(rot).scale(sc));
  return p;
}
// роспись по дереву: заливка цветом, сквозь краску видны волокна (multiply)
function paintPath(g, col, opt = {}) {
  g.fillStyle = css(col, opt.a ?? 1); g.fill();
  if (opt.grain !== false) {
    g.save(); g.clip();
    g.globalCompositeOperation = "multiply"; g.globalAlpha = opt.ga ?? 0.22;
    g.fillStyle = pat(g, "grainGrey", opt.ox ?? 0, opt.oy ?? 0, opt.sc ?? 0.6, opt.rot ?? 0);
    g.fillRect(-4000, -4000, 8000, 8000);
    g.restore();
  }
}
// натуральное дерево (не крашено)
function woodPath(g, name = "pine", ox = 0, oy = 0, sc = 1, rot = 0) {
  g.fillStyle = pat(g, name, ox, oy, sc, rot); g.fill();
}
// мягкая тень фишки на доске
function dropShadow(g, x, y, rx, ry, a = 0.35) {
  const gr = g.createRadialGradient(x, y, 0, x, y, rx);
  gr.addColorStop(0, `rgba(40,22,10,${a})`); gr.addColorStop(0.6, `rgba(40,22,10,${a * 0.55})`); gr.addColorStop(1, "rgba(40,22,10,0)");
  g.save(); g.translate(x, y); g.scale(1, ry / rx); g.translate(-x, -y);
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, rx, 0, TAU); g.fill(); g.restore();
}
// объём цилиндра: поперечный градиент (тень по краям, блик лака слева)
function cylShade(g, x0, x1, a = 1) {
  const gr = g.createLinearGradient(x0, 0, x1, 0);
  gr.addColorStop(0, `rgba(30,16,8,${0.42 * a})`);
  gr.addColorStop(0.22, `rgba(255,255,255,${0.10 * a})`);
  gr.addColorStop(0.3, `rgba(255,255,255,${0.34 * a})`);
  gr.addColorStop(0.38, `rgba(255,255,255,${0.06 * a})`);
  gr.addColorStop(0.75, `rgba(30,16,8,${0.12 * a})`);
  gr.addColorStop(1, `rgba(30,16,8,${0.5 * a})`);
  g.fillStyle = gr; g.fill();
}
// объём шара: радиальный градиент со смещённым бликом
function ballShade(g, x, y, r, a = 1) {
  const gr = g.createRadialGradient(x - r * 0.38, y - r * 0.42, r * 0.05, x, y, r * 1.05);
  gr.addColorStop(0, `rgba(255,255,255,${0.55 * a})`);
  gr.addColorStop(0.25, `rgba(255,255,255,${0.12 * a})`);
  gr.addColorStop(0.7, `rgba(30,16,8,${0.08 * a})`);
  gr.addColorStop(1, `rgba(30,16,8,${0.45 * a})`);
  g.fillStyle = gr; g.fill();
}
// скруглённый прямоугольник
function rrect(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
// капсула (рука-деталь) от точки a под углом ang (0 — вниз), длина L, толщина w
function capsule(g, x, y, ang, L, w) {
  g.save(); g.translate(x, y); g.rotate(ang);
  rrect(g, -w / 2, -w / 2, w, L + w / 2, w / 2);
  g.restore();
}
