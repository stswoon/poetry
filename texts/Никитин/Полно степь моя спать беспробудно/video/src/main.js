// ---------- Склейка: небо → рельеф и предметы → экранные слои → строки → заголовок ----------
const cv = document.getElementById("scene");
const g = cv.getContext("2d", { alpha: false });
const TOTAL = CFG.total;
const T_TITLE_IN = 0.15, T_TITLE_OUT = 2.75;
initWorld();

function vignette(g, k = 0.3) {
  reset(g);
  const vg = g.createRadialGradient(W / 2, H / 2, 560, W / 2, H / 2, 1240);
  vg.addColorStop(0, "rgba(10,14,30,0)"); vg.addColorStop(1, `rgba(10,14,30,${k})`);
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
}
function render(t) {
  reset(g);
  setLight(t);
  setCam(camAt(t));
  MIST.on = t > EV.prohl - 0.8 ? 1 : 0;
  MIST.col = mix(LIGHT.fog, [252, 246, 252], 0.3);
  CLOUDS = cloudList(t);
  drawSky(g, t);
  drawScene(t);
  reset(g);
  drawFaces(g);
  drawOverlays(g, t);
  vignette(g, 0.26 + 0.2 * LIGHT.night);
  drawVerse(g, t);
  if (t < T_TITLE_OUT + 0.5) {
    const out = easeIn(inv(T_TITLE_OUT, T_TITLE_OUT + 0.45, t));
    drawTitle(g, t, W / 2, 230 - out * 80, 92, 1 - out, T_TITLE_IN);
  }
  if (t >= EV.fin) drawTitle(g, t, W / 2, 300, 104, 1, EV.fin);
  reset(g);
  if (t > TOTAL - 0.6) { g.fillStyle = `rgba(14,20,40,${clamp((t - TOTAL + 0.6) / 0.5).toFixed(3)})`; g.fillRect(0, 0, W, H); }
  reset(g);
}

// ---------- Проба: герои во всех позах через весь ролик (крупно, на нейтральном фоне) ----------
function probeCell(drawFn, x, y, sc, camRel, target, label) {
  // камера смотрит на target с относительной точки camRel [dx, dy, dz]
  const p = vadd(target, camRel);
  const d = vsub(target, p);
  setCam({ x: p[0], y: p[1], z: p[2], yaw: Math.atan2(d[0], d[2]), pitch: Math.atan2(d[1], Math.hypot(d[0], d[2])), roll: 0 });
  drawFn();
  g.setTransform(sc, 0, 0, sc, x - W / 2 * sc, y - H / 2 * sc);
  drawFaces(g);
  reset(g);
  g.fillStyle = "#333"; g.font = "18px monospace"; g.textAlign = "center"; g.fillText(label, x, y + H / 2 * sc - 8);
}
function probeCast() {
  reset(g); g.fillStyle = "#e9ecef"; g.fillRect(0, 0, W, H);
  Object.assign(LIGHT, { dir: vnorm([0.5, 0.8, 0.3]), sun: [255, 246, 230], amb: [150, 160, 180], fog: [233, 236, 239], fogNear: 1e5, fogFar: 2e5, point: null, night: 0 });
  MIST.on = 0;
  const page = CFG.probePage | 0;
  if (page === 0 || page === 1) {
    // косцы: моменты строфы 6 из ролика; page 1 — вид спереди-сбоку
    const ts = [];
    for (let k = 0; k < 12; k++) ts.push(lerp(EV.L21 - 0.5, EV.raspev, k / 11));
    ts.forEach((tt, k) => {
      const M = MOWERS[k % 3];
      const J = mowPose(M.P, M.h, tt - EV.L21 + 2, M.k);
      const tgt = vadd(J.pel, [0, -0.05, 0]);
      const rel = page === 0 ? vadd(vsc([Math.sin(M.h + 1.2), 0, Math.cos(M.h + 1.2)], 2.3), [0, 1.3, 0]) : vadd(vsc([Math.sin(M.h + 0.3), 0, Math.cos(M.h + 0.3)], 2.3), [0, 0.9, 0]);
      probeCell(() => drawMower(J, { bias: 0 }), 160 + (k % 6) * 320, k < 6 ? 270 : 810, 0.3, rel, tgt, `косец ${M.k} t=${tt.toFixed(2)}`);
    });
  } else if (page === 2) {
    // певцы у костра во время облёта
    const ts = [];
    for (let k = 0; k < 12; k++) ts.push(lerp(EV.raspev, ORB.t1, k / 11));
    ts.forEach((tt, k) => {
      const S = SINGERS[k % 3];
      const J = singPose(S.P, S.h, tt, S.k);
      const ang = S.h + (k < 6 ? 0.5 : -0.9);
      const rel = vadd(vsc([Math.sin(ang), 0, Math.cos(ang)], 2.6), [0, 1.0, 0]);
      probeCell(() => drawMower(J, { bias: 0 }), 160 + (k % 6) * 320, k < 6 ? 270 : 810, 0.3, rel, vadd(J.pel, [0, 0.1, 0]), `певец ${S.k} t=${tt.toFixed(2)}`);
    });
  } else if (page === 4) {
    // грач: стоит на земле (2 ноги, крылья сложены) и взлетает; дрон — на земле и в полёте
    for (let k = 0; k < 6; k++) {
      const C = [0, 50.3, 0];
      probeCell(() => { smallBird(C, k * 1.05, 0, 2.2, { sit: true, legs: true, col: [36, 36, 44], beak: [190, 190, 196] }); }, 160 + k * 320, 270, 0.3, [1.2 * Math.sin(k), 0.5, 1.2 * Math.cos(k)], vadd(C, [0, -0.12, 0]), `грач стоит ракурс ${k}`);
      const D = { pos: [0, 50, 0], yaw: 0, tilt: k > 2 ? -0.3 : 0, roll: 0 };
      probeCell(() => drawDrone(k * 0.4, D), 160 + k * 320, 810, 0.3, [1.6 * Math.sin(k * 1.1 + 0.5), 0.6, 1.6 * Math.cos(k * 1.1 + 0.5)], D.pos, `дрон t=${(k * 0.4).toFixed(1)}`);
    }
  } else {
    // журавль и маленькие птицы во всех фазах взмаха
    for (let k = 0; k < 6; k++) {
      const C = [0, 50, 0];
      probeCell(() => crane(C, 0, k / 6 * TAU, 0.72), 160 + k * 320, 270, 0.3, [3.2, 0.8, 1.2], C, `журавль фаза ${k}/6`);
      probeCell(() => smallBird(C, 0.5, k / 6 * TAU, 2.4, { crest: k > 2 }), 160 + k * 320, 810, 0.3, [1.3, 0.6, 0.8], C, `птица фаза ${k}/6`);
    }
  }
}

const PQ = new URLSearchParams(location.search);
const T_Q = PQ.has("t") ? +PQ.get("t") : 0;
let LAST_T = T_Q;
const seek = (t) => (CFG.probe ? probeCast() : render(t));
window.addEventListener("hf-seek", (e) => { LAST_T = e.detail.time; seek(LAST_T); });
seek(T_Q);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => seek(LAST_T));

const tl = gsap.timeline({ paused: true });
tl.set({}, {}, TOTAL);
window.__timelines = window.__timelines || {};
window.__timelines["main"] = tl;
