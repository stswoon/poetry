// ---------- Косец: low-poly человек с косой. Позы: «косит» (фаза взмаха) и «поёт у костра» ----------
// P — точка между ступнями на земле в начале; h — курс (куда идёт и косит); kind — 0/1/2 (шляпа, борода, цвет)
const MOW_STEP = 0.45;
const SKIN = [232, 186, 150], SHIRT = [242, 238, 228], TROUS = [70, 78, 104], BAST = [184, 156, 100], WOOD = [150, 108, 68], METAL = [214, 222, 232];
const rotY = (v, a) => [v[0] * Math.cos(a) + v[2] * Math.sin(a), v[1], -v[0] * Math.sin(a) + v[2] * Math.cos(a)];
// поза косьбы: возвращает суставы в мире
function mowPose(P, h, tt, kind) {
  const per = 1.55 + kind * 0.07;
  const ph = tt / per + kind * 0.31, cyc = Math.floor(ph), u = ph - cyc;
  let th, bh;
  if (u < 0.55) { th = lerp(50, -50, easeIO(u / 0.55)); bh = 0.06; }
  else { const v = (u - 0.55) / 0.45; th = lerp(-50, 50, easeIO(v)); bh = 0.06 + 0.2 * Math.sin(Math.PI * v); }
  th *= DEG;
  const adv = cyc * MOW_STEP + (u >= 0.55 ? MOW_STEP * easeIO((u - 0.55) / 0.45) : 0);
  const fStep = (a, b) => cyc * MOW_STEP + (u >= a ? MOW_STEP * easeIO(clamp((u - a) / (b - a))) : 0);
  const lift = (a, b) => (u > a && u < b ? 0.09 * Math.sin(Math.PI * (u - a) / (b - a)) : 0);
  const W2 = (lx, ly, lz) => { const v = rotY([lx, ly, lz], h); return [P[0] + v[0], P[1] + v[1], P[2] + v[2]]; };
  const footR = W2(0.2, lift(0.58, 0.76), fStep(0.58, 0.76) - 0.12), footL = W2(-0.17, lift(0.78, 0.96), fStep(0.78, 0.96) + 0.2);
  const pel = W2(0, 0.84, adv + 0.04);
  return buildBody(P, h, { pel, footR, footL, twist: th * 0.8, hipTw: th * 0.35, lean: 24 * DEG, sideLean: 0, scy: { th, bh, adv }, kind, mode: "mow" });
}
// поза у костра: стоит, покачивается, поёт; правой рукой держит косу стоймя, левой машет или прижимает к груди
function singPose(P, h, tt, kind) {
  const W2 = (lx, ly, lz) => { const v = rotY([lx, ly, lz], h); return [P[0] + v[0], P[1] + v[1], P[2] + v[2]]; };
  const sw = Math.sin(tt * 2.4 + kind * 1.7);
  const pel = W2(sw * 0.04, 0.89, 0);
  return buildBody(P, h, { pel, footR: W2(0.17, 0, -0.02), footL: W2(-0.17, 0, 0.05), twist: 0, hipTw: 0, lean: 1 * DEG, sideLean: sw * 4 * DEG, kind, mode: "sing", tt });
}
function buildBody(P, h, o) {
  const up = [0, 1, 0];
  const fwd0 = [Math.sin(h), 0, Math.cos(h)];
  const fT = rotY([0, 0, 1], h + o.twist), rT = rotY([1, 0, 0], h + o.twist);
  // ось туловища: наклон вперёд и вбок
  let ax = vadd(vsc(up, Math.cos(o.lean)), vsc(fT, Math.sin(o.lean)));
  ax = vnorm(vadd(ax, vsc(rT, Math.sin(o.sideLean))));
  const pel = o.pel;
  const neck = vadd(pel, vsc(ax, 0.5));
  const side = vnorm(vsub(rT, vsc(ax, vdot(rT, ax))));
  const front = vcross(side, ax);
  const shR = vadd(neck, vadd(vsc(side, 0.19), vsc(ax, -0.05))), shL = vadd(neck, vadd(vsc(side, -0.19), vsc(ax, -0.05)));
  const rH = rotY([1, 0, 0], h + o.hipTw);
  const hipR = vadd(pel, vsc(rH, 0.1)), hipL = vadd(pel, vsc(rH, -0.1));
  const ankR = vadd(o.footR, [0, 0.08, 0]), ankL = vadd(o.footL, [0, 0.08, 0]);
  const kneeR = ik3(hipR, ankR, 0.44, 0.42, vadd(vlerp(hipR, ankR, 0.5), vadd(vsc(fwd0, 2), vsc(rH, 0.4)))), kneeL = ik3(hipL, ankL, 0.44, 0.42, vadd(vlerp(hipL, ankL, 0.5), vadd(vsc(fwd0, 2), vsc(rH, -0.4))));
  const head = vadd(neck, vadd(vsc(ax, 0.17), vsc(front, 0.03)));
  let handR, handL, scy = null;
  if (o.mode === "mow") {
    const { th, bh } = o.scy;
    const base = [pel[0], P[1], pel[2]];
    const S = (lx, ly, lz) => { const v = rotY([lx, ly, lz], h + th); return [base[0] + v[0], base[1] + v[1], base[2] + v[2]]; };
    const B = S(0.5, bh, 1.4), T = S(-0.06, 0.96, 0.42);
    handL = T; handR = vadd(vlerp(T, B, 0.25), [0, 0.03, 0]);
    scy = { top: vadd(T, vsc(vnorm(vsub(T, B)), 0.08)), B, peg: handR, blade: [B, S(0.56, bh + 0.01, 1.46), S(0.22, bh + 0.01, 1.58), S(-0.12, bh + 0.02, 1.68), S(-0.42, bh + 0.02, 1.86), S(-0.1, bh + 0.02, 1.76), S(0.2, bh + 0.01, 1.66), S(0.5, bh, 1.5)] };
  } else {
    const W2 = (lx, ly, lz) => { const v = rotY([lx, ly, lz], h); return [P[0] + v[0], P[1] + v[1], P[2] + v[2]]; };
    // косы отложены: поют и машут обеими руками над головой — руки видны с любой стороны
    const tt = o.tt, ph = tt * 3.1 + o.kind * 1.3;
    const wl = Math.sin(ph), wr = Math.sin(ph + 1.6 + o.kind * 0.4);
    handL = vadd(shL, vadd(vsc(side, -0.26 + wl * 0.12), vadd(vsc(ax, 0.44 - (o.kind === 1 ? 0.12 : 0)), vsc(front, 0.1))));
    handR = vadd(shR, vadd(vsc(side, 0.26 + wr * 0.12), vadd(vsc(ax, 0.38 + (o.kind === 2 ? 0.06 : 0)), vsc(front, 0.1))));
    scy = null;
  }
  const elbR = ik3(shR, handR, 0.34, 0.34, vadd(shR, vadd(vsc(side, 0.5), vadd(vsc(ax, -0.6), vsc(front, -0.1))))),
    elbL = ik3(shL, handL, 0.34, 0.34, vadd(shL, vadd(vsc(side, -0.5), vadd(vsc(ax, -0.6), vsc(front, -0.1)))));
  return { pel, neck, head, ax, side, front, shR, shL, elbR, elbL, handR, handL, hipR, hipL, kneeR, kneeL, ankR, ankL, footR: o.footR, footL: o.footL, fwd: fwd0, scy, kind: o.kind };
}
function drawMower(J, o = {}) {
  const k = J.kind;
  const sh = k === 2 ? [226, 214, 236] : SHIRT, belt = k === 1 ? [60, 110, 170] : [196, 50, 40];
  beginGroup(vlerp(J.footR, J.footL, 0.5), o.bias ?? 3.5);
  // ноги
  limb(J.hipR, J.kneeR, 0.08, 0.068, TROUS, { sides: 5, ...o });
  limb(J.kneeR, J.ankR, 0.068, 0.052, TROUS, { sides: 5, ...o });
  limb(J.hipL, J.kneeL, 0.08, 0.068, TROUS, { sides: 5, ...o });
  limb(J.kneeL, J.ankL, 0.068, 0.052, TROUS, { sides: 5, ...o });
  for (const [a, f] of [[J.ankR, J.footR], [J.ankL, J.footL]]) limb(vadd(a, vadd(vsc(J.fwd, -0.06), [0, -0.04, 0])), vadd(f, vadd(vsc(J.fwd, 0.17), [0, 0.035, 0])), 0.055, 0.045, BAST, { sides: 4, ...o });
  // рубаха навыпуск, пояс
  lathe(vadd(J.pel, vsc(J.ax, -0.2)), J.ax, [[0.2, 0], [0.175, 0.2], [0.19, 0.42], [0.2, 0.58], [0.15, 0.7], [0.06, 0.72]], 6, sh, { basis: [J.ax, J.side, J.front], sv: 0.78, cols: [mul(sh, 0.95), sh, sh, sh, sh], ...o });
  lathe(vadd(J.pel, vsc(J.ax, 0.04)), J.ax, [[0.183, 0], [0.183, 0.05]], 6, belt, { basis: [J.ax, J.side, J.front], sv: 0.8, cull: true, ...o });
  limb(J.neck, vadd(J.neck, vsc(J.ax, 0.08)), 0.05, 0.05, SKIN, { sides: 4, ...o });
  // голова, борода, шляпа
  blob(J.head, 0.105, 0.12, 0.11, SKIN, { sides: 6, basis: [J.ax, J.side, J.front], ...o });
  if (k === 1) blob(vadd(J.head, vadd(vsc(J.front, 0.07), vsc(J.ax, -0.08))), 0.08, 0.08, 0.05, [120, 84, 56], { sides: 5, basis: [J.ax, J.side, J.front], ...o });
  const hatC = vadd(J.head, vsc(J.ax, 0.06));
  if (k === 2) lathe(hatC, J.ax, [[0.12, 0], [0.12, 0.09], [0, 0.1]], 6, [70, 70, 84], { basis: [J.ax, J.side, J.front], ...o });
  else lathe(hatC, J.ax, [[0.25, 0], [0.25, 0.015], [0.13, 0.035], [0.12, 0.15], [0, 0.16]], 7, [228, 198, 122], { basis: [J.ax, J.side, J.front], cull: false, ...o });
  // руки: рукава рубахи до запястья, кисти
  for (const [s, e, hnd] of [[J.shR, J.elbR, J.handR], [J.shL, J.elbL, J.handL]]) {
    limb(s, e, 0.062, 0.056, sh, { sides: 5, ...o });
    const wrist = vadd(e, vsc(vnorm(vsub(hnd, e)), Math.max(0, vlen(vsub(hnd, e)) - 0.05)));
    limb(e, wrist, 0.056, 0.047, sh, { sides: 5, ...o });
    blob(hnd, 0.048, 0.05, 0.048, SKIN, { sides: 5, ...o });
  }
  // коса: косовище, ручка, лезвие
  const S = J.scy;
  if (S) {
    limb(S.top, S.B, 0.026, 0.022, WOOD, { sides: 4, ...o });
    if (S.peg) { const pd = vnorm(vcross(vsub(S.B, S.top), [0, 1, 0])); limb(S.peg, vadd(S.peg, vadd(vsc(pd, -0.1), [0, 0.06, 0])), 0.018, 0.016, WOOD, { sides: 3, ...o }); }
    face(S.blade, [236, 240, 246], { two: true, emis: 0.55, n: [0, 1, 0], ...o });
  }
  endGroup();
}
