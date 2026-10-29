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
      :root {
        --frost-ink: #eef6ff;
        --frost-glow: rgba(140, 192, 255, 0.85);
        --warm-ink: #fff3df;
        --warm-glow: rgba(255, 184, 100, 0.85);
      }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1920px; height: 1080px; overflow: hidden; background: #0a1630; }
      #root { position: relative; width: 1920px; height: 1080px; overflow: hidden; font-family: "Cormorant", serif; }
      #scene { position: absolute; inset: 0; width: 1920px; height: 1080px; z-index: 0; }
      .w { display: inline-block; white-space: nowrap; }
      .ch { display: inline-block; opacity: 0; }

      /* стекло: x 110–1810, y 244–880 */
      .quatrain { position: absolute; left: 262px; top: 236px; width: 990px; height: 600px;
        display: flex; align-items: center; z-index: 3; }
      .qin { display: flex; flex-direction: column; gap: 4px; }
      .line { font-size: 76px; font-weight: 600; line-height: 1.26; white-space: nowrap; letter-spacing: 0.005em; }
      .cold .line { color: var(--frost-ink);
        text-shadow: 0 0 22px var(--frost-glow), 0 0 4px rgba(210, 232, 255, 0.95), 0 3px 3px rgba(0, 6, 20, 0.65); }
      .warm .line { color: var(--warm-ink);
        text-shadow: 0 0 22px var(--warm-glow), 0 0 4px rgba(255, 236, 205, 0.95), 0 3px 3px rgba(20, 8, 0, 0.6); }

      .card-in { position: absolute; left: 110px; top: 244px; width: 1700px; height: 636px; z-index: 3;
        display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px; }
      .card-title { font-size: 150px; font-weight: 700; line-height: 1.05; color: var(--frost-ink); white-space: nowrap;
        text-shadow: 0 0 34px var(--frost-glow), 0 0 6px rgba(215, 235, 255, 0.95), 0 5px 5px rgba(0, 6, 20, 0.7); }
      .card-title.big { font-size: 176px; }
      .card-author { font-size: 60px; font-style: italic; font-weight: 600; color: #ffe9c8; white-space: nowrap;
        text-shadow: 0 0 20px rgba(255, 180, 95, 0.8), 0 3px 3px rgba(20, 8, 0, 0.7); }

      .vig { position: absolute; left: 1262px; top: 300px; width: 500px; height: 520px; z-index: 2; }
      .vin { width: 500px; height: 520px; }
      .vig svg { overflow: visible; }
      .vp { fill: none; stroke-width: 4; stroke-linecap: round; stroke-linejoin: round; opacity: 0; }
      .vig.cold svg { filter: drop-shadow(0 0 7px rgba(140, 192, 255, 0.9)); }
      .vig.cold .vp { stroke: #e4f0ff; }
      .vig.warm svg { filter: drop-shadow(0 0 8px rgba(255, 176, 90, 0.95)); }
      .vig.warm .vp { stroke: #ffd9a0; }

      .mug-in { position: absolute; left: 1430px; top: 762px; width: 170px; height: 200px; z-index: 5; opacity: 0; }
      .steam { fill: none; stroke: rgba(255, 240, 222, 0.55); stroke-width: 7; stroke-linecap: round; opacity: 0;
        filter: blur(3px); }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="%%TOTAL%%" data-width="1920" data-height="1080">
      <canvas id="scene" width="1920" height="1080"></canvas>
      %%TEXT%%
      <audio id="voice" class="clip" src="assets/voice.mp3" data-start="%%VOICE_START%%" data-duration="%%VOICE_DUR%%" data-track-index="10" data-volume="1"></audio>
      <audio id="music" class="clip" src="assets/music.wav" data-start="0" data-duration="%%TOTAL%%" data-track-index="11" data-volume="1"></audio>
    </div>
    <script>
      const CFG = %%CFG%%;
      const W = 1920, H = 1080, TOTAL = CFG.total;

      // ---------- утилиты ----------
      function mulberry32(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
      function curve(keys, t) {
        if (t <= keys[0][0]) return keys[0][1];
        for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) {
          const [t0, v0] = keys[i - 1], [t1, v1] = keys[i]; let u = (t - t0) / Math.max(1e-6, t1 - t0);
          u = u * u * (3 - 2 * u); return v0 + (v1 - v0) * u; }
        return keys[keys.length - 1][1];
      }
      const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
      const mod = (a, n) => ((a % n) + n) % n;
      function storm(t) {
        let s = curve(CFG.keys.storm, t);
        for (const g of CFG.gusts) { const u = (t - g - 0.5) / 0.9; s += 0.65 * Math.exp(-u * u); }
        return s;
      }

      const PANES = [ { x: 110, y: 244, w: 1700, h: 636, main: true }, { x: 110, y: 70, w: 830, h: 140 }, { x: 980, y: 70, w: 830, h: 140 } ];
      function panePath(ctx) { ctx.beginPath(); for (const p of PANES) ctx.rect(p.x, p.y, p.w, p.h); }

      // ---------- ветер: накопленный снос снежинок ----------
      const DT = 1 / 120, NSTEP = Math.ceil((TOTAL + 1) / DT) + 2;
      const DX = new Float32Array(NSTEP), DY = new Float32Array(NSTEP);
      for (let i = 1; i < NSTEP; i++) { const s = storm(i * DT);
        DX[i] = DX[i - 1] + (80 + 430 * s) * DT; DY[i] = DY[i - 1] + (0.5 + 0.6 * s) * DT; }
      function interp(arr, t) { const f = clamp(t / DT, 0, NSTEP - 2); const i = Math.floor(f); return arr[i] + (arr[i + 1] - arr[i]) * (f - i); }

      // ---------- небо и пейзаж (один раз) ----------
      const bg = document.createElement("canvas"); bg.width = W; bg.height = H;
      (function drawBg() {
        const c = bg.getContext("2d"), r = mulberry32(11);
        c.fillStyle = "#0a1630"; c.fillRect(0, 0, W, H);
        const g = c.createRadialGradient(960, 980, 50, 960, 900, 1250);
        g.addColorStop(0, "#36598a"); g.addColorStop(0.35, "#1d3760"); g.addColorStop(1, "#0a1630");
        c.fillStyle = g; c.fillRect(0, 0, W, H);
        const hill = (base, amp, col, seed) => { const rr = mulberry32(seed); const ph = [rr() * 6, rr() * 6, rr() * 6];
          c.beginPath(); c.moveTo(0, H);
          for (let x = 0; x <= W; x += 8) c.lineTo(x, base + amp * (Math.sin(x / 310 + ph[0]) * 0.6 + Math.sin(x / 137 + ph[1]) * 0.3 + Math.sin(x / 61 + ph[2]) * 0.1));
          c.lineTo(W, H); c.closePath(); c.fillStyle = col; c.fill(); };
        const fir = (x, y, h, col) => { c.fillStyle = col; for (let k = 0; k < 4; k++) { const ty = y - h * (k * 0.24), w = h * (0.42 - k * 0.085);
          c.beginPath(); c.moveTo(x - w, ty); c.lineTo(x, ty - h * 0.42); c.lineTo(x + w, ty); c.closePath(); c.fill(); } c.fillRect(x - h * 0.03, y, h * 0.06, h * 0.08); };
        hill(690, 26, "#2c4b77", 3);
        for (let i = 0; i < 46; i++) { const x = r() * W; fir(x, 690 + Math.sin(x / 310) * 14, 40 + r() * 46, "#14284a"); }
        hill(770, 30, "#456894", 5);
        for (let i = 0; i < 14; i++) { const x = r() * W; fir(x, 772 + Math.sin(x / 200) * 18, 90 + r() * 90, "#0d1c36"); }
        hill(850, 22, "#6b8bb4", 9);
        // дизеринг против полос на градиенте
        const img = c.getImageData(0, 0, W, H), d = img.data;
        for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * 7; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
        c.putImageData(img, 0, 0);
      })();

      // ---------- рама (один раз) ----------
      const frame = document.createElement("canvas"); frame.width = W; frame.height = H;
      (function drawFrame() {
        const c = frame.getContext("2d"), r = mulberry32(21);
        const wood = (x, y, w, h, base, vertical) => {
          c.fillStyle = base; c.fillRect(x, y, w, h);
          c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
          for (let k = 0; k < (vertical ? w : h) / 3; k++) {
            const off = r() * (vertical ? w : h), a = 0.05 + r() * 0.12, dark = r() < 0.6;
            c.strokeStyle = dark ? `rgba(15,7,2,${a})` : `rgba(160,110,70,${a * 0.6})`; c.lineWidth = 0.6 + r() * 1.6;
            c.beginPath(); const ph = r() * 6, amp = 1 + r() * 3;
            if (vertical) { for (let yy = y; yy <= y + h; yy += 20) c.lineTo(x + off + Math.sin(yy / 90 + ph) * amp, yy); }
            else { for (let xx = x; xx <= x + w; xx += 20) c.lineTo(xx, y + off + Math.sin(xx / 120 + ph) * amp); }
            c.stroke();
          }
          c.restore();
        };
        wood(0, 0, W, 70, "#3b2516", false);
        wood(110, 210, 1700, 34, "#3f2818", false);
        wood(940, 70, 40, 140, "#3f2818", true);
        wood(0, 0, 110, 925, "#36210f", true);
        wood(1810, 0, 110, 925, "#36210f", true);
        wood(110, 880, 1700, 45, "#3f2818", false);
        wood(0, 925, W, 40, "#5b3b22", false);   // верх подоконника
        wood(0, 965, W, 115, "#2b190c", false);  // передняя доска
        // фаски и тени у стекла
        for (const p of PANES) {
          c.strokeStyle = "rgba(0,0,0,0.55)"; c.lineWidth = 10; c.strokeRect(p.x - 5, p.y - 5, p.w + 10, p.h + 10);
          c.strokeStyle = "rgba(150,105,70,0.35)"; c.lineWidth = 2; c.strokeRect(p.x - 11, p.y - 11, p.w + 22, p.h + 22);
        }
        c.fillStyle = "rgba(255,210,160,0.12)"; c.fillRect(0, 925, W, 4);
        c.fillStyle = "rgba(0,0,0,0.45)"; c.fillRect(0, 963, W, 6);
      })();

      // ---------- снежинки ----------
      const FL = []; { const r = mulberry32(31);
        for (let i = 0; i < 950; i++) { const z = 0.22 + 0.78 * Math.pow(r(), 1.6);
          FL.push({ x0: r() * (W + 300), y0: r() * (H + 60), z, vy: 60 + 150 * z, A: 5 + 16 * z, f: 0.4 + 0.9 * r(), ph: r() * 6.28 }); }
        FL.sort((a, b) => a.z - b.z); }

      // ---------- иней: ветвистые кристаллы от краёв стекла ----------
      const FROST = []; (function genFrost() {
        const r = mulberry32(41);
        function grow(x, y, a, len, depth, d, reach) {
          while (len > 0) {
            const step = 6 + r() * 5; a += (r() - 0.5) * 0.4;
            const nx = x + Math.cos(a) * step, ny = y + Math.sin(a) * step;
            FROST.push({ x1: x, y1: y, x2: nx, y2: ny, d, reach, cls: Math.min(depth, 2) });
            if (depth < 3 && r() < 0.42) { const side = r() < 0.5 ? -1 : 1;
              grow(nx, ny, a + side * (0.85 + r() * 0.35), Math.min(len, reach - d) * (0.35 + r() * 0.25), depth + 1, d + step, reach); }
            x = nx; y = ny; d += step; len -= step;
          }
        }
        for (const p of PANES) {
          const edges = [ [p.x, p.y, 1, 0, 0, 1, p.w, p.main ? 120 : 52], [p.x, p.y + p.h, 1, 0, 0, -1, p.w, p.main ? 120 : 52],
                          [p.x, p.y, 0, 1, 1, 0, p.h, p.main ? 78 : 48], [p.x + p.w, p.y, 0, 1, -1, 0, p.h, p.main ? 150 : 48] ];
          for (const [ex, ey, tx, ty, nx, ny, L, base] of edges) {
            for (let s = r() * 30; s < L; s += 34 + r() * 30) {
              const x = ex + tx * s, y = ey + ty * s;
              const dc = Math.min(s, L - s), corner = Math.max(0, 1 - dc / 240);
              const reach = base * (0.55 + 0.6 * r()) * (1 + 1.7 * corner);
              const a = Math.atan2(ny, nx) + (r() - 0.5) * 0.9 + corner * (s < L / 2 ? 1 : -1) * (tx ? 0.5 : -0.5) * (nx + ny);
              grow(x, y, a, reach, 0, 0, reach);
            }
          }
        }
      })();
      const frostCv = document.createElement("canvas"); frostCv.width = W; frostCv.height = H;

      // ---------- соломинки и снежный ком ----------
      const STRAW = []; { const r = mulberry32(51);
        for (let i = 0; i < 26; i++) STRAW.push({ x0: -60 - r() * 900, y0: 300 + r() * 520, vx: 650 + r() * 520, vy: 30 + r() * 90,
          len: 26 + r() * 34, rot: r() * 6.28, vr: (r() - 0.5) * 9, w: 2 + r() * 1.6 }); }
      const SPLAT = []; { const r = mulberry32(61);
        for (let i = 0; i < 46; i++) { const a = r() * 6.28, d = Math.pow(r(), 0.7) * 58;
          SPLAT.push({ x: 440 + Math.cos(a) * d * 1.3, y: 140 + Math.sin(a) * d * 0.55, rad: 3 + r() * 13 * (1 - d / 70) }); } }
      const GRAIN = document.createElement("canvas"); GRAIN.width = 512; GRAIN.height = 512;
      { const c = GRAIN.getContext("2d"), r = mulberry32(71), img = c.createImageData(512, 512);
        for (let i = 0; i < img.data.length; i += 4) { const v = 110 + r() * 40; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
        c.putImageData(img, 0, 0); }

      // ---------- кадр ----------
      const ctx = document.getElementById("scene").getContext("2d");
      function renderAt(t) {
        const s = storm(t), I = curve(CFG.keys.candle, t), F = curve(CFG.keys.frost, t), warm = curve(CFG.keys.warmth, t);
        const flick = 1 + 0.06 * Math.sin(t * 11.3) + 0.04 * Math.sin(t * 23.7 + 1.3) + 0.03 * Math.sin(t * 5.1 + 0.4);
        const tk = t - CFG.knock, shake = tk > 0 ? 7 * Math.exp(-tk * 7) * Math.sin(tk * 62) : 0;
        ctx.setTransform(1, 0, 0, 1, shake, shake * 0.4);
        ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
        ctx.drawImage(bg, 0, 0);

        // снег: дальний слой → дымка → ближний
        const dx = interp(DX, t), dy = interp(DY, t), wsp = 80 + 430 * s;
        const drawFlakes = (zmin, zmax) => {
          for (const f of FL) { if (f.z < zmin || f.z >= zmax) continue;
            const k = 0.35 + 0.65 * f.z;
            const x = mod(f.x0 + dx * k + f.A * Math.sin(f.f * t + f.ph), W + 300) - 150;
            const y = mod(f.y0 + dy * f.vy, H + 60) - 30;
            const size = 1 + 3.2 * f.z, a = (0.3 + 0.65 * f.z);
            ctx.globalAlpha = a; ctx.fillStyle = ctx.strokeStyle = "#f2f7ff";
            if (s > 0.62) { const L = (s - 0.55) * 0.05; ctx.lineWidth = size * 0.85; ctx.lineCap = "round";
              ctx.beginPath(); ctx.moveTo(x - wsp * k * L, y - f.vy * (0.5 + 0.6 * s) * L); ctx.lineTo(x, y); ctx.stroke(); }
            else { ctx.beginPath(); ctx.arc(x, y, size * 0.6, 0, 6.283); ctx.fill(); }
          }
          ctx.globalAlpha = 1;
        };
        drawFlakes(0, 0.55);
        ctx.fillStyle = `rgba(120,150,195,${0.08 + 0.2 * clamp(s, 0, 1.4)})`; ctx.fillRect(0, 0, W, H);
        drawFlakes(0.55, 1.01);

        // соломинки
        const ts = t - CFG.straw;
        if (ts > -0.2 && ts < 3.5) { ctx.strokeStyle = "rgba(220,180,95,0.95)"; ctx.lineCap = "round";
          for (const p of STRAW) { const x = p.x0 + p.vx * ts, y = p.y0 + p.vy * ts + 20 * Math.sin(ts * 3 + p.rot), a = p.rot + p.vr * ts;
            if (x < 0 || x > W + 80) continue; ctx.lineWidth = p.w; ctx.beginPath();
            ctx.moveTo(x - Math.cos(a) * p.len / 2, y - Math.sin(a) * p.len / 2); ctx.lineTo(x + Math.cos(a) * p.len / 2, y + Math.sin(a) * p.len / 2); ctx.stroke(); } }

        // затемнение под текстом
        const sx = curve(CFG.keys.scrimX, t);
        const sg = ctx.createRadialGradient(sx, 562, 40, sx, 562, 700);
        sg.addColorStop(0, "rgba(4,10,26,0.5)"); sg.addColorStop(1, "rgba(4,10,26,0)");
        ctx.save(); ctx.translate(sx, 562); ctx.scale(1, 0.48); ctx.translate(-sx, -562); ctx.fillStyle = sg; ctx.fillRect(sx - 720, -200, 1440, 1600); ctx.restore();

        // снежный ком на фрамуге
        if (tk > 0) { const melt = 1 - clamp((t - CFG.melt) / 2.5, 0, 1), sc = Math.min(1, 0.55 + tk * 6), slide = Math.min(tk, 4) * 5;
          ctx.globalAlpha = 0.9 * melt; ctx.fillStyle = "#eef4fb";
          for (const p of SPLAT) { ctx.beginPath(); ctx.arc(440 + (p.x - 440) * sc, 140 + (p.y - 140) * sc + slide, p.rad * sc, 0, 6.283); ctx.fill(); }
          ctx.globalAlpha = 1; }

        // иней
        const fc = frostCv.getContext("2d"); fc.setTransform(1, 0, 0, 1, 0, 0); fc.clearRect(0, 0, W, H);
        const cr = Math.round(226 + 29 * warm), cg = Math.round(238 - 8 * warm), cb = Math.round(255 - 60 * warm);
        const widths = [2.3, 1.5, 0.95], alphas = [0.85, 0.7, 0.55];
        for (let cls = 0; cls < 3; cls++) { fc.beginPath();
          for (const g of FROST) if (g.cls === cls && g.d <= F * g.reach) { fc.moveTo(g.x1, g.y1); fc.lineTo(g.x2, g.y2); }
          fc.strokeStyle = `rgba(${cr},${cg},${cb},${alphas[cls]})`; fc.lineWidth = widths[cls]; fc.lineCap = "round"; fc.stroke(); }
        // матовая кромка
        for (const p of PANES) { const b = p.main ? 95 : 40, a = 0.24 * F;
          const grads = [[p.x, p.y, p.x, p.y + b, p.x, p.y, p.w, b], [p.x, p.y + p.h, p.x, p.y + p.h - b, p.x, p.y + p.h - b, p.w, b],
                         [p.x, p.y, p.x + b, p.y, p.x, p.y, b, p.h], [p.x + p.w, p.y, p.x + p.w - b, p.y, p.x + p.w - b, p.y, b, p.h]];
          for (const [x0, y0, x1, y1, rx, ry, rw, rh] of grads) { const lg = fc.createLinearGradient(x0, y0, x1, y1);
            lg.addColorStop(0, `rgba(${cr},${cg},${cb},${a})`); lg.addColorStop(1, `rgba(${cr},${cg},${cb},0)`); fc.fillStyle = lg; fc.fillRect(rx, ry, rw, rh); } }
        ctx.save(); panePath(ctx); ctx.clip();
        ctx.filter = "blur(4px)"; ctx.globalAlpha = 0.9; ctx.drawImage(frostCv, 0, 0); ctx.filter = "none"; ctx.globalAlpha = 1;
        ctx.drawImage(frostCv, 0, 0);
        // отражение свечи в стекле
        const rg = ctx.createRadialGradient(196, 820, 5, 196, 820, 260);
        rg.addColorStop(0, `rgba(255,190,110,${0.16 * I})`); rg.addColorStop(1, "rgba(255,190,110,0)");
        ctx.fillStyle = rg; ctx.fillRect(40, 560, 520, 330);
        ctx.restore();

        // рама + притухание
        ctx.drawImage(frame, 0, 0);
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); for (const p of PANES) ctx.rect(p.x, p.y, p.w, p.h);
        ctx.fillStyle = `rgba(0,0,0,${clamp(0.42 - 0.28 * I, 0, 0.5)})`; ctx.fill("evenodd"); ctx.restore();

        // свеча
        const cx = 196, top = 812;
        ctx.fillStyle = "#6f5228"; ctx.beginPath(); ctx.ellipse(cx, 948, 62, 13, 0, 0, 6.283); ctx.fill();
        ctx.fillStyle = "#a07c42"; ctx.beginPath(); ctx.ellipse(cx, 944, 54, 10, 0, 0, 6.283); ctx.fill();
        const cg2 = ctx.createLinearGradient(cx - 24, 0, cx + 24, 0);
        cg2.addColorStop(0, "#b9a27c"); cg2.addColorStop(0.4, "#f3e6c8"); cg2.addColorStop(1, "#9c8560");
        ctx.fillStyle = cg2; ctx.fillRect(cx - 23, top, 46, 944 - top);
        ctx.fillStyle = "#e9d9b6"; ctx.beginPath(); ctx.ellipse(cx, top, 23, 6, 0, 0, 6.283); ctx.fill();
        ctx.strokeStyle = "#2a1a0c"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, top); ctx.lineTo(cx + 1, top - 12); ctx.stroke();
        const lit = clamp((t - 0.45) / 0.6, 0, 1);
        if (lit > 0) {
          const fh = 58 * lit * (0.75 + 0.25 * I) * flick, fw = 15 * lit, sway = 3 * Math.sin(t * 3.1) + 2 * Math.sin(t * 7.9);
          const fy = top - 8;
          ctx.globalCompositeOperation = "lighter";
          const glow = ctx.createRadialGradient(cx, fy - 30, 4, cx, fy - 30, 560 * I * flick + 1);
          glow.addColorStop(0, `rgba(255,170,80,${0.42 * lit})`); glow.addColorStop(0.25, `rgba(255,140,60,${0.16 * lit})`); glow.addColorStop(1, "rgba(255,120,40,0)");
          ctx.fillStyle = glow; ctx.fillRect(0, 200, 1000, 880);
          ctx.globalCompositeOperation = "source-over";
          const fl = ctx.createRadialGradient(cx, fy - fh * 0.3, 1, cx, fy - fh * 0.35, fh * 0.75);
          fl.addColorStop(0, "rgba(255,252,235,1)"); fl.addColorStop(0.35, "rgba(255,215,120,0.95)"); fl.addColorStop(0.8, "rgba(255,130,40,0.65)"); fl.addColorStop(1, "rgba(255,90,20,0)");
          ctx.fillStyle = fl; ctx.beginPath(); ctx.moveTo(cx - fw, fy);
          ctx.bezierCurveTo(cx - fw, fy - fh * 0.45, cx + sway - fw * 0.2, fy - fh * 0.75, cx + sway, fy - fh);
          ctx.bezierCurveTo(cx + sway + fw * 0.2, fy - fh * 0.75, cx + fw, fy - fh * 0.45, cx + fw, fy);
          ctx.bezierCurveTo(cx + fw, fy + fw * 0.8, cx - fw, fy + fw * 0.8, cx - fw, fy); ctx.fill();
        }

        // виньетка и зерно
        const vg = ctx.createRadialGradient(960, 540, 520, 960, 540, 1180);
        vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.5)"); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
        const fr = Math.floor(t * 30), gr = mulberry32(fr + 1);
        ctx.globalAlpha = 0.045; ctx.globalCompositeOperation = "overlay";
        ctx.drawImage(GRAIN, -gr() * 300, -gr() * 300, 2400, 1500);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }

      // ---------- Framer Motion: текст, виньетки, кружка ----------
      const $ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
      const seq = [];
      const appear = (els, at, per = 0.03, dur = 0.45) => seq.push([els,
        { opacity: [0, 1], filter: ["blur(9px)", "blur(0px)"], transform: ["translateY(16px)", "translateY(0px)"] },
        { at, duration: dur, ease: [0.22, 1, 0.36, 1], delay: Motion.stagger(per) }]);
      const melt = (el, at, dur = 0.45) => seq.push([el,
        { opacity: [1, 0], filter: ["blur(0px)", "blur(10px)"], transform: ["translateY(0px)", "translateY(26px)"] },
        { at, duration: dur, ease: "easeIn" }]);

      // заставка
      appear($("#title-in .card-title .ch"), CFG.title.in, 0.07, 0.8);
      appear($("#title-in .card-author .ch"), CFG.title.author, 0.03, 0.6);
      melt(document.getElementById("title-in"), CFG.title.exit, 0.6);
      // строки
      for (const g of CFG.groups) {
        for (let n = g.first; n <= g.last; n++) {
          const L = CFG.lines[n - 1], chars = $(`#l${n} .ch`);
          const per = Math.min(0.022, 0.55 / chars.length);
          appear(chars, Math.max(g.start, L.s - 0.15), per, 0.42);
          if (n < g.last) seq.push([document.getElementById(`l${n}`), { opacity: [1, 0.62] }, { at: CFG.lines[n].s - 0.1, duration: 0.35 }]);
        }
        melt(document.getElementById(`${g.id}-in`), g.exit);
      }
      // виньетки: линии «намерзают» по очереди
      for (const [vid, [a, b]] of Object.entries(CFG.vignettes)) {
        const paths = $(`#${vid} .vp`);
        seq.push([paths, { opacity: [0, 1] }, { at: a, duration: 0.7, delay: Motion.stagger(Math.min(0.28, 2.2 / paths.length)) }]);
        seq.push([document.getElementById(`${vid}-in`), { filter: ["blur(8px)", "blur(0px)"], transform: ["scale(0.94)", "scale(1)"] },
          { at: a, duration: 2.0, ease: [0.22, 1, 0.36, 1] }]);
        melt(document.getElementById(`${vid}-in`), b);
      }
      // финал
      appear($("#final-in .card-title .ch"), CFG.final + 0.2, 0.08, 0.9);
      appear($("#final-in .card-author .ch"), CFG.final + 1.3, 0.03, 0.6);
      // кружка: ставят на подоконник с отскоком
      seq.push([document.getElementById("mug-in"), { opacity: [0, 1, 1], transform: ["translateY(-90px)", "translateY(7px)", "translateY(0px)"] },
        { at: CFG.mug - 0.15, duration: 0.6, times: [0, 0.7, 1], ease: ["easeIn", "easeOut"] }]);
      const extra = [];
      ["steam1", "steam2", "steam3"].forEach((id, i) => {
        const el = document.getElementById(id), start = CFG.mug + 0.6 + i * 0.7, cycle = 2.4;
        const reps = Math.max(0, Math.floor((TOTAL - start) / cycle) - 1);
        extra.push(Motion.animate(el, { opacity: [0, 0.8, 0], transform: ["translateY(10px)", "translateY(-6px)", "translateY(-22px)"] },
          { delay: start, duration: cycle, repeat: reps, ease: "easeInOut" }));
      });

      const main = Motion.animate(seq);
      const all = [main, ...extra];
      all.forEach((c) => c.pause());
      const seek = (t) => { renderAt(t); for (const c of all) c.time = t; };
      window.addEventListener("hf-seek", (e) => seek(e.detail.time));
      seek(0);

      const tl = gsap.timeline({ paused: true });
      tl.set({}, {}, TOTAL);
      window.__timelines = window.__timelines || {};
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
