// ---------- Разворот 1: «Осень наступила, высохли цветы, и глядят уныло голые кусты» ----------
// Координаты — внутри левой страницы (0..PW, 0..PH).

// Ветка куста: главная и три боковые
const TWIG = [
  { pts: [[66, 892], [210, 814], [370, 754], [540, 714], [702, 694]], w: 9 },
  { pts: [[210, 814], [272, 724], [296, 652]], w: 5 },
  { pts: [[370, 754], [446, 670], [498, 612]], w: 5 },
  { pts: [[540, 714], [622, 652], [664, 610]], w: 4 },
];
const TWIG_LEAVES = [];
{
  const r = mulberry32(51);
  const at = [[150, 846, -0.95], [262, 742, -0.45], [296, 652, 0.1], [318, 776, 0.95], [420, 700, -0.55], [498, 612, 0.25],
    [470, 738, 1.1], [600, 670, -0.35], [664, 610, 0.45], [640, 704, 1.3], [702, 694, 1.65]];
  at.forEach(([x, y, a], i) => TWIG_LEAVES.push({ x, y, a, len: 50 + r() * 16, col: mixc(K.yellow, K.orange, r() * 0.7), edge: r() > 0.5 ? K.rust : null,
    floor: 856 + (i % 3) * 16 + r() * 8, spin: (r() - 0.5) * 5, sway: 30 + r() * 30, tf: EV.gol - 0.12 + i * 0.085 }));
}
const FLOWERS = [
  { k: "ch", x: 590, y: 212, r: 60, stem: [[590, 212], [610, 400], [624, 560], [632, 650]], i: 0 },
  { k: "co", x: 706, y: 332, r: 46, stem: [[706, 332], [690, 470], [662, 600], [646, 650]], i: 1 },
  { k: "ch", x: 498, y: 396, r: 44, stem: [[498, 396], [560, 500], [610, 600], [624, 650]], i: 2 },
];
const G = 760; // ускорение падения листьев, px/с²

function twigLeaf(c, q, t, droop) {
  const a = t - q.tf, d = Math.sign(q.a || 1) * 0.38 * droop;
  if (a <= 0) { leaf(c, q.x, q.y, q.len, q.a + d, "birch", q.col, q.col, 0, { shadow: 0.8 }); return; }
  const tl = Math.sqrt(2 * (q.floor - q.y) / G), s = Math.min(a, tl);
  const x = q.x + q.sway * Math.sin(s * 5.5 + q.spin) * (s / tl), y = q.y + 0.5 * G * s * s;
  leaf(c, x, y, q.len, q.a + d + q.spin * s, "birch", q.col, q.col, 0, { shadow: a < tl ? 1.6 : 0.8 });
}

function drawLeft1(c, t) {
  c.drawImage(PAPER_L[0], 0, 0);
  // кленовый лист желтеет от краёв на «наступила»
  const u = sstep(prog(t, EV.nas - 0.2, EV.nas + 1.0));
  leaf(c, 236, 476, 300, -0.16, "maple", K.green, K.yellow, u, { edge: u > 0 ? K.red : null, stem: 0.3 });
  tape(c, 240, 452, 104, 32, 0.62, 3);
  // цветы высыхают на «высохли»
  for (const f of FLOWERS) {
    const v = sstep(prog(t, EV.vys - 0.12 + f.i * 0.12, EV.vys + 0.85 + f.i * 0.12));
    stem(c, f.stem, 5, mixc(K.green, K.strawD, v));
  }
  leaf(c, 612, 432, 64, 0.75, "willow", mixc(K.green, K.strawD, sstep(prog(t, EV.vys, EV.vys + 0.9))), K.green, 0, { shadow: 0.6 });
  leaf(c, 688, 486, 72, -0.62, "willow", mixc(K.green, K.strawD, sstep(prog(t, EV.vys + 0.1, EV.vys + 1.0))), K.green, 0, { shadow: 0.6 });
  for (const f of FLOWERS) {
    const v = sstep(prog(t, EV.vys - 0.12 + f.i * 0.12, EV.vys + 0.85 + f.i * 0.12)), rr = f.r * (1 - 0.1 * v);
    if (f.k === "ch") chamomile(c, f.x, f.y, rr, v, 60 + f.i); else cornflower(c, f.x, f.y, rr, v, 60 + f.i);
  }
  tape(c, 628, 588, 172, 38, -0.12, 4);
  // ветка куста: никнет на «уныло», листья опадают на «голые»
  const droop = sstep(prog(t, EV.uny - 0.1, EV.uny + 0.7));
  for (const b of TWIG) {
    const pts = b.pts.map(([x, y], j) => [x, y + droop * 10 * j / (b.pts.length - 1)]);
    c.save(); c.shadowColor = "rgba(60,38,18,0.3)"; c.shadowBlur = 5; c.shadowOffsetX = 2; c.shadowOffsetY = 3;
    stem(c, pts, b.w, K.brown); c.restore();
    stem(c, pts, b.w * 0.35, K.brownL);
  }
  for (const q of TWIG_LEAVES) if (t < q.tf) twigLeaf(c, q, t, droop);
  tape(c, 236, 800, 120, 34, -0.42, 5);
  for (const q of TWIG_LEAVES) if (t >= q.tf) twigLeaf(c, q, t, droop);
}

// Рябина на правой странице
function rowan(c) {
  c.save();
  stem(c, [[742, 748], [722, 790], [702, 830]], 3, K.brown);
  stem(c, [[742, 748], [748, 800], [742, 846]], 3, K.brown);
  leaf(c, 744, 752, 96, 0.9, "willow", K.ochre, K.ochre, 0, { shadow: 0.7 });
  leaf(c, 742, 750, 88, -0.4, "willow", mixc(K.ochre, K.green, 0.4), K.ochre, 0, { shadow: 0.7 });
  const B = [[700, 832], [722, 846], [690, 856], [714, 870], [742, 846], [758, 866], [736, 884], [764, 840], [706, 892]];
  c.shadowColor = "rgba(60,38,18,0.3)"; c.shadowBlur = 4; c.shadowOffsetY = 2;
  for (const [x, y] of B) { c.beginPath(); c.arc(x, y, 13, 0, TAU); c.fillStyle = "#c2381f"; c.fill(); }
  c.shadowColor = "transparent";
  for (const [x, y] of B) { c.beginPath(); c.arc(x - 4, y - 4, 4, 0, TAU); c.fillStyle = "rgba(255,220,190,0.55)"; c.fill(); c.beginPath(); c.arc(x + 3, y + 4, 2.4, 0, TAU); c.fillStyle = "#4a1a0c"; c.fill(); }
  c.restore();
}
