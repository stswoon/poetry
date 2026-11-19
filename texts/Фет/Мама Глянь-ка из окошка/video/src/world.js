// ---------- комната и двор ----------
// Комната: мир 1920×1080, пол y = FLOOR. Окно — 16:9, через него виден двор с текущей камерой двора.
const FLOOR = 792;
const WIN = { x: 452, y: 236, w: 544, h: 306 };          // проём окна (16:9)
const DOOR = { x: 1500, y: 300, w: 230, h: FLOOR - 300 };
const GROUND = 690;                                       // земля во дворе

// доля нарисованного: мел дописывает элемент от a до b
const drawn = (t, a, d = 0.6) => sstep(prog(t, a, a + d));

function drawRoom(c, t, R) {
  const p0 = R.sketch;  // 0…1 — комната дорисовывается в начале
  // пол
  chalkLine(c, curve([[-400, FLOOR + 4], [300, FLOOR - 2], [900, FLOOR + 3], [1500, FLOOR - 1], [2400, FLOOR + 2]], 6), 6, CH.white, { seed: 11, prog: p0 });
  for (let i = 0; i < 9; i++) chalkLine(c, [[-200 + i * 260, FLOOR + 10], [-260 + i * 260, FLOOR + 40]], 3, CH.brown, { seed: 12 + i, alpha: 0.6 * p0 });
  // обои: редкие ромбики
  for (let i = 13; i < 26; i++) {   // только нижний ряд: верх стены свободен под заголовок
    const x = 80 + (i % 13) * 150 + (Math.floor(i / 13) % 2) * 75, y = 120 + Math.floor(i / 13) * 300;
    if (x > WIN.x - 40 && x < WIN.x + WIN.w + 40 && y > WIN.y - 40) continue;
    if (x > DOOR.x - 30 && x < DOOR.x + DOOR.w + 30 && y > DOOR.y - 30) continue;
    chalkLine(c, [[x, y - 12], [x + 9, y], [x, y + 12], [x - 9, y], [x, y - 12]], 2.5, CH.violet, { seed: 30 + i, alpha: 0.4 * p0 });
  }
  // дверь
  const d = DOOR;
  chalkShape(c, [[d.x, d.y + d.h], [d.x, d.y], [d.x + d.w, d.y], [d.x + d.w, d.y + d.h]], CH.brown, CH.ochre, 6,
             { seed: 60, sp: 12, ang: -1.5, base: 0.22, hatch: 0.45, prog: p0, alpha: p0 });
  chalkLine(c, [[d.x + 26, d.y + 30], [d.x + d.w - 26, d.y + 30], [d.x + d.w - 26, d.y + 200], [d.x + 26, d.y + 200], [d.x + 26, d.y + 30]], 3, CH.ochre, { seed: 61, alpha: 0.7 * p0 });
  chalkDot(c, d.x + d.w - 30, d.y + 270, 9, CH.yellow, p0);
  // вешалка выше головы мамы: шапка, шарф и пальто девочки (в них она катается на горке)
  chalkLine(c, [[d.x - 170, 236], [d.x - 20, 236]], 6, CH.ochre, { seed: 62, prog: p0 });
  if (!R.hatGone) {
    chalkShape(c, curve([[d.x - 150, 240], [d.x - 156, 300], [d.x - 128, 330], [d.x - 100, 300], [d.x - 104, 240]], 3, true), CH.red, OUT, 3, { seed: 65, alpha: p0, base: 0.5 });
    chalkShape(c, curve([[d.x - 90, 244], [d.x - 86, 270], [d.x - 72, 290], [d.x - 52, 270], [d.x - 50, 244]], 3, true), CH.blue, OUT, 3, { seed: 63, alpha: p0, base: 0.5 });
    chalkLine(c, [[d.x - 40, 240], [d.x - 36, 300], [d.x - 30, 336]], 12, CH.yellow, { seed: 64, prog: p0 });
  }
  // окно: проём, рама, подоконник, занавески
  drawWindowFrame(c, t, R);
}

function drawWindowFrame(c, t, R) {
  const p0 = R.sketch, w = WIN, fa = R.frameAlpha ?? 1;
  const x0 = w.x, y0 = w.y, x1 = w.x + w.w, y1 = w.y + w.h;
  // рама
  chalkLine(c, [[x0 - 14, y1 + 2], [x0 - 14, y0 - 14], [x1 + 14, y0 - 14], [x1 + 14, y1 + 2]], 12, CH.ochre, { seed: 70, prog: p0, alpha: fa });
  chalkLine(c, [[x0, y1], [x0, y0], [x1, y0], [x1, y1], [x0, y1]], 4, CH.white, { seed: 71, prog: p0, alpha: fa });
  // переплёт крестом (бледнеет, когда камера пролетает сквозь окно)
  const ca = fa * (R.crossAlpha ?? 1);
  chalkLine(c, [[(x0 + x1) / 2, y0], [(x0 + x1) / 2, y1]], 7, CH.ochre, { seed: 72, prog: p0, alpha: ca });
  chalkLine(c, [[x0, y0 + w.h * 0.36], [x1, y0 + w.h * 0.36]], 7, CH.ochre, { seed: 73, prog: p0, alpha: ca });
  // подоконник
  chalkShape(c, [[x0 - 40, y1], [x1 + 40, y1], [x1 + 30, y1 + 26], [x0 - 30, y1 + 26]], CH.ochre, CH.white, 4, { seed: 74, sp: 7, base: 0.4, alpha: fa * p0 });
  // горшок с цветком на подоконнике
  const fx = x0 + 70;
  chalkShape(c, [[fx - 26, y1 - 46], [fx + 26, y1 - 46], [fx + 18, y1], [fx - 18, y1]], CH.red, OUT, 3, { seed: 75, base: 0.5, alpha: fa * p0 });
  chalkLine(c, curve([[fx, y1 - 46], [fx - 4, y1 - 80], [fx + 4, y1 - 110]], 4), 4, CH.green, { seed: 76, alpha: fa * p0 });
  chalkShape(c, ellPts(fx + 4, y1 - 120, 16, 14, 0, 12), CH.pink, OUT, 3, { seed: 77, base: 0.6, alpha: fa * p0 });
  chalkShape(c, ellPts(fx + 22, y1 - 84, 16, 7, -0.5, 12), CH.green, null, 3, { seed: 78, base: 0.6, alpha: fa * p0 });
  // занавески, собранные по бокам
  const cur = (sx, s) => {
    const P = [[sx, y0 - 30], [sx + s * 70, y0 - 30], [sx + s * 40, y0 + 120], [sx + s * 64, y1 + 10], [sx, y1 + 20]];
    chalkShape(c, curve(P, 3, true), CH.pink, OUT, 4, { seed: 79 + s, sp: 9, ang: 1.3, base: 0.3, alpha: fa * p0 });
    chalkLine(c, [[sx, y0 + 130], [sx + s * 46, y0 + 120]], 6, CH.yellow, { seed: 81 + s, alpha: fa * p0 });
  };
  cur(x0 - 74, 1); cur(x1 + 74, -1);
  chalkLine(c, [[x0 - 100, y0 - 34], [x1 + 100, y0 - 34]], 6, CH.brown, { seed: 83, prog: p0, alpha: fa });
}

// облачко мысли: кружки-ступеньки от головы и облако
function cloudPts(cx, cy, rx, ry, n = 9, seed = 1) {
  const P = [], Rn = mulberry32(seed);
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * TAU, a1 = ((i + 1) / n) * TAU, bx = cx + Math.cos((a0 + a1) / 2) * rx, by = cy + Math.sin((a0 + a1) / 2) * ry;
    const r = (Math.hypot(Math.cos(a0) * rx - Math.cos(a1) * rx, Math.sin(a0) * ry - Math.sin(a1) * ry) / 2) * (1.05 + Rn() * 0.2);
    const ang = Math.atan2(by - cy, bx - cx);
    for (let k = 0; k <= 6; k++) { const a = ang - Math.PI / 2 - 0.3 + (k / 6) * (Math.PI + 0.6); P.push([bx + Math.cos(a) * r, by + Math.sin(a) * r]); }
  }
  return P;
}

// ===== двор =====
// Y: состояние двора. Длина двора ~8200; камера двора задаётся в main.js.
const PUDDLES = [[300, 760, 120, 22], [760, 742, 150, 26], [1240, 770, 110, 20], [1700, 748, 90, 18]];
const TREE_X = 2900, TREE_TOP = 120;
const BUSHES = [3600, 3950, 4310, 4670, 5030];
const HILL = { x0: 5850, top: [6900, 330], x1: 8050 };
function hillY(x) {
  if (x <= HILL.x0 || x >= HILL.x1) return GROUND;
  if (x <= HILL.top[0]) { const u = (x - HILL.x0) / (HILL.top[0] - HILL.x0); return GROUND - (GROUND - HILL.top[1]) * (0.5 - 0.5 * Math.cos(u * Math.PI)); }
  const u = (x - HILL.top[0]) / (HILL.x1 - HILL.top[0]); return GROUND - (GROUND - HILL.top[1]) * (0.5 + 0.5 * Math.cos(u * Math.PI));
}
// наклон склона (рад)
const hillAng = (x) => Math.atan2(hillY(x + 4) - hillY(x - 4), 8);

function drawYard(c, t, Y, view) {
  // view: [xmin, xmax] — рисуем только то, что видно
  const vis = (a, b) => b > view[0] - 200 && a < view[1] + 200;
  const snow = Y.snow;      // 0…1 — белая волна прошла (доля по x)
  const snowX = lerp(-300, 2300, snow);
  // дальние дома и крыши
  if (vis(-200, 2400)) {
    const houses = [[60, 520, 260, 130], [420, 540, 200, 110], [1180, 510, 300, 140], [1640, 530, 220, 120], [2000, 520, 260, 130]];
    houses.forEach(([x, y, w, h], i) => {
      chalkLine(c, [[x, y + h], [x, y], [x + w, y], [x + w, y + h]], 4, CH.grey, { seed: 200 + i, alpha: 0.75 });
      chalkLine(c, [[x - 16, y + 4], [x + w / 2, y - 64], [x + w + 16, y + 4]], 5, CH.red, { seed: 210 + i, alpha: 0.8 });
      chalkShape(c, [[x + w * 0.4, y + 30], [x + w * 0.6, y + 30], [x + w * 0.6, y + 66], [x + w * 0.4, y + 66]], CH.yellow, CH.yellow, 3, { seed: 220 + i, base: 0.45, alpha: 0.8 });
      // снежная шапка на крыше
      const sx = x + w / 2, sa = sstep((snowX - x + 100) / 260);
      if (sa > 0) chalkShape(c, curve([[x - 14, y + 2], [sx, y - 62], [x + w + 14, y + 2], [x + w - 10, y - 4], [sx, y - 48], [x + 10, y - 2]], 3, true), CH.white, CH.white, 3, { seed: 230 + i, base: 0.75, alpha: sa });
    });
  }
  // забор
  if (vis(-200, 2500)) {
    for (let i = 0; i < 18; i++) {
      const x = -100 + i * 140, top = 588 + (i % 2) * 6;
      chalkShape(c, [[x, GROUND - 4], [x, top + 16], [x + 22, top], [x + 44, top + 16], [x + 44, GROUND - 4]], CH.brown, CH.ochre, 4, { seed: 240 + i, sp: 8, ang: -1.45, base: 0.22, hatch: 0.4 });
      const sa = sstep((snowX - x + 40) / 200);
      if (sa > 0) chalkShape(c, curve([[x - 4, top + 18], [x + 22, top - 8], [x + 48, top + 18], [x + 22, top + 6]], 3, true), CH.white, CH.white, 3, { seed: 260 + i, base: 0.85, alpha: sa });
    }
    chalkLine(c, [[-120, 626], [2420, 630]], 6, CH.ochre, { seed: 280, alpha: 0.8 });
    chalkLine(c, [[-120, 676], [2420, 672]], 6, CH.ochre, { seed: 281, alpha: 0.8 });
  }
  // земля
  chalkLine(c, curve([[view[0] - 300, GROUND + 4], [view[0] + 600, GROUND - 4], [view[0] + 1300, GROUND + 3], [view[1] + 300, GROUND]], 6), 6, CH.white, { seed: 290 });
  // грязь и лужи (под снегом)
  if (vis(-200, 2200)) {
    PUDDLES.forEach(([x, y, rx, ry], i) => {
      chalkShape(c, ellPts(x, y, rx, ry, 0, 26), CH.mud, CH.brown, 4, { seed: 300 + i, sp: 7, ang: 0.1, base: 0.45 });
      chalkLine(c, [[x - rx * 0.5, y - 4], [x - rx * 0.1, y - 6]], 3, CH.blue, { seed: 310 + i, alpha: 0.7 });
    });
    for (let i = 0; i < 14; i++) { const x = 120 + i * 130, y = 712 + (i % 3) * 18; chalkLine(c, [[x, y], [x + 22, y - 4]], 6, CH.mud, { seed: 320 + i, alpha: 0.8 }); }
    // белая волна: мел плашмя закрашивает двор
    if (snow > 0) {
      const top = [];
      for (let x = -300; x <= snowX; x += 60) top.push([x, GROUND - 8 + Math.sin(x * 0.013) * 6]);
      const edge = snowX, front = [];
      for (let k = 0; k <= 12; k++) { const y = lerp(GROUND - 8, 1400, k / 12); front.push([edge + Math.sin(k * 1.9 + edge * 0.01) * 26 + (k < 3 ? 30 - k * 10 : 0) - Math.max(0, y - 860) * 0.6, y]); }
      const P = [...top, ...front, [-300, 1400]];
      chalkShape(c, P, CH.white, null, 0, { seed: 330, sp: 6, ang: -0.5, base: 0.82, hatch: 0.9, lw: 4 });
      // сугробы-бугорки
      for (let i = 0; i < 8; i++) { const x = -100 + i * 280; if (x < snowX - 60) chalkLine(c, curve([[x, GROUND + 2], [x + 60, GROUND - 22], [x + 130, GROUND]], 4), 4, CH.sky, { seed: 340 + i, alpha: 0.8 }); }
      if (snow < 1) dust(c, snowX, GROUND + 40, Y.tSnow + (snow * 1.2) % 0.4, Y.tSnow + (snow * 1.2) % 0.4 + 0.5, 30, 110, CH.white, 31);
    }
  }
  // градусник на столбе
  if (vis(1500, 1800) && Y.thermo > 0) drawThermo(c, 1640, 360, Y.thermo, Y.merc);
  // снежинки
  if (Y.flakes > 0) drawFlakes(c, t, view, Y.flakes);
  // дерево с инеем
  if (vis(TREE_X - 900, TREE_X + 900)) drawTree(c, t, Y);
  // кусты
  if (vis(BUSHES[0] - 300, BUSHES[4] + 300)) BUSHES.forEach((x, i) => drawBush(c, t, x, i, Y.cotton[i]));
  // горка
  if (vis(HILL.x0 - 200, HILL.x1 + 200)) drawHill(c, t, Y);
  // снег по всей земле после волны (кроме первого участка, где идёт волна)
  if (snow >= 1) {
    const x0 = Math.max(2100, view[0] - 200), x1 = view[1] + 200;
    if (x1 > x0) {
      const P = [];
      for (let x = x0; x <= x1; x += 60) P.push([x, Math.min(GROUND, hillY(x)) - 8 + Math.sin(x * 0.013) * 5]);
      P.push([x1, 1400], [x0, 1400]);
      chalkShape(c, P, CH.white, null, 0, { seed: 350, sp: 6, ang: -0.5, base: 0.8, hatch: 0.85, lw: 4 });
    }
  }
}

function drawThermo(c, x, y, a, merc) {
  // столбик-доска с градусником; merc: 1 тепло … 0 мороз
  chalkLine(c, [[x, y + 40], [x, GROUND]], 12, CH.ochre, { seed: 400, alpha: a, prog: a });
  chalkShape(c, curve([[x - 40, y - 140], [x + 40, y - 140], [x + 40, y + 70], [x - 40, y + 70]], 2, true), CH.white, OUT, 4, { seed: 401, base: 0.14, hatch: 0.2, alpha: a });
  chalkLine(c, [[x, y - 118], [x, y + 30]], 16, CH.white, { seed: 402, alpha: a });
  chalkDot(c, x, y + 42, 18, CH.red, a);
  const top = lerp(y + 30, y - 110, merc);
  chalkLine(c, [[x, y + 36], [x, top]], 9, CH.red, { seed: 403, alpha: a, jit: 0.4 });
  for (let i = 0; i < 6; i++) chalkLine(c, [[x + 14, y - 106 + i * 26], [x + 28, y - 106 + i * 26]], 3, OUT, { seed: 404 + i, alpha: a * 0.8 });
  chalkLine(c, [[x - 30, y - 16], [x - 14, y - 16]], 4, CH.blue, { seed: 411, alpha: a });   // «0»: ртуть ниже — мороз
}

function snowflake(c, x, y, r, rotA, col = CH.white, a = 1) {
  for (let k = 0; k < 3; k++) {
    const an = rotA + (k * Math.PI) / 3, dx = Math.cos(an) * r, dy = Math.sin(an) * r;
    chalkLine(c, [[x - dx, y - dy], [x + dx, y + dy]], 2.6, col, { seed: 500 + k, alpha: a, jit: 0.3 });
  }
}
function drawFlakes(c, t, view, a) {
  const Rn = mulberry32(42);
  for (let i = 0; i < 70; i++) {
    const bx = Rn() * 9000 - 300, sp = 40 + Rn() * 50, ph = Rn() * 20, r = 6 + Rn() * 8;
    const y = ((Rn() * 900 + (t + ph) * sp) % 900) - 40, x = bx + Math.sin(t * 0.9 + ph) * 30;
    if (x < view[0] - 50 || x > view[1] + 50) continue;
    snowflake(c, x, y, r, t * 0.6 + ph, CH.white, a * 0.85);
  }
}

// дерево: ветки — ломаные; иней растёт ёлочкой вдоль веток
const TREE = (() => {
  const Rn = mulberry32(77), br = [];
  const grow = (x, y, ang, len, depth) => {
    const pts = [[x, y]]; let cx = x, cy = y, a = ang;
    const n = Math.max(3, Math.round(len / 40));
    for (let i = 0; i < n; i++) { a += (Rn() - 0.5) * 0.35; cx += Math.cos(a) * len / n; cy += Math.sin(a) * len / n; pts.push([cx, cy]); }
    br.push({ pts, w: Math.max(3, depth * 5), depth });
    if (depth > 1) {
      const k = 2 + (depth > 2 ? 1 : 0);
      for (let j = 0; j < k; j++) {
        const at = pts[Math.floor(n * (0.4 + Rn() * 0.5))];
        grow(at[0], at[1], a + (j % 2 ? 1 : -1) * (0.45 + Rn() * 0.5), len * (0.5 + Rn() * 0.2), depth - 1);
      }
    }
  };
  grow(TREE_X, GROUND, -Math.PI / 2, 420, 4.0);
  br[0].w = 40;
  return br;
})();
function drawTree(c, t, Y) {
  TREE.forEach((b, i) => chalkLine(c, curve(b.pts, 3), b.w, CH.brown, { seed: 600 + i, jit: 1 }));
  TREE.forEach((b, i) => { if (b.depth >= 3) chalkLine(c, curve(b.pts, 3), Math.max(2, b.w * 0.25), CH.ochre, { seed: 640 + i, alpha: 0.6 }); });
  // снег на ветках
  const sa = Y.treeSnow;
  if (sa > 0) TREE.forEach((b, i) => { if (b.depth <= 3) chalkLine(c, curve(b.pts.map((p) => [p[0], p[1] - b.w * 0.5 - 2]), 3), 5, CH.white, { seed: 680 + i, alpha: sa, prog: sa }); });
  // иней: голубые иголочки вдоль веток, растут от ствола к кончикам
  const fr = Y.frost;
  if (fr <= 0) return;
  TREE.forEach((b, i) => {
    if (b.depth > 3) return;
    const P = curve(b.pts, 3), L = P.length;
    for (let k = 1; k < L; k += 1) {
      const u = k / (L - 1), on = clamp((fr * 1.25 - u * 0.6 - (3 - b.depth) * 0.12) * 4, 0, 1);
      if (on <= 0) continue;
      const p = P[k], q = P[k - 1], an = Math.atan2(p[1] - q[1], p[0] - q[0]), len = (9 + (k % 3) * 4) * on;
      for (const s of [-1, 1]) {
        const aa = an + s * 2.3;
        chalkLine(c, [p, [p[0] + Math.cos(aa) * len, p[1] + Math.sin(aa) * len]], 2.4, k % 2 ? CH.blue : CH.white, { seed: 700 + i * 50 + k + s, jit: 0.3 });
      }
    }
  });
  // искры на кончиках
  if (Y.sparkle > 0) {
    TREE.forEach((b, i) => {
      if (b.depth > 1.5) return;
      const p = b.pts[b.pts.length - 1], tw = Math.max(0, Math.sin(t * 5 + i * 1.7)) * Y.sparkle;
      if (tw < 0.2) return;
      const r = 10 * tw;
      chalkLine(c, [[p[0] - r, p[1]], [p[0] + r, p[1]]], 2.5, CH.yellow, { seed: 900 + i, jit: 0.2, alpha: tw });
      chalkLine(c, [[p[0], p[1] - r], [p[0], p[1] + r]], 2.5, CH.yellow, { seed: 901 + i, jit: 0.2, alpha: tw });
    });
  }
}

// куст: голые прутья; ваты — пухлые комки, которые шлёпает рука
function drawBush(c, t, x, idx, cot) {
  const Rn = mulberry32(1000 + idx);
  const twigs = [];
  for (let k = 0; k < 9; k++) {
    const a = -Math.PI / 2 + (k - 4) * 0.22 + (Rn() - 0.5) * 0.2, l = 120 + Rn() * 70;
    twigs.push([[x + (k - 4) * 4, GROUND], [x + Math.cos(a) * l * 0.55, GROUND + Math.sin(a) * l * 0.55 - 6], [x + Math.cos(a) * l, GROUND + Math.sin(a) * l]]);
  }
  twigs.forEach((tw, k) => chalkLine(c, curve(tw, 3), 5, CH.brown, { seed: 1100 + idx * 20 + k }));
  // cot: время шлепка (или null)
  if (cot == null || t < cot) return;
  const s = spr(springBounce, t, cot), puffs = [[0, -150, 70], [-62, -112, 52], [64, -116, 54], [-26, -70, 50], [36, -64, 46], [0, -196, 40]];
  puffs.forEach(([dx, dy, r], k) => {
    const sk = clamp(spr(springBounce, t, cot + k * 0.04) * 1.0, 0, 1.3);
    if (sk <= 0.01) return;
    const P = cloudPts(x + dx, GROUND + dy, r * sk, r * 0.86 * sk, 7, idx * 10 + k);
    chalkShape(c, P, CH.white, CH.white, 3.5, { seed: 1200 + idx * 10 + k, sp: 5, ang: 0.7, base: 0.7, hatch: 0.8, lw: 2.6 });
  });
  if (s < 1.05) dust(c, x, GROUND - 130, cot, t, 22, 130, CH.white, idx + 9);
}

function drawHill(c, t, Y) {
  const P = [];
  for (let x = HILL.x0 - 100; x <= HILL.x1 + 100; x += 30) P.push([x, hillY(x)]);
  chalkLine(c, P, 7, CH.white, { seed: 1300 });
  const F = [...P, [HILL.x1 + 100, 1400], [HILL.x0 - 100, 1400]];
  chalkShape(c, F, CH.white, null, 0, { seed: 1301, sp: 7, ang: -0.6, base: 0.55, hatch: 0.7, lw: 3.5 });
  chalkShape(c, F, CH.sky, null, 0, { seed: 1302, sp: 22, ang: 0.8, base: 0, hatch: 0.35, lw: 3, under: false });
  // ёлочки на горке
  [[6250, 0.7], [6500, 0.9], [7350, 0.85], [7650, 0.65]].forEach(([x, k], i) => {
    const y = hillY(x);
    for (let j = 0; j < 3; j++) {
      const w = (70 - j * 18) * k, top = y - (60 + j * 46) * k;
      chalkShape(c, [[x - w, top + 60 * k], [x, top - 30 * k], [x + w, top + 60 * k]], CH.green, OUT, 3.5, { seed: 1310 + i * 3 + j, sp: 7, ang: 1.2, base: 0.4 });
    }
  });
  // след салазок
  if (Y.track) {
    const [a, b] = Y.track, Q = [];
    for (let x = a; x <= b; x += 30) Q.push([x, hillY(x) + 6]);
    if (Q.length > 1) chalkLine(c, Q, 3, CH.sky, { seed: 1330, alpha: 0.9 });
  }
}

// салазки: полозья загнуты вперёд; ang — наклон по склону
function drawSled(c, x, y, ang, dir = 1, rope = null) {
  c.save(); c.translate(x, y); c.rotate(ang); c.scale(dir, 1);
  chalkLine(c, curve([[-70, 0], [50, 0], [76, -10], [80, -28], [66, -30]], 4), 6, CH.ochre, { seed: 1400 });
  chalkLine(c, [[-50, 0], [-50, -24]], 5, CH.ochre, { seed: 1401 });
  chalkLine(c, [[30, 0], [30, -24]], 5, CH.ochre, { seed: 1402 });
  chalkShape(c, [[-74, -24], [56, -24], [56, -38], [-74, -38]], CH.red, OUT, 3.5, { seed: 1403, sp: 6, base: 0.45 });
  c.restore();
  if (rope) chalkLine(c, curve(rope, 4), 3, CH.white, { seed: 1404 });
}
