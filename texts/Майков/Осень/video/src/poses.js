// ---------- Позы героя для сцен ----------
// hands — смещение кисти от плеча (x вперёд, y вниз), feet — ступня от бедра по x и высота подошвы над землёй.
// farFront: дальняя рука перед пальто (обнимает себя, держит книгу) — тогда она рисуется поверх туловища.
function P0(o) { return Object.assign(poseStand(0), o); }

// топнуть: k 0…1 — нога поднимается, потом бьёт по земле
function poseStomp(k) {
  const up = k < 0.55 ? smooth(k / 0.55) : 1 - smooth((k - 0.55) / 0.12);
  return P0({ hipY: 10.2 - (k > 0.6 && k < 0.8 ? 0.8 : 0), lean: 0.05, feet: [[-1.8, 0], [2.6 + up * 0.8, up * 4.6]],
    hands: [[-2.8, 5.2 - up * 2], [3.2, 5.4 - up * 2.4]], elbows: ["down", "down"], mouth: up > 0.3 ? "open" : "smile", blush: 0.8 });
}
// пинок: замах назад, нога выстреливает вперёд-вверх
function poseKick(k) {
  const wind = k < 0.35 ? smooth(k / 0.35) : 1 - smooth((k - 0.35) / 0.15);
  const out = k < 0.35 ? 0 : k < 0.6 ? smooth((k - 0.35) / 0.25) : 1 - smooth((k - 0.7) / 0.3);
  return P0({ hipY: 9.2, lean: -0.08 * out + 0.06 * wind, feet: [[-1.2, 0], [lerp(-1, -4.5, wind) + out * 7.5, wind * 2.5 + out * 5.5]],
    hands: [[2.8 * out - 1.5, 5.4 - out * 2.5], [-2.6 * out + 0.6, 5.8]], elbows: ["down", "back"], mouth: out > 0.3 ? "open" : "smile", blush: 0.9 });
}
// развёл руками: «нет ничего»
function poseShrug(k) {
  const u = smooth(k);
  return P0({ hipY: 10.2, lean: -0.02, feet: [[-2, 0], [2, 0]],
    hands: [[lerp(-0.6, -4.2, u), lerp(7.6, 3.2, u)], [lerp(1, 4.6, u), lerp(7.6, 3.0, u)]], elbows: ["down", "down"],
    mouth: "sad", blush: 0.4, tilt: 0.2 * u });
}
// присел у кочки, ближняя рука тянется вниз
function poseCrouch(k, reach) {
  const u = smooth(k), r = reach === undefined ? 1 : reach;
  return P0({ hipY: lerp(10.2, 5.6, u), lean: lerp(0.02, 0.55, u), feet: [[-2.6, 0], [2.8, 0]],
    hands: [[lerp(-0.6, -5.4, u), lerp(7.6, 2.6, u)], [lerp(1, 5.6 + r, u), lerp(7.6, 6.6 + r * 1.4, u)]], elbows: ["down", "down"],
    mouth: "o", blush: 0.6, tilt: 0.3 * u });
}
// поскользнулся на инее: нога уезжает вперёд, руки машут
function poseSlip(k, t) {
  const u = Math.sin(Math.PI * clamp(k)), fl = Math.sin(t * 18) * 1.6 * u;
  return P0({ hipY: lerp(10.2, 8.2, u), lean: -0.32 * u, feet: [[-2.2 - u, 0], [2 + u * 4.5, u * 1.4]],
    hands: [[-2 - u * 2, 7.6 - u * 11 + fl], [1 + u * 2.5, 7.6 - u * 12 - fl]], elbows: ["down", "down"], mouth: u > 0.3 ? "o" : "smile", blush: 0.8 });
}
// ёжится от холода: обнял себя, дрожит
function poseShiver(k, t) {
  const u = smooth(k), sh = Math.sin(t * 40) * 0.35 * u;
  return P0({ hipY: 9.2, lean: 0.06 + sh * 0.05, feet: [[-1.2, 0], [1.2, 0]], farFront: u > 0.12,
    hands: [[lerp(-0.6, 7.8, u), lerp(7.6, 3.0, u)], [lerp(1, -3.6, u), lerp(7.6, 4.4, u)]], elbows: ["down", "down"],
    mouth: "sad", blush: 1, tilt: -0.6 * u });
}
// смотрит вверх, на небо
function poseLookUp(k) {
  return P0({ tilt: -1.4 * smooth(k), mouth: "o", blush: 0.9, hands: [[-1.2, 7.4], [1.6, 7.4]] });
}
// поёт: руки вверх, рот открыт, глаза-дуги
function poseSing(k, t) {
  const u = smooth(k), sw = Math.sin(t * 7) * 0.8;
  return P0({ hipY: 10.2, lean: -0.12 * u, feet: [[-2.2, 0], [2.2, 0]],
    hands: [[lerp(-0.6, -2.6 + sw, u), lerp(7.6, -6.4, u)], [lerp(1, 3.2 - sw, u), lerp(7.6, -6.6, u)]], elbows: ["down", "down"],
    mouth: "open", eyes: "happy", blush: 1, tilt: -0.5 * u, scarfWave: 0.8 });
}
// наклонился сорвать цветок
function posePick(k) {
  const u = smooth(k);
  return P0({ hipY: lerp(10.2, 8.2, u), lean: lerp(0.02, 0.85, u), feet: [[-2.2, 0], [2.4, 0]],
    hands: [[lerp(-0.6, -5.4, u), lerp(7.6, 1.4, u)], [lerp(1, 4.2, u), lerp(7.6, 9.6, u)]], elbows: ["down", "back"], mouth: "smile", blush: 0.7, tilt: 0.4 * u });
}
// сидит (на куче листьев, у окна): ноги вперёд, колени вверх
function poseSit(t, book) {
  const br = Math.sin(t * 2.2) * 0.2;
  return P0({ hipY: 2.2, lean: -0.06 + br * 0.05, feet: [[4.4, 0], [7.8, 0]], farFront: !!book, legsFront: true,
    hands: book ? [[9.6, 3.0], [8.2, 3.6]] : [[-2.4, 7.0], [3.8, 5.2 + br]], elbows: ["down", "down"],
    mouth: "smile", eyes: book ? "happy" : "open", blush: 0.8, scarfWave: 0.2, knee: "up" });
}
