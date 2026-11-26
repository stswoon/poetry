// ---------- Кадр: страница комикса под камерой → строки → заголовок ----------
const cv = document.getElementById("scene");
const g = cv.getContext("2d", { alpha: false });
const TOTAL = CFG.total;

function render(t) {
  reset(g);
  g.fillStyle = "#26304a"; g.fillRect(0, 0, W, H);
  halftone(g, rect(0, 0, W, H), [60, 72, 104], 3, 14, 45, 1);
  const cam = camAt(t), z = cam.z;
  const vx0 = cam.cx - W / 2 / z, vx1 = cam.cx + W / 2 / z, vy0 = cam.cy - cam.sy / z, vy1 = cam.cy + (H - cam.sy) / z;
  const vis = (r) => r.x < vx1 && r.x + r.w > vx0 && r.y < vy1 && r.y + r.h > vy0;
  g.setTransform(z, 0, 0, z, W / 2 - cam.cx * z, cam.sy - cam.cy * z);
  for (const id in PAGES) {
    const P = PAGES[id]; if (!vis(P)) continue;
    g.fillStyle = "rgba(0,0,0,0.35)"; g.fillRect(P.x + 18, P.y + 18, P.w, P.h);
    g.fillStyle = paperFill(g); g.fillRect(P.x, P.y, P.w, P.h);
  }
  for (const p of PANELS) {
    if (!vis(p)) continue;
    g.save(); g.translate(p.x, p.y);
    g.beginPath(); g.rect(0, 0, p.w, p.h); g.clip();
    p.draw(g, t, p.w, p.h);
    paperOver(g, 0, 0, p.w, p.h, 0.45);
    g.restore();
    g.save(); g.lineWidth = 9; g.strokeStyle = INK; g.lineJoin = "miter"; g.strokeRect(p.x, p.y, p.w, p.h); g.restore();
  }
  reset(g);
  drawVerse(g, t);
  // финал: название на задней обложке — в экранных координатах, чтобы буквы были резкими
  // буквы влетают, когда камера уже стоит на задней обложке
  const tArr = backArrive();
  if (t >= tArr - 0.05) {
    titleBlock(g, t, W / 2, 300, 210, 1, tArr);
    authorTag(g, W / 2, 610, spr(t, tArr + 0.8, 0.6));
  }
  reset(g);
}

// проба: настоящая сцена панели в 16 моментах подряд, кадр обрезан вокруг героев
const PROBES = [
  ["B4", "L15", -0.7, "L17", 0, [0, 60, 620, 412], "мальчик на крыльце"],
  ["D1", "L29", -0.8, "L31", 0, [140, 120, 1560, 560], "встреча: мальчик, Зима, дед"],
  ["F1", "L37", -0.5, "E40", 1.0, [120, 200, 1600, 808], "жгучий холод — «Ничего!»"],
  ["E2", "L35", -0.4, "L36", 0, [0, 60, 700, 460], "Зима строит мост"],
  ["E3", "L36", -0.4, "E36", 0.8, [0, 0, 900, 448], "Зима бросает ковёр"],
  ["E1", "L33", -0.5, "E34", 0.3, [0, 0, 640, 520], "петля"],
  ["D2", "L31", -0.4, "E32", 0.4, [0, 0, 1848, 340], "полёт над степью"],
  ["A1", "L1", 0, "E4", 0, [400, 60, 560, 520], "мальчик у окна"],
  ["back", "fin", 0.2, "fin", 6.5, [0, 400, 1848, 608], "задняя обложка"],
];
function probePanel(k) {
  const [id, a, da, b, db, cr, name] = PROBES[k];
  const p = PBY[id], t0 = EV[a] + da, t1 = EV[b] + db;
  reset(g); g.fillStyle = "#ddd"; g.fillRect(0, 0, W, H);
  const cw = 480, ch = 270, sc = Math.min(cw / cr[2], (ch - 22) / cr[3]);
  for (let i = 0; i < 16; i++) {
    const tt = lerp(t0, t1, i / 15), cx = (i % 4) * cw, cy = Math.floor(i / 4) * ch;
    g.save(); g.beginPath(); g.rect(cx + 2, cy + 2, cw - 4, ch - 24); g.clip();
    g.translate(cx + 2, cy + 2); g.scale(sc, sc); g.translate(-cr[0], -cr[1]);
    p.draw(g, tt, p.w, p.h);
    g.restore();
    g.fillStyle = "#222"; g.font = "16px monospace"; g.textAlign = "left"; g.fillText(`${name} t=${tt.toFixed(2)}`, cx + 6, cy + ch - 6);
  }
}
function probeCast() {
  reset(g); g.fillStyle = css(C.paper); g.fillRect(0, 0, W, H);
  const page = CFG.probePage | 0;
  if (CFG.probe === "panel") return probePanel(page);
  const lab = (s, x, y) => { g.fillStyle = "#333"; g.font = "18px monospace"; g.textAlign = "center"; g.fillText(s, x, y); };
  if (page === 0) {
    const names = Object.keys(BOY_POSES);
    names.forEach((n, i) => { drawBoy(g, 160 + i * 300, 480, 1, BOY_POSES[n], { mouth: ["smile", "o", "laugh", "open", "smile", "laugh"][i], eyes: ["open", "wide", "happy", "open", "closed", "happy"][i] }); lab(n, 160 + i * 300, 510); });
    const zn = Object.keys(ZIMA_POSES);
    zn.forEach((n, i) => { drawZimaFront(g, 160 + i * 300, 1000, 1, ZIMA_POSES[n], 0.3 * i); lab(n, 160 + i * 300, 1030); });
  } else if (page === 1) {
    for (let i = 0; i < 3; i++) { drawZimaFly(g, 330 + i * 620, 250, 1.3, i * 0.37); lab(`fly ${i}`, 330 + i * 620, 420); }
    const dn = Object.keys(DED_POSES);
    dn.forEach((n, i) => { drawDed(g, 330 + i * 620, 1000, 1.1, DED_POSES[n], i * 0.4, { bread: n === "bread", thumb: n === "thumb", wind: n === "brace" ? 1 : 0, speak: n === "thumb" }); lab(n, 330 + i * 620, 1030); });
  }
}

const PQ = new URLSearchParams(location.search);
const T_Q = PQ.has("t") ? +PQ.get("t") : 0;
let LAST_T = T_Q;
const seek = (t) => (CFG.probe ? probeCast() : (typeof render === "function" ? render(t) : probeCast()));
window.addEventListener("hf-seek", (e) => { LAST_T = e.detail.time; seek(LAST_T); });
seek(T_Q);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => seek(LAST_T));

const tl = gsap.timeline({ paused: true });
tl.set({}, {}, TOTAL);
window.__timelines = window.__timelines || {};
window.__timelines["main"] = tl;
