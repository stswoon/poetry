// ---------- Кадр: сцена по времени → снежная шторка на стыках → строки → бумага ----------
const cv = document.getElementById("scene");
const g = cv.getContext("2d", { alpha: false });
// границы сцен (начало каждой); сцена i идёт до начала i+1
const CUTS = () => [
  [0, scene0], [EV.L1 - 0.05, scene1], [EV.L7 - 0.15, scene2], [EV.L9 - 0.12, scene3], [EV.L13 - 0.12, scene4],
  [EV.L17 - 0.12, scene5], [EV.L21 - 0.12, scene6], [EV.L25 - 0.12, scene7], [EV.L29 - 0.12, scene8],
  [EV.L33 - 0.12, scene9], [EV.L37 - 0.12, scene10],
];
let _CUTS = null;
function sceneAt(t) {
  _CUTS = _CUTS || CUTS();
  let k = 0;
  for (let i = 0; i < _CUTS.length; i++) if (t >= _CUTS[i][0]) k = i;
  return k;
}
// шторка из снежных мазков через стык (без затемнения): мазки пролетают слева направо
function snowWipe(g, t, tc, dur = 0.45, seed = 0) {
  const u = inv(tc - dur / 2, tc + dur / 2, t);
  if (u <= 0 || u >= 1) return;
  reset(g);
  for (let i = 0; i < 14; i++) {
    const y = (i + 0.5) * H / 14 + (hash(i + seed) - 0.5) * 40;
    const lag = hash(i * 3 + seed) * 0.3;
    const p = clamp((u - lag) / 0.7);
    const x1 = lerp(-900, W + 900, p), x0 = x1 - 900 - hash(i * 5 + seed) * 500;
    brush(g, [[x0, y], [x1, y + (hash(i * 7) - 0.5) * 30]], 120 + hash(i * 2 + seed) * 70, C.white, seed + i, 0.5);
  }
}
function render(t) {
  reset(g);
  const k = sceneAt(t);
  _CUTS[k][1](g, t);
  reset(g);
  for (let i = 1; i < _CUTS.length; i++) if (i !== 2 && i !== 1) snowWipe(g, t, _CUTS[i][0], 0.42, 1000 + i * 17);
  reset(g);
  drawVerse(g, t);
  paperOver(g, 0.15);
}

// ---------- пробы героев ----------
function probeCast() {
  reset(g); g.fillStyle = css(C.snow); g.fillRect(0, 0, W, H);
  const page = CFG.probePage | 0;
  const lab = (s, x, y) => { g.fillStyle = "#333"; g.font = "18px monospace"; g.textAlign = "center"; g.fillText(s, x, y); };
  if (typeof PROBE_PAGES !== "undefined" && PROBE_PAGES[page]) return PROBE_PAGES[page](g, lab);
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
