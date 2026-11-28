// ---------- Пробы (PROBE=cast PROBE_PAGE=N): герои во всех позах крупно ----------
function probeCast() {
  reset(g); g.fillStyle = "#ece2cc"; g.fillRect(0, 0, W, H);
  const lab = (s, x, y) => { g.fillStyle = "#222"; g.font = "17px monospace"; g.textAlign = "center"; g.fillText(s, x, y); g.textAlign = "left"; };
  const page = CFG.probePage | 0;
  if (page === 0) {
    // фазы взмаха, бег, вода, сон, гогот, крен
    const cells = [];
    for (let i = 0; i < 8; i++) cells.push([{ mode: "fly", flap: i / 8, look: 0.3 }, `взмах ${(i / 8).toFixed(2)}`]);
    for (let i = 0; i < 4; i++) cells.push([{ mode: "run", flap: i / 4, run: i / 4, look: 0.4, nu: 0.85 }, `бег ${(i / 4).toFixed(2)}`]);
    cells.push([{ mode: "sleep" }, "сон"], [{ mode: "swim", look: -0.8, nu: 1, run: 0.3 }, "вода, смотрит влево"], [{ mode: "swim", look: 0.9, nu: 1, honk: 1 }, "вода, гогочет"], [{ mode: "fly", flap: 0.25, roll: 0.35, look: 0.5 }, "крен вправо"], [{ mode: "fly", flap: 0.7, roll: -0.35, look: -0.5 }, "крен влево"], [{ mode: "fly", flap: 0.3, pitch: 1, look: 0.3 }, "набор"], [{ mode: "fly", flap: 0.6, pitch: -1, look: 0.3, ruff: 1 }, "пике, перья"], [{ mode: "fly", flap: 0.1, look: 1, honk: 1 }, "гогочет в полёте"]);
    cells.forEach(([st, name], i) => {
      const cx = 160 + (i % 6) * 320, cy = 160 + Math.floor(i / 6) * 265;
      drawGooseRear(g, { ...st, x: cx, y: cy, s: 0.42 });
      lab(name, cx, cy + 120);
    });
  } else if (page === 1) {
    // герой по ролику: 24 момента подряд
    const t0 = 0.5, t1 = T0.s6 - 0.1, n = 24;
    for (let i = 0; i < n; i++) {
      const t = lerp(t0, t1, i / (n - 1)), st = heroState(t);
      const cx = 160 + (i % 6) * 320, cy = 150 + Math.floor(i / 6) * 265;
      drawGooseRear(g, { ...st, x: cx, y: cy, s: 0.4 });
      lab(`t=${t.toFixed(2)} ${st.mode} f=${((st.flap ?? 0) % 1).toFixed(2)}`, cx, cy + 118);
    }
  } else if (page === 2) {
    // спрайты: проверка акварели
    SPR = SPR || bakeSprites();
    const list = [];
    const add = (k, v) => { if (!v) return; if (v.width) list.push([k, v]); else if (Array.isArray(v)) v.forEach((q, i) => add(k + i, q)); else if (typeof v === "object") for (const [kk, q] of Object.entries(v)) add(k + "." + kk, q); };
    for (const [k, v] of Object.entries(SPR)) if (!/^(sky|tex|village|final|mask|rim|fog)/.test(k)) add(k, v);
    let x = 20, y = 20, rowH = 0;
    for (const [k, c] of list) {
      const sc = Math.min(1, 230 / c.height, 330 / c.width);
      const w = c.width * sc, h = c.height * sc;
      if (x + w > W - 20) { x = 20; y += rowH + 30; rowH = 0; }
      g.drawImage(c, x, y, w, h); lab(k, x + w / 2, y + h + 18); x += w + 24; rowH = Math.max(rowH, h);
    }
  } else if (page === 3) {
    // ноябрь у ворот: появление по кадрам
    SPR = SPR || bakeSprites();
    for (let i = 0; i < 6; i++) { const t = EV.noyabr - 0.8 + i * 0.35; const cx = 170 + i * 315; drawNovember(g, cx, 900, 0.62, t); lab(`t=${t.toFixed(2)}`, cx, 1000); }
  }
  g.globalCompositeOperation = "multiply"; PAPER = PAPER || bakePaper(); g.drawImage(PAPER, 0, 0); g.globalCompositeOperation = "source-over";
}
