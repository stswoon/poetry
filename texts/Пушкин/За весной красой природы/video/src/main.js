// ---------- Кадр: камера → стена → куски → живые → баллончики → строки ----------
const cv = document.getElementById("scene");
const g = cv.getContext("2d", { alpha: false });
let PC = null;
function world(g, t) {
  const [cx, cy, z] = camAt(t);
  g.setTransform(z, 0, 0, z, Math.round(W / 2 - cx * z), Math.round(H / 2 - cy * z));
  g.drawImage(WALL, WX0, WY0);
  PC.title.draw(g, t);
  PC.spring.draw(g, t);
  PC.summer.draw(g, t);
  // солнце укатывается за поле на «пройдёт»
  const su = easeIn(inv(EV.proydet - 0.05, EV.proydet + 1.1, t));
  g.save(); g.beginPath(); g.rect(X.summer - 700, 0, 1400, 700 + 10); g.clip();
  g.translate(PC.sun.x + 260 + su * 520, PC.sun.y + 260 + su * 380); g.rotate(su * 2.2);
  g.translate(-(PC.sun.x + 260), -(PC.sun.y + 260));
  PC.sun.draw(g, t);
  g.restore();
  const bs = birdState(t);
  if (bs.alive <= 0) drawBird(g, bs);
  PC.fog.draw(g, t, 0.9);
  drawFogDrips(g, t);
  PC.cloud.draw(g, t);
  for (const pc of PC.seaAll) pc.draw(g, t);
  // волны: белые гребни бегут по морю, когда баллончик дорисовал гребни
  const sw = PC.crest.prog(t);
  if (sw > 0.4) {
    g.save(); g.globalAlpha = ease(inv(0.4, 1, sw)); g.strokeStyle = P.white; g.lineWidth = 9; g.lineCap = "round";
    for (let k = 0; k < 16; k++) {
      const row = k % 4, x = X.sea - 1150 + ((k * 397 + t * (90 + row * 40)) % 2300), y = 640 + row * 90 + Math.sin(t * 2 + k) * 6;
      g.beginPath(); g.moveTo(x - 60, y + 8); g.quadraticCurveTo(x - 10, y - 18, x + 50, y + 4); g.stroke();
    }
    g.restore();
  }
  PC.fin.draw(g, t);
  drawRain(g, t);
  drawUmbrellas(g, t, PC);
  drawLeaves(g, t);
  drawCans(g, t, PC);
  // птичка поверх баллончиков: влетающий баллончик её не закрывает
  if (bs.alive > 0) drawBird(g, bs);
  drawShakeDrops(g, t);
}
function render(t) {
  PC = PC || buildPieces();
  reset(g);
  g.fillStyle = "#6b4a3c"; g.fillRect(0, 0, W, H);
  world(g, t);
  reset(g);
  // лёгкая виньетка
  const vg = g.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.05);
  vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(20,8,4,0.35)");
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
  drawVerse(g, t);
}
const PQ = new URLSearchParams(location.search);
const T_Q = PQ.has("t") ? +PQ.get("t") : 0;
let LAST_T = T_Q;
const seek = (t) => (CFG.probe ? probeCast() : render(t));
window.addEventListener("hf-seek", (e) => { LAST_T = e.detail.time; seek(LAST_T); });
let READY = false;
function boot() { READY = true; PC = null; seek(LAST_T); }
if (document.fonts && document.fonts.ready) document.fonts.ready.then(boot); else boot();

const tl = gsap.timeline({ paused: true });
tl.to({ v: 0 }, { v: 1, duration: TOTAL, ease: "none", onUpdate() { const t = tl.time(); if (READY && Math.abs(t - LAST_T) > 1e-6) { LAST_T = t; seek(t); } } }, 0);
window.__timelines = window.__timelines || {};
window.__timelines["main"] = tl;
