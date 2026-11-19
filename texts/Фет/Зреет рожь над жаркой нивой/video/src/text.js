// ---------- Текст: строки стиха на мазковой плашке, заголовок густой золотой краской ----------
const FONT_T = '"Yeseva One", serif', FONT_V = 'italic 600 {px}px "Lora", serif';
const fontsReady = () => document.fonts && document.fonts.check('100px "Yeseva One"') && document.fonts.check('italic 600 50px "Lora"');
const SPR = {};

// плашка под строки: тёмные мазки умбры и фиолета
function bandSprite() {
  if (SPR.band) return SPR.band;
  const c = document.createElement("canvas"); c.width = 1500; c.height = 210;
  const x = c.getContext("2d");
  x.save(); x.translate(750, 105); x.scale(1, 92 / 700);
  const rg = x.createRadialGradient(0, 0, 0, 0, 0, 700);
  rg.addColorStop(0, "rgba(34,22,40,0.66)"); rg.addColorStop(0.7, "rgba(34,22,40,0.55)"); rg.addColorStop(1, "rgba(34,22,40,0)");
  x.fillStyle = rg; x.beginPath(); x.arc(0, 0, 700, 0, TAU); x.fill(); x.restore();
  let n = 0;
  for (let row = 0; row < 6; row++) for (let i = 0; i < 12; i++) {
    n++;
    const px = 120 + i * 115 + (hash(n) - 0.5) * 50, py = 40 + row * 26 + (hash(n * 2) - 0.5) * 8;
    const e = Math.hypot((px - 750) / 700, (py - 105) / 92);
    dab(x, px, py, 220, 30, (hash(n * 3) - 0.5) * 0.08, jit([44, 30, 50], n, 12), clamp((1 - e) * 2.2) * 0.55);
  }
  reset(x);
  return (SPR.band = c);
}

// слово заголовка: белая маска → мазки золота поверх (source-atop) → тёмная кайма снизу (2×, выводится в 1×)
function goldWord(word, px) {
  const key = word + px;
  if (SPR[key]) return SPR[key];
  const k = 2, f = `${px * k}px ${FONT_T}`;
  const m = document.createElement("canvas").getContext("2d"); m.font = f;
  const w = Math.ceil(m.measureText(word).width) + 40 * k, h = Math.ceil(px * 1.5 * k);
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const x = c.getContext("2d");
  x.font = f; x.textBaseline = "alphabetic"; x.fillStyle = "#fff";
  const bx = 20 * k, by = Math.round(h * 0.74);
  x.fillText(word, bx, by);
  x.globalCompositeOperation = "source-atop";
  const lg = x.createLinearGradient(0, by - px * k, 0, by);
  lg.addColorStop(0, css(C.lemon)); lg.addColorStop(0.55, css(C.cad)); lg.addColorStop(1, css(C.ochre));
  x.fillStyle = lg; x.fillRect(0, 0, w, h);
  let n = 0;
  for (let yy = by - px * k; yy < by + 10; yy += 9 * k) for (let xx = 0; xx < w; xx += 26 * k) {
    n++;
    const v = (yy - (by - px * k)) / (px * k);
    dab(x, xx + hash(n) * 20 * k, yy, 34 * k, 8 * k, -0.35 + (hash(n * 2) - 0.5) * 0.3, jit(mix(C.lemon, C.ochre, v), n + word.length, 34), 0.85);
  }
  reset(x);
  // кайма и тень (под буквами)
  x.globalCompositeOperation = "destination-over";
  x.lineJoin = "round"; x.strokeStyle = css([70, 32, 20]); x.lineWidth = 7 * k;
  x.strokeText(word, bx, by);
  x.fillStyle = "rgba(40,16,10,0.55)"; x.fillText(word, bx + 4 * k, by + 6 * k);
  x.globalCompositeOperation = "source-over";
  return (SPR[key] = { c, w: w / k, h: h / k, base: by / k, k });
}
function plainText(txt, font, col, edge) {
  const key = txt + font + col;
  if (SPR[key]) return SPR[key];
  const k = 2;
  const m = document.createElement("canvas").getContext("2d"); m.font = font.replace(/(\d+)px/, (_, p) => p * k + "px");
  const w = Math.ceil(m.measureText(txt).width) + 24 * k, h = Math.ceil(parseInt(font.match(/(\d+)px/)[1]) * 1.6 * k);
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const x = c.getContext("2d"); x.font = m.font; x.lineJoin = "round";
  const by = Math.round(h * 0.72);
  x.strokeStyle = edge; x.lineWidth = 6 * k; x.strokeText(txt, 12 * k, by);
  x.fillStyle = col; x.fillText(txt, 12 * k, by);
  return (SPR[key] = { c, w: w / k, h: h / k, base: by / k, k });
}
const cacheable = () => fontsReady();
function drawSprite(g, S, x, y, sc = 1, a = 1, rot = 0) {
  reset(g); g.globalAlpha = a;
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
  if (rot === 0 && Math.abs(sc - 1) < 1e-3) { g.drawImage(S.c, Math.round(x - S.w / 2), Math.round(y - S.base), S.w, S.h); }
  else { g.translate(x, y); g.rotate(rot); g.scale(sc, sc); g.drawImage(S.c, -S.w / 2, -S.base, S.w, S.h); }
  reset(g);
  if (!cacheable()) for (const k in SPR) if (k !== "band") delete SPR[k];
}

// Заголовок: «Зреет рожь» / «над жаркой нивой…»; prog 0…1 — влёт слов на пружине; author 0…1
const TITLE = [["Зреет", "рожь"], ["над", "жаркой", "нивой…"]];
function drawTitle(g, cx, cy, size, prog, authorA, year) {
  const gap = size * 0.32;
  let wi = 0;
  TITLE.forEach((line, li) => {
    const spr = line.map((w) => goldWord(w, size));
    const tw = spr.reduce((s, S) => s + S.w - 40, 0) + (spr.length - 1) * gap;
    let x = cx - tw / 2;
    const y = cy + (li === 0 ? -size * 0.42 : size * 0.78);
    spr.forEach((S) => {
      const d = clamp(prog * 6 - wi * 0.9);
      const u = d >= 1 ? 1 : SPRING(d);
      const w0 = S.w - 40;
      if (d > 0) drawSprite(g, S, x + w0 / 2, y - (1 - u) * 90, lerp(0.4, 1, u), clamp(d * 3), (1 - u) * (wi % 2 ? 0.25 : -0.25));
      x += w0 + gap;
      wi++;
    });
  });
  if (authorA > 0) {
    const A = plainText(year ? "Афанасий Фет · 1859" : "Афанасий Фет", 'italic 600 56px "Lora", serif', "#fff4dc", "rgba(50,22,14,0.9)");
    drawSprite(g, A, cx, cy + size * 1.62, 1, authorA);
  }
}

// Строки: пары строк на плашке; слово появляется мазком в момент, когда его произносит голос
function drawVerse(g, t) {
  const L = CFG.lines;
  let cur = -1;
  for (let i = 0; i < L.length; i++) if (t >= L[i].s - 0.05) cur = i;
  if (cur < 0) return;
  const pair = Math.floor(cur / 2);
  const shown = [L[pair * 2], L[pair * 2 + 1]].filter(Boolean);
  const out = L[pair * 2 + 2] ? 0 : clamp((t - CFG.ev.fin + 0.6) / 0.5);
  if (out >= 1) return;
  const inA = clamp((t - shown[0].s + 0.35) / 0.3);
  const band = bandSprite();
  reset(g); g.globalAlpha = inA * (1 - out) * 0.92;
  // плашка по числу строк: одна строка — ниже и уже
  const two = shown.length > 1 ? ease(clamp((t - (shown[1].s - 0.4)) / 0.35)) : 0;
  const bh = lerp(130, 210, two), bc = lerp(914, 958, two);
  g.drawImage(band, W / 2 - band.width / 2, bc - bh / 2, band.width, bh);
  reset(g);
  const px = 58;
  const font = FONT_V.replace("{px}", px);
  shown.forEach((ln, li) => {
    const y = 930 + li * 82;
    g.font = font;
    const words = ln.words, sp = g.measureText(" ").width;
    const widths = words.map((w) => g.measureText(w.w).width);
    const tw = widths.reduce((a, b) => a + b, 0) + sp * (words.length - 1);
    let x = Math.round(W / 2 - tw / 2);
    words.forEach((w, i) => {
      const u = clamp((t - w.s + 0.06) / 0.22);
      if (u > 0) {
        reset(g); g.globalAlpha = (1 - out);
        g.save(); g.beginPath(); g.rect(x - 6, y - px - 10, (widths[i] + 12) * easeOut(u), px * 1.6); g.clip();
        g.font = font; g.lineJoin = "round";
        g.strokeStyle = "rgba(30,14,18,0.9)"; g.lineWidth = 6; g.strokeText(w.w, x, y);
        g.fillStyle = u < 1 ? css(mix(C.cad, C.cream, u)) : css(C.cream); g.fillText(w.w, x, y);
        g.restore();
        // мазок кисти, который «пишет» слово
        if (u < 1) dab(g, x + (widths[i] + 6) * easeOut(u), y - px * 0.35, 26, 10, -0.5, C.cad, 0.9 * (1 - u));
      }
      x += widths[i] + sp;
    });
  });
  reset(g);
}
