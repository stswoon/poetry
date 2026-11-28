// ---------- Гусь со спины (камера летит за ним): тушь + акварель, рисуется в своём холсте и тонируется пятнами пигмента ----------
// st: x, y (центр туловища на экране), s (масштаб), roll (крен, рад), mode ('sleep'|'swim'|'run'|'fly'),
//     flap (фаза взмаха 0…1), run (фаза бега), look (−1…1 поворот головы: + вправо), honk (0…1 клюв открыт),
//     pitch (−1 пике … +1 набор высоты), ruff (0…1 перья дыбом), nu (0…1 шея поднята)
const GBUF = { c: null, x: null, N: 1100 };
const GCOL = { back: "#8f8b7f", backD: "#6b675d", light: "#d8d2c2", neck: "#6c665c", head: "#625d54", prim: "#3d3a34", sec: "#5d5a52", white: "#f4f1ea", beak: "#e8822c", foot: "#e57a2a" };
function wingAngles(flap) {
  const a = Math.sin(flap * TAU), b = Math.sin((flap - 0.1) * TAU);
  // плечо: −0.5 (вниз) … +0.85 (вверх); кисть отстаёт и гнётся
  return [lerp(-0.5, 0.85, (a + 1) / 2), lerp(-0.85, 1.05, (b + 1) / 2)];
}
// одно крыло: side = +1 правое (на экране справа), −1 левое
function drawWingRear(g, side, flap, ink) {
  const [t1, t2] = wingAngles(flap);
  const S = [side * 58, -16];
  const d1 = [side * Math.cos(t1), -Math.sin(t1)], d2 = [side * Math.cos(t2), -Math.sin(t2)];
  const E = [S[0] + d1[0] * 112, S[1] + d1[1] * 112];
  const T = [E[0] + d2[0] * 150, E[1] + d2[1] * 150];
  // нормаль «к зрителю» (вниз по экрану у горизонтального крыла)
  const fix = (n) => (n[1] < 0 ? [-n[0], -n[1]] : n);
  const N1 = fix([-d1[1], d1[0]]), N2 = fix([-d2[1], d2[0]]);
  const R = [side * 18, 20];                      // корень заднего края у спины
  const E2 = [E[0] + N1[0] * 62, E[1] + N1[1] * 62];
  const M = [lerp(E[0], T[0], 0.55), lerp(E[1], T[1], 0.55)];
  const M2 = [M[0] + N2[0] * 46, M[1] + N2[1] * 46];
  const RE = [lerp(E2[0], R[0], 0.5) + N1[0] * 14, lerp(E2[1], R[1], 0.5) + N1[1] * 14];
  const shape = (c) => {
    c.beginPath(); c.moveTo(R[0], R[1]); c.lineTo(S[0], S[1]);
    c.quadraticCurveTo(lerp(S[0], E[0], 0.5) - N1[0] * 10, lerp(S[1], E[1], 0.5) - N1[1] * 10, E[0], E[1]);
    c.quadraticCurveTo(M[0] - N2[0] * 6, M[1] - N2[1] * 6, T[0], T[1]);
    c.quadraticCurveTo(T[0] + N2[0] * 20 - d2[0] * 10, T[1] + N2[1] * 20 - d2[1] * 10, M2[0], M2[1]);
    c.quadraticCurveTo(E2[0] + N2[0] * 4, E2[1] + N2[1] * 4, E2[0], E2[1]);
    c.quadraticCurveTo(RE[0], RE[1], R[0], R[1]);
    c.closePath();
  };
  g.save();
  shape(g); g.fillStyle = GCOL.back; g.fill();
  g.save(); shape(g); g.clip();
  // кроющие светлее у переднего края, второстепенные — тёмная полоса по заднему краю, маховые (кисть) тёмные
  g.strokeStyle = "rgba(255,255,255,0.30)"; g.lineWidth = 26; g.lineCap = "round"; g.beginPath(); g.moveTo(S[0], S[1] + 8); g.lineTo(E[0] + N1[0] * 12, E[1] + N1[1] * 12); g.stroke();
  g.strokeStyle = GCOL.sec; g.lineWidth = 30; g.globalAlpha = 0.8; g.beginPath(); g.moveTo(R[0] + N1[0] * 10, R[1] + N1[1] * 10); g.lineTo(E2[0] - N1[0] * 6, E2[1] - N1[1] * 6); g.stroke();
  g.globalAlpha = 1; g.fillStyle = GCOL.prim;
  g.beginPath(); g.moveTo(E[0] + d2[0] * 40 - N2[0] * 30, E[1] + d2[1] * 40 - N2[1] * 30); g.lineTo(T[0] + d2[0] * 30, T[1] + d2[1] * 30); g.lineTo(M2[0] + N2[0] * 40, M2[1] + N2[1] * 40); g.lineTo(E2[0] + d2[0] * 30 + N2[0] * 20, E2[1] + d2[1] * 30 + N2[1] * 20); g.closePath(); g.fill();
  g.strokeStyle = "rgba(60,52,42,0.45)"; g.lineWidth = 2.2;
  const an = Math.atan2(N1[1], N1[0]);
  for (let k = 1; k < 5; k++) { const u = k / 5, px = lerp(S[0], E[0], u) + N1[0] * 14, py = lerp(S[1], E[1], u) + N1[1] * 14; g.beginPath(); g.arc(px, py, 11, an - 1.2, an + 1.2); g.stroke(); }
  g.restore();
  // тушь: передний край густо, задний тоньше, «пальцы» маховых штрихами
  inkStroke(g, [S, [lerp(S[0], E[0], 0.5) - N1[0] * 5, lerp(S[1], E[1], 0.5) - N1[1] * 5], E, M, T], 5.2, ink, { seed: 3 + side });
  inkStroke(g, bez(T, [T[0] + N2[0] * 20, T[1] + N2[1] * 20], M2, E2, 10).concat([RE, R]), 2.4, ink, { seed: 5 + side, flat: true });
  for (let k = 0; k < 4; k++) { const u = 0.12 + k * 0.13, bx = lerp(T[0], E[0], u), by = lerp(T[1], E[1], u), dd = lerp(18, 40, u); inkStroke(g, [[bx, by], [bx + N2[0] * dd, by + N2[1] * dd]], 1.6, ink, { seed: 8 + k }); }
  g.restore();
}
// голова слегка в профиль: look задаёт поворот и сторону клюва
function drawHeadRear(g, hx, hy, look, honk, eyeClosed, ink, sc = 1) {
  const side = look >= 0 ? 1 : -1, turn = clamp(Math.abs(look), 0.2, 1);
  g.save(); g.translate(hx, hy); g.scale(sc, sc);
  const bl = 20 + 26 * turn, by = 0;
  g.fillStyle = GCOL.beak;
  g.beginPath(); g.moveTo(side * 12, by - 8); g.lineTo(side * (12 + bl), by - 2); g.lineTo(side * (12 + bl), by + 1); g.lineTo(side * 12, by + 3); g.closePath(); g.fill();
  g.save(); g.translate(side * 12, by + 3); g.rotate(side * honk * 0.5);
  g.beginPath(); g.moveTo(0, 0); g.lineTo(side * (bl - 3), -1); g.lineTo(side * (bl - 8), 6); g.lineTo(0, 7); g.closePath(); g.fill();
  inkStroke(g, [[0, 7], [side * (bl - 8), 6]], 1.4, ink, { flat: true });
  g.restore();
  inkStroke(g, [[side * 12, by - 8], [side * (12 + bl), by - 2], [side * (12 + bl), by + 1]], 2, ink, { seed: 2 });
  g.fillStyle = GCOL.head; g.beginPath(); g.ellipse(side * 4 * turn, 0, 21 + 4 * turn, 19, 0, 0, TAU); g.fill();
  inkStroke(g, [[-21, 6], [-18, -12], [0, -20], [18, -12], [22, 5]], 3, ink, { seed: 4 });
  if (!eyeClosed) { g.fillStyle = GCOL.white; g.beginPath(); g.ellipse(side * 13, by - 3, 2.5, 5, 0, 0, TAU); g.fill(); }
  if (turn > 0.25) {
    if (eyeClosed) inkStroke(g, [[side * 1, -6], [side * 6, -3], [side * 11, -6]], 1.8, ink, { flat: true });
    else { g.fillStyle = "#17110c"; g.beginPath(); g.arc(side * 6, -6, 4.2, 0, TAU); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.arc(side * 7.3, -7.3, 1.4, 0, TAU); g.fill(); }
  }
  g.restore();
}
function headPos(st) {
  const nu = st.nu ?? 1, pitch = st.pitch ?? 0, look = st.look ?? 0.3;
  return [look * 26, lerp(-70, -150, nu) - pitch * 38];
}
function drawGooseRear(g, st) {
  MOTTLE = MOTTLE || bakeMottle();
  if (!GBUF.c) { GBUF.c = mk(GBUF.N, GBUF.N); GBUF.x = GBUF.c.getContext("2d"); }
  const s = st.s ?? 1, N = GBUF.N, half = N / 2;
  const box = Math.min(N, Math.ceil(980 * s) + 40), b0 = Math.floor(half - box / 2);
  const x = GBUF.x;
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = "source-over";
  x.clearRect(b0 - 3, b0 - 3, box + 6, box + 6);   // с запасом: при крене края копии берут соседние пиксели
  x.save(); x.beginPath(); x.rect(b0, b0, box, box); x.clip();
  x.translate(half, half); x.rotate(st.roll ?? 0); x.scale(s, s);
  const ink = st.ink ?? P.ink;
  const mode = st.mode ?? "fly", pitch = st.pitch ?? 0, ruff = st.ruff ?? 0;
  const folded = mode === "sleep" || mode === "swim";
  // ---- крылья (оба всегда видны: левое и правое по сторонам)
  if (!folded) { const fl = st.flap ?? 0, sp = st.spread ?? 1; x.save(); x.globalAlpha = clamp(sp * 2.5); x.scale(lerp(0.45, 1, sp), lerp(0.55, 1, sp)); drawWingRear(x, -1, lerp(0.5, fl, sp), ink); drawWingRear(x, 1, lerp(0.5, fl, sp), ink); x.restore(); }
  // ---- шея и голова (уходят вдаль, туловище ближе к нам и рисуется поверх основания шеи)
  const look = st.look ?? 0.3;
  if (mode !== "sleep") {
    const [hx, hy] = headPos(st);
    const np = bez([0, -30], [0, -70], [hx * 0.6, hy + 34], [hx, hy + 10], 12);
    const L = [], Rr = [];
    np.forEach((p, k) => { const u = k / (np.length - 1), w = lerp(27, 15, u); const q = np[Math.min(k + 1, np.length - 1)], o = np[Math.max(k - 1, 0)]; let dx = q[0] - o[0], dy = q[1] - o[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l; L.push([p[0] - dy * w, p[1] + dx * w]); Rr.push([p[0] + dy * w, p[1] - dx * w]); });
    const neckPath = (c) => { c.beginPath(); L.forEach((p, k) => (k ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); for (let k = Rr.length - 1; k >= 0; k--) c.lineTo(Rr[k][0], Rr[k][1]); c.closePath(); };
    x.save(); neckPath(x); x.fillStyle = GCOL.neck; x.fill(); x.clip();
    x.strokeStyle = "rgba(255,255,255,0.16)"; x.lineWidth = 9; x.beginPath(); np.forEach((p, k) => (k ? x.lineTo(p[0] - 9, p[1]) : x.moveTo(p[0] - 9, p[1]))); x.stroke();
    x.strokeStyle = "rgba(40,34,28,0.4)"; x.lineWidth = 1.6;
    for (let k = 2; k < np.length - 1; k += 2) { const p = np[k]; x.beginPath(); x.moveTo(p[0] - 22, p[1] - 3); x.quadraticCurveTo(p[0], p[1] + 5, p[0] + 22, p[1] - 3); x.stroke(); }
    x.restore();
    inkStroke(x, L, 3.6, ink, { seed: 51 }); inkStroke(x, Rr, 3.6, ink, { seed: 52 });
    drawHeadRear(x, hx, hy, look, st.honk ?? 0, false, ink, 1.3);
  }
  // ---- туловище (спина): чешуйчатые ряды перьев со светлыми каймами
  const spr0 = mode === "run" ? (st.spread ?? 1) : folded ? 0 : 1;
  const rx = lerp(98, 88, spr0), ry = lerp(64, 60, spr0) - pitch * 6;
  const bodyPath = (c) => { c.beginPath(); c.moveTo(-rx, -4); c.bezierCurveTo(-rx, -ry * 0.95, rx, -ry * 0.95, rx, -4); c.bezierCurveTo(rx, ry * 0.7, rx * 0.42, ry + 8, 0, ry + 8); c.bezierCurveTo(-rx * 0.42, ry + 8, -rx, ry * 0.7, -rx, -4); c.closePath(); };
  x.save();
  bodyPath(x); x.fillStyle = GCOL.back; x.fill();
  x.clip();
  x.fillStyle = GCOL.light; x.beginPath(); x.ellipse(0, 6 + ry * 0.95, rx * 0.9, ry * 0.5, 0, 0, TAU); x.fill();
  for (let row = 0; row < 4; row++) for (let k = -3; k <= 3; k++) {
    const px = k * 26 + (row % 2) * 13, py = -38 + row * 22;
    if (Math.abs(px) > rx * 0.85 - row * 6) continue;
    x.strokeStyle = "rgba(240,234,220,0.75)"; x.lineWidth = 2.6; x.beginPath(); x.arc(px, py, 12, 0.25, Math.PI - 0.25); x.stroke();
    x.strokeStyle = "rgba(50,44,36,0.4)"; x.lineWidth = 1.6; x.beginPath(); x.arc(px, py + 3, 12, 0.35, Math.PI - 0.35); x.stroke();
  }
  x.restore();
  if (ruff > 0.01) { for (let k = -2; k <= 2; k++) { const px = k * 34 + ruff * k * 14, py = -58 - ruff * (30 + 26 * hash(k + 9)), a = k * 0.35 + ruff * k * 0.4; x.save(); x.translate(px, py); x.rotate(a); x.globalAlpha = clamp(ruff * 1.6); x.fillStyle = GCOL.light; x.beginPath(); x.ellipse(0, 0, 6, 15, 0, 0, TAU); x.fill(); x.strokeStyle = ink; x.lineWidth = 1.4; x.stroke(); x.beginPath(); x.moveTo(0, 15); x.lineTo(0, -12); x.stroke(); x.restore(); } }
  inkStroke(x, bez([-rx, -4], [-rx, -ry * 0.95], [rx, -ry * 0.95], [rx, -4], 18), 5, ink, { seed: 31 });
  inkStroke(x, bez([rx, -4], [rx, ry * 0.7], [rx * 0.42, ry + 8], [0, ry + 8], 10), 3.2, ink, { seed: 32 });
  inkStroke(x, bez([0, ry + 8], [-rx * 0.42, ry + 8], [-rx, ry * 0.7], [-rx, -4], 10), 3.2, ink, { seed: 34 });
  // ---- хвост: тёмный веер и белое подхвостье (ближе всего к зрителю)
  x.fillStyle = GCOL.white; x.beginPath(); x.ellipse(0, ry - 6, 30, 9, 0, 0, TAU); x.fill();
  const tl = (c) => { c.beginPath(); c.moveTo(-26, ry - 2); c.quadraticCurveTo(-30, ry + 24, 0, ry + 30); c.quadraticCurveTo(30, ry + 24, 26, ry - 2); c.closePath(); };
  tl(x); x.fillStyle = "#77736a"; x.fill();
  x.strokeStyle = GCOL.white; x.lineWidth = 4; x.beginPath(); x.moveTo(-22, ry + 18); x.quadraticCurveTo(0, ry + 32, 22, ry + 18); x.stroke();
  inkStroke(x, bez([-26, ry - 2], [-30, ry + 24], [30, ry + 24], [26, ry - 2], 10), 2.6, ink, { seed: 33 });
  // ---- голова спящего: лежит на спине, клюв спрятан в перья
  if (mode === "sleep") drawHeadRear(x, 30, -36, -0.9, 0, true, ink, 1.35);
  // ---- сложенные крылья по бокам (на воде)
  if (folded || spr0 < 1) {
    x.save(); x.globalAlpha = folded ? 1 : 1 - spr0;
    for (const sd of [-1, 1]) {
      const fw = [[sd * 30, -46], [sd * 92, -20], [sd * 104, 26], [sd * 70, 60], [sd * 44, 40]];
      x.fillStyle = GCOL.backD; poly(x, fw); x.fill();
      x.fillStyle = GCOL.prim; poly(x, [[sd * 70, 60], [sd * 104, 26], [sd * 96, 54], [sd * 58, 74]]); x.fill();
      inkStroke(x, [[sd * 30, -46], [sd * 92, -20], [sd * 104, 26], [sd * 70, 60]], 3.2, ink, { seed: 40 + sd });
    }
    x.restore();
  }
  drawFeetRear(x, st, ry, ink);
  x.restore();
  // пятна пигмента поверх гуся (только по закрашенному)
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = "source-atop"; x.globalAlpha = 0.5;
  const ox = (hash(st.seed ?? 1) * 100) | 0;
  x.drawImage(MOTTLE, ox, ox, Math.min(box, 1024 - ox), Math.min(box, 1024 - ox), b0, b0, box, box);
  x.globalCompositeOperation = "source-over"; x.globalAlpha = 1;
  g.drawImage(GBUF.c, b0, b0, box, box, Math.round(st.x - box / 2), Math.round(st.y - box / 2), box, box);
}
// лапы со спины. Полёт: поджаты под хвостом, обе ступни подошвами к нам. Бег: шлёпают по очереди. Вода: гребут под водой.
function drawFeetRear(x, st, ry, ink) {
  const mode = st.mode ?? "fly";
  const foot = (fx, fy, sc, a) => {
    x.save(); x.translate(fx, fy); x.rotate(a); x.scale(sc, sc);
    x.fillStyle = GCOL.foot; x.beginPath(); x.moveTo(0, -4); x.lineTo(-15, 16); x.quadraticCurveTo(0, 12, 15, 16); x.closePath(); x.fill();
    x.strokeStyle = ink; x.lineWidth = 1.8; x.stroke();
    x.lineWidth = 1.2; x.beginPath(); x.moveTo(0, -2); x.lineTo(-9, 14); x.moveTo(0, -2); x.lineTo(0, 13); x.moveTo(0, -2); x.lineTo(9, 14); x.stroke();
    x.restore();
  };
  const leg = (a, b, w) => { x.lineCap = "round"; x.strokeStyle = ink; x.lineWidth = w + 3; x.beginPath(); x.moveTo(...a); x.lineTo(...b); x.stroke(); x.strokeStyle = GCOL.foot; x.lineWidth = w; x.stroke(); };
  if (mode === "fly") {
    for (const sd of [-1, 1]) { const fx = sd * 38, fy = ry + 22; leg([sd * 28, ry - 2], [fx, fy - 3], 5); foot(fx, fy, 0.95, sd * 0.2); }
  } else if (mode === "run") {
    for (const sd of [-1, 1]) {
      const ph = ((st.run ?? 0) + (sd > 0 ? 0.5 : 0)) * TAU, sp = st.spread ?? 1, lift = Math.max(0, Math.sin(ph)) * 34 * sp;
      const fy = ry + lerp(26, 62, sp) - lift, fx = sd * (34 + Math.cos(ph) * 6);
      x.save(); x.globalAlpha = lerp(0.45, 1, sp); leg([sd * 30, ry - 10], [fx, fy - 6], 6.5);
      foot(fx, fy - 4, lerp(1.1, 1.25, sp), sd * 0.25); x.restore();
    }
  } else {
    x.save(); x.globalAlpha = 0.45;
    for (const sd of [-1, 1]) { const ph = ((st.run ?? 0) + (sd > 0 ? 0.5 : 0)) * TAU; foot(sd * (40 + Math.sin(ph) * 8), ry + 36, 1.1, sd * 0.3); }
    x.restore();
  }
}
