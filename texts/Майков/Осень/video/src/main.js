// ---------- Склейка: буфер мира → экран с зумом камеры, полоса строк, HUD, переходы ----------
const cv = document.getElementById("scene");
const g = cv.getContext("2d", { alpha: false });
g.imageSmoothingEnabled = false;
const buf = document.createElement("canvas"); buf.width = LW * K; buf.height = WH * K;
const b = buf.getContext("2d", { alpha: false });
b.imageSmoothingEnabled = false;
const TOTAL = CFG.total;
const VIEW = { sx: 0, sy: 0, k: SC };
// точка буфера мира → экран (после зума)
const scr = (x, y) => [(x - VIEW.sx) * VIEW.k, (y - VIEW.sy) * VIEW.k];

// переход «вихрь листьев»: полоса крупных пиксельных листьев пролетает через экран; u 0…1
function leafWipe(g, u) {
  if (u <= 0 || u >= 1) return;
  const P = SC * 2;
  for (let i = 0; i < 260; i++) {
    const row = i % 16, k = Math.floor(i / 16);
    const y = row * 56 + R(hash(i * 1.7) * 30) - 20;
    const x = R(lerp(2300, -900, u) + k * 70 + hash(i * 3.1) * 90 + Math.sin(i + u * 9) * 30);
    if (x < -60 || x > 1980 || y > BAND_Y - P * 2) continue;
    g.fillStyle = LEAFC[i % LEAFC.length];
    g.fillRect(R(x / SC) * SC, R(y / SC) * SC, P * 2, P);
    g.fillRect(R(x / SC) * SC + P, R(y / SC) * SC - P, P, P);
  }
  // сплошное ядро вихря закрывает смену кадра
  const cx = lerp(2300, -900, u) + 400;
  g.fillStyle = "#e8901a";
  g.fillRect(R((cx - 260) / SC) * SC, 0, 520, BAND_Y);
  g.fillStyle = "#ffd23f";
  g.fillRect(R((cx - 180) / SC) * SC, 0, 360, BAND_Y);
}
// пиксельное растворение (для воспоминания): мозаика всего кадра
const tmp = document.createElement("canvas"); tmp.width = 1920; tmp.height = 1080;
const tg = tmp.getContext("2d"); tg.imageSmoothingEnabled = false;
function mosaic(level) {
  const sc = Math.max(1, R(level)); if (sc <= 1) return;
  const w = Math.ceil(1920 / sc), h = Math.ceil(1080 / sc);
  tg.drawImage(cv, 0, 0, 1920, 1080, 0, 0, w, h); g.drawImage(tmp, 0, 0, w, h, 0, 0, w * sc, h * sc);
}

function render(t) {
  let i = 0;
  while (i + 1 < SCENES.length && t >= SCENES[i + 1][1]) i++;
  const [fn, start, kind] = SCENES[i];
  b.setTransform(1, 0, 0, 1, 0, 0);
  b.globalAlpha = 1;
  const v = fn(b, t, t - start) || {};
  // мир на экран с зумом: crop вокруг фокуса
  const z = v.zoom || 1;
  const sw = LW / z, sh = WH / z;
  const fx = v.fx === undefined ? LW / 2 : v.fx, fy = v.fy === undefined ? WH / 2 : v.fy;
  const sx = clamp(fx - sw / 2, 0, LW - sw), sy = clamp(fy - sh / 2, 0, WH - sh);
  VIEW.sx = sx; VIEW.sy = sy; VIEW.k = 1920 / sw;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.imageSmoothingEnabled = false;
  if (v.dull) g.filter = `saturate(${(1 - v.dull * 0.75).toFixed(3)}) brightness(${(1 - v.dull * 0.18).toFixed(3)})`;
  if (v.shake) { const a = v.shake; g.drawImage(buf, sx * K, sy * K, sw * K, sh * K, R(Math.sin(t * 70) * a) * SC, R(Math.cos(t * 53) * a) * SC, 1920, BAND_Y); }
  else g.drawImage(buf, sx * K, sy * K, sw * K, sh * K, 0, 0, 1920, BAND_Y);
  g.filter = "none";
  if (v.screen) v.screen(g, t);
  drawBand(g, t, v.band);
  drawVerse(g, t);
  drawHud(g, t, v.hud);
  if (v.over) v.over(g, t);
  // переходы
  const next = SCENES[i + 1], till = next ? next[1] - t : 99, nk = next && next[2];
  const u0 = t - start;
  if (kind === "leaf" && u0 < 0.35) leafWipe(g, 0.5 + u0 / 0.35 * 0.5);
  if (nk === "leaf" && till < 0.35) leafWipe(g, 0.5 - till / 0.35 * 0.5);
  if (kind === "mos" && u0 < 0.4) mosaic(lerp(40, 1, u0 / 0.4));
  if (nk === "mos" && till < 0.4) mosaic(lerp(1, 40, 1 - till / 0.4));
  if (t > TOTAL - 0.8) { g.fillStyle = "#000"; g.globalAlpha = clamp((t - TOTAL + 0.8) / 0.7); g.fillRect(0, 0, 1920, 1080); g.globalAlpha = 1; }
}

window.addEventListener("hf-seek", (e) => render(e.detail.time));
render(0);
