// ---------- Мир за гусём: перспектива, земля «по строкам», предметы-картинки, частицы ----------
// Мир: x вправо, y вверх (метры), z вперёд. Камера: {x, y, z, hy (горизонт на экране), roll}
const F = 900;            // фокус, px
const TPM = 20;           // пикселей текстуры земли на метр
const ZMAX = 32;          // дальше земля не рисуется — её закрывает дальняя полоса
const ZFAR = 75;          // дальше предметы не видны
function proj(cam, x, y, z) { const dz = z - cam.z; if (dz <= 0.3) return null; const k = F / dz; return [W / 2 + (x - cam.x) * k, cam.hy + (cam.y - y) * k, k, dz]; }
// небо: полотно с линией горизонта hz совмещается с горизонтом камеры
function drawSky(g, sky, hz, cam, par = 0.15) {
  const ox = -(sky.width - W) / 2 - cam.x * 6 * par;
  g.drawImage(sky, ox, cam.hy - hz);
  // на случай крена: дотянуть небо вверх
  if (cam.hy - hz > -400) { g.drawImage(sky, 0, 0, sky.width, 4, ox, cam.hy - hz - 1200, sky.width, 1201); }
}
function drawFar(g, strip, cam, bottom, par = 1) {
  const sx = (((cam.x * 8 * par) % 1600) + 1600) % 1600;
  g.drawImage(strip, sx, 0, Math.min(strip.width - sx, W + 800), strip.height, -400, cam.hy + bottom - strip.height, Math.min(strip.width - sx, W + 800), strip.height);
}
// земля построчно (mode-7): каждая строка экрана — полоска текстуры на своей дальности
function drawGround(g, tex, cam, rowStart = 1) {
  const TH = tex.height, TW = TEXW;
  const y0 = Math.ceil(cam.hy + Math.max(rowStart, cam.y * F / ZMAX));
  for (let sy = y0; sy < H + 360; sy += 2) {
    const dz = cam.y * F / (sy - cam.hy);
    const half = (W / 2 + 420) * dz / F;
    const srcW = 2 * half * TPM;
    if (srcW > 2 * TW - 2) continue;
    const srcY = (((cam.z + dz) * TPM) % TH + TH) % TH;
    const sx0 = (((cam.x - half) * TPM) % TW + TW) % TW;
    g.drawImage(tex, sx0, TH - 1 - srcY, srcW, 1, -420, sy, W + 840, 2.6);
  }
}
// предметы-картинки: it = {spr, x, y, z, h (высота в метрах), ax (0…1 точка привязки по ширине), alpha, flip, rot}
function drawBill(g, cam, it) {
  const p = proj(cam, it.x, it.y ?? 0, it.z); if (!p) return false;
  const [sx, sy, k, dz] = p; if (dz > ZFAR) return false;
  const hp = it.h * k, wp = hp * it.spr.width / it.spr.height;
  if (sx + wp < -500 || sx - wp > W + 500 || hp < 1.5) return false;
  const fade = (1 - inv(ZFAR * 0.7, ZFAR, dz)) * (it.alpha ?? 1) * (it.near ? inv(it.near * 0.85, it.near, dz) : 1);
  if (fade <= 0.01) return false;
  g.save(); g.globalAlpha = fade; g.translate(sx, sy);
  if (it.rot) g.rotate(it.rot);
  if (it.flip) g.scale(-1, 1);
  g.drawImage(it.spr, -wp * (it.ax ?? 0.5), -hp * (it.ay ?? 1), wp, hp);
  g.restore();
  return true;
}
// дымка у горизонта: цвет неба ложится на дальнее
function haze(g, cam, col, a = 0.5, hgt = 160) {
  const gr = g.createLinearGradient(0, cam.hy - hgt * 0.4, 0, cam.hy + hgt);
  gr.addColorStop(0, `rgba(${col},0)`); gr.addColorStop(0.4, `rgba(${col},${a})`); gr.addColorStop(1, `rgba(${col},0)`);
  g.fillStyle = gr; g.fillRect(-400, cam.hy - hgt * 0.4, W + 800, hgt * 1.4);
}
// камера с креном: всё, что рисует fn, крутится вокруг центра кадра
function withRoll(g, cam, fn) { g.save(); g.translate(W / 2, H / 2); g.rotate(cam.roll ?? 0); g.translate(-W / 2, -H / 2); fn(); g.restore(); }
// повторяющиеся предметы вдоль пути: индексы по шагу, позиции из хэша — без накопления
function scatter(cam, step, z0, seed, fn) {
  const out = [];
  const i0 = Math.floor(Math.max(z0, cam.z) / step), i1 = Math.floor((cam.z + ZFAR) / step);
  for (let i = i0; i <= i1; i++) { const it = fn(i, i * step + hash(i * 7.3 + seed) * step * 0.6, (k) => hash(i * 13.7 + seed + k * 3.1)); if (it) (Array.isArray(it) ? out.push(...it) : out.push(it)); }
  return out;
}
function drawBills(g, cam, items) { items.sort((a, b) => b.z - a.z); for (const it of items) drawBill(g, cam, it); }
// лист в мире: летит, кувыркается; рисуется картинкой-акварелью
function drawLeaf3(g, cam, x, y, z, rot, k, size = 0.18) {
  const p = proj(cam, x, y, z); if (!p) return;
  const [sx, sy, kk, dz] = p; if (dz > 40) return;
  const s = size * kk / 60; if (s < 0.05) return;
  const sp = SPR.leaves[k % SPR.leaves.length];
  g.save(); g.translate(sx, sy); g.rotate(rot); g.scale(s, s * (0.35 + 0.65 * Math.abs(Math.cos(rot * 1.7)))); g.globalAlpha = clamp(inv(0.4, 1.2, dz)); g.drawImage(sp, -60, -45); g.restore();
}
// гусь в мире (клин): экранный масштаб из дальности; s=1 — герой на 2,25 м
const HERO_DZ = 2.25;
function gooseAt(g, cam, x, y, z, st) {
  const p = proj(cam, x, y, z); if (!p) return null;
  const [sx, sy, k, dz] = p; const s = HERO_DZ / dz;
  if (s < 0.012) return null;
  drawGooseRear(g, { ...st, x: sx, y: sy, s });
  return [sx, sy, s];
}
