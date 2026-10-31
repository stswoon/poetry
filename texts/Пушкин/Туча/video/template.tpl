<!doctype html>
<!-- Шаблон: index.html собирается из template.tpl командой `python3 build.py`. Правьте этот файл, не index.html. -->
<html lang="ru" data-resolution="landscape">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="lib/gsap.min.js"></script>
    <script src="lib/motion.js"></script>
    <style>
      @font-face { font-family: "Cormorant"; font-style: normal; font-weight: 300 700;
        src: url("assets/fonts/cormorant-cyr.woff2") format("woff2");
        unicode-range: U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116; }
      @font-face { font-family: "Cormorant"; font-style: normal; font-weight: 300 700;
        src: url("assets/fonts/cormorant-lat.woff2") format("woff2");
        unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F; }
      @font-face { font-family: "Cormorant"; font-style: italic; font-weight: 300 700;
        src: url("assets/fonts/cormorant-it-cyr.woff2") format("woff2");
        unicode-range: U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116; }
      @font-face { font-family: "Cormorant"; font-style: italic; font-weight: 300 700;
        src: url("assets/fonts/cormorant-it-lat.woff2") format("woff2");
        unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F; }
      :root { --ink: #2a2740; --cl: #4b3f98; --az: #1668a8; --li: #bb5a06; --gr: #2c7d3a; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1920px; height: 1080px; overflow: hidden; background: #34325a; }
      #root { position: relative; width: 1920px; height: 1080px; overflow: hidden; font-family: "Cormorant", serif; color: var(--ink); background: #34325a; }
      #scene { position: absolute; inset: 0; width: 1920px; height: 1080px; z-index: 0; }
      .w { display: inline-block; white-space: nowrap; }
      .ch { display: inline-block; opacity: 0; }
      .cl { color: var(--cl); } .az { color: var(--az); } .li { color: var(--li); } .gr { color: var(--gr); }
      #preload { position: absolute; left: 0; top: 0; opacity: 0; font: italic 600 30px "Cormorant"; }
      #preload b { font: 700 30px "Cormorant"; }

      /* строфа на кремовом холме */
      .stanza { position: absolute; left: 0; width: 1920px; top: 680px; z-index: 3; text-align: center; }
      .line { font-size: 70px; font-style: italic; font-weight: 700; line-height: 72px; height: 72px; white-space: nowrap; letter-spacing: 0.002em; }

      /* заставка и финал: название в небе, автор на холме */
      .card { position: absolute; inset: 0; z-index: 5; text-align: center; }
      .card-title { position: absolute; left: 0; width: 1920px; top: 66px; font-size: 300px; font-weight: 700; line-height: 1.1; letter-spacing: 0.01em; color: #2e2a56; white-space: nowrap;
        -webkit-text-stroke: 16px #fffdf5; paint-order: stroke fill; text-shadow: 0 8px 12px rgba(30, 30, 60, 0.35); }
      .card-author { position: absolute; left: 0; width: 1920px; top: 716px; font-size: 92px; font-style: italic; font-weight: 700; line-height: 1.1; color: var(--ink); white-space: nowrap; }
      .card-year { position: absolute; left: 0; width: 1920px; top: 826px; font-size: 62px; font-style: italic; font-weight: 600; line-height: 1.1; color: var(--cl); white-space: nowrap; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="%%TOTAL%%" data-width="1920" data-height="1080">
      <canvas id="scene" width="1920" height="1080"></canvas>
      <div id="preload" aria-hidden="true">Шрифт 0123456789 <b>СВЮЗ ?</b></div>
      %%TEXT%%
      <audio id="voice" class="clip" src="assets/voice.mp3" data-start="%%VOICE_START%%" data-duration="%%VOICE_DUR%%" data-track-index="10" data-volume="1"></audio>
      <audio id="music" class="clip" src="assets/music.wav" data-start="0" data-duration="%%TOTAL%%" data-track-index="11" data-volume="1"></audio>
    </div>
    <script>
      const CFG = %%CFG%%;
      const W = 1920, H = 1080, TOTAL = CFG.total, EV = CFG.ev, FINAL = CFG.final;
      const PAD = 80;                       // запас слоя по бокам для параллакса

      // ---------- утилиты ----------
      function mulberry32(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
      const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
      const lerp = (a, b, u) => a + (b - a) * u;
      const sstep = (u) => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
      const prog = (t, a, b) => clamp((t - a) / Math.max(1e-6, b - a), 0, 1);
      const mkCanvas = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
      function curve(keys, t) {
        if (t <= keys[0][0]) return keys[0][1];
        for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) {
          const [t0, v0] = keys[i - 1], [t1, v1] = keys[i];
          return v0 + (v1 - v0) * sstep((t - t0) / Math.max(1e-6, t1 - t0)); }
        return keys[keys.length - 1][1];
      }
      // пружины Framer Motion как функции времени: 0 → 1 с перелётом
      function makeSpring(opts) {
        const g = Motion.spring({ ...opts, keyframes: [0, 1] });
        const pts = []; for (let i = 0; i <= 400; i++) pts.push(g.next(i * 10).value);
        return (s) => { if (s <= 0) return 0; const f = s * 100; if (f >= 400) return 1; const i = Math.floor(f); return lerp(pts[i], pts[i + 1], f - i); };
      }
      const springPop = makeSpring({ stiffness: 130, damping: 13, mass: 1 });
      const springSoft = makeSpring({ stiffness: 60, damping: 13, mass: 1 });

      // ---------- бумага ----------
      const rng0 = mulberry32(1835);
      const grain = mkCanvas(512, 512);
      { const g = grain.getContext("2d"), im = g.createImageData(512, 512);
        for (let i = 0; i < im.data.length; i += 4) { const v = rng0(); im.data[i] = im.data[i + 1] = im.data[i + 2] = v < 0.5 ? 0 : 255; im.data[i + 3] = Math.floor(v < 0.5 ? (0.5 - v) * 26 : (v - 0.5) * 18); }
        g.putImageData(im, 0, 0);
        g.lineCap = "round";
        for (let i = 0; i < 900; i++) { const x = rng0() * 512, y = rng0() * 512, a = rng0() * 6.28, l = 6 + rng0() * 22;
          g.strokeStyle = rng0() < 0.6 ? "rgba(0,0,0,0.035)" : "rgba(255,255,255,0.07)"; g.lineWidth = 0.7; g.beginPath(); g.moveTo(x, y); g.lineTo(x + l * Math.cos(a), y + l * Math.sin(a)); g.stroke(); } }
      const grainPat = (g) => g.createPattern(grain, "repeat");
      // Лист цветной бумаги: заливка с тенью, зерно и светлая кромка реза
      function paper(g, pathFn, color, { sh = 0.34, blur = 12, oy = 6, edge = 0.28 } = {}) {
        g.save(); g.shadowColor = `rgba(24,22,50,${sh})`; g.shadowBlur = blur; g.shadowOffsetY = oy; g.fillStyle = color;
        g.beginPath(); pathFn(g); g.fill("evenodd"); g.restore();
        g.save(); g.beginPath(); pathFn(g); g.clip("evenodd"); g.fillStyle = grainPat(g); g.fillRect(0, 0, g.canvas.width, g.canvas.height);
        if (edge) { g.strokeStyle = `rgba(255,255,255,${edge})`; g.lineWidth = 2; g.beginPath(); pathFn(g); g.stroke(); }
        g.restore();
      }
      const circlePath = (x, y, r) => (g) => { g.moveTo(x + r, y); g.arc(x, y, r, 0, 6.2832); };
      const polyPath = (pts) => (g) => { pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); };

      function profile(amps) { return (x) => amps.reduce((s, [a, f, p]) => s + a * Math.sin(x * f + p), 0); }
      function hill(g, base, prof, h) { g.moveTo(0, h); for (let x = 0; x <= g.canvas.width; x += 8) g.lineTo(x, base + prof(x - PAD)); g.lineTo(g.canvas.width, h); g.closePath(); }
      const layerCanvas = () => mkCanvas(W + PAD * 2, H);

      // ---------- небо ----------
      const skyC = layerCanvas();
      { const g = skyC.getContext("2d");
        g.fillStyle = "#4f9fd9"; g.fillRect(0, 0, skyC.width, H); g.fillStyle = grainPat(g); g.fillRect(0, 0, skyC.width, H);
        const SK = [[1260, "#63addf"], [1040, "#7bbce6"], [840, "#95caec"], [640, "#afd8f1"], [440, "#c9e5f5"], [250, "#e2f1f8"]];
        for (const [r, c] of SK) paper(g, circlePath(1360 + PAD, 165, r), c, { sh: 0.16, blur: 10, oy: 3, edge: 0.18 }); }

      // ---------- солнце ----------
      const sunC = mkCanvas(420, 420);
      { const g = sunC.getContext("2d"), c = 210;
        for (let i = 0; i < 14; i++) { const a = i / 14 * 6.2832, L = i % 2 ? 188 : 160, w = 0.1;
          paper(g, polyPath([[c + 88 * Math.cos(a - w), c + 88 * Math.sin(a - w)], [c + L * Math.cos(a), c + L * Math.sin(a)], [c + 88 * Math.cos(a + w), c + 88 * Math.sin(a + w)]]), i % 2 ? "#ffcf4d" : "#ffdf7a", { sh: 0.18, blur: 5, oy: 2, edge: 0.2 }); }
        paper(g, circlePath(c, c, 100), "#ffc93c", { sh: 0.25, blur: 8, oy: 3 });
        paper(g, circlePath(c, c, 76), "#ffde6e", { sh: 0.14, blur: 5, oy: 2 }); }

      // ---------- тучи ----------
      function puffPath(puffs) { return (g) => { for (const [x, y, r] of puffs) { g.moveTo(x + r, y); g.arc(x, y, r, 0, 6.2832); } }; }
      function cloudSprite(seed, w, h, tones) {
        const r = mulberry32(seed), c = mkCanvas(w, h), g = c.getContext("2d");
        const puffs = (n, sx, top, mn, mx) => { const a = []; for (let i = 0; i < n; i++) { const u = i / (n - 1), R = lerp(mn, mx, Math.sin(u * Math.PI)) * (0.85 + 0.3 * r());
            a.push([w * (0.5 - sx / 2 + sx * u), h * 0.66 - (R * 0.55 + top * Math.sin(u * Math.PI)), R]); } return a; };
        const merge = (path) => (gg) => { path(gg); };
        // каждый слой — объединение кругов и плоского низа; режем единым контуром через отдельный холст
        const layer = (ps, col, bx, bw, by, bh, opt) => {
          const t = mkCanvas(w, h), tg = t.getContext("2d"); tg.fillStyle = col;
          tg.beginPath(); ps.forEach(([x, y, R]) => { tg.moveTo(x + R, y); tg.arc(x, y, R, 0, 6.2832); }); tg.fill();
          tg.beginPath(); tg.roundRect(bx, by, bw, bh, bh / 2); tg.fill();
          tg.globalCompositeOperation = "source-atop"; tg.fillStyle = grainPat(tg); tg.fillRect(0, 0, w, h);
          g.save(); g.shadowColor = `rgba(20,18,44,${opt.sh})`; g.shadowBlur = opt.blur; g.shadowOffsetY = opt.oy; g.drawImage(t, 0, 0); g.restore();
        };
        layer(puffs(7, 0.78, h * 0.1, w * 0.08, w * 0.15).map(([x, y, R]) => [x - w * 0.015, y - h * 0.05, R]), tones[0], w * 0.08, w * 0.82, h * 0.5, h * 0.19, { sh: 0.42, blur: 16, oy: 9 });
        layer(puffs(6, 0.66, h * 0.05, w * 0.075, w * 0.135).map(([x, y, R]) => [x + w * 0.01, y + h * 0.03, R]), tones[1], w * 0.13, w * 0.74, h * 0.54, h * 0.18, { sh: 0.3, blur: 9, oy: 5 });
        layer(puffs(5, 0.46, h * 0.1, w * 0.055, w * 0.098).map(([x, y, R]) => [x, y + h * 0.07, R]), tones[2], w * 0.27, w * 0.46, h * 0.62, h * 0.14, { sh: 0.24, blur: 7, oy: 4 });
        return c;
      }
      const HERO_W = 620, HERO_H = 320;
      const heroC = cloudSprite(11, HERO_W, HERO_H, ["#3a3762", "#514e7e", "#6d6a9c"]);
      const ringS = [cloudSprite(21, 760, 330, ["#2c2a4f", "#3a3863", "#4b4977"]), cloudSprite(22, 700, 300, ["#30305a", "#403f6f", "#55548a"]), cloudSprite(23, 640, 290, ["#262546", "#35345e", "#454470"])];
      // Хоровод туч: откуда, куда, спрайт, масштаб, задержка
      const RING = [
        { from: [-500, 90], to: [120, 120], s: 0, k: 1.05, d: 0.0 },
        { from: [2420, 80], to: [1800, 130], s: 1, k: 1.1, d: 0.1 },
        { from: [-520, 240], to: [340, 240], s: 2, k: 0.95, d: 0.22 },
        { from: [2440, 250], to: [1560, 250], s: 0, k: 0.95, d: 0.32 },
        { from: [540, -300], to: [560, 60], s: 1, k: 1.05, d: 0.42 },
        { from: [1400, -300], to: [1360, 60], s: 2, k: 1.1, d: 0.52 },
        { from: [960, -320], to: [960, 10], s: 0, k: 1.0, d: 0.62 },
      ];
      // Рваные клочки для «рассеянной»
      const SCRAPS = (() => { const r = mulberry32(77), a = []; for (let i = 0; i < 16; i++) { const ang = (i / 16) * 6.2832 + r() * 0.4;
          a.push({ a: ang, v: 260 + r() * 340, s: 18 + r() * 34, rot: r() * 6.28, vr: (r() - 0.5) * 5, d: r() * 0.2, col: ["#514e7e", "#6d6a9c", "#3a3762"][i % 3], pts: Array.from({ length: 7 }, (_, k) => { const b = k / 7 * 6.2832; return [Math.cos(b) * (0.6 + 0.5 * r()), Math.sin(b) * (0.6 + 0.5 * r())]; }) }); } return a; })();

      // ---------- задник бури ----------
      const stormC = layerCanvas();
      { const g = stormC.getContext("2d");
        const scallop = (base, st, rr) => (gg) => { gg.moveTo(0, 0); gg.lineTo(stormC.width, 0); gg.lineTo(stormC.width, base); for (let x = stormC.width; x > -st; x -= st) gg.arc(x - st / 2, base, st / 2, 0, Math.PI); gg.closePath(); };
        paper(g, scallop(600, 150), "#6c719c", { sh: 0.4, blur: 16, oy: 8 });
        paper(g, scallop(470, 118), "#565a87", { sh: 0.34, blur: 12, oy: 6 });
        paper(g, scallop(330, 170), "#454872", { sh: 0.34, blur: 12, oy: 6 });
        paper(g, scallop(170, 132), "#373a62", { sh: 0.3, blur: 10, oy: 5 }); }

      // ---------- радуга ----------
      const RB = { cx: 900, cy: 690, r: 620, w: 30 };
      const rainbowC = mkCanvas(W, 720);
      { const g = rainbowC.getContext("2d");
        ["#e8504e", "#f28d3a", "#f6cf45", "#62b76a", "#4596d6", "#7c62c0"].forEach((col, i) => { const r = RB.r - i * RB.w;
          paper(g, (gg) => { gg.arc(RB.cx, RB.cy, r, Math.PI, 2 * Math.PI); gg.arc(RB.cx, RB.cy, r - RB.w, 2 * Math.PI, Math.PI, true); gg.closePath(); }, col, { sh: 0.2, blur: 6, oy: 3, edge: 0.18 }); }); }

      // ---------- холмы ----------
      const LAYERS = {};
      const P = { far: profile([[14, 0.0042, 1], [6, 0.011, 2]]), mid: profile([[20, 0.0035, 2.2], [8, 0.009, 0.4]]), mid2: profile([[16, 0.005, 4], [6, 0.013, 1]]), near: profile([[14, 0.0045, 0.7], [6, 0.012, 3.1]]), hill: profile([[9, 0.003, 1.3], [4, 0.009, 0.2]]) };
      const BASE = { far: 448, mid: 492, mid2: 548, near: 604, hill: 656 };
      const yOf = (k, x) => BASE[k] + P[k](x);
      function roundTree(g, x, y, s, c1, c2) {
        paper(g, polyPath([[x - 5 * s, y], [x - 3 * s, y - 34 * s], [x + 3 * s, y - 34 * s], [x + 5 * s, y]]), "#7a5a3a", { sh: 0.25, blur: 4, oy: 2, edge: 0 });
        paper(g, circlePath(x, y - 54 * s, 28 * s), c1, { sh: 0.3, blur: 6, oy: 3 });
        paper(g, circlePath(x - 8 * s, y - 60 * s, 16 * s), c2, { sh: 0.14, blur: 3, oy: 1, edge: 0.15 });
      }
      { // дальний лес
        const c = layerCanvas(), g = c.getContext("2d"), r = mulberry32(5);
        const forest = (gg) => { gg.moveTo(0, 720); gg.lineTo(0, 440); for (let x = 0; x <= c.width; x += 34) { const y = yOf("far", x - PAD) - 16 - r() * 18; gg.lineTo(x, y); gg.quadraticCurveTo(x + 17, y - 22, x + 34, y + 2); } gg.lineTo(c.width, 720); gg.closePath(); };
        paper(g, forest, "#7fb3ad", { sh: 0.2, blur: 8, oy: 3, edge: 0.14 });
        paper(g, (gg) => hill(gg, BASE.far, P.far, 720), "#9ccab6", { sh: 0.24, blur: 8, oy: 3 });
        LAYERS.far = c; }
      const MILL = { x: 1400, base: 0 };
      { // холм с церковью, домиками и мельницей
        const c = layerCanvas(), g = c.getContext("2d");
        paper(g, (gg) => hill(gg, BASE.mid, P.mid, 720), "#7ec06f", { sh: 0.28, blur: 10, oy: 4 });
        const house = (x, s, wall, roof) => { const y = yOf("mid", x) + 6;
          paper(g, polyPath([[x + PAD - 26 * s, y], [x + PAD - 26 * s, y - 34 * s], [x + PAD + 26 * s, y - 34 * s], [x + PAD + 26 * s, y]]), wall, { sh: 0.28, blur: 5, oy: 2, edge: 0.2 });
          paper(g, polyPath([[x + PAD - 34 * s, y - 32 * s], [x + PAD, y - 62 * s], [x + PAD + 34 * s, y - 32 * s]]), roof, { sh: 0.22, blur: 4, oy: 2, edge: 0.2 });
          paper(g, polyPath([[x + PAD - 7 * s, y - 26 * s], [x + PAD + 7 * s, y - 26 * s], [x + PAD + 7 * s, y - 12 * s], [x + PAD - 7 * s, y - 12 * s]]), "#ffd877", { sh: 0.1, blur: 2, oy: 1, edge: 0 }); };
        // церковь
        { const x = 450 + PAD, y = yOf("mid", 450) + 6;
          paper(g, polyPath([[x - 40, y], [x - 40, y - 74], [x + 40, y - 74], [x + 40, y]]), "#f6f1e3", { sh: 0.3, blur: 6, oy: 3 });
          paper(g, polyPath([[x - 21, y - 74], [x - 21, y - 122], [x + 21, y - 122], [x + 21, y - 74]]), "#fbf8ee", { sh: 0.22, blur: 4, oy: 2 });
          paper(g, (gg) => { gg.moveTo(x - 25, y - 120); gg.bezierCurveTo(x - 32, y - 152, x - 6, y - 158, x, y - 178); gg.bezierCurveTo(x + 6, y - 158, x + 32, y - 152, x + 25, y - 120); gg.closePath(); }, "#e8b23c", { sh: 0.26, blur: 4, oy: 2 });
          paper(g, polyPath([[x - 2, y - 202], [x + 2, y - 202], [x + 2, y - 176], [x - 2, y - 176]]), "#b9861f", { sh: 0.1, blur: 1, oy: 0, edge: 0 });
          paper(g, polyPath([[x - 8, y - 195], [x + 8, y - 195], [x + 8, y - 191], [x - 8, y - 191]]), "#b9861f", { sh: 0.1, blur: 1, oy: 0, edge: 0 });
          paper(g, (gg) => { gg.moveTo(x - 10, y); gg.lineTo(x - 10, y - 30); gg.arc(x, y - 30, 10, Math.PI, 0); gg.lineTo(x + 10, y); gg.closePath(); }, "#6e6a8c", { sh: 0.1, blur: 1, oy: 0, edge: 0 }); }
        house(290, 1.05, "#e5c9a1", "#b5553e"); house(600, 1.0, "#f0dcb9", "#a84a3d"); house(180, 0.8, "#ecd5b0", "#7f5b8a");
        for (const [x, s] of [[80, 0.9], [710, 1.0], [800, 0.8], [1010, 1.05], [1090, 0.8], [1205, 0.9], [1560, 0.75]]) roundTree(g, x + PAD, yOf("mid", x) + 6, s, "#58a65c", "#71bb6c");
        // башня мельницы
        { const x = MILL.x + PAD, y = yOf("mid", MILL.x) + 6; MILL.base = y - 118;
          paper(g, polyPath([[x - 38, y], [x - 24, y - 112], [x + 24, y - 112], [x + 38, y]]), "#efdcb7", { sh: 0.3, blur: 6, oy: 3 });
          paper(g, polyPath([[x - 30, y - 110], [x, y - 146], [x + 30, y - 110]]), "#9a5a3a", { sh: 0.24, blur: 4, oy: 2 });
          paper(g, (gg) => { gg.moveTo(x - 10, y); gg.lineTo(x - 10, y - 26); gg.arc(x, y - 26, 10, Math.PI, 0); gg.lineTo(x + 10, y); gg.closePath(); }, "#7a5a3a", { sh: 0.1, blur: 1, oy: 0, edge: 0 }); }
        LAYERS.mid = c; }
      // лопасти мельницы
      const bladeC = mkCanvas(260, 260);
      { const g = bladeC.getContext("2d"), c = 130;
        for (let i = 0; i < 4; i++) { g.save(); g.translate(c, c); g.rotate(i * Math.PI / 2);
          paper(g, polyPath([[-3, 0], [-3, -112], [3, -112], [3, 0]]), "#7a5a3a", { sh: 0.2, blur: 3, oy: 1, edge: 0 });
          paper(g, polyPath([[3, -38], [3, -112], [30, -104], [28, -40]]), "#fbf6e6", { sh: 0.22, blur: 3, oy: 1 });
          g.restore(); }
        paper(g, circlePath(c, c, 9), "#5e4530", { sh: 0.2, blur: 2, oy: 1, edge: 0 }); }
      { // поле с полосами
        const c = layerCanvas(), g = c.getContext("2d");
        paper(g, (gg) => hill(gg, BASE.mid2, P.mid2, 720), "#9dd26e", { sh: 0.28, blur: 10, oy: 4 });
        g.save(); g.beginPath(); hill(g, BASE.mid2, P.mid2, 720); g.clip();
        const cols = ["#cfe27a", "#e4dc7f", "#b9dc72", "#f0d877", "#c6e077"];
        cols.forEach((col, i) => { const x0 = 860 + i * 95;
          paper(g, (gg) => { gg.moveTo(x0, 520); gg.bezierCurveTo(x0 + 18, 560, x0 + 40 + i * 12, 610, x0 + 70 + i * 36, 680); gg.lineTo(x0 + 145 + i * 40, 680); gg.bezierCurveTo(x0 + 110 + i * 14, 610, x0 + 90, 560, x0 + 80, 520); gg.closePath(); }, col, { sh: 0.1, blur: 3, oy: 1, edge: 0.12 }); });
        g.restore();
        LAYERS.mid2 = c; }
      const BIRCH = { x: 1690, top: 250 };
      { // луг и ствол берёзы
        const c = layerCanvas(), g = c.getContext("2d");
        // ствол за лугом
        const x = BIRCH.x + PAD, y0 = yOf("near", BIRCH.x) + 12;
        const trunk = polyPath([[x - 21, y0], [x - 13, BIRCH.top + 60], [x - 6, BIRCH.top], [x + 6, BIRCH.top], [x + 13, BIRCH.top + 60], [x + 21, y0]]);
        paper(g, trunk, "#f7f4ea", { sh: 0.34, blur: 8, oy: 3 });
        g.save(); g.beginPath(); trunk(g); g.clip(); g.fillStyle = "#34323f"; const r = mulberry32(9);
        for (let yy = BIRCH.top + 26; yy < y0; yy += 24 + r() * 18) { const left = r() < 0.5, ww = 12 + r() * 11; g.beginPath(); g.moveTo(left ? x - 24 : x + 24, yy); g.lineTo(left ? x - 24 + ww : x + 24 - ww, yy + 2); g.lineTo(left ? x - 24 : x + 24, yy + 6); g.closePath(); g.fill(); }
        g.restore();
        paper(g, (gg) => { gg.moveTo(x - 8, 372); gg.lineTo(x - 104, 300); gg.lineTo(x - 100, 292); gg.lineTo(x - 6, 356); gg.closePath(); }, "#f0ece0", { sh: 0.25, blur: 3, oy: 1, edge: 0 });
        paper(g, (gg) => { gg.moveTo(x + 8, 330); gg.lineTo(x + 92, 268); gg.lineTo(x + 96, 276); gg.lineTo(x + 8, 348); gg.closePath(); }, "#f0ece0", { sh: 0.25, blur: 3, oy: 1, edge: 0 });
        paper(g, (gg) => hill(gg, BASE.near, P.near, 720), "#62b35a", { sh: 0.3, blur: 10, oy: 4 });
        // зубчатая трава по верху
        const rr = mulberry32(14);
        g.save(); for (let i = 0; i < 90; i++) { const xx = rr() * c.width, yy = BASE.near + P.near(xx - PAD) + 2, hh = 10 + rr() * 14, ww = 5 + rr() * 5;
          paper(g, polyPath([[xx - ww, yy + 3], [xx + (rr() - 0.5) * 10, yy - hh], [xx + ww, yy + 3]]), rr() < 0.5 ? "#6fbd5f" : "#57a851", { sh: 0.14, blur: 2, oy: 1, edge: 0 }); }
        g.restore();
        LAYERS.near = c; }
      { // кремовый холм для текста
        const c = layerCanvas(), g = c.getContext("2d");
        paper(g, (gg) => hill(gg, BASE.hill, P.hill, H), "#f7efdd", { sh: 0.42, blur: 16, oy: -5, edge: 0.5 });
        // пучки травы в углах
        const r = mulberry32(31);
        for (const [cx, n] of [[60 + PAD, 9], [W - 60 + PAD, 9]]) for (let i = 0; i < n; i++) { const x = cx + (i - n / 2) * 18 + r() * 8, top = 880 + r() * 90;
          paper(g, polyPath([[x - 10, H], [x + (r() - 0.5) * 40, top], [x + 10, H]]), i % 2 ? "#7cbf69" : "#5fa858", { sh: 0.2, blur: 4, oy: 1, edge: 0.1 }); }
        LAYERS.hill = c; }
      const hillDark = layerCanvas();
      { const g = hillDark.getContext("2d"); g.drawImage(LAYERS.hill, 0, 0); g.globalCompositeOperation = "multiply"; g.fillStyle = "#cfcde0"; g.fillRect(0, 0, hillDark.width, H); g.globalCompositeOperation = "destination-in"; g.drawImage(LAYERS.hill, 0, 0); }

      // ---------- рамка коробки ----------
      const frameC = mkCanvas(W, H);
      { const g = frameC.getContext("2d");
        paper(g, (gg) => { gg.rect(0, 0, W, H); gg.roundRect(26, 26, W - 52, H - 52, 26); }, "#34325a", { sh: 0.6, blur: 26, oy: 7, edge: 0 }); }

      // ---------- цветы, бабочки, листья, берёза ----------
      function flowerSprite(petal, center, nP) {
        const c = mkCanvas(80, 130), g = c.getContext("2d"), x = 40, y = 38;
        paper(g, polyPath([[x - 2, 130], [x - 2, y], [x + 2, y], [x + 2, 130]]), "#3f8c44", { sh: 0.2, blur: 2, oy: 1, edge: 0 });
        paper(g, (gg) => { gg.moveTo(x, 96); gg.quadraticCurveTo(x + 22, 76, x + 30, 92); gg.quadraticCurveTo(x + 14, 100, x, 106); gg.closePath(); }, "#4a9c4c", { sh: 0.14, blur: 2, oy: 1, edge: 0 });
        for (let i = 0; i < nP; i++) { const a = i / nP * 6.2832; paper(g, circlePath(x + 16 * Math.cos(a), y + 16 * Math.sin(a), 10.5), petal, { sh: 0.2, blur: 2, oy: 1, edge: 0.18 }); }
        paper(g, circlePath(x, y, 9.5), center, { sh: 0.14, blur: 2, oy: 1, edge: 0 });
        return c;
      }
      const flowerS = [flowerSprite("#f25f7a", "#ffd257", 6), flowerSprite("#ffffff", "#ffc93c", 8), flowerSprite("#ffb12e", "#c0552a", 6), flowerSprite("#a678e2", "#ffe07a", 5), flowerSprite("#5cb7ec", "#fff2b0", 6)];
      const FLOWERS = (() => { const r = mulberry32(42), a = []; for (let i = 0; i < 46; i++) { const x = 50 + r() * 1820; a.push({ x, y: 612 + r() * 44, s: 0.6 + r() * 0.5, spr: i % 5, ph: r() * 6.28, d: r() * 0.9 }); } return a.sort((p, q) => p.y - q.y); })();
      const leafS = ["#6cbf5a", "#55a84e", "#86cc63"].map((col) => { const c = mkCanvas(34, 34), g = c.getContext("2d");
        paper(g, (gg) => { gg.moveTo(17, 3); gg.quadraticCurveTo(32, 15, 17, 31); gg.quadraticCurveTo(2, 15, 17, 3); gg.closePath(); }, col, { sh: 0.22, blur: 2, oy: 1, edge: 0.1 }); return c; });
      const CLUMPS = (() => { const r = mulberry32(8), a = []; for (let i = 0; i < 420; i++) { const pick = [[1690, 300, 118], [1590, 322, 74], [1790, 296, 86], [1668, 228, 76], [1730, 232, 62]][i % 5], an = r() * 6.2832, d = Math.sqrt(r()) * pick[2];
          a.push({ x: pick[0] + d * Math.cos(an), y: pick[1] + d * 0.75 * Math.sin(an), spr: i % 3, ph: r() * 6.28, rot: r() * 6.28, s: 0.8 + r() * 0.5 }); } return a; })();
      const FLY = (() => { const r = mulberry32(19), a = []; for (let i = 0; i < 22; i++) a.push({ t0: r() * 3.4, x0: 1400 + r() * 460, y0: 220 + r() * 170, ph: r() * 6.28, spr: i % 3, vr: 2 + r() * 4, s: 0.9 + r() * 0.6, v: 130 + r() * 170 }); return a; })();
      const BUTTER = [{ c: "#ff8f5c", x: 500, y: 560, ph: 0 }, { c: "#ffd34d", x: 880, y: 575, ph: 2 }, { c: "#f2709c", x: 1160, y: 550, ph: 4 }];
      function butterfly(g, x, y, c, flap, rot, s) {
        g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s); g.fillStyle = c; g.shadowColor = "rgba(30,30,50,.3)"; g.shadowBlur = 3; g.shadowOffsetY = 2;
        const k = 0.25 + 0.75 * Math.abs(Math.sin(flap));
        for (const sg of [-1, 1]) { g.beginPath(); g.ellipse(sg * 11 * k, -6, 11 * k, 12, sg * 0.3, 0, 6.2832); g.fill(); g.beginPath(); g.ellipse(sg * 8 * k, 8, 7.5 * k, 8, -sg * 0.3, 0, 6.2832); g.fill(); }
        g.fillStyle = "#2f2a40"; g.beginPath(); g.ellipse(0, 1, 2.2, 10, 0, 0, 6.2832); g.fill(); g.restore();
      }
      const BIRDS = [[0, 0], [-58, 18], [-104, 44], [46, 30], [-164, 12]];
      function bird(g, x, y, s, flap) {
        g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = "#2f2d50"; const w = 10 * Math.sin(flap);
        g.beginPath(); g.moveTo(-22, -w); g.quadraticCurveTo(-8, -4, 0, 2); g.quadraticCurveTo(8, -4, 22, -w); g.quadraticCurveTo(8, 3, 0, 8); g.quadraticCurveTo(-8, 3, -22, -w); g.fill(); g.restore();
      }
      // дождь: бумажная полоска
      const dropC = mkCanvas(16, 46);
      { const g = dropC.getContext("2d"); paper(g, (gg) => { gg.roundRect(5, 4, 5, 36, 2.5); }, "#dcecff", { sh: 0.3, blur: 2, oy: 1, edge: 0 }); }
      const RAIN = (() => { const r = mulberry32(3), a = []; for (let i = 0; i < 220; i++) a.push({ x: -60 + r() * 2060, ph: r(), v: 620 + r() * 300, s: 0.65 + r() * 0.7 }); return a; })();
      const SPARK = (() => { const r = mulberry32(61), a = []; for (let i = 0; i < 42; i++) a.push({ x: 70 + r() * 1780, y: 470 + r() * 180, ph: r() * 6.28, d: r() * 1.4, s: 5 + r() * 9 }); return a; })();
      function star(g, x, y, s) { g.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * 6.2832, R = i % 2 ? s * 0.22 : s; g[i ? "lineTo" : "moveTo"](x + R * Math.cos(a), y + R * Math.sin(a)); } g.closePath(); g.fill(); }
      // завиток ветра
      const curlC = mkCanvas(420, 160);
      { const g = curlC.getContext("2d"); g.lineCap = "round"; g.lineJoin = "round"; g.shadowColor = "rgba(30,30,70,.3)"; g.shadowBlur = 4; g.shadowOffsetY = 3; g.strokeStyle = "#fbfcff"; g.lineWidth = 8;
        g.beginPath(); g.moveTo(8, 112); g.bezierCurveTo(90, 118, 190, 114, 262, 88); g.bezierCurveTo(322, 66, 330, 18, 284, 18); g.bezierCurveTo(246, 18, 240, 64, 280, 66); g.stroke();
        g.lineWidth = 6; g.beginPath(); g.moveTo(70, 142); g.bezierCurveTo(160, 148, 290, 142, 390, 118); g.stroke(); }
      const CURLS = [{ y: 180, d: 0, k: 1.0 }, { y: 320, d: 0.35, k: 0.8 }, { y: 80, d: 0.8, k: 0.7 }, { y: 420, d: 1.1, k: 0.9 }, { y: 240, d: 1.5, k: 0.85 }, { y: 120, d: 2.0, k: 1.0 }, { y: 380, d: 2.4, k: 0.75 }];

      // молнии
      const BOLT = (() => { const r = mulberry32(99), p = [[0, 0]]; let x = 0, y = 0; const n = 7; for (let i = 0; i < n; i++) { x += (i % 2 ? -1 : 1) * (28 + r() * 30); y += 34 + r() * 18; p.push([x, y]); } return p; })();
      const RINGP = (() => { const r = mulberry32(101), p = []; const n = 44, turns = 2; for (let i = 0; i <= n; i++) { const u = i / n, a = -2.6 + u * turns * 6.2832, jit = i % 2 ? 1 : -1; p.push([Math.cos(a) * (236 + jit * 18 + r() * 10), Math.sin(a) * (72 + jit * 14 + r() * 6) - 6 + 56 * (u - 0.5), Math.sin(a) < 0]); } return p; })();
      // куски спирали: верхняя половина витка идёт за тучей, нижняя перед ней
      const RING_RUNS = (() => { const runs = []; let cur = null; RINGP.forEach((p, i) => { if (!cur || cur.back !== p[2]) { if (cur) cur.pts.push(p), cur.i1 = i; cur = { back: p[2], i0: i, i1: i, pts: [p] }; runs.push(cur); } else { cur.pts.push(p); cur.i1 = i; } }); return runs; })();
      function zig(g, pts, u, w) {
        if (u <= 0) return; const lim = u * (pts.length - 1), i2 = Math.floor(lim);
        const draw = (col, lw) => { g.strokeStyle = col; g.lineWidth = lw; g.lineJoin = "miter"; g.lineCap = "butt"; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
          for (let i = 1; i <= i2; i++) g.lineTo(pts[i][0], pts[i][1]);
          if (i2 + 1 < pts.length) { const f = lim - i2; g.lineTo(lerp(pts[i2][0], pts[i2 + 1][0], f), lerp(pts[i2][1], pts[i2 + 1][1], f)); } g.stroke(); };
        g.save(); g.shadowColor = "rgba(20,16,50,.5)"; g.shadowBlur = 6; g.shadowOffsetY = 3; draw("#d27a06", w + 5); g.restore(); draw("#ffd83e", w); draw("#fff7c2", Math.max(1, w * 0.3));
      }

      // ---------- сцена ----------
      const ctx = document.getElementById("scene").getContext("2d");
      const land = mkCanvas(W, 720), lc = land.getContext("2d");
      const wind = (t) => curve([[EV.S2 - 0.6, 0.15], [EV.L6, 0.5], [EV.S3, 0.5], [EV.sokr, 1.0], [EV.sokr + 1.2, 0.25], [EV.L11 - 0.2, 0.3], [EV.L11 + 0.7, 1.0], [EV.END, 1.0], [EV.END + 1.6, 0.25]], t);
      const swayPhase = (t) => t + 0.0;  // фаза своя, но ветер меняет только амплитуду

      function heroState(t) {
        // первая строфа: через всё небо, закрывая солнце
        const u1 = sstep(prog(t, EV.S1 - 0.9, EV.E4 + 0.05));
        let x = lerp(190, 1340, u1);
        const back = sstep(prog(t, EV.E4 + 0.25, EV.S2 + 0.5)); x = lerp(x, 960, back);
        const after = sstep(prog(t, EV.sokr, EV.E9));  x = lerp(x, 1000, after);
        const drift = sstep(prog(t, EV.L11 - 0.2, EV.L12)); x += 200 * drift;
        const ex = prog(t, EV.L12 + 0.05, EV.END + 0.25); x += 1500 * ex * ex * ex;
        const drop = springSoft((t - (CFG.voiceStart - 1.5)) * 1.0);
        let y = lerp(-280, 226, drop);
        const big = curve([[EV.E4 + 0.25, 0.85], [EV.S2 + 0.5, 1.18], [EV.sokr, 1.18], [EV.E9, 0.85], [EV.END, 0.8]], t);
        y += 8 * Math.sin(t * 1.2);
        const rot = 0.022 * Math.sin(t * 1.1) + 0.05 * ex;
        return { x, y, k: big, rot };
      }
      const dimOf = (t) => curve([[EV.L4 - 0.1, 0], [EV.E4, 0.26], [EV.S2 - 0.8, 0.28], [EV.S2, 0.6], [EV.L8, 0.6], [EV.E8, 0.46], [EV.sokr, 0.42], [EV.sokr + 0.7, 0.14], [EV.bur + 0.3, 0]], t);
      const dryOf = (t) => curve([[EV.E4 + 0.5, 0], [EV.S2 + 0.1, 1], [EV.alch, 1], [EV.E8 + 0.3, 0.3], [EV.L10, 0.22], [EV.osv + 0.8, 0]], t);
      const flowerUp = (t, f) => {
        if (t < EV.S2 - 1.2) return springPop((t - 0.75 - f.d * 0.5) * 1);    // на сборке и в первой строфе
        const gone = 1 - sstep(prog(t, EV.S2 - 1.2 + f.d * 0.4, EV.S2 - 0.4 + f.d * 0.4));
        if (t < EV.alch) return gone;
        return springPop(t - (EV.alch + 0.1 + f.d * 2.2));
      };
      function shake(t, x) { const d = t - EV.grom + 0.05; if (d <= 0 || d > 1.7) return 0; return 13 * Math.exp(-d * 3.2) * Math.sin(d * 34 + x); }

      function drawCoil(t, hx, hy, he, back) {
        if (t < EV.obv - 0.25 || t > EV.L7 + 0.5) return;
        const ur = prog(t, EV.obv - 0.2, EV.E6 + 0.15), lim = ur * (RINGP.length - 1), tw = 0.8 + 0.2 * Math.sin(t * 19);
        ctx.save(); ctx.globalAlpha = (1 - sstep(prog(t, EV.E6, EV.L7 + 0.4))) * tw; ctx.translate(hx, hy); ctx.scale(he.k, he.k);
        for (const r of RING_RUNS) if (r.back === back) zig(ctx, r.pts, clamp((lim - r.i0) / Math.max(1, r.i1 - r.i0), 0, 1), 7);
        ctx.restore();
      }

      function renderAt(t) {
        const camX = 12 * Math.sin(t * 0.22), sh = shake(t, 0), shY = shake(t, 1.2);
        const off = (depth) => camX * depth + sh * depth;
        const pop = (delay) => 760 * (1 - springSoft((t - delay) * 1.15));
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
        // небо
        ctx.drawImage(skyC, -PAD + off(0.15), shY * 0.2);
        // солнце
        const sunUp = springPop((t - 0.2) * 0.9), sunPulse = 1 + 0.1 * sstep(prog(t, EV.osv, EV.osv + 0.5)) * (1 - sstep(prog(t, EV.osv + 0.5, EV.osv + 1.6)));
        ctx.save(); ctx.translate(1360 + off(0.2), lerp(620, 165, sunUp)); ctx.rotate(t * 0.08); ctx.scale(sunPulse, sunPulse); ctx.drawImage(sunC, -210, -210); ctx.restore();
        // задник бури: опускается на прошлое, взлетает на «сокройся»
        const stormIn = springSoft((t - (EV.S2 - 0.85)) * 1.25), stormOut = sstep(prog(t, EV.sokr, EV.sokr + 0.8)), stormY = lerp(-640, 0, stormIn) - 760 * stormOut;
        if (stormIn > 0 && stormOut < 1) ctx.drawImage(stormC, -PAD + off(0.25), stormY + shY * 0.3);
        // радуга
        const rb = sstep(prog(t, EV.osv + 0.05, EV.E10 + 0.25));
        if (rb > 0) { ctx.save(); ctx.beginPath(); ctx.moveTo(RB.cx + off(0.3), RB.cy); ctx.arc(RB.cx + off(0.3), RB.cy, RB.r + 30, Math.PI, Math.PI + Math.PI * rb); ctx.closePath(); ctx.clip(); ctx.drawImage(rainbowC, off(0.3), 0); ctx.restore(); }

        // хоровод туч
        const ringOut = (d) => { const u = prog(t, EV.bur + d * 0.35 - 0.1, EV.bur + d * 0.35 + 1.0); return u * u; };
        if (t > EV.S2 - 0.9 && t < EV.bur + 1.6) for (const c of RING) {
          const u = springSoft((t - (EV.S2 - 0.75 + c.d)) * 1.35); if (u <= 0) continue;
          const sp = ringS[c.s], x = lerp(c.from[0], c.to[0], u) + 2900 * ringOut(c.d) + off(0.35) + 16 * Math.sin(t * 0.8 + c.d * 9), y = lerp(c.from[1], c.to[1], u) + 7 * Math.sin(t * 1.0 + c.d * 5) + shY * 0.6;
          ctx.save(); ctx.translate(x, y); ctx.scale(c.k, c.k); ctx.drawImage(sp, -sp.width / 2, -sp.height / 2); ctx.restore();
        }

        // клочки рассеянной бури
        const H0 = heroState(t);
        { const d0 = t - EV.rass + 0.15;
          if (d0 > 0 && d0 < 2.5) for (const s of SCRAPS) { const d = d0 - s.d; if (d <= 0) continue; const a = 1 - sstep(prog(d, 1.1, 2.1));
            const ox = heroState(EV.rass).x, oy = heroState(EV.rass).y; ctx.save(); ctx.globalAlpha = a; ctx.translate(ox + Math.cos(s.a) * (40 + s.v * d) * 1.1, oy + Math.sin(s.a) * (20 + s.v * d) * 0.55 + 26 * d * d); ctx.rotate(s.rot + s.vr * d); ctx.scale(s.s, s.s);
            ctx.shadowColor = "rgba(20,20,50,.28)"; ctx.shadowBlur = 5; ctx.shadowOffsetY = 3; ctx.fillStyle = s.col; ctx.beginPath(); s.pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fill(); ctx.restore(); }
          ctx.globalAlpha = 1; }

        // туча-герой на нитках
        const he = H0, hx = he.x + off(0.4), hy = he.y + shY * 0.7;
        // ---------- земля собирается на отдельном холсте: так тень не ложится на небо ----------
        lc.setTransform(1, 0, 0, 1, 0, 0); lc.globalCompositeOperation = "source-over"; lc.globalAlpha = 1; lc.clearRect(0, 0, W, 720);
        lc.drawImage(LAYERS.far, -PAD + off(0.3), pop(0.1) + shY * 0.5);
        const midX = -PAD + off(0.45), midY = pop(0.25) + shY * 0.7;
        lc.drawImage(LAYERS.mid, midX, midY);
        // мельница: быстрее на ветру
        const millA = 0.5 * t + 2.2 * curve([[0, 0], [EV.L6, 0.5], [EV.sokr, 2.2], [EV.L10, 2.8], [EV.L11, 3.2], [EV.L12, 8.5], [EV.END + 1, 11], [TOTAL, 13]], t);
        lc.save(); lc.translate(MILL.x + PAD + midX, MILL.base + midY); lc.rotate(millA); lc.drawImage(bladeC, -130, -130); lc.restore();
        lc.drawImage(LAYERS.mid2, -PAD + off(0.6), pop(0.4) + shY * 0.8);
        const nearX = -PAD + off(0.8), nearY = pop(0.55) + shY;
        lc.drawImage(LAYERS.near, nearX, nearY);
        // листва берёзы
        const wnd = wind(t);
        if (nearY < 700) for (const l of CLUMPS) {
          const flut = Math.sin(t * (4.4 + wnd * 4) + l.ph), dx = (2 + 10 * wnd) * Math.sin(t * 1.5 + l.ph) + wnd * 12;
          lc.save(); lc.translate(l.x + PAD + nearX + dx, l.y + nearY); lc.rotate(l.rot + 0.28 * wnd * flut); const sq = 0.7 + 0.3 * flut * (0.3 + wnd * 0.7); lc.scale(l.s, l.s * sq); lc.drawImage(leafS[l.spr], -17, -17); lc.restore();
        }
        // цветы
        for (const f of FLOWERS) {
          const up = flowerUp(t, f); if (up <= 0.001) continue;
          const shD = Math.abs(f.x - he.x) / (300 * he.k), inSh = t < EV.E4 + 0.8 ? clamp(1 - shD, 0, 1) * prog(t, EV.L3 - 0.3, EV.ten) : 0;
          const droop = inSh * 0.7 * (f.x > he.x ? 1 : -1);
          const sw = (0.03 + 0.18 * wnd) * Math.sin(t * (1.6 + wnd) + f.ph) + 0.14 * wnd;
          lc.save(); lc.translate(f.x + off(0.85) + (nearX + PAD - off(0.8)), f.y + 62 + nearY); lc.rotate(sw + droop); lc.scale(f.s, f.s * up); lc.drawImage(flowerS[f.spr], -40, -130); lc.restore();
        }
        // бабочки (первая строфа): на «печалишь» улетают вправо-вверх
        if (t > 1.2 && t < EV.E4 + 1.5) for (const b of BUTTER) {
          const fl = prog(t, EV.L4 + b.ph * 0.1, EV.E4 + 1.0), xx = b.x + 70 * Math.sin(t * 0.8 + b.ph) + 1500 * fl * fl, yy = b.y - 24 * Math.abs(Math.sin(t * 1.9 + b.ph)) - 320 * fl * fl, s = 1.25 * springPop((t - 1.1 - b.ph * 0.08));
          butterfly(lc, xx, yy + nearY, b.c, t * 10 + b.ph, 0.35 * Math.sin(t * 1.3 + b.ph) + fl * 0.6, s);
        }
        // тень-пятно на земле: режем по уже нарисованной земле
        { const a = t < EV.S2 - 0.4 ? 0.1 + 0.28 * sstep(prog(t, EV.L3 - 0.3, EV.ten + 0.2)) : 0.0, fadeOut = 1 - sstep(prog(t, EV.E4 + 0.15, EV.S2 - 0.5)), a2 = curve([[EV.E9, 0], [EV.L10, 0.16], [EV.L12, 0.16], [EV.END, 0]], t);
          const aa = t < EV.S2 ? a * fadeOut * prog(t, EV.S1 - 0.5, EV.S1 + 0.3) : a2;
          if (aa > 0.002 && he.x < 2300) { lc.save(); lc.globalCompositeOperation = "source-atop"; lc.fillStyle = `rgba(30,26,70,${aa})`; lc.translate(he.x + 20, 575 + nearY); lc.beginPath(); lc.ellipse(0, 0, 300 * he.k, 74, 0, 0, 6.2832); lc.ellipse(-150 * he.k, -30, 110, 42, 0, 0, 6.2832); lc.ellipse(170 * he.k, -22, 90, 40, 0, 0, 6.2832); lc.fill(); lc.restore(); } }
        // сухая земля: копия того же холста с фильтром, поверх с прозрачностью
        ctx.drawImage(land, 0, 0);
        const dry = dryOf(t);
        if (dry > 0.003) { ctx.save(); ctx.globalAlpha = dry; ctx.filter = "sepia(0.92) saturate(1.25) hue-rotate(-6deg) brightness(1.08)"; ctx.drawImage(land, 0, 0); ctx.restore(); }

        // затемнение всего за холмом
        const dim = dimOf(t);
        if (dim > 0.003) { ctx.save(); ctx.globalCompositeOperation = "multiply"; ctx.globalAlpha = dim; ctx.fillStyle = "#4c5280"; ctx.fillRect(0, 0, W, 720); ctx.restore(); }

        if (hx < 2300) {
          ctx.save(); ctx.lineWidth = 2.4; ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.shadowColor = "rgba(20,20,50,.3)"; ctx.shadowBlur = 3; ctx.shadowOffsetX = 2;
          for (const dx of [-120, 118]) { const ax = hx + dx * he.k, ay = hy - 40 * he.k; ctx.beginPath(); ctx.moveTo(ax - 18 * Math.sin(t * 0.7) - (hx - 960) * 0.04, -4); ctx.lineTo(ax, ay); ctx.stroke(); }
          ctx.restore();
          drawCoil(t, hx, hy, he, true);
          ctx.save(); ctx.translate(hx, hy); ctx.rotate(he.rot); ctx.scale(he.k, he.k); ctx.drawImage(heroC, -HERO_W / 2, -HERO_H / 2 - 20); ctx.restore();
          drawCoil(t, hx, hy, he, false);
        }

        // таинственные кольца перед громом
        { const a = prog(t, EV.tain - 0.1, EV.tain + 0.3) * (1 - sstep(prog(t, EV.E7, EV.alch)));
          if (a > 0.003) for (let i = 0; i < 4; i++) { const ph = ((t - EV.tain) * 0.65 + i * 0.25) % 1; ctx.save(); ctx.globalAlpha = a * (1 - ph) * 0.72; ctx.strokeStyle = "#d8c8ff"; ctx.lineWidth = 7; ctx.shadowColor = "rgba(10,10,40,.5)"; ctx.shadowBlur = 5; ctx.beginPath(); ctx.ellipse(hx, hy, 240 + 420 * ph, 110 + 220 * ph, 0, 0, 6.2832); ctx.stroke(); ctx.restore(); } }
        // молнии: удар в холм и обвивающая тучу
        const mt = EV.moln;
        const flash = Math.max(0, 1 - Math.abs(t - mt - 0.05) / 0.16) * 0.3 + Math.max(0, 1 - Math.abs(t - mt - 0.65) / 0.16) * 0.22;
        if (t > mt - 0.02 && t < EV.L7 + 0.5) {
          const end = 1 - sstep(prog(t, EV.E6, EV.L7 + 0.4));
          // удары
          const u = prog(t, mt, mt + 0.18), gone1 = t > mt + 0.52;
          if (!gone1) { ctx.save(); ctx.globalAlpha = end; ctx.translate(hx - 240, hy + 100); ctx.scale(1.15, 1.25); zig(ctx, BOLT, u, 11); ctx.restore(); }
          const u2 = prog(t, mt + 0.6, mt + 0.78);
          if (t > mt + 0.6 && t < mt + 1.2) { ctx.save(); ctx.globalAlpha = end; ctx.translate(hx + 260, hy + 90); ctx.scale(-1.1, 1.2); zig(ctx, BOLT, u2, 10); ctx.restore(); }
        }
        // вспышка неба
        if (flash > 0.003) { ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = flash; ctx.fillStyle = "#d9dcff"; ctx.fillRect(0, 0, W, 720); ctx.restore(); }

        // дождь
        const rain = sstep(prog(t, EV.alch - 0.3, EV.alch + 0.3)) * (1 - sstep(prog(t, EV.E8 + 0.4, EV.S3 + 0.1)));
        if (rain > 0.003) { ctx.save(); ctx.globalAlpha = rain; const y0 = 150, span = 560;
          for (const d of RAIN) { const y = y0 + ((t * d.v / span + d.ph) % 1) * span, x = d.x - (y - y0) * 0.1; ctx.save(); ctx.translate(x, y); ctx.rotate(0.1); ctx.scale(d.s, d.s); ctx.drawImage(dropC, -8, -23); ctx.restore(); }
          ctx.restore(); }

        // блёстки свежей земли
        { const a = prog(t, EV.osv, EV.osv + 0.5) * (1 - sstep(prog(t, EV.L12, EV.L12 + 1.4)));
          if (a > 0.003) { ctx.save(); ctx.fillStyle = "#ffffff"; ctx.shadowColor = "rgba(255,255,240,.8)"; ctx.shadowBlur = 8; for (const s of SPARK) { const u = prog(t, EV.osv + s.d * 0.6, EV.osv + s.d * 0.6 + 0.4), tw = 0.35 + 0.65 * Math.abs(Math.sin(t * 2.6 + s.ph)); if (u <= 0) continue; ctx.globalAlpha = a * u; star(ctx, s.x, s.y, s.s * tw * 1.5); } ctx.restore(); } }

        // ветер: завитки и летящие листья
        const wc = t - (EV.L11 - 0.4);
        if (wc > 0 && t < EV.END + 2.2) {
          const fadeW = 1 - sstep(prog(t, EV.END + 0.4, EV.END + 2.0));
          for (const c of CURLS) { const d = wc - c.d; if (d <= 0) continue; const x = -460 + d * 900; if (x > 2000) continue; ctx.save(); ctx.globalAlpha = fadeW * 0.92; ctx.translate(x, c.y + 14 * Math.sin(d * 2.4)); ctx.scale(c.k, c.k); ctx.drawImage(curlC, 0, 0); ctx.restore(); }
          for (const l of FLY) { const d = wc - l.t0; if (d <= 0) continue; const x = l.x0 + d * l.v * 1.5, y = l.y0 + 34 * d + 26 * Math.sin(d * 2.8 + l.ph); if (x > 2000 || y > 650) continue; ctx.save(); ctx.globalAlpha = fadeW; ctx.translate(x, y); ctx.rotate(l.ph + l.vr * d); ctx.scale(l.s, l.s * (0.55 + 0.45 * Math.sin(d * 5 + l.ph))); ctx.drawImage(leafS[l.spr], -17, -17); ctx.restore(); }
        }
        // птицы в финале
        if (t > EV.END + 0.5) { const u = prog(t, EV.END + 0.5, TOTAL), x = lerp(-120, 620, u), y = lerp(440, 215, u) + 8 * Math.sin(t * 1.3); for (let i = 0; i < BIRDS.length; i++) bird(ctx, x + BIRDS[i][0], y + BIRDS[i][1], 1.05, t * 8 + i * 0.9); }

        // кремовый холм, рамка
        const hillY = pop(0.0) + shY * 0.25;
        ctx.drawImage(LAYERS.hill, -PAD + off(1) * 0.5, hillY);
        if (dim > 0.003) { ctx.save(); ctx.globalAlpha = clamp(dim * 1.5, 0, 1); ctx.drawImage(hillDark, -PAD + off(1) * 0.5, hillY); ctx.restore(); }
        ctx.drawImage(frameC, 0, 0);
      }

      // ---------- Framer Motion: текст ----------
      const $ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
      const seq = [];
      const ink = (els, at, per = 0.025, dur = 0.28) => seq.push([els,
        { opacity: [0, 1], transform: ["translateY(6px)", "translateY(0px)"] },
        { at, duration: dur, ease: [0.22, 1, 0.36, 1], delay: Motion.stagger(per) }]);
      const out = (el, at, dur = 0.5) => seq.push([el,
        { opacity: [1, 0], transform: ["translateY(0px)", "translateY(-14px)"] }, { at, duration: dur, ease: "easeIn" }]);
      const titlePop = (els, at) => seq.push([els,
        { opacity: [0, 1], transform: ["translateY(70px) rotate(-5deg)", "translateY(-8px) rotate(1deg)", "translateY(0px) rotate(0deg)"] },
        { at, duration: 0.75, ease: "easeOut", delay: Motion.stagger(0.09) }]);

      // заставка
      titlePop($("#title-card-in .card-title .ch"), 0.95);
      ink($("#title-card-in .card-author .ch"), 1.8, 0.026, 0.4);
      ink($("#title-card-in .card-year .ch"), 2.65, 0.06, 0.4);
      out(document.getElementById("title-card-in"), 4.75, 0.6);
      // строки
      for (const st of CFG.stanzas) {
        for (let n = st.first; n <= st.last; n++) {
          const l = CFG.lines[n - 1], chars = $(`#l${n} .ch`);
          ink(chars, l.s - 0.1, Math.min(0.03, 0.72 * (l.e - l.s) / chars.length), 0.26);
          if (n < st.last) seq.push([document.getElementById(`l${n}`), { opacity: [1, 0.66] }, { at: CFG.lines[n].s - 0.1, duration: 0.35 }]);
          const key = document.getElementById(`k${n}`);
          if (key) seq.push([key, { transform: ["translateY(0px) scale(1)", "translateY(-5px) scale(1.09)", "translateY(0px) scale(1)"] }, { at: CFG.keys[n] - 0.03, duration: 0.42, ease: "easeOut" }]);
        }
        out(document.getElementById(`${st.id}-in`), st.exit);
      }
      // финал
      titlePop($("#final-card-in .card-title .ch"), FINAL + 0.5);
      ink($("#final-card-in .card-author .ch"), FINAL + 1.4, 0.026, 0.4);
      ink($("#final-card-in .card-year .ch"), FINAL + 2.25, 0.06, 0.4);

      const main = Motion.animate(seq);
      main.pause();
      const seek = (t) => { renderAt(t); main.time = t; };
      window.addEventListener("hf-seek", (e) => seek(e.detail.time));
      seek(0);

      const tl = gsap.timeline({ paused: true });
      tl.set({}, {}, TOTAL);
      window.__timelines = window.__timelines || {};
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
