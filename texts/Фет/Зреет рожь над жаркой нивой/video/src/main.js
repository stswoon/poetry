// ---------- Склейка: сцена → строки → холст → переходы ----------
const cv = document.getElementById("scene");
const g = cv.getContext("2d", { alpha: false });
const TOTAL = CFG.total;

// переход «порыв»: полоса мазков проносится слева направо и закрывает склейку; u 0…1 (0.5 — склейка)
function gustWipe(g, u, warm) {
  if (u <= 0 || u >= 1) return;
  const cx = lerp(-1300, W + 1300, u);
  for (let i = 0; i < 240; i++) {
    const row = i % 24, k = Math.floor(i / 24);
    const y = row * 48 - 20 + hash(i) * 20;
    const x = cx + (k - 5) * 120 + (hash(i * 3) - 0.5) * 120 + Math.sin(row * 0.7) * 120;
    dab(g, x, y, 260, 64, -0.08 + (hash(i * 5) - 0.5) * 0.2, jit(warm ? mix(C.cad, C.cream, hash(i * 7)) : mix(C.cerul, C.cream, hash(i * 7)), i, 30), 0.97);
  }
  reset(g);
}
// «вверх»: мазки летят снизу вверх (камера за змеем в небо)
function riseWipe(g, u) {
  if (u <= 0 || u >= 1) return;
  const cy = lerp(H + 1200, -1200, u);
  for (let i = 0; i < 240; i++) {
    const col = i % 20, k = Math.floor(i / 20);
    const x = col * 104 - 20 + hash(i) * 30;
    const y = cy + (k - 6) * 110 + (hash(i * 3) - 0.5) * 110 + Math.sin(col * 0.8) * 100;
    dab(g, x, y, 240, 70, -Math.PI / 2 + (hash(i * 5) - 0.5) * 0.2, jit(mix([240, 160, 120], [150, 130, 200], hash(i * 7)), i, 30), 0.97);
  }
  reset(g);
}
function flash(g, a) { if (a <= 0) return; reset(g); g.fillStyle = `rgba(255,236,170,${clamp(a).toFixed(3)})`; g.fillRect(0, 0, W, H); }

// наплыв: соседняя сцена рисуется в отдельный холст и проступает поверх (в момент склейки — 50 %)
const offC = document.createElement("canvas"); offC.width = W; offC.height = H;
const og = offC.getContext("2d", { alpha: false });
const FADE = 0.5;
function blendScene(j, t, a) {
  if (a <= 0 || j < 0 || j >= SCENES.length) return;
  reset(og); og.fillStyle = "#1a1430"; og.fillRect(0, 0, W, H);
  SCENES[j][0](og, t, t - SCENES[j][1]); reset(og);
  reset(g); g.globalAlpha = clamp(a); g.drawImage(offC, 0, 0); reset(g);
}
function wipePart(j, t, region) {
  if (j < 0 || j >= SCENES.length) return;
  reset(og); og.fillStyle = "#1a1430"; og.fillRect(0, 0, W, H);
  SCENES[j][0](og, t, t - SCENES[j][1]); reset(og);
  reset(g); g.save(); g.beginPath(); region(g); g.clip(); g.drawImage(offC, 0, 0); g.restore(); reset(g);
}
function render(t) {
  let i = 0;
  while (i + 1 < SCENES.length && t >= SCENES[i + 1][1]) i++;
  const [fn, start, kind] = SCENES[i];
  reset(g); g.globalCompositeOperation = "source-over";
  g.fillStyle = "#1a1430"; g.fillRect(0, 0, W, H);
  fn(g, t, t - start);
  reset(g);
  // шторка: за полосой мазков уже новая сцена, перед ней — ещё старая (обе рисуются, шов под полосой)
  const D = 0.65, next = SCENES[i + 1], till = next ? next[1] - t : 99, nk = next && next[2], u0 = t - start;
  const gx = (u) => lerp(-1300, W + 1300, u) - 60, ry = (u) => lerp(H + 1200, -1200, u) - 55;
  if (nk === "gust" && till < D / 2) wipePart(i + 1, t, (c) => c.rect(-10, -10, gx(0.5 - till / D) + 10, H + 20));
  if (kind === "gust" && u0 < D / 2) wipePart(i - 1, t, (c) => { const x = gx(0.5 + u0 / D); c.rect(x, -10, W - x + 10, H + 20); });
  if (nk === "rise" && till < D / 2) wipePart(i + 1, t, (c) => { const y = ry(0.5 - till / D); c.rect(-10, y, W + 20, H - y + 10); });
  if (kind === "rise" && u0 < D / 2) wipePart(i - 1, t, (c) => c.rect(-10, -10, W + 20, ry(0.5 + u0 / D) + 10));
  { const nx = SCENES[i + 1], tl = nx ? nx[1] - t : 99, u = t - start;
    if (nx && nx[2] === "fade" && tl < FADE / 2) blendScene(i + 1, t, ease(0.5 - tl / FADE) );
    if (kind === "fade" && u < FADE / 2) blendScene(i - 1, t, ease(0.5 - u / FADE)); }
  canvasGrain(g, 0.22);
  // вспышка — под подписью, чтобы строка не мигала
  if (kind === "flash") flash(g, 0.85 * (1 - (t - start) / 0.35));
  if (SCENES[i + 1] && SCENES[i + 1][2] === "flash" && SCENES[i + 1][1] - t < 0.12) flash(g, 0.85 * (1 - (SCENES[i + 1][1] - t) / 0.12));
  drawVerse(g, t);
  // полоса мазков поверх шва
  if (kind === "gust" && u0 < D / 2) gustWipe(g, 0.5 + u0 / D, i !== 6);
  if (nk === "gust" && till < D / 2) gustWipe(g, 0.5 - till / D, i + 1 !== 6);
  if (kind === "rise" && u0 < D / 2) riseWipe(g, 0.5 + u0 / D);
  if (nk === "rise" && till < D / 2) riseWipe(g, 0.5 - till / D);
  if (t < 0.25) { reset(g); g.fillStyle = `rgba(26,20,48,${(1 - t / 0.25).toFixed(3)})`; g.fillRect(0, 0, W, H); }
  if (t > TOTAL - 0.7) { reset(g); g.fillStyle = `rgba(26,20,48,${clamp((t - TOTAL + 0.7) / 0.6).toFixed(3)})`; g.fillRect(0, 0, W, H); }
  reset(g);
}

// ---------- Проба: все позы мальчика крупно ----------
function probeBoy() {
  reset(g); g.fillStyle = "#e9dcc0"; g.fillRect(0, 0, W, H);
  g.fillStyle = "#333"; g.font = "22px monospace";
  // бег: 8 фаз цикла + прыжок
  for (let k = 0; k < 8; k++) {
    const x = 120 + k * 230, y = 330;
    g.strokeStyle = "#999"; g.beginPath(); g.moveTo(x - 100, y); g.lineTo(x + 100, y); g.stroke();
    drawBoySide(g, x, y, 1, 1, { kind: "run", dist: k / 8 * STRIDE, holdRel: [-50, -30] }, k * 0.1);
    reset(g); g.fillStyle = "#333"; g.font = "22px monospace"; g.fillText(`run ${k}/8`, x - 50, y + 40);
  }
  const extra = [
    ["jump", { kind: "run", dist: STRIDE * 0.3, jump: 62, holdRel: [-50, -30] }],
    ["stand", { kind: "stand", look: 1, holdRel: [-50, -30] }],
  ];
  extra.forEach(([lab, o], k) => {
    const x = 160 + k * 260, y = 720;
    g.strokeStyle = "#999"; g.beginPath(); g.moveTo(x - 100, y); g.lineTo(x + 100, y); g.stroke();
    drawBoySide(g, x, y, 1, 1, o, 0);
    reset(g); g.fillStyle = "#333"; g.font = "22px monospace"; g.fillText(lab, x - 40, y + 40);
  });
  [[0, 1, false], [0.5, 1, false], [1, 1, false], [0.85, 1, true], [0.85, 0, true]].forEach(([arms, eyes, lie], k) => {
    const x = 760 + k * 250, y = 720;
    drawBoyFront(g, x, y, 0.95, { arms, eyes, lie, smile: 1, tilt: lie ? -0.08 : 0.12, lookUp: 1 }, k * 0.7);
    reset(g); g.fillStyle = "#333"; g.font = "22px monospace"; g.fillText(`front a${arms}${lie ? " lie" : ""} e${eyes}`, x - 90, y + 40);
  });
  drawFaceClose(g, 1700, 940, 0.25, 0, { lookY: 1, moon: 1 });
}

const PQ = new URLSearchParams(location.search);
const T_Q = PQ.has("t") ? +PQ.get("t") : 0;
let LAST_T = T_Q;
const seek = (t) => (CFG.probe === "boy" ? probeBoy() : render(t));
window.addEventListener("hf-seek", (e) => { LAST_T = e.detail.time; seek(LAST_T); });
seek(T_Q);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => seek(LAST_T));

const tl = gsap.timeline({ paused: true });
tl.set({}, {}, TOTAL);
window.__timelines = window.__timelines || {};
window.__timelines["main"] = tl;
