// ---------- Склейка: мир под камерой → эффекты → строки → заголовок ----------
const cv = document.getElementById("scene");
const g = cv.getContext("2d", { alpha: false });
const TOTAL = CFG.total;
const T_TITLE_IN = 0.3, T_TITLE_OUT = 2.75;

function vignette(g) {
  reset(g);
  const vg = g.createRadialGradient(W / 2, H / 2, 600, W / 2, H / 2, 1250);
  vg.addColorStop(0, "rgba(60,30,90,0)"); vg.addColorStop(1, "rgba(60,30,90,0.32)");
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
}
function render(t) {
  reset(g);
  g.fillStyle = "#2a1e4a"; g.fillRect(0, 0, W, H);
  const i = shotIndex(t), world = SHOTS[i][1];
  const [cx, cy, z0] = camAt(t), z = z0 * punchAt(t), [shx, shy] = shakeAt(t);
  const hx = Math.sin(t * 0.9) * 6, hy = Math.cos(t * 0.7) * 4;   // «ручная» камера
  g.setTransform(z, 0, 0, z, ANCHOR[0] - cx * z + shx + hx, ANCHOR[1] - cy * z + shy + hy);
  if (world === "room") drawRoomScene(g, t); else drawYardScene(g, t);
  reset(g);
  vignette(g);
  // линии скорости: свист бури крупно, лопнувший пузырь
  speedLines(g, t, pulse(t, EV.svish4 - 0.06, EV.E4 + 0.1) * 0.8);
  speedLines(g, t, (t > EV.vstavai && t < EV.vstavai + 0.5 ? 1 - (t - EV.vstavai) / 0.5 : 0) * 0.7, W / 2, 380, [255, 236, 160]);
  const [wa, wdx, wdy] = whipAt(t);
  whipStreaks(g, t, wa, wdx, wdy);
  for (const tf of FLASH) if (t >= tf - 0.05 && t < tf + 0.3) { reset(g); g.fillStyle = `rgba(255,250,236,${(t < tf ? (t - tf + 0.05) / 0.05 : 1 - (t - tf) / 0.3).toFixed(3)})`; g.fillRect(0, 0, W, H); }
  drawVerse(g, t);
  // заголовок во вступлении и в финале
  if (t < T_TITLE_OUT + 0.4) {
    const out = easeIn(inv(T_TITLE_OUT, T_TITLE_OUT + 0.35, t));
    drawTitle(g, t, W / 2, 190 - out * 60, 0.86 * (1 - out * 0.6), 1 - out, T_TITLE_IN);
  }
  if (t >= EV.fin) drawTitle(g, t, 1290, 250, 0.8, 1, EV.fin);
  reset(g);
  if (t < 0.2) { g.fillStyle = `rgba(42,30,74,${(1 - t / 0.2).toFixed(3)})`; g.fillRect(0, 0, W, H); }
  if (t > TOTAL - 0.6) { g.fillStyle = `rgba(42,30,74,${clamp((t - TOTAL + 0.6) / 0.5).toFixed(3)})`; g.fillRect(0, 0, W, H); }
  reset(g);
}

// ---------- Проба: кот и мальчик во всех позах через весь ролик ----------
function probeCast() {
  reset(g); g.fillStyle = "#f4ecf4"; g.fillRect(0, 0, W, H);
  const lab = (txt, x, y) => { reset(g); g.fillStyle = "#333"; g.font = "20px monospace"; g.textAlign = "center"; g.fillText(txt, x, y); };
  const page = (CFG.probePage | 0);
  if (page === 0) {
    // кот: моменты через весь ролик (позы катятся функцией catPose)
    const ts = [4, 9, EV.spryach + 0.2, EV.igrush + 0.1, EV.igrush + 0.3, EV.igrush + 0.6, EV.glazami + 0.3, EV.povodil + 0.2, EV.povodil + 0.7, EV.povodil + 1.0, EV.sneg + 0.15, 33];
    ts.forEach((tt, k) => {
      const x = 170 + (k % 6) * 300, y = k < 6 ? 470 : 990;
      g.save(); g.translate(x, y); g.scale(0.62, 0.62); g.translate(-x, -y);
      drawCushion(g, x, y + 6, 1); drawCat(g, x, y, 1, tt, catPose(tt)); g.restore();
      lab(`cat t=${tt.toFixed(2)}`, x, y + 50);
    });
  } else {
    const ts = [5, EV.L5 + 0.5, POP1 + 0.08, POP1 + 0.2, POP1 + 0.5, EV.L7 + 0.4, EV.L7 + 0.9, EV.spat + 0.1, EV.spat + 0.5, EV.E8 + 0.5, EV.E8 + 1.2, POP2 + 0.1, POP2 + 0.25, POP2 + 0.5, POP2 + 0.8, POP2 + 1.0];
    ts.forEach((tt, k) => {
      const x = 150 + (k % 8) * 232, y = k < 8 ? 480 : 1010;
      const bp = boyPose(tt);
      drawBoy(g, x, y + (bp.hop || 0), 0.62, tt, bp);
      lab(`${bp.pose} t=${tt.toFixed(2)}`, x, y + 40);
    });
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
