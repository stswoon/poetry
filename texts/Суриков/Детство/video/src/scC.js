// ---------- Сцены 5–6: закат и вьюга (таймлапс), дорога домой ----------
// ходьба: фаза от пройденного пути, опорная нога идёт назад без проскальзывания
const KLEG = KID.TH + KID.SH;
function walkPose(dist, s, A = 0.36, base = {}) {
  const S = 4 * KLEG * Math.sin(A) * s;         // длина шага (полный цикл) при масштабе s
  const ph = dist / S * TAU;
  const leg = (p) => ({ a: A * Math.cos(p), b: 0.08 + 0.85 * Math.max(0, -Math.sin(p)) });
  const L0 = leg(ph), L1 = leg(ph + Math.PI);
  // высота таза по опорной ноге (у которой колено прямее)
  const st = L0.b < L1.b ? L0 : L1;
  const hipUp = (KLEG * Math.cos(st.a) + 11) * s;
  return { pose: { rot: 0, lean: 0.06, head: 0, ...base, legs: [L0, L1], arms: base.arms || [{ a: -0.35 * Math.cos(ph), b: 0.3 }, { a: 0.35 * Math.cos(ph), b: 0.3 }] }, hipUp, ph };
}

// ---- Сцена 5: солнце садится, поднимается вьюга, темнеет ----
function scene5(g, t) {
  const a = EV.L17 - 0.12, e = EV.L21;
  const u = inv(a, e - 0.2, t);
  const dusk = ease(inv(EV.selo - 0.5, EV.temno + 0.3, t));
  const storm = ease(inv(EV.vyuga - 0.4, EV.vyuga + 1.0, t));
  const top = dusk < 0.5 ? mix(C.sky, [214, 150, 170], dusk * 2) : mix([214, 150, 170], C.indigoD, (dusk - 0.5) * 2);
  const bot = dusk < 0.5 ? mix(C.skyW, [255, 170, 110], dusk * 2) : mix([255, 170, 110], C.violet, (dusk - 0.5) * 2);
  const cy = lerp(0, -70, ease(u));                // камера медленно поднимается
  const [sx, sy] = shake(t, 2 + storm * 7, 4, 17);
  skyFill(g, 0, 0, W, H, top, bot, 51, 0.5);
  // солнце садится за лес
  const sunY = lerp(360, 760, ease(inv(a, EV.selo + 0.8, t)));
  if (sunY < 760) { roughEll(g, 1340, sunY, 80, 80, 52, 0.04); paint(g, mix([255, 220, 150], [255, 120, 70], dusk), 53, 0, 0.3); }
  g.save(); g.translate(sx, sy - cy);
  farHills(g, 640, 0, dusk, 54);
  // деревня в долине: окна загораются к темноте
  for (let i = 0; i < 7; i++) drawIzba(g, 420 + i * 190, 720 + (i % 2) * 16, 0.32, t, { smoke: 1, wind: 20 + storm * 120, dusk: dusk * 0.9, lit: ease(inv(EV.temno - 0.6, EV.temno + 0.4, t)) * (0.6 + 0.4 * hash(i)) }, 300 + i * 13);
  // гора на переднем плане с длинными тенями
  roughPoly(g, [[-200, 820], [700, 790], [1300, 820], [2200, 780], [2200, 1300], [-200, 1300]], 55, 6);
  paint(g, mix(C.snow, C.snowD, dusk * 0.8), 56, 0, 0.5);
  for (let k = 0; k < 5; k++) brush(g, [[200 + k * 380, 850 + k % 2 * 20], [200 + k * 380 + lerp(80, 420, dusk), 880]], 26, mix(C.snowS, C.indigo, dusk), 57 + k, 0.4, 0.6);
  // ребята расходятся по домам (влево, маленькие)
  for (let k = 0; k < 2; k++) {
    const dist = Math.max(0, t - a - 0.3 - k * 0.4) * 110;
    const s = 0.42;
    const wp = walkPose(dist, s, 0.36, { arms: [{ a: 0.2, b: 0.3 }, { a: -0.2, b: 0.3 }], mouth: "smile" });
    const x = 1500 - k * 120 - dist;
    if (x > -100) drawKid(g, x, 825 - wp.hipUp, s, -1, wp.pose, k ? "f2" : "f3", 600 + k * 30);
  }
  g.restore();
  // вьюга: хлопья косо и полосы позёмки
  snowfall(g, t, Math.round(30 + storm * 190), -3 - storm * 9, 1 + storm * 1.5, 3 + storm * 2, 0.75, 58, storm > 0.2 ? 6 : 0);
  if (storm > 0) {
    g.save();
    for (let k = 0; k < 8; k++) {
      const y = 780 + k * 40, ph = ((t * (0.9 + hash(k)) + hash(k * 3)) % 1);
      g.globalAlpha = storm * 0.45 * Math.sin(ph * Math.PI);
      brush(g, [[W + 200 - ph * (W + 900), y], [W + 200 - ph * (W + 900) + 700, y - 30]], 40, C.white, 59 + k, 0.4);
    }
    g.restore();
  }
}

// ---- Сцена 6: мальчик бредёт домой сквозь вьюгу, тащит санки ----
function scene6(g, t) {
  const a = EV.L21 - 0.12, e = EV.L25;
  const s = 1.45;
  const dist = Math.max(0, t - a) * 95;            // нехотя: медленно
  const heroX = 600 + dist;                         // мировая x
  const camX = heroX - 760;
  const dusk = 1;
  const [sx, sy] = shake(t, 4, 3, 19);
  skyFill(g, 0, 0, W, H, C.indigoD, C.violet, 61, 0.5);
  // дальний план: деревня, окно дома приближается
  g.save(); g.translate(-camX * 0.25 + sx * 0.3, 0);
  for (let i = 0; i < 6; i++) drawIzba(g, 300 + i * 420, 560, 0.4, t, { smoke: 1, wind: 160, dusk: 0.9, lit: 0.6 }, 320 + i * 11);
  g.restore();
  // сугробы среднего плана
  g.save(); g.translate(-camX * 0.6 + sx * 0.5, 0);
  for (let k = 0; k < 8; k++) { const x = k * 520; roughPoly(g, [[x - 300, 700], [x - 80, 630 - hash(k) * 30], [x + 160, 640], [x + 340, 700]], 62 + k, 5); paint(g, mix(C.snowD, C.indigo, 0.35), 63 + k, 0, 0.5); }
  g.restore();
  // дом героя справа: тёплое окно ближе с каждым шагом
  g.save(); g.translate(-camX + sx, sy);
  drawIzba(g, 2650, 770, 1.2, t, { smoke: 1, wind: 200, dusk: 0.85, lit: 1 }, 333);
  // дорога
  roughPoly(g, [[-400, 690], [4000, 680], [4000, 1300], [-400, 1300]], 64, 5); paint(g, mix(C.snowS, C.indigo, 0.3), 65, 0, 0.5, 1, 1.6);
  // кочки и позёмка на дороге — неподвижны в мире, бегут назад вместе с землёй
  for (let k = Math.floor((camX - 300) / 150); k < (camX + W + 300) / 150; k++) { const x = k * 150 + hash(k) * 60; brush(g, [[x, 720 + hash(k * 3) * 200], [x + 40 + hash(k * 5) * 60, 722 + hash(k * 3) * 200]], 8 + hash(k * 7) * 10, mix(C.snowD, C.indigo, 0.45), 640 + k, 0.4, 0.8); }
  // следы позади героя
  for (let k = 0; k < 40; k++) { const fx = Math.floor(heroX / 55) * 55 - k * 55; if (fx < heroX - 40) { roughEll(g, fx, 772 + (k % 2) * 14, 16, 6, 66 + k, 0.2); g.fillStyle = css(C.indigo, 0.35); g.fill(); } }
  // санки на верёвке позади
  const sledX = heroX - 300, sledY = 752 + Math.sin(t * 5) * 2;
  drawSled(g, sledX, sledY, 1.1, 0, 70, 1);
  // герой: идёт вправо, сутулится, руки прямые (не согнёшь), ближняя держит верёвку
  const wp = walkPose(dist, s, 0.3, { lean: 0.2, head: 0.18, arms: [{ a: -0.55, b: 0.1 }, { a: 0.12, b: 0.1 }], mouth: "sad", eyes: "open" });
  const hipY = 775 - wp.hipUp;
  // верёвка: ровная, чуть провисшая, от варежки за спиной к загибу полоза (рисуется до героя — варежка поверх)
  const pre = drawKidHandOnly(heroX, hipY, s, 1, wp.pose);
  const nose = [sledX + 95 * 1.1, sledY - 10 * 1.1];
  g.strokeStyle = css(C.linenD); g.lineWidth = 5; g.lineCap = "round";
  g.beginPath(); g.moveTo(pre[0], pre[1]); g.quadraticCurveTo((pre[0] + nose[0]) / 2, (pre[1] + nose[1]) / 2 + 16, nose[0], nose[1]); g.stroke();
  drawKid(g, heroX, hipY, s, 1, wp.pose, "hero", 100);
  // пар изо рта
  const pu = (t * 0.8) % 1;
  g.save(); g.globalAlpha = (1 - pu) * 0.6; roughEll(g, heroX + 70 * s + pu * 60, hipY - 120 * s - pu * 30, 14 + pu * 30, 10 + pu * 20, 68, 0.2); paint(g, C.white, 69, 0, 0.3); g.restore();
  g.restore();
  // метель поверх
  snowfall(g, t, 230, -10, 2.4, 4.5, 0.8, 71, 6);
}
