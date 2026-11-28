// ---------- Запечённые акварельные куски (v2) ----------
let SPR = null;
const TEXW = 1024;
// повторяемая плитка земли: рисуем элементы с переносом через края, потом тройная ширина для выборки
function tileTex(fn, base) {
  const t = bake(TEXW, TEXW, (c) => {
    c.fillStyle = base; c.fillRect(0, 0, TEXW, TEXW);
    const wrap = (draw) => { for (const dx of [-TEXW, 0, TEXW]) for (const dy of [-TEXW, 0, TEXW]) { c.save(); c.translate(dx, dy); draw(c); c.restore(); } };
    fn(c, wrap);
  });
  return bake(TEXW * 3, TEXW, (c) => { for (let k = 0; k < 3; k++) c.drawImage(t, k * TEXW, 0); });
}
function skyCanvas(w, h, hz, stops, seed, clouds) {
  return bake(w, h, (c) => {
    wetSky(c, w, hz, stops, seed);
    c.fillStyle = stops[stops.length - 1][1]; c.fillRect(0, hz - 2, w, h - hz + 2);
    const r = rng(seed + 50);
    for (const [n, y0, y1, cols, sz] of clouds) for (let k = 0; k < n; k++) {
      const cx = r() * w, cy = lerp(y0, y1, r()), rx = sz * (0.6 + r() * 0.8);
      watercolor(c, blob(cx, cy, rx, rx * 0.22, 9), cols[k % cols.length], seed + k * 7 + n, { alpha: 0.06, layers: 14, vari: 0.8, gran: 0.25, edge: 0.15 });
    }
  });
}
function bakeTree(seed, kind) {
  // kind: 0 берёза (белый ствол, золото), 1 осина (оранжево-красная), 2 клён (багрянец)
  const w = 700, h = 1700, r = rng(seed);
  const trunkCol = kind === 0 ? "#efe9dc" : kind === 1 ? "#8d8f80" : "#5a4330";
  const bx = w / 2;
  const branches = [];
  const bare = bake(w, h, (c) => {
    const lean = (r() - 0.5) * 30;
    const trunk = [[bx - 24, h], [bx + 24, h], [bx + 12 + lean, 560], [bx - 8 + lean, 560]];
    watercolor(c, trunk, trunkCol, seed, { alpha: 0.12, layers: 12, vari: 0.15, gran: 0.3 });
    inkBrush(c, [[bx - 24, h], [bx - 16 + lean * 0.5, 1000], [bx - 8 + lean, 560]], 6, P.ink, seed, { tail: 0.4, dry: 0.5 });
    inkBrush(c, [[bx + 24, h], [bx + 18 + lean * 0.5, 1020], [bx + 12 + lean, 590]], 3.5, P.ink, seed + 1, { tail: 0.5, dry: 0.6 });
    if (kind === 0) for (let k = 0; k < 16; k++) { const y = 600 + r() * (h - 640); inkBrush(c, [[bx - 20 + lean * (1 - y / h), y], [bx + 2 + r() * 14 + lean * (1 - y / h), y + 3]], 5 + r() * 4, P.ink, seed + k + 9, { bleed: false }); }
    // ветви: развилки тушью вверх
    const grow = (x0, y0, a, len, wd, d) => {
      if (d > 3 || len < 30) return;
      const x1 = x0 + Math.cos(a) * len, y1 = y0 + Math.sin(a) * len;
      inkBrush(c, bez([x0, y0], [lerp(x0, x1, 0.3) + (r() - 0.5) * 20, lerp(y0, y1, 0.3)], [lerp(x0, x1, 0.7), lerp(y0, y1, 0.7) + (r() - 0.5) * 20], [x1, y1], 8), wd, P.ink, seed + d * 13 + (x1 | 0), { tail: 0.5, dry: 0.3, bleed: d < 2 });
      branches.push([x1, y1]);
      const n = 2 + (r() < 0.5 ? 1 : 0);
      for (let k = 0; k < n; k++) grow(x1, y1, a + (r() - 0.5) * 1.3, len * (0.6 + r() * 0.2), wd * 0.62, d + 1);
    };
    for (let k = 0; k < 6; k++) { const y = 560 + k * 80 + r() * 40, side = k % 2 ? 1 : -1; grow(bx + lean * (1 - y / h) + side * 6, y, -Math.PI / 2 + side * (0.5 + r() * 0.5), 150 + r() * 70, 7, 0); }
    grow(bx + lean, 570, -Math.PI / 2 + (r() - 0.5) * 0.3, 190, 9, 0);
  });
  const cols = kind === 0 ? ["#e8b93c", "#d99a2b", "#f0d070", "#c9a232"] : kind === 1 ? ["#e07a2c", "#c4482a", "#eba24a", "#b8562a"] : ["#b8302a", "#d2602a", "#8f2620", "#e08a3a"];
  const crown = bake(w, h, (c) => {
    // общая масса кроны, затем пятна у концов ветвей
    watercolor(c, blob(bx, 470, 250, 300, 12), cols[0], seed + 99, { alpha: 0.05, layers: 16, vari: 0.6, gran: 0.35 });
    for (let k = 0; k < 16; k++) { const [x, y] = branches[Math.floor(r() * branches.length)] || [bx, 400]; const rr = 80 + r() * 70; watercolor(c, blob(x, y, rr, rr * 0.75, 9, r() * 3), cols[k % cols.length], seed + 100 + k, { alpha: 0.07, layers: 14, vari: 0.7, gran: 0.35 }); }
    for (let k = 0; k < 5; k++) splatter(c, bx + (r() - 0.5) * 360, 300 + r() * 360, 170, 40, cols[k % 4], seed + 200 + k, 0.7);
    // мазки-листья тушью поверх
    for (let k = 0; k < 40; k++) { const [x, y] = branches[Math.floor(r() * branches.length)] || [bx, 300]; const px = x + (r() - 0.5) * 120, py = y + (r() - 0.5) * 90; c.save(); c.globalAlpha = 0.6; c.fillStyle = cols[k % 4]; c.translate(px, py); c.rotate(r() * 6); c.beginPath(); c.ellipse(0, 0, 9, 5, 0, 0, TAU); c.fill(); c.restore(); }
  });
  return { bare, crown };
}
function bakeBareTree(seed) {
  return bake(560, 1200, (c) => {
    const r = rng(seed), bx = 280;
    inkBrush(c, [[bx - 6, 1200], [bx + 4, 800], [bx - 4, 420]], 22, P.ink, seed, { tail: 0.3, head: 0.02 });
    const grow = (x0, y0, a, len, wd, d) => {
      if (d > 4 || len < 22) return;
      const x1 = x0 + Math.cos(a) * len, y1 = y0 + Math.sin(a) * len;
      inkBrush(c, bez([x0, y0], [lerp(x0, x1, 0.35) + (r() - 0.5) * 24, lerp(y0, y1, 0.35)], [lerp(x0, x1, 0.7), lerp(y0, y1, 0.7)], [x1, y1], 8), wd, P.ink, seed + d * 17 + (x1 | 0), { tail: 0.6, dry: 0.4, bleed: false });
      for (let k = 0; k < 2 + (r() < 0.4 ? 1 : 0); k++) grow(x1, y1, a + (r() - 0.5) * 1.2, len * 0.68, wd * 0.6, d + 1);
    };
    for (let k = 0; k < 4; k++) grow(bx, 600 - k * 50, -Math.PI / 2 + (k % 2 ? 1 : -1) * (0.4 + r() * 0.5), 190, 11, 0);
    grow(bx - 4, 420, -Math.PI / 2, 180, 12, 0);
  });
}
function bakeHaystack(seed) {
  return bake(560, 480, (c) => {
    const r = rng(seed);
    const dome = []; for (let k = 0; k <= 16; k++) { const a = Math.PI + (k / 16) * Math.PI; dome.push([280 + Math.cos(a) * 230, 440 + Math.sin(a) * 360 * (k > 3 && k < 13 ? 1 : 0.92)]); }
    watercolor(c, dome, "#d9a647", seed, { alpha: 0.1, layers: 18, vari: 0.12, gran: 0.4 });
    watercolor(c, [[90, 440], [470, 440], [440, 300], [120, 300]], "#a8742a", seed + 1, { alpha: 0.06, layers: 12, vari: 0.3, gran: 0.4, edge: 0 });
    // солома сухой кистью
    for (let k = 0; k < 70; k++) { const a = Math.PI * (1.05 + r() * 0.9), rr = 0.35 + r() * 0.6; const x = 280 + Math.cos(a) * 230 * rr, y = 440 + Math.sin(a) * 360 * rr; inkBrush(c, [[x, y], [x + (r() - 0.5) * 16, y + 40 + r() * 50]], 2.2, k % 3 ? "#8a5a1e" : "#5a3a14", seed + k, { bleed: false, alpha: 0.65, dry: 0.6 }); }
    inkBrush(c, dome.slice(0, 9), 6, P.ink, seed + 5, { tail: 0.2 }); inkBrush(c, dome.slice(8), 4, P.ink, seed + 6, { head: 0.1, tail: 0.5 });
    inkBrush(c, [[280, 90], [282, 30]], 7, P.ink, seed + 7, { head: 0.05 }); // жердь
  });
}
function bakeReeds(seed) {
  return bake(420, 620, (c) => {
    const r = rng(seed);
    for (let k = 0; k < 16; k++) {
      const x = 60 + r() * 300, hh = 300 + r() * 300, bend = (r() - 0.4) * 80;
      const pts = bez([x, 620], [x + 4, 620 - hh * 0.4], [x + bend * 0.5, 620 - hh * 0.75], [x + bend, 620 - hh], 10);
      inkBrush(c, pts, 4 + r() * 3, k % 3 ? "#6b5428" : P.ink, seed + k, { tail: 0.6, dry: 0.3, bleed: false });
      if (k % 3 === 0) { const [hx, hy] = pts[8]; watercolor(c, blob(hx, hy, 10, 34, 8), "#5a3518", seed + 50 + k, { alpha: 0.2, layers: 6, vari: 0.15, gran: 0.2, edge: 0.3 }); }
      if (k % 2) watercolor(c, [[x, 620], [x + bend * 0.4 + 40, 620 - hh * 0.5], [x + 10, 620 - hh * 0.3]], "#8b8a45", seed + 80 + k, { alpha: 0.08, layers: 8, vari: 0.3, gran: 0.3 });
    }
  });
}
function bakeCloud(seed, light, dark, w = 1000, h = 460) {
  return bake(w, h, (c) => {
    const r = rng(seed);
    for (let k = 0; k < 7; k++) { const rx = w * (0.13 + r() * 0.1); watercolor(c, blob(w * (0.25 + r() * 0.5), h * (0.4 + r() * 0.2), rx, rx * 0.62, 10), light, seed + k, { alpha: 0.08, layers: 14, vari: 0.6, gran: 0.25, edge: 0.12 }); }
    watercolor(c, blob(w * 0.5, h * 0.7, w * 0.36, h * 0.12, 10), dark, seed + 40, { alpha: 0.06, layers: 12, vari: 0.6, gran: 0.3 });
  });
}
function bakeLeaf(seed, col, kind) {
  return bake(120, 90, (c) => {
    c.translate(60, 45);
    const p = kind ? [[-44, 0], [-20, -26], [0, -34], [20, -22], [44, 0], [20, 20], [0, 30], [-20, 22]] : [[-46, 0], [-12, -24], [30, -16], [48, 0], [30, 16], [-12, 24]];
    watercolor(c, p, col, seed, { alpha: 0.16, layers: 8, vari: 0.12, gran: 0.25, edge: 0.4 });
    inkBrush(c, [[-50, 0], [44, 0]], 2.2, P.ink, seed, { bleed: false });
    for (let k = -1; k <= 1; k += 2) inkBrush(c, [[-6, 0], [14, k * 16]], 1.4, P.ink, seed + k, { bleed: false });
  });
}
function bakeNovember() {
  // Ноябрь: высокий старик в длинном сером кафтане, шапка, седая борода инеем, обеими руками держит посох перед собой
  return bake(420, 860, (c) => {
    const ink = "#24303a";
    // кафтан до пят
    const coat = [[150, 230], [270, 230], [320, 760], [100, 760]];
    const solid = (pts, col) => { c.fillStyle = col; poly(c, pts); c.fill(); };
    solid(coat, "#8a97a3"); solid([[150, 260], [120, 420], [180, 470], [205, 430], [180, 300]], "#7e8b97"); solid([[270, 260], [300, 420], [245, 470], [220, 430], [245, 300]], "#7e8b97");
    solid([[160, 200], [260, 200], [250, 260], [216, 360], [204, 360], [170, 260]], "#eef2f4"); solid([[160, 135], [260, 135], [250, 70], [210, 52], [170, 70]], "#5d6a76");
    c.fillStyle = "#e6d2ba"; c.beginPath(); c.ellipse(210, 175, 48, 54, 0, 0, TAU); c.fill();
    for (const [x, d] of [[160, -1], [255, 1]]) solid([[x - 28, 760], [x + 24, 760], [x + 24 + d * 14, 812], [x - 30 + d * 8, 812]], "#4a433c");
    watercolor(c, coat, "#7d8c99", 900, { alpha: 0.13, layers: 16, vari: 0.12, gran: 0.4 });
    watercolor(c, [[205, 240], [225, 240], [230, 760], [200, 760]], "#5d6b78", 901, { alpha: 0.12, layers: 8, vari: 0.1, gran: 0.3, edge: 0 });
    inkBrush(c, [[150, 232], [120, 500], [100, 760]], 5, ink, 902, { tail: 0.2 }); inkBrush(c, [[270, 232], [300, 500], [320, 760]], 5, ink, 903, { tail: 0.2 });
    inkBrush(c, [[100, 760], [210, 772], [320, 760]], 4, ink, 904, {});
    // сапоги — две ступни из-под полы
    for (const [x, d] of [[160, -1], [255, 1]]) { watercolor(c, [[x - 28, 760], [x + 24, 760], [x + 24 + d * 14, 812], [x - 30 + d * 8, 812]], "#3c3630", 905 + x, { alpha: 0.25, layers: 8, vari: 0.1, gran: 0.2 }); inkBrush(c, [[x - 30, 812], [x + 26 + d * 14, 812]], 5, ink, 906 + x, { head: 0.05, tail: 0.1 }); }
    // рукава к посоху: обе руки перед грудью
    watercolor(c, [[150, 260], [120, 420], [180, 470], [205, 430], [180, 300]], "#6d7c89", 907, { alpha: 0.14, layers: 10, vari: 0.12, gran: 0.3 });
    watercolor(c, [[270, 260], [300, 420], [245, 470], [220, 430], [245, 300]], "#6d7c89", 908, { alpha: 0.14, layers: 10, vari: 0.12, gran: 0.3 });
    inkBrush(c, [[150, 262], [120, 420], [180, 470]], 3.5, ink, 909, {}); inkBrush(c, [[270, 262], [300, 420], [245, 470]], 3.5, ink, 910, {});
    // посох
    inkBrush(c, [[212, 120], [214, 470], [216, 812]], 10, "#4a3824", 911, { head: 0.02, tail: 0.05 });
    // кисти рук на посохе (две)
    for (const [x, y] of [[196, 450], [232, 466]]) { watercolor(c, blob(x, y, 20, 16, 8), "#d9c2a8", 912 + x, { alpha: 0.3, layers: 8, vari: 0.1, gran: 0.2, edge: 0.4 }); inkBrush(c, [[x - 18, y - 4], [x, y - 14], [x + 18, y - 2]], 2.6, ink, 913 + x, {}); }
    // голова: лицо, брови-иней, глаза, нос
    watercolor(c, blob(210, 175, 50, 56, 10), "#e2cdb4", 914, { alpha: 0.2, layers: 10, vari: 0.08, gran: 0.2 });
    inkBrush(c, [[176, 160], [192, 152], [204, 158]], 5, "#f4f8fa", 915, { bleed: false }); inkBrush(c, [[244, 160], [228, 152], [216, 158]], 5, "#f4f8fa", 916, { bleed: false });
    inkBrush(c, [[176, 158], [192, 150], [204, 156]], 2.4, ink, 917, { bleed: false }); inkBrush(c, [[244, 158], [228, 150], [216, 156]], 2.4, ink, 918, { bleed: false });
    c.fillStyle = ink; c.beginPath(); c.arc(193, 172, 4.5, 0, TAU); c.arc(227, 172, 4.5, 0, TAU); c.fill();
    inkBrush(c, [[210, 172], [214, 196], [206, 200]], 2.4, ink, 919, { bleed: false });
    // борода инеем: белая с голубым, длинная, клином вниз
    watercolor(c, [[160, 200], [260, 200], [250, 260], [216, 360], [204, 360], [170, 260]], "#f2f6f8", 920, { alpha: 0.35, layers: 12, vari: 0.15, gran: 0.15, edge: 0.5 });
    watercolor(c, [[175, 210], [245, 210], [232, 280], [210, 350], [190, 280]], "#b9cfdc", 921, { alpha: 0.08, layers: 8, vari: 0.2, gran: 0.2, edge: 0 });
    for (let k = 0; k < 7; k++) inkBrush(c, [[176 + k * 11, 214], [190 + k * 5, 300 + (k % 3) * 14]], 1.3, "#7f98a8", 922 + k, { bleed: false });
    inkBrush(c, [[160, 200], [180, 270], [210, 362], [240, 270], [260, 200]], 2.4, ink, 930, {});
    // шапка с меховой оторочкой
    watercolor(c, [[160, 135], [260, 135], [250, 70], [210, 52], [170, 70]], "#55626e", 931, { alpha: 0.2, layers: 10, vari: 0.1, gran: 0.3 });
    watercolor(c, blob(210, 138, 58, 14, 10), "#e9edef", 932, { alpha: 0.3, layers: 8, vari: 0.15, gran: 0.2, edge: 0.4 });
    inkBrush(c, [[158, 140], [170, 68], [210, 50], [250, 68], [262, 140]], 3, ink, 933, {});
    // иней на плечах
    splatter(c, 160, 240, 40, 30, "#f6f9fb", 934, 0.9); splatter(c, 262, 240, 40, 30, "#f6f9fb", 935, 0.9);
  });
}
function bakeDoor(seed) {
  return bake(210, 380, (c) => {
    const r = rng(seed);
    c.fillStyle = "#6f4c2e"; c.fillRect(4, 6, 202, 368);
    for (let k = 0; k < 5; k++) { watercolor(c, rect(4 + k * 41, 6, 44 + k * 41, 374), k % 2 ? "#8a6240" : "#7a5434", seed + k, { alpha: 0.16, layers: 8, vari: 0.04, gran: 0.4, edge: 0.3 }); inkBrush(c, [[4 + k * 41, 6], [6 + k * 41, 374]], 2, P.ink, seed + 10 + k, { bleed: false, dry: 0.5 }); }
    for (const y of [60, 310]) { watercolor(c, rect(0, y - 14, 210, y + 14), "#5e4128", seed + y, { alpha: 0.2, layers: 6, vari: 0.04, gran: 0.3 }); inkBrush(c, [[0, y - 14], [210, y - 14]], 2.5, P.ink, seed + y + 1, { bleed: false }); }
    inkBrush(c, [[10, 300], [200, 70]], 9, "#5e4128", seed + 99, { bleed: false });
    inkBrush(c, [[4, 4], [206, 4], [206, 376], [4, 376], [4, 4]], 3.2, P.ink, seed + 98, { head: 0.02, tail: 0.02 });
    for (let k = 0; k < 20; k++) splatter(c, r() * 210, r() * 380, 4, 2, "#3a2614", seed + 200 + k, 0.5);
  });
}
function bakeVillage() {
  return bake(W + 200, H + 120, (c, w, h) => {
    const hz = 650;
    wetSky(c, w, hz, [[0, "#6f7b88"], [0.55, "#98a3ad"], [1, "#c9c3b2"]], 600);
    const r = rng(601);
    for (let k = 0; k < 7; k++) watercolor(c, blob(r() * w, 120 + r() * 300, 260 + r() * 200, 60, 9), k % 2 ? "#6a7582" : "#57626e", 610 + k, { alpha: 0.06, layers: 14, vari: 0.8, gran: 0.25 });
    // дальний лес и холм
    watercolor(c, [[0, 640], [300, 590], [700, 610], [1100, 570], [1500, 600], [w, 585], [w, 700], [0, 700]], "#5d5446", 620, { alpha: 0.08, layers: 16, vari: 0.25, gran: 0.4 });
    // поле перед деревней (тёмная охра) и дорога к воротам
    c.fillStyle = "#a39066"; c.fillRect(0, 680, w, h - 680);
    watercolor(c, [[0, 690], [w, 680], [w, h], [0, h]], "#8b7a55", 621, { alpha: 0.05, layers: 14, vari: 0.3, gran: 0.4 });
    watercolor(c, [[1010, 935], [1110, 935], [1400, h], [720, h]], "#b8a582", 622, { alpha: 0.08, layers: 12, vari: 0.15, gran: 0.4 });
    // избы: брёвна, крыша, окно светится
    const hut = (x, y, s, seed) => {
      watercolor(c, [[x - 140 * s, y], [x + 140 * s, y], [x + 140 * s, y - 160 * s], [x - 140 * s, y - 160 * s]], "#8a5a32", seed, { alpha: 0.12, layers: 14, vari: 0.05, gran: 0.4 });
      for (let k = 0; k < 7; k++) { inkBrush(c, [[x - 145 * s, y - 23 * s * k], [x + 145 * s, y - 23 * s * k + 2]], 2.6, P.ink, seed + k, { bleed: false, dry: 0.5 }); c.fillStyle = "#6a4022"; for (const d of [-1, 1]) { c.beginPath(); c.arc(x + d * 145 * s, y - 23 * s * k - 11 * s, 10 * s, 0, TAU); c.fill(); } }
      const roof = [[x - 175 * s, y - 150 * s], [x, y - 290 * s], [x + 175 * s, y - 150 * s]];
      watercolor(c, roof, "#5e4a34", seed + 1, { alpha: 0.13, layers: 14, vari: 0.06, gran: 0.4 });
      inkBrush(c, roof, 5, P.ink, seed + 2, { head: 0.05, tail: 0.1 });
      for (let k = 0; k < 10; k++) inkBrush(c, [[x - 150 * s + k * 30 * s, y - 155 * s + Math.abs(k - 5) * 0], [lerp(x - 150 * s + k * 30 * s, x, 0.55), lerp(y - 155 * s, y - 280 * s, 0.55)]], 1.2, "#3a2a1a", seed + 30 + k, { bleed: false, alpha: 0.5 });
      watercolor(c, rect(x - 42 * s, y - 115 * s, x + 42 * s, y - 55 * s), "#f2c45a", seed + 3, { alpha: 0.2, layers: 10, vari: 0.03, gran: 0.2, edge: 0.4 });
      inkBrush(c, [[x - 46 * s, y - 118 * s], [x + 46 * s, y - 118 * s], [x + 46 * s, y - 52 * s], [x - 46 * s, y - 52 * s], [x - 46 * s, y - 118 * s]], 3.4, P.ink, seed + 4, { head: 0.02, tail: 0.02 });
      inkBrush(c, [[x, y - 118 * s], [x, y - 52 * s]], 2.4, P.ink, seed + 5, { bleed: false });
      // труба
      watercolor(c, rect(x + 70 * s, y - 250 * s, x + 100 * s, y - 200 * s), "#7a4a30", seed + 6, { alpha: 0.2, layers: 6, vari: 0.04, gran: 0.3 });
      inkBrush(c, [[x + 70 * s, y - 200 * s], [x + 70 * s, y - 252 * s], [x + 100 * s, y - 252 * s], [x + 100 * s, y - 222 * s]], 2.6, P.ink, seed + 7, {});
    };
    hut(330, 720, 0.95, 640); hut(1690, 728, 1.05, 650);
    for (const [x, y, sc, sd] of [[110, 820, 0.62, 660], [1890, 830, 0.6, 661], [610, 700, 0.36, 662], [1420, 700, 0.34, 663]]) { const t = bakeBareTree(sd); c.drawImage(t, x - 280 * sc, y - 1200 * sc, 560 * sc, 1200 * sc); }
    // забор с проёмом под ворота
    for (let x = -10; x < w; x += 36) {
      if (x > 800 && x < 1190) continue;
      const hh = 130 + 14 * hash(x);
      watercolor(c, [[x, 920], [x + 28, 920], [x + 28, 920 - hh], [x + 14, 906 - hh], [x, 920 - hh]], x % 72 ? "#7a5a3a" : "#6a4c30", 700 + x, { alpha: 0.2, layers: 6, vari: 0.04, gran: 0.4, edge: 0.3 });
      inkBrush(c, [[x, 920], [x, 920 - hh], [x + 14, 906 - hh], [x + 28, 920 - hh]], 2.2, P.ink, 701 + x, { bleed: false, dry: 0.4 });
    }
    inkBrush(c, [[-10, 860], [800, 862]], 4, P.ink, 710, {}); inkBrush(c, [[1190, 862], [w, 860]], 4, P.ink, 711, {});
    // столбы ворот и навес
    for (const px of [800, 1190]) { watercolor(c, rect(px - 24, 560, px + 24, 950), "#5e4128", 720 + px, { alpha: 0.2, layers: 10, vari: 0.03, gran: 0.4 }); inkBrush(c, [[px - 24, 952], [px - 24, 560]], 4, P.ink, 721 + px, {}); inkBrush(c, [[px + 24, 952], [px + 24, 560]], 3, P.ink, 722 + px, {}); }
    const roof = [[760, 560], [995, 505], [1230, 560], [1230, 585], [760, 585]];
    watercolor(c, roof, "#5e4a34", 730, { alpha: 0.18, layers: 12, vari: 0.05, gran: 0.4 });
    inkBrush(c, [[750, 562], [995, 503], [1240, 562]], 6, P.ink, 731, {});
  });
}
function bakeFinal() {
  return bake(W, H, (c, w, h) => {
    const hz = 820;
    wetSky(c, w, hz, [[0, "#3f5168"], [0.45, "#9a8a78"], [0.8, "#e09a5e"], [1, "#f2c27a"]], 800);
    const r = rng(801);
    for (let k = 0; k < 8; k++) watercolor(c, blob(r() * w, 140 + r() * 420, 280 + r() * 220, 34 + r() * 20, 9), k % 2 ? "#6f7480" : "#c98a6a", 810 + k, { alpha: 0.06, layers: 14, vari: 0.8, gran: 0.25 });
    watercolor(c, blob(1560, 800, 150, 150, 14), "#f6c25a", 820, { alpha: 0.1, layers: 16, vari: 0.04, gran: 0.2, edge: 0.3 });
    watercolor(c, blob(1560, 800, 230, 230, 14), "#f0a050", 821, { alpha: 0.03, layers: 12, vari: 0.08, gran: 0.1, edge: 0 });
    // озеро с отражением заката и тёмный берег
    c.fillStyle = "#c98a6a"; c.fillRect(0, hz, w, h - hz);
    watercolor(c, [[0, hz], [w, hz], [w, h], [0, h]], "#6a7480", 822, { alpha: 0.05, layers: 14, vari: 0.3, gran: 0.4 });
    watercolor(c, [[1400, hz + 5], [1720, hz + 5], [1660, h], [1460, h]], "#f2b860", 823, { alpha: 0.06, layers: 12, vari: 0.4, gran: 0.3, edge: 0 });
    for (let k = 0; k < 30; k++) { const y = hz + 20 + r() * (h - hz - 20), x = r() * w; inkBrush(c, [[x, y], [x + 60 + r() * 140, y + 1]], 2, "rgba(255,230,190,0.8)", 830 + k, { bleed: false }); }
    watercolor(c, [[0, hz + 2], [300, hz - 26], [620, hz - 14], [860, hz + 2]], "#5d5a52", 824, { alpha: 0.1, layers: 14, vari: 0.12, gran: 0.4 });
    watercolor(c, [[w, hz + 2], [w - 260, hz - 20], [w - 520, hz + 2]], "#5d5a52", 825, { alpha: 0.1, layers: 14, vari: 0.12, gran: 0.4 });
    for (const [x, sd, sc] of [[60, 840, 0.8], [1860, 841, 0.7]]) { const rd = bakeReeds(sd); c.drawImage(rd, x - 210 * sc, h - 620 * sc + 20, 420 * sc, 620 * sc); }
  });
}
function bakeMask() {
  // маска перехода: пятно, растекающееся по мокрой бумаге (почти непрозрачно внутри, рваный мягкий край) + тёмная кайма
  const N = 1200;
  const r = rng(990), base = deform(blob(N / 2, N / 2, 420, 400, 12), 3, 0.5, r);
  const mask = bake(N, N, (c) => { c.fillStyle = "#000"; for (let L = 0; L < 14; L++) { c.globalAlpha = 0.28; poly(c, deform(base, 2, 0.25, r)); c.fill(); } });
  const rim = bake(N, N, (c) => { c.strokeStyle = "#6b4a2a"; c.lineJoin = "round"; for (let L = 0; L < 5; L++) { c.globalAlpha = 0.22; c.lineWidth = 6 + L * 3; c.filter = `blur(${1 + L}px)`; poly(c, deform(base, 2, 0.15, r)); c.stroke(); } c.filter = "none"; });
  return { mask, rim };
}
function bakeSprites() {
  PAPER = PAPER || bakePaper(); GRAIN = GRAIN || bakeGrain();
  const s = {};
  // небо
  s.skyPond = skyCanvas(2600, 2300, 1700, [[0, "#5d7896"], [0.45, "#93a9bb"], [0.82, "#c9cfc9"], [1, "#e8d6a6"]], 1, [[6, 1100, 1550, ["#8a93a0", "#7a8492"], 340], [5, 300, 900, ["#b4bfc8", "#a3afba"], 300]]);
  s.skySun = skyCanvas(2600, 1500, 1100, [[0, "#6f7f9c"], [0.5, "#d39a80"], [0.85, "#f0bf74"], [1, "#f6d79a"]], 2, [[7, 500, 1000, ["#c98a86", "#a7809a"], 300]]);
  s.skyDusk = skyCanvas(2600, 1500, 1100, [[0, "#3b4a5e"], [0.5, "#8a8578"], [0.85, "#d4955e"], [1, "#e9ad6a"]], 3, [[6, 450, 1000, ["#5f6a76", "#8a7a6a"], 320]]);
  s.skyForest = skyCanvas(2600, 1500, 1100, [[0, "#c98a3e"], [0.6, "#e9b961"], [1, "#f6dc9a"]], 4, [[10, 600, 1080, ["#e0a04a", "#f2cf7c"], 260]]);
  // дальние полосы у горизонта
  s.farPond = bake(3200, 260, (c, w, h) => {
    const r = rng(20);
    watercolor(c, [[0, 160], [500, 110], [1000, 140], [1600, 95], [2200, 135], [2700, 105], [w, 140], [w, h], [0, h]], "#6f7a5c", 21, { alpha: 0.08, layers: 14, vari: 0.25, gran: 0.4 });
    for (let k = 0; k < 60; k++) { const x = r() * w, rr = 24 + r() * 30; watercolor(c, blob(x, 150 - r() * 30, rr, rr * 1.2, 8), ["#d49a3a", "#b8562a", "#8b8a45", "#e0b050"][k % 4], 22 + k, { alpha: 0.1, layers: 8, vari: 0.3, gran: 0.3 }); }
    c.fillStyle = "#b89458"; c.fillRect(0, 205, w, 30); watercolor(c, [[0, 200], [w, 200], [w, 240], [0, 240]], "#9a7a40", 23, { alpha: 0.08, layers: 10, vari: 0.2, gran: 0.4 });
    const gr = c.createLinearGradient(0, 228, 0, h); gr.addColorStop(0, "rgba(143,166,176,0)"); gr.addColorStop(1, "rgba(143,166,176,1)"); c.fillStyle = gr; c.fillRect(0, 228, w, h - 228);
  });
  s.farField = bake(3200, 240, (c, w, h) => {
    const r = rng(30);
    watercolor(c, [[0, 140], [600, 110], [1200, 135], [1900, 100], [2600, 130], [w, 115], [w, h], [0, h]], "#7d6a7a", 31, { alpha: 0.07, layers: 14, vari: 0.25, gran: 0.4 });
    for (let k = 0; k < 70; k++) { const x = r() * w, rr = 18 + r() * 26; watercolor(c, blob(x, 165 - r() * 25, rr, rr * 1.3, 8), ["#7a5a3a", "#9a6a3a", "#6a6a40"][k % 3], 32 + k, { alpha: 0.1, layers: 7, vari: 0.3, gran: 0.3 }); }
    const gr = c.createLinearGradient(0, 180, 0, h); gr.addColorStop(0, "rgba(201,164,90,0)"); gr.addColorStop(1, "rgba(201,164,90,1)"); c.fillStyle = gr; c.fillRect(0, 180, w, h - 180);
  });
  s.farDusk = bake(3200, 240, (c, w, h) => {
    watercolor(c, [[0, 150], [700, 120], [1400, 145], [2100, 110], [w, 140], [w, h], [0, h]], "#4a5052", 40, { alpha: 0.09, layers: 14, vari: 0.25, gran: 0.4 });
    const gr = c.createLinearGradient(0, 170, 0, h); gr.addColorStop(0, "rgba(98,94,92,0)"); gr.addColorStop(1, "rgba(98,94,92,1)"); c.fillStyle = gr; c.fillRect(0, 170, w, h - 170);
  });
  s.farForest = bake(3200, 300, (c, w, h) => {
    const r = rng(45);
    for (let k = 0; k < 50; k++) { const x = r() * w; watercolor(c, rect(x, 40 + r() * 60, x + 14 + r() * 10, h), k % 2 ? "#c99a5a" : "#b07a40", 46 + k, { alpha: 0.08, layers: 6, vari: 0.1, gran: 0.3, edge: 0 }); }
    const gr = c.createLinearGradient(0, 200, 0, h); gr.addColorStop(0, "rgba(168,98,46,0)"); gr.addColorStop(1, "rgba(168,98,46,1)"); c.fillStyle = gr; c.fillRect(0, 200, w, h - 200);
  });
  s.farAir = bake(3200, 520, (c, w, h) => {
    // земля далеко внизу под небольшим углом: лоскуты полей сжаты в полосы, чем ближе — тем крупнее
    const r = rng(50);
    const gr0 = c.createLinearGradient(0, 0, 0, h); gr0.addColorStop(0, "#b8907a"); gr0.addColorStop(1, "#7f7056"); c.fillStyle = gr0; c.fillRect(0, 0, w, h);
    for (let k = 0; k < 80; k++) { const y = Math.pow(r(), 0.7) * h, sc = 0.3 + y / h, x = r() * w; watercolor(c, blob(x, y, (140 + r() * 220) * sc, (6 + r() * 10) * sc * 2, 8), ["#b8944e", "#8a8448", "#a86a3a", "#6e6a4a", "#c9a85a"][k % 5], 51 + k, { alpha: 0.07, layers: 8, vari: 0.4, gran: 0.4, edge: 0.1 }); }
    for (let k = 0; k < 30; k++) { const y = 40 + Math.pow(r(), 0.8) * (h - 40), x = r() * w, sc = 0.3 + y / h; watercolor(c, blob(x, y, 40 * sc, 10 * sc, 8), "#7a7448", 140 + k, { alpha: 0.06, layers: 6, vari: 0.3, gran: 0.3 }); }
    inkBrush(c, bez([0, 220], [900, 180], [1800, 330], [w, 230], 40), 9, "#9fb2be", 52, { bleed: true, alpha: 0.7 });
    const gr = c.createLinearGradient(0, 0, 0, 220); gr.addColorStop(0, "rgba(222,160,122,1)"); gr.addColorStop(1, "rgba(222,160,122,0)"); c.fillStyle = gr; c.fillRect(0, 0, w, 220);
  });
  // земля
  s.texWater = tileTex((c, wrap) => {
    const r = rng(60);
    for (let k = 0; k < 18; k++) { const x = r() * TEXW, y = r() * TEXW, col = ["#7d97a3", "#a9bcc2", "#8aa0a8"][k % 3]; wrap((cc) => watercolor(cc, blob(x, y, 160 + r() * 120, 60 + r() * 40, 8), col, 61 + k, { alpha: 0.05, layers: 10, vari: 0.6, gran: 0.3 })); }
    for (let k = 0; k < 90; k++) { const x = r() * TEXW, y = r() * TEXW, l = 40 + r() * 120, col = k % 3 ? "rgba(255,255,255,0.75)" : "#5f7a88"; wrap((cc) => inkBrush(cc, [[x, y], [x + l * 0.5, y - 4], [x + l, y]], 3 + r() * 3, col, 70 + k, { bleed: false, dry: 0.4 })); }
  }, "#8fa6b0");
  s.texField = tileTex((c, wrap) => {
    const r = rng(80);
    for (let k = 0; k < 16; k++) { const x = r() * TEXW, y = r() * TEXW, col = ["#b8904a", "#d9b25e", "#a88a40", "#c79a4a"][k % 4]; wrap((cc) => watercolor(cc, blob(x, y, 200 + r() * 160, 120 + r() * 100, 8), col, 81 + k, { alpha: 0.05, layers: 10, vari: 0.6, gran: 0.4 })); }
    for (let k = 0; k < 26; k++) { const x = k * (TEXW / 26) + r() * 8; wrap((cc) => inkBrush(cc, [[x, -20], [x + 6, TEXW / 2], [x - 4, TEXW + 20]], 3 + r() * 2, "rgba(110,76,34,0.75)", 90 + k, { bleed: false, dry: 0.7, head: 0.01, tail: 0.01 })); }
    for (let k = 0; k < 260; k++) { const x = r() * TEXW, y = r() * TEXW; wrap((cc) => inkBrush(cc, [[x, y], [x + (r() - 0.5) * 6, y - 10 - r() * 14]], 1.6, k % 2 ? "#7a5422" : "#e8c070", 200 + k, { bleed: false })); }
  }, "#c9a45a");
  s.texForest = tileTex((c, wrap) => {
    const r = rng(100);
    for (let k = 0; k < 14; k++) { const x = r() * TEXW, y = r() * TEXW, col = ["#a8622e", "#8a4a24", "#c47a34", "#7a6a3a"][k % 4]; wrap((cc) => watercolor(cc, blob(x, y, 180 + r() * 140, 120 + r() * 80, 8), col, 101 + k, { alpha: 0.05, layers: 10, vari: 0.6, gran: 0.4 })); }
    for (let k = 0; k < 220; k++) { const x = r() * TEXW, y = r() * TEXW, col = ["#e0a040", "#c4482a", "#e8c060", "#8f2620"][k % 4], a = r() * 6; wrap((cc) => { cc.save(); cc.globalAlpha = 0.75; cc.fillStyle = col; cc.translate(x, y); cc.rotate(a); cc.beginPath(); cc.ellipse(0, 0, 10, 5, 0, 0, TAU); cc.fill(); cc.restore(); }); }
  }, "#9a5a2c");
  s.texDusk = tileTex((c, wrap) => {
    const r = rng(120);
    for (let k = 0; k < 14; k++) { const x = r() * TEXW, y = r() * TEXW, col = ["#6a6650", "#5a5560", "#7a6a50"][k % 3]; wrap((cc) => watercolor(cc, blob(x, y, 200 + r() * 140, 120 + r() * 90, 8), col, 121 + k, { alpha: 0.05, layers: 10, vari: 0.6, gran: 0.4 })); }
    for (let k = 0; k < 26; k++) { const x = k * (TEXW / 26) + r() * 8; wrap((cc) => inkBrush(cc, [[x, -20], [x + 6, TEXW / 2], [x - 4, TEXW + 20]], 2, "rgba(40,36,44,0.28)", 130 + k, { bleed: false, dry: 0.7, head: 0.01, tail: 0.01 })); }
  }, "#625e5c");
  // предметы
  s.trees = [bakeTree(300, 0), bakeTree(310, 1), bakeTree(320, 2), bakeTree(330, 0), bakeTree(340, 1)];
  s.bare = [bakeBareTree(350), bakeBareTree(360)];
  s.stack = [bakeHaystack(400), bakeHaystack(410)];
  s.reeds = [bakeReeds(420), bakeReeds(430)];
  s.clouds = [bakeCloud(440, "#c3c9cf", "#8a95a2"), bakeCloud(450, "#aab3bd", "#6e7a88"), bakeCloud(460, "#e4e2dc", "#a9b0b8")];
  s.dark = [bakeCloud(470, "#6b7684", "#4b5664"), bakeCloud(480, "#5f6a78", "#424c58")];
  s.cloudsDusk = [bakeCloud(490, "#9aa4ae", "#5f6a76"), bakeCloud(500, "#d3a98a", "#8a6f5a")];
  s.faceCloud = bakeCloud(510, "#9aa4b0", "#6e7988", 1300, 620);
  s.sun = bake(420, 420, (c) => { watercolor(c, blob(210, 210, 120, 120, 14), "#f5c04a", 520, { alpha: 0.12, layers: 16, vari: 0.04, gran: 0.2, edge: 0.35 }); watercolor(c, blob(210, 210, 175, 175, 14), "#f2a050", 521, { alpha: 0.025, layers: 12, vari: 0.08, gran: 0.1, edge: 0 }); });
  s.fog = [0, 1].map((k) => bake(2600, 520, (c, w, h) => { const r = rng(530 + k); for (let j = 0; j < 9; j++) watercolor(c, blob(400 + j * 225 + r() * 40, 260, 190 + r() * 80, 70, 10), "#f3efe6", 531 + j + k * 20, { alpha: 0.07, layers: 14, vari: 0.6, gran: 0.15, edge: 0.05 }); }));
  s.palm = [0, 1].map((k) => bake(360, 560, (c) => {
    const r = rng(540 + k), col = "#5a3a2a";
    inkBrush(c, bez([180, 560], [190 + k * 10, 420], [160, 260], [196 + k * 20, 150], 14), 22, col, 541 + k, { bleed: false, head: 0.02 });
    for (let j = 0; j < 7; j++) { const a = -Math.PI / 2 + (j - 3) * 0.55, l = 120 + r() * 40; const ex = 196 + k * 20 + Math.cos(a) * l * 1.3, ey = 150 + Math.sin(a) * l * 0.6 + 40; inkBrush(c, bez([196 + k * 20, 150], [196 + k * 20 + Math.cos(a) * l * 0.5, 150 + Math.sin(a) * l * 0.5 - 10], [ex - Math.cos(a) * 20, ey - 30], [ex, ey + 20], 12), 18, col, 550 + j + k * 10, { bleed: false, tail: 0.7 }); }
  }));
  const LC = ["#e0a040", "#c4482a", "#e8c060", "#8f2620", "#d2702a", "#b8a03a"];
  s.leaves = LC.map((col, k) => bakeLeaf(560 + k, col, k % 2));
  s.november = bakeNovember();
  s.doorL = bakeDoor(600); s.doorR = bakeDoor(610);
  s.village = bakeVillage();
  s.final = bakeFinal();
  s.titleWash = bake(1800, 420, (c) => { watercolor(c, blob(900, 210, 780, 140, 12), "#ecc26a", 620, { alpha: 0.05, layers: 16, vari: 0.5, gran: 0.3 }); watercolor(c, blob(1100, 230, 480, 90, 10), "#b8502a", 621, { alpha: 0.03, layers: 12, vari: 0.6, gran: 0.3 }); });
  const m = bakeMask(); s.mask = m.mask; s.rim = m.rim;
  return s;
}
