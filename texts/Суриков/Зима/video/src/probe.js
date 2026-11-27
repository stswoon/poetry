// ---------- Пробы: фишки крупно (PROBE=cast PROBE_PAGE=N) ----------
// пробы героев: функции поз из ролика для ряда моментов через весь ролик
function probeHero(g, lab, fn, spec, t0, t1, n, sc, cols, cw, ch, y0) {
  for (let i = 0; i < n; i++) {
    const t = lerp(t0, t1, i / (n - 1));
    const st = fn(t);
    const cx = 80 + (i % cols) * cw, cy = y0 + Math.floor(i / cols) * ch;
    g.strokeStyle = "#a88"; g.beginPath(); g.moveTo(cx - cw * 0.4, cy); g.lineTo(cx + cw * 0.4, cy); g.stroke();
    if (!st) { lab(`${t.toFixed(2)} —`, cx, cy + 18); continue; }
    dropShadow(g, cx, cy, 40 * sc, 12 * sc);
    peg(g, cx, cy - (st.Y || 0) * sc * 0.3, sc * (st.k ?? 1), spec, { ...st.pose, sq: st.sq });
    lab(`${t.toFixed(2)}`, cx, cy + 18);
  }
}
const PROBE_PAGES = [
  // 0: фишки и предметы
  (g, lab) => {
    const s = 1.3;
    dropShadow(g, 200, 520, 70, 20); peg(g, 200, 520, s, SPEC.muzhik, {}); lab("muzhik", 200, 560);
    dropShadow(g, 420, 520, 50, 14); peg(g, 420, 520, s, SPEC.boy, { aL: 2.6, aR: 0.5, mouth: "open" }); lab("boy", 420, 560);
    dropShadow(g, 600, 520, 50, 14); peg(g, 600, 520, s, SPEC.girl, { eyes: "happy" }); lab("girl", 600, 560);
    dropShadow(g, 880, 520, 100, 26); peg(g, 880, 520, s, SPEC.frost, { eyes: "angry", mouth: "frown", aL: 1.2, aR: 1.2 }); lab("frost", 880, 560);
    dropShadow(g, 1100, 520, 60, 16); firTree(g, 1100, 520, s, {}); firTree(g, 1240, 520, s, { eyes: 0, snow: 1 });
    dropShadow(g, 1480, 520, 40, 12); icicle(g, 1480, 520, s); windSpirit(g, 1700, 400, s, { dir: -1, t: 0.3 });
    izba(g, 260, 1000, 1.2, { snowRoof: 1, straw: 0.6, glow: 0.8, door: 0.5 });
    snowHill(g, 700, 960, 1.3, 3); sled(g, 900, 980, 1.3); haystack(g, 1120, 990, 1.1); bench(g, 1300, 990, 1.3);
    flake(g, 1450, 900, 1.6, 0.2, 0.3); cloudPiece(g, 1700, 900, 1); zToken(g, 1450, 1000, 1.2); burst(g, 1850, 1000, 1, 0.4);
  },
  // 1: шрифты (кириллица) — ниже
  (g, lab) => {
    const F = ["ZTitle", "ZLine", "Rockwell", "American Typewriter", "Impact", "Arial Black"];
    const S = ["Осада избы Зима", "Белый снег, пушистый", "ВОЛНА 1 · ВАШ ХОД"];
    F.forEach((f, i) => S.forEach((str, j) => { g.fillStyle = "#222"; g.font = `${j == 2 ? "bold " : ""}54px "${f}"`; g.fillText(str, 40 + j * 640, 90 + i * 170); lab(f, 200 + j * 640, 130 + i * 170); }));
  },
  // 2: крестьянин через весь ролик
  (g, lab) => probeHero(g, lab, peasantState, SPEC.muzhik, EV.peasantOut, TOTAL - 0.1, 36, 0.62, 12, 150, 340, 300),
  // 3: мальчик и девочка
  (g, lab) => { probeHero(g, lab, (t) => kidState(t, 0), SPEC.boy, EV.kidsOut, TOTAL - 0.1, 30, 0.75, 15, 122, 250, 200); probeHero(g, lab, (t) => kidState(t, 1), SPEC.girl, EV.kidsOut, TOTAL - 0.1, 30, 0.75, 15, 122, 250, 720); },
  // 4: Мороз
  (g, lab) => probeHero(g, lab, bossState, SPEC.frost, EV.bossLand, EV.leave + 0.6, 24, 0.5, 12, 150, 480, 380),
];
