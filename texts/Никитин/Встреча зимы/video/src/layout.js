// ---------- Страницы комикса в мире и камера-«читатель» ----------
const PW = 1920, PH = 1080, GAP = 220;
const PAGES = {};
["cover", "A", "B", "C", "D", "E", "F", "back"].forEach((id, i) => (PAGES[id] = { id, x: i * (PW + GAP), y: 0, w: PW, h: PH }));
const PANELS = [];
function panel(id, page, x, y, w, h, draw) { const P = PAGES[page]; PANELS.push({ id, page, x: P.x + x, y: P.y + y, w, h, draw }); }
const M = 36, G2 = 24; // поля страницы и промежуток между панелями
panel("cover", "cover", M, M, PW - 2 * M, PH - 2 * M, sceneCover);
panel("A1", "A", M, M, 1120, 590, sceneA1);
panel("A2", "A", M + 1120 + G2, M, PW - 2 * M - 1120 - G2, 590, sceneA2);
panel("A3", "A", M, M + 590 + G2, 900, PH - 2 * M - 590 - G2, sceneA3);
panel("A4", "A", M + 900 + G2, M + 590 + G2, PW - 2 * M - 900 - G2, PH - 2 * M - 590 - G2, sceneA4);
panel("B1", "B", M, M, 600, 540, sceneB1);
panel("B2", "B", M + 600 + G2, M, PW - 2 * M - 600 - G2, 540, sceneB2);
panel("B3", "B", M, M + 540 + G2, 600, PH - 2 * M - 540 - G2, sceneB3);
panel("B4", "B", M + 600 + G2, M + 540 + G2, PW - 2 * M - 600 - G2, PH - 2 * M - 540 - G2, sceneB4);
panel("C1", "C", M, M, PW - 2 * M, 440, sceneC1);
panel("C2", "C", M, M + 440 + G2, 1100, PH - 2 * M - 440 - G2, sceneC2);
panel("C3", "C", M + 1100 + G2, M + 440 + G2, PW - 2 * M - 1100 - G2, PH - 2 * M - 440 - G2, sceneC3);
panel("D1", "D", M, M, PW - 2 * M, 680, sceneD1);
panel("D2", "D", M, M + 680 + G2, PW - 2 * M, PH - 2 * M - 680 - G2, sceneD2);
panel("E1", "E", M, M, 640, 520, sceneE1);
panel("E2", "E", M + 640 + G2, M, PW - 2 * M - 640 - G2, 520, sceneE2);
panel("E3", "E", M, M + 520 + G2, PW - 2 * M, PH - 2 * M - 520 - G2, sceneE3);
panel("F1", "F", M, M, PW - 2 * M, PH - 2 * M, sceneF1);
panel("back", "back", M, M, PW - 2 * M, PH - 2 * M, sceneBack);
const PBY = Object.fromEntries(PANELS.map((p) => [p.id, p]));

// ---------- Кадры камеры: [время начала, цель, опции] ----------
// цель — панель или страница; камера вписывает её в область над плашкой строк.
// o.zx/o.zy — точка внутри панели (0…1), o.z — дополнительный зум, o.to — куда доехать к концу кадра (медленная панорама).
const SAFE = { x: 40, y: 20, w: W - 80, h: 840 };   // область кадра над плашкой
function fitCam(r, o = {}) {
  if (o.full) return { cx: r.x + r.w / 2, cy: r.y + r.h / 2, z: Math.min(W / r.w, H / r.h), sy: H / 2 };  // страница на весь кадр
  const z0 = Math.min(SAFE.w / r.w, SAFE.h / r.h) * (o.z || 1);
  const zx = o.zx ?? 0.5, zy = o.zy ?? 0.5;
  return { cx: r.x + r.w * zx, cy: r.y + r.h * zy, z: z0, sy: SAFE.y + SAFE.h / 2 };
}
function SHOT(t, id, o = {}) { const r = PBY[id] || PAGES[id]; return { t, r, o }; }
const SHOTS = [
  SHOT(0, "cover", { z: 1.04 }),
  SHOT(EV.L1 - 0.7, "A1", { z: 1.0, to: { z: 1.12, zx: 0.52, zy: 0.5 } }),
  SHOT(EV.L3 - 0.35, "A2", { to: { z: 1.08, zy: 0.45 } }),
  SHOT(EV.L5 - 0.6, "A3", { to: { z: 1.1, zx: 0.56 } }),
  SHOT(EV.L7 - 0.35, "A4", { to: { z: 1.08, zy: 0.45 } }),
  SHOT(EV.E8 + 0.05, "B1", { zy: 0.6, to: { z: 1.06, zy: 0.62 } }),
  SHOT(EV.L10 - 0.3, "B2", { to: { z: 1.08, zx: 0.45 } }),
  SHOT(EV.L13 - 0.6, "B3", { to: { z: 1.08 } }),
  SHOT(EV.L15 - 0.55, "B4", { to: { z: 1.06, zx: 0.52 } }),
  SHOT(EV.E16 + 0.05, "C1", { z: 1.05, to: { z: 1.6, zx: 0.6 } }),
  SHOT(EV.L19 - 0.25, "C1", { z: 1.95, zx: 0.66, zy: 0.6, to: { z: 2.05, zx: 0.78, zy: 0.62 } }),
  SHOT(EV.L21 - 0.5, "C2", { z: 1.0, zy: 0.55, to: { z: 1.05, zy: 0.58 } }),
  SHOT(EV.L23 - 0.25, "C2", { z: 1.45, zy: 0.4, to: { z: 1.55, zy: 0.42 } }),
  SHOT(EV.L25 - 0.3, "C2", { z: 1.15, zy: 0.5 }),
  SHOT(EV.L26 - 0.35, "C3", { z: 1.05, to: { z: 1.2, zx: 0.6, zy: 0.45 } }),
  SHOT(EV.E28 + 0.05, "D1", { z: 1.0, to: { z: 1.06, zy: 0.48 } }),
  SHOT(EV.L31 - 0.45, "D2", { z: 1.25, zx: 0.35, to: { z: 1.7, zx: 0.8 } }),
  SHOT(EV.E32 + 0.05, "E1", { to: { z: 1.06 } }),
  SHOT(EV.L35 - 0.35, "E2", { to: { z: 1.06, zx: 0.55 } }),
  SHOT(EV.L36 - 0.3, "E3", { to: { z: 1.08, zx: 0.56 } }),
  SHOT(EV.E36 + 0.05, "F1", { z: 1.45, zx: 0.3, zy: 0.52, to: { z: 1.45, zx: 0.38, zy: 0.5 } }),
  SHOT(EV.L38 - 0.1, "F1", { z: 1.45, zx: 0.66, zy: 0.63, to: { z: 1.5, zx: 0.66, zy: 0.64 } }),
  SHOT(EV.L40 - 0.4, "F1", { z: 1.0 }),
  SHOT(EV.fin, "back", { full: true }),
];
function shotCam(s, t) {
  const t1 = SHOTS[SHOTS.indexOf(s) + 1]?.t ?? TOTAL_T;
  const a = fitCam(s.r, s.o);
  if (!s.o.to) return a;
  const b = fitCam(s.r, { ...s.o, ...s.o.to });
  const u = easeIO(inv(s.t + 0.3, t1, t));
  return { cx: lerp(a.cx, b.cx, u), cy: lerp(a.cy, b.cy, u), z: lerp(a.z, b.z, u), sy: a.sy };
}
const TOTAL_T = CFG.total;
// переход между кадрами: плавно (easeIO) с «отъездом» по дуге, длительность растёт с расстоянием
function camAt(t) {
  let i = 0;
  while (i + 1 < SHOTS.length && t >= SHOTS[i + 1].t) i++;
  const cur = shotCam(SHOTS[i], t);
  if (i === 0) return cur;
  // откуда едем — настоящее положение камеры в момент смены кадра (даже если прошлый переход не закончился)
  const prev = camAt(SHOTS[i].t - 1e-4);
  const dist = Math.hypot(cur.cx - prev.cx, cur.cy - prev.cy);
  const sd = dist * Math.max(prev.z, cur.z);   // путь в пикселях экрана
  const dur = clamp(0.45 + sd / 2600 + Math.abs(Math.log(cur.z / prev.z)) * 0.6, 0.45, 1.5);
  const u = inv(SHOTS[i].t, SHOTS[i].t + dur, t);
  if (u >= 1) return cur;
  const e = easeIO(u), arc = Math.sin(u * Math.PI) * clamp(sd / 4600, 0, 0.66);
  const z = Math.exp(lerp(Math.log(prev.z), Math.log(cur.z), e)) * (1 - arc);
  return { cx: lerp(prev.cx, cur.cx, e), cy: lerp(prev.cy, cur.cy, e), z, sy: lerp(prev.sy, cur.sy, e) };
}

// когда камера остановилась на задней обложке (конец перехода к последнему кадру)
let _backArr = null;
function backArrive() {
  if (_backArr !== null) return _backArr;
  const s0 = SHOTS[SHOTS.length - 1], fin = fitCam(s0.r, s0.o);
  _backArr = s0.t;
  for (let t = s0.t; t < s0.t + 3; t += 1 / 30) { const c = camAt(t); _backArr = t; if (Math.abs(c.z - fin.z) < 1e-4 && Math.hypot(c.cx - fin.cx, c.cy - fin.cy) < 0.5) break; }
  return _backArr;
}
