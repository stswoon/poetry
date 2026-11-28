// ---------- Кадр: сцена (на переходе — вторая сквозь растекающееся пятно) → бумага «умножением» → строки ----------
const cv = document.getElementById("scene");
const g = cv.getContext("2d", { alpha: false });
let BUF2 = null;
function render(t) {
  SPR = SPR || bakeSprites();
  reset(g);
  g.fillStyle = P.paper; g.fillRect(0, 0, W, H);
  let cur = SC.length - 1;
  for (let i = 0; i < SC.length; i++) if (t < SC[i].b) { cur = i; break; }
  const s = SC[cur], prev = SC[cur - 1];
  const bp = prev ? inv(s.a, s.a + BLOOM, t) : 1;
  if (bp < 1) {
    // уходящая сцена дорисовывается своим временем, новая проступает пятном из точки o
    const both = !!(prev.hero && s.hero);
    NOHERO = both; reset(g); prev.draw(g, t);
    BUF2 = BUF2 || mk(W, H); const b = BUF2.getContext("2d");
    reset(b); b.fillStyle = P.paper; b.fillRect(0, 0, W, H); s.draw(b, t); reset(b);
    NOHERO = false;
    const sc = lerp(0.08, 3.4, easeIn(bp) * 0.6 + bp * 0.4), M = SPR.mask, [ox, oy] = s.o;
    b.globalCompositeOperation = "destination-in"; b.drawImage(M, ox - M.width * sc / 2, oy - M.height * sc / 2, M.width * sc, M.height * sc); b.globalCompositeOperation = "source-over";
    reset(g); g.drawImage(BUF2, 0, 0);
    g.globalAlpha = 1 - bp * 0.6; g.drawImage(SPR.rim, ox - M.width * sc / 2, oy - M.height * sc / 2, M.width * sc, M.height * sc); g.globalAlpha = 1;
    if (both) {
      // один герой поверх перехода: плавно от позы уходящей сцены к позе новой
      const hp = prev.hero(t), hn = s.hero(t), u = easeIO(bp), st = { ...hn };
      for (const k of ["x", "y", "s", "roll", "pitch", "look"]) st[k] = lerp(hp[k] ?? hn[k] ?? 0, hn[k] ?? 0, u);
      reset(g); drawGooseRear(g, st);
    }
  } else { reset(g); s.draw(g, t); }
  reset(g);
  g.globalCompositeOperation = "multiply"; g.drawImage(PAPER, 0, 0); g.globalCompositeOperation = "source-over";
  const vg = g.createRadialGradient(W / 2, H / 2, H * 0.5, W / 2, H / 2, H * 1.05);
  vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(60,36,14,0.26)");
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
  if (t < T0.s7) drawVerse(g, t);
}
const PQ = new URLSearchParams(location.search);
const T_Q = PQ.has("t") ? +PQ.get("t") : 0;
let LAST_T = T_Q;
const seek = (t) => (CFG.probe ? probeCast() : render(t));
window.addEventListener("hf-seek", (e) => { LAST_T = e.detail.time; seek(LAST_T); });
let READY = false;
function boot() { READY = true; seek(LAST_T); }
if (document.fonts && document.fonts.ready) document.fonts.ready.then(boot); else boot();

const tl = gsap.timeline({ paused: true });
tl.to({ v: 0 }, { v: 1, duration: TOTAL, ease: "none", onUpdate() { const t = tl.time(); if (READY && Math.abs(t - LAST_T) > 1e-6) { LAST_T = t; seek(t); } } }, 0);
window.__timelines = window.__timelines || {};
window.__timelines["main"] = tl;
