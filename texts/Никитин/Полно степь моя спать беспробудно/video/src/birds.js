// ---------- Птицы: журавли клином, стайки «гостей», жаворонок ----------
// базис птицы: f — вперёд (по курсу h и тангажу p), u — вверх, r — вправо
function birdBasis(h, p = 0) {
  const f = [Math.sin(h) * Math.cos(p), Math.sin(p), Math.cos(h) * Math.cos(p)];
  const r = [Math.cos(h), 0, -Math.sin(h)];
  const u = vcross(f, r);   // вверх: f × r (r × f смотрит вниз — птица была бы вверх ногами)
  return { f, u: vnorm(u), r };
}
const at = (C, B, x, y, z, s = 1) => [C[0] + (B.r[0] * x + B.u[0] * y + B.f[0] * z) * s, C[1] + (B.r[1] * x + B.u[1] * y + B.f[1] * z) * s, C[2] + (B.r[2] * x + B.u[2] * y + B.f[2] * z) * s];

// Журавль: серое тело, чёрная шея, красная шапочка, ноги вытянуты назад, два крыла (плечо + кисть с чёрными маховыми)
function crane(C, h, flap, s = 0.8, o = {}) {
  const B = birdBasis(h, o.pitch || 0);
  const grey = [176, 182, 192], dark = [52, 54, 60], black = [34, 34, 40];
  const body = (x, y, z) => at(C, B, x, y, z, s);
  // тело — веретено вдоль f
  lathe(body(0, 0, -0.55), B.f, [[0, 0], [0.13 * s, 0.2 * s], [0.18 * s, 0.55 * s], [0.14 * s, 0.85 * s], [0, 1.05 * s]], 6, grey, { basis: [B.f, B.r, B.u], ...o });
  // хвост
  face([body(-0.08, 0.02, -0.5), body(0.08, 0.02, -0.5), body(0, 0.0, -0.78)], dark, { two: true, ...o });
  // шея, голова, шапочка, клюв
  limb(body(0, 0.06, 0.4), body(0, 0.14, 1.0), 0.06 * s, 0.04 * s, black, { sides: 4, ...o });
  blob(body(0, 0.15, 1.06), 0.065 * s, 0.06 * s, 0.08 * s, dark, { sides: 5, basis: [B.u, B.r, B.f], ...o });
  face([body(-0.03, 0.2, 1.02), body(0.03, 0.2, 1.02), body(0, 0.22, 1.1)], [210, 40, 40], { two: true, emis: 0.3, ...o });
  limb(body(0, 0.14, 1.12), body(0, 0.12, 1.32), 0.022 * s, 0.006 * s, [80, 86, 70], { sides: 3, ...o });
  // ноги: две, вытянуты назад за хвост
  for (const sx of [-1, 1]) limb(body(sx * 0.06, -0.06, -0.35), body(sx * 0.05, -0.1, -1.2), 0.022 * s, 0.016 * s, black, { sides: 3, ...o });
  // крылья
  const a1 = 0.08 + Math.sin(flap) * 0.62, a2 = a1 * 1.35 - 0.05 + Math.sin(flap - 0.6) * 0.15;
  for (const sx of [-1, 1]) {
    const S0 = [sx * 0.1, 0.05, 0.22], S1 = [sx * 0.1, 0.05, -0.22];
    const ex = sx * (0.1 + 0.78 * Math.cos(a1)), ey = 0.05 + 0.78 * Math.sin(a1);
    const E0 = [ex, ey, 0.2], E1 = [ex, ey, -0.3];
    const tx = ex + sx * 0.9 * Math.cos(a2), ty = ey + 0.9 * Math.sin(a2);
    const T0 = [tx, ty, 0.02], T1 = [tx, ty, -0.32];
    const P = (q) => body(q[0], q[1], q[2]);
    face([P(S0), P(E0), P(E1), P(S1)], grey, { two: true, ...o });
    face([P(E0), P(T0), P(T1), P(E1)], black, { two: true, ...o });
  }
}
// Маленькая птица (жаворонок/овсянка): тело, голова, клюв, хвост, два крыла; sit — сидит, крылья сложены
function smallBird(C, h, flap, s = 1, o = {}) {
  const B = birdBasis(h, o.pitch || 0);
  const P = (x, y, z) => at(C, B, x, y, z, s);
  const brown = o.col || [150, 116, 82], belly = o.belly || [222, 204, 170], dark = o.dark || [80, 62, 48];
  lathe(P(0, 0, -0.12), B.f, [[0, 0], [0.06 * s, 0.05 * s], [0.07 * s, 0.13 * s], [0.05 * s, 0.2 * s], [0, 0.24 * s]], 6, brown, { basis: [B.f, B.r, B.u], cols: [belly, brown, brown, brown], ...o });
  blob(P(0, 0.05, 0.14), 0.05 * s, 0.05 * s, 0.055 * s, brown, { sides: 5, basis: [B.u, B.r, B.f], ...o });
  face([P(-0.015, 0.05, 0.18), P(0.015, 0.05, 0.18), P(0, 0.04, 0.24)], o.beak || [230, 190, 90], { two: true, ...o });
  if (o.legs) for (const sx of [-1, 1]) {
    limb(P(sx * 0.025, -0.04, 0.0), P(sx * 0.028, -0.13, 0.01), 0.008 * s, 0.007 * s, [60, 60, 66], { sides: 3, ...o });
    face([P(sx * 0.028 - 0.012, -0.128, -0.01), P(sx * 0.028 + 0.012, -0.128, -0.01), P(sx * 0.028, -0.128, 0.05)], [60, 60, 66], { two: true, n: [0, 1, 0], ...o });
  }
  if (o.crest) face([P(-0.01, 0.09, 0.13), P(0.01, 0.09, 0.13), P(0, 0.15, 0.08)], dark, { two: true, ...o });
  face([P(-0.04, 0.01, -0.1), P(0.04, 0.01, -0.1), P(0.03, 0.03, -0.26), P(-0.03, 0.03, -0.26)], dark, { two: true, ...o });
  for (const sx of [-1, 1]) {
    if (o.sit) { face([P(sx * 0.06, 0.04, 0.06), P(sx * 0.065, 0.03, -0.16), P(sx * 0.03, 0.06, -0.12)], dark, { two: true, ...o }); continue; }
    const a = Math.sin(flap) * 0.9 + 0.15;
    const ex = sx * (0.05 + 0.24 * Math.cos(a)), ey = 0.03 + 0.24 * Math.sin(a);
    face([P(sx * 0.05, 0.03, 0.07), P(ex, ey, 0.02), P(ex * 1.05, ey, -0.08), P(sx * 0.05, 0.03, -0.06)], dark, { two: true, ...o });
  }
}
