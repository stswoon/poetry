// ---------- Гуашь сухой кистью: палитра, фактуры, рваные края, мазки ----------
const mix = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
const css = (c, a = 1) => a >= 1 ? `rgb(${clamp(c[0], 0, 255) | 0},${clamp(c[1], 0, 255) | 0},${clamp(c[2], 0, 255) | 0})`
  : `rgba(${clamp(c[0], 0, 255) | 0},${clamp(c[1], 0, 255) | 0},${clamp(c[2], 0, 255) | 0},${clamp(a).toFixed(3)})`;
const reset = (g) => { g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = "source-over"; g.filter = "none"; };

// гуашь: белила, холодный снег, охра, умбра, киноварь, индиго
const C = {
  white: [250, 248, 240], snow: [232, 240, 246], snowS: [176, 200, 226], snowD: [128, 156, 196],
  sky: [168, 206, 232], skyL: [222, 236, 244], skyW: [250, 226, 196],
  ochre: [214, 156, 64], ochreL: [236, 196, 110], umber: [118, 76, 44], umberD: [72, 46, 30], umberL: [164, 116, 70],
  verm: [214, 58, 38], vermD: [158, 36, 28], vermL: [240, 118, 84],
  indigo: [44, 52, 104], indigoD: [26, 30, 64], violet: [96, 80, 140], pink: [236, 160, 150], rose: [226, 124, 120],
  pine: [44, 84, 70], pineD: [26, 54, 46], pineL: [76, 120, 96], birch: [236, 232, 222], birchD: [40, 36, 34],
  skin: [246, 196, 164], skinD: [222, 150, 120], cheek: [236, 120, 110],
  felt: [120, 118, 124], feltD: [82, 80, 88], fur: [150, 100, 60], furL: [210, 176, 130],
  blue: [52, 104, 170], blueL: [110, 160, 214], green: [56, 130, 86], greenL: [110, 172, 120], yel: [240, 196, 60],
  linen: [226, 214, 186], linenD: [184, 168, 136], amber: [255, 196, 96], amberL: [255, 232, 160], fire: [255, 150, 40],
  log: [150, 98, 58], logD: [104, 66, 38], stove: [236, 226, 208], stoveD: [196, 180, 160], ink: [30, 28, 40],
};

// ----- фактуры (рисуются один раз) -----
function makeCanvas(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
// сухая кисть: продольные штрихи (бесшовная плитка 512×512, альфа-маска)
// строка y получает свою «щетинку»: яркость меняется по y быстро, по x медленно и периодично
function brushTex(light, seed) {
  const N = 512, c = makeCanvas(N, N), x = c.getContext("2d");
  const im = x.createImageData(N, N);
  const row = new Float32Array(N), ph = new Float32Array(N), fr = new Float32Array(N);
  for (let y = 0; y < N; y++) {
    // щетинки группами: плавная огибающая + мелкий шум
    row[y] = hash(y * 1.31 + seed) * 0.6 + hash(Math.floor(y / 3) * 7.7 + seed) * 0.4;
    ph[y] = hash(y * 2.17 + seed * 3) * TAU; fr[y] = 1 + Math.floor(hash(y * 5.1 + seed) * 4);
  }
  for (let y = 0; y < N; y++) {
    for (let xx = 0; xx < N; xx++) {
      const along = 0.5 + 0.5 * Math.sin(xx / N * TAU * fr[y] + ph[y]);   // периодично по x
      let v = row[y] * (0.35 + 0.65 * along);
      v = light ? Math.max(0, v - 0.55) * 2.2 : Math.max(0, v - 0.5) * 2.0;
      const i = (y * N + xx) * 4;
      const col = light ? 255 : 24;
      im.data[i] = col; im.data[i + 1] = col; im.data[i + 2] = light ? 255 : 36; im.data[i + 3] = Math.min(255, v * 150);
    }
  }
  x.putImageData(im, 0, 0);
  return c;
}
// зерно бумаги
function paperTex() {
  const c = makeCanvas(256, 256), x = c.getContext("2d");
  const im = x.createImageData(256, 256);
  for (let i = 0; i < 256 * 256; i++) {
    const px = i % 256, py = (i / 256) | 0;
    const n = hash2(px, py) * 0.6 + hash2(px >> 2, py >> 2) * 0.4;
    const v = 128 + (n - 0.5) * 90;
    im.data[i * 4] = v; im.data[i * 4 + 1] = v; im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255;
  }
  x.putImageData(im, 0, 0);
  return c;
}
const _ctx0 = document.getElementById("scene").getContext("2d", { alpha: false });
const TEX_D = _ctx0.createPattern(brushTex(false, 1), "repeat");
const TEX_L = _ctx0.createPattern(brushTex(true, 2), "repeat");
const TEX_P = _ctx0.createPattern(paperTex(), "repeat");
const MAT = (a, s, ox, oy) => { const c = Math.cos(a) * s, sn = Math.sin(a) * s; return new DOMMatrix([c, sn, -sn, c, ox, oy]); };

// наложить фактуру сухой кисти на только что построенный путь (fill или stroke)
function texture(g, seed = 0, ang = 0, amt = 1, stroke = false, sc = 1) {
  const a0 = g.globalAlpha;
  TEX_D.setTransform(MAT(ang + (hash(seed) - 0.5) * 0.3, sc, hash(seed + 1) * 512, hash(seed + 2) * 512));
  TEX_L.setTransform(MAT(ang + (hash(seed + 3) - 0.5) * 0.3, sc, hash(seed + 4) * 512, hash(seed + 5) * 512));
  g.globalAlpha = a0 * clamp(0.55 * amt);
  if (stroke) { g.strokeStyle = TEX_D; g.stroke(); g.strokeStyle = TEX_L; g.stroke(); }
  else { g.fillStyle = TEX_D; g.fill(); g.fillStyle = TEX_L; g.fill(); }
  g.globalAlpha = a0;
}

// рваный контур: многоугольник с подразбиением и шумом по нормали
function roughPoly(g, pts, seed = 0, rough = 3, closed = true) {
  const n = pts.length, out = [];
  const m = closed ? n : n - 1;
  for (let i = 0; i < m; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const k = Math.max(1, Math.min(14, Math.round(len / 18)));
    const nx = -(b[1] - a[1]) / (len || 1), ny = (b[0] - a[0]) / (len || 1);
    for (let j = 0; j < k; j++) {
      const u = j / k, r = (hash(seed + i * 31.7 + j * 3.3) - 0.5) * 2 * rough;
      out.push([lerp(a[0], b[0], u) + nx * r, lerp(a[1], b[1], u) + ny * r]);
    }
  }
  if (!closed) out.push(pts[n - 1]);
  g.beginPath();
  out.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
  if (closed) g.closePath();
}
// эллипс с неровным краем мазка
function roughEll(g, cx, cy, rx, ry, seed = 0, rough = 0.05, rot = 0, N = 28) {
  g.beginPath();
  for (let i = 0; i <= N; i++) {
    const a = i / N * TAU, r = 1 + (hash(seed + (i % N) * 7.1) - 0.5) * 2 * rough;
    const x = Math.cos(a) * rx * r, y = Math.sin(a) * ry * r;
    const px = cx + x * Math.cos(rot) - y * Math.sin(rot), py = cy + x * Math.sin(rot) + y * Math.cos(rot);
    i ? g.lineTo(px, py) : g.moveTo(px, py);
  }
  g.closePath();
}
// залить текущий путь гуашью
function paint(g, col, seed = 0, ang = 0, amt = 1, a = 1, sc = 1) {
  const a0 = g.globalAlpha;
  g.globalAlpha = a0 * a; g.fillStyle = css(col); g.fill();
  texture(g, seed, ang, amt, false, sc);
  g.globalAlpha = a0;
}
// мазок кистью по ломаной: толщина w, круглые концы, фактура внутри
function brush(g, pts, w, col, seed = 0, amt = 0.8, a = 1) {
  if (pts.length < 2) return;
  const a0 = g.globalAlpha;
  g.beginPath();
  pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
  g.lineCap = "round"; g.lineJoin = "round"; g.lineWidth = w;
  g.globalAlpha = a0 * a; g.strokeStyle = css(col); g.stroke();
  const ang = Math.atan2(pts[pts.length - 1][1] - pts[0][1], pts[pts.length - 1][0] - pts[0][0]);
  texture(g, seed, ang, amt, true);
  g.globalAlpha = a0;
}
// мазок с сужением к концам (ветки, лыко, пряди): набор коротких отрезков
function taper(g, pts, w0, w1, col, seed = 0, a = 1) {
  const a0 = g.globalAlpha; g.globalAlpha = a0 * a;
  g.strokeStyle = css(col); g.lineCap = "round";
  for (let i = 0; i < pts.length - 1; i++) {
    g.lineWidth = lerp(w0, w1, i / Math.max(1, pts.length - 2));
    g.beginPath(); g.moveTo(pts[i][0], pts[i][1]); g.lineTo(pts[i + 1][0], pts[i + 1][1]); g.stroke();
  }
  g.globalAlpha = a0;
}
// небо: вертикальный градиент + широкие горизонтальные мазки
function skyFill(g, x, y, w, h, top, bot, seed = 0, amt = 0.6) {
  const gr = g.createLinearGradient(0, y, 0, y + h);
  gr.addColorStop(0, css(top)); gr.addColorStop(1, css(bot));
  g.fillStyle = gr; g.fillRect(x, y, w, h);
  g.beginPath(); g.rect(x, y, w, h);
  texture(g, seed, 0, amt, false, 2.2);
}
// бумага поверх всего кадра (экран): зерно multiply + лёгкая виньетка кисти
function paperOver(g, a = 0.16) {
  reset(g);
  g.globalCompositeOperation = "multiply"; g.globalAlpha = a;
  g.fillStyle = TEX_P; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
}
// снежинки-хлопья гуашью (детерминированно); wind — снос по x, speed — скорость падения, dens — сколько
function snowfall(g, t, n, wind, speed, size, a = 0.9, seed = 0, streak = 0) {
  g.save();
  for (let i = 0; i < n; i++) {
    const h1 = hash(i * 1.7 + seed), h2 = hash(i * 3.9 + seed), h3 = hash(i * 5.3 + seed);
    const z = 0.4 + h3 * 0.9;
    let y = (h2 * H * 1.2 + t * speed * z * 120) % (H * 1.2) - 60;
    let x = (h1 * W * 1.4 + t * wind * z * 120 + Math.sin(t * 1.3 + i) * 18) % (W * 1.4);
    if (x < 0) x += W * 1.4;
    x -= W * 0.2;
    const r = size * z * (0.6 + h1 * 0.8);
    g.globalAlpha = a * (0.5 + 0.5 * z);
    g.fillStyle = css(C.white);
    if (streak > 0) {
      g.strokeStyle = css(C.white); g.lineWidth = r * 1.2; g.lineCap = "round";
      g.beginPath(); g.moveTo(x, y); g.lineTo(x - wind * streak * z, y - speed * streak * z * 0.4); g.stroke();
    } else {
      g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    }
  }
  g.restore();
}
