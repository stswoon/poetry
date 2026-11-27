// ---------- Кадр ----------
const cv = document.getElementById("scene");
const g = cv.getContext("2d", { alpha: false });
function probeCast() {
  reset(g); g.fillStyle = css(C.birch); g.fillRect(0, 0, W, H);
  const page = CFG.probePage | 0;
  const lab = (s, x, y) => { g.fillStyle = "#333"; g.font = "18px monospace"; g.textAlign = "center"; g.fillText(s, x, y); g.textAlign = "left"; };
  if (PROBE_PAGES[page]) return PROBE_PAGES[page](g, lab);
}
const PQ = new URLSearchParams(location.search);
const T_Q = PQ.has("t") ? +PQ.get("t") : 0;
let LAST_T = T_Q;
const seek = (t) => (CFG.probe ? probeCast() : render(g, t));
window.addEventListener("hf-seek", (e) => { LAST_T = e.detail.time; seek(LAST_T); });
seek(T_Q);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => seek(LAST_T));

const tl = gsap.timeline({ paused: true });
tl.set({}, {}, TOTAL);
window.__timelines = window.__timelines || {};
window.__timelines["main"] = tl;
